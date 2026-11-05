# Wick's guide and the first session: notes for the builds that follow

From the `guide` builder, branch `claude/guide-2230b2`, base `main` at `b2ef0a6`, 2026-11-04. The script is
`docs/onboarding-spec.md` §6.4 (brought up to date in this branch); screenshots of every step are in `docs/screens/guide/`.

## Where it lives
- `js/wick.js`: the guide's kit. `Wick.show(o)` puts one step on screen and returns its handle (`next()`, `close()`,
  `tap`, `root`): a spotlight on `o.target` (an element, a selector, a function, or a box in stage pixels) with the
  pointer, Wick's bubble (`say`, on the side away from the target) or wide panel (`panel`), `callouts`, a `hand` that
  shows a drag, and `ui` (elements of its own that take taps, like the name box). `o.tap` decides what goes on: `any`
  (a tap anywhere), `target` (only the lit thing takes a press; ends on `until()`), `none` (only `area` takes presses),
  `free` (a soft step: nothing held back, any press ends it). Everything is drawn in `#wk`, a layer over the whole
  `#stage` (z-index 25: over every screen, under the title), in design pixels, and follows its target every frame.
- The gate: capture listeners on `window` hold back every press and key that isn't on the lit thing during a forced
  step, and between forced steps while `Wick.hold()` says so (the first session holds everything but battles; it lets
  go after 15 s with no step, so nothing can be stuck). `[data-wk-free]` elements and an open Prototype panel are
  never held back.
- `js/firstsession.js` (`FirstSession`): the steps, in order, each with a phase (when its part still has a moment),
  `at()` (its moment is now) and `show()` (the `Wick.show` options). A 250 ms tick shows the next step when its
  moment comes; the battle's events come through `Guide.battleEvent` (`FirstSession.battleEvent(e, stage)`). Save:
  `guide.step` (the step under way), `guide.done`, `guide.replay` (the steps seen since Replay the guide), and `name`.
  `FirstSession.skip()`, `.replay()`, `.on`, `.step`, `.boardTap()`.
- `js/firstpick.js` (`FirstPick.open({ mode: 'pick' | 'hire', guided, rest, onDone })`): the Recruit Board's panel
  (Kit.panel) with three cards, Wick's line on each (`FirstPick.CARD`), Hire and the reveal. The first session opens
  it for the free recruit after 1-2 too.
- Styles: `css/guide.css` (`wk-` for the kit, `fp-` for the board).

## Anchors (`data-tut`) the steps hang on
- The Hearth: `hearth-me`, `hearth-goal`, `hearth-heroes`, `hearth-tactics`, `hearth-bag`, `hearth-setout`,
  `hearth-collect`, `hearth-formation`; the road's frontier label `road-frontier`. The board and the lanterns are
  the scene's anchors (`Camp.scene.out.anchors`, ids `board` and `stage`).
- The tab bar: `tab-home`, `tab-map`, `tab-party`, `tab-bag`. The Party screen's formation slots: `party-hero`.
- The hero screen (screen 8, PR #29): `hero-tab-rules` (the Tactics tab), `hero-rules` (the list, always there) and
  `hero-back` (‹, added here). Wick says "tactics"; the anchors keep their names.
- The battle: `turn-order` (#flags), `battle-speed`, `battle-skip`.
- The board: `pick-card`, `pick-hire`, `pick-reveal`; Wick's name box `name-ok`.
- Formation: `formation-auto` and `formation-done` added; the callouts sit on the first places' pads.
- Results: `Results.index` is new (the stage the popup shows).

## Things that changed outside the guide
- `js/data.js`, `js/campaign.js`: a stage's `firstXp` is the least XP its first clear gives, in levels' worth; 1-1
  has 1.05, so the first battle brings level 2 (the spec's tune). The stage sheet's preview counts it.
- `js/base.js`: Wick is out of `RECRUIT_NAMES` (decided in 1.28; `node tools/glossary.js` reads it as done).
- `js/camp.js`: the board stands lit on a new game (the first pick); a tap on it calls `FirstSession.boardTap()`
  first. The goal on a new game is "Recruit your first hero". Your name shows by the Renown. A tap anywhere on the
  party panel opens Formation (between the tiles too). The old first-pick page is gone (`Camp.showPick` opens the
  board's panel).
- `js/app.js`: no "While you were away" and no road card at boot while the session runs; Settings has Replay the
  guide. `js/proto.js`: Skip the guide, while the session runs.
- `js/guide.js`: its coach marks stay quiet while the session runs, and `c:flags`, `c:speed`, `c:rule`, `c:board`
  are marked seen when it ends (Wick said them).
- The checks that build their own saves (`frame_check`, `road_check`, `formation_check`, `results_check`,
  `camp_perf`) call `FirstSession.skip()` first. `tools/playthrough_ui.py` plays the whole session first (the flow
  `guide`), answering each forced step with real touches: Wick's gate holds back the synthetic clicks its `tap()`
  makes, so `tap()` can't be used while the session runs.

## Gotchas
- A check (or any code) that builds a save after the title must end the session with `FirstSession.skip()`: by then
  Wick's first step is already up. Setting `save.guide.done` alone now takes that step down within a quarter of a
  second (the tick closes a forced step whose session is over), but `skip()` does it at once. While a forced step is
  up, a mouse press still clicks through on its pointerup (the step ends there), but a finger's press loses its tap:
  the held-back touchstart cancels the click. That's how PR #31 broke touch taps in `hero_check` and `tactics_check`.
- A forced step's `until()` is checked every frame; a `target` step without one ends at the press's pointerup, before
  the click lands, so give every tap step an `until()`.
- Column screens (Party, the hero sheet) scroll: a step there scrolls its target into view first (`seen()`).
- The Hearth's party panel's tiles have 5 px gaps: a tap there used to do nothing (now it opens Formation).
- In a turned frame a test's drag must lift in design pixels (`tools/guide_check.py`'s `drag`), or it scrolls the
  strip sideways instead of lifting the hero.

## Left for the user
- Keep going: where it would come in is noted in the spec (§6.4, at 1-6). Not decided here.
- Wick's lines are drafts; the board's lines for the Warden, Lamplighter and Crossbowman are new (`FirstPick.CARD`).
