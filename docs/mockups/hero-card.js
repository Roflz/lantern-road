'use strict';
// Mockup D1, second pass (play-test notes 3.12, 3.16, 3.18 and 3.21; docs/ui-rules.md): the hero card on one page,
// dressing a hero with the Bag beside the card, choosing skills, renaming, the Bag alone and the Heroes list, all
// landscape. Darkest Dungeon's character card is the reference for comfort: one big hero, plain lists on a dark
// ground, header plates, and names and explanations in tooltips (hover, or a long press on a phone).
// Every number comes from the game's models (js/hero.js, js/items.js). Nothing is saved. Styles: hero-card.html.

(() => {
  // ── the arched window: js/sheet.js's, given a height so the stats fit under it
  const INK = '#0d0911', SILL = 152, ARCH_H = 166;
  const hs = (a, b, c = 0) => { let n = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + Math.imul(c | 0, 1442695041)) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
  const archCache = {};
  // Parametrised for the card: Hh0, the arch's height in art pixels (the hero screen's is 166).
  function archArt(W, Hh0 = ARCH_H) {
    const key = W + 'x' + Hh0; if (archCache[key]) return archCache[key];
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

  const q = s => document.querySelector(s);
  const px = (src, w, hh, cls = '') => h('img', { class: 'px ' + cls, src, alt: '', width: w, height: hh, draggable: 'false' });
  const icon = (n, s, cls = '') => px(iconURL(n), s, s, cls);
  const big = (c, k) => { const o = document.createElement('canvas'); o.width = c.width * k; o.height = c.height * k; const g = o.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(c, 0, 0, o.width, o.height); return o.toDataURL(); };
  const clone = x => JSON.parse(JSON.stringify(x));
  const PENCIL = sprite(['......kk', '.....krk', '....kyk.', '...kyk..', '..kyk...', '.kwk....', '.kk.....', 'k.......'], { k: '#1a1008', y: '#f1d36a', r: '#d4484a', w: '#e8d8b8' }, 'mk:pencil');

  // the stats, with what each does (the tooltip's words: docs/first-session-spec.md's lines)
  const STATS = [
    ['hp', 'Health', 'heart', 'How much harm they take before they fall.'], ['mp', 'Mana', 'mana', 'Pays for skills. Basic attacks fill it back up.'],
    ['pow', 'Power', 'sword', 'How hard they hit, and how much they heal.'], ['def', 'Defence', 'shield', 'Takes a bite out of every hit.'],
    ['spd', 'Speed', 'boot', 'How often they act. Fast ones tire sooner.'], ['crit', 'Crit', 'star', 'The chance a hit lands extra hard.'],
    ['dodge', 'Dodge', 'feather', 'The chance a hit misses them.'],
  ];
  const RES = [['stun', 'Stun', 'stun'], ['move', 'Move', 'anchor'], ['bleed', 'Bleed', 'bleed'], ['blight', 'Blight', 'poison'], ['curse', 'Curse', 'curse'], ['debuff', 'Debuff', 'weak']];
  const SHAPES = { foe: 'one foe', front: 'the front row', back: 'the back row', random3: '3 random foes', foes: 'every foe', ally: 'one ally', allies: 'every ally', self: 'themself', fallen: 'a fallen ally' };
  const SLOT_ICON = { weapon: 'sword', armor: 'plate', accessory: 'bone' };
  const SLOT_PLURAL = { weapon: 'Weapons', armor: 'Armour', accessory: 'Accessories' };
  const SLOT_WORDS = ['Skill I', 'Skill II', 'Skill III'];
  const RANK = { relic: 0, rare: 1, fine: 2, common: 3 };
  const fmtStat = (k, v) => (k === 'spd' ? (Math.round(v * 10) / 10).toFixed(1) : k === 'crit' || k === 'dodge' ? Math.round(v) + '%' : String(Math.round(v)));
  const delta = (k, d) => { const r = k === 'spd' ? Math.round(d * 10) / 10 : Math.round(d); return r === 0 ? null : (r > 0 ? '+' : '−') + (k === 'spd' ? Math.abs(r).toFixed(1) : Math.abs(r)); };
  const fatigueWord = f => (f >= REST.SPENT ? 'Spent' : f >= REST.EXHAUSTED ? 'Exhausted' : f >= REST.WEARY ? 'Weary' : 'Rested');
  const tip = (title, body) => (body ? title + '|' + body : title);

  // ── the company, about 1-6: five heroes rolled and levelled by the game's own model
  let seed = 20261105;
  const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  let uidN = 0;
  const P = (id, lv) => ({ uid: 'm' + (++uidN), id, lv });
  function make(cls, name, level, o = {}) {
    const c = Hero.create(cls, name.toLowerCase(), { name, rng });
    if (level > 1) Hero.gainXp(c, Hero.xpBetween(1, level));
    c.xp = o.xp || 0; c.fatigue = o.fat || 0;
    if (o.weapon) c.gear.weapon = o.weapon;
    c.gear.armor = o.armor || null; c.gear.accessory = o.acc || null;
    for (const [k, n] of Object.entries(o.alloc || {})) Hero.allocate(c, k, n);
    for (const id of o.learn || []) if (!Hero.learn(c, id)) c.skills[id] = 1;
    return c;
  }
  const company = [
    make('sellsword', 'Fenn', 3, { xp: 62, fat: 12, weapon: P('hirelingsabre', 1), armor: P('sellswordsjack', 1) }),
    make('warden', 'Brannoc', 5, { xp: 140, fat: 31, armor: P('rustedplate', 2), alloc: { def: 2, hp: 2 }, learn: ['bash'] }),
    make('pilgrim', 'Morwen', 3, { xp: 30, fat: 18, armor: P('penitentsrags', 2), acc: P('prayerbeads', 1), alloc: { mp: 1, pow: 1 } }),
    make('crossbowman', 'Isolde', 2, { xp: 44, fat: 9, alloc: { spd: 1 } }),
    make('hexblade', 'Hugh', 1, { xp: 12, fat: 64 }),
  ];
  const ROW = { fenn: 'front', brannoc: 'front', morwen: 'back', isolde: 'back' }; // Hugh rests
  const bag = [
    P('notchedsword', 1), P('gravecutter', 3), P('hexedkris', 2), P('chapelcenser', 2), P('windlass', 3), P('watchmansflail', 2), P('rustyshiv', 1),
    P('travellerscoat', 2), P('brigandine', 3), P('gravediggersleathers', 2), P('huntershauberk', 3), P('gravewardensplate', 4), P('mothsilk', 4),
    P('bonecharm', 1), P('knucklebone', 2), P('haresfoot', 1), P('courierspur', 3), P('vanguardsbadge', 2), P('tallowcoin', 3), P('bloodcontract', 3),
    P('saintsmedal', 2), P('gravediggersspade', 10),
  ];
  const byUid = uid => bag.find(x => x.uid === uid);
  const bagOf = id => bag.find(x => x.id === id);

  // ── what the mockup is showing
  const S = {};
  const RESET = () => ({ view: 'card', i: 0, pending: {}, spend: false, dress: null, pick: null, sk: null, renaming: false, bag: { sort: 'fits', sel: null, for: 0 }, list: 'all', glint: null });
  const STATES = {
    card: { set: () => ({}), name: 'Hero card', cap: 'One page, no tabs: the hero and their stats on the left; gear and resistances in the middle; skills and tactics on the right. Names and explanations are in tooltips.' },
    tip: { set: () => ({}), after: () => showTip(q('[data-tut=hero-stat-pow]')), name: 'Tooltip', cap: 'Hover (or long-press on a phone) anything for its name and what it does. Here: Power.' },
    spend: { set: () => ({ spend: true, pending: { pow: 1 } }), name: 'Spend', cap: 'Spend opens the points mode: each stat takes a tap, Auto places the rest, Done keeps them. One point placed in Power, shown in green.' },
    dress: { set: () => ({ dress: { slot: 'weapon', sel: bagOf('gravecutter').uid } }), name: 'Dressing', cap: 'Tap a gear card: the Bag opens beside the hero, showing that slot. Tap a piece: the hero wears it in the arch, and the stats show what it changes in green and red before you choose Wear.' },
    skills: { set: () => ({ i: 1, pick: { slot: 0, sel: 'bash' } }), name: 'Skills', cap: 'Tap a skill slot: the skills that fit it replace Tactics. The dots and mana above show the one picked.' },
    rename: { set: () => ({ renaming: true }), name: 'Rename', cap: 'The pencil by the name.' },
    bag: { set: () => ({ view: 'bag', bag: { sort: 'fits', sel: bagOf('bloodcontract').uid, for: 0 } }), name: 'The Bag', cap: 'The Bag from the Hearth. The sorts are icons (fits, rarity, name, slot); the portraits choose whose ▲ ▼ the cards show.' },
    heroes: { set: () => ({ view: 'heroes' }), name: 'Heroes', cap: 'The Heroes list from the Hearth. Filters are icons; the badge counts points to spend.' },
  };
  function go(name) {
    const st = STATES[name] ? name : 'card';
    Object.assign(S, RESET(), STATES[st].set());
    S.state = st;
    document.querySelectorAll('.states button').forEach(b => b.classList.toggle('on', b.dataset.s === st));
    q('#cap').replaceChildren(h('b', { text: STATES[st].name }), STATES[st].cap);
    render(true);
    if (STATES[st].after) requestAnimationFrame(() => requestAnimationFrame(STATES[st].after));
  }

  const frame = q('#live');
  let toastT = 0;
  function toast(msg) {
    const old = frame.querySelector('.hc-toast'); if (old) old.remove();
    const t = h('div', { class: 'hc-toast', text: msg }); frame.append(t);
    clearTimeout(toastT); toastT = setTimeout(() => t.remove(), 1500);
  }
  function render(enter) {
    hideTip();
    frame.className = 'frame v-' + S.view + (enter ? ' hc-enter' : '');
    const edge = h('div', { class: 'hc-edge' }, ...['tl', 'tr', 'bl', 'br'].map(c => h('i', { class: 'cn ' + c })));
    frame.replaceChildren(edge, ...(S.view === 'card' ? card() : S.view === 'bag' ? bagView() : heroesView()));
  }

  // ── tooltips: hover on a computer, a long press on a phone
  let tipEl = null, pressT = 0;
  function hideTip() { if (tipEl) { tipEl.remove(); tipEl = null; } }
  function showTip(el) {
    if (!el || !el.dataset.tip) return;
    hideTip();
    const [title, body] = el.dataset.tip.split('|');
    tipEl = h('div', { class: 'hc-tipbox' }, h('b', { text: title }), body ? h('span', { text: body }) : null);
    frame.append(tipEl);
    const F = frame.getBoundingClientRect(), r = el.getBoundingClientRect(), k = F.width / 844;
    const w = tipEl.offsetWidth, hh = tipEl.offsetHeight, cx = (r.left - F.left + r.width / 2) / k;
    let top = (r.top - F.top) / k - hh - 8;
    if (top < 8) top = (r.bottom - F.top) / k + 8;
    tipEl.style.left = Math.min(844 - 16 - w, Math.max(16, cx - w / 2)) + 'px';
    tipEl.style.top = top + 'px';
  }
  frame.addEventListener('mouseover', e => { const el = e.target.closest('[data-tip]'); if (el) showTip(el); });
  frame.addEventListener('mouseout', e => { const el = e.target.closest('[data-tip]'); if (el && !el.contains(e.relatedTarget)) hideTip(); });
  frame.addEventListener('touchstart', e => { const el = e.target.closest('[data-tip]'); clearTimeout(pressT); if (el) pressT = setTimeout(() => showTip(el), 450); }, { passive: true });
  frame.addEventListener('touchend', () => { clearTimeout(pressT); setTimeout(hideTip, 1400); });

  // ── small parts
  const ib = (ic, label, fn, o = {}) => h('button', { class: 'hc-ib' + (o.on ? ' on' : '') + (o.cls ? ' ' + o.cls : ''), 'data-tip': label, 'aria-label': label.split('|')[0], 'data-tut': o.tut || null, onclick: e => { e.stopPropagation(); fn(); } },
    typeof ic === 'string' && ic.length > 1 ? icon(ic, 16) : ic, o.badge ? h('em', { class: 'hc-badge', text: String(o.badge) }) : null);
  const btn = (label, fn, o = {}) => h('button', { class: 'hc-btn' + (o.sec ? ' sec' : '') + (o.cls ? ' ' + o.cls : ''), 'data-tut': o.tut || null, 'data-tip': o.tip || null, disabled: o.off, onclick: e => { e.stopPropagation(); fn(); } }, label, o.badge ? h('em', { class: 'hc-badge', text: String(o.badge) }) : null);
  // a section: a header plate with its title, an action at its right end, and its contents on the ground
  const sect = (title, tut, act, body, cls = '') => h('section', { class: 'hc-sect hc-in ' + cls }, h('div', { class: 'hc-plate', 'data-tut': tut || null }, h('h4', { text: title }), act ? h('div', { class: 'r' }, act) : null), body);
  // what a piece gives, in a tooltip
  function pieceTip(x) {
    const D = Items.def(x), st = Items.stats(x), B = Items.bands(x, {});
    const nums = STAT_ORDER.filter(k => st[k]).map(k => `${st[k] > 0 ? '+' : '−'}${fmtStat(k, Math.abs(st[k]))} ${GEAR_STAT_NAMES[k]}`);
    return tip(D.name, [...nums, ...B.good.filter(l => !l.stat).map(l => l.text), ...B.when.map(l => `${l.tag}: ${l.text}`), ...B.bad.filter(l => !l.stat).map(l => l.text)].join(' · '));
  }
  // A piece as a tall card in its rarity's frame. o: { c (to mark ▲ ▼ against), sel, onclick, tut, size }
  function tallCard(x, o = {}) {
    if (!x) return h('button', { class: 'hc-card empty ' + (o.size || ''), 'data-tut': o.tut || null, 'data-tip': o.tip || null, onclick: o.onclick, 'aria-label': 'Empty' }, o.slot ? icon(SLOT_ICON[o.slot], 16, 'ghost') : null);
    const D = Items.def(x), c = o.c, can = !c || Items.canUse(c, x);
    let mark = null;
    if (c && can) { const now = c.gear[D.slot], d = Items.score(x) - (now ? Items.score(now) : 0); mark = !now || d > 0.5 ? h('span', { class: 'mk up', text: '▲' }) : d < -0.5 ? h('span', { class: 'mk dn', text: '▼' }) : null; }
    const s = o.size === 'lg' ? 48 : o.size === 'sm' ? 30 : 40;
    return h('button', { class: `hc-card r-${D.rarity} ${o.size || ''}${o.sel ? ' sel' : ''}${can ? '' : ' no'}${o.glint ? ' glint' : ''}${o.trying ? ' trying' : ''}`, 'data-tut': o.tut || null, 'data-uid': x.uid, 'data-tip': o.noTip ? null : pieceTip(x), 'aria-label': D.name, onclick: o.onclick },
      px(gearIconURL(x.id), s, s), h('span', { class: 'lv', text: String(x.lv) }), mark);
  }
  // a piece's lines for its card: plain stats as icon and number (green or red against what's worn), then effects
  function pieceLines(x, worn) {
    const st = Items.stats(x), was = worn ? Items.stats(worn) : {}, B = Items.bands(x, {});
    const keys = STAT_ORDER.filter(k => st[k] || was[k]);
    return [
      h('div', { class: 'hc-pstats' }, ...keys.map(k => { const d = (st[k] || 0) - (was[k] || 0), dt = worn ? delta(k, d) : null; return h('span', { 'data-tip': GEAR_STAT_NAMES[k] }, icon(GEAR_STAT_ICONS[k], 12), h('b', { text: (st[k] < 0 ? '−' : '') + fmtStat(k, Math.abs(st[k] || 0)) }), dt ? h('em', { class: d > 0 ? 'g' : 'b', text: dt }) : null); })),
      ...B.good.filter(l => !l.stat).map(l => h('p', { class: 'hc-fx' }, icon(l.icon || 'star', 12), l.text)),
      ...B.when.map(l => h('p', { class: 'hc-fx' }, icon(l.icon || 'star', 12), `${l.tag}: ${l.text}`)),
      ...B.bad.filter(l => !l.stat).map(l => h('p', { class: 'hc-fx' }, icon(l.icon || 'star', 12), l.text)),
    ];
  }
  const whoFor = x => { const u = Items.usersOf(x); return u.length > 1 ? 'Any class' : `${CLASSES[u[0]].name}s`; };

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
    const el = h('div', { class: 'hc-form' });
    for (const row of ['front', 'back']) {
      const on = lit === 'all' || lit === row, pts = POS[kind][row];
      if (on && many) el.append(h('b', { class: cls, style: `left:${pts[0][0] + 3}px;top:${pts[0][1] + 3}px;height:${pts[pts.length - 1][1] - pts[0][1]}px` }));
      pts.forEach(([x, y], i) => el.append(h('i', { class: (on || (self === row && i === 0) ? 'on ' + cls : ''), style: `left:${x}px;top:${y}px` })));
    }
    if (many && lit === 'all') el.append(h('b', { class: cls + ' across', style: 'left:3px;top:18px;width:16px' }));
    return el;
  }
  function dots(sk, row) {
    const r = reachOf(sk), from = r.stand === 'front' ? 'the front row' : 'any row';
    const hits = sk.shape === 'foe' && r.hit === 'front' ? 'one foe in the front row' : SHAPES[sk.shape];
    return h('div', { class: 'hc-dots', 'data-tip': tip('Where it’s used', `From ${from}. Hits ${hits}.`) },
      form('hero', r.stand, 'st'),
      r.side === 'foe' ? form('foe', r.hit, 'hit', r.many) : r.side === 'ally' ? form('hero', 'all', 'ally', r.many) : form('hero', null, 'ally', false, row));
  }

  // ── the hero card
  const pendingTotal = () => Object.values(S.pending).reduce((a, b) => a + b, 0);
  function preview(c) { const p = clone(c); for (const k in S.pending) Hero.allocate(p, k, S.pending[k]); return p; }
  function tryOn(c) { if (!S.dress || !S.dress.sel) return null; const p = clone(c); p.gear[S.dress.slot] = clone(byUid(S.dress.sel)); return p; }
  function addPending(k) { const c = company[S.i]; if (Hero.points(c).stat - pendingTotal() > 0 && Hero.allocate(preview(c), k, 1)) { S.pending[k] = (S.pending[k] || 0) + 1; render(); } }
  function wear() {
    const c = company[S.i], x = byUid(S.dress.sel), k = S.dress.slot, was = c.gear[k];
    bag.splice(bag.indexOf(x), 1); if (was) bag.push(was);
    c.gear[k] = x; S.dress = { slot: k, sel: null }; S.glint = k;
    render(); toast(`${Items.def(x).name} worn`);
    setTimeout(() => { S.glint = null; }, 900);
  }
  const better = (c, k2) => bag.some(x => Items.def(x).slot === k2 && Items.canUse(c, x) && Items.score(x) > (c.gear[k2] ? Items.score(c.gear[k2]) : -1) + 0.5);
  function autoEquip(c) {
    for (const k2 of SLOTS) {
      const best = bag.filter(x => Items.def(x).slot === k2 && Items.canUse(c, x)).sort((a, b) => Items.score(b) - Items.score(a))[0];
      if (best && Items.score(best) > (c.gear[k2] ? Items.score(c.gear[k2]) : -1) + 0.5) { bag.splice(bag.indexOf(best), 1); if (c.gear[k2]) bag.push(c.gear[k2]); c.gear[k2] = best; S.glint = k2; }
    }
    render(); toast('Best gear worn'); setTimeout(() => { S.glint = null; }, 900);
  }

  function card() {
    const c = company[S.i], C = CLASSES[c.cls], tried = tryOn(c), pre = preview(tried || c);
    const base = Hero.sheet(c), now = Hero.sheet(pre), pts = Hero.points(c).stat, left = pts - pendingTotal(), row = ROW[c.id] || 'back';
    const step = d => () => { Object.assign(S, RESET(), { i: (S.i + d + company.length) % company.length }); render(true); };
    const out = [];

    // ── left: the hero. The name and class; the arch with the level; the stats under it.
    out.push(h('button', { class: 'hc-back hc-ib', 'aria-label': 'Back', 'data-tip': 'Back', 'data-tut': 'hero-back', onclick: () => go('heroes') }, '‹'));
    if (S.renaming) {
      const inp = h('input', { class: 'hc-ren', value: c.name, maxlength: '12', 'aria-label': 'Name', 'data-tut': 'hero-name' });
      const ok = () => { const v = inp.value.trim(); if (v) c.name = v.slice(0, 12); S.renaming = false; render(); };
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') ok(); if (e.key === 'Escape') { S.renaming = false; render(); } });
      out.push(h('div', { class: 'hc-name ren' }, inp, h('button', { class: 'hc-ib ok', 'aria-label': 'Keep the name', 'data-tip': 'Keep', onclick: ok }, '✓'), h('button', { class: 'hc-ib', 'aria-label': 'Cancel', 'data-tip': 'Cancel', onclick: () => { S.renaming = false; render(); } }, '✕')));
      setTimeout(() => { inp.focus(); inp.select(); }, 0);
    } else {
      out.push(h('div', { class: 'hc-name hc-in' }, h('b', { text: c.name }), h('button', { class: 'hc-pen', 'aria-label': 'Rename', 'data-tip': 'Rename', 'data-tut': 'hero-rename', onclick: () => { S.renaming = true; render(); } }, px(big(PENCIL, 2), 16, 16))),
        h('span', { class: 'hc-class hc-in', 'data-tip': tip(C.name, `${C.role}. ${row === 'front' ? 'Front' : 'Back'} row.`) }, C.name));
    }
    // the hero arrows, or Done while spending points
    if (!S.renaming) out.push(S.spend ? h('div', { class: 'hc-heronav' }, btn('Done', () => { for (const k2 in S.pending) Hero.allocate(c, k2, S.pending[k2]); S.pending = {}; S.spend = false; render(); }, { tut: 'hero-keep' }))
      : h('div', { class: 'hc-heronav hc-in' }, ib(h('span', { class: 'gl', text: '◂' }), 'Previous hero', step(-1)), ib(h('span', { class: 'gl', text: '▸' }), 'Next hero', step(1), { tut: 'hero-next' })));
    // the arch: the hero full length, in what they wear or are trying on; the level and XP on the banner; fatigue
    const A = archArt(110, 105), hs2 = heroSide(c.cls, 0, Items.look(tried || c)), k = 8, xpN = Hero.xpToNext(c.level);
    out.push(h('div', { class: 'hc-arch hc-in', style: '--d:40ms' },
      px(A.url, A.w, A.h, 'win'), h('i', { class: 'hc-glow', style: `left:${A.lx - 10}px;top:${A.ly - 10}px` }),
      px(big(hs2, k), hs2.width * k, hs2.height * k, 'hero' + (tried ? ' trying' : '')),
      h('div', { class: 'hc-lvb', 'data-tip': tip(`Level ${c.level}`, `${c.xp} / ${xpN} XP`) }, h('b', { text: String(c.level) }), h('i', {}, h('u', { style: `width:${Math.round(100 * c.xp / xpN)}%` }))),
      h('div', { class: 'hc-fat', 'data-tip': tip(fatigueWord(c.fatigue), `Fatigue ${Math.floor(c.fatigue)}%`) }, icon('fatigue', 12), h('i', {}, h('u', { style: `width:${Math.min(100, c.fatigue)}%` })))));
    // the stats: icon and number, two rows; the eighth place is Spend (or Auto, or what a tried piece adds)
    const statCell = ([key, label, ic, what]) => {
      const d = now[key] - base[key], dt = delta(key, d);
      return h(S.spend ? 'button' : 'div', { class: 'hc-st' + (S.spend ? ' pick' : '') + (dt ? (d > 0 ? ' up' : ' dn') : ''), 'data-tut': 'hero-stat-' + key, 'data-tip': tip(label, what), 'aria-label': label, onclick: S.spend ? () => addPending(key) : null },
        icon(ic, 16), h('b', { text: fmtStat(key, now[key]) }), dt && !S.spend ? h('em', { text: dt }) : null, S.spend ? h('i', { class: 'plus', text: '+' }) : null);
    };
    let eighth = h('span', { class: 'hc-st none' });
    if (S.spend) eighth = btn('Auto', () => { const plan = Hero.autoPoints(preview(c), left) || {}; for (const k2 of Object.keys(plan)) if (STAT_KEYS.includes(k2) && plan[k2]) S.pending[k2] = (S.pending[k2] || 0) + plan[k2]; render(); }, { sec: true, tut: 'hero-auto', off: left <= 0, badge: left > 0 ? left : null, tip: 'Auto|Places the rest as the class likes' });
    else if (tried) {
      const fx = x => (x ? Items.def(x).lines.length : 0), gain = fx(tried.gear[S.dress.slot]), lose = fx(c.gear[S.dress.slot]);
      const B = x => (x ? Items.bands(x, {}) : { good: [], when: [], bad: [] }), txt = x => { const b = B(x); return [...b.good.filter(l => !l.stat).map(l => l.text), ...b.when.map(l => `${l.tag}: ${l.text}`), ...b.bad.filter(l => !l.stat).map(l => l.text)].join(' · '); };
      const words = [gain ? `Gains: ${txt(tried.gear[S.dress.slot])}` : '', lose ? `Loses: ${txt(c.gear[S.dress.slot])}` : ''].filter(Boolean).join('. ');
      eighth = gain || lose ? h('span', { class: 'hc-chip', 'data-tip': tip('Effects', words) }, icon('star', 12), gain ? h('b', { class: 'g', text: '+' + gain }) : null, lose ? h('b', { class: 'b', text: '−' + lose }) : null) : h('span', { class: 'hc-st none' });
    } else if (pts > 0) eighth = btn('Spend', () => { S.spend = true; S.dress = null; S.pick = null; render(); }, { tut: 'hero-points', badge: pts, tip: tip(`${pts} points`, 'Each level brings a point') });
    out.push(h('div', { class: 'hc-stats hc-in', style: '--d:80ms', 'data-tut': 'hero-stats' }, ...STATS.map(statCell), eighth));

    // ── the middle: gear (three tall cards) and resistances
    const slotCard = k2 => {
      const x = (tried || c).gear[k2], sel = !!(S.dress && S.dress.slot === k2);
      return h('div', { class: 'hc-gs' }, tallCard(x, { size: 'lg', slot: k2, tut: 'hero-slot-' + k2, sel, trying: sel && !!S.dress.sel, glint: S.glint === k2, tip: tip(SLOT_NAMES[k2], 'Empty'),
        onclick: () => { S.dress = sel && !S.dress.sel ? null : { slot: k2, sel: null }; S.pick = null; S.spend = false; S.pending = {}; render(); } }),
    );
    };
    const anyBetter = SLOTS.some(k2 => better(c, k2));
    const gearS = sect('Gear', 'hero-tab-gear', anyBetter && !S.dress ? ib('gear', 'Best gear|Wears the best that fits', () => autoEquip(c), { tut: 'hero-autoequip' }) : null, h('div', { class: 'hc-gear' }, ...SLOTS.map(slotCard)), 'mid g1');
    const resS = sect('Resistances', 'hero-stat-res', null, h('div', { class: 'hc-res' }, ...RES.map(([key, label, ic]) =>
      h('div', { class: 'hc-rs', 'data-tut': 'hero-stat-res-' + key, 'data-tip': tip(label, `The chance to shrug off ${label.toLowerCase()}`) }, icon(ic, 16), h('b', { text: Math.round(now.res[key]) + '%' })))), 'mid g2');
    if (!S.dress) out.push(gearS, resS);

    // ── the right: skills and tactics; while dressing, the Bag covers the middle's lower half and the right
    if (S.dress) out.push(dressPanel(c, row));
    else out.push(skillsS(c, C, row), S.pick ? pickS(c, C) : tacticsS(c, C));
    return out;
  }

  function skillsS(c, C, row) {
    Hero.fixEquip(c);
    const picked = S.pick ? S.pick.sel : S.sk || c.equip[0] || C.basic, sk = SKILLS[picked], lv = c.skills[sk.id] || 1;
    const tile = (id, o = {}) => {
      const s = id && SKILLS[id];
      return h('button', { class: 'hc-tile' + (o.on ? ' on' : '') + (o.lock ? ' lock' : '') + (o.dim ? ' dim' : ''), 'data-tut': o.tut || null, 'data-tip': o.tip || (s ? tip(s.name, `${s.cost ? s.cost + ' mana. ' : ''}${skillText(s, c.skills[id] || 1)}`) : null), 'aria-label': s ? s.name : 'Locked', onclick: o.onclick },
        o.lock ? icon('lock', 14) : icon(s.icon || 'sword', 20));
    };
    const sp = Hero.points(c).skill;
    const learnable = Object.values(SKILLS).filter(s => s.cls === c.cls && s.tier === 1 && s.id !== C.starter);
    return sect('Skills', 'hero-tab-skills', ib('book', 'Skill tree', () => toast('The skill tree opens here'), { badge: sp > 0 ? sp : null }),
      h('div', { class: 'hc-skills', 'data-tut': 'hero-skills' },
        h('div', { class: 'hc-skrow' }, dots(sk, row), h('div', { class: 'hc-skname', 'data-tip': tip(sk.name, skillText(sk, lv)) }, h('b', { text: sk.name }), sk.cost ? h('span', { 'data-tip': 'Mana' }, icon('mana', 12), String(sk.cost)) : null)),
        h('div', { class: 'hc-tiles' },
          tile(C.basic, { on: picked === C.basic && !S.pick, onclick: () => { S.sk = C.basic; S.pick = null; render(); } }),
          ...c.equip.map((id, i) => tile(id, { on: (S.pick && S.pick.slot === i) || (!S.pick && picked === id), tut: 'hero-skill-slot', onclick: () => { S.pick = S.pick ? null : { slot: i, sel: id }; S.sk = id; render(); } })),
          tile(null, { lock: true, tip: tip('Skill II', 'Opens at level 50') }),
          h('i', { class: 'hc-gap' }),
          ...learnable.map(s => tile(s.id, { dim: !c.skills[s.id], tip: tip(s.name, c.skills[s.id] ? `Learned. ${skillText(s, 1)}` : `Learn at level 5. ${skillText(s, 1)}`), onclick: () => { S.sk = s.id; S.pick = null; render(); } })))), 'right r1');
  }
  function tacticsS(c, C) {
    const rules = c.rules || C.rules, n = Hero.ruleSlots(c);
    const line = (cond, id, cls = '') => { const s = SKILLS[id] || {}; return h('div', { class: 'hc-rule ' + cls }, h('span', { class: 'if', text: cond }), h('span', { class: 'do' }, icon(s.icon || 'sword', 16), h('b', { text: s.name || id }))); };
    return sect('Tactics', 'hero-tab-rules', ib('scroll', 'Edit tactics', () => toast('Tactics opens here')),
      h('div', { class: 'hc-rules', 'data-tut': 'hero-rules', 'data-tip': tip(`${Math.min(rules.length, n)} of ${n} tactics`, 'Checked from the top each turn') }, ...rules.slice(0, n).map(r => line(ruleCond(r), r.do)), line('Otherwise', C.basic, 'oth')), 'right r2');
  }
  // Choosing what goes in a skill slot: every learned active; the one in the slot marked; the one picked shown above
  function pickS(c, C) {
    const cur = c.equip[S.pick.slot], list = Hero.actives(c), s = SKILLS[S.pick.sel], swap = S.pick.sel !== cur;
    const rowEl = id => { const k2 = SKILLS[id]; return h('button', { class: 'hc-known' + (id === S.pick.sel ? ' sel' : ''), 'data-tip': tip(k2.name, skillText(k2, c.skills[id] || 1)), onclick: () => { S.pick.sel = id; render(); } },
      icon(k2.icon || 'sword', 16), h('b', { text: k2.name }), id === cur ? h('span', { class: 'in', 'data-tip': 'In the slot', text: '✓' }) : h('span'), h('span', { class: 'mp' }, icon('mana', 12), String(k2.cost || 0))); };
    return sect(SLOT_WORDS[S.pick.slot], null, ib(h('span', { class: 'gl', text: '✕' }), 'Close', () => { S.pick = null; render(); }),
      h('div', { class: 'hc-pick' }, ...list.map(rowEl), h('div', { class: 'hc-row' }, btn('Use', () => { Hero.equip(c, S.pick.slot, S.pick.sel); S.sk = S.pick.sel; S.pick = null; render(); toast(`${s.name} in ${SLOT_WORDS[0]}`); }, { off: !swap }))), 'right r2');
  }

  // ── dressing: the Bag beside the hero, showing one slot
  function dressPanel(c, row) {
    const k2 = S.dress.slot, list = bag.filter(x => Items.def(x).slot === k2).sort((a, b) => (Items.canUse(c, b) - Items.canUse(c, a)) || Items.score(b) - Items.score(a));
    const sel = S.dress.sel && byUid(S.dress.sel), worn = c.gear[k2];
    const tabs = h('div', { class: 'l' }, ...SLOTS.map(s => ib(SLOT_ICON[s], SLOT_PLURAL[s], () => { S.dress = { slot: s, sel: null }; render(); }, { on: s === k2 })));
    const grid = h('div', { class: 'hc-grid4' }, ...list.map(x => tallCard(x, { c, sel: sel === x, tut: 'gear-pick', onclick: () => { S.dress.sel = S.dress.sel === x.uid ? null : x.uid; render(); } })));
    let side;
    const x = sel || worn;
    if (x) {
      const D = Items.def(x), can = Items.canUse(c, x);
      side = h('div', { class: 'hc-pcard' },
        h('b', { class: 'nm', text: D.name }), h('span', { class: 'kind', text: `${RARITY_NAMES[D.rarity]} · ${whoFor(x)}` }),
        ...pieceLines(x, sel ? worn : null),
        h('div', { class: 'hc-row end' }, sel ? (can ? btn('Wear', wear, { tut: 'gear-wear' }) : h('span', { class: 'no', 'data-tip': Items.whyNot(c, x), text: 'Can’t use' })) : h('span', { class: 'worn', text: 'Worn' })));
    } else side = h('div', { class: 'hc-pcard' });
    return h('div', { class: 'hc-dress hc-in' }, ...['tl', 'tr', 'bl', 'br'].map(cn => h('i', { class: 'cn ' + cn })),
      h('div', { class: 'hc-plate' }, tabs, h('h4', { text: SLOT_PLURAL[k2] }), h('div', { class: 'r' }, ib(h('span', { class: 'gl', text: '✓' }), 'Done', () => { S.dress = null; render(); }))),
      h('div', { class: 'hc-dbody' }, grid, side));
  }

  // ── the Bag alone, from the Hearth
  function sortBag(list, c) {
    const fit = x => (c && Items.canUse(c, x) ? 0 : 1);
    const by = {
      fits: (a, b) => fit(a) - fit(b) || Items.score(b) - Items.score(a),
      rarity: (a, b) => RANK[Items.rarity(a)] - RANK[Items.rarity(b)] || b.lv - a.lv,
      name: (a, b) => Items.def(a).name.localeCompare(Items.def(b).name),
      slot: (a, b) => SLOTS.indexOf(Items.def(a).slot) - SLOTS.indexOf(Items.def(b).slot) || RANK[Items.rarity(a)] - RANK[Items.rarity(b)],
    }[S.bag.sort];
    return list.slice().sort(by);
  }
  function bagView() {
    const c = company[S.bag.for], list = sortBag(bag, c), sel = S.bag.sel && byUid(S.bag.sel);
    const sortB = (k2, label, ic) => ib(ic, `Sort by ${label}`, () => { S.bag.sort = k2; render(); }, { on: S.bag.sort === k2 });
    const out = [
      h('button', { class: 'hc-back hc-ib', 'aria-label': 'Back', 'data-tip': 'Back', onclick: () => go('heroes') }, '‹'),
      h('div', { class: 'hc-title hc-in' }, h('b', { text: 'The Bag' }), h('span', { 'data-tip': tip(`${bag.length} of ${ITEM.BAG} places`, 'Gear that’s worn doesn’t count') }, `${bag.length} / ${ITEM.BAG}`)),
      h('div', { class: 'hc-sorts hc-in' }, sortB('fits', `what fits ${c.name}`, px(portraitURL(c.cls, true, Items.look(c)), 16, 16)), sortB('rarity', 'rarity', 'star'), sortB('name', 'name', 'book'), sortB('slot', 'slot', 'helm')),
      h('div', { class: 'hc-grid7 hc-in', style: '--d:40ms' }, ...list.map(x => tallCard(x, { c, size: 'md', sel: sel === x, onclick: () => { S.bag.sel = S.bag.sel === x.uid ? null : x.uid; render(); } }))),
    ];
    // the card of the piece picked, as Darkest Dungeon's: its name, who can use it, its rarity, its lines
    let side;
    if (sel) {
      const D = Items.def(sel), can = Items.canUse(c, sel), price = Math.round(ITEM.SELL[D.rarity] * (1 + sel.lv / 5));
      side = h('div', { class: 'hc-pcard c hc-in', style: '--d:80ms' },
        h('b', { class: 'nm', text: D.name }), h('span', { class: 'kind', text: `${RARITY_NAMES[D.rarity]} · ${whoFor(sel)}` }),
        ...pieceLines(sel, null),
        D.flavor ? h('p', { class: 'fl', text: D.flavor }) : null,
        h('div', { class: 'hc-row c' }, can ? btn(`Give to ${c.name}`, () => { Object.assign(S, RESET(), { view: 'card', i: S.bag.for, dress: { slot: D.slot, sel: sel.uid } }); render(true); }) : h('span', { class: 'no', 'data-tip': Items.whyNot(c, sel), text: 'Can’t use' }),
          D.rarity === 'relic' ? null : ib('coin', tip(`Sell for ${price} gold`), () => { bag.splice(bag.indexOf(sel), 1); S.bag.sel = null; render(); toast(`Sold for ${price} gold`); })));
    } else side = h('div', { class: 'hc-pcard c' });
    out.push(side, h('div', { class: 'hc-for hc-in', style: '--d:120ms' }, ...company.map((x, i) => h('button', { class: 'hc-face' + (S.bag.for === i ? ' on' : ''), 'data-tip': tip(x.name, 'Compare with'), onclick: () => { S.bag.for = i; render(); } }, px(portraitURL(x.cls, true, Items.look(x)), 24, 24)))));
    return out;
  }

  // ── the Heroes list, from the Hearth
  function heroesView() {
    const show = company.filter(c => S.list === 'all' || (S.list === 'party' ? ROW[c.id] : !ROW[c.id]));
    const pill = (k2, label, ic) => ib(ic, label, () => { S.list = k2; render(); }, { on: S.list === k2 });
    const out = [
      h('button', { class: 'hc-back hc-ib', 'aria-label': 'Back to the Hearth', 'data-tip': 'Back', onclick: () => toast('Back to the Hearth') }, '‹'),
      h('div', { class: 'hc-title hc-in' }, h('b', { text: 'Heroes' }), h('span', { 'data-tip': tip(`${company.length} of 6 places`, 'The Barracks makes room for more') }, `${company.length} / 6`)),
      h('div', { class: 'hc-sorts hc-in' }, pill('all', 'Everyone', 'helm'), pill('party', 'In the party', 'shield'), pill('rest', 'Resting', 'fatigue'), h('i', { class: 'hc-gap' }), ib('bag', 'The Bag', () => go('bag'))),
    ];
    const cardOf = (c, n) => {
      const C = CLASSES[c.cls], xpN = Hero.xpToNext(c.level), pts = Hero.points(c).stat, hs2 = heroSide(c.cls, 0, Items.look(c)), row = ROW[c.id];
      return h('button', { class: 'hc-hero hc-in' + (row ? '' : ' rest'), style: `--d:${40 + n * 40}ms`, 'aria-label': c.name, onclick: () => { Object.assign(S, RESET(), { i: company.indexOf(c) }); render(true); } },
        h('span', { class: 'niche' }, px(big(hs2, 4), hs2.width * 4, hs2.height * 4, 'hero'), h('span', { class: 'rowic', 'data-tip': row ? (row === 'front' ? 'Front row' : 'Back row') : 'Resting' }, icon(row ? (row === 'front' ? 'shield' : 'arrow') : 'fatigue', 12))),
        h('span', { class: 'inf' },
          h('b', { class: 'nm', text: c.name }), h('span', { class: 'cl', text: C.name }),
          h('span', { class: 'meta' },
            h('span', { class: 'hc-lvb sm', 'data-tip': tip(`Level ${c.level}`, `${c.xp} / ${xpN} XP`) }, h('b', { text: String(c.level) }), h('i', {}, h('u', { style: `width:${Math.round(100 * c.xp / xpN)}%` }))),
            h('span', { class: 'hc-fat', 'data-tip': tip(fatigueWord(c.fatigue), `Fatigue ${Math.floor(c.fatigue)}%`) }, icon('fatigue', 12), h('i', {}, h('u', { style: `width:${Math.min(100, c.fatigue)}%` }))))),
        pts > 0 ? h('em', { class: 'hc-badge', 'data-tip': tip(`${pts} points`, 'To spend on the hero card') , text: String(pts) }) : null);
    };
    const cards = show.map(cardOf);
    if (S.list !== 'rest') cards.push(h('button', { class: 'hc-hero empty hc-in', style: `--d:${40 + cards.length * 40}ms`, 'data-tip': tip('1 place free', 'Hire at the Recruit Board'), 'aria-label': 'Hire at the Recruit Board', onclick: () => toast('The Recruit Board opens here') }, h('i', { class: 'hc-cross' })));
    out.push(h('div', { class: 'hc-heroes' }, ...cards));
    return out;
  }

  // ── the page: the state buttons and the phone frame, scaled to fit (1:1 with ?shot, for screenshots)
  const shot = /[?&]shot\b/.test(location.search);
  if (shot) document.body.classList.add('shot');
  const fit = () => document.querySelectorAll('.fw').forEach(w => { w.firstElementChild.style.transform = shot ? 'none' : `scale(${w.clientWidth / 860})`; });
  addEventListener('resize', fit); fit();
  q('.states').append(...Object.entries(STATES).map(([k2, st]) => h('button', { 'data-s': k2, onclick: () => { history.replaceState(null, '', '#' + k2); go(k2); } }, st.name)));
  addEventListener('hashchange', () => go(location.hash.slice(1)));
  go(location.hash.slice(1) || 'card');
})();
