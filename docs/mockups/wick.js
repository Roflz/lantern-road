'use strict';
// Old Wick, the lamp-keeper: a large pixel-art portrait for the guide's panel and bubbles.
// Drawn from shapes on a 40×54 grid, lit from the lantern he holds on the right, then outlined.
function wickPortrait() {
  const W = 40, H = 54, g = Array.from({ length: H }, () => new Array(W).fill(null));
  const P = { k: '#0d0911', h: '#4a3d5e', H: '#6c5c82', T: '#8a78a2', d: '#2a2238', D: '#18121f', c: '#352a46', C: '#4c3e62', s: '#eec4a0', S: '#d4a27e', r: '#a87458', e: '#1a1220', E: '#cfe6ff', w: '#f6efe0', W: '#d8ccb4', G: '#a89c88', l: '#2e2219', L: '#7a5a3a', y: '#f4a646', Y: '#ffe2a0', b: '#6b4a2e' };
  const put = (x, y, c) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < W && y < H) g[y][x] = c; };
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
  // the cloak over his shoulders, lit from the right
  poly([[1, 54], [4, 40], [11, 34], [30, 34], [37, 40], [39, 54]], (x, y) => put(x, y, x > 27 ? 'C' : x < 9 ? 'd' : 'c'));
  for (const fx of [10, 16, 23]) for (let y = 41; y < 54; y++) if ((y + fx) % 5) put(fx + Math.floor((y - 41) / 6), y, 'd');
  // the hood: a deep cowl, its rim catching the lantern light
  ell(20, 19, 15, 17, (x, y, dx) => put(x, y, dx > 0.55 ? 'H' : dx < -0.45 ? 'd' : 'h'));
  poly([[5, 21], [35, 21], [37, 37], [30, 35], [10, 35], [3, 37]], (x, y) => put(x, y, x > 28 ? 'H' : x < 11 ? 'd' : 'h'));
  for (let y = 5; y < 33; y++) { const dy = (y - 19) / 17; if (Math.abs(dy) < 1) put(Math.round(20 + 15 * Math.sqrt(1 - dy * dy)) - 1, y, 'T'); }
  // the dark inside the hood
  ell(22, 23, 10, 12, (x, y) => put(x, y, 'D'));
  // the face, turned a little to the right
  ell(22.5, 21, 7, 8.6, (x, y, dx) => put(x, y, dx < -0.45 ? 'S' : 's'));
  for (let y = 15; y < 28; y++) put(16, y, 'r');
  // white brows, bushy and drooping at the ends
  for (const [x, y] of [[16, 16], [17, 15], [18, 15], [19, 15], [20, 16], [23, 15], [24, 14], [25, 14], [26, 14], [27, 15], [28, 16], [29, 17]]) put(x, y, 'w');
  for (const [x, y] of [[17, 16], [18, 16], [24, 15], [25, 15], [26, 15], [27, 16]]) put(x, y, 'W');
  // eyes, with a glint of lantern light in the near one
  put(18, 18, 'e'); put(19, 18, 'e'); put(25, 18, 'e'); put(26, 18, 'e'); put(26, 17, 'E');
  put(18, 19, 'r'); put(25, 19, 'r'); put(26, 19, 'r'); put(27, 20, 'S');
  // the nose
  put(22, 18, 's'); put(22, 19, 's'); put(23, 20, 's'); put(23, 21, 's'); put(22, 21, 'r'); put(21, 20, 'S'); put(24, 22, 'S'); put(22, 22, 'r');
  // a long white beard and moustache, with strands and a shadowed left side
  poly([[14, 24], [31, 24], [31, 29], [28, 37], [24, 46], [21, 43], [17, 35], [14, 29]], (x, y) => put(x, y, x < 18 ? 'G' : (x + Math.floor(y / 2)) % 3 === 0 ? 'W' : 'w'));
  for (const [x, y] of [[15, 23], [16, 23], [17, 23], [18, 23], [19, 23], [20, 23], [21, 23], [22, 23], [23, 23], [24, 23], [25, 23], [26, 23], [27, 23], [28, 23], [29, 23], [14, 24], [30, 24], [31, 25], [13, 25]]) put(x, y, 'w');
  for (const [x, y] of [[21, 24], [22, 24], [23, 24]]) put(x, y, 'r');
  // the right hand, holding up his lantern
  ell(32.5, 31, 2.2, 1.8, (x, y) => put(x, y, 's'));
  put(31, 32, 'S'); put(32, 32, 'S');
  for (let y = 33; y <= 35; y++) put(33, y, 'l');
  for (let x = 30; x <= 36; x++) { put(x, 36, 'l'); put(x, 45, 'l'); }
  for (let y = 37; y <= 44; y++) { put(30, y, 'L'); put(36, y, 'L'); for (let x = 31; x <= 35; x++) put(x, y, 'y'); }
  for (const [x, y] of [[33, 39], [33, 40], [32, 41], [33, 41], [34, 41], [32, 42], [33, 42], [34, 42], [33, 43]]) put(x, y, 'Y');
  put(33, 46, 'l');
  // an outline round everything
  const out = g.map(r => r.slice());
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!g[y][x] && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => g[y + b] && g[y + b][x + a])) out[y][x] = 'k';
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const x = cv.getContext('2d');
  out.forEach((r, y) => r.forEach((c, i) => { if (c) { x.fillStyle = P[c]; x.fillRect(i, y, 1, 1); } }));
  cv.lamp = [33, 40];
  return cv;
}
