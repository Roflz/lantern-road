'use strict';
// Headless battle test: simulates many battles per stage and reports win rates, battle length, which skills
// and rules fire, and any broken invariants. Then it runs rules experiments (the same battles with different rules)
// and tests the Tactics model. Run: node tools/simtest.js [battles per stage, default 300]
const fs = require('fs'), path = require('path'), vm = require('vm');
for (const f of ['core.js', 'data.js', 'sim.js', 'rules.js']) vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), { filename: f });

const N = Number(process.argv[2]) || 300;
const EVENTS = new Set(['start', 'round', 'enrage', 'turn', 'tick', 'act', 'hit', 'miss', 'heal', 'revive', 'status', 'die', 'delay', 'end', 'item', 'mana']);
const problems = [];
const fail = (msg, seed, stage) => { if (problems.length < 30) problems.push(`${stage.id} seed ${seed}: ${msg}`); };

// Replays a log against the start snapshot and checks it is self-consistent.
function check(res, stage) {
  const units = {};
  for (const u of res.start) units[u.id] = Object.assign({}, u);
  let current = null, ends = 0, turns = 0;
  const usedSlots = new Set();
  for (const e of res.log) {
    if (!EVENTS.has(e.t)) fail('unknown event ' + e.t, res.seed, stage);
    if (e.t === 'turn') {
      current = units[e.who];
      if (!current || !current.alive) fail(`dead or unknown unit ${e.who} takes a turn`, res.seed, stage);
      if (e.queue[0] !== e.who) fail(`queue does not start with the actor ${e.who}`, res.seed, stage);
      if (e.k !== turns++) fail(`turn number ${e.k} out of order`, res.seed, stage);
    }
    if (e.t === 'act') {
      if (!current || current.id !== e.who) fail(`act by ${e.who} outside its turn`, res.seed, stage);
      if (e.mp < 0) fail(`negative mana ${e.mp} for ${e.who}`, res.seed, stage);
      if (e.mp > units[e.who].maxMp) fail(`mana over max for ${e.who}`, res.seed, stage);
      if (!SKILLS[e.skill]) fail('unknown skill ' + e.skill, res.seed, stage);
      if (!e.targets.length) fail(`act with no targets: ${e.skill}`, res.seed, stage);
      if (e.focus != null && (!res.partyRules[e.focus] || res.partyRules[e.focus].do !== 'focus')) fail(`bad focus ${e.focus}`, res.seed, stage);
    }
    if (e.t === 'hit' || e.t === 'heal' || e.t === 'tick') {
      const t = units[e.tgt || e.who];
      if (!t.alive) fail(`${e.t} on a fallen unit ${t.id}`, res.seed, stage);
      if (e.hp < 0 || e.hp > t.maxHp) fail(`hp out of range ${e.hp}/${t.maxHp}`, res.seed, stage);
      t.hp = e.hp;
    }
    if (e.t === 'die') { if (!units[e.who].alive) fail('dies twice ' + e.who, res.seed, stage); units[e.who].alive = false; units[e.who].hp = 0; }
    if (e.t === 'revive') { if (units[e.tgt].alive) fail('revives a living unit', res.seed, stage); units[e.tgt].alive = true; units[e.tgt].hp = e.hp; }
    if (e.t === 'item') {
      // the party's items: each slot once, its own item, used by hand or by an item rule, and never mid-turn
      if (res.loadout[e.slot] !== e.item || usedSlots.has(e.slot)) fail(`item slot ${e.slot} misused ${JSON.stringify(e)}`, res.seed, stage);
      usedSlots.add(e.slot);
      if (e.by === 'rule' && (!res.partyRules[e.prule] || res.partyRules[e.prule].do !== e.item)) fail(`item rule ${e.prule} does not match`, res.seed, stage);
      if (e.by !== 'rule' && e.by !== 'hand') fail('item used by ' + e.by, res.seed, stage);
      if (!e.targets.length) fail('item with no targets', res.seed, stage);
      current = null;
    }
    if (e.t === 'mana') { const u = units[e.tgt]; if (!u.alive || e.mp < 0 || e.mp > u.maxMp) fail(`bad mana ${JSON.stringify(e)}`, res.seed, stage); }
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

// ── Rules experiments: the same seeds with different rules, to show the rules change what happens.
const M = Math.max(100, Math.round(N / 2));
const ok = (cond, msg) => { if (!cond) problems.push('rules: ' + msg); };
const byKey = (res, k) => res.start.find(u => u.key === k && u.side === 0);
// Runs a stage M times with tactics made by edit(base), and sums what the experiments look at.
function trial(stageId, edit) {
  const stage = STAGES.find(s => s.id === stageId);
  const out = { wins: 0, rounds: 0, kos: 0, healed: 0, mend: 0, draughts: 0, items: 0, focus: 0, ruleFires: 0, stalls: 0 };
  for (let i = 0; i < M; i++) {
    const tac = Tactics.setup();
    edit(tac);
    const seed = strSeed(stage.id + ':' + i);
    const res = simulate(stageSetup(stage, seed, tac));
    check(res, stage);
    if (res.stalled) out.stalls++;
    if (res.winner === 0) out.wins++;
    out.rounds += res.rounds;
    const pil = byKey(res, 'pilgrim');
    out.healed += res.stats[pil.id].healed;
    for (const u of res.start) if (u.side === 0) { out.kos += res.stats[u.id].falls; out.ruleFires += res.stats[u.id].rules.reduce((a, b) => a + b, 0); }
    for (const e of res.log) {
      if (e.t === 'act' && e.who === pil.id && e.skill === 'mend') out.mend++;
      if (e.t === 'act' && e.focus != null) out.focus++;
      if (e.t === 'item') { out.items++; if (e.item === 'draught') out.draughts++; }
    }
    ok(out.items <= (i + 1) * res.loadout.length, `${stageId} used more items than it packed`);
  }
  totalStalls += out.stalls;
  return out;
}
const line = (name, r) => console.log(`   ${pad(name, 34)} win ${lpad((100 * r.wins / M).toFixed(0), 3)}%  rounds ${(r.rounds / M).toFixed(1)}  KOs ${(r.kos / M).toFixed(2)}  Pilgrim healed ${lpad(Math.round(r.healed / M), 4)}  Mend ${(r.mend / M).toFixed(1)}  items ${(r.items / M).toFixed(2)}  focus ${(r.focus / M).toFixed(1)}`);
const setRules = (tac, k, rules) => { tac.party.find(p => p.key === k).rules = rules; };
const noDraught = tac => { tac.partyRules = tac.partyRules.filter(r => PARTY_ACTIONS[r.do].kind !== 'item'); };
const healFirst = [{ if: 'ally_fallen', do: 'rites' }, { if: 'ally_hp_lt', n: 50, do: 'mend' }, { if: 'always', do: 'smite' }];
const healLast = [{ if: 'always', do: 'smite' }, { if: 'ally_fallen', do: 'rites' }, { if: 'ally_hp_lt', n: 50, do: 'mend' }];

console.log(`\nRules experiments (${M} battles each, same seeds)`);
for (const id of ['1-3', '2-3']) {
  console.log(` ${id} ${STAGES.find(s => s.id === id).name}, without item rules so the Pilgrim is the only healer`);
  const a = trial(id, t => { noDraught(t); setRules(t, 'pilgrim', healFirst); });
  const b = trial(id, t => { noDraught(t); setRules(t, 'pilgrim', healLast); });
  const off = trial(id, t => { noDraught(t); for (const p of t.party) p.rules = p.rules.map(r => Object.assign({}, r, { on: false })); });
  line('Pilgrim: heal rules first', a); line('Pilgrim: heal rules last', b); line('Every hero rule switched off', off);
  ok(b.mend === 0, `${id}: Mend fired ${b.mend} times with "Always → Smite" above it`);
  ok(a.healed > b.healed * 2, `${id}: heal-first healing ${a.healed} is not well above heal-last ${b.healed}`);
  ok(off.ruleFires === 0, `${id}: switched-off rules fired ${off.ruleFires} times`);
  ok(a.kos < b.kos, `${id}: heal-first KOs ${a.kos} not below heal-last ${b.kos}`);
}
console.log(' 2-3 The Black Font: party rules');
const d0 = trial('2-3', noDraught);
const d1 = trial('2-3', t => { t.loadout = ['draught', 'draught']; t.partyRules = [{ if: 'ally_hp_lt', n: 30, do: 'draught' }]; });
const d2 = trial('2-3', t => { t.loadout = ['draught', 'salts']; t.partyRules = [{ if: 'ally_fallen', do: 'salts' }, { if: 'ally_hp_lt', n: 30, do: 'draught' }]; });
const d3 = trial('2-3', t => { t.loadout = []; });
const f1 = trial('2-3', t => { noDraught(t); t.partyRules.forEach(r => { if (r.do === 'focus') r.on = true; }); });
const f2 = trial('2-3', t => { noDraught(t); t.partyRules = [{ if: 'foe_highest_pow', do: 'focus', on: true }]; });
line('No item rules', d0); line('2 draughts, ally below 30% → draught', d1); line('Salts and a draught, both with rules', d2); line('Default rules, nothing packed', d3);
line('Focus fire: foe with lowest health', f1); line('Focus fire: foe with highest attack', f2);
ok(d0.items === 0 && d3.items === 0, 'items were used with no item rule, or with nothing packed');
ok(d1.draughts > d2.draughts && d2.items > d2.draughts, 'item rules did not use what was packed');
ok(d1.kos < d0.kos, `draughts did not reduce KOs (${d1.kos} vs ${d0.kos})`);
ok(f1.focus > 0 && f2.focus > 0 && d0.focus === 0, 'focus fire never aimed an attack, or aimed one while off');

// Items used by hand: the battle is simulated again with the input added. Everything before that turn must be the
// same, the item must land just before it, and nobody's turn is spent on it.
{
  const stage = STAGES.find(s => s.id === '2-3');
  let checked = 0, diverged = 0;
  for (let i = 0; i < 60; i++) {
    const seed = strSeed('hand:' + i);
    const base = stageSetup(stage, seed, Object.assign(Tactics.setup(), { partyRules: [], loadout: ['draught', 'salts', 'lampoil'] }));
    const a = simulate(base);
    const turnsA = a.log.filter(e => e.t === 'turn');
    const at = 5 + (i * 7) % Math.max(1, turnsA.length - 6);
    const cut = a.log.findIndex(e => e.t === 'turn' && e.k === at);
    const hurt = a.log.slice(0, cut).filter(e => e.t === 'hit' && e.tgt[0] === 'p').map(e => e.tgt).pop() || 'p0';
    const slot = i % 3;
    const b = simulate(Object.assign({}, base, { inputs: [{ at, slot, target: hurt }] }));
    check(b, stage);
    const same = JSON.stringify(a.log.slice(0, cut)) === JSON.stringify(b.log.slice(0, cut));
    ok(same, `hand item at turn ${at} changed what came before it (seed ${seed})`);
    const it = b.log[cut];
    if (it && it.t === 'item') {
      checked++;
      ok(it.by === 'hand' && it.slot === slot, 'hand item event is wrong: ' + JSON.stringify(it));
      const next = b.log.slice(cut + 1).find(e => e.t === 'turn');
      ok(next && next.k === at, 'the item took a turn');
      const rest = cut + 1 + b.log.slice(cut + 1).findIndex(e => e.t === 'turn');
      if (JSON.stringify(a.log.slice(cut)) !== JSON.stringify(b.log.slice(rest))) diverged++;
    } else ok(slot === 1, 'a draught or lamp oil was not used where asked (seed ' + seed + ')');
  }
  console.log(`   Items used by hand: ${checked} of 60 landed where asked (salts need a fallen ally), ${diverged} changed the rest of the battle; the turns before were unchanged every time.`);
  ok(checked >= 40 && diverged > 0, 'hand items did not land or changed nothing');
}

// ── The Tactics model
{
  Tactics.reset();
  const w = Tactics.owner('warden');
  ok(w.slots === 3 && w.max === 5 && w.rules.length === 3, 'warden starts with its 3 rules in 3 of 5 slots');
  ok(!Tactics.add('warden', { if: 'always', do: 'mace' }), 'adding past the unlocked slots must fail');
  ok(Tactics.slotCost('warden') === RULE_SLOT_COST[1] && Tactics.unlockSlot('warden') && Tactics.owner('warden').slots === 4, 'unlocking a slot');
  ok(!Tactics.add('warden', { if: 'boss_present', do: 'mace' }), 'a locked condition must not be addable');
  ok(!Tactics.add('warden', { if: 'always', do: 'smite' }), 'another class’s skill must not be addable');
  ok(Tactics.add('warden', { if: 'always', do: 'mace' }) && Tactics.owner('warden').rules.length === 4, 'adding into a free slot');
  ok(Tactics.move('warden', 3, 0) && Tactics.owner('warden').rules[0].if === 'always', 'moving a rule to the top');
  ok(Tactics.toggle('warden', 0) && Tactics.owner('warden').rules[0].on === false, 'switching a rule off');
  ok(Tactics.setup().party.find(p => p.key === 'warden').rules[0].on === false, 'battles get the switched-off rule');
  ok(Tactics.remove('warden', 0) && Tactics.owner('warden').rules.length === 3, 'removing a rule');
  ok(!Tactics.add('party', { if: 'ally_hp_lt', n: 50, do: 'focus' }), 'focus fire must need a foe condition');
  ok(!Tactics.replace('party', 1, { if: 'self_hp_lt', n: 50 }), 'a focus rule cannot take an ally condition');
  ok(!Tactics.replace('party', 0, { if: 'self_hp_lt', n: 50 }), 'party rules have no "self"');
  ok(Tactics.conditionMenu('party').every(g => g.group !== 'self'), 'the party picker offers no "self" conditions');
  const L0 = Tactics.loadout();
  ok(L0.slots === LOADOUT.slots[0] && L0.items.join() === LOADOUT.items.join(), 'the starting loadout');
  ok(Tactics.setItem(1, 'lampoil') && Tactics.setup().loadout.join() === 'draught,lampoil', 'packing an item');
  ok(!Tactics.setItem(2, 'draught') && !Tactics.setItem(0, 'nope'), 'no packing past the open slots, or unknown items');
  ok(Tactics.unlockItemSlot() && Tactics.setItem(2, 'salts') && Tactics.setup().loadout.length === 3, 'opening an item slot');
  ok(Tactics.setItem(0, null) && Tactics.setup().loadout.join() === 'lampoil,salts', 'emptying a slot');
  ok(Tactics.explain('party', Tactics.owner('party').rules[0]).warn, 'an item rule for an item not packed is flagged');
  Tactics.setItem(0, 'draught');
  ok(Tactics.replace('party', 1, { if: 'front_foe' }) && Tactics.owner('party').rules[1].if === 'front_foe', 'changing a party rule’s condition');
  ok(Tactics.learn('boss_present') && Tactics.add('hexblade', { if: 'boss_present', do: 'doom' }) === false, 'hexblade has no free slot');
  ok(Tactics.replace('hexblade', 0, { if: 'boss_present' }) && Tactics.owner('hexblade').rules[0].n === undefined, 'replacing a condition drops its old number');
  const menu = Tactics.conditionMenu('party', 'focus');
  ok(menu.length === 1 && menu[0].group === 'foe', 'the focus picker only offers foe conditions');
  ok(Tactics.saveSet('Bishop') && Tactics.sets().length === 1, 'saving a set');
  const saved = JSON.stringify(Tactics.setup());
  Tactics.remove('pilgrim', 0); Tactics.toggle('party', 0);
  ok(JSON.stringify(Tactics.setup()) !== saved, 'edits change the setup');
  Tactics.setItem(0, null);
  ok(Tactics.loadSet(0) && JSON.stringify(Tactics.setup()) === saved, 'loading a set restores it, loadout included');
  ok(Tactics.saveSet('bishop') && Tactics.sets().length === 1, 'saving under the same name replaces the set');
  const dump = Tactics.dump();
  Tactics.reset(); Tactics.load(dump);
  ok(JSON.stringify(Tactics.dump()) === JSON.stringify(dump), 'dump and load round-trip');
  Tactics.load({ heroes: { warden: { slots: 99, rules: [{ if: 'nope', do: 'mace' }, { if: 'always', do: 'smite' }, { if: 'always', do: 'mace' }] } }, party: { slots: 0 }, sets: [{ name: 'x', heroes: {}, party: [{ if: 'always', do: 'focus' }] }] });
  const lw = Tactics.owner('warden');
  ok(lw.slots === 5 && lw.rules.length === 1 && Tactics.owner('party').slots === 2, 'loading bad data keeps only what makes sense');
  ok(Tactics.deleteSet(0) && Tactics.sets().length === 0, 'deleting a set');
  ok(Tactics.learnAll() && Tactics.conditionMenu('warden').every(g => g.items.every(it => it.known)), 'learning every condition');
  Tactics.reset();
  for (const id in CONDITIONS) for (const v of Tactics.variants(id)) ok(typeof ruleCond(v) === 'string' && !ruleCond(v).includes('undefined'), 'label of ' + Tactics.condKey(v));
  console.log(`\nTactics model checked. Conditions: ${Object.keys(CONDITIONS).length} (${Object.values(CONDITIONS).reduce((n, C) => n + Tactics.variants(C.id).length, 0)} variants).`);
}

console.log(`\n${STAGES.length * N} balance battles in ${((Date.now() - t0) / 1000).toFixed(1)}s. Stalls: ${totalStalls}. Problems: ${problems.length}`);
problems.forEach(p => console.log('  ! ' + p));
process.exitCode = problems.length || totalStalls ? 1 : 0;
