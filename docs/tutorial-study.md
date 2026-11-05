# Tutorial Study: how Wick should lead

From play-test session 2 (2026-11-04), note 2.1: "there is no background or story behind this at all. It honestly makes no sense. The guide is doing a really poor job introducing the game."

This study covers:
- what research and practice say about guiding a new player
- how Idle Heroes and Darkest Dungeon open
- where our first session falls short
- how Wick should lead instead, with a draft premise

Nothing here is built. It's for us to discuss.

**Note 2.3:** the lantern premise is replaced by `docs/story.md`, approved on 2026-11-05. §5 has the first session with the new story. The lines quoted in §3 are today's, which assume the lanterns.

## 1. What the research says

| Finding | Source | For us |
|---|---|---|
| **Tutorials pay off in complex games.** A study of over 45,000 players tried eight tutorial designs in three games. Tutorials raised play time by up to 29% in the most complex game, and made no significant difference in the two simpler ones. Help shown at the moment it's relevant could raise engagement. How much freedom a tutorial left players didn't change what they did. | Andersen et al., CHI 2012 | Ours is the complex kind: tactics, gear, skills, formation, fatigue and buildings. The guide is worth getting right. Teach each thing where it's used. Locking the player in isn't what makes a tutorial work. |
| **Why before how.** A slow walk through the basics is a poor way to show what a game is about and what its goal is. A hook should make players curious and carry them into the tutorial. Teach only what the first hour needs. Long opening cutscenes delay play. | Filament Games; BKOM Studios; Game Developer, "the 10-minute rule" | Open with the premise and the goal, briefly, then play. |
| **Ten tips from Plants vs. Zombies:** <br>• teach by doing <br>• spread the teaching out <br>• about eight words on screen at a time <br>• let an action's result teach it <br>• show tips only to players who need them <br>• cut every message that's neither useful nor fun, or players learn to skip them all | George Fan, GDC 2012 | Shorter, plainer lines, and fewer steps that only explain. |
| **Just in time.** Help that appears when the player meets the thing (the tech tree explained when you open the tech tree) beats lessons up front. | Soren Johnson (Civilization V), in Game Developer | Move each lesson that leaves nothing to do to the moment it matters. |
| **Fade the help.** New players respond well to full guidance the first time, less the next, then none. | "L2P NOOB", *Loading* journal | Hold the player's hand the first time only. After that, a hint, then the goal tracker. |
| **Competence and autonomy** (the PENS model). One designer credits dropping a tutorial with making players feel capable and free. | Game Developer, "The art of the tutorial" | Early wins, real choices, and never trapped. |
| **Short, and then a hand-off.** AFK Arena's forced tutorial is over in under five minutes, and its first two battles can't be lost. Then a quest list with rewards already waiting takes over. | Udonis | Keep the forced part short, and hand off to the goal tracker. |
| **Mechanics can carry the story.** In Darkest Dungeon every dungeon and monster is the Ancestor's doing, and the opening casts you as the heir sent to clean up his ruin. | Marchitto, "Darkest Dungeon and narrative context" | Our systems carry the story only where it fits: the road you clear is yours, travellers pay tolls on it, and rest is time at the fire (`docs/story.md`). |
| **Test the tutorial.** Track it step by step as a funnel, and test it on people who've never played. | GameAnalytics | Your walkthrough is the first such test. |

## 2. How Idle Heroes and Darkest Dungeon open

**Idle Heroes** (your 60 screenshots, `docs/idle-heroes-study.md`):
- **It has no story.** After the title, a host character welcomes you to the land as an adventurer, asks your name, praises it and offers to show you around. That's all the premise there is.
- **That works because its premise needs no explaining.** Heroes, a summoning circle and a campaign against monsters (a dragon sits on the Campaign building) are a story every player already knows. Each step's reason is obvious: you need heroes, so you summon, and once you have heroes, you fight.
- **Its lines are plain.** None uses a word it hasn't explained.

**Darkest Dungeon:**
- **A narrated opening** says what went wrong (the Ancestor's digging woke something under the estate), who you are (his heir) and what you're there for (to take it back).
- **Then a short playable trip:** two heroes, a bandit ambush on the road, and arrival at a ruined hamlet. You learn to fight already knowing why you're fighting.
- **The narrator keeps commenting** on what you do, so the story runs through the play.

**Lantern Road today:**
- **Our premise isn't one players know already:** a road whose lanterns went out, a camp called the Hearth, heroes who carry lanterns. The game never tells it.
- **Wick only hints at it** ("The road's gone dark. Someone has to light it again.") and moves on.
- **What follows:** Idle Heroes can skip the story because players bring their own, but we can't. We need Darkest Dungeon's opening, kept to Idle Heroes' length.

## 3. Our first session against it

After Wick's welcome, a new player can't answer these:
- **Who is Wick, and why is he helping?** He never says.
- **Who am I?** Wick calls you "a traveller", then finds you "a lantern-bearer". So you don't carry the lantern? Then what do you do?
- **What happened?** Why is the road dark, what's out there, and why does lighting it matter?
- **What's the Hearth?** He offers to show it, then shows only the Recruit Board.
- **What's the goal?** Nothing beyond the next stage. The end of the road and its boss never come up.

Line by line. The **Instead** column assumed the lanterns; §5 replaces it.

| Step | Wick says now | The problem | Instead |
|---|---|---|---|
| Welcome | "Ah, a traveller. Come and sit by the fire." | Doesn't say who he is or where you are | He says who he is and where you are |
| Welcome | "The road's gone dark. Someone has to light it again." | A hint, not a premise: which road, why dark, why me? | The prologue tells it |
| Show | "Let me show you the Hearth." | Then he doesn't | He says what the Hearth is: the last fire, and now yours |
| Board | "Let's find you a lantern-bearer." | Uses a word before explaining it | "You'll need heroes to carry a lantern for you." |
| Set out | "A bearer needs a road. Set out when you're ready." | A riddle that gives no reason to go | The action and its reason: "Take [hero] down the road. Light the first lantern." |
| Road | "Each lantern is a stage." / "Light the first." | Never says how a lantern gets lit | "Each lantern is a stage. Win the fight to light it." |
| 1-1 | "Battles fight themselves. The turn order shows who acts next." | Fine | Keep it, a little shorter |
| Results | "Every turn tires a hero a little. They rest at the Hearth." | Nothing to do about it yet | Moves to the first time a hero is tired (already a first-time tip, campaign spec §8.3) |
| Back home | Nothing about the lantern | The win's meaning is never shown | A payoff: the first lantern burns on the road |
| Tactics (steps 8–9) | "Your hero fights by tactics. Let's look at them." / "Tactics run from the top…" | A lesson with nothing to do: with two starter tactics, there's no choice to make | Spend the first stat point here instead, an action with a result. Tactics come at 1-3 (see §5). |
| 1-2 | Forced again: "On to 1-2." | No room to show you've learned it | A soft pointer only, so you do it yourself |
| Goodbye | "That's the road. I'm by the fire if you need me." | No goal, and no reason to come back | The next goal, the region's end, and what will be waiting when you return |

**What already works, and stays:**
- one action per step, with the rest dimmed
- short lines
- a guide with a face and a name
- first battles that can't be lost
- the free first pick and an early level
- Wick standing clear of what he points at

That's the Idle Heroes half, and it stays.

## 4. How Wick should lead

1. **Why before how.** The player hears the premise and the goal before their first tap.
2. **Every step says what to do and why,** in the world's terms. The next line or the screen then shows what it did.
3. **None of our words before it's explained.** Each of Hearth, stage and tactics comes with what it is, in the same line, the first time.
4. **One thing at a time, when it's used.** A lesson with nothing to do moves to the moment there is something to do.
5. **Do, don't read.** A step is a tap with a result, not a paragraph.
6. **Short.** About eight to twelve words in a bubble, and at most two short sentences in the panel.
7. **Fade the help.** Forced the first time, a soft pointer the second, and the goal tracker after that.
8. **Never trapped.** Help and Settings always work (note 2.2). The story can be skipped. No step can leave you stuck.
9. **Wick is a person.** He has a name, a face, a reason to help and a voice: warm, dry, a little tired. He stays reachable.
10. **The goal stays in sight:** the next stage, the region's boss and the end of the road.
11. **The session ends with a reason to come back.**

**The test:** after the first session, a new player can answer four questions:
- Who am I?
- What am I trying to do?
- How do I do it?
- Why come back?

Today they can't answer any of them.

## 5. The first session, with the story

Wick's lines come from the opening in `docs/story.md`. The rest are drafts in his voice. Steps marked **New** or **Unforced** change the guide built in PR #31 (onboarding spec §6.4).

| # | Where | Wick says | You do |
|---|---|---|---|
| 1 | The Hearth, after the title, in Wick's panel | "Another company. Come in. Sit by the fire." · "I'm Wick. I keep the inn here, at the gate." · "Fifty years ago, the king over that wall wanted to rule forever." · "So he learned to raise the dead. When he died, he rose again, hollow." · "His people fled, so he raised their dead to serve him. We walled him in." · "Now the crown has an offer: clear the old road, and keep what you clear." | One tap a line. Skip jumps to the name box |
| 2 | The same | "Who's in charge?" · "[Name]. Welcome to the Hearth. Your company can camp here." · On the Recruit Board: "First, you'll need heroes. The Recruit Board's there." | Give a name (with none, you're "Captain"), then tap the board |
| 3 | The Recruit Board, first pick | "Three looking for work. Tap each to hear about them." Then a line on each, as now. **New:** at the reveal, the hero says why they signed on, from the bible's class table. The Sellsword: "Someone's paying. That's all I need to know." | Tap a card, Hire (free), see the reveal |
| 4 | The Hearth | On Set out: "The road starts at the gate. Take [hero] through." | Set out: the camera flies up the road |
| 5 | The road | On 1-1: "Each stage is a stretch of road. Win its fight, and the stretch is yours." · On the card's Set out: "Clear the first." | Tap to go on, then Set out |
| 6 | Battle 1-1, paused twice | As now: "Battles fight themselves. The turn order shows who acts next." · "Speed it up, or skip to the end." | Tap to go on, then speed or Skip |
| 7 | The results | On the XP bar: "Your first level. Each one brings a stat point." · On Hearth: "Back to the Hearth." | Tap to go on, then Hearth |
| 8 | **New: Grow.** The Hearth, then the hero's Stats tab | On Heroes: "[Hero] has a stat point. Let's spend it." · On the stats: "Tap + on a stat, or Auto to let them choose." · Once it's spent: "Stronger already." | Heroes → the hero → spend the point → ‹ back |
| 9 | **Unforced:** 1-2 | The goal tracker says "Clear 1-2", and Set out glows, with nothing dimmed or locked. On the road, on 1-1: "First stretch cleared. It's yours now." The battle doesn't stop. On the results' New chip: "The Recruit Board is open." | Set out yourself, watch, then Hearth |
| 10 | The Hearth, then the board | As now: "The board has a free recruit for you." · "Three new faces. Tap each to hear about them." The new hero says their line at the reveal. | Hire one (free) |
| 11 | Formation | As now: "Two of you now. Let's find them a place.", the row callouts and the drag, then "Well placed." | Place the new hero, then Done |
| 12 | The Hearth | "The Sexton's at the end of the Gravefields. Plenty of road before him." · "I'll be by the fire." | Tap to go on. The goal tracker takes over with "Clear 1-3" |

**Length:** about as now. The story adds four taps, and Grow, the unforced 1-2 and the moved fatigue line take off about as many.

**Moved out of the forced session:**
- **Tactics** come at 1-3's first clear. That clear brings party items and the draught tactic, "Ally: health below 50% → Healing Draught". It's the plainest first example of *when → do*. The hero's own tactics come right after it: "Your hero has tactics like this too." This merges with the Party items visit (onboarding spec §6.5), and follows campaign spec §8.1: problem first, answer second.
- **Fatigue** comes as the first-time tip when a hero first gets tired (campaign spec §8.3).

**Also in the same build:**
- **Help and Settings work at every step** (note 2.2). Wick steps aside while their panel is open, and comes back when it closes.
- **"Captain"** replaces "Traveller" when no name is given.

**Left for the rename pass** (`docs/story.md`, "Words that change"): lit → cleared, dark → ahead, the Toll House's line, the glossary, Wick's line on each region card, and the lantern art. The lines above already use the new words.

## 6. The premise

Chosen on 2026-11-05: `docs/story.md`, spine A, "the Fallen Kingdom". You run a company of heroes for hire. You clear the old road through a kingdom that fell fifty years ago to its hollow king, and keep what you clear. Wick keeps the inn at the gate, and wants to go home. The lantern premise and the dropped drafts are in `docs/story-options.md`.

## 7. To decide together

**Settled:**
1. **The story:** `docs/story.md`, approved 2026-11-05.
2. **How it's told:** Wick tells it at the fire, one tap a line, with Skip. It needs no new art; four pictures could come later.

**For the first-session build,** with my pick:
3. **The order:** spend the stat point in the first session, and move Tactics to 1-3 and fatigue to its first-time tip? **Yes.** Today's Tactics visit has nothing to choose, and fatigue has nothing to do yet.
4. **A reason to come back:** tolls start at 1-5 with the Toll House, about 17 minutes in. The story now backs earlier tolls: travellers pay to use the road you've cleared, even while you're away. Should every cleared stage earn a small toll from 1-1, with the Toll House raising it? Wick's goodbye would then add "The road earns tolls while you're away. Come back and collect." **Yes,** as Idle Heroes shows idle loot in its first session. The amounts are yours to approve.
5. **Skipping the guide** from Settings, for players who've played before? **No.** The story can be skipped, and the forced part is short. The Prototype panel keeps its skip for play-testing.

**For the rename pass, later:**
6. **The game's name:** "The Lost Kingdom" for now, your working title (2026-11-05). It's a common name, so check the app stores before release.
7. **New subjects for the lantern art** (the title screen, the crest, the region emblem and the stage markers): the bible suggests the gate and the inn's fire.
8. **The Old Beacon:** make it the wall's old warning beacon, as scenery?

## Sources

- Andersen, O'Rourke et al., [The Impact of Tutorials on Games of Varying Complexity](https://grail.cs.washington.edu/projects/game-abtesting/chi2012/), CHI 2012
- [10 tutorial tips from Plants vs. Zombies creator George Fan](https://gamedeveloper.com/design/gdc-2012-10-tutorial-tips-from-i-plants-vs-zombies-i-creator-george-fan), Game Developer, GDC 2012
- [The art of the tutorial: when to hold a player's hand, when to let it go](https://gamedeveloper.com/design/the-art-of-the-tutorial-when-to-hold-a-player-s-hand-when-to-let-it-go), Game Developer
- [L2P NOOB: Examining Tutorials in Digital Games](https://loading.journals.publicknowledgeproject.org/index.php/loading/article/view/109), *Loading*
- [How to design the first five minutes of your game](https://www.filamentgames.com/blog/how-design-first-five-minutes-your-game), Filament Games
- [All aboard](https://www.bkomstudios.com/blog/all-aboard/), BKOM Studios
- [History, mystery and story: games and the 10-minute rule](https://gamedeveloper.com/design/history-mystery-and-story-games-and-the-10-minute-rule), Game Developer
- [First-time user experience in mobile games](https://www.blog.udonis.co/mobile-marketing/mobile-games/first-time-user-experience), Udonis (AFK Arena)
- [Darkest Dungeon and narrative context](https://matthewmarchitto.substack.com/p/darkest-dungeon-and-narrative-context), Matthew Marchitto
- [The Ancestor](https://darkestdungeon.wiki.gg/wiki/The_Ancestor), Darkest Dungeon wiki
- [Tips for a great FTUE in F2P games](https://gameanalytics.com/blog/tips-for-a-great-first-time-user-experience-ftue-in-f2p-games), GameAnalytics
