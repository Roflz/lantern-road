'use strict';
// Lantern Road · the camp (build step 5; design §8; the screen mockups' "Hearth"). The party sits at a fire in the middle,
// with the building plots in a ring around it, plus the road out of camp and the Recruit Board. Drag sideways, or use
// ‹ › and the arrow keys, to walk round the fire: on release it eases to the nearest building, whose card offers its
// main action. Plots Renown hasn't cleared are gaps in the ring. The ring is the only way into buildings.
// Also here: the first pick of a new game, "While you were away", the Renown track, the roster rows and formation
// picker on the Party screen, and the chip that opens the prototype tools (js/proto.js). Building screens are
// js/buildings.js; the model is js/base.js.

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
// Each class's small habit at the fire: sparks off a blade, motes, censer smoke, a glint, lamplight, a nod.
const CAMP_HABITS = { sellsword: ['sharpen', 2300], hexblade: ['motes', 900], pilgrim: ['smoke', 700], warden: ['glint', 3800], lamplighter: ['lamp', 1e9], crossbowman: ['nod', 4600], duellist: ['nod', 3600], alchemist: ['bubbles', 1200], surgeon: ['nod', 5000], bellringer: ['nod', 4200], gravecaller: ['motes', 1100], cutpurse: ['nod', 3000] };

const Camp = (() => {
  const click = () => sfx('click');
  const cam = { face: null, pick: -1, hinted: false };   // kept across visits: which building faces you
  const timeStr = ms => { const m = Math.max(1, Math.ceil(ms / 60000)), hh = Math.floor(m / 60); return hh ? `${hh}h ${String(m % 60).padStart(2, '0')}m` : `${m}m`; };
  const noun = (n, a, b) => `${n} ${n === 1 ? a : b || a + 's'}`;
  const frontierStage = s => { const i = STAGES.findIndex(st => !s.campaign.cleared.includes(st.id)); return STAGES[i < 0 ? STAGES.length - 1 : i]; };

  // ── the ring: the road out of camp in front, then the Recruit Board and every plot, alternating right and left from
  // the front, so the plots Renown hasn't cleared (gaps) fall at the back. Returns the ring by position.
  function entries(s) {
    const list = [{ k: 'road', kind: 'road' }, { k: 'board', kind: 'building', id: 'recruitboard' }];
    const total = BASE.START_PLOTS + BASE.PLOT_RENOWN.length, open = Base.plotsCleared(s);
    for (let i = 0; i < total; i++) {
      if (i >= open) { list.push({ gap: true, plot: i }); continue; }
      const id = s.base.plots[i];
      list.push(id ? { k: BUILDINGS[id].art, kind: 'building', id, plot: i } : { k: 'plot', kind: 'plot', plot: i });
    }
    const N = list.length, ring = new Array(N);
    list.forEach((e, k) => { ring[k === 0 ? 0 : k % 2 ? (k + 1) / 2 : N - k / 2] = e; });
    return ring;
  }
  // A building's badge: something waiting for you.
  function badge(e, s) {
    if (e.kind === 'plot') return Base.available(s).length ? 'plus' : null;
    if (e.kind !== 'building') return null;
    if (e.id === 'recruitboard') return Base.boardOpen(s) && s.board.picks > 0 && s.board.recruits.length && s.board.fresh ? 'star' : null;
    if (BUILDINGS[e.id].idle) { const st = Base.storage(e.id, s); if (st && st.pct >= 1) return { tollhouse: 'coin', scavengercamp: Base.matIcon(MATERIALS[Base.scavRegions(s)[0] || 0].id), salvagepit: 'bag', trainingyard: 'star' }[e.id]; }
    if (e.id === 'infirmary' && Base.brewWaiting(s).length) return 'flask';
    return null;
  }
  // The card for what faces you: { icon (url), name, status, tag: [text, cls], meter: [pct, colour], btns: [[label, fn, cls]] }.
  function card(e, s) {
    if (e.kind === 'hero') {
      const c = e.c, st = Fatigue.state(c), f = Math.floor(c.fatigue || 0);
      return { icon: heroImgURL(c.cls, Items.look(c)), name: c.name, status: `${CLASSES[c.cls].name} · Lv ${c.level} · fatigue ${f}`, tag: [FATIGUE_NAMES[st], st === 'fresh' ? 'g' : st === 'weary' ? 'y' : 'b'], btns: [['Sheet', () => App.showCharacter(c.id), 'primary']] };
    }
    if (e.kind === 'road') {
      const st = frontierStage(s), done = s.campaign.cleared.length >= STAGES.length;
      return { icon: iconURL('lantern'), name: 'The Road', status: done ? 'Every lantern is lit, for now' : `Next · ${st.id} ${st.name}`, tag: ['Gate', ''],
        btns: [['Map', () => App.go('map'), ''], ['Set out', () => setOut(), 'primary']] };
    }
    if (e.kind === 'plot') {
      const r = Base.renownFor(e.plot), any = Base.available(s).length;
      return { icon: iconURL('plus'), name: 'Empty Plot', status: any ? (r ? `Cleared at Renown ${r} · build here` : 'Build here') : 'No blueprints yet: the road brings them', tag: [`Plot ${e.plot + 1}`, 'e'],
        btns: [['Build', () => Buildings.buildSheet(e.plot), 'primary']] };
    }
    const id = e.id, D = BUILDINGS[id], L = Base.level(id, s), out = { icon: iconURL(D.icon), name: D.name, tag: [id === 'recruitboard' ? 'Board' : 'Lv ' + L, ''], btns: [['Open', () => Buildings.open(id), 'primary']] };
    const st = D.idle ? Base.storage(id, s) : null;
    if (st) {
      out.meter = [Math.round(st.pct * 100), { tollhouse: 'var(--gold)', scavengercamp: 'var(--bone)', salvagepit: 'var(--ward)', trainingyard: 'var(--good)' }[id]];
      const got = Base.preview(id, s);
      out.btns = [['Open', () => Buildings.open(id), ''], ['Collect', () => collect(id), 'primary']];
      if (!got.length && id === 'trainingyard' && !Base.trainees(s).length) out.btns = [['Choose trainees', () => Buildings.open(id), 'primary']];
      const full = st.pct >= 1 ? 'full · collect' : `full in ${timeStr(st.fullIn)}`;
      if (id === 'tollhouse') { const g = got.find(x => x.kind === 'gold'), it = got.filter(x => x.kind === 'item').reduce((n, x) => n + x.n, 0); out.status = `${g ? fmt(g.n) + ' gold' : it ? noun(it, 'party item') : 'Nothing yet'} · ${full}`; }
      if (id === 'scavengercamp') { const m = got.find(x => x.kind === 'mat'); out.status = `${Base.regionName(Base.scavRegions(s)[0] || 0)} · ${m ? m.n + ' ' + Base.matName(m.mat).toLowerCase() : 'nothing yet'} · ${full}`; }
      if (id === 'salvagepit') { const n = got.filter(x => x.kind === 'gear').length; out.status = `${n ? noun(n, 'gear roll') : 'Digging'} · ${full}`; }
      if (id === 'trainingyard') { const ts = Base.trainees(s).map(cid => Save.char(cid)).filter(Boolean); out.status = ts.length ? `${ts.map(c => c.name).join(', ')} · ${full}` : 'Nobody training'; }
      out.tag = ['Idle', id === 'tollhouse' ? 'y' : 'g'];
      return out;
    }
    if (id === 'recruitboard') {
      if (!Base.boardOpen(s)) { out.status = 'Opens when 1-2 is cleared'; out.tag = ['Closed', '']; return out; }
      const n = s.board.recruits.length, p = s.board.picks;
      out.status = n && p ? `${noun(n, 'new face')} · ${noun(p, 'pick')}${s.board.free ? ' · first one free' : ''}` : `New board in ${timeStr(Base.boardIn(s))}`;
      out.tag = s.board.fresh && n && p ? ['New', 'e'] : [`${s.roster.length}/${Base.rosterCap(s)}`, ''];
      return out;
    }
    if (id === 'infirmary') {
      const beds = s.base.beds, used = beds.filter(Boolean), c = used.length ? Save.char(used[0]) : null, t = c ? Fatigue.timeTo(c, 0, s) : null;
      out.status = `${used.length}/${beds.length} beds${c ? ` · ${c.name} rested in ${timeStr(t || 0)}` : ''}`;
      if (Base.brewWaiting(s).length) out.btns = [['Open', () => Buildings.open(id), ''], ['Collect', () => collect(id), 'primary']];
      out.tag = [used.length ? 'Resting' : 'Lv ' + L, used.length ? 'w' : ''];
      return out;
    }
    if (id === 'tactician') out.status = `${Base.partySlots(s)} party rule slots · ${Base.loadoutSlots(s)} loadout slots`;
    if (id === 'barracks') out.status = `Roster ${s.roster.length}/${Base.rosterCap(s)}`;
    if (id === 'shop') { const n = s.shop.stall.length; out.status = `${Base.shopItems(s).length} party items · ${noun(n, 'piece')} of gear`; }
    if (id === 'mastershall') { const ids = Base.inHall(s); out.status = ids.length ? ids.map(cid => `${Save.char(cid).name} ${timeStr(Base.lessonOf(cid, s).left)}`).join(' · ') : `${Base.rooms(s)} ${Base.rooms(s) === 1 ? 'room' : 'rooms'} free`; }
    if (id === 'shrine') out.status = `Respecs from ${fmt(Math.min(...s.roster.map(c => Base.respecPrice(c, s))))} gold`;
    if (D.passive) out.status = Buildings.bonusText(id, s);
    return out;
  }

  // ── actions from the card
  function setOut() {
    if (App.actions.setOut) return App.actions.setOut();
    const s = Save.state;
    // The road's own sheet: readiness, rewards and the trip settings (js/map.js).
    if (typeof RoadMap !== 'undefined' && typeof Campaign !== 'undefined') { App.go('map'); RoadMap.stageSheet(Math.min(Campaign.frontier(s), STAGES.length - 1)); return; }
    if (!s.party.some(Boolean)) { toast('Nobody in the party: add a hero on the Party tab', 'bad'); return; }
    const i = STAGES.findIndex(st => !s.campaign.cleared.includes(st.id));
    App.go('battle', { stage: i < 0 ? STAGES.length - 1 : i });
  }
  function collect(id) {
    const s = Save.state;
    Base.tick(s);
    const got = Base.collect(id, s);
    Save.commit();
    if (!got.length) { toast('Nothing to collect yet'); return; }
    sfx('coin');
    toast(got.map(g => g.text).join(' · '));
    for (const g of got) if (g.kind === 'xp' && g.to > g.from) LevelUp.toast(g.c, { from: g.from, to: g.to });
    App.refresh();
  }

  // ── the camp scene: canvas drawing, after the screen mockups
  const BASE_PAL = REGION_ART[0].pc;
  const prop = k => sprite(PROPS[k].map, BASE_PAL, 'camp:' + k);
  const art = k => sprite(BUILD_ART[k], BP, 'b:' + k);
  const lightsOf = k => { const key = 'bl:' + k; if (!art.cache) art.cache = {}; if (!art.cache[key]) { const L = []; BUILD_ART[k].forEach((r, y) => [...r].forEach((ch, x) => { if (ch === 'Y') L.push([x, y, 'y']); else if (ch === 'V') L.push([x, y, 'v']); })); art.cache[key] = L; } return art.cache[key]; };
  const seatCache = new Map();
  // A hero sitting: their side sprite without the last two rows (the legs fold under them).
  function seated(c) {
    const look = Items.look(c), key = c.cls + '|' + lookKey(look);
    if (seatCache.has(key)) return seatCache.get(key);
    const full = heroSide(c.cls, 0, look), cut = 2;
    const cv = document.createElement('canvas'); cv.width = full.width; cv.height = full.height - cut;
    cv.getContext('2d').drawImage(full, 0, 0, full.width, full.height - cut, 0, 0, full.width, full.height - cut);
    cv.ax = full.ax; cv.lamp = full.lamp; cv.smoke = full.smoke; cv.top = full.top; cv.bh = full.bh;
    seatCache.set(key, cv);
    return cv;
  }

  function scene(el) {
    const S = 2, cv = el.querySelector('canvas'), x = cv.getContext('2d');
    let W = 0, H = 0, cx = 0, cy = 0, RX = 0, RY = 0;
    const fit = () => { W = Math.max(60, Math.floor(el.clientWidth / S)); H = Math.max(80, Math.floor(el.clientHeight / S)); cv.width = W; cv.height = H; x.imageSmoothingEnabled = false; cx = Math.round(W / 2); cy = Math.round(H * 0.5); RX = W * 0.44; RY = Math.min(H * 0.22, W * 0.46); };
    fit();
    const reduce = () => noMotion();
    const s = () => Save.state;
    let ring = entries(s()), N = ring.length, step = Math.PI * 2 / N;
    const snapRot = i => Math.PI / 2 - i * step;
    const firstFace = () => { if (cam.face != null && ring[cam.face] && !ring[cam.face].gap) return cam.face; return Base.boardOpen(s()) && s().board.recruits.length ? ring.findIndex(e => e && e.id === 'recruitboard') : 0; };
    let rot = snapRot(firstFace()), vel = 0, target = rot, dragging = false, lastX = 0, lastT = 0, downX = 0, moved = 0, hits = [], pick = cam.pick, shown = '', cardAt = 0;
    const R = makeRng(41), stars = Array.from({ length: 60 }, () => [Math.floor(R() * 400), Math.floor(R() * 400) * 0.2, R()]);
    const trees = Array.from({ length: 12 }, (_, i) => [i / 12, R()]);
    const parts = [];
    const angDist = (a, b) => { let d = (a - b) % (Math.PI * 2); if (d < -Math.PI) d += Math.PI * 2; if (d > Math.PI) d -= Math.PI * 2; return Math.abs(d); };
    const nearest = () => { let best = 0, bd = Infinity; ring.forEach((b, i) => { if (b.gap) return; const d = angDist(i * step + rot, Math.PI / 2); if (d < bd) { bd = d; best = i; } }); return best; };
    const stepFrom = (i, d) => { let j = i; do { j = (j + d + N) % N; } while (ring[j].gap); return j; };
    function goTo(i) { const base = snapRot(i); let best = base, d = Infinity; for (let k = -3; k <= 3; k++) { const c = base + k * Math.PI * 2; if (Math.abs(c - rot) < d) { d = Math.abs(c - rot); best = c; } } target = best; vel = 0; cam.face = i; }
    // the heroes at the fire: the formation
    let seats = [], react = [], fired = [], nextFx = [];
    function seatParty() {
      seats = s().party.map(id => Save.char(id)).filter(Boolean).slice(0, 6);
      react = seats.map(() => -1e9); fired = seats.map(() => -1e9); nextFx = seats.map((_, j) => performance.now() + 600 + j * 450);
    }
    seatParty();
    const cardEl = el.querySelector('.bcard'), hint = el.querySelector('.hintbar');
    // the card: refreshed when what faces you changes, and every half second for the numbers
    function setCard(force) {
      const t = performance.now(), i = nearest();
      const key = pick >= 0 ? 'h' + pick : 'b' + i;
      if (!force && key === shown && t - cardAt < 500) return;
      shown = key; cardAt = t;
      const e = pick >= 0 && seats[pick] ? { kind: 'hero', c: seats[pick] } : ring[i];
      const c = card(e, s());
      cardEl.querySelector('[data-role=icon]').src = c.icon;
      cardEl.querySelector('[data-role=name]').textContent = c.name;
      cardEl.querySelector('[data-role=status]').textContent = c.status;
      const tg = cardEl.querySelector('[data-role=tag]');
      tg.textContent = c.tag[0]; tg.className = 'tag ' + (c.tag[1] || '');
      const m = cardEl.querySelector('[data-role=meter]');
      m.hidden = !c.meter;
      if (c.meter) { m.firstChild.style.width = c.meter[0] + '%'; m.firstChild.style.background = c.meter[1]; }
      const bt = cardEl.querySelector('[data-role=btns]'), sig = c.btns.map(b => b[0] + b[2]).join('|');
      if (bt.dataset.sig !== sig) {
        bt.dataset.sig = sig;
        bt.replaceChildren(...c.btns.map(([label, fn, cls]) => h('button', { class: 'btn sm ' + (cls || ''), onclick: ev => { ev.stopPropagation(); click(); fn(); } }, label)));
      } else [...bt.children].forEach((b, k) => { b.onclick = ev => { ev.stopPropagation(); click(); c.btns[k][1](); }; });
    }
    function flashCard() { cardEl.classList.remove('flash'); void cardEl.offsetWidth; cardEl.classList.add('flash'); }
    function say(j, px, py) {
      el.querySelectorAll('.bubble').forEach(b => b.remove());
      const c = seats[j], tired = Fatigue.state(c) !== 'fresh', lines = tired ? CAMP_TIRED : (CAMP_LINES[c.cls] || CAMP_LINES.sellsword);
      const d = h('div', { class: 'bubble', text: lines[Math.floor(Math.random() * lines.length)] });
      d.style.left = clamp(px, 90, el.clientWidth - 90) + 'px'; d.style.top = py + 'px';
      d.addEventListener('animationend', () => d.remove());
      el.append(d);
    }
    // ── input: drag to turn, tap a building or hero, tap the fire for free draughts
    cardEl.querySelectorAll('[data-step]').forEach(b => b.addEventListener('click', ev => { ev.stopPropagation(); click(); pick = -1; cam.pick = -1; goTo(stepFrom(nearest(), +b.dataset.step)); hideHint(); }));
    el.querySelectorAll('.bcard,.renown,.camp-chips').forEach(n => n.addEventListener('pointerdown', ev => ev.stopPropagation()));
    const hideHint = () => { if (hint) hint.style.opacity = 0; cam.hinted = true; };
    // Pointer positions in the landscape frame's design pixels (js/frame.js), so a drag follows the finger when the frame
    // is scaled or turned.
    el.addEventListener('pointerdown', ev => { dragging = true; downX = lastX = Frame.point(ev).x; lastT = performance.now(); moved = 0; vel = 0; target = null; try { el.setPointerCapture(ev.pointerId); } catch (e) { } });
    el.addEventListener('pointermove', ev => { if (!dragging) return; const px = Frame.point(ev).x, dx = px - lastX, t = performance.now(); rot -= dx / 150; vel = -dx / 150 / Math.max(8, t - lastT) * 16; lastX = px; lastT = t; moved = Math.max(moved, Math.abs(px - downX)); if (moved > 6) { pick = -1; cam.pick = -1; hideHint(); } });
    const up = ev => {
      if (!dragging) return;
      dragging = false;
      if (moved < 6) {
        const p = Frame.point(ev, cv), px = p.x / S, py = p.y / S;
        const hit = hits.slice().reverse().find(q => px >= q[0] && px <= q[2] && py >= q[1] && py <= q[3]);
        if (hit && hit[4].fire) { tapFire(); goTo(nearest()); return; }
        if (hit && hit[4].h != null) { pick = cam.pick = hit[4].h; react[pick] = performance.now(); click(); say(pick, hit[4].x * S, hit[4].y * S - 8); setCard(true); goTo(nearest()); return; }
        pick = cam.pick = -1;
        if (hit) { if (hit[4].b === nearest()) { flashCard(); setCard(true); } else click(); goTo(hit[4].b); return; }
        goTo(nearest());
        return;
      }
      target = null;
    };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    el.addEventListener('keydown', ev => { if (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight') { ev.preventDefault(); pick = cam.pick = -1; goTo(stepFrom(nearest(), ev.key === 'ArrowRight' ? 1 : -1)); hideHint(); } });
    function tapFire() {
      const n = Base.collectPotions(Save.state);
      if (n) { Save.commit(); sfx('coin'); toast(`+${n} Healing Draught${n === 1 ? '' : 's'} from the fire`); App.syncTop && App.syncTop(); }
      else { const t = Base.potionIn(Save.state); toast(t == null ? 'The fire crackles.' : `A free Healing Draught in ${timeStr(t)}`); }
    }
    // Rebuild the ring when the model changes (a building rises, a plot clears).
    function refresh() { ring = entries(s()); N = ring.length; step = Math.PI * 2 / N; seatParty(); setCard(true); }

    // ── drawing
    let alive = true, last = performance.now();
    const blit = (img, X, Y, k) => x.drawImage(img, Math.round(X), Math.round(Y), Math.round(img.width * k), Math.round(img.height * k));
    function frame(t) {
      if (!alive) return;
      if (!el.isConnected) { alive = false; return; }
      if (cv.width !== Math.floor(el.clientWidth / S) || cv.height !== Math.floor(el.clientHeight / S)) fit();
      last = t;
      if (!dragging) {
        if (target == null) { rot += vel; vel *= 0.9; if (Math.abs(vel) < 0.004) goTo(nearest()); }
        else { rot += (target - rot) * (reduce() ? 1 : 0.14); if (Math.abs(target - rot) < 0.001) rot = target; }
      }
      setCard();
      const scaleAt = a => 1.05 + ((Math.sin(a) + 1) / 2) * 1.3;
      // sky, moon and the dead wood on the horizon
      const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#07050b'); g.addColorStop(0.25, '#120d1a'); g.addColorStop(1, '#130e19');
      x.fillStyle = g; x.fillRect(0, 0, W, H);
      for (const [sx, sy, b] of stars) { x.fillStyle = b > 0.8 ? '#f2e7d0' : '#4a3e58'; x.fillRect(sx % W, Math.round(sy * H / 400), 1, 1); }
      x.fillStyle = '#e8dcc4'; x.fillRect(W - 22, 8, 5, 5); x.fillRect(W - 23, 9, 7, 3); x.fillStyle = '#120d1a'; x.fillRect(W - 20, 8, 4, 4);
      const horizon = Math.round(cy - RY - 26);
      const shift = ((Math.round(-rot * 12) % W) + W) % W;
      const tree = prop('deadtree');
      x.globalAlpha = 0.55;
      for (const [tx, b] of trees) x.drawImage(tree, ((Math.round(tx * W) + shift) % (W + 10)) - 5, horizon - tree.height + 3 + Math.round(b * 3));
      x.globalAlpha = 1;
      x.fillStyle = '#100c15'; x.fillRect(0, horizon, W, H - horizon);
      for (let yy = horizon; yy < H; yy++) { const dy = (yy - cy) / (RY + 18); const half = Math.sqrt(Math.max(0, 1 - dy * dy)) * (RX + 20); if (half > 0) { x.fillStyle = '#1a1420'; x.fillRect(Math.round(cx - half), yy, Math.round(half * 2), 1); } }
      for (let a = 0; a < Math.PI * 2; a += 0.03) { const px = Math.round(cx + Math.cos(a) * RX), py = Math.round(cy + Math.sin(a) * RY); x.fillStyle = '#2a2026'; x.fillRect(px - 1, py, 3, 1); }
      // what to draw, back to front
      const items = [], lamps = [];
      ring.forEach((b, i) => { if (b.gap) return; const a = i * step + rot; items.push({ t: 'b', b, i, a, x: cx + Math.cos(a) * RX, y: cy + Math.sin(a) * RY }); });
      seats.forEach((c, j) => { const a = (j * Math.PI * 2) / Math.max(seats.length, 3) + rot + Math.PI / 6; items.push({ t: 'h', c, j, a, x: cx + Math.cos(a) * 50, y: cy + Math.sin(a) * 20 }); });
      for (let j = 0; j < 5; j++) { const a = (j * Math.PI * 2) / 5 + rot + step / 2; items.push({ t: 'p', a, x: cx + Math.cos(a) * (RX * 0.72), y: cy + Math.sin(a) * (RY * 0.72) }); }
      items.push({ t: 'f', x: cx, y: cy + 0.5 });
      items.sort((p, q) => p.y - q.y);
      hits = [];
      const fi = nearest();
      for (const it of items) {
        const ix = Math.round(it.x), iy = Math.round(it.y);
        if (it.t === 'b') {
          const img = art(it.b.k), k = scaleAt(it.a), w = img.width * k, hh = img.height * k, bx = ix - w / 2, by = iy - hh + 2 * k;
          if (it.i === fi && pick < 0) { const o = tinted(img, '#f4a646'); for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) blit(o, bx + ox, by + oy, k); }
          blit(img, bx, by, k);
          // a building the road hasn't opened yet (the Recruit Board before 1-2) stands dark
          const shut = it.b.id === 'recruitboard' && !Base.boardOpen(s());
          const depth = (Math.sin(it.a) + 1) / 2, dark = (shut ? 0.75 : 0.5) - depth * 0.45;
          if (dark > 0) { x.globalAlpha = dark; blit(tinted(img, '#07050b'), bx, by, k); x.globalAlpha = 1; }
          it.bx = bx; it.by = by; it.k = k; it.shut = shut;
          hits.push([bx - 2, by - 2, bx + w + 2, by + hh + 2, { b: it.i }]);
        } else if (it.t === 'h') {
          const c = it.c, j = it.j, sp = seated(c), k = 1.25 + ((Math.sin(it.a) + 1) / 2) * 0.55, w = sp.width * k, hh = sp.height * k, flip = it.x > cx;
          const habit = CAMP_HABITS[c.cls] || ['nod', 4000], tired = Fatigue.state(c) !== 'fresh', down = Fatigue.spent(c);
          if (!reduce() && t > nextFx[j]) { nextFx[j] = t + habit[1] * vrand(0.8, 1.3) * (tired ? 1.6 : 1); fired[j] = t; if (habit[0] === 'nod') react[j] = t; }
          const q = (t - react[j]) / 420, hop = q < 1 ? Math.round(Math.sin(Math.PI * q) * (habit[0] === 'nod' && pick !== j ? 1.5 : 3) * k) : 0;
          const breathe = !reduce() && Math.sin(t / 600 + j * 1.7) > 0.7 ? k : 0;
          const hy = iy - hh + 2 - hop - breathe + (down ? 2 * k : 0);
          // the log they sit on
          x.fillStyle = '#4a3424'; x.fillRect(Math.round(ix - 6 * k), iy, Math.round(12 * k), Math.round(2 * k)); x.fillStyle = '#2e2219'; x.fillRect(Math.round(ix - 6 * k), Math.round(iy + k), Math.round(12 * k), Math.round(k));
          const left = ix - (flip ? w - sp.ax * k : sp.ax * k);
          x.save();
          if (flip) { x.translate(ix * 2, 0); x.scale(-1, 1); }
          const dx = flip ? ix - sp.ax * k : left;
          if (pick === j) { const o = tinted(sp, '#f4a646'); for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) blit(o, dx + ox, hy + oy, k); }
          if (down) x.globalAlpha = 0.6;
          blit(sp, dx, hy, k);
          x.globalAlpha = 1;
          if (it.y < cy) { x.globalAlpha = 0.3; blit(tinted(sp, '#07050b'), dx, hy, k); x.globalAlpha = 1; }
          x.restore();
          // where the habit shows: the lantern, the censer's smoke, or the hand
          const at = (px, py) => [flip ? ix * 2 - (dx + px * k) : dx + px * k, hy + py * k];
          if (!reduce()) {
            const hand = at(sp.ax + 3, Math.round(sp.height * 0.5));
            if (habit[0] === 'sharpen' && t - fired[j] < 70) for (let n = 0; n < 4; n++) parts.push({ x: hand[0], y: hand[1], vx: vrand(-14, 14), vy: vrand(-18, -4), t0: t, life: vrand(250, 450), c1: '#fff3c8', c2: '#f7b34a' });
            if (habit[0] === 'motes' && Math.random() < 0.06) parts.push({ x: hand[0] + vrand(-2, 2), y: hand[1], vx: vrand(-2, 2), vy: -vrand(6, 12), t0: t, life: vrand(900, 1500), c1: c.cls === 'gravecaller' ? '#d8f0c8' : '#e8d8ff', c2: c.cls === 'gravecaller' ? '#8ac46a' : '#bb96ee' });
            if (habit[0] === 'bubbles' && Math.random() < 0.05) parts.push({ x: hand[0], y: hand[1], vx: vrand(-1, 1), vy: -vrand(4, 8), t0: t, life: 1200, c1: '#c8f0a0', c2: '#7ac46a' });
            if (habit[0] === 'smoke' && Math.random() < 0.05) { const sm = sp.smoke ? at(sp.smoke[0], sp.smoke[1]) : hand; parts.push({ x: sm[0], y: sm[1], vx: vrand(1, 5), vy: -vrand(5, 9), t0: t, life: 1600, smoke: true }); }
            if (habit[0] === 'lamp' && sp.lamp) { const l = at(sp.lamp[0], sp.lamp[1]); lamps.push([l[0], l[1], 0.45 + Math.sin(t / 160 + j) * 0.1, 12]); }
            if (habit[0] === 'glint' && t - fired[j] < 160) lamps.push([hand[0], hand[1] - 4, 0.9, 4]);
          }
          hits.push([ix - w / 2, hy, ix + w / 2, iy + 2, { h: j, x: ix, y: hy }]);
        } else if (it.t === 'p') {
          const p = prop('post'), k = scaleAt(it.a) * 0.9;
          blit(p, ix - 2.5 * k, iy - p.height * k + k, k);
          lamps.push([ix, iy - p.height * k + 3 * k, 0.4, 14]);
        } else if (it.t === 'f') {
          drawFire(t, cx, cy);
          hits.push([cx - 12, cy - 22, cx + 12, cy + 6, { fire: true }]);
        }
      }
      // smoke under the light; the dark closing in; then firelight, lamps and windows glowing
      for (const p of parts) if (p.smoke) { const q = (t - p.t0) / p.life, sec = (t - p.t0) / 1000; x.globalAlpha = 0.35 * (1 - q); x.fillStyle = '#9a8ea4'; x.fillRect(Math.round(p.x + p.vx * sec), Math.round(p.y + p.vy * sec), 2, 2); x.globalAlpha = 1; }
      const dk = x.createRadialGradient(cx, cy, 10, cx, cy, Math.max(W, H) * 0.75);
      dk.addColorStop(0, 'rgba(7,5,11,0)'); dk.addColorStop(0.35, 'rgba(7,5,11,.15)'); dk.addColorStop(1, 'rgba(7,5,11,.78)');
      x.fillStyle = dk; x.fillRect(0, 0, W, H);
      x.globalCompositeOperation = 'lighter';
      const fk = 0.42 + Math.sin(t / 110) * 0.04 + Math.sin(t / 37) * 0.03;
      const lg = x.createRadialGradient(cx, cy - 6, 1, cx, cy - 6, 85); lg.addColorStop(0, `rgba(244,150,60,${fk})`); lg.addColorStop(1, 'rgba(244,150,60,0)');
      x.fillStyle = lg; x.fillRect(0, 0, W, H);
      for (const [lx, ly, a, r] of lamps) { const g2 = x.createRadialGradient(lx, ly, 0, lx, ly, r); g2.addColorStop(0, `rgba(255,190,100,${a})`); g2.addColorStop(1, 'rgba(255,190,100,0)'); x.fillStyle = g2; x.fillRect(lx - r, ly - r, r * 2, r * 2); }
      for (const it of items) {
        if (it.t !== 'b' || it.shut) continue;
        for (const [px, py, kind] of lightsOf(it.b.k)) {
          const lx = it.bx + (px + 0.5) * it.k, ly = it.by + (py + 0.5) * it.k, r = 4 * it.k, g2 = x.createRadialGradient(lx, ly, 0, lx, ly, r);
          const col = kind === 'v' ? '190,140,255' : '255,200,110';
          g2.addColorStop(0, `rgba(${col},.45)`); g2.addColorStop(1, `rgba(${col},0)`); x.fillStyle = g2; x.fillRect(lx - r, ly - r, r * 2, r * 2);
        }
      }
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i], q = (t - p.t0) / p.life;
        if (q >= 1) { parts.splice(i, 1); continue; }
        if (p.smoke) continue;
        const sec = (t - p.t0) / 1000;
        x.fillStyle = q < 0.5 ? p.c1 : p.c2; x.globalAlpha = 1 - q;
        x.fillRect(Math.round(p.x + p.vx * sec + (p.wave ? Math.sin(sec * 6) * 1.5 : 0)), Math.round(p.y + p.vy * sec), 1, 1); x.globalAlpha = 1;
      }
      x.globalCompositeOperation = 'source-over';
      // badges: something waiting at a building, and free draughts by the fire
      for (const it of items) {
        if (it.t !== 'b') continue;
        const bd = badge(it.b, s());
        if (bd) drawBadge(bd, Math.round(it.x) - 5, Math.round(it.by) - 15 + (reduce() ? 0 : Math.round(Math.sin(t / 300 + it.i))));
      }
      if (s().freePotion.waiting) drawBadge('flask', cx - 5, cy - 40 + (reduce() ? 0 : Math.round(Math.sin(t / 280))), s().freePotion.waiting);
      requestAnimationFrame(frame);
    }
    const fireCv = document.createElement('canvas'); fireCv.width = 16; fireCv.height = 14;
    const fx = fireCv.getContext('2d');
    function drawFire(t) {
      fx.clearRect(0, 0, 16, 14);
      for (let a = 0; a < Math.PI * 2; a += 0.7) { fx.fillStyle = '#5f6266'; fx.fillRect(Math.round(8 + Math.cos(a) * 6), Math.round(11 + Math.sin(a) * 2.5), 2, 1); }
      fx.fillStyle = '#4a3424'; fx.fillRect(4, 10, 9, 2); fx.fillStyle = '#6b4a2e'; fx.fillRect(5, 9, 7, 1);
      const fl = Math.floor(t / 90);
      for (let i = -3; i <= 3; i++) {
        const hgt = Math.max(1, Math.round((8 - Math.abs(i) * 1.8) * (0.7 + ((Math.sin(fl * 1.7 + i * 2.3) + 1) / 2) * 0.6)));
        for (let k = 0; k < hgt; k++) { fx.fillStyle = k >= hgt - 1 ? '#e2582e' : k > hgt * 0.45 ? '#f7b34a' : '#fff0c0'; if (Math.abs(i) >= 2 && k < 2) fx.fillStyle = '#e2582e'; fx.fillRect(8 + i, 9 - k, 1, 1); }
      }
      blit(fireCv, cx - 16, cy - 22, 2);
      if (!reduce() && Math.random() < 0.3) parts.push({ x: cx + vrand(-4, 4), y: cy - 14, vx: vrand(-5, 5), vy: -vrand(14, 26), t0: t, life: vrand(700, 1300), c1: '#ffd27a', c2: '#e2582e', wave: 1 });
    }
    function drawBadge(name, bx, by, n) {
      x.fillStyle = '#0d0911'; x.fillRect(bx - 1, by - 1, 11, 11); x.fillStyle = '#2a1a0e'; x.fillRect(bx, by, 9, 9);
      x.fillStyle = '#f4a646'; x.fillRect(bx, by, 9, 1); x.fillRect(bx, by + 8, 9, 1); x.fillRect(bx, by, 1, 9); x.fillRect(bx + 8, by, 1, 9);
      const ic = UI_ICONS[name] || UI_ICONS.star;
      x.drawImage(sprite(ic.map, ic.pal, 'i:' + name), bx + 1, by + 1);
      x.fillStyle = '#f4a646'; x.fillRect(bx + 3, by + 9, 3, 1); x.fillRect(bx + 4, by + 10, 1, 1);
    }
    requestAnimationFrame(frame);
    if (hint && cam.hinted) hint.style.opacity = 0;
    return { refresh, stop: () => { alive = false; } };
  }

  // ── the home screen
  let live = null;
  App.screen('home', {
    tab: true,
    render() {
      const s = Save.state;
      Base.tick(s);
      Base.settleHome(s);
      const R = Base.renown(s);
      const el = h('div', { class: 'camp-view' },
        h('div', { class: 'camp', tabindex: '0', 'aria-label': 'The camp. Drag left or right, or use the arrow keys, to walk around the fire.' },
          h('canvas', { 'aria-hidden': 'true' }),
          h('button', { class: 'renown', 'aria-label': `Renown ${R.level}. Open the Renown track`, onclick: () => { click(); showRenown(); } },
            ico('lantern', 'm'), h('div', {}, h('span', { class: 'k', text: `Renown ${R.level}` }), h('span', { class: 'meter' }, h('i', { style: `width:${Math.round(100 * R.into / R.need)}%` })))),
          h('div', { class: 'camp-chips' },
            s.away.last >= 5 * 60000 && Base.lastReport() ? h('button', { class: 'chip', onclick: () => { click(); showAway(s.away.last); } }, ico('hourglass'), 'Away') : null,
            h('button', { class: 'chip proto proto-only', onclick: () => { click(); App.actions.proto(); } }, 'Prototype')),
          h('div', { class: 'hintbar' }, h('span', { text: '◂ Drag to walk around the fire ▸' })),
          h('div', { class: 'bcard' },
            h('button', { class: 'sq', 'data-step': '-1', 'aria-label': 'Previous building' }, '‹'),
            h('div', { class: 'mid' },
              h('div', { class: 'row' }, h('img', { class: 'ico l', 'data-role': 'icon', alt: '' }), h('div', { class: 'who' }, h('span', { class: 'nm', 'data-role': 'name' }), h('span', { class: 'kv', 'data-role': 'status' })), h('span', { class: 'tag', 'data-role': 'tag' })),
              h('span', { class: 'meter', 'data-role': 'meter' }, h('i')),
              h('div', { class: 'row btns', 'data-role': 'btns' })),
            h('button', { class: 'sq', 'data-step': '1', 'aria-label': 'Next building' }, '›'))));
      // the scene starts once the page has laid it out
      requestAnimationFrame(() => { if (live) live.stop(); live = scene(el.querySelector('.camp')); });
      return el;
    },
    enter() {
      const s = Save.state;
      if (!s.roster.length) { showPick(); return; }
      if (s.renown.newPlot) { toast(`Renown cleared plot ${s.renown.newPlot}: build on it`); s.renown.newPlot = 0; s.renown.up = 0; Save.commit(); }
      else if (s.renown.up) { toast(`Renown ${s.renown.up}`); s.renown.up = 0; Save.commit(); }
    },
    leave() { if (live) { live.stop(); live = null; } },
  });
  Base.onChange(() => { if (live) live.refresh(); });

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

  return { entries, card, badge, showPick, showAway, showRenown, statusOf, timeStr };
})();
