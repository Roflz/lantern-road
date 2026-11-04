'use strict';
// Lantern Road · the sprite stage on the hero sheet: the hero's battle sprite at a large scale, lit by a lantern,
// next to a training dummy. Tapping a skill plays it with the battle's look (Battle.FX): the lunge or the projectile,
// the hit flash, healing motes and the numbers it would really deal at the hero's level.

const DUMMY_MAP = ['..nnnn..', '.nnnnnn.', '.nkknkn.', '.nnnnnn.', '..nnnn..', 'wwwwwwww', 'w..ww..w', '...ww...', '..nnnn..', '.nnnnnn.', '..nnnn..', '...ww...', '...ww...', '...ww...', '..wwww..'];
const DUMMY_PAL = { n: '#c8a050', k: '#5a3a20', w: '#6b4a2e' };

class SpriteStage {
  // el: the element to fill. o: { cls, scale, hx (the hero's place, 0–1), dummy, ambient: skill ids to play now and then }
  constructor(el, o) {
    this.el = el; this.o = o; this.k = o.scale || 6;
    this.cv = document.createElement('canvas'); this.cv.className = 'stg-cv';
    el.prepend(this.cv);
    this.x = this.cv.getContext('2d');
    this.parts = []; this.fx = []; this.events = []; this.anim = null; this.dummyHit = 0; this.dummyShake = -1e9;
    this.phase = Math.random() * 6;
    this.alive = true; this.auto = (o.ambient || []).slice(); this.ai = 0; this.nextAuto = performance.now() + 1400;
    this.resize();
    this.ro = window.ResizeObserver ? new ResizeObserver(() => this.resize()) : null;
    if (this.ro) this.ro.observe(el);
    const tick = t => { if (!this.alive) return; if (!document.body.contains(this.el)) { this.stop(); return; } this.frame(t); requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }
  stop() { this.alive = false; if (this.ro) this.ro.disconnect(); }
  resize() {
    const w = Math.max(16, Math.floor(this.el.clientWidth / this.k)), hh = Math.max(16, Math.floor(this.el.clientHeight / this.k));
    if (w === this.W && hh === this.H) return;
    this.W = w; this.H = hh; this.cv.width = w; this.cv.height = hh;
    this.x.imageSmoothingEnabled = false;
    this.gy = hh - Math.max(3, Math.round(hh * 0.16));
    this.hx = Math.round(w * (this.o.hx != null ? this.o.hx : 0.32));
    this.dx = Math.round(w * 0.76);
    const r = makeRng(w * 31 + hh);
    this.props = [];
    for (let i = 0; i < Math.ceil(w / 9); i++) this.props.push({ x: Math.floor(r() * w), y: Math.floor(this.gy - 3 - r() * 6), k: r() > 0.5 ? 'grave' : 'cross' });
  }
  hero() { return heroSide(this.o.cls); }
  at(dt, fn) { this.events.push({ t: performance.now() + dt, fn }); this.events.sort((a, b) => a.t - b.t); }
  pop(px, py, text, cls) {
    const d = document.createElement('div');
    d.className = 'stg-num ' + (cls || '');
    d.textContent = text;
    d.style.left = px * this.k + 'px'; d.style.top = py * this.k + 'px';
    d.addEventListener('animationend', () => d.remove());
    this.el.append(d);
  }
  burst(x, y, color, n, sp = 1) {
    const now = performance.now();
    for (let i = 0; i < n; i++) this.parts.push({ kind: 'dot', x, y, vx: vrand(-1, 1) * sp * 30, vy: vrand(-1, 0.4) * sp * 30, t0: now, life: vrand(300, 600), color });
  }
  motes(x, y, color, n) { for (let i = 0; i < n; i++) this.at(i * 50, () => this.parts.push({ kind: 'mote', x: x + vrand(-5, 5), y: y - vrand(0, 5), vy: -vrand(14, 24), t0: performance.now(), life: vrand(600, 900), color })); }
  // Plays a skill. info: { sk, num, heal, tag }: what the numbers should say.
  play(sk, info = {}) {
    const F = (typeof Battle !== 'undefined' && Battle.FX && Battle.FX[sk.fx]) || { kind: 'buff', color: '#f4a646' };
    const now = performance.now(), s = this.hero(), top = this.gy - s.height, hx = this.hx, dx = this.dx, ty = this.gy - 8;
    const hit = (delay, big) => this.at(delay, () => {
      this.dummyHit = performance.now() + 90; this.dummyShake = performance.now();
      this.burst(dx, ty, F.color || '#fff0d0', big ? 14 : 8, big ? 1.4 : 1);
      if (info.num != null) this.pop(dx, ty - 9, String(info.num), info.crit ? 'crit' : '');
      if (typeof sfx === 'function') sfx(F.hit || F.sfx || 'thunk', 0.5);
    });
    const say = () => { if (typeof sfx === 'function') sfx(F.sfx || 'magic', 0.6); };
    switch (F.kind) {
      case 'melee': case 'dash': {
        this.anim = { t0: now, dur: 520, lunge: dx - hx - 9 };
        this.at(150, say);
        hit(220, F.big);
        this.at(220, () => this.fx.push({ kind: 'slash', x: dx, y: ty, t0: performance.now(), life: 240, color: F.color || '#fff3dc' }));
        break;
      }
      case 'shot': case 'cast': {
        this.anim = { t0: now, dur: 360, lift: 2 };
        const n = sk.hits || (sk.shape === 'random3' ? 3 : 1);
        for (let i = 0; i < Math.min(n, 5); i++) {
          this.at(140 + i * 110, () => { this.fx.push({ kind: 'proj', style: F.proj || 'orb', x0: hx + 5, y0: top + 6, x1: dx, y1: ty, t0: performance.now(), life: 340, color: F.color || '#ffe9a0', arc: F.arcH ? 4 : 2 }); if (!i) say(); });
          hit(480 + i * 110, false);
        }
        break;
      }
      case 'aoe': case 'pillar': case 'charge': {
        this.anim = { t0: now, dur: 420, lift: 2 };
        this.parts.push({ kind: 'ring', x: hx, y: this.gy, t0: now, life: 700, r: 22, color: F.color || '#fff' });
        if (F.flash) this.parts.push({ kind: 'flash', t0: now + 200, life: 300, color: F.flash });
        this.at(60, say);
        hit(380, true);
        break;
      }
      case 'heal': case 'raise': {
        this.anim = { t0: now, dur: 420, lift: 1 };
        this.parts.push({ kind: 'ring', x: hx, y: this.gy, t0: now, life: 650, r: 10, color: F.color || '#b4f098' });
        if (F.kind === 'raise') this.fx.push({ kind: 'pillar', x: hx, t0: now, life: 700, color: F.color });
        this.motes(hx, this.gy - 3, F.color || '#b4f098', 9);
        this.at(60, say);
        this.at(260, () => this.pop(hx, top - 2, info.heal != null ? '+' + info.heal : (info.tag || 'Healed'), 'heal'));
        break;
      }
      default: {
        this.anim = { t0: now, dur: 420, lift: 1 };
        this.parts.push({ kind: 'ring', x: hx, y: this.gy - 5, t0: now, life: 560, r: 9, color: F.color || '#f4a646' });
        this.parts.push({ kind: 'flash', t0: now, life: 280, color: F.color || '#f4a646' });
        this.motes(hx, this.gy - 4, F.color || '#f4a646', 8);
        this.at(60, say);
        if (info.tag) this.at(240, () => this.pop(hx, top - 2, info.tag, 'tag'));
      }
    }
  }
  frame(t) {
    const x = this.x, W = this.W, H = this.H, gy = this.gy;
    if (this.auto.length && t > this.nextAuto && !noMotion()) { const a = this.auto[this.ai++ % this.auto.length]; if (a) this.play(a.sk, a.info); this.nextAuto = t + 2600; }
    while (this.events.length && this.events[0].t <= t) this.events.shift().fn();
    const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0b0812'); g.addColorStop(1, '#1b1421');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    const A = REGION_ART[0];
    for (const p of this.props) { const s = sprite(PROPS[p.k].map, A.pc, 'stg:' + p.k); x.globalAlpha = 0.35; x.drawImage(s, p.x, p.y - s.height + 4); x.globalAlpha = 1; }
    x.fillStyle = '#1f1826'; x.fillRect(0, gy, W, H - gy); x.fillStyle = '#2a2131'; x.fillRect(0, gy, W, 1);
    for (let i = 0; i < W; i += 3) { x.fillStyle = (i * 7) % 5 ? '#241c2a' : '#18121e'; x.fillRect(i, gy + 2 + (i % 3), 2, 1); }
    // the lantern
    const lx = Math.max(3, this.hx - 10), flick = 0.32 + Math.sin(t / 130) * 0.03 + Math.sin(t / 47) * 0.02;
    const lg = x.createRadialGradient(lx, gy - 9, 1, lx, gy - 9, H * 0.95);
    lg.addColorStop(0, `rgba(244,166,70,${flick})`); lg.addColorStop(1, 'rgba(244,166,70,0)');
    x.globalCompositeOperation = 'lighter'; x.fillStyle = lg; x.fillRect(0, 0, W, H); x.globalCompositeOperation = 'source-over';
    if (H > 22) { const p = sprite(PROPS.post.map, A.pc, 'stg:post'); x.drawImage(p, lx - 2, gy - p.height + 1); }
    // the dummy
    if (this.o.dummy !== false) {
      const D = sprite(DUMMY_MAP, DUMMY_PAL, 'dummy');
      let ddx = this.dx - 4; const e = t - this.dummyShake;
      if (e < 220) ddx += Math.round(Math.sin(Math.PI * e / 220) * 2);
      x.drawImage(t < this.dummyHit ? tinted(D, '#ffffff') : D, ddx, gy - D.height + 1);
    }
    // the hero
    const s = this.hero();
    let hy = gy - s.height + 1, hxo = this.hx - Math.floor(s.width / 2);
    if (!noMotion() && Math.sin(t / 520 + this.phase) > 0.55) hy -= 1;
    if (this.anim) {
      const q = (t - this.anim.t0) / this.anim.dur;
      if (q >= 1) this.anim = null;
      else if (this.anim.lunge) hxo += Math.round(Math.sin(Math.PI * q) * this.anim.lunge * (q < 0.5 ? 1 : 1));
      else hy -= Math.round(Math.sin(Math.PI * q) * this.anim.lift);
    }
    x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(this.hx - 4, gy + 1, 8, 1);
    x.drawImage(s, hxo, hy);
    // effects
    this.fx = this.fx.filter(f => t - f.t0 < f.life);
    for (const f of this.fx) {
      const q = clamp((t - f.t0) / f.life, 0, 1);
      if (q < 0) continue;
      x.globalCompositeOperation = 'lighter';
      if (f.kind === 'proj') {
        const px = lerp(f.x0, f.x1, q), py = lerp(f.y0, f.y1, q) - Math.sin(Math.PI * q) * f.arc;
        if (f.style === 'bolt') { x.fillStyle = f.color; x.fillRect(Math.round(px) - 2, Math.round(py), 3, 1); x.fillStyle = '#fff'; x.fillRect(Math.round(px), Math.round(py), 1, 1); }
        else {
          const rg = x.createRadialGradient(px, py, 0, px, py, 5); rg.addColorStop(0, 'rgba(255,233,160,.5)'); rg.addColorStop(1, 'rgba(255,233,160,0)');
          x.fillStyle = rg; x.fillRect(px - 5, py - 5, 10, 10);
          x.fillStyle = f.color; x.fillRect(Math.round(px) - 1, Math.round(py) - 1, 3, 3); x.fillStyle = '#fff'; x.fillRect(Math.round(px), Math.round(py), 1, 1);
          if (Math.random() < 0.6) this.parts.push({ kind: 'dot', x: px, y: py, vx: vrand(-6, 6), vy: vrand(-6, 6), t0: t, life: 240, color: f.color });
        }
      } else if (f.kind === 'slash') {
        x.fillStyle = f.color;
        for (let k = 0; k < 7; k++) { if (k > q * 10) break; const a = -1.1 + k * 0.37; x.fillRect(Math.round(f.x + Math.sin(a) * 6), Math.round(f.y - Math.cos(a) * 4), 1, 1); }
      } else if (f.kind === 'pillar') {
        const a = Math.sin(Math.PI * q), w = Math.max(1, Math.round(5 * a));
        x.globalAlpha = a * 0.8; x.fillStyle = f.color; x.fillRect(Math.round(f.x - w / 2), 0, w, gy); x.globalAlpha = 1;
      }
    }
    this.parts = this.parts.filter(p => t - p.t0 < p.life);
    for (const p of this.parts) {
      const q = (t - p.t0) / p.life, sec = (t - p.t0) / 1000;
      if (q < 0) continue;
      x.globalCompositeOperation = 'lighter';
      if (p.kind === 'dot') { x.globalAlpha = 1 - q; x.fillStyle = p.color; x.fillRect(Math.round(p.x + p.vx * sec), Math.round(p.y + p.vy * sec), 1, 1); }
      else if (p.kind === 'mote') { x.globalAlpha = 1 - q; x.fillStyle = p.color; const px = Math.round(p.x), py = Math.round(p.y + p.vy * sec); x.fillRect(px - 1, py, 3, 1); x.fillRect(px, py - 1, 1, 3); }
      else if (p.kind === 'ring') { const r = 2 + p.r * q; x.globalAlpha = 1 - q; x.fillStyle = p.color; for (let a = 0; a < Math.PI * 2; a += 0.25) x.fillRect(Math.round(p.x + Math.cos(a) * r), Math.round(p.y + Math.sin(a) * r * 0.35), 1, 1); }
      else if (p.kind === 'flash') { x.globalAlpha = 0.18 * (1 - q); x.fillStyle = p.color; x.fillRect(0, 0, W, H); }
      x.globalAlpha = 1;
    }
    x.globalCompositeOperation = 'source-over';
  }
}
