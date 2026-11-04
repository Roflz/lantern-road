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
  // the Mourner's veil, draped over the head and shoulders
  veil: { x: 4, y: -1, map: ["..vvvv..", ".vvvvvv.", "vv....vv", "v......v", "v......v", "v......v", ".v....v."] },
};
const FOE_ART = {
  ghoul: { tpl: 'hunched', pal: { h: '#7d8a6a', e: '#e8f07a', m: '#1e1612', b: '#4d5640', c: '#c9c2a4', d: '#343a2c' }, eye: '#e8f07a' },
  rats: { tpl: 'swarm', pal: { b: '#6a564c', e: '#ff5a4a' }, eye: '#ff5a4a' },
  bones: { tpl: 'skeleton', pal: { x: '#d8d0bc', e: '#7ad0ff', c: '#a89e88' }, eye: '#7ad0ff' },
  gravewarden: { tpl: 'knight', pal: { h: '#55575e', e: '#ff7a3a', b: '#3e4047', a: '#6b6d75', r: '#6b2b22', c: '#6b6d75', s: '#c9ccd4' }, eye: '#ff7a3a' },
  sexton: { tpl: 'humanoid', acc: ['shovel'], pal: { h: '#a89a86', e: '#ffd36a', m: '#1e1612', b: '#3b3029', d: '#211a15', c: '#a89a86', w: '#6b4a2e', s: '#9aa0a8' }, eye: '#ffd36a' },
  // Region I's new foes reuse the templates with their own palettes (campaign spec §3.3)
  shambler: { tpl: 'hunched', pal: { h: '#b4b09c', e: '#c8d0d8', m: '#2a2420', b: '#7e7a6c', c: '#d8d4c4', d: '#4e4a40' }, eye: '#c8d0d8' },
  glutton: { tpl: 'bloat', pal: { h: '#a8a070', e: '#f0e070', m: '#2a1a12', b: '#878152', p: '#c89a50', d: '#4a4630' }, eye: '#f0e070' },
  crows: { tpl: 'swarm', pal: { b: '#221d28', e: '#f4d24a' }, eye: '#f4d24a' },
  mourner: { tpl: 'humanoid', acc: ['veil'], pal: { h: '#6a5e72', e: '#f0e8ff', m: '#0e0c12', b: '#3e3446', d: '#241c2a', c: '#8a7e92', v: '#9a8eae' }, eye: '#f0e8ff' },
  digger: { tpl: 'humanoid', acc: ['shovel'], pal: { h: '#9a7a58', e: '#f0d8a8', m: '#2a1a12', b: '#5a4028', d: '#3a2a1a', c: '#9a7a58', w: '#6b4a2e', s: '#8a9098' }, eye: '#f0d8a8' },
  ratking: { tpl: 'swarm', acc: ['crown'], pal: { b: '#7e6456', e: '#ff6a4a', y: '#c8a040', r: '#a83a2e' }, eye: '#ff6a4a' },
  moths: { tpl: 'swarm', pal: { b: '#cfc6a8', e: '#4a3a24' }, eye: '#fff2c0' },
  mimic: { tpl: 'knight', pal: { h: '#5a4a3e', e: '#ffd36a', b: '#3e3028', a: '#6e5a48', r: '#8a3a2a', c: '#6e5a48', s: '#a89880' }, eye: '#ffd36a' },
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

// ── heroes: layered sprites (build step 4)
// A hero is drawn in layers, so every piece of gear shows wherever they appear: in battle, on the hero sheet, on the
// Party screen and in the level-up sheet. The layers, back to front: things slung on the back, the class's body, its
// armour (recoloured and patterned by weight and piece, with pauldrons for heavy plate), accessories, the weapon in
// the hand, and the hand over the grip. Two views: the side (battles and menus, facing right) and the back (the party
// waiting on the road). One item looks the same in both, and the same everywhere.
//
// Body letters: h H hood, hair or helm · n skin · e eye · s S collar or mantle · c C torso · a arm · d hem or skirt ·
// k boots. Other letters are the class's own accents (a plume, a rune, a sash). Under armour the torso's accents (acc)
// are covered. Anchors: hand (the weapon's grip), torso (the collar row), belt (the belt row). hood: the hood can take a
// cloak's colours.
const HERO_PAL = {
  sellsword: { h: '#6e2f22', H: '#a24e34', s: '#b8402e', S: '#8a2e22', c: '#5a3a26', C: '#3e2718', d: '#2a1a10', a: '#5a3a26', n: '#d8a878', k: '#2a1c14' },
  warden: { h: '#8a8f99', H: '#c3c8d0', p: '#9e3a32', s: '#a7adb8', S: '#6b7280', c: '#2c3b55', C: '#1f2a3e', d: '#16202e', a: '#6b7280', n: '#c9a27a', k: '#2a2622', y: '#e8c24a' },
  crossbowman: { h: '#3e5a32', H: '#5a7a48', c: '#4a6a3a', C: '#324a28', d: '#22341c', a: '#4a6a3a', n: '#d8a878', k: '#2a2418', t: '#7a5232', f: '#e8e0cc', s: '#3e5a32', S: '#2e4426' },
  pilgrim: { h: '#8a7a5a', H: '#b8a47a', c: '#d6ccb6', C: '#a89c84', d: '#7a705e', a: '#d6ccb6', n: '#d8a878', k: '#5a4e3e', s: '#e8e0cc', S: '#b8ac94' },
  lamplighter: { h: '#3a5a5c', H: '#5a8a8c', c: '#b8682a', C: '#8a4a1c', d: '#5a3014', a: '#b8682a', n: '#d8a878', k: '#2a2016', t: '#3a5a5c', s: '#b8682a', S: '#8a4a1c' },
  hexblade: { h: '#4e2c62', H: '#704688', c: '#3e2450', C: '#2a1838', d: '#1c1026', a: '#3e2450', n: '#c9a2b0', k: '#1c1420', g: '#bb96ee', G: '#e8d8ff', s: '#4e2c62', S: '#2a1838' },
  duellist: { h: '#2e1e34', H: '#56405e', p: '#ece4d8', b: '#5a3020', n: '#e0b08a', s: '#e8e4dc', S: '#b8b0a4', c: '#8a2a2e', C: '#5e1c22', y: '#d8b44a', a: '#8a2a2e', d: '#2e2232', k: '#3a2418', K: '#7a5a3a', t: '#4a1e30' },
  alchemist: { h: '#5a4030', H: '#7a5a40', g: '#7ac46a', G: '#d0f8a8', n: '#d8a878', s: '#6b5236', S: '#4a3a26', c: '#4a5a3a', C: '#34402a', w: '#b8a888', W: '#8a7c64', a: '#4a5a3a', d: '#2e3424', k: '#2a2018', t: '#3a2a1c', r: '#d4484a', v: '#6a94e8' },
  surgeon: { h: '#3a3440', H: '#5a5260', b: '#4a3020', m: '#4a3020', n: '#e0b48a', s: '#d8d0c0', S: '#a8a090', c: '#3a4a5a', C: '#2a3442', w: '#e0d8c8', W: '#b0a898', r: '#a83a3a', a: '#d8d0c0', d: '#2a2a32', k: '#1e1a1e' },
  bellringer: { h: '#4a5a6e', H: '#6e7e92', n: '#d8b08a', c: '#5a6a7e', C: '#3e4a5a', d: '#2e3644', t: '#c9a86a', y: '#d8b44a', a: '#5a6a7e', k: '#3a2e24', s: '#4a5a6e', S: '#3e4a5a' },
  gravecaller: { h: '#3a4436', H: '#56634f', n: '#c8c4b0', e: '#9ae06a', c: '#2e382c', C: '#1e261e', d: '#161c16', b: '#d8d0bc', a: '#2e382c', k: '#181e18', s: '#3a4436', S: '#1e261e' },
  cutpurse: { h: '#3a3430', H: '#5a5048', n: '#d8a878', m: '#6a2a2a', c: '#4a3a2a', C: '#32261a', t: '#2a2018', y: '#a8822a', a: '#3a3430', d: '#2a2622', k: '#1e1a16', s: '#3a3430', S: '#2a2622' },
};
// Seen from the side, facing the foes on the right.
const SIDE_BODY = {
  sellsword: { hand: [8, 7], torso: 7, belt: 13, map: [
    '............', '............', '....hhhh....', '...hHhhhh...', '...hhhhnn...', '...hhhnen...', '....hhnn....', '...sssssna..', '..ssccccca..',
    '..cCcccca...', '..cCcccca...', '..cCccccc...', '..cCccccc...', '..cccccc....', '.cCcccccc...', '.dCddcdd....', '..kk..kk....', '..kk..kk....'] },
  warden: { hand: [8, 11], torso: 7, belt: 14, acc: 'y', map: [
    '............', '...pp.......', '..phhhh.....', '..hHhhhh....', '..hhhheee...', '..hhhhhhh...', '...hhhhh....', '..ssssssss..', '.sSsssssssa.',
    '..sccccsa...', '..cCcycca...', '..cCyyycn...', '..cCcycc....', '..cCcccc....', '..ccccccc...', '..dCcccCd...', '...kk.kk....', '...kk.kk....'] },
  crossbowman: { hand: [8, 9], torso: 8, belt: 13, hood: true, map: [
    '............', '............', '.....hhh....', '....hhHhh...', '...hhhhhnn..', '...hhhhnen..', '...hhhhhnn..', '..thhhhhh...', '.ff.cccccc..',
    '.tt.ccccna..', '.t..cCccca..', '....cCccc...', '....cCcccc..', '....ccccc...', '...cCcccc...', '...dCddcd...', '....kk.kk...', '....kk.kk...'] },
  pilgrim: { hand: [8, 8], torso: 7, belt: 12, map: [
    '............', '............', '....hhhh....', '.hhhhhhhhhh.', '...hHhhh....', '...hnnnn....', '...nnenn....', '...ssss.....', '..cSccccn...',
    '..cCcccca...', '..cCcccca...', '..cCcccc....', '..ccccc.....', '.cCcccc.....', '.cCcccccc...', '.dddddddd...', '..kk.kk.....', '..kk.kk.....'] },
  lamplighter: { hand: [5, 9], torso: 7, belt: 13, hood: true, map: [
    '............', '............', '....hhh.....', '...hHhh.....', '...hhhnn....', '...hhnen....', '...hhhnn....', '....tttt....', '...ccccc....',
    '..cCcnca....', '..cCccca....', '..cCccc.....', '..cCcccc....', '..cccccc....', '.cCcccccc...', '.dtdtdtdt...', '..kk..kk....', '..kk..kk....'] },
  hexblade: { hand: [9, 9], torso: 8, belt: 12, hood: true, acc: 'gG', map: [
    '....h.......', '....hh......', '....hhh.....', '...hhHhh....', '...hhhhhh...', '...hhhhgeg..', '...hhhhhhh..', '..hhhhhhhh..', '..ccccccca..',
    '..cCccgccn..', '..cCcgGgca..', '..cCccgcc...', '..cCcccccc..', '..ccccccccc.', '.cCcccccccc.', '.d.dd.dd.dd.', '....kk..kk..', '....kk..kk..'] },
  duellist: { hand: [9, 10], torso: 7, belt: 12, acc: 'y', map: [
    '............', '..ppp.......', '...phhhh....', '.hhhhhhhhh..', '...bbnnn....', '...bbnen....', '...bbnnn....', '...sssss....', '..tCcccca...',
    '..tCccyca...', '..tCcyccan..', '..tCycccc...', '...yccccc...', '...ddddd....', '...dd.dd....', '...kk.kk....', '...KK.KK....', '..kkk.kkk...'] },
  alchemist: { hand: [9, 9], torso: 7, belt: 12, acc: 'wWtrv', map: [
    '............', '............', '....hhhh....', '...hHhhhh...', '...hhhgGg...', '...hhnnnn...', '...hhnenn...', '....snnn....', '...sssssaa..',
    '..cCwwwwan..', '..cCwWww....', '..cCwwww....', '..ctrtvt....', '..cCwwww....', '..cCwWww....', '..dddddd....', '...kk.kk....', '...kk.kk....'] },
  surgeon: { hand: [8, 10], torso: 7, belt: 12, acc: 'wWr', map: [
    '............', '............', '...hhhhh....', '..hHhhhhhh..', '...bbnnn....', '...bbnen....', '...bbnmm....', '....snnn....', '...ssssaa...',
    '..cCwwwwa...', '..cCwrwwn...', '..cCwwww....', '..cCwwrw....', '..cCwwww....', '..cCwWww....', '...dd.dd....', '...kk.kk....', '..kkk.kkk...'] },
  bellringer: { hand: [9, 8], torso: 8, belt: 12, hood: true, acc: 'ty', map: [
    '............', '....hhh.....', '...hhhhh....', '..hhHhhhh...', '..hhhhnnh...', '..hhhnenh...', '..hhhhnn....', '..hhhhhhh...', '..cCccccan..',
    '..cCcccc....', '..cCcccc....', '..cCcccc....', '..ttttttt...', '..cCcctc....', '.cCcccycc...', '.cCcccccc...', '.ddddddddd..', '...kk.kk....'] },
  gravecaller: { hand: [9, 10], torso: 8, belt: 12, hood: true, acc: 'b', map: [
    '............', '...b..b.....', '...hhhhb....', '..hhHhhh....', '..hhhnnnh...', '..hhhnen....', '..hhhnnn....', '..hhhhhhh...', '..cCcbcbca..',
    '..cCccbcca..', '..cCcccccn..', '..cCccccc...', '..cCcccc....', '.cCccccc....', '.cCcccccc...', '.cCcccccc...', '.d.dd.dd.d..', '...kk.kk....'] },
  cutpurse: { hand: [8, 10], torso: 8, belt: 12, hood: true, acc: 'ty', map: [
    '............', '............', '....hhhh....', '...hHhhhh...', '...hhhhnh...', '...hhhnen...', '...hhhmmm...', '...hhhmm....', '..sCcccca...',
    '..cCcccca...', '..cCcccan...', '..cCcccc....', '..ttyttt....', '..cCcccc....', '...dd.dd....', '...dd.dd....', '...kk.kk....', '..kkk.kkk...'] },
};
// Seen from behind, walking up the road; the weapon hand is on the right.
const BACK_BODY = {
  sellsword: { hand: [11, 11], torso: 7, belt: 13, map: [
    '..............', '..............', '.....hhhh.....', '....hHhhHh....', '....hhhhhh....', '....hhhhhh....', '.....nnnn.....', '...ssssssss...', '..assssssssa..', '..acCccccCca..',
    '..acCccccCca..', '..ncCccccCcn..', '...cCccccCc...', '...cccccccc...', '..cCccccccCc..', '..dCddccddCd..', '....dd..dd....', '....kk..kk....', '....kk..kk....'] },
  warden: { hand: [12, 11], torso: 6, belt: 14, acc: 'y', map: [
    '.....pp.......', '....phhhh.....', '....hHhhhh....', '....hhhhhh....', '....hhhhhh....', '.....hhhh.....', '..ssssssssss..', '.sSssssssssSs.', '.a.cCccccCc.a.', '.a.cCcyycCc.a.',
    '.a.cCyyyyCc.a.', '.n.cCcyycCc.n.', '...cCcyycCc...', '...cCccccCc...', '...cccccccc...', '...dCccccCd...', '...dCccccCd...', '....kk..kk....', '....kk..kk....'] },
  crossbowman: { hand: [11, 10], torso: 7, belt: 13, hood: true, map: [
    '..............', '......hhh.....', '.....hhHhh....', '....hhhhhhh...', '....hhhhhhh...', '....hhhhhhh...', '.....hhhhh....', '...ccccccccf..', '..acCcccctff..', '..acCccctcCa..',
    '..ncCcctccCn..', '...cCctcccc...', '...cCtccccc...', '...cccccccc...', '..cCccccccCc..', '..dCddccddCd..', '....dd..dd....', '....kk..kk....', '....kk..kk....'] },
  pilgrim: { hand: [11, 10], torso: 6, belt: 12, map: [
    '..............', '..............', '.....hhhh.....', '..hhhhhhhhhh..', '.....hHhh.....', '.....hhhh.....', '....ssssss....', '...sSSssSSs...', '..acSssssSca..', '..acCcsscCca..',
    '..ncCccccCcn..', '...cCccccCc...', '...cCccccCc...', '...cccccccc...', '..cCccccccCc..', '..cCccccccCc..', '..dddddddddd..', '....kk..kk....', '....kk..kk....'] },
  lamplighter: { hand: [11, 10], torso: 7, belt: 13, hood: true, map: [
    '..............', '..............', '.....hhhh.....', '....hHhhhh....', '....hhhhhh....', '....hhhhhh....', '.....hhhh.....', '....tttttt....', '..acccccccca..', '..acCccccCca..',
    '..ncCccccCcn..', '...cCccccCc...', '...cCccccCc...', '...cccccccc...', '..cCccccccCc..', '..dtdtdtdtdt..', '....kk..kk....', '....kk..kk....'] },
  hexblade: { hand: [11, 10], torso: 8, belt: 12, hood: true, acc: 'gG', map: [
    '......h.......', '......hh......', '.....hhhh.....', '.....hHhhh....', '....hhhhhh....', '....hhhhhhh...', '...hhhhhhhh...', '..hhhhhhhhhh..', '..acccccccca..', '..acCcgccCca..',
    '..ncCgGgcCcn..', '...cCcgccCc...', '...cCccccCc...', '..cCccccccCc..', '..cCccccccCc..', '.cCccccccccCc.', '.d.dd.dd.dd.d.', '....kk..kk....', '....kk..kk....'] },
  duellist: { hand: [11, 10], torso: 6, belt: 12, acc: 'y', map: [
    '..............', '....ppp.......', '.....phhhh....', '..hhhhhhhhhh..', '.....bbbb.....', '.....bbbb.....', '....ssssss....', '...tttttttt...', '..atttttttta..', '..aCttttttCa..',
    '..nCcttttcCn..', '...cCccccCc...', '...yyyyyyyy...', '...cCccccCc...', '....dddddd....', '....dd..dd....', '....kk..kk....', '....KK..KK....', '...kkk..kkk...'] },
  alchemist: { hand: [11, 10], torso: 7, belt: 12, acc: 'wWtrv', map: [
    '..............', '..............', '.....hhhh.....', '....hHhhhh....', '....gggggg....', '....hhhhhh....', '.....nnnn.....', '...ssssssss...', '..acCccccCca..', '..acCccccCca..',
    '..ncCccccCcn..', '...cCccccCc...', '...trtvttrt...', '...cCccccCc...', '..cCccccccCc..', '..dddddddddd..', '....kk..kk....', '....kk..kk....'] },
  surgeon: { hand: [11, 10], torso: 7, belt: 12, acc: 'wWr', map: [
    '..............', '..............', '....hhhhhh....', '...hHhhhhhh...', '.....bbbb.....', '.....bbbb.....', '.....nnnn.....', '...ssssssss...', '..acCccccCca..', '..acCccccCca..',
    '..ncCccccCcn..', '...cCccccCc...', '...wwwwwwww...', '...cCccccCc...', '...cccccccc...', '....dd..dd....', '....dd..dd....', '....kk..kk....', '...kkk..kkk...'] },
  bellringer: { hand: [11, 10], torso: 8, belt: 12, hood: true, acc: 'ty', map: [
    '..............', '......hhh.....', '.....hhhhh....', '....hHhhhhh...', '....hhhhhhh...', '....hhhhhhh...', '....hhhhhhh...', '...hhhhhhhhh..', '..acCccccCca..', '..acCccccCca..',
    '..ncCccccCcn..', '...cCccccCc...', '...ttttttttt..', '...cCcccctc...', '..cCccccccyc..', '..cCccccccCc..', '.ddddddddddd..', '....kk..kk....'] },
  gravecaller: { hand: [11, 10], torso: 8, belt: 12, hood: true, acc: 'b', map: [
    '..............', '....b....b....', '....bhhhhb....', '....hHhhhh....', '....hhhhhh....', '....hhhhhh....', '....hhhhhh....', '...hhhhhhhh...', '..acCccccCca..', '..acCccccCca..',
    '..ncCccccCcn..', '...cCccccCc...', '...cCccccCc...', '..cCccccccCc..', '..cCccccccCc..', '..cCccccccCc..', '.d.dd.dd.dd.d.', '....kk..kk....'] },
  cutpurse: { hand: [11, 10], torso: 7, belt: 12, hood: true, acc: 'ty', map: [
    '..............', '..............', '.....hhhh.....', '....hHhhhh....', '....hhhhhh....', '....hhhhhh....', '.....hhhh.....', '...ssssssss...', '..acCccccCca..', '..acCccccCca..',
    '..ncCccccCcn..', '...cCccccCc...', '...ttyttytt...', '...cCccccCc...', '....dd..dd....', '....dd..dd....', '....kk..kk....', '...kkk..kkk...'] },
};

// ── gear art. Weapons: a map with its grip at '+', held in the hero's hand ('g' pixels glow). Armour: colours for the
// body's letters, a pattern, and pieces laid over it. Accessories: a small piece at an anchor, or a change of colour.
// Every item also has an icon for the Bag (js/items.js names the items).
const STEEL = { W: '#eceaf2', w: '#c3c8d0', v: '#8a8f99', k: '#4a4c54', h: '#6b4a2e', y: '#c08a46', Y: '#f0c060' };
const WAP = o => Object.assign({}, STEEL, o);
const GEAR_ART = {
  // Swords
  notchedsword: { pal: WAP({ y: '#7a7c86' }), map: ['.......W', '......Wv', '.....Wv.', '......v.', '...Wv...', '..yyy...', '..+.....', '.k......'] },
  hirelingsabre: { pal: WAP({}), map: ['......WW', '.....Wv.', '....Wv..', '...Wv...', '...Wv...', '.yyy....', '.y+.....', '.yk.....'] },
  headsmansblade: { pal: WAP({ r: '#a83a2e', k: '#3a3c42' }), map: ['.....WWv', '....WWvv', '...WWvv.', '..WWvv..', '..Wvv...', '.kkkk...', '..+.....', '..r.....', '.k......'] },
  gravecutter: { pal: WAP({ g: '#9ae06a', k: '#8a8e98', K: '#4e525a', r: '#6b2b22' }), glow: '#9ae06a', map: ['........g', '.......gk', '......gkK', '.....gkK.', '....gkK..', '...gkK...', '..gkK....', '.rrrrr...', '..+......', '..h......', '.k.......'] },
  marshalsblade: { pal: WAP({ w: '#9a9aa4', W: '#e0e0e8', g: '#ff7a2a', Y: '#f7d36a', y: '#c08a2a', h: '#3a2a22' }), glow: '#ff8a3a', map: ['........W', '.......Wg', '......Wwg', '.....Wwg.', '....Wwg..', '...Wwg...', '..Wwg....', '.YyyyY...', '..+......', '..h......', '.Y.......'] },
  // Cursed blades
  rustedsickle: { pal: WAP({ w: '#c07848', v: '#8a4a2a' }), map: ['..vwww.', '.v....w', '......w', '.....w.', '....h..', '...h...', '..+....'] },
  hexedkris: { pal: WAP({ W: '#f4f0fa', v: '#a8a0b8', y: '#8a6a9a', g: '#d8b0ff' }), glow: '#bb96ee', map: ['..W.', '.Wv.', '..Wv', '.Wv.', '..Wv', 'gyyg', '.+..', '.k..'] },
  witchironsickle: { pal: WAP({ k: '#8a92a8', g: '#d0a0ff', h: '#2a2230' }), glow: '#c08aff', map: ['..gkkkk.', '.g.....k', '.......k', '......k.', '.....h..', '....h...', '...h....', '..+.....'] },
  mourningblade: { pal: WAP({ W: '#e8ecf4', k: '#6a6478', y: '#b4b8c4', f: '#1e1824' }), map: ['.....W', '....Wk', '...Wk.', '..Wk..', '.Wk...', 'yyy...', '.+f...', '..ff..', '...f..'] },
  // Censers: a pole with a censer hanging from it
  tincenser: { pal: { h: '#7a5a3a', y: '#9a9aa4', l: '#9a9aa4', w: '#b4b0b8', v: '#7a7680', g: '#ffb04a' }, glow: '#ffb04a', smoke: true, map: ['hyy.', 'h.l.', 'h.l.', 'hvwv', 'hwgw', 'h.v.', 'h...', '+...', 'h...', 'h...'] },
  chapelcenser: { pal: { h: '#6b4a2e', y: '#c08a46', Y: '#f0c060', l: '#c08a46', g: '#ffd06a' }, glow: '#ffc65a', smoke: true, map: ['.y...', 'yyy..', '.hyy.', '.h.l.', '.hYyY', '.hygy', '.h.y.', '.h...', '.+...', '.h...', '.h...'] },
  drownedcenser: { pal: { h: '#3a4a46', w: '#4a8a7a', t: '#4a8a7a', v: '#2e5a50', g: '#5af0d0', b: '#6aa8d8', l: '#4a8a7a' }, glow: '#5af0d0', smoke: true, map: ['.hww.', '.h..l', '.h..l', '.h.vtv', '.h.tgt', '.h..v.', '.h..b.', '.h....', '.+..b.', '.h....', '.h....'] },
  emberthurible: { pal: { h: '#5a3a22', y: '#a8782a', l: '#a8782a', o: '#e2582e', f: '#ffb04a', r: '#c8402a', g: '#fff0c0' }, glow: '#ff9a3a', smoke: true, map: ['.yyy...', '.h..l..', '.h..l..', '.h.ofo.', '.h.yry.', '.hyrgry', '.h.yry.', '.h..y..', '.+.....', '.h.....'] },
  bishopscrozier: { pal: { Y: '#f7d36a', y: '#c08a2a', g: '#5af0d0', h: '#4a2e22' }, glow: '#5af0d0', map: ['..YYY.', '.Y...Y', '.Y.g.Y', '.Y..Y.', '.Yy...', '.yg...', '.y....', '.h....', '.+....', '.h....', '.h....', '.y....'] },
  // Maces and shields: the shield faces us, the mace rises behind it
  ironmace: { hand: false, pal: { k: '#6b6d75', K: '#a7adb8', h: '#6b4a2e', w: '#8a6a4a', W: '#c3c8d0', '+': '#c3c8d0' }, map: ['..kk.', '.kKk.', '..kk.', '..h..', '.www.', 'wwWww', 'ww+ww', 'wwwww', '.www.'] },
  watchmansflail: { hand: false, pal: { k: '#4a4c54', K: '#a7adb8', l: '#8a8f99', h: '#6b4a2e', r: '#8a6a44', y: '#e8c24a', '+': '#e8c24a' }, map: ['kk...', 'kKl..', '..l..', '..h..', 'kkkkk', 'kryrk', 'kr+rk', 'kryrk', '.krk.', '..k..'] },
  towershield: { hand: false, pal: { m: '#6b6d75', M: '#c3c8d0', h: '#6b4a2e', s: '#8a8f99', r: '#6b2b22', R: '#8a3a2e', y: '#e8c24a', '+': '#e8c24a' }, map: ['.mmm.', '.mMm.', '..h..', 'sssss', 'srRrs', 'srysr', 'sy+ys', 'srysr', 'srRrs', 'srrrs', 'sssss'] },
  spikedbulwark: { hand: false, pal: { k: '#4a4c54', K: '#8a8f99', W: '#dfe4ea', '+': '#a7adb8' }, map: ['..W...', '.kkk..', 'kkKkkW', 'kK+Kk.', 'kkKkkW', '.kkk..', '..W...'] },
  // Lanterns: a pole up and over, and the lantern hanging from its end ('g' is the flame)
  tinlantern: { lamp: true, pal: { w: '#6b4a2e', b: '#6b5236', y: '#ffc65a', g: '#fff3c8' }, map: ['...wwwww.', '...w...b.', '...w..bbb', '..w...byb', '..w...bgb', '..w...byb', '.w.....b.', '.w.......', '+........'] },
  shutteredlantern: { lamp: true, pal: { w: '#5a3a22', b: '#a8822a', k: '#3a3a44', y: '#ffd88a', g: '#fff3c8' }, map: ['...wwwww.', '...w...b.', '...w..kbk', '..w...kyk', '..w...kgk', '..w...kyk', '.w.....b.', '.w.......', '+........'] },
  mothlure: { lamp: true, light: '#c8f0a0', pal: { w: '#6b4a2e', b: '#5a6a4a', y: '#b8f0a0', g: '#f0ffe0', m: '#ece4d8' }, glow: '#b8f0a0', map: ['...wwwww..', '...w...b.m', '...w..bbb.', '..w..mbyb.', '..w...bgb.', '..w...bybm', '.w.....b..', '.w........', '+.........'] },
  bonfirelantern: { lamp: true, pal: { w: '#5a3a22', k: '#4a4c54', o: '#e2582e', f: '#f7b34a', O: '#ff8a3a', y: '#ffc65a', g: '#fff3c8' }, glow: '#ff8a3a', map: ['...wwwww...', '...w...k...', '...w..f.f..', '..w..fofof.', '..w..kOyOk.', '..w..kygyk.', '.w....kkk..', '.w.........', '+..........'] },
  // Crossbows: held level at the shoulder, pointing at the foes
  huntingcrossbow: { pal: { T: '#a8784a', w: '#7a5232', l: '#d8c8a0', k: '#c3c8d0', '+': '#7a5232' }, map: ['.....w..', '....lw..', '+TTTTTTk', '....lw..', '.....w..'] },
  windlass: { pal: { T: '#8a5a32', v: '#a7adb8', l: '#d8c8a0', k: '#4a4c54', K: '#c3c8d0', '+': '#8a5a32' }, map: ['......v..', '.....lv..', 'k+TTTTTTK', 'kk...lv..', '......v..'] },
  repeater: { pal: { h: '#5a3a22', H: '#8a6a44', T: '#7a5232', w: '#6b4a2e', l: '#d8c8a0', k: '#c3c8d0', '+': '#7a5232' }, map: ['..hhh...', '..hHh.w.', '..hhhlw.', '+TTTTTTk', '.....lw.', '......w.'] },
  arbalest: { pal: { T: '#5a3a22', v: '#c3c8d0', V: '#8a8f99', l: '#d8c8a0', k: '#4a4c54', K: '#eceaf2', '+': '#5a3a22' }, map: ['......v...', '......V...', '.....lv...', '+TTTTTTTTK', '.k...lv...', '......V...', '......v...'] },
  // Rapiers
  practicerapier: { pal: WAP({ k: '#e8e0cc', y: '#9a9aa4' }), map: ['.......k', '......W.', '.....W..', '....W...', '...W....', '..W.....', '.yy.....', '.y+.....'] },
  smallsword: { pal: WAP({ Y: '#f7d36a', y: '#d8b44a' }), map: ['......W', '.....W.', '....W..', '...W...', '.YyY...', '..+....'] },
  maingauche: { pal: WAP({ y: '#c3c8d0', Y: '#d8b44a' }), map: ['....W', '...WW', '..WWv', '.WWv.', 'YyyY.', '.yy..', '.+...'] },
  // Flasks: held up in the hand
  clayflasks: { pal: { k: '#6b4a2e', r: '#b8704a', R: '#e8a878', '+': '#b8704a' }, map: ['.k.', '.r.', 'rRr', 'rRr', 'r+r'] },
  grenadoes: { pal: { s: '#fff0a0', l: '#6b4a2e', g: '#8cc4e6', G: '#e8f6ff', '+': '#5a8aa8' }, glow: '#fff0a0', glowAt: 's', map: ['..s.', '..l.', '.ggg', 'gGgg', '.ggg', '..+.'] },
  witchfiresatchel: { pal: { f: '#5ac84a', g: '#c8f8a0', h: '#6b4a2e', H: '#8a6a44', y: '#c08a46', '+': '#6b4a2e' }, glow: '#9ae06a', map: ['.f.f.', 'fgfgf', 'hhhhh', 'hHhhh', 'hhyhh', '.h+h.'] },
  // Bonesaws
  rustybonesaw: { pal: { w: '#9a8a7a', r: '#a0603a', v: '#7a6a5a', h: '#6b4a2e' }, map: ['..wwwrw', 'hwwrwww', '+.v.v.v'] },
  surgeonskit: { pal: { W: '#eceaf2', w: '#c3c8d0', v: '#8a8f99', y: '#c08a46', '+': '#c08a46' }, map: ['..WWWWW', 'yWwwwww', '+.v.v.v'] },
  butcherssaw: { pal: { w: '#b4b0b8', W: '#dcdce4', r: '#a83a3a', v: '#7a7680', h: '#4a2e22' }, map: ['..WWWWW.', '..wwwwww', 'hhwrwwrw', '+.v.vrv.'] },
  // Handbells: rung from the handle, the bell below the hand
  brasshandbell: { pal: { h: '#6b4a2e', y: '#c08a46', Y: '#f0c060', k: '#4a4c54' }, map: ['..+..', '..h..', '.yyy.', '.yYy.', 'yyyyy', '..k..'] },
  vesperbell: { pal: { h: '#3a3440', s: '#a7adb8', S: '#eef2f6', g: '#8cc4e6' }, glow: '#8cc4e6', map: ['..+..', '..h..', '.sss.', '.sSs.', '.sss.', 'sssss', '..g..'] },
  chapelbell: { pal: { h: '#5a3a22', y: '#a8782a', Y: '#d8a84a', k: '#2a2230' }, map: ['...+...', '..hhh..', '..yyy..', '.yYyyy.', '.yYkyy.', '.yyyky.', 'yyyyyyy', '...k...'] },
  // Bone staves
  femurstaff: { pal: { b: '#e0d8c4', B: '#a89e88' }, map: ['.bb', 'bbB', '.b.', '.b.', '.B.', '.b.', '.b.', '.b.', '.b.', '.+.', '.b.', '.b.', 'bbB'] },
  ossuaryrod: { pal: { s: '#d8d0bc', k: '#2a2233', h: '#3a2a22' }, map: ['.sss.', '.sks.', '..s..', '.sss.', '.sks.', '..h..', '..h..', '..h..', '..h..', '..h..', '..+..', '..h..', '..h..'] },
  barrowkingstaff: { pal: { y: '#d8b44a', s: '#d8d0bc', g: '#9ae06a', h: '#26222a' }, glow: '#9ae06a', map: ['y.y.y', 'yyyyy', 'sssss', 'sgsgs', '.sss.', '..h..', '..h..', '..h..', '..h..', '..h..', '..h..', '..+..', '..h..', '..h..'] },
  // Daggers
  rustyshiv: { pal: { w: '#9a8070', v: '#6a5a4a', h: '#4a3a2a' }, map: ['....w', '...wv', '..wv.', '.h...', '+....'] },
  twinstilettos: { pal: { W: '#e6e4ec', y: '#d8b44a', '+': '#d8b44a' }, map: ['....W..', '...W..W', '..W..W.', '.y..W..', '+yy....'] },
  widowskiss: { pal: { k: '#2a2630', K: '#6a6476', g: '#7ac46a', y: '#4a4458', '+': '#4a4458' }, glow: '#7ac46a', map: ['....k', '...kK', '..kK.', '.yg..', '+.g..'] },

  // Armour. weight from js/items.js; pal recolours the body (c C a d s S) and the armour's own letters (1 main, 2
  // shade, 3 shine, 4 accent, 5 pattern); pattern draws over the torso; hood: a cloak that takes over the hood.
  travellerscoat: { pal: { c: '#6b5a48', C: '#4a3e32', a: '#6b5a48', d: '#3a3028', s: '#8a7a62', S: '#5a4c3c', 4: '#a8822a' }, pattern: 'buttons' },
  gravediggersleathers: { pal: { c: '#5a4630', C: '#3e3022', a: '#5a4630', d: '#2e241a', s: '#7a6448', S: '#4a3a28', 5: '#8a7a5a' }, pattern: 'spots' },
  penitentsrags: { pal: { c: '#9a9284', C: '#6e685e', a: '#9a9284', d: '#5a544c', s: '#b0a898', S: '#7a7468', 4: '#8a7a5a' }, pattern: 'tatters' },
  shadowweave: { hood: true, pal: { c: '#2c2438', C: '#1a1424', a: '#2c2438', d: '#120e1a', s: '#3a2e4a', S: '#241c30', h: '#2c2438', H: '#4a3e5e', 5: '#8a6ab0' }, pattern: 'glints' },
  mothsilk: { pal: { c: '#d8d0e0', C: '#a89cb8', a: '#d8d0e0', d: '#8a7ea0', s: '#f0e8f8', S: '#b8acc8', 5: '#7a6a9a' }, pattern: 'spots' },
  brigandine: { pal: { 1: '#6b5a3a', 2: '#4a3e28', d: '#3a3020', s: '#5a4a30', S: '#3a3020', 5: '#a7adb8', 4: '#8a8f99' }, pattern: 'rivets' },
  huntershauberk: { pal: { 1: '#8a8f99', 2: '#5a5e66', 3: '#b4b8c0', d: '#3e5a32', s: '#8a7a62', S: '#5a4c3c', 4: '#6b4a2e' }, pattern: 'chain' },
  sellswordsjack: { pal: { 1: '#8a3a2a', 2: '#5e2618', 5: '#c8a050', d: '#3e2718', s: '#a24e34', S: '#6e2f22', 4: '#c8a050' }, pattern: 'quilt' },
  drownedmail: { pal: { 1: '#4a7a6a', 2: '#2e4a42', 3: '#7ab0a0', d: '#1e3430', s: '#3a5a50', S: '#2a443c', 4: '#5af0d0', 5: '#6aa8d8' }, pattern: 'chain', drip: true },
  thornmail: { pal: { 1: '#5a5a62', 2: '#3a3a42', 3: '#8a8a94', d: '#2a2a30', s: '#4a4a52', S: '#2a2a32', 4: '#dfe4ea' }, pattern: 'chain', spikes: true },
  barkofoldgod: { pal: { 1: '#5a4028', 2: '#3a2a18', d: '#3a2a18', s: '#4a3420', S: '#2e2014', 5: '#7a5a38', 4: '#6aa04a' }, pattern: 'bark', leaves: true, glow: '#8ad06a' },
  rustedplate: { pal: { 1: '#7a6a5a', 2: '#5a4a3e', 3: '#a89080', 5: '#8a4a2a' }, pattern: 'rust' },
  gravewardensplate: { pal: { 1: '#55575e', 2: '#3e4047', 3: '#8a8d95', 4: '#6b2b22' }, pattern: 'sash' },
  ashenplate: { pal: { 1: '#6a6466', 2: '#4a4446', 3: '#a09a9c', 5: '#ff7a2a' }, pattern: 'embers', glow: '#ff7a2a' },
  bastionplate: { pal: { 1: '#a7adb8', 2: '#6b7280', 3: '#eef2f6', 4: '#e8c24a' }, pattern: 'trim', big: true },
  penanceplate: { pal: { 1: '#3e3a42', 2: '#2a2630', 3: '#6a6470', 5: '#9a9aa4' }, pattern: 'chains' },

  // Accessories. at: an anchor (neck, chest, belt, hand, ear, head, heel, back); map and pal: the piece; back: slung
  // behind (side) or worn on the back (back view); paint: recolours the body instead; glow: it gives off light.
  bonecharm: { at: 'neck', map: ['b', 'B'], pal: { b: '#e0d8c4', B: '#fffaf0' } },
  knucklebone: { at: 'belt', dx: -1, map: ['wk', 'ww'], pal: { w: '#f0ece0', k: '#2a2233' } },
  haresfoot: { at: 'belt', dx: -1, dy: 1, map: ['f', 'f', 'F'], pal: { f: '#d8c8b0', F: '#a89880' } },
  prayerbeads: { at: 'neck', dx: -1, map: ['r.', '.r', 'r.', '.y'], pal: { r: '#a86a3a', y: '#e8c24a' } },
  vanguardsbadge: { at: 'chest', dx: -1, map: ['Yy', 'yr'], pal: { Y: '#f7d36a', y: '#d8b44a', r: '#c43b3b' } },
  lastbreath: { at: 'neck', dy: 1, map: ['y', 'r'], pal: { y: '#e8c24a', r: '#e04a4a' } },
  courierspur: { at: 'heel', dx: -1, map: ['Y'], pal: { Y: '#f7d36a' } },
  tallowcoin: { at: 'belt', dx: -1, map: ['Ww'], pal: { W: '#fff0c0', w: '#d8c080' } },
  halberdiershook: { at: 'back', back: true, dx: -1, dy: -7, map: ['ww.', 'w.W', '..w', '.h.', '.h.', '.h.', '.h.'], pal: { w: '#c3c8d0', W: '#eceaf2', h: '#6b4a2e' } },
  duellistsring: { at: 'hand', top: true, map: ['y'], pal: { y: '#f7d36a' } },
  earstoppers: { at: 'ear', map: ['y'], pal: { y: '#f0d878' } },
  blessedbandage: { paint: 'bandage', pal: { 4: '#f0ece0' } },
  saintsmedal: { at: 'neck', dy: 1, map: ['s', 'S'], pal: { s: '#c3c8d0', S: '#ffffff' } },
  hobnailedboots: { paint: 'boots', pal: { 4: '#4a3a2a', 5: '#c3c8d0' } },
  ironboundcollar: { paint: 'collar', pal: { 4: '#6b6d75', 5: '#c3c8d0' } },
  emberheart: { at: 'chest', map: ['O'], pal: { O: '#ff6a3a' }, glow: '#ff6a3a' },
  mournersveil: { paint: 'veil', pal: { 4: '#3a3046', 5: '#2a2234' } },
  gamblerscoin: { at: 'hand', top: true, dy: -2, map: ['Y'], pal: { Y: '#f7d36a' } },
  bloodcontract: { at: 'belt', dx: -2, map: ['wr'], pal: { w: '#ece4d2', r: '#c43b3b' } },
  witchsknot: { at: 'belt', dx: -1, map: ['g.', '.G', 'g.'], pal: { g: '#9a6ac8', G: '#e0c8ff' } },
  fingerbone: { at: 'neck', dy: 1, map: ['y', 'b', 'b'], pal: { y: '#e8c24a', b: '#e0d8c4' } },
  oathboundgorget: { paint: 'gorget', pal: { 4: '#a7adb8', 5: '#e8c24a' } },
  wickshears: { at: 'belt', dx: -2, map: ['W.W', '.W.'], pal: { W: '#dfe4ea' } },
  blackbolts: { at: 'back', back: true, front: true, dx: -1, dy: -3, map: ['ff', 'kk', 'kK', 'kk', 'k.'], pal: { f: '#5a5a66', k: '#2a2630', K: '#4a4458' } },
  fencingglove: { paint: 'glove', pal: { 4: '#f0ece0' } },
  philosopherspebble: { at: 'belt', map: ['R'], pal: { R: '#ff4a4a' }, glow: '#ff5a5a' },
  surgeonsapron: { paint: 'apron', pal: { 4: '#e8e0d0', 5: '#a83a3a' } },
  bellrope: { paint: 'rope', pal: { 4: '#c9a86a' } },
  phylactery: { at: 'neck', dy: 1, map: ['s', 'g'], pal: { s: '#c3c8d0', g: '#9ae06a' }, glow: '#9ae06a' },
  fencesledger: { at: 'belt', dx: -2, map: ['bB'], pal: { b: '#6b2b22', B: '#e8e0cc' } },
  gravediggersspade: { at: 'back', back: true, dx: -1, dy: -8, map: ['sS', 'ss', '.w', '.w', '.w', '.w', '.w', '.w'], pal: { s: '#9aa0a8', S: '#e0e4ea', w: '#6b4a2e' } },
  hollowcrown: { at: 'head', dx: -2, dy: -2, map: ['y.y.y', 'yRyky'], pal: { y: '#e8c24a', R: '#c43b3b', k: '#2a1a30' }, glow: '#f7d36a' },
};
// Icons for the Bag. Weapons use their own art; armour a shirt of its weight in its colours; accessories these.
const ARMOUR_ICON = {
  light: ['..ss.ss..', '.sSssssS.', 'aaCcccccaa', 'a.Cccccc.a', 'a.Cccccc.a', '..Cccccc..', '.CCcccccc.', '.Ccccccccc', '.dddddddd.'],
  medium: ['..s...s..', '.ssssssss', 'acCccccCa', 'acCccccCa', '..Ccccc..', '..Ccccc..', '..ttytt..', '..ddddd..', '..d...d..'],
  heavy: ['.11...11.', '1311.1131', '11ccccc11', '1.cCccc.1', '..cCccc..', '..cCccc..', '..ddddd..', '..dd.dd..'],
};
const ACC_ICON = {
  bonecharm: { map: ['..kkk..', '.k...k.', '..k.k..', '...b...', '..bBb..', '..bbb..', '...b...'], pal: { k: '#8a6a44', b: '#e0d8c4', B: '#ffffff' } },
  knucklebone: { map: ['.......', '.wwwwW.', '.wkwwW.', '.wwwwW.', '.wwwkW.', '.WWWWW.', '.......'], pal: { w: '#f0ece0', W: '#b8b0a0', k: '#2a2233' } },
  haresfoot: { map: ['...k...', '...k...', '..fff..', '..fFf..', '..fff..', '..ff...', '.fF....'], pal: { f: '#d8c8b0', F: '#a89880', k: '#6b4a2e' } },
  prayerbeads: { map: ['.r.r.r.', 'r.....r', '.......', 'r.....r', '.r...r.', '..r.r..', '...y...'], pal: { r: '#a86a3a', y: '#e8c24a' } },
  vanguardsbadge: { map: ['.yyyyy.', 'yrrrrry', 'yrYrrry', 'yrrrrry', '.yrrry.', '..yry..', '...y...'], pal: { y: '#d8b44a', Y: '#ffd0c0', r: '#a83a2a' } },
  lastbreath: { map: ['...k...', '..k.k..', '..yyy..', '.yYryy.', '.yrrry.', '.yyryy.', '..yyy..'], pal: { k: '#8a6a44', y: '#e8c24a', Y: '#fff0a8', r: '#c43b3b' } },
  courierspur: { map: ['y.y....', '.Y.....', 'y.y....', '.w.....', '..wwwww', '......w', '......w'], pal: { y: '#d8b44a', Y: '#f7d36a', w: '#9aa0a8' } },
  tallowcoin: { map: ['..www..', '.wWwww.', 'wWwkwww', 'wwkwkww', 'wwwkwww', '.wwwwd.', '..ddd..'], pal: { w: '#e8d8a8', W: '#fff4d0', d: '#b09868', k: '#8a6a44' } },
  halberdiershook: { map: ['.www...', 'w...W..', '....w..', '...ww..', '..h....', '.h.....', 'h......'], pal: { w: '#c3c8d0', W: '#eceaf2', h: '#6b4a2e' } },
  duellistsring: { map: ['.......', '...r...', '..yYy..', '.y...y.', '.y...y.', '..yyy..', '.......'], pal: { y: '#d8b44a', Y: '#fff0a8', r: '#c43b3b' } },
  earstoppers: { map: ['.......', '.yy.yy.', 'yYyyYyy', 'yyyyyyy', '.yy.yy.', '.......', '.......'], pal: { y: '#e8d07a', Y: '#fff0b0' } },
  blessedbandage: { map: ['.......', '.wwwww.', 'wWwwwWw', 'wwwywww', 'wWwwwWw', '.wwwww.', '.......'], pal: { w: '#f0ece0', W: '#c8c0b0', y: '#d8b44a' } },
  saintsmedal: { map: ['...k...', '..k.k..', '..sss..', '.sSsss.', '.ssyss.', '.sssss.', '..sss..'], pal: { k: '#8a6a44', s: '#c3c8d0', S: '#ffffff', y: '#d8b44a' } },
  hobnailedboots: { map: ['.......', '..bb...', '..bb...', '..bbb..', '.bbbbbb', '.bbbbbb', '.q.q.q.'], pal: { b: '#5a4632', q: '#c3c8d0' } },
  ironboundcollar: { map: ['.......', '.kkkkk.', 'kqkkkqk', 'k.....k', 'kqkkkqk', '.kkkkk.', '.......'], pal: { k: '#6b6d75', q: '#c3c8d0' } },
  emberheart: { map: ['.......', '.rr.rr.', 'rOrrrrr', 'rrOrrrr', '.rrrrr.', '..rrr..', '...r...'], pal: { r: '#c8402a', O: '#ffb04a' } },
  mournersveil: { map: ['..kkk..', '.kKKKk.', '.kKkKk.', 'kKkKkKk', 'kkKkKkk', 'k.k.k.k', '.......'], pal: { k: '#3a3046', K: '#5a5068' } },
  gamblerscoin: { map: ['..yyk..', '.yYykk.', 'yYyykkk', 'yyyykKk', 'yyyykkk', '.yyykk.', '..yyk..'], pal: { y: '#e8c24a', Y: '#fff0a8', k: '#3a3440', K: '#6a6476' } },
  bloodcontract: { map: ['wwwwww.', 'wWwwwWw', '.wkkkw.', '.wwwww.', '.wkkw..', '.wwwrr.', 'wwwwrRw'], pal: { w: '#ece4d2', W: '#a89c84', k: '#7d7186', r: '#a83a2a', R: '#e05a4a' } },
  witchsknot: { map: ['.g...g.', '..g.g..', '...G...', '..gGg..', '.g.G.g.', '...g...', '..g.g..'], pal: { g: '#9a6ac8', G: '#e0c8ff' } },
  fingerbone: { map: ['...y...', '..yYy..', '...b...', '...b...', '...B...', '...b...', '...b...'], pal: { y: '#d8b44a', Y: '#fff0a8', b: '#e0d8c4', B: '#a89e88' } },
  oathboundgorget: { map: ['.......', '.sssss.', 'sSsssSs', 'ssyyyss', 'sSsssSs', '.sssss.', '.......'], pal: { s: '#a7adb8', S: '#eef2f6', y: '#e8c24a' } },
  wickshears: { map: ['W.....W', '.W...W.', '..W.W..', '...y...', '..k.k..', '.k...k.', '.kk.kk.'], pal: { W: '#dfe4ea', y: '#d8b44a', k: '#6b6d75' } },
  blackbolts: { map: ['.f.f.f.', '.k.k.k.', 'qqqqqqq', 'qQqqqqq', 'qQqqqqq', 'qQqqqqq', '.qqqqq.'], pal: { f: '#6a6a76', k: '#3a3440', q: '#2a2630', Q: '#4a4458' } },
  fencingglove: { map: ['.w.w...', '.w.w.w.', '.wwwww.', 'wwwwww.', '.wwwww.', '..www..', '..yyy..'], pal: { w: '#f0ece0', y: '#d8b44a' } },
  philosopherspebble: { map: ['.......', '..rrr..', '.rRrrr.', '.rrOrr.', '.rrrrr.', '..rrr..', '.......'], pal: { r: '#c43b3b', R: '#ff8a7a', O: '#ffd0a0' } },
  surgeonsapron: { map: ['..w.w..', '..www..', '.wwwww.', '.wwrww.', '.wwwww.', '.wrwww.', '.wwwww.'], pal: { w: '#e8e0d0', r: '#a83a3a' } },
  bellrope: { map: ['.ttt...', 't...t..', 't...t..', '.ttt.t.', '.....t.', '.....t.', '....yyy'], pal: { t: '#c9a86a', y: '#d8b44a' } },
  phylactery: { map: ['...k...', '..sss..', '..sgs..', '.sgGgs.', '.sgggs.', '.sgggs.', '..sss..'], pal: { k: '#6b4a2e', s: '#c3c8d0', g: '#9ae06a', G: '#e0ffd0' } },
  fencesledger: { map: ['.bbbbb.', '.bwwwwB', '.bwkkwB', '.bwwwwB', '.bwkkwB', '.bwwwwB', '.bbbbb.'], pal: { b: '#6b2b22', B: '#4a1c16', w: '#e8e0cc', k: '#7d7186' } },
  gravediggersspade: { map: ['...w...', '...w...', '...w...', '..sss..', '.sSsss.', '.sssss.', '..sss..'], pal: { w: '#6b4a2e', s: '#9aa0a8', S: '#e0e4ea' } },
  hollowcrown: { map: ['.......', 'y..y..y', 'yy.y.yy', 'yyyyyyy', 'ykyRyky', 'yyyyyyy', '.......'], pal: { y: '#e8c24a', k: '#2a1a30', R: '#c43b3b' } },
};

// The Gravecaller's thralls, seen from the side and facing the foes.
const THRALL_SIDE = {
  thrall: { pal: { x: '#d8d0bc', X: '#a89e88', e: '#7ad0ff', w: '#a0603a' }, map: [
    '..........', '...xxx....', '..xxxxx...', '..xxxex...', '..xxxxx...', '...x.x....', '..xxxx.w..', '.x.xx.xw..', '...xxxxw..', '..x.xx....', '...xxxx...', '...x..x...', '...x..x...', '..xx..xx..'] },
  ghoul: { pal: { h: '#7d8a6a', e: '#e8f07a', b: '#4d5640', B: '#343a2c', c: '#c9c2a4', n: '#5d6a4a' }, map: [
    '...........', '.....hhh...', '....hhhhh..', '....hhheh..', '..bbbhhhhc.', '.bbbbbbh...', 'bbBbbbbbn..', 'bBbbbbbb.c.', '.bbbbbbb...', '..bbbbb....', '..bb..bb...', '..bb...bb..', '.BB....BB..'] },
  champion: { pal: { x: '#d8d0bc', X: '#a89e88', e: '#7ad0ff', a: '#6b6d75', A: '#a7adb8', w: '#c3c8d0', W: '#eceaf2', r: '#6b2b22' }, map: [
    '...........W', '..........Ww', '...aaa...Ww.', '..aAaaa.Ww..', '..aaaea.w...', '..aaaaarr...', '.AAaaaaxa...', 'AaAaaaaxx...', '.a.aaaaa....', '...arraa....', '...aaaaa....', '...xx..xx...', '...xx..xx...', '..aaa..aaa..'] },
  wall: { pal: { x: '#d8d0bc', X: '#a89e88', k: '#2a2233', e: '#7ad0ff' }, map: [
    '............', '...xx..xx...', '..xkx.xkxx..', '.xxxxxxxxxx.', '.xXxxXxxXxx.', 'xxkxxxkxxkxx', 'xxxXxxxXxxxx', 'xXxxxkxxxXxx', 'xxxxxxxxxxxx', 'XxXxXxXxXxXx'] },
};

// ── building a hero's picture
const ARMOUR_WEIGHT = id => (typeof GEAR !== 'undefined' && GEAR[id] ? GEAR[id].weight : null);
const isGear = (id, slot) => typeof GEAR !== 'undefined' && !!GEAR[id] && GEAR[id].slot === slot;
// A body's anchors, worked out from its map once.
function bodyAnchors(B, back) {
  if (B._a) return B._a;
  const m = B.map, w = Math.max(...m.map(r => r.length)), hgt = m.length;
  let eye = null, minX = w, maxX = 0;
  m.forEach((row, y) => { for (let x = 0; x < row.length; x++) { const ch = row[x]; if (ch === '.') continue; minX = Math.min(minX, x); maxX = Math.max(maxX, x); if (ch === 'e' && !eye) eye = [x, y]; } });
  const tRow = m[B.torso + 2] || '', tl = tRow.search(/[cCsSa]/), tr = Math.max(tRow.lastIndexOf('c'), tRow.lastIndexOf('C'));
  const top = m.findIndex(r => /[^.]/.test(r)), headRow = m[top + 1] || m[top];
  const hx = (headRow.search(/[^.]/) + headRow.length - 1 - headRow.split('').reverse().join('').search(/[^.]/)) / 2;
  const torsoRow = m[B.torso], sl = torsoRow.search(/[sScC]/), sr = Math.max(torsoRow.lastIndexOf('s'), torsoRow.lastIndexOf('c'), torsoRow.lastIndexOf('S'));
  const last = m[hgt - 1], kl = last.indexOf('k');
  const ex = eye ? eye[0] : Math.round(hx) + 2, ey = eye ? eye[1] : top + 4;
  B._a = {
    w, h: hgt, cx: (minX + maxX) / 2, hand: B.hand, torso: B.torso, belt: B.belt,
    neck: back ? [Math.round((sl + sr) / 2), B.torso] : [ex - 1, B.torso + 1],
    chest: back ? [Math.round((sl + sr) / 2), B.torso + 3] : [ex - 1, B.torso + 2],
    beltAt: back ? [Math.round((sl + sr) / 2), B.belt] : [ex - 1, B.belt],
    back: back ? [Math.round((sl + sr) / 2), B.torso + 2] : [tl, B.torso + 2],
    ear: [Math.max(0, ex - 2), ey], head: [Math.round(hx), top], heel: [kl < 0 ? 2 : kl, hgt - 1],
    shoulderL: [sl, B.torso], shoulderR: [sr, B.torso], torsoL: tl, torsoR: tr,
  };
  return B._a;
}
// Armour on a body map (an array of rows of letters): letters swap for the armour's own, by weight and pattern.
function dressArmour(m, B, A, id, back) {
  const G = GEAR_ART[id], wt = ARMOUR_WEIGHT(id);
  if (!G || !wt) return;
  const acc = B.acc || '';
  const torsoish = (x, y) => y >= B.torso && y < A.h - 1;
  for (let y = 0; y < m.length; y++) for (let x = 0; x < m[y].length; x++) {
    let ch = m[y][x];
    if (y >= B.torso && acc.includes(ch)) ch = m[y][x] = 'c';
    if (wt === 'light') continue;
    if (wt === 'medium') {
      if (ch === 'c' || ch === 'a') m[y][x] = G.pattern === 'chain' ? ((x + y) % 2 ? '3' : '1') : '1';
      else if (ch === 'C') m[y][x] = '2';
    } else {
      if (ch === 'c' || ch === 'a' || ch === 's') m[y][x] = '1';
      else if (ch === 'C' || ch === 'S') m[y][x] = '2';
      else if (ch === 'd') m[y][x] = x % 2 ? '2' : '1';
      else if (ch === 'k' && y >= A.h - 2 && y === A.h - 2) m[y][x] = '2';
    }
  }
  // the belt of medium armour, and a shine on plate
  if (wt === 'medium' && G.pattern !== 'bark') {
    const row = m[B.belt];
    if (row) { for (let x = 0; x < row.length; x++) if ('123'.includes(row[x])) row[x] = '6'; const bx = back ? -1 : A.beltAt[0]; if (row[bx] === '6') row[bx] = '7'; }
  }
  if (wt === 'heavy' && !back) { const [cx, cy] = A.chest; if (m[cy] && m[cy][cx] === '1') m[cy][cx] = '3'; if (m[cy + 1] && m[cy + 1][cx] === '1') m[cy + 1][cx] = '3'; }
  const each = (fn) => { for (let y = B.torso; y < m.length; y++) for (let x = 0; x < m[y].length; x++) fn(x, y, m[y][x]); };
  switch (G.pattern) {
    case 'buttons': if (!back) for (let y = B.torso + 1; y < B.belt; y += 2) { const x = A.chest[0] + 1; if (m[y] && m[y][x] === 'c') m[y][x] = '4'; } break;
    case 'spots': each((x, y, ch) => { if ((ch === 'c' || ch === 'C') && (x * 5 + y * 3) % 7 === 0) m[y][x] = '5'; }); break;
    case 'tatters': { const r = m.findIndex((row, y) => y > B.belt && row.includes('d')); if (r >= 0) m[r] = m[r].map((ch, x) => (ch === 'd' && x % 2 ? '.' : ch)); each((x, y, ch) => { if (y === B.belt && (ch === 'c' || ch === 'C')) m[y][x] = '4'; }); break; }
    case 'glints': each((x, y, ch) => { if ((ch === 'c' || ch === 'C' || ch === 'd') && (x * 7 + y * 5) % 11 === 0) m[y][x] = '5'; }); break;
    case 'rivets': each((x, y, ch) => { if (ch === '1' && (x * 3 + y) % 4 === 0) m[y][x] = '5'; }); break;
    case 'quilt': each((x, y, ch) => { if (ch === '1' && (y - B.torso) % 2 === 0) m[y][x] = (x + y) % 3 ? '2' : '5'; }); break;
    case 'bark': each((x, y, ch) => { if ((ch === '1' || ch === '2') && (x * 7 + y * 13) % 5 < 2) m[y][x] = '5'; }); break;
    case 'rust': each((x, y, ch) => { if ((ch === '1' || ch === '2') && (x * 5 + y * 7) % 9 === 0) m[y][x] = '5'; }); break;
    case 'sash': each((x, y, ch) => { if ((ch === '1' || ch === '2' || ch === '3') && (back ? x - y : x + y) === (back ? A.torsoL - B.torso - 1 : A.torsoL + B.torso + 4)) m[y][x] = '4'; }); break;
    case 'embers': each((x, y, ch) => { if (ch === '2' && (x + y * 2) % 4 === 0) m[y][x] = '5'; else if (ch === '1' && (x * 3 + y) % 7 === 0) m[y][x] = '5'; }); break;
    case 'trim': { const r = m[B.belt]; if (r) for (let x = 0; x < r.length; x++) if ('123'.includes(r[x])) r[x] = '4'; break; }
    case 'chains': each((x, y, ch) => { if ('123'.includes(ch) && (back ? x + y : x - y) === (back ? A.torsoR + B.torso - 2 : A.torsoL - B.torso + 1)) m[y][x] = '5'; }); break;
    default:
  }
}
// Pieces laid over the body: pauldrons on plate, spikes, leaves, drips.
function armourOverlays(id, B, A, back, stamp) {
  const G = GEAR_ART[id], wt = ARMOUR_WEIGHT(id);
  if (!G || !wt) return;
  const pal = Object.assign({}, G.pal);
  const t = B.torso;
  if (wt === 'heavy') {
    const big = G.big;
    if (back) {
      stamp(big ? ['3111', '1122', '.2..'] : ['311', '122'], pal, A.shoulderL[0] - 1, t - 1);
      stamp(big ? ['1113', '2211', '..2.'] : ['113', '221'], pal, A.shoulderR[0] - (big ? 2 : 1), t - 1);
    } else stamp(big ? ['1113', '2111', '.22.'] : ['113', '211'], pal, A.shoulderR[0] - (big ? 2 : 1), t - 1);
  }
  if (G.spikes) { pal.x = pal[4]; if (back) { stamp(['x'], pal, A.shoulderL[0] - 1, t); stamp(['x'], pal, A.shoulderR[0] + 1, t); stamp(['x'], pal, A.back[0], t + 3); } else { stamp(['x'], pal, A.shoulderR[0] + 1, t); stamp(['x.', '.', 'x'], pal, A.torsoL - 1, t + 2); } }
  if (G.leaves) { pal.L = pal[4]; pal.l = '#4a7a32'; if (back) { stamp(['L.L', '.l.'], pal, A.shoulderL[0], t - 1); stamp(['L'], pal, A.shoulderR[0], t - 1); } else { stamp(['LL', 'l.'], pal, A.shoulderR[0] - 1, t - 1); stamp(['L', 'l'], pal, A.torsoL - 1, t + 1); } }
  if (G.drip) { pal.b = pal[5]; stamp(['b', '.', 'b'], pal, (back ? A.shoulderL[0] + 1 : A.torsoL + 1), B.belt + 1); }
}
// Accessories that change the body's colours instead of adding a piece.
function paintAccessory(m, B, A, id, back) {
  const G = GEAR_ART[id];
  if (!G || !G.paint) return;
  const H = m.length;
  switch (G.paint) {
    case 'bandage': for (let y = B.torso; y < H; y++) for (let x = 0; x < m[y].length; x++) if (m[y][x] === 'a' && y % 2 === 0) m[y][x] = '8'; break;
    case 'boots': for (let y = H - 3; y < H; y++) for (let x = 0; x < m[y].length; x++) if (m[y][x] === 'k' || m[y][x] === 'K') m[y][x] = y === H - 1 && x % 2 ? '9' : '8'; break;
    case 'collar': case 'gorget': { const r = m[B.torso]; for (let x = 0; x < r.length; x++) if (r[x] !== '.' && r[x] !== 'n' && r[x] !== 'a') r[x] = '8'; const fx = back ? Math.round(A.cx) : Math.max(...r.map((ch, i) => (ch === '8' ? i : -1))); if (fx >= 0 && r[fx] === '8') r[fx] = '9'; break; }
    case 'veil': if (!back) for (let y = 0; y < B.torso; y++) for (let x = 0; x < m[y].length; x++) if (m[y][x] === 'n') m[y][x] = (x + y) % 2 ? '8' : '9'; break;
    case 'glove': break; // the hand is drawn last, in the glove's colour
    case 'apron': if (!back) for (let y = B.torso + 1; y < B.belt + 3 && y < H - 2; y++) for (let x = A.chest[0] - 1; x < m[y].length; x++) if ('cC123456wW'.includes(m[y][x])) m[y][x] = (x * 3 + y) % 7 === 0 ? '9' : '8'; break;
    case 'rope': { for (let i = 0; i < B.belt - B.torso; i++) { const y = B.torso + i, x = back ? A.torsoL + 1 + i : A.shoulderR[0] - i; if (m[y] && m[y][x] && m[y][x] !== '.' && m[y][x] !== 'n') m[y][x] = '8'; } break; }
    default:
  }
}
const lookKey = look => (look ? look.map(x => x || '').join(',') : '');
// The hero's picture: class body, armour, accessory and weapon. Returns a canvas with ax (the body's centre, in
// pixels from the left), bh (the body's height), bw (its width), lamp ([x, y] of a lantern's flame) and glows
// ([[x, y, radius, colour]]).
function heroCanvas(key, view, step, look) {
  const back = view === 'back', BODY = back ? BACK_BODY : SIDE_BODY;
  if (!BODY[key]) key = 'sellsword';
  const ck = (back ? 'hb:' : 'hs:') + key + ':' + step + ':' + lookKey(look);
  if (spriteCache.has(ck)) return spriteCache.get(ck);
  const B = BODY[key], A = bodyAnchors(B, back);
  const [wid, aid, xid] = look || [];
  const weapon = isGear(wid, 'weapon') ? wid : null, armour = isGear(aid, 'armor') ? aid : null, acc = isGear(xid, 'accessory') ? xid : null;
  const W = A.w + 20, H = A.h + 10, ox = 8, oy = H - A.h;
  const cells = Array.from({ length: H }, () => new Array(W).fill(null));
  const put = (x, y, col) => { if (col && x >= 0 && y >= 0 && x < W && y < H) cells[y][x] = col; };
  const glows = [], spots = {};
  // stamp a map at body coordinates, each letter in its palette ('+' is the grip: its own colour, or the handle's)
  const stamp = (map, pal, x0, y0, mark) => map.forEach((row, y) => { for (let i = 0; i < row.length; i++) { const ch = row[i]; if (ch === '.') continue; const col = pal[ch] || (ch === '+' ? pal.h || pal.w : null); if (!col) continue; put(ox + x0 + i, oy + y0 + y, col); if (mark && mark.includes(ch)) (spots[ch] = spots[ch] || []).push([ox + x0 + i, oy + y0 + y]); } });
  // the body, dressed
  const m = B.map.map(r => r.padEnd(A.w, '.').split(''));
  if (step) {
    const r = m[m.length - 1], first = r.indexOf('k'), last = r.lastIndexOf('k'), mid = (first + last) / 2;
    m[m.length - 1] = r.map((ch, i) => (ch === 'k' && (step === 1 ? i < mid : i > mid) ? '.' : ch));
  }
  const pal = Object.assign({ e: '#1a1214' }, HERO_PAL[key]);
  if (armour) {
    dressArmour(m, B, A, armour, back);
    const G = GEAR_ART[armour];
    for (const k in G.pal) { if ((k === 'h' || k === 'H') && !(G.hood && B.hood)) continue; pal[k] = G.pal[k]; }
    pal[6] = pal[6] || '#3a2a1c'; pal[7] = pal[7] || '#d8b44a';
    if (!pal[1]) { pal[1] = pal.c; pal[2] = pal.C; pal[3] = pal.c; }
    if (!pal[3]) pal[3] = pal[1];
  }
  if (acc && GEAR_ART[acc].paint) { paintAccessory(m, B, A, acc, back); pal[8] = GEAR_ART[acc].pal[4]; pal[9] = GEAR_ART[acc].pal[5] || GEAR_ART[acc].pal[4]; }
  const XA = acc && GEAR_ART[acc].at ? GEAR_ART[acc] : null;
  const accAt = X => { const a = X.at === 'hand' ? A.hand : X.at === 'belt' ? A.beltAt : X.at === 'heel' ? A.heel : A[X.at]; return [a[0] + (X.dx || 0) * (back ? 0 : 1), a[1] + (X.dy || 0)]; };
  const showAcc = X => !back || X.back || X.at === 'head';
  // slung behind (side view)
  if (XA && XA.back && !back && !XA.front) { const [x, y] = accAt(XA); stamp(XA.map, XA.pal, x, y); }
  stamp(m.map(r => r.join('')), pal, 0, 0);
  if (armour) armourOverlays(armour, B, A, back, stamp);
  if (XA && showAcc(XA) && !XA.top && (back || !XA.back || XA.front)) { const [x, y] = accAt(XA); stamp(XA.map, XA.pal, back && XA.back ? Math.round(A.cx) - 1 : x, back && XA.back ? A.torso + 1 : y, 'OgRY'); if (XA.glow) glows.push([ox + x, oy + y, 9, XA.glow]); }
  // the weapon, and the hand over its grip
  let lamp = null;
  if (weapon && GEAR_ART[weapon]) {
    const G = GEAR_ART[weapon], gm = G.map;
    let gx = 0, gy = 0;
    gm.forEach((row, y) => { const i = row.indexOf('+'); if (i >= 0) { gx = i; gy = y; } });
    stamp(gm, G.pal, A.hand[0] - gx, A.hand[1] - gy, 'gs');
    const gs = spots[G.glowAt || 'g'] || [];
    if (G.lamp && gs.length) lamp = gs[0].slice();
    else if (gs.length && G.glow) { const n = gs.length; glows.push([gs.reduce((a, p) => a + p[0], 0) / n, gs.reduce((a, p) => a + p[1], 0) / n, 10 + Math.min(6, n), G.glow]); }
    if (G.light && lamp) glows.push([lamp[0], lamp[1], 14, G.light]);
    if (GEAR[weapon].rarity === 'relic') { const p = gs[0] || [ox + A.hand[0], oy + A.hand[1] - 4]; glows.push([p[0], p[1], 16, '#f7d36a']); }
    if (G.hand !== false) put(ox + A.hand[0], oy + A.hand[1], acc && GEAR_ART[acc].paint === 'glove' ? GEAR_ART[acc].pal[4] : pal.n);
  } else if (acc && GEAR_ART[acc].paint === 'glove') put(ox + A.hand[0], oy + A.hand[1], GEAR_ART[acc].pal[4]);
  if (XA && XA.top && !back) { const [x, y] = accAt(XA); stamp(XA.map, XA.pal, x, y); }
  if (armour && GEAR_ART[armour].glow) glows.push([ox + A.chest[0], oy + A.chest[1], 12, GEAR_ART[armour].glow]);
  if (acc && GEAR[acc].rarity === 'relic') { const X = GEAR_ART[acc], [x, y] = X.at ? accAt(X) : A.chest; glows.push([ox + x, oy + y, 14, X.glow || '#f7d36a']); }
  // crop to what was drawn, keeping the feet on the bottom row
  let l = W, r = 0, t = H;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (cells[y][x]) { l = Math.min(l, x); r = Math.max(r, x); t = Math.min(t, y); }
  const c = document.createElement('canvas');
  c.width = r - l + 1; c.height = H - t;
  const x2 = c.getContext('2d');
  for (let y = t; y < H; y++) for (let x = l; x <= r; x++) if (cells[y][x]) { x2.fillStyle = cells[y][x]; x2.fillRect(x - l, y - t, 1, 1); }
  c.ax = ox + A.cx + 0.5 - l; c.bh = A.h; c.bw = A.w; c.top = oy - t;
  c.lamp = lamp ? [lamp[0] - l, lamp[1] - t] : null;
  c.glows = glows.map(([x, y, rad, col]) => [x - l, y - t, rad, col]);
  c.smoke = weapon && GEAR_ART[weapon] && GEAR_ART[weapon].smoke && spots.g && spots.g.length ? [spots.g[0][0] - l, spots.g[0][1] - t] : null;
  spriteCache.set(ck, c);
  return c;
}
// The party seen from behind (the road), and from the side (battles, the hero sheet, menus). look: Items.look(c).
function heroSprite(key, step = 0, look = null) { return heroCanvas(key, 'back', step, look); }
function heroSide(key, step = 0, look = null) { return heroCanvas(key, 'side', step, look); }
// A thrall from the side.
function thrallSide(kind) {
  const T = THRALL_SIDE[kind] || THRALL_SIDE.thrall;
  const c = sprite(T.map, T.pal, 'th:' + kind);
  return c;
}
// An item's icon for the Bag, the gear slots and the item card.
const gearIconURLs = new Map();
function gearIconURL(id) {
  if (gearIconURLs.has(id)) return gearIconURLs.get(id);
  const D = typeof GEAR !== 'undefined' && GEAR[id], G = GEAR_ART[id];
  let s = null;
  if (D && D.slot === 'weapon' && G) s = sprite(G.map.map(r => r.replace(/\+/g, G.pal['+'] ? '+' : 'h')), Object.assign({}, G.pal), 'gi:' + id);
  else if (D && D.slot === 'armor' && G) {
    const B = { torso: 0, belt: D.weight === 'heavy' ? 6 : 6, acc: '' }, map = ARMOUR_ICON[D.weight].map(r => r.split(''));
    const A = { h: map.length + 1, chest: [4, 2], beltAt: [5, 6], torsoL: 1, torsoR: 7, cx: 4 };
    dressArmour(map, B, A, id, false);
    const pal = Object.assign({ c: '#8a8a8a', C: '#5a5a5a', a: '#8a8a8a', d: '#4a4a4a', s: '#9a9a9a', S: '#6a6a6a', t: '#3a2a1c', y: '#d8b44a', 6: '#3a2a1c', 7: '#d8b44a' }, G.pal);
    if (!pal[1]) { pal[1] = pal.c; pal[2] = pal.C; } if (!pal[3]) pal[3] = pal[1];
    if (G.hood) { pal.c = G.pal.c; }
    s = sprite(map.map(r => r.join('')), pal, 'gi:' + id);
  } else if (D && ACC_ICON[id]) s = sprite(ACC_ICON[id].map, ACC_ICON[id].pal, 'gi:' + id);
  if (!s) return iconURL('bag');
  const n = Math.max(s.width, s.height, 7), c = document.createElement('canvas'); c.width = n; c.height = n;
  c.getContext('2d').drawImage(s, Math.floor((n - s.width) / 2), Math.floor((n - s.height) / 2));
  const url = c.toDataURL(); gearIconURLs.set(id, url); return url;
}
const gearIco = (id, cls = '') => h('img', { class: 'ico gico ' + cls, src: gearIconURL(id), alt: '', draggable: 'false' });
// A hero's whole sprite as a picture, for the Party screen and the level-up sheet.
const heroImgURLs = new Map();
function heroImgURL(key, look) {
  const k = key + '|' + lookKey(look);
  if (heroImgURLs.has(k)) return heroImgURLs.get(k);
  const s = heroSide(key, 0, look), url = s.toDataURL();
  heroImgURLs.set(k, url);
  return url;
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
  // A hooded lantern on its hook, with a lit window (build step 7b: the old hollow-ring top read as a padlock).
  lantern: { map: ["...d...", "..ddd..", ".bbbbb.", ".byyyb.", ".bywyb.", ".byyyb.", "..bbb.."], pal: { d: '#7a6848', b: '#b09a70', y: '#f7c24a', w: '#fff6d0' } },
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
  // stats and the hero sheet (from the screen mockups)
  coin: { map: ["..yyy..", ".yYyyy.", "yYyyyyy", "yyyddyy", "yyyyyyy", ".yyyyd.", "..ddd.."], pal: { y: '#e8c24a', Y: '#fff0a8', d: '#a8822a' } },
  star: { map: ["...y...", "...y...", "yyywyyy", ".yyyyy.", "..yyy..", ".y...y.", "y.....y"], pal: { y: '#f7d36a', w: '#fff3c8' } },
  boot: { map: ["...bb..", "...bb..", "...bb..", "...bbb.", "w..bbbb", ".w.bbbb", "......."], pal: { b: '#a8784a', w: '#b4a8b6' } },
  feather: { map: ["......w", "....wwW", "...wwW.", "..wwW..", ".wwW...", "wW.....", "w......"], pal: { w: '#c9e8ff', W: '#7aa6c8' } },
  hourglass: { map: ["wwwwwww", ".yyyyy.", "..yyy..", "...y...", "..y.y..", ".yyyyy.", "wwwwwww"], pal: { w: '#8a5a3a', y: '#e8c24a' } },
  fatigue: { map: ["..ppp..", ".pp....", "pp.....", "pp...w.", "pp.....", ".pp....", "..ppp.."], pal: { p: '#bb96ee', w: '#e8d8ff' } },
  bless: { map: [".yyyyy.", "y..g..y", "y.ggg.y", "y..g..y", "y..g..y", "y.....y", ".yyyyy."], pal: { g: '#8ac46a', y: '#f7d36a' } },
  fire: { map: ["...f...", "..fyf..", ".fyWyf.", ".fyyyf.", "..fff..", "wwwwwww", ".w...w."], pal: { f: '#e2582e', y: '#f7b34a', W: '#fff0c0', w: '#6b4a2e' } },
  bag: { map: ["..bbb..", "...b...", ".bbbbb.", "bbbybbb", "bbbbbbb", "bbbbbbb", ".bbbbb."], pal: { b: '#8a5a3a', y: '#e8c24a' } },
  plate: { map: ["MM...MM", "mMMMMMm", "mmmymmm", ".mmmmm.", ".mmymm.", ".mmmmm.", "mm...mm"], pal: { m: '#8a8f99', M: '#dfe4ea', y: '#e8c24a' } },
  scroll: { map: ["wwwwww.", "WwwwwwW", ".wkkkw.", ".wwwww.", ".wkkw..", ".wwwww.", "WwwwwwW"], pal: { w: '#ece4d2', W: '#a89c84', k: '#7d7186' } },
  helm: { map: ["..mmm..", ".mMmmm.", "mMmmmmm", "mmkkkmm", "mmmmmmm", "m.mmm.m", "..m.m.."], pal: { m: '#a7adb8', M: '#dfe4ea', k: '#1a1214' } },
  // statuses and skills
  tincture: { map: ["..kkk..", "...g...", "..ggg..", ".gpppg.", "gpwpppg", "gpppppg", ".ggggg."], pal: { k: '#6b4a2e', g: '#b4a8b6', p: '#7ac46a', w: '#d8f8c0' } },
  brace: { map: ["bbbbbbb", "bwwwwwb", "bbbbbbb", "bwwwwwb", ".bbbbb.", "..bbb..", "...b..."], pal: { b: '#9a8a70', w: '#d8c8a8' } },
  anchor: { map: ["..www..", "..w.w..", "..www..", "...w...", "w..w..w", "ww.w.ww", ".wwwww."], pal: { w: '#c9ccd4' } },
  weak: { map: ["......w", ".....w.", "....w..", ".......", "..w....", ".bh....", "b..h..."], pal: { w: '#a8a4b0', h: '#c08a46', b: '#6b4a2e' } },
  silence: { map: [".wwwww.", "wkwwwkw", "wwkwkww", "wwwkwww", "wwkwkww", ".wwwww.", ".w....."], pal: { w: '#b4a8b6', k: '#d4484a' } },
  eye: { map: [".......", "..www..", ".wwkww.", "wwkykww", ".wwkww.", "..www..", "......."], pal: { w: '#e8e0cc', k: '#2a1040', y: '#bb96ee' } },
  ward: { map: ["..bbb..", ".b...b.", "b..w..b", "b.w...b", "b.....b", ".b...b.", "..bbb.."], pal: { b: '#8cc4e6', w: '#dcf2ff' } },
  stun: { map: ["y..y..y", ".......", "..bbb..", ".bbbbb.", ".bkbkb.", ".bbbbb.", "..bbb.."], pal: { y: '#f7d36a', b: '#d8d0bc', k: '#2a2233' } },
  cover: { map: ["bbbb...", "bwwbcc.", "bwbbccc", "bbbbccc", ".bb.ccc", "..b.c.c", "......."], pal: { b: '#6aa8d8', w: '#dcf2ff', c: '#b4a8b6' } },
  fort: { map: ["s.s.s.s", "sssssss", ".sssss.", ".ssdss.", ".sssss.", ".ssdss.", "sssssss"], pal: { s: '#9aa0aa', d: '#2a2233' } },
  thorns: { map: ["g..g..g", ".g.g.g.", "..ggg..", "gggwggg", "..ggg..", ".g.g.g.", "g..g..g"], pal: { g: '#a07a4a', w: '#e8d8b8' } },
  haste: { map: ["y..y...", ".y..y..", "..y..y.", "...y..y", "..y..y.", ".y..y..", "y..y..."], pal: { y: '#f7c24a' } },
  exposed: { map: ["bbbbbbb", "bbbkbbb", "bbkbbbb", "bbbkbbb", ".bbbkb.", "..bkb..", "...b..."], pal: { b: '#d08a6a', k: '#2a1414' } },
  quarry: { map: ["..rrr..", ".r...r.", "r..r..r", "r.rrr.r", "r..r..r", ".r...r.", "..rrr.."], pal: { r: '#ff6a4a' } },
  slow: { map: ["bbbbbbb", ".b...b.", "..bwb..", "...b...", "..b.b..", ".bwwwb.", "bbbbbbb"], pal: { b: '#6a94e8', w: '#cfe0ff' } },
  trap: { map: [".......", "w.w.w.w", "wwwwwww", "..w.w..", "wwwwwww", "w.w.w.w", "......."], pal: { w: '#a7adb8' } },
  taunt: { map: ["r.....r", "rr...rr", ".rrrrr.", ".rkrkr.", ".rrrrr.", "..rrr..", "...r..."], pal: { r: '#e05a4a', k: '#2a1414' } },
  parry: { map: ["w.....w", ".w...w.", "..w.w..", "...w...", "..w.w..", ".h...h.", "h.....h"], pal: { w: '#eceaf2', h: '#c08a46' } },
  smoke: { map: ["...ss..", "..ssSs.", ".ssssss", "sSsssss", "sssssSs", ".sssss.", "......."], pal: { s: '#7d7186', S: '#b4a8b6' } },
  riposte: { map: ["..www..", ".w...w.", "w.....w", "w...w.w", ".w..ww.", "....www", "......."], pal: { w: '#eceaf2' } },
  acid: { map: ["...g...", "..ggg..", ".ggwgg.", ".gwggg.", "ggggggg", ".ggggg.", "..ggg.."], pal: { g: '#9ad040', w: '#e8ffb0' } },
  knife: { map: ["......w", ".....ww", "....ww.", "...ww..", "h.ww...", ".hh....", "h.h...."], pal: { w: '#d8dce4', h: '#5a3a20' } },
  confuse: { map: [".ppppp.", "p.....p", "p.ppp.p", "p.p.p.p", "p.pp..p", "p.....p", ".ppppp."], pal: { p: '#c9a6ff' } },
  poison: { map: ["...g...", "..ggg..", ".ggggg.", "gkgggkg", "ggggggg", ".gkkkg.", "..ggg.."], pal: { g: '#7ac46a', k: '#1a2a10' } },
  hidden: { map: ["..ddd..", ".ddddd.", "ddkkkdd", "dkekekd", "dkkkkkd", ".ddddd.", "ddddddd"], pal: { d: '#4a3f55', k: '#1a1220', e: '#bb96ee' } },
  fester: { map: [".g...g.", "..g.g..", ".bbbbb.", "bbgbbbb", "bbbbgbb", "bgbbbbb", ".bbbbb."], pal: { b: '#7a6a3a', g: '#a8c85a' } },
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

// A small square picture of a unit's head and shoulders, for the turn strip, the report and lists. Heroes show their
// side view in their gear (look: Items.look(c)); a thrall key is 'thrall:<kind>'.
const portraitURLs = new Map();
function portraitURL(key, hero, look) {
  const ck = (hero ? 'p:' : 'f:') + key + (look ? '|' + lookKey(look) : '');
  if (portraitURLs.has(ck)) return portraitURLs.get(ck);
  const c = document.createElement('canvas'); c.width = 16; c.height = 16;
  const x = c.getContext('2d');
  if (hero) { const s = heroSide(key, 0, look); x.drawImage(s, Math.round(8 - s.ax), 1 - s.top); }
  else if (String(key).startsWith('thrall:')) { const s = thrallSide(key.slice(7)); x.drawImage(s, Math.floor((16 - s.width) / 2), Math.max(0, 16 - s.height)); }
  else { const s = foeSprite(key); x.drawImage(s, Math.floor((16 - s.width) / 2), Math.max(0, Math.min(2, 16 - s.height))); }
  const url = c.toDataURL(); portraitURLs.set(ck, url); return url;
}
// A character's portrait, in their gear.
const heroPortrait = c => portraitURL(c.cls, true, typeof Items !== 'undefined' ? Items.look(c) : null);
