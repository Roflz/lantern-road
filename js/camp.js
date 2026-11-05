'use strict';
// Lantern Road · the camp (screen 2; play-test notes 1.18–1.20; the design is docs/mockups/camp-views.html). The camp is
// views around one fire, drawn by js/campscene.js: the party view, close on the fire, with the Recruit Board, Wick and
// the amber road to the boss's chapel; and the buildings view, turned 180° and further back, with the plots. Drag
// sideways (or press ← and →) to turn; let go and the camera settles on the nearer view. Over the scene, as in the
// mockup: you and your Renown, the next goal, gold and bone dust, help and settings, the formation, plaques and chips
// on what's in the scene, and the corner's ribbon and big button (Set out, or Collect). Taps in the scene open what
// was tapped. Until the first blueprint the camera stays with the party.
// The road view (docs/mockups/road-view.html) is the same scene: tap the road, or Set out, and the camera flies up the
// road to the frontier with its stage's card open. Drag up or down (or the wheel, or ↑ ↓) to look along it a stage at
// a time; tap a stage for its card. Drag back past the first stage, or tap ‹, and it flies home.
// Also here: the first pick of a new game, "While you were away", the Renown track, the roster rows on the Party
// screen, and the building art. Building screens are js/buildings.js; the model is js/base.js.

// ── building art: pixel maps in one palette. Most come from the screen mockups; the Shop, the Masters' Hall and the
// four passive-bonus buildings are new, in the same style.
const BP = { w: '#5a4030', W: '#7a5a3a', d: '#2e2219', r: '#4a2228', R: '#6b3238', s: '#5f6266', S: '#7d8088', t: '#3a3c41', p: '#d8d0bc', y: '#f4a646', Y: '#ffe2a0', c: '#bfb29a', C: '#8a7e6a', x: '#a83a2a', g: '#e8c24a', b: '#2c3b55', B: '#3a4f75', h: '#c8a050', k: '#0d0911', m: '#9a8ea4', n: '#d8a878', v: '#6a3fa0', V: '#c9a6ff', e: '#5d7a34', E: '#86a84a' };
const BUILD_ART = {
  board: ['...rrrrrrrrrrrrrr...', '..rRRRRRRRRRRRRRRr..', '.rrrrrrrrrrrrrrrrrr.', '...d............d...', '...dwwwwwwwwwwwwd...', '...dwppwwpppwwpwd...', '...dwppwwpxpwwpwd...', '...dwppwwpppwwwwd...', '...dwwwwwwwwwppwd...', '...dwwpppwwwwppwd...', '...dwwpppwwwwwwwd...', '...dwwwwwwwwwwwwd...', '...d............d...', '...d......y.....d...', '...d.....yYy....d...', '..ddd.....y....ddd..'],
  infirmary: ['..........c...........', '.........ccC..........', '........cccCC.........', '.......ccccCCC........', '......cccxcCCCC.......', '.....ccxxxcCCCCC......', '....ccccxccCCCCCC.....', '...ccccccccCCCCCCC....', '..cccckkkkcCCCCCCCC...', '.ccccky..kcCCCCCCCCC..', 'cccckyYy.kcCCCCCCCCCC.', 'ccckyYYyykcCCCCCCCCCCC', 'dddddddddddddddddddddd'],
  tactician: ['.....xx.....', '.....x......', '.....d......', '....bbb.....', '...bbBbb....', '..bbbBbbb...', '.bbbbBbbbb..', '..sSssssS...', '..sSsyysS...', '..sSsYysS...', '..sSssssS...', '..sSssssS...', '..stssssS...', '..sSssstS...', '..sSsyysS...', '..sSsYysS...', '..sSssssS...', '..stsssSS...', '..sSssssS...', '..sSskksS...', '..sSskksS...', '.tttttttttt.'],
  barracks: ['....d.................', '....d..rrrrrrrrrrrrr..', '...rrrRRRRRRRRRRRRRRr.', '..rrrrrrrrrrrrrrrrrrrr', '.rrrrrrrrrrrrrrrrrrrrr', '..wwwwwwwwwwwwwwwwwww.', '..wWwwwwwWwwwwwWwwwww.', '..wyywwwwyywwwwwwyyww.', '..wYywwwwYywwwwwwYyww.', '..wwwwwwwwwwwwwwwwwww.', '..wwwwwwwwwddwwwwwwww.', '..wwwwwwwwwddwwwwwwww.', '..ddddddddddddddddddd.'],
  shrine: ['.......g........', '......ggg.......', '.......g........', '......ttt.......', '.....tgYgt......', '.....tsgst......', '....rrrrrrr.....', '...rRRRRRRRr....', '..rrrrrrrrrrr...', '...ssssssssS....', '...sSsssssSS....', '...sSsyyssSS....', '...sSyYYysSS....', '...sSyYYysSS....', '...sSyyyysSS....', '...sSsssssSS....', '..ttttttttttt...', '.y.........y....', '.p.........p....'],
  toll: ['..rrrrrrrrrrrrrrrrrr..', '.rRRRRRRRRRRRRRRRRRRr.', '..dddddddddddddddddd..', '..sS.....d..d.....sS..', '..sS.....gggg.....sS..', '..sS....gYggg.....sS..', '..sS....ggggg.....sS..', '..sS.....ggg......sS..', '..sS..............sS..', '..sS..............sS..', '..sS..............sS..', '..sS..............sS..', '.tttt............tttt.'],
  scav: ['d....................', 'dcc..................', 'dcccc................', 'dCcccccc.............', 'd.CCcccccc...........', 'd...CCCccccccc.......', 'd......CCCcccccccd...', 'd.........CCCCccd....', 'd..hhh.........d..mm.', 'd.hhhhh..hh....d.m..m', 'd.hhhhh.hhhh...dm.mm.', 'd.hhhhh.hhhh...d.m..m', 'ddddddddddddddddd.mm.'],
  yard: ['...hhh..........hhh...', '...hkh..........hkh...', '..wwwwww......wwwwww..', '....h............h....', '...hhh..........hhh...', '...hhh..........hhh...', '....w............w....', 'd..dw.d..d..d..d.wd..d', 'ddddwddddddddddddwdddd', 'd..dw.d..d..d..d.wd..d', 'd...w............w...d'],
  pit: ['...pp........pp...', '..dwwwwwwwwwwwwwd.', '.dkkkkkkkkkkkkkkkd', 'dkkkkkkkkkkkkkkkkd', '.dkkkkkkkkkkkkkkd.', '..ddddddddddddddd.'],
  road: ['......d.........', '....wwdwwwwww...', '....wWdWWWWWWw..', '....wwdwwwwww...', '......d.........', '..wwwwdw........', '.wWWWWdw........', '..wwwwdw........', '......d.........', '......d.........', '......d.........', '......d.........', '......d.........', '....ddddd.......'],
  plot: ['.......wwwww........', '.......wpgpw........', '.......wgggw........', '.......wpgpw........', '.......wwwww........', '.........w..........', 'd........w.........d', 'dhhhhhhhhwhhhhhhhhhd', 'd..................d', 'd..................d', 'dhhhhhhhhhhhhhhhhhhd'],
  // new for step 5
  shop: ['RpRpRpRpRpRpRpRpRpRp', 'RpRpRpRpRpRpRpRpRpRp', '.RpRpRpRpRpRpRpRpRp.', '.d................d.', '.d..y.......b..x..d.', '.d.yYy..g..bB.xx..d.', '.d..y..ggg.bB.xx..d.', '.dwwwwwwwwwwwwwwwwd.', '.dwWWWWWWWWWWWWWWwd.', '.dwwwwwwwwwwwwwwwwd.', '.dw.w.w.w.w.w.w.w.d.', '.dwwwwwwwwwwwwwwwwd.', '.d................d.', 'dd................dd'],
  hall: ['........gg........', '.......gYYg.......', '......tttttt......', '....tsSSSSSSst....', '..tsSSSSSSSSSSst..', 'tttttttttttttttttt', '.sS.sS.sS.sS.sS.s.', '.sS.sS.sS.sS.sS.s.', '.sS.sS.yY.sS.sS.s.', '.sS.sS.yY.sS.sS.s.', '.sS.sS.yY.sS.sS.s.', 'tttttttttttttttttt', 'dddddddddddddddddd'],
  whet: ['.....ssss.....', '...sSSSSSSs...', '..sS......Ss..', '.sS...ww...Ss.', '.sS..wkkw..Ss.', '.sS...ww...Ss.', '..sS......Ss..', '...sSSSSSSs...', '..w..ssss..w..', '..wwwwwwwwwww.', '..w..p.....w..', '.dd..p.....dd.', '.....p........'],
  ossuary: ['......ttt......', '....ttsSStt....', '...tsSSSSSSt...', '..tsSSSSSSSSt..', '..tSpkpkpkpSt..', '..tSpppppppSt..', '..tSpkpkpkpSt..', '..tSpppppppSt..', '..tSSSyySSSSt..', '..tSSyYYySSSt..', '..tSSyYYySSSt..', 'ttttttttttttttt'],
  hexing: ['....tt....', '...tSSt...', '..tSSSSt..', '..tSVSSt..', '..tSSVSt..', '..tSVVSt..', '..tSSVSt..', '..tSVSSt..', '..tSSSSt..', '.tSSSSSSt.', '.tSSSSSSt.', 'dddddddddd'],
  bell: ['......r......', '.....rRr.....', '....rRRRr....', '...rrrrrrr...', '...w.....w...', '...w.ggg.w...', '...w.gYg.w...', '...wgggggw...', '...w..k..w...', '...wwwwwww...', '...w.....w...', '...w.....w...', '...wwwwwww...', '...w.....w...', '...w.....w...', '..ddd...ddd..'],
};
// Icons the camp adds: a plus for empty plots, and each region's material.
if (typeof UI_ICONS !== 'undefined') Object.assign(UI_ICONS, {
  plus: { map: ['...e...', '...e...', '...e...', 'eeeeeee', '...e...', '...e...', '...e...'], pal: { e: '#f4a646' } },
  wax: { map: ['...y...', '..yYy..', '...k...', '.wwwww.', '.wWwww.', '.wwwww.', '.wwwww.'], pal: { y: '#f4a646', Y: '#ffe9a0', k: '#3a2a1c', w: '#e8dcc0', W: '#fff8e8' } },
  wood: { map: ['.ggg...', 'gGgggg.', '.gwwwg.', '..wWw..', '..wWw..', '..wWw..', '.wwwww.'], pal: { g: '#5d7a34', G: '#86a84a', w: '#6b4a2e', W: '#8a5f3a' } },
  iron: { map: ['.......', '..rrr..', '.rRRRr.', 'rRkkkRr', '.rkkkr.', '..rrr..', '.......'], pal: { r: '#c4572e', R: '#f08c46', k: '#3a3436' } },
  tallow: { map: ['...y...', '..yYy..', '...k...', '..www..', '.wwWww.', '.wwwww.', 'wwwwwww'], pal: { y: '#f4a646', Y: '#ffe9a0', k: '#3a2a1c', w: '#d8c8a0', W: '#f2e7d0' } },
  tent: { map: ['...c...', '..cCc..', '.ccxCc.', '.cxxxC.', 'cccxccC', 'ckkkkcC', 'dddddddd'], pal: { c: '#bfb29a', C: '#8a7e6a', x: '#a83a2a', k: '#0d0911', d: '#2e2219' } },
});

// What heroes say when tapped at the fire, by class, and when they're tired.
const CAMP_LINES = {
  sellsword: ['Pay’s late again.', 'Point me at something.', 'This edge won’t hone itself.'],
  hexblade: ['The fire whispers back.', 'Something out there owes me a curse.', 'Dark tonight. Good.'],
  pilgrim: ['Rest your feet a while.', 'The light holds. For now.', 'Eat something, at least.'],
  warden: ['The watch is mine tonight.', 'Sleep. I’ll stand.', 'Nothing gets past this shield.'],
  lamplighter: ['Keep it burning. Always.', 'Every lantern lit is a step home.', 'Mind the dark past the posts.'],
  crossbowman: ['Wind’s turning. Smells of rain.', 'I count seven crows.', 'One bolt, one foe.'],
  duellist: ['En garde, firelight.', 'They never see the riposte.', 'Dance with me, then.'],
  alchemist: ['Don’t touch that flask.', 'Smells like progress.', 'Stand back a little.'],
  surgeon: ['Hold still. This will sting.', 'Let me see that cut.', 'Boil the water first.'],
  bellringer: ['Every hour has its bell.', 'Hear that? Neither do they.', 'Ring once for luck.'],
  gravecaller: ['The bones are restless.', 'They answer when I call.', 'Even the dead need rest.'],
  cutpurse: ['Didn’t take anything. Promise.', 'Pockets are for emptying.', 'Shh. Listen.'],
};
const CAMP_TIRED = ['I could sleep for a week.', 'My feet are lead.', 'Give me an hour by the fire.'];
// What Wick says when tapped, until the guide comes (onboarding spec §6): placeholders, tune.
const WICK_LINES = ['Keep the fire fed. The road remembers who lit it.', 'Every lantern lit pushes the dark back a step.', 'Rest them well. The road is long.', 'Mind the graves past the posts. They listen.', 'I’ve tended this fire longer than I’ve had a name.'];

const Camp = (() => {
  const click = () => sfx('click');
  const timeStr = ms => { const m = Math.max(1, Math.ceil(ms / 60000)), hh = Math.floor(m / 60); return hh ? `${hh}h ${String(m % 60).padStart(2, '0')}m` : `${m}m`; };
  const noun = (n, a, b) => `${n} ${n === 1 ? a : b || a + 's'}`;
  const K = 2;                    // design pixels per scene pixel
  const IDLE = ['tollhouse', 'scavengercamp', 'salvagepit', 'trainingyard'];
  const cam = { yaw: 0 };         // which view the camera faces, kept across visits
  const firstOpenPlot = s => { const open = Base.plotsCleared(s); return s.base.plots.findIndex((p, i) => i < open && !p); };

  // ── what the camp shows, read from the save
  // The road: the frontier stage, a region's stages (the frontier's, unless another is asked for), and where the
  // frontier stands among them: -1 once every one of them is lit, the list's length when none can be lit yet.
  function road(s, r) {
    const fi = Campaign.frontier(s), done = fi >= STAGES.length, st = STAGES[Math.min(fi, STAGES.length - 1)];
    const region = r == null ? st.region : r, list = STAGES.filter(x => x.region === region);
    const front = done || region < st.region ? -1 : region > st.region ? list.length : list.indexOf(st);
    return { st, done, list, front, region };
  }
  // A stage's foes, each kind once, the boss first.
  const foesOf = st => [...new Set(st.foes.filter(Boolean).map(foeKey))].filter(k => FOE_ART[k] && FOES[k]).sort((a, b) => (FOES[b].boss ? 1 : 0) - (FOES[a].boss ? 1 : 0));
  // What the scene draws (js/campscene.js): the party at the fire, the road's stages, the plots and the board.
  function sceneState(s, r) {
    const R = road(s, r);
    const heroes = s.party.map(id => Save.char(id)).filter(Boolean).slice(0, 6).map(c => ({ c, spent: Fatigue.spent(c) }));
    const stages = R.list.map(st => ({ kind: st.boss ? 'boss' : st.elite ? 'elite' : 'road', lit: Campaign.isLit(st.id, s), foes: foesOf(st) }));
    const total = BASE.START_PLOTS + BASE.PLOT_RENOWN.length, open = Base.plotsCleared(s);
    const plots = Array.from({ length: total }, (_, i) => (i >= open ? null : s.base.plots[i] ? { id: s.base.plots[i], art: BUILDINGS[s.base.plots[i]].art } : { empty: true }));
    const board = { open: Base.boardOpen(s) }, gate = R.region + 1 < REGIONS.length;
    const sig = [heroes.map(x => `${x.c.id}:${x.c.cls}:${lookKey(Items.look(x.c))}:${x.spent ? 1 : 0}`).join(','), R.region, stages.map(x => (x.lit ? 1 : 0)).join(''), R.front, plots.map(p => (p ? p.id || '_' : '.')).join(','), board.open].join('|');
    return { heroes, region: R.region, stages, front: R.front, gate, plots, board, sig };
  }
  // The buildings view opens with the first blueprint: until then the camera stays with the party.
  const locked = s => !BUILDING_ORDER.some(id => BUILDINGS[id].plot !== false && (Base.built(id, s) || Base.blueprint(id, s)));
  // What waits at camp: a chip over each place with something to collect, and everything together for Collect.
  // chips: { board | fire | <building id>: [icon, n] }. all: [[icon, n], …]. full: the idle buildings at least half full.
  function waiting(s) {
    const chips = {}, sum = { gold: 0, mats: {}, items: 0, gear: 0, xp: 0 }, full = [];
    for (const id of [...IDLE, 'infirmary']) {
      if (!Base.built(id, s)) continue;
      const got = Base.preview(id, s);
      if (!got.length) continue;
      for (const g of got) {
        if (g.kind === 'gold') sum.gold += g.n;
        else if (g.kind === 'mat') sum.mats[g.mat] = (sum.mats[g.mat] || 0) + g.n;
        else if (g.kind === 'item') sum.items += g.n;
        else if (g.kind === 'gear') sum.gear++;
        else if (g.kind === 'xp') sum.xp++;
      }
      const gold = got.find(g => g.kind === 'gold'), mat = got.find(g => g.kind === 'mat'), items = got.filter(g => g.kind === 'item');
      chips[id] = gold ? ['coin', fmt(gold.n)] : mat ? [Base.matIcon(mat.mat), fmt(mat.n)] : items.length ? [ITEMS[items[0].item].icon, items.reduce((n, g) => n + g.n, 0)] : id === 'salvagepit' ? ['bag', got.length] : ['star', got.length];
      const st = Base.storage(id, s);
      if (id === 'infirmary' || (st && st.pct >= 0.5)) full.push(id);
    }
    if (s.freePotion.waiting) { chips.fire = ['flask', s.freePotion.waiting]; sum.items += s.freePotion.waiting; }
    if (Base.boardOpen(s) && s.board.picks > 0 && s.board.recruits.length && (s.board.fresh || s.board.free)) chips.board = ['scroll', s.board.recruits.length];
    const all = [];
    if (sum.gold) all.push(['coin', fmt(sum.gold)]);
    for (const m in sum.mats) all.push([Base.matIcon(m), fmt(sum.mats[m])]);
    if (sum.items) all.push(['flask', sum.items]);
    if (sum.gear) all.push(['bag', sum.gear]);
    if (sum.xp) all.push(['star', sum.xp]);
    return { chips, all, full };
  }
  // The next goal, from today's state (onboarding spec §6.3, without its rewards yet): the first of these that applies.
  function goal(s, W) {
    if (Base.boardOpen(s) && s.board.free && s.board.picks > 0 && s.board.recruits.length) return { text: 'Hire a free recruit', go: () => Buildings.open('recruitboard') };
    const team = [...s.party.map(id => Save.char(id)).filter(Boolean), ...s.roster.filter(c => !s.party.includes(c.id))];
    for (const c of team) {
      const P = Hero.points(c);
      if (P.stat > 0) return { text: `Spend ${noun(P.stat, 'stat point')}`, go: () => App.showCharacter(c.id, 'stats') };
      if (P.skill > 0) return { text: `Spend ${noun(P.skill, 'skill point')}`, go: () => App.showCharacter(c.id, 'skills') };
    }
    const plot = firstOpenPlot(s), bp = plot >= 0 && Base.available(s).find(id => Base.canPay(Base.cost(id, 1), s));
    if (bp) return { text: `Build the ${BUILDINGS[bp].name}`, go: () => Buildings.buildSheet(plot, bp) };
    if (W.full.length) return { text: W.full.length === 1 ? `Collect at the ${BUILDINGS[W.full[0]].name}` : `Collect from ${W.full.length} buildings`, go: () => ui && ui.turnTo('build') };
    const R = road(s);
    return R.done ? { text: 'Every lantern is lit', go: setOut } : { text: `Clear ${R.st.id}`, go: setOut };
  }
  // Anything waiting at camp: the Camp tab's dot (js/guide.js).
  const anyWaiting = s => Object.keys(waiting(s).chips).length > 0;

  // ── actions
  // Set out: the camera flies up the road to the frontier, with its card open; one more tap sets out. (Away from the
  // camp, the Road map with the frontier's sheet, as before.)
  function setOut() {
    const s = Save.state;
    if (ui && ui.live && App.current === 'home') { ui.toRoad(); return; }
    App.go('map');
    if (typeof RoadMap !== 'undefined') RoadMap.stageSheet(Math.min(Campaign.frontier(s), STAGES.length - 1));
  }
  // Collect: every idle building's store, the still-room and the fire's draughts, as "Gather it all" does.
  function gatherAll() {
    const got = Base.collectAll(Save.state);
    Save.commit();
    if (got.length) { sfx('coin'); toast(got.slice(0, 4).map(g => g.text).join(' · ') + (got.length > 4 ? ' …' : '')); } else toast('Nothing to collect yet');
    for (const g of got) if (g.kind === 'xp' && g.to > g.from) LevelUp.toast(g.c, { from: g.from, to: g.to });
    App.refresh();
  }
  // The + by gold and bone dust: where you earn more. The building if it stands, its blueprint's build sheet if you
  // have one, or where it comes from.
  function earnMore(id) {
    const s = Save.state;
    if (Base.built(id, s)) { Buildings.open(id); return; }
    if (Base.blueprint(id, s)) { const plot = firstOpenPlot(s); if (plot >= 0) Buildings.buildSheet(plot, id); else toast('Every plot is taken. Renown clears more of them.'); return; }
    toast(`${BUILDINGS[id].name}: a blueprint from ${BASE_UNLOCK_STAGE[BUILDINGS[id].unlock]}`);
  }
  function tapFire() {
    const n = Base.collectPotions(Save.state);
    if (n) { Save.commit(); sfx('coin'); toast(`+${n} Healing Draught${n === 1 ? '' : 's'} from the fire`); if (ui) ui.sync(); }
    else { const t = Base.potionIn(Save.state); toast(t == null ? 'The fire crackles.' : `A free Healing Draught in ${timeStr(t)}`); }
  }
  const leader = s => s.party.map(id => Save.char(id)).find(Boolean) || s.roster[0] || null;

  // ── the camp screen: the scene, and the HUD over it
  const pxImg = (src, size, cls = '') => h('img', { class: 'px ' + cls, src, alt: '', width: size, height: size, draggable: 'false' });
  const icon = (name, size) => pxImg(iconURL(name), size);
  const fatCol = c => ({ fresh: 'var(--good)', weary: 'var(--gold)', exhausted: 'var(--bad)', spent: 'var(--blood)' }[Fatigue.state(c)]);
  const FORM = [2, 3, 0, 4, 5, 1]; // the formation as it stands in battle: two columns behind, the front on the right
  let ui = null;
  function screen() {
    const camp = h('div', { class: 'camp', tabindex: '0', 'aria-label': 'The Hearth. Drag sideways, or use the arrow keys, to turn between the party and the buildings.' });
    const canvas = h('canvas', { class: 'cv-scene', 'aria-hidden': 'true' });
    const marks = h('div', { class: 'cv-marks', 'aria-hidden': 'true' });
    const face = h('span', { class: 'cv-face' }), lvl = h('em'), bar = h('i');
    const me = h('button', { class: 'cv-pnl cv-me', onclick: () => { click(); showRenown(); } }, face, h('span', { class: 'cv-t' }, h('span', { class: 'cv-nm', text: 'Traveller' }), h('span', { class: 'cv-meter' }, bar)));
    face.append(lvl);
    const goalText = h('span', { class: 'cv-gt' });
    const goalBtn = h('button', { class: 'cv-pnl cv-goal' }, h('span', { class: 'cv-gk', text: 'Next' }), goalText, h('span', { class: 'cv-go', text: 'Go' }));
    const gold = h('span', { class: 'cv-cv gold' }), bone = h('span', { class: 'cv-cv' });
    const purse = h('div', { class: 'cv-purse' },
      h('div', { class: 'cv-cur', title: 'Gold' }, h('span', { class: 'cv-ci' }, icon('coin', 22)), gold, h('button', { class: 'cv-plus', 'aria-label': 'Earn more gold', onclick: () => { click(); earnMore('tollhouse'); } }, '+')),
      h('div', { class: 'cv-cur', title: 'Bone Dust' }, h('span', { class: 'cv-ci' }, icon('bone', 22)), bone, h('button', { class: 'cv-plus', 'aria-label': 'Earn more bone dust', onclick: () => { click(); earnMore('scavengercamp'); } }, '+')));
    const corner = h('div', { class: 'cv-corner' },
      h('button', { class: 'cv-round', 'aria-label': 'Help', onclick: () => { click(); showHow(() => closeScreen()); } }, '?'),
      h('button', { class: 'cv-round', 'aria-label': 'Settings', onclick: () => { click(); App.openSettings(); } }, icon('gear', 18)));
    const proto = h('button', { class: 'chip proto proto-only cv-proto', onclick: () => { click(); App.actions.proto(); } }, 'Prototype');
    const rb = (ic, label, fn) => h('button', { class: 'cv-rb', onclick: () => { click(); fn(); } }, h('span', { class: 'cv-orb' }, icon(ic, 26), h('i', { class: 'cv-dot', hidden: true })), h('span', { text: label }));
    const heroesB = rb('helm', 'Heroes', () => App.go('party'));
    const tacticsB = rb('scroll', 'Tactics', () => { const c = leader(Save.state); App.actions.tactics(c ? c.id : 'party', 'home'); });
    const bagB = rb('bag', 'Bag', () => App.go('bag'));
    const goTag = h('span', { class: 'cv-tag' }), colTag = h('span', { class: 'cv-tag' });
    const go = h('button', { class: 'cv-big' }, goTag, h('span', { class: 'cv-orb' }, icon('boot', 34)), h('span', { text: 'Set out' }));
    const collect = h('button', { class: 'cv-big collect', hidden: true }, colTag, h('span', { class: 'cv-orb' }, icon('coin', 34)), h('span', { text: 'Collect' }));
    go.addEventListener('click', () => { click(); setOut(); });
    collect.addEventListener('click', () => { click(); gatherAll(); });
    const form = h('div', { class: 'cv-form cv-nodrag', role: 'group', 'aria-label': 'The formation' });
    // the road view (docs/mockups/road-view.html): back to the Hearth, the region with ‹ ›, and the chosen stage's card
    // with its big button (Set out, Farm or Locked)
    const back = h('button', { class: 'cv-round cv-back', 'data-tut': 'road-back', 'aria-label': 'Back to the Hearth', onclick: () => { click(); home(); } }, '‹');
    const rk = h('span', { class: 'cv-rk' }), rn = h('span', { class: 'cv-rn' });
    const prevR = h('button', { class: 'cv-arw', 'aria-label': 'The region before', onclick: () => otherRegion(-1) }, '‹');
    const nextR = h('button', { class: 'cv-arw', 'aria-label': 'The next region', onclick: () => otherRegion(1) }, '›');
    const cardBox = h('div', { class: 'cv-cardbox' });
    const roadHud = h('div', { class: 'cv-roadhud' }, back, h('div', { class: 'cv-region' }, h('div', { class: 'cv-rt' }, rk, rn), prevR, nextR), cardBox);
    const dock = h('div', { class: 'cv-dock' }, heroesB, tacticsB, bagB, go, collect);
    const labels = h('div', { class: 'cv-labels', 'aria-hidden': 'true' });
    camp.append(canvas, marks, labels, h('div', { class: 'cv-shade t' }), h('div', { class: 'cv-shade b' }), form, dock, me, goalBtn, roadHud, purse, corner, proto);
    const el = h('div', { class: 'camp-view' }, camp);

    let live = null, chips = {}, goalNow = null, placed = { v: -1, w: -1, sig: '', r: -1, sel: null }, alive = true;
    let region = null, ahead = [], cardFor = null; // the region on the road (null: the frontier's), stages ahead with something new, the card's stage
    const pool = new Map(), tags = new Map();
    // ── from the save into the HUD and the scene
    function sync() {
      const s = Save.state;
      if (!s || !alive) return;
      const R = Base.renown(s), lead = leader(s), W = waiting(s);
      face.replaceChildren(lead ? pxImg(heroPortrait(lead), 32) : icon('lantern', 22), lvl);
      lvl.textContent = String(R.level);
      bar.style.width = Math.round(100 * R.into / R.need) + '%';
      me.setAttribute('aria-label', `Renown ${R.level}: open the Renown track`);
      goalNow = goal(s, W);
      goalText.textContent = goalNow.text;
      goalBtn.onclick = () => { click(); goalNow.go(); };
      gold.textContent = fmt(s.currencies.gold);
      bone.textContent = fmt(s.currencies.mats.bone_dust || 0);
      const dots = (App.actions.dots && App.actions.dots()) || {};
      heroesB.querySelector('.cv-dot').hidden = !dots.party;
      bagB.querySelector('.cv-dot').hidden = !dots.bag;
      const Rd = road(s);
      goTag.hidden = Rd.done;
      goTag.replaceChildren(...(Rd.st.kind !== 'road' ? [h('i', { class: 'cv-el' })] : []), Rd.st.id);
      go.setAttribute('aria-label', Rd.done ? 'Set out' : `Set out for ${Rd.st.id}`);
      colTag.hidden = !W.all.length;
      colTag.replaceChildren(...W.all.slice(0, 3).flatMap(([ic, n]) => [icon(ic, 12), String(n)]));
      chips = W.chips;
      // the formation, as it stands in battle, with level and fatigue
      form.replaceChildren(...FORM.map(slot => {
        const c = Save.char(s.party[slot]), front = slot < 2;
        const tile = h('button', { class: 'cv-tile' + (front ? ' front' : '') + (c ? '' : ' empty') + (c && Fatigue.spent(c) ? ' spent' : ''), 'data-slot': String(slot), 'aria-label': c ? `${c.name}, level ${c.level}` : 'Empty slot: add a hero' },
          h('span', { class: 'cv-fc' }, c ? [pxImg(heroPortrait(c), 34), h('em', { text: String(c.level) })] : '+'),
          c ? h('span', { class: 'cv-ft' }, h('i', { style: `width:${Math.min(100, Math.round(c.fatigue || 0))}%;background:${fatCol(c)}` })) : null);
        return tile;
      }));
      if (live) { live.state = sceneState(s, region); live.locked = locked(s); }
      // the road view: the region's name and how much of it is lit, which way ‹ › can go, the stages ahead whose first
      // clear brings something new, and the card again (the party or the save may have changed)
      const Rv = road(s, region), lit = Rv.list.filter(x => Campaign.isLit(x.id, s)).length, Reg = REGIONS[Rv.region];
      rk.textContent = `Region ${Reg.num} · ${lit} of ${Rv.list.length} lit`;
      rn.textContent = Reg.name;
      prevR.classList.toggle('shut', Rv.region <= 0);
      nextR.classList.toggle('shut', Rv.region >= Rd.st.region);
      ahead = [];
      if (Rv.front >= 0) for (let k = Rv.front; k < Rv.list.length && ahead.length < 3; k++) {
        const u = (Rv.list[k].first || []).map(id => UNLOCKS[id]).find(x => x && x.kind !== 'condition');
        if (u) ahead.push([k, u.icon || 'star']);
      }
      if (cardFor != null) showCard(cardFor);
      placed.sig = '';
    }
    // ── the road view
    // Fly up the road to stage k of the region on show (the frontier when not given), with its card open.
    function toRoad(k) {
      if (!live) return;
      const s = Save.state;
      if (region != null) { region = null; sync(); }
      const Rd = road(s);
      if (k == null) k = Rd.front < 0 ? Rd.list.length - 1 : Math.min(Rd.front, Rd.list.length - 1);
      live.toRoad(k);
    }
    // Home to the fire; the road shows the frontier's region again once the camera lands.
    function home() { if (live) live.toCamp(); }
    // ‹ › beside the region's name: the region before, or the next once its gate is open.
    function otherRegion(dir) {
      const s = Save.state, cur = road(s, region), fr = road(s).st.region, r = cur.region + dir;
      if (r < 0 || r > fr || !live) return;
      click();
      region = r === fr ? null : r;
      sync();
      const R = road(s, region);
      live.toRoad(R.front < 0 ? R.list.length - 1 : Math.min(R.front, R.list.length - 1), true);
    }
    // A stage's card: its id and name, the level and party it wants (green when you have them), its foes (shadows
    // until it's reached), what it gives (a first clear's unlocks marked), and the big button.
    // Built again only when something on it changes, so a tap on it is never lost to the camp's refresh.
    function showCard(k) {
      cardFor = k;
      const s = Save.state, st = k == null ? null : road(s, region).list[k];
      if (!st) { cardBox.replaceChildren(); cardBox.dataset.sig = ''; return; }
      const state = Campaign.stateOf(st.index), lit = state === 'lit', front = state === 'frontier';
      const fit = Campaign.fit(s), low = fit.length ? Math.min(...fit.map(c => c.level)) : 0;
      const sig = [st.id, state, fit.length, low].join('|');
      if (cardBox.dataset.sig === sig) return;
      cardBox.dataset.sig = sig;
      const firsts = lit ? [] : (st.first || []).map(id => UNLOCKS[id]).filter(Boolean).slice(0, 2);
      const card = h('button', { class: 'cv-card', 'data-tut': 'stage-card', 'aria-label': `${st.id} ${st.name}: the stage in full`, onclick: () => { click(); RoadMap.stageSheet(st.index); } },
        h('span', { class: 'cv-hd' },
          st.boss ? icon('skull', 14) : st.elite ? h('i', { class: 'cv-el' }) : null,
          h('span', { class: 'cv-id' + (lit ? ' lit' : ''), text: st.id }), h('span', { class: 'cv-cn', text: st.name }),
          h('span', { class: 'cv-chip ' + (fit.length && low >= st.level ? 'ok' : 'no') }, icon('star', 12), `Lv ${st.level}`),
          h('span', { class: 'cv-chip ' + (fit.length >= st.party ? 'ok' : 'no') }, icon('helm', 12), String(st.party))),
        h('span', { class: 'cv-foes' }, foesOf(st).slice(0, 5).map(f => h('span', { class: state === 'dark' ? 'dark' : '' }, pxImg(portraitURL(f, false), 32)))),
        h('span', { class: 'cv-loot' }, icon('coin', 20), icon(Base.matIcon(REGIONS[st.region].mat), 20), icon('bag', 20),
          firsts.map(u => h('span', { class: 'first', title: u.name }, icon(u.icon || 'star', 20), pxImg(iconURL('star'), 14, 'cv-star')))));
      const big = front ? h('button', { class: 'cv-big cv-roadgo', 'data-tut': 'road-go', 'aria-label': `Set out for ${st.id}`, onclick: () => RoadMap.setOut(st.index) }, h('span', { class: 'cv-orb' }, icon('boot', 34)), h('span', { text: 'Set out' }))
        : lit ? h('button', { class: 'cv-big cv-roadgo farm', 'data-tut': 'road-go', 'aria-label': `Farm ${st.id}`, onclick: () => RoadMap.setOut(st.index) }, h('span', { class: 'cv-orb' }, icon('sword', 30)), h('span', { text: 'Farm' }))
          : h('button', { class: 'cv-big cv-roadgo shut', 'data-tut': 'road-go', 'aria-disabled': 'true', 'aria-label': `${st.id} is locked` }, h('span', { class: 'cv-orb' }, icon('lock', 30)), h('span', { text: 'Locked' }));
      cardBox.replaceChildren(card, big);
    }
    // Labels that follow the road: each stage's id, the frontier's callout, the boss's name, bubbles over stages whose
    // first clear brings something new, and the gate to the next region.
    function tag(key, make, x, y, op) {
      let n = tags.get(key);
      if (!n) { n = make(); n._at = {}; tags.set(key, n); labels.append(n); }
      const A = n._at, o = Math.round(op * 50) / 50;
      if (A.x !== x || A.y !== y) { A.x = x; A.y = y; n.style.transform = `translate(${x}px,${y}px) translate(-50%,-100%)`; }
      if (A.o !== o) { A.o = o; n.style.opacity = o; }
      return n;
    }
    function roadLabels(out, wr, seen) {
      if (wr <= 0.02) return;
      const S = live.state, Rv = road(Save.state, region), Reg = REGIONS[Rv.region], next = REGIONS[Rv.region + 1];
      for (const a of out.anchors) {
        if (a.stage != null) {
          const st = Rv.list[a.stage], x = Math.round(a.x * K), ty = Math.round(a.top * K) - 4;
          if (!st || ty < 84 || ty > 296) continue;
          if (a.front) { tag('co' + a.stage, () => h('span', { class: 'cv-call' }, st.kind !== 'road' ? h('i', { class: 'cv-el' }) : null, h('b', { text: st.id }), st.name.replace(/^The /, '')), x, ty - 8, wr); seen.add('co' + a.stage); }
          else if (a.kind === 'boss') { tag('boss', () => h('span', { class: 'cv-bossname', text: Reg.boss }), x, ty - 6, wr).textContent = Reg.boss; seen.add('boss'); }
          else if (a.s > 0.42) { const n = tag('id' + a.stage, () => h('span', { class: 'cv-sid' }, st.id), x, ty - 4, wr * Math.min(1, (a.s - 0.42) * 6)); n.className = 'cv-sid' + (a.on ? ' lit' : ' dark') + (st.kind === 'elite' ? ' elite' : '') + (out.sel === a.stage ? ' sel' : ''); n.textContent = st.id; seen.add('id' + a.stage); }
          const ua = ahead.find(([k]) => k === a.stage);
          if (ua && !a.front) { const n = tag('ul' + a.stage, () => h('span', { class: 'cv-unl' }), x, ty - 26, wr); if (n.dataset.ic !== ua[1]) { n.dataset.ic = ua[1]; n.replaceChildren(icon(ua[1], 16)); } seen.add('ul' + a.stage); }
        }
        if (a.id === 'gate' && S.gate && next) {
          const top = Math.round(a.top * K);
          if (top > 70 && top < 320) { const n = tag('gate', () => h('span', { class: 'cv-gate' }), Math.round(a.x * K), top - 4, wr); const want = next.num + next.name; if (n.dataset.sig !== want) { n.dataset.sig = want; n.replaceChildren(icon('lock', 14), h('b', { text: `Region ${next.num}` }), next.name); } seen.add('gate'); }
        }
      }
    }
    // ── plaques, chips and Wick's word, following the scene
    function mark(key, cls, id, make) {
      let node = pool.get(key);
      if (!node) { node = make(); node.dataset.id = id; node.classList.add(cls); node._at = {}; pool.set(key, node); marks.append(node); }
      return node;
    }
    // Moves a mark (left and top as its centre-top, for taps; a transform on screen) and fades it, writing only what changed.
    function put(n, x, y, op, z) {
      const A = n._at, o = Math.round(op * 50) / 50;
      if (A.x !== x || A.y !== y) { A.x = x; A.y = y; n.style.transform = `translate(${x}px,${y}px) translateX(-50%)`; }
      if (A.o !== o) { A.o = o; n.style.opacity = o; }
      if (z != null && A.z !== z) { A.z = z; n.style.zIndex = z; }
    }
    const fade = (el, v, key) => { const o = Math.round(v * 50) / 50; if (el._o === o) return; el._o = o; el.style.opacity = o; if (key) el.style.visibility = o < 0.02 ? 'hidden' : 'visible'; };
    const nameOf = a => (a.id === 'board' ? 'Recruit Board' : a.plot != null ? (live.state.plots[a.plot].empty ? 'Empty plot' : BUILDINGS[live.state.plots[a.plot].id].name) : null);
    const chipOf = a => (a.id === 'board' ? chips.board : a.id === 'fire' ? chips.fire : a.plot != null && !live.state.plots[a.plot].empty ? chips[live.state.plots[a.plot].id] : null);
    function place(out) {
      const w = out.cam.w, R = out.road, sig = Object.entries(chips).map(([k, v]) => k + v.join('')).join(',');
      if (out.v === placed.v && w === placed.w && sig === placed.sig && R === placed.r && out.sel === placed.sel) return;
      placed.v = out.v; placed.w = w; placed.sig = sig; placed.r = R; placed.sel = out.sel;
      // the camp's HUD goes in the first half of the flight up the road, the road's comes in the second
      const wc = Math.max(0, 1 - 2 * R), wr = Math.max(0, 2 * R - 1);
      const wp = Math.max(0, 1 - 2 * w) * wc, wb = Math.max(0, 2 * w - 1) * wc;
      fade(form, wp, true);
      for (const el2 of [me, goalBtn, proto]) fade(el2, wc, true);
      fade(dock, wc, true); fade(roadHud, wr, true);
      if (camp.classList.contains('on-road') !== R > 0.5) camp.classList.toggle('on-road', R > 0.5);
      if (go.hidden !== (w >= 0.5)) { go.hidden = w >= 0.5; collect.hidden = w < 0.5; }
      fade(go, Math.max(wp, 0.02)); fade(collect, Math.max(wb, 0.02));
      // once the camera is home, the road shows the frontier's region again
      if (R === 0 && out.roadTo === 0 && region != null) { region = null; sync(); }
      const seen = new Set(), seenTags = new Set();
      roadLabels(out, wr, seenTags);
      for (const [key, node] of tags) if (!seenTags.has(key) && node._at.o !== 0) { node._at.o = 0; node.style.opacity = 0; }
      for (const a of out.anchors) {
        // nearer things' plaques and chips lie over farther ones'
        const op = CampScene.opacityOf(a, w) * wc, x = Math.round(a.x * K), y = Math.round(a.y * K), top = Math.round(a.top * K), z = Math.max(1, Math.round(4000 - a.d) * 2);
        if (op <= 0.02) continue;
        const nm = nameOf(a);
        if (nm) {
          const n = mark('p:' + a.id, 'cv-plq', a.id, () => h('span'));
          if (n.textContent !== nm) n.textContent = nm;
          n.classList.toggle('empty', !!(a.plot != null && live.state.plots[a.plot].empty));
          put(n, x, y + 4, op, z); seen.add('p:' + a.id);
        }
        // the fire's draughts show in the party view; in the buildings view Collect's tag counts them
        const ch = chipOf(a), cop = a.id === 'fire' ? wp : op;
        if (ch && cop > 0.02) {
          const n = mark('c:' + a.id, 'cv-wait', a.id, () => h('span'));
          const want = ch.join('|');
          if (n.dataset.sig !== want) { n.dataset.sig = want; n.replaceChildren(icon(ch[0], 13), String(ch[1])); }
          put(n, x, top - 30, cop, z + 1); seen.add('c:' + a.id);
        }
        if (a.id === 'wick') {
          const n = mark('s:wick', 'cv-say', 'wick', () => h('span', {}, h('i'), h('i'), h('i')));
          put(n, x + 4, top - 26, wp); seen.add('s:wick');
        }
      }
      for (const [key, node] of pool) if (!seen.has(key) && node._at.o !== 0) { node._at.o = 0; node.style.opacity = 0; }
    }
    // ── a line from a hero at the fire, or from Wick
    function say(text, a) {
      marks.querySelectorAll('.cv-line').forEach(b => b.remove());
      const d = h('div', { class: 'cv-line', text });
      d.style.left = clamp(Math.round(a.x * K), 110, camp.clientWidth - 110) + 'px'; d.style.top = Math.round(a.top * K - 8) + 'px';
      d.addEventListener('animationend', () => d.remove());
      marks.append(d);
      if (noMotion()) setTimeout(() => d.remove(), 2800);
    }
    function act(a) {
      if (a.id === 'road') { click(); toRoad(); return; }
      if (a.id === 'stage') { click(); live.panTo(a.stage); return; }
      if (a.id === 'board') { click(); Buildings.open('recruitboard'); return; }
      if (a.id === 'fire') { click(); tapFire(); return; }
      if (a.id === 'wick') { click(); say(WICK_LINES[Math.floor(Math.random() * WICK_LINES.length)], a); return; }
      if (a.hero != null) {
        const c = live.state.heroes[a.hero] && live.state.heroes[a.hero].c;
        if (!c) return;
        click(); live.hop(a.hero);
        const lines = Fatigue.state(c) !== 'fresh' ? CAMP_TIRED : (CAMP_LINES[c.cls] || CAMP_LINES.sellsword);
        say(lines[Math.floor(Math.random() * lines.length)], a);
        return;
      }
      if (a.plot != null) { const pl = live.state.plots[a.plot]; click(); if (pl.empty) Buildings.buildSheet(a.plot); else Buildings.open(pl.id); }
    }
    // What a tap at a point (design pixels in the camp) reaches: the plaque or chip drawn on top there (they're bigger
    // than far buildings), else what the scene draws there.
    function at(x, y) {
      let best = null;
      for (const node of pool.values()) {
        if (!(node._at.o > 0.5) || !node.dataset.id || node.classList.contains('cv-say')) continue;
        const l = node._at.x - node.offsetWidth / 2, t = node._at.y, inside = x >= l - 4 && x <= l + node.offsetWidth + 4 && y >= t - 4 && y <= t + node.offsetHeight + 4;
        if (inside && (!best || (node._at.z || 0) > (best._at.z || 0))) best = node;
      }
      if (best) { const a = (live.out ? live.out.anchors : []).find(q => q.id === best.dataset.id); if (a) return a; }
      return live.hit(x / K, y / K);
    }
    function tapAt(x, y) { const a = at(x, y); if (a) act(a); }
    // ── input: drag to turn, tap the scene
    let down = null;
    camp.addEventListener('pointerdown', ev => {
      if (ev.button > 0 || down || ev.target.closest('button, .cv-nodrag')) return;
      const p = Frame.point(ev, camp);
      down = { x: p.x, y: p.y, id: ev.pointerId };
      live.dragStart(p.x, p.y);
      try { camp.setPointerCapture(ev.pointerId); } catch (e) { }
    });
    camp.addEventListener('pointermove', ev => { if (down && ev.pointerId === down.id) { const p = Frame.point(ev, camp); live.dragMove(p.x, p.y); } });
    // on the road the wheel steps one stage at a time; back from the first, it goes home
    let wheelAt = 0;
    camp.addEventListener('wheel', ev => {
      if (!live || !live.onRoad) return;
      ev.preventDefault();
      const now = performance.now();
      if (now - wheelAt < 180) return;
      wheelAt = now; live.step(ev.deltaY < 0 ? 1 : -1);
    }, { passive: false });
    const up = ev => {
      if (!down || ev.pointerId !== down.id) return;
      const p = Frame.point(ev, camp), far = Math.hypot(p.x - down.x, p.y - down.y);
      down = null;
      live.dragEnd();
      if (far < 8 && ev.type === 'pointerup') tapAt(p.x, p.y);
    };
    camp.addEventListener('pointerup', up); camp.addEventListener('pointercancel', up);
    // ── the formation: drag to swap places; a tap opens Formation (js/formation.js)
    let fd = null;
    form.addEventListener('pointerdown', ev => {
      const tile = ev.target.closest('.cv-tile');
      if (!tile || ev.button > 0) return;
      const p = Frame.point(ev, camp);
      fd = { slot: +tile.dataset.slot, x: p.x, y: p.y, id: ev.pointerId, ghost: null, over: null, moved: false };
      try { tile.setPointerCapture(ev.pointerId); } catch (e) { }
    });
    form.addEventListener('pointermove', ev => {
      if (!fd || ev.pointerId !== fd.id) return;
      const p = Frame.point(ev, camp);
      if (!fd.ghost && Math.hypot(p.x - fd.x, p.y - fd.y) > 6 && Save.state.party[fd.slot]) {
        fd.moved = true;
        const src = form.querySelector(`.cv-tile[data-slot="${fd.slot}"]`);
        fd.ghost = h('span', { class: 'cv-ghost' }, src.querySelector('.cv-fc').cloneNode(true));
        src.classList.add('lift');
        camp.append(fd.ghost);
      }
      if (!fd.ghost) return;
      fd.ghost.style.left = Math.round(p.x - 20) + 'px'; fd.ghost.style.top = Math.round(p.y - 20) + 'px';
      fd.over = null;
      for (const t of form.querySelectorAll('.cv-tile')) {
        const b = Frame.box(t, camp), on = p.x >= b.left && p.x <= b.right && p.y >= b.top && p.y <= b.bottom;
        t.classList.toggle('over', on && +t.dataset.slot !== fd.slot);
        if (on) fd.over = +t.dataset.slot;
      }
    });
    const fup = ev => {
      if (!fd || ev.pointerId !== fd.id) return;
      const d = fd;
      fd = null;
      if (d.ghost) {
        d.ghost.remove();
        form.querySelectorAll('.cv-tile').forEach(t => t.classList.remove('over', 'lift'));
        if (ev.type === 'pointerup' && d.over != null && d.over !== d.slot && App.swapSlots(d.slot, d.over)) { sfx('click'); sync(); }
      }
      // a tap: the click that follows opens the hero (or Party, for an empty slot)
      form.dataset.dragged = d.moved ? '1' : '';
    };
    form.addEventListener('pointerup', fup); form.addEventListener('pointercancel', fup);
    form.addEventListener('click', ev => {
      const tile = ev.target.closest('.cv-tile');
      if (!tile) return;
      if (form.dataset.dragged) { form.dataset.dragged = ''; return; }
      click();
      Formation.open(); // screen 5, js/formation.js
    });

    function start() {
      const s = Save.state;
      live = CampScene.live(canvas, { yaw: cam.yaw, reduce: noMotion, width: () => Frame.W, state: sceneState(s), locked: locked(s) });
      sync();
      live.onFrame = place;
      live.onSnap = k => showCard(k);
      if (live.out) place(live.out);
    }
    function stop() {
      alive = false;
      if (live) { cam.yaw = live.view === 'build' ? 180 : 0; live.stop(); live = null; }
    }
    return { el, camp, start, stop, sync, at, toRoad, home, turnTo: v => live && live.go(v), turn: d => live && live.turn(d), get live() { return live; } };
  }

  App.screen('home', {
    tab: true, full: true, bare: true,
    render() {
      const s = Save.state;
      Base.tick(s);
      Base.settleHome(s);
      if (ui) ui.stop();
      ui = screen();
      return ui.el;
    },
    // The scene starts once the page holds it, and draws its first frame at once.
    enter() {
      const s = Save.state;
      if (typeof Battle !== 'undefined' && Battle.hold) Battle.hold(true); // the camp covers the battle's field
      if (ui) ui.start();
      if (!s.roster.length) { showPick(); return; }
      if (s.renown.newPlot) { toast(`Renown cleared plot ${s.renown.newPlot}: build on it`); s.renown.newPlot = 0; s.renown.up = 0; Save.commit(); }
      else if (s.renown.up) { toast(`Renown ${s.renown.up}`); s.renown.up = 0; Save.commit(); }
    },
    leave() { if (ui) { ui.stop(); ui = null; } if (typeof Battle !== 'undefined' && Battle.hold) Battle.hold(false); },
    // App.refresh() updates the camp in place: the scene keeps turning, and nothing is built again.
    refresh() { if (ui) ui.sync(); },
  });
  Base.onChange(() => { if (ui) ui.sync(); });
  // The numbers keep moving while the camp is open: what the buildings hold, the goal, the board.
  setInterval(() => { if (ui && !document.hidden && App.current === 'home') ui.sync(); }, 2000);
  // ← and → turn between the views; ↑ and ↓ step along the road.
  document.addEventListener('keydown', e => {
    if (!ui || App.current !== 'home' || (typeof Title !== 'undefined' && Title.up)) return;
    if (!document.getElementById('sheet').hidden || !document.getElementById('screen').hidden) return;
    // on the road: ↑ and ↓ step along it, Escape flies home
    if (ui.live && ui.live.onRoad) {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); ui.live.step(e.key === 'ArrowUp' ? 1 : -1); }
      else if (e.key === 'Escape') { e.preventDefault(); ui.home(); }
      return;
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); ui.turn(e.key === 'ArrowRight' ? 1 : -1); }
  });
  // ── the first pick: a new game starts with one of three
  const PICK_LINES = {
    sellsword: 'A mercenary who fights for the kill: the hardest single blows in melee.',
    hexblade: 'Lays curses that tick and spread, and takes apart foe healers.',
    pilgrim: 'Heals and raises the fallen, and burns the undead with holy fire.',
  };
  function showPick(sel) {
    const choose = cls => { click(); showPick(cls); };
    const begin = () => {
      const s = Save.state, c = Base.newGame(sel, s);
      if (!c) return;
      Tactics.owner(c.id); // their starter rules
      Base.tick(s);
      Save.commit(); sfx('kindle');
      closeScreen();
      App.go('home', {}, { instant: true });
      toast(`${c.name} the ${CLASSES[c.cls].name} takes up the lantern`);
    };
    setScreen(h('div', { class: 'page pick' },
      h('div', { class: 'kicker', text: 'A new road' }),
      h('h1', { text: 'Who carries the lantern?' }),
      h('p', { class: 'flavor', text: 'Choose your first hero. The rest you will meet on the road, at the Recruit Board.' }),
      h('div', { class: 'picks' }, STARTERS.map(cls => h('button', { class: 'pickc' + (cls === sel ? ' on' : ''), 'aria-pressed': cls === sel ? 'true' : 'false', onclick: () => choose(cls) },
        h('span', { class: 'pspr' }, h('img', { src: heroImgURL(cls, [Items.starter(cls, 1).id, null, null]), alt: '' })),
        h('span', { class: 'nm', text: CLASSES[cls].name }), h('span', { class: 'role', text: CLASSES[cls].role }), h('span', { class: 'ln', text: PICK_LINES[cls] })))),
      sel ? h('button', { class: 'btn primary', onclick: begin }, `Begin with the ${CLASSES[sel].name}`, h('span', { class: 'sub', text: 'You start with 100 gold and three empty plots.' })) : h('p', { class: 'hint', text: 'Tap a hero to choose.' })));
  }

  // ── "While you were away" (home-base spec §4)
  function showAway(ms) {
    const s = Save.state;
    if (!s.roster.length) return;
    // Back to a tab left hidden: catch up now, so the rows describe this time away.
    const rep = (Base.now(s) - s.base.clock > 60000 ? Base.catchUp(s) : (Base.tick(s), Base.lastReport())) || { rows: [], rested: [], learned: [], board: false };
    const rows = [];
    const row = (iconEl, name, sub, value, cls) => rows.push(h('div', { class: 'gain' }, iconEl, h('div', {}, h('span', { class: 'nm', text: name }), sub ? h('span', { class: 'k ' + (cls || ''), text: sub }) : null), value));
    const order = ['tollhouse', 'scavengercamp', 'salvagepit', 'infirmary', 'fire', 'trainingyard'];
    const waiting = {};
    for (const id of ['tollhouse', 'scavengercamp', 'salvagepit', 'trainingyard', 'infirmary']) if (Base.built(id, s)) { const got = Base.preview(id, s); if (got.length) waiting[id] = got; }
    if (s.freePotion.waiting) waiting.fire = [{ kind: 'item', item: 'draught', n: s.freePotion.waiting, text: `+${s.freePotion.waiting}` }];
    let fullName = null;
    for (const id of order) {
      const got = waiting[id];
      if (!got) continue;
      const st = BUILDINGS[id] && BUILDINGS[id].idle ? Base.storage(id, s) : null, full = st && st.fullFor > 60000 ? `Full for the last ${timeStr(st.fullFor)}` : '';
      if (full && !fullName) fullName = id;
      if (id === 'trainingyard') { for (const g of got) row(h('img', { class: 'sbox', src: heroPortrait(g.c), alt: '' }), g.c.name, `Trained · +${fmt(g.n)} XP${g.capped ? ' · at the road’s level' : ''}`, g.to > g.from ? h('span', { class: 'lvup', text: 'Lv ' + g.to }) : h('span', { class: 'v', text: '' })); continue; }
      const name = id === 'fire' ? 'By the fire' : BUILDINGS[id].name;
      const sub = id === 'fire' ? 'Free Healing Draughts' : id === 'scavengercamp' ? Base.regionName(Base.scavRegions(s)[0] || 0) + (full ? ' · ' + full : '') : id === 'infirmary' ? 'The still-room' : full;
      const val = h('span', { class: 'v' + (id === 'tollhouse' ? ' y' : '') }, got.map(g => h('span', {}, g.kind === 'gear' ? g.text : `+${fmt(g.n)} `, g.kind === 'gear' ? null : ico(g.kind === 'gold' ? 'coin' : g.kind === 'mat' ? Base.matIcon(g.mat) : ITEMS[g.item].icon))));
      row(ico(id === 'fire' ? 'fire' : BUILDINGS[id].icon, 'l'), name, sub, val, full ? 'b' : '');
    }
    for (const r of rep.rested) {
      const ready = r.to <= 0.5, fit = r.wasSpent && !r.c.spent;
      row(h('img', { class: 'sbox', src: heroPortrait(r.c), alt: '' }), r.c.name, `Rested · fatigue ${Math.floor(r.from)} → ${Math.floor(r.to)}`, h('span', { class: 'v g', text: fit ? 'Fit again' : ready ? 'Ready' : '' }));
    }
    for (const l of rep.learned) row(ico('star', 'l'), l.c.name, `Learned ${l.L.name} at the Masters’ Hall`, h('span', { class: 'v e', text: 'Done' }));
    if (rep.board && Base.boardOpen(s)) row(ico('scroll', 'l'), 'Recruit Board', noun(s.board.recruits.length, 'new face'), h('span', { class: 'v e', text: 'New' }));
    const STORE_UP = { tollhouse: 'A Strongbox stores 12 hours.', scavengercamp: 'Deep Packs store 12 hours.', salvagepit: 'A Deep Pit stores 12 hours.', trainingyard: 'Long Drills store 12 hours.' };
    openSheet(h('div', { class: 'box awaybox' },
      h('button', { class: 'sheet-x', 'aria-label': 'Close', onclick: () => { click(); closeSheet(); } }, '×'),
      h('span', { class: 'kicker c', text: `${timeStr(ms)} by lantern-light` }),
      h('h2', { class: 'c', text: 'While you were away' }),
      rows.length ? h('div', { class: 'gains' }, rows) : h('p', { class: 'flavor', text: 'The lantern burned low and the road kept quiet. Idle buildings earn while you are gone: the Toll House is the first.' }),
      fullName && STORE_UP[fullName] ? h('div', { class: 'banner warm' }, ico(BUILDINGS[fullName].icon, 'm'), h('span', { text: `The ${BUILDINGS[fullName].name} filled up. ${STORE_UP[fullName]}` })) : null,
      btn(Object.keys(waiting).length ? 'Gather it all' : 'Back to the fire', () => {
        const got = Base.collectAll(Save.state);
        Save.commit(); closeSheet();
        if (got.length) { sfx('coin'); toast(got.slice(0, 4).map(g => g.text).join(' · ') + (got.length > 4 ? ' …' : '')); }
        for (const g of got) if (g.kind === 'xp' && g.to > g.from) LevelUp.toast(g.c, { from: g.from, to: g.to });
        App.refresh();
      }, 'primary')), 'sheet-bottom');
  }
  App.actions.away = showAway;
  // The camp's clock keeps moving while the game is open: rest, idle buildings, lessons, the board and the free draught.
  setInterval(() => { const s = Save.state; if (s && !document.hidden && s.roster.length) Base.tick(s); }, 10000);

  // ── the Renown track (home-base spec §8)
  function showRenown() {
    const s = Save.state, R = Base.renown(s), open = Base.plotsCleared(s);
    const steps = [];
    const total = BASE.START_PLOTS + BASE.PLOT_RENOWN.length;
    for (let i = total - 1; i >= BASE.START_PLOTS; i--) {
      const at = Base.renownFor(i), done = i < open, id = s.base.plots[i];
      if (!done && i > open + 1) continue;
      const cls = done ? (id ? 'done' : 'now') : 'later';
      steps.push(h('div', { class: 'rstep ' + cls }, h('span', { class: 'rlv', text: String(at) }),
        h('div', {}, h('span', { class: 'kv', text: `Plot ${i + 1}` }), h('span', { class: 'k' + (cls === 'now' ? ' e' : ''), text: done ? (id ? BUILDINGS[id].name : 'Cleared · build on it') : i === open ? `${fmt(renownToReach(at, s))} Renown to go` : 'Later' })),
        done ? (id ? ico(BUILDINGS[id].icon) : h('button', { class: 'small on', onclick: () => { click(); closeSheet(); Buildings.buildSheet(i); } }, 'Build')) : ico('lock')));
    }
    if (open < total) steps.unshift(h('div', { class: 'rstep later' }, h('span', { class: 'rlv', text: '…' }), h('div', {}, h('span', { class: 'kv', text: `Plots ${Math.min(total, open + 3)}–${total}` }), h('span', { class: 'k', text: 'One plot for every building' })), ico('lock')));
    const earn = [['lantern', 'New stage lit', `+${BASE.RENOWN.stage}`], ['star', 'Elite stage lit', `+${BASE.RENOWN.elite}`], ['skull', 'Boss beaten', `+${BASE.RENOWN.boss}`], ['sword', 'A level’s worth of battle XP', `+${BASE.RENOWN.xpLv}`],
      ['book', 'Level threshold passed', `+${BASE.RENOWN.threshold}`], ['heart', 'A new class joins', `+${BASE.RENOWN.cls}`], ['plus', 'Building built', `+${BASE.RENOWN.built}`], ['coin', 'Building upgraded', `+${BASE.RENOWN.up} × level`]];
    openSheet(h('div', { class: 'box renownbox' },
      h('button', { class: 'sheet-x', 'aria-label': 'Close', onclick: () => { click(); closeSheet(); } }, '×'),
      h('div', { class: 'points' }, ico('lantern', 'xl'), h('div', {}, h('div', { class: 'row' }, h('span', { class: 'nm', text: `Renown ${R.level}` }), h('span', { class: 'kv', text: `${fmt(R.into)}/${fmt(R.need)}` })), h('span', { class: 'meter' }, h('i', { style: `width:${Math.round(100 * R.into / R.need)}%` })))),
      h('p', { class: 'txt', text: 'Renown grows with everything the company does on the road. It belongs to your whole company, not to one hero. You start with three plots, and Renown clears the rest.' }),
      h('span', { class: 'ey', text: 'Earned from' }),
      h('div', { class: 'earn' }, earn.map(([i, k, v]) => h('div', { class: 'stt' }, h('span', { class: 'k' }, ico(i), k), h('span', { class: 'v', text: v })))),
      h('span', { class: 'ey', text: 'Plots it clears' }),
      h('div', { class: 'rtrack' }, steps)), 'sheet-bottom');
  }
  // Renown points still needed to reach a level.
  function renownToReach(L, s) { let need = 0; for (let n = 1; n < L; n++) need += 100 * (n + 2); return Math.max(0, need - s.renown.points); }

  // ── the Party screen's roster rows: where each hero is, their fatigue, and a swipe left to dismiss
  function statusOf(c, s) {
    const w = Fatigue.where(c, s), st = Fatigue.state(c), f = Math.floor(c.fatigue || 0);
    if (w === 'hall') { const l = Base.lessonOf(c.id, s); return { text: `${l.L.name} · ${timeStr(l.left)} left`, tag: ['Lesson', 'd'] }; }
    if (st === 'spent') { const t = Fatigue.timeTo(c, REST.FIT - 0.01, s); return { text: t == null ? `Fatigue ${f} · Spent` : `Fit in ${timeStr(t)}`, tag: ['Spent', 'b'] }; }
    if (w === 'yard') return { text: `Fatigue ${f} · training`, tag: ['Training', 'g'] };
    if (w === 'bed') { const t = Fatigue.timeTo(c, 0, s); return { text: `Fatigue ${f} · rested in ${timeStr(t || 0)}`, tag: ['In a bed', 'w'] }; }
    if (w === 'road') return { text: `Fatigue ${f} · out on the road`, tag: ['Road', 'e'] };
    return { text: `Fatigue ${f}${st !== 'fresh' ? ' · ' + FATIGUE_NAMES[st].toLowerCase() : ''}`, tag: s.party.includes(c.id) ? [s.party.indexOf(c.id) < 2 ? 'Front' : 'Back', 'e'] : ['At the fire', ''] };
  }
  App.actions.rosterRow = c => {
    const s = Save.state, st = statusOf(c, s);
    const row = h('button', { class: 'rrow' + (Fatigue.spent(c) ? ' spent' : '') },
      h('img', { src: heroPortrait(c), alt: '' }),
      h('span', { class: 'nm' }, h('b', { text: c.name }), h('span', { text: `${c.classes.length > 1 ? c.classes.map(k => CLASSES[k].name).join(' + ') : CLASSES[c.cls].name} · ${st.text}` })),
      h('span', { class: 'lv' }, h('span', { class: 'tag ' + st.tag[1], text: st.tag[0] }), 'Lv ' + c.level),
      h('span', { class: 'xp fatbar ' + Fatigue.state(c) }, h('i', { style: `width:${Math.min(100, c.fatigue || 0)}%` })),
      h('span', { class: 'chev', 'aria-hidden': 'true' }));
    const wrap = h('div', { class: 'rwrap' }, h('button', { class: 'rdismiss', onclick: () => { click(); confirmDismiss(c.id); } }, 'Dismiss'), row);
    // a tap opens their sheet; a swipe left shows Dismiss
    let x0 = null, dx = 0, open = false;
    row.addEventListener('pointerdown', e => { x0 = Frame.point(e).x; dx = 0; });
    row.addEventListener('pointermove', e => { if (x0 == null) return; dx = Frame.point(e).x - x0; if (Math.abs(dx) > 8) row.style.transform = `translateX(${clamp((open ? -92 : 0) + dx, -92, 0)}px)`; });
    const end = () => { if (x0 == null) return; const moved = Math.abs(dx) > 8; x0 = null; if (!moved) return; open = (open ? -92 : 0) + dx < -46; row.style.transform = open ? 'translateX(-92px)' : ''; row.dataset.swiped = '1'; setTimeout(() => { delete row.dataset.swiped; }, 60); };
    row.addEventListener('pointerup', end); row.addEventListener('pointercancel', end);
    row.addEventListener('click', () => { if (row.dataset.swiped) return; if (open) { open = false; row.style.transform = ''; return; } click(); App.showCharacter(c.id); });
    return wrap;
  };
  function confirmDismiss(cid) {
    const s = Save.state, c = Save.char(cid);
    if (!c) return;
    const why = Base.whyNotDismiss(c, s);
    const worn = SLOTS.filter(k => c.gear[k]).length;
    openSheet(h('div', { class: 'box' },
      h('button', { class: 'sheet-x', 'aria-label': 'Close', onclick: () => { click(); closeSheet(); } }, '×'),
      h('div', { class: 'kicker', text: 'Dismiss' }), h('h2', { text: `Send ${c.name} on their way?` }),
      h('p', { class: 'flavor', text: why || `${c.name} walks off down the road for good. ${worn ? `Their gear (${noun(worn, 'piece')}) goes back to the Bag.` : 'They wear no gear.'} Nothing else comes back.` }),
      why ? null : btn(`Dismiss ${c.name}`, () => { Base.dismiss(cid, s); Save.commit(); closeSheet(); toast(`${c.name} has left the company`); App.refresh(); }, 'danger'),
      btn(why ? 'Back' : `Keep ${c.name}`, closeSheet, 'primary')), 'sheet-bottom');
  }
  App.actions.recruitLink = () => {
    const s = Save.state;
    if (!Base.boardOpen(s)) return h('p', { class: 'ph-note', text: 'The Recruit Board at camp opens when 1-2 is cleared.' });
    return btn('Recruit Board', () => Buildings.open('recruitboard'), 'primary', s.board.recruits.length && s.board.picks ? `${noun(s.board.recruits.length, 'face')} waiting · ${noun(s.board.picks, 'pick')}` : `New faces in ${timeStr(Base.boardIn(s))}`);
  };
  App.actions.building = id => Buildings.open(id);

  // The prototype tools (gold, materials, blueprints, Renown and time) are in the one panel in Settings: js/proto.js.

  // scene: the camp's live scene while it shows (js/campscene.js), and at(x, y): the anchor a tap at that point in the
  // camp (design pixels) would reach, both for the tools
  return { showPick, showAway, showRenown, statusOf, timeStr, waiting, anyWaiting, goal, sceneState, gatherAll, get scene() { return ui && ui.live; }, at: (x, y) => (ui ? ui.at(x, y) : null) };
})();
