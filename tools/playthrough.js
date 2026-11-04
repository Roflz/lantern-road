'use strict';
// End-to-end play-through (build step 7b): from a new game through Region I, using only the game's own mechanics, as a
// sensible player would. No prototype tools: time passes on a simulated clock (rest, idle buildings, the board), and
// the player picks a hero, sets out, fights, hires from the Recruit Board, builds what the road unlocks, spends points,
// wears better gear, buys draughts, rests, and farms the stage before a wall when it loses.
//
// It looks for dead ends, stalls, errors and softlocks (the road stops moving, every hero Spent for good, gold below 0),
// and checks that every unlock, building and first-time tip comes when the campaign spec says (§5.3, §5.4, §8).
// Run: node tools/playthrough.js [runs per starting hero, default 2] [--verbose]
const fs = require('fs'), path = require('path'), vm = require('vm');
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

// ── the simulated clock: Date.now() is the game's only source of time
let CLOCK = Date.UTC(2026, 10, 4, 9, 0, 0);
const realNow = Date.now;
Date.now = () => CLOCK;
for (const f of ['core.js', 'data.js', 'classes.js', 'classes-late.js', 'items.js', 'sim.js', 'hero.js', 'base.js', 'rest.js', 'save.js', 'rules.js', 'campaign.js']) vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), { filename: f });

const ARGS = process.argv.slice(2), RUNS = Number(ARGS.find(x => /^\d+$/.test(x))) || 2, VERBOSE = ARGS.includes('--verbose');
const MIN = 60000, HOUR = 60 * MIN;
// What a battle costs in play time, watched at 1× with the rewards and the walk (campaign spec §8.2: 1–2 minutes a stage).
const BATTLE_MS = res => (25 + res.rounds * 6) * 1000, WALK_MS = 3000;
const REGION_I = STAGES.filter(st => st.region === 0);
const pad = (s, n) => String(s).padEnd(n), lpad = (s, n) => String(s).padStart(n);
const hm = ms => { const m = Math.round(ms / MIN); return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`; };

// The first-time tips (campaign spec §8.3), seen from a battle's log the way js/main.js sees them as they play.
function tipsIn(res, seen) {
  const hero = id => /^p\d$/.test(id);
  for (const e of res.log) {
    if (e.t === 'status' && e.on && hero(e.who) && e.key === 'bleed') seen.bleed = seen.bleed || 1;
    if (e.t === 'status' && e.on && hero(e.who) && e.key === 'marked') seen.marked = seen.marked || 1;
    if (e.t === 'hit' && e.guard && e.tgt[0] === 'f') seen.guarded = seen.guarded || 1;
    if (e.t === 'enrage') seen.enrage = seen.enrage || 1;
    if (e.t === 'die' && hero(e.who)) seen.fell = seen.fell || 1;
    if (e.t === 'step') seen.step = seen.step || 1;
    if (e.t === 'summon' && e.unit.side === 1) seen.called = seen.called || 1;
  }
}

function play(cls, seed) {
  CLOCK = Date.UTC(2026, 10, 4, 9, 0, 0) + seed * 7919;
  const rng = makeRng(seed * 104729 + 7);
  const t0 = CLOCK;
  // boot, as js/main.js does it
  Save.load();
  const s = Save.state;
  Campaign.ensure(s);
  Base.prepare(s);
  Base.start(s);
  const problems = [], log = [], unlockAt = {}, firstAt = {}, tipAt = {};
  let playMs = 0, waitMs = 0, trips = 0, battles = 0, losses = 0, farms = 0, hires = [], builds = [], lowGold = Infinity;
  const note = (k, msg) => { if (problems.length < 25) problems.push(`${cls}#${seed} ${k}: ${msg}`); };
  const pass = ms => { CLOCK += ms; Base.tick(s); };
  let settling = null; // the stage whose battle is being settled: its first clear unlocks things
  Campaign.onUnlock(id => { if (!(id in unlockAt)) unlockAt[id] = { stage: settling ? settling.id : 'camp', at: playMs }; });
  const seen = {};

  // ── the first pick (js/camp.js): one of three, with their starter rules
  const c0 = Base.newGame(cls, s, { rng });
  if (!c0) { note('pick', 'no first hero'); return { problems }; }
  Tactics.owner(c0.id);

  // ── the camp, between trips: what a sensible player does there
  function camp() {
    Base.tick(s);
    // gather what the idle buildings made
    Base.collectAll(s);
    const fr = Campaign.frontier(s), want = Math.min(6, (STAGES[Math.min(fr + 1, STAGES.length - 1)] || STAGES[fr] || { party: 6 }).party);
    // hire to the party the next stages need (campaign spec §5.4): a class the roster lacks, the cheapest of those
    while (s.roster.length < Math.min(want, Base.rosterCap(s)) && Base.boardOpen(s) && s.board.picks > 0 && s.board.recruits.length) {
      const have = new Set(s.roster.map(c => c.cls));
      const list = s.board.recruits.slice().sort((a, b) => (have.has(a.cls) - have.has(b.cls)) || (Base.recruitPrice(a, s) - Base.recruitPrice(b, s)));
      const r = list.find(x => Base.recruitPrice(x, s) <= s.currencies.gold);
      if (!r) break;
      const c = Base.hire(r.id, s);
      if (!c) { note('hire', `could not hire ${r.cls}`); break; }
      Tactics.owner(c.id);
      hires.push({ cls: c.cls, at: playMs, stage: STAGES[fr] ? STAGES[fr].id : 'end' });
    }
    // anyone on the roster but out of the formation stands in it
    for (const c of s.roster) if (!s.party.includes(c.id)) Base.place(c, s);
    // build what the road has unlocked, keeping back the price of a recruit still needed
    const reserve = s.roster.length < want ? 230 : 0;
    for (const id of ['tollhouse', 'infirmary', 'trainingyard', 'tactician', 'shop', 'scavengercamp', 'barracks', 'salvagepit']) {
      const plot = s.base.plots.findIndex((p, i) => i < Base.plotsCleared(s) && !p);
      if (plot < 0 || Base.built(id, s) || !Base.blueprint(id, s)) continue;
      const c = Base.cost(id, 1);
      if (!Base.canPay(c, s) || s.currencies.gold - c.gold < reserve) continue;
      if (Base.build(id, plot, s)) builds.push({ id, at: playMs, stage: STAGES[fr] ? STAGES[fr].id : 'end' });
    }
    // points and gear
    for (const c of s.roster) {
      Hero.autoBuild(c);
      for (const slot of SLOTS) {
        const now = c.gear[slot] ? Items.score(c.gear[slot]) : -1;
        const best = s.inventory.items.filter(x => Items.def(x).slot === slot && Items.canUse(c, x)).sort((a, b) => Items.score(b) - Items.score(a))[0];
        if (best && Items.score(best) > now + 0.5) Items.equip(s, c, best.uid);
      }
    }
    // draughts for the loadout, from the Shop once it stands
    if (Campaign.has('items', s) && Base.shopLevel(s)) {
      const need = Base.loadoutSlots(s) * 2 - (s.inventory.potions.draught || 0);
      for (let k = 0; k < need && s.currencies.gold > 300; k++) Base.buyItem('draught', 1, s);
    }
    lowGold = Math.min(lowGold, s.currencies.gold);
    if (!(s.currencies.gold >= 0) || !Number.isFinite(s.currencies.gold)) note('gold', `gold is ${s.currencies.gold}`);
  }
  // ── rest until the formation can set out without anyone Exhausted (the fire, the Infirmary's beds)
  function rest() {
    const tired = () => Campaign.chars(s).some(c => Campaign.spent(c) || (c.fatigue || 0) >= 70) || !Campaign.fit(s).length;
    let waited = 0;
    while (tired() && waited < 48 * HOUR) { pass(30 * MIN); waited += 30 * MIN; }
    waitMs += waited;
    if (tired()) note('rest', `48 hours of rest left the party unfit: ${Campaign.chars(s).map(c => `${c.name} ${Math.floor(c.fatigue)}${c.spent ? ' Spent' : ''}`).join(', ')}`);
  }

  // ── the road
  let lostAt = -1, lostRun = 0, stuck = 0, lastFrontier = -1;
  while (Campaign.frontier(s) < REGION_I.length && trips < 900) {
    camp(); rest();
    const fr = Campaign.frontier(s);
    if (fr === lastFrontier) stuck++; else { stuck = 0; lastFrontier = fr; }
    if (stuck > 120) { note('stuck', `120 trips without lighting ${STAGES[fr].id}; party ${Campaign.chars(s).map(c => `${CLASSES[c.cls].name} ${c.level}`).join(', ')}`); break; }
    // Two losses running at the frontier: farm the stage before it for a trip (campaign spec §8.2, 1-9).
    const farm = lostAt === fr && lostRun >= 2 && fr > 0;
    const i = farm ? fr - 1 : fr;
    if (farm) { farms++; lostRun = 1; } // then try the wall again
    const T = Campaign.setOut(i, s);
    if (!T) { note('setout', `could not set out for ${STAGES[i].id} (fit: ${Campaign.fit(s).length})`); pass(HOUR); continue; }
    trips++;
    for (let n = 0; n < 60; n++) {
      const at = T.stage, stage = STAGES[at], first = !Campaign.isLit(stage.id, s);
      const before = s.roster.map(c => ({ c, f: c.fatigue || 0, lv: c.level }));
      let res;
      try { res = simulate(Campaign.setup(at, (seed * 7777 + battles * 131) >>> 0, s)); } catch (e) { note('simulate', `${stage.id}: ${e.stack.split('\n').slice(0, 3).join(' | ')}`); break; }
      battles++;
      if (res.stalled) note('stall', `${stage.id} seed ${res.seed} stalled`);
      tipsIn(res, seen);
      playMs += BATTLE_MS(res); pass(BATTLE_MS(res));
      let out;
      settling = stage;
      try { out = Campaign.afterBattle(res, s); } catch (e) { note('settle', `${stage.id}: ${e.stack.split('\n').slice(0, 3).join(' | ')}`); break; }
      settling = null;
      // the after-battle tips
      if (before.some(x => x.f < FATIGUE.WEARY && (x.c.fatigue || 0) >= FATIGUE.WEARY)) seen.weary = seen.weary || 1;
      if (out.r.gains.some(x => x.g.to > x.g.from)) seen.stat = seen.stat || 1;
      if (out.r.gains.some(x => x.g.skillPts > 0)) seen.skill = seen.skill || 1;
      for (const k in seen) if (seen[k] === 1) { seen[k] = 2; tipAt[k] = { stage: stage.id, at: playMs }; }
      if (out.r.first) { firstAt[stage.id] = { at: playMs, wait: waitMs, party: s.roster.length, levels: Campaign.chars(s).map(c => c.level), gold: s.currencies.gold, battles }; lostRun = 0; }
      if (!out.r.won) { losses++; if (lostAt === at) lostRun++; else { lostAt = at; lostRun = 1; } }
      if (out.next == null) break;
      playMs += WALK_MS; pass(WALK_MS);
    }
    if (Campaign.trip(s)) { note('trip', 'a trip never ended'); Campaign.end({ k: 'called', text: 'test' }, s); }
    // home: the summary is seen
    if (s.campaign.lastTrip) s.campaign.lastTrip.seen = true;
  }

  // ── what should have happened (campaign spec §5.3, §5.4, §8)
  const done = Campaign.frontier(s) >= REGION_I.length;
  if (!done) note('end', `stopped at ${STAGES[Campaign.frontier(s)].id} after ${trips} trips`);
  for (const st of REGION_I) for (const id of st.first) {
    if (!UNLOCKS[id]) continue;
    if (!s.unlocks[id]) note('unlock', `${id} never unlocked (${st.id})`);
    else if (unlockAt[id] && unlockAt[id].stage !== st.id) note('unlock', `${id} unlocked at ${unlockAt[id].stage}, not ${st.id}`);
  }
  if (!s.unlocks['cond:ally_fallen'] && seen.fell) note('unlock', 'a hero fell but “Ally: fallen” never unlocked');
  for (const k of ['bleed', 'marked', 'guarded', 'fell', 'step', 'called', 'stat', 'skill']) if (!seen[k]) note('tip', `the “${k}” tip never had its moment in Region I`);
  const recruit1 = hires[0];
  if (!recruit1) note('recruit', 'no recruit in Region I');
  else if (recruit1.at > 12 * MIN) note('pace', `the first recruit came at ${hm(recruit1.at)} of play (the design asks for about 10 minutes)`);
  if (s.roster.length < 6) note('party', `only ${s.roster.length} heroes by the end of Region I`);
  // Plots are scarce (every plot is a choice): by the Sexton, Renown has cleared four, and four should stand.
  const standing = BUILDING_ORDER.filter(id => BUILDINGS[id].plot !== false && Base.built(id, s));
  if (standing.length < Math.min(4, Base.plotsCleared(s))) note('build', `only ${standing.length} buildings stand on ${Base.plotsCleared(s)} plots`);
  for (const id of ['tollhouse', 'infirmary', 'trainingyard', 'shop', 'tactician', 'scavengercamp', 'barracks', 'salvagepit']) if (!Base.blueprint(id, s)) note('build', `the ${id} blueprint never came`);
  if (!s.inventory.items.concat(s.roster.flatMap(c => SLOTS.map(k => c.gear[k]).filter(Boolean))).some(x => x.id === 'gravediggersspade')) note('relic', 'the Sexton’s Relic never arrived');
  Date.now = () => CLOCK;
  return { cls, seed, done, problems, firstAt, unlockAt, tipAt, hires, builds, trips, battles, losses, farms, playMs, waitMs, lowGold, roster: s.roster.map(c => `${CLASSES[c.cls].name} ${c.level}`), gold: s.currencies.gold, renown: Base.renown(s).level };
}

// ── run it for each starting hero
const results = [];
for (const cls of STARTERS) for (let k = 1; k <= RUNS; k++) results.push(play(cls, k));
Date.now = realNow;

console.log('Play-through: a new game through Region I, real mechanics only (no prototype tools)\n');
console.log('   start       seed  done  trips battles lost farms   play   rested  1st hire   6th hire  low gold  Renown  party at the end');
for (const r of results) {
  console.log(`   ${pad(CLASSES[r.cls].name, 11)} ${lpad(r.seed, 4)}  ${pad(r.done ? 'yes' : 'NO', 4)}  ${lpad(r.trips, 5)} ${lpad(r.battles, 7)} ${lpad(r.losses, 4)} ${lpad(r.farms, 5)}  ${lpad(hm(r.playMs), 5)}  ${lpad(hm(r.waitMs), 7)}  ${lpad(r.hires[0] ? hm(r.hires[0].at) + ' ' + r.hires[0].stage : '—', 9)}  ${lpad(r.hires[4] ? r.hires[4].stage : '—', 8)}  ${lpad(r.lowGold, 8)}  ${lpad(r.renown, 6)}  ${r.roster.join(', ')}`);
}
// the first run's timeline, stage by stage
const R = results[0];
console.log(`\nTimeline (${CLASSES[R.cls].name}, seed ${R.seed}): play time at each first clear, the party, and what it unlocked`);
for (const st of REGION_I) {
  const f = R.firstAt[st.id];
  if (!f) { console.log(`   ${pad(st.id, 5)} not lit`); continue; }
  const unl = st.first.filter(id => UNLOCKS[id]).map(id => UNLOCKS[id].name).join(' · ');
  console.log(`   ${pad(st.id, 5)} ${lpad(hm(f.at), 5)} play, ${lpad(hm(f.wait), 6)} resting · ${f.party} heroes, lv ${f.levels.join('/')} · ${lpad(fmt(f.gold), 6)} gold${unl ? ' · ' + unl : ''}`);
}
console.log('\nBuildings built (first run): ' + R.builds.map(b => `${BUILDINGS[b.id].name} at ${b.stage} (${hm(b.at)})`).join(', '));
console.log('Tips had their moment (first run): ' + Object.entries(R.tipAt).map(([k, v]) => `${k} ${v.stage}`).join(', '));
const all = results.flatMap(r => r.problems);
console.log(`\n${all.length ? all.length + ' problem(s):' : 'No problems: every run reached the end of Region I, with every unlock, building and tip on time.'}`);
for (const p of all) console.log('   ' + p);
if (VERBOSE) console.log(JSON.stringify(results.map(r => ({ cls: r.cls, seed: r.seed, unlockAt: r.unlockAt, hires: r.hires })), null, 1));
process.exitCode = all.length ? 1 : 0;
