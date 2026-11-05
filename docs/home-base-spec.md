# Lantern Road: Home Base Spec

Draft 2 for review, 2026-11-04. It includes your answers to draft 1's questions, and the coordinator's overnight decisions on the last five. It covers build step 5 (the home base) and the item economy. It follows `docs/design.md`, which stays the source of truth, and `docs/content-spec.md` for classes, items, statuses and fatigue. Nothing here is built yet, and there is no game code in this document.

## 1. How to read this

- Every number is a starting value to adjust in play-testing. A table whose heading carries *(tune)* means every number in it; a number in running text carries its own mark.
- Where the docs didn't settle something, this spec proposed an answer and listed it in section 12. Nothing is still open now. The coordinator decided the last five overnight, and each is marked "(decided overnight, review)" so you can find it.
- **Already decided, and followed here:**
  - Nothing refills for free. Party items come from timed free potions, loot drops, stage rewards, the Shop and buildings that brew them. Unwanted items sell for gold.
  - The Masters' Hall trains a character, away for idle time, to gain a skill slot or a rule slot. Every character starts with 3 rule slots.
  - Gear progression is undecided. This spec only defines a placeholder **gear roll** whose quality improves at higher stages.
  - Renown only clears plots. Recruit picks and the roster cap come from buildings.
- **Owned elsewhere:**
  - The campaign spec (`docs/campaign-spec.md`, in progress) sets each stage's level, foes, reward tier and first-clear unlocks. This spec defines what each reward tier contains.
  - This draft uses the campaign session's proposed tier names, region levels and Region I unlock order, so the two specs fit together.
  - Step 3 (characters) owns the XP curve.

### What changed in draft 2
- **The Recruit Board** stands in camp from the start, outside the plots, and can't be torn down.
- **No fatigue discounts.** The "easy road" is gone. A stage's fatigue cost is simply how long its battles take. So if play-testing shows fatigue rises too fast, the lever is battle length, which the campaign spec sets through foe health.
- **Loadout slots** 3 and 4 come from the Tactician, not the Shop.
- **Renown** now measures account progress in general: the road, battle experience, bosses, the company and the camp.
- **Passive-bonus buildings:** four, each with a focus setting, so they serve build variety: the Whetstone, Ossuary, Hexing Stone and Bell Tower.
- **Storied recruits:** the Recruit Board's top Veterans rank can bring recruits who are already combined or awakened.
- **Prices:** recruits cost a little less, and the Training Yard is priced like the other first-hour buildings, so the campaign's party sizes still fit now that the board doesn't use a plot.
- **Matched to the campaign spec's stage data:** the Toll House moves to 1-5, so 1-4 keeps its first condition reward to itself. You start with 100 gold, and summoned foes give no spoils.
- **Fatigue is +1 for each turn a character takes,** and nothing else adds it, as you decided in the campaign session. This replaces fatigue from damage and knock-outs, and the per-battle cap.
- **Settled:** the material rule, the tear-down rule, selling gear (no salvage for now), instant building, the Training Yard's ceiling, Spent below 50, and the Toll House at 1-5.
- **Decided overnight by the coordinator, for your review:**
  - Closing the app brings the party home after the current battle.
  - Shop prices rise by region.
  - Dismissing gives back only gear.
  - A combined character's rule-slot maximum is the highest among their classes.
  - The gear bag holds 60 pieces.

  Section 12 has the details.

## 2. Shared scales

### Stage level and the gold scale
Each stage has a level, **L**, set by the campaign spec. Gold, prices and gear scale with it through one number:

**S = 1 + L ÷ 5** *(tune)*

| L | 1 | 7 | 10 | 30 | 50 | 75 | 100 |
|---|---|---|---|---|---|---|---|
| S | 1.2 | 2.4 | 3 | 7 | 11 | 16 | 21 |

- **Frontier:** the level of your highest lit stage. Buildings that scale with progress, such as the Toll House, use the frontier's S.
- **Furthest region:** the latest region you've reached. Shop prices step up with it.

### XP
XP is measured in **levels' worth**: "10% of a level" at level L means 10% of the XP a character needs to go from L to L + 1, on whatever curve step 3 sets.

Battle XP is a share of a level at the *stage's* level. A character below the stage's level gains more than that share of their own level, and a character above it gains less. This keeps the numbers here valid whatever the curve turns out to be.

A first clear pays every character at least 30% *(tune)* of a level at the party's top character's level (the regions study §5.3, 2026-11-05; the campaign spec §5.4). Replays keep the plain rule. Renown's battle experience (section 8) still counts the stage's own share.

### Stage levels by region
These are the campaign session's proposed levels. The estimates in this spec use them, and the campaign spec decides the real ones.

| Region | I Gravefields | II Drowned Chapel | III Thornwood | IV Ashen Keep | V Hollow Throne |
|---|---|---|---|---|---|
| Stage levels | 1–10 | 11–30 | 31–50 | 51–75 | 76–100 |
| Material | Bone Dust | Chapel Wax | Heartwood | Cinder Iron | Throne Tallow |

## 3. Buildings

### Rules for every building
- **Plots:** you start with 3. Renown clears more (section 8), up to one plot per building type. The Recruit Board stands outside the plots, and the other 14 building types each need one, so there are 14 plots at most.
- **No Renown requirements.** Renown only clears plots, as the design says. A building becomes available to build when a campaign milestone is reached (the table below, and section 10).
- **Building and upgrading are instant.** There are no build timers, because fatigue and lessons already give the game its waits.
- **Costs** are gold plus one material:
  - **Levels 1 and 2** cost Bone Dust, so every building can be raised and improved once in Region I.
  - **Level 3 and up** cost the building's **home material**. Homes are spread over the five regions, so each building sends you back to one region to farm.
  - Each building has a cost factor applied to the standard costs below.
- **Tearing down** frees the plot and gives nothing back, as decided. A building raised again starts at level 1 and pays full price. To make that rule clear:
  - **What it taught stays:** conditions the Tactician taught, slots the Masters' Hall trained, respecs already done, characters already hired.
  - **What it provides goes:** party rule slots, roster cap, beds, loadout slots, the Shop, passive bonuses and idle output.
  - Before it comes down, anything stored in it is gathered, so nothing waiting is lost.
  - Nobody is forced out by a lower cap. Over the roster cap, you can't hire until you're under it. Rules in lost party rule slots are kept but switched off. Items in lost loadout slots go back to the Bag.
  - The Recruit Board can't be torn down. It doesn't use a plot, so there's nothing to free.
- **Each building level awards Renown once.** Rebuilding to a level you've reached before awards none (section 8).

### Standard costs *(tune)*
| Level | Gold | Material |
|---|---|---|
| 1 (build) | 300 | 10 Bone Dust |
| 2 | 1,000 | 20 Bone Dust |
| 3 | 3,000 | 25 home material |
| 4 | 8,000 | 40 home material |
| 5 | 20,000 | 60 home material |

### All buildings *(tune)*
| Building | Purpose | Home material | Cost factor | Becomes available |
|---|---|---|---|---|
| Recruit Board | Hires recruits | Bone Dust | Its own track costs | Built from the start, outside the plots. Opens when 1-2 is cleared. |
| Toll House | Idle: gold, or party items | Chapel Wax | ×0.8 | 1-5 cleared |
| Infirmary | Beds that speed fatigue recovery; brews items | Chapel Wax | ×0.8 | 1-7 cleared |
| Training Yard | Idle: XP for resting characters | Bone Dust | ×0.8 | 1-8 cleared |
| Shop | Sells party items and a little gear | Bone Dust | ×0.8 | 1-10 cleared |
| Tactician | Teaches rule conditions; more party rule slots and loadout slots | Chapel Wax | ×0.8 | 1-11 cleared |
| Scavenger Camp | Idle: materials from a region you choose | Heartwood | ×1.0 | 1-13 cleared |
| Barracks | Raises the roster cap | Heartwood | ×1.0 | 1-15 cleared |
| Salvage Pit | Idle: gear rolls of a slot type you choose | Cinder Iron | ×1.2 | 1-16 cleared |
| Masters' Hall | Trains skill slots and rule slots | Throne Tallow | ×1.5 | Region II opens, after the Sexton |
| Shrine | Respecs skill trees for gold | Heartwood | ×1.0 | Region II opens, before anyone reaches the level-30 free respec |
| Whetstone | Passive: +Power or +Crit | Cinder Iron | ×1.5 | Region III reached |
| Ossuary | Passive: +max Health or +Defense | Cinder Iron | ×1.5 | Region III reached |
| Hexing Stone | Passive: harmful effects land more often | Heartwood | ×1.5 | Region IV reached |
| Bell Tower | Passive: +resistances | Throne Tallow | ×1.5 | Region IV reached |

- The Region I stages follow the campaign session's proposed first-clear unlocks. The campaign spec owns where they finally land.
- Region V brings no new building. Like its conditions in the content spec, it tests what you've built.

### Recruit Board
Hires recruits (section 7). It stands in camp from the start, **outside the plots**, so it never competes with other buildings for one, and it can't be torn down. It opens when 1-2 is cleared, and your first recruit is free.

To start with, it shows **3 recruits**, allows **1 pick** per board, and recruits arrive at **level 1**. It then upgrades along three separate tracks, so you choose what to improve first:

| Track *(tune)* | Rank 1 | Rank 2 | Rank 3 | Rank 4 |
|---|---|---|---|---|
| **Notices:** recruits shown | 4 · 600 gold, 12 Bone Dust | 5 · 1,800 gold, 15 Bone Dust | 6 · 4,800 gold, 24 Bone Dust | — |
| **Picks:** hires per board | 2 · 1,200 gold, 24 Bone Dust | 3 · 3,600 gold, 30 Bone Dust | — | — |
| **Veterans:** recruit level | Up to 40% of your highest character's level · 1,000 gold, 20 Bone Dust | Up to 60% · 3,000 gold, 25 Bone Dust | Up to 80% · 8,000 gold, 40 Bone Dust | **Storied:** up to 90%, and some arrive combined or awakened · 20,000 gold, 60 Bone Dust |

**Storied recruits** come with the top Veterans rank *(tune)*:
- A recruit of level 50 or more has a 1-in-4 chance to arrive **combined** with a second class, picked from the classes that have joined the board.
- A recruit of level 100 or more has a 1-in-4 chance to arrive with **one skill awakened**. Since recruits arrive at up to 90% of your highest level, these are a late find.
- Like other veterans, they arrive with their points spent and a free respec. A combined recruit knows its second class's starter skill, as the content spec's combining rule gives.
- A storied recruit costs 1.5 times the usual price.

### Barracks
Raises the roster cap. Without it the cap is **8**: a full party of 6 and two to rotate in.

| Level *(tune)* | Roster cap | Cost |
|---|---|---|
| Not built | 8 | — |
| 1 | 11 | 300 gold, 10 Bone Dust |
| 2 | 14 | 1,000 gold, 20 Bone Dust |
| 3 | 17 | 3,000 gold, 25 Heartwood |
| 4 | 20 | 8,000 gold, 40 Heartwood |
| 5 | 24 | 20,000 gold, 60 Heartwood |

### Infirmary
Adds beds where resting characters recover fatigue faster than at the fire (section 6). From level 3 it also brews party items.

| Level *(tune)* | Beds | Recovery in a bed | Also | Cost |
|---|---|---|---|---|
| 1 | 2 | 20 per hour | | 240 gold, 8 Bone Dust |
| 2 | 3 | 22 per hour | | 800 gold, 16 Bone Dust |
| 3 | 3 | 26 per hour | **Still-room:** brews 1 Healing Draught every 6 hours, holding up to 4 | 2,400 gold, 20 Chapel Wax |
| 4 | 4 | 30 per hour | | 6,400 gold, 32 Chapel Wax |
| 5 | 5 | 35 per hour | Everyone at the fire recovers 14 per hour instead of 10. The still-room also brews 1 Smelling Salts every 24 hours, holding up to 2. | 16,000 gold, 48 Chapel Wax |

### Tactician
Teaches the rule conditions the content spec assigns to Tactician I, II and III, and adds party rule slots and loadout slots. Without it the party has **2** party rule slots, as built in step 2, and **2** loadout slots. Each lesson costs gold and a region's material, as the content spec asks.

| Level *(tune)* | Teaches | Party rule slots | Loadout slots | Cost |
|---|---|---|---|---|
| Not built | The starting conditions only | 2 | 2 | — |
| 1 | **Lesson I:** the thresholds (25–90%), Self: mana below, Self: row, Self: has / without, Self: fewer than N thralls, Ally: has / without, Foe: health below, Foe: the leader's target, Foe: without, One foe left, and the between-battle conditions "an ally fell" and "out of [item]". Also the Move action and Focus fire. | 2 | 2 | 240 gold, 8 Bone Dust |
| 2 | | 3 | 3 | 800 gold, 16 Bone Dust |
| 3 | **Lesson II:** Self: health above, Ally: mana below, Foe: highest health, Foe: has, Battle start, N or more allies below X%, and the Gather action | 4 | 3 | 2,400 gold, 20 Chapel Wax |
| 4 | **Lesson III:** the Switch rule set party action | 4 | 4 | 6,400 gold, 32 Chapel Wax |
| 5 | | 5 | 4 | 16,000 gold, 48 Chapel Wax |

- Lesson II needs Chapel Wax, so it arrives in Region II, where the content spec places it.
- Party rules and the loadout both live here because party rules are what use items on their own.

### Shrine
Respecs a character outside their level thresholds. All stat and skill points come back, and a class combination stays, as the content spec says.

**Respec price:** 150 × S at the character's level *(tune)*. That's 450 gold at level 10, 1,050 at 30, 3,150 at 100 and 6,150 at 200.

| Level *(tune)* | Effect | Cost |
|---|---|---|
| 1 | Respec any character for gold | 300 gold, 10 Bone Dust |
| 2 | Respecs cost 25% less | 1,000 gold, 20 Bone Dust |
| 3 | **Unlearn:** refund one skill's points for 20% of a full respec | 3,000 gold, 25 Heartwood |
| 4 | One free respec every 24 hours | 8,000 gold, 40 Heartwood |
| 5 | Respecs cost 50% less, instead of 25% | 20,000 gold, 60 Heartwood |

### Masters' Hall
Trains characters for skill slots and rule slots while they're away. Its levels decide which lessons it can teach and how many characters train at once. The lessons themselves are in section 9.

| Level *(tune)* | Rooms | Lessons it can teach | Cost |
|---|---|---|---|
| 1 | 1 | Rule slot IV, Skill slot I | 450 gold, 15 Bone Dust |
| 2 | 2 | Adds Rule slot V | 1,500 gold, 30 Bone Dust |
| 3 | 2 | Adds Rule slot VI | 4,500 gold, 40 Throne Tallow |
| 4 | 2 | Adds Skill slot II | 12,000 gold, 60 Throne Tallow |
| 5 | 3 | Every lesson takes 25% less time | 30,000 gold, 90 Throne Tallow |

### Shop
Sells party items and a few pieces of gear. Its stock and prices are in section 5. Selling doesn't need the Shop: you can sell from the Bag anywhere.

| Level *(tune)* | Party items sold | Gear stall | Cost |
|---|---|---|---|
| 1 | Healing Draught, Lamp Oil | 2 pieces | 240 gold, 8 Bone Dust |
| 2 | Adds Smelling Salts | 2 pieces | 800 gold, 16 Bone Dust |
| 3 | Adds Bitter Tincture | 3 pieces | 2,400 gold, 20 Bone Dust |
| 4 | Party items cost 15% less | 3 pieces | 6,400 gold, 32 Bone Dust |
| 5 | | 4 pieces, at least one of them Fine or better | 16,000 gold, 48 Bone Dust |

### Passive-bonus buildings
Small permanent bonuses for every character in battle. Each one has a **focus** with two settings, so it serves the build you're running rather than adding a flat number:
- **Changing focus is free,** at camp between trips. You can set the Bell Tower against the region you're about to walk, or the Hexing Stone to suit a Bleed or Doom party.
- **Costs:** five levels on the ×1.5 costs. Levels 1 and 2 are 450 gold and 15 Bone Dust, then 1,500 gold and 30 Bone Dust. Levels 3 to 5 are 4,500 gold and 40, then 12,000 and 60, then 30,000 and 90 of the home material.

| Building *(tune)* | Focus | Each level gives | At level 5 | Home material |
|---|---|---|---|---|
| Whetstone | **Edge:** Power | +2% Power | +10% | Cinder Iron |
| | **Point:** Crit | +1% Crit | +5% | |
| Ossuary | **Bone:** Health | +2% max Health | +10% | Cinder Iron |
| | **Shell:** Defense | +2% Defense | +10% | |
| Hexing Stone | **Wide:** every harmful effect | +2 points of landing chance for every harmful effect the party applies | +10 | Heartwood |
| | **Deep:** one kind | +4 points for one kind: Stun, Move, Bleed, Blight, Curse or Debuff | +20 | |
| Bell Tower | **Wide:** all resistances | +2% to all six resistances | +10% | Throne Tallow |
| | **Deep:** one resistance | +4% to one resistance | +20% | |

- **The Hexing Stone and the Bell Tower** work through the content spec's landing rule: landing chance = the skill's chance + the attacker's bonus − the target's resistance, with no floor.
  - The Hexing Stone adds to the party's attacker bonus.
  - The Bell Tower adds to the party's resistances, and so takes points off every landing chance against the party.
- **Examples:** a Bleed party in the Ashen Keep, whose undead resist Bleed by an extra 40%, sets the Hexing Stone to Bleed. A party facing foes that stun sets the Bell Tower to Stun.

## 4. Idle buildings and offline gains

### How every idle building works
- **Real time.** Idle buildings produce all the time, whether the app is open or closed, measured from timestamps.
- **Storage.** Each building stores a number of hours of output. When it's full, it stops producing until you collect. Fractional progress carries over, so a 3-hour gear roll is never lost to rounding.
- **Collect** empties a building into the Bag, the purse or the trainee. "Gather it all" on the away summary collects everything at once.
- **Focus** sets what a building gains. Changing focus collects what's stored first, so stored gains keep the old focus.
- **Choices.** Levels 3 and 5 each offer a choice of two upgrades. One always adds storage; the other changes what the building does. You can switch a choice later by paying that level's cost again.

### Toll House
Travellers pay to use the road you've cleared, so the further you've cleared, the more it earns.

**The road's own tolls** come first, from 1-1 (the tutorial study's §7, item 4; built in PR #35): every cleared stage earns 5 gold an hour *(tune)*, stored up to 8 hours like an idle building's output. "While you were away" and Collect take them. The Toll House, from 1-5, adds its own output on top.

**Focus:** **Coin** (gold) or **Kind** (party items instead of gold).

| Level *(tune)* | Coin | Kind | Storage | Choice | Cost |
|---|---|---|---|---|---|
| 1 | 50 × S gold per hour | 1 party item per hour | 8 h | | 240 gold, 8 Bone Dust |
| 2 | 65 × S | 1.3 per hour | 8 h | | 800 gold, 16 Bone Dust |
| 3 | | | | **Strongbox:** stores 12 h · or **Busy Road:** output +30% | 2,400 gold, 20 Chapel Wax |
| 4 | 80 × S | 1.6 per hour | | | 6,400 gold, 32 Chapel Wax |
| 5 | | | | **Night Watch:** +12 h storage · or **Both Ways:** Coin and Kind at once, each at 60% | 16,000 gold, 48 Chapel Wax |

- S is the frontier's. At a level-7 frontier, level 1 earns 120 gold an hour, so a full 8 hours is about the gold of 7 road stages.
- It's the first building you pay for, so it's priced low. At 1-5 you have about 450 gold, counting the 100 you start with, and the third character still needs to be affordable by 1-6.
- **Kind** items roll on the party-item table in section 5. It's the way to stock up without a Shop.

### Scavenger Camp
**Focus:** any region you've reached. It gathers that region's material.

| Level *(tune)* | Output | Storage | Choice | Cost |
|---|---|---|---|---|
| 1 | 1.5 per hour | 8 h | | 300 gold, 10 Bone Dust |
| 2 | 2 per hour | 8 h | | 1,000 gold, 20 Bone Dust |
| 3 | | | **Deep Packs:** stores 12 h · or **Keen Eye:** twice the rare finds, output −20% | 3,000 gold, 25 Heartwood |
| 4 | 2.5 per hour | | | 8,000 gold, 40 Heartwood |
| 5 | | | **Long Trek:** +12 h storage · or **Wide Net:** scavenge two regions at once, each at 60% | 20,000 gold, 60 Heartwood |

- **Rare finds:** each hour of scavenging has a 5% chance of a rare find: a party item (70%), or a gear roll at that region's highest lit stage (30%).
- A full 8 hours at level 1 brings 12 of a material, about half of what 7 replayed road stages bring.

### Training Yard
**Focus:** who trains. Any character at camp can train, including the party between trips. Setting out takes them out of the yard, and they go back to it when the party comes home.

| Level *(tune)* | Trainees | XP | Storage | Choice | Cost |
|---|---|---|---|---|---|
| 1 | 1 | 10% of a level per hour, at the trainee's level | 8 h | | 240 gold, 8 Bone Dust |
| 2 | 2 | | 8 h | | 800 gold, 16 Bone Dust |
| 3 | | | | **Long Drills:** stores 12 h · or **Hard Drills:** +50% XP, but trainees don't recover fatigue | 2,400 gold, 20 Bone Dust |
| 4 | 3 | | | | 6,400 gold, 32 Bone Dust |
| 5 | | | | **Night Drills:** +12 h storage · or **Mentors:** trainees 10 or more levels below your highest character gain double XP | 16,000 gold, 48 Bone Dust |

- **The road sets the ceiling,** as decided: a trainee stops gaining XP at the level of your highest lit stage. The yard can't teach what the road hasn't.
- Yard XP doesn't count toward Renown. Only battle experience does (section 8).
- Trainees recover fatigue at the fire's rate (section 6), unless Hard Drills is chosen. A trainee can't also hold an Infirmary bed.

### Salvage Pit
**Focus:** weapons, armour, accessories, or anything.

| Level *(tune)* | Output | Storage | Choice | Cost |
|---|---|---|---|---|
| 1 | 1 gear roll every 3 hours | 8 h | | 360 gold, 12 Bone Dust |
| 2 | 1 every 2.5 hours | 8 h | | 1,200 gold, 24 Bone Dust |
| 3 | | | **Deep Pit:** stores 12 h · or **Sifters:** output −40%, and 15 points of the Common chance move to Rare | 3,600 gold, 30 Cinder Iron |
| 4 | 1 every 2 hours | | | 9,600 gold, 48 Cinder Iron |
| 5 | | | **Long Dig:** +12 h storage · or **Fine Mesh:** output −30%, and every Common roll becomes Fine | 24,000 gold, 72 Cinder Iron |

The pit's gear rolls use the frontier's level and the frontier region's rarity rates (section 5).

### Storage at a glance *(tune)*
| Choices taken | Storage |
|---|---|
| Neither storage choice | 8 h |
| The level 3 storage choice only | 12 h |
| The level 5 storage choice only | 20 h |
| Both | 24 h |

### How offline time is credited
- **Time away** is now minus the last moment the game was seen open, as `js/save.js` already measures it. A clock that went backwards credits nothing, and no timer runs backwards.
- **Everything runs on the same clock:** idle storage, fatigue recovery, Masters' Hall lessons, the recruit board's timer, the Shop's gear stall and the free potion.
- **Each building caps itself** through its storage, so no overall cap on time away is needed.
- **Order on return:**
  1. If the party was out on the road, the battle under way when the app closed is resolved, and the party comes home. Its characters rest from the moment the app closed. Battles never carry on while the app is closed: offline gains come only from home-base buildings. *(Decided overnight, review.)*
  2. Fatigue recovery, from the moment each character was at camp.
  3. Lessons that finished.
  4. Idle storage, capped.
  5. The recruit board, if its timer passed. It refreshes once, however long you were away.
  6. Free potions waiting, capped.
- A tab left in the background counts as time away when it comes back.

### "While you were away"
- It opens once over the camp when you return after **5 minutes or more** away *(tune)*. Shorter absences update quietly.
- **Heading:** the time away, as in the mockup: "7h 42m by lantern-light".
- **Rows, in this order:**
  1. The battle under way when you left, if there was one: its result, and that the party walked home.
  2. Gold from the Toll House.
  3. Materials from the Scavenger Camp, with any rare find.
  4. Gear from the Salvage Pit.
  5. Party items: Kind tolls, the still-room and free potions.
  6. Trainees: XP gained and any level-ups, celebrated here as the design asks.
  7. Rested characters: fatigue before and after, and "Ready" or "Fit again" where it applies.
  8. Lessons finished.
  9. "New faces" if the recruit board refreshed.
- **Full storage is flagged** on its row ("Full for the last 1h 10m"), with one banner naming the upgrade that would have stored more.
- **One button, "Gather it all,"** collects everything and closes the sheet.

## 5. The item economy

### Where items come from
| Source | What it brings |
|---|---|
| Battle spoils | Each defeated foe may drop a party item or a gear roll |
| Stage clear rewards | Gold, materials, sometimes items, sometimes a gear roll; more on a first clear |
| The Shop | Party items at a price, and a small gear stall |
| The timed free potion | A Healing Draught every 4 hours |
| Brewing | The Infirmary's still-room, the Toll House's Kind focus, and the Scavenger Camp's rare finds |

**A rough budget:** seven road stages in Region I bring about 3 party items from drops and clears. That covers about half of what a party using one item a battle needs. The Shop, the free potion and brewing cover the rest.

### The Bag and the loadout
- **Drawing items:** party items sit in the Bag in stacks. A loadout slot draws one item from the Bag when it's used; an unused slot costs nothing.
- **Running out:** when the Bag runs out of an item, that slot is empty, and "Between battles: out of [item]" can send the party home.
- **Loadout slots:** 2 to start, 3 at Tactician level 2 and 4 at Tactician level 4. The Alchemist's awakened Field Chemist adds one more, as the content spec says.
- **Unwanted gear is sold,** as decided. Salvaging gear into materials is left for the gear design.
- **Bag limit:** party items stack without limit. Gear holds 60 pieces, a placeholder while gear progression is on hold. When the gear bag is full, a new piece is sold where it drops, and the battle report says so. *(Decided overnight, review.)*

### Shop prices *(tune)*
| Party item | Effect | Region I price | Sells for |
|---|---|---|---|
| Healing Draught | Restores 40% of one ally's health | 25 | 8 |
| Lamp Oil | Every ally gains 20 mana | 35 | 11 |
| Bitter Tincture | Removes all harmful statuses from one ally | 40 | 12 |
| Smelling Salts | A fallen ally gets back up with 30% health | 60 | 18 |

- **Prices step up with your furthest region:** I ×1, II ×2.5, III ×4.5, IV ×7, V ×9 *(tune)*. A Healing Draught then costs about a fifth of a Standard stage's gold all game, so using items stays a choice. *(Decided overnight, review.)*
- **Selling** a party item gets 30% of its current Shop price, rounded.
- **Stock** of party items is unlimited.
- **Gear stall:** 2 to 4 gear rolls (by Shop level) at the frontier's level and the frontier region's rarity rates. It refreshes every 8 hours. Each piece costs 4 times its sell price.

### The timed free potion
- A free **Healing Draught** waits by the fire every **4 hours**, up to **3** at once *(tune)*. That's up to 6 a day for someone who checks in twice.
- Tap the fire to collect, or use "Gather it all". The timer only runs while fewer than 3 are waiting.
- It starts when 1-3 is cleared, which also brings the loadout and 2 Healing Draughts, as the campaign session proposes.

### Loot drops *(tune)*
Each defeated foe rolls once for loot:

| Foe rank | Chance of loot |
|---|---|
| Normal | 10% |
| Elite | 40% |
| Boss | 100%, and rolls twice |

A loot roll is a **party item** 60% of the time and a **gear roll** 40% of the time. Party items come at these rarity rates:

| Party item | Chance |
|---|---|
| Healing Draught | 50% |
| Lamp Oil | 25% |
| Bitter Tincture | 15% |
| Smelling Salts | 10% |

### Gear rarity
Gear rolls use the content spec's rates for the region the stage is in, unchanged:

| Region | Common | Fine | Rare |
|---|---|---|---|
| I | 70% | 25% | 5% |
| II | 55% | 35% | 10% |
| III | 45% | 40% | 15% |
| IV | 35% | 45% | 20% |
| V | 25% | 50% | 25% |

- **Elite stages** move 10 points from Common to Rare, and **boss stages** move 20 *(tune)*. So a Region I boss rolls 50% Common, 25% Fine and 25% Rare, and a Region V boss rolls 5%, 50% and 45%.
- **Relics** never come from rolls. Each region's boss drops its Relic on the first clear, as the content spec says.

### The gear roll (placeholder)
Gear progression is deliberately undecided, so this is only enough to build with:
- **One random piece.** Its slot is weapon 40%, armour 30% or accessory 30% *(tune)*.
- **Weapons** pick the weapon type of a class on your roster, weighted by how many of each class you have. Class-only accessories only roll for classes on your roster.
- **Rarity** comes from the table above.
- **Item level** is the stage's level. Higher stages roll better through rarity, and through stats if the content spec's open question on item scaling is settled that way.

### Reward tiers
The campaign spec gives each stage one of five tiers, using the campaign session's names:

| Tier | Used for |
|---|---|
| **Light** | Short early stages, and the first stages of each region |
| **Standard** | Most road stages |
| **Rich** | The road stage just before an elite or boss, and a few "vault" stages |
| **Elite** | Elite stages |
| **Boss** | Region bosses |

A stage's reward has two parts.

**Battle spoils,** from every foe defeated, in any stage *(tune)*:

| Foe rank | Gold | XP for each character | Loot |
|---|---|---|---|
| Normal | 8 × S | 6% of a level | 10% chance |
| Elite | 24 × S | 18% of a level | 40% chance |
| Boss | 80 × S | 60% of a level | 2 rolls |

**The clear reward,** by tier *(tune)*:

| | Light | Standard | Rich | Elite | Boss |
|---|---|---|---|---|---|
| Gold | 12 × S | 20 × S | 40 × S | 60 × S | 200 × S |
| XP for each character | 9% of a level | 15% of a level | 22% of a level | 38% of a level | 90% of a level |
| The stage region's material | 2 | 3 | 5 | 8 | 20 |
| Another reached region's material | 10% chance of 1 | 25% chance of 1 | 1 | 1 | 3 |
| Party items | 10% chance of 1 | 15% chance of 1 | 1 | 1 | 2 |
| Gear roll | 5% chance | 10% chance | 1 | 1, at elite rarity | 1, at boss rarity |

- **First clear:** the clear reward's gold and materials are doubled, a Light or Standard stage's gear roll is guaranteed, and Renown is awarded (section 8). One-off unlocks sit on top: buildings, conditions, classes joining the board and a boss's Relic. The campaign spec places those on stages.
- **Replays** give the plain clear reward. Fatigue is what limits farming.
- **XP goes to every character who started the battle,** knocked out or not. Thralls get none.
- **Summoned foes give no spoils:** no gold, XP or loot. Drawing out a fight against a summoner never pays.
- **Another region's material:** until you've reached a second region, this is more of the stage region's own.
- **Starting gold:** you set out with 100 gold *(tune)*, so the first paid building and the third character both fit by 1-6.
- **A loss** keeps the spoils of the foes already defeated, but gives no clear reward. The party comes home.
- **As a scale:** a level-7 Standard stage with 5 normal foes pays about 140 gold, which matches the mockup's stage sheet. A level-100 one pays about 1,260.
- **XP pace:** the same stage gives 45% of a level at its level, so a character at the stage's level gains about half a level per stage.
  - Region I's stage levels rise about 0.5 per stage, so first clears nearly keep pace there.
  - From Region II they rise 1.1–1.4 per stage, so replays and the Training Yard fill the gap. That's the farming loop the design describes.
  - How far characters fall behind also depends on step 3's XP curve. A steeper curve helps characters below the stage's level catch up faster.

### Sell prices *(tune)*
| Thing | Sells for |
|---|---|
| Common gear | 10 × S at its item level |
| Fine gear | 25 × S |
| Rare gear | 60 × S |
| Relics | Can't be sold, because you can only ever own one |
| Party items | 30% of the current Shop price |

A Common sells for about a sixth of a Standard stage's gold, and a Rare for about a whole stage's. The Cutpurse's Fence passive raises sell prices by 10–30%.

### How the class hooks read
The content spec's economy skills map onto these rules:
- **"Kills"** (Heavy Purse, Master Thief) act on the battle spoils of foes the Cutpurse defeats.
- **"Gold from every battle"** (Light Fingers, awakened Fence) means spoils plus clear gold.
- **"An extra item"** (Sticky Fingers, awakened Light Fingers) is one more loot roll.
- **Pickpocket's** stolen gold is 5–15 × S, once per foe.
- **The Alchemist's** Spare Vials and Panacea refill a used slot without drawing from the Bag.

## 6. Fatigue

Fatigue runs from 0 to 100. It is counted at the end of each battle, from the battle log.

### How it builds *(tune)*
- **+1 for each turn a character takes.** That's the whole rule for now, as you decided. Nothing else adds fatigue: not damage taken, and not being knocked out.
- **What costs nothing:**
  - Using an item takes no one's turn, so it costs no fatigue.
  - A knocked-out character takes no turns, so gains nothing while down.
  - Thralls build none.
- **What that comes to:** the campaign session counted turns in the battle sim.
  - A character takes about 7–12 turns in a Region I road battle, and gains that much fatigue.
  - Faster characters take more turns, so they tire sooner. In those runs the Hexblade averaged about 11 turns a road battle, and the Warden and Lamplighter about 8.
  - The campaign spec aims road battles at 6–10 rounds, which keeps fatigue rising slowly.
- **A stage's fatigue cost is its battle length.** There are no fatigue multipliers by stage level or tier, and no special rule for the first hour.
  - Easy stages, with low-health foes, take few turns and cost little. Walls take many turns and cost more.
  - Farming cleared stages is cheap, because a party that out-levels a stage ends its battles in a few turns.
  - If play-testing shows fatigue rises too fast, the lever is battle length, through foe health, not a fatigue discount.
- **Modifiers:** percentage effects such as Iron Will, Comfort, Gravewarden's Plate, Mourner's Veil and the Hollow Crown change the fatigue a character gains from their turns.
- **Content to revisit, in the content spec:** some fatigue content was written for fatigue from damage.
  - **These no longer do anything:** avoiding damage to save fatigue (Wards, Dodge, Guard, Cover, Brace); Laudanum's "half the fatigue"; health costs that built fatigue (Blood Price, Martyrdom, Bloodlust, Elixir of Fury); and knock-out fatigue (awakened Iron Will, Peaceful Rest).
  - **Speed now costs fatigue:** Hasted, Courier's Spur and other speed effects tire a character faster, and slow heavy armour tires them less.
  - **Flat recovery needs re-sizing** against about 10 a battle. House Calls (1–4 per battle, 6 awakened) could drop to about 0.5–2 (3 awakened), and awakened Comfort's +2 to about 1.

### Thresholds *(tune)*
| Fatigue | State | Effect |
|---|---|---|
| 0–49 | Fresh | None |
| 50–74 | **Weary** | −5% Power, Defense and Speed |
| 75–99 | **Exhausted** | −15% Power, Defense and Speed |
| 100 | **Spent** | Can't fight until fatigue falls below 50 |

- **Healers feel it too:** Power drives healing, so a weary healer heals less.
- **Spent on the road:** the character leaves the party after that battle and walks home, as the design says, and starts resting at once. The others carry on unless a party rule sends everyone home. With nobody left, the trip ends.
- **The default setting** on the stage sheet is "Come home when fatigue 75+", using the starting party rule. It arrives with chaining stages, when 1-6 is cleared.

### Recovery *(tune)*
Recovery is sized against about 10 fatigue per character per road battle, the campaign session's measure.

| Where the character is | Recovery per hour | In road battles |
|---|---|---|
| At the fire: at camp, not in a bed | 10; 14 with Infirmary level 5 | About 1 an hour; 1.4 |
| In an Infirmary bed | 20–35, by Infirmary level | 2–3.5 an hour |
| Training in the yard | 10; none with Hard Drills | About 1 an hour |
| Away at a Masters' Hall lesson | 10 | About 1 an hour |
| Out on the road | None, except House Calls and awakened Comfort after each battle | Their content-spec sizes, in "How it builds" |

- **Beds fill themselves.** The most fatigued characters at camp take free beds. A character leaves their bed when they reach 0 or set out, and the next most fatigued takes it. You can pin a character to a bed.
- **Some times to recover:**

| From | To | At the fire | Level 1 bed | Level 5 bed |
|---|---|---|---|---|
| 100 (Spent) | Below 50 (fit) | 5 h | 2.5 h | 1.5 h |
| 75 (Exhausted) | 0 | 7.5 h | 3.75 h | 2.1 h |
| 50 (Weary) | 0 | 5 h | 2.5 h | 1.4 h |

**In play terms:** a night's rest at the fire (8 hours) undoes a session of about 8 road battles. A level-1 bed does it in about 4 hours, and a level-5 bed in about 2. The Infirmary and a second team on the bench are the ways to set out more often than that.

## 7. Recruiting and the roster

### The first pick
You start by choosing 1 of the Sellsword, Hexblade or Pilgrim. Your first board always shows the two starting classes you didn't pick, plus one other.

### The board *(tune)*
- **What it shows:** 3 recruits at first, up to 6 with Notices. Up to 2 can share a class, so there can be two of a class to compare, as in the mockup.
- **Classes:** the six original classes from the start. The new six join region by region, as the content spec sets out.
- **Refresh:**
  - when the party comes home after fighting at least one battle, so walking out and straight back doesn't reroll it
  - and every 4 hours of real time.
  - Either refresh restarts the 4-hour timer, which the board shows.
- **Picks** reset on every refresh: 1 per board, up to 3 with the Picks track.
- **Recruit levels:** 1 at first. With Veterans, the board's level cap is 40%, 60%, 80% or 90% of your highest character's level, and each recruit rolls between half the cap and the cap, never below 1.
  - Higher-level recruits arrive with their points already spent and a free respec, as decided. At their thresholds they've opened tiers in their own tree.
  - Only storied recruits, from the top Veterans rank, can arrive combined or awakened (section 3).

### Prices *(tune)*
**Price = 150 × S at the recruit's level × a quality factor.**
- **Quality** is how well the recruit rolled within their class's ranges, averaged over their stats. It runs from ×0.9 for the worst rolls to ×1.25 for the best, so a better recruit costs more.
- **Examples:** a level-1 recruit costs 162–225 gold, a little below the mockup's 220 and 250. A level-30 recruit costs 945–1,310.
- **Your first recruit is free,** as the campaign session proposes, so the party is 2 from stage 1-3.
- **Hiring needs room on the roster.** If it's full, the board offers to dismiss someone.

### The roster cap
8 without the Barracks, rising to 24 at Barracks level 5. Recruiting upgrades come from buildings, never from Renown, as decided.

### Dismissing
- Swipe a character left on the roster, as in the mockup, and confirm. They walk off down the road for good.
- Their gear goes back to the Bag. Nothing else comes back, matching the tear-down rule. *(Decided overnight, review.)*
- **You can't dismiss:** your last character, a character out on the road, or one at a lesson. Cancel the lesson first.

## 8. Renown and plots

### What raises it *(tune)*
Renown measures how far the whole company has come. It draws on five general measures of an account's progress: how far the road is lit, what the party has learned in battle, the bosses it has beaten, the company it has gathered, and the camp it has built.

| Measure | What counts | Renown |
|---|---|---|
| **The road** | A new stage lit | +40, or +100 for an elite stage |
| **Battle experience** | Each full level's worth of XP your characters earn in battle, added up across the party | +15 |
| **Bosses** | A region boss defeated | +250 the first time, +20 each time after |
| **The company** | A character passes a level threshold: 30, 50, 80, 100, 120, 150, 180 or 200 | +50 |
| | A class joins your roster for the first time | +50 |
| **The camp** | A building built | +60 |
| | A building upgraded | +30 × the new level: +60 for level 2, up to +150 for level 5. Recruit Board ranks count as levels 2–5. |
| | A Masters' Hall lesson finished | +40 |

- **Battle experience** is counted in the same levels' worth as section 2, at the stage's level. A Standard stage with a party of 6 at its level is worth about 40 Renown.
- **Only battle XP counts.** Training Yard XP doesn't, and neither do the levels a recruit arrives with. Renown rewards what the company does on the road.
- **Replays still count,** through battle experience and repeat boss kills. They earn about half what clearing new stages does, so farming moves Renown, but more slowly.
- **Each building level and lesson awards Renown once per save,** so tearing down and rebuilding never farms it.

### The curve *(tune)*
Going from Renown n to n + 1 takes **100 × (n + 2)**: 300 from Renown 1 to 2, and 900 from Renown 7 to 8, as in the mockup's "640/900".

### Plots *(tune)*
| Plot | Renown | Total Renown needed | When it should come |
|---|---|---|---|
| 1–3 | Start | 0 | |
| 4 | 4 | 1,200 | Near the end of the first hour |
| 5 | 6 | 2,500 | Late in Region I |
| 6 | 8 | 4,200 | Early in Region II |
| 7 | 10 | 6,300 | Late in Region II |
| 8 | 12 | 8,800 | Mid Region III |
| 9 | 13 | 10,200 | Late in Region III |
| 10 | 15 | 13,300 | Mid Region IV |
| 11 | 17 | 16,800 | Early in Region V |
| 12 | 19 | 20,700 | Late in Region V |
| 13 | 22 | 27,300 | After the campaign |
| 14 | 25 | 34,800 | After the campaign |

- **The pace, estimated:** Region I brings about 2,500–3,000 Renown: about 1,100 from the road and the Sexton, 650 from battle experience, 250 from new classes and 650 from the camp. Later regions bring about 4,000–5,000 each, mostly from battle experience, as replays grow.
- **Every plot is a choice** through the whole campaign. By the end of Region I, eight buildings compete for five plots. The last two plots are long-term goals.

## 9. The Masters' Hall

### Lessons *(tune)*
| Lesson | Gives | Character level | Time | Gold | Hall level |
|---|---|---|---|---|---|
| Rule slot IV | A 4th rule slot | 15 | 4 h | 600 | 1 |
| Rule slot V | A 5th rule slot | 45 | 10 h | 4,000 | 2 |
| Rule slot VI | A 6th rule slot | 90 | 20 h | 12,000 | 3 |
| Skill slot I | An extra equipped skill slot | 20 | 8 h | 1,500 | 1 |
| Skill slot II | A second extra skill slot | 100 | 24 h | 15,000 | 4 |

- **Skill-slot lessons** keep the content spec's placeholder: two at most, 8 hours from level 20 and 24 hours from level 100. With the slots from levels 50 and 200, that makes the content spec's 5 at most.
- **Rule-slot lessons stop at the class's maximum.** The Sellsword's maximum is 4, so it can only take Rule slot IV. The Pilgrim, Lamplighter, Barber-Surgeon and Bellringer, with a maximum of 6, can take all three. A combined character uses the highest maximum among their classes. *(Decided overnight, review.)*
- **Rule slot IV comes first:** at level 15 it's the first lesson most characters take, early in Region II.

### How a lesson works
- **One lesson at a time per character,** and one character per room.
- **The character is away:** out of the party, and shown dimmed in the roster tray with the time left. They recover fatigue at the fire's rate, so a lesson is a good use of a Spent character.
- **Time runs in real time,** offline too.
- **Cancel** brings them home. Progress is kept, so starting the same lesson again picks up where it stopped, and the gold is only paid once.
- **What's learned is kept for good,** even if the Hall is torn down.

## 10. Early pacing

The design asks for one system at a time in the first half hour, the first recruit within about 10 minutes, and a full party of 6 by the end of Region I. The triggers follow the campaign session's proposed first-clear unlocks and party sizes. Minutes are targets for play-testing; the triggers are what the game checks.

| About | Trigger | What arrives |
|---|---|---|
| 0 min | Start | First pick. The camp: the fire, the Recruit Board (closed until 1-2) and 3 empty plots. Until 1-6, each stage is a single trip: one battle, then home. |
| ~3 min | 1-2 cleared | **The Recruit Board opens.** Its first recruit is free, so the party is 2 from 1-3. |
| ~6 min | 1-3 cleared | **Party items:** the loadout's 2 slots, 2 Healing Draughts, and the free draught by the fire. |
| ~9 min | 1-4 cleared | **The first new rule condition,** as a stage reward. The campaign spec chooses it. |
| ~12 min | 1-5 cleared | **Toll House:** the first building you place on a plot, and the first idle gains. Collecting is shown once. |
| ~15 min | 1-6 cleared | **Chaining and fatigue:** "Keep going after a win", the fatigue sliver, and the default "come home at 75+" party rule. A third character joins about now. |
| ~20 min | 1-7 cleared | **Infirmary:** beds for tired characters. |
| ~25 min | 1-8 cleared | **Training Yard:** XP for whoever is resting, so new recruits catch up. This can fill the 3 starting plots. |
| ~35 min | 1-10 cleared | **Shop:** buying party items, and selling gear from the Bag. From here on there are more buildings on offer than plots, so every plot is a choice. A fourth character joins about now. |
| ~40 min | 1-11 cleared | **Tactician:** new conditions, more party rules, and later more loadout slots. |
| ~50 min | Renown 4 | **Plot 4** clears, and the Renown track is shown. |
| First time away | 5+ minutes away | **"While you were away."** Before that, a hint on leaving camp: the Toll House keeps earning while the game is closed. |

**After the first hour:**
- **1-13:** the Scavenger Camp. A fifth character joins about now.
- **1-15:** the Barracks.
- **1-16:** the Salvage Pit. A sixth character joins about now.
- **1-18, the Sexton:** Region II opens, with the Masters' Hall and the Shrine.
- **Region III:** the Whetstone and the Ossuary.
- **Region IV:** the Hexing Stone and the Bell Tower.

**Fatigue in the first hour: watch this in play-testing.**
- There's no special rule for it, as you decided.
- In the campaign session's turn counts, the starting character reaches 50 (Weary) around 1-7 and 75 around 1-8 or 1-9, if every stage is cleared once in a row without rest. That's about 25–30 minutes in.
- Recruits join fresh and the Infirmary's beds arrive at 1-7, so the first hour can keep moving by rotating characters.
- Those counts were taken before the campaign spec tightened road battles to 6–10 rounds, which slows fatigue a little.
- If it still rises too fast, the lever is battle length: shorter early battles through lower foe health, which the campaign spec sets.

**Gold check against the campaign's party sizes** *(tune)*.
- **What it counts:** the campaign spec's draft-2 stage data (levels, tiers and foe counts), first clears only, plus the 100 gold you start with.
- **What it assumes:** each building is built as soon as it unlocks and a plot is free.
- **Extra slack:** Toll House income and replays.

| By | Party | Gold so far | Spent by then | Left |
|---|---|---|---|---|
| 1-6 | 3 | ~560 | Toll House 240, and the third character at 162–225 | 95–160 |
| 1-10 | 4 | ~1,400 | Plus the Infirmary and Training Yard (240 each), and the fourth character | 235–360 |
| 1-13 | 5 | ~1,930 | Plus a building on plot 4 (240), and the fifth character | 295–485 |
| 1-16 | 6 | ~2,880 | Plus the sixth character | 1,025–1,275 |

- **The tightest point is 1-4 to 1-6,** because the early stages have few foes. The starting 100 gold and the low first-hour prices are what make it fit. Without the starting gold, the third character could be a few gold short.
- **Bone Dust is never short:** first clears bring about 30 by 1-6 and 120 by 1-16.
- **Picks:** with 1 pick per board, each new character needs a refresh. Before 1-6 every stage is a trip home. After that, each trip home refreshes the board, and so does the 4-hour timer.

## 11. Mockup numbers that change

The mockups' numbers were placeholders. Where this spec differs:
- **Plot numbering:** the Renown track (frame C) clears "Plot 5" at Renown 3, which implies 4 starting plots. With 3 to start, Renown 4 clears plot 4.
- **The Recruit Board** (frames A and D) gets its own spot in the ring, like the road out of camp, rather than a plot.
- **Renown's "Earned from" list** (frame C): "Hero level up +15" becomes battle experience, and the list grows to section 8's five measures.
- **Renown pace:** the mockup shows Renown 7 with 13 of 18 stages lit. This spec's estimate puts Renown 7 early in Region II.
- **Recruit prices** (frame D): 220 and 250 become 162–225 at level 1.
- **Roster cap:** the mockup shows 10 without the Barracks, and 10 → 14 for building it. This spec has 8, and 8 → 11.
- **The Tactician card** teaches "Foe: charging". The content spec makes that a reward from the Sexton, so the card should show a Lesson I condition instead.
- **Storage:** the mockup's 8 h and 12 h match. Its Scavenger rates (1.9 and 1.2 an hour) become 2 an hour at level 2, the same for every region.
- **The plot cap:** frame C says "Plots 9–11: one plot for every building". With four passive-bonus buildings, and the Recruit Board outside the plots, there are 14 plots.

## 12. Questions

### Still open
None. The coordinating session decided the last five overnight. They're listed below for your review.

### Settled overnight by the coordinator, for your review
Each one is marked "(decided overnight, review)" where it appears in the spec.

1. **Playing while the app is closed: no.**
   - Closing the app brings the party home after the current battle, which is resolved when you return.
   - Offline gains come only from home-base buildings, matching your own description of them: "things you can build in your home base that give you idle gains while the app is closed".
   - Resting at camp carries on while the app is closed.
   - The alternative was that the party plays on at the 1× pace until a stop condition.
2. **Shop prices rise with your furthest region,** from ×1 to ×9, so a Healing Draught costs about a fifth of a stage's gold all game.
   - The alternatives were fixed prices, which make items nearly free late on, or fixed prices with a daily stock limit.
3. **Dismissing gives back only the character's gear,** matching the tear-down rule.
   - The alternatives were a share of their battle XP passed to another character, or some gold.
4. **A combined character's rule-slot maximum is the highest among their classes,** so a Sellsword who combines with the Pilgrim can train up to 6 rule slots.
   - This settles the content spec's open question. Step 3 currently uses the first class's maximum, and step 5 changes it.
5. **The gear bag holds 60 pieces,** and new gear is sold on the spot when it's full.
   - It's a placeholder while gear progression is on hold.

### Settled: your answers to draft 1
- **The Recruit Board** is built from the start, outside the plot count.
- **Early fatigue:** no discounts and no special rule. If fatigue rises too fast, the lever is battle length, through foe health.
- **The Toll House** unlocks at 1-5.
- **Materials:** levels 1–2 cost Bone Dust, and level 3 and up cost the building's home material.
- **Loadout slots 3 and 4** come from the Tactician.
- **Tearing down:** what a building taught is kept; what it provides is lost.
- **Gear** is sold, not salvaged, for now.
- **Building and upgrading** are instant.
- **Renown** comes from general measures of account progress, including battle experience and bosses defeated (section 8).
- **The Training Yard's ceiling** is the level of your highest lit stage.
- **Passive-bonus buildings** are chosen to fit the game's build options: four, each with a focus (section 3).
- **Combined or awakened recruits** come only from the Recruit Board's top Veterans rank, as storied recruits.
- **Fatigue:** +1 for each turn a character takes, and nothing else adds it for now, decided in the campaign session. A stage's fatigue cost is the length of its battles. Spent characters are fit again below 50. The per-battle cap is dropped, since fatigue no longer comes from damage.

## Appendix: notes for the build

- **Save state** (`js/save.js`) already has the hooks:
  - `base.buildings`: id → `{ level, focus, stored, since }`. This spec adds `choices` (the level 3 and 5 picks) and `ranks` (for the Recruit Board's tracks). Passive-bonus buildings use `focus` too.
  - Add `base.plots`: how many are cleared and which building stands on each. The Recruit Board has no plot.
  - `currencies.mats`, `inventory.potions` for party item stacks, and `inventory.items` for gear.
  - Each character already has `fatigue`. Add `restsAt` (`fire`, `bed`, `yard` or `hall`), `lesson: { id, startedAt, progress }`, and a record of the lessons learned.
  - Add `renown: { points, level, awarded }`, where `awarded` remembers the building levels that have already paid Renown.
  - Add `board: { recruits, picksLeft, refreshedAt }`, `freePotion: { waiting, since }` and `shop: { stall, refreshedAt }`.
- **Away gains:** each idle building adds `(ms, state) => [{ icon, text }]` to `App.awayGains`, as the app shell provides.
- **Fatigue** comes from the battle log after each battle: +1 for each turn the character took. The sim's results already count each unit's turns (`stats[id].turns`).
- **Seeds:** idle rolls (rare finds, salvage, Kind tolls) should use seeded randomness from the building's `since` timestamp, so a reload never re-rolls them.
- **Rewards** read the stage's tier and level from the campaign data, and foe ranks from the foe tables.
- **Rule slots:** step 3 gives a combined character their first class's rule-slot maximum. Step 5 changes it to the highest among their classes.
- **Closing the app** resolves the battle under way, sends the party home, and starts its rest from the moment the app closed. No battles run while the app is closed.
