'use strict';
// Lantern Road · settings, sound effects and procedural music.
// The audio engine comes from the first version of the game: every sound passes through a soft low-pass and a
// short echo, so nothing is shrill.

// Player settings, remembered on this device (shared with the first version of the game).
const settings = { sfx: true, music: true, motion: true };
try { Object.assign(settings, JSON.parse(localStorage.getItem('lantern-road-settings') || '{}')); } catch (e) { }
function saveSettings() {
  try { localStorage.setItem('lantern-road-settings', JSON.stringify(settings)); } catch (e) { }
  document.body.classList.toggle('calm', !settings.motion);
}
const osReduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
const noMotion = () => osReduce || !settings.motion;

let AC = null, sfxBus = null, musicBus = null, echoIn = null;
function audio() {
  if (!AC) {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    const master = AC.createGain(), soft = AC.createBiquadFilter();
    master.gain.value = .9; soft.type = 'lowpass'; soft.frequency.value = 5200;
    master.connect(soft).connect(AC.destination);
    sfxBus = AC.createGain(); sfxBus.connect(master);
    musicBus = AC.createGain(); musicBus.gain.value = 0; musicBus.connect(master);
    const delay = AC.createDelay(), fb = AC.createGain(), wet = AC.createGain();
    delay.delayTime.value = .32; fb.gain.value = .32; wet.gain.value = .35;
    echoIn = AC.createGain(); echoIn.connect(delay); delay.connect(fb).connect(delay); delay.connect(wet).connect(master);
  }
  if (AC.state === 'suspended') AC.resume();
  return AC;
}
function tone(f, d, type = 'triangle', vol = .05, slide = 0, delay = 0, echo = 0, bus = sfxBus) {
  const t = AC.currentTime + delay, o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .008); g.gain.exponentialRampToValueAtTime(.0001, t + d);
  o.connect(g); g.connect(bus);
  if (echo) { const e = AC.createGain(); e.gain.value = echo; g.connect(e).connect(echoIn); }
  o.start(t); o.stop(t + d + .05);
}
const noiseBuf = () => { const len = AC.sampleRate * 2, b = AC.createBuffer(1, len, AC.sampleRate), ch = b.getChannelData(0); for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1; return b; };
let NOISE = null;
function noise(d, vol = .08, freq = 1400, delay = 0, bus = sfxBus, type = 'lowpass') {
  NOISE = NOISE || noiseBuf();
  const t = AC.currentTime + delay, s = AC.createBufferSource(), g = AC.createGain(), f = AC.createBiquadFilter();
  s.buffer = NOISE; f.type = type; f.frequency.value = freq;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
  s.connect(f).connect(g).connect(bus); s.start(t, Math.random()); s.stop(t + d + .02);
}

// At high game speeds sounds come thick and fast; the same sound never repeats within a few frames.
const sfxLast = {};
function sfx(k, vol = 1) {
  if (!settings.sfx) return;
  const now = performance.now();
  if (sfxLast[k] && now - sfxLast[k] < 45) return;
  sfxLast[k] = now;
  try {
    audio();
    const v = x => x * vol;
    switch (k) {
      case 'slash': noise(.11, v(.09), 2600, 0, sfxBus, 'highpass'); tone(520, .1, 'triangle', v(.04), -300); break;
      case 'smash': noise(.14, v(.12), 700); tone(140, .18, 'triangle', v(.08), -70); break;
      case 'bash': tone(520, .09, 'square', v(.025)); tone(780, .16, 'sine', v(.04), 0, .01, .3); noise(.1, v(.1), 1200); break;
      case 'claw': noise(.12, v(.1), 1800); tone(240, .09, 'sawtooth', v(.025), -120); break;
      case 'bite': noise(.07, v(.1), 1100); noise(.07, v(.08), 1100, .07); break;
      case 'bolt': tone(1100, .09, 'triangle', v(.035), -700); noise(.06, v(.06), 3000, 0, sfxBus, 'highpass'); break;
      case 'thunk': noise(.08, v(.1), 900); tone(200, .1, 'triangle', v(.05), -60); break;
      case 'bone': tone(330, .05, 'square', v(.025)); tone(250, .05, 'square', v(.02), 0, .06); break;
      case 'magic': tone(330, .3, 'triangle', v(.045), 330); noise(.14, v(.04), 2400); break;
      case 'hex': tone(196, .4, 'sawtooth', v(.025), -60); tone(392, .35, 'sine', v(.035), -150, .02, .3); break;
      case 'holy': [784, 988, 1175].forEach((f, i) => tone(f, .32, 'sine', v(.035), 0, i * .04, .35)); break;
      case 'heal': [523, 659, 784].forEach((f, i) => tone(f, .35, 'sine', v(.045), 0, i * .07, .4)); break;
      case 'kindle': noise(.35, v(.06), 900); [392, 523, 659, 784].forEach((f, i) => tone(f, .45, 'triangle', v(.035), 0, .05 + i * .06, .45)); break;
      case 'dazzle': [1568, 2093, 2637].forEach((f, i) => tone(f, .4, 'sine', v(.03), 0, i * .03, .5)); noise(.3, v(.05), 5000, 0, sfxBus, 'highpass'); break;
      case 'guard': tone(260, .1, 'sine', v(.07)); tone(390, .3, 'triangle', v(.045), 0, .04, .4); break;
      case 'crit': noise(.2, v(.16), 800); tone(110, .3, 'triangle', v(.09), -60); tone(660, .16, 'sine', v(.04)); break;
      case 'miss': noise(.12, v(.05), 3200, 0, sfxBus, 'highpass'); break;
      case 'tick': tone(300 + Math.random() * 40, .12, 'sine', v(.03), -80); break;
      case 'die': noise(.4, v(.09), 600); [392, 294, 220].forEach((f, i) => tone(f, .3, 'triangle', v(.035), -40, i * .08, .3)); break;
      case 'ko': [440, 349, 262].forEach((f, i) => tone(f, .55, 'sine', v(.05), 0, i * .16, .45)); break;
      case 'revive': [262, 330, 392, 523, 659].forEach((f, i) => tone(f, .6, 'triangle', v(.035), 0, i * .08, .5)); break;
      case 'charge': noise(.7, v(.07), 300); tone(70, .8, 'sawtooth', v(.035), 60); break;
      case 'burst': noise(.6, v(.18), 500); tone(80, .6, 'triangle', v(.1), -40); break;
      case 'toll': tone(220, 1.4, 'sine', v(.06), 0, 0, .6); tone(330, 1.1, 'sine', v(.035), 0, .01, .5); tone(523, .7, 'sine', v(.02), 0, .02, .4); break;
      case 'water': noise(.5, v(.1), 900); tone(160, .5, 'sine', v(.05), -80); break;
      case 'dirt': noise(.35, v(.1), 500); break;
      case 'enrage': tone(73, .9, 'sawtooth', v(.05), 20); tone(110, .9, 'sawtooth', v(.035), 15, .05); noise(.5, v(.06), 400); break;
      case 'turn': tone(880, .04, 'sine', v(.012)); break;
      case 'step': noise(.04, v(.025), 600); break;
      case 'click': tone(700, .04, 'sine', v(.022)); break;
      case 'coin': tone(1320, .08, 'square', v(.018)); tone(1760, .16, 'triangle', v(.03), 0, .06, .4); break;
      case 'equip': noise(.06, v(.05), 1600); tone(392, .12, 'triangle', v(.04), 0, .02); tone(587, .22, 'sine', v(.035), 0, .07, .4); break;
      case 'win': [523, 659, 784, 1046].forEach((f, i) => tone(f, .5, 'triangle', v(.05), 0, i * .1, .45)); break;
      case 'lose': [392, 330, 262, 196].forEach((f, i) => tone(f, .8, 'sine', v(.05), 0, i * .26, .4)); break;
      case 'region': [392, 494, 587].forEach((f, i) => tone(f, 1.4, 'triangle', v(.035), 0, i * .18, .5)); break;
    }
  } catch (e) { }
}

// Ambient music: a low drone and a sparse melody on a soft pluck, composed on the fly in each region's key.
// Off for now (2026-11-03): the drone sounded broken. It stays here to be reworked later.
const MUSIC_ON = false;
const SCALES = [
  { root: 110, steps: [0, 3, 5, 7, 10, 12, 15], tempo: 1.1 },             // Gravefields
  { root: 98, steps: [0, 2, 3, 7, 9, 10, 14], tempo: 1.25, rain: true },  // Drowned Chapel
  { root: 104, steps: [0, 2, 5, 7, 9, 12, 14], tempo: 1.15 },             // Thornwood
  { root: 92, steps: [0, 1, 4, 5, 7, 8, 12], tempo: 1.0 },                // Ashen Keep
  { root: 87, steps: [0, 3, 6, 7, 10, 12, 15], tempo: 1.35 },             // Hollow Throne
];
const HEARTH_SCALE = { root: 110, steps: [0, 4, 7, 9, 12, 14, 16], tempo: 1.4 }; // camp and menus
const music = { on: false, key: null, next: 0, timer: 0, drone: null, want: HEARTH_SCALE };
function setMusicKey(key) { music.want = key || HEARTH_SCALE; }
function startMusic() {
  if (!MUSIC_ON || !settings.music || music.on) return;
  try { audio(); } catch (e) { return; }
  music.on = true; music.key = null; music.next = AC.currentTime + .3;
  musicBus.gain.cancelScheduledValues(AC.currentTime); musicBus.gain.setValueAtTime(musicBus.gain.value, AC.currentTime);
  musicBus.gain.linearRampToValueAtTime(.55, AC.currentTime + 2.5);
  music.timer = setInterval(scheduleMusic, 200);
}
function stopMusic() {
  if (!music.on) return;
  music.on = false; clearInterval(music.timer); stopDrone();
  if (AC) { musicBus.gain.cancelScheduledValues(AC.currentTime); musicBus.gain.linearRampToValueAtTime(0, AC.currentTime + .6); }
}
function scheduleMusic() {
  const key = music.want;
  if (key !== music.key) { music.key = key; setDrone(key); }
  while (music.next < AC.currentTime + .7) {
    const t = music.next, beat = key.tempo;
    if (Math.random() < .6) {
      const f = key.root * 4 * 2 ** (key.steps[Math.floor(Math.random() * key.steps.length)] / 12);
      pluck(f, t, 1);
      if (Math.random() < .22) pluck(f * 2 ** (key.steps[2] / 12), t + beat / 2, .55);
    }
    if (key !== HEARTH_SCALE && Math.random() < .35) noise(.025, .012, 2600, t - AC.currentTime + Math.random() * beat, musicBus); // the lantern's crackle
    music.next += beat * (Math.random() < .2 ? 2 : 1);
  }
}
function pluck(f, t, v) {
  const o = AC.createOscillator(), g = AC.createGain(), lp = AC.createBiquadFilter(), e = AC.createGain();
  o.type = 'triangle'; o.frequency.value = f; lp.type = 'lowpass';
  lp.frequency.setValueAtTime(2400, t); lp.frequency.exponentialRampToValueAtTime(480, t + 1.2);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.05 * v, t + .012); g.gain.exponentialRampToValueAtTime(.0001, t + 1.9);
  e.gain.value = .6; o.connect(lp).connect(g); g.connect(musicBus); g.connect(e).connect(echoIn);
  o.start(t); o.stop(t + 2);
}
function setDrone(key) {
  stopDrone();
  const t = AC.currentTime, g = AC.createGain(), lp = AC.createBiquadFilter();
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.05, t + 3);
  lp.type = 'lowpass'; lp.frequency.value = 420;
  const nodes = [key.root, key.root * 1.5, key.root * 2.003].map((f, i) => { const o = AC.createOscillator(); o.type = i ? 'sine' : 'triangle'; o.frequency.value = f; o.connect(lp); o.start(t); return o; });
  const lfo = AC.createOscillator(), lg = AC.createGain(); lfo.frequency.value = .07; lg.gain.value = .02; lfo.connect(lg).connect(g.gain); lfo.start(t); nodes.push(lfo);
  lp.connect(g).connect(musicBus);
  if (key.rain) { // soft rain on the chapel stones
    NOISE = NOISE || noiseBuf();
    const r = AC.createBufferSource(), bp = AC.createBiquadFilter(), rg = AC.createGain();
    r.buffer = NOISE; r.loop = true; bp.type = 'bandpass'; bp.frequency.value = 1400; bp.Q.value = .6; rg.gain.value = .5;
    r.connect(bp).connect(rg).connect(g); r.start(t); nodes.push(r);
  }
  music.drone = { g, nodes };
}
function stopDrone() {
  const d = music.drone; if (!d || !AC) return;
  const t = AC.currentTime; d.g.gain.cancelScheduledValues(t); d.g.gain.setValueAtTime(d.g.gain.value, t); d.g.gain.linearRampToValueAtTime(0, t + 1.5);
  d.nodes.forEach(n => n.stop(t + 1.6)); music.drone = null;
}
// Browsers only allow sound after the player has touched the page: the first touch wakes the audio.
['pointerdown', 'keydown'].forEach(ev => document.addEventListener(ev, () => { if (settings.sfx) try { audio(); } catch (e) { } }, { passive: true }));
document.addEventListener('visibilitychange', () => { if (AC) { if (document.hidden) AC.suspend(); else if (music.on || settings.sfx) AC.resume(); } });
