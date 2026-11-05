'use strict';
// Lantern Road mockups · the Hearth's scene (docs/darkest-dungeon-study.md §3). Fourteen plots in two rows: six on
// the lower ground, a gap left for the fire, and eight on a terrace behind, with steps up the middle toward the Old
// Beacon on the skyline. Lamp posts, braziers, mist along the terrace and dark shapes framing the buildings view.
// It draws through camp3d.js's hooks; install() sets them.
const HearthScene = (() => {
  const RAD = Math.PI / 180, C = HearthArt.C;
  const RT = 140, TH = 28, R_LO = 118, R_UP = 162;
  // the plots, in the order they open: the lower row from the fire out, then the terrace from the steps out
  const ORDER = [[150, 0], [210, 0], [129, 0], [231, 0], [164, 1], [196, 1], [108, 0], [252, 0], [146.5, 1], [213.5, 1], [129, 1], [231, 1], [112, 1], [248, 1]];
  // the terrace stands full height from 118° to 242°, walled in stone; either end, an earth bank runs down to the ground
  const W0 = 118, W1 = 242, E0 = 92, E1 = 268;
  const ramp = b => (b <= E0 || b >= E1 ? 0 : b >= W0 && b <= W1 ? 1 : b < W0 ? (b - E0) / (W0 - E0) : (E1 - b) / (E1 - W1));
  const bearing = (x, z) => ((Math.atan2(x, z) / RAD) + 360) % 360;
  const th = b => TH * ramp(b);
  const ground = (x, z) => (z > 30 || Math.hypot(x, z) < RT ? 0 : th(bearing(x, z)));
  const at = (b, r) => [r * Math.sin(b * RAD), r * Math.cos(b * RAD)];
  const PLOTS = ORDER.map(([b, up]) => at(b, up ? R_UP : R_LO));

  const poly = (x, pts, col) => { x.fillStyle = col; x.beginPath(); pts.forEach((q, i) => (i ? x.lineTo(q.x, q.y) : x.moveTo(q.x, q.y))); x.closePath(); x.fill(); };
  const proj3 = (cam, b, r, h) => { const [px, pz] = at(b, r); return cam.proj(px, h, pz); };
  const quadAt = (cam, b0, b1, r0, r1, h0, h1) => { const P = [[b0, r0, h0], [b1, r0, h1], [b1, r1, h1], [b0, r1, h0]].map(([b, r, h]) => proj3(cam, b, r, h)); return P.every(Boolean) ? P : null; };
  const glow = (x, gx, gy, r, rgba) => { if (r <= 0.5) return; const g = x.createRadialGradient(gx, gy, 0, gx, gy, r); g.addColorStop(0, rgba); g.addColorStop(1, rgba.replace(/[\d.]+\)$/, '0)')); x.fillStyle = g; x.fillRect(gx - r, gy - r, r * 2, r * 2); };
  const blit = (x, img, dx, dy, s) => x.drawImage(img, Math.round(dx), Math.round(dy), Math.round(img.width * s), Math.round(img.height * s));
  const mix = (a, b, k) => '#' + [1, 3, 5].map(i => Math.round(parseInt(a.substr(i, 2), 16) * (1 - k) + parseInt(b.substr(i, 2), 16) * k).toString(16).padStart(2, '0')).join('');

  // ── the ground: the terrace's top, its retaining wall and coping, and the steps up the middle
  const STONES = ['#2c2832', '#27232d', '#312c37', '#231f29', '#2a2630'];
  const N_STEPS = 8, RUN = 3.4, STEP_W = 11;
  function under(x, cam) {
    for (const [r0, r1, col] of [[RT, 178, '#19141f'], [178, 222, '#16111b'], [222, 300, '#130f18'], [300, 560, '#100c15']]) for (let b = E0; b < E1; b += 4) { const q = quadAt(cam, b, b + 4, r0, r1, th(b), th(b + 4)); if (q) poly(x, q, col); }
    // the earth banks at either end, sloping down toward the fire
    for (let b = E0; b < E1; b += 2) { if (b >= W0 && b + 2 <= W1) continue; const q = quadAt(cam, b, b + 2, RT - 16, RT, 0, 0); if (!q) continue; const top = [proj3(cam, b, RT, th(b)), proj3(cam, b + 2, RT, th(b + 2))]; if (!top.every(Boolean)) continue; poly(x, [q[0], q[1], top[1], top[0]], '#18131d'); }
    // the wall, course by course, warmer near the fire
    const STEP = 3, COURSE = 5.5;
    for (let b = W0; b < W1; b += STEP) {
      const h0 = th(b), h1 = th(b + STEP); if (h0 <= 0.2 && h1 <= 0.2) continue;
      const stairs = Math.abs(b + STEP / 2 - 180) < 4;
      if (!stairs) for (let k = 0; k * COURSE < Math.max(h0, h1); k++) {
        const lo0 = Math.min(h0, k * COURSE), hi0 = Math.min(h0, (k + 1) * COURSE), lo1 = Math.min(h1, k * COURSE), hi1 = Math.min(h1, (k + 1) * COURSE);
        if (hi0 - lo0 <= 0 && hi1 - lo1 <= 0) continue;
        const pts = [[b, lo0], [b + STEP, lo1], [b + STEP, hi1], [b, hi0]].map(([bb, h]) => proj3(cam, bb, RT, h));
        if (!pts.every(Boolean)) continue;
        const warm = Math.max(0, 1 - Math.abs(b - 180) / 70) * (0.34 - k * 0.07);
        poly(x, pts, mix(STONES[(Math.floor(b / 6) + k * 3 + (k & 1)) % 5], '#8a5a3a', Math.max(0, warm)));
      }
      // the coping along the top
      const c = [[b, h0 - 1.2], [b + STEP, h1 - 1.2], [b + STEP, h1 + 0.2], [b, h0 + 0.2]].map(([bb, h]) => proj3(cam, bb, RT - 1.5, h));
      if (!stairs && c.every(Boolean)) poly(x, c, '#46404e');
      const tp = quadAt(cam, b, b + STEP, RT - 1.5, RT + 2, h0 + 0.2, h1 + 0.2); if (tp && !stairs) poly(x, tp, '#383240');
    }
    // the steps, far to near, and their cheeks
    for (let i = N_STEPS - 1; i >= 0; i--) {
      const zf = -(RT - i * RUN), zn = zf + RUN, h = (i + 1) * (TH / N_STEPS), hl = i * (TH / N_STEPS);
      const tread = [[-STEP_W, h, zf - (i === N_STEPS - 1 ? 2 : 0)], [STEP_W, h, zf - (i === N_STEPS - 1 ? 2 : 0)], [STEP_W, h, zn], [-STEP_W, h, zn]].map(([a, b2, c2]) => cam.proj(a, b2, c2));
      const riser = [[-STEP_W, hl, zn], [STEP_W, hl, zn], [STEP_W, h, zn], [-STEP_W, h, zn]].map(([a, b2, c2]) => cam.proj(a, b2, c2));
      if (tread.every(Boolean)) poly(x, tread, i % 2 ? '#4a4452' : '#45404d');
      if (riser.every(Boolean)) poly(x, riser, mix('#2c2832', '#7a4a30', 0.18 + i * 0.01));
    }
    for (const sd of [-1, 1]) {
      const z0 = -RT + N_STEPS * RUN, pts = [[sd * STEP_W, 0, z0], [sd * (STEP_W + 2.5), 0, z0], [sd * (STEP_W + 2.5), TH + 1.5, -RT], [sd * STEP_W, TH + 1.5, -RT]].map(([a, b2, c2]) => cam.proj(a, b2, c2));
      if (pts.every(Boolean)) poly(x, pts, '#3a3442');
      const face = [[sd * (STEP_W + (sd < 0 ? 0 : 2.5)), 0, z0], [sd * (STEP_W + (sd < 0 ? 0 : 2.5)), 1.5, z0], [sd * (STEP_W + (sd < 0 ? 0 : 2.5)), TH + 1.5, -RT], [sd * (STEP_W + (sd < 0 ? 0 : 2.5)), TH, -RT]].map(([a, b2, c2]) => cam.proj(a, b2, c2));
      if (face.every(Boolean)) poly(x, face, '#2e2936');
    }
  }

  // ── pads and paths: packed earth before each plot; paths to the fire from the lower row and the steps
  function pads(x, cam, S) {
    const path = (b, r0, r1, h, wd, col) => { const db = (wd / ((r0 + r1) / 2)) / RAD; const q = quadAt(cam, b - db, b + db, r0, r1, h, h); if (q) poly(x, q, col); };
    path(180, 40, RT - N_STEPS * RUN, 0, 6, '#2a2028');
    S.plots.forEach((pl, i) => {
      if (!pl) return;
      const [b, up] = ORDER[i], r = up ? R_UP : R_LO, h = up ? th(b) : 0;
      if (!up) path(b, 44, r - 6, 0, 3, '#261d26');
      else path(b, RT + 2, r - 4, h, 2.5, '#231b25');
      const db = (16 / r) / RAD, pad = quadAt(cam, b - db, b + db, r - 7, r + 6, h, h);
      if (pad) poly(x, pad, pl.empty ? '#1e1823' : '#2a2129');
    });
  }

  // ── props: lamp posts, braziers at the foot of the steps, and mist lying along the terrace
  const lampImg = (() => { const P = HearthArt.painter(8, 23); P.rect(3, 4, 1, 18, C.w1); P.rect(2, 21, 3, 2, C.w2); P.rect(3, 3, 3, 1, C.i1); P.px(5, 4, C.i1); P.rect(4, 5, 3, 1, C.i1); P.rect(4, 6, 3, 2, C.y3); P.px(5, 6, C.y4); P.rect(4, 8, 3, 1, C.i1); return P.finish({ warm: 0 }); })();
  const brazierImg = (() => { const P = HearthArt.painter(9, 11); P.rect(2, 5, 5, 3, C.i1); P.hl(1, 7, 5, C.i2); P.line(2, 8, 1, 10, C.i1); P.line(6, 8, 7, 10, C.i1); P.vl(4, 8, 10, C.i1); P.rect(3, 3, 3, 2, C.y2); P.px(4, 2, C.y3); P.px(4, 1, C.y4); P.px(3, 4, C.y1); P.px(5, 4, C.y1); return P.finish({ warm: 0 }); })();
  const LAMPS = [[171, RT + 3], [189, RT + 3], [134, RT + 3], [226, RT + 3]];
  function scene(o) {
    const { x, cam, t, add, L } = o;
    for (const [b, r] of LAMPS) { const [lx, lz] = at(b, r); add(lx, lz, p => { const s = cam.scale(p.s), bx = p.x - 3.5 * s, by = p.y - lampImg.height * s; blit(x, lampImg, bx, by, s); L.push([bx + 5.5 * s, by + 7 * s, 11 * s, `rgba(255,190,100,${(0.5 + 0.05 * Math.sin(t / 130 + b)).toFixed(3)})`]); }); }
    for (const sd of [-1, 1]) add(sd * 17, -RT + N_STEPS * RUN + 5, p => { const s = cam.scale(p.s), bx = p.x - 4.5 * s, by = p.y - brazierImg.height * s; blit(x, brazierImg, bx, by, s); const f = 0.55 + 0.1 * Math.sin(t / 90 + sd) * Math.sin(t / 37); L.push([bx + 4.5 * s, by + 2 * s, 14 * s, `rgba(255,170,80,${f.toFixed(3)})`]); });
    // mist, lying along the foot of the terrace and further back over the graves
    const mist = (b, r, h, i, a, wd) => { const [mx, mz] = at(b, r); add(mx, mz, p => { if (cam.w < 0.15) return; const k = Math.min(1, (cam.w - 0.15) * 2), s = p.s, dx = Math.sin(t / 5200 + i * 1.7) * 8 * s, wdt = wd * s; x.save(); x.globalAlpha = a * k; x.translate(p.x + dx, p.y - (h + 2) * s); x.scale(1, 0.17); const g = x.createRadialGradient(0, 0, 0, 0, 0, wdt); g.addColorStop(0, 'rgba(150,134,184,1)'); g.addColorStop(1, 'rgba(150,134,184,0)'); x.fillStyle = g; x.fillRect(-wdt, -wdt, wdt * 2, wdt * 2); x.restore(); }); };
    for (let b = 92, i = 0; b <= 268; b += 8, i++) mist(b, RT + 5, th(b), i, 0.22, 30);
    for (let b = 118, i = 40; b <= 242; b += 11, i++) mist(b, 250, TH, i, 0.16, 46);
  }

  // ── the Old Beacon on the skyline, against moonlit cloud, crows round its top
  const beacon = (() => {
    const P = HearthArt.painter(34, 50), D = '#140f1c', D2 = '#1c1527', RIM = '#3e3456';
    P.pat([[0, 50], [3, 41], [8, 37], [12, 34], [18, 33], [24, 35], [29, 39], [34, 44], [34, 50]], (x, y) => (HearthArt.hs(x >> 1, y >> 1, 61) > 0.75 ? D2 : D));
    P.line(3, 41, 12, 34, RIM); P.line(12, 34, 18, 33, RIM);
    P.pat([[12, 35], [13, 12], [21, 12], [22, 35]], (x, y) => (y % 4 === 0 ? '#120d19' : x < 15 ? D2 : D));
    P.vl(13, 12, 34, RIM);
    P.rect(12, 9, 11, 3, D2); for (const [mx, my] of [[12, 6], [15, 4], [19, 7], [22, 5]]) P.rect(mx, my, 2, 9 - my, D2);
    P.px(12, 6, RIM); P.px(15, 4, RIM);
    P.rect(15, 10, 4, 3, '#2a1612'); P.px(16, 11, '#c8622a'); P.px(17, 11, '#8a3a1a');
    P.px(17, 22, '#7a4a22'); P.px(17, 23, '#5a3418');
    return P.finish({ warm: 0 });
  })();
  function sky(x, cam, hz, t) {
    const sx = cam.screenOfBearing(180); if (sx == null) return;
    const bx = Math.round(sx - 17), by = Math.round(hz + 3 - beacon.height);
    const cl = x.createRadialGradient(sx, by + 10, 2, sx, by + 10, 70); cl.addColorStop(0, 'rgba(150,132,190,.22)'); cl.addColorStop(0.5, 'rgba(110,96,150,.1)'); cl.addColorStop(1, 'rgba(110,96,150,0)'); x.fillStyle = cl; x.fillRect(sx - 80, by - 60, 160, 140);
    // long streaks of cloud behind it, their upper edges catching the moon
    for (const [ox, oy, w, h, a] of [[-46, 2, 70, 5, 0.34], [30, -6, 64, 4, 0.28], [-8, 14, 96, 6, 0.3], [52, 18, 50, 4, 0.22], [-70, 22, 44, 3, 0.2]]) {
      const cx = sx + ox + Math.sin(t / 11000 + ox) * 3, cy = by + oy;
      x.save(); x.translate(cx, cy); x.scale(1, h / w); const g = x.createRadialGradient(0, 0, 0, 0, 0, w / 2); g.addColorStop(0, `rgba(78,66,108,${a})`); g.addColorStop(0.7, `rgba(70,60,98,${a * 0.6})`); g.addColorStop(1, 'rgba(70,60,98,0)'); x.fillStyle = g; x.fillRect(-w / 2, -w / 2, w, w); x.restore();
      x.fillStyle = `rgba(150,136,186,${a * 0.5})`; x.fillRect(Math.round(cx - w * 0.28), Math.round(cy - h / 2), Math.round(w * 0.56), 1);
    }
    x.drawImage(beacon, bx, by);
    glow(x, bx + 17, by + 11, 6, 'rgba(240,120,50,.35)');
    x.fillStyle = '#0a070e';
    for (let i = 0; i < 3; i++) { const a = t / 1400 + i * 2.1, cx = Math.round(sx + Math.cos(a) * (12 + i * 3)), cy = Math.round(by + 4 + Math.sin(a * 1.3) * 4 - i * 2), f = Math.floor(t / 180 + i) % 2; x.fillRect(cx - 1, cy - f, 1, 1); x.fillRect(cx, cy, 1, 1); x.fillRect(cx + 1, cy - f, 1, 1); }
  }

  // ── what frames the buildings view: a dead tree with a lantern at the left, a lamp and a fence at the right
  const frameL = (() => {
    const P = HearthArt.painter(70, 170), D = '#07050a', R = '#2e1c16';
    P.pat([[0, 170], [0, 40], [6, 30], [12, 22], [16, 30], [18, 60], [22, 100], [28, 140], [34, 170]], () => D);
    P.pat([[10, 60], [30, 44], [52, 36], [66, 30], [68, 33], [54, 41], [34, 52], [16, 68]], () => D);
    P.pat([[14, 90], [28, 84], [40, 86], [41, 89], [28, 88], [16, 96]], () => D);
    P.pat([[6, 34], [2, 14], [4, 12], [9, 30]], () => D); P.pat([[12, 26], [20, 8], [22, 9], [15, 30]], () => D);
    for (const [ax, ay, bx2, by2] of [[30, 46, 34, 36], [48, 38, 52, 28], [58, 34, 64, 24], [40, 42, 44, 50], [62, 32, 69, 36]]) P.line(ax, ay, bx2, by2, D);
    P.line(18, 62, 22, 100, R); P.line(22, 101, 28, 140, R); P.line(28, 141, 33, 169, R);
    P.vl(52, 39, 47, '#1a1410'); P.rect(50, 48, 5, 1, C.i1); P.rect(50, 49, 5, 4, C.y3); P.rect(51, 50, 3, 2, C.y4); P.rect(50, 53, 5, 1, C.i1); P.px(52, 54, C.i1);
    for (let i = 0; i < 40; i++) { const gx = Math.round(HearthArt.hs(i, 1, 71) * 66), gh = 4 + Math.round(HearthArt.hs(i, 2, 71) * 12); P.line(gx, 169, gx + (i % 3) - 1, 169 - gh, D); }
    const c = P.finish({ warm: 0 }); c.lamp = [52.5, 51]; return c;
  })();
  const frameR = (() => {
    const P = HearthArt.painter(60, 120), D = '#07050a';
    P.rect(44, 10, 3, 110, D); P.rect(40, 8, 11, 2, D); P.rect(41, 10, 1, 3, D); P.rect(49, 10, 1, 3, D);
    P.rect(40, 13, 11, 1, C.i1); P.rect(41, 14, 9, 6, C.y3); P.rect(43, 15, 5, 4, C.y4); P.rect(40, 20, 11, 1, C.i1); P.vl(45, 14, 19, C.i1);
    for (const fx of [4, 18, 31]) P.rect(fx, 64 + (fx % 5), 3, 60, D);
    P.pat([[0, 72], [58, 66], [58, 69], [0, 75]], () => D); P.pat([[0, 88], [58, 84], [58, 87], [0, 91]], () => D);
    P.disc(20, 100, 12, (x, y, d) => (d > 10 || d < 2 || Math.abs(x + 0.5 - 20) < 1 || Math.abs(y + 0.5 - 100) < 1 ? D : null));
    for (let i = 0; i < 30; i++) { const gx = Math.round(HearthArt.hs(i, 3, 73) * 58), gh = 4 + Math.round(HearthArt.hs(i, 4, 73) * 10); P.line(gx, 119, gx + (i % 3) - 1, 119 - gh, D); }
    const c = P.finish({ warm: 0 }); c.lamp = [45.5, 17]; return c;
  })();
  function front(x, cam, t, L) {
    const w = cam.w; if (w < 0.4 || cam.road > 0.01) return;
    const k = Math.min(1, (w - 0.4) / 0.5), slide = Math.round((1 - k) * 90);
    x.globalAlpha = k;
    const lx = -22 - slide, ly = Camp3D.IH - frameL.height + 4, rx = Camp3D.IW - frameR.width + 8 + slide, ry = Camp3D.IH - frameR.height + 2;
    x.drawImage(frameL, lx, ly); x.drawImage(frameR, rx, ry);
    x.globalAlpha = 1;
    const f = 0.55 + 0.06 * Math.sin(t / 150) * Math.sin(t / 41);
    L.push([lx + frameL.lamp[0], ly + frameL.lamp[1], 22 * k, `rgba(255,190,100,${(f * k).toFixed(3)})`]);
    L.push([rx + frameR.lamp[0], ry + frameR.lamp[1], 20 * k, `rgba(255,190,100,${(f * k).toFixed(3)})`]);
  }

  function install() {
    Object.assign(Camp3D.hooks, {
      plotsWorld: PLOTS, ground, under, pads, scene, sky, front,
      building: k => HearthArt.building(k),
      scenery: list => list.filter(sc => sc.k !== 'cart' && sc.k !== 'crate'),
      dark: cam => 1 - 0.38 * cam.w,
    });
  }
  return { install, ORDER, PLOTS, RT, TH, R_LO, R_UP };
})();
