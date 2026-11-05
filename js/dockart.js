'use strict';
// Lantern Road · the art the Recruit Board's panel and the Hearth's dock draw with, from the approved mockups
// docs/mockups/recruit-board.html and hearth-dock.html (their docs/mockups/d2-art.js), in the Hearth's pixel kit
// (js/hearthart.js): the board as a big picture for the left of its panel, the menu objects that rest on the dock (a
// notice board, the helm, the war table, the satchel, the book and the candle) and the lanterns either side of Set out.
//   DockArt.board(n, { lit })   a canvas: the board with n notices pinned up (lit: the index of one in a lantern's light)
//   DockArt.boardURL(n, opts)   the same at 4×, as { url, w, h }
//   DockArt.obj(k, z)           an object at z×, as { url, w, h }: notice, helm, table, satchel, book, candle, lantern
//   DockArt.big(canvas, k)      any canvas at k×, as a data URL

const DockArt = (() => {
  const C = HearthArt.C;
  const big = (c, k) => { const o = document.createElement('canvas'); o.width = c.width * k; o.height = c.height * k; const g = o.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(c, 0, 0, o.width, o.height); return o.toDataURL(); };
  const draw = (w, h, fn, o) => { const P = HearthArt.painter(w, h); fn(P); return P.finish(o || { warm: 0 }); };

  // ── the Recruit Board, big: a planked board under a little shingled roof, one notice pinned up for each recruit
  // (n), a lantern on a bracket, a crate and a sack at its foot. Firelight from the left.
  function board(n = 4, opts = {}) {
    return draw(76, 66, P => {
      const G = 60;
      // the ground: trodden earth, a few tufts
      P.rect(0, G, 76, 6, C.w0); P.dither(0, G, 76, 2, C.w1, 0); P.hl(4, 70, G, C.w1);
      for (const x of [3, 9, 64, 70]) { P.px(x, G - 1, C.e2); P.px(x + 1, G - 2, C.e3); P.px(x + 2, G - 1, C.e2); }
      // posts
      P.rect(11, 14, 3, G - 14, C.w2); P.vl(11, 14, G - 1, C.w3); P.rect(62, 14, 3, G - 14, C.w1); P.vl(62, 14, G - 1, C.w2);
      // the board: planks
      P.rect(14, 18, 48, 32, C.w2);
      for (let y = 18; y < 50; y += 4) { P.hl(14, 61, y, C.w3); P.hl(14, 61, y + 3, C.w1); }
      for (const [x, y] of [[20, 21], [41, 33], [55, 25], [27, 44]]) { P.px(x, y, C.w1); P.px(x + 1, y, C.w0); }
      P.rect(13, 17, 50, 1, C.w4); P.rect(13, 50, 50, 2, C.w1);
      // the roof
      HearthArt.roofGable(P, 6, 69, 16, 4, { pat: 'shingle' });
      // notices: up to seven, in two rows; the sealed ones are the better rolls
      const spots = [[17, 21], [29, 20], [41, 22], [52, 21], [22, 36], [36, 35], [49, 37]];
      for (let i = 0; i < Math.min(n, spots.length); i++) {
        const [x, y] = spots[i], tall = i % 2 ? 11 : 12, wide = i % 3 === 1 ? 8 : 9;
        P.rect(x, y, wide, tall, i % 2 ? C.b2 : C.b3); P.hl(x, x + wide - 1, y + tall - 1, C.b1); P.vl(x + wide - 1, y, y + tall - 1, C.b1);
        for (let k = 0; k < 3; k++) P.hl(x + 2, x + wide - 3 - (k % 2) * 2, y + 3 + k * 2, C.b0);
        P.px(x + (wide >> 1), y, C.i3); P.px(x + (wide >> 1), y - 1, C.i1);
        if (i % 2 === 0) { P.rect(x + wide - 4, y + tall - 4, 3, 3, C.x2); P.px(x + wide - 3, y + tall - 3, C.x3); }
        if (opts.lit === i) P.light(x + wide / 2, y + tall / 2, 'y', 10);
      }
      if (n > spots.length) for (let i = spots.length; i < n; i++) P.rect(56 + (i - spots.length) * 3, 44, 2, 3, C.b2);
      // the lantern on its bracket, and the crate and sack
      P.hl(62, 68, 22, C.i1); P.px(68, 23, C.i1);
      P.px(68, 24, C.i1); P.rect(67, 25, 3, 1, C.i1); P.rect(67, 26, 3, 3, C.y3); P.px(68, 27, C.y4); P.rect(67, 29, 3, 1, C.i1); P.light(68, 27, 'y', 12);
      P.rect(2, G - 9, 10, 9, C.w3); P.rect(2, G - 9, 10, 1, C.w4); P.vl(2, G - 9, G - 1, C.w4); P.line(3, G - 8, 10, G - 2, C.w2); P.line(3, G - 2, 10, G - 8, C.w2);
      P.pat([[64, G], [65, G - 6], [67, G - 9], [70, G - 9], [72, G - 6], [73, G]], (x) => (x < 68 ? C.h3 : C.h2)); P.hl(66, 71, G - 9, C.h4); P.px(68, G - 10, C.h1);
    }, { warm: 0.22 });
  }
  const boards = new Map();
  const boardURL = (n, opts = {}) => {
    const key = n + ':' + (opts.lit == null ? '' : opts.lit);
    if (!boards.has(key)) { const c = board(n, opts); boards.set(key, { url: big(c, 4), w: c.width * 4, h: c.height * 4 }); }
    return boards.get(key);
  };

  // ── the menu objects, as on the Hearth's shelf (docs/mockups/hearth.html), plus a notice board for the Recruit Board
  const OBJ = {
    helm: () => draw(22, 22, P => {
      P.pat([[10, 6], [11, 1], [16, 0], [18, 2], [14, 6]], (x) => (x < 14 ? C.x3 : C.x2));
      P.pat([[3, 21], [3, 11], [5, 7], [11, 4.5], [17, 7], [19, 11], [19, 21]], (x) => (x < 8 ? C.i4 : x < 15 ? C.i3 : C.i2));
      P.hl(4, 18, 11, C.i0); P.hl(4, 18, 12, C.i1); P.vl(11, 6, 20, C.i2); P.px(11, 5, C.i4);
      for (let y = 15; y <= 19; y += 2) { P.px(14, y, C.i0); P.px(16, y, C.i0); }
      P.hl(3, 19, 21, C.i1); P.px(6, 8, C.b3); P.px(5, 9, C.i4);
    }),
    table: () => draw(26, 22, P => {
      P.vl(4, 15, 21, C.w2); P.vl(21, 15, 21, C.w1); P.vl(8, 14, 19, C.w1); P.vl(18, 14, 19, C.w1);
      P.pat([[4, 9], [20, 9], [24, 15], [1, 15]], () => C.w3); P.hl(1, 24, 15, C.w2); P.hl(1, 24, 16, C.w1); P.line(4, 9, 20, 9, C.w4);
      P.pat([[6, 10], [18, 10], [21, 14], [4, 14]], () => C.b2); P.line(7, 13, 11, 11, C.x2); P.line(11, 11, 15, 12, C.x2); P.px(16, 12, C.x3); P.px(8, 11, C.q2); P.px(17, 13, C.e3);
      P.vl(15, 3, 11, C.i2); P.rect(16, 3, 5, 3, C.x2); P.hl(16, 20, 3, C.x3);
      P.rect(6, 6, 2, 4, C.b3); P.px(6, 5, C.w0); P.px(6, 4, C.y2); P.px(6, 3, C.y3); P.px(7, 4, C.y3);
    }),
    satchel: () => draw(22, 21, P => {
      P.line(5, 9, 8, 2, C.w2); P.line(16, 9, 13, 2, C.w2); P.hl(8, 13, 1, C.w2); P.hl(8, 13, 2, C.w3);
      P.rect(3, 9, 16, 11, C.w3); P.vl(3, 9, 19, C.w4); P.vl(18, 9, 19, C.w2); P.hl(3, 18, 19, C.w2);
      P.pat([[3, 9], [19, 9], [18, 14], [11, 16], [3, 14]], () => C.w4); P.line(3, 14, 11, 16, C.w2); P.line(11, 16, 18, 14, C.w2);
      for (let x = 5; x < 17; x += 2) P.px(x, 10, C.w2);
      P.rect(10, 14, 3, 3, C.g2); P.px(11, 15, C.w2); P.px(10, 14, C.g3);
    }),
    book: () => draw(20, 22, P => {
      P.rect(5, 3, 12, 17, C.b2); for (let y = 4; y < 19; y += 2) P.hl(15, 16, y, C.b1);
      P.rect(3, 2, 12, 18, C.x1); P.vl(3, 2, 19, C.x0); P.hl(4, 14, 2, C.x2); P.vl(4, 3, 18, C.x2);
      for (const [x, y] of [[4, 3], [13, 3], [4, 18], [13, 18]]) P.px(x, y, C.g2);
      P.rect(8, 7, 2, 1, C.g1); P.rect(7, 8, 4, 1, C.g1); P.rect(7, 9, 4, 4, C.y2); P.px(8, 10, C.y3); P.rect(7, 13, 4, 1, C.g1);
      P.rect(14, 9, 3, 4, C.g1); P.px(15, 10, C.g3);
    }),
    candle: () => draw(14, 22, P => {
      P.hl(1, 12, 21, C.i1); P.hl(2, 11, 20, C.g1); P.hl(3, 10, 19, C.g2); P.px(12, 19, C.g1); P.px(13, 18, C.g1); P.px(12, 17, C.g1);
      P.rect(5, 9, 4, 10, C.b3); P.vl(8, 9, 18, C.b2); P.px(9, 11, C.b2); P.px(9, 12, C.b2); P.px(4, 10, C.b2);
      P.px(6, 8, C.w0); P.rect(5, 5, 3, 3, C.y2); P.px(6, 6, C.y4); P.px(6, 4, C.y3); P.px(6, 3, C.y3);
    }),
    notice: () => draw(22, 22, P => {
      P.vl(2, 4, 21, C.w2); P.vl(19, 4, 21, C.w1);
      P.rect(3, 5, 16, 11, C.w3); for (let y = 5; y < 16; y += 3) P.hl(3, 18, y, C.w4);
      P.rect(5, 6, 5, 7, C.b3); P.hl(6, 8, 8, C.b0); P.hl(6, 8, 10, C.b0); P.px(7, 6, C.i2);
      P.rect(12, 7, 5, 6, C.b2); P.hl(13, 15, 9, C.b0); P.px(15, 11, C.x2); P.px(14, 7, C.i2);
      HearthArt.roofGable(P, 0, 21, 4, 1, { pat: 'shingle' });
    }),
    // the dock's lantern, either side of Set out
    lantern: () => draw(9, 14, P => {
      P.px(4, 0, C.i1); P.rect(3, 1, 3, 1, C.i2); P.rect(2, 2, 5, 1, C.i1);
      P.rect(2, 3, 5, 7, C.y2); P.rect(3, 4, 3, 5, C.y3); P.px(4, 6, C.y4); P.vl(2, 3, 9, C.i1); P.vl(6, 3, 9, C.i1);
      P.rect(2, 10, 5, 1, C.i1); P.rect(3, 11, 3, 1, C.i2);
    }),
  };
  const cache = {}, urls = {};
  const obj = (k, z = 2) => { const key = k + '@' + z; if (!urls[key]) { const c = cache[k] || (cache[k] = OBJ[k]()); urls[key] = { url: big(c, z), w: c.width * z, h: c.height * z }; } return urls[key]; };
  return { board, boardURL, obj, big };
})();
