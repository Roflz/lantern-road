'use strict';
// Lantern Road · Tactics: the rules model and the rules editor.
//
// Tactics is the model: each hero's rules and rule slots, the party rules, which conditions the player knows, and
// the saved rule sets. It touches no page, so tools/simtest.js tests it in Node. Every change goes through it.
// TacticsEditor is the view: it draws the editor screen from the model and turns taps into model calls. Its look
// lives in css/rules.css. The final design will come from the screen mockups; only the view and the stylesheet
// should need to change for it.
//
// Rules are { if, n?, s?, do, on } (see CONDITIONS and PARTY_ACTIONS in js/data.js). An "owner" is a hero's key
// (a class key while the party is fixed) or 'party' for the party rules.

const Tactics = (() => {
  const KEY = 'lantern-road-tactics-v1';
  const MAX_SETS = 8;
  const clone = x => JSON.parse(JSON.stringify(x));
  const listeners = [];
  let S = null; // { v, heroes: { key: { slots, rules } }, party: { slots, rules }, known: [unlock keys], sets: [{ name, heroes, party }] }

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
  const ownerOk = o => isParty(o) || PARTY.includes(o);
  const slotRange = o => (isParty(o) ? PARTY_RULES.slots : CLASSES[o].slots);
  const book = o => (isParty(o) ? S.party : S.heroes[o]);
  // The actions an owner's rules can take: a hero's basic attack and skills, or the party actions.
  const actions = o => (isParty(o) ? Object.keys(PARTY_ACTIONS) : [CLASSES[o].basic, ...CLASSES[o].skills]);
  const norm = r => {
    const o = { if: r.if, do: r.do, on: r.on !== false };
    if (r.n != null) o.n = r.n;
    if (r.s != null) o.s = r.s;
    return o;
  };
  // Can this condition go with this action at all? Focus fire needs a condition that names a foe.
  function fits(o, r) {
    const C = CONDITIONS[r.if];
    if (!C) return false;
    if (isParty(o)) { const A = PARTY_ACTIONS[r.do]; return !!A && (!A.who || C.who === A.who); }
    return true;
  }
  const valid = (o, r) => !!r && !!CONDITIONS[r.if] && actions(o).includes(r.do) && fits(o, r);

  // ── state
  // A new player's state. The prototype's fixed party arrives with its step-1 rules, so it knows the conditions
  // those use and already has the slots they fill.
  function fresh() {
    const known = new Set(startingKeys());
    const heroes = {};
    for (const k of PARTY) {
      const C = CLASSES[k];
      heroes[k] = { slots: clamp(C.rules.length, C.slots[0], C.slots[1]), rules: C.rules.map(norm) };
      C.rules.forEach(r => known.add(condKey(r)));
    }
    const party = { slots: clamp(PARTY_RULES.rules.length, PARTY_RULES.slots[0], PARTY_RULES.slots[1]), rules: PARTY_RULES.rules.map(norm) };
    party.rules.forEach(r => known.add(condKey(r)));
    return { v: 1, heroes, party, known: [...known], sets: [] };
  }
  // Takes saved data and keeps only what still makes sense: unknown conditions, skills and over-full lists are dropped.
  function sanitize(data) {
    const base = fresh();
    if (!data || typeof data !== 'object') return base;
    const known = new Set(base.known);
    if (Array.isArray(data.known)) data.known.forEach(k => typeof k === 'string' && known.add(k));
    const fix = (o, b, def) => {
      const [lo, hi] = slotRange(o);
      const slots = b && Number.isInteger(b.slots) ? clamp(b.slots, lo, hi) : def.slots;
      const rules = b && Array.isArray(b.rules) ? b.rules.filter(r => valid(o, r)).map(norm).slice(0, slots) : def.rules;
      return { slots, rules };
    };
    const heroes = {};
    for (const k of PARTY) heroes[k] = fix(k, data.heroes && data.heroes[k], base.heroes[k]);
    const sets = Array.isArray(data.sets) ? data.sets.filter(x => x && typeof x.name === 'string').slice(0, MAX_SETS).map(x => ({
      name: x.name.slice(0, 24),
      heroes: Object.fromEntries(PARTY.map(k => [k, ((x.heroes && x.heroes[k]) || []).filter(r => valid(k, r)).map(norm)])),
      party: (x.party || []).filter(r => valid('party', r)).map(norm),
    })) : [];
    return { v: 1, heroes, party: fix('party', data.party, base.party), known: [...known], sets };
  }
  function persist() {
    try { if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { }
  }
  function changed() { persist(); listeners.forEach(fn => { try { fn(); } catch (e) { } }); return true; }
  function init() {
    let data = null;
    try { if (typeof localStorage !== 'undefined') data = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { }
    S = sanitize(data);
  }

  // ── editing one owner's list. Each returns true when it changed something.
  function add(o, rule) {
    const b = book(o);
    if (b.rules.length >= b.slots || !valid(o, rule) || !isKnown(rule)) return false;
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
  // The price of the next rule slot, in level-up points; null when the owner has them all. Party slots come from the
  // Tactician instead, so they have no point price.
  function slotCost(o) {
    const b = book(o), [lo, hi] = slotRange(o);
    if (b.slots >= hi) return null;
    return isParty(o) ? 0 : RULE_SLOT_COST[Math.min(b.slots - lo, RULE_SLOT_COST.length - 1)];
  }
  // Prototype: slots are free until level-up points arrive (build step 3).
  function unlockSlot(o) {
    const b = book(o);
    if (slotCost(o) == null) return false;
    b.slots++;
    return changed();
  }
  // Prototype: conditions are free until the Tactician and battle rewards teach them.
  function learn(key) {
    if (S.known.includes(key)) return false;
    S.known.push(key);
    return changed();
  }
  function learnAll() {
    let any = false;
    for (const id in CONDITIONS) for (const v of variants(id)) if (!S.known.includes(condKey(v))) { S.known.push(condKey(v)); any = true; }
    return any ? changed() : false;
  }

  // ── saved rule sets: the whole party's rules under a name
  function saveSet(name) {
    name = String(name || '').trim().slice(0, 24);
    if (!name) return false;
    const set = { name, heroes: Object.fromEntries(PARTY.map(k => [k, clone(S.heroes[k].rules)])), party: clone(S.party.rules) };
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
    for (const k of PARTY) S.heroes[k].rules = (set.heroes[k] || []).filter(r => valid(k, r)).map(norm).slice(0, S.heroes[k].slots);
    S.party.rules = set.party.filter(r => valid('party', r)).map(norm).slice(0, S.party.slots);
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
    return { rules: clone(b.rules), slots: b.slots, start, max, cost: slotCost(o) };
  }
  // The conditions the picker offers for an owner's action, grouped, with whether each is known.
  const GROUPS = [['self', 'Self'], ['ally', 'Allies'], ['foe', 'Foes'], ['battle', 'The battle']];
  function conditionMenu(o, action) {
    return GROUPS.map(([g, name]) => ({
      group: g, name,
      items: Object.values(CONDITIONS).filter(C => C.group === g && (action == null || fits(o, { if: C.id, do: action })))
        .flatMap(C => variants(C.id).map(v => ({ rule: v, key: condKey(v), label: ruleCond(v), known: isKnown(v), from: C.from || 'the Tactician', tip: C.tip || '' }))),
    })).filter(g => g.items.length);
  }
  // A line about what a rule will do: whether its condition picks the target, or why it can never fire.
  function explain(o, r) {
    const C = CONDITIONS[r.if];
    if (!C) return { text: 'Unknown condition', warn: true };
    if (isParty(o)) {
      const A = PARTY_ACTIONS[r.do];
      if (A.kind === 'focus') return { text: 'Heroes attack this foe when their own rule picks no target' };
      const sk = SKILLS[ITEMS[A.item].skill];
      if (sk.shape === 'ally' && C.who === 'fallen') return { text: 'Never fires: a draught can’t reach a fallen ally', warn: true };
      return { text: sk.shape === 'ally' && (C.who === 'ally' || C.who === 'self') ? 'Used on that ally, on any hero’s turn' : 'Used on the most hurt ally, on any hero’s turn' };
    }
    const sk = SKILLS[r.do];
    const side = sk.shape === 'foe' ? 'foe' : sk.shape === 'ally' ? 'ally' : null;
    if (sk.revive && (C.who === 'ally' || C.who === 'self')) return { text: `Never fires: ${sk.name} only reaches fallen allies`, warn: true };
    if (sk.shape === 'ally' && !sk.revive && C.who === 'fallen') return { text: `Never fires: ${sk.name} can’t reach a fallen ally`, warn: true };
    const picks = side && C.who && (side === 'foe' ? C.who === 'foe' : C.who !== 'foe');
    if (picks) return { text: side === 'foe' ? 'Aims at that foe' : C.who === 'self' ? 'Aims at self' : 'Aims at that ally' };
    if (side) return { text: `Only a check: aims at ${side === 'foe' ? 'the nearest foe' : sk.revive ? 'the first fallen ally' : 'the most hurt ally'}` };
    return { text: 'Only a check' };
  }
  // The rules for a battle, in the form stageSetup takes.
  function setup() {
    const items = {};
    for (const k in ITEMS) items[k] = ITEMS[k].carry;
    return { party: PARTY.map(k => ({ key: k, rules: clone(S.heroes[k].rules) })), partyRules: clone(S.party.rules), items };
  }

  init();
  return {
    // reading
    owner, actions, conditionMenu, explain, isKnown, condKey, variants, setup, ownerOk,
    get sets() { return S.sets.map(x => ({ name: x.name, count: PARTY.reduce((n, k) => n + x.heroes[k].length, x.party.length) })); },
    get knownCount() { return S.known.length; },
    // editing
    add, replace, toggle, remove, move, unlockSlot, slotCost, learn, learnAll, saveSet, loadSet, deleteSet,
    // saving: the app's save system can take over with dump() and load(); onChange tells it something changed.
    dump: () => clone(S),
    load: data => { S = sanitize(data); changed(); },
    reset: () => { S = fresh(); changed(); },
    onChange: fn => listeners.push(fn),
  };
})();

// Battles take the rules from here.
stageSetup.tactics = () => Tactics.setup();

// The draught's icon, in the same pixel style as the rest (js/art.js draws it).
if (typeof UI_ICONS !== 'undefined' && !UI_ICONS.flask) {
  UI_ICONS.flask = { map: ['..kkk..', '...g...', '..ggg..', '.grrrg.', 'grrwrrg', 'grrrrrg', '.ggggg.'], pal: { k: '#8a5a3a', g: '#b4a8b6', r: '#d4484a', w: '#ffc8b8' } };
}

// ── the editor screen
const TacticsEditor = (() => {
  const SHAPES = { foe: 'One foe', front: 'The front row', back: 'The back row', random3: '3 random foes', foes: 'All foes', ally: 'One ally', allies: 'All allies', self: 'Self' };
  const ui = { owner: PARTY[0], back: null, pick: null, draft: '' };
  const click = () => { if (typeof sfx === 'function') sfx('click'); };
  const say = text => { if (typeof toast === 'function') toast(text); };
  const nameOf = o => (o === 'party' ? 'Party' : CLASSES[o].name);

  function open(back) {
    ui.back = back || null;
    ui.pick = null;
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
    if (o === 'party') { const A = PARTY_ACTIONS[id]; return { name: A.name, icon: A.icon, note: A.kind === 'item' ? `${ITEMS[A.item].carry} per battle` : 'Targeting', tip: A.tip }; }
    const sk = SKILLS[id], basic = id === CLASSES[o].basic;
    return { name: sk.name, icon: sk.icon, note: basic ? 'Basic · no mana' : `${sk.cost || 0} mana`, tip: [SHAPES[sk.shape], sk.tip].filter(Boolean).join('. ') };
  };
  const portrait = o => (o === 'party' ? h('span', { class: 'tx-pp' }, ico('lantern')) : h('img', { src: portraitURL(o, true), alt: '' }));

  function tabs() {
    return h('div', { class: 'tx-tabs', role: 'tablist', 'aria-label': 'Whose rules' }, [...PARTY, 'party'].map(o => {
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
          h('span', { text: party ? 'More party slots come from the Tactician' : next ? `Costs ${d.cost} level-up point${d.cost === 1 ? '' : 's'}` : 'Unlock the one above first' })),
        next ? h('button', { class: 'small tx-unlock', onclick: () => { click(); Tactics.unlockSlot(o); render(); } }, 'Unlock') : null));
    }
    const C = party ? null : CLASSES[o];
    const foot = party
      ? h('div', { class: 'tx-default' }, h('span', { class: 'k', text: 'Checked first' }), h('span', { text: 'At the start of every hero’s turn, before their own rules.' }))
      : h('div', { class: 'tx-default' }, h('span', { class: 'k', text: 'Otherwise' }), ico(SKILLS[C.basic].icon), h('b', { text: SKILLS[C.basic].name }), h('span', { text: 'basic attack' }));
    return h('section', { class: 'tx-card', 'aria-label': `${nameOf(o)} rules` },
      h('div', { class: 'tx-who' },
        portrait(o),
        h('div', {}, h('div', { class: 'nm', text: party ? 'Party rules' : C.name }), h('div', { class: 'k', text: party ? 'Team-wide: draughts and focus fire' : C.role })),
        h('div', { class: 'tx-count' }, h('b', { text: `${d.rules.length}/${d.slots}` }), h('span', { text: `${d.slots} of ${d.max} slots open` }))),
      h('ol', { class: 'tx-rules' }, rows),
      foot,
      party ? h('p', { class: 'tx-note' }, ico('flask'), `The party carries ${ITEMS.draught.carry} Healing Draughts into each battle.`) : null);
  }

  function sets() {
    const list = Tactics.sets;
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
      h('p', { text: 'Save every hero’s rules and the party rules under one name, then switch between sets for different stages.' }),
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
    const el = h('div', { id: 'txPick', class: 'tx-pick', onclick: e => { if (e.target === el) { click(); closePicker(); } } }, ui.pick.kind === 'cond' ? condSheet() : actSheet());
    el.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); closePicker(); } });
    $('#frame').append(el);
    // Start at the current choice, scrolled into view, so the player sees what the rule has now.
    const cur = el.querySelector('.tx-opt.cur');
    if (cur) { cur.scrollIntoView({ block: 'center' }); cur.focus({ preventScroll: true }); }
    else { const b = el.querySelector('.tx-ph .small'); if (b) b.focus({ preventScroll: true }); }
  }
  const sheetHead = (title, sub) => h('div', { class: 'tx-ph' },
    h('div', {}, h('div', { class: 'kicker', text: `${nameOf(ui.owner)} · ${ui.pick.i < 0 ? 'new rule' : 'rule ' + (ui.pick.i + 1)}` }), h('h2', { text: title }), sub ? h('p', { text: sub }) : null),
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
      const a = actionInfo(o, id), ok = o !== 'party' || Tactics.conditionMenu(o, id).some(g => g.items.some(it => it.key === Tactics.condKey(cond)));
      return h('button', { class: 'tx-opt act' + (cur && cur.do === id ? ' cur' : ''), disabled: !ok, onclick: () => { click(); chooseAct(id); } },
        ico(a.icon), h('span', { class: 'nm', text: a.name }), h('span', { class: 'cost', text: a.note }),
        h('span', { class: 'sub', text: ok ? a.tip : 'Needs a condition that names a foe' }));
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

  return { open, close, get owner() { return ui.owner; }, set owner(o) { if (Tactics.ownerOk(o)) ui.owner = o; } };
})();
