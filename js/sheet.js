'use strict';
// Lantern Road · the hero (screen 8), after docs/mockups/hero.html (play-test note 1.32, approved 2026-11-05). A screen
// of its own on the whole landscape stage:
//   the top     back; the name, with class · row and ‹ › to step through the party, then the resting; gold and bone dust
//   the arch    the hero full length in a stone window (the art below, after docs/mockups/hearth-art.js), wearing their
//               gear or what is being tried on; above, the path they have built most; at its foot level, fatigue and
//               XP. A skill watched plays here, on a dummy that steps in for it (SpriteStage, js/stage.js); a tap on the
//               hero plays their basic attack and equipped skills in turn
//   the panel   the framed panel (js/kit.js) with four tabs on its plate, each with a red dot when something waits:
//     Stats    seven stats and six resistances, with + on each while there are points; Reset, Auto (the class's plan,
//              Hero.autoPoints) and Keep
//     Skills   a threshold to choose, when one waits; the slots (Basic, Skill I, Skill II...); the learned skills for
//              the slot picked, with their mana. A tap shows a skill's card beside the list, a second tap watches it in
//              the arch. The tree (learn, raise, awaken) and Respec open from here
//     Gear     what's worn; the Bag's pieces that fit, best first. A tap tries one on, a second opens its card
//              (GearUI.card, js/bag.js). Unequip, and Auto-equip: the best that fits for each slot
//     Tactics  the hero's tactics (rules in the code) as when → do, top first, then Otherwise; Edit tactics opens the
//              editor (js/rules.js)
// A threshold, the tree and a respec open as framed panels in the panel's place, so the arch stays in sight. Every change
// goes through the hero model (js/hero.js) or the item model (js/items.js), and is saved.
// The guide points into it through data-tut: hero-tab-stats, hero-tab-skills, hero-tab-gear, hero-tab-rules (the tabs),
// hero-points (the "to place" plate), hero-auto, hero-keep, hero-autoequip, hero-rules (the rules list), hero-next (›)
// and hero-back (‹). HeroSheet.placing: the stat points placed on the Stats tab and not yet kept.
// Styles in css/hero.css, classes prefixed hr-.

const HeroSheet = (() => {
  const ui = {
    id: null, tab: 'stats', pending: {}, slot: 1, skill: null, over: null, node: null, cls: null, thr: null, pick: null,
    tryOn: null, worn: null, back: null, view: null, archEl: null, archKey: null, archTop: null, stage: null, watchI: 0, fresh: false,
  };
  const click = () => sfx('click');
  const char = () => Save.char(ui.id);
  const S = () => Save.state;
  const STATS = [['hp', 'Health', 'heart'], ['mp', 'Mana', 'mana'], ['pow', 'Power', 'sword'], ['def', 'Defence', 'shield'], ['spd', 'Speed', 'boot'], ['crit', 'Crit', 'star'], ['dodge', 'Dodge', 'feather']];
  const RES_ICON = { stun: 'stun', move: 'anchor', bleed: 'bleed', blight: 'poison', curse: 'curse', debuff: 'weak' };
  const SHORT = { hp: 'HP', mp: 'MP', pow: 'POW', def: 'DEF', spd: 'SPD', crit: 'CRIT', dodge: 'DODGE' };
  const SHAPES = { foe: 'One foe', front: 'Front row', back: 'Back row', random3: '3 random foes', foes: 'All foes', ally: 'One ally', allies: 'All allies', self: 'Self', fallen: 'Fallen allies' };
  const SLOT_WORDS = ['Skill I', 'Skill II', 'Skill III', 'Skill IV', 'Skill V'];
  const SLOT_NAMES_UK = { weapon: 'Weapon', armor: 'Armour', accessory: 'Accessory' };
  const COND_ICON = { self: 'helm', ally: 'heart', foe: 'eye', battle: 'hourglass', between: 'lantern' };
  const roman = n => ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'][n] || String(n);
  const fmtStat = (k, v) => (k === 'spd' ? (Math.round(v * 10) / 10).toFixed(1) : k === 'crit' || k === 'dodge' ? Math.round(v) + '%' : fmt(v));
  const fmtDelta = (k, d) => (k === 'spd' ? (Math.round(d * 10) / 10).toFixed(1) : String(Math.round(d)));
  const pxImg = (src, w, hh, cls = '') => h('img', { class: 'px ' + cls, src, alt: '', width: w, height: hh, draggable: 'false' });
  const icon = (name, size, cls) => pxImg(iconURL(name), size, size, cls);
  const btn2 = (label, fn, o = {}) => {
    const b = Kit.button(label, fn, o.sec);
    if (o.cls) b.classList.add(...o.cls.split(' '));
    if (o.tut) b.setAttribute('data-tut', o.tut);
    if (o.off) b.disabled = true;
    return b;
  };

  // ── the arched window: docs/mockups/hero.html's, drawn with the few parts of the pixel kit it needs
  // (docs/mockups/hearth-art.js: whole art pixels, warm light low down, an ink outline). w: the width in art pixels,
  // 140 on a wide frame and 100 on a 16:9 one; drawn at 2×.
  const INK = '#0d0911', SILL = 152, ARCH_H = 166, FEET = 274; // FEET: where the hero stands, in design pixels
  const hs = (a, b, c = 0) => { let n = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + Math.imul(c | 0, 1442695041)) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
  const archCache = {};
  function archArt(W) {
    if (archCache[W]) return archCache[W];
    const Hh = ARCH_H, cv = document.createElement('canvas'); cv.width = W; cv.height = Hh;
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
    for (const [gx, gy] of [[22, 96], [104, 92], [36, 100], [92, 99]]) { const x = Math.round(gx * sx); rect(x, gy, 5, 8, '#1a1424'); rect(x + 1, gy - 1, 3, 1, '#1a1424'); }
    const lx = Math.round(114 * sx);
    rect(lx, 70, 1, 35, '#140f1c'); rect(lx - 2, 68, 5, 1, '#140f1c'); rect(lx - 1, 69, 3, 3, '#f4a646'); px(lx, 70, '#ffe2a0');
    for (let x = cx - r; x < cx + r; x++) { const y = 136 + Math.round(Math.sin(x / 7) * 1.5); for (let yy = y; yy < SILL; yy++) px(x, yy, (Math.floor(x / 9) + Math.floor(yy / 5)) % 2 ? '#3a2c26' : '#33262a'); }
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
    return (archCache[W] = { url: big.toDataURL(), w: W * 2, h: Hh * 2, x: (cx - r) * 2, iw: r * 4, top: (cy - r) * 2, bottom: SILL * 2 });
  }

  // ── points placed but not yet kept
  function preview(c) {
    const p = JSON.parse(JSON.stringify(c));
    for (const k in ui.pending) Hero.allocate(p, k, ui.pending[k]);
    return p;
  }
  const pendingTotal = () => Object.values(ui.pending).reduce((a, b) => a + b, 0);
  function addPending(k) {
    const p = preview(char());
    if (Hero.points(p).stat <= 0 || Hero.placed(p, k) >= Hero.capOf(k)) { sfx('miss'); return; }
    ui.pending[k] = (ui.pending[k] || 0) + 1;
    click(); draw();
  }
  function autoPlace() {
    const plan = Hero.autoPoints(preview(char()));
    for (const k in plan) ui.pending[k] = (ui.pending[k] || 0) + plan[k];
    draw();
  }
  function keep() {
    const c = char();
    for (const k in ui.pending) Hero.allocate(c, k, ui.pending[k]);
    ui.pending = {};
    Save.commit(); sfx('kindle'); toast('Points placed'); draw();
  }

  // ── what waits on each tab, for its red dot
  const treeIds = c => c.classes.flatMap(k => [CLASSES[k].starter, ...CLASSES[k].tree.flat()]);
  function idleActive(c) {
    const n = Hero.activeSlots(c), on = c.equip.slice(0, n).filter(Boolean);
    return on.length < n && Hero.actives(c).some(id => !on.includes(id));
  }
  // Auto-equip's choice: for each slot, the Bag's piece with the best Items.score that this hero can use, when the slot
  // is empty or it beats what's worn by more than the ▲ mark's margin (0.5).
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
  function waiting(c) {
    const P = Hero.points(c);
    return {
      stats: P.stat > 0,
      skills: Hero.pending(c).length > 0 || (P.skill > 0 && treeIds(c).some(id => { const st = Hero.skill(c, id); return st.canLearn || st.canAwaken; })) || idleActive(c),
      gear: autoEquipPlan(c).length > 0,
      rules: false,
    };
  }

  // ── opening, stepping, going back
  function reset(id) {
    ui.id = id; ui.pending = {}; ui.slot = 1; ui.skill = null; ui.over = null; ui.node = null; ui.cls = null; ui.tryOn = null; ui.worn = null;
  }
  function open(id, tab) {
    if (!Save.char(id)) return;
    const from = App.current;
    // Back returns where the hero was opened from: the rules editor and the hero screen itself don't count.
    if (from !== 'hero' && from !== 'tactics') ui.back = { screen: from && from !== 'battle' ? from : 'home', formation: typeof Formation !== 'undefined' && Formation.shown };
    if (ui.id !== id) reset(id);
    if (tab) ui.tab = tab;
    if (from === 'hero') { ui.over = null; draw(); return; }
    App.go('hero', { id, tab: ui.tab });
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
    const tab = ui.tab;
    reset(ids[(i + d + ids.length) % ids.length]);
    ui.tab = tab;
    draw();
  }
  const rowOf = c => { const i = S().party.indexOf(c.id); return i < 0 ? 'Resting' : i < 2 ? 'Front' : 'Back'; };
  // The path a hero has built most: the tree column with the most skill levels learned, beyond the root.
  function pathOf(c) {
    let best = null, most = 0;
    for (const k of c.classes) CLASSES[k].tree.forEach((col, i) => { const n = col.reduce((m, id) => m + (c.skills[id] || 0), 0); if (n > most) { most = n; best = CLASSES[k].paths[i][0]; } });
    return best;
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
    const keepScroll = [...v.querySelectorAll('[data-scroll]')].map(el => [el.dataset.scroll, el.scrollTop]);
    v.replaceChildren(...top(c), arch(c), ui.over ? overPanel(c) : panel(c));
    for (const [k, y] of keepScroll) { const el = v.querySelector(`[data-scroll="${k}"]`); if (el) el.scrollTop = y; }
    ui.fresh = false;
  }

  function top(c) {
    const many = order().length > 1, s = S();
    const cur = (ic, n, label) => h('div', { class: 'hr-cur', title: label }, h('span', { class: 'hr-ci' }, icon(ic, 20)), h('span', { class: 'hr-cv', text: fmt(n) }));
    return [
      h('button', { class: 'hr-back', 'aria-label': 'Back', 'data-tut': 'hero-back', onclick: back }, '‹'),
      h('div', { class: 'hr-who' },
        h('button', { class: 'hr-arr', 'aria-label': 'Previous hero', disabled: !many, onclick: () => step(-1) }, '‹'),
        h('div', { class: 'hr-nm' }, h('b', { text: c.name }), h('span', { text: `${c.classes.map(k => CLASSES[k].name).join(' + ')} · ${rowOf(c)}` })),
        h('button', { class: 'hr-arr', 'aria-label': 'Next hero', 'data-tut': 'hero-next', disabled: !many, onclick: () => step(1) }, '›')),
      h('div', { class: 'hr-purse' }, cur('coin', s.currencies.gold, 'Gold'), cur('bone', s.currencies.mats.bone_dust || 0, 'Bone Dust')),
    ];
  }

  // ── the arch
  const narrow = () => Frame.W < 720;
  function lookOf(c) {
    const look = Items.look(c), x = ui.tryOn && Items.find(S(), ui.tryOn);
    if (x && Items.canUse(c, x.item)) look[SLOTS.indexOf(Items.def(x.item).slot)] = x.item.id;
    return look;
  }
  function arch(c) {
    const nar = narrow(), A = archArt(nar ? 100 : 140), k = nar ? 5 : 6, key = c.id + '|' + nar;
    if (ui.archKey !== key || !ui.archEl) {
      if (ui.stage) ui.stage.stop();
      const sh = Math.floor((A.bottom - A.top) / k) * k, y0 = A.bottom - sh, rad = A.iw / 2;
      const stageEl = h('div', { class: 'hr-stage', role: 'button', 'aria-label': `${c.name}. Tap to watch a skill.`, style: `left:${A.x}px;top:${y0}px;width:${A.iw}px;height:${sh}px;clip-path:inset(0 round ${rad}px ${rad}px 0 0)` });
      ui.stage = new SpriteStage(stageEl, { cls: c.cls, look: lookOf(c), scale: k, hx: 0.45, dx: 0.84, ground: sh / k - Math.round((FEET - y0) / k), backdrop: false, dummy: 'play', ambient: [] });
      ui.watchI = 0;
      stageEl.addEventListener('click', () => { const h2 = char(); if (!h2) return; const list = [CLASSES[h2.cls].basic, ...h2.equip.filter(Boolean)]; watch(list[ui.watchI++ % list.length]); });
      ui.archTop = h('div', { class: 'hr-arch-top' });
      ui.archEl = h('div', { class: 'hr-arch' + (nar ? ' narrow' : ''), style: `width:${A.w}px;height:${A.h}px` }, pxImg(A.url, A.w, A.h, 'hr-win'), stageEl, ui.archTop);
      ui.archKey = key;
    }
    ui.stage.setLook(lookOf(c));
    const tried = ui.tryOn && Items.find(S(), ui.tryOn), path = pathOf(c);
    const st = Fatigue.state(c), need = Hero.xpToNext(c.level), cap = c.level >= HERO.CAP;
    // (replaceChildren writes a null as the text "null": a hero with no path yet has no plate, so it's left out)
    ui.archTop.replaceChildren(...[
      tried ? h('span', { class: 'hr-plate try', text: 'Trying on' }) : path ? h('span', { class: 'hr-plate', text: path }) : null,
      h('div', { class: 'hr-foot' },
        h('div', { class: 'hr-tags' }, h('span', { class: 'hr-lv' }, 'Lv', h('b', { text: String(c.level) })),
          h('span', { class: 'hr-fat ' + st, title: 'Fatigue' }, icon('fatigue', 12), `${st === 'fresh' ? 'Rested' : FATIGUE_NAMES[st]} ${Math.floor(c.fatigue || 0)}%`)),
        h('div', { class: 'hr-xp', title: 'XP' }, h('i', { style: `width:${cap ? 100 : Math.min(100, 100 * c.xp / need)}%` }), h('span', { text: cap ? 'Max' : `${fmt(c.xp)} / ${fmt(need)}` }))),
      proto(c)].filter(Boolean));
    return ui.archEl;
  }
  // Prototype tools: XP to try the later thresholds without the grind (hidden with Settings → Prototype tools).
  function proto(c) {
    const give = n => { click(); const g = Hero.gainXp(c, Hero.xpBetween(c.level, Math.min(HERO.CAP, c.level + n))); Save.commit(); if (g.to > g.from) LevelUp.toast(c, g); draw(); };
    return h('div', { class: 'hr-proto proto-only' }, [1, 5, 25].map(n => h('button', { disabled: c.level >= HERO.CAP, onclick: () => give(n) }, `+${n} Lv`)));
  }
  // What a skill would do on the dummy: its damage or healing at the hero's level.
  function playInfo(c, id) {
    const sk = SKILLS[id], L = c.skills[id] || 1, p = skillLevel(L, c.awakened.includes(id)), s = Hero.sheet(c);
    if (sk.power) return { num: Math.max(1, Math.round(s.pow * p.v(sk.power) * (sk.hits || 1))) };
    if (sk.heal || sk.healPct) return { heal: Math.round(s.pow * p.v(sk.heal || 0) + s.hp * p.v(sk.healPct || 0)) };
    if (sk.revive) return { tag: 'Raised' };
    const st = (sk.st || sk.self || [])[0];
    return { tag: st && STATUSES[st.k] ? STATUSES[st.k].name : sk.name };
  }
  function watch(id) {
    const c = char();
    if (!ui.stage || !c || !SKILLS[id]) return;
    ui.stage.play(SKILLS[id], playInfo(c, id));
  }

  // ── the panel and its tabs
  function panel(c) {
    const K = Kit.panel({ cls: 'hr-panel' }), dots = waiting(c);
    K.close.remove();
    K.plate.classList.add('hr-tabs');
    K.plate.setAttribute('role', 'tablist');
    K.plate.replaceChildren(...[['stats', 'Stats', 'heart'], ['skills', 'Skills', 'book'], ['gear', 'Gear', 'helm'], ['rules', 'Tactics', 'scroll']].map(([k, n, ic]) =>
      h('button', { class: 'hr-tab' + (ui.tab === k ? ' on' : ''), type: 'button', role: 'tab', 'aria-selected': ui.tab === k ? 'true' : 'false', 'data-tut': 'hero-tab-' + k,
        onclick: () => { if (ui.tab === k) return; click(); ui.tab = k; ui.tryOn = null; ui.worn = null; draw(); } },
        icon(ic, 16), h('span', { text: n }), dots[k] ? h('i', { class: 'hr-dot', 'aria-label': 'Something waits here' }) : null)));
    K.body.classList.add('hr-body', 'tab-' + ui.tab);
    K.body.append(...[].concat(ui.tab === 'skills' ? skillsTab(c) : ui.tab === 'gear' ? gearTab(c) : ui.tab === 'rules' ? rulesTab(c) : statsTab(c)).filter(Boolean));
    return K.root;
  }
  const sect = (title, extra, ...kids) => h('div', { class: 'hr-sect' }, h('div', { class: 'hr-h' }, h('h4', {}, title, extra && extra.chip), extra && extra.btns), ...kids);

  // ── Stats
  function statsTab(c) {
    const p = preview(c), s = Hero.sheet(p), now = Hero.sheet(c), left = Hero.points(p).stat, placed = pendingTotal();
    const plus = (k, label) => (left > 0 && Hero.placed(p, k) < Hero.capOf(k) ? h('button', { class: 'hr-plus', type: 'button', 'aria-label': `Add a point to ${label}`, onclick: () => addPending(k) }, '+') : null);
    const cell = ([k, label, ic]) => {
      const d = s[k] - now[k];
      return h('div', { class: 'hr-st' + (ui.pending[k] ? ' up' : '') }, icon(ic, 16), h('span', { text: label }),
        h('b', {}, fmtStat(k, s[k]), d > 0.001 ? h('em', { text: '+' + fmtDelta(k, d) }) : null), plus(k, label));
    };
    const res = k => {
      const d = s.res[k] - now.res[k];
      return h('div', { class: 'hr-rs' + (ui.pending['res:' + k] ? ' up' : '') }, icon(RES_ICON[k], 16),
        h('b', {}, Math.round(s.res[k]) + '%', d > 0.001 ? h('em', { text: '+' + Math.round(d) }) : null), h('span', { text: RESISTS[k].name }), plus('res:' + k, RESISTS[k].name));
    };
    const chip = left > 0 ? h('em', { class: 'hr-chip', 'data-tut': 'hero-points', text: `${left} to place` }) : null;
    const head = sect('Stats', { chip }, h('div', { class: 'hr-stats' }, STATS.map(cell)));
    if (!chip) head.querySelector('h4').setAttribute('data-tut', 'hero-points');
    return [
      head,
      h('div', { class: 'hr-row' }, h('span', { class: 'sp' }),
        btn2('Reset', () => { ui.pending = {}; draw(); }, { sec: true, off: !placed }),
        btn2('Auto', autoPlace, { sec: true, off: left <= 0, tut: 'hero-auto', cls: 'hr-auto' }),
        btn2('Keep', keep, { off: !placed, tut: 'hero-keep', cls: 'hr-keep' })),
      sect('Resists', null, h('div', { class: 'hr-res' }, RES_KEYS.map(res))),
    ];
  }

  // ── Skills
  const isBasic = (c, id) => c.classes.some(k => CLASSES[k].basic === id);
  const costOf = sk => (sk.cost ? `${sk.cost} MP` : sk.hpCost || sk.hpCur ? 'HP' : 'Free');
  function slotsOf(c) {
    const n = Hero.activeSlots(c), basic = CLASSES[c.cls].basic;
    Hero.fixEquip(c);
    const out = [{ i: 0, word: 'Basic', id: basic }];
    for (let j = 0; j < n; j++) out.push({ i: j + 1, word: SLOT_WORDS[j], id: c.equip[j] || null });
    if (n < 2) out.push({ i: n + 1, word: SLOT_WORDS[n], lock: c.level < 50 ? 'Lv 50' : 'Lv 200' });
    return out;
  }
  function skillsTab(c) {
    const P = Hero.points(c), pend = Hero.pending(c), slots = slotsOf(c);
    if (!slots.some(x => x.i === ui.slot && !x.lock)) ui.slot = 1;
    const cur = slots.find(x => x.i === ui.slot);
    const slotCell = x => {
      const sk = x.id && SKILLS[x.id];
      return h('button', { class: 'hr-sk' + (x.i === ui.slot ? ' on' : '') + (x.lock ? ' lock' : '') + (sk ? '' : ' empty'), type: 'button', disabled: !!x.lock, 'aria-label': `${x.word}: ${x.lock ? 'opens at ' + x.lock : sk ? sk.name : 'empty'}`,
        onclick: () => { if (x.i === ui.slot && sk && ui.skill === x.id) { watch(x.id); return; } click(); ui.slot = x.i; ui.skill = x.id || null; draw(); } },
        h('span', { class: 'hr-ic' }, x.lock ? icon('lock', 18) : sk ? icon(sk.icon || 'sword', 22) : h('span', { class: 'hr-pl', text: '+' })),
        h('span', { class: 'hr-tx' }, h('span', { text: x.word }), h('b', { text: x.lock || (sk ? sk.name : 'Empty') })),
        sk && sk.cost && !x.lock ? h('span', { class: 'hr-mpc', text: String(sk.cost) }) : null);
    };
    // the skills for the slot picked: the basic attack, or every active learned
    const ids = ui.slot === 0 ? [CLASSES[c.cls].basic]
      : Hero.actives(c).sort((a, b) => (c.equip.indexOf(a) < 0) - (c.equip.indexOf(b) < 0) || (c.equip.indexOf(a) - c.equip.indexOf(b)) || SKILLS[a].tier - SKILLS[b].tier);
    const row = id => {
      const sk = SKILLS[id], where = c.equip.indexOf(id);
      return h('button', { class: 'hr-li' + (ui.skill === id ? ' on' : '') + (cur && cur.id === id ? ' eq' : ''), type: 'button', 'data-id': id,
        onclick: () => { if (ui.skill === id) { watch(id); return; } click(); ui.skill = id; draw(); } },
        icon(sk.icon || 'sword', 22), h('b', { text: sk.name }),
        where >= 0 && ui.slot > 0 ? h('span', { class: 'hr-in', text: roman(where + 1) }) : null,
        !isBasic(c, id) ? h('span', { class: 'hr-pips' }, Array.from({ length: SKILL_LV_MAX }, (_, i) => h('i', { class: i < (c.skills[id] || 0) ? 'f' : '' }))) : null,
        h('span', { class: 'hr-cost', text: costOf(sk) }));
    };
    if (ui.skill && !ids.includes(ui.skill)) ui.skill = null;
    // one header row for the tab: skill points, a threshold waiting (a path to choose), the tree and respec
    const pts = { chip: P.skill > 0 ? h('em', { class: 'hr-chip', text: `${P.skill} pt${P.skill === 1 ? '' : 's'}` }) : null };
    pts.btns = h('span', { class: 'hr-hb' },
      pend.length ? h('button', { class: 'hr-mini hr-thr', type: 'button', 'aria-label': `Level ${pend[0]}: choose a path`, onclick: () => { click(); ui.over = 'thresh'; ui.thr = pend[0]; ui.pick = null; ui.fresh = true; draw(); } }, icon('star', 12), `Lv ${pend[0]} · Choose a path`) : null,
      h('button', { class: 'hr-mini hr-treeb' + (P.skill > 0 && !pend.length ? ' warm' : ''), type: 'button', onclick: () => { click(); ui.over = 'tree'; ui.node = null; ui.fresh = true; draw(); } }, icon('book', 12), 'Tree'),
      h('button', { class: 'hr-mini', type: 'button', onclick: () => { click(); ui.over = 'respec'; ui.fresh = true; draw(); } }, 'Respec'));
    return [
      sect('Slots', pts, h('div', { class: 'hr-slots', style: `grid-template-columns:repeat(${slots.length},minmax(0,1fr))` }, slots.map(slotCell))),
      h('div', { class: 'hr-split' + (ui.skill ? ' hr-with' : '') }, h('div', { class: 'hr-list', 'data-scroll': 'known', 'aria-label': ui.slot === 0 ? 'Basic' : 'Known' }, ids.map(row)), ui.skill ? skillCard(c, ui.skill, 'slot') : null),
    ];
  }
  // A skill's card: its words, and learning, raising, awakening, equipping and watching it. where: 'slot' (the Skills
  // tab, equipping into the slot picked) or 'tree'.
  function skillCard(c, id, where) {
    const sk = SKILLS[id], basic = isBasic(c, id), st = Hero.skill(c, id), P = Hero.points(c), L = basic ? 1 : Math.max(1, st.L);
    const active = basic || sk.kind === 'active', ruled = (Tactics.owner(c.id).rules || []).some(r => r.do === id);
    const tag = (text, cls = '') => h('span', { class: 'hr-tag ' + cls, text });
    const cost = [sk.cost ? `${sk.cost} MP` : null, sk.hpCost ? `${Math.round(sk.hpCost * 100)}% HP` : null, sk.hpCur ? `${Math.round(sk.hpCur * 100)}% current HP` : null].filter(Boolean).join(' + ');
    const tags = [
      basic ? tag('Basic') : sk.kind === 'active' ? null : tag(sk.kind === 'key' ? 'Keystone' : 'Passive', 'g'),
      !basic ? tag(st.L ? `Lv ${st.L}/${SKILL_LV_MAX}` : st.open ? 'Not learned' : `Tier ${roman(sk.tier)}`, st.L ? 'e' : '') : null,
      active ? tag(cost || 'Free', 'w') : null, active && sk.shape ? tag(SHAPES[sk.shape] || sk.shape) : null, active && sk.range ? tag(sk.range + (sk.reach ? ' · reach' : '')) : null,
      st.awakened ? tag('Awakened', 'e') : null,
      active && !basic && st.equipped && !ruled ? tag('No tactic uses it', 'b') : null,
    ];
    const desc = (which, withNext) => h('p', { class: 'hr-desc' + (which === 'aw' ? ' aw' : '') }, skillParts(sk, L, which).map(x => (x.text != null ? x.text : h('b', {}, x.num, withNext && x.next && x.next !== x.num ? h('span', { class: 'hr-next', text: ' → ' + x.next }) : null))));
    const done = msg => { Save.commit(); if (msg) toast(msg); draw(); };
    const btns = [];
    if (active && (basic || st.L)) btns.push(btn2('Watch', () => watch(id), { sec: true, cls: 'hr-watch' }));
    if (!basic && sk.kind === 'active' && st.L) {
      const slot = where === 'slot' && ui.slot > 0 ? ui.slot - 1 : -1;
      if (slot >= 0 ? c.equip[slot] === id : st.equipped) btns.push(btn2('Unequip', () => { Hero.equip(c, slot >= 0 ? slot : c.equip.indexOf(id), null); sfx('guard'); done(); }, { sec: true }));
      else btns.push(btn2('Equip', () => { const to = slot >= 0 ? slot : Math.max(0, c.equip.indexOf(null)); if (Hero.equip(c, to, id)) { sfx('guard'); done(`${sk.name} in ${SLOT_WORDS[to]}`); } }, { sec: true }));
    }
    if (!basic) {
      if (st.L < SKILL_LV_MAX) btns.push(btn2(st.L ? 'Raise · 1 pt' : 'Learn · 1 pt', () => { if (Hero.learn(c, id)) { sfx('kindle'); done(st.L ? `${sk.name} · Lv ${st.L + 1}` : `Learned ${sk.name}`); } }, { off: !st.canLearn, cls: 'hr-learn' }));
      else if (!st.awakened) btns.push(btn2(`Awaken · ${HERO.AWAKEN_COST} pts`, () => { if (Hero.awaken(c, id)) { sfx('region'); done(`${sk.name} awakens`); } }, { off: !st.canAwaken, cls: 'hr-learn' }));
    }
    const why = basic ? '' : !st.open ? `Tier ${roman(sk.tier)} opens at a threshold` : st.L >= SKILL_LV_MAX && !st.awakened ? (Hero.awakenOpen(c) ? (P.skill < HERO.AWAKEN_COST ? `Needs ${HERO.AWAKEN_COST} points` : '') : 'Awakening opens at a threshold from Lv 100') : P.skill < 1 && st.L < SKILL_LV_MAX ? 'A point every 5 levels' : '';
    return h('div', { class: 'hr-card', role: 'group', 'aria-label': sk.name },
      h('button', { class: 'hr-cx', type: 'button', 'aria-label': 'Close', onclick: () => { click(); if (where === 'tree') ui.node = null; else ui.skill = null; draw(); } }, '✕'),
      h('div', { class: 'hr-ct' }, h('span', { class: 'hr-ic' }, icon(sk.icon || 'sword', 22)), h('b', { text: sk.name })),
      h('div', { class: 'hr-tags2' }, tags),
      h('div', { class: 'hr-cbody', 'data-scroll': 'card-' + where }, desc('d', st.L > 0 && st.L < SKILL_LV_MAX),
        !basic && (st.L >= SKILL_LV_MAX || st.awakened) ? desc('aw', false) : null,
        sk.later ? h('p', { class: 'hr-why', text: 'Not in effect yet: it comes with a later update.' }) : null,
        why ? h('p', { class: 'hr-why', text: why }) : null),
      h('div', { class: 'hr-cbtns' }, btns));
  }

  // ── Gear
  const statLine = x => { const s = Items.stats(x); return Object.keys(s).filter(k => s[k]).map(k => `${s[k] > 0 ? '+' : '−'}${Math.abs(k === 'spd' ? Math.round(s[k] * 10) / 10 : Math.round(s[k]))} ${SHORT[k] || k.toUpperCase()}`).join(' '); };
  function gearTab(c) {
    const st = S(), after = () => draw();
    let tried = ui.tryOn && Items.find(st, ui.tryOn);
    if (tried && (tried.where !== 'bag' || !Items.canUse(c, tried.item))) { ui.tryOn = null; tried = null; }
    const slot = k => {
      const x = c.gear[k], D = x && Items.def(x), lit = tried && Items.def(tried.item).slot === k;
      return h('button', { class: `hr-gs${D ? ' r-' + D.rarity : ' empty'}${ui.worn === k ? ' on' : ''}${lit ? ' try' : ''}`, type: 'button', 'data-slot': k, 'aria-label': `${SLOT_NAMES_UK[k]}: ${D ? D.name : 'empty'}`,
        onclick: () => { click(); if (x && ui.worn === k) { GearUI.card(x.uid, { hero: c.id, after }); return; } ui.worn = ui.worn === k ? null : k; ui.tryOn = null; draw(); } },
        h('span', { class: 'hr-lb', text: SLOT_NAMES_UK[k] }),
        h('span', { class: 'hr-ic' }, D ? pxImg(gearIconURL(x.id), 36, 36) : h('span', { class: 'hr-pl', text: '+' })),
        h('b', { text: D ? D.name : '' }), h('i', { text: D ? statLine(x) : '' }));
    };
    // the Bag's pieces that fit, best first in each slot (only the slot picked, when one is)
    const fits = st.inventory.items.filter(x => Items.def(x) && Items.canUse(c, x) && (!ui.worn || Items.def(x).slot === ui.worn))
      .sort((a, b) => SLOTS.indexOf(Items.def(a).slot) - SLOTS.indexOf(Items.def(b).slot) || Items.score(b) - Items.score(a));
    const tile = x => {
      const D = Items.def(x), now = c.gear[D.slot], d = Items.score(x) - (now ? Items.score(now) : 0);
      return h('button', { class: `hr-it r-${D.rarity}${ui.tryOn === x.uid ? ' sel' : ''}${d > 0.5 ? ' up' : ''}`, type: 'button', 'data-uid': x.uid, 'aria-label': `${D.name}, level ${x.lv}`,
        onclick: () => { if (ui.tryOn === x.uid) { click(); GearUI.card(x.uid, { hero: c.id, after }); return; } sfx('click'); ui.tryOn = x.uid; draw(); } },
        pxImg(gearIconURL(x.id), 30, 30), d > 0.5 ? h('span', { class: 'hr-mk up', text: '▲' }) : d < -0.5 ? h('span', { class: 'hr-mk dn', text: '▼' }) : null, h('span', { class: 'hr-lvc', text: String(x.lv) }));
    };
    const plan = autoEquipPlan(c), offKeys = ui.worn ? [ui.worn] : ['armor', 'accessory'];
    const unequip = () => {
      let n = 0;
      for (const k of offKeys) if (c.gear[k] && Items.unequip(st, c, k)) n++;
      if (n) { Save.commit(); sfx('guard'); toast(n === 1 ? 'Back in the Bag' : `${n} pieces back in the Bag`); }
      ui.worn = null; draw();
    };
    const autoEquip = () => {
      let n = 0;
      for (const x of autoEquipPlan(c)) if (Items.equip(st, c, x.uid)) n++;
      if (n) { Save.commit(); sfx('equip'); toast('Best that fits, equipped'); }
      ui.tryOn = null; draw();
    };
    let foot;
    if (tried) {
      const x = tried.item, D = Items.def(x), row = S().party.indexOf(c.id) < 0 ? CLASSES[c.cls].row : S().party.indexOf(c.id) < 2 ? 'front' : 'back';
      const copy = JSON.parse(JSON.stringify(c)); copy.gear[D.slot] = x;
      const a = Hero.sheet(c, row), b = Hero.sheet(copy, row);
      const diffs = STATS.map(([k, label]) => [k, label, k === 'spd' ? Math.round((b[k] - a[k]) * 10) / 10 : Math.round(b[k]) - Math.round(a[k])]).filter(q => q[2]).slice(0, 3);
      foot = h('div', { class: 'hr-row hr-tryrow' }, h('span', { class: 'hr-tw r-' + D.rarity }, pxImg(gearIconURL(x.id), 26, 26)),
        h('span', { class: 'hr-tn' }, h('b', { text: D.name }), h('span', {}, diffs.length ? diffs.map(([k, label, d]) => h('i', { class: d > 0 ? 'g' : 'b', text: `${d > 0 ? '▲' : '▼'} ${Math.abs(d)} ${SHORT[k]}` })) : h('i', { text: 'Effect only' }))),
        h('span', { class: 'sp' }),
        h('button', { class: 'hr-stop', type: 'button', 'aria-label': 'Stop trying it on', onclick: () => { click(); ui.tryOn = null; draw(); } }, '✕'),
        btn2('Card', () => GearUI.card(x.uid, { hero: c.id, after }), { sec: true, cls: 'hr-card-b' }),
        btn2('Equip', () => { if (Items.equip(st, c, x.uid)) { Save.commit(); sfx('equip'); toast(`${c.name} equips ${D.name}`); ui.tryOn = null; draw(); } }, { cls: 'hr-equip' }));
    } else {
      foot = h('div', { class: 'hr-row' }, h('span', { class: 'hr-bagn', text: `Bag ${st.inventory.items.length}/${ITEM.BAG}` }),
        h('span', { class: 'hr-proto2 proto-only' }, h('button', { type: 'button', onclick: () => { click(); const got = GearUI.rollPrototype(3, c.classes); if (got[0]) ui.tryOn = got[0].uid; draw(); } }, 'Roll 3')),
        h('span', { class: 'sp' }),
        btn2('Unequip', unequip, { sec: true, off: !offKeys.some(k => c.gear[k]), cls: 'hr-unequip' }),
        btn2('Auto-equip', autoEquip, { off: !plan.length, tut: 'hero-autoequip', cls: 'hr-autoequip green' }));
    }
    return [
      sect('Worn', null, h('div', { class: 'hr-gear' }, SLOTS.map(slot))),
      sect(ui.worn ? `In the Bag · ${SLOT_NAMES_UK[ui.worn]}` : 'In the Bag', { chip: h('em', { class: 'hr-chip dim', text: `${fits.length} fit` }) },
        fits.length ? h('div', { class: 'hr-bag', 'data-scroll': 'bag' }, fits.map(tile)) : h('p', { class: 'hr-none', text: 'Nothing that fits' })),
      foot,
    ];
  }

  // ── Rules
  function rulesTab(c) {
    const o = Tactics.owner(c.id), basic = SKILLS[CLASSES[c.cls].basic];
    const row = (r, i) => {
      const x = Tactics.explain(c.id, r), sk = SKILLS[r.do] || {}, C = CONDITIONS[r.if] || {}, off = r.on === false;
      return h('button', { class: 'hr-rule' + (off ? ' off' : '') + (x.warn ? ' warn' : ''), type: 'button', title: off ? 'Switched off' : x.text, onclick: () => { click(); toast(off ? 'Switched off' : x.text, x.warn ? 'bad' : ''); } },
        h('span', { class: 'hr-num', text: String(i + 1) }), h('span', { class: 'hr-if' }, icon(COND_ICON[C.group] || 'eye', 16), h('span', { text: ruleCond(r) })),
        h('span', { class: 'hr-to', text: '→' }), h('span', { class: 'hr-do' }, icon(sk.icon || 'sword', 16), h('span', { text: sk.name || r.do })));
    };
    return [
      sect('Tactics, top first', { chip: h('em', { class: 'hr-chip dim', text: `${o.rules.length} / ${o.slots}` }) },
        h('div', { class: 'hr-rules', 'data-tut': 'hero-rules', 'data-scroll': 'rules' }, o.rules.map(row),
          h('div', { class: 'hr-rule other' }, h('span', { class: 'hr-num', text: '·' }), h('span', { class: 'hr-if' }, h('span', { text: 'Otherwise' })), h('span', { class: 'hr-to', text: '→' }), h('span', { class: 'hr-do' }, icon(basic.icon || 'sword', 16), h('span', { text: basic.name }))))),
      h('div', { class: 'hr-row' }, h('span', { class: 'sp' }), btn2('Edit tactics', () => App.actions.tactics(c.id, () => open(c.id, 'rules')), { cls: 'hr-edit' })),
    ];
  }

  // ── the panels that open in the panel's place: the tree, a threshold, a respec
  function overPanel(c) {
    const close = () => { ui.over = null; ui.node = null; draw(); };
    const P = Hero.points(c);
    const K = ui.over === 'tree' ? Kit.panel({ icon: 'book', title: 'Skill tree', count: `${P.skill} pts`, cls: 'hr-panel hr-over', onClose: close })
      : ui.over === 'thresh' ? Kit.panel({ icon: 'star', title: `Level ${ui.thr}`, count: 'Choose a path', cls: 'hr-panel hr-over', onClose: close })
        : Kit.panel({ icon: 'book', title: 'Respec', cls: 'hr-panel hr-over', onClose: close });
    if (ui.fresh) K.root.classList.add('enter');
    K.body.classList.add('hr-body', 'over-' + ui.over);
    K.body.append(...[].concat(ui.over === 'tree' ? treeBody(c) : ui.over === 'thresh' ? threshBody(c, close) : respecBody(c, close)).filter(Boolean));
    return K.root;
  }
  function treeBody(c) {
    const cls = c.classes.includes(ui.cls) ? ui.cls : c.cls, C = CLASSES[cls], open = c.tiers[cls] || 0, next = HERO.THRESHOLDS.find(t => t > c.level);
    const node = id => {
      const sk = SKILLS[id], st = Hero.skill(c, id), have = st.L > 0;
      return h('button', { class: `hr-node ${sk.kind === 'active' ? 'act' : sk.kind === 'key' ? 'key' : 'pas'}${have ? ' have' : st.canLearn ? ' can' : st.open ? '' : ' lock'}${st.awakened ? ' awk' : ''}${st.equipped ? ' eq' : ''}${ui.node === id ? ' on' : ''}`, type: 'button', 'data-id': id,
        'aria-label': `${sk.name}, ${have ? 'level ' + st.L : st.open ? 'not learned' : 'locked'}`,
        onclick: () => { if (ui.node === id && sk.kind === 'active' && have) { watch(id); return; } click(); ui.node = id; draw(); } },
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
      h('div', { class: 'hr-split hr-treesplit' + (ui.node ? ' hr-with' : '') }, h('div', { class: 'hr-tree', 'data-scroll': 'tree' }, cells), ui.node ? skillCard(c, ui.node, 'tree') : null),
    ];
  }
  function threshBody(c, close) {
    const t = ui.thr, o = Hero.options(c, t), tierOf = k => (c.tiers[k] || 0) + 1, pick = ui.pick;
    const sel = ch => pick && pick.kind === ch.kind && pick.cls === ch.cls;
    const choose = ch => { click(); ui.pick = ch; draw(); };
    const opts = [];
    for (const k of o.tier) opts.push(h('button', { class: 'hr-opt' + (sel({ kind: 'tier', cls: k }) ? ' on' : ''), type: 'button', onclick: () => choose({ kind: 'tier', cls: k }) },
      h('b', { text: `Tier ${roman(tierOf(k))}` }), h('span', { class: 'hr-k', text: CLASSES[k].name }),
      h('span', { class: 'hr-three' }, CLASSES[k].tree.map(p => { const sk = SKILLS[p[tierOf(k) - 1]]; return sk ? h('span', {}, icon(sk.icon || 'star', 14), sk.name) : null; }))));
    if (o.awaken) opts.push(h('button', { class: 'hr-opt' + (sel({ kind: 'awaken' }) ? ' on' : ''), type: 'button', onclick: () => choose({ kind: 'awaken' }) },
      h('b', { text: 'Awakening' }), h('span', { class: 'hr-k', text: `A Lv 5 skill · ${HERO.AWAKEN_COST} pts` })));
    const combine = o.combine.length ? h('div', { class: 'hr-sect' }, h('div', { class: 'hr-h' }, h('h4', { text: c.classes.length === 1 ? 'Or a second class' : 'Or a third class' })),
      h('div', { class: 'hr-classes' }, o.combine.map(k => h('button', { class: 'hr-cls' + (sel({ kind: 'combine', cls: k }) ? ' on' : ''), type: 'button', onclick: () => choose({ kind: 'combine', cls: k }) },
        icon(SKILLS[CLASSES[k].starter].icon || 'star', 14), h('span', { text: CLASSES[k].name }))))) : null;
    const go = () => {
      if (!pick || !Hero.choose(c, t, pick)) return;
      Save.commit(); sfx('region');
      toast(pick.kind === 'combine' ? `${CLASSES[pick.cls].name} combined` : pick.kind === 'awaken' ? 'An awakening is open' : `Tier ${roman(c.tiers[pick.cls])} is open`);
      if (pick.kind !== 'awaken') ui.cls = pick.cls;
      const more = Hero.pending(c);
      if (more.length) { ui.thr = more[0]; ui.pick = null; draw(); } else { ui.over = 'tree'; ui.node = null; ui.fresh = true; draw(); }
    };
    return [
      h('div', { class: 'hr-opts', 'data-scroll': 'thresh' }, h('div', { class: 'hr-optrow' }, opts), combine,
        pick && pick.kind === 'combine' ? h('p', { class: 'hr-why warm', text: `For good: ${c.name} learns ${SKILLS[CLASSES[pick.cls].starter].name}, and a respec keeps it.` }) : null),
      h('div', { class: 'hr-row' }, h('span', { class: 'hr-bagn', text: `+1 free respec` }), h('span', { class: 'sp' }), btn2('Later', close, { sec: true }), btn2('Choose', go, { off: !pick, cls: 'hr-choose' })),
    ];
  }
  function respecBody(c, close) {
    const P = Hero.points(c), spent = c.level - 1 - P.stat + Math.floor(c.level / 5) - P.skill, st = S();
    const after = () => { ui.pending = {}; ui.over = null; ui.skill = null; toast('Points returned'); draw(); };
    const rows = [];
    if (c.respecs) rows.push(btn2(`Free respec · ${c.respecs} left`, () => { Hero.respec(c, true); Save.commit(); after(); }, { cls: 'hr-free' }));
    if (typeof Base !== 'undefined') {
      if (Base.built('shrine', st)) {
        const price = Base.respecPrice(c, st), free = Base.freeRespecIn(st) === 0;
        rows.push(btn2(free ? 'The Shrine · free today' : `The Shrine · ${fmt(price)} gold`, () => {
          if (!Base.respec(c.id, st, { free })) { toast(`${fmt(price - st.currencies.gold)} gold short`, 'bad'); return; }
          Save.commit(); after();
        }, { sec: !!c.respecs }));
      } else rows.push(h('p', { class: 'hr-why', text: Base.unlocked('region:1', st) ? 'Or build the Shrine, for gold' : 'The Shrine comes with the Drowned Chapel' }));
    }
    return [
      h('div', { class: 'hr-resp' },
        h('div', { class: 'hr-big' }, h('b', { text: String(spent) }), h('span', { text: 'points come back' })),
        h('div', { class: 'hr-keeps' }, h('span', { class: 'hr-tag g', text: 'Tiers stay' }), h('span', { class: 'hr-tag g', text: 'Classes stay' }), h('span', { class: 'hr-tag g', text: 'Awakenings stay open' }), h('span', { class: 'hr-tag b', text: 'Awakened skills go to Lv 1' })),
        h('div', { class: 'hr-rbtns' }, rows)),
      h('div', { class: 'hr-row' }, h('span', { class: 'sp' }), btn2('Keep my build', close, { sec: true })),
    ];
  }

  // ── keys: Escape goes back (or closes a panel), the arrows step through the party
  document.addEventListener('keydown', ev => {
    if (App.current !== 'hero' || !ui.view || !ui.view.isConnected || !$('#sheet').hidden || ev.target.closest && ev.target.closest('input,textarea,select')) return;
    if (ev.key === 'Escape') { ev.preventDefault(); if (ui.over) { click(); ui.over = null; draw(); } else back(); }
    else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight') { ev.preventDefault(); step(ev.key === 'ArrowLeft' ? -1 : 1); }
  });
  // A turn of the phone can change the frame between 16:9 and wider: the arch is drawn for one or the other.
  window.addEventListener('resize', () => { if (App.current === 'hero' && ui.archKey && !ui.archKey.endsWith('|' + narrow())) draw(); });

  App.screen('hero', {
    tab: true, full: true, bare: true,
    render(p) {
      if (p && p.id && p.id !== ui.id) reset(p.id);
      if (p && p.tab) ui.tab = p.tab;
      ui.view = h('div', { class: 'hr-view' });
      build(ui.view);
      return ui.view;
    },
    refresh() { draw(); },
    leave() { if (ui.stage) ui.stage.stop(); ui.stage = null; ui.archEl = null; ui.archKey = null; ui.pending = {}; ui.over = null; ui.tryOn = null; ui.worn = null; },
  });
  // playing: a skill is being watched in the arch now (the tools check it)
  return { open, draw, watch, autoEquipPlan, waiting, get id() { return ui.id; }, get tab() { return ui.tab; }, get placing() { return pendingTotal(); }, get playing() { return !!(ui.stage && ui.stage.dummyUntil > performance.now()); } };
})();
// Every way in (the party panel, Formation, the roster, the Bag) opens the hero screen.
App.actions.hero = (id, tab) => HeroSheet.open(id, tab);

// ── a level from outside a battle (the camp's buildings, the prototype's training): a small note. A battle's levels
// show in the results popup (js/results.js).
const LevelUp = (() => {
  function toastOf(c, g) { toast(`${c.name} reaches level ${g.to}${g.thresholds && g.thresholds.length ? ' · a threshold' : ''}`); }
  return { toast: toastOf };
})();
