'use strict';
// Headless battle test: simulates many battles per stage and reports win rates, battle length, which skills
// and rules fire, and any broken invariants. Run: node tools/simtest.js [battles per stage, default 300]
const fs = require('fs'), path = require('path'), vm = require('vm');
for (const f of ['core.js', 'data.js', 'sim.js']) vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), { filename: f });

const N = Number(process.argv[2]) || 300;
const EVENTS = new Set(['start', 'round', 'enrage', 'turn', 'tick', 'act', 'hit', 'miss', 'heal', 'revive', 'status', 'die', 'delay', 'end']);
const problems = [];
const fail = (msg, seed, stage) => { if (problems.length < 30) problems.push(`${stage.id} seed ${seed}: ${msg}`); };

// Replays a log against the start snapshot and checks it is self-consistent.
function check(res, stage) {
  const units = {};
  for (const u of res.start) units[u.id] = Object.assign({}, u);
  let current = null, ends = 0;
  for (const e of res.log) {
    if (!EVENTS.has(e.t)) fail('unknown event ' + e.t, res.seed, stage);
    if (e.t === 'turn') {
      current = units[e.who];
      if (!current || !current.alive) fail(`dead or unknown unit ${e.who} takes a turn`, res.seed, stage);
      if (e.queue[0] !== e.who) fail(`queue does not start with the actor ${e.who}`, res.seed, stage);
    }
    if (e.t === 'act') {
      if (!current || current.id !== e.who) fail(`act by ${e.who} outside its turn`, res.seed, stage);
      if (e.mp < 0) fail(`negative mana ${e.mp} for ${e.who}`, res.seed, stage);
      if (e.mp > units[e.who].maxMp) fail(`mana over max for ${e.who}`, res.seed, stage);
      if (!SKILLS[e.skill]) fail('unknown skill ' + e.skill, res.seed, stage);
      if (!e.targets.length) fail(`act with no targets: ${e.skill}`, res.seed, stage);
    }
    if (e.t === 'hit' || e.t === 'heal' || e.t === 'tick') {
      const t = units[e.tgt || e.who];
      if (!t.alive) fail(`${e.t} on a fallen unit ${t.id}`, res.seed, stage);
      if (e.hp < 0 || e.hp > t.maxHp) fail(`hp out of range ${e.hp}/${t.maxHp}`, res.seed, stage);
      t.hp = e.hp;
    }
    if (e.t === 'die') { if (!units[e.who].alive) fail('dies twice ' + e.who, res.seed, stage); units[e.who].alive = false; units[e.who].hp = 0; }
    if (e.t === 'revive') { if (units[e.tgt].alive) fail('revives a living unit', res.seed, stage); units[e.tgt].alive = true; units[e.tgt].hp = e.hp; }
    if (e.t === 'end') ends++;
  }
  if (ends !== 1) fail('end events: ' + ends, res.seed, stage);
  for (const f of res.final) if (f.alive !== units[f.id].alive || f.hp !== units[f.id].hp) fail(`final state of ${f.id} differs from replay`, res.seed, stage);
  const sideAlive = s => res.final.some(u => u.side === s && u.alive);
  if (res.winner === 0 && sideAlive(1)) fail('party won with foes standing', res.seed, stage);
  if (res.winner === 1 && sideAlive(0) && !res.stalled) fail('foes won with heroes standing', res.seed, stage);
}

const pad = (s, n) => String(s).padEnd(n), lpad = (s, n) => String(s).padStart(n);
let totalStalls = 0;
const t0 = Date.now();
for (const stage of STAGES) {
  let wins = 0, rounds = [], acts = [], falls = 0, stalls = 0, enraged = 0, hpLeft = 0, anyKo = 0;
  const use = {}; // per unit key: skill -> count
  for (let i = 0; i < N; i++) {
    const seed = strSeed(stage.id + ':' + i);
    const res = simulate(stageSetup(stage, seed));
    check(res, stage);
    if (i < 3) { const again = simulate(stageSetup(stage, seed)); if (JSON.stringify(again.log) !== JSON.stringify(res.log)) fail('not deterministic', seed, stage); }
    if (res.winner === 0) wins++;
    if (res.stalled) stalls++;
    if (res.rounds >= SIM.ENRAGE_ROUND) enraged++;
    rounds.push(res.rounds); acts.push(res.actions);
    let ko = 0, hp = 0, max = 0;
    for (const u of res.final) if (u.side === 0) { ko += res.stats[u.id].falls; hp += u.hp; max += u.maxHp; }
    falls += ko; if (ko) anyKo++; hpLeft += hp / max;
    for (const e of res.log) if (e.t === 'act') {
      const k = res.start.find(u => u.id === e.who).key;
      (use[k] = use[k] || {})[e.skill] = (use[k][e.skill] || 0) + 1;
    }
  }
  totalStalls += stalls;
  const avg = a => (a.reduce((s, x) => s + x, 0) / a.length).toFixed(1);
  console.log(`\n${stage.id} ${pad(stage.name, 20)} win ${lpad((100 * wins / N).toFixed(0), 3)}%  rounds avg ${avg(rounds)} (min ${Math.min(...rounds)}, max ${Math.max(...rounds)})  turns avg ${avg(acts)}  party HP left ${(100 * hpLeft / N).toFixed(0)}%  battles with a KO ${(100 * anyKo / N).toFixed(0)}% (${(falls / N).toFixed(2)} KOs)  reached enrage ${(100 * enraged / N).toFixed(0)}%  stalls ${stalls}`);
  for (const k of Object.keys(use)) console.log('   ' + pad(k, 12) + Object.entries(use[k]).map(([s, c]) => `${s} ${(c / N).toFixed(1)}`).join(' · '));
}
console.log(`\n${STAGES.length * N} battles in ${((Date.now() - t0) / 1000).toFixed(1)}s. Stalls: ${totalStalls}. Problems: ${problems.length}`);
problems.forEach(p => console.log('  ! ' + p));
process.exitCode = problems.length || totalStalls ? 1 : 0;
