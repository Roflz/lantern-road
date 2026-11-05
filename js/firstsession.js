'use strict';
// Lantern Road · Wick's first session (onboarding spec §6.4, after docs/idle-heroes-study.md): about ten forced minutes
// that teach the basics at the moment they're used. One action a step: a spotlight and a pointer on the one thing to
// tap, Wick's line beside it, and nothing else takes a press (Wick.show's gate, js/wick.js).
//   1    the Hearth, after the title: his welcome (W1), your name (W2), and the Recruit Board lit (W3, V4)
//   2–3  the Recruit Board's first pick (js/firstpick.js, P1–P4): a line on each starter, Hire (free), the reveal
//   4    back at the Hearth: Set out (P5), which flies up the road with 1-1's card open (the road view)
//   5    the road: "Each lantern is a stage", then the card's Set out
//   6    battle 1-1, paused twice: the turn order at the first turn, then speed and skip
//   7    the results popup: the first level, the fatigue bar, then the Hearth button
//   8–9  the hero's tactics: Heroes, the hero, the Tactics tab; how tactics are read; back to the Hearth by its tab
//   10   1-2: the turn order names the tactic that chose the move (a line that doesn't stop the battle)
//   11   the Recruit Board's free recruit, hired the same way, who waits at the fire
//   12   Formation (js/formation.js, F3): the two rows, and a hand showing the drag; then Done, and Wick's goodbye
// Then the goal tracker at the Hearth takes over. The session runs once per save (save.guide: the step under way, and
// done); a reload carries on where it was, and a step whose moment has passed (a battle resolved while the app was
// closed) is skipped. Settings → Replay the guide plays Wick's lines again as soft steps, each when its place comes
// up, holding nothing back (save.guide.replay). The Prototype panel can skip the session.
// Every step points at a data-tut anchor (or the camp scene's anchors: the board and the road's lanterns), so a
// redesigned screen keeps its steps by keeping its anchors.

const FirstSession = (() => {
  const st = () => (typeof Save !== 'undefined' ? Save.state : null);
  const q = sel => document.querySelector(sel);
  const sheetOpen = () => !$('#sheet').hidden;
  const titleUp = () => typeof Title !== 'undefined' && Title.up;
  const lit = id => { const s = st(); return !!s && s.campaign.cleared.includes(id); };
  const lead = () => { const s = st(); return s.roster[0]; };
  // ── where the player is
  const camp = () => (App.current === 'home' && typeof Camp !== 'undefined' ? Camp.scene : null);
  const atHearth = () => { const c = camp(); return !!c && !c.onRoad && c.road < 0.01 && !sheetOpen() && $('#screen').hidden && !!q('.camp [data-tut=hearth-setout]'); };
  const onRoadCard = () => { const c = camp(); const hud = q('.cv-roadhud'); return !!c && c.onRoad && c.road > 0.99 && !sheetOpen() && !!hud && +getComputedStyle(hud).opacity > 0.95 && !!Wick.boxOf('[data-tut=road-go]'); };
  // the results popup of stage i is up (shown), and its bars have finished filling (results)
  const shown = i => !!(typeof Results !== 'undefined' && sheetOpen() && $('#sheet').classList.contains('results') && Results.res && Results.index === i);
  const results = i => shown(i) && !Results.busy;
  const inBattle = i => App.current === 'battle' && typeof Battle !== 'undefined' && Battle.busy && fight && fight.i === i;
  // A thing the camp scene draws, as a box on the stage: the Recruit Board, or the lantern of the stage with the card.
  function sceneBox(pick) {
    const c = camp(), el = q('.camp');
    if (!c || !c.out || !el) return null;
    const a = c.out.anchors.find(pick);
    if (!a || !a.box || (a.a != null && a.a < 0.5)) return null;
    const o = Frame.box(el, $('#stage')), K = 2;
    return { x: o.left + a.box[0] * K, y: o.top + a.box[1] * K, w: (a.box[2] - a.box[0]) * K, h: (a.box[3] - a.box[1]) * K };
  }
  // the board with its plaque under it
  const board = () => { const b = sceneBox(a => a.id === 'board'); return b && { x: b.x, y: b.y, w: b.w, h: b.h + 16 }; };
  // the lantern with its label over it
  const lantern = () => {
    const c = camp(), b = c && c.out ? sceneBox(a => a.stage != null && a.stage === c.out.sel) : null, l = b && Wick.boxOf('[data-tut=road-frontier]');
    if (!b || !l) return b;
    const x0 = Math.min(b.x, l.x), y0 = Math.min(b.y, l.y);
    return { x: x0, y: y0, w: Math.max(b.x + b.w, l.x + l.w) - x0, h: Math.max(b.y + b.h, l.y + l.h) - y0 };
  };

  // ── the steps. phase: when its part of the session still has a moment (otherwise the step is skipped).
  // at(): its moment is now. show(done): puts it on screen with Wick.show, and calls done() when it's over.
  const PHASE = {
    pick: s => !s.roster.length,
    first: s => !lit('1-1') || shown(0) || inBattle(0),
    rules: s => !lit('1-2') || shown(1) || inBattle(1),
    recruit: s => s.roster.length < 2,
    form: () => true,
  };
  const name = () => (st().name || '').trim();
  const STEPS = [
    // 1: the welcome (W1–W3)
    { id: 'hello', phase: 'pick', at: atHearth, show: () => ({ panel: 'Ah, a traveller. Come and sit by the fire.' }) },
    { id: 'dark', phase: 'pick', at: atHearth, show: () => ({ panel: 'The road’s gone dark. Someone has to light it again.' }) },
    { id: 'name', phase: 'pick', forced: true, at: atHearth, show: nameBox },
    { id: 'show', phase: 'pick', at: atHearth, show: () => ({ panel: name() ? `${name()}. A good name for the road. Let me show you the Hearth.` : 'Let me show you the Hearth.' }) },
    { id: 'board', phase: 'pick', at: () => atHearth() && !!board(), show: () => ({ target: board, round: true, pad: 10, side: 'r', say: 'The Recruit Board. Let’s find you a lantern-bearer.', tap: 'target', until: () => typeof FirstPick !== 'undefined' && FirstPick.shown }) },
    // 2–3: the first pick (the board's own panel says Wick's lines)
    { id: 'pick', phase: 'pick', forced: true, at: () => FirstPick.shown, show: () => ({ dim: false, tap: 'none', area: '#sheet .fp', until: () => st().roster.length > 0 && !FirstPick.shown }) },
    // 4–5: the road
    { id: 'setout', phase: 'first', at: atHearth, show: () => ({ target: '[data-tut=hearth-setout]', round: true, say: 'A bearer needs a road. Set out when you’re ready.', tap: 'target', until: () => { const c = camp(); return !!c && c.onRoad; } }) },
    { id: 'lantern', phase: 'first', at: () => onRoadCard() && !!lantern(), show: () => ({ target: lantern, round: true, pad: 12, say: 'Each lantern is a stage.' }) },
    { id: 'go', phase: 'first', at: onRoadCard, show: () => ({ target: '[data-tut=road-go]', round: true, say: 'Light the first.', tap: 'target', until: () => App.current === 'battle' }) },
    // 6: battle 1-1, paused twice (shown from the battle's events, below)
    { id: 'order', phase: 'first', battle: 0, show: () => ({ target: '[data-tut=turn-order] .flag.in', pad: 4, say: 'Battles fight themselves. The turn order shows who acts next.', small: true, side: 'l', pause: true }) },
    { id: 'speed', phase: 'first', battle: 0, show: () => ({ target: '[data-tut=battle-speed], [data-tut=battle-skip]', pad: 5, say: 'Speed it up, or skip to the end.', small: true, side: 'l', pause: true, tap: 'target' }) },
    // 7: the results popup
    { id: 'xp', phase: 'first', at: () => results(0), show: () => ({ target: '[data-tut=xp]', pad: 5, say: leveled() ? 'Your first level. Each one brings a stat point.' : 'Battles bring XP. A full bar is a level.' }) },
    { id: 'fatigue', phase: 'first', at: () => results(0), show: () => ({ target: '[data-tut=fatigue]', pad: 5, say: 'Every turn tires a hero a little. They rest at the Hearth.' }) },
    { id: 'home', phase: 'first', at: () => results(0), show: () => ({ target: '[data-tut=camp]', pad: 4, say: 'Back to the Hearth.', tap: 'target', until: () => App.current === 'home' }) },
    // 8–9: the hero's tactics (the anchors keep their names: hero-tab-rules, hero-rules)
    { id: 'heroes', phase: 'rules', at: atHearth, show: () => ({ target: '[data-tut=hearth-heroes]', round: true, say: 'Your hero fights by tactics. Let’s look at them.', tap: 'target', until: () => App.current === 'party' }) },
    { id: 'hero', nav: true, phase: 'rules', at: () => App.current === 'party' && !sheetOpen() && !!q('[data-tut=party-hero]'), show: () => { seen('[data-tut=party-hero]'); return { target: () => q('[data-tut=party-hero]'), pad: 3, tap: 'target', until: () => App.current === 'hero' }; } },
    { id: 'tab', nav: true, phase: 'rules', at: () => App.current === 'hero' && !sheetOpen() && !!q('[data-tut=hero-tab-rules]'), show: () => ({ target: '[data-tut=hero-tab-rules]', pad: 3, tap: 'target', until: rulesTab }) },
    { id: 'rules', phase: 'rules', at: () => App.current === 'hero' && rulesTab() && !!q('[data-tut=hero-rules]'), show: () => (seen('[data-tut=hero-rules]'), { target: '[data-tut=hero-rules]', pad: 4, arrow: false, say: 'Tactics run from the top. The first one that fits is used.' }) },
    { id: 'tabhome', nav: true, phase: 'rules', at: () => (App.current === 'hero' || App.current === 'party') && !sheetOpen(), show: () => ({ target: '[data-tut=tab-home]', pad: 2, tap: 'target', until: () => App.current === 'home' }) },
    // 10: battle 1-2
    { id: 'setout2', nav: true, phase: 'rules', at: atHearth, show: () => ({ target: '[data-tut=hearth-setout]', round: true, say: 'On to 1-2.', tap: 'target', until: () => { const c = camp(); return !!c && c.onRoad; } }) },
    { id: 'go2', nav: true, phase: 'rules', at: onRoadCard, show: () => ({ target: '[data-tut=road-go]', round: true, tap: 'target', until: () => App.current === 'battle' }) },
    { id: 'why', phase: 'rules', battle: 1, show: () => ({ target: '[data-tut=turn-order] .flag.now .why', pad: 4, dim: false, arrow: false, say: 'The turn order names the tactic that chose the move.', small: true, side: 'l', tap: 'free', ms: 6500 }) },
    { id: 'new', phase: 'rules', at: () => results(1) && !!q('[data-tut=new]'), show: () => ({ target: '[data-tut=new]', pad: 4, say: 'The Recruit Board is open.' }) },
    { id: 'home2', nav: true, phase: 'rules', at: () => results(1), show: () => ({ target: '[data-tut=camp]', pad: 4, tap: 'target', until: () => App.current === 'home' }) },
    // 11: the free recruit
    { id: 'board2', phase: 'recruit', at: () => atHearth() && !!board(), show: () => ({ target: board, round: true, pad: 10, side: 'r', say: 'The board has a free recruit for you.', tap: 'target', until: () => FirstPick.shown }) },
    { id: 'hire', phase: 'recruit', forced: true, at: () => FirstPick.shown, show: () => ({ dim: false, tap: 'none', area: '#sheet .fp', until: () => st().roster.length > 1 && !FirstPick.shown }) },
    // 12: Formation (F3)
    { id: 'form', phase: 'form', at: () => atHearth() && !!q('[data-tut=hearth-formation]'), show: () => ({ target: '[data-tut=hearth-formation]', pad: 4, say: 'Two of you now. Let’s find them a place.', tap: 'target', until: () => Formation.shown }) },
    { id: 'place', phase: 'form', forced: true, at: () => Formation.shown && !!q('[data-tut=formation-front]'), show: placeStep },
    { id: 'done', nav: true, phase: 'form', at: () => Formation.shown && !!q('[data-tut=formation-done]'), show: () => ({ target: '[data-tut=formation-done]', pad: 4, say: 'Well placed.', small: true, side: 'l', tap: 'target', until: () => !Formation.shown }) },
    { id: 'bye', phase: 'form', at: atHearth, show: () => ({ panel: 'That’s the road. I’m by the fire if you need me.' }) },
  ];
  const leveled = () => { const r = Results.res; return !!(r && r.gains && r.gains.some(x => x.g.to > x.g.from)); };
  // a column screen scrolls what Wick points at into view first
  const seen = sel => { const el = q(sel); if (el) try { el.scrollIntoView({ block: 'nearest' }); } catch (e) { } };
  const rulesTab = () => { const t = q('[data-tut=hero-tab-rules]'); return !!t && t.getAttribute('aria-selected') === 'true'; };
  const fresh = () => { const s = st(); return s.roster.find(c => !s.party.includes(c.id)) || s.roster[s.roster.length - 1]; };
  // where the new hero belongs: a front-row class in front, the rest at the back (F3 points at the back's lower place)
  function spotFor(c) {
    const p = st().party, order = CLASSES[c.cls].row === 'front' ? [0, 1, 4, 2, 3, 5] : [4, 2, 3, 5, 0, 1];
    return order.find(i => !p[i]);
  }
  function placeStep() {
    const c = fresh(), to = spotFor(c);
    return {
      callouts: [
        // on the rows (formation-front, formation-back), at their first places' pads, as F3 has them
        { target: () => q('[data-tut=formation-front] ~ .fm-slot[data-slot="0"] .fm-pad') || q('[data-tut=formation-front]'), title: 'Front', text: 'Takes the blows. Melee can only reach here.', below: true },
        { target: () => [...document.querySelectorAll('.fm-slot[data-slot="2"] .fm-pad, .fm-slot[data-slot="3"] .fm-pad')].concat(q('.fm-pad') ? [] : [q('[data-tut=formation-back]')]), title: 'Back', text: 'Safe while the front stands.', below: false },
      ],
      hand: { from: () => q(`.fm-port[data-id="${c.id}"] .fm-pf`), to: () => q(`.fm-slot[data-slot="${to}"] .fm-pad`) },
      say: 'Sturdy heroes in front, the rest behind.', small: true, side: 'r', dim: false,
      tap: 'none', area: ['.fm-line', '.fm-strip'], until: () => st().party.includes(c.id),
    };
  }
  // W2: his question, and the name box. OK (or Enter) takes the name; an empty box keeps "Traveller".
  function nameBox(done) {
    const input = h('input', { type: 'text', maxlength: '16', placeholder: 'Your name', autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Your name', value: st().name || '' });
    const take = () => { const v = input.value.replace(/\s+/g, ' ').trim().slice(0, 16); st().name = v; Save.commit(); sfx('click'); if (typeof Camp !== 'undefined') App.refresh(); done(); };
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); take(); } });
    const ok = h('button', { class: 'wk-ok', type: 'button', 'data-tut': 'name-ok', onclick: take }, 'OK');
    const box = h('div', { class: 'wk-name' }, h('div', { class: 'wk-tab', text: 'Your name' }), input, ok);
    setTimeout(() => { try { input.focus({ preventScroll: true }); } catch (e) { } }, 350);
    return { say: 'What do they call you?', side: 'l', ui: box, tap: 'none' };
  }

  // ── running it
  let H = null, fight = null, replaying = false;
  const on = () => { const s = st(); return !!s && !s.guide.done; };
  const idx = id => STEPS.findIndex(x => x.id === id);
  // The step under way: the saved one, moved past every step whose moment has gone.
  function current() {
    const s = st();
    let i = Math.max(0, idx(s.guide.step));
    while (i < STEPS.length && !PHASE[STEPS[i].phase](s)) i++;
    // a lost battle (1-1 and 1-2 can't be lost, but a save can be odd): back to setting out
    if (STEPS[i] && atHearth() && i > idx('setout') && i <= idx('home') && !lit('1-1')) i = idx('setout');
    if (STEPS[i] && atHearth() && i > idx('setout2') && i <= idx('home2') && !lit('1-2')) i = idx('setout2');
    return i;
  }
  function advance(from) {
    const s = st(), i = idx(from) + 1;
    if (i >= STEPS.length) { finish(); App.refresh(); return; }
    s.guide.step = STEPS[i].id;
    Save.commit();
  }
  function present(step, o) {
    if (!o) return;
    const pause = o.pause && typeof Battle !== 'undefined' && Battle.busy;
    if (pause) Battle.setPaused(true);
    quietSince = 0;
    H = Wick.show(Object.assign({}, o, {
      onDone: () => {
        H = null;
        if (pause && Battle.busy && Battle.paused) { Battle.play(); if (typeof syncControls === 'function') syncControls(); }
        if (replaying) { const s = st(); if (s.guide.replay) { s.guide.replay[step.id] = 1; Save.commit(); } }
        else advance(step.id);
      },
    }));
  }
  function showStep(step) {
    let o = null;
    const done = () => { if (H) H.next(); };
    o = step.show(done);
    if (replaying && o) { o = Object.assign({}, o, { tap: 'free', pause: false, until: null, ms: o.ms || 9000, ui: null }); }
    present(step, o);
  }
  // Every quarter of a second: is it the next step's moment?
  function tick() {
    const s = st();
    if (!s || H || titleUp()) return;
    if (!s.guide.done) {
      replaying = false;
      const i = current();
      if (i >= STEPS.length) { advance(STEPS[STEPS.length - 1].id); return; }
      if (STEPS[i].id !== s.guide.step) { s.guide.step = STEPS[i].id; Save.commit(); }
      const step = STEPS[i];
      if (!step.battle && step.at()) showStep(step);
      return;
    }
    // Replay the guide: each of Wick's lines once more, when its place comes up, holding nothing back
    if (s.guide.replay) {
      replaying = true;
      // the lines, not the forced picks or the way from one screen to the next
      const left = STEPS.filter(x => !x.forced && !x.nav && !s.guide.replay[x.id] && x.id !== 'board2');
      if (!left.length) { s.guide.replay = null; Save.commit(); return; }
      const step = left.find(x => !x.battle && safe(x.at));
      if (step) showStep(step);
    }
  }
  const safe = fn => { try { return !!fn(); } catch (e) { return false; } };
  setInterval(() => { try { tick(); } catch (e) { console.warn('Lantern Road: the guide', e); } }, 250);
  // Between forced steps nothing takes a press (Wick.show's gate), except during a battle. If no step's moment has come
  // for 15 seconds the hold lets go, so a save in a state the script didn't foresee is never stuck.
  let quietSince = 0;
  Wick.hold = () => {
    if (!on() || titleUp() || H) { quietSince = 0; return false; }
    if (App.current === 'battle' && typeof Battle !== 'undefined' && Battle.busy) return false;
    if (!quietSince) quietSince = Date.now();
    return Date.now() - quietSince < 15000;
  };

  // The battle's events, as they play (js/guide.js passes them on): 1-1 stops at its first turn for the turn order,
  // and two turns later for speed and skip; 1-2 names the tactic that chose a move.
  function battleEvent(e, i) {
    const s = st();
    if (!s) return;
    if (!fight || fight.i !== i) fight = { i, turns: 0 };
    if (e.t === 'turn') fight.turns++;
    const step = on() ? STEPS[current()] : null;
    if (H) return;
    const want = id => (on() ? step && step.id === id : s.guide.replay && !s.guide.replay[id]);
    replaying = !on();
    if (e.t === 'turn' && fight.turns === 1 && want('order') && (i === 0 || replaying)) setTimeout(() => { if (!H && Battle.busy) showStep(STEPS[idx('order')]); }, 450);
    else if (e.t === 'turn' && fight.turns === 3 && want('speed') && (i === 0 || replaying)) setTimeout(() => { if (!H && Battle.busy) showStep(STEPS[idx('speed')]); }, 200);
    else if (e.t === 'act' && e.rule >= 0 && /^p\d$/.test(e.who) && want('why') && (i === 1 || replaying)) setTimeout(() => { if (!H && Battle.busy) showStep(STEPS[idx('why')]); }, 350);
  }
  function battleStart(i) { fight = { i, turns: 0 }; }
  function battleEnd() {
    // a step still up when the battle ends (the soft line in 1-2) goes with it
    if (H && App.current === 'battle' && (H.tap === 'free' || !Battle.busy)) H.close();
  }

  // The session is over: the coach marks it stood in for (js/guide.js) have had their moment.
  function finish() {
    const s = st();
    s.guide.done = true; s.guide.step = '';
    for (const k of ['c:flags', 'c:speed', 'c:rule', 'c:board']) if (!s.campaign.tips[k]) s.campaign.tips[k] = Date.now();
    Save.commit();
  }
  // Settings → Replay the guide, and the Prototype panel's Skip the guide.
  function replay() { const s = st(); if (!s) return; s.guide.replay = {}; Save.commit(); toast('Wick will show you round again'); }
  function skip() { if (!st()) return; if (H) H.close(); Wick.hide(); finish(); }
  // The Recruit Board's tap at the Hearth: the first pick, or the free recruit while the session wants it.
  function boardTap() {
    const s = st();
    if (!s.roster.length) { FirstPick.open({ mode: 'pick', guided: on() }); return true; }
    if (on() && STEPS[current()] && STEPS[current()].id === 'board2') { FirstPick.open({ mode: 'hire', guided: true, rest: true }); return true; }
    return false;
  }
  return { get on() { return on(); }, get step() { const s = st(); return s && !s.guide.done ? s.guide.step : null; }, battleEvent, battleStart, battleEnd, replay, skip, boardTap, STEPS };
})();
