'use strict';
// Lantern Road · Bess the carter and her quests (docs/first-session-spec.md §4, approved 2026-11-05). Bess drives the
// carts that carry travellers along the road you've cleared. Her covered cart stands by the fire where the road leaves
// the camp (js/campscene.js draws it, js/bessart.js the art), and a tap on her opens her panel: Bess drawn large on the
// left, her quests on the right. "Jobs" is her word for quests; the screen says Quests.
//   - The story quest, the same for everyone: The Gravedigger, defeat the Sexton at 1-18. Its reward is the travellers'
//     gift, the Toll House plan (through the home base's blueprints, js/base.js), or, where the plan is already yours,
//     what the Toll House costs to build.
//   - Daily jobs: three a day, drawn from the kinds you can do now, reset at local midnight. Each pays gold and your
//     furthest region's material; all three together add a gear roll at the frontier, Fine or better, and a party
//     item. They open on the first trip home after the story quest is accepted, with Bess's card "New: Daily jobs".
//     Battles count for them through Campaign.onSettle; collecting the tolls through Base.collectAll.
// Quests is the model: Quests.ensure, .accept, .claimStory, .today, .claimJob, .claimBonus and the rest take the save
// and touch no page, so tools/simtest.js tests them in Node. The panel, the card, the goal tracker's line and the
// arrival are the page's (tools/quests_check.py).
//
// Saved in save.quests (js/save.js):
//   bess    true once she's at the Hearth
//   story   the Gravedigger: '' (not offered yet), 'offered', 'on' (accepted) or 'claimed'; it's done once 1-18 is lit
//   jobs    the daily jobs: '' (not yet), 'due' (they open on the next trip home), 'new' (open, her card not seen yet),
//           'seen'
//   daily   today's jobs, or null: { day (the local date, 2026-11-05), jobs: [{ kind, need, done, claimed, fam (the
//           family, for 'family'), ids (the stages cleared, for 'clear') }], bonus (claimed) }
//
// For the first session's rewrite (and Wick's guide):
//   Quests.arrive()        rolls her cart up the road to her place by the fire (at once with reduced motion, or away
//                          from the Hearth) and offers the story quest. Until the rewrite calls it, she comes by
//                          herself: the first time the Hearth shows, still, after 1-2 is cleared and the first
//                          session is over.
//   Quests.arriving        true while the cart rolls in; her scene anchor (id 'bess') and her plaque
//                          ([data-tut=hearth-bess]) are there once it stands still
//   Quests.open(o)         her panel (o.line: her first line). A tap on her opens it too. Quests.shown, Quests.close()
//   Quests.say(text)       her line in the panel's bubble
//   Quests.accepted(s)     true once the story quest is accepted; Quests.onChange(fn) hears every change
//   Anchors on the panel: quest-card, quest-accept, quest-claim, jobs, job-claim, bonus-claim; at the Hearth: the
//   goal tracker's quest line, hearth-quest.

// The first build's numbers (§4), to tune.
const QUEST = {
  ARRIVES_AFTER: '1-2',      // Bess comes once this stage is cleared
  JOBS: 3,                   // daily jobs a day
  JOB_GOLD: 60,              // gold for a job, × S (the frontier stage's gold scale)
  JOB_MAT: 5,                // and this much of your furthest region's material
  BONUS_ITEMS: 1,            // all three done: party items, with one gear roll at the frontier, Fine or better
};
// The kinds of daily job: how many each asks (tune), its icon, and when it can be drawn (only kinds you can do now).
const JOB_KINDS = {
  win: { need: 5, icon: 'sword', name: n => `Win ${n} battles` },
  clear: { need: 3, icon: 'lantern', name: n => `Clear ${n} stages`, tip: 'Different stages; replays count.' },
  foes: { need: 30, icon: 'skull', name: n => `Defeat ${n} foes` },
  family: { need: 10, icon: 'claw', name: (n, fam) => `Defeat ${n} ${FAMILY_NAMES[fam] || fam}` },
  tolls: { need: 1, icon: 'coin', name: () => 'Collect the tolls', can: s => QUESTS_CAN.tolls(s) },
  items: { need: 2, icon: 'flask', name: n => `Use ${n} party items`, can: s => !!(s.unlocks && s.unlocks.items) },
};
// The foe families a "family" job can name: those found in your furthest region.
const FAMILY_NAMES = { undead: 'undead', beast: 'beasts', spirit: 'spirits' };
// The story quest (§4): the same for everyone.
const STORY_QUEST = {
  id: 'gravedigger', name: 'The Gravedigger',
  text: 'Travellers won’t take the road. Something past the graves digs up the dead and sets them on the carts.',
  goal: 'Defeat the Sexton', stage: '1-18', plan: 'tollhouse',
};
// Bess's lines (drafts, tune): blunt, practical and cheerful about money. The offer and the thanks are the spec's.
const BESS_LINES = {
  offer: ['Folk want to use your road. They’re too scared to.', 'Something past the graves keeps digging up the dead.'],
  accepted: 'Stop it, and the travellers will make it worth your while.',
  jobsSoon: 'I’ll have smaller jobs most days, too.',
  on: 'The Sexton’s at 1-18. The travellers are waiting.',
  done: 'You did it. The travellers sent this, with thanks.',
  claimed: 'The travellers paid up. Good.',
  jobsNew: 'Jobs today. Do all three and there’s a bit extra.',
  ready: 'Good work. Here’s your cut.',
  allDone: 'That’s the lot for today. Back tomorrow.',
  tap: ['Pay’s fair. Mostly.', 'Roads don’t drive themselves.', 'Coin’s coin. Take it.', 'Mind the mule. She bites.'],
};
// What a kind needs from the home base, kept apart so the table above reads plainly.
const QUESTS_CAN = {
  // the tolls can be collected once the buildings view (and its Collect) is open (Base.viewOpen)
  tolls: s => typeof Base !== 'undefined' && (s.campaign.cleared.length > 0) && Base.viewOpen(s),
};

const Quests = (() => {
  const st = () => (typeof Save !== 'undefined' && Save.state) || null;
  const isO = v => !!v && typeof v === 'object' && !Array.isArray(v);
  const listeners = [];
  const changed = (what, s) => { for (const fn of listeners) { try { fn(what, s); } catch (e) { } } };
  const now = s => (typeof Base !== 'undefined' ? Base.now(s) : Date.now());
  const lit = (id, s) => !!s && s.campaign.cleared.includes(id);

  // ── the save's field, filled in where an older save lacks it (the migration is in js/save.js)
  function ensure(s = st()) {
    if (!s) return null;
    if (!isO(s.quests)) s.quests = {};
    const q = s.quests;
    q.bess = q.bess === true;
    if (!['', 'offered', 'on', 'claimed'].includes(q.story)) q.story = '';
    if (q.bess && !q.story) q.story = 'offered';
    if (!['', 'due', 'new', 'seen'].includes(q.jobs)) q.jobs = '';
    if (q.daily != null && !(isO(q.daily) && typeof q.daily.day === 'string' && Array.isArray(q.daily.jobs))) q.daily = null;
    if (q.daily) {
      q.daily.jobs = q.daily.jobs.filter(j => isO(j) && JOB_KINDS[j.kind]).map(j => {
        j.need = Math.max(1, Math.round(j.need) || JOB_KINDS[j.kind].need);
        j.done = clamp(Math.round(j.done) || 0, 0, j.need);
        j.claimed = j.claimed === true;
        if (j.kind === 'clear' && !Array.isArray(j.ids)) j.ids = [];
        if (j.kind === 'family' && !FAMILY_NAMES[j.fam]) j.fam = 'undead';
        return j;
      });
      q.daily.bonus = q.daily.bonus === true;
    } else q.daily = null;
    return s;
  }
  const Q = (s = st()) => (s ? (ensure(s), s.quests) : null);

  // ── Bess at the Hearth
  // She comes after 1-2: the first session's rewrite calls arrive() at its moment; until then, the ticker below.
  function come(s = st()) {
    const q = Q(s);
    if (!q) return false;
    const was = q.bess;
    q.bess = true;
    if (!q.story) q.story = 'offered';
    if (!was) changed('arrive', s);
    return !was;
  }
  const here = (s = st()) => !!Q(s) && s.quests.bess;

  // ── the story quest: '' | 'offered' | 'on' | 'done' (accepted, and 1-18 is lit) | 'claimed'
  function story(s = st()) {
    const q = Q(s);
    const state = !q ? '' : q.story === 'on' && lit(STORY_QUEST.stage, s) ? 'done' : q.story;
    const list = typeof STAGES !== 'undefined' ? STAGES.filter(x => x.region === 0) : [];
    const upto = list.findIndex(x => x.id === STORY_QUEST.stage) + 1;
    return Object.assign({}, STORY_QUEST, { state, lit: list.slice(0, upto).filter(x => lit(x.id, s)).length, of: upto });
  }
  const accepted = (s = st()) => ['on', 'claimed'].includes((Q(s) || {}).story);
  function accept(s = st()) {
    const q = Q(s);
    if (!q || q.story !== 'offered') return false;
    q.story = 'on';
    if (!q.jobs) q.jobs = 'due'; // the daily jobs open on the next trip home
    changed('accept', s);
    return true;
  }
  // The reward: the Toll House plan (no stage's first clear brings it: decision 1 moved Region I's building unlocks
  // after the Sexton), or what the Toll House costs to build where the plan is already yours (a save from before).
  function storyReward(s = st()) {
    const id = STORY_QUEST.plan, known = typeof Base !== 'undefined' && (Base.blueprint(id, s) || Base.built(id, s));
    if (!known) return { plan: id };
    const c = typeof Base !== 'undefined' ? Base.cost(id, 1) : { gold: 240, mat: 'bone_dust', n: 8 };
    return { gold: c.gold, mat: c.mat, n: c.n };
  }
  function claimStory(s = st()) {
    if (story(s).state !== 'done') return null;
    const R = storyReward(s);
    if (R.plan) {
      if (typeof Campaign !== 'undefined') Campaign.unlock(R.plan, s);
      else s.unlocks[R.plan] = Date.now();
      if (typeof Base !== 'undefined') { Base.ensure(s); Base.changed(s); }
    } else {
      s.currencies.gold += R.gold;
      s.currencies.mats[R.mat] = (s.currencies.mats[R.mat] || 0) + R.n;
    }
    s.quests.story = 'claimed';
    changed('claim', s);
    return R;
  }

  // ── daily jobs
  // The local date of a moment, as the day's key; how long until local midnight.
  const dayOf = ms => { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const resetIn = (s = st()) => { const d = new Date(now(s)); return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1) - d; };
  const jobsOpen = (s = st()) => { const q = Q(s); return !!q && (q.jobs === 'new' || q.jobs === 'seen'); };
  // The families found in your furthest region, the commonest first.
  function families(s) {
    const r = typeof Base !== 'undefined' ? Base.furthest(s) : 0, n = {};
    for (const x of STAGES) if (x.region === r) for (const f of x.foes) { const F = f && FOES[foeKey(f)]; if (F) for (const t of F.tags || []) if (FAMILY_NAMES[t]) n[t] = (n[t] || 0) + 1; }
    const out = Object.keys(n).sort((a, b) => n[b] - n[a]);
    return out.length ? out : ['undead'];
  }
  const kinds = s => Object.keys(JOB_KINDS).filter(k => !JOB_KINDS[k].can || JOB_KINDS[k].can(s));
  // A day's jobs: QUEST.JOBS kinds drawn without repeats, the same all day for a save.
  function roll(s, day) {
    const rng = makeRng((strSeed(`${s.created || 1}:jobs:${day}`) >>> 0) || 5), pool = kinds(s), jobs = [];
    while (jobs.length < QUEST.JOBS && pool.length) {
      const kind = pool.splice(Math.floor(rng() * pool.length), 1)[0], j = { kind, need: JOB_KINDS[kind].need, done: 0, claimed: false };
      if (kind === 'family') { const f = families(s); j.fam = f[Math.floor(rng() * f.length)]; }
      if (kind === 'clear') j.ids = [];
      jobs.push(j);
    }
    return { day, jobs, bonus: false };
  }
  // Today's jobs, a new day's drawn as it comes; null until they open.
  function today(s = st()) {
    if (!jobsOpen(s)) return null;
    const q = s.quests, day = dayOf(now(s));
    if (!q.daily || q.daily.day !== day) { q.daily = roll(s, day); changed('day', s); }
    return q.daily;
  }
  const jobName = j => JOB_KINDS[j.kind].name(j.need, j.fam);
  const jobDone = j => j.done >= j.need;
  // What a job pays now: 60 × S gold, S the frontier stage's gold scale, and 5 of your furthest region's material: its
  // staple, never its Trophy (MATERIALS' trophy: true).
  function jobReward(s = st()) {
    const fr = STAGES[Math.min(Campaign.frontier(s), STAGES.length - 1)], r = typeof Base !== 'undefined' ? Base.furthest(s) : fr.region;
    const staple = MATERIALS.filter(m => !m.trophy).find(m => m.region === r) || MATERIALS.find(m => !m.trophy);
    return { gold: Math.round(QUEST.JOB_GOLD * GOLD_SCALE(fr.level)), mat: staple.id, n: QUEST.JOB_MAT };
  }
  function claimJob(i, s = st()) {
    const D = today(s), j = D && D.jobs[i];
    if (!j || j.claimed || !jobDone(j)) return null;
    const R = jobReward(s);
    s.currencies.gold += R.gold;
    s.currencies.mats[R.mat] = (s.currencies.mats[R.mat] || 0) + R.n;
    j.claimed = true;
    changed('job', s);
    return R;
  }
  const bonusReady = (s = st()) => { const D = today(s); return !!D && !D.bonus && D.jobs.length > 0 && D.jobs.every(jobDone); };
  // All three done: a gear roll at the frontier stage (its level and region), Fine or better and ★1 or more
  // (STARS.FLOOR.jobs), given as battle loot is (into the Bag, or sold where it drops when the Bag is full), and
  // QUEST.BONUS_ITEMS party items.
  function claimBonus(s = st()) {
    if (!bonusReady(s)) return null;
    const D = today(s), fr = STAGES[Math.min(Campaign.frontier(s), STAGES.length - 1)];
    const rng = makeRng((strSeed(`${s.created || 1}:bonus:${D.day}`) >>> 0) || 9), od = Items.odds(fr.region);
    const rarity = rng() * (od.fine + od.rare) < od.fine ? 'fine' : 'rare';
    const piece = Items.roll(fr.level, fr.region, rng, { classes: s.roster.map(c => c.cls), rarity, minStars: STARS.FLOOR.jobs });
    const got = Items.add(s, piece), items = {};
    for (let k = 0; k < QUEST.BONUS_ITEMS; k++) {
      let x = rng() * LOOT_ITEMS.reduce((a, [, w]) => a + w, 0), id = LOOT_ITEMS[0][0];
      for (const [k2, w] of LOOT_ITEMS) if ((x -= w) < 0) { id = k2; break; }
      items[id] = (items[id] || 0) + 1;
      s.inventory.potions[id] = (s.inventory.potions[id] || 0) + 1;
    }
    D.bonus = true;
    changed('bonus', s);
    return { piece, sold: got.sold || 0, items };
  }
  // A battle's part in today's jobs (Campaign.onSettle): r is what it earned, res the battle.
  function count(r, stage, res, s) {
    const D = today(s);
    if (!D || !r) return;
    for (const j of D.jobs) {
      if (jobDone(j)) continue;
      let n = 0;
      if (j.kind === 'win') n = r.won ? 1 : 0;
      else if (j.kind === 'clear') { if (r.won && !j.ids.includes(stage.id)) { j.ids.push(stage.id); n = 1; } }
      else if (j.kind === 'foes') n = r.foes || 0;
      else if (j.kind === 'family') n = Campaign.defeated(res).filter(u => { const F = FOES[u.key] || FOES[foeKey(u.key)]; return F && (F.tags || []).includes(j.fam); }).length;
      else if (j.kind === 'items') n = (res.log || []).filter(e => e.t === 'item').length;
      if (n) j.done = Math.min(j.need, j.done + n);
    }
  }
  // The tolls collected: "Collect the tolls" counts once.
  function tolled(s) {
    const D = today(s);
    if (!D) return;
    for (const j of D.jobs) if (j.kind === 'tolls' && !jobDone(j)) j.done = j.need;
  }
  // Home from a trip: the daily jobs open, the first time after the story quest is accepted.
  function home(s) {
    const q = Q(s);
    if (!q || q.jobs !== 'due') return;
    q.jobs = 'new';
    today(s);
    changed('jobs', s);
  }
  if (typeof Campaign !== 'undefined') {
    Campaign.onSettle((r, stage, res, s) => count(r, stage, res, s || st()));
    Campaign.onHome((trip, s) => home(s || st()));
  }
  // Collecting the tolls happens in js/base.js; this listens without changing it, as js/base.js wraps Hero.gainXp.
  if (typeof Base !== 'undefined') {
    const tollsWaiting = s => Base.preview('tolls', s).reduce((a, g) => a + (g.n || 0), 0);
    for (const name of ['collectAll', 'collect']) {
      const f = Base[name];
      if (typeof f !== 'function') continue;
      Base[name] = function (...a) {
        const s = (name === 'collect' ? a[1] : a[0]) || st();
        if (name === 'collect' && a[0] !== 'tolls') return f.apply(this, a);
        const before = s ? tollsWaiting(s) : 0, out = f.apply(this, a);
        if (s && before > 0 && tollsWaiting(s) < before) tolled(s);
        return out;
      };
    }
  }

  // Things Bess has for you: the story quest on offer or done, each job done and not claimed, the bonus.
  function ready(s = st()) {
    if (!here(s)) return 0;
    const S = story(s).state;
    let n = S === 'offered' || S === 'done' ? 1 : 0;
    const D = today(s);
    if (D) n += D.jobs.filter(j => jobDone(j) && !j.claimed).length + (bonusReady(s) ? 1 : 0);
    return n;
  }

  // ════════════════════════════════════════════════════════════════════ the page
  const page = typeof document !== 'undefined';
  const click = () => { if (typeof sfx === 'function') sfx('click'); };
  const ico = (n, size) => h('img', { class: 'px', src: iconURL(UI_ICONS[n] ? n : 'star'), alt: '', width: size || 16, height: size || 16, draggable: 'false' });
  const timeStr = ms => { const m = Math.max(1, Math.ceil(ms / 60000)), hh = Math.floor(m / 60); return hh ? `${hh}h ${String(m % 60).padStart(2, '0')}m` : `${m}m`; };
  const matName = id => (MATERIALS.find(m => m.id === id) || { name: id }).name;

  // ── the arrival: the cart rolls in while the Hearth shows (js/campscene.js), else she's simply there
  let arriving = 0, arriveTimer = 0;
  const atHearth = () => {
    const c = typeof Camp !== 'undefined' && typeof App !== 'undefined' && App.current === 'home' ? Camp.scene : null;
    return !!c && !c.onRoad && c.road < 0.01 && $('#sheet').hidden && $('#screen').hidden && !!document.querySelector('.camp [data-tut=hearth-setout]');
  };
  function arrive(o = {}) {
    const s = st();
    if (!s) return false;
    const fresh = come(s);
    if (typeof Save !== 'undefined') Save.commit();
    const roll = fresh && page && !o.instant && !noMotion() && typeof Camp !== 'undefined' && Camp.scene && App.current === 'home' && !Camp.scene.onRoad;
    if (roll) {
      arriving = performance.now();
      clearTimeout(arriveTimer);
      arriveTimer = setTimeout(() => { arriving = 0; if (typeof App !== 'undefined') App.refresh(); }, (CampScene.ARRIVE || 5000) + 80);
    }
    if (page && typeof App !== 'undefined') App.refresh();
    return fresh;
  }
  // What the scene draws (js/camp.js's sceneState): null until she's here.
  const scene = (s = st()) => (here(s) ? { arrive: arriving } : null);

  // ── her panel (css/quests.css, qs-): Bess large on the left with her line, her quests on the right
  let P = null; // { root, K, say, body, line, tick, keys }
  const shown = () => !!P && P.root.isConnected;
  function lineFor(s) {
    const S = story(s).state, D = today(s), q = s.quests;
    if (S === 'offered') return BESS_LINES.offer[0];
    if (S === 'done') return BESS_LINES.done;
    if (D && (D.jobs.some(j => jobDone(j) && !j.claimed) || bonusReady(s))) return BESS_LINES.ready;
    if (D && q.jobs === 'new') return BESS_LINES.jobsNew;
    if (D && D.bonus && D.jobs.every(j => j.claimed)) return BESS_LINES.allDone;
    if (S === 'on') return BESS_LINES.on;
    return BESS_LINES.tap[Math.floor(Math.random() * BESS_LINES.tap.length)];
  }
  function open(o = {}) {
    const s = st();
    if (!page || !here(s)) return false;
    if (shown()) close();
    const K = Kit.panel({ icon: 'scroll', title: 'Quests', cls: 'qs-panel', onClose: close });
    const say = h('div', { class: 'qs-say', role: 'note' }, h('b', { text: 'Bess' }), h('span'));
    const body = h('div', { class: 'qs-body' });
    K.body.append(body);
    const root = h('div', { class: 'qs' }, K.root, h('img', { class: 'qs-pt', src: BessArt.portraitURL(), alt: 'Bess', draggable: 'false' }), say);
    P = { root, K, say, body, line: o.line || lineFor(s) };
    // her new-jobs card was answered by opening the panel
    if (s.quests.jobs === 'new' && o.jobs) { s.quests.jobs = 'seen'; Save.commit(); }
    openSheet(root, 'quests');
    draw();
    P.tick = setInterval(() => { if (!shown()) { end(); return; } const t = P.body.querySelector('.qs-timer span'); if (t) t.textContent = timeStr(resetIn(st())); if (today(st()) && P.day !== st().quests.daily.day) draw(); }, 1000);
    P.keys = ev => { if (!shown()) { end(); return; } if (ev.key === 'Escape') { ev.preventDefault(); click(); close(); } };
    document.addEventListener('keydown', P.keys);
    return true;
  }
  function end() { if (!P) return; clearInterval(P.tick); document.removeEventListener('keydown', P.keys); P = null; }
  function close() {
    if (!P) return;
    const was = shown();
    end();
    if (was && !$('#sheet').hidden && $('#sheet').querySelector('.qs')) closeSheet();
    const s = st();
    if (s && s.quests.jobs === 'new' && today(s)) { s.quests.jobs = 'seen'; Save.commit(); }
    if (typeof App !== 'undefined' && App.current === 'home') App.refresh();
  }
  function say(text) {
    if (P) P.line = text;
    if (shown()) { const sp = P.say.querySelector('span'); sp.textContent = text; P.say.classList.remove('pop'); void P.say.offsetWidth; P.say.classList.add('pop'); }
  }
  const btn = (label, cls, tut, fn) => h('button', { class: 'kp-btn qs-b ' + cls, type: 'button', 'data-tut': tut, onclick: () => { click(); fn(); } }, label);
  // a reward as icons and numbers
  const gains = (R, s) => {
    if (R.plan) {
      const art = typeof HearthArt !== 'undefined' && HearthArt.building(BUILDINGS[R.plan].art);
      return h('span', { class: 'qs-rw plan', title: `${BUILDINGS[R.plan].name} plan` }, art ? h('img', { class: 'qs-plan', src: art.toDataURL(), alt: '', draggable: 'false' }) : ico('scroll'), h('span', {}, h('b', { text: BUILDINGS[R.plan].name }), h('em', { text: 'Plan' })));
    }
    return h('span', { class: 'qs-rw' }, ico('coin', 14), fmt(R.gold), ico(Base.matIcon(R.mat), 14), String(R.n));
  };
  function storyCard(s) {
    const S = story(s), R = storyReward(s), big = S.state === 'offered';
    const pct = Math.round(100 * S.lit / Math.max(1, S.of));
    const act = S.state === 'offered' ? btn('Accept', '', 'quest-accept', () => { accept(); Save.commit(); say(BESS_LINES.accepted); draw(); }) :
      S.state === 'done' ? btn('Claim', '', 'quest-claim', () => {
        const got = claimStory();
        Save.commit();
        if (got) { if (typeof sfx === 'function') sfx(got.plan ? 'unlock' : 'coin'); toast(got.plan ? `${BUILDINGS[got.plan].name} plan` : `+${fmt(got.gold)} gold · +${got.n} ${matName(got.mat)}`); }
        say(BESS_LINES.claimed); draw();
      }) : null;
    return h('div', { class: 'qs-card' + (big ? ' big' : '') + (S.state === 'done' ? ' ready' : ''), 'data-tut': 'quest-card', title: big ? null : S.text },
      h('span', { class: 'qs-ic' }, ico('skull', 22)),
      h('div', { class: 'qs-main' },
        h('div', { class: 'qs-nm', text: S.name }),
        big ? h('p', { class: 'qs-text', text: `“${S.text}”` }) : null,
        h('div', { class: 'qs-goal' }, h('span', { class: 'qs-gt' }, S.goal, h('i', { text: S.stage })),
          h('span', { class: 'qs-bar' }, h('i', { style: `width:${pct}%` })), h('span', { class: 'qs-n', text: `${S.lit}/${S.of}` }))),
      h('div', { class: 'qs-side' }, gains(R, s), act));
  }
  function jobsBlock(s) {
    const D = today(s);
    if (!D) return null;
    const R = jobReward(s);
    const rows = D.jobs.map((j, i) => h('div', { class: 'qs-job' + (jobDone(j) ? ' done' : '') + (j.claimed ? ' claimed' : ''), title: JOB_KINDS[j.kind].tip || null },
      h('span', { class: 'qs-ji' }, ico(JOB_KINDS[j.kind].icon, 18)),
      h('span', { class: 'qs-jn', text: jobName(j) }),
      h('span', { class: 'qs-bar' }, h('i', { style: `width:${Math.round(100 * j.done / j.need)}%` })),
      h('span', { class: 'qs-n', text: `${j.done}/${j.need}` }),
      gains(R, s),
      j.claimed ? h('span', { class: 'qs-tick' }, ico('check', 16)) : jobDone(j) ? btn('Claim', 'sm', 'job-claim', () => {
        const got = claimJob(i);
        Save.commit();
        if (got) { if (typeof sfx === 'function') sfx('coin'); toast(`+${fmt(got.gold)} gold · +${got.n} ${matName(got.mat)}`); }
        say(D.bonus && D.jobs.every(x => x.claimed) ? BESS_LINES.allDone : BESS_LINES.ready); draw();
      }) : h('span', { class: 'qs-tick off' })));
    const all = D.jobs.filter(jobDone).length, ready2 = bonusReady(s);
    const bonus = h('div', { class: 'qs-job bonus' + (ready2 ? ' done' : '') + (D.bonus ? ' claimed' : '') },
      h('span', { class: 'qs-ji' }, ico('bag', 18)),
      h('span', { class: 'qs-jn', text: 'All three' }),
      h('span', { class: 'qs-pips' }, D.jobs.map(j => h('i', { class: jobDone(j) ? 'on' : '' }))),
      h('span', { class: 'qs-n', text: `${all}/${D.jobs.length}` }),
      h('span', { class: 'qs-rw' }, ico('bag', 14), 'Fine+', ico('flask', 14), String(QUEST.BONUS_ITEMS)),
      D.bonus ? h('span', { class: 'qs-tick' }, ico('check', 16)) : ready2 ? btn('Claim', 'sm', 'bonus-claim', () => {
        const got = claimBonus();
        Save.commit();
        if (got) {
          if (typeof sfx === 'function') sfx('coin');
          const nm = Items.def(got.piece) ? Items.def(got.piece).name : 'Gear';
          toast([got.sold ? `${nm} sold · +${fmt(got.sold)} gold` : nm, ...Object.entries(got.items).map(([id, n]) => `+${n} ${ITEMS[id].name}`)].join(' · '));
        }
        say(D.jobs.every(j => j.claimed) ? BESS_LINES.allDone : BESS_LINES.ready); draw();
      }) : h('span', { class: 'qs-tick off' }));
    return h('div', { class: 'qs-jobs', 'data-tut': 'jobs' },
      h('div', { class: 'qs-jh' }, h('span', { class: 'qs-jt', text: 'Jobs' }), h('span', { class: 'qs-timer', title: 'New jobs at midnight' }, ico('hourglass', 14), h('span', { text: timeStr(resetIn(s)) }))),
      ...rows, bonus);
  }
  function draw() {
    if (!shown()) return;
    const s = st(), S = story(s), D = today(s);
    P.day = D ? D.day : null;
    P.body.replaceChildren(...[S.state && S.state !== 'claimed' ? storyCard(s) : null, jobsBlock(s), !D && (!S.state || S.state === 'claimed') ? h('p', { class: 'qs-none', text: 'No jobs yet' }) : null].filter(Boolean));
    P.root.classList.toggle('jobs', !!D);
    const sp = P.say.querySelector('span');
    if (sp.textContent !== P.line) sp.textContent = P.line;
    if (P.K.count) P.K.count.textContent = D ? `${D.jobs.filter(j => j.claimed).length}/${D.jobs.length}` : '';
    if (typeof App !== 'undefined' && App.current === 'home') App.refresh();
  }

  // ── a tap on her at the fire (js/camp.js): she tips her hat, then her panel opens
  function tap() { if (page) setTimeout(() => { if (here() && $('#sheet').hidden) open(); }, 280); }

  // ── the goal tracker's quest line, under the next goal at the Hearth (js/camp.js): the story quest while it's on
  function tracker() {
    return h('button', { class: 'cv-pnl cv-quest', type: 'button', 'data-tut': 'hearth-quest', hidden: true, onclick: () => { click(); open(); } },
      h('span', { class: 'cv-qi' }), h('span', { class: 'cv-qt' }), h('span', { class: 'cv-qc' }));
  }
  function syncTracker(el, s = st()) {
    if (!el) return;
    const S = here(s) ? story(s) : null, on = !!S && ['offered', 'on', 'done'].includes(S.state);
    el.hidden = !on;
    if (!on) return;
    const want = [S.state, S.lit].join('|');
    if (el.dataset.sig === want) return;
    el.dataset.sig = want;
    el.querySelector('.cv-qi').replaceChildren(ico(S.state === 'on' ? 'skull' : 'scroll', 14));
    el.querySelector('.cv-qt').textContent = S.state === 'offered' ? 'Bess' : S.state === 'on' ? 'The Sexton' : S.name;
    const chip = el.querySelector('.cv-qc');
    chip.textContent = S.state === 'offered' ? 'New' : S.state === 'on' ? S.stage : 'Claim';
    chip.classList.toggle('go', S.state !== 'on');
    el.setAttribute('aria-label', S.state === 'on' ? `${S.name}: ${S.goal}, ${S.stage}` : S.state === 'done' ? `${S.name}: done, claim it` : 'Bess has a quest');
  }

  // ── her card at the Hearth when the daily jobs open (as Wick's unlock cards are, js/visits.js): New, Daily jobs,
  // one line, Later or Show me
  let card = null;
  function showCard() {
    const pick = fn => () => { click(); const h0 = card; card = null; if (h0) h0.close(); fn(); };
    const el = h('div', { class: 'wk-card qs-card-new', role: 'dialog', 'aria-label': 'New: Daily jobs' },
      h('img', { class: 'wk-card-pt', src: BessArt.portraitURL(), alt: 'Bess', draggable: 'false' }),
      h('div', { class: 'wk-card-box' },
        h('div', { class: 'wk-card-hd' }, h('span', { class: 'wk-card-ic' }, h('img', { src: iconURL('scroll'), alt: '', draggable: 'false' })), h('b', { text: 'New' })),
        h('div', { class: 'wk-card-nm', text: 'Daily jobs' }),
        h('p', { text: 'Three a day, for gold and materials.' }),
        h('div', { class: 'wk-card-acts' },
          h('button', { class: 'wk-card-b', type: 'button', 'data-tut': 'jobs-later', onclick: pick(() => { const s = st(); s.quests.jobs = 'seen'; Save.commit(); App.refresh(); }) }, 'Later'),
          h('button', { class: 'wk-card-b pri', type: 'button', 'data-tut': 'jobs-show', onclick: pick(() => open({ jobs: true, line: BESS_LINES.jobsNew })) }, 'Show me'))));
    if (typeof sfx === 'function') sfx('unlock');
    card = Wick.show({ ui: el, tap: 'none', onDone: () => { card = null; } });
  }

  // ── the ticker: she comes by herself after 1-2 (once the first session is over), and her card shows when the jobs open
  const busy = () => (typeof Title !== 'undefined' && Title.up) || (typeof FirstSession !== 'undefined' && FirstSession.on) || !!Wick.step || !!Wick.soft || (typeof Visits !== 'undefined' && (Visits.card || Visits.on));
  let seenSave = null;
  function tick() {
    const s = st();
    if (!s) return;
    if (s !== seenSave) { seenSave = s; if (card) { const h0 = card; card = null; h0.close(); } if (P) close(); arriving = 0; }
    if (card || shown() || busy() || !atHearth()) return;
    const q = Q(s);
    if (!q.bess) { if (s.guide && s.guide.done && lit(QUEST.ARRIVES_AFTER, s)) arrive(); return; }
    if (q.jobs === 'new' && today(s)) {
      if (s.settings.tips === false) { q.jobs = 'seen'; Save.commit(); return; }
      showCard();
    }
  }
  if (page) setInterval(() => { try { tick(); } catch (e) { console.warn('Lantern Road: Bess', e); } }, 250);

  return {
    QUEST, JOB_KINDS, STORY: STORY_QUEST, LINES: BESS_LINES,
    ensure, come, here, story, accepted, accept, storyReward, claimStory,
    dayOf, resetIn, families, kinds, roll, today, jobName, jobReward, claimJob, bonusReady, claimBonus, count, ready,
    arrive, scene, open, close, say, tap, tracker, syncTracker,
    onChange: fn => listeners.push(fn),
    get arriving() { return !!arriving; }, get shown() { return shown(); }, get card() { return !!card; },
  };
})();
