'use strict';
// Lantern Road · the home base (build step 5, docs/home-base-spec.md): buildings and plots, Renown, recruiting and the
// roster, the item economy, idle buildings and time away, the Masters' Hall, the Shrine, the Tactician and the
// passive-bonus buildings. Fatigue and rest live in js/rest.js.
// Base is the model: it touches no page, so tools/simtest.js tests it in Node. js/camp.js and js/buildings.js draw it.
//
// What it keeps in the save (js/save.js):
//   base.buildings  { id: { level, plot, focus, choices: { 3, 5 }, since, held, full, frac, n, trainees, brew } }
//                   held: ms of output stored (an idle building stops at its storage); full: when it filled up
//   base.plots      the building on each cleared plot, in ring order (null for an empty plot)
//   base.beds       who holds each Infirmary bed; base.pins: who keeps theirs
//   base.hall       { charId: { id, since, need, slot } } a lesson under way; base.done { 'char:lesson': ms } progress
//                   kept by a cancelled lesson; base.paid ['char:lesson'] lessons already paid for
//   base.clock      the last moment the base was brought up to date; base.skew: prototype time travel, in ms
//   renown          { points, awarded: { key: 1 } }: every award that counts once per save
//   board           the Recruit Board: { recruits, picks, refreshedAt, ranks: { notices, picks, veterans }, free, seq,
//                   pending (a refresh owed for the next time the party is home), first (the first board's classes) }
//   freePotion      { waiting, since }: Healing Draughts by the fire
//   shop            { stall, refreshedAt, n }: the Shop's gear stall
//   unlocks         { id: when }: first-clear unlocks, recorded by the campaign (build step 6) or the prototype tools
//
// Hooks: Base.start() at boot; Base.tick() keeps the clock moving; Base.afterBattle(res, stage, o) after every battle;
// Base.home(trip) when the party comes home. With the campaign (js/campaign.js) present, its hooks call these.

const BASE = {
  HOUR: 3600000,
  // Standard costs by level: [gold, material]. Each building has a cost factor; levels 1–2 cost Bone Dust and level 3
  // and up the building's home material (tune).
  STD: [[300, 10], [1000, 20], [3000, 25], [8000, 40], [20000, 60]],
  START_PLOTS: 3,
  PLOT_RENOWN: [4, 6, 8, 10, 12, 13, 15, 17, 19, 22, 25], // plots 4–14 clear at these Renown levels (tune)
  // Renown (tune): a stage lit, an elite lit, each level's worth of battle XP, a boss (first and later), a threshold,
  // a class joining, a building built, each upgrade level (× the new level), a lesson finished.
  RENOWN: { stage: 40, elite: 100, xpLv: 15, boss: 250, bossAgain: 20, threshold: 50, cls: 50, built: 60, up: 30, lesson: 40 },
  STORE: 8,                       // hours of output an idle building stores; +4 with the level-3 storage choice, +12 with the level-5 one
  POTION: { every: 4, max: 3 },   // the free Healing Draught by the fire: one every 4 hours, up to 3 waiting
  BOARD: { size: 3, every: 4, sameClass: 2 },
  STALL_EVERY: 8,                 // the Shop's gear stall refreshes every 8 hours
  SHOP: { draught: 25, lampoil: 35, tincture: 40, salts: 60 }, // party items at Region I prices
  REGION_PRICE: [1, 2.5, 4.5, 7, 9],                            // × by your furthest region (decided overnight)
  ITEM_SELL: 0.3,                 // a party item sells for 30% of its Shop price
  ITEM_ODDS: [['draught', 50], ['lampoil', 25], ['tincture', 15], ['salts', 10]],
  RECRUIT: 150, RESPEC: 150,      // × S at the character's level
  START_GOLD: 100,
};
const BASE_S = L => 1 + L / 5;    // the gold scale, S = 1 + L ÷ 5 (home-base spec §2)

// Unlocks the campaign records on first clears (campaign spec §5.3). Until the campaign map lands, a cleared stage of
// the same id counts too.
const BASE_UNLOCK_STAGE = { recruitboard: '1-2', items: '1-3', tollhouse: '1-5', infirmary: '1-7', trainingyard: '1-8', shop: '1-10', tactician: '1-11', scavengercamp: '1-13', barracks: '1-15', salvagepit: '1-16', gravecaller: '1-18', 'region:1': '1-18' };

// ── the buildings (home-base spec §3)
// f: cost factor. home: the material its level 3+ costs. unlock: what makes it a blueprint. choices: the level-3 and
// level-5 forks, each [id, name, what it does]; the first is always the storage choice.
const BUILDINGS = {
  recruitboard: { name: 'Recruit Board', icon: 'scroll', art: 'board', home: 'bone_dust', unlock: 'recruitboard', plot: false,
    line: 'New faces for the road. It stands outside the plots.' },
  tollhouse: { name: 'Toll House', icon: 'coin', art: 'toll', home: 'chapel_wax', f: 0.8, unlock: 'tollhouse', idle: true,
    line: 'Travellers pay to walk the road you’ve lit.',
    focus: [['coin', 'Coin', 'Gold, more the further your light reaches'], ['kind', 'Kind', 'Party items instead of gold']],
    choices: { 3: [['strongbox', 'Strongbox', 'Stores 12 hours'], ['busyroad', 'Busy Road', 'Output +30%']],
      5: [['nightwatch', 'Night Watch', 'Stores 12 hours more'], ['bothways', 'Both Ways', 'Coin and Kind at once, each at 60%']] } },
  infirmary: { name: 'Infirmary', icon: 'cross', art: 'infirmary', home: 'chapel_wax', f: 0.8, unlock: 'infirmary',
    line: 'Beds where tired heroes rest faster than at the fire.' },
  trainingyard: { name: 'Training Yard', icon: 'sword', art: 'yard', home: 'bone_dust', f: 0.8, unlock: 'trainingyard', idle: true,
    line: 'XP for heroes resting at camp, up to the level of your highest lit stage.',
    choices: { 3: [['longdrills', 'Long Drills', 'Stores 12 hours'], ['harddrills', 'Hard Drills', '+50% XP, but trainees don’t recover fatigue']],
      5: [['nightdrills', 'Night Drills', 'Stores 12 hours more'], ['mentors', 'Mentors', 'Double XP for trainees 10 or more levels below your best']] } },
  shop: { name: 'Shop', icon: 'bag', art: 'shop', home: 'bone_dust', f: 0.8, unlock: 'shop', line: 'Party items, and a small gear stall.' },
  tactician: { name: 'Tactician', icon: 'book', art: 'tactician', home: 'chapel_wax', f: 0.8, unlock: 'tactician',
    line: 'New rule conditions, party rule slots and loadout slots.' },
  scavengercamp: { name: 'Scavenger Camp', icon: 'bone', art: 'scav', home: 'heartwood', f: 1, unlock: 'scavengercamp', idle: true,
    line: 'Scavengers bring back a region’s material.',
    choices: { 3: [['deeppacks', 'Deep Packs', 'Stores 12 hours'], ['keeneye', 'Keen Eye', 'Twice the rare finds, output −20%']],
      5: [['longtrek', 'Long Trek', 'Stores 12 hours more'], ['widenet', 'Wide Net', 'Two regions at once, each at 60%']] } },
  barracks: { name: 'Barracks', icon: 'shield', art: 'barracks', home: 'heartwood', f: 1, unlock: 'barracks', line: 'Room for more heroes on the roster.' },
  salvagepit: { name: 'Salvage Pit', icon: 'bag', art: 'pit', home: 'cinder_iron', f: 1.2, unlock: 'salvagepit', idle: true,
    line: 'Diggers turn up gear of the kind you choose.',
    focus: [['any', 'Anything', 'Any slot'], ['weapon', 'Weapons', 'For the classes on your roster'], ['armor', 'Armour', 'Any weight'], ['accessory', 'Accessories', 'Any, and class-only ones for your roster']],
    choices: { 3: [['deeppit', 'Deep Pit', 'Stores 12 hours'], ['sifters', 'Sifters', 'Output −40%, and 15 points of Common move to Rare']],
      5: [['longdig', 'Long Dig', 'Stores 12 hours more'], ['finemesh', 'Fine Mesh', 'Output −30%, and every Common becomes Fine']] } },
  mastershall: { name: 'Masters’ Hall', icon: 'star', art: 'hall', home: 'throne_tallow', f: 1.5, unlock: 'region:1', line: 'Masters teach skill slots and rule slots, while the hero is away.' },
  shrine: { name: 'Shrine', icon: 'holy', art: 'shrine', home: 'heartwood', f: 1, unlock: 'region:1', line: 'Unlearn and start again, for gold.' },
  whetstone: { name: 'Whetstone', icon: 'sword', art: 'whet', home: 'cinder_iron', f: 1.5, unlock: 'region:2', passive: true, line: 'Every hero hits a little harder.',
    focus: [['edge', 'Edge', '+2% Power a level'], ['point', 'Point', '+1% Crit a level']] },
  ossuary: { name: 'Ossuary', icon: 'skull', art: 'ossuary', home: 'cinder_iron', f: 1.5, unlock: 'region:2', passive: true, line: 'Every hero stands a little longer.',
    focus: [['bone', 'Bone', '+2% max Health a level'], ['shell', 'Shell', '+2% Defense a level']] },
  hexingstone: { name: 'Hexing Stone', icon: 'curse', art: 'hexing', home: 'heartwood', f: 1.5, unlock: 'region:3', passive: true, line: 'Your harmful effects land more often.',
    focus: [['wide', 'Wide', '+2 points of landing chance a level, for every kind'], ['deep', 'Deep', '+4 points a level, for one kind']], kinds: true },
  belltower: { name: 'Bell Tower', icon: 'bell', art: 'bell', home: 'throne_tallow', f: 1.5, unlock: 'region:3', passive: true, line: 'Every hero resists a little more.',
    focus: [['wide', 'Wide', '+2% to all six resistances a level'], ['deep', 'Deep', '+4% to one resistance a level']], kinds: true },
};
const BUILDING_ORDER = Object.keys(BUILDINGS);
for (const id in BUILDINGS) BUILDINGS[id].id = id;

// Level tables (tune). Index 0 is "not built".
const BLV = {
  bedsN: [0, 2, 3, 3, 4, 5], bedRate: [0, 20, 22, 26, 30, 35],
  roster: [8, 11, 14, 17, 20, 24],
  partySlots: [2, 3, 3, 4, 4, 5], loadoutSlots: [2, 2, 3, 3, 4, 4],
  toll: [0, 50, 65, 65, 80, 80], kind: [0, 1, 1.3, 1.3, 1.6, 1.6],
  scav: [0, 1.5, 2, 2, 2.5, 2.5],
  yard: [0, 1, 2, 2, 3, 3],
  pit: [0, 1 / 3, 0.4, 0.4, 0.5, 0.5],              // gear rolls an hour: one every 3, 2.5 and 2 hours
  rooms: [0, 1, 2, 2, 2, 3],
  stall: [0, 2, 2, 3, 3, 4],
  shopItems: [[], ['draught', 'lampoil'], ['draught', 'lampoil', 'salts'], ['draught', 'lampoil', 'salts', 'tincture'], ['draught', 'lampoil', 'salts', 'tincture'], ['draught', 'lampoil', 'salts', 'tincture']],
};
// The Recruit Board's three tracks: what each rank gives and costs (gold, Bone Dust).
const BOARD_TRACKS = {
  notices: { name: 'Notices', line: 'More recruits on each board', ranks: [[600, 12], [1800, 15], [4800, 24]], give: n => `${BASE.BOARD.size + n} recruits on the board` },
  picks: { name: 'Picks', line: 'More hires from each board', ranks: [[1200, 24], [3600, 30]], give: n => `${1 + n} hires from each board` },
  veterans: { name: 'Veterans', line: 'Recruits who have walked the road before', ranks: [[1000, 20], [3000, 25], [8000, 40], [20000, 60]], cap: [0, 0.4, 0.6, 0.8, 0.9],
    give: n => (n >= 4 ? 'Up to 90% of your best hero’s level, and some arrive combined or awakened' : n ? `Up to ${[0, 40, 60, 80][n]}% of your best hero’s level` : 'Level 1') },
};
// Masters' Hall lessons (home-base spec §9, tune): what each teaches, the level it needs, hours, gold, the Hall level.
const LESSONS = {
  rule4: { name: 'Rule slot IV', kind: 'rule', n: 1, level: 15, hours: 4, gold: 600, hall: 1 },
  rule5: { name: 'Rule slot V', kind: 'rule', n: 2, level: 45, hours: 10, gold: 4000, hall: 2 },
  rule6: { name: 'Rule slot VI', kind: 'rule', n: 3, level: 90, hours: 20, gold: 12000, hall: 3 },
  skill1: { name: 'Skill slot I', kind: 'skill', n: 1, level: 20, hours: 8, gold: 1500, hall: 1 },
  skill2: { name: 'Skill slot II', kind: 'skill', n: 2, level: 100, hours: 24, gold: 15000, hall: 4 },
};
for (const id in LESSONS) LESSONS[id].id = id;
// Tactician I comes with the 1-11 clear (js/campaign.js teaches it, from TACTICIAN_I in js/data.js), the same clear that
// brings the building's blueprint. The building builds on it: party rule and loadout slots, and Lessons II and III at its
// levels 3 and 4 (home-base spec §3). Conditions are taught with every number or status they offer.
const TACTICIAN_I_LINE = 'Thresholds from 25% to 90%, mana, rows and statuses, Foe: health below, the leader’s target, One foe left, and the “an ally fell” and “out of an item” rules. Also Focus fire and saved rule sets.';
const TACTICIAN_LESSONS = {
  3: { name: 'Lesson II', conds: ['self_hp_gt', 'ally_mp_lt', 'foe_highest', 'foe_has', 'battle_start', 'allies_hurt'], line: 'Self: health above, Ally: mana below, Foe: highest health, Foe: has, Battle start and N or more allies hurt.' },
  4: { name: 'Lesson III', conds: [], line: 'Switch rule set: party rules can change everyone’s tactics on their own.' },
};
// Recruit names (placeholders, tune).
const RECRUIT_NAMES = ['Ottilie', 'Brannoc', 'Isolde', 'Maud', 'Fenn', 'Wick', 'Morwen', 'Gisla', 'Hugh', 'Corvin', 'Agathe', 'Edda', 'Alaric', 'Bertil',
  'Cressida', 'Dagny', 'Elric', 'Fulke', 'Godric', 'Hild', 'Ivo', 'Jehane', 'Kenric', 'Lisbet', 'Mabyn', 'Nell', 'Osric', 'Petra', 'Quill', 'Rowan', 'Sigrun',
  'Tamsin', 'Ulric', 'Vesna', 'Wulfric', 'Ysolde', 'Aldous', 'Bryony', 'Caspar', 'Dunstan', 'Elowen', 'Garnet', 'Hester', 'Ingram', 'Jory', 'Linnet', 'Merrick',
  'Odo', 'Perrin', 'Rook', 'Sabine', 'Tobin', 'Una', 'Wenna', 'Yorick', 'Briar', 'Cael', 'Dorran', 'Ember', 'Fable', 'Greer', 'Haddon', 'Kestrel', 'Lark', 'Mire'];
// The classes that join the board as the road goes on (content spec §4): the six original ones are there from the start.
const CLASS_JOINS = { gravecaller: 'gravecaller', surgeon: 'region:1', bellringer: 'region:1', duellist: 'region:2', cutpurse: 'region:2', alchemist: 'region:3' };
const STARTERS = ['sellsword', 'hexblade', 'pilgrim'];
// The regions after the Drowned Chapel open in build step 7. Their unlocks are known here already, so the passive-bonus
// buildings' blueprints (and the prototype tools) survive a reload.
if (typeof UNLOCKS !== 'undefined') for (const [id, name] of [['region:2', 'Thornwood opens'], ['region:3', 'The Ashen Keep opens'], ['region:4', 'The Hollow Throne opens']]) if (!UNLOCKS[id]) UNLOCKS[id] = { id, kind: 'region', name, icon: 'lantern', line: 'Its stages come in a later build.', step: 7 };

const Base = (() => {
  const store = () => (typeof Save !== 'undefined' && Save.state ? Save.state : null);
  const HOUR = BASE.HOUR;
  const now = (s = store()) => Date.now() + ((s && s.base && s.base.skew) || 0);
  const r1 = x => Math.round(x * 10) / 10;
  const rngFor = (s, key, n) => makeRng((strSeed(`${(s && s.created) || 1}:${key}:${n}`) >>> 0) || 7);
  const pickW = (rng, list) => { const tot = list.reduce((a, [, w]) => a + w, 0); let x = rng() * tot; for (const [k, w] of list) if ((x -= w) < 0) return k; return list[list.length - 1][0]; };
  const listeners = [];
  function changed(s) { listeners.forEach(fn => { try { fn(s); } catch (e) { } }); }

  // ── the save's fields, filled in where an older save lacks them
  function ensure(s = store()) {
    if (!s) return null;
    const isO = v => !!v && typeof v === 'object' && !Array.isArray(v);
    if (!isO(s.base)) s.base = {};
    const B = s.base;
    if (!isO(B.buildings)) B.buildings = {};
    if (!Array.isArray(B.plots)) B.plots = [];
    if (!Array.isArray(B.beds)) B.beds = [];
    if (!Array.isArray(B.pins)) B.pins = [];
    if (!isO(B.hall)) B.hall = {};
    if (!isO(B.done)) B.done = {};
    if (!Array.isArray(B.paid)) B.paid = [];
    if (!Number.isFinite(B.clock)) B.clock = 0;
    if (!Number.isFinite(B.skew)) B.skew = 0;
    if (!isO(s.unlocks)) s.unlocks = {};
    if (!isO(s.renown)) s.renown = { points: 0, awarded: {} };
    if (!Number.isFinite(s.renown.points)) s.renown.points = 0;
    if (!isO(s.renown.awarded)) s.renown.awarded = {};
    if (!isO(s.board)) s.board = {};
    const b = s.board;
    if (!Array.isArray(b.recruits)) b.recruits = [];
    if (!isO(b.ranks)) b.ranks = {};
    for (const k in BOARD_TRACKS) b.ranks[k] = clamp(Math.round(b.ranks[k]) || 0, 0, BOARD_TRACKS[k].ranks.length);
    if (!Number.isFinite(b.picks)) b.picks = 1;
    if (!Number.isFinite(b.refreshedAt)) b.refreshedAt = 0;
    if (typeof b.free !== 'boolean') b.free = true;
    if (!Number.isFinite(b.seq)) b.seq = 0;
    if (!isO(s.freePotion)) s.freePotion = { waiting: 0, since: 0 };
    if (!isO(s.shop)) s.shop = { stall: [], refreshedAt: 0, n: 0 };
    if (!Array.isArray(s.shop.stall)) s.shop.stall = [];
    if (!s.inventory.potions || typeof s.inventory.potions !== 'object') s.inventory.potions = {};
    // a building's record
    for (const id in B.buildings) {
      const x = B.buildings[id];
      if (!BUILDINGS[id] || !isO(x)) { delete B.buildings[id]; continue; }
      x.level = clamp(Math.round(x.level) || 0, 0, 5);
      if (!x.level) { delete B.buildings[id]; continue; }
      if (!isO(x.choices)) x.choices = {};
      if (!Number.isFinite(x.held)) x.held = 0;
      if (!Number.isFinite(x.since)) x.since = 0;
      if (!isO(x.frac)) x.frac = {};
      if (!Number.isFinite(x.n)) x.n = 0;
      if (id === 'trainingyard' && !isO(x.trainees)) x.trainees = {};
    }
    // plots: as many as Renown has cleared, each holding a building that stands on it
    const n = plotsCleared(s);
    while (B.plots.length < n) B.plots.push(null);
    B.plots = B.plots.slice(0, Math.max(n, B.plots.length)).map(p => (p && B.buildings[p] && BUILDINGS[p].plot !== false ? p : null));
    for (const id in B.buildings) if (BUILDINGS[id].plot !== false && !B.plots.includes(id)) { const i = B.plots.indexOf(null); if (i >= 0) B.plots[i] = id; else B.plots.push(id); }
    // the Recruit Board stands from the start
    if (!B.buildings.recruitboard) B.buildings.recruitboard = { level: 1, choices: {}, held: 0, since: 0, frac: {}, n: 0 };
    return s;
  }

  // ── where the road stands
  const cleared = s => (s && s.campaign && Array.isArray(s.campaign.cleared) ? s.campaign.cleared : []);
  function unlocked(id, s = store()) {
    if (!s) return false;
    if (s.unlocks && s.unlocks[id]) return true;
    const st = BASE_UNLOCK_STAGE[id];
    return !!st && cleared(s).includes(st);
  }
  const litStages = s => STAGES.filter(st => cleared(s).includes(st.id));
  // The frontier: the level and region of your highest lit stage.
  function frontier(s = store()) {
    const lit = litStages(s);
    if (!lit.length) return { level: 1, region: 0 };
    const top = lit.reduce((a, st) => ((st.level || 1) > (a.level || 1) ? st : a), lit[0]);
    return { level: top.level || 1, region: Math.max(...lit.map(st => st.region || 0)) };
  }
  // A region is reached once the boss before it falls.
  const reached = (r, s = store()) => r === 0 || unlocked('region:' + r, s) || litStages(s).some(st => (st.region || 0) >= r);
  const furthest = (s = store()) => { let r = 0; for (let k = 1; k < 5; k++) if (reached(k, s)) r = k; return r; };
  const regionCount = () => (typeof REGIONS !== 'undefined' ? REGIONS.length : 5);
  const regionName = r => ((typeof REGIONS !== 'undefined' ? REGIONS : REGION_NAMES)[r] || { name: MATERIALS[r] ? MATERIALS[r].name : 'Region ' + (r + 1) }).name;
  const highestLevel = s => Math.max(1, ...s.roster.map(c => c.level));

  // ── buildings
  const rec = (id, s = store()) => (s && s.base.buildings[id]) || null;
  const level = (id, s = store()) => { const x = rec(id, s); return x ? x.level : 0; };
  const built = (id, s = store()) => level(id, s) > 0;
  const choice = (id, lv, s = store()) => { const x = rec(id, s); return x && x.choices ? x.choices[lv] || null : null; };
  const hasChoice = (id, key, s = store()) => { const x = rec(id, s); return !!x && (x.choices[3] === key || x.choices[5] === key); };
  // Is it a blueprint you can build: unlocked by the road (its unlock, or its own id if the campaign records one).
  const blueprint = (id, s = store()) => BUILDINGS[id].plot !== false && (unlocked(BUILDINGS[id].unlock, s) || !!(s && s.unlocks && s.unlocks[id]));
  const available = (s = store()) => BUILDING_ORDER.filter(id => blueprint(id, s) && !built(id, s));
  // The cost of raising a building to a level: { gold, mat, n }.
  function cost(id, lv) {
    const D = BUILDINGS[id], [g, m] = BASE.STD[lv - 1], f = D.f || 1, x = m * f;
    return { gold: Math.round(g * f), mat: lv <= 2 ? 'bone_dust' : D.home, n: Number.isInteger(x) ? x : Math.ceil(x / 5) * 5 };
  }
  const canPay = (c, s = store()) => s.currencies.gold >= c.gold && (s.currencies.mats[c.mat] || 0) >= c.n;
  function pay(c, s) { s.currencies.gold -= c.gold; s.currencies.mats[c.mat] = (s.currencies.mats[c.mat] || 0) - c.n; }
  // What's short, in words: "120 gold and 4 Bone Dust short".
  function short(c, s = store()) {
    const g = Math.max(0, c.gold - s.currencies.gold), m = Math.max(0, c.n - (s.currencies.mats[c.mat] || 0));
    const out = [];
    if (g) out.push(`${fmt(g)} gold`);
    if (m) out.push(`${m} ${matName(c.mat)}`);
    return out.join(' and ');
  }
  const matName = id => (MATERIALS.find(m => m.id === id) || { name: id }).name;
  // Builds a blueprint on a plot. Returns true if it stood up.
  function build(id, plot, s = store()) {
    const D = BUILDINGS[id];
    if (!D || D.plot === false || built(id, s) || !blueprint(id, s)) return false;
    if (!(plot >= 0 && plot < plotsCleared(s)) || s.base.plots[plot]) return false;
    const c = cost(id, 1);
    if (!canPay(c, s)) return false;
    pay(c, s);
    const t = now(s);
    s.base.buildings[id] = { level: 1, plot, focus: D.focus ? D.focus[0][0] + (D.kinds ? ':stun' : '') : null, choices: {}, since: t, held: 0, full: 0, frac: {}, n: 0 };
    if (id === 'trainingyard') s.base.buildings[id].trainees = {};
    if (id === 'scavengercamp') s.base.buildings[id].focus = 'r0';
    s.base.plots[plot] = id;
    award('bld:' + id + ':1', BASE.RENOWN.built, s);
    built1(id, s);
    changed(s);
    return true;
  }
  // What happens the moment a building rises or levels up.
  function built1(id, s) {
    if (id === 'tactician') teach(s);
    if (id === 'tactician' || id === 'barracks') syncSlots(s);
    if (id === 'infirmary') Fatigue.fillBeds(s);
    if (id === 'shop') { const sh = s.shop; if (!sh.refreshedAt) restock(s); }
  }
  // The next level: its cost, and the fork to choose from at levels 3 and 5.
  function next(id, s = store()) {
    const lv = level(id, s), D = BUILDINGS[id];
    if (!lv || lv >= 5 || id === 'recruitboard') return null;
    const c = cost(id, lv + 1);
    return { level: lv + 1, cost: c, fork: D.choices && D.choices[lv + 1] ? D.choices[lv + 1] : null, can: canPay(c, s), short: short(c, s) };
  }
  function upgrade(id, pick, s = store()) {
    const n = next(id, s);
    if (!n || !n.can || (n.fork && !n.fork.some(([k]) => k === pick))) return false;
    tickTo(now(s), s);
    collect(id, s);
    pay(n.cost, s);
    const x = rec(id, s);
    x.level = n.level;
    if (n.fork) x.choices[n.level] = pick;
    award('bld:' + id + ':' + n.level, BASE.RENOWN.up * n.level, s);
    built1(id, s);
    changed(s);
    return true;
  }
  // Switching a level's choice later costs that level's price again.
  function rechoose(id, lv, pick, s = store()) {
    const x = rec(id, s), D = BUILDINGS[id];
    if (!x || x.level < lv || !D.choices || !D.choices[lv] || x.choices[lv] === pick || !D.choices[lv].some(([k]) => k === pick)) return false;
    const c = cost(id, lv);
    if (!canPay(c, s)) return false;
    tickTo(now(s), s);
    collect(id, s);
    pay(c, s);
    x.choices[lv] = pick;
    changed(s);
    return true;
  }
  // Tearing down frees the plot and gives nothing back. What it taught stays; what it provides goes.
  function tearDown(id, s = store()) {
    const x = rec(id, s);
    if (!x || BUILDINGS[id].plot === false) return false;
    tickTo(now(s), s);
    collect(id, s);
    if (id === 'infirmary') { collectBrew(s); s.base.beds = []; }
    if (id === 'mastershall') for (const cid in s.base.hall) cancelLesson(cid, s);
    const i = s.base.plots.indexOf(id);
    if (i >= 0) s.base.plots[i] = null;
    delete s.base.buildings[id];
    if (id === 'tactician' || id === 'barracks') syncSlots(s);
    changed(s);
    return true;
  }
  function setFocus(id, focus, s = store()) {
    const x = rec(id, s);
    if (!x || x.focus === focus) return false;
    tickTo(now(s), s);
    collect(id, s); // stored gains keep the old focus
    x.focus = focus;
    changed(s);
    return true;
  }

  // ── plots and Renown (home-base spec §8)
  // Renown n to n + 1 takes 100 × (n + 2).
  function renown(s = store()) {
    let L = 1, p = (s && s.renown.points) || 0;
    while (p >= 100 * (L + 2)) { p -= 100 * (L + 2); L++; }
    const need = 100 * (L + 2), nextPlot = BASE.PLOT_RENOWN.find(r => r > L);
    return { level: L, into: p, need, points: (s && s.renown.points) || 0, nextPlot: nextPlot || null, plots: plotsFor(L) };
  }
  const plotsFor = L => BASE.START_PLOTS + BASE.PLOT_RENOWN.filter(r => r <= L).length;
  const plotsCleared = (s = store()) => plotsFor(renown(s).level);
  const renownFor = plot => (plot < BASE.START_PLOTS ? 0 : BASE.PLOT_RENOWN[plot - BASE.START_PLOTS]);
  // Renown, once per key (a key of null always counts). Returns the points given.
  function award(key, pts, s = store(), why) {
    if (!s || !(pts > 0)) return 0;
    if (key) { if (s.renown.awarded[key]) return 0; s.renown.awarded[key] = 1; }
    const before = renown(s);
    s.renown.points = Math.round((s.renown.points + pts) * 100) / 100;
    const after = renown(s);
    if (after.plots > before.plots) { ensure(s); s.renown.newPlot = after.plots; }
    if (after.level > before.level) s.renown.up = after.level;
    return pts;
  }

  // ── slots the buildings give: the Tactician's party rule and loadout slots, the Barracks' roster cap
  const partySlots = (s = store()) => BLV.partySlots[level('tactician', s)];
  const loadoutSlots = (s = store()) => BLV.loadoutSlots[level('tactician', s)];
  const rosterCap = (s = store()) => BLV.roster[level('barracks', s)];
  function syncSlots(s = store()) {
    if (typeof Tactics === 'undefined' || !Tactics.setSlots) return;
    const floor = (s.base.legacySlots || {});
    Tactics.setSlots(Math.max(partySlots(s), floor.party || 0), Math.max(loadoutSlots(s), floor.loadout || 0));
  }
  // The Tactician's lessons: every condition of each lesson its level has reached. Tactician I is the 1-11 clear's; it is
  // taught here too for a save that recorded the clear without it (made while the building taught it, or before “out of
  // an item” joined it), and for the prototype's blueprints.
  function teach(s = store()) {
    if (typeof Tactics === 'undefined' || !s) return;
    const keys = [], add = id => { if (CONDITIONS[id]) for (const v of Tactics.variants(id)) keys.push(Tactics.condKey(v)); };
    if (unlocked('tactician', s) && typeof TACTICIAN_I !== 'undefined') for (const id of TACTICIAN_I.concat(['self_hp_lt', 'ally_hp_lt', 'foe_hp_lt', 'self_mp_lt', 'bb_fatigue'])) add(id);
    for (const lv in TACTICIAN_LESSONS) if (level('tactician', s) >= +lv) TACTICIAN_LESSONS[lv].conds.forEach(add);
    if (Tactics.learnMany) Tactics.learnMany(keys); else keys.forEach(k => Tactics.learn(k));
  }

  // ── passive-bonus buildings (home-base spec §3): what every hero gets in battle
  function bonuses(s = store()) {
    const out = { pow: 0, crit: 0, hp: 0, def: 0, land: {}, res: {} };
    if (!s) return out;
    const lv = id => level(id, s), f = id => (rec(id, s) || {}).focus || '';
    if (lv('whetstone')) { if (f('whetstone') === 'point') out.crit += lv('whetstone'); else out.pow += 0.02 * lv('whetstone'); }
    if (lv('ossuary')) { if (f('ossuary') === 'shell') out.def += 0.02 * lv('ossuary'); else out.hp += 0.02 * lv('ossuary'); }
    const kind = id => f(id).split(':')[1] || 'stun';
    if (lv('hexingstone')) { if (f('hexingstone').startsWith('deep')) out.land[kind('hexingstone')] = 4 * lv('hexingstone'); else out.land.all = 2 * lv('hexingstone'); }
    if (lv('belltower')) { if (f('belltower').startsWith('deep')) out.res[kind('belltower')] = 4 * lv('belltower'); else for (const k of RES_KEYS) out.res[k] = 2 * lv('belltower'); }
    return out;
  }

  // ── idle buildings (home-base spec §4)
  const storeHours = (id, s = store()) => {
    const D = BUILDINGS[id];
    if (!D.idle) return 0;
    let h = BASE.STORE;
    if (D.choices && choice(id, 3, s) === D.choices[3][0][0]) h += 4;
    if (D.choices && choice(id, 5, s) === D.choices[5][0][0]) h += 12;
    return h;
  };
  // Output per hour for the building's focus, before storage: { gold, items, mats: { id: n }, rolls, xp (per trainee,
  // in levels' worth at their level) }.
  function rates(id, s = store()) {
    const lv = level(id, s), x = rec(id, s), out = {};
    if (!lv) return out;
    if (id === 'tollhouse') {
      const both = hasChoice(id, 'bothways', s), k = hasChoice(id, 'busyroad', s) ? 1.3 : 1;
      const S = BASE_S(frontier(s).level);
      if (both || x.focus !== 'kind') out.gold = BLV.toll[lv] * S * k * (both ? 0.6 : 1);
      if (both || x.focus === 'kind') out.items = BLV.kind[lv] * k * (both ? 0.6 : 1);
    } else if (id === 'scavengercamp') {
      const k = hasChoice(id, 'keeneye', s) ? 0.8 : 1, wide = hasChoice(id, 'widenet', s);
      const regs = scavRegions(s);
      out.mats = {};
      for (const r of regs) out.mats[MATERIALS[r].id] = BLV.scav[lv] * k * (wide && regs.length > 1 ? 0.6 : 1);
      out.rare = (hasChoice(id, 'keeneye', s) ? 0.1 : 0.05);
    } else if (id === 'salvagepit') {
      out.rolls = BLV.pit[lv] * (hasChoice(id, 'sifters', s) ? 0.6 : hasChoice(id, 'finemesh', s) ? 0.7 : 1);
    } else if (id === 'trainingyard') {
      out.xp = 0.1 * (hasChoice(id, 'harddrills', s) ? 1.5 : 1);
    }
    return out;
  }
  // The regions the Scavenger Camp works: its focus, and with Wide Net a second.
  function scavRegions(s = store()) {
    const x = rec('scavengercamp', s);
    if (!x) return [];
    const [a, b] = String(x.focus || 'r0').split(',').map(t => clamp(parseInt(t.replace('r', ''), 10) || 0, 0, MATERIALS.length - 1));
    const out = [reached(a, s) ? a : 0];
    if (hasChoice('scavengercamp', 'widenet', s) && b != null && reached(b, s) && b !== out[0]) out.push(b);
    return out;
  }
  // Trainees: who trains in the yard (up to its trainee count).
  const trainees = (s = store()) => { const x = rec('trainingyard', s); return x ? Object.keys(x.trainees || {}).filter(id => s.roster.some(c => c.id === id)) : []; };
  const yardCap = (s = store()) => BLV.yard[level('trainingyard', s)];
  function setTrainee(cid, on, s = store()) {
    const x = rec('trainingyard', s);
    if (!x) return false;
    tickTo(now(s), s);
    if (on) {
      if (x.trainees[cid] || trainees(s).length >= yardCap(s) || s.base.hall[cid]) return false;
      x.trainees[cid] = { held: 0, frac: 0 };
      s.base.beds = s.base.beds.map(b => (b === cid ? null : b));
    } else {
      if (!x.trainees[cid]) return false;
      collectTrainee(cid, s);
      delete x.trainees[cid];
    }
    Fatigue.fillBeds(s);
    changed(s);
    return true;
  }
  // The ceiling: a trainee stops gaining XP at the level of your highest lit stage.
  const yardCeiling = (s = store()) => frontier(s).level;

  // Brings production up to time t for everything that runs on the clock. Rest and lessons go through Fatigue, which
  // calls span() for each stretch of constant rates.
  function span(s, t0, t1, o = {}) {
    const ms = t1 - t0;
    if (!(ms > 0)) return;
    // held grows until the storage is full; full is the moment it filled
    const grow = (x, cap) => {
      if (x.held >= cap) return;
      const before = x.held;
      x.held = Math.min(cap, before + ms);
      if (x.held >= cap) x.full = t0 + (cap - before);
    };
    for (const id of ['tollhouse', 'scavengercamp', 'salvagepit']) { const x = rec(id, s); if (x) grow(x, storeHours(id, s) * HOUR); }
    const y = rec('trainingyard', s);
    if (y) {
      const cap = storeHours('trainingyard', s) * HOUR;
      for (const cid of trainees(s)) {
        const c = s.roster.find(x => x.id === cid);
        if (c && Fatigue.where(c, s, o) === 'yard') grow(y.trainees[cid], cap);
      }
    }
  }

  // What a building would give if collected now: [{ icon, text, n, kind }], without changing anything (dry), or for
  // real. Rolls come from seeded randomness, keyed by the building's own counter, so a reload gives the same.
  function harvest(id, s, dry) {
    const x = rec(id, s), out = [];
    if (!x) return out;
    const h = x.held / HOUR, R = rates(id, s), frac = Object.assign({}, x.frac);
    let n = x.n;
    const take = (k, amt) => { const v = (frac[k] || 0) + amt, whole = Math.floor(v + 1e-9); frac[k] = v - whole; return whole; };
    const items = {}, mats = {}, gear = [];
    let gold = 0;
    if (id === 'tollhouse') {
      if (R.gold) gold = take('gold', R.gold * h);
      if (R.items) { const k = take('items', R.items * h); for (let i = 0; i < k; i++) { const it = pickW(rngFor(s, id, n++), BASE.ITEM_ODDS); items[it] = (items[it] || 0) + 1; } }
    } else if (id === 'scavengercamp') {
      for (const m in R.mats || {}) mats[m] = take(m, R.mats[m] * h);
      // rare finds: one chance for each whole hour of scavenging
      const hours = take('hours', h);
      for (let i = 0; i < hours; i++) {
        const rng = rngFor(s, id, n++);
        if (rng() >= R.rare) continue;
        if (rng() < 0.7) { const it = pickW(rng, BASE.ITEM_ODDS); items[it] = (items[it] || 0) + 1; }
        else {
          const r = scavRegions(s)[0], lit = STAGES.filter(st => (st.region || 0) === r && cleared(s).includes(st.id));
          const L = lit.length ? Math.max(...lit.map(st => st.level || 1)) : frontier(s).level;
          gear.push(Items.roll(L, r, rng, { classes: s.roster.map(c => c.cls) }));
        }
      }
    } else if (id === 'salvagepit') {
      const k = take('rolls', (R.rolls || 0) * h), F = frontier(s);
      for (let i = 0; i < k; i++) {
        const rng = rngFor(s, id, n++), o = { classes: s.roster.map(c => c.cls) };
        if (x.focus && x.focus !== 'any') o.slot = x.focus;
        const od = Items.odds(F.region);
        if (hasChoice(id, 'sifters', s)) { const m = Math.min(15, od.common); od.common -= m; od.rare += m; }
        if (hasChoice(id, 'finemesh', s)) { od.fine += od.common; od.common = 0; }
        o.rarity = pickW(rng, [['common', od.common], ['fine', od.fine], ['rare', od.rare]]);
        gear.push(Items.roll(F.level, F.region, rng, o));
      }
    }
    if (gold) out.push({ kind: 'gold', icon: 'coin', n: gold, text: `+${fmt(gold)} gold` });
    for (const m in mats) if (mats[m]) out.push({ kind: 'mat', mat: m, icon: matIcon(m), n: mats[m], text: `+${mats[m]} ${matName(m)}` });
    for (const it in items) out.push({ kind: 'item', item: it, icon: ITEMS[it].icon, n: items[it], text: `+${items[it]} ${ITEMS[it].name}` });
    for (const g of gear) out.push({ kind: 'gear', piece: g, icon: 'bag', n: 1, text: `${RARITY_NAMES[Items.rarity(g)]} · ${GEAR[g.id].name}` });
    if (!dry) {
      s.currencies.gold += gold;
      for (const m in mats) s.currencies.mats[m] = (s.currencies.mats[m] || 0) + mats[m];
      for (const it in items) s.inventory.potions[it] = (s.inventory.potions[it] || 0) + items[it];
      for (const g of gear) { const got = Items.add(s, g); if (got.sold) { const o = out.find(z => z.piece === g); o.text += ` · sold for ${got.sold} gold, the Bag is full`; } }
      x.held = 0; x.full = 0; x.frac = frac; x.n = n;
    }
    return out;
  }
  const matIcon = m => ({ bone_dust: 'bone', chapel_wax: 'wax', heartwood: 'wood', cinder_iron: 'iron', throne_tallow: 'tallow' }[m] || 'bone');
  // A trainee's stored XP, collected into them: the XP, levels gained and thresholds passed.
  function collectTrainee(cid, s, dry) {
    const y = rec('trainingyard', s), T = y && y.trainees[cid], c = s.roster.find(x => x.id === cid);
    if (!T || !c) return null;
    const ceil = yardCeiling(s), mentors = hasChoice('trainingyard', 'mentors', s) && c.level <= highestLevel(s) - 10;
    const per = rates('trainingyard', s).xp * (mentors ? 2 : 1);
    // hour by hour, at the trainee's level as it rises, up to the ceiling
    const sim = dry ? JSON.parse(JSON.stringify(c)) : c;
    let left = T.held / HOUR, xp = 0;
    const from = sim.level, out = { c, xp: 0, from, to: from, capped: false, g: null };
    while (left > 1e-9 && sim.level < ceil) {
      const step = Math.min(1, left);
      const amt = per * Hero.xpToNext(sim.level) * step;
      const g = Hero.gainXp(sim, amt, { quiet: !!dry });
      if (!out.g) out.g = g; else { out.g.to = g.to; out.g.skillPts += g.skillPts; out.g.thresholds.push(...g.thresholds); out.g.slots += g.slots; }
      xp += amt; left -= step;
    }
    if (sim.level >= ceil) { out.capped = true; if (sim.level > ceil) { /* never trains past it */ } }
    out.xp = Math.round(xp); out.to = sim.level;
    if (!dry) { T.held = 0; T.full = 0; }
    return out;
  }
  function collect(id, s = store()) {
    const x = rec(id, s);
    if (!x) return [];
    if (id === 'trainingyard') return trainees(s).map(cid => collectTrainee(cid, s)).filter(Boolean).map(t => ({ kind: 'xp', c: t.c, n: t.xp, from: t.from, to: t.to, text: `${t.c.name} · +${fmt(t.xp)} XP` }));
    if (id === 'infirmary') return collectBrew(s);
    if (!BUILDINGS[id].idle) return [];
    return harvest(id, s, false);
  }
  // Everything waiting: the idle buildings, the still-room and the free draughts.
  function preview(id, s = store()) {
    if (id === 'trainingyard') return trainees(s).map(cid => collectTrainee(cid, s, true)).filter(t => t && t.xp > 0).map(t => ({ kind: 'xp', c: t.c, n: t.xp, from: t.from, to: t.to, capped: t.capped, text: `${t.c.name} · +${fmt(t.xp)} XP` }));
    if (id === 'infirmary') return brewWaiting(s);
    return BUILDINGS[id].idle ? harvest(id, s, true) : [];
  }
  // How full a building is: { held, cap, pct, fullFor (ms it has been full), fullIn (ms until full) }.
  function storage(id, s = store()) {
    const x = rec(id, s);
    if (!x || !BUILDINGS[id].idle) return null;
    const cap = storeHours(id, s) * HOUR;
    let held = x.held, full = x.full;
    if (id === 'trainingyard') { const ts = trainees(s).map(cid => x.trainees[cid]); held = ts.length ? Math.max(...ts.map(T => T.held)) : 0; full = ts.length ? Math.max(0, ...ts.map(T => T.full || 0)) : 0; }
    const t = now(s);
    return { held, cap, pct: cap ? held / cap : 0, fullFor: held >= cap && full ? Math.max(0, t - full) : 0, fullIn: Math.max(0, cap - held) };
  }

  // ── the Infirmary's still-room (level 3+): Healing Draughts every 6 hours, up to 4; Smelling Salts every 24 at level 5
  const BREW = { draught: { every: 6, max: 4, from: 3 }, salts: { every: 24, max: 2, from: 5 } };
  function brewTick(s, t) {
    const x = rec('infirmary', s);
    if (!x) return;
    if (!x.brew || typeof x.brew !== 'object') x.brew = {};
    for (const k in BREW) {
      const B = BREW[k];
      if (x.level < B.from) continue;
      const b = x.brew[k] || (x.brew[k] = { n: 0, since: t });
      if (b.n >= B.max) { b.since = t; continue; }
      while (b.n < B.max && t - b.since >= B.every * HOUR) { b.n++; b.since += B.every * HOUR; }
      if (b.n >= B.max) b.since = t;
    }
  }
  function brewWaiting(s = store()) {
    const x = rec('infirmary', s);
    if (!x || !x.brew) return [];
    return Object.keys(BREW).filter(k => x.brew[k] && x.brew[k].n > 0).map(k => ({ kind: 'item', item: k, icon: ITEMS[k].icon, n: x.brew[k].n, text: `+${x.brew[k].n} ${ITEMS[k].name}` }));
  }
  function collectBrew(s = store()) {
    const out = brewWaiting(s), x = rec('infirmary', s);
    for (const g of out) { s.inventory.potions[g.item] = (s.inventory.potions[g.item] || 0) + g.n; x.brew[g.item].n = 0; x.brew[g.item].since = now(s); }
    return out;
  }

  // ── the free Healing Draught by the fire: one every 4 hours, up to 3 waiting, from the first clear of 1-3
  function potionTick(s, t) {
    const P = s.freePotion;
    if (!unlocked('items', s)) { P.since = 0; return; }
    if (!P.since) P.since = t;
    if (P.waiting >= BASE.POTION.max) { P.since = t; return; }
    const every = BASE.POTION.every * HOUR;
    while (P.waiting < BASE.POTION.max && t - P.since >= every) { P.waiting++; P.since += every; }
    if (P.waiting >= BASE.POTION.max) P.since = t;
  }
  const potionIn = (s = store()) => { const P = s.freePotion; return !unlocked('items', s) || P.waiting >= BASE.POTION.max ? null : Math.max(0, P.since + BASE.POTION.every * HOUR - now(s)); };
  function collectPotions(s = store()) {
    const n = s.freePotion.waiting;
    if (!n) return 0;
    s.inventory.potions.draught = (s.inventory.potions.draught || 0) + n;
    if (n >= BASE.POTION.max) s.freePotion.since = now(s);
    s.freePotion.waiting = 0;
    changed(s);
    return n;
  }

  // ── the Shop (home-base spec §5)
  const shopLevel = (s = store()) => level('shop', s);
  // A party item's price now: Region I's, stepping up with your furthest region, less 15% at Shop level 4.
  const itemPrice = (id, s = store()) => Math.round(BASE.SHOP[id] * BASE.REGION_PRICE[Math.min(furthest(s), BASE.REGION_PRICE.length - 1)] * (shopLevel(s) >= 4 ? 0.85 : 1));
  const itemSell = (id, s = store()) => Math.max(1, Math.round(BASE.SHOP[id] * BASE.REGION_PRICE[Math.min(furthest(s), BASE.REGION_PRICE.length - 1)] * BASE.ITEM_SELL));
  const shopItems = (s = store()) => BLV.shopItems[shopLevel(s)].map(id => ({ id, price: itemPrice(id, s), have: s.inventory.potions[id] || 0 }));
  function buyItem(id, n = 1, s = store()) {
    if (!BLV.shopItems[shopLevel(s)].includes(id)) return false;
    const price = itemPrice(id, s) * n;
    if (s.currencies.gold < price) return false;
    s.currencies.gold -= price;
    s.inventory.potions[id] = (s.inventory.potions[id] || 0) + n;
    changed(s);
    return true;
  }
  // Selling a party item from the Bag needs no Shop.
  function sellItem(id, s = store()) {
    if (!(s.inventory.potions[id] > 0)) return 0;
    const g = itemSell(id, s);
    s.inventory.potions[id]--;
    s.currencies.gold += g;
    changed(s);
    return g;
  }
  // The gear stall: 2 to 4 rolls at the frontier's level and region, each at 4 times its sell price; it refreshes every
  // 8 hours. At Shop level 5 at least one is Fine or better.
  function restock(s = store()) {
    const sh = s.shop, F = frontier(s), n = BLV.stall[shopLevel(s)];
    sh.stall = [];
    for (let i = 0; i < n; i++) {
      const rng = rngFor(s, 'stall', sh.n++), o = { classes: s.roster.map(c => c.cls) };
      if (i === 0 && shopLevel(s) >= 5) o.rarity = rng() < 0.75 ? 'fine' : 'rare';
      sh.stall.push(Items.roll(F.level, F.region, rng, o));
    }
    sh.refreshedAt = now(s);
  }
  const stallPrice = (x, s = store()) => 4 * Items.sellPrice(x, null);
  const stallIn = (s = store()) => (shopLevel(s) ? Math.max(0, s.shop.refreshedAt + BASE.STALL_EVERY * HOUR - now(s)) : null);
  // Buying needs room in the Bag: a bought piece never sells where it lands.
  function buyGear(uid, s = store()) {
    const i = s.shop.stall.findIndex(x => x.uid === uid);
    if (i < 0 || Items.room(s) <= 0) return false;
    const x = s.shop.stall[i], p = stallPrice(x, s);
    if (s.currencies.gold < p) return false;
    s.currencies.gold -= p;
    s.shop.stall.splice(i, 1);
    Items.add(s, x);
    changed(s);
    return x;
  }

  // ── the Recruit Board (home-base spec §3, §7)
  const boardOpen = (s = store()) => unlocked('recruitboard', s) || s.roster.length > 1;
  const boardSize = (s = store()) => BASE.BOARD.size + s.board.ranks.notices;
  const boardPicks = (s = store()) => 1 + s.board.ranks.picks;
  // The classes on the board: the six original ones, and the new six as the road brings them.
  const boardClasses = (s = store()) => CLASS_ORDER.filter(k => !CLASS_JOINS[k] || unlocked(CLASS_JOINS[k], s));
  // A recruit's quality: how well their stats rolled within their class's ranges, 0 (worst) to 1 (best).
  function quality(cls, base) {
    const C = CLASSES[cls];
    let q = 0, n = 0;
    for (const k of STAT_KEYS) { const [a, b] = C.stats[k]; if (b > a) { q += clamp((base[k] - a) / (b - a), 0, 1); n++; } }
    return n ? q / n : 0.5;
  }
  const qualityFactor = q => 0.9 + 0.35 * q;
  function recruitPrice(r, s = store()) {
    if (s.board.free) return 0;
    return Math.round(BASE.RECRUIT * BASE_S(r.level) * qualityFactor(r.q) * (r.storied ? 1.5 : 1));
  }
  // A new board: recruits of the classes on offer, at most 2 of one class. The first board after the first pick shows
  // the two starting classes you didn't pick, and one other.
  function rollBoard(s = store(), why = 'timer') {
    const b = s.board, rng = rngFor(s, 'board', b.seq++), size = boardSize(s), classes = boardClasses(s);
    const vet = b.ranks.veterans, capPct = BOARD_TRACKS.veterans.cap[vet], best = highestLevel(s);
    const used = {}, names = new Set(s.roster.map(c => c.name));
    const out = [];
    let first = Array.isArray(b.first) ? b.first.slice() : null;
    for (let i = 0; i < size; i++) {
      let cls = first && first.length ? first.shift() : null;
      if (!cls) { const pool = classes.filter(k => (used[k] || 0) < BASE.BOARD.sameClass); cls = pool[Math.floor(rng() * pool.length)] || classes[0]; }
      used[cls] = (used[cls] || 0) + 1;
      const cap = capPct ? Math.max(1, Math.floor(best * capPct)) : 1;
      const lv = cap > 1 ? clamp(Math.round(cap / 2 + rng() * (cap - cap / 2)), 1, cap) : 1;
      const base = Hero.roll(cls, rng);
      let name = RECRUIT_NAMES[Math.floor(rng() * RECRUIT_NAMES.length)];
      for (let k = 0; names.has(name) && k < 20; k++) name = RECRUIT_NAMES[Math.floor(rng() * RECRUIT_NAMES.length)];
      names.add(name);
      const r = { id: 'r' + b.seq + '-' + i, cls, name, level: lv, base, q: Math.round(quality(cls, base) * 100) / 100 };
      // storied recruits, from the top Veterans rank
      if (vet >= 4) {
        if (lv >= 50 && rng() < 0.25) { const others = classes.filter(k => k !== cls); r.storied = { combine: others[Math.floor(rng() * others.length)] }; }
        else if (lv >= 100 && rng() < 0.25) r.storied = { awaken: true };
      }
      out.push(r);
    }
    b.first = null;
    b.recruits = out;
    b.picks = boardPicks(s);
    b.refreshedAt = now(s);
    b.pending = false;
    b.fresh = why;
    changed(s);
    return out;
  }
  const boardIn = (s = store()) => Math.max(0, s.board.refreshedAt + BASE.BOARD.every * HOUR - now(s));
  function boardTick(s, t) {
    if (!boardOpen(s)) return;
    if (!s.board.refreshedAt) { rollBoard(s, 'open'); return; }
    if (t - s.board.refreshedAt >= BASE.BOARD.every * HOUR) rollBoard(s, 'timer'); // once, however long you were away
  }
  // The party came home after a battle: a new board.
  function home(trip, s = store()) {
    if (!s) return;
    ensure(s);
    if (boardOpen(s) && (!trip || trip.battles > 0)) rollBoard(s, 'home');
    Fatigue.fillBeds(s);
  }
  const canHire = (s = store()) => s.roster.length < rosterCap(s);
  // Hires a recruit from the board: they join the roster, and the formation if there's room.
  function hire(rid, s = store()) {
    const b = s.board, i = b.recruits.findIndex(r => r.id === rid);
    if (i < 0 || b.picks <= 0 || !canHire(s) || !boardOpen(s)) return null;
    const r = b.recruits[i], price = recruitPrice(r, s);
    if (s.currencies.gold < price) return null;
    s.currencies.gold -= price;
    if (b.free) b.free = false;
    const c = Hero.create(r.cls, 'c' + s.nextId++, { name: r.name, base: r.base });
    if (r.level > 1) {
      Hero.gainXp(c, Hero.xpBetween(1, r.level), { quiet: true });
      if (r.storied && r.storied.combine) {
        const t = HERO.COMBINE_AT.find(x => x <= c.level && Hero.pending(c).includes(x));
        if (t) Hero.choose(c, t, { kind: 'combine', cls: r.storied.combine });
      }
      if (r.storied && r.storied.awaken) { const t = Hero.pending(c).find(x => x >= HERO.AWAKEN_FROM); if (t) Hero.choose(c, t, { kind: 'awaken' }); }
      Hero.autoBuild(c);
      c.respecs = Math.max(c.respecs, 1);
    }
    s.roster.push(c);
    b.recruits.splice(i, 1);
    b.picks--;
    if (!s.renown.awarded['cls:' + r.cls]) award('cls:' + r.cls, BASE.RENOWN.cls, s);
    place(c, s);
    changed(s);
    return c;
  }
  // Puts a character into an empty formation slot: their usual row first.
  function place(c, s = store()) {
    if (s.party.includes(c.id)) return true;
    const front = CLASSES[c.cls].row === 'front', order = front ? [0, 1, 2, 3, 4, 5] : [2, 3, 4, 5, 0, 1];
    const i = order.find(k => !s.party[k]);
    if (i == null) return false;
    s.party[i] = c.id;
    return true;
  }
  function buyRank(track, s = store()) {
    const T = BOARD_TRACKS[track], r = s.board.ranks[track];
    if (!T || r >= T.ranks.length) return false;
    const [g, m] = T.ranks[r], c = { gold: g, mat: 'bone_dust', n: m };
    if (!canPay(c, s)) return false;
    pay(c, s);
    s.board.ranks[track] = r + 1;
    if (track === 'notices') { const extra = boardSize(s) - s.board.recruits.length; if (extra > 0 && s.board.recruits.length) { /* the next board shows more */ } }
    if (track === 'picks') s.board.picks++;
    award(`rank:${track}:${r + 1}`, BASE.RENOWN.up * (r + 2), s);
    changed(s);
    return true;
  }
  const rankCost = (track, s = store()) => { const T = BOARD_TRACKS[track], r = s.board.ranks[track]; return r >= T.ranks.length ? null : { gold: T.ranks[r][0], mat: 'bone_dust', n: T.ranks[r][1] }; };

  // ── dismissing (home-base spec §7): their gear goes back to the Bag, and nothing else comes back
  function whyNotDismiss(c, s = store()) {
    if (s.roster.length <= 1) return 'They’re your last hero.';
    if (Fatigue.where(c, s) === 'road') return 'They’re out on the road.';
    if (s.base.hall[c.id]) return 'They’re at a Masters’ Hall lesson. Cancel it first.';
    return '';
  }
  function dismiss(cid, s = store()) {
    const c = s.roster.find(x => x.id === cid);
    if (!c || whyNotDismiss(c, s)) return false;
    for (const k of SLOTS) Items.unequip(s, c, k);
    s.roster = s.roster.filter(x => x.id !== cid);
    s.party = s.party.map(x => (x === cid ? null : x));
    s.base.beds = s.base.beds.map(x => (x === cid ? null : x));
    s.base.pins = s.base.pins.filter(x => x !== cid);
    const y = rec('trainingyard', s);
    if (y && y.trainees[cid]) delete y.trainees[cid];
    if (s.tactics && s.tactics.heroes) delete s.tactics.heroes[cid];
    changed(s);
    return true;
  }

  // ── the Masters' Hall (home-base spec §9)
  const rooms = (s = store()) => BLV.rooms[level('mastershall', s)];
  const inHall = (s = store()) => Object.keys(s.base.hall).filter(id => s.roster.some(c => c.id === id));
  const lessonHours = (L, s = store()) => L.hours * (level('mastershall', s) >= 5 ? 0.75 : 1);
  // The lessons a character can take next: the next rule slot and the next skill slot, with why not, if not.
  function lessonsFor(c, s = store()) {
    const out = [];
    const ruleNext = LESSONS['rule' + (4 + (c.lessons.rule || 0))], skillNext = LESSONS['skill' + (1 + (c.lessons.skill || 0))];
    for (const L of [ruleNext, skillNext]) {
      if (!L) continue;
      const key = c.id + ':' + L.id, paid = s.base.paid.includes(key), done = s.base.done[key] || 0;
      let why = '';
      if (L.kind === 'rule' && Hero.ruleSlots(c) >= Hero.ruleMax(c)) continue; // the class's maximum
      if (level('mastershall', s) < L.hall) why = `The Hall teaches it from level ${L.hall}`;
      else if (c.level < L.level) why = `From level ${L.level}`;
      else if (!paid && s.currencies.gold < L.gold) why = `${fmt(L.gold - s.currencies.gold)} gold short`;
      out.push({ L, why, paid, done, need: lessonHours(L, s) * HOUR, gold: paid ? 0 : L.gold });
    }
    return out;
  }
  function whyNotStudy(c, s = store()) {
    if (!built('mastershall', s)) return 'Build the Masters’ Hall first.';
    if (s.base.hall[c.id]) return 'Already at a lesson.';
    if (Fatigue.where(c, s) === 'road') return 'Out on the road.';
    if (inHall(s).length >= rooms(s)) return 'Every room is taken.';
    return '';
  }
  function startLesson(cid, lid, s = store()) {
    const c = s.roster.find(x => x.id === cid), L = LESSONS[lid];
    if (!c || !L || whyNotStudy(c, s)) return false;
    const o = lessonsFor(c, s).find(x => x.L.id === lid);
    if (!o || o.why) return false;
    tickTo(now(s), s);
    if (!o.paid) { s.currencies.gold -= L.gold; s.base.paid.push(c.id + ':' + lid); }
    const slot = s.party.indexOf(cid);
    s.party = s.party.map(x => (x === cid ? null : x));
    s.base.beds = s.base.beds.map(x => (x === cid ? null : x));
    s.base.hall[cid] = { id: lid, since: now(s), need: o.need, done: o.done, slot };
    Fatigue.fillBeds(s);
    changed(s);
    return true;
  }
  // How far a lesson has come: { L, pct, left (ms), end }.
  function lessonOf(cid, s = store()) {
    const x = s.base.hall[cid];
    if (!x) return null;
    const t = now(s), got = x.done + (t - x.since);
    return { L: LESSONS[x.id], pct: clamp(got / x.need, 0, 1), left: Math.max(0, x.need - got), end: x.since + x.need - x.done };
  }
  const lessonEnd = (cid, s) => { const x = s.base.hall[cid]; return x ? x.since + x.need - x.done : Infinity; };
  // Cancel brings them home. Progress is kept, and the gold was only paid once.
  function cancelLesson(cid, s = store()) {
    const x = s.base.hall[cid];
    if (!x) return false;
    s.base.done[cid + ':' + x.id] = x.done + Math.max(0, now(s) - x.since);
    delete s.base.hall[cid];
    comeBack(cid, x.slot, s);
    changed(s);
    return true;
  }
  // A lesson finished at time t: the slot is theirs for good, and they come back to camp.
  function finishLesson(cid, s, t) {
    const x = s.base.hall[cid], c = s.roster.find(y => y.id === cid);
    if (!x || !c) { delete s.base.hall[cid]; return null; }
    const L = LESSONS[x.id];
    if (L.kind === 'rule') c.lessons.rule = Math.max(c.lessons.rule || 0, L.n);
    else c.lessons.skill = Math.max(c.lessons.skill || 0, L.n);
    Hero.fixEquip(c);
    delete s.base.hall[cid];
    delete s.base.done[cid + ':' + x.id];
    award('lesson:' + cid + ':' + x.id, BASE.RENOWN.lesson, s);
    comeBack(cid, x.slot, s);
    (s.base.learned || (s.base.learned = [])).push({ c: cid, id: x.id, at: t });
    return { c, L };
  }
  // Back from the Hall: into their old formation slot if it's still free.
  function comeBack(cid, slot, s) {
    const c = s.roster.find(x => x.id === cid);
    if (!c || s.party.includes(cid)) return;
    if (slot >= 0 && slot < 6 && !s.party[slot]) s.party[slot] = cid; else place(c, s);
  }

  // ── the Shrine (home-base spec §3): a respec for 150 × S at the character's level, less at higher levels
  const shrine = (s = store()) => level('shrine', s);
  function respecPrice(c, s = store()) {
    const k = shrine(s) >= 5 ? 0.5 : shrine(s) >= 2 ? 0.75 : 1;
    return Math.round(BASE.RESPEC * BASE_S(c.level) * k);
  }
  const freeRespecIn = (s = store()) => (shrine(s) >= 4 ? Math.max(0, (s.base.freeRespecAt || 0) + 24 * HOUR - now(s)) : null);
  function respec(cid, s = store(), o = {}) {
    const c = s.roster.find(x => x.id === cid);
    if (!c || !shrine(s)) return false;
    const free = o.free && freeRespecIn(s) === 0;
    const price = free ? 0 : respecPrice(c, s);
    if (s.currencies.gold < price) return false;
    s.currencies.gold -= price;
    if (free) s.base.freeRespecAt = now(s);
    Hero.respec(c, false);
    changed(s);
    return true;
  }
  // Unlearn (level 3): one skill's points back, for 20% of a full respec. The starter stays at level 1.
  const unlearnPrice = (c, s = store()) => Math.round(respecPrice(c, s) * 0.2);
  function unlearn(cid, skill, s = store()) {
    const c = s.roster.find(x => x.id === cid);
    if (!c || shrine(s) < 3 || !c.skills[skill]) return false;
    const starter = c.classes.some(k => CLASSES[k].starter === skill);
    if (starter && c.skills[skill] <= 1) return false;
    const price = unlearnPrice(c, s);
    if (s.currencies.gold < price) return false;
    s.currencies.gold -= price;
    if (starter) c.skills[skill] = 1; else delete c.skills[skill];
    c.awakened = c.awakened.filter(id => c.skills[id] === SKILL_LV_MAX);
    c.equip = c.equip.map(id => (id && c.skills[id] ? id : null));
    if (!c.equip.some(Boolean)) c.equip[0] = CLASSES[c.cls].starter;
    Hero.fixEquip(c);
    changed(s);
    return true;
  }

  // ── a new game: one hero picked from three, and 100 gold
  function newGame(cls, s = store(), o = {}) {
    if (!STARTERS.includes(cls) || s.roster.length) return null;
    const rng = o.rng || Math.random;
    const c = Hero.create(cls, 'c' + s.nextId++, { name: o.name || RECRUIT_NAMES[Math.floor(rng() * RECRUIT_NAMES.length)], rng });
    s.roster.push(c);
    s.party = [null, null, null, null, null, null];
    place(c, s);
    // the first board: the two starting classes you didn't pick, and one other
    const others = STARTERS.filter(k => k !== cls), rest = CLASS_ORDER.filter(k => !STARTERS.includes(k) && !CLASS_JOINS[k]);
    s.board.first = others.concat(rest[Math.floor(rng() * rest.length)]);
    s.board.free = true;
    s.renown.awarded['cls:' + cls] = 1; // the first pick isn't a class joining: only hires are
    changed(s);
    return c;
  }

  // ── after each battle (the campaign calls this; without it, the battle screen does)
  // o: { won, first (a first clear), xpLv (levels' worth of XP each hero earned), heroes (how many earned it), fatigue }
  function afterBattle(res, stage, o = {}, s = store()) {
    if (!s || !stage) return null;
    ensure(s);
    const out = { renown: 0, used: {} };
    // Renown: the road, battle experience and bosses
    if (o.first) out.renown += award('lit:' + stage.id, stage.kind === 'elite' ? BASE.RENOWN.elite : BASE.RENOWN.stage, s);
    if (o.xpLv > 0 && o.heroes > 0) out.renown += award(null, BASE.RENOWN.xpLv * o.xpLv * o.heroes, s);
    if (o.won && (stage.boss || stage.kind === 'boss')) out.renown += award('boss:' + stage.id, BASE.RENOWN.boss, s) || award(null, BASE.RENOWN.bossAgain, s);
    // party items used come out of the Bag (a slot refilled by Spare Vials or Panacea draws nothing)
    out.used = spendItems(res, s);
    // Without the campaign, the battle screen settles fatigue here too, and the board refreshes once the party is home.
    if (o.fatigue) out.fatigue = Fatigue.battle(res, s);
    if (o.home) s.board.pending = true;
    changed(s);
    return out;
  }
  // A refresh owed since the last battle, paid the next time the camp is shown (without the campaign's trips).
  function settleHome(s = store()) {
    if (s && s.board.pending && !(s.campaign && s.campaign.current)) { s.board.pending = false; home({ battles: 1 }, s); return true; }
    return false;
  }
  function spendItems(res, s = store()) {
    const used = {}, freeSlot = {};
    for (const e of res.log || []) {
      if (e.t === 'refill') freeSlot[e.slot] = true;
      else if (e.t === 'item') { if (freeSlot[e.slot]) { freeSlot[e.slot] = false; continue; } used[e.item] = (used[e.item] || 0) + 1; }
    }
    for (const k in used) s.inventory.potions[k] = Math.max(0, (s.inventory.potions[k] || 0) - used[k]);
    return used;
  }
  // The battle's setup, as the camp allows it: the loadout draws from the Bag (a slot whose item has run out is empty),
  // and a Spent hero stays home.
  function limitLoadout(t, s = store()) {
    if (!s || !t) return t;
    if (Array.isArray(t.loadout)) {
      const left = Object.assign({}, s.inventory.potions);
      t.loadout = t.loadout.map(id => (id && left[id] > 0 ? (left[id]--, id) : null)).filter(Boolean);
    }
    if (Array.isArray(t.party)) t.party = t.party.map(p => { const c = p && p.char && s.roster.find(x => x.id === p.char); return c && Fatigue.spent(c) ? null : p; });
    return t;
  }

  // ── the clock: everything that runs on real time, brought up to t
  function tickTo(t, s = store(), o = {}) {
    if (!s) return;
    ensure(s);
    const B = s.base;
    if (!B.clock) B.clock = t;
    if (t > B.clock) Fatigue.advance(s, B.clock, t, o);
    B.clock = Math.max(B.clock, t);
    brewTick(s, t);
    potionTick(s, t);
    boardTick(s, t);
    if (shopLevel(s) && t - s.shop.refreshedAt >= BASE.STALL_EVERY * HOUR) restock(s);
  }
  const tick = (s = store(), o = {}) => tickTo(now(s), s, o);

  // ── boot: wrap the battle setup, catch up on time away, and report it
  let report = null;
  // Before anything else at boot: the battle setup draws from the Bag, and the campaign's hooks reach the camp.
  function prepare(s = store()) { if (s) { ensure(s); teach(s); } wrapSetup(); hookCampaign(); }
  function start(s = store(), o = {}) {
    if (!s) return null;
    prepare(s);
    syncSlots(s);
    const t = now(s), from = s.base.clock || t;
    const before = snapshot(s);
    tickTo(t, s, { offline: true });
    report = makeReport(s, before, t - from);
    return report;
  }
  function snapshot(s) {
    return {
      fatigue: Object.fromEntries(s.roster.map(c => [c.id, { f: c.fatigue || 0, spent: !!c.spent, level: c.level }])),
      learned: (s.base.learned || []).length, board: s.board.refreshedAt, potions: s.freePotion.waiting,
    };
  }
  // What happened while you were away (home-base spec §4): the rows of the away sheet, before collecting.
  function makeReport(s, before, ms) {
    const rows = [];
    for (const id of ['tollhouse', 'scavengercamp', 'salvagepit', 'trainingyard', 'infirmary']) {
      if (!built(id, s)) continue;
      const got = preview(id, s), st = storage(id, s);
      if (got.length) rows.push({ id, got, full: st && st.fullFor ? st.fullFor : 0 });
    }
    if (s.freePotion.waiting) rows.push({ id: 'fire', got: [{ kind: 'item', item: 'draught', icon: 'flask', n: s.freePotion.waiting, text: `+${s.freePotion.waiting} Healing Draught${s.freePotion.waiting === 1 ? '' : 's'}` }] });
    const rested = s.roster.map(c => ({ c, from: (before.fatigue[c.id] || { f: c.fatigue }).f, to: c.fatigue || 0, wasSpent: (before.fatigue[c.id] || {}).spent })).filter(x => x.from - x.to >= 1);
    const learned = (s.base.learned || []).slice(before.learned).map(x => ({ c: s.roster.find(y => y.id === x.c), L: LESSONS[x.id] })).filter(x => x.c);
    const board = s.board.refreshedAt !== before.board;
    return { ms, rows, rested, learned, board };
  }
  const lastReport = () => report;
  // Back to a tab that was hidden a while: bring everything up to date and report it, like a return after closing.
  function catchUp(s = store()) {
    if (!s) return null;
    const before = snapshot(s), from = s.base.clock || now(s);
    tick(s);
    report = makeReport(s, before, now(s) - from);
    return report;
  }
  // Gather it all: every building, the still-room and the fire.
  function collectAll(s = store()) {
    tick(s);
    const out = [];
    for (const id of ['tollhouse', 'scavengercamp', 'salvagepit', 'trainingyard', 'infirmary']) if (built(id, s)) out.push(...collect(id, s));
    const n = collectPotions(s);
    if (n) out.push({ kind: 'item', item: 'draught', icon: 'flask', n, text: `+${n} Healing Draught${n === 1 ? '' : 's'}` });
    changed(s);
    return out;
  }
  // With the campaign (build step 6, js/campaign.js) present, its hooks drive the camp: every settled battle (Renown,
  // party items used), each first clear (when it has no settle hook), coming home (a new board) and unlocks (blueprints).
  // Its fatigue settlement calls Fatigue.battle (js/rest.js) itself.
  let hooked = false;
  function hookCampaign() {
    if (hooked || typeof Campaign === 'undefined') return;
    hooked = true;
    if (Campaign.onSettle) Campaign.onSettle((r, stage, res, st) => afterBattle(res, stage, { won: !!r.won, first: !!r.first, xpLv: r.xpLv || 0, heroes: (r.gains || []).length }, st || store()));
    else if (Campaign.onFirstClear) Campaign.onFirstClear((stage, st) => afterBattle({ log: [] }, stage, { won: true, first: true }, st || store()));
    if (Campaign.onHome) Campaign.onHome((trip, st) => home(trip, st || store()));
    if (Campaign.onUnlock) Campaign.onUnlock((id, st) => { ensure(st || store()); changed(st || store()); });
  }
  // Battles draw their loadout from the Bag. Wraps whatever the campaign or the rules set up, once, at boot.
  let wrapped = false;
  function wrapSetup() {
    if (wrapped || typeof stageSetup === 'undefined') return;
    const prev = stageSetup.tactics;
    stageSetup.tactics = () => limitLoadout(prev ? prev() : typeof Tactics !== 'undefined' ? Tactics.setup() : null);
    wrapped = true;
  }

  // ── the prototype tools: gold, materials, blueprints and time, so the camp can be tested without grinding
  const proto = {
    gold: (n = 1000, s = store()) => { s.currencies.gold += n; changed(s); },
    mats: (n = 50, s = store()) => { for (const m of MATERIALS) s.currencies.mats[m.id] = (s.currencies.mats[m.id] || 0) + n; changed(s); },
    blueprints: (s = store()) => { const t = Date.now(); for (const id of ['recruitboard', 'items', 'tollhouse', 'infirmary', 'trainingyard', 'shop', 'tactician', 'scavengercamp', 'barracks', 'salvagepit', 'gravecaller', 'region:1', 'region:2', 'region:3', 'region:4']) if (!s.unlocks[id]) s.unlocks[id] = t; ensure(s); teach(s); tick(s); changed(s); },
    renown: (s = store()) => { const R = renown(s); award(null, R.need - R.into, s); ensure(s); changed(s); },
    // Time travel: the clock jumps on, as if you had been away (the party counts as home), and the away sheet reports it.
    skip: (hours = 1, s = store()) => { const before = snapshot(s); s.base.skew += hours * HOUR; tickTo(now(s), s, { offline: true }); report = makeReport(s, before, hours * HOUR); changed(s); },
  };

  return {
    ensure, unlocked, frontier, reached, furthest, regionName, highestLevel, now,
    rec, level, built, choice, hasChoice, blueprint, available, cost, canPay, short, matName, matIcon, build, next, upgrade, rechoose, tearDown, setFocus,
    renown, plotsCleared, renownFor, award,
    partySlots, loadoutSlots, rosterCap, syncSlots, teach, bonuses,
    storeHours, rates, scavRegions, trainees, yardCap, setTrainee, yardCeiling, span, collect, preview, storage, collectTrainee,
    brewWaiting, collectBrew, potionIn, collectPotions,
    shopLevel, itemPrice, itemSell, shopItems, buyItem, sellItem, restock, stallPrice, stallIn, buyGear,
    boardOpen, boardSize, boardPicks, boardClasses, quality, recruitPrice, rollBoard, boardIn, home, canHire, hire, place, buyRank, rankCost,
    whyNotDismiss, dismiss,
    rooms, inHall, lessonsFor, whyNotStudy, startLesson, lessonOf, lessonEnd, cancelLesson, finishLesson,
    shrine, respecPrice, freeRespecIn, respec, unlearnPrice, unlearn,
    newGame, afterBattle, settleHome, spendItems, limitLoadout, tickTo, tick, prepare, start, lastReport, catchUp, collectAll, wrapSetup, proto,
    onChange: fn => listeners.push(fn), changed,
  };
})();

// The passive-bonus buildings work on every hero in battle (home-base spec §3): the Whetstone and Ossuary on stats,
// the Bell Tower on resistances, and the Hexing Stone on the landing chance of the party's harmful effects.
if (typeof Hero !== 'undefined' && Hero.mods) Hero.mods.push((c, sp) => {
  const s = typeof Save !== 'undefined' && Save.state;
  if (!s || !s.base || !s.roster.includes(c)) return;
  const B = Base.bonuses(s);
  if (B.pow) sp.stats.pow *= 1 + B.pow;
  if (B.crit) sp.stats.crit += B.crit;
  if (B.hp) sp.stats.hp = Math.round(sp.stats.hp * (1 + B.hp));
  if (B.def) sp.stats.def *= 1 + B.def;
  for (const k in B.res) sp.res[k] = (sp.res[k] || 0) + B.res[k];
  if (Object.keys(B.land).length) sp.land = B.land;
});
// A level threshold passed in battle or in the yard is worth Renown once (home-base spec §8). Hires arrive with their
// levels quietly, and the yard's previews never count.
if (typeof Hero !== 'undefined') {
  const gain = Hero.gainXp;
  Hero.gainXp = (c, amt, o = {}) => {
    const g = gain(c, amt);
    const s = typeof Save !== 'undefined' && Save.state;
    if (!o.quiet && g.thresholds.length && s && s.renown && s.roster.includes(c)) for (const t of g.thresholds) Base.award(`thr:${c.id}:${t}`, BASE.RENOWN.threshold, s);
    return g;
  };
}
