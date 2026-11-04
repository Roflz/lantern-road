'use strict';
// Lantern Road · the battle simulation.
// A battle is a pure function of its setup and a seed. It returns an event log, which the battle screen animates.
// Skip, the headless balance test (tools/simtest.js) and, later, offline gains all run this same code.
// Nothing here touches the page.

const SIM = {
  ROUND: 100,          // timeline units in one round: a Speed 10 character acts once per round
  ENRAGE_ROUND: 15,    // from this round on, foes are enraged (tune)
  ENRAGE_STEP: 0.25,   // each round of enrage adds this much to foe damage (tune)
  MAX_ACTIONS: 600,    // a safety stop; enrage should end every battle long before this
  KINDLE: 0.3,         // Kindled: +30% damage
  GUARD_CUT: 0.3,      // Guarding: −30% damage taken
  DAZZLE_MISS: 0.4,    // Dazzled: 40% of attacks miss
  CRIT: 1.6,           // critical hit multiplier
  DEF_K: 20,           // Defense D cuts damage to 20 / (20 + D)
  QUEUE: 8,            // turns shown on the turn strip
};

// setup: { seed, party: [6 slots], foes: [6 slots], scale?: { hp, pow }, partyRules?: [rules], items?: { id: count } }
// A slot holds null, a class or foe id, or { key, name?, rules?, over? } where over replaces stats.
// partyRules are the team-wide rules (PARTY_ACTIONS), and items the party's stock for this battle.
function simulate(setup) {
  const rng = makeRng((setup.seed >>> 0) || 1);
  const units = [];
  const scale = setup.scale || {};
  const make = (e, side, slot) => {
    const spec = typeof e === 'string' ? { key: e } : e;
    const base = (side ? FOES : CLASSES)[spec.key];
    if (!base) throw new Error('Unknown ' + (side ? 'foe' : 'class') + ': ' + spec.key);
    const src = Object.assign({}, base, spec.over || {});
    const hpK = side ? (scale.hp || 1) : 1, powK = side ? (scale.pow || 1) : 1;
    const u = {
      id: (side ? 'f' : 'p') + slot, side, slot, row: ROWS[slot], lane: LANE[slot], order: side * 6 + slot,
      key: spec.key, name: spec.name || src.name, hero: !side, boss: !!src.boss, elite: !!src.elite,
      maxHp: Math.round(src.hp * hpK), maxMp: src.mp, pow: Math.round(src.pow * powK), def: src.def, spd: src.spd,
      crit: src.crit, dodge: src.dodge, mpGain: src.mpGain, basic: src.basic, skills: src.skills.slice(),
      tags: (src.tags || []).slice(),
      rules: (spec.rules || src.rules || []).map(r => Object.assign({ on: true }, r)),
      lastTarget: null, // the foe it last attacked alone, for "Foe: the leader's target"
    };
    u.hp = u.maxHp; u.mp = Math.floor(u.maxMp / 2); u.alive = true; u.st = {};
    units.push(u);
  };
  (setup.party || []).forEach((e, i) => { if (e) make(e, 0, i); });
  (setup.foes || []).forEach((e, i) => { if (e) make(e, 1, i); });
  const byId = {};
  for (const u of units) byId[u.id] = u;
  const partyRules = (setup.partyRules || []).map(r => Object.assign({ on: true }, r));
  const items = Object.assign({}, setup.items || {});

  const log = [];
  const emit = e => { log.push(e); return e; };
  const stats = {};
  // Per character, for the battle report: damage and healing both ways, the biggest hit, and how often each rule fired.
  for (const u of units) stats[u.id] = { dealt: 0, taken: 0, healed: 0, healedIn: 0, soaked: 0, dot: 0, crits: 0, best: null, kills: 0, falls: 0, koRounds: [], raised: 0, revives: 0, turns: 0, basic: 0, charged: 0, items: 0, rules: u.rules.map(() => 0) };
  // How often each party rule fired, and the items used.
  const party = { rules: partyRules.map(() => 0), used: {} };

  let clock = 0, round = 1, enrage = 0, actor = null;
  const interval = u => 1000 / u.spd;
  const living = side => units.filter(u => u.alive && u.side === side);
  const fallen = side => units.filter(u => !u.alive && u.side === side);
  const pct = u => u.hp / u.maxHp;
  const before = (a, at, b, bt) => at < bt - 1e-9 || (Math.abs(at - bt) <= 1e-9 && a.order < b.order);
  // the nearest by lane, then by slot
  const near = (u, list) => list.reduce((b, x) => {
    if (!b) return x;
    const dx = Math.abs(x.lane - u.lane), db = Math.abs(b.lane - u.lane);
    return dx < db || (dx === db && x.slot < b.slot) ? x : b;
  }, null);

  // Everyone's first turn lands somewhere in the first round, faster characters earlier on average.
  for (const u of units) u.next = interval(u) * (0.25 + 0.75 * rng());

  function nextActor() {
    let best = null;
    for (const u of units) if (u.alive && (!best || before(u, u.next, best, best.next))) best = u;
    return best;
  }
  // The next n turns, assuming nothing changes: what the turn strip shows.
  function projectQueue(n = SIM.QUEUE) {
    const list = units.filter(u => u.alive).map(u => ({ u, t: u.next }));
    const out = [];
    while (out.length < n && list.length) {
      let b = list[0];
      for (const x of list) if (before(x.u, x.t, b.u, b.t)) b = x;
      out.push(b.u.id); b.t += interval(b.u);
    }
    return out;
  }
  const snap = u => ({
    id: u.id, side: u.side, slot: u.slot, key: u.key, name: u.name, boss: u.boss, elite: u.elite,
    hp: u.hp, maxHp: u.maxHp, mp: u.mp, maxMp: u.maxMp, alive: u.alive,
    pow: u.pow, def: u.def, spd: u.spd, crit: u.crit, dodge: u.dodge,
    basic: u.basic, skills: u.skills.slice(), rules: u.rules.map(r => Object.assign({}, r)),
    st: Object.fromEntries(Object.entries(u.st).map(([k, s]) => [k, { turns: s.turns, dmg: s.dmg }])),
  });

  // ── effects
  function hurt(t, dmg, src, dot) {
    const d = Math.min(t.hp, dmg);
    t.hp -= d;
    stats[t.id].taken += d;
    if (src && src.side !== t.side) { stats[src.id].dealt += d; if (dot) stats[src.id].dot += d; }
    return d;
  }
  function checkDeath(t, src) {
    if (!t.alive || t.hp > 0) return false;
    t.alive = false; t.hp = 0; t.st = {};
    stats[t.id].falls++; stats[t.id].koRounds.push(round);
    if (src && src.side !== t.side) stats[src.id].kills++;
    emit({ t: 'die', who: t.id, by: src ? src.id : null });
    return true;
  }
  function addStatus(t, key, turns, src, power) {
    const prev = t.st[key];
    const s = { turns, src: src ? src.id : null, fresh: t === actor };
    if (power) s.dmg = Math.max(1, Math.round(src.pow * power * (src.st.kindled ? 1 + SIM.KINDLE : 1)));
    if (prev) { s.turns = Math.max(prev.turns, turns); if (prev.dmg) s.dmg = Math.max(prev.dmg, s.dmg || 0); }
    t.st[key] = s;
    emit({ t: 'status', who: t.id, key, on: true, turns: s.turns, dmg: s.dmg });
  }
  function dropStatus(t, key) {
    if (!t.st[key]) return;
    delete t.st[key];
    emit({ t: 'status', who: t.id, key, on: false });
  }
  // A Guarding ally steps in front of single-target attacks.
  function guardOf(t) {
    if (t.st.guarding) return null;
    return units.find(g => g.alive && g.side === t.side && g !== t && g.st.guarding) || null;
  }

  // ── targeting
  // Who a skill can reach, before any rule narrows it down.
  function poolFor(u, sk) {
    const foes = living(1 - u.side);
    const front = foes.filter(f => f.row === 'front'), back = foes.filter(f => f.row === 'back');
    switch (sk.shape) {
      case 'foe': return sk.range === 'melee' && !sk.reach && front.length ? front : foes;
      case 'front': return front.length ? front : back;
      case 'back': return back.length ? back : front;
      case 'random3': case 'foes': return foes;
      case 'ally': return sk.revive ? fallen(u.side) : living(u.side);
      case 'allies': return living(u.side);
      case 'self': return [u];
    }
    return [];
  }
  // With no rule to pick a target: the nearest foe, front row first; the most hurt ally; the first fallen ally.
  function defaultTarget(u, sk, pool) {
    if (!pool.length) return null;
    if (sk.shape === 'ally') return sk.revive ? pool[0] : pool.reduce((b, x) => (pct(x) < pct(b) ? x : b));
    const front = pool.filter(f => f.row === 'front');
    return near(u, front.length ? front : pool);
  }
  // The battle as u sees it, for rule conditions (see CONDITIONS in js/data.js).
  function view(u) {
    const allies = living(u.side);
    return { u, foes: living(1 - u.side), allies, fallen: fallen(u.side), round, enrage, leader: allies.reduce((b, x) => (!b || x.slot < b.slot ? x : b), null) };
  }
  // Does the rule's condition hold? Returns false, true, or the unit it picked as the target.
  function test(u, rule, sk, pool) {
    const C = CONDITIONS[rule.if];
    if (!C) return false;
    const c = view(u);
    if (!C.who) return !!C.when(rule, c);
    const list = C.who === 'self' ? [u] : C.who === 'foe' ? c.foes : C.who === 'ally' ? c.allies : c.fallen;
    const cand = C.filter ? list.filter(x => C.filter(x, rule, c)) : list;
    if (!cand.length) return false;
    // The condition is about the side the skill hits: it picks the target, among those the skill can reach.
    // Otherwise it only decides whether the rule fires.
    const single = sk.shape === 'foe' || sk.shape === 'ally';
    if (!single || !pool.length || pool[0].side !== cand[0].side) return true;
    const ok = cand.filter(x => pool.includes(x));
    if (!ok.length) return false;
    return C.best ? ok.reduce((b, x) => (C.best(x, b, rule, c) ? x : b)) : near(u, ok);
  }
  function sample(pool, n) {
    const a = pool.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a.slice(0, n);
  }
  // The targets a skill would hit under a rule, or null if the rule doesn't hold or the skill has no target.
  // picked: whether the rule's condition chose the target (focus fire leaves those alone).
  function resolve(u, sk, rule) {
    const pool = poolFor(u, sk);
    if (!pool.length) return null;
    let pick = true;
    if (rule) { pick = test(u, rule, sk, pool); if (!pick) return null; }
    switch (sk.shape) {
      case 'foe': case 'ally': { const t = pick !== true ? pick : defaultTarget(u, sk, pool); return t ? { targets: [t], picked: pick !== true, pool } : null; }
      case 'random3': return { targets: sample(pool, 3), picked: false, pool };
      default: return { targets: pool, picked: false, pool };
    }
  }
  const usable = (u, r) => r.on && (r.do === u.basic || u.skills.includes(r.do)) && SKILLS[r.do] && (SKILLS[r.do].cost || 0) <= u.mp;
  // Read the rules from the top; the first that holds and is possible fires. Otherwise, the basic attack.
  // Heroes read the party rules first: an item rule can spend the turn, and a focus rule can pick the foe.
  function choose(u) {
    const team = u.side === 0 ? partyPlan(u) : {};
    if (team.item) return team.item;
    let plan = null;
    for (let i = 0; i < u.rules.length && !plan; i++) {
      const r = u.rules[i];
      if (!usable(u, r)) continue;
      const got = resolve(u, SKILLS[r.do], r);
      if (got) plan = Object.assign(got, { sk: SKILLS[r.do], rule: i });
    }
    if (!plan) {
      const got = resolve(u, SKILLS[u.basic], null);
      plan = got ? Object.assign(got, { sk: SKILLS[u.basic], rule: -1 }) : { sk: SKILLS.wait, targets: [u], rule: -1 };
    }
    // Focus fire: a single-target attack whose rule didn't choose the foe goes at the party's focus.
    const f = team.focus;
    if (f && plan.sk.shape === 'foe' && !plan.picked && plan.pool && plan.pool.includes(f.unit)) {
      plan.focus = f.prule;
      if (plan.targets[0] !== f.unit) plan.targets = [f.unit];
    }
    return plan;
  }
  // The party rules, read from the top for the hero whose turn it is.
  // Returns { item: a plan that uses an item, focus: { unit, prule } }.
  const FOCUS = { shape: 'foe', reach: true };
  function partyPlan(u) {
    const out = {};
    for (let i = 0; i < partyRules.length; i++) {
      const r = partyRules[i], A = PARTY_ACTIONS[r.do];
      if (!r.on || !A) continue;
      if (A.kind === 'item' && !out.item && items[A.item] > 0) {
        const sk = SKILLS[ITEMS[A.item].skill], got = resolve(u, sk, r);
        if (got) { out.item = { sk, targets: got.targets, rule: -4, prule: i, item: A.item }; break; }
      }
      if (A.kind === 'focus' && !out.focus) {
        const pick = test(u, r, FOCUS, living(1 - u.side));
        if (pick && pick !== true) out.focus = { unit: pick, prule: i };
      }
    }
    return out;
  }

  // ── a turn
  function perform(u, plan) {
    const { sk, targets, rule } = plan, st = stats[u.id];
    if (rule >= 0) st.rules[rule]++;
    else if (rule === -2) st.charged++;
    else if (rule === -4) { st.items++; party.rules[plan.prule]++; items[plan.item]--; party.used[plan.item] = (party.used[plan.item] || 0) + 1; }
    else if (sk.id === u.basic) st.basic++;
    if (plan.focus != null) party.rules[plan.focus]++;
    if (sk.shape === 'foe') u.lastTarget = targets[0];
    u.mp -= sk.cost || 0;
    if (sk.id === u.basic) u.mp = Math.min(u.maxMp, u.mp + u.mpGain);
    // rule: the rule that chose this (-1 none, -2 a charged attack landing, -4 a party rule: see prule).
    // focus: the party rule that aimed it, when focus fire did. item and left: the item used and how many remain.
    const ev = { t: 'act', who: u.id, skill: sk.id, rule, targets: targets.map(x => x.id), mp: u.mp };
    if (rule === -4) Object.assign(ev, { prule: plan.prule, item: plan.item, left: items[plan.item] });
    if (plan.focus != null) ev.focus = plan.focus;
    emit(ev);

    if (sk.charge) {
      const tgt = targets[0];
      u.st.charging = { turns: 1, skill: sk.charge, target: tgt.id, fresh: true };
      emit({ t: 'status', who: u.id, key: 'charging', on: true, turns: 1, target: tgt.id, skill: sk.charge });
      addStatus(tgt, 'marked', 1, u);
      return;
    }
    const kindle = u.st.kindled ? 1 + SIM.KINDLE : 1;
    const rage = u.side === 1 ? 1 + enrage * SIM.ENRAGE_STEP : 1;
    for (const aimed of targets) {
      if (sk.power) {
        if (!aimed.alive) continue;
        let t = aimed;
        if (sk.shape === 'foe') { const g = guardOf(aimed); if (g) t = g; }
        const guard = t !== aimed ? aimed.id : undefined;
        if (!sk.sure && u.st.dazzled && rng() < SIM.DAZZLE_MISS) { emit({ t: 'miss', src: u.id, tgt: t.id, why: 'dazzled', guard }); continue; }
        if (!sk.sure && rng() * 100 < t.dodge) { emit({ t: 'miss', src: u.id, tgt: t.id, why: 'dodge', guard }); continue; }
        let dmg = u.pow * sk.power * kindle * rage * SIM.DEF_K / (SIM.DEF_K + t.def);
        if (t.st.guarding) dmg *= 1 - SIM.GUARD_CUT;
        dmg *= 0.92 + rng() * 0.16;
        const crit = rng() * 100 < u.crit + (sk.crit || 0);
        if (crit) dmg *= SIM.CRIT;
        const d = hurt(t, Math.max(1, Math.round(dmg)), u);
        if (guard) stats[t.id].soaked += d;
        if (crit) st.crits++;
        if (!st.best || d > st.best.dmg) st.best = { dmg: d, tgt: t.name, skill: sk.id, crit };
        emit({ t: 'hit', src: u.id, tgt: t.id, dmg: d, crit, hp: t.hp, guard });
        if (checkDeath(t, u)) continue;
        if (sk.status) addStatus(t, sk.status.key, sk.status.turns, u, sk.status.power);
        if (sk.stagger) { t.next += interval(t) * sk.stagger; emit({ t: 'delay', who: t.id, queue: projectQueue() }); }
        continue;
      }
      const t = aimed;
      if (sk.revive) {
        if (t.alive) continue;
        t.alive = true; t.hp = Math.max(1, Math.round(t.maxHp * sk.revive)); t.st = {};
        t.next = clock + interval(t) * 0.5;
        st.revives++; st.healed += t.hp; stats[t.id].healedIn += t.hp; stats[t.id].raised++;
        emit({ t: 'revive', src: u.id, tgt: t.id, hp: t.hp });
        continue;
      }
      if (!t.alive) continue;
      if (sk.heal || sk.healPct) {
        const amt = Math.round(u.pow * (sk.heal || 0) + t.maxHp * (sk.healPct || 0));
        const got = Math.min(t.maxHp - t.hp, amt);
        t.hp += got; st.healed += got; stats[t.id].healedIn += got;
        emit({ t: 'heal', src: u.id, tgt: t.id, amt: got, hp: t.hp });
      }
      if (sk.status) addStatus(t, sk.status.key, sk.status.turns, u, sk.status.power);
    }
    if (sk.selfStatus && u.alive) addStatus(u, sk.selfStatus.key, sk.selfStatus.turns, u);
    if (sk.selfDestruct && u.alive) { u.hp = 0; checkDeath(u, null); }
  }

  function takeTurn(u) {
    actor = u;
    stats[u.id].turns++;
    emit({ t: 'turn', who: u.id, round, queue: projectQueue() });
    // Curses and bleeding bite at the start of the turn.
    for (const k of ['doom', 'bleed']) {
      const s = u.st[k];
      if (!s) continue;
      const src = byId[s.src];
      const d = hurt(u, s.dmg, src, true);
      emit({ t: 'tick', who: u.id, key: k, dmg: d, hp: u.hp });
      if (--s.turns <= 0) dropStatus(u, k);
      if (checkDeath(u, src)) return;
    }
    dropStatus(u, 'guarding'); // a Guard lasts until the guard's next turn
    let plan;
    const c = u.st.charging;
    if (c) {
      // The charged attack lands now, on its marked victim if they still stand.
      dropStatus(u, 'charging');
      const sk = SKILLS[c.skill];
      let tgt = byId[c.target];
      if (tgt) dropStatus(tgt, 'marked');
      if (!tgt || !tgt.alive) tgt = defaultTarget(u, sk, poolFor(u, sk));
      plan = tgt ? { sk, targets: [tgt], rule: -2 } : { sk: SKILLS.wait, targets: [u], rule: -1 };
    } else plan = choose(u);
    perform(u, plan);
    // Kindled and Dazzled count down at the end of each of the owner's turns, except the turn they were given.
    for (const k of ['kindled', 'dazzled']) {
      const s = u.st[k];
      if (!s) continue;
      if (s.fresh) s.fresh = false;
      else if (--s.turns <= 0) dropStatus(u, k);
    }
    u.next = clock + interval(u);
  }

  // ── the battle
  emit({ t: 'start', units: units.map(snap), queue: projectQueue(), partyRules: partyRules.map(r => Object.assign({}, r)), items: Object.assign({}, items) });
  let winner = -1, actions = 0, stalled = false;
  while (winner < 0) {
    const u = nextActor();
    clock = u.next;
    const r = Math.floor(clock / SIM.ROUND) + 1;
    while (round < r) {
      round++;
      emit({ t: 'round', n: round });
      if (round >= SIM.ENRAGE_ROUND) {
        enrage = round - SIM.ENRAGE_ROUND + 1;
        emit({ t: 'enrage', level: enrage, mult: 1 + enrage * SIM.ENRAGE_STEP });
      }
    }
    takeTurn(u);
    actions++;
    const p = living(0).length, f = living(1).length;
    if (!f) winner = 0;
    else if (!p) winner = 1;
    else if (actions >= SIM.MAX_ACTIONS) { winner = 1; stalled = true; }
  }
  emit({ t: 'end', winner, round, actions, stalled });
  return { seed: setup.seed, winner, rounds: round, actions, stalled, log, stats, party, partyRules: log[0].partyRules, start: log[0].units, final: units.map(snap) };
}

// A stage's battle, with the fixed party.
// tactics: { party: [slots of { key, rules }], partyRules, items }. Without it, stageSetup.tactics() is asked (the
// rules editor sets it, in js/rules.js), and otherwise each class's starting rules are used.
function defaultTactics() {
  const items = {};
  for (const k in ITEMS) items[k] = ITEMS[k].carry;
  return { party: PARTY, partyRules: PARTY_RULES.rules, items };
}
function stageSetup(stage, seed, tactics) {
  const t = tactics || (stageSetup.tactics && stageSetup.tactics()) || defaultTactics();
  return { seed, party: t.party, foes: stage.foes, scale: stage.scale, partyRules: t.partyRules, items: t.items };
}
stageSetup.tactics = null;
