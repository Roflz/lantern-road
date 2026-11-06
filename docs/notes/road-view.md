# The road view: notes for the builds that follow

From the session that built it: PR #25 (https://github.com/Roflz/lantern-road/pull/25), branch
`claude/road-view-c1d7c3`, base `main` (PR #24 had merged). 2026-11-05. It includes the earlier camp session's WIP
drawing commit (e0596fe, as f81de09); the old branch `claude/road-view-02992c` is superseded.

## Using it
- `js/campscene.js` live(): `toRoad(k, instant)`, `toCamp(instant)`, `panTo(k)`, `step(dir)`, `onSnap(k|null)`,
  `sel` (the stage with the card, drawn ringed), `onRoad` (on the road or heading there), `road` (0 fire … 1 road),
  `stage` (u: 0 at the first stage; below 0 the pull home). `dragStart/Move(x, y)` now take y. `out.road`,
  `out.roadTo`, `out.sel` in onFrame. `hit()` on the road returns `{ id: 'stage', stage: k }` and nothing else.
- `js/camp.js`: `ui.toRoad(k)` (the frontier when k is omitted) and `ui.home()`. Camp's own `setOut()` (the dock's
  Set out and the goal chip's Go for "Clear 1-x") now flies up the road when the Hearth is showing.
  `sceneState(s, region)` adds `region`, `stages[].foes` and `gate`.
- **data-tut hooks for Wick's guide:** `road-back` (‹), `stage-card` (the card; a tap opens RoadMap.stageSheet),
  `road-go` (Set out / Farm / Locked). The dock's Set out has no data-tut; select it with `.camp .cv-dock .cv-big`.
- The road HUD is `.cv-roadhud` (visibility hidden off the road); labels are in `.cv-labels`; `.camp.on-road` is set
  while the road shows. The gold you hold is at its top right (`.cv-rgold`, `road-gold`): the dock, with its purse, is
  down while the road shows.
- `RoadMap.setOut(i)` is exported from js/map.js: the big button calls it (Campaign.setOut, rule set, battle).
- **The drag down at the fire** (play-test note 3.14, `claude/hearth-guide-fixes`): a drag at the Hearth goes the way it
  first heads (8 design px). Across turns the camera as before; down, in the party view, pulls the camera up the road
  toward the frontier, following the finger as the pull home does (the same 1.3 stages' worth, mirrored; `lift` in
  `live()`); let go past it, or flick (24 px or more, still moving), and it flies on to the frontier's card, else it
  springs back. Up does nothing. `live.canPull()` can hold it back: js/camp.js does while Wick has a step up or holds
  presses. The camp's scene now cancels its drags' touchmoves: without that Chrome took a flick for a fling and lost
  the next tap (the card's Set out). Checked in `tools/road_check.py`.

## Not built
- Keep going and the come-home chips: deferred to the guide, as decided. They are still on the stage sheet that the
  card opens (from 1-6).
- Region ‹ › cut to the other region (no flight between regions).

## Changes from the mockup (in the PR body for the user)
- A held drag past the boss goes further (UOVER 1.15, ZOVER 300) so the gate's label shows; the mockup never showed it.
- At 694 wide the purse draws in while on the road (`.camp.on-road`), clear of the region's ›.
- A finger that stops before letting go doesn't flick.

## Testing
- `python tools/road_check.py [--sizes …] [--shots docs/screens/road-view]`.
- frame_check.py and playthrough_ui.py follow the road view now (Set out → card → `.cv-roadgo`; Farm via ↓).
