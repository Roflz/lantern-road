'use strict';
// Lantern Road · the framed panel, a small kit for the screens that open over the Hearth (styles in css/kit.css), after
// docs/mockups/hearth.html H5: an iron-and-wood border with corner pieces, a header plate with an icon, a title and a
// count, and a round red ✕. Formation (js/formation.js) is the first to use it.
//
// Kit.panel({ icon, title, count, cls, onClose }) returns { root, plate, count, close, body }:
//   root    the panel: append it where it shows (Formation opens it in #sheet), and its body's parts to `body`
//   count   the plate's count chip (set its textContent), or null when no count was given
//   close   the ✕, which calls onClose
// Kit.button(label, fn, sec) is the kit's gold button, or its dark one with sec.

const Kit = (() => {
  function panel(o = {}) {
    const count = o.count != null ? h('span', { class: 'kp-ct', text: String(o.count) }) : null;
    const close = h('button', { class: 'kp-x', type: 'button', 'aria-label': 'Close', onclick: () => { sfx('click'); if (o.onClose) o.onClose(); } }, '✕');
    const plate = h('div', { class: 'kp-plate' }, o.icon ? h('img', { src: iconURL(o.icon), alt: '', draggable: 'false' }) : null, h('h3', { text: o.title || '' }), count);
    const body = h('div', { class: 'kp-body' });
    const root = h('div', { class: 'kp' + (o.cls ? ' ' + o.cls : ''), role: 'dialog', 'aria-label': o.title || null },
      ['tl', 'tr', 'bl', 'br'].map(c => h('i', { class: 'kp-cn ' + c })), close, plate, body);
    return { root, plate, count, close, body };
  }
  const button = (label, fn, sec) => h('button', { class: 'kp-btn' + (sec ? ' sec' : ''), type: 'button', onclick: () => { sfx('click'); fn(); } }, label);
  return { panel, button };
})();
