'use strict';
// Lantern Road mockups · the camp as views around the fire (play-test notes 1.18 and 1.19, 2026-11-04).
// A perspective camera orbits the fire. Each view is a camera preset; between them the camera turns, rises and pulls
// back smoothly. Everything is drawn with the game's own art (js/art.js, js/camp.js) plus a few new props, on a
// 422×195 canvas shown at 2×. Sprites are billboards: while the camera moves they scale smoothly; at rest their scale
// snaps to whole pixels.
const Camp3D = (() => {
  const IW = 422, IH = 195, K = 2, RAD = Math.PI / 180;
  // The views, by the direction the camera looks (yaw, from north, clockwise). The party view looks north, past the
  // fire and up the road; the buildings view looks south from higher and further back, over the fire to the plots.
  const VIEWS = {
    party: { yaw: 0, pitch: 20.6, dist: 120, f: 240, tx: 0, tz: 0, cy: 147 },
    build: { yaw: 180, pitch: 10.5, dist: 380, f: 380, tx: 0, tz: -120, cy: 119 },
  };
  const lerp = (a, b, k) => a + (b - a) * k;
  const ease = k => k * k * (3 - 2 * k);
  const weightOf = yaw => (1 - Math.cos(yaw * RAD)) / 2; // 0 in the party view, 1 in the buildings view

  // ── the world: the fire at the origin, north is +z, east is +x (world units are art pixels at scale 1)
  const SEATS = [[-31, 12], [31, 12], [-37, -6], [37, -6], [-29, -22], [29, -22]];
  const BOARD = [-56, -18], SIGN = [30, 62], WICK_POS = [-61, -41];
  const CAMP_POSTS = [[-62, 40], [62, 40], [-96, -50], [96, -50]];
  // Building plots, as the buildings view sees them (frame px), in the order they open: the middle row's centre three,
  // then outwards. Their places on the ground are worked out from the buildings view's camera.
  const PLOT_SCREEN = [[242, 240], [422, 232], [602, 240], [302, 198], [542, 198], [422, 194], [212, 298], [632, 298], [122, 246], [722, 246], [182, 202], [662, 202], [92, 302], [752, 302]];
  let PLOTS = null;

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
  const ROAD_W = 16, HILL0 = 205, HILL1 = 3000, GATE_Z = 3240;
  const groundY = (x, z) => { if (z <= HILL0) return 0; const zz = Math.min(z, HILL1); return 0.17 * (zz - HILL0) * (1 + 0.22 * Math.sin(x / 240 + zz / 700)); };
  // Region I's eighteen stages along the road; elites and the boss marked.
  const STAGE_Z = Array.from({ length: 18 }, (_, k) => 80 * Math.pow(35, Math.pow(k / 17, 0.85)));
  const STAGE_KIND = Array.from({ length: 18 }, (_, k) => (typeof STAGES !== 'undefined' && STAGES[k] ? STAGES[k].kind : 'road'));

  // Scenery: dead wood all round; graves along the road; a walled graveyard and a crypt south of the camp;
  // the camp's low wall, open to the road; tents, a cart and a woodpile; tufts of grass.
  let WALL_R = 260;
  const makeScenery = () => {
    const out = [];
    for (let i = 0; i < 140; i++) {
      const b = h2(i, 91) * 360, r = WALL_R + 150 + h2(i, 92) * 320, x = r * Math.sin(b * RAD), z = r * Math.cos(b * RAD);
      if (z > 0 && Math.abs(x - roadAt(z)) < 40) continue;
      out.push({ k: 'tree', x, z, v: h2(i, 93) });
    }
    for (let i = 0; i < 170; i++) {
      const z = 110 + Math.pow(h2(i, 101), 1.25) * 3000, side = h2(i, 102) > 0.5 ? 1 : -1, off = 22 + h2(i, 103) * (40 + z * 0.08);
      out.push({ k: ['grave', 'grave', 'cross', 'stone', 'skulls', 'grave', 'cross', 'deadtree'][Math.floor(h2(i, 104) * 8)], x: roadAt(z) + side * off, z, v: h2(i, 105) });
    }
    for (let row = 0; row < 4; row++) for (let c = 0; c < 11; c++) {
      if (h2(row * 11 + c, 111) < 0.18) continue;
      const b = 128 + c * 10 + (row % 2) * 5, r = WALL_R + 34 + row * 26;
      out.push({ k: h2(row * 11 + c, 112) > 0.35 ? 'grave' : 'cross', x: r * Math.sin(b * RAD), z: r * Math.cos(b * RAD), v: 0.5 });
    }
    for (let i = 0; i < 190; i++) {
      const z = 320 + h2(i, 141) * 2950, side = h2(i, 142) > 0.5 ? 1 : -1, x = roadAt(z) + side * (70 + h2(i, 143) * 300);
      out.push({ k: 'tree', x, z, v: h2(i, 144) });
    }
    for (let i = 0; i < 70; i++) {
      const z = GATE_Z + 60 + h2(i, 151) * 1300, side = h2(i, 152) > 0.5 ? 1 : -1, x = roadAt(z) + side * (24 + h2(i, 153) * 220);
      out.push({ k: ['pillar', 'broken', 'puddle', 'puddle', 'bellprop', 'stone'][Math.floor(h2(i, 154) * 6)], x, z, v: h2(i, 155), r2: true });
    }
    out.push({ k: 'crypt', x: (WALL_R + 120) * Math.sin(214 * RAD), z: (WALL_R + 120) * Math.cos(214 * RAD), v: 0 });
    out.push({ k: 'chapelS', x: (WALL_R + 150) * Math.sin(146 * RAD), z: (WALL_R + 150) * Math.cos(146 * RAD), v: 0 });
    for (let b = 58; b <= 302; b += 4.4) out.push({ k: 'wall', x: WALL_R * Math.sin(b * RAD), z: WALL_R * Math.cos(b * RAD), v: b });
    out.push({ k: 'tent', x: 84, z: 30, v: 0 }, { k: 'tent', x: 128, z: 96, v: 1 }, { k: 'tent', x: -118, z: 104, v: 1 }, { k: 'cart', x: 104, z: -22, v: 0 }, { k: 'crate', x: 64, z: -40, v: 0 });
    return out;
  };
  let SCENERY = null;
  const TUFTS = Array.from({ length: 420 }, (_, i) => { const a = h2(i, 121) * Math.PI * 2, r = 30 + Math.sqrt(h2(i, 122)) * 190; return [Math.cos(a) * r, Math.sin(a) * r, h2(i, 123)]; })
    .concat(Array.from({ length: 700 }, (_, i) => { const z = 200 + h2(i, 161) * 3100, side = h2(i, 162) > 0.5 ? 1 : -1; return [roadAt(z) + side * (12 + h2(i, 163) * 160), z, h2(i, 164)]; }));

  // ── art
  const BASE_PAL = REGION_ART[0].pc;
  const prop = k => sprite(PROPS[k].map, BASE_PAL, 'c3:' + k);
  const bart = k => sprite(BUILD_ART[k], BP, 'b:' + k);
  const ART = {
    wick: { map: ['.....kkkk......', '....kHHHhk.....', '...kHhhhhhk....', '...khhhkffk....', '...khhkfffk..m.', '...khhkFwwk.mYm', '..kchhkwwwWkmym', '..kcchkwwwWk.d.', '..kcCcckWkffkd.', '..kcCcccckk..d.', '..kcCccccck..d.', '..kcCccccck..d.', '...kcccccbb..d.', '..kSSSSSSbbb.d.', '..ksssssssk..d.', '..ksssssssk..d.', '...kkkkkkk..ddd'],
      pal: { k: '#0d0911', H: '#6a5a7e', h: '#463a58', f: '#eec4a0', F: '#c49070', w: '#f6efe0', W: '#bfb29a', c: '#2f2640', C: '#4a3d60', b: '#2e2219', s: '#4a3424', S: '#6b4a2e', d: '#6b4a2e', m: '#3a3c41', y: '#f4a646', Y: '#ffe9b0' } },
    logs: { map: ['.oo.oo.oo.', 'oOooOooOoo', 'ooOooOooOo', '.oo.oo.oo.'], pal: { o: '#4a3424', O: '#8a6a44' } },
    crate: { map: ['.kkk..kkkkkk', 'kwWwk.kwWwWk', 'kkkkk.kWkkWk', 'kwWwk.kwWwWk', 'kwWwk.kkkkkk', '.kkk........'], pal: { k: '#2e2219', w: '#5a4030', W: '#7a5a3a' } },
    tent: { map: ['.......k........', '......kck.......', '.....kcCck......', '....kccCCck.....', '...kcccCCCck....', '..kccckkkCCck...', '.kcccky.kCCCck..', 'kccckyYy.kCCCck.', 'kcckyYYyykCCCCck', 'dddddddddddddddd'], pal: { k: '#1a1218', c: '#7a6a52', C: '#5a4e3c', y: '#f4a646', Y: '#ffe2a0', d: '#2e2219' } },
    cart: { map: ['..kkkkkkkkkkk...', '..kwWwWwWwWwk...', '..kwwwwwwwwwk...', 'kkkkkkkkkkkkkkkk', '...kk.....kk....', '..kssk...kssk...', '..kssk...kssk...', '...kk.....kk....'], pal: { k: '#2a1c14', w: '#6b4a2e', W: '#8a6038', s: '#4a4c52' } },
    wall: { map: ['.ssS.sSs.Ss.', 'sSsssSssSssS', 'ssdssSsdssSs', 'dddddddddddd'], pal: { s: '#4a4c52', S: '#62656c', d: '#2a2a30' } },
    crypt: { map: ['........kk........', '.......kSSk.......', '......kSSSSk......', '.....kSSSSSSk.....', '....kkkkkkkkkk....', '....kSsSsSsSsk....', '....kSs.kk.sSk....', '....kSskddksSk....', '....kSskddksSk....', '....kSskddksSk....', '..kkkkkkkkkkkkkk..', '..kssssssssssssk..', 'kkkkkkkkkkkkkkkkkk'], pal: { k: '#18161c', S: '#6a6d74', s: '#4a4c52', d: '#0a080c' } },
    chapelS: { map: ['.....k.....', '....kSk....', '....kSk....', '...kSSSk...', '...kSySk...', '..kkkkkkk..', '..kSSSSSk..', '.kSSSSSSSk.', 'kSSkkSkkSSk', 'kSSkdSdkSSk', 'kSSkdSdkSSk', 'kkkkkkkkkkk'], pal: { k: '#18161c', S: '#55585e', y: '#f4a646', d: '#0a080c' } },
    skull: { map: ['.kkkkk.', 'kwwwwwk', 'kwkwkwk', 'kwwwwwk', '.kwkwk.'], pal: { k: '#1a0d10', w: '#c86a6a' } },
  };
  const art = k => sprite(ART[k].map, ART[k].pal, 'c3:' + k);
  // The far hills and the Sexton's chapel at the road's end, drawn on the sky's panorama.
  const CHAPEL = { map: ['.........k..........', '........kSk.........', '........kSk.........', '.......kSSSk........', '.......kSySk..k.....', '......kSSSSSk.kk....', '......kSSSSSkkSk....', '..kkkkkSSSSSkSSSk...', '..kSSSSSSSSSSSSSSk..', '.kSSSSSSSSSSSSSSSSk.', 'kSSkyykSSSSSkyykSSSk', 'kSSkyykSSSSSkyykSSSk', 'kSSSSSSSSSSSSSSSSSSk', 'kkkkkkkkkkkkkkkkkkkk'], pal: { k: '#06040a', S: '#0e0a14', y: '#7a4a24' } };
  const seatCache = new Map();
  function seated(cls) {
    if (seatCache.has(cls)) return seatCache.get(cls);
    const full = heroSide(cls, 0, [Items.starter(cls, 1).id, null, null]), cut = 2;
    const cv = document.createElement('canvas'); cv.width = full.width; cv.height = full.height - cut;
    cv.getContext('2d').drawImage(full, 0, 0, full.width, full.height - cut, 0, 0, full.width, full.height - cut);
    cv.ax = full.ax; seatCache.set(cls, cv); return cv;
  }
  const lights = k => { const L = []; BUILD_ART[k].forEach((r, y) => [...r].forEach((ch, x) => { if (ch === 'Y') L.push([x, y, 'y']); else if (ch === 'V') L.push([x, y, 'v']); })); return L; };
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

  // ── the camera
  // The orbit's parameters for a yaw; the road view's for a place along the road; and a blend of two.
  function orbitParams(yaw) { const w = ease(weightOf(yaw)), P = VIEWS.party, B = VIEWS.build, v = { yaw, w, road: 0, ty: 0 }; for (const k of ['pitch', 'dist', 'f', 'tx', 'tz', 'cy']) v[k] = lerp(P[k], B[k], w); return v; }
  const ROADCAM = { pitch: 34, dist: 330, f: 280, cy: 118 };
  const smoothX = z => { let sum = 0, n = 0; for (let d = -420; d <= 420; d += 70) { sum += roadAt(Math.max(30, z + d)); n++; } return sum / n; };
  function roadParams(zc) { const tx = smoothX(zc); return { yaw: 0, w: 0, road: 1, pitch: ROADCAM.pitch, dist: ROADCAM.dist, f: ROADCAM.f, cy: ROADCAM.cy, tx, tz: zc, ty: groundY(tx, zc) }; }
  function blendParams(a, b, k) { const out = {}; for (const key of Object.keys(a)) out[key] = key === 'yaw' ? a.yaw + ((((b.yaw - a.yaw) % 360) + 540) % 360 - 180) * k : lerp(a[key], b[key], k); return out; }
  function camera(yaw, restness = 1) { return makeCam(typeof yaw === 'number' ? orbitParams(yaw) : yaw, restness); }
  function makeCam(v, restness = 1) {
    const yaw = v.yaw, w = v.w;
    const th = yaw * RAD, ph = v.pitch * RAD, cp = Math.cos(ph), sp = Math.sin(ph), st = Math.sin(th), ct = Math.cos(th);
    const F = [cp * st, -sp, cp * ct], R = [ct, 0, -st], U = [sp * st, cp, sp * ct];
    const C = [v.tx - v.dist * F[0], (v.ty || 0) - v.dist * F[1], v.tz - v.dist * F[2]];
    const cx = IW / 2;
    return {
      w, yaw, v, restness, road: v.road || 0,
      horizon: v.cy - v.f * Math.tan(ph),
      proj(x, y, z) {
        const rx = x - C[0], ry = y - C[1], rz = z - C[2], d = rx * F[0] + ry * F[1] + rz * F[2];
        if (d < 6) return null;
        return { x: cx + v.f * (rx * R[0] + rz * R[2]) / d, y: v.cy - v.f * (rx * U[0] + ry * U[1] + rz * U[2]) / d, s: v.f / d, d };
      },
      unproj(sx, sy) {
        const a = (sx - cx) / v.f, b = -(sy - v.cy) / v.f, dir = [F[0] + a * R[0] + b * U[0], F[1] + a * R[1] + b * U[1], F[2] + a * R[2] + b * U[2]], k = -C[1] / dir[1];
        return [C[0] + k * dir[0], C[2] + k * dir[2]];
      },
      // A billboard's scale: smooth while moving, whole pixels at rest (small, far things keep theirs)
      scale(s) { if (s < 0.9) return s; const snap = s < 1.7 ? 1 : Math.round(s); return lerp(s, snap, restness); },
      bearing(sx) { return (yaw + Math.atan((sx - cx) / v.f) / RAD + 360) % 360; },
      screenOfBearing(b) { const a = ((b - yaw + 540) % 360) - 180; if (Math.abs(a) > 75) return null; return cx + Math.tan(a * RAD) * v.f; },
    };
  }

  // ── drawing helpers
  function glow(x, gx, gy, r, rgba) { if (r <= 0.5) return; const g = x.createRadialGradient(gx, gy, 0, gx, gy, r); g.addColorStop(0, rgba); g.addColorStop(1, rgba.replace(/[\d.]+\)$/, '0)')); x.fillStyle = g; x.fillRect(gx - r, gy - r, r * 2, r * 2); }
  function pool(x, gx, gy, r, sq, rgba) { x.save(); x.translate(gx, gy); x.scale(1, sq); glow(x, 0, 0, r, rgba); x.restore(); }
  function blit(x, img, dx, dy, s, flip) {
    const w = img.width * s, hh = img.height * s;
    if (flip) { x.save(); x.translate(Math.round(dx) * 2 + Math.round(w), 0); x.scale(-1, 1); x.drawImage(img, Math.round(dx), Math.round(dy), Math.round(w), Math.round(hh)); x.restore(); }
    else x.drawImage(img, Math.round(dx), Math.round(dy), Math.round(w), Math.round(hh));
  }
  function poly(x, pts, col) { x.fillStyle = col; x.beginPath(); pts.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.closePath(); x.fill(); }
  function ringPts(cam, r) { const pts = []; for (let i = 0; i < 72; i++) { const a = (i / 72) * Math.PI * 2, p = cam.proj(Math.cos(a) * r, 0, Math.sin(a) * r); if (!p) return null; pts.push([p.x, p.y]); } return pts; }
  const nearFade = d => Math.max(0, Math.min(1, (d - 80) / 50));
  const hillH = (b, k) => { const r = b * RAD; return k * (6 + 4 * Math.sin(r * 3 + 1) + 3 * Math.sin(r * 7 + 2) + 2 * Math.sin(r * 13)); };

  function draw(x, S, yaw, t, restness) {
    const camIn = yaw;
    if (!PLOTS) { const bc = camera(VIEWS.build.yaw); PLOTS = PLOT_SCREEN.map(([px, py]) => bc.unproj(px / K, py / K)); WALL_R = Math.max(...PLOTS.map(([a, b]) => Math.hypot(a, b))) + 40; SCENERY = makeScenery(); }
    const cam = camera(camIn, restness), anchors = [], hz = cam.horizon, R = cam.road, roadPts = [];
    yaw = cam.yaw;
    x.imageSmoothingEnabled = false;
    // the sky, the moon, the far hills and the Sexton's chapel on the panorama
    const g = x.createLinearGradient(0, Math.min(hz, 0) - 60, 0, Math.max(hz, 0) + 4); g.addColorStop(0, '#05030a'); g.addColorStop(0.55, '#110b1a'); g.addColorStop(1, '#2e2040');
    x.fillStyle = g; x.fillRect(0, 0, IW, IH);
    if (hz > 0) {
      for (let i = 0; i < 220; i++) {
        const b = h2(i, 7) * 360, sx = cam.screenOfBearing(b); if (sx == null || sx < 0 || sx >= IW) continue;
        const sy = h2(i, 8) * (hz - 10), lum = h2(i, 9);
        x.fillStyle = lum > 0.88 ? (lum > 0.95 && Math.sin(t / 650 + i * 3) > 0.4 ? '#fff8e0' : '#d8ccb4') : lum > 0.6 ? '#5a4e6c' : '#2c2438';
        x.fillRect(Math.round(sx), Math.round(sy), 1, 1);
      }
      const mx = cam.screenOfBearing(34);
      if (mx != null) { const my = Math.max(10, hz - 40); glow(x, mx, my, 26, 'rgba(232,220,196,.12)'); x.fillStyle = '#efe3c8'; x.beginPath(); x.arc(mx, my, 6, 0, 7); x.fill(); x.fillStyle = '#0f0a17'; x.beginPath(); x.arc(mx + 2.5, my - 1.5, 6, 0, 7); x.fill(); }
      for (const [k, col, rim] of [[1.4, '#171121', '#3a2e4c'], [0.8, '#100c16', '#241c30']]) {
        for (let sx = 0; sx < IW; sx++) { const hh = hillH(cam.bearing(sx) + k * 40, k); x.fillStyle = col; x.fillRect(sx, Math.round(hz - hh), 1, Math.ceil(hh) + 2); if (rim) { x.fillStyle = rim; x.fillRect(sx, Math.round(hz - hh), 1, 1); } }
      }
      const tw = cam.screenOfBearing(204);
      if (tw != null) { const hh = hillH(204 + 56, 1.4), T = sprite(['..k.k..', '..kkk..', '.kSSSk.', '.kSySk.', '.kSSSk.', '.kSSSk.', 'kSSSSSk', 'kSSySSk', 'kSSSSSk', 'kSSSSSk', 'kkkkkkk'], { k: '#06040a', S: '#0f0b15', y: '#6a4224' }, 'c3:tower'); x.drawImage(T, Math.round(tw - 3), Math.round(hz - hh - T.height + 2), 7, 11); }
      const mist = x.createLinearGradient(0, hz - 10, 0, hz + 14); mist.addColorStop(0, 'rgba(70,58,100,0)'); mist.addColorStop(0.5, 'rgba(80,66,110,.28)'); mist.addColorStop(1, 'rgba(70,58,100,0)');
      x.fillStyle = mist; x.fillRect(0, hz - 10, IW, 24);
    }
    x.fillStyle = '#0e0b12'; x.fillRect(0, Math.max(0, Math.round(hz)), IW, IH);
    // the ground: the clearing, tufts of grass, the plots' pads and paths
    for (const [r, c] of [[WALL_R + 60, '#0f0b14'], [WALL_R, '#120e17'], [150, '#15111a'], [112, '#18131d'], [84, '#1c1620'], [56, '#201924'], [26, '#281e24']]) { const pts = ringPts(cam, r); if (pts) poly(x, pts, c); }
    for (let z1 = 5200; z1 > HILL0;) {
      const z0 = Math.max(HILL0, z1 / 1.07), top = [], bot = [];
      let dSum = 0, dN = 0;
      for (let hx = -1800; hx <= 1800; hx += 90) { const a = cam.proj(hx, groundY(hx, z1), z1), b = cam.proj(hx, groundY(hx, z0), z0); if (a && b) { top.push([a.x, a.y]); bot.push([b.x, b.y]); if (Math.abs(hx) < 400) { dSum += a.d; dN++; } } }
      if (top.length > 2) { const q = Math.max(0, Math.min(1, ((dN ? dSum / dN : 3000) - 260) / 2400)) * (0.35 + 0.65 * Math.min(1, (Math.min(z1, HILL1) - HILL0) / 2600)); poly(x, [...top, ...bot.reverse()], 'rgb(' + Math.round(27 + q * 13 - R * 2) + ',' + Math.round(26 + q * 5 + R * 4) + ',' + Math.round(26 + q * 22 - R * 3) + ')'); if (z1 > 2900 && z1 < 3200) { x.fillStyle = '#3a2f4a'; for (const [px, py] of top) x.fillRect(Math.round(px) - 4, Math.round(py), 9, 1); } }
      z1 = z0;
      if (z0 <= HILL0) break;
    }
    for (const [tx, tz, k] of TUFTS) { const p = cam.proj(tx, groundY(tx, tz), tz); if (!p || p.y < hz) continue; const s = Math.max(1, Math.round(p.s)); x.fillStyle = k > 0.66 ? '#26301f' : k > 0.33 ? '#1f2719' : '#2a2026'; x.fillRect(Math.round(p.x), Math.round(p.y), s * (k > 0.5 ? 2 : 1), s); if (k > 0.8) x.fillRect(Math.round(p.x) + s, Math.round(p.y) - s, s, s); }
    S.plots.forEach((pl, i) => {
      if (!pl) return;
      const [wx, wz] = PLOTS[i], len = Math.hypot(wx, wz), ux = wx / len, uz = wz / len, c = cam.proj(wx, 0, wz);
      x.globalAlpha = c ? nearFade(c.d) : 0;
      const pts = [[-2.5, 30], [2.5, 30], [2.5, len - 10], [-2.5, len - 10]].map(([o, r]) => cam.proj(ux * r - uz * o, 0, uz * r + ux * o));
      if (pts.every(Boolean)) poly(x, pts.map(q => [q.x, q.y]), '#241c26');
      const pad = [[-15, -9], [15, -9], [15, 9], [-15, 9]].map(([a, b]) => cam.proj(wx + a, 0, wz + b));
      if (pad.every(Boolean)) poly(x, pad.map(q => [q.x, q.y]), pl.empty ? '#211a26' : '#2e2329');
      x.globalAlpha = 1;
    });
    // the road, far to near: a dark verge, the dark road, and the lit stretch as far as your light reaches
    const lit = S.lit || 0, litZ = lit > 0 ? STAGE_Z[Math.min(lit, 17)] : 40;
    const edges = ROAD.map(([rx, rz], i) => {
      const [ax, az] = ROAD[Math.max(0, i - 1)], [bx, bz] = ROAD[Math.min(ROAD.length - 1, i + 1)], dx = bx - ax, dz = bz - az, n = Math.hypot(dx, dz) || 1;
      return { rx, rz, nx: -dz / n, nz: dx / n };
    });
    const quad = (e0, e1, half, col) => {
      const P3 = (px, pz) => cam.proj(px, groundY(px, pz) + 0.5, pz);
      const a = P3(e0.rx - e0.nx * half, e0.rz - e0.nz * half), b = P3(e0.rx + e0.nx * half, e0.rz + e0.nz * half), c = P3(e1.rx + e1.nx * half, e1.rz + e1.nz * half), d = P3(e1.rx - e1.nx * half, e1.rz - e1.nz * half);
      if (!a || !b || !c || !d) return; poly(x, [[a.x, a.y], [b.x, b.y], [c.x, c.y], [d.x, d.y]], col);
    };
    for (let i = 0; i < edges.length; i += 3) { const e = edges[i], q = cam.proj(e.rx, groundY(e.rx, e.rz), e.rz); if (q && q.y > 0 && q.y < IH) roadPts.push([q.x * K, q.y * K, e.rz]); }
    for (let i = edges.length - 2; i >= 0; i--) {
      const e0 = edges[i], e1 = edges[i + 1], on = e1.rz <= litZ;
      quad(e0, e1, ROAD_W / 2 + 3, '#0b0810');
      quad(e0, e1, ROAD_W / 2, on ? '#6a4628' : '#2a1f26');
      if (on) quad(e0, e1, ROAD_W * 0.18, '#a8743e');
    }
    // billboards, far to near
    const L = [], P = [], items = [];
    const add = (wx, wz, fn) => { const p = cam.proj(wx, groundY(wx, wz), wz); if (p) items.push({ p, fn }); };
    const northA = Math.max(0, 1 - 1.8 * cam.w);
    const addN = (wx, wz, fn) => add(wx, wz, p => { if (northA <= 0.01) return; x.globalAlpha = northA; fn(p); x.globalAlpha = 1; });
    const tree = tinted(prop('deadtree'), '#0b0812'), tree2 = tinted(prop('deadtree'), '#130e1a');
    for (const sc of SCENERY) {
      if (sc.k === 'tree') { add(sc.x, sc.z, p => { const s = p.s * (1.3 + sc.v * 0.9), bx = p.x - tree.width * s / 2, by = p.y - tree.height * s, fog = Math.max(0, Math.min(1, (p.d - 160) / 700)); if (fog < 1) { blit(x, prop('deadtree'), bx, by, s); x.globalAlpha = fog; } blit(x, sc.v > 0.5 ? tree : tree2, bx, by, s); x.globalAlpha = 1; }); continue; }
      (['tent', 'cart', 'logs', 'crate'].includes(sc.k) && sc.z > 0 ? addN : add)(sc.x, sc.z, p => {
        const img = sc.r2 ? sprite(PROPS[sc.k].map, REGION_ART[1].pc, 'c3r2:' + sc.k) : PROPS[sc.k] ? prop(sc.k) : art(sc.k), s = ['tent', 'cart', 'logs', 'crate'].includes(sc.k) ? cam.scale(p.s) : p.s;
        const far = Math.max(0, Math.min(0.75, (p.d - 260) / 900));
        blit(x, img, p.x - img.width * s / 2, p.y - img.height * s + s, s);
        if (far > 0.02) { x.globalAlpha = far; blit(x, tinted(img, '#0b0812'), p.x - img.width * s / 2, p.y - img.height * s + s, s); x.globalAlpha = 1; }
        if (sc.k === 'tent') L.push([p.x - 2 * s, p.y - 3 * s, 6 * s, 'rgba(255,190,100,.4)']);
        if (sc.k === 'chapelS') L.push([p.x, p.y - 7 * s, 4 * s, 'rgba(255,190,100,.4)']);
      });
    }
    { const ez = 3050, ex = roadAt(2900) + 30; add(ex, ez, p => { const c = sprite(CHAPEL.map, { k: '#08060c', S: '#130e1b', y: '#c8783a' }, 'c3:chapel2'), s = Math.max(2, Math.round(p.s * 3.2)); glow(x, p.x, p.y - c.height * s * 0.5, c.width * s * 0.8, 'rgba(120,100,160,.14)'); blit(x, c, p.x - c.width * s / 2, p.y - c.height * s + s, s); L.push([p.x - 5.5 * s, p.y - 2.5 * s, 4 * s, 'rgba(244,140,60,.45)']); L.push([p.x + 5.5 * s, p.y - 2.5 * s, 4 * s, 'rgba(244,140,60,.45)']); }); }
    { const gx = roadAt(GATE_Z), gz = GATE_Z;
      for (const sd of [-1, 1]) add(gx + sd * (ROAD_W / 2 + 4), gz, p => { const img = prop('pillar'), sc = cam.scale(p.s * 1.4); blit(x, tinted(img, '#1e1a26'), p.x - img.width * sc / 2, p.y - img.height * sc + sc, sc); });
      add(gx, gz + 1, p => { const sc = Math.max(1, p.s * 1.4); anchors.push({ id: 'gate', x: p.x * K, y: p.y * K, top: (p.y - 14 * sc) * K, s: p.s, view: 'road' }); }); }
    STAGE_Z.forEach((z, k) => {
      const wx = roadAt(z), side = k % 2 ? 1 : -1;
      // what waits at a stage you haven't lit: its foes, as silhouettes across the road from the lantern
      if (R > 0.02 && k >= lit) {
        const foes = (typeof STAGES !== 'undefined' && STAGES[k] ? STAGES[k].foes.filter(Boolean) : []).filter(f => typeof FOE_ART === 'undefined' || FOE_ART[f]), boss = STAGE_KIND[k] === 'boss';
        foes.slice(0, boss ? 1 : 3).forEach((f, j) => {
          const fx = wx - side * (ROAD_W / 2 + 10 + j * 9), fz = z + 6 - j * 7;
          add(fx, fz, p => {
            const img = foeSprite(f), sc = cam.scale(p.s * (boss ? 1.7 : 1.05)), dim = Math.min(1, R * 1.3);
            const bx2 = p.x - img.width * sc / 2, by2 = p.y - img.height * sc + sc, o = Math.max(1, Math.round(sc * 0.6));
            x.globalAlpha = 0.9 * dim; blit(x, tinted(img, '#4a3e62'), bx2 - o, by2 - o, sc, side > 0); blit(x, tinted(img, '#07050b'), bx2, by2, sc, side > 0); x.globalAlpha = 1;
            if (k === lit || boss) { const ex = p.x + (side > 0 ? -1 : 1) * img.width * sc * 0.18, ey = p.y - img.height * sc * 0.72; x.fillStyle = boss ? '#ff5a4a' : '#d4484a'; x.globalAlpha = dim * (0.6 + 0.4 * Math.sin(t / 240 + k)); x.fillRect(Math.round(ex), Math.round(ey), Math.max(1, Math.round(sc)), Math.max(1, Math.round(sc))); x.globalAlpha = 1; }
          });
        });
      }
      // the party, waiting at the frontier for the word to set out
      if (R > 0.02 && k === lit) (S.heroes || []).slice(0, 4).forEach((cls, j) => {
        const hx = wx + side * (ROAD_W / 2 + 6) + (j % 2) * 8 * side, hz2 = z - 26 - Math.floor(j / 2) * 10;
        add(hx, hz2, p => { const sp = heroSprite(cls, Math.floor(t / 300 + j) % 2, [Items.starter(cls, 1).id, null, null]), sc = cam.scale(p.s * 1.05); x.globalAlpha = Math.min(1, R * 1.3); blit(x, sp, p.x - sp.width * sc / 2, p.y - sp.height * sc + sc, sc); x.globalAlpha = 1; });
      });
      add(wx, z, p => {
        const s = Math.max(0.35, p.s) * (1 + 0.5 * R), on = k < lit, front = k === lit, kind = STAGE_KIND[k];
        if (R > 0.02 && S.sel === k) { const rr = (12 + 3 * Math.sin(t / 200)) * Math.max(0.35, p.s); x.strokeStyle = 'rgba(255,214,140,' + (0.85 * R).toFixed(2) + ')'; x.lineWidth = Math.max(1, Math.round(p.s)); x.beginPath(); x.ellipse(p.x, p.y, rr * 1.7, rr * 0.6, 0, 0, Math.PI * 2); x.stroke(); }
        if (kind === 'boss') { const img = art('skull'), sk = Math.max(1, Math.round(s * 1.2)); blit(x, img, p.x - 3.5 * sk, p.y - 6 * sk, sk); anchors.push({ id: 'stage' + k, x: p.x * K, y: p.y * K, top: (p.y - 6 * sk) * K, s: p.s, view: 'road', stage: k, kind, on, front }); return; }
        if (kind === 'elite') {
          const r = Math.max(1.5, 3.4 * s); x.fillStyle = '#0d0911'; x.beginPath(); x.moveTo(p.x, p.y - 2 * r - 1); x.lineTo(p.x + r + 1, p.y - r); x.lineTo(p.x, p.y + 1); x.lineTo(p.x - r - 1, p.y - r); x.closePath(); x.fill();
          x.fillStyle = on ? '#d4484a' : front ? '#e06a5a' : '#4a2a32'; x.beginPath(); x.moveTo(p.x, p.y - 2 * r); x.lineTo(p.x + r, p.y - r); x.lineTo(p.x, p.y); x.lineTo(p.x - r, p.y - r); x.closePath(); x.fill();
        } else if (R > 0.5) {
          const img = prop('post'), sc = cam.scale(p.s * 1.25), img2 = on ? img : front ? tinted(img, '#5a4632') : tinted(img, '#241e2a'), top = p.y - img.height * sc + sc;
          blit(x, img2, p.x - 2.5 * sc, top, sc);
          if (front) { x.fillStyle = `rgba(255,190,100,${(0.45 + 0.35 * Math.sin(t / 90) * Math.sin(t / 37)).toFixed(3)})`; x.fillRect(Math.round(p.x - 0.5 * sc), Math.round(top + 2 * sc), Math.max(1, Math.round(sc)), Math.max(1, Math.round(sc))); }
          if (on) { L.push([p.x, top + 2.5 * sc, 4 + 10 * sc, 'rgba(255,190,100,.5)']); P.push([p.x, p.y, 6 + 16 * sc]); }
          anchors.push({ id: 'stage' + k, x: p.x * K, y: p.y * K, top: top * K, s: p.s, view: 'road', stage: k, kind, on, front });
          return;
        } else {
          const bw = Math.max(1, Math.round(3 * s)), bh = Math.max(2, Math.round(4 * s)), top = p.y - bh - Math.round(3 * s);
          x.fillStyle = '#0d0911'; x.fillRect(Math.round(p.x - bw / 2) - 1, Math.round(top) - 1, bw + 2, bh + 2);
          x.fillStyle = on ? '#f4a646' : front ? '#ffe2a0' : '#2a2430'; x.fillRect(Math.round(p.x - bw / 2), Math.round(top), bw, bh);
          x.fillStyle = '#3a3044'; x.fillRect(Math.round(p.x), Math.round(top + bh), Math.max(1, Math.round(s / 2)), Math.max(1, Math.round(3 * s)));
        }
        if (on) { L.push([p.x, p.y - 4 * s, 3 + 7 * s, 'rgba(244,166,70,.32)']); P.push([p.x, p.y, 4 + 12 * s]); }
        if (front) L.push([p.x, p.y - 4 * s, 4 + 10 * s, `rgba(255,214,140,${(0.28 + 0.14 * Math.sin(t / 160)).toFixed(3)})`]);
        anchors.push({ id: 'stage' + k, x: p.x * K, y: p.y * K, top: (p.y - 9 * s) * K, s: p.s, view: 'road', stage: k, kind, on, front });
      });
    });
    S.plots.forEach((pl, i) => {
      if (!pl) return;
      const [wx, wz] = PLOTS[i];
      add(wx, wz, p => {
        const fade = nearFade(p.d); if (fade <= 0) return;
        const a = pl.empty ? 'plot' : pl.art, img = bart(a), s = cam.scale(p.s), bx = p.x - img.width * s / 2, by = p.y - img.height * s;
        x.globalAlpha = fade * 0.5; x.fillStyle = '#050308'; x.fillRect(Math.round(p.x - img.width * s / 2), Math.round(p.y), Math.round(img.width * s), Math.max(1, Math.round(s))); x.globalAlpha = fade;
        if (S.focus === 'plot' + i) { const o = tinted(img, '#f4a646'); for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) blit(x, o, bx + ox, by + oy, s); }
        blit(x, img, bx, by, s);
        x.globalAlpha = 1;
        if (!pl.empty && fade > 0.5) for (const [lx, ly, kind] of lights(a)) L.push([bx + (lx + 0.5) * s, by + (ly + 0.5) * s, 4 * s, kind === 'v' ? 'rgba(190,140,255,.5)' : 'rgba(255,200,110,.5)']);
        anchors.push({ id: 'plot' + i, x: p.x * K, y: p.y * K, top: by * K, d: p.d, name: pl.empty ? 'Empty plot' : NAMES[a], empty: !!pl.empty, chip: pl.chip, view: 'build' });
      });
    });
    addN(BOARD[0], BOARD[1], p => {
      const img = bart('board'), s = cam.scale(p.s), bx = p.x - img.width * s / 2, by = p.y - img.height * s;
      if (S.focus === 'board') { const o = tinted(img, '#f4a646'); for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) blit(x, o, bx + ox, by + oy, s); }
      blit(x, img, bx, by, s); L.push([bx + 10.5 * s, by + 14.5 * s, 6 * s, 'rgba(255,200,110,.6)']);
      anchors.push({ id: 'board', x: p.x * K, y: p.y * K, top: by * K, d: p.d, name: 'Recruit Board', chip: S.boardChip, view: 'party' });
    });
    addN(SIGN[0], SIGN[1], p => {
      const img = bart('road'), s = cam.scale(p.s), bx = p.x - 8 * s, by = p.y - img.height * s;
      blit(x, img, bx, by, s); x.fillStyle = '#f4a646'; x.fillRect(Math.round(bx + s), Math.round(by - 2 * s), Math.round(3 * s), Math.round(3 * s)); L.push([bx + 2.5 * s, by - 0.5 * s, 8 * s, 'rgba(255,190,100,.5)']);
    });
    for (const [wx, wz] of CAMP_POSTS) (wz > 0 ? addN : add)(wx, wz, p => { const img = prop('post'), s = cam.scale(p.s); blit(x, img, p.x - 2.5 * s, p.y - img.height * s + s, s); L.push([p.x, p.y - img.height * s + 3.5 * s, 9 * s, 'rgba(255,190,100,.45)']); });
    const fireP = cam.proj(0, 0, 0);
    (S.heroes || []).forEach((cls, j) => {
      const [wx, wz] = SEATS[j];
      add(wx, wz, p => {
        const sp = seated(cls), s = cam.scale(p.s), flip = fireP && p.x > fireP.x;
        x.fillStyle = '#4a3424'; x.fillRect(Math.round(p.x - 6 * s), Math.round(p.y - s), Math.round(12 * s), Math.round(2 * s));
        const breathe = Math.sin(t / 620 + j * 1.7) > 0.75 ? Math.max(1, Math.round(s / 2)) : 0;
        blit(x, sp, p.x - sp.ax * s, p.y - sp.height * s + s - breathe, s, flip);
        anchors.push({ id: 'hero' + j, x: p.x * K, y: p.y * K, top: (p.y - sp.height * s) * K, view: 'party' });
      });
    });
    if (S.wick) addN(WICK_POS[0], WICK_POS[1], p => {
      const img = art('wick'), s = Math.min(cam.scale(p.s), 2), bx = p.x - 6 * s, by = p.y - img.height * s + s;
      blit(x, img, bx, by, s); L.push([bx + 13.5 * s, by + 6.5 * s, 11 * s, `rgba(255,190,100,${(0.55 + Math.sin(t / 170) * 0.08).toFixed(3)})`]);
      anchors.push({ id: 'wick', x: p.x * K, y: p.y * K, top: by * K, view: 'both' });
    });
    if (fireP) items.push({ p: fireP, fn: p => { const img = paintFire(t, S.fireLow ? 0.7 : 1), s = cam.scale(p.s); blit(x, img, p.x - 13 * s, p.y - 27 * s, s); anchors.push({ id: 'fire', x: p.x * K, y: p.y * K, top: (p.y - 27 * s) * K, view: 'both' }); } });
    items.sort((a, b) => b.p.d - a.p.d);
    for (const it of items) it.fn(it.p);
    // beyond your light: the road ahead lies in the dark
    const fz = cam.proj(roadAt(litZ), groundY(roadAt(litZ), litZ), litZ);
    if (fz && cam.w < 0.5 && fz.y > hz && R < 0.5) { const dg = x.createLinearGradient(0, fz.y + 4, 0, Math.max(hz - 20, fz.y - 60)); dg.addColorStop(0, 'rgba(7,5,11,0)'); dg.addColorStop(1, `rgba(7,5,11,${(0.5 * (1 - 2 * cam.w)).toFixed(3)})`); x.fillStyle = dg; x.fillRect(0, 0, IW, fz.y + 4); }
    // the dark closing in, then the light
    if (fireP && R < 1) {
      const dk = x.createRadialGradient(fireP.x, fireP.y - 8 * fireP.s, 12 * fireP.s, fireP.x, fireP.y - 8 * fireP.s, Math.max(130 * fireP.s, 120));
      dk.addColorStop(0, 'rgba(6,4,10,0)'); dk.addColorStop(0.5, 'rgba(6,4,10,.18)'); dk.addColorStop(1, 'rgba(6,4,10,.72)');
      x.globalAlpha = 1 - R; x.fillStyle = dk; x.fillRect(0, 0, IW, IH); x.globalAlpha = 1;
    }
    if (R > 0) {
      const vg = x.createRadialGradient(IW / 2, IH * 0.42, IH * 0.35, IW / 2, IH * 0.42, IW * 0.62);
      vg.addColorStop(0, 'rgba(6,4,10,0)'); vg.addColorStop(1, 'rgba(6,4,10,.6)');
      x.globalAlpha = R; x.fillStyle = vg; x.fillRect(0, 0, IW, IH); x.globalAlpha = 1;
    }
    x.globalCompositeOperation = 'lighter';
    if (fireP) { const fk = (S.fireLow ? 0.3 : 0.42) + Math.sin(t / 110) * 0.04 + Math.sin(t / 37) * 0.03, s = fireP.s; glow(x, fireP.x, fireP.y - 8 * s, 40 * s, `rgba(244,140,50,${fk.toFixed(3)})`); glow(x, fireP.x, fireP.y - 8 * s, 16 * s, `rgba(255,214,150,${(fk * 0.45).toFixed(3)})`); pool(x, fireP.x, fireP.y, 46 * s, 0.4, `rgba(244,150,70,${(fk * 0.45).toFixed(3)})`); }
    for (const [lx, ly, r, c] of L) glow(x, lx, ly, r, c);
    for (const [px, py, r] of P) pool(x, px, py, r, 0.32, 'rgba(244,150,70,.22)');
    if (R > 0.02) { const gq = cam.proj(roadAt(GATE_Z), groundY(0, GATE_Z), GATE_Z); if (gq && gq.y > -40) { x.globalAlpha = R; const mg = x.createLinearGradient(0, gq.y + 10, 0, gq.y - 80); mg.addColorStop(0, 'rgba(60,90,130,0)'); mg.addColorStop(0.4, 'rgba(60,90,130,.22)'); mg.addColorStop(1, 'rgba(40,60,100,.35)'); x.fillStyle = mg; x.fillRect(0, gq.y - 80, IW, 90); x.globalAlpha = 1; } }
    // will-o'-wisps over the graveyard
    for (let i = 0; i < 7; i++) { const b = 150 + h2(i, 131) * 70, r = 250 + h2(i, 132) * 90, p = cam.proj(r * Math.sin(b * RAD) + Math.sin(t / 1300 + i) * 8, 6 + Math.sin(t / 700 + i * 2) * 3, r * Math.cos(b * RAD)); if (!p) continue; glow(x, p.x, p.y, 3 + 6 * p.s, `rgba(120,220,200,${(0.25 + 0.15 * Math.sin(t / 300 + i)).toFixed(3)})`); }
    x.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 12; i++) { const px = (h2(i, 41) * IW + Math.sin(t / 2300 + i) * 14 + IW) % IW, py = Math.max(hz, 30) + h2(i, 42) * (IH - Math.max(hz, 30)) + Math.sin(t / 1700 + i * 2) * 6, a = 0.35 + 0.35 * Math.sin(t / 400 + i * 1.3); if (a < 0.2) continue; x.globalAlpha = a; x.fillStyle = '#d8f0a0'; x.fillRect(Math.round(px), Math.round(py), 1, 1); x.globalAlpha = 1; }
    return { cam, anchors, roadPts };
  }
  const NAMES = { toll: 'Toll House', infirmary: 'Infirmary', yard: 'Training Yard', shop: 'Shop', tactician: 'Tactician', scav: 'Scavenger Camp', barracks: 'Barracks', pit: 'Salvage Pit', hall: 'Masters’ Hall', shrine: 'Shrine', whet: 'Whetstone', ossuary: 'Ossuary', hexing: 'Hexing Stone', bell: 'Bell Tower' };

  // ── a live camp: drag to turn, release to settle on the nearest view
  // Each stage's resting place on the road, and the room a drag has past the first and last of them.
  const zOf = k => STAGE_Z[Math.max(0, Math.min(17, k))] - 20, ZLO = zOf(0), ZHI = zOf(17);
  // Panning moves along the road in stages, not ground: every stage is the same drag away, whether the lanterns stand
  // close together near camp or far apart in the hills. u is that position: 0 at 1-1, 17 at the boss, and below 0 the
  // pull back toward camp.
  const PX_PER_STAGE = 64, PULL_HOME = 1.3, UMIN = -3, UMAX = 17.6;
  const zAtU = u => (u <= 0 ? ZLO + u * 40 : u >= 17 ? ZHI + (u - 17) * 260 : lerp(zOf(Math.floor(u)), zOf(Math.floor(u) + 1), u - Math.floor(u)));
  const uAtZ = z => { if (z <= ZLO) return (z - ZLO) / 40; if (z >= ZHI) return 17 + (z - ZHI) / 260; for (let k = 0; k < 17; k++) if (z <= zOf(k + 1)) return k + (z - zOf(k)) / (zOf(k + 1) - zOf(k)); return 17; };
  // The inverse of ease(), so a blend can be picked up where it stands.
  const unease = v => { let k = Math.max(0, Math.min(1, v)); for (let i = 0; i < 8; i++) { const f = k * k * (3 - 2 * k) - v, d = 6 * k * (1 - k) + 1e-6; k = Math.max(0, Math.min(1, k - f / d)); } return k; };
  function live(canvas, input, S, opts = {}) {
    const x = canvas.getContext('2d');
    let yaw = opts.yaw || 0, target = yaw, vel = 0, dragging = false, lastX = 0, lastT = 0, rest = 1;
    let roadK = opts.road != null ? opts.road : 0, roadTo = roadK, uc = opts.zc != null ? uAtZ(opts.zc) : 0, uVel = 0, uTo = null, pullK = 0, wheelAt = 0, lastY = 0, downX = 0, downY = 0, downT = 0, moved = 0;
    const PX_PER_DEG = 422 / 180, sc = () => input.getBoundingClientRect().width / 844 || 1; // half the frame's width turns 180°
    const nearest = (a, v = 0) => Math.round((a + v * 18) / 180) * 180;
    if (opts.drag !== false) {
      input.addEventListener('pointerdown', e => { if (e.target.closest('button,.nodrag')) return; dragging = true; lastX = downX = e.clientX; lastY = downY = e.clientY; lastT = downT = performance.now(); vel = 0; uVel = 0; moved = 0; input.setPointerCapture(e.pointerId); });
      input.addEventListener('pointermove', e => {
        if (!dragging) return;
        const dx = (e.clientX - lastX) / sc(), dy = (e.clientY - lastY) / sc(), now = performance.now();
        moved = Math.max(moved, Math.hypot(e.clientX - downX, e.clientY - downY) / sc());
        if (roadTo > 0.5) { if (moved > 6) { const du = dy / PX_PER_STAGE; uc = Math.max(UMIN, Math.min(UMAX, uc + du)); uVel = du / Math.max(8, now - lastT) * 16; uTo = null; } }
        else if (opts.orbit !== false && moved > 6) { yaw -= dx / PX_PER_DEG; vel = -dx / PX_PER_DEG / Math.max(8, now - lastT) * 16; target = null; }
        lastX = e.clientX; lastY = e.clientY; lastT = now;
      });
      // the wheel steps one stage at a time; back from 1-1, it goes home
      input.addEventListener('wheel', e => {
        if (roadTo <= 0.5) return;
        e.preventDefault();
        const now = performance.now(); if (now - wheelAt < 180) return; wheelAt = now;
        const k = Math.round(uTo != null ? uTo : uc) + (e.deltaY < 0 ? 1 : -1);
        if (k < 0) api.toCamp(); else api.panTo(k);
      }, { passive: false });
      const up = e => {
        if (!dragging) return; dragging = false;
        if (moved <= 6 && performance.now() - downT < 500 && api.onTap) { const r = input.getBoundingClientRect(), k2 = sc(); api.onTap({ x: (e.clientX - r.left) / k2, y: (e.clientY - r.top) / k2 }); }
        // a pan settles on the nearest stage, carried on a little by a flick; pulled back past 1-1, it goes home
        if (roadTo > 0.5 && moved > 6) { if (uc < -PULL_HOME) api.toCamp(); else api.panTo(Math.round(uc + uVel * 6)); }
        if (roadTo <= 0.5 && target == null) target = nearest(yaw, vel);
      };
      input.addEventListener('pointerup', up); input.addEventListener('pointercancel', up);
    }
    const api = {
      // the road view: fly from the camp to the road, looking at stage k; back again; pan to a stage
      toRoad(k = 0) { if (Math.abs(((yaw % 360) + 360) % 360) > 1) api.go('party'); k = Math.max(0, Math.min(17, k)); roadTo = 1; uc = k; uTo = null; uVel = 0; if (api.onSnap) api.onSnap(k); },
      toCamp() { if (pullK > 0) { roadK = unease(ease(roadK) * (1 - pullK)); pullK = 0; } roadTo = 0; uVel = 0; uTo = null; if (api.onSnap) api.onSnap(null); },
      panTo(k) { k = Math.max(0, Math.min(17, k)); uTo = k; uVel = 0; if (api.onSnap) api.onSnap(k); },
      onSnap: null,
      get road() { return roadK; }, set road(v) { roadK = roadTo = v; },
      get zc() { return zAtU(uc); }, set zc(v) { uc = uAtZ(v); },
      get stage() { return uc; },
      stageZ: STAGE_Z,
      go(view) { const want = view === 'build' ? 180 : 0, k = Math.round((yaw - want) / 360); target = want + 360 * k; if (Math.abs(target - yaw) > 180) target += target > yaw ? -360 : 360; },
      get yaw() { return yaw; }, set yaw(v) { yaw = target = v; },
      onFrame: null, state: S,
    };
    function frame(t) {
      if (!canvas.isConnected) return; // a scene taken off the page stops drawing
      if (!dragging && target != null) { const d = target - yaw; yaw += d * 0.12; if (Math.abs(d) < 0.05) yaw = target; }
      if (!dragging && uTo != null) { const d = uTo - uc; uc += d * 0.16; if (Math.abs(d) < 0.004) { uc = uTo; uTo = null; } }
      if (!dragging) uVel = 0;
      // pulled back past 1-1, the camera starts back toward the fire
      pullK = roadTo > 0.5 ? Math.min(0.6, Math.max(0, -uc) / 2.2) : 0;
      const zc = zAtU(uc);
      const dk = roadTo - roadK; roadK = Math.abs(dk) < 0.002 ? roadTo : roadK + dk * 0.07;
      const settled = !dragging && target != null && Math.abs(target - yaw) < 0.05 && Math.abs(dk) < 0.002 && uTo == null;
      rest = settled ? Math.min(1, rest + 0.08) : 0;
      const k3 = ease(roadK) * (1 - pullK), params = k3 <= 0 ? yaw : blendParams(orbitParams(yaw), roadParams(Math.max(ZLO, Math.min(ZHI + 160, zc))), k3);
      const out = draw(x, api.state, params, t, rest);
      out.roadK = roadK; out.zc = zc;
      if (api.onFrame) api.onFrame(out, yaw);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    return api;
  }
  return { IW, IH, K, VIEWS, weightOf, draw, live, NAMES, STAGE_Z, GATE_Z, roadParams, orbitParams, blendParams };
})();
