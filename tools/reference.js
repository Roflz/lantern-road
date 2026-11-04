'use strict';
// The reference party (campaign spec §5.6) and the Region I balance report.
// Every hero at the stage's recommended level, as many as the stage lists, with a Common weapon (and Common armour from
// level 3), their starter skill raised a level every 5 levels, stat points spread the way a sensible player might,
// their class's starter rules and, from 1-3, 2 Healing Draughts with the draught rule at 50%. Three recruit orders,
// led by the Sellsword, the Pilgrim and the Hexblade. Real players will be stronger: spent skill points, Fine gear,
// better rules.
// Used by tools/simtest.js (which loads the game's scripts first). Run on its own: node tools/simtest.js --ref [battles]

const REF = {
  ORDERS: [
    ['sellsword', 'pilgrim', 'warden', 'hexblade', 'crossbowman', 'lamplighter'],
    ['pilgrim', 'warden', 'sellsword', 'crossbowman', 'hexblade', 'lamplighter'],
    ['hexblade', 'warden', 'pilgrim', 'sellsword', 'lamplighter', 'crossbowman'],
  ],
  // Targets for the reference party at the recommended level (campaign spec §5.6, tune). win: [lowest, highest];
  // rounds: [shortest, longest] average.
  TARGET: {
    road: { win: [0.9, 1] }, threat: { win: [0.85, 1] }, elite: { win: [0.55, 0.75] }, boss: { win: [0.4, 0.55] },
  },
  ROUNDS: { light: [3, 7], standard: [7, 10], rich: [8, 11], elite: [13, 17], boss: [13, 17] },
  // Stages that bring a new threat: 85%+ instead of 90%+.
  THREAT: ['1-8', '1-10', '1-12', '1-14', '1-17'],
  // A wall's win chance should move about this much per level around the recommendation (the softened cliff).
  CLIFF: [0.15, 0.25],
};
REF.kindOf = st => (st.kind === 'elite' ? 'elite' : st.kind === 'boss' ? 'boss' : REF.THREAT.includes(st.id) ? 'threat' : 'road');

// One reference hero of a class at a level.
const refCache = new Map();
function refHero(cls, L, id) {
  const k = cls + ':' + L;
  if (!refCache.has(k)) {
    const C = CLASSES[cls], base = {};
    for (const s of STAT_KEYS) { const [a, b] = C.stats[s]; base[s] = s === 'spd' ? Math.round((a + b) * 5) / 10 : Math.round((a + b) / 2); }
    const c = Hero.create(cls, id, { base, level: L });
    // Stat points: the auto-build's spread (front: Power, Health, Defense; back: Power, Health, Mana).
    const plan = C.row === 'front' ? { pow: 4, hp: 4, def: 2 } : { pow: 5, hp: 3, mp: 2 }, cycle = [];
    for (const s in plan) for (let i = 0; i < plan[s]; i++) cycle.push(s);
    for (let i = 0, left = Hero.points(c).stat; left > 0 && i < 1000; i++) if (Hero.allocate(c, cycle[i % cycle.length], 1)) left--;
    // The starter skill gains a level for every skill point (one each 5 levels).
    c.skills[C.starter] = Math.min(SKILL_LV_MAX, 1 + Math.floor(L / 5));
    if (L >= 3) c.gear.armor = Items.make('brigandine', L);
    refCache.set(k, c);
  }
  return Object.assign({}, refCache.get(k), { id });
}
// The reference party for a stage: n heroes of a recruit order at level L, front classes in front.
function refParty(order, n, L) {
  const party = [null, null, null, null, null, null], front = [0, 1], back = [2, 3, 4, 5];
  order.slice(0, n).forEach((cls, i) => {
    const c = refHero(cls, L, 'c' + (i + 1));
    const slot = CLASSES[cls].row === 'front' && front.length ? front.shift() : back.length ? back.shift() : front.shift();
    party[slot] = Hero.spec(c, CLASSES[cls].rules);
  });
  return party;
}
// The battle setup: items from 1-3 on, as the first clears unlock them.
function refSetup(stage, seed, order, L, o = {}) {
  const items = stage.index >= 2;
  const tac = { party: refParty(order, o.party || stage.party, L), partyRules: items ? [{ if: 'ally_hp_lt', n: 50, do: 'draught' }] : [], loadout: items ? ['draught', 'draught'] : [] };
  return stageSetup(stage, seed, tac, { replay: !!o.replay });
}
// Win rate, rounds, turns per hero and knock-outs for one stage at one hero level, over every recruit order.
function refRun(stage, L, M, o = {}) {
  let w = 0, r = 0, n = 0, turns = 0, heroes = 0, ko = 0, first = 0, enr = 0;
  const each = [];
  REF.ORDERS.forEach((order, oi) => {
    let ow = 0;
    for (let i = 0; i < M; i++) {
      const res = simulate(refSetup(stage, strSeed(`ref:${stage.id}:${L}:${oi}:${i}`), order, L, o));
      if (o.check) o.check(res, stage);
      n++;
      if (res.winner === 0) { w++; ow++; }
      r += res.rounds;
      if (res.rounds >= SIM.ENRAGE_ROUND) enr++;
      for (const u of res.start) if (u.side === 0 && !u.thrall) { turns += res.stats[u.id].turns; heroes++; ko += res.stats[u.id].falls; if (u.key === order[0]) first += res.stats[u.id].turns; }
    }
    each.push(ow / M);
  });
  return { win: w / n, rounds: r / n, turns: turns / heroes, ko: ko / n, first: first / n, enraged: enr / n, each };
}
// The report: every stage at one level under, at, and over its recommendation, against its target; the first hour's
// fatigue; and how far one level moves each wall.
function referenceReport(M, o = {}) {
  const pad = (s, n) => String(s).padEnd(n), lpad = (s, n) => String(s).padStart(n), pct = x => Math.round(100 * x) + '%';
  const out = { rows: [], misses: [] };
  console.log(`\nThe reference party, Region I (campaign spec §5.6): ${M} battles per recruit order, ${REF.ORDERS.length} orders`);
  console.log('   ' + pad('stage', 30) + pad('lv', 4) + pad('n', 3) + pad('target', 10) + lpad('−2', 6) + lpad('−1', 6) + lpad('rec', 6) + lpad('+1', 6) + lpad('+2', 6) + lpad('rounds', 9) + pad('  (target)', 12) + lpad('fatigue', 8) + lpad('KO', 6) + '  by order');
  for (const st of STAGES) {
    const kind = REF.kindOf(st), T = REF.TARGET[kind], RT = REF.ROUNDS[st.tier];
    const lv = [-2, -1, 0, 1, 2].map(d => (st.level + d >= 1 ? refRun(st, st.level + d, d === 0 ? M : Math.ceil(M / 2), o) : null));
    const rec = lv[2];
    const okWin = rec.win >= T.win[0] - 1e-9 && rec.win <= T.win[1] + 1e-9, okR = rec.rounds >= RT[0] - 0.5 && rec.rounds <= RT[1] + 0.5;
    const wall = kind === 'elite' || kind === 'boss';
    const step = wall ? [lv[1] ? rec.win - lv[1].win : null, lv[3].win - rec.win] : null;
    const okCliff = !wall || step.every(x => x == null || (x >= REF.CLIFF[0] - 0.05 && x <= REF.CLIFF[1] + 0.05));
    const row = { id: st.id, kind, win: rec.win, rounds: rec.rounds, turns: rec.turns, first: rec.first, lv: lv.map(x => x && x.win), okWin, okR, okCliff, step };
    out.rows.push(row);
    if (!okWin) out.misses.push(`${st.id} win ${pct(rec.win)} (target ${pct(T.win[0])}${T.win[1] < 1 ? '–' + pct(T.win[1]) : '+'})`);
    if (!okR) out.misses.push(`${st.id} rounds ${rec.rounds.toFixed(1)} (target ${RT[0]}–${RT[1]})`);
    if (!okCliff) out.misses.push(`${st.id} one level moves the win chance ${step.map(x => (x == null ? '–' : pct(x))).join(' / ')} (target ${pct(REF.CLIFF[0])}–${pct(REF.CLIFF[1])})`);
    console.log('   ' + pad(`${st.id} ${st.name}`, 30) + pad(st.level, 4) + pad(st.party, 3) + pad(T.win[1] < 1 ? `${pct(T.win[0])}–${pct(T.win[1])}` : pct(T.win[0]) + '+', 10)
      + lv.map(x => lpad(x ? pct(x.win) : '–', 6)).join('') + lpad(rec.rounds.toFixed(1), 9) + pad(`  (${RT[0]}–${RT[1]})`, 12) + lpad(rec.turns.toFixed(1), 8) + lpad(rec.ko.toFixed(2), 6)
      + '  ' + rec.each.map(pct).join(' ') + (okWin && okR && okCliff ? '' : '  ←'));
  }
  // The first hour's fatigue: the starting hero fights every stage once, in order, at its recommended level.
  let f = 0, weary = null, tired = null;
  for (const row of out.rows) { f += row.first; if (weary == null && f >= FATIGUE.WEARY) weary = row.id; if (tired == null && f >= FATIGUE.EXHAUSTED) tired = row.id; }
  out.weary = weary; out.tired = tired;
  console.log(`   The starting hero, fighting every stage once in order: Weary (50) after ${weary || 'never'}, 75 after ${tired || 'never'} (target: about 1-8, and 1-10 or 1-11).`);
  console.log(`   Fatigue per hero is turns taken. Walls: one level under / over moves the win chance ${out.rows.filter(r => r.step).map(r => `${r.id} ${r.step.map(x => (x == null ? '–' : '+' + pct(x))).join(' / ')}`).join(', ')}.`);
  if (out.misses.length) console.log('   Off target: ' + out.misses.join('; '));
  else console.log('   Every stage is on target.');
  return out;
}
if (typeof module !== 'undefined') module.exports = { REF, refHero, refParty, refSetup, refRun, referenceReport };
