'use strict';
// Lantern Road · shared helpers.
// Pure functions only: the battle simulation loads this file in the browser and in Node (tools/simtest.js).

// A seeded random generator (mulberry32). The same seed always gives the same sequence, so a battle can be
// replayed exactly from its seed.
function makeRng(seed) {
  let s = seed | 0;
  return function rng() {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), s | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const strSeed = s => { let x = 2166136261; for (const ch of String(s)) x = Math.imul(x ^ ch.charCodeAt(0), 16777619); return x | 0; };
// Stable noise for scenery: the same inputs always give the same value in [0, 1).
function hash(n) { n |= 0; n = Math.imul(n ^ (n >>> 16), 0x45d9f3b); n = Math.imul(n ^ (n >>> 16), 0x45d9f3b); n ^= n >>> 16; return (n >>> 0) / 4294967296; }
const h2 = (a, b) => hash(Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263));
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const fmt = n => Math.round(n).toLocaleString('en-US');
