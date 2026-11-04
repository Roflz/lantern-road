'use strict';
// Headless battle test: simulates many battles per stage and reports win rates, battle length, which skills
// and rules fire, and any broken invariants. Then it runs rules experiments (the same battles with different rules),
// battles with characters at several levels, a fuzz of random builds across all twelve classes, and tests the Tactics
// and Hero models and the save migration, and gear: every item's effect, weapons by rarity, loot and the Bag. Run: node tools/simtest.js [battles per stage, default 300]
const fs = require('fs'), path = require('path'), vm = require('vm');
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
for (const f of ['core.js', 'data.js', 'classes.js', 'classes-late.js', 'items.js', 'sim.js', 'hero.js', 'save.js', 'rules.js']) vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), { filename: f });

const N = Number(process.argv[2]) || 300;
const EVENTS = new Set(['start', 'round', 'enrage', 'turn', 'tick', 'act', 'hit', 'miss', 'heal', 'revive', 'status', 'die', 'delay', 'end', 'item', 'mana',
  'resist', 'skip', 'summon', 'swap', 'quick', 'maxhp', 'steal', 'counter', 'saved', 'broke', 'cleanse', 'strip', 'corpse', 'refill', 'sprung']);
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

// ── The stages with the default party: level-1 recruits and their starter rules
console.log('Every stage with the starting party (level 1, starter skill only, starter rules)');
Tactics.useRoster(builtParty(1, 'start'));
for (const stage of STAGES) {
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
  console.log(`\nThe party built at each level (${M} battles each; win %, rounds, knockouts per battle)`);
  console.log('   ' + pad('stage', 22) + LVS.map(l => lpad('Lv ' + l, 18)).join(''));
  const table = {};
  for (const stage of STAGES) {
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
  const hard = STAGES[STAGES.length - 1].id;
  ok(table[hard + ':1'].win < table[hard + ':12'].win, `levels don't change the ${hard} win rate`);
  ok(table['1-3:1'].rounds > table['1-3:20'].rounds, 'higher levels should end 1-3 sooner');
}

// ── Skills: the same party and seeds with different skills equipped
{
  const M = Math.max(60, Math.round(N / 3)), stage = STAGES.find(s => s.id === '2-3');
  console.log(`\nSkills on 2-3, level 12 party (${M} battles each)`);
  const run = (name, edit) => {
    let w = 0, r = 0, ko = 0, dealt = 0;
    for (let i = 0; i < M; i++) {
      const chars = builtParty(12, ':sk' + i);
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
  ok(none.r > base.r && none.ko > base.ko, 'battles without skills should run longer and cost more knockouts');
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
for (const id of ['1-3', '2-3']) {
  console.log(` ${id} ${STAGES.find(s => s.id === id).name}, without item rules so the Pilgrim is the only healer`);
  const a = trial(id, t => { noDraught(t); setRules(t, 'pilgrim', healFirst); });
  const b = trial(id, t => { noDraught(t); setRules(t, 'pilgrim', healLast); });
  const off = trial(id, t => { noDraught(t); for (const p of t.party) if (p) p.rules = p.rules.map(r => Object.assign({}, r, { on: false })); });
  line('Pilgrim: heal rules first', a); line('Pilgrim: heal rules last', b); line('Every hero rule switched off', off);
  ok(b.mend === 0, `${id}: Mend fired ${b.mend} times with "Always → Smite" above it`);
  ok(a.healed > b.healed * 2, `${id}: heal-first healing ${a.healed} is not well above heal-last ${b.healed}`);
  ok(off.ruleFires === 0, `${id}: switched-off rules fired ${off.ruleFires} times`);
  ok(a.kos <= b.kos, `${id}: heal-first KOs ${a.kos} above heal-last ${b.kos}`);
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
  const STAGE_FOR = { huntershauberk: ['1-2'], mothlure: ['2-1', '2-2', '2-3'], earstoppers: ['1-3'], ironboundcollar: ['T-1'], drownedmail: ['T-2'], marshalsblade: ['1-1', '1-2', '2-1'] };
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
      const stage = ids[i % ids.length] === 'T-1' ? STUNNER : ids[i % ids.length] === 'T-2' ? CURSER : STAGES.find(s => s.id === ids[i % ids.length]);
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
  for (const sid of ['1-3', '2-1', '2-3']) {
    const stage = STAGES.find(s => s.id === sid), row = [];
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
  for (const sid of ['1-3', '2-1', '2-3']) ok(table[sid + ':common'].r < table[sid + ':null'].r && table[sid + ':common'].w >= table[sid + ':null'].w - 0.05, `${sid}: a Common weapon should end battles sooner, and lose no more often`);
  ok(table['2-3:rare'].r <= table['2-3:common'].r + 0.2, 'Rare weapons should end 2-3 about as fast as Common ones, or faster');

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
  const S0 = defaultState();
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
  ok(Hero.ruleSlots(c) === CLASSES.sellsword.slots[1], 'rule slots stop at the class maximum');
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
  ok(s.v === SAVE_VERSION && SAVE_VERSION === 3, 'save version 3');
  ok(s.roster.length === 6 && s.roster.every(c => c.base && c.level === 1 && c.equip.length === 1), 'characters upgraded');
  ok(s.roster.every(c => c.gear.weapon && GEAR[c.gear.weapon.id].type === WEAPON_OF[c.cls] && !c.gear.armor) && Array.isArray(s.inventory.items), 'version 3 gives every character a Common weapon');
  ok(s.roster[0].base.hp === CLASSES.warden.hp, 'the prototype stats became the level-1 roll');
  ok(s.tactics.heroes.c1 && s.tactics.heroes.c1.rules[0].do === 'guard' && !s.tactics.heroes.warden, 'rules moved from the class to the character');
  ok(s.tactics.sets[0].heroes.c1, 'saved sets moved too');
  ok(s.roster[0].lessons.rule === 1 && Hero.ruleSlots(s.roster[0]) === 4, 'a rule slot bought in step 2 becomes a lesson');
  const v0 = upgrade({ cleared: ['1-1'], best: { '1-1': 4 }, speed: 2 });
  ok(v0.v === SAVE_VERSION && v0.campaign.cleared[0] === '1-1' && v0.roster.length === 6, 'a step 1 save still upgrades');
  const v2 = JSON.parse(JSON.stringify(defaultState()));
  v2.v = 2; v2.roster.forEach(c => { c.gear = { weapon: null, armor: null, accessory: null }; c.level = 7; });
  v2.roster[1].gear = { weapon: 'Rusty sword', armor: null, accessory: null };
  v2.inventory.items = [{ id: 'bonecharm', lv: 2, uid: 'x1' }, { id: 'nope' }, 'junk', { id: 'gravecutter', lv: 9 }];
  const s3 = upgrade(v2);
  ok(s3.v === 3 && s3.roster.every(c => c.gear.weapon && c.gear.weapon.lv === 7) && s3.inventory.items.map(x => x.id).join() === 'bonecharm,gravecutter' && s3.inventory.items[1].uid, `version 2 → 3: weapons at the character's level, the Bag cleaned (${JSON.stringify(s3.inventory.items)})`);
  console.log('Save migration checked: version 1 → 3 (characters, their rules, gear), version 2 → 3 (gear), and version 0 → 3.');
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
  ok(Tactics.slotCost(W) === 0 && Tactics.unlockSlot(W) && Tactics.owner(W).slots === 4 && Tactics.charOf(W).lessons.rule === 1, 'a free rule-slot lesson (the Masters’ Hall hook)');
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
  ok(Tactics.unlockItemSlot() && Tactics.setItem(2, 'tincture') && Tactics.setup().loadout.length === 3, 'opening an item slot');
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

console.log(`\n${((Date.now() - t0) / 1000).toFixed(1)}s. Stalls: ${totalStalls}. Problems: ${problems.length}`);
problems.forEach(p => console.log('  ! ' + p));
process.exitCode = problems.length || totalStalls ? 1 : 0;
