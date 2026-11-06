'use strict';
// Lantern Road · Wick's first session (docs/first-session-spec.md, approved 2026-11-05, with the story in docs/story.md):
// the story, then the basics at the moment they're used. One action a step: a spotlight and a pointer on the one thing
// to tap, Wick's line beside it, and nothing else takes a press (Wick.show's gate, js/wick.js) except Help and
// Settings, which Wick steps aside for. Forced steps use a light dim, or none where they explain a screen.
//   1    the Hearth: Wick tells the story in his panel, a line a tap (Skip jumps to the name box)
//   2    "Who's in charge?" and the name box (none given: "Captain"), his welcome, and the Recruit Board lit
//   3    the Recruit Board's first pick (js/firstpick.js), Free: a line on each of three, Hire, and the reveal
//   4–5  Set out, which flies up the road with 1-1's card open; what a stage is, and the card's Set out
//   6    battle 1-1, paused twice: the turn order, then speed and skip
//   7    the results: the first level, the two pieces of gear 1-1 always drops, and the Hearth
//   8    Heroes, then the hero (js/heroes.js)
//   9    the hero card (js/sheet.js): tap two stats or more to hear what each does (its tooltip), then Next
//   10   Spend, + or Auto, Done: "Stronger already." "Keep levelling. Bigger rewards come later."
//   11   the weapon slot, the new weapon in the dressing, Wear
//   12   the armour, the same way, then ‹ back to the Hearth
//   13   the Recruit Board again: a second recruit, paid from the crown's advance
//   14   the board's hire (js/firstpick.js), who waits at the fire
//   15   Formation (js/formation.js, F3): the two rows, and a hand showing the drag; then Done
//   16   1-2, directed: the pointer over Set out, a soft line on 1-1's marker; nothing is held and nothing stops
//   17   the buildings view opens (save.guide.camp): a hand shows the drag round the camp
//   18   the plots: tap one, its panel says No plans; back to the fire
//   19   Bess's cart rolls up the road (Quests.arrive, js/quests.js): tap her
//   20   her panel: her two lines and the quest card; Accept
//   21   her thanks, and the daily jobs to come
//   22   Wick's goodbye in his panel: full control, and he waits by the fire (his menu, js/wickmenu.js)
// The session runs once per save (save.guide: the step under way, and done). A reload brings the step back from its
// start (play-test note 3.6, checked by tools/guide_check.py --resume): a step on a screen the reload closes starts
// again from the Hearth step that opens it (resume), or opens its screen again (open); a step already done (a point
// spent, a piece worn) is passed over (skip); a battle resolved while the app was closed skips its battle steps.
// After the session, Wick's menu replays each lesson's lines as soft steps (replayLesson), holding nothing back.
// Every step points at a data-tut anchor (or the camp scene's anchors: the board, the plots, Bess, the road's stage
// markers), so a redesigned screen keeps its steps by keeping its anchors.

const FirstSession = (() => {
  const st = () => (typeof Save !== 'undefined' ? Save.state : null);
  const q = sel => document.querySelector(sel);
  const sheetOpen = () => !$('#sheet').hidden;
  const titleUp = () => typeof Title !== 'undefined' && Title.up;
  const lit = id => { const s = st(); return !!s && s.campaign.cleared.includes(id); };
  const lead = () => { const s = st(); return s.roster[0]; };
  // ── where the player is
  const camp = () => (App.current === 'home' && typeof Camp !== 'undefined' ? Camp.scene : null);
  const atCamp = () => { const c = camp(); return !!c && !c.onRoad && c.road < 0.01 && !sheetOpen() && $('#screen').hidden && !!q('.camp [data-tut=hearth-setout]'); };
  // at the fire, in the party view (or turning back to it)
  const atHearth = () => { const c = camp(); return atCamp() && c.w < 0.5; };
  // the buildings view, the camera settled (a flick can carry it on past the view and back: still for 300 ms)
  let wSeen = null, wSince = 0;
  const still = () => { const c = camp(), w = c ? Math.round(c.w * 1000) : null; if (w !== wSeen) { wSeen = w; wSince = Date.now(); return false; } return Date.now() - wSince > 300; };
  const atBuild = () => { const c = camp(); return atCamp() && c.w > 0.95 && still(); };
  const partyView = () => { const c = camp(); return atCamp() && c.w < 0.05; };
  const onRoadCard = () => { const c = camp(); const hud = q('.cv-roadhud'); return !!c && c.onRoad && c.road > 0.99 && !sheetOpen() && !!hud && +getComputedStyle(hud).opacity > 0.95 && !!Wick.boxOf('[data-tut=road-go]'); };
  // the results popup of stage i is up (shown), and its bars have finished filling (results)
  const shown = i => !!(typeof Results !== 'undefined' && sheetOpen() && $('#sheet').classList.contains('results') && Results.res && Results.index === i);
  const results = i => shown(i) && !Results.busy;
  const inBattle = i => App.current === 'battle' && typeof Battle !== 'undefined' && Battle.busy && fight && fight.i === i;
  // A thing the camp scene draws, as a box on the stage: the Recruit Board, a plot, Bess, or a stage's marker.
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
  // the first open plot with nothing on it, in the buildings view
  const emptyPlot = () => { const s = st(), open = Base.plotsCleared(s), k = s.base.plots.findIndex((p, i) => i < open && !p); return k < 0 ? null : sceneBox(a => a.plot === k); };
  // Bess and her cart, standing by the fire
  const bessBox = () => (typeof Quests !== 'undefined' && Quests.here() && !Quests.arriving ? sceneBox(a => a.id === 'bess') : null);

  // ── the hero, their point and their new gear
  const name = () => (st().name || '').trim();
  const who = () => name() || 'Captain';
  const heroName = () => { const c = lead(); return c ? c.name : 'your hero'; };
  const points = () => { const c = lead(); return c && typeof Hero !== 'undefined' ? Hero.points(c).stat : 0; };
  const placing = () => (typeof HeroSheet !== 'undefined' ? HeroSheet.placing : 0);
  const spending = () => typeof HeroSheet !== 'undefined' && HeroSheet.mode === 'spend';
  const dressing = slot => typeof HeroSheet !== 'undefined' && HeroSheet.mode === 'dress' && !!q(`[data-tut=gear-tab-${slot}].on`);
  const onHero = () => App.current === 'hero' && !sheetOpen() && typeof HeroSheet !== 'undefined' && !!lead() && HeroSheet.id === lead().id;
  const onRoad = () => { const c = camp(); return !!c && c.onRoad; };
  // 1-1's two pieces (save.guide.gear, recorded at its first clear), while they wait in the Bag for the lead to wear
  function piece(slot) {
    const s = st(), c = lead(), uid = s.guide.gear && s.guide.gear[slot];
    if (!c || !uid) return null;
    const x = s.inventory.items.find(p => p.uid === uid);
    return x && Items.canUse(c, x) ? x : null;
  }
  const gearLeft = () => !!piece('weapon') || !!piece('armor');
  const pieceEl = slot => { const x = piece(slot); return x ? q(`[data-tut=gear-pick][data-uid="${x.uid}"]`) : null; };
  const worn = slot => { const c = lead(), uid = st().guide.gear && st().guide.gear[slot]; return !!c && !!uid && !!c.gear[slot] && c.gear[slot].uid === uid; };
  // the lead hero's card on the Heroes list (js/heroes.js)
  const leadCard = () => { const c = lead(); return c ? q(`[data-tut=party-hero][data-id="${c.id}"]`) : null; };
  // a step's screen, opened again after a load: the road with the frontier's card; the hero from the Heroes list, so ‹
  // goes back there as it did
  const heroAgain = tab => { const c = lead(); if (!c) return; App.go('party'); App.showCharacter(c.id, tab); };
  // what this session has just done (not saved: after a load, the lines that follow them are passed over)
  const just = { kept: false, weapon: false, armor: false };

  // Wick's story at the fire (docs/story.md, the opening), a line a tap
  const STORY = [
    ['hello', 'Another company. Come in. Sit by the fire.'],
    ['inn', 'I’m Wick. I keep the inn here, at the gate.'],
    ['king', 'Fifty years ago, the king over that wall wanted to rule forever.'],
    ['hollow', 'So he learned to raise the dead. When he died, he rose again, hollow.'],
    ['wall', 'His people fled, so he raised their dead to serve him. We walled him in.'],
    ['offer', 'Now the crown has an offer: clear the old road, and keep what you clear.'],
  ];
  // His goodbye (step 22)
  const BYE = [
    ['bye1', 'That’s the job. The rest is up to you.'],
    ['bye2', 'Not everything’s open yet. The road opens it.'],
    ['bye3', 'Fight, level up, hire more hands. That’s the work.'],
    ['bye4', 'Questions? I’ll be by the fire.'],
  ];

  // ── the steps. phase: when its part of the session still has a moment (otherwise the step is passed over). skip():
  // the step isn't needed now (a point already spent, a piece already worn). at(): its moment is now. show(): its
  // Wick.show options. prep(): called each tick while it's the step under way, before at() (the buildings view opening,
  // Bess's cart rolling in). after(): once it's done, before the next. forced: an action, not a line. nav: a pointer
  // with no line. solo: a line for this moment only. soft: nothing is held back, and a press elsewhere puts it aside
  // until its moment comes again. After a load (which always lands at the Hearth): resume names the Hearth step its part
  // starts again from; open() opens its screen again. rat(): a line's moment when Wick's menu replays it.
  const PHASE = {
    pick: s => !s.roster.length,
    first: s => !lit('1-1') || shown(0) || inBattle(0),
    grow: () => true,
    recruit: s => s.roster.length < 2,
    form: () => true,
    road: s => !lit('1-2') || shown(1) || inBattle(1),
    camp: () => true,
    bess: s => typeof Quests === 'undefined' || !Quests.accepted(s),
    thanks: () => typeof Quests !== 'undefined' && Quests.shown,
    bye: () => true,
  };
  const unplaced = () => { const s = st(); return s.roster.find(c => !s.party.includes(c.id)) || null; };
  const STEPS = [
    // 1: the story, at the fire; Skip goes straight to the name box
    ...STORY.map(([id, line]) => ({ id, phase: 'pick', at: atHearth, rat: atCamp, show: () => ({ panel: line, skip: () => jump('name') }) })),
    // 2: the name box, the welcome, and the board
    { id: 'name', phase: 'pick', forced: true, at: atHearth, show: nameBox },
    { id: 'welcome', phase: 'pick', at: atHearth, show: () => ({ panel: `${who()}. Welcome to the Hearth. Your company can camp here.` }) },
    { id: 'board', phase: 'pick', at: () => atHearth() && !!board(), show: () => ({ target: board, round: true, pad: 10, side: 'r', say: 'First, you’ll need heroes. The Recruit Board’s there.', tap: 'target', until: () => typeof FirstPick !== 'undefined' && FirstPick.shown }) },
    // 3: the first pick (the board's own panel says Wick's lines, and the new hero says theirs at the reveal)
    { id: 'pick', phase: 'pick', forced: true, at: () => FirstPick.shown, open: () => FirstPick.open({ mode: 'pick', guided: true }), show: () => ({ dim: false, tap: 'none', area: '#sheet .fp', until: () => st().roster.length > 0 && !FirstPick.shown }) },
    // 4–5: the road
    { id: 'setout', phase: 'first', at: atHearth, show: () => ({ target: '[data-tut=hearth-setout]', say: `The road starts at the gate. Take ${heroName()} through.`, tap: 'target', until: onRoad }) },
    { id: 'stage', phase: 'first', resume: 'setout', at: () => onRoadCard() && !!marker(), show: () => ({ target: marker, round: true, pad: 12, say: 'Each stage is a stretch of road. Win its fight, and the stretch is yours.' }) },
    { id: 'go', phase: 'first', resume: 'setout', at: onRoadCard, show: () => ({ target: '[data-tut=road-go]', say: 'Clear the first.', tap: 'target', until: () => App.current === 'battle' }) },
    // 6: battle 1-1, paused twice (shown from the battle's events, below)
    { id: 'order', phase: 'first', battle: 0, show: () => ({ target: '[data-tut=turn-order] .flag.in', pad: 4, say: 'Battles fight themselves. The turn order shows who acts now, and who’s next.', small: true, side: 'l', pause: true }) },
    { id: 'speed', phase: 'first', battle: 0, show: () => ({ target: '[data-tut=battle-speed], [data-tut=battle-skip]', pad: 5, say: 'Speed it up, or skip to the end.', small: true, side: 'l', pause: true, tap: 'target' }) },
    // 7: the results: the first level, the two pieces of gear, the Hearth
    { id: 'xp', phase: 'first', at: () => results(0), show: () => ({ target: '[data-tut=xp]', pad: 5, say: leveled() ? 'Your first level. Each one makes them stronger.' : 'Battles bring XP. A full bar is a level.' }) },
    { id: 'loot', phase: 'first', at: () => results(0) && !!q('[data-tut=loot-gear]'), show: () => ({ target: () => [...document.querySelectorAll('[data-tut=loot-gear]')], pad: 4, say: 'Gear, off the road. We’ll put it on.' }) },
    { id: 'home', nav: true, phase: 'first', at: () => results(0), show: () => ({ target: '[data-tut=camp]', pad: 4, say: 'Back to the Hearth.', tap: 'target', until: () => App.current === 'home' }) },
    // 8: Heroes, then the hero: the point the first level brought, or the gear waiting
    { id: 'heroes', phase: 'grow', skip: () => !points() && !gearLeft(), at: atHearth,
      show: () => ({ target: '[data-tut=hearth-heroes]', say: points() ? `${heroName()} has a stat point. Let’s spend it.` : `${heroName()}’s new gear is waiting. Let’s put it on.`, tap: 'target', until: () => App.current === 'party' }) },
    { id: 'hero', nav: true, phase: 'grow', resume: 'heroes', skip: () => !points() && !gearLeft(), at: () => App.current === 'party' && !sheetOpen() && !!leadCard(), show: () => ({ target: leadCard, pad: 3, tap: 'target', until: () => App.current === 'hero' }) },
    // 9: the stats, a tap each to hear what it does (each stat's tooltip), then Next
    { id: 'stats', phase: 'grow', resume: 'heroes', skip: () => !points() || (onHero() && spending()), at: () => onHero() && !spending() && !!q('[data-tut=hero-points]'), rat: onHero, show: statTaps },
    // 10: Spend, + or Auto, Done
    { id: 'spendbtn', nav: true, phase: 'grow', resume: 'heroes', skip: () => !points() || (onHero() && spending()), at: () => onHero() && !!q('[data-tut=hero-points]'), show: () => ({ target: '[data-tut=hero-points]', pad: 3, dim: false, tap: 'target', until: spending }) },
    { id: 'spend', phase: 'grow', resume: 'heroes', skip: () => !points(), at: () => onHero() && spending() && !!q('[data-tut^=hero-plus-]'), rat: onHero,
      show: () => ({ target: () => [q('[data-tut=hero-stats]'), ...document.querySelectorAll('[data-tut^=hero-plus-]')], pad: 4, dim: false, say: 'Tap + on the one you want, or Auto.', tap: 'target', until: () => placing() > 0 || !points() }) },
    { id: 'keep', nav: true, phase: 'grow', resume: 'heroes', skip: () => !points(), at: () => onHero() && spending() && !!q('[data-tut=hero-keep]'), show: () => ({ target: '[data-tut=hero-keep]', pad: 3, dim: false, tap: 'target', until: () => !points() }), after: () => { just.kept = true; } },
    { id: 'strong', solo: true, phase: 'grow', resume: 'heroes', skip: () => !just.kept, at: () => onHero() && !spending() && !!q('[data-tut=hero-stats]'), rat: onHero, show: () => ({ target: '[data-tut=hero-stats]', pad: 4, arrow: false, dim: false, say: 'Stronger already.' }) },
    { id: 'later', solo: true, phase: 'grow', resume: 'heroes', skip: () => !just.kept, at: onHero, rat: onHero, show: () => ({ target: '[data-tut=hero-stats]', pad: 4, arrow: false, dim: false, say: 'Keep levelling. Bigger rewards come later.' }) },
    // 11: the weapon
    { id: 'weapon', phase: 'grow', resume: 'heroes', skip: () => !piece('weapon'), at: () => onHero() && !!q('[data-tut=hero-slot-weapon], [data-tut=gear-tab-weapon]'), rat: onHero,
      show: () => ({ target: () => q('[data-tut=hero-slot-weapon]') || q('[data-tut=gear-tab-weapon]'), pad: 3, dim: false, say: 'Now the gear you found. Weapon first.', tap: 'target', until: () => dressing('weapon') }) },
    { id: 'pickw', phase: 'grow', resume: 'heroes', skip: () => !piece('weapon'), at: () => onHero() && dressing('weapon') && !!pieceEl('weapon'), rat: onHero,
      show: () => ({ target: () => pieceEl('weapon'), pad: 3, dim: false, say: 'Wear it. Watch the numbers.', tap: 'target', until: () => !!q('[data-tut=gear-wear]') }) },
    { id: 'wearw', nav: true, phase: 'grow', resume: 'heroes', skip: () => !piece('weapon'), at: () => onHero() && !!q('[data-tut=gear-wear]'), show: () => ({ target: '[data-tut=gear-wear]', pad: 3, dim: false, tap: 'target', until: () => worn('weapon') }), after: () => { just.weapon = true; } },
    { id: 'worn', solo: true, phase: 'grow', resume: 'heroes', skip: () => !just.weapon, at: onHero, rat: onHero, show: () => ({ target: '[data-tut=hero-stats]', pad: 4, arrow: false, dim: false, say: 'Every piece changes their numbers, and their look.' }) },
    // 12: the armour, then ‹ back to the Hearth
    { id: 'armor', phase: 'grow', resume: 'heroes', skip: () => !piece('armor'), at: () => onHero() && !!q('[data-tut=hero-slot-armor], [data-tut=gear-tab-armor]'), rat: onHero,
      show: () => ({ target: () => q('[data-tut=gear-tab-armor]') || q('[data-tut=hero-slot-armor]'), pad: 3, dim: false, say: 'Now the armour.', tap: 'target', until: () => dressing('armor') }) },
    { id: 'picka', nav: true, phase: 'grow', resume: 'heroes', skip: () => !piece('armor'), at: () => onHero() && dressing('armor') && !!pieceEl('armor'), show: () => ({ target: () => pieceEl('armor'), pad: 3, dim: false, tap: 'target', until: () => !!q('[data-tut=gear-wear]') }) },
    { id: 'weara', nav: true, phase: 'grow', resume: 'heroes', skip: () => !piece('armor'), at: () => onHero() && !!q('[data-tut=gear-wear]'), show: () => ({ target: '[data-tut=gear-wear]', pad: 3, dim: false, tap: 'target', until: () => worn('armor') }), after: () => { just.armor = true; } },
    { id: 'worna', solo: true, phase: 'grow', resume: 'heroes', skip: () => !just.armor, at: onHero, rat: onHero,
      show: () => ({ target: () => [...document.querySelectorAll('[data-tut^=gear-tab-]')].concat(q('[data-tut^=gear-tab-]') ? [] : [...document.querySelectorAll('[data-tut^=hero-slot-]')]), pad: 4, arrow: false, dim: false, say: 'Weapon, armour, accessory. Some pieces cost as much as they give.' }) },
    { id: 'heroback', nav: true, phase: 'grow', resume: 'heroes', skip: () => App.current !== 'hero', at: () => onHero() && !!q('[data-tut=hero-back]'), show: () => ({ target: '[data-tut=hero-back]', pad: 3, tap: 'target', until: () => App.current !== 'hero' }) },
    { id: 'tabhome', nav: true, phase: 'grow', resume: 'heroes', skip: () => App.current === 'home', at: () => App.current === 'party' && !sheetOpen() && !!q('[data-tut=heroes-back]'), show: () => ({ target: '[data-tut=heroes-back]', pad: 3, tap: 'target', until: () => App.current === 'home' }) },
    // 13–14: a second recruit, paid (only the first pick is free)
    { id: 'board2', phase: 'recruit', at: () => atHearth() && !!board(), rat: atCamp, show: () => ({ target: board, round: true, pad: 10, side: 'r', say: 'One hero won’t clear the road. The board has more.', tap: 'target', until: () => FirstPick.shown }) },
    { id: 'hire', phase: 'recruit', forced: true, resume: 'board2', at: () => FirstPick.shown, show: () => ({ dim: false, tap: 'none', area: '#sheet .fp', until: () => st().roster.length > 1 && !FirstPick.shown }) },
    // 15: Formation (F3)
    { id: 'form', phase: 'form', skip: () => !unplaced(), at: () => atHearth() && !!q('[data-tut=hearth-formation]'), rat: atCamp, show: () => ({ target: '[data-tut=hearth-formation]', pad: 4, dim: false, say: 'Two of you now. Let’s find them a place.', tap: 'target', until: () => Formation.shown }) },
    { id: 'place', phase: 'form', forced: true, resume: 'form', skip: () => !unplaced(), at: () => Formation.shown && !!q('[data-tut=formation-front]'), rat: () => Formation.shown, show: placeStep },
    { id: 'done', nav: true, phase: 'form', resume: 'form', skip: () => !Formation.shown, at: () => Formation.shown && !!q('[data-tut=formation-done]'), rat: () => Formation.shown, show: () => ({ target: '[data-tut=formation-done]', pad: 4, say: 'Well placed.', small: true, side: 'l', dim: 'light', arrow: 'below', tap: 'target', until: () => !Formation.shown }) },
    // 16: 1-2, directed: the pointer over Set out, a soft line on 1-1's marker; the battle doesn't stop
    { id: 'setout2', nav: true, soft: true, phase: 'road', skip: () => App.current === 'battle' || shown(1), at: atHearth, show: () => ({ target: '[data-tut=hearth-setout]', dim: false, tap: 'free', until: () => onRoad() || App.current === 'battle' }) },
    // (Wick small, on the left: the card's Set out, bottom right, stays in sight)
    { id: 'yours', solo: true, soft: true, phase: 'road', resume: 'setout2', skip: () => App.current === 'battle' || shown(1), at: () => onRoadCard() && !!firstMarker(), show: () => ({ target: firstMarker, round: true, pad: 4, dim: false, arrow: 'below', say: 'First stretch cleared. It’s yours now.', small: true, side: 'l', tap: 'free', until: () => App.current === 'battle' }) },
    { id: 'home2', nav: true, phase: 'road', at: () => results(1), show: () => ({ target: '[data-tut=camp]', pad: 4, tap: 'target', until: () => App.current === 'home' }) },
    // 17–18: the buildings view opens (save.guide.camp): a drag round the camp, a plot, its panel, and back to the fire
    { id: 'drag', phase: 'camp', at: () => partyView() && camp().locked === false, rat: atCamp, prep: openCamp, show: dragStep },
    { id: 'plots', phase: 'camp', resume: 'drag', at: () => atBuild() && !!emptyPlot(), rat: atBuild,
      show: () => ({ target: emptyPlot, round: true, pad: 8, dim: false, say: 'Each plot takes one building. It needs gold, bone dust and a plan.', tap: 'target', until: () => !!q('#sheet:not([hidden]) .buildbox') }) },
    { id: 'noplans', phase: 'camp', resume: 'drag', at: () => !!q('#sheet:not([hidden]) .buildbox'), rat: () => !!q('#sheet:not([hidden]) .buildbox'),
      show: () => (q('[data-tut=plot-none]') ? { target: '[data-tut=plot-none]', pad: 6, dim: false, say: 'No plans yet. I know someone who can help.' } : { target: '#sheet .buildbox .opts', pad: 4, dim: false, say: 'A plan already. Build it when you like.' }),
      after: () => { closeSheet(); const c = camp(); if (c) c.go('party'); } },
    // 19–21: Bess (js/quests.js): her cart rolls in; her panel, her lines and the quest; Accept; her thanks
    { id: 'bess', phase: 'bess', at: () => partyView() && !!bessBox(), rat: () => atCamp() && !!bessBox(), prep: () => { if (typeof Quests !== 'undefined' && !Quests.here() && partyView()) Quests.arrive(); },
      show: () => ({ target: bessBox, round: true, pad: 8, say: 'That’s Bess. She drives the carts on your road. Hear her out.', tap: 'target', until: () => Quests.shown }) },
    { id: 'offer1', phase: 'bess', at: () => Quests.shown && !!q('.qs-say'), open: () => Quests.open(), rat: () => Quests.shown, show: () => { Quests.say(Quests.LINES.offer[0]); return { target: '.qs-say', pad: 4, arrow: false, dim: 'light' }; } },
    { id: 'offer2', phase: 'bess', at: () => Quests.shown && !!q('[data-tut=quest-card]'), open: () => Quests.open(), rat: () => Quests.shown, show: () => { Quests.say(Quests.LINES.offer[1]); return { target: '[data-tut=quest-card]', pad: 4, dim: 'light' }; } },
    { id: 'accept', nav: true, phase: 'bess', at: () => Quests.shown && !!q('[data-tut=quest-accept]'), open: () => Quests.open(), show: () => ({ target: '[data-tut=quest-accept]', pad: 4, tap: 'target', until: () => Quests.accepted() }) },
    { id: 'thanks1', phase: 'thanks', resume: 'bye1', at: () => Quests.shown && !!q('.qs-say'), rat: () => Quests.shown, show: () => { Quests.say(Quests.LINES.accepted); return { target: '.qs-say', pad: 4, arrow: false, dim: 'light' }; } },
    { id: 'thanks2', phase: 'thanks', resume: 'bye1', at: () => Quests.shown && !!q('.qs-say'), rat: () => Quests.shown, show: () => { Quests.say(Quests.LINES.jobsSoon); return { target: '.qs-say', pad: 4, arrow: false, dim: 'light' }; }, after: () => Quests.close() },
    // 22: the goodbye; then full control
    ...BYE.map(([id, line]) => ({ id, phase: 'bye', at: atHearth, rat: atCamp, show: () => ({ panel: line }) })),
  ];
  const leveled = () => { const r = Results.res; return !!(r && r.gains && r.gains.some(x => x.g.to > x.g.from)); };
  const fresh = () => unplaced() || st().roster[st().roster.length - 1];
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
  // 9: each stat (and the resistances) answers a tap with its tooltip, the line on what it does (js/sheet.js); after
  // two or more, Next. Only the stats take a press.
  function statTaps() {
    const seen = new Set();
    const tapped = ev => {
      const el = ev.target && ev.target.closest && ev.target.closest('.hr-stats [data-tut^=hero-stat-], [data-tut^=hero-stat-res]');
      if (!el || !el.dataset.tip) return;
      seen.add(el.dataset.tut);
      // a click with the mouse hides the tooltip its hover showed (js/tip.js): it comes back for the tap
      setTimeout(() => { if (el.isConnected) Tip.show(el, () => String(el.dataset.tip).split('|')); }, 0);
    };
    document.addEventListener('click', tapped, true);
    return {
      target: () => [...document.querySelectorAll('.hr-stats [data-tut^=hero-stat-]')], pad: 4, dim: false, side: 'r',
      say: 'Each level brings a stat point. Tap a stat to hear what it does.',
      tap: 'none', area: () => [...document.querySelectorAll('.hr-stats [data-tut^=hero-stat-], [data-tut^=hero-stat-res]')],
      next: { label: 'Next', when: () => seen.size >= 2 },
      cleanup: () => { document.removeEventListener('click', tapped, true); Tip.hide(); },
    };
  }
  // 17: the buildings view opens, with nothing to build yet (Base.viewOpen), and a hand shows the drag
  function openCamp() {
    const s = st();
    if (s.guide.camp) return;
    s.guide.camp = true; Save.commit();
    App.refresh();
  }
  function dragStep() {
    // the scene, clear of the HUD round it: the drag starts there (camp.js keeps the scene's taps for it: dragOnly)
    const zone = () => ({ x: 120, y: 156, w: Math.max(200, Frame.W - 360), h: 166 });
    return {
      target: zone, arrow: false, dim: false, side: 'l', say: 'Companies that stay, build. Drag to look round the camp.',
      hand: { from: () => { const z = zone(); return { x: z.x + z.w - 40, y: z.y + 80, w: 1, h: 1 }; }, to: () => { const z = zone(); return { x: z.x + 40, y: z.y + 80, w: 1, h: 1 }; } },
      // (once the finger lifts: between steps its pointerup would be held back, and the scene would think it still down)
      tap: 'none', until: () => { const c = camp(); return !!c && c.w > 0.95 && !Camp.dragging; },
    };
  }

  // ── running it
  let H = null, showing = null, fight = null, replaying = false, jumped = false, deciding = false, dismissed = null, seenSave = null;
  let lesson = null; // Wick's menu: { L (the lesson), k (its line under way), since, where (the screen it's on) }
  const on = () => { const s = st(); return !!s && !s.guide.done; };
  const idx = id => STEPS.findIndex(x => x.id === id);
  const safe = fn => { try { return !!fn(); } catch (e) { return false; } };
  // The step under way: the saved one, moved past every step whose moment has gone or that isn't needed; and one whose
  // screen is gone (it's at the Hearth instead) goes back to where its part starts there.
  function current() {
    const s = st();
    let i = Math.max(0, idx(s.guide.step));
    const pass = () => { while (i < STEPS.length && (!PHASE[STEPS[i].phase](s) || (STEPS[i].skip && safe(STEPS[i].skip)))) i++; };
    pass();
    const S = STEPS[i];
    if (S && S.resume && atHearth() && !safe(S.at) && idx(S.resume) !== i) { i = idx(S.resume); pass(); }
    // a lost battle (1-1 can't be lost, but a save can be odd): back to Set out
    if (STEPS[i] && atHearth() && i > idx('setout') && i <= idx('home') && !lit('1-1')) i = idx('setout');
    return i;
  }
  function advance(from) {
    const s = st(), i = idx(from) + 1;
    if (i >= STEPS.length) { finish(); App.refresh(); return; }
    s.guide.step = STEPS[i].id;
    Save.commit();
  }
  // After a load (the app opened again, a reload, another save): the step under way comes back from its start. A load
  // lands at the Hearth, so a step whose screen the load closed goes back to the Hearth step that opens it (resume), or
  // opens its screen again (open). Returns false while it waits for the Hearth (5 seconds at most).
  let resuming = false, resumeAt = 0;
  function resumed(s) {
    let step = STEPS[idx(s.guide.step)];
    const done = () => { resuming = false; return true; };
    // nothing to bring back: no step yet, its part is over, or its screen is up already
    if (!step || !PHASE[step.phase](s) || safe(step.at)) return done();
    if (!atCamp()) { if (!resumeAt) resumeAt = Date.now(); return Date.now() - resumeAt < 5000 ? false : done(); }
    if (step.resume) { s.guide.step = step.resume; Save.commit(); step = STEPS[idx(step.resume)]; }
    else if (step.open && !safe(step.at)) { try { step.open(); } catch (e) { console.warn('Lantern Road: the guide could not open its screen again', step.id, e); } }
    return done();
  }
  // Skip, in the story: straight to the name box.
  function jump(id) { const s = st(); if (!s || !on()) return; s.guide.step = id; Save.commit(); jumped = true; if (H) H.close(); jumped = false; }
  function present(step, o) {
    if (!o) return;
    const pause = o.pause && typeof Battle !== 'undefined' && Battle.busy;
    if (pause) Battle.setPaused(true);
    quietSince = 0;
    const forced = !replaying, sv = st();
    showing = step.id;
    H = Wick.show(Object.assign({}, o, {
      onDone: () => {
        H = null; showing = null;
        if (o.cleanup) { try { o.cleanup(); } catch (e) { } }
        if (pause && Battle.busy && Battle.paused) { Battle.play(); if (typeof syncControls === 'function') syncControls(); }
        if (st() !== sv || jumped) return; // another save took this one's place (Start over, the cloud's copy); or Skip
        if (!forced) { if (lesson) { lesson.k++; lesson.since = Date.now(); } return; }
        if (!on()) return;
        if (!step.soft) { if (step.after) { try { step.after(); } catch (e) { } } advance(step.id); return; }
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
    const done = () => { if (H) H.next(); };
    let o = step.show(done);
    if (replaying && o) {
      if (o.cleanup) { try { o.cleanup(); } catch (e) { } }
      o = Object.assign({}, o, { tap: 'free', pause: false, until: null, ms: o.ms || 9000, ui: null, skip: null, next: null, cleanup: null });
    }
    present(step, o);
  }
  // Every quarter of a second: is it the next step's moment?
  function tick() {
    const s = st();
    // another save took this one's place (Start over, the cloud's copy, another server's): the step on show goes
    if (s !== seenSave) { const was = seenSave; seenSave = s; dismissed = null; lesson = null; resuming = !!s; resumeAt = 0; just.kept = just.weapon = just.armor = false; if (was && H) { const h0 = H; h0.close(); H = null; } }
    // A forced step up for a save whose session is over goes at once: its gate would hold back every press, and on
    // touch a held-back press loses its tap.
    if (s && H && H.forced && !on()) { H.close(); return; }
    if (!s || H || deciding || titleUp()) return;
    if (!s.guide.done) {
      if (resuming && !resumed(s)) return;
      replaying = false;
      const i = current();
      if (i >= STEPS.length) { advance(STEPS[STEPS.length - 1].id); return; }
      if (STEPS[i].id !== s.guide.step) { s.guide.step = STEPS[i].id; Save.commit(); }
      const step = STEPS[i];
      if (step.battle) return;
      if (step.prep) { try { step.prep(); } catch (e) { } }
      const now = safe(step.at);
      // put aside with a press: back once its moment has gone and come again
      if (dismissed === step.id) { if (!now) dismissed = null; return; }
      dismissed = null;
      if (now) showStep(step);
      return;
    }
    // Wick's menu: a lesson's lines once more, each when its place comes up, holding nothing back
    if (lesson) {
      const L = lesson.L;
      // over after its last line, or once the player leaves the screen it was on
      if (lesson.k >= L.steps.length || (lesson.where && App.current !== lesson.where)) { lesson = null; return; }
      const step = STEPS[idx(L.steps[lesson.k])];
      if (step.battle) return; // shown from the battle's events
      replaying = true;
      if (safe(step.rat || step.at)) { lesson.where = lesson.where || App.current; showStep(step); }
      else if (Date.now() - lesson.since > 30000) lesson = null; // its moment never came: the replay ends
    }
  }
  setInterval(() => { try { tick(); } catch (e) { console.warn('Lantern Road: the guide', e); } }, 250);
  // Between forced steps nothing takes a press (Wick.show's gate), except during a battle, and in the directed 1-2 until
  // its results come up. If no step's moment has come for 15 seconds the hold lets go, so a save in a state the script
  // didn't foresee is never stuck.
  let quietSince = 0;
  const FREE = ['setout2', 'yours'];
  Wick.hold = () => {
    if (!on() || titleUp() || H) { quietSince = 0; return false; }
    if (App.current === 'battle' && typeof Battle !== 'undefined' && Battle.busy) return false;
    if (FREE.includes(st().guide.step) && !shown(1)) { quietSince = 0; return false; }
    if (!quietSince) quietSince = Date.now();
    return Date.now() - quietSince < 15000;
  };

  // The battle's events, as they play (js/guide.js passes them on): 1-1 stops at its first turn for the turn order,
  // and two turns later for speed and skip. 1-2 doesn't stop. Wick's menu's Battles lesson says them in the next battle.
  function battleEvent(e, i) {
    const s = st();
    if (!s) return;
    if (!fight || fight.i !== i) fight = { i, turns: 0 };
    if (e.t === 'turn') fight.turns++;
    const step = on() ? STEPS[current()] : null;
    if (H) return;
    const want = id => (on() ? step && step.id === id : !!lesson && lesson.L.steps[lesson.k] === id);
    replaying = !on();
    if (e.t === 'turn' && fight.turns === 1 && want('order') && (i === 0 || replaying)) setTimeout(() => { if (!H && Battle.busy) showStep(STEPS[idx('order')]); }, 450);
    else if (e.t === 'turn' && fight.turns === 3 && want('speed') && (i === 0 || replaying)) setTimeout(() => { if (!H && Battle.busy) showStep(STEPS[idx('speed')]); }, 200);
  }
  function battleStart(i) { fight = { i, turns: 0 }; }
  function battleEnd() {
    // a step still up when the battle ends (a soft line) goes with it
    if (H && App.current === 'battle' && (H.tap === 'free' || !Battle.busy)) H.close();
  }
  // 1-1's first clear: its two pieces, for steps 11–12 (save.guide.gear)
  if (typeof Campaign !== 'undefined' && Campaign.onSettle) Campaign.onSettle((r, stage, res, s) => {
    if (!s || !s.guide || s.guide.done || !r || !r.first || !stage.firstGear) return;
    const g = {};
    for (const x of r.gear) if (x.why === 'first' && !x.sold) g[Items.def(x.piece).slot] = x.piece.uid;
    s.guide.gear = g;
  });

  // The session is over: the coach marks and tips it stood in for (js/guide.js, js/main.js) have had their moment, and
  // the buildings view is open.
  const COVERS = ['c:flags', 'c:speed', 'c:board', 'stat'];
  function finish() {
    const s = st();
    s.guide.done = true; s.guide.step = ''; s.guide.camp = true;
    for (const k of COVERS) if (!s.campaign.tips[k]) s.campaign.tips[k] = Date.now();
    Save.commit();
  }
  function skip() { if (!st()) return; if (H) H.close(); Wick.hide(); finish(); }
  // The Recruit Board's tap at the Hearth: the first pick, or the paid hire while the session wants it.
  function boardTap() {
    const s = st();
    if (!s.roster.length) { FirstPick.open({ mode: 'pick', guided: on() }); return true; }
    if (on() && STEPS[current()] && STEPS[current()].id === 'board2') { FirstPick.open({ mode: 'hire', guided: true, rest: true }); return true; }
    return false;
  }

  // ── Wick's menu's lessons (docs/first-session-spec.md §3): the session's lines by lesson, each replayed as soft steps,
  // each when its place comes up, from the screen it opens. A visit's lesson replays the visit (js/visits.js).
  const goHome = () => { if (App.current !== 'home') App.go('home'); };
  const LESSONS = [
    { id: 'story', name: 'The story', icon: 'kindle', steps: STORY.map(x => x[0]), open: goHome },
    { id: 'road', name: 'The road', icon: 'boot', steps: ['setout', 'stage', 'go'], open: goHome },
    { id: 'battles', name: 'Battles', icon: 'sword', steps: ['order', 'speed'], open: goHome },
    { id: 'levels', name: 'Levels and stats', icon: 'star', steps: ['stats', 'spend', 'strong', 'later'], open: () => heroAgain() },
    { id: 'gear', name: 'Gear', icon: 'bag', steps: ['weapon', 'pickw', 'worn', 'armor', 'worna'], open: () => heroAgain() },
    { id: 'recruiting', name: 'Recruiting', icon: 'scroll', steps: ['board2'], open: goHome },
    { id: 'formation', name: 'Formation', icon: 'shield', steps: ['form', 'place', 'done'], open: goHome },
    { id: 'buildings', name: 'Buildings', icon: 'plus', steps: ['drag', 'plots', 'noplans'], open: goHome },
    { id: 'quests', name: 'Quests', icon: 'scroll', steps: ['bess', 'offer1', 'offer2', 'thanks1', 'thanks2'], open: goHome },
  ];
  // The lessons seen so far: the session's (all of them once it's over; while it runs, those it has passed).
  function lessons() {
    const s = st();
    if (!s) return [];
    const at = s.guide.done ? STEPS.length : idx(s.guide.step);
    return LESSONS.filter(L => idx(L.steps[0]) < at).map(L => ({ id: L.id, name: L.name, icon: L.icon }));
  }
  function replayLesson(id) {
    const L = LESSONS.find(x => x.id === id), s = st();
    if (!L || !s || on()) return false;
    if (H) H.close();
    Wick.hide();
    lesson = { L, k: 0, since: Date.now() };
    try { L.open(); } catch (e) { }
    return true;
  }

  // covers(key): a first-time tip or coach mark the session says itself, held back while it runs (js/guide.js)
  return {
    get on() { return on(); }, get step() { const s = st(); return s && !s.guide.done ? s.guide.step : null; },
    // the drag round the camp (step 17) is up: the scene's taps wait (js/camp.js), so a tap can't open what it lands on
    get dragOnly() { return showing === 'drag' && !replaying; },
    get replaying() { return !!lesson; },
    covers: k => on() && COVERS.includes(k), battleEvent, battleStart, battleEnd, skip, boardTap, lessons, replayLesson, LESSONS, STEPS,
  };
})();
