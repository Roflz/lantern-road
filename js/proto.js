'use strict';
// Lantern Road · the prototype tools, in one panel (build step 7b). They skip the grind so the user can review later
// content quickly. They are not part of the game: Settings → Prototype tools opens them, and the "Show prototype tools"
// toggle there also shows or hides the buttons in place (the camp's chip, Train on the hero sheet, Roll gear in the Bag
// and on the Gear tab, Rest all on the stage sheet, Learn all on Tactics). Each of those carries the class
// `proto-only`; <body> gets `no-proto` when the toggle is off (App.applySettings).
//
// To remove the tools before release: delete this file and its <script> tag, the elements with `proto-only`, and
// Base.proto, Campaign.restAll and Tactics.learnAll.

const Proto = (() => {
  const click = () => sfx('click');
  const st = () => Save.state;
  const ROMAN = ['I', 'II', 'III', 'IV', 'V'];

  // ── the road: light every stage before a region, as if each had been cleared for the first time, in order. Its
  // first-clear unlocks and Renown come with it; the party's levels don't (Train does that).
  function light(stage, s = st()) {
    if (Campaign.isLit(stage.id, s)) return false;
    s.campaign.cleared.push(stage.id);
    for (const id of stage.first) Campaign.unlock(id, s);
    if (typeof Base !== 'undefined') Base.afterBattle({ log: [] }, stage, { won: true, first: true }, s);
    return true;
  }
  function lightTo(r, s = st()) {
    let n = 0;
    for (const stage of STAGES) if (stage.region < r && light(stage, s)) n++;
    // Regions before r count as reached even where their stages aren't built yet.
    for (let k = 1; k < r; k++) Campaign.unlock('region:' + k, s);
    if (n) Campaign.unlock('cond:ally_fallen', s); // a road that long has seen a hero fall
    return n;
  }
  function lightNext(s = st()) {
    const i = Campaign.frontier(s);
    return STAGES[i] ? light(STAGES[i], s) : false;
  }

  // ── the party
  function train(n, s = st()) {
    for (const c of s.roster) { const to = Math.min(HERO.CAP, c.level + n); if (to > c.level) Hero.gainXp(c, Hero.xpBetween(c.level, to)); }
  }
  const roadLevel = (s = st()) => (STAGES[Campaign.frontier(s)] || STAGES[STAGES.length - 1]).level;
  function trainTo(L, s = st()) { for (const c of s.roster) if (c.level < L) Hero.gainXp(c, Hero.xpBetween(c.level, Math.min(HERO.CAP, L))); }
  function spendPoints(s = st()) { for (const c of s.roster) Hero.autoBuild(c); }
  function restAll(s = st()) {
    for (const c of s.roster) { c.fatigue = 0; c.spent = false; }
    if (s.base) s.base.beds = s.base.beds.map(() => null);
  }
  // Free recruits until six stand in the formation, at the party's level, of classes the board offers.
  function fill(s = st()) {
    const classes = typeof Base !== 'undefined' ? Base.boardClasses(s) : CLASS_ORDER.slice(0, 6);
    const lv = Math.max(1, ...s.roster.map(c => c.level)), names = new Set(s.roster.map(c => c.name));
    let n = 0;
    while (s.party.filter(Boolean).length < 6 && (typeof Base === 'undefined' || s.roster.length < Base.rosterCap(s))) {
      const have = new Set(s.roster.map(c => c.cls)), pool = classes.filter(k => !have.has(k));
      const cls = (pool.length ? pool : classes)[Math.floor(Math.random() * (pool.length || classes.length))];
      let name = RECRUIT_NAMES[Math.floor(Math.random() * RECRUIT_NAMES.length)];
      for (let k = 0; names.has(name) && k < 30; k++) name = RECRUIT_NAMES[Math.floor(Math.random() * RECRUIT_NAMES.length)];
      names.add(name);
      const c = Hero.autoBuild(Hero.create(cls, 'c' + s.nextId++, { name, level: lv }));
      s.roster.push(c);
      if (typeof Base !== 'undefined') Base.place(c, s); else s.party[s.party.indexOf(null)] = c.id;
      Tactics.owner(c.id);
      n++;
    }
    return n;
  }

  // ── the panel
  let open = false;
  function act(label, fn, sub, cls = '') {
    return h('button', { class: 'btn pt-act ' + cls, onclick: () => {
      click();
      const s = st(), msg = fn(s);
      if (typeof Base !== 'undefined') { Base.ensure(s); Base.tick(s); }
      Save.commit();
      App.refresh();
      if (msg) toast(msg);
      show(true);
    } }, label, sub ? h('span', { class: 'sub', text: sub }) : null);
  }
  const sect = (title, ...kids) => h('section', { class: 'pt-sec' }, h('h3', { class: 'sect', text: title }), ...kids);
  function show(again) {
    const s = st(), fr = Campaign.frontier(s), at = STAGES[fr], R = at ? REGIONS[at.region] : null, lit = s.campaign.cleared.length;
    const on = s.settings.proto !== false;
    const box = h('div', { class: 'box protobox' + (again ? ' quiet' : '') },
      h('button', { class: 'sheet-x', 'aria-label': 'Close', onclick: () => { click(); closeSheet(); open = false; } }, '×'),
      h('div', { class: 'kicker' }, h('span', { class: 'ph-tag', text: 'Prototype' }), ' For play-testing'),
      h('h2', { text: 'Prototype tools' }),
      h('p', { class: 'flavor', text: 'They skip the grind so you can try later content quickly. They are not part of the game, and they come out before release.' }),
      h('div', { class: 'setting' }, h('div', { class: 'nm', text: 'Show prototype tools' }),
        h('div', { class: 'ds', text: 'Also shows the buttons where they’re used: the camp’s chip, Train on the hero sheet, Roll gear in the Bag, Rest all on the stage sheet and Learn all on Tactics.' }),
        h('button', { class: 'small' + (on ? ' on' : ''), role: 'switch', 'aria-checked': on ? 'true' : 'false', 'aria-label': 'Show prototype tools', onclick: () => { click(); s.settings.proto = !on; App.applySettings(true); Save.commit(); App.refresh(); show(true); } }, on ? 'On' : 'Off')),
      sect('The road',
        h('p', { class: 'pt-now', text: at ? `${lit} of ${STAGES.length} stages lit · next: ${at.id} ${at.name}, ${R.name}` : `All ${STAGES.length} built stages lit` }),
        h('div', { class: 'pt-grid' },
          act('Light the next stage', s2 => (lightNext(s2) ? `${at.id} is lit` : 'Every built stage is lit'), at ? `${at.id} · ${at.name}` : 'Nothing left to light'),
          ...[1, 2, 3, 4].map(r => act(`Light to Region ${ROMAN[r]}`, s2 => { const n = lightTo(r, s2); return n ? `${n} stages lit, up to Region ${ROMAN[r]}` : `Region ${ROMAN[r]} is reached`; },
            STAGES.some(x => x.region === r) ? `Stand at ${REGIONS[r].name}` : `${REGIONS[r].name}: not built yet`))),
        h('p', { class: 'hs-why', text: 'Each stage lit brings its first-clear unlocks and Renown, as if you had cleared it. Levels don’t come with it: train the party below.' })),
      sect('Gold and materials',
        h('div', { class: 'pt-grid' },
          act('+1,000 gold', s2 => { s2.currencies.gold += 1000; return '+1,000 gold'; }),
          act('+10,000 gold', s2 => { s2.currencies.gold += 10000; return '+10,000 gold'; }),
          act('+50 materials', s2 => { for (const m of MATERIALS) s2.currencies.mats[m.id] = (s2.currencies.mats[m.id] || 0) + 50; return '+50 of every material'; }, 'Of every kind'),
          act('+500 materials', s2 => { for (const m of MATERIALS) s2.currencies.mats[m.id] = (s2.currencies.mats[m.id] || 0) + 500; return '+500 of every material'; }, 'Of every kind'))),
      sect('The party',
        h('div', { class: 'pt-grid' },
          act('Train +1 level', s2 => { train(1, s2); return 'Everyone gained a level'; }, 'Everyone on the roster'),
          act('Train +5 levels', s2 => { train(5, s2); return 'Everyone gained 5 levels'; }, 'Everyone on the roster'),
          act('Train +25 levels', s2 => { train(25, s2); return 'Everyone gained 25 levels'; }, 'Everyone on the roster'),
          act(`To the road’s level`, s2 => { const L = roadLevel(s2); trainTo(L, s2); return `Everyone is level ${L} or more`; }, `Lv ${roadLevel(s)}, for ${at ? at.id : 'the last stage'}`),
          act('Spend every point', s2 => { spendPoints(s2); return 'Points spent and thresholds chosen'; }, 'Stats, skills and thresholds, as a sensible player might'),
          act('Rest everyone', s2 => { restAll(s2); return 'Everyone is rested'; }, 'Fatigue to 0, nobody Spent'),
          act('Fill the party', s2 => { const n = fill(s2); return n ? `${n} free recruit${n > 1 ? 's' : ''} joined` : 'The party is full (or the roster is)'; }, 'Free recruits until 6 set out'))),
      typeof Base !== 'undefined' ? sect('The camp',
        h('div', { class: 'pt-grid' },
          act('All blueprints', s2 => { Base.proto.blueprints(s2); return 'Every blueprint, and every region reached'; }, 'And every region reached'),
          act('+1 Renown', s2 => { Base.proto.renown(s2); return 'Renown up'; }, 'Clears plots sooner'),
          act('Skip 1 hour', s2 => { Base.proto.skip(1, s2); return 'An hour passed'; }, 'Idle buildings, rest, lessons'),
          act('Skip 8 hours', s2 => { Base.proto.skip(8, s2); return 'Eight hours passed'; }, 'Then see what came in')),
        h('button', { class: 'btn pt-act', onclick: () => { click(); closeSheet(); open = false; App.go('home'); App.showAway(Base.lastReport() ? Math.max(Base.lastReport().ms, 60000) : 3600000); } }, 'Show “While you were away”', h('span', { class: 'sub', text: 'The sheet you see after time away' }))) : null,
      sect('Gear', GearUI.prototypeBox(() => show(true))),
      sect('Rules and tips',
        h('div', { class: 'pt-grid' },
          act('Learn every condition', () => { Tactics.learnAll(); return 'Every condition learned'; }),
          act('Show the tips again', s2 => { s2.campaign.tips = {}; return 'First-time tips will show again'; }, 'The first-time tips and the new-thing notes'))));
    const prev = again && $('#sheet .protobox');
    const y = prev ? prev.scrollTop : 0;
    openSheet(box, 'sheet-bottom');
    if (y) box.scrollTop = y;
    open = true;
  }

  return { show: () => show(false), lightTo, lightNext, train, trainTo, spendPoints, restAll, fill, roadLevel, get open() { return open; } };
})();
App.actions.proto = () => Proto.show();
