'use strict';
// Lantern Road · Wick's first session (onboarding spec §6.4; docs/tutorial-study.md §5, with the story in docs/story.md):
// about ten minutes that tell the story, then teach the basics at the moment they're used. One action a step: a
// spotlight and a pointer on the one thing to tap, Wick's line beside it, and nothing else takes a press (Wick.show's
// gate, js/wick.js) except Help and Settings, which Wick steps aside for.
//   1    the Hearth, after the title: Wick tells the story in his panel, a line a tap (Skip jumps to the name box)
//   2    "Who's in charge?" and the name box (none given: "Captain"), his welcome, and the Recruit Board lit
//   3    the Recruit Board's first pick (js/firstpick.js): a line on each of three, Hire (free), and the reveal, where
//        the new hero says why they signed on
//   4    back at the Hearth: Set out, which flies up the road with 1-1's card open
//   5    the road: what a stage is, then the card's Set out
//   6    battle 1-1, paused twice: the turn order at the first turn, then speed and skip
//   7    the results popup: the first level, then the Hearth button (fatigue waits for its first-time tip, js/main.js)
//   8    Grow: Heroes, the hero, the Stats tab, + or Auto, Keep, "Stronger already."; back, and to the Hearth by its tab
//   9    1-2, unforced: the goal tracker says "Clear 1-2" and the pointer bobs over Set out; on the road a soft line on 1-1's marker; the
//        battle doesn't stop. Its results' New chip: the Recruit Board is open, then the Hearth
//   10   the Recruit Board's free recruit, hired the same way, who waits at the fire
//   11   Formation (js/formation.js, F3): the two rows, and a hand showing the drag; then Done
//   12   Wick's goodbye: the Sexton, the tolls, the fire
// Then the goal tracker at the Hearth takes over ("Clear 1-3"). The session runs once per save (save.guide: the step
// under way, and done); a reload carries on where it was, and a step whose moment has passed (a battle resolved while
// the app was closed) is skipped. Settings → Replay the guide plays Wick's lines again as soft steps, each when its
// place comes up, holding nothing back (save.guide.replay); while the session runs it does nothing. The Prototype
// panel can skip the session. Tactics come later, at 1-3's first clear (js/visits.js).
// Every step points at a data-tut anchor (or the camp scene's anchors: the board and the road's stage markers), so a
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
  // A thing the camp scene draws, as a box on the stage: the Recruit Board, or a stage's marker on the road.
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
  // the marker of the stage with the card, with its label over it
  const marker = () => {
    const c = camp(), b = c && c.out ? sceneBox(a => a.stage != null && a.stage === c.out.sel) : null, l = b && Wick.boxOf('[data-tut=road-frontier]');
    if (!b || !l) return b;
    const x0 = Math.min(b.x, l.x), y0 = Math.min(b.y, l.y);
    return { x: x0, y: y0, w: Math.max(b.x + b.w, l.x + l.w) - x0, h: Math.max(b.y + b.h, l.y + l.h) - y0 };
  };
  // 1-1's marker, the first stage of the road, while the road shows Region I
  const firstMarker = () => sceneBox(a => a.stage === 0 && a.kind != null);

  // ── the steps. phase: when its part of the session still has a moment (otherwise the step is skipped). skip(): the
  // step isn't needed now (a stat point already spent, a tab already open), so it's passed over.
  // at(): its moment is now. show(done): puts it on screen with Wick.show, and calls done() when it's over.
  // forced: an action of the player's, not a line (no replay). nav: a pointer with no line (no replay). solo: a line
  // for this moment only (no replay). soft: nothing is held back, and a press elsewhere puts it aside until its moment
  // comes again.
  const PHASE = {
    pick: s => !s.roster.length,
    first: s => !lit('1-1') || shown(0) || inBattle(0),
    grow: s => !lit('1-2'),
    road: s => !lit('1-2') || shown(1) || inBattle(1),
    recruit: s => s.roster.length < 2,
    form: () => true,
  };
  const name = () => (st().name || '').trim();
  const who = () => name() || 'Captain';
  const heroName = () => { const c = lead(); return c ? c.name : 'your hero'; };
  const points = () => { const c = lead(); return c && typeof Hero !== 'undefined' ? Hero.points(c).stat : 0; };
  const placing = () => (typeof HeroSheet !== 'undefined' ? HeroSheet.placing : 0);
  const statsTab = () => { const t = q('[data-tut=hero-tab-stats]'); return !!t && t.getAttribute('aria-selected') === 'true'; };
  const onHero = () => App.current === 'hero' && !sheetOpen();
  const onRoad = () => { const c = camp(); return !!c && c.onRoad; };
  // Wick's story at the fire (docs/story.md, the opening), a line a tap
  const STORY = [
    ['hello', 'Another company. Come in. Sit by the fire.'],
    ['inn', 'I’m Wick. I keep the inn here, at the gate.'],
    ['king', 'Fifty years ago, the king over that wall wanted to rule forever.'],
    ['hollow', 'So he learned to raise the dead. When he died, he rose again, hollow.'],
    ['wall', 'His people fled, so he raised their dead to serve him. We walled him in.'],
    ['offer', 'Now the crown has an offer: clear the old road, and keep what you clear.'],
  ];
  const STEPS = [
    // 1: the story, at the fire; Skip goes straight to the name box
    ...STORY.map(([id, line]) => ({ id, phase: 'pick', at: atHearth, show: () => ({ panel: line, skip: () => jump('name') }) })),
    // 2: the name box, the welcome, and the board
    { id: 'name', phase: 'pick', forced: true, at: atHearth, show: nameBox },
    { id: 'welcome', phase: 'pick', at: atHearth, show: () => ({ panel: `${who()}. Welcome to the Hearth. Your company can camp here.` }) },
    { id: 'board', phase: 'pick', at: () => atHearth() && !!board(), show: () => ({ target: board, round: true, pad: 10, side: 'r', say: 'First, you’ll need heroes. The Recruit Board’s there.', tap: 'target', until: () => typeof FirstPick !== 'undefined' && FirstPick.shown }) },
    // 3: the first pick (the board's own panel says Wick's lines, and the new hero says theirs at the reveal)
    { id: 'pick', phase: 'pick', forced: true, at: () => FirstPick.shown, show: () => ({ dim: false, tap: 'none', area: '#sheet .fp', until: () => st().roster.length > 0 && !FirstPick.shown }) },
    // 4–5: the road
    { id: 'setout', phase: 'first', at: atHearth, show: () => ({ target: '[data-tut=hearth-setout]', say: `The road starts at the gate. Take ${heroName()} through.`, tap: 'target', until: onRoad }) },
    { id: 'stage', phase: 'first', at: () => onRoadCard() && !!marker(), show: () => ({ target: marker, round: true, pad: 12, say: 'Each stage is a stretch of road. Win its fight, and the stretch is yours.' }) },
    { id: 'go', phase: 'first', at: onRoadCard, show: () => ({ target: '[data-tut=road-go]', say: 'Clear the first.', tap: 'target', until: () => App.current === 'battle' }) },
    // 6: battle 1-1, paused twice (shown from the battle's events, below)
    { id: 'order', phase: 'first', battle: 0, show: () => ({ target: '[data-tut=turn-order] .flag.in', pad: 4, say: 'Battles fight themselves. The turn order shows who acts next.', small: true, side: 'l', pause: true }) },
    { id: 'speed', phase: 'first', battle: 0, show: () => ({ target: '[data-tut=battle-speed], [data-tut=battle-skip]', pad: 5, say: 'Speed it up, or skip to the end.', small: true, side: 'l', pause: true, tap: 'target' }) },
    // 7: the results popup
    { id: 'xp', phase: 'first', at: () => results(0), show: () => ({ target: '[data-tut=xp]', pad: 5, say: leveled() ? 'Your first level. Each one brings a stat point.' : 'Battles bring XP. A full bar is a level.' }) },
    { id: 'home', phase: 'first', at: () => results(0), show: () => ({ target: '[data-tut=camp]', pad: 4, say: 'Back to the Hearth.', tap: 'target', until: () => App.current === 'home' }) },
    // 8: Grow: the stat point the first level brought, spent on the hero's Stats tab
    { id: 'heroes', phase: 'grow', skip: () => !points(), at: () => atHearth() && points() > 0, show: () => ({ target: '[data-tut=hearth-heroes]', say: `${heroName()} has a stat point. Let’s spend it.`, tap: 'target', until: () => App.current === 'party' }) },
    { id: 'hero', nav: true, phase: 'grow', skip: () => !points(), at: () => App.current === 'party' && !sheetOpen() && !!q('[data-tut=party-hero]'), show: () => { seen('[data-tut=party-hero]'); return { target: () => q('[data-tut=party-hero]'), pad: 3, tap: 'target', until: () => App.current === 'hero' }; } },
    { id: 'stats', nav: true, phase: 'grow', skip: () => !points() || (onHero() && statsTab()), at: () => onHero() && !!q('[data-tut=hero-tab-stats]'), show: () => ({ target: '[data-tut=hero-tab-stats]', pad: 3, tap: 'target', until: statsTab }) },
    { id: 'spend', phase: 'grow', skip: () => !points(), at: () => onHero() && statsTab() && !!q('.hr-stats .hr-plus'), show: () => (seen('.hr-stats'), { target: () => [q('.hr-stats'), q('[data-tut=hero-auto]')], pad: 4, say: 'Tap + on a stat, or Auto to let them choose.', tap: 'target', until: () => placing() > 0 || !points() }) },
    { id: 'keep', nav: true, phase: 'grow', skip: () => !points(), at: () => onHero() && statsTab() && !!q('[data-tut=hero-keep]'), show: () => ({ target: '[data-tut=hero-keep]', pad: 3, tap: 'target', until: () => !points() }) },
    { id: 'strong', solo: true, phase: 'grow', skip: () => App.current !== 'hero', at: () => onHero() && !!q('.hr-stats'), show: () => ({ target: '.hr-stats', pad: 4, arrow: false, say: 'Stronger already.' }) },
    { id: 'heroback', nav: true, phase: 'grow', skip: () => App.current !== 'hero', at: () => onHero() && !!q('[data-tut=hero-back]'), show: () => ({ target: '[data-tut=hero-back]', pad: 3, tap: 'target', until: () => App.current !== 'hero' }) },
    { id: 'tabhome', nav: true, phase: 'grow', skip: () => App.current === 'home', at: () => App.current === 'party' && !sheetOpen() && !!q('[data-tut=tab-home]'), show: () => ({ target: '[data-tut=tab-home]', pad: 2, tap: 'target', until: () => App.current === 'home' }) },
    // 9: 1-2, unforced: the pointer over Set out (it was a glow round it, before play-test note 3.7), a soft line on
    // 1-1's marker, and the battle doesn't stop
    { id: 'setout2', nav: true, soft: true, phase: 'road', skip: () => App.current === 'battle' || shown(1), at: atHearth, show: () => ({ target: '[data-tut=hearth-setout]', dim: false, tap: 'free', until: () => onRoad() || App.current === 'battle' }) },
    // (Wick small, on the left: the card's Set out, bottom right, stays in sight)
    { id: 'yours', solo: true, soft: true, phase: 'road', skip: () => App.current === 'battle' || shown(1), at: () => onRoadCard() && !!firstMarker(), show: () => ({ target: firstMarker, round: true, pad: 10, dim: false, say: 'First stretch cleared. It’s yours now.', small: true, side: 'l', tap: 'free', until: () => App.current === 'battle' }) },
    { id: 'new', phase: 'road', at: () => results(1) && !!q('[data-tut=new]'), show: () => ({ target: '[data-tut=new]', pad: 4, say: 'The Recruit Board is open.' }) },
    { id: 'home2', nav: true, phase: 'road', at: () => results(1), show: () => ({ target: '[data-tut=camp]', pad: 4, tap: 'target', until: () => App.current === 'home' }) },
    // 10: the free recruit
    { id: 'board2', phase: 'recruit', at: () => atHearth() && !!board(), show: () => ({ target: board, round: true, pad: 10, side: 'r', say: 'The board has a free recruit for you.', tap: 'target', until: () => FirstPick.shown }) },
    { id: 'hire', phase: 'recruit', forced: true, at: () => FirstPick.shown, show: () => ({ dim: false, tap: 'none', area: '#sheet .fp', until: () => st().roster.length > 1 && !FirstPick.shown }) },
    // 11: Formation (F3)
    { id: 'form', phase: 'form', at: () => atHearth() && !!q('[data-tut=hearth-formation]'), show: () => ({ target: '[data-tut=hearth-formation]', pad: 4, say: 'Two of you now. Let’s find them a place.', tap: 'target', until: () => Formation.shown }) },
    { id: 'place', phase: 'form', forced: true, at: () => Formation.shown && !!q('[data-tut=formation-front]'), show: placeStep },
    { id: 'done', nav: true, phase: 'form', at: () => Formation.shown && !!q('[data-tut=formation-done]'), show: () => ({ target: '[data-tut=formation-done]', pad: 4, say: 'Well placed.', small: true, side: 'l', tap: 'target', until: () => !Formation.shown }) },
    // 12: the goodbye: the region's end, a reason to come back, and where he'll be
    { id: 'bye', phase: 'form', at: atHearth, show: () => ({ panel: 'The Sexton’s at the end of the Gravefields. Plenty of road before him.' }) },
    { id: 'tolls', phase: 'form', at: atHearth, show: () => ({ panel: 'The road earns tolls while you’re away. Come back and collect.' }) },
    { id: 'fire', phase: 'form', at: atHearth, show: () => ({ panel: 'I’ll be by the fire.' }) },
  ];
  const leveled = () => { const r = Results.res; return !!(r && r.gains && r.gains.some(x => x.g.to > x.g.from)); };
  // a column screen scrolls what Wick points at into view first
  const seen = sel => { const el = q(sel); if (el) try { el.scrollIntoView({ block: 'nearest' }); } catch (e) { } };
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
  // W2: his question, and the name box. OK (or Enter) takes the name; an empty box leaves you "Captain".
  function nameBox(done) {
    const input = h('input', { type: 'text', maxlength: '16', placeholder: 'Your name', autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Your name', value: st().name || '' });
    const take = () => { const v = input.value.replace(/\s+/g, ' ').trim().slice(0, 16); st().name = v; Save.commit(); sfx('click'); if (typeof Camp !== 'undefined') App.refresh(); done(); };
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); take(); } });
    const ok = h('button', { class: 'wk-ok', type: 'button', 'data-tut': 'name-ok', onclick: take }, 'OK');
    const box = h('div', { class: 'wk-name' }, h('div', { class: 'wk-tab', text: 'Your name' }), input, ok);
    setTimeout(() => { try { input.focus({ preventScroll: true }); } catch (e) { } }, 350);
    return { say: 'Who’s in charge?', side: 'l', ui: box, tap: 'none' };
  }

  // ── running it
  let H = null, fight = null, replaying = false, jumped = false, deciding = false, dismissed = null, seenSave = null;
  const on = () => { const s = st(); return !!s && !s.guide.done; };
  const idx = id => STEPS.findIndex(x => x.id === id);
  const safe = fn => { try { return !!fn(); } catch (e) { return false; } };
  // The step under way: the saved one, moved past every step whose moment has gone or that isn't needed.
  function current() {
    const s = st();
    let i = Math.max(0, idx(s.guide.step));
    const pass = () => { while (i < STEPS.length && (!PHASE[STEPS[i].phase](s) || (STEPS[i].skip && safe(STEPS[i].skip)))) i++; };
    pass();
    // a lost battle (1-1 and 1-2 can't be lost, but a save can be odd), or a reload in the middle of Grow: back to
    // where that part starts at the Hearth
    if (STEPS[i] && atHearth() && i > idx('setout') && i <= idx('home') && !lit('1-1')) i = idx('setout');
    if (STEPS[i] && atHearth() && i > idx('heroes') && i <= idx('tabhome')) { i = idx('heroes'); pass(); }
    if (STEPS[i] && atHearth() && i > idx('setout2') && i <= idx('home2') && !lit('1-2')) i = idx('setout2');
    return i;
  }
  function advance(from) {
    const s = st(), i = idx(from) + 1;
    if (i >= STEPS.length) { finish(); App.refresh(); return; }
    s.guide.step = STEPS[i].id;
    Save.commit();
  }
  // Skip, in the story: straight to the name box.
  function jump(id) { const s = st(); if (!s || !on()) return; s.guide.step = id; Save.commit(); jumped = true; if (H) H.close(); jumped = false; }
  function present(step, o) {
    if (!o) return;
    const pause = o.pause && typeof Battle !== 'undefined' && Battle.busy;
    if (pause) Battle.setPaused(true);
    quietSince = 0;
    const forced = !replaying, sv = st();
    H = Wick.show(Object.assign({}, o, {
      onDone: () => {
        H = null;
        if (pause && Battle.busy && Battle.paused) { Battle.play(); if (typeof syncControls === 'function') syncControls(); }
        if (st() !== sv || jumped) return; // another save took this one's place (Start over, the cloud's copy); or Skip
        if (!forced) { const s = st(); if (s.guide.replay) { s.guide.replay[step.id] = 1; Save.commit(); } return; }
        if (!on()) return;
        if (!step.soft) { advance(step.id); return; }
        // a soft step went with a press: once the press has done what it does, it's done (Set out flew up the road), or
        // put aside until its moment comes again
        deciding = true;
        setTimeout(() => {
          deciding = false;
          if (st() !== sv || !on() || st().guide.step !== step.id) return;
          if (o.until && safe(o.until)) advance(step.id); else dismissed = step.id;
        }, 600);
      },
    }));
    H.forced = forced && !step.soft;
  }
  function showStep(step) {
    let o = null;
    const done = () => { if (H) H.next(); };
    o = step.show(done);
    if (replaying && o) { o = Object.assign({}, o, { tap: 'free', pause: false, until: null, ms: o.ms || 9000, ui: null, skip: null }); }
    present(step, o);
  }
  // Every quarter of a second: is it the next step's moment?
  function tick() {
    const s = st();
    // another save took this one's place (Start over, the cloud's copy, another server's): the step on show goes
    if (s !== seenSave) { const was = seenSave; seenSave = s; dismissed = null; if (was && H) { const h0 = H; h0.close(); H = null; } }
    // A forced step up for a save whose session is over goes at once: its gate would hold back every press, and on
    // touch a held-back press loses its tap.
    if (s && H && H.forced && !on()) { H.close(); return; }
    if (!s || H || deciding || titleUp()) return;
    if (!s.guide.done) {
      replaying = false;
      const i = current();
      if (i >= STEPS.length) { advance(STEPS[STEPS.length - 1].id); return; }
      if (STEPS[i].id !== s.guide.step) { s.guide.step = STEPS[i].id; Save.commit(); }
      const step = STEPS[i];
      if (step.battle) return;
      const now = safe(step.at);
      // put aside with a press: back once its moment has gone and come again
      if (dismissed === step.id) { if (!now) dismissed = null; return; }
      dismissed = null;
      if (now) showStep(step);
      return;
    }
    // Replay the guide: each of Wick's lines once more, when its place comes up, holding nothing back
    if (s.guide.replay) {
      replaying = true;
      // the lines, not the forced picks, the pointers from one screen to the next, or a line for one moment only
      const left = STEPS.filter(x => !x.forced && !x.nav && !x.solo && !s.guide.replay[x.id] && x.id !== 'board2');
      if (!left.length) { s.guide.replay = null; Save.commit(); return; }
      const step = left.find(x => !x.battle && safe(x.at));
      if (step) showStep(step);
    }
  }
  setInterval(() => { try { tick(); } catch (e) { console.warn('Lantern Road: the guide', e); } }, 250);
  // Between forced steps nothing takes a press (Wick.show's gate), except during a battle, and in the unforced 1-2 until
  // its results come up. If no step's moment has come for 15 seconds the hold lets go, so a save in a state the script
  // didn't foresee is never stuck.
  let quietSince = 0;
  const FREE = ['setout2', 'yours', 'new'];
  Wick.hold = () => {
    if (!on() || titleUp() || H) { quietSince = 0; return false; }
    if (App.current === 'battle' && typeof Battle !== 'undefined' && Battle.busy) return false;
    if (FREE.includes(st().guide.step) && !shown(1)) { quietSince = 0; return false; }
    if (!quietSince) quietSince = Date.now();
    return Date.now() - quietSince < 15000;
  };

  // The battle's events, as they play (js/guide.js passes them on): 1-1 stops at its first turn for the turn order,
  // and two turns later for speed and skip. 1-2 doesn't stop.
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
  }
  function battleStart(i) { fight = { i, turns: 0 }; }
  function battleEnd() {
    // a step still up when the battle ends (a soft line) goes with it
    if (H && App.current === 'battle' && (H.tap === 'free' || !Battle.busy)) H.close();
  }

  // The session is over: the coach marks and tips it stood in for (js/guide.js, js/main.js) have had their moment.
  // c:rule isn't one: the session no longer says what the turn order's tactic names, so its coach mark does, once.
  const COVERS = ['c:flags', 'c:speed', 'c:board', 'stat'];
  function finish() {
    const s = st();
    s.guide.done = true; s.guide.step = '';
    for (const k of COVERS) if (!s.campaign.tips[k]) s.campaign.tips[k] = Date.now();
    Save.commit();
  }
  // Settings → Replay the guide (nothing while the session runs: Wick is showing you round), and the Prototype panel's
  // Skip the guide.
  function replay() {
    const s = st();
    if (!s) return;
    if (on()) { toast('Wick is showing you round already'); return; }
    s.guide.replay = {}; Save.commit(); toast('Wick will show you round again');
  }
  function skip() { if (!st()) return; if (H) H.close(); Wick.hide(); finish(); }
  // The Recruit Board's tap at the Hearth: the first pick, or the free recruit while the session wants it.
  function boardTap() {
    const s = st();
    if (!s.roster.length) { FirstPick.open({ mode: 'pick', guided: on() }); return true; }
    if (on() && STEPS[current()] && STEPS[current()].id === 'board2') { FirstPick.open({ mode: 'hire', guided: true, rest: true }); return true; }
    return false;
  }
  // covers(key): a first-time tip or coach mark the session says itself, held back while it runs (js/guide.js)
  return { get on() { return on(); }, get step() { const s = st(); return s && !s.guide.done ? s.guide.step : null; }, covers: k => on() && COVERS.includes(k), battleEvent, battleStart, battleEnd, replay, skip, boardTap, STEPS };
})();
