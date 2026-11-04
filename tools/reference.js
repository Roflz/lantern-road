'use strict';
// The reference party (campaign spec §5.6) and the balance report for every region.
// Region I: every hero at the stage's recommended level, as many as the stage lists, with a Common weapon (and Common
// armour from level 3), their starter skill raised a level every 5 levels, stat points spread the way a sensible player
// might, their class's starter rules and, from 1-3, 2 Healing Draughts with the draught rule at 50%.
// From Region II (level 11 on) the reference hero is what a sensible player brings there (campaign spec §3.1 asked for
// this re-check once the heroes' full power curve was built): skill points spent (the starter skill first, then the
// class's second active from level 50, then passives along the tree), tiers opened at each threshold, a Fine weapon
// and Fine armour (Rare pieces are sidegrades with drawbacks, so a fixed Fine kit keeps one level the only difference
// between two runs), the second skill slot from level 50 with a rule for it, and a Move rule, so a lured hero walks
// back. Real players will still be stronger: Masters' Hall lessons, combined classes, accessories, better rules.
// Three recruit orders, led by the Sellsword, the Pilgrim and the Hexblade.
// Used by tools/simtest.js (which loads the game's scripts first). Run it on its own:
//   node tools/simtest.js --ref [battles] [region numbers, e.g. 2 3]

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
  // Stages that bring a new threat: 85%+ instead of 90%+. Rich stages count too, and so does any stage marked threat.
  THREAT: ['1-8', '1-10', '1-12', '1-14', '1-17'],
  // A wall's win chance should move about this much per level around the recommendation (the softened cliff).
  CLIFF: [0.15, 0.25],
  // From Region II: the weapon and armour rarity the reference wears in each region (tune).
  RARITY: [null, 'fine', 'fine', 'fine', 'fine'],
  WEAPON: {
    fine: { sellsword: 'hirelingsabre', hexblade: 'hexedkris', pilgrim: 'chapelcenser', warden: 'watchmansflail', lamplighter: 'shutteredlantern', crossbowman: 'windlass' },
    rare: { sellsword: 'gravecutter', hexblade: 'witchironsickle', pilgrim: 'drownedcenser', warden: 'towershield', lamplighter: 'bonfirelantern', crossbowman: 'arbalest' },
  },
  ARMOUR: { fine: { warden: 'gravewardensplate', other: 'huntershauberk' }, rare: { warden: 'bastionplate', other: 'drownedmail' } },
  // Rules once the second skill slot opens at level 50: the class's second skill joins its starter.
  RULES50: {
    sellsword: [{ if: 'foes_at_least', n: 3, do: 'cleave' }, { if: 'foe_lowest', do: 'lunge' }, { if: 'foe_lowest', do: 'strike' }],
    hexblade: [{ if: 'foes_at_least', n: 3, do: 'hexswarm' }, { if: 'foe_without', s: 'doom', do: 'doom' }, { if: 'foe_lowest', do: 'hexbolt' }],
    pilgrim: [{ if: 'ally_fallen', do: 'rites' }, { if: 'ally_hp_lt', n: 50, do: 'mend' }, { if: 'foe_lowest', do: 'smite' }],
    warden: [{ if: 'ally_hp_lt', n: 50, do: 'guard' }, { if: 'foe_charging', do: 'bash' }, { if: 'front_foe', do: 'mace' }],
    lamplighter: [{ if: 'foe_charging', do: 'dazzle' }, { if: 'always', do: 'kindle' }],
    crossbowman: [{ if: 'foes_at_least', n: 3, do: 'volley' }, { if: 'foe_lowest', do: 'aimed' }],
  },
};
REF.kindOf = st => (st.kind === 'elite' ? 'elite' : st.kind === 'boss' ? 'boss' : st.threat || st.tier === 'rich' || REF.THREAT.includes(st.id) ? 'threat' : 'road');
REF.regionOf = L => (L <= 10 ? 0 : L <= 30 ? 1 : L <= 50 ? 2 : L <= 75 ? 3 : 4);

// One reference hero of a class at a level.
const refCache = new Map();
function refHero(cls, L, id) {
  const k = cls + ':' + L;
  if (!refCache.has(k)) refCache.set(k, L <= 10 ? refHeroI(cls, L) : refHeroLater(cls, L));
  return Object.assign({}, refCache.get(k), { id });
}
const refBase = cls => { const C = CLASSES[cls], base = {}; for (const s of STAT_KEYS) { const [a, b] = C.stats[s]; base[s] = s === 'spd' ? Math.round((a + b) * 5) / 10 : Math.round((a + b) / 2); } return base; };
function refStats(c) {
  // Stat points: the auto-build's spread (front: Power, Health, Defense; back: Power, Health, Mana).
  const C = CLASSES[c.cls], plan = C.row === 'front' ? { pow: 4, hp: 4, def: 2 } : { pow: 5, hp: 3, mp: 2 }, cycle = [];
  for (const s in plan) for (let i = 0; i < plan[s]; i++) cycle.push(s);
  for (let i = 0, left = Hero.points(c).stat; left > 0 && i < 4000; i++) if (Hero.allocate(c, cycle[i % cycle.length], 1)) left--;
}
// Region I, as step 6 built it.
function refHeroI(cls, L) {
  const C = CLASSES[cls], c = Hero.create(cls, 'ref', { base: refBase(cls), level: L });
  refStats(c);
  // The starter skill gains a level for every skill point (one each 5 levels).
  c.skills[C.starter] = Math.min(SKILL_LV_MAX, 1 + Math.floor(L / 5));
  if (L >= 3) c.gear.armor = Items.make('brigandine', L);
  return c;
}
// From Region II: a sensible player's hero at this level.
function refHeroLater(cls, L) {
  const C = CLASSES[cls], c = Hero.create(cls, 'ref', { base: refBase(cls), level: L });
  for (const t of Hero.pending(c)) Hero.choose(c, t, { kind: 'tier', cls });
  // Skill points: the starter to level 5, the second active from level 50, then passives tier by tier.
  while (Hero.learn(c, C.starter));
  if (L >= 50 && C.second) while (Hero.learn(c, C.second));
  const passives = [];
  for (let tier = 1; tier <= HERO.TIERS; tier++) for (const path of C.tree) { const id = path[tier - 1]; if (id && SKILLS[id] && SKILLS[id].kind !== 'active') passives.push(id); }
  for (let goal = 1; goal <= SKILL_LV_MAX; goal++) for (const id of passives) while ((c.skills[id] || 0) < goal && Hero.learn(c, id));
  c.equip = [C.starter].concat(L >= 50 && C.second && c.skills[C.second] ? [C.second] : []);
  Hero.fixEquip(c);
  refStats(c);
  const rar = REF.RARITY[REF.regionOf(L)];
  c.gear.weapon = Items.make(REF.WEAPON[rar][cls], L);
  c.gear.armor = Items.make(REF.ARMOUR[rar][cls === 'warden' ? 'warden' : 'other'], L);
  return c;
}
// The rules a reference hero brings: the class's starter rules (or, from level 50, rules for both skills), and from
// Region II a Move rule first, so a hero lured or swapped out of their row walks back.
function refRules(cls, L) {
  const C = CLASSES[cls], base = L >= 50 && REF.RULES50[cls] ? REF.RULES50[cls] : C.rules;
  if (L <= 10) return base;
  return [{ if: C.row === 'front' ? 'self_back' : 'self_front', do: 'move' }].concat(base);
}
// The reference party for a stage: n heroes of a recruit order at level L, front classes in front.
function refParty(order, n, L) {
  const party = [null, null, null, null, null, null], front = [0, 1], back = [2, 3, 4, 5];
  order.slice(0, n).forEach((cls, i) => {
    const c = refHero(cls, L, 'c' + (i + 1));
    const slot = CLASSES[cls].row === 'front' && front.length ? front.shift() : back.length ? back.shift() : front.shift();
    party[slot] = Hero.spec(c, refRules(cls, L));
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
// The farming loop (home-base spec §5): XP is a share of a level at the stage's level, so a party that only clears
// each stage once falls behind the road's levels, and replays (or the Training Yard) fill the gap. Returns, for a
// region, the levels the road climbs, the levels' worth one clear of each stage earns, and the extra clears needed.
function farming(r) {
  const list = STAGES.filter(st => st.region === r);
  let climb = 0, earned = 0, extra = 0;
  list.forEach((st, k) => {
    const next = list[k + 1] || STAGES[st.index + 1];
    const gap = next ? Math.max(0, next.level - st.level) : 0, xp = Campaign.preview(st, false).xpLv;
    climb += gap; earned += xp; extra += Math.max(0, gap - xp) / xp;
  });
  return { climb, earned, extra, perStage: extra / list.length, stages: list.length };
}
// The report: every stage at one level under, at, and over its recommendation, against its target; the first hour's
// fatigue; how far one level moves each wall; and the farming loop. o: { regions (0–4 to include), check }
function referenceReport(M, o = {}) {
  const pad = (s, n) => String(s).padEnd(n), lpad = (s, n) => String(s).padStart(n), pct = x => Math.round(100 * x) + '%';
  const out = { rows: [], misses: [] };
  const regions = o.regions || REGIONS.map((R, r) => r);
  for (const r of regions) {
    const list = STAGES.filter(st => st.region === r);
    if (!list.length) continue;
    console.log(`\nThe reference party, Region ${REGIONS[r].num} (${REGIONS[r].name}, campaign spec §5.6): ${M} battles per recruit order at the recommended level, ${Math.ceil(M / 2)} at the others, ${REF.ORDERS.length} orders`);
    console.log('   ' + pad('stage', 32) + pad('lv', 4) + pad('n', 3) + pad('target', 10) + lpad('−2', 6) + lpad('−1', 6) + lpad('rec', 6) + lpad('+1', 6) + lpad('+2', 6) + lpad('rounds', 9) + pad('  (target)', 12) + lpad('fatigue', 8) + lpad('KO', 6) + '  by order');
    const rows = [];
    for (const st of list) {
      const kind = REF.kindOf(st), T = REF.TARGET[kind], RT = REF.ROUNDS[st.tier];
      const lv = [-2, -1, 0, 1, 2].map(d => (st.level + d >= 1 ? refRun(st, st.level + d, d === 0 ? M : Math.ceil(M / 2), o) : null));
      const rec = lv[2];
      const okWin = rec.win >= T.win[0] - 1e-9 && rec.win <= T.win[1] + 1e-9, okR = rec.rounds >= RT[0] - 0.5 && rec.rounds <= RT[1] + 0.5;
      const wall = kind === 'elite' || kind === 'boss';
      const step = wall ? [lv[1] ? rec.win - lv[1].win : null, lv[3].win - rec.win] : null;
      const okCliff = !wall || step.every(x => x == null || (x >= REF.CLIFF[0] - 0.05 && x <= REF.CLIFF[1] + 0.05));
      const row = { id: st.id, region: r, kind, win: rec.win, rounds: rec.rounds, turns: rec.turns, first: rec.first, lv: lv.map(x => x && x.win), okWin, okR, okCliff, step };
      rows.push(row); out.rows.push(row);
      if (!okWin) out.misses.push(`${st.id} win ${pct(rec.win)} (target ${pct(T.win[0])}${T.win[1] < 1 ? '–' + pct(T.win[1]) : '+'})`);
      if (!okR) out.misses.push(`${st.id} rounds ${rec.rounds.toFixed(1)} (target ${RT[0]}–${RT[1]})`);
      if (!okCliff) out.misses.push(`${st.id} one level moves the win chance ${step.map(x => (x == null ? '–' : pct(x))).join(' / ')} (target ${pct(REF.CLIFF[0])}–${pct(REF.CLIFF[1])})`);
      console.log('   ' + pad(`${st.id} ${st.name}`, 32) + pad(st.level, 4) + pad(st.party, 3) + pad(T.win[1] < 1 ? `${pct(T.win[0])}–${pct(T.win[1])}` : pct(T.win[0]) + '+', 10)
        + lv.map(x => lpad(x ? pct(x.win) : '–', 6)).join('') + lpad(rec.rounds.toFixed(1), 9) + pad(`  (${RT[0]}–${RT[1]})`, 12) + lpad(rec.turns.toFixed(1), 8) + lpad(rec.ko.toFixed(2), 6)
        + '  ' + rec.each.map(pct).join(' ') + (okWin && okR && okCliff ? '' : '  ←'));
    }
    if (r === 0) {
      // The first hour's fatigue: the starting hero fights every stage once, in order, at its recommended level.
      let f = 0, weary = null, tired = null;
      for (const row of rows) { f += row.first; if (weary == null && f >= FATIGUE.WEARY) weary = row.id; if (tired == null && f >= FATIGUE.EXHAUSTED) tired = row.id; }
      out.weary = weary; out.tired = tired;
      console.log(`   The starting hero, fighting every stage once in order: Weary (50) after ${weary || 'never'}, 75 after ${tired || 'never'} (target: about 1-8, and 1-10 or 1-11).`);
    }
    const walls = rows.filter(x => x.step);
    console.log(`   Fatigue per hero is turns taken. Walls: one level under / over moves the win chance ${walls.map(x => `${x.id} ${x.step.map(v => (v == null ? '–' : '+' + pct(v))).join(' / ')}`).join(', ')}.`);
    const fm = farming(r);
    console.log(`   The farming loop: the road climbs ${fm.climb} levels over ${fm.stages} stages; one clear of each earns ${fm.earned.toFixed(1)} levels' worth at its own level, so about ${fm.perStage.toFixed(1)} more clears per stage (replays, or the Training Yard) keep the party at the recommended level.`);
  }
  if (out.misses.length) console.log('   Off target: ' + out.misses.join('; '));
  else console.log('   Every stage is on target.');
  return out;
}
if (typeof module !== 'undefined') module.exports = { REF, refHero, refParty, refRules, refSetup, refRun, farming, referenceReport };
