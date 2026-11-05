'use strict';
// Lantern Road · the campaign: the road's progress, rewards, fatigue, first-clear unlocks and trips (campaign spec §5–7,
// home-base spec §5–6). Campaign is the model: it touches no page, so tools/simtest.js tests it in Node. The map screen
// (js/map.js) and the battle flow (js/main.js) call it.
//
// The save (js/save.js, version 4) holds:
//   campaign.cleared, campaign.best (fastest win in rounds), campaign.current (a battle under way: { stage, seed })
//   campaign.road: { keepGoing, sets: { stageId: rule set name } }   the trip settings shared by every stage, and the
//                                                                     rule set last chosen for each stage
//   campaign.trip: the trip under way, or null. campaign.lastTrip: the summary of the last one, until it is seen.
//   campaign.tips: the first-time tips already shown.   unlocks: { id: when }   every first-clear unlock so far
//
// A trip is one outing from camp (campaign spec §1): the party sets out, fights a stage, and with Keep going on walks on
// to the next, until something sends it home: a lost battle, a between-battle party rule, a boss falling, every hero
// Spent, the player calling them home, or the app closing.
//
// Hooks for build step 5:
//   Campaign.onUnlock(fn(id, state))          every unlock (buildings become blueprints)
//   Campaign.onFirstClear(fn(stage, state))   each first clear
//   Campaign.onSettle(fn(r, stage, res, state))  the end of every battle's settling: r is what it earned (gold, xpLv,
//                                             xp, mats, items, gear, fatigue, turns { charId: turns }, unlocks, first)
//   Campaign.onHome(fn(lastTrip, state))      a trip is over and the party is home
// Fatigue.battle(res, state), when the home base defines it, replaces the plain fatigue count (same result shape).

const Campaign = (() => {
  const unlockHooks = [], clearHooks = [], settleHooks = [], homeHooks = [];
  const store = () => (typeof Save !== 'undefined' && Save.state ? Save.state : null);

  // ── the save's campaign fields, filled in where an older save lacks them
  function ensure(s = store()) {
    if (!s) return null;
    const c = s.campaign;
    if (!c.road || typeof c.road !== 'object') c.road = { keepGoing: true, sets: {} };
    if (typeof c.road.keepGoing !== 'boolean') c.road.keepGoing = true;
    if (!c.road.sets || typeof c.road.sets !== 'object') c.road.sets = {};
    if (!c.tips || typeof c.tips !== 'object') c.tips = {};
    if (c.trip === undefined) c.trip = null;
    if (c.lastTrip === undefined) c.lastTrip = null;
    if (!s.unlocks || typeof s.unlocks !== 'object') s.unlocks = {};
    // A region opened before its records existed (a save from build step 6 that beat the Sexton) gets them now. (The
    // home base's Base.teach gives an older save Tactician I's Move action.)
    for (const id in REGION_OPENS) if (s.unlocks[id]) for (const k of REGION_OPENS[id]) if (!s.unlocks[k]) unlock(k, s);
    return s;
  }

  // ── where the road stands
  const has = (id, s = store()) => !s || !!(s.unlocks && s.unlocks[id]);
  const isLit = (id, s = store()) => !!s && s.campaign.cleared.includes(id);
  // The next stage to light: the first one not yet cleared, or past the end when the whole road is lit.
  const frontier = (s = store()) => { const i = STAGES.findIndex(st => !isLit(st.id, s)); return i < 0 ? STAGES.length : i; };
  // lit, frontier or dark
  const stateOf = (i, s = store()) => (isLit(STAGES[i].id, s) ? 'lit' : i === frontier(s) ? 'frontier' : 'dark');
  const litIn = (r, s = store()) => STAGES.filter(st => st.region === r && isLit(st.id, s)).length;
  // A region is reached once the boss before it falls.
  const reached = (r, s = store()) => r === 0 || has('region:' + r, s);
  const regionBuilt = r => STAGES.some(st => st.region === r);

  // ── the party
  const chars = (s = store()) => (s ? s.party.map(id => s.roster.find(c => c.id === id)).filter(Boolean) : []);
  // Spent at 100, until fatigue falls below 50: the home base keeps c.spent for that (home-base spec §6).
  const spent = c => !!c.spent || (c.fatigue || 0) >= FATIGUE.SPENT;
  // The heroes who can set out: in the formation, and not Spent or sent home on this trip.
  function fit(s = store()) {
    const out = (s && s.campaign.trip && s.campaign.trip.out) || [];
    return chars(s).filter(c => !spent(c) && !out.includes(c.id));
  }
  // How ready the party is for a stage (campaign spec §7.3): gold, amber or red.
  function readiness(stage, s = store()) {
    const list = fit(s), short = Math.max(0, stage.party - list.length);
    const low = list.length ? stage.level - Math.min(...list.map(c => c.level)) : 99;
    if (!list.length || low >= 2 || short >= 2) return 'red';
    if (low >= 1 || short >= 1) return 'amber';
    return 'gold';
  }

  // ── battle setup: the formation's rules, with what the road hasn't taught yet held back
  // Party items wait for 1-3, Focus fire for Tactician I (1-11), and a Spent hero (or one walking home) stays out.
  function battleTactics() {
    const t = Tactics.setup(), s = store();
    if (!s) return t;
    const out = (s.campaign.trip && s.campaign.trip.out) || [];
    t.party = t.party.map(p => (p && (out.includes(p.char) || spent(s.roster.find(c => c.id === p.char) || {})) ? null : p));
    if (!has('items')) { t.loadout = []; t.partyRules = t.partyRules.filter(r => PARTY_ACTIONS[r.do] && PARTY_ACTIONS[r.do].kind !== 'item'); }
    if (!has('tactician')) t.partyRules = t.partyRules.filter(r => PARTY_ACTIONS[r.do] && PARTY_ACTIONS[r.do].kind !== 'focus');
    return t;
  }
  // The battle for a stage: lit stages are replays, where wandering foes can appear.
  function setup(i, seed, s = store()) {
    const stage = STAGES[i];
    return stageSetup(stage, seed, battleTactics(), { replay: isLit(stage.id, s) });
  }

  // ── rewards (home-base spec §5)
  const rankOf = u => (u.boss ? 'boss' : u.elite ? 'elite' : 'normal');
  const stageRank = st => (st.kind === 'boss' ? 'boss' : st.kind === 'elite' ? 'elite' : 'normal');
  const pickW = (rng, list) => { const tot = list.reduce((a, [, w]) => a + w, 0); let x = rng() * tot; for (const [k, w] of list) if ((x -= w) < 0) return k; return list[list.length - 1][0]; };
  const RARITY_UP = { common: 'fine', fine: 'rare', rare: 'rare' };
  // The foes the party defeated: fallen, not called into the battle, not fled.
  const defeated = res => res.final.filter(u => u.side === 1 && !u.alive && !u.summoned && !u.fled && !u.thrall);
  // What a battle earns, worked out from its result. Deterministic: the rolls come from the battle's seed.
  // o: { first (a first clear), classes (the roster's classes, for gear), regions (reached region ids) }
  function earn(res, stage, o = {}) {
    const rng = makeRng((((res.seed >>> 0) ^ 0x51ed270b) >>> 0) || 3);
    const L = stage.level, S = GOLD_SCALE(L), won = res.winner === 0, rank = stageRank(stage);
    const r = { won, first: !!(o.first && won), gold: 0, spoilsGold: 0, clearGold: 0, xpLv: 0, mats: {}, items: {}, gear: [], foes: 0, called: 0 };
    const item = () => { const id = pickW(rng, LOOT_ITEMS); r.items[id] = (r.items[id] || 0) + 1; };
    const gear = (gr, why) => r.gear.push({ piece: Items.roll(L, stage.region, rng, Object.assign({ classes: o.classes }, gr)), why });
    const lootRoll = () => (rng() < LOOT_ITEM ? item() : gear({ rank }, 'loot'));
    // battle spoils, from every foe defeated
    for (const u of defeated(res)) {
      const sp = SPOILS[rankOf(u)];
      r.foes++;
      r.spoilsGold += sp.gold * S;
      r.xpLv += sp.xp;
      for (let k = 0; k < sp.rolls; k++) if (rng() < sp.loot) lootRoll();
      // A Cage Mimic killed drops an extra gear roll, one rarity above the stage's usual (campaign spec §3.4).
      if (u.key === 'mimic') { const od = Items.odds(stage.region, rank); gear({ rarity: RARITY_UP[pickW(rng, Object.entries(od))] }, 'mimic'); }
    }
    r.called = res.final.filter(u => u.side === 1 && u.summoned).length;
    r.spoilsGold += (res.loot && res.loot.gold) || 0; // gold the Cutpurse stole
    r.xpLv += (res.loot && res.loot.xpLv) || 0;
    // the clear reward, by tier
    if (won) {
      const C = CLEAR[stage.tier], k = r.first ? 2 : 1, own = REGIONS[stage.region].mat;
      r.clearGold = C.gold * S * k;
      r.xpLv += C.xp;
      r.mats[own] = C.mat * k;
      if (rng() < C.other[0]) {
        const others = (o.regions || [0]).filter(x => x !== stage.region);
        const mat = others.length ? REGIONS[others[Math.floor(rng() * others.length)]].mat : own;
        r.mats[mat] = (r.mats[mat] || 0) + C.other[1] * k;
      }
      if (rng() < C.items[0]) for (let n = 0; n < C.items[1]; n++) item();
      if ((r.first && (stage.tier === 'light' || stage.tier === 'standard')) || rng() < C.gear) gear({ rank }, 'clear');
    }
    // a stage whose first clear must bring a level (1-1: the first level comes in the first battle)
    if (r.first && stage.firstXp) r.xpLv = Math.max(r.xpLv, stage.firstXp);
    r.spoilsGold = Math.round(r.spoilsGold); r.clearGold = Math.round(r.clearGold);
    r.gold = r.spoilsGold + r.clearGold;
    r.xp = Math.round(r.xpLv * Hero.xpToNext(L));
    return r;
  }
  // A rough preview of a stage's rewards, for the stage sheet: gold for clearing it with every foe defeated.
  function preview(stage, first) {
    const S = GOLD_SCALE(stage.level), C = CLEAR[stage.tier];
    const foes = stage.foes.filter(Boolean).map(x => FOES[foeKey(x)]);
    const spoils = foes.reduce((a, F) => a + SPOILS[foeRank(F)].gold * S, 0), xpLv = foes.reduce((a, F) => a + SPOILS[foeRank(F)].xp, 0) + C.xp;
    const k = first ? 2 : 1, xpL = first && stage.firstXp ? Math.max(xpLv, stage.firstXp) : xpLv;
    return { gold: Math.round(spoils + C.gold * S * k), mat: C.mat * k, xp: Math.round(xpL * Hero.xpToNext(stage.level)), xpLv: xpL, gear: first && (stage.tier === 'light' || stage.tier === 'standard') ? 1 : C.gear, tier: C.name };
  }

  // ── fatigue (home-base spec §6): +1 for each turn a hero took, times their gear's multiplier. The home base's
  // Fatigue.battle (js/base.js, build step 5) takes over when it is loaded: same shape, with the skills that change it.
  function fatigue(res, s) {
    if (typeof Fatigue !== 'undefined' && Fatigue.battle) return Fatigue.battle(res, s);
    const out = {};
    for (const u of res.start) {
      if (u.side !== 0 || u.thrall || !u.char) continue;
      const c = s.roster.find(x => x.id === u.char);
      if (!c) continue;
      const before = c.fatigue || 0, gain = res.stats[u.id].turns * FATIGUE.PER_TURN * Items.fatigueMul(c);
      c.fatigue = Math.min(FATIGUE.SPENT, Math.round((before + gain) * 10) / 10);
      out[c.id] = { before, gain: Math.round(gain * 10) / 10, after: c.fatigue };
    }
    return out;
  }

  // ── unlocks (campaign spec §5.3)
  function variantKeys(id) {
    if (id.includes(':')) return [id]; // a single variant: foe_tag:undead
    return CONDITIONS[id] ? Tactics.variants(id).map(Tactics.condKey) : [];
  }
  const HP_MP = ['self_hp_lt', 'ally_hp_lt', 'foe_hp_lt', 'self_mp_lt', 'bb_fatigue'];
  // What an unlock does now. Buildings and classes are only recorded: the home base (build step 5) acts on them.
  const EFFECTS = {
    items: s => {
      s.inventory.potions.draught = (s.inventory.potions.draught || 0) + 2;
      const L = Tactics.loadout();
      if (!L.items.some(Boolean)) { Tactics.setItem(0, 'draught'); Tactics.setItem(1, 'draught'); }
      Tactics.grantPartyRule({ if: 'ally_hp_lt', n: 50, do: 'draught' });
    },
    keepgoing: s => { s.campaign.road.keepGoing = true; Tactics.grantPartyRule(HOME_RULE); },
    // Tactician I, with the Move action. The home base's Tactician builds on it: party rule and loadout slots, then
    // Lessons II (with the Gather action) and III.
    tactician: () => {
      for (const id of TACTICIAN_I.concat(HP_MP)) for (const k of variantKeys(id)) Tactics.learn(k);
      Tactics.learn('act:move');
    },
  };
  // Records an unlock (once), applies what it does now, and tells step 5. Returns true if it was new.
  function unlock(id, s = store()) {
    if (!s || s.unlocks[id] || !UNLOCKS[id]) return false;
    s.unlocks[id] = Date.now();
    const U = UNLOCKS[id];
    if (U.cond) for (const c of U.cond) for (const k of variantKeys(c)) Tactics.learn(k);
    if (U.relic) Items.grantRelic(s, U.relic);
    if (EFFECTS[id]) EFFECTS[id](s);
    for (const fn of unlockHooks) { try { fn(id, s); } catch (e) { } }
    return true;
  }

  // ── after a battle: rewards, XP, fatigue, unlocks and the road's progress. Returns what happened, for the report.
  function settle(res, i, s = store()) {
    const stage = STAGES[i], won = res.winner === 0, first = won && !isLit(stage.id, s);
    const classes = s.roster.map(c => c.cls), regions = REGIONS.map((R, r) => r).filter(r => reached(r, s));
    const r = earn(res, stage, { first, classes, regions });
    // gold, materials and items
    s.currencies.gold += r.gold;
    for (const k in r.mats) s.currencies.mats[k] = (s.currencies.mats[k] || 0) + r.mats[k];
    for (const k in r.items) s.inventory.potions[k] = (s.inventory.potions[k] || 0) + r.items[k];
    // gear: into the Bag, or sold where it drops if the Bag is full
    r.sold = 0;
    for (const g of r.gear) { const got = Items.add(s, g.piece); if (got.sold) { g.sold = got.sold; r.sold += got.sold; } }
    // XP goes to every hero who started the battle, knocked out or not
    r.gains = [];
    for (const u of res.start) {
      const c = u.side === 0 && !u.thrall && u.char && s.roster.find(x => x.id === u.char);
      if (!c) continue;
      r.gains.push({ c, before: { level: c.level, xp: c.xp }, g: Hero.gainXp(c, r.xp) });
    }
    r.fatigue = fatigue(res, s);
    // the road
    if (won) {
      if (first) s.campaign.cleared.push(stage.id);
      const b = s.campaign.best[stage.id];
      if (!b || res.rounds < b) s.campaign.best[stage.id] = res.rounds;
    }
    r.unlocks = [];
    if (first) for (const id of stage.first) if (unlock(id, s)) r.unlocks.push(id);
    // The first time any hero falls, anywhere: "Ally: fallen".
    const fell = res.start.some(u => u.side === 0 && !u.thrall && res.stats[u.id].falls > 0);
    if (fell && unlock('cond:ally_fallen', s)) r.unlocks.push('cond:ally_fallen');
    if (first) for (const fn of clearHooks) { try { fn(stage, s); } catch (e) { } }
    r.fell = fell;
    // Each hero's turns, for whoever listens (Renown, buildings): r.turns { charId: turns }.
    r.turns = {};
    for (const u of res.start) if (u.side === 0 && !u.thrall && u.char) r.turns[u.char] = res.stats[u.id].turns;
    for (const fn of settleHooks) { try { fn(r, stage, res, s); } catch (e) { } }
    return r;
  }

  // ── trips
  // Sets out for stage i: the frontier lights the road; a lit stage is farmed. Returns the trip, or null.
  function setOut(i, s = store()) {
    if (!s || !STAGES[i] || stateOf(i, s) === 'dark' || !fit(s).length) return null;
    const farm = isLit(STAGES[i].id, s);
    // fatigue and from: each hero's fatigue, and level and XP, as they set out, for the trip's results (js/results.js).
    // totals.fought: the stages fought, in order; totals.pieces: the gear found, { uid, id, sold }.
    s.campaign.trip = {
      stage: i, farm, keep: has('keepgoing', s) && s.campaign.road.keepGoing, home: false, out: [], started: Date.now(), battles: 0,
      totals: { won: 0, lit: [], xp: 0, gold: 0, mats: {}, items: {}, gear: 0, sold: 0, unlocks: [], fought: [], pieces: [] }, fatigue: {}, from: {},
    };
    for (const c of fit(s)) { s.campaign.trip.fatigue[c.id] = c.fatigue || 0; s.campaign.trip.from[c.id] = { level: c.level, xp: c.xp }; }
    return s.campaign.trip;
  }
  // After each battle on a trip: settle it, then decide whether the party walks on. Returns
  // { r (what the battle earned), next (stage index, or null when the trip ends), why (the reason it ends), left (heroes
  //   who walked home Spent) }.
  function afterBattle(res, s = store(), o = {}) {
    const T = s.campaign.trip, i = T ? T.stage : res.stageIndex, stage = STAGES[i];
    const r = settle(res, i, s);
    if (!T) return { r, next: null, why: null, left: [] };
    T.battles++;
    const tt = T.totals;
    if (r.won) tt.won++;
    if (r.first) tt.lit.push(stage.id);
    tt.xp += r.xp; tt.gold += r.gold; tt.gear += r.gear.length; tt.sold += r.sold;
    for (const k in r.mats) tt.mats[k] = (tt.mats[k] || 0) + r.mats[k];
    for (const k in r.items) tt.items[k] = (tt.items[k] || 0) + r.items[k];
    tt.unlocks.push(...r.unlocks);
    // (a trip that set out before the results popup has no list of stages or pieces)
    if (tt.fought) tt.fought.push(stage.id);
    if (tt.pieces) for (const g of r.gear) tt.pieces.push({ uid: g.piece.uid, id: g.piece.id, sold: g.sold || 0 });
    // A hero who reached Spent walks home alone; the rest carry on (campaign spec §7.4).
    const left = [];
    for (const c of chars(s)) if (r.fatigue[c.id] && !T.out.includes(c.id) && spent(c)) { T.out.push(c.id); left.push(c.id); }
    const on = fit(s);
    let next = null, why = null;
    const nm = c => c.name;
    if (o.closed) why = { k: 'closed', text: 'The app closed, so the party came home after that battle.' };
    else if (!r.won) why = { k: 'lost', text: `Lost at ${stage.id}: ${stage.name}.`, hint: stage.hint };
    else if (stage.boss) why = { k: 'boss', text: `${REGIONS[stage.region].boss} has fallen. ${REGIONS[stage.region].lit}` };
    else if (!on.length) why = { k: 'spent', text: 'Every hero was Spent.' };
    else if (T.home) why = { k: 'called', text: 'You called the party home.' };
    else if (!T.keep) why = { k: 'once', text: has('keepgoing', s) ? 'Keep going was off, so the party fought once and came home.' : 'The party fought once and came home. “Keep going after a win” opens at 1-6.' };
    else {
      next = T.farm ? i : i + 1;
      if (!STAGES[next] || !regionBuilt(STAGES[next].region)) { next = null; why = { k: 'end', text: 'The road ends here, for now.' }; }
    }
    // The between-battle party rules, from the top: the first Return to base that holds sends everyone home.
    if (next != null) {
      const x = { chars: on, fell: r.fell, next: STAGES[next], bag: s.inventory ? s.inventory.potions : null };
      const rules = (Tactics.owner('party').rules || []).filter(rr => rr.on && PARTY_ACTIONS[rr.do] && PARTY_ACTIONS[rr.do].kind === 'home');
      for (const rr of rules) {
        const C = CONDITIONS[rr.if];
        if (!C || !C.bb || !C.bb(rr, x)) continue;
        let text = ruleText(rr);
        if (rr.if === 'bb_fatigue') { const c = on.filter(c => c.fatigue >= rr.n).sort((a, b) => b.fatigue - a.fatigue)[0]; text = `${nm(c)} reached ${Math.floor(c.fatigue)} fatigue.`; }
        else if (rr.if === 'bb_fell') text = 'An ally fell, and a party rule called everyone home.';
        else if (rr.if === 'bb_next_boss') text = `Next on the road is ${STAGES[next].name}, and a party rule called everyone home first.`;
        else if (rr.if === 'bb_out') text = `The Bag is out of ${ITEMS_MANY[rr.s] || rr.s}, and a party rule called everyone home.`;
        why = { k: 'rule', text, rule: rr };
        next = null;
        break;
      }
    }
    if (next != null) T.stage = next;
    else end(why, s);
    return { r, next, why, left };
  }
  // The trip is over: the party walks home, and the Road tab shows its summary.
  function end(why, s = store()) {
    const T = s.campaign.trip;
    if (!T) return null;
    const heroes = Object.keys(T.fatigue).map(id => { const c = s.roster.find(x => x.id === id); return c ? { id, name: c.name, before: T.fatigue[id], after: c.fatigue || 0, out: T.out.includes(id), from: (T.from && T.from[id]) || null } : null; }).filter(Boolean);
    // Closed while out: home from the moment the app closed, so resting counts from then (home-base spec §4).
    const away = why && why.k === 'closed' && typeof Save !== 'undefined' && Save.info && Save.info.awayMs > 0 ? Save.info.awayMs : 0;
    s.campaign.lastTrip = Object.assign({ at: Date.now() - away, battles: T.battles, why: why || { k: 'called', text: 'The party came home.' }, heroes, seen: false }, T.totals);
    s.campaign.trip = null;
    s.campaign.current = null;
    for (const fn of homeHooks) { try { fn(s.campaign.lastTrip, s); } catch (e) { } }
    return s.campaign.lastTrip;
  }
  // Call the party home: the battle under way finishes first.
  function callHome(s = store()) { if (s && s.campaign.trip) { s.campaign.trip.home = true; return true; } return false; }
  const trip = (s = store()) => (s ? s.campaign.trip : null);

  // ── rule sets: the sheet remembers the one last chosen for each stage (from Tactician I)
  function setFor(i, s = store()) { const n = s && s.campaign.road.sets[STAGES[i].id]; return n && Tactics.sets().some(x => x.name === n) ? n : null; }
  function chooseSet(i, name, s = store()) {
    if (!s) return false;
    if (name == null) { delete s.campaign.road.sets[STAGES[i].id]; return true; }
    const k = Tactics.sets().findIndex(x => x.name === name);
    if (k < 0) return false;
    s.campaign.road.sets[STAGES[i].id] = name;
    return Tactics.loadSet(k);
  }

  // ── first-time tips (campaign spec §8.3): each shows once
  function tip(key, s = store()) { if (!s || s.campaign.tips[key]) return false; s.campaign.tips[key] = Date.now(); return true; }

  // Rests everyone at once, for the tests. In the game, rest takes time at camp (js/rest.js).
  function restAll(s = store()) { for (const c of s.roster) c.fatigue = 0; return true; }

  return {
    ensure, has, isLit, frontier, stateOf, litIn, reached, regionBuilt, chars, fit, spent, readiness, battleTactics, setup,
    earn, preview, defeated, fatigue, unlock, settle, setOut, afterBattle, end, callHome, trip, setFor, chooseSet, tip, restAll,
    onUnlock: fn => unlockHooks.push(fn), onFirstClear: fn => clearHooks.push(fn), onSettle: fn => settleHooks.push(fn), onHome: fn => homeHooks.push(fn),
  };
})();

// Battles take their rules from here: the Tactics, with what the road hasn't taught yet held back.
stageSetup.tactics = () => Campaign.battleTactics();
