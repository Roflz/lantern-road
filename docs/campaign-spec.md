# Lantern Road: Campaign Spec

Draft 4. It follows `docs/design.md` (the 2026-11-04 update), which stays the source of truth, `docs/content-spec.md` for classes, skills, statuses, resistances, conditions and the Defense formula, and `docs/home-base-spec.md` (draft 2) for rewards, buildings, fatigue and XP. It covers the campaign map and the five regions. Build step 6 built the map and Region I; build step 7a built Regions II–V (section 6).

**What changed in build step 7a (Regions II–V), for your review:**
- **Every region is built:** 70 more stages (17, 17, 18 and 18), the 28 later foes with their sprites, and for each region a battle backdrop, weather, map, music key and material icon. Section 6 lists every stage.
- **Foe Health steps up from level 50** (section 3.1): ×1.5 from 50 to 75, rising to ×2 at 100. At 50 heroes get their second skill slot and tier 3, and they keep pulling ahead through tier 4 at 80. Power keeps its pace.
- **The reference party from Region II** is what a sensible player brings: skill points spent, tiers opened at each threshold, the second skill and a rule for it from 50, a Fine weapon and Fine armour, and a Move rule (`tools/reference.js`).
- **The softened cliff:** past level 10 a hero level adds only about 2% to a hero's power, so most later walls move about 5–15 points a level, more where a skill point or a threshold lands (multiples of 5, and 30, 50, 80, 100). Section 5.6 has the numbers. The lever is steeper hero growth per level (build step 3), not the foes, so this build reports it and leaves it to you.
- **Numbers moved from section 4.3's sketch** to hit the targets. The built level-1 stats are in section 6, and the skills that changed are listed in section 9.
- **The Mourner's Dirge never fired in build step 6:** its id clashed with the Bellringer's Dirge passive, which replaced it. It works now, at +15% damage instead of +30%, so Region I keeps step 6's balance.
- **The Move action** (Tactician I, from 1-11) and **the Gather action** (Lesson II, at the home base's Tactician level 3) are built, so a hero Lured out of their row can walk back.

**What changed in draft 3:** every open question is now settled (section 9). The coordinator decided them overnight, and they're marked for your review.
- Closing the app brings the party home after the current battle. Offline gains come only from home-base buildings.
- The cliff should be softer. The target for the step 6 build: around the recommended level, one level moves a wall's win chance by about 15–25 points (section 5.6).
- Everything else keeps what this spec proposed.

**What changed in draft 2:** it now matches the home-base spec, which adopted this spec's reward tiers, region levels and unlock order.
- The Recruit Board stands in camp from the start, outside the plots, and opens at 1-2.
- The Infirmary moves to 1-7, the Training Yard to 1-8 and the Barracks to 1-15. 1-14 unlocks nothing.
- Region I has no passive-bonus building. The four (the Whetstone, Ossuary, Hexing Stone and Bell Tower) open in Regions III and IV.
- Recruits catch up through the home-base spec's XP rule, and a full Bag sells new gear on the spot.
- Both specs proposed that the party keep playing while the app is closed. Draft 3 settles it the other way (section 9).
- The Toll House opens at 1-5 in both specs, as you confirmed. Summoned foes drop no spoils, under a new home-base rule.
- **New:** a definition of a trip (section 1), and your fatigue rule (section 5.8). Each turn a hero takes adds 1 fatigue, so a stage costs the turns its battle takes.
- **Tuned for that:**
  - Foe Health now starts gentle and steepens, so early stages are quick and cheap, and walls take longest.
  - The Gravewarden (300 Health, 36 Power) and the Rat King (260 Health) are sturdier, so they stay walls.

## 1. How to read this

- Every number is a starting value to adjust in play-testing. A table whose heading carries *(tune)* means every number in it; a number in running text carries its own mark.
- Where the docs were silent, this spec proposed an answer. Section 9 lists how each one was settled.
- **A trip** is one outing from camp. The party sets out, fights a stage, and with "Keep going after a win" on, walks on to the next, until something sends it home: a lost battle, a party rule such as "any character at 75+ fatigue → Return to base", a boss falling, or you calling them home. Then it walks back to camp to rest (section 7).
- **Stage ids** are region-stage, such as 1-9. Elites and the boss are numbered stages on the road, as the mockup draws them.
- **Formation slots:** each side has a front row, F1 and F2, and a back row, B1 to B4, left to right. They are the engine's slots 0–5 and lanes in `js/data.js`.
- **"(waits)"** marks a melee foe placed in the back row. It Defends until a front slot opens, then steps up (section 3.3).
- **Foe rules read from the foe's side:** "Foe" means one of your heroes, and "Ally" means a fellow foe.
- **A stage's level** is its foes' level and the hero level it recommends, for the party size it lists.
- **The scratch check** is a rough balance run on the step-1 engine, described in Appendix B. Its numbers show the shape of the curve, not final balance.

## 2. The campaign at a glance

| Region | Stages (road + elite + boss) | Levels | Main material | Families | Boss | Boss's Relic |
|---|---|---|---|---|---|---|
| I Gravefields | 18 (15 + 2 + 1) | 1–10 | Bone Dust | Undead, beasts, the living | The Sexton | Gravedigger's Spade |
| II Drowned Chapel | 17 (14 + 2 + 1) | 11–30 | Chapel Wax | Undead, spirits | The Drowned Bishop | Bishop's Crozier |
| III Thornwood | 17 (14 + 2 + 1) | 31–50 | Heartwood | Beasts, with a few undead, spirits and witches | The Antlered One | Bark of the Old God |
| IV Ashen Keep | 18 (15 + 2 + 1) | 51–75 | Cinder Iron | Undead, beasts, fire-priests | The Burnt Marshal | Marshal's Ashen Blade |
| V Hollow Throne | 18 (15 + 2 + 1) | 76–100 | Throne Tallow | Spirits, undead | The Hollow King | The Hollow Crown |

- **88 stages** in all, the mockup's "13/88", and **41 foe types**: 11 in Region I, 7 in each later region, and 2 that wander everywhere. 27 already have art; the 14 new ones reuse existing sprite templates.
- **Elites** sit at about the middle and five-sixths of each region, and the boss comes last.
- **Levels end near thresholds:** the Drowned Bishop at 30 and the Antlered One at 50, where tier 2 and class combining open. Level 80 falls inside Region V, and the Hollow King stands at 100.
- **Each region leans one way,** as the content spec intends: holy damage shines in I, II and IV, light and curses in II and V, and the Crossbowman's Hunter in III.

## 3. Shared foe rules

### 3.1 Levels and stats *(tune)*
- A foe's **level-1 stats** are its base. Region I and II foes keep their step-1 numbers from `js/data.js`, except the Gravewarden (section 4.1). New foes use the same scale.
- At level L, Health, Power and Defense are the base times these factors:

| Factor | Levels 1–10 | From level 10 |
|---|---|---|
| Health | 1 + 0.064 × (L − 1) + 0.024 × (L − 1)² | 3.52 × (1 + 0.065 × (L − 10)), × 1.5 from level 50, and × (1.5 + 0.02 × (L − 75)) from 75 |
| Power | 1 + 0.42 × (L − 1) | 4.78 × (1 + 0.06 × (L − 10)) |
| Defense | 1 + 0.06 × (L − 1) | the same |

| Level | 1 | 3 | 5 | 8 | 10 | 20 | 30 | 50 | 75 | 100 |
|---|---|---|---|---|---|---|---|---|---|---|
| Health × | 1.00 | 1.22 | 1.64 | 2.62 | 3.52 | 5.81 | 8.10 | 19.01 | 27.59 | 48.22 |
| Power × | 1.00 | 1.84 | 2.68 | 3.94 | 4.78 | 7.65 | 10.52 | 16.25 | 23.42 | 30.59 |
| Defense × | 1.00 | 1.12 | 1.24 | 1.42 | 1.54 | 2.14 | 2.74 | 3.94 | 5.44 | 6.94 |

- **Speed** rises 0.02 per level. **Mana, mana gain, Crit and Dodge** don't grow, so a foe uses its skills at the same rhythm at every level.
- **Resistances** rise 0.1% per level, as heroes' do.
- **Why foes grow fast in Region I:** the party grows from 1 hero to 6 in this region, and the foe side can't grow past 6 foes, so each foe must become a bigger share of a hero. In the scratch check, foes with step-1 stats and hero-like growth (Health +10%, Power +8.5% per level) lost every Region I stage to a level-matched party, the boss included, by a wide margin.
- **From level 10** the party is full, so foes grow at about the heroes' own pace from their level-10 values.
- **From level 50 Health steps up** (build step 7a, with the heroes' full power curve built): ×1.5 from 50 to 75, rising to ×2 at 100. A fixed probe formation then takes the reference party about 8–9 rounds at every level from 10 to 100.
- **Power grows faster than Health** on purpose. It makes foes dangerous without making battles long.
- **Health starts gentle and steepens** up to level 10, so early foes fall quickly and early stages cost little fatigue (section 5.8). By level 10 it reaches the same value a straight line would.
- **Elites and bosses** use the same factors with bigger bases.

### 3.2 Resistances *(tune)*
- As the content spec sets them: normal foes 10–40%, elites 30–60% and bosses 50–90% before family shifts.
- Family shifts: undead Bleed +40% and Blight +20%; spirits Bleed +60%, Move +40% and Curse −20%; beasts Bleed −10% and Stun −10%.
- The foe tables list resistances with the shifts already applied.

### 3.3 How foes act
- **Rules, skills and mana** work as they do for heroes, as the step-1 engine built them. Foes aren't held to one equipped skill, and their rules may use any condition, whether or not the player has unlocked it.
- **Waiting and stepping up:** a foe whose attacks are all melee without reach can't attack from the back row (content spec). Placed there, it Defends (Braced, −30% damage taken, and restores mana) until a front slot opens. Then it spends its turn stepping into that slot, using the Move action without needing to learn it.
  - Stages use this for second waves: the back row's rats come forward as the front falls, and they arrive with full mana.
- **Ranks:**
  - **Normal.**
  - **Elite:** a red diamond on the map, and marked on the turn strip.
  - **Boss:** drawn larger. Bosses have **phases**: once, at a health threshold, their rules or skills change, with a callout.
- **Summons:** some foes call others into empty foe slots, using the thrall engine piece the Gravecaller needs. A summoned foe is at its caller's level and counts toward "N or more foes".
  - Summoned foes drop no spoils: no gold, XP or loot (home-base spec). Drawing out a fight against a summoner never pays.
- **Art:** every existing foe keeps its name, sprite template, palette, intro line and death line from `lantern-road.html`. New foes reuse those templates with new palettes and, at most, one new accessory.

### 3.4 Wandering foes on replays *(tune)*
- Wandering foes only join replays, never a first attempt, so first clears stay as designed.
- **Moth Swarm:** a 5% chance per replay to fill an empty foe slot.
- **Cage Mimic:** a 2% chance per replay to fill an empty foe slot.
  - If it's still standing at the start of round 6, it folds up and scuttles off, with nothing dropped.
  - Killed, it drops an extra gear roll one rarity above the stage's usual. The home-base spec owns that roll.
- The roll comes from the battle's seed, so replays stay deterministic.

### 3.5 Battle length *(tune)*
- Enrage stays at round 15, with +25% foe damage each round after, as step 1 built it.
- **Battle length follows difficulty,** because each turn a hero takes adds 1 fatigue (section 5.8). Targets at the recommended level:

| Stage kind | Rounds *(tune)* |
|---|---|
| Light | 3–7 |
| Standard | 7–10, rising through the region |
| Rich | 8–11 |
| Elite | 13–17 |
| Boss | 13–17 |

- A party above the recommended level finishes sooner: four levels over, a road stage takes about a quarter fewer turns.
- A round is one turn for a Speed-10 unit, so with full sides it's about 10–12 turns on screen.

## 4. The foe roster

### 4.1 Region I, in full

| Foe | Family | Rank | Usual row | Role | First met | Art |
|---|---|---|---|---|---|---|
| Shambler | Undead | Normal | Front | Slow and weak: the first foe | 1-1 | New: ghoul template, grave-pale palette |
| Ghoul | Undead | Normal | Front | Bleeds the weakest hero | 1-3 | Existing |
| Grave Rats | Beast | Normal | Front, or waiting behind | Fast; hits the whole front row | 1-4 | Existing |
| Restless Bones | Undead | Normal | Back | Throws from behind; heals itself | 1-5 | Existing |
| Grave Glutton | Undead | Normal | Front | Slow; hits hardest | 1-8 | New: bloat template, sallow ghoul palette |
| The Gravewarden | Undead | Elite | Front | Guards its allies; hooks your back row | 1-9 | Existing |
| Carrion Crows | Beast | Normal | Back | Reach: dives on the weakest hero | 1-10 | New: swarm template, black with yellow eyes |
| Mourner | None | Normal | Back | Kindles the other foes | 1-11 | New: humanoid template in black, with a veil accessory |
| Gravedigger | None | Normal | Front | Charges a hit on a Marked hero | 1-12 | New: humanoid template with the Sexton's shovel, earth-brown palette |
| The Rat King | Beast | Elite | Front | Calls rats into empty slots | 1-15 | New: swarm template with the crown accessory, rat palette |
| The Sexton | None | Boss | Front | Digs graves for Marked heroes; two at half health | 1-18 | Existing |

#### Level-1 stats *(tune)*
| Foe | Health | Mana | Power | Defense | Speed | Crit | Dodge | Mana gain |
|---|---|---|---|---|---|---|---|---|
| Shambler | 48 | 0 | 13 | 2 | 7 | 0% | 0% | 0 |
| Ghoul | 72 | 20 | 20 | 3 | 9 | 5% | 5% | 10 |
| Grave Rats | 56 | 20 | 14 | 2 | 13 | 5% | 15% | 10 |
| Restless Bones | 62 | 20 | 17 | 6 | 8 | 5% | 0% | 10 |
| Grave Glutton | 150 | 20 | 26 | 4 | 6 | 5% | 0% | 10 |
| The Gravewarden | 300 | 40 | 36 | 8 | 8 | 5% | 0% | 10 |
| Carrion Crows | 40 | 20 | 14 | 1 | 13 | 10% | 20% | 10 |
| Mourner | 58 | 30 | 13 | 3 | 10 | 5% | 5% | 12 |
| Gravedigger | 80 | 30 | 18 | 4 | 9 | 5% | 5% | 10 |
| The Rat King | 260 | 40 | 18 | 5 | 11 | 5% | 10% | 10 |
| The Sexton | 360 | 40 | 30 | 8 | 9 | 8% | 0% | 10 |

The Gravewarden changes from step 1's Health 210, Power 22 and Defense 12 to 300, 36 and 8. It's less a wall of Defense and more a threat, and sturdy enough to stay a wall now that early foes have less health.

#### Health / Power / Defense by level *(tune)*
| Foe | Level 1 | Level 5 | Level 10 |
|---|---|---|---|
| Shambler | 48 / 13 / 2 | 79 / 35 / 2 | 169 / 62 / 3 |
| Ghoul | 72 / 20 / 3 | 118 / 54 / 4 | 253 / 96 / 5 |
| Grave Rats | 56 / 14 / 2 | 92 / 38 / 2 | 197 / 67 / 3 |
| Restless Bones | 62 / 17 / 6 | 102 / 46 / 7 | 218 / 81 / 9 |
| Grave Glutton | 150 / 26 / 4 | 246 / 70 / 5 | 528 / 124 / 6 |
| The Gravewarden | 300 / 36 / 8 | 492 / 96 / 10 | 1,056 / 172 / 12 |
| Carrion Crows | 40 / 14 / 1 | 66 / 38 / 1 | 141 / 67 / 2 |
| Mourner | 58 / 13 / 3 | 95 / 35 / 4 | 204 / 62 / 5 |
| Gravedigger | 80 / 18 / 4 | 131 / 48 / 5 | 282 / 86 / 6 |
| The Rat King | 260 / 18 / 5 | 426 / 48 / 6 | 915 / 86 / 8 |
| The Sexton | 360 / 30 / 8 | 590 / 80 / 10 | 1,267 / 143 / 12 |

At their own stages, the Gravewarden (level 5) has 492 / 96 / 10, the Rat King (level 8) 682 / 71 / 7 and the Sexton (level 10) 1,267 / 143 / 12.

#### Resistances at level 1 *(tune)*
| Foe | Stun | Move | Bleed | Blight | Curse | Debuff |
|---|---|---|---|---|---|---|
| Shambler | 10% | 10% | 50% | 30% | 10% | 10% |
| Ghoul | 20% | 20% | 60% | 40% | 20% | 20% |
| Grave Rats | 5% | 25% | 10% | 20% | 15% | 15% |
| Restless Bones | 20% | 30% | 60% | 40% | 25% | 20% |
| Grave Glutton | 35% | 40% | 60% | 50% | 20% | 25% |
| The Gravewarden | 45% | 55% | 80% | 55% | 35% | 40% |
| Carrion Crows | 10% | 40% | 10% | 20% | 20% | 20% |
| Mourner | 20% | 20% | 25% | 25% | 40% | 30% |
| Gravedigger | 25% | 25% | 25% | 25% | 25% | 25% |
| The Rat King | 30% | 40% | 35% | 40% | 40% | 40% |
| The Sexton | 60% | 70% | 55% | 55% | 50% | 60% |

Bleed builds struggle against the undead, as the content spec intends, but the rats, crows and the living bleed well.

#### What each foe does
Skills read as in the content spec: shape, range, then mana cost after the dot.

**Shambler**
- **Basic attack:** Grasp. One foe, melee, 1.0×. It has no mana and no skills.
- **Rules:** none. It grasps the nearest hero it can reach.
- **Teaches:** how a battle runs. At Speed 7 it shows up rarely on the turn strip.

**Ghoul**
- **Basic attack:** Claw. One foe, melee, 1.0×.
- **Gnaw.** One foe, melee · 15: 1.25× and a Bleeding stack for 3 turns, 0.3× per tick.
- **Rules:** 1. Foe: lowest health → Gnaw.
- **Teaches:** Bleeding, and that foes go for the weakest hero they can reach.

**Grave Rats**
- **Basic attack:** Bite. One foe, melee, 1.0×.
- **Skittering Swarm.** Front row, melee · 15: 0.6× to each and a Bleeding stack for 2 turns, 0.25× per tick.
- **Rules:** 1. Front foe → Skittering Swarm.
- **Teaches:** speed, since at Speed 13 they act 30% more often than a Speed-10 hero, and why skills that hit a whole row pay against a swarm.

**Restless Bones**
- **Basic attack:** Bone Toss. One foe, ranged, 1.0×.
- **Reassemble.** Self · 20: heals 35% of max health.
- **Rules:** 1. Self: health below 50% → Reassemble. 2. Foe: lowest health → Bone Toss.
- **Teaches:** the back row works for foes too. Melee can't reach it while its front row stands, and its ranged throws reach your back row. Finish it before it reassembles.

**Grave Glutton**
- **Basic attack:** Slam. One foe, melee, 1.0×.
- **Crushing Blow.** One foe, melee · 20: 1.9×.
- **Rules:** 1. Front foe → Crushing Blow.
- **Teaches:** one foe can hit far harder than the rest. "Foe: highest attack" points Guard, Dazzle or Wither at it. At Speed 6 it acts slowly.

**The Gravewarden** (elite)
- **Basic attack:** Halberd. One foe, melee, 1.0×.
- **Stand Watch.** Self · 20: Guarding until its next turn, taking every single-target attack aimed at its allies at −30% damage.
- **Reaping Hook.** One foe, melee with reach · 20: 1.2×.
- **Rules:** 1. Ally: health below 75% → Stand Watch. 2. Foe: lowest health → Reaping Hook.
- **Teaches:** see section 5.5.

**Carrion Crows**
- **Basic attack:** Peck. One foe, melee with reach, 0.8×.
- **Carrion Dive.** One foe, melee with reach · 15: 1.1×.
- **Rules:** 1. Foe: lowest health → Carrion Dive. 2. Foe: lowest health → Peck.
- **Teaches:** reach. Crows fly over your front row to the weakest hero, so healing order matters ("Ally: most hurt"). They're fragile but hard to hit.

**Mourner**
- **Basic attack:** Keen. One foe, magic, 0.8×.
- **Dirge.** All allies · 25: Kindled for 2 turns, +30% damage.
- **Rules:** 1. Ally: without Kindled → Dirge.
- **Teaches:** kill the support first. She's the foes' Lamplighter, and she stands in the back row ("Foe: in the back row").

**Gravedigger**
- **Basic attack:** Shovel. One foe, melee, 1.0×.
- **Shallow Grave.** Charged · one foe, reach · 20: Marks a hero and digs. On its next turn, Shallow Burial hits the Marked hero: one foe, melee with reach, 2.4×.
- **Rules:** 1. Foe: lowest health → Shallow Grave.
- **Teaches:** charged attacks. A Marked hero has one turn of warning: Guard takes the hit for them, and killing the digger cancels it.

**The Rat King** (elite)
- **Basic attack:** Bite. One foe, melee, 1.0×.
- **Gnawing Tide.** Front row, melee · 20: 0.7× to each and a Bleeding stack for 2 turns, 0.25× per tick.
- **Call the Swarm.** Self · 30: Grave Rats rise in up to 2 empty foe slots, front row first, at the King's level.
- **Rules:** 1. Fewer than 4 allies standing → Call the Swarm. 2. Front foe → Gnawing Tide.
- **Teaches:** see section 5.5.

**The Sexton** (boss)
- **Basic attack:** Shovel. One foe, melee, 1.0×.
- **Dig a Grave.** Charged · one foe, reach · 20: Marks a hero and digs. On his next turn, Burial hits the Marked hero: one foe, melee with reach, 3.4×.
- **Grave Dirt.** All foes, ranged · 20: 0.45× to each and Dazzled for 1 turn.
- **Rules:** 1. Foe: health below 75% → Dig a Grave. 2. 4 or more foes present → Grave Dirt.
- **Phase 2, Two Graves** (below 50% health, once): Dig a Grave now Marks the two heroes with the lowest health, and Burial hits both.
- **Teaches:** see section 5.5.

### 4.2 Wandering foes
| Foe | Family | Row | Level-1 stats *(tune)* | What it does | Rules |
|---|---|---|---|---|---|
| Moth Swarm | Beast | Either | Health 50, Mana 20, Power 12, Defense 1, Speed 14, Crit 5%, Dodge 25%. Resistances: Stun 10%, Move 50%, Bleed 10%, Blight 20%, Curse 20%, Debuff 20%. | Flutter: one foe, melee with reach, 0.7×. Wing Dust: all foes, ranged · 20: 0.3× and Dazzled for 1 turn. | 1. 3 or more foes present → Wing Dust. |
| Cage Mimic | None | Front | Health 90, Mana 20, Power 18, Defense 10, Speed 8, Crit 5%, Dodge 0%. Resistances: Stun 50%, Move 60%, Bleed 40%, Blight 40%, Curse 30%, Debuff 40%. | Snap: one foe, melee, 1.0×. Clang Shut: self · 15: Braced (−40%) for 2 turns. Flees at the start of round 6. | 1. Self: health below 50% → Clang Shut. |

### 4.3 Regions II–V, in brief
Stats are level-1 values on the same scale, written Health / Power / Defense / Speed *(tune)*. Mana is 20–30 for normal foes and 40–50 for elites and bosses. Resistances follow section 3.2.

These are the sketch build step 7a started from. The numbers as built are in section 6, and the skills that changed in section 9.

#### Region II: the Drowned Chapel
| Foe | Family | Rank, row | Stats | What it does | Rules |
|---|---|---|---|---|---|
| Drowned Acolyte | Undead | Normal, back | 66 / 17 / 4 / 10 | A foe healer. Brine Bolt: one foe, magic, 1.0×. Drowned Hymn: all allies · 30: heals 1.2×. | 1. Ally: health below 60% → Drowned Hymn. 2. Foe: lowest health → Brine Bolt. |
| Bloated Corpse | Undead | Normal, front | 150 / 20 / 5 / 6 | Slam: one foe, melee, 1.0×. Burst: all foes, magic, 1.1×, and it's destroyed. Kill it in one go, or Ward the party first. | 1. Self: health below 35% → Burst. |
| Bell Wraith | Spirit | Normal, back | 60 / 20 / 3 / 11, Dodge 20% | Wail: one foe, magic, 1.0×. Toll: all foes, magic · 25: 0.5× and each hero's next turn pushed back 20%. | 1. 3 or more foes present → Toll. 2. Foe: health below 50% → Wail. |
| Silent Sister *(new)* | Undead | Normal, back | 70 / 16 / 4 / 10 | Silences your healer. Psalter: one foe, magic, 0.9×. Vow of Silence: one foe, magic · 25: 0.4× and Silenced for 2 turns. | 1. Foe: healer → Vow of Silence. 2. Foe: lowest health → Psalter. |
| Choir of Silt | Spirit | Elite, front | 230 / 21 / 6 / 10 | Silt Chant: one foe, magic, 0.9×. Drowned Hymn. Requiem: all foes, magic · 30: 0.45× and Doomed for 2 turns, 0.25× per tick. | 1. Ally: health below 50% → Drowned Hymn. 2. 3 or more foes present → Requiem. |
| The Font Leech *(new)* | Beast | Elite, front | 260 / 18 / 6 / 7 | Drains mana. Latch: one foe, melee, 1.0×, draining 10 mana. Drain the Font: all foes, magic · 20: 0.4×, draining 15 mana from each, and it heals 1 health per mana drained. | 1. 3 or more foes present → Drain the Font. 2. Foe: lowest health → Latch. |
| The Drowned Bishop | Undead | Boss, front | 380 / 31 / 8 / 9 | Crozier: one foe, melee, 1.0×. Raise the Drowned: one fallen ally · 35: back with 50% health. Baptism: charged · one foe, reach · 25, then Drown: magic, 3.4×. Font of Brine: all foes, magic · 25: 0.5×. Phase 2 below 50%, The Font Overflows: Font of Brine also pushes every hero's next turn back 25%. | 1. Ally: fallen → Raise the Drowned. 2. Foe: health below 75% → Baptism. 3. 4 or more foes present → Font of Brine. |

#### Region III: Thornwood
| Foe | Family | Rank, row | Stats | What it does | Rules |
|---|---|---|---|---|---|
| Briar Wolf | Beast | Normal, front | 90 / 22 / 4 / 12 | Hunts in packs. Bite: one foe, melee, 1.0×. Pack Tear: one foe, melee · 15: 0.9× and a Bleeding stack for 3 turns, 0.3× per tick, +20% damage for each other Briar Wolf standing. | 1. Foe: lowest health → Pack Tear. |
| Thorn Witch | None | Normal, back | 80 / 20 / 4 / 10 | Thorn Lash: one foe, magic, 1.0×. Entangle: front row, magic · 20: 0.5× and Slowed for 2 turns. Rot Bloom: one foe, magic · 25: Poisoned for 3 turns, from 0.3× per tick. | 1. Foe: without Poisoned → Rot Bloom. 2. Front foe → Entangle. |
| The Hanged Man | Undead | Normal, back | 100 / 22 / 5 / 9 | Starts Hidden in the branches until it first attacks. Noose: one foe, melee with reach, 1.0×. Gallows Drop: one foe, melee with reach · 25: 1.4× and Stunned for 1 turn. | 1. Foe: in the back row → Gallows Drop. |
| Marsh Lantern *(new)* | Spirit | Normal, back | 70 / 18 / 3 / 11, Dodge 20% | A false light on the road. Will-light: one foe, magic, 0.9×. Lure: one back-row foe, magic · 20: swaps it with a front-row hero, and Move resistance resists. | 1. Foe: in the back row → Lure. |
| Mother Bramble | None | Elite, front | 280 / 20 / 8 / 7 | Thorn Slam: one foe, melee, 1.0×. Bramble Hide: self · 20: Retaliating for 2 turns, dealing 0.4× back to each attacker. Rot Bloom: all foes, magic · 30: Poisoned for 2 turns. | 1. Self: without Retaliating → Bramble Hide. 2. 3 or more foes present → Rot Bloom. |
| The Thornback *(new)* | Beast | Elite, front | 300 / 26 / 10 / 8 | A boar of bark and thorns. Gore: one foe, melee, 1.0×. Thundering Charge: charged · front row, melee · 25, then 2.0× to each and Stunned for 1 turn. | 1. Always → Thundering Charge. |
| The Antlered One | Beast | Boss, front | 450 / 32 / 9 / 10 | Antler Rake: one foe, melee, 1.0×. Rut: charged · one foe · 25, then 3.0× and Stunned for 2 turns. Old Growth (passive): heals 4% of max health at the start of each turn. Phase 2 below 60%, The Wild Hunt: two Briar Wolves rise in empty slots, once. | 1. Foe: highest attack → Rut. |

#### Region IV: the Ashen Keep
| Foe | Family | Rank, row | Stats | What it does | Rules |
|---|---|---|---|---|---|
| Ash Knight | Undead | Normal, front | 120 / 22 / 14 / 8 | Heavy armour. Ashen Blade: one foe, melee, 1.0×. Shield Wall: self · 20: Braced (−40%) for 2 turns. | 1. Self: health below 50% → Shield Wall. |
| Cinder Hound | Beast | Normal, front | 90 / 22 / 4 / 13 | Ember Bite: one foe, melee, 1.0× and Burning for 2 turns. Firebreath: front row · 20: 0.7× to each and Burning for 2 turns. | 1. Front foe → Firebreath. |
| Flayed Squire | Undead | Normal, back | 95 / 18 / 6 / 10 | Serves its knight. Thrown Spear: one foe, ranged, 0.9×. Serve: one ally, not self · 15: Covered for 2 turns, so the Squire takes every attack aimed at that ally. | 1. Ally: highest Power → Serve. |
| Ashen Arbalist *(new)* | Undead | Normal, back | 85 / 24 / 5 / 8 | Bolt: one foe, ranged, 1.0×. Siege Shot: charged · one foe, ranged · 25, then 3.0×. | 1. Foe: in the back row → Siege Shot. |
| The Kiln Warden | None | Elite, front | 320 / 30 / 12 / 6 | A furnace on legs. Furnace Fist: one foe, melee, 1.0×. Stoke the Kiln: charged · all foes · 30, then 2.4× to each and Burning for 3 turns. | 1. Always → Stoke the Kiln. |
| The Pyre Priest *(new)* | None | Elite, back | 240 / 26 / 6 / 9 | Heals with fire. Brand: one foe, magic, 1.0× and Burning for 2 turns. Rite of Ash: all allies · 30: heals 1.0× and Kindled for 2 turns. | 1. Ally: health below 60% → Rite of Ash. 2. Foe: without Burning → Brand. |
| The Burnt Marshal | Undead | Boss, front | 480 / 34 / 14 / 9 | Marshal's Blade: one foe, melee, 1.0×, and 25% of it splashes onto the other front-row hero. Rally: all allies · 25: Kindled and Fortified for 2 turns. Charge of the Burnt: charged · front row · 30, then 2.8× to each. Phase 2 below 50%, The Keep Burns: every hero starts each turn Burning (0.2×) until the battle ends. | 1. Ally: without Kindled → Rally. 2. Front foe → Charge of the Burnt. |

#### Region V: the Hollow Throne
| Foe | Family | Rank, row | Stats | What it does | Rules |
|---|---|---|---|---|---|
| Hollow Courtier | Spirit | Normal, back | 90 / 22 / 5 / 11 | Barbed Compliment: one foe, magic, 1.0×. Flattery: one foe · 20: Confused for 1 turn, so your hardest hitter may strike its own side. | 1. Foe: highest attack → Flattery. |
| Crowned Shade | Spirit | Normal, front | 100 / 24 / 5 / 11, Dodge 20% | Shade Touch: one foe, melee, 1.0×. Usurp: one foe · 20: 0.6× and steals one helpful status. | 1. Foe: has Kindled → Usurp. |
| Bone Herald | Undead | Normal, back | 95 / 22 / 8 / 9 | Announces a death in advance. Proclamation: one foe, magic, 0.9×. Herald's Doom: one foe · 25: Doomed for 3 turns, 0.8× per tick. | 1. Foe: highest attack → Herald's Doom. |
| Wick Wraith *(new)* | Spirit | Normal, back | 80 / 20 / 4 / 12 | Gutter: one foe, magic, 0.9×. Snuff the Light: all foes · 25: 0.3× and strips Kindled, Hasted, Warded and Blessed. | 1. Foe: has Kindled → Snuff the Light. |
| Kingsguard Revenant | Undead | Elite, front | 340 / 30 / 16 / 8 | Guard's Halberd: one foe, melee, 1.0×. Oath: one ally · 20: Covered for 2 turns, area hits included. Last Stand (passive): once, Unbroken for 1 turn on falling below 25%. | 1. Ally: most hurt → Oath. |
| The Lord Chamberlain *(new)* | Spirit | Elite, back | 260 / 26 / 6 / 10 | Rearranges your party. Rod of Office: one foe, magic, 1.0×. Reorder the Court: one foe · 25: swaps a back-row hero with a front-row one, and Move resistance resists. Summon the Court: self · 30: a Hollow Courtier rises in an empty slot. | 1. Fewer than 4 allies standing → Summon the Court. 2. Foe: in the back row → Reorder the Court. |
| The Hollow King | Spirit | Boss, front | 500 / 36 / 10 / 10 | Sceptre: one foe, magic, 1.0×. Phase 1, Court of Shades: calls Crowned Shades into empty slots. Phase 2 below 66%, Snuff the Lanterns: strips every helpful status from the party and Dazzles every hero for 2 turns. Phase 3 below 33%, Long Live the King: every hero Doomed for 3 turns, and his Sceptre hits a whole row. | Changes with each phase. |

## 5. Region I: the Gravefields

### 5.1 Overview
- **Levels 1–10** and 18 stages: 15 road stages, two elites (1-9 and 1-15) and the Sexton (1-18). The main material is Bone Dust.
- **Foes:** mostly undead, with beasts (Rats, Crows) and the living (Gravediggers, the Mourner, the Sexton).
- **The party grows from 1 hero to 6** (section 5.4), so early stages suit one or two heroes.
- **Only tier-1 skills exist here,** because tier 2 opens at level 30, and each hero equips one active skill. So every stage is built for a basic attack plus one skill per hero, steered by rules.
- **It teaches** nine conditions through stage rewards and one through the first knock-out, opens the first buildings, and ends with the first Relic and the Gravecaller.

### 5.2 Stages *(tune)*
| Stage | Name | Kind | Level | Party | Front: F1 · F2 | Back: B1 · B2 · B3 · B4 | Reward tier |
|---|---|---|---|---|---|---|---|
| 1-1 | The Edge of the Light | Road | 1 | 1 | Shambler · — | — · — · — · — | Light |
| 1-2 | The Barrow Gate | Road | 1 | 1 | Shambler · Shambler | — · — · — · — | Light |
| 1-3 | Gnawed Headstones | Road | 2 | 2 | Ghoul · Shambler | — · Shambler (waits) · — · — | Light |
| 1-4 | Rat-Choked Crypt | Road | 2 | 2 | Grave Rats · Grave Rats | — · Grave Rats (waits) · — · — | Standard |
| 1-5 | The Sunken Path | Road | 3 | 2 | Ghoul · Shambler | — · Restless Bones · — · — | Standard |
| 1-6 | The Ossuary Steps | Road | 3 | 3 | Ghoul · Ghoul | — · Restless Bones · Restless Bones · — | Standard |
| 1-7 | Rootbound Barrows | Road | 4 | 3 | Ghoul · Grave Rats | — · Restless Bones · Grave Rats (waits) · — | Standard |
| 1-8 | The Glutton's Pit | Road | 4 | 3 | Grave Glutton · Shambler | — · Restless Bones · Shambler (waits) · — | Rich |
| 1-9 | The Gravewarden's Watch | Elite | 5 | 4 | The Gravewarden · Ghoul | Restless Bones · Restless Bones · — · Restless Bones | Elite |
| 1-10 | Crowfield | Road | 5 | 4 | Ghoul · Ghoul | Carrion Crows · Restless Bones · — · Carrion Crows | Standard |
| 1-11 | The Mourning Path | Road | 6 | 4 | Ghoul · Grave Glutton | — · Mourner · Restless Bones · — | Standard |
| 1-12 | Fresh Graves | Road | 6 | 4 | Gravedigger · Ghoul | Restless Bones · Mourner · Restless Bones · — | Standard |
| 1-13 | The Digging Fields | Road | 7 | 5 | Gravedigger · Gravedigger | Carrion Crows · Mourner · Restless Bones · — | Standard |
| 1-14 | The Lych-gate | Road | 7 | 5 | Grave Glutton · Ghoul | Restless Bones · Mourner · Restless Bones · — | Rich |
| 1-15 | The Rat King's Court | Elite | 8 | 5 | The Rat King · Grave Rats | — · Grave Rats (waits) · Grave Rats (waits) · — | Elite |
| 1-16 | The Mourners' Walk | Road | 8 | 6 | Grave Glutton · Ghoul | Mourner · Restless Bones · Restless Bones · Mourner | Standard |
| 1-17 | The Sexton's Yard | Road | 9 | 6 | Gravedigger · Gravedigger | Mourner · Carrion Crows · Restless Bones · Carrion Crows | Rich |
| 1-18 | The Sexton's Grave | Boss | 10 | 6 | The Sexton · Gravedigger | — · Mourner · Restless Bones · — | Boss |

- **Reward tiers:** the home-base spec uses these five tiers and defines what each contains, every drop rate and the spoils each foe drops by rank. Amounts scale with the stage's level, so one set of tiers works in every region. First clears double the clear reward's gold and materials, and the unlocks in section 5.3 come on top.
- **Rich stages** sit just before each wall (1-8, 1-14, 1-17), so the best place to farm for a wall is right in front of it.

### 5.3 What each stage teaches, and what its first clear unlocks
First-clear unlocks happen once. "Blueprint" means the building becomes available to build on a plot.

| Stage | New in the battle | First clear unlocks | Hint after a loss |
|---|---|---|---|
| 1-1 | How a battle runs: the turn strip, a basic attack, your hero's skill and the callouts. The speed buttons and Skip are there from the start. | The Tactics screen | "Your skill costs mana. Basic attacks restore it." |
| 1-2 | Rules in action: two foes, and each callout names the rule that fired. | The Recruit Board opens, and its first recruit is free. It stands in camp from the start, outside the plots. | "Rules fire from the top. Put the one you want most first." |
| 1-3 | Formation: two heroes, a front row and a back row. A Shambler waits behind and steps up when a front slot opens. The Ghoul brings Bleeding. | Party items: 2 loadout slots, 2 Healing Draughts, the party rule "Ally: health below 50% → Healing Draught", and the timed free draught | "Put your sturdier hero in front. Claws can't reach the back row while someone stands in front." |
| 1-4 | Speed: the rats show up on the turn strip more than anyone. The draught rule fires. | Condition: N or more foes present | "Rats act often and come in waves. A skill that hits the whole front row, like Cleave, handles many at once." |
| 1-5 | Back-row foes: the Bones throw from behind their front row. | Condition: Foe: in the back row · Toll House blueprint | "Melee can't reach the Bones while their front row stands. Ranged and magic can." |
| 1-6 | Chaining: two stages in a row, and fatigue. | Keep going after a win · the party rule "Between battles: any character at 75+ fatigue → Return to base", on by default | "Fatigue builds with every turn a hero takes. Rest at camp, or swap in a fresh hero." |
| 1-7 | Families: undead and beasts side by side. Holy damage only doubles on the undead. | Condition: Foe: undead · Infirmary blueprint | "Holy damage doubles on the undead, not on the rats." |
| 1-8 | A heavy hitter: the Glutton's Crushing Blow. | Condition: Foe: highest attack · Training Yard blueprint | "The Glutton hits hardest. Guard against it, Dazzle it, or kill the rest first." |
| 1-9 | Elite: the Gravewarden guards its allies, and its hook reaches your back row. | Condition: Foe: boss or elite | "The Gravewarden guards its wounded. Hits on a whole row aren't redirected, and Doom keeps ticking." |
| 1-10 | Reach: the Crows fly over your front row to the weakest hero. | Condition: Ally: most hurt · Shop blueprint | "Crows go for the weakest. Heal the most hurt ally first." |
| 1-11 | Foe support: the Mourner's Dirge kindles every foe. | Tactician blueprint: its first lesson teaches thresholds, the Move action, Focus fire, saved rule sets and about a dozen conditions | "Kill the Mourner first. She's in the back row." |
| 1-12 | Charged attacks: a Gravedigger Marks a hero, then strikes. | Condition: Foe: charging a big attack | "When a digger Marks a hero, Guard that hero or kill the digger." |
| 1-13 | Two chargers at once. | Scavenger Camp blueprint | "Two diggers, two Marks. A Warden's Guard covers both." |
| 1-14 | Everything so far, in one stage. | — | "The Lych-gate mixes everything. The battle report shows what hurt most." |
| 1-15 | Elite: the Rat King calls more rats while he stands. | Condition: Between battles: next stage has a boss or elite · Barracks blueprint | "The rats keep coming while the King stands. Kill the King." |
| 1-16 | Two Mourners: support that stacks. | Salvage Pit blueprint | "Two Mourners keep every foe kindled. Hit the back row first." |
| 1-17 | The Sexton's men: diggers, crows and a Mourner. | — | "If the yard is hard, the Sexton is harder. Farm here first." |
| 1-18 | Boss: the Sexton digs graves, throws grave dirt, and digs two graves below half health. | Condition: Boss present · Relic: Gravedigger's Spade · the Gravecaller joins the recruit board · Region II opens | "When the Sexton digs, Guard the Marked hero. Below half health he digs two graves." |
| Event | The first time any hero falls, anywhere. | Condition: Ally: fallen | — |

### 5.4 Party growth and recruits
| Stages | Heroes | How the next one comes |
|---|---|---|
| 1-1 – 1-2 | 1 | Your first pick: Sellsword, Hexblade or Pilgrim |
| 1-3 – 1-5 | 2 | 1-2's free recruit, about 6–8 minutes in |
| 1-6 – 1-8 | 3 | The first paid recruit, affordable around 1-4 or 1-5 |
| 1-9 – 1-12 | 4 | Affordable around 1-8 |
| 1-13 – 1-15 | 5 | Affordable around 1-12 |
| 1-16 – 1-18 | 6 | Affordable around 1-15 |

- The home-base spec sets recruit prices, gold per stage, picks per board and the starting roster cap. Together they must allow this pace *(tune)*.
- Recruits arrive at level 1 while the leader is near the frontier's level, and should catch up within 2–3 stages. The home-base spec's XP rule does most of this: battle XP is a share of a level at the *stage's* level, so a level-1 recruit in a level-6 stage gains several of its own levels. The Training Yard (1-8) and replays do the rest. How fast depends on step 3's XP curve.
- **The first-clear floor** (regions study §5.3, decision 7, 2026-11-05): a first clear on the road pays every hero at least 30% *(tune: `XP_FLOOR` in `js/data.js`)* of a level at the party's top hero's level, on top of the rule above. So the road never stalls for a hero at or above the stage's level: after 1-1's level, 1-2's first clear pays a level 2 hero 27 XP, 30% of a level, where the plain rule paid 6. 1-1 still brings the first level (`firstXp`). Replays keep the plain rule, so farming a stage below a hero's level pays them less and less of theirs; the road is the faster way.
- **Each hero's own share** is what the screens show. The stage sheet's XP chip is measured for the lead hero ("~27 XP · 30%"), each hero in its party strip shows theirs, and the results popup shows each hero's XP and its share of their level. Where a stage pays a hero under 10% *(tune: `XP_TOO_EASY`)* of their level, a **Too easy** tag says so, and its tooltip says why: a stage below a hero's level pays less of theirs, and new stages pay more.
- The stage sheet shows the recommended level and party size, so a player a hero short knows why a stage is hard.
- In Region I the recruit board offers the six original classes. The Gravecaller joins after the Sexton.

### 5.5 The elites and the boss

#### 1-9 The Gravewarden's Watch (elite, level 5, 4 heroes)
Front: The Gravewarden · Ghoul. Back: Restless Bones · Restless Bones · — · Restless Bones.

- **What happens:**
  - Whenever one of its allies drops below 75% health, the Gravewarden Stands Watch. Until its next turn, every single-target attack on its allies hits it instead, at −30%.
  - Meanwhile three Bones throw at your weakest and reassemble, and the Reaping Hook reaches your back row.
- **What it teaches:**
  - **Guard, shown from the other side.** Callouts read "Guarded" over each redirected hit. It's exactly what your own Warden's Guard does.
  - **What a Guard can't stop:** Cleave, Hex Swarm and Volley aren't single-target, so they aren't redirected, and Doom or Bleeding already on a foe keeps ticking under a Guard.
  - **Reach:** the hook ignores your front row.
- **Answers:** a Cleave rule near the top ("N or more foes present → Cleave"), Hex Swarm, Volley on the back row, a Warden guarding your own side, or one more level.
- **Scratch check:** 64% at level 5 with starter rules, 92% at level 6 and 3% at level 4. Its battles last about 17 rounds, the longest before the boss, so most reach enrage. As a wall, it should cost the most rest.
- **First clear:** "Foe: boss or elite". It suits debuffs and big single hits on an elite (Wither, Mark Quarry), and summoners like the Rat King. In the scratch check, aiming every attack at an elite did worse than killing the small foes first, so no hint tells players to focus the elite.

#### 1-15 The Rat King's Court (elite, level 8, 5 heroes)
Front: The Rat King · Grave Rats. Back: — · Grave Rats (waits) · Grave Rats (waits) · —.

- **What happens:**
  - Rats step up as the front row falls.
  - While fewer than 4 foes stand, the King calls the Swarm, and rats rise in up to 2 empty slots.
  - Gnawing Tide bleeds your whole front row.
- **What it teaches:** the exception to "kill the small ones first". Rats keep coming while the King stands, and killing him stops them. It's the first fight where focus fire is the right answer. Summoned rats drop nothing, so a long fight doesn't even pay.
- **Answers:**
  - The party rule "Foe: boss or elite → Focus fire". Focus fire comes with the Tactician's first lesson (1-11), and the condition from 1-9.
  - Doom on the King, skills that hit a whole row to thin the rats, and a healer for the bleeds.
- **Scratch check:** the step-1 engine has no summons, so the check started with four rats instead: 61% at level 8, 89% at 9 and 22% at 7, in about 13 rounds.
- **First clear:** "Between battles: next stage has a boss or elite", so the party can come home before the Sexton, and the Barracks.

#### 1-18 The Sexton's Grave (boss, level 10, 6 heroes)
Front: The Sexton · Gravedigger. Back: — · Mourner · Restless Bones · —.

- **What happens:**
  - **Dig a Grave:** when a hero drops below 75% health, the Sexton Marks them and digs. On his next turn, Burial deals 3.4×, enough to knock out any back-row hero at level 10.
  - **Grave Dirt:** while 4 or more heroes stand, he throws dirt at everyone: a little damage and Dazzled for a turn.
  - The Gravedigger charges too, and the Mourner kindles them both.
  - **Two Graves** (below 50% health, once): from then on he Marks the two weakest heroes, and Burial hits both.
- **What it tests:** everything Region I taught: charging (1-12), the back row (1-5), support first (1-11) and kill order. It adds one new thing, a boss that changes at half health.
- **Answers:**
  - "Foe: charging a big attack → Guard" on a Warden. In the scratch check, this one rule raised the five-foe version below from 42% to 62%.
  - Shelter on the Marked hero, Dazzle on a charger, killing the Mourner and the digger first, and a level or two.
- **Scratch check:** the step-1 engine has no phases.
  - This four-foe formation without Two Graves wins 91% at level 10.
  - A five-foe version with a second Bones, also without Two Graves, wins 42% at level 10, 14% at 9 and 72% at 11.
  - Two Graves should bring the four-foe version to the 40–55% target. If phases slip from step 6, ship the five-foe version.
- **First clear:** "Boss present", the Gravedigger's Spade (Relic), the Gravecaller on the recruit board, and Region II opens.

### 5.6 The intended difficulty curve
- **A sawtooth:** easy road stages, a wall at each elite and the boss, then a breather. Each wall gives way to the rule it teaches, or to a level or two.
- **Fatigue, not defeat, should end most long runs of road stages.** A party at the recommended level chains road stages until it tires or meets a wall. Section 5.8 shows how fast it tires.
- **The reference party** is every hero at the recommended level, with a Common weapon and armour, starter rules and 2 Healing Draughts. Real players will be stronger than this, with spent skill points, Fine gear and better rules, so elites and the boss carry the challenge.
- **Targets for the reference party:** road stages win at least 90%; a stage that brings a new threat at least 85%; elites 55–75%; the boss 40–55% *(tune)*.
- **One level matters a lot.** In the scratch check, one level below the recommendation drops an elite to about 3–22%, and one level above lifts it to about 90%. Levels feel strong, but the cliff is steep. **Decided: soften it.** The lineup, rules, skills and gear are the strategy, so a good lineup with good rules should be able to win a wall a level or two under its recommended level.
  - **Target for the step 6 build:** around the recommended level, one level should move a wall's win chance by about 15–25 points, not the scratch check's jump from 3–22% at one level under to about 90% at one level over.
  - **Levers:** less Power growth per level for wall foes, so levels matter less; more spread in damage; walls whose mechanics reward the right rule more than raw stats.
  - Softer walls mean longer fights, which also cost more fatigue (section 5.8).

| Stage | Level | Party | Target | Scratch check: level −1 / rec / +1 | Rounds at rec |
|---|---|---|---|---|---|
| 1-1 | 1 | 1 | 95%+ | — / 100% / 100% | 3 |
| 1-2 | 1 | 1 | 95%+ | — / 100% / 100% | 7 |
| 1-3 | 2 | 2 | 95%+ | 100% / 100% / 100% | 6 |
| 1-4 | 2 | 2 | 90%+ | 100% / 100% / 100% | 7 |
| 1-5 | 3 | 2 | 90%+ | 98% / 100% / 100% | 8 |
| 1-6 | 3 | 3 | 90%+ | 95% / 100% / 100% | 10 |
| 1-7 | 4 | 3 | 90%+ | 100% / 100% / 100% | 10 |
| 1-8 | 4 | 3 | 85%+ | 100% / 100% / 100% | 11 |
| 1-9 Elite | 5 | 4 | 55–75% | 3% / 64% / 92% | 17 |
| 1-10 | 5 | 4 | 85%+ | 98% / 100% / 100% | 8 |
| 1-11 | 6 | 4 | 90%+ | 100% / 100% / 100% | 9 |
| 1-12 | 6 | 4 | 85%+ | 88% / 99% / 100% | 10 |
| 1-13 | 7 | 5 | 90%+ | 100% / 100% / 100% | 7 |
| 1-14 | 7 | 5 | 85%+ | 100% / 100% / 100% | 9 |
| 1-15 Elite | 8 | 5 | 55–75% | 22% / 61% / 89% (four rats, no summons) | 13 |
| 1-16 | 8 | 6 | 90%+ | 100% / 100% / 100% | 8 |
| 1-17 | 9 | 6 | 85%+ | 99% / 99% / 100% | 8 |
| 1-18 Boss | 10 | 6 | 40–55% | 14% / 42% / 72% (five-foe version, no phase) | 15 |

Waiting foes hold back while their front row is full, as section 3.3 describes. The Rat King's summons and the Sexton's Two Graves aren't in the step-1 engine.

**Regions II–V as built (build step 7a):** the walls against the reference party (`node tools/simtest.js --ref 90`: 30 battles per recruit order at the recommended level, 15 at the others).

| Wall | Level | Target | Level −1 / rec / +1 | Rounds at rec |
|---|---|---|---|---|
| 2-8 The Choir of Silt | 18 | 55–75% | 56% / 70% / 87% | 16.0 |
| 2-14 The Font Leech | 25 | 55–75% | 60% / 69% / 91% | 16.1 |
| 2-17 The Black Font (boss) | 30 | 40–55% | 20% / 44% / 56% | 16.6 |
| 3-8 Mother Bramble's Hollow | 38 | 55–75% | 47% / 68% / 80% | 16.7 |
| 3-14 The Thornback | 45 | 55–75% | 56% / 70% / 73% | 15.8 |
| 3-17 The Heart of the Wood (boss) | 50 | 40–55% | 0% / 54% / 53% | 16.8 |
| 4-8 The Kiln | 60 | 55–75% | 38% / 62% / 60% | 15.3 |
| 4-15 The Pyre | 69 | 55–75% | 60% / 67% / 69% | 17.7 |
| 4-18 The Burning Keep (boss) | 75 | 40–55% | 33% / 50% / 64% | 17.4 |
| 5-8 The Kingsguard | 85 | 55–75% | 58% / 69% / 87% | 16.6 |
| 5-15 The Lord Chamberlain | 95 | 55–75% | 56% / 67% / 73% | 15.5 |
| 5-18 The Hollow Throne (boss) | 100 | 40–55% | 29% / 50% / 60% | 17.4 |

- Every later road stage wins 89–100% at its recommended level, in 7–11 rounds.
- **The cliff past Region I:** most later walls move 0–24 points a level, and the 3-17 boss 54 points, at level 50, where heroes take their second skill slot and tier 3. A hero level after 10 adds only about 2% to a hero's power, so one level matters less than in Region I, except where a skill point (every 5 levels) or a threshold lands.

### 5.7 Changes to the content spec's placeholders
The content spec says its reward stage numbers are placeholders until this spec. These are the changes:

| Item | Content spec | This spec | Why |
|---|---|---|---|
| Foe: undead | I-2 | 1-7 | 1-2 gives the first recruit, and undead only matter once beasts fight beside them. |
| Foe: in the back row | I-6 | 1-5 | It answers the first back-row foe. |
| Next stage has a boss or elite | I-12 | 1-15, the Rat King | So it arrives just before the Sexton. |
| Foe: charging a big attack | The Sexton | 1-12, Fresh Graves | So the Sexton tests it instead of teaching it afterwards. |
| Tactician I | Early Region I | Its building opens at 1-11 | So the first hour stays one system at a time. |
| The Gravewarden | 210 Health, 22 Power, 12 Defense | 300, 36, 8 | Less a wall of Defense, more a threat, and sturdy enough to stay a wall now that early foes have less health. |

N or more foes (1-4), Foe: highest attack (1-8), Ally: most hurt (1-10), Foe: boss or elite (the Gravewarden) and Boss present (the Sexton) stay where the content spec put them.

### 5.8 Fatigue: what a stage costs
- **The rule, your choice:** each turn a hero takes in battle adds 1 fatigue *(tune)*. Nothing else adds fatigue for now: not damage, and not knock-outs.
  - A knocked-out hero takes no turns, so gains nothing while down. Thralls build none, and using a party item takes no one's turn.
  - The thresholds stay as the home-base spec has them: Weary at 50, Exhausted at 75 and Spent at 100. The default come-home rule fires at 75.
- **The principle: a stage costs the turns its battle takes.** That comes from its foes' health and threat against the party's strength. There are no fatigue multipliers per stage or per level, and no "easy road".
  - Weak foes fall fast, so early stages and Light stages are cheap.
  - Walls take longer, so elites and bosses cost the most rest.
  - A party that outgrows a stage clears it faster and tires less, so replaying an easier stage is cheap. Four levels over, a road stage takes about a quarter fewer turns.
- **What each kind of stage costs in Region I,** at the recommended level in the scratch check *(tune)*. Faster heroes take a little more.

| Stage kind | Rounds | Fatigue per hero |
|---|---|---|
| Light (1-1 to 1-3) | 3–7 | 3–7 |
| Standard | 7–10 | 6–8 |
| Rich (1-8, 1-14, 1-17) | 8–11 | 6–9 |
| Elite (1-9, 1-15) | 13–17 | 9–13 |
| Boss (1-18) | 13–15 | about 10 |

- **How Region I is tuned for it:**
  - Foe Health starts gentle and steepens up to level 10 (section 3.1), so early foes fall quickly.
  - The Gravewarden and the Rat King got more Health, so the walls stay long and hard.
- **The first hour stays slow.** The starting hero fights every stage.
  - Played straight through without rest, they reach Weary around 1-8 and 75 around 1-10 or 1-11, near the end of the first hour.
  - A Hexblade start, at Speed 11, tires a little sooner: Weary around 1-7, and 75 by the first elite.
  - Recruits join fresh.
  - Before this tuning, the starting hero reached Weary around 1-7 and 75 by 1-8 or 1-9.
- **If the first hour still feels too tiring in play-testing,** the lever is battle length, through foe Health (section 3.1). There's no fatigue discount to fall back on.
- **Recovery** (home-base spec): about one road battle's worth of fatigue an hour at the fire, and 2–3.5 battles' worth in an Infirmary bed. A night at the fire undoes about 8 road battles.
- **Knock-ons for the content spec,** whose section 7 builds fatigue from damage:
  - Percentage modifiers still work: Iron Will, Comfort, Gravewarden's Plate, Mourner's Veil, the Hollow Crown and the Gravedigger's Spade.
  - Wards, dodges and Guard no longer save fatigue, and health-cost skills such as Blood Price no longer add it.
  - Speed now costs fatigue. Haste and fast classes tire sooner, and the slow Warden tires least.
  - House Calls (every character recovers 1–4 fatigue after each battle) and awakened Comfort (2 more) need re-sizing against about 10 fatigue a battle.

## 6. Regions II–V: outlines

| Region | Levels | Elites | Classes joining | Conditions taught | New at the home base |
|---|---|---|---|---|---|
| II Drowned Chapel | 11–30 | 2-8 Choir of Silt, 2-14 The Font Leech | Barber-Surgeon, Bellringer | Foe: spirit, Foe: healer, Foes enraged | Masters' Hall and Shrine when the region opens; Tactician II |
| III Thornwood | 31–50 | 3-8 Mother Bramble, 3-14 The Thornback | Duellist, Cutpurse | Foe: beast, Foe: acts next, Ally: highest Power | Whetstone and Ossuary; Tactician III *(proposed)* |
| IV Ashen Keep | 51–75 | 4-8 The Kiln Warden, 4-15 The Pyre Priest | Alchemist | Fewer than N allies standing | Hexing Stone and Bell Tower |
| V Hollow Throne | 76–100 | 5-8 Kingsguard Revenant, 5-15 The Lord Chamberlain | — | Nothing new: it tests what you've built | Nothing new |

The home-base spec owns the buildings. The four passive-bonus buildings open when their region is first reached.

### Region II: the Drowned Chapel
A flooded chapel where the drowned still hold their services, and bells toll under the water. Levels 11–30, 17 stages, Chapel Wax. Undead and spirits.

- **Signature mechanics:**
  - **Foes that heal and raise:** the Acolytes, the Choir and the Bishop. This teaches "Foe: healer", with a heavy hitter or a curse aimed at the healer: Aimed Shot, Lunge or Doom. Heroes only have tier-1 skills until level 30.
  - **Spirits:** they dodge, barely bleed and are weak to curses. "Foe: spirit", Doom and the Lamplighter's Dazzle come into their own.
  - **Turn delays:** the Bell Wraith's Toll does to you what the Bellringer, who joins here, will do to foes.
  - **Silence on your healer:** the Silent Sister. Cleansing matters, with the Bitter Tincture, Wax Ear-stoppers and the Barber-Surgeon's Tonic. The Barber-Surgeon also joins here.
  - **Mana drain:** the Font Leech. Lamp Oil, Gather (Tactician II) and "Self: mana below X%" earn their place.
  - **Bursting corpses:** kill them in one go, or Ward the party first.
- **Elites:**
  - 2-8, the Choir of Silt: heals itself and dooms everyone. Reward: "Foe: healer".
  - 2-14, the Font Leech: drains mana until fights drag into enrage. Reward: "Foes enraged".
- **Boss, 2-17, the Drowned Bishop:** raises fallen foes, baptises a Marked hero with a charged Drown, and floods everyone with Font of Brine. Below half health the font overflows, and Font of Brine also pushes your turns back. It tests silencing or killing the healer, kill order when the dead get up, and the answers to a charge. Relic: the Bishop's Crozier.
- **Condition:** "Foe: spirit" from the first Bell Wraith stage, 2-2.

#### Region II stages *(tune)*
| Stage | Name | Kind | Level | Front: F1 · F2 | Back: B1 · B2 · B3 · B4 | Tier | First clear |
|---|---|---|---|---|---|---|---|
| 2-1 | The Chapel Steps | Road | 11 | Ghoul · Ghoul | Restless Bones · Drowned Acolyte · — · Restless Bones | Standard | Tactician II |
| 2-2 | The Bell-Drowned Nave | Road, new threat | 12 | Ghoul · Grave Glutton | Bell Wraith · Drowned Acolyte · — · Bell Wraith | Standard | Foe: spirit |
| 2-3 | The Swollen Pews | Road, new threat | 13 | Bloated Corpse · Bloated Corpse | — · Drowned Acolyte · Restless Bones · — | Standard | — |
| 2-4 | The Silent Cloister | Road, new threat | 14 | Bloated Corpse · Ghoul | Silent Sister · Drowned Acolyte · — · Restless Bones | Standard | The Barber-Surgeon joins the recruit board |
| 2-5 | The Belfry Stair | Road | 15 | Bloated Corpse · Bell Wraith | Bell Wraith · Drowned Acolyte · — · Bell Wraith | Standard | The Bellringer joins the recruit board |
| 2-6 | The Choir Stalls | Road | 16 | Bloated Corpse · Ghoul | Drowned Acolyte · Silent Sister · Drowned Acolyte · — | Standard | — |
| 2-7 | The Sunken Ossuary | Road | 17 | Bloated Corpse · Ghoul | Drowned Acolyte · Bell Wraith · — · Silent Sister | Rich | — |
| 2-8 | The Choir of Silt | Elite | 18 | Choir of Silt · Bloated Corpse | Drowned Acolyte · — · — · Drowned Acolyte | Elite | Foe: healer |
| 2-9 | The Drowned Library | Road | 18 | Bloated Corpse · Ghoul | Silent Sister · Drowned Acolyte · Bell Wraith · — | Standard | — |
| 2-10 | The Bell Tower | Road | 19 | Bell Wraith · Bell Wraith | Bell Wraith · — · Drowned Acolyte · Bell Wraith | Standard | — |
| 2-11 | The Font Cellars | Road | 20 | Bloated Corpse · Bloated Corpse | Drowned Acolyte · Silent Sister · — · Restless Bones | Standard | — |
| 2-12 | The Vestry | Road | 22 | Ghoul · Bloated Corpse | Silent Sister · Bell Wraith · Silent Sister · — | Standard | — |
| 2-13 | The Font Steps | Road | 23 | Bloated Corpse · Bloated Corpse | Drowned Acolyte · Bell Wraith · — · Silent Sister | Rich | — |
| 2-14 | The Font Leech | Elite | 25 | Font Leech · Bloated Corpse | — · Drowned Acolyte · Silent Sister · — | Elite | Foes enraged |
| 2-15 | The Drowned Choir | Road | 25 | Bloated Corpse · Ghoul | Drowned Acolyte · Bell Wraith · — · Bell Wraith | Standard | — |
| 2-16 | The Bishop’s Antechamber | Road | 27 | Bloated Corpse · Ghoul | Drowned Acolyte · Silent Sister · Bell Wraith · — | Rich | — |
| 2-17 | The Black Font | Boss | 30 | Drowned Bishop · Bloated Corpse | — · Drowned Acolyte · Silent Sister · — | Boss | Relic: the Bishop’s Crozier · The Duellist joins the recruit board · Thornwood opens · Whetstone · Ossuary |

### Region III: Thornwood
An old wood where the road narrows, wolves run in packs, and an old god waits. Levels 31–50, 17 stages, Heartwood. Mostly beasts.

- **Signature mechanics:**
  - **Packs:** Briar Wolves hit harder for each wolf standing. "Foe: beast" and the Crossbowman's Hunter answer them.
  - **Stuns:** Region III foes are the content spec's main source of Stun. Stun resistance matters (Hobnailed Boots, the Ironbound Collar), and so does the Bitter Tincture. The Bellringer's Wake is tier 3, so it arrives at level 50.
  - **Your formation, broken:** the Marsh Lantern lures back-row heroes forward, and the Hanged Man drops onto your back row from hiding. Move resistance, the Move action and row conditions answer it.
  - **Thorns that punish attackers:** Mother Bramble's Retaliating. Hold back while the thorns are up, with "Foe: without Retaliating", or let a Duellist's counters do the work.
  - **Poison:** Rot Bloom.
- **Classes joining:** the Duellist from 3-1, and the Cutpurse from about 3-9.
- **Elites:**
  - 3-8, Mother Bramble. Reward: "Ally: highest Power".
  - 3-14, the Thornback: a charged stun on your whole front row. Reward: "Foe: acts next", to push its turn back before the charge lands.
- **Boss, 3-17, the Antlered One:** a charged Rut that stuns for 2 turns, Old Growth healing every turn, and the Wild Hunt calling two wolves below 60% health. It tests Festering against healing, answers to stuns, and pack control. Relic: Bark of the Old God.
- **Condition:** "Foe: beast" from the first wolf stage, 3-2.

#### Region III stages *(tune)*
| Stage | Name | Kind | Level | Front: F1 · F2 | Back: B1 · B2 · B3 · B4 | Tier | First clear |
|---|---|---|---|---|---|---|---|
| 3-1 | The Wood’s Edge | Road | 31 | Thorn Witch · Briar Wolf | Carrion Crows · — · Thorn Witch · Carrion Crows | Standard | — |
| 3-2 | The Wolf Run | Road, new threat | 32 | Briar Wolf · Briar Wolf | — · Thorn Witch · Briar Wolf (waits) · — | Standard | Foe: beast |
| 3-3 | The Hanging Wood | Road, new threat | 33 | Briar Wolf · Briar Wolf | Hanged Man · — · Thorn Witch · — | Standard | — |
| 3-4 | The Wisp Fen | Road, new threat | 34 | Briar Wolf · Briar Wolf | Marsh Lantern · — · — · Thorn Witch | Standard | — |
| 3-5 | The Briar Crossing | Road | 35 | Briar Wolf · Briar Wolf | Thorn Witch · Briar Wolf (waits) · Briar Wolf (waits) · — | Standard | — |
| 3-6 | The Gallows Glade | Road | 36 | Briar Wolf · Thorn Witch | Hanged Man · Thorn Witch · Hanged Man · — | Standard | — |
| 3-7 | The Old Wood’s Heart | Road | 37 | Briar Wolf · Thorn Witch | Marsh Lantern · Hanged Man · — · Thorn Witch | Rich | — |
| 3-8 | Mother Bramble’s Hollow | Elite | 38 | Mother Bramble · Briar Wolf | Thorn Witch · — · — · Thorn Witch | Elite | Ally: highest Power |
| 3-9 | The Thorn Path | Road | 38 | Briar Wolf · Briar Wolf | Thorn Witch · Marsh Lantern · — · — | Standard | The Cutpurse joins the recruit board |
| 3-10 | The Rotting Bower | Road | 39 | Briar Wolf · Thorn Witch | Thorn Witch · Hanged Man · — · Thorn Witch | Standard | — |
| 3-11 | The Hollow Oak | Road | 40 | Briar Wolf · Briar Wolf | Hanged Man · Marsh Lantern · Thorn Witch · — | Standard | — |
| 3-12 | The Moonlit Clearing | Road | 42 | Briar Wolf · Briar Wolf | Briar Wolf (waits) · Marsh Lantern · Thorn Witch · — | Standard | — |
| 3-13 | The Boar Wallow | Road | 43 | Briar Wolf · Briar Wolf | Thorn Witch · Hanged Man · Marsh Lantern · — | Rich | — |
| 3-14 | The Thornback | Elite | 45 | Thornback · Briar Wolf | — · Thorn Witch · Briar Wolf (waits) · — | Elite | Foe: acts next |
| 3-15 | The Antler Grove | Road | 45 | Briar Wolf · Briar Wolf | Hanged Man · Thorn Witch · Marsh Lantern · — | Standard | — |
| 3-16 | The Old God’s Threshold | Road | 47 | Briar Wolf · Briar Wolf | Thorn Witch · Hanged Man · Marsh Lantern · — | Rich | — |
| 3-17 | The Heart of the Wood | Boss | 50 | Antlered One · Briar Wolf | — · Thorn Witch · — · — | Boss | Relic: the Bark of the Old God · The Alchemist joins the recruit board · The Ashen Keep opens · Hexing Stone · Bell Tower |

### Region IV: the Ashen Keep
A burnt fortress where scorched knights still guard the gate, and the marshal who burned it still commands. Levels 51–75, 18 stages, Cinder Iron. Undead knights, beasts of coal and fire-priests.

- **Signature mechanics:**
  - **Burning everywhere:** Blight resistance and cleansing.
  - **Heavy armour:** Ash Knights start at Defense 14. Corroded pays, and the Alchemist, who joins at 4-1, melts it.
  - **Covers and guards:** squires cover their knights. Area damage and killing the coverer first answer it.
  - **Siege shots at your back row:** the Ashen Arbalist's charged shot. Cover and Guard protect the back row.
  - **Telegraphed blasts:** the Kiln Warden. Ward the party before the blast lands.
- **Elites:**
  - 4-8, the Kiln Warden. Reward: "Fewer than N allies standing".
  - 4-15, the Pyre Priest: a healer that also kindles, standing behind armour.
- **Boss, 4-18, the Burnt Marshal:** a blade that splashes onto your other front-row hero, a Rally that kindles and fortifies every knight, and a charged front-row Charge of the Burnt. Below half health the keep burns, and every hero takes Burning each turn, so burst and speed decide it. Relic: the Marshal's Ashen Blade.

#### Region IV stages *(tune)*
| Stage | Name | Kind | Level | Front: F1 · F2 | Back: B1 · B2 · B3 · B4 | Tier | First clear |
|---|---|---|---|---|---|---|---|
| 4-1 | The Cinder Gate | Road | 51 | Ash Knight · Ash Knight | — · Ash Knight (waits) · — · — | Standard | — |
| 4-2 | The Ember Kennels | Road, new threat | 52 | Cinder Hound · Cinder Hound | — · Cinder Hound · Ash Knight (waits) · — | Standard | — |
| 4-3 | The Squires’ Yard | Road, new threat | 53 | Ash Knight · Ash Knight | Flayed Squire · — · — · Flayed Squire | Standard | — |
| 4-4 | The Arrow Slits | Road, new threat | 54 | Ash Knight · Cinder Hound | Ashen Arbalist · — · Flayed Squire · Ashen Arbalist | Standard | — |
| 4-5 | The Burnt Barracks | Road | 56 | Ash Knight · Ash Knight | Flayed Squire · Ashen Arbalist · Cinder Hound · — | Standard | — |
| 4-6 | The Kennel Yard | Road | 57 | Cinder Hound · Cinder Hound | Cinder Hound · Flayed Squire · Cinder Hound · — | Standard | — |
| 4-7 | The Forge Stair | Road | 58 | Ash Knight · Ash Knight | Flayed Squire · Ashen Arbalist · Ashen Arbalist · Flayed Squire | Rich | — |
| 4-8 | The Kiln | Elite | 60 | Kiln Warden · Ash Knight | Flayed Squire · — · — · Ashen Arbalist | Elite | Fewer than N allies standing |
| 4-9 | The Smoking Hall | Road | 60 | Ash Knight · Cinder Hound | Flayed Squire · — · Ashen Arbalist · — | Standard | — |
| 4-10 | The Chapel of Cinders | Road | 61 | Ash Knight · Ash Knight | Flayed Squire · Cinder Hound · Flayed Squire · — | Standard | — |
| 4-11 | The Gatehouse | Road | 63 | Ash Knight · Ash Knight | Ashen Arbalist · Flayed Squire · Ashen Arbalist · — | Standard | — |
| 4-12 | The Burning Walk | Road | 64 | Cinder Hound · Ash Knight | Cinder Hound · Ashen Arbalist · Flayed Squire · — | Standard | — |
| 4-13 | The Armoury | Road | 66 | Ash Knight · Ash Knight | Flayed Squire · Ash Knight (waits) · Flayed Squire · — | Standard | — |
| 4-14 | The Pyre Steps | Road | 67 | Ash Knight · Cinder Hound | Flayed Squire · Ashen Arbalist · Ashen Arbalist · Flayed Squire | Rich | — |
| 4-15 | The Pyre | Elite | 69 | Ash Knight · Ash Knight | Flayed Squire · Pyre Priest · — · Flayed Squire | Elite | — |
| 4-16 | The Marshal’s Gallery | Road | 69 | Ash Knight · Cinder Hound | Ashen Arbalist · Flayed Squire · Cinder Hound · Ashen Arbalist | Standard | — |
| 4-17 | The War Room | Road | 72 | Ash Knight · Ash Knight | Flayed Squire · Ashen Arbalist · Flayed Squire · Ashen Arbalist | Rich | — |
| 4-18 | The Burning Keep | Boss | 75 | Burnt Marshal · Ash Knight | — · Flayed Squire · Ashen Arbalist · — | Boss | Relic: the Marshal’s Ashen Blade · The Hollow Throne opens |

### Region V: the Hollow Throne
A court of the dead under a throne of tallow and bone, where would-be kings wait for a crown. Levels 76–100, 18 stages, Throne Tallow. Spirits and undead.

- **Signature mechanics:**
  - **Spirits again:** curse builds shine, and bleed builds fail.
  - **Buff stripping:** the Wick Wraith, the Crowned Shade and the King take away Kindled, Hasted and Wards. Rules that re-apply them, such as "Ally: without Kindled → Kindle", are the answer.
  - **Confusion:** the Courtier's Flattery turns your hardest hitter. The Bellringer's Wake clears it.
  - **A death announced in advance:** the Bone Herald Dooms your strongest. Cleanse or out-heal it.
  - **Your formation, rearranged:** the Lord Chamberlain swaps heroes between rows. Move resistance and row rules answer it.
  - **Cover on everything that matters:** the Kingsguard Revenant.
- **No new conditions:** the content spec has Region V test what you've built.
- **Elites:** 5-8, the Kingsguard Revenant, and 5-15, the Lord Chamberlain.
- **Boss, 5-18, the Hollow King:** three phases.
  1. Court of Shades: he calls Crowned Shades into empty slots.
  2. Snuff the Lanterns, below 66% health: every helpful status is stripped and every hero is Dazzled.
  3. Long Live the King, below 33%: every hero is Doomed, and his Sceptre hits a whole row.

  It tests cleansing, Wards, kill order, curses and enrage all at once. Relic: the Hollow Crown.

#### Region V stages *(tune)*
| Stage | Name | Kind | Level | Front: F1 · F2 | Back: B1 · B2 · B3 · B4 | Tier | First clear |
|---|---|---|---|---|---|---|---|
| 5-1 | The Tallow Road | Road | 76 | Crowned Shade · Crowned Shade | — · Bell Wraith · Bell Wraith · — | Standard | — |
| 5-2 | The Hall of Bows | Road, new threat | 77 | Crowned Shade · Crowned Shade | Hollow Courtier · — · — · Hollow Courtier | Standard | — |
| 5-3 | The Heralds’ Gallery | Road, new threat | 78 | Crowned Shade · Crowned Shade | Bone Herald · Hollow Courtier · — · Bone Herald | Standard | — |
| 5-4 | The Candle Gallery | Road, new threat | 80 | Crowned Shade · Crowned Shade | Wick Wraith · Bone Herald · — · Wick Wraith | Standard | — |
| 5-5 | The Mirror Hall | Road | 81 | Crowned Shade · Ash Knight | Hollow Courtier · Wick Wraith · Bone Herald · — | Standard | — |
| 5-6 | The Waxworks | Road | 82 | Crowned Shade · Crowned Shade | Wick Wraith · Wick Wraith · Hollow Courtier · — | Standard | — |
| 5-7 | The Guard Room | Road | 84 | Crowned Shade · Crowned Shade | Bone Herald · Hollow Courtier · Wick Wraith · Bone Herald | Rich | — |
| 5-8 | The Kingsguard | Elite | 85 | Kingsguard Revenant · Crowned Shade | Bone Herald · — · — · Wick Wraith | Elite | — |
| 5-9 | The Hall of Petitions | Road | 85 | Crowned Shade · Crowned Shade | Hollow Courtier · Bone Herald · Hollow Courtier · — | Standard | — |
| 5-10 | The Long Gallery | Road | 87 | Crowned Shade · Ash Knight | Wick Wraith · Hollow Courtier · Bone Herald · — | Standard | — |
| 5-11 | The Tallow Chapel | Road | 88 | Crowned Shade · Crowned Shade | Drowned Acolyte · Wick Wraith · — · Bone Herald | Standard | — |
| 5-12 | The Bone Cloisters | Road | 90 | Crowned Shade · Crowned Shade | Bone Herald · Bone Herald · Wick Wraith · — | Standard | — |
| 5-13 | The Ashen Guard | Road | 91 | Ash Knight · Crowned Shade | Flayed Squire · Hollow Courtier · Bone Herald · — | Standard | — |
| 5-14 | The Chamberlain’s Door | Road | 93 | Crowned Shade · Crowned Shade | Hollow Courtier · Bone Herald · Wick Wraith · Hollow Courtier | Rich | — |
| 5-15 | The Lord Chamberlain | Elite | 95 | Crowned Shade · Crowned Shade | Hollow Courtier · Lord Chamberlain · — · Bone Herald | Elite | — |
| 5-16 | The Throne Stair | Road | 95 | Crowned Shade · Crowned Shade | Wick Wraith · Bone Herald · Hollow Courtier · — | Standard | — |
| 5-17 | The Last Antechamber | Road | 97 | Crowned Shade · Crowned Shade | Bone Herald · Hollow Courtier · Wick Wraith · — | Rich | — |
| 5-18 | The Hollow Throne | Boss | 100 | Hollow King · — | — · Wick Wraith · Bone Herald · — | Boss | Relic: the Hollow Crown · Every lantern on the road burns |

### The later foes as built
"Waits" marks a melee foe placed behind, as in Region I. Foe resistances use section 3.2's defaults by rank and family, except the Kiln Warden's and the Pyre Priest's, which resist Blight and Burning more.

#### Level-1 stats as built *(tune)*
| Foe | Region | Rank | Health | Mana | Power | Defense | Speed | Dodge | Notes |
|---|---|---|---|---|---|---|---|---|---|
| Drowned Acolyte | II | Normal | 66 | 30 | 17 | 4 | 10 | 5% | healer |
| Bell Wraith | II | Normal | 60 | 30 | 17 | 3 | 11 | 20% |  |
| Bloated Corpse | II | Normal | 150 | 0 | 20 | 5 | 6 | 0% |  |
| Silent Sister | II | Normal | 70 | 30 | 16 | 4 | 10 | 5% |  |
| Choir of Silt | II | Elite | 440 | 40 | 30 | 6 | 10 | 5% | healer |
| The Font Leech | II | Elite | 460 | 40 | 30 | 6 | 7 | 0% |  |
| The Drowned Bishop | II | Boss | 470 | 50 | 50 | 8 | 9 | 0% |  |
| Thorn Witch | III | Normal | 95 | 30 | 20 | 4 | 10 | 5% |  |
| Briar Wolf | III | Normal | 120 | 20 | 20 | 4 | 12 | 10% |  |
| The Hanged Man | III | Normal | 115 | 50 | 22 | 5 | 9 | 5% | starts Hidden |
| Marsh Lantern | III | Normal | 90 | 40 | 18 | 3 | 11 | 20% |  |
| Mother Bramble | III | Elite | 470 | 40 | 44 | 8 | 7 | 0% |  |
| The Thornback | III | Elite | 640 | 50 | 50 | 10 | 8 | 0% |  |
| The Antlered One | III | Boss | 220 | 50 | 54 | 9 | 10 | 0% | Old Growth 1.5% |
| Ash Knight | IV | Normal | 80 | 30 | 26 | 12 | 8 | 0% |  |
| Cinder Hound | IV | Normal | 90 | 20 | 22 | 4 | 13 | 10% |  |
| Flayed Squire | IV | Normal | 95 | 30 | 18 | 6 | 10 | 5% |  |
| Ashen Arbalist | IV | Normal | 85 | 30 | 21 | 5 | 8 | 0% |  |
| The Kiln Warden | IV | Elite | 320 | 50 | 26 | 12 | 6 | 0% |  |
| The Pyre Priest | IV | Elite | 215 | 50 | 44 | 6 | 9 | 5% | healer |
| The Burnt Marshal | IV | Boss | 360 | 50 | 50 | 10 | 9 | 0% |  |
| Crowned Shade | V | Normal | 100 | 30 | 24 | 5 | 11 | 20% |  |
| Hollow Courtier | V | Normal | 90 | 30 | 22 | 5 | 11 | 10% |  |
| Bone Herald | V | Normal | 95 | 40 | 22 | 8 | 9 | 0% |  |
| Wick Wraith | V | Normal | 80 | 30 | 20 | 4 | 12 | 15% |  |
| Kingsguard Revenant | V | Elite | 360 | 40 | 82 | 16 | 8 | 0% |  |
| The Lord Chamberlain | V | Elite | 320 | 50 | 44 | 6 | 10 | 10% |  |
| The Hollow King | V | Boss | 210 | 60 | 36 | 10 | 10 | 0% |  |

## 7. The map screen

This builds on the screen mockups' Road screens: the region map, the stage sheet and the whole road.

### 7.1 The region map
- Each region is one tall map, read from the bottom up, so the frontier stage sits near your thumb and the dark lies above.
- **Stages are lanterns along the road,** in three states:

| State | How it looks | Tapping it |
|---|---|---|
| Lit (cleared) | The lantern burns and throws a pool of light. The pools join up, so the map shows how far your light reaches. | Opens the stage sheet with Farm. |
| Frontier (the next to clear) | The lantern gutters, and the party's marker pulses beside it. | Opens the stage sheet with Set out. |
| Dark (not reached) | An unlit post in the dark. Its foes show only as silhouettes. | Opens a short sheet: "Light the stages before it." |

- **Elites** are red diamonds and the **boss** is a skull at the top, as the mockup draws them.
- **The header** reads "Region I · 13/18 lit", with arrows to the regions on either side.
- **When the boss falls,** every lantern in the region flares and the road onward lights into the next region's map.

### 7.2 The whole road
- Tapping the region title opens all five regions, stacked, with "13/88" lit in all.
- A region you haven't reached stays in darkness and names what opens it, for example "Beat the Sexton to enter".
- Each reached region shows its lit count, its elites and boss, and the material it drops most.

### 7.3 The stage sheet
- **Top:** the stage's number and name, and "Rec. lv 7 · 5 heroes", coloured by how ready your party is:

| Colour *(tune)* | When |
|---|---|
| Lantern gold | Every hero is at or above the recommended level, with enough heroes |
| Amber | Within one level, or one hero short |
| Red | Two or more levels below, or two or more heroes short |

- **Foes:** their battle sprites in their formation, front and back, so you can plan rows before setting out. Tapping a foe shows its level, skills and resistances.
- **Rewards:** the stage's tier as icons (gold, XP, material, gear chance). XP shows the amount each hero gets and, for the lead hero, its share of their level, with Too easy where it pays a hero little (section 5.4). Until the first clear, a "First clear" ribbon shows the doubled gold and materials and the stage's one-off unlock.
- **Road settings:**
  - **Keep going after a win:** a toggle, available from 1-6.
  - **Come home when:** chips such as "Fatigue 75+", "An ally fell", "Out of draughts" and "Before a boss or elite". Each chip is a between-battle party rule, so toggling one here edits the party rules. There is one list of rules, seen from two places.
  - **Rule set:** once saved rule sets exist (1-11). The sheet remembers the set you last chose for that stage, which helps before a boss.
- **The party strip:** each hero's sprite, level and fatigue sliver, with tired heroes flagged. Edit opens the Party board.
- **One button at thumb height:** Set out on the frontier, Farm on a lit stage.

### 7.4 Setting out, keeping going and farming
- **Set out** walks the party along the lit road to the frontier stage, and the battle starts where they stop, as section 11 of the design asks.
- **Keeping going:** after a first clear with Keep going on, the party walks on to the next dark stage and fights it, lighting the road one stage at a time.
- **Farming** replays one lit stage over and over while Keep going is on. It gives the stage's tier rewards, never its first-clear unlocks, and wandering foes can appear (section 3.4).
- **With Keep going off,** the party fights once and comes home.
- **Between battles:**
  1. Loot flies into the Bag. If the Bag is full, new gear sells on the spot, as the home-base spec proposes, so a full Bag never sends the party home.
  2. A level-up shows as a short banner, never mid-battle.
  3. The between-battle party rules are checked, from the top.
  4. A hero who reached Spent (100 fatigue) leaves for camp, as the design says.
  5. The party walks on, about 3 seconds at 1× *(tune)*, and the next battle starts where they stop.

### 7.5 What sends the party home
| Why it stops | What happens |
|---|---|
| A battle is lost | The party walks home, keeping the spoils of foes it defeated but no clear reward. The frontier stays where it was. The report leads with the stage's hint (section 5.3). |
| A between-battle party rule fires | For example "Between battles: any character at 75+ fatigue → Return to base". The party walks home after that battle. |
| A boss falls | The party always comes home, even with Keep going on, so the region's ending gets its moment. |
| No heroes are left | Every hero was Spent. The party is home. |
| The player calls them home | A Come home button on the battle screen and the map. The current battle finishes first. |
| The app closes | The party comes home after the current battle, which resolves when you return. Nothing plays on while the app is closed: offline gains come only from home-base buildings, and resting at camp carries on. |

- **The trip summary** shows on the Road tab when the party is home: stages lit, battles won, XP, gold, materials, loot, and why it stopped, such as "Ottilie reached 75 fatigue" or "Lost at 1-9: the Gravewarden".
- **A loss costs** time, and the fatigue of the turns taken. Nothing else is lost.
- **Walking home** is a short fade on the map. The heroes start resting at once, and you can set out again straight away.

### 7.6 What the map remembers
- The save already has `campaign.cleared`, `campaign.best` and `campaign.current` (step 2's app shell).
- **`best`** holds each stage's fastest win, in rounds, for the stage sheet and for future goals.
- **Add:** the road settings, shared by every stage, and the rule set chosen for each stage.

## 8. Teaching: the first hour

### 8.1 Principles
- **One new system per stage.** After the first reward condition, a new condition is a new option, not a new system.
- **Problem first, answer second.** A stage shows a problem, its first clear gives the condition that answers it, and a later stage tests it.
- **Nothing appears before it's useful:** the Tactics screen after 1-1, items after 1-3, chaining after 1-6, the Tactician after 1-11.
- **Tips are one line,** shown the first time something happens, and they never block the battle. Skip is always there.
- **A loss explains itself:** the defeat report leads with the stage's hint.

### 8.2 The first hour
Times assume about 1–2 minutes per stage, including the rewards and the walk *(tune)*.

| Time | Where | What's new |
|---|---|---|
| 0:00 | Choosing a hero | Sellsword, Hexblade or Pilgrim, each shown as a sprite with one line about how they fight |
| 0:01 | 1-1 | Watching a battle |
| 0:03 | The Tactics screen | Reading your hero's two starter rules, dragging and toggling them |
| 0:04 | 1-2 | Rules firing, named in the callouts |
| 0:06 | The camp | Opening the Recruit Board, which stands outside the plots, and picking a free recruit: the first recruit, well inside the design's 10 minutes |
| 0:09 | 1-3 | Front and back rows, Bleeding |
| 0:12 | The Party board | Items: the loadout, the draught rule, and tapping a draught by hand |
| 0:14 | 1-4 | Speed on the turn strip, and the first condition reward |
| 0:17 | 1-5 | Back-row foes, and the Toll House: the first offline gains |
| 0:21 | 1-6 | Keep going after a win, fatigue and the come-home rule |
| 0:25–0:35 | 1-7, 1-8 | Families and heavy hitters, the Infirmary and the Training Yard |
| 0:35–0:45 | 1-9 | The first wall: retrying, farming 1-8 and levelling up |
| 0:45–1:00 | 1-10, 1-11 | Healing order, the Shop and the Tactician |

### 8.3 First-time tips
| The first time… | Tip |
|---|---|
| a hero Bleeds | "Bleeding: loses health each turn. Healing doesn't stop it." |
| a hit is Guarded | "Guarded: the Gravewarden took that hit for its ally." |
| a hero is Marked | "Marked: a big hit lands on this hero next turn." |
| foes enrage | "Enraged: from round 15 foes hit harder every round." |
| a hero falls | "Knocked out: back up after the battle, at full health. 'Ally: fallen' is now a condition." |
| a battle is lost | The stage's hint |
| a hero is Weary | "Weary: rest at camp. The Infirmary speeds it up." |
| a hero gets a stat point | "A stat point: spend it on the Stats tab." |
| a hero gets a skill point (level 5) | "A skill point: learn a tier-1 skill, then choose which one to equip." |

### 8.4 After the first hour
| System | Where it arrives |
|---|---|
| Focus fire, the Move action, saved rule sets, thresholds | Tactician I, from 1-11 |
| Scavenger Camp, Barracks, Salvage Pit | 1-13, 1-15, 1-16 |
| Relics | The Sexton, 1-18 |
| The Gravecaller and thralls | After the Sexton |
| Tactician II: Gather, "Battle start" and more | Region II |
| The Masters' Hall | Region II, from hero level 20 |
| The Shrine (paid respecs) | Region II |
| The first threshold (level 30): tier 2 and a free respec | The end of Region II |
| Switching rule sets by party rule | Tactician III, Region III |
| Passive-bonus buildings: the Whetstone and Ossuary, then the Hexing Stone and Bell Tower | Reaching Regions III and IV |
| Combining classes (level 50) | The end of Region III |

## 9. Settled questions

**Decided by you:**
- Fatigue is +1 for each turn a hero takes, and a stage costs the turns its battle takes (section 5.8).
- The Toll House opens at 1-5.

**Decided overnight by the coordinator, for your review:**
1. **Foe growth:** keep the steep Region I growth (section 3.1). The growth after level 10 still needs re-checking against the heroes' full power curve once steps 3 and 4 settle it.
2. **The cliff:** soften it. Around the recommended level, one level should move a wall's win chance by about 15–25 points (section 5.6). The step 6 build tunes it.
3. **Elites:** they stay on the road in Region I, as teaching gates.
4. **Levels and farming:** keep the region levels (1–10, 11–30, 31–50, 51–75, 76–100) and the farming loop of replays and the Training Yard.
5. **Closing the app:** the party comes home after the current battle, which resolves when you return. Offline gains come only from home-base buildings, and resting at camp carries on.
6. **After a boss,** the party always comes home, even with Keep going on.
7. **"Come home when" chips** on the stage sheet edit the between-battle party rules, so there's one list.
8. **A Spent hero** walks home alone, and the rest carry on.
9. **The content-spec changes** in section 5.7 are accepted. The home-base session folds them into the content spec.
10. **The new foes and their names** are accepted.

**Decided in build step 7a, for your review:**
1. **Foe Health from level 50** steps up ×1.5, rising to ×2 at 100 (section 3.1).
2. **The cliff past Region I** is reported, not forced: most later walls move 5–15 points a level (section 5.6 and the PR's report). Making levels matter more there needs steeper hero growth per level.
3. **The Mourner's Dirge** gives +15% damage, not +30%, now that it works.
4. **Who joins the recruit board, and when:** as the home base built it, each class joins when its region opens: the Barber-Surgeon and the Bellringer when the Sexton falls, the Duellist and the Cutpurse when the Drowned Bishop falls, and the Alchemist when the Antlered One falls. The boss's first clear lists them.
5. **Tactician II** is the home base's Tactician at level 3 (Lesson II), and it now brings the Gather action too. The Move action comes with Tactician I at 1-11.
6. **The region's buildings** come with the boss before it: the Masters' Hall and Shrine with the Sexton, the Whetstone and Ossuary with the Drowned Bishop, and the Hexing Stone and Bell Tower with the Antlered One. A save past the Sexton gets the first two when it loads.
7. **Skills tuned from section 4.3:** Toll 0.25× (from 0.5×) and 30 mana, and it pushes each turn back 20%; the Drowned Hymn heals 0.8×; Burst 0.8×; Pack Tear 0.8×, +15% per other wolf; Gallows Drop 1.2×; Siege Shot 2.4×; Kiln Blast 1.3×; Rite of Ash heals 0.5×; the Herald's Doom ticks 0.45×; the Kingsguard's Halberd 1.3×; the Old Growth heals 1.5% a turn; Drain the Font heals 1.2% of its health per 10 mana; the Court of Shades calls one shade at a time, in the Hollow King's first phase only (his second swaps it for Snuff the Light); Long Live the King Dooms at 0.2× a tick.
8. **Formations:** some rich and late stages field 5 foes, not 6, and Region I's undead lead the Drowned Chapel's front row at first.

## Appendix A: notes for the build

- **Foe data:** `FOES[id]` keeps its level-1 stats and adds:
  - `res`: Stun, Move, Bleed, Blight, Curse and Debuff.
  - `rank`: normal, elite or boss.
  - `phases`: a list of `{ below, rules?, skills?, callout }`.
  - `art`: template, palette and accessory, plus `intro` and `death` lines.
- **Foe stats:** a `foeStats(foe, level)` function applies section 3.1's factors. Defense needs the attacker's level anyway, because K = 20 + that level.
- **Stage data:** `{ id, region, name, kind: 'road'|'elite'|'boss', level, party, foes: [6 slots, each a key or { key, level }], tier, first: [unlock ids], hint }`.
- **New engine behaviour:**
  - Waiting and stepping up (section 3.3).
  - Foe summons for Call the Swarm, the Wild Hunt, Summon the Court and Court of Shades, sharing the thrall slots. Summoned foes drop no spoils.
  - Boss phases: once below a share of health, swap rules or skill numbers, with a callout event.
  - A charged attack with two Marked targets, for Two Graves.
  - Fleeing, for the Cage Mimic: a `flee` event, with no rewards.
  - For Regions II–V: starting Hidden, forced row changes (Lure, Reorder the Court) resisted by Move, Retaliating on foes, mana drain, regeneration each turn, and splash damage.
  - Foe rules may name any condition, locked or not.
  - Hero classes need a `healer` tag (Pilgrim, Barber-Surgeon) for foes that use "Foe: healer".
- **Wandering foes:** rolled from the battle's seed at the start of a replay.
- **Fatigue:** +1 for each turn a hero takes, counted from the battle log at the end of the battle (section 5.8).
- **Save:** add the road settings and each stage's chosen rule set (section 7.6).
- **Balance test:** give `tools/simtest.js` a reference-party mode (section 5.6) that reports every stage against its target. It can also compute each stage's recommended level as the lowest hero level that meets the target.

## Appendix B: the scratch balance check

- **What it is:** the step-1 engine, `js/sim.js` on main, run headless. 150 battles per stage for each of three recruit orders, led by the Sellsword, the Pilgrim and the Hexblade, with the others following.
- **Heroes:**
  - The content spec's level-1 averages and growth.
  - Each level's stat point split between Health and Power (the Warden: Health and Defense).
  - A Common weapon from level 1 and Common medium armour from level 3, both scaled by item level as the content spec proposes.
  - The starter skill gaining a level every 5 levels, starter rules, and from 1-3, 2 Healing Draughts each battle with the draught rule at 30% (step 2's default). That's generous, since the Bag won't refill every battle.
  - Defense's K set to 20 plus the stage level.
- **Foes:** as sections 3 and 4.
- **Not modelled:** resistances, stepping up (waiting foes hold back while their front row is full, but never move forward), summons, phases, two-target charges, skill points spent on tier-1 skills, and Fine gear.
- **What it found:**
  - Step-1 foe stats with hero-like growth lose every Region I stage to a level-matched party, which led to section 3.1's growth.
  - Killing small foes first beats focusing an elite. The Rat King's exception is by design: the step-1 engine has no summons, so it isn't measured.
  - "Foe: charging → Guard" on a Warden lifts the boss by about 20 points.
  - With Health that starts gentle and steepens, road battles at the recommended level run 3–11 rounds and the walls 13–17, which sets what each stage costs in fatigue (section 5.8).
- **The scripts** are in the shared notes folder, under `campaign-balance/`, outside the repo, for whoever builds step 6.
