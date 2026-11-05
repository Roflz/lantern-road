'use strict';
// Lantern Road · the results popup, after every battle that brings the party home (onboarding spec §9, play-test notes
// 1.7 and 1.27), after docs/mockups/results.html. It sits in the landscape frame over the dimmed battlefield:
//   the banner   Victory, or Driven back after a loss. Under it the stage's id and name, and First clear.
//   the heroes   a row each, in two columns past three: the face with its level, the name, Level up and +XP. The XP
//                bar fills from where the hero was; a level fills it, flashes, lights Level up, empties it and fills
//                it again, level after level. The fatigue bar grows from before to after, with marks at Weary (50) and
//                Exhausted (75); its number turns gold, then red, and a tap on it says what that means.
//   the loot     gold, materials, party items and gear (rarity on the frame) pop in one by one, then New for each
//                first-clear unlock. A tap on gear opens its card; on New, it does what the trip summary's row does.
//   the buttons  Report · Hearth · Fight again · Next ›, or after a loss Report · Hearth · Try again · Farm the stage
//                before (js/main.js decides what is offered, and does it). After a loss Wick gives the stage's hint.
// About 4 seconds, the heroes staggered and the numbers counting; a tap anywhere skips to the end, and reduced motion
// shows the end at once. It replaces the level-up sheet and the report that opened by itself; Report opens that.
// A trip of several battles shows the trip's totals: the XP and fatigue since setting out, all its loot, and the
// stages fought. (Provisional: the popup for a trip that keeps going waits for the Keep going decision.)
// The guide points at it through data-tut: xp and fatigue (the first hero's bars), report, camp (the Hearth button),
// again, next (Next, or Farm) and new.
// Styles in css/results.css.

const Results = (() => {
  const MS = 4000;  // the fill, from the first hero's bar to the last unlock (tune)
  const IN = 250;   // the popup rises first
  const FILL = 0.6; // one hero's bars take this share of it; the next hero starts a little later
  let last = null;  // { res, o, m }: the popup on show, to show again at its end after the report or a card
  let run = null;   // the fill under way: { raf, P (the popup being filled) }

  const short = n => (n >= 10000 ? Math.round(n / 1000) + 'k' : fmt(n));
  const fracOf = (L, xp) => (L >= HERO.CAP ? 1 : clamp(xp / Hero.xpToNext(L), 0, 1));
  const fatClass = f => (f >= FATIGUE.EXHAUSTED ? 'exh' : f >= FATIGUE.WEARY ? 'weary' : '');
  const fatColor = f => (f >= FATIGUE.EXHAUSTED ? 'var(--bad)' : f >= FATIGUE.WEARY ? 'var(--gold)' : 'var(--good)');
  const matIcon = id => (typeof Base !== 'undefined' ? Base.matIcon(id) : 'bone');

  // ── what to show: one battle (res.gains and res.camp.r), or a trip of several (o.trip, Campaign's lastTrip)
  function model(res, o) {
    const T = o.trip, r = res.camp.r, i = o.index, won = res.winner === 0;
    const why = res.camp.why, hint = !won ? (why && why.hint) || STAGES[i].hint : null;
    if (T) {
      const heroes = T.heroes.map(x => {
        const c = Save.char(x.id);
        if (!c) return null;
        const from = x.from || { level: c.level, xp: c.xp };
        return { c, lv0: from.level, xp0: from.xp, lv1: c.level, xp1: c.xp, gain: Math.max(0, Hero.xpBetween(from.level, c.level) - from.xp + c.xp), f0: x.before, f1: x.after };
      }).filter(Boolean);
      return { won, i, hint, ids: T.fought && T.fought.length ? T.fought : [STAGES[i].id], first: T.lit.length, heroes,
        loot: { gold: T.gold, mats: T.mats, items: T.items, gear: T.pieces || [], unlocks: T.unlocks } };
    }
    const heroes = res.gains.map(x => {
      const f = r.fatigue[x.c.id] || { before: x.c.fatigue || 0, after: x.c.fatigue || 0 };
      return { c: x.c, lv0: x.before.level, xp0: x.before.xp, lv1: x.g.to, xp1: x.c.xp, gain: x.g.xp, f0: f.before, f1: f.after };
    });
    return { won, i, hint, ids: [STAGES[i].id], first: r.first ? 1 : 0, heroes,
      loot: { gold: r.gold, spoils: r.spoilsGold, clear: r.clearGold, mats: r.mats, items: r.items, gear: r.gear.map(g => ({ uid: g.piece.uid, id: g.piece.id, sold: g.sold || 0 })), unlocks: r.unlocks } };
  }
  // A hero's level and the bar's fill (0–1) at q of the way: the bar rolls over at each level gained.
  function xpAt(x, q) {
    const n = x.lv1 - x.lv0, f0 = fracOf(x.lv0, x.xp0), f1 = fracOf(x.lv1, x.xp1);
    if (!n) return { lv: x.lv0, frac: f0 + (f1 - f0) * q };
    let d = ((1 - f0) + (n - 1) + f1) * q;
    if (d < 1 - f0) return { lv: x.lv0, frac: f0 + d };
    d -= 1 - f0;
    let lv = x.lv0 + 1;
    while (d >= 1 && lv < x.lv1) { d -= 1; lv++; }
    return { lv, frac: lv >= HERO.CAP ? 1 : Math.min(1, d) };
  }
  // "1-7", or the stages a trip fought: "1-6 · 1-7 · 1-8", a stage farmed again and again as "1-8 ×3".
  function idsText(ids) {
    const out = [];
    for (const id of ids) { const l = out[out.length - 1]; if (l && l.id === id) l.n++; else out.push({ id, n: 1 }); }
    return out.map(x => (x.n > 1 ? `${x.id} ×${x.n}` : x.id)).join(' · ');
  }
  // A New chip's name: "Tactics", "Toll House", "Gravecaller", "Drowned Chapel", "Foe: undead".
  function shortName(U) {
    let s = U.name;
    if (U.kind === 'class') s = s.replace(/ joins the recruit board$/, '');
    else if (U.kind === 'region') s = s.replace(/ opens$/, '');
    else if (U.kind === 'relic') s = s.replace(/^Relic: /, '');
    else if (U.kind === 'building') s = s.replace(/ blueprint$/, '');
    return s.replace(/^the /i, '').replace(/ screen$/, '');
  }

  // ── taps: what a fatigue bar means, a piece of loot's card, a new thing
  // (the glossary's words, js/glossary.js, once it is part of the game)
  const FAT_LINES = {
    fresh: 'Under 50 fatigue, a hero fights at full strength.',
    weary: 'At 50 fatigue a hero loses 5% of their Power, Defence and Speed.',
    exhausted: 'At 75 fatigue a hero loses 15% of their Power, Defence and Speed.',
    spent: 'At 100 fatigue a hero can’t fight until they rest below 50.',
  };
  function fatigueTip(x) {
    const f = x.f1, k = f >= FATIGUE.SPENT ? 'spent' : f >= FATIGUE.EXHAUSTED ? 'exhausted' : f >= FATIGUE.WEARY ? 'weary' : 'fresh';
    const G = typeof GLOSSARY !== 'undefined' && GLOSSARY[k], line = G ? G.line : FAT_LINES[k];
    toast(`${x.c.name} is ${FATIGUE_NAMES[k]}: ${line.charAt(0).toLowerCase()}${line.slice(1)}`);
  }
  function gearTap(g) {
    const D = GEAR[g.id];
    if (g.sold) return toast(`${D.name}: sold for ${fmt(g.sold)} gold, the Bag was full`);
    if (!Items.find(Save.state, g.uid)) return toast(D.name);
    GearUI.card(g.uid, { after: reopen });
  }
  function newTap(n) {
    if (n.fn) n.fn();
    else toast(n.line ? `${n.name}: ${n.line}` : n.name);
  }
  // Every new thing at once, as the trip summary lists them, when there are more than the loot row holds.
  function newList(ids) {
    openSheet(h('div', { class: 'box rs-list' },
      h('button', { class: 'sheet-x', 'aria-label': 'Back to the results', onclick: () => { sfx('click'); reopen(); } }, '×'),
      h('div', { class: 'kicker', text: 'New' }),
      Guide.newRows(ids)), 'sheet-bottom');
  }

  // ── the popup
  function build(m, o) {
    const st = STAGES[m.i], n = m.heroes.length, rows = n > 3 ? Math.ceil(n / 2) : n, L = m.loot;
    const bars = [];
    const heroRow = (x, k) => {
      const em = h('em', { text: String(x.lv0) }), lvup = h('span', { class: 'lvup', text: 'Level up' }), xpn = h('span', { class: 'xpn', text: '+0 XP' });
      const fill = h('i'), bar = h('span', { class: 'rs-bar', 'data-tut': k === 0 ? 'xp' : null }, fill);
      const ffill = h('i'), fv = h('span', { class: 'fv' });
      bars.push({ x, em, lvup, xpn, fill, bar, ffill, fv, lv: x.lv0 });
      return h('div', { class: 'rs-hr' },
        h('span', { class: 'face' }, h('img', { src: heroPortrait(x.c), alt: '' }), em),
        h('span', { class: 'top' }, h('span', { class: 'nm', text: x.c.name }), lvup, xpn),
        bar,
        h('button', { class: 'rs-fat', type: 'button', 'data-tut': k === 0 ? 'fatigue' : null, 'aria-label': `${x.c.name}: fatigue`, onclick: () => { sfx('click'); fatigueTip(x); } },
          ico('fatigue'), h('span', { class: 'rs-fbar' }, ffill, h('s', { style: 'left:50%' }), h('s', { style: 'left:75%' })), fv));
    };
    // the loot: gold, materials, party items and gear, then New
    const tiles = [];
    const tile = (cls, img, count, label, tap) => { const el = h('button', { class: 'rs-it' + (cls ? ' ' + cls : ''), type: 'button', 'aria-label': label, onclick: () => { sfx('click'); tap(); } }, img, count != null ? h('em', { text: count }) : null); tiles.push(el); return el; };
    if (L.gold) tile('', ico('coin'), short(L.gold), `${fmt(L.gold)} gold`, () => toast(L.clear ? `${fmt(L.gold)} gold: ${fmt(L.spoils)} from the foes, ${fmt(L.clear)} for the clear` : `${fmt(L.gold)} gold`));
    for (const mt of MATERIALS) if (L.mats[mt.id]) tile('', ico(matIcon(mt.id)), short(L.mats[mt.id]), `${mt.name} ×${L.mats[mt.id]}`, () => toast(`${mt.name} ×${fmt(L.mats[mt.id])}`));
    for (const id in L.items) if (ITEMS[id] && L.items[id]) tile('', ico(ITEMS[id].icon), String(L.items[id]), `${ITEMS[id].name} ×${L.items[id]}`, () => toast(`${ITEMS[id].name}: ${ITEMS[id].tip}`));
    for (const g of L.gear) if (GEAR[g.id]) tile('gear r-' + GEAR[g.id].rarity + (g.sold ? ' sold' : ''), gearIco(g.id), g.sold ? 'sold' : null, GEAR[g.id].name, () => gearTap(g));
    const ids = [...new Set(L.unlocks || [])].filter(id => UNLOCKS[id] && Guide.newThing(id));
    const chip = (id, k) => { const nt = Guide.newThing(id); return h('button', { class: 'rs-new', type: 'button', 'data-tut': k === 0 ? 'new' : null, 'aria-label': nt.name, onclick: () => { sfx('click'); newTap(nt); } }, ico(nt.icon), h('b', { text: 'New' }), h('span', { text: shortName(UNLOCKS[id]) })); };
    const more = k => h('button', { class: 'rs-new more', type: 'button', 'aria-label': `${k} more new`, onclick: () => { sfx('click'); newList(ids); } }, h('b', { text: '+' + k }));
    const chips = ids.length > 2 ? [chip(ids[0], 0), more(ids.length - 1)] : ids.map(chip);
    const lootRow = h('div', { class: 'rs-loot' }, h('span', { class: 'k', text: 'Loot' }), h('span', { class: 'its' }, tiles.length ? tiles : h('span', { class: 'none', text: '–' })), h('span', { class: 'sp' }), chips);
    // the buttons: js/main.js says what is offered (o.next, o.farm) and does each one (o.on)
    const b = (label, sub, tut, fn, pri) => h('button', { class: 'rs-b' + (pri ? ' pri' : ''), type: 'button', 'data-tut': tut, onclick: () => { sfx('click'); fn(); } },
      sub ? [h('span', { class: 'bl', text: label }), h('small', { text: sub })] : label);
    const acts = [b('Report', null, 'report', o.on.report), b('Hearth', null, 'camp', o.on.camp)];
    if (m.won) {
      acts.push(b('Fight again', null, 'again', o.on.again, !o.next));
      if (o.next) acts.push(b('Next', `${o.next.id} · ${o.next.name.replace(/^The /, '')}`, 'next', o.on.next, true));
    } else {
      acts.push(b('Try again', null, 'again', o.on.again, !o.farm));
      if (o.farm) acts.push(b(`Farm ${o.farm.id}`, 'XP and gear', 'next', o.on.farm, true));
    }
    const box = h('div', { class: 'rs-box' + (n <= 3 ? ' one' : '') + (rows >= 3 ? ' rows3' : ''), role: 'dialog', 'aria-label': m.won ? 'Victory' : 'Driven back' },
      h('div', { class: 'rs-banner' + (m.won ? '' : ' lost') }, ico('lantern'), h('b', { text: m.won ? 'Victory' : 'Driven back' }), ico('lantern')),
      h('div', { class: 'rs-sub' }, h('span', { class: 'id', text: idsText(m.ids) }), h('span', { class: 'nm', text: st.name }),
        m.first ? h('span', { class: 'first' }, ico('star'), m.first > 1 ? `First clear ×${m.first}` : 'First clear') : null),
      h('div', { class: 'rs-heroes' }, m.heroes.map(heroRow)),
      lootRow,
      h('div', { class: 'rs-acts' }, acts));
    const root = h('div', { class: 'rs-root' + (m.hint ? ' hint' : '') }, box);
    if (m.hint) Wick.say(m.hint, { parent: root, cls: 'rs-wick' });

    // p runs 0 → 1: the heroes fill one after another, then the loot pops in, then New
    const stag = n > 1 ? Math.min(0.1, (0.85 - FILL) / (n - 1)) : 0, step = Math.min(0.07, 0.3 / Math.max(1, tiles.length)), NEW_AT = 0.9;
    const heard = { win: false, unlock: false };
    const ups = m.heroes.some(x => x.lv1 > x.lv0);
    function set(p, quiet) {
      bars.forEach((B, k) => {
        const x = B.x, q = clamp((p - k * stag) / FILL, 0, 1), at = xpAt(x, q);
        B.fill.style.width = (at.frac * 100).toFixed(1) + '%';
        B.xpn.textContent = `+${fmt(Math.round(x.gain * q))} XP`;
        if (at.lv !== B.lv) {
          B.lv = at.lv;
          B.em.textContent = String(at.lv);
          B.lvup.classList.toggle('on', at.lv > x.lv0);
          if (!quiet && at.lv > x.lv0) {
            B.em.classList.remove('up'); void B.em.offsetWidth; B.em.classList.add('up');
            B.bar.classList.add('flash'); setTimeout(() => B.bar.classList.remove('flash'), 220);
            sfx('win'); heard.win = true;
          }
        }
        const f = x.f0 + (x.f1 - x.f0) * q;
        B.ffill.style.width = clamp(f, 0, 100).toFixed(1) + '%';
        B.ffill.style.background = fatColor(f);
        B.fv.textContent = String(Math.floor(f));
        B.fv.className = 'fv ' + fatClass(f);
      });
      tiles.forEach((t, k) => t.classList.toggle('in', p >= 0.55 + k * step));
      const was = chips.length && chips[0].classList.contains('in');
      chips.forEach(c => c.classList.toggle('in', p >= NEW_AT));
      if (!quiet && !was && chips.length && p >= NEW_AT) { sfx('unlock'); heard.unlock = true; }
    }
    // The end, all at once: a sound for a level-up or an unlock that had not had one yet.
    function end(sound) {
      set(1, true);
      root.classList.add('done');
      if (sound && ups && !heard.win) sfx('win');
      if (sound && chips.length && !heard.unlock) sfx('unlock');
      heard.win = heard.unlock = true;
    }
    return { root, box, lootRow, tiles, chips, set, end };
  }

  // The loot row holds what fits: New collapses into "+N", then the tiles close up, then the last pieces of gear fold
  // into "+N" too (a tap names them).
  function fit(P, m) {
    const row = P.lootRow, over = () => row.scrollWidth > row.clientWidth + 1;
    if (!over()) return;
    if (P.chips.length === 2 && !P.chips[1].classList.contains('more')) {
      const ids = [...new Set(m.loot.unlocks)].filter(id => UNLOCKS[id]);
      const more = h('button', { class: 'rs-new more', type: 'button', 'aria-label': '1 more new', onclick: () => { sfx('click'); newList(ids); } }, h('b', { text: '+1' }));
      P.chips[1].replaceWith(more); P.chips[1] = more;
      if (!over()) return;
    }
    row.classList.add('dense');
    const gear = P.tiles.filter(t => t.classList.contains('gear'));
    const folded = [];
    while (over() && gear.length > 1) { const t = gear.pop(); folded.unshift(t.getAttribute('aria-label')); t.remove(); P.tiles.splice(P.tiles.indexOf(t), 1); }
    if (folded.length) {
      const t = h('button', { class: 'rs-it fold', type: 'button', 'aria-label': `${folded.length} more`, onclick: () => { sfx('click'); toast(folded.join(' · ')); } }, h('b', { text: '+' + folded.length }));
      row.querySelector('.its').append(t); P.tiles.push(t);
    }
  }

  // Shows the popup for res, the battle that brought the party home. o: { index (the stage just fought), trip (the
  // trip's summary when it was several battles long), next, farm (stages, or null), on: { report, camp, again, next,
  // farm } }. o.still: at its end at once, as when it shows again.
  function show(res, o) {
    stop();
    const m = last && last.res === res && last.o.trip === o.trip ? last.m : model(res, o);
    last = { res, o, m };
    const P = build(m, o), calm = o.still || noMotion();
    $('#banner').className = ''; // the battle's own Victory or Defeat, which the popup's banner replaces
    openSheet(P.root, 'results');
    fit(P, m);
    if (calm) { P.end(!o.still); P.root.classList.add('still'); return; }
    P.set(0, true);
    const t0 = performance.now() + IN;
    const tick = now => {
      if (!run || !P.root.isConnected) { run = null; return; }
      const p = clamp((now - t0) / MS, 0, 1);
      if (p >= 1) { run = null; P.end(true); return; }
      P.set(p);
      run.raf = requestAnimationFrame(tick);
    };
    run = { raf: requestAnimationFrame(tick), P };
    // A tap anywhere skips to the end: it doesn't also press what it landed on.
    P.root.addEventListener('click', e => { if (!run || run.P !== P) return; e.stopPropagation(); e.preventDefault(); stop(); P.end(true); }, true);
  }
  function stop() { if (run) { cancelAnimationFrame(run.raf); run = null; } }
  // The same popup again, at its end: back from the report, a piece's card or the list of new things.
  function reopen() { if (last) show(last.res, Object.assign({}, last.o, { still: true })); }

  return { show, reopen, get busy() { return !!run; }, get res() { return last && last.res; }, get index() { return last ? last.o.index : null; } };
})();
