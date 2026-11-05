'use strict';
// Headless battle test: simulates many battles per stage and reports win rates, battle length, which skills
// and rules fire, and any broken invariants. Then it runs rules experiments (the same battles with different rules),
// battles with characters at several levels, a fuzz of random builds across all twelve classes, and tests the Tactics
// and Hero models and the save migration, gear (every item's effect, weapons by rarity, loot and the Bag), the home base (the
// economy over Region I's first clears, rest, idle buildings and time away, battle fatigue, Renown, the board and the
// Hall), the road's five regions and their engine pieces, and the reference party on every stage.
// Run: node tools/simtest.js [battles per stage, default 300]
const fs = require('fs'), path = require('path'), vm = require('vm');
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
for (const f of ['core.js', 'data.js', 'classes.js', 'classes-late.js', 'items.js', 'sim.js', 'hero.js', 'base.js', 'rest.js', 'save.js', 'rules.js', 'campaign.js', 'art.js']) vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), { filename: f });
vm.runInThisContext(fs.readFileSync(path.join(__dirname, 'reference.js'), 'utf8'), { filename: 'reference.js' });

// node tools/simtest.js [battles] [--ref] [--regions=2,3]: --ref runs only the reference-party balance report, for the
// regions listed (I is 1; every region when none are given).
const ARGS = process.argv.slice(2), N = Number(ARGS.find(x => /^\d+$/.test(x))) || 300;
const REGION_ARG = (ARGS.find(x => x.startsWith('--regions=')) || '').slice(10).split(',').filter(Boolean).map(x => Number(x) - 1);
if (ARGS.includes('--ref')) { referenceReport(Math.max(20, Math.round(N / 3)), { regions: REGION_ARG.length ? REGION_ARG : null }); process.exit(0); }
const EVENTS = new Set(['start', 'round', 'enrage', 'turn', 'tick', 'act', 'hit', 'miss', 'heal', 'revive', 'status', 'die', 'delay', 'end', 'item', 'mana',
  'resist', 'skip', 'summon', 'swap', 'quick', 'maxhp', 'steal', 'counter', 'saved', 'broke', 'cleanse', 'strip', 'corpse', 'refill', 'sprung', 'step', 'phase', 'flee']);
// Region II isn't built yet (step 7), so the rules and item experiments use the prototype's Black Font, kept here.
const FONT = { id: 'T-F', name: 'The Black Font', region: 1, level: 4, boss: true, foes: ['bishop', 'bloat', 'acolyte', null, 'bellwraith', 'acolyte'] };
const stageOf = id => (id === FONT.id ? FONT : STAGES.find(st => st.id === id));
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
    if (e.t === 'summon') { if (units[e.unit.id]) fail('summoned twice ' + e.unit.id, res.seed, stage); units[e.unit.id] = Object.assign({}, e.unit); }
    if (e.t === 'maxhp') units[e.who].maxHp = e.maxHp;
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
      if (!t) { fail(`${e.t} on an unknown unit`, res.seed, stage); continue; }
      if (!t.alive) fail(`${e.t} on a fallen unit ${t.id}`, res.seed, stage);
      if (e.hp < 0 || e.hp > t.maxHp) fail(`hp out of range ${e.hp}/${t.maxHp} (${e.t})`, res.seed, stage);
      if ((e.dmg != null && !(e.dmg >= 0)) || (e.amt != null && !(e.amt >= 0))) fail(`bad amount ${JSON.stringify(e)}`, res.seed, stage);
      t.hp = e.hp;
    }
    if (e.t === 'die') { if (!units[e.who].alive) fail('dies twice ' + e.who, res.seed, stage); units[e.who].alive = false; units[e.who].hp = 0; }
    if (e.t === 'step') { const u = units[e.who]; if (!u || !u.alive || u.slot < 2 || e.slot > 1) fail(`bad step ${JSON.stringify(e)}`, res.seed, stage); else if (Object.values(units).some(x => x.alive && x.side === u.side && x.slot === e.slot && x !== u)) fail(`stepped into a taken slot ${JSON.stringify(e)}`, res.seed, stage); else u.slot = e.slot; }
    if (e.t === 'swap') { for (const [id, k] of [[e.a, 0], [e.b, 1]]) if (id && units[id]) units[id].slot = e.slots[k]; }
    if (e.t === 'phase' && (!units[e.who] || !units[e.who].alive)) fail(`phase on a fallen unit ${e.who}`, res.seed, stage);
    if (e.t === 'flee') { if (!units[e.who].alive) fail('a fallen unit flees', res.seed, stage); units[e.who].alive = false; }
    if (e.t === 'revive') { if (units[e.tgt].alive) fail('revives a living unit', res.seed, stage); units[e.tgt].alive = true; units[e.tgt].hp = e.hp; }
    if (e.t === 'item') {
      // the party's items: each slot once (unless refilled), its own item, used by hand or by an item rule, never mid-turn
      if (res.loadout[e.slot] !== e.item || usedSlots.has(e.slot)) fail(`item slot ${e.slot} misused ${JSON.stringify(e)}`, res.seed, stage);
      usedSlots.add(e.slot);
      if (e.by === 'rule' && (!res.partyRules[e.prule] || res.partyRules[e.prule].do !== e.item)) fail(`item rule ${e.prule} does not match`, res.seed, stage);
      if (e.by !== 'rule' && e.by !== 'hand') fail('item used by ' + e.by, res.seed, stage);
      if (!e.targets.length) fail('item with no targets', res.seed, stage);
      current = null;
    }
    if (e.t === 'refill') usedSlots.delete(e.slot);
    if (e.t === 'mana') { const u = units[e.tgt]; if (!u.alive || e.mp < 0 || e.mp > u.maxMp) fail(`bad mana ${JSON.stringify(e)}`, res.seed, stage); }
    if (e.t === 'status' && e.on && !units[e.who].alive) fail(`status ${e.key} on a fallen unit`, res.seed, stage);
    if (e.t === 'end') ends++;
  }
  if (ends !== 1) fail('end events: ' + ends, res.seed, stage);
  for (const f of res.final) if (!units[f.id] || f.alive !== units[f.id].alive || f.hp !== units[f.id].hp) fail(`final state of ${f.id} differs from replay`, res.seed, stage);
  const sideAlive = s => res.final.some(u => u.side === s && u.alive);
  if (res.winner === 0 && sideAlive(1)) fail('party won with foes standing', res.seed, stage);
  if (res.winner === 1 && res.final.some(u => u.side === 0 && u.alive && !u.thrall) && !res.stalled) fail('foes won with heroes standing', res.seed, stage);
}

const pad = (s, n) => String(s).padEnd(n), lpad = (s, n) => String(s).padStart(n);
// The prototype's state: the party of six that saves before build step 5 started with.
const protoState = () => { const st = defaultState(); st.roster = PARTY.map((cls, i) => Hero.create(cls, 'c' + (i + 1))); st.party = st.roster.map(c => c.id); st.nextId = 7; return st; };
const avg = a => (a.reduce((s, x) => s + x, 0) / Math.max(1, a.length));
const ok = (cond, msg) => { if (!cond) problems.push('test: ' + msg); };
let totalStalls = 0;
const t0 = Date.now();

// A party built the way a sensible player might, at a level.
function builtParty(level, seedKey = '', o = {}) {
  const rng = makeRng(strSeed('party:' + level + seedKey));
  return PARTY.map((cls, i) => {
    const c = Hero.autoBuild(Hero.create(cls, 'c' + (i + 1), { rng, level }));
    if (o.lesson) { c.lessons.skill = 1; Hero.fixEquip(c); const acts = Hero.actives(c).filter(id => !c.equip.includes(id)); c.equip = c.equip.map(x => x || acts.shift() || null); }
    return c;
  });
}
function partySetup(chars, rulesOf) {
  return { party: chars.map(c => Hero.spec(c, rulesOf ? rulesOf(c) : CLASSES[c.cls].rules)), partyRules: PARTY_RULES.rules, loadout: LOADOUT.items };
}

// ── Region I's stages with the default party: level-1 recruits and their starter rules (the later regions are
// played by the reference party, at the end)
const STAGES_I = STAGES.filter(st => st.region === 0);
console.log('Every Region I stage with the starting party (level 1, starter skill only, starter rules)');
Tactics.useRoster(builtParty(1, 'start'));
for (const stage of STAGES_I) {
  let wins = 0, rounds = [], acts = [], falls = 0, stalls = 0, enraged = 0, hpLeft = 0, anyKo = 0;
  const use = {};
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
    for (const u of res.final) if (u.side === 0 && !u.thrall) { ko += res.stats[u.id].falls; hp += u.hp; max += u.maxHp; }
    falls += ko; if (ko) anyKo++; hpLeft += hp / max;
    for (const e of res.log) if (e.t === 'act') {
      const k = (res.start.find(u => u.id === e.who) || { key: '?' }).key;
      (use[k] = use[k] || {})[e.skill] = (use[k][e.skill] || 0) + 1;
    }
  }
  totalStalls += stalls;
  console.log(`\n${stage.id} ${pad(stage.name, 20)} lv ${lpad(stage.level, 2)}  win ${lpad((100 * wins / N).toFixed(0), 3)}%  rounds avg ${avg(rounds).toFixed(1)} (min ${Math.min(...rounds)}, max ${Math.max(...rounds)})  turns avg ${avg(acts).toFixed(1)}  party HP left ${(100 * hpLeft / N).toFixed(0)}%  battles with a KO ${(100 * anyKo / N).toFixed(0)}% (${(falls / N).toFixed(2)} KOs)  reached enrage ${(100 * enraged / N).toFixed(0)}%  stalls ${stalls}`);
  for (const k of Object.keys(use)) console.log('   ' + pad(k, 12) + Object.entries(use[k]).map(([s, c]) => `${s} ${(c / N).toFixed(1)}`).join(' · '));
}

// ── Levels: the same battles with the party built at each level
{
  const M = Math.max(40, Math.round(N / 5)), LVS = [1, 3, 5, 8, 12, 20, 50];
  console.log(`\nThe party built at each level, Region I (${M} battles each; win %, rounds, knockouts per battle)`);
  console.log('   ' + pad('stage', 22) + LVS.map(l => lpad('Lv ' + l, 18)).join(''));
  const table = {};
  for (const stage of STAGES_I) {
    const row = [];
    for (const L of LVS) {
      let w = 0, r = 0, ko = 0;
      for (let i = 0; i < M; i++) {
        const res = simulate(stageSetup(stage, strSeed(stage.id + ':lv:' + i), partySetup(builtParty(L, ':' + i))));
        check(res, stage);
        if (res.stalled) totalStalls++;
        if (res.winner === 0) w++;
        r += res.rounds;
        for (const u of res.start) if (u.side === 0) ko += res.stats[u.id].falls;
      }
      table[stage.id + ':' + L] = { win: w / M, rounds: r / M, ko: ko / M };
      row.push(lpad(`${Math.round(100 * w / M)}% ${(r / M).toFixed(1)}r ${(ko / M).toFixed(2)}`, 18));
    }
    console.log('   ' + pad(`${stage.id} ${stage.name}`, 22) + row.join(''));
  }
  const hard = STAGES_I[STAGES_I.length - 1].id;
  ok(table[hard + ':1'].win < table[hard + ':12'].win, `levels don't change the ${hard} win rate`);
  ok(table['1-3:1'].rounds > table['1-3:20'].rounds, 'higher levels should end 1-3 sooner');
}

// ── Skills: the same party and seeds with different skills equipped
{
  const M = Math.max(60, Math.round(N / 3)), stage = stageOf('1-18');
  console.log(`\nSkills on 1-18, the Sexton, level 11 party (${M} battles each)`);
  const run = (name, edit) => {
    let w = 0, r = 0, ko = 0, dealt = 0;
    for (let i = 0; i < M; i++) {
      const chars = builtParty(11, ':sk' + i);
      edit(chars);
      const res = simulate(stageSetup(stage, strSeed('sk' + i), partySetup(chars, c => (c.rulesOverride || CLASSES[c.cls].rules))));
      check(res, stage);
      if (res.winner === 0) w++;
      r += res.rounds;
      for (const u of res.start) if (u.side === 0) { ko += res.stats[u.id].falls; dealt += res.stats[u.id].dealt; }
    }
    console.log(`   ${pad(name, 46)} win ${lpad(Math.round(100 * w / M), 3)}%  rounds ${(r / M).toFixed(1)}  KOs ${(ko / M).toFixed(2)}  party damage ${Math.round(dealt / M)}`);
    return { w, r, ko, dealt };
  };
  const base = run('Auto-built: starter skills equipped', () => {});
  const none = run('No skills equipped (basic attacks only)', ch => ch.forEach(c => { c.equip = c.equip.map(() => null); }));
  const lv5 = run('Every learned skill raised to level 5 (free)', ch => ch.forEach(c => { for (const id in c.skills) c.skills[id] = 5; }));
  const sword = run('Sellsword equips Lunge with a rule for it', ch => { const s = ch.find(c => c.cls === 'sellsword'); s.skills.lunge = Math.max(1, s.skills.lunge || 0); s.equip = ['lunge']; s.rulesOverride = [{ if: 'foe_hp_lt', n: 50, do: 'lunge' }, { if: 'always', do: 'lunge' }]; });
  ok(none.dealt < base.dealt && none.ko >= base.ko, 'battles without skills should deal less damage and cost more knockouts');
  ok(lv5.r < base.r, 'level-5 skills should end battles sooner than level-1 ones');
  ok(sword.w >= 0, 'sellsword lunge run');
}

// ── Rules experiments: the same seeds with different rules, to show the rules change what happens.
const M = Math.max(100, Math.round(N / 2));
// Each hero's id in the rules model is their character's.
const charOfCls = cls => Tactics.roster().find(c => c.cls === cls);
const byKey = (res, k) => res.start.find(u => u.key === k && u.side === 0);
// Level 5 with one Masters' Hall lesson: the Pilgrim knows Mend and Last Rites and has both equipped.
Tactics.useRoster(builtParty(5, 'rules', { lesson: true }));
function trial(stageId, edit) {
  const stage = stageOf(stageId);
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
  }
  totalStalls += out.stalls;
  return out;
}
const line = (name, r) => console.log(`   ${pad(name, 34)} win ${lpad((100 * r.wins / M).toFixed(0), 3)}%  rounds ${(r.rounds / M).toFixed(1)}  KOs ${(r.kos / M).toFixed(2)}  Pilgrim healed ${lpad(Math.round(r.healed / M), 4)}  Mend ${(r.mend / M).toFixed(1)}  items ${(r.items / M).toFixed(2)}  focus ${(r.focus / M).toFixed(1)}`);
const setRules = (tac, cls, rules) => { tac.party.find(p => p && p.key === cls).rules = rules; };
const noDraught = tac => { tac.partyRules = tac.partyRules.filter(r => PARTY_ACTIONS[r.do].kind !== 'item'); };
const healFirst = [{ if: 'ally_fallen', do: 'rites' }, { if: 'ally_hp_lt', n: 50, do: 'mend' }, { if: 'always', do: 'smite' }];
const healLast = [{ if: 'always', do: 'smite' }, { if: 'ally_fallen', do: 'rites' }, { if: 'ally_hp_lt', n: 50, do: 'mend' }];

console.log(`\nRules experiments (${M} battles each, same seeds; a level-5 party)`);
for (const id of ['1-9', FONT.id]) {
  console.log(` ${id} ${stageOf(id).name}, without item rules so the Pilgrim is the only healer`);
  const a = trial(id, t => { noDraught(t); setRules(t, 'pilgrim', healFirst); });
  const b = trial(id, t => { noDraught(t); setRules(t, 'pilgrim', healLast); });
  const off = trial(id, t => { noDraught(t); for (const p of t.party) if (p) p.rules = p.rules.map(r => Object.assign({}, r, { on: false })); });
  line('Pilgrim: heal rules first', a); line('Pilgrim: heal rules last', b); line('Every hero rule switched off', off);
  ok(b.mend === 0, `${id}: Mend fired ${b.mend} times with "Always → Smite" above it`);
  ok(a.healed > b.healed * 2, `${id}: heal-first healing ${a.healed} is not well above heal-last ${b.healed}`);
  ok(off.ruleFires === 0, `${id}: switched-off rules fired ${off.ruleFires} times`);
  ok(a.kos <= b.kos, `${id}: heal-first KOs ${a.kos} above heal-last ${b.kos}`);
}
console.log(` ${FONT.id} The Black Font: party rules`);
const d0 = trial(FONT.id, noDraught);
const d1 = trial(FONT.id, t => { t.loadout = ['draught', 'draught']; t.partyRules = [{ if: 'ally_hp_lt', n: 30, do: 'draught' }]; });
const d2 = trial(FONT.id, t => { t.loadout = ['draught', 'salts']; t.partyRules = [{ if: 'ally_fallen', do: 'salts' }, { if: 'ally_hp_lt', n: 30, do: 'draught' }]; });
const d3 = trial(FONT.id, t => { t.loadout = []; });
const f1 = trial(FONT.id, t => { noDraught(t); t.partyRules.forEach(r => { if (r.do === 'focus') r.on = true; }); });
const f2 = trial(FONT.id, t => { noDraught(t); t.partyRules = [{ if: 'foe_highest_pow', do: 'focus', on: true }]; });
line('No item rules', d0); line('2 draughts, ally below 30% → draught', d1); line('Salts and a draught, both with rules', d2); line('Default rules, nothing packed', d3);
line('Focus fire: foe with lowest health', f1); line('Focus fire: foe with highest attack', f2);
ok(d0.items === 0 && d3.items === 0, 'items were used with no item rule, or with nothing packed');
ok(d1.draughts > d2.draughts && d2.items > d2.draughts, 'item rules did not use what was packed');
ok(d1.kos < d0.kos, `draughts did not reduce KOs (${d1.kos} vs ${d0.kos})`);
ok(f1.focus > 0 && f2.focus > 0 && d0.focus === 0, 'focus fire never aimed an attack, or aimed one while off');

// Items used by hand: the battle is simulated again with the input added. Everything before that turn must be the
// same, the item must land just before it, and nobody's turn is spent on it.
{
  const stage = FONT;
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

// ── Fuzz: random characters of all twelve classes, at random levels, with random builds, threshold choices and rules
{
  const F = Math.max(300, N * 2), rng = makeRng(99), used = {}, kinds = {};
  let n = 0;
  const conds = ['always', 'front_foe', 'foe_lowest', 'ally_hp_lt', 'self_hp_lt', 'foe_charging', 'ally_fallen', 'foes_at_least', 'foe_without', 'self_without', 'ally_has', 'battle_start'];
  const pickOf = list => list[Math.floor(rng() * list.length)];
  for (let i = 0; i < F; i++) {
    const stage = STAGES[i % STAGES.length];
    const party = [];
    for (let s = 0; s < 6; s++) {
      if (rng() < 0.15) { party.push(null); continue; }
      const cls = pickOf(CLASS_ORDER), c = Hero.create(cls, 'c' + s, { rng, level: 1 + Math.floor(rng() * 200) });
      for (const t of Hero.pending(c)) {
        const o = Hero.options(c, t);
        const ch = o.combine.length && rng() < 0.6 ? { kind: 'combine', cls: pickOf(o.combine) } : o.awaken && rng() < 0.3 ? { kind: 'awaken' } : { kind: 'tier', cls: pickOf(o.tier.length ? o.tier : c.classes) };
        if (!Hero.choose(c, t, ch)) Hero.choose(c, t, { kind: 'awaken' });
      }
      const all = c.classes.flatMap(k => [CLASSES[k].starter, ...CLASSES[k].tree.flat()]);
      for (let k = 0; k < 120; k++) { const id = pickOf(all); Hero.learn(c, id); if (Hero.skill(c, id).canAwaken) Hero.awaken(c, id); }
      for (let k = 0; k < 250; k++) Hero.allocate(c, pickOf([...STAT_KEYS, ...RES_KEYS.map(x => 'res:' + x)]), 1);
      if (rng() < 0.2) c.lessons.skill = 2;
      const acts = Hero.actives(c);
      for (let k = 0; k < Hero.activeSlots(c); k++) Hero.equip(c, k, pickOf(acts));
      const rules = c.equip.filter(Boolean).map(a => ({ if: pickOf(conds), n: 50, s: pickOf(['doom', 'hidden', 'kindled', 'bleed', 'riposte']), do: a }));
      if (rng() < 0.3) rules.push({ if: 'self_hp_lt', n: 50, do: 'defend' });
      party.push(Hero.spec(c, rules));
      kinds[cls] = (kinds[cls] || 0) + 1;
    }
    if (!party.some(Boolean)) continue;
    const setup = { seed: i + 1, party, foes: stage.foes, level: 1 + Math.floor(rng() * 150), partyRules: PARTY_RULES.rules, loadout: ['draught', 'salts', 'tincture', 'lampoil'] };
    let res;
    try { res = simulate(setup); } catch (e) { problems.push(`fuzz ${i}: ${e.stack.split('\n').slice(0, 3).join(' | ')}`); continue; }
    check(res, stage);
    if (res.stalled) totalStalls++;
    if (i < 20 && JSON.stringify(simulate(setup).log) !== JSON.stringify(res.log)) problems.push(`fuzz ${i}: not deterministic`);
    n++;
    for (const e of res.log) if (e.t === 'act') used[e.skill] = (used[e.skill] || 0) + 1;
  }
  const actives = Object.keys(SKILLS).filter(id => SKILLS[id].cls && SKILLS[id].kind === 'active' && !SKILLS[id].transform && !SKILLS[id].basic);
  // Every active, at level 5 and awakened, each with a passive or two of its class, against two stages.
  let runs = 0;
  for (const id of actives) for (const A of [false, true]) {
    const sk = SKILLS[id], cls = sk.cls, c = Hero.create(cls, 'c0', { rng, level: 120 });
    for (const k of c.classes) c.tiers[k] = HERO.TIERS;
    c.skills[id] = 5; if (A) { c.awakenSlots = 1; c.awakened = [id]; }
    const pas = CLASSES[cls].tree.flat().filter(x => SKILLS[x].kind !== 'active');
    for (let k = 0; k < 3; k++) c.skills[pickOf(pas)] = 1 + Math.floor(rng() * 5);
    // A few skills need something to work on: Doom to burst, fire to flash over, a fallen ally to raise.
    const enabler = { maleficburst: 'doom', flashover: 'fireflask' }[id];
    if (enabler) c.skills[enabler] = 5;
    c.equip = enabler ? [id, enabler] : [id];
    const others = PARTY.filter(k => k !== cls).slice(0, 4).map((k, j) => Hero.spec(Hero.autoBuild(Hero.create(k, 'o' + j, { rng, level: sk.revive ? 1 : 60 })), CLASSES[k].rules));
    const party = [Hero.spec(c, [{ if: 'always', do: id }, ...(enabler ? [{ if: 'always', do: enabler }] : [])]), ...others, null];
    const melee = sk.range === 'melee' && !sk.reach;
    if (!melee && CLASSES[cls].row === 'back') [party[0], party[2]] = [party[2], party[0]];
    for (const stage of [STAGES[1], STAGES[5]]) {
      const setup = { seed: strSeed(id + A + stage.id), party, foes: stage.foes, level: 110, partyRules: PARTY_RULES.rules, loadout: ['draught', 'salts'] };
      try { const res = simulate(setup); check(res, stage); runs++; if (res.stalled) totalStalls++; for (const e of res.log) if (e.t === 'act') used[e.skill] = (used[e.skill] || 0) + 1; }
      catch (e) { problems.push(`${id}${A ? ' (awakened)' : ''}: ${e.stack.split('\n').slice(0, 3).join(' | ')}`); }
    }
  }
  const never = actives.filter(id => !used[id]);
  console.log(`\nFuzz: ${n} battles with random builds of all ${CLASS_ORDER.length} classes (levels 1–200, threshold choices, combined classes, awakenings), then ${runs} with each active at level 5, plain and awakened. ${actives.length - never.length} of ${actives.length} hero actives were used${never.length ? '; never used: ' + never.join(', ') : ''}.`);
  ok(never.length <= 3, 'some actives never fired: ' + never.join(', '));
}

// ── Gear: every item's effect seen firing, what a weapon's rarity does to a fight, and the item model
{
  // A test-only foe that stuns and staggers (no stage foe does yet), for the Ironbound Collar.
  SKILLS.teststun = { id: 'teststun', name: 'Test Stun', icon: 'stun', fx: 'knell', shape: 'foe', range: 'magic', power: 0.4, st: [{ k: 'stunned', t: 1 }], push: 0.3 };
  FOES.teststunner = { name: 'Test Stunner', hp: 160, mp: 0, pow: 12, def: 3, spd: 12, crit: 0, dodge: 0, mpGain: 0, basic: 'teststun', skills: [], rules: [], res: { stun: 0, move: 0, bleed: 0, blight: 0, curse: 0, debuff: 0 } };
  // And one that Bleeds and Dooms, for the Drowned Mail.
  SKILLS.testcurse = { id: 'testcurse', name: 'Test Curse', icon: 'doom', fx: 'doom', shape: 'foe', range: 'magic', power: 0.3, st: [{ k: 'bleed', t: 2, p: 0.2 }, { k: 'doom', t: 2, p: 0.2 }] };
  FOES.testcurser = Object.assign({}, FOES.teststunner, { name: 'Test Curser', basic: 'testcurse' });
  const STUNNER = { id: 'T-1', name: 'Test', level: 20, foes: ['teststunner', 'teststunner', null, 'teststunner', null, null] };
  const CURSER = { id: 'T-2', name: 'Test', level: 20, foes: ['testcurser', 'testcurser', null, 'testcurser', null, null] };
  const rng = makeRng(404), pickOf = list => list[Math.floor(rng() * list.length)];
  // A character of a class at a level, every tree open and every skill at level 5, with five active slots.
  function full(cls, id, level = 200) {
    const c = Hero.create(cls, id, { rng, level });
    for (const k of c.classes) c.tiers[k] = HERO.TIERS;
    for (const sid of [CLASSES[cls].starter, ...CLASSES[cls].tree.flat()]) c.skills[sid] = 5;
    c.lessons.skill = 2;
    return c;
  }
  // A plainer character, for effects that need the wearer to be hit by statuses, or an ally to fall.
  function plain(cls, id, level = 40) { const c = Hero.autoBuild(Hero.create(cls, id, { rng, level })); for (const sid of NEEDS_OF(cls)) c.skills[sid] = Math.max(1, c.skills[sid] || 0); c.lessons.skill = 2; return c; }
  const NEEDS_OF = cls => (cls === 'pilgrim' ? ['rites', 'mend'] : []);
  // The skills an item needs used to show its effect.
  const NEEDS = { shutteredlantern: ['kindle'], bonfirelantern: ['kindle'], wickshears: ['lighttheway'], blackbolts: ['aimed'], repeater: ['rapidfire', 'aimed'], fencingglove: ['challenge'], philosopherspebble: ['quickbrew'],
    bellrope: ['toll'], vesperbell: ['toll'], chapelbell: ['knell'], surgeonskit: ['stitch', 'tonic'], butcherssaw: ['stitch'], surgeonsapron: ['stitch', 'tonic'], emberthurible: ['mend'], chapelcenser: ['mend'], drownedcenser: ['mend'],
    witchsknot: ['hexswarm', 'contagion'], hexedkris: ['doom'], witchironsickle: ['doom'], mourningblade: ['doom'], twinstilettos: ['backstab'], widowskiss: ['envenom'], fencesledger: ['pickpocket'], oathboundgorget: ['guard', 'cover'],
    watchmansflail: ['guard'], bastionplate: ['guard'], gravecutter: ['cleave'], fingerbone: ['rites'], bishopscrozier: ['rites'], penitentsrags: ['mend'], ossuaryrod: [CLASSES.gravecaller.starter], barrowkingstaff: [CLASSES.gravecaller.starter], phylactery: [CLASSES.gravecaller.starter] };
  // Who wears it: a weapon's class, a class-only accessory's class, or a hero that suits the effect.
  const WEARER = { halberdiershook: 'sellsword', huntershauberk: 'warden', thornmail: 'warden', ashenplate: 'warden', drownedmail: 'sellsword', bastionplate: 'warden', sellswordsjack: 'sellsword', vanguardsbadge: 'sellsword',
    penitentsrags: 'pilgrim', mothsilk: 'lamplighter', gravediggersleathers: 'duellist', shadowweave: 'duellist', courierspur: 'crossbowman', earstoppers: 'hexblade', ironboundcollar: 'sellsword', gravediggersspade: 'crossbowman', hollowcrown: 'hexblade' };
  const STAGE_FOR = { huntershauberk: ['1-4', '1-15'], mothlure: ['1-10', '1-13', '1-17'], earstoppers: ['1-18'], ironboundcollar: ['T-1'], drownedmail: ['T-2'], marshalsblade: ['1-6', '1-7', '1-10'] };
  const ownerOf = id => { const D = GEAR[id]; return D.slot === 'weapon' ? WEAPON_TYPES[D.type].cls : D.cls || WEARER[id] || pickOf(CLASS_ORDER); };
  const withFx = GEAR_ORDER.filter(id => GEAR[id].fx);
  GEAR_TRACK.on = {};
  let runs = 0;
  const HARD = ['fingerbone', 'bishopscrozier', 'gravediggersspade'], PLAIN = HARD.concat(['drownedmail', 'ironboundcollar']);
  for (const id of withFx) {
    for (let i = 0; i < (HARD.includes(id) ? 16 : 8); i++) {
      const cls = ownerOf(id), c = PLAIN.includes(id) ? plain(cls, 'w0') : full(cls, 'w0');
      const acts = Hero.actives(c), need = (NEEDS[id] || []).filter(x => c.skills[x]);
      const rest = acts.filter(x => !need.includes(x)).sort(() => rng() - 0.5);
      c.equip = need.concat(rest).slice(0, Hero.activeSlots(c));
      c.gear[GEAR[id].slot] = Items.make(id, 20);
      const rules = c.equip.map(a => (a === 'rites' ? { if: 'ally_fallen', do: a } : { if: 'always', do: a }));
      if (i % 2) rules.push(rules.shift());
      const wearer = Hero.spec(c, rules);
      // The rest of the party: built heroes with a Pilgrim to heal, at a lower level so that some fall.
      const others = ['warden', cls === 'pilgrim' ? 'hexblade' : 'pilgrim', 'sellsword', 'crossbowman', 'lamplighter'].map((k, j) => Hero.spec(Hero.autoBuild(Hero.create(k, 'o' + j, { rng, level: HARD.includes(id) ? 10 + Math.floor(rng() * 20) : 40 + Math.floor(rng() * 60) })), CLASSES[k].rules));
      const front = id === 'halberdiershook' ? false : id === 'mothlure' ? true : CLASSES[cls].row === 'front' || ['sellswordsjack', 'vanguardsbadge', 'ashenplate', 'thornmail', 'huntershauberk'].includes(id);
      const party = front ? [wearer, others[0], others[1], others[2], others[3], others[4]] : [others[0], others[2], wearer, others[1], others[3], others[4]];
      if (cls === 'gravecaller') party[4] = party[5] = null; // room for thralls
      const ids = STAGE_FOR[id] || STAGES.map(s => s.id);
      const stage = ids[i % ids.length] === 'T-1' ? STUNNER : ids[i % ids.length] === 'T-2' ? CURSER : stageOf(ids[i % ids.length]);
      const setup = { seed: strSeed(id + ':' + i), party, foes: stage.foes, level: HARD.includes(id) ? 30 + Math.floor(rng() * 30) : PLAIN.includes(id) ? 30 : 30 + Math.floor(rng() * 130), partyRules: PARTY_RULES.rules, loadout: ['draught', 'salts'] };
      try { const res = simulate(setup); check(res, stage); runs++; if (res.stalled) totalStalls++; }
      catch (e) { problems.push(`item ${id}: ${e.stack.split('\n').slice(0, 3).join(' | ')}`); }
    }
  }
  // Gear in a fuzz of random builds: random pieces on random characters of every class.
  let fz = 0;
  for (let i = 0; i < Math.max(150, N); i++) {
    const stage = STAGES[i % STAGES.length], party = [];
    for (let s = 0; s < 6; s++) {
      if (rng() < 0.15) { party.push(null); continue; }
      const cls = pickOf(CLASS_ORDER), c = full(cls, 'f' + s, 1 + Math.floor(rng() * 200));
      if (rng() < 0.3) { const o = CLASS_ORDER.filter(k => k !== cls); c.classes.push(pickOf(o)); c.tiers[c.classes[1]] = 3; }
      const acts = Hero.actives(c).sort(() => rng() - 0.5);
      c.equip = acts.slice(0, Hero.activeSlots(c));
      for (const slot of SLOTS) {
        if (rng() < 0.15) { c.gear[slot] = null; continue; }
        const pool = GEAR_ORDER.filter(g => GEAR[g].slot === slot && Items.canUse(c, Items.make(g)));
        c.gear[slot] = Items.make(pickOf(pool), 1 + Math.floor(rng() * 150));
      }
      party.push(Hero.spec(c, c.equip.map(a => ({ if: pickOf(['always', 'front_foe', 'foe_lowest', 'ally_hp_lt', 'self_hp_lt', 'ally_fallen']), n: 50, do: a }))));
    }
    if (!party.some(Boolean)) continue;
    const setup = { seed: 9000 + i, party, foes: stage.foes, level: 1 + Math.floor(rng() * 150), partyRules: PARTY_RULES.rules, loadout: ['draught', 'salts', 'tincture', 'lampoil'] };
    let res;
    try { res = simulate(setup); } catch (e) { problems.push(`gear fuzz ${i}: ${e.stack.split('\n').slice(0, 3).join(' | ')}`); continue; }
    check(res, stage); fz++;
    if (res.stalled) totalStalls++;
    if (i < 10 && JSON.stringify(simulate(setup).log) !== JSON.stringify(res.log)) problems.push(`gear fuzz ${i}: not deterministic`);
  }
  const fired = GEAR_TRACK.on, never = withFx.filter(id => !fired[id]);
  GEAR_TRACK.on = null;
  console.log(`\nGear: ${runs} battles with each item worn by a hero who uses it, and ${fz} with random gear on random builds. ${withFx.length - never.length} of ${withFx.length} item effects fired${never.length ? '; never: ' + never.join(', ') : ''}.`);
  ok(!never.length, 'some item effects never fired: ' + never.join(', '));
  const quiet = withFx.map(id => [id, fired[id] || 0]).sort((a, b) => a[1] - b[1]).slice(0, 6);
  console.log('   Rarest to fire: ' + quiet.map(([id, n]) => `${GEAR[id].name} ${n}`).join(' · '));

  // What a weapon's rarity does: the same party and seeds with no weapon, then a Common, a Fine and a Rare one.
  const M = Math.max(60, Math.round(N / 3));
  console.log(`\nWeapons by rarity (${M} battles each, same seeds; the party built 3 levels under the stage, item level = stage level)`);
  console.log('   ' + pad('stage', 24) + ['None', 'Common', 'Fine', 'Rare'].map(r => lpad(r, 22)).join(''));
  const table = {};
  for (const sid of ['1-9', '1-14', '1-18']) {
    const stage = stageOf(sid), row = [];
    for (const rar of [null, 'common', 'fine', 'rare']) {
      let w = 0, r = 0, ko = 0, dealt = 0;
      for (let i = 0; i < M; i++) {
        const chars = builtParty(Math.max(1, stage.level - 3), ':wr' + i);
        for (const c of chars) {
          const pool = GEAR_ORDER.filter(g => GEAR[g].type === WEAPON_OF[c.cls] && GEAR[g].rarity === rar);
          c.gear.weapon = rar ? Items.make(pool[i % pool.length], stage.level) : null;
        }
        const res = simulate(stageSetup(stage, strSeed('wr' + sid + i), partySetup(chars)));
        check(res, stage);
        if (res.stalled) totalStalls++;
        if (res.winner === 0) w++;
        r += res.rounds;
        for (const u of res.start) if (u.side === 0) { ko += res.stats[u.id].falls; dealt += res.stats[u.id].dealt; }
      }
      table[sid + ':' + rar] = { w: w / M, dealt: dealt / M, r: r / M, ko: ko / M };
      row.push(lpad(`${Math.round(100 * w / M)}% ${(r / M).toFixed(1)}r ${(ko / M).toFixed(1)}ko ${Math.round(dealt / M)}`, 22));
    }
    console.log('   ' + pad(`${sid} ${stage.name} lv ${stage.level}`, 24) + row.join(''));
  }
  console.log('   (win %, rounds, knockouts per battle, party damage)');
  for (const sid of ['1-9', '1-14', '1-18']) ok(table[sid + ':common'].w >= table[sid + ':null'].w - 0.05, `${sid}: a Common weapon should lose no more often than none`);
  // Damage a round, not rounds: a party with no weapon can also end a battle sooner by losing it (build step 7 fixed the
  // Mourner's Dirge, which makes 1-14 harder without one).
  const perRound = k => table[k].dealt / table[k].r;
  ok(perRound('1-14:common') >= perRound('1-14:null'), `a Common weapon should deal at least as much damage a round on 1-14 as none (${Math.round(perRound('1-14:common'))} vs ${Math.round(perRound('1-14:null'))})`);
  ok(table['1-18:rare'].w >= table['1-18:common'].w - 0.05, 'Rare weapons should win 1-18 about as often as Common ones, or more');

  // The item model
  ok(GEAR_ORDER.length === 92, `92 items (got ${GEAR_ORDER.length})`);
  const count = f => GEAR_ORDER.filter(f).length;
  ok(count(id => GEAR[id].slot === 'weapon' && GEAR[id].rarity !== 'relic') === 42 && count(id => GEAR[id].slot === 'armor' && GEAR[id].rarity !== 'relic') === 15 && count(id => GEAR[id].slot === 'accessory' && GEAR[id].rarity !== 'relic') === 30 && count(id => GEAR[id].cls) === 12 && RELICS.length === 5, 'the content spec’s counts: 42 weapons, 15 armour, 30 accessories (12 class-only), 5 Relics');
  for (const cls of CLASS_ORDER) for (const r of ['common', 'fine', 'rare']) ok(count(id => GEAR[id].type === WEAPON_OF[cls] && GEAR[id].rarity === r) >= 1, `${cls} has a ${r} weapon`);
  for (const id of GEAR_ORDER) { const b = Items.bands(Items.make(id, 1), { row: 'front' }); ok(b.good.length + b.bad.length + b.when.length > 0, id + ': the card says something'); }
  const lv1 = Items.stats(Items.make('rustedplate', 1)), lv16 = Items.stats(Items.make('rustedplate', 16));
  ok(lv1.hp === 35 && lv1.def === 4 && lv1.spd === -1 && lv16.hp === 70 && lv16.def === 8 && lv16.spd === -1, `plain stats grow with item level, costs don't (${JSON.stringify(lv16)})`);
  const rr = makeRng(7), tally = (region, rank) => { const t = { common: 0, fine: 0, rare: 0 }; for (let i = 0; i < 6000; i++) t[Items.rarity(Items.roll(5, region, rr, { rank }))]++; return t; };
  const t0 = tally(0, 'normal'), tb = tally(0, 'boss'), t4 = tally(4, 'elite');
  ok(Math.abs(t0.common / 6000 - 0.7) < 0.03 && Math.abs(t0.rare / 6000 - 0.05) < 0.015, `Region I rolls 70/25/5 (${JSON.stringify(t0)})`);
  ok(Math.abs(tb.common / 6000 - 0.5) < 0.03 && Math.abs(tb.rare / 6000 - 0.25) < 0.03, `a Region I boss rolls 50/25/25 (${JSON.stringify(tb)})`);
  ok(Math.abs(t4.common / 6000 - 0.15) < 0.03 && Math.abs(t4.rare / 6000 - 0.35) < 0.03, `a Region V elite rolls 15/50/35 (${JSON.stringify(t4)})`);
  for (let i = 0; i < 300; i++) { const x = Items.roll(1 + i, i % 5, rr, { classes: ['pilgrim', 'warden'] }); const D = Items.def(x); ok(D.rarity !== 'relic' && x.lv === 1 + i && (D.slot !== 'weapon' || ['censer', 'mace'].includes(D.type)) && (!D.cls || ['pilgrim', 'warden'].includes(D.cls)), 'a roll follows the roster: ' + x.id); }
  const S0 = protoState();
  ok(S0.roster.every(c => c.gear.weapon && GEAR[c.gear.weapon.id].type === WEAPON_OF[c.cls] && Items.rarity(c.gear.weapon) === 'common'), 'every recruit carries a Common weapon of their type');
  const g0 = S0.currencies.gold;
  for (let i = 0; i < ITEM.BAG; i++) ok(Items.add(S0, Items.roll(3, 0, rr)).added, 'the Bag takes 60');
  const over = Items.add(S0, Items.make('notchedsword', 5));
  ok(!over.added && over.sold === Items.sellPrice(Items.make('notchedsword', 5)) && S0.currencies.gold === g0 + over.sold, 'a full Bag sells new gear on the spot');
  const relic = Items.grantRelic(S0, 'gravediggersspade');
  ok(relic && S0.inventory.items.length === ITEM.BAG + 1 && !Items.grantRelic(S0, 'gravediggersspade') && Items.sellPrice(relic) === 0 && !Items.sell(S0, relic.uid), 'a Relic always finds room, comes once, and does not sell');
  const sw = S0.roster.find(c => c.cls === 'sellsword'), hx = S0.roster.find(c => c.cls === 'hexblade');
  const blade = Items.make('headsmansblade', 4); S0.inventory.items.push(blade);
  ok(!Items.equip(S0, hx, blade.uid), 'a Hexblade can’t wield a sword');
  const was = sw.gear.weapon;
  ok(Items.equip(S0, sw, blade.uid) && sw.gear.weapon === blade && S0.inventory.items.includes(was) && !S0.inventory.items.includes(blade), 'equipping swaps with the Bag');
  hx.classes.push('sellsword');
  const sickle = hx.gear.weapon;
  ok(Items.canUse(hx, blade) && Items.equip(S0, hx, blade.uid) && hx.gear.weapon === blade && sw.gear.weapon === null && S0.inventory.items.includes(sickle), 'a combined Hexblade-Sellsword takes the sword from the Sellsword, and its sickle goes to the Bag');
  const gold1 = S0.currencies.gold, p = Items.sellPrice(was, S0);
  ok(Items.sell(S0, was.uid) === p && S0.currencies.gold === gold1 + p && !Items.find(S0, was.uid), 'selling a piece');
  ok(Items.unequip(S0, hx, 'weapon') && hx.gear.weapon === null && Items.find(S0, blade.uid).where === 'bag', 'unequipping into the Bag');
  const wd = Hero.create('warden', 'pb', { rng, level: 40 }); wd.gear.armor = Items.make('bastionplate', 1);
  const spd0 = Hero.geared(wd).spd; wd.skills.plateborn = 5;
  ok(Math.abs(Hero.geared(wd).spd - spd0 - 2) < 1e-9, 'Plate-born takes 2 off heavy armour’s Speed cost');
  const tc = JSON.parse(JSON.stringify(Hero.create('pilgrim', 'tc', { rng }))); tc.gear.weapon = Items.make('notchedsword'); tc.gear.armor = { id: 'nope' }; tc.gear.accessory = Items.make('rustedplate');
  const tz = Hero.sanitize(tc);
  ok(!tz.gear.weapon && !tz.gear.armor && !tz.gear.accessory, 'saved gear that doesn’t fit is dropped');
  const kept = Hero.create('lamplighter', 'kp', { rng }); kept.gear.accessory = Items.make('hollowcrown');
  ok(JSON.stringify(Hero.sanitize(JSON.parse(JSON.stringify(kept)))) === JSON.stringify(kept), 'gear survives a save round-trip');
  const sp = Hero.spec(kept);
  ok(sp.gear.includes('hollowcrown') && sp.look[2] === 'hollowcrown' && sp.look[0] === 'tinlantern', 'the battle spec carries gear effects and the look');
  const res = simulate({ seed: 3, party: [null, null, sp, null, null, null], foes: STAGES[0].foes, partyRules: [], loadout: [] });
  ok(res.start.find(u => u.side === 0).look[2] === 'hollowcrown', 'the battle log carries the look');
  console.log('Item model checked: counts, item levels, region and rank odds, starting weapons, the Bag’s 60, selling, Relics, equipping, combined classes, Plate-born, save round-trip.');
}

// ── The Hero model
{
  const rng = makeRng(5);
  for (const cls of CLASS_ORDER) {
    const C = CLASSES[cls];
    ok(C.tree.length === 3 && C.tree.every(p => p.length === HERO.TIERS), `${cls}: three paths of nine tiers`);
    for (let i = 0; i < 20; i++) { const s = Hero.roll(cls, rng); for (const k of STAT_KEYS) ok(s[k] >= C.stats[k][0] - 0.05 && s[k] <= C.stats[k][1] + 0.05, `${cls} ${k} roll ${s[k]} outside its range`); }
    for (const id of [C.starter, ...C.tree.flat()]) { const sk = SKILLS[id]; ok(sk && sk.d && sk.aw, `${id}: text`); ok(typeof skillText(sk, 3) === 'string' && !/[{}]/.test(skillText(sk, 3)), `${id}: text renders at level 3`); }
  }
  const c = Hero.create('sellsword', 'h1', { rng });
  ok(c.level === 1 && c.skills.cleave === 1 && c.equip[0] === 'cleave' && Hero.points(c).stat === 0 && Hero.points(c).skill === 0, 'a new character');
  ok(!Hero.learn(c, 'lunge'), 'no skill points at level 1');
  const g = Hero.gainXp(c, Hero.xpBetween(1, 5));
  ok(c.level === 5 && g.skillPts === 1 && Hero.points(c).stat === 4 && Hero.points(c).skill === 1, `level 5 brings 4 stat points and a skill point (got ${c.level}, ${JSON.stringify(Hero.points(c))})`);
  ok(Hero.learn(c, 'lunge') && c.skills.lunge === 1 && Hero.points(c).skill === 0, 'learning a tier-1 skill');
  ok(!Hero.learn(c, 'bountyhunter'), 'tier 2 is closed until a threshold');
  ok(c.equip.length === 1 && c.equip[0] === 'cleave', 'one active slot below 50');
  ok(Hero.equip(c, 0, 'lunge') && c.equip[0] === 'lunge', 'equipping a learned active');
  ok(!Hero.equip(c, 0, 'rend'), 'an unlearned skill can’t be equipped');
  ok(Hero.allocate(c, 'spd', 10) === 4 && Hero.points(c).stat === 0, 'placing stat points');
  const s1 = Hero.stats(c);
  ok(Math.abs(s1.spd - (c.base.spd + 0.02 * 4 + 0.8)) < 1e-9, 'speed from base, growth and points');
  Hero.gainXp(c, Hero.xpBetween(5, 30));
  ok(c.level === 30 && Hero.pending(c).join() === '30', 'the threshold at 30 waits for a choice');
  ok(Hero.options(c, 30).combine.length === 0 && !Hero.options(c, 30).awaken, '30 offers only a tier');
  ok(Hero.choose(c, 30, { kind: 'tier', cls: 'sellsword' }) && c.tiers.sellsword === 2 && c.respecs === 1, 'opening tier 2, with a free respec');
  ok(Hero.learn(c, 'bountyhunter'), 'tier 2 is open');
  Hero.allocate(c, 'res:stun', 30);
  ok(c.alloc.res.stun === 25, 'a resistance takes 25 points at most');
  Hero.gainXp(c, Hero.xpBetween(30, 50));
  ok(Hero.activeSlots(c) === 2 && c.equip.length === 2, 'a second active slot at 50');
  ok(Hero.options(c, 50).combine.length === 11, 'combining at 50');
  ok(Hero.choose(c, 50, { kind: 'combine', cls: 'hexblade' }) && c.classes.join() === 'sellsword,hexblade' && c.skills.doom === 1 && c.tiers.hexblade === 1, 'combining with the Hexblade learns Doom free');
  const spent = Hero.points(c);
  ok(Hero.respec(c, true) && c.respecs === 1 && Hero.points(c).stat === c.level - 1 && c.skills.cleave === 1 && c.skills.doom === 1 && !c.skills.lunge && c.classes.length === 2 && c.tiers.sellsword === 2, `a free respec refunds points but keeps the combination and tiers (${JSON.stringify(spent)})`);
  Hero.gainXp(c, Hero.xpBetween(50, 100));
  for (const t of Hero.pending(c)) Hero.choose(c, t, t === 100 ? { kind: 'awaken' } : { kind: 'tier', cls: 'sellsword' });
  ok(c.awakenSlots === 1 && Hero.awakenOpen(c) === 1, 'an awakening opened at 100');
  for (let i = 0; i < 5; i++) Hero.learn(c, 'cleave');
  ok(c.skills.cleave === 5 && Hero.skill(c, 'cleave').canAwaken && Hero.awaken(c, 'cleave') && Hero.points(c).skill === Math.floor(100 / 5) - 4 - 5, 'awakening a level-5 skill for 5 points');
  const spec = Hero.spec(c, []);
  ok(spec.awk.includes('cleave') && spec.sl.cleave === 5 && spec.lv === 100, 'the battle spec carries levels and awakenings');
  c.lessons.skill = 1; Hero.fixEquip(c);
  ok(Hero.activeSlots(c) === 3, 'a Masters’ Hall lesson adds an active slot');
  c.lessons.rule = 9;
  ok(Hero.ruleSlots(c) === Math.max(...c.classes.map(k => CLASSES[k].slots[1])), `rule slots stop at the highest maximum among the classes (${c.classes.join(' + ')})`);
  { const x = Hero.create('sellsword', 'rx', { rng }); x.classes.push('pilgrim'); x.lessons.rule = 9; ok(CLASSES.sellsword.slots[1] === 4 && Hero.ruleMax(x) === 6 && Hero.ruleSlots(x) === 6, 'a Sellsword combined with a Pilgrim can train up to 6 rule slots (decided overnight)'); }
  const round = Hero.sanitize(JSON.parse(JSON.stringify(c)));
  ok(JSON.stringify(round) === JSON.stringify(c), 'a character survives a save round-trip');
  const bad = Hero.sanitize({ id: 'x', cls: 'warden', level: 3, skills: { rend: 5, bash: 9, shieldwall: 2 }, alloc: { hp: 999 } });
  ok(bad && !bad.skills.rend && !bad.skills.shieldwall && bad.alloc.hp === 0 && bad.skills.guard === 1, 'bad saved data keeps only what makes sense');
  const top = Hero.create('warden', 'w', { rng, level: 200 });
  ok(top.level === 200 && top.xp === 0 && Hero.gainXp(top, 1e9).to === 200 && Hero.points(top).skill === 40 && Hero.activeSlots(top) === 3 && Hero.pending(top).length === 8, 'level 200: 40 skill points, 3 slots, 8 thresholds');
  console.log('\nHero model checked: rolls, levels, points, thresholds, combining, awakening, respec, slots, save round-trip.');
}

// ── The save: a version-1 save (step 2) upgrades to version 2
{
  const v1 = defaultState();
  v1.v = 1;
  v1.roster = PARTY.map((cls, i) => ({ id: 'c' + (i + 1), cls, name: CLASSES[cls].name, level: 1, xp: 0, stats: { hp: CLASSES[cls].hp, mp: CLASSES[cls].mp, pow: CLASSES[cls].pow, def: CLASSES[cls].def, spd: CLASSES[cls].spd, crit: CLASSES[cls].crit, dodge: CLASSES[cls].dodge }, fatigue: 0, gear: { weapon: null, armor: null, accessory: null }, rules: null, joined: 1 }));
  v1.tactics = { v: 1, heroes: { warden: { slots: 4, rules: [{ if: 'always', do: 'guard', on: true }] }, pilgrim: { slots: 2, rules: [{ if: 'ally_fallen', do: 'rites', on: true }] } }, party: { slots: 2, rules: [] }, loadout: { slots: 2, items: ['draught', null] }, known: [], sets: [{ name: 'A', heroes: { warden: [] }, party: [], loadout: [] }] };
  const s = upgrade(JSON.parse(JSON.stringify(v1)));
  ok(s.v === SAVE_VERSION && SAVE_VERSION === 5, 'save version 5');
  ok(s.roster.length === 6 && s.roster.every(c => c.base && c.level === 1 && c.equip.length === 1), 'characters upgraded');
  ok(s.roster.every(c => c.gear.weapon && GEAR[c.gear.weapon.id].type === WEAPON_OF[c.cls] && !c.gear.armor) && Array.isArray(s.inventory.items), 'version 3 gives every character a Common weapon');
  ok(s.roster[0].base.hp === CLASSES.warden.hp, 'the prototype stats became the level-1 roll');
  ok(s.tactics.heroes.c1 && s.tactics.heroes.c1.rules[0].do === 'guard' && !s.tactics.heroes.warden, 'rules moved from the class to the character');
  ok(s.tactics.sets[0].heroes.c1, 'saved sets moved too');
  ok(s.roster[0].lessons.rule === 1 && Hero.ruleSlots(s.roster[0]) === 4, 'a rule slot bought in step 2 becomes a lesson');
  const v0 = upgrade({ cleared: ['1-1'], best: { '1-1': 4 }, speed: 2 });
  ok(v0.v === SAVE_VERSION && v0.campaign.cleared.length === 0 && v0.campaign.rebuilt && v0.roster.length === 6 && v0.settings.speed === 2, 'a step 1 save still upgrades, and the rebuilt road starts at 1-1');
  const v2 = JSON.parse(JSON.stringify(protoState()));
  v2.v = 2; v2.roster.forEach(c => { c.gear = { weapon: null, armor: null, accessory: null }; c.level = 7; });
  v2.roster[1].gear = { weapon: 'Rusty sword', armor: null, accessory: null };
  v2.inventory.items = [{ id: 'bonecharm', lv: 2, uid: 'x1' }, { id: 'nope' }, 'junk', { id: 'gravecutter', lv: 9 }];
  const s3 = upgrade(v2);
  ok(s3.v === SAVE_VERSION && s3.roster.every(c => c.gear.weapon && c.gear.weapon.lv === 7) && s3.inventory.items.map(x => x.id).join() === 'bonecharm,gravecutter' && s3.inventory.items[1].uid, `version 2 → 3: weapons at the character's level, the Bag cleaned (${JSON.stringify(s3.inventory.items)})`);
  const v3 = JSON.parse(JSON.stringify(protoState()));
  v3.v = 3; delete v3.unlocks; v3.campaign = { cleared: ['1-1', '1-2', '2-3'], best: { '2-3': 9 }, current: { stage: 5, seed: 3 } }; v3.roster[0].level = 9; v3.roster[0].fatigue = 40;
  const s4 = upgrade(v3);
  ok(s4.v === SAVE_VERSION && !s4.campaign.cleared.length && !Object.keys(s4.campaign.best).length && !s4.campaign.current && s4.campaign.trip === null && s4.campaign.road.keepGoing === true && s4.campaign.rebuilt && isObj(s4.unlocks) && s4.roster[0].level === 9 && s4.roster[0].fatigue === 0, 'version 3 → 4: the rebuilt road starts at 1-1, and heroes keep their levels');
  console.log('Save migration checked: version 1 → 5 (characters, their rules, gear, the road, the camp), 2 → 5, 3 → 5, and 0 → 5.');
}

// ── The Tactics model
{
  Tactics.useRoster(PARTY.map((cls, i) => Hero.create(cls, 'c' + (i + 1), { rng: makeRng(i + 1) })));
  Tactics.reset();
  const W = 'c1', H = 'c6', P = 'c4';
  const w = Tactics.owner(W);
  ok(w.slots === 3 && w.max === 5 && w.rules.length === CLASSES.warden.rules.length, `the warden starts with its starter rules in 3 of 5 slots (${JSON.stringify(w)})`);
  ok(Tactics.add(W, { if: 'always', do: 'mace' }) && Tactics.owner(W).rules.length === 3, 'adding into the free third slot');
  ok(!Tactics.add(W, { if: 'always', do: 'mace' }), 'adding past the open slots must fail');
  ok(Tactics.slotCost(W) === 'mastershall' && Tactics.slotCost('party') === 'tactician', 'rule slots come from the Masters’ Hall and the Tactician, not for free');
  Tactics.charOf(W).lessons.rule = 1;
  ok(Tactics.owner(W).slots === 4, 'a Masters’ Hall lesson opens a rule slot');
  ok(!Tactics.add(W, { if: 'boss_present', do: 'mace' }), 'a locked condition must not be addable');
  ok(!Tactics.add(W, { if: 'always', do: 'smite' }), 'another class’s skill must not be addable');
  ok(Tactics.add(W, { if: 'always', do: 'bash' }) && Tactics.explain(W, Tactics.owner(W).rules[3]).warn, 'a rule for a skill not yet learned is kept and flagged');
  ok(Tactics.move(W, 2, 0) && Tactics.owner(W).rules[0].do === 'mace', 'moving a rule to the top');
  ok(Tactics.toggle(W, 0) && Tactics.owner(W).rules[0].on === false, 'switching a rule off');
  ok(Tactics.setup().party[0].rules[0].on === false, 'battles get the switched-off rule');
  ok(Tactics.remove(W, 0) && Tactics.owner(W).rules.length === 3, 'removing a rule');
  ok(Tactics.actions(W).includes('defend') && Tactics.actions(W).includes('guard') && !Tactics.actions(W).includes('bash'), 'actions: basic, Defend and learned actives');
  ok(!Tactics.add('party', { if: 'ally_hp_lt', n: 50, do: 'focus' }), 'focus fire must need a foe condition');
  ok(!Tactics.replace('party', 1, { if: 'self_hp_lt', n: 50 }), 'a focus rule cannot take an ally condition');
  ok(!Tactics.replace('party', 0, { if: 'self_hp_lt', n: 50 }), 'party rules have no "self"');
  ok(Tactics.conditionMenu('party').every(g => g.group !== 'self'), 'the party picker offers no "self" conditions');
  const L0 = Tactics.loadout();
  ok(L0.slots === LOADOUT.slots[0] && L0.items.join() === LOADOUT.items.join(), 'the starting loadout');
  ok(Tactics.setItem(1, 'lampoil') && Tactics.setup().loadout.join() === 'draught,lampoil', 'packing an item');
  ok(!Tactics.setItem(2, 'draught') && !Tactics.setItem(0, 'nope'), 'no packing past the open slots, or unknown items');
  ok(Tactics.setSlots(3, 3) && Tactics.setItem(2, 'tincture') && Tactics.setup().loadout.length === 3, 'the Tactician opens an item slot');
  ok(Tactics.setItem(0, null) && Tactics.setup().loadout.join() === 'lampoil,tincture', 'emptying a slot');
  ok(Tactics.explain('party', Tactics.owner('party').rules[0]).warn, 'an item rule for an item not packed is flagged');
  Tactics.setItem(0, 'draught');
  ok(Tactics.replace('party', 1, { if: 'front_foe' }) && Tactics.owner('party').rules[1].if === 'front_foe', 'changing a party rule’s condition');
  ok(Tactics.add(H, { if: 'front_foe', do: 'hexbolt' }) && Tactics.learn('boss_present') && Tactics.add(H, { if: 'boss_present', do: 'doom' }) === false, 'the hexblade’s three slots are full');
  ok(Tactics.replace(H, 0, { if: 'boss_present' }) && Tactics.owner(H).rules[0].n === undefined, 'replacing a condition drops its old number');
  const menu = Tactics.conditionMenu('party', 'focus');
  ok(menu.length === 1 && menu[0].group === 'foe', 'the focus picker only offers foe conditions');
  ok(Tactics.saveSet('Bishop') && Tactics.sets().length === 1, 'saving a set');
  const saved = JSON.stringify(Tactics.setup());
  Tactics.remove(P, 0); Tactics.toggle('party', 0);
  ok(JSON.stringify(Tactics.setup()) !== saved, 'edits change the setup');
  Tactics.setItem(0, null);
  ok(Tactics.loadSet(0) && JSON.stringify(Tactics.setup()) === saved, 'loading a set restores it, loadout included');
  ok(Tactics.saveSet('bishop') && Tactics.sets().length === 1, 'saving under the same name replaces the set');
  const dump = Tactics.dump();
  Tactics.reset(); Tactics.load(dump);
  ok(JSON.stringify(Tactics.dump()) === JSON.stringify(dump), 'dump and load round-trip');
  Tactics.load({ heroes: { c1: { rules: [{ if: 'nope', do: 'mace' }, { if: 'always', do: 'smite' }, { if: 'always', do: 'mace' }] } }, party: { slots: 0 }, sets: [{ name: 'x', heroes: {}, party: [{ if: 'always', do: 'focus' }] }] });
  const lw = Tactics.owner(W);
  ok(lw.rules.length === 1 && Tactics.owner('party').slots === 2, 'loading bad data keeps only what makes sense');
  ok(Tactics.deleteSet(0) && Tactics.sets().length === 0, 'deleting a set');
  ok(Tactics.learnAll() && Tactics.conditionMenu(W).every(g => g.items.every(it => it.known)), 'learning every condition');
  Tactics.reset();
  for (const id in CONDITIONS) for (const v of Tactics.variants(id)) ok(typeof ruleCond(v) === 'string' && !ruleCond(v).includes('undefined'), 'label of ' + Tactics.condKey(v));
  console.log(`Tactics model checked. Conditions: ${Object.keys(CONDITIONS).length} (${Object.values(CONDITIONS).reduce((n, C) => n + Tactics.variants(C.id).length, 0)} variants).`);
}

// ── The home base (build step 5): the economy over Region I's first clears, rest, idle buildings and time away,
// fatigue from battles, Renown, the Recruit Board, the Masters' Hall, the Shop, the Tactician and the save migration.
{
  const HOUR = BASE.HOUR;
  const near = (a, b, e = 1e-6) => Math.abs(a - b) <= e;
  const fresh = () => { const st = defaultState(); Base.ensure(st); st.base.clock = Date.now(); return st; };

  // ── a new game: one hero picked from three, and 100 gold
  {
    const st = fresh();
    ok(st.roster.length === 0 && st.currencies.gold === 100, 'a new game starts with nobody and 100 gold');
    const c = Base.newGame('pilgrim', st, { rng: makeRng(5) });
    ok(c && st.roster.length === 1 && st.party[2] === c.id && st.party.filter(Boolean).length === 1, 'the first pick stands in the back row');
    ok(st.board.first.includes('sellsword') && st.board.first.includes('hexblade') && st.board.first.length === 3 && !st.board.first.includes('pilgrim'), 'the first board shows the other two starters and one more');
    ok(!Base.boardOpen(st), 'the Recruit Board waits for 1-2');
    st.campaign.cleared.push('1-1', '1-2');
    Base.tickTo(Date.now(), st);
    const b = st.board.recruits;
    ok(Base.boardOpen(st) && b.length === 3 && b[0].cls === 'sellsword' && b[1].cls === 'hexblade' && Base.recruitPrice(b[0], st) === 0, 'it opens at 1-2: the first board, and the first recruit is free');
    const h1 = Base.hire(b[0].id, st);
    ok(h1 && st.roster.length === 2 && st.party.includes(h1.id) && st.currencies.gold === 100 && !st.board.free && st.board.picks === 0, 'the free hire joins the formation; one pick per board');
    ok(!Base.hire(st.board.recruits[0].id, st), 'no second hire from the same board');
    Base.rollBoard(st, 'home');
    const p = Base.recruitPrice(st.board.recruits[0], st);
    ok(p >= 162 && p <= 225, `a level-1 recruit costs 162–225 gold (${p})`);
    const counts = {};
    for (let i = 0; i < 40; i++) { Base.rollBoard(st); const k = {}; for (const r of st.board.recruits) k[r.cls] = (k[r.cls] || 0) + 1; counts.max = Math.max(counts.max || 0, ...Object.values(k)); }
    ok(counts.max <= 2, 'at most 2 of one class on a board');
    st.board.ranks.notices = 3; Base.rollBoard(st);
    ok(st.board.recruits.length === 6, 'Notices rank 3 shows 6 recruits');
  }

  // ── the economy: Region I's first clears (campaign spec §5.2) with the home-base spec's rewards (§5), buying buildings
  // as they unlock and a plot is free, and hiring to the campaign's party sizes (§5.4)
  {
    // [stage, level, tier, normal foes, elite, boss, party size]; summoned foes give nothing
    const R1 = [['1-1', 1, 'light', 1, 0, 0, 1], ['1-2', 1, 'light', 2, 0, 0, 1], ['1-3', 2, 'light', 3, 0, 0, 2], ['1-4', 2, 'standard', 3, 0, 0, 2],
      ['1-5', 3, 'standard', 3, 0, 0, 2], ['1-6', 3, 'standard', 4, 0, 0, 3], ['1-7', 4, 'standard', 4, 0, 0, 3], ['1-8', 4, 'rich', 4, 0, 0, 3],
      ['1-9', 5, 'elite', 4, 1, 0, 4], ['1-10', 5, 'standard', 5, 0, 0, 4], ['1-11', 6, 'standard', 4, 0, 0, 4], ['1-12', 6, 'standard', 5, 0, 0, 4],
      ['1-13', 7, 'standard', 5, 0, 0, 5], ['1-14', 7, 'rich', 5, 0, 0, 5], ['1-15', 8, 'elite', 3, 1, 0, 5], ['1-16', 8, 'standard', 6, 0, 0, 6],
      ['1-17', 9, 'rich', 6, 0, 0, 6], ['1-18', 10, 'boss', 3, 0, 1, 6]];
    const CLEAR_GOLD = { light: 12, standard: 20, rich: 40, elite: 60, boss: 200 }, CLEAR_XP = { light: 0.09, standard: 0.15, rich: 0.22, elite: 0.38, boss: 0.9 };
    const UNLOCK = { '1-2': 'recruitboard', '1-3': 'items', '1-5': 'tollhouse', '1-7': 'infirmary', '1-8': 'trainingyard', '1-10': 'shop', '1-11': 'tactician', '1-13': 'scavengercamp', '1-15': 'barracks', '1-16': 'salvagepit' };
    const WANT = ['tollhouse', 'infirmary', 'trainingyard', 'tactician', 'shop', 'scavengercamp', 'barracks', 'salvagepit'];
    const run = q => {
      const st = fresh();
      Base.newGame('sellsword', st, { rng: makeRng(9) });
      let earned = 100, low = Infinity;
      const rows = [];
      let late = 0;
      for (const [id, L, tier, n, el, boss, party] of R1) {
        // hire first: the party the stage needs (campaign spec §5.4)
        while (st.roster.length < party) {
          if (!st.board.recruits.length || st.board.picks <= 0) Base.rollBoard(st, 'home');
          const r = st.board.recruits[0]; r.q = q;
          if (!Base.hire(r.id, st)) { late++; break; }
          low = Math.min(low, st.currencies.gold);
        }
        const S = BASE_S(L), xpLv = n * 0.06 + el * 0.18 + boss * 0.6 + CLEAR_XP[tier];
        const g = Math.round((n * 8 + el * 24 + boss * 80) * S) + Math.round(CLEAR_GOLD[tier] * S * 2);
        st.currencies.gold += g; earned += g;
        st.currencies.mats.bone_dust += { light: 2, standard: 3, rich: 5, elite: 8, boss: 20 }[tier] * 2;
        st.campaign.cleared.push(id);
        if (UNLOCK[id]) st.unlocks[UNLOCK[id]] = 1;
        Base.afterBattle({ log: [] }, { id, kind: tier === 'elite' ? 'elite' : tier === 'boss' ? 'boss' : 'road', boss: tier === 'boss' }, { won: true, first: true, xpLv, heroes: st.roster.length }, st);
        Base.ensure(st);
        // build what has unlocked, while a plot is free, keeping back the price of a recruit the next stage needs
        const nxt = R1[R1.findIndex(x => x[0] === id) + 1], need = nxt ? Math.max(0, nxt[6] - st.roster.length) : 0;
        const reserve = need * Math.round(BASE.RECRUIT * BASE_S(1) * (0.9 + 0.35 * q));
        for (const b of WANT) {
          const plot = st.base.plots.indexOf(null), c = Base.cost(b, 1);
          if (plot < 0 || Base.built(b, st) || !Base.blueprint(b, st) || !Base.canPay(c, st) || st.currencies.gold - c.gold < reserve) continue;
          Base.build(b, plot, st);
          low = Math.min(low, st.currencies.gold);
        }
        if (['1-6', '1-10', '1-13', '1-16', '1-18'].includes(id)) rows.push({ id, party: st.roster.length, earned, left: st.currencies.gold, renown: Base.renown(st).level, plots: Base.plotsCleared(st), built: WANT.filter(b => Base.built(b, st)).length });
      }
      return { rows, low, late };
    };
    const cheap = run(0), dear = run(1);
    ok(cheap.low >= 0 && dear.low >= 0, `the gold never runs out on Region I’s first clears (lowest ${cheap.low}–${dear.low})`);
    const at = (r, id) => r.rows.find(x => x.id === id);
    ok(!cheap.late && !dear.late && at(dear, '1-6').party === 3 && at(dear, '1-10').party === 4 && at(dear, '1-13').party === 5 && at(dear, '1-16').party === 6, 'the campaign’s party sizes are affordable on time, even with the dearest recruits');
    ok(at(cheap, '1-18').plots >= 4, 'by the Sexton, Renown has cleared plot 4, even on first clears alone');
    console.log('\nThe economy over Region I’s first clears (home-base spec §10; recruits at their cheapest / dearest)');
    console.log('   by     party  earned   gold left     Renown  plots  built');
    for (let i = 0; i < cheap.rows.length; i++) { const a = cheap.rows[i], b = dear.rows[i]; console.log(`   ${pad(a.id, 6)} ${lpad(a.party, 5)}  ${lpad(fmt(a.earned), 6)}  ${lpad(fmt(b.left), 5)}–${pad(fmt(a.left), 6)}  ${lpad(a.renown, 6)}  ${lpad(a.plots, 5)}  ${lpad(a.built, 5)}`); }
  }

  // ── rest: the fire, beds, the yard and the Hall, with beds changing hands as heroes reach 0
  {
    const st = fresh(), t0 = 1.7e12;
    st.base.clock = t0;
    ['warden', 'pilgrim', 'hexblade'].forEach((k, i) => { const c = Hero.create(k, 'r' + i, { rng: makeRng(i + 1) }); st.roster.push(c); });
    const [a, b, c] = st.roster;
    a.fatigue = 100; a.spent = true; b.fatigue = 60; c.fatigue = 30;
    st.unlocks.infirmary = 1; st.currencies.gold = 1e6; st.currencies.mats.bone_dust = 999;
    ok(Base.build('infirmary', 0, st), 'the Infirmary stands');
    Fatigue.fillBeds(st);
    ok(st.base.beds[0] === a.id && st.base.beds[1] === b.id && Fatigue.where(c, st) === 'fire', 'the two most tired heroes take the two beds');
    Base.tickTo(t0 + 2 * HOUR, st);
    ok(near(a.fatigue, 60) && near(b.fatigue, 20) && near(c.fatigue, 10) && a.spent, `two hours: beds rest 20 an hour, the fire 10, and Spent holds above 50 (${[a, b, c].map(x => x.fatigue.toFixed(2))})`);
    // b reaches 0 an hour later and frees the bed for c, who then rests at 20
    Base.tickTo(t0 + 3.25 * HOUR, st);
    ok(near(b.fatigue, 0) && near(c.fatigue, 0) && near(a.fatigue, 35) && !a.spent, `beds change hands at 0, and Spent ends below 50 (${[a, b, c].map(x => x.fatigue.toFixed(2))})`);
    ok(Fatigue.state(a) === 'fresh' && Fatigue.penalty({ fatigue: 60, skills: {} }) === 0.05 && Fatigue.penalty({ fatigue: 80, skills: {} }) === 0.15, 'Weary costs 5%, Exhausted 15%');
    const iw = { fatigue: 60, skills: { ironwill: 5 }, awakened: ['ironwill'] };
    ok(Fatigue.penalty(iw) === 0 && Fatigue.penalty(Object.assign({}, iw, { fatigue: 80 })) === 0.15, 'awakened Iron Will: Weary no longer weakens the Warden, Exhausted still does');
    const w = Hero.create('warden', 'pw', { rng: makeRng(3) }), base = Hero.spec(w).stats;
    w.fatigue = 80;
    const tired = Hero.spec(w).stats;
    ok(near(tired.pow, base.pow * 0.85) && near(tired.def, base.def * 0.85) && near(tired.spd, base.spd * 0.85) && tired.hp === base.hp, 'Exhausted takes 15% off Power, Defense and Speed in battle');
    // spending one hour on the road (a battle under way) rests nobody in the party
    const st2 = fresh(); st2.base.clock = t0;
    const d = Hero.create('sellsword', 'd1', { rng: makeRng(4) }); d.fatigue = 40; st2.roster.push(d); st2.party[0] = d.id;
    st2.campaign.current = { stage: 0, seed: 1 };
    Base.tickTo(t0 + HOUR, st2);
    ok(near(d.fatigue, 40) && Fatigue.where(d, st2) === 'road', 'out on the road, nobody rests');
    Base.tickTo(t0 + 2 * HOUR, st2, { offline: true });
    ok(near(d.fatigue, 30), 'with the app closed, the party counts as home and rests');
    ok(Fatigue.spent({ fatigue: 70, spent: true }) && !Fatigue.spent({ fatigue: 99 }), 'Spent lasts until fatigue falls below 50');
  }

  // ── a battle's fatigue: +1 a turn, and the skills and gear that change it
  {
    const st = fresh();
    const ks = ['warden', 'sellsword', 'pilgrim', 'surgeon', 'lamplighter', 'hexblade'];
    ks.forEach((k, i) => { const c = Hero.create(k, 'b' + i, { rng: makeRng(i + 7) }); Hero.gainXp(c, Hero.xpBetween(1, 30)); st.roster.push(c); st.party[i] = c.id; });
    const setupOf = () => ({ party: st.party.map(id => Hero.spec(st.roster.find(c => c.id === id))), partyRules: [], loadout: [] });
    const battleOnce = () => { const r = simulate(Object.assign(stageSetup(STAGES[2], 77, setupOf()))); st.roster.forEach(c => { c.fatigue = 0; c.spent = false; }); return r; };
    const r0 = battleOnce();
    const plain = Fatigue.battle(r0, st);
    ok(Object.keys(plain).length === 6 && st.roster.every((c, i) => near(plain[c.id].gain, r0.stats['p' + i].turns, 0.051)), 'with no fatigue skills, a hero gains one fatigue for each turn they took');
    const [W, SW, P, BS] = st.roster;
    W.skills.ironwill = 5; P.skills.comfort = 5; BS.skills.housecalls = 5;
    st.roster.forEach(c => { c.fatigue = 0; });
    const out = Fatigue.battle(r0, st);
    const tW = r0.stats.p0.turns, tS = r0.stats.p1.turns;
    ok(near(out[W.id].gain, Math.round(tW * 0.65 * 0.8 * 10) / 10, 0.051) && near(out[SW.id].gain, Math.round(tS * 0.8 * 10) / 10, 0.051), `Iron Will (−35%) and Comfort (−20%) cut the fatigue of every turn (${out[W.id].gain}, ${out[SW.id].gain})`);
    ok(out[SW.id].rec === 2 && near(out[SW.id].after, Math.max(0, out[SW.id].gain - 2), 0.051), 'House Calls recovers 2 after the battle');
    SW.gear.accessory = Items.make('mournersveil', 1);
    SW.fatigue = 0;
    const veil = Fatigue.battle(r0, st);
    ok(GEAR.mournersveil && near(veil[SW.id].gain, Math.round(tS * 0.8 * 0.7 * 10) / 10, 0.051), 'the Mourner’s Veil cuts it by 30% more');
    // Laudanum's turns build half; a transfused hero builds none; Peaceful Rest after a raise
    const log = [{ t: 'turn', who: 'p1' }, { t: 'status', who: 'p1', key: 'laudanum', on: true }, { t: 'turn', who: 'p1' }, { t: 'turn', who: 'p1' }, { t: 'status', who: 'p1', key: 'laudanum', on: false }, { t: 'turn', who: 'p1' },
      { t: 'turn', who: 'p0' }, { t: 'act', who: 'p3', skill: 'transfusion', targets: ['p0'] }, { t: 'turn', who: 'p0' },
      { t: 'revive', src: 'p2', tgt: 'p5' }, { t: 'turn', who: 'p5' }, { t: 'turn', who: 'p5' }];
    st.roster.forEach(c => { c.fatigue = 0; c.skills = Object.fromEntries(Object.entries(c.skills).filter(([k]) => !['ironwill', 'comfort', 'housecalls'].includes(k))); c.gear.accessory = null; });
    P.skills.peacefulrest = 1;
    const fake = { start: r0.start, log, stats: r0.stats };
    const f = Fatigue.battle(fake, st);
    ok(near(f[SW.id].gain, 3) && near(f[W.id].gain, 0) && near(f[st.roster[5].id].gain, 1), `Laudanum halves its turns, Transfusion wipes the battle, Peaceful Rest halves after a raise (${f[SW.id].gain}, ${f[W.id].gain}, ${f[st.roster[5].id].gain})`);
    SW.fatigue = 99;
    Fatigue.battle({ start: r0.start, log: [{ t: 'turn', who: 'p1' }, { t: 'turn', who: 'p1' }], stats: r0.stats }, st);
    ok(SW.fatigue === 100 && SW.spent, 'reaching 100 makes a hero Spent, and fatigue stops at 100');
    const t = Base.limitLoadout({ party: setupOf().party, loadout: ['draught', 'draught', 'salts'] }, Object.assign(st, { inventory: { items: [], potions: { draught: 1, salts: 0 } } }));
    ok(t.loadout.join() === 'draught' && t.party[1] === null, 'the loadout draws only what the Bag holds, and a Spent hero stays home');
    const used = Base.spendItems({ log: [{ t: 'item', slot: 0, item: 'draught' }, { t: 'refill', slot: 0 }, { t: 'item', slot: 0, item: 'draught' }, { t: 'item', slot: 1, item: 'lampoil' }] }, Object.assign(st, { inventory: { items: [], potions: { draught: 3, lampoil: 1 } } }));
    ok(used.draught === 1 && used.lampoil === 1 && st.inventory.potions.draught === 2 && st.inventory.potions.lampoil === 0, 'items used come out of the Bag, and a refilled slot draws nothing');
  }

  // ── idle buildings and time away: the same on a reload, and the same in one step or many
  {
    const t0 = Date.now(), make = () => {
      const st = fresh(); st.created = 12345; st.base.clock = t0;
      for (const k of ['tollhouse', 'scavengercamp', 'salvagepit', 'trainingyard', 'region:1', 'region:2', 'region:3']) st.unlocks[k] = 1;
      st.campaign.cleared.push('1-1', '1-2', '1-3');
      st.currencies.gold = 1e6; st.currencies.mats.bone_dust = 999;
      st.renown.points = 4200; Base.ensure(st);
      const c = Hero.create('crossbowman', 'y1', { rng: makeRng(2) }); st.roster.push(c);
      ['tollhouse', 'scavengercamp', 'salvagepit', 'trainingyard'].forEach((b, i) => Base.build(b, i, st));
      return st;
    };
    const A = make();
    ok(Base.setTrainee('y1', true, A), 'a trainee in the yard');
    Base.tickTo(t0 + 7 * HOUR, A, { offline: true });
    const B = JSON.parse(JSON.stringify(A));
    const pa = ['tollhouse', 'scavengercamp', 'salvagepit', 'trainingyard'].map(b => JSON.stringify(Base.preview(b, A).map(x => [x.kind, x.n, x.piece && x.piece.id, x.mat, x.item])));
    const pb = ['tollhouse', 'scavengercamp', 'salvagepit', 'trainingyard'].map(b => JSON.stringify(Base.preview(b, B).map(x => [x.kind, x.n, x.piece && x.piece.id, x.mat, x.item])));
    ok(pa.join() === pb.join(), 'time away comes out the same after a reload');
    const ga = Base.collect('salvagepit', A).map(x => x.piece.id).join(), gb = Base.collect('salvagepit', B).map(x => x.piece.id).join();
    ok(ga === gb && ga.split(',').length === 2, `the Salvage Pit’s rolls are seeded: 7 hours at one every 3 gives 2, the same twice (${ga})`);
    const steps = make();
    for (let k = 1; k <= 28; k++) Base.tickTo(t0 + k * 0.25 * HOUR, steps, { offline: true });
    const gold1 = make(); Base.tickTo(t0 + 7 * HOUR, gold1, { offline: true });
    const S7 = BASE_S(Base.frontier(gold1).level);
    ok(Base.preview('tollhouse', steps)[0].n === Base.preview('tollhouse', gold1)[0].n && Base.preview('tollhouse', gold1)[0].n === Math.floor(50 * S7 * 7), `the Toll House earns the same in one step or many: 50 × S an hour (${Base.preview('tollhouse', gold1)[0].n})`);
    Base.tickTo(t0 + 30 * HOUR, gold1, { offline: true });
    const sto = Base.storage('tollhouse', gold1);
    ok(sto.pct === 1 && Base.preview('tollhouse', gold1)[0].n === Math.floor(50 * S7 * 8), 'storage stops at 8 hours');
    const y = A.roster[0], top = Math.max(...STAGES.filter(x => A.campaign.cleared.includes(x.id)).map(x => x.level));
    ok(Base.yardCeiling(A) === top, 'the yard’s ceiling is the highest lit stage’s level');
    const xp = Base.collect('trainingyard', A);
    ok(xp.length === 1 && xp[0].n > 0 && Base.preview('trainingyard', A).length === 0, `7 hours in the yard: XP, collected into the trainee (${xp[0] && xp[0].n})`);
    A.campaign.cleared = ['1-1']; Base.tickTo(t0 + 15 * HOUR, A, { offline: true });
    ok(Base.yardCeiling(A) === 1 && Base.collect('trainingyard', A).every(g => g.n === 0) && y.level === Math.max(1, y.level), 'at the ceiling a trainee gains nothing');
    // the free draught by the fire: one every 4 hours, up to 3
    const F = make(); F.unlocks.items = 1; Base.tickTo(t0, F); Base.tickTo(t0 + 9 * HOUR, F);
    ok(F.freePotion.waiting === 2, `two free draughts in 9 hours (${F.freePotion.waiting})`);
    Base.tickTo(t0 + 30 * HOUR, F);
    ok(F.freePotion.waiting === 3 && Base.collectPotions(F) === 3 && F.inventory.potions.draught === 3, 'up to 3 wait by the fire');
  }

  // ── buildings: costs, levels, choices, tearing down
  {
    const st = fresh();
    st.unlocks.tollhouse = 1; st.unlocks['region:2'] = 1; st.currencies.gold = 1e6; for (const m of MATERIALS) st.currencies.mats[m.id] = 999;
    ok(JSON.stringify(Base.cost('tollhouse', 1)) === JSON.stringify({ gold: 240, mat: 'bone_dust', n: 8 }) && Base.cost('tollhouse', 3).mat === 'chapel_wax' && Base.cost('salvagepit', 5).n === 72 && Base.cost('mastershall', 3).n === 40, 'standard costs × each building’s factor; level 3 and up in its home material');
    ok(Base.build('tollhouse', 0, st) && !Base.build('tollhouse', 1, st) && !Base.build('barracks', 1, st), 'a blueprint builds once, and only once unlocked');
    ok(st.renown.points === 60, 'a building built: +60 Renown');
    ok(Base.upgrade('tollhouse', null, st) && !Base.upgrade('tollhouse', 'nope', st) && Base.upgrade('tollhouse', 'strongbox', st) && Base.storeHours('tollhouse', st) === 12 && st.renown.points === 60 + 60 + 90, 'levels 2 and 3, with the Strongbox choice: 12 hours, and Renown for each level');
    ok(Base.rechoose('tollhouse', 3, 'busyroad', st) && Base.storeHours('tollhouse', st) === 8 && Base.rates('tollhouse', st).gold > 0, 'a choice can be switched for that level’s cost again');
    ok(Base.tearDown('tollhouse', st) && !Base.built('tollhouse', st) && st.base.plots[0] === null && Base.build('tollhouse', 0, st) && Base.level('tollhouse', st) === 1 && st.renown.points === 60 + 60 + 90, 'tearing down gives nothing back; raised again it starts at level 1, and its Renown came once');
    ok(Base.build('whetstone', 1, st) && Base.bonuses(st).pow === 0.02 && Base.setFocus('whetstone', 'point', st) && Base.bonuses(st).crit === 1, 'the Whetstone: +2% Power, or +1% Crit');
    st.unlocks['region:3'] = 1; st.renown.points += 3000; Base.ensure(st);
    ok(Base.build('belltower', 2, st) && Base.setFocus('belltower', 'deep:stun', st) && Base.bonuses(st).res.stun === 4 && Base.build('hexingstone', 3, st) && Base.bonuses(st).land.all === 2, 'the Bell Tower’s Deep focus and the Hexing Stone’s Wide focus');
    ok(!Base.tearDown('recruitboard', st), 'the Recruit Board can’t be torn down');
  }

  // ── Renown and plots
  {
    const st = fresh();
    ok(Base.renown(st).level === 1 && Base.plotsCleared(st) === 3, 'Renown 1, three plots');
    Base.award(null, 1199, st);
    ok(Base.plotsCleared(st) === 3 && (Base.award(null, 1, st), Base.renown(st).level === 4) && Base.plotsCleared(st) === 4, 'Renown 4 (1,200) clears plot 4');
    ok(Base.award('k', 50, st) === 50 && Base.award('k', 50, st) === 0, 'a keyed award counts once');
    const boss = { id: '1-18', kind: 'boss', boss: true };
    const a1 = Base.afterBattle({ log: [] }, boss, { won: true, first: true, xpLv: 1, heroes: 6 }, st).renown, a2 = Base.afterBattle({ log: [] }, boss, { won: true, first: false }, st).renown;
    ok(a1 === 40 + 90 + 250 && a2 === 20, `a boss: +250 the first time, +20 after, and battle XP at 15 a level’s worth (${a1}, ${a2})`);
    let pts = 0; for (let n = 1; n < 25; n++) pts += 100 * (n + 2);
    st.renown.points = pts; Base.ensure(st);
    ok(Base.renown(st).level === 25 && Base.plotsCleared(st) === 14, 'every plot by Renown 25: 14 in all');
  }

  // ── Tactician I belongs to the 1-11 clear. A save that recorded the clear without it (made while the building taught
  // it, or before “out of an item” joined it) learns it when it loads.
  {
    const keep = Tactics.dump(), st = fresh();
    Tactics.reset();
    ok(!Tactics.isKnown({ if: 'bb_fell' }) && !Tactics.isKnown({ if: 'bb_out', s: 'draught' }) && !Tactics.isKnown({ if: 'foe_hp_lt', n: 25 }), 'new rules know nothing of Tactician I');
    Base.prepare(st);
    ok(!Tactics.isKnown({ if: 'bb_fell' }), 'without the 1-11 clear, loading teaches nothing');
    st.unlocks.tactician = 1;
    Base.prepare(st);
    ok(Tactics.isKnown({ if: 'bb_fell' }) && Tactics.isKnown({ if: 'bb_out', s: 'lampoil' }) && Tactics.isKnown({ if: 'foe_hp_lt', n: 25 }) && Tactics.isKnown({ if: 'self_has', s: 'kindled' }), 'with it, loading catches up Tactician I');
    ok(!Tactics.isKnown({ if: 'self_hp_gt', n: 50 }) && !Tactics.isKnown({ if: 'battle_start' }), 'Lesson II still waits for the Tactician’s level 3');
    Tactics.load(keep);
  }
  // ── the Masters' Hall, the Shrine, the Tactician, the Shop and dismissing
  {
    const st = fresh();
    st.unlocks['region:1'] = 1; st.unlocks.tactician = 1; st.unlocks.shop = 1; st.currencies.gold = 1e6; for (const m of MATERIALS) st.currencies.mats[m.id] = 999;
    st.renown.points = 4200; Base.ensure(st);
    Base.newGame('sellsword', st, { rng: makeRng(3) });
    const c = st.roster[0];
    Hero.gainXp(c, Hero.xpBetween(1, 16));
    ok(Base.build('mastershall', 0, st) && Base.lessonsFor(c, st).some(o => o.L.id === 'rule4' && !o.why), 'Rule slot IV from level 15');
    const g0 = st.currencies.gold;
    ok(Base.startLesson(c.id, 'rule4', st) && st.party.every(x => x !== c.id) && st.currencies.gold === g0 - 600, 'a lesson takes the hero out of the party, for 600 gold');
    st.base.hall[c.id].since -= 2 * HOUR;
    ok(Base.cancelLesson(c.id, st) && st.party.includes(c.id) && st.base.done[c.id + ':rule4'] >= 2 * HOUR - 1000, 'cancel brings them home, keeping two hours of progress');
    ok(Base.startLesson(c.id, 'rule4', st) && st.currencies.gold === g0 - 600, 'starting it again costs nothing more');
    Base.tickTo(Date.now() + 3 * HOUR, st);
    ok(!st.base.hall[c.id] && c.lessons.rule === 1 && Hero.ruleSlots(c) === 4 && st.party.includes(c.id), 'two hours more and it’s done: a 4th rule slot, and back in the party');
    ok(!Base.lessonsFor(c, st).some(o => o.L.kind === 'rule'), 'the Sellsword’s maximum is 4: no more rule lessons');
    ok(Base.build('shrine', 1, st) && Base.respecPrice(c, st) === Math.round(150 * BASE_S(c.level)), 'a respec costs 150 × S at the hero’s level');
    Hero.learn(c, 'lunge');
    const g1 = st.currencies.gold;
    ok(Base.respec(c.id, st) && !c.skills.lunge && st.currencies.gold === g1 - Base.respecPrice(c, st), 'the Shrine respecs for gold');
    ok(Base.build('tactician', 2, st) && Base.partySlots(st) === 3 && Base.loadoutSlots(st) === 2 && Tactics.owner('party').slots === 3, 'the Tactician builds on Tactician I: level 1 is a 3rd party rule slot');
    Base.upgrade('tactician', null, st);
    ok(Base.partySlots(st) === 3 && Base.loadoutSlots(st) === 3 && Tactics.loadout().slots === 3 && Tactics.owner('party').slots === 3, 'level 2: a 3rd loadout slot');
    ok(Base.build('shop', 3, st) && Base.itemPrice('draught', st) === Math.round(25 * 2.5) && (st.unlocks['region:3'] = 1, Base.itemPrice('draught', st) === 25 * 7), 'a Healing Draught costs 25 in Region I, ×2.5 in Region II and ×7 in Region IV');
    ok(Base.buyItem('draught', 2, st) && st.inventory.potions.draught === 2 && Base.sellItem('draught', st) === Math.round(25 * 7 * 0.3), 'buying, and selling for 30%');
    ok(st.shop.stall.length === 2 && Base.stallPrice(st.shop.stall[0], st) === 4 * Items.sellPrice(st.shop.stall[0]), 'the gear stall: 2 pieces at 4 times their sell price');
    ok(Items.sellPrice(Items.make('notchedsword', 5)) === 20 && Items.sellPrice(Items.make('gravecutter', 10)) === 180, 'gear sells for 10 (Common) and 60 (Rare) × S');
    const hire = Hero.create('warden', 'c99', { rng: makeRng(4) }); hire.gear.armor = Items.make('rustedplate', 3); st.roster.push(hire);
    const bag = st.inventory.items.length;
    ok(Base.dismiss('c99', st) && !st.roster.some(x => x.id === 'c99') && st.inventory.items.length === bag + 2, 'dismissing gives back only their gear');
    ok(!Base.dismiss(c.id, st), 'not your last hero');
  }

  // ── the save: version 4 → 5 keeps the roster, the prototype's free slots, and counts Renown already earned
  {
    const v4 = JSON.parse(JSON.stringify(protoState()));
    v4.v = 4; delete v4.renown; delete v4.board; v4.base = { buildings: {} };
    v4.campaign.cleared = ['1-1', '1-2', '1-3', '1-4', '1-5', '1-6', '1-7', '1-8', '1-9'];
    v4.unlocks = { recruitboard: 1, items: 1, tollhouse: 1 };
    v4.currencies.gold = 777;
    v4.tactics = { v: 1, heroes: {}, party: { slots: 4, rules: [] }, loadout: { slots: 3, items: [] }, known: [], sets: [] };
    v4.roster[0].lessons = { skill: 0, rule: 1 };
    const s5 = upgrade(v4);
    const elite = STAGES.find(x => x.id === '1-9').kind === 'elite';
    ok(s5.v === SAVE_VERSION && SAVE_VERSION === 5 && s5.roster.length === 6 && s5.currencies.gold === 777, 'version 4 → 5: everyone stays, and so does the gold');
    ok(s5.base.legacySlots.party === 4 && s5.base.legacySlots.loadout === 3 && s5.roster[0].lessons.rule === 1, 'slots opened in the prototype stay');
    ok(elite && s5.renown.points === 40 * 8 + 100 && s5.renown.awarded['lit:1-9'] && !s5.board.free && s5.base.buildings.recruitboard, `Renown for the stages already lit, the elite at 100; the Recruit Board stands (${s5.renown.points})`);
    const n = JSON.parse(JSON.stringify(s5));
    ok(JSON.stringify(upgrade(n).renown) === JSON.stringify(s5.renown), 'a version 5 save loads unchanged');
    const v3 = JSON.parse(JSON.stringify(protoState())); v3.v = 3; v3.campaign.cleared = ['1-1', '2-3'];
    const r3 = upgrade(v3);
    ok(r3.v === 5 && r3.renown.points === 0 && r3.roster.length === 6, 'a version 3 save passes through the rebuilt road to the camp, with no Renown for the old road');
  }
  console.log('Home base checked: a new game, the board, Region I’s gold, rest and beds, battle fatigue, idle buildings and time away, costs, choices, tearing down, Renown, the Hall, the Shrine, the Tactician, the Shop, dismissing, and the save.');
}

// ── The campaign (js/campaign.js): Region I's engine pieces, rewards, fatigue, unlocks and trips
{
  const st = id => STAGES.find(x => x.id === id);
  ok(STAGES_I.length === 18 && STAGES_I.filter(x => x.elite).map(x => x.id).join() === '1-9,1-15' && STAGES[17].boss, 'Region I: 18 stages, elites at 1-9 and 1-15, the boss at 1-18');
  // the whole road (campaign spec §2, §6): five regions, 88 stages, each region two elites and its boss last
  const byR = r => STAGES.filter(x => x.region === r);
  ok(STAGES.length === TOTAL_STAGES && TOTAL_STAGES === 88 && REGIONS.every((R, r) => byR(r).length === R.stages), `the road: ${STAGES.length} stages, by region ${REGIONS.map((R, r) => byR(r).length).join('/')}`);
  ok(STAGES.every((x, i) => x.foes.length === 6 && x.n === i + 1 && x.index === i && CLEAR[x.tier] && x.hint && x.teaches && x.party >= 1 && x.region === Number(x.id.split('-')[0]) - 1), 'every stage: 6 slots, its place, its region, a tier, a hint and what it teaches');
  REGIONS.forEach((R, r) => {
    const list = byR(r), b = list[list.length - 1];
    ok(list.filter(x => x.elite).length === 2 && list.filter(x => x.boss).length === 1 && b.boss && list.every(x => !!x.elite === (x.kind === 'elite') && !!x.boss === (x.kind === 'boss')), `Region ${R.num}: two elites, and the boss last`);
    ok(list.every((x, k) => x.level >= R.levels[0] && x.level <= R.levels[1] && (!k || x.level >= list[k - 1].level)) && list[0].level === R.levels[0] && b.level === R.levels[1], `Region ${R.num}: levels ${R.levels.join('–')}, never falling, the boss at ${R.levels[1]}`);
    ok(b.first.includes('relic:' + R.relic) && UNLOCKS['relic:' + R.relic].relic === Items.relicOf(r), `Region ${R.num}: its boss grants ${R.relic}`);
    if (r < REGIONS.length - 1) ok(b.first.includes('region:' + (r + 1)) && (REGION_OPENS['region:' + (r + 1)] || []).every(k => b.first.includes(k)), `Region ${R.num}: its boss opens the next region and its buildings`);
    ok(list.filter(x => x.tier === 'rich').length === 3, `Region ${R.num}: a rich stage before each wall`);
  });
  for (const [id, at] of [['cond:foe_tag:spirit', '2-2'], ['cond:foe_healer', '2-8'], ['cond:enraged', '2-14'], ['cond:foe_tag:beast', '3-2'], ['cond:ally_top_pow', '3-8'], ['cond:foe_next', '3-14'], ['cond:allies_lt', '4-8']]) ok(st(at).first.includes(id), `${at} teaches ${id}`);
  // classes join the recruit board as their region opens (the home base's CLASS_JOINS): the road records them on that boss
  for (const [id, at] of [['surgeon', '1-18'], ['bellringer', '1-18'], ['duellist', '2-17'], ['cutpurse', '2-17'], ['alchemist', '3-17']]) ok(st(at).first.includes(id) && st(at).first.includes(CLASS_JOINS[id]) && UNLOCKS[id].kind === 'class' && CLASSES[id], `${at}: the ${CLASSES[id] ? CLASSES[id].name : id} joins the recruit board`);
  ok(STAGES.every(x => x.first.every(id => UNLOCKS[id])), 'every first-clear unlock is known');
  ok(STAGES.every(x => x.foes.every(f => !f || FOES[foeKey(f)])), 'every stage foe exists');
  // every foe's sprite: a known template and accessories, and a palette that colours every letter they use
  for (const id in FOES) {
    if (/^test/.test(id)) continue; // the stand-ins the gear tests define
    const A = FOE_ART[id], maps = A ? [TEMPLATES[A.tpl], ...(A.acc || []).map(a => ACCESSORIES[a] && ACCESSORIES[a].map)] : [];
    const miss = A && maps.every(Boolean) ? [...new Set(maps.flat().join('').replace(/\./g, ''))].filter(ch => !A.pal[ch]) : ['?'];
    ok(!miss.length, `${id}'s sprite: ${A ? 'its palette lacks ' + miss.join('') : 'none'}`);
  }
  ok(REGION_ART.length === REGIONS.length && REGION_ART.every(A => A.props.every(p => PROPS[p] && [...new Set(PROPS[p].map.join('').replace(/\./g, ''))].every(ch => A.pc[ch]))), 'every region has its art and coloured props');
  ok(Object.keys(SKILLS).every(id => SKILLS[id].id === id), 'no foe skill shares an id with a hero skill');
  // foe growth (campaign spec §3.1)
  const sx = foeStats(FOES.ghoul, 10), s5 = foeStats(FOES.ghoul, 5);
  ok(sx.hp === 253 && Math.round(sx.pow) === 96 && Math.round(sx.def) === 5 && s5.hp === 118 && Math.round(s5.pow) === 54, `foe growth matches the spec's table (ghoul at 10: ${sx.hp}/${Math.round(sx.pow)}/${Math.round(sx.def)})`);
  ok(Math.abs(foeStats(FOES.ghoul, 20).hp - 72 * 5.81) < 2 && Math.abs(foeStats(FOES.ghoul, 11).spd - 9.2) < 1e-9 && foeStats(FOES.ghoul, 11).res.stun === 21, 'foes grow on past level 10, with speed and resistances');
  // waiting and stepping up: the Shambler behind waits, and steps up once a front slot opens
  let steps = 0, early = 0, calls = 0, callSpoils = 0, phases = 0, two = 0, flees = 0;
  for (let i = 0; i < 40; i++) {
    const res = simulate(refSetup(st('1-3'), strSeed('wait' + i), REF.ORDERS[i % 3], 2));
    check(res, st('1-3'));
    const sh = res.start.find(u => u.slot === 3 && u.side === 1);
    let frontDead = 0;
    for (const e of res.log) {
      if (e.t === 'die' && e.who[0] === 'f' && res.start.find(u => u.id === e.who && u.slot < 2)) frontDead++;
      if (e.t === 'step' && e.who === sh.id) { steps++; if (!frontDead) early++; }
      if (e.t === 'act' && e.who === sh.id && e.skill !== 'defend' && e.skill !== 'stepup' && !res.log.slice(0, res.log.indexOf(e)).some(x => x.t === 'step' && x.who === sh.id)) early++;
    }
  }
  ok(steps > 20 && !early, `a waiting foe Defends until a front slot opens, then steps up (${steps} steps, ${early} too early)`);
  // the Rat King's summons: called rats rise in empty slots, count as foes, and drop nothing
  for (let i = 0; i < 40; i++) {
    const res = simulate(refSetup(st('1-15'), strSeed('king' + i), REF.ORDERS[i % 3], 8));
    check(res, st('1-15'));
    const n = res.log.filter(e => e.t === 'summon').length;
    calls += n;
    if (n) { const r = Campaign.earn(res, st('1-15')); callSpoils += r.foes > 4 ? 1 : 0; ok(r.called === res.final.filter(u => u.summoned).length && res.final.filter(u => u.summoned).every(u => u.side === 1 && u.key === 'rats'), 'called foes are rats on the foe side'); }
  }
  ok(calls > 20 && !callSpoils, `the Rat King calls rats (${calls} over 40 battles), and they drop no spoils`);
  // the Sexton: Two Graves below half health, and Burial on both Marked heroes
  for (let i = 0; i < 40; i++) {
    const res = simulate(refSetup(st('1-18'), strSeed('sexton' + i), REF.ORDERS[i % 3], 11));
    check(res, st('1-18'));
    const ph = res.log.findIndex(e => e.t === 'phase');
    if (ph >= 0) {
      phases++;
      const sx = res.start.find(u => u.key === 'sexton');
      const hp = res.log.slice(0, ph).filter(e => (e.t === 'hit' && e.tgt === sx.id) || (e.t === 'tick' && e.who === sx.id)).pop();
      ok(hp && hp.hp < sx.maxHp / 2, 'the phase comes below half health');
      ok(!res.log.slice(0, ph).some(e => e.t === 'act' && e.skill === 'dig2'), 'no Two Graves before the phase');
      if (res.log.slice(ph).some(e => e.t === 'status' && e.key === 'charging' && e.targets && e.targets.length === 2)) two++;
    }
  }
  ok(phases > 20 && two > 5, `the Sexton's second phase (${phases} of 40) marks two heroes (${two})`);
  // fleeing: a Cage Mimic that outlasts round 5 scuttles off and drops nothing
  const MIMIC = { id: 'T-M', name: 'Test', level: 3, foes: ['mimic', null, null, null, null, null] };
  for (let i = 0; i < 20; i++) {
    const res = simulate({ seed: 70 + i, party: [Hero.spec(refHero('warden', 1, 'c1'), [{ if: 'always', do: 'guard' }]), null, null, null, null, null], foes: MIMIC.foes, level: 3, partyRules: [], loadout: [] });
    check(res, MIMIC);
    if (res.log.some(e => e.t === 'flee')) { flees++; ok(res.winner === 0 && res.rounds === 6 && Campaign.earn(res, Object.assign({}, st('1-3'), { level: 3 })).foes === 0, 'the mimic fled at round 6 with nothing dropped'); }
  }
  ok(flees > 10, `the Cage Mimic flees at round 6 (${flees} of 20)`);
  // wandering foes: only on replays, rolled from the seed
  let moth = 0, mim = 0, firstTime = 0;
  for (let i = 0; i < 4000; i++) {
    const f = wanderers(st('1-5'), i), f0 = stageSetup(st('1-5'), i, { party: [], partyRules: [], loadout: [] }).foes;
    if (f.includes('moths')) moth++;
    if (f.includes('mimic')) mim++;
    if (f0.some(k => FOES[foeKey(k)] && FOES[foeKey(k)].wander)) firstTime++;
    if (i < 50) ok(JSON.stringify(wanderers(st('1-5'), i)) === JSON.stringify(f), 'wanderers come from the seed');
  }
  ok(Math.abs(moth / 4000 - 0.05) < 0.012 && Math.abs(mim / 4000 - 0.02) < 0.008 && !firstTime, `wandering foes: Moth Swarm ${(moth / 40).toFixed(1)}%, Cage Mimic ${(mim / 40).toFixed(1)}%, none on a first attempt`);

  // ── Regions II–V: the engine pieces they need (campaign spec Appendix A), each seen in the stage that teaches it
  const runs = (id, n, f) => { const stg = st(id); for (let i = 0; i < n; i++) { const res = simulate(refSetup(stg, strSeed(id + ':piece' + i), REF.ORDERS[i % 3], stg.level)); check(res, stg); f(res); } };
  // starting Hidden: the Hanged Man waits in the branches, unaimed, until he first attacks
  let hid = 0, aimedHid = 0, drops = 0;
  runs('3-3', 20, res => {
    const hm = res.start.find(u => u.key === 'hanged');
    if (hm.st.hidden) hid++;
    let shown = false;
    for (const e of res.log) {
      if (e.t === 'status' && e.who === hm.id && e.key === 'hidden' && !e.on) shown = true;
      if (!shown && e.t === 'act' && e.who[0] === 'p' && SKILLS[e.skill].shape === 'foe' && e.targets.includes(hm.id)) aimedHid++;
      if (e.t === 'act' && e.who === hm.id && e.skill === 'gallows') drops++;
    }
  });
  ok(hid === 20 && !aimedHid && drops > 5, `the Hanged Man starts Hidden (${hid}/20), no hero aims at him until he attacks (${aimedHid}), and he drops on the back row (${drops})`);
  // forced row changes: the Marsh Lantern lures back-row heroes forward, Move resistance resists it, and the Move
  // action walks them back; the Lord Chamberlain's Reorder the Court does the same
  let lured = 0, lureRes = 0, walked = 0, reordered = 0;
  runs('3-4', 20, res => { for (const e of res.log) { if (e.t === 'swap' && e.why === 'lure') lured++; if (e.t === 'resist' && e.key === 'swap') lureRes++; if (e.t === 'swap' && e.why === 'move') walked++; } });
  runs('5-15', 10, res => { reordered += res.log.filter(e => e.t === 'swap' && e.why === 'lure').length; });
  ok(lured > 10 && lureRes > 0 && walked > 5 && reordered > 3, `Lure (${lured}, ${lureRes} resisted), Move back (${walked}) and Reorder the Court (${reordered})`);
  // Retaliating on a foe: Mother Bramble's thorns bite whoever hits her
  let thorns = 0;
  runs('3-8', 10, res => { thorns += res.log.filter(e => e.t === 'counter' && e.why === 'thorns' && res.start.find(u => u.id === e.who && u.key === 'bramble')).length; });
  ok(thorns > 20, `Mother Bramble's thorns bite back (${thorns} over 10 battles)`);
  // mana drain: the Font Leech drinks the party's mana and heals on it
  let drained = 0, drainHeals = 0;
  runs('2-14', 10, res => { const lc = res.start.find(u => u.key === 'leech'); for (const e of res.log) { if (e.t === 'mana' && e.amt < 0 && e.by === lc.id) drained -= e.amt; if (e.t === 'heal' && e.how === 'drain' && e.tgt === lc.id) drainHeals++; } });
  ok(drained > 300 && drainHeals > 5, `the Font Leech drains ${drained} mana over 10 battles and heals on it ${drainHeals} times`);
  // regeneration and a summoning phase: Old Growth heals the Antlered One every turn, and the Wild Hunt calls 2 wolves
  let regen = 0, hunts = 0, huntSpoils = 0;
  runs('3-17', 10, res => {
    const a = res.start.find(u => u.key === 'antlered');
    regen += res.log.filter(e => e.t === 'heal' && e.how === 'regen' && e.tgt === a.id).length;
    const ph = res.log.findIndex(e => e.t === 'phase' && e.who === a.id);
    if (ph >= 0 && res.log.slice(ph, ph + 4).filter(e => e.t === 'summon' && e.unit.key === 'briarwolf').length === 2) hunts++;
    if (Campaign.earn(res, st('3-17')).foes > 3) huntSpoils++;
  });
  ok(regen > 20 && hunts > 5 && !huntSpoils, `Old Growth heals (${regen} times) and the Wild Hunt calls two wolves (${hunts}/10), who drop nothing`);
  // splash and an aura: the Marshal's blows splash onto the hero beside, and below half health the keep burns
  let splashes = 0, burning = 0;
  runs('4-18', 10, res => {
    splashes += res.log.filter(e => e.t === 'hit' && e.splash && e.tgt[0] === 'p').length;
    const ph = res.log.findIndex(e => e.t === 'phase');
    if (ph >= 0 && res.log.slice(ph).filter(e => e.t === 'tick' && e.key === 'burn' && e.who[0] === 'p').length >= 3) burning++;
  });
  ok(splashes > 20 && burning > 5, `the Marshal's blade splashes (${splashes}) and the keep burns (${burning}/10)`);
  // charged blasts on a row: Thundering Charge marks the whole front row, then lands on each
  let rowMarks = 0, rowHits = 0;
  runs('3-14', 10, res => {
    rowMarks += res.log.filter(e => e.t === 'status' && e.key === 'charging' && e.targets && e.targets.length === 2).length;
    for (let i = 0; i < res.log.length; i++) if (res.log[i].t === 'act' && res.log[i].skill === 'thunderhit' && res.log[i].targets.length === 2) rowHits++;
  });
  ok(rowMarks > 5 && rowHits > 5, `Thundering Charge marks the front row (${rowMarks}) and lands on both (${rowHits})`);
  // the Hollow King: his court called in the first phase only, the lanterns snuffed, then every hero Doomed
  let kingPhases = 0, lateCourt = 0, allDoomed = 0;
  runs('5-18', 10, res => {
    const k = res.start.find(u => u.key === 'hollowking');
    const p2 = res.log.findIndex(e => e.t === 'phase' && e.n === 2), p3 = res.log.findIndex(e => e.t === 'phase' && e.n === 3);
    if (p2 >= 0 && p3 > p2) kingPhases++;
    if (p2 >= 0 && res.log.slice(p2).some(e => e.t === 'act' && e.who === k.id && e.skill === 'courtofshades')) lateCourt++;
    if (p3 >= 0 && res.log.slice(p3, p3 + 14).filter(e => e.t === 'status' && e.on && e.key === 'doom').length >= 3) allDoomed++;
  });
  ok(kingPhases > 3 && !lateCourt && allDoomed > 3, `the Hollow King's three phases (${kingPhases}/10), no court after the second (${lateCourt}), every hero Doomed in the third (${allDoomed})`);
  // the Drowned Bishop raises his fallen
  let raised = 0;
  runs('2-17', 10, res => { raised += res.log.filter(e => e.t === 'revive' && e.tgt[0] === 'f').length; });
  ok(raised > 3, `the Drowned Bishop raises the fallen (${raised} over 10 battles)`);
  // the Silent Sister silences healers, and the Mourner's Dirge kindles (its id no longer clashes with a passive)
  let silenced = 0, dirges = 0;
  runs('2-4', 10, res => { silenced += res.log.filter(e => e.t === 'status' && e.on && e.key === 'silenced' && ['pilgrim', 'surgeon'].includes((res.start.find(u => u.id === e.who) || {}).key)).length; });
  runs('1-11', 10, res => { dirges += res.log.filter(e => e.t === 'act' && e.skill === 'mdirge').length; });
  ok(silenced > 5 && dirges > 5, `the Silent Sister silences healers (${silenced}) and the Mourner kindles (${dirges})`);
  // Gather: no attack, and twice a basic attack's mana
  {
    const w = Hero.spec(refHero('warden', 20, 'g1'), [{ if: 'always', do: 'gather' }]);
    const res = simulate({ seed: 5, party: [w, null, null, null, null, null], foes: ['shambler'], level: 1, partyRules: [], loadout: [] });
    const g = res.log.findIndex(e => e.t === 'act' && e.skill === 'gather'), before = res.log.slice(0, g).reverse().find(e => e.t === 'act' && e.who === 'p0');
    const mp0 = before ? before.mp : res.start[0].mp;
    ok(g >= 0 && res.log[g].mp === Math.min(res.start[0].maxMp, mp0 + 2 * CLASSES.warden.mpGain), `Gather restores twice the basic attack's mana (${mp0} → ${g >= 0 ? res.log[g].mp : '?'})`);
  }

  // rewards (home-base spec §5): spoils by rank, the clear reward by tier, doubled on a first clear
  const won = (stage, L, seed = 1) => { for (let k = 0; k < 50; k++) { const r = simulate(refSetup(stage, seed + k, REF.ORDERS[0], L)); if (r.winner === 0) return r; } return null; };
  const r4 = won(st('1-4'), 4), e4 = Campaign.earn(r4, st('1-4'), { first: true }), S4 = GOLD_SCALE(2);
  ok(e4.foes === 3 && e4.spoilsGold === Math.round(3 * 8 * S4) && e4.clearGold === Math.round(20 * S4 * 2) && e4.mats.bone_dust >= 6 && e4.gear.some(g => g.why === 'clear'), `a first clear of 1-4: spoils, a doubled Standard reward and a certain gear roll (${JSON.stringify({ g: e4.gold, m: e4.mats })})`);
  const e4b = Campaign.earn(r4, st('1-4'));
  ok(e4b.clearGold === Math.round(20 * S4) && JSON.stringify(Campaign.earn(r4, st('1-4'))) === JSON.stringify(e4b), 'a replay pays the plain clear reward, and the same battle always earns the same');
  // XP (regions study §5.3): a share of a level at the stage's level; a first clear pays every hero at least XP_FLOOR of
  // a level at the party's top hero's level, and replays keep the plain rule
  const plain4 = Math.round((3 * 0.06 + 0.15) * Hero.xpToNext(2));
  ok(e4b.xp === plain4 && !e4b.floor, `a replay: XP is a share of a level at the stage's level (${e4b.xp})`);
  ok(Campaign.topLevel(r4) === 4 && e4.xp === Math.round(XP_FLOOR * Hero.xpToNext(4)) && e4.floor === 4 && e4.xpLv === e4b.xpLv,
    `a first clear with a level 4 party pays the floor, ${Math.round(XP_FLOOR * 100)}% of a level at level 4 (${e4.xp} XP, not ${plain4}), and Renown still counts the stage's own share`);
  const e4lo = Campaign.earn(r4, st('1-4'), { first: true, top: 2 });
  ok(e4lo.xp === plain4 && !e4lo.floor, `a first clear that pays more than the floor keeps its own XP (${e4lo.xp})`);
  const e4cap = Campaign.earn(r4, st('1-4'), { first: true, top: HERO.CAP });
  ok(Number.isFinite(e4cap.xp) && e4cap.xp === Math.round(XP_FLOOR * Hero.xpToNext(HERO.CAP - 1)), `a top hero at the cap: the floor stays finite (${e4cap.xp})`);
  {
    const r1 = won(st('1-1'), 1), e1 = Campaign.earn(r1, st('1-1'), { first: true });
    ok(e1.xp === Math.round(st('1-1').firstXp * Hero.xpToNext(1)) && e1.xp >= Hero.xpToNext(1), `1-1's first clear still brings the first level (${e1.xp} XP)`);
    // the play-test's case: after 1-1, a level 2 hero at 1-2
    const r2 = won(st('1-2'), 2), first2 = Campaign.earn(r2, st('1-2'), { first: true }), again2 = Campaign.earn(r2, st('1-2'));
    ok(first2.xp === Math.round(XP_FLOOR * Hero.xpToNext(2)) && Campaign.share(first2.xp, 2) >= XP_FLOOR - 0.01 && !Campaign.tooEasy(first2.xp, 2),
      `1-2's first clear pays a level 2 hero ${Math.round(100 * Campaign.share(first2.xp, 2))}% of a level (${first2.xp} XP of ${Hero.xpToNext(2)})`);
    ok(again2.xp < first2.xp && Campaign.tooEasy(again2.xp, 2) && !Campaign.tooEasy(again2.xp, 1), `a replay of 1-2 is Too easy for a level 2 hero (${again2.xp} XP, ${Math.round(100 * Campaign.share(again2.xp, 2))}%), not for a level 1 one`);
    // the stage sheet's preview measures it for the party's heroes, with the same floor
    const hero = lv => ({ name: 'H' + lv, level: lv }), pf = Campaign.preview(st('1-2'), true, [hero(2), hero(1)]), pr = Campaign.preview(st('1-2'), false, [hero(2), hero(1)]);
    ok(pf.xp === first2.xp && pf.floor === 2 && pf.each.length === 2 && Math.abs(pf.each[0].share - first2.xp / Hero.xpToNext(2)) < 1e-9 && pf.each[1].share > pf.each[0].share && !pf.each.some(x => x.easy),
      `the stage sheet: 1-2's first clear, ${pf.xp} XP each: ${pf.each.map(x => Math.round(100 * x.share) + '%').join(' and ')} of a level for heroes at level 2 and 1`);
    ok(pr.xp === again2.xp && !pr.floor && pr.each[0].easy && !pr.each[1].easy, `the stage sheet: a replay of 1-2 is Too easy for the level 2 hero only`);
    ok(Campaign.share(100, HERO.CAP) === null && !Campaign.tooEasy(0, HERO.CAP), 'a hero at the cap has no share, and nothing is Too easy for them');
  }
  const lost = (() => { for (let k = 0; k < 60; k++) { const r = simulate(refSetup(st('1-9'), 900 + k, REF.ORDERS[1], 3)); if (r.winner === 1) return r; } return null; })();
  const el = Campaign.earn(lost, st('1-9'), { first: true });
  ok(lost && !el.clearGold && !el.mats.bone_dust && el.gold === el.spoilsGold, 'a loss keeps the spoils of the foes defeated, and no clear reward');
  let loot = 0, rolls = 0;
  for (let k = 0; k < 400; k++) { const r = Campaign.earn(Object.assign({}, r4, { seed: k }), st('1-4')); loot += r.gear.filter(g => g.why === 'loot').length + Object.values(r.items).reduce((a, b) => a + b, 0) - (r.gear.some(g => g.why === 'clear') ? 0 : 0); rolls += 3; }
  ok(loot / rolls > 0.07 && loot / rolls < 0.2, `normal foes drop loot about 10% of the time (${(100 * loot / rolls).toFixed(1)}%, clear items included)`);
  const rb = won(st('1-18'), 13), eb = Campaign.earn(rb, st('1-18'), { first: true });
  ok(eb.gear.filter(g => g.why === 'loot').length + Object.values(eb.items).reduce((a, b) => a + b, 0) >= 2 && eb.mats.bone_dust >= 40, 'the boss drops 2 loot rolls, and its first clear 40 Bone Dust');

  // a save of its own: unlocks, fatigue and trips
  const S = protoState(); S.currencies.gold = 0; // the prototype's six, with no gold yet
  Campaign.ensure(S);
  Tactics.useRoster(S.roster, S.party);
  Tactics.load({ party: { slots: 2, rules: [] }, loadout: { slots: 2, items: [] } });
  const res0 = won(st('1-1'), 3);
  const fat0 = S.roster.map(c => c.fatigue);
  Campaign.setOut(0, S);
  let out = Campaign.afterBattle(Object.assign({}, res0), S);
  ok(S.campaign.cleared.includes('1-1') && S.unlocks.tactics && out.r.unlocks.includes('tactics') && out.why.k === 'once' && !S.campaign.trip && S.campaign.lastTrip.lit[0] === '1-1', 'clearing 1-1 lights it, opens Tactics, and with no Keep going yet the party comes home');
  const hero0 = res0.start.find(u => u.side === 0), c0 = S.roster.find(c => c.id === hero0.char);
  ok(c0 && Math.abs(c0.fatigue - (fat0[S.roster.indexOf(c0)] + res0.stats[hero0.id].turns)) < 1e-9, `fatigue: +1 for each turn a hero took (${c0.fatigue})`);
  ok(S.currencies.gold === out.r.gold && out.r.gold > 0 && S.currencies.mats.bone_dust === out.r.mats.bone_dust, 'gold and materials go to the purse');
  for (const id of ['1-2', '1-3']) { Campaign.setOut(st(id).index, S); Campaign.afterBattle(won(st(id), 4), S); }
  ok(S.unlocks.recruitboard && S.unlocks.items && S.inventory.potions.draught >= 2 && Tactics.loadout().items.filter(x => x === 'draught').length === 2 && Tactics.owner('party').rules.some(r => r.do === 'draught' && r.n === 50), '1-3 brings the loadout, 2 Healing Draughts and the draught rule');
  ok(Tactics.isKnown({ if: 'foes_at_least', n: 3 }) === false, 'N or more foes waits for 1-4');
  for (const id of ['1-4', '1-5', '1-6']) { Campaign.setOut(st(id).index, S); Campaign.afterBattle(won(st(id), 5), S); }
  ok(Tactics.isKnown({ if: 'foes_at_least', n: 3 }) && Tactics.isKnown({ if: 'foe_back' }) && S.unlocks.tollhouse && S.unlocks.keepgoing && S.campaign.road.keepGoing, 'conditions and blueprints from 1-4 to 1-6, and Keep going');
  ok(Tactics.owner('party').rules.some(r => r.if === 'bb_fatigue' && r.n === 75 && r.do === 'home' && r.on), 'the come-home rule at 75+ fatigue is on by default from 1-6');
  // Keep going: a win walks on to the next stage, until a between-battle rule fires
  for (const c of S.roster) c.fatigue = 0;
  const T = Campaign.setOut(st('1-7').index, S);
  out = Campaign.afterBattle(won(st('1-7'), 6), S);
  const xp7 = out.r.xp;
  ok(T.keep && out.next === st('1-8').index && S.campaign.trip && S.campaign.trip.stage === out.next, 'Keep going: a first clear walks on to the next dark stage');
  const tired = S.roster.find(c => S.party.includes(c.id));
  tired.fatigue = 80;
  out = Campaign.afterBattle(won(st('1-8'), 6), S);
  ok(out.next == null && out.why.k === 'rule' && /fatigue/.test(out.why.text) && !S.campaign.trip, `the come-home rule fires between battles (${out.why.text})`);
  // what the results popup shows for a trip of several battles (js/results.js): its stages, its gear, and each hero's
  // XP since setting out, from their level and XP as they set out
  const LT = S.campaign.lastTrip, gotXp = x => { const c = S.roster.find(r => r.id === x.id); return Hero.xpBetween(x.from.level, c.level) - x.from.xp + c.xp; };
  ok(LT.fought.join() === '1-7,1-8' && LT.pieces.length === LT.gear && LT.heroes.length && LT.heroes.every(x => x.from && gotXp(x) >= 0 && gotXp(x) <= xp7 + out.r.xp) && LT.heroes.some(x => gotXp(x) === xp7 + out.r.xp),
    `a trip keeps the stages it fought, its gear, and each hero's level and XP as they set out (${LT.fought.join(', ')}; ${LT.heroes.map(gotXp).join(', ')} XP of ${xp7 + out.r.xp})`);
  // a Spent hero walks home alone; the rest carry on
  for (const c of S.roster) c.fatigue = 0;
  Campaign.setOut(st('1-8').index, S);
  tired.fatigue = 99.5;
  out = Campaign.afterBattle(won(st('1-8'), 7), S);
  ok(tired.fatigue >= 100 && out.left.includes(tired.id) && out.next === st('1-8').index && S.campaign.trip.out.includes(tired.id) && !Campaign.fit(S).includes(tired), 'a Spent hero walks home alone while the rest farm on');
  Campaign.callHome(S);
  out = Campaign.afterBattle(won(st('1-8'), 7), S);
  ok(out.why.k === 'called' && !S.campaign.trip, 'calling the party home ends the trip after the battle');
  ok(Campaign.readiness(st('1-9'), S) !== 'gold' || Campaign.fit(S).length >= 4, 'readiness');
  // a loss sends the party home with the stage's hint; the boss always sends it home
  Campaign.restAll(S);
  Campaign.setOut(st('1-9').index, S);
  out = Campaign.afterBattle(lost, S);
  ok(out.why.k === 'lost' && out.why.hint === st('1-9').hint && !S.campaign.cleared.includes('1-9'), 'a loss: home, with the hint, and the frontier stays');
  for (const x of STAGES.slice(8, 17)) { S.campaign.cleared.push(x.id); for (const id of x.first) Campaign.unlock(id, S); }
  Campaign.setOut(17, S);
  out = Campaign.afterBattle(rb, S);
  ok(out.why.k === 'boss' && S.unlocks['region:1'] && S.unlocks['relic:gravediggersspade'] && Items.owns(S, 'gravediggersspade') && Tactics.isKnown({ if: 'boss_present' }), 'the boss: home, the Relic, Boss present and Region II opens');
  // 1-11 teaches Tactician I and brings the Tactician's blueprint. The building builds on it: a 3rd party rule slot.
  ok(S.unlocks.tactician && Tactics.isKnown({ if: 'foe_hp_lt', n: 25 }) && Tactics.isKnown({ if: 'bb_fell' }) && Tactics.isKnown({ if: 'self_has', s: 'kindled' }) && Tactics.isKnown({ if: 'bb_out', s: 'draught' }), '1-11 teaches Tactician I (the thresholds, its conditions and “out of an item”) and brings the Tactician’s blueprint');
  // Region II opens with the Sexton: its buildings and its classes; and Tactician I brings the Move action
  ok(S.unlocks.mastershall && S.unlocks.shrine && S.unlocks.surgeon && S.unlocks.bellringer && /Gravefields are lit/.test(out.why.text), 'Region II opens with the Masters’ Hall, the Shrine, the Barber-Surgeon and the Bellringer');
  ok(Tactics.actions(c0.id).includes('move') && !Tactics.actions(c0.id).includes('gather'), 'Tactician I teaches the Move action, and Gather waits for Lesson II');
  Base.ensure(S); S.currencies.gold += 1000; S.currencies.mats.bone_dust += 50;
  const slots0 = Tactics.owner('party').slots;
  ok(Base.build('tactician', S.base.plots.indexOf(null), S) && Tactics.owner('party').slots === Math.min(5, slots0 + 1), `the Tactician stands, with a 3rd party rule slot (${slots0} → ${Tactics.owner('party').slots})`);
  // “Out of [item]” (Tactician I): a between-battle rule that sends the party home once the Bag has none left
  const outRule = { if: 'bb_out', s: 'draught', do: 'home' };
  ok(CONDITIONS.bb_out.bb(outRule, { bag: { draught: 0, salts: 3 } }) && !CONDITIONS.bb_out.bb(outRule, { bag: { draught: 2 } }) && ruleCond(outRule) === 'Between battles: out of Healing Draughts', 'out of Healing Draughts holds only when the Bag has none');
  ok(Tactics.add('party', outRule) && Tactics.owner('party').rules.length <= Tactics.owner('party').slots, 'the new slot takes the rule');
  Campaign.restAll(S); S.campaign.road.keepGoing = true; S.inventory.potions.draught = 20;
  Campaign.setOut(st('1-8').index, S);
  out = Campaign.afterBattle(won(st('1-8'), 8), S);
  ok(out.next != null && S.campaign.trip && S.inventory.potions.draught > 0, 'with draughts in the Bag, the trip goes on');
  S.inventory.potions.draught = 0;
  out = Campaign.afterBattle(won(st('1-8'), 8, 7), S);
  const dry = !(S.inventory.potions.draught > 0);
  ok(dry && out.why && out.why.k === 'rule' && /out of Healing Draughts/.test(out.why.text) && !S.campaign.trip, `with none left, the party comes home (${out.why ? out.why.text : 'no reason'})`);
  if (S.campaign.trip) Campaign.end(null, S);
  Tactics.remove('party', Tactics.owner('party').rules.findIndex(r => r.if === 'bb_out'));
  // Lesson II (the Tactician's level 3) teaches its conditions and the Gather action
  Base.rec('tactician', S).level = 3; Base.teach(S);
  ok(Tactics.isKnown({ if: 'self_hp_gt', n: 50 }) && Tactics.isKnown({ if: 'battle_start' }) && Tactics.actions(c0.id).includes('gather'), 'Lesson II teaches its conditions and the Gather action');
  // a save from build step 6 that beat the Sexton gets the records Region II opens with
  const S6 = defaultState();
  S6.unlocks['region:1'] = Date.now();
  Campaign.ensure(S6);
  ok(S6.unlocks.mastershall && S6.unlocks.shrine && S6.unlocks.surgeon && !S6.unlocks.whetstone, 'an older save past the Sexton gets the Masters’ Hall, the Shrine and the classes');
  const hooked = [];
  Campaign.onUnlock(id => hooked.push(id));
  Campaign.unlock('cond:ally_fallen', S);
  ok(hooked.includes('cond:ally_fallen') || S.unlocks['cond:ally_fallen'], 'unlocks fire the hook for step 5');
  // the hooks step 5 hangs on: onSettle (with each hero's turns), onHome, the Spent flag, Fatigue.battle and closed trips
  const settled = [], homes = [];
  Campaign.onSettle((r, stage, res, st) => settled.push({ r, stage, res }));
  Campaign.onHome((last, st) => homes.push(last));
  Campaign.restAll(S);
  const flagged = S.roster.find(c => S.party.includes(c.id));
  flagged.spent = true;
  ok(!Campaign.fit(S).includes(flagged), 'a hero flagged Spent stays home until the flag clears, whatever their fatigue');
  flagged.spent = false;
  S.campaign.road.keepGoing = false;
  Campaign.setOut(st('1-1').index, S);
  const rh = won(st('1-1'), 3);
  Campaign.afterBattle(rh, S);
  const sh = settled[settled.length - 1];
  ok(sh && sh.stage.id === '1-1' && Object.keys(sh.r.turns).length === rh.start.filter(u => u.side === 0).length && Object.entries(sh.r.turns).every(([id, n]) => n === rh.stats[rh.start.find(u => u.char === id).id].turns), 'onSettle carries the stage, the rewards and each hero’s turns');
  ok(homes.length === 1 && homes[0] === S.campaign.lastTrip, 'onHome fires once when the party is home');
  Campaign.setOut(st('1-1').index, S);
  const rf = Campaign.afterBattle(won(st('1-1'), 3), S);
  ok(Object.keys(rf.r.fatigue).length && Object.values(rf.r.fatigue).every(x => 'rec' in x), 'the home base’s Fatigue.battle settles the fatigue');
  Save.info.awayMs = 3600000;
  Campaign.setOut(st('1-1').index, S);
  Campaign.afterBattle(won(st('1-1'), 3), S, { closed: true });
  Save.info.awayMs = 0;
  ok(Math.abs(Date.now() - 3600000 - S.campaign.lastTrip.at) < 5000, 'a trip ended by the app closing is home from the moment it closed');
  // the last boss lights the whole road
  for (const x of STAGES) if (!S.campaign.cleared.includes(x.id)) S.campaign.cleared.push(x.id);
  ok(Campaign.frontier(S) === STAGES.length && Campaign.litIn(4, S) === 18, 'every lantern lit: the frontier is past the end of the road');
  console.log('Campaign checked: the five regions\' data and art, foe growth, stepping up, summons, phases, fleeing, wanderers, Hidden, Lure and Move, thorns, mana drain, regeneration, splash, auras, row charges, raising, Gather, rewards, fatigue, unlocks, trips and the hooks for step 5.');
}

// ── The reference party, every stage of every region against its target (campaign spec §5.6). Off-target stages are
// listed for tuning; only a clear break counts as a problem. The seeds are fixed, so the report is the same every run.
{
  const rep = referenceReport(Math.max(10, Math.round(N / 10)), { check });
  for (const r of rep.rows) {
    if (r.kind === 'road' || r.kind === 'threat') ok(r.win >= 0.75, `${r.id}: a road stage wins only ${Math.round(100 * r.win)}% at its level`);
    else ok(r.win >= 0.25 && r.win <= 0.9, `${r.id}: a wall wins ${Math.round(100 * r.win)}% at its level`);
  }
  ok(rep.weary && rep.tired, 'the starting hero tires in the first hour');
}

// ── servers (the title's server picker, js/save.js): each keeps its own save, and switching leaves the others intact.
// S1 keeps the key the game always had.
{
  const mem = new Map(), was = global.localStorage;
  global.localStorage = { getItem: k => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k) };
  // A save's content, without lastSeen: leaving a server writes its save once more on the way out, which stamps the
  // time it was last open, and nothing else.
  const content = key => { const d = JSON.parse(mem.get(key)); delete d.lastSeen; return JSON.stringify(d); };
  try {
    Save.load();
    ok(Save.server === 1 && !Save.state.roster.length && mem.has('lantern-road-save'), 'a first boot opens S1, under the save key the game always had');
    Base.newGame('sellsword', Save.state); Save.state.currencies.gold = 111; Save.commit();
    const s1 = content('lantern-road-save');
    let L = Save.servers();
    ok(L.newest === 2 && L.list.length === 2 && L.list[0].n === 1 && L.list[0].lead === 'sellsword' && L.list[1].status === 'new', 'the list: S1 with its lead hero, then S2, the newest');
    Save.use(2, true);
    ok(Save.server === 2 && !Save.state.roster.length && Save.state.currencies.gold !== 111, 'a new server starts a fresh save');
    Base.newGame('pilgrim', Save.state); Save.state.currencies.gold = 222; Save.commit();
    ok(content('lantern-road-save') === s1, 'starting S2 leaves S1’s save untouched');
    ok(JSON.parse(mem.get('lantern-road-save-s2')).roster[0].cls === 'pilgrim', 'S2 saves beside it, under lantern-road-save-s2');
    Save.use(1);
    ok(Save.server === 1 && Save.state.roster.length === 1 && Save.state.roster[0].cls === 'sellsword' && Save.state.currencies.gold === 111, 'back on S1: its save as it was');
    Save.state.currencies.gold = 333; Save.commit();
    const s2 = JSON.parse(mem.get('lantern-road-save-s2'));
    ok(s2.currencies.gold === 222 && s2.roster.length === 1 && s2.roster[0].cls === 'pilgrim', 'playing on S1 leaves S2’s save untouched');
    Save.use(2);
    ok(Save.state.currencies.gold === 222 && Save.state.roster[0].cls === 'pilgrim', 'S2 again, as it was');
    L = Save.servers();
    ok(L.newest === 3 && L.list.filter(x => x.mine).map(x => x.lead).join() === 'sellsword,pilgrim' && L.current === 2, 'both servers listed with their lead heroes, and S3 the newest');
    Save.load();
    ok(Save.server === 2 && Save.state.roster[0].cls === 'pilgrim', 'a reload opens on the last server used');
    Save.use(1);
    ok(Save.state.currencies.gold === 333, 'and S1 keeps its last change');
    Save.use(2, true);
    ok(JSON.parse(mem.get('lantern-road-save-s2-bak')).currencies.gold === 222 && !Save.state.roster.length, 'a fresh start over a server keeps the old save as its backup');
    console.log('Servers checked: each keeps its own save (S1 under its old key), switching leaves the others intact, and the last one used opens next.');
  } finally { global.localStorage = was; }
}

console.log(`\n${((Date.now() - t0) / 1000).toFixed(1)}s. Stalls: ${totalStalls}. Problems: ${problems.length}`);
problems.forEach(p => console.log('  ! ' + p));
process.exitCode = problems.length || totalStalls ? 1 : 0;
