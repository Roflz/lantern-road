# Lantern Road: Game Design

Agreed 2026-11-03, with decisions from the screen mockups added the same day. This document is the source of truth for the game. Where older code or notes disagree with it, this document wins. Numbers marked *(tune)* are starting values to adjust in play-testing.

## 1. Pillars

1. **Idle battles that are fun to watch, but never required.** Every battle plays out on its own, and you can always skip it.
2. **Strategy is how you prepare.** You win through your formation, the rules you give each character, the skills they equip and the gear they wear.
3. **Characters you grow.** Characters keep their levels, skills and gear for good.
4. **A home base you build.** It gives passive bonuses and keeps earning while you're away.
5. **Visuals and flow come first.** Every screen, animation and transition is judged by how it feels to the player.

## 2. Core loop

Home base → campaign map → stage → idle battle → rewards (XP, gold, gear, materials) → next stage.

Stages chain on their own until one of these happens:
- the party loses
- a party rule sends it home
- characters become too fatigued to continue

You then strengthen the party and push further. Cleared stages can be replayed to farm XP, gear and materials.

## 3. Battles

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
- Potions are party items that party rules use.

### How a battle ends
- A battle ends when one side has no one standing.
- After a turn limit *(tune)*, foes become enraged and hit harder every turn, so no battle can stall.

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
- Each class starts with 1–2 rule slots and has its own maximum, around 4–6 *(tune)*.
- You buy extra slots with level-up points, and each extra slot costs more than the last.

### Party rules
- A separate, small set of team-wide rules. Examples:
  - "Any ally below 30% health → Healing draught"
  - "Everyone attacks the leader's target"
  - "Return to base when any character reaches X fatigue"
- Extra party rule slots come from home base buildings.

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

### Saved rule sets
- You can save sets of rules and switch between them for different stages.

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

### Stats
- Health, Mana, Power, Defense, Speed, Crit chance and Dodge.
- Each class has its own growth per level.

### Recruits
- Recruits arrive with randomised stats within their class's ranges. That makes choosing between two recruits of the same class a real decision.

### Levels and points
- XP comes from battles.
- Each level gives **universal points**. You spend them on any of:
  - an extra rule slot
  - a stat increase
  - a skill point in the class's skill tree

### Skill trees
- Each class has its own skill tree.
- Nodes unlock new skills, rank skills up and add passives.
- You can't take everything.
- Respeccing costs gold at a home base building.

### Equipped skills
- Each character has a basic attack plus 1 equipped skill.
- A second skill slot unlocks at a later level.
- Rules decide when the equipped skills are used.

### Fatigue
Fatigue runs from 0 to 100 and plays the role of Darkest Dungeon's stress.

- **How it rises:** fatigue builds from the damage a character takes, measured against their maximum health *(tune)*. Being knocked out adds a large amount *(tune)*.
- **Thresholds:**
  - **Weary (50+):** a small stat penalty *(tune)*.
  - **Exhausted (75+):** a larger stat penalty *(tune)*.
  - **Spent (100):** the character can't be used until fatigue falls below a recovery threshold *(tune)*. If they hit 100 mid-push, they leave the party after that battle.
- **Recovery:** fatigue falls over real time while the character rests at the home base. Buildings speed this up.

### Death
- Characters don't die in the main mode. A mode with permanent death may come later as a separate mode.

## 6. Recruiting and the roster

The recruiting system follows Darkest Dungeon's stagecoach.

### First pick
- You start by choosing 1 character from 3 options: Sellsword, Hexblade or Pilgrim.

### The recruit board
- The recruit board shows a few recruits with randomised stats.
- It refreshes each time you return to the home base, and also slowly over real time *(tune)*. The board shows a timer for its next refresh.
- Recruits cost gold.

### Upgrades
Home base upgrades improve recruiting:
- **More recruits on the board** to choose from.
- **More picks per refresh:** you start able to take only 1 from each board, and upgrades raise that.
- **A larger roster cap.** When the roster is full, you dismiss someone to make room.

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
- **Armour** comes in three weights, each with a trade-off: light, medium and heavy. Heavy armour gives more health but less speed.
- **Accessories** can be used by anyone, plus a few class-only accessories.

### Rarity and drops
- Common, Fine, Rare and Relic. A Relic is unique: you can only own one copy.
- Drops get stronger in later regions.

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
- You start with 3 building plots *(tune after play-testing)* and choose what to build on each one.
- More plots unlock as your Renown rises. Plots you haven't unlocked are left as gaps in the ring until they open.
- For now, the most plots you can have is the number of building types, one plot for each. Until then there are more buildings on offer than plots, so every plot is a choice.
- You can tear a building down to free its plot. You get nothing back, so a building you raise again starts from scratch.

### Renown (account level)
- Renown is an account level, separate from the heroes' levels.
- It rises with your overall progress through the game *(tune)*, for example new stages lit, bosses beaten, hero levels gained and buildings built.
- Certain Renown levels unlock another building plot. For now, plots are all Renown unlocks; other rewards may come later.
- Recruiting upgrades, such as more picks and a bigger roster, come from buildings, not from Renown.

### Materials
You build the home base with gold and with materials earned in battle. Each region drops one material more often than others, so particular buildings send you back to particular regions. Material names are placeholders:

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
| Recruit board | Recruits; upgrades add more recruits and more picks |
| Barracks | Raises the roster cap |
| Infirmary | Speeds up fatigue recovery and adds beds for resting characters |
| Tactician | Teaches new rule conditions and adds party rule slots |
| Shrine | Respecs skill trees |
| Passive-bonus buildings | Small permanent bonuses for the party, e.g. +5% health |
| Idle buildings | Gains while the app is closed (section 9) |

Buildings unlock gradually, so the first half hour introduces one system at a time.

## 9. Offline gains

### Idle buildings
Idle buildings keep producing while the app is closed. Basic versions unlock early in Region I.

| Idle building | What it produces |
|---|---|
| Scavenger camp | Materials; you choose the region to scavenge |
| Training yard | XP for resting characters; you choose who trains |
| Toll house | Gold |
| Salvage pit | A chance of gear; you choose the slot type |

### Customising upgrades
- Upgrades raise output and how many hours of gains a building can store.
- Upgrades also offer real choices, e.g. trade output for rarity, or widen a focus.
- Each building has a **focus** setting, so you decide what you gain while away.

### Return screen
- Coming back shows a short summary of what was gained while you were away.

## 10. Campaign map and content

### The map
- The map is the Lantern Road through five regions: Gravefields, Drowned Chapel, Thornwood, Ashen Keep and Hollow Throne.
- Each region has about 15–20 stages, plus elite stages and a boss.
- Cleared stages are lit, so the map shows how far your light reaches.

### Content for a first release *(tune)*
- about 80–100 stages
- about 40 foe types (about 30 already have art)
- 6 classes, each with about 8 skills
- about 60 items
- about 40 rule conditions

Stages and foes are defined in data tables so content can grow quickly.

## 11. Visuals and flow

- **Between stages:** the party walks the lit road between stages, and each battle starts where they stop.
- **In battle:** lunges, projectiles, spell flashes, hit sparks, damage numbers, status icons, and a fade on defeat. Skill callouts show the rule behind each action.
- **Rewards:** loot flies into the bag. Level-ups are celebrated after a battle, never mid-battle.
- **Hero sheet:** the Stats and Gear tabs show the hero's full battle sprite on a small stage, where you can watch each of their skills play out. The Skills and Rules tabs leave that space to their content.
- **Layout:** every screen is built for one-handed portrait phone use.
- **Visual identity:** cozy-gothic pixel art, warm lantern light against the dark, procedural music and sound.

## 12. Build order

Each step ends with something you can play-test.

1. **Battle engine and battle screen.** A fixed party of 6 fights a few stages. The test: is it fun to watch?
2. **Rules:** character and party rules, with unlocks.
3. **Characters:** classes, stats, levels, universal points, skill trees and equipped skills.
4. **Equipment** loot.
5. **Home base:** the camp, building plots and Renown, recruiting, the roster, fatigue and recovery, the first buildings, materials, idle buildings and offline gains.
6. **Campaign map** and a fully built Region I.
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
