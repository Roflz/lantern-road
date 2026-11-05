'use strict';
// Lantern Road · the battle screen.
// It plays a battle's event log (js/sim.js) on a small pixel canvas lit by lanterns. Health bars, damage numbers,
// rule callouts and the turn strip are page elements laid over the canvas, so their text stays crisp.
// Every animation runs on one play clock that speed changes scale and Pause stops.

const Battle = (() => {
  const frame = $('#frame'), cv = $('#world'), ctx = cv.getContext('2d');
  const mask = document.createElement('canvas'), mctx = mask.getContext('2d');
  const platesEl = $('#plates'), numsEl = $('#nums'), flagsEl = $('#flags'), hudEl = $('#hud');

  // ── scene
  const S = { mode: 'camp', W: 120, H: 260, scale: 3, ox: 0, oy: 0, region: 0, dist: 0, walkUntil: 0, units: {}, list: [], fx: [], parts: [], amb: [], active: null, flash: null };
  // A battle is drawn side-on, across the whole landscape frame. The camp scene, behind the screens still in the
  // frame's portrait column (js/frame.js), looks up the road from behind the party.
  const sideOn = () => S.mode === 'battle';
  const P = { t: 0, speed: 1, paused: false };   // the play clock, in milliseconds at 1×
  // 1× plays at half the pace of the first prototype: the play clock runs at half real time, times the speed.
  const TEMPO = 0.5;
  const FLAG_N = 7, FLAG_W = 56;                // upcoming turn flags shown, and the width of their column (CSS px)
  let B = null;                                 // the battle being shown
  let last = 0, realT = 0;

  // ── layout: logical pixels, scaled by a whole number so the pixel art stays crisp. #frame is in the landscape frame's
  // design pixels (js/frame.js): the whole stage in battle, 390 tall, which makes the art 3×.
  function resize() {
    const fw = frame.clientWidth || Frame.W, fh = frame.clientHeight || Frame.H;
    S.scale = Math.max(2, Math.floor(fh / 118));
    S.W = Math.floor(fw / S.scale); S.H = Math.floor(fh / S.scale);
    cv.width = S.W; cv.height = S.H; mask.width = S.W; mask.height = S.H;
    cv.style.width = S.W * S.scale + 'px'; cv.style.height = S.H * S.scale + 'px';
    S.ox = Math.floor((fw - S.W * S.scale) / 2); S.oy = 0;
    cv.style.left = S.ox + 'px';
    ctx.imageSmoothingEnabled = false;
    S.rows = [Math.round(S.H * 0.645), Math.round(S.H * 0.775), Math.round(S.H * 0.39), Math.round(S.H * 0.272)]; // hero front, hero back, foe front, foe back
    for (const u of S.list) { place(u); u.x = u.bx; u.y = u.by; }
    layoutPlates();
  }
  const COL = [-18, 18, -45, -15, 15, 45];
  // Where the formation stands. In battle it moves right, leaving the left edge to the turn flags.
  function field() {
    if (S.mode === 'camp') return { cx: S.W / 2, k: Math.min(1, S.W / 118) };
    const gutter = Math.ceil(FLAG_W / S.scale), half = (S.W - gutter) / 2;
    return { cx: gutter + half, k: Math.min(1, (half - 9) / 45) };
  }
  function place(u) {
    if (sideOn()) {
      const first = Math.ceil(56 / S.scale) + 21, last = S.H - 10, sp = (last - first) / 3, i = u.slot - 2;
      let x = u.slot >= 2 ? S.W * 0.12 + (i % 2 ? 7 : -5) : S.W * 0.29;
      const y = u.slot >= 2 ? first + i * sp : lerp(first, last, u.slot ? 0.76 : 0.3);
      if (u.side) x = S.W - x;
      u.bx = Math.round(x); u.by = Math.round(y);
      return;
    }
    const g = field();
    u.bx = Math.round(g.cx + COL[u.slot] * g.k);
    u.by = u.side ? (u.slot < 2 ? S.rows[2] : S.rows[3]) : (u.slot < 2 ? S.rows[0] : S.rows[1]);
    if (S.mode === 'camp' && u.hero) u.by = u.slot < 2 ? Math.round(S.H * 0.868) : Math.round(S.H * 0.967);
  }
  const css = (x, y) => [S.ox + x * S.scale, S.oy + y * S.scale];
  // Heroes are drawn in their gear (js/art.js, heroCanvas); thralls from the side, facing the foes.
  const sprOf = u => (u.thrall ? (sideOn() ? thrallSide(u.key) : foeSprite(u.art || 'bones')) : u.hero ? (sideOn() ? heroSide(u.key, u.step || 0, u.look) : heroSprite(u.key, u.step || 0, u.look)) : foeSprite(u.key));
  const lampOf = u => (u.thrall || !u.hero ? null : sprOf(u).lamp);
  const faceOf = u => (u.thrall ? portraitURL('thrall:' + u.key, false) : portraitURL(u.key, u.side === 0, u.look));
  // The body's size, without a raised weapon: where numbers float and projectiles land.
  const sizeOf = u => { const s = sprOf(u), k = u.boss ? 2 : 1; return [(s.bw || s.width) * k, (s.bh || s.height) * k]; };
  const leftOf = (u, s) => u.x - (s.ax != null ? s.ax : s.width / 2) * (u.boss ? 2 : 1);
  const headY = u => u.y - sizeOf(u)[1];
  const midOf = u => [u.x, u.y - sizeOf(u)[1] * 0.55];

  // ── units on screen
  function makeView(s) {
    const u = Object.assign({}, s, { hero: s.side === 0, st: Object.assign({}, s.st), alpha: 1, anim: null, flashUntil: 0, fade: null, gone: false, step: 0, phase: s.slot * 0.37 + s.side * 1.1 });
    place(u); u.x = u.bx; u.y = u.by;
    u.plate = h('div', { class: 'plate ' + (u.hero ? 'hero' : 'foe') + (u.boss ? ' boss' : '') + (u.elite ? ' elite' : '') + (u.thrall ? ' thrall' : '') },
      h('div', { class: 'bar hp' }, u.lagEl = h('i', { class: 'lag' }), u.hpEl = h('i', { class: 'fill' })),
      u.maxMp ? h('div', { class: 'bar mp' }, u.mpEl = h('i', { class: 'fill' })) : null,
      u.stEl = h('div', { class: 'sts' }));
    u.plate.addEventListener('click', () => (aim ? aimAt(u) : showUnitTip(u)));
    platesEl.append(u.plate);
    syncPlate(u, true);
    return u;
  }
  function setUnits(snaps) {
    platesEl.replaceChildren(); numsEl.replaceChildren();
    S.units = {}; S.list = [];
    for (const s of snaps) { const u = makeView(s); S.units[u.id] = u; S.list.push(u); }
    layoutPlates();
  }
  function layoutPlates() {
    for (const u of S.list) {
      const [x, y] = css(u.bx, u.by + 2);
      u.plate.style.left = x + 'px'; u.plate.style.top = y + 'px';
      u.plate.style.width = (u.boss ? 28 : 18) * S.scale + 'px';
    }
  }
  function syncPlate(u, instant) {
    const p = Math.max(0, u.hp / u.maxHp);
    u.hpEl.style.width = p * 100 + '%';
    if (instant) u.lagEl.style.transition = 'none';
    u.lagEl.style.width = p * 100 + '%';
    if (instant) { void u.lagEl.offsetWidth; u.lagEl.style.transition = ''; }
    if (u.mpEl) u.mpEl.style.width = Math.max(0, u.mp / u.maxMp) * 100 + '%';
    u.plate.classList.toggle('low', u.alive && p < 0.3);
    u.plate.classList.toggle('ko', !u.alive);
    const icons = [];
    // Every status it has, helpful ones first; stacks show their count, the rest their turns left.
    const keys = Object.keys(u.st).filter(k => STATUSES[k]).sort((a, b) => (STATUSES[a].bad ? 1 : 0) - (STATUSES[b].bad ? 1 : 0) || STATUS_KEYS.indexOf(a) - STATUS_KEYS.indexOf(b));
    for (const k of keys.slice(0, 8)) {
      const s = u.st[k], D = STATUSES[k];
      const n = s.n != null && (k === 'bleed' || k === 'burn' || k === 'parrying') ? s.n : (s.turns > 1 && s.turns < 90 && D.time !== 'start' ? s.turns : null);
      icons.push(h('span', { class: 'st ' + k + (D.bad ? ' bad' : '') }, ico(D.icon), n > 1 ? h('b', { text: n }) : null));
    }
    if (!u.alive) icons.push(h('span', { class: 'st ko' }, ico('skull')));
    u.stEl.replaceChildren(...icons);
  }
  function showUnitTip(u) {
    const sts = Object.keys(u.st).filter(k => STATUSES[k]).map(k => `${STATUSES[k].name}: ${STATUSES[k].tip}`).join(' ');
    const what = u.thrall ? 'Thrall' : u.hero ? `${CLASSES[u.key].role} · Lv ${u.lv || 1}` : `${u.boss ? 'Boss' : u.elite ? 'Elite' : 'Foe'} · Lv ${u.lv || 1}`;
    toast(`${u.name} · ${what} · ${u.alive ? `${u.hp}/${u.maxHp} health` : u.hero ? 'knocked out' : 'fallen'}${sts ? ' · ' + sts : ''}`);
  }

  // ── the play clock and its schedule
  let queue = [];
  function at(t, fn) { queue.push({ t, fn }); }
  function runDue() {
    if (!queue.length) return;
    queue.sort((a, b) => a.t - b.t);
    while (queue.length && queue[0].t <= P.t) queue.shift().fn();
  }

  // ── effects
  // Every effect has a start time and a duration on the play clock and draws itself from its progress.
  function addFx(o) { o.t0 = o.t0 == null ? P.t : o.t0; S.fx.push(o); return o; }
  function burst(x, y, color, n, spd = 30, life = 450, glow = false, g = 0) {
    if (noMotion()) n = Math.ceil(n / 3);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = spd * (0.4 + Math.random() * 0.8);
      S.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - spd * 0.3, life, max: life, color, glow, g });
    }
  }
  function motes(x, y, color, n = 8, spread = 6) {
    for (let i = 0; i < n; i++) S.parts.push({ x: x + vrand(-spread, spread), y: y + vrand(-4, 6), vx: vrand(-4, 4), vy: vrand(-26, -14), life: vrand(500, 900), max: 900, color, glow: true, g: 0 });
  }
  function screenFlash(color, alpha = .5, dur = 260) { if (!noMotion()) S.flash = { color, alpha, t0: P.t, dur }; }
  function shake(level) {
    if (noMotion() || !level) return;
    const el = frame; // the stage around it carries the frame's scale and turn, so the shake's transform is free
    el.classList.remove('shake1', 'shake2', 'shake3'); void el.offsetWidth; el.classList.add('shake' + Math.min(3, level));
    setTimeout(() => el.classList.remove('shake1', 'shake2', 'shake3'), 480);
  }
  function lunge(u, tx, ty, share, out, hold, back) {
    u.anim = { t0: P.t, tx, ty, share, out, hold, back };
  }
  function hop(u, dy = -3, dur = 220) { u.anim = { t0: P.t, hop: dy, dur }; }
  function recoil(u, dir = -1) { u.recoil = { t0: P.t, dir }; }
  function flash(u, dur = 90) { u.flashUntil = P.t + dur; }

  // Numbers and words that float up from a unit.
  function pop(u, text, cls = '') {
    const now = performance.now();
    if (!u.popAt || now - u.popAt > 260) u.popN = 0;
    u.popAt = now;
    // In battle, a pop rises about 34px: keep it clear of the turn flags along the top (about 52px).
    const k = u.popN++ % 4, [x, y0] = css(u.x, headY(u) - 1), top = sideOn() && B ? 88 : 0;
    const y = y0 - k * 13 >= top ? y0 - k * 13 : top + k * 13; // near the top, stack downward instead
    const el = h('div', { class: 'num ' + cls, text });
    el.style.left = x + 'px'; el.style.top = y + 'px';
    el.style.animationDuration = Math.max(450, 1300 / P.speed) + 'ms';
    el.addEventListener('animationend', () => el.remove());
    numsEl.append(el);
    if (numsEl.children.length > 40) numsEl.firstChild.remove();
  }

  // ── what each skill looks like
  // kind: melee (lunge in), dash (leap past the line), shot (a projectile), cast (a spell projectile),
  // aoe (a wave over every target), heal, buff, raise, charge, pillar, none.
  const FX = {
    smash: { kind: 'melee', color: '#e8dcc0', arc: 'smash', sfx: 'smash' },
    slash: { kind: 'melee', color: '#fff3dc', arc: 'slash', sfx: 'slash' },
    bash: { kind: 'melee', color: '#8cc4e6', arc: 'smash', sfx: 'bash' },
    cleave: { kind: 'melee', row: true, color: '#ffd9a0', arc: 'wide', sfx: 'slash' },
    lunge: { kind: 'dash', color: '#ffd9a0', arc: 'slash', sfx: 'slash' },
    claw: { kind: 'melee', color: '#ff8a6a', arc: 'claw', sfx: 'claw' },
    bite: { kind: 'melee', color: '#ff8a6a', arc: 'claw', sfx: 'bite' },
    swarm: { kind: 'melee', row: true, color: '#c9a08a', arc: 'claw', sfx: 'bite' },
    reap: { kind: 'dash', color: '#c9ccd4', arc: 'claw', sfx: 'claw' },
    burial: { kind: 'dash', color: '#c8a070', arc: 'smash', sfx: 'smash', big: true, dirt: true },
    bolt: { kind: 'shot', proj: 'bolt', color: '#efe6cf', sfx: 'bolt', hit: 'thunk', speed: 1.3 },
    aimed: { kind: 'shot', proj: 'bolt', color: '#ffd27a', sfx: 'bolt', hit: 'crit', speed: 1.6, reticle: true, light: 8 },
    volley: { kind: 'shot', proj: 'bolt', color: '#efe6cf', sfx: 'bolt', hit: 'thunk', arcH: 16, stagger: 80, speed: 1 },
    bone: { kind: 'shot', proj: 'bone', color: '#e0d8c4', sfx: 'bone', hit: 'thunk', arcH: 8, speed: .9 },
    smite: { kind: 'cast', proj: 'orb', color: '#ffe9a0', sfx: 'holy', light: 12 },
    flare: { kind: 'cast', proj: 'orb', color: '#ffb04a', sfx: 'magic', light: 14 },
    hexbolt: { kind: 'cast', proj: 'orb', color: '#c9a6ff', sfx: 'hex', light: 10 },
    doom: { kind: 'cast', proj: 'orb', color: '#9a6ad8', sfx: 'hex', light: 10, rune: true },
    hexswarm: { kind: 'cast', proj: 'orb', color: '#c9a6ff', sfx: 'hex', light: 10, stagger: 110 },
    brine: { kind: 'cast', proj: 'orb', color: '#6af0d8', sfx: 'magic', light: 10 },
    wail: { kind: 'cast', proj: 'ring', color: '#b8d0e0', sfx: 'toll', light: 6 },
    toll: { kind: 'aoe', color: '#b8d0e0', sfx: 'toll', ring: true },
    dazzle: { kind: 'aoe', color: '#fff6d8', sfx: 'dazzle', flash: '#fff6d8', light: 70 },
    requiem: { kind: 'aoe', color: '#bb96ee', sfx: 'hex', ring: true },
    font: { kind: 'aoe', color: '#6af0d8', sfx: 'water', ring: true },
    dirt: { kind: 'aoe', color: '#8a6a4a', sfx: 'dirt', dirt: true },
    burst: { kind: 'aoe', color: '#c8e07a', sfx: 'burst', flash: '#c8e07a', boom: true },
    drown: { kind: 'pillar', color: '#6af0d8', sfx: 'water' },
    mend: { kind: 'heal', color: '#b4f098', sfx: 'heal' },
    hymn: { kind: 'heal', color: '#6af0d8', sfx: 'heal' },
    reassemble: { kind: 'heal', color: '#e0d8c4', sfx: 'bone' },
    rites: { kind: 'raise', color: '#fff3c8', sfx: 'revive' },
    raise: { kind: 'raise', color: '#6af0d8', sfx: 'revive' },
    kindle: { kind: 'buff', color: '#ffb04a', sfx: 'kindle', light: 60 },
    guard: { kind: 'buff', color: '#8cc4e6', sfx: 'guard', dome: true },
    charge: { kind: 'charge', color: '#ff5a4a', sfx: 'charge' },
    // the classes' skills (js/classes.js)
    cleanse: { kind: 'heal', color: '#e8f4ff', sfx: 'heal' },
    rage: { kind: 'buff', color: '#e5574a', sfx: 'kindle', light: 30 },
    buffhex: { kind: 'buff', color: '#bb96ee', sfx: 'hex' },
    drain: { kind: 'cast', proj: 'orb', color: '#e0485a', sfx: 'hex', light: 10 },
    bless: { kind: 'heal', color: '#f7d36a', sfx: 'heal' },
    ward: { kind: 'buff', color: '#8cc4e6', sfx: 'guard', dome: true },
    holyaoe: { kind: 'aoe', color: '#ffe9a0', sfx: 'holy', flash: '#fff6d8', light: 50 },
    buffshield: { kind: 'buff', color: '#8cc4e6', sfx: 'guard' },
    toss: { kind: 'shot', proj: 'bone', color: '#8cc4e6', sfx: 'bash', hit: 'thunk', arcH: 6, speed: 1.1 },
    haste: { kind: 'buff', color: '#f7c24a', sfx: 'kindle' },
    trap: { kind: 'shot', proj: 'bolt', color: '#a7adb8', sfx: 'bolt', hit: 'thunk', arcH: 6 },
    taunt: { kind: 'aoe', color: '#e05a4a', sfx: 'toll', ring: true },
    vial: { kind: 'shot', proj: 'orb', color: '#b4f098', sfx: 'bolt', hit: 'thunk', arcH: 10 },
    firebomb: { kind: 'aoe', color: '#ff8a3a', sfx: 'burst', flash: '#ffb04a', boom: true, light: 40 },
    fire: { kind: 'shot', proj: 'orb', color: '#ff8a3a', sfx: 'magic', hit: 'thunk', arcH: 10, light: 12 },
    acid: { kind: 'shot', proj: 'orb', color: '#9ad040', sfx: 'magic', hit: 'thunk', arcH: 10, light: 6 },
    acidcloud: { kind: 'aoe', color: '#9ad040', sfx: 'water', ring: true },
    smoke: { kind: 'buff', color: '#9a8ea4', sfx: 'guard' },
    knife: { kind: 'shot', proj: 'bolt', color: '#d8dce4', sfx: 'bolt', hit: 'thunk', speed: 1.5 },
    knell: { kind: 'cast', proj: 'ring', color: '#e8c24a', sfx: 'toll', light: 8 },
    chime: { kind: 'heal', color: '#e8c24a', sfx: 'toll' },
    gravebolt: { kind: 'cast', proj: 'orb', color: '#d8d0bc', sfx: 'hex', light: 8 },
    raisebone: { kind: 'buff', color: '#d8d0bc', sfx: 'bone', light: 20 },
    corpse: { kind: 'aoe', color: '#a8c85a', sfx: 'burst', boom: true },
    shadow: { kind: 'dash', color: '#bb96ee', arc: 'slash', sfx: 'slash' },
    fan: { kind: 'shot', proj: 'bolt', color: '#d8dce4', sfx: 'bolt', hit: 'thunk', stagger: 60, speed: 1.4 },
    // Region I's new foes (build step 6)
    crush: { kind: 'melee', color: '#e8dcc0', arc: 'smash', sfx: 'smash', big: true },
    peck: { kind: 'dash', color: '#d8c8a0', arc: 'claw', sfx: 'claw' },
    dive: { kind: 'dash', color: '#f4d24a', arc: 'claw', sfx: 'claw' },
    dirge: { kind: 'buff', color: '#9a86c8', sfx: 'toll', light: 40 },
    call: { kind: 'buff', color: '#c9a08a', sfx: 'bite', light: 20 },
    dust: { kind: 'aoe', color: '#e8e0c0', sfx: 'dazzle', flash: '#fff6d8', light: 40 },
    // Regions II–V (build step 7)
    psalter: { kind: 'cast', proj: 'orb', color: '#c8d4e0', sfx: 'magic', light: 6 },
    vow: { kind: 'cast', proj: 'ring', color: '#b4a8b6', sfx: 'hex', light: 6, rune: true },
    latch: { kind: 'melee', color: '#e8d8f0', arc: 'claw', sfx: 'bite', drain: true },
    drainfont: { kind: 'aoe', color: '#5a8ae0', sfx: 'water', ring: true, light: 30, drain: true },
    packtear: { kind: 'dash', color: '#d86a4a', arc: 'claw', sfx: 'bite' },
    thornlash: { kind: 'cast', proj: 'orb', color: '#9ad06a', sfx: 'magic', light: 6 },
    entangle: { kind: 'aoe', color: '#6a9a4a', sfx: 'dirt', vines: true },
    rotbloom: { kind: 'cast', proj: 'orb', color: '#7ac46a', sfx: 'hex', light: 8 },
    rotcloud: { kind: 'aoe', color: '#7ac46a', sfx: 'water', ring: true },
    noose: { kind: 'dash', color: '#c8b48a', arc: 'claw', sfx: 'claw', drop: true },
    gallows: { kind: 'dash', color: '#e8d8a8', arc: 'smash', sfx: 'smash', big: true, drop: true },
    willlight: { kind: 'cast', proj: 'orb', color: '#c8f0a0', sfx: 'magic', light: 12 },
    lure: { kind: 'cast', proj: 'orb', color: '#e8f8b0', sfx: 'magic', light: 18, speed: 0.6 },
    bramble: { kind: 'buff', color: '#a07a4a', sfx: 'guard', dome: true },
    gore: { kind: 'melee', color: '#e8dcc0', arc: 'smash', sfx: 'smash' },
    thunder: { kind: 'dash', color: '#c9a07a', arc: 'wide', sfx: 'smash', big: true, dirt: true },
    rake: { kind: 'melee', color: '#dccca4', arc: 'claw', sfx: 'claw' },
    rut: { kind: 'dash', color: '#dccca4', arc: 'smash', sfx: 'smash', big: true, dirt: true },
    ashblade: { kind: 'melee', color: '#ffb04a', arc: 'slash', sfx: 'slash' },
    emberbite: { kind: 'melee', color: '#ff8a3a', arc: 'claw', sfx: 'bite', embers: true },
    firebreath: { kind: 'aoe', color: '#ff8a3a', sfx: 'burst', flash: '#ffb04a', light: 40, embers: true },
    spear: { kind: 'shot', proj: 'bolt', color: '#c8b48a', sfx: 'bolt', hit: 'thunk', speed: 1.1 },
    serve: { kind: 'buff', color: '#8cc4e6', sfx: 'guard', dome: true },
    siege: { kind: 'shot', proj: 'bolt', color: '#ffd27a', sfx: 'bolt', hit: 'crit', speed: 1.8, reticle: true, light: 10 },
    kilnblast: { kind: 'aoe', color: '#ff7a2a', sfx: 'burst', flash: '#ffb04a', boom: true, light: 70, embers: true },
    brand: { kind: 'cast', proj: 'orb', color: '#ff9a3a', sfx: 'magic', light: 12 },
    riteofash: { kind: 'heal', color: '#ffb04a', sfx: 'kindle', light: 40 },
    marshal: { kind: 'melee', color: '#ffb04a', arc: 'wide', sfx: 'slash', big: true, embers: true },
    rally: { kind: 'buff', color: '#ffb04a', sfx: 'kindle', light: 50 },
    burnt: { kind: 'dash', color: '#ff8a3a', arc: 'wide', sfx: 'slash', big: true, embers: true },
    compliment: { kind: 'cast', proj: 'orb', color: '#e8d8ff', sfx: 'hex', light: 6 },
    flattery: { kind: 'cast', proj: 'ring', color: '#c9a6ff', sfx: 'hex', light: 8 },
    shadetouch: { kind: 'melee', color: '#b8a8e0', arc: 'claw', sfx: 'claw' },
    usurp: { kind: 'cast', proj: 'orb', color: '#e8c24a', sfx: 'hex', light: 10 },
    proclaim: { kind: 'cast', proj: 'ring', color: '#e8c24a', sfx: 'toll', light: 6 },
    gutter: { kind: 'cast', proj: 'orb', color: '#fff3c8', sfx: 'magic', light: 8 },
    snufflight: { kind: 'aoe', color: '#8a7aa8', sfx: 'hex', ring: true, flash: '#05030a', dim: true },
    rod: { kind: 'cast', proj: 'orb', color: '#e8c24a', sfx: 'magic', light: 8 },
    reorder: { kind: 'cast', proj: 'ring', color: '#e8c24a', sfx: 'toll', light: 10 },
    court: { kind: 'buff', color: '#b8a8e0', sfx: 'toll', light: 30 },
    sceptre: { kind: 'cast', proj: 'orb', color: '#e8d8ff', sfx: 'hex', light: 12 },
    sceptrerow: { kind: 'aoe', color: '#e8d8ff', sfx: 'hex', ring: true, light: 30 },
    gather: { kind: 'buff', color: '#5a8ae0', sfx: 'kindle' },
    none: { kind: 'none' },
  };

  // ── playing one turn
  // Lays a turn's events out on the play clock and returns how long the turn takes.
  function playTurn(group, k) {
    const T = P.t, turn = group[0], actor = S.units[turn.who];
    let t = 0;
    at(T, () => { setActive(actor); renderFlags(k, true); });
    t += 70;
    let i = 1;
    for (; i < group.length && group[i].t !== 'act'; i++) {
      const e = group[i];
      at(T + t, () => apply(e));
      if (e.t === 'tick' || e.t === 'sprung' || (e.t === 'hit' && !e.counter)) t += 280; else if (e.t === 'die') t += 520; else if (e.t === 'skip') t += 520; else if (e.t === 'heal') t += 120;
    }
    if (i >= group.length) return t + 160;
    const act = group[i++], sk = SKILLS[act.skill], F = FX[sk.fx] || FX.none;
    const tA = t;
    // Who really gets hit: a Guard may step in.
    const real = {};
    for (let j = i; j < group.length; j++) { const e = group[j]; if ((e.t === 'hit' || e.t === 'miss') && e.guard) real[e.guard] = e.tgt; }
    const targets = act.targets.map(id => S.units[real[id] || id]);
    const impacts = schedule(actor, act, sk, F, targets, T + tA + 60);
    let lastT = tA + 60 + (F.dur || 0), cur = null;
    const seen = {};
    for (; i < group.length; i++) {
      const e = group[i];
      let et;
      if ((e.t === 'hit' || e.t === 'miss') && e.counter) et = (cur != null ? cur - T : tA + 400) + 160;
      else if (e.t === 'hit' || e.t === 'miss' || e.t === 'heal' || e.t === 'revive') {
        const key = e.t === 'hit' || e.t === 'miss' ? (e.guard || e.tgt) : e.tgt;
        const n = seen[key] = (seen[key] || 0) + 1;
        et = (impacts[key] != null ? impacts[key] + (n - 1) * 130 : (cur != null ? cur + 60 : tA + 400)) - T;
        if (n > 1 && (e.t === 'hit' || e.t === 'miss')) { const tg = S.units[key], F2 = F; at(T + et - 20, () => { if (tg) { if (F2.kind === 'melee' || F2.kind === 'dash') slashFx(tg, F2); else impactFx(tg, F2); } }); }
        cur = et + T;
      } else if (e.t === 'status') et = (cur != null ? cur - T : tA + 420) + 50;
      else if (e.t === 'die') et = (cur != null ? cur - T : tA + 400) + 150;
      else if (e.t === 'counter') et = (cur != null ? cur - T : tA + 400) + 90;
      else et = (cur != null ? cur - T : tA + 400) + 80;
      if (e.t === 'counter' || ((e.t === 'hit' || e.t === 'miss') && e.counter)) cur = T + et;
      at(T + et, () => apply(e));
      lastT = Math.max(lastT, et + (e.t === 'phase' ? 1500 : e.t === 'step' || e.t === 'summon' ? 380 : 0));
    }
    return Math.max(lastT + 210, tA + 60 + (F.dur || 300));
  }

  // Starts the actor's animation and returns when it lands on each target (unit id → play time).
  function schedule(actor, act, sk, F, targets, T0) {
    const imp = {}, n = targets.length;
    const aimedIds = act.targets;
    const say = (k, d = 0) => at(T0 + d, () => sfx(k));
    const [ax, ay] = midOf(actor);
    switch (F.kind) {
      case 'melee': case 'dash': {
        const dash = F.kind === 'dash';
        let tx = 0, ty = 0;
        for (const tg of targets) { tx += tg.x; ty += tg.y; }
        tx /= n; ty /= n;
        // stop short of the target, at its feet
        if (sideOn()) tx += actor.hero ? -10 : 10; else ty += actor.hero ? 6 : -10;
        const out = dash ? 220 : 160, share = dash ? 0.9 : 0.6;
        at(T0, () => { lunge(actor, tx, ty, share, out, 60, dash ? 260 : 200); if (dash) { burst(actor.x, actor.y, '#d8c8a8', 6, 20, 300); } });
        say(F.sfx, out - 30);
        targets.forEach((tg, k) => { imp[aimedIds[k]] = T0 + out + k * 30; at(imp[aimedIds[k]], () => slashFx(tg, F)); });
        F.dur = out + (dash ? 280 : 220);
        break;
      }
      case 'shot': case 'cast': {
        const lead = F.kind === 'cast' ? 170 : 110;
        at(T0, () => { if (F.kind === 'cast') castGlow(actor, F.color); else hop(actor, actor.hero ? 2 : -2, 160); });
        if (F.reticle) at(T0, () => targets.forEach(tg => addFx({ type: 'reticle', u: tg, dur: lead + 260, color: '#ff6a4a' })));
        targets.forEach((tg, k) => {
          const launch = T0 + lead + k * (F.stagger || 0);
          const [tx, ty] = midOf(tg);
          const d = Math.hypot(tx - ax, ty - ay), travel = Math.round((120 + d * 1.7) / (F.speed || 1));
          at(launch, () => { addFx({ type: 'proj', x0: ax, y0: ay, x1: tx, y1: ty, dur: travel, style: F.proj, color: F.color, arcH: F.arcH || 0, light: F.light || 0, big: F.reticle }); if (k === 0 || F.stagger) sfx(F.sfx, k ? .6 : 1); });
          imp[aimedIds[k]] = launch + travel;
          at(launch + travel, () => { impactFx(tg, F); if (F.hit) sfx(F.hit, .8); });
        });
        F.dur = lead + 300 + (n - 1) * (F.stagger || 0) + 120;
        break;
      }
      case 'aoe': {
        const lead = 300;
        at(T0, () => { castGlow(actor, F.color, true); sfx(F.sfx); if (F.light) addFx({ type: 'light', x: ax, y: ay, r: F.light, dur: 600, warm: F.sfx === 'kindle' }); });
        if (F.flash) at(T0 + lead - 40, () => { screenFlash(F.flash, F.sfx === 'dazzle' ? .55 : .35, 320); if (F.boom) shake(2); });
        const order = targets.slice().sort((a, b) => Math.hypot(a.x - ax, a.y - ay) - Math.hypot(b.x - ax, b.y - ay));
        order.forEach((tg, k) => {
          const id = aimedIds[targets.indexOf(tg)];
          imp[id] = T0 + lead + k * 55;
          at(imp[id], () => impactFx(tg, F));
        });
        if (F.ring) at(T0 + 80, () => addFx({ type: 'ring', x: ax, y: ay, r0: 4, r1: S.H * 0.55, dur: lead + n * 55, color: F.color }));
        F.dur = lead + n * 55 + 200;
        break;
      }
      case 'heal': case 'buff': {
        at(T0, () => { castGlow(actor, F.color); sfx(F.sfx); if (F.light) addFx({ type: 'light', x: ax, y: ay, r: F.light, dur: 700, warm: true }); });
        if (F.dome) at(T0 + 60, () => addFx({ type: 'ring', x: actor.x, y: actor.y - 8, r0: 2, r1: 16, dur: 380, color: F.color, keep: true }));
        targets.forEach((tg, k) => {
          imp[aimedIds[k]] = T0 + 240 + k * 45;
          at(imp[aimedIds[k]], () => { const [x, y] = midOf(tg); motes(x, y + 4, F.color, 9); addFx({ type: 'light', x, y, r: 14, dur: 420, warm: F.color === '#ffb04a' }); });
        });
        F.dur = 300 + n * 45 + 160;
        break;
      }
      case 'raise': {
        at(T0, () => castGlow(actor, F.color));
        targets.forEach((tg, k) => {
          at(T0 + 80, () => { sfx(F.sfx); addFx({ type: 'pillar', x: tg.x, y: tg.y, dur: 760, color: F.color, w: 6 }); });
          imp[aimedIds[k]] = T0 + 460;
        });
        F.dur = 860;
        break;
      }
      case 'pillar': {
        at(T0, () => castGlow(actor, F.color, true));
        targets.forEach((tg, k) => {
          at(T0 + 160, () => { sfx(F.sfx); addFx({ type: 'pillar', x: tg.x, y: tg.y, dur: 620, color: F.color, w: 8, water: true }); });
          imp[aimedIds[k]] = T0 + 420;
          at(T0 + 420, () => { impactFx(tg, F); shake(2); });
        });
        F.dur = 820;
        break;
      }
      case 'charge': {
        at(T0, () => { castGlow(actor, F.color, true); sfx('charge'); addFx({ type: 'light', x: ax, y: ay, r: 26, dur: 800, warm: true }); });
        targets.forEach(tg => at(T0 + 260, () => { addFx({ type: 'reticle', u: tg, dur: 700, color: '#ff5a4a' }); burst(tg.x, tg.y, '#8a6a4a', 8, 18, 500); }));
        F.dur = 900;
        break;
      }
      default: F.dur = 300;
    }
    return imp;
  }
  function castGlow(u, color, big) {
    const [x, y] = midOf(u);
    addFx({ type: 'ring', x, y: u.y - 2, r0: 2, r1: big ? 14 : 9, dur: 300, color });
    addFx({ type: 'light', x, y, r: big ? 22 : 14, dur: 380, warm: true, color });
    motes(x, y + 4, color, big ? 8 : 5, 5);
    hop(u, -2, 200);
  }
  function slashFx(tg, F) {
    const [x, y] = midOf(tg);
    addFx({ type: 'slash', x, y, dur: 220, color: F.color, arc: F.arc, flip: Math.random() < .5 });
    addFx({ type: 'light', x, y, r: F.big ? 26 : 14, dur: 240, warm: true });
    if (F.dirt) burst(tg.x, tg.y, '#8a6a4a', 14, 30, 600, false, 60);
    if (F.embers) burst(x, y, '#ff9a3a', 8, 30, 520, true, -30);
    // the Hanged Man drops from the branches: a rope's shadow falls onto the one he hits
    if (F.drop) addFx({ type: 'pillar', x: tg.x, y: tg.y - sizeOf(tg)[1], dur: 340, color: '#8a7a5a', w: 1 });
  }
  function impactFx(tg, F) {
    const [x, y] = midOf(tg);
    if (F.ring || F.kind === 'aoe') addFx({ type: 'ring', x, y, r0: 1, r1: F.boom ? 14 : 9, dur: 260, color: F.color });
    if (F.dirt) burst(x, y + 4, '#7a5a3a', 8, 24, 520, false, 60);
    // vines that grip, embers that scatter
    if (F.vines) { burst(tg.x, tg.y, '#6a9a4a', 10, 14, 620, false, -10); addFx({ type: 'ring', x: tg.x, y: tg.y - 1, r0: 6, r1: 2, dur: 420, color: '#4a7a3a' }); }
    if (F.embers) burst(x, y, '#ff9a3a', 8, 30, 520, true, -30);
    if (F.boom) burst(x, y, F.color, 10, 40, 500, true);
    if (F.rune) addFx({ type: 'rune', x, y: headY(tg) - 3, dur: 700, color: F.color });
    if (F.kind === 'pillar') burst(x, y, F.color, 14, 36, 600, true, 40);
    addFx({ type: 'light', x, y, r: F.light ? F.light + 6 : 12, dur: 260, warm: false, color: F.color });
  }

  // ── applying events to what's on screen
  let onEvent = null;
  function apply(e) {
    const U = S.units;
    if (onEvent && e.t !== 'phase') { try { onEvent(e); } catch (err) { } }
    switch (e.t) {
      case 'hit': {
        const t = U[e.tgt], src = U[e.src];
        t.hp = e.hp;
        const share = e.dmg / t.maxHp;
        if (e.absorbed) pop(t, (e.dmg ? '' : '−') + e.absorbed + ' warded', 'tag guard');
        if (e.dmg || !e.absorbed) pop(t, String(e.dmg), (e.crit ? 'crit ' : '') + (share >= .25 ? 'big ' : '') + (t.hero ? 'hurt' : 'dmg'));
        if (e.crit) pop(t, 'Critical', 'tag crit');
        if (e.guard) { pop(t, 'Guarded', 'tag guard'); const g = U[e.guard]; addFx({ type: 'link', a: g, b: t, dur: 380, color: '#8cc4e6' }); sfx('guard', .7); }
        // A splash from the blow beside: the Burnt Marshal's blade
        if (e.splash) { pop(t, 'Splash', 'tag splash'); const [sx, sy] = midOf(t); burst(sx, sy, '#ff9a3a', 6, 26, 380, true); }
        flash(t); recoil(t, t.hero ? 1 : -1);
        const [x, y] = midOf(t);
        burst(x, y, e.crit ? '#ffd06a' : '#fff0d0', e.crit ? 12 : 6, e.crit ? 46 : 32, 360, true);
        if (e.crit) { sfx('crit'); shake(2); } else if (share >= .2) shake(1);
        if (t.hero && !t.thrall && share >= .15) frame.classList.add('hurt'), setTimeout(() => frame.classList.remove('hurt'), 110);
        syncPlate(t);
        if (B) B.dealt[src.side] += e.dmg;
        break;
      }
      case 'miss': {
        const t = U[e.tgt];
        pop(t, { dazzled: 'Miss', parry: 'Parried', hidden: 'Hidden' }[e.why] || 'Dodge', 'tag miss');
        if (e.guard) { pop(t, 'Guarded', 'tag guard'); addFx({ type: 'link', a: U[e.guard], b: t, dur: 380, color: '#8cc4e6' }); }
        if (e.why === 'dodge') { t.anim = { t0: P.t, dodge: t.hero ? -1 : 1, dur: 260 }; }
        sfx('miss');
        break;
      }
      case 'heal': {
        const t = U[e.tgt];
        t.hp = e.hp;
        if (e.amt > 0) pop(t, '+' + e.amt, 'heal'); else pop(t, 'Full', 'tag');
        // Old Growth's green, a drain's blue
        if (e.how === 'regen' && e.amt > 0) { pop(t, 'Old Growth', 'tag regen'); motes(t.x, t.y - 4, '#9ae06a', 10, 8); }
        if (e.how === 'drain' && e.amt > 0) motes(t.x, t.y - 4, '#7aa8ff', 10, 8);
        syncPlate(t);
        break;
      }
      case 'tick': {
        const t = U[e.who];
        if (!t) break;
        t.hp = e.hp;
        const col = { doom: '#bb96ee', burn: '#ff8a3a', poison: '#7ac46a', cost: '#d83a46' }[e.key] || '#d83a46';
        if (e.dmg > 0 || e.key !== 'cost') pop(t, String(e.dmg), { doom: 'doom', burn: 'burn', poison: 'poison' }[e.key] || 'bleed');
        if (e.absorbed) pop(t, 'Warded', 'tag guard');
        const [x, y] = midOf(t);
        burst(x, y, col, e.burst ? 14 : 6, e.burst ? 34 : 20, 420, e.key !== 'bleed');
        flash(t, 70);
        sfx(e.burst ? 'burst' : 'tick');
        syncPlate(t);
        break;
      }
      case 'status': {
        const t = U[e.who];
        if (e.on) {
          const prev = t.st[e.key];
          t.st[e.key] = { turns: e.turns, dmg: e.dmg };
          t.st[e.key].n = e.n;
          if (!prev || (e.key === 'bleed' && e.n > (prev.n || 1))) {
            // Most helpful statuses show as their icon and the motes; words would crowd six heroes at once.
            const label = STATUSES[e.key] && STATUSES[e.key].tag;
            if (label) pop(t, label, 'tag st-' + e.key + (STATUSES[e.key].bad ? ' bad' : ''));
          }
        } else {
          // Hidden no more: the Hanged Man drops out of the branches
          if (e.key === 'hidden' && t.alive) { pop(t, 'Revealed', 'tag crit'); motes(t.x, t.y - 10, '#c8b48a', 8, 6); }
          delete t.st[e.key];
        }
        syncPlate(t);
        break;
      }
      case 'die': {
        const t = U[e.who];
        t.alive = false; t.hp = 0; t.st = {};
        t.fade = { t0: P.t, dur: t.hero ? 500 : 650 };
        const [x, y] = midOf(t);
        if (t.hero) { pop(t, 'Knocked out', 'tag ko'); sfx('ko'); }
        else { burst(x, y, '#d8d0bc', 16, 30, 800, false, -20); burst(x, y, '#ffb04a', 8, 22, 700, true, -30); sfx('die'); }
        flash(t, 140);
        syncPlate(t);
        break;
      }
      case 'revive': {
        const t = U[e.tgt];
        t.alive = true; t.hp = e.hp; t.st = {}; t.fade = { t0: P.t, dur: 500, rise: true }; t.gone = false; t.alpha = 1;
        pop(t, 'Raised', 'tag raise');
        motes(t.x, t.y - 4, '#fff3c8', 12);
        syncPlate(t);
        break;
      }
      case 'mana': {
        const t = U[e.tgt];
        t.mp = e.mp;
        if (e.amt > 0) pop(t, '+' + e.amt, 'mana');
        // Drained: the mana streams off to the one drinking it (the Font Leech)
        else if (e.amt < 0) {
          pop(t, e.amt + ' mana', 'tag drain');
          const by = e.by && U[e.by];
          if (by) { const [x0, y0] = midOf(t), [x1, y1] = midOf(by); addFx({ type: 'proj', x0, y0, x1, y1, dur: 420, style: 'orb', color: '#5a8ae0', arcH: 6, light: 6 }); addFx({ type: 'link', a: t, b: by, dur: 360, color: '#5a8ae0' }); }
        }
        syncPlate(t);
        break;
      }
      case 'delay': {
        const t = U[e.who];
        pop(t, 'Pushed back', 'tag stagger');
        if (t) addFx({ type: 'ring', x: t.x, y: t.y - 4, r0: 2, r1: 10, dur: 300, color: '#b8d0e0' });
        if (B && e.queue) renderFlags(Math.max(0, B.curK), true);
        break;
      }
      case 'quick': {
        const t = U[e.who];
        if (t) { pop(t, e.now ? 'Acts next' : 'Sooner', 'tag quick'); motes(t.x, t.y - 6, '#f7c24a', 6); }
        break;
      }
      case 'resist': {
        const t = U[e.who];
        if (t) pop(t, 'Resist', 'tag resist');
        break;
      }
      case 'skip': {
        const t = U[e.who];
        if (t) { pop(t, 'Stunned', 'tag st-stunned bad'); t.anim = { t0: P.t, dodge: t.hero ? -1 : 1, dur: 360 }; sfx('miss'); }
        break;
      }
      case 'counter': {
        const t = U[e.who], v = U[e.tgt];
        // Thorns: Mother Bramble doesn't lunge; her thorns bite whoever hit her
        if (t && e.why === 'thorns') { if (v) { pop(v, 'Thorns', 'tag thorns'); const [x, y] = midOf(v); burst(x, y, '#c8a070', 9, 26, 420); addFx({ type: 'link', a: t, b: v, dur: 260, color: '#a07a4a' }); } sfx('claw', .6); break; }
        if (t) { pop(t, 'Counter', 'tag counter'); if (v) { const [x, y] = midOf(v); lunge(t, v.x + (sideOn() ? (t.hero ? -10 : 10) : 0), v.y, 0.5, 120, 40, 160); at(P.t + 120, () => addFx({ type: 'slash', x, y, dur: 200, color: '#eceaf2', arc: 'slash', flip: true })); sfx('slash', .7); } }
        break;
      }
      case 'saved': {
        const t = U[e.who];
        if (t) { pop(t, e.label || 'Saved', 'tag raise'); motes(t.x, t.y - 4, '#fff3c8', 14); addFx({ type: 'pillar', x: t.x, y: t.y, dur: 600, color: '#fff3c8', w: 6 }); sfx('revive'); }
        break;
      }
      case 'broke': {
        const t = U[e.who];
        if (t) { pop(t, 'Charge broken', 'tag resist'); delete t.st.charging; syncPlate(t); }
        break;
      }
      case 'cleanse': {
        const t = U[e.who];
        if (t) { pop(t, 'Cleansed', 'tag heal'); motes(t.x, t.y - 4, '#e8f4ff', 8); }
        break;
      }
      case 'strip': {
        const t = U[e.who];
        if (t) pop(t, 'Stripped', 'tag resist');
        break;
      }
      case 'steal': {
        const t = U[e.who];
        if (t) pop(t, '+' + e.gold + ' gold', 'tag gold');
        break;
      }
      case 'sprung': {
        const t = U[e.who];
        if (t) { pop(t, 'Trap!', 'tag st-trap bad'); burst(t.x, t.y, '#a7adb8', 10, 30, 420); sfx('bash'); }
        break;
      }
      case 'maxhp': {
        const t = U[e.who];
        if (t) { t.maxHp = e.maxHp; t.hp = e.hp; syncPlate(t); }
        break;
      }
      case 'summon': {
        // A thrall rises into an empty slot; a foe called by another (the Rat King's swarm) boils up out of the dirt.
        const foe = e.unit.side === 1;
        const s = Object.assign({}, e.unit, { hero: !foe });
        const u = makeView(s);
        S.units[u.id] = u; S.list.push(u);
        u.alpha = 0; u.fade = { t0: P.t, dur: 520, rise: true };
        burst(u.x, u.y, foe ? '#8a6a4a' : '#d8d0bc', foe ? 16 : 12, 26, 600, false, -20);
        addFx({ type: 'pillar', x: u.x, y: u.y, dur: 600, color: foe ? '#c9a08a' : '#d8d0bc', w: 5 });
        pop(u, foe ? 'Called' : 'Rises', 'tag ' + (foe ? 'stagger' : 'raise'));
        layoutPlates();
        sfx(foe ? 'bite' : 'bone');
        if (B && e.queue) renderFlags(Math.max(0, B.curK), true);
        break;
      }
      case 'step': {
        // A waiting foe steps up into the open front slot.
        const u = U[e.who];
        if (!u) break;
        u.march = { t0: P.t, dur: 420, fx: u.x, fy: u.y };
        u.slot = e.slot; place(u);
        pop(u, 'Steps up', 'tag quick');
        layoutPlates();
        sfx('turn');
        break;
      }
      case 'phase': {
        // A boss changes: a callout, a flash, and the field shakes.
        const u = U[e.who];
        banner(e.name, 'phase', e.line || (u ? u.name : ''));
        if (u) { pop(u, e.name, 'tag crit'); castGlow(u, '#e5574a', true); flash(u, 200); }
        screenFlash('#e5574a', .35, 520); shake(2); sfx('enrage');
        at(P.t + 1300, hideBanner);
        if (onEvent) onEvent(e);
        break;
      }
      case 'flee': {
        // A wandering foe scuttles off the field, dropping nothing.
        const u = U[e.who];
        if (!u) break;
        u.alive = false; u.st = {};
        u.march = { t0: P.t, dur: 600, fx: u.x, fy: u.y };
        u.bx = S.W + 30; u.fade = { t0: P.t + 200, dur: 400 };
        pop(u, 'Scuttles off', 'tag miss');
        syncPlate(u);
        u.plate.hidden = true;
        sfx('miss');
        break;
      }
      case 'swap': {
        const a = U[e.a], b = e.b && U[e.b];
        if (a) { a.slot = e.slots[0]; place(a); }
        if (b) { b.slot = e.slots[1]; place(b); }
        // Dragged (Drag Out), Lured (Lure, Reorder the Court) or Moved (the Move action)
        const word = { lure: 'Lured', move: 'Moved' }[e.why] || 'Dragged';
        for (const u of [a, b]) if (u) { u.march = { t0: P.t, dur: e.why === 'lure' ? 620 : 420, fx: u.x, fy: u.y }; if (u === a || e.why !== 'move') pop(u, u === b && e.why === 'lure' ? 'Swapped' : word, 'tag ' + (e.why === 'move' ? 'quick' : 'stagger')); }
        if (e.why === 'lure' && a) { motes(a.x, a.y - 6, '#e8f8b0', 10, 6); sfx('magic', .6); }
        layoutPlates();
        break;
      }
      case 'refill': case 'corpse': break;
      case 'act': {
        const a = U[e.who];
        a.mp = e.mp;
        syncPlate(a);
        break;
      }
    }
  }

  // ── turn flags: who acts next, and with what, as pennants down the left side
  // The battle is simulated before it is shown, so the flags list the real coming turns and the skill each will use.
  // The top flag is the turn being played: it unfurls to name the skill and the rule that chose it.
  let flagEls = new Map();
  function buildTurns(log) {
    const out = [];
    for (let i = 0; i < log.length; i++) {
      if (log[i].t !== 'turn') continue;
      const t = { i, who: log[i].who, skill: null, rule: -1, tick: null };
      for (let j = i + 1; j < log.length && log[j].t !== 'turn'; j++) {
        const x = log[j];
        if (x.t === 'act') { t.skill = x.skill; t.rule = x.rule; t.focus = x.focus; break; }
        if (x.t === 'tick') t.tick = x.key;
        if (x.t === 'skip') t.skip = true;
      }
      out.push(t);
    }
    return out;
  }
  function ruleLine(u, t) {
    if (t.skip) return [h('b', { text: 'Stunned' }), 'loses the turn'];
    if (!t.skill) return [h('b', { text: t.tick ? STATUSES[t.tick].name : 'Fallen' }), 'falls before acting'];
    const focus = t.focus != null ? ' · focus fire' : '';
    if (u.thrall) return [h('b', { text: 'Thrall' }), 'no rules'];
    if (t.rule >= 0 && u.rules[t.rule]) return [h('b', { text: `Rule ${t.rule + 1}` }), ruleCond(u.rules[t.rule]) + focus];
    if (t.rule === -2) return [h('b', { text: 'Charged' }), 'the big attack lands'];
    if (t.skill === 'wait') return [h('b', { text: 'No target' }), 'it waits'];
    return [h('b', { text: 'No rule fit' }), 'basic attack' + focus];
  }
  // A unit for a flag: one on screen, or a thrall that hasn't risen yet.
  const flagUnit = id => S.units[id] || (B && (B.res.log.find(e => e.t === 'summon' && e.unit.id === id) || {}).unit) || null;
  function makeFlag(t) {
    const u = flagUnit(t.who), sk = t.skill && SKILLS[t.skill];
    if (!u) return h('div', { class: 'flag' });
    const icon = sk ? sk.icon : t.skip ? 'stun' : (t.tick && STATUSES[t.tick] ? STATUSES[t.tick].icon : 'skull');
    const hero = u.side === 0;
    const el = h('div', { class: 'flag ' + (hero ? 'hero' : 'foe') + (u.boss ? ' boss' : '') + (u.elite ? ' elite' : '') },
      h('div', { class: 'cloth' },
        h('div', { class: 'pic' }, h('img', { class: 'face', src: faceOf(u), alt: '' }), h('img', { class: 'sk', src: iconURL(icon), alt: '' })),
        h('div', { class: 'txt' },
          h('div', { class: 'who', text: u.name }),
          h('div', { class: 'skn', text: sk ? sk.name : t.skip ? 'Stunned' : 'Succumbs' }),
          h('div', { class: 'why' + (t.rule === -1 ? ' dim' : '') }, ruleLine(u, t)))));
    el.addEventListener('click', () => toast(`${u.name}: ${sk ? sk.name + (sk.tip ? '. ' + sk.tip : sk.d ? '. ' + skillText(sk, 1) : '') : t.skip ? 'stunned' : 'falls before acting'}`));
    return el;
  }
  // The turn being played sits on top; the coming turns hang below it.
  const flagLeft = (pos, current) => (current ? (pos === 0 ? 0 : 246 + (pos - 1) * 46) : pos * 46);
  const flagCount = () => clamp(Math.floor((frame.offsetWidth - 230 - 246) / 46) + 1, 2, FLAG_N);
  function renderFlags(k, current) {
    if (!B) return;
    const T = B.turns, show = [];
    for (let j = k; j < T.length && show.length < flagCount() + (current ? 1 : 0); j++) show.push(j);
    const keep = new Set(show);
    for (const [j, el] of flagEls) if (!keep.has(j)) { leaveFlag(el); flagEls.delete(j); }
    show.forEach((j, pos) => {
      let el = flagEls.get(j);
      if (!el) {
        el = makeFlag(T[j]);
        el.style.left = flagLeft(pos + 1, current) + 'px';
        flagsEl.append(el); flagEls.set(j, el);
        void el.offsetWidth;
      }
      el.classList.add('in');
      el.classList.toggle('now', !!current && pos === 0);
      el.style.left = flagLeft(pos, current) + 'px';
    });
    flagsEl.style.setProperty('--pole', (show.length ? flagLeft(show.length - 1, current) + 40 : 0) + 'px');
  }
  function leaveFlag(el) { el.classList.remove('in'); el.classList.add('out'); setTimeout(() => el.remove(), 450); }
  function clearFlags() { for (const el of flagEls.values()) leaveFlag(el); flagEls = new Map(); flagsEl.style.setProperty('--pole', '0px'); }
  function setActive(u) {
    S.active = u;
    sfx('turn');
  }

  // ── HUD
  function setHud(stage, round, enrage) {
    const R = REGION_NAMES[stage.region];
    const left = SIM.ENRAGE_ROUND - round;
    $('#hudStage').replaceChildren(...[h('b', { text: R.num }), h('span', { class: 'nm', text: stage.name }), stage.boss ? h('span', { class: 'bossmark' }, ico('boss')) : null].filter(Boolean));
    const el = $('#hudRound');
    el.className = 'round' + (enrage ? ' raging' : left <= 3 ? ' warn' : '');
    el.replaceChildren(h('span', { class: 'rn', text: `Round ${round}` }),
      enrage ? h('span', { class: 'enr' }, `Enraged ×${(1 + enrage * SIM.ENRAGE_STEP).toFixed(2).replace(/.?0+$/, '')}`)
        : h('span', { class: 'enr' }, `Enrage in ${left}`));
    el.dataset.tip = enrage ? 'Enraged|The foes hit harder every round from now on.' : `Enrage|In ${plural(left, 'round')}, the foes become enraged and hit harder every round, so no battle can stall.`;
  }
  function banner(text, cls, sub) {
    const el = $('#banner');
    el.className = cls || '';
    el.replaceChildren(h('div', { class: 't', text }), sub ? h('div', { class: 's', text: sub }) : null);
    void el.offsetWidth; el.classList.add('show');
  }
  function hideBanner() { $('#banner').className = ''; }

  // ── a battle, start to finish
  // Runs the simulation, walks the party in, plays the log, and calls onEnd(result) when it is over.
  function run(stage, seed, opts = {}) {
    const setup = opts.setup || stageSetup(stage, seed, null, { replay: !!opts.replay });
    const res = simulate(setup);
    endAim(true);
    queue = []; S.fx = []; hideBanner(); clearFlags(); stepping = false;
    const regionChange = S.region !== stage.region;
    S.region = stage.region;
    setMusicKey(SCALES[stage.region]);
    // Heroes march from where they stand into formation; foes rise out of the dark.
    const fromCamp = S.mode === 'camp';
    S.mode = 'battle'; resize();
    setUnits(res.start);
    if (fromCamp) for (const u of S.list) if (u.hero) u.march = { t0: P.t, dur: 900, fx: u.bx - S.W * 0.4, fy: u.by };
    platesEl.classList.add('away');
    for (const u of S.list) if (!u.hero) { u.alpha = 0; u.fade = { t0: P.t + 380, dur: 480, rise: true, enter: true }; }
    // The first time the party walks into a region, its name comes up before the stage's (campaign spec §7).
    const R = REGION_NAMES[stage.region], entering = !!opts.first && stage.region > 0 && STAGES.find(x => x.region === stage.region) === stage && (typeof Campaign === 'undefined' || !Campaign.isLit(stage.id));
    const lead = entering ? 1700 : 0;
    B = { res, stage, i: 1, busyUntil: P.t + 950 + lead, round: 1, enrage: 0, over: false, onEnd: opts.onEnd, dealt: [0, 0], started: false, durs: [], turns: buildTurns(res.log), turnAt: new Map(), stepped: false, turnUntil: 0, setup, curK: -1 };
    B.turns.forEach((t, k) => B.turnAt.set(t.i, k));
    setHud(stage, 1, 0);
    hudEl.hidden = false; $('#controls').hidden = false;
    renderFlags(0, false);
    buildTray();
    // walk up the road
    S.walkUntil = P.t + 850 + lead;
    if (entering) { banner(`${R.num} · ${R.name}`, 'intro region', R.line); at(P.t + lead, () => banner(stage.name, 'intro', `${R.name} · Stage ${stage.id}`)); }
    else banner(stage.name, 'intro', `${R.name} · Stage ${stage.id}`);
    if (regionChange || opts.first) sfx('region');
    at(P.t + 900 + lead, () => { hideBanner(); B.started = true; platesEl.classList.remove('away'); });
    // What happens before the first turn: battle-start passives and summons.
    let j = 1;
    while (j < res.log.length && !BEATS.includes(res.log[j].t)) j++;
    const pre = res.log.slice(1, j);
    if (pre.length) at(P.t + 940 + lead, () => { pre.forEach(apply); if (pre.some(e => e.t === 'status' && e.key === 'kindled')) sfx('kindle'); });
    B.i = j;
    return res;
  }
  // Step mode: play one turn, then pause.
  let stepping = false;
  // Moves the battle on: plays the next beat of the log when the last one is done.
  function step() {
    if (!B || B.over || P.paused) return;
    if (P.t < B.busyUntil) return;
    const log = B.res.log;
    while (B.i < log.length) {
      const e = log[B.i];
      if (e.t === 'round') { B.round = e.n; setHud(B.stage, B.round, B.enrage); B.i++; continue; }
      if (e.t === 'enrage') {
        B.enrage = e.level; setHud(B.stage, B.round, B.enrage); B.i++;
        if (e.level === 1) { S.active = null; banner('The foes are enraged', 'rage', 'They hit harder every round'); sfx('enrage'); screenFlash('#e5574a', .3, 500); B.busyUntil = P.t + 800; at(P.t + 760, hideBanner); if (onEvent) onEvent(e); return; }
        continue;
      }
      if (e.t === 'flee') { apply(e); B.i++; B.busyUntil = P.t + 700; return; }
      if (e.t === 'item') {
        const j = groupEnd(log, B.i), dur = playItem(log.slice(B.i, j));
        B.i = j;
        B.busyUntil = P.t + dur;
        syncTray();
        return;
      }
      if (e.t === 'turn') {
        if (stepping && B.stepped) { stepping = false; B.stepped = false; setPaused(true); return; }
        if (stepping) B.stepped = true;
        const j = groupEnd(log, B.i);
        B.curK = B.turnAt.get(B.i);
        const group = log.slice(B.i, j), dur = playTurn(group, B.turnAt.get(B.i));
        const act = group.find(x => x.t === 'act');
        // The turn and its action, for the first-hour coach marks (js/guide.js): the flags are drawn by now.
        if (onEvent) { try { onEvent(e); if (act) onEvent(act); } catch (err) { } }
        B.durs.push([act ? act.skill : 'tick', Math.round(dur), group.filter(x => x.t === 'tick').length, group.filter(x => x.t === 'die').length]);
        B.i = j;
        B.busyUntil = B.turnUntil = P.t + dur;
        return;
      }
      if (e.t === 'end') { B.i++; finish(); syncTray(); return; }
      B.i++;
    }
  }
  // Where a beat that starts at log[i] ends: at the next turn, round, enrage, item or end.
  const BEATS = ['turn', 'round', 'enrage', 'end', 'item'];
  function groupEnd(log, i) {
    let j = i + 1;
    while (j < log.length && !BEATS.includes(log[j].t)) j++;
    return j;
  }

  // ── items: the party's, used by the player at any moment (or by an item rule), taking no one's turn
  // A battle is simulated before it is shown. Using an item adds it to the battle's inputs, to land just before the
  // next turn, and simulates the battle again from the same seed: every turn already shown comes out the same, and
  // the rest follows from the item. The screen carries on from where it was, on the new log.
  let trayEl = null, callEl = null, aimEl = null, aim = null;
  const itemOf = slot => B && B.res.loadout && ITEMS[B.res.loadout[slot]];
  // Used, as far as the screen has shown; or asked for and about to land.
  const shownUsed = slot => B.res.log.slice(0, B.i).some(e => e.t === 'item' && e.slot === slot);
  const pending = slot => !shownUsed(slot) && (B.setup.inputs || []).some(x => x.slot === slot);
  function useItem(slot, target) {
    if (!B || B.over || !itemOf(slot) || shownUsed(slot) || pending(slot)) return false;
    const log = B.res.log;
    let j = B.i;
    while (j < log.length && log[j].t !== 'turn') { if (log[j].t === 'end') return false; j++; }
    if (j >= log.length) return false;
    B.setup.inputs = (B.setup.inputs || []).concat([{ at: log[j].k, slot, target: target || null }]);
    const res = simulate(B.setup);
    B.res = res;
    B.turns = buildTurns(res.log);
    B.turnAt = new Map();
    B.turns.forEach((x, k) => B.turnAt.set(x.i, k));
    // The coming turns may have changed: draw their flags again.
    for (const [k, el] of flagEls) if (k > B.curK) { el.remove(); flagEls.delete(k); }
    if (B.started) renderFlags(Math.max(0, B.curK), B.curK >= 0);
    if (P.paused) landNow();
    syncTray();
    return true;
  }
  // Paused: the turn on screen finishes at once and the item lands now, without waiting for the clock.
  function landNow() {
    const q = queue.sort((a, b) => a.t - b.t);
    queue = [];
    q.forEach(x => x.fn());
    B.busyUntil = B.turnUntil = P.t;
    const log = B.res.log;
    while (B.i < log.length && log[B.i].t !== 'turn' && log[B.i].t !== 'end') {
      const e = log[B.i];
      if (e.t === 'round') { B.round = e.n; setHud(B.stage, B.round, B.enrage); B.i++; continue; }
      if (e.t === 'enrage') { B.enrage = e.level; setHud(B.stage, B.round, B.enrage); B.i++; continue; }
      if (e.t !== 'item') { B.i++; continue; }
      const j = groupEnd(log, B.i);
      showCall(e);
      sfx(FX[SKILLS[ITEMS[e.item].skill].fx].sfx || 'heal');
      log.slice(B.i + 1, j).forEach(apply);
      B.i = j;
    }
  }
  // Plays an item's beat: the callout, a flask arcing up from the party's pack to each target, then its effect.
  function playItem(group) {
    const T = P.t, e = group[0], sk = SKILLS[ITEMS[e.item].skill], F = FX[sk.fx] || FX.none, land = {};
    at(T, () => { showCall(e); sfx('click'); });
    e.targets.forEach((id, k) => {
      const tg = S.units[id];
      if (!tg) return;
      const [x, y] = midOf(tg), t0 = T + 120 + k * 60;
      at(t0, () => addFx({ type: 'proj', x0: x - 14, y0: S.H + 6, x1: x, y1: y, dur: 340, style: 'orb', color: F.color || '#b4f098', arcH: 20, light: 8 }));
      land[id] = t0 + 340;
      at(land[id], () => {
        if (F.kind === 'raise') addFx({ type: 'pillar', x: tg.x, y: tg.y, dur: 640, color: F.color, w: 6 });
        else { motes(x, y + 4, F.color || '#b4f098', 9); addFx({ type: 'light', x, y, r: 16, dur: 420, warm: true }); }
        if (k === 0) sfx(F.sfx || 'heal');
      });
    });
    let end = 500;
    for (const x of group.slice(1)) {
      const tt = (land[x.tgt || x.who] || T + 460) + 60;
      at(tt, () => apply(x));
      end = Math.max(end, tt - T);
    }
    return end + 260;
  }
  // The callout: which item, and whether the player or a party rule used it.
  function showCall(e) {
    if (!callEl) { callEl = h('div', { class: 'it-call', 'aria-live': 'polite' }); frame.append(callEl); }
    const it = ITEMS[e.item], r = e.by === 'rule' && B.res.partyRules[e.prule];
    callEl.replaceChildren(ico(it.icon), h('div', {}, h('b', { text: it.name }),
      h('span', { text: r ? `Party rule ${e.prule + 1} \u00b7 ${ruleCond(r)}` : 'Used by your hand' })));
    callEl.classList.remove('show'); void callEl.offsetWidth; callEl.classList.add('show');
    clearTimeout(callEl.timer);
    callEl.timer = setTimeout(() => callEl.classList.remove('show'), Math.max(900, 1800 / P.speed));
  }

  // The tray: one button per packed item, beside the battle controls.
  function buildTray() {
    if (!trayEl) { trayEl = h('div', { class: 'it-tray', role: 'group', 'aria-label': 'Items' }); $('#controls').append(trayEl); }
    const list = (B && B.res.loadout) || [];
    trayEl.hidden = !list.length;
    trayEl.replaceChildren(...list.map((id, slot) => h('button', { class: 'ctl it-btn', 'data-slot': slot, title: `${ITEMS[id].name}: ${ITEMS[id].tip}`, onclick: () => tapItem(slot) },
      ico(ITEMS[id].icon), h('span', { class: 'it-tag', 'aria-hidden': 'true' }))));
    syncTray();
  }
  function syncTray() {
    if (!trayEl || !B) return;
    for (const b of trayEl.children) {
      const slot = +b.dataset.slot, it = itemOf(slot), sk = it && SKILLS[it.skill];
      const used = shownUsed(slot), wait = !used && pending(slot);
      const none = !used && !wait && sk && sk.revive && !S.list.some(u => u.hero && !u.alive);
      b.disabled = B.over || used || wait;
      b.classList.toggle('used', used);
      b.classList.toggle('pending', wait);
      b.classList.toggle('idle', !!none);
      b.classList.toggle('on', !!aim && aim.slot === slot);
      b.setAttribute('aria-label', `${it.name}${used ? ', used' : wait ? ', about to be used' : none ? ', no one has fallen' : ''}`);
      b.lastChild.textContent = used ? '\u2713' : '';
    }
  }
  function tapItem(slot) {
    if (!B || B.over) return;
    if (aim) { const same = aim.slot === slot; endAim(); if (same) return; }
    const it = itemOf(slot), sk = SKILLS[it.skill];
    if (sk.shape !== 'ally') { sfx('click'); useItem(slot, null); return; }
    const cands = S.list.filter(u => u.hero && (sk.revive ? !u.alive : u.alive));
    if (!cands.length) { sfx('click'); if (typeof toast === 'function') toast(`${it.name}: no one has fallen.`); return; }
    sfx('click');
    aim = { slot, wasPaused: P.paused };
    setPaused(true);
    if (!aimEl) { aimEl = h('div', { class: 'it-aim' }); frame.append(aimEl); }
    aimEl.replaceChildren(
      h('button', { class: 'it-hint', onclick: () => { sfx('click'); endAim(); } }, ico(it.icon), `${it.name}: tap ${sk.revive ? 'a fallen ally' : 'an ally'}`, h('span', { text: 'Cancel' })),
      ...cands.map(u => {
        const [w, hh] = sizeOf(u), [x, y] = css(u.x - w / 2 - 3, headY(u) - 3);
        const el = h('button', { class: 'it-pick', 'aria-label': `Use on ${u.name}`, onclick: () => aimAt(u) });
        el.style.cssText = `left:${x}px;top:${y}px;width:${(w + 6) * S.scale}px;height:${(hh + 12) * S.scale}px`;
        return el;
      }));
    aimEl.hidden = false;
    syncTray();
  }
  function aimAt(u) {
    if (!aim) return;
    const sk = SKILLS[itemOf(aim.slot).skill];
    if (!u.hero || (sk.revive ? u.alive : !u.alive)) return;
    const a = aim;
    endAim(true);
    useItem(a.slot, u.id);
    if (!a.wasPaused) setPaused(false);
    syncTray();
  }
  // Stops aiming. Unless an item was just used, the battle goes back to playing if it was.
  function endAim(keep) {
    if (!aim) return;
    const a = aim;
    aim = null;
    if (aimEl) { aimEl.hidden = true; aimEl.replaceChildren(); }
    if (!keep && !a.wasPaused) setPaused(false);
    syncTray();
  }

  function finish() {
    if (!B || B.over) return;
    B.over = true;
    syncTray();
    S.active = null; stepping = false; clearFlags();
    const won = B.res.winner === 0;
    at(P.t + 150, () => {
      banner(won ? 'Victory' : 'Defeat', won ? 'win' : 'lose', won ? `${B.stage.name} is clear` : 'The party is driven back');
      sfx(won ? 'win' : 'lose');
      if (won) S.list.forEach((u, k) => { if (u.hero && u.alive) at(P.t + k * 60, () => hop(u, -4, 300)); });
    });
    const res = B.res, done = B.onEnd;
    at(P.t + 1100, () => { if (done) done(res); });
  }
  // Skip: resolve the rest of the battle at once, from the same simulation.
  function skip() {
    if (!B || B.over) return;
    queue = queue.filter(q => false);
    S.fx = []; numsEl.replaceChildren();
    const fin = {};
    for (const f of B.res.final) fin[f.id] = f;
    for (const f of B.res.final) if (!S.units[f.id]) { const u = makeView(Object.assign({}, f, { hero: f.side === 0 })); S.units[u.id] = u; S.list.push(u); }
    layoutPlates();
    for (const u of S.list) {
      const f = fin[u.id];
      if (!f) continue;
      u.hp = f.hp; u.mp = f.mp; u.st = Object.assign({}, f.st);
      if (u.slot !== f.slot) { u.slot = f.slot; place(u); u.x = u.bx; u.y = u.by; }
      if (f.fled) { u.plate.hidden = true; u.alpha = 0; }
      if (u.alive !== f.alive) { u.alive = f.alive; u.fade = f.alive ? null : { t0: P.t - 2000, dur: 1 }; }
      u.alpha = 1; u.anim = null; if (f.alive) u.fade = null;
      syncPlate(u, true);
    }
    const endE = B.res.log[B.res.log.length - 1];
    B.round = endE.round;
    const enr = Math.max(0, endE.round - SIM.ENRAGE_ROUND + 1);
    setHud(B.stage, B.round, enr);
    S.walkUntil = 0; hideBanner(); platesEl.classList.remove('away');
    for (const u of S.list) u.march = null;
    layoutPlates();
    clearFlags();
    B.i = B.res.log.length;
    endAim(true);
    stepping = false; setPaused(false);
    finish();
  }

  // ── drawing
  function drawGroundLand() {
    const A = REGION_ART[S.region], W = S.W, H = S.H, dist = Math.floor(S.dist);
    const RT = Math.round(H * 0.24), RB = H - 1;
    ctx.fillStyle = A.ground; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = A.road; ctx.fillRect(0, RT, W, RB - RT);
    for (let x = 0; x < W; x++) {
      const p = dist + x, q = p + 1000000;
      if (h2(q, 1) < .6) { ctx.fillStyle = A.speck; ctx.fillRect(x, Math.floor(h2(q, 2) * RT), 1, 1); }
      if (A.tiles) {
        ctx.fillStyle = A.seam;
        if (((p % 12) + 12) % 12 === 0) ctx.fillRect(x, RT + 1, 1, RB - RT - 2);
        else { const off = (Math.floor(p / 12) & 1) ? 5 : 14; for (let sy = RT + off; sy < RB - 1; sy += 18) ctx.fillRect(x, sy, 1, 1); }
      }
      if (h2(q, 7) < .6) { ctx.fillStyle = A.roadSpeck; ctx.fillRect(x, RT + 2 + Math.floor(h2(q, 8) * (RB - RT - 4)), 1, 1); }
      const wl = Math.floor(h2(q >> 2, 5) * 3);
      ctx.fillStyle = A.edge; ctx.fillRect(x, RT - wl, 1, 1 + wl);
    }
    const lights = [];
    const PS = 13, lo = Math.floor(dist / PS) - 2, hi = Math.ceil((dist + W) / PS) + 2;
    for (let s2 = lo; s2 <= hi; s2++) {
      const q = s2 + 500000;
      if (h2(q, 10) > A.density) continue;
      const name = A.props[Math.floor(h2(q, 12) * A.props.length)], pr = PROPS[name];
      const spr = sprite(pr.map, A.pc, 'p' + S.region + name);
      const x = Math.round(s2 * PS + Math.floor(h2(q, 14) * 8) - dist), y = RT - spr.height + Math.floor(h2(q, 16) * 3);
      if (x > W || x + spr.width < 0) continue;
      ctx.drawImage(spr, x, y);
      if (pr.glow) lights.push([x + pr.glow[0], y + pr.glow[1], pr.glow[2] + (noMotion() ? 0 : Math.sin(realT / 110 + s2) * 1.2), .85, pr.warm]);
    }
    return lights;
  }
  function drawGround() {
    if (sideOn()) return drawGroundLand();
    const A = REGION_ART[S.region], W = S.W, H = S.H, dist = Math.floor(S.dist);
    const rc = Math.round(S.roadCx == null ? W / 2 : S.roadCx), half = Math.round(W * 0.34);
    const RL = Math.max(3, rc - half), RR = Math.min(W - 3, rc + half);
    ctx.fillStyle = A.ground; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = A.road; ctx.fillRect(RL, 0, RR - RL, H);
    for (let y = 0; y < H; y++) {
      const p = dist + H - y, q = p + 1000000;
      if (h2(q, 1) < .6) { ctx.fillStyle = A.speck; ctx.fillRect(Math.floor(h2(q, 2) * W), y, 1, 1); }
      if (h2(q, 3) < .3) { const sx = Math.floor(h2(q, 4) * W); if (sx < RL - 3 || sx > RR + 1) { ctx.fillStyle = A.speck2; ctx.fillRect(sx, y, 2, 1); } }
      if (A.tiles) {
        ctx.fillStyle = A.seam;
        if (((p % 10) + 10) % 10 === 0) ctx.fillRect(RL + 1, y, RR - RL - 2, 1);
        else { const off = (Math.floor(p / 10) & 1) ? 4 : 13; for (let sx = RL + off; sx < RR - 1; sx += 18) ctx.fillRect(sx, y, 1, 1); }
      }
      if (h2(q, 7) < .45) { ctx.fillStyle = A.roadSpeck; ctx.fillRect(RL + 2 + Math.floor(h2(q, 8) * (RR - RL - 4)), y, 1, 1); }
      const wl = Math.floor(h2(q >> 2, 5) * 3), wr = Math.floor(h2(q >> 2, 6) * 3);
      ctx.fillStyle = A.edge; ctx.fillRect(RL - wl, y, 1 + wl, 1); ctx.fillRect(RR - 1, y, 1 + wr, 1);
    }
    // graves, trees and candles in the verges
    const lights = [];
    const PS = 14, lo = Math.floor(dist / PS) - 2, hi = Math.ceil((dist + H) / PS) + 2;
    for (let s = lo; s <= hi; s++) for (let side = 0; side < 2; side++) {
      const q = s + 500000;
      if (h2(q, 10 + side) > A.density) continue;
      const name = A.props[Math.floor(h2(q, 12 + side) * A.props.length)], pr = PROPS[name];
      const spr = sprite(pr.map, A.pc, 'p' + S.region + name);
      const room = side ? (W - RR - 1 - spr.width) : (RL - 2 - spr.width);
      if (room < 0) continue;
      const x = side ? RR + 1 + Math.floor(h2(q, 14 + side) * (room + 1)) : 1 + Math.floor(h2(q, 14 + side) * (room + 1));
      const base = Math.round(H - (s * PS + Math.floor(h2(q, 16 + side) * 8) - dist));
      const y = base - spr.height;
      if (y > H || base < 0) continue;
      ctx.drawImage(spr, x, y);
      if (pr.glow) lights.push([x + pr.glow[0], y + pr.glow[1], pr.glow[2] + (noMotion() ? 0 : Math.sin(realT / 110 + s) * 1.2), .85, pr.warm]);
    }
    return lights;
  }

  // How far through its animation a unit is, and where that puts it.
  function animate(u) {
    let x = u.bx, y = u.by;
    if (u.march) {
      const k = clamp((P.t - u.march.t0) / u.march.dur, 0, 1), e = k < .5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
      x = lerp(u.march.fx, u.bx, e); y = lerp(u.march.fy, u.by, e);
      if (k >= 1) u.march = null;
    }
    const a = u.anim;
    if (a) {
      const e = P.t - a.t0;
      if (a.share != null) {
        const total = a.out + a.hold + a.back;
        if (e >= total) u.anim = null;
        else {
          let k;
          if (e < a.out) { const q = e / a.out; k = q * q; }
          else if (e < a.out + a.hold) k = 1;
          else { const q = (e - a.out - a.hold) / a.back; k = 1 - q * (2 - q); }
          x = lerp(u.bx, lerp(u.bx, a.tx, a.share), k);
          y = lerp(u.by, lerp(u.by, a.ty, a.share), k);
        }
      } else if (a.hop != null) {
        if (e >= a.dur) u.anim = null; else y += Math.round(Math.sin(Math.PI * e / a.dur) * a.hop);
      } else if (a.dodge != null) {
        if (e >= a.dur) u.anim = null; else x += Math.round(Math.sin(Math.PI * e / a.dur) * 5 * a.dodge);
      }
    }
    if (u.recoil) {
      const e = P.t - u.recoil.t0;
      if (e > 200) u.recoil = null;
      else if (sideOn()) x += Math.round(Math.sin(Math.PI * e / 200) * 2 * (u.hero ? -1 : 1));
      else y += Math.round(Math.sin(Math.PI * e / 200) * 2 * u.recoil.dir), x += Math.round(Math.sin(Math.PI * e / 100) * (e < 100 ? 1 : 0));
    }
    u.x = x; u.y = y;
  }

  function drawUnit(u, t) {
    if (u.gone) return;
    const s = sprOf(u), k = u.boss ? 2 : 1, w = s.width * k, hh = s.height * k;
    let alpha = u.alpha, dark = false, dy = 0;
    if (u.fade) {
      const q = clamp((P.t - u.fade.t0) / u.fade.dur, 0, 1);
      if (u.fade.rise) { alpha = q; dy = Math.round((1 - q) * (u.fade.enter ? -4 : 3)); if (q >= 1) { u.fade = null; u.alpha = 1; } }
      else if (u.hero) { alpha = 1 - q * 0.45; dark = q > 0.3; }
      else { alpha = 1 - q; dy = Math.round(q * 3); if (q >= 1) u.gone = true; }
    } else if (!u.alive) { if (u.hero) { alpha = .7; dark = true; } else { u.gone = true; return; } }
    // Hidden: only a faint shimmer shows where it waits
    if (u.alive && u.st.hidden) alpha *= noMotion() ? 0.35 : 0.28 + 0.1 * Math.sin(realT / 260 + u.slot);
    if (alpha <= 0) return;
    // a slow breathing bob, and a walk while the party travels
    const walking = u.hero && P.t < S.walkUntil && u.alive;
    if (walking) { const ph = Math.floor((P.t / 140) + u.slot) % 4; u.step = ph === 1 ? 1 : ph === 3 ? 2 : 0; dy += ph % 2 ? -1 : 0; }
    else u.step = 0;
    const bob = (!noMotion() && u.alive && !walking && Math.floor(realT / 520 + u.phase) % 2) ? -1 : 0;
    const x = Math.round(leftOf(u, s)), y = Math.round(u.y - hh) + bob + dy + (dark ? 2 : 0);
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,.5)';
    ctx.fillRect(Math.round(u.x - w * .32), Math.round(u.y), Math.round(w * .64), 1);
    ctx.fillRect(Math.round(u.x - w * .22), Math.round(u.y) + 1, Math.round(w * .44), 1);
    ctx.globalAlpha = alpha;
    // outlines: the one acting, a guard, a charging foe
    let ring = null;
    if (u.alive && u.st.charging) ring = (Math.floor(realT / 160) % 2) ? '#ff5a4a' : '#a82a20';
    else if (u.alive && u.st.guarding) ring = '#8cc4e6';
    else if (u === S.active && u.alive && B && !B.over) ring = u.hero ? '#f4a646' : '#e05a4a';
    if (ring) {
      const o = tinted(s, ring, 'o:' + ring + (u.hero ? 'h' : 'f') + u.key + ':' + (u.step || 0));
      for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) ctx.drawImage(o, x + ox, y + oy, w, hh);
    }
    if (dark) ctx.drawImage(tinted(s, '#4a4258', 'd:' + (u.hero ? 'h' : 'f') + u.key), x, y, w, hh);
    else ctx.drawImage(s, x, y, w, hh);
    if (P.t < u.flashUntil) ctx.drawImage(tinted(s, '#ffffff', 'w:' + (u.hero ? 'h' : 'f') + u.key + ':' + (u.step || 0)), x, y, w, hh);
    ctx.globalAlpha = 1;
  }

  function drawFx(list) {
    const lights = [];
    S.fx = S.fx.filter(f => P.t - f.t0 < f.dur);
    for (const f of S.fx) {
      const q = clamp((P.t - f.t0) / f.dur, 0, 1);
      if (q < 0) continue;
      switch (f.type) {
        case 'proj': {
          const x = lerp(f.x0, f.x1, q), y = lerp(f.y0, f.y1, q) - Math.sin(Math.PI * q) * f.arcH;
          const px = lerp(f.x0, f.x1, Math.max(0, q - .08)), py = lerp(f.y0, f.y1, Math.max(0, q - .08)) - Math.sin(Math.PI * Math.max(0, q - .08)) * f.arcH;
          if (f.style === 'bolt') {
            ctx.strokeStyle = f.color; ctx.lineWidth = f.big ? 2 : 1;
            ctx.beginPath(); ctx.moveTo(Math.round(px) + .5, Math.round(py) + .5); ctx.lineTo(Math.round(x) + .5, Math.round(y) + .5); ctx.stroke();
            ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
            if (f.big) lights.push([x, y, 10, .8, true]);
          } else if (f.style === 'bone') {
            const a = q * 14;
            ctx.fillStyle = f.color;
            ctx.fillRect(Math.round(x + Math.cos(a) * 2), Math.round(y + Math.sin(a) * 2), 1, 1);
            ctx.fillRect(Math.round(x - Math.cos(a) * 2), Math.round(y - Math.sin(a) * 2), 1, 1);
            ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
          } else if (f.style === 'ring') {
            ctx.strokeStyle = f.color; ctx.globalAlpha = .9; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(Math.round(x), Math.round(y), 2 + q * 3, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
          } else {
            ctx.fillStyle = f.color;
            ctx.globalAlpha = .45; ctx.fillRect(Math.round(px) - 1, Math.round(py) - 1, 2, 2); ctx.globalAlpha = 1;
            ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3);
            ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
            if (Math.random() < .5) S.parts.push({ x, y, vx: vrand(-6, 6), vy: vrand(-6, 6), life: 260, max: 260, color: f.color, glow: true, g: 0 });
          }
          if (f.light) lights.push([x, y, f.light, .9, false]);
          break;
        }
        case 'slash': {
          const n = 7, r = f.arc === 'wide' ? 12 : f.arc === 'smash' ? 6 : 8;
          ctx.fillStyle = f.color;
          const upto = Math.ceil(q * n * 1.6);
          for (let k = Math.max(0, upto - 5); k < Math.min(n, upto); k++) {
            const a = (f.flip ? -1 : 1) * (-1.1 + k * (2.2 / (n - 1)));
            if (f.arc === 'smash') { ctx.fillRect(Math.round(f.x + Math.cos(k) * r * q), Math.round(f.y + Math.sin(k) * r * q), 1, 1); continue; }
            if (f.arc === 'claw') { for (let c = -1; c <= 1; c++) ctx.fillRect(Math.round(f.x + c * 3 + a * 2), Math.round(f.y - 4 + k * 1.3), 1, 1); continue; }
            ctx.fillRect(Math.round(f.x + Math.sin(a) * r), Math.round(f.y - Math.cos(a) * r * .55 + 2), f.arc === 'wide' ? 2 : 1, 1);
          }
          break;
        }
        case 'ring': {
          const r = lerp(f.r0, f.r1, q);
          ctx.strokeStyle = f.color; ctx.globalAlpha = 1 - q; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.ellipse(Math.round(f.x) + .5, Math.round(f.y) + .5, r, r * .55, 0, 0, Math.PI * 2); ctx.stroke();
          ctx.globalAlpha = 1;
          break;
        }
        case 'pillar': {
          const a = Math.sin(Math.PI * q), w = Math.max(1, Math.round(f.w * a));
          ctx.globalAlpha = a * .85; ctx.fillStyle = f.color;
          ctx.fillRect(Math.round(f.x - w / 2), 0, w, Math.round(f.y));
          ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(f.x) - (w > 4 ? 1 : 0), 0, w > 4 ? 2 : 1, Math.round(f.y));
          ctx.globalAlpha = 1;
          lights.push([f.x, f.y - 10, 26 * a + 4, .9, !f.water]);
          if (Math.random() < .6) S.parts.push({ x: f.x + vrand(-f.w / 2, f.w / 2), y: f.y - vrand(0, 30), vx: 0, vy: f.water ? 30 : -30, life: 400, max: 400, color: f.color, glow: true, g: 0 });
          break;
        }
        case 'rune': {
          const y = f.y - (1 - q) * 6;
          ctx.globalAlpha = Math.sin(Math.PI * q); ctx.fillStyle = f.color;
          const m = UI_ICONS.doom.map;
          for (let ry = 0; ry < m.length; ry++) for (let rx = 0; rx < m[ry].length; rx++) if (m[ry][rx] !== '.') { ctx.fillStyle = m[ry][rx] === 'k' ? '#24103a' : f.color; ctx.fillRect(Math.round(f.x - 3 + rx), Math.round(y - 7 + ry), 1, 1); }
          ctx.globalAlpha = 1;
          lights.push([f.x, y - 3, 10, .6, false]);
          break;
        }
        // 'reticle' and 'link' are drawn above the darkness, in drawFxTop
        case 'light': lights.push([f.x, f.y, f.r * (1 - q * .6), .9 * (1 - q), f.warm]); break;
      }
    }
    return lights;
  }

  function punch(x, y, r, a) {
    if (r <= 0) return;
    const g = mctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(.55, `rgba(0,0,0,${a * .7})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    mctx.fillStyle = g; mctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // A warm glow, or one in a colour of its own (gear that glows: '#9ae06a' and the like).
  function warm(x, y, r, a, col) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    if (typeof col === 'string') { const n = parseInt(col.slice(1), 16), c = `${n >> 16},${(n >> 8) & 255},${n & 255}`; g.addColorStop(0, `rgba(${c},${a})`); g.addColorStop(.6, `rgba(${c},${a * .35})`); g.addColorStop(1, `rgba(${c},0)`); }
    else { g.addColorStop(0, `rgba(255,160,70,${a})`); g.addColorStop(.6, `rgba(230,110,60,${a * .35})`); g.addColorStop(1, 'rgba(230,110,60,0)'); }
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  function updParts(dt) {
    const A = REGION_ART[S.region];
    // weather
    // mist (Gravefields), rain (Drowned Chapel), falling leaves (Thornwood), rising embers (Ashen Keep) and drifting
    // tallow motes (Hollow Throne)
    const rate = { mist: 6, rain: 60, leaves: 9, embers: 16, motes: 7 }[A.particle] || 0;
    let n = rate * dt / 1000 * (noMotion() ? .3 : 1);
    while (n > 0) {
      if (Math.random() < n) {
        if (A.particle === 'rain') S.amb.push({ x: vrand(0, S.W + 30), y: -4, vx: -16, vy: 130, life: 3000, c: 'rgba(140,180,210,.3)', w: 1, h: 3 });
        else if (A.particle === 'leaves') S.amb.push({ x: vrand(0, S.W + 20), y: -3, vx: vrand(-9, -2), vy: vrand(10, 20), life: 9000, c: Math.random() < .6 ? 'rgba(120,150,70,.55)' : 'rgba(160,110,60,.5)', w: Math.random() < .3 ? 2 : 1, h: 1, sway: vrand(0, 6) });
        else if (A.particle === 'embers') S.amb.push({ x: vrand(0, S.W), y: S.H + 2, vx: vrand(-4, 4), vy: vrand(-28, -12), life: vrand(2500, 5000), c: Math.random() < .5 ? 'rgba(255,150,60,.75)' : 'rgba(255,200,110,.6)', w: 1, h: 1, sway: vrand(0, 6) });
        else if (A.particle === 'motes') S.amb.push({ x: vrand(0, S.W), y: vrand(0, S.H), vx: vrand(-2, 2), vy: vrand(-6, -2), life: vrand(3000, 6000), c: Math.random() < .7 ? 'rgba(255,232,180,.28)' : 'rgba(200,180,255,.22)', w: 1, h: 1 });
        else S.amb.push({ x: vrand(-4, S.W), y: vrand(0, S.H), vx: vrand(-3, 3), vy: vrand(-1, 1), life: vrand(3000, 6000), c: 'rgba(170,180,190,.14)', w: 3, h: 1 });
      }
      n -= 1;
    }
    const scroll = P.t < S.walkUntil ? 14 : 0;
    for (const p of S.amb) { p.x += (p.vx - (sideOn() ? scroll : 0) + (p.sway != null ? Math.sin(realT / 700 + p.sway) * 6 : 0)) * dt / 1000; p.y += (p.vy + (sideOn() ? 0 : scroll)) * dt / 1000; p.life -= dt; }
    S.amb = S.amb.filter(p => p.life > 0 && p.y < S.H + 6 && p.x > -6 && p.x < S.W + 34);
    // sparks, motes and ash run on the play clock
    const pdt = P.paused ? 0 : dt * P.speed * TEMPO;
    for (const p of S.parts) { p.vy += (p.g || 0) * pdt / 1000; p.x += p.vx * pdt / 1000; p.y += p.vy * pdt / 1000; p.life -= pdt; }
    S.parts = S.parts.filter(p => p.life > 0);
    if (S.parts.length > 500) S.parts.splice(0, S.parts.length - 500);
  }

  function render() {
    const A = REGION_ART[S.region], W = S.W, H = S.H;
    const lights = drawGround();
    for (const u of S.list) animate(u);
    const order = S.list.slice().sort((a, b) => a.y - b.y);
    for (const u of order) drawUnit(u);
    const fxl = drawFx();
    // lights: each hero carries a small lantern, the Lamplighter a big one; foes glow faintly
    const flick = noMotion() ? 0 : Math.sin(realT / 90) * .8 + Math.sin(realT / 42) * .5;
    lights.push(sideOn() ? [W / 2, H * .6, W * .45, .32, false] : [W / 2, H * .52, W * .62, .32, false]);
    for (const u of S.list) {
      if (!u.alive && u.gone) continue;
      const [x, y] = midOf(u);
      if (u.hero) {
        if (!u.alive) continue;
        lights.push([x, y, 20 + flick, .8, false]);
        const s = sprOf(u), L = lampOf(u), x0 = leftOf(u, s), y0 = u.y - s.height;
        if (L) lights.push([x0 + L[0], y0 + L[1], 40 + flick * 2, 1, true]);
        // Gear that glows: rare blades, embers, relics
        for (const g of s.glows || []) lights.push([x0 + g[0], y0 + g[1], g[2] + flick * 0.6, 0.85, g[3]]);
      } else if (u.alive) lights.push([x, y, (u.boss ? 34 : 22) + flick * .5, u.boss ? .8 : .72, false]);
      if (u === S.active && u.alive && B && !B.over) lights.push([x, y, 26, .9, u.hero]);
    }
    mctx.globalCompositeOperation = 'source-over'; mctx.clearRect(0, 0, W, H);
    mctx.globalAlpha = A.dark; mctx.fillStyle = A.night; mctx.fillRect(0, 0, W, H); mctx.globalAlpha = 1;
    mctx.globalCompositeOperation = 'destination-out';
    for (const l of lights) punch(l[0], l[1], l[2], l[3]);
    for (const l of fxl) punch(l[0], l[1], l[2], l[3]);
    for (const p of S.parts) if (p.glow) { mctx.globalAlpha = .45 * clamp(p.life / p.max, 0, 1); mctx.fillRect(Math.round(p.x) - 1, Math.round(p.y) - 1, 3, 3); }
    mctx.globalAlpha = 1;
    ctx.drawImage(mask, 0, 0);
    ctx.globalCompositeOperation = 'lighter';
    for (const l of lights) if (l[4]) warm(l[0], l[1], l[2] * 1.15, .24, l[4]);
    for (const l of fxl) if (l[4]) warm(l[0], l[1], l[2], .3 * l[3]);
    ctx.globalCompositeOperation = 'source-over';
    // the Lamplighter's flame
    for (const u of S.list) {
      const L = u.hero && u.alive && lampOf(u);
      if (L) { const s = sprOf(u); ctx.fillStyle = '#fff3c8'; ctx.fillRect(Math.round(leftOf(u, s) + L[0]), Math.round(u.y - s.height + L[1]), 1, 1); }
    }
    // effects that glow above the dark
    drawFxTop();
    for (const p of S.parts) {
      ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
      ctx.fillStyle = p.color; ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
    }
    for (const p of S.amb) { ctx.globalAlpha = clamp(p.life / 1000, 0, 1); ctx.fillStyle = p.c; ctx.fillRect(Math.round(p.x), Math.round(p.y), p.w, p.h); }
    ctx.globalAlpha = 1;
    if (S.flash) {
      const q = (P.t - S.flash.t0) / S.flash.dur;
      if (q >= 1) S.flash = null;
      else { ctx.globalAlpha = S.flash.alpha * (1 - q); ctx.fillStyle = S.flash.color; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
    }
    if (B && B.enrage) { ctx.globalAlpha = .08 + .04 * Math.sin(realT / 300); ctx.fillStyle = '#e5574a'; if (sideOn()) ctx.fillRect(Math.round(W / 2), 0, W, H); else ctx.fillRect(0, 0, W, S.rows[2] + 6); ctx.globalAlpha = 1; }
  }
  // Projectiles and slashes drawn again above the darkness, so they glow.
  function drawFxTop() {
    for (const f of S.fx) {
      const q = clamp((P.t - f.t0) / f.dur, 0, 1);
      if (f.type === 'reticle') {
        const [x, y] = midOf(f.u), r = Math.round(lerp(11, 7, Math.min(1, q * 3)));
        ctx.fillStyle = f.color; ctx.globalAlpha = Math.min(1, (1 - q) * 3);
        for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
          const cx = Math.round(x + dx * r), cy = Math.round(y + dy * r);
          ctx.fillRect(dx < 0 ? cx : cx - 2, cy, 3, 1); ctx.fillRect(cx, dy < 0 ? cy : cy - 2, 1, 3);
        }
        ctx.globalAlpha = 1;
        continue;
      }
      if (f.type === 'link') {
        const [ax, ay] = midOf(f.a), [bx, by] = midOf(f.b);
        ctx.strokeStyle = f.color; ctx.globalAlpha = 1 - q; ctx.setLineDash([2, 2]); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(Math.round(ax) + .5, Math.round(ay) + .5); ctx.lineTo(Math.round(bx) + .5, Math.round(by) + .5); ctx.stroke();
        ctx.setLineDash([]); ctx.globalAlpha = 1;
        continue;
      }
      if (f.type !== 'proj' && f.type !== 'slash') continue;
      if (f.type === 'proj') {
        const x = lerp(f.x0, f.x1, q), y = lerp(f.y0, f.y1, q) - Math.sin(Math.PI * q) * f.arcH;
        ctx.fillStyle = f.style === 'orb' ? f.color : '#ffffff';
        ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
      } else {
        ctx.globalAlpha = 1 - q; ctx.fillStyle = '#ffffff';
        ctx.fillRect(Math.round(f.x), Math.round(f.y), 1, 1);
        ctx.globalAlpha = 1;
      }
    }
  }

  function loop(ts) {
    const dt = Math.min(50, ts - last || 0); last = ts; realT = ts;
    if (!P.paused) P.t += dt * P.speed * TEMPO;
    if (P.t < S.walkUntil && !P.paused) S.dist += 24 * dt * P.speed * TEMPO / 1000;
    // the road follows the formation when it steps aside for the turn flags
    const rc = field().cx;
    S.roadCx = S.roadCx == null ? rc : S.roadCx + (rc - S.roadCx) * Math.min(1, dt / 300);
    runDue();
    step();
    updParts(dt);
    render();
    requestAnimationFrame(loop);
  }

  // ── controls
  function setSpeed(n) {
    P.speed = n;
    frame.style.setProperty('--speed', n);
  }
  let onPause = null;
  function setPaused(v) {
    P.paused = v;
    frame.classList.toggle('paused', v);
    if (onPause) onPause(v);
  }
  // Continuous play, or one turn at a time.
  function play() { stepping = false; setPaused(false); }
  function stepOnce() {
    if (!B || B.over) return;
    // In the middle of a turn, finish that turn and stop. Between turns, play the next one and stop.
    B.stepped = B.started && P.t < B.turnUntil;
    stepping = true;
    setPaused(false);
  }
  // The party waits on the road with no foes in sight: the camp, before a march.
  function idle(region = 0) {
    B = null; queue = []; S.fx = []; S.active = null; stepping = false; clearFlags(); hideBanner();
    S.region = region; S.mode = 'camp'; resize(); setMusicKey(HEARTH_SCALE); platesEl.classList.remove('away');
    const form = typeof Save !== 'undefined' && Save.state ? Save.state.party.map(id => Save.char(id)) : PARTY.map(k => ({ cls: k, name: CLASSES[k].name }));
    setUnits(form.map((c, i) => (c ? { id: 'p' + i, side: 0, slot: i, key: c.cls, name: c.name, look: c.gear && typeof Items !== 'undefined' ? Items.look(c) : null, hp: 1, maxHp: 1, mp: 0, maxMp: 0, alive: true, st: {}, rules: [] } : null)).filter(Boolean));
    for (const u of S.list) u.plate.hidden = true;
    hudEl.hidden = true; $('#controls').hidden = true;
    endAim(true);
    if (trayEl) trayEl.replaceChildren();
  }
  function walk(ms) { S.walkUntil = P.t + ms; }
  // Between battles on a trip: the fallen foes fade, everyone stands up again, and the party walks on for ms of play
  // time (it scales with the speed), then done() starts the next battle where they stop.
  function travel(ms, done) {
    if (!B) { if (done) done(); return; }
    const res = B.res;
    B = null; queue = []; S.fx = []; S.active = null; stepping = false; clearFlags(); hideBanner(); endAim(true);
    hudEl.hidden = true;
    setUnits(res.final.filter(u => u.side === 0 && !u.thrall).map(u => Object.assign({}, u, { alive: true, hp: u.maxHp, st: {} })));
    platesEl.classList.add('away');
    S.walkUntil = P.t + ms;
    at(P.t + ms, () => { if (done) done(); });
  }
  function init() {
    resize();
    Frame.on(resize); // the frame changed size, or the screen moved between the column and the whole stage
    requestAnimationFrame(loop);
  }
  return {
    init, run, skip, idle, walk, travel, setSpeed, setPaused, play, stepOnce, resize, FX,
    set onEvent(fn) { onEvent = fn; },
    // items: use the item in a loadout slot (on a hero's id, for an item that needs one), as the player does
    useItem, tapItem,
    set onPause(fn) { onPause = fn; },
    get paused() { return P.paused; }, get speed() { return P.speed; }, get stepping() { return stepping; },
    get battle() { return B; }, get busy() { return !!B && !B.over; },
    // for tests: how far the current battle has played
    progress: () => (B ? { i: B.i, of: B.res.log.length, round: B.round, over: B.over, t: Math.round(P.t) } : null),
  };
})();
