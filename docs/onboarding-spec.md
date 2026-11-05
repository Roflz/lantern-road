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
- A character who tends the camp's fire and knows the road. **Working name: Old Wick, the lamp-keeper.**
- He sits by the fire, has a portrait for his speech bubbles, and reacts when tapped, like the heroes.
- His name, look and voice are yours to choose.

### 6.2 How a guided step looks
- The screen dims except the target, which gets a soft lantern glow and a pointing hand.
- Wick's portrait and one or two short lines sit on the side away from the target.
- **Forced steps:** in the first session, only the target takes a tap.
- **Soft steps:** after the first session, a tap anywhere moves on.
- Battles pause for Wick only in 1-1, twice. This changes campaign spec §8.1, which says tips never block a battle.

### 6.3 The goal tracker
- **One goal at a time,** always on the camp screen, such as "Recruit your first hero", "Clear 1-1", "Look at your hero's rules", "Hire your free recruit" or "Build the Toll House".
- **Go** takes you straight there.
- **Each goal pays a little** when it's done, such as gold or a Healing Draught *(tune)*. That keeps rewards coming through the first hour.
- **Tapping the tracker** shows the chapter's checklist: what's done, the current goal, and what's next.
- After Region I it simply points at the frontier stage.

### 6.4 The first session: forced, about 10 minutes

Wick's lines are drafts.

| # | Where | Wick says | You do |
|---|---|---|---|
| 1 | Camp, after the title | "The road's gone dark, and it wants a lantern-bearer. The board will find you one." | Tap the Recruit Board |
| 2 | Recruit Board, showing the three starters | "Three would carry the lantern. Tap each to hear about them." | Tap a card. Wick gives one line on each. |
| 3 | The same | Sellsword: "Hits hardest, up front. Simple and strong." · Hexblade: "Curses that tick. Patient, and hard on healers." · Pilgrim: "Heals, and burns the dead. Slow, but hard to kill." | Hire one, free |
| 4 | Camp | "A bearer needs a road. That's the signpost." | Tap the Road |
| 5 | Road | "Each lantern is a stage. Light the first." | Tap 1-1, then Set out |
| 6 | Battle 1-1 | Paused at the first turn: "Battles fight themselves. The flags show who acts next." Later: "Speed it up, or skip to the end." | Watch |
| 7 | Results popup | "Your first level. Each one brings a stat point." Then, at the fatigue bar: "Every turn tires a hero a little. They rest at camp." | Tap Camp |
| 8 | Camp | "Your hero fights by rules. Let's look at them." | Tap the hero, then Rules |
| 9 | Rules | "Rules run from the top. The first one that fits is used." | A guided look at the two starter rules |
| 10 | Battle 1-2 | "The flag names the rule that chose the move." | Watch |
| 11 | Camp | "The board has a free recruit for you." | Hire the second hero |
| 12 | Party | "Sturdy heroes in front, the rest behind." | Set the formation |

After step 12 the forced session ends and the goal tracker takes over. This keeps design.md's pace of a first recruit within 10 minutes.

**Tuning this needs:** step 7 assumes 1-1 brings the first level-up. Today 1-1 gives 5 XP and no level, so its first-clear XP needs raising *(tune)*.

**Change to design.md §6:** the first pick happens at the Recruit Board, which stands open from the start in a first-pick mode with the three starters, free. After the pick it shows "New faces after 1-2" until 1-2's first clear opens it as it works today.

### 6.5 Unlock moments: the rest of Region I

Every first-clear unlock in campaign spec §5.3 gets three things:
1. **A line on the results popup,** such as "New: Party items".
2. **Wick's card back at camp:** icon, name, one line, with **Show me** (a guided visit of two to four steps) or **Later**.
3. **The next goal** uses it.

| Unlock | Guided visit |
|---|---|
| Party items (1-3) | The loadout and the draught rule; in the next battle, a pointer at the draughts |
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
- **Settings → Replay the guide** plays Wick's explanations again on your current save, without forced taps.
- **The forced first session can't be skipped on a new save.** For play-testing, the Prototype panel can skip it.

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
