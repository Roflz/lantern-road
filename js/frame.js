'use strict';
// Lantern Road · the landscape frame. Every screen is landscape (the user's decision of 2026-11-04).
//
// #stage is the landscape stage. It is 390 design pixels tall, and 390 × the window's aspect ratio wide, clamped to an
// aspect of 1.78–2.4 (694–936 pixels). Everything lays out in those design pixels. The stage is then scaled uniformly
// to fit the window and centred, letterboxed on #app's background. The design target is 844×390, a phone on its side.
//   Turned   a touch phone held upright (a coarse pointer, and a window taller than wide) gets the stage drawn a
//            quarter-turn clockwise, so a player with rotation lock on can simply turn the phone. A window with a
//            mouse is never turned: it letterboxes.
//   Notches  the safe-area insets at both ends of the stage's long side are kept clear: left and right on a phone on
//            its side, top and bottom when turned.
// #frame is where the current screen draws. A screen registered with `full: true` (the battle) fills the stage; every
// other screen keeps its portrait layout in a centred column, 390 wide and the full height (the `column` class), until
// its turn comes to be redesigned for landscape (docs/idle-heroes-study.md §6).
//
// Frame.point(ev) and Frame.box(el) turn a pointer's clientX/clientY and an element's getBoundingClientRect() into
// design pixels on the stage, allowing for the scale and the turn. Pass a second element to get them relative to its
// box instead. Use them wherever code reads pointer positions or measures elements on screen. Layout sizes
// (clientWidth, offsetHeight, scrollTop) are already in design pixels and need nothing.
//
// Touch scrolling follows the finger through the turn on its own, with two catches, because Chromium reads both
// against the screen rather than the turned frame:
//   - a scroller must not set overflow-x:hidden (or clip). Turned, the finger moves sideways on the screen, and a
//     scroller that can't scroll sideways is skipped. Clip a child instead (css/map.css, .mapinner).
//   - touch-action pan-x and pan-y swap when turned: write the turned rule under #stage.turned (css/base.css, .rrow).

const Frame = (() => {
  const H = 390, MIN = 1.78, MAX = 2.4;
  const app = document.getElementById('app'), stage = document.getElementById('stage'), frame = document.getElementById('frame');
  const coarse = window.matchMedia ? window.matchMedia('(pointer: coarse)') : null;
  const F = { W: 844, k: 1, turned: false };
  const subs = [];
  let sig = '';

  function layout() {
    const aw = app.clientWidth, ah = app.clientHeight;
    if (!aw || !ah) return;
    const cs = getComputedStyle(app), px = v => parseFloat(v) || 0;
    const turned = !!(coarse && coarse.matches) && ah > aw;
    // The stage's long side runs along the window's width, or along its height when turned.
    const i0 = px(turned ? cs.paddingTop : cs.paddingLeft), i1 = px(turned ? cs.paddingBottom : cs.paddingRight);
    const long = Math.max(1, (turned ? ah : aw) - i0 - i1), short = turned ? aw : ah;
    const W = Math.round(H * clamp(long / short, MIN, MAX)), k = Math.min(long / W, short / H);
    const sl = W * k, ss = H * k; // the stage on screen, along the long side and the short side
    const along = Math.round(i0 + (long - sl) / 2), across = Math.round((short - ss) / 2);
    stage.style.width = W + 'px'; stage.style.height = H + 'px';
    // Turned: the stage's top edge faces the window's right side; its left end is at the top.
    stage.style.transform = turned ? `translate(${across + ss}px,${along}px) rotate(90deg) scale(${k})` : `translate(${along}px,${across}px) scale(${k})`;
    stage.classList.toggle('turned', turned);
    F.W = W; F.k = k; F.turned = turned;
    changed();
  }
  // Tells whoever lays out inside the frame (the battle's canvas) when its size in design pixels changes.
  function changed() {
    const s = `${F.W}|${F.turned}|${frame.classList.contains('column')}`;
    if (s === sig) return;
    sig = s;
    for (const fn of subs) fn();
  }
  // The column for the screens not yet redesigned, or the whole stage (js/app.js sets it as each screen opens).
  function column(on) { frame.classList.toggle('column', !!on); changed(); }

  // ── window pixels into design pixels
  function toDesign(cx, cy) {
    const r = stage.getBoundingClientRect(), dx = cx - r.left, dy = cy - r.top;
    return F.turned ? { x: dy / F.k, y: H - dx / F.k } : { x: dx / F.k, y: dy / F.k };
  }
  // An element's box on the stage, or relative to ref's box: { left, top, right, bottom, width, height }.
  function box(el, ref) {
    const r = el.getBoundingClientRect(), a = toDesign(r.left, r.top), b = toDesign(r.right, r.bottom);
    let left = Math.min(a.x, b.x), top = Math.min(a.y, b.y), right = Math.max(a.x, b.x), bottom = Math.max(a.y, b.y);
    if (ref) { const o = box(ref); left -= o.left; right -= o.left; top -= o.top; bottom -= o.top; }
    return { left, top, right, bottom, width: right - left, height: bottom - top };
  }
  // A pointer (or mouse, or touch) event's position on the stage, or relative to ref's box: { x, y }.
  function point(ev, ref) {
    const t = (ev.touches && ev.touches[0]) || (ev.changedTouches && ev.changedTouches[0]) || ev;
    const p = toDesign(t.clientX, t.clientY);
    if (ref) { const o = box(ref); p.x -= o.left; p.y -= o.top; }
    return p;
  }

  window.addEventListener('resize', layout);
  if (window.ResizeObserver) new ResizeObserver(layout).observe(app);
  if (coarse) { if (coarse.addEventListener) coarse.addEventListener('change', layout); else if (coarse.addListener) coarse.addListener(layout); }
  layout();

  return {
    point, box, column, layout,
    on: fn => { subs.push(fn); },
    get W() { return F.W; }, get H() { return H; }, get k() { return F.k; }, get turned() { return F.turned; },
  };
})();
