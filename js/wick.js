'use strict';
// Lantern Road · Old Wick, the lamp-keeper (onboarding spec §6.1): his portrait, Wick.say for a line of his in a
// bubble (the results popup has him give the stage's hint after a loss, js/results.js), and the guide's kit, Wick.show,
// after docs/mockups/camp-welcome.html, first-pick.html and formation.html: the spotlight and its pointer, his bubble
// and his wide panel, callouts on the things they explain, a hand that shows a drag, and the gate that lets only the
// lit thing take a press during a forced step. The first session's script is js/firstsession.js. Styles in
// css/wick.css (his bubble) and css/guide.css (the kit).

// A large pixel-art portrait for the guide's panel and bubbles (from docs/mockups/wick.js, where it was designed).
// Drawn from shapes on a 40×54 grid, lit from the lantern he holds on the right, then outlined. cv.lamp is the
// lantern's centre on the grid.
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

const Wick = (() => {
  let url = null;
  // The portrait drawn once at 4× (160×216), as an image URL: crisp at any size it is shown.
  function portraitURL() {
    if (url) return url;
    const src = wickPortrait(), k = 4, c = document.createElement('canvas');
    c.width = src.width * k; c.height = src.height * k;
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    x.drawImage(src, 0, 0, c.width, c.height);
    return (url = c.toDataURL());
  }
  // Wick in the bottom-left corner of `parent`, with `text` in a bubble above him that points right, at what he is
  // talking about. Returns the element, already in place; remove it to send him away.
  // o: { parent (default #frame), cls (extra classes: where and how big, from the screen's own CSS) }
  function say(text, o = {}) {
    const el = h('div', { class: 'wick-say' + (o.cls ? ' ' + o.cls : ''), role: 'note' },
      h('img', { class: 'wick-pt', src: portraitURL(), alt: 'Old Wick', draggable: 'false' }),
      h('div', { class: 'wick-bubble', text }));
    (o.parent || $('#frame')).append(el);
    return el;
  }

  // ── the guide's kit (docs/mockups/camp-welcome.html W1–W3, first-pick.html, formation.html F3)
  // Everything is drawn in one layer over the whole landscape stage (#stage, above the screens, under the title), in
  // design pixels, and follows its target every frame: the camp's scene moves, the road flies, the popup rises.
  const ARROW = { map: ['..kkkkk..', '..kyYyk..', '..kyYyk..', '..kyYyk..', 'kkkyYykkk', 'kyyyYyyyk', '.kyyYyyk.', '..kyYyk..', '...kyk...', '....k....'], pal: { k: '#1a1008', y: '#f4a646', Y: '#ffd68a' } };
  const HAND = { map: ['...kk.....', '..kwwk....', '..kwwk....', '..kwwkkk..', '..kwwwwwkk', 'kkkwwwwwwk', 'kwwwwwwwwk', '.kwwwwwwwk', '..kwwwwwk.', '...kkkkk..'], pal: { k: '#1a1008', w: '#ffe2a0' } };
  const big = (c, k) => { const o = document.createElement('canvas'); o.width = c.width * k; o.height = c.height * k; const g = o.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(c, 0, 0, o.width, o.height); return o.toDataURL(); };
  let arrowURL = null, handURL = null;
  const arrowSrc = () => arrowURL || (arrowURL = big(sprite(ARROW.map, ARROW.pal, 'wk:arrow'), 3));
  const handSrc = () => handURL || (handURL = big(sprite(HAND.map, HAND.pal, 'wk:hand'), 3));
  const stage = () => $('#stage');
  function layer() {
    let L = $('#wk');
    if (!L) { L = h('div', { id: 'wk', 'aria-live': 'polite' }); stage().append(L); }
    return L;
  }
  // What a target is, in design pixels on the stage: an element (or a selector), several (their box together), a
  // function returning either, or a box { x, y, w, h } already in stage pixels. Null while it isn't on screen.
  function boxOf(t) {
    if (typeof t === 'function') t = t();
    if (!t) return null;
    if (typeof t === 'string') t = [...document.querySelectorAll(t)];
    if (t.x != null && t.w != null) return t;
    const els = (Array.isArray(t) ? t : [t]).filter(el => el && el.isConnected && el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden' && +getComputedStyle(el).opacity > 0.05);
    if (!els.length) return null;
    const bs = els.map(el => Frame.box(el, stage())).filter(b => b.width > 0 && b.height > 0);
    if (!bs.length) return null;
    const x0 = Math.min(...bs.map(b => b.left)), y0 = Math.min(...bs.map(b => b.top)), x1 = Math.max(...bs.map(b => b.right)), y1 = Math.max(...bs.map(b => b.bottom));
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }
  const same = (a, b) => (!a && !b) || (a && b && Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) < 0.5 && Math.abs(a.w - b.w) < 0.5 && Math.abs(a.h - b.h) < 0.5);
  const place = (el, x, y, w, hh) => { el.style.left = Math.round(x) + 'px'; el.style.top = Math.round(y) + 'px'; if (w != null) { el.style.width = Math.round(w) + 'px'; el.style.height = Math.round(hh) + 'px'; } };
  const overlap = (a, b, m = 6) => !!(a && b && a.x < b.x + b.w + m && b.x < a.x + a.w + m && a.y < b.y + b.h + m && b.y < a.y + a.h + m);

  // ── the gate: during a forced step only the lit thing (or the step's area) takes a press; everything else is held
  // back before the page sees it. A press that started inside may end anywhere (a drag). Keys are held back too.
  // Help and Settings ([data-wk-free]) always take a tap, and while their page is open nothing is held back: Wick steps
  // aside until it closes (css/guide.css; play-test note 2.2).
  let cur = null;                 // the step on show
  const allowed = new Set();      // pointers pressed inside the lit area
  const softs = new Set();        // soft steps on show: a press anywhere ends them, and goes through
  const aside = () => !!document.querySelector('#sheet:not([hidden]) .setbox, #screen:not([hidden]) .page.how');
  // Between forced steps (the camera flying, a popup filling) nothing takes a press either, while hold() says so.
  let holdFn = null;
  const HOLD = { tap: 'hold', at: 0, closed: false, areas: () => [], next() { } };
  const inside = (ev, els) => {
    const t = (ev.touches && ev.touches[0]) || (ev.changedTouches && ev.changedTouches[0]) || ev;
    if (t.clientX == null) return false;
    return els.some(el => { if (!el || !el.isConnected) return false; const r = el.getBoundingClientRect(); return r.width > 0 && t.clientX >= r.left && t.clientX <= r.right && t.clientY >= r.top && t.clientY <= r.bottom; });
  };
  function gate(ev) {
    // a soft step goes on with any press (a moment after it came up), which still reaches what it landed on; Help and
    // Settings only put it out of sight while their page is open
    if (ev.type === 'pointerdown' && softs.size && !aside() && !(ev.target && ev.target.closest && ev.target.closest('#wk .wk-ui, [data-wk-free]'))) for (const s of [...softs]) if (Date.now() - s.at > 350) s.next();
    let g = cur;
    if (!g || g.closed) { if (holdFn && holdFn()) g = HOLD; else return; }
    if (ev.target && ev.target.closest && ev.target.closest('#wk .wk-ui, [data-wk-free]')) return; // Wick's own buttons and the name box; Help, Settings and the Prototype chip
    if (document.querySelector('#sheet:not([hidden]) .protobox') || aside()) return; // the Prototype panel, which can skip the guide; Help and Settings
    if (g.tap === 'free') { if (ev.type === 'pointerdown') g.next(); return; } // a soft step: any press ends it, and goes through
    const id = ev.pointerId != null ? ev.pointerId : 'm';
    if (ev.type === 'keydown') {
      if (g.tap === 'any' && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); ev.stopImmediatePropagation(); g.next(); return; }
      if (ev.key === 'Tab') return;
      ev.preventDefault(); ev.stopImmediatePropagation(); return;
    }
    if (ev.type === 'pointermove') return;
    if (allowed.has(id) && (ev.type === 'pointerup' || ev.type === 'pointercancel' || ev.type === 'click' || ev.type === 'mouseup' || ev.type === 'touchend')) {
      if (ev.type === 'pointerup' && g.tap === 'target' && inside(ev, g.areas())) g.tapped = true;
      if (ev.type === 'click' || ev.type === 'pointercancel') allowed.delete(id);
      return;
    }
    const ok = g.tap !== 'any' && inside(ev, g.areas());
    if (ok) { if (ev.type === 'pointerdown' || ev.type === 'mousedown' || ev.type === 'touchstart') allowed.add(id); return; }
    if (ev.cancelable) ev.preventDefault();
    ev.stopImmediatePropagation();
    if (g.tap === 'any' && ev.type === 'pointerup' && Date.now() - g.at > 350) g.next();
  }
  for (const t of ['pointerdown', 'pointerup', 'pointercancel', 'pointermove', 'mousedown', 'mouseup', 'click', 'dblclick', 'contextmenu', 'touchstart', 'touchend', 'wheel', 'keydown'])
    window.addEventListener(t, gate, { capture: true, passive: false });

  // Shows one step of the guide, and returns its handle. o:
  //   target    what it is about (see boxOf): the spotlight and the pointer go on it. Without one the stage dims.
  //   round     an oval spotlight (for things drawn in the scene) instead of a rounded box. pad: room around it.
  //   dim       false: no dimming (a soft line in battle). arrow: false for no pointer.
  //   say       Wick's line in his bubble, with his portrait on the side away from the target (side: 'l' or 'r').
  //   panel     his line in the wide panel along the bottom instead (the welcome), with his name and a ▼.
  //   skip      with panel: a Skip button in its corner, which calls this (the story jumps to the name box).
  //   small     a smaller Wick (in battle, and over Formation).
  //   callouts  [{ target, title, text, below }]: boxed lines with a tail, above (or below) what they explain.
  //   hand      { from, to }: a hand that drags from one to the other, over and over, along a dashed trail.
  //   tap       'any': a tap anywhere goes on. 'target': only the target (and area) takes a press; the step ends when
  //             until() holds, or with the tap when it has none. 'none': only area takes presses. 'free': a soft step,
  //             nothing is held back and any press ends it (and goes through), from 350 ms after it came up.
  //   area      what takes presses besides the target: an element, a selector, or a function returning them.
  //   until     () => true once the step is done, checked every frame. ms: the step ends by itself after this.
  //   ui        elements of the step's own that take taps (the name box): marked .wk-ui.
  //   onDone    called once, when the step ends (a tap, its until(), its ms, or close()).
  function show(o = {}) {
    const L = layer(), FH = 390;
    L.classList.toggle('narrow', Frame.W < 780); // a 16:9 frame, 694 wide
    const tap = o.tap || 'any';
    const root = h('div', { class: 'wk-step' + (o.small ? ' small' : '') + (tap === 'free' ? ' soft' : '') + (o.dim === false ? ' nodim' : '') });
    const hole = h('div', { class: 'wk-hole' + (o.round ? ' round' : '') });
    const arrow = h('img', { class: 'wk-arrow', src: arrowSrc(), alt: '', draggable: 'false' });
    if (!o.target && o.dim !== false) root.append(h('div', { class: 'wk-veil' }));
    if (o.target) root.append(hole);
    if (o.target && o.arrow !== false) root.append(arrow);
    let pt = null, bubble = null, panel = null;
    if (o.panel) {
      pt = h('img', { class: 'wk-pt big', src: portraitURL(), alt: 'Old Wick', draggable: 'false' });
      panel = h('div', { class: 'wk-panel' }, h('div', { class: 'wk-who', text: 'Old Wick' }), h('p', { text: o.panel }), tap === 'any' ? h('span', { class: 'wk-more' }) : null,
        o.skip ? h('button', { class: 'wk-skip wk-ui', type: 'button', onclick: () => { if (typeof sfx === 'function') sfx('click'); o.skip(); } }, 'Skip') : null);
      root.append(panel, pt);
    } else if (o.say) {
      pt = h('img', { class: 'wk-pt', src: portraitURL(), alt: 'Old Wick', draggable: 'false' });
      bubble = h('div', { class: 'wk-bubble' }, h('span', { text: o.say }), tap === 'any' ? h('span', { class: 'wk-more' }) : null);
      root.append(pt, bubble);
    }
    const calls = (o.callouts || []).map(c => { const el = h('div', { class: 'wk-call' }, c.title ? h('b', { text: c.title }) : null, h('span', { text: c.text })); root.append(el); return { c, el }; });
    let hand = null, trail = null;
    if (o.hand) { trail = h('div', { class: 'wk-trail' }); hand = h('img', { class: 'wk-hand', src: handSrc(), alt: '', draggable: 'false' }); root.append(trail, hand); }
    if (o.ui) for (const el of [].concat(o.ui)) { el.classList.add('wk-ui'); root.append(el); }
    L.append(root);
    const H = {
      tap, at: Date.now(), closed: false, tapped: false, root,
      areas: () => {
        const a = o.area ? [].concat(typeof o.area === 'function' ? o.area() : o.area).flatMap(x => (typeof x === 'string' ? [...document.querySelectorAll(x)] : [x])) : [];
        return o.target ? [hole, ...a] : a;
      },
      next() { close(); },
      close,
    };
    let last = 0, raf = 0;
    const timer = o.ms ? setTimeout(() => H.next(), o.ms) : 0;
    function close() {
      if (H.closed) return;
      H.closed = true;
      cancelAnimationFrame(raf); clearTimeout(timer);
      softs.delete(H);
      if (cur === H) { cur = null; allowed.clear(); }
      root.classList.remove('in'); root.classList.add('out');
      setTimeout(() => root.remove(), 220);
      if (o.onDone) o.onDone(H);
    }
    // where everything goes, from the target's box
    function lay(b) {
      const W = Frame.W, pad = o.pad != null ? o.pad : 6;
      if (b) {
        const r = { x: b.x - pad, y: b.y - pad, w: b.w + pad * 2, h: b.h + pad * 2 };
        place(hole, r.x, r.y, r.w, r.h);
        // the pointer over it, or under it when there's no room above
        const up = r.y > 44;
        arrow.classList.toggle('below', !up);
        place(arrow, clamp(r.x + r.w / 2 - 13.5, 4, W - 31), up ? r.y - 38 : r.y + r.h + 8);
      }
      if (bubble) {
        // Wick stands on the side away from the target, his bubble beside his head; higher up, or at the top, when
        // it would cover the target
        const cx = b ? b.x + b.w / 2 : W / 2, s2 = o.side || (cx > W * 0.5 ? 'l' : 'r');
        pt.classList.toggle('r', s2 === 'r'); bubble.classList.toggle('r', s2 === 'r');
        const pw = o.small ? 108 : 150, ph = o.small ? 146 : 203, bw = bubble.offsetWidth, bh = bubble.offsetHeight;
        const nx = s2 === 'l' ? pw + 4 : W - pw - 4 - bw;
        const cands = [{ x: nx, y: FH - ph + 22 }, { x: nx, y: FH - ph - bh - 6, tail: 'down' }, { x: nx, y: 60 }, { x: s2 === 'l' ? 12 : W - 12 - bw, y: 12 }];
        const hit = b && { x: b.x - 10, y: b.y - (o.arrow === false ? 10 : 46), w: b.w + 20, h: b.h + (o.arrow === false ? 20 : 56) };
        const pick = cands.find(c => !overlap({ x: c.x, y: c.y, w: bw, h: bh }, hit, 0) && c.y >= 8 && c.y + bh <= FH - 4) || cands[0];
        place(bubble, pick.x, clamp(pick.y, 8, FH - bh - 6));
        bubble.dataset.tail = pick === cands[0] ? 'side' : pick === cands[1] ? 'down' : 'none';
      }
      for (const k of calls) {
        const cb = boxOf(k.c.target);
        k.el.style.visibility = cb ? '' : 'hidden';
        if (!cb) continue;
        const w = k.el.offsetWidth, hh = k.el.offsetHeight, below = k.c.below != null ? k.c.below : cb.y < hh + 30;
        const x = clamp(cb.x + cb.w / 2 - w / 2, 6, W - w - 6);
        place(k.el, x, below ? cb.y + cb.h + 14 : cb.y - hh - 14);
        k.el.classList.toggle('up', below); k.el.classList.toggle('down', !below);
        k.el.style.setProperty('--ax', clamp(cb.x + cb.w / 2 - x, 14, w - 14) + 'px');
      }
      if (hand) {
        const f = boxOf(o.hand.from), t = boxOf(o.hand.to);
        hand.style.visibility = trail.style.visibility = f && t ? '' : 'hidden';
        if (f && t) {
          const ax = f.x + f.w / 2, ay = f.y + f.h / 2, bx = t.x + t.w / 2, by = t.y + t.h / 2;
          place(hand, ax - 6, ay - 4); hand.style.setProperty('--dx', Math.round(bx - ax) + 'px'); hand.style.setProperty('--dy', Math.round(by - ay) + 'px');
          place(trail, ax, ay); trail.style.width = Math.round(Math.hypot(bx - ax, by - ay)) + 'px'; trail.style.transform = `rotate(${Math.atan2(by - ay, bx - ax)}rad)`;
        }
      }
    }
    let n = 0;
    function tick() {
      if (H.closed) return;
      if (o.until && o.until()) { H.next(); return; }
      if (tap === 'target' && !o.until && H.tapped) { H.next(); return; }
      const b = o.target ? boxOf(o.target) : null;
      root.classList.toggle('lost', !!o.target && !b);
      // the target moves with the scene; callouts and the hand follow their own targets, a few times a second
      if (!same(b, last) || ((calls.length || hand) && ++n % 6 === 0)) { lay(b); last = b; }
      raf = requestAnimationFrame(tick);
    }
    if (tap !== 'free') { if (cur && cur !== H) cur.close(); cur = H; allowed.clear(); } else softs.add(H);
    last = o.target ? boxOf(o.target) : null;
    lay(last);
    requestAnimationFrame(() => root.classList.add('in'));
    raf = requestAnimationFrame(tick);
    return H;
  }
  // Ends whatever step is on show.
  function hide() { if (cur) cur.close(); for (const s of [...softs]) s.close(); for (const el of document.querySelectorAll('#wk .wk-step:not(.out)')) el.remove(); }
  return { portrait: wickPortrait, portraitURL, say, show, hide, boxOf, get step() { return cur; }, get soft() { return [...softs][0] || null; }, set hold(fn) { holdFn = fn; }, get held() { return !cur && !!holdFn && !!holdFn(); } };
})();
