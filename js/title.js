'use strict';
// Lantern Road · the title and loading screen (screen 1; docs/mockups/title.html). It opens every boot, over the whole
// landscape frame (js/frame.js): the party walks the Lantern Road through the Gravefields under a full moon while the
// game loads behind it (the fonts, the sprites, the save and its cloud copy), and the road's ten lanterns light, near
// to far, as the loading goes. It shows for at least 1.5 seconds, so the lanterns have time to light. Then the
// horizon glows, Tap to begin pulses, and one tap anywhere starts the sound and opens the game (js/main.js).
// The server pill opens the server picker, a placeholder for multiplayer: each server keeps its own save
// (js/save.js). A server with a save switches at once; a new one asks first, then starts a fresh save there. Either
// way the title stays up, and the next tap begins on that server.

const BUILD = 'Prototype · 2026-11-04'; // the build tag in the corner, for play-testing: change it with each build

const Title = (() => {
  const MIN_MS = 1500; // the bar never fills faster than this

  // ── the scene, in the battle's pixels (3× in the frame). t runs along the road, from the horizon (0) to the bottom
  // edge (1). VW follows the frame's width; the mockup's 282 is a phone on its side.
  const VH = 130, HZ = 56;
  let VW = 282;
  const A = REGION_ART[0];
  const prop = k => sprite(PROPS[k].map, A.pc, 'title:' + k);
  const POSTS = {
    big: { map: ['..kkk..', '.kyYyk.', '.kYwYk.', '.kyYyk.', '..kkk..', '...d...', '...d...', '...d...', '...d...', '...d...', '...d...', '...d...', '...d...', '...d...', '...d...', '...d...', '...d...', '..ddd..', '.ddddd.'], lit: [3, 2] },
    mid: { map: ['.kkk.', 'kyYyk', 'kYwYk', '.kkk.', '..d..', '..d..', '..d..', '..d..', '..d..', '..d..', '.ddd.'], lit: [2, 2] },
    small: { map: ['.k.', 'kYk', '.k.', '.d.', '.d.', '.d.', 'ddd'], lit: [1, 1] },
    tiny: { map: ['Y', 'd', 'd'], lit: [0, 0] },
  };
  const ON = { k: '#2e2219', y: '#f4a646', Y: '#ffd68a', w: '#fff6e0', d: '#3a2a1c' }, OFF = { k: '#16121a', y: '#2a2630', Y: '#34303a', w: '#3a3640', d: '#221a16' };
  const postImg = (kind, on) => sprite(POSTS[kind].map, on ? ON : OFF, 'title-post:' + kind + on);
  const road = t => ({ x: VW * 0.532 - 62 * Math.sin(Math.PI * Math.pow(t, 0.9)), w: 1.5 + 104 * Math.pow(t, 1.75), y: HZ + t * (VH - HZ) });
  const tOf = y => (y - HZ) / (VH - HZ);
  // the lanterns, near to far, so they light in that order
  const LAMPS = [0.9, 0.7, 0.55, 0.43, 0.34, 0.26, 0.2, 0.145, 0.1, 0.065].map((t, i) => ({ t, side: i % 2 ? 1 : -1, kind: t >= 0.6 ? 'big' : t >= 0.3 ? 'mid' : t >= 0.12 ? 'small' : 'tiny' }));
  const WALKERS = [['lamplighter', 0.27, -6], ['warden', 0.33, 7], ['pilgrim', 0.39, -7], ['sellsword', 0.45, 7], ['hexblade', 0.51, -7], ['crossbowman', 0.57, 7]];
  const SIDE_PROPS = [];
  for (let i = 0; i < 46; i++) { const t = 0.04 + h2(i, 61) * 0.9, side = h2(i, 62) > 0.5 ? 1 : -1, k = ['grave', 'grave', 'cross', 'stone', 'grave', 'deadtree', 'grave', 'cross'][Math.floor(h2(i, 63) * 8)]; SIDE_PROPS.push({ t, side, k, off: 4 + h2(i, 64) * (14 + 70 * t) }); }
  const lookOf = cls => [Items.starter(cls, 1).id, null, null];

  function disc(x, cx, cy, r, col) { x.fillStyle = col; for (let dy = -r; dy <= r; dy++) { const w = Math.floor(Math.sqrt(r * r - dy * dy + r * 0.6)); x.fillRect(cx - w, cy + dy, w * 2 + 1, 1); } }
  function glow(x, gx, gy, r, rgba) { const g = x.createRadialGradient(gx, gy, 0, gx, gy, r); g.addColorStop(0, rgba); g.addColorStop(1, rgba.replace(/[\d.]+\)$/, '0)')); x.fillStyle = g; x.fillRect(gx - r, gy - r, r * 2, r * 2); }
  function pool(x, cx, cy, r, rgba) { x.save(); x.translate(cx, cy); x.scale(1, 0.32); glow(x, 0, 0, r, rgba); x.restore(); }
  function shadow(x, cx, by, w) { x.globalAlpha = 0.45; x.fillStyle = '#050308'; x.fillRect(Math.round(cx - w / 2), by, Math.round(w), 1); x.fillRect(Math.round(cx - w / 2) + 1, by + 1, Math.round(w) - 2, 1); x.globalAlpha = 1; }

  // p: how far the loading is (0–1): that many lanterns are lit. t: the clock, for the flicker and the walk.
  function paint(x, p, t) {
    // sky, stars and a full moon
    const g = x.createLinearGradient(0, 0, 0, HZ + 4); g.addColorStop(0, '#05030a'); g.addColorStop(0.55, '#0e0918'); g.addColorStop(1, '#1d1429');
    x.fillStyle = g; x.fillRect(0, 0, VW, VH);
    for (let i = 0; i < 130 * VW / 282; i++) { const sx = Math.floor(h2(i, 7) * VW), sy = Math.floor(h2(i, 8) * (HZ - 6)), b = h2(i, 9), tw = b > 0.93 && Math.sin(t / 600 + i * 3) > 0.4; x.fillStyle = b > 0.87 ? (tw ? '#fff8e0' : '#d8ccb4') : b > 0.6 ? '#5a4e6c' : '#2c2438'; x.fillRect(sx, sy, 1, 1); }
    const mx = Math.round(VW * 0.823);
    glow(x, mx, 24, 44, 'rgba(232,220,196,.10)'); glow(x, mx, 24, 18, 'rgba(232,220,196,.16)');
    disc(x, mx, 24, 9, '#ece0c4'); disc(x, mx + 2, 22, 3, '#d8ccae'); disc(x, mx - 4, 27, 2, '#d8ccae'); x.fillStyle = '#d8ccae'; x.fillRect(mx + 4, 28, 2, 1); x.fillRect(mx - 3, 19, 1, 1);
    // two ridges of hills, dead wood on the horizon, and the mist
    x.fillStyle = '#0d0a14'; for (let X = 0; X < VW; X++) { const y = HZ - 9 + Math.round(4 * Math.sin(X / 47 + 1) + 2 * Math.sin(X / 17)); x.fillRect(X, y, 1, HZ + 3 - y); }
    x.fillStyle = '#100c18'; for (let X = 0; X < VW; X++) { const y = HZ - 4 + Math.round(2 * Math.sin(X / 29 + 2) + h2(X, 3)); x.fillRect(X, y, 1, HZ + 3 - y); }
    const tree = tinted(prop('deadtree'), '#0b0812');
    for (let i = 0; i < VW / 7.4 + 2; i++) { const tx = Math.floor(i * 7.4 + h2(i, 4) * 6) - 4; if (Math.abs(tx + 4 - road(0).x) < 9 || h2(i, 6) < 0.35) continue; x.drawImage(tree, tx, HZ + 1 - tree.height - Math.floor(h2(i, 2) * 3)); }
    // the ground
    x.fillStyle = '#121510'; x.fillRect(0, HZ, VW, VH - HZ);
    for (let i = 0; i < 700 * VW / 282; i++) { const px = Math.floor(h2(i, 11) * VW), py = HZ + Math.floor(h2(i, 12) * (VH - HZ)); x.fillStyle = h2(i, 13) > 0.5 ? '#1a1e17' : '#0f120d'; x.fillRect(px, py, 1, 1); }
    // the road, row by row
    for (let y = HZ; y < VH; y++) {
      const r = road(tOf(y)), x0 = Math.round(r.x - r.w / 2), w = Math.max(1, Math.round(r.w));
      x.fillStyle = A.edge; x.fillRect(x0 - 1, y, w + 2, 1);
      x.fillStyle = A.road; x.fillRect(x0, y, w, 1);
      for (let k = 0; k < w / 6; k++) if (h2(y * 31 + k, 71) > 0.55) { x.fillStyle = A.roadSpeck; x.fillRect(x0 + Math.floor(h2(y * 31 + k, 72) * w), y, 1, 1); }
    }
    const mist = x.createLinearGradient(0, HZ - 7, 0, HZ + 10); mist.addColorStop(0, 'rgba(70,58,100,0)'); mist.addColorStop(0.5, 'rgba(70,58,100,.26)'); mist.addColorStop(1, 'rgba(70,58,100,0)');
    x.fillStyle = mist; x.fillRect(0, HZ - 7, VW, 17);
    // back to front: graves along the road, the lanterns, the party
    const lit = Math.floor(p * LAMPS.length + 1e-6), L = [], P = [], items = [];
    for (const s of SIDE_PROPS) {
      const r = road(s.t), img = prop(s.k), px = Math.round(r.x + s.side * (r.w / 2 + s.off));
      items.push({ y: r.y, f: () => { x.drawImage(img, px - Math.floor(img.width / 2), Math.round(r.y) - img.height + 1); if (s.t < 0.5) { x.globalAlpha = 0.5 - s.t * 0.8; x.drawImage(tinted(img, '#0b0812'), px - Math.floor(img.width / 2), Math.round(r.y) - img.height + 1); x.globalAlpha = 1; } } });
    }
    LAMPS.forEach((l, i) => {
      const r = road(l.t), on = i < lit, img = postImg(l.kind, on), px = Math.round(r.x + l.side * (r.w / 2 + 2 + 5 * l.t)), by = Math.round(r.y);
      items.push({ y: by, f: () => {
        x.drawImage(img, px - Math.floor(img.width / 2), by - img.height + 1);
        if (on) { const [lx, ly] = POSTS[l.kind].lit, gx = px - Math.floor(img.width / 2) + lx + 0.5, gy = by - img.height + 1 + ly + 0.5; L.push([gx, gy, 3 + 24 * l.t, 0.35 + 0.3 * l.t]); P.push([r.x + l.side * r.w * 0.2, by, 8 + 46 * l.t]); }
      } });
    });
    for (const [cls, pt, dx] of WALKERS) {
      const r = road(pt), sp = heroSprite(cls, Math.floor(t / 260) % 2, lookOf(cls)), px = Math.round(r.x + dx), by = Math.round(r.y);
      items.push({ y: by, f: () => { shadow(x, px, by, 8); x.drawImage(sp, px - Math.round(sp.width / 2), by - sp.height + 1); if (cls === 'lamplighter') L.push([px + 3, by - 12, 16, 0.6]); } });
    }
    items.sort((a, b) => a.y - b.y);
    for (const it of items) it.f();
    // dark closing in, then the light
    const dk = x.createRadialGradient(VW * 0.497, 100, 30, VW * 0.497, 100, 230);
    dk.addColorStop(0, 'rgba(5,3,9,.15)'); dk.addColorStop(0.55, 'rgba(5,3,9,.4)'); dk.addColorStop(1, 'rgba(5,3,9,.85)');
    x.fillStyle = dk; x.fillRect(0, 0, VW, VH);
    x.globalCompositeOperation = 'lighter';
    for (const [px, py, r] of P) pool(x, px, py, r, 'rgba(244,150,70,.30)');
    for (const [gx, gy, r, a] of L) { glow(x, gx, gy, r, `rgba(255,180,90,${(a * (0.9 + Math.sin(t / 150 + gx) * 0.1)).toFixed(3)})`); glow(x, gx, gy, Math.max(1.5, r * 0.2), `rgba(255,230,170,${(0.25 + 0.3 * a).toFixed(2)})`); }
    if (p >= 1) { const f = 0.16 + 0.05 * Math.sin(t / 400); glow(x, road(0).x, HZ - 1, 18, `rgba(244,166,70,${f.toFixed(3)})`); }
    x.globalCompositeOperation = 'source-over';
    // motes drifting in the lantern light
    for (let i = 0; i < 14; i++) { const q = ((t / 5200) + h2(i, 81)) % 1, mx2 = Math.round(h2(i, 82) * VW + Math.sin(t / 1300 + i) * 6), my = Math.round(VH - q * 70); x.globalAlpha = 0.5 * Math.sin(q * Math.PI); x.fillStyle = '#ffd68a'; x.fillRect(mx2, my, 1, 1); x.globalAlpha = 1; }
  }

  // ── the screen
  let opts = null, root = null, cv = null, ctx = null, E = {};
  let raf = 0, last = 0, shown = 0, target = 0, loaded = false, ready = false, switching = false, gone = false, preparedFor = null;
  function build() {
    cv = h('canvas', { class: 'tt-cv', 'aria-hidden': 'true' });
    ctx = cv.getContext('2d');
    E.logo = h('div', { class: 'tt-logo' }, h('img', { src: iconURL('lantern'), alt: '' }), h('h1', { text: 'Lantern Road' }));
    E.fill = h('i'); E.pct = h('span', { class: 'tt-pct', text: '0%' });
    E.load = h('div', { class: 'tt-load', role: 'progressbar', 'aria-label': 'Loading' }, h('div', { class: 'tt-lt' }, h('span', { text: 'Lighting the road' }), E.pct), h('div', { class: 'tt-bar' }, E.fill));
    E.tap = h('div', { class: 'tt-tap tt-hide', text: 'Tap to begin' });
    E.dot = h('i', { class: 'tt-dot busy' }); E.sid = h('b');
    E.pill = h('button', { class: 'tt-pill tt-hide', onclick: ev => { ev.stopPropagation(); sfx('click'); openServers(); } }, E.dot, h('span', { text: 'Server' }), E.sid, h('span', { class: 'tt-sw', text: 'Switch' }));
    E.layer = h('div', { class: 'tt-layer' });
    root = h('div', { id: 'title', tabindex: '0', 'aria-label': 'Lantern Road' }, cv, E.logo, E.load, E.tap, E.pill, h('div', { class: 'tt-ver', text: BUILD }), E.layer);
    root.addEventListener('click', ev => { if (!ev.target.closest('.tt-pill, .tt-layer > *')) begin(); });
    root.addEventListener('keydown', ev => {
      if (ev.key === 'Escape' && E.layer.children.length) { ev.stopPropagation(); back(); }
      else if ((ev.key === 'Enter' || ev.key === ' ') && ev.target === root) { ev.preventDefault(); ev.stopPropagation(); begin(); }
    });
    document.getElementById('stage').append(root);
  }
  function fit() {
    if (!root) return;
    VW = Math.ceil(Frame.W / 3);
    cv.width = VW; cv.height = VH; ctx.imageSmoothingEnabled = false;
    cv.style.width = VW * 3 + 'px'; cv.style.left = Math.floor((Frame.W - VW * 3) / 2) + 'px';
  }
  function frame(now) {
    if (gone) return;
    const dt = last ? Math.min(100, now - last) : 16;
    last = now;
    shown = Math.min(target, shown + dt / MIN_MS);
    if (loaded && shown >= 1 && !ready) becomeReady();
    paint(ctx, shown, noMotion() ? 0 : now);
    if (!ready) { E.fill.style.width = (shown * 100).toFixed(1) + '%'; E.pct.textContent = Math.floor(shown * 100) + '%'; }
    raf = requestAnimationFrame(frame);
  }

  // ── loading: the fonts, the sprites and the save, each a share of the bar
  function run(o) {
    opts = o;
    build(); fit(); Frame.on(fit);
    raf = requestAnimationFrame(frame);
    const parts = {}, SHARE = { fonts: 0.3, art: 0.35, save: 0.15, cloud: 0.2 };
    const report = (k, v) => { parts[k] = clamp(v, 0, 1); target = Object.keys(SHARE).reduce((n, j) => n + SHARE[j] * (parts[j] || 0), 0); };
    Promise.all([fonts(v => report('fonts', v)), art(v => report('art', v)), Promise.resolve().then(() => o.load(report))])
      .catch(e => console.warn('Lantern Road: loading', e))
      .then(() => { prepare(true); loaded = true; target = 1; });
  }
  function fonts(report) {
    const F = document.fonts;
    if (!F || typeof F.load !== 'function') { report(1); E.logo.classList.add('tt-in'); return Promise.resolve(); }
    const faces = ['400 16px "Pirata One"', '400 16px Silkscreen', '700 16px Silkscreen', '400 16px Spectral', 'italic 400 16px Spectral', '600 16px Spectral'];
    let n = 0;
    return Promise.all(faces.map(f => F.load(f).catch(() => null).then(() => { report(++n / faces.length); if (/Pirata/.test(f)) E.logo.classList.add('tt-in'); })))
      .then(() => F.ready).then(() => { report(1); E.logo.classList.add('tt-in'); });
  }
  // Every class in its starting gear (back and side, both steps, and the portrait), the Gravefields' foes and props,
  // and the icons: a few each frame, so the bar moves.
  function art(report) {
    const jobs = Object.keys(CLASSES).map(cls => () => { const look = lookOf(cls); for (const s of [0, 1]) { heroSprite(cls, s, look); heroSide(cls, s, look); } portraitURL(cls, true, look); });
    for (const k of new Set(STAGES.filter(s => s.region === 0).flatMap(s => s.foes).filter(Boolean))) jobs.push(() => { foeSprite(k); portraitURL(k, false); });
    jobs.push(() => { for (const k of Object.keys(PROPS)) sprite(PROPS[k].map, A.pc, 'p0' + k); });
    jobs.push(() => { for (const k of Object.keys(UI_ICONS)) iconURL(k); });
    let i = 0;
    return new Promise(done => {
      const step = () => {
        const until = performance.now() + 8;
        while (i < jobs.length && performance.now() < until) { try { jobs[i](); } catch (e) { } i++; }
        report(i / jobs.length);
        if (i < jobs.length) requestAnimationFrame(step); else done();
      };
      requestAnimationFrame(step);
    });
  }
  // The save the title opens on, made ready to play once (js/main.js), whichever server it is.
  function prepare(first) {
    if (Save.state && preparedFor !== Save.state) { opts.prepare(!!first); preparedFor = Save.state; }
  }
  function becomeReady() {
    ready = true;
    E.load.classList.add('tt-hide');
    E.tap.classList.remove('tt-hide'); E.pill.classList.remove('tt-hide');
    root.setAttribute('aria-label', 'Lantern Road. Tap to begin');
    pill();
    // a newer copy from the cloud after the loading: made ready too, and the pill shows it
    Save.onReplace = () => { if (!switching) prepare(false); pill(); };
    try { root.focus({ preventScroll: true }); } catch (e) { }
  }

  // ── one tap: the sound starts (the tap itself lets the browser play it) and the game opens
  function begin() {
    if (!ready || switching || gone || E.layer.children.length) return;
    gone = true;
    sfx('kindle');
    prepare(false);
    root.classList.add('tt-out');
    cancelAnimationFrame(raf);
    setTimeout(() => root.remove(), noMotion() ? 0 : 520);
    opts.begin();
  }

  // ── servers: the pill, the picker and the confirm step
  const ui = { tab: null };
  function pill() {
    E.sid.textContent = 'S' + Save.server;
    E.pill.setAttribute('aria-label', `Server S${Save.server}. Switch`);
  }
  const RANGE = 20;
  const rangeOf = n => Math.floor((n - 1) / RANGE);
  const rangeName = r => `S${r * RANGE + 1}–S${(r + 1) * RANGE}`;
  function openServers() {
    if (!ready || switching) return;
    const L = Save.servers();
    if (!ui.tab) ui.tab = 'r' + rangeOf(L.current);
    const mine = L.list.filter(s => s.mine);
    const tabs = [['recent', 'Recent'], ['mine', 'Your servers'], ['rec', 'Recommended']];
    for (let r = 0; r <= rangeOf(L.newest); r++) tabs.push(['r' + r, rangeName(r)]);
    const shownList = ui.tab === 'recent' ? mine.slice().sort((a, b) => b.at - a.at) : ui.tab === 'mine' ? mine : ui.tab === 'rec' ? L.list.filter(s => !s.mine)
      : L.list.filter(s => rangeOf(s.n) === +ui.tab.slice(1));
    const card = s => h('button', { class: 'tt-svr' + (s.n === L.current ? ' cur' : ''), 'aria-label': `S${s.n}, ${s.mine ? 'your server' : 'new'}${s.n === L.current ? ', current' : ''}`, onclick: ev => { ev.stopPropagation(); sfx('click'); pick(s, L); } },
      h('i', { class: 'tt-dot ' + s.status }), h('span', { class: 'tt-id', text: 'S' + s.n }),
      s.lead ? h('span', { class: 'tt-pf' }, h('img', { src: portraitURL(s.lead, true, s.look), alt: '' }), h('em', { text: String(s.renown) })) : null);
    const dlg = h('div', { class: 'tt-dlg', role: 'dialog', 'aria-label': 'Servers' },
      h('div', { class: 'tt-ttab', text: 'Servers' }),
      h('button', { class: 'tt-x', 'aria-label': 'Close', onclick: ev => { ev.stopPropagation(); sfx('click'); closeServers(); } }, '✕'),
      h('nav', { class: 'tt-nav' }, tabs.map(([k, label]) => h('button', { class: ui.tab === k ? 'on' : '', 'aria-pressed': ui.tab === k ? 'true' : 'false', onclick: ev => { ev.stopPropagation(); if (ui.tab === k) return; sfx('click'); ui.tab = k; openServers(); } }, label))),
      h('div', { class: 'tt-legend' }, h('span', {}, h('i', { class: 'tt-dot new' }), 'New'), h('span', {}, h('i', { class: 'tt-dot busy' }), 'Busy'), h('span', {}, h('i', { class: 'tt-dot down' }), 'Maintenance')),
      h('div', { class: 'tt-cards' }, shownList.map(card)));
    E.layer.replaceChildren(veil(closeServers), dlg);
  }
  const veil = fn => h('div', { class: 'tt-veil', onclick: ev => { ev.stopPropagation(); fn(); } });
  function closeServers() { E.layer.replaceChildren(); ui.tab = null; root.focus({ preventScroll: true }); }
  // Back one step: from the confirm to the list, from the list to the title.
  function back() { if (E.layer.querySelector('.tt-cf')) openServers(); else closeServers(); }
  function pick(s, L) {
    if (s.n === L.current) { closeServers(); return; }
    if (s.mine) { closeServers(); switchTo(s.n, false); return; }
    // a new server asks first: each server keeps its own save
    const with_ = L.list.filter(x => x.mine && x.lead).map(x => 'S' + x.n);
    const list = with_.length > 1 ? with_.slice(0, -1).join(', ') + ' and ' + with_[with_.length - 1] : with_[0];
    const cf = h('div', { class: 'tt-cf', role: 'dialog', 'aria-label': `Start on S${s.n}?` },
      h('h3', { text: `Start on S${s.n}?` }),
      h('p', { text: 'Each server keeps its own save.' + (list ? ` Your heroes on ${list} stay there.` : '') }),
      h('div', { class: 'tt-row' },
        h('button', { onclick: ev => { ev.stopPropagation(); sfx('click'); openServers(); } }, 'Cancel'),
        h('button', { class: 'pri', onclick: ev => { ev.stopPropagation(); sfx('click'); closeServers(); switchTo(s.n, true); } }, 'Start')));
    E.layer.append(veil(() => openServers()), cf);
  }
  async function switchTo(n, fresh) {
    switching = true;
    E.tap.classList.add('tt-hide');
    pill(); E.sid.textContent = 'S' + n;
    try { await Save.use(n, fresh); } catch (e) { console.warn('Lantern Road: switching servers', e); }
    prepare(false);
    switching = false;
    pill();
    if (!gone) E.tap.classList.remove('tt-hide');
  }

  return {
    run, begin,
    get ready() { return ready && !switching && !gone; }, get up() { return !!root && !gone; },
  };
})();
