# Lantern Road: Content Spec

Draft 4 for review, 2026-11-03. It follows `docs/design.md`, which stays the source of truth, plus your answers to drafts 1 to 3. It covers the content for build steps 2–4: rules, characters and equipment. Nothing here is built yet, except where it says step 2 already built it.

## 1. How to read this

- Every number is a starting value to adjust in play-testing. A table whose heading carries *(tune)* means every number in it; a number in running text carries its own mark.
- Where a decision is still open, this spec proposes an answer and lists it in section 8.
- Numbers use the same scale as the battle engine (`js/sim.js`), so they can go straight into data tables.

### What changed in draft 4
- **All 12 classes** now have three build paths, with one skill per path in every tier, keystones and builds to try: 28 skills each, 336 in all.
- **Thralls** are limited to 2 at once, and the Gravecaller's Legion keystone lifts the limit.
- **Resistances have no floor.** A landing chance of 0% or less never lands, and 100% or more always does.

Earlier drafts:
- **Draft 3** brought the three-path trees (first for four classes), resistances in place of boss immunity, and reach skills that work from the back row.
- **Draft 2** brought 12 classes, the level-200 progression with thresholds, class combining and awakenings, passive skills that need no slot, and Bleeding that stacks without limit.

## 2. Shared rules

### Stat scale *(tune)*
| Stat | What it does |
|---|---|
| Health | Knocked out at 0. Health and mana reset before each battle. |
| Mana | Pays for active skills. Battles start at half mana, and each basic attack restores the class's mana gain (10–12). |
| Power | Sets damage, healing and the strength of effects such as Doom ticks and Wards. |
| Defense | Damage taken is multiplied by K ÷ (K + Defense), where K is 20 plus the attacker's level. The same Defense is worth less against stronger foes, so tanks never become unhittable at high level. |
| Speed | Speed 10 acts once per round. Speed 12 acts 20% more often. |
| Crit | Percent chance for a hit to deal ×1.6 damage. |
| Dodge | Percent chance for a hit to miss. A dodged hit deals nothing and applies nothing. |

Damage = Power × the skill's multiplier × the Defense factor, with a ±8% spread. "1.4×" in a skill means 1.4 × the user's Power.

### Levels, stat points and skill points
- **Level cap 200** to start. A later raise would continue the same pattern of thresholds.
- **Every level** brings the class's automatic growth plus **1 stat point**.
- **Every fifth level** brings **1 skill point**, so 40 by level 200.

| One stat point buys *(tune)* | |
|---|---|
| Health | +10 |
| Mana | +5 |
| Power | +1 |
| Defense | +1 |
| Speed | +0.2, up to 25 points |
| Crit | +1%, up to 25 points |
| Dodge | +1%, up to 25 points |
| A resistance | +1% to one of the six (section 3), up to 25 points each |
| A rule slot | 5, 10, 15, 20 and 25 points for slots 2 to 6 *(still open)* |

### Skills
- **Active skills** fire when a rule calls them, and a character can only use the actives they have equipped.
- **Passive skills** are always on once learned and never need a slot.
- **Skill levels 1 to 5.** Learning a skill (level 1) costs 1 skill point, and each level after that costs 1 more, so a skill costs 5 points to max. A recruit knows their starter skill at level 1 for free. "1.4× → 2.0×" in a skill means its value at level 1 and at level 5, rising evenly in between.
- **Awakening:** a level-5 skill can be awakened for 5 more skill points if the character has an awakening open (see thresholds below). It keeps its level-5 numbers and gains the awakened effect.
- **Equipped active slots:** 1 to start, +1 at level 50, +1 at level 200, and up to 2 more from the Masters' Hall. That makes 5 at most.

### Level thresholds
At levels 30, 50, 80, 100, 120, 150, 180 and 200 a character gets a **free respec**, refunding all skill and stat points, and makes one **threshold choice**:

| Level | Threshold choice |
|---|---|
| 30 | Open the next tier of a tree |
| 50 | The next tier, or combine with a second class |
| 80 | The next tier |
| 100, 120, 150, 180 | The next tier, or an awakening |
| 200 | The next tier, an awakening, or combine with a third class |

- **Tiers:** each class tree has 9 tiers. Tier 1 is open from level 1, and each threshold choice opens the next tier of one tree. A single-class character who never awakens opens all 9 by level 200.
- **Combining classes:** the new class's tier 1 opens and its starter skill is learned free. From then on each threshold can open the next tier of any of the character's trees. Skill points are one pool shared by all of them.
- **Combined characters** keep their first class's stats, growth, resistances and basic attack, and can use every one of their classes' weapon types. Their rule-slot maximum is still open.
- **Awakenings:** at each threshold that offers one, the character may awaken one skill instead of opening a tier.
- Outside thresholds, a respec costs gold at the Shrine *(tune)*.

### The Masters' Hall
A home-base building where a master teaches a character to use one more active skill. The character is away while they train. Placeholder until you settle it: two lessons at most, 8 hours for the first from level 20, and 24 hours for the second from level 100 *(tune)*.

### Recruits
- A recruit's level-1 stats roll within their class's ranges. Growth per level is fixed by class.
- Recruit-board upgrades bring recruits who start at higher levels, with stats and skills to match. How their points arrive (spent or unspent) is still open.
- Every recruit knows their basic attack and starter skill, carries a Common weapon of their type and comes with the class's starter rules.

### Shapes, range and rows
- **Shapes** are the design's eight: one foe, front row, back row, 3 random foes, all foes, one ally, all allies and self.
- **Range** is melee, ranged or magic. Melee must hit the front row while anyone stands there. Ranged and magic reach anyone. A melee skill with **reach** can be used from either row and hits any row.
- A front-row or back-row skill hits the other row when its own row is empty.
- **Melee from the back row:** melee skills without reach can't be used from the back row without the Halberdier's Hook accessory. A character stuck there with no other options Defends instead.
- **Charged skills:** the user spends a turn gathering and Marks its target, and the hit lands on its next turn. Foes do this already; the Crossbowman's Heavy Draw is the hero version.
- **Summons:** the Gravecaller raises thralls into empty party slots. A thrall fights for the party and blocks the front row like anyone else, but it isn't a character: rules ignore it, it builds no fatigue, and it's gone when the battle ends.

## 3. Status effects

- **Durations** count the owner's own turns. Damage and healing over time tick at the start of the owner's turn. Other statuses count down at the end of the owner's turn, skipping the turn they were applied. "Until its next turn" ends when that turn starts.
- **Re-applying** a status keeps the longer duration and the stronger value. Bleeding is the exception: every application adds a new stack.
- **Tick strength** is fixed when a status is applied, from the applier's Power at that moment, so Kindled Power counts.
- **Resistances** decide whether a harmful status lands (below). Bosses resist more often than other foes.
- **Healing never removes a harmful status.** Only cleansing skills do. The main ones:
  - **Pilgrim:** Purify removes them all from one ally.
  - **Barber-Surgeon:** Stitch stops Bleeding. Tonic removes one status. Clean the Wound clears Bleeding, Poisoned and Festering from every ally. Grand Rounds clears everything from every ally.
  - **Bellringer:** Wake clears Stunned, Slowed and Confused.
  - **Party item:** the Bitter Tincture removes them all.

### Resistances *(tune)*
Every character and every foe has six resistances, one for each kind of harmful effect:

| Resistance | What it resists |
|---|---|
| Stun | Stunned, Confused, and having a charge broken |
| Move | Push-backs on the turn strip, swaps and forced row changes |
| Bleed | Bleeding |
| Blight | Poisoned and Burning |
| Curse | Doomed and Festering |
| Debuff | Weak, Exposed, Corroded, Slowed, Dazzled, Silenced, Taunted and Quarry |

- **Landing chance** = the skill's chance (100% unless it says otherwise) + the attacker's bonus from passives and gear − the target's resistance.
  - 0% or less never lands, and 100% or more always lands. There's no floor and no cap in between.
  - So a resistance at or above an effect's chance makes the target immune to it, and a big enough bonus makes an effect certain.
  - Each Bleeding stack and each push-back rolls on its own. A resisted effect shows "Resist" over the target.
- **Damage always lands.** Resistance only stops the effect that comes with a hit.
- **Helpful statuses** always land on allies.
- **Characters** start with their class's resistances (listed with each class), gain +0.1% to each per level, and can raise them with gear and stat points. Built far enough, that's immunity too: at 100% Stun resistance, a plain 100% stun never lands.
- **Foes** get resistances in the foe tables (step 6). As a guide, before family shifts: normal foes 10–40%, elites 30–60%, bosses 50–90%. Families shift them:

| Family | Typical shift |
|---|---|
| Undead | Bleed +40%, Blight +20%: old corpses barely bleed |
| Spirit | Bleed +60%, Move +40%, Curse −20% |
| Beast | Bleed −10%, Stun −10% |

So a Bleed build struggles in the undead-heavy Gravefields, and curses work best on the Hollow Throne's spirits. Where a family shift takes a resistance to 100% or more, that foe is immune to that kind: a spirit boss, for example, can't bleed. Everywhere else, keep foe resistances below 100%, so an effect against a boss is unlikely but still possible.

### Harmful *(tune)*
| Status | Effect | Main sources |
|---|---|---|
| Bleeding | Loses health at the start of each turn. Stacks without limit: each application adds a stack with its own damage and duration. | Rend, Barbed Bolt, Shrapnel Jar, Serrated Edge, Grave Rats |
| Doomed | A curse: one heavy tick per turn. Doesn't stack. Some Hexblade skills detonate it or spread it. | Doom, Hex Swarm, Contagion, Hexward |
| Burning | Loses health at the start of each turn. Doesn't stack, except with the Alchemist's Wildfire. Fire skills hit Burning targets harder, and some spread the fire. | Firebomb, Fire Flask, Clinging Fire, Great Work, Ashen Keep foes |
| Poisoned | Loses health at the start of each turn, and each tick is 25% stronger than the last. Doesn't stack. | Envenom, Fan of Knives, Coated Blades, Rot Bloom |
| Dazzled | 40% of its attacks miss. Hits that can't miss are unaffected. | Dazzle, Harsh Light, Blinding Powder, Grave Dirt |
| Weak | Deals 25% less damage. | Wither, Disarm, Adrenaline (afterwards) |
| Exposed | Takes 25% more damage and can't dodge. | Searchlight, Feint, Reckless Swing (on self) |
| Corroded | Defense −30%. | Acid Flask, Caustic Cloud |
| Slowed | Speed −30%. | Pinning Shot, Caltrops, Ringing Ears, Curfew Bell |
| Silenced | Can only use its basic attack. A charge it already started still lands. | Hush, Bone Cage |
| Stunned | Loses its next turn. A charge it's gathering waits a turn. | Knell, The Great Bell, Rebuke, foes from Region III |
| Confused | Its next single-target attack picks a random target from everyone on the field, its own side included. | Discord |
| Festering | Healing it receives is halved. | Wither, awakened Rend |
| Taunted | Must aim its single-target attacks at the taunter, whenever it can reach them. | Challenge |
| Quarry | Every attacker gets +20% crit chance against it. | Mark Quarry |
| Charging | Gathering a big attack that lands on its next turn. Shield Toss breaks it. | Dig, Baptism, Heavy Draw |
| Marked | Picked as the target of a charging attack. | Any charge |

### Helpful *(tune)*
The Lamplighter's Snuff and the Alchemist's Transmute strip these from foes, and foes in later regions use them too.

| Status | Effect | Main sources |
|---|---|---|
| Guarding | Takes every single-target attack aimed at an ally, at −30% damage, until its next turn. | Guard |
| Covered | The covering Warden takes every attack aimed at this ally, area hits included, at −30% damage. | Cover |
| Kindled | Deals 30% more damage. | Kindle, Adrenaline |
| Hasted | Speed +30%. | Haste, Adrenaline |
| Warded | Absorbs damage up to an amount set when given, then breaks. Lasts up to 3 turns. Absorbed damage builds no fatigue. | Shelter, Sanctuary |
| Blessed | Heals at the start of each turn. | Benediction |
| Braced | Takes less damage: 30% from Defend, 40% from Brace. | Defend, Brace |
| Fortified | Takes 20% less damage. | Stand Fast, Vesper Chime, Splint |
| Veiled | Dodge +20%. | Smoke Pot |
| Hidden | Can't be targeted by single-target attacks, though area attacks still hit, and a charged attack aimed at it misses. Ends when it attacks, unless a skill says otherwise. | Vanish, Smoke and Mirrors |
| Parrying | The next few single-target attacks against it miss, as many as the skill says. | Parry |
| Riposte | Counters each melee attacker and takes 20% less damage. | Riposte |
| Retaliating | Each foe that damages it takes damage back. | Retaliate |
| Unbroken | Can't fall below 1 health. | Unbroken, Last Bastion |
| Hexward | Each foe that hits it becomes Doomed. | Hex Ward |

## 4. Classes

### Overview *(tune)*
| Class | Role | Usual row | Weapon type | Rule slots (start → max) | Basic attack | Starter skill |
|---|---|---|---|---|---|---|
| Sellsword | Front-row damage | Front | Swords | 2 → 4 | Strike | Cleave |
| Hexblade | Curses and damage over time | Back, or front with Blade-Hex | Cursed blades | 2 → 5 | Hex Bolt | Doom |
| Pilgrim | Healer: restoring | Back | Censers | 2 → 6 | Smite | Mend |
| Warden | Tank: soaking hits | Front | Mace and shield | 2 → 5 | Mace | Guard |
| Lamplighter | Support: buffs and speed | Back | Lanterns | 1 → 6 | Flare | Kindle |
| Crossbowman | Back-row ranged damage | Back | Crossbows | 1 → 5 | Bolt | Aimed Shot |
| Duellist | Tank: dodging and countering | Front | Rapiers | 2 → 5 | Thrust | Challenge |
| Alchemist | Area damage and items | Back | Flasks | 1 → 5 | Vial Toss | Firebomb |
| Barber-Surgeon | Healer: cleansing and fatigue | Back | Bonesaws | 2 → 6 | Lancet Throw | Stitch |
| Bellringer | Control: delays, slows and stuns | Back | Handbells | 1 → 6 | Clang | Toll |
| Gravecaller | Summoner | Back | Bone staves | 1 → 5 | Grave Bolt | Raise Thrall |
| Cutpurse | Assassin and thief | Back | Daggers | 2 → 5 | Throwing Knife | Backstab |

- **Sellsword:** fights for the kill. The best single-target melee damage, with bleeds and reach, and more dangerous when hurt.
- **Hexblade:** wins slowly. Lays Doom, spreads it, detonates it, and takes apart foe healers and casters.
- **Pilgrim:** keeps everyone standing. Heals, wards, raises the fallen and burns the undead.
- **Warden:** the wall. Takes the hits meant for others and punishes whoever swings at it.
- **Lamplighter:** makes the party hit harder and act sooner, and blinds the dark.
- **Crossbowman:** the marksman. Picks off any foe in any row and sets up crits for everyone.
- **Duellist:** tanks by not being hit. Taunts foes into attacking, dodges and answers every miss with a counter.
- **Alchemist:** throws fire and acid at whole rows, and makes the party's items go further.
- **Barber-Surgeon:** the field doctor. Stops bleeding, cures afflictions, patches the worst wounds at a price and sends the party out fresher.
- **Bellringer:** rings the hours. Pushes foes' turns back, slows them, stuns them and confuses them, while chimes steady the party.
- **Gravecaller:** raises bone thralls into empty party slots, then spends them: as shields, as healing or as explosions.
- **Cutpurse:** strikes from hiding, stabs the foes nobody else can reach, poisons them, and steals gold and loot.

**Class availability.** The first pick stays Sellsword, Hexblade or Pilgrim, and the six original classes appear on the recruit board from the start. The new six join the board as the campaign goes: the Gravecaller after the Sexton, the Barber-Surgeon and Bellringer in Region II, the Duellist and Cutpurse in Region III, and the Alchemist in Region IV.

### How the classes combine
| Classes | The combination | A rule that sets it up |
|---|---|---|
| Warden + Hexblade | Hex Ward on a Guarding Warden: every foe that swings at the party ends up Doomed. | Hexblade: "Ally: has Guarding → Hex Ward" |
| Lamplighter + Hexblade | Kindle before Doom. Tick strength is fixed when Doom lands, so a Kindled Doom keeps +30% on every tick. | Hexblade: "Self: has Kindled → Doom" |
| Lamplighter + Crossbowman | Heavy Draw, then Light the Way on the Crossbowman: the charged shot lands almost at once. | Lamplighter: "Ally: has Charging → Light the Way" |
| Crossbowman + Sellsword | Mark Quarry on a big foe, then Headsman's Swing or Reckless Swing for the crit. | Sellsword: "Foe: has Quarry → Reckless Swing" |
| Sellsword + Hexblade | Bloodcurse: Doom ticks harder on Bleeding foes, so every Rend feeds the Hexblade. | Hexblade: "Foe: has Bleeding → Doom" |
| Pilgrim + Warden | Shelter on the Warden while it Guards. Warded damage builds no fatigue, so the party pushes further. | Pilgrim: "Ally: has Guarding → Shelter" |
| Duellist + Alchemist | Smoke Pot on a taunting Duellist: +20% Dodge on top of theirs means more misses, and every miss is a counter. | Alchemist: "Ally: has Riposte → Smoke Pot" |
| Bellringer + Cutpurse | Stunned and Slowed foes take more from the Cutpurse's Opportunist passive. | Cutpurse: "Foe: has Stunned → Ambush" |
| Bellringer + Crossbowman | Toll pushes every foe back, so Heavy Draw lands before they act. | Bellringer: "Ally: has Charging → Toll" |
| Gravecaller + Sellsword | Every kill leaves a corpse, and Corpse Blast turns it into damage on every foe. | Gravecaller: "3 or more foes present → Corpse Blast" |
| Gravecaller + Warden | Thralls fill the empty front slot, so the Warden's Guard covers the whole back row with nobody else exposed. | Gravecaller: "Self: fewer than 1 thrall → Raise Thrall" |
| Barber-Surgeon + Sellsword | Adrenaline on the Sellsword: Hasted and Kindled for a kill chain, paid for afterwards. | Barber-Surgeon: "Ally: highest Power → Adrenaline" |
| Alchemist + Hexblade | Burning, Corroded and Doomed on one foe trips the Hexblade's Unmaking passive. | Alchemist: "Foe: has Doomed → Acid Flask" |
| Lamplighter + Cutpurse | Light the Way on a Hidden Cutpurse: Ambush lands before the foe can act. | Lamplighter: "Ally: has Hidden → Light the Way" |

### Combined characters
Some pairings for one character who combines classes at level 50, with the first class listed first:

| Character | What it becomes |
|---|---|
| Warden + Pilgrim | A tank that heals itself and raises the fallen from the front row. |
| Hexblade + Alchemist | A walking plague: Doom, Burning and Corroded from a single character. |
| Crossbowman + Cutpurse | A hidden sniper who shoots from cover and steals from what falls. |
| Lamplighter + Bellringer | A timekeeper: allies act sooner and foes act later. |
| Sellsword + Duellist | A counter-punching bruiser who taunts, parries and executes. |
| Pilgrim + Barber-Surgeon | The complete healer: heals, raises and cleanses everything. |

### Answers to a charging foe
"Foe: charging a big attack" is the condition most worth unlocking early, and every class has an answer to it:

| Class | Answer |
|---|---|
| Warden | Shield Toss tries to break the charge, though bosses resist more often. Cover or Guard takes the hit for the Marked ally. |
| Duellist | Parry: a Marked Duellist simply dodges the hit. Challenge, used before the charge, makes the Duellist the target. |
| Lamplighter | Dazzle gives the hit a 40% chance to miss. Light the Way lets a damage dealer kill the charger first. |
| Bellringer | Knell tries to stun the charger, so the hit lands a turn later. Bosses resist more often. |
| Pilgrim | Shelter on the Marked ally absorbs the hit. |
| Barber-Surgeon | Splint on the Marked ally cuts the hit by 20%. |
| Hexblade | Wither makes the charger Weak, cutting the hit by 25%. |
| Alchemist | Smoke Pot: every ally gets +20% Dodge. |
| Gravecaller | A Bone Wall thrall Guards and takes the hit itself. |
| Cutpurse | Vanish: a charged hit on a Hidden target misses. |
| Sellsword | Lunge or Finishing Blow kills the charger before it lands. |
| Crossbowman | Pinning Shot pushes the charger's next turn back. |

### Party sketches
| Party | Front | Back | How it wins, and where it fails |
|---|---|---|---|
| The Lantern Wall | Warden, Sellsword | Pilgrim, Lamplighter, Hexblade, Crossbowman | Balanced. The Warden soaks, the Lamplighter kindles, and the damage dealers finish what Doom starts. |
| Slow Death | Warden, Hexblade (Blade-Hex) | Hexblade, Pilgrim, Barber-Surgeon, Bellringer | Everything is Doomed and delayed, and two healers outlast it. Little burst, so enrage is the risk. |
| Firing Line | Sellsword, Duellist | Crossbowman, Cutpurse, Lamplighter, Pilgrim | Fast kills with Kindle and crits. Fragile, so it builds fatigue quickly. |
| Bone and Bell | Warden, a thrall | Gravecaller, Bellringer, Alchemist, Barber-Surgeon | Five characters and a thrall. Foes are delayed and burned while the thrall soaks; weak against single tough bosses. |

### How to read a class
- **Stats:** a recruit's level-1 range, the average growth per level and the average at level 200, plus the class's starting resistances.
- **Skill tree:** three build paths, each with one skill in every tier, plus the starter skill at the root: 28 skills in all. Opening a tier (section 2) opens all three of its skills at once.
- **Paths are a guide, not a lock.** A character can learn from any path, and many good builds mix two, or add a second class's path at level 50.
- **Keystones** (★) are build-defining passives with a real cost, in the spirit of Darkest Dungeon's trinkets.
- **Builds to try** close each rebuilt class: a few starting points, including mixes and combinations.
- **Every class** uses this shape: 336 skills across the twelve.
- **"a → b"** is a skill's value at level 1 and at level 5. **Awakened** is what the skill gains when awakened.
- **Mana** is an active skill's cost. Passive skills cost nothing and need no slot.
- "Not self" marks a one-ally skill that can't target its user.

### Sellsword
*Front row · swords · mana gain 10 · rule slots 2 → 4*

A mercenary who fights for the kill. Hits single targets harder than anyone in melee, opens bleeds and reaches into the back row, and grows more dangerous as they get hurt.

#### Stats *(tune)*
| Stat | Recruit range (level 1) | Growth per level | Level 200 average |
|---|---|---|---|
| Health | 122–148 | +9 | 1,926 |
| Mana | 27–33 | +1 | 229 |
| Power | 18–22 | +1.3 | 279 |
| Defense | 5–7 | +0.35 | 76 |
| Speed | 9–11 | +0.02 | 14 |
| Crit | 8–12% | +0.06 | 22% |
| Dodge | 3–7% | +0.03 | 11% |

**Resistances at level 1** *(tune)*: Stun 30% · Move 30% · Bleed 25% · Blight 20% · Curse 15% · Debuff 25%.

**Basic attack:** Strike. One foe, melee, 1.0×, restores 10 mana.

#### Build paths
- **Executioner:** reaches any foe, finishes the wounded and refuels on kills.
- **Bloodletter:** stacks Bleeding and cashes it in.
- **Berserker:** spends health for damage, and grows stronger the closer it comes to falling.

#### Skill tree *(tune)*
| Tier | Skill | Kind | Level 1 → 5 | Awakened |
|---|---|---|---|---|
| 1 | Cleave (starter) | Active · front row, melee · 15 | 0.8× → 1.1× to each foe hit | Each foe hit also Bleeds (2 turns, 0.2×) |

**Executioner**
| Tier | Skill | Kind | Level 1 → 5 | Awakened |
|---|---|---|---|---|
| 1 | Lunge | Active · one foe, melee with reach · 20 | 1.4× → 1.9× | On a kill, the Sellsword's next turn comes 50% sooner |
| 2 | Bounty Hunter | Passive | On a kill, restore 6 → 20 mana | Also heals 10% of max health on a kill |
| 3 | Finishing Blow | Active · one foe, melee · 20 | 1.0×, doubled against foes below 35% → 45% health. Refunds its mana on a kill. | On a kill, strikes again at once at the lowest-health foe |
| 4 | Cutthroat | Passive | +5% → +15% crit chance against foes below 50% health | Those crits deal ×2.0 |
| 5 | Drag Out | Active · one foe, melee with reach · 20 | 0.6× → 0.9×. A back-row target swaps places with the nearest front-row foe. | The dragged foe is Exposed for 2 turns |
| 6 | Marked for Death ★ | Keystone | The first foe the Sellsword hits each battle takes +20% → +40% damage from them until it falls, but every other foe takes 10% less | When the marked foe falls, the mark passes to the lowest-health foe |
| 7 | Paid in Full | Passive | Each kill this battle: +4% → +8% Power, up to 5 times | Up to 10 times |
| 8 | Reaping Arc | Active · all foes, melee with reach · 35 | 1.2× → 1.6× to every foe below 40% health; the rest are untouched | Hits every foe below 60% health |
| 9 | Deathblow | Active · one foe, melee with reach · 45 | 2.5× → 3.5×. On a kill, the Sellsword takes another turn at once. | Can't miss |

**Bloodletter**
| Tier | Skill | Kind | Level 1 → 5 | Awakened |
|---|---|---|---|---|
| 1 | Rend | Active · one foe, melee · 15 | 0.9× and a Bleeding stack for 3 turns, 0.35× → 0.55× per tick | Also Festering for 2 turns |
| 2 | Open Veins | Passive | +10% → +30% damage to Bleeding foes | Bleeding foes can't dodge the Sellsword |
| 3 | Serrated Edge | Passive | Strike adds a Bleeding stack for 1 → 3 turns, 0.2× per tick | Strike adds 2 stacks |
| 4 | Flurry | Active · one foe, melee · 18 | 3 hits of 0.45× → 0.6×, each adding a Bleeding stack (2 turns, 0.15×) | 5 hits |
| 5 | Haemophage ★ | Keystone | Bleeding stacks the Sellsword applies last until the battle ends, but tick at 40% → 60% strength | They tick at full strength |
| 6 | Haemorrhage | Active · one foe, melee · 25 | 0.6×, then every Bleeding stack on the target ticks at once, at 60% → 100%. The stacks stay. | Then adds 2 more stacks |
| 7 | Red Harvest | Passive | Bleeding the Sellsword causes heals them for 20% → 50% of its damage | Healing beyond full goes to the most hurt ally |
| 8 | Crimson Spray | Active · front row, melee · 30 | 0.6× → 0.85× to each, and 2 Bleeding stacks (2 turns, 0.2×) | Those foes are also Slowed for 1 turn |
| 9 | Headsman's Swing | Active · one foe, melee · 40 | 3.0× → 4.0×, plus 25% for each Bleeding stack on the target | Can't miss and ignores Guarding |

**Berserker**
| Tier | Skill | Kind | Level 1 → 5 | Awakened |
|---|---|---|---|---|
| 1 | Reckless Swing | Active · one foe, melee · 10 | 2.2× → 2.8×, but the Sellsword is Exposed until its next turn | Not Exposed if the swing kills |
| 2 | Thick Hide | Passive | +5% → +15% max health | Also +10% Defense |
| 3 | Bloodlust | Active · self · 20 | Hasted and +20% → +40% damage for 2 turns. Costs 10% of max health. | Each kill adds a turn |
| 4 | Desperado | Passive | Below 40% health: +15% → +35% damage | Also +15% Dodge below 40% health |
| 5 | Second Wind | Passive | Once per battle, dropping below 25% health heals 15% → 35% of max health | Also clears the Sellsword's harmful statuses and Hastes them for 2 turns |
| 6 | Wild Swings | Active · 3 random foes, melee · 20 | Three swings of 0.7× → 0.95× at random foes in reach, +50% while the Sellsword is below 50% health | Five swings |
| 7 | Blood Frenzy ★ | Keystone | The Sellsword can't be healed above 50% health, but deals +20% → +40% damage and heals for 10% of the damage it deals | Can be healed up to 70% |
| 8 | Grit | Active · self · 20 | Heals 15% → 30% of missing health and Braces for 1 turn | Also Unbroken for 1 turn |
| 9 | Rampage | Active · one foe, melee · 40 | 4 hits of 0.6× → 0.8×, plus 1 more hit for every 20% of health missing | Each hit picks a random foe in reach |

#### Builds to try
- **Headsman** (Executioner): Lunge, Finishing Blow, Cutthroat, Paid in Full. Rule: "Foe: health below 35% → Finishing Blow". Best behind a Crossbowman's Mark Quarry.
- **Red Tide** (Bloodletter): Rend, Haemophage, Haemorrhage, Headsman's Swing. Combine with the Hexblade at 50 for Bloodcurse. Struggles in the Gravefields, where the undead resist Bleed.
- **Last Stand** (Berserker): Reckless Swing, Blood Frenzy, Desperado, Rampage. A Pilgrim's Shelter still works under Blood Frenzy, because a Ward absorbs damage rather than healing it.
- **Bleed and finish** (two paths): Rend and Open Veins to soften, Finishing Blow to end it.

**Starter rules:** 1. Front foe → Cleave. 2. Foe: lowest health → Strike.

**Later rules:** "Foe: health below 35% → Finishing Blow". "Foe: healer → Drag Out". "Self: health above 75% → Reckless Swing". "Boss present → Headsman's Swing".

### Hexblade
*Back row, or front with Blade-Hex · cursed blades · mana gain 12 · rule slots 2 → 5*

A cursed duellist who wins slowly. Lays Doom, spreads it across the foe line and detonates it, takes apart healers and casters, or wades into the front row and drinks the life out of what it cuts. Strongest in long fights and against tough single foes.

#### Stats *(tune)*
| Stat | Recruit range (level 1) | Growth per level | Level 200 average |
|---|---|---|---|
| Health | 90–110 | +6.5 | 1,394 |
| Mana | 36–44 | +1.5 | 339 |
| Power | 16–20 | +1.2 | 257 |
| Defense | 3–5 | +0.25 | 54 |
| Speed | 10–12 | +0.02 | 15 |
| Crit | 6–10% | +0.04 | 16% |
| Dodge | 6–10% | +0.03 | 14% |

**Resistances at level 1** *(tune)*: Stun 20% · Move 15% · Bleed 20% · Blight 30% · Curse 50% · Debuff 30%.

**Basic attack:** Hex Bolt. One foe, magic, 0.9×, restores 12 mana. With the Blade-Hex passive in the front row, it becomes Cursed Edge: one foe, melee, 1.2× and Doomed (1 turn, 0.4×).

#### Build paths
- **Malediction:** lays Doom on everything, spreads it and detonates it.
- **Withering:** stacks harmful statuses to cripple foes and make everyone's hits land harder.
- **Blood-hex:** fights in the front row, draining life and paying for skills with blood.

#### Skill tree *(tune)*
| Tier | Skill | Kind | Level 1 → 5 | Awakened |
|---|---|---|---|---|
| 1 | Doom (starter) | Active · one foe, magic · 15 | 0.4× and Doomed for 3 turns, 0.65× → 0.9× per tick | Doom lasts 5 turns |

**Malediction**
| Tier | Skill | Kind | Level 1 → 5 | Awakened |
|---|---|---|---|---|
| 1 | Hex Swarm | Active · 3 random foes, magic · 20 | 0.6× and Doomed for 2 turns, 0.3× → 0.45× per tick | Hits 5 random foes |
| 2 | Deep Curse | Passive | Doom deals +10% → +30% | Doom ticks can crit |
| 3 | Reap | Active · one foe, magic · 20 | 0.6×, then all of the target's remaining Doom ticks land at once, at 100% → 140% | Refunds its mana on a kill |
| 4 | Lingering Hex | Passive | Harmful statuses the Hexblade applies last 1 → 2 turns longer | Their ticks are also 10% stronger |
| 5 | Contagion | Active · all foes, magic · 25 | Needs a Doomed foe. Copies the strongest Doom onto every other foe, with 50% → 100% of its remaining turns. | Copies are also Festering for 2 turns |
| 6 | Plague Bearer ★ | Keystone | Each Doom tick has a 15% → 35% chance to spread a copy to the foe beside it, but the Hexblade's direct damage is 25% lower | Spread copies start at full length |
| 7 | Eternal Doom | Passive | When a Doomed foe falls, its Doom jumps to the nearest foe with 50% → 100% of its remaining turns | The jumped Doom starts again at full length |
| 8 | Malefic Burst | Active · all foes, magic · 35 | Every Doomed foe takes its remaining Doom at once, at 40% → 70%. The Doom stays. | Each Doom also gains a turn |
| 9 | Requiem of Ruin | Active · all foes, magic · 50 | Every foe is Doomed for 3 turns, 0.5× → 0.8× per tick, and Weak for 2 turns | That Doom can't be cleansed |

**Withering**
| Tier | Skill | Kind | Level 1 → 5 | Awakened |
|---|---|---|---|---|
| 1 | Wither | Active · one foe, magic · 15 | Weak (−25% → −35%) and Festering for 3 turns | Also Silenced for 1 turn |
| 2 | Enfeeble | Passive | Weak from the Hexblade cuts another 5% → 15% of the foe's damage | Weak foes can't crit |
| 3 | Hush | Active · one foe, magic · 20 | 0.5× and Silenced for 2 → 3 turns | Also drains 20 of the target's mana into the Hexblade |
| 4 | Evil Eye | Active · one foe, magic · 15 | Exposed for 2 → 3 turns, and the Hexblade's next skill on that foe costs no mana | Also Slowed for 1 turn |
| 5 | Unmaking | Passive | Foes with 3 or more harmful statuses take +10% → +25% damage from every source | Needs only 2 statuses |
| 6 | Hex Ward | Active · one ally · 20 | Hexward for 2 → 3 turns: each foe that hits that ally is Doomed (2 turns, 0.5×) | Attackers are also Weak for 1 turn |
| 7 | Witch's Bargain ★ | Keystone | Each harmful status the Hexblade applies brings a random second one (Weak, Exposed, Slowed or Festering), but its skills cost 30% → 15% more mana | No extra mana cost |
| 8 | Soul Rend | Active · one foe, magic · 25 | 0.5×, plus 0.2× → 0.35× for each harmful status on the target | Each Bleeding stack counts as a status |
| 9 | Unravel | Active · all foes, magic · 45 | Every harmful status on every foe lasts 2 → 3 turns longer, and each foe takes 0.2× per status | Also strips their helpful statuses |

**Blood-hex**
| Tier | Skill | Kind | Level 1 → 5 | Awakened |
|---|---|---|---|---|
| 1 | Leech | Active · one foe, magic · 15 | 0.9× → 1.2×, healing the Hexblade for 60% of the damage | Healing beyond full goes to the most hurt ally |
| 2 | Blade-Hex | Passive | In the front row, Hex Bolt becomes Cursed Edge, Dooming for 1 → 2 turns | Cursed Edge hits both front-row foes |
| 3 | Drink Deep | Passive | Heals for 10% → 30% of the Doom damage the Hexblade deals | Healing beyond full goes to the most hurt ally |
| 4 | Bloodcurse | Passive | Doom ticks +15% → +40% on Bleeding foes | +5% more for each Bleeding stack |
| 5 | Crimson Pact | Active · self · 15% of max health, no mana | Restores 30 → 50 mana and Kindles the Hexblade for 1 turn | Also Hastes them for 1 turn |
| 6 | Hexed Blood | Passive | +5% → +15% max health | Harmful statuses on the Hexblade last 1 turn less |
| 7 | Sanguine Lash | Active · front row, melee · 25 | 0.8× → 1.1× to each, Doomed for 1 turn, healing the Hexblade for 30% of the damage | Also a Bleeding stack (2 turns, 0.2×) on each |
| 8 | Blood Price ★ | Keystone | When mana runs short, skills are paid with health: 1 mana costs 1.5% → 0.7% of max health. That health loss builds fatigue. | Paying with health also Kindles the Hexblade for 1 turn |
| 9 | Exsanguinate | Active · one foe, melee with reach · 45 | 2.0× → 2.8×, plus 0.3× for each harmful status on the target, healing the Hexblade for all of it | Healing beyond full becomes a Ward on the Hexblade |

#### Builds to try
- **Pestilence** (Malediction): Hex Swarm, Contagion, Plague Bearer, Eternal Doom. A Lamplighter's Kindle before Contagion makes every copy tick harder.
- **The Unmaker** (Withering): Wither, Evil Eye, Witch's Bargain, Unmaking, Soul Rend. An Alchemist's Burning and Corroded stack the statuses even faster.
- **Bloodbound** (Blood-hex): Blade-Hex, Sanguine Lash, Blood Price, Exsanguinate, in the front row next to a Warden. Combine with the Sellsword at 50 so its own bleeds feed Bloodcurse.
- **Curse and drain** (two paths): Doom, Drink Deep and Reap. Safe and steady, and a good first build.

**Starter rules:** 1. Front foe → Doom. 2. Foe: lowest health → Hex Bolt.

**Later rules:** "Foe: without Doomed → Doom". "3 or more foes present → Hex Swarm". "Foe: healer → Hush". "Foe: boss or elite → Wither". "Ally: has Guarding → Hex Ward".

### Pilgrim
*Back row · censers · mana gain 12 · rule slots 2 → 6*

A healer who walks the road on faith. Heals and raises the fallen, prevents damage before it lands, or carries holy fire to the undead. Triage is about order, so the Pilgrim gets the most rule slots.

#### Stats *(tune)*
| Stat | Recruit range (level 1) | Growth per level | Level 200 average |
|---|---|---|---|
| Health | 95–115 | +7 | 1,498 |
| Mana | 45–55 | +2 | 448 |
| Power | 13–15 | +0.9 | 193 |
| Defense | 4–6 | +0.3 | 65 |
| Speed | 8–10 | +0.02 | 13 |
| Crit | 3–7% | +0.03 | 11% |
| Dodge | 3–7% | +0.03 | 11% |

**Resistances at level 1** *(tune)*: Stun 25% · Move 20% · Bleed 20% · Blight 30% · Curse 45% · Debuff 30%.

**Basic attack:** Smite. One foe, magic, 0.8×, restores 12 mana.

#### Build paths
- **Mercy:** direct healing, and raising the fallen.
- **Vigil:** prevents damage with Wards, cleanses, and keeps fatigue down over a long push.
- **Zeal:** holy fire against the undead, healing through the damage it deals.

#### Skill tree *(tune)*
| Tier | Skill | Kind | Level 1 → 5 | Awakened |
|---|---|---|---|---|
| 1 | Mend (starter) | Active · one ally · 15 | Heals 2.8× → 3.6×, plus 10% of the ally's max health | +50% on allies below 30% health |

**Mercy**
| Tier | Skill | Kind | Level 1 → 5 | Awakened |
|---|---|---|---|---|
| 1 | Last Rites | Active · one fallen ally · 35 | Raises them with 35% → 55% health | They rise Warded, absorbing 2× |
| 2 | Steady Hands | Passive | Healing +5% → +20% | Heals can crit, using the Pilgrim's Crit |
| 3 | Benediction | Active · one ally · 15 | Blessed for 3 turns: heals 1.0× → 1.4× at the start of each turn | Lasts 5 turns |
| 4 | Triage | Passive | Heals on allies below 30% health +15% → +40% | Works below 50% health |
| 5 | Hymn of Rest | Active · all allies · 30 | Heals each 1.2× → 1.6× | Also removes one harmful status from each ally |
| 6 | Vow of Peace ★ | Keystone | Smite becomes Prayer, which heals the most hurt ally 0.6× → 1.0× and restores 12 mana, but the Pilgrim can no longer deal damage | Prayer heals the two most hurt allies |
| 7 | Martyrdom | Active · one ally, not self · 25% of the Pilgrim's current health, no mana | Heals the ally for 2× → 3× the health paid | The Pilgrim is Blessed for 2 turns afterwards |
| 8 | Miracle | Passive | Once per battle, an ally who would fall stays standing, healed to 10% → 40% of max health, and the Pilgrim takes the next turn | Twice per battle |
| 9 | Resurrection | Active · all fallen allies · 70 | Raises every fallen ally with 30% → 50% health | They rise Blessed for 3 turns |

**Vigil**
| Tier | Skill | Kind | Level 1 → 5 | Awakened |
|---|---|---|---|---|
| 1 | Shelter | Active · one ally · 20 | Warded: absorbs up to 3× → 4.5× damage, for up to 3 turns | When the Ward breaks, the ally heals 1.0× |
| 2 | Comfort | Passive | While the Pilgrim is in the party, everyone gains 5% → 20% less fatigue | Every character also recovers 2 fatigue after each battle |
| 3 | Purify | Active · one ally · 10 | Removes all harmful statuses and heals 0.6× → 1.2× | Immune to new harmful statuses until its next turn |
| 4 | Steadfast Faith | Passive | Allies the Pilgrim Wards also take 5% → 15% less damage while Warded | The Pilgrim's Wards last a turn longer |
| 5 | Prayer of Fortitude | Active · all allies · 35 | +10% → +20% max health for the rest of the battle, healing by the same amount | Also Fortified for 2 turns |
| 6 | Peaceful Rest | Passive | Allies the Pilgrim raises lose 50% → 100% of that fall's knock-out fatigue | Last Rites costs 15 less |
| 7 | Absolution | Active · all allies · 40 | Clears Doomed, Festering and Silenced from every ally, healing each 0.4× → 0.8× | Clears every harmful status |
| 8 | Aegis of Faith ★ | Keystone | Every battle starts with every ally Warded for 1.0× → 2.0×, but the Pilgrim's healing is 20% weaker | No healing penalty |
| 9 | Sanctuary | Active · all allies · 50 | Warded (absorbs 1.5× → 2.5×) and Blessed (0.6× per turn) for 3 turns | Also raises one fallen ally with 30% health |

**Zeal**
| Tier | Skill | Kind | Level 1 → 5 | Awakened |
|---|---|---|---|---|
| 1 | Judgement | Active · one foe, magic · 15 | 1.2× → 1.6×, doubled against undead | Undead it hits are Weak for 2 turns |
| 2 | Burning Faith | Passive | Smite restores 3 → 10 more mana | Each heal the Pilgrim casts also restores 3 mana |
| 3 | Consecrated | Passive | Smite and Judgement +15% → +50% against undead | Against spirits too |
| 4 | Holy Ground | Active · all foes, magic · 30 | 0.4× → 0.6× to each, doubled against undead, and every ally heals 0.3× | Undead it hits are Slowed for 1 turn |
| 5 | Holy Fire | Passive | Smite heals the most hurt ally for 20% → 50% of its damage | Judgement does too |
| 6 | Rebuke | Active · one foe, magic · 20 | 0.8× → 1.1× and a 60% chance to Stun for 1 turn | 100% chance |
| 7 | Ardour | Passive | +0.3 → +1 Speed | The Pilgrim's first turn of each battle comes at once |
| 8 | Crusader ★ | Keystone | The Pilgrim can fight from the front row. There, Smite becomes a melee 1.2× strike that heals the most hurt ally for 30% of its damage, and the Pilgrim gains +20% → +40% max health, but its healing skills cost 50% more mana. | No extra mana cost |
| 9 | Divine Wrath | Active · all foes, magic · 55 | 1.0× → 1.4× to each, doubled against undead and spirits, and every ally heals for 20% of the damage dealt | Every foe hit is also Dazzled for 1 turn |

#### Builds to try
- **Field Saint** (Mercy): Triage, Benediction, Miracle, Resurrection. The classic healer.
- **Shepherd** (Vigil): Shelter, Comfort, Aegis of Faith, Peaceful Rest. Less healing needed and less fatigue, so the party chains more stages. Even better beside a Barber-Surgeon's House Calls.
- **Crusader** (Zeal): the Crusader keystone in the front row, with Judgement, Holy Fire and Divine Wrath. Combine with the Warden at 50 for a holy tank. Shines in the undead-heavy Gravefields and Ashen Keep.
- **Vow** (two paths): Vow of Peace with Hymn of Rest and Shelter, for a pure support that never attacks.

**Starter rules:** 1. Ally: health below 50% → Mend. 2. Foe: lowest health → Smite.

**Later rules:** "Ally: fallen → Last Rites". "2 or more allies below 60% health → Hymn of Rest". "Ally: has Doomed → Purify". "Ally: has Guarding → Shelter".

### Warden
*Front row · mace and shield · mana gain 10 · rule slots 2 → 5*

The wall. Takes the hits meant for others, outlasts what it can't stop, or makes every blow cost the foe dearly. Fatigue is measured against max health, so the Warden's huge health pool lets it carry the party's damage, and its fatigue, further than anyone.

#### Stats *(tune)*
| Stat | Recruit range (level 1) | Growth per level | Level 200 average |
|---|---|---|---|
| Health | 171–209 | +14 | 2,976 |
| Mana | 27–33 | +1 | 229 |
| Power | 13–15 | +0.8 | 173 |
| Defense | 13–15 | +0.7 | 153 |
| Speed | 7–9 | +0.01 | 10 |
| Crit | 3–7% | +0.03 | 11% |
| Dodge | 0–2% | +0.01 | 3% |

**Resistances at level 1** *(tune)*: Stun 50% · Move 60% · Bleed 30% · Blight 25% · Curse 20% · Debuff 30%.

**Basic attack:** Mace. One foe, melee, 0.9×, restores 10 mana.

#### Build paths
- **Bulwark:** shields the whole party, with Guard, Cover and walls of steel.
- **Bastion:** outlasts everything, with huge health, damage caps and refusing to fall.
- **Reprisal:** punishes every blow, with counters, thorns and shield strikes that grow with the damage it takes.

#### Skill tree *(tune)*
| Tier | Skill | Kind | Level 1 → 5 | Awakened |
|---|---|---|---|---|
| 1 | Guard (starter) | Active · self · 15 | Guarding until its next turn: takes every single-target attack aimed at an ally, at −30% → −45% damage | Guarding lasts through its next turn as well |

**Bulwark**
| Tier | Skill | Kind | Level 1 → 5 | Awakened |
|---|---|---|---|---|
| 1 | Cover | Active · one ally, not self · 10 | Covered for 2 → 3 of the Warden's turns: every attack aimed at that ally, area hits included, hits the Warden instead at −30% | Covers two allies at once |
| 2 | Shieldbearer | Passive | Each hit taken while Guarding or Covering restores 2 → 6 mana | Each one also heals 1% of max health |
| 3 | Stand Fast | Active · all allies · 25 | Fortified for 2 turns: −20% → −30% damage taken | Lasts 4 turns |
| 4 | Interpose | Passive | When an ally drops below 30% health, the Warden Covers them at once for 1 turn, 1 → 3 times per battle | No limit |
| 5 | Aegis | Passive | While the Warden is Guarding, allies take 10% → 25% less damage from area attacks | Also while Covering |
| 6 | Shield Wall | Active · all allies · 35 | Every ally is Braced (−25% → −35% damage) until the Warden's next turn | Lasts 2 of the Warden's turns |
| 7 | Oath of the Shield ★ | Keystone | Guard and Cover cost no mana, but the Warden can't attack: its basic attack becomes Hold, which Braces it for 20% → 35% and restores 10 mana | Hold also Fortifies every ally for 1 turn |
| 8 | Hold the Line | Active · all allies · 40 | For 2 → 3 turns, allies can't be pushed back, Stunned or swapped, and take 10% less damage | They're also immune to Taunted and Confused |
| 9 | Last Bastion | Active · self · 50 | For 2 turns the Warden takes every attack aimed at any ally, area hits included, at −40% → −60% damage | The Warden is also Unbroken for those turns |

**Bastion**
| Tier | Skill | Kind | Level 1 → 5 | Awakened |
|---|---|---|---|---|
| 1 | Brace | Active · self · 10 | Braced for 2 turns: −40% → −55% damage taken | Each hit taken while Braced restores 10 mana |
| 2 | Stalwart | Passive | +5% → +15% max health | Also +15% Defense |
| 3 | Plate-born | Passive | Heavy armour's Speed penalty is 1 → 2 lower | Heavy armour also gives 10% more health |
| 4 | Unbroken | Active · self · 30 | Unbroken for 2 → 3 turns: can't fall below 1 health | Also −20% damage taken |
| 5 | Iron Will | Passive | The Warden gains 10% → 35% less fatigue | Knock-out fatigue is halved too |
| 6 | Second Breath | Active · self · 25 | Heals 20% → 35% of max health | Also Fortified for 2 turns |
| 7 | Hardened | Passive | +5% → +20% Defense | Immune to Corroded |
| 8 | Immovable ★ | Keystone | In the front row, the Warden takes 8% → 20% less damage and can't be pushed back or Stunned, but its Dodge is always 0 | Dodge works again |
| 9 | Unyielding | Active · self · 45 | For 3 turns, no single hit can take more than 10% → 6% of the Warden's max health | Also Unbroken for those turns |

**Reprisal**
| Tier | Skill | Kind | Level 1 → 5 | Awakened |
|---|---|---|---|---|
| 1 | Shield Bash | Active · one foe, melee · 15 | 1.0× → 1.3×, and the foe's next turn is pushed back 60% → 80% | Also tries to Stun a charging foe |
| 2 | Heavy Hand | Passive | Shield Bash, Shield Toss and Shield Slam deal +10% → +40% | Their push-backs are 20% stronger |
| 3 | Retaliate | Active · self · 15 | Retaliating for 2 turns: each foe that damages the Warden takes 0.6× → 1.0× back | Those foes are also Weak for 1 turn |
| 4 | Spiked Rim | Passive | While Guarding, the Warden Retaliates for 0.2× → 0.5× against each hit it takes | Each one also adds a Bleeding stack (1 turn) |
| 5 | Shield Toss | Active · one foe, ranged · 20 | 0.6× → 0.9×, pushes its next turn back 50%, and tries to break a charge | Bounces to a second foe |
| 6 | Wrath of the Wall | Passive | Each hit the Warden takes for an ally adds +5% → +15% to its next attack, up to 5 times | Up to 10 times |
| 7 | Shield Slam | Active · front row, melee · 25 | 0.8× → 1.1× to each, pushing each one's next turn back 40% | They're also Weak for 1 turn |
| 8 | Iron Retribution ★ | Keystone | The Warden stores 50% → 100% of the damage it takes, and its next shield skill releases it all as extra damage, but the Warden takes 10% more damage | No extra damage taken |
| 9 | Reckoning | Active · one foe, melee with reach · 45 | 1.5× → 2.0×, plus 10% of all the damage the Warden has taken this battle | Hits every front-row foe |

#### Builds to try
- **The Wall** (Bulwark): Cover, Interpose, Aegis, Oath of the Shield. Never attacks and never lets anyone else get hit, which keeps a Crossbowman's Steady Aim switched on.
- **The Anvil** (Bastion): Brace, Unbroken, Iron Will, Immovable, Unyielding. Outlasts a long push on very little healing, especially beside a Barber-Surgeon's House Calls.
- **The Hammer** (Reprisal): Retaliate, Spiked Rim, Iron Retribution, Reckoning. Kills by being hit. A Hexblade's Hex Ward on the Warden also Dooms every attacker.
- **Guard and punish** (two paths): Guard, Shieldbearer and Spiked Rim. Protects everyone and charges a price for each hit it takes.

**Starter rules:** 1. Ally: health below 50% → Guard. 2. Front foe → Mace.

**Later rules:** "Foe: charging a big attack → Shield Toss". "Ally: has Marked → Cover". "Self: health below 25% → Unbroken". "3 or more foes present → Stand Fast".

### Lamplighter
*Back row · lanterns · mana gain 12 · rule slots 1 → 6*

The keeper of the lantern. Makes the party hit harder and act sooner, blinds the dark and strips foes of their protections. The fastest class, and the one whose turns matter most for their timing, so it rewards good rules more than any other.

#### Stats *(tune)*
| Stat | Recruit range (level 1) | Growth per level | Level 200 average |
|---|---|---|---|
| Health | 86–104 | +6 | 1,289 |
| Mana | 36–44 | +1.5 | 339 |
| Power | 13–15 | +0.9 | 193 |
| Defense | 3–5 | +0.2 | 44 |
| Speed | 11–13 | +0.03 | 18 |
| Crit | 3–7% | +0.03 | 11% |
| Dodge | 8–12% | +0.06 | 22% |

**Resistances at level 1** *(tune)*: Stun 20% · Move 20% · Bleed 15% · Blight 20% · Curse 30% · Debuff 40%.

**Basic attack:** Flare. One foe, magic, 0.8×, restores 12 mana.

#### Build paths
- **Hearthkeeper:** keeps the party's fire burning, with lasting Kindles, mana and warmth.
- **Wayfinder:** moves the party up the turn strip, so allies act before the foes do.
- **Glare:** blinds the foes, strips their protections and burns the spirits.

#### Skill tree *(tune)*
| Tier | Skill | Kind | Level 1 → 5 | Awakened |
|---|---|---|---|---|
| 1 | Kindle (starter) | Active · all allies · 20 | Kindled for 2 turns: +30% → +40% damage | Lasts 3 turns |

**Hearthkeeper**
| Tier | Skill | Kind | Level 1 → 5 | Awakened |
|---|---|---|---|---|
| 1 | Share the Flame | Active · one ally, not self · 15 | Gives the ally 25 → 40 mana | The ally is also Hasted for 1 turn |
| 2 | Warm Glow | Passive | Kindled allies heal 1% → 4% of max health at the start of each turn | Kindled allies also take 5% less damage |
| 3 | Long Wick | Passive | Kindle lasts 1 turn longer; from level 5, every buff the Lamplighter gives does | Buffs last 2 turns longer |
| 4 | Hearthfire | Active · all allies · 25 | Heals each 0.5× → 0.9× and gives each 10 mana | Also removes Weak from each ally |
| 5 | Beacon | Passive | Every battle starts with all allies Kindled for 1 → 2 turns | They're also Hasted for 2 turns |
| 6 | Ember Ward | Active · one ally · 20 | Warded, absorbing 2× → 3×. The foe that breaks the Ward starts Burning (2 turns, 0.3×). | Wards every ally, at half strength |
| 7 | Eternal Flame ★ | Keystone | Kindle never fades while the Lamplighter stands, but the Lamplighter loses 3% → 1% of max health each turn | No health loss |
| 8 | Bright Company | Active · all allies · 40 | Every ally gains 15 → 30 mana | Every ally is also Hasted for 1 turn |
| 9 | Dawnbreak | Active · all allies · 60 | Kindled (+40% → +60%) and Hasted for 3 turns, and every foe is Dazzled for 1 turn | Every ally then takes a turn at once, in slot order |

**Wayfinder**
| Tier | Skill | Kind | Level 1 → 5 | Awakened |
|---|---|---|---|---|
| 1 | Haste | Active · one ally · 15 | Hasted for 3 turns: +30% → +40% Speed | Hastes every ally |
| 2 | Quickening | Passive | +0.3 → +1 Speed | Every ally also gets +0.5 Speed |
| 3 | Light the Way | Active · one ally, not self · 20 | That ally takes the next turn. Costs 0 → 8 less. | The ally is also Kindled for 1 turn |
| 4 | Tailwind | Passive | Hasted allies also get +5% → +15% Dodge | Hasted allies' skills cost 5 less mana |
| 5 | Guiding Light | Active · all allies · 35 | Each ally's next turn comes 20% → 40% sooner | Each ally is also Kindled for 1 turn |
| 6 | Lantern Bearer | Passive | +5% → +15% Dodge | Each dodge restores 5 mana |
| 7 | Quickstep | Active · self · 15 | The Lamplighter's next turn comes at once, and it's Hasted for 1 → 2 turns | Costs no mana |
| 8 | Borrowed Time ★ | Keystone | Light the Way and Guiding Light cost half as much, but every ally they speed up loses 5% → 2% of max health | No health loss |
| 9 | First Light | Passive | Once per battle, when 2 or more allies are below 40% health, every ally takes a turn before any foe acts, healed by 5% → 20% of max health | Twice per battle |

**Glare**
| Tier | Skill | Kind | Level 1 → 5 | Awakened |
|---|---|---|---|---|
| 1 | Dazzle | Active · all foes, magic · 25 | 0.25× → 0.45× and Dazzled for 2 turns | Dazzled for 3 turns |
| 2 | Moth-Light | Passive | Flare +15% → +50% against spirits | Flare also Exposes spirits for 1 turn |
| 3 | Searchlight | Active · one foe, magic · 15 | Exposed for 3 turns: +25% → +35% damage taken, and it can't dodge | Also strips one helpful status |
| 4 | Afterimage | Passive | Dazzled foes take +5% → +20% damage | Dazzled foes can't crit |
| 5 | Snuff | Active · all foes, magic · 25 | 0.2× → 0.4×, and strips every helpful status from every foe | They're also Slowed for 1 turn |
| 6 | Harsh Light ★ | Keystone | The Lamplighter's attacks have a 40% → 80% chance to Dazzle each foe they hit for 1 turn, but its buffs on allies last a turn less (never under 1) | Buffs last their full length again |
| 7 | Blind Terror | Passive | A Dazzled foe that misses has its next turn pushed back 10% → 30% | Pushed back 50% |
| 8 | Sunburst | Active · all foes, magic · 30 | 0.7× → 1.0× to each, doubled against spirits | Spirits it hits are Dazzled for 1 turn |
| 9 | Noonday Sun | Active · all foes, magic · 55 | 1.0× → 1.4× to each, tripled against spirits, and strips their helpful statuses | Every foe hit is also Dazzled for 2 turns |

#### Builds to try
- **Hearth** (Hearthkeeper): Kindle, Long Wick, Warm Glow, Eternal Flame. A Kindle that never fades, for a party of damage dealers such as the Sellsword and Crossbowman.
- **Wayfinder:** Haste, Light the Way, Guiding Light, Borrowed Time. The party acts before the foes do. Add a Bellringer who delays the foes, or combine with the Bellringer at 50, and the turn strip is yours.
- **Glare:** Dazzle, Afterimage, Harsh Light, Blind Terror. Foes miss and lose turns, which suits a Duellist: every miss is a counter.
- **One big hit** (two paths): Kindle, Searchlight and Light the Way, setting up a Crossbowman's Heavy Draw or a Sellsword's Headsman's Swing.

**Starter rules:** 1. Always → Kindle.

**Later rules:** "Foe: charging a big attack → Dazzle". "Ally: has Charging → Light the Way". "Ally: mana below 30% → Share the Flame". "Foe: has Guarding → Snuff". "Foe: spirit → Sunburst".

### Crossbowman
*Back row · crossbows · mana gain 10 · rule slots 1 → 5*

The patient marksman. Hits any row, so the foes' back row is never safe, and sets up crits for the whole party. Rewards protection: a Crossbowman nobody touches gets more accurate.

#### Stats *(tune)*
| Stat | Recruit range (level 1) | Growth per level | Level 200 average |
|---|---|---|---|
| Health | 90–110 | +6 | 1,294 |
| Mana | 27–33 | +1 | 229 |
| Power | 18–22 | +1.3 | 279 |
| Defense | 3–5 | +0.2 | 44 |
| Speed | 9–11 | +0.02 | 14 |
| Crit | 12–18% | +0.08 | 31% |
| Dodge | 6–10% | +0.03 | 14% |

**Resistances at level 1** *(tune)*: Stun 25% · Move 30% · Bleed 20% · Blight 25% · Curse 15% · Debuff 25%.

**Basic attack:** Bolt. One foe, ranged, 1.0×, restores 10 mana.

#### Build paths
- **Marksman:** a few huge, certain shots, with crits set up for the whole party.
- **Skirmisher:** volume of fire, spread across rows and random foes.
- **Trapper:** hunts like a trapper, with bleeds, slows and snares, and is deadliest against beasts.

#### Skill tree *(tune)*
| Tier | Skill | Kind | Level 1 → 5 | Awakened |
|---|---|---|---|---|
| 1 | Aimed Shot (starter) | Active · one foe, ranged · 18 | 1.8× → 2.4×, +25% crit chance | Its crits deal ×2.2 |

**Marksman**
| Tier | Skill | Kind | Level 1 → 5 | Awakened |
|---|---|---|---|---|
| 1 | Mark Quarry | Active · one foe, ranged · 10 | 0.5× and Quarry for 3 turns: every attacker gets +20% → +35% crit chance against it | Crits on the Quarry restore 5 mana to the attacker |
| 2 | Steady Aim | Passive | +5% → +20% damage if the Crossbowman wasn't hit since its last turn | Also +10% crit chance |
| 3 | Eagle Eye | Passive | +3% → +10% crit chance | Can target Hidden foes |
| 4 | Heavy Draw | Active · one foe, ranged, charged · 25 | Charges this turn and Marks the target. Next turn: 3.2× → 4.2×, and it can't miss. | Ignores Guarding: always hits the Marked foe |
| 5 | Deadeye | Passive | Crits deal ×1.7 → ×2.0 instead of ×1.6 | ×2.3 |
| 6 | Piercing Bolt | Active · one foe, ranged · 25 | 1.4× → 1.9×, ignoring Defense and Guarding | The target is also Corroded for 2 turns |
| 7 | Overwatch ★ | Keystone | Single-target skills deal +20% → +40%, but the Crossbowman can't use area skills | Area skills work again, at −25% |
| 8 | Killshot | Active · one foe, ranged · 40 | 2.0× → 2.8×, and it always crits against a foe below 30% health | Can't miss |
| 9 | Called Shot | Passive | The first Aimed Shot of each battle always crits and deals +20% → +50% | The first two |

**Skirmisher**
| Tier | Skill | Kind | Level 1 → 5 | Awakened |
|---|---|---|---|---|
| 1 | Volley | Active · back row, ranged · 22 | 0.75× → 1.0× to each | Each foe hit also Bleeds (2 turns, 0.2×) |
| 2 | Quick Reload | Passive | Bolt restores 2 → 6 more mana | Bolt gets +15% crit chance |
| 3 | Scatter Shot | Active · 3 random foes, ranged · 20 | 0.7× → 0.95× to each | +15% crit chance |
| 4 | Skirmish | Passive | After an area skill, the Crossbowman's next turn comes 10% → 25% sooner | 40% sooner |
| 5 | Rapid Fire | Active · one foe, ranged · 20 | 3 hits of 0.5× → 0.65×, each rolling its own crit | 5 hits |
| 6 | Storm of Iron | Passive | Volley and Scatter Shot fire twice, at 40% → 60% damage each time | Deadly Barrage fires a third volley |
| 7 | Suppressing Fire | Active · front row, ranged · 25 | 0.5× → 0.7× to each, pushing each foe's next turn back 25% | They're also Weak for 1 turn |
| 8 | Bandolier ★ | Keystone | Area skills cost half as much mana, but every shot deals 25% → 10% less damage | No damage penalty |
| 9 | Deadly Barrage | Active · all foes, ranged · 50 | Two volleys of 0.6× → 0.85× at every foe | Each volley gets +25% crit chance |

**Trapper**
| Tier | Skill | Kind | Level 1 → 5 | Awakened |
|---|---|---|---|---|
| 1 | Barbed Bolt | Active · one foe, ranged · 12 | 0.8× and a Bleeding stack for 3 turns, 0.35× → 0.55× per tick | Applies 2 stacks |
| 2 | Hunter | Passive | +10% → +30% damage against beasts | Beasts it hits are Slowed for 1 turn |
| 3 | Pinning Shot | Active · one foe, ranged · 15 | 0.7× → 1.0×, Slowed for 2 turns, and its next turn is pushed back 30% | Slowed for 4 turns |
| 4 | Serrated Bolts | Passive | Bleeding the Crossbowman applies lasts 1 → 3 turns longer | Those stacks tick 20% harder |
| 5 | Bear Trap | Active · one foe, ranged · 20 | Sets a trap: the foe's next turn starts with 1.2× → 1.8× damage and a Bleeding stack, and it's Slowed for 2 turns | The trap also tries to Stun it for 1 turn |
| 6 | Snare | Passive | Slowed foes take +10% → +25% damage from the Crossbowman and can't dodge its attacks | Slowed foes take the bonus from every ally |
| 7 | Blood Scent ★ | Keystone | +15% → +30% damage to Bleeding foes, but −20% to foes that aren't bleeding. With no rule picking a target, shots go to the lowest-health Bleeding foe. | No penalty against foes that aren't bleeding |
| 8 | Tripwire | Active · front row, ranged · 25 | Every front-row foe is Slowed for 2 turns and Bleeds for 2 turns, 0.25× → 0.4× per tick | Their next turns are also pushed back 30% |
| 9 | The Kill | Active · one foe, ranged · 45 | 2.0× → 2.8×, plus 0.4× for each harmful status on the target | Can't miss, and on a kill the Crossbowman's next turn comes at once |

#### Builds to try
- **Sniper** (Marksman): Mark Quarry, Heavy Draw, Overwatch, Called Shot. Keep it behind a Warden's Cover so Steady Aim stays on.
- **Hailstorm** (Skirmisher): Volley, Scatter Shot, Storm of Iron, Bandolier, Deadly Barrage. Clears crowds, and even more so against foes an Alchemist has Corroded.
- **Hunter** (Trapper): Barbed Bolt, Pinning Shot, Snare, Blood Scent, The Kill. Shines in the Thornwood's beast packs, beside a Sellsword Bloodletter.
- **Crit storm** (two paths): Mark Quarry with Rapid Fire. Every hit rolls its own crit against the Quarry.

**Starter rules:** 1. Foe: lowest health → Aimed Shot.

**Later rules:** "Foe: boss or elite → Mark Quarry". "Foe: healer → Pinning Shot". "3 or more foes present → Scatter Shot". "Foe: beast → Barbed Bolt".

### Duellist
*Front row · rapiers · mana gain 10 · rule slots 2 → 5 · new*

A fencer who tanks by not being hit. Taunts foes into attacking, dodges and answers each miss with a counter, or picks one opponent and takes it apart. Where the Warden soaks damage, the Duellist slips it, so they shine against a few big hitters and struggle against hits that can't miss.

#### Stats *(tune)*
| Stat | Recruit range (level 1) | Growth per level | Level 200 average |
|---|---|---|---|
| Health | 108–132 | +8 | 1,712 |
| Mana | 27–33 | +1 | 229 |
| Power | 14–18 | +1.0 | 215 |
| Defense | 5–7 | +0.3 | 66 |
| Speed | 10–12 | +0.025 | 16 |
| Crit | 6–10% | +0.05 | 18% |
| Dodge | 15–21% | +0.08 | 34% |

**Resistances at level 1** *(tune)*: Stun 30% · Move 45% · Bleed 20% · Blight 15% · Curse 15% · Debuff 30%.

**Basic attack:** Thrust. One foe, melee, 0.9×, restores 10 mana.

#### Build paths
- **Evasion:** tanks by taunting and dodging.
- **Counter:** turns every attack on the party into a riposte.
- **Duel:** picks one opponent and takes it apart.

#### Skill tree *(tune)*
| Tier | Skill | Kind | Level 1 → 5 | Awakened |
|---|---|---|---|---|
| 1 | Challenge (starter) | Active · all foes · 20 | Taunted for 2 turns: their single-target attacks must aim at the Duellist, who gets +5% → +15% Dodge meanwhile | Taunted foes also deal 15% less damage |

**Evasion**
| Tier | Skill | Kind | Level 1 → 5 | Awakened |
|---|---|---|---|---|
| 1 | Parry | Active · self · 20 | Parrying: the next 2 → 3 single-target attacks against the Duellist miss | Each parried attack is countered for 0.5× |
| 2 | Light Feet | Passive | +4% → +15% Dodge | Also +0.5 Speed |
| 3 | Provoke | Active · one foe · 10 | Taunted for 2 → 3 turns | The foe is also Weak for 1 turn |
| 4 | Bait | Passive | Taunted foes deal 5% → 20% less damage | Taunts last 1 turn longer |
| 5 | Mirror Guard | Active · one ally, not self · 20 | For 2 turns, attacks on that ally use the Duellist's Dodge instead of theirs, plus 0% → 10% | Covers every ally |
| 6 | Reading the Blade | Passive | Each time the Duellist is hit, +5% → +15% Dodge until its next turn | Stacks up to 3 times |
| 7 | Featherweight ★ | Keystone | +15% → +30% Dodge, but the Duellist's max health is 25% lower | Max health is only 10% lower |
| 8 | Sidestep | Active · self · 15 | Veiled for 2 turns, with 0% → 15% more Dodge on top | Also Hasted for 1 turn |
| 9 | Untouchable | Passive | Once per battle, the first hit that would knock the Duellist out misses instead, and the Duellist is left Parrying 1 → 3 attacks | Twice per battle |

**Counter**
| Tier | Skill | Kind | Level 1 → 5 | Awakened |
|---|---|---|---|---|
| 1 | Riposte | Active · self · 15 | Riposte until its next turn: −20% damage taken, and each melee attacker is countered for 0.6× → 1.0× | Counters ranged attackers too |
| 2 | Counter-fencer | Passive | Each dodge restores 2 → 6 mana | Each dodge also heals 2% of max health |
| 3 | Grace Under Fire | Passive | Below 50% health, +5% → +20% Dodge | Riposte costs no mana below 50% health |
| 4 | Perfect Counter | Active · self · 25 | For 2 → 3 turns, every attack the Duellist dodges is countered for 0.8× | Those counters get +25% crit chance |
| 5 | Blade Dancer | Passive | Counters deal +10% → +35% | Counters can't miss |
| 6 | Second's Oath | Active · one ally, not self · 25 | For 2 → 3 turns, whenever that ally is attacked, the Duellist counters the attacker for 0.6× | Works for every ally |
| 7 | Unflinching | Passive | Area attacks deal 5% → 20% less to the Duellist | Area attacks can be countered too |
| 8 | Blood for Blood ★ | Keystone | Every hit the Duellist takes is countered for 0.4× → 0.7×, dodged or not, but the Duellist's Dodge is halved | Dodge is no longer halved |
| 9 | Counterstorm | Active · self · 45 | For 2 turns, every attack on any ally is countered by the Duellist for 0.6× → 0.9× | The Duellist is also Parrying 2 attacks |

**Duel**
| Tier | Skill | Kind | Level 1 → 5 | Awakened |
|---|---|---|---|---|
| 1 | Feint | Active · one foe, melee · 12 | 0.6× → 0.9× and Exposed for 2 turns | Also pushes its next turn back 30% |
| 2 | Footwork | Passive | In the front row, +0.3 → +1 Speed | Also +10% Dodge in the front row |
| 3 | Flèche | Active · one foe, melee with reach · 20 | 1.2× → 1.6×, and it can't be dodged | Leaves the Duellist Parrying 1 attack |
| 4 | Find the Gap | Passive | +5% → +15% crit chance, doubled against Exposed foes | Crits on Exposed foes deal ×2.0 |
| 5 | Disarm | Active · one foe, melee · 18 | 0.6× → 0.8× and Weak for 2 → 3 turns | Also Silenced for 1 turn |
| 6 | Single Combat ★ | Keystone | The first foe the Duellist attacks each battle becomes its opponent. The two deal +25% → +45% damage to each other, and the Duellist takes 15% less from everyone else. | The opponent no longer deals extra damage to the Duellist |
| 7 | Balestra | Active · one foe, melee · 20 | 1.0× → 1.4×, and the Duellist's next turn comes 30% sooner | The foe is also Exposed for 1 turn |
| 8 | Measured Cuts | Passive | The Duellist's single-target attacks ignore 10% → 30% of Defense | They also ignore Guarding |
| 9 | Thousand Cuts | Active · one foe, melee · 45 | One hit of 0.4× → 0.55× for every 5% of the Duellist's Dodge, up to 12 hits | Each hit gets +10% crit chance |

#### Builds to try
- **Phantom** (Evasion): Parry, Light Feet, Featherweight, Untouchable. Almost impossible to hit, especially with a Lamplighter's Haste and an Alchemist's Smoke Pot.
- **Swordmaster** (Counter): Riposte, Perfect Counter, Blade Dancer, Counterstorm. Punishes every attack on the party, and a Lamplighter's Dazzle means more misses to answer.
- **Champion** (Duel): Feint, Flèche, Single Combat, Thousand Cuts. Takes the boss one-on-one while the party clears the rest.
- **Hold the front** (two paths): Challenge, Riposte and Bait. Draws the attacks and makes them hurt less.

**Starter rules:** 1. Ally: health below 50% → Challenge. 2. Front foe → Thrust.

**Later rules:** "Self: has Marked → Parry". "Foe: highest attack → Disarm". "Self: without Riposte → Riposte". "Boss present → Thousand Cuts".

### Alchemist
*Back row · flasks · mana gain 10 · rule slots 1 → 5 · new*

Throws fire and acid at whole rows, and makes the party's items and brews go further. The best at clearing crowds of weaker foes, and weaker against one tough boss unless it's built to melt armour.

#### Stats *(tune)*
| Stat | Recruit range (level 1) | Growth per level | Level 200 average |
|---|---|---|---|
| Health | 86–104 | +6 | 1,289 |
| Mana | 36–44 | +1.5 | 339 |
| Power | 15–19 | +1.15 | 246 |
| Defense | 3–5 | +0.2 | 44 |
| Speed | 9–11 | +0.02 | 14 |
| Crit | 4–8% | +0.04 | 14% |
| Dodge | 4–8% | +0.03 | 12% |

**Resistances at level 1** *(tune)*: Stun 20% · Move 15% · Bleed 20% · Blight 55% · Curse 15% · Debuff 25%.

**Basic attack:** Vial Toss. One foe, ranged, 0.9×, restores 10 mana.

#### Build paths
- **Incendiary:** sets everything on fire and spreads it.
- **Corrosion:** melts armour, so everyone else hits harder.
- **Apothecary:** brews for the party and makes its items go further.

#### Skill tree *(tune)*
| Tier | Skill | Kind | Level 1 → 5 | Awakened |
|---|---|---|---|---|
| 1 | Firebomb (starter) | Active · front row, ranged · 18 | 0.6× → 0.85× to each, and Burning for 2 turns at 0.3× per tick | Burning for 4 turns |

**Incendiary**
| Tier | Skill | Kind | Level 1 → 5 | Awakened |
|---|---|---|---|---|
| 1 | Fire Flask | Active · one foe, ranged · 12 | 0.8× → 1.1× and Burning for 3 turns at 0.3× per tick | Burning for 5 turns |
| 2 | Volatile Compounds | Passive | Burning the Alchemist applies ticks 10% → 35% harder | Burning ticks can crit |
| 3 | Long Fuse | Passive | Burning the Alchemist applies lasts 1 → 2 turns longer | 3 turns longer |
| 4 | Volatile Mix | Active · all foes, ranged · 30 | 0.5× → 0.7× to each, doubled on Burning foes | Burning foes it hits spread their fire to the foe beside them |
| 5 | Accelerant | Passive | When a Burning foe falls, its fire spreads to 1 → 2 foes | Spreads to every foe |
| 6 | Clinging Fire | Active · back row, ranged · 25 | 0.5× → 0.75× to each, and Burning for 3 turns | Foes can't cleanse that Burning |
| 7 | Wildfire ★ | Keystone | The Alchemist's Burning stacks like Bleeding, at 50% → 70% strength per stack, but the Alchemist starts every battle Burning for 2 turns | No longer starts Burning |
| 8 | Flashover | Active · all foes, ranged · 45 | Every Burning foe takes all its remaining Burning at once, at 60% → 100%. The fire keeps burning. | The fire also spreads to the foe beside each one |
| 9 | Great Work | Active · all foes, ranged · 60 | 1.2× → 1.6× to each, and Burning for 3 turns | Spends all the Alchemist's mana, +2% damage for each point above 60 |

**Corrosion**
| Tier | Skill | Kind | Level 1 → 5 | Awakened |
|---|---|---|---|---|
| 1 | Acid Flask | Active · one foe, ranged · 15 | 0.7× → 1.0× and Corroded for 3 turns | Corroded takes −50% Defense instead of −30% |
| 2 | Contact Burn | Passive | Corroded foes take +10% → +25% from fire | Corroded foes Burn 1 turn longer |
| 3 | Shrapnel Jar | Active · back row, ranged · 22 | 0.6× → 0.85× to each, and Bleeding for 2 turns at 0.2× per tick | Applies 2 stacks to each |
| 4 | Lingering Fumes | Passive | Corroded from the Alchemist lasts 1 → 2 turns longer | Corroded foes are also Weak |
| 5 | Caustic Cloud | Active · 3 random foes, ranged · 25 | Corroded and Weak for 2 → 3 turns | Also Festering |
| 6 | Fume Mask | Passive | The Alchemist takes 10% → 30% less damage from area attacks | Immune to Burning, Poisoned and Corroded |
| 7 | Transmute | Active · one foe, ranged · 25 | Strips its helpful statuses, then it Burns for 2 turns per status stripped, at 0.3× → 0.5× per tick | Hits every foe |
| 8 | Melting Point ★ | Keystone | Corroded foes take +20% → +40% damage from everyone, but the Alchemist's own damage is 20% lower | No damage penalty |
| 9 | Dissolve | Active · one foe, ranged · 50 | 1.5× → 2.0×. Against a Corroded foe it also strips every helpful status, and the foe's Defense counts as 0 for 2 turns. | Hits every foe |

**Apothecary**
| Tier | Skill | Kind | Level 1 → 5 | Awakened |
|---|---|---|---|---|
| 1 | Smoke Pot | Active · all allies · 20 | Veiled for 2 → 3 turns: +20% Dodge | Every foe is also Dazzled for 1 turn |
| 2 | Field Chemist | Passive | While the Alchemist is in the party, party items work 10% → 30% better | The party gets one more item slot |
| 3 | Quick Brew | Active · one ally · 20 | Heals 1.6× → 2.4× and gives 10 → 20 mana | Also removes one harmful status |
| 4 | Spare Vials | Passive | Once per battle, the first used item slot refills, at 40% → 100% strength | Twice per battle |
| 5 | Elixir of Fury | Active · one ally · 30 | Kindled (+40% → +60%) and Hasted for 2 turns, but the ally loses 5% of max health each turn | No health loss |
| 6 | Catalyst | Passive | The Alchemist's skills cost 2 → 8 less mana | Vial Toss also restores 5 more mana |
| 7 | Ironskin Tonic | Active · one ally · 25 | Fortified, and +20% → +40% to every resistance, for 3 turns | Every ally |
| 8 | Unstable Brews ★ | Keystone | Quick Brew, Elixir of Fury and Ironskin Tonic are 30% → 60% stronger, but each has a 20% chance to Poison the drinker for 2 turns | No more poisoning |
| 9 | Panacea | Active · all allies · 55 | Heals each 1.0× → 1.5×, clears every harmful status, and refills one used item slot | Refills every item slot |

#### Builds to try
- **Firestarter** (Incendiary): Fire Flask, Volatile Mix, Wildfire, Flashover. Stacks fire on whole rows and pops it at once. Beside a Hexblade, the Burning and Doom together trip Unmaking.
- **Acid Rain** (Corrosion): Acid Flask, Caustic Cloud, Melting Point, Dissolve. Makes everyone else hit harder, which suits a Crossbowman Skirmisher.
- **Apothecary:** Smoke Pot, Field Chemist, Spare Vials, Unstable Brews, Panacea. Turns the party's items into a second healer.
- **Burn the armour off** (two paths): Firebomb, Acid Flask and Contact Burn.

**Starter rules:** 1. Front foe → Firebomb.

**Later rules:** "3 or more foes present → Volatile Mix". "Foe: highest health → Acid Flask". "Foe: charging a big attack → Smoke Pot". "Foe: has Guarding → Transmute".

### Barber-Surgeon
*Back row · bonesaws · mana gain 12 · rule slots 2 → 6 · new*

The field doctor. Stops bleeding, cures afflictions and patches the worst wounds at a price, then sends the party out fresher than it came in. Where the Pilgrim keeps health topped up, the Surgeon fixes what's wrong and keeps fatigue down.

#### Stats *(tune)*
| Stat | Recruit range (level 1) | Growth per level | Level 200 average |
|---|---|---|---|
| Health | 95–115 | +7 | 1,498 |
| Mana | 40–50 | +1.8 | 403 |
| Power | 13–15 | +0.9 | 193 |
| Defense | 4–6 | +0.3 | 65 |
| Speed | 9–11 | +0.02 | 14 |
| Crit | 4–8% | +0.04 | 14% |
| Dodge | 4–8% | +0.03 | 12% |

**Resistances at level 1** *(tune)*: Stun 25% · Move 20% · Bleed 45% · Blight 40% · Curse 20% · Debuff 25%.

**Basic attack:** Lancet Throw. One foe, ranged, 0.8×, restores 12 mana.

#### Build paths
- **Physician:** cures and prevents harmful statuses.
- **Surgeon:** big emergency heals and raises, each at a price.
- **Leechcraft:** old medicine, with stimulants, leeches and care that keeps fatigue down.

#### Skill tree *(tune)*
| Tier | Skill | Kind | Level 1 → 5 | Awakened |
|---|---|---|---|---|
| 1 | Stitch (starter) | Active · one ally · 15 | Heals 2.0× → 2.8× and stops all Bleeding on them | Also removes Festering |

**Physician**
| Tier | Skill | Kind | Level 1 → 5 | Awakened |
|---|---|---|---|---|
| 1 | Tonic | Active · one ally · 10 | Removes one harmful status and gives 10 → 20 mana | Removes two |
| 2 | Strong Stomach | Passive | Immune to Festering, and Poisoned and Doom tick 10% → 40% weaker on the Surgeon | Immune to Poisoned too |
| 3 | Clean the Wound | Active · all allies · 30 | Clears Bleeding, Poisoned and Festering from every ally, and heals each 0.4× → 0.8× | Clears Burning too |
| 4 | Preventive Care | Passive | Each battle, the first 1 → 3 harmful statuses aimed at the party are shrugged off | The first 5 |
| 5 | Quarantine | Active · one ally · 20 | Immune to new harmful statuses for 1 → 2 turns | Every ally, for 1 turn |
| 6 | Chief Surgeon | Passive | Cleanses cost 2 → 6 less mana | Cleanses also heal 1.0× |
| 7 | Inoculate | Active · all allies · 35 | +20% → +40% Bleed, Blight and Curse resistance for 3 turns | +20% to every resistance as well |
| 8 | Sterile Field ★ | Keystone | No harmful status lasts more than 3 → 2 turns on an ally, but the Surgeon's heals are 25% weaker | No healing penalty |
| 9 | Grand Rounds | Active · all allies · 55 | Heals each 1.5× → 2.2× and clears every harmful status from every ally | Also raises one fallen ally with 25% health |

**Surgeon**
| Tier | Skill | Kind | Level 1 → 5 | Awakened |
|---|---|---|---|---|
| 1 | Field Surgery | Active · one ally · 25 | Heals 30% → 45% of the ally's max health, but leaves them Slowed for 1 turn | No Slow |
| 2 | Bedside Manner | Passive | The Surgeon's healing +5% → +20% | Heals can crit |
| 3 | Splint | Active · one ally · 15 | Fortified for 2 → 3 turns, and immune to Stunned and push-backs meanwhile | Every ally |
| 4 | Steady Saw | Passive | Field Surgery and Amputate cost 2 → 10 less | Field Surgery heals 10% more of max health |
| 5 | Amputate | Active · one foe, melee with reach · 35 | Deals 8% → 15% of the foe's max health, or 2% → 5% against bosses | Also Bleeding for 3 turns, 0.4× per tick |
| 6 | Reviver | Passive | Smelling Salts the party uses raise allies with +10% → +30% health | Smelling Salts also clear harmful statuses |
| 7 | Resuscitate | Active · one fallen ally · 40 | Raises them with 25% → 45% health, but they're Slowed for 1 turn | No Slow |
| 8 | Rough Surgery ★ | Keystone | The Surgeon's heals are 30% → 60% stronger, but every heal leaves the patient Weak for 1 turn | No more Weak |
| 9 | Second Opinion | Passive | Once per battle, when an ally falls, the Surgeon raises them at once with 10% → 35% health | Twice per battle |

**Leechcraft**
| Tier | Skill | Kind | Level 1 → 5 | Awakened |
|---|---|---|---|---|
| 1 | Adrenaline | Active · one ally · 20 | Hasted and Kindled for 2 → 3 turns, then Weak for 1 turn | No Weak afterwards |
| 2 | House Calls | Passive | After each battle, every character recovers 1 → 4 fatigue | Recovers 6 |
| 3 | Leeches | Active · one foe, ranged · 20 | Bleeding for 3 turns at 0.3× → 0.5× per tick, and each tick heals the most hurt ally by the same amount | Applies 2 stacks |
| 4 | Anatomy | Passive | +3% → +10% crit chance, and the Surgeon's crits cause Bleeding (2 turns, 0.2×) | Crits apply 2 stacks |
| 5 | Laudanum | Active · one ally · 20 | For 3 turns the ally takes 10% → 20% less damage, and damage they take builds half the fatigue | Every ally |
| 6 | Cupping | Active · one ally · 15 | Draws out every Bleeding stack on the ally, turning each into 0.4× → 0.7× healing | Also gives 5 mana per stack |
| 7 | Cold Compress | Passive | Allies the Surgeon heals gain 5% → 15% less fatigue from that battle | 25% less |
| 8 | Cure-all ★ | Keystone | Adrenaline and Laudanum reach every ally, but each use costs the Surgeon 10% → 5% of max health | No health cost |
| 9 | Transfusion | Active · one ally, not self · 40 | The Surgeon gives 20% of its max health to heal the ally for 40% → 70% of theirs, and the ally's fatigue from this battle is wiped | No health cost to the Surgeon |

#### Builds to try
- **Physician:** Tonic, Clean the Wound, Preventive Care, Sterile Field. No curse or poison lasts. Strong in the Drowned Chapel, where the choirs Doom the party.
- **Field Surgeon** (Surgeon): Field Surgery, Splint, Rough Surgery, Second Opinion. Huge heals and quick raises, ideal behind a Warden.
- **Leech-doctor** (Leechcraft): Adrenaline, House Calls, Laudanum, Cure-all, Transfusion. Keeps fatigue low so pushes go on, and pairs well with a Pilgrim Shepherd.
- **Bleed them, mend us** (two paths): Stitch, Leeches and Anatomy. Heals the party while its leeches drain the foes.

**Starter rules:** 1. Ally: health below 50% → Stitch. 2. Foe: lowest health → Lancet Throw.

**Later rules:** "Ally: has Bleeding → Stitch". "Ally: has Stunned → Tonic". "Ally: health below 25% → Field Surgery". "Ally: highest Power → Adrenaline".

### Bellringer
*Back row · handbells · mana gain 12 · rule slots 1 → 6 · new*

Rings the hours. Pushes foes' turns back, slows, stuns and confuses them, while chimes steady the party. Where the Lamplighter speeds the party up, the Bellringer slows the foes down, so together they own the turn strip.

#### Stats *(tune)*
| Stat | Recruit range (level 1) | Growth per level | Level 200 average |
|---|---|---|---|
| Health | 90–110 | +6.5 | 1,394 |
| Mana | 40–50 | +1.8 | 403 |
| Power | 13–15 | +0.9 | 193 |
| Defense | 4–6 | +0.25 | 55 |
| Speed | 9–11 | +0.02 | 14 |
| Crit | 3–7% | +0.03 | 11% |
| Dodge | 4–8% | +0.03 | 12% |

**Resistances at level 1** *(tune)*: Stun 45% · Move 25% · Bleed 15% · Blight 20% · Curse 30% · Debuff 30%.

**Basic attack:** Clang. One foe, magic, 0.8×, pushes its next turn back 10%, restores 12 mana.

#### Build paths
- **Tolling:** delays and slows, so foes barely get to act.
- **Knelling:** stuns and maddens, so foes lose turns or strike their own side.
- **Vespers:** chimes that heal, protect and steady the party.

#### Skill tree *(tune)*
| Tier | Skill | Kind | Level 1 → 5 | Awakened |
|---|---|---|---|---|
| 1 | Toll (starter) | Active · all foes, magic · 20 | 0.3× → 0.5× to each, and each foe's next turn is pushed back 20% → 35% | Also Slowed for 1 turn |

**Tolling**
| Tier | Skill | Kind | Level 1 → 5 | Awakened |
|---|---|---|---|---|
| 1 | Ringing Ears | Active · front row, magic · 18 | 0.4× → 0.6× and Slowed for 2 turns | Also Dazzled for 1 turn |
| 2 | Reverberation | Passive | The Bellringer's push-backs are 10% → 30% stronger | 50% stronger |
| 3 | Long Echo | Passive | Slowed from the Bellringer lasts 1 → 2 turns longer | Slowed is −40% Speed instead of −30% |
| 4 | Hour Bell | Active · one foe, magic · 15 | Pushes the foe's next turn back 60% → 100% | Also Slowed for 2 turns |
| 5 | Ringing Hours | Passive | Each time the Bellringer pushes a foe back, it gains 2 → 5 mana | Also heals 1% of max health |
| 6 | Curfew Bell | Active · all foes, magic · 35 | Slowed for 2 → 3 turns | Also Weak for 1 turn |
| 7 | Stopped Clock ★ | Keystone | The Bellringer's push-backs are doubled, but its own Speed is 30% → 15% lower | No Speed penalty |
| 8 | Dirge | Passive | Slowed foes deal 5% → 15% less damage | They also take 10% more |
| 9 | The Long Hour | Active · all foes, magic · 55 | Every foe's next turn is pushed back 50% → 80%, and every foe is Slowed for 2 turns | Slowed for 4 turns |

**Knelling**
| Tier | Skill | Kind | Level 1 → 5 | Awakened |
|---|---|---|---|---|
| 1 | Knell | Active · one foe, magic · 25 | 0.6× → 0.9× and Stunned for 1 turn | Stunned for 2 turns |
| 2 | Deaf to Dread | Passive | The Bellringer takes 5% → 20% less magic damage | Immune to Stunned and Confused |
| 3 | Discord | Active · 3 random foes, magic · 30 | 0.3× → 0.5× and Confused for 1 turn: their next single-target attack picks a random target, their own side included | Confused for 2 turns |
| 4 | Cracked Bell | Passive | Stunned foes take +10% → +30% damage from everyone | Slowed foes too |
| 5 | Resonance | Active · 3 random foes, magic · 25 | 0.6× → 0.9× to each, doubled against Stunned or Slowed foes | Hits every foe |
| 6 | Death Knell | Passive | Whenever a foe falls, every other foe's next turn is pushed back 10% → 25% | 40% |
| 7 | Shattering Peal | Active · one foe, magic · 30 | 1.0× → 1.4×. A Stunned target takes double, and its Stun lasts a turn longer. | The target is also Weak for 2 turns |
| 8 | Toll of Madness ★ | Keystone | Confused foes always strike their own side, but the Bellringer takes 20% → 10% more damage | No extra damage taken |
| 9 | The Great Bell | Active · all foes, magic · 50 | 1.0× → 1.4× to each and Stunned for 1 turn | Stunned for 2 turns |

**Vespers**
| Tier | Skill | Kind | Level 1 → 5 | Awakened |
|---|---|---|---|---|
| 1 | Vesper Chime | Active · all allies · 25 | Heals each 0.6× → 1.0×, and Fortified for 1 turn | Fortified for 2 turns |
| 2 | Sympathetic Chime | Passive | Vesper Chime and Sanctus also clear one harmful status from 1 → 2 allies | From every ally |
| 3 | Wake | Active · one ally · 12 | Clears Stunned, Slowed and Confused, and the ally's next turn comes 20% → 40% sooner | Every ally |
| 4 | Steady Peal | Passive | While the Bellringer stands, allies get +5% → +15% Stun and Debuff resistance | +25% |
| 5 | Call to Arms | Active · all allies · 30 | Each ally's next turn comes 15% → 30% sooner, and each gains 10 mana | They're also Blessed for 2 turns |
| 6 | Chime of Warding | Passive | Vesper Chime also Wards each ally, absorbing 0.5× → 1.0× | Those Wards absorb twice as much |
| 7 | Sanctus | Active · all allies · 35 | Immune to Stunned, Slowed and Confused for 3 turns, and Blessed for 0.3× → 0.6× per turn | Immune to Silenced too |
| 8 | Vesper Vow ★ | Keystone | Vesper Chime, Call to Arms and Sanctus cost no mana, but the Bellringer's attacks deal 50% → 30% less damage | No damage penalty |
| 9 | Evensong | Active · all allies · 55 | Heals each 1.2× → 1.8×, and +20% to every resistance for 3 turns | Also clears every harmful status |

#### Builds to try
- **Clockmaker** (Tolling): Toll, Hour Bell, Stopped Clock, Curfew Bell, The Long Hour. Foes barely act. Doom and Burning tick on the foe's own turns, so this build pairs better with burst, like a Crossbowman's Heavy Draw, than with a Hexblade.
- **Madness** (Knelling): Knell, Discord, Toll of Madness, The Great Bell. Foes lose turns and strike each other, and a Cutpurse's Opportunist feasts on the stunned.
- **Vespers:** Vesper Chime, Sympathetic Chime, Vesper Vow, Evensong. A second healer that also shields the party from stuns.
- **Ring and strike** (two paths): Toll, Knell and Cracked Bell.

**Starter rules:** 1. Always → Toll.

**Later rules:** "Foe: charging a big attack → Knell". "Foe: acts next → Knell". "Ally: has Stunned → Wake". "3 or more foes present → Discord".

### Gravecaller
*Back row · bone staves · mana gain 12 · rule slots 1 → 5 · new*

Raises bone thralls into the party's empty slots, then spends them as shields, as healing or as explosions. Strongest when the party has room to spare, as it does early on, and weaker when every slot is already full.

**How thralls work**
- A thrall rises in an empty party slot, front row first unless a skill says otherwise.
- At most 2 thralls stand at once, unless a skill says otherwise.
- Its stats come from the Gravecaller's, as each skill says.
- It acts on its own turns, always using its basic attack on the front foe. It has no rules.
- It blocks the front row like a character, so it protects the back row.
- Rules ignore thralls, so "Ally" conditions skip them. Thralls build no fatigue, and they're gone when the battle ends.
- **Corpses:** each fallen foe leaves a corpse until the battle ends, and some skills consume one. Thralls leave none unless a skill says so.

#### Stats *(tune)*
| Stat | Recruit range (level 1) | Growth per level | Level 200 average |
|---|---|---|---|
| Health | 86–104 | +6 | 1,289 |
| Mana | 40–50 | +1.8 | 403 |
| Power | 14–18 | +1.1 | 235 |
| Defense | 3–5 | +0.2 | 44 |
| Speed | 8–10 | +0.02 | 13 |
| Crit | 3–7% | +0.03 | 11% |
| Dodge | 3–7% | +0.03 | 11% |

**Resistances at level 1** *(tune)*: Stun 20% · Move 20% · Bleed 30% · Blight 40% · Curse 50% · Debuff 20%.

**Basic attack:** Grave Bolt. One foe, magic, 0.8×, restores 12 mana.

#### Build paths
- **Ossuary:** a growing army of stronger thralls.
- **Corpsecraft:** feeds on every death, turning corpses into damage.
- **Boneward:** spends the dead to shield the living.

#### Skill tree *(tune)*
| Tier | Skill | Kind | Level 1 → 5 | Awakened |
|---|---|---|---|---|
| 1 | Raise Thrall (starter) | Active · self · 25 | A Bone Thrall rises in an empty slot, with 40% → 60% of the Gravecaller's max health and 50% → 75% of their Power, at Speed 8. With no empty slot, it fully heals a thrall instead. | The thrall rises Fortified and Retaliating for 2 turns |

**Ossuary**
| Tier | Skill | Kind | Level 1 → 5 | Awakened |
|---|---|---|---|---|
| 1 | Raise Ghoul | Active · self · 35 | A Ghoul rises in an empty slot, with 30% of the Gravecaller's max health, 80% → 110% of their Power and Speed 12. Its claws cause Bleeding. | Two Ghouls, if two slots are empty |
| 2 | Bone Binder | Passive | Thralls get +10% → +35% health | Thralls start Fortified for 2 turns |
| 3 | Master of Bone | Passive | Thralls deal +10% → +35% damage | Thrall hits can crit, using the Gravecaller's Crit |
| 4 | Unholy Frenzy | Active · all allies · 25 | Every thrall is Kindled (+30% → +60%) and Hasted for 2 turns | Thralls also heal 20% |
| 5 | Ossuary | Passive | Each battle starts with a free Bone Thrall at 40% → 100% strength, if a slot is empty | Two thralls |
| 6 | Raise Champion | Active · self · 50 | A Bone Champion rises in an empty slot, with 80% → 120% of the Gravecaller's max health and 100% → 140% of their Power. It Cleaves the front row. One at a time. | It rises Unbroken for 2 turns |
| 7 | Legion ★ | Keystone | No limit on thralls, but every thrall has 40% → 20% less health | No health penalty |
| 8 | Bone Armour | Passive | Thralls get +20% → +60% Defense | Thralls are immune to Bleeding, Poisoned and Doom |
| 9 | Army of the Dead | Active · self · 60 | Every empty slot fills with Bone Thralls at 50% → 80% strength, past the usual limit | They burst when they fall, dealing 0.5× to every foe |

**Corpsecraft**
| Tier | Skill | Kind | Level 1 → 5 | Awakened |
|---|---|---|---|---|
| 1 | Grave Chill | Active · one foe, magic · 15 | 0.8× → 1.1× and Slowed for 1 turn | Also Weak for 1 turn |
| 2 | Corpse Harvest | Passive | When any foe falls, the Gravecaller gains 3 → 10 mana | Also heals 3% of max health |
| 3 | Corpse Blast | Active · all foes, magic · 25 | Consumes a corpse: 0.5× → 0.8× to every foe | Doesn't consume the corpse |
| 4 | Grave Dust | Passive | When a thrall falls, front-row foes take 0.3× → 0.7× | They're also Slowed for 1 turn |
| 5 | Grasping Dead | Active · front row, magic · 25 | 0.4× → 0.6×, and each foe's next turn is pushed back 30% | Also Weak for 2 turns |
| 6 | Soul Siphon | Passive | Whenever anyone falls, the Gravecaller heals 2% → 6% of max health | Heals the most hurt ally too |
| 7 | Rot Bloom | Active · all foes, magic · 20 | Consumes a corpse: every foe is Poisoned for 3 turns, starting at 0.2× → 0.35× per tick | Also Festering |
| 8 | Carrion Feast ★ | Keystone | Fallen thralls leave corpses too, and each corpse the Gravecaller consumes Kindles it for 1 turn, but its thralls have 25% → 10% less health | No health penalty |
| 9 | Necrotic Wave | Active · all foes, magic · 55 | 1.0× → 1.4× to each, plus 0.2× for every corpse on the field, consuming none | Every foe is also Slowed for 2 turns |

**Boneward**
| Tier | Skill | Kind | Level 1 → 5 | Awakened |
|---|---|---|---|---|
| 1 | Bone Wall | Active · self · 30 | A Bone Wall rises in an empty front-row slot, with 60% → 90% of the Gravecaller's max health and twice their Defense. It never attacks, and Guards on every turn. | It also Retaliates for 0.3× |
| 2 | Death's Door | Passive | While a thrall stands, the Gravecaller takes 5% → 20% less damage | Also +10% Dodge |
| 3 | Death Pact | Active · one ally · 10 | Destroys the healthiest thrall and heals the ally for 60% → 100% of that thrall's remaining health | Heals every ally |
| 4 | Marrow Ward | Passive | When a thrall falls, the most hurt ally is Warded, absorbing 0.5× → 1.0× | Every ally |
| 5 | Bone Cage | Active · one foe, magic · 25 | Silenced and Slowed for 1 → 2 turns | Also Weak |
| 6 | Eternal Servitude | Passive | Once per battle, each thrall that falls rises again with 20% → 50% health | It rises with full health |
| 7 | Soul Anchor | Active · self · 35 | For 2 → 3 turns, a blow that would knock out the Gravecaller destroys a thrall instead, while any thrall stands | Also Wards the Gravecaller, absorbing 1.0× |
| 8 | Bound in Bone ★ | Keystone | Attacks aimed at the Gravecaller hit its healthiest thrall instead, but thralls deal 40% → 20% less damage | No damage penalty |
| 9 | Charnel Fortress | Active · self · 55 | Every empty slot fills with Bone Walls at 40% → 70% strength, past the usual limit, and every ally is Fortified for 2 turns | The walls also Retaliate for 0.3× |

#### Builds to try
- **Necropolis** (Ossuary): Raise Ghoul, Master of Bone, Legion, Raise Champion, Army of the Dead. A small army, best while the party still has empty slots.
- **Carrion** (Corpsecraft): Corpse Blast, Corpse Harvest, Carrion Feast, Necrotic Wave. Feeds on every death, so it loves a Sellsword Executioner who keeps making corpses.
- **Bone Warden** (Boneward): Bone Wall, Death's Door, Bound in Bone, Charnel Fortress. A back-row tank made of bones, and a natural partner for a Warden.
- **Walking potions** (two paths): Raise Thrall, Death Pact and Bone Binder. Thralls stand in front, then get spent as healing.

**Starter rules:** 1. Always → Raise Thrall.

**Later rules:** "Self: fewer than 1 thrall → Raise Thrall". "3 or more foes present → Corpse Blast". "Ally: health below 30% → Death Pact". "Boss present → Raise Champion".

### Cutpurse
*Back row · daggers · mana gain 10 · rule slots 2 → 5 · new*

A thief who strikes from the shadows. Hides from attacks, stabs the foes nobody else can reach, poisons them, and steals gold and loot along the way: the class that pays for itself. Fragile once found, so they want foes busy with someone else.

#### Stats *(tune)*
| Stat | Recruit range (level 1) | Growth per level | Level 200 average |
|---|---|---|---|
| Health | 90–110 | +6.5 | 1,394 |
| Mana | 27–33 | +1 | 229 |
| Power | 16–20 | +1.25 | 267 |
| Defense | 3–5 | +0.2 | 44 |
| Speed | 11–13 | +0.03 | 18 |
| Crit | 10–14% | +0.07 | 26% |
| Dodge | 11–17% | +0.06 | 26% |

**Resistances at level 1** *(tune)*: Stun 25% · Move 35% · Bleed 20% · Blight 35% · Curse 15% · Debuff 30%.

**Basic attack:** Throwing Knife. One foe, ranged, 0.8×, restores 10 mana.

#### Build paths
- **Shadow:** strikes from hiding, again and again.
- **Venom:** poisons that grow, and dirty tricks.
- **Thief:** steals gold, items, mana and even the foes' blessings.

#### Skill tree *(tune)*
| Tier | Skill | Kind | Level 1 → 5 | Awakened |
|---|---|---|---|---|
| 1 | Backstab (starter) | Active · one foe, melee with reach · 18 | 1.3× → 1.7×, and ×1.5 if the Cutpurse is Hidden, which ends Hidden | ×2 from Hidden |

**Shadow**
| Tier | Skill | Kind | Level 1 → 5 | Awakened |
|---|---|---|---|---|
| 1 | Vanish | Active · self · 15 | Hidden for 2 → 3 turns | Also heals 10% of max health |
| 2 | Shadow Step | Passive | Backstab keeps the Cutpurse Hidden 20% → 60% of the time | Backstab and Ambush never end Hidden |
| 3 | Smoke and Mirrors | Active · one ally, not self · 20 | Hidden for 1 → 2 turns | Every ally, for 1 turn |
| 4 | Escape Artist | Passive | Once per battle, dropping below 30% health makes the Cutpurse Hidden for 1 → 2 turns | Also heals 20% of max health |
| 5 | Ambush | Active · one foe, melee with reach · 25 | 2.5× → 3.3× if the Cutpurse is Hidden, otherwise 1.0× | Doesn't end Hidden |
| 6 | Loaded Dice | Passive | +3% → +10% crit chance | Crits deal ×2.0 |
| 7 | Cut and Run | Active · one foe, melee with reach · 20 | 1.0× → 1.4×, and the Cutpurse becomes Hidden for 1 turn | Hidden for 2 turns |
| 8 | Unseen ★ | Keystone | The Cutpurse starts every battle Hidden, and its attacks from hiding deal +20% → +40%, but its max health is 30% lower | Max health is only 15% lower |
| 9 | Perfect Crime | Active · one foe, melee with reach · 50 | 3.5× → 4.5×. On a kill, the Cutpurse becomes Hidden and steals double gold. | Can't miss |

**Venom**
| Tier | Skill | Kind | Level 1 → 5 | Awakened |
|---|---|---|---|---|
| 1 | Envenom | Active · one foe, ranged · 15 | 0.5× and Poisoned for 3 turns, starting at 0.25× → 0.4× per tick | Poisoned for 5 turns |
| 2 | Toxicologist | Passive | Poisoned grows by 25% → 50% per tick instead of 25% | Poison ticks can crit |
| 3 | Caltrops | Active · front row, ranged · 18 | Slowed for 2 turns and Bleeding for 2 turns, 0.2× → 0.3× per tick | Both last 3 turns |
| 4 | Opportunist | Passive | +10% → +30% damage against Slowed, Stunned or Dazzled foes | Also +10% crit chance against them |
| 5 | Fan of Knives | Active · all foes, ranged · 30 | 0.4× → 0.6× to each, and Poisoned for 2 turns at 0.2× | Poisoned for 4 turns |
| 6 | Dirty Fighting | Passive | The Cutpurse's hits have a 10% → 25% chance to Dazzle for 1 turn | They also make the foe Weak for 1 turn |
| 7 | Blinding Powder | Active · one foe, ranged · 15 | Dazzled and Exposed for 2 → 3 turns | Also Slowed for 1 turn |
| 8 | Coated Blades ★ | Keystone | Every hit the Cutpurse lands also Poisons for 2 turns, but its skills cost 30% → 15% more mana | No extra mana cost |
| 9 | Final Dose | Active · one foe, ranged · 45 | All of the target's remaining Poison ticks land at once, each at its fully grown strength, at 100% → 150% | Hits every Poisoned foe |

**Thief**
| Tier | Skill | Kind | Level 1 → 5 | Awakened |
|---|---|---|---|---|
| 1 | Pickpocket | Active · one foe, melee with reach · 10 | 0.6× → 0.9×, and steals 5 → 15 gold, scaled to the stage's level, once per foe | Also steals one helpful status |
| 2 | Light Fingers | Passive | +3% → +15% gold from every battle | Also a 5% chance of an extra item |
| 3 | Filch | Active · one foe, melee with reach · 20 | 0.5× → 0.8×, and steals one helpful status from the foe for the Cutpurse | Steals all of them |
| 4 | Fence | Passive | Items the party sells fetch 10% → 30% more gold | Also +10% gold from battles |
| 5 | Rob Blind | Active · one foe · 20 | Steals 10 → 25 mana from the foe and gives it to the ally with the least mana | The foe is also Silenced for 1 turn |
| 6 | Sticky Fingers | Passive | A 3% → 12% chance to find an extra item after each battle | 20%, and the extra item is at least Fine |
| 7 | Pass the Bag | Active · one foe · 20 | Moves every harmful status on the Cutpurse onto the foe, which also takes 0.3× → 0.6× | Can take the statuses from any one ally instead |
| 8 | Heavy Purse ★ | Keystone | The Cutpurse's kills drop double gold and items, but the Cutpurse takes 20% → 10% more damage | No extra damage taken |
| 9 | Master Thief | Passive | The Cutpurse's kills give +10% → +40% XP and gold | Kills also drop materials |

#### Builds to try
- **Assassin** (Shadow): Vanish, Shadow Step, Unseen, Ambush, Perfect Crime. Strikes from hiding again and again, and a Lamplighter's Light the Way lands the Ambush before foes can act.
- **Poisoner** (Venom): Envenom, Toxicologist, Coated Blades, Final Dose. Grows poison on long fights. Bosses resist Blight more often, so it shines on elites.
- **Master Thief** (Thief): Pickpocket, Light Fingers, Fence, Heavy Purse, Master Thief. Pays for the whole party, best when farming cleared stages.
- **Blind and stab** (two paths): Backstab, Opportunist and Blinding Powder.

**Starter rules:** 1. Foe: lowest health → Backstab. 2. Front foe → Throwing Knife.

**Later rules:** "Self: without Hidden → Vanish". "Foe: healer → Ambush". "Foe: has Stunned → Ambush". "3 or more foes present → Fan of Knives".

## 5. Rules

### How a rule reads
- On each turn a character reads its rules from the top and uses the first rule whose condition holds and whose action is possible: enough mana and a legal target. If none applies, it uses its basic attack.
- A condition that names a foe or an ally also **picks the target**, from those the skill can reach. The step-1 engine already works this way. Any other condition only decides whether the rule fires, and the skill then aims by default: the nearest foe (front row first), the most hurt ally or the first fallen ally.
- **Ally conditions include the character themself**, as in Final Fantasy XII. Skills marked "not self" skip their user.
- **Thresholds:** an "X%" condition starts fixed at 50%. The Tactician's first lesson adds 25, 30, 40, 60, 75 and 90% to every health and mana condition. "N" counts run from 2 to 6.
- **Status conditions** ("has" and "without") can name any status the party has already seen in battle, so the list grows as you meet new foes.

### Conditions
42 conditions in four groups, using step 2's group names. Step 2 already built 20 of them, with one tag condition covering undead, spirit and beast. "Reward" means the first clear of a stage teaches it, shown on the rewards screen. The stage numbers are placeholders until the campaign map is designed in step 6.

#### Self
| Condition | Picks | Unlocks | Use it for |
|---|---|---|---|
| Self: health below X% | Self | Start, at 50% | Riposte, Unbroken, Defend |
| Self: health above X% | Self | Tactician II | Reckless Swing while it's safe |
| Self: mana below X% | — | Tactician I | Gather, or saving mana for a big skill |
| Self: in the front row / back row | — | Tactician I, with the Move action | A Hexblade choosing between Cursed Edge and Hex Bolt |
| Self: has [status] | Self | Tactician I | "Self: has Kindled → Doom" |
| Self: without [status] | Self | Tactician I | "Self: without Hidden → Vanish" |
| Self: fewer than N thralls | — | Tactician I, once a Gravecaller has joined | Raise Thrall |

#### Ally
| Condition | Picks | Unlocks | Use it for |
|---|---|---|---|
| Ally: health below X% | The most hurt such ally | Start, at 50% | Mend, Guard |
| Ally: most hurt | That ally | Reward, I-10 | Benediction on whoever needs it most |
| Ally: fallen | The first fallen ally | Event: the first time a character falls | Last Rites |
| Ally: has [status] | That ally | Tactician I | Purify on Doomed, Shelter on Guarding, Cover on Marked |
| Ally: without [status] | That ally | Tactician I | "Ally: without Hasted → Haste" |
| Ally: mana below X% | The lowest such ally | Tactician II | Share the Flame |
| Ally: highest Power | That ally | Reward, Region III | Haste, Light the Way or Cover on the hardest hitter |

#### Foe
| Condition | Picks | Unlocks | Use it for |
|---|---|---|---|
| Front foe | The nearest front-row foe | Start | Cleave, Shield Bash |
| Foe: lowest health | That foe | Start | Finishing a foe off |
| Foe: health below X% | The lowest such foe | Tactician I | Finishing Blow |
| Foe: highest health | That foe | Tactician II | Doom, where it has time to tick |
| Foe: highest attack | That foe | Reward, I-8 | Wither, Pinning Shot |
| Foe: charging a big attack | The charger | Reward, the Sexton | Shield Toss, Dazzle, Lunge |
| Foe: undead | The nearest | Reward, I-2 | Judgement |
| Foe: spirit | The nearest | Reward, Region II | Sunburst, Flare with Moth-Light |
| Foe: beast | The nearest | Reward, Region III | Barbed Bolt with Hunter |
| Foe: in the back row | The nearest | Reward, I-6 | Lunge, Drag Out |
| Foe: boss or elite | That foe | Reward, the Gravewarden | Mark Quarry, Wither |
| Foe: healer | The nearest | Reward, Region II | Hush, Drag Out, Pinning Shot |
| Foe: acts next | The foe first on the turn strip | Reward, Region III | Shield Bash, Pinning Shot |
| Foe: the leader's target | The foe the party leader (the first hero still standing) last attacked | Tactician I | Everyone hitting the same foe, as in the design's example |
| Foe: has [status] | That foe | Tactician II | "Foe: has Exposed → Reckless Swing" |
| Foe: without [status] | That foe | Tactician I | "Foe: without Doomed → Doom" |

#### Battle
These describe the whole battle or the push, so they only decide whether a rule fires. Character rules and party rules can both use them, except the four "between battles" conditions, which only party rules use.

| Condition | Unlocks | Use it for |
|---|---|---|
| Always | Start | Kindle, or any skill that should fire whenever it can |
| N or more foes present | Reward, I-4 | Cleave, Hex Swarm, Scatter Shot |
| One foe left | Tactician I | Going all in on the last foe |
| Boss present | Reward, the Sexton | Saving big skills for the boss |
| Battle start | Tactician II | Opening buffs: Kindle, Stand Fast |
| Foes enraged | Reward, Region II | Spending everything once foes start hitting harder |
| N or more allies below X% health | Tactician II | Hymn of Rest, Stand Fast |
| Fewer than N allies standing | Reward, Region IV | Last stands: Unbroken, Martyrdom |
| Between battles: any character at X+ fatigue | Start, with party rules | Return to base |
| Between battles: an ally fell | Tactician I | Return to base before knock-out fatigue piles up |
| Between battles: out of [item] | Tactician I | Return to base, once items are drawn from the Bag |
| Between battles: next stage has a boss or elite | Reward, I-12 | Switch rule set, or return to base |

#### Unlock pacing
| Source | Conditions taught |
|---|---|
| Start | Always (agreed in step 2), Self: health below 50%, Ally: health below 50%, Front foe, Foe: lowest health, and for party rules, any character at X+ fatigue |
| Tactician I (early Region I) | Thresholds, Self: mana below, Self: row, Self: has / without, Self: fewer than N thralls, Ally: has / without, Foe: health below, Foe: the leader's target, Foe: without, One foe left, an ally fell, out of an item |
| Tactician II (Region II) | Self: health above, Ally: mana below, Foe: highest health, Foe: has, Battle start, N or more allies below X% |
| Region I | Foe: undead, N or more foes, Foe: in the back row, Foe: highest attack, Ally: most hurt, next stage has a boss, Foe: boss or elite (the Gravewarden), Foe: charging and Boss present (the Sexton), Ally: fallen (first knock-out) |
| Region II | Foe: spirit, Foe: healer, Foes enraged |
| Region III | Foe: beast, Foe: acts next, Ally: highest Power |
| Region IV | Fewer than N allies standing |
| Region V | Nothing new: the last region tests what you've built |

Each Tactician lesson costs gold and the region's material *(tune)*.

### Actions
#### Character rule actions *(tune)*
| Action | Effect | Unlocks |
|---|---|---|
| Use [skill] | Uses an equipped skill on the target the condition picked, or by default targeting. | Start |
| Basic attack | Steers the basic attack, for example "Foe: healer → Bolt". | Start |
| Defend | Braced (−30% damage taken) until its next turn, and restores mana like a basic attack. | Start |
| Move | Swaps places with the nearest ally in the other row, or steps into an empty slot there. Uses the turn. | Tactician I |
| Gather | Doesn't attack, and restores twice the basic attack's mana. | Tactician II |

#### Party rules
- **When they act:** between turns, as step 2 built them. Using an item takes no one's turn.
- **Between-battle rules** are checked after each battle. If one fires, the push ends and the party walks home.
- **Slots:** 2 to start, rising to 5 with Tactician upgrades, as built *(tune)*.
- Party rules use Ally, Foe and Battle conditions, never Self.

| Party action | Effect | Unlocks |
|---|---|---|
| Use an item | On the ally the condition picked, else the most hurt ally (the first fallen ally for Smelling Salts). | With party rules |
| Focus fire | The foe the condition picked becomes everyone's target until it falls, for every single-target rule whose own condition doesn't pick a foe. | Tactician I |
| Return to base | Ends the push after this battle. | With party rules |
| Switch rule set | Every character loads their saved rule set with that name. | Tactician III |

#### Party items *(tune)*
As step 2 built them, the party brings a **loadout** into each battle: 2 slots to start, up to 4. Each slot holds one use per battle and refills for free for now. You can use an item by hand at any moment, even while paused, by tapping it and then a hero, and party rules can use items automatically.

| Item | Effect |
|---|---|
| Healing Draught | Restores 40% of one ally's health. |
| Smelling Salts | A fallen ally gets back up with 30% health. |
| Lamp Oil | Every ally gains 20 mana. |
| Bitter Tincture | Removes all harmful statuses from one ally. New in this draft. |

Items are bought at the home base's shop, and building upgrades can brew them. Once the economy is in, loadout slots draw from the Bag instead of refilling for free.

#### Saved rule sets
Each character can save up to 3 named rule sets *(tune)*, and the party can save its own. "Switch rule set" lets a push change tactics on its own, for example before a boss.

### Foe families
Three conditions and several skills care whether a foe is undead, a spirit or a beast. Proposed families for the foes that already have art:

| Region | Undead | Spirit | Beast | None of these |
|---|---|---|---|---|
| I Gravefields | Ghoul, Restless Bones, the Gravewarden | | Grave Rats | The Sexton |
| II Drowned Chapel | Drowned Acolyte, Bloated Corpse, the Drowned Bishop | Bell Wraith, Choir of Silt | | |
| III Thornwood | The Hanged Man | | Briar Wolf, the Antlered One | Thorn Witch, Mother Bramble |
| IV Ashen Keep | Ash Knight, Flayed Squire, the Burnt Marshal | | Cinder Hound | The Kiln Warden |
| V Hollow Throne | Bone Herald, Kingsguard Revenant | Hollow Courtier, Crowned Shade, the Hollow King | | |
| Anywhere | | | Moth Swarm | Cage Mimic |

Each region leans one way, so the best party shifts as you travel: the Pilgrim shines in I, II and IV, the Lamplighter's light in II and V, and the Crossbowman's Hunter passive in III.

## 6. Items

92 items: 42 weapons, 15 armour, 30 accessories (12 of them class-only) and 5 Relics.

### How items work
- **Slots:** weapon, armour and accessory.
- **Weapons** are tied to classes: each class uses one weapon type. A combined character can use the weapon types of all its classes.
- **Armour:** any class can wear any weight, and the weight's trade-off is the only limit. Each piece still leans toward some classes through its effects: Bastion Plate's Guard bonus suits a Warden, Penitent's Rags a healer.
- **Accessories** suit anyone, except the 12 class-only ones.
- **Item strength (placeholder, still open):** the same item can drop anywhere. Its plain stats (Power, Health, Defense, Mana) grow with the level of the stage it dropped from: × (1 + item level ÷ 15) *(tune)*, which keeps pace with characters all the way to level 200. Its special effect stays the same. The tables show a level-1 drop.
- **Unwanted items** sell for gold.
- **Rarity:**
  - **Common** items have plain stats.
  - **Fine** items add a small conditional bonus.
  - **Rare** items carry a strong bonus with a real cost.
  - **Relics** are unique and build-defining, and each comes with a twist. Each region's boss drops its Relic on the first clear. You can own only one copy, so it doesn't drop again.

| Region | Common | Fine | Rare *(tune)* |
|---|---|---|---|
| I | 70% | 25% | 5% |
| II | 55% | 35% | 10% |
| III | 45% | 40% | 15% |
| IV | 35% | 45% | 20% |
| V | 25% | 50% | 25% |

### Weapons *(tune)*
#### Swords: Sellsword
| Item | Rarity | Stats | Effect |
|---|---|---|---|
| Notched Sword | Common | +4 Power | |
| Hireling's Sabre | Fine | +5 Power, +3% Crit | On a kill: restore 10 mana. |
| Headsman's Blade | Rare | +7 Power | +35% damage to foes below 30% health. −15% damage to foes above 70% health. |
| Gravecutter | Rare | +9 Power | Cleave and other front-row skills +20% damage. −1 Speed, −4% Dodge. |

#### Cursed blades: Hexblade
| Item | Rarity | Stats | Effect |
|---|---|---|---|
| Rusted Sickle | Common | +3 Power, +5 Mana | |
| Hexed Kris | Fine | +4 Power | Doom the Hexblade applies lasts 1 turn longer. |
| Witch-iron Sickle | Rare | +6 Power | Doom ticks +25%. Max health −10%. |
| Mourning Blade | Rare | +5 Power, +10 Mana | When a foe the Hexblade Doomed falls: restore 15 mana. Hex Bolt −20% damage. |

#### Censers: Pilgrim
| Item | Rarity | Stats | Effect |
|---|---|---|---|
| Tin Censer | Common | +3 Power, +5 Mana | |
| Chapel Censer | Fine | +3 Power, +8 Mana | Healing +10%. |
| Drowned Censer | Rare | +4 Power, +10 Mana | Heals on allies below 30% health +35%. Heals on allies above 70% health −25%. |
| Ember Thurible | Rare | +6 Power | Smite also heals the most hurt ally for 30% of its damage. Mend costs 5 more. |

#### Maces and shields: Warden
| Item | Rarity | Stats | Effect |
|---|---|---|---|
| Iron Mace and Buckler | Common | +3 Power, +2 Defense | |
| Watchman's Flail | Fine | +3 Power, +3 Defense | While Guarding: a further −10% damage taken. |
| Tower Shield and Maul | Rare | +2 Power, +7 Defense, +20 Health | −2 Speed. |
| Spiked Bulwark | Rare | +4 Power, +4 Defense | Foes that hit the Warden take 0.3× back. Healing received −15%. |

#### Lanterns: Lamplighter
| Item | Rarity | Stats | Effect |
|---|---|---|---|
| Tin Lantern | Common | +3 Power, +2% Dodge | |
| Shuttered Lantern | Fine | +3 Power, +8 Mana | Kindle also restores 5 mana to each ally. |
| Moth-lure Lantern | Rare | +5 Power | Foes the Lamplighter hits are Exposed for 1 turn. Spirits aim every single-target attack at the Lamplighter. |
| Bonfire Lantern | Rare | +6 Power | Kindled gives +40% instead of +30%. Kindle costs 10 more. |

#### Crossbows: Crossbowman
| Item | Rarity | Stats | Effect |
|---|---|---|---|
| Hunting Crossbow | Common | +4 Power | |
| Windlass Crossbow | Fine | +7 Power | −1 Speed. |
| Repeater | Rare | +3 Power, +1 Speed | Rapid Fire, Scatter Shot and Volley +20% damage. Aimed Shot −20%. |
| Arbalest of the Keep | Rare | +10 Power | −2 Speed. First 2 turns: +25% crit chance. |

#### Rapiers: Duellist
| Item | Rarity | Stats | Effect |
|---|---|---|---|
| Practice Rapier | Common | +3 Power, +3% Dodge | |
| Fencer's Smallsword | Fine | +4 Power, +4% Dodge | After a dodge, the next attack deals +20%. |
| Main-gauche | Rare | +5 Power, +6% Dodge | Counters deal +30%. Max health −10%. |

#### Flasks: Alchemist
| Item | Rarity | Stats | Effect |
|---|---|---|---|
| Clay Flasks | Common | +4 Power | |
| Glass Grenadoes | Fine | +5 Power | Burning the Alchemist applies lasts 1 turn longer. |
| Witchfire Satchel | Rare | +7 Power | Area skills +20% damage. The Alchemist starts each battle Burning (2 turns). |

#### Bonesaws: Barber-Surgeon
| Item | Rarity | Stats | Effect |
|---|---|---|---|
| Rusty Bonesaw | Common | +3 Power, +5 Mana | |
| Surgeon's Kit | Fine | +3 Power, +8 Mana | Cleanses also heal 1.0×. |
| Butcher's Saw | Rare | +6 Power | Lancet Throw applies Bleeding (2 turns, 0.2×). Heals cost 3 more. |

#### Handbells: Bellringer
| Item | Rarity | Stats | Effect |
|---|---|---|---|
| Brass Handbell | Common | +3 Power, +5 Mana | |
| Vesper Bell | Fine | +3 Power, +8 Mana | The Bellringer's push-backs are 10% stronger. |
| Cracked Chapel Bell | Rare | +5 Power | Stunned foes take +25% damage from everyone. The Bellringer is Slowed for the first 2 turns. |

#### Bone staves: Gravecaller
| Item | Rarity | Stats | Effect |
|---|---|---|---|
| Femur Staff | Common | +4 Power | |
| Ossuary Rod | Fine | +4 Power, +8 Mana | Thralls have +15% health. |
| Barrow-king's Staff | Rare | +6 Power | Thralls deal +25% damage. The Gravecaller takes +15% damage. |

#### Daggers: Cutpurse
| Item | Rarity | Stats | Effect |
|---|---|---|---|
| Rusty Shiv | Common | +4 Power | |
| Twin Stilettos | Fine | +5 Power, +3% Crit | Backstab +15% damage. |
| Widow's Kiss | Rare | +6 Power | Poison the Cutpurse applies ticks 30% harder. Max health −10%. |

### Armour *(tune)*
| Weight | Baseline | Trade-off |
|---|---|---|
| Light | +10 Health, +5% Dodge | Little protection, but Dodge stops hits and the statuses they carry |
| Medium | +20 Health, +2 Defense, −2% Dodge | Balanced, at a little Dodge |
| Heavy | +35 Health, +4 Defense, −1 Speed | The most protection, at the cost of turns |

| Item | Weight | Rarity | Stats | Effect |
|---|---|---|---|---|
| Traveller's Coat | Light | Common | +10 Health, +5% Dodge | |
| Gravedigger's Leathers | Light | Fine | +12 Health, +6% Dodge | Below 50% health: +6% more Dodge. |
| Penitent's Rags | Light | Fine | +6 Health, +3% Dodge | Healing done +15%. Max health −8%. |
| Shadowweave Cloak | Light | Rare | +8 Health, +12% Dodge | Each dodge restores 5 mana. Healing received −20%. |
| Moth-silk Robe | Light | Rare | +10 Health, +4% Dodge, +12 Mana | First 2 turns: +2 Speed. −2 Defense. |
| Brigandine | Medium | Common | +20 Health, +2 Defense, −2% Dodge | |
| Hunter's Hauberk | Medium | Fine | +18 Health, +2 Defense, +3% Crit, −2% Dodge | +10% damage against beasts. |
| Sellsword's Jack | Medium | Fine | +22 Health, +2 Defense, −2% Dodge | In the front row: +10% damage. |
| Drowned Mail | Medium | Rare | +25 Health, +3 Defense, −2% Dodge | Bleeding and Doom deal 50% less to the wearer. −1 Speed. |
| Thornmail | Medium | Rare | +20 Health, +3 Defense, −4% Dodge | Melee attackers take 0.25× the wearer's Power. |
| Rusted Plate | Heavy | Common | +35 Health, +4 Defense, −1 Speed | |
| Gravewarden's Plate | Heavy | Fine | +40 Health, +5 Defense, −1 Speed | Fatigue gained −15%. |
| Ashen Plate | Heavy | Rare | +45 Health, +6 Defense, −1 Speed | In the front row: −15% damage taken. In the back row: +15%. |
| Bastion Plate | Heavy | Rare | +55 Health, +7 Defense, −2 Speed | While Guarding: a further −15% damage taken. |
| Penance Plate | Heavy | Rare | +65 Health, +5 Defense, −1 Speed | Healing received −30%. |

### Accessories *(tune)*
The first five Fine accessories are the design's own examples.

| Item | Rarity | Effect |
|---|---|---|
| Bone Charm | Common | +15 Health. |
| Knucklebone Die | Common | +4% Crit. |
| Hare's Foot | Common | +4% Dodge. |
| Prayer Beads | Common | +10 Mana. |
| Vanguard's Badge | Fine | In the front row: +25% damage, −1 Speed. |
| Last-breath Locket | Fine | Below 30% health: +40% damage. |
| Courier's Spur | Fine | First 2 turns: +6 Speed. |
| Tallow Coin | Fine | On a kill: restore 10 mana. |
| Halberdier's Hook | Fine | Melee skills work from the back row, at −30% damage. |
| Duellist's Ring | Fine | At full health: +15% damage. Below 50% health: −10% damage. |
| Wax Ear-stoppers | Fine | Immune to Silenced and Dazzled. −5% Crit. |
| Blessed Bandage | Fine | +30% Bleed resistance. |
| Saint's Medal | Fine | +30% Curse resistance. Healing received −5%. |
| Hobnailed Boots | Fine | +25% Stun and Move resistance. −3% Dodge. |
| Ironbound Collar | Rare | Can't be staggered or Stunned. −1 Speed. |
| Ember Heart | Rare | +15% damage. Loses 3% of max health at the start of each turn. |
| Mourner's Veil | Rare | Fatigue gained −30%. Damage dealt −10%. |
| Gambler's Coin | Rare | Crits deal ×2.0 instead of ×1.6. Hits that don't crit deal −10%. |

#### Class-only accessories
| Item | Class | Rarity | Effect |
|---|---|---|---|
| Blood Contract | Sellsword | Rare | Each kill: +10% Power for the rest of the battle, up to 3 times. Can't be healed above 75% health. |
| Witch's Knot | Hexblade | Rare | Hex Swarm and Contagion cost 8 less. Harmful statuses on the Hexblade last 1 turn longer. |
| Saint's Finger-bone | Pilgrim | Rare | Last Rites raises with 20% more health. −1 Speed. |
| Oathbound Gorget | Warden | Rare | Guard and Cover cost 5 less. The Warden can't leave the front row. |
| Wick Shears | Lamplighter | Rare | Light the Way also Hastes the ally for 2 turns. Max health −15%. |
| Quiver of Black Bolts | Crossbowman | Rare | Aimed Shot also applies Bleeding (3 turns, 0.35×). Bolt −10% damage. |
| Fencing Glove | Duellist | Rare | Challenge also leaves the Duellist Parrying 1 attack. −1 Speed. |
| Philosopher's Pebble | Alchemist | Rare | Quick Brew also Wards the ally, absorbing 1.0×. Max health −10%. |
| Surgeon's Apron | Barber-Surgeon | Rare | Cleanses cost 5 less. Healing the Surgeon receives −20%. |
| Bell-rope | Bellringer | Rare | Toll also Slows for 1 turn. Toll costs 5 more. |
| Phylactery | Gravecaller | Rare | Thralls rise Fortified for 2 turns. −1 Speed. |
| Fence's Ledger | Cutpurse | Rare | Gold the Cutpurse steals +50%. The Cutpurse starts each battle Exposed for 1 turn. |

### Relics *(tune)*
| Relic | Slot | Dropped by | Effect |
|---|---|---|---|
| Gravedigger's Spade | Accessory | The Sexton (I) | When an ally falls, the wearer is Hasted and deals +20% damage for the rest of the battle. Fatigue gained +20%. |
| Bishop's Crozier | Censer: Pilgrim | The Drowned Bishop (II) | +8 Power, +15 Mana. Last Rites costs 15 less and raises with 50% health, but each raise leaves the Pilgrim Doomed (3 turns, 0.4×). |
| Bark of the Old God | Medium armour | The Antlered One (III) | +40 Health, +4 Defense. Heals 4% of max health at the start of each turn. Healing from others −50%. |
| Marshal's Ashen Blade | Sword: Sellsword | The Burnt Marshal (IV) | +12 Power. Each hit also deals 25% of its damage to the other front-row foe. Loses 2% of max health at the start of each turn. |
| The Hollow Crown | Accessory | The Hollow King (V) | Every stat +10%. Fatigue gained ×2. |

## 7. Fatigue and content

The design builds fatigue from the damage a character takes, measured against their max health. That one rule shapes how classes and items play over a long push.

- **What counts:** every point of health lost, including Bleeding, Doom, Burning, Poisoned and self-inflicted costs such as Martyrdom, Blood Price, Bloodlust and Elixir of Fury. Being knocked out adds a large amount on top.
- **What doesn't count:** damage a Ward absorbs, and hits that are dodged or miss. Guard and Cover move damage, and so fatigue, onto the Warden. Thralls build none.
- **Healing doesn't remove fatigue.** Avoiding damage beats healing it, so Dazzle, Shelter, Guard and Dodge matter more the longer a push runs.
- **Scale, as an example:** a battle adds 20 fatigue per full max-health of damage taken, and a knock-out adds 15 *(tune)*.

| Effect on fatigue | Content |
|---|---|
| Lowers it | Iron Will (Warden), Comfort and Peaceful Rest (Pilgrim), Laudanum and House Calls (Barber-Surgeon), Gravewarden's Plate, Mourner's Veil |
| Prevents the damage | Shelter and Sanctuary (Warded), Dazzle, Smoke Pot, Guard, Cover, Brace, Stand Fast, Parry, Dodge, a thrall in the front row |
| Raises it, as a cost | Blood Price, Martyrdom, Bloodlust, Elixir of Fury, Ember Heart, Gravedigger's Spade, Marshal's Ashen Blade, the Hollow Crown |

The Warden carries fatigue best, with the largest health pool and Iron Will. The Pilgrim and Barber-Surgeon lower everyone's, and the Surgeon's House Calls even lowers it in the middle of a push. The Duellist avoids it by dodging. The Sellsword and Hexblade trade fatigue for damage.

## 8. Open questions

### Still open
You passed on these for now, so the spec keeps a placeholder for each:
- How extra rule slots are earned. The placeholder is stat points, 5 to 25 per slot.
- The rule-slot maximum for a combined character.
- Whether higher-level recruits arrive with their points spent or unspent.
- Whether an item's plain stats grow with the level of the stage it drops from (section 6).
- The Masters' Hall's lesson times and level requirements.

### Settled
- **Skill trees:** three build paths per class, one skill per path in every tier, keystones with a cost, and builds to try.
- **Levels:**
  - The cap is 200, with 1 stat point per level and 1 skill point every 5 levels.
  - Thresholds give a free respec; the respec refunds skill and stat points, but a class combination stays.
  - Classes can combine at 50 and 200.
  - At each threshold from 100 that offers one, a character may awaken one skill instead of opening a tier.
- **Combined characters** keep their first class's stats, growth, resistances and basic attack, use all their classes' weapons, and learn the new class's starter skill free.
- **Skill slots:** one more at 50 and at 200, plus Masters' Hall lessons.
- **Recruits:**
  - Level-1 stats roll, and home-base upgrades bring higher-level recruits.
  - The new classes join the recruit board region by region.
- **Statuses:**
  - Every unit has six resistances (Stun, Move, Bleed, Blight, Curse, Debuff). An effect lands on a roll of its chance minus the target's resistance, with no floor: 0% or less never lands, and 100% or more always does. Bosses resist more than other foes.
  - Bleeding stacks without limit, and healing doesn't stop it.
- **Kept as proposed:** Cover catching area hits, thralls as described, and the Cutpurse's gold and loot bonuses.
- **Rows and armour:** any class can wear any weight. Melee from the back row needs the Halberdier's Hook, except skills with reach.
- **Party rules and items:** "Always" is a starting condition and party rules fire between turns, both as step 2 built them. Items come from the shop or are brewed by buildings, and unwanted ones sell for gold.
- **Small decisions:**
  - Fatigue counting and foe families stay as proposed for now.
  - Two of one class can share a party.
  - Health resets before every battle.
- **Retired:** capstones are gone, and Defense scales with the attacker's level.

## Appendix: notes for the build

- **`docs/design.md` needs updating** in section 5. It still describes universal points and a second skill slot "at a later level". The levels, points, thresholds, combining, awakenings and the Masters' Hall above replace that.
- **Skills:** each prototype class's two skills become its starter and its second tier-1 active, with the same numbers at level 1.
- **Stats:** the prototype's stats are the level-1 averages here. Only the Warden's Dodge moves, from 0 to a 0–2% range.
- **Rule slots** use step 2's numbers: the Warden starts with 2 and the Crossbowman goes up to 5.
- **Statuses:** Doom, Dazzled, Kindled, Guarding, Charging and Marked keep their prototype numbers. Bleeding now stacks without limit, and healing no longer stops it. The rest are new.
- **Conditions:** step 2 built 20 of the 42. Add the rest to `CONDITIONS`.
- **Items:** keep step 2's Healing Draught, Smelling Salts and Lamp Oil, and add the Bitter Tincture.
- **Defense:** damage × K ÷ (K + Defense), with K = 20 + the attacker's level.
- **New engine pieces:**
  - **Skills:** skill levels and awakenings, and several class trees on one character.
  - **Resistances:** six per unit, and a landing roll for every harmful effect, clamped to 0–100% with no floor.
  - **Summons:** thralls and corpses.
  - **New statuses:** Taunted, Hidden, Confused and Parrying.
  - **New kinds of effect:** multi-hit skills, position swaps, timeline jumps, the hero charge, health-cost skills, once-per-battle effects and kill triggers.
  - **Economy hooks:** the Cutpurse's gold and item rewards.
