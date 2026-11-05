'use strict';
// Lantern Road · the camp scene (screen 2; play-test notes 1.18–1.20). The camp is views around one fire, after
// docs/mockups/camp-views.html, whose scene is docs/mockups/camp3d.js. A perspective camera orbits the fire. The party
// view looks north, close on the fire, past the party, the Recruit Board and Wick, up the amber road to the boss's
// chapel. The buildings view looks south, lower and further back, over the fire to the plots. Between them the camera
// turns, rises and pulls back smoothly; let go and it eases to the nearer view.
//
// Everything is drawn with the game's own art (js/art.js, and the Hearth's buildings and props in js/hearthart.js) plus
// a few props of its own, at 2× on a canvas 195 pixels tall and half the frame's width.
//
// The Hearth's detail (play-test note 1.30, docs/mockups/hearth.html and its hearth-scene.js): fourteen plots, six on the
// lower ground either side of the fire and eight on a walled terrace behind, with steps up the middle; lamp posts on the
// terrace's edge and braziers at the foot of the steps; chimney smoke; mist along the terrace and over the graves; the
// Old Beacon on the southern skyline with its crows; and a dark tree and a lamp framing the buildings view. Sprites are billboards: while the camera moves they
// scale smoothly; at rest their scale snaps to whole pixels.
//
// The road view (play-test note 1.21, docs/mockups/road-view.html) is the same scene: tap the road, or Set out, and the
// camera flies from the party view up the road to a stage. Drag along the road and it pans a stage at a time; drag
// back past the first stage, or tap back, and it flies home to the fire. Up the road: lanterns on posts (lit,
// guttering at the frontier, cold beyond), the party waiting at the frontier, the foes of stages you haven't lit as
// silhouettes, the boss's chapel, and the gate to the next region.
//
// This file only draws. CampScene.live(canvas, opts) runs a scene: the camera's drag and settle, its flight to the road
// and back, and where everything was drawn (anchors), which the camp screen (js/camp.js) uses for plaques, chips,
// labels and taps. What it draws is plain data the camp screen builds from the save:
//   heroes   the party at the fire, up to six: [{ c (the hero), spent }]; the first four wait at the frontier
//   region   the region on the road (0–4): its stages, its scenery and palette (REGION_ART), and the next one's past
//            the gate
//   stages   that region's stages, near to far: [{ kind: 'road'|'elite'|'boss', lit, foes: [foe keys] }]
//   front    the frontier stage's index in stages, -1 when every one is lit, or stages.length when none can be lit yet
//   gate     true when a region lies beyond this one
//   plots    one per plot, in the order they open: null (Renown hasn't cleared it), { empty: true } or { id, art }
//   board    { open }: the Recruit Board stands dark until the road opens it
//   sig      a string that changes whenever any of the above does
//
// Speed (tools/camp_perf.py measures it): while the camera rests, at the fire or on the road, everything that doesn't move (the sky, the ground,
// the road, the scenery and their lights) is drawn once into a cache, and each frame, thirty a second, adds only what
// moves: the party, the fire and the flickering lights. While it turns, every frame is drawn whole, but cheaply: glows
// from pre-drawn sprites, the road in strips, the ground's heights and the hills' outline worked out once, and small
// things filled a colour at a time.

const CampScene = (() => {
  const K = 2, IH = 195, REF = 422, RAD = Math.PI / 180;
  // The views, by the direction the camera looks (yaw, from north, clockwise), at the mockup's 422-pixel canvas.
  const VIEWS = {
    party: { yaw: 0, pitch: 20.6, dist: 120, f: 240, tx: 0, tz: 0, cy: 147 },
    build: { yaw: 180, pitch: 10.5, dist: 380, f: 380, tx: 0, tz: -120, cy: 119 },
  };
  const ease = k => k * k * (3 - 2 * k);
  const weightOf = yaw => (1 - Math.cos(yaw * RAD)) / 2; // 0 in the party view, 1 in the buildings view

  // ── the world: the fire at the origin, north is +z, east is +x (world units are art pixels at scale 1)
  const SEATS = [[-31, 12], [31, 12], [-37, -6], [37, -6], [-29, -22], [29, -22]];
  // The Recruit Board stands where the party can see it, at a seated hero's scale; Wick keeps to the bottom-left corner,
  // small, like a guide in the corner of the screen (the user's moves of 2026-11-04).
  const BOARD = [-56, -18], SIGN = [30, 62], WICK = [-61, -41];
  const CAMP_POSTS = [[-62, 40], [62, 40], [-96, -50], [96, -50]];
  // The Hearth's ground south of the fire (docs/mockups/hearth.html, play-test note 1.30): fourteen plots in two rows,
  // six on the lower ground either side of the fire and eight on a terrace behind, with steps up the middle toward the
  // Old Beacon on the skyline. The terrace stands TH high from the radius RT out, walled in stone from bearing W0 to W1
  // (bearings from north, clockwise; 180 is due south), with earth banks running down to the ground at either end.
  const RT = 140, TH = 28, R_LO = 118, R_UP = 162, W0 = 118, W1 = 242, E0 = 92, E1 = 268;
  // The plots by bearing, in the order they open: the lower row from the fire out, then the terrace from the steps out.
  // [bearing, 1 on the terrace]
  const ORDER = [[150, 0], [210, 0], [129, 0], [231, 0], [164, 1], [196, 1], [108, 0], [252, 0], [146.5, 1], [213.5, 1], [129, 1], [231, 1], [112, 1], [248, 1]];
  // Lamp posts along the terrace's edge, and the steps: N_STEPS of them, each RUN deep, STEP_W either side of the middle.
  const LAMPS = [171, 189, 134, 226], N_STEPS = 8, RUN = 3.4, STEP_W = 11;
  const ramp = b => (b <= E0 || b >= E1 ? 0 : b >= W0 && b <= W1 ? 1 : b < W0 ? (b - E0) / (W0 - E0) : (E1 - b) / (E1 - W1));
  const bearingOf = (x, z) => ((Math.atan2(x, z) / RAD) + 360) % 360;
  const th = b => TH * ramp(b);
  const terrace = (x, z) => (z > 30 || Math.hypot(x, z) < RT ? 0 : th(bearingOf(x, z)));
  const atB = (b, r) => [r * Math.sin(b * RAD), r * Math.cos(b * RAD)];
  // The road: out of camp to the north, zigzagging away into the hills, like the region map. Its stages stand along it.
  const ROAD_PTS = [[0, 22], [0, 66], [-26, 112], [24, 176], [-40, 262], [46, 380], [-58, 548], [66, 790], [-76, 1140], [80, 1640], [-40, 2300], [0, 2900], [44, 3360], [-36, 3900], [20, 4600]];
  const ROAD = (() => {
    const out = [], P = ROAD_PTS;
    for (let i = 0; i < P.length - 1; i++) {
      const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
      const n = Math.max(8, Math.round((p2[1] - p1[1]) / 12));
      for (let k = 0; k < n; k++) {
        const t = k / n, t2 = t * t, t3 = t2 * t;
        const cr = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
        out.push([cr(p0[0], p1[0], p2[0], p3[0]), cr(p0[1], p1[1], p2[1], p3[1])]);
      }
    }
    out.push(P[P.length - 1]);
    return out;
  })();
  const roadAt = z => { for (let i = 1; i < ROAD.length; i++) if (ROAD[i][1] >= z) { const [x0, z0] = ROAD[i - 1], [x1, z1] = ROAD[i]; return lerp(x0, x1, (z - z0) / Math.max(1e-6, z1 - z0)); } return ROAD[ROAD.length - 1][0]; };
  // The hills rise from HILL0 and level out at HILL1, where the chapel stands; the gate to the next region is past it.
  const ROAD_W = 16, HILL0 = 205, HILL1 = 3000, GATE_Z = 3240;
  const groundY = (x, z) => { if (z <= HILL0) return terrace(x, z); const zz = Math.min(z, HILL1); return 0.17 * (zz - HILL0) * (1 + 0.22 * Math.sin(x / 240 + zz / 700)); };
  // The road's centre line with the way across it at each point.
  const EDGES = ROAD.map(([rx, rz], i) => {
    const [ax, az] = ROAD[Math.max(0, i - 1)], [bx, bz] = ROAD[Math.min(ROAD.length - 1, i + 1)], dx = bx - ax, dz = bz - az, n = Math.hypot(dx, dz) || 1;
    return { rx, rz, nx: -dz / n, nz: dx / n };
  });
  // A region's stages along the road, near to far: n of them, the last (the boss) by the chapel.
  const zCache = new Map();
  const stageZ = n => { if (!zCache.has(n)) zCache.set(n, Array.from({ length: n }, (_, k) => 80 * Math.pow(35, Math.pow(n > 1 ? k / (n - 1) : 0, 0.85)))); return zCache.get(n); };
  const TUFTS = Array.from({ length: 420 }, (_, i) => { const a = h2(i, 121) * Math.PI * 2, r = 30 + Math.sqrt(h2(i, 122)) * 190, x = Math.cos(a) * r, z = Math.sin(a) * r; return [x, groundY(x, z), z, h2(i, 123)]; })
    .concat(Array.from({ length: 700 }, (_, i) => { const z = 200 + h2(i, 161) * 3100, side = h2(i, 162) > 0.5 ? 1 : -1, x = roadAt(z) + side * (12 + h2(i, 163) * 160); return [x, groundY(x, z), z, h2(i, 164)]; }));
  const CAMP_PROPS = ['tent', 'logs'];
  // What never moves is worked out once: the hill bands the road climbs into (their points on the ground, near edge and
  // far edge), the road's two sides at each width it's drawn, and the far hills' outline by bearing.
  const BANDS = (() => {
    const out = [];
    for (let z1 = 5200; z1 > HILL0;) {
      const z0 = Math.max(HILL0, z1 / 1.07), pts = [];
      for (let hx = -1800; hx <= 1800; hx += 90) pts.push(hx, groundY(hx, z1), z1, hx, groundY(hx, z0), z0);
      out.push({ z1, pts: Float32Array.from(pts), rise: 0.35 + 0.65 * Math.min(1, (Math.min(z1, HILL1) - HILL0) / 2600) });
      z1 = z0;
      if (z0 <= HILL0) break;
    }
    return out;
  })();
  // Each region's ground outside camp: its own colour near the road, fading to the night's violet with distance (the
  // Gravefields' is the mockup's).
  const GROUND_NEAR = REGION_ART.map((R, i) => { if (!i) return [27, 26, 26]; const g = R.ground.match(/\w\w/g).map(v => parseInt(v, 16)); return g.map((v, j) => (v + [27, 26, 26][j]) / 2); }), GROUND_FAR = [40, 31, 48];
  const sideCache = new Map();
  const sidesAt = half => {
    if (!sideCache.has(half)) {
      const a = new Float32Array(EDGES.length * 6);
      EDGES.forEach((e, i) => { const lx = e.rx - e.nx * half, lz = e.rz - e.nz * half, rx = e.rx + e.nx * half, rz = e.rz + e.nz * half; a.set([lx, groundY(lx, lz) + 0.5, lz, rx, groundY(rx, rz) + 0.5, rz], i * 6); });
      sideCache.set(half, a);
    }
    return sideCache.get(half);
  };

  // Scenery: dead wood all round the camp; a walled graveyard and a crypt south of it, on the terrace; the camp's low
  // wall, open to the road; tents. The road's own scenery is by region (roadScenery). (The cart and the crate went when
  // the plots grew: they stood where the lower row is now.)
  function makeScenery(wallR) {
    const out = [];
    for (let i = 0; i < 140; i++) {
      const b = h2(i, 91) * 360, r = wallR + 150 + h2(i, 92) * 320, x = r * Math.sin(b * RAD), z = r * Math.cos(b * RAD);
      if (z > 0 && Math.abs(x - roadAt(z)) < 40) continue;
      out.push({ k: 'tree', x, z, v: h2(i, 93) });
    }
    for (let row = 0; row < 4; row++) for (let c = 0; c < 11; c++) {
      if (h2(row * 11 + c, 111) < 0.18) continue;
      const b = 128 + c * 10 + (row % 2) * 5, r = wallR + 34 + row * 26;
      out.push({ k: h2(row * 11 + c, 112) > 0.35 ? 'grave' : 'cross', x: r * Math.sin(b * RAD), z: r * Math.cos(b * RAD), v: 0.5 });
    }
    out.push({ k: 'crypt', x: (wallR + 120) * Math.sin(214 * RAD), z: (wallR + 120) * Math.cos(214 * RAD), v: 0 });
    out.push({ k: 'chapelS', x: (wallR + 150) * Math.sin(146 * RAD), z: (wallR + 150) * Math.cos(146 * RAD), v: 0 });
    for (let b = 58; b <= 302; b += 4.4) out.push({ k: 'wall', x: wallR * Math.sin(b * RAD), z: wallR * Math.cos(b * RAD), v: b });
    out.push({ k: 'tent', x: 84, z: 30, v: 0 }, { k: 'tent', x: 128, z: 96, v: 1 }, { k: 'tent', x: -118, z: 104, v: 1 });
    for (const sc of out) sc.y = groundY(sc.x, sc.z);
    return out;
  }
  // Along the road, by region: its graves (or a later region's props, in its palette) and trees up to the chapel, and the
  // next region's props past the gate. The Gravefields keep the mockup's own mix.
  const PROPS_OF = r => (r === 0 ? ['grave', 'grave', 'cross', 'stone', 'skulls', 'grave', 'cross', 'deadtree'] : REGION_ART[r].props.filter(k => k !== 'post' && k !== 'candle' && PROPS[k]));
  const roads = new Map();
  function roadScenery(r) {
    if (roads.has(r)) return roads.get(r);
    const out = [], mine = PROPS_OF(r), next = r + 1 < REGION_ART.length ? PROPS_OF(r + 1) : null;
    for (let i = 0; i < 170; i++) {
      const z = 110 + Math.pow(h2(i, 101), 1.25) * 3000, side = h2(i, 102) > 0.5 ? 1 : -1, off = 22 + h2(i, 103) * (40 + z * 0.08);
      out.push({ k: mine[Math.floor(h2(i, 104) * mine.length)], x: roadAt(z) + side * off, z, v: h2(i, 105), r });
    }
    for (let i = 0; i < 190; i++) {
      const z = 320 + h2(i, 141) * 2950, side = h2(i, 142) > 0.5 ? 1 : -1, x = roadAt(z) + side * (70 + h2(i, 143) * 300);
      out.push({ k: 'tree', x, z, v: h2(i, 144), r });
    }
    if (next) for (let i = 0; i < 70; i++) {
      const z = GATE_Z + 60 + h2(i, 151) * 1300, side = h2(i, 152) > 0.5 ? 1 : -1, x = roadAt(z) + side * (24 + h2(i, 153) * 220);
      out.push({ k: next[Math.floor(h2(i, 154) * next.length)], x, z, v: h2(i, 155), r: r + 1 });
    }
    for (const sc of out) sc.y = groundY(sc.x, sc.z);
    roads.set(r, out);
    return out;
  }
  // The world at a canvas width. The mockup is 422 pixels wide; a narrower frame (a 16:9 phone or window) stands the
  // plots and the terrace's outer lamps a little closer to the steps, so they stay on screen and clear of the edges, and
  // draws the Recruit Board and Wick a little closer in.
  const worlds = new Map();
  function worldFor(IW) {
    if (worlds.has(IW)) return worlds.get(IW);
    const near = clamp(IW / REF, 0.8, 1), inB = b => 180 + (b - 180) * near;
    const plots = ORDER.map(([b, up]) => { const bb = inB(b); return atB(bb, up ? R_UP : R_LO).concat(bb, up); });
    const wallR = Math.max(...plots.map(([a, b]) => Math.hypot(a, b))) + 40;
    const W = { IW, plots, wallR, lamps: LAMPS.map(inB), scenery: makeScenery(wallR), board: [BOARD[0] * near, BOARD[1]], wick: [WICK[0] * near, WICK[1]] };
    worlds.set(IW, W);
    return W;
  }

  // ── art
  const BASE_PAL = REGION_ART[0].pc;
  const prop = k => sprite(PROPS[k].map, BASE_PAL, 'cs:p:' + k);
  const propIn = (k, r) => (r ? sprite(PROPS[k].map, REGION_ART[r].pc, 'cs:p' + r + ':' + k) : prop(k));
  // A tree near the road shows its wood, fading into a silhouette with distance: the two blended, in twelve steps.
  const fogCache = new WeakMap();
  function fogged(wood, sil, fog) {
    const k = Math.round(fog * 12);
    if (k >= 12) return sil;
    let m = fogCache.get(wood);
    if (!m) fogCache.set(wood, m = new WeakMap());
    let steps = m.get(sil);
    if (!steps) m.set(sil, steps = []);
    if (steps[k]) return steps[k];
    const c = document.createElement('canvas'); c.width = wood.width; c.height = wood.height;
    const g = c.getContext('2d'); g.drawImage(wood, 0, 0); g.globalAlpha = k / 12; g.drawImage(sil, 0, 0);
    return (steps[k] = c);
  }
  const bart = k => sprite(BUILD_ART[k], BP, 'b:' + k);
  const ART = {
    wick: { map: ['.....kkkk......', '....kHHHhk.....', '...kHhhhhhk....', '...khhhkffk....', '...khhkfffk..m.', '...khhkFwwk.mYm', '..kchhkwwwWkmym', '..kcchkwwwWk.d.', '..kcCcckWkffkd.', '..kcCcccckk..d.', '..kcCccccck..d.', '..kcCccccck..d.', '...kcccccbb..d.', '..kSSSSSSbbb.d.', '..ksssssssk..d.', '..ksssssssk..d.', '...kkkkkkk..ddd'],
      pal: { k: '#0d0911', H: '#6a5a7e', h: '#463a58', f: '#eec4a0', F: '#c49070', w: '#f6efe0', W: '#bfb29a', c: '#2f2640', C: '#4a3d60', b: '#2e2219', s: '#4a3424', S: '#6b4a2e', d: '#6b4a2e', m: '#3a3c41', y: '#f4a646', Y: '#ffe9b0' } },
    logs: { map: ['.oo.oo.oo.', 'oOooOooOoo', 'ooOooOooOo', '.oo.oo.oo.'], pal: { o: '#4a3424', O: '#8a6a44' } },
    tent: { map: ['.......k........', '......kck.......', '.....kcCck......', '....kccCCck.....', '...kcccCCCck....', '..kccckkkCCck...', '.kcccky.kCCCck..', 'kccckyYy.kCCCck.', 'kcckyYYyykCCCCck', 'dddddddddddddddd'], pal: { k: '#1a1218', c: '#7a6a52', C: '#5a4e3c', y: '#f4a646', Y: '#ffe2a0', d: '#2e2219' } },
    wall: { map: ['.ssS.sSs.Ss.', 'sSsssSssSssS', 'ssdssSsdssSs', 'dddddddddddd'], pal: { s: '#4a4c52', S: '#62656c', d: '#2a2a30' } },
    crypt: { map: ['........kk........', '.......kSSk.......', '......kSSSSk......', '.....kSSSSSSk.....', '....kkkkkkkkkk....', '....kSsSsSsSsk....', '....kSs.kk.sSk....', '....kSskddksSk....', '....kSskddksSk....', '....kSskddksSk....', '..kkkkkkkkkkkkkk..', '..kssssssssssssk..', 'kkkkkkkkkkkkkkkkkk'], pal: { k: '#18161c', S: '#6a6d74', s: '#4a4c52', d: '#0a080c' } },
    chapelS: { map: ['.....k.....', '....kSk....', '....kSk....', '...kSSSk...', '...kSySk...', '..kkkkkkk..', '..kSSSSSk..', '.kSSSSSSSk.', 'kSSkkSkkSSk', 'kSSkdSdkSSk', 'kSSkdSdkSSk', 'kkkkkkkkkkk'], pal: { k: '#18161c', S: '#55585e', y: '#f4a646', d: '#0a080c' } },
    skull: { map: ['.kkkkk.', 'kwwwwwk', 'kwkwkwk', 'kwwwwwk', '.kwkwk.'], pal: { k: '#1a0d10', w: '#c86a6a' } },
  };
  const art = k => sprite(ART[k].map, ART[k].pal, 'cs:a:' + k);
  // The boss's chapel at the road's end.
  const CHAPEL = { map: ['.........k..........', '........kSk.........', '........kSk.........', '.......kSSSk........', '.......kSySk..k.....', '......kSSSSSk.kk....', '......kSSSSSkkSk....', '..kkkkkSSSSSkSSSk...', '..kSSSSSSSSSSSSSSk..', '.kSSSSSSSSSSSSSSSSk.', 'kSSkyykSSSSSkyykSSSk', 'kSSkyykSSSSSkyykSSSk', 'kSSSSSSSSSSSSSSSSSSk', 'kkkkkkkkkkkkkkkkkkkk'], pal: { k: '#08060c', S: '#130e1b', y: '#c8783a' } };
  // A hero sitting: their side sprite in their gear, without the last two rows (the legs fold under them).
  const seatCache = new Map();
  function seated(c) {
    const look = typeof Items !== 'undefined' ? Items.look(c) : null, key = c.cls + '|' + lookKey(look);
    if (seatCache.has(key)) return seatCache.get(key);
    const full = heroSide(c.cls, 0, look), cut = 2;
    const cv = document.createElement('canvas'); cv.width = full.width; cv.height = full.height - cut;
    cv.getContext('2d').drawImage(full, 0, 0, full.width, full.height - cut, 0, 0, full.width, full.height - cut);
    cv.ax = full.ax; seatCache.set(key, cv);
    return cv;
  }
  // Distant scenery sinks into the night: the sprite with the dark laid over it, in twelve steps.
  const darkCache = new WeakMap();
  function darkened(img, a) {
    const k = Math.round(a / 0.75 * 12);
    if (k <= 0) return img;
    let m = darkCache.get(img);
    if (!m) darkCache.set(img, m = []);
    if (m[k]) return m[k];
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0); g.globalAlpha = k / 12 * 0.75; g.drawImage(tinted(img, '#0b0812'), 0, 0);
    return (m[k] = c);
  }
  const fireCv = document.createElement('canvas'); fireCv.width = 26; fireCv.height = 30;
  function paintFire(t, big = 1) {
    const x = fireCv.getContext('2d'), fx = 13, fy = 26;
    x.clearRect(0, 0, 26, 30);
    for (let a = 0; a < Math.PI * 2; a += 0.45) { const px = Math.round(fx + Math.cos(a) * 10), py = Math.round(fy + 1 + Math.sin(a) * 2.5); x.fillStyle = '#4a4c52'; x.fillRect(px - 1, py, 3, 2); x.fillStyle = '#7d8088'; x.fillRect(px - 1, py, 2, 1); }
    x.fillStyle = '#2a1a10'; x.fillRect(fx - 8, fy - 1, 16, 2);
    x.fillStyle = '#4a3020'; for (let i = 0; i < 10; i++) { x.fillRect(fx - 6 + i, fy - 2 - Math.floor(i / 4), 2, 1); x.fillRect(fx + 5 - i, fy - 2 - Math.floor(i / 4), 2, 1); }
    x.fillStyle = '#c2412a'; x.fillRect(fx - 4, fy - 3, 9, 1);
    const fl = Math.floor(t / 85);
    for (let i = -5; i <= 5; i++) {
      const hgt = Math.max(1, Math.round((11 - Math.abs(i) * 1.7) * big * (0.62 + ((Math.sin(fl * 1.7 + i * 2.3) + 1) / 2) * 0.55)));
      for (let k = 0; k < hgt; k++) { const q = k / hgt; let c = q > 0.86 ? '#a83a2a' : q > 0.6 ? '#e2582e' : q > 0.28 ? '#f7a84a' : '#fff0c0'; if (Math.abs(i) >= 4 && q < 0.5) c = '#e2582e'; x.fillStyle = c; x.fillRect(fx + i, fy - 4 - k, 1, 1); }
    }
    return fireCv;
  }
  // Light: a soft disc of one colour at full strength, drawn scaled and at the light's strength. Much cheaper than a new
  // radial gradient for every lamp on every frame.
  const glowCache = new Map();
  function glowSprite(rgb) {
    let c = glowCache.get(rgb);
    if (c) return c;
    c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, `rgba(${rgb},1)`); gr.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    glowCache.set(rgb, c);
    return c;
  }
  function glow(x, gx, gy, r, rgb, a, sq = 1) {
    if (r <= 0.5 || a <= 0.003) return;
    x.globalAlpha = Math.min(1, a);
    x.drawImage(glowSprite(rgb), gx - r, gy - r * sq, r * 2, r * 2 * sq);
  }
  const LAMP = '255,190,100', AMBER = '244,166,70', WARM = '255,200,110', VIOLET = '190,140,255', POOL = '244,150,70', FIRE = '244,140,50', HOT = '255,214,150', FRONT = '255,214,140', WISP = '120,220,200', MOON = '232,220,196', CHAPEL_L = '244,140,60', MIST = '120,100,160', EMBER = '240,120,50', COLD = '120,220,200', BRAZIER = '255,170,80', FOG = '150,134,184';
  const LIGHT_OF = { y: [WARM, 0.5], v: [VIOLET, 0.5], g: [COLD, 0.45] };

  // ── the camera, at a canvas width
  // The orbit's parameters for a yaw; the road view's for a place along the road (looking north, down at the road from
  // above and behind, its target following the road's smoothed line); and a blend of two.
  function orbitParams(yaw) { const w = ease(weightOf(yaw)), P = VIEWS.party, B = VIEWS.build, v = { yaw, w, road: 0, ty: 0 }; for (const k of ['pitch', 'dist', 'f', 'tx', 'tz', 'cy']) v[k] = lerp(P[k], B[k], w); return v; }
  const ROADCAM = { pitch: 34, dist: 330, f: 280, cy: 118 };
  const smoothX = z => { let sum = 0, n = 0; for (let d = -420; d <= 420; d += 70) { sum += roadAt(Math.max(30, z + d)); n++; } return sum / n; };
  function roadParams(zc) { const tx = smoothX(zc); return { yaw: 0, w: 0, road: 1, pitch: ROADCAM.pitch, dist: ROADCAM.dist, f: ROADCAM.f, cy: ROADCAM.cy, tx, tz: zc, ty: groundY(tx, zc) }; }
  function blendParams(a, b, k) { const out = {}; for (const key of Object.keys(a)) out[key] = key === 'yaw' ? a.yaw + ((((b.yaw - a.yaw) % 360) + 540) % 360 - 180) * k : lerp(a[key], b[key], k); return out; }
  function camera(IW, yaw, rest = 1) {
    const v = typeof yaw === 'number' ? orbitParams(yaw) : yaw, w = v.w;
    yaw = v.yaw;
    const th = yaw * RAD, ph = v.pitch * RAD, cp = Math.cos(ph), sp = Math.sin(ph), st = Math.sin(th), ct = Math.cos(th);
    const F0 = cp * st, F1 = -sp, F2 = cp * ct, R0 = ct, R2 = -st, U0 = sp * st, U1 = cp, U2 = sp * ct;
    const C0 = v.tx - v.dist * F0, C1 = (v.ty || 0) - v.dist * F1, C2 = v.tz - v.dist * F2, cx = IW / 2, f = v.f, cy = v.cy;
    const cam = {
      w, yaw, v, rest, IW, cx, f, road: v.road || 0,
      horizon: cy - f * Math.tan(ph),
      proj(x, y, z) {
        const rx = x - C0, ry = y - C1, rz = z - C2, d = rx * F0 + ry * F1 + rz * F2;
        if (d < 6) return null;
        return { x: cx + f * (rx * R0 + rz * R2) / d, y: cy - f * (rx * U0 + ry * U1 + rz * U2) / d, s: f / d, d };
      },
      // the same, into cam.px and cam.py without making an object (for the thousands of ground points a frame)
      p(x, y, z) {
        const rx = x - C0, ry = y - C1, rz = z - C2, d = rx * F0 + ry * F1 + rz * F2;
        if (d < 6) return false;
        cam.px = cx + f * (rx * R0 + rz * R2) / d; cam.py = cy - f * (rx * U0 + ry * U1 + rz * U2) / d; cam.ps = f / d; cam.pd = d;
        return true;
      },
      unproj(sx, sy) {
        const a = (sx - cx) / f, b = -(sy - cy) / f, d0 = F0 + a * R0 + b * U0, d1 = F1 + b * U1, d2 = F2 + a * R2 + b * U2, k = -C1 / d1;
        return [C0 + k * d0, C2 + k * d2];
      },
      // A billboard's scale: smooth while moving, whole pixels at rest (small, far things keep theirs).
      scale(s) { if (s < 0.9) return s; const snap = s < 1.7 ? 1 : Math.round(s); return lerp(s, snap, rest); },
      bearing(sx) { return (yaw + Math.atan((sx - cx) / f) / RAD + 360) % 360; },
      screenOfBearing(b) { const a = ((b - yaw + 540) % 360) - 180; if (Math.abs(a) > 75) return null; return cx + Math.tan(a * RAD) * f; },
    };
    return cam;
  }

  // ── drawing helpers
  function poly(x, pts, col) { x.fillStyle = col; x.beginPath(); for (let i = 0; i < pts.length; i += 2) (i ? x.lineTo(pts[i], pts[i + 1]) : x.moveTo(pts[i], pts[i + 1])); x.closePath(); x.fill(); }
  function ringPts(cam, r) { const pts = []; for (let i = 0; i < 72; i++) { const a = (i / 72) * Math.PI * 2; if (!cam.p(Math.cos(a) * r, 0, Math.sin(a) * r)) return null; pts.push(cam.px, cam.py); } return pts; }
  const nearFade = d => clamp((d - 80) / 50, 0, 1);
  const hillH = (b, k) => { const r = b * RAD; return k * (6 + 4 * Math.sin(r * 3 + 1) + 3 * Math.sin(r * 7 + 2) + 2 * Math.sin(r * 13)); };
  const HILLS = [[1.4, '#171121', '#3a2e4c'], [0.8, '#100c16', '#241c30']].map(([k, col, rim]) => {
    const lut = new Float32Array(1441); // the outline every quarter degree
    for (let i = 0; i <= 1440; i++) lut[i] = hillH(i / 4 + k * 40, k);
    return { k, col, rim, at: b => { const f = (((b % 360) + 360) % 360) * 4, i = Math.floor(f); return lut[i] + (lut[i + 1] - lut[i]) * (f - i); } };
  });
  let hillTop = new Float32Array(512), bearAt = new Float32Array(512);
  // The road at one width, from edge i0 to i1, as polygons: one for each run of edges in front of the camera.
  // Far along the road its points crowd together: one closer than a pixel to the last one kept is left out.
  function strip(x, cam, half, i0, i1, col) {
    x.fillStyle = col;
    const L = [], R = [];
    let pend = null;
    const near = (q, i) => Math.abs(q[0] - L[i]) < 0.8 && Math.abs(q[1] - L[i + 1]) < 0.8 && Math.abs(q[2] - R[i]) < 0.8 && Math.abs(q[3] - R[i + 1]) < 0.8;
    const keep = q => { L.push(q[0], q[1]); R.push(q[2], q[3]); };
    const flush = () => {
      if (pend && (!L.length || !near(pend, L.length - 2))) keep(pend);
      if (L.length >= 4) { x.beginPath(); x.moveTo(L[0], L[1]); for (let i = 2; i < L.length; i += 2) x.lineTo(L[i], L[i + 1]); for (let i = R.length - 2; i >= 0; i -= 2) x.lineTo(R[i], R[i + 1]); x.closePath(); x.fill(); }
      L.length = 0; R.length = 0; pend = null;
    };
    const A = sidesAt(half);
    for (let i = i0; i <= i1; i++) {
      const j = i * 6;
      if (!cam.p(A[j], A[j + 1], A[j + 2])) { flush(); continue; }
      const ax = cam.px, ay = cam.py;
      if (!cam.p(A[j + 3], A[j + 4], A[j + 5])) { flush(); continue; }
      const q = [ax, ay, cam.px, cam.py];
      if (!L.length || !near(q, L.length - 2)) { keep(q); pend = null; } else pend = q;
    }
    flush();
  }
  // The point in a convex quad (or a triangle fan), for taps on the road.
  function inQuad(px, py, q) {
    let sign = 0;
    for (let i = 0; i < 4; i++) {
      const ax = q[i * 2], ay = q[i * 2 + 1], bx = q[(i * 2 + 2) % 8], by = q[(i * 2 + 3) % 8], c = (bx - ax) * (py - ay) - (by - ay) * (px - ax);
      if (c !== 0) { if (sign && Math.sign(c) !== sign) return false; sign = Math.sign(c); }
    }
    return true;
  }

  // ── the Hearth's terrace and skyline (docs/mockups/hearth-scene.js)
  // A point at bearing b, radius r and height h into a list of screen points; false when it's behind the camera.
  const at3 = (cam, out, b, r, h) => { const s = Math.sin(b * RAD), c = Math.cos(b * RAD); if (!cam.p(r * s, h, r * c)) return false; out.push(cam.px, cam.py); return true; };
  const pt3 = (cam, out, x, y, z) => { if (!cam.p(x, y, z)) return false; out.push(cam.px, cam.py); return true; };
  // The ground between two bearings and two radii, its near edge at h0 and its far edge at h1.
  function quadAt(cam, b0, b1, r0, r1, h0, h1) { const q = []; return at3(cam, q, b0, r0, h0) && at3(cam, q, b1, r0, h1) && at3(cam, q, b1, r1, h1) && at3(cam, q, b0, r1, h0) ? q : null; }
  const mixHex = (a, b, k) => '#' + [1, 3, 5].map(i => Math.round(parseInt(a.substr(i, 2), 16) * (1 - k) + parseInt(b.substr(i, 2), 16) * k).toString(16).padStart(2, '0')).join('');
  const STONES = ['#2c2832', '#27232d', '#312c37', '#231f29', '#2a2630'];
  // The wall's courses, each stone's colour worked out once: warmer near the fire, low down.
  const WALL_STEP = 3, COURSE = 5.5, WALL = [];
  for (let b = W0; b < W1; b += WALL_STEP) {
    const h0 = th(b), h1 = th(b + WALL_STEP), stairs = Math.abs(b + WALL_STEP / 2 - 180) < 4, courses = [];
    for (let k = 0; !stairs && k * COURSE < Math.max(h0, h1); k++) {
      const lo0 = Math.min(h0, k * COURSE), hi0 = Math.min(h0, (k + 1) * COURSE), lo1 = Math.min(h1, k * COURSE), hi1 = Math.min(h1, (k + 1) * COURSE);
      if (hi0 - lo0 <= 0 && hi1 - lo1 <= 0) continue;
      const warm = Math.max(0, 1 - Math.abs(b - 180) / 70) * (0.34 - k * 0.07);
      courses.push([lo0, hi0, lo1, hi1, mixHex(STONES[(Math.floor(b / 6) + k * 3 + (k & 1)) % 5], '#8a5a3a', Math.max(0, warm))]);
    }
    WALL.push({ b, h0, h1, stairs, courses });
  }
  const RISERS = Array.from({ length: N_STEPS }, (_, i) => mixHex('#2c2832', '#7a4a30', 0.18 + i * 0.01));
  // The terrace: its top in bands of darkness, the earth banks at either end, the wall course by course with its coping,
  // and the steps up the middle, far to near, with their cheeks.
  function drawTerrace(x, cam) {
    for (const [r0, r1, col] of [[RT, 178, '#19141f'], [178, 222, '#16111b'], [222, 300, '#130f18'], [300, 560, '#100c15']]) {
      x.fillStyle = col; x.beginPath();
      for (let b = E0; b < E1; b += 4) { const q = quadAt(cam, b, b + 4, r0, r1, th(b), th(b + 4)); if (q) { x.moveTo(q[0], q[1]); x.lineTo(q[2], q[3]); x.lineTo(q[4], q[5]); x.lineTo(q[6], q[7]); x.closePath(); } }
      x.fill();
    }
    x.fillStyle = '#18131d'; x.beginPath();
    for (let b = E0; b < E1; b += 2) {
      if (b >= W0 && b + 2 <= W1) continue;
      const q = [];
      if (at3(cam, q, b, RT - 16, 0) && at3(cam, q, b + 2, RT - 16, 0) && at3(cam, q, b + 2, RT, th(b + 2)) && at3(cam, q, b, RT, th(b))) { x.moveTo(q[0], q[1]); x.lineTo(q[2], q[3]); x.lineTo(q[4], q[5]); x.lineTo(q[6], q[7]); x.closePath(); }
    }
    x.fill();
    const cope = new Path2D(), capTop = new Path2D(), q = [];
    for (const { b, h0, h1, stairs, courses } of WALL) {
      if (h0 <= 0.2 && h1 <= 0.2) continue;
      for (const [lo0, hi0, lo1, hi1, col] of courses) {
        q.length = 0;
        if (at3(cam, q, b, RT, lo0) && at3(cam, q, b + WALL_STEP, RT, lo1) && at3(cam, q, b + WALL_STEP, RT, hi1) && at3(cam, q, b, RT, hi0)) poly(x, q, col);
      }
      if (stairs) continue;
      q.length = 0;
      if (at3(cam, q, b, RT - 1.5, h0 - 1.2) && at3(cam, q, b + WALL_STEP, RT - 1.5, h1 - 1.2) && at3(cam, q, b + WALL_STEP, RT - 1.5, h1 + 0.2) && at3(cam, q, b, RT - 1.5, h0 + 0.2)) { cope.moveTo(q[0], q[1]); cope.lineTo(q[2], q[3]); cope.lineTo(q[4], q[5]); cope.lineTo(q[6], q[7]); cope.closePath(); }
      const tp = quadAt(cam, b, b + WALL_STEP, RT - 1.5, RT + 2, h0 + 0.2, h1 + 0.2);
      if (tp) { capTop.moveTo(tp[0], tp[1]); capTop.lineTo(tp[2], tp[3]); capTop.lineTo(tp[4], tp[5]); capTop.lineTo(tp[6], tp[7]); capTop.closePath(); }
    }
    x.fillStyle = '#46404e'; x.fill(cope); x.fillStyle = '#383240'; x.fill(capTop);
    for (let i = N_STEPS - 1; i >= 0; i--) {
      const zf = -(RT - i * RUN) - (i === N_STEPS - 1 ? 2 : 0), zn = -(RT - i * RUN) + RUN, h = (i + 1) * (TH / N_STEPS), hl = i * (TH / N_STEPS);
      q.length = 0;
      if (pt3(cam, q, -STEP_W, h, zf) && pt3(cam, q, STEP_W, h, zf) && pt3(cam, q, STEP_W, h, zn) && pt3(cam, q, -STEP_W, h, zn)) poly(x, q, i % 2 ? '#4a4452' : '#45404d');
      q.length = 0;
      if (pt3(cam, q, -STEP_W, hl, zn) && pt3(cam, q, STEP_W, hl, zn) && pt3(cam, q, STEP_W, h, zn) && pt3(cam, q, -STEP_W, h, zn)) poly(x, q, RISERS[i]);
    }
    const z0 = -RT + N_STEPS * RUN;
    for (const sd of [-1, 1]) {
      q.length = 0;
      if (pt3(cam, q, sd * STEP_W, 0, z0) && pt3(cam, q, sd * (STEP_W + 2.5), 0, z0) && pt3(cam, q, sd * (STEP_W + 2.5), TH + 1.5, -RT) && pt3(cam, q, sd * STEP_W, TH + 1.5, -RT)) poly(x, q, '#3a3442');
      const fx = sd * (STEP_W + (sd < 0 ? 0 : 2.5));
      q.length = 0;
      if (pt3(cam, q, fx, 0, z0) && pt3(cam, q, fx, 1.5, z0) && pt3(cam, q, fx, TH + 1.5, -RT) && pt3(cam, q, fx, TH, -RT)) poly(x, q, '#2e2936');
    }
  }
  // The Old Beacon on the southern skyline, against long streaks of cloud whose upper edges catch the moon. Its crows
  // circle in drawLive.
  const CLOUDS = [[-46, 2, 70, 5, 0.34], [30, -6, 64, 4, 0.28], [-8, 14, 96, 6, 0.3], [52, 18, 50, 4, 0.22], [-70, 22, 44, 3, 0.2]];
  function drawBeacon(x, cam, hz, t) {
    const sx = cam.screenOfBearing(180);
    if (sx == null || sx < -120 || sx > cam.IW + 120) return;
    const beacon = HearthArt.props().beacon, bx = Math.round(sx - 17), by = Math.round(hz + 3 - beacon.height);
    const cl = x.createRadialGradient(sx, by + 10, 2, sx, by + 10, 70); cl.addColorStop(0, 'rgba(150,132,190,.22)'); cl.addColorStop(0.5, 'rgba(110,96,150,.1)'); cl.addColorStop(1, 'rgba(110,96,150,0)'); x.fillStyle = cl; x.fillRect(sx - 80, by - 60, 160, 140);
    for (const [ox, oy, w, h, a] of CLOUDS) {
      const cx = sx + ox + Math.sin(t / 11000 + ox) * 3, cy = by + oy;
      x.save(); x.translate(cx, cy); x.scale(1, h / w);
      const g = x.createRadialGradient(0, 0, 0, 0, 0, w / 2); g.addColorStop(0, `rgba(78,66,108,${a})`); g.addColorStop(0.7, `rgba(70,60,98,${a * 0.6})`); g.addColorStop(1, 'rgba(70,60,98,0)');
      x.fillStyle = g; x.fillRect(-w / 2, -w / 2, w, w); x.restore();
      x.fillStyle = `rgba(150,136,186,${a * 0.5})`; x.fillRect(Math.round(cx - w * 0.28), Math.round(cy - h / 2), Math.round(w * 0.56), 1);
    }
    x.drawImage(beacon, bx, by);
    x.imageSmoothingEnabled = true; glow(x, bx + 17, by + 11, 6, EMBER, 0.35); x.globalAlpha = 1; x.imageSmoothingEnabled = false;
  }

  // ── the ground and the sky: everything that lies flat, behind every billboard
  function drawGround(x, cam, Wd, S, t, still) {
    const IW = cam.IW, hz = cam.horizon, R = cam.road, near = GROUND_NEAR[S.region || 0] || GROUND_NEAR[0];
    x.imageSmoothingEnabled = false;
    x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
    // the sky, the moon, the far hills and the Old Beacon
    const g = x.createLinearGradient(0, Math.min(hz, 0) - 60, 0, Math.max(hz, 0) + 4); g.addColorStop(0, '#05030a'); g.addColorStop(0.55, '#110b1a'); g.addColorStop(1, '#2e2040');
    x.fillStyle = g; x.fillRect(0, 0, IW, IH);
    if (hz > 0) {
      const stars = { '#fff8e0': new Path2D(), '#d8ccb4': new Path2D(), '#5a4e6c': new Path2D(), '#2c2438': new Path2D() };
      for (let i = 0; i < 220; i++) {
        const b = h2(i, 7) * 360, sx = cam.screenOfBearing(b); if (sx == null || sx < 0 || sx >= IW) continue;
        const sy = h2(i, 8) * (hz - 10), lum = h2(i, 9);
        stars[lum > 0.88 ? (!still && lum > 0.95 && Math.sin(t / 650 + i * 3) > 0.4 ? '#fff8e0' : '#d8ccb4') : lum > 0.6 ? '#5a4e6c' : '#2c2438'].rect(Math.round(sx), Math.round(sy), 1, 1);
      }
      for (const c in stars) { x.fillStyle = c; x.fill(stars[c]); }
      const mx = cam.screenOfBearing(34);
      if (mx != null) {
        const my = Math.max(10, hz - 40);
        x.imageSmoothingEnabled = true; glow(x, mx, my, 26, MOON, 0.12); x.globalAlpha = 1; x.imageSmoothingEnabled = false;
        x.fillStyle = '#efe3c8'; x.beginPath(); x.arc(mx, my, 6, 0, 7); x.fill(); x.fillStyle = '#0f0a17'; x.beginPath(); x.arc(mx + 2.5, my - 1.5, 6, 0, 7); x.fill();
      }
      // the hills: a staircase of whole pixels, one fill for the rim and one for the body of each range
      if (hillTop.length < IW) hillTop = new Float32Array(IW);
      const bottom = Math.round(hz) + 2;
      if (bearAt.length < IW) bearAt = new Float32Array(IW);
      for (let sx = 0; sx < IW; sx++) bearAt[sx] = cam.bearing(sx);
      for (const { col, rim, at } of HILLS) {
        for (let sx = 0; sx < IW; sx++) hillTop[sx] = Math.round(hz - at(bearAt[sx]));
        const path = new Path2D();
        let y = hillTop[0];
        path.moveTo(0, bottom); path.lineTo(0, y);
        for (let sx = 1; sx < IW; sx++) { const ny = hillTop[sx]; if (ny !== y) { path.lineTo(sx, y); path.lineTo(sx, ny); y = ny; } }
        path.lineTo(IW, y); path.lineTo(IW, bottom); path.closePath();
        x.fillStyle = rim; x.fill(path);
        x.translate(0, 1); x.fillStyle = col; x.fill(path); x.translate(0, -1);
      }
      drawBeacon(x, cam, hz, t);
      const mist = x.createLinearGradient(0, hz - 10, 0, hz + 14); mist.addColorStop(0, 'rgba(70,58,100,0)'); mist.addColorStop(0.5, 'rgba(80,66,110,.28)'); mist.addColorStop(1, 'rgba(70,58,100,0)');
      x.fillStyle = mist; x.fillRect(0, hz - 10, IW, 24);
    }
    x.fillStyle = '#0e0b12'; x.fillRect(0, Math.max(0, Math.round(hz)), IW, IH);
    // the ground: the clearing, the hills the road climbs into, tufts of grass, the plots' pads and paths
    for (const [r, c] of [[Wd.wallR + 60, '#0f0b14'], [Wd.wallR, '#120e17'], [150, '#15111a'], [112, '#18131d'], [84, '#1c1620'], [56, '#201924'], [26, '#281e24']]) { const pts = ringPts(cam, r); if (pts) poly(x, pts, c); }
    const top = [], bot = [];
    for (const band of BANDS) {
      const z1 = band.z1, P = band.pts;
      top.length = 0; bot.length = 0;
      let dSum = 0, dN = 0;
      for (let j = 0; j < P.length; j += 6) {
        if (!cam.p(P[j], P[j + 1], P[j + 2])) continue;
        const ax = cam.px, ay = cam.py, ad = cam.pd;
        if (!cam.p(P[j + 3], P[j + 4], P[j + 5])) continue;
        top.push(ax, ay); bot.push(cam.px, cam.py);
        if (Math.abs(P[j]) < 400) { dSum += ad; dN++; }
      }
      // only the points on screen, and one beyond each side
      let a0 = 0, a1 = top.length - 2;
      while (a0 + 2 < top.length && Math.max(top[a0 + 2], bot[a0 + 2]) < -8) a0 += 2;
      while (a1 - 2 > a0 && Math.min(top[a1 - 2], bot[a1 - 2]) > IW + 8) a1 -= 2;
      if (a1 - a0 >= 4) {
        const q = clamp(((dN ? dSum / dN : 3000) - 260) / 2400, 0, 1) * band.rise;
        x.fillStyle = 'rgb(' + Math.round(near[0] + q * (GROUND_FAR[0] - near[0]) - R * 2) + ',' + Math.round(near[1] + q * (GROUND_FAR[1] - near[1]) + R * 4) + ',' + Math.round(near[2] + q * (GROUND_FAR[2] - near[2]) - R * 3) + ')';
        x.beginPath(); x.moveTo(top[a0], top[a0 + 1]);
        for (let i = a0 + 2; i <= a1; i += 2) x.lineTo(top[i], top[i + 1]);
        for (let i = a1; i >= a0; i -= 2) x.lineTo(bot[i], bot[i + 1]);
        x.closePath(); x.fill();
        if (z1 > 2900 && z1 < 3200) { const rim = new Path2D(); for (let i = a0; i <= a1; i += 2) rim.rect(Math.round(top[i]) - 4, Math.round(top[i + 1]), 9, 1); x.fillStyle = '#3a2f4a'; x.fill(rim); }
      }
    }
    if (cam.w > 0.02 && R < 0.98) drawTerrace(x, cam);
    const tufts = [new Path2D(), new Path2D(), new Path2D()];
    for (const [tx, ty, tz, k] of TUFTS) {
      if (!cam.p(tx, ty, tz) || cam.py < hz || cam.px < -4 || cam.px > IW + 4) continue;
      const s = Math.max(1, Math.round(cam.ps)), px = Math.round(cam.px), py = Math.round(cam.py), path = tufts[k > 0.66 ? 0 : k > 0.33 ? 1 : 2];
      path.rect(px, py, s * (k > 0.5 ? 2 : 1), s);
      if (k > 0.8) path.rect(px + s, py - s, s, s);
    }
    ['#26301f', '#1f2719', '#2a2026'].forEach((c, i) => { x.fillStyle = c; x.fill(tufts[i]); });
    // packed earth before each plot, and paths to the fire from the lower row and up from the terrace's edge
    if (cam.w > 0.02 && R < 0.98) {
      const path = (b, r0, r1, h, wd, col) => { const db = (wd / ((r0 + r1) / 2)) / RAD, q = quadAt(cam, b - db, b + db, r0, r1, h, h); if (q) poly(x, q, col); };
      path(180, 40, RT - N_STEPS * RUN, 0, 6, '#2a2028');
      S.plots.forEach((pl, i) => {
        if (!pl) return;
        const [wx, wz, b, up] = Wd.plots[i], c = cam.proj(wx, 0, wz), a = c ? nearFade(c.d) : 0;
        if (a <= 0) return;
        const r = up ? R_UP : R_LO, h = up ? th(b) : 0;
        x.globalAlpha = a;
        if (!up) path(b, 44, r - 6, 0, 3, '#261d26');
        else path(b, RT + 2, r - 4, h, 2.5, '#231b25');
        const db = (16 / r) / RAD, pad = quadAt(cam, b - db, b + db, r - 7, r + 6, h, h);
        if (pad) poly(x, pad, pl.empty ? '#1e1823' : '#2a2129');
        x.globalAlpha = 1;
      });
    }
    // the road, in three strips: a dark verge, the dark road, and the lit stretch as far as your light reaches
    const last = EDGES.length - 1, iLit = litEdge(S);
    strip(x, cam, ROAD_W / 2 + 3, 0, last, '#0b0810');
    if (iLit < last) strip(x, cam, ROAD_W / 2, Math.max(0, iLit), last, '#2a1f26');
    if (iLit > 0) { strip(x, cam, ROAD_W / 2, 0, iLit, '#6a4628'); strip(x, cam, ROAD_W * 0.18, 0, iLit, '#a8743e'); }
  }
  // How far the light reaches up the road: to the frontier stage's lantern, or the whole road once every stage is lit.
  const litZ = S => { const Z = stageZ(S.stages.length); return S.front < 0 ? Z[Z.length - 1] : S.front > 0 ? Z[S.front] : 40; };
  function litEdge(S) { const z = litZ(S); let i = 0; while (i < EDGES.length - 1 && EDGES[i + 1].rz <= z) i++; return i; }

  // ── everything that stands up: the billboards, each { d, dyn, img, x, y, w, h, a } or { d, dyn, fn(x, t) }, with
  // the lights they cast and the anchors the camp screen puts its plaques, chips and taps on
  function build(cam, Wd, S, reduce, sel) {
    const items = [], lights = [], anchors = [], hz = cam.horizon, northA = Math.max(0, 1 - 1.8 * cam.w), dyn = { eyes: [], smoke: [] }, R = cam.road;
    const IW = cam.IW;
    const at = (wx, wz) => cam.proj(wx, groundY(wx, wz), wz);
    const put = (p, img, s, a = 1, ox = 0.5, lift = 0) => {
      const w = Math.round(img.width * s), hh = Math.round(img.height * s), x0 = Math.round(p.x - img.width * s * ox), y0 = Math.round(p.y - img.height * s + lift);
      items.push({ d: p.d, img, x: x0, y: y0, w, h: hh, a });
      return { x0, y0, w, hh };
    };
    const tree = tinted(prop('deadtree'), '#0b0812'), tree2 = tinted(prop('deadtree'), '#130e1a');
    const scenery = Wd.scenery.concat(roadScenery(S.region || 0));
    for (const sc of scenery) {
      const p = cam.proj(sc.x, sc.y, sc.z);
      if (!p) continue;
      if (p.x < -80 || p.x > IW + 80 || p.y < -60) continue;
      if (sc.k === 'tree') {
        // dead wood near the road shows its wood until the night takes it (a later region grows its own trees)
        const s = p.s * (1.3 + sc.v * 0.9), sil = sc.v > 0.5 ? tree : tree2, fog = clamp((p.d - 160) / 700, 0, 1);
        const kind = sc.r === 2 ? (sc.v > 0.5 ? 'pine' : 'tree') : 'deadtree', wood = propIn(kind, sc.r || 0);
        put(p, fog < 1 ? fogged(wood, kind === 'deadtree' ? sil : tinted(wood, sc.v > 0.5 ? '#0b0812' : '#130e1a'), fog) : kind === 'deadtree' ? sil : tinted(wood, '#0b0812'), s);
        continue;
      }
      const camp = CAMP_PROPS.includes(sc.k), north = camp && sc.z > 0, a = north ? northA : 1;
      if (a <= 0.01) continue;
      const img = PROPS[sc.k] ? propIn(sc.k, sc.r || 0) : art(sc.k), s = camp ? cam.scale(p.s) : p.s;
      const far = Math.max(0, Math.min(0.75, (p.d - 260) / 900));
      put(p, far > 0.02 ? darkened(img, far) : img, s, a, 0.5, s);
      if (sc.k === 'tent') lights.push([p.x - 2 * s, p.y - 3 * s, 6 * s, LAMP, 0.4 * a]);
      if (sc.k === 'chapelS') lights.push([p.x, p.y - 7 * s, 4 * s, LAMP, 0.4]);
    }
    // the boss's chapel at the road's end
    { const ez = 3050, ex = roadAt(2900) + 30, p = at(ex, ez);
      if (p) {
        const c = sprite(CHAPEL.map, CHAPEL.pal, 'cs:chapel'), s = Math.max(2, Math.round(p.s * 3.2));
        items.push({ d: p.d, fn: x => { x.imageSmoothingEnabled = true; glow(x, p.x, p.y - c.height * s * 0.5, c.width * s * 0.8, MIST, 0.14); x.globalAlpha = 1; x.imageSmoothingEnabled = false; x.drawImage(c, Math.round(p.x - c.width * s / 2), Math.round(p.y - c.height * s + s), c.width * s, c.height * s); } });
        lights.push([p.x - 5.5 * s, p.y - 2.5 * s, 4 * s, CHAPEL_L, 0.45], [p.x + 5.5 * s, p.y - 2.5 * s, 4 * s, CHAPEL_L, 0.45]);
      } }
    // the gate to the next region, past the boss: two pillars, and the next region's name over it (js/camp.js)
    if (S.gate) {
      const gx = roadAt(GATE_Z);
      for (const sd of [-1, 1]) {
        const p = at(gx + sd * (ROAD_W / 2 + 4), GATE_Z);
        if (!p) continue;
        const img = prop('pillar'), sc = cam.scale(p.s * 1.4);
        items.push({ d: p.d, img: tinted(img, '#1e1a26'), x: Math.round(p.x - img.width * sc / 2), y: Math.round(p.y - img.height * sc + sc), w: Math.round(img.width * sc), h: Math.round(img.height * sc), a: 1 });
      }
      const p = at(gx, GATE_Z + 1);
      if (p) anchors.push({ id: 'gate', d: p.d, x: p.x, y: p.y, top: p.y - 14 * Math.max(1, p.s * 1.4), s: p.s, view: 'road' });
    }
    // the region's stages along the road: lit lanterns glow, elites are red diamonds, the boss a skull. On the road view
    // the plain stages are lanterns on posts, the foes of stages you haven't lit stand by them as silhouettes, and the
    // party waits at the frontier.
    const Z = stageZ(S.stages.length), pools = [];
    S.stages.forEach((stg, k) => {
      const z = Z[k], wx = roadAt(z), p = at(wx, z), side = k % 2 ? 1 : -1;
      if (!p) return;
      const s = Math.max(0.35, p.s) * (1 + 0.5 * R), on = stg.lit, front = k === S.front, kind = stg.kind, chosen = R > 0.02 && sel === k;
      const base = { id: 'stage' + k, stage: k, kind, on, front, d: p.d, x: p.x, y: p.y, s: p.s, view: 'party' };
      if (R > 0.02 && !on) {
        const boss = kind === 'boss';
        (stg.foes || []).slice(0, boss ? 1 : 3).forEach((f, j) => {
          const fx = wx - side * (ROAD_W / 2 + 10 + j * 9), fz = z + 6 - j * 7, q = at(fx, fz);
          if (!q) return;
          const img = foeSprite(f), sc = cam.scale(q.s * (boss ? 1.7 : 1.05)), dim = Math.min(1, R * 1.3), flip = side > 0;
          const bx2 = Math.round(q.x - img.width * sc / 2), by2 = Math.round(q.y - img.height * sc + sc), o = Math.max(1, Math.round(sc * 0.6)), w = Math.round(img.width * sc), hh = Math.round(img.height * sc);
          items.push({ d: q.d, fn: x => {
            x.globalAlpha = 0.9 * dim;
            if (flip) { x.save(); x.translate(bx2 * 2 + w, 0); x.scale(-1, 1); }
            x.drawImage(tinted(img, '#4a3e62'), bx2 - (flip ? -o : o), by2 - o, w, hh); x.drawImage(tinted(img, '#07050b'), bx2, by2, w, hh);
            if (flip) x.restore();
            x.globalAlpha = 1;
          } });
          // the frontier's foes and the boss watch you: their eyes glow (drawn with the lights)
          if (front || boss) dyn.eyes.push([Math.round(q.x + (flip ? -1 : 1) * img.width * sc * 0.18), Math.round(q.y - img.height * sc * 0.72), Math.max(1, Math.round(sc)), boss, k, dim]);
        });
      }
      if (R > 0.02 && front) (S.heroes || []).slice(0, 4).forEach((hr, j) => {
        const hx = wx + side * (ROAD_W / 2 + 6) + (j % 2) * 8 * side, hz2 = z - 26 - Math.floor(j / 2) * 10, q = at(hx, hz2);
        if (!q) return;
        const look = typeof Items !== 'undefined' ? Items.look(hr.c) : null, sc = cam.scale(q.s * 1.05), a = Math.min(1, R * 1.3);
        items.push({ d: q.d, dyn: true, fn: (x, t) => { const sp = heroSprite(hr.c.cls, reduce ? 0 : Math.floor(t / 300 + j) % 2, look); x.globalAlpha = a; x.drawImage(sp, Math.round(q.x - sp.width * sc / 2), Math.round(q.y - sp.height * sc + sc), Math.round(sp.width * sc), Math.round(sp.height * sc)); x.globalAlpha = 1; } });
      });
      const ring = x => { if (!chosen) return; const rr = (12 + (reduce ? 0 : 3 * Math.sin(performance.now() / 200))) * Math.max(0.35, p.s); x.strokeStyle = 'rgba(255,214,140,' + (0.85 * R).toFixed(2) + ')'; x.lineWidth = Math.max(1, Math.round(p.s)); x.beginPath(); x.ellipse(p.x, p.y, rr * 1.7, rr * 0.6, 0, 0, Math.PI * 2); x.stroke(); };
      if (kind === 'road' && R > 0.5) {
        const img = prop('post'), sc = cam.scale(p.s * 1.25), img2 = on ? img : front ? tinted(img, '#5a4632') : tinted(img, '#241e2a'), top = p.y - img.height * sc + sc;
        items.push({ d: p.d, dyn: chosen || front, fn: (x, t) => {
          ring(x);
          x.drawImage(img2, Math.round(p.x - 2.5 * sc), Math.round(top), Math.round(img.width * sc), Math.round(img.height * sc));
          if (front) { x.fillStyle = `rgba(255,190,100,${(0.45 + (reduce ? 0 : 0.35 * Math.sin(t / 90) * Math.sin(t / 37))).toFixed(3)})`; x.fillRect(Math.round(p.x - 0.5 * sc), Math.round(top + 2 * sc), Math.max(1, Math.round(sc)), Math.max(1, Math.round(sc))); }
        } });
        if (on) { lights.push([p.x, top + 2.5 * sc, 4 + 10 * sc, LAMP, 0.5]); pools.push([p.x, p.y, 6 + 16 * sc]); }
        anchors.push(Object.assign(base, { top, box: [p.x - 6 * sc, top - 2, p.x + 6 * sc, p.y + 2] }));
        if (front) dyn.front = [p.x, top + 2.5 * sc, 4 + 10 * sc];
        return;
      }
      if (kind === 'boss') {
        const img = art('skull'), sk = Math.max(1, Math.round(s * 1.2));
        items.push({ d: p.d, dyn: chosen, fn: x => { ring(x); x.drawImage(img, Math.round(p.x - 3.5 * sk), Math.round(p.y - 6 * sk), img.width * sk, img.height * sk); } });
        anchors.push(Object.assign(base, { top: p.y - 6 * sk, box: [p.x - 5 * sk, p.y - 7 * sk, p.x + 5 * sk, p.y + 1] }));
      } else {
        items.push({ d: p.d, dyn: chosen, fn: x => {
          ring(x);
          if (kind === 'elite') {
            const r = Math.max(1.5, 3.4 * s);
            x.fillStyle = '#0d0911'; x.beginPath(); x.moveTo(p.x, p.y - 2 * r - 1); x.lineTo(p.x + r + 1, p.y - r); x.lineTo(p.x, p.y + 1); x.lineTo(p.x - r - 1, p.y - r); x.closePath(); x.fill();
            x.fillStyle = on ? '#d4484a' : front ? '#e06a5a' : '#4a2a32'; x.beginPath(); x.moveTo(p.x, p.y - 2 * r); x.lineTo(p.x + r, p.y - r); x.lineTo(p.x, p.y); x.lineTo(p.x - r, p.y - r); x.closePath(); x.fill();
          } else {
            const bw = Math.max(1, Math.round(3 * s)), bh = Math.max(2, Math.round(4 * s)), top = p.y - bh - Math.round(3 * s);
            x.fillStyle = '#0d0911'; x.fillRect(Math.round(p.x - bw / 2) - 1, Math.round(top) - 1, bw + 2, bh + 2);
            x.fillStyle = on ? '#f4a646' : front ? '#ffe2a0' : '#2a2430'; x.fillRect(Math.round(p.x - bw / 2), Math.round(top), bw, bh);
            x.fillStyle = '#3a3044'; x.fillRect(Math.round(p.x), Math.round(top + bh), Math.max(1, Math.round(s / 2)), Math.max(1, Math.round(3 * s)));
          }
        } });
        anchors.push(Object.assign(base, { top: p.y - 9 * s, box: [p.x - 5 * s - 2, p.y - 9 * s - 2, p.x + 5 * s + 2, p.y + 2] }));
      }
      if (on) { lights.push([p.x, p.y - 4 * s, 3 + 7 * s, AMBER, 0.32]); pools.push([p.x, p.y, 4 + 12 * s]); }
      if (front) dyn.front = [p.x, p.y - 4 * s, 4 + 10 * s];
    });
    // the plots, the lower row from the fire out and then the terrace: what stands on each (js/hearthart.js), or the
    // plot itself; their window lights, and the chimneys' smoke (drawn each frame, in drawSmoke)
    S.plots.forEach((pl, i) => {
      if (!pl) return;
      const [wx, wz] = Wd.plots[i], p = at(wx, wz);
      if (!p) return;
      // they come in as the camera turns from the party, so none shows at the party view's edges
      const fade = nearFade(p.d) * clamp(cam.w * 8, 0, 1);
      if (fade <= 0) return;
      const k = pl.empty ? 'plot' : pl.art, img = HearthArt.building(k) || HearthArt.building('plot'), s = cam.scale(p.s), bx = p.x - img.width * s / 2, by = p.y - img.height * s;
      items.push({ d: p.d, fn: x => {
        x.globalAlpha = fade * 0.5; x.fillStyle = '#050308'; x.fillRect(Math.round(bx), Math.round(p.y), Math.round(img.width * s), Math.max(1, Math.round(s)));
        x.globalAlpha = fade; x.drawImage(img, Math.round(bx), Math.round(by), Math.round(img.width * s), Math.round(img.height * s)); x.globalAlpha = 1;
      } });
      if (fade > 0.5) {
        for (const [lx, ly, kind, r] of img.lights) { const L = LIGHT_OF[kind] || LIGHT_OF.y; lights.push([bx + (lx + 0.5) * s, by + (ly + 0.5) * s, (r || 4) * s, L[0], L[1]]); }
        img.smoke.forEach(([sx, sy], j) => dyn.smoke.push([bx + (sx + 0.5) * s, by + sy * s, s, h2(i, 171 + j)]));
      }
      anchors.push({ id: 'plot' + i, plot: i, x: p.x, y: p.y, top: by, d: p.d, box: [bx - 2, by - 2, bx + img.width * s + 2, p.y + 2], view: 'build', a: fade });
    });
    // the Recruit Board, at the front on the left, dark until the road opens it
    if (northA > 0.01) {
      const p = at(Wd.board[0], Wd.board[1]);
      if (p) {
        const img = HearthArt.building('board'), s = cam.scale(p.s), bx = p.x - img.width * s / 2, by = p.y - img.height * s, shut = !S.board.open;
        items.push({ d: p.d, fn: x => {
          x.globalAlpha = northA; x.drawImage(img, Math.round(bx), Math.round(by), Math.round(img.width * s), Math.round(img.height * s));
          if (shut) { x.globalAlpha = northA * 0.6; x.drawImage(tinted(img, '#07050b'), Math.round(bx), Math.round(by), Math.round(img.width * s), Math.round(img.height * s)); }
          x.globalAlpha = 1;
        } });
        if (!shut) for (const [lx, ly, , r] of img.lights) lights.push([bx + (lx + 0.5) * s, by + (ly + 0.5) * s, (r || 6) * s, WARM, 0.6 * northA]);
        anchors.push({ id: 'board', x: p.x, y: p.y, top: by, d: p.d, box: [bx - 2, by - 2, bx + img.width * s + 2, p.y + 2], view: 'party', a: northA });
      }
      // the road's sign, by the way out of camp
      const q = at(SIGN[0], SIGN[1]);
      if (q) {
        const img = bart('road'), s = cam.scale(q.s), bx = q.x - 8 * s, by = q.y - img.height * s;
        items.push({ d: q.d, fn: x => { x.globalAlpha = northA; x.drawImage(img, Math.round(bx), Math.round(by), Math.round(img.width * s), Math.round(img.height * s)); x.fillStyle = '#f4a646'; x.fillRect(Math.round(bx + s), Math.round(by - 2 * s), Math.round(3 * s), Math.round(3 * s)); x.globalAlpha = 1; } });
        lights.push([bx + 2.5 * s, by - 0.5 * s, 8 * s, LAMP, 0.5 * northA]);
      }
    }
    for (const [wx, wz] of CAMP_POSTS) {
      const a = wz > 0 ? northA : 1;
      if (a <= 0.01) continue;
      const p = at(wx, wz);
      if (!p) continue;
      const img = prop('post'), s = cam.scale(p.s);
      put(p, img, s, a, 2.5 / img.width, s);
      lights.push([p.x, p.y - img.height * s + 3.5 * s, 9 * s, LAMP, 0.45 * a]);
    }
    // the Hearth's props: lamp posts on the terrace's edge, braziers at the foot of the steps, and mist lying along the
    // foot of the terrace and further back over the graves (it shows as the camera turns to the buildings)
    if (cam.w > 0.02 && R < 0.98) {
      const HP = HearthArt.props();
      for (const b of Wd.lamps) {
        const [lx, lz] = atB(b, RT + 3), p = at(lx, lz);
        if (!p || p.x < -20 || p.x > IW + 20) continue;
        const s = cam.scale(p.s), r = put(p, HP.lamp, s, 1, 3.5 / HP.lamp.width);
        lights.push([r.x0 + 5.5 * s, r.y0 + 7 * s, 11 * s, LAMP, 0.5]);
      }
      for (const sd of [-1, 1]) {
        const p = at(sd * 17, -RT + N_STEPS * RUN + 5);
        if (!p) continue;
        const s = cam.scale(p.s), r = put(p, HP.brazier, s, 1, 4.5 / HP.brazier.width);
        lights.push([r.x0 + 4.5 * s, r.y0 + 2 * s, 14 * s, BRAZIER, 0.55]);
      }
      if (cam.w > 0.15) {
        const k = Math.min(1, (cam.w - 0.15) * 2);
        const mist = (b, r, h, a, wd) => {
          const [mx, mz] = atB(b, r), p = at(mx, mz);
          if (!p) return;
          const w = wd * p.s, gx = p.x + Math.sin(b * 1.7) * 8 * p.s, gy = p.y - (h + 2) * p.s;
          if (gx + w < 0 || gx - w > IW) return;
          items.push({ d: p.d, fn: x => { x.imageSmoothingEnabled = true; glow(x, gx, gy, w, FOG, a * k, 0.17); x.globalAlpha = 1; x.imageSmoothingEnabled = false; } });
        };
        for (let b = 92; b <= 268; b += 8) mist(b, RT + 5, th(b), 0.22, 30);
        for (let b = 118; b <= 242; b += 11) mist(b, 250, TH, 0.16, 46);
      }
    }
    // what frames the buildings view: the dark tree and its lantern at the left, a lamp and a fence at the right, sliding
    // in from the sides as the camera comes round (drawn over the scene, in drawFrame)
    if (cam.w >= 0.4 && R <= 0.01) {
      const HP = HearthArt.props(), k = Math.min(1, (cam.w - 0.4) / 0.5), slide = Math.round((1 - k) * 90);
      const lx = -22 - slide, ly = IH - HP.frameL.height + 4, rx = IW - HP.frameR.width + 8 + slide, ry = IH - HP.frameR.height + 2;
      dyn.frame = { lx, ly, rx, ry, k };
      lights.push([lx + HP.frameL.lamp[0], ly + HP.frameL.lamp[1], 22 * k, LAMP, 0.55 * k], [rx + HP.frameR.lamp[0], ry + HP.frameR.lamp[1], 20 * k, LAMP, 0.55 * k]);
    }
    // the party at the fire, each on a log, facing it
    const fireP = cam.proj(0, 0, 0);
    S.heroes.forEach((hr, j) => {
      const [wx, wz] = SEATS[j], p = at(wx, wz);
      if (!p) return;
      const sp = seated(hr.c), s = cam.scale(p.s), flip = !!fireP && p.x > fireP.x, top = p.y - sp.height * s;
      items.push({ d: p.d, dyn: true, fn: (x, t, react) => {
        x.fillStyle = '#4a3424'; x.fillRect(Math.round(p.x - 6 * s), Math.round(p.y - s), Math.round(12 * s), Math.round(2 * s));
        const q = react ? (t - (react[j] || -1e9)) / 420 : 1, hop = !reduce && q >= 0 && q < 1 ? Math.round(Math.sin(Math.PI * q) * 3 * s / 2) : 0;
        const breathe = !reduce && Math.sin(t / 620 + j * 1.7) > 0.75 ? Math.max(1, Math.round(s / 2)) : 0;
        const dx = Math.round(p.x - sp.ax * s), dy = Math.round(p.y - sp.height * s + s - breathe - hop), w = Math.round(sp.width * s), hh = Math.round(sp.height * s);
        if (hr.spent) x.globalAlpha = 0.6;
        if (flip) { x.save(); x.translate(Math.round(p.x) * 2, 0); x.scale(-1, 1); x.drawImage(sp, Math.round(p.x) * 2 - dx - w, dy, w, hh); x.restore(); }
        else x.drawImage(sp, dx, dy, w, hh);
        x.globalAlpha = 1;
      } });
      anchors.push({ id: 'hero' + j, hero: j, d: p.d, x: p.x, y: p.y, top, box: [p.x - 8 * s, top - 2, p.x + 8 * s, p.y + s], view: 'both' });
    });
    // Wick, the lamp-keeper, in the bottom-left corner, never drawn bigger than 2×
    if (northA > 0.01) {
      const p = at(Wd.wick[0], Wd.wick[1]);
      if (p) {
        const img = art('wick'), s = Math.min(cam.scale(p.s), 2), bx = p.x - 6 * s, by = p.y - img.height * s + s;
        items.push({ d: p.d, img, x: Math.round(bx), y: Math.round(by), w: Math.round(img.width * s), h: Math.round(img.height * s), a: northA });
        dyn.wick = [bx + 13.5 * s, by + 6.5 * s, 11 * s, northA];
        anchors.push({ id: 'wick', d: p.d, x: p.x, y: p.y, top: by, box: [bx - 2, by - 2, bx + img.width * s + 2, p.y + 2], view: 'party', a: northA });
      }
    }
    if (fireP) {
      const s = cam.scale(fireP.s);
      items.push({ d: fireP.d, dyn: true, fn: (x, t) => { const img = paintFire(t, 1); x.drawImage(img, Math.round(fireP.x - 13 * s), Math.round(fireP.y - 27 * s), Math.round(26 * s), Math.round(30 * s)); } });
      anchors.push({ id: 'fire', d: fireP.d, x: fireP.x, y: fireP.y, top: fireP.y - 18 * s, box: [fireP.x - 11 * s, fireP.y - 16 * s, fireP.x + 11 * s, fireP.y + 3 * s], view: 'both' }); // the stones and the flames
      dyn.fire = fireP;
    }
    items.sort((a, b) => b.d - a.d);
    anchors.sort((a, b) => b.d - a.d); // far to near, like the drawing: a tap takes the nearest
    // beyond your light the road ahead lies in the dark; then the dark closes in round the fire
    const over = [];
    const lz = litZ(S), fz = cam.proj(roadAt(lz), groundY(roadAt(lz), lz), lz);
    if (fz && cam.w < 0.5 && fz.y > hz && R < 0.5) over.push(xx => { const dg = xx.createLinearGradient(0, fz.y + 4, 0, Math.max(hz - 20, fz.y - 60)); dg.addColorStop(0, 'rgba(7,5,11,0)'); dg.addColorStop(1, `rgba(7,5,11,${(0.5 * (1 - 2 * cam.w)).toFixed(3)})`); xx.fillStyle = dg; xx.fillRect(0, 0, IW, fz.y + 4); });
    if (fireP && R < 1) over.push(xx => { const dk = xx.createRadialGradient(fireP.x, fireP.y - 8 * fireP.s, 12 * fireP.s, fireP.x, fireP.y - 8 * fireP.s, Math.max(130 * fireP.s, 120)); dk.addColorStop(0, 'rgba(6,4,10,0)'); dk.addColorStop(0.5, 'rgba(6,4,10,.18)'); dk.addColorStop(1, 'rgba(6,4,10,.72)'); xx.globalAlpha = (1 - R) * (1 - 0.38 * cam.w); xx.fillStyle = dk; xx.fillRect(0, 0, IW, IH); xx.globalAlpha = 1; });
    if (R > 0) over.push(xx => { const vg = xx.createRadialGradient(IW / 2, IH * 0.42, IH * 0.35, IW / 2, IH * 0.42, IW * 0.62); vg.addColorStop(0, 'rgba(6,4,10,0)'); vg.addColorStop(1, 'rgba(6,4,10,.6)'); xx.globalAlpha = R; xx.fillStyle = vg; xx.fillRect(0, 0, IW, IH); xx.globalAlpha = 1; });
    // the next region's air beyond the gate: a blue mist, with the lights
    const glows = [];
    if (S.gate && R > 0.02) { const gq = cam.proj(roadAt(GATE_Z), groundY(0, GATE_Z), GATE_Z); if (gq && gq.y > -40) glows.push(xx => { const mg = xx.createLinearGradient(0, gq.y + 10, 0, gq.y - 80); mg.addColorStop(0, 'rgba(60,90,130,0)'); mg.addColorStop(0.4, 'rgba(60,90,130,.22)'); mg.addColorStop(1, 'rgba(40,60,100,.35)'); xx.globalAlpha = R; xx.fillStyle = mg; xx.fillRect(0, gq.y - 80, IW, 90); xx.globalAlpha = 1; }); }
    return { items, lights, pools, anchors, over, dyn, glows };
  }
  // How strongly an anchor's plaque and chip show, as the camera turns (w: 0 party … 1 buildings): the buildings view's
  // things fade in over its half of the turn, the party view's fade out over the other, the fire and the party stay.
  const opacityOf = (a, w) => (a.view === 'build' ? Math.max(0, 2 * w - 1) * (a.a == null ? 1 : a.a) : a.view === 'party' ? Math.max(0, 1 - 2 * w) : 1);
  function drawItem(x, it, t, react) {
    if (it.fn) { it.fn(x, t, react); return; }
    if (it.a < 1) x.globalAlpha = it.a;
    x.drawImage(it.img, it.x, it.y, it.w, it.h);
    if (it.a < 1) x.globalAlpha = 1;
  }
  function drawLights(x, list, pools, glows) {
    for (const [lx, ly, r, rgb, a] of list) glow(x, lx, ly, r, rgb, a);
    for (const [px, py, r] of pools) glow(x, px, py, r, POOL, 0.22, 0.32);
    x.globalAlpha = 1;
    if (glows) for (const f of glows) f(x);
  }
  // Over the billboards and under the dark, each frame: the chimneys' smoke drifting up and away, then what frames the
  // buildings view.
  function drawSmoke(x, D, t) {
    x.globalCompositeOperation = 'source-over'; x.imageSmoothingEnabled = false;
    for (const [sx, sy, ss, seed] of D.smoke) {
      for (let j = 0; j < 10; j++) {
        const q = ((t / 5200) + j / 10 + seed) % 1, r = (1 + q * 5) * ss, px = sx + (Math.sin(q * 4 + j * 1.3 + seed * 6) * 1.6 + q * q * 18) * ss, py = sy - q * 38 * ss;
        x.globalAlpha = 0.34 * Math.min(1, q * 6) * (1 - q); x.fillStyle = q < 0.2 ? '#8a7a86' : '#6e6688';
        x.beginPath(); x.arc(px, py, r, 0, 7); x.fill();
      }
    }
    x.globalAlpha = 1;
    const F = D.frame;
    if (F) { const HP = HearthArt.props(); x.globalAlpha = F.k; x.drawImage(HP.frameL, F.lx, F.ly); x.drawImage(HP.frameR, F.rx, F.ry); x.globalAlpha = 1; }
  }
  // What flickers and drifts: the fire's light, Wick's lantern, the frontier lantern guttering, the will-o'-wisps over
  // the graveyard, and fireflies.
  function drawLive(x, cam, B, t, Wd) {
    const IW = cam.IW, hz = cam.horizon, D = B.dyn;
    x.globalCompositeOperation = 'lighter'; x.imageSmoothingEnabled = true;
    if (D.fire) { const fk = 0.42 + Math.sin(t / 110) * 0.04 + Math.sin(t / 37) * 0.03, s = D.fire.s; glow(x, D.fire.x, D.fire.y - 8 * s, 40 * s, FIRE, fk); glow(x, D.fire.x, D.fire.y - 8 * s, 16 * s, HOT, fk * 0.45); glow(x, D.fire.x, D.fire.y, 46 * s, POOL, fk * 0.45, 0.4); }
    if (D.wick) glow(x, D.wick[0], D.wick[1], D.wick[2], LAMP, (0.55 + Math.sin(t / 170) * 0.08) * D.wick[3]);
    if (D.front) { const g = 0.27 + 0.1 * Math.sin(t / 160) + 0.06 * Math.sin(t / 47 + 1.3) - (Math.sin(t / 1300) > 0.93 ? 0.16 : 0); glow(x, D.front[0], D.front[1], D.front[2], FRONT, Math.max(0.04, g)); }
    x.globalCompositeOperation = 'source-over'; x.imageSmoothingEnabled = false;
    for (const [ex, ey, es, boss, k, dim] of D.eyes) { x.globalAlpha = dim * (0.6 + 0.4 * Math.sin(t / 240 + k)); x.fillStyle = boss ? '#ff5a4a' : '#d4484a'; x.fillRect(ex, ey, es, es); }
    x.globalAlpha = 1; x.globalCompositeOperation = 'lighter'; x.imageSmoothingEnabled = true;
    for (let i = 0; i < 7; i++) {
      const b = 150 + h2(i, 131) * 70, r = 250 + h2(i, 132) * 90, wz = r * Math.cos(b * RAD), wx = r * Math.sin(b * RAD) + Math.sin(t / 1300 + i) * 8;
      if (!cam.p(wx, groundY(wx, wz) + 6 + Math.sin(t / 700 + i * 2) * 3, wz)) continue;
      glow(x, cam.px, cam.py, 3 + 6 * cam.ps, WISP, 0.25 + 0.15 * Math.sin(t / 300 + i));
    }
    x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.imageSmoothingEnabled = false;
    // crows round the Old Beacon's top
    const sx = hz > 0 ? cam.screenOfBearing(180) : null;
    if (sx != null && sx > -40 && sx < IW + 40) {
      const by = Math.round(hz + 3 - HearthArt.props().beacon.height);
      x.fillStyle = '#0a070e';
      for (let i = 0; i < 3; i++) { const a = t / 1400 + i * 2.1, cx = Math.round(sx + Math.cos(a) * (12 + i * 3)), cy = Math.round(by + 4 + Math.sin(a * 1.3) * 4 - i * 2), f = Math.floor(t / 180 + i) % 2; x.fillRect(cx - 1, cy - f, 1, 1); x.fillRect(cx, cy, 1, 1); x.fillRect(cx + 1, cy - f, 1, 1); }
    }
    for (let i = 0; i < 12; i++) {
      const px = (h2(i, 41) * IW + Math.sin(t / 2300 + i) * 14 + IW) % IW, py = Math.max(hz, 30) + h2(i, 42) * (IH - Math.max(hz, 30)) + Math.sin(t / 1700 + i * 2) * 6, a = 0.35 + 0.35 * Math.sin(t / 400 + i * 1.3);
      if (a < 0.2) continue;
      x.globalAlpha = a; x.fillStyle = '#d8f0a0'; x.fillRect(Math.round(px), Math.round(py), 1, 1);
    }
    x.globalAlpha = 1;
  }

  // ── a live scene: drag to turn, release to settle on the nearer view; on the road, drag along it
  //   opts.yaw       where the camera starts
  //   opts.reduce    () => true for reduced motion: the views switch without the swing, and the flight is a cut
  //   api.state      the state to draw (see the top of this file); set it again when the save changes
  //   api.locked     true keeps the camera in the party view: it nudges back
  //   api.sel        the stage whose card shows on the road: drawn with a ring
  //   api.onFrame    (out) => void after every frame: out.cam.w (0 party … 1 buildings), out.road (0 at the fire … 1 on
  //                  the road), out.anchors, out.v (bumped when the anchors move), out.yaw
  //   api.onSnap     (k) => void when the road view settles on a stage (k), or heads home (null)
  // Panning moves along the road in stages, not ground: every stage is the same drag away, whether the lanterns stand
  // close together near camp or far apart in the hills. u is that place: 0 at the first stage, the boss's index at the
  // boss, and below 0 the pull back toward camp. Drag back past PULL_HOME and let go, and the camera flies home.
  // Past the boss a held drag goes on far enough to show the next region's gate (the mockup stopped short of it), and
  // springs back to the boss when let go.
  const PX_PER_STAGE = 64, PULL_HOME = 1.3, UMIN = -3, UOVER = 1.15, ZOVER = 300;
  // The inverse of ease(), so a flight can be picked up where it stands.
  const unease = v => { let k = clamp(v, 0, 1); for (let i = 0; i < 8; i++) { const f = k * k * (3 - 2 * k) - v, d = 6 * k * (1 - k) + 1e-6; k = clamp(k - f / d, 0, 1); } return k; };
  function live(canvas, opts = {}) {
    const x = canvas.getContext('2d');
    let IW = 0, yaw = opts.yaw || 0, target = yaw, vel = 0, dragging = false, lastX = 0, lastT = 0, rest = 1, alive = true, last = 0;
    let raw = 0, moved = 0, cache = null, out = null, v = 0, y0 = 0;
    // the road: how far the camera has flown (roadK, heading for roadTo), where it looks along the road (uc, easing to
    // uTo), a flick's speed, and how far a pull back past the first stage has turned it toward home
    let roadK = 0, roadTo = 0, uc = 0, uVel = 0, uTo = null, pullK = 0, lastY = 0, onRoad = false, sel = null;
    const react = [];
    const reduce = () => (opts.reduce ? opts.reduce() : false);
    const pxPerDeg = () => (IW * K / 2) / 180; // half the frame's width turns 180°
    const nearest = (a, vv = 0) => Math.round((a + vv * 18) / 180) * 180;
    const times = [];
    let count = 0;
    // each stage's resting place on the road (the camera looks a little short of its lantern), and between them
    const last1 = () => Math.max(0, api.state.stages.length - 1);
    const zOf = k => { const Z = stageZ(last1() + 1); return Z[clamp(k, 0, Z.length - 1)] - 20; };
    const zAtU = u => { const L = last1(); if (u <= 0) return zOf(0) + u * 40; if (u >= L) return zOf(L) + (u - L) * 260; const k = Math.floor(u); return lerp(zOf(k), zOf(k + 1), u - k); };
    function size() {
      const W = Math.max(2, Math.ceil((opts.width ? opts.width() : canvas.parentNode ? canvas.parentNode.clientWidth : REF * K) / K));
      if (W === IW) return;
      IW = W; canvas.width = IW; canvas.height = IH;
      canvas.style.width = IW * K + 'px'; canvas.style.height = IH * K + 'px';
      cache = null;
    }
    // The camera now: the orbit, the road, or the flight between them.
    function camNow(r) {
      const k3 = ease(roadK) * (1 - pullK);
      if (k3 <= 0) return camera(IW, yaw, r);
      return camera(IW, blendParams(orbitParams(yaw), roadParams(clamp(zAtU(uc), zOf(0), zOf(last1()) + ZOVER)), k3), r);
    }
    const snap = k => { if (api.onSnap) api.onSnap(k); };
    const api = {
      state: opts.state || { heroes: [], stages: [], front: -1, plots: [], board: { open: false }, sig: '' },
      locked: !!opts.locked, onFrame: null, onSnap: null,
      get yaw() { return yaw; },
      get view() { return weightOf(target == null ? yaw : target) > 0.5 ? 'build' : 'party'; },
      get w() { return ease(weightOf(yaw)); },
      // on the road, or heading there
      get onRoad() { return roadTo > 0.5; },
      get road() { return roadK; },
      get stage() { return uTo != null ? uTo : uc; },
      get sel() { return sel; }, set sel(k) { sel = k; },
      // Turn to a view: the nearer way round, or at once with reduced motion (or when asked).
      go(view, instant) {
        if (view === 'build' && api.locked) { api.nudge(1); return; }
        const want = view === 'build' ? 180 : 0, k = Math.round((yaw - want) / 360);
        let tg = want + 360 * k;
        if (Math.abs(tg - yaw) > 180) tg += tg > yaw ? -360 : 360;
        target = tg; vel = 0;
        if (instant || reduce()) { yaw = target; rest = 1; }
      },
      // The other view, turning the way the arrow points.
      turn(dir) {
        if (roadTo > 0.5) return;
        if (api.locked) { api.nudge(dir); return; }
        target = nearest(target == null ? yaw : target) + 180 * dir; vel = 0;
        if (reduce()) { yaw = target; rest = 1; }
      },
      // A little turn that eases back: the camera can't go there yet.
      nudge(dir) { if (reduce()) return; yaw = nearest(yaw) + 9 * (dir || 1); target = nearest(yaw); rest = 0; },
      // Fly from the fire up the road to stage k (turning back to the party first, if need be); home again; along the
      // road to stage k. With reduced motion each is a cut.
      toRoad(k = 0, instant) {
        if (Math.abs(((yaw % 360) + 360) % 360) > 1) api.go('party', instant);
        k = clamp(Math.round(k), 0, last1());
        roadTo = 1; uc = k; uTo = null; uVel = 0; sel = k;
        if (instant || reduce()) { roadK = 1; rest = 1; }
        snap(k);
      },
      toCamp(instant) {
        if (pullK > 0) { roadK = unease(ease(roadK) * (1 - pullK)); pullK = 0; }
        roadTo = 0; uVel = 0; uTo = null; sel = null;
        if (instant || reduce()) { roadK = 0; uc = 0; rest = 1; }
        snap(null);
      },
      panTo(k) {
        k = clamp(Math.round(k), 0, last1());
        uTo = k; uVel = 0; sel = k;
        if (reduce()) { uc = k; uTo = null; }
        snap(k);
      },
      // One stage along (the mouse wheel, the arrow keys); back from the first stage, home.
      step(dir) { const k = Math.round(api.stage) + dir; if (k < 0) api.toCamp(); else api.panTo(k); },
      dragStart(px, py = 0) {
        dragging = true; lastX = px; lastY = py; lastT = performance.now(); vel = 0; uVel = 0; raw = 0; moved = 0;
        onRoad = roadTo > 0.5;
        if (onRoad) return;
        y0 = nearest(target == null ? yaw : target); target = null;
      },
      dragMove(px, py = 0) {
        if (!dragging) return;
        const dx = px - lastX, dy = py - lastY, now = performance.now();
        lastX = px; lastY = py;
        if (onRoad) {
          raw += dy; moved = Math.max(moved, Math.abs(raw));
          if (moved > 6) { const du = dy / PX_PER_STAGE; uc = clamp(uc + du, UMIN, last1() + UOVER); uVel = du / Math.max(8, now - lastT) * 16; uTo = null; }
          lastT = now;
          return;
        }
        raw += dx; moved = Math.max(moved, Math.abs(raw));
        if (reduce()) return;
        if (api.locked) { const L = 14, r = -raw / pxPerDeg(); yaw = y0 + Math.sign(r) * L * (1 - Math.exp(-Math.abs(r) / L)); lastT = now; return; }
        yaw -= dx / pxPerDeg(); vel = -dx / pxPerDeg() / Math.max(8, now - lastT) * 16; lastT = now;
      },
      dragEnd() {
        if (!dragging) return;
        dragging = false;
        if (onRoad) {
          // a pan settles on the nearest stage, carried on a little by a flick; pulled back past the first, it goes home.
          // A finger that stopped before letting go sends no more moves: its flick is over.
          if (performance.now() - lastT > 90) uVel = 0;
          if (moved > 6) { if (uc < -PULL_HOME) api.toCamp(); else api.panTo(uc + uVel * 6); }
          uVel = 0;
          return;
        }
        if (api.locked) { target = y0; return; }
        if (reduce()) { target = Math.abs(raw) > 40 ? nearest(yaw) + (raw < 0 ? 180 : -180) : nearest(yaw); yaw = target; rest = 1; return; }
        target = nearest(yaw, vel);
      },
      get dragDistance() { return moved; },
      get dragging() { return dragging; },
      get out() { return out; },
      // A hero hops when tapped.
      hop(j) { react[j] = performance.now(); },
      // What's drawn at a point on the canvas (canvas pixels): the nearest anchor whose box holds it, else the road. On
      // the road, the stage at that point (or the nearest one close by), and nothing else.
      hit(px, py) {
        if (!out) return null;
        const list = out.anchors;
        if (roadTo > 0.5) {
          let best = null, bd = 22;
          for (const a of list) {
            if (a.stage == null || !a.box) continue;
            const b = a.box, inside = px >= b[0] - 4 && px <= b[2] + 4 && py >= b[1] - 4 && py <= b[3] + 4;
            const d = inside ? 0 : Math.hypot(a.x - px, (a.y + a.top) / 2 - py);
            if (d < bd || (d === bd && best && a.d < best.d)) { bd = d; best = a; }
          }
          return best ? { id: 'stage', stage: best.stage } : null;
        }
        for (let i = list.length - 1; i >= 0; i--) {
          const a = list[i], b = a.box, op = opacityOf(a, out.cam.w);
          if (b && op > 0.5 && px >= b[0] && px <= b[2] && py >= b[1] && py <= b[3] && !/^stage/.test(a.id)) return a;
        }
        for (const a of list) { const b = a.box; if (/^stage/.test(a.id) && out.cam.w < 0.5 && b && px >= b[0] - 3 && px <= b[2] + 3 && py >= b[1] - 3 && py <= b[3] + 3) return { id: 'road', stage: +a.id.slice(5) }; }
        return api.hitRoad(px, py) ? { id: 'road' } : null;
      },
      hitRoad(px, py) {
        const cam = out && out.cam.road < 0.02 ? out.cam : camera(IW, yaw, rest), A = sidesAt(ROAD_W / 2 + 3), q = new Array(8);
        let prev = null;
        for (let i = 0; i < EDGES.length; i++) {
          const j = i * 6;
          if (!cam.p(A[j], A[j + 1], A[j + 2])) { prev = null; continue; }
          const ax = cam.px, ay = cam.py;
          if (!cam.p(A[j + 3], A[j + 4], A[j + 5])) { prev = null; continue; }
          const cur = [ax, ay, cam.px, cam.py];
          if (prev) { q[0] = prev[0]; q[1] = prev[1]; q[2] = prev[2]; q[3] = prev[3]; q[4] = cur[2]; q[5] = cur[3]; q[6] = cur[0]; q[7] = cur[1]; if (inQuad(px, py, q)) return true; }
          prev = cur;
        }
        return false;
      },
      // the last frames' drawing times (ms), and how many frames it has drawn, for tools/camp_perf.py
      get times() { return times.slice(); },
      get drawn() { return count; },
      stop() { alive = false; },
      redraw() { cache = null; },
    };
    // Draws the frame whole: while the camera moves, or once to fill the cache when it comes to rest.
    function full(cam, t, still) {
      const S = api.state, Wd = worldFor(IW), B = build(cam, Wd, S, reduce(), sel);
      drawGround(x, cam, Wd, S, t, still);
      for (const it of B.items) drawItem(x, it, t, react);
      drawSmoke(x, B.dyn, t);
      for (const f of B.over) f(x);
      x.globalCompositeOperation = 'lighter'; x.imageSmoothingEnabled = true;
      drawLights(x, B.lights, B.pools, B.glows);
      x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.imageSmoothingEnabled = false;
      drawLive(x, cam, B, t, Wd);
      return B;
    }
    // At rest: the sky, the ground and every billboard behind the party and the fire go into one picture, and the
    // still lights into another. Each frame then draws those two, the few things in front, and what flickers.
    function makeCache(cam, t) {
      const S = api.state, Wd = worldFor(IW), B = build(cam, Wd, S, reduce(), sel);
      const bg = document.createElement('canvas'); bg.width = IW; bg.height = IH;
      const bx = bg.getContext('2d');
      drawGround(bx, cam, Wd, S, t, true);
      const far = Math.max(...B.items.filter(it => it.dyn).map(it => it.d), -Infinity);
      const near = [];
      for (const it of B.items) { if (!it.dyn && it.d >= far) drawItem(bx, it, t, null); else near.push(it); }
      const lit = document.createElement('canvas'); lit.width = IW; lit.height = IH;
      const lx = lit.getContext('2d');
      lx.globalCompositeOperation = 'lighter'; lx.imageSmoothingEnabled = true;
      drawLights(lx, B.lights, B.pools, B.glows);
      return { key: key(), bg, lit, near, B, cam };
    }
    const key = () => `${IW}|${((Math.round(yaw) % 360) + 360) % 360}|${roadK.toFixed(3)}|${uc.toFixed(3)}|${sel}|${api.state.sig}`;
    const roadStill = () => roadK === roadTo && uTo == null && pullK === 0;
    let drawn = -1e9;
    function frame(t) {
      if (!alive) return;
      if (!canvas.isConnected) { alive = false; return; }
      // At rest only the fire, the lights and the fireflies move: thirty frames a second is plenty (and kinder to a phone).
      if (rest >= 1 && cache && !dragging && target === yaw && roadStill() && t - drawn < 30 && cache.key === key()) { requestAnimationFrame(frame); return; }
      drawn = t;
      const dt = Math.min(50, t - last || 16); last = t;
      size();
      if (!dragging && target != null) {
        const d = target - yaw;
        yaw += d * (1 - Math.pow(0.88, dt / 16.7));
        if (Math.abs(d) < 0.05) yaw = target;
      }
      // along the road, and the flight to it and back
      if (!dragging && uTo != null) { const d = uTo - uc; uc += d * (1 - Math.pow(0.84, dt / 16.7)); if (Math.abs(d) < 0.004) { uc = uTo; uTo = null; } }
      // pulled back past the first stage, the camera starts back toward the fire
      pullK = roadTo > 0.5 ? Math.min(0.6, Math.max(0, -uc) / 2.2) : 0;
      { const dk = roadTo - roadK; roadK = Math.abs(dk) < 0.002 ? roadTo : roadK + dk * (1 - Math.pow(0.93, dt / 16.7)); }
      if (roadK === 0 && roadTo === 0 && uc !== 0 && uTo == null) uc = 0;
      const settled = !dragging && target != null && Math.abs(target - yaw) < 0.05 && roadStill();
      rest = settled ? Math.min(1, rest + dt / 200) : 0;
      const t0 = performance.now();
      let B, cam;
      if (rest >= 1) {
        if (!cache || cache.key !== key()) { cache = makeCache(camNow(1), t); v++; }
        cam = cache.cam; B = cache.B;
        x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.imageSmoothingEnabled = false;
        x.drawImage(cache.bg, 0, 0);
        for (const it of cache.near) drawItem(x, it, t, react);
        drawSmoke(x, B.dyn, t);
        for (const f of B.over) f(x);
        x.globalCompositeOperation = 'lighter'; x.drawImage(cache.lit, 0, 0); x.globalCompositeOperation = 'source-over';
        drawLive(x, cam, B, t, worldFor(IW));
      } else {
        cache = null;
        cam = camNow(rest);
        B = full(cam, t, false);
        v++;
      }
      times.push(performance.now() - t0);
      if (times.length > 240) times.shift();
      count++;
      out = { cam, anchors: B.anchors, v, yaw, still: rest >= 1, K, road: cam.road, roadTo, stage: uc, sel };
      if (api.onFrame) api.onFrame(out);
      requestAnimationFrame(frame);
    }
    size();
    // the first frame now, so the screen never shows an empty canvas
    frame(performance.now());
    return api;
  }

  return { K, IH, VIEWS, weightOf, opacityOf, live, camera, worldFor, seated, stageZ, PX_PER_STAGE };
})();
