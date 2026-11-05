# The First Session, Rebuilt (D3)

**Status:** approved 2026-11-05, with every recommendation in §6. It covers play-test notes 3.5, 3.9, 3.10 and 3.11 (`docs/playtest-log.md`, Session 3), and replaces the step list in `js/firstsession.js` and `docs/tutorial-study.md` §5. Builds as B5 (the quest-giver) and B7 (the session), after the hero screen (D1) and the Recruit Board (D2).

**How the steps work** (unchanged from PR #35): one action a step, Wick's line beside it, a pointer on the one thing to tap. Help and Settings always work. **Forced** steps hold every other press; **soft** steps hold nothing. From note 3.8: forced steps use a light dim, and steps that explain a screen (stats, gear, the board, Formation, the plots) use none, so the screen stays readable.

**Resuming (3.6):** a reload starts the current step again. A step that lives on a screen the reload closes (the hero screen, the board, Formation) starts again from the Hearth step that opens that screen. A step already done (a point already spent, a piece already worn) is skipped. A battle that finished while the app was closed skips its battle steps.

**Anchors:** steps marked **D1** or **D2** point at anchors (`data-tut`) the new hero screen and Recruit Board must provide. They don't depend on today's layouts. The anchors are listed at the end.

## 1. The steps

| # | Where | Wick says (Bess, where marked) | You do | Hold | Resume at |
|---|---|---|---|---|---|
| 1 | The Hearth, Wick's panel | The story, six lines, as now ("Another company. Come in. Sit by the fire." … "Now the crown has an offer: clear the old road, and keep what you clear.") | A tap a line. Skip goes to 2 | Forced | The line you were on |
| 2 | The Hearth | "Who's in charge?" · "[Name]. Welcome to the Hearth. Your company can camp here." · On the board: "First, you'll need heroes. The Recruit Board's there." | Name yourself, tap the board | Forced | The name box |
| 3 | The Recruit Board: the first pick **(D2)** | "Three looking for work. Tap each to hear about them." The card shows **Free**. At the reveal the hero says why they signed on. | Tap a card, Hire, see the reveal | Forced, no dim | The pick, with the same three |
| 4 | The Hearth | On Set out: "The road starts at the gate. Take [hero] through." | Set out | Forced | Here |
| 5 | The road | On 1-1: "Each stage is a stretch of road. Win its fight, and the stretch is yours." · On Set out: "Clear the first." | Set out | Forced | Step 4 |
| 6 | Battle 1-1, paused twice | "Battles fight themselves. The turn order shows who acts now, and who's next." · "Speed it up, or skip to the end." | Tap on, then speed or Skip | Forced | Skipped if the battle finished |
| 7 | The results | On the XP bar: "Your first level. Each one makes them stronger." · **New,** on the two gear rows: "Gear, off the road. We'll put it on." · On Hearth: "Back to the Hearth." | Tap on, then Hearth | Forced | Step 8 |
| 8 | The Hearth | On Heroes: "[Hero] has a stat point. Let's spend it." | Heroes → the hero | Forced | Here |
| 9 | The hero: stats **(D1)** | "Each level brings a stat point. Tap a stat to hear what it does." Each stat answers with its line (below) | Tap two stats or more, then Next | Soft taps, no dim | Step 8 |
| 10 | The hero: stats **(D1)** | "Tap + on the one you want, or Auto." · Once kept: "Stronger already." · "Keep levelling. Bigger rewards come later." | Spend the point, Keep | Forced, no dim | Step 8, or 11 if spent |
| 11 | The hero: gear **(D1)** | On the weapon slot: "Now the gear you found. Weapon first." · On the new weapon in the picker: "Wear it. Watch the numbers." · Once worn: "Every piece changes their numbers, and their look." | Weapon slot → the new weapon → Wear | Forced, no dim | Step 8 (Wick: "[Hero]'s new gear is waiting. Let's put it on.") |
| 12 | The hero: gear **(D1)** | "Now the armour." · Once worn: "Weapon, armour, accessory. Some pieces cost as much as they give." | Armour slot → the new armour → Wear, then ‹ back | Forced, no dim | Step 8, or 13 if worn |
| 13 | The Hearth | On the board: "One hero won't clear the road. The board has more." | Tap the board | Forced | Here |
| 14 | The Recruit Board: a paid hire **(D2)** | On the prices: "This lot want paying. The crown's advance covers one." At the reveal the new hero says their line. | Tap cards, Hire one: the price comes off the purse | Forced, no dim | Step 13 |
| 15 | The Hearth → Formation | On Formation: "Two of you now. Let's find them a place." · The Front and Back callouts and the hand, as now: "Sturdy heroes in front, the rest behind." · On Done: "Well placed." | Place the new hero, Done | Forced, no dim | The Formation button |
| 16 | 1-2, directed | Set out glows; nothing dims. On the road, on 1-1: "First stretch cleared. It's yours now." The battle doesn't stop. | Set out yourself, watch, Hearth | Soft | Set out |
| 17 | The Hearth: buildings | "Companies that stay, build. Drag to look round the camp." A hand shows the drag. | Drag to the buildings view | Forced, no dim | Here |
| 18 | The buildings view | On the plots: "Each plot takes one building. It needs gold, bone dust and a plan." · On an empty plot's panel, which says **No plans**: "No plans yet. I know someone who can help." | Tap a plot, then back to the fire | Forced, no dim | Step 17 |
| 19 | The Hearth | Bess's cart rolls up the road and stops by the fire. Wick: "That's Bess. She drives the carts on your road. Hear her out." | Tap Bess | Forced | Here (her cart already stands there) |
| 20 | Bess's panel | **Bess:** "Folk want to use your road. They're too scared to." · "Something past the graves keeps digging up the dead." The quest card (§4). | Accept | Forced | Here |
| 21 | Bess's panel | **Bess:** "Stop it, and the travellers will make it worth your while." · "I'll have smaller jobs most days, too." | Tap on | Forced | Step 22 |
| 22 | The Hearth, Wick's panel | "That's the job. The rest is up to you." · "Not everything's open yet. The road opens it." · "Fight, level up, hire more hands. That's the work." · "Questions? I'll be by the fire." He walks back to his seat. | Tap on. **Full control.** The goal tracker shows the quest, "The Sexton · 1-18", and "Next: 1-3". | Forced | Here |

**The stats' lines** (step 9; plain versions of the glossary's):

| Stat | Wick |
|---|---|
| Health | "How much harm they take before they fall." |
| Mana | "Pays for skills. Basic attacks fill it back up." |
| Power | "How hard they hit, and how much they heal." |
| Defence | "Takes a bite out of every hit." |
| Speed | "How often they act. Fast ones tire sooner." |
| Crit | "The chance a hit lands extra hard." |
| Dodge | "The chance a hit misses them." |
| Resistances | "Harder to stun, poison or burn." |

**What the steps need from the game:**
- **1-1 always drops a weapon and an armour** on its first clear, in place of today's one gear roll. Both are level 1, Fine (a step up from the starting Common weapon), and fit the hero: a weapon of their class's type, and armour of a weight that suits their row (medium in front, light at the back). Pick pieces with no cost line, so the first lesson is simply "better". (`Campaign.earn`, `Items.roll` with `slot` and `rarity`.)
- **The board opens at 1-1's first clear,** not 1-2's (`BASE_UNLOCK_STAGE`, 1-1's and 1-2's `first` lists).
- **1-2 is fought with two heroes:** its recommended party goes from 1 to 2, and a Shambler moves to the back row so Formation matters there *(tune)*.
- **Bess and her cart** are new art at the Hearth, with an idle animation (3.13).

**Length:** about 4 minutes longer than now. The gear lesson, the paid hire, the buildings and Bess add about 14 taps; the old goodbye's three lines and the Grow tab's back-and-forth come out.

## 2. What moves

| Lesson | Now | Becomes |
|---|---|---|
| Formation | After 1-2 | Before 1-2 (step 15) |
| The second recruit | Free, after 1-2 | Paid, after 1-1 (steps 13–14) |
| Gear | Never taught | Steps 11–12 |
| Buildings | Never taught | Steps 17–18 |
| The Sexton, Wick's goodbye | Wick's line "The Sexton's at the end of the Gravefields." | Bess's quest |
| Tolls | Wick's goodbye line | A first-time line on the first "While you were away" sheet: "The road earned tolls while you were gone." |
| Party items and tactics | Visit at 1-3's first clear | Unchanged |
| Skill points | Not mentioned in the session | **New visit,** when any hero first reaches level 5: card "New: Skill points", then two steps on the hero's skills **(D1)**: "A skill point. Learn a new skill, or sharpen one." · "Equip it here. Up to two at once." |
| Fatigue | First-time tip when a hero first tires | Unchanged |
| Keep going (1-6) | Unlock with its tip | Unchanged |
| The first building | Toll House blueprint at 1-5 | Bess's quest reward (§4, decision 1). Then a visit: "The travellers sent a plan. Build it on a plot." on the lit plot |
| Daily jobs | None | Bess's card "New: Daily jobs" on the first return home after the session (§4) |
| Settings → Replay the guide | Replays everything | Points to Wick's menu (§3) |

**Region I's unlock visits** become, in order: Party items and tactics (1-3), Skill points (level 5), Daily jobs (the first trip home after the session), the first building (the Sexton). Rule conditions from first clears keep their New chip on the results and their dot on Tactics, with no visit. Building unlocks in Region I depend on decision 1.

## 3. Wick's menu

After the session, tapping Wick at the fire opens his panel, with three things:
- **A hint:** one line on what to do next, the first that fits from the list below.
- **Lessons:** each lesson seen so far, by name, which replays it as soft steps: The story · The road · Battles · Levels and stats · Gear · Recruiting · Formation · Buildings · Quests, then each visit as it's seen (Party items and tactics, Skill points, Daily jobs, …).
- **Codex:** opens it.

**The hint, first that fits:**

| State | Wick |
|---|---|
| A hero has unspent points | "[Hero] has points to spend." |
| A better piece sits unworn in the Bag | "There's gear in the bag nobody's wearing." |
| The frontier stage was lost last time | "1-5 beat you. More levels, better gear, or a new formation." |
| Most of the party is Weary or worse | "They're tired. Let them rest, or send fresh ones." |
| The board has a pick, you can pay, the party has room | "New faces on the board. You can afford one." |
| A quest is done and not claimed | "Bess has something for you." |
| The story quest is on | "The Sexton's at 1-18. Keep clearing the road." |
| Otherwise | "Next stretch is 1-7. The road's waiting." |

## 4. Bess and her quests

**Bess** *(working name)*, the carter. She drives the carts that carry travellers along the road you've cleared, so her trade grows with yours. Stout, in a wide hat and a muddy coat, with a whip over her shoulder. Her covered cart stands by the fire where the road leaves the camp, with notes pinned to its side. She arrives with a cart after 1-2, when there's a road worth driving. Her voice: blunt, practical and cheerful about money. "Jobs" is her word for quests; the screen says **Quests**.

**The first quest** (the same for everyone):
- **Name:** The Gravedigger
- **Text:** "Travellers won't take the road. Something past the graves digs up the dead and sets them on the carts."
- **Goal:** Defeat the Sexton · 1-18
- **Reward:** the travellers' gift, the **Toll House** plan.
- **Why the Toll House:**
  - It's the story's own building. The travellers you saved pay to use the road, and Wick's line when it's built already says "Travellers have heard the road's open. They'll pay to use it."
  - It's the cheapest building (240 gold, 8 Bone Dust), so it can be built the moment the plan arrives.
  - It brings the first idle gains, which give a reason to come back.

**Daily jobs, the first build** *(tune)*:
- **3 a day,** reset at local midnight, with a timer on Bess's panel. They open on the first trip home after the session, never during it.
- **Kinds,** 3 drawn a day with no repeats, only from kinds you can do now:
  - Win 5 battles
  - Clear 3 stages (replays count)
  - Defeat 30 foes
  - Defeat 10 of a family (undead, beasts) found in your furthest region
  - Collect tolls once
  - Use 2 party items in battle (from 1-3)
- **Rewards:**
  - Each job: 60 × S gold and 5 of your furthest region's material (S is the frontier's gold scale).
  - All three done: a bonus of one gear roll at the frontier, Fine or better, and one party item.
- **Claim** on each job. A dot on Bess means something is ready.
- **Saved** in `save.quests`: the story quest's state, and `daily: { day, jobs: [{ kind, need, done, claimed }], bonus }`.

**Later, not in the first build:** weekly jobs, rerolling a job, streaks, and Bess's story quest for each region's boss, each with a plan as its reward.

## 5. Recruit prices (3.5)

- **The first pick is the only free recruit.** Every hire after it costs **150 × S × quality**, the home-base spec's formula, unchanged: 162–225 gold at level 1. The board's `free` flag goes. The first pick is a separate start, so it stays free.
- **The board shows each recruit's price on their card,** and Hire says it again ("Hire · 190") **(D2)**.
- **The guide teaches it** at step 14: Wick names the cost, and the purse ticks down when you hire.
- **Guaranteed to afford it:** starting gold goes from **100 to 300**, Wick's "crown's advance". By step 14 you hold about 338: 300, plus about 38 from 1-1's first clear (9.6 in spoils, 28.8 for the clear). The dearest level-1 recruit is 225, and nothing can be bought before then, so it always fits, with 113–176 to spare.
- **The economy:** the free recruit was worth 162–225, and the extra starting gold is worth about the same. So the home-base spec's §10 gold check stays about where it was. With the Toll House still at 1-5, you'd hold 70–196 gold at 1-6 after the third hire, against 95–160 before.

## 6. Decisions for you

1. **No building before the Sexton?** Your note makes the quest's plan the first building, so Region I's building unlocks (Toll House 1-5 to Salvage Pit 1-16) would move to after the Sexton.
   - **Recommendation:** do as the note says. Region I becomes heroes, gear, recruits and the road. The other blueprints move to Region II's early first clears, or later become Bess's boss-quest rewards.
   - **The risk:** the Sexton's wall gets harder without the Infirmary and Training Yard (the sim already needed 8½ h of rest there). Watch it in your next play-through.
   - **The alternative:** make the first quest the Gravewarden at 1-9, the region's midpoint, and the Sexton the second.
2. **The first building:** the Toll House (recommended, for the reasons in §4), or the Infirmary for fatigue, or the Training Yard for catching recruits up.
3. **Affording the paid recruit:** 300 starting gold as "the crown's advance" (recommended: one number, no new rule), a fixed bounty on 1-1's first clear, or a cheaper first paid hire.
4. **The quest-giver:** Bess the carter (recommended: the travellers, the tolls and the road all run through her), a crown clerk posting bounties, or a crier as in Darkest Dungeon.
5. **When daily jobs start:** on the first trip home after the session (recommended: one new thing at a time), or at once alongside the Sexton quest.
6. **1-2 with two heroes:** recommend 2 in its party and a back-row Shambler, so Formation matters at once.
7. **Stats in step 9:** tap each stat to hear its line (recommended: do, don't read), or one callout listing all eight.
8. **Wick's menu replaces Settings → Replay the guide:** recommended, with Settings pointing to it.

## Anchors the redesigns must keep or add

- **The hero screen (D1):**
  - `hero-stats`, and `hero-stat-<key>` on each stat and on the resistances
  - the + buttons, `hero-auto` and `hero-keep`
  - `hero-slot-weapon`, `hero-slot-armor` and `hero-slot-accessory`
  - `gear-pick` (a piece in the picker, with `data-uid`) and `gear-wear`
  - `hero-skills` and `hero-skill-slot`
  - `hero-back`
- **The Recruit Board (D2):** `pick-card` (each), `pick-price`, `pick-hire`, `pick-reveal` and `pick-says`; one panel for both the free first pick and paid hires.
- **The Hearth:**
  - `hearth-heroes`, `hearth-formation` and `hearth-setout`
  - the scene's anchors for the board, the plots, Wick (`wick`) and Bess (`bess`)
  - `quest-card` and `quest-accept` on Bess's panel
