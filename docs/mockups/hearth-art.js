'use strict';
// Lantern Road mockups · the Hearth in detail (docs/darkest-dungeon-study.md §3; play-test note 1.29, 2026-11-04).
// Every building about three times today's size, with its own silhouette, lit windows and chimney smoke. They're
// drawn in code from a small kit (stone, timber, shingles, slate, windows, doors, chimneys, lanterns), in the game's
// palette: ink outlines, moonlit roof edges, firelight low on the walls. Each building is a canvas with .lights and
// .smoke points, for camp3d.js's building hook.
const HearthArt = (() => {
  const INK = '#0d0911';
  const C = {
    w0: '#1c140f', w1: '#2e2219', w2: '#45311f', w3: '#5a4030', w4: '#7a5a3a', w5: '#94704a',
    p0: '#4e463c', p1: '#6a6052', p2: '#857a66', p3: '#a39680', p4: '#c2b59c',
    s0: '#24242a', s1: '#34353c', s2: '#45474e', s3: '#5a5d64', s4: '#74777f', s5: '#93959c',
    r0: '#2a1216', r1: '#45202a', r2: '#5e2c32', r3: '#7c3c3e', r4: '#9a5450',
    t0: '#1a1b22', t1: '#272a34', t2: '#363a48', t3: '#4b5163', t4: '#646c82',
    h0: '#33281a', h1: '#4e3e24', h2: '#6a5630', h3: '#8a7040', h4: '#a88a50',
    c0: '#4a4236', c1: '#6e624c', c2: '#958664', c3: '#b9a984', c4: '#d8caa4',
    y0: '#8a4a1c', y1: '#d8822e', y2: '#f4a646', y3: '#ffd68a', y4: '#fff2cc',
    m1: '#5c5078', m2: '#7e70a0', m3: '#a294c4',
    x0: '#4a1418', x1: '#7a2226', x2: '#a83a2a', x3: '#d4584a',
    g0: '#6a4a14', g1: '#a8802a', g2: '#e8c24a', g3: '#fff0a0',
    v0: '#2a1c40', v1: '#4a2e78', v2: '#7a4ec0', v3: '#b48cf0', v4: '#e0ccff',
    b0: '#6a604e', b1: '#a89c80', b2: '#d8ccb0', b3: '#f2e8d0',
    i0: '#1a1a20', i1: '#2e3038', i2: '#4a4e58', i3: '#6e7480', i4: '#9aa0aa',
    e0: '#1c2414', e1: '#2c3a1c', e2: '#44582a', e3: '#5d7a34',
    q1: '#2a6a64', q2: '#4aa89a', q3: '#9ae8d8',
    road: '#6a4628', dark: '#15101c', glass: '#1e1828',
  };
  const hs = (a, b, c = 0) => { let n = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + Math.imul(c | 0, 1442695041)) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };

  // ── a painter: a canvas drawn in whole art pixels
  function painter(w, h) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d');
    const P = { c, g, w, h, lights: [], smoke: [] };
    P.rect = (x, y, ww, hh, col) => { if (ww > 0 && hh > 0) { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), Math.round(ww), Math.round(hh)); } return P; };
    P.px = (x, y, col) => P.rect(x, y, 1, 1, col);
    P.hl = (x0, x1, y, col) => P.rect(Math.min(x0, x1), y, Math.abs(x1 - x0) + 1, 1, col);
    P.vl = (x, y0, y1, col) => P.rect(x, Math.min(y0, y1), 1, Math.abs(y1 - y0) + 1, col);
    P.line = (x0, y0, x1, y1, col) => {
      x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
      g.fillStyle = col; const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy;
      for (;;) { g.fillRect(x0, y0, 1, 1); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
      return P;
    };
    // fill a polygon pixel by pixel, each pixel's colour from fn(x, y)
    P.pat = (pts, fn) => {
      const ys = pts.map(q => q[1]), y0 = Math.max(0, Math.floor(Math.min(...ys))), y1 = Math.min(h, Math.ceil(Math.max(...ys)));
      for (let y = y0; y < y1; y++) {
        const cy = y + 0.5, xs = [];
        for (let i = 0; i < pts.length; i++) { const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length]; if ((ay <= cy && by > cy) || (by <= cy && ay > cy)) xs.push(ax + ((cy - ay) / (by - ay)) * (bx - ax)); }
        xs.sort((a, b) => a - b);
        for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.ceil(xs[k] - 0.5); x <= Math.floor(xs[k + 1] - 0.5); x++) { const col = fn(x, y); if (col) { g.fillStyle = col; g.fillRect(x, y, 1, 1); } }
      }
      return P;
    };
    P.poly = (pts, col) => P.pat(pts, () => col);
    P.disc = (cx, cy, r, fn) => { for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) { const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy); if (d <= r) { const col = typeof fn === 'function' ? fn(x, y, d) : fn; if (col) P.px(x, y, col); } } return P; };
    P.dither = (x, y, ww, hh, col, ph = 0) => { g.fillStyle = col; for (let j = 0; j < hh; j++) for (let i = (j + ph) & 1; i < ww; i += 2) g.fillRect(x + i, y + j, 1, 1); return P; };
    P.light = (x, y, kind = 'y', r) => { P.lights.push([x, y, kind, r]); return P; };
    P.smokeAt = (x, y) => { P.smoke.push([x, y]); return P; };
    // icons from the game's UI_ICONS (7×7), at 1×
    P.icon = (name, x, y) => { const I = typeof UI_ICONS !== 'undefined' && UI_ICONS[name]; if (!I) return P; I.map.forEach((row, j) => [...row].forEach((ch, i) => { const col = I.pal[ch]; if (col) P.px(x + i, y + j, col); })); return P; };
    // the finish: firelight low on the walls, then an ink outline round the whole silhouette
    P.finish = (o = {}) => {
      g.save(); g.globalCompositeOperation = 'source-atop';
      const gr = g.createLinearGradient(0, h, 0, h * 0.4); gr.addColorStop(0, `rgba(244,140,60,${o.warm != null ? o.warm : 0.16})`); gr.addColorStop(1, 'rgba(244,140,60,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, h); g.restore();
      const d = g.getImageData(0, 0, w, h).data, A = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 40, out = [];
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!A(x, y) && (A(x - 1, y) || A(x + 1, y) || A(x, y - 1) || A(x, y + 1))) out.push([x, y]);
      g.fillStyle = INK; for (const [x, y] of out) g.fillRect(x, y, 1, 1);
      c.lights = P.lights; c.smoke = P.smoke; if (o.mirror) c.mirror = true;
      return c;
    };
    return P;
  }

  // ── the kit
  // Walls: coursed stone, timber frame with plaster, planks.
  function stone(P, x, y, w, h, o = {}) {
    const pal = o.pal || [C.s1, C.s2, C.s3, C.s4], ch = o.ch || 3, bw = o.bw || 5, seed = o.seed || 1;
    P.rect(x, y, w, h, pal[1]);
    for (let r = 0, row = 0; r < h; r += ch, row++) {
      const yy = y + r, last = Math.min(y + h - 1, yy + ch - 1);
      if (yy + ch - 1 <= y + h - 1) P.hl(x, x + w - 1, yy + ch - 1, pal[0]);
      const off = (row & 1) * Math.floor(bw / 2);
      for (let cx = x - off; cx < x + w; cx += bw) {
        if (cx > x) P.vl(cx, yy, Math.max(yy, last - 1), pal[0]);
        const a = Math.max(x, cx + 1), b = Math.min(x + w - 1, cx + bw - 1), q = hs(cx, row, seed);
        if (b >= a && q > 0.45) P.hl(a, b, yy, q > 0.8 ? pal[3] : pal[2]);
        else if (b >= a && q < 0.1 && ch > 2) P.hl(a, b, yy + 1, pal[0]);
      }
    }
    if (o.shade !== false) P.dither(x + w - 2, y, 2, h, 'rgba(13,9,17,.35)');
    return P;
  }
  function timber(P, x, y, w, h, o = {}) {
    const pal = o.pal || [C.p1, C.p2, C.p3], beam = o.beam || C.w1, step = o.step || 7;
    P.rect(x, y, w, h, pal[1]);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const q = hs(x + i, y + j, 5); if (q > 0.92) P.px(x + i, y + j, pal[2]); else if (q < 0.06) P.px(x + i, y + j, pal[0]); }
    P.hl(x, x + w - 1, y, beam); P.hl(x, x + w - 1, y + h - 1, beam);
    if (o.rail) P.hl(x, x + w - 1, y + o.rail, beam);
    const posts = []; for (let px = x; px < x + w - 1; px += step) posts.push(px); posts.push(x + w - 1);
    for (const px of posts) P.vl(px, y, y + h - 1, beam);
    if (o.braces) for (let i = 0; i < posts.length - 1; i++) { if ((i + (o.braceOff || 0)) % 2) continue; const a = posts[i], b = posts[i + 1], top = o.rail ? y + o.rail : y; if (b - a > 3) { if (i % 4 < 2) P.line(a + 1, y + h - 2, b - 1, top + 1, beam); else P.line(a + 1, top + 1, b - 1, y + h - 2, beam); } }
    P.dither(x, y + 1, w, 1, 'rgba(13,9,17,.5)');
    if (o.shade !== false) P.dither(x + w - 2, y, 2, h, 'rgba(13,9,17,.3)');
    return P;
  }
  function planks(P, x, y, w, h, o = {}) {
    const pal = o.pal || [C.w1, C.w2, C.w3];
    P.rect(x, y, w, h, pal[1]);
    for (let i = 0; i < w; i++) { if (i % 3 === 0) P.vl(x + i, y, y + h - 1, pal[0]); else if (hs(x + i, 3, 9) > 0.7) P.vl(x + i, y, y + h - 1, pal[2]); }
    for (let j = 4; j < h; j += 7) P.hl(x, x + w - 1, y + j, pal[0]);
    return P;
  }

  // Roofs, as index patterns (0 darkest to 3 lightest) over a palette; the far side of a gable a shade darker.
  const RP = {
    shingle: { c: [C.r1, C.r2, C.r3, C.r4], edge: C.r0 },
    slate: { c: [C.t1, C.t2, C.t3, C.t4], edge: C.t0 },
    thatch: { c: [C.h1, C.h2, C.h3, C.h4], edge: C.h0 },
    lead: { c: [C.s1, C.s2, C.s3, C.s4], edge: C.s0 },
    canvas: { c: [C.c1, C.c2, C.c3, C.c4], edge: C.c0 },
  };
  const PATF = {
    shingle: (x, r) => { const row = Math.floor(r / 3), k = r % 3; if (k === 2) return 0; if ((x + row * 2) % 4 === 0) return 0; const q = hs(x >> 2, row, 11); return k === 0 ? (q > 0.5 ? 3 : 2) : (q > 0.35 ? 2 : 1); },
    slate: (x, r) => { const row = r >> 1; if (r & 1) return 0; if ((x + (row & 1) * 2) % 4 === 0) return 1; return hs(x >> 2, row, 13) > 0.65 ? 3 : 2; },
    thatch: (x, r) => { const q = hs(x, r >> 1, 17); if (r % 4 === 3 && q > 0.3) return 0; return q > 0.7 ? 3 : q > 0.3 ? 2 : 1; },
    lead: (x, r) => (x % 5 === 0 ? 1 : r % 6 === 5 ? 1 : 2),
    canvas: (x, r) => (x % 4 === 0 ? 1 : r < 3 ? 3 : 2),
  };
  // a gable (or a pyramid or cone, seen from the front): eaves from x0 to x1 on row yE, apex on row aY
  function roofGable(P, x0, x1, yE, aY, o = {}) {
    const R = RP[o.pat || 'shingle'], f = PATF[o.pat || 'shingle'], ax = (x0 + x1) / 2, n = yE - aY;
    for (let y = aY; y <= yE; y++) {
      const k = n ? (y - aY) / n : 1, xl = Math.round(ax - (ax - x0) * k), xr = Math.round(ax + (x1 - ax) * k);
      for (let x = xl; x <= xr; x++) { let v = f(x, y - aY); if (x > ax + 0.5) v = Math.max(0, v - 1); P.px(x, y, R.c[v]); }
    }
    P.line(x0, yE, Math.floor(ax), aY, o.rim === false ? R.edge : C.m2);
    P.line(Math.ceil(ax), aY, x1, yE, R.edge);
    P.hl(x0, x1, yE, R.edge);
    return ax;
  }
  // a roof seen from its long side: a band from the eaves (x0 to x1 on row yE) up to the ridge on row yT, hipped in
  // by `inset` at each end
  function roofBand(P, x0, x1, yE, yT, inset, o = {}) {
    const R = RP[o.pat || 'shingle'], f = PATF[o.pat || 'shingle'], n = yE - yT;
    for (let y = yT; y <= yE; y++) {
      const k = n ? (y - yT) / n : 1, xl = Math.round(x0 + inset * (1 - k)), xr = Math.round(x1 - inset * (1 - k));
      for (let x = xl; x <= xr; x++) { let v = f(x, y - yT); if (x > xr - inset * (1 - k) - 1 && inset) v = Math.max(0, v - 1); if (x < xl + inset * (1 - k) + 1 && inset) v = Math.min(3, v + 1); P.px(x, y, R.c[v]); }
    }
    P.hl(x0 + inset, x1 - inset, yT, C.m2);
    P.line(x0, yE, x0 + inset, yT, C.m2); P.line(x1 - inset, yT, x1, yE, R.edge);
    P.hl(x0, x1, yE, R.edge);
  }
  // A window: lit unless o.dark. Arched windows keep the wall's corners.
  function win(P, x, y, w, h, o = {}) {
    const fr = o.frame || C.w1;
    if (o.arch) { P.rect(x - 1, y, w + 2, h + 1, fr); P.rect(x, y - 1, w, 1, fr); }
    else P.rect(x - 1, y - 1, w + 2, h + 2, fr);
    const top = o.arch ? y + 1 : y, hh = o.arch ? h - 1 : h;
    if (o.dark) { P.rect(x, top, w, hh, C.glass); if (o.arch && w > 2) P.rect(x + 1, y, w - 2, 1, C.glass); P.px(x, top, C.m1); }
    else {
      const lo = o.violet ? C.v2 : C.y1, mid = o.violet ? C.v3 : C.y2, hi = o.violet ? C.v4 : C.y3;
      P.rect(x, top, w, hh, mid); if (o.arch && w > 2) P.rect(x + 1, y, w - 2, 1, mid);
      P.rect(x, top + hh - 1, w, 1, lo); P.px(x, top, hi); if (w > 2) P.px(x + 1, top, hi);
      if (o.mullion !== false && w >= 3) P.vl(x + (w >> 1), top, top + hh - 1, C.w2);
      if (o.mullion !== false && h >= 5) P.hl(x, x + w - 1, top + (hh >> 1), C.w2);
      P.light(x + w / 2 - 0.5, y + h / 2 - 0.5, o.violet ? 'v' : 'y', o.r || Math.max(4, Math.max(w, h)));
    }
    if (o.sill !== false) P.hl(x - 1, x + w, y + h, C.s4);
    if (o.shutters) { P.rect(x - 3, y - 1, 2, h + 2, C.w3); P.rect(x + w + 1, y - 1, 2, h + 2, C.w3); P.vl(x - 3, y - 1, y + h, C.w2); P.vl(x + w + 2, y - 1, y + h, C.w2); }
    return P;
  }
  function door(P, x, y, w, h, o = {}) {
    if (o.arch) { P.rect(x - 1, y, w + 2, h, C.w0); P.rect(x, y - 1, w, 1, C.w0); } else P.rect(x - 1, y - 1, w + 2, h + 1, C.w0);
    const top = o.arch ? y + 1 : y;
    P.rect(x, top, w, y + h - top, o.open ? C.y1 : C.w2); if (o.arch && w > 2) P.rect(x + 1, y, w - 2, 1, o.open ? C.y1 : C.w2);
    if (o.open) { P.rect(x, y + h - 2, w, 2, C.y2); P.light(x + w / 2 - 0.5, y + h / 2, 'y', o.r || 8); }
    else { for (let i = x + 1; i < x + w; i += 2) P.vl(i, top, y + h - 1, C.w1); P.px(x + w - 2, y + (h >> 1), C.g1); }
    return P;
  }
  function chimney(P, x, y, w, h) { stone(P, x, y + 1, w, h - 1, { ch: 2, bw: 3, seed: x + 50, shade: false }); P.rect(x - 1, y, w + 2, 1, C.s4); P.smokeAt(x + (w - 1) / 2, y - 1); return P; }
  function lantern(P, x, y, o = {}) { P.px(x, y, C.i1); P.rect(x - 1, y + 1, 3, 1, C.i1); P.rect(x - 1, y + 2, 3, 2, C.y3); P.px(x, y + 2, C.y4); P.rect(x - 1, y + 4, 3, 1, C.i1); P.light(x, y + 3, 'y', o.r || 7); return P; }
  function torch(P, x, y, o = {}) { P.vl(x, y + 3, o.bot || y + 12, C.w2); P.rect(x - 1, y + 2, 3, 1, C.w1); P.px(x, y, C.y4); P.rect(x - 1, y + 1, 3, 1, C.y2); P.px(x, y - 1, C.y3); P.light(x, y, 'y', o.r || 10); return P; }
  // a sign: an iron bracket from the wall at (x, y), and a board with the building's icon hanging from it
  function sign(P, x, y, icon, o = {}) {
    const dir = o.dir || -1, len = o.len || 6, x2 = x + dir * len, bx = Math.round(x2 - 4);
    P.hl(Math.min(x, x2), Math.max(x, x2), y, C.i1); P.px(x, y + 1, C.i1);
    P.px(bx + 1, y + 1, C.i2); P.px(bx + 7, y + 1, C.i2);
    P.rect(bx, y + 2, 9, 9, C.w3); P.hl(bx, bx + 8, y + 2, C.w4); P.hl(bx, bx + 8, y + 10, C.w1);
    P.icon(icon, bx + 1, y + 3);
    return P;
  }
  function barrel(P, x, y) { P.rect(x, y + 1, 5, 4, C.w3); P.rect(x + 1, y, 3, 6, C.w3); P.hl(x, x + 4, y + 1, C.i2); P.hl(x, x + 4, y + 4, C.i2); P.vl(x + 1, y + 1, y + 4, C.w4); P.vl(x + 4, y + 1, y + 4, C.w2); return P; }
  function crate(P, x, y, w = 6, h = 5) { P.rect(x, y, w, h, C.w3); P.hl(x, x + w - 1, y, C.w4); P.line(x, y + h - 1, x + w - 1, y, C.w2); P.hl(x, x + w - 1, y + h - 1, C.w2); P.vl(x + w - 1, y, y + h - 1, C.w2); return P; }
  function sack(P, x, y) { P.rect(x, y + 1, 4, 4, C.c2); P.rect(x + 1, y, 2, 1, C.c1); P.px(x + 1, y + 1, C.c3); P.px(x + 3, y + 4, C.c1); return P; }
  function skull(P, x, y) { P.rect(x, y, 3, 2, C.b2); P.px(x, y + 1, C.w0); P.px(x + 2, y + 1, C.w0); P.px(x + 1, y + 2, C.b1); return P; }

  // ── the buildings
  const B = {};
  B.toll = () => {
    const P = painter(48, 42), G = 41;
    chimney(P, 39, 1, 3, 11);
    stone(P, 4, 14, 11, G - 13, { seed: 3 }); stone(P, 33, 14, 11, G - 13, { seed: 4 });
    roofGable(P, 2, 16, 14, 6, { pat: 'slate' }); roofGable(P, 31, 45, 14, 6, { pat: 'slate' });
    // the arch through, with the road under it
    stone(P, 15, 27, 18, G - 26, { seed: 5, shade: false });
    P.rect(17, 31, 14, G - 30, C.dark); P.rect(18, 30, 12, 1, C.dark); P.rect(19, 29, 10, 1, C.dark);
    P.hl(19, 28, 28, C.s4); P.px(18, 29, C.s4); P.px(29, 29, C.s4); P.px(17, 30, C.s4); P.px(30, 30, C.s4); P.vl(16, 31, G, C.s3); P.vl(31, 31, G, C.s3); P.rect(23, 27, 2, 2, C.s5);
    P.rect(17, G - 1, 14, 2, C.road); P.hl(19, 28, G - 2, '#4a3020');
    P.vl(24, 30, 31, C.i1); lantern(P, 24, 31, { r: 11 });
    // the room over the arch
    timber(P, 15, 16, 18, 12, { step: 6, braces: true });
    win(P, 18, 19, 3, 4); win(P, 27, 19, 3, 4);
    roofGable(P, 12, 35, 16, 4, { pat: 'shingle' });
    P.disc(23.5, 11.5, 2.6, (x, y, d) => (d > 1.8 ? C.g0 : C.g2)); P.px(23, 10, C.g3);
    // arrow slits in the towers
    win(P, 9, 19, 1, 4, { sill: false }); win(P, 38, 19, 1, 4, { sill: false }); win(P, 9, 30, 1, 3, { dark: true, sill: false });
    // the toll bar across the road, on its post, with a counterweight
    P.rect(8, 30, 2, G - 29, C.w1); P.px(8, 30, C.w3); P.rect(5, 31, 3, 3, C.s3); P.hl(5, 7, 31, C.s5);
    for (let i = 10; i <= 39; i++) { const red = Math.floor((i - 10) / 3) % 2 === 0; P.px(i, 32, red ? C.x3 : C.b3); P.px(i, 33, red ? C.x1 : C.b1); }
    P.vl(39, 34, G, C.w1); P.px(38, 34, C.w1); P.px(40, 34, C.w1);
    return P.finish();
  };
  B.infirmary = () => {
    const P = painter(52, 38), G = 37;
    // a canvas tent: walls and roof in shadow, the lamp inside glowing through near the door
    const tent = (x0, x1, aY, yE) => {
      const ax = (x0 + x1) / 2;
      P.rect(x0 + 1, yE, x1 - x0 - 1, G - yE + 1, C.c1);
      for (let x = x0 + 1; x < x1; x++) { if ((x - x0) % 4 === 0) P.vl(x, yE, G, C.c0); else if (x < ax) P.vl(x, yE, G, (x - x0) % 4 === 1 ? C.c2 : C.c1); }
      roofGable(P, x0, x1, yE, aY, { pat: 'canvas' });
      for (let x = x0; x <= x1; x++) if ((x - x0) % 3 !== 1) P.px(x, yE + 1, C.c0);
      return ax;
    };
    const glowAt = (cx, cy, r, a) => { const g = P.g; g.save(); g.globalCompositeOperation = 'source-atop'; const gr = g.createRadialGradient(cx, cy, 0, cx, cy, r); gr.addColorStop(0, `rgba(255,178,92,${a})`); gr.addColorStop(1, 'rgba(255,178,92,0)'); g.fillStyle = gr; g.fillRect(0, 0, P.w, P.h); g.restore(); };
    // the ward behind, its stove pipe smoking
    P.rect(43, 5, 2, 9, C.i1); P.px(42, 5, C.i2); P.px(45, 5, C.i2); P.smokeAt(43.5, 4);
    tent(32, 50, 10, 20);
    win(P, 39, 25, 4, 4, { frame: C.c0, sill: false });
    glowAt(41, 27, 10, 0.4);
    // the main tent
    const ax = tent(3, 38, 2, 15);
    glowAt(20.5, 33, 19, 0.62);
    // the door: flaps tied back, the ward lit inside, a cot
    P.pat([[16, G + 1], [16, 25], [20.5, 21], [25, 25], [25, G + 1]], (x, y) => (y > G - 3 ? C.y2 : y > 30 ? C.y1 : C.y0));
    P.rect(17, 31, 7, 2, C.b2); P.hl(17, 23, 31, C.b3); P.vl(17, 33, 35, C.w1); P.vl(23, 33, 35, C.w1);
    P.pat([[13, G + 1], [16, 24], [17, G + 1]], () => C.c3); P.pat([[24, G + 1], [25, 24], [28, G + 1]], () => C.c3);
    P.line(16, 24, 20, 21, C.c0); P.line(21, 21, 25, 24, C.c0); P.px(14, 31, C.w2); P.px(26, 31, C.w2);
    P.light(20.5, 31, 'y', 13); P.light(9, 28, 'y', 6); P.light(32, 28, 'y', 6);
    // the red cross on the roof, and a pennant on the pole
    P.rect(ax - 1, 6, 3, 7, C.x2); P.rect(ax - 3, 8, 7, 3, C.x2); P.px(ax - 1, 6, C.x3); P.px(ax - 3, 8, C.x3);
    P.vl(Math.round(ax), 0, 2, C.w1); P.rect(Math.round(ax) + 1, 0, 4, 2, C.x2); P.px(Math.round(ax) + 5, 1, C.x2);
    // guy ropes and pegs
    P.line(3, 15, 0, G, C.w2); P.line(38, 15, 41, G, C.w2); P.line(50, 20, 51, G, C.w2);
    return P.finish({ warm: 0.06 });
  };
  B.yard = () => {
    const P = painter(52, 38), G = 31, OY = 6;
    P.g.translate(0, OY);
    // the weapon rack at the back
    for (const x of [30, 31, 33, 35, 37]) { P.vl(x, 6, 26, C.w4); P.px(x, 5, C.i3); P.px(x, 4, C.i4); }
    P.vl(34, 9, 24, C.i3); P.vl(34, 8, 8, C.i4); P.rect(33, 24, 3, 1, C.g1); P.vl(36, 11, 24, C.i3); P.rect(35, 24, 3, 1, C.g1);
    P.rect(28, 12, 12, 1, C.w2); P.rect(28, 25, 12, 1, C.w2); P.vl(28, 10, G, C.w1); P.vl(39, 10, G, C.w1);
    // the archery target
    P.line(43, 22, 41, G, C.w2); P.line(46, 22, 48, G, C.w2); P.vl(44, 22, G, C.w1);
    P.disc(44.5, 16.5, 5, (x, y, d) => (d < 1.2 ? C.y3 : d < 2.4 ? C.x2 : d < 3.6 ? C.c3 : d < 4.4 ? C.x1 : C.w2));
    P.line(46, 15, 49, 13, C.w4); P.px(49, 12, C.b2);
    // two straw men on posts, painted targets on their chests
    for (const [cx, lean] of [[9, 0], [21, 1]]) {
      P.vl(cx, 8, G, C.w2); P.hl(cx - 5, cx + 5, 12, C.w3); P.px(cx - 6, 12, C.h4); P.px(cx + 6, 12, C.h4); P.px(cx - 6, 13, C.h3); P.px(cx + 6, 13, C.h3);
      P.rect(cx - 3, 10, 7, 10, C.h3); P.vl(cx - 3, 11, 18, C.h4); P.vl(cx + 3, 11, 18, C.h2); P.hl(cx - 2, cx + 2, 20, C.h2);
      P.hl(cx - 3, cx + 3, 10, C.w1); P.hl(cx - 3, cx + 3, 19, C.w1);
      P.disc(cx + 0.5, 15.5, 2.2, (x, y, d) => (d < 0.9 ? C.c3 : d < 1.8 ? C.x2 : null));
      P.rect(cx - 2, 4, 5, 5, C.c2); P.hl(cx - 2, cx + 2, 4, C.c3); P.vl(cx + 2, 5, 8, C.c1); P.hl(cx - 1, cx + 1, 9, C.w1);
      if (lean) P.line(cx + 4, 13, cx + 8, 9, C.w4);
    }
    // a torch, and the fence in front with its gate open
    torch(P, 2, 8, { bot: G, r: 12 });
    for (let x = 4; x <= 49; x += 6) { if (x > 22 && x < 30) continue; P.rect(x, 23, 2, G - 22, C.w2); P.px(x, 23, C.w4); }
    for (const y of [25, 28]) { P.hl(4, 23, y, C.w3); P.hl(29, 50, y, C.w3); }
    P.hl(4, 23, 24, C.w4);
    P.g.setTransform(1, 0, 0, 1, 0, 0); P.lights.forEach(l => (l[1] += OY));
    // the yard's banner on a tall pole
    P.vl(26, 1, 30, C.w2); P.px(26, 0, C.g2);
    P.pat([[27, 2], [35, 2], [33, 4.5], [35, 7], [27, 7]], (x, y) => (y < 4 ? C.x3 : C.x2)); P.px(29, 4, C.g2); P.px(30, 4, C.g2);
    return P.finish();
  };
  B.shop = () => {
    const P = painter(50, 46), G = 45;
    chimney(P, 35, 1, 3, 12);
    stone(P, 5, 29, 38, G - 28, { seed: 7 });
    timber(P, 4, 16, 40, 13, { step: 8, braces: true, braceOff: 1 });
    win(P, 9, 19, 4, 5, { shutters: true }); win(P, 35, 19, 4, 5, { shutters: true });
    roofGable(P, 2, 46, 16, 2, { pat: 'shingle' });
    win(P, 22, 8, 4, 4);
    // the counter, lit, with its wares, under a striped awning
    P.rect(7, 31, 24, 9, C.w1); P.rect(8, 32, 22, 7, C.y1); P.rect(8, 32, 22, 3, C.y2);
    P.rect(10, 34, 2, 3, C.x1); P.rect(13, 33, 2, 4, C.e2); P.px(13, 32, C.e3); P.rect(17, 35, 3, 2, C.c3); P.rect(22, 34, 2, 3, C.v2); P.px(22, 33, C.v3); P.rect(26, 33, 2, 4, C.b2);
    P.light(19, 35, 'y', 14);
    P.rect(7, 39, 24, 2, C.w4); P.rect(7, 41, 24, 4, C.w2); P.hl(7, 30, 41, C.w1);
    for (let x = 5; x <= 33; x++) { const red = Math.floor((x - 5) / 3) % 2 === 0; P.vl(x, 27, 29, red ? C.x2 : C.b2); if ((x - 5) % 3 !== 1) P.px(x, 30, red ? C.x1 : C.b1); }
    P.hl(5, 33, 27, C.x3);
    door(P, 34, 32, 6, G - 31);
    P.vl(42, 29, 30, C.i1); lantern(P, 42, 30);
    barrel(P, 43, 39); crate(P, 43, 35, 6, 4);
    sign(P, 4, 18, 'bag', { dir: -1, len: 1 });
    return P.finish();
  };
  B.tactician = () => {
    const P = painter(34, 62), G = 61;
    // the map room at its foot
    stone(P, 22, 44, 10, G - 43, { seed: 9 });
    P.pat([[21, 45], [33, 40], [33, 43], [21, 47]], (x, y) => (PATF.slate(x, y) ? C.t3 : C.t1)); P.line(21, 45, 32, 40, C.m2);
    win(P, 26, 49, 3, 4);
    // the tower, round: lighter on the left, dark on the right
    stone(P, 8, 22, 16, G - 21, { seed: 8, bw: 4, shade: false });
    P.vl(8, 22, G, C.s4); P.dither(19, 22, 5, G - 21, 'rgba(13,9,17,.35)'); P.rect(22, 22, 2, G - 21, 'rgba(13,9,17,.35)');
    // the gallery on its corbels
    P.rect(6, 18, 20, 3, C.s3); P.hl(6, 25, 18, C.s4); P.hl(6, 25, 20, C.s1);
    for (let x = 7; x < 25; x += 3) { P.rect(x, 21, 2, 2, C.s2); P.px(x, 21, C.s3); }
    for (let x = 7; x < 25; x += 4) P.px(x, 17, C.s4);
    // the cone, and the pennant
    const ax = roofGable(P, 5, 26, 18, 5, { pat: 'slate' });
    P.vl(Math.floor(ax), 0, 4, C.i2); P.rect(Math.floor(ax) + 1, 0, 6, 3, C.x2); P.px(Math.floor(ax) + 7, 0, C.x2); P.px(Math.floor(ax) + 7, 2, C.x2); P.hl(Math.floor(ax) + 1, Math.floor(ax) + 6, 0, C.x3);
    win(P, 14, 27, 4, 7, { arch: true, r: 7 }); win(P, 15, 40, 2, 3);
    door(P, 13, 52, 6, G - 51, { arch: true });
    P.vl(21, 49, 50, C.i1); lantern(P, 21, 50);
    return P.finish();
  };
  B.scav = () => {
    const P = painter(50, 32), G = 31;
    // a back wall of salvaged planks
    for (let x = 4; x <= 31; x += 3) { const top = 9 + Math.round(hs(x, 1, 21) * 5); P.rect(x, top, 3, G - top + 1, hs(x, 2, 21) > 0.5 ? C.w3 : C.w2); P.vl(x, top, G, C.w1); if (hs(x, 4, 21) > 0.6) P.px(x + 1, top + 3, C.i3); }
    // the patched tarp, on two crooked posts
    P.vl(3, 9, G, C.w1); P.vl(34, 14, G, C.w1); P.vl(35, 14, G, C.w2);
    P.pat([[0, 7], [37, 13], [37, 17], [1, 11]], (x, y) => { const pt = (x > 8 && x < 15 && y > 8) ? C.x1 : (x > 22 && x < 28) ? C.c2 : C.c1; return (x + y) % 5 === 0 ? C.c0 : pt; });
    P.line(0, 7, 37, 13, C.m2); P.line(1, 11, 37, 17, C.c0);
    for (let x = 2; x < 36; x += 4) P.px(x, 12 + Math.round(x / 6), C.c0);
    // bones heaped under it, sacks, a hanging lantern
    for (let i = 0; i < 26; i++) { const bx = 6 + Math.round(hs(i, 7, 23) * 22), by = G - Math.round(hs(i, 8, 23) * 5); P.hl(bx, bx + 2, by, i % 3 ? C.b2 : C.b1); if (i % 4 === 0) P.px(bx + 3, by - 1, C.b3); }
    skull(P, 12, 22); skull(P, 24, 24);
    sack(P, 27, 24); sack(P, 7, 25);
    P.vl(19, 13, 15, C.i1); lantern(P, 19, 15, { r: 9 });
    // a barrow full of finds, and a skull on a pole
    P.rect(36, 22, 10, 5, C.w3); P.hl(36, 45, 22, C.w4); P.hl(37, 44, 21, C.b2); P.px(39, 20, C.b3); P.px(42, 20, C.i3); P.px(43, 20, C.i3);
    P.disc(39.5, 28.5, 2.3, (x, y, d) => (d > 1.4 ? C.w1 : C.w3)); P.line(45, 24, 49, 29, C.w2);
    P.vl(47, 6, G, C.w2); skull(P, 46, 3); P.px(47, 6, C.w2);
    return P.finish();
  };
  B.barracks = () => {
    const P = painter(54, 40), G = 39;
    chimney(P, 10, 1, 3, 11); chimney(P, 41, 1, 3, 11);
    stone(P, 3, 25, 48, G - 24, { seed: 11 });
    timber(P, 3, 14, 48, 11, { step: 6, braces: true });
    roofBand(P, 1, 52, 14, 4, 6, { pat: 'shingle' });
    // a dormer, and a weathervane on the ridge
    P.rect(23, 6, 8, 6, C.p2); roofGable(P, 22, 31, 7, 2, { pat: 'shingle' }); win(P, 25, 8, 3, 3, { sill: false });
    P.vl(37, 1, 4, C.i2); P.hl(35, 39, 1, C.i2); P.px(39, 0, C.i3);
    for (const x of [7, 13, 39, 45]) win(P, x, 17, 2, 4, { dark: x === 39 });
    for (const x of [7, 14, 37, 44]) win(P, x, 29, 3, 5, { dark: x === 44 });
    door(P, 23, 30, 8, G - 29); P.vl(27, 30, G, C.w1);
    // shields hung on the front
    for (const [x, col] of [[20, C.x2], [34, C.q1]]) { P.disc(x + 0.5, 27.5, 2.4, (px, py, d) => (d > 1.6 ? C.i2 : col)); P.px(x, 27, C.g2); }
    return P.finish();
  };
  B.pit = () => {
    const P = painter(48, 40), G = 39;
    // scrap heaped on the right: a helm, a shield, blades
    P.disc(40.5, 35.5, 5, (x, y, d) => (y < 31 ? null : hs(x, y, 31) > 0.5 ? C.i2 : C.w2));
    P.rect(37, 31, 4, 3, C.i3); P.hl(37, 40, 31, C.i4); P.px(38, 32, C.i0);
    P.disc(44.5, 31.5, 2.2, (x, y, d) => (d > 1.4 ? C.i1 : C.x1)); P.line(35, 30, 39, 26, C.i3);
    // the pit, planks across it
    P.disc(19.5, G - 1, 14, (x, y, d) => (y < G - 4 ? null : d > 12.5 ? C.w2 : d > 11 ? C.w1 : C.dark));
    P.rect(4, G - 4, 31, 1, C.w2);
    P.hl(12, 27, G - 3, C.w4); P.hl(12, 27, G - 2, C.w2);
    // the A-frame crane, its boom, the rope and bucket
    P.line(9, G - 3, 19, 6, C.w2); P.line(10, G - 3, 20, 6, C.w3); P.line(30, G - 3, 20, 6, C.w2); P.line(29, G - 3, 19, 6, C.w1);
    P.hl(13, 26, 24, C.w2); P.line(20, 6, 41, 10, C.w3); P.line(20, 7, 41, 11, C.w1); P.px(41, 10, C.i2);
    P.vl(40, 12, 21, C.b0); P.rect(38, 22, 5, 4, C.w3); P.hl(38, 42, 22, C.i3); P.px(40, 21, C.i2);
    P.rect(12, 28, 6, 4, C.w3); P.disc(15, 30, 1.6, C.w1); P.line(17, 29, 19, 27, C.i2);
    P.vl(20, 13, 14, C.i1); lantern(P, 20, 14, { r: 9 });
    P.light(19.5, G - 2, 'y', 6);
    return P.finish();
  };
  B.hall = () => {
    const P = painter(52, 46), G = 45;
    stone(P, 5, 21, 42, 19, { pal: [C.s0, C.s1, C.s2, C.s3], seed: 12, shade: false });
    win(P, 11, 25, 3, 9, { arch: true, r: 7 }); win(P, 38, 25, 3, 9, { arch: true, r: 7 });
    door(P, 22, 27, 8, 13, { arch: true, open: true, r: 12 });
    for (const x of [6, 17, 32, 43]) { P.rect(x, 21, 3, 19, C.s4); P.vl(x, 21, 39, C.s5); P.vl(x + 2, 21, 39, C.s2); P.rect(x - 1, 20, 5, 1, C.s5); P.rect(x - 1, 39, 5, 1, C.s3); }
    P.rect(4, 16, 44, 4, C.s3); P.hl(4, 47, 16, C.s4); P.hl(4, 47, 19, C.s1); for (let x = 5; x < 47; x += 2) P.px(x, 18, C.s2);
    // the pediment, with a gold star in it
    P.pat([[3, 16], [26, 4], [49, 16]], (x, y) => (y > 14 ? C.s2 : C.s3)); P.line(3, 15, 25, 4, C.m2); P.line(26, 4, 48, 15, C.s0); P.line(5, 15, 25, 6, C.s4);
    P.icon('star', 22, 8);
    P.vl(26, 1, 3, C.g1); P.px(26, 0, C.g3);
    // the steps, with braziers each side
    P.rect(4, 40, 44, 1, C.s4); P.rect(3, 41, 46, 2, C.s3); P.rect(2, 43, 48, 3, C.s2); P.hl(2, 49, 43, C.s4);
    for (const x of [1, 48]) { P.rect(x, 37, 3, 4, C.i1); P.hl(x - 1, x + 3, 37, C.i2); P.px(x + 1, 35, C.y3); P.rect(x, 36, 3, 1, C.y2); P.light(x + 1, 35, 'y', 9); }
    return P.finish();
  };
  B.shrine = () => {
    const P = painter(38, 52), G = 51;
    stone(P, 7, 25, 24, G - 24, { seed: 13 });
    P.rect(5, 38, 3, G - 37, C.s3); P.rect(30, 38, 3, G - 37, C.s2); P.hl(5, 7, 38, C.s4); P.hl(30, 32, 38, C.s4);
    const ax = roofGable(P, 3, 34, 25, 7, { pat: 'slate' });
    // the finial: a gold lantern on a spike
    P.vl(Math.round(ax), 3, 7, C.g1); P.rect(Math.round(ax) - 1, 1, 3, 3, C.g2); P.px(Math.round(ax), 2, C.g3); P.px(Math.round(ax), 0, C.g1);
    // the rose window
    P.disc(19, 31.5, 4.5, (x, y, d) => (d > 3.6 ? C.s4 : d < 1.2 ? C.y3 : ((Math.atan2(y + 0.5 - 31.5, x + 0.5 - 19) * 4 / Math.PI + 8) | 0) % 2 ? C.v2 : C.y2));
    P.light(19, 31.5, 'v', 9); P.light(19, 31.5, 'y', 5);
    door(P, 16, 40, 6, G - 39, { arch: true });
    P.hl(14, 23, G, C.s4);
    for (const x of [12, 25]) { P.vl(x, G - 3, G - 1, C.b3); P.px(x, G - 4, C.y3); P.light(x, G - 4, 'y', 5); }
    return P.finish();
  };
  B.whet = () => {
    const P = painter(48, 42), G = 41;
    planks(P, 4, 14, 37, G - 13, { pal: [C.w0, C.w1, C.w2] });
    // tools on the back wall
    P.line(29, 17, 29, 23, C.i3); P.hl(28, 30, 17, C.i3); P.line(33, 17, 35, 23, C.i2); P.line(35, 17, 33, 23, C.i2);
    // the forge, its hood, the fire
    stone(P, 6, 28, 12, G - 27, { seed: 15 });
    P.rect(9, 31, 6, 5, C.y2); P.rect(9, 34, 6, 2, C.y1); P.rect(10, 31, 4, 2, C.y3); P.px(11, 32, C.y4); P.light(12, 33, 'y', 15);
    P.pat([[6, 28], [8, 20], [16, 20], [18, 28]], (x, y) => (x > 15 ? C.s1 : y % 3 ? C.s3 : C.s2));
    roofBand(P, 1, 44, 14, 7, 3, { pat: 'slate' });
    chimney(P, 10, 0, 4, 20);
    // the anvil on its stump, and the grindstone
    P.rect(22, 37, 6, 5, C.w2); P.hl(22, 27, 37, C.w4);
    P.rect(21, 33, 8, 2, C.i2); P.hl(21, 28, 33, C.i4); P.px(20, 33, C.i2); P.rect(23, 35, 4, 2, C.i1);
    P.disc(37.5, 31.5, 4.4, (x, y, d) => (d < 1 ? C.w1 : d > 3.6 ? C.s1 : x < 37 ? C.s4 : C.s3));
    P.line(33, 36, 32, G, C.w2); P.line(42, 36, 43, G, C.w2); P.rect(34, 37, 8, 2, C.w3);
    // the posts at the front, and sparks
    P.vl(2, 14, G, C.w1); P.vl(3, 14, G, C.w2); P.vl(43, 14, G, C.w1);
    for (const [x, y] of [[13, 26], [15, 24], [11, 23], [17, 21]]) P.px(x, y, C.y3);
    return P.finish();
  };
  B.ossuary = () => {
    const P = painter(42, 42), G = 41;
    stone(P, 5, 17, 32, G - 16, { pal: [C.s0, C.s1, C.s2, C.s3], seed: 14 });
    // the vault
    P.disc(21, 17.5, 16.5, (x, y, d) => (y > 17 ? null : d > 15.6 ? C.t0 : (x % 4 === 0 ? C.t1 : x > 24 ? C.t2 : C.t3)));
    for (let x = 5; x <= 37; x++) { const top = 17.5 - Math.sqrt(Math.max(0, 16.5 * 16.5 - (x + 0.5 - 21) ** 2)); if (x < 21) P.px(x, Math.ceil(top), C.m2); }
    P.vl(21, 0, 2, C.b1); P.hl(20, 22, 1, C.b1);
    // niches with skulls
    for (const x of [8, 14, 25, 31]) { P.rect(x, 20, 3, 4, C.dark); P.px(x + 1, 19, C.dark); skull(P, x, 21); }
    // the gate, a cold light behind it
    P.rect(15, 27, 12, G - 26, C.q1); P.rect(16, 26, 10, 1, C.q1); P.rect(17, 25, 8, 1, C.s3);
    P.rect(17, 30, 8, G - 29, C.q2); P.px(20, 32, C.q3); P.px(21, 32, C.q3);
    for (let x = 15; x <= 26; x += 2) P.vl(x, 26, G, C.i1); P.hl(15, 26, 30, C.i1);
    P.light(21, 33, 'g', 11);
    for (let i = 0; i < 10; i++) { const bx = i < 5 ? 6 + i * 2 : 28 + (i - 5) * 2; P.hl(bx, bx + 1, G - (i % 3), C.b1); }
    return P.finish({ warm: 0.1 });
  };
  B.hexing = () => {
    const P = painter(36, 48), G = 47;
    const stoneShape = (pts, seed) => P.pat(pts, (x, y) => { const q = hs(x >> 1, y >> 1, seed); return x < pts[1][0] + 2 ? (q > 0.6 ? C.s4 : C.s3) : q > 0.7 ? C.s3 : C.s2; });
    stoneShape([[2, G + 1], [3, 28], [6, 24], [9, 27], [10, G + 1]], 41);
    stoneShape([[26, G + 1], [27, 23], [30, 20], [33, 24], [34, G + 1]], 42);
    stoneShape([[12, G + 1], [11, 20], [13, 8], [17, 3], [21, 6], [23, 18], [24, G + 1]], 43);
    P.line(13, 8, 17, 3, C.m2); P.line(3, 28, 6, 24, C.m2); P.line(27, 23, 30, 20, C.m2);
    // the runes, glowing
    const R = [[16, 10], [17, 11], [15, 12], [18, 15], [17, 16], [16, 17], [15, 21], [16, 21], [17, 22], [19, 25], [18, 26], [17, 29], [16, 30], [18, 31], [17, 35], [15, 38], [16, 39], [18, 40]];
    for (const [x, y] of R) P.px(x, y, C.v3);
    for (const [x, y] of [[17, 11], [18, 15], [16, 21], [18, 26], [16, 30], [17, 35], [16, 39]]) P.px(x, y, C.v4);
    P.px(6, 32, C.v3); P.px(6, 33, C.v3); P.px(30, 28, C.v3); P.px(30, 29, C.v3);
    for (const [x, y, r] of [[17, 12, 7], [17, 22, 8], [17, 32, 8], [16, 40, 7], [6, 33, 5], [30, 29, 5]]) P.light(x, y, 'v', r);
    P.dither(4, G - 1, 28, 2, 'rgba(180,140,240,.5)');
    return P.finish({ warm: 0.06 });
  };
  B.bell = () => {
    const P = painter(30, 62), G = 61;
    stone(P, 6, 44, 18, G - 43, { seed: 16 });
    door(P, 12, 52, 6, G - 51, { arch: true }); win(P, 18, 47, 2, 2, { sill: false });
    planks(P, 8, 21, 14, 23, { pal: [C.w1, C.w2, C.w3] });
    P.line(8, 22, 21, 32, C.w1); P.line(21, 22, 8, 32, C.w1); P.line(8, 33, 21, 43, C.w1); P.line(21, 33, 8, 43, C.w1); P.hl(8, 21, 32, C.w1);
    P.dither(19, 21, 3, 23, 'rgba(13,9,17,.35)');
    // the belfry, the bell in it
    P.rect(6, 12, 18, 9, C.dark); P.rect(6, 12, 2, 9, C.w2); P.rect(22, 12, 2, 9, C.w1); P.hl(5, 24, 20, C.w3); P.hl(5, 24, 21, C.w1);
    P.pat([[11, 19], [12, 14], [18, 14], [19, 19]], (x, y) => (x < 14 ? C.g2 : x < 17 ? C.g1 : C.g0)); P.hl(12, 17, 13, C.g1); P.px(15, 12, C.i1); P.px(15, 20, C.g0);
    P.light(15, 16, 'y', 6);
    roofGable(P, 3, 26, 12, 1, { pat: 'shingle' });
    P.vl(24, 21, 22, C.i1); lantern(P, 24, 22);
    return P.finish();
  };
  B.board = () => {
    const P = painter(25, 22), G = 21;
    P.rect(3, 6, 2, G - 5, C.w2); P.rect(19, 6, 2, G - 5, C.w1); P.vl(3, 6, G, C.w3);
    planks(P, 5, 7, 14, 10, { pal: [C.w1, C.w2, C.w3] });
    // notices pinned up, two sealed in red
    P.rect(6, 8, 4, 5, C.b2); P.hl(7, 8, 10, C.b0); P.px(7, 8, C.i2);
    P.rect(11, 8, 3, 4, C.b3); P.px(12, 10, C.x2); P.px(12, 8, C.i2);
    P.rect(15, 8, 3, 6, C.b2); P.hl(15, 16, 10, C.b0); P.px(16, 12, C.x2); P.px(16, 8, C.i2);
    P.rect(7, 14, 5, 2, C.b1); P.hl(8, 10, 15, C.b0);
    roofGable(P, 0, 23, 6, 1, { pat: 'shingle' });
    P.vl(22, 7, 8, C.i1); lantern(P, 22, 8, { r: 8 });
    return P.finish();
  };
  B.plot = () => {
    const P = painter(38, 16), G = 15;
    // stakes and string marking the ground out, planks waiting, a sign
    for (const [x, t] of [[3, 7], [34, 7], [8, 4], [29, 4]]) { P.vl(x, t, t === 4 ? 9 : G, C.w3); P.px(x, t, C.w4); }
    for (let x = 3; x <= 34; x++) if (x % 2) P.px(x, 8, C.b1);
    for (let x = 8; x <= 29; x++) if (x % 2) P.px(x, 5, C.b0);
    P.line(3, 8, 8, 5, C.b0); P.line(34, 8, 29, 5, C.b0);
    for (let j = 0; j < 4; j++) P.hl(21 + j, 31 - j, G - j, j % 2 ? C.w4 : C.w3);
    P.vl(14, 6, G, C.w2); P.rect(11, 1, 7, 6, C.w3); P.hl(11, 17, 1, C.w4);
    P.hl(13, 15, 4, C.y2); P.vl(14, 3, 5, C.y2);
    return P.finish({ warm: 0.1 });
  };

  const cache = {};
  function building(k) { if (!(k in B)) return null; return cache[k] || (cache[k] = B[k]()); }
  return { building, C, painter, hs, roofGable, stone, win, KEYS: Object.keys(B) };
})();
