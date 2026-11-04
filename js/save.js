'use strict';
// Lantern Road · the game state and saving.
// One versioned state object holds everything that lasts between sessions. It is saved to localStorage and, when
// the artifact host offers them, to the artifact db under data/users/<id>/save. The copy with the higher `rev` wins.
//
// To extend the state in a later step:
//   1. add the new fields to defaultState(), so new players and old saves both get them;
//   2. if old data has to change shape, raise SAVE_VERSION and add MIGRATIONS[n] (it receives a version n-1 save).
// normalize() fills anything missing from defaultState(), so step 1 is usually enough.

const SAVE_VERSION = 1;
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
const STAT_KEYS = ['hp', 'mp', 'pow', 'def', 'spd', 'crit', 'dodge'];

function newCharacter(cls, id, name) {
  const C = CLASSES[cls], stats = {};
  for (const k of STAT_KEYS) stats[k] = C[k] || 0;
  return { id, cls, name: name || C.name, level: 1, xp: 0, stats, fatigue: 0, gear: { weapon: null, armor: null, accessory: null }, rules: null, joined: Date.now() };
}

function defaultState() {
  const now = Date.now();
  // Until recruiting arrives (step 5) the roster is the prototype's fixed party of six, in formation order.
  const roster = PARTY.map((cls, i) => newCharacter(cls, 'c' + (i + 1)));
  return {
    v: SAVE_VERSION,
    rev: 0,                 // bumped on every commit; decides which copy wins between devices
    created: now,
    lastSeen: now,          // the last moment the game was open; time away is measured from it
    sessions: 0,
    nextId: roster.length + 1,
    roster,                 // every character you own
    party: roster.map(c => c.id).concat([null, null, null, null, null, null]).slice(0, 6), // formation slots 0-5: 2 front, 4 back
    inventory: { items: [], potions: {} },
    currencies: { gold: 0, mats: Object.fromEntries(MATERIALS.map(m => [m.id, 0])) },
    campaign: { cleared: [], best: {}, current: null },  // current: { stage, seed } of a battle in progress
    base: { buildings: {} },                              // id -> { level, focus, stored, since }
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
  return fillFrom(newCharacter(c.cls, c.id), c);
}
function normalize(d) {
  const s = fillFrom(defaultState(), d);
  s.v = SAVE_VERSION;
  const seen = new Set();
  s.roster = s.roster.map(normalizeCharacter).filter(c => c && !seen.has(c.id) && seen.add(c.id));
  if (!s.roster.length) s.roster = defaultState().roster;
  const ids = new Set(s.roster.map(c => c.id));
  s.party = Array.from({ length: 6 }, (_, i) => (ids.has(s.party[i]) ? s.party[i] : null));
  s.campaign.cleared = s.campaign.cleared.filter(x => typeof x === 'string');
  if (!isObj(s.campaign.best)) s.campaign.best = {};
  const cur = s.campaign.current;
  if (cur && !(Number.isInteger(cur.stage) && Number.isFinite(cur.seed))) s.campaign.current = null;
  if (![1, 2, 4].includes(s.settings.speed)) s.settings.speed = 1;
  for (const k of ['sfx', 'music', 'motion']) s.settings[k] = s.settings[k] !== false;
  s.nextId = Math.max(s.nextId, ...s.roster.map(c => (parseInt(c.id.slice(1), 10) || 0) + 1));
  if (!(s.lastSeen > 0)) s.lastSeen = Date.now();
  return s;
}

// ── migrations: MIGRATIONS[n] turns a version n-1 save into version n. Version 0 is the step 1 prototype's save.
const MIGRATIONS = {
  1: old => {
    const s = defaultState();
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
