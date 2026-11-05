'use strict';
// Lantern Road · Formation (screen 5), after docs/mockups/formation.html (play-test note 1.31). A framed panel
// (js/kit.js) over the dimmed Hearth, opened by a tap on the party view's formation grid (js/camp.js):
//   the line    the party as it stands in battle: the back two columns, then the front column on the right, in the
//               same slots as Save.state.party (0–1 front, 2–5 back). Each hero stands on a pad in their side sprite,
//               with a level chip and a fatigue bar; the frontier stage's foes stand as silhouettes on the right.
//   the side    how many are in front, behind and resting; Auto and Done.
//   the strip   the roster, highest level first: portrait, level, fatigue. The party wears an amber dot; Spent heroes
//               are greyed and tagged, but can still be placed (the user's decision on 1.31).
// Drag, with a mouse or a finger: a portrait onto a place puts them there (whoever stood there rests); a hero onto
// another place swaps them; a hero onto the strip rests them, keeping one in the party. A drag along the strip
// scrolls it. A tap on a hero opens the hero screen. Warnings, not rules: a melee hero in the back shows Defends only
// (the battle has them Defend, js/sim.js); the Oathbound Gorget still keeps its wearer in front (App.frontLocked).
// Auto fills open places with resting heroes who aren't Spent: front-row classes in front, the highest level first.
// The guide's step 12 points at it through data-tut: formation-front and formation-back (the two rows),
// formation-open (the first open place), formation-roster (the strip), formation-auto and formation-done.
// Styles in css/formation.css, classes prefixed fm-.

const Formation = (() => {
  // where each slot stands in the line, as a share of its width and height (the feet): back two columns, front right
  const PLACE = [[0.53, 0.47], [0.53, 0.9], [0.15, 0.47], [0.34, 0.47], [0.15, 0.9], [0.34, 0.9]];
  // the foes, facing them: their front column nearest
  const FOE_AT = [[0.75, 0.47], [0.75, 0.9], [0.93, 0.47], [0.85, 0.47], [0.93, 0.9], [0.85, 0.9]];
  const FOE_SHAPES = new Set(['foe', 'front', 'back', 'random3', 'foes']);
  const MOVE = 6;      // design pixels before a press becomes a drag
  let P = null;        // the panel on show: { root, line, strip, count, who, ... }
  let drag = null;

  const S = () => Save.state;
  const party = () => S().party;
  const inParty = id => party().includes(id);
  const fatCol = c => ({ fresh: 'var(--good)', weary: 'var(--gold)', exhausted: 'var(--bad)', spent: 'var(--dim)' }[Fatigue.state(c)]);
  const fatBar = (cls, c) => h('span', { class: cls }, h('i', { style: `width:${Math.min(100, Math.round(c.fatigue || 0))}%;background:${fatCol(c)}` }));
  const pxImg = (src, w, hh, cls = '') => h('img', { class: 'px ' + cls, src, alt: '', width: w, height: hh, draggable: 'false' });
  const frontClass = c => CLASSES[c.cls].row === 'front';
  const stage = () => STAGES[Math.min(Campaign.frontier(), STAGES.length - 1)];

  // A hero who can only attack in melee, without reach: in the back row the battle has them Defend instead.
  function defendsOnly(c) {
    if (Items.effects(c).some(id => GEAR[id].fx && GEAR[id].fx.hook)) return false; // the Halberdier's Hook
    const attacks = [CLASSES[c.cls].basic, ...(c.equip || [])].map(id => id && SKILLS[id]).filter(sk => sk && FOE_SHAPES.has(sk.shape));
    return attacks.length > 0 && attacks.every(sk => { const r = sk.charge ? SKILLS[sk.charge] : sk; return r.range === 'melee' && !sk.reach && !r.reach; });
  }

  // The side sprite at 2×, cached per class and look.
  const standCache = new Map();
  function standing(c) {
    const look = Items.look(c), k = c.cls + '|' + lookKey(look);
    if (!standCache.has(k)) { const s = heroSide(c.cls, 0, look); standCache.set(k, { src: heroImgURL(c.cls, look), w: s.width * 2, h: s.height * 2 }); }
    return standCache.get(k);
  }
  const foeCache = new Map();
  function silhouette(key) {
    if (!foeCache.has(key)) { const t = tinted(foeSprite(key), '#1e1628'), k = Math.min(2, 76 / t.height); foeCache.set(key, { src: t.toDataURL(), w: Math.round(t.width * k), h: Math.round(t.height * k) }); }
    return foeCache.get(key);
  }

  // ── building it
  function open() {
    if (!S() || !S().roster.length) return;
    const K = Kit.panel({ icon: 'helm', title: 'Formation', count: '', cls: 'fm', onClose: close });
    const line = h('div', { class: 'fm-line' }), strip = h('div', { class: 'fm-strip', 'data-tut': 'formation-roster', 'aria-label': 'The roster' });
    const who = h('div', { class: 'fm-who' });
    const auto = Kit.button('Auto', fill, true), done = Kit.button('Done', close);
    auto.dataset.tut = 'formation-auto'; done.dataset.tut = 'formation-done';
    auto.classList.add('fm-auto'); done.classList.add('fm-done');
    K.body.append(h('div', { class: 'fm-body' }, line, h('div', { class: 'fm-side' }, who, h('div', { class: 'fm-btns' }, auto, done))), strip);
    const root = h('div', { class: 'fm-root' }, K.root);
    P = { wrap: root, root: K.root, count: K.count, line, strip, who, auto, done };
    root.addEventListener('pointerdown', down);
    root.addEventListener('pointermove', move);
    root.addEventListener('pointerup', up);
    root.addEventListener('pointercancel', up);
    root.addEventListener('lostpointercapture', up);
    strip.addEventListener('wheel', ev => { const d = Math.abs(ev.deltaX) > Math.abs(ev.deltaY) ? ev.deltaX : ev.deltaY; if (!d) return; strip.scrollLeft += d; ev.preventDefault(); }, { passive: false });
    openSheet(root, 'formation');
    render();
    document.addEventListener('keydown', key);
  }
  function close() {
    if (!P) return;
    end();
    P = null;
    document.removeEventListener('keydown', key);
    if (!$('#sheet').hidden && $('#sheet').querySelector('.fm-root')) closeSheet();
    if (App.current === 'home') App.refresh();
  }
  function key(ev) {
    if (!live()) { document.removeEventListener('keydown', key); return; }
    if (ev.key === 'Escape') { ev.preventDefault(); sfx('click'); close(); }
  }
  // Gone without close(): another screen took the sheet (the hero screen, App.go).
  const live = () => P && P.root.isConnected;

  // The places and the portraits are kept from one render to the next, and only their insides change: a finger's touch
  // stays with the node it began on, and a node taken away under it costs the next tap its click.
  function render() {
    if (!live()) { P = null; return; }
    const s = S(), p = s.party;
    if (!P.slots) build();
    const firstOpen = [0, 1, 2, 3, 4, 5].find(i => !p[i]);
    p.forEach((id, i) => {
      const c = id && Save.char(id), front = i < 2, el = P.slots[i];
      el.className = 'fm-slot' + (c ? '' : ' empty') + (front ? ' front' : '');
      attr(el, 'data-id', c ? c.id : null);
      attr(el, 'data-tut', i === firstOpen ? 'formation-open' : null);
      attr(el, 'role', c ? 'button' : null);
      attr(el, 'aria-label', c ? `${c.name}, level ${c.level}, ${front ? 'front' : 'back'}` : `Open place, ${front ? 'front' : 'back'}`);
      const kids = [h('span', { class: 'fm-pad' })];
      if (c) {
        const sp = standing(c);
        kids.push(pxImg(sp.src, sp.w, sp.h, 'fm-sp' + (Fatigue.spent(c) ? ' spent' : '')), h('span', { class: 'fm-lv', text: String(c.level) }), fatBar('fm-ft', c));
        if (!front && defendsOnly(c)) kids.push(h('span', { class: 'fm-warn' }, pxImg(iconURL('shield'), 11, 11), 'Defends only'));
      }
      el.replaceChildren(...kids);
    });
    // the strip: the roster, highest level first
    const list = s.roster.slice().sort((a, b) => b.level - a.level), x = P.strip.scrollLeft;
    const els = list.map(c => {
      let el = P.ports.get(c.id);
      if (!el) { el = h('div', { 'data-id': c.id, role: 'button' }); P.ports.set(c.id, el); }
      const spent = Fatigue.spent(c), on = inParty(c.id);
      el.className = 'fm-port' + (on ? ' in' : '') + (spent ? ' spent' : '');
      el.setAttribute('aria-label', `${c.name}, level ${c.level}${on ? ', in the party' : ''}${spent ? ', Spent' : ''}`);
      el.replaceChildren(h('span', { class: 'fm-pf' }, pxImg(heroPortrait(c), 48, 48), h('em', { text: String(c.level) }), spent ? h('span', { class: 'fm-tag', text: 'Spent' }) : null), fatBar('fm-ft', c));
      return el;
    });
    const now = [...P.strip.querySelectorAll('.fm-port')];
    if (now.length !== els.length || now.some((el, k) => el !== els[k])) P.strip.replaceChildren(P.sort, ...els);
    P.strip.scrollLeft = x;
    // the count and the side
    const n = p.filter(Boolean).length, fr = p.slice(0, 2).filter(Boolean).length;
    P.count.textContent = `${n} / 6`;
    const line = (ic, v, label) => h('div', {}, pxImg(iconURL(ic), 14, 14), h('b', { text: String(v) }), label);
    P.who.replaceChildren(line('shield', fr, 'Front'), line('arrow', n - fr, 'Back'), line('fatigue', s.roster.length - n, 'Resting'));
  }
  const attr = (el, k, v) => { if (v == null) el.removeAttribute(k); else el.setAttribute(k, v); };
  // What stays put in the line: the rows, their labels, the foes and their stage, and the six places.
  function build() {
    const st = stage(), foes = h('div', { class: 'fm-foes', 'aria-hidden': 'true' });
    (st.foes || []).forEach((f, i) => {
      if (!f || !FOE_ART[f] || !FOE_AT[i]) return;
      const g = silhouette(f), im = pxImg(g.src, g.w, g.h);
      im.style.left = FOE_AT[i][0] * 100 + '%'; im.style.top = FOE_AT[i][1] * 100 + '%';
      foes.append(im);
    });
    P.slots = PLACE.map(([x, y], i) => h('div', { class: 'fm-slot', 'data-slot': String(i), style: `left:${x * 100}%;top:${y * 100}%` }));
    P.ports = new Map();
    P.sort = h('div', { class: 'fm-sort', 'aria-hidden': 'true' }, 'Sort', h('b', { text: 'Lv' }));
    const back = [2, 3].map(i => PLACE[i][0]), mid = (back[0] + back[1]) / 2;
    P.line.replaceChildren(
      h('span', { class: 'fm-row back', 'data-tut': 'formation-back', style: `left:${back[0] * 100}%;right:${(1 - back[1]) * 100}%` }),
      h('span', { class: 'fm-row front', 'data-tut': 'formation-front', style: `left:${PLACE[0][0] * 100}%` }),
      h('span', { class: 'fm-lab', style: `left:${mid * 100}%`, text: 'Back' }), h('span', { class: 'fm-lab front', style: `left:${PLACE[0][0] * 100}%`, text: 'Front' }),
      foes, h('span', { class: 'fm-stage' }, h('i'), st.id), ...P.slots);
  }

  // ── changing it
  function changed(msg) {
    sfx('click');
    render();
    if (App.current === 'home') App.refresh(); // the camp's grid behind, updated in place
    if (msg) toast(msg);
  }
  function rest(slot) {
    const p = party(), c = Save.char(p[slot]);
    if (!c) return;
    if (p.filter(Boolean).length <= 1) { toast('One hero has to set out'); return; }
    p[slot] = null;
    Save.commit();
    changed(`${c.name} rests at the Hearth`);
  }
  function fill() {
    const p = party(), free = S().roster.filter(c => !p.includes(c.id) && !Fatigue.spent(c)).sort((a, b) => b.level - a.level);
    let n = 0;
    for (const want of ['front', 'back']) for (let i = 0; i < 6; i++) {
      if (p[i] || (i < 2) !== (want === 'front')) continue;
      const ok = free.filter(c => want === 'front' || !Items.fixedFront(c));
      const c = ok.find(x => frontClass(x) === (want === 'front')) || ok[0];
      if (!c) continue;
      p[i] = c.id; free.splice(free.indexOf(c), 1); n++;
    }
    if (!n) { sfx('click'); toast(p.every(Boolean) ? 'Every place is filled' : 'No rested heroes'); return; }
    Save.commit();
    changed(`${plural(n, 'place')} filled`);
  }

  // ── drag: a pointer on a hero (in the line or the strip), or along the strip to scroll it
  const at = ev => Frame.point(ev, P.wrap);
  function down(ev) {
    if (drag || ev.button > 0 || !live()) return;
    const src = ev.target.closest('.fm-slot[data-id], .fm-port'), inStrip = ev.target.closest('.fm-strip');
    if (!src && !inStrip) return;
    const p = at(ev);
    drag = { pid: ev.pointerId, src, id: src ? src.dataset.id : null, from: src && src.classList.contains('fm-slot') ? +src.dataset.slot : null, x0: p.x, y0: p.y, mode: null, ghost: null, over: null, sx: P.strip.scrollLeft };
    try { P.wrap.setPointerCapture(ev.pointerId); } catch (e) { /* the pointer is already gone */ }
  }
  function move(ev) {
    if (!drag || ev.pointerId !== drag.pid || !live()) return;
    const p = at(ev), dx = p.x - drag.x0, dy = p.y - drag.y0;
    if (!drag.mode) {
      if (Math.hypot(dx, dy) < MOVE) return;
      // from the strip, a drag along it scrolls; up and away lifts the hero
      drag.mode = drag.src && (drag.from != null || Math.abs(dy) > Math.abs(dx)) ? 'lift' : 'scroll';
      if (drag.mode === 'lift') {
        const c = Save.char(drag.id);
        drag.ghost = h('div', { class: 'fm-ghost', 'aria-hidden': 'true' }, pxImg(heroPortrait(c), 48, 48));
        P.wrap.append(drag.ghost);
        drag.src.classList.add('lift');
      }
    }
    if (drag.mode === 'scroll') { P.strip.scrollLeft = drag.sx - dx; return; }
    drag.ghost.style.left = Math.round(p.x) + 'px'; drag.ghost.style.top = Math.round(p.y) + 'px';
    drag.over = target(p);
    for (const s of P.line.querySelectorAll('.fm-slot')) s.classList.toggle('over', drag.over === s);
    P.strip.classList.toggle('over', drag.over === P.strip);
  }
  // The place (or the strip) under a design point in the panel, or null.
  function target(p) {
    for (const s of P.line.querySelectorAll('.fm-slot')) {
      const b = Frame.box(s, P.wrap);
      if (p.x > b.left + 6 && p.x < b.right - 6 && p.y > b.top - 4 && p.y < b.bottom + 8) return s;
    }
    const b = Frame.box(P.strip, P.wrap);
    return drag.from != null && p.x > b.left && p.x < b.right && p.y > b.top - 6 && p.y < b.bottom ? P.strip : null;
  }
  function up(ev) {
    if (!drag || ev.pointerId !== drag.pid) return;
    const d = drag;
    end();
    if (!live()) return;
    if (!d.mode) {
      if (ev.type === 'pointerup' && d.id) { sfx('click'); App.showCharacter(d.id); } // a tap: the hero screen
      return;
    }
    if (d.mode !== 'lift' || ev.type !== 'pointerup' || !d.over) { render(); return; }
    if (d.over === P.strip) { rest(d.from); render(); return; }
    const i = +d.over.dataset.slot;
    const ok = d.from != null ? App.swapSlots(d.from, i) : App.placeIn(i, d.id);
    if (ok) changed(); else render();
  }
  function end() {
    if (!drag) return;
    if (drag.ghost) drag.ghost.remove();
    if (P) { P.line.querySelectorAll('.fm-slot').forEach(s => s.classList.remove('over')); P.strip.classList.remove('over'); }
    if (drag.src) drag.src.classList.remove('lift');
    drag = null;
  }

  return { open, close, defendsOnly, get shown() { return !!live(); } };
})();
