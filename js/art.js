'use strict';
// Lantern Road · pixel art and page helpers.
// The sprite builder, foe templates, props and icons come from the first version of the game (lantern-road.html).

const $ = s => document.querySelector(s);
const vrand = (a, b) => a + Math.random() * (b - a); // for visuals only; never touches a battle's seed
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const k in (attrs || {})) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k === 'disabled') el.disabled = !!v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v);
  }
  for (const kid of kids.flat(Infinity)) if (kid != null && kid !== false) el.append(kid);
  return el;
}

// ── sprites: a map of characters, and a palette that colours them. '.' and unknown characters are clear.
const spriteCache = new Map();
function sprite(map, pal, key) {
  if (spriteCache.has(key)) return spriteCache.get(key);
  const w = Math.max(...map.map(r => r.length)), hh = map.length;
  const c = document.createElement('canvas'); c.width = w; c.height = hh;
  const x = c.getContext('2d');
  map.forEach((row, y) => { for (let i = 0; i < row.length; i++) { const col = pal[row[i]]; if (col) { x.fillStyle = col; x.fillRect(i, y, 1, 1); } } });
  spriteCache.set(key, c);
  return c;
}
// The same picture in one flat colour: hit flashes, silhouettes and outlines. Cached per picture and colour.
const tintCache = new WeakMap();
function tinted(src, color) {
  let m = tintCache.get(src);
  if (!m) tintCache.set(src, m = {});
  if (m[color]) return m[color];
  const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
  const x = c.getContext('2d'); x.drawImage(src, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
  return (m[color] = c);
}

// ── foes (front view)
const TEMPLATES = {
  humanoid: ["......hhhh......", ".....hhhhhh.....", ".....hehheh.....", ".....hhhhhh.....", "......hmmh......", "....bbbbbbbb....", "...bbbbbbbbbb...", "..bb.bbbbbb.bb..", "..b..bbbbbb..b..", "..b..bdbbdb..b..", "..c..bbbbbb..c..", ".....bbbbbb.....", ".....bb..bb.....", ".....bb..bb.....", ".....dd..dd.....", "....ddd..ddd...."],
  hunched: ["......hhhh......", ".....hhhhhh.....", ".....hehheh.....", "...bbhhmmhhbb...", "..bbbbbbbbbbbb..", ".bbbbbbbbbbbbbb.", ".b.bbbbbbbbbb.b.", "c..bbbbbbbbbb..c", "c...bbbbbbbb...c", ".....bbbbbb.....", "....bb....bb....", "....bb....bb....", "...dd......dd...", "..ddd......ddd.."],
  skeleton: ["......xxxx......", ".....xxxxxx.....", ".....xeexeex....", ".....xxxxxx.....", "......x.x.x.....", "......xxxx......", "....x.xxxx.x....", "...x..x..x..x...", "...x..xxxx..x...", "...c..x..x..c...", "......xxxx......", "......x..x......", "......x..x......", "......x..x......", ".....xx..xx....."],
  wraith: ["......wwww......", "....wwwwwwww....", "...wwwwwwwwww...", "...wweewweeww...", "...wwwwwwwwww...", "...wwwwmmwwww...", "..wwwwwwwwwwww..", ".wwwwwwwwwwwwww.", "ww.wwwwwwwwww.ww", "w..wwwwwwwwww..w", "...wwwwwwwwww...", "...wwwwwwwwww...", "....wwwwwwww....", "....ww.ww.ww....", ".....w..w..w...."],
  swarm: ["..bb......bb....", ".beb.....beb....", "..bb..bb..bb....", "......beb.......", "..bb...bb...bb..", ".beb.......beb..", "..bb..bb....bb..", "......beb.......", "...bb..bb..bb...", "..beb.....beb...", "...bb......bb..."],
  knight: [".....hhhhhh.....", ".....hhhhhh.....", ".....heeeeh.....", ".....hhhhhh.....", "...aabbbbbbaa...", "..aabbbbbbbbaa..", "..a.bbbrrbbb.a..", "..a.bbbbbbbb.a.s", "..c.bbbbbbbb.cs.", "....bbbbbbbb.s..", "....aaaaaaaa....", ".....bb..bb.....", ".....bb..bb.....", ".....aa..aa.....", "....aaa..aaa...."],
  bloat: ["......hhhh......", ".....hehheh.....", ".....hhmmhh.....", "...bbbbbbbbbb...", "..bbbbbbbbbbbb..", ".bbbbbpbbbbbbbb.", ".bbbbbbbbbpbbbb.", ".bbbpbbbbbbbbbb.", ".bbbbbbbbbbbbbb.", "..bbbbbbbbbbbb..", "...bbbbbbbbbb...", "....bb....bb....", "....dd....dd...."],
};
const ACCESSORIES = {
  crown: { x: 5, y: -2, map: ["y.yy.y", "yryyry"] },
  mitre: { x: 5, y: -4, map: ["..yy..", ".yyyy.", ".yrry.", "yyyyyy"] },
  horns: { x: 4, y: -2, map: ["k......k", ".k....k."] },
  shovel: { x: 14, y: 2, map: [".w", ".w", ".w", ".w", ".w", ".w", ".w", "ss", "ss", "s."] },
};
const FOE_ART = {
  ghoul: { tpl: 'hunched', pal: { h: '#7d8a6a', e: '#e8f07a', m: '#1e1612', b: '#4d5640', c: '#c9c2a4', d: '#343a2c' }, eye: '#e8f07a' },
  rats: { tpl: 'swarm', pal: { b: '#6a564c', e: '#ff5a4a' }, eye: '#ff5a4a' },
  bones: { tpl: 'skeleton', pal: { x: '#d8d0bc', e: '#7ad0ff', c: '#a89e88' }, eye: '#7ad0ff' },
  gravewarden: { tpl: 'knight', pal: { h: '#55575e', e: '#ff7a3a', b: '#3e4047', a: '#6b6d75', r: '#6b2b22', c: '#6b6d75', s: '#c9ccd4' }, eye: '#ff7a3a' },
  sexton: { tpl: 'humanoid', acc: ['shovel'], pal: { h: '#a89a86', e: '#ffd36a', m: '#1e1612', b: '#3b3029', d: '#211a15', c: '#a89a86', w: '#6b4a2e', s: '#9aa0a8' }, eye: '#ffd36a' },
  acolyte: { tpl: 'humanoid', pal: { h: '#7aa6a0', e: '#d8fff4', m: '#142221', b: '#2e4a4c', d: '#1b2e30', c: '#7aa6a0' }, eye: '#d8fff4' },
  bloat: { tpl: 'bloat', pal: { h: '#8aa58a', e: '#f4fff0', m: '#1e1612', b: '#6b8a72', p: '#c9d47a', d: '#34453a' }, eye: '#f4fff0' },
  bellwraith: { tpl: 'wraith', pal: { w: '#9ab8c8', e: '#141020', m: '#141020' }, eye: '#9ab8c8' },
  choir: { tpl: 'swarm', pal: { b: '#4a6a6c', e: '#d8fff4' }, eye: '#d8fff4' },
  bishop: { tpl: 'humanoid', acc: ['mitre'], pal: { h: '#9ab8b0', e: '#5af0d0', m: '#142221', b: '#cfc8b0', d: '#8a846e', c: '#9ab8b0', y: '#d8b44a', r: '#3a7a6a' }, eye: '#5af0d0' },
};
// One foe as a single canvas, accessories included.
function foeSprite(key) {
  const ck = 'foe:' + key;
  if (spriteCache.has(ck)) return spriteCache.get(ck);
  const A = FOE_ART[key], body = sprite(TEMPLATES[A.tpl], A.pal, 'ft:' + key);
  let top = 0, right = body.width;
  for (const a of A.acc || []) { const X = ACCESSORIES[a]; top = Math.min(top, X.y); right = Math.max(right, X.x + X.map[0].length); }
  const c = document.createElement('canvas'); c.width = right; c.height = body.height - top;
  const x = c.getContext('2d');
  x.drawImage(body, 0, -top);
  for (const a of A.acc || []) { const X = ACCESSORIES[a]; x.drawImage(sprite(X.map, A.pal, 'fa:' + a + key), X.x, X.y - top); }
  spriteCache.set(ck, c);
  return c;
}

// ── the party (seen from behind, facing the foes up the road)
// Shared letters: h hair or hood, H its highlight, c coat, C coat shade, d hem, s mantle, a sleeves, n hands, k boots.
// Two frames: standing, and mid-step for walking.
const HERO_ART = {
  warden: {
    pal: { h: '#8a8f99', H: '#c3c8d0', p: '#9e3a32', c: '#2c3b55', C: '#1f2a3e', d: '#16202e', a: '#6b7280', n: '#c9a27a', k: '#2a2622', m: '#a7adb8', M: '#dfe4ea', w: '#6b4a2e', y: '#e8c24a', r: '#3a4f75' },
    map: [
      "......pp........",
      ".....hhhh.......",
      "....hHhhhh......",
      "....hhhhhh......",
      "....hhhhhh......",
      "..mmmmmmmmmm....",
      ".mMmmmmmmmmMm...",
      ".mmrrrrrrrrmm...",
      ".a.rMmmmmmMr.a..",
      ".a.rmyyyyymr.a..",
      ".a.rmymmmymr.n..",
      ".n.rmyyyyymr.w..",
      "...rmmyyymmr.ww.",
      "....rmmymmr..ww.",
      ".....rmmmr......",
      "....CccccccC....",
      "....dCccccCd....",
      ".....kk..kk.....",
      ".....kk..kk....."],
  },
  sellsword: {
    pal: { h: '#6e2f22', H: '#a24e34', s: '#b8402e', c: '#5a3a26', C: '#3e2718', d: '#2a1a10', a: '#5a3a26', n: '#d8a878', k: '#2a1c14', w: '#e6e4ec', W: '#ffffff', y: '#d8b44a', t: '#6b4a2e' },
    map: [
      "............Ww..",
      "............ww..",
      "............ww..",
      "......hhhh..ww..",
      ".....hHhhHh.ww..",
      ".....hhhhhh.ww..",
      ".....hhhhhh.ww..",
      "......nnnn.yyyy.",
      "...ssssssssstt..",
      "..accsssssccan..",
      "..acCcccccCca...",
      "..acCcccccCca...",
      "..n.cCccccCc....",
      "....cCccccCc....",
      "....cccccccc....",
      "...cCccccccCc...",
      "...dCddccddCd...",
      ".....kk..kk.....",
      ".....kk..kk....."],
  },
  crossbowman: {
    pal: { h: '#3e5a32', H: '#5a7a48', c: '#4a6a3a', C: '#324a28', d: '#22341c', a: '#4a6a3a', n: '#d8a878', k: '#2a2418', t: '#7a5232', T: '#a8784a', f: '#e8e0cc', r: '#a83a2a', w: '#c9b48a' },
    map: [
      "...f.f..........",
      "...rfr.hhh......",
      "....tthhHhh.....",
      ".....thhhhhh....",
      "....hthhhhhh....",
      "....hhthhhhh....",
      ".....hhthhh.....",
      ".....ctttc......",
      "wwwwcccctcccwwww",
      "..accCcccctCca..",
      "..acCcccccCtca..",
      "..ncCcccccCcn...",
      "....cCccccCc....",
      "....cccccccc....",
      "...cCccccccCc...",
      "...dCddccddCd...",
      "....dd....dd....",
      ".....kk..kk.....",
      ".....kk..kk....."],
  },
  pilgrim: {
    pal: { h: '#8a7a5a', H: '#b8a47a', c: '#d6ccb6', C: '#a89c84', d: '#7a705e', a: '#d6ccb6', n: '#d8a878', k: '#5a4e3e', w: '#7a5a3a', y: '#f7d36a', s: '#e8e0cc', S: '#b8ac94' },
    map: [
      ".y..............",
      "yyy.............",
      ".y..............",
      ".w....hhhh......",
      ".w..hhhhhhhh....",
      ".w.hHhhhhhhHh...",
      ".w....hhhh......",
      ".w...ssssss.....",
      ".w.accsSSsscca..",
      ".n.acCsSssSCca..",
      ".w.acCcsssCcca..",
      ".w.acCcccccCcn..",
      ".w..cCcccccCc...",
      ".w..cccccccc....",
      ".w.cCccccccCc...",
      ".w.cCccccccCc...",
      "...dddddddddd...",
      ".....kk..kk.....",
      ".....kk..kk....."],
  },
  lamplighter: {
    pal: { h: '#3a5a5c', H: '#5a8a8c', c: '#b8682a', C: '#8a4a1c', d: '#5a3014', a: '#b8682a', n: '#d8a878', k: '#2a2016', w: '#6b4a2e', y: '#ffc65a', l: '#fff3c8', b: '#6b5236', t: '#3a5a5c' },
    map: [
      "........ww......",
      "......hhhww.....",
      ".....hHhhhww....",
      ".....hhhhhhww...",
      "....hhhhhhhh.ww.",
      "......hhhh...b.b",
      "....tttttttt.byb",
      "...actccccctna.blb",
      "...acCccccCcna.byb",
      "...acCccccCc....b",
      "...ncCccccCc....",
      "....cCccccCc....",
      "....cccccccc....",
      "...cCccccccCc...",
      "...cCccccccCc...",
      "...dtdtdtdtdt...",
      ".....kk..kk.....",
      ".....kk..kk....."],
    lamp: [15, 8],
  },
  hexblade: {
    pal: { h: '#4e2c62', H: '#704688', c: '#3e2450', C: '#2a1838', d: '#1c1026', a: '#3e2450', n: '#c9a2b0', k: '#1c1420', m: '#b8b0c8', g: '#bb96ee', G: '#e8d8ff' },
    map: [
      ".......h........",
      "......hh........",
      "......hhh.......",
      ".....hHhhh......",
      ".....hhhhhh.....",
      "....hhhhhhhh....",
      "....hhhhhhhh....",
      "...hhhhhhhhhh...",
      "..acccccccccca..",
      "..acCccgcccCca..",
      ".nacCcgGgccCcan.",
      "m..cCccgcccCc..m",
      "m..cCccccccCc..m",
      ".m.ccccccccccm..",
      "...cCccccccCc...",
      "..cCccccccccCc..",
      "..d.dd.dd.dd.d..",
      ".....kk..kk.....",
      ".....kk..kk....."],
  },
};
// Walking frames: step 1 lifts the left boot, step 2 the right.
function heroSprite(key, step = 0) {
  const A = HERO_ART[key], ck = 'hero:' + key + ':' + step;
  if (spriteCache.has(ck)) return spriteCache.get(ck);
  let map = A.map;
  if (step) {
    map = map.slice();
    const n = map.length, row = map[n - 1], first = row.indexOf('k'), last = row.lastIndexOf('k'), mid = (first + last) / 2;
    map[n - 1] = row.split('').map((ch, i) => (ch === 'k' && (step === 1 ? i < mid : i > mid) ? '.' : ch)).join('');
  }
  return sprite(map, A.pal, ck);
}

// In landscape battles the party stands on the left, seen from the side, facing the foes. Same palettes as the back
// views, plus e for eyes. lamp is where the Lamplighter's flame hangs.
const HERO_SIDE = {
  warden: { lamp: null, map: [
    "....pp..........",
    "...pmmmm........",
    "...mMmmmm.......",
    "...mmmmeee......",
    "...mmmmmmm......",
    "....mmmmm..rrr..",
    "...mmmmmmmrMMr..",
    "..mMmmmmmmryyr..",
    "..mmrrrrmmryyr..",
    "...rCrrrr.ryyr..",
    "...rCrrrr.rmmr..",
    "...rCrrrr.ryyr..",
    "...rrrrrr..rr...",
    "...CccccC.......",
    "...dCccCd.......",
    "....kk.kk.......",
    "....kk.kk......."] },
  sellsword: { lamp: null, map: [
    "..............W.",
    ".............ww.",
    "......hhhh..ww..",
    ".....hHhhhhww...",
    ".....hhhhnnw....",
    ".....hhhnenyy...",
    "......hhnntt....",
    ".....sssssna....",
    "....ssccccca....",
    "....cCcccca.....",
    "....cCcccca.....",
    "....cCccccc.....",
    "....cCccccc.....",
    "....cccccc......",
    "...cCccccc......",
    "...dCddcdd......",
    "....kk..kk......",
    "....kk..kk......"] },
  crossbowman: { lamp: null, map: [
    "................",
    "......hhh.......",
    ".....hhHhh......",
    "....hhhhhnn.....",
    "....hhhhnen.....",
    "....hhhhhnn.....",
    "...thhhhhh......",
    "..ff.cccccc.....",
    "..tt.ccccnTTTTt.",
    "..t..cCccc..ww..",
    ".....cCccc......",
    ".....cCcccc.....",
    ".....ccccc......",
    "....cCcccc......",
    "....dCddcd......",
    ".....kk.kk......",
    ".....kk.kk......"] },
  pilgrim: { lamp: null, map: [
    "...........y....",
    "..........yyy...",
    "......hhhh.y....",
    "...hhhhhhhhhh...",
    ".....hHhhh.w....",
    ".....hnnnn.w....",
    ".....nnenn.w....",
    ".....ssss..w....",
    "....cSccccnw....",
    "....cCcccc.w....",
    "....cCcccc.w....",
    "....cCcccc.w....",
    "....ccccc..w....",
    "...cCcccc..w....",
    "...cCccccc.w....",
    "...dddddd.......",
    "....kk.kk.......",
    "....kk.kk......."] },
  lamplighter: { lamp: [14, 5], map: [
    "..........wwwww.",
    "......hhh.w...b.",
    ".....hHhhw....b.",
    ".....hhhnn...bbb",
    ".....hhnenw..byb",
    ".....hhhnw...blb",
    "......tttw...byb",
    ".....cccw.....b.",
    "....cCcnc.......",
    "....cCccc.......",
    "....cCccc.......",
    "....cCcccc......",
    "....cccccc......",
    "...cCcccccc.....",
    "...dtdtdtdt.....",
    "....kk..kk......",
    "....kk..kk......"] },
  hexblade: { lamp: null, map: [
    "....h...........",
    "....hh..........",
    "....hhh.........",
    "...hhHhh........",
    "...hhhhhh.......",
    "...hhhhgeg......",
    "...hhhhhhh......",
    "..hhhhhhhh......",
    "..ccccccca.m....",
    "..cCccgccnm.....",
    "..cCcgGgcm......",
    "..cCccgccm......",
    "..cCcccccc......",
    "..ccccccccc.....",
    ".cCcccccccc.....",
    ".d.dd.dd.dd.....",
    "....kk..kk......",
    "....kk..kk......"] },
};
function heroSide(key, step = 0) {
  const A = HERO_SIDE[key], ck = 'side:' + key + ':' + step;
  if (spriteCache.has(ck)) return spriteCache.get(ck);
  let map = A.map;
  if (step) {
    map = map.slice();
    const n = map.length, row = map[n - 1], first = row.indexOf('k'), last = row.lastIndexOf('k'), mid = (first + last) / 2;
    map[n - 1] = row.split('').map((ch, i) => (ch === 'k' && (step === 1 ? i < mid : i > mid) ? '.' : ch)).join('');
  }
  return sprite(map, Object.assign({ e: '#1a1214' }, HERO_ART[key].pal), ck);
}

// ── scenery
const PROPS = {
  grave: { map: [".sss.", "sssss", "sdsss", "sssss", "sssds", "sssss", "ddddd"] },
  cross: { map: ["..s..", "..s..", "sssss", "..s..", "..s..", "..s..", "..s..", ".ddd."] },
  deadtree: { map: ["t.......t", ".t..t..t.", "..t.t.t..", "...ttt.t.", "t...t.t..", ".t..tt...", "..t.t....", "...tt....", "....t....", "....t....", "...ttt...", "..t.t.t.."] },
  skulls: { map: [".b.b.", "bbbbb", "b.b.b"] },
  stone: { map: [".ss.", "ssds", "dssd"] },
  pillar: { map: ["ddddd", ".sss.", ".sds.", ".sss.", ".sds.", ".sss.", ".sss.", ".sds.", ".sss.", ".sss.", "sssss", "ddddd"] },
  broken: { map: [".s.s.", ".sss.", ".sds.", ".sss.", "sssss", "ddddd"] },
  puddle: { map: [".ppppp.", "ppqpppp", ".ppppq."] },
  // Warm pockets along the road: wayside lanterns and grave candles.
  post: { map: [".ddd.", ".dfd.", ".dyd.", ".dfd.", ".ddd.", "..d..", "..d..", "..d..", "..d..", "..d..", "..d..", ".ddd."], glow: [2, 2, 15], warm: true },
  candle: { map: ["..y..", "..f..", ".sss.", "sssss", "ss.ss", "sssss", "sssss", "ddddd"], glow: [2, 0, 10], warm: true },
};
const PC = o => Object.assign({ s: '#5f6266', d: '#3a3c41', t: '#3b3026', b: '#bfb8a6', g: '#2c3a24', r: '#6b2b22', p: '#1d3136', q: '#3d5a63', f: '#f29a3a', a: '#4a4542', y: '#d8b44a' }, o);
const REGION_ART = [
  { ground: '#1a1e17', speck: '#252b21', speck2: '#2c3326', road: '#38322a', roadSpeck: '#463e34', edge: '#26211b', seam: '#2e2922', tiles: false, night: '#140f2a', dark: .78, density: .62, props: ['grave', 'grave', 'cross', 'deadtree', 'skulls', 'stone', 'candle', 'post'], pc: PC({}), particle: 'mist' },
  { ground: '#121d1d', speck: '#1a2a29', speck2: '#1f3332', road: '#2c3534', roadSpeck: '#384342', edge: '#1b2423', seam: '#222b2a', tiles: true, night: '#0a1426', dark: .78, density: .56, props: ['pillar', 'broken', 'puddle', 'puddle', 'grave', 'stone', 'candle', 'post'], pc: PC({ s: '#56605e', d: '#353e3d', p: '#173038', q: '#4a7480' }), particle: 'rain' },
];

// ── interface icons: small pixel glyphs that stand in for words wherever a number is enough
const UI_ICONS = {
  heart: { map: [".rr.rr.", "rrrrrrr", "rwrrrrr", "rrrrrrr", ".rrrrr.", "..rrr..", "...r..."], pal: { r: '#e0484a', w: '#ffb8ae' } },
  mana: { map: ["...b...", "..bbb..", ".bbwbb.", ".bwbbb.", "bbbbbbb", ".bbbbb.", "..bbb.."], pal: { b: '#5a8ae0', w: '#cfe0ff' } },
  sword: { map: ["......w", ".....ww", "....ww.", "h..ww..", ".hww...", ".bh....", "b..h..."], pal: { w: '#eceaf2', h: '#c08a46', b: '#6b4a2e' } },
  shield: { map: ["bbbbbbb", "bwwbbbb", "bwbbbbb", "bbbbbbb", ".bbbbb.", "..bbb..", "...b..."], pal: { b: '#6aa8d8', w: '#dcf2ff' } },
  curse: { map: [".......", "..ppp..", ".pwwwp.", "pwwkwwp", ".pwwwp.", "..ppp..", "......."], pal: { p: '#bb96ee', w: '#f2e4ff', k: '#2a1040' } },
  bleed: { map: ["...r...", "...r...", "..rrr..", ".rrwrr.", ".rwrrr.", ".rrrrr.", "..rrr.."], pal: { r: '#d83a46', w: '#ffb0b0' } },
  doom: { map: [".ppppp.", "ppppppp", "pkkpkkp", "ppppppp", ".ppkpp.", ".p.p.p.", "......."], pal: { p: '#bb96ee', k: '#24103a' } },
  rage: { map: ["...r...", "..rrr..", ".rrrrr.", "rrrrrrr", "..rrr..", "..rrr..", "..rrr.."], pal: { r: '#e5574a' } },
  charge: { map: ["bbbbbbb", ".yyyyy.", "..yyy..", "...y...", "..y.y..", ".y...y.", "bbbbbbb"], pal: { b: '#9a8a70', y: '#f7c24a' } },
  holy: { map: ["y..y..y", ".y.y.y.", "..www..", "yywwwyy", "..www..", ".y.y.y.", "y..y..y"], pal: { y: '#f7d36a', w: '#fffbe0' } },
  dazzle: { map: ["w..y..w", ".w.y.w.", "..yyy..", "yyywyyy", "..yyy..", ".w.y.w.", "w..y..w"], pal: { y: '#fff3c8', w: '#c9e8ff' } },
  kindle: { map: ["...o...", "..oo...", "..ooo.o", ".ooyoo.", ".oyyyo.", "oyywyyo", ".oyyyo."], pal: { o: '#e2582e', y: '#f7b34a', w: '#fff0c0' } },
  mark: { map: ["r.....r", ".r...r.", "..r.r..", "...r...", "..r.r..", ".r...r.", "r.....r"], pal: { r: '#ff5a4a' } },
  lantern: { map: ["..bbb..", "..b.b..", ".bbbbb.", ".byyyb.", ".bywyb.", ".byyyb.", ".bbbbb."], pal: { b: '#9a8a6a', y: '#f7c24a', w: '#fff2c0' } },
  skull: { map: [".bbbbb.", "bbbbbbb", "bkbbbkb", "bbbbbbb", ".bbkbb.", ".b.b.b.", "......."], pal: { b: '#d8d0bc', k: '#2a2233' } },
  cross: { map: ["..ggg..", "..ggg..", "ggggggg", "ggwgggg", "ggggggg", "..ggg..", "..ggg.."], pal: { g: '#8ac46a', w: '#e0ffd0' } },
  gear: { map: ["..g.g..", ".ggggg.", "gg...gg", ".g...g.", "gg...gg", ".ggggg.", "..g.g.."], pal: { g: '#b4a8b6' } },
  // skill marks for the turn flags
  claw: { map: ["....r.r", "...r.r.", "..r.r.r", ".r.r.r.", "r.r.r..", ".r.r...", "r.r...."], pal: { r: '#e86a5a' } },
  arrow: { map: ["...wwww", ".....ww", "....w.w", "...w..w", "..w....", "fw.....", "ff....."], pal: { w: '#e6e0cf', f: '#c84a3a' } },
  orb: { map: ["..ooo..", ".oyyyo.", "oyywyyo", "oyyyyyo", "oyyyyyo", ".oyyyo.", "..ooo.."], pal: { o: '#c07a2a', y: '#ffb04a', w: '#fff3c8' } },
  bell: { map: ["...k...", "..bbb..", ".bbwbb.", ".bbbbb.", ".bbbbb.", "bbbbbbb", "...k..."], pal: { b: '#9ab8c8', w: '#e8f4ff', k: '#5a7080' } },
  wave: { map: [".......", ".ww..ww", "w..ww..", ".......", ".ww..ww", "w..ww..", "......."], pal: { w: '#6af0d8' } },
  burst: { map: ["g..g..g", ".g.g.g.", "..yyy..", "ggywygg", "..yyy..", ".g.g.g.", "g..g..g"], pal: { g: '#a8c85a', y: '#e8f0a0', w: '#ffffff' } },
  mace: { map: ["....mm.", "...mMmm", "...mmmm", "...wmm.", "..w....", ".w.....", "w......"], pal: { m: '#a7adb8', M: '#e8ecf0', w: '#a0703a' } },
  bone: { map: ["bb.....", "bbb....", ".bb....", "..bb...", "...bb..", "....bbb", ".....bb"], pal: { b: '#e0d8c4' } },
  cleave: { map: ["..www..", ".wwwww.", "wwwhwww", "...h...", "...h...", "...h...", "...b..."], pal: { w: '#eceaf2', h: '#c08a46', b: '#6b4a2e' } },
  book: { map: ["bbbbbbb", "bwwbwwb", "bwwbwwb", "bwwbwwb", "bwwbwwb", "bbbbbbb", "......."], pal: { b: '#8a5a3a', w: '#ece4d2' } },
  check: { map: [".......", "......g", ".....g.", "g...g..", ".g.g...", "..g....", "......."], pal: { g: '#b4de98' } },
  lock: { map: ["..bbb..", ".b...b.", ".b...b.", "bbbbbbb", "bbbybbb", "bbbybbb", "bbbbbbb"], pal: { b: '#7d7186', y: '#2a2233' } },
  boss: { map: ["x...x...x", "xx.xxx.xx", "xxxxxxxxx", "xyxxyxxyx", "xxxxxxxxx", "xxxxxxxxx"], pal: { x: '#e8c24a', y: '#c43b3b' } },
};
const iconURLs = new Map();
function iconURL(name) {
  if (iconURLs.has(name)) return iconURLs.get(name);
  const ic = UI_ICONS[name], s = sprite(ic.map, ic.pal, 'i:' + name);
  const n = Math.max(s.width, s.height), c = document.createElement('canvas'); c.width = n; c.height = n;
  c.getContext('2d').drawImage(s, Math.floor((n - s.width) / 2), Math.floor((n - s.height) / 2));
  const url = c.toDataURL(); iconURLs.set(name, url); return url;
}
const ico = (name, cls = '') => h('img', { class: 'ico ' + cls, src: iconURL(name), alt: '', draggable: 'false' });

// A small square picture of a unit's head and shoulders, for the turn strip and the report.
const portraitURLs = new Map();
function portraitURL(key, hero) {
  const ck = (hero ? 'p:' : 'f:') + key;
  if (portraitURLs.has(ck)) return portraitURLs.get(ck);
  const s = hero ? heroSide(key) : foeSprite(key);
  const c = document.createElement('canvas'); c.width = 16; c.height = 16;
  const x = c.getContext('2d');
  // heroes show their side view, foes their face
  const ox = Math.floor((16 - s.width) / 2), oy = hero ? 1 : Math.max(0, Math.min(2, 16 - s.height));
  x.drawImage(s, ox, oy);
  const url = c.toDataURL(); portraitURLs.set(ck, url); return url;
}
