'use strict';
// Lantern Road · the battle simulation.
// A battle is a pure function of its setup and a seed. It returns an event log, which the battle screen animates.
// Skip, the headless balance test (tools/simtest.js) and, later, offline gains all run this same code.
// Nothing here touches the page.
//
// ── Passive hooks
// A learned passive (js/classes.js) may define any of these. u is its owner, p its level ({ L, A, v, n }), and c the
// moment: { sk, area, single, dot, counter, key, d, crit, redirect, before }.
//   stat(u, p)                   battle start: change u's stats (maxHp, def, spd, crit, dodge, res, noDodge, seeHidden)
//   start(E, u, p)               battle start: act (Beacon, Aegis of Faith, Ossuary)
//   turnStart / turnEnd (E,u,p)  the owner's turn begins / ends
//   out(E,u,t,p,c)  × damage u deals to t          taken(E,u,src,p,c)  × damage u takes
//   crit / critX / dodge         + crit chance, a crit multiplier, + dodge     sure(E,u,t,p,c)  u's attack can't miss t
//   hit(E,u,t,p,c)               u damaged t        hurt(E,u,src,p,c)  u was damaged      dodged(E,u,src,p)  u dodged
//   kill(E,u,t,p)                u felled t         applyOut(E,u,t,p,s) / helpOut  a harmful / helpful status u gives
//   landed(E,u,t,p,s)            u's harmful status landed     statusIn(E,u,src,p,s)  one is about to land on u (false
//                                blocks it)
//   healOut / healCrit / healed  u's healing       healCap(E,u,p)  the share of max health u can be healed to
//   cost(E,u,sk,p,c)             c.mul and c.add change u's costs      mpGain(E,u,sk,p)  + mana from a basic attack
//   basic(E,u,p)                 the id u's basic attack becomes       canUse(E,u,sk,p)  false forbids a skill
//   used(E,u,sk,p,c)             after u used a skill                  dot / dotOut / dotIn  damage over time
//   healIn(E,u,src,p)            × healing u receives                  stealMul(E,u,t,p)  × gold u steals
//   hook(E,u)                    true: u's melee skills work from the back row (Halberdier's Hook)
// Global hooks watch everyone (o is the owner): aIn, aOut, aDodge, aCost, aStat, aFall, aSave, aHurt, aStatus, aTurn,
// aMiss, aRes, aNoCrit, and aAim(E,o,u,p,plan): a unit o draws u's single-target attack to (the Moth-lure Lantern).
// Gear (js/items.js) works the same way: each worn item's effect joins its wearer's passives.

const SIM = {
  ROUND: 100,          // timeline units in one round: a Speed 10 character acts once per round
  ENRAGE_ROUND: 15,    // from this round on, foes are enraged (tune)
  ENRAGE_STEP: 0.25,   // each round of enrage adds this much to foe damage (tune)
  MAX_ACTIONS: 600,    // a safety stop; enrage should end every battle long before this
  DAZZLE_MISS: 0.4,    // Dazzled: 40% of attacks miss
  CRIT: 1.6,           // critical hit multiplier
  DEF_K: 20,           // Defense D cuts damage to K / (K + D), with K = 20 + the attacker's level
  QUEUE: 8,            // turns shown on the turn strip
  THRALLS: 2,          // thralls that can stand at once
  FIRE_BURN: 0.2,      // fire skills deal this much more to Burning foes (tune)
  POISON_GROW: 0.25,   // each Poisoned tick is this much stronger than the last
  STUN_RES: 'stun', MOVE_RES: 'move',
};
const AREA_SHAPES = ['front', 'back', 'random3', 'foes'];
const HOOKS_GLOBAL = ['aIn', 'aOut', 'aDodge', 'aCost', 'aStat', 'aFall', 'aSave', 'aHurt', 'aStatus', 'aTurn', 'aMiss', 'aRes', 'aNoCrit', 'aAim'];
const skillVal = (x, L) => (Array.isArray(x) ? x[0] + (x[1] - x[0]) * (clamp(L, 1, SKILL_LV_MAX) - 1) / (SKILL_LV_MAX - 1) : x);
// A skill's level: L (1–5) and A (awakened), with v(x) and n(x) to read a value at that level.
function skillLevel(L, A) {
  return { L, A: !!A, v: x => skillVal(x, L), n: x => Math.round(skillVal(x, L)) };
}
// The awakened form of a skill: its fields with the awakened ones laid over them.
const AWK_CACHE = {};
function awakened(id) {
  if (!AWK_CACHE[id]) { const s = SKILLS[id]; AWK_CACHE[id] = s.awk ? Object.assign({}, s, s.awk, { awk: s.awk }) : s; }
  return AWK_CACHE[id];
}
// Foe skills use the older short form (status, selfStatus, stagger); read them as the richer one.
for (const id in SKILLS) {
  const s = SKILLS[id];
  if (s.status && !s.st) s.st = [{ k: s.status.key, t: s.status.turns, p: s.status.power }];
  if (s.selfStatus && !s.self) s.self = [{ k: s.selfStatus.key, t: s.selfStatus.turns }];
  if (s.stagger && s.push == null) s.push = s.stagger;
}
// What the summons are (the Gravecaller's thralls).
const THRALLS = {
  thrall: { name: 'Bone Thrall', basic: 'thrallhit', art: 'bones' },
  ghoul: { name: 'Ghoul', basic: 'ghoulclaw', art: 'ghoul' },
  champion: { name: 'Bone Champion', basic: 'championcleave', art: 'gravewarden' },
  wall: { name: 'Bone Wall', basic: 'wallguard', art: 'bones' },
};

// setup: { seed, party: [6 slots], foes: [6 slots], level?, scale?: { hp, pow }, partyRules?: [rules],
//          loadout?: [item ids], inputs?: [{ at, slot, target }] }
// A party slot holds null, a class id, or a hero spec (js/hero.js, Hero.spec): { key, name, char, lv, stats, res,
// equip, sl, awk, rules, gear (worn item ids, js/items.js), look (how the sprite is drawn) }. A bare class id stands for a level-1 recruit with average stats and their starter skill.
// A foe slot holds a foe id or { key, rules?, over? }. level: the stage's level, which grows its foes (FOE_GROWTH).
// partyRules are the team-wide rules (PARTY_ACTIONS). loadout is the items the party brings, one use per slot.
// inputs are items the player used by hand: slot's item is used on target (a unit id, or none) just before turn
// number at (0 is the first turn). The battle screen adds one and simulates again; everything before it is unchanged.
function simulate(setup) {
  const rng = makeRng((setup.seed >>> 0) || 1);
  const units = [];
  const scale = setup.scale || {};
  const stageLv = Math.max(1, setup.level || 1);
  const G = {};                 // global hooks: name → [{ u, sk, p }]
  for (const k of HOOKS_GLOBAL) G[k] = [];
  let thrallN = 0, corpses = 0, actions = 0, clock = 0, round = 1, enrage = 0, actor = null;
  const loot = { gold: 0, xpBonus: 0 };
  const later = [];

  // ── units
  function heroBase(spec) {
    const C = CLASSES[spec.key];
    if (!C) throw new Error('Unknown class: ' + spec.key);
    if (spec.stats) return { C, st: spec.stats, res: spec.res || C.res, lv: spec.lv || 1, equip: spec.equip || [C.starter], sl: spec.sl || { [C.starter]: 1 }, awk: spec.awk || [] };
    const st = {};
    for (const k of ['hp', 'mp', 'pow', 'def', 'spd', 'crit', 'dodge']) st[k] = C[k];
    return { C, st, res: C.res, lv: 1, equip: (spec.equip || [C.starter]), sl: spec.sl || Object.fromEntries((spec.equip || [C.starter]).map(k => [k, 1])), awk: spec.awk || [] };
  }
  const make = (e, side, slot) => {
    const spec = typeof e === 'string' ? { key: e } : e;
    const u = { id: (side ? 'f' : 'p') + slot, side, slot, row: ROWS[slot], lane: LANE[slot], order: side * 6 + slot, key: spec.key, hero: !side, thrall: false, st: {}, once: {}, kills: 0, takenTotal: 0, lastTarget: null, hp: 0, mp: 0, alive: true };
    if (side === 0) {
      const b = heroBase(spec);
      Object.assign(u, {
        name: spec.name || b.C.name, char: spec.char || null, boss: false, elite: false, lv: b.lv,
        maxHp: b.st.hp, maxMp: b.st.mp, pow: b.st.pow, def: b.st.def, spd: b.st.spd, crit: b.st.crit, dodge: b.st.dodge,
        res: Object.assign({}, b.res), mpGain: b.C.mpGain, basic: b.C.basic, tags: [],
        sl: Object.assign({}, b.sl), awk: new Set(b.awk),
        rules: (spec.rules || b.C.rules || []).map(r => Object.assign({ on: true }, r)),
      });
      u.skills = b.equip.filter(id => SKILLS[id] && SKILLS[id].kind === 'active' && u.sl[id]);
      u.pas = Object.keys(u.sl).filter(id => SKILLS[id] && (SKILLS[id].kind === 'passive' || SKILLS[id].kind === 'key')).map(id => ({ sk: SKILLS[id], p: skillLevel(u.sl[id], u.awk.has(id)) }));
      // Worn gear: each item's effect works like a passive (js/items.js).
      for (const id of spec.gear || []) { const G = typeof GEAR !== 'undefined' && GEAR[id]; if (G && G.fx) u.pas.push({ sk: G.fx, p: skillLevel(1, false) }); }
      u.look = spec.look || null;
      u.land = spec.land || null; // landing chance added to the harmful effects it applies (the Hexing Stone, js/base.js)
    } else {
      const F = FOES[spec.key];
      if (!F) throw new Error('Unknown foe: ' + spec.key);
      const src = Object.assign({}, F, spec.over || {}), g = stageLv - 1;
      Object.assign(u, {
        name: spec.name || src.name, boss: !!src.boss, elite: !!src.elite, healer: !!src.healer, lv: stageLv,
        maxHp: Math.round(src.hp * (scale.hp || 1) * (1 + FOE_GROWTH.hp * g)), maxMp: src.mp, pow: src.pow * (scale.pow || 1) * (1 + FOE_GROWTH.pow * g),
        def: src.def * (1 + FOE_GROWTH.def * g), spd: src.spd, crit: src.crit, dodge: src.dodge, res: foeRes(src),
        mpGain: src.mpGain, basic: src.basic, skills: src.skills.slice(), tags: (src.tags || []).slice(), sl: {}, awk: new Set(), pas: [],
        rules: (spec.rules || src.rules || []).map(r => Object.assign({ on: true }, r)),
      });
    }
    units.push(u);
    return u;
  };
  (setup.party || []).forEach((e, i) => { if (e) make(e, 0, i); });
  (setup.foes || []).forEach((e, i) => { if (e) make(e, 1, i); });
  const byId = {};
  // Hooks: each unit's passives by hook name, and the global ones.
  function index(u) {
    u.h = {};
    for (const x of u.pas) for (const k in x.sk) {
      if (typeof x.sk[k] !== 'function' && !(k === 'keepKindle' || k === 'noLimit' || k === 'bound' || k === 'madness' || k === 'thrallCorpse')) continue;
      if (HOOKS_GLOBAL.includes(k)) G[k].push({ u, sk: x.sk, p: x.p });
      else (u.h[k] = u.h[k] || []).push(x);
    }
  }
  for (const u of units) {
    index(u);
    byId[u.id] = u;
  }
  for (const u of units) {
    for (const x of u.h.stat || []) x.sk.stat(u, x.p);
    for (const g of G.aStat) g.sk.aStat(g.u, u, g.p);
    if (u.noDodge) u.dodge = 0;
    u.maxHp = Math.max(1, Math.round(u.maxHp));
    u.base = { maxHp: u.maxHp };
    u.hp = u.maxHp; u.mp = Math.floor(u.maxMp / 2);
  }
  const partyRules = (setup.partyRules || []).map(r => Object.assign({ on: true }, r));
  const pack = (setup.loadout || []).map(id => ({ id, used: false, str: 1 })).filter(p => ITEMS[p.id]);
  const inputs = (setup.inputs || []).slice().sort((a, b) => a.at - b.at);

  const log = [];
  const emit = e => { log.push(e); return e; };
  const stats = {};
  const newStats = u => ({ dealt: 0, taken: 0, healed: 0, healedIn: 0, soaked: 0, dot: 0, crits: 0, best: null, kills: 0, falls: 0, koRounds: [], raised: 0, revives: 0, turns: 0, basic: 0, charged: 0, resisted: 0, rules: u.rules.map(() => 0) });
  for (const u of units) stats[u.id] = newStats(u);
  const party = { rules: partyRules.map(() => 0), used: {}, hand: 0 };

  // ── basics
  const hasSt = (u, k) => !!u.st[k];
  const effSpd = u => Math.max(1, u.spd * (1 + (u.st.hasted ? (u.st.hasted.v || 30) / 100 : 0)) * (1 - (u.st.slowed ? (u.st.slowed.v || 30) / 100 : 0)));
  const interval = u => 1000 / effSpd(u);
  const living = side => units.filter(u => u.alive && u.side === side);
  const heroesOf = side => units.filter(u => u.alive && u.side === side && !u.thrall);
  const fallen = side => units.filter(u => !u.alive && u.side === side && !u.thrall && !u.gone);
  const thrallsOf = side => units.filter(u => u.alive && u.side === side && u.thrall);
  const pct = u => u.hp / u.maxHp;
  const before = (a, at, b, bt) => at < bt - 1e-9 || (Math.abs(at - bt) <= 1e-9 && a.order < b.order);
  // the nearest by lane, then by slot
  const near = (u, list) => list.reduce((b, x) => {
    if (!b) return x;
    const dx = Math.abs(x.lane - u.lane), db = Math.abs(b.lane - u.lane);
    return dx < db || (dx === db && x.slot < b.slot) ? x : b;
  }, null);
  const lowest = list => list.reduce((b, x) => (!b || x.hp < b.hp ? x : b), null);
  const hurtest = list => list.reduce((b, x) => (x.hp < x.maxHp && (!b || pct(x) < pct(b)) ? x : b), null);
  const passive = (u, id) => { for (const x of u.pas) if (x.sk.id === id) return x.p; return null; };
  // Hooks take (E, owner, subject, p, context): see "Passive hooks" at the top.
  const fire = (u, k, a, c) => { const l = u.h[k]; if (l) for (const x of l) x.sk[k](E, u, a, x.p, c); };
  const fire0 = (u, k) => { const l = u.h[k]; if (l) for (const x of l) x.sk[k](E, u, x.p); };
  const mulHooks = (u, k, a, c) => { let m = 1; const l = u.h[k]; if (l) for (const x of l) m *= x.sk[k](E, u, a, x.p, c); return m; };
  const sumHooks = (u, k, a, c) => { let m = 0; const l = u.h[k]; if (l) for (const x of l) m += x.sk[k](E, u, a, x.p, c) || 0; return m; };
  const anyHook = (u, k, a, c) => { const l = u.h[k]; if (l) for (const x of l) if (x.sk[k](E, u, a, x.p, c)) return true; return false; };
  const anyHook0 = (u, k) => { const l = u.h[k]; if (l) for (const x of l) if (x.sk[k](E, u, x.p)) return true; return false; };
  const flagOf = (u, k) => !!(u.h[k] && u.h[k].length);
  const gmul = (k, a, b, c) => { let m = 1; for (const g of G[k]) m *= g.sk[k](E, g.u, a, b, g.p, c); return m; };

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
  const stSnap = s => { const o = { turns: s.turns }; if (s.dmg) o.dmg = s.dmg; if (s.v) o.v = s.v; if (s.n) o.n = s.n; if (s.list) o.n = s.list.length; return o; };
  const snap = u => ({
    id: u.id, side: u.side, slot: u.slot, key: u.key, name: u.name, boss: u.boss, elite: u.elite, thrall: u.thrall || undefined, art: u.art, look: u.look || undefined,
    hp: u.hp, maxHp: u.maxHp, mp: u.mp, maxMp: u.maxMp, alive: u.alive, lv: u.lv, char: u.char || undefined,
    pow: Math.round(u.pow), def: Math.round(u.def), spd: +u.spd.toFixed(2), crit: Math.round(u.crit), dodge: Math.round(u.dodge),
    basic: u.basic, skills: (u.skills || []).slice(), rules: u.rules.map(r => Object.assign({}, r)),
    st: Object.fromEntries(Object.entries(u.st).map(([k, s]) => [k, stSnap(s)])),
  });

  // ── statuses
  function resOf(t, kind) {
    let r = t.res[kind] || 0;
    const s = t.st.resup;
    if (s) { if (s.all) r += s.all; if (s.dot && (kind === 'bleed' || kind === 'blight' || kind === 'curse')) r += s.v || 0; else if (!s.dot && !s.all) r += s.v || 0; }
    for (const g of G.aRes) r += g.sk.aRes(E, g.u, t, kind, g.p) || 0;
    return r;
  }
  // Does a harmful effect of this kind land? chance + bonus − resistance, with no floor: 0% or less never lands.
  function lands(src, t, kind, chance = 100) {
    const c = chance + (src && src.land ? (src.land.all || 0) + (src.land[kind] || 0) : 0) - resOf(t, kind);
    if (c >= 100) return true;
    if (c <= 0) return false;
    return rng() * 100 < c;
  }
  function resisted(t, key) { stats[t.id].resisted++; emit({ t: 'resist', who: t.id, key }); }
  // Gives a status. o: { turns, v, p (tick strength × the giver's Power), dmg (a set tick), c (landing chance), sure (no
  // roll), raw (a copy: the giver's passives don't change it), time, until, left, n, and any flag the status reads }.
  function addStatus(src, t, key, o = {}) {
    const D = STATUSES[key];
    if (!D || !t || !t.alive) return false;
    const s = Object.assign({}, o, { key, src: src ? src.id : null, fresh: t === actor && !o.fresh });
    delete s.c; delete s.sure; delete s.raw; delete s.p;
    s.turns = o.turns != null ? o.turns : 1;
    if (o.v == null && D.v) s.v = D.v;
    if (o.dmg) s.dmg = Math.max(1, Math.round(o.dmg));
    else if (o.p && src) s.dmg = Math.max(1, Math.round(src.pow * o.p * (src.st.kindled ? 1 + (src.st.kindled.v || 30) / 100 : 1)));
    if (D.bad) {
      if (t.immuneTo && t.immuneTo.includes(key)) return false;
      const im = t.st.immune;
      if (im && src && src.side !== t.side && (!im.only || im.only.includes(key))) { resisted(t, key); return false; }
      if (t.st.steadfast && key === 'stunned') { resisted(t, key); return false; }
      if (t.st.steadfast && t.st.steadfast.more && (key === 'taunted' || key === 'confused')) { resisted(t, key); return false; }
      for (const x of t.h.statusIn || []) if (x.sk.statusIn(E, t, src, x.p, s) === false) { resisted(t, key); return false; }
      if (!o.sure && src && src.side !== t.side) for (const g of G.aStatus) if (g.sk.aStatus(E, g.u, t, src, g.p, s) === false) { resisted(t, key); return false; }
      if (!o.raw && src) fire(src, 'applyOut', t, s);
      if (!o.sure && D.res && src && !lands(src, t, D.res, o.c != null ? o.c : 100)) { resisted(t, key); return false; }
    } else if (src && !o.raw) fire(src, 'helpOut', t, s);
    const prev = t.st[key];
    if (D.stack || s.stack) {
      const cur = prev && prev.list ? prev : { key, src: s.src, list: [], turns: 0, fresh: s.fresh };
      cur.list.push({ dmg: s.dmg || 1, turns: s.turns, src: s.src, leech: !!s.leech, crit: s.crit });
      cur.turns = Math.max(...cur.list.map(x => x.turns));
      cur.dmg = cur.list.reduce((a, x) => a + x.dmg, 0);
      cur.stack = true;
      t.st[key] = cur;
    } else if (prev) {
      prev.turns = Math.max(prev.turns, s.turns);
      if (s.v != null) prev.v = Math.max(prev.v || 0, s.v);
      if (s.dmg) prev.dmg = Math.max(prev.dmg || 0, s.dmg);
      if (s.n) prev.n = Math.max(prev.n || 0, s.n);
      if (s.left) prev.left = Math.max(prev.left || 0, s.left);
      for (const k of ['more', 'mend', 'ember', 'burnHp', 'after', 'fixed', 'nocrit', 'grow', 'crit', 'only', 'all', 'dot', 'stun', 'leech']) if (s[k] != null && prev[k] == null) prev[k] = s[k];
      if (s.src && (s.dmg || s.v)) prev.src = s.src;
      if (s.until) prev.until = s.until;
    } else {
      s.full = s.turns;
      t.st[key] = s;
    }
    const cur = t.st[key];
    emit({ t: 'status', who: t.id, key, on: true, turns: cur.turns, dmg: cur.dmg, n: cur.list ? cur.list.length : cur.n, by: s.src });
    if (D.bad && src && !o.raw) fire(src, 'landed', t, s);
    return true;
  }
  function dropStatus(t, key) {
    const s = t.st[key];
    if (!s) return;
    delete t.st[key];
    emit({ t: 'status', who: t.id, key, on: false });
    if (key === 'kindled' && s.after && t.alive) addStatus(byId[s.src] || null, t, s.after, { turns: 1, sure: true });
  }
  function harmful(t, o = {}) {
    let n = 0;
    for (const k in t.st) if (isBad(k) && k !== 'charging') n += o.stacks && t.st[k].list ? t.st[k].list.length : 1;
    return n;
  }
  function cleanse(src, t, which) {
    if (!t.alive) return 0;
    let keys = Object.keys(t.st).filter(k => isBad(k) && k !== 'charging' && k !== 'marked' && !t.st[k].fixed);
    if (Array.isArray(which)) keys = keys.filter(k => which.includes(k));
    else if (typeof which === 'number') keys = keys.slice(0, which);
    for (const k of keys) dropStatus(t, k);
    if (keys.length) emit({ t: 'cleanse', who: t.id, n: keys.length });
    return keys.length;
  }
  const HELP_STRIP = ['kindled', 'hasted', 'warded', 'blessed', 'braced', 'fortified', 'veiled', 'hidden', 'parrying', 'riposte', 'retaliating', 'unbroken', 'hexward', 'bloodlust', 'steadfast', 'guarding', 'resup', 'laudanum'];
  function strip(src, t, n, to) {
    const out = [];
    for (const k of HELP_STRIP) {
      if (out.length >= n || !t.st[k]) continue;
      const s = t.st[k];
      out.push({ key: k, s });
      dropStatus(t, k);
      if (to && to.alive) addStatus(to, to, k, { turns: Math.max(1, s.turns || 1), v: s.v, n: s.n, raw: true });
    }
    if (out.length) emit({ t: 'strip', who: t.id, by: src ? src.id : null, n: out.length });
    return out;
  }

  // ── targeting
  const visible = (u, x) => !x.st.hidden || u.seeHidden || x.side === u.side;
  // Who a skill can reach, before any rule narrows it down.
  function poolFor(u, sk, p) {
    const foes = living(1 - u.side);
    const front = foes.filter(f => f.row === 'front'), back = foes.filter(f => f.row === 'back');
    const melee = sk.range === 'melee' && !sk.reach;
    let pool;
    switch (sk.shape) {
      case 'foe': { const seen = foes.filter(x => visible(u, x)), sf = seen.filter(x => x.row === 'front'); pool = melee && front.length ? sf : seen; break; }
      case 'front': pool = front.length ? front : back; break;
      case 'back': pool = back.length ? back : front; break;
      case 'random3': case 'foes': pool = melee && front.length ? front : foes; break;
      case 'ally': pool = sk.revive ? fallen(u.side) : heroesOf(u.side); if (sk.notSelf) pool = pool.filter(x => x !== u); break;
      case 'allies': pool = heroesOf(u.side); break;
      case 'fallen': pool = fallen(u.side); break;
      case 'self': pool = [u]; break;
      default: pool = [];
    }
    if (sk.pick) pool = pool.filter(x => sk.pick(E, u, x, p));
    return pool;
  }
  // With no rule to pick a target: the nearest foe, front row first; the most hurt ally; the first fallen ally.
  function defaultTarget(u, sk, pool) {
    if (!pool.length) return null;
    if (sk.shape === 'ally') return sk.revive ? pool[0] : pool.reduce((b, x) => (pct(x) < pct(b) ? x : b));
    for (const x of u.h.aim || []) { const t = x.sk.aim(E, u, pool, x.p); if (t) return t; }
    const front = pool.filter(f => f.row === 'front');
    return near(u, front.length ? front : pool);
  }
  // The battle as u sees it, for rule conditions (see CONDITIONS in js/data.js).
  function view(u) {
    const allies = heroesOf(u.side);
    return { u, foes: living(1 - u.side), allies, fallen: fallen(u.side), round, enrage, thralls: thrallsOf(u.side).length, leader: allies.reduce((b, x) => (!b || x.slot < b.slot ? x : b), null) };
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
  function resolve(u, sk, rule, p) {
    const pool = poolFor(u, sk, p);
    if (!pool.length) return null;
    let pick = true;
    if (rule) { pick = test(u, rule, sk, pool); if (!pick) return null; }
    switch (sk.shape) {
      case 'foe': case 'ally': { const t = pick !== true ? pick : defaultTarget(u, sk, pool); return t ? { targets: [t], picked: pick !== true, pool } : null; }
      case 'random3': return { targets: sample(pool, sk.n || 3), picked: false, pool };
      default: return { targets: pool, picked: false, pool };
    }
  }

  // ── skills: their level, cost and whether they can be used now
  // The skill a unit uses for an id, and its level. A foe's skills have no level.
  function skillFor(u, id) {
    const L = u.sl[id] || 1, A = u.awk.has(id);
    return { sk: A ? awakened(id) : SKILLS[id], p: skillLevel(L, A) };
  }
  // The basic attack, which some passives change (Blade-Hex, Vow of Peace, Crusader, Oath of the Shield).
  function basicFor(u) {
    for (const x of u.h.basic || []) {
      const id = x.sk.basic(E, u, x.p);
      if (id) return { sk: x.p.A ? awakened(id) : SKILLS[id], p: x.p, from: u.basic };
    }
    return { sk: SKILLS[u.basic], p: skillLevel(1, false) };
  }
  const backMelee = (u, sk) => u.hero && u.row === 'back' && sk.range === 'melee' && !sk.reach && !anyHook(u, 'hook');
  function costOf(u, sk, p) {
    let base = sk.cost || 0;
    if (sk.costLess) base -= p.n(sk.costLess);
    const c = { mul: 1, add: 0 };
    for (const x of u.h.cost || []) x.sk.cost(E, u, sk, x.p, c);
    for (const g of G.aCost) g.sk.aCost(E, g.u, u, sk, g.p, c);
    return Math.max(0, Math.round(base * c.mul + (base > 0 ? c.add : 0)));
  }
  function hpCostOf(u, sk) { return (sk.hpCost ? u.maxHp * sk.hpCost : 0) + (sk.hpCur ? u.hp * sk.hpCur : 0); }
  // What it would take: { mp, hp } or null if the unit can't pay.
  function priceOf(u, sk, p) {
    let mp = costOf(u, sk, p), hp = Math.round(hpCostOf(u, sk));
    if (sk.allMana) mp = Math.max(mp, u.mp);
    if (mp > u.mp) {
      const bp = u.h.bloodPrice && u.h.bloodPrice[0];
      if (!bp) return null;
      hp += Math.ceil((mp - u.mp) * bp.sk.bloodPrice(E, u, bp.p) * u.maxHp);
      mp = u.mp;
      if (hp >= u.hp) return null;
      return { mp, hp, blood: bp };
    }
    if (hp && hp >= u.hp) return null;
    return { mp, hp };
  }
  function usable(u, r) {
    if (!r.on || !SKILLS[r.do]) return null;
    if (r.do === u.basic) {
      const b = basicFor(u);
      return backMelee(u, b.sk) ? { sk: SKILLS.defend, p: skillLevel(1) } : b;
    }
    if (r.do === 'defend' && u.hero) return { sk: SKILLS.defend, p: skillLevel(1) };
    if (!u.skills.includes(r.do) || u.st.silenced) return null;
    const got = skillFor(u, r.do), sk = got.sk;
    if (backMelee(u, sk)) return null;
    for (const x of u.h.canUse || []) if (!x.sk.canUse(E, u, sk, x.p)) return null;
    if (sk.need && !sk.need(E, u, got.p)) return null;
    if (!priceOf(u, sk, got.p)) return null;
    return got;
  }
  // Read the rules from the top; the first that holds and is possible fires. Otherwise, the basic attack.
  // Heroes read the party's focus rules first: they can pick the foe.
  function choose(u) {
    const team = u.side === 0 && !u.thrall ? partyPlan(u) : {};
    let plan = null;
    for (let i = 0; i < u.rules.length && !plan; i++) {
      const r = u.rules[i], got = usable(u, r);
      if (!got) continue;
      const tg = resolve(u, got.sk, r, got.p);
      if (tg) plan = Object.assign(tg, got, { rule: i });
    }
    if (!plan) {
      let b = basicFor(u);
      if (backMelee(u, b.sk)) b = { sk: SKILLS.defend, p: skillLevel(1) };
      const tg = resolve(u, b.sk, null, b.p);
      plan = tg ? Object.assign(tg, b, { rule: -1 }) : { sk: SKILLS.wait, p: skillLevel(1), targets: [u], rule: -1 };
    }
    const single = plan.sk.shape === 'foe';
    // Confused: the attack picks a random target from everyone standing.
    if (single && u.st.confused) {
      const mad = units.some(x => x.alive && x.side !== u.side && x.h.madness);
      const pool = mad ? living(u.side).filter(x => x !== u) : units.filter(x => x.alive && x !== u);
      if (pool.length) { plan.targets = [pool[Math.floor(rng() * pool.length)]]; plan.confused = true; }
      dropStatus(u, 'confused');
      return plan;
    }
    // Taunted: single-target attacks must aim at the taunter, when they can reach them.
    const tt = u.st.taunted && byId[u.st.taunted.src];
    if (single && tt && tt.alive && plan.pool && plan.pool.includes(tt)) { plan.targets = [tt]; plan.taunted = true; return plan; }
    // Drawn: something on the other side pulls this attack to itself (the Moth-lure Lantern).
    if (single && plan.pool) for (const g of G.aAim) { const t = g.sk.aAim(E, g.u, u, g.p, plan); if (t && t !== plan.targets[0]) { plan.targets = [t]; plan.drawn = true; return plan; } }
    // Focus fire: a single-target attack whose rule didn't choose the foe goes at the party's focus.
    const f = team.focus;
    if (f && single && !plan.picked && plan.pool && plan.pool.includes(f.unit)) {
      plan.focus = f.prule;
      if (plan.targets[0] !== f.unit) plan.targets = [f.unit];
    }
    return plan;
  }
  // The party's focus rules, read from the top for the hero whose turn it is. Returns { focus: { unit, prule } }.
  const FOCUS = { shape: 'foe', reach: true };
  function partyPlan(u) {
    for (let i = 0; i < partyRules.length; i++) {
      const r = partyRules[i], A = PARTY_ACTIONS[r.do];
      if (!r.on || !A || A.kind !== 'focus') continue;
      const pick = test(u, r, FOCUS, living(1 - u.side).filter(x => visible(u, x)));
      if (pick && pick !== true) return { focus: { unit: pick, prule: i } };
    }
    return {};
  }

  // ── damage
  // Who really takes an attack aimed at t: a Covering Warden, a Last Bastion, a Guard (single-target only), or the
  // healthiest thrall under Bound in Bone.
  function redirect(t, src, c) {
    if (c.noGuard || c.counter || c.dot) return t;
    const cv = t.st.covered && byId[t.st.covered.src];
    if (cv && cv.alive && cv !== t && cv.side === t.side) return cv;
    const lb = units.find(g => g.alive && g.side === t.side && g !== t && g.st.bastion);
    if (lb) return lb;
    if (c.single && !t.st.guarding) { const g = units.find(x => x.alive && x.side === t.side && x !== t && x.st.guarding); if (g) return g; }
    if (t.h.bound) { const th = thrallsOf(t.side).reduce((b, x) => (!b || x.hp > b.hp ? x : b), null); if (th) return th; }
    return t;
  }
  function effPow(u) { return u.pow; }
  function effDef(t) { let d = t.def; if (t.st.corroded) d *= 1 - (t.st.corroded.v || 30) / 100; return Math.max(0, d); }
  function effDodge(t, src, c) {
    if (t.st.exposed || t.noDodge) return 0;
    const mg = t.st.mirror && byId[t.st.mirror.src];
    let d = mg && mg.alive ? mg.dodge + (mg.st.veiled ? mg.st.veiled.v || 20 : 0) + (t.st.mirror.v || 0) : t.dodge;
    if (t.st.veiled) d += t.st.veiled.v || 20;
    d += sumHooks(t, 'dodge', src, c);
    for (const g of G.aDodge) d += g.sk.aDodge(E, g.u, t, g.p) || 0;
    return d;
  }
  // Multipliers on damage src deals to t, and on damage t takes.
  function outMul(src, t, c) {
    let m = 1;
    if (!c.dot) {
      if (src.st.kindled) m *= 1 + (src.st.kindled.v || 30) / 100;
      if (src.st.bloodlust) m *= 1 + (src.st.bloodlust.v || 20) / 100;
      if (src.st.weak) m *= Math.max(0, 1 - (src.st.weak.v || 25) / 100);
      if (src.st.taunted && src.st.taunted.more) m *= 0.85;
      if (src.side === 1 && enrage) m *= 1 + enrage * SIM.ENRAGE_STEP;
      if (c.sk && FIRE.includes(c.sk.id) && t.st.burn) m *= 1 + SIM.FIRE_BURN;
      m *= mulHooks(src, 'out', t, c);
      m *= gmul('aOut', src, t, c);
    }
    return m;
  }
  function inMul(t, src, c) {
    let m = 1;
    if (t.st.exposed) m *= 1 + (t.st.exposed.v || 25) / 100;
    if (t.st.braced) m *= 1 - (t.st.braced.v || 30) / 100;
    if (t.st.fortified) m *= 1 - (t.st.fortified.v || 20) / 100;
    if (t.st.laudanum) m *= 1 - (t.st.laudanum.v || 10) / 100;
    if (t.st.steadfast && t.st.steadfast.v !== 0) m *= 0.9;
    if (t.st.unbroken && t.st.unbroken.more) m *= 0.8;
    if (!c.dot) {
      if (t.st.guarding) m *= 1 - (t.st.guarding.v || 30) / 100;
      if (t.st.riposte) m *= 0.8;
      if (t.st.bastion && c.redirect) m *= 1 - (t.st.bastion.v || 40) / 100;
      else if (c.covered) m *= 0.7;
    }
    m *= mulHooks(t, 'taken', src, c);
    m *= gmul('aIn', t, src, c);
    return Math.max(0, m);
  }
  // Takes damage off t, through Wards, Unyielding and Unbroken. Returns { d (health lost), absorbed }.
  function takeDamage(t, dmg, src, c) {
    let left = Math.max(0, Math.round(dmg)), absorbed = 0;
    if (t.st.unyielding) left = Math.min(left, Math.max(1, Math.round(t.maxHp * (t.st.unyielding.v || 10) / 100)));
    const w = t.st.warded;
    if (w && left > 0) {
      absorbed = Math.min(w.v || 0, left);
      w.v = (w.v || 0) - absorbed; left -= absorbed;
      if (w.v <= 0) {
        dropStatus(t, 'warded');
        if (w.mend) heal(byId[w.src], t, w.mend, { raw: true });
        if (w.ember && src && src.alive && src.side !== t.side) addStatus(byId[w.src] || null, src, 'burn', { turns: 2, p: 0.3 });
      }
    }
    if (t.st.unbroken) left = Math.min(left, Math.max(0, t.hp - 1));
    if (left >= t.hp && t.alive) {
      // Soul Anchor: a thrall falls instead.
      if (t.st.anchor) { const th = thrallsOf(t.side)[0]; if (th) { destroy(t, th); left = 0; } }
      if (left >= t.hp) for (const g of G.aSave) if (g.sk.aSave(E, g.u, t, src, g.p)) { left = 0; break; }
    }
    const d = Math.min(t.hp, left);
    t.hp -= d;
    t.takenTotal += d;
    stats[t.id].taken += d;
    if (src && src.side !== t.side) { stats[src.id].dealt += d; if (c.dot) stats[src.id].dot += d; }
    if (d > 0 && !c.dot) t.hitSince = true;
    return { d, absorbed };
  }
  // An attack: src hits aimed for power × src's Power. c: { sk, p, area, single, sure, crit, critX, pierce, noGuard,
  // counter, flat }. Returns { t (who really took it), d, crit, miss, killed }.
  function attack(src, aimed, power, c) {
    if (!aimed.alive || !src.alive) return { t: aimed, d: 0, miss: true };
    const t = redirect(aimed, src, c);
    c = Object.assign({}, c, { redirect: t !== aimed, covered: t !== aimed && aimed.st.covered && aimed.st.covered.src === t.id });
    const guard = t !== aimed ? aimed.id : undefined;
    const counterTag = c.counter ? true : undefined;
    const sure = c.sure || anyHook(src, 'sure', t, c);
    const missed = why => {
      emit({ t: 'miss', src: src.id, tgt: t.id, why, guard, counter: counterTag });
      if (why !== 'dazzled') fire(t, 'dodged', src, c);
      for (const g of G.aMiss) g.sk.aMiss(E, g.u, src, t, g.p, { why });
      if (!c.counter) react(src, aimed, t, c, why);
      return { t, d: 0, miss: true };
    };
    if (!c.dot && !c.counter && src.st.dazzled && !sure && rng() < SIM.DAZZLE_MISS) return missed('dazzled');
    if (c.single && t.st.parrying && !sure) {
      const pr = t.st.parrying;
      pr.n = (pr.n || 1) - 1;
      if (pr.n <= 0) dropStatus(t, 'parrying'); else emit({ t: 'status', who: t.id, key: 'parrying', on: true, turns: 1, n: pr.n });
      const res = missed('parry');
      if (pr.more && src.alive) counter(t, src, 0.5);
      return res;
    }
    if (!sure && rng() * 100 < effDodge(t, src, c)) return missed('dodge');
    // the hit
    const K = SIM.DEF_K + (src.lv || 1);
    const defCut = clamp(sumHooks(src, 'defCut', t, c), 0, 1);
    const def = c.pierce ? 0 : effDef(t) * (1 - defCut);
    let dmg = effPow(src) * power * K / (K + def) * outMul(src, t, c) * inMul(t, src, c);
    dmg *= 0.92 + rng() * 0.16;
    let critCh = (src.crit || 0) + (c.crit || 0) + sumHooks(src, 'crit', t, c);
    if (t.st.quarry) critCh += t.st.quarry.v || 20;
    let crit = rng() * 100 < critCh;
    if ((c.sk && c.sk.critIf && c.sk.critIf(E, src, t)) || anyHook(src, 'critAlways', t, c)) crit = true;
    if ((src.st.weak && src.st.weak.nocrit) || G.aNoCrit.some(g => g.sk.aNoCrit(E, g.u, src, g.p))) crit = false;
    if (crit) {
      let x = Math.max(SIM.CRIT, c.critX || 0);
      for (const h of src.h.critX || []) x = Math.max(x, h.sk.critX(E, src, t, h.p, c) || 0);
      dmg *= x;
    }
    dmg += c.flat || 0;
    for (const h of src.h.flat || []) dmg += h.sk.flat(E, src, t, h.p, c) || 0;
    // Untouchable: the blow that would knock the Duellist out misses.
    if (dmg >= t.hp + (t.st.warded ? t.st.warded.v || 0 : 0) && !t.st.unbroken && t.h.dodgeKill && t.h.dodgeKill.some(h => h.sk.dodgeKill(E, t, src, h.p))) return missed('dodge');
    const pre = pct(t);
    const { d, absorbed } = takeDamage(t, Math.max(1, dmg), src, c);
    if (guard) stats[t.id].soaked += d + absorbed;
    if (crit) stats[src.id].crits++;
    if (!c.counter && (!stats[src.id].best || d > stats[src.id].best.dmg)) stats[src.id].best = { dmg: d, tgt: t.name, skill: c.sk ? c.sk.id : src.basic, crit };
    emit({ t: 'hit', src: src.id, tgt: t.id, dmg: d, crit, hp: t.hp, guard, absorbed: absorbed || undefined, counter: counterTag });
    if (crit && t.st.quarry && t.st.quarry.more) mana(src, 5);
    const hc = Object.assign({}, c, { d, crit, before: pre });
    fire(src, 'hit', t, hc);
    fire(t, 'hurt', src, hc);
    for (const g of G.aHurt) g.sk.aHurt(E, g.u, t, src, g.p, hc);
    if (t.st.braced && t.st.braced.more && t.alive) mana(t, 10);
    if (!c.counter && t.alive) react(src, aimed, t, c, d > 0 || absorbed > 0 ? 'hit' : 'none');
    const killed = checkDeath(t, src);
    return { t, d, crit, killed };
  }
  // Reactions to an attack on t (aimed at `aimed`): counters, Retaliating, Hex Ward, thorns.
  function react(src, aimed, t, c, how) {
    if (!src.alive || src.side === t.side || c.dot) return;
    const hit = how === 'hit', dodge = how === 'dodge' || how === 'parry';
    if (hit && t.alive) {
      if (t.st.retaliating) { counter(t, src, t.st.retaliating.v || 0.6, { sure: true }); if (t.st.retaliating.more && src.alive) addStatus(t, src, 'weak', { turns: 1 }); }
      if (t.thorns) counter(t, src, t.thorns, { sure: true });
      if (t.st.hexward) { const hx = byId[t.st.hexward.src]; if (hx && src.alive) { addStatus(hx, src, 'doom', { turns: 2, p: 0.5 }); if (t.st.hexward.more) addStatus(hx, src, 'weak', { turns: 1 }); } }
    }
    if (!(c.single || (t.counterArea && c.area))) return;
    const best = new Map();
    const add = (u, m, o) => { if (u && u.alive && u !== src && u.side === t.side && m > (best.get(u) || [0])[0]) best.set(u, [m, o]); };
    if (t.st.riposte && (c.sk ? c.sk.range === 'melee' || t.st.riposte.more : true)) add(t, t.st.riposte.v || 0.6);
    if (dodge && t.st.perfect) add(t, t.st.perfect.v || 0.8, t.st.perfect.more ? { crit: 25 } : null);
    const bb = t.h.counterAll && t.h.counterAll[0];
    if (bb && t.alive) add(t, bb.sk.counterAll(E, t, bb.p));
    if (aimed.st.oath) add(byId[aimed.st.oath.src], aimed.st.oath.v || 0.6);
    for (const u of units) if (u.alive && u.side === t.side && u.st.counterstorm) add(u, u.st.counterstorm.v || 0.6);
    for (const [u, [m, o]] of best) if (src.alive) counter(u, src, m, o);
  }
  function counter(u, t, mult, o = {}) {
    if (!u.alive || !t.alive) return null;
    emit({ t: 'counter', who: u.id, tgt: t.id });
    return attack(u, t, mult, Object.assign({ counter: true, single: true, sk: SKILLS[u.basic] }, o));
  }
  // Damage that skips the attack roll: detonations, traps and a share of max health. o: { key, def, hit }.
  function pure(src, t, amt, o = {}) {
    if (!t.alive) return { d: 0, killed: false };
    let a = amt;
    if (o.def && src) { const K = SIM.DEF_K + (src.lv || 1); a *= K / (K + effDef(t)); }
    const c = { dot: !o.hit, key: o.key, sk: E.cur.sk };
    a *= inMul(t, src, c);
    const { d, absorbed } = takeDamage(t, Math.max(1, a), src, c);
    if (o.hit) emit({ t: 'hit', src: src ? src.id : t.id, tgt: t.id, dmg: d, crit: false, hp: t.hp, absorbed: absorbed || undefined });
    else emit({ t: 'tick', who: t.id, key: o.key || 'doom', dmg: d, hp: t.hp, burst: true });
    const killed = checkDeath(t, src);
    return { d, killed };
  }
  function checkDeath(t, src) {
    if (!t.alive || t.hp > 0) return false;
    for (const g of G.aFall) g.sk.aFall(E, g.u, t, src, g.p);
    t.alive = false; t.hp = 0; t.st = {};
    stats[t.id].falls++; stats[t.id].koRounds.push(round);
    if (src && src.side !== t.side) { stats[src.id].kills++; src.kills++; }
    emit({ t: 'die', who: t.id, by: src ? src.id : null });
    if (t.side === 1 || (t.thrall && units.some(x => x.alive && x.side === t.side && x.h.thrallCorpse))) corpses++;
    if (src && src.side !== t.side && src.alive) {
      fire(src, 'kill', t);
      if (src.st.bloodlust && src.st.bloodlust.more) src.st.bloodlust.turns++;
    }
    if (t.thrall) {
      if (t.burstOnFall) for (const f of living(1 - t.side)) pure(byId[t.owner] || t, f, (byId[t.owner] || t).pow * t.burstOnFall, { def: true, key: 'burst' });
      const ow = byId[t.owner], es = ow && ow.alive && passive(ow, 'eternalservitude');
      if (es && !t.rose) later.push(() => { if (!t.alive && units.filter(x => x.alive && x.slot === t.slot && x.side === t.side).length === 0) { t.rose = true; reviveUnit(ow, t, SKILLS.eternalservitude.rise(es)); } else t.gone = true; });
      else t.gone = true;
    }
    return true;
  }
  function reviveUnit(src, t, share) {
    if (t.alive) return false;
    if (units.some(x => x.alive && x !== t && x.side === t.side && x.slot === t.slot)) return false;
    t.alive = true; t.hp = Math.max(1, Math.round(t.maxHp * share)); t.st = {}; t.gone = false;
    t.next = clock + interval(t) * 0.5;
    stats[t.id].healedIn += t.hp; stats[t.id].raised++;
    if (src) { stats[src.id].revives++; stats[src.id].healed += t.hp; }
    emit({ t: 'revive', src: src ? src.id : null, tgt: t.id, hp: t.hp });
    return true;
  }
  function heal(src, t, amt, o = {}) {
    if (!t || !t.alive || !(amt > 0)) return 0;
    let a = amt;
    if (!o.raw && src) {
      a *= mulHooks(src, 'healOut', t, {});
      if (anyHook0(src, 'healCrit') && rng() * 100 < src.crit) a *= SIM.CRIT;
    }
    if (t.st.festering) a *= 0.5;
    a *= mulHooks(t, 'healIn', src, {});
    let cap = t.maxHp;
    for (const x of t.h.healCap || []) cap = Math.min(cap, Math.round(t.maxHp * x.sk.healCap(E, t, x.p)));
    a = Math.round(a);
    const got = clamp(cap - t.hp, 0, a);
    t.hp += got;
    if (src) stats[src.id].healed += got;
    stats[t.id].healedIn += got;
    emit({ t: 'heal', src: src ? src.id : null, tgt: t.id, amt: got, hp: t.hp });
    const over = a - got;
    if (over > 0 && o.over === 'ally') { const x = hurtest(heroesOf(t.side).filter(y => y !== t)); if (x) heal(src, x, over, { raw: true }); }
    if (over > 0 && o.over === 'ward') addStatus(src, t, 'warded', { turns: 3, v: over });
    if (!o.raw && src) fire(src, 'healed', t);
    return got;
  }
  function mana(t, amt) {
    if (!t || !t.alive || !t.maxMp || !amt) return 0;
    const got = clamp(Math.round(amt), -t.mp, t.maxMp - t.mp);
    if (!got) return 0;
    t.mp += got;
    emit({ t: 'mana', tgt: t.id, amt: got, mp: t.mp });
    return got;
  }
  // A health cost: Bloodlust, Blood Price, Eternal Flame. It never knocks the payer out.
  function selfCost(t, amt) {
    if (!t.alive) return 0;
    const d = clamp(Math.round(amt), 0, t.hp - 1);
    if (!d) return 0;
    t.hp -= d; t.takenTotal += d; stats[t.id].taken += d;
    emit({ t: 'tick', who: t.id, key: 'cost', dmg: d, hp: t.hp });
    return d;
  }

  // ── the timeline
  function push(src, t, frac) {
    if (!t.alive || frac <= 0) return false;
    if (t.st.steadfast || anyHook(t, 'noPush')) { resisted(t, 'push'); return false; }
    if (src && src.side !== t.side && !lands(src, t, SIM.MOVE_RES, 100)) { resisted(t, 'push'); return false; }
    let m = 1;
    if (src) for (const x of src.h.pushMul || []) m *= x.sk.pushMul(E, src, E.cur.sk || {}, x.p);
    t.next += interval(t) * frac * m;
    emit({ t: 'delay', who: t.id, queue: projectQueue() });
    if (src) fire(src, 'pushed', t);
    return true;
  }
  function sooner(t, frac) {
    if (!t.alive || frac <= 0) return;
    if (t === actor) { t.soon = Math.max(t.soon || 0, frac); return; }
    t.next = clock + Math.max(0, t.next - clock) * (1 - frac);
    emit({ t: 'quick', who: t.id, queue: projectQueue() });
  }
  let nowSeq = 0;
  function now(t) {
    if (!t.alive) return;
    if (t === actor) { t.extra = true; return; }
    t.next = clock - 1 + (++nowSeq % 1000) * 1e-4;
    emit({ t: 'quick', who: t.id, now: true, queue: projectQueue() });
  }
  function breakCharge(src, t) {
    if (!t.st.charging) return false;
    if (!lands(src, t, SIM.STUN_RES, 100)) { resisted(t, 'charging'); return false; }
    const mk = byId[t.st.charging.target];
    dropStatus(t, 'charging');
    if (mk) dropStatus(mk, 'marked');
    emit({ t: 'broke', who: t.id, by: src.id });
    return true;
  }
  function swap(a, b) {
    if (a.row !== b.row && [a, b].some(x => x.fixedFront && x.row === 'front')) return false; // the Oathbound Gorget
    [a.slot, b.slot] = [b.slot, a.slot];
    for (const x of [a, b]) { x.row = ROWS[x.slot]; x.lane = LANE[x.slot]; x.order = x.side * 6 + x.slot; }
    emit({ t: 'swap', a: a.id, b: b.id, slots: [a.slot, b.slot] });
  }
  function moveTo(t, slot) {
    t.slot = slot; t.row = ROWS[slot]; t.lane = LANE[slot]; t.order = t.side * 6 + slot;
    emit({ t: 'swap', a: t.id, b: null, slots: [slot] });
  }
  // Drag Out: a back-row foe trades places with the nearest front-row foe, or steps into an empty front slot.
  function drag(src, t) {
    if (t.row !== 'back' || t.st.steadfast) return false;
    if (!lands(src, t, SIM.MOVE_RES, 100)) { resisted(t, 'swap'); return false; }
    const front = living(t.side).filter(x => x.row === 'front');
    const f = near(t, front);
    if (f) { swap(t, f); return true; }
    const free = [0, 1].find(s => !units.some(x => x.alive && x.side === t.side && x.slot === s));
    if (free == null) return false;
    moveTo(t, free);
    return true;
  }

  // ── summons
  function emptySlots(side, frontOnly) {
    const taken = new Set(units.filter(x => x.alive && x.side === side).map(x => x.slot));
    for (const x of units) if (!x.alive && x.side === side && !x.thrall && !x.gone) taken.add(x.slot); // a fallen hero keeps their place
    return (frontOnly ? [0, 1] : [0, 1, 2, 3, 4, 5]).filter(s => !taken.has(s));
  }
  function room(u, past, front) {
    if (!emptySlots(u.side, front).length) return false;
    return past || flagOf(u, 'noLimit') || thrallsOf(u.side).length < SIM.THRALLS;
  }
  function summon(owner, kind, o) {
    if (!room(owner, o.past, o.front)) return null;
    const slot = emptySlots(owner.side, o.front)[0];
    const T = THRALLS[kind];
    const u = {
      id: owner.id + 't' + (++thrallN), side: owner.side, slot, row: ROWS[slot], lane: LANE[slot], order: owner.side * 6 + slot,
      key: kind, art: T.art, name: T.name, hero: false, thrall: true, owner: owner.id, boss: false, elite: false, lv: owner.lv,
      maxHp: owner.maxHp * o.hp, maxMp: 0, pow: owner.pow * (o.pow || 1), def: owner.def * (o.def || 1), spd: o.spd || 8,
      crit: 0, dodge: 0, res: Object.assign({}, owner.res), mpGain: 0, basic: T.basic, skills: [], tags: ['undead'],
      sl: {}, awk: new Set(), pas: [], h: {}, rules: [], st: {}, once: {}, kills: 0, takenTotal: 0, alive: true, mp: 0, burstOnFall: o.burst || 0,
    };
    for (const x of owner.h.thrall || []) x.sk.thrall(E, owner, u, x.p);
    u.maxHp = Math.max(1, Math.round(u.maxHp)); u.hp = u.maxHp; u.base = { maxHp: u.maxHp };
    u.next = clock + interval(u) * 0.6;
    units.push(u); byId[u.id] = u; stats[u.id] = newStats(u);
    emit({ t: 'summon', by: owner.id, unit: snap(u), queue: projectQueue() });
    if (u.fort) addStatus(owner, u, 'fortified', { turns: u.fort });
    return u;
  }
  function destroy(src, t) {
    if (!t.alive) return;
    t.hp = 0;
    emit({ t: 'tick', who: t.id, key: 'cost', dmg: 0, hp: 0 });
    checkDeath(t, null);
  }

  // ── the engine skills talk to
  const E = {
    rng, cur: { sk: null },
    foes: u => living(1 - u.side), heroes: u => heroesOf(u.side), fallen: u => fallen(u.side), thralls: u => thrallsOf(u.side),
    pct, near, lowest, hurtest, has: passive, pickOne: list => list[Math.floor(rng() * list.length)],
    reach: (u, sk) => poolFor(u, sk, skillFor(u, sk.id).p),
    status: (src, t, k, o) => addStatus(src, t, k, o), drop: dropStatus, cleanse, strip,
    bad: harmful, stacks: (t, k) => (t.st[k] && t.st[k].list ? t.st[k].list.length : t.st[k] ? 1 : 0),
    heal, mana, pure, selfCost, push, sooner, now, again: u => { u.extra = true; }, first: u => { u.next = 0; },
    revive: reviveUnit, summon, destroy, room, swap, drag, breakCharge, counter: (u, t, m, o) => counter(u, t, m, o),
    maxHp: (t, add) => { t.maxHp += add; emit({ t: 'maxhp', who: t.id, maxHp: t.maxHp, hp: t.hp }); },
    once: (u, k, max = 1) => { u.once[k] = (u.once[k] || 0) + 1; return u.once[k] <= max; },
    saved: (o, t, label) => emit({ t: 'saved', who: t.id, by: o.id, label }),
    covering: o => units.some(x => x.alive && x.st.covered && x.st.covered.src === o.id),
    taken: u => u.takenTotal,
    turns: u => (stats[u.id] ? stats[u.id].turns : 0),
    corpses: () => corpses, eat: u => { if (corpses > 0) { corpses--; emit({ t: 'corpse', n: corpses }); fire(u, 'eaten'); } },
    extend: (t, n) => { for (const k in t.st) { const s = t.st[k]; if (isBad(k) && STATUSES[k].time !== 'use' && s.turns < 90) { s.turns += n; if (s.list) s.list.forEach(x => { x.turns += n; }); } } },
    dotLeft: (t, k) => {
      const s = t.st[k];
      if (!s) return 0;
      if (s.list) return s.list.reduce((a, x) => a + x.dmg * Math.min(x.turns, 20), 0);
      if (k === 'poison') { let a = 0, d = s.dmg; for (let i = 0; i < Math.min(s.turns, 20); i++) { a += d; d *= 1 + (s.grow || SIM.POISON_GROW); } return a; }
      return s.dmg * Math.min(s.turns, 20);
    },
    spreadBurn: (src, t, n) => { const s = t.st.burn; if (!s) return; const others = living(t.side).filter(x => x !== t && !x.st.burn).sort((a, b) => Math.abs(a.lane - t.lane) - Math.abs(b.lane - t.lane)).slice(0, n); for (const x of others) addStatus(src, x, 'burn', { turns: Math.max(1, s.turns), dmg: s.list ? s.list[0].dmg : s.dmg, raw: true }); },
    pass: (u, from, to) => { for (const k of Object.keys(from.st)) { if (!isBad(k) || k === 'charging' || k === 'marked') continue; const s = from.st[k]; dropStatus(from, k); addStatus(u, to, k, { turns: Math.max(1, s.turns), dmg: s.dmg, v: s.v, raw: true }); } },
    steal: (u, t, base, mul = 1, onePer) => { if (onePer) { if (t.stolen) return 0; t.stolen = true; } const g = Math.round(base * (1 + 0.15 * (stageLv - 1)) * mul * mulHooks(u, 'stealMul', t, {})); loot.gold += g; emit({ t: 'steal', who: u.id, from: t.id, gold: g }); return g; },
    bonusXp: (t, frac) => { loot.xpBonus += foeXp(t) * frac; },
    brew: u => { const x = passive(u, 'unstablebrews'); return x ? SKILLS.unstablebrews.brewMul(x) : 1; },
    brewSide: (u, t) => { const x = passive(u, 'unstablebrews'); if (x && !x.A && rng() < 0.2) addStatus(u, t, 'poison', { turns: 2, p: 0.2, sure: true }); },
    refill: (n, str) => { let k = 0; for (const p of pack) if (p.used && k < n) { p.used = false; p.str = str; k++; emit({ t: 'refill', slot: pack.indexOf(p), item: p.id }); } },
    chimeExtras: (u, ts, chime) => {
      const sy = passive(u, 'sympatheticchime');
      if (sy) { let n = SKILLS.sympatheticchime.sympathy(sy); for (const t of ts) if (n > 0 && t.alive && cleanse(u, t, 1)) n--; }
      const cw = chime && passive(u, 'chimeofwarding');
      if (cw) for (const t of ts) if (t.alive) addStatus(u, t, 'warded', { turns: 3, v: u.pow * SKILLS.chimeofwarding.chimeWard(cw) });
    },
    cureCost: (u, p) => selfCost(u, u.maxHp * SKILLS.cureall.cure(p)),
    borrowed: (u, t) => { const b = passive(u, 'borrowedtime'); if (b) { const k = SKILLS.borrowedtime.borrow(b); if (k) selfCost(t, t.maxHp * k); } },
    later: fn => later.push(fn),
    // One more use of the current skill on one target (Finishing Blow striking again).
    useOn: (u, id, t, p) => hitTarget(u, skillFor(u, id).sk, t, p, {}),
    // One hit of the skill being used, on t. o: { mult, power, push }.
    strike: (u, t, p, o = {}) => hitTarget(u, E.cur.sk, t, p, Object.assign({ hits: 1 }, o)),
  };

  // ── using a skill
  function ctxOf(u, sk, p, o = {}) {
    const single = sk.shape === 'foe';
    const c = { sk, p, single, area: AREA_SHAPES.includes(sk.shape), sure: !!sk.sure, crit: sk.crit || 0, critX: sk.critX || 0, pierce: !!sk.pierce, noGuard: !!sk.noGuard };
    for (const x of u.h.noGuard || []) if (x.sk.noGuard(E, u, x.p, c)) c.noGuard = true;
    if (sk.flatAdd) c.flat = sk.flatAdd(E, u);
    return Object.assign(c, o.ctx || {});
  }
  // A skill's effect on one aimed target: its hits and what they carry. Returns { t, landed, killed, d }.
  function hitTarget(u, sk, aimed, p, o = {}) {
    const out = { t: aimed, landed: false, killed: false, d: 0 };
    if (!aimed || !aimed.alive || !u.alive) return out;
    const power = o.power != null ? o.power : p.v(sk.power || 0);
    if (!power) {
      // a skill with no damage: its statuses and push land with no attack roll
      for (const s of sk.st || []) addStatus(u, aimed, s.k, statusOpts(s, p));
      const pu = o.push != null ? o.push : sk.push ? p.v(sk.push) : 0;
      if (pu) push(u, aimed, pu);
      out.landed = true;
      return out;
    }
    const hits = o.hits || (sk.hitsOf ? sk.hitsOf(E, u) : sk.hits || 1);
    const mult = (o.mult || 1) * (sk.mult ? sk.mult(E, u, aimed, p) : 1) * (o.vmul || 1);
    const c = ctxOf(u, sk, p, o);
    for (let i = 0; i < hits; i++) {
      if (!aimed.alive || !u.alive) break;
      const r = attack(u, aimed, power * mult, c);
      out.t = r.t;
      if (r.miss) continue;
      out.landed = true; out.d += r.d;
      if (r.killed) {
        out.killed = true;
        if (sk.kill) sk.kill(E, u, r.t, p);
        break;
      }
      if (r.t.alive) for (const s of sk.st || []) addStatus(u, r.t, s.k, statusOpts(s, p));
    }
    const pu = o.push != null ? o.push : sk.push ? p.v(sk.push) : 0;
    if (out.landed && pu && out.t.alive) push(u, out.t, pu);
    return out;
  }
  function statusOpts(s, p) {
    const o = Object.assign({}, s);
    delete o.k; delete o.t;
    o.turns = p.n(s.t != null ? s.t : 1);
    if (s.v != null) o.v = p.v(s.v);
    if (s.p != null) o.p = p.v(s.p);
    if (s.n != null) o.n = p.n(s.n);
    if (s.c != null) o.c = p.v(s.c);
    return o;
  }
  // The generic skill: hits, heals, mana, statuses, revives, cleansing and pushes, on every target.
  function generic(u, sk, targets, p) {
    const res = [];
    const sv = u.h.volleys && u.h.volleys.map(x => x.sk.volleys(sk, x.p)).find(Boolean);
    const vol = sv || (sk.baseVolleys ? [sk.baseVolleys, 1] : [1, 1]);
    for (let v = 0; v < vol[0]; v++) {
      for (const aimed of targets) {
        if (sk.power) { res.push(hitTarget(u, sk, aimed, p, { vmul: vol[1] })); continue; }
        const t = aimed;
        const r = { t, landed: true, killed: false, d: 0 };
        if (sk.revive) { reviveUnit(u, t, p.v(sk.revive)); res.push(r); continue; }
        if (!t.alive) continue;
        if (t.side !== u.side) { res.push(hitTarget(u, sk, t, p)); continue; }
        if (sk.cleanse) cleanse(u, t, sk.cleanse);
        if (sk.heal || sk.healPct) heal(u, t, (u.pow * p.v(sk.heal || 0) + t.maxHp * p.v(sk.healPct || 0)) * (sk.mult ? sk.mult(E, u, t, p) : 1));
        if (sk.mana && t !== u) mana(t, p.n(sk.mana)); else if (sk.mana && sk.shape === 'allies') mana(t, p.n(sk.mana));
        for (const s of sk.st || []) addStatus(u, t, s.k, statusOpts(s, p));
        if (sk.sooner && t !== u) sooner(t, p.v(sk.sooner));
        res.push(r);
      }
    }
    if (sk.strip) for (const t of targets) if (t.alive && t.side !== u.side) strip(u, t, sk.strip === true ? 99 : sk.strip);
    return res;
  }

  // ── items: the party's, used between turns by hand (inputs) or by an item rule, taking no one's turn
  const leader = () => heroesOf(0).reduce((b, x) => (!b || x.slot < b.slot ? x : b), null);
  const chemist = () => { let m = 1; for (const u of heroesOf(0)) { const p = passive(u, 'fieldchemist'); if (p) m = Math.max(m, SKILLS.fieldchemist.itemMul(p)); } return m; };
  // Uses the item in a slot. target: a unit id the player chose, or a unit an item rule picked. If it no longer fits
  // (the ally fell, say), the item finds its own target; with none at all, it isn't used.
  function useItem(slot, target, by, prule) {
    const p = pack[slot], lead = leader();
    if (!p || p.used || !lead) return false;
    const sk = SKILLS[ITEMS[p.id].skill], pool = poolFor(lead, sk, skillLevel(1));
    if (!pool.length) return false;
    const want = typeof target === 'string' ? byId[target] : target;
    let targets;
    if (sk.shape === 'ally') targets = [want && pool.includes(want) ? want : defaultTarget(lead, sk, pool)];
    else targets = pool;
    p.used = true;
    party.used[p.id] = (party.used[p.id] || 0) + 1;
    if (by === 'hand') party.hand++; else party.rules[prule]++;
    const ev = { t: 'item', slot, item: p.id, by, targets: targets.map(x => x.id) };
    if (by === 'rule') ev.prule = prule;
    emit(ev);
    const k = chemist() * (p.str || 1);
    for (const x of targets) {
      if (sk.revive) {
        if (x.alive) continue;
        let bonus = 0, clean = false;
        for (const u of heroesOf(0)) { const r = passive(u, 'reviver'); if (r) { bonus = Math.max(bonus, SKILLS.reviver.salts(r)); clean = clean || r.A; } }
        reviveUnit(null, x, Math.min(1, (sk.revive + bonus) * k));
        continue;
      }
      if (!x.alive) continue;
      if (sk.healPct || sk.heal) heal(null, x, x.maxHp * (sk.healPct || 0) * k, { raw: true });
      if (sk.mana) mana(x, Math.round(sk.mana * k));
      if (sk.cleanse) cleanse(null, x, sk.cleanse);
    }
    // Spare Vials: the first used slot fills again.
    for (const u of heroesOf(0)) {
      const sv = passive(u, 'sparevials');
      if (sv) { const [n, str] = SKILLS.sparevials.spare(sv); if (E.once(u, 'sparevials', n)) { p.used = false; p.str = str; emit({ t: 'refill', slot, item: p.id }); } break; }
    }
    return true;
  }
  // Between turns: the player's items first, then the first item rule that holds (one item at a time).
  function betweenTurns() {
    while (inputs.length && inputs[0].at <= actions) { const x = inputs.shift(); useItem(x.slot, x.target, 'hand'); }
    const lead = leader();
    if (!lead) return;
    for (let i = 0; i < partyRules.length; i++) {
      const r = partyRules[i], A = PARTY_ACTIONS[r.do];
      if (!r.on || !A || A.kind !== 'item') continue;
      const slot = pack.findIndex(p => p.id === A.item && !p.used);
      if (slot < 0) continue;
      const sk = SKILLS[ITEMS[A.item].skill], pool = poolFor(lead, sk, skillLevel(1));
      if (!pool.length) continue;
      const pick = test(lead, r, sk, pool);
      if (!pick) continue;
      useItem(slot, pick === true ? null : pick, 'rule', i);
      return;
    }
  }

  // ── a turn
  function perform(u, plan) {
    const { sk, targets, rule } = plan, st = stats[u.id];
    const p = Object.assign({}, plan.p);
    if (rule >= 0) st.rules[rule]++;
    else if (rule === -2) st.charged++;
    else if (sk.basic) st.basic++;
    if (plan.focus != null) party.rules[plan.focus]++;
    if (sk.shape === 'foe' && targets[0] && targets[0].side !== u.side) u.lastTarget = targets[0];
    // the price
    if (rule !== -2) {
      const price = priceOf(u, sk, p) || { mp: 0, hp: 0 };
      if (u.evil && sk.cost && targets[0] && targets[0].id === u.evil) { price.mp = 0; u.evil = null; }
      p.paid = price.mp; u.mp -= price.mp;
      if (price.hp) { p.paidHp = selfCost(u, price.hp); if (price.blood && price.blood.p.A) addStatus(u, u, 'kindled', { turns: 1 }); }
    }
    if (sk.basic) u.mp = Math.min(u.maxMp, u.mp + u.mpGain + sumHooks(u, 'mpGain', sk));
    // rule: the rule that chose this (-1 none, -2 a charged attack landing). focus: the party rule that aimed it.
    const ev = { t: 'act', who: u.id, skill: sk.id, rule, targets: targets.map(x => x.id), mp: u.mp };
    if (plan.focus != null) ev.focus = plan.focus;
    if (plan.confused) ev.confused = true;
    if (plan.taunted) ev.taunted = true;
    if (plan.from) ev.as = plan.from;
    emit(ev);
    E.cur.sk = sk;

    if (sk.charge) {
      const tgt = targets[0];
      u.st.charging = { key: 'charging', turns: 1, skill: sk.charge, target: tgt.id, fresh: true, p, A: p.A };
      emit({ t: 'status', who: u.id, key: 'charging', on: true, turns: 1, target: tgt.id, skill: sk.charge });
      addStatus(u, tgt, 'marked', { turns: 1, sure: true });
      return;
    }
    const wasHidden = !!u.st.hidden;
    let res;
    if (sk.run) { sk.run(E, u, targets, p); res = []; }
    else res = generic(u, sk, targets, p);
    if (sk.then) sk.then(E, u, res, p);
    for (const s of sk.self || []) addStatus(u, u, s.k, statusOpts(s, p));
    if (sk.selfDestruct && u.alive) { u.hp = 0; checkDeath(u, null); }
    // Attacking ends Hidden, unless the skill keeps it.
    const offensive = sk.power || (sk.shape === 'foe' || AREA_SHAPES.includes(sk.shape));
    if (wasHidden && offensive && u.st.hidden && !sk.keepHidden && !anyHook(u, 'keep', sk)) dropStatus(u, 'hidden');
    if (sk.after) sk.after(E, u, p);
    if (u.hideAfter) { u.hideAfter = 0; addStatus(u, u, 'hidden', { turns: 1 }); }
    fire(u, 'used', sk, { targets });
  }

  // Damage and healing over time, at the start of the owner's turn.
  function tick(u, k) {
    const s = u.st[k];
    if (!s) return;
    const parts = s.list ? s.list.map(x => ({ dmg: x.dmg, src: x.src, leech: x.leech, crit: x.crit })) : [{ dmg: s.dmg || 1, src: s.src, crit: s.crit }];
    let total = 0;
    const bySrc = new Map();
    for (const x of parts) {
      const src = byId[x.src];
      let d = x.dmg;
      if (src) d *= mulHooks(src, 'dotOut', u, { key: k });
      for (const h of u.h.dotIn || []) d *= h.sk.dotIn(E, u, h.p, { key: k });
      if (x.crit && rng() * 100 < x.crit) d *= SIM.CRIT;
      total += d;
      if (src) bySrc.set(src, (bySrc.get(src) || 0) + d);
      if (x.leech && src && src.alive) { const a = hurtest(heroesOf(src.side)); if (a) later.push(() => heal(src, a, d, { raw: true })); }
    }
    const src0 = byId[s.src] || (parts[0] && byId[parts[0].src]) || null;
    const c = { dot: true, key: k };
    const { d, absorbed } = takeDamage(u, total * inMul(u, src0, c), src0, c);
    emit({ t: 'tick', who: u.id, key: k, dmg: d, hp: u.hp, absorbed: absorbed || undefined, n: parts.length > 1 ? parts.length : undefined });
    for (const [src, part] of bySrc) if (total > 0) fire(src, 'dot', u, { key: k, d: d * part / total });
    if (checkDeath(u, src0)) return true;
    if (k === 'poison' && u.st.poison) s.dmg = Math.round(s.dmg * (1 + (s.grow || SIM.POISON_GROW)));
    // count down
    if (s.list) { s.list.forEach(x => { x.turns--; }); s.list = s.list.filter(x => x.turns > 0); if (!s.list.length) dropStatus(u, k); else { s.turns = Math.max(...s.list.map(x => x.turns)); s.dmg = s.list.reduce((a, x) => a + x.dmg, 0); } }
    else if (--s.turns <= 0) dropStatus(u, k);
    return false;
  }
  function takeTurn(u) {
    actor = u;
    stats[u.id].turns++;
    emit({ t: 'turn', who: u.id, round, k: actions, queue: projectQueue() });
    for (const g of G.aTurn) g.sk.aTurn(E, g.u, u, g.p);
    // statuses that last "until" this unit's next turn, on anyone
    for (const x of units) for (const k of Object.keys(x.st)) { const s = x.st[k]; if (s.until === u.id) { if ((s.left || 1) <= 1) dropStatus(x, k); else s.left--; } }
    // statuses that end when the owner's next turn starts
    for (const k of Object.keys(u.st)) {
      const s = u.st[k];
      if ((STATUSES[k].time === 'start' || s.time === 'start') && !s.until) { if ((s.left || 1) <= 1) dropStatus(u, k); else s.left--; }
    }
    // Curses, fire, poison and bleeding bite at the start of the turn; blessings heal.
    for (const k of ['bleed', 'doom', 'burn', 'poison']) if (tick(u, k) || !u.alive) return endTurn(u);
    if (u.st.blessed) { const b = u.st.blessed; heal(byId[b.src] || null, u, b.dmg || 1, { raw: true }); if (--b.turns <= 0) dropStatus(u, 'blessed'); }
    if (u.st.kindled && u.st.kindled.burnHp) selfCost(u, u.maxHp * u.st.kindled.burnHp);
    const trap = u.st.trap;
    if (trap) {
      const tr = byId[trap.src];
      dropStatus(u, 'trap');
      emit({ t: 'sprung', who: u.id });
      pure(tr || null, u, trap.v || 1, { def: true, hit: true });
      if (u.alive && tr) { addStatus(tr, u, 'bleed', { turns: 3, p: 0.35 }); addStatus(tr, u, 'slowed', { turns: 2 }); if (trap.stun) addStatus(tr, u, 'stunned', { turns: 1 }); }
      if (!u.alive) return endTurn(u);
    }
    fire0(u, 'turnStart');
    if (!u.alive) return endTurn(u);
    // Stunned: the turn is lost. A charge it is gathering waits.
    if (u.st.stunned) {
      const s = u.st.stunned;
      s.n = (s.n || 1) - 1;
      if (s.n <= 0) dropStatus(u, 'stunned');
      emit({ t: 'skip', who: u.id, why: 'stunned' });
      return endTurn(u, true);
    }
    let plan;
    const c = u.st.charging;
    if (c) {
      // The charged attack lands now, on its marked victim if they still stand.
      dropStatus(u, 'charging');
      const base = SKILLS[c.skill], sk = c.A && base.awk ? awakened(c.skill) : base;
      let tgt = byId[c.target];
      if (tgt) dropStatus(tgt, 'marked');
      if (!tgt || !tgt.alive) tgt = defaultTarget(u, sk, poolFor(u, sk, c.p || skillLevel(1)));
      if (tgt && tgt.st.hidden && tgt.side !== u.side) { emit({ t: 'act', who: u.id, skill: sk.id, rule: -2, targets: [tgt.id], mp: u.mp }); emit({ t: 'miss', src: u.id, tgt: tgt.id, why: 'hidden' }); stats[u.id].charged++; return endTurn(u); }
      plan = tgt ? { sk, p: c.p || skillLevel(1), targets: [tgt], rule: -2 } : { sk: SKILLS.wait, p: skillLevel(1), targets: [u], rule: -1 };
    } else plan = choose(u);
    perform(u, plan);
    endTurn(u);
  }
  function endTurn(u, skipped) {
    while (later.length) later.shift()();
    if (u.alive) {
      fire0(u, 'turnEnd');
      const keepKindle = units.some(x => x.alive && x.side === u.side && x.h.keepKindle);
      for (const k of Object.keys(u.st)) {
        const s = u.st[k], D = STATUSES[k];
        if (!s || D.time === 'tick' || D.time === 'start' || D.time === 'use' || s.time === 'start' || s.until) continue;
        if (s.fresh) { s.fresh = false; continue; }
        if (k === 'kindled' && keepKindle) continue;
        if (--s.turns <= 0) dropStatus(u, k);
      }
      u.hitSince = false;
      u.next = u.extra && (u.extraN || 0) < 3 ? clock - 1e-4 : clock + interval(u) * (1 - Math.min(0.9, u.soon || 0));
      u.extraN = u.extra ? (u.extraN || 0) + 1 : 0;
      u.extra = false; u.soon = 0;
    }
    actor = null;
    return skipped;
  }

  // ── the battle
  emit({ t: 'start', units: units.map(snap), queue: projectQueue(), partyRules: partyRules.map(r => Object.assign({}, r)), loadout: pack.map(p => p.id), level: stageLv });
  // battle-start passives (Beacon, Aegis of Faith, Ossuary, Unseen, Wildfire)
  for (const u of units.slice()) { actor = null; fire0(u, 'start'); }
  while (later.length) later.shift()();
  let winner = -1, stalled = false;
  const partyDown = () => heroesOf(0).length === 0;
  while (winner < 0) {
    const u = nextActor();
    if (!u) { winner = partyDown() ? 1 : 0; break; }
    clock = Math.max(clock, u.next);
    const r = Math.floor(clock / SIM.ROUND) + 1;
    while (round < r) {
      round++;
      emit({ t: 'round', n: round });
      if (round >= SIM.ENRAGE_ROUND) {
        enrage = round - SIM.ENRAGE_ROUND + 1;
        emit({ t: 'enrage', level: enrage, mult: 1 + enrage * SIM.ENRAGE_STEP });
      }
    }
    betweenTurns();
    takeTurn(u);
    actions++;
    const f = living(1).length;
    if (!f) winner = 0;
    else if (partyDown()) winner = 1;
    else if (actions >= SIM.MAX_ACTIONS) { winner = 1; stalled = true; }
  }
  // With no heroes standing, the thralls crumble.
  if (winner === 1) for (const t of thrallsOf(0)) { t.hp = 0; t.alive = false; t.st = {}; emit({ t: 'die', who: t.id, by: null }); }
  emit({ t: 'end', winner, round, actions, stalled });
  const xp = units.filter(u => u.side === 1 && !u.alive).reduce((a, u) => a + foeXp(u), 0);
  return { seed: setup.seed, winner, rounds: round, actions, stalled, log, stats, party, partyRules: log[0].partyRules, loadout: log[0].loadout, start: log[0].units, final: units.map(snap), level: stageLv, xp: Math.round(xp + loot.xpBonus), loot: { gold: loot.gold } };
}

// What felling a foe is worth: its rank and level (tune).
function foeXp(u) {
  const base = u.boss ? FOE_XP.boss : u.elite ? FOE_XP.elite : FOE_XP.normal;
  return u.thrall ? 0 : base * (1 + 0.35 * ((u.lv || 1) - 1));
}

// A stage's battle.
// tactics: { party: [6 slots of hero specs], partyRules, loadout }. Without it, stageSetup.tactics() is asked (the
// rules model sets it, in js/rules.js), and otherwise the fixed party's starting rules are used.
function defaultTactics() {
  return { party: PARTY, partyRules: PARTY_RULES.rules, loadout: LOADOUT.items };
}
function stageSetup(stage, seed, tactics) {
  const t = tactics || (stageSetup.tactics && stageSetup.tactics()) || defaultTactics();
  return { seed, party: t.party, foes: stage.foes, scale: stage.scale, level: stage.level || 1, partyRules: t.partyRules, loadout: t.loadout, inputs: [] };
}
stageSetup.tactics = null;
