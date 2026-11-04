# Lantern Road

A dark-fantasy idle party battler, built for phones in portrait. Six lantern-bearers fight on their own, by the rules you give them. The design lives in [docs/design.md](docs/design.md).

## The idle battle prototype (build step 1)

Open `index.html` in a browser. It needs no build step and no internet connection; the fonts ship in `fonts/`. A fixed party of six fights six stages in the Gravefields and the Drowned Chapel, ending with the Drowned Bishop.

- **Landscape battles:** battles and the report are played in landscape: turn your phone sideways. Held upright, the battle is drawn on its side. The camp stays in portrait.
- **The party:** the Warden and the Sellsword stand in front, nearest the foes. The Crossbowman, Pilgrim, Lamplighter and Hexblade stand behind. Each has a basic attack, two skills and a short list of rules.
- **Rules:** on each turn a character reads its rules from the top and uses the first one that is true and that it has the mana for. If none applies, it uses its basic attack.
- **Turn flags:** banners along the top show who acts next and the skill each will use. The first is the turn being played, with the rule that chose it.
- **The back row:** melee attacks must hit the front row while anyone stands there. Lunge and the Reaping Hook leap past it, and a Guard pulls single-target attacks onto the tank.
- **Mana and enrage:** skills cost mana, and basic attacks restore some. From round 15 the foes are enraged and hit harder every round, so no battle can stall.
- **Watching:** battles play on their own, at 1×, 2× or 4×. Pause, then tap Turn to play one turn at a time, or skip to the result. The next stage waits until you choose it.
- **The report:** damage dealt and taken, and healing done and received, for every character. Tap a character to see how often each of its rules fired and its best moments.
- **Sound:** sound effects only; the music is off until it is reworked.
- **Keys:** Space or P plays and pauses, N plays one turn, F changes the speed, S skips, and Esc opens the menu.

### Code

| File | What it holds |
|---|---|
| `js/core.js` | Seeded random numbers and small helpers |
| `js/data.js` | Classes, foes, skills, statuses, rule conditions and stages |
| `js/sim.js` | The battle simulation: a seed and a setup in, an event log out |
| `js/art.js` | Pixel sprites, icons and scenery |
| `js/audio.js` | Settings, sound effects and procedural music |
| `js/battle.js` | The battle screen, which animates the event log |
| `js/main.js` | The camp, the battle report, settings and saving |

The simulation never touches the page, so the same code runs the battle on screen, the Skip button and the headless tests.

### Tests

- `node tools/simtest.js [battles per stage]` simulates hundreds of battles per stage. It reports win rates, battle length and which skills fire, and checks every event log for broken rules.
- `python tools/shot.py index.html out.png` takes phone-sized screenshots in headless Chromium and prints console errors (needs Playwright).
- `tools/sprites.html` shows every sprite and icon at a large size.

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
