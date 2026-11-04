# Lantern Road

A dark-fantasy idle party battler, built for phones in portrait. Six lantern-bearers fight on their own, by the rules you give them. The design lives in [docs/design.md](docs/design.md).

## The idle battle prototype (build steps 1–6 and 7a)

Open `index.html` in a browser. It needs no build step and no internet connection; the fonts ship in `fonts/`. A new game starts with one hero, picked from the Sellsword, the Hexblade and the Pilgrim, and 100 gold. The camp brings the rest of the party, and they walk the whole Lantern Road: 88 stages through five regions, each with two elites and a boss.

- **The five regions:** the Gravefields (levels 1–10, the Sexton), the Drowned Chapel (11–30, the Drowned Bishop), Thornwood (31–50, the Antlered One), the Ashen Keep (51–75, the Burnt Marshal) and the Hollow Throne (76–100, the Hollow King). Each has its own foes, battle backdrop, weather, map and material, and each boss's first clear grants its Relic and opens the next region, with its buildings and the classes that join the Recruit Board. The first time the party walks into a region, its name comes up before the stage's.

- **The Base tab, the camp:** the party sits around a fire, with building plots in a ring around it, the road out of camp and the Recruit Board. Drag sideways (or use the ‹ › buttons or the arrow keys) to walk round; the nearest building faces you, and its card offers its main action: Open, Collect, Build or Set out. Tap a hero at the fire to hear from them, or the fire for its free Healing Draughts. Plots Renown hasn't cleared are gaps in the ring. The ring is the only way into buildings.
- **Buildings:** 3 plots to start, up to 14. Fifteen buildings, each with five levels: the Recruit Board (outside the plots), Toll House, Infirmary, Training Yard, Shop, Tactician, Scavenger Camp, Barracks, Salvage Pit, Masters' Hall, Shrine, and the passive Whetstone, Ossuary, Hexing Stone and Bell Tower. Region I's first clears turn them into blueprints. Building is instant; levels 1–2 cost gold and Bone Dust, and level 3 and up the building's home material. Levels 3 and 5 offer a choice of two, which can be switched later. Tearing a building down frees its plot and gives nothing back; what it taught stays.
- **Renown:** the account level. Stages lit, battle XP, bosses, level thresholds, new classes, and buildings built or upgraded raise it, and it clears plots 4 to 14. The lantern badge in the camp's corner opens its track.
- **The Recruit Board:** it opens at 1-2, and its first recruit is free. Each board shows recruits with rolled stats (bars show where each roll falls in its class's range), priced by level and quality: one hire per board, and a new board when the party comes home or every 4 hours. Its three tracks add recruits, picks and higher levels, up to storied recruits who arrive combined or awakened. The Barracks raises the roster cap from 8. Swipe a hero left on the Party tab to dismiss them: only their gear comes back.
- **Fatigue and rest:** each turn a hero takes adds 1 fatigue, changed by Iron Will, Comfort, Laudanum, Peaceful Rest, Cold Compress, Transfusion, House Calls and gear. Weary (50) costs 5% of Power, Defense and Speed, Exhausted (75) 15%, and Spent (100) keeps a hero home until they fall below 50. Heroes rest at the fire (10 an hour), in the Infirmary's beds (20–35), in the Training Yard or at a lesson, whether the app is open or closed.
- **Idle buildings and time away:** the Toll House (gold, or party items), the Scavenger Camp (a region's material, and rare finds), the Training Yard (XP, up to the level of your highest lit stage) and the Salvage Pit (gear rolls) produce on real time, up to their storage. Coming back after 5 minutes or more, "While you were away" lists what came in, who rested, lessons finished and new faces, with Gather it all. Closing the app never plays battles: only buildings work while you're gone.
- **The economy:** the loadout draws party items from the Bag, so nothing refills for free. The Shop sells party items (dearer as the road goes on) and a small gear stall; a free Healing Draught waits by the fire every 4 hours, up to 3; the Infirmary's still-room brews more. Gear sells for 10, 25 or 60 gold × S.
- **Training:** the Masters' Hall teaches rule slots IV–VI and skill slots I–II while the hero is away (a combined hero trains up to the highest rule-slot maximum among their classes). The Shrine respecs for gold. The Tactician builds on Tactician I (the 1-11 clear): a 3rd party rule slot at level 1, then loadout slots 3 and 4, more party rule slots, and Lessons II and III.

- **The Road tab:** the region map, read from the bottom up. Lit stages are burning lanterns whose light joins up; the frontier lantern gutters with the party beside it; the dark stages above show their foes only as silhouettes. Elites are red diamonds and the boss a skull. Tap the region's name for the whole road, all five regions; a region stays dark until the boss before it falls.
- **The stage sheet:** tap a lantern. The stage's foes in their formation (tap one for its stats, skills, phases and resistances), the recommended level and party size coloured by how ready you are, its rewards and first-clear unlocks, the trip settings, the party with their fatigue (and, for Spent heroes, when they're fit again, which opens the Infirmary's beds), and Set out (the frontier) or Farm (a lit stage). The trip settings' "Come home when" chips switch the between-battle party rules: fatigue 75+, an ally fell, before a boss or elite, and out of Healing Draughts. A chip needs a free party rule slot.
- **Trips:** the party sets out, fights, and with "Keep going after a win" (from 1-6) walks on to the next stage, until a battle is lost, a between-battle party rule calls it home (on by default: any hero at 75+ fatigue), the boss falls, every hero is Spent, or you call it home. A Spent hero walks home alone while the rest carry on. Closing the app brings the party home after the battle under way, which is resolved on your return; nothing plays while the app is closed. The Road tab shows the trip's summary when the party is home.
- **Rewards:** every foe defeated drops gold, XP and a chance of loot by its rank; a win adds the clear reward by the stage's tier, doubled for gold and materials on a first clear; Bone Dust; party items and gear into the Bag (a full Bag sells new gear where it drops). XP is a share of a level at the stage's level, so a hero below it catches up fast. Called foes drop nothing.
- **First clears teach:** the Tactics screen (1-1), party items (1-3), new conditions in every region but the last, Keep going (1-6), Tactician I (1-11: thresholds, a dozen conditions, the Move action, Focus fire and saved rule sets) and each boss's Relic, and they bring the buildings' blueprints. The Tactician's Lesson II (its level 3) brings the Gather action.
- **Foe behaviour:** melee foes placed behind wait and step up when a front slot opens; summoners call foes into empty slots; bosses change at a share of their health, with a callout; wandering foes (a Moth Swarm, a Cage Mimic that runs at round 6) can join replays. From Region II: healers and raisers, Silence, turn delays, bursting corpses, mana drain (the Font Leech), wolf packs, foes that start Hidden (the Hanged Man), Lure and Reorder the Court pulling a back-row hero forward (Move resistance resists, and the Move action walks back), thorns that hurt attackers (Mother Bramble), charged blasts on a whole row, regeneration (the Antlered One), covers, siege shots, splashing blows and a burning aura (the Burnt Marshal), stolen and snuffed buffs, confusion, and the Hollow King's three phases.
- **The Party tab:** Arrange moves heroes between the six slots, and leaves some out, so a party of 1 to 6 sets out. Each hero shows their fatigue and where they are: in the party, at the fire, in a bed, training, at a lesson, or Spent and when they'll be fit again.

- **Landscape battles:** battles and the report are played in landscape: turn your phone sideways. Held upright, the battle is drawn on its side. Every other screen is portrait.
- **Heroes:** each has rolled stats, a basic attack, their class's starter skill and a short list of rules. Front-row classes take the front slots, nearest the foes.
- **Characters grow:** battles give XP, up to level 200. Each level brings a stat point, and every fifth a skill point. Thresholds at 30, 50, 80, 100, 120, 150, 180 and 200 open the next tier of a skill tree, combine with another class (at 50 and 200) or open an awakening (from 100), and each brings a free respec. Level-ups are celebrated after the battle.
- **The hero sheet:** tap a hero on the Party screen. Stats shows the hero on a small stage where skills play on a training dummy, the points to spend and the equipped skills. Skills holds the skill tree: 28 skills per class in three build paths, each with levels 1–5 and an awakened form. Rules opens the rules editor.
- **Gear:** every hero carries a Common weapon of their class's type, and can wear armour and an accessory. The content spec's 92 items are all in: 42 weapons, 15 armour, 30 accessories (12 of them class-only) and 5 Relics. Most trade a bonus for a cost, or work under a condition. Each piece has a rarity (Common, Fine, Rare or Relic) and an item level, and its plain stats grow with that level. Every piece changes how the hero is drawn, in battle, on the hero sheet and in menus.
- **The Gear tab and the Bag:** on the hero sheet, tap a piece in the Bag to try it on the sprite, and again for its card: what it gives always, what it costs and when it works, against what the hero wears now. The Bag tab holds up to 60 unworn pieces and sells the ones you don't want; when it's full, new gear sells where it drops. Stages drop loot now; the Bag's Prototype panel still rolls gear at any region's rates.
- **Rules:** on each turn a character reads its rules from the top and uses the first one that is true and possible. Only equipped skills fire. If no rule applies, it uses its basic attack.
- **Turn flags:** banners along the top show who acts next and the skill each will use. The first is the turn being played, with the rule that chose it.
- **The back row:** melee attacks must hit the front row while anyone stands there. Skills with reach leap past it, and a Guard pulls single-target attacks onto the tank.
- **Statuses and resistances:** the content spec's statuses. A harmful one lands on a roll of its chance minus the target's resistance (Stun, Move, Bleed, Blight, Curse, Debuff).
- **Mana and enrage:** skills cost mana, and basic attacks restore some. From round 15 the foes are enraged and hit harder every round, so no battle can stall.
- **Watching:** battles play on their own, at 1×, 2× or 4×. Pause, then tap Turn to play one turn at a time, or skip to the result. Between battles on a trip the party walks on by itself; the card that shows the rewards has Report and Come home.
- **The report:** what the battle brought home (gold, XP, materials, loot, unlocks, fatigue) and why the trip ended, leading with the stage's hint after a loss; damage dealt and taken, and healing done and received, for every character. Tap a character to see how often each of its rules fired and its best moments.
- **Prototype tools,** for play-testing without the grind: the camp's Prototype chip adds gold, materials, every blueprint (and region), a level of Renown, or 1 or 8 hours of time. The hero sheet's Train buttons add levels, the rules editor can learn every condition, and the Bag can roll gear. The final polish step gathers them into one panel.
- **Sound:** sound effects only; the music is off until it is reworked.
- **Keys:** Space or P plays and pauses, N plays one turn, F changes the speed, S skips, and Esc opens the menu.

### Code

| File | What it holds |
|---|---|
| `js/core.js` | Seeded random numbers and small helpers |
| `js/data.js` | Statuses, resistances, foe skills, rule conditions, items, foes and stages |
| `js/classes.js`, `js/classes-late.js` | The twelve classes: stats, growth, resistances and skill trees, as data with small behaviour hooks |
| `js/sim.js` | The battle simulation: a seed and a setup in, an event log out |
| `js/items.js` | Equipment: the 92 items as data with small behaviour hooks, item levels, loot rolls, Relics, the Bag and selling |
| `js/hero.js` | Characters: rolled stats, levels and XP, points, thresholds, skill trees, equipped skills, the gear they wear |
| `js/art.js` | Pixel sprites, icons and scenery; heroes drawn in layers (class body, armour, accessory, weapon) |
| `js/audio.js` | Settings, sound effects and procedural music |
| `js/save.js` | The game state, its versions and migrations, and saving |
| `js/battle.js` | The battle screen, which animates the event log |
| `js/app.js` | The app shell: the Party screen, settings and time away |
| `js/base.js` | The home base model: buildings and plots, Renown, the Recruit Board, idle buildings and time away, the Shop, the Masters' Hall, the Shrine, the Tactician and the passive-bonus buildings |
| `js/rest.js` | Fatigue: its penalties, each battle's settlement with the skills and gear that change it, and rest at the fire, in beds, in the yard and at the Hall |
| `js/camp.js` | The Base tab: the camp ring around the fire, the first pick, "While you were away", the Renown track and the roster rows (styles in `css/base.css`) |
| `js/buildings.js` | Each building's screen, and building on an empty plot |
| `js/campaign.js` | The campaign model: the road's progress, rewards, fatigue, first-clear unlocks and trips |
| `js/map.js` | The Road tab: the region map, the stage sheet and the whole road (styles in `css/map.css`) |
| `js/bag.js` | The item card, choosing who wears a piece, and the Bag screen (styles in `css/gear.css`) |
| `js/rules.js` | Tactics: the rules and loadout model, and the rules editor (styles in `css/rules.css`) |
| `js/stage.js` | The sprite stage on the hero sheet |
| `js/sheet.js` | The hero sheet (Stats, Skills, Gear, Rules), skill tree, thresholds and the level-up moment (styles in `css/sheet.css`) |
| `js/main.js` | The battle screen's controls, trips between battles, the battle report with its rewards, first-time tips and boot |

The simulation and the hero model never touch the page, so the same code runs the battle on screen, the Skip button and the headless tests.

### Tests

- `node tools/simtest.js [battles per stage]` simulates hundreds of battles per stage and checks every event log for broken rules. It tests the home base: a new game, the Recruit Board, the gold over Region I's first clears against the campaign's party sizes, rest and beds, each battle's fatigue, idle buildings and time away (the same after a reload), costs, choices and tearing down, Renown, the Hall, the Shrine, the Tactician, the Shop, dismissing and the save. It ends with the campaign: the five regions' data and art, each region's engine pieces, rewards, fatigue, unlocks and trips, and the reference-party report (campaign spec §5.6), every stage of every region one and two levels either side of its recommendation against its target, with each region's farming loop. `node tools/simtest.js --ref [battles] [--regions=2,3]` runs only that report (`tools/reference.js`). It also runs the party at several levels, rules and skills experiments, a fuzz of random builds across all twelve classes, and tests of the hero model, the save migration and the rules model. For gear, it checks that every item's effect fires, runs random gear on random builds, compares a Common, Fine and Rare weapon in the same fights, and tests loot odds, the Bag and equipping.
- `python tools/shot.py index.html out.png` takes phone-sized screenshots in headless Chromium and prints console errors (needs Playwright). A steps file can wait for the page (`until:<expression>`), so a screenshot can catch a boss's phase change.
- `tools/sprites.html` shows every sprite and icon at a large size: all twelve classes from the side and from behind, every weapon, armour and accessory on a hero, the thralls, the item icons and every foe by region. Add `?part=classes`, `weapons`, `armour`, `accessories`, `icons` or `foes` for one part.

## The first version: a roguelike

A dark-fantasy roguelike in a single HTML file, `lantern-road.html`, kept in the repository for now. Your lantern-bearer walks a cursed road on their own. You steer between lanes to choose forks, fight turn-based battles, and try to end the Hollow King.

### Play

Open `lantern-road.html` in a browser. It needs no build step, no server and no internet connection: the fonts ship in `fonts/`.

- **Move between lanes:** arrow keys, A/D, the on-screen arrows, or tap either side of the road.
- **Choose actions:** number keys 1–5, or click.
- **Pause:** P or Esc.
- **Speed:** the speed button switches between 1× and 2×. It speeds up walking, fight animations and auto-play decisions.
- **Auto:** the Auto button makes the game play itself. It picks forks, steers toward oil and gold, fights, and makes event and shop choices. Pressing Pause or opening Relics stops it until you resume.
- **Tips:** tap any icon, enemy intent or status to see what it means. The first walk teaches forks, intents, draughts, oil and relic sets with one-time hints.
- **Settings:** sound effects, music, and screen shake and motion can each be turned off. Settings also holds How to Play and Erase progress.

Speed, auto play, settings and the chosen Darkness level are remembered on the device.

### Developer mode

Tap the **Lantern Road** title seven times, or open the page with `#dev` at the end of the address. Developer mode adds 3×, 5× and 10× speeds; with Auto on at 10×, a full walk takes about a minute and a half. Settings has a button to leave developer mode.

### Rules

- **The run:** 5 regions (Gravefields, Drowned Chapel, Thornwood, Ashen Keep, Hollow Throne), each with 10 events and a boss.
- **Events:** Fight, Elite, Mystery, Campfire, Merchant, Shrine, Treasure.
- **Lantern oil:** burns as you walk. When it runs out, the dark takes 1 HP every few steps.
- **Combat:** turn-based. The foe shows its next move. You can Strike, Guard, use your class skill, drink a draught (a free action), or flee normal fights. Strikes and damage skills show how their damage adds up, relic by relic.
- **Relic sets:** many relics belong to a build style: Blood, Ward, Hex or Lantern. Carrying 3 of one style switches on its set bonus (Bloodletter, Bulwark, Hexed Path, Lamplighter).
- **Scoring:**

  | Action | Points |
  |---|---|
  | Normal enemy | +10 |
  | Elite | +50 |
  | Boss | +200 |
  | Region cleared | +100 |
  | Gold held at the end | +1 per gold |
  | Victory | +500, then the total ×1.5 |
  | Darkness level | the final total ×(1 + 0.25 per level) |

### Progression

- **Embers:** every run earns 1 ember per 100 points. Spend them at the Pyre to unlock classes (Hexblade, Pilgrim), relics, mystery events, and a starting-relic choice.
- **Achievements:** 21 achievements, each worth a few embers. They are listed in the Codex.
- **Codex:** achievements, a bestiary of every foe you have defeated, and every relic you have found.
- **Darkness:** winning unlocks the next Darkness level, up to V. Levels stack: more foe HP, a hungrier lantern, harder elites and bosses, pricier merchants.
- **Daily Road:** one shared road per calendar day, with the same class, foes and forks for every player. One walk per day, double embers, and a streak for playing on consecutive days. It ignores Pyre unlocks so everyone draws from the same pool.

### Look and sound

- **Cozy gothic:** a violet night with warm amber light. The lantern swings as the hero walks, wayside lanterns and grave candles glow along the road, and a soft vignette frames the scene.
- **Icons instead of words:** the HUD, enemy intents, statuses, combat actions, prices and rewards all use pixel icons with numbers.
- **Feedback:** pickups fly into their counters, counters bump, big hits flash and shake the screen, foes lunge before they strike, relics come out of an opening chest, and the end-of-walk score counts up.
- **The Pyre:** a campfire scene. Each unlock lights one of the ten lanterns around it.
- **Music and sound:** each region has its own procedural ambient tune with a drone, a soft plucked melody, lantern crackle, and rain in the Drowned Chapel. All sounds pass through a soft filter and a short echo.

### Saving

- **The walk in progress** is saved before each event and every few seconds while walking. If the game closes, Continue on the title screen picks it up. If it closed during an event, that event starts again.
- **Embers, unlocks, records, achievements and the Daily Road streak:** when the page runs as a Claude artifact, they save to the viewer's account. Opened anywhere else, they save to the browser's local storage.

### Fonts

Pirata One, Silkscreen and Spectral are bundled in `fonts/` under the SIL Open Font License 1.1. The license texts are in `fonts/OFL-*.txt`.
