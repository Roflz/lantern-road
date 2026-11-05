'use strict';
// Lantern Road · the twelve classes: stats, growth, resistances, basic attacks and skill trees.
// docs/content-spec.md §4 is the source of truth; every number here is a starting value to tune.
//
// ── How a class reads
// stats: per stat, [lowest level-1 roll, highest level-1 roll, growth per level]. res: level-1 resistances.
// basic: the basic attack. starter: the skill a recruit knows for free. paths: the three build paths, each with one
// skill per tier (1–9). rules: the class's starter rules. slots: [rule slots at the start, the class's most].
//
// ── How a skill reads
// Every skill: name, icon, fx (its look in battle), kind ('active', 'passive' or 'key' for a keystone), d (what it
// does: {a,b} is a value that grows from level 1 to level 5, {a,b,n} the same rounded to a whole number), aw (what
// awakening adds), later (an effect that waits for a later build step: 'fatigue' or 'gold'). Plate-born works through
// the gear the Warden wears (js/items.js, Items.gearStats).
// Values are a number, or [level 1, level 5] rising evenly in between.
// Actives also have
//   shape, range, reach   as for foe skills (js/data.js)
//   cost (mana), hpCost (share of max health), hpCur (share of current health)
//   power (damage per hit, × Power), hits, n (random foes), crit (bonus %), critX (crit multiplier), sure (can't miss
//   or be dodged), pierce (ignores Defense), noGuard (ignores Guarding and Cover)
//   st     statuses on each target hit: { k, t (turns), v (strength %), p (tick strength × Power), c (landing chance %),
//          time, n (a count) }. self: statuses on the user.
//   heal (× Power), healPct (of the target's max health), mana, push (share of a turn), sooner, revive, cleanse
//   ('all', a list of statuses or a number), strip (true, or a number)
//   pick(E,u,x,p)   which reachable units it may aim at        need(E,u,p)   whether it can be used now
//   mult(E,u,t,p)   a damage multiplier for one target          kill(E,u,t,p) when it fells a foe
//   then(E,u,res,p) after the generic effects (res: [{ t, landed, killed, d }])
//   run(E,u,ts,p)   in place of the generic effects
//   awk             fields that change when the skill is awakened
// Passives define hooks that the simulation calls (js/sim.js lists them under "passive hooks").
// E is the battle's engine (js/sim.js); u the skill's owner; p its level: { L, A (awakened), v(x), n(x) }.

const CLASSES = {};
const CLASS_ORDER = [];
const SKILL_LV_MAX = 5;

// A skill's text at a level (1–5): each {a,b} becomes its value there. which: 'd' (what it does) or 'aw'.
const fmtNum = v => String(Math.round(v * 100) / 100);
function skillText(sk, L, which = 'd') {
  return String(sk[which] || '').replace(/\{(-?[\d.]+),(-?[\d.]+)(,n)?\}/g, (m, a, b, n) => {
    const v = +a + (+b - +a) * (Math.min(Math.max(L, 1), SKILL_LV_MAX) - 1) / (SKILL_LV_MAX - 1);
    return fmtNum(n ? Math.round(v) : v);
  });
}
// The same text split into pieces, so a page can mark the numbers that grow: [{ text }, { num, next }].
function skillParts(sk, L, which = 'd') {
  const out = [], re = /\{(-?[\d.]+),(-?[\d.]+)(,n)?\}/g, t = String(sk[which] || '');
  let i = 0, m;
  const at = (a, b, n, lv) => { const v = a + (b - a) * (Math.min(Math.max(lv, 1), SKILL_LV_MAX) - 1) / (SKILL_LV_MAX - 1); return fmtNum(n ? Math.round(v) : v); };
  while ((m = re.exec(t))) {
    if (m.index > i) out.push({ text: t.slice(i, m.index) });
    out.push({ num: at(+m[1], +m[2], m[3], L), next: L < SKILL_LV_MAX ? at(+m[1], +m[2], m[3], L + 1) : null, lo: at(+m[1], +m[2], m[3], 1), hi: at(+m[1], +m[2], m[3], SKILL_LV_MAX) });
    i = re.lastIndex;
  }
  if (i < t.length) out.push({ text: t.slice(i) });
  return out;
}

// One status for a skill's st list.
const S = (k, t, o) => Object.assign({ k, t }, o || {});
const FIRE = ['firebomb', 'fireflask', 'volatilemix', 'clingingfire', 'flashover', 'greatwork', 'emberward'];
const SHIELD_SKILLS = ['bash', 'shieldtoss', 'shieldslam'];

function defClass(id, C, own, paths) {
  C.id = id;
  const avg = k => (C.stats[k][0] + C.stats[k][1]) / 2;
  for (const k of ['hp', 'mp', 'pow', 'def', 'spd', 'crit', 'dodge']) C[k] = avg(k);
  C.tree = [];
  C.skills = [C.starter];
  for (const sid in own) { SKILLS[sid] = Object.assign({ id: sid, cls: id }, own[sid]); }
  SKILLS[C.starter].tier = 1; SKILLS[C.starter].path = 0; SKILLS[C.starter].kind = 'active'; SKILLS[C.starter].starter = true;
  paths.forEach((list, pi) => {
    C.tree.push(list.map((def, ti) => {
      const sid = def.id;
      SKILLS[sid] = Object.assign({ cls: id, tier: ti + 1, path: pi + 1, kind: 'active' }, def);
      return sid;
    }));
  });
  CLASSES[id] = C;
  CLASS_ORDER.push(id);
}

// ═══════════════════════════════════════════════════════════════════ Sellsword
defClass('sellsword', {
  name: 'Sellsword', role: 'Front-row damage', row: 'front', weapon: 'Swords', mpGain: 10, slots: [3, 4],
  blurb: 'A mercenary who fights for the kill. Hits single targets harder than anyone in melee, opens bleeds and reaches into the back row, and grows more dangerous as they get hurt.',
  stats: { hp: [122, 148, 9], mp: [27, 33, 1], pow: [18, 22, 1.3], def: [5, 7, 0.35], spd: [9, 11, 0.02], crit: [8, 12, 0.06], dodge: [3, 7, 0.03] },
  res: { stun: 30, move: 30, bleed: 25, blight: 20, curse: 15, debuff: 25 },
  basic: 'strike', starter: 'cleave', second: 'lunge',
  paths: [['Executioner', 'Reaches any foe, finishes the wounded and refuels on kills.'], ['Bloodletter', 'Stacks Bleeding and cashes it in.'], ['Berserker', 'Spends health for damage, and grows stronger the closer it comes to falling.']],
  rules: [{ if: 'front_foe', do: 'cleave' }, { if: 'foe_lowest', do: 'strike' }],
}, {
  strike: { name: 'Strike', icon: 'sword', fx: 'slash', shape: 'foe', range: 'melee', power: 1, basic: true, d: 'One foe, melee, 1.0×. Restores 10 mana.' },
  cleave: { name: 'Cleave', icon: 'cleave', fx: 'cleave', shape: 'front', range: 'melee', cost: 15, power: [0.8, 1.1], d: '{0.8,1.1}× to each front-row foe.', aw: 'Each foe hit also Bleeds (2 turns, 0.2×).', awk: { st: [S('bleed', 2, { p: 0.2 })] } },
}, [
  [ // Executioner
    { id: 'lunge', name: 'Lunge', icon: 'sword', fx: 'lunge', shape: 'foe', range: 'melee', reach: true, cost: 20, power: [1.4, 1.9], d: '{1.4,1.9}× to one foe in any row.', aw: 'On a kill, the Sellsword’s next turn comes 50% sooner.', kill: (E, u, t, p) => { if (p.A) E.sooner(u, 0.5); } },
    { id: 'bountyhunter', kind: 'passive', name: 'Bounty Hunter', icon: 'coin', d: 'On a kill, restore {6,20,n} mana.', aw: 'Also heals 10% of max health on a kill.', kill: (E, u, t, p) => { E.mana(u, p.n([6, 20])); if (p.A) E.heal(u, u, u.maxHp * 0.1, { raw: true }); } },
    { id: 'finishingblow', name: 'Finishing Blow', icon: 'skull', fx: 'slash', shape: 'foe', range: 'melee', cost: 20, power: 1, d: '1.0×, doubled against foes below {35,45}% health. Refunds its mana on a kill.', aw: 'On a kill, strikes again at once at the lowest-health foe.', mult: (E, u, t, p) => (E.pct(t) < p.v([0.35, 0.45]) ? 2 : 1), kill: (E, u, t, p) => { E.mana(u, p.paid || 0); if (p.A && (p.depth || 0) < 5) { const n = E.lowest(E.reach(u, SKILLS.finishingblow)); if (n) E.useOn(u, 'finishingblow', n, Object.assign({}, p, { depth: (p.depth || 0) + 1, paid: 0 })); } } },
    { id: 'cutthroat', kind: 'passive', name: 'Cutthroat', icon: 'star', d: '+{5,15}% crit chance against foes below 50% health.', aw: 'Those crits deal ×2.0.', crit: (E, u, t, p) => (E.pct(t) < 0.5 ? p.v([5, 15]) : 0), critX: (E, u, t, p) => (p.A && E.pct(t) < 0.5 ? 2 : 0) },
    { id: 'dragout', name: 'Drag Out', icon: 'claw', fx: 'reap', shape: 'foe', range: 'melee', reach: true, cost: 20, power: [0.6, 0.9], d: '{0.6,0.9}×. A back-row target swaps places with the nearest front-row foe.', aw: 'The dragged foe is Exposed for 2 turns.', then: (E, u, res, p) => { for (const r of res) if (r.landed && r.t.alive && r.t.row === 'back' && E.drag(u, r.t) && p.A) E.status(u, r.t, 'exposed', { turns: 2 }); } },
    { id: 'markedfordeath', kind: 'key', name: 'Marked for Death', icon: 'skull', d: 'The first foe the Sellsword hits each battle takes +{20,40}% damage from them until it falls, but every other foe takes 10% less.', aw: 'When the marked foe falls, the mark passes to the lowest-health foe.',
      out: (E, u, t, p, c) => { if (c.dot) return 1; if (u.mfd == null) { u.mfd = t.id; E.status(u, t, 'deathmark', { turns: 99, sure: true }); } if (u.mfd === 'gone') return 1; return t.id === u.mfd ? 1 + p.v([0.2, 0.4]) : 0.9; },
      aFall: (E, o, t, src, p) => { if (t.id !== o.mfd) return; if (!p.A) { o.mfd = 'gone'; return; } const n = E.lowest(E.foes(o).filter(x => x !== t)); o.mfd = n ? n.id : 'gone'; if (n) E.status(o, n, 'deathmark', { turns: 99, sure: true }); } },
    { id: 'paidinfull', kind: 'passive', name: 'Paid in Full', icon: 'coin', d: 'Each kill this battle: +{4,8}% Power, up to 5 times.', aw: 'Up to 10 times.', out: (E, u, t, p) => 1 + Math.min(u.kills, p.A ? 10 : 5) * p.v([0.04, 0.08]) },
    { id: 'reapingarc', name: 'Reaping Arc', icon: 'cleave', fx: 'cleave', shape: 'foes', range: 'melee', reach: true, cost: 35, power: [1.2, 1.6], d: '{1.2,1.6}× to every foe below 40% health; the rest are untouched.', aw: 'Hits every foe below 60% health.', pick: (E, u, x, p) => E.pct(x) < (p.A ? 0.6 : 0.4) },
    { id: 'deathblow', name: 'Deathblow', icon: 'skull', fx: 'lunge', shape: 'foe', range: 'melee', reach: true, cost: 45, power: [2.5, 3.5], d: '{2.5,3.5}×. On a kill, the Sellsword takes another turn at once.', aw: 'Can’t miss.', kill: (E, u) => E.again(u), awk: { sure: true } },
  ],
  [ // Bloodletter
    { id: 'rend', name: 'Rend', icon: 'bleed', fx: 'slash', shape: 'foe', range: 'melee', cost: 15, power: 0.9, st: [S('bleed', 3, { p: [0.35, 0.55] })], d: '0.9× and a Bleeding stack for 3 turns, {0.35,0.55}× per tick.', aw: 'Also Festering for 2 turns.', awk: { st: [S('bleed', 3, { p: 0.55 }), S('festering', 2)] } },
    { id: 'openveins', kind: 'passive', name: 'Open Veins', icon: 'bleed', d: '+{10,30}% damage to Bleeding foes.', aw: 'Bleeding foes can’t dodge the Sellsword.', out: (E, u, t, p, c) => (!c.dot && t.st.bleed ? 1 + p.v([0.1, 0.3]) : 1), sure: (E, u, t, p) => p.A && !!t.st.bleed },
    { id: 'serratededge', kind: 'passive', name: 'Serrated Edge', icon: 'bleed', d: 'Strike adds a Bleeding stack for {1,3,n} turns, 0.2× per tick.', aw: 'Strike adds 2 stacks.', hit: (E, u, t, p, c) => { if (c.sk && c.sk.id === 'strike' && t.alive) for (let i = 0; i < (p.A ? 2 : 1); i++) E.status(u, t, 'bleed', { turns: p.n([1, 3]), p: 0.2 }); } },
    { id: 'flurry', name: 'Flurry', icon: 'claw', fx: 'slash', shape: 'foe', range: 'melee', cost: 18, power: [0.45, 0.6], hits: 3, st: [S('bleed', 2, { p: 0.15 })], d: '3 hits of {0.45,0.6}×, each adding a Bleeding stack (2 turns, 0.15×).', aw: '5 hits.', awk: { hits: 5 } },
    { id: 'haemophage', kind: 'key', name: 'Haemophage', icon: 'bleed', d: 'Bleeding stacks the Sellsword applies last until the battle ends, but tick at {40,60}% strength.', aw: 'They tick at full strength.', applyOut: (E, u, t, p, s) => { if (s.key === 'bleed') { s.turns = 99; if (!p.A) s.dmg = Math.max(1, Math.round(s.dmg * p.v([0.4, 0.6]))); } } },
    { id: 'haemorrhage', name: 'Haemorrhage', icon: 'bleed', fx: 'slash', shape: 'foe', range: 'melee', cost: 25, power: 0.6, d: '0.6×, then every Bleeding stack on the target ticks at once, at {60,100}%. The stacks stay.', aw: 'Then adds 2 more stacks.', then: (E, u, res, p) => { for (const r of res) { if (!r.landed || !r.t.alive) continue; const b = r.t.st.bleed; if (b) E.pure(u, r.t, b.list.reduce((a, x) => a + x.dmg, 0) * p.v([0.6, 1]), { key: 'bleed' }); if (p.A && r.t.alive) for (let i = 0; i < 2; i++) E.status(u, r.t, 'bleed', { turns: 3, p: 0.35 }); } } },
    { id: 'redharvest', kind: 'passive', name: 'Red Harvest', icon: 'heart', d: 'Bleeding the Sellsword causes heals them for {20,50}% of its damage.', aw: 'Healing beyond full goes to the most hurt ally.', dot: (E, u, t, p, c) => { if (c.key === 'bleed' && u.alive) E.heal(u, u, c.d * p.v([0.2, 0.5]), { raw: true, over: p.A ? 'ally' : null }); } },
    { id: 'crimsonspray', name: 'Crimson Spray', icon: 'bleed', fx: 'cleave', shape: 'front', range: 'melee', cost: 30, power: [0.6, 0.85], st: [S('bleed', 2, { p: 0.2 }), S('bleed', 2, { p: 0.2 })], d: '{0.6,0.85}× to each, and 2 Bleeding stacks (2 turns, 0.2×).', aw: 'Those foes are also Slowed for 1 turn.', awk: { st: [S('bleed', 2, { p: 0.2 }), S('bleed', 2, { p: 0.2 }), S('slowed', 1)] } },
    { id: 'headsmansswing', name: 'Headsman’s Swing', icon: 'cleave', fx: 'smash', shape: 'foe', range: 'melee', cost: 40, power: [3, 4], d: '{3.0,4.0}×, plus 25% for each Bleeding stack on the target.', aw: 'Can’t miss and ignores Guarding.', mult: (E, u, t) => 1 + 0.25 * E.stacks(t, 'bleed'), awk: { sure: true, noGuard: true } },
  ],
  [ // Berserker
    { id: 'recklessswing', name: 'Reckless Swing', icon: 'cleave', fx: 'smash', shape: 'foe', range: 'melee', cost: 10, power: [2.2, 2.8], d: '{2.2,2.8}×, but the Sellsword is Exposed until its next turn.', aw: 'Not Exposed if the swing kills.', then: (E, u, res, p) => { if (!(p.A && res.some(r => r.killed))) E.status(u, u, 'exposed', { time: 'start', sure: true }); } },
    { id: 'thickhide', kind: 'passive', name: 'Thick Hide', icon: 'heart', d: '+{5,15}% max health.', aw: 'Also +10% Defense.', stat: (u, p) => { u.maxHp *= 1 + p.v([0.05, 0.15]); if (p.A) u.def *= 1.1; } },
    { id: 'bloodlust', name: 'Bloodlust', icon: 'rage', fx: 'rage', shape: 'self', cost: 20, hpCost: 0.1, self: [S('hasted', 2), S('bloodlust', 2, { v: [20, 40] })], d: 'Hasted and +{20,40}% damage for 2 turns. Costs 10% of max health.', aw: 'Each kill adds a turn.', awk: { self: [S('hasted', 2), S('bloodlust', 2, { v: 40, more: true })] } },
    { id: 'desperado', kind: 'passive', name: 'Desperado', icon: 'rage', d: 'Below 40% health: +{15,35}% damage.', aw: 'Also +15% Dodge below 40% health.', out: (E, u, t, p, c) => (!c.dot && E.pct(u) < 0.4 ? 1 + p.v([0.15, 0.35]) : 1), dodge: (E, u, src, p) => (p.A && E.pct(u) < 0.4 ? 15 : 0) },
    { id: 'secondwind', kind: 'passive', name: 'Second Wind', icon: 'heart', d: 'Once per battle, dropping below 25% health heals {15,35}% of max health.', aw: 'Also clears the Sellsword’s harmful statuses and Hastes them for 2 turns.', hurt: (E, u, src, p) => { if (u.alive && E.pct(u) < 0.25 && E.once(u, 'secondwind')) { E.heal(u, u, u.maxHp * p.v([0.15, 0.35]), { raw: true }); if (p.A) { E.cleanse(u, u, 'all'); E.status(u, u, 'hasted', { turns: 2 }); } } } },
    { id: 'wildswings', name: 'Wild Swings', icon: 'claw', fx: 'cleave', shape: 'random3', range: 'melee', cost: 20, power: [0.7, 0.95], d: 'Three swings of {0.7,0.95}× at random foes in reach, +50% while the Sellsword is below 50% health.', aw: 'Five swings.', run: (E, u, ts, p) => { const k = E.pct(u) < 0.5 ? 1.5 : 1; for (let i = 0; i < (p.A ? 5 : 3); i++) { const pool = E.reach(u, SKILLS.wildswings); if (!pool.length) break; E.strike(u, E.pickOne(pool), p, { mult: k }); } } },
    { id: 'bloodfrenzy', kind: 'key', name: 'Blood Frenzy', icon: 'rage', d: 'The Sellsword can’t be healed above 50% health, but deals +{20,40}% damage and heals for 10% of the damage it deals.', aw: 'Can be healed up to 70%.', out: (E, u, t, p, c) => (c.dot ? 1 : 1 + p.v([0.2, 0.4])), healCap: (E, u, p) => (p.A ? 0.7 : 0.5), hit: (E, u, t, p, c) => { if (c.d > 0) E.heal(u, u, c.d * 0.1, { raw: true }); } },
    { id: 'grit', name: 'Grit', icon: 'anchor', fx: 'guard', shape: 'self', cost: 20, d: 'Heals {15,30}% of missing health and Braces for 1 turn.', aw: 'Also Unbroken for 1 turn.', run: (E, u, ts, p) => { E.heal(u, u, (u.maxHp - u.hp) * p.v([0.15, 0.3])); E.status(u, u, 'braced', { turns: 1, v: 40 }); if (p.A) E.status(u, u, 'unbroken', { turns: 1 }); } },
    { id: 'rampage', name: 'Rampage', icon: 'rage', fx: 'slash', shape: 'foe', range: 'melee', cost: 40, power: [0.6, 0.8], d: '4 hits of {0.6,0.8}×, plus 1 more hit for every 20% of health missing.', aw: 'Each hit picks a random foe in reach.', run: (E, u, ts, p) => { const n = 4 + Math.floor((1 - E.pct(u)) * 5); let t = ts[0]; for (let i = 0; i < n; i++) { if (p.A || !t || !t.alive) { const pool = E.reach(u, SKILLS.rampage); if (!pool.length) break; t = p.A ? E.pickOne(pool) : E.near(u, pool); } E.strike(u, t, p); } } },
  ],
]);

// ═══════════════════════════════════════════════════════════════════ Hexblade
defClass('hexblade', {
  name: 'Hexblade', role: 'Curses and damage over time', row: 'back', weapon: 'Cursed blades', mpGain: 12, slots: [3, 5],
  blurb: 'A cursed duellist who wins slowly. Lays Doom, spreads it and detonates it, takes apart healers and casters, or wades into the front row and drinks the life out of what it cuts.',
  stats: { hp: [90, 110, 6.5], mp: [36, 44, 1.5], pow: [16, 20, 1.2], def: [3, 5, 0.25], spd: [10, 12, 0.02], crit: [6, 10, 0.04], dodge: [6, 10, 0.03] },
  res: { stun: 20, move: 15, bleed: 20, blight: 30, curse: 50, debuff: 30 },
  basic: 'hexbolt', starter: 'doom', second: 'hexswarm',
  paths: [['Malediction', 'Lays Doom on everything, spreads it and detonates it.'], ['Withering', 'Stacks harmful statuses to cripple foes and make everyone’s hits land harder.'], ['Blood-hex', 'Fights in the front row, draining life and paying for skills with blood.']],
  rules: [{ if: 'front_foe', do: 'doom' }, { if: 'foe_lowest', do: 'hexbolt' }],
}, {
  hexbolt: { name: 'Hex Bolt', icon: 'curse', fx: 'hexbolt', shape: 'foe', range: 'magic', power: 0.9, basic: true, d: 'One foe, magic, 0.9×. Restores 12 mana. With Blade-Hex in the front row, it becomes Cursed Edge.' },
  cursededge: { name: 'Cursed Edge', icon: 'curse', fx: 'slash', shape: 'foe', range: 'melee', power: 1.2, basic: true, transform: true, d: 'One foe, melee, 1.2× and Doomed (0.4×).', st: [S('doom', 1, { p: 0.4 })] },
  doom: { name: 'Doom', icon: 'doom', fx: 'doom', shape: 'foe', range: 'magic', cost: 15, power: 0.4, st: [S('doom', 3, { p: [0.65, 0.9] })], d: '0.4× and Doomed for 3 turns, {0.65,0.9}× per tick.', aw: 'Doom lasts 5 turns.', awk: { st: [S('doom', 5, { p: 0.9 })] } },
}, [
  [ // Malediction
    { id: 'hexswarm', name: 'Hex Swarm', icon: 'doom', fx: 'hexswarm', shape: 'random3', n: 3, range: 'magic', cost: 20, power: 0.6, st: [S('doom', 2, { p: [0.3, 0.45] })], d: '0.6× to 3 random foes, and Doomed for 2 turns, {0.3,0.45}× per tick.', aw: 'Hits 5 random foes.', awk: { n: 5 } },
    { id: 'deepcurse', kind: 'passive', name: 'Deep Curse', icon: 'doom', d: 'Doom deals +{10,30}%.', aw: 'Doom ticks can crit.', applyOut: (E, u, t, p, s) => { if (s.key === 'doom') { s.dmg = Math.round(s.dmg * (1 + p.v([0.1, 0.3]))); if (p.A) s.crit = u.crit; } } },
    { id: 'hexreap', name: 'Reap', icon: 'doom', fx: 'doom', shape: 'foe', range: 'magic', cost: 20, power: 0.6, d: '0.6×, then all of the target’s remaining Doom ticks land at once, at {100,140}%.', aw: 'Refunds its mana on a kill.', then: (E, u, res, p) => { for (const r of res) { const d = r.landed && r.t.alive && r.t.st.doom; if (!d) continue; const amt = d.dmg * d.turns * p.v([1, 1.4]); E.drop(r.t, 'doom'); const out = E.pure(u, r.t, amt, { key: 'doom' }); if (out.killed && p.A) E.mana(u, p.paid || 0); } } },
    { id: 'lingeringhex', kind: 'passive', name: 'Lingering Hex', icon: 'hourglass', d: 'Harmful statuses the Hexblade applies last {1,2,n} turns longer.', aw: 'Their ticks are also 10% stronger.', applyOut: (E, u, t, p, s) => { if (s.turns < 90 && STATUSES[s.key].time !== 'use') s.turns += p.n([1, 2]); if (p.A && s.dmg) s.dmg = Math.round(s.dmg * 1.1); } },
    { id: 'contagion', name: 'Contagion', icon: 'doom', fx: 'requiem', shape: 'foes', range: 'magic', cost: 25, d: 'Needs a Doomed foe. Copies the strongest Doom onto every other foe, with {50,100}% of its remaining turns.', aw: 'Copies are also Festering for 2 turns.',
      need: (E, u) => E.foes(u).some(f => f.st.doom),
      run: (E, u, ts, p) => { const src = E.foes(u).filter(f => f.st.doom).reduce((b, f) => (!b || f.st.doom.dmg > b.st.doom.dmg ? f : b), null); if (!src) return; const D = src.st.doom; for (const f of E.foes(u)) { if (f === src) continue; if (E.status(u, f, 'doom', { turns: Math.max(1, Math.round(D.turns * p.v([0.5, 1]))), dmg: D.dmg, raw: true }) && p.A) E.status(u, f, 'festering', { turns: 2 }); } } },
    { id: 'plaguebearer', kind: 'key', name: 'Plague Bearer', icon: 'doom', d: 'Each Doom tick has a {15,35}% chance to spread a copy to the foe beside it, but the Hexblade’s direct damage is 25% lower.', aw: 'Spread copies start at full length.', out: (E, u, t, p, c) => (c.dot ? 1 : 0.75), dot: (E, u, t, p, c) => { if (c.key !== 'doom' || !t.st.doom || E.rng() * 100 >= p.v([15, 35])) return; const n = E.near(t, E.foes(u).filter(x => x !== t)); if (n) E.status(u, n, 'doom', { turns: p.A ? (t.st.doom.full || 3) : Math.max(1, t.st.doom.turns), dmg: t.st.doom.dmg, raw: true }); } },
    { id: 'eternaldoom', kind: 'passive', name: 'Eternal Doom', icon: 'doom', d: 'When a Doomed foe falls, its Doom jumps to the nearest foe with {50,100}% of its remaining turns.', aw: 'The jumped Doom starts again at full length.', aFall: (E, o, t, src, p) => { const d = t.st.doom; if (!d || d.src !== o.id || t.side === o.side) return; const n = E.near(t, E.foes(o).filter(x => x !== t)); if (n) E.status(o, n, 'doom', { turns: p.A ? (d.full || 3) : Math.max(1, Math.round(d.turns * p.v([0.5, 1]))), dmg: d.dmg, raw: true }); } },
    { id: 'maleficburst', name: 'Malefic Burst', icon: 'burst', fx: 'requiem', shape: 'foes', range: 'magic', cost: 35, d: 'Every Doomed foe takes its remaining Doom at once, at {40,70}%. The Doom stays.', aw: 'Each Doom also gains a turn.', pick: (E, u, x) => !!x.st.doom,
      run: (E, u, ts, p) => { for (const t of ts) { const d = t.alive && t.st.doom; if (!d) continue; E.pure(u, t, d.dmg * d.turns * p.v([0.4, 0.7]), { key: 'doom' }); if (p.A && t.alive && t.st.doom) t.st.doom.turns++; } } },
    { id: 'requiemofruin', name: 'Requiem of Ruin', icon: 'doom', fx: 'requiem', shape: 'foes', range: 'magic', cost: 50, st: [S('doom', 3, { p: [0.5, 0.8] }), S('weak', 2)], d: 'Every foe is Doomed for 3 turns, {0.5,0.8}× per tick, and Weak for 2 turns.', aw: 'That Doom can’t be cleansed.', awk: { st: [S('doom', 3, { p: 0.8, fixed: true }), S('weak', 2)] } },
  ],
  [ // Withering
    { id: 'wither', name: 'Wither', icon: 'weak', fx: 'hexbolt', shape: 'foe', range: 'magic', cost: 15, st: [S('weak', 3, { v: [25, 35] }), S('festering', 3)], d: 'Weak (−{25,35}%) and Festering for 3 turns.', aw: 'Also Silenced for 1 turn.', awk: { st: [S('weak', 3, { v: 35 }), S('festering', 3), S('silenced', 1)] } },
    { id: 'enfeeble', kind: 'passive', name: 'Enfeeble', icon: 'weak', d: 'Weak from the Hexblade cuts another {5,15}% of the foe’s damage.', aw: 'Weak foes can’t crit.', applyOut: (E, u, t, p, s) => { if (s.key === 'weak') { s.v += p.v([5, 15]); if (p.A) s.nocrit = true; } } },
    { id: 'hush', name: 'Hush', icon: 'silence', fx: 'hexbolt', shape: 'foe', range: 'magic', cost: 20, power: 0.5, st: [S('silenced', [2, 3])], d: '0.5× and Silenced for {2,3,n} turns.', aw: 'Also drains 20 of the target’s mana into the Hexblade.', then: (E, u, res, p) => { if (p.A) for (const r of res) if (r.landed && r.t.alive) { const m = Math.min(20, r.t.mp); E.mana(r.t, -m); E.mana(u, m); } } },
    { id: 'evileye', name: 'Evil Eye', icon: 'eye', fx: 'hexbolt', shape: 'foe', range: 'magic', cost: 15, st: [S('exposed', [2, 3])], d: 'Exposed for {2,3,n} turns, and the Hexblade’s next skill on that foe costs no mana.', aw: 'Also Slowed for 1 turn.', awk: { st: [S('exposed', 3), S('slowed', 1)] }, then: (E, u, res) => { if (res[0]) u.evil = res[0].t.id; } },
    { id: 'unmaking', kind: 'passive', name: 'Unmaking', icon: 'curse', d: 'Foes with 3 or more harmful statuses take +{10,25}% damage from every source.', aw: 'Needs only 2 statuses.', aIn: (E, o, t, src, p) => (o.alive && t.side !== o.side && E.bad(t) >= (p.A ? 2 : 3) ? 1 + p.v([0.1, 0.25]) : 1) },
    { id: 'hexwardskill', name: 'Hex Ward', icon: 'eye', fx: 'buffhex', shape: 'ally', cost: 20, st: [S('hexward', [2, 3])], d: 'Hex Ward for {2,3,n} turns: each foe that hits that ally is Doomed (2 turns, 0.5×).', aw: 'Attackers are also Weak for 1 turn.', awk: { st: [S('hexward', 3, { more: true })] } },
    { id: 'witchsbargain', kind: 'key', name: 'Witch’s Bargain', icon: 'curse', d: 'Each harmful status the Hexblade applies brings a random second one (Weak, Exposed, Slowed or Festering), but its skills cost {30,15}% more mana.', aw: 'No extra mana cost.',
      landed: (E, u, t, p, s) => { if (s.bargain || !t.alive) return; const opts = ['weak', 'exposed', 'slowed', 'festering'].filter(k => !t.st[k] && k !== s.key); if (opts.length) E.status(u, t, opts[Math.floor(E.rng() * opts.length)], { turns: 2, bargain: true }); },
      cost: (E, u, sk, p, c) => { if (!p.A) c.mul *= 1 + p.v([0.3, 0.15]); } },
    { id: 'soulrend', name: 'Soul Rend', icon: 'curse', fx: 'hexbolt', shape: 'foe', range: 'magic', cost: 25, power: 0.5, d: '0.5×, plus {0.2,0.35}× for each harmful status on the target.', aw: 'Each Bleeding stack counts as a status.', mult: (E, u, t, p) => 1 + E.bad(t, { stacks: p.A }) * p.v([0.2, 0.35]) / 0.5 },
    { id: 'unravel', name: 'Unravel', icon: 'curse', fx: 'requiem', shape: 'foes', range: 'magic', cost: 45, d: 'Every harmful status on every foe lasts {2,3,n} turns longer, and each foe takes 0.2× per status.', aw: 'Also strips their helpful statuses.',
      run: (E, u, ts, p) => { for (const t of ts) { if (!t.alive) continue; const n = E.bad(t); E.extend(t, p.n([2, 3])); if (p.A) E.strip(u, t, 99); if (n) E.strike(u, t, p, { power: 0.2 * n }); } } },
  ],
  [ // Blood-hex
    { id: 'leech', name: 'Leech', icon: 'heart', fx: 'drain', shape: 'foe', range: 'magic', cost: 15, power: [0.9, 1.2], d: '{0.9,1.2}×, healing the Hexblade for 60% of the damage.', aw: 'Healing beyond full goes to the most hurt ally.', then: (E, u, res, p) => { for (const r of res) if (r.d) E.heal(u, u, r.d * 0.6, { over: p.A ? 'ally' : null }); } },
    { id: 'bladehex', kind: 'passive', name: 'Blade-Hex', icon: 'sword', d: 'In the front row, Hex Bolt becomes Cursed Edge: melee 1.2×, Dooming for {1,2,n} turns.', aw: 'Cursed Edge hits both front-row foes.', basic: (E, u, p) => (u.row === 'front' ? 'cursededge' : null) },
    { id: 'drinkdeep', kind: 'passive', name: 'Drink Deep', icon: 'heart', d: 'Heals for {10,30}% of the Doom damage the Hexblade deals.', aw: 'Healing beyond full goes to the most hurt ally.', dot: (E, u, t, p, c) => { if (c.key === 'doom' && u.alive) E.heal(u, u, c.d * p.v([0.1, 0.3]), { raw: true, over: p.A ? 'ally' : null }); } },
    { id: 'bloodcurse', kind: 'passive', name: 'Bloodcurse', icon: 'bleed', d: 'Doom ticks +{15,40}% on Bleeding foes.', aw: '+5% more for each Bleeding stack.', dotOut: (E, u, t, p, c) => (c.key === 'doom' && t.st.bleed ? 1 + p.v([0.15, 0.4]) + (p.A ? 0.05 * E.stacks(t, 'bleed') : 0) : 1) },
    { id: 'crimsonpact', name: 'Crimson Pact', icon: 'mana', fx: 'drain', shape: 'self', cost: 0, hpCost: 0.15, d: 'Costs 15% of max health, no mana. Restores {30,50,n} mana and Kindles the Hexblade for 1 turn.', aw: 'Also Hastes them for 1 turn.', run: (E, u, ts, p) => { E.mana(u, p.n([30, 50])); E.status(u, u, 'kindled', { turns: 1 }); if (p.A) E.status(u, u, 'hasted', { turns: 1 }); } },
    { id: 'hexedblood', kind: 'passive', name: 'Hexed Blood', icon: 'heart', d: '+{5,15}% max health.', aw: 'Harmful statuses on the Hexblade last 1 turn less.', stat: (u, p) => { u.maxHp *= 1 + p.v([0.05, 0.15]); }, statusIn: (E, u, src, p, s) => { if (p.A && s.turns > 1 && s.turns < 90) s.turns--; } },
    { id: 'sanguinelash', name: 'Sanguine Lash', icon: 'bleed', fx: 'cleave', shape: 'front', range: 'melee', cost: 25, power: [0.8, 1.1], st: [S('doom', 1, { p: 0.4 })], d: '{0.8,1.1}× to each, Doomed for 1 turn, healing the Hexblade for 30% of the damage.', aw: 'Also a Bleeding stack (2 turns, 0.2×) on each.', awk: { st: [S('doom', 1, { p: 0.4 }), S('bleed', 2, { p: 0.2 })] }, then: (E, u, res) => { const d = res.reduce((a, r) => a + (r.d || 0), 0); if (d) E.heal(u, u, d * 0.3); } },
    { id: 'bloodprice', kind: 'key', name: 'Blood Price', icon: 'bleed', d: 'When mana runs short, skills are paid with health: 1 mana costs {1.5,0.7}% of max health, but healing the Hexblade receives is 25% weaker.', aw: 'Paying with health also Kindles the Hexblade for 1 turn.', healIn: () => 0.75, bloodPrice: (E, u, p) => p.v([0.015, 0.007]) },
    { id: 'exsanguinate', name: 'Exsanguinate', icon: 'heart', fx: 'drain', shape: 'foe', range: 'melee', reach: true, cost: 45, power: [2, 2.8], d: '{2.0,2.8}×, plus 0.3× for each harmful status on the target, healing the Hexblade for all of it.', aw: 'Healing beyond full becomes a Ward on the Hexblade.', mult: (E, u, t, p) => 1 + E.bad(t) * 0.3 / p.v([2, 2.8]), then: (E, u, res, p) => { for (const r of res) if (r.d) E.heal(u, u, r.d, { over: p.A ? 'ward' : null }); } },
  ],
]);

// ═══════════════════════════════════════════════════════════════════ Pilgrim
const healSkill = sk => !!(SKILLS[sk] && (SKILLS[sk].heal || SKILLS[sk].healPct || SKILLS[sk].revive || SKILLS[sk].healer));
defClass('pilgrim', {
  name: 'Pilgrim', role: 'Healer: restoring', row: 'back', healer: true, weapon: 'Censers', mpGain: 12, slots: [3, 6],
  blurb: 'A healer who walks the road on faith. Heals and raises the fallen, prevents damage before it lands, or carries holy fire to the undead.',
  stats: { hp: [95, 115, 7], mp: [45, 55, 2], pow: [13, 15, 0.9], def: [4, 6, 0.3], spd: [8, 10, 0.02], crit: [3, 7, 0.03], dodge: [3, 7, 0.03] },
  res: { stun: 25, move: 20, bleed: 20, blight: 30, curse: 45, debuff: 30 },
  basic: 'smite', starter: 'mend', second: 'rites',
  paths: [['Mercy', 'Direct healing, and raising the fallen.'], ['Vigil', 'Prevents damage with Wards, cleanses, and keeps fatigue down over a long push.'], ['Zeal', 'Holy fire against the undead, healing through the damage it deals.']],
  rules: [{ if: 'ally_hp_lt', n: 50, do: 'mend' }, { if: 'foe_lowest', do: 'smite' }],
}, {
  smite: { name: 'Smite', icon: 'holy', fx: 'smite', shape: 'foe', range: 'magic', power: 0.8, basic: true, d: 'One foe, magic, 0.8×. Restores 12 mana.' },
  prayer: { name: 'Prayer', icon: 'holy', fx: 'mend', shape: 'ally', basic: true, transform: true, heal: [0.6, 1], healer: true, d: 'Heals the most hurt ally 0.6× → 1.0× and restores 12 mana.', run: (E, u, ts, p) => { const list = E.heroes(u).filter(x => x.hp < x.maxHp).sort((a, b) => E.pct(a) - E.pct(b)).slice(0, p.A ? 2 : 1); for (const t of list.length ? list : ts) E.heal(u, t, u.pow * p.v([0.6, 1])); } },
  crusadersmite: { name: 'Smite', icon: 'holy', fx: 'smash', shape: 'foe', range: 'melee', power: 1.2, basic: true, transform: true, d: 'One foe, melee, 1.2×, healing the most hurt ally for 30% of its damage.', then: (E, u, res) => { const d = res.reduce((a, r) => a + (r.d || 0), 0); const t = E.hurtest(E.heroes(u)); if (d && t) E.heal(u, t, d * 0.3, { raw: true }); } },
  mend: { name: 'Mend', icon: 'cross', fx: 'mend', shape: 'ally', cost: 15, heal: [2.8, 3.6], healPct: 0.1, d: 'Heals {2.8,3.6}×, plus 10% of the ally’s max health.', aw: '+50% on allies below 30% health.', mult: (E, u, t, p) => (p.A && E.pct(t) < 0.3 ? 1.5 : 1) },
}, [
  [ // Mercy
    { id: 'rites', name: 'Last Rites', icon: 'holy', fx: 'rites', shape: 'ally', cost: 35, revive: [0.35, 0.55], d: 'Raises one fallen ally with {35,55}% health.', aw: 'They rise Warded, absorbing 2×.', then: (E, u, res, p) => { if (p.A) for (const r of res) if (r.t.alive) E.status(u, r.t, 'warded', { turns: 3, v: u.pow * 2 }); } },
    { id: 'steadyhands', kind: 'passive', name: 'Steady Hands', icon: 'cross', d: 'Healing +{5,20}%.', aw: 'Heals can crit, using the Pilgrim’s Crit.', healOut: (E, u, t, p) => 1 + p.v([0.05, 0.2]), healCrit: (E, u, p) => p.A },
    { id: 'benediction', name: 'Benediction', icon: 'bless', fx: 'bless', shape: 'ally', cost: 15, st: [S('blessed', 3, { p: [1, 1.4] })], d: 'Blessed for 3 turns: heals {1.0,1.4}× at the start of each turn.', aw: 'Lasts 5 turns.', awk: { st: [S('blessed', 5, { p: 1.4 })] } },
    { id: 'triage', kind: 'passive', name: 'Triage', icon: 'cross', d: 'Heals on allies below 30% health +{15,40}%.', aw: 'Works below 50% health.', healOut: (E, u, t, p) => (E.pct(t) < (p.A ? 0.5 : 0.3) ? 1 + p.v([0.15, 0.4]) : 1) },
    { id: 'hymnofrest', name: 'Hymn of Rest', icon: 'cross', fx: 'hymn', shape: 'allies', cost: 30, heal: [1.2, 1.6], d: 'Heals each ally {1.2,1.6}×.', aw: 'Also removes one harmful status from each ally.', awk: { cleanse: 1 } },
    { id: 'vowofpeace', kind: 'key', name: 'Vow of Peace', icon: 'holy', d: 'Smite becomes Prayer, which heals the most hurt ally {0.6,1.0}× and restores 12 mana, but the Pilgrim can no longer deal damage.', aw: 'Prayer heals the two most hurt allies.', basic: () => 'prayer', out: () => 0 },
    { id: 'martyrdom', name: 'Martyrdom', icon: 'heart', fx: 'mend', shape: 'ally', notSelf: true, cost: 0, hpCur: 0.25, d: 'Costs 25% of the Pilgrim’s current health, no mana. Heals the ally for {2,3}× the health paid.', aw: 'The Pilgrim is Blessed for 2 turns afterwards.', run: (E, u, ts, p) => { for (const t of ts) E.heal(u, t, (p.paidHp || 0) * p.v([2, 3]), { raw: true }); if (p.A) E.status(u, u, 'blessed', { turns: 2, p: 0.6 }); } },
    { id: 'miracle', kind: 'passive', name: 'Miracle', icon: 'holy', d: 'Once per battle, an ally who would fall stays standing, healed to {10,40}% of max health, and the Pilgrim takes the next turn.', aw: 'Twice per battle.', aSave: (E, o, t, src, p) => { if (!o.alive || t.side !== o.side || t.thrall || !E.once(o, 'miracle', p.A ? 2 : 1)) return false; t.hp = Math.max(1, Math.round(t.maxHp * p.v([0.1, 0.4]))); E.saved(o, t, 'Miracle'); E.now(o); return true; } },
    { id: 'resurrection', name: 'Resurrection', icon: 'holy', fx: 'rites', shape: 'fallen', cost: 70, revive: [0.3, 0.5], d: 'Raises every fallen ally with {30,50}% health.', aw: 'They rise Blessed for 3 turns.', then: (E, u, res, p) => { if (p.A) for (const r of res) if (r.t.alive) E.status(u, r.t, 'blessed', { turns: 3, p: 0.6 }); } },
  ],
  [ // Vigil
    { id: 'shelter', name: 'Shelter', icon: 'ward', fx: 'ward', shape: 'ally', cost: 20, d: 'Warded: absorbs up to {3,4.5}× damage, for up to 3 turns.', aw: 'When the Ward breaks, the ally heals 1.0×.', run: (E, u, ts, p) => { for (const t of ts) E.status(u, t, 'warded', { turns: 3, v: u.pow * p.v([3, 4.5]), mend: p.A ? u.pow : 0 }); } },
    { id: 'comfort', kind: 'passive', name: 'Comfort', icon: 'fatigue', d: 'While the Pilgrim is in the party, everyone gains {5,20}% less fatigue.', aw: 'Every character also recovers 1 fatigue after each battle.' },
    { id: 'purify', name: 'Purify', icon: 'holy', fx: 'cleanse', shape: 'ally', cost: 10, cleanse: 'all', heal: [0.6, 1.2], d: 'Removes all harmful statuses and heals {0.6,1.2}×.', aw: 'Immune to new harmful statuses until its next turn.', awk: { st: [S('immune', 1, { time: 'start' })] } },
    { id: 'steadfastfaith', kind: 'passive', name: 'Steadfast Faith', icon: 'ward', d: 'Allies the Pilgrim Wards also take {5,15}% less damage while Warded.', aw: 'The Pilgrim’s Wards last a turn longer.', aIn: (E, o, t, src, p) => (t.st.warded && t.st.warded.src === o.id ? 1 - p.v([0.05, 0.15]) : 1), helpOut: (E, u, t, p, s) => { if (p.A && s.key === 'warded') s.turns++; } },
    { id: 'fortitude', name: 'Prayer of Fortitude', icon: 'heart', fx: 'bless', shape: 'allies', cost: 35, d: '+{10,20}% max health for the rest of the battle, healing by the same amount.', aw: 'Also Fortified for 2 turns.', run: (E, u, ts, p) => { for (const t of ts) { const add = Math.round(t.base.maxHp * p.v([0.1, 0.2])); E.maxHp(t, add); E.heal(u, t, add, { raw: true }); if (p.A) E.status(u, t, 'fortified', { turns: 2 }); } } },
    { id: 'peacefulrest', kind: 'passive', name: 'Peaceful Rest', icon: 'fatigue', d: 'Allies the Pilgrim raises gain {50,100}% less fatigue for the rest of that battle.', aw: 'Last Rites costs 15 less.', cost: (E, u, sk, p, c) => { if (p.A && sk.id === 'rites') c.add -= 15; } },
    { id: 'absolution', name: 'Absolution', icon: 'holy', fx: 'cleanse', shape: 'allies', cost: 40, cleanse: ['doom', 'festering', 'silenced'], heal: [0.4, 0.8], d: 'Clears Doomed, Festering and Silenced from every ally, healing each {0.4,0.8}×.', aw: 'Clears every harmful status.', awk: { cleanse: 'all' } },
    { id: 'aegisoffaith', kind: 'key', name: 'Aegis of Faith', icon: 'ward', d: 'Every battle starts with every ally Warded for {1,2}×, but the Pilgrim’s healing is 20% weaker.', aw: 'No healing penalty.', start: (E, u, p) => { for (const t of E.heroes(u)) E.status(u, t, 'warded', { turns: 3, v: u.pow * p.v([1, 2]) }); }, healOut: (E, u, t, p) => (p.A ? 1 : 0.8) },
    { id: 'sanctuary', name: 'Sanctuary', icon: 'ward', fx: 'bless', shape: 'allies', cost: 50, d: 'Warded (absorbs {1.5,2.5}×) and Blessed (0.6× per turn) for 3 turns.', aw: 'Also raises one fallen ally with 30% health.', run: (E, u, ts, p) => { if (p.A) { const f = E.fallen(u)[0]; if (f) E.revive(u, f, 0.3); } for (const t of E.heroes(u)) { E.status(u, t, 'warded', { turns: 3, v: u.pow * p.v([1.5, 2.5]) }); E.status(u, t, 'blessed', { turns: 3, p: 0.6 }); } } },
  ],
  [ // Zeal
    { id: 'judgement', name: 'Judgement', icon: 'holy', fx: 'smite', shape: 'foe', range: 'magic', cost: 15, power: [1.2, 1.6], d: '{1.2,1.6}×, doubled against undead.', aw: 'Undead it hits are Weak for 2 turns.', mult: (E, u, t) => (t.tags.includes('undead') ? 2 : 1), then: (E, u, res, p) => { if (p.A) for (const r of res) if (r.landed && r.t.alive && r.t.tags.includes('undead')) E.status(u, r.t, 'weak', { turns: 2 }); } },
    { id: 'burningfaith', kind: 'passive', name: 'Burning Faith', icon: 'mana', d: 'Smite restores {3,10,n} more mana.', aw: 'Each heal the Pilgrim casts also restores 3 mana.', mpGain: (E, u, sk, p) => (sk.id === 'smite' || sk.id === 'crusadersmite' ? p.n([3, 10]) : 0), used: (E, u, sk, p) => { if (p.A && healSkill(sk.id) && !sk.basic) E.mana(u, 3); } },
    { id: 'consecrated', kind: 'passive', name: 'Consecrated', icon: 'holy', d: 'Smite and Judgement +{15,50}% against undead.', aw: 'Against spirits too.', out: (E, u, t, p, c) => (c.sk && ['smite', 'crusadersmite', 'judgement'].includes(c.sk.id) && (t.tags.includes('undead') || (p.A && t.tags.includes('spirit'))) ? 1 + p.v([0.15, 0.5]) : 1) },
    { id: 'holyground', name: 'Holy Ground', icon: 'holy', fx: 'holyaoe', shape: 'foes', range: 'magic', cost: 30, power: [0.4, 0.6], d: '{0.4,0.6}× to each foe, doubled against undead, and every ally heals 0.3×.', aw: 'Undead it hits are Slowed for 1 turn.', mult: (E, u, t) => (t.tags.includes('undead') ? 2 : 1), then: (E, u, res, p) => { if (p.A) for (const r of res) if (r.landed && r.t.alive && r.t.tags.includes('undead')) E.status(u, r.t, 'slowed', { turns: 1 }); for (const a of E.heroes(u)) E.heal(u, a, u.pow * 0.3); } },
    { id: 'holyfire', kind: 'passive', name: 'Holy Fire', icon: 'holy', d: 'Smite heals the most hurt ally for {20,50}% of its damage.', aw: 'Judgement does too.', hit: (E, u, t, p, c) => { if (c.sk && (c.sk.id === 'smite' || (p.A && c.sk.id === 'judgement')) && c.d > 0) { const a = E.hurtest(E.heroes(u)); if (a) E.heal(u, a, c.d * p.v([0.2, 0.5]), { raw: true }); } } },
    { id: 'rebuke', name: 'Rebuke', icon: 'stun', fx: 'smite', shape: 'foe', range: 'magic', cost: 20, power: [0.8, 1.1], st: [S('stunned', 1, { c: 60 })], d: '{0.8,1.1}× and a 60% chance to Stun for 1 turn.', aw: '100% chance.', awk: { st: [S('stunned', 1)] } },
    { id: 'ardour', kind: 'passive', name: 'Ardour', icon: 'boot', d: '+{0.3,1} Speed.', aw: 'The Pilgrim’s first turn of each battle comes at once.', stat: (u, p) => { u.spd += p.v([0.3, 1]); }, start: (E, u, p) => { if (p.A) E.first(u); } },
    { id: 'crusader', kind: 'key', name: 'Crusader', icon: 'sword', d: 'The Pilgrim can fight from the front row. There, Smite becomes a melee 1.2× strike that heals the most hurt ally for 30% of its damage, and the Pilgrim gains +{20,40}% max health, but its healing skills cost 50% more mana.', aw: 'No extra mana cost.',
      basic: (E, u) => (u.row === 'front' ? 'crusadersmite' : null), stat: (u, p) => { if (u.row === 'front') u.maxHp *= 1 + p.v([0.2, 0.4]); }, cost: (E, u, sk, p, c) => { if (!p.A && healSkill(sk.id)) c.mul *= 1.5; } },
    { id: 'divinewrath', name: 'Divine Wrath', icon: 'holy', fx: 'holyaoe', shape: 'foes', range: 'magic', cost: 55, power: [1, 1.4], d: '{1.0,1.4}× to each foe, doubled against undead and spirits, and every ally heals for 20% of the damage dealt.', aw: 'Every foe hit is also Dazzled for 1 turn.', awk: { st: [S('dazzled', 1)] }, mult: (E, u, t) => (t.tags.includes('undead') || t.tags.includes('spirit') ? 2 : 1), then: (E, u, res) => { const d = res.reduce((a, r) => a + (r.d || 0), 0); if (d) for (const a of E.heroes(u)) E.heal(u, a, d * 0.2, { raw: true }); } },
  ],
]);

// ═══════════════════════════════════════════════════════════════════ Warden
defClass('warden', {
  name: 'Warden', role: 'Tank: soaking hits', row: 'front', weapon: 'Mace and shield', mpGain: 10, slots: [3, 5],
  blurb: 'The wall. Takes the hits meant for others, outlasts what it can’t stop, or makes every blow cost the foe dearly.',
  stats: { hp: [171, 209, 14], mp: [27, 33, 1], pow: [13, 15, 0.8], def: [13, 15, 0.7], spd: [7, 9, 0.01], crit: [3, 7, 0.03], dodge: [0, 2, 0.01] },
  res: { stun: 50, move: 60, bleed: 30, blight: 25, curse: 20, debuff: 30 },
  basic: 'mace', starter: 'guard', second: 'bash',
  paths: [['Bulwark', 'Shields the whole party, with Guard, Cover and walls of steel.'], ['Bastion', 'Outlasts everything, with huge health, damage caps and refusing to fall.'], ['Reprisal', 'Punishes every blow, with counters, thorns and shield strikes that grow with the damage it takes.']],
  rules: [{ if: 'ally_hp_lt', n: 50, do: 'guard' }, { if: 'front_foe', do: 'mace' }],
}, {
  mace: { name: 'Mace', icon: 'mace', fx: 'smash', shape: 'foe', range: 'melee', power: 0.9, basic: true, d: 'One foe, melee, 0.9×. Restores 10 mana.' },
  hold: { name: 'Hold', icon: 'brace', fx: 'guard', shape: 'self', basic: true, transform: true, d: 'Braces the Warden and restores 10 mana.', run: (E, u, ts, p) => { E.status(u, u, 'braced', { time: 'start', v: Math.round(p.v([20, 35])) }); if (p.A) for (const a of E.heroes(u)) E.status(u, a, 'fortified', { turns: 1 }); } },
  guard: { name: 'Guard', icon: 'shield', fx: 'guard', shape: 'self', cost: 15, self: [S('guarding', 1, { v: [30, 45], time: 'start' })], d: 'Guarding until its next turn: takes every single-target attack aimed at an ally, at −{30,45}% damage.', aw: 'Guarding lasts through its next turn as well.', awk: { self: [S('guarding', 1, { v: 45, time: 'start', left: 2 })] } },
}, [
  [ // Bulwark
    { id: 'cover', name: 'Cover', icon: 'cover', fx: 'guard', shape: 'ally', notSelf: true, cost: 10, d: 'Covered for {2,3,n} of the Warden’s turns: every attack aimed at that ally, area hits included, hits the Warden instead at −30%.', aw: 'Covers two allies at once.',
      run: (E, u, ts, p) => { const list = ts.slice(); if (p.A) { const o = E.hurtest(E.heroes(u).filter(x => x !== u && !list.includes(x))); if (o) list.push(o); } for (const t of list) E.status(u, t, 'covered', { until: u.id, left: p.n([2, 3]) }); } },
    { id: 'shieldbearer', kind: 'passive', name: 'Shieldbearer', icon: 'mana', d: 'Each hit taken while Guarding or Covering restores {2,6,n} mana.', aw: 'Each one also heals 1% of max health.', hurt: (E, u, src, p, c) => { if (u.alive && (u.st.guarding || c.redirect)) { E.mana(u, p.n([2, 6])); if (p.A) E.heal(u, u, u.maxHp * 0.01, { raw: true }); } } },
    { id: 'standfast', name: 'Stand Fast', icon: 'fort', fx: 'buffshield', shape: 'allies', cost: 25, st: [S('fortified', 2, { v: [20, 30] })], d: 'Fortified for 2 turns: −{20,30}% damage taken.', aw: 'Lasts 4 turns.', awk: { st: [S('fortified', 4, { v: 30 })] } },
    { id: 'interpose', kind: 'passive', name: 'Interpose', icon: 'cover', d: 'When an ally drops below 30% health, the Warden Covers them at once for 1 turn, {1,3,n} times per battle.', aw: 'No limit.', aHurt: (E, o, t, src, p, c) => { if (!o.alive || t === o || t.side !== o.side || t.thrall || !t.alive || t.st.covered) return; if (E.pct(t) < 0.3 && c.before >= 0.3 && E.once(o, 'interpose', p.A ? 999 : p.n([1, 3]))) E.status(o, t, 'covered', { until: o.id, left: 1 }); } },
    { id: 'aegis', kind: 'passive', name: 'Aegis', icon: 'shield', d: 'While the Warden is Guarding, allies take {10,25}% less damage from area attacks.', aw: 'Also while Covering.', aIn: (E, o, t, src, p, c) => (c.area && o.alive && t.side === o.side && (o.st.guarding || (p.A && E.covering(o))) ? 1 - p.v([0.1, 0.25]) : 1) },
    { id: 'shieldwall', name: 'Shield Wall', icon: 'brace', fx: 'buffshield', shape: 'allies', cost: 35, d: 'Every ally is Braced (−{25,35}% damage) until the Warden’s next turn.', aw: 'Lasts 2 of the Warden’s turns.', run: (E, u, ts, p) => { for (const t of ts) E.status(u, t, 'braced', { until: u.id, left: p.A ? 2 : 1, v: Math.round(p.v([25, 35])) }); } },
    { id: 'oathoftheshield', kind: 'key', name: 'Oath of the Shield', icon: 'shield', d: 'Guard and Cover cost no mana, but the Warden can’t attack: its basic attack becomes Hold, which Braces it for {20,35}% and restores 10 mana.', aw: 'Hold also Fortifies every ally for 1 turn.', basic: () => 'hold', cost: (E, u, sk, p, c) => { if (sk.id === 'guard' || sk.id === 'cover') c.mul = 0; } },
    { id: 'holdtheline', name: 'Hold the Line', icon: 'fort', fx: 'buffshield', shape: 'allies', cost: 40, st: [S('steadfast', [2, 3])], d: 'For {2,3,n} turns, allies can’t be pushed back, Stunned or swapped, and take 10% less damage.', aw: 'They’re also immune to Taunted and Confused.', awk: { st: [S('steadfast', 3, { more: true })] } },
    { id: 'lastbastion', name: 'Last Bastion', icon: 'shield', fx: 'guard', shape: 'self', cost: 50, self: [S('bastion', 2, { v: [40, 60] })], d: 'For 2 turns the Warden takes every attack aimed at any ally, area hits included, at −{40,60}% damage.', aw: 'The Warden is also Unbroken for those turns.', awk: { self: [S('bastion', 2, { v: 60 }), S('unbroken', 2)] } },
  ],
  [ // Bastion
    { id: 'brace', name: 'Brace', icon: 'brace', fx: 'guard', shape: 'self', cost: 10, self: [S('braced', 2, { v: [40, 55] })], d: 'Braced for 2 turns: −{40,55}% damage taken.', aw: 'Each hit taken while Braced restores 10 mana.', awk: { self: [S('braced', 2, { v: 55, more: true })] } },
    { id: 'stalwart', kind: 'passive', name: 'Stalwart', icon: 'heart', d: '+{5,15}% max health.', aw: 'Also +15% Defense.', stat: (u, p) => { u.maxHp *= 1 + p.v([0.05, 0.15]); if (p.A) u.def *= 1.15; } },
    { id: 'plateborn', kind: 'passive', name: 'Plate-born', icon: 'plate', d: 'Heavy armour’s Speed penalty is {1,2,n} lower.', aw: 'Heavy armour also gives 10% more health.' },
    { id: 'unbreak', name: 'Unbroken', icon: 'anchor', fx: 'guard', shape: 'self', cost: 30, self: [S('unbroken', [2, 3])], d: 'Unbroken for {2,3,n} turns: can’t fall below 1 health.', aw: 'Also −20% damage taken.', awk: { self: [S('unbroken', 3, { more: true })] } },
    { id: 'ironwill', kind: 'passive', name: 'Iron Will', icon: 'fatigue', d: 'The Warden gains {10,35}% less fatigue.', aw: 'Weary no longer weakens the Warden.' },
    { id: 'secondbreath', name: 'Second Breath', icon: 'heart', fx: 'mend', shape: 'self', cost: 25, healPct: [0.2, 0.35], d: 'Heals {20,35}% of max health.', aw: 'Also Fortified for 2 turns.', awk: { self: [S('fortified', 2)] } },
    { id: 'hardened', kind: 'passive', name: 'Hardened', icon: 'shield', d: '+{5,20}% Defense.', aw: 'Immune to Corroded.', stat: (u, p) => { u.def *= 1 + p.v([0.05, 0.2]); }, statusIn: (E, u, src, p, s) => !(p.A && s.key === 'corroded') },
    { id: 'immovable', kind: 'key', name: 'Immovable', icon: 'anchor', d: 'In the front row, the Warden takes {8,20}% less damage and can’t be pushed back or Stunned, but its Dodge is always 0.', aw: 'Dodge works again.', taken: (E, u, src, p) => (u.row === 'front' ? 1 - p.v([0.08, 0.2]) : 1), statusIn: (E, u, src, p, s) => !(u.row === 'front' && s.key === 'stunned'), noPush: (E, u) => u.row === 'front', stat: (u, p) => { if (!p.A) u.noDodge = true; } },
    { id: 'unyielding', name: 'Unyielding', icon: 'anchor', fx: 'guard', shape: 'self', cost: 45, self: [S('unyielding', 3, { v: [10, 6] })], d: 'For 3 turns, no single hit can take more than {10,6}% of the Warden’s max health.', aw: 'Also Unbroken for those turns.', awk: { self: [S('unyielding', 3, { v: 6 }), S('unbroken', 3)] } },
  ],
  [ // Reprisal
    { id: 'bash', name: 'Shield Bash', icon: 'shield', fx: 'bash', shape: 'foe', range: 'melee', cost: 15, power: [1, 1.3], push: [0.6, 0.8], d: '{1.0,1.3}×, and the foe’s next turn is pushed back {60,80}%.', aw: 'Also tries to Stun a charging foe.', then: (E, u, res, p) => { if (p.A) for (const r of res) if (r.landed && r.t.alive && r.t.st.charging) E.status(u, r.t, 'stunned', { turns: 1 }); } },
    { id: 'heavyhand', kind: 'passive', name: 'Heavy Hand', icon: 'mace', d: 'Shield Bash, Shield Toss and Shield Slam deal +{10,40}%.', aw: 'Their push-backs are 20% stronger.', out: (E, u, t, p, c) => (c.sk && SHIELD_SKILLS.includes(c.sk.id) ? 1 + p.v([0.1, 0.4]) : 1), pushMul: (E, u, sk, p) => (p.A && SHIELD_SKILLS.includes(sk.id) ? 1.2 : 1) },
    { id: 'retaliate', name: 'Retaliate', icon: 'thorns', fx: 'guard', shape: 'self', cost: 15, self: [S('retaliating', 2, { v: [0.6, 1] })], d: 'Retaliating for 2 turns: each foe that damages the Warden takes {0.6,1.0}× back.', aw: 'Those foes are also Weak for 1 turn.', awk: { self: [S('retaliating', 2, { v: 1, more: true })] } },
    { id: 'spikedrim', kind: 'passive', name: 'Spiked Rim', icon: 'thorns', d: 'While Guarding, the Warden Retaliates for {0.2,0.5}× against each hit it takes.', aw: 'Each one also adds a Bleeding stack (1 turn).', hurt: (E, u, src, p, c) => { if (u.alive && u.st.guarding && src && src.alive && !c.counter && src.side !== u.side) { const r = E.counter(u, src, p.v([0.2, 0.5])); if (p.A && r && r.d && src.alive) E.status(u, src, 'bleed', { turns: 1, p: 0.2 }); } } },
    { id: 'shieldtoss', name: 'Shield Toss', icon: 'shield', fx: 'toss', shape: 'foe', range: 'ranged', cost: 20, power: [0.6, 0.9], push: 0.5, d: '{0.6,0.9}×, pushes its next turn back 50%, and tries to break a charge.', aw: 'Bounces to a second foe.', then: (E, u, res, p) => { for (const r of res) if (r.landed && r.t.alive) E.breakCharge(u, r.t); if (p.A && res[0]) { const o = E.near(res[0].t, E.foes(u).filter(x => x !== res[0].t)); if (o) { const r2 = E.strike(u, o, p, { push: 0.5 }); if (r2 && r2.landed && o.alive) E.breakCharge(u, o); } } } },
    { id: 'wrathofthewall', kind: 'passive', name: 'Wrath of the Wall', icon: 'rage', d: 'Each hit the Warden takes for an ally adds +{5,15}% to its next attack, up to 5 times.', aw: 'Up to 10 times.', hurt: (E, u, src, p, c) => { if (c.redirect) u.wrath = Math.min(p.A ? 10 : 5, (u.wrath || 0) + 1); }, out: (E, u, t, p, c) => (c.dot || c.counter ? 1 : 1 + (u.wrath || 0) * p.v([0.05, 0.15])), used: (E, u, sk) => { if (sk.power) u.wrath = 0; } },
    { id: 'shieldslam', name: 'Shield Slam', icon: 'shield', fx: 'bash', shape: 'front', range: 'melee', cost: 25, power: [0.8, 1.1], push: 0.4, d: '{0.8,1.1}× to each, pushing each one’s next turn back 40%.', aw: 'They’re also Weak for 1 turn.', awk: { st: [S('weak', 1)] } },
    { id: 'ironretribution', kind: 'key', name: 'Iron Retribution', icon: 'mace', d: 'The Warden stores {50,100}% of the damage it takes, and its next shield skill releases it all as extra damage, but the Warden takes 10% more damage.', aw: 'No extra damage taken.', hurt: (E, u, src, p, c) => { u.stored = (u.stored || 0) + c.d * p.v([0.5, 1]); }, taken: (E, u, src, p) => (p.A ? 1 : 1.1), flat: (E, u, t, p, c) => { if (!c.sk || !SHIELD_SKILLS.includes(c.sk.id) || !u.stored) return 0; const s = u.stored; u.stored = 0; return s; } },
    { id: 'reckoning', name: 'Reckoning', icon: 'mace', fx: 'smash', shape: 'foe', range: 'melee', reach: true, cost: 45, power: [1.5, 2], d: '{1.5,2.0}×, plus 10% of all the damage the Warden has taken this battle.', aw: 'Hits every front-row foe.', awk: { shape: 'front' }, flatAdd: (E, u) => E.taken(u) * 0.1 },
  ],
]);

// ═══════════════════════════════════════════════════════════════════ Lamplighter
const BUFFS = ['kindled', 'hasted', 'warded', 'blessed', 'braced', 'fortified', 'veiled'];
defClass('lamplighter', {
  name: 'Lamplighter', role: 'Support: buffs and speed', row: 'back', weapon: 'Lanterns', mpGain: 12, slots: [3, 6],
  blurb: 'The keeper of the lantern. Makes the party hit harder and act sooner, blinds the dark and strips foes of their protections.',
  stats: { hp: [86, 104, 6], mp: [36, 44, 1.5], pow: [13, 15, 0.9], def: [3, 5, 0.2], spd: [11, 13, 0.03], crit: [3, 7, 0.03], dodge: [8, 12, 0.06] },
  res: { stun: 20, move: 20, bleed: 15, blight: 20, curse: 30, debuff: 40 },
  basic: 'flare', starter: 'kindle', second: 'dazzle',
  paths: [['Hearthkeeper', 'Keeps the party’s fire burning, with lasting Kindles, mana and warmth.'], ['Wayfinder', 'Moves the party up the turn strip, so allies act before the foes do.'], ['Glare', 'Blinds the foes, strips their protections and burns the spirits.']],
  rules: [{ if: 'always', do: 'kindle' }],
}, {
  flare: { name: 'Flare', icon: 'orb', fx: 'flare', shape: 'foe', range: 'magic', power: 0.8, basic: true, d: 'One foe, magic, 0.8×. Restores 12 mana.' },
  kindle: { name: 'Kindle', icon: 'kindle', fx: 'kindle', shape: 'allies', cost: 20, st: [S('kindled', 2, { v: [30, 40] })], d: 'Kindled for 2 turns: +{30,40}% damage.', aw: 'Lasts 3 turns.', awk: { st: [S('kindled', 3, { v: 40 })] } },
}, [
  [ // Hearthkeeper
    { id: 'sharetheflame', name: 'Share the Flame', icon: 'mana', fx: 'kindle', shape: 'ally', notSelf: true, cost: 15, mana: [25, 40], d: 'Gives the ally {25,40,n} mana.', aw: 'The ally is also Hasted for 1 turn.', awk: { st: [S('hasted', 1)] } },
    { id: 'warmglow', kind: 'passive', name: 'Warm Glow', icon: 'kindle', d: 'Kindled allies heal {1,4}% of max health at the start of each turn.', aw: 'Kindled allies also take 5% less damage.', aTurn: (E, o, t, p) => { if (o.alive && t.side === o.side && t.st.kindled && t.hp < t.maxHp) E.heal(o, t, t.maxHp * p.v([0.01, 0.04]), { raw: true }); }, aIn: (E, o, t, src, p) => (p.A && o.alive && t.side === o.side && t.st.kindled ? 0.95 : 1) },
    { id: 'longwick', kind: 'passive', name: 'Long Wick', icon: 'hourglass', d: 'Kindle lasts 1 turn longer; from level 5, every buff the Lamplighter gives does.', aw: 'Buffs last 2 turns longer.', helpOut: (E, u, t, p, s) => { if (s.turns >= 90 || STATUSES[s.key].time === 'start' || s.until) return; if (s.key === 'kindled' || (p.L >= 5 && BUFFS.includes(s.key))) s.turns += p.A ? 2 : 1; } },
    { id: 'hearthfire', name: 'Hearthfire', icon: 'kindle', fx: 'hymn', shape: 'allies', cost: 25, heal: [0.5, 0.9], mana: 10, d: 'Heals each ally {0.5,0.9}× and gives each 10 mana.', aw: 'Also removes Weak from each ally.', awk: { cleanse: ['weak'] } },
    { id: 'beacon', kind: 'passive', name: 'Beacon', icon: 'lantern', d: 'Every battle starts with all allies Kindled for {1,2,n} turns.', aw: 'They’re also Hasted for 2 turns.', start: (E, u, p) => { for (const t of E.heroes(u)) { E.status(u, t, 'kindled', { turns: p.n([1, 2]) }); if (p.A) E.status(u, t, 'hasted', { turns: 2 }); } } },
    { id: 'emberward', name: 'Ember Ward', icon: 'ward', fx: 'ward', shape: 'ally', cost: 20, d: 'Warded, absorbing {2,3}×. The foe that breaks the Ward starts Burning (2 turns, 0.3×).', aw: 'Wards every ally, at half strength.', run: (E, u, ts, p) => { const list = p.A ? E.heroes(u) : ts; for (const t of list) E.status(u, t, 'warded', { turns: 3, v: u.pow * p.v([2, 3]) * (p.A && t !== ts[0] ? 0.5 : 1), ember: true }); } },
    { id: 'eternalflame', kind: 'key', name: 'Eternal Flame', icon: 'kindle', d: 'Kindle never fades while the Lamplighter stands, but the Lamplighter loses {3,1}% of max health each turn.', aw: 'No health loss.', keepKindle: true, turnStart: (E, u, p) => { if (!p.A) E.selfCost(u, u.maxHp * p.v([0.03, 0.01])); } },
    { id: 'brightcompany', name: 'Bright Company', icon: 'mana', fx: 'kindle', shape: 'allies', cost: 40, mana: [15, 30], d: 'Every ally gains {15,30,n} mana.', aw: 'Every ally is also Hasted for 1 turn.', awk: { st: [S('hasted', 1)] } },
    { id: 'dawnbreak', name: 'Dawnbreak', icon: 'holy', fx: 'dazzle', shape: 'allies', cost: 60, d: 'Kindled (+{40,60}%) and Hasted for 3 turns, and every foe is Dazzled for 1 turn.', aw: 'Every ally then takes a turn at once, in slot order.', run: (E, u, ts, p) => { for (const t of ts) { E.status(u, t, 'kindled', { turns: 3, v: Math.round(p.v([40, 60])) }); E.status(u, t, 'hasted', { turns: 3 }); } for (const f of E.foes(u)) E.status(u, f, 'dazzled', { turns: 1 }); if (p.A) for (const t of ts.slice().sort((a, b) => a.slot - b.slot)) if (t !== u) E.now(t); } },
  ],
  [ // Wayfinder
    { id: 'haste', name: 'Haste', icon: 'haste', fx: 'haste', shape: 'ally', cost: 15, st: [S('hasted', 3, { v: [30, 40] })], d: 'Hasted for 3 turns: +{30,40}% Speed.', aw: 'Hastes every ally.', awk: { shape: 'allies' } },
    { id: 'quickening', kind: 'passive', name: 'Quickening', icon: 'boot', d: '+{0.3,1} Speed.', aw: 'Every ally also gets +0.5 Speed.', stat: (u, p) => { u.spd += p.v([0.3, 1]); }, aStat: (o, t, p) => { if (p.A && t !== o) t.spd += 0.5; } },
    { id: 'lighttheway', name: 'Light the Way', icon: 'lantern', fx: 'haste', shape: 'ally', notSelf: true, cost: 20, d: 'That ally takes the next turn. Costs {0,8,n} less.', aw: 'The ally is also Kindled for 1 turn.', costLess: [0, 8], run: (E, u, ts, p) => { for (const t of ts) { E.now(t); if (p.A) E.status(u, t, 'kindled', { turns: 1 }); E.borrowed(u, t); } } },
    { id: 'tailwind', kind: 'passive', name: 'Tailwind', icon: 'feather', d: 'Hasted allies also get +{5,15}% Dodge.', aw: 'Hasted allies’ skills cost 5 less mana.', aDodge: (E, o, t, p) => (o.alive && t.side === o.side && t.st.hasted ? p.v([5, 15]) : 0), aCost: (E, o, t, sk, p, c) => { if (p.A && o.alive && t.side === o.side && t.st.hasted) c.add -= 5; } },
    { id: 'guidinglight', name: 'Guiding Light', icon: 'lantern', fx: 'haste', shape: 'allies', cost: 35, d: 'Each ally’s next turn comes {20,40}% sooner.', aw: 'Each ally is also Kindled for 1 turn.', run: (E, u, ts, p) => { for (const t of ts) { if (t !== u) E.sooner(t, p.v([0.2, 0.4])); if (p.A) E.status(u, t, 'kindled', { turns: 1 }); if (t !== u) E.borrowed(u, t); } } },
    { id: 'lanternbearer', kind: 'passive', name: 'Lantern Bearer', icon: 'feather', d: '+{5,15}% Dodge.', aw: 'Each dodge restores 5 mana.', stat: (u, p) => { u.dodge += p.v([5, 15]); }, dodged: (E, u, src, p) => { if (p.A) E.mana(u, 5); } },
    { id: 'quickstep', name: 'Quickstep', icon: 'boot', fx: 'haste', shape: 'self', cost: 15, d: 'The Lamplighter’s next turn comes at once, and it’s Hasted for {1,2,n} turns.', aw: 'Costs no mana.', awk: { cost: 0 }, run: (E, u, ts, p) => { E.status(u, u, 'hasted', { turns: p.n([1, 2]) }); E.again(u); } },
    { id: 'borrowedtime', kind: 'key', name: 'Borrowed Time', icon: 'hourglass', d: 'Light the Way and Guiding Light cost half as much, but every ally they speed up loses {5,2}% of max health.', aw: 'No health loss.', cost: (E, u, sk, p, c) => { if (sk.id === 'lighttheway' || sk.id === 'guidinglight') c.mul *= 0.5; }, borrow: (p) => (p.A ? 0 : p.v([0.05, 0.02])) },
    { id: 'firstlight', kind: 'passive', name: 'First Light', icon: 'holy', d: 'Once per battle, when 2 or more allies are below 40% health, every ally takes a turn before any foe acts, healed by {5,20}% of max health.', aw: 'Twice per battle.', aHurt: (E, o, t, src, p) => { if (!o.alive || t.side !== o.side) return; const low = E.heroes(o).filter(x => E.pct(x) < 0.4); if (low.length >= 2 && E.once(o, 'firstlight', p.A ? 2 : 1)) { E.saved(o, o, 'First Light'); for (const a of E.heroes(o).sort((a, b) => a.slot - b.slot)) { E.heal(o, a, a.maxHp * p.v([0.05, 0.2]), { raw: true }); E.now(a); } } } },
  ],
  [ // Glare
    { id: 'dazzle', name: 'Dazzle', icon: 'dazzle', fx: 'dazzle', shape: 'foes', range: 'magic', cost: 25, power: [0.25, 0.45], st: [S('dazzled', 2)], d: '{0.25,0.45}× to each foe and Dazzled for 2 turns.', aw: 'Dazzled for 3 turns.', awk: { st: [S('dazzled', 3)] } },
    { id: 'mothlight', kind: 'passive', name: 'Moth-Light', icon: 'lantern', d: 'Flare +{15,50}% against spirits.', aw: 'Flare also Exposes spirits for 1 turn.', out: (E, u, t, p, c) => (c.sk && c.sk.id === 'flare' && t.tags.includes('spirit') ? 1 + p.v([0.15, 0.5]) : 1), hit: (E, u, t, p, c) => { if (p.A && c.sk && c.sk.id === 'flare' && t.alive && t.tags.includes('spirit')) E.status(u, t, 'exposed', { turns: 1 }); } },
    { id: 'searchlight', name: 'Searchlight', icon: 'exposed', fx: 'flare', shape: 'foe', range: 'magic', cost: 15, st: [S('exposed', 3, { v: [25, 35] })], d: 'Exposed for 3 turns: +{25,35}% damage taken, and it can’t dodge.', aw: 'Also strips one helpful status.', then: (E, u, res, p) => { if (p.A) for (const r of res) if (r.t.alive) E.strip(u, r.t, 1); } },
    { id: 'afterimage', kind: 'passive', name: 'Afterimage', icon: 'dazzle', d: 'Dazzled foes take +{5,20}% damage.', aw: 'Dazzled foes can’t crit.', aIn: (E, o, t, src, p) => (o.alive && t.side !== o.side && t.st.dazzled ? 1 + p.v([0.05, 0.2]) : 1), aNoCrit: (E, o, src, p) => p.A && o.alive && src.side !== o.side && !!src.st.dazzled },
    { id: 'snuff', name: 'Snuff', icon: 'dazzle', fx: 'dazzle', shape: 'foes', range: 'magic', cost: 25, power: [0.2, 0.4], strip: true, d: '{0.2,0.4}× to each foe, and strips every helpful status from every foe.', aw: 'They’re also Slowed for 1 turn.', awk: { st: [S('slowed', 1)] } },
    { id: 'harshlight', kind: 'key', name: 'Harsh Light', icon: 'dazzle', d: 'The Lamplighter’s attacks have a {40,80}% chance to Dazzle each foe they hit for 1 turn, but its buffs on allies last a turn less (never under 1).', aw: 'Buffs last their full length again.', hit: (E, u, t, p, c) => { if (t.alive && !c.dot && E.rng() * 100 < p.v([40, 80])) E.status(u, t, 'dazzled', { turns: 1 }); }, helpOut: (E, u, t, p, s) => { if (!p.A && s.turns > 1 && s.turns < 90) s.turns--; } },
    { id: 'blindterror', kind: 'passive', name: 'Blind Terror', icon: 'dazzle', d: 'A Dazzled foe that misses has its next turn pushed back {10,30}%.', aw: 'Pushed back 50%.', aMiss: (E, o, src, t, p, c) => { if (o.alive && src.side !== o.side && c.why === 'dazzled') E.push(o, src, p.A ? 0.5 : p.v([0.1, 0.3])); } },
    { id: 'sunburst', name: 'Sunburst', icon: 'holy', fx: 'holyaoe', shape: 'foes', range: 'magic', cost: 30, power: [0.7, 1], d: '{0.7,1.0}× to each foe, doubled against spirits.', aw: 'Spirits it hits are Dazzled for 1 turn.', mult: (E, u, t) => (t.tags.includes('spirit') ? 2 : 1), then: (E, u, res, p) => { if (p.A) for (const r of res) if (r.landed && r.t.alive && r.t.tags.includes('spirit')) E.status(u, r.t, 'dazzled', { turns: 1 }); } },
    { id: 'noondaysun', name: 'Noonday Sun', icon: 'holy', fx: 'dazzle', shape: 'foes', range: 'magic', cost: 55, power: [1, 1.4], strip: true, d: '{1.0,1.4}× to each foe, tripled against spirits, and strips their helpful statuses.', aw: 'Every foe hit is also Dazzled for 2 turns.', awk: { st: [S('dazzled', 2)] }, mult: (E, u, t) => (t.tags.includes('spirit') ? 3 : 1) },
  ],
]);

// ═══════════════════════════════════════════════════════════════════ Crossbowman
const AREA = ['front', 'back', 'random3', 'foes'];
defClass('crossbowman', {
  name: 'Crossbowman', role: 'Back-row ranged damage', row: 'back', weapon: 'Crossbows', mpGain: 10, slots: [3, 5],
  blurb: 'The patient marksman. Hits any row, so the foes’ back row is never safe, and sets up crits for the whole party.',
  stats: { hp: [90, 110, 6], mp: [27, 33, 1], pow: [18, 22, 1.3], def: [3, 5, 0.2], spd: [9, 11, 0.02], crit: [12, 18, 0.08], dodge: [6, 10, 0.03] },
  res: { stun: 25, move: 30, bleed: 20, blight: 25, curse: 15, debuff: 25 },
  basic: 'bolt', starter: 'aimed', second: 'volley',
  paths: [['Marksman', 'A few huge, certain shots, with crits set up for the whole party.'], ['Skirmisher', 'Volume of fire, spread across rows and random foes.'], ['Trapper', 'Bleeds, slows and snares, and is deadliest against beasts.']],
  rules: [{ if: 'foe_lowest', do: 'aimed' }],
}, {
  bolt: { name: 'Bolt', icon: 'arrow', fx: 'bolt', shape: 'foe', range: 'ranged', power: 1, basic: true, d: 'One foe, ranged, 1.0×. Restores 10 mana.' },
  aimed: { name: 'Aimed Shot', icon: 'mark', fx: 'aimed', shape: 'foe', range: 'ranged', cost: 18, power: [1.8, 2.4], crit: 25, d: '{1.8,2.4}×, +25% crit chance.', aw: 'Its crits deal ×2.2.', awk: { critX: 2.2 } },
  heavyshot: { name: 'Heavy Draw', icon: 'arrow', fx: 'aimed', shape: 'foe', range: 'ranged', power: [3.2, 4.2], sure: true, transform: true, d: 'The charged shot.', awk: { noGuard: true } },
}, [
  [ // Marksman
    { id: 'markquarry', name: 'Mark Quarry', icon: 'quarry', fx: 'aimed', shape: 'foe', range: 'ranged', cost: 10, power: 0.5, st: [S('quarry', 3, { v: [20, 35] })], d: '0.5× and Quarry for 3 turns: every attacker gets +{20,35}% crit chance against it.', aw: 'Crits on the Quarry restore 5 mana to the attacker.', awk: { st: [S('quarry', 3, { v: 35, more: true })] } },
    { id: 'steadyaim', kind: 'passive', name: 'Steady Aim', icon: 'mark', d: '+{5,20}% damage if the Crossbowman wasn’t hit since its last turn.', aw: 'Also +10% crit chance.', out: (E, u, t, p, c) => (!c.dot && !u.hitSince ? 1 + p.v([0.05, 0.2]) : 1), crit: (E, u, t, p) => (p.A && !u.hitSince ? 10 : 0) },
    { id: 'eagleeye', kind: 'passive', name: 'Eagle Eye', icon: 'star', d: '+{3,10}% crit chance.', aw: 'Can target Hidden foes.', stat: (u, p) => { u.crit += p.v([3, 10]); if (p.A) u.seeHidden = true; } },
    { id: 'heavydraw', name: 'Heavy Draw', icon: 'charge', fx: 'charge', shape: 'foe', range: 'ranged', cost: 25, charge: 'heavyshot', d: 'Charges this turn and Marks the target. Next turn: {3.2,4.2}×, and it can’t miss.', aw: 'Ignores Guarding: always hits the Marked foe.' },
    { id: 'deadeye', kind: 'passive', name: 'Deadeye', icon: 'star', d: 'Crits deal ×{1.7,2.0} instead of ×1.6.', aw: '×2.3.', critX: (E, u, t, p) => (p.A ? 2.3 : p.v([1.7, 2])) },
    { id: 'piercingbolt', name: 'Piercing Bolt', icon: 'arrow', fx: 'aimed', shape: 'foe', range: 'ranged', cost: 25, power: [1.4, 1.9], pierce: true, noGuard: true, d: '{1.4,1.9}×, ignoring Defense and Guarding.', aw: 'The target is also Corroded for 2 turns.', awk: { st: [S('corroded', 2)] } },
    { id: 'overwatch', kind: 'key', name: 'Overwatch', icon: 'mark', d: 'Single-target skills deal +{20,40}%, but the Crossbowman can’t use area skills.', aw: 'Area skills work again, at −25%.', out: (E, u, t, p, c) => (c.dot || c.counter ? 1 : c.area ? (p.A ? 0.75 : 1) : 1 + p.v([0.2, 0.4])), canUse: (E, u, sk, p) => p.A || !AREA.includes(sk.shape) },
    { id: 'killshot', name: 'Killshot', icon: 'skull', fx: 'aimed', shape: 'foe', range: 'ranged', cost: 40, power: [2, 2.8], d: '{2.0,2.8}×, and it always crits against a foe below 30% health.', aw: 'Can’t miss.', awk: { sure: true }, critIf: (E, u, t) => E.pct(t) < 0.3 },
    { id: 'calledshot', kind: 'passive', name: 'Called Shot', icon: 'mark', d: 'The first Aimed Shot of each battle always crits and deals +{20,50}%.', aw: 'The first two.', out: (E, u, t, p, c) => (c.sk && c.sk.id === 'aimed' && (u.aimedN || 0) < (p.A ? 2 : 1) ? 1 + p.v([0.2, 0.5]) : 1), critAlways: (E, u, t, p, c) => c.sk && c.sk.id === 'aimed' && (u.aimedN || 0) < (p.A ? 2 : 1), used: (E, u, sk) => { if (sk.id === 'aimed') u.aimedN = (u.aimedN || 0) + 1; } },
  ],
  [ // Skirmisher
    { id: 'volley', name: 'Volley', icon: 'arrow', fx: 'volley', shape: 'back', range: 'ranged', cost: 22, power: [0.75, 1], volleys: true, d: '{0.75,1.0}× to each back-row foe.', aw: 'Each foe hit also Bleeds (2 turns, 0.2×).', awk: { st: [S('bleed', 2, { p: 0.2 })] } },
    { id: 'quickreload', kind: 'passive', name: 'Quick Reload', icon: 'mana', d: 'Bolt restores {2,6,n} more mana.', aw: 'Bolt gets +15% crit chance.', mpGain: (E, u, sk, p) => (sk.id === 'bolt' ? p.n([2, 6]) : 0), crit: (E, u, t, p, c) => (p.A && c.sk && c.sk.id === 'bolt' ? 15 : 0) },
    { id: 'scattershot', name: 'Scatter Shot', icon: 'arrow', fx: 'volley', shape: 'random3', n: 3, range: 'ranged', cost: 20, power: [0.7, 0.95], volleys: true, d: '{0.7,0.95}× to 3 random foes.', aw: '+15% crit chance.', awk: { crit: 15 } },
    { id: 'skirmish', kind: 'passive', name: 'Skirmish', icon: 'boot', d: 'After an area skill, the Crossbowman’s next turn comes {10,25}% sooner.', aw: '40% sooner.', used: (E, u, sk, p) => { if (AREA.includes(sk.shape) && sk.power) E.sooner(u, p.A ? 0.4 : p.v([0.1, 0.25])); } },
    { id: 'rapidfire', name: 'Rapid Fire', icon: 'arrow', fx: 'volley', shape: 'foe', range: 'ranged', cost: 20, power: [0.5, 0.65], hits: 3, d: '3 hits of {0.5,0.65}×, each rolling its own crit.', aw: '5 hits.', awk: { hits: 5 } },
    { id: 'stormofiron', kind: 'passive', name: 'Storm of Iron', icon: 'arrow', d: 'Volley and Scatter Shot fire twice, at {40,60}% damage each time.', aw: 'Deadly Barrage fires a third volley.', volleys: (sk, p) => (sk.id === 'volley' || sk.id === 'scattershot' ? [2, p.v([0.4, 0.6])] : sk.id === 'deadlybarrage' && p.A ? [3, 1] : null) },
    { id: 'suppressingfire', name: 'Suppressing Fire', icon: 'arrow', fx: 'volley', shape: 'front', range: 'ranged', cost: 25, power: [0.5, 0.7], push: 0.25, d: '{0.5,0.7}× to each front-row foe, pushing each foe’s next turn back 25%.', aw: 'They’re also Weak for 1 turn.', awk: { st: [S('weak', 1)] } },
    { id: 'bandolier', kind: 'key', name: 'Bandolier', icon: 'bag', d: 'Area skills cost half as much mana, but every shot deals {25,10}% less damage.', aw: 'No damage penalty.', cost: (E, u, sk, p, c) => { if (AREA.includes(sk.shape)) c.mul *= 0.5; }, out: (E, u, t, p, c) => (p.A || c.dot ? 1 : 1 - p.v([0.25, 0.1])) },
    { id: 'deadlybarrage', name: 'Deadly Barrage', icon: 'arrow', fx: 'volley', shape: 'foes', range: 'ranged', cost: 50, power: [0.6, 0.85], volleys: true, baseVolleys: 2, d: 'Two volleys of {0.6,0.85}× at every foe.', aw: 'Each volley gets +25% crit chance.', awk: { crit: 25 } },
  ],
  [ // Trapper
    { id: 'barbedbolt', name: 'Barbed Bolt', icon: 'bleed', fx: 'bolt', shape: 'foe', range: 'ranged', cost: 12, power: 0.8, st: [S('bleed', 3, { p: [0.35, 0.55] })], d: '0.8× and a Bleeding stack for 3 turns, {0.35,0.55}× per tick.', aw: 'Applies 2 stacks.', awk: { st: [S('bleed', 3, { p: 0.55 }), S('bleed', 3, { p: 0.55 })] } },
    { id: 'hunter', kind: 'passive', name: 'Hunter', icon: 'claw', d: '+{10,30}% damage against beasts.', aw: 'Beasts it hits are Slowed for 1 turn.', out: (E, u, t, p, c) => (t.tags.includes('beast') ? 1 + p.v([0.1, 0.3]) : 1), hit: (E, u, t, p, c) => { if (p.A && !c.dot && t.alive && t.tags.includes('beast')) E.status(u, t, 'slowed', { turns: 1 }); } },
    { id: 'pinningshot', name: 'Pinning Shot', icon: 'slow', fx: 'bolt', shape: 'foe', range: 'ranged', cost: 15, power: [0.7, 1], push: 0.3, st: [S('slowed', 2)], d: '{0.7,1.0}×, Slowed for 2 turns, and its next turn is pushed back 30%.', aw: 'Slowed for 4 turns.', awk: { st: [S('slowed', 4)] } },
    { id: 'serratedbolts', kind: 'passive', name: 'Serrated Bolts', icon: 'bleed', d: 'Bleeding the Crossbowman applies lasts {1,3,n} turns longer.', aw: 'Those stacks tick 20% harder.', applyOut: (E, u, t, p, s) => { if (s.key === 'bleed') { if (s.turns < 90) s.turns += p.n([1, 3]); if (p.A) s.dmg = Math.round(s.dmg * 1.2); } } },
    { id: 'beartrap', name: 'Bear Trap', icon: 'trap', fx: 'trap', shape: 'foe', range: 'ranged', cost: 20, d: 'Sets a trap: the foe’s next turn starts with {1.2,1.8}× damage and a Bleeding stack, and it’s Slowed for 2 turns.', aw: 'The trap also tries to Stun it for 1 turn.', run: (E, u, ts, p) => { for (const t of ts) E.status(u, t, 'trap', { sure: true, v: u.pow * p.v([1.2, 1.8]), stun: p.A }); } },
    { id: 'snare', kind: 'passive', name: 'Snare', icon: 'slow', d: 'Slowed foes take +{10,25}% damage from the Crossbowman and can’t dodge its attacks.', aw: 'Slowed foes take the bonus from every ally.', out: (E, u, t, p, c) => (!p.A && t.st.slowed ? 1 + p.v([0.1, 0.25]) : 1), sure: (E, u, t) => !!t.st.slowed, aIn: (E, o, t, src, p) => (p.A && o.alive && src && src.side === o.side && t.st.slowed ? 1 + p.v([0.1, 0.25]) : 1) },
    { id: 'bloodscent', kind: 'key', name: 'Blood Scent', icon: 'bleed', d: '+{15,30}% damage to Bleeding foes, but −20% to foes that aren’t bleeding. With no rule picking a target, shots go to the lowest-health Bleeding foe.', aw: 'No penalty against foes that aren’t bleeding.', out: (E, u, t, p, c) => (c.dot ? 1 : t.st.bleed ? 1 + p.v([0.15, 0.3]) : p.A ? 1 : 0.8), aim: (E, u, pool) => E.lowest(pool.filter(x => x.st.bleed)) },
    { id: 'tripwire', name: 'Tripwire', icon: 'trap', fx: 'trap', shape: 'front', range: 'ranged', cost: 25, st: [S('slowed', 2), S('bleed', 2, { p: [0.25, 0.4] })], d: 'Every front-row foe is Slowed for 2 turns and Bleeds for 2 turns, {0.25,0.4}× per tick.', aw: 'Their next turns are also pushed back 30%.', awk: { push: 0.3 } },
    { id: 'thekill', name: 'The Kill', icon: 'skull', fx: 'aimed', shape: 'foe', range: 'ranged', cost: 45, power: [2, 2.8], d: '{2.0,2.8}×, plus 0.4× for each harmful status on the target.', aw: 'Can’t miss, and on a kill the Crossbowman’s next turn comes at once.', mult: (E, u, t, p) => 1 + E.bad(t) * 0.4 / p.v([2, 2.8]), awk: { sure: true }, kill: (E, u, t, p) => { if (p.A) E.again(u); } },
  ],
]);

// The step 1 prototype's fixed party of six. A new game now starts with one hero from the first pick; PARTY stays for
// the version-0 save migration (js/save.js), the simulator's default setup, the battle canvas and the rules model before a
// save has loaded, and the tools.
const PARTY = ['warden', 'sellsword', 'crossbowman', 'pilgrim', 'lamplighter', 'hexblade'];
