# Lantern Road

A dark-fantasy roguelike in a single HTML file. Your lantern-bearer walks a cursed road on their own. You steer between lanes to choose forks, fight turn-based battles, and try to end the Hollow King.

## Play

Open `lantern-road.html` in a browser. It needs no build step and no server. Fonts load from Google Fonts.

- **Move between lanes:** arrow keys, A/D, the on-screen arrows, or tap either side of the road.
- **Choose actions:** number keys 1–5, or click.
- **Pause:** P or Esc.

## Rules

- **The run:** 5 regions (Gravefields, Drowned Chapel, Thornwood, Ashen Keep, Hollow Throne), each with 10 events and a boss.
- **Events:** Fight, Elite, Mystery, Campfire, Merchant, Shrine, Treasure.
- **Lantern oil:** burns as you walk. When it runs out, the dark takes 1 HP every few steps.
- **Combat:** turn-based. The foe shows its next move. You can Strike, Guard, use your class skill, drink a draught (a free action), or flee normal fights.
- **Scoring:**

  | Action | Points |
  |---|---|
  | Normal enemy | +10 |
  | Elite | +50 |
  | Boss | +200 |
  | Region cleared | +100 |
  | Gold held at the end | +1 per gold |
  | Victory | +500, then the total ×1.5 |

- **Meta-progress:** every run earns 1 ember per 100 points. Spend embers at the Pyre to unlock classes (Hexblade, Pilgrim), relics, mystery events, and a starting-relic choice.

## Saving

When the page runs as a Claude artifact, embers and records save to the viewer's account. Opened anywhere else, they save to the browser's local storage.
