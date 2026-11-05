'use strict';
// Lantern Road · the Recruit Board's first pick (screen 3), on the board's own panel (RecruitBoard in js/buildings.js,
// docs/mockups/recruit-board.html's "First pick" states). A new game's board stands lit at the Hearth with three looking
// for work, each Free, and Wick at its left. A tap on a row is his line on the class, and the pointer moves to its +;
// + asks first (the recruit, Free, Cancel and Hire), and Hire ends in the reveal: the hero in the light, their name,
// class and level, and why they signed on (SIGN_ON in js/data.js). A tap goes on, back to the Hearth.
// The first session (js/firstsession.js) opens it again after 1-2 for the free recruit, with the board's own three.
// FirstPick.open({ mode: 'pick' | 'hire', guided, rest, onDone }): rest leaves the hired hero out of the formation
// (Formation is the next step, F3); guided (and the first pick) hides ✕. The rows hang on data-tut: pick-card (each),
// pick-plus (each +), pick-hire (the confirmation's Hire), pick-reveal and pick-says (the new hero's line); Wick's line
// is in #sheet .fp .wick-bubble.
// Styles in css/board.css (the panel, rb-; Wick and the pointer here, fp-).

const FirstPick = (() => {
  // Wick's line on each class. The three starters are the first-pick mockup's; the board's other classes get a line in
  // the same voice (drafts, tune). Where they stand and what they do is the class's tooltip (RecruitBoard.stance).
  const CARD = {
    sellsword: { line: 'Hits hardest, up front. Simple and strong.' },
    hexblade: { line: 'Curses that tick. Patient, and hard on healers.' },
    pilgrim: { line: 'Heals, and burns the dead. Slow, but hard to kill.' },
    warden: { line: 'Takes the blows meant for others. Nothing gets past.' },
    lamplighter: { line: 'Lights the way: everyone hits harder, and sooner.' },
    crossbowman: { line: 'Shoots from the back. One bolt, one foe.' },
  };
  const lineOf = cls => (CARD[cls] && CARD[cls].line) || (typeof GLOSSARY !== 'undefined' && GLOSSARY[cls] && GLOSSARY[cls].line) || CLASSES[cls].role;
  const click = () => sfx('click');
  // the guide's pointer, over the + of the row picked
  const ARROW = { map: ['..kkkkk..', '..kyYyk..', '..kyYyk..', '..kyYyk..', 'kkkyYykkk', 'kyyyYyyyk', '.kyyYyyk.', '..kyYyk..', '...kyk...', '....k....'], pal: { k: '#1a1008', y: '#f4a646', Y: '#ffd68a' } };
  let arrowURL = null;
  const arrowSrc = () => arrowURL || (arrowURL = DockArt.big(sprite(ARROW.map, ARROW.pal, 'fp:arrow'), 3));
  let P = null; // { mode, list, sel, wrap, view, bubble, arrow, onDone, rest, guided }

  // Who is on offer: the three starters (each with a name now, kept if picked), or the board's recruits (its first three).
  function offer(mode) {
    const s = Save.state;
    if (mode === 'pick') {
      const names = RECRUIT_NAMES.slice(), out = [];
      for (const cls of STARTERS) { const name = names.splice(Math.floor(Math.random() * names.length), 1)[0]; out.push({ cls, name, level: 1, price: 0 }); }
      return out;
    }
    return s.board.recruits.slice(0, 3).map(r => ({ cls: r.cls, name: r.name, level: r.level, price: Base.recruitPrice(r, s), r }));
  }
  function open(o = {}) {
    const s = Save.state, mode = o.mode || (s.roster.length ? 'hire' : 'pick');
    const list = offer(mode);
    if (!list.length) return false;
    const wrap = h('div', { class: 'fp rbw' });
    P = { mode, list, sel: null, wrap, onDone: o.onDone, rest: !!o.rest, guided: !!o.guided };
    openSheet(wrap, 'firstpick');
    draw();
    return true;
  }
  function draw() {
    if (!P) return;
    const s = Save.state;
    P.view = RecruitBoard.panel({ first: true, list: P.list, gold: s.currencies.gold, sel: P.sel, onRow: pick, onPlus: ask, onClose: P.mode === 'pick' || P.guided ? null : close });
    const wick = Wick.say('', { parent: P.view.root, cls: 'fp-wick' });
    P.bubble = wick.querySelector('.wick-bubble');
    P.arrow = h('img', { class: 'fp-arrow px', src: arrowSrc(), alt: '', width: 27, height: 30, draggable: 'false', hidden: true });
    P.view.root.append(P.arrow);
    P.wrap.replaceChildren(P.view.root);
    say();
  }
  function say() {
    const x = P.sel != null ? P.list[P.sel] : null;
    P.bubble.textContent = x ? lineOf(x.cls) : P.mode === 'pick' ? 'Three looking for work. Tap each to hear about them.' : 'Three new faces. Tap each to hear about them.';
    // the pointer over the picked row's + (from the layout, not the screen: the rows may still be rising into place)
    P.arrow.hidden = !x;
    if (!x) return;
    const plus = P.view.rows[P.sel].querySelector('[data-tut=pick-plus]');
    let x0 = plus.offsetWidth / 2 - 13.5, y0 = -34;
    for (let el = plus; el && el !== P.view.root; el = el.offsetParent) { x0 += el.offsetLeft; y0 += el.offsetTop - (el !== plus ? el.scrollTop : 0); }
    P.arrow.style.left = Math.round(x0) + 'px';
    P.arrow.style.top = Math.round(y0) + 'px';
  }
  // A tap on a row: Wick's line on the class, and the row in the light
  function pick(i) { P.sel = i; P.view.select(i); say(); }
  // + asks first: the recruit, the price (Free), Cancel and Hire
  function ask(i) {
    if (!P) return;
    if (P.sel !== i) pick(i);
    const s = Save.state, x = P.list[i];
    const why = P.mode === 'pick' ? '' : s.board.picks <= 0 ? 'No hires left' : !Base.canHire(s) ? 'Roster full' : x.price > s.currencies.gold ? `${fmt(x.price - s.currencies.gold)} short` : '';
    layer(RecruitBoard.confirm({ r: x, gold: s.currencies.gold, why, onCancel: () => layer(null), onHire: hire }));
  }
  function layer(el) { Tip.hide(); P.wrap.querySelectorAll(':scope > .rb-modal, :scope > .rb-reveal').forEach(n => n.remove()); if (el) P.wrap.append(el); }
  function hire() {
    const s = Save.state, x = P.list[P.sel];
    let c = null;
    if (P.mode === 'pick') {
      c = Base.newGame(x.cls, s, { name: x.name });
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
    layer(RecruitBoard.reveal(c, () => { click(); const done = P && P.onDone; close(); App.refresh(); if (done) done(c); }));
  }
  function close() {
    if (!P) return;
    P = null;
    Tip.hide();
    if (!$('#sheet').hidden && $('#sheet').querySelector('.fp')) closeSheet();
  }
  return { open, close, get shown() { return !!P && !$('#sheet').hidden && !!$('#sheet').querySelector('.fp'); }, get revealing() { return !!(P && P.wrap.querySelector('.rb-reveal')); }, CARD };
})();
