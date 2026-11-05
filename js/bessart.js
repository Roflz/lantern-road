'use strict';
// Lantern Road · Bess the carter's art (docs/first-session-spec.md §4; play-test note 3.13): her covered cart with notes
// pinned to its side, the mule that pulls it, Bess herself (stout, a wide hat, a muddy coat, a whip over her shoulder),
// and her large portrait for her panel (js/quests.js). The scene's pieces are drawn in code with js/hearthart.js's
// painter, in the Hearth's palette and finish (firelight low down, an ink outline), as the buildings are; the portrait is
// drawn from shapes on a grid, lit and outlined, as Wick's is (js/wick.js).
//   BessArt.rig(frame)       the mule and the cart, facing left, as one canvas: frame 0 standing, 1 and 2 rolling
//                            (legs and spokes), 3 the mule's ear and tail flick. .lamp: the cart's lantern; .bench:
//                            where Bess sits to drive; .w, .h
//   BessArt.bess(pose)       Bess standing, facing left: 'rest', 'breathe', 'tip' (her hat raised: tapped)
//   BessArt.portrait()       the large portrait, 46×58, facing right; BessArt.portraitURL() the same at 4×
// js/campscene.js draws the scene's pieces; js/quests.js shows the portrait.

const BessArt = (() => {
  const cache = {};
  const C = () => HearthArt.C;

  // ── the cart and the mule, facing left: the mule at x 0–17, the shafts, the cart from x 17
  function rig(frame = 0) {
    const key = 'rig' + frame;
    if (cache[key]) return cache[key];
    const c = C(), W = 62, H = 28, P = HearthArt.painter(W, H), G = H - 1;
    // the cart's bed: planks, its top edge in the light
    const bx0 = 24, bx1 = 59;
    P.rect(bx0, 17, bx1 - bx0 + 1, 4, c.w3);
    P.hl(bx0, bx1, 17, c.w4); P.hl(bx0, bx1, 20, c.w1);
    for (let x = bx0 + 4; x < bx1; x += 6) P.vl(x, 18, 19, c.w2);
    // the cover: canvas over hoops, rounded at the top, its open front dark
    const top = x => { const u = (x - bx0) / (bx1 - bx0); return Math.round(4 + 3 * Math.pow(Math.abs(u - 0.5) * 2, 3)); };
    for (let x = bx0 + 1; x <= bx1 - 1; x++) for (let y = top(x); y <= 16; y++) P.px(x, y, y <= top(x) + 1 ? c.c4 : y >= 14 ? c.c1 : c.c2);
    for (const hx of [bx0 + 9, bx0 + 17, bx0 + 25]) for (let y = top(hx); y <= 16; y++) P.px(hx, y, c.c1);
    P.dither(bx0 + 2, 13, bx1 - bx0 - 3, 2, c.c1);
    for (let y = top(bx0 + 1) + 1; y <= 16; y++) { P.px(bx0 + 1, y, c.w0); P.px(bx0 + 2, y, y > 8 ? c.w0 : c.c1); }
    // notes pinned to its side, each with a red pin and a line or two of writing
    const note = (x, y, w, h) => { P.rect(x, y, w, h, c.b3); P.hl(x, x + w - 1, y + h - 1, c.b1); for (let j = y + 1; j < y + h - 1; j += 2) P.hl(x + 1, x + w - 2, j, '#6a6080'); P.px(x + (w >> 1), y, c.x2); };
    note(bx0 + 4, 7, 4, 5); note(bx0 + 11, 6, 5, 4); note(bx0 + 19, 8, 4, 5); note(bx0 + 13, 11, 3, 3);
    // the lantern on the front hoop
    P.vl(bx0, 4, 6, c.i1); P.rect(bx0 - 1, 7, 3, 1, c.i1); P.rect(bx0 - 1, 8, 3, 2, c.y3); P.px(bx0, 8, c.y4); P.rect(bx0 - 1, 10, 3, 1, c.i1);
    // the driver's bench and footboard, in front of the cover
    P.rect(bx0 - 3, 15, 4, 2, c.w2); P.hl(bx0 - 3, bx0, 15, c.w4); P.vl(bx0 - 3, 17, 19, c.w1);
    // the wheels: a big one behind, a smaller one in front; spokes turn while rolling
    const wheel = (cx, cy, r) => {
      P.disc(cx, cy, r + 0.5, (x, y, d) => (d > r - 1.2 ? c.w1 : null));
      const a0 = frame === 2 ? Math.PI / 4 : 0;
      for (let k = 0; k < 4; k++) { const a = a0 + k * Math.PI / 4; P.line(cx - Math.cos(a) * (r - 1), cy - Math.sin(a) * (r - 1), cx + Math.cos(a) * (r - 1), cy + Math.sin(a) * (r - 1), c.w3); }
      P.disc(cx, cy, 1.3, c.i2);
    };
    wheel(51, G - 5.5, 5.5); wheel(31, G - 4.5, 4.5);
    // the shafts, from the bed to the mule's collar
    P.line(8, 14, bx0 - 1, 18, c.w2); P.line(9, 15, bx0 - 1, 19, c.w1);
    // the mule: stocky, grey-brown, a pale muzzle and belly, long ears, a red collar. The far legs first, in shadow;
    // a stride while rolling.
    const m0 = '#3e342c', m1 = '#6a5a4a', m2 = '#857060', mz = '#b09c84', st = frame === 1 ? 1 : frame === 2 ? -1 : 0;
    P.rect(9 + st, 19, 2, G - 19, m0); P.rect(16 - st, 19, 2, G - 19, m0);
    P.rect(6, 12, 12, 8, m1); P.rect(5, 13, 1, 6, m1); P.rect(18, 13, 1, 6, m0);
    P.hl(6, 17, 12, m2); P.hl(6, 16, 13, m2); P.hl(7, 17, 19, mz); P.vl(17, 13, 18, m0);
    for (const [lx, d] of [[6, -st], [14, st]]) { P.rect(lx + d, 20, 2, G - 21, m1); P.vl(lx + d + 1, 20, G - 2, m0); P.rect(lx + d, G - 1, 2, 1, c.w0); }
    // neck and head, held low and forward
    P.rect(3, 8, 5, 6, m1); P.hl(3, 7, 8, m2); P.rect(0, 10, 4, 4, m1); P.rect(0, 12, 2, 2, mz); P.px(0, 12, '#5a4a40'); P.px(3, 10, c.w0);
    // ears: tall, and one flicks back (frame 3)
    P.vl(4, 3, 7, m1); P.px(4, 4, mz); P.px(4, 5, mz);
    if (frame === 3) { P.px(7, 6, m0); P.px(8, 5, m0); P.px(9, 4, m0); } else P.vl(6, 3, 7, m0);
    // the collar, and a strap along its side
    P.vl(7, 9, 15, c.x1); P.vl(8, 10, 15, c.x2); P.hl(9, 16, 15, c.w1);
    // the tail
    if (frame === 3) { P.px(19, 12, m0); P.px(20, 13, m0); P.px(20, 14, m0); P.px(21, 15, m0); }
    else { P.px(19, 13, m0); P.vl(19, 14, 17, m0); P.px(20, 18, m0); }
    const cv = P.finish({ warm: 0.14 });
    cv.lamp = [bx0, 9]; cv.bench = [bx0 - 1, 15];
    return (cache[key] = cv);
  }

  // ── Bess standing, facing left: 18×27
  function bess(pose = 'rest') {
    const key = 'bess' + pose;
    if (cache[key]) return cache[key];
    const c = C(), W = 18, H = 27, P = HearthArt.painter(W, H);
    const skin = '#e8b48a', skinS = '#c48a64', cheek = '#d4705a', hair = '#8a4a2a', coat = '#5e5236', coatL = '#77693f', coatD = '#433a26', mud = '#3a2e1e';
    const lift = pose === 'tip' ? 2 : 0, dy = pose === 'breathe' ? 1 : 0, y0 = 2;
    // the whip's lash, looped down her back
    P.px(16, y0 + 4 + dy, c.w2); P.vl(17, y0 + 5 + dy, y0 + 11 + dy, c.w2); P.px(16, y0 + 12 + dy, c.w2);
    // boots and the coat's skirts, splashed with mud
    P.rect(5, y0 + 21, 3, 3, c.w0); P.rect(10, y0 + 21, 3, 3, c.w0); P.hl(4, 7, y0 + 23, c.w0); P.hl(9, 12, y0 + 23, c.w0);
    P.rect(3, y0 + 11 + dy, 12, 10 - dy, coat); P.vl(3, y0 + 11 + dy, y0 + 20, coatL); P.vl(4, y0 + 12 + dy, y0 + 20, coatL); P.vl(14, y0 + 11 + dy, y0 + 20, coatD);
    P.dither(3, y0 + 19, 12, 2, mud); P.px(6, y0 + 17, mud); P.px(12, y0 + 16, mud);
    P.hl(3, 14, y0 + 15 + dy, c.w0); P.px(8, y0 + 15 + dy, c.g1);
    // her arms: the near one at her side, the far one up at the hat when she tips it
    P.rect(2, y0 + 12 + dy, 2, 5, coatL); P.px(2, y0 + 17 + dy, skin);
    if (pose === 'tip') { P.rect(13, y0 + 3, 2, 8, coatD); P.px(13, y0 + 2, skin); } else { P.rect(14, y0 + 12 + dy, 2, 5, coatD); P.px(15, y0 + 17 + dy, skinS); }
    // the scarf
    P.hl(5, 12, y0 + 10 + dy, c.x2); P.px(6, y0 + 11 + dy, c.x1); P.px(6, y0 + 12 + dy, c.x2);
    // the head: a round, ruddy, grinning face, auburn hair under the hat
    const fy = y0 + 4 + dy;
    P.rect(5, fy, 7, 6, skin); P.vl(11, fy, fy + 5, skinS); P.hl(6, 10, fy + 5, skinS);
    P.px(6, fy + 2, '#1a1220'); P.px(9, fy + 2, '#1a1220'); P.px(5, fy + 3, cheek); P.px(10, fy + 3, cheek);
    P.hl(6, 9, fy + 4, '#7a3a2e'); P.hl(7, 8, fy + 4, '#f6efe0');
    P.vl(12, fy, fy + 4, hair); P.px(4, fy + 1, hair);
    // the hat: a wide brim and a low crown with a red band
    const hy = y0 - lift + dy;
    P.rect(1, hy + 2, 16, 2, c.w2); P.hl(1, 16, hy + 2, c.w4); P.hl(2, 15, hy + 3, c.w1);
    P.rect(5, hy - 1, 8, 3, c.w3); P.hl(5, 12, hy - 1, c.w4); P.hl(5, 12, hy + 1, c.x1);
    // the whip's handle over her shoulder
    P.line(13, y0 + 11 + dy, 16, y0 + 4 + dy, c.w4); P.px(13, y0 + 11 + dy, c.w0);
    const cv = P.finish({ warm: 0.12 });
    cv.ax = 9;
    return (cache[key] = cv);
  }

  // ── the portrait: Bess from the waist up, turned a little to the right, on a 46×58 grid
  function portrait() {
    if (cache.portrait) return cache.portrait;
    const W = 46, H = 58, g = Array.from({ length: H }, () => new Array(W).fill(null));
    const P = {
      k: '#0d0911', H: '#5a4030', h: '#3e2c20', T: '#8a6a44', b: '#8a2a22', B: '#b4483a',
      r: '#7a3a1e', R: '#a0502a', s: '#eab48c', S: '#c98c66', c: '#d8705a', e: '#1a1220', E: '#fff2cc', w: '#f6efe0', m: '#7a3a2e',
      o: '#5e5236', O: '#7a6c44', q: '#433a26', u: '#3a2e1e', U: '#6a4a2e', l: '#c8b48a',
      x: '#a83a2a', X: '#d4584a', W: '#94704a', G: '#4a3424', L: '#5a4030', n: '#f2e8d0', N: '#bfb29a', d: '#5a5068', y: '#c8a050',
    };
    const put = (x, y, col) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < W && y < H) g[y][x] = col; };
    const ell = (cx, cy, rx, ry, f) => { for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) { const dx = (x - cx) / rx, dy = (y - cy) / ry; if (dx * dx + dy * dy <= 1.02) f(x, y, dx, dy); } };
    const poly = (pts, f) => {
      const ys = pts.map(p => p[1]), y0 = Math.floor(Math.min(...ys)), y1 = Math.ceil(Math.max(...ys));
      for (let y = y0; y <= y1; y++) {
        const xs = [];
        for (let i = 0; i < pts.length; i++) { const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length]; if ((ay <= y + 0.5 && by > y + 0.5) || (by <= y + 0.5 && ay > y + 0.5)) xs.push(ax + (y + 0.5 - ay) * (bx - ax) / (by - ay)); }
        xs.sort((a, b) => a - b);
        for (let i = 0; i + 1 < xs.length; i += 2) for (let x = Math.ceil(xs[i] - 0.5); x <= Math.floor(xs[i + 1] - 0.5); x++) f(x, y);
      }
    };
    const line = (x0, y0, x1, y1, col) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1; for (let i = 0; i <= n; i++) put(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, col); };
    // the whip's lash, looped behind her near shoulder
    for (let i = 0; i <= 60; i++) { const a = Math.PI * (0.15 + 1.25 * i / 60); put(7 + Math.cos(a) * 5, 41 - Math.sin(a) * 9, 'L'); }
    // the coat: broad shoulders, muddy at the hem, lit from the left
    poly([[2, 58], [4, 45], [10, 38], [35, 38], [41, 44], [44, 58]], (x, y) => put(x, y, x < 9 ? 'O' : x > 36 ? 'q' : 'o'));
    for (let y = 47; y < 58; y++) for (let x = 3; x < 44; x++) { const q = HearthArt.hs(x, y, 31); if (g[y][x] && q < (y - 46) * 0.035) put(x, y, q < 0.08 ? 'U' : 'u'); }
    // lapels and the shirt between them, two brass buttons
    for (let y = 39; y <= 47; y++) { put(18 + (y - 39) / 2, y, 'O'); put(28 - (y - 39) / 2, y, 'q'); }
    for (let y = 40; y <= 46; y++) for (let x = 20 + Math.ceil((y - 40) / 2); x <= 26 - Math.ceil((y - 40) / 2); x++) put(x, y, 'l');
    put(23, 50, 'y'); put(23, 54, 'y');
    // the scarf, knotted at her throat
    poly([[14, 36], [32, 36], [33, 40], [13, 40]], (x, y) => put(x, y, y === 36 ? 'X' : x < 18 ? 'X' : 'x'));
    poly([[24, 39], [29, 39], [30, 46], [26, 45]], (x, y) => put(x, y, x < 26 ? 'X' : 'x'));
    // the neck
    for (let y = 33; y <= 35; y++) for (let x = 19; x <= 27; x++) put(x, y, x > 24 ? 'S' : 's');
    // auburn hair down past her ears, a braid on her far shoulder
    ell(22.5, 26, 10, 9, (x, y, dx) => put(x, y, dx < -0.5 ? 'R' : 'r'));
    for (let y = 30; y <= 41; y++) put(33 + (y > 36 ? 1 : 0), y, y % 2 ? 'r' : 'R');
    put(34, 42, 'b');
    // the face: round, ruddy, grinning, turned a little to the right
    ell(23.5, 26.5, 8, 8.5, (x, y, dx) => put(x, y, dx > 0.55 ? 'S' : 's'));
    for (let y = 19; y <= 21; y++) for (let x = 16; x <= 31; x++) if (g[y][x] === 's' || g[y][x] === 'S') put(x, y, 'S'); // the hat's shadow
    put(20, 25, 'e'); put(20, 26, 'e'); put(27, 25, 'e'); put(27, 26, 'e'); put(20, 24, 'E');
    for (const [x, y] of [[19, 23], [20, 23], [21, 23], [26, 23], [27, 23], [28, 23]]) put(x, y, 'r');
    put(24, 26, 'S'); put(24, 27, 'S'); put(24, 28, 'S'); put(25, 28, 'S');
    for (const [x, y] of [[18, 28], [19, 28], [18, 29], [28, 28], [29, 28], [29, 29]]) put(x, y, 'c');
    for (let x = 21; x <= 27; x++) put(x, 31, 'm');
    for (let x = 22; x <= 26; x++) put(x, 30, 'w');
    put(20, 30, 'm'); put(28, 30, 'm');
    // the hat: a low crown with a red band, and a wide brim tipped up at the front
    poly([[14, 6], [16, 3], [30, 3], [32, 6], [33, 16], [13, 16]], (x, y) => put(x, y, x < 17 ? 'T' : x > 29 ? 'h' : 'H'));
    for (let x = 13; x <= 33; x++) { put(x, 13, 'b'); put(x, 14, x < 17 ? 'B' : 'b'); }
    ell(23, 17.5, 22, 3.6, (x, y, dx, dy) => put(x, y, dy < -0.35 ? (dx < -0.2 ? 'T' : 'H') : 'h'));
    for (let x = 3; x <= 43; x++) if (g[17][x] === 'H' || g[17][x] === 'T') put(x, 16, g[16][x] || 'H');
    // the whip's handle over her shoulder, the grip wrapped
    line(9, 46, 5, 30, 'W'); line(10, 46, 6, 30, 'W'); put(9, 44, 'G'); put(9, 45, 'G'); put(8, 42, 'G'); put(5, 29, 'G');
    // her far hand, holding up a job's note
    poly([[33, 40], [42, 39], [43, 51], [34, 52]], (x, y) => put(x, y, y === 51 || x === 42 ? 'N' : 'n'));
    for (const y of [42, 44, 46, 48]) for (let x = 35; x <= 40 - (y === 48 ? 2 : 0); x++) put(x, y, 'd');
    put(37, 40, 'x');
    ell(36, 51, 2.4, 2, (x, y) => put(x, y, 's')); put(35, 52, 'S'); put(37, 52, 'S');
    // an outline round everything
    const out = g.map(r => r.slice());
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!g[y][x] && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => g[y + b] && g[y + b][x + a])) out[y][x] = 'k';
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    out.forEach((r, y) => r.forEach((col, i) => { if (col) { x.fillStyle = P[col]; x.fillRect(i, y, 1, 1); } }));
    return (cache.portrait = cv);
  }
  // The portrait at 4× (184×232), as an image URL: crisp at any size it's shown.
  let url = null;
  function portraitURL() {
    if (url) return url;
    const src = portrait(), k = 4, c = document.createElement('canvas');
    c.width = src.width * k; c.height = src.height * k;
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    x.drawImage(src, 0, 0, c.width, c.height);
    return (url = c.toDataURL());
  }
  return { rig, bess, portrait, portraitURL };
})();
