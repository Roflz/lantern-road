'use strict';
// Lantern Road · fatigue and rest (home-base spec §6, content spec §7).
// Fatigue is +1 for each turn a character takes, and nothing else adds any. Weary (50+) and Exhausted (75+) weaken a
// character; Spent (100) keeps them from fighting until fatigue falls below 50. It falls while they rest at camp: at
// the fire, in an Infirmary bed, training in the yard or away at a Masters' Hall lesson, the app open or closed.
// Fatigue is the model: it touches no page, so tools/simtest.js tests it in Node.
//
// A character keeps `fatigue` (0–100, with fractions) and `spent` (true from 100 until fatigue falls below 50).
// Beds are base.beds (js/base.js): the most fatigued heroes at camp take free beds, pinned heroes first, and a hero
// keeps a bed until they reach 0 or leave camp.

const REST = {
  PER_TURN: 1, WEARY: 50, EXHAUSTED: 75, SPENT: 100, FIT: 50, // (tune)
  PEN: { weary: 0.05, exhausted: 0.15, spent: 0.15 },          // Power, Defense and Speed lost (tune)
  FIRE: 10, FIRE5: 14, HALL: 10, YARD: 10,                     // fatigue recovered per hour (tune)
};
const FATIGUE_NAMES = { fresh: 'Fresh', weary: 'Weary', exhausted: 'Exhausted', spent: 'Spent' };

const Fatigue = (() => {
  const store = () => (typeof Save !== 'undefined' && Save.state ? Save.state : null);
  const HOUR = 3600000;
  const r1 = x => Math.round(x * 10) / 10;
  const perTurn = () => (typeof FATIGUE !== 'undefined' && FATIGUE.PER_TURN != null ? FATIGUE.PER_TURN : REST.PER_TURN);
  const lv = (c, id) => (c && c.skills && c.skills[id] ? skillLevel(c.skills[id], (c.awakened || []).includes(id)) : null);

  // ── how tired: fresh, weary, exhausted or spent
  function state(c) {
    const f = c.fatigue || 0;
    if (c.spent || f >= REST.SPENT) return 'spent';
    if (f >= REST.EXHAUSTED) return 'exhausted';
    if (f >= REST.WEARY) return 'weary';
    return 'fresh';
  }
  const spent = c => state(c) === 'spent';
  // What it costs in battle: a share of Power, Defense and Speed. Awakened Iron Will: Weary no longer weakens the Warden.
  function penalty(c) {
    const st = state(c);
    if (st === 'weary') { const iw = lv(c, 'ironwill'); return iw && iw.A ? 0 : REST.PEN.weary; }
    return REST.PEN[st] || 0;
  }

  // ── where a character is: on the road, at a lesson, training, in a bed or at the fire
  function onRoad(c, s) {
    const T = s.campaign && s.campaign.trip;
    if (T) return Object.prototype.hasOwnProperty.call(T.fatigue || {}, c.id) && !(T.out || []).includes(c.id);
    return !!(s.campaign && s.campaign.current) && s.party.includes(c.id);
  }
  // o.offline: time while the app was closed, when nobody is on the road (closing the app brings the party home).
  function where(c, s = store(), o = {}) {
    if (s.base.hall[c.id]) return 'hall';
    if (!o.offline && onRoad(c, s)) return 'road';
    if (Base.trainees(s).includes(c.id)) return 'yard';
    if (s.base.beds.includes(c.id)) return 'bed';
    return 'fire';
  }
  const PLACE_NAMES = { road: 'Out on the road', hall: 'At the Masters’ Hall', yard: 'Training', bed: 'In a bed', fire: 'At the fire' };
  // Fatigue recovered per hour where they are.
  function rate(c, s = store(), o = {}) {
    const w = where(c, s, o), L = Base.level('infirmary', s);
    if (w === 'road') return 0;
    if (w === 'hall') return REST.HALL;
    if (w === 'yard') return Base.hasChoice('trainingyard', 'harddrills', s) ? 0 : REST.YARD;
    if (w === 'bed') return BLV.bedRate[L] || REST.FIRE;
    return L >= 5 ? REST.FIRE5 : REST.FIRE;
  }
  const atCamp = (c, s, o) => { const w = where(c, s, o); return w === 'fire' || w === 'bed'; };
  // Beds fill themselves: pinned heroes first, then the most fatigued at camp. A hero keeps a bed until they reach 0 or
  // leave camp (set out, train, or go to a lesson).
  function fillBeds(s = store(), o = {}) {
    if (!s || !s.base) return;
    const n = BLV.bedsN[Base.level('infirmary', s)] || 0, B = s.base;
    const keep = id => { const c = s.roster.find(x => x.id === id); return c && atCamp(c, s, o) && c.fatigue > 0 ? id : null; };
    const beds = Array.from({ length: n }, (_, i) => (B.beds[i] ? keep(B.beds[i]) : null));
    const waiting = s.roster.filter(c => !beds.includes(c.id) && atCamp(c, s, o) && c.fatigue > 0)
      .sort((a, b) => (B.pins.includes(b.id) - B.pins.includes(a.id)) || b.fatigue - a.fatigue);
    for (let i = 0; i < n; i++) if (!beds[i] && waiting.length) beds[i] = waiting.shift().id;
    B.beds = beds;
  }
  function pin(cid, on, s = store()) {
    const B = s.base;
    B.pins = B.pins.filter(x => x !== cid);
    if (on) { B.pins.push(cid); if (!B.beds.includes(cid)) { const i = B.beds.findIndex(x => !x || !B.pins.includes(x)); if (i >= 0) B.beds[i] = null; } }
    fillBeds(s);
    return true;
  }

  // ── time passing: rest from t0 to t1, in stretches of constant rates. A bed's hero reaching 0 frees the bed for the
  // next, and a lesson that ends brings its hero back to camp.
  function advance(s, t0, t1, o = {}) {
    let t = t0, guard = 0;
    fillBeds(s, o);
    while (t < t1 && guard++ < 2000) {
      const rs = s.roster.map(c => [c, rate(c, s, o)]);
      let next = t1;
      for (const [c, r] of rs) if (r > 0 && c.fatigue > 0 && s.base.beds.includes(c.id)) next = Math.min(next, t + (c.fatigue / r) * HOUR);
      for (const cid in s.base.hall) next = Math.min(next, Base.lessonEnd(cid, s));
      next = Math.min(t1, Math.max(next, t + 1));
      const hrs = (next - t) / HOUR;
      for (const [c, r] of rs) if (r > 0 && c.fatigue > 0) { c.fatigue = Math.max(0, c.fatigue - r * hrs); if (c.fatigue < 1e-6) c.fatigue = 0; }
      for (const c of s.roster) if (c.spent && c.fatigue < REST.FIT) c.spent = false;
      Base.span(s, t, next, o);
      t = next;
      for (const cid of Object.keys(s.base.hall)) if (Base.lessonEnd(cid, s) <= t + 1) Base.finishLesson(cid, s, t);
      fillBeds(s, o);
    }
  }
  // How long until a character is fit again (below 50) or fully rested (0), at their rate now: ms, or null if they
  // aren't resting.
  function timeTo(c, target, s = store()) {
    const r = rate(c, s);
    if (!(r > 0)) return null;
    return Math.max(0, ((c.fatigue || 0) - target) / r * HOUR);
  }

  // ── a battle's fatigue (content spec §7): +1 for each turn a hero took, with the skills and gear that change it,
  // less the recovery House Calls and awakened Comfort give after the battle. Applies it, and returns
  // { charId: { before, gain, rec, after } }.
  //   Laudanum: those 3 turns build half the fatigue. Peaceful Rest: allies the Pilgrim raises gain 50% → 100% less
  //   for the rest of that battle. Iron Will, Comfort and Cold Compress: less for the whole battle. Transfusion: none
  //   that battle. Gear: Items.fatigueMul.
  function battle(res, s = store()) {
    const out = {};
    if (!s || !res || !res.start) return out;
    const byUnit = {};
    for (const u of res.start) byUnit[u.id] = u;
    const charOf = u => (u && u.char ? s.roster.find(c => c.id === u.char) || null : null);
    const heroes = res.start.filter(u => u.side === 0 && !u.thrall && u.char);
    // Comfort and House Calls work for every hero in the battle, from the best Pilgrim and Surgeon there.
    let comfort = 0, comfortAw = false, house = 0;
    for (const u of heroes) {
      const c = charOf(u), pc = lv(c, 'comfort'), ph = lv(c, 'housecalls');
      if (pc) { comfort = Math.max(comfort, pc.v([0.05, 0.2])); comfortAw = comfortAw || pc.A; }
      if (ph) house = Math.max(house, ph.A ? 3 : ph.v([0.5, 2]));
    }
    const lau = {}, raised = {}, cold = {}, transfused = {}, turns = {};
    for (const e of res.log) {
      if (e.t === 'status' && e.key === 'laudanum') lau[e.who] = !!e.on;
      else if (e.t === 'turn') { const u = byUnit[e.who]; if (u && u.side === 0) turns[e.who] = (turns[e.who] || 0) + (lau[e.who] ? 0.5 : 1) * (1 - (raised[e.who] || 0)); }
      else if (e.t === 'revive' && e.src) { const p = lv(charOf(byUnit[e.src]), 'peacefulrest'); if (p) raised[e.tgt] = Math.max(raised[e.tgt] || 0, p.v([0.5, 1])); }
      else if (e.t === 'heal' && e.src) { const p = lv(charOf(byUnit[e.src]), 'coldcompress'); if (p) cold[e.tgt] = Math.max(cold[e.tgt] || 0, p.A ? 0.25 : p.v([0.05, 0.15])); }
      else if (e.t === 'act' && e.skill === 'transfusion') for (const id of e.targets || []) transfused[id] = true;
    }
    const rec = house + (comfortAw ? 1 : 0);
    for (const u of heroes) {
      const c = charOf(u);
      if (!c || out[c.id]) continue;
      const before = c.fatigue || 0;
      let g = (turns[u.id] || 0) * perTurn();
      const iw = lv(c, 'ironwill');
      if (iw) g *= 1 - iw.v([0.1, 0.35]);
      if (comfort) g *= 1 - comfort;
      if (cold[u.id]) g *= 1 - cold[u.id];
      g *= Items.fatigueMul(c);
      if (transfused[u.id]) g = 0;
      const after = clamp(r1(before + g - rec), 0, REST.SPENT);
      c.fatigue = after;
      if (after >= REST.SPENT) c.spent = true;
      out[c.id] = { before, gain: r1(g), rec: r1(rec), after };
    }
    return out;
  }

  return { state, spent, penalty, onRoad, where, PLACE_NAMES, rate, fillBeds, pin, advance, timeTo, battle };
})();

// Weary and Exhausted weaken a hero in battle (home-base spec §6).
if (typeof Hero !== 'undefined' && Hero.mods) Hero.mods.push((c, sp) => {
  const p = Fatigue.penalty(c);
  if (!p) return;
  sp.stats.pow *= 1 - p; sp.stats.def *= 1 - p; sp.stats.spd *= 1 - p;
});
