'use strict';
// Lantern Road · the Recruit Board's first pick (screen 3), after docs/mockups/first-pick.html P1–P5 (play-test note
// 1.26). A new game's board stands lit at the Hearth with three looking for work. Tap one and they step into the light
// while Wick says what they do, then Hire (free), and a reveal: the hero in the light, why they signed on (SIGN_ON in
// js/data.js), their rolled name, class and level. Tap to go on, back to the Hearth.
// The first session (js/firstsession.js) opens it again after 1-2 for the free recruit, with the board's own three.
// FirstPick.open({ mode: 'pick' | 'hire', rest, onDone }): rest leaves the hired hero out of the formation (Formation
// is the next step, F3). The cards hang on data-tut: pick-card (each), pick-hire (Hire), pick-reveal and pick-says (the
// new hero's line).
// Styles in css/guide.css, classes prefixed fp-.

const FirstPick = (() => {
  // Each class on a card: where it stands and what it does (two icons), and Wick's line on it. The three starters
  // are the mockup's; the board's other classes get a line in the same voice (drafts, tune).
  const CARD = {
    sellsword: { where: 'Front · Damage', icons: ['sword', 'cleave'], line: 'Hits hardest, up front. Simple and strong.' },
    hexblade: { where: 'Back · Curses', icons: ['curse', 'doom'], line: 'Curses that tick. Patient, and hard on healers.' },
    pilgrim: { where: 'Back · Healer', icons: ['holy', 'heart'], line: 'Heals, and burns the dead. Slow, but hard to kill.' },
    warden: { where: 'Front · Guard', icons: ['shield', 'heart'], line: 'Takes the blows meant for others. Nothing gets past.' },
    lamplighter: { where: 'Back · Support', icons: ['lantern', 'boot'], line: 'Lights the way: everyone hits harder, and sooner.' },
    crossbowman: { where: 'Back · Ranged', icons: ['arrow', 'mark'], line: 'Shoots from the back. One bolt, one foe.' },
  };
  const card = cls => CARD[cls] || { where: `${CLASSES[cls].row === 'front' ? 'Front' : 'Back'} · ${CLASSES[cls].role.split(/[:,]/)[0]}`, icons: [SKILLS[CLASSES[cls].basic].icon], line: (typeof GLOSSARY !== 'undefined' && GLOSSARY[cls] && GLOSSARY[cls].line) || CLASSES[cls].role };
  const click = () => sfx('click');
  const look = cls => [Items.starter(cls, 1).id, null, null];
  const big = (c, k) => { const o = document.createElement('canvas'); o.width = c.width * k; o.height = c.height * k; const g = o.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(c, 0, 0, o.width, o.height); return { src: o.toDataURL(), w: o.width, h: o.height }; };
  const img = (q, cls) => h('img', { class: cls || '', src: q.src, width: q.w, height: q.h, alt: '', draggable: 'false' });
  const iconImg = n => h('img', { src: iconURL(UI_ICONS[n] ? n : 'star'), alt: '', draggable: 'false' });
  let P = null; // { mode, list, sel, root, cards, hire, bubble, onDone }

  // Who is on offer: the three starters, or the board's recruits (its first three).
  function offer(mode) {
    if (mode === 'pick') return STARTERS.map(cls => ({ cls }));
    return Save.state.board.recruits.slice(0, 3).map(r => ({ cls: r.cls, r }));
  }
  function open(o = {}) {
    const s = Save.state, mode = o.mode || (s.roster.length ? 'hire' : 'pick');
    const list = offer(mode);
    if (!list.length) return false;
    const K = Kit.panel({ icon: 'scroll', title: 'Recruit Board', cls: 'fp-panel', onClose: close });
    if (mode === 'pick' || o.guided) K.close.hidden = true; // the first pick can't be put off
    const cards = h('div', { class: 'fp-cards' });
    const hire = h('div', { class: 'fp-hire' });
    K.body.append(cards, hire);
    const root = h('div', { class: 'fp' }, K.root);
    const wick = Wick.say('', { parent: root });
    P = { mode, list, sel: null, root, cards, hire, bubble: wick.querySelector('.wick-bubble'), onDone: o.onDone, rest: !!o.rest, guided: !!o.guided };
    openSheet(root, 'firstpick');
    draw();
    return true;
  }
  function draw() {
    if (!P) return;
    const s = Save.state;
    P.cards.classList.toggle('picked', P.sel != null);
    P.cards.replaceChildren(...P.list.map((x, i) => {
      const C = card(x.cls), sp = big(heroSide(x.cls, 0, look(x.cls)), 5);
      return h('button', { class: 'fp-card' + (P.sel === i ? ' on' : ''), type: 'button', 'data-tut': 'pick-card', 'data-cls': x.cls, 'aria-pressed': P.sel === i ? 'true' : 'false', onclick: () => { click(); P.sel = i; draw(); } },
        h('span', { class: 'fp-nm', text: CLASSES[x.cls].name }),
        h('span', { class: 'fp-rr', text: C.where }),
        h('span', { class: 'fp-dais' }, img(sp)),
        h('span', { class: 'fp-ri' }, C.icons.map(n => h('span', {}, iconImg(n)))));
    }));
    const x = P.sel != null ? P.list[P.sel] : null, price = x && x.r ? Base.recruitPrice(x.r, s) : 0;
    P.hire.replaceChildren(x ? h('button', { class: 'fp-go', type: 'button', 'data-tut': 'pick-hire', onclick: () => { click(); hire(); } }, 'Hire', h('em', { text: price ? fmt(price) : 'Free' })) : '');
    P.bubble.textContent = x ? card(x.cls).line : P.mode === 'pick' ? 'Three looking for work. Tap each to hear about them.' : 'Three new faces. Tap each to hear about them.';
  }
  function hire() {
    const s = Save.state, x = P.list[P.sel];
    let c = null;
    if (P.mode === 'pick') {
      c = Base.newGame(x.cls, s);
      if (!c) return;
      Base.tick(s);
    } else {
      c = Base.hire(x.r.id, s);
      if (!c) { toast(s.currencies.gold < Base.recruitPrice(x.r, s) ? 'Not enough gold' : 'No one more can join now'); return; }
      // Formation is the next step of the first session: they wait at the fire until placed there (F3)
      if (P.rest && s.party.filter(Boolean).length > 1) { const i = s.party.indexOf(c.id); if (i >= 0) s.party[i] = null; }
    }
    Tactics.owner(c.id); // their starter rules
    Save.commit(); sfx('kindle');
    reveal(c);
  }
  // P4: the hero in the lantern light, saying why they signed on (SIGN_ON in js/data.js, from docs/story.md's class
  // table). A tap goes on.
  function reveal(c) {
    const sp = big(heroSide(c.cls, 0, Items.look(c)), 8), why = typeof SIGN_ON !== 'undefined' ? SIGN_ON[c.cls] : null;
    const motes = Array.from({ length: 16 }, (_, k) => h('i', { class: 'fp-mote', style: `left:${42 + (k * 53) % 250 / 844 * 100}%;top:${240 + (k * 37) % 80}px;animation-delay:${((k * 0.21) % 3.2).toFixed(2)}s` }));
    const el = h('div', { class: 'fp-reveal', 'data-tut': 'pick-reveal', role: 'dialog', 'aria-label': `${c.name} the ${CLASSES[c.cls].name} joins` },
      h('div', { class: 'fp-rays' }), h('div', { class: 'fp-glow' }), motes, img(sp, 'fp-hero'),
      why ? h('div', { class: 'fp-says', 'data-tut': 'pick-says', text: why }) : null,
      h('div', { class: 'fp-plate' }, h('b', { text: c.name }), h('span', { text: `${CLASSES[c.cls].name} · Lv ${c.level}` })),
      h('div', { class: 'fp-tap', text: 'Tap to go on' }));
    const go = () => { click(); const done = P && P.onDone; close(); App.refresh(); if (done) done(c); };
    let at = Date.now();
    el.addEventListener('click', () => { if (Date.now() - at > 500) go(); });
    P.root.append(el);
  }
  function close() {
    if (!P) return;
    P = null;
    if (!$('#sheet').hidden && $('#sheet').querySelector('.fp')) closeSheet();
  }
  return { open, close, get shown() { return !!P && !$('#sheet').hidden && !!$('#sheet').querySelector('.fp'); }, get revealing() { return !!(P && P.root.querySelector('.fp-reveal')); }, CARD };
})();
