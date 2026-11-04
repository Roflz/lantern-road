'use strict';
// Lantern Road · the game state and saving.
// One versioned state object holds everything that lasts between sessions. It is saved to localStorage and, when
// the artifact host offers them, to the artifact db under data/users/<id>/save. The copy with the higher `rev` wins.
//
// To extend the state in a later step:
//   1. add the new fields to defaultState(), so new players and old saves both get them;
//   2. if old data has to change shape, raise SAVE_VERSION and add MIGRATIONS[n] (it receives a version n-1 save).
// normalize() fills anything missing from defaultState(), so step 1 is usually enough.

const SAVE_VERSION = 5;
const SAVE_KEY = 'lantern-road-save';
const SAVE_BAK = 'lantern-road-save-bak';        // the last save that loaded cleanly
const SAVE_BROKEN = 'lantern-road-save-broken';  // a save that could not be read, kept for inspection
const LEGACY_IDLE = 'lantern-road-idle-v1';      // the step 1 prototype's save: cleared stages, best rounds, speed

// Each region drops one material more often than the others (design §8). The names are placeholders.
const MATERIALS = [
  { id: 'bone_dust', name: 'Bone Dust', region: 0 },
  { id: 'chapel_wax', name: 'Chapel Wax', region: 1 },
  { id: 'heartwood', name: 'Heartwood', region: 2 },
  { id: 'cinder_iron', name: 'Cinder Iron', region: 3 },
  { id: 'throne_tallow', name: 'Throne Tallow', region: 4 },
];
// A character is made and kept by the hero model (js/hero.js): rolled stats, level, points, skills and choices.
const newCharacter = (cls, id, name) => Hero.create(cls, id, { name });

function defaultState() {
  const now = Date.now();
  // A new game starts with nobody: the first pick (Sellsword, Hexblade or Pilgrim) makes the first hero (js/camp.js,
  // Base.newGame), and the Recruit Board brings the rest (build step 5).
  return {
    v: SAVE_VERSION,
    rev: 0,                 // bumped on every commit; decides which copy wins between devices
    created: now,
    lastSeen: now,          // the last moment the game was open; time away is measured from it
    sessions: 0,
    nextId: 1,
    roster: [],             // every character you own
    party: [null, null, null, null, null, null],          // formation slots 0-5: 2 front, 4 back
    inventory: { items: [], potions: {} },                // items: the Bag's gear (js/items.js); potions: party items, by id
    currencies: { gold: typeof BASE !== 'undefined' ? BASE.START_GOLD : 100, mats: Object.fromEntries(MATERIALS.map(m => [m.id, 0])) },
    // The road (js/campaign.js). current: { stage, seed } of a battle under way. road: the trip settings and the rule
    // set chosen for each stage. trip: the trip under way. lastTrip: its summary once home. tips: first-time tips shown.
    campaign: { cleared: [], best: {}, current: null, road: { keepGoing: true, sets: {} }, trip: null, lastTrip: null, tips: {} },
    unlocks: {},                                          // every first-clear unlock: id -> when (UNLOCKS in js/data.js)
    // A new road starts with no party rules and nothing packed: 1-3 brings the items and the draught rule, 1-6 the
    // come-home rule (js/campaign.js). Tactics fills in the rest (js/rules.js).
    tactics: { party: { slots: PARTY_RULES.slots[0], rules: [] }, loadout: { slots: LOADOUT.slots[0], items: [] } },
    base: { buildings: {}, plots: [], beds: [], pins: [], hall: {}, done: {}, paid: [], clock: 0, skew: 0 }, // the home base (js/base.js)
    renown: { points: 0, awarded: {} },
    board: { recruits: [], picks: 1, refreshedAt: 0, ranks: { notices: 0, picks: 0, veterans: 0 }, free: true, seq: 0 },
    freePotion: { waiting: 0, since: 0 },
    shop: { stall: [], refreshedAt: 0, n: 0 },
    settings: { sfx: true, music: true, motion: true, speed: 1 },
    away: { last: 0, total: 0, returns: 0, at: 0 },       // the latest time away, the sum of all of it, and when it was seen
  };
}

// ── shape checks: whatever was loaded, the game gets a state it can trust
const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
// Copy `src` onto `def`: a value is kept only where its type matches the default. Keys the defaults don't know
// are kept too, so a save from a newer build loses nothing when an older build opens it.
function fillFrom(def, src) {
  if (!isObj(src)) return def;
  for (const k in src) {
    const d = def[k], s = src[k];
    if (d === undefined) def[k] = s;
    else if (d === null) def[k] = s;
    else if (isObj(d)) def[k] = isObj(s) ? fillFrom(d, s) : d;
    else if (Array.isArray(d)) def[k] = Array.isArray(s) ? s : d;
    else if (typeof d === 'number') def[k] = Number.isFinite(s) ? s : d;
    else if (typeof s === typeof d) def[k] = s;
  }
  return def;
}
function normalizeCharacter(c) {
  if (!isObj(c) || typeof c.id !== 'string' || !CLASSES[c.cls]) return null;
  return Hero.sanitize(c);
}
function normalize(d) {
  const s = fillFrom(defaultState(), d);
  s.v = SAVE_VERSION;
  const seen = new Set();
  s.roster = s.roster.map(normalizeCharacter).filter(c => c && !seen.has(c.id) && seen.add(c.id));
  const ids = new Set(s.roster.map(c => c.id));
  s.party = Array.from({ length: 6 }, (_, i) => (ids.has(s.party[i]) ? s.party[i] : null));
  s.campaign.cleared = s.campaign.cleared.filter(x => typeof x === 'string');
  if (!isObj(s.campaign.best)) s.campaign.best = {};
  const cur = s.campaign.current;
  if (cur && !(Number.isInteger(cur.stage) && STAGES[cur.stage] && Number.isFinite(cur.seed))) s.campaign.current = null;
  const T = s.campaign.trip;
  if (T && !(isObj(T) && Number.isInteger(T.stage) && STAGES[T.stage] && isObj(T.totals) && Array.isArray(T.out))) s.campaign.trip = null;
  if (s.campaign.lastTrip && !(isObj(s.campaign.lastTrip) && isObj(s.campaign.lastTrip.why))) s.campaign.lastTrip = null;
  s.campaign.cleared = s.campaign.cleared.filter(id => STAGES.some(st => st.id === id));
  for (const k of Object.keys(s.unlocks)) if (!UNLOCKS[k] || !Number.isFinite(s.unlocks[k])) delete s.unlocks[k];
  for (const c of s.roster) c.fatigue = clamp(Number(c.fatigue) || 0, 0, 100);
  if (![1, 2, 4].includes(s.settings.speed)) s.settings.speed = 1;
  for (const k of ['sfx', 'music', 'motion']) s.settings[k] = s.settings[k] !== false;
  s.nextId = Math.max(s.nextId, ...s.roster.map(c => (parseInt(c.id.slice(1), 10) || 0) + 1));
  // The Bag: real pieces only, each once (a piece worn by someone isn't in the Bag too).
  const uids = new Set(s.roster.flatMap(c => SLOTS.map(k => c.gear[k] && c.gear[k].uid).filter(Boolean)));
  s.inventory.items = s.inventory.items.map(x => Items.valid(x)).filter(x => x && !uids.has(x.uid) && uids.add(x.uid));
  if (!(s.lastSeen > 0)) s.lastSeen = Date.now();
  if (typeof Base !== 'undefined') Base.ensure(s);
  return s;
}

// ── migrations: MIGRATIONS[n] turns a version n-1 save into version n. Version 0 is the step 1 prototype's save.
const MIGRATIONS = {
  1: old => {
    const s = defaultState();
    // The step 1 prototype played with a fixed party of six: they become the roster, in formation order.
    s.roster = PARTY.map((cls, i) => newCharacter(cls, 'c' + (i + 1)));
    s.party = s.roster.map(c => c.id);
    s.nextId = s.roster.length + 1;
    if (Array.isArray(old.cleared)) s.campaign.cleared = old.cleared.filter(x => typeof x === 'string');
    if (isObj(old.best)) s.campaign.best = old.best;
    if ([1, 2, 4].includes(old.speed)) s.settings.speed = old.speed;
    try { // settings were kept on their own, shared with the first version of the game
      const st = JSON.parse(localStorage.getItem('lantern-road-settings') || '{}');
      for (const k of ['sfx', 'music', 'motion']) if (typeof st[k] === 'boolean') s.settings[k] = st[k];
      if (localStorage.getItem('lantern-road-muted') === '1') s.settings.sfx = s.settings.music = false;
    } catch (e) { }
    return s;
  },
  // Version 2 (build step 3): characters grow. The prototype's stats become each character's level-1 roll, and the
  // rules, kept by class until now, now belong to each character.
  2: old => {
    const roster = Array.isArray(old.roster) ? old.roster : [];
    old.roster = roster.map(c => (isObj(c) && CLASSES[c.cls] && typeof c.id === 'string' ? (c.base ? Hero.sanitize(c) : Hero.upgrade(c)) : null)).filter(Boolean);
    const T = old.tactics;
    if (isObj(T)) {
      // Rule slots bought in step 2 become Masters' Hall lessons, so nobody loses one.
      if (isObj(T.heroes)) for (const c of old.roster) { const b = T.heroes[c.cls]; if (isObj(b) && Number.isInteger(b.slots)) c.lessons.rule = Math.max(c.lessons.rule, b.slots - HERO.RULE_SLOTS); }
      const rekey = h => { const out = {}; if (!isObj(h)) return out; for (const c of old.roster) if (h[c.cls] && !out[c.id]) out[c.id] = h[c.cls]; return out; };
      T.heroes = rekey(T.heroes);
      if (Array.isArray(T.sets)) T.sets.forEach(x => { if (isObj(x)) x.heroes = rekey(x.heroes); });
    }
    return old;
  },
  // Version 3 (build step 4): gear. Every character gets the Common weapon a recruit carries, at their level, and the
  // Bag holds gear pieces.
  3: old => {
    const inv = isObj(old.inventory) ? old.inventory : (old.inventory = {});
    inv.items = Array.isArray(inv.items) ? inv.items.filter(x => isObj(x) && GEAR[x.id]) : [];
    for (const c of Array.isArray(old.roster) ? old.roster : []) {
      if (!isObj(c) || !CLASSES[c.cls]) continue;
      const g = isObj(c.gear) ? c.gear : {};
      c.gear = { weapon: isObj(g.weapon) && GEAR[g.weapon.id] ? g.weapon : null, armor: isObj(g.armor) && GEAR[g.armor.id] ? g.armor : null, accessory: isObj(g.accessory) && GEAR[g.accessory.id] ? g.accessory : null };
      if (!c.gear.weapon) c.gear.weapon = Items.starter(c.cls, Math.max(1, Math.round(c.level) || 1));
    }
    return old;
  },
  // Version 4 (build step 6): the campaign. The prototype's six stages (1-1 to 2-3) are replaced by Region I's 18, so
  // the road starts again from 1-1; heroes keep their levels, gear and rules. Unlocks start empty, a trip is new, and
  // the battle that was under way is dropped. rebuilt tells the app to say so once.
  4: old => {
    const c = isObj(old.campaign) ? old.campaign : (old.campaign = {});
    const had = Array.isArray(c.cleared) ? c.cleared.length : 0;
    c.cleared = []; c.best = {}; c.current = null; c.trip = null; c.lastTrip = null;
    c.road = { keepGoing: true, sets: {} }; c.tips = {};
    if (had) c.rebuilt = true;
    old.unlocks = {};
    for (const ch of Array.isArray(old.roster) ? old.roster : []) if (isObj(ch)) ch.fatigue = 0;
    return old;
  },
  // Version 5 (build step 5): the home base. Everyone on the roster stays, and so does what the prototype gave for free:
  // rule slots learned become Masters' Hall lessons already done (step 3 kept them in lessons.rule), and party rule and
  // loadout slots opened stay open as a floor under the Tactician's. Renown counts the stages already lit and the bosses
  // already beaten. The first recruit is free only for a party of one.
  5: old => {
    const now = Date.now();
    const roster = Array.isArray(old.roster) ? old.roster : [];
    const T = isObj(old.tactics) ? old.tactics : {};
    const B = isObj(old.base) ? old.base : (old.base = {});
    B.legacySlots = { party: isObj(T.party) && Number.isInteger(T.party.slots) ? T.party.slots : 0, loadout: isObj(T.loadout) && Number.isInteger(T.loadout.slots) ? T.loadout.slots : 0 };
    B.clock = now;
    const pts = { points: 0, awarded: {} };
    const cleared = isObj(old.campaign) && Array.isArray(old.campaign.cleared) ? old.campaign.cleared : [];
    for (const id of cleared) {
      const st = STAGES.find(x => x.id === id) || {};
      pts.awarded['lit:' + id] = 1; pts.points += st.kind === 'elite' ? 100 : 40;
      if (st.boss || st.kind === 'boss') { pts.awarded['boss:' + id] = 1; pts.points += 250; }
    }
    for (const c of roster) if (isObj(c) && c.cls) pts.awarded['cls:' + c.cls] = 1;
    old.renown = pts;
    old.board = { recruits: [], picks: 1, refreshedAt: 0, ranks: { notices: 0, picks: 0, veterans: 0 }, free: roster.length <= 1, seq: 0 };
    if (!isObj(old.unlocks)) old.unlocks = {};
    return old;
  },
};
function upgrade(d) {
  if (!isObj(d)) throw new Error('not a save');
  let v = Number.isInteger(d.v) ? d.v : 0;
  while (v < SAVE_VERSION) { d = MIGRATIONS[v + 1](d); v++; d.v = v; }
  return normalize(d);
}

const Save = (() => {
  let state = null;
  // What happened when the game loaded, for the app to report: where the save came from, and the time away.
  const info = { source: 'new', recovered: null, awayMs: 0, cloud: 'off', savedAt: 0 };
  let replaced = null; // called when a newer copy arrives from the cloud

  function store(key, val) { try { localStorage.setItem(key, val); return true; } catch (e) { return false; } }
  function read(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
  function parse(raw) {
    if (raw == null) return { missing: true };
    try { return { data: upgrade(JSON.parse(raw)) }; } catch (e) { return { broken: true, error: e }; }
  }

  // Read the save, falling back to the backup and then to a fresh start. Never throws.
  function load() {
    const raw = read(SAVE_KEY), main = parse(raw);
    if (main.data) { state = main.data; info.source = 'local'; store(SAVE_BAK, raw); }
    else if (main.broken) {
      store(SAVE_BROKEN, raw);
      const bak = parse(read(SAVE_BAK));
      if (bak.data) { state = bak.data; info.source = 'backup'; info.recovered = 'backup'; }
      else { state = defaultState(); info.source = 'new'; info.recovered = 'fresh'; }
      console.warn('Lantern Road: the save could not be read (' + main.error.message + '). ' + (info.recovered === 'backup' ? 'Restored the backup.' : 'Started fresh; the broken save is kept under ' + SAVE_BROKEN + '.'));
    } else {
      const old = parse(read(LEGACY_IDLE));
      if (old.data) { state = old.data; info.source = 'legacy'; }
      else state = defaultState();
    }
    // Time away: from the last moment the game was seen open. A clock that went backwards counts as no time.
    const now = Date.now();
    info.awayMs = info.source === 'new' ? 0 : Math.max(0, now - state.lastSeen);
    if (info.awayMs) { state.away.last = info.awayMs; state.away.total += info.awayMs; state.away.returns++; state.away.at = now; }
    state.sessions++;
    state.lastSeen = now;
    writeLocal();
    return state;
  }

  function writeLocal() {
    state.lastSeen = Date.now();
    if (store(SAVE_KEY, JSON.stringify(state))) info.savedAt = state.lastSeen;
  }
  // Save a change that matters: it bumps the revision and goes to the cloud too.
  function commit() {
    if (!state) return;
    state.rev++;
    writeLocal();
    queueCloud();
  }
  // Note that the game is still open: refreshes lastSeen without a new revision.
  function touch() { if (state) writeLocal(); }

  // ── the artifact db, when the page has the db and user capabilities
  let doc = null, writing = false, again = false, timer = 0;
  function queueCloud(now) {
    if (!doc) return;
    clearTimeout(timer);
    if (now) cloudWrite(); else timer = setTimeout(cloudWrite, 1500);
  }
  async function cloudWrite() {
    if (!doc) return;
    if (writing) { again = true; return; }
    writing = true;
    try { await doc.set(JSON.parse(JSON.stringify(state))); info.cloud = 'synced'; }
    catch (e) { if (e && e.code !== 'unavailable' && e.code !== 'resource_exhausted') { doc = null; info.cloud = 'off'; } else info.cloud = 'retrying'; }
    writing = false;
    if (again) { again = false; cloudWrite(); }
  }
  async function initCloud() {
    try {
      const cl = window.claude;
      if (!cl || typeof cl.use !== 'function') return;
      const [db, user] = await Promise.all([cl.use('db'), cl.use('user')]);
      if (!db || !user) return;
      const id = await user.id();
      if (!id) return;
      const ref = db.doc('data/users/' + id + '/save');
      const snap = await ref.get();
      doc = ref; info.cloud = 'synced';
      if (snap.exists) {
        let d = null;
        try { d = upgrade(snap.data()); } catch (e) { d = null; }
        if (d && d.rev > state.rev) {
          // Keep this device's time-away bookkeeping: lastSeen is about this session, not the other device's.
          d.away = state.away; d.sessions = Math.max(d.sessions, state.sessions);
          state = d; writeLocal();
          if (replaced) replaced(state);
        } else if (!d || state.rev > d.rev) queueCloud(true);
      } else if (state.rev > 0) queueCloud(true);
    } catch (e) { doc = null; info.cloud = 'off'; }
  }

  // Start again from nothing. The old save stays in the backup slot.
  function reset() {
    const raw = read(SAVE_KEY);
    if (raw) store(SAVE_BAK, raw);
    state = defaultState();
    state.sessions = 1;
    commit();
    return state;
  }

  // Leaving the page or hiding it: write now, cloud included.
  function flush() { if (state) { writeLocal(); queueCloud(true); } }

  return {
    load, commit, touch, flush, reset, initCloud,
    get state() { return state; }, info,
    set onReplace(fn) { replaced = fn; },
    char: id => state.roster.find(c => c.id === id) || null,
  };
})();
