# Lantern Road: Game Design

Agreed 2026-11-03, updated 2026-11-04 with decisions from the screen mockups, the three specs, play-testing and the overnight build. This document is the source of truth for the game. Where older code or notes disagree with it, this document wins. The details live in three specs:
- `docs/content-spec.md`: classes, skills, conditions, items and statuses.
- `docs/campaign-spec.md`: regions, stages, foes, the map and the first hour.
- `docs/home-base-spec.md`: the buildings, recruiting, Renown, fatigue and recovery, offline gains and the item economy.

Numbers marked *(tune)* are starting values to adjust in play-testing. *(Decided overnight, review)* marks a decision the coordinator made overnight on 2026-11-04, for your review.

## 1. Pillars

1. **Idle battles that are fun to watch, but never required.** Every battle plays out on its own, and you can always skip it.
2. **Strategy is how you prepare.** You win through your formation, the rules you give each character, the skills they equip and the gear they wear.
3. **Characters you grow.** Characters keep their levels, skills and gear for good.
4. **A home base you build.** It gives passive bonuses and keeps earning while you're away.
5. **Visuals and flow come first.** Every screen, animation and transition is judged by how it feels to the player.

## 2. Core loop

Home base → campaign map → stage → idle battle → rewards (XP, gold, gear, materials) → next stage.

A **trip** is one outing from camp. The party sets out, fights a stage and, with "Keep going after a win" on, walks on to the next. It comes home when:
- the party loses
- a party rule sends it home, such as "any character at 75+ fatigue → Return to base"
- a boss falls, so the region's ending gets its moment *(decided overnight, review)*
- you call it home
- the app closes, after the battle under way *(decided overnight, review)*
- every character is Spent

You then strengthen the party and set out again. Cleared stages can be replayed to farm XP, gear and materials.

## 3. Battles

### Orientation
- Battles play sideways (landscape). Every other screen is portrait.

### Formation
- Each side has up to 6 characters: 2 in the front row and 4 in the back.
- Early stages are built for smaller parties, because you start with one character.

### Turn order
- Characters act one at a time on a timeline.
- Speed sets how soon a character acts again, so faster characters act more often.
- A strip of portraits shows the next several turns.

### Targeting
- Every skill has a fixed **shape**:
  - one foe
  - the front row
  - the back row
  - 3 random foes
  - all foes
  - one ally
  - all allies
  - self
- Where a shape leaves a choice, such as which single foe, the character's rules pick the target. Examples: "Foe: lowest health", "Foe: highest attack".

### The back row
- By default the back row is protected: melee attacks must hit the front row while anyone is standing there.
- Ranged attacks and magic can reach the back row.
- This is a default, not a law. Other parts of the game bend it:
  - **Skills:** some reach the back row, and Guard skills redirect attacks onto a tank.
  - **Rules:** a rule action can move a character between rows.
  - **Accessories:** e.g. "Melee from the back row at −30% damage".

### Health and mana
- Characters have health and mana.
- Skills cost mana, and basic attacks restore a little, so skills come up naturally.
- Health and mana reset before every battle.
- Party items (such as potions) are packed into a loadout before battle. Party rules use them on their own, and you can also tap one at any moment to use it by hand, without anyone losing a turn.

### How a battle ends
- A battle ends when one side has no one standing.
- From round 15 *(tune)*, foes become enraged and hit 25% harder every round, so no battle can stall.

### Watching
- **Speed and skipping:** battles run at 1×, 2× or 4×, and Skip resolves a battle instantly.
- **Rule callouts:** each action briefly shows the skill name and the rule that triggered it.
- **Battle report:** at the end of each battle you see damage dealt, damage taken, healing, and how often each rule fired. You can understand a win or a loss without having watched.

## 4. Rules ("Tactics")

Gambit-style behaviour rules, after Final Fantasy XII.

### Character rules
- Each character has an ordered list of **condition → action** rules.
- On each turn the character reads the list from the top and uses the first rule that is true and possible. If no rule applies, it uses its basic attack.
- You drag rules to reorder them and toggle each one on or off without deleting it.

### Rule slots
- Every character starts with 3 rule slots. Each class has its own maximum *(tune)*, and a combined character uses the highest among their classes *(decided overnight, review)*.
- More slots are learned by training at a home base building (the Masters' Hall), where the character is away for idle time.

### Party rules
- A separate, small set of team-wide rules. Examples:
  - "Any ally below 30% health → Healing draught"
  - "Everyone attacks the leader's target"
  - "Return to base when any character reaches X fatigue"
- Party rules are checked between every turn.
- Between-battle party rules decide when a trip comes home. The stage sheet's "Come home when" chips are the same rules, so toggling one there edits the party rules *(decided overnight, review)*.
- Extra party rule slots come from the Tactician, a home base building.

### Unlocking conditions
You start with a few useful conditions:
- Self health below 50%
- Ally health below 50%
- Front foe
- Foe with the lowest health

More conditions come from the home base and from battle rewards:
- other health thresholds
- foe with the highest attack
- foe charging a big attack
- undead foe
- fallen ally
- self mana below X
- boss present
- 3 or more foes present
- and more

The campaign spec sets which stage's first clear teaches each reward condition, and the Tactician teaches the rest.

### Saved rule sets
- You can save sets of rules and switch between them for different stages. They come with the Tactician's first lesson, and the stage sheet remembers the set you last chose for each stage.

## 5. Characters

### Classes
| Class | Role | Notes |
|---|---|---|
| Sellsword | Front-row damage | Starting choice |
| Hexblade | Curses and damage over time | Starting choice |
| Pilgrim | Healer | Starting choice |
| Warden | Front-row tank | Guard skills |
| Lamplighter | Support | Light-based buffs and dazzles |
| Crossbowman | Back-row ranged damage | |
| Duellist | Tank: dodging and countering | Joins later |
| Alchemist | Area damage and items | Joins later |
| Barber-Surgeon | Healer: cleansing and fatigue | Joins later |
| Bellringer | Control: delays, slows and stuns | Joins later |
| Gravecaller | Summoner | Joins later |
| Cutpurse | Assassin and thief | Joins later |

Twelve classes to start. The later six join the recruit board region by region. Two of the same class can share a party.

### Stats
- Health, Mana, Power, Defense, Speed, Crit chance and Dodge.
- Each class has its own growth per level.

### Recruits
- Recruits arrive with randomised level-1 stats within their class's ranges. That makes choosing between two recruits of the same class a real decision.
- Home base upgrades bring recruits at higher levels, with their points already spent to match.

### Levels and points
- XP comes from battles and the Training Yard. Battle XP is a share of a level at the stage's level, so a recruit below the stage's level catches up fast *(tune)*. The level cap is 200.
- Each level gives 1 **stat point**, and every 5 levels give 1 **skill point**.
- **Thresholds** at levels 30, 50, 80, 100, 120, 150, 180 and 200 open the next tier of the skill tree and offer a free respec. The respec refunds stat and skill points; a class combination stays.
- **Combining classes:** at level 50 a character can combine with a second class instead of opening a tier, gaining that class's first tier. At 200 they can combine with a third. From then on, later thresholds can open tiers in any of their trees.
- **Awakening:** from level 100, a threshold can awaken one skill instead of opening a tier. Skills level from 1 to 5, and a level-5 skill awakens for 5 more skill points.

### Skill trees
- Each class has its own skill tree, opened tier by tier at thresholds.
- Trees hold active skills and **passive skills**. Passives are always on once learned and never need a skill slot.
- You can't take everything.
- Respeccing costs gold at a home base building.

### Equipped skills
- Each character has a basic attack plus 1 equipped active skill.
- One more skill slot comes at level 50 and another at 200, and the Masters' Hall can teach more.
- Rules decide when the equipped skills are used.

### Fatigue
Fatigue runs from 0 to 100 and plays the role of Darkest Dungeon's stress.

- **How it rises:** +1 for each turn a character takes *(tune)*, and nothing else adds any for now: not damage, and not being knocked out. This is your rule, from 2026-11-04.
  - **A stage costs the turns its battle takes.** Weak foes fall fast, so easy stages are cheap, and walls take longest. There are no fatigue discounts or multipliers by stage, and no cap per battle. If fatigue rises too fast, the lever is battle length, through foe health.
  - Faster characters take more turns, so they tire sooner. Using an item takes no one's turn, and a knocked-out character takes none.
- **Thresholds:**
  - **Weary (50+):** −5% Power, Defense and Speed *(tune)*.
  - **Exhausted (75+):** −15% Power, Defense and Speed *(tune)*.
  - **Spent (100):** the character can't fight until fatigue falls below 50 *(tune)*. If they reach 100 during a trip, they walk home alone after that battle, and the rest carry on *(decided overnight, review)*.
- **Recovery:** fatigue falls over real time while the character rests at the home base, including while the app is closed. That's about one road battle's worth an hour at the fire, and faster in an Infirmary bed *(tune)*.

### Death
- Characters don't die in the main mode. A mode with permanent death may come later as a separate mode.

## 6. Recruiting and the roster

The recruiting system follows Darkest Dungeon's stagecoach.

### First pick
- You start by choosing 1 character from 3 options: Sellsword, Hexblade or Pilgrim.

### The recruit board
- The recruit board stands in camp from the start, outside the building plots, and can't be torn down. It opens when stage 1-2 is cleared, and the first recruit is free.
- It shows a few recruits with randomised stats.
- It refreshes each time the party comes home from a trip, and also every 4 hours of real time *(tune)*. The board shows a timer for its next refresh.
- Recruits cost gold.

### Upgrades
Home base upgrades improve recruiting:
- **More recruits on the board** to choose from.
- **More picks per refresh:** you start able to take only 1 from each board, and upgrades raise that.
- **A larger roster cap.** When the roster is full, you dismiss someone to make room. A dismissed character's gear comes back to the Bag, and nothing else does *(decided overnight, review)*.

### Pacing
- The first recruit should come within about 10 minutes of play.
- A full party of 6 should come by the end of Region I.

## 7. Equipment

### Slots
- **Weapon, armour and accessory.**
- All three are loot, found in battle or bought.

### Trade-offs
- Items follow Darkest Dungeon's trinkets: strong items trade a bonus for a cost, and many effects only apply under a condition.

| Condition | Example |
|---|---|
| Row | "+25% damage in the front row, −1 speed" |
| Health | "Below 30% health: +40% damage" |
| Timing | "First two turns: +6 speed" |
| Event | "On a kill: restore 10 mana" |

### Who can wear what
- **Weapons** come in types tied to classes: swords, crossbows, censers and so on.
- **Armour** comes in three weights, each with a trade-off: light, medium and heavy. Heavy armour gives more health but less speed. Any class can wear any weight, though some suit certain classes better.
- **Accessories** can be used by anyone, plus a few class-only accessories.

### Rarity and drops
- Common, Fine, Rare and Relic. A Relic is unique: you can only own one copy.
- Drops get stronger in later regions.
- Stage rewards can include a random gear roll; higher stages roll better. Gear progression beyond that is deliberately undecided for now.
- Unwanted items sell for gold. There's no salvage for now.
- The Bag holds 60 pieces of gear for now. When it's full, new gear sells where it drops, so a full Bag never sends the party home *(decided overnight, review)*.

### Party items
- Items come from timed free potions, loot drops at rarity rates, stage rewards, the home base shop and buildings that brew them.
- Nothing refills for free.

### Gear shows on the sprite
- Every item changes how the hero's sprite looks, whether it's a weapon, armour or an accessory. You can read a hero's kit from their sprite in battle, at the camp and in menus.
- Gear is drawn as layers on the class sprite, so one item looks the same wherever the hero appears.
- You can try an item on before equipping it and see the change on the sprite.

## 8. Home base

### The camp
- The home base is a camp. The current party sits around a fire in the middle, with the building plots in a ring around them.
- You drag sideways to walk around the fire. The building nearest you comes to the front, and its card offers its main action.
- The ring is the only way into buildings. There is no separate list view.
- Heroes at the fire have small idle animations and react when tapped.

### Building plots
- You start with 3 building plots *(tune after play-testing)* and choose what to build on each one. Building and upgrading are instant.
- More plots unlock as your Renown rises. Plots you haven't unlocked are left as gaps in the ring until they open.
- The recruit board stands outside the plots, so the most plots you can have is 14, one for each other building type. Until then there are more buildings on offer than plots, so every plot is a choice.
- You can tear a building down to free its plot. You get nothing back, so a building you raise again starts from scratch. What it taught stays, such as conditions and trained slots; what it provides goes, such as beds, slots and bonuses.

### Renown (account level)
- Renown is an account level, separate from the heroes' levels.
- It rises with your overall progress through the game *(tune)*: new stages lit, XP earned in battle, bosses beaten, level thresholds passed, new classes joining the roster, and buildings built and upgraded.
- Certain Renown levels unlock another building plot. For now, plots are all Renown unlocks; other rewards may come later.
- Recruiting upgrades, such as more picks and a bigger roster, come from buildings, not from Renown.

### Materials
You build the home base with gold and with materials earned in battle, and you start with 100 gold *(tune)*. Each region drops one material more often than others. A building's first two levels cost Bone Dust and its later levels its home material, so particular buildings send you back to particular regions. Material names are placeholders:

| Region | Material |
|---|---|
| Gravefields | Bone Dust |
| Drowned Chapel | Chapel Wax |
| Thornwood | Heartwood |
| Ashen Keep | Cinder Iron |
| Hollow Throne | Throne Tallow |

### Buildings
| Building | What it does |
|---|---|
| Recruit board | Recruits; upgrades add more recruits, more picks and higher-level recruits. Stands outside the plots. |
| Barracks | Raises the roster cap |
| Infirmary | Speeds up fatigue recovery and adds beds for resting characters |
| Tactician | Teaches new rule conditions, and adds party rule slots and loadout slots |
| Shrine | Respecs skill trees |
| Masters' Hall | Trains a character, away for idle time, to gain a skill slot or a rule slot |
| Shop | Sells party items |
| Passive-bonus buildings | Small permanent bonuses for the party, each with a focus: the Whetstone (Power or Crit), Ossuary (Health or Defense), Hexing Stone (harmful effects land more often) and Bell Tower (resistances) |
| Idle buildings | Gains while the app is closed (section 9) |

Buildings unlock gradually, so the first half hour introduces one system at a time. In Region I, first clears bring them in this order: the recruit board opens at 1-2, then come the Toll House (1-5), Infirmary (1-7), Training Yard (1-8), Shop (1-10), Tactician (1-11), Scavenger Camp (1-13), Barracks (1-15) and Salvage Pit (1-16). The Masters' Hall and Shrine come with Region II, the Whetstone and Ossuary with Region III, and the Hexing Stone and Bell Tower with Region IV.

## 9. Offline gains

### While the app is closed
- Offline gains come only from home base buildings. Battles don't run while the app is closed: closing it brings the party home after the battle under way, which resolves when you return *(decided overnight, review)*.
- Characters at camp keep resting, so their fatigue keeps falling.

### Idle buildings
Idle buildings keep producing while the app is closed. Basic versions unlock early in Region I.

| Idle building | What it produces |
|---|---|
| Scavenger camp | Materials; you choose the region to scavenge |
| Training yard | XP for resting characters, up to the level of your highest lit stage; you choose who trains |
| Toll house | Gold, or party items |
| Salvage pit | A chance of gear; you choose the slot type |

### Customising upgrades
- Upgrades raise output and how many hours of gains a building can store.
- Upgrades also offer real choices, e.g. trade output for rarity, or widen a focus.
- Each building has a **focus** setting, so you decide what you gain while away.

### Return screen
- Coming back shows a short summary of what was gained while you were away.

## 10. Campaign map and content

### The map
- The map is the Lantern Road through five regions: Gravefields (levels 1–10), Drowned Chapel (11–30), Thornwood (31–50), Ashen Keep (51–75) and Hollow Throne (76–100).
- Each region has 17 or 18 stages: road stages, two elite stages and a boss. Elites are stages on the road itself, so in Region I each one is a teaching gate *(decided overnight, review)*.
- Cleared stages are lit, so the map shows how far your light reaches.

### Difficulty
- The curve is a sawtooth: easy road stages, a wall at each elite and boss, then a breather. Each wall gives way to the rule it teaches, or to a level or two.
- Strategy should count for more than levels. A good lineup with good rules should be able to win a wall a level or two under its recommended level. Around that level, one level should move a wall's win chance by about 15–25 points *(decided overnight, review)*.

### Content for a first release *(tune)*
- 88 stages
- 41 foe types (27 already have art)
- 12 classes, each with 28 skills
- 92 items
- 42 rule conditions

Stages and foes are defined in data tables so content can grow quickly.

## 11. Visuals and flow

- **Between stages:** the party walks the lit road between stages, and each battle starts where they stop.
- **In battle:** lunges, projectiles, spell flashes, hit sparks, damage numbers, status icons, and a fade on defeat. Skill callouts show the rule behind each action.
- **Rewards:** loot flies into the bag. Level-ups are celebrated after a battle, never mid-battle.
- **Hero sheet:** the Stats and Gear tabs show the hero's full battle sprite on a small stage, where you can watch each of their skills play out. The Skills and Rules tabs leave that space to their content.
- **Layout:** every screen apart from battles is built for one-handed portrait phone use.
- **Visual identity:** cozy-gothic pixel art, warm lantern light against the dark, procedural music and sound.

## 12. Build order

Each step ends with something you can play-test.

1. **Battle engine and battle screen.** A fixed party of 6 fights a few stages. The test: is it fun to watch? *(done)*
2. **Rules:** character and party rules, with unlocks. *(done, plus the app shell and saves)*
3. **Characters:** classes, stats, levels, stat and skill points, thresholds, skill trees, passives and equipped skills. *(done)*
4. **Equipment** loot. *(done)*
5. **Home base:** the camp, building plots and Renown, recruiting, the roster, fatigue and recovery, the first buildings, materials, idle buildings and offline gains. Spec: `docs/home-base-spec.md`.
6. **Campaign map** and a fully built Region I. Spec: `docs/campaign-spec.md`.
7. **Regions II–V**, onboarding and polish.

### Technical approach
- **Battles are a deterministic simulation.** The simulation produces an event log, and the battle screen animates that log. This gives three things:
  - an instant Skip
  - reliable balance testing
  - offline gains calculated from timestamps
- **Code is split into a few files:** data, simulation and screens.
- **Reused from the current game:** the pixel sprite, lighting and audio pieces.
- **Publishing:** the game is published as one multi-file artifact at the existing link.

## 13. Not now, maybe later

- A mode with permanent death.
- A roguelike mode.
- Random good and bad traits on recruits.
- Rules with two conditions each.

Team bonuses for matching or mixing factions are not planned.
