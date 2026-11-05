'use strict';
// Lantern Road · the hero card (screen 8), after docs/mockups/hero-card.html (mockup D1, approved 2026-11-05) and
// docs/ui-rules.md: one page on the whole landscape stage, one big hero, plain lists on a dark ground under header
// plates, and names and explanations in tooltips (Tip, below: hover on a computer, a long press on a phone).
//   the left    ‹ back; the name, with a pencil to rename (12 letters at most); the class; ◂ ▸ through the party, then
//               the resting. The hero full length in a stone arch (the art below, after docs/mockups/hearth-art.js),
//               wearing their gear or what is being tried on (SpriteStage, js/stage.js); the level banner with XP
//               inside it; fatigue as an icon and a bar. Under the arch the seven stats, icon and number, and in the
//               eighth place Spend (with the points on its badge), Auto while spending, or what a piece tried on adds
//   the middle  Gear: the three slots as tall cards in their rarity's frame (js/bag.js, GearUI.tall), and Best when
//               the Bag has better; Resistances, icon and number (level-up points no longer go into them)
//   the right   Skills: where the skill picked is used from and what it hits (the dots), its name and mana, then the
//               slot tiles (Basic, Skill I…, the next slot locked) and the other skills; Tree opens the skill tree
//               (a threshold first, when one waits; Respec is on the tree's plate). Tactics: the hero's tactics in
//               order, then Otherwise; Edit opens the Tactics screen (js/rules.js)
// Modes, one at a time:
//   Spend       the stats take a tap each (a + on each), Auto places the rest the way the class likes, Done keeps them
//   dressing    a tap on a gear slot: the Bag covers the middle and the right, showing that slot (the slot icons on its
//               plate switch). A tap on a piece tries it on: the hero wears it in the arch, the stats show what it
//               changes in green and red, and its card has Wear. The worn piece's card has Take off
//   a skill     a tap on a slot tile: the skills that fit replace Tactics; Use puts the one picked in the slot
//   the tree    the skill tree, a threshold's choice or a respec, in the panel's place, as before
// Every change goes through the hero model (js/hero.js) or the item model (js/items.js), and is saved.
// The guide's anchors (data-tut): hero-back, hero-name (rename's box), hero-rename (the pencil), hero-next (▸),
// hero-stats, hero-stat-<key> (each stat), hero-plus-<key> (its + while spending), hero-points (Spend), hero-auto,
// hero-keep (Done), hero-effects (what a piece tried on adds or loses), hero-tab-gear, hero-autoequip (Best),
// hero-slot-weapon, hero-slot-armor, hero-slot-accessory, gear-pick (a piece in the dressing, with data-uid),
// gear-wear (Wear), gear-done (✓), hero-stat-res and hero-stat-res-<key>, hero-tab-skills, hero-skills,
// hero-skill-slot, hero-tree, hero-tab-rules, hero-rules, hero-edit.
// HeroSheet.placing: the points placed while spending and not yet kept; HeroSheet.mode: 'card', 'spend', 'dress',
// 'pick' or 'tree'. Styles in css/hero.css (hr-) and css/gear.css (gc-, pc-).

// ── tooltips: an element's data-tip ("Title|What it does") shows in a small card by it, on hover with a mouse and on a
// long press with a finger. A tap on something with a tooltip and nothing else to do (a stat, a resistance) shows it
// too. Tip.attach(root) once per screen; the card goes in the screen's view.
const Tip = (() => {
  const PRESS = 450;
  let box = null, at = null, t = 0, hideT = 0, x0 = 0, y0 = 0, kind = 'mouse';
  function hide() { clearTimeout(hideT); if (box) box.remove(); box = null; at = null; }
  function show(el, ms) {
    const s = el && el.dataset.tip;
    if (!s || !el.isConnected) return;
    const host = el.closest('.view') || document.getElementById('frame');
    hide();
    const [title, body] = s.split('|');
    box = h('div', { class: 'tip-box', role: 'tooltip' }, h('b', { text: title }), body ? h('span', { text: body }) : null);
    host.append(box); at = el;
    const b = Frame.box(el, host), W = host.clientWidth, H = host.clientHeight, w = box.offsetWidth, hh = box.offsetHeight;
    let top = b.top - hh - 8;
    if (top < 8) top = b.bottom + 8;
    if (top + hh > H - 8) top = Math.max(8, H - 8 - hh);
    box.style.left = clamp(b.left + b.width / 2 - w / 2, 16, Math.max(16, W - 16 - w)) + 'px';
    box.style.top = top + 'px';
    if (ms) hideT = setTimeout(hide, ms);
  }
  function attach(root) {
    root.addEventListener('pointerover', e => {
      if (e.pointerType !== 'mouse') return;
      const el = e.target.closest('[data-tip]');
      if (el && root.contains(el) && el !== at) show(el);
    });
    root.addEventListener('pointerout', e => {
      if (e.pointerType !== 'mouse') return;
      const el = e.target.closest('[data-tip]');
      if (el && el === at && !(e.relatedTarget && el.contains(e.relatedTarget))) hide();
    });
    root.addEventListener('pointerdown', e => {
      kind = e.pointerType || 'mouse';
      clearTimeout(t); t = 0;
      if (kind === 'mouse') return;
      const el = e.target.closest('[data-tip]');
      if (!el) return;
      const p = Frame.point(e); x0 = p.x; y0 = p.y;
      t = setTimeout(() => { t = 0; show(el); el.dataset.tipped = '1'; }, PRESS);
    });
    root.addEventListener('pointermove', e => { if (!t) return; const p = Frame.point(e); if (Math.abs(p.x - x0) > 8 || Math.abs(p.y - y0) > 8) { clearTimeout(t); t = 0; } });
    const up = () => { clearTimeout(t); t = 0; if (box && kind !== 'mouse') { clearTimeout(hideT); hideT = setTimeout(hide, 1600); } };
    root.addEventListener('pointerup', up);
    root.addEventListener('pointercancel', up);
    // the tap that ends a long press does nothing else; a tap on a stat or a resistance shows its tooltip
    root.addEventListener('click', e => {
      const held = e.target.closest('[data-tipped]');
      if (held) { delete held.dataset.tipped; e.stopImmediatePropagation(); e.preventDefault(); return; }
      const el = e.target.closest('[data-tip]');
      if (!el || el.closest('button, a, input, [role=button]') || kind === 'mouse') return;
      if (at === el) hide(); else show(el, 2400);
    }, true);
  }
  return { attach, show, hide };
})();

const HeroSheet = (() => {
  const ui = {
    id: null, mode: 'card', pending: {}, dress: null, pick: null, sk: null, renaming: false, glint: null,
    over: null, node: null, cls: null, thr: null, choice: null, back: null, view: null, archEl: null, archKey: null, archTop: null, stage: null, fresh: false,
  };
  const click = () => sfx('click');
  const char = () => Save.char(ui.id);
  const S = () => Save.state;
  // the stats, with what each does (their tooltips; the first session's lines, docs/first-session-spec.md)
  const STATS = [
    ['hp', 'Health', 'heart', 'How much harm they take before they fall.'], ['mp', 'Mana', 'mana', 'Pays for skills. Basic attacks fill it back up.'],
    ['pow', 'Power', 'sword', 'How hard they hit, and how much they heal.'], ['def', 'Defence', 'shield', 'Takes a bite out of every hit.'],
    ['spd', 'Speed', 'boot', 'How often they act. Fast ones tire sooner.'], ['crit', 'Crit', 'star', 'The chance a hit lands extra hard.'],
    ['dodge', 'Dodge', 'feather', 'The chance a hit misses them.'],
  ];
  const RES_ICON = { stun: 'stun', move: 'anchor', bleed: 'bleed', blight: 'poison', curse: 'curse', debuff: 'weak' };
  const SHAPES = { foe: 'one foe', front: 'the front row', back: 'the back row', random3: '3 random foes', foes: 'every foe', ally: 'one ally', allies: 'every ally', self: 'themself', fallen: 'a fallen ally' };
  const SLOT_WORDS = ['Skill I', 'Skill II', 'Skill III', 'Skill IV', 'Skill V'];
  const SLOT_PLURAL = { weapon: 'Weapons', armor: 'Armour', accessory: 'Accessories' };
  const roman = n => ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'][n] || String(n);
  const fmtStat = (k, v) => GearUI.fmtStat(k, v);
  const delta = (k, d) => GearUI.fmtDelta(k, d);
  const pxImg = (src, w, hh, cls = '') => h('img', { class: 'px ' + cls, src, alt: '', width: w, height: hh, draggable: 'false' });
  const icon = (name, size, cls) => pxImg(iconURL(UI_ICONS[name] ? name : 'star'), size, size, cls);
  const tip = (title, body) => (body ? title + '|' + body : title);
  const fatigueWord = c => { const st = Fatigue.state(c); return st === 'fresh' ? 'Rested' : FATIGUE_NAMES[st]; };
  // small parts: a round icon button, a gold button (sec: the outlined one), a section under its header plate
  const ib = (ic, label, fn, o = {}) => h('button', { class: 'hc-ib' + (o.on ? ' on' : '') + (o.cls ? ' ' + o.cls : ''), type: 'button', 'data-tip': label, 'aria-label': label.split('|')[0], 'data-tut': o.tut || null, disabled: o.off, onclick: e => { e.stopPropagation(); click(); fn(); } },
    typeof ic === 'string' ? icon(ic, 16) : ic, o.badge ? h('em', { class: 'hc-badge', text: String(o.badge) }) : null);
  const btn = (label, fn, o = {}) => h('button', { class: 'hc-btn' + (o.sec ? ' sec' : '') + (o.cls ? ' ' + o.cls : ''), type: 'button', 'data-tut': o.tut || null, 'data-tip': o.tip || null, disabled: o.off, onclick: e => { e.stopPropagation(); if (!o.quiet) click(); fn(); } },
    label, o.badge ? h('em', { class: 'hc-badge', text: String(o.badge) }) : null);
  const glyph = g => h('span', { class: 'gl', text: g });
  const plate = (title, o = {}) => h('div', { class: 'hc-plate', 'data-tut': o.tut || null }, o.left ? h('div', { class: 'l' }, o.left) : null, h('h4', { text: title }), o.right ? h('div', { class: 'r' }, o.right) : null);
  const sect = (cls, plateEl, body) => h('section', { class: 'hr-sect ' + cls }, plateEl, body);

  // ── the arched window: docs/mockups/hero-card.js's, drawn with the few parts of the pixel kit it needs (whole art
  // pixels, warm light low down, an ink outline). W: its width in art pixels; Hh0: its height (the sill is 14 above the
  // foot). Drawn at 2×.
  const INK = '#0d0911';
  const hs = (a, b, c = 0) => { let n = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + Math.imul(c | 0, 1442695041)) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
  const archCache = {};
  function archArt(W, Hh0) {
    const key = W + 'x' + Hh0;
    if (archCache[key]) return archCache[key];
    const Hh = Hh0, SILL = Hh0 - 14, sy = SILL / 152, cv = document.createElement('canvas'); cv.width = W; cv.height = Hh;
    const g = cv.getContext('2d');
    const rect = (x, y, w, hh, col) => { g.fillStyle = col; g.fillRect(x, y, w, hh); };
    const px = (x, y, col) => rect(x, y, 1, 1, col);
    const cx = W / 2, cy = W / 2, R = W / 2, r = R - 10, sx = W / 140;
    const inOuter = (x, y) => (y >= cy ? x >= 0 && x < W : Math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= R);
    const inInner = (x, y) => y < SILL && (y >= cy ? x >= cx - r && x < cx + r : Math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= r);
    // the night inside: sky with a few stars, graves, a far lantern on its post, the warm ground
    for (let y = 0; y < SILL; y++) for (let x = 0; x < W; x++) if (inInner(x, y)) {
      const k = y / SILL;
      px(x, y, k < 0.62 ? (hs(x, y, 3) > 0.995 ? '#d8ccb4' : `rgb(${Math.round(18 + k * 14)},${Math.round(12 + k * 8)},${Math.round(30 + k * 6)})`) : `rgb(${Math.round(30 + (k - 0.62) * 60)},${Math.round(20 + (k - 0.62) * 30)},${Math.round(30 - (k - 0.62) * 10)})`);
    }
    for (const [gx, gy0] of [[22, 96], [104, 92], [36, 100], [92, 99]]) { const gy = Math.round(gy0 * sy), x = Math.round(gx * sx); rect(x, gy, 5, 8, '#1a1424'); rect(x + 1, gy - 1, 3, 1, '#1a1424'); }
    const lx = Math.round(114 * sx), ly = Math.round(70 * sy);
    rect(lx, ly, 1, SILL - 16 - ly, '#140f1c'); rect(lx - 2, ly - 2, 5, 1, '#140f1c'); rect(lx - 1, ly - 1, 3, 3, '#f4a646'); px(lx, ly, '#ffe2a0');
    for (let x = cx - r; x < cx + r; x++) { const y = SILL - 16 + Math.round(Math.sin(x / 7) * 1.5); for (let yy = y; yy < SILL; yy++) px(x, yy, (Math.floor(x / 9) + Math.floor(yy / 5)) % 2 ? '#3a2c26' : '#33262a'); }
    // the stone: voussoirs radiating round the arch, coursed blocks down the sides, the keystone, the sill
    for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
      if (!inOuter(x, y) || inInner(x, y)) continue;
      let col;
      if (y >= SILL) col = y === SILL ? '#7d8088' : (Math.floor(x / 10) + y) % 7 === 0 ? '#34353c' : y < SILL + 4 ? '#5a5d64' : '#45474e';
      else if (y < cy) {
        const a = Math.atan2(y + 0.5 - cy, x + 0.5 - cx), u = (a + Math.PI) / (Math.PI / 11), seg = Math.floor(u);
        col = Math.abs(u - Math.round(u)) < 0.06 ? '#24242a' : seg % 2 ? '#5a5d64' : '#4e5158';
        if (Math.abs(x - cx) < 6 && y < cy - r + 2) col = '#74777f';
      } else { const course = Math.floor((y - cy) / 8), off = course % 2 ? 0 : 4; col = (y - cy) % 8 === 7 || (x + off) % 9 === 0 ? '#24242a' : hs(x >> 2, course, 9) > 0.6 ? '#5a5d64' : '#4e5158'; }
      px(x, y, col);
    }
    for (let x = 0; x < cx; x++) for (let y = 0; y < cy; y++) if (inOuter(x, y) && !inOuter(x, y - 1)) px(x, y, '#7e70a0'); // moonlight on the left of the curve
    rect(cx - 5, 0, 10, 12, '#74777f'); rect(cx - 5, 0, 10, 1, '#93959c'); rect(cx - 6, 1, 1, 11, '#24242a'); rect(cx + 5, 1, 1, 11, '#24242a');
    // the finish: firelight low on the stone, then the ink outline
    g.save(); g.globalCompositeOperation = 'source-atop';
    const gr = g.createLinearGradient(0, Hh, 0, Hh * 0.4); gr.addColorStop(0, 'rgba(244,140,60,0.05)'); gr.addColorStop(1, 'rgba(244,140,60,0)');
    g.fillStyle = gr; g.fillRect(0, 0, W, Hh); g.restore();
    const d = g.getImageData(0, 0, W, Hh).data, A = (x, y) => x >= 0 && y >= 0 && x < W && y < Hh && d[(y * W + x) * 4 + 3] > 40;
    g.fillStyle = INK;
    for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) if (!A(x, y) && (A(x - 1, y) || A(x + 1, y) || A(x, y - 1) || A(x, y + 1))) g.fillRect(x, y, 1, 1);
    const big = document.createElement('canvas'); big.width = W * 2; big.height = Hh * 2;
    const bg = big.getContext('2d'); bg.imageSmoothingEnabled = false; bg.drawImage(cv, 0, 0, big.width, big.height);
    return (archCache[key] = { lx: lx * 2, ly: ly * 2, url: big.toDataURL(), w: W * 2, h: Hh * 2, x: (cx - r) * 2, iw: r * 4, top: (cy - r) * 2, bottom: SILL * 2 });
  }
  const PENCIL = () => sprite(['......kk', '.....krk', '....kyk.', '...kyk..', '..kyk...', '.kwk....', '.kk.....', 'k.......'], { k: '#1a1008', y: '#f1d36a', r: '#d4484a', w: '#e8d8b8' }, 'mk:pencil');
  const bigURL = (c, k) => { const o = document.createElement('canvas'); o.width = c.width * k; o.height = c.height * k; const g = o.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(c, 0, 0, o.width, o.height); return o.toDataURL(); };

  // ── points placed but not yet kept (Spend)
  function preview(c) {
    const p = JSON.parse(JSON.stringify(c));
    for (const k in ui.pending) Hero.allocate(p, k, ui.pending[k]);
    return p;
  }
  const pendingTotal = () => Object.values(ui.pending).reduce((a, b) => a + b, 0);
  const roomIn = (p, k) => Hero.points(p).stat > 0 && Hero.placed(p, k) < Hero.capOf(k);
  function addPending(k) {
    const p = preview(char());
    if (!roomIn(p, k)) { sfx('miss'); return; }
    ui.pending[k] = (ui.pending[k] || 0) + 1;
    click(); draw();
  }
  function autoPlace() {
    const plan = Hero.autoPoints(preview(char()));
    for (const k in plan) if (plan[k]) ui.pending[k] = (ui.pending[k] || 0) + plan[k];
    draw();
  }
  function keep() {
    const c = char(), n = pendingTotal();
    for (const k in ui.pending) Hero.allocate(c, k, ui.pending[k]);
    ui.pending = {}; ui.mode = 'card';
    if (n) { Save.commit(); sfx('kindle'); toast(n === 1 ? 'A point placed' : `${n} points placed`); }
    draw();
  }

  // ── gear: what's tried on, and Best
  // Best's choice: for each slot, the Bag's piece with the best Items.score that this hero can use, when the slot is
  // empty or it beats what's worn by more than the ▲ mark's margin (0.5).
  function autoEquipPlan(c) {
    const out = [];
    for (const k of SLOTS) {
      let best = null;
      for (const x of S().inventory.items) { const D = Items.def(x); if (D && D.slot === k && Items.canUse(c, x) && (!best || Items.score(x) > Items.score(best))) best = x; }
      const now = c.gear[k];
      if (best && (!now || Items.score(best) > Items.score(now) + 0.5)) out.push(best);
    }
    return out;
  }
  // the piece picked in the dressing, while it's in the Bag and fits
  function trial(c) {
    if (!ui.dress || !ui.dress.sel) return null;
    const f = Items.find(S(), ui.dress.sel);
    if (!f || f.where !== 'bag' || !Items.canUse(c, f.item)) return null;
    return f.item;
  }
  // the hero as they'd be with it on
  function tried(c) { const x = trial(c); if (!x) return null; const p = JSON.parse(JSON.stringify(c)); p.gear[Items.def(x).slot] = x; return p; }
  function lookOf(c) { const x = trial(c), look = Items.look(c); if (x) look[SLOTS.indexOf(Items.def(x).slot)] = x.id; return look; }
  const rowOf = c => { const i = S().party.indexOf(c.id); return i < 0 ? CLASSES[c.cls].row : i < 2 ? 'front' : 'back'; };
  const rowWord = c => { const i = S().party.indexOf(c.id); return i < 0 ? 'Resting' : i < 2 ? 'Front row' : 'Back row'; };
  function glint(k) { ui.glint = k; setTimeout(() => { if (ui.glint === k) ui.glint = null; }, 900); }
  function wear() {
    const c = char(), x = trial(c);
    if (!x) return;
    const D = Items.def(x);
    if (!Items.equip(S(), c, x.uid)) return;
    Save.commit(); sfx('equip'); toast(`${D.name} worn`);
    ui.dress.sel = null; glint(D.slot); draw();
  }
  function takeOff(k) {
    const c = char(), x = c.gear[k];
    if (!x || !Items.unequip(S(), c, k)) return;
    Save.commit(); sfx('guard'); toast(`${Items.def(x).name} in the Bag`); draw();
  }
  function bestGear() {
    const c = char();
    let n = 0, last = null;
    for (const x of autoEquipPlan(c)) if (Items.equip(S(), c, x.uid)) { n++; last = Items.def(x).slot; }
    if (n) { Save.commit(); sfx('equip'); toast('Best gear worn'); if (last) glint(last); }
    draw();
  }

  // ── opening, stepping, going back
  function reset(id) {
    ui.id = id; ui.mode = 'card'; ui.pending = {}; ui.dress = null; ui.pick = null; ui.sk = null; ui.renaming = false; ui.over = null; ui.node = null; ui.cls = null; ui.choice = null;
  }
  // tab, from the ways in: 'stats' opens Spend when there are points; 'skills' the tree (or a threshold waiting)
  function want(tab) {
    const c = char();
    if (!c) return;
    if (tab === 'stats' && Hero.points(c).stat > 0) { ui.mode = 'spend'; ui.dress = null; ui.pick = null; ui.over = null; }
    else if (tab === 'skills') openTree(c);
  }
  function open(id, tab) {
    if (!Save.char(id)) return;
    const from = App.current;
    // Back returns where the hero was opened from: the Tactics screen and the hero card itself don't count.
    if (from !== 'hero' && from !== 'tactics') ui.back = { screen: from && from !== 'battle' ? from : 'home', formation: typeof Formation !== 'undefined' && Formation.shown };
    if (ui.id !== id) reset(id);
    want(tab);
    if (from === 'hero') { draw(); return; }
    App.go('hero', { id });
  }
  function back() {
    click();
    const b = ui.back || { screen: 'home' };
    ui.back = null;
    App.go(b.screen || 'home');
    if (b.formation && App.current === 'home' && typeof Formation !== 'undefined') Formation.open();
  }
  const order = () => { const p = S().party.filter(Boolean); return p.concat(S().roster.map(c => c.id).filter(x => !p.includes(x))); };
  function step(d) {
    const ids = order(), i = ids.indexOf(ui.id);
    if (ids.length < 2) return;
    click();
    reset(ids[(i + d + ids.length) % ids.length]);
    ui.fresh = true;
    draw();
  }
  // A dressing opened from the Bag's Give to: the slot open, and the piece tried on.
  function dress(id, uid) {
    const f = Items.find(S(), uid);
    open(id);
    if (f && f.where === 'bag') { ui.mode = 'card'; ui.over = null; ui.pick = null; ui.dress = { slot: Items.def(f.item).slot, sel: uid }; draw(); }
  }

  // ── drawing. The arch is kept from one draw to the next (its stage keeps playing); the rest is built again.
  function draw() {
    const v = ui.view;
    if (!v || !v.isConnected) return;
    build(v);
  }
  function build(v) {
    const c = char();
    if (!c) { v.replaceChildren(); if (App.current === 'hero') setTimeout(() => { if (App.current === 'hero' && !char()) App.go('home'); }); return; } // dismissed, or a cloud save without them
    Tip.hide();
    const keepScroll = [...v.querySelectorAll('[data-scroll]')].map(el => [el.dataset.scroll, el.scrollTop]);
    v.classList.toggle('narrow', narrow());
    v.classList.toggle('hc-enter', !!ui.fresh);
    const cover = ui.over ? overPanel(c) : ui.dress ? dressPanel(c) : null;
    v.replaceChildren(h('div', { class: 'hc-edge' }, ['tl', 'tr', 'bl', 'br'].map(k => h('i', { class: 'cn ' + k }))),
      ...left(c), ...(cover ? [cover] : [gearS(c), resS(c), skillsS(c), ui.pick ? pickS(c) : tacticsS(c)]));
    for (const [k, y] of keepScroll) { const el = v.querySelector(`[data-scroll="${k}"]`); if (el) el.scrollTop = y; }
    ui.fresh = false;
  }

  // ── the left: the hero
  const narrow = () => Frame.W < 780;
  function left(c) {
    const C = CLASSES[c.cls], many = order().length > 1, out = [];
    out.push(h('button', { class: 'hc-ib hr-back', type: 'button', 'aria-label': 'Back', 'data-tip': 'Back', 'data-tut': 'hero-back', onclick: back }, glyph('‹')));
    if (ui.renaming) {
      const inp = h('input', { class: 'hr-ren', type: 'text', value: c.name, maxlength: '12', autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Name', 'data-tut': 'hero-name' });
      const ok = () => { const val = inp.value.replace(/\s+/g, ' ').trim().slice(0, 12); if (val && val !== c.name) { c.name = val; Save.commit(); } ui.renaming = false; draw(); };
      const no = () => { ui.renaming = false; draw(); };
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); click(); ok(); } else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); no(); } });
      out.push(h('div', { class: 'hr-name ren' }, inp, ib(glyph('✓'), 'Keep', ok, { cls: 'ok', tut: 'hero-name-ok' }), ib(glyph('✕'), 'Cancel', no)));
      setTimeout(() => { try { inp.focus({ preventScroll: true }); inp.select(); } catch (e) { } }, 0);
    } else {
      out.push(h('div', { class: 'hr-name hc-in' }, h('b', { text: c.name }),
        h('button', { class: 'hr-pen', type: 'button', 'aria-label': 'Rename', 'data-tip': 'Rename', 'data-tut': 'hero-rename', onclick: () => { click(); ui.renaming = true; ui.mode = ui.mode === 'spend' ? 'card' : ui.mode; ui.pending = {}; draw(); } }, pxImg(bigURL(PENCIL(), 2), 16, 16))),
        h('span', { class: 'hr-class hc-in', 'data-tip': tip(c.classes.map(k => CLASSES[k].name).join(' + '), `${C.role}. ${rowWord(c)}.`) }, c.classes.map(k => CLASSES[k].name).join(' + ')));
      // ◂ ▸ through the heroes, or Done while spending
      out.push(ui.mode === 'spend' ? h('div', { class: 'hr-nav' }, btn('Done', keep, { tut: 'hero-keep', quiet: true }))
        : h('div', { class: 'hr-nav hc-in' }, ib(glyph('◂'), 'Previous hero', () => step(-1), { off: !many }), ib(glyph('▸'), 'Next hero', () => step(1), { off: !many, tut: 'hero-next' })));
    }
    out.push(arch(c), statsEl(c));
    return out;
  }
  function arch(c) {
    const nar = narrow(), A = nar ? archArt(100, 96) : archArt(110, 105), k = nar ? 7 : 8, key = c.id + '|' + nar;
    if (ui.archKey !== key || !ui.archEl) {
      if (ui.stage) ui.stage.stop();
      const sh = Math.floor((A.bottom - A.top) / k) * k, y0 = A.bottom - sh, rad = A.iw / 2, feet = A.h - (nar ? 40 : 44);
      const stageEl = h('div', { class: 'hr-stage', style: `left:${A.x}px;top:${y0}px;width:${A.iw}px;height:${sh}px;clip-path:inset(0 round ${rad}px ${rad}px 0 0)` });
      ui.stage = new SpriteStage(stageEl, { cls: c.cls, look: lookOf(c), scale: k, hx: 0.55, dummy: false, ground: sh / k - Math.round((feet - y0) / k), backdrop: false, ambient: [] });
      ui.archTop = h('div', { class: 'hr-arch-top' });
      ui.archEl = h('div', { class: 'hr-arch hc-in', style: `width:${A.w}px;height:${A.h}px;--d:40ms` }, pxImg(A.url, A.w, A.h, 'hr-win'), h('i', { class: 'hr-glow', style: `left:${A.lx - 10}px;top:${A.ly - 10}px` }), stageEl, ui.archTop);
      ui.archKey = key;
    }
    ui.stage.setLook(lookOf(c));
    ui.archEl.classList.toggle('trying', !!trial(c));
    const need = Hero.xpToNext(c.level), cap = c.level >= HERO.CAP, f = Math.floor(c.fatigue || 0);
    ui.archTop.replaceChildren(
      h('div', { class: 'hc-lvb', 'data-tip': tip(`Level ${c.level}`, cap ? 'The highest level' : `${fmt(c.xp)} / ${fmt(need)} XP`) }, h('b', { text: String(c.level) }), h('i', {}, h('u', { style: `width:${cap ? 100 : Math.min(100, Math.round(100 * c.xp / need))}%` }))),
      h('div', { class: 'hc-fat ' + Fatigue.state(c), 'data-tip': tip(fatigueWord(c), `Fatigue ${f}%`) }, icon('fatigue', 12), h('i', {}, h('u', { style: `width:${Math.min(100, f)}%` }))),
      proto(c));
    return ui.archEl;
  }
  // Prototype tools: XP to try the later thresholds without the grind (hidden with Settings → Prototype tools).
  function proto(c) {
    const give = n => { click(); const g = Hero.gainXp(c, Hero.xpBetween(c.level, Math.min(HERO.CAP, c.level + n))); Save.commit(); if (g.to > g.from) LevelUp.toast(c, g); draw(); };
    return h('div', { class: 'hr-proto proto-only' }, [1, 5, 25].map(n => h('button', { type: 'button', disabled: c.level >= HERO.CAP, onclick: () => give(n) }, `+${n}`)));
  }
  // the stats: icon and number, two rows; the eighth place is Spend, Auto while spending, or what a piece tried on adds
  function statsEl(c) {
    const spend = ui.mode === 'spend', t = tried(c), p = preview(t || c), base = Hero.sheet(c, rowOf(c)), now = Hero.sheet(p, rowOf(c));
    const pts = Hero.points(c).stat, left = Hero.points(p).stat;
    const cell = ([k, label, ic, what]) => {
      const d = now[k] - base[k], dt = delta(k, d), room = spend && roomIn(p, k);
      return h(spend ? 'button' : 'div', { class: 'hr-st' + (spend ? ' pick' : '') + (dt ? (d > 0 ? ' up' : ' dn') : ''), type: spend ? 'button' : null, 'data-tut': 'hero-stat-' + k, 'data-tip': tip(label, what), 'aria-label': label, onclick: spend ? () => addPending(k) : null },
        icon(ic, 16), h('b', { text: fmtStat(k, now[k]) }), dt && !spend ? h('em', { text: dt }) : null, room ? h('i', { class: 'plus', 'data-tut': 'hero-plus-' + k, text: '+' }) : null);
    };
    let eighth = h('span', { class: 'hr-st none' });
    if (spend) eighth = btn('Auto', autoPlace, { sec: true, tut: 'hero-auto', off: left <= 0, badge: left > 0 ? left : null, tip: tip('Auto', 'Places the rest as the class likes') });
    else if (t) {
      const k = Items.def(trial(c)).slot, was = c.gear[k], gain = GearUI.effectWords(trial(c)), lose = was ? GearUI.effectWords(was) : [];
      const words = [gain.length ? `Gains: ${gain.join(' · ')}` : '', lose.length ? `Loses: ${lose.join(' · ')}` : ''].filter(Boolean).join('. ');
      if (gain.length || lose.length) eighth = h('span', { class: 'hr-chip', 'data-tut': 'hero-effects', 'data-tip': tip('Effects', words) }, icon('star', 12), gain.length ? h('b', { class: 'g', text: '+' + gain.length }) : null, lose.length ? h('b', { class: 'b', text: '−' + lose.length }) : null);
    } else if (pts > 0 && !ui.renaming) eighth = btn('Spend', () => { ui.mode = 'spend'; ui.dress = null; ui.pick = null; ui.over = null; ui.pending = {}; draw(); }, { tut: 'hero-points', badge: pts, tip: tip(pts === 1 ? 'A point to spend' : `${pts} points to spend`, 'Each level brings one') });
    return h('div', { class: 'hr-stats hc-in', style: '--d:80ms', 'data-tut': 'hero-stats' }, STATS.map(cell), eighth);
  }

  // ── the middle: gear and resistances
  function gearS(c) {
    const slot = k => GearUI.tall(c.gear[k], { size: 'lg', slot: k, tut: 'hero-slot-' + k, glint: ui.glint === k, tip: tip(SLOT_NAMES[k], 'Empty'),
      onclick: () => { click(); ui.dress = { slot: k, sel: null }; ui.pick = null; ui.over = null; ui.mode = 'card'; ui.pending = {}; draw(); } });
    const best = autoEquipPlan(c).length > 0;
    return sect('mid g1 hc-in', plate('Gear', { tut: 'hero-tab-gear', right: best ? ib('gear', tip('Best gear', 'Wears the best that fits'), bestGear, { tut: 'hero-autoequip' }) : null }),
      h('div', { class: 'hr-gear' }, SLOTS.map(slot)));
  }
  function resS(c) {
    const t = tried(c), now = Hero.sheet(t || c, rowOf(c)).res, base = Hero.sheet(c, rowOf(c)).res;
    const G = typeof GLOSSARY !== 'undefined' ? GLOSSARY : {};
    return sect('mid g2 hc-in', plate('Resistances', { tut: 'hero-stat-res' }), h('div', { class: 'hr-res' }, RES_KEYS.map(k => {
      const g = G['res_' + k], d = Math.round(now[k]) - Math.round(base[k]);
      return h('div', { class: 'hr-rs' + (d > 0 ? ' up' : d < 0 ? ' dn' : ''), 'data-tut': 'hero-stat-res-' + k, 'data-tip': tip(g ? g.name : RESISTS[k].name, g ? g.line : RESISTS[k].tip), 'aria-label': `${RESISTS[k].name} resistance` },
        icon(RES_ICON[k], 16), h('b', { text: Math.round(now[k]) + '%' }));
    })));
  }

  // ── the right: skills, and tactics (or the skills for a slot)
  const isBasic = (c, id) => c.classes.some(k => CLASSES[k].basic === id);
  const treeIds = c => c.classes.flatMap(k => [CLASSES[k].starter, ...CLASSES[k].tree.flat()]);
  // Where a skill is used from and what it hits, as Darkest Dungeon's dots: the party's rows (back 4, front 2, facing
  // right) and the foes' (front 2, back 4). A bar joins places it hits at once.
  function reachOf(sk) {
    const melee = sk.range === 'melee' && !sk.reach;
    const r = { stand: melee ? 'front' : 'all', side: 'foe', hit: 'all', many: ['front', 'back', 'foes', 'allies'].includes(sk.shape) };
    if (sk.shape === 'foe') r.hit = melee ? 'front' : 'all';
    else if (sk.shape === 'front' || sk.shape === 'back') r.hit = sk.shape;
    else if (['ally', 'allies', 'fallen'].includes(sk.shape)) r.side = 'ally';
    else if (sk.shape === 'self') { r.side = 'self'; r.stand = 'all'; }
    return r;
  }
  const POS = { hero: { back: [[0, 0], [0, 10], [0, 20], [0, 30]], front: [[16, 10], [16, 20]] }, foe: { front: [[0, 10], [0, 20]], back: [[16, 0], [16, 10], [16, 20], [16, 30]] } };
  function form(kind, lit, cls, many, self) {
    const el = h('div', { class: 'hr-form' });
    for (const row of ['front', 'back']) {
      const on = lit === 'all' || lit === row, pts = POS[kind][row];
      if (on && many) el.append(h('b', { class: cls, style: `left:${pts[0][0] + 3}px;top:${pts[0][1] + 3}px;height:${pts[pts.length - 1][1] - pts[0][1]}px` }));
      pts.forEach(([x, y], i) => el.append(h('i', { class: (on || (self === row && i === 0) ? 'on ' + cls : ''), style: `left:${x}px;top:${y}px` })));
    }
    if (many && lit === 'all') el.append(h('b', { class: cls + ' across', style: 'left:3px;top:18px;width:16px' }));
    return el;
  }
  function dots(sk, row) {
    if (!sk.shape) return h('div', { class: 'hr-dots none' });
    const r = reachOf(sk), from = r.stand === 'front' ? 'the front row' : 'any row';
    const hits = sk.shape === 'foe' && r.hit === 'front' ? 'one foe in the front row' : SHAPES[sk.shape] || sk.shape;
    return h('div', { class: 'hr-dots', 'data-tip': tip('Where it’s used', `From ${from}. Hits ${hits}.`) },
      form('hero', r.stand, 'st'),
      r.side === 'foe' ? form('foe', r.hit, 'hit', r.many) : r.side === 'ally' ? form('hero', 'all', 'ally', r.many) : form('hero', null, 'ally', false, row));
  }
  const skillTip = (c, s) => { const L = c.skills[s.id] || 1, cost = s.cost ? `${s.cost} mana. ` : ''; return tip(s.name, (s.kind === 'active' || isBasic(c, s.id) ? cost : 'Passive. ') + skillText(s, L)); };
  function openTree(c) {
    const pend = Hero.pending(c);
    ui.over = pend.length ? 'thresh' : 'tree'; ui.thr = pend[0] || null; ui.choice = null; ui.node = null;
    ui.dress = null; ui.pick = null; ui.mode = 'card'; ui.pending = {}; ui.fresh = true;
  }
  function skillsS(c) {
    Hero.fixEquip(c);
    const C = CLASSES[c.cls], basic = C.basic, P = Hero.points(c), pend = Hero.pending(c);
    const picked = ui.pick ? ui.pick.sel || basic : ui.sk && SKILLS[ui.sk] ? ui.sk : c.equip.find(Boolean) || basic, sk = SKILLS[picked], lv = c.skills[sk.id] || 1;
    const tile = (id, o = {}) => {
      const s = id && SKILLS[id];
      return h('button', { class: 'hr-tile' + (o.on ? ' on' : '') + (o.lock ? ' lock' : '') + (o.dim ? ' dim' : '') + (o.first ? ' first' : '') + (s ? '' : o.lock ? '' : ' empty'), type: 'button', 'data-tut': o.tut || null, 'data-id': id || null, 'data-tip': o.tip || (s ? skillTip(c, s) : null), 'aria-label': s ? s.name : o.lock ? 'Locked' : 'Empty', 'aria-disabled': o.lock ? 'true' : null, onclick: o.onclick },
        o.lock ? icon('lock', 14) : s ? icon(s.icon || 'sword', 20) : h('span', { class: 'gl', text: '+' }));
    };
    const n = Hero.activeSlots(c), next = c.level < 50 ? 50 : c.level < 200 ? 200 : null;
    const on = new Set([basic, ...c.equip.filter(Boolean)]);
    const learned = Object.keys(c.skills).filter(id => SKILLS[id] && !on.has(id) && !isBasic(c, id))
      .sort((a, b) => (SKILLS[a].kind === 'active' ? 0 : 1) - (SKILLS[b].kind === 'active' ? 0 : 1) || SKILLS[a].tier - SKILLS[b].tier);
    const unlearned = treeIds(c).filter(id => SKILLS[id] && !c.skills[id] && Hero.skill(c, id).open);
    const nextPt = (Math.floor(c.level / 5) + 1) * 5;
    const others = [...learned.map(id => [id, false]), ...unlearned.map(id => [id, true])];
    const tiles = [
      tile(basic, { on: picked === basic && !ui.pick, onclick: () => { click(); ui.sk = basic; ui.pick = null; draw(); } }),
      ...c.equip.map((id, i) => tile(id, { on: ui.pick ? ui.pick.slot === i : picked === id, tut: 'hero-skill-slot', tip: id ? null : tip(SLOT_WORDS[i], 'Empty'),
        onclick: () => { click(); if (ui.pick && ui.pick.slot === i) ui.pick = null; else { ui.pick = { slot: i, sel: id || Hero.actives(c).find(a => !c.equip.includes(a)) || null }; } if (id) ui.sk = id; ui.dress = null; draw(); } })),
      next && n === 1 + (c.level >= 50 ? 1 : 0) ? tile(null, { lock: true, tip: tip(SLOT_WORDS[n], `Opens at level ${next}`) }) : null,
      ...others.map(([id, dim], i) => tile(id, { dim, first: i === 0, tip: dim ? tip(SKILLS[id].name, `${P.skill > 0 ? 'Learn it in the tree.' : `A skill point at level ${nextPt}.`} ${skillText(SKILLS[id], 1)}`) : null,
        onclick: () => { click(); ui.sk = id; ui.pick = null; draw(); } })),
    ];
    const treeTip = pend.length ? tip(`Level ${pend[0]}`, 'Choose a path') : tip('Skill tree', P.skill > 0 ? (P.skill === 1 ? 'A skill point to spend' : `${P.skill} skill points to spend`) : 'Learn and raise skills');
    return sect('right r1 hc-in', plate('Skills', { tut: 'hero-tab-skills', right: ib('book', treeTip, () => { openTree(char()); draw(); }, { tut: 'hero-tree', on: pend.length > 0, badge: P.skill > 0 ? P.skill : pend.length ? '!' : null }) }),
      h('div', { class: 'hr-skills', 'data-tut': 'hero-skills' },
        h('div', { class: 'hr-skrow' }, dots(sk, rowOf(c)), h('div', { class: 'hr-skname', 'data-tip': skillTip(c, sk) }, h('b', { text: sk.name }),
          sk.cost ? h('span', {}, icon('mana', 12), String(sk.cost)) : sk.kind !== 'active' && !isBasic(c, sk.id) ? h('span', { text: 'Passive' }) : null)),
        h('div', { class: 'hr-tiles' }, tiles.filter(Boolean))));
  }
  function tacticsS(c) {
    const o = Tactics.owner(c.id), basic = SKILLS[CLASSES[c.cls].basic];
    const line = (cond, id, cls) => { const s = SKILLS[id] || (typeof ITEMS !== 'undefined' && ITEMS[id]) || {}; return h('div', { class: 'hr-rule ' + (cls || '') }, h('span', { class: 'if', text: cond }), h('span', { class: 'do' }, icon(s.icon || 'sword', 16), h('b', { text: s.name || id }))); };
    return sect('right r2 hc-in', plate('Tactics', { tut: 'hero-tab-rules', right: ib('scroll', 'Edit tactics', () => App.actions.tactics(c.id, () => open(c.id)), { tut: 'hero-edit', cls: 'hr-edit' }) }),
      h('div', { class: 'hr-rules', 'data-tut': 'hero-rules', 'data-scroll': 'rules', 'data-tip': tip(`${o.rules.length} of ${o.slots} tactics`, 'Checked from the top each turn') },
        o.rules.map(r => line(ruleCond(r), r.do, r.on === false ? 'off' : Tactics.explain(c.id, r).warn ? 'warn' : '')), line('Otherwise', basic.id, 'oth')));
  }
  // Choosing what goes in a skill slot: every learned active; the one in the slot marked; Use puts the one picked there.
  function pickS(c) {
    const cur = c.equip[ui.pick.slot], list = Hero.actives(c).sort((a, b) => (b === cur) - (a === cur) || SKILLS[a].tier - SKILLS[b].tier), s = ui.pick.sel && SKILLS[ui.pick.sel];
    const row = id => { const k = SKILLS[id]; return h('button', { class: 'hr-known' + (id === ui.pick.sel ? ' sel' : ''), type: 'button', 'data-id': id, 'data-tip': skillTip(c, k), onclick: () => { click(); ui.pick.sel = id; ui.sk = id; draw(); } },
      icon(k.icon || 'sword', 16), h('b', { text: k.name }), id === cur ? h('span', { class: 'in', text: '✓' }) : h('span'), h('span', { class: 'mp' }, icon('mana', 12), String(k.cost || 0))); };
    const use = () => { if (s && Hero.equip(c, ui.pick.slot, s.id)) { Save.commit(); sfx('guard'); toast(`${s.name} in ${SLOT_WORDS[ui.pick.slot]}`); ui.sk = s.id; ui.pick = null; draw(); } };
    return sect('right r2', plate(SLOT_WORDS[ui.pick.slot], { tut: 'hero-tab-pick', right: ib(glyph('✕'), 'Close', () => { ui.pick = null; draw(); }) }),
      h('div', { class: 'hr-pick' }, h('div', { class: 'hr-pick-list', 'data-scroll': 'pick' }, list.map(row)), h('div', { class: 'hr-row' }, btn('Use', use, { off: !s || s.id === cur, tut: 'hero-use' }))));
  }

  // ── dressing: the Bag beside the hero, showing one slot
  function dressPanel(c) {
    const k = ui.dress.slot, st = S(), worn = c.gear[k], sel = trial(c);
    const list = st.inventory.items.filter(x => Items.def(x) && Items.def(x).slot === k).sort((a, b) => (Items.canUse(c, b) - Items.canUse(c, a)) || Items.score(b) - Items.score(a));
    const tabs = SLOTS.map(s => ib(GearUI.SLOT_ICON[s], SLOT_PLURAL[s], () => { ui.dress = { slot: s, sel: null }; draw(); }, { on: s === k, tut: 'gear-tab-' + s }));
    const grid = list.length ? h('div', { class: 'hr-grid', 'data-scroll': 'bag' }, list.map(x => GearUI.tall(x, { c, sel: ui.dress.sel === x.uid, tut: 'gear-pick', onclick: () => { click(); ui.dress.sel = ui.dress.sel === x.uid ? null : x.uid; draw(); } })))
      : h('div', { class: 'hr-grid none' }, h('span', { class: 'hr-none', text: 'Empty' }));
    let side = h('div', { class: 'pc' });
    const x = sel || (ui.dress.sel && Items.find(st, ui.dress.sel) && Items.find(st, ui.dress.sel).item) || worn;
    if (x) {
      const can = Items.canUse(c, x), mine = !!worn && x.uid === worn.uid;
      side = h('div', { class: 'pc' }, ...GearUI.pieceHead(x), ...GearUI.pieceLines(x, mine ? null : worn),
        h('div', { class: 'hc-row end' }, mine ? btn('Take off', () => takeOff(k), { sec: true, tut: 'gear-off' })
          : can ? btn('Wear', wear, { tut: 'gear-wear', quiet: true }) : h('span', { class: 'hr-no', 'data-tip': tip('Can’t use', Items.whyNot(c, x)), text: 'Can’t use' })));
    }
    return h('div', { class: 'hr-cover hc-in' }, ['tl', 'tr', 'bl', 'br'].map(cn => h('i', { class: 'cn ' + cn })),
      plate(SLOT_PLURAL[k], { left: tabs, right: ib(glyph('✓'), 'Done', () => { ui.dress = null; draw(); }, { tut: 'gear-done' }) }),
      h('div', { class: 'hr-dbody' }, grid, side));
  }

  // ── the tree, a threshold and a respec, in the place of the middle and the right
  function overPanel(c) {
    const close = () => { ui.over = null; ui.node = null; draw(); };
    const P = Hero.points(c);
    const title = ui.over === 'tree' ? 'Skill tree' : ui.over === 'thresh' ? `Level ${ui.thr}` : 'Respec';
    const leftB = ui.over === 'tree' ? ib('holy', tip('Respec', 'Take back every point, and spend them again'), () => { ui.over = 'respec'; ui.fresh = true; draw(); }, { tut: 'hero-respec' }) : null;
    const count = ui.over === 'tree' && P.skill > 0 ? h('em', { class: 'hr-count', 'data-tip': P.skill === 1 ? 'A skill point to spend' : `${P.skill} skill points to spend`, text: String(P.skill) }) : null;
    const body = ui.over === 'tree' ? treeBody(c) : ui.over === 'thresh' ? threshBody(c, close) : respecBody(c, close);
    return h('div', { class: 'hr-cover hr-over hc-in over-' + ui.over }, ['tl', 'tr', 'bl', 'br'].map(cn => h('i', { class: 'cn ' + cn })),
      plate(title, { tut: 'hero-over', left: leftB, right: [count, ib(glyph('✕'), 'Close', close, { cls: 'hr-x' })] }),
      h('div', { class: 'hr-obody' }, [].concat(body).filter(Boolean)));
  }
  // A skill's card in the tree: its words, and learning, raising, awakening and equipping it.
  function skillCard(c, id) {
    const sk = SKILLS[id], basic = isBasic(c, id), st = Hero.skill(c, id), P = Hero.points(c), L = basic ? 1 : Math.max(1, st.L);
    const active = basic || sk.kind === 'active', ruled = (Tactics.owner(c.id).rules || []).some(r => r.do === id);
    const tag = (text, cls = '') => h('span', { class: 'hr-tag ' + cls, text });
    const cost = [sk.cost ? `${sk.cost} mana` : null, sk.hpCost ? `${Math.round(sk.hpCost * 100)}% health` : null, sk.hpCur ? `${Math.round(sk.hpCur * 100)}% of health` : null].filter(Boolean).join(' + ');
    const tags = [
      basic ? tag('Basic') : sk.kind === 'active' ? null : tag(sk.kind === 'key' ? 'Keystone' : 'Passive', 'g'),
      !basic ? tag(st.L ? `Level ${st.L} of ${SKILL_LV_MAX}` : st.open ? 'Not learned' : `Tier ${roman(sk.tier)}`, st.L ? 'e' : '') : null,
      active ? tag(cost || 'Free', 'w') : null, active && sk.shape ? tag(SHAPES[sk.shape] || sk.shape) : null,
      st.awakened ? tag('Awakened', 'e') : null,
      active && !basic && st.equipped && !ruled ? tag('No tactic uses it', 'b') : null,
    ];
    const desc = (which, withNext) => h('p', { class: 'hr-desc' + (which === 'aw' ? ' aw' : '') }, skillParts(sk, L, which).map(x => (x.text != null ? x.text : h('b', {}, x.num, withNext && x.next && x.next !== x.num ? h('span', { class: 'hr-next', text: ' → ' + x.next }) : null))));
    const done = msg => { Save.commit(); if (msg) toast(msg); draw(); };
    const btns = [];
    if (!basic && sk.kind === 'active' && st.L) {
      if (st.equipped) btns.push(btn('Unequip', () => { Hero.equip(c, c.equip.indexOf(id), null); sfx('guard'); done(); }, { sec: true }));
      else btns.push(btn('Equip', () => { const to = Math.max(0, c.equip.indexOf(null)); if (Hero.equip(c, to, id)) { sfx('guard'); done(`${sk.name} in ${SLOT_WORDS[to]}`); } }, { sec: true }));
    }
    if (!basic) {
      if (st.L < SKILL_LV_MAX) btns.push(btn(st.L ? 'Raise' : 'Learn', () => { if (Hero.learn(c, id)) { sfx('kindle'); done(st.L ? `${sk.name} · level ${st.L + 1}` : `Learned ${sk.name}`); } }, { off: !st.canLearn, cls: 'hr-learn', quiet: true }));
      else if (!st.awakened) btns.push(btn('Awaken', () => { if (Hero.awaken(c, id)) { sfx('region'); done(`${sk.name} awakens`); } }, { off: !st.canAwaken, cls: 'hr-learn', quiet: true, tip: tip('Awaken', `${HERO.AWAKEN_COST} skill points`) }));
    }
    const why = basic ? '' : !st.open ? `Opens at a threshold` : st.L >= SKILL_LV_MAX && !st.awakened ? (Hero.awakenOpen(c) ? (P.skill < HERO.AWAKEN_COST ? `Needs ${HERO.AWAKEN_COST} points` : '') : 'Awakening opens from level 100') : P.skill < 1 && st.L < SKILL_LV_MAX ? 'A point every 5 levels' : '';
    return h('div', { class: 'hr-card', role: 'group', 'aria-label': sk.name },
      h('button', { class: 'hr-cx', type: 'button', 'aria-label': 'Close', onclick: () => { click(); ui.node = null; draw(); } }, '✕'),
      h('div', { class: 'hr-ct' }, icon(sk.icon || 'sword', 22), h('b', { text: sk.name })),
      h('div', { class: 'hr-tags2' }, tags),
      h('div', { class: 'hr-cbody', 'data-scroll': 'card' }, desc('d', st.L > 0 && st.L < SKILL_LV_MAX),
        !basic && (st.L >= SKILL_LV_MAX || st.awakened) ? desc('aw', false) : null,
        sk.later ? h('p', { class: 'hr-why', text: 'Comes with a later update' }) : null,
        why ? h('p', { class: 'hr-why', text: why }) : null),
      h('div', { class: 'hr-cbtns' }, btns));
  }
  function treeBody(c) {
    const cls = c.classes.includes(ui.cls) ? ui.cls : c.cls, C = CLASSES[cls], open = c.tiers[cls] || 0, next = HERO.THRESHOLDS.find(t => t > c.level);
    const node = id => {
      const sk = SKILLS[id], st = Hero.skill(c, id), have = st.L > 0;
      return h('button', { class: `hr-node ${sk.kind === 'active' ? 'act' : sk.kind === 'key' ? 'key' : 'pas'}${have ? ' have' : st.canLearn ? ' can' : st.open ? '' : ' lock'}${st.awakened ? ' awk' : ''}${st.equipped ? ' eq' : ''}${ui.node === id ? ' on' : ''}`, type: 'button', 'data-id': id,
        'data-tip': tip(sk.name, have ? `Level ${st.L}` : st.open ? 'Not learned' : 'Locked'), 'aria-label': `${sk.name}, ${have ? 'level ' + st.L : st.open ? 'not learned' : 'locked'}`,
        onclick: () => { click(); ui.node = ui.node === id ? null : id; draw(); } },
        icon(sk.icon || 'star', 20), have ? h('span', { class: 'hr-npips' }, Array.from({ length: SKILL_LV_MAX }, (_, i) => h('i', { class: i < st.L ? 'f' : '' }))) : null);
    };
    const cells = [h('span'), ...C.paths.map(([n]) => h('span', { class: 'hr-colh', text: n }))];
    cells.push(h('span', { class: 'hr-tl', text: 'Root' }), h('span'), h('div', { class: 'hr-cell' }, node(C.starter)), h('span'));
    for (let t = 1; t <= HERO.TIERS; t++) {
      const locked = t > open;
      cells.push(h('span', { class: 'hr-tl' + (locked ? ' lock' : '') }, roman(t), locked && t === open + 1 && next ? h('small', { text: `Lv ${next}` }) : null));
      for (let pi = 0; pi < 3; pi++) cells.push(h('div', { class: 'hr-cell' + (locked ? ' locked' : '') }, node(C.tree[pi][t - 1])));
    }
    return [
      c.classes.length > 1 ? h('div', { class: 'hr-clsw' }, c.classes.map(k => h('button', { class: k === cls ? 'on' : '', type: 'button', onclick: () => { click(); ui.cls = k; ui.node = null; draw(); } }, CLASSES[k].name))) : null,
      h('div', { class: 'hr-split' + (ui.node ? ' hr-with' : '') }, h('div', { class: 'hr-tree', 'data-scroll': 'tree' }, cells), ui.node ? skillCard(c, ui.node) : null),
    ];
  }
  function threshBody(c, close) {
    const t = ui.thr, o = Hero.options(c, t), tierOf = k => (c.tiers[k] || 0) + 1, pick = ui.choice;
    const sel = ch => pick && pick.kind === ch.kind && pick.cls === ch.cls;
    const choose = ch => { click(); ui.choice = ch; draw(); };
    const opts = [];
    for (const k of o.tier) opts.push(h('button', { class: 'hr-opt' + (sel({ kind: 'tier', cls: k }) ? ' on' : ''), type: 'button', onclick: () => choose({ kind: 'tier', cls: k }) },
      h('b', { text: `Tier ${roman(tierOf(k))}` }), h('span', { class: 'hr-k', text: CLASSES[k].name }),
      h('span', { class: 'hr-three' }, CLASSES[k].tree.map(p => { const sk = SKILLS[p[tierOf(k) - 1]]; return sk ? h('span', {}, icon(sk.icon || 'star', 14), sk.name) : null; }))));
    if (o.awaken) opts.push(h('button', { class: 'hr-opt' + (sel({ kind: 'awaken' }) ? ' on' : ''), type: 'button', onclick: () => choose({ kind: 'awaken' }) },
      h('b', { text: 'Awakening' }), h('span', { class: 'hr-k', text: `A level 5 skill · ${HERO.AWAKEN_COST} points` })));
    const combine = o.combine.length ? h('div', { class: 'hr-osect' }, h('h5', { text: c.classes.length === 1 ? 'Or a second class' : 'Or a third class' }),
      h('div', { class: 'hr-classes' }, o.combine.map(k => h('button', { class: 'hr-cls' + (sel({ kind: 'combine', cls: k }) ? ' on' : ''), type: 'button', onclick: () => choose({ kind: 'combine', cls: k }) },
        icon(SKILLS[CLASSES[k].starter].icon || 'star', 14), h('span', { text: CLASSES[k].name }))))) : null;
    const go = () => {
      if (!pick || !Hero.choose(c, t, pick)) return;
      Save.commit(); sfx('region');
      toast(pick.kind === 'combine' ? `${CLASSES[pick.cls].name} combined` : pick.kind === 'awaken' ? 'An awakening is open' : `Tier ${roman(c.tiers[pick.cls])} is open`);
      if (pick.kind !== 'awaken') ui.cls = pick.cls;
      const more = Hero.pending(c);
      if (more.length) { ui.thr = more[0]; ui.choice = null; draw(); } else { ui.over = 'tree'; ui.node = null; ui.fresh = true; draw(); }
    };
    return [
      h('div', { class: 'hr-opts', 'data-scroll': 'thresh' }, h('div', { class: 'hr-optrow' }, opts), combine,
        pick && pick.kind === 'combine' ? h('p', { class: 'hr-why warm', text: `For good: ${c.name} learns ${SKILLS[CLASSES[pick.cls].starter].name}, and a respec keeps it.` }) : null),
      h('div', { class: 'hc-row end' }, btn('Later', close, { sec: true }), btn('Choose', go, { off: !pick, cls: 'hr-choose', quiet: true })),
    ];
  }
  function respecBody(c, close) {
    const P = Hero.points(c), spent = c.level - 1 - P.stat + Math.floor(c.level / 5) - P.skill, st = S();
    const after = () => { ui.pending = {}; ui.over = null; ui.node = null; toast('Points returned'); draw(); };
    const rows = [];
    if (c.respecs) rows.push(btn(`Free respec · ${c.respecs} left`, () => { Hero.respec(c, true); Save.commit(); after(); }, { cls: 'hr-free' }));
    if (typeof Base !== 'undefined') {
      if (Base.built('shrine', st)) {
        const price = Base.respecPrice(c, st), free = Base.freeRespecIn(st) === 0;
        rows.push(btn(free ? 'The Shrine · free today' : `The Shrine · ${fmt(price)} gold`, () => {
          if (!Base.respec(c.id, st, { free })) { toast(`${fmt(price - st.currencies.gold)} gold short`, 'bad'); return; }
          Save.commit(); after();
        }, { sec: !!c.respecs }));
      } else rows.push(h('p', { class: 'hr-why', text: Base.unlocked('region:1', st) ? 'Or build the Shrine, for gold' : 'The Shrine comes with the Drowned Chapel' }));
    }
    return [
      h('div', { class: 'hr-resp' },
        h('div', { class: 'hr-big', 'data-tip': tip('Points', 'Tiers, classes and awakenings stay. Awakened skills go back to level 1.') }, h('b', { text: String(spent) }), h('span', { text: 'points back' })),
        h('div', { class: 'hr-rbtns' }, rows)),
      h('div', { class: 'hc-row end' }, btn('Keep my build', close, { sec: true })),
    ];
  }

  // ── keys: Escape closes what's open, then goes back; the arrows step through the heroes
  document.addEventListener('keydown', ev => {
    if (App.current !== 'hero' || !ui.view || !ui.view.isConnected || !$('#sheet').hidden || ev.target.closest && ev.target.closest('input,textarea,select')) return;
    if (ev.key === 'Escape') {
      ev.preventDefault();
      if (!ui.over && !ui.dress && !ui.pick && ui.mode !== 'spend') { back(); return; }
      click();
      if (ui.over) ui.over = null; else if (ui.dress) ui.dress = null; else if (ui.pick) ui.pick = null; else { ui.mode = 'card'; ui.pending = {}; }
      draw();
    } else if ((ev.key === 'ArrowLeft' || ev.key === 'ArrowRight') && ui.mode !== 'spend') { ev.preventDefault(); step(ev.key === 'ArrowLeft' ? -1 : 1); }
  });
  // A turn of the phone can change the frame between 16:9 and wider: the arch is drawn for one or the other.
  window.addEventListener('resize', () => { if (App.current === 'hero' && ui.archKey && !ui.archKey.endsWith('|' + narrow())) draw(); });

  App.screen('hero', {
    tab: true, full: true, bare: true,
    render(p) {
      if (p && p.id && p.id !== ui.id) reset(p.id);
      ui.view = h('div', { class: 'hr-view hc' });
      Tip.attach(ui.view);
      ui.fresh = true;
      build(ui.view);
      return ui.view;
    },
    refresh() { draw(); },
    leave() { if (ui.stage) ui.stage.stop(); ui.stage = null; ui.archEl = null; ui.archKey = null; ui.pending = {}; ui.mode = 'card'; ui.over = null; ui.dress = null; ui.pick = null; ui.renaming = false; Tip.hide(); },
  });
  return {
    open, dress, draw, autoEquipPlan,
    get id() { return ui.id; }, get placing() { return pendingTotal(); },
    get mode() { return ui.over ? 'tree' : ui.dress ? 'dress' : ui.pick ? 'pick' : ui.mode; },
  };
})();
// Every way in (the Heroes list, Formation, the Bag) opens the hero card.
App.actions.hero = (id, tab) => HeroSheet.open(id, tab);

// ── a level from outside a battle (the camp's buildings, the prototype's training): a small note. A battle's levels
// show in the results popup (js/results.js).
const LevelUp = (() => {
  function toastOf(c, g) { toast(`${c.name} reaches level ${g.to}${g.thresholds && g.thresholds.length ? ' · a threshold' : ''}`); }
  return { toast: toastOf };
})();
