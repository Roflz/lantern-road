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
  it for the second recruit too, which is paid (only the first pick is free, `docs/first-session-spec.md` §5).
- Styles: `css/guide.css` (`wk-` for the kit, `fp-` for the board).

## Since the 2026-11-05 play-test (branch `claude/hearth-guide-fixes`)
- **No ring (3.7).** The spotlight is only a clear hole in the dim; the pointer marks the target. Every step keeps its
  pointer (1-2's Set out and the soft line on 1-1's marker had only the ring's glow, and now show the pointer). DOM
  buttons get a rounded box (`round` is for things drawn in the scene: the board, a stage's marker).
- **The dim (3.8)** is two CSS variables on `#wk` in `css/guide.css`: `--wk-dim` (.36, half the old .66–.72) for a
  step that asks for one tap or has no target, and `--wk-dim-light` (.1) for one that explains what it lights. Wick.show
  picks: light when the step has callouts or a hand, or a target it doesn't ask a tap on (`tap` other than `target`).
  A step can say `dim: 'light' | 'full' | false | <number>`. Formation's F3 step stays at `dim: false`; Done is `'light'`.
- **Resume (3.6).** `save.guide.step` is committed as each step starts. A load always lands at the Hearth (a battle under
  way is resolved at boot, js/main.js). On the first tick after the title, `resumed()` in js/firstsession.js brings the
  saved step back from its start: a step on another screen has `open()` (the road via `Camp.toRoad()`, the board's
  panel via `FirstPick.open`, the Party screen, the hero via Party, Formation), and Keep has `resume: 'spend'` (a point
  placed and not kept is gone). Steps whose moment passed are passed over by `current()` as before: 1-1's and 1-2's
  battles and results (they resume at Grow's Heroes and the free recruit's board), and the ways back to the Hearth (‹,
  the Hearth tab). `python tools/guide_check.py --resume` opens the save in a new page at every step and checks it.
  A rewrite of the first session keeps this by giving each step on another screen an `open()`, and each step whose
  start lives only in memory a `resume`.
- **The drag down to the road** (3.14, docs/notes/road-view.md) waits while a step is up or the guide holds presses
  (`live.canPull` in js/camp.js), so a press let through to the lit board can't fly the camera away mid-step.

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
