# Regions Study

Approved 2026-11-05, with every recommendation in §6 (decision 4: Remake is lifted from the no-upgrades rule for region gear only, and waits for the study in decision 5). Nothing here is built yet. It answers your play-test note: make each region feel like its own place, with its own resources and its own gear, and look again at how fast heroes level.

Priorities, in your order: a smooth play-through, rewarding progression, easy to understand, continuous and essentially limitless progression. Darkest Dungeon is the model for patterns only: no names, art or text taken.

Numbers marked *(tune)* are starting values. Item hooks named below (`out`, `stat`, `turnStart`, `aFall`, `kill`, `dodge`, `healCap`, `pushMul`, `dotOut`, `applyOut`, `earlySpeed`, `maxHpCut`) are the ones `js/items.js` already uses.

## 1. What exists now

### 1.1 Per region

| | I Gravefields | II Drowned Chapel | III Thornwood | IV Ashen Keep | V Hollow Throne |
|---|---|---|---|---|---|
| Theme line | Barrow-fields under a low moon. The dead do not stay put. | A flooded chapel; bells toll under the water. | An old wood; wolves in packs; an old god waits. | A keep its own marshal burned. It is burning still. | A court of the dead under a throne of tallow and bone. |
| Levels, stages | 1-10, 18 | 11-30, 17 | 31-50, 17 | 51-75, 18 | 76-100, 18 |
| Foes | Shambler, Ghoul, Grave Rats, Restless Bones, Glutton, Carrion Crows, Mourner, Gravedigger; elites Gravewarden, Rat King | Drowned Acolyte, Bloated Corpse, Bell Wraith, Silent Sister; elites Choir of Silt, Font Leech | Briar Wolf, Thorn Witch, Hanged Man, Marsh Lantern; elites Mother Bramble, Thornback | Ash Knight, Cinder Hound, Flayed Squire, Ashen Arbalist; elites Kiln Warden, Pyre Priest | Hollow Courtier, Crowned Shade, Bone Herald, Wick Wraith; elites Kingsguard Revenant, Lord Chamberlain |
| Foe trick | Bleed, swarms, marks and burials | Heals, raises, silence, mana drain, turn delays | Packs, stuns, hiding, lures, thorns, poison | Burning, covers, siege shots, blasts | Strips buffs, confusion, rearranges your party |
| Material | Bone Dust | Chapel Wax | Heartwood | Cinder Iron | Throne Tallow |
| What it buys | Building levels 1-2 for every building; Recruit Board, Training Yard, Shop at level 3+ | Toll House, Infirmary, Tactician (level 3+) | Scavenger Camp, Barracks, Shrine, Hexing Stone | Salvage Pit, Whetstone, Ossuary | Masters' Hall, Bell Tower |
| Boss and relic | The Sexton: Gravedigger's Spade (accessory) | The Drowned Bishop: Bishop's Crozier (censer) | The Antlered One: Bark of the Old God (armour) | The Burnt Marshal: Marshal's Ashen Blade (sword) | The Hollow King: The Hollow Crown (accessory) |
| Gear odds C/F/R % | 70/25/5 | 55/35/10 | 45/40/15 | 35/45/20 | 25/50/25 |

Sources: `REGIONS`, `FOES`, `STAGES` (`js/data.js`), `BUILDINGS` and `cost()` (`js/base.js`), `RELICS` and `ITEM.RATES` (`js/items.js`).

### 1.2 How gear differs by region today

- **Only the rarity odds differ.** Elites move 10 points from Common to Rare, bosses 20.
- **Item level** follows the stage's level, so a later region's drop has bigger numbers (`ITEM.GROWTH`: stats × (1 + (level - 1) / 15)).
- **The pool is global.** Every region rolls from the same 92 items. A Region I rare can be *Drowned Mail*, *Thornmail* or *Ashen Plate*. Nothing says where a piece came from.
- **One region-tied piece each:** the boss relic, on the first clear.

### 1.3 What a Region I player sees

- **One material.** Every stage in 1-1 to 1-18 pays Bone Dust. A second material can drop only from a region you have already reached (`earn` picks from `o.regions`), and in Region I that is none.
- **One use for it.** The first two levels of every building cost Bone Dust, so nothing asks for anything else until you reach level 3 buildings.
- **Generic gear.** Notched Sword, Traveller's Coat and the rest are not Gravefields things, and a drop can name a region you have not seen.
- **Four party items** (draught, lamp oil, tincture, salts) are the same everywhere.
- **Why it feels like "only bones":** one material and one pool, so a drop never tells you where you are. Region II's wax and the rest exist, but you meet them only after you leave.

## 2. What Darkest Dungeon does

Patterns only. Stated from general knowledge of the game, not from new screenshots.

| Pattern | What it does for the feel |
|---|---|
| Foe families per region | Each region has its own foes, with a hard fight shape (bleed, blight, and so on), so you bring a different party |
| A named boss and a sub-area | The region has a face and a goal |
| Region-only curios and finds | Searching a region yields things you find nowhere else |
| Provisions chosen for the region | Packing is a decision that depends on where you go |
| Trinkets and gear that pay off against a region's foes or conditions | Equipment has a place it belongs |
| A title card on entry | A name, a picture and one line. The player knows where they are |
| Distinct palette, mood and audio per region | You can tell the region from a screenshot |
| Heirloom-style currencies besides gold | Different trips earn different things |
| Costs on strong gear | Power with a price, so it is a choice, not an upgrade |

## 3. The proposal

### 3.1 The rule

Each region has two resources and a gear line that nobody else drops.

| Resource | Where it drops | What it is for |
|---|---|---|
| **Staple** (today's material) | Every stage in the region, as now | Buildings, as now. Also pays the gold-plus-staple cost of **Remake** (3.4) at a small rate |
| **Trophy** (new) | Elites and the boss for certain; signature foes at a small chance *(tune)*. Always shown on the stage sheet with the foe that drops it | **Remake** and **Region Forge** (the region's gear can be made on demand, 3.4) |

Only the region's own gear drops in the region. Region gear is a separate line from the 92 general items, which keep rolling in the general pool at their present odds. A region stage rolls region gear first, with a chance that goes up for elites and bosses *(tune: about 40% of gear rolls from a normal stage, 70% from an elite, 100% from a boss)*. This is the change that ends "only bones": every drop says where it is from.

### 3.2 Identities, resources and gear

Gear stats use the plain stats in `js/items.js` (hp, mp, pow, def, spd, crit, dodge) and the `cost` field for fixed costs. Each piece has one bonus and one cost, in the Darkest Dungeon manner: a strong effect, and a reason to leave it in the Bag some days. Weapons use each class's weapon type; 10 of the 12 types are covered (see decision 3).

#### I. Gravefields: grave goods

| | |
|---|---|
| Palette and mood | Slate and moss, bone white, a low yellow moon. Quiet, wet, mundane. Mist at ground level |
| Foe style | Things that crawl, swarm and bleed; diggers who mark you |
| Staple | Bone Dust: buildings (as now) |
| Trophy | **Burial Coin** (from Gravediggers, Mourners and the Gravewarden). For Remake, and the Forge |
| Gear theme | What the dead are buried with: endurance and comebacks |

| Piece | Slot | Stats | Effect (bonus / cost) | Keys |
|---|---|---|---|---|
| Pall-bearer's Sabre | Weapon, sword | pow 6 | +25% damage while any ally is down / Speed -1 | `out` with `aFall`; `cost.spd` |
| Sexton's Crook | Weapon, bone staff | pow 5, mp 8 | Restore 8 mana on a kill / Max Health -8% | `kill` via `killMana`; `maxHpCut` |
| Shroud Coat | Light armour | hp 12, dodge 5 | The first hit each battle deals half damage / Fatigue +10% | `taken`; `fatigue` 1.1 |
| Headstone Mantle | Heavy armour | hp 24, def 4 | At half health, take 20% less damage (Fortified) / Speed -2 | `turnStart` + `E.status`; `cost.spd` |
| Coffin-nail Locket | Accessory | hp 15 | +25 Bleed resistance / Crit -3 | `stat` (`u.res.bleed`); `cost.crit` |

#### II. Drowned Chapel: bell and font

| | |
|---|---|
| Palette and mood | Deep teal and green-black water, pale candle gold, wet stone. Slow, echoing, a bell somewhere below |
| Foe style | Healers and raisers; silence, mana drain, delayed turns |
| Staple | Chapel Wax: buildings (as now) |
| Trophy | **Bell Bronze** (from Bell Wraiths, Silent Sisters and the Choir of Silt) |
| Gear theme | Sustain, mana and steadiness against control |

| Piece | Slot | Stats | Effect (bonus / cost) | Keys |
|---|---|---|---|---|
| Tollbell | Weapon, handbell | pow 4, mp 12 | Skills cost 10% less mana / Healing -10% | `cost`; `healOut` |
| Font-water Censer | Weapon, censer | pow 3, mp 10 | Healing +15% / Max Health -5% | `healOut`; `maxHpCut` |
| Wax-sealed Vestments | Light armour | hp 14, mp 12 | +30 Debuff resistance (Silence) / Dodge -4 | `stat` (`u.res.debuff`); `cost.dodge` |
| Reliquary Plate | Heavy armour | hp 20, def 5 | Turn push-backs against the wearer halved / Speed -2 | `pushMul`; `cost.spd` |
| Wick-end Ring | Accessory | mp 6 | +3 mana at the start of each turn / Defense -2 | `turnStart` via `E.mana`; `cost.def` |

#### III. Thornwood: the hunt

| | |
|---|---|
| Palette and mood | Bark brown, deep green, moonlit blue-silver, a spot of red. Close, watchful, the wood seems to lean in |
| Foe style | Packs and ambushes; poison, thorns, hiding, lures |
| Staple | Heartwood: buildings (as now) |
| Trophy | **Briar Thorn** (from Briar Wolves, Thorn Witches and Mother Bramble) |
| Gear theme | Dodge, poison, thorns and regrowth |

| Piece | Slot | Stats | Effect (bonus / cost) | Keys |
|---|---|---|---|---|
| Thorn Bow | Weapon, crossbow | pow 6, crit 3 | Hits have a 25% chance to Poison / Speed -1 | `applyOut`; `cost.spd` |
| Wolfsbane Knife | Weapon, dagger | pow 5, crit 6 | The first attack each battle always crits / Dodge -4 | `critX` or `crit`; `cost.dodge` |
| Hunt-hide Coat | Light armour | hp 10, dodge 10 | +8 Dodge at full health / Healing received -20% | `dodge`; `healIn` |
| Briar Jerkin | Medium armour | hp 20, def 2 | Each foe that hits you takes 10% of the damage back (Retaliating) / Speed -2 | `taken` + `E.pure`; `cost.spd` |
| Antler Charm | Accessory | hp 10 | Regain 2% max health each turn / Damage -10% | `turnStart` + `E.heal`; `out` |

#### IV. Ashen Keep: iron and ash

| | |
|---|---|
| Palette and mood | Charcoal, rust red, ember orange, soot. Heat haze, falling ash, a red glow behind every wall |
| Foe style | Armoured, burning; covers, siege shots, big telegraphed blasts |
| Staple | Cinder Iron: buildings (as now) |
| Trophy | **Ember Coal** (from Cinder Hounds, Arbalists and the Kiln Warden) |
| Gear theme | Heat and weight: burn the foe, pay in health or speed |

| Piece | Slot | Stats | Effect (bonus / cost) | Keys |
|---|---|---|---|---|
| Slag Maul | Weapon, mace and shield | pow 9, def 2 | Hits have a 20% chance to Burn / Lose 1% max health each turn | `applyOut`; `turnStart` with `E.selfCost` |
| Kiln Rapier | Weapon, rapier | pow 6, crit 4 | A crit sets the foe Burning / Defense -3 | `applyOut`; `cost.def` |
| Siege Plate | Heavy armour | hp 30, def 7 | +40 Burn resistance (Blight) / Speed -3 | `stat` (`u.res.blight`); `cost.spd` |
| Cinder Cloak | Medium armour | hp 18, def 3 | A foe that hits you has a 15% chance to catch Burning / Dodge -3 | `taken` + `E.status`; `cost.dodge` |
| Forge Brand | Accessory | pow 3 | +10% damage / Burn resistance -30 | `out`; `stat` (`u.res.blight`) |

#### V. Hollow Throne: the court

| | |
|---|---|
| Palette and mood | Tallow cream, royal violet, tarnished gold, candle black. Still, grand, hollow. Mirrors and long galleries |
| Foe style | Courtiers who strip buffs, confuse, rearrange; cover everywhere |
| Staple | Throne Tallow: buildings (as now) |
| Trophy | **Gilt Shard** (from Crowned Shades, Wick Wraiths and the Kingsguard) |
| Gear theme | Broad power at a large cost: the king's bargain, in small |

| Piece | Slot | Stats | Effect (bonus / cost) | Keys |
|---|---|---|---|---|
| Usurper's Kris | Weapon, cursed blade | pow 8 | Kills grant Kindled for 2 turns / Healing can't raise you above 80% health | `kill` + `E.status`; `healCap` |
| Snuffer's Lamp | Weapon, lantern | pow 6, mp 12 | A crit strips one helpful status from the foe / Max mana -10% | `hit`; `stat` |
| Livery of the Court | Light armour | hp 14, dodge 6, mp 10 | First 3 turns: +8 Speed / Fatigue +15% | `earlySpeed` (extend to 3 turns); `fatigue` 1.15 |
| Tallow Cuirass | Heavy armour | hp 30, def 6 | Below 40% health, take 20% less damage (Braced) / Max mana -15% | `turnStart` + `E.status`; `stat` |
| Paper Crown | Accessory | none | Every stat +5% / Fatigue gained x1.5 (half the Hollow Crown) | `stat`; `fatigue` 1.5 |

### 3.3 Rarity and sizes

- 25 new pieces (5 per region). Rarity: weapons and armour Fine or Rare, accessories Rare, so each region has a named set of Fines and Rares *(tune)*.
- Common pieces stay in the general pool, so there is always a cheap fill-in.
- The boss relics stay as they are. They are the region's single prize; these 25 are its everyday line.

### 3.4 How region gear stays useful (limitless)

A piece's numbers come from the stage level it dropped at, so a Region II piece found at level 20 falls behind by Region IV. Three tools keep a favourite alive and give you a reason to go back:

| Tool | What it does | Cost | Why it helps |
|---|---|---|---|
| **Remake** | Raises a piece to the level of the best stage you have cleared. Its effect never changes | Gold plus the region's Trophy, rising with level *(tune)* | The old favourite keeps pace, forever. No cap except your own progress |
| **Region Forge** | Makes a chosen piece of the region's line on demand, at the level of your best cleared stage in that region | Several Trophies plus gold; a high price keeps drops exciting | Closes a gap in a set without luck. A trip back to farm Trophies is a clear goal |
| **Tempering** (optional, later) | Ranks I-III add a little on top, spending more Trophies at each rank | Trophies and Staple | A sink with no end, for players who stay on one build |

- **Where it lives:** the Salvage Pit (Cinder Iron) or a new Smithy building. Either way, one place with one list of "your region gear" (decision 4).
- **Past level 100:** the regions end at 100 but heroes go to 200. Remake only helps up to your best cleared stage, so limitless progress needs more stages after Region V. That is a separate study (decision 5).

## 4. How a new region announces itself

Small, and mostly using fields that already exist (`line`, `lit`, `intro`).

| Moment | What the player sees |
|---|---|
| **Title card** | The first time you step onto a region's road: a framed pixel picture, the region's name on a plate, `REGIONS[r].line` beneath and the lantern emblem. One tap to continue. The darkest-dungeon-study "region card" is this |
| **Palette** | The map, stage sheets and battle backdrop switch to the region's palette from 3.2. Costs only a set of colour tokens per region |
| **First Staple** | The first time the region's Staple drops: a short card, "New find", with the material's icon, name and one line (what it builds) |
| **First Trophy** | The same, once, naming the foe that dropped it and what it is for: "Burial Coin. Remakes and forges Gravefields gear." |
| **First region gear** | When the first piece from the region drops: its card gets a small region badge and "Gravefields line"; a Codex page opens for the set, filling in as you find pieces |
| **Foe introductions** | As now, each foe's `intro` line the first time it appears. Add a region tag in the Codex so you can read all the Drowned Chapel's foes together |
| **Lit** | `REGIONS[r].lit` when the boss falls, as now. Add the line "Your next find here: Remake" the first time you own a region piece |

## 5. The XP question

### 5.1 The current rule

- A stage's XP is a share of a level sized for a hero *at the stage's level*: `xp = xpLv x xpToNext(stage.level)`, with `xpToNext(L) = 30 x L^1.6`. Every hero in the battle gets the same amount.
- So a hero above the stage's level needs far more than the stage pays, and crawls; a hero below it gains many of their own levels' worth.

Your case: 1-1 gives a level by design (`firstXp`). 1-2 is a level 1 stage: its two Shamblers and clear pay about 0.21 of a level at level 1, which is 6 XP. A level 2 hero needs 91, so that is 7% of a level, and about 14 clears of 1-2 to level up. The stage sheet's "about N% of a level" is measured for a level-1 hero, not for yours.

### 5.2 Options

| Option | What changes | Good | Bad |
|---|---|---|---|
| **A. Keep the soft scaling, but show it** | No change to the numbers. The stage sheet and results show each hero's own gain: "6 XP, 7% of Level 2", and a tag when a stage is well below the hero ("Too easy: XP shrinks") | Cheap and safe. Over-levelled farming stays weak, so the road pulls you forward | The crawl on the story path is still there, only visible |
| **B. Flatten** | XP is a share of the hero's own level: `xpLv x xpToNext(hero.level)`, or a floor of about 5% of the hero's own level per win | No crawl, ever. Easy to explain | Any stage pays the same, so there is no reason to go deeper, and a fresh recruit gains no faster than a veteran. Weakens "rewarding progression" |
| **C. Catch-up bonus** | Keep A. Add a bonus to a hero below the party's top hero or the stage: +25% per level of gap, capped at x3 *(tune)*. Optionally: a first clear on the road never gives less than a fixed share (about 30%) of the *party's top hero's* current level | The road stays smooth for a hero who is behind. Deeper stages still pay more. The bonus is easy to show: "+50% catch-up" | One more number to explain. A floor for first clears needs care so it does not give free levels |

Note: recruits and under-levelled heroes already catch up through the formula (a level 1 recruit in a level 6 stage gains several of their own levels). The complaint is the other side: a hero who is at or above the stage.

### 5.3 Recommendation

**A plus the first-clear floor from C.**

- **Smooth:** a first clear on the road pays at least about 30% of the party's top hero's current level, so the story path never stalls. A replay can still shrink; that is fine, because the road is the faster way.
- **Rewarding:** deeper stages still pay more per win, so progress is always up, not sideways. B would remove that.
- **Easy to understand:** show each hero's gain and the percent on the stage sheet and results, measured for your hero. The tag "Too easy" explains why a replay pays little.
- **Limitless:** unchanged. Levels still cost `30 x L^1.6` up to 200, and the floor is a share of the party's own level, so it scales forever.

## 6. Decisions for the user

1. **Add a second resource per region (the Trophy)?** Recommend yes: Burial Coin, Bell Bronze, Briar Thorn, Ember Coal, Gilt Shard. The staple stays for buildings.
2. **Make region gear its own line, dropping in its region?** Recommend yes: 25 pieces now, the 92 general items stay. This is the part that answers "more than bones" for the player, because every drop shows where it came from.
3. **Weapon coverage:** 10 of 12 weapon types get a region piece (no Flask and no Bonesaw). Recommend adding a third weapon in Region III (Bonesaw) and Region IV (Flask), which brings it to 27 pieces, because Surgeon and Alchemist join the company in Regions II and IV and should not be left out.
4. **Remake and the Forge, and where they live.** Note first: on 2026-11-03 you decided there is no blacksmith upgrade track for gear, and Remake raises a piece's level, which is one. Choose between keeping that decision (old gear is replaced by new drops, and Trophies only pay for the Forge, which makes a chosen region piece at your current level) or lifting it for region gear only. If either goes ahead: a new Smithy building, unlocked on clearing the Sexton, with the Salvage Pit left for scrapping, so there is one place to look.
5. **What happens after Region V?** Remake keeps old gear current only up to your best cleared stage, and heroes go to 200. Recommend a follow-up study of a second loop (the same five regions, harder, with higher-level drops) before the Smithy is built, so its costs are set for levels past 100.
6. **Region cards and palettes:** recommend the small set in section 4 (card, palette, first-find cards, Codex pages), with pixel pictures drawn region by region as each is next in the play-through.
7. **XP:** recommend A plus the first-clear floor from C (5.3), with the percent shown for each hero.
8. **Order of work:** recommend XP first (it is a small code change, and your play-through is blocked by it), then the Trophies and the region gear for Region I and II only, play-tested, then the rest.
