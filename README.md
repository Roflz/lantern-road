# Lantern Road

A dark-fantasy roguelike in a single HTML file. Your lantern-bearer walks a cursed road on their own. You steer between lanes to choose forks, fight turn-based battles, and try to end the Hollow King.

## Play

Open `lantern-road.html` in a browser. It needs no build step, no server and no internet connection: the fonts ship in `fonts/`.

- **Move between lanes:** arrow keys, A/D, the on-screen arrows, or tap either side of the road.
- **Choose actions:** number keys 1–5, or click.
- **Pause:** P or Esc.
- **Speed:** the speed button cycles through 1×, 2×, 3×, 5× and 10×. It speeds up walking, fight animations and auto-mode decisions.
- **Auto mode:** the Auto button makes the game play itself. It picks forks, steers toward oil and gold, fights, and makes event and shop choices. Pressing Pause or opening Relics stops it until you resume. Combined with 10×, a full run takes about a minute and a half, which is handy for development.

Speed, auto mode and the chosen Darkness level are remembered in your browser.

## Rules

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

## Progression

- **Embers:** every run earns 1 ember per 100 points. Spend them at the Pyre to unlock classes (Hexblade, Pilgrim), relics, mystery events, and a starting-relic choice.
- **Achievements:** 21 achievements, each worth a few embers. They are listed in the Codex.
- **Codex:** achievements, a bestiary of every foe you have defeated, and every relic you have found.
- **Darkness:** winning unlocks the next Darkness level, up to V. Levels stack: more foe HP, a hungrier lantern, harder elites and bosses, pricier merchants.
- **Daily Road:** one shared road per calendar day, with the same class, foes and forks for every player. One walk per day, double embers, and a streak for playing on consecutive days. It ignores Pyre unlocks so everyone draws from the same pool.

## Saving

- **The walk in progress** is saved before each event and every few seconds while walking. If the game closes, Continue on the title screen picks it up. If it closed during an event, that event starts again.
- **Embers, unlocks, records, achievements and the Daily Road streak:** when the page runs as a Claude artifact, they save to the viewer's account. Opened anywhere else, they save to the browser's local storage.

## Fonts

Pirata One, Silkscreen and Spectral are bundled in `fonts/` under the SIL Open Font License 1.1. The license texts are in `fonts/OFL-*.txt`.
