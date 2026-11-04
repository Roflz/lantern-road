'use strict';
// Lantern Road · Tactics: the rules model and the rules editor.
//
// Tactics is the model: each hero's rules and rule slots, the party rules, the party's item loadout, which
// conditions the player knows, and the saved rule sets. It touches no page, so tools/simtest.js tests it in Node.
// Every change goes through it.
// TacticsEditor is the view: it draws the editor screen from the model and turns taps into model calls. Its look
// lives in css/rules.css. The final design will come from the screen mockups; only the view and the stylesheet
// should need to change for it.
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
  const actions = o => { if (isParty(o)) return Object.keys(PARTY_ACTIONS); const c = charOf(o); return [CLASSES[c.cls].basic, ...Hero.actives(c), 'defend']; };
  const equipped = (o, id) => { const c = charOf(o); return !c || id === CLASSES[c.cls].basic || id === 'defend' || c.equip.includes(id); };
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
  const allowed = o => { if (isParty(o)) return Object.keys(PARTY_ACTIONS); const c = charOf(o); return [CLASSES[c.cls].basic, 'defend', ...c.classes.flatMap(k => [CLASSES[k].starter, ...CLASSES[k].tree.flat()]).filter(id => SKILLS[id].kind === 'active')]; };
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
    if (ch && !ch.skills[r.do] && r.do !== 'defend' && r.do !== CLASSES[ch.cls].basic) return { text: `${sk.name} isn’t learned: skipped in battle`, warn: true };
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
  const out = { condKey, variants, ownerOk, gate, onChange: fn => listeners.push(fn), charOf: o => charOf(o), roster: () => roster(), formation: () => formation(),
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

// ── the editor screen
const TacticsEditor = (() => {
  const SHAPES = { foe: 'One foe', front: 'The front row', back: 'The back row', random3: '3 random foes', foes: 'All foes', ally: 'One ally', allies: 'All allies', self: 'Self' };
  const ui = { owner: null, back: null, pick: null, draft: '' };
  const click = () => { if (typeof sfx === 'function') sfx('click'); };
  const say = text => { if (typeof toast === 'function') toast(text); };
  const nameOf = o => (o === 'party' ? 'Party' : (Tactics.charOf(o) || { name: o }).name);
  const clsOf = o => Tactics.charOf(o).cls;
  const owners = () => [...Tactics.formation().filter(Boolean), 'party'];

  // Opens the editor on an owner's tab (a hero's key or 'party'). back is called to leave it.
  function open(back, owner) {
    ui.back = back || null;
    ui.pick = null;
    if (owner && Tactics.ownerOk(owner)) ui.owner = owner;
    if (!ui.owner || !Tactics.ownerOk(ui.owner)) ui.owner = owners()[0];
    render(true);
  }
  function close() {
    closePicker();
    if (ui.back) ui.back();
    else { const s = $('#screen'); s.hidden = true; s.replaceChildren(); }
  }
  // Draws the whole screen again, keeping the scroll position unless asked to start at the top.
  function render(top) {
    const s = $('#screen'), y = s.scrollTop;
    s.replaceChildren(screen());
    s.hidden = false;
    s.scrollTop = top ? 0 : y;
    renderPicker();
  }

  // ── pieces
  const actionInfo = (o, id) => {
    if (o === 'party') {
      const A = PARTY_ACTIONS[id], n = A.kind === 'item' ? Tactics.loadout().items.filter(x => x === A.item).length : 0;
      return { name: A.name, icon: A.icon, note: A.kind === 'item' ? (n ? `${n} packed` : 'Not packed') : 'Targeting', tip: A.tip };
    }
    const sk = SKILLS[id], basic = id === CLASSES[clsOf(o)].basic || id === 'defend', on = Tactics.equipped(o, id), learned = basic || !!Tactics.charOf(o).skills[id];
    return { name: sk.name, icon: sk.icon, note: basic ? 'Basic · no mana' : !learned ? 'Not learned' : on ? `${sk.cost || 0} mana` : 'Not equipped', off: !on, tip: [SHAPES[sk.shape], sk.tip || descText(sk, o)].filter(Boolean).join('. ') };
  };
  const portrait = o => (o === 'party' ? h('span', { class: 'tx-pp' }, ico('lantern')) : h('img', { src: heroPortrait(Tactics.charOf(o)), alt: '' }));
  // A skill's text at the character's level, for tips.
  const descText = (sk, o) => { const c = Tactics.charOf(o); return typeof skillText === 'function' ? skillText(sk, (c && c.skills[sk.id]) || 1) : sk.d || ''; };

  function tabs() {
    return h('div', { class: 'tx-tabs', role: 'tablist', 'aria-label': 'Whose rules' }, owners().map(o => {
      const on = ui.owner === o, d = Tactics.owner(o);
      return h('button', { class: 'tx-tab' + (on ? ' on' : '') + (o === 'party' ? ' party' : ''), role: 'tab', 'aria-selected': on ? 'true' : 'false', title: nameOf(o), onclick: () => { click(); ui.owner = o; render(); } },
        portrait(o), h('span', { class: 'nm', text: nameOf(o) }), h('span', { class: 'ct', title: 'Rules / open slots', text: `${d.rules.length}/${d.slots}` }));
    }));
  }

  function ruleRow(o, r, i) {
    const a = actionInfo(o, r.do), x = Tactics.explain(o, r);
    return h('li', { class: 'tx-rule' + (r.on ? '' : ' off'), 'data-i': i },
      h('button', { class: 'tx-grip', 'aria-label': `Rule ${i + 1}. Drag, or use the arrow keys, to move it`, onpointerdown: e => dragStart(e, i), onkeydown: e => gripKey(e, i) },
        h('b', { text: String(i + 1) }), h('i', { 'aria-hidden': 'true' })),
      h('div', { class: 'tx-body' },
        h('button', { class: 'tx-cond', 'aria-label': `Condition: ${ruleCond(r)}. Change it`, onclick: () => { click(); openPicker({ kind: 'cond', i }); } }, ruleCond(r)),
        h('button', { class: 'tx-act', 'aria-label': `Action: ${a.name}. Change it`, onclick: () => { click(); openPicker({ kind: 'act', i }); } },
          h('span', { class: 'arrow', text: '→' }), ico(a.icon), h('span', { class: 'nm', text: a.name }), h('span', { class: 'cost', text: a.note })),
        h('div', { class: 'tx-hint' + (x.warn ? ' warn' : ''), text: r.on ? x.text : 'Switched off: skipped in battle' })),
      h('div', { class: 'tx-side' },
        h('button', { class: 'tx-sw' + (r.on ? ' on' : ''), role: 'switch', 'aria-checked': r.on ? 'true' : 'false', 'aria-label': `Rule ${i + 1} on`, onclick: () => { click(); Tactics.toggle(o, i); render(); } }, r.on ? 'On' : 'Off'),
        h('button', { class: 'tx-del', 'aria-label': `Remove rule ${i + 1}`, onclick: () => { click(); Tactics.remove(o, i); render(); } }, '×')));
  }

  function card() {
    const o = ui.owner, d = Tactics.owner(o), party = o === 'party';
    const rows = d.rules.map((r, i) => ruleRow(o, r, i));
    for (let i = d.rules.length; i < d.slots; i++) {
      rows.push(h('li', { class: 'tx-slot' }, h('button', { class: 'tx-add', onclick: () => { click(); openPicker({ kind: 'cond', i: -1 }); } },
        h('b', { text: String(i + 1) }), h('span', { text: '+ Add a rule' }))));
    }
    for (let i = d.slots; i < d.max; i++) {
      const next = i === d.slots;
      rows.push(h('li', { class: 'tx-slot locked' },
        h('span', { class: 'tx-lock' }, ico('lock')),
        h('div', { class: 'tx-lk' }, h('b', { text: 'Locked slot' }),
          h('span', { text: party ? 'The Tactician adds more party rule slots' : next ? 'A Masters’ Hall lesson teaches it' : 'Learn the one above first' })),
        next && App.actions.building ? h('button', { class: 'small tx-unlock', onclick: () => { click(); App.actions.building(party ? 'tactician' : 'mastershall'); } }, party ? 'Tactician' : 'Hall') : null));
    }
    const C = party ? null : CLASSES[clsOf(o)];
    const foot = party
      ? h('div', { class: 'tx-default' }, h('span', { class: 'k', text: 'When' }), h('span', { text: 'Item rules: between every two turns, taking no one’s turn. Focus fire: on each hero’s turn. Return to base: after each win on the road.' }))
      : h('div', { class: 'tx-default' }, h('span', { class: 'k', text: 'Otherwise' }), ico(SKILLS[C.basic].icon), h('b', { text: SKILLS[C.basic].name }), h('span', { text: 'basic attack' }));
    return h('section', { class: 'tx-card', 'aria-label': `${nameOf(o)} rules` },
      h('div', { class: 'tx-who' },
        portrait(o),
        h('div', {}, h('div', { class: 'nm', text: party ? 'Party rules' : nameOf(o) }), h('div', { class: 'k', text: party ? 'Team-wide: items, focus fire and coming home' : `${C.role} · Lv ${Tactics.charOf(o).level}` })),
        h('div', { class: 'tx-count' }, h('b', { text: `${d.rules.length}/${d.slots}` }), h('span', { text: `${d.slots} of ${d.max} slots open` }))),
      h('ol', { class: 'tx-rules' }, rows),
      foot,
      party ? loadoutCard() : null);
  }

  // The party's loadout: what it brings into each battle, one item per slot, each used once.
  function loadoutCard() {
    if (!Tactics.gate('items')) return h('div', { class: 'tx-load' }, h('h4', {}, 'Bring into battle'), h('p', { class: 'tx-note' }, ico('lock'), ' Party items open when you first clear 1-3, Gnawed Headstones.'));
    const L = Tactics.loadout(), cells = [];
    L.items.forEach((id, i) => {
      const it = id && ITEMS[id];
      cells.push(h('button', { class: 'tx-item' + (it ? '' : ' empty'), 'aria-label': it ? `Slot ${i + 1}: ${it.name}. Change it` : `Slot ${i + 1}: empty. Choose an item`, onclick: () => { click(); openPicker({ kind: 'item', i }); } },
        it ? ico(it.icon) : h('span', { class: 'plus', text: '+' }), h('b', { text: it ? it.name : 'Empty' })));
    });
    for (let i = L.slots; i < L.max; i++) {
      const next = i === L.slots;
      cells.push(h('div', { class: 'tx-item locked', title: 'The Tactician adds it' }, ico('lock'), h('b', { text: next ? 'Tactician' : 'Locked' })));
    }
    return h('div', { class: 'tx-load' },
      h('h4', {}, 'Bring into battle', h('span', { text: `${L.slots} of ${L.max} slots` })),
      h('div', { class: 'tx-items' }, cells),
      h('p', { class: 'tx-note', text: 'Each item is used once per battle. Tap it in battle to use it yourself, at any moment, or let an item rule above use it. Either way it takes no one’s turn. Each use draws one from the Bag. The Tactician adds a 3rd and a 4th slot.' }));
  }

  function sets() {
    if (!Tactics.gate('tactician')) return h('section', { class: 'tx-sets', 'aria-label': 'Saved rule sets' }, h('h3', { text: 'Rule sets' }), h('p', {}, ico('lock'), ' Saved rule sets come with Tactician I, when you first clear 1-11, the Mourning Path.'));
    const list = Tactics.sets();
    const input = h('input', { class: 'tx-name', type: 'text', maxlength: '24', placeholder: 'Name this set', 'aria-label': 'Name for the rule set', value: ui.draft, oninput: e => { ui.draft = e.target.value; } });
    const saveIt = () => {
      const name = input.value.trim();
      if (!name) { input.focus(); return; }
      const over = list.some(x => x.name.toLowerCase() === name.toLowerCase());
      if (Tactics.saveSet(name)) { ui.draft = ''; say(over ? `Updated “${name}”` : `Saved “${name}”`); render(); }
      else say('Rule sets are full. Delete one first.');
    };
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); click(); saveIt(); } });
    return h('section', { class: 'tx-sets', 'aria-label': 'Saved rule sets' },
      h('h3', { text: 'Rule sets' }),
      h('p', { text: 'Save every hero’s rules, the party rules and the loadout under one name, then switch between sets for different stages.' }),
      list.length ? h('ul', {}, list.map((x, i) => h('li', {},
        h('span', { class: 'nm', text: x.name }), h('span', { class: 'ct', text: `${x.count} rules` }),
        h('button', { class: 'small', onclick: () => { click(); Tactics.loadSet(i); say(`Loaded “${x.name}”`); render(); } }, 'Load'),
        h('button', { class: 'small tx-x', 'aria-label': `Delete ${x.name}`, onclick: () => { click(); Tactics.deleteSet(i); render(); } }, '×')))) : null,
      h('div', { class: 'tx-save' }, input, h('button', { class: 'small on', onclick: () => { click(); saveIt(); } }, 'Save')));
  }

  function screen() {
    return h('div', { class: 'page tx' },
      h('button', { class: 'btn back', onclick: () => { click(); close(); } }, '← Back'),
      h('div', { class: 'kicker', text: 'Tactics' }),
      h('h1', { text: 'Rules' }),
      h('p', { class: 'tx-lede', text: 'On each turn, a hero reads their rules from the top and uses the first one that is true and possible. If none is, they use their basic attack.' }),
      tabs(), card(), sets());
  }

  // ── reordering by drag: the row follows the finger and the others make room; the model changes on release.
  let drag = null;
  function dragStart(e, i) {
    if (e.button > 0) return;
    const row = e.currentTarget.closest('.tx-rule'), list = [...row.parentNode.querySelectorAll('.tx-rule')];
    if (list.length < 2) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const tops = list.map(el => el.getBoundingClientRect()), step = tops.length > 1 ? tops[1].top - tops[0].top : tops[0].height;
    drag = { i, to: i, y0: e.clientY, row, list, step, moved: false };
    const grip = e.currentTarget;
    const move = ev => {
      const dy = ev.clientY - drag.y0;
      if (Math.abs(dy) > 4) drag.moved = true;
      if (!drag.moved) return;
      row.classList.add('lift');
      row.style.transform = `translateY(${dy}px)`;
      drag.to = clamp(i + Math.round(dy / drag.step), 0, list.length - 1);
      list.forEach((el, k) => {
        if (k === i) return;
        const shift = k > i && k <= drag.to ? -1 : k < i && k >= drag.to ? 1 : 0;
        el.style.transform = shift ? `translateY(${shift * drag.step}px)` : '';
      });
    };
    const up = () => {
      grip.removeEventListener('pointermove', move);
      grip.removeEventListener('pointerup', up);
      grip.removeEventListener('pointercancel', up);
      const d = drag;
      drag = null;
      if (d.moved && d.to !== d.i) { click(); Tactics.move(ui.owner, d.i, d.to); }
      render();
    };
    grip.addEventListener('pointermove', move);
    grip.addEventListener('pointerup', up);
    grip.addEventListener('pointercancel', up);
  }
  function gripKey(e, i) {
    const d = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0;
    if (!d) return;
    e.preventDefault();
    if (Tactics.move(ui.owner, i, i + d)) {
      click();
      render();
      const g = document.querySelectorAll('.tx-rule .tx-grip')[i + d];
      if (g) g.focus();
    }
  }

  // ── the picker: a sheet to choose a condition, then (for a new rule) an action
  // pick: { kind: 'cond' | 'act', i: rule index or -1 for a new rule, cond: the condition chosen for a new rule }
  function openPicker(p) { ui.pick = p; renderPicker(); }
  function closePicker() { ui.pick = null; renderPicker(); }
  function renderPicker() {
    const old = document.getElementById('txPick');
    if (old) old.remove();
    if (!ui.pick) return;
    const sheet = ui.pick.kind === 'cond' ? condSheet() : ui.pick.kind === 'item' ? itemSheet() : actSheet();
    const el = h('div', { id: 'txPick', class: 'tx-pick', onclick: e => { if (e.target === el) { click(); closePicker(); } } }, sheet);
    el.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); closePicker(); } });
    $('#frame').append(el);
    // Start at the current choice, scrolled into view, so the player sees what the rule has now.
    const cur = el.querySelector('.tx-opt.cur');
    if (cur) { cur.scrollIntoView({ block: 'center' }); cur.focus({ preventScroll: true }); }
    else { const b = el.querySelector('.tx-ph .small'); if (b) b.focus({ preventScroll: true }); }
  }
  const sheetHead = (title, sub) => h('div', { class: 'tx-ph' },
    h('div', {}, h('div', { class: 'kicker', text: ui.pick.kind === 'item' ? `Loadout · slot ${ui.pick.i + 1}` : `${nameOf(ui.owner)} · ${ui.pick.i < 0 ? 'new rule' : 'rule ' + (ui.pick.i + 1)}` }), h('h2', { text: title }), sub ? h('p', { text: sub }) : null),
    h('button', { class: 'small', 'aria-label': 'Close', onclick: () => { click(); closePicker(); } }, '×'));

  function condSheet() {
    const o = ui.owner, p = ui.pick, cur = p.i >= 0 ? Tactics.owner(o).rules[p.i] : null;
    const curKey = cur && Tactics.condKey(cur);
    // A condition that doesn't suit the rule's action (focus fire needs a foe) isn't offered.
    const menu = Tactics.conditionMenu(o, cur ? cur.do : null);
    let locked = 0;
    const groups = menu.map(g => h('div', { class: 'tx-grp' }, h('h4', { text: g.name }), g.items.map(it => {
      if (!it.known) locked++;
      return h('button', { class: 'tx-opt' + (it.key === curKey ? ' cur' : ''), disabled: !it.known, title: it.tip,
        onclick: () => { click(); chooseCond(it.rule); } },
        it.known ? null : ico('lock'), h('span', { class: 'nm', text: it.label }),
        h('span', { class: 'sub', text: it.known ? it.tip : `Locked · learned from ${it.from}` }));
    })));
    return h('div', { class: 'box tx-sheet', role: 'dialog', 'aria-label': 'Choose a condition' },
      sheetHead('When…', p.i < 0 ? 'Step 1 of 2: when should this rule fire?' : null),
      groups,
      locked ? h('div', { class: 'tx-proto' }, h('span', { text: `${locked} locked. In the full game the Tactician and battle rewards teach these.` }),
        h('button', { class: 'textbtn', onclick: () => { click(); Tactics.learnAll(); render(); } }, ico('book'), 'Learn all (prototype)')) : null);
  }
  function chooseCond(cond) {
    const o = ui.owner, p = ui.pick;
    if (p.i >= 0) {
      if (!Tactics.replace(o, p.i, cond)) say('That condition doesn’t suit this action.');
      ui.pick = null;
      render();
    } else openPicker({ kind: 'act', i: -1, cond });
  }

  function actSheet() {
    const o = ui.owner, p = ui.pick, cur = p.i >= 0 ? Tactics.owner(o).rules[p.i] : null;
    const cond = p.i >= 0 ? cur : p.cond;
    const opts = Tactics.actions(o).map(id => {
      const A = o === 'party' && PARTY_ACTIONS[id];
      const lock = A && (A.kind === 'focus' && !Tactics.gate('tactician') ? 'Taught by Tactician I, at 1-11' : A.kind === 'item' && !Tactics.gate('items') ? 'Party items open at 1-3' : A.kind === 'home' && !Tactics.gate('keepgoing') ? 'Opens with Keep going, at 1-6' : null);
      const a = actionInfo(o, id), fitsIt = o !== 'party' || Tactics.conditionMenu(o, id).some(g => g.items.some(it => it.key === Tactics.condKey(cond))), ok = fitsIt && !lock;
      return h('button', { class: 'tx-opt act' + (cur && cur.do === id ? ' cur' : '') + (a.off ? ' off' : ''), disabled: !ok, onclick: () => { click(); chooseAct(id); } },
        lock ? ico('lock') : ico(a.icon), h('span', { class: 'nm', text: a.name }), h('span', { class: 'cost', text: a.note }),
        h('span', { class: 'sub', text: lock || (fitsIt ? a.tip : A && A.kind === 'home' ? 'Needs a between-battle condition' : A && A.kind !== 'home' && CONDITIONS[cond.if] && CONDITIONS[cond.if].between ? 'A between-battle condition only goes with Return to base' : 'Needs a condition that names a foe') }));
    });
    return h('div', { class: 'box tx-sheet', role: 'dialog', 'aria-label': 'Choose an action' },
      sheetHead('Then…', `${p.i < 0 ? 'Step 2 of 2. ' : ''}When “${ruleCond(cond)}”:`),
      h('div', { class: 'tx-grp' }, opts));
  }
  function chooseAct(id) {
    const o = ui.owner, p = ui.pick;
    const ok = p.i >= 0 ? Tactics.replace(o, p.i, { do: id }) : Tactics.add(o, Object.assign({}, p.cond, { do: id, on: true }));
    if (!ok) say('That rule can’t be made.');
    ui.pick = null;
    render();
  }

  function itemSheet() {
    const i = ui.pick.i, cur = Tactics.loadout().items[i];
    const pick = id => { click(); Tactics.setItem(i, id); ui.pick = null; render(); };
    return h('div', { class: 'box tx-sheet', role: 'dialog', 'aria-label': 'Choose an item' },
      sheetHead('Bring…', 'One use per battle, by your hand or an item rule.'),
      h('div', { class: 'tx-grp' },
        Object.keys(ITEMS).map(id => {
          const it = ITEMS[id], sk = SKILLS[it.skill];
          return h('button', { class: 'tx-opt act' + (cur === id ? ' cur' : ''), onclick: () => pick(id) },
            ico(it.icon), h('span', { class: 'nm', text: it.name }), h('span', { class: 'cost', text: SHAPES[sk.shape] }), h('span', { class: 'sub', text: it.tip }));
        }),
        cur ? h('button', { class: 'tx-opt', onclick: () => pick(null) }, h('span', { class: 'nm', text: 'Leave this slot empty' })) : null));
  }

  // Leaves without going anywhere: the app calls this when it moves to another screen.
  function dismiss() {
    closePicker();
    const s = $('#screen');
    if (s.querySelector('.tx')) { s.hidden = true; s.replaceChildren(); }
  }

  return { open, close, dismiss, get owner() { return ui.owner; }, set owner(o) { if (Tactics.ownerOk(o)) ui.owner = o; } };
})();

// ── opening the editor from the app shell (js/app.js)
// The character sheet's Tactics button opens it on that hero's tab. App.go('tactics', { owner: 'party' }) opens the
// party rules and loadout. Leaving goes back to the Party screen.
if (typeof App !== 'undefined') {
  App.screen('tactics', {
    enter: p => TacticsEditor.open(() => (typeof p.back === 'function' ? p.back() : App.go(p.back || 'party')), p.owner),
    leave: () => TacticsEditor.dismiss(),
  });
  App.actions.tactics = (id, back) => {
    if (!Tactics.gate('tactics')) { if (typeof toast === 'function') toast('The Tactics screen opens when you first clear 1-1.'); return; }
    App.go('tactics', { owner: id, back });
  };
}
