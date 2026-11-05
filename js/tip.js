'use strict';
// Lantern Road · tooltips (docs/ui-rules.md, rule 3: names, descriptions and rules go in a tooltip). A hover shows one
// with the mouse; a press held for half a second shows one with a finger, and the next press anywhere takes it away
// (the press that showed it doesn't also tap). The Hearth's dock and the Recruit Board's panel use them; styles are in
// css/board.css (.tp).
//   Tip.on(el, what, o)   what() returns [title, line, icon] (line and icon may be left out), or null for none
//                         o.side: 'above' (centred over el, the default), 'below' (under it, from its left edge) or
//                         'right' (beside it, centred on it)
//   Tip.hide()

const Tip = (() => {
  const PRESS = 450;
  let cur = null; // { el, node, watch }
  function hide() {
    if (!cur) return;
    clearInterval(cur.watch);
    cur.node.remove();
    cur = null;
  }
  function show(el, what, side) {
    hide();
    const w = what && what();
    const stage = document.getElementById('stage');
    if (!w || !w[0] || !stage || !el.isConnected) return false;
    const [title, line, ic] = w;
    const node = h('div', { class: 'tp', role: 'tooltip' }, h('b', { text: title }),
      line ? h('span', {}, ic ? h('img', { class: 'px', src: iconURL(ic), alt: '', width: 14, height: 14, draggable: 'false' }) : null, String(line)) : null);
    stage.append(node);
    const b = Frame.box(el, stage), W = Frame.W, H = Frame.H || 390, tw = node.offsetWidth, th = node.offsetHeight;
    let x, y;
    if (side === 'right') {
      x = Math.min(W - 16 - tw, b.right + 16);
      y = Math.max(8, Math.min(H - 8 - th, b.top + b.height / 2 - th / 2));
    } else if (side === 'below') {
      x = Math.max(16, Math.min(W - 16 - tw, b.left));
      y = b.bottom + 8 + th > H - 8 ? b.top - 8 - th : b.bottom + 8;
    } else {
      x = Math.max(16, Math.min(W - 16 - tw, b.left + b.width / 2 - tw / 2));
      y = b.top - 8 - th < 8 ? b.bottom + 8 : b.top - 8 - th;
    }
    node.style.left = Math.round(x) + 'px';
    node.style.top = Math.round(y) + 'px';
    // gone with what it names (a panel redrawn under the mouse, a screen closed)
    cur = { el, node, watch: setInterval(() => { if (!cur || !cur.el.isConnected || !cur.el.offsetWidth) hide(); }, 250) };
    return true;
  }
  function on(el, what, o = {}) {
    let t = 0, x0 = 0, y0 = 0;
    const stop = () => { clearTimeout(t); t = 0; };
    el.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') show(el, what, o.side); });
    el.addEventListener('pointerleave', e => { stop(); if (e.pointerType === 'mouse' && cur && cur.el === el) hide(); });
    el.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse') { if (cur && cur.el === el) hide(); return; }
      x0 = e.clientX; y0 = e.clientY; stop(); delete el.dataset.tipped;
      t = setTimeout(() => {
        t = 0;
        if (!show(el, what, o.side)) return;
        el.dataset.tipped = '1';
        const off = ev => { if (ev.target.closest && ev.target.closest('.tp')) return; document.removeEventListener('pointerdown', off, true); if (cur && cur.el === el) hide(); };
        setTimeout(() => document.addEventListener('pointerdown', off, true), 0);
      }, PRESS);
    });
    el.addEventListener('pointermove', e => { if (t && Math.hypot(e.clientX - x0, e.clientY - y0) > 8) stop(); });
    el.addEventListener('pointerup', stop); el.addEventListener('pointercancel', stop);
    // the tap that ends a long press doesn't also press
    el.addEventListener('click', e => { if (el.dataset.tipped) { delete el.dataset.tipped; e.stopImmediatePropagation(); e.preventDefault(); } }, true);
    el.addEventListener('contextmenu', e => { if (t || el.dataset.tipped) e.preventDefault(); });
    return el;
  }
  return { on, hide, show: (el, what, side) => show(el, what, side) };
})();
