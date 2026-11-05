'use strict';
// Lantern Road · Tactics: the rules model and the Tactics screen.
//
// Tactics is the model: each hero's rules and rule slots, the party rules, the party's item loadout, which
// conditions the player knows, and the saved rule sets. It touches no page, so tools/simtest.js tests it in Node.
// Every change goes through it.
// TacticsEditor is the view: it draws the Tactics screen (screen 11, docs/mockups/tactics.html) from the model and
// turns taps into model calls. Its look lives in css/rules.css. On screen rules are tactics; the code keeps rules.
//
// Rules are { if, n?, s?, do, on } (see CONDITIONS and PARTY_ACTIONS in js/data.js). An "owner" is a character's id
// (Save.state.roster) or 'party' for the party rules. A character's rule slots come from the character (js/hero.js):
// every character starts with 3, and the Masters' Hall teaches more up to their class's maximum. The party's rule slots
// and loadout slots come from the Tactician (js/base.js calls setSlots).

const Tactics = (() => {
  const MAX_SETS = 8;
  const clone = x => JSON.parse(JSON.stringify(x));
  const listeners = [];
  // { v, heroes: { charId: { rules } }, party: { slots, rules }, loadout: { slots, items: [id or null] },
  //   known: [unlock keys], sets: [{ name, heroes, party, loadout }] }
  let S = null;
  // The characters and the formation: the save's, or (in the Node tests) a roster of its own.
  let memRoster = null, memParty = null;
  const roster = () => (store() ? store().roster : (memRoster || (memRoster = PARTY.map((k, i) => Hero.create(k, 'c' + (i + 1), { rng: makeRng(i + 1) })))));
  const formation = () => (store() ? store().party : (memParty || (memParty = roster().map(c => c.id).concat([null, null, null, null, null, null]).slice(0, 6))));
  const charOf = o => roster().find(c => c.id === o) || null;

  // ── where it lives
  // Inside the game's save (Save.state.tactics, js/save.js) once that has loaded, so it is kept and synced with
  // everything else. Without a save (the Node tests), only in memory.
  const store = () => (typeof Save !== 'undefined' && Save.state ? Save.state : null);
  // What the road has taught so far (js/campaign.js): party items, Focus fire, saved rule sets. Open without a save.
  const gate = id => (typeof Campaign !== 'undefined' && store() ? Campaign.has(id) : true);
  // Makes S current: the first time, and again whenever the save's state object is replaced (a reset, or a newer
  // copy arriving from the cloud).
  function ensure() {
    const st = store();
    if (st) { if (!S || st.tactics !== S) { S = sanitize(st.tactics); st.tactics = S; } }
    else if (!S) S = fresh();
    // A character who joined since (or was missing from an old save) starts with their class's rules.
    for (const c of roster()) if (!S.heroes[c.id]) S.heroes[c.id] = { rules: startRules(c) };
    return S;
  }
  function changed() {
    const st = store();
    if (st) { st.tactics = S; try { Save.commit(); } catch (e) { } }
    listeners.forEach(fn => { try { fn(); } catch (e) { } });
    return true;
  }

  // ── conditions and what the player knows
  // A condition's unlock key is its id, or id:value for a condition with a number or a status (self_hp_lt:50).
  const condKey = r => (r.n != null ? `${r.if}:${r.n}` : r.s != null ? `${r.if}:${r.s}` : r.if);
  // Every version a player can pick: one per number or status it offers.
  function variants(id) {
    const C = CONDITIONS[id];
    return C.n ? C.n.map(n => ({ if: id, n })) : C.s ? C.s.map(s => ({ if: id, s })) : [{ if: id }];
  }
  function startingKeys() {
    const out = [];
    for (const id in CONDITIONS) {
      const st = CONDITIONS[id].start;
      for (const v of variants(id)) if (st === true || (Array.isArray(st) && st.includes(v.n != null ? v.n : v.s))) out.push(condKey(v));
    }
    return out;
  }
  const isKnown = r => S.known.includes(condKey(r));

  // ── owners
  const isParty = o => o === 'party';
  const ownerOk = o => isParty(o) || !!charOf(o);
  const slotRange = o => (isParty(o) ? PARTY_RULES.slots : [HERO.RULE_SLOTS, Hero.ruleMax(charOf(o))]);
  const slotsOf = o => (isParty(o) ? S.party.slots : Hero.ruleSlots(charOf(o)));
  const book = o => (isParty(o) ? S.party : S.heroes[o]);
  // The actions an owner's rules can take: a character's basic attack, Defend and the actives they know (only the
  // equipped ones fire in battle), or the party actions.
  // Defend, Move and Gather: actions every hero has, with no mana. The Tactician teaches Move (lesson I, 1-11) and
  // Gather (lesson II, Region II), recorded as the known keys act:move and act:gather, so the picker offers them from
  // then on.
  const SHARED = ['defend', 'move', 'gather'];
  const taught = () => SHARED.filter(id => id === 'defend' || S.known.includes('act:' + id));
  const actions = o => { if (isParty(o)) return Object.keys(PARTY_ACTIONS); const c = charOf(o); return [CLASSES[c.cls].basic, ...Hero.actives(c), ...taught()]; };
  const equipped = (o, id) => { const c = charOf(o); return !c || id === CLASSES[c.cls].basic || SHARED.includes(id) || c.equip.includes(id); };
  // A class's starter rules, kept to the skills the character knows.
  const startRules = c => CLASSES[c.cls].rules.filter(r => r.do === CLASSES[c.cls].basic || c.skills[r.do]).map(norm);
  const norm = r => {
    const o = { if: r.if, do: r.do, on: r.on !== false };
    if (r.n != null) o.n = r.n;
    if (r.s != null) o.s = r.s;
    return o;
  };
  // Can this condition go with this action at all? The party has no "self", and focus fire needs a foe.
  // Between-battle conditions go only with Return to base, which takes nothing else.
  function fits(o, r) {
    const C = CONDITIONS[r.if];
    if (!C) return false;
    if (isParty(o)) {
      const A = PARTY_ACTIONS[r.do];
      if (!A || C.who === 'self') return false;
      if (A.kind === 'home' || C.between) return A.kind === 'home' && !!C.between;
      return !A.who || C.who === A.who;
    }
    return !C.between;
  }
  // Rules may name any active of the character's classes, learned or not, so a respec doesn't erase them; ones the
  // character can't use yet are flagged in the editor and skipped in battle.
  const allowed = o => { if (isParty(o)) return Object.keys(PARTY_ACTIONS); const c = charOf(o); return [CLASSES[c.cls].basic, ...SHARED, ...c.classes.flatMap(k => [CLASSES[k].starter, ...CLASSES[k].tree.flat()]).filter(id => SKILLS[id].kind === 'active')]; };
  const valid = (o, r) => !!r && !!CONDITIONS[r.if] && allowed(o).includes(r.do) && fits(o, r);
  const cleanItems = (list, n) => Array.from({ length: n }, (_, i) => (list && ITEMS[list[i]] ? list[i] : null));

  // ── state
  // A new player's state. Each character arrives with their class's starter rules, so the player knows the
  // conditions those use.
  function fresh() {
    const known = new Set(startingKeys());
    const heroes = {};
    for (const c of roster()) {
      heroes[c.id] = { rules: startRules(c) };
      heroes[c.id].rules.forEach(r => known.add(condKey(r)));
    }
    const party = { slots: clamp(PARTY_RULES.rules.length, PARTY_RULES.slots[0], PARTY_RULES.slots[1]), rules: PARTY_RULES.rules.map(norm), granted: 0 };
    party.rules.forEach(r => known.add(condKey(r)));
    const loadout = { slots: LOADOUT.slots[0], items: cleanItems(LOADOUT.items, LOADOUT.slots[0]) };
    return { v: 1, heroes, party, loadout, known: [...known], sets: [] };
  }
  // Takes saved data and keeps only what still makes sense: unknown conditions, skills, items and over-full lists
  // are dropped.
  function sanitize(data) {
    const base = fresh();
    if (!data || typeof data !== 'object') return base;
    const known = new Set(base.known);
    if (Array.isArray(data.known)) data.known.forEach(k => typeof k === 'string' && known.add(k));
    const fix = (o, b, def) => {
      const [lo, hi] = slotRange(o);
      const slots = isParty(o) ? (b && Number.isInteger(b.slots) ? clamp(b.slots, lo, hi) : def.slots) : slotsOf(o);
      let rules = b && Array.isArray(b.rules) ? b.rules.filter(r => valid(o, r)).map(norm).slice(0, slots) : def.rules;
      if (!isParty(o) && !rules.length) rules = def.rules;
      return isParty(o) ? { slots, rules, granted: b && Number.isInteger(b.granted) ? clamp(b.granted, 0, PARTY_RULES.slots[1]) : 0 } : { rules };
    };
    const heroes = {};
    for (const c of roster()) heroes[c.id] = fix(c.id, data.heroes && data.heroes[c.id], base.heroes[c.id]);
    const L = data.loadout, lslots = L && Number.isInteger(L.slots) ? clamp(L.slots, LOADOUT.slots[0], LOADOUT.slots[1]) : base.loadout.slots;
    const loadout = { slots: lslots, items: L && Array.isArray(L.items) ? cleanItems(L.items, lslots) : base.loadout.items };
    const sets = Array.isArray(data.sets) ? data.sets.filter(x => x && typeof x.name === 'string').slice(0, MAX_SETS).map(x => ({
      name: x.name.slice(0, 24),
      heroes: Object.fromEntries(roster().map(c => [c.id, ((x.heroes && x.heroes[c.id]) || []).filter(r => valid(c.id, r)).map(norm)])),
      party: (x.party || []).filter(r => valid('party', r)).map(norm),
      loadout: Array.isArray(x.loadout) ? x.loadout.map(id => (ITEMS[id] ? id : null)).slice(0, LOADOUT.slots[1]) : [],
    })) : [];
    return { v: 1, heroes, party: fix('party', data.party, base.party), loadout, known: [...known], sets };
  }

  // ── editing one owner's list. Each returns true when it changed something.
  function add(o, rule) {
    const b = book(o);
    if (b.rules.length >= slotsOf(o) || !valid(o, rule) || !isKnown(rule)) return false;
    b.rules.push(norm(rule));
    return changed();
  }
  function replace(o, i, rule) {
    const b = book(o);
    if (!b.rules[i]) return false;
    // A new condition brings its own number or status, if any, in place of the old one's.
    const r = rule.if ? Object.assign({}, b.rules[i], { if: rule.if, n: rule.n, s: rule.s }, rule.do ? { do: rule.do } : {}) : Object.assign({}, b.rules[i], rule);
    if (!valid(o, r) || !isKnown(r)) return false;
    b.rules[i] = norm(r);
    return changed();
  }
  function toggle(o, i) {
    const r = book(o).rules[i];
    if (!r) return false;
    r.on = !r.on;
    return changed();
  }
  function remove(o, i) {
    const b = book(o);
    if (!b.rules[i]) return false;
    b.rules.splice(i, 1);
    return changed();
  }
  function move(o, from, to) {
    const b = book(o);
    to = clamp(to, 0, b.rules.length - 1);
    if (!b.rules[from] || from === to) return false;
    b.rules.splice(to, 0, b.rules.splice(from, 1)[0]);
    return changed();
  }
  // Whether another rule slot can still be learned; null when the owner has them all. Characters learn them at the
  // Masters' Hall and the party gets them from the Tactician (js/base.js): neither is bought here any more.
  function slotCost(o) {
    const [, hi] = slotRange(o);
    return slotsOf(o) >= hi ? null : isParty(o) ? 'tactician' : 'mastershall';
  }
  // The Tactician's slots (js/base.js): party rule slots and loadout slots. Party rules past the slots are kept but
  // switched off; loadout slots past them are dropped (an item is only drawn from the Bag when used).
  function setSlots(party, loadout) {
    const p = clamp(party + (S.party.granted || 0), PARTY_RULES.slots[0], PARTY_RULES.slots[1]), l = clamp(loadout, LOADOUT.slots[0], LOADOUT.slots[1]);
    let any = false;
    if (S.party.slots !== p) { S.party.slots = p; any = true; }
    S.party.rules.forEach((r, i) => { if (i >= p && r.on) { r.on = false; any = true; } });
    if (S.loadout.slots !== l) { S.loadout.slots = l; S.loadout.items = cleanItems(S.loadout.items, l); any = true; }
    return any ? changed() : false;
  }
  // Prototype: conditions are free until the Tactician and battle rewards teach them.
  function learn(key) {
    if (S.known.includes(key)) return false;
    S.known.push(key);
    return changed();
  }
  // Several at once (the Tactician's lessons), with one save.
  function learnMany(keys) {
    let any = false;
    for (const k of keys) if (typeof k === 'string' && !S.known.includes(k)) { S.known.push(k); any = true; }
    return any ? changed() : false;
  }
  // A rule an unlock gives the party (the draught rule at 1-3, the come-home rule at 1-6). If the party already has a
  // rule doing the same, it is left alone; if the list is full, a slot opens for it.
  function grantPartyRule(rule) {
    const b = S.party;
    if (!S.known.includes(condKey(rule))) S.known.push(condKey(rule));
    if (b.rules.some(r => r.do === rule.do && r.if === rule.if)) return false;
    if (b.rules.length >= b.slots) { if (b.slots >= PARTY_RULES.slots[1]) return false; b.slots++; b.granted = (b.granted || 0) + 1; } // kept on top of the Tactician's slots
    b.rules.push(norm(rule));
    return changed();
  }
  function learnAll() {
    let any = false;
    for (const id in CONDITIONS) for (const v of variants(id)) if (!S.known.includes(condKey(v))) { S.known.push(condKey(v)); any = true; }
    for (const k of ['act:move', 'act:gather']) if (!S.known.includes(k)) { S.known.push(k); any = true; }
    return any ? changed() : false;
  }

  // ── the loadout: the items the party brings, one per slot, each used once per battle
  function setItem(i, id) {
    const L = S.loadout;
    if (!Number.isInteger(i) || i < 0 || i >= L.slots || (id != null && !ITEMS[id]) || L.items[i] === (id || null)) return false;
    L.items[i] = id || null;
    return changed();
  }

  // ── saved rule sets: the whole party's rules and loadout under a name
  function saveSet(name) {
    name = String(name || '').trim().slice(0, 24);
    if (!name) return false;
    const set = { name, heroes: Object.fromEntries(roster().map(c => [c.id, clone(S.heroes[c.id].rules)])), party: clone(S.party.rules), loadout: S.loadout.items.slice() };
    const i = S.sets.findIndex(x => x.name.toLowerCase() === name.toLowerCase());
    if (i >= 0) S.sets[i] = set;
    else if (S.sets.length >= MAX_SETS) return false;
    else S.sets.push(set);
    return changed();
  }
  // Loading fills each list up to its unlocked slots; anything past that is left off.
  function loadSet(i) {
    const set = S.sets[i];
    if (!set) return false;
    for (const c of roster()) S.heroes[c.id].rules = (set.heroes[c.id] || []).filter(r => valid(c.id, r)).map(norm).slice(0, slotsOf(c.id));
    S.party.rules = set.party.filter(r => valid('party', r)).map(norm).slice(0, S.party.slots);
    S.loadout.items = cleanItems(set.loadout, S.loadout.slots);
    return changed();
  }
  function deleteSet(i) {
    if (!S.sets[i]) return false;
    S.sets.splice(i, 1);
    return changed();
  }

  // ── reading, for the editor
  function owner(o) {
    const b = book(o), [start, max] = slotRange(o);
    return { rules: clone(b.rules), slots: slotsOf(o), start, max, cost: slotCost(o) };
  }
  const loadout = () => ({ items: S.loadout.items.slice(), slots: S.loadout.slots, start: LOADOUT.slots[0], max: LOADOUT.slots[1] });
  // The conditions the picker offers for an owner's action, grouped, with whether each is known.
  const GROUPS = [['self', 'Self'], ['ally', 'Allies'], ['foe', 'Foes'], ['battle', 'The battle'], ['between', 'Between battles']];
  function conditionMenu(o, action) {
    return GROUPS.map(([g, name]) => ({
      group: g, name,
      items: Object.values(CONDITIONS).filter(C => C.group === g && (isParty(o) ? C.who !== 'self' : !C.between) && (action == null || fits(o, { if: C.id, do: action })))
        .flatMap(C => variants(C.id).map(v => ({ rule: v, key: condKey(v), label: ruleCond(v), known: isKnown(v), from: C.from || 'the Tactician', tip: C.tip || '' }))),
    })).filter(g => g.items.length);
  }
  // A line about what a rule will do: whether its condition picks the target, or why it can never fire.
  function explain(o, r) {
    const C = CONDITIONS[r.if];
    if (!C) return { text: 'Unknown condition', warn: true };
    if (isParty(o)) {
      const A = PARTY_ACTIONS[r.do];
      if (A.kind === 'focus') return gate('tactician') ? { text: 'Heroes attack this foe when their own rule picks no target' } : { text: 'Focus fire comes with Tactician I (1-11): skipped until then', warn: true };
      if (A.kind === 'home') return { text: gate('keepgoing') ? 'Checked after each win on the road' : 'Used once Keep going opens (1-6)' };
      if (!gate('items')) return { text: 'Party items open at 1-3: skipped until then', warn: true };
      const it = ITEMS[A.item], sk = SKILLS[it.skill];
      if (sk.revive && C.who === 'ally') return { text: `Never fires: ${it.name} only reach fallen allies`, warn: true };
      if (sk.shape === 'ally' && !sk.revive && C.who === 'fallen') return { text: `Never fires: ${it.name} can’t reach a fallen ally`, warn: true };
      if (!S.loadout.items.includes(A.item)) return { text: `Not packed: put ${it.name} in the loadout below`, warn: true };
      if (sk.shape !== 'ally') return { text: 'Used at once, between turns' };
      return { text: C.who === 'ally' || C.who === 'fallen' ? 'Used at once on that ally' : `Used at once on ${sk.revive ? 'the first fallen ally' : 'the most hurt ally'}` };
    }
    const sk = SKILLS[r.do];
    const ch = charOf(o);
    if (ch && !ch.skills[r.do] && !SHARED.includes(r.do) && r.do !== CLASSES[ch.cls].basic) return { text: `${sk.name} isn’t learned: skipped in battle`, warn: true };
    if (!equipped(o, r.do)) return { text: `${sk.name} isn’t equipped: skipped in battle`, warn: true };
    const side = sk.shape === 'foe' ? 'foe' : sk.shape === 'ally' ? 'ally' : null;
    if (sk.revive && (C.who === 'ally' || C.who === 'self')) return { text: `Never fires: ${sk.name} only reaches fallen allies`, warn: true };
    if (sk.shape === 'ally' && !sk.revive && C.who === 'fallen') return { text: `Never fires: ${sk.name} can’t reach a fallen ally`, warn: true };
    const picks = side && C.who && (side === 'foe' ? C.who === 'foe' : C.who !== 'foe');
    if (picks) return { text: side === 'foe' ? 'Aims at that foe' : C.who === 'self' ? 'Aims at self' : 'Aims at that ally' };
    if (side) return { text: `Only a check: aims at ${side === 'foe' ? 'the nearest foe' : sk.revive ? 'the first fallen ally' : 'the most hurt ally'}` };
    return { text: 'Only a check' };
  }
  // The battle's party and rules, in the form stageSetup takes: each formation slot's character, as the simulation
  // reads them (Hero.spec), with their rules.
  function setup() {
    const party = formation().map(id => { const c = id && charOf(id); return c ? Hero.spec(c, clone(S.heroes[c.id].rules).slice(0, slotsOf(c.id))) : null; });
    return { party, partyRules: clone(S.party.rules.slice(0, S.party.slots)), loadout: S.loadout.items.filter(Boolean) };
  }

  // Every call makes sure the state is current first.
  const api = fn => (...a) => { ensure(); return fn(...a); };
  const out = { SHARED, condKey, variants, ownerOk, gate, onChange: fn => listeners.push(fn), charOf: o => charOf(o), roster: () => roster(), formation: () => formation(),
    // for the Node tests: a roster and formation of their own
    useRoster: (list, party) => { memRoster = list; memParty = party || list.map(c => c.id).concat([null, null, null, null, null, null]).slice(0, 6); S = null; } };
  const calls = {
    // reading
    owner, loadout, actions, conditionMenu, explain, isKnown, setup, equipped,
    sets: () => S.sets.map(x => ({ name: x.name, count: roster().reduce((n, c) => n + (x.heroes[c.id] || []).length, x.party.length) })),
    // editing
    add, replace, toggle, remove, move, slotCost, setSlots, learn, learnMany, learnAll, setItem, saveSet, loadSet, deleteSet, grantPartyRule,
    // a copy of everything, and loading one (it is checked first)
    dump: () => clone(S),
    load: data => { S = sanitize(data); return changed(); },
    reset: () => { S = fresh(); return changed(); },
  };
  for (const k in calls) out[k] = api(calls[k]);
  return out;
})();

// Battles take the rules from here.
stageSetup.tactics = () => Tactics.setup();

// The items' icons, in the same pixel style as the rest (js/art.js draws them).
if (typeof UI_ICONS !== 'undefined') {
  UI_ICONS.flask = { map: ['..kkk..', '...g...', '..ggg..', '.grrrg.', 'grrwrrg', 'grrrrrg', '.ggggg.'], pal: { k: '#8a5a3a', g: '#b4a8b6', r: '#d4484a', w: '#ffc8b8' } };
  UI_ICONS.salts = { map: ['.kkkkk.', '..ggg..', '.gwwwg.', '.gwbwg.', '.gwwwg.', '.gwbwg.', '.ggggg.'], pal: { k: '#6a4a8a', g: '#b4a8b6', w: '#f2f0e8', b: '#8cc4e6' } };
  UI_ICONS.oil = { map: ['...k...', '..kkk..', '..ggg..', '.gyyyg.', 'gyywyyg', 'gyyyyyg', '.ggggg.'], pal: { k: '#8a5a3a', g: '#9a8a6a', y: '#f4a646', w: '#ffe9a0' } };
}

// ── the Tactics screen (screen 11), after docs/mockups/tactics.html (play-test note 1.35)
// Landscape, in three columns, so nothing pops over what is being edited:
//   the owners   down the left: the heroes in formation order, then the Party, then the Loadout, each with an n/slots
//                badge, and a red dot on a hero with a tactic that can't run
//   the panel    the chosen owner's tactics in a framed panel (js/kit.js): one line each, with a grip to drag it, its
//                number, a "when" chip → a "do" chip (with mana), and a lantern, lit when on. Then the open slots
//                (+ add), the locked ones folded into one line, and for a hero the Otherwise → basic line. The
//                Loadout's lines are its item slots, each with the party tactic that uses it.
//   the picker   at the right, for the chip last tapped: When (the conditions in four groups, those still to find
//                greyed, and a ‹ › stepper at the top for a number or a status) or Do (the hero's skills, or the
//                party's items, Focus fire and Return to the Hearth). The Loadout's picker is its items.
// A long press on a chip or a choice shows its line from the glossary (js/glossary.js); on a tactic that can't run,
// the "!" chip's long press says why (Tactics.explain). Saved sets are one chip at the top right, with a small menu.
// The guide points at it through data-tut: tactics-owners, tactics-row-1, tactics-when, tactics-do, tactics-lamp and
// tactics-picker. Styles in css/rules.css, classes prefixed tx-.
const TacticsEditor = (() => {
  const SHAPES = { foe: 'One foe', front: 'The front row', back: 'The back row', random3: '3 random foes', foes: 'All foes', ally: 'One ally', allies: 'All allies', self: 'Self' };
  const GROUPS = [['self', 'Self'], ['ally', 'Ally'], ['foe', 'Foe'], ['battle', 'Battle']];
  const GROUP_ICON = { self: 'helm', ally: 'heart', foe: 'eye', battle: 'hourglass', between: 'lantern' };
  // What the party's actions are called on this screen, where it differs from js/data.js (the rename pass changes it there).
  const ACT_NAME = { home: 'Return to the Hearth' };
  const PRESS = 450; // ms for a long press
  // owner: a hero's id, 'party' or 'loadout'. sel: the line being edited { i, part: 'when' | 'do' }, i = -1 for a new
  // tactic (draft: { cond, do }). pane: the picker's tab.
  const ui = { owner: null, back: null, sel: null, pane: 'when', draft: null, menu: false, arm: -1, name: '', view: null, scroll: {}, seek: false, tip: null };
  const click = () => { if (typeof sfx === 'function') sfx('click'); };
  const say = text => { if (typeof toast === 'function') toast(text); };
  const G = id => (typeof GLOSSARY !== 'undefined' && GLOSSARY[id]) || null;
  const isParty = o => o === 'party', isLoad = o => o === 'loadout';
  const char = o => Tactics.charOf(o);
  const nameOf = o => (isParty(o) ? 'Party' : isLoad(o) ? 'Loadout' : (char(o) || { name: o }).name);
  // The heroes in formation order (and the one being edited, if they're resting), then the Party and the Loadout.
  const owners = () => { const f = Tactics.formation().filter(Boolean); if (ui.owner && !isParty(ui.owner) && !isLoad(ui.owner) && !f.includes(ui.owner)) f.push(ui.owner); return [...f, 'party', 'loadout']; };
  const ownerOk = o => isLoad(o) || Tactics.ownerOk(o);
  const pxImg = (src, s, cls = '') => h('img', { class: 'px ' + cls, src, alt: '', width: s, height: s, draggable: 'false' });
  const icon = (name, s) => pxImg(iconURL(typeof UI_ICONS !== 'undefined' && !UI_ICONS[name] ? 'scroll' : name), s);
  const portrait = (o, s) => (isParty(o) ? icon('lantern', s - 6) : isLoad(o) ? icon('bag', s - 6) : pxImg(heroPortrait(char(o)), s, 'tx-port'));

  // ── words and numbers for a tactic's parts
  const actName = id => ACT_NAME[id] || (SKILLS[id] || PARTY_ACTIONS[id] || { name: id }).name;
  const actIcon = (o, id) => (isParty(o) ? PARTY_ACTIONS[id].icon : SKILLS[id] ? SKILLS[id].icon : 'sword') || 'sword';
  const mana = (o, id) => (!isParty(o) && SKILLS[id] && SKILLS[id].cost ? SKILLS[id].cost : 0);
  const condGroup = id => { const g = CONDITIONS[id] ? CONDITIONS[id].group : 'battle'; return g === 'between' ? 'battle' : g; };
  const condIcon = id => GROUP_ICON[CONDITIONS[id] ? CONDITIONS[id].group : 'battle'];
  // The glossary's line for a condition or an action, or the game's own text where the glossary has none (a skill).
  const condLine = id => { const e = G('cond_' + id); return e ? e.line : (CONDITIONS[id] && CONDITIONS[id].tip) || ''; };
  const descText = (sk, o) => { const c = char(o); return typeof skillText === 'function' ? skillText(sk, (c && c.skills[sk.id]) || 1) : sk.d || ''; };
  function actLine(o, id) {
    if (isParty(o)) { const A = PARTY_ACTIONS[id], e = G(A.kind === 'item' ? A.item : A.kind === 'focus' ? 'focus_fire' : 'return_to_hearth'); return e ? e.line : A.tip; }
    if (Tactics.SHARED.includes(id) && G(id)) return G(id).line;
    const sk = SKILLS[id];
    return sk ? [SHAPES[sk.shape], sk.tip || descText(sk, o)].filter(Boolean).join('. ') : '';
  }
  // A party action the road hasn't opened yet: the stage or building that opens it, for its chip.
  const actLock = id => { const A = PARTY_ACTIONS[id]; return !A ? null : A.kind === 'focus' && !Tactics.gate('tactician') ? ['TACTICIAN', 'Focus fire comes with Tactician I, at 1-11'] : A.kind === 'item' && !Tactics.gate('items') ? ['1-3', 'Party items open at 1-3'] : A.kind === 'home' && !Tactics.gate('keepgoing') ? ['1-6', 'Return to the Hearth opens with Keep going, at 1-6'] : null; };
  // Why a tactic can't run, or null. The red dot is for a hero with one switched on.
  const warnOf = (o, r) => { const x = Tactics.explain(o, r); return x.warn ? x.text : null; };
  const hasWarn = o => !isLoad(o) && !isParty(o) && Tactics.owner(o).rules.some(r => r.on && warnOf(o, r));

  // The conditions the picker offers, one per condition (its numbers and statuses step at the picker's top), grouped.
  function condMenu(o) {
    const out = GROUPS.map(([g, name]) => ({ g, name, items: [] })), seen = {};
    for (const grp of Tactics.conditionMenu(o, null)) for (const it of grp.items) {
      const id = it.rule.if, G2 = out.find(x => x.g === condGroup(id));
      if (!seen[id]) { seen[id] = { id, known: false, from: it.from }; G2.items.push(seen[id]); }
      if (it.known) seen[id].known = true;
    }
    return out.filter(x => x.items.length);
  }
  const knownVariants = id => Tactics.variants(id).filter(v => Tactics.isKnown(v));
  const sameVar = (a, b) => (a.n != null ? a.n === b.n : a.s != null ? a.s === b.s : true);
  // The version of a condition to pick: the tactic's own if it has this one, else its starting number, else the middle.
  function variantFor(id, cur) {
    const vs = knownVariants(id), C = CONDITIONS[id];
    if (!vs.length) return Tactics.variants(id)[0];
    if (cur && cur.if === id) { const v = vs.find(v => sameVar(v, cur)); if (v) return v; }
    const st = Array.isArray(C.start) ? vs.find(v => C.start.includes(v.n != null ? v.n : v.s)) : null;
    return st || vs[Math.floor((vs.length - 1) / 2)];
  }
  // A condition's label split around the part that steps: [before, value, after]. Two versions' labels differ only there.
  function splitLabel(r) {
    const vs = Tactics.variants(r.if), L = ruleCond(r);
    if (vs.length < 2) return null;
    const a = ruleCond(vs[0]), b = ruleCond(vs[1]);
    let p = 0; while (p < a.length && a[p] === b[p]) p++;
    let q = 0; while (q < a.length - p && q < b.length - p && a[a.length - 1 - q] === b[b.length - 1 - q]) q++;
    let val = L.slice(p, L.length - q), after = L.slice(L.length - q);
    if (after[0] === '%') { val += '%'; after = after.slice(1); }
    return [L.slice(0, p), val, after];
  }
  // Whether a condition and an action go together (only the party's can clash: between battles → Return to the Hearth).
  const fits = (o, cond, act) => !isParty(o) || Tactics.conditionMenu(o, act).some(g => g.items.some(it => it.rule.if === cond.if));
  const partnerAct = (o, cond) => Tactics.actions(o).find(id => !actLock(id) && fits(o, cond, id));
  const partnerCond = (o, act) => { for (const g of condMenu(o)) for (const it of g.items) if (it.known && fits(o, { if: it.id }, act)) return variantFor(it.id); return null; };

  // ── opening and leaving
  function open(back, owner) { App.go('tactics', { back, owner }); }
  function enter(p) {
    ui.back = () => (typeof p.back === 'function' ? p.back() : App.go(p.back || 'party'));
    ui.owner = p.owner && ownerOk(p.owner) ? p.owner : ui.owner && ownerOk(ui.owner) ? ui.owner : owners()[0];
    ui.menu = false; ui.arm = -1; ui.scroll = {};
    pickDefault();
  }
  function close() { tipHide(); ui.menu = false; if (ui.back) ui.back(); else App.go('home'); }
  // The first tactic's "when" is chosen as an owner opens, or a new tactic when it has none.
  function pickDefault() {
    ui.draft = null; ui.seek = true;
    if (isLoad(ui.owner)) { ui.sel = Tactics.gate('items') ? { i: 0, part: 'item' } : null; ui.pane = 'item'; return; }
    const d = Tactics.owner(ui.owner);
    if (d.rules.length) { ui.sel = { i: 0, part: 'when' }; ui.pane = 'when'; }
    else if (d.slots) { ui.sel = { i: -1, part: 'when' }; ui.draft = {}; ui.pane = 'when'; }
    else { ui.sel = null; ui.pane = 'when'; }
  }
  function setOwner(o) { if (!ownerOk(o) || o === ui.owner) return; ui.owner = o; ui.scroll = {}; pickDefault(); draw(); }
  function select(i, part) { ui.sel = { i, part }; ui.pane = part; if (i >= 0) ui.draft = null; ui.seek = true; draw(); }

  // Draws the whole view again, keeping each list's scroll.
  function draw(force) {
    if (!ui.view || (!ui.view.isConnected && !force)) return;
    for (const el of ui.view.querySelectorAll('[data-scroll]')) ui.scroll[el.dataset.scroll] = el.scrollTop;
    tipHide();
    if (!ownerOk(ui.owner)) { ui.owner = owners()[0]; pickDefault(); }
    const o = ui.owner;
    if (ui.sel && ui.sel.i >= 0 && !isLoad(o) && !Tactics.owner(o).rules[ui.sel.i]) pickDefault();
    ui.view.replaceChildren(
      h('button', { class: 'tx-back', type: 'button', 'aria-label': 'Back', onclick: () => { click(); close(); } }, '‹'),
      h('div', { class: 'tx-title' }, icon('scroll', 28), h('b', { text: 'Tactics' })),
      ownerColumn(), mainPanel(o), picker(o), ...setChip());
    for (const el of ui.view.querySelectorAll('[data-scroll]')) el.scrollTop = ui.scroll[el.dataset.scroll] || 0;
    if (ui.view.isConnected) seek();
  }
  // Brings the picker's current choice into view after a new pick or owner.
  function seek() {
    if (ui.seek && ui.view && ui.view.isConnected) {
      ui.seek = false;
      // By hand, not scrollIntoView, which would also scroll the frame's clipped boxes.
      const l = ui.view.querySelector('.tx-opts'), cur = l && l.querySelector('.tx-opt.cur');
      if (l) l.scrollTop = cur ? cur.offsetTop - (l.clientHeight - cur.offsetHeight) / 2 : 0;
    }
  }

  // ── the owners
  function ownerColumn() {
    return h('div', { class: 'tx-owners', 'data-tut': 'tactics-owners', role: 'tablist', 'aria-label': 'Whose tactics' }, owners().map(o => {
      const on = o === ui.owner, L = isLoad(o) ? Tactics.loadout() : null, d = L ? null : Tactics.owner(o);
      const badge = L ? (Tactics.gate('items') ? `${L.items.filter(Boolean).length}/${L.slots}` : '') : `${d.rules.length}/${d.slots}`;
      const b = h('button', { class: 'tx-ow' + (on ? ' on' : '') + (isParty(o) || isLoad(o) ? ' grp' : '') + (!L && !isParty(o) && !Tactics.formation().includes(o) ? ' bench' : ''), type: 'button', role: 'tab', 'aria-selected': on ? 'true' : 'false', 'aria-label': nameOf(o), title: nameOf(o), 'data-owner': o, onclick: () => { click(); setOwner(o); } },
        h('span', { class: 'tx-pf' }, portrait(o, 28)), badge ? h('em', { text: badge }) : null, L && !Tactics.gate('items') ? h('span', { class: 'tx-owlk' }, icon('lock', 10)) : null, hasWarn(o) ? h('i', { class: 'tx-dot' }) : null);
      press(b, () => [nameOf(o), badge ? (L ? `${badge} slots filled` : `${badge} tactics`) : '']);
      return b;
    }));
  }

  // ── the panel: the plate, then a line per tactic
  function mainPanel(o) {
    const K = Kit.panel({ title: nameOf(o), count: '', cls: 'tx-main' });
    K.close.remove();
    let rows, count;
    if (isLoad(o)) [rows, count] = loadoutRows();
    else {
      const d = Tactics.owner(o);
      rows = tacticRows(o, d);
      count = `${d.rules.length} / ${d.slots}`;
    }
    const c = char(o);
    K.plate.replaceChildren(h('span', { class: 'tx-pport' }, portrait(o, 28)),
      h('div', { class: 'tx-pnm' }, h('h3', { text: nameOf(o) }), c ? h('span', { text: `${CLASSES[c.cls].name} · Lv ${c.level}` }) : null),
      count ? h('span', { class: 'kp-ct', text: count }) : null);
    K.body.append(h('ol', { class: 'tx-list', 'data-scroll': 'list:' + o, 'aria-label': `${nameOf(o)} tactics` }, rows));
    return K.root;
  }
  const chip = (cls, kids, o) => h('button', Object.assign({ class: 'tx-chip ' + cls, type: 'button' }, o || {}), kids);
  function tacticRows(o, d) {
    const party = isParty(o), rows = [];
    d.rules.forEach((r, i) => {
      const first = i === 0, selW = ui.sel && ui.sel.i === i && ui.sel.part === 'when', selD = ui.sel && ui.sel.i === i && ui.sel.part === 'do';
      const warn = warnOf(o, r), m = mana(o, r.do), cond = ruleCond(r);
      const when = chip('tx-when' + (selW ? ' sel' : ''), [icon(condIcon(r.if), 16), h('span', { text: cond })],
        { 'aria-label': `When: ${cond}`, 'data-tut': first ? 'tactics-when' : null, onclick: () => { click(); select(i, 'when'); } });
      press(when, () => [cond, condLine(r.if)]);
      const doo = chip('tx-do' + (selD ? ' sel' : '') + (warn ? ' warn' : ''), [icon(actIcon(o, r.do), 16), h('span', { text: actName(r.do) }), warn ? h('b', { class: 'tx-bad', text: '!' }) : m ? h('em', { text: String(m) }) : null],
        { 'aria-label': `Do: ${actName(r.do)}${warn ? '. ' + warn : ''}`, 'data-tut': first ? 'tactics-do' : null, onclick: () => { click(); select(i, 'do'); } });
      press(doo, () => [actName(r.do), warn || actLine(o, r.do)]);
      const lamp = h('button', { class: 'tx-lamp' + (r.on ? ' on' : ''), type: 'button', role: 'switch', 'aria-checked': r.on ? 'true' : 'false', 'aria-label': `Tactic ${i + 1} on`, 'data-tut': first ? 'tactics-lamp' : null,
        onclick: () => { click(); Tactics.toggle(o, i); draw(); } }, icon('lantern', 18));
      const grip = h('button', { class: 'tx-grip', type: 'button', 'aria-label': `Tactic ${i + 1}: drag, or use the arrow keys, to move it`, onpointerdown: e => dragStart(e, i), onkeydown: e => gripKey(e, i) }, h('i'), h('i'), h('i'));
      rows.push(h('li', { class: 'tx-rule' + (r.on ? '' : ' off') + (ui.sel && ui.sel.i === i ? ' sel' : ''), 'data-i': i, 'data-tut': first ? 'tactics-row-1' : null },
        grip, h('span', { class: 'tx-num', text: String(i + 1) }), when, h('span', { class: 'tx-to', text: '→' }), doo, lamp));
    });
    for (let i = d.rules.length; i < d.slots; i++) {
      const tut = !d.rules.length && i === 0 ? 'tactics-row-1' : null;
      if (i === d.rules.length && ui.sel && ui.sel.i === -1) { rows.push(draftRow(o, i, tut)); continue; }
      rows.push(h('li', { class: 'tx-rule tx-open', 'data-tut': tut }, h('button', { class: 'tx-add', type: 'button', 'aria-label': `Slot ${i + 1}: add a tactic`, onclick: () => { click(); ui.draft = {}; select(-1, 'when'); } },
        h('span', { class: 'tx-num', text: String(i + 1) }), h('span', { text: 'Open slot' }), h('em', { text: '+ add' }))));
    }
    if (d.max > d.slots) {
      const where = party ? 'tactician' : 'mastershall';
      rows.push(h('li', { class: 'tx-rule tx-lock' }, h('button', { class: 'tx-add', type: 'button', 'aria-label': `${d.max - d.slots} more slots: ${party ? 'the Tactician' : 'the Masters’ Hall'}`,
        onclick: () => { click(); if (App.actions.building) App.actions.building(where); } },
        icon('lock', 16), h('span', { text: `${d.max - d.slots} more` }), h('em', { text: party ? 'Tactician' : 'Masters’ Hall' }))));
    }
    if (!party) {
      const b = CLASSES[char(o).cls].basic;
      const other = h('div', { class: 'tx-chip tx-do' }, icon(actIcon(o, b), 16), h('span', { text: actName(b) }));
      press(other, () => [actName(b), actLine(o, b)]);
      rows.push(h('li', { class: 'tx-rule tx-dflt' }, h('span', { class: 'tx-k', text: 'Else' }), h('div', { class: 'tx-chip tx-when' }, h('span', { text: 'Otherwise' })), h('span', { class: 'tx-to', text: '→' }), other, h('span')));
    }
    return rows;
  }
  // A tactic being made: its "when" and "do" fill in as they're picked; ✕ drops it.
  function draftRow(o, i, tut) {
    const D = ui.draft || {}, selW = ui.sel.part === 'when', selD = ui.sel.part === 'do';
    const when = chip('tx-when' + (selW ? ' sel' : '') + (D.cond ? '' : ' empty'), D.cond ? [icon(condIcon(D.cond.if), 16), h('span', { text: ruleCond(D.cond) })] : [h('span', { text: 'When' })], { 'aria-label': 'When', 'data-tut': tut ? 'tactics-when' : null, onclick: () => { click(); ui.sel.part = 'when'; ui.pane = 'when'; draw(); } });
    const doo = chip('tx-do' + (selD ? ' sel' : '') + (D.do ? '' : ' empty'), D.do ? [icon(actIcon(o, D.do), 16), h('span', { text: actName(D.do) })] : [h('span', { text: 'Do' })], { 'aria-label': 'Do', 'data-tut': tut ? 'tactics-do' : null, onclick: () => { click(); ui.sel.part = 'do'; ui.pane = 'do'; draw(); } });
    const x = h('button', { class: 'tx-lamp tx-drop-x', type: 'button', 'aria-label': 'Drop this tactic', onclick: () => { click(); pickDefaultKeep(); } }, '✕');
    return h('li', { class: 'tx-rule tx-draft sel', 'data-tut': tut }, h('span'), h('span', { class: 'tx-num', text: String(i + 1) }), when, h('span', { class: 'tx-to', text: '→' }), doo, x);
  }
  function pickDefaultKeep() { const p = ui.pane; pickDefault(); if (ui.sel && ui.sel.i === -1) { ui.sel = null; ui.draft = null; } ui.pane = p === 'do' ? 'do' : 'when'; draw(); }

  // The Loadout: one line per item slot, with the party tactic that uses it.
  function loadoutRows() {
    if (!Tactics.gate('items')) return [[h('li', { class: 'tx-rule tx-lock' }, h('div', { class: 'tx-add' }, icon('lock', 16), h('span', { text: 'Party items' }), h('em', { text: '1-3' })))], ''];
    const L = Tactics.loadout(), P = Tactics.owner('party'), rows = [], bag = (Save.state && Save.state.inventory && Save.state.inventory.potions) || {};
    L.items.forEach((id, i) => {
      const it = id && ITEMS[id], sel = ui.sel && ui.sel.i === i;
      const item = chip('tx-do tx-item' + (sel ? ' sel' : '') + (it ? '' : ' empty'), it ? [icon(it.icon, 16), h('span', { text: it.name }), h('em', { text: '×' + (bag[id] || 0) })] : [h('span', { text: 'Empty' })],
        { 'aria-label': it ? `Slot ${i + 1}: ${it.name}` : `Slot ${i + 1}: empty`, 'data-tut': i === 0 ? 'tactics-do' : null, onclick: () => { click(); select(i, 'item'); } });
      if (it) press(item, () => [it.name, actLine('party', id)]);
      const k = it ? P.rules.findIndex(r => r.do === id) : -1, r = k >= 0 ? P.rules[k] : null;
      const by = r ? chip('tx-when' + (r.on ? '' : ' dim'), [icon(condIcon(r.if), 16), h('span', { text: ruleCond(r) })], { 'aria-label': `Party tactic ${k + 1}: ${ruleCond(r)}`, onclick: () => { click(); ui.owner = 'party'; ui.scroll = {}; ui.draft = null; select(k, 'when'); } })
        : h('div', { class: 'tx-chip tx-when empty' }, h('span', { text: it ? 'By hand' : '' }));
      rows.push(h('li', { class: 'tx-rule tx-slotln' + (sel ? ' sel' : ''), 'data-i': i, 'data-tut': i === 0 ? 'tactics-row-1' : null }, h('span'), h('span', { class: 'tx-num', text: String(i + 1) }), item, h('span', { class: 'tx-to', text: '←' }), by, h('span')));
    });
    if (L.max > L.slots) rows.push(h('li', { class: 'tx-rule tx-lock' }, h('button', { class: 'tx-add', type: 'button', onclick: () => { click(); if (App.actions.building) App.actions.building('tactician'); } }, icon('lock', 16), h('span', { text: `${L.max - L.slots} more` }), h('em', { text: 'Tactician' }))));
    return [rows, `${L.items.filter(Boolean).length} / ${L.slots}`];
  }

  // ── the picker
  function picker(o) {
    const K = Kit.panel({ title: 'Pick', cls: 'tx-pick' });
    K.close.remove();
    K.root.dataset.tut = 'tactics-picker';
    const tab = (id, label) => h('button', { class: 'tx-ptab' + (ui.pane === id ? ' on' : ''), type: 'button', role: 'tab', 'aria-selected': ui.pane === id ? 'true' : 'false', onclick: () => { click(); ui.pane = id; if (ui.sel) ui.sel.part = id; ui.seek = true; draw(); } }, label);
    K.plate.replaceChildren(...(isLoad(o) ? [h('span', { class: 'tx-ptab on solo', text: 'Items' })] : [tab('when', 'When'), tab('do', 'Do')]));
    K.plate.classList.add('tx-ptabs');
    const opts = h('div', { class: 'tx-opts', 'data-scroll': 'opts:' + o + ':' + ui.pane });
    let top = null, foot = null;
    if (isLoad(o)) opts.append(...itemOpts());
    else if (ui.pane === 'when') { top = stepBar(o); opts.append(...condOpts(o)); }
    else opts.append(...actOpts(o));
    if (!isLoad(o)) {
      const cur = ui.sel && ui.sel.i >= 0 ? Tactics.owner(o).rules[ui.sel.i] : null;
      const unknown = ui.pane === 'when' && condMenu(o).some(g => g.items.some(it => !it.known));
      foot = cur || unknown ? h('div', { class: 'tx-pfoot' },
        unknown ? h('button', { class: 'tx-learn proto-only', type: 'button', onclick: () => { click(); Tactics.learnAll(); draw(); } }, icon('book', 12), 'Learn all') : null,
        cur ? h('button', { class: 'tx-rm', type: 'button', 'aria-label': `Remove tactic ${ui.sel.i + 1}`, onclick: () => { click(); Tactics.remove(o, ui.sel.i); ui.sel = null; pickDefault(); draw(); } }, `✕ Tactic ${ui.sel.i + 1}`) : null) : null;
    }
    K.body.append(...[top, opts, foot].filter(Boolean));
    return K.root;
  }
  // The rule the picker is editing: a tactic's, or the new one's.
  const editing = o => (ui.sel && ui.sel.i >= 0 ? Tactics.owner(o).rules[ui.sel.i] : ui.sel && ui.sel.i === -1 ? Object.assign({}, ui.draft && ui.draft.cond, ui.draft && ui.draft.do ? { do: ui.draft.do } : {}) : null);
  function stepBar(o) {
    const cur = editing(o);
    if (!cur || !cur.if || !CONDITIONS[cur.if]) return null;
    const parts = splitLabel(cur);
    if (!parts) return null;
    const vs = knownVariants(cur.if), k = vs.findIndex(v => sameVar(v, cur));
    const go = d => { const v = vs[k + d]; if (!v) return; click(); setCond(o, Object.assign({}, v)); };
    return h('div', { class: 'tx-stepbar' },
      parts[0].trim() ? h('span', { text: parts[0].trim() }) : null,
      h('span', { class: 'tx-stepin' }, h('button', { type: 'button', 'aria-label': 'Less', disabled: k <= 0 ? '' : null, onclick: () => go(-1) }, '‹'), h('b', { text: parts[1] }), h('button', { type: 'button', 'aria-label': 'More', disabled: k < 0 || k >= vs.length - 1 ? '' : null, onclick: () => go(1) }, '›')),
      parts[2].trim() ? h('span', { text: parts[2].trim() }) : null);
  }
  function condOpts(o) {
    const cur = editing(o), out = [];
    for (const g of condMenu(o)) {
      out.push(h('div', { class: 'tx-grp', text: g.name }));
      for (const it of g.items) {
        const v = variantFor(it.id, cur), label = ruleCond(cur && cur.if === it.id ? cur : v), on = cur && cur.if === it.id;
        const b = h('button', { class: 'tx-opt' + (on ? ' cur' : '') + (it.known ? '' : ' locked'), type: 'button', 'data-cond': it.id, 'aria-label': it.known ? label : `${label}: to find`,
          onclick: () => { click(); if (!it.known) { say(`To find: ${it.from}`); return; } if (!on) setCond(o, v); } },
          icon(it.known ? GROUP_ICON[CONDITIONS[it.id].group] : 'lock', 15), h('span', { text: label }), it.known ? null : h('em', { text: 'to find' }));
        press(b, () => [label, condLine(it.id)]);
        out.push(b);
      }
    }
    return out;
  }
  function actOpts(o) {
    const cur = editing(o), out = [], party = isParty(o), c = char(o);
    const groups = party ? [['Items', Tactics.actions(o).filter(id => PARTY_ACTIONS[id].kind === 'item')], ['Party', Tactics.actions(o).filter(id => PARTY_ACTIONS[id].kind !== 'item')]]
      : [['Skills', Tactics.actions(o).filter(id => !Tactics.SHARED.includes(id))], ['Every hero', Tactics.actions(o).filter(id => Tactics.SHARED.includes(id))]];
    const packed = id => Tactics.loadout().items.filter(x => x === PARTY_ACTIONS[id].item).length;
    for (const [name, ids] of groups) {
      if (!ids.length) continue;
      out.push(h('div', { class: 'tx-grp', text: name }));
      for (const id of ids) {
        const lock = party ? actLock(id) : null, not = !party && !Tactics.equipped(o, id), m = mana(o, id), on = cur && cur.do === id;
        const item = party && PARTY_ACTIONS[id].kind === 'item', n = item ? packed(id) : 0;
        const em = lock ? lock[0] : not ? 'not equipped' : item ? (n ? '×' + n : 'not packed') : m ? m + ' MP' : '';
        const b = h('button', { class: 'tx-opt' + (on ? ' cur' : '') + (lock ? ' locked' : '') + (not || (item && !n) ? ' not' : ''), type: 'button', 'data-act': id, 'aria-label': actName(id) + (em ? ': ' + em : ''),
          onclick: () => { click(); if (lock) { say(lock[1]); return; } if (!on) setAct(o, id); } },
          icon(lock ? 'lock' : actIcon(o, id), 15), h('span', { text: actName(id) }), em ? h('em', { text: em }) : null);
        press(b, () => [actName(id), actLine(o, id)]);
        out.push(b);
      }
    }
    if (c && !out.length) out.push(h('div', { class: 'tx-grp', text: 'Skills' }));
    return out;
  }
  function itemOpts() {
    if (!Tactics.gate('items') || !ui.sel) return [h('div', { class: 'tx-grp', text: 'Items' })];
    const i = ui.sel.i, cur = Tactics.loadout().items[i], bag = (Save.state && Save.state.inventory && Save.state.inventory.potions) || {};
    const put = id => { click(); Tactics.setItem(i, id); draw(); };
    const out = [h('div', { class: 'tx-grp', text: `Slot ${i + 1}` })];
    for (const id of Object.keys(ITEMS)) {
      const it = ITEMS[id], b = h('button', { class: 'tx-opt' + (cur === id ? ' cur' : '') + (bag[id] ? '' : ' not'), type: 'button', 'data-item': id, onclick: () => { if (cur !== id) put(id); } },
        icon(it.icon, 15), h('span', { text: it.name }), h('em', { text: '×' + (bag[id] || 0) }));
      press(b, () => [it.name, actLine('party', id)]);
      out.push(b);
    }
    if (cur) out.push(h('button', { class: 'tx-opt empty', type: 'button', 'data-item': '', onclick: () => put(null) }, h('span', { text: 'Empty' })));
    return out;
  }

  // ── picking: a condition or an action for the tactic being edited, or the new one
  function setCond(o, v) {
    const p = ui.sel;
    if (!p) { if (Tactics.owner(o).rules.length >= Tactics.owner(o).slots) { say('No open slot'); return; } ui.sel = { i: -1, part: 'when' }; ui.draft = {}; return setCond(o, v); }
    if (p.i === -1) {
      ui.draft = Object.assign(ui.draft || {}, { cond: v });
      if (ui.draft.do && !fits(o, v, ui.draft.do)) ui.draft.do = null;
      return ui.draft.do ? commitDraft(o) : (ui.sel.part = ui.pane = 'do', ui.seek = true, draw());
    }
    const cur = Tactics.owner(o).rules[p.i];
    if (fits(o, v, cur.do)) Tactics.replace(o, p.i, v);
    else {
      const a = partnerAct(o, v);
      if (!a || !Tactics.replace(o, p.i, Object.assign({}, v, { do: a }))) { say(`Not with ${actName(cur.do)}`); return; }
      ui.sel.part = ui.pane = 'do'; ui.seek = true;
    }
    draw();
  }
  function setAct(o, id) {
    const p = ui.sel;
    if (!p) { if (Tactics.owner(o).rules.length >= Tactics.owner(o).slots) { say('No open slot'); return; } ui.sel = { i: -1, part: 'do' }; ui.draft = {}; return setAct(o, id); }
    if (p.i === -1) {
      ui.draft = Object.assign(ui.draft || {}, { do: id });
      if (ui.draft.cond && !fits(o, ui.draft.cond, id)) ui.draft.cond = null;
      return ui.draft.cond ? commitDraft(o) : (ui.sel.part = ui.pane = 'when', ui.seek = true, draw());
    }
    const cur = Tactics.owner(o).rules[p.i];
    if (fits(o, cur, id)) Tactics.replace(o, p.i, { do: id });
    else {
      const c = partnerCond(o, id);
      if (!c || !Tactics.replace(o, p.i, Object.assign({}, c, { do: id }))) { say(`Not with ${ruleCond(cur)}`); return; }
      ui.sel.part = ui.pane = 'when'; ui.seek = true;
    }
    draw();
  }
  function commitDraft(o) {
    const D = ui.draft;
    if (!Tactics.add(o, Object.assign({}, D.cond, { do: D.do, on: true }))) { say('That tactic can’t be made'); return draw(); }
    ui.draft = null; ui.sel = { i: Tactics.owner(o).rules.length - 1, part: ui.pane };
    draw();
  }

  // ── the saved sets: one chip at the top right, and its menu
  function setChip() {
    if (!Tactics.gate('tactician')) return [h('button', { class: 'tx-setchip locked', type: 'button', 'aria-label': 'Saved sets: Tactician', onclick: () => { click(); say('Saved sets come with Tactician I, at 1-11'); } }, icon('lock', 12), h('span', { text: 'Sets' }))];
    const list = Tactics.sets(), now = currentSet();
    const chipB = h('button', { class: 'tx-setchip' + (ui.menu ? ' open' : ''), type: 'button', 'aria-expanded': ui.menu ? 'true' : 'false', 'aria-label': 'Saved sets', onclick: () => { click(); ui.menu = !ui.menu; ui.arm = -1; draw(); } },
      h('span', { text: 'Set' }), h('b', { text: now >= 0 ? list[now].name : '—' }), h('i', { text: '▾' }));
    if (!ui.menu) return [chipB];
    const input = h('input', { class: 'tx-name', type: 'text', maxlength: '24', placeholder: 'Name', 'aria-label': 'Set name', value: ui.name, oninput: e => { ui.name = e.target.value; } });
    const save = () => {
      const name = input.value.trim();
      if (!name) { input.focus(); return; }
      const over = list.some(x => x.name.toLowerCase() === name.toLowerCase());
      if (Tactics.saveSet(name)) { ui.name = ''; ui.menu = false; say(over ? `Updated “${name}”` : `Saved “${name}”`); draw(); }
      else say('Sets are full');
    };
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); click(); save(); } else if (e.key === 'Escape') { e.stopPropagation(); ui.menu = false; draw(); } });
    const menu = h('div', { class: 'tx-menu', role: 'menu' },
      list.map((x, i) => h('div', { class: 'tx-set' + (i === now ? ' cur' : '') },
        h('button', { class: 'tx-setnm', type: 'button', role: 'menuitem', onclick: () => { click(); Tactics.loadSet(i); say(`Loaded “${x.name}”`); ui.menu = false; pickDefault(); draw(); } }, h('span', { text: x.name }), h('em', { text: String(x.count) })),
        h('button', { class: 'tx-setx' + (ui.arm === i ? ' arm' : ''), type: 'button', 'aria-label': ui.arm === i ? `Delete ${x.name}: tap again` : `Delete ${x.name}`, onclick: () => { click(); if (ui.arm === i) { Tactics.deleteSet(i); ui.arm = -1; } else ui.arm = i; draw(); } }, ui.arm === i ? 'Delete' : '✕'))),
      h('div', { class: 'tx-save' }, input, Kit.button('Save', save)));
    const scrim = h('div', { class: 'tx-scrim', onclick: () => { ui.menu = false; ui.arm = -1; draw(); } });
    return [scrim, chipB, menu];
  }
  // The saved set that matches every list as it stands now, or -1.
  function currentSet() {
    const D = Tactics.dump(), same = (a, b) => JSON.stringify(a || []) === JSON.stringify(b || []);
    return D.sets.findIndex(x => Tactics.roster().every(c => same(x.heroes[c.id], D.heroes[c.id] && D.heroes[c.id].rules)) && same(x.party, D.party.rules) && same(x.loadout.slice(0, D.loadout.slots).concat(Array(Math.max(0, D.loadout.slots - x.loadout.length)).fill(null)), D.loadout.items));
  }

  // ── a long press: the glossary's line (or why a tactic can't run) in a small card by the finger
  function press(el, what) {
    let t = 0, x0 = 0, y0 = 0;
    const stop = () => { clearTimeout(t); t = 0; };
    el.addEventListener('pointerdown', e => {
      if (e.button > 0) return;
      const p = Frame.point(e); x0 = p.x; y0 = p.y;
      stop(); delete el.dataset.pressed;
      t = setTimeout(() => { t = 0; const [name, line] = what(); if (line) { tipShow(el, name, line); el.dataset.pressed = '1'; } }, PRESS);
    });
    el.addEventListener('pointermove', e => { if (!t) return; const p = Frame.point(e); if (Math.abs(p.x - x0) > 8 || Math.abs(p.y - y0) > 8) stop(); });
    el.addEventListener('pointerup', stop); el.addEventListener('pointercancel', stop); el.addEventListener('pointerleave', stop);
    // The tap that ends a long press doesn't also pick.
    el.addEventListener('click', e => { if (el.dataset.pressed) { delete el.dataset.pressed; e.stopImmediatePropagation(); e.preventDefault(); } }, true);
    const [name, line] = what();
    if (line) el.title = `${name}: ${line}`;
  }
  function tipShow(el, name, line) {
    tipHide();
    if (!ui.view) return;
    const b = Frame.box(el, ui.view), W = ui.view.clientWidth;
    const tip = h('div', { class: 'tx-tip', role: 'tooltip' }, h('b', { text: name }), h('span', { text: words(line) }));
    ui.view.append(tip);
    const w = tip.offsetWidth, hh = tip.offsetHeight, below = b.top - hh - 8 < 4;
    tip.style.left = clamp(b.left + b.width / 2 - w / 2, 6, W - w - 6) + 'px';
    tip.style.top = (below ? b.bottom + 8 : b.top - hh - 8) + 'px';
    ui.tip = tip;
    const off = () => { document.removeEventListener('pointerdown', off, true); tipHide(); };
    setTimeout(() => document.addEventListener('pointerdown', off, true), 0);
  }
  // The glossary and the model still say rule; this screen says tactic (until the rename pass changes them there).
  const words = t => t.replace(/\b([Rr])ule(s?)\b/g, (m, r, s2) => (r === 'R' ? 'Tactic' : 'tactic') + s2);
  function tipHide() { if (ui.tip) { ui.tip.remove(); ui.tip = null; } }

  // ── reordering by drag: the line lifts, a copy follows the finger and a line shows where it lands
  const MOVE = 4;
  function dragStart(e, i) {
    if (e.button > 0) return;
    const grip = e.currentTarget, row = grip.closest('.tx-rule'), panel = row.closest('.kp'), list = [...row.parentNode.querySelectorAll('.tx-rule[data-i]')];
    if (list.length < 2) return;
    e.preventDefault();
    try { grip.setPointerCapture(e.pointerId); } catch (err) { }
    const y0 = Frame.point(e, panel).y, boxes = list.map(el => Frame.box(el, panel));
    const d = { i, to: i, moved: false, ghost: null, line: null };
    const slotAt = y => { let k = 0; boxes.forEach((b, j) => { if (y > b.top + b.height / 2) k = j + 1; }); return k; };
    const move = ev => {
      const y = Frame.point(ev, panel).y;
      if (!d.moved && Math.abs(y - y0) <= MOVE) return;
      if (!d.moved) {
        d.moved = true; row.classList.add('lift');
        d.ghost = row.cloneNode(true); d.ghost.classList.remove('lift', 'sel'); d.ghost.classList.add('tx-ghost'); d.ghost.removeAttribute('data-tut'); d.ghost.querySelectorAll('[data-tut]').forEach(x => x.removeAttribute('data-tut'));
        d.ghost.style.width = boxes[i].width + 'px'; d.ghost.style.left = boxes[i].left + 'px';
        d.line = h('div', { class: 'tx-dropline' }); d.line.style.left = boxes[i].left + 'px'; d.line.style.width = boxes[i].width + 'px';
        panel.append(d.ghost, d.line);
      }
      d.ghost.style.top = (boxes[i].top + (y - y0)) + 'px';
      const k = slotAt(y);
      d.to = k > i ? k - 1 : k;
      d.line.style.top = (k >= boxes.length ? boxes[boxes.length - 1].bottom + 1 : boxes[k].top - 4) + 'px';
    };
    const up = () => {
      grip.removeEventListener('pointermove', move); grip.removeEventListener('pointerup', up); grip.removeEventListener('pointercancel', up);
      if (d.ghost) d.ghost.remove(); if (d.line) d.line.remove(); row.classList.remove('lift');
      if (d.moved && d.to !== d.i && Tactics.move(ui.owner, d.i, d.to)) { click(); follow(d.i, d.to); say(`Moved to ${d.to + 1}`); }
      draw();
    };
    grip.addEventListener('pointermove', move); grip.addEventListener('pointerup', up); grip.addEventListener('pointercancel', up);
  }
  // The selection stays on the tactic that moved, wherever it went.
  function follow(from, to) {
    if (!ui.sel || ui.sel.i < 0) return;
    const s = ui.sel.i;
    ui.sel.i = s === from ? to : from < s && to >= s ? s - 1 : from > s && to <= s ? s + 1 : s;
  }
  function gripKey(e, i) {
    const d = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0;
    if (!d) return;
    e.preventDefault();
    if (Tactics.move(ui.owner, i, i + d)) {
      click(); follow(i, i + d); draw();
      const g = ui.view.querySelectorAll('.tx-rule .tx-grip')[i + d];
      if (g) g.focus();
    }
  }

  // Escape goes back, or closes the sets menu.
  document.addEventListener('keydown', ev => {
    if (typeof App === 'undefined' || App.current !== 'tactics' || !ui.view || !ui.view.isConnected || ev.key !== 'Escape' || (ev.target.closest && ev.target.closest('input,textarea,select'))) return;
    ev.preventDefault();
    if (ui.menu) { ui.menu = false; draw(); } else close();
  });

  function render(p) {
    enter(p || {});
    ui.view = h('div', { class: 'tx-view', oncontextmenu: e => e.preventDefault() });
    draw(true);
    requestAnimationFrame(seek);
    return ui.view;
  }
  function dismiss() { tipHide(); ui.menu = false; }

  return { open, close, dismiss, render, draw, setOwner, get owner() { return ui.owner; }, set owner(o) { if (ownerOk(o)) { ui.owner = o; pickDefault(); draw(); } }, get sel() { return ui.sel; }, get pane() { return ui.pane; } };
})();

// ── opening the screen from the app shell (js/app.js)
// The hero screen's Edit tactics opens it on that hero. App.go('tactics', { owner: 'party' }) opens the party's
// tactics. Back returns where it was opened from (by default the Party screen).
if (typeof App !== 'undefined') {
  App.screen('tactics', {
    tab: true, full: true, bare: true,
    render: p => TacticsEditor.render(p),
    refresh: () => TacticsEditor.draw(),
    leave: () => TacticsEditor.dismiss(),
  });
  App.actions.tactics = (id, back) => {
    if (!Tactics.gate('tactics')) { if (typeof toast === 'function') toast('The Tactics screen opens when you first clear 1-1.'); return; }
    App.go('tactics', { owner: id, back });
  };
}
