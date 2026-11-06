# Wick's guide and the first session: notes for the builds that follow

From the `guide` builder, branch `claude/guide-2230b2`, base `main` at `b2ef0a6`, 2026-11-04. The script was
`docs/onboarding-spec.md` §6.4; since `claude/first-session` (below) it is `docs/first-session-spec.md`. Screenshots of
every step are in `docs/screens/guide/`.

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
  `guide.step` (the step under way), `guide.done`, `guide.camp` (the buildings view is open), `guide.gear` (1-1's
  pieces), `guide.offer` (the first pick's three), and `name`. `FirstSession.skip()`, `.on`, `.step`, `.boardTap()`,
  `.dragOnly`, `.lessons()`, `.replayLesson(id)`.
- `js/wickmenu.js` (`WickMenu`): his menu at the fire once the session is over (below).
- `js/firstpick.js` (`FirstPick.open({ mode: 'pick' | 'hire', guided, rest, onDone })`): the Recruit Board's panel
  (Kit.panel) with three cards, Wick's line on each (`FirstPick.CARD`), Hire and the reveal. The first session opens
  it for the second recruit too, which is paid (only the first pick is free, `docs/first-session-spec.md` §5).
- Styles: `css/guide.css` (`wk-` for the kit, `fp-` for the board), `css/wick.css` (`wm-`, his menu).

## The first session rebuilt (branch `claude/first-session`, 2026-11-05)
The script is `docs/first-session-spec.md` (approved 2026-11-05 with every recommendation in its §6), on the rules of
`claude/session-rules` (300 gold to start, only the first pick free, the board open at 1-1, 1-1's two Fine pieces, 1-2
with two heroes, no blueprint before the Sexton). Screenshots of every step are in `docs/screens/guide/`.
- **The steps** (`STEPS` in `js/firstsession.js`, the spec's 22 in 57 ids): the story (`hello` … `offer`), `name`,
  `welcome`, `board`, `pick`; `setout`, `stage`, `go`; `order`, `speed`; the results' `xp`, `loot` (the two gear tiles,
  `loot-gear`) and `home`; `heroes`, `hero`; `stats` (step 9: tap two stats or more, each answers with its tooltip, then
  Next); `spendbtn`, `spend`, `keep`, `strong`, `later`; the gear's `weapon`, `pickw`, `wearw`, `worn`, `armor`,
  `picka`, `weara`, `worna`, then `heroback`, `tabhome`; `board2` and `hire` (paid); `form`, `place`, `done`; the
  directed 1-2's `setout2`, `yours`, `home2`; the buildings' `drag`, `plots`, `noplans`; Bess's `bess`, `offer1`,
  `offer2`, `accept`, `thanks1`, `thanks2`; the goodbye's `bye1` … `bye4`.
- **A step** has `phase`, `at()`, `show()`, and may have `skip()` (its work is done: a point spent, a piece worn),
  `prep()` (each tick while it's the step under way: `drag` opens the buildings view, `save.guide.camp`; `bess` calls
  `Quests.arrive()` once the camera is at the fire), `after()` (once done: `noplans` closes the panel and turns back
  to the fire; `thanks2` closes Bess's panel), `resume` (the Hearth step its part starts again from after a load, the
  spec's "Resume at"), `open()` (its screen, opened again after a load: the first pick, Bess's panel) and `rat()` (its
  moment when Wick's menu replays it). Forced steps that explain a screen use no dim.
- **Resume:** a load lands at the Hearth; `resumed()` moves a step with `resume` back there, or opens a step's screen
  with `open`, and `current()` passes over every step whose part is over or whose work is done. Lines that only follow
  an action of this sitting (`strong`, `later`, `worn`, `worna`) are passed over after a load (`just`, not saved).
  `tools/guide_check.py --resume` checks every moment against its `RESUME` table.
- **1-1's pieces:** `Campaign.onSettle` records the uids of 1-1's first-clear pieces in `save.guide.gear`
  (`{ weapon, armor }`); the gear steps point at them in the dressing (`gear-pick[data-uid]`), and pass over a piece
  already worn or gone. The first pick's three are kept in `save.guide.offer`, so a reload shows the same three.
- **Bess:** the session brings her (`Quests.arrive()` at `bess`). Her own fallback in `js/quests.js` (after 1-2, once
  `guide.done`) only serves a save that skipped the session or finished it before her; `come()` keeps her from coming
  twice. Her lines are said into her own bubble (`Quests.say`); the steps on her panel have no bubble of Wick's.
- **Wick.show** has `next: { label, when() }`: a Next button in his bubble (`wick-next`), shown once `when()` holds.
- **The drag round the camp** (`drag`): the scene's taps wait while it's up (`FirstSession.dragOnly`, read by
  `tapAt` in `js/camp.js`), so a tap can't open the board or a plot mid-step; the hole is the scene clear of the HUD.
  It ends only once the finger lifts (`Camp.dragging`): between steps the gate holds a pointerup back, and the scene
  would think the finger still down and turn with the next move. The plots wait for the camera to settle (`still()`).
- **Wick's menu** (`js/wickmenu.js`, `WickMenu.open()`, styles `wm-` in `css/wick.css` with Bess's panel's `qs-`
  layout): a tap on Wick at the fire once the session is over. His hint (`WickMenu.hint(s)`, the first of §3's list that
  fits), the lessons seen (`FirstSession.lessons()`: nine, then each visit seen and Daily jobs) and the Codex. A lesson
  closes the panel and replays its lines as soft steps (`FirstSession.replayLesson(id)`), each when its `rat()` holds,
  from the screen it opens; it ends after its last line or once that screen is left. Battles' lines wait for the next
  battle. Settings → Wick's lessons opens the menu (it was Replay the guide; `save.guide.replay` is gone).
- **The moved lessons** (§2): skill points are a visit when any hero first reaches level 5 (`VISITS.skills` in
  `js/visits.js`: the tree, then a skill slot); the first building is a visit once Bess's quest brings the Toll House's
  plan (`VISITS.plan`, on an empty plot; `Quests.onChange` says `'plan'`); the tolls are a first-time line of Wick's on
  the first "While you were away" sheet with tolls (`campaign.tips['away:tolls']`, `away-tolls`).
- **Old saves** (`MIGRATIONS[10]` in `js/save.js`): a save past the session keeps playing (its buildings view opened by
  version 9); one part-way through the old script goes on under the new one from the nearest step (Grow's steps and
  the old 1-2 to `heroes`, after which the gear, the paid hire and Formation pass over what's done; the old goodbye to
  `drag`); a hero already at level 5 or more has met skill points.
- **Anchors added:** `loot-gear` (results), `wick-next`, `plot-none` (the empty plot's No plans), `wick-lesson`
  (`data-id`), `wick-codex`, `away-tolls`, `road-gold`; the Resistances plate has a tooltip (step 9 taps it).

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
- `js/app.js`: no "While you were away" and no road card at boot while the session runs; Settings has Wick's lessons
  (his menu; it was Replay the guide). `js/proto.js`: Skip the guide, while the session runs.
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
  strip sideways instead of lifting the hero. A drag round the camp mustn't lift (`lift=False`): at the fire a drag
  goes the way it first heads, and up does nothing.
- `FirstSession.skip()` opens the buildings view (`guide.camp`), as the session's end does: a check of the locked
  camera sets `Save.state.guide.camp = false` after it (`tools/frame_check.py`, `tools/board_check.py`).

## Left for the user
- Keep going: where it would come in is noted in the spec (§6.4, at 1-6). Not decided here.
- Wick's lines are drafts; the board's lines for the Warden, Lamplighter and Crossbowman are new (`FirstPick.CARD`).
