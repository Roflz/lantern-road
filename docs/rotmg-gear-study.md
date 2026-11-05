# Gear Study: Realm of the Mad God Exalt

Approved 2026-11-05 with every recommendation in §7, and the Relic fix, for play-test note 3.22. Nothing here is built yet. It researches how Realm of the Mad God Exalt (RotMG) handles gear, its Forge and its enchantments (§1–2), maps what fits onto our game (§3), proposes a design (§4), lists what it touches (§5), and ends with a build order and your decisions (§6–7).

- **Priorities,** in your order: a smooth play-through, rewarding progression, easy to understand, continuous and essentially limitless progression.
- **Patterns only:** no RotMG names, items, art or text. The research uses their names; the proposal uses its own words.
- **Numbers** marked *(tune)* are starting values. **[n]** is a source in §8. RotMG changes often, so every claim carries its date.

## 1. How RotMG Exalt's gear works

### 1.1 Slots, classes and kinds of item

- **Four slots:** weapon, ability, armour and ring. Each of the 19 classes uses one weapon type (six base types, plus alternates that start at T7), one ability type and one armour weight (heavy, leather or robe), and any class wears any ring [19, 34].
- **Drops lean toward the class you're playing.** This was made reliable in Sep 2025 [14].

| Kind | What it is | Range | How you get it | Why players want it |
|---|---|---|---|---|
| **Tiered** ("T") | Plain stat items, one ladder per type | Weapons T0–T14, armour T1–T15, abilities T0–T7, rings T0–T6 (wiki, 2023–24) [19] | Drops. Harder places drop higher tiers, and the top tiers only in the endgame (since Jul 2020) [19]. From May 2025, four T7+ items of one slot and tier forge into one of your choice [11] | The power floor, replaced as you climb |
| **Untiered** (UT, "whites") | Fixed items with a unique effect or shot pattern | — | White bags from particular dungeons and events, at low rates [18]; the Forge (§1.3) | Build-defining, and each belongs to a place |
| **Set-tiered** (ST) | Four-piece class sets | — | Orange bags [18]; the Forge, with a set token from dungeons (Jun 2022) [3]. New sets go first to buyers and key openers for a month or more [20] | Set bonuses from 2 pieces, the full one at 4 [20] |
| **Shiny** | Alternate-sprite versions of UTs, shots included | — | Seasonal characters only, since Mar 2023 [21]; always 2+ slots since May 2025 [11] | Looks. They can't be forged [21] |
| **Rarity** (May 2025) | A second axis on every item: its enchantment slots | Common 0, Uncommon 1, Rare 2, Legendary 3, Divine 4 | Rolled on every drop and craft (§1.4) | A better copy of an item you already like [9] |

### 1.2 Drops and bags

| Bag, lowest to highest | Holds |
|---|---|
| Brown, pink | Low tiers. Public: anyone nearby can loot them [18] |
| Purple, cyan, blue, golden | Mid to high tiers; stat potions in blue. Soulbound: only you see them [18] |
| Orange | Set pieces [18] |
| Red | The top tiers [18] |
| White | UTs. It outranks every bag but a boosted one, and lies on the ground 2 minutes instead of 1 [18] |
| Boosted | Any bag dropped while a loot boost runs, in its own look [18] |

- **Soulbound loot** needs damage worth a small share of the foe's health. Past that share, more damage doesn't help (a community reading of the loot code, 2020) [28].
- **Loot boosts:** potions and clovers give about ×1.5 drop chance, by community tests. Tier potions lift tiered drops 1–3 tiers, never past the foe's own top tier [28, 25]. Events give ×1.5 loot and XP in chosen dungeons [12], and modded keys add +15% to +75% boss loot [23].
- **Chase rates:** old leaked tables (about 2013, now outdated) put famous UTs at 1 in 100 to 1 in 1,000 kills [28]. In Mar 2025 the team wrote that build-defining items "shouldn't take a hundred or more runs of a dungeon to get" [9]. In May 2025 it about doubled most UT rates [12].

How RotMG keeps old dungeons worth running:

| Pattern | Since |
|---|---|
| Each dungeon drops its own UTs, and some drop particular stat potions | Always [18, 13] |
| Exaltation: 5/10/15/20/25 clears of a dungeon with a maxed character give that class a permanent +1 in the dungeon's stat | Sep 2020 [22] |
| Daily quests ask for a particular boss's mark | Older [26] |
| Forging a top UT needs items from its own dungeon | Jun 2022, May 2025 [3, 11] |
| Graded keys (D to S) carry 1–4 modifiers: harder, and more loot, XP or dust | 2021; reworked Apr 2026 [23, 15] |
| Steering items for enchanting drop in particular dungeons | May 2025 [11] |
| Blueprints drop from every Veteran-grade boss; event dungeons rotate weekly with boosted loot | 2025 [12, 14] |

### 1.3 The Forge

A Blacksmith in the player's vault: break items down, then make items you choose.

| Date | Change |
|---|---|
| Dec 2020 | **Launch** [1, 2]: dismantling gives Common, Rare and Legendary materials; about 30 recipes at the start, more from blueprints; each craft burns Forgefire, 400 a day, up to 1,600; Sulphur refills it; an Ore can stand in for some material (one per craft); some recipes also want a Mark |
| Jun 2022 | **Renovation** [3]: the top UTs also need a UT from the same dungeon broken down. Set pieces are made from a material only set pieces give, a set piece of the same slot and the set's token |
| Jan 2024 | **Storage** [8]: materials, marks, ores and blueprints kept as a stored balance; dismantling costs a token of Forgefire |
| May 2025 | **With rarity** [11, 16]: forged items roll slots like drops, a little worse. Ingredients all of one rarity guarantee that rarity or better. Four T7+ items of one slot and tier make one of your choice. Adept-grade items and up need two items from their dungeon. Marks dropped. Forgefire 500 a day, up to 2,000 |
| Sep 2025 – Apr 2026 | 600 a day during events; ten spare steering cards trade for five of another; more items forgeable [14, 15] |

Costs since May 2025 (RealmEye) [16]:

| Item grade | To forge | Breaking one down gives | Forgefire: forge / break down |
|---|---|---|---|
| S | 60 Legendary, 160 Rare | 15 Legendary, 40 Rare | 900 / 90 |
| A | 120 Rare, 160 Common | 30 Rare, 40 Common | 700 / 70 |
| B | 60 Rare, 120 Common | 15 Rare, 30 Common | 500 / 50 |
| C | 80 Common | 5 Rare, 20 Common | 500 / 50 |
| D | 45 Common | 15 Common | 60 / 6 |

- **Four for one:** one item broken down returns a quarter of its grade's forging cost, so four of a grade make one of your choice in that grade [16].
- **Fuel sets the pace:** a top craft burns 900 of a pool that fills 500 a day up to 2,000. That's about one top craft every two days without Sulphur [16].
- **Recipes:** blueprints come in five grades and are learned once per account. A spare copy cuts a craft's Forgefire (the top grade by 120). They sell for Fame (about 4,000–12,000 in older listings), and since Sep 2025 every Veteran-grade boss drops them [17, 14].
- **Rarity:** a forged item is never below the lowest rarity among its ingredients, and each step up is 20% less likely than on a drop [32, 11]. Players re-forge to climb; one guide puts the last step at 1 in 8 [33].
- **What it changed:** bad luck no longer blocks a build. You can farm a dungeon for any of its UTs and turn them into the one you want [3, 11, 29].

### 1.4 Enchantments

| Date | Version |
|---|---|
| Jun–Aug 2023 | **First** [4, 5]: pick enchantments for Green Dust at an Enchanter. Tiered items got up to one slot, UTs one. Top UTs took fixed "engravings" that came with downsides. Slot costs were cut after complaints, and slots kept scarce against power creep |
| Aug 2023 – Feb 2024 | **Second** [6, 7, 27]: rolls became random. Green Dust rerolled, dearer each time up to five; Red Dust raised a line up to the item grade's cap (1 at D to 4 at S); Purple Dust opened UT slots. 15% of items dropped with a slot, 25% on seasonal characters |
| May 2025 | **Rarity,** below [10, 11, 12] |
| Sep 2025 on | Item-specific "awakened" lines arrive with events, and more steering items [14] |

The rules since May 2025:

| Rarity | Slots | A drop is at least this | A forged item is |
|---|---|---|---|
| Uncommon | 1 | 50% | 40% |
| Rare | 2 | 18.8% | 12% |
| Legendary | 3 | 4.7% | 2.4% |
| Divine | 4 | 0.59% (1 in 170) | 0.24% |

- **Steps:** 50%, then 37.5%, 25% and 12.5%; each must pass before the next. Seasonal characters roll 5% better. Some sources start higher: shinies at 2 slots, a few rings at exactly 2, advanced dungeons at 1 [11, 12, 14, 32].
- **Lines come filled:** every slot arrives with a line already rolled [11].
- **Sizes I–IV,** weighted 35/30/20/15% [11].
- **Kinds,** one per kind on an item: single stat, two stats, trade-off (lose one stat, gain another), share of bonus stats, stat conversion, weapon damage, range, ability modifiers, regeneration, damage resistance (armour), and reward lines (XP, loot, dust). Rare Unique lines and item-specific Awakened lines add one each [10, 11].
- **The Enchanter** rerolls every unlocked line at once. It doesn't add, raise or remove single lines [11].
- **Cost:** 50 dust for a 1-slot item, up to 100 for 4 slots, the same every time. Each locked line doubles it [11, 32].
- **Dust** comes in three colours by the content's grade: green (Adept and below), red (Veteran), purple (Expert and rare event drops). Since May 2025 it drops every time where it used to drop 40–60% of the time [11].
- **Steering items** are spent on a reroll: a ten-card tarot set with small nudges, dungeon drops that remove size-I lines or favour some stats, and cards from the shop and events that remove sizes I or II [11].

### 1.5 Around gear

| System | What it is | Where it touches gear |
|---|---|---|
| Stat potions | Each adds 1 to a base stat (5 to Life or Mana), up to the class's maximum ("8/8") [22] | They share the loot, in blue bags |
| Exaltation (Sep 2020) | With a maxed character, 5/10/15/20/25 clears of a dungeon each give the class +1 in its stat, up to +5 (+25 Life or Mana), and +2.5% damage for each full row, up to +10% [22] | A reason to rerun dungeons after their gear is in hand |
| Seasons | Seasonal characters roll rarity 5% better and find shinies; their items move to the main vault when the season ends [24, 11] | A fresh start replays the chase |
| Gold and Fame | Real-money gold buys clovers (100), key upgrades (20 a grade), quest rerolls and premium steering cards; earned Fame buys blueprints [25, 23, 26, 11, 17] | Shortcuts around the chase |

## 2. Why it works, and what players dislike

| Why it works | How |
|---|---|
| A rare, visible spike | A ladder of bags with white at the top: the rare find stands apart from ordinary loot |
| Gear belongs to places | You know where to go for what you want, and old places stay worth a visit |
| Two axes | Getting an item isn't the end: a better-rolled copy is the next goal [9] |
| A sure floor under a lucky ceiling | Four-for-one forging and rarity floors mean bad luck can't block a build; luck still brings the spikes |
| Steering | Locks and steering items make a reroll a choice, not only a slot machine |
| Flat reroll costs | Trying again isn't punished (2025) [9] |
| Balanced below the top | The team doesn't balance content around 4-slot items, so the chase is a bonus, not a wall [9] |

| What players dislike | When | What RotMG did |
|---|---|---|
| Build-defining items took hundreds of runs | 2025 [9] | About doubled UT rates [12] |
| Reroll costs that rose each try | 2025 [9] | Made them flat [11] |
| Dear slots; dust only from the endgame, so nothing for newer players | 2023 [5, 30] | Cut the costs [5]; dust by content grade [11] |
| Power creep | 2023 [5, 6] | Kept slots scarce; from 2025, balanced below 4 slots [9] |
| Flat buffs with no downside; players asked for negative lines and exclusions | 2023 [30] | Trade-off kinds and exclusions [11] |
| The Forge made rare drops feel less special, and nobody can tell forged from found | 2021 [29] | Top items need items from their own dungeon [3, 11] |
| Leftover materials wasted between crafts | 2021 [29] | Stored as a balance [8] |
| Pay-to-win: dust boosters, blueprints and materials sold for real money | 2021, 2023 [29, 30] | Still sells some steering cards and clovers [11, 25] |
| Too many systems; a steep start | 2025 [9] | Marks cut from forging; a new tutorial planned [9, 11] |
| Exaltation asks thousands of runs to finish every class | 2020 [31] | Unchanged |

## 3. What we take, and what we leave

Our rarities (Common, Fine, Rare, Relic) say what kind of piece it is, as RotMG's tiered and untiered kinds do. RotMG's 2025 rarity is a second axis, how well a copy rolled; we call it stars.

| RotMG | Ours | Status |
|---|---|---|
| Tier number | A piece's **level**, the stage it dropped at (stats × (1 + (level − 1) ÷ 15)) | Exists |
| Tiered items, replaced as you climb | The general pool, 87 Common, Fine and Rare pieces: **fillers** | Exists |
| UTs tied to a dungeon | **Region gear** (27 pieces) and the 5 **Relics**: **keepers** | Region gear approved 2026-11-05, building |
| Items from the dungeon to forge its UTs | **Trophies** | Approved, building |
| Rarity as slots | **Stars**, ★0–★4 | New |
| Lines filled on drop, sizes by weight, one per kind | **Enchantment lines** | New |
| Flat rerolls with locks | **Reroll** and **Lock**, at the Smithy | New |
| Steering items from particular dungeons | A **Trophy** steers a reroll toward its region's theme | New; replaces Tempering |
| Break down into a stored balance | **Break down** into **Scrap** | New; ends "no salvage for now" |
| Four for one, with a rarity floor | The **Forge**: Scrap, or four pieces that set a star floor | New; takes in the Region Forge |
| A daily fuel cap | **Forge times** on the real clock, like the Masters' Hall | New |
| Blueprints | A piece you've found is a piece you can forge | New |
| Upgrade recipes keep the rarity | **Remake** keeps stars and lines | Approved Remake, extended |
| Shinies Rare+, advanced dungeons Uncommon+ | **Star floors** for elites, bosses and Relics | New |
| Class-biased loot | Weapons lean to the heroes on the trip | Small change |
| The bag ladder | The **find moment** in the results popup | New |
| Shinies | **Royal** pieces: a rare second palette | Later, optional |
| Set pieces | Region **sets** | Later, optional |
| Graded keys, Exaltation | Models for the after-Region-V study | Not gear |

| Left out | Why |
|---|---|
| Soulbound bags, damage thresholds, bags that vanish | One player and idle battles: every find goes to the Bag |
| Range, fire-rate and shot-pattern lines | Nobody aims. Our lines use the battle's own hooks |
| Ability and ring slots | Three slots stay: weapon, armour, accessory |
| Stat potions, seasons | Heroes grow by levels and points; servers are a placeholder |
| Forgefire, Sulphur, Ores, Marks, blueprint items, three grades of material, set tokens, dust colours | One new currency (Scrap), the approved Trophies and the clock do these jobs. RotMG itself cut Marks |
| Rerolls that get dearer | RotMG dropped them because they stopped people trying |
| Paid boosts and paid steering | No shop for shortcuts; players called it pay-to-win |
| Trading | No shared economy |

## 4. The proposal

**Words** *(tune)*: Stars, Enchantment, Scrap, Smithy, Break down, Forge, Reroll, Lock, Steer, Remake, Royal. Forge and Enchantment are ordinary words RotMG also uses, as you did in your note; none of the words names a RotMG item, currency or character. Stars borrow Idle Heroes' language: more is better, at a glance.

### 4.1 A piece

| Part | On screen | Rule |
|---|---|---|
| Rarity | Frame colour | Common, Fine, Rare, Relic, as now. Region pieces carry their region's badge |
| Level | The number on the tile | The stage it came from, as now |
| **Stars** | ★ pips, bottom right | 0–4: how many enchantment lines it has. Fixed for life |
| **Lines** | A band of their own on the card, after Always, Costs and When | Rolled when the piece is found or forged |
| Keeper | The region badge or the Relic frame | Region pieces and Relics. Only keepers can be Remade |

The piece's own bonus and cost stay its identity, Darkest Dungeon's way. Lines are small, and come on top.

### 4.2 Stars

| Step | Chance *(tune)* | Share of all drops |
|---|---|---|
| ★1 | 40% | 40% |
| ★2 | then 30% | 12% |
| ★3 | then 20% | 2.4% |
| ★4 | then 10% | 0.24% (1 in 420) |

| Source | Star floor *(tune)* |
|---|---|
| Road stages, the Salvage Pit, the Scavenger Camp, the Shop stall | None |
| Elite and boss stages, a Cage Mimic, the daily jobs' bonus | ★1 |
| Relics | ★2, always |
| Forge with Scrap | None, and each step ×0.8 |
| Forge with four pieces | The fewest stars among them, and each step up ×0.8 |

- **How often:** the simulated play-through fights about 60 battles an hour of play, at 0.3–0.7 pieces a battle. That's 20–40 pieces an hour: a ★3 every hour or two, a ★4 every 10–20 hours.
- **A ★4 of one chosen Rare** is far rarer. That's the Forge's job.

### 4.3 Enchantment lines

| Kind | Line | I | II | III | IV | Weight *(tune)* |
|---|---|---|---|---|---|---|
| Power | +% Power | 1 | 2 | 3 | 4 | 10 |
| Health | +% max Health | 2 | 3 | 4 | 6 | 10 |
| Defence | +% Defence | 2 | 3 | 4 | 6 | 10 |
| Mana | +% max Mana | 3 | 4 | 6 | 8 | 8 |
| Crit, Dodge | + Crit or Dodge | 1 | 1.5 | 2 | 3 | 8 each |
| Speed | + Speed | 0.1 | 0.2 | 0.3 | 0.4 | 4 |
| Resistance | + one of the six | 3 | 5 | 7 | 10 | 8 |
| Pair | Two of the above, each at 60% | | | | | 8 |
| Bargain | e.g. +% Power, −3% Defence | 3 | 4 | 5 | 6 | 6 |
| When | In the front row: +% damage · Below half health: −% damage taken · Against undead, beasts or spirits: +% damage · On a kill: + mana | 3 | 4 | 6 | 8 | 10 |
| Upkeep | Fatigue gained −% | 2 | 3 | 4 | 6 | 4 |
| Reward | +% gold, XP or gear found; the party's total is capped at +20% each | 2 | 3 | 4 | 6 | 4 |
| Signature | Region pieces and Relics only: their region's line (below) | fixed | | | | 2 |

- **Sizes** roll at 35/30/20/15% for I/II/III/IV *(tune)*.
- **One of each kind** on a piece. A Pair counts for both its stats.
- **Percentages of the hero's own stat,** applied as the Whetstone's are, so a line never goes stale as levels rise.
- **Scale:** a level is worth about 2–3% Power to a hero. A typical ★1 line is worth less than a level, and a ★4 piece about two or three.
- **Balance:** the road stays tuned for parties in ★0–★1 gear. Stars are how a patient player goes deeper sooner, never a requirement (RotMG's 2025 rule).

| Region | Signature line *(tune)* | Hook it uses |
|---|---|---|
| I Gravefields | Below 30% health: take 15% less damage | `taken` |
| II Drowned Chapel | +2 mana at the start of each turn | `turnStart` |
| III Thornwood | After a dodge, the attacker takes 0.2× back | `dodged` |
| IV Ashen Keep | Hits have a 10% chance to Burn | `hit` |
| V Hollow Throne | Every stat +3% | `stat` |

### 4.4 Drop rules

- **Every gear roll** rolls stars and lines: loot, clears, the Cage Mimic, the Salvage Pit, Scavenger finds, the Shop stall and the daily jobs' bonus. The rolls come from the battle's seed, so results stay deterministic.
- **Region gear rolls first in its region,** as approved (regions study 3.1: about 40% of rolls on a road stage, 70% on an elite, 100% on a boss), and takes stars like anything else.
- **Weapons lean to the party:** classes in the formation count twice, the rest of the roster once *(tune)*.
- **Relics** arrive at the boss's level with ★2. Today `grantRelic` makes them level 1, so the Marshal's Ashen Blade brings level-1 Power to a level-75 party.
- **The first session's** 1-1 weapon and armour are ★0, so the lesson stays "better" (first-session spec).
- **Prices:** selling and breaking down both rise ×(1 + 0.5 × stars) *(tune)*.
- **A full Bag:** once the Smithy stands, a new piece breaks down where it drops instead of selling. A setting chooses Sell or Break down. ★3+ pieces and Relics always find room.

### 4.5 The Smithy

The approved Smithy (regions study decision 4), opened by the Sexton's first clear. It stands outside the plots, like the Recruit Board, so it never competes for one (§5.3). It's one place for everything gear: break down, forge, enchant and remake, with the keepers listed beside your best level.

| Action | What it does | Cost *(tune)* | Time *(tune)* |
|---|---|---|---|
| **Break down** | An unworn piece becomes Scrap | Gives Common 2, Fine 5, Rare 12, × S × (1 + 0.5 × stars) | Instant |
| **Forge** | Makes any piece you've found. **Paid in Scrap:** it comes at your frontier's level, or a region piece at your best level in its region. **Paid with four pieces** of its slot and rarity (region pieces: of its region): it comes at the lowest level among them, with no fewer stars than the fewest among them | Scrap: Common 8, Fine 20, Rare 48, × S. Or the four pieces. Gold: 4 × its sell price. Region pieces also take 3 Trophies (Fine) or 6 (Rare) | Common 10 min, Fine 30 min, Rare 2 h, region 4 h; one at a time, and it keeps going while you're away |
| **Reroll** | Rolls every unlocked line again. It never adds stars or raises the level | (2 + 2 × stars) × S Scrap; each locked line ×2 | Instant |
| **Steer** | One Trophy on a reroll makes its region's kinds 5 times likelier | +1 Trophy | — |
| **Remake** | A keeper rises to your best cleared level, keeping its stars and lines | Gold: 4 × its sell price at the new level. Trophies: 1 for each 10 levels raised, at least 1 | Instant |

- **S** is the game's gold scale, 1 + level ÷ 5.
- **Who it competes with:** forging and Remake take gold, so they compete with buildings. Scrap competes only with selling.
- **Relics** can't be forged, broken down or sold.

| Trophy | Steers toward |
|---|---|
| Burial Coin (I) | Health, Defence, resistances, the Gravefields signature |
| Bell Bronze (II) | Mana, Upkeep, Reward, the Chapel signature |
| Briar Thorn (III) | Crit, Dodge, When lines, the Thornwood signature |
| Ember Coal (IV) | Power, Bargains, the Keep signature |
| Gilt Shard (V) | No size-I lines; the Throne signature |

| Smithy level | Opens *(tune)* |
|---|---|
| 1 | Break down, Forge (one anvil), Remake |
| 2 | Reroll and Lock |
| 3 | Steer. A choice: a second anvil, or forge times −40% |
| 4 | Forge times −20% |
| 5 | A choice: Break down gives +25%, or each lock costs ×1.5 instead of ×2 |

Levels follow the standard building costs: Bone Dust for levels 1–2, then Heartwood, which a forge burns *(tune)*.

At level 40 (S = 9):

| | Scrap | Gold | Also |
|---|---|---|---|
| Break down a Rare, ★0 or ★2 | +108 or +216 | | |
| Forge a Rare | 432 | 2,160 | 2 h |
| Forge a region Rare | 432 | 2,160 | 6 Trophies, 4 h |
| Reroll a ★1 or a ★4 | 36 or 90 | | |
| Reroll a ★4 with three lines locked | 720 | | |
| Remake a region Rare from 30 to 40 | | 2,160 | 1 Trophy |

- **Scrap pace:** a trip of 6–10 battles at level 40 brings about 100–250 Scrap from the pieces you don't keep. That's a few rerolls, or a forged Rare every two or three trips.
- **Gold pace:** a Standard stage at level 40 pays about 540 gold, so a forged Rare costs about four stages' gold.

### 4.6 The find moment

| Best find in a battle | Results popup |
|---|---|
| No gear | As now |
| Any piece | Its tile pops in its rarity frame, with its star pips |
| ★2 | A soft glint on the tile |
| ★3, or a region piece's first find | The tile lands last, larger, with a chime |
| ★4 or a Relic | The loot row pauses, and the tile lands in a burst of light with its own sound. The trip summary leads with Best find |

The Bag in the dock pulses in the best find's colour. On the hero's sprite a ★3+ piece glints, so stars show in battle too.

### 4.7 How it stays limitless

| Loop | What it asks | Why it doesn't run out |
|---|---|---|
| Stars | Find or forge a better copy | ★4 is 1 drop in 420, and far rarer for one chosen piece |
| Lines | Reroll, lock, steer | Four lines at size IV come up about once in 2,000 rolls, and locks make the last line the dearest |
| The forge ladder | Four ★3 copies make a ★3, with an 8% chance of ★4 | Each step up is a new goal |
| Trophies | Farm old regions | Forging, Remake and steering need them for as long as you play |
| Remake | Keep keepers at your level | Its cost rises with level, to 200 and past |
| Fillers | Replaced as you go deeper | Each new band of levels brings new pieces to roll |
| After Region V | The separate study (regions study decision 5) | RotMG's graded keys are a ready model: replays with 1–4 modifiers, each harder and richer |

An evening in Region III, as an example:
1. A Cutpurse finds a ★2 Twin Stilettos at 3-7: +2 Crit, and +4% damage against beasts.
2. The spares from the trip break down for about 180 Scrap.
3. Two rerolls with the beasts line locked turn the Crit line into Power III.
4. Thornwood's Wolfsbane Knife still hasn't dropped. A few trips to Mother Bramble bring 6 Briar Thorns, and the Smithy forges it overnight at level 38, ★1.
5. At level 45, a Remake brings the Knife up for gold and 1 Trophy, its line intact.

## 5. What it changes

### 5.1 Code and screens

| Where | Change | Size |
|---|---|---|
| `js/items.js` | Pieces gain `st` (0–4) and `en` (lines: kind, size, locked). An `ENCHANT` table (kinds, sizes, weights, labels, hooks). `roll` rolls stars and lines with floors; `make` and `valid` keep them; `stats` and `gearStats` add the % lines; `bands` adds the lines' band; `score` counts lines, so Best and Auto-equip see them; `sellPrice` rises with stars; `add` breaks down when set; `grantRelic` gives the boss's level and ★2. New: `breakDown`, `forge`, `reroll`, `remake` | L |
| `js/hero.js`, `js/sim.js` | The battle spec carries each piece's lines, and the sim builds passives from them. Today the sim reads only `GEAR[id].fx`, per item, not per piece. `fatigueMul` reads Upkeep lines; Reward lines reach `earn` | M |
| `js/campaign.js` | `earn`: floors by rank, the party lean for weapons, capped Reward lines. `settle`: a full Bag breaks down. `r.gear` and the trip's `pieces` carry stars | S |
| `js/data.js` | Star odds and floors; signature lines; `smithy` among the Sexton's first-clear unlocks | S |
| `js/base.js` | The Smithy with `plot: false`, its levels and choices, and a forge queue on the clock like the Masters' Hall. Stars on Salvage Pit, Scavenger and Shop pieces (the stall's price rises with stars); ★1 on the daily jobs' bonus | M |
| `js/save.js` | The next free version: `st: 0, en: []` on every piece; `currencies.scrap`; `found: { id: best stars }`, filled from everything owned; owned Relics raised to their boss's level with ★2 | S |
| The Bag and the hero card (`js/bag.js`, `js/sheet.js`, the D1 mockup `hero-card.html`) | Star pips bottom right. Glow by stars (★3 glow, ★4 shimmer), so the mockup's "Rare cards glow, Relics shimmer" moves to stars. The lines' band. Break down beside Sell, and for several pieces at once. A Stars sort. A Keep mark that mass Break down and selling skip | M |
| The results popup (`js/results.js`) | Pips on tiles, the find moment (4.6), "broken down" where "sold" shows now | S |
| Sprites (`js/art.js`) | A glint layer on ★3+ pieces. Every piece still changes the sprite | S |
| The Hearth (`js/hearthart.js`, the D2 dock mockup) | The Smithy in the scene; the Whetstone already draws a forge, an anvil and a grindstone. Scrap in the dock beside gold. Show only reached regions' staples and Trophies, or the dock gets crowded | S |
| Wick's visits (`js/visits.js`) | Three: the first starred piece; the Smithy, at the Sexton; Reroll, at Smithy level 2 | S |
| The glossary and Codex (`docs/glossary.md`, `js/glossary.js`) | New entries: Stars, Enchantment, Scrap, Smithy, Break down, Forge, Reroll, Lock, Steer, Signature line. Changed: Rarity, Bag, Sell, Gear roll, Salvage Pit, Relic. The Codex keeps each piece's best stars and marks what you can forge | S |
| Balance (`tools/simtest.js`, `tools/reference.js`) | Keep the reference party at ★0–★1. Check that a ★4 kit is worth a few levels at the walls, not more. Cap the Upkeep and Reward lines | M |

### 5.2 Designs it amends

| Design | Says now | Change |
|---|---|---|
| design.md §7, content-spec §6 | No salvage for now; gear progression past random rolls deliberately undecided | Break down and Scrap; this proposal |
| home-base spec §5 | A full Bag sells; salvage into materials is "left for the gear design" | A setting: Sell or Break down. Scrap, not staples: a sword that breaks down into wax or tallow would make no sense |
| design.md §8, home-base spec §8 | Up to 14 plots, one for each building type | The Smithy stands outside the plots |
| content-spec §6, `js/items.js` | Relics are given at level 1 | At the boss's level, with ★2, and Remade like region gear |
| regions study §3.4 | Remake for region gear, a Region Forge, Tempering later | Remake keeps stars and lines and covers Relics. The Region Forge is the Smithy's Forge. Reroll and Steer replace Tempering |
| regions study §3.1 | Trophies pay for Remake and the Region Forge | They also Steer |
| regions study decision 4 | The Salvage Pit is "left for scrapping" | Breaking down happens at the Smithy. The Salvage Pit keeps digging up gear while you're away, now with stars |
| first-session spec | 1-1 drops a Fine weapon and armour | Both ★0 |
| The region gear build under way | Pieces are `{ uid, id, lv }` | Nothing to change now. Keep a `region` field on region pieces, as Relics have, and keep Trophies where the Smithy can read them |

### 5.3 Conflicts with standing decisions

| Decision | The tension | Recommendation |
|---|---|---|
| No gear upgrade track (2026-11-03). Remake was lifted for region gear on 2026-11-05 and waits on the after-Region-V study | Rerolling improves a piece at a smithy, and Remake would cover Relics too | Allow rerolls: they never add stars or raise the level, so they move a piece sideways. Extend Remake to Relics. Leave Relic reforging out unless you want it |
| Darkest Dungeon trade-offs | Most lines are pure bonuses | Keep lines small, keep every piece's own cost, and include the Bargain and When kinds |
| Every item changes the sprite | Lines don't show on the sprite | Stars glint; a Royal palette later |
| A Relic is one of a kind | — | Unchanged: no second copies, and stars come with the one you have |
| Plots: one for each building type | A fifteenth building for fourteen plots | The Smithy stands outside the plots, like the Recruit Board |
| Screens show names, numbers and actions | Lines add text to cards | One short line each; explanations in tooltips and the Codex |

## 6. Build order

Each step ends in something to play-test. The first starts once the region gear build for Regions I–II has merged, since both touch `js/items.js`, `js/campaign.js` and the save.

| Step | Builds | Play-test |
|---|---|---|
| 1 | Stars and the plain-stat lines on every new piece; pips and the lines' band on cards; the save migration | Are drops more exciting? Is a card still quick to read? |
| 2 | The other kinds in battle (When, Bargain, Upkeep, Reward, Signature); the balance check at ★0–★1 | Do lines feel worth having without breaking a wall? |
| 3 | The find moment, the dock's pulse, the sprite glint | Does a ★3 feel like an event? |
| 4 | The Smithy: Break down, Scrap, the Forge and its queue; the Bag-full setting; Wick's visit at the Sexton | Is forging a chosen piece rewarding, and clear? |
| 5 | Reroll and Lock (Smithy level 2) | Is it fun, and is Scrap paced right? |
| 6 | Steer, then Remake for keepers and Relics (Remake after the after-Region-V study, as approved) | Do old regions pull you back? |
| 7 | The docs fold: design §7, content-spec §6, home-base spec §5, regions study §3.4, the glossary and Codex | — |
| Later | Region sets, Royal pieces, Relic reforging, if you want them | — |

## 7. Decisions for you

1. **Stars on every piece?** Recommend yes: ★0–★4, rolled when found, at 40/30/20/10% steps, with a ★1 floor for elites and bosses and ★2 for Relics. They start with the game; the first session's pieces are ★0.
2. **What can lines be?** Recommend the mix in 4.3: small percentages of the hero's own stats, When and Bargain lines, capped Reward and Upkeep lines, and a signature line for each region. Every piece keeps its own bonus and cost.
3. **Enchanting is reroll and lock only:** a flat cost in Scrap, ×2 for each lock, never more stars or a higher level. It bends "no upgrade track" sideways. Recommend yes.
4. **Break down and Scrap:** one new currency, replacing "no salvage for now". Once the Smithy stands, a full Bag breaks down instead of selling. Recommend yes.
5. **The Forge:** any piece you've found, paid in Scrap (at your frontier) or with four pieces (their fewest stars as a floor), plus gold, plus Trophies for region pieces, on short real-time timers. Recommend yes, with the times in 4.5.
6. **Keepers and fillers:** Remake for region gear and Relics only, and Relics given at their boss's level. The general pool is replaced as you go deeper. Recommend yes.
7. **Trophies steer rerolls,** replacing the regions study's Tempering. Recommend yes.
8. **The Smithy stands outside the plots,** from the Sexton, with levels opening Reroll (2) and Steer (3). Recommend yes.
9. **Later, after play-testing steps 1–5:** region sets, Royal pieces (a rare second palette, always ★2+) and Relic reforging. Recommend waiting.

## 8. Sources

RotMG's own posts, at remaster.realmofthemadgod.com:
1. "Friday News: PT & all about Item Forge", 4 Dec 2020, updated 15 Dec 2020. https://remaster.realmofthemadgod.com/?p=966
2. "Oryxmas is here! Patch Notes 1.3.0.0.0", 16 Dec 2020. https://remaster.realmofthemadgod.com/?p=1028
3. "The Forge renovation", 2 May 2022, live in June 2022. https://remaster.realmofthemadgod.com/?p=3174
4. "Public Testing: Enchantments and Dungeon Difficulty", 2 Jun 2023. https://remaster.realmofthemadgod.com/?p=3799
5. "Update 4.0.0.0 – Month of the Mad God", 1 Aug 2023. https://remaster.realmofthemadgod.com/?p=3880
6. "Enchantment 2.0 – Information", 16 Aug 2023. https://remaster.realmofthemadgod.com/?p=3923
7. "Public Testing: Enchantment Rework", 17 Nov 2023. https://remaster.realmofthemadgod.com/?p=4004
8. "Update 4.1.3.0: Forge Storage", 16 Jan 2024. https://remaster.realmofthemadgod.com/?p=4052
9. "Team Letter – 2025", 20 Mar 2025. https://remaster.realmofthemadgod.com/?p=4428
10. "Public Testing: Equipment Rarity and Enchantments", 4 Apr 2025. https://remaster.realmofthemadgod.com/?p=4447
11. "Equipment Rarity Update", 6 May 2025, updated 27 Oct 2025. https://remaster.realmofthemadgod.com/?p=4486
12. "Update 5.11.0.0 – Season 21 + Rarity Update", 6 May 2025. https://remaster.realmofthemadgod.com/?p=4489
13. "Public Testing – Month of the Mad God", 22 Aug 2025. https://remaster.realmofthemadgod.com/?p=4615
14. "Update 6.0.0.0 – Month of the Mad God", 2 Sep 2025, updated 23 Oct 2025. https://remaster.realmofthemadgod.com/?p=4642
15. "Public Testing: Season 28, Part 2", 24 Apr 2026. https://remaster.realmofthemadgod.com/?p=6088

The RealmEye wiki. Its pages didn't load for this study, so these come from search excerpts read in Nov 2026; check the live pages before relying on exact numbers:

16. "Forge": the cost table, and Exalt 5.11.0.0 (May 2025) raising Forgefire to 500 a day, up to 2,000. https://www.realmeye.com/wiki/forge
17. "Blueprints": grades, Forgefire cuts and Fame prices, from revisions of about 2021 on. https://www.realmeye.com/wiki/blueprints
18. "Loot Containers" and "Loot bag types and contents": the bag ladder, public and soulbound bags, lifetimes; revisions vary. https://www.realmeye.com/wiki/loot-containers
19. "Weapons" (Exalt 4.2.0.0, Mar 2024), "Armor" (3.3.6.0, Mar 2023), "Ability items" (4.1.4.0, Feb 2024), "Rings", "Archer" and "Leviathan Armor" (endgame top tiers, Jul 2020). https://realmeye.com/wiki/weapons
20. "Set Tier Items", Exalt 4.0.3.0, Oct 2023. https://realmeye.com/wiki/set-tier-items
21. "Shiny Items", Exalt 4.2.1.0, Apr 2024; introduced in 3.3.5.0, Mar 2023. https://realmeye.com/wiki/shiny-items
22. "Exaltation" (introduced in Exalt 1.1.0.0, Sep 2020) and "Maxing Stats". https://realmeye.com/wiki/exaltation
23. "Dungeon Modifiers", Exalt 4.2.0.0, Mar 2024; and RotMG's "Update 2.0.1.0 – Dungeon Mods", 2021. https://realmeye.com/wiki/dungeon-modifiers and https://remaster.realmofthemadgod.com/?p=2127
24. "Seasonal Characters", Aug 2023; and RotMG's "Update 3.2.2.0 – Seasonal Characters". https://realmeye.com/wiki/seasonal-characters and https://remaster.realmofthemadgod.com/?p=3529
25. "Lucky Clover" and "Loot Tier Potion". https://realmeye.com/wiki/lucky-clover
26. "The Tinkerer", older revisions. https://www.realmeye.com/wiki/the-tinkerer
27. "Enchanting", Exalt 4.1.4.0, Feb 2024. https://realmeye.com/wiki/enchanting

Players and others:

28. Pentaract, "Guide to loot and drop rates", RealmEye forum, 2 Jul 2020. https://www.realmeye.com/forum/t/guide-to-loot-and-drop-rates/60740
29. "Forge materials should be stored after dismantling", RealmEye forum, 26–28 Feb 2021. https://www.realmeye.com/forum/t/forge-materials-should-be-stored-after-dismantling/68544
30. Mathician, "Enchantment System Proposal", RealmEye forum, 9 Aug 2023. https://www.realmeye.com/forum/t/enchantment-system-proposal/79080
31. "PT: Vital Combat & Exaltations", RealmEye forum, 2020; its run counts are players' own estimates. https://www.realmeye.com/forum/t/pt-vital-combat-exaltations/62627
32. rotmg.io, "Enchanting calculator": RealmEye's Enchanting figures for Exalt 6.13 (Aug 2026), checked 21 Oct 2026. https://rotmg.io/enchant/
33. umienjoyers.com, "RotMG Crafting & Forging Guide", an undated fan guide (© 2026). https://umienjoyers.com/guides/crafting
34. Wikipedia, "Realm of the Mad God": 19 classes, their armour and weapon types. https://en.wikipedia.org/wiki/Realm_of_the_Mad_God

Our game, on `main` at `32567c7`: `docs/design.md` §7–8, `docs/content-spec.md` §6, `docs/home-base-spec.md` §4–5, `docs/regions-study.md`, `docs/first-session-spec.md`, `docs/playtest-log.md` Session 3, `js/items.js`, `js/campaign.js`, `js/data.js`, `js/base.js`, `js/save.js`, `js/sheet.js`, `js/bag.js`, `js/hearthart.js`, and the mockups `docs/mockups/hero-card.html` and `hearth-dock.html`.
