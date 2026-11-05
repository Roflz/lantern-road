'use strict';
// Lantern Road · the Heroes list (the 'party' screen), after docs/mockups/hero-card.html's Heroes state (approved
// 2026-11-05) and docs/ui-rules.md: every hero as a card in four columns, landscape. The Hearth's Heroes button opens
// it (App.go('party')); Formation (js/formation.js) is where the party is arranged.
//   a card      the hero full length in a niche, their row as an icon (front, back or resting), the name, the class,
//               the level banner with XP and the fatigue bar; a badge with the stat points to spend, or ! for a
//               threshold. A tap opens the hero card (js/sheet.js), whose ‹ comes back here
//   the top     ‹ back to the Hearth; Heroes and the count against the roster's room; the filters (everyone, in the
//               party, resting), Dismiss (a mode: a tap on a hero asks, then sends them on their way) and the Bag
//   the end     a + card while there's room and the Recruit Board is open: it opens the board
// The guide's anchors: heroes-back, heroes-filter-<all|party|rest>, heroes-dismiss, heroes-bag, party-hero (each card,
// with data-id) and heroes-hire. Styles in css/hero.css (hl-), with the card kit (hc-).

const HeroesList = (() => {
  const ui = { list: 'all', dismiss: false, view: null };
  const click = () => sfx('click');
  const S = () => Save.state;
  const tip = (title, body) => (body ? title + '|' + body : title);
  const pxImg = (src, w, hh, cls = '') => h('img', { class: 'px ' + cls, src, alt: '', width: w, height: hh, draggable: 'false' });
  const icon = (n, s) => pxImg(iconURL(UI_ICONS[n] ? n : 'star'), s, s);
  const ib = (ic, label, fn, o = {}) => h('button', { class: 'hc-ib' + (o.on ? ' on' : ''), type: 'button', 'data-tip': label, 'aria-label': label.split('|')[0], 'data-tut': o.tut || null, onclick: e => { e.stopPropagation(); click(); fn(); } }, icon(ic, 16));
  const bigURL = (c, k) => { const o = document.createElement('canvas'); o.width = c.width * k; o.height = c.height * k; const g = o.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(c, 0, 0, o.width, o.height); return o.toDataURL(); };
  const spriteCache = new Map();
  // a hero full length at 4×, in their gear
  function spriteURL(c) {
    const look = Items.look(c), key = c.cls + '|' + lookKey(look);
    if (!spriteCache.has(key)) { const s = heroSide(c.cls, 0, look); spriteCache.set(key, { url: bigURL(s, 4), w: s.width * 4, h: s.height * 4 }); }
    return spriteCache.get(key);
  }
  // the party in its order, then the resting, highest level first
  function heroes() {
    const s = S(), p = s.party.map(id => id && Save.char(id)).filter(Boolean);
    return p.concat(s.roster.filter(c => !p.includes(c)).sort((a, b) => b.level - a.level));
  }
  const rowOf = c => { const i = S().party.indexOf(c.id); return i < 0 ? null : i < 2 ? 'front' : 'back'; };
  const ROW = { front: ['shield', 'Front row'], back: ['arrow', 'Back row'], null: ['fatigue', 'Resting'] };

  function draw() { if (ui.view && ui.view.isConnected && App.current === 'party') build(ui.view); }
  function build(v) {
    const s = S(), cap = typeof Base !== 'undefined' ? Base.rosterCap(s) : s.roster.length, all = heroes();
    const show = all.filter(c => ui.list === 'all' || (ui.list === 'party' ? !!rowOf(c) : !rowOf(c)));
    Tip.hide();
    const filter = (k, label, ic) => ib(ic, label, () => { ui.list = k; draw(); }, { on: ui.list === k, tut: 'heroes-filter-' + k });
    const card = (c, n) => {
      const C = CLASSES[c.cls], need = Hero.xpToNext(c.level), top = c.level >= HERO.CAP, P = Hero.points(c), thr = Hero.pending(c).length, f = Math.floor(c.fatigue || 0);
      const st = Fatigue.state(c), row = rowOf(c), sp = spriteURL(c), [ric, rword] = ROW[row];
      const badge = ui.dismiss ? h('em', { class: 'hc-badge hl-x', text: '✕' })
        : P.stat > 0 ? h('em', { class: 'hc-badge', 'data-tip': tip(P.stat === 1 ? 'A point to spend' : `${P.stat} points to spend`, 'On the hero card'), text: String(P.stat) })
          : thr ? h('em', { class: 'hc-badge', 'data-tip': tip(`Level ${Hero.pending(c)[0]}`, 'A path to choose'), text: '!' }) : null;
      return h('button', { class: 'hl-hero hc-in' + (row ? '' : ' rest') + (Fatigue.spent(c) ? ' out' : '') + (ui.dismiss ? ' dis' : ''), type: 'button', style: `--d:${40 + n * 40}ms`, 'data-tut': 'party-hero', 'data-id': c.id, 'aria-label': c.name,
        onclick: () => { click(); if (ui.dismiss) askDismiss(c); else App.showCharacter(c.id); } },
        h('span', { class: 'hl-niche' }, pxImg(sp.url, sp.w, sp.h, 'hl-spr'), h('span', { class: 'hl-row', 'data-tip': rword }, icon(ric, 12))),
        h('span', { class: 'hl-inf' },
          h('b', { class: 'hl-nm', text: c.name }), h('span', { class: 'hl-cl', text: c.classes.map(k => CLASSES[k].name).join(' + ') }),
          h('span', { class: 'hl-meta' },
            h('span', { class: 'hc-lvb sm', 'data-tip': tip(`Level ${c.level}`, top ? 'The highest level' : `${fmt(c.xp)} / ${fmt(need)} XP`) }, h('b', { text: String(c.level) }), h('i', {}, h('u', { style: `width:${top ? 100 : Math.min(100, Math.round(100 * c.xp / need))}%` }))),
            h('span', { class: 'hc-fat ' + st, 'data-tip': tip(st === 'fresh' ? 'Rested' : FATIGUE_NAMES[st], `Fatigue ${f}%`) }, icon('fatigue', 12), h('i', {}, h('u', { style: `width:${Math.min(100, f)}%` }))))),
        badge);
    };
    const cards = show.map(card);
    const free = cap - s.roster.length, board = typeof Base !== 'undefined' && Base.boardOpen(s) && typeof Buildings !== 'undefined';
    if (ui.list !== 'rest' && !ui.dismiss && free > 0 && board) cards.push(h('button', { class: 'hl-hero empty hc-in', type: 'button', style: `--d:${40 + cards.length * 40}ms`, 'data-tut': 'heroes-hire', 'data-tip': tip(free === 1 ? 'A place free' : `${free} places free`, 'Hire at the Recruit Board'), 'aria-label': 'The Recruit Board',
      onclick: () => { click(); Buildings.open('recruitboard'); } }, h('i', { class: 'hl-cross' })));
    const keep = [...v.querySelectorAll('[data-scroll]')].map(el => [el.dataset.scroll, el.scrollTop]);
    v.replaceChildren(
      h('div', { class: 'hc-edge' }, ['tl', 'tr', 'bl', 'br'].map(k => h('i', { class: 'cn ' + k }))),
      h('button', { class: 'hc-back hc-ib', type: 'button', 'aria-label': 'Back to the Hearth', 'data-tip': 'Back', 'data-tut': 'heroes-back', onclick: () => { click(); App.go('home'); } }, h('span', { class: 'gl', text: '‹' })),
      h('div', { class: 'hc-title hc-in' }, h('b', { text: 'Heroes' }), h('span', { 'data-tip': tip(`${s.roster.length} of ${cap} places`, 'The Barracks makes room for more'), text: `${s.roster.length} / ${cap}` })),
      h('div', { class: 'hc-sorts hc-in' }, filter('all', 'Everyone', 'helm'), filter('party', 'In the party', 'shield'), filter('rest', 'Resting', 'fatigue'), h('i', { class: 'hc-gap' }),
        all.length > 1 ? ib('skull', tip('Dismiss', 'A hero leaves for good'), () => { ui.dismiss = !ui.dismiss; draw(); }, { on: ui.dismiss, tut: 'heroes-dismiss' }) : null,
        ib('bag', 'The Bag', () => App.go('bag', { back: 'party' }), { tut: 'heroes-bag' })),
      h('div', { class: 'hl-grid', 'data-scroll': 'grid' }, cards));
    for (const [k, y] of keep) { const el = v.querySelector(`[data-scroll="${k}"]`); if (el) el.scrollTop = y; }
    tipsFor(v);
    v.classList.remove('hc-enter');
  }
  // Dismiss: their gear goes back to the Bag, and nothing else comes back (home-base spec §7, js/base.js).
  function askDismiss(c) {
    const s = S(), why = Base.whyNotDismiss(c, s);
    if (why) { toast(why, 'bad'); return; }
    const K = Kit.panel({ title: `Dismiss ${c.name}?`, cls: 'hl-ask', onClose: closeSheet });
    K.body.append(h('p', { class: 'hl-ask-p', text: 'They leave for good. Their gear goes back to the Bag.' }),
      h('div', { class: 'hc-row end' },
        Kit.button(`Keep ${c.name}`, closeSheet, true),
        Kit.button('Dismiss', () => { if (Base.dismiss(c.id, s)) { Save.commit(); closeSheet(); toast(`${c.name} has left the company`); ui.dismiss = false; draw(); } })));
    openSheet(K.root, 'hl-sheet');
  }

  App.screen('party', {
    tab: true, full: true, bare: true,
    render() {
      ui.dismiss = false;
      ui.view = h('div', { class: 'hl-view hc' });
      build(ui.view);
      ui.view.classList.add('hc-enter');
      return ui.view;
    },
    refresh() { draw(); },
    leave() { Tip.hide(); ui.dismiss = false; },
  });
  // Escape: out of Dismiss, or back to the Hearth
  document.addEventListener('keydown', ev => {
    if (App.current !== 'party' || ev.key !== 'Escape' || !$('#sheet').hidden || (ev.target.closest && ev.target.closest('input,textarea,select'))) return;
    ev.preventDefault(); click();
    if (ui.dismiss) { ui.dismiss = false; draw(); } else App.go('home');
  });
  return { draw, get list() { return ui.list; }, get dismissing() { return ui.dismiss; } };
})();
