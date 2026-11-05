# Lantern Road: Play-test Log

Every play-test note, with an ID, so nothing is lost between sessions. The newest session goes at the top.

- **Type:** bug, layout, visuals, words (including naming), loop (the game loop and pacing), onboarding or process.
- **Status:** noted → proposed (a design is waiting for your OK) → approved → built (in a PR) → checked (you replayed it).


## Where things stand (2026-11-04, night)

Start here after a break or a new session. Builder sessions report to the partner session that started them; find them in the sidebar or with list_sessions.

**Merged on 2026-11-05:** these are in `main`, each with your OK.
- PR #21: screen 1, the landscape frame, the title and the servers.
- PR #23: screen 7, the results popup.
- PR #24: screen 2, the camp views (`e7b7468`). Its play-through, on `main` merged in, lit Region I in 101 trips with no problems.
- PR #25: the road view (`3074413`). Its play-through lit Region I in 46 trips with no problems, and its hand-over note is `docs/notes/road-view.md`.
- PR #26: Formation and the shared panel kit, `js/kit.js` and `css/kit.css` (`b2ef0a6`). Its play-through lit all 18 stages with no console errors.
- PR #29: screen 8, the hero screen (`d233938`). The hero stands in the arch beside a framed panel with four tabs. Its full play-through lit Region I in 29 trips with no console errors.
- PR #31: the guide, Wick's twelve-step first session (`94e3973`). It also makes 1-1's first clear give a level.
- PR #32: the Hearth's scene art, phase A (`5f2d1a8`): the buildings, the terrace, the Old Beacon and the mist.
- PR #33: Tactics, screen 11 (`3d06b1c`).
  - The full play-through on #31, #32 and #33 together passed: Wick's 30 forced steps, then Region I lit in 49 trips, with no console errors.
  - The frame, road, Formation and results checks and the sim tests passed.
  - The hero and Tactics checks fail on touch: see the guide's fix below.
- PR #34: the guide's touch fix (`6f1cb57`). A forced step now closes as soon as the first session is over, and the hero and Tactics checks skip the session in their own saves. Its full play-through lit Region I in 40 trips with no console errors.
- PR #30: this log, the two studies, the onboarding spec and the mockups (`8540ec2`). Docs only.
- PR #28: the quicker UI play-through (`8e4c9df`). The full run went from 467 s to about 150 s, and `--quick` takes about 40 s. The convention: builders run `--quick` before reporting, and the partner session runs the full play-through before merging.
- PR #27: the cleanup (`77763c0`). It removed 85 lines of dead code and added `docs/code-map.md`, the map of what's current. Its Later list waits for the guide and the hero screen.
- PR #22: the glossary (`4e5a287`): 277 entries, with the decided names and Bone Retinue. It changes no game behaviour; tooltips, the Codex and Wick will read it.

**Still open:**
- **The old `camp-views` builder** (local_4ddbc810) is done with #24. It also started its own road view on `claude/road-view-02992c`, a duplicate. You stopped it on 2026-11-05. Leave that branch unused.
- **The Hearth in detail, phase B** (1.30): the HUD (the crest, the menus as drawn objects, names when you look, barks, framed sheets) can start now that the guide is in.
- **The `glossary` builder** (local_ab2f5f2a): its four small text fixes and the rename pass wait for the road view, Formation and the guide build. They'll come as a new PR from `main`.
- **This folder** (`D:/_/lantern-road`) is on `main` (`6f1cb57`), up to date. The preview server on port 8766 plays the current game. This log, the studies, the onboarding spec and the mockups are tracked since PR #30. Edits to them show as uncommitted here until a commit is OK'd. Your two `lantern-road-auto-10x*.mp4` videos stay untracked.
- **The `cleanup` builder** (local_e54bd696): its first PR (#27) is merged. Phase 2, removing the Later list from `docs/code-map.md`, waits for the guide and the hero screen to merge.

**Next, in order:**
1. **The guide build,** building now:
   - Wick, from `docs/mockups/wick.js`
   - the first session's script, from `docs/onboarding-spec.md` §6.4, with Wick's welcome from `camp-welcome.html` W1–W3
   - the first pick, from `first-pick.html`
2. **The rename pass,** by the glossary builder: the Hearth, Turn order, Hero, Fallen, Loot, the paths and British spelling. Run `node tools/glossary.js` first; it lists where each old name still shows.
3. **Your guided walkthrough,** ready now: in the browser pane, choose a server you haven't used (S2 or S3), then Tap to begin. Notes go in Session 2.
4. **The Hearth build,** from `docs/mockups/hearth.html` (approved for now, 1.30), on top of the camp views.
5. **Formation (screen 5)** is merged (#26, 1.31). The guide's step 12 opens it, through its `data-tut` anchors.

**Screen 8, the hero:** merged (#29, 1.32). The guide's steps 8–9 point at its `hero-tab-rules` and `hero-rules` anchors.

**Screen 11, Tactics:** approved (1.35) and building in the `tactics` session (local_2ce07923). It replaces only the view in `js/rules.js` and `css/rules.css`; the model stays.

**Screen 6, Battle, is mostly built already.** It went landscape in the overnight build: heroes on the left in side view, foes on the right, the turn order along the top, and pause, step, speed and skip along the bottom (see `docs/screens/landscape/` and `docs/screens/polish/12-first-battle-flags.png`). Left for it: Wick's two pauses, in the guide build, and perhaps a detail pass later. The next screen to design is 8, the hero screen.

**Waiting on you:**
- Three questions on the Hearth:
  - Plaques always, or only when you look?
  - The Old Beacon is a working name. Is it scenery, or a late goal to relight?
  - Barks: one every half a minute or so, with an off switch?
- The glossary's new clashes:
  - Unbroken is both a path and a skill.
  - Hardened is both a passive and a status.
  - Charnel Host sits beside the Charnel Fortress skill.
  - The Masters' Hall's lessons sit beside the Tactician's Lessons I–III.
  - "Home material" uses home in another sense.
  - Hyphens in Title Case: Will-Light?
  - Wick's name shows up in Long Wick, Wick Wraith and Wick Shears.
  - The Gravecaller's passive is named Bone Retinue (merged in #22; the alternative was Waiting Dead).

**The reference:**
- `docs/idle-heroes-study.md`, for clarity and the guide.
- `docs/darkest-dungeon-study.md`, for detail and atmosphere.
- The mockups in `docs/mockups/`:
  - `title`
  - `camp-views`
  - `road-view`
  - `first-pick`
  - `results`
  - `camp-welcome`, with Wick's welcome and the kit
  - `hearth`, with `hearth-art.js` and `hearth-scene.js`

Open the mockups over http in the browser pane, from the `lantern-road` preview server on port 8766. The file pane's preview can't load their scripts or fonts, so there they show empty frames and "HearthScene is not defined".

## Session 1 · 2026-11-04 · main at f9e32d4 (PRs #9–#20)

| ID | Screen | Note | Type | Plan | Status |
|---|---|---|---|---|---|
| 1.1 | Every screen | Play 100% in landscape, for better spacing. | Layout | Onboarding spec §3 | Proposed |
| 1.2 | Start | A loading splash, then tap to go to camp or to the new player's start. | Onboarding | §4 | Proposed |
| 1.3 | Camp | The camp is the main area the game revolves around. | Loop | §3, §5 | Proposed |
| 1.4 | Every screen | Tap things to learn what they are, like tooltips. | Words | §7 | Proposed |
| 1.5 | Every screen | A guided tutorial like Idle Heroes'. It covers the basics and sets you on course, and returns for each new unlock. | Onboarding | §2, §6 | Proposed |
| 1.6 | First pick ("A new road") | Start at camp. The guide sends you to the Recruit Board, which offers the first three classes, with a short blurb on each from the guide. | Onboarding | §6.4 | Proposed |
| 1.7 | After a battle | The report is crowded and convoluted, and most of it can't be seen. Make it scrollable. Add a popup first, with these parts: | Layout | §9 | Proposed |
| | | • XP bars that fill, and keep filling past a level-up | | | |
| | | • a fatigue bar per hero | | | |
| | | • Report · Camp · Fight again · Next | | | |
| 1.8 | The Bag | "Gear not being worn. Tap a piece for its card…" is cumbersome, and text like it is everywhere. Use tooltips and the tutorial instead, and free up the space. | Words | §10 | Proposed |
| 1.9 | Settings | Add a codex, a bestiary, a glossary and a tips switch. | Onboarding | §8 | Proposed |
| 1.10 | Process | Step through the game one screen at a time with an agent, following the tutorial, and note what to change on each screen. | Process | §11 | Approved |
| 1.11 | Camp | The camp is the main screen and must be pristine: its look, spacing and layout. It should hold everything we want, and make getting to the rest of the game simple. Mock it up first. | Visuals | `docs/mockups/camp.html` | Proposed |
| 1.12 | Road | The Road in the play-test build looks nothing like the one in the saved mockups (`docs/mockups/index.html`), which looked much better. | Visuals | Next mockup | Noted |
| 1.13 | Every screen | Most of the UI and UX needs updating. | Visuals | The step-through | Noted |
| 1.14 | Every screen | Use Idle Heroes' tutorial and its UI, UX and visual design as the model (60 screenshots from a new account), and build one screen at a time. | Process | `docs/idle-heroes-study.md` | Approved |
| 1.15 | Screen 1 | Start screen 1: the title and loading screen, and the landscape frame. | Process | Title in `docs/mockups/title.html`; the frame is being built in its own PR | Title approved |
| 1.16 | Title | Add servers like Idle Heroes': new servers keep opening, a new account starts on one, and the account is tied to it. This leads toward multiplayer later. For now, a placeholder picker on the title screen, with no database or hosting. | Loop | `docs/mockups/title.html` (T2–T4) | Approved: servers numbered only, no names. A new server works now, as a fresh save that keeps the others. |
| 1.17 | Screen 2 | Start screen 2: the camp and Wick's welcome. | Process | `docs/mockups/camp-welcome.html`: the camp (C1), the welcome (W1–W3) and the shared kit | Superseded by 1.18 for the camp's layout; Wick's welcome and the kit carry over |
| 1.18 | Camp | Split the camp into views around the fire. Drag to turn smoothly between them. | Visuals | `docs/mockups/camp-views.html` (live frame plus V1–V4), drawn by `docs/mockups/camp3d.js` | Proposed |
| | | • **The party view:** close up on the fire and the party, with party controls on the sides. The amber road leads off behind the fire; tap it for the Road, or set out. | | | |
| | | • **The buildings view:** turn around the fire and zoom out to see every building, with the fire and party smaller. | | | |
| | | • Other views later, if any. | | | |
| 1.19 | Camp views | The turn between views works well. Make these changes: | Visuals | `docs/mockups/camp-views.html` (revised) | Done: being built (`camp-views` session, stacked on PR #21) |
| | | • **The road** in the party view zigzags off into the distance as an amber road, like the saved mockup's region map. | | | |
| | | • **The buildings view** needs landscape in the background and more scenic detail. | | | |
| | | • **Remove the redundant controls:** the Party/Buildings switcher and the Road button. | | | |
| | | • **Make the party controls more compact.** | | | |
| | | • **Heroes, Tactics and Bag** become icons in a bottom-corner ribbon, as in Idle Heroes. | | | |
| | | • **Gold and bone dust** get better displays. | | | |
| 1.20 | Camp views | Make better use of space. | Visuals | `docs/mockups/camp-views.html` | Done: being built |
| | | • The Recruit Board goes to the bottom left, where it's noticed. | | | |
| | | • Wick goes up front, in a corner or at a side, not tucked behind things. | | | |
| | | • The amber road is good for now. | | | |
| 1.21 | Road | Tap the road to zoom into a road view: the road ahead with your region and what's to come. Pan along it to choose where to go. | Visuals | `docs/mockups/road-view.html` (live frame plus R1–R4), in `docs/mockups/camp3d.js` | Proposed |
| 1.22 | Process | Use builder sessions so building goes on while we keep designing together. | Process | Builders: `landscape-frame` (PR #21), `camp-views`, `glossary` | Approved |
| 1.23 | Camp | Wick goes into the bottom-left corner, smaller. The Recruit Board takes his old spot, in proportion with the scene. | Visuals | `docs/mockups/camp3d.js` (`BOARD`, `WICK_POS`) | Done: sent to the `camp-views` builder |
| 1.24 | Road view | Panning snaps to each stage. Panning back out of the road returns you to the campfire view; the back arrow stays. | Loop | `docs/mockups/road-view.html` | Approved; queued for the `camp-views` builder after the camp |
| | | • Every stage is the same drag away (64 px). | | | |
| | | • The mouse wheel steps one stage at a time. | | | |
| | | • Dragging back past 1-1 pulls the camera toward the fire; letting go flies home. | | | |
| 1.25 | Process | Next: a play-test walkthrough from the start of the game, guided by the tutorial. | Onboarding | Needs the guide built: Wick, the first session's script, the first pick, the results popup | Noted |
| 1.26 | Screen 3 | The first pick: the Recruit Board offers the three starters. Wick gives a line on each, you hire one free, and a reveal follows. | Onboarding | `docs/mockups/first-pick.html` (live frame plus P1–P5) | Approved: built with the guide, after the camp and road views |
| 1.27 | Screen 7 | The results popup after every battle (from note 1.7): | Layout | `docs/mockups/results.html` (live frame plus R1–R4) | Approved: being built (`results-popup` session, stacked on PR #21) |
| | | • XP bars that roll over on a level-up | | | |
| | | • fatigue bars with the Weary and Exhausted marks | | | |
| | | • loot, and new unlocks | | | |
| | | • Report · Camp · Fight again · Next | | | |
| | | • after a loss, Wick gives the stage's hint, with Farm | | | |

| 1.28 | Words | Settle the glossary's naming questions (PR #22's list). | Words | The decisions below | Decided; game-wide renames wait for the in-flight builds |
| 1.29 | Every screen | Take Darkest Dungeon's Hamlet as a model for detail and atmosphere, at the base and across the game (seven screenshots). | Visuals | `docs/darkest-dungeon-study.md` | Noted |
| 1.30 | The Hearth | Approved the Hearth's detail pass for now (`hearth.html`): bigger buildings, a terrace, the Old Beacon, names when you look, barks, the crest, menus as drawn things, framed panels, parchment. One change: move the party panel from the left to the right side of the screen. | Layout | `docs/mockups/hearth.html`; the panel moved in `camp-views`, `first-pick` and `hearth` | Approved; the panel move is going into PR #24, the Hearth build comes after the walkthrough |
| 1.31 | Formation (screen 5) | Mocked up while the road view builds (`formation.html`): opens from the party panel; the party standing as in battle, facing the next stage's foes; the roster along the bottom; drag to place, swap or rest; Auto and Done; Defends only and Spent warnings; Wick's two callouts on the first visit (step 12). | Layout | `docs/mockups/formation.html` | Approved (Auto as described; Spent heroes greyed but placeable); building in the `formation` session |
| 1.32 | The hero (screen 8) | Mocked up (`hero.html`): the hero full length in a stone arch, with the path's name, level, XP and fatigue; a framed panel with four tabs (Stats, Skills, Gear, Rules); Auto for stat points and Auto-equip; resistances as icons with numbers; arrows to the next hero; Wick's step-8 spotlight on Rules. | Layout | `docs/mockups/hero.html` | Merged (#29) |
| 1.33 | Builders | The UI play-through every builder runs is slow (all of Region I, 31–101 trips, fixed sleeps, real-time walks between battles). Make it quicker. | Process | A quick mode for builders, waits on what's on screen instead of sleeps, instant walks in tests | Done in PR #28: full run 467 s → about 150 s, `--quick` about 40 s |
| 1.34 | Words | Rename Rules to Tactics (or Gambits). | Words | Tactics: one word for the lines, the screen and the Tactician | Decided: Tactics. The guide and hero screen builders were told; the glossary's rename pass does the rest |
| 1.35 | Tactics (screen 11) | Mocked up (`tactics.html`). Landscape, in three columns: the owners (heroes, Party, Loadout), the chosen one's tactics, and a When/Do picker, so nothing pops over the list. One line per tactic: grip, number, when → do, a lantern for on and off. The number steps in the picker. A red ! for a skill not equipped. Locked slots fold into one line naming who unlocks them. Saved sets as one chip at top right. | Layout | `docs/mockups/tactics.html` | Approved (the lantern stays; conditions not yet found show greyed, "to find"); building in the `tactics` session |
The three screenshots mentioned with these notes didn't come through. The same screens were captured at 844×390 for the spec.

### Decisions, 2026-11-04

- **The guide:** "Old Wick, the lamp-keeper" stands for now. The lore and theme may be revisited later.
- **The camp is the main screen.** A dock replaces the tab bar. The camp's look and layout get mockups before building.
- **The first session is forced,** with softer guidance after it.
- **The working model:** this session is the play-test partner and keeps this log; builder sessions run one at a time, each ending in a PR.
- **From the Idle Heroes study** (you asked that its lessons answer the camp questions):
  - Camp layout A, scrolling sideways, with a name plaque under every building.
  - Set out opens the Road with the next stage's card ready.
  - Plots open from the middle outwards.
  - Every screen gets the same frame: back, currencies, and a **?** button.
  - The order to build in is the study's §6, one screen at a time.
- **The camp is views around one fire** (1.18–1.20): the party view and the buildings view. You drag to turn; there's no switch on screen. Wick teaches the turn once, when the first building comes. The + on gold and bone dust stays.
- **The working model, from 1.22:** design happens here, with you. Each approved screen goes to its own builder session and PR while the next is designed.
- **The road view** (1.21, 1.24) is approved:
  - Set out at camp flies up the road with the next stage's card open, one more tap to go.
  - "Keep going" and the come-home rules get decided when the tutorial path reaches them.
- **The first pick and the results popup** (1.26, 1.27) are approved. Building order for the guided walkthrough:
  1. The results popup, now.
  2. The camp views, then the road view (the `camp-views` builder).
  3. The guide: Wick, the first session's script and the first pick, built on all of the above.
  4. Then your walkthrough, from a fresh server.

### Naming decisions, 2026-11-04 (1.28)

- **The home base is the Hearth.** Going home is "Return to the Hearth": the party rule's action, "Return when…" on the chips, and a **Hearth** button where today's say Camp or Home. Players don't name their own.
- **Turn order** is the banners along the top of a battle (not turn flags or turn strip).
- **Tactics, not rules** (2026-11-05, 1.34): the "when → do" lines are tactics, and one line is a tactic. The screen was already Tactics, and the Tactician teaches them, so one word now covers it. That gives party tactics, tactic slots, tactic sets, "Tactics, top first" and "Edit tactics". Internal names stay as they are (`js/rules.js`, `App.actions.tactics`, the `hero-tab-rules` and `hero-rules` anchors, glossary ids). The guide and the hero screen use it now; the rest of the game changes in the rename pass. You chose it over Gambits, which is Final Fantasy XII's name for the same system.
- **Hero** on every screen (not character). The design docs may still say character.
- **Fallen** is a hero at 0 health: "Ally: fallen", "An ally has fallen" (not knocked out or fell).
- **Loot** is what battles drop (not spoils or rewards).
- **Renamed paths:**
  - the Gravecaller's Ossuary becomes **Charnel Host**
  - the Barber-Surgeon's Surgeon becomes **Sawbones**
  - the Warden's Bastion becomes **Unbroken**
  - the Charnel Host's passive, also called Ossuary today, needs a new name too
- **British spelling** throughout: Defence, Armour, Draught.
- **Capitals depend on the kind of name:** skills, statuses, items, paths, buildings and regions in Title Case (Focus Fire); rules, conditions, buttons and labels in sentence case (Return when…).
- **Defaults, unless you object:**
  - "Foe: highest Power" (Power for both)
  - Doom and Hex Ward, as the game spells them
  - Threshold for levels only
  - the Tactician's Lesson I, II and III
  - Wick taken out of the recruit names
  - curly apostrophes everywhere
  - Crit on screens
  - the material names stay placeholders for now

## Session 2 · 2026-11-04 · main at 6f1cb57 (PRs #21–#34)

Your guided walkthrough, from a fresh server.

| ID | Screen | Note | Type | Plan | Status |
|---|---|---|---|---|---|
| 2.1 | The welcome | There's no background or story at all, so it makes no sense, and the guide introduces the game poorly. Compare it with Idle Heroes. | Onboarding | `docs/tutorial-study.md`: the research, the comparison, how Wick should lead, and the first session with the story (§5), approved with §7's picks 3–5 | Built in PR #35 |
| 2.2 | Every screen | Help and Settings (top right) should work while the tutorial is running. | Onboarding | The guide lets them through; Wick steps aside while one is open and comes back when it closes | Built in PR #35 |
| 2.3 | The story | The lantern-lighting premise got old long ago and is frankly stupid now. It was something to build on; now the game needs a real plot and story. | Story | `docs/story.md`: spine A, "the Fallen Kingdom", written in its own session | Decided |
| 2.4 | The story | Option 1 made lighter "makes absolutely no sense, it is complete nonsense words." | Story | Start again from a story that makes sense, told plainly, with the humour in the voices rather than the world's rules | Done: `docs/story.md` |

### Decisions, session 2

- **Tone (2.3):** more dry humour, and lighter and more approachable in general.
- **The game can be renamed.** "Lantern Road" goes with the lantern premise.
- **The story (2.3), approved 2026-11-05:** `docs/story.md`, spine A, "the Fallen Kingdom". You run a company of heroes for hire, clear the old road through a kingdom that fell to its hollow king, and keep what you clear. About as much story as Idle Heroes, and the player gets no backstory.
- **Working title, 2026-11-05:** "The Lost Kingdom" replaces "Lantern Road" for now. The name is common, so check the app stores before release.
