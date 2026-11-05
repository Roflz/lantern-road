# Lantern Road: Onboarding and UX Spec

Draft 1, 2026-11-04, from your play-test notes of the same day (logged in `docs/playtest-log.md`). Nothing here is built yet. Where this spec changes `docs/design.md`, it says so; design.md is updated once you approve.

**Approved on 2026-11-04:**
- Wick, as the working name (§6.1).
- The camp as the main screen, with a dock replacing the tab bar (§3, §5).
- The forced first session (§6.4).
- The working model (§11).

The camp's layout is being mocked up in `docs/mockups/camp.html` before anything is built.

## 1. What changes

1. **Landscape everywhere.** Every screen is built for a phone on its side, not only battles.
2. **A title screen.** It shows while the game loads, then "Tap to begin" takes you to camp, or into the guided start of a new game.
3. **The camp is home.** Every other screen opens from the camp and returns to it.
4. **A guide.** A character at camp leads a new player through the first session, step by step, and comes back to introduce each new system as it unlocks.
5. **A goal tracker** at camp always shows the next thing to do.
6. **Tap anything to learn what it is.** Tooltips replace the explanations written across the screens.
7. **The Codex,** in Settings: a glossary, a bestiary, the classes, gear and buildings, and How to play. Settings also gets a tips switch and Replay the guide.
8. **A results popup after every battle:** XP bars that fill and roll over on a level-up, fatigue bars, the loot, and Report · Camp · Fight again · Next stage.
9. **A word budget.** Screens show names, numbers and actions. Explanations live in tooltips, the guide and the Codex.

## 2. What to take from Idle Heroes

**Superseded by `docs/idle-heroes-study.md`,** which works from your 60 screenshots of the real tutorial. The rest of this section is the first, web-only pass, kept for its sources.

Idle Heroes' own tutorial script isn't written down anywhere I could reach: fan wikis block automated reading, and the guides cover tips rather than the tutorial. So this section combines what I could verify, the documented onboarding of AFK Arena (its closest relative), and the genre's conventions. Tell me where your memory of Idle Heroes differs.

**Verified:**
- Idle Heroes opens features by player level: the Arena at level 18 and the Brave Trial at 40, for example ([Arena](https://idleheroes.fandom.com/wiki/Arena), [Brave Trial](https://idleheroes.fandom.com/wiki/Brave_Trial)). Campaign progress opens the rest ([BlueStacks guide](https://www.bluestacks.com/blog/game-guides/idle-heroes/idle-heroes-beginners-guide.html)).
- AFK Arena's tutorial ([Udonis](https://www.blog.udonis.co/mobile-marketing/mobile-games/first-time-user-experience)):
  - It is forced and plays inside the game.
  - The first two battles can't be lost, and an early level-up lands in the first minutes.
  - Guided visits to the menus follow, such as upgrading a hero.
  - It is over in under five minutes.
  - Then a quest list takes over, with rewards already waiting to be claimed.
  - The article credits this with 53% of players returning the next day.
- AFK Arena opens every feature by campaign stage ([function unlocks](https://afk.guide/function-unlocks/)). An analysis calls this predictable, and says progress is "unlocked visibly and guidedly" ([Deconstructor of Fun](https://www.deconstructoroffun.com/blog/2019/6/6/afk-arena-puts-lilith-into-the-billionaire-club)).
- General advice: hide what isn't needed in the first 15 minutes ([Mobile Game Doctor](https://mobilegamedoctor.com/2025/05/30/ftue-onboarding-whats-in-a-name/)). Teach by doing, not by reading.

**The genre's pattern, as you'll know it from Idle Heroes:**
- A spotlight dims everything but the one thing to tap, with a pointing hand and a line from the guide.
- A new feature announces itself with a card (icon, name, one line), then a guided first visit.
- Locked features stay visible. Tapping one says what opens it.
- Red dots mark where something waits.

**What it means for Lantern Road:**
- **The order already exists.** Campaign spec §8 teaches one system per stage, and that order stays.
- **The delivery is missing.** Today the game teaches with one-line pointers that fade by themselves. Instead, the guide should lead, take you by the hand for the first session, and hand over to a goal tracker after that. Each unlock should get its own moment.

## 3. Landscape

- **Every screen is landscape.** A phone held upright gets the game drawn on its side, as battles are now.
  - The design target is 844×390, a phone on its side. It must still read at 667×375 (the smallest phones) and look right on a desktop window.
  - This changes design.md §3 ("Every other screen is portrait") and §11 ("built for one-handed portrait phone use").
- **List on the left, detail on the right.** Wide screens show both at once, instead of stacking popups:

  | Screen | Left | Right |
  |---|---|---|
  | Party | Roster | Hero sheet |
  | Bag | Grid of gear | Item card |
  | Recruit Board | Recruits | The chosen recruit |
  | Road | Map | Stage sheet |
- **Getting around:**
  - The camp fills the screen.
  - A small dock at the bottom right holds Road, Party and Bag. Settings sits top right, and gold and materials top left.
  - Every other screen has a back arrow to camp at top left. The tab bar goes.
- **Two passes:** building this spec makes every screen fit and read well in landscape. Polishing each screen comes in the step-through (§11).

## 4. The title screen

- **While loading:** the lantern logo and "Lantern Road", with a thin bar the lantern's light fills as fonts, sprites and the save load.
- **Then "Tap to begin."** The tap also starts the sound, which browsers require anyway.
- **Where the tap goes:**
  - A returning player goes to camp, with "While you were away" first if they were gone 5 minutes or more.
  - A new game goes to the guided start (§6.4).
- **Nothing else is on it.** It has no menu. A small build tag in the corner helps play-testing.
- It replaces today's title card over the first pick.

## 5. The camp as home

- The camp scene fills the screen: the fire and the party in the middle, and the building ring around them. A wide screen suits the ring well.
- **The goal tracker** sits top left, under the gold (§6.3).
- **A building's card** opens on the right side, beside the scene, instead of under it.
- The step-through covers the camp's look in detail.

## 6. The guide

### 6.1 Who
- **Wick,** the old man who keeps the Hearth, the inn at the gate. He fled the old kingdom as a boy, and knows the road (`docs/story.md`).
- He sits by the fire, has a portrait for his speech bubbles, and reacts when tapped, like the heroes.
- His voice and lines follow `docs/story.md`.

### 6.2 How a guided step looks
- The screen dims except the target, which gets a soft lantern glow and a pointing hand.
- Wick's portrait and one or two short lines sit on the side away from the target.
- **Forced steps:** in the first session, only the target takes a tap.
- **Soft steps:** a tap anywhere moves on, and nothing is held back. *Built:* the first session's unforced 1-2, the unlock visits (§6.5) and Replay the guide.
- Battles pause for Wick only in 1-1, twice. This changes campaign spec §8.1, which says tips never block a battle.

### 6.3 The goal tracker
- **One goal at a time,** always on the camp screen, such as "Recruit your first hero", "Clear 1-1", "Look at your hero's rules", "Hire your free recruit" or "Build the Toll House".
- **Go** takes you straight there.
- **Each goal pays a little** when it's done, such as gold or a Healing Draught *(tune)*. That keeps rewards coming through the first hour.
- **Tapping the tracker** shows the chapter's checklist: what's done, the current goal, and what's next.
- After Region I it simply points at the frontier stage.

### 6.4 The first session: about 10 minutes

**Built** (the `guide` build, PR #31, 2026-11-04; rebuilt around the story in the first-session build, PR #35, 2026-11-05, after `docs/tutorial-study.md` §5 with the picks in its §7): `js/firstsession.js` runs the steps, `js/wick.js` draws them (`Wick.show`: the spotlight, the pointer, Wick's bubble and panel, callouts, the hand, and soft steps), and `js/firstpick.js` is the Recruit Board's first pick. Every step points at a `data-tut` anchor, or at what the Hearth's scene draws (the board, the road's stage markers). Screenshots of every step are in `docs/screens/guide/`; `tools/guide_check.py` walks it from a new game, and on through 1-3's unlock visit (§6.5).

Wick's lines are the story's (`docs/story.md`, the opening) and the study's. It follows the built screens: the Hearth's party view (`camp-views.html`), the road view (`road-view.html`), the hero screen (PR #29) and Formation (`formation.html`).

| # | Where | Wick says | You do |
|---|---|---|---|
| 1 | The Hearth, after the title, in Wick's panel | "Another company. Come in. Sit by the fire." · "I'm Wick. I keep the inn here, at the gate." · "Fifty years ago, the king over that wall wanted to rule forever." · "So he learned to raise the dead. When he died, he rose again, hollow." · "His people fled, so he raised their dead to serve him. We walled him in." · "Now the crown has an offer: clear the old road, and keep what you clear." | A tap a line. Skip, in the panel's corner, jumps to the name box |
| 2 | The same | Bubble, with the name box: "Who's in charge?" · Panel: "[Name]. Welcome to the Hearth. Your company can camp here." · Spotlight on the board: "First, you'll need heroes. The Recruit Board's there." | Give a name (with none you're "Captain", shown by your Renown), then tap the board |
| 3 | The Recruit Board, first pick | "Three looking for work. Tap each to hear about them." Then a line on each: Sellsword "Hits hardest, up front. Simple and strong." · Hexblade "Curses that tick. Patient, and hard on healers." · Pilgrim "Heals, and burns the dead. Slow, but hard to kill." At the reveal the new hero says why they signed on, over their head (`SIGN_ON` in `js/data.js`, from the bible's class table): the Sellsword, "Someone's paying. That's all I need to know." | Tap a card, Hire (free), then the reveal: the hero's line, their rolled name, class and level |
| 4 | The Hearth | On Set out: "The road starts at the gate. Take [hero] through." | Set out: the camera flies up the road with 1-1's card open |
| 5 | The road view | On 1-1's marker: "Each stage is a stretch of road. Win its fight, and the stretch is yours." · On the card's Set out: "Clear the first." | Tap to go on, then Set out |
| 6 | Battle 1-1, paused twice | At the first turn, on the turn order: "Battles fight themselves. The turn order shows who acts next." · At the third, on speed and skip: "Speed it up, or skip to the end." | Tap to go on; then the speed button (or Skip) |
| 7 | The results popup | On the XP bar: "Your first level. Each one brings a stat point." · On Hearth: "Back to the Hearth." | Tap to go on, then Hearth |
| 8 | Grow: the Hearth, then the hero's Stats tab | On Heroes: "[Hero] has a stat point. Let's spend it." · Pointers on the hero (the Party screen) and the Stats tab (passed over when it's open already) · On the stats and Auto: "Tap + on a stat, or Auto to let them choose." · A pointer on Keep · On the stats: "Stronger already." · Pointers on ‹ and the Hearth tab | Heroes → the hero → + (or Auto) → Keep → ‹ → Hearth |
| 9 | Unforced: 1-2 | Nothing is dimmed or held back. The goal tracker says "Clear 1-2", and Set out glows. On the road, a soft line on 1-1's marker: "First stretch cleared. It's yours now." The battle doesn't stop. On the results' New chip, as before: "The Recruit Board is open." · A pointer on Hearth | Set out, Set out on the card, watch; then tap to go on, and Hearth |
| 10 | The Hearth, then the board | On the board: "The board has a free recruit for you." · On the board: "Three new faces. Tap each to hear about them.", then a line on each. At the reveal, the new hero says their line | Hire one (free). They wait at the fire, out of the formation |
| 11 | Formation (F3) | On the party panel: "Two of you now. Let's find them a place." · In Formation, callouts on the rows (Front: "Takes the blows. Melee can only reach here." Back: "Safe while the front stands.") and a hand showing the drag: "Sturdy heroes in front, the rest behind." · On Done: "Well placed." | Drag the new hero into a place, then Done |
| 12 | The Hearth, in Wick's panel | "The Sexton's at the end of the Gravefields. Plenty of road before him." · "The road earns tolls while you're away. Come back and collect." · "I'll be by the fire." | Tap to go on |

After step 12 the session ends and the goal tracker takes over with "Clear 1-3".

**How a step behaves:**
- **A line** (a ▼ in its corner) goes on with a tap anywhere, or Enter.
- **A tap step** lights one thing, with the pointer on it. Nothing else takes a press, keys included, until it's tapped.
- **A soft step** (1-2's) holds nothing back. A press anywhere puts it aside and still does what it pressed; it comes back the next time its moment does, so Set out glows again when you're back at the Hearth.
- **Help and Settings take a tap at every step** (play-test note 2.2): the ? and ⚙ at the top right of the Hearth, and Settings on the Party screen's top bar. Wick steps aside while their page is open, and comes back on the same step when it closes. Replay the guide does nothing while the session runs (a toast says "Wick is showing you round already"), and Start over begins a new session.
- **Between steps** (the camera flying, the popup filling) nothing takes a press either, except in a battle and in the unforced 1-2 until its results. If no step comes for 15 seconds the hold lets go, so a save the script didn't foresee is never stuck.
- **Wick stands on the side away from what he points at.** His bubble moves up, or to the top, when it would cover it.
- **A reload carries on** where the session was. A step whose moment has gone (a battle resolved while the app was closed) is skipped, and a reload in the middle of Grow starts it again from Heroes. "While you were away" and the Road's "Back from the road" card wait until the session is over.

**Moved out of the session** (the study's §7, item 3):
- **Tactics** come at 1-3's first clear, in Wick's visit (§6.5).
- **Fatigue:** the results' fatigue line is gone. The first-time Weary tip says it now: "Weary: every turn tires a hero a little. They rest at the Hearth."
- **The tactic on the turn order** isn't said in 1-2 any more. Its coach mark says it, once, in the first battle after the session where a tactic chooses a move: "The flag names the tactic that chose the move. Tactics are yours to change."
- **What the session still says:** its first-time tip or coach mark waits, and is marked seen when the session ends. That's the turn order (`c:flags`), speed and skip (`c:speed`), the free recruit (`c:board`) and the stat point (the `stat` tip, said by Grow).

**Tolls from 1-1** (the study's §7, item 4): every cleared stage earns 5 gold an hour *(tune)*, stored up to 8 hours like an idle building's output (`BASE.TOLL` and `base.tolls` in `js/base.js`). "While you were away" shows them as Tolls, and its Gather it all takes them, as the Hearth's Collect does. Before 1-5 the Hearth has no buildings view, so no Collect: the tolls wait for "While you were away". The Toll House, built from 1-5, adds its own output on top, as before.

**Tuning:** 1-1's first clear now gives at least a level's worth of XP (`firstXp: 1.05` on the stage, in `js/data.js`), so step 7 always shows a level-up. 1-1 and 1-2 can't be lost with any starter (200 seeds each).

**Left for you: Keep going.** The stage sheet's "Keep going" question is still open. It would come in at 1-6, when its first clear unlocks Keep going (§6.5's guided visit: the stage sheet's trip settings and the come-home rule). Until then every trip is one battle, so the first session never meets it. The results popup for a trip of several battles stays provisional until it's decided.

**Change to design.md §6:** the first pick happens at the Recruit Board, which stands lit from the start in a first-pick mode with the three starters, free. After the pick it stands dark until 1-2's first clear opens it as it works today.

### 6.5 Unlock moments: the rest of Region I

Every first-clear unlock in campaign spec §5.3 gets three things:
1. **A line on the results popup,** such as "New: Party items".
2. **Wick's card back at camp:** icon, name, one line, with **Show me** (a guided visit of two to four steps) or **Later**.
3. **The next goal** uses it.

**Built: Party items, at 1-3's first clear** (the first-session build, PR #35; `js/visits.js`). It merges the Party items visit with Tactics, which moved here from the first session (the study's §7, item 3): problem first, answer second, as campaign spec §8.1 has it.
1. **The results popup:** its New chip, "New: Party items". A tap on it starts the visit as well.
2. **Wick's card, back at the Hearth:** the flask, "Party items", "Two Healing Draughts, and a tactic that uses them.", with **Show me** and **Later**. While it's up nothing else takes a press, except Help and Settings. It waits until the Hearth is still with nothing over it, and never comes while the first session runs.
3. **Show me** opens Tactics on the Party. Wick's steps there are soft: a press anywhere goes on, and nothing is held back.
   - On the Party's draught tactic, "Ally: health below 50% → Healing Draught", the plainest *when → do*: "When an ally's hurt, the party drinks a draught. That's a tactic."
   - The screen turns to the hero's own tactics: "Your hero has tactics like this too."
   - Unless the Tactics screen's coach mark has said it already: "Tactics run from the top. The first one that fits is used." (the line the first session used to say on the hero's tactics)
   - The visit is over after its last step, or when you leave the screen.
4. **Later:** the card goes, and the goal tracker reads "Party items" until the visit is seen. Its Go starts the visit.
5. **The next battle** with the draughts packed: their coach mark points at them, as before. "Tap a draught to use it now, or leave it to the party's tactic."

Nothing is said twice, and nothing is lost:
- The visit stands in for the Tactics screen's coach mark (`c:tactics`), which is marked seen when it ends. If you opened Tactics yourself first, the coach mark said it, and the visit leaves out its third step.
- With Settings → First-time tips off there's no card and no steps. The goal tracker still carries it, and its Go opens the screen.
- Only a first clear in a battle earns the card: the Prototype panel's lit stages don't, and nor does a save that cleared 1-3 before this build.

**For the other unlocks:** each is an entry in `VISITS` (`js/visits.js`): the card's icon, name and line, the goal's words, the screen the visit happens on and how to open it, its steps (`at`, `show`, and optionally `before` and `unless`), and the coach marks it covers. A first clear of an unlock with an entry earns its card (`save.guide.visits`: new, later or seen).

| Unlock | Guided visit |
|---|---|
| Party items (1-3) | **Built** (above): the party's draught tactic, the hero's own tactics; in the next battle, a pointer at the draughts |
| The first gear drop | Bag → tap the piece → try it on → Equip |
| The first stat or skill point | The hero sheet → spend it |
| Toll House blueprint (1-5) | Walk the ring to an empty plot → Build → Collect |
| Keep going (1-6) | The stage sheet's trip settings and the come-home rule |
| The first Weary hero | Resting at the fire |
| Infirmary, Training Yard, Shop, Tactician | Build it → its main action |
| The first loss | The stage's hint, and farming the stage before it |

**What stays from today's teaching:**
- The one-line battle tips (campaign spec §8.3) stay, and tapping one opens its glossary entry.
- The trip summary's "new thing" rows become the unlock cards.
- The tab dots move to the dock and to the camp's buildings.

### 6.6 Turning it off, and replaying it
- **Settings → Tips, On or Off.** Off stops Wick's soft steps, his unlock cards and the one-line tips. The goal tracker stays.
- **Settings → Replay the guide** plays Wick's explanations again on your current save, without forced taps. *Built:* each line shows once more when its place comes up (the story at the Hearth, the road when you set out, the battle lines in your next battle, and so on). Nothing is held back, and a press anywhere moves on. While the first session runs it does nothing ("Wick is showing you round already").
- **No "Skip the guide" in Settings** (the study's §7, item 5): the story can be skipped, and the forced part is short.
- **The forced first session can't be skipped on a new save.** For play-testing, the Prototype panel can skip it. *Built:* Prototype tools → Rules and tips → Skip the guide (the camp's Prototype chip stays live during the session for this).

## 7. Tooltips

- **Tap to learn.** Tap an icon, stat, status, rarity, resource, condition, foe trait or underlined term. A small card shows its icon, its name and one line, and **More** opens its Codex entry. Tap anywhere to close it.
- **In battle,** tapping a hero, foe or flag shows its card without pausing.
- **Locked things** stay visible but dimmed. Tapping one says what opens it, such as "Opens when 1-5 is clear".
- **Every term is defined once,** in one glossary table in the code, and tooltips, the Codex and Wick all read from it.
  - That table is also **your naming list**: every name a player sees, in one place, to review and rename in a single pass.

## 8. The Codex

Settings → Codex holds:

| Section | What it shows |
|---|---|
| Glossary | Every term, A–Z and by topic |
| Bestiary | Every foe you've met: sprite, stats, skills, resistances and where it's found. Unmet foes show as silhouettes. |
| Classes | The twelve, filled in as each joins |
| Gear | Every item you've found. Unfound items show as silhouettes. |
| Buildings | What each does, level by level |
| How to play | Short pages. They replace today's How Battles Work. |

Settings itself becomes: Sound · Reduced motion · Tips · Codex · Replay the guide · Prototype tools · Start over.

## 9. After a battle: the results popup

```
┌────────────────────────────────────────────────────────────┐
│ VICTORY · 1-1 The Edge of the Light           ★ First clear │
│                                                            │
│ [face] Fulke   Lv 1 → 2   XP      ██████████▌░░░░   +40    │
│                           Fatigue ██░░░░░░|░░░|░░   3 → 8  │
│ [face] Agnes   Lv 3       XP      █████░░░░░░░░░░   +40    │
│                           Fatigue ████░░░░|░░░|░░  12 → 18 │
│                                                            │
│ Loot  (coin) 78   (bone) 8   (coat) Traveller's Coat        │
│ New   (book) The Tactics screen                             │
│                                                            │
│  [ Report ]   [ Camp ]   [ Fight again ]   [ Next: 1-2 › ]  │
└────────────────────────────────────────────────────────────┘
```

- **XP bars** fill from where each hero was. A level-up fills the bar, flashes "Level 2", empties it and fills again; several levels roll over in turn. New stat and skill points show as small chips.
- **Fatigue bars** move from before to after, with marks at 50 (Weary) and 75 (Exhausted). Crossing a mark shows the word, and tapping the word explains it.
- **Loot** flies in, and tapping any piece shows its card.
- **After a loss:** the stage's hint at the top, then Report · Camp · Try again, plus Farm the stage before it at a wall.
- **On a trip that keeps going:** the same popup, shorter, with "Walking on to 1-7…" counting down, plus Come home and Report. It replaces today's between-battles card.
- **The battle report** becomes its own scrollable landscape screen, opened from Report.
  - The left side ranks everyone by damage and healing. The right side shows the chosen hero's turns and rules.
  - The round and turn badges and the battle seed go.
  - Everything else about it is for the step-through.
- **It replaces** today's level-up sheet and the report that opens on its own.

## 10. Words on screen

- **What a screen shows:** its title, the things on it, their numbers, and what you can do.
- **No instruction lines under titles.** For example, the Bag's "Gear not being worn. Tap a piece for its card: who it suits, what it costs, and what it sells for" goes.
  - Today the screens carry about 130 sentences of explanation. The most are in the building screens (32), the battle and report (23) and the hero sheet (19).
  - Each one moves to a tooltip, the Codex or Wick, or it goes.
- **Buttons are one or two words.** A line under a button only carries a number or a name, such as "1-2 · The Barrow Gate".
- **Flavour lines stay,** short and small: one per stage and one per item.

## 11. How we step through it together

**Recommended: one partner session, one builder at a time.**

- **This session is your play-test partner.**
  - You play and send notes and screenshots, screen by screen.
  - I log every note in `docs/playtest-log.md` with an ID, so nothing gets lost across days or sessions.
  - I sort each note as a bug, layout, visuals, words and naming, or game loop.
  - I fix small things right away. Anything that changes the design comes back to you first.
- **Builder sessions do the large builds,** one at a time, each from a written brief.
  - Each ends in a PR, your save point, as before.
  - I check each with screenshots and a play-through before asking you to merge.
  - I republish the play-test link once you say yes.
- **Why not several agents at once:** almost every screen change touches the same shared layout and style files, so parallel builders would overwrite each other. Helpers in parallel make sense only for separate work, like sprites and art, Codex writing or research.
- **The rhythm, one beat of the tutorial at a time:**
  1. You play the beat.
  2. You send notes.
  3. I log and sort them.
  4. Quick fixes go in now, and design questions go to you.
  5. The fixes are built and republished.
  6. You replay the beat, then move on to the next.
- **The route:**
  - First, the first session's twelve beats (§6.4).
  - Then the Region I unlock moments (§6.5), in the order you reach them.
  - Then everything after, as you get there.
  - Graphics, the overall visual design and naming are handled on every screen as we pass it.

## 12. Build order

**Superseded:** we now build screen by screen, in the order of `docs/idle-heroes-study.md` §6. Each screen is one PR, and you play each one before the next. The list below was the first plan.

1. **Landscape and the title screen.** Every screen made to fit and read well in landscape, and the camp as home, with the dock.
2. **Tooltips, the glossary table and the results popup,** with the report as its own screen.
3. **The guide:** Wick, the goal tracker, the camp-first start and the forced first session.
4. **The Codex and Settings,** during the step-through, when we reach them.
5. **Unlock moments and the word budget,** screen by screen during the step-through.
