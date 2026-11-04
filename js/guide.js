'use strict';
// Lantern Road · teaching the first hour (campaign spec §8, build step 7b). One system at a time, as first clears
// unlock it, and nothing that blocks idle play:
//   coach marks   a one-line pointer at something on screen, with a soft ring around it, the first time it matters
//                 (the turn flags in the first battle, the rule each flag names, the draughts, the Tactics screen…).
//                 It fades by itself or at the next tap, and never takes the tap.
//   new things    the trip summary on the Road tab lists what the trip unlocked, each with one line and a button that
//                 goes straight to it: open Tactics, the Recruit Board, build the blueprint, see the Relic.
//   tab dots      a dot on Base, Party, Bag or Road when something there waits for you.
//   the title     a short title card over the first pick of a new game.
// Battle tips (js/main.js, §8.3) go through Guide.tip. Every coach mark and tip shows once (campaign.tips in the save),
// and Settings → First-time tips turns them all off. The new-thing rows are part of the trip summary and always show.

const Guide = (() => {
  const st = () => (typeof Save !== 'undefined' ? Save.state : null);
  const tipsOn = () => !!st() && st().settings.tips !== false;
  const seen = key => !!(st() && st().campaign.tips && st().campaign.tips[key]);
  const once = key => tipsOn() && Campaign.tip(key);
  const frame = () => $('#frame');

  // ── coach marks
  let mark = null; // { ring, tip, timer }
  // An element's box in #frame's own coordinates, measured on screen (so centring transforms count) and turned back
  // into the landscape frame's design pixels, allowing for its scale and quarter-turn (js/frame.js).
  function boxOf(el) {
    const fr = frame();
    if (!fr.contains(el)) return null;
    const b = Frame.box(el, fr);
    return { x: b.left, y: b.top, w: b.width, h: b.height };
  }
  function clear() {
    if (!mark) return;
    const m = mark; mark = null;
    clearTimeout(m.timer);
    m.ring.classList.add('out'); m.tip.classList.add('out');
    setTimeout(() => { m.ring.remove(); m.tip.remove(); }, 300);
  }
  // Points at `target` (an element, a selector, or a selector for several: their box together) with one line of text,
  // once per key. o: { place: 'below'|'above', ms, all (ring every match), minLeft (keep the tip right of this, in
  // frame px: clear of the battle's top-left hero), force (show even if seen) }. Returns true if it showed.
  function coach(key, target, text, o = {}) {
    const els = (typeof target === 'string' ? (o.all ? [...document.querySelectorAll(target)] : [$(target)]) : [target]).filter(el => el && el.offsetWidth && el.offsetHeight);
    const boxes = els.map(boxOf).filter(Boolean);
    if (!boxes.length) return false;
    const x0 = Math.min(...boxes.map(q => q.x)), y0 = Math.min(...boxes.map(q => q.y));
    const b = { x: x0, y: y0, w: Math.max(...boxes.map(q => q.x + q.w)) - x0, h: Math.max(...boxes.map(q => q.y + q.h)) - y0 };
    if (!o.force && !once(key)) return false;
    clear();
    const fr = frame(), FW = fr.offsetWidth, FH = fr.offsetHeight, pad = 3;
    const ring = h('span', { class: 'coach-ring', style: `left:${b.x - pad}px;top:${b.y - pad}px;width:${b.w + pad * 2}px;height:${b.h + pad * 2}px`, 'aria-hidden': 'true' });
    const tip = h('div', { class: 'coach-tip', role: 'status' }, h('span', { class: 'txt', text }));
    fr.append(ring, tip);
    const tw = Math.min(tip.offsetWidth, FW - 16), th = tip.offsetHeight;
    const below = o.place === 'below' || (o.place !== 'above' && b.y + b.h + th + 14 < FH);
    const cx = b.x + b.w / 2, left = clamp(Math.round(cx - tw / 2), Math.min(o.minLeft || 8, FW - tw - 8), Math.max(8, FW - tw - 8));
    const top = below ? b.y + b.h + 10 : b.y - th - 10;
    tip.style.left = left + 'px'; tip.style.top = clamp(top, 6, FH - th - 6) + 'px';
    tip.style.setProperty('--ax', clamp(cx - left, 12, tw - 12) + 'px');
    tip.classList.add(below ? 'below' : 'above');
    sfx('tip');
    mark = { ring, tip, at: Date.now(), timer: setTimeout(clear, o.ms || 6500) };
    return true;
  }
  // Any tap ends a coach mark (the tap itself still goes through).
  document.addEventListener('pointerdown', () => { if (mark && Date.now() - (mark.at || 0) > 400) clear(); }, true);

  // ── battle tips (§8.3): one line, the first time something happens, never blocking the battle
  function tip(key, text) { if (once(key)) { toast(text, 'tip'); return true; } return false; }

  // ── the battle: the first battle shows the turn flags and the speed buttons, 1-2 the rule each flag names, and the
  // first battle with party items the draughts (campaign spec §8.2). Called for every event as it plays (js/main.js).
  let fight = null; // { i (stage index), t0, turns }
  function battleStart(i) { fight = { i, t0: 0, turns: 0 }; }
  function battleEvent(e) {
    if (!fight || !tipsOn()) return;
    if (e.t === 'turn') {
      fight.turns++;
      const heroGap = () => Math.round(frame().offsetWidth * 0.2); // right of the top-left hero
      if (fight.turns === 1) setTimeout(() => {
        if (coach('c:flags', '#flags .flag.in', 'Who acts next, and with what. The big flag is the turn being played.', { place: 'below', ms: 7000, all: true, minLeft: heroGap() })) fight.t0 = Date.now();
        else if (coach('c:items', '.it-tray:not([hidden])', 'Tap a draught to use it now, or leave it to the party rule.', { place: 'above', ms: 6500 })) fight.t0 = Date.now();
      }, 450);
      else if (fight.t0 && Date.now() - fight.t0 > 7600 && !seen('c:speed')) setTimeout(() => coach('c:speed', '#bSkip', 'Faster with 2× and 4×, or skip straight to the result.', { place: 'above', ms: 6000 }), 200);
    }
    if (e.t === 'act' && e.rule >= 0 && /^p\d$/.test(e.who) && fight.i >= 1 && !seen('c:rule') && !mark)
      setTimeout(() => coach('c:rule', '.flag.now .why', 'The flag names the rule that chose the move. Rules are yours to change, on Tactics.', { place: 'below', ms: 7000, minLeft: Math.round(frame().offsetWidth * 0.2) }), 350);
  }
  function battleEnd() { fight = null; clear(); }
  // Between battles on a trip that keeps going.
  function between() { setTimeout(() => coach('c:walk', '.between .bt-acts .btn:last-child', 'The party walks on to the next stage by itself. Come home whenever you like.', { place: 'below', ms: 6000 }), 500); }

  // ── screens: the first visit that matters
  function onScreen(name) {
    if (!tipsOn()) return;
    const s = st();
    if (name === 'tactics') setTimeout(() => coach('c:tactics', '.tx-rule .tx-grip', 'Rules run from the top. Drag one to move it; switch one off to skip it.', { place: 'below', ms: 7000 }), 450);
    if (name === 'home' && typeof Base !== 'undefined' && Base.boardOpen(s) && s.board.free && s.board.recruits.length)
      setTimeout(() => coach('c:board', '.camp .bcard', 'Your first recruit is free: open the Recruit Board.', { place: 'above', ms: 6500 }), 700);
  }

  // ── new things: what a trip unlocked, with a way to each (the trip summary on the Road tab, js/map.js)
  const leader = () => { const s = st(), id = s.party.find(Boolean); return id || (s.roster[0] && s.roster[0].id); };
  const firstCond = () => STAGES.flatMap(x => x.first).find(id => UNLOCKS[id] && UNLOCKS[id].kind === 'condition');
  function goBuild(id) {
    const s = st(), open = Base.plotsCleared(s), plot = s.base.plots.findIndex((p, i) => i < open && !p);
    App.go('home');
    if (plot >= 0) Buildings.buildSheet(plot, id);
    else toast('Every plot is taken. Renown clears more of them.');
  }
  function goBoard() { App.go('home'); if (typeof Buildings !== 'undefined') Buildings.open('recruitboard'); }
  const BUILD = id => ({ label: 'Build it', fn: () => goBuild(id) });
  const NEW = {
    tactics: () => ({ line: 'Every hero follows rules you set, read from the top on each turn.', label: 'Open Tactics', fn: () => App.actions.tactics(leader(), 'map') }),
    recruitboard: () => ({ line: 'It stands at camp, and your first recruit is free.', label: 'Recruit', fn: goBoard }),
    items: () => ({ line: 'Two Healing Draughts are packed. A party rule uses one when an ally drops below half health, or tap one in battle.', label: 'The loadout', fn: () => App.actions.tactics('party', 'map') }),
    keepgoing: () => ({ line: 'After a win the party walks on to the next stage. The come-home rule brings everyone back at 75 fatigue.' }),
    tactician: () => ({ line: 'Thresholds, Focus fire, the Move action, saved rule sets and a dozen new conditions are yours. The Tactician’s blueprint comes with it: rule and loadout slots.', label: 'Open Tactics', fn: () => App.actions.tactics(leader(), 'map') }),
    gravecaller: () => ({ line: 'A new class joins the Recruit Board: the Gravecaller, who raises thralls from the fallen.', label: 'Recruit', fn: goBoard }),
  };
  function newRow(id) {
    const U = UNLOCKS[id];
    if (!U) return null;
    let o = NEW[id] ? NEW[id]() : null;
    if (!o && U.kind === 'condition') o = id === firstCond()
      ? { line: 'A new condition for your rules: what a rule checks before it fires. Add it to a rule.', label: 'Use it', fn: () => App.actions.tactics(leader(), 'map') }
      : { line: 'A new condition for your rules.', label: 'Tactics', fn: () => App.actions.tactics(leader(), 'map') };
    if (!o && U.kind === 'building' && typeof BUILDINGS !== 'undefined' && BUILDINGS[id]) o = { line: `A blueprint: build it on an empty plot at camp. ${U.line || ''}`.trim(), ...BUILD(id) };
    if (!o && U.kind === 'relic') o = { line: 'A Relic: unique, and it can’t be sold. It went into the Bag.', label: 'See it', fn: () => { const x = st().inventory.items.find(p => p.id === U.relic) || st().roster.map(c => c.gear.weapon || c.gear.armor || c.gear.accessory).find(p => p && p.id === U.relic); App.go('bag'); if (x) GearUI.card(x.uid, { after: () => App.refresh() }); } };
    if (!o && U.kind === 'class') o = { line: `${U.line ? U.line + ' ' : ''}A new class on the Recruit Board.`, label: 'Recruit', fn: goBoard };
    if (!o && U.kind === 'region') { const r = +id.split(':')[1]; o = { line: U.line || `Region ${['I', 'II', 'III', 'IV', 'V'][r] || r + 1} is open.`, label: 'The map', fn: () => RoadMap.show(r) }; }
    if (!o) o = { line: U.line || '' };
    const name = U.kind === 'condition' ? `New condition: ${U.name}` : U.name;
    return h('div', { class: 'newrow' },
      h('span', { class: 'nw-ic' }, ico(U.icon || 'star')),
      h('div', { class: 'nw-t' }, h('b', { text: name }), o.line ? h('span', { text: o.line }) : null),
      o.fn ? h('button', { class: 'small on', onclick: () => { sfx('click'); o.fn(); } }, o.label) : null);
  }
  function newRows(ids) { return [...new Set(ids)].map(newRow).filter(Boolean); }

  // ── tab dots: something waits there
  const seenSig = { party: new Set(), bag: new Set(), map: new Set() };
  const partySigs = s => s.roster.map(c => { const P = Hero.points(c); return P.stat + P.skill + Hero.pending(c).length ? `${c.id}:${c.level}:${P.stat}:${P.skill}:${Hero.pending(c).length}` : null; }).filter(Boolean);
  const bagSigs = s => s.inventory.items.filter(x => x.fresh).map(x => x.uid);
  function visit(tab) {
    const s = st();
    if (!s) return;
    if (tab === 'party' || tab === 'hero') for (const k of partySigs(s)) seenSig.party.add(k);
    if (tab === 'bag') for (const k of bagSigs(s)) seenSig.bag.add(k);
    if (tab === 'map' && s.campaign.lastTrip) seenSig.map.add(s.campaign.lastTrip.at);
  }
  function dots() {
    const s = st(), out = {};
    if (!s || !s.roster.length) return out;
    try {
      if (typeof Camp !== 'undefined' && typeof Base !== 'undefined') out.home = Camp.entries(s).some(e => e && !e.gap && Camp.badge(e, s));
      out.party = partySigs(s).some(k => !seenSig.party.has(k));
      out.bag = bagSigs(s).some(k => !seenSig.bag.has(k));
      const T = s.campaign.lastTrip;
      out.map = !!(T && !T.seen && !seenSig.map.has(T.at));
    } catch (e) { }
    return out;
  }

  // ── the title: a new game opens on the name of the road, over the first pick
  function intro() {
    if (noMotion()) return;
    const el = h('div', { class: 'intro', 'aria-hidden': 'true' },
      h('div', { class: 'in-glow' }), h('div', { class: 'in-l' }, ico('lantern')),
      h('div', { class: 'in-t', text: 'Lantern Road' }),
      h('div', { class: 'in-s', text: 'Light the road, one lantern at a time' }));
    frame().append(el);
    const go = () => { if (!el.isConnected || el.classList.contains('out')) return; el.classList.add('out'); setTimeout(() => el.remove(), 700); };
    el.addEventListener('pointerdown', go);
    setTimeout(go, 2300);
  }
  function boot() {
    const s = st();
    if (s && !s.roster.length) intro();
  }

  if (typeof App !== 'undefined') App.actions.dots = dots;
  return { tipsOn, once, seen, coach, clear, tip, battleStart, battleEvent, battleEnd, between, onScreen, newRows, newRow, dots, visit, intro, boot };
})();
