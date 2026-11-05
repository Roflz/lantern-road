'use strict';
// Lantern Road · the game state and saving.
// One versioned state object holds everything that lasts between sessions. It is saved to localStorage and, when
// the artifact host offers them, to the artifact db under data/users/<id>/game. The copy with the higher `rev` wins.
// (Not data/users/<id>/save: the roguelike this link used to hold keeps its own save there, with `v: 1` and a `rev`
// of its own. Read as one of ours it would migrate into an empty game and win over the real one.)
//
// Servers (the title's server picker, js/title.js, a placeholder for multiplayer): each server keeps its own save.
// S1 keeps the save the game always had, under the same key and cloud path. S2 and up save beside it, with a "-s2"
// suffix: lantern-road-save-s2 and data/users/<id>/game-s2. A small index (lantern-road-servers, and
// data/users/<id>/servers in the cloud) remembers the last server used, and each server's lead hero, their look and
// Renown, so the picker can show them without loading every save.
//
// To extend the state in a later step:
//   1. add the new fields to defaultState(), so new players and old saves both get them;
//   2. if old data has to change shape, raise SAVE_VERSION and add MIGRATIONS[n] (it receives a version n-1 save).
// normalize() fills anything missing from defaultState(), so step 1 is usually enough.

const SAVE_VERSION = 7;
const SAVE_KEY = 'lantern-road-save';
const SAVE_BAK = 'lantern-road-save-bak';        // the last save that loaded cleanly (S1's: saveKey(n, '-bak'))
const SAVE_BROKEN = 'lantern-road-save-broken';  // a save that could not be read, kept for inspection (saveKey(n, '-broken'))
const LEGACY_IDLE = 'lantern-road-idle-v1';      // the step 1 prototype's save: cleared stages, best rounds, speed
const SERVERS_KEY = 'lantern-road-servers';      // the last server used, and a line on each server with a save
// A server's own key: S1 has the keys above, S2 and up the same with "-s2" and so on (-bak and -broken after it).
const saveKey = (n, part = '') => (n > 1 ? `${SAVE_KEY}-s${n}` : SAVE_KEY) + part;

// Each region drops one material more often than the others (design §8): its staple, for buildings. The first five are
// the staples, in region order (MATERIALS[r] is region r's). After them, each region's Trophy (trophy: true; the regions
// study §3.1), for making and remaking its own gear at the Smithy, a later build. Regions III–V's Trophies come later.
const MATERIALS = [
  { id: 'bone_dust', name: 'Bone Dust', region: 0 },
  { id: 'chapel_wax', name: 'Chapel Wax', region: 1 },
  { id: 'heartwood', name: 'Heartwood', region: 2 },
  { id: 'cinder_iron', name: 'Cinder Iron', region: 3 },
  { id: 'throne_tallow', name: 'Throne Tallow', region: 4 },
  { id: 'burial_coin', name: 'Burial Coin', region: 0, trophy: true },
  { id: 'bell_bronze', name: 'Bell Bronze', region: 1, trophy: true },
];
// What a Trophy is for, for its tooltips ('' for a staple: the buildings say what they need).
const matUse = id => { const m = MATERIALS.find(x => x.id === id); return m && m.trophy ? `For making and remaking ${REGIONS[m.region].name} gear at the Smithy, which opens after the Sexton.` : ''; };
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
    settings: { sfx: true, music: true, motion: true, speed: 1, tips: true, proto: true }, // tips: first-time tips; proto: show the prototype tools
    away: { last: 0, total: 0, returns: 0, at: 0 },       // the latest time away, the sum of all of it, and when it was seen
    name: '',               // the name you gave Wick (the Hearth shows it by your Renown); '' until you do
    // Wick's first session (js/firstsession.js): step, the forced step under way; done once it is over (or skipped);
    // replay: the steps seen again since Settings → Replay the guide, or null. visits: his unlock visits
    // (js/visits.js), each 'new', 'later' or 'seen'.
    guide: { step: '', done: false, replay: null, visits: {} },
    // Bess the carter (js/quests.js): bess, at the Hearth; story, her first quest ('', 'offered', 'on', 'claimed');
    // jobs, the daily jobs ('', 'due', 'new', 'seen'); daily, today's.
    quests: { bess: false, story: '', jobs: '', daily: null },
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
  for (const k of ['sfx', 'music', 'motion', 'tips', 'proto']) s.settings[k] = s.settings[k] !== false;
  s.nextId = Math.max(s.nextId, ...s.roster.map(c => (parseInt(c.id.slice(1), 10) || 0) + 1));
  // The Bag: real pieces only, each once (a piece worn by someone isn't in the Bag too).
  const uids = new Set(s.roster.flatMap(c => SLOTS.map(k => c.gear[k] && c.gear[k].uid).filter(Boolean)));
  s.inventory.items = s.inventory.items.map(x => Items.valid(x)).filter(x => x && !uids.has(x.uid) && uids.add(x.uid));
  if (!(s.lastSeen > 0)) s.lastSeen = Date.now();
  // A save from before the guide, with heroes in it, has had its first session.
  if (!(isObj(d) && isObj(d.guide)) && s.roster.length) s.guide.done = true;
  // A save from before Bess, past 1-2, has her at the Hearth already, with her first quest offered.
  if (!(isObj(d) && isObj(d.quests)) && s.campaign.cleared.includes('1-2')) { s.quests.bess = true; s.quests.story = 'offered'; }
  if (typeof Quests !== 'undefined') Quests.ensure(s);
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
  // Version 6 (the gear study's Relic fix): a Relic comes at its boss's level, not level 1, so a Relic already owned,
  // in the Bag or worn, rises to it.
  6: old => {
    for (const x of savedPieces(old)) if (GEAR[x.id].rarity === 'relic') x.lv = Math.max(Number(x.lv) || 1, Items.relicLevel(x.id));
    return old;
  },
  // Version 7 (the gear study's build step 1): stars and enchantment lines. Every piece owned is ★0 with no lines, but a
  // Relic, which always has STARS.RELIC stars: its lines roll from the save and the Relic, as a new one's would.
  7: old => {
    for (const x of savedPieces(old)) {
      x.st = 0; x.en = [];
      if (GEAR[x.id].rarity === 'relic') Items.enchantRelic(x, old);
    }
    return old;
  },
};
// Every gear piece in a saved state, in the Bag and worn: the plain objects, to change in place.
function savedPieces(d) {
  const out = [], ok = x => isObj(x) && GEAR[x.id];
  if (isObj(d.inventory) && Array.isArray(d.inventory.items)) out.push(...d.inventory.items.filter(ok));
  for (const c of Array.isArray(d.roster) ? d.roster : []) if (isObj(c) && isObj(c.gear)) for (const k of SLOTS) if (ok(c.gear[k])) out.push(c.gear[k]);
  return out;
}
function upgrade(d) {
  if (!isObj(d)) throw new Error('not a save');
  let v = Number.isInteger(d.v) ? d.v : 0;
  while (v < SAVE_VERSION) { d = MIGRATIONS[v + 1](d); v++; d.v = v; }
  return normalize(d);
}

const Save = (() => {
  let state = null;
  let server = 1;      // the server whose save this is (js/title.js picks it)
  // What happened when the game loaded, for the app to report: where the save came from, and the time away.
  const info = { source: 'new', recovered: null, awayMs: 0, cloud: 'off', savedAt: 0 };
  let replaced = null; // called when a newer copy arrives from the cloud

  function store(key, val) { try { localStorage.setItem(key, val); return true; } catch (e) { return false; } }
  function read(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
  function parse(raw) {
    if (raw == null) return { missing: true };
    try { return { data: upgrade(JSON.parse(raw)) }; } catch (e) { return { broken: true, error: e }; }
  }

  // ── the servers' index: the last server used, and a line on each server with a save
  let idx = null;
  const cleanLine = e => (isObj(e) ? {
    lead: typeof e.lead === 'string' && CLASSES[e.lead] ? e.lead : null,
    look: Array.isArray(e.look) ? e.look.slice(0, 3).map(x => (typeof x === 'string' ? x : null)) : null,
    renown: Number.isFinite(e.renown) ? e.renown : 1,
    at: Number.isFinite(e.at) ? e.at : 0,
  } : null);
  function readIndex() {
    let x = null;
    try { x = JSON.parse(read(SERVERS_KEY) || 'null'); } catch (e) { x = null; }
    const out = { last: 1, saves: {} };
    if (isObj(x) && Number.isInteger(x.last) && x.last >= 1) out.last = x.last;
    if (isObj(x) && isObj(x.saves)) for (const k in x.saves) { const e = cleanLine(x.saves[k]); if (e && Number(k) >= 1) out.saves[Number(k)] = e; }
    return out;
  }
  const index = () => idx || (idx = readIndex());
  // A save's line: its lead hero (the first in the party, or on the roster), their look, and the Renown level.
  function line(s) {
    const id = s.party.find(Boolean) || (s.roster[0] && s.roster[0].id), c = id ? s.roster.find(x => x.id === id) : null;
    return { lead: c ? c.cls : null, look: c && typeof Items !== 'undefined' ? Items.look(c) : null, renown: typeof Base !== 'undefined' ? Base.renown(s).level : 1 };
  }
  // Notes the current server in the index, after a load or a commit.
  function note() {
    const I = index(), e = Object.assign(line(state), { at: Date.now() }), old = I.saves[server];
    const changed = !old || old.lead !== e.lead || old.renown !== e.renown || JSON.stringify(old.look) !== JSON.stringify(e.look);
    I.saves[server] = e; I.last = server;
    store(SERVERS_KEY, JSON.stringify(I));
    if (changed) queueIndex();
  }
  // The server list, a placeholder until real servers come: every server with a save, then the newest, one past the
  // highest used, so a fresh start is always there. The statuses are placeholders too: yours Busy, the newest New.
  function servers() {
    const I = index(), mine = Object.keys(I.saves).map(Number).sort((a, b) => a - b);
    const newest = Math.max(server, ...mine) + 1;
    return { current: server, newest, list: mine.map(n => Object.assign({ n, status: 'busy', mine: true }, I.saves[n])).concat([{ n: newest, status: 'new', mine: false }]) };
  }

  // Read the last server's save. Never throws.
  function load() {
    idx = readIndex();
    server = idx.last;
    return loadServer();
  }
  // Read the current server's save, falling back to its backup and then to a fresh start.
  function loadServer() {
    const raw = read(saveKey(server)), main = parse(raw);
    info.source = 'new'; info.recovered = null;
    if (main.data) { state = main.data; info.source = 'local'; store(saveKey(server, '-bak'), raw); }
    else if (main.broken) {
      store(saveKey(server, '-broken'), raw);
      const bak = parse(read(saveKey(server, '-bak')));
      if (bak.data) { state = bak.data; info.source = 'backup'; info.recovered = 'backup'; }
      else { state = defaultState(); info.source = 'new'; info.recovered = 'fresh'; }
      console.warn('Lantern Road: the save could not be read (' + main.error.message + '). ' + (info.recovered === 'backup' ? 'Restored the backup.' : 'Started fresh; the broken save is kept under ' + saveKey(server, '-broken') + '.'));
    } else {
      const old = server === 1 ? parse(read(LEGACY_IDLE)) : {};
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
    note();
    return state;
  }

  // Moves to server n: this server's save is written first (local and cloud), then n's is read, or, fresh, a new game
  // starts there. The other servers' saves stay as they were. The switch is done when this returns; the promise
  // settles once the cloud copy of n's save has been read.
  function use(n, fresh) {
    n = Math.max(1, Math.floor(n) || 1);
    if (n === server && !fresh) return Promise.resolve(state);
    if (state) { writeLocal(); queueCloud(true); }
    clearTimeout(timer);
    doc = null;
    server = n;
    if (fresh) {
      const raw = read(saveKey(n));
      if (raw) store(saveKey(n, '-bak'), raw); // whatever was there is kept as the backup
      state = defaultState(); state.sessions = 1;
      info.source = 'new'; info.recovered = null; info.awayMs = 0;
      writeLocal(); note();
    } else loadServer();
    const done = () => { if (fresh && server === n) commit(); return state; };
    return cloud ? loadCloud().then(done) : Promise.resolve(done());
  }

  function writeLocal() {
    state.lastSeen = Date.now();
    if (store(saveKey(server), JSON.stringify(state))) info.savedAt = state.lastSeen;
  }
  // Save a change that matters: it bumps the revision and goes to the cloud too.
  function commit() {
    if (!state) return;
    state.rev++;
    writeLocal();
    note();
    queueCloud();
  }
  // Note that the game is still open: refreshes lastSeen without a new revision.
  function touch() { if (state) writeLocal(); }

  // ── the artifact db, when the page has the db and user capabilities: each server's save, and the index
  let cloud = null, connecting = null, doc = null, idxDoc = null, timer = 0, idxTimer = 0;
  let chain = Promise.resolve(); // the cloud writes, one after another, each with the doc and data of its moment
  function write(ref, data) {
    chain = chain.then(() => ref.set(data)).then(() => { if (ref === doc) info.cloud = 'synced'; }, e => {
      if (e && e.code !== 'unavailable' && e.code !== 'resource_exhausted') { if (ref === doc) { doc = null; info.cloud = 'off'; } }
      else if (ref === doc) info.cloud = 'retrying';
    });
    return chain;
  }
  function queueCloud(now) {
    if (!doc) return;
    clearTimeout(timer);
    if (now) cloudWrite(); else timer = setTimeout(cloudWrite, 1500);
  }
  function cloudWrite() { if (doc && state) write(doc, JSON.parse(JSON.stringify(state))); }
  function queueIndex() {
    if (!idxDoc) return;
    clearTimeout(idxTimer);
    idxTimer = setTimeout(() => { if (idxDoc) write(idxDoc, { saves: JSON.parse(JSON.stringify(index().saves)) }); }, 2000);
  }
  const path = (id, n) => 'data/users/' + id + '/game' + (n > 1 ? '-s' + n : '');
  // Connects once; later calls get the same promise.
  function initCloud() { return connecting || (connecting = connect()); }
  async function connect() {
    try {
      const cl = window.claude;
      if (!cl || typeof cl.use !== 'function') return;
      const [db, user] = await Promise.all([cl.use('db'), cl.use('user')]);
      if (!db || !user) return;
      const id = await user.id();
      if (!id) return;
      cloud = { db, id };
      await syncIndex();
      await loadCloud();
    } catch (e) { doc = null; info.cloud = 'off'; }
  }
  // The index from the cloud, merged with this device's: each server's newer line wins.
  async function syncIndex() {
    try {
      const ref = cloud.db.doc('data/users/' + cloud.id + '/servers'), snap = await ref.get(), I = index();
      const remote = snap.exists && isObj(snap.data()) && isObj(snap.data().saves) ? snap.data().saves : {};
      for (const k in remote) { const e = cleanLine(remote[k]), n = Number(k); if (e && n >= 1 && (!I.saves[n] || e.at > I.saves[n].at)) I.saves[n] = e; }
      store(SERVERS_KEY, JSON.stringify(I));
      idxDoc = ref;
      if (Object.keys(I.saves).some(k => !isObj(remote[k]) || !(remote[k].at >= I.saves[k].at))) queueIndex();
    } catch (e) { idxDoc = null; }
  }
  // The current server's save from the cloud: the copy with the higher rev wins.
  async function loadCloud() {
    const n = server;
    try {
      const ref = cloud.db.doc(path(cloud.id, n)), snap = await ref.get();
      if (n !== server) return; // moved to another server meanwhile
      doc = ref; info.cloud = 'synced';
      if (snap.exists) {
        let d = null;
        try { d = upgrade(snap.data()); } catch (e) { d = null; }
        if (d && d.rev > state.rev) {
          // Keep this device's time-away bookkeeping: lastSeen is about this session, not the other device's.
          d.away = state.away; d.sessions = Math.max(d.sessions, state.sessions);
          state = d; writeLocal(); note();
          if (replaced) replaced(state);
        } else if (!d || state.rev > d.rev) queueCloud(true);
      } else if (state.rev > 0) queueCloud(true);
    } catch (e) { if (n === server) { doc = null; info.cloud = 'off'; } }
  }

  // Start again from nothing. The old save stays in the backup slot.
  function reset() {
    const raw = read(saveKey(server));
    if (raw) store(saveKey(server, '-bak'), raw);
    state = defaultState();
    state.sessions = 1;
    commit();
    return state;
  }

  // Leaving the page or hiding it: write now, cloud included.
  function flush() { if (state) { writeLocal(); queueCloud(true); } }

  return {
    load, commit, touch, flush, reset, initCloud, use, servers,
    get state() { return state; }, get server() { return server; }, info,
    set onReplace(fn) { replaced = fn; },
    char: id => state.roster.find(c => c.id === id) || null,
  };
})();
