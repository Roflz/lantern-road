# Code map

What is current, what is legacy, and which docs are out of date. Checked against `main` at `4e5a287` on 2026-11-04.
Since then: the road view and Formation (screen 5) are being built, and the guide comes next. Update this file in the PR
that changes a screen.

**The short version:** battles are landscape and side-on, with heroes on the left and foes on the right. The Hearth is
`js/campscene.js` + `js/camp.js`. Every other screen still has its old portrait layout, shown in a centred column
(`#frame.column`) until it is redesigned. If code draws heroes below and foes above, it is not the battle (see Legacy).

## Screens

| Screen | Files | State |
|---|---|---|
| 1 Title, servers, the landscape frame | `js/title.js`, `css/title.css`, `js/frame.js`, `#stage`/`#frame` in `css/game.css`, servers in `js/save.js` | Redesigned (PR #21) |
| 2 The Hearth (camp) | `js/campscene.js` (the scene), `js/hearthart.js` (its buildings and props, drawn in code), `js/camp.js` (the screen: HUD, the dock, plaques, taps, formation), `js/dockart.js` (the dock's menu objects and the board's picture), `js/tip.js` (tooltips), `css/camp.css` (`cv-`) | Redesigned (PR #24); the scene's detail pass from `hearth.html` (phase A: the art, the terrace, the Old Beacon); the dock along the bottom (`docs/mockups/hearth-dock.html`, 2026-11-05: gold and materials, Set out, the menus as drawn things), checked by `tools/board_check.py` |
| 3 The first pick | `js/firstpick.js` (`FirstPick`), on the Recruit Board's panel (`RecruitBoard` in `js/buildings.js`); `css/board.css` (`rb-`, `fp-`) | Redesigned: the board's panel with Free tags and Wick (`docs/mockups/recruit-board.html`, First pick); checked by `tools/board_check.py` and `tools/guide_check.py` |
| 4 The Road and the stage sheet | `js/map.js`, `css/map.css` | Old layout, in the column; the road view is being built (`docs/mockups/road-view.html`) |
| 5 Formation and the Party screen | `screen('party')` in `js/app.js`; `.prow`, `.pslot`, `.rrow` in `css/app.css`; roster rows (`App.actions.rosterRow`) in `js/camp.js` | Old layout; Formation is being built |
| 6 Battle | `js/battle.js` (drawing, the event log's playback), `js/main.js` (controls, trips, the report, tips), `css/game.css` | Landscape since the overnight build; Pause and the turn order checked by `tools/battle_check.py` |
| 7 Results popup | `js/results.js`, `css/results.css`, `showResults` in `js/main.js` | Redesigned (PR #23) |
| 8 The hero card | `js/sheet.js` (`HeroSheet`, the `'hero'` screen, and `Tip`, the tooltips), `js/stage.js` (the sprite stage), `css/hero.css` (`hr-`, and the card kit `hc-` the Bag and the Heroes list share), the tall card and the piece's card in `js/bag.js` (`GearUI.tall`, `GearUI.pieceLines`) and `css/gear.css` (`gc-`, `pc-`) | Redesigned again as one page (`docs/mockups/hero-card.html`, D1, approved 2026-11-05, to `docs/ui-rules.md`); checked by `tools/hero_check.py` |
| 9 The Bag and the item card | `js/bag.js`, `css/gear.css` | Old layout; star pips on the tiles and the card, and the enchantment lines' band (the gear study, step 1) |
| 10 Buildings | `js/buildings.js`, `css/base.css`; the Recruit Board's panel is `RecruitBoard` (end of `js/buildings.js`), `css/board.css` (`rb-`) | Old layout, but the Recruit Board: redesigned (`docs/mockups/recruit-board.html`, 2026-11-05: the stagecoach rows, the confirmation, the reveal, the Upgrades tab; the recruit's card is a placeholder until the new hero card); checked by `tools/board_check.py` |
| 11 Tactics | `js/rules.js` (`Tactics`, the model, and `TacticsEditor`, the `'tactics'` screen), `css/rules.css` (`tx-`) | Redesigned (`docs/mockups/tactics.html`, 1.35); checked by `tools/tactics_check.py` |
| 12 Settings, help | `openSettings` in `js/app.js`; "How battles work" (`showHow`) in `js/main.js` | Old layout; opened from the Hearth's dock: Settings is the candle, Help the Codex's book |
| — Wick and his guide | `js/wick.js` (his portrait, and the guide's kit: `Wick.show`), `js/firstsession.js` (the first session), `js/visits.js` (his unlock visits: the card at the Hearth and Show me), `js/firstpick.js` (the Recruit Board's first pick, on the board's panel), `css/wick.css`, `css/guide.css` (`wk-`) | Built (PR #31); rebuilt around the story, with the 1-3 visit (PR #35); checked by `tools/guide_check.py` (`--resume`: the app opened again at every step) |
| — Bess and her quests | `js/quests.js` (the model: the story quest and the daily jobs; her panel, her new-jobs card, the goal tracker's quest line and her arrival), `js/bessart.js` (her cart, mule, sprite and portrait, drawn in code), Bess in the scene in `js/campscene.js` (`bess()`), hooks in `js/camp.js` (`sceneState`, the chip, the tap, the tracker line), `css/quests.css` (`qs-`, `cv-quest`) | Built (`docs/first-session-spec.md` §4); checked by `tools/quests_check.py` and `tools/simtest.js` |
| — The first hour's teaching | `js/guide.js`, `css/polish.css` | Coach marks, tips, the new-thing rows and tab dots; Wick's session and visits stand in for the coach marks they say |
| — Prototype tools | `js/proto.js`, `css/polish.css` | For play-testing only |

## Systems

| System | Files |
|---|---|
| Helpers, seeded random numbers | `js/core.js` |
| Data: statuses, conditions, foes, stages, regions | `js/data.js` |
| Classes and skills | `js/classes.js`, `js/classes-late.js` |
| The battle simulation (seed and setup in, event log out) | `js/sim.js` |
| Heroes: rolls, levels, points (stats only: resistances take none from save version 8), thresholds, trees | `js/hero.js` |
| Gear and loot: pieces, rolls, stars and enchantment lines (`ENCHANT`; the star odds and floors are `STARS` in `js/data.js`) | `js/items.js` |
| The home base model: buildings, plots, Renown, the Recruit Board, idle buildings, the road's tolls | `js/base.js` |
| Fatigue and rest | `js/rest.js` |
| The campaign: progress, rewards, unlocks, trips | `js/campaign.js` |
| Bess's quests: the story quest, the daily jobs (counted from `Campaign.onSettle` and the tolls collected) | `js/quests.js` (`save.quests`, with its migration in `js/save.js`) |
| Saves, migrations, servers, the cloud copy | `js/save.js` |
| The app shell: screens, the tab bar, the purse | `js/app.js`, `css/app.css` |
| Tooltips (a hover, or a press held), for the screens drawn to `docs/ui-rules.md` | `js/tip.js`, `.tp` in `css/board.css` |
| Pixel art, icons, scenery | `js/art.js` |
| Sound | `js/audio.js` |
| The glossary (Tactics' long presses read it) | `js/glossary.js`, checked by `node tools/glossary.js`, written out to `docs/glossary.md` |
| Tests | `tools/simtest.js` (the sim, the models, balance), `tools/playthrough.js` (headless runs through Regions I–II), `tools/playthrough_ui.py` (the UI, Region I), `tools/frame_check.py`, `tools/board_check.py` (the Recruit Board and the Hearth's dock), `tools/hero_check.py`, `tools/tactics_check.py`, `tools/results_check.py`, `tools/battle_check.py`, `tools/quests_check.py`, `tools/cloud_check.py`, `tools/camp_perf.py`; `tools/shot.py` for screenshots |

## Legacy code still running

This code still runs, but a redesign will replace it. Read it as old behaviour, not as the design.

- **The battle canvas's `'camp'` mode** (`Battle.idle` in `js/battle.js`): a road scene seen from behind the party, with
  heroes in rows looking up the road. The Road map, Party and Bag call it as they open (`App.rest()`), and
  it shows faintly behind their 95%-opaque pages. It is not the Hearth (the Hearth holds it undrawn, `Battle.hold`).
  Only this mode uses `S.rows`, `COL`, `field()`'s camp half, `place()`'s second half, the back-view hero sprites in
  `sprOf` and `drawGround`'s road. It becomes dead once those three screens leave the column; then remove it, with `restScene` in
  `js/app.js`.
- **The portrait column** (`#frame.column`, `Frame.column`) and the shell's top bar and tab bar (`#shell`, `css/app.css`),
  for the screens marked "Old layout" above.
- **`lantern-road.html`:** the roguelike from before the 2026-11-03 pivot, kept as a file (README). It is not loaded by
  `index.html`. `js/art.js`'s sprite builder came from it.
- **The step 1 prototype's fixed party,** `PARTY` in `js/classes.js`: still used by the version-0 save migration, the
  simulator's default setup, `Battle.idle` and `Tactics` before a save loads, and the tools.
- **Save migrations and old keys** in `js/save.js` (`LEGACY_IDLE`, the roguelike's cloud doc at `/save`): kept on purpose.
  `SAVE_BAK` and `SAVE_BROKEN` are unused constants that only document the keys; left alone because they are save paths.
- **`Battle.progress`:** a test hook ("for tests") that no tool calls now. Left in case a `shot.py` step uses it.
- **`LATER_FATIGUE`** in `js/items.js`: an empty marker object passed as the gear lines' test. It is truthy, so removing it
  could change how those lines show. Left.
- **Old names,** such as Camp, Come home, character and Knocked out, wait for the glossary builder's rename pass.
  `node tools/glossary.js` lists every place they appear.

## Removed in the cleanup PR (2026-11-04)

Each was checked with grep across `js/`, `index.html` and `tools/`. `js/glossary.js` was left out of the class search
because it only holds words.
- **CSS for screens that no longer exist.**
  - `css/app.css`:
    - the old Home Base page (`.view.home`, `.home`, `.away-chip`, `.blds`), replaced by the camp in build step 5 (`ae6a3ab`) and now by PR #24
    - the old list-style Campaign Map (`.region`, `.rhd`, `.road`, `.stop…`, `.view.map`), replaced by the illustrated Road map (`4769999`)
    - the old character box (`.charbox`, `.statgrid`, `.stat`, `.gearrow`, `.gslot`), replaced by the hero sheet (`7a12b56`)
  - `css/game.css`: the step 1 prototype's stage list and title (`.stages`, `.stage-row…`, `.camp-foot`, `.version`, `.title`, `@keyframes titlein`, and `.title` and `.detail` in the reduced-motion list)
  - `css/base.css`: `.row2` and `.btn.sm`, both last used before PR #24
  - `css/sheet.css`: `.hs-gslots` and `.hs-gslot`, replaced by the Gear tab (`5335de2`)
  - No element in the game has any of these classes.
- **Unreachable portrait branches in `js/battle.js`.** Events, thralls and the enrage tint exist only while a battle
  is shown. `run()` sets `S.mode = 'battle'` before it sets `B` or queues anything. `idle()`, the only place that sets
  `'camp'`, first clears `B`, the queue and the units. So in each of these, the `sideOn()` test is always true:
  - the melee stop-short
  - the counter's lunge
  - the hit recoil (and its `dir`)
  - the enrage tint
  - the thrall's sprite
- **Locals and exports with no callers:**
  - `torsoish` in `js/art.js`
  - `hasSt` in `js/sim.js`
  - `regionCount` in `js/base.js`
  - `Fatigue.PLACE_NAMES` in `js/rest.js`
  - `RARITIES` in `js/items.js`
- **Comments that described old behaviour:** `js/battle.js` (what the camp mode is), `js/classes-late.js` (recruiting has
  arrived), `js/classes.js` (`PARTY`).
- **The checks:**
  - The computed styles of every element came out identical before and after, at 844×390, on 12 screens and sheets: the Hearth, the Road map, a stage sheet, Party (and arranging), the Bag, the hero sheet, Settings, "While you were away", the Recruit Board, Tactics and How battles work. The only exception is the Recruit Board's rolled bars, which vary from run to run anyway.
  - `tools/simtest.js` and `tools/playthrough.js`: the same results.
  - `frame_check.py`, `results_check.py`, `playthrough_ui.py` and `node tools/glossary.js` pass.

## Removed with the hero card (2026-11-05)

Each was checked with grep across `js/`, `index.html` and `tools/` first.
- **The old hero sheet's styles** (the Later table's row): everything in `css/sheet.css` but the sprite stage (`.stg-*`),
  the `.hs-` classes the item card's sheet and the prototype tools still use (`hs-banner`, `hs-card`, `hs-k`, `hs-kv`,
  `hs-row`, `hs-tag`, `hs-why`), the Party screen's markers and the battle's floating words; `.hs-stage`, `.hs-ov` and
  `.gr-try` in `css/gear.css`.
- **The hero screen's tabs** (Stats, Skills, Gear, Tactics) and their styles in `css/hero.css`, the skill watched on a
  dummy in the arch (`HeroSheet.watch`, `.playing`), the Gear tab's Card and Unequip, and `HeroSheet.waiting` (no caller).

## Later: dead code in files a builder is working in

Remove these in a second PR, once the road view, Formation and the guide have merged. Check each one again first,
because those builds may already have removed or reused it.

| Where | What | Why it is dead |
|---|---|---|
| `js/app.js` | `placeholder` (the "Placeholder" note helper) | No callers: `grep -n "placeholder(" js/*.js` finds none |
| `js/app.js` | `showAway`'s own sheet, after `if (actions.away) return actions.away(ms)`, and `awayGains` (and its export) | `js/camp.js` always sets `App.actions.away` (`camp.js` is in `index.html`), so the fallback never runs. Nothing pushes to `awayGains`: `grep -rn awayGains js tools` finds only `js/app.js` |
| `css/map.css` | `.ts-unl` | No element has the class: `grep -rn ts-unl js` finds nothing (its last use went in `aba4b1e`) |
| `js/battle.js`, `js/app.js` | the camp mode and `restScene` (see Legacy) | Dead once the Road map, Party and Bag leave the column. That is not yet; they still call it |
| `css/gear.css` | `.gr-slots`, `.gr-slot`, `.gr-bagrow`, `.gr-fits`, `.gr-legend` | No element has these classes (`grep -rn` across `js/` finds none); dead before the hero card, so left for this table |

No dead code was found in `js/camp.js`, `js/campscene.js`, `css/camp.css`, `js/map.js` or `js/guide.js`. Their
exports that no other file reads (`Camp.sceneState`, `CampScene.weightOf` and the like) are used inside their own
file.

## Docs

| Doc | State |
|---|---|
| `docs/design.md` | Current: the idle party design (2026-11-03), with the 2026-11-04 decisions. It keeps no roguelike-era sections (§13 lists a roguelike mode as "maybe later"). Superseded parts: §8's camp ring (now the camp views) and §12's build order (now screen by screen). Each has a note. |
| `docs/content-spec.md`, `docs/campaign-spec.md`, `docs/home-base-spec.md` | Current for numbers and content. The home-base spec's §11 still mentions "the ring", the camp before the camp views. |
| `docs/glossary.md` | Generated by `node tools/glossary.js`; rerun it whenever `js/` changes. |
| `docs/mockups/` | Designs, not game code. `camp3d.js` is the prototype that `js/campscene.js` was ported from; `hearth-art.js` and `hearth-scene.js` are where `js/hearthart.js` and the Hearth's terrace came from; `d2-art.js` is where `js/dockart.js` came from (for `recruit-board.html` and `hearth-dock.html`, approved 2026-11-05). |
| `docs/ui-rules.md` | Current: the UI rules every screen follows (2026-11-05). The Recruit Board, the Hearth's dock and the hero card are drawn to them. |
| `docs/screens/` | `landscape/`, `camp-views/`, `road-view/`, `formation/`, `results/`, `hero/`, `tactics/`, `hearth/`, `guide/`, `board/`, `dock/` and `battle/` show the current game (`hearth/`, the HUD before the dock) (`battle/`'s `before-` shots, the old Pause and turn order). The rest (`app-shell/`, `campaign/`, `characters/`, `equipment/`, `home-base/`, `polish/`, `regions/`) are portrait-era screenshots from build steps 2–7: old layouts. |
| `docs/playtest-log.md`, `docs/onboarding-spec.md`, `docs/idle-heroes-study.md`, `docs/darkest-dungeon-study.md` | Not in git yet: they are in the main checkout only. Start with the play-test log's "Where things stand". The onboarding spec's §2 and §12 say at their top that `docs/idle-heroes-study.md` supersedes them. |
| `README.md` | Current. Its last section describes the roguelike in `lantern-road.html`. |
