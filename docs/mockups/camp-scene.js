// Lantern Road mockups · the camp scene, shared by the screen mockups. Drawn with the game's own art (js/art.js, js/camp.js).
'use strict';
// ── art the mockups add: Old Wick, the guide's arrow, a few camp props, and a draught for the fire's badge
const WICK = {
  map: [
    '.....kkkk......',
    '....kHHHHk.....',
    '...kHhhhhHk....',
    '...khhkffHk....',
    '...khkfffFk..m.',
    '...khkwfwwk.mYm',
    '..kchkwwwwWkmym',
    '..kcckwwwwWk.d.',
    '..kcCckwwWkffd.',
    '..kcCcccckk..d.',
    '..kcCccccck..d.',
    '..kcCccccck..d.',
    '...kcccccbb..d.',
    '..kSSSSSSbbb.d.',
    '..ksssssssk..d.',
    '..ksssssssk..d.',
    '...kkkkkkk..ddd'],
  pal: { k: '#0d0911', H: '#6a5a7e', h: '#463a58', f: '#eec4a0', F: '#c49070', w: '#f6efe0', W: '#bfb29a', c: '#2f2640', C: '#4a3d60', b: '#2e2219', s: '#4a3424', S: '#6b4a2e', d: '#6b4a2e', m: '#3a3c41', y: '#f4a646', Y: '#ffe9b0' },
};
const ARROW = { map: ['..kkkkk..', '..kyYyk..', '..kyYyk..', '..kyYyk..', 'kkkyYykkk', 'kyyyYyyyk', '.kyyYyyk.', '..kyYyk..', '...kyk...', '....k....'], pal: { k: '#1a1008', y: '#f4a646', Y: '#ffd68a' } };
const PROP2 = {
  logs: { map: ['.oo.oo.oo.', 'oOooOooOoo', 'ooOooOooOo', '.oo.oo.oo.'], pal: { o: '#4a3424', O: '#8a6a44' } },
  barrel: { map: ['.kkk.', 'kwWwk', 'kkkkk', 'kwWwk', 'kwWwk', '.kkk.'], pal: { k: '#2e2219', w: '#5a4030', W: '#7a5a3a' } },
  crate: { map: ['kkkkkk', 'kwWwWk', 'kWkkWk', 'kwWwWk', 'kkkkkk'], pal: { k: '#2e2219', w: '#5a4030', W: '#7a5a3a' } },
  lamp: { map: ['.k.', 'kyk', 'kYk', '.k.', '.d.', '.d.', '.d.'], pal: { k: '#2e2219', y: '#f4a646', Y: '#ffe2a0', d: '#3a2a1c' } },
  lampoff: { map: ['.k.', 'kmk', 'kmk', '.k.', '.d.', '.d.', '.d.'], pal: { k: '#1e1a18', m: '#34343a', d: '#2a1f16' } },
};
if (!UI_ICONS.flask) UI_ICONS.flask = { map: ['..kk...', '..ww...', '.wrrw..', 'wrRrrw.', 'wrrrrw.', '.wwww..', '.......'], pal: { k: '#6b4a2e', w: '#cfc4b0', r: '#d83a46', R: '#ff9a8a' } };
const spr = (o, key) => sprite(o.map, o.pal, key);
const URL_OF = new Map();
function scaledURL(canvas, k, key) {
  if (URL_OF.has(key)) return URL_OF.get(key);
  const c = document.createElement('canvas'); c.width = canvas.width * k; c.height = canvas.height * k;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(canvas, 0, 0, c.width, c.height);
  const u = c.toDataURL(); URL_OF.set(key, u); return u;
}
const pxImg = (src, w, hgt, cls = 'px') => { const i = new Image(); i.src = src; i.className = cls; i.width = w; i.height = hgt; i.alt = ''; return i; };
const icon = (name, size) => pxImg(iconURL(name), size, size);
const wickFace = () => { const c = document.createElement('canvas'); c.width = 11; c.height = 11; c.getContext('2d').drawImage(spr(WICK, 'wick'), -2, 0); return scaledURL(c, 4, 'wickface'); };

// ── drawing helpers
const BASE_PAL = REGION_ART[0].pc;
const prop = k => sprite(PROPS[k].map, BASE_PAL, 'mk:' + k);
const bart = k => sprite(BUILD_ART[k], BP, 'b:' + k);
const lightsOf = k => { const L = []; BUILD_ART[k].forEach((r, y) => [...r].forEach((ch, x) => { if (ch === 'Y') L.push([x, y, 'y']); else if (ch === 'V') L.push([x, y, 'v']); })); return L; };
const seatCache = new Map();
function seatedOf(cls) {
  if (seatCache.has(cls)) return seatCache.get(cls);
  const full = heroSide(cls, 0, [Items.starter(cls, 1).id, null, null]), cut = 2;
  const cv = document.createElement('canvas'); cv.width = full.width; cv.height = full.height - cut;
  cv.getContext('2d').drawImage(full, 0, 0, full.width, full.height - cut, 0, 0, full.width, full.height - cut);
  cv.ax = full.ax;
  seatCache.set(cls, cv); return cv;
}
function disc(x, cx, cy, r, col) { x.fillStyle = col; for (let dy = -r; dy <= r; dy++) { const w = Math.floor(Math.sqrt(r * r - dy * dy + r * 0.6)); x.fillRect(cx - w, cy + dy, w * 2 + 1, 1); } }
function oval(x, cx, cy, rx, ry, col, dith) {
  for (let yy = Math.ceil(cy - ry); yy <= Math.floor(cy + ry); yy++) {
    const dy = (yy - cy) / ry, half = Math.sqrt(Math.max(0, 1 - dy * dy)) * rx, x0 = Math.round(cx - half), x1 = Math.round(cx + half);
    x.fillStyle = col; x.fillRect(x0, yy, x1 - x0, 1);
    if (dith) for (let k = 1; k <= 3; k++) if ((yy + k) % 2 === 0) { x.fillRect(x0 - k * 2, yy, 1, 1); x.fillRect(x1 + k * 2 - 1, yy, 1, 1); }
  }
}
function glow(x, gx, gy, r, rgba) { const g = x.createRadialGradient(gx, gy, 0, gx, gy, r); g.addColorStop(0, rgba); g.addColorStop(1, rgba.replace(/[\d.]+\)$/, '0)')); x.fillStyle = g; x.fillRect(gx - r, gy - r, r * 2, r * 2); }
function pool(x, cx, cy, r, rgba) { x.save(); x.translate(cx, cy); x.scale(1, 0.38); glow(x, 0, 0, r, rgba); x.restore(); }
function outline(x, img, dx, dy, k, col) { const o = tinted(img, col); for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) x.drawImage(o, dx + ox, dy + oy, img.width * k, img.height * k); }
function shadow(x, cx, by, w) { x.globalAlpha = 0.45; oval(x, cx, by, Math.max(3, w / 2 + 1), 1.6, '#050308'); x.globalAlpha = 1; }
function badge(x, name, bx, by) {
  glow(x, bx + 4.5, by + 4.5, 9, 'rgba(244,166,70,.25)');
  x.fillStyle = '#0d0911'; x.fillRect(bx - 1, by - 1, 11, 11);
  x.fillStyle = '#f4a646'; x.fillRect(bx, by, 9, 9);
  x.fillStyle = '#24160c'; x.fillRect(bx + 1, by + 1, 7, 7);
  const ic = UI_ICONS[name] || UI_ICONS.star; x.drawImage(sprite(ic.map, ic.pal, 'i:' + name), bx + 1, by + 1);
  x.fillStyle = '#f4a646'; x.fillRect(bx + 3, by + 9, 3, 1); x.fillRect(bx + 4, by + 10, 1, 1);
}
function seat(x, cls, sx, sy, face, t, j) {
  const sp = seatedOf(cls), flip = face < 0;
  shadow(x, sx, sy + 1, 12);
  x.fillStyle = '#4a3424'; x.fillRect(sx - 6, sy - 1, 12, 2); x.fillStyle = '#2e2219'; x.fillRect(sx - 6, sy, 12, 1); x.fillStyle = '#6b4a2e'; x.fillRect(sx - 6, sy - 1, 1, 1); x.fillRect(sx + 5, sy - 1, 1, 1);
  const breathe = Math.sin(t / 620 + j * 1.7) > 0.75 ? 1 : 0, hy = sy - sp.height + 1 - breathe;
  x.save();
  if (flip) { x.translate(sx * 2, 0); x.scale(-1, 1); }
  x.drawImage(sp, Math.round(sx - sp.ax), hy);
  x.restore();
}
function fire(x, fx, fy, t, big = 1, pot = false) {
  if (pot) {
    x.fillStyle = '#2a1f16';
    for (let i = 0; i <= 18; i++) { x.fillRect(Math.round(fx - 10 + i * 0.5), fy - i, 1, 1); x.fillRect(Math.round(fx + 10 - i * 0.5), fy - i, 1, 1); }
    x.fillRect(fx - 1, fy - 19, 3, 1); x.fillRect(fx, fy - 18, 1, 4);
    x.fillStyle = '#1b1719'; x.fillRect(fx - 4, fy - 14, 9, 5); x.fillRect(fx - 3, fy - 9, 7, 1);
    x.fillStyle = '#3a3c41'; x.fillRect(fx - 4, fy - 14, 9, 1); x.fillStyle = '#5f6266'; x.fillRect(fx - 3, fy - 13, 2, 1);
  }
  x.fillStyle = '#2a1a10'; x.fillRect(fx - 9, fy - 1, 18, 2);
  x.fillStyle = '#4a3020'; for (let i = 0; i < 12; i++) { x.fillRect(fx - 7 + i, fy - 2 - Math.floor(i / 4), 2, 1); x.fillRect(fx + 6 - i, fy - 2 - Math.floor(i / 4), 2, 1); }
  x.fillStyle = '#6b4a2e'; x.fillRect(fx - 7, fy - 2, 3, 1); x.fillRect(fx + 5, fy - 2, 3, 1);
  x.fillStyle = '#c2412a'; x.fillRect(fx - 5, fy - 3, 10, 1);
  const fl = Math.floor(t / 85);
  for (let i = -6; i <= 6; i++) {
    const base = (12 - Math.abs(i) * 1.6) * big;
    const hgt = Math.max(1, Math.round(base * (0.62 + ((Math.sin(fl * 1.7 + i * 2.3) + 1) / 2) * 0.55)));
    for (let k = 0; k < hgt; k++) {
      const q = k / hgt;
      let col = q > 0.86 ? '#a83a2a' : q > 0.6 ? '#e2582e' : q > 0.28 ? '#f7a84a' : '#fff0c0';
      if (Math.abs(i) >= 5 && q < 0.5) col = '#e2582e';
      x.fillStyle = col; x.fillRect(fx + i, fy - 4 - k, 1, 1);
    }
  }
  for (let j = 0; j < 8; j++) {
    const q = ((t / 1500) + j * 0.125) % 1, sx = fx + Math.round(Math.sin(j * 2.1 + q * 6) * (3 + q * 7)), sy = fy - 14 - Math.round(q * 36);
    x.globalAlpha = 1 - q; x.fillStyle = q < 0.4 ? '#ffd27a' : '#e2582e'; x.fillRect(sx, sy, 1, 1); x.globalAlpha = 1;
  }
}
function fireflies(x, W, H, t, n = 9) {
  for (let i = 0; i < n; i++) {
    const px = (h2(i, 41) * W + Math.sin(t / 2300 + i) * 14 + W) % W, py = 54 + h2(i, 42) * (H - 80) + Math.sin(t / 1700 + i * 2) * 6;
    const a = 0.35 + 0.35 * Math.sin(t / 400 + i * 1.3);
    if (a < 0.2) continue;
    x.globalAlpha = a; x.fillStyle = '#d8f0a0'; x.fillRect(Math.round(px), Math.round(py), 1, 1); x.globalAlpha = 1;
  }
}


// ── the camp (screen 2): a panorama at 3×, as wide as the plots it holds. The fire and the party sit in the middle;
// behind them the Recruit Board and the signpost flank the path out of camp; the plots line both sides, opening from
// the middle outwards so the first six fit on one screen. Names and what's waiting sit on plaques (HTML, campPlaces).
const VW = 282, VH = 130, CX = 300, FY = 98, HZ = 44;
const PLOT_AT = [[240, 66], [360, 66], [204, 68], [396, 68], [180, 92], [420, 92], [150, 70], [450, 70], [116, 90], [484, 90], [84, 70], [516, 70], [50, 90], [550, 90]];
const BOARD_AT = [278, 64], SIGN_AT = [322, 64], WICK_AT = [238, 110];
const SEATS = [[270, 88, 1], [330, 88, -1], [258, 100, 1], [342, 100, -1], [282, 110, 1], [318, 110, -1]];
const POSTS_AT = [[214, 100], [380, 100]];

function paintCamp(x, S, t) {
  const cam = S.cam;
  const g = x.createLinearGradient(0, 0, 0, HZ + 4); g.addColorStop(0, '#05030a'); g.addColorStop(0.6, '#0f0a17'); g.addColorStop(1, '#1b1323');
  x.fillStyle = g; x.fillRect(0, 0, VW, VH);
  for (let i = 0; i < 90; i++) {
    const sx = Math.floor(h2(i, 7) * VW), sy = Math.floor(h2(i, 8) * (HZ - 8)), b = h2(i, 9), tw = b > 0.94 && Math.sin(t / 650 + i * 3) > 0.5;
    x.fillStyle = b > 0.88 ? (tw ? '#fff8e0' : '#d8ccb4') : b > 0.62 ? '#5e5270' : '#30283e'; x.fillRect(sx, sy, 1, 1);
  }
  if (S.moon != null) { glow(x, S.moon, 18, 20, 'rgba(232,220,196,.10)'); disc(x, S.moon, 18, 5, '#efe3c8'); disc(x, S.moon + 2, 16, 5, '#0f0a17'); }
  x.save(); x.translate(-cam, 0);
  // mist and dead wood, parting where the path leaves camp
  x.fillStyle = '#0c0912';
  for (let X = 0; X < 600; X++) { const y = HZ - 6 + Math.round(2.5 * Math.sin(X / 37) + 1.5 * Math.sin(X / 11 + 1) + h2(X, 3)); x.fillRect(X, y, 1, HZ + 4 - y); }
  const tree = tinted(prop('deadtree'), '#0a0710'), tree2 = tinted(prop('deadtree'), '#120d18');
  for (let i = 0; i < 76; i++) { const tx = Math.floor(i * 8 + h2(i, 4) * 6) - 4; if (Math.abs(tx + 4 - 302) < 10 || h2(i, 6) < 0.18) continue; x.drawImage(i % 3 ? tree : tree2, tx, HZ + 2 - tree.height - Math.floor(h2(i, 2) * 5)); }
  const mist = x.createLinearGradient(0, HZ - 6, 0, HZ + 8); mist.addColorStop(0, 'rgba(60,44,80,0)'); mist.addColorStop(0.5, 'rgba(60,44,80,.22)'); mist.addColorStop(1, 'rgba(60,44,80,0)');
  x.fillStyle = mist; x.fillRect(0, HZ - 6, 600, 14);
  // the ground, the clearing, and the trodden path out
  x.fillStyle = '#0e0a13'; x.fillRect(0, HZ + 2, 600, VH);
  for (let i = 0; i < 900; i++) { const px = Math.floor(h2(i, 11) * 600), py = HZ + 2 + Math.floor(h2(i, 12) * (VH - HZ)); x.fillStyle = h2(i, 13) > 0.5 ? '#17121d' : '#130f19'; x.fillRect(px, py, 1, 1); }
  oval(x, CX, FY + 4, 240, 42, '#120e18', true); oval(x, CX, FY + 4, 196, 35, '#16111c', true); oval(x, CX, FY + 4, 140, 27, '#1a1420', true);
  oval(x, CX, FY + 3, 86, 18, '#1f1822', true); oval(x, CX, FY + 1, 40, 9, '#271d22', true);
  for (let i = 0; i < 260; i++) { const a = h2(i, 21) * Math.PI * 2, r = Math.sqrt(h2(i, 22)); x.fillStyle = h2(i, 23) > 0.5 ? '#241b26' : '#120e17'; x.fillRect(Math.round(CX + Math.cos(a) * r * 220), Math.round(FY + 4 + Math.sin(a) * r * 38), 1, 1); }
  for (let y = HZ + 2; y <= FY - 9; y++) { const q = (y - HZ) / (FY - 9 - HZ), w = Math.round(3 + q * 9), c = Math.round(303 - q * 3); x.globalAlpha = 0.35 + q * 0.25; x.fillStyle = '#2a2028'; x.fillRect(c - (w >> 1), y, w, 1); if (h2(y, 33) > 0.6) { x.fillStyle = '#3a2e34'; x.fillRect(c - (w >> 1) + Math.floor(h2(y, 34) * w), y, 1, 1); } x.globalAlpha = 1; }
  for (let a = 0; a < Math.PI * 2; a += 0.42) { const px = Math.round(CX + Math.cos(a) * 12), py = Math.round(FY + 1 + Math.sin(a) * 3.5); x.fillStyle = '#4a4c52'; x.fillRect(px - 1, py, 3, 2); x.fillStyle = '#7d8088'; x.fillRect(px - 1, py, 2, 1); }
  // back to front
  const L = [], P = [], items = [];
  S.plots.forEach((p, i) => {
    const [px, py] = PLOT_AT[i];
    if (!p) { items.push({ y: py, f: () => { x.globalAlpha = 0.6; oval(x, px, py, 7, 2, '#100c15'); x.globalAlpha = 1; } }); return; }
    items.push({ y: py, f: () => {
      const img = bart(p.empty ? 'plot' : p.art), bx = Math.round(px - img.width / 2), by = py - img.height;
      shadow(x, px, py, img.width);
      if (S.focus === i) outline(x, img, bx, by, 1, '#f4a646');
      x.drawImage(img, bx, by);
      if (py < 80) { x.globalAlpha = 0.2; x.drawImage(tinted(img, '#07050b'), bx, by); x.globalAlpha = 1; }
      if (!p.empty) for (const [lx, ly, k] of lightsOf(p.art)) L.push([bx + lx + 0.5, by + ly + 0.5, k === 'v' ? 'rgba(190,140,255,.55)' : 'rgba(255,200,110,.55)', 4]);
    } });
  });
  items.push({ y: BOARD_AT[1], f: () => {
    const img = bart('board'), bx = BOARD_AT[0] - Math.round(img.width / 2), by = BOARD_AT[1] - img.height;
    shadow(x, BOARD_AT[0], BOARD_AT[1], img.width);
    if (S.focus === 'board') outline(x, img, bx, by, 1, '#f4a646');
    x.drawImage(img, bx, by); L.push([bx + 10.5, by + 14.5, 'rgba(255,200,110,.6)', 6]);
  } });
  items.push({ y: SIGN_AT[1], f: () => { const s = bart('road'), lp = spr(PROP2.lamp, 'lamp'); shadow(x, SIGN_AT[0], SIGN_AT[1], 8); x.drawImage(s, SIGN_AT[0] - 8, SIGN_AT[1] - s.height); x.drawImage(lp, SIGN_AT[0] - 7, SIGN_AT[1] - s.height - 3); L.push([SIGN_AT[0] - 5.5, SIGN_AT[1] - s.height - 0.5, 'rgba(255,190,100,.55)', 9]); P.push([SIGN_AT[0] - 4, SIGN_AT[1] + 1, 10]); } });
  for (const [px, py] of POSTS_AT) items.push({ y: py, f: () => { const post = prop('post'); shadow(x, px, py, 4); x.drawImage(post, px - 2, py - post.height + 1); L.push([px + 0.5, py - post.height + 3.5, 'rgba(255,190,100,.5)', 13]); } });
  items.push({ y: 113, f: () => { const s = spr(PROP2.logs, 'logs'); shadow(x, 220, 113, 10); x.drawImage(s, 215, 110); } });
  items.push({ y: 100, f: () => { const b = spr(PROP2.barrel, 'barrel'), c = spr(PROP2.crate, 'crate'); shadow(x, 394, 100, 12); x.drawImage(c, 389, 95); x.drawImage(b, 395, 94); } });
  (S.heroes || []).forEach((cls, j) => { const [sx, sy, face] = SEATS[j]; items.push({ y: sy, f: () => seat(x, cls, sx, sy, face, t, j) }); });
  items.push({ y: WICK_AT[1], f: () => {
    const w = spr(WICK, 'wick'), wx = WICK_AT[0] - 6, wy = WICK_AT[1] - w.height + 1;
    shadow(x, WICK_AT[0] - 1, WICK_AT[1], 10);
    if (S.focus === 'wick') outline(x, w, wx, wy, 1, '#f4a646');
    x.drawImage(w, wx, wy); L.push([wx + 13.5, wy + 6.5, `rgba(255,190,100,${(0.55 + Math.sin(t / 170) * 0.08).toFixed(3)})`, 11]);
  } });
  items.push({ y: FY + 0.5, f: () => fire(x, CX, FY, t, S.fireLow ? 0.7 : 1.15, !S.fireLow) });
  items.sort((p, q) => p.y - q.y);
  for (const it of items) it.f();
  const dk = x.createRadialGradient(CX, FY - 8, 20, CX, FY - 8, 230);
  dk.addColorStop(0, 'rgba(6,4,10,0)'); dk.addColorStop(0.4, 'rgba(6,4,10,.2)'); dk.addColorStop(1, 'rgba(6,4,10,.84)');
  x.fillStyle = dk; x.fillRect(0, 0, 600, VH);
  x.globalCompositeOperation = 'lighter';
  const fk = (S.fireLow ? 0.3 : 0.42) + Math.sin(t / 110) * 0.04 + Math.sin(t / 37) * 0.03;
  glow(x, CX, FY - 8, S.fireLow ? 76 : 104, `rgba(244,140,50,${fk.toFixed(3)})`); glow(x, CX, FY - 8, 28, `rgba(255,214,150,${(fk * 0.45).toFixed(3)})`);
  for (const [lx, ly, c, r] of L) glow(x, lx, ly, r, c);
  for (const [px, py, r] of P) pool(x, px, py, r, 'rgba(244,150,70,.32)');
  x.globalCompositeOperation = 'source-over';
  x.restore();
  fireflies(x, VW, VH, t);
}

// Where the HTML plaques and markers go, in CSS pixels on the 844×390 frame.
const NAMES = { toll: 'Toll House', infirmary: 'Infirmary', yard: 'Training Yard', shop: 'Shop', tactician: 'Tactician', scav: 'Scavenger Camp', barracks: 'Barracks', pit: 'Salvage Pit', hall: 'Masters’ Hall', shrine: 'Shrine', whet: 'Whetstone', ossuary: 'Ossuary', hexing: 'Hexing Stone', bell: 'Bell Tower' };
function campPlaces(S) {
  const at = (wx, wy) => [Math.round((wx - S.cam) * 3), Math.round(wy * 3)], out = [];
  S.plots.forEach((p, i) => { if (!p) return; const art = p.empty ? 'plot' : p.art, [x, y] = at(PLOT_AT[i][0], PLOT_AT[i][1] + 2), top = at(0, PLOT_AT[i][1] - BUILD_ART[art].length)[1]; out.push({ x, y, top, name: p.empty ? 'Empty plot' : NAMES[p.art], empty: !!p.empty, chip: p.chip }); });
  { const [x, y] = at(BOARD_AT[0], BOARD_AT[1] + 2), top = at(0, BOARD_AT[1] - BUILD_ART.board.length)[1]; out.push({ x, y, top, name: 'Recruit Board', chip: S.boardChip }); }
  { const [x, y] = at(SIGN_AT[0], SIGN_AT[1] + 2), top = at(0, SIGN_AT[1] - BUILD_ART.road.length - 3)[1]; out.push({ x, y, top, name: 'The Road' }); }
  return out;
}
