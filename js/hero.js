'use strict';
// Lantern Road · characters and how they grow (design §5, content spec §2).
// A character is plain data in the save: rolled level-1 stats, a level and XP, the stat and skill points they have
// placed, the trees they have opened, the skills they know and have equipped, and their threshold choices.
// Hero is the model: every change goes through it. It touches no page, so tools/simtest.js tests it in Node.
//
// A character:
//   { id, cls, name, level, xp, base: { hp, mp, pow, def, spd, crit, dodge }, alloc: { hp.., res: { stun.. } },
//     classes: [first class, second?, third?], tiers: { cls: highest open tier }, skills: { id: level 1–5 },
//     awakened: [ids], awakenSlots, equip: [active ids or null], picks: { threshold level: choice }, respecs,
//     lessons: { skill, rule }, fatigue, spent (true from 100 fatigue until it falls below 50, js/rest.js),
//     gear: { weapon, armor, accessory } (pieces worn, js/items.js), rules, joined }
// Every recruit carries a Common weapon of their class's type (content spec §2).

const HERO = {
  CAP: 200,
  THRESHOLDS: [30, 50, 80, 100, 120, 150, 180, 200],
  COMBINE_AT: [50, 200],     // thresholds that can combine with another class
  AWAKEN_FROM: 100,          // thresholds from here can awaken a level-5 skill
  AWAKEN_COST: 5,            // skill points to awaken a level-5 skill
  TIERS: 9,
  // What one stat point buys (tune). Speed, Crit, Dodge and each resistance take 25 points at most.
  POINT: { hp: 10, mp: 5, pow: 1, def: 1, spd: 0.2, crit: 1, dodge: 1 },
  POINT_CAP: { spd: 25, crit: 25, dodge: 25 },
  RES_POINT: 1, RES_CAP: 25,
  RES_GROWTH: 0.1,           // every resistance grows this much per level
  RULE_SLOTS: 3,             // every character starts with 3 rule slots
  LESSONS: 2,                // the Masters' Hall teaches at most this many extra active slots (build step 5)
};
const STAT_KEYS = ['hp', 'mp', 'pow', 'def', 'spd', 'crit', 'dodge'];
const STAT_LABELS = { hp: 'Health', mp: 'Mana', pow: 'Power', def: 'Defense', spd: 'Speed', crit: 'Crit', dodge: 'Dodge' };

const Hero = (() => {
  const clone = x => JSON.parse(JSON.stringify(x));
  const zeroRes = () => Object.fromEntries(RES_KEYS.map(k => [k, 0]));
  const zeroAlloc = () => Object.assign(Object.fromEntries(STAT_KEYS.map(k => [k, 0])), { res: zeroRes() });

  // ── XP: the XP to go from level L to L + 1 (tune)
  const xpToNext = L => (L >= HERO.CAP ? Infinity : Math.round(30 * Math.pow(L, 1.6)));

  // ── a new character: level-1 stats rolled within the class's ranges
  function roll(cls, rng = Math.random) {
    const C = CLASSES[cls], out = {};
    for (const k of STAT_KEYS) {
      const [a, b] = C.stats[k];
      const v = a + (b - a) * rng();
      out[k] = k === 'spd' ? Math.round(v * 10) / 10 : Math.round(v);
    }
    return out;
  }
  function create(cls, id, o = {}) {
    const C = CLASSES[cls];
    const c = {
      id, cls, name: o.name || C.name, level: 1, xp: 0,
      base: o.base || roll(cls, o.rng), alloc: zeroAlloc(),
      classes: [cls], tiers: { [cls]: 1 }, skills: { [C.starter]: 1 }, awakened: [], awakenSlots: 0,
      equip: [C.starter], picks: {}, respecs: 0, lessons: { skill: 0, rule: 0 },
      fatigue: 0, gear: { weapon: o.bare ? null : Items.starter(cls, o.level || 1), armor: null, accessory: null }, rules: null, joined: o.joined || Date.now(),
    };
    if (o.level > 1) gainXp(c, xpBetween(1, o.level));
    return c;
  }
  const xpBetween = (a, b) => { let n = 0; for (let L = a; L < b; L++) n += xpToNext(L); return n; };

  // ── stats
  // Before passives: rolled stats, class growth and placed points.
  function stats(c) {
    const C = CLASSES[c.cls], L = c.level - 1, out = {};
    for (const k of STAT_KEYS) out[k] = c.base[k] + C.stats[k][2] * L + (c.alloc[k] || 0) * HERO.POINT[k];
    return out;
  }
  function res(c) {
    const C = CLASSES[c.cls], out = {};
    for (const k of RES_KEYS) out[k] = C.res[k] + HERO.RES_GROWTH * (c.level - 1) + (c.alloc.res[k] || 0) * HERO.RES_POINT;
    return out;
  }
  // With the plain stats of the gear they wear (js/items.js).
  function geared(c) {
    const s = stats(c), g = Items.gearStats(c);
    for (const k of STAT_KEYS) s[k] += g[k] || 0;
    return s;
  }
  // As the hero sheet shows them: with their gear and the stat changes of the passives they know (Thick Hide, Light
  // Feet...) and of the gear they wear (Witch-iron's −10% health...). row: the row they stand in, for those that care.
  function sheet(c, row = CLASSES[c.cls].row) {
    const s = geared(c), u = { maxHp: s.hp, maxMp: s.mp, pow: s.pow, def: s.def, spd: s.spd, crit: s.crit, dodge: s.dodge, row, res: res(c) };
    for (const id in c.skills) {
      const sk = SKILLS[id];
      if (sk && sk.stat && sk.kind !== 'active') sk.stat(u, skillLevel(c.skills[id], c.awakened.includes(id)));
    }
    for (const id of Items.effects(c)) if (GEAR[id].fx.stat) GEAR[id].fx.stat(u, skillLevel(1, false));
    if (u.noDodge) u.dodge = 0;
    return { hp: Math.round(u.maxHp), mp: u.maxMp, pow: u.pow, def: u.def, spd: u.spd, crit: u.crit, dodge: u.dodge, res: u.res };
  }

  // ── points
  const statSpent = c => STAT_KEYS.reduce((n, k) => n + (c.alloc[k] || 0), 0) + RES_KEYS.reduce((n, k) => n + (c.alloc.res[k] || 0), 0);
  const free = c => new Set(c.classes.map(k => CLASSES[k].starter));
  const skillSpent = c => Object.entries(c.skills).reduce((n, [id, L]) => n + L - (free(c).has(id) ? 1 : 0), 0) + c.awakened.length * HERO.AWAKEN_COST;
  const points = c => ({ stat: c.level - 1 - statSpent(c), skill: Math.floor(c.level / 5) - skillSpent(c) });
  const capOf = k => (k.startsWith('res:') ? HERO.RES_CAP : HERO.POINT_CAP[k] || Infinity);
  const placed = (c, k) => (k.startsWith('res:') ? c.alloc.res[k.slice(4)] || 0 : c.alloc[k] || 0);
  // Places n stat points in k: a stat, or 'res:stun' and the like. Returns how many it placed.
  function allocate(c, k, n = 1) {
    const room = Math.min(points(c).stat, capOf(k) - placed(c, k));
    const m = Math.max(0, Math.min(n, room));
    if (!m) return 0;
    if (k.startsWith('res:')) c.alloc.res[k.slice(4)] += m; else c.alloc[k] += m;
    return m;
  }

  // ── skills
  const owns = (c, id) => !!SKILLS[id] && c.classes.includes(SKILLS[id].cls);
  const tierOpen = (c, id) => owns(c, id) && SKILLS[id].tier <= (c.tiers[SKILLS[id].cls] || 0);
  const awakenOpen = c => c.awakenSlots - c.awakened.length;
  // Everything the skill tree shows about one skill.
  function skill(c, id) {
    const sk = SKILLS[id], L = c.skills[id] || 0, pts = points(c).skill;
    const st = { id, L, max: SKILL_LV_MAX, open: tierOpen(c, id), awakened: c.awakened.includes(id), starter: free(c).has(id) };
    st.canLearn = st.open && L < SKILL_LV_MAX && pts >= 1;
    st.canAwaken = st.open && L === SKILL_LV_MAX && !st.awakened && awakenOpen(c) > 0 && pts >= HERO.AWAKEN_COST;
    st.equipped = c.equip.includes(id);
    st.active = sk.kind === 'active';
    return st;
  }
  // Learns a skill, or raises it a level. Costs 1 skill point per level.
  function learn(c, id) {
    const st = skill(c, id);
    if (!st.canLearn) return false;
    c.skills[id] = st.L + 1;
    // A new active goes straight into a free slot.
    if (!st.L && st.active) { const i = c.equip.indexOf(null); if (i >= 0) c.equip[i] = id; else if (c.equip.length < activeSlots(c)) c.equip.push(id); }
    return true;
  }
  function awaken(c, id) {
    if (!skill(c, id).canAwaken) return false;
    c.awakened.push(id);
    return true;
  }

  // ── equipped skills: 1 active slot, +1 at 50 and +1 at 200, plus up to 2 from the Masters' Hall (step 5)
  const activeSlots = c => 1 + (c.level >= 50 ? 1 : 0) + (c.level >= 200 ? 1 : 0) + Math.min(HERO.LESSONS, c.lessons.skill || 0);
  // Rule slots: 3, plus Masters' Hall lessons, up to the class's maximum. A combined character uses the highest maximum
  // among their classes (decided overnight, review).
  const ruleMax = c => Math.max(...(c.classes && c.classes.length ? c.classes : [c.cls]).map(k => CLASSES[k].slots[1]));
  const ruleSlots = c => Math.min(ruleMax(c), HERO.RULE_SLOTS + (c.lessons.rule || 0));
  const actives = c => Object.keys(c.skills).filter(id => SKILLS[id] && SKILLS[id].kind === 'active');
  function fixEquip(c) {
    const n = activeSlots(c), have = new Set();
    c.equip = Array.from({ length: n }, (_, i) => {
      const id = c.equip[i];
      if (!id || !c.skills[id] || SKILLS[id].kind !== 'active' || have.has(id)) return null;
      have.add(id); return id;
    });
    return c.equip;
  }
  // Puts a learned active in a slot (or empties it with null). A skill already in another slot moves.
  function equip(c, slot, id) {
    fixEquip(c);
    if (slot < 0 || slot >= c.equip.length) return false;
    if (id != null && (!c.skills[id] || SKILLS[id].kind !== 'active')) return false;
    const was = c.equip.indexOf(id);
    if (id != null && was >= 0) c.equip[was] = c.equip[slot];
    c.equip[slot] = id;
    return true;
  }

  // ── thresholds: 30, 50, 80, 100, 120, 150, 180 and 200
  const pending = c => HERO.THRESHOLDS.filter(t => t <= c.level && !c.picks[t]);
  // The choices one threshold offers: the next tier of a tree, combining with another class, or an awakening.
  function options(c, t) {
    return {
      tier: c.classes.filter(k => (c.tiers[k] || 0) < HERO.TIERS),
      combine: HERO.COMBINE_AT.includes(t) && c.classes.length < 3 ? CLASS_ORDER.filter(k => !c.classes.includes(k)) : [],
      awaken: t >= HERO.AWAKEN_FROM,
    };
  }
  // choice: { kind: 'tier', cls } | { kind: 'combine', cls } | { kind: 'awaken' }. Every threshold also brings a free
  // respec, kept until it is used.
  function choose(c, t, choice) {
    if (!pending(c).includes(t)) return false;
    const o = options(c, t);
    if (choice.kind === 'tier' && o.tier.includes(choice.cls)) c.tiers[choice.cls]++;
    else if (choice.kind === 'combine' && o.combine.includes(choice.cls)) {
      c.classes.push(choice.cls);
      c.tiers[choice.cls] = 1;
      c.skills[CLASSES[choice.cls].starter] = Math.max(1, c.skills[CLASSES[choice.cls].starter] || 0);
    } else if (choice.kind === 'awaken' && o.awaken) c.awakenSlots++;
    else return false;
    c.picks[t] = { kind: choice.kind, cls: choice.cls || null };
    c.respecs++;
    return true;
  }
  // A respec refunds every stat and skill point. Opened tiers, combined classes and open awakenings stay.
  // useFree: spend one of the free respecs the thresholds gave (otherwise it is the Shrine's, which charges gold:
  // js/base.js, Base.respec).
  function respec(c, useFree) {
    if (useFree) { if (c.respecs <= 0) return false; c.respecs--; }
    c.alloc = zeroAlloc();
    const keep = {};
    for (const k of c.classes) keep[CLASSES[k].starter] = 1;
    c.skills = keep;
    c.awakened = [];
    c.equip = c.equip.map(id => (id && keep[id] ? id : null));
    if (!c.equip.some(Boolean)) c.equip[0] = CLASSES[c.cls].starter;
    fixEquip(c);
    return true;
  }

  // ── XP and levels. Returns what changed: { from, to, xp, skillPts, thresholds: [levels reached] }.
  function gainXp(c, amt) {
    const from = c.level, out = { from, to: from, xp: 0, skillPts: 0, thresholds: [], slots: 0 };
    if (c.level >= HERO.CAP) return out;
    c.xp += Math.max(0, Math.round(amt));
    out.xp = Math.round(amt);
    while (c.level < HERO.CAP && c.xp >= xpToNext(c.level)) {
      c.xp -= xpToNext(c.level);
      c.level++;
      if (c.level % 5 === 0) out.skillPts++;
      if (HERO.THRESHOLDS.includes(c.level)) out.thresholds.push(c.level);
      if (c.level === 50 || c.level === 200) out.slots++;
    }
    if (c.level >= HERO.CAP) c.xp = 0;
    out.to = c.level;
    fixEquip(c);
    return out;
  }

  // ── a ready-made build: points spent the way a sensible player might, for higher-level recruits (step 5) and the
  // balance test. Thresholds open the first class's tiers; skills follow the class's first path, then the others.
  const STAT_PLAN = { front: { pow: 4, hp: 4, def: 2 }, back: { pow: 5, hp: 3, mp: 2 } };
  // The class's stat points in the order the plan places them: front-row classes Power, Health and Defence; back-row
  // classes Power, Health and Mana.
  function statCycle(c) {
    const plan = STAT_PLAN[CLASSES[c.cls].row === 'front' ? 'front' : 'back'], cycle = [];
    for (const k in plan) for (let i = 0; i < plan[k]; i++) cycle.push(k);
    return cycle;
  }
  // The hero screen's Auto: where n more stat points would go, the way the class prefers, as { stat: count }. It
  // carries on the plan from the points already placed, so placing one a level comes out the same as placing them all.
  function autoPoints(c, n = points(c).stat) {
    const cycle = statCycle(c), out = {};
    let i = STAT_KEYS.reduce((m, k) => m + (c.alloc[k] || 0), 0);
    for (let left = n, guard = 0; left > 0 && guard < n * cycle.length + cycle.length; guard++, i++) {
      const k = cycle[i % cycle.length];
      if (placed(c, k) + (out[k] || 0) < capOf(k)) { out[k] = (out[k] || 0) + 1; left--; }
    }
    return out;
  }
  function autoBuild(c) {
    for (const t of pending(c)) { const o = options(c, t); choose(c, t, o.tier.length ? { kind: 'tier', cls: o.tier[0] } : { kind: 'awaken' }); }
    const C = CLASSES[c.cls], order = [C.second || C.tree[0][0], C.starter];
    for (let tier = 1; tier <= HERO.TIERS; tier++) for (const path of [0, 1, 2]) order.push(C.tree[path][tier - 1]);
    const want = [...new Set(order)];
    for (let goal = 1; goal <= SKILL_LV_MAX; goal++) for (const id of want) while ((c.skills[id] || 0) < goal && learn(c, id));
    for (const id of want) if (skill(c, id).canAwaken) awaken(c, id);
    const cycle = statCycle(c);
    for (let i = 0, left = points(c).stat; left > 0 && i < left * cycle.length + cycle.length; i++) if (allocate(c, cycle[i % cycle.length], 1)) left--;
    fixEquip(c);
    const acts = actives(c).sort((a, b) => (b === order[0]) - (a === order[0]) || (SKILLS[b].tier - SKILLS[a].tier));
    c.equip = c.equip.map((x, k) => (k === 0 ? C.starter : acts.find(id => id !== C.starter && !c.equip.slice(0, k).includes(id)) || null));
    fixEquip(c);
    return c;
  }

  // ── what the battle reads (js/sim.js). Hero.mods change it on the way: fatigue (js/rest.js) and the passive-bonus
  // buildings (js/base.js). Each is (c, spec) => void.
  const mods = [];
  function spec(c, rules) {
    const s = geared(c);
    const out = {
      key: c.cls, name: c.name, char: c.id, lv: c.level, stats: s, res: res(c),
      equip: fixEquip(c).filter(Boolean), sl: clone(c.skills), awk: c.awakened.slice(), rules: rules || CLASSES[c.cls].rules,
      gear: Items.effects(c), look: Items.look(c),
    };
    for (const m of mods) { try { m(c, out); } catch (e) { } }
    return out;
  }

  // ── from a save made before characters grew (version 1): the prototype's stats are the level-1 averages
  function upgrade(old) {
    const cls = CLASSES[old.cls] ? old.cls : 'sellsword';
    const base = {};
    for (const k of STAT_KEYS) base[k] = old.stats && Number.isFinite(old.stats[k]) ? old.stats[k] : CLASSES[cls][k];
    const c = create(cls, old.id, { name: old.name, base, joined: old.joined, bare: true });
    c.level = clamp(Math.round(old.level || 1), 1, HERO.CAP);
    c.xp = Math.max(0, old.xp || 0);
    c.fatigue = old.fatigue || 0;
    return c;
  }
  // Takes saved data and keeps only what still makes sense.
  function sanitize(d) {
    if (!d || typeof d !== 'object' || !CLASSES[d.cls] || typeof d.id !== 'string') return null;
    const c = create(d.cls, d.id, { base: d.base, name: d.name, joined: d.joined, bare: true });
    c.level = clamp(Math.round(d.level) || 1, 1, HERO.CAP);
    c.xp = Math.max(0, Number(d.xp) || 0);
    if (d.base && typeof d.base === 'object') for (const k of STAT_KEYS) if (Number.isFinite(d.base[k])) c.base[k] = d.base[k];
    if (Array.isArray(d.classes)) c.classes = [d.cls].concat(d.classes.filter(k => CLASSES[k] && k !== d.cls)).slice(0, 3);
    for (const k of c.classes) c.tiers[k] = clamp(Math.round((d.tiers || {})[k]) || 1, 1, HERO.TIERS);
    if (d.alloc) {
      for (const k of STAT_KEYS) c.alloc[k] = Math.max(0, Math.round(d.alloc[k]) || 0);
      for (const k of RES_KEYS) c.alloc.res[k] = Math.max(0, Math.round((d.alloc.res || {})[k]) || 0);
    }
    if (d.skills) for (const id in d.skills) if (owns(c, id) && SKILLS[id].tier <= c.tiers[SKILLS[id].cls]) c.skills[id] = clamp(Math.round(d.skills[id]) || 0, 0, SKILL_LV_MAX);
    for (const id in c.skills) if (!c.skills[id]) delete c.skills[id];
    for (const k of c.classes) c.skills[CLASSES[k].starter] = Math.max(1, c.skills[CLASSES[k].starter] || 0);
    c.awakenSlots = Math.max(0, Math.round(d.awakenSlots) || 0);
    c.awakened = (Array.isArray(d.awakened) ? d.awakened : []).filter(id => c.skills[id] === SKILL_LV_MAX).slice(0, c.awakenSlots);
    c.picks = {};
    if (d.picks) for (const t of HERO.THRESHOLDS) if (d.picks[t] && t <= c.level) c.picks[t] = { kind: d.picks[t].kind, cls: d.picks[t].cls || null };
    c.respecs = Math.max(0, Math.round(d.respecs) || 0);
    c.lessons = { skill: clamp(Math.round((d.lessons || {}).skill) || 0, 0, HERO.LESSONS), rule: Math.max(0, Math.round((d.lessons || {}).rule) || 0) };
    c.equip = Array.isArray(d.equip) ? d.equip.slice() : c.equip;
    fixEquip(c);
    // Over-spent (a bad save): give everything back.
    const p = points(c);
    if (p.stat < 0) c.alloc = zeroAlloc();
    if (p.skill < 0) { const keep = {}; for (const k of c.classes) keep[CLASSES[k].starter] = 1; c.skills = keep; c.awakened = []; fixEquip(c); }
    for (const k of ['fatigue', 'joined']) if (Number.isFinite(d[k])) c[k] = d[k];
    c.fatigue = clamp(c.fatigue || 0, 0, 100);
    if (d.spent === true && c.fatigue >= 50) c.spent = true;
    // Gear: only real pieces, each in its own slot and usable by this character.
    if (d.gear && typeof d.gear === 'object') for (const k of SLOTS) { const x = Items.valid(d.gear[k], k); c.gear[k] = x && Items.canUse(c, x) ? x : null; }
    if (d.rules !== undefined) c.rules = d.rules;
    return c;
  }

  return {
    xpToNext, xpBetween, roll, create, stats, res, sheet, points, allocate, placed, capOf, skill, learn, awaken, awakenOpen,
    activeSlots, ruleSlots, ruleMax, mods, actives, equip, fixEquip, pending, options, choose, respec, gainXp, spec, upgrade, sanitize, owns, autoBuild, autoPoints, geared,
  };
})();
