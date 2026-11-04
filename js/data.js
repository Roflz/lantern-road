'use strict';
// Lantern Road · game data: formation, statuses, foe skills, rule conditions, items, foes and stages.
// The twelve classes and their skill trees live in js/classes.js.
// docs/design.md and docs/content-spec.md are the source of truth. Numbers here are starting values to tune in
// play-testing.

// ── Formation
// Each side has six slots. Slots 0–1 are the front row and 2–5 the back row.
// LANE is each slot's left-to-right position on screen. A character who picks "the nearest foe" prefers
// the one in the closest lane.
const ROWS = ['front', 'front', 'back', 'back', 'back', 'back'];
const LANE = [-1, 1, -3, -1, 1, 3];

// ── Resistances (content spec §3)
// Every unit has six. A harmful effect lands on a roll of its chance + the attacker's bonus − the target's
// resistance: 0% or less never lands, 100% or more always does.
const RESISTS = {
  stun: { name: 'Stun', tip: 'Stunned, Confused, and having a charge broken.' },
  move: { name: 'Move', tip: 'Push-backs on the turn strip, swaps and forced row changes.' },
  bleed: { name: 'Bleed', tip: 'Bleeding.' },
  blight: { name: 'Blight', tip: 'Poisoned and Burning.' },
  curse: { name: 'Curse', tip: 'Doomed and Festering.' },
  debuff: { name: 'Debuff', tip: 'Weak, Exposed, Corroded, Slowed, Dazzled, Silenced, Taunted and Quarry.' },
};
const RES_KEYS = Object.keys(RESISTS);

// ── Statuses
// What each one does lives in the simulation (js/sim.js); this is how it is named and explained.
//   bad   harmful: resistances, cleansing and "harmful status" counts apply to it
//   res   the resistance that decides whether it lands (none: it always lands)
//   time  when it runs out: 'tick' damage or healing at the start of the owner's turn, then counts down;
//         'start' ends when the owner's next turn starts; 'end' (the default) counts down at the end of each of the
//         owner's turns, skipping the turn it came on; 'use' runs out as it is used
//   v     its usual strength, where it has one (percent). stack: every application adds a stack.
//   tag   the word that floats up when it lands (none: only its icon shows)
const STATUSES = {
  // harmful
  bleed: { name: 'Bleeding', icon: 'bleed', bad: true, res: 'bleed', time: 'tick', stack: true, tag: 'Bleed', tip: 'Loses health at the start of each turn. Every application adds a stack with its own damage and length.' },
  doom: { name: 'Doom', adj: 'Doomed', icon: 'doom', bad: true, res: 'curse', time: 'tick', tag: 'Doom', tip: 'A curse: one heavy tick at the start of each turn.' },
  burn: { name: 'Burning', icon: 'fire', bad: true, res: 'blight', time: 'tick', tag: 'Burning', tip: 'Loses health at the start of each turn. Fire skills hit it harder.' },
  poison: { name: 'Poisoned', icon: 'poison', bad: true, res: 'blight', time: 'tick', tag: 'Poison', tip: 'Loses health at the start of each turn, and each tick is 25% stronger than the last.' },
  dazzled: { name: 'Dazzled', icon: 'dazzle', bad: true, res: 'debuff', tag: 'Dazzled', tip: '40% of its attacks miss.' },
  weak: { name: 'Weak', icon: 'weak', bad: true, res: 'debuff', v: 25, tag: 'Weak', tip: 'Deals 25% less damage.' },
  exposed: { name: 'Exposed', icon: 'exposed', bad: true, res: 'debuff', v: 25, tag: 'Exposed', tip: 'Takes 25% more damage and can’t dodge.' },
  corroded: { name: 'Corroded', icon: 'acid', bad: true, res: 'debuff', v: 30, tag: 'Corroded', tip: 'Defense −30%.' },
  slowed: { name: 'Slowed', icon: 'slow', bad: true, res: 'debuff', v: 30, tag: 'Slowed', tip: 'Speed −30%.' },
  silenced: { name: 'Silenced', icon: 'silence', bad: true, res: 'debuff', tag: 'Silenced', tip: 'Can only use its basic attack.' },
  stunned: { name: 'Stunned', icon: 'stun', bad: true, res: 'stun', time: 'use', tag: 'Stunned', tip: 'Loses its next turn.' },
  confused: { name: 'Confused', icon: 'confuse', bad: true, res: 'stun', tag: 'Confused', tip: 'Its next single-target attack picks a random target from everyone on the field.' },
  festering: { name: 'Festering', icon: 'fester', bad: true, res: 'curse', tag: 'Festering', tip: 'Healing it receives is halved.' },
  taunted: { name: 'Taunted', icon: 'taunt', bad: true, res: 'debuff', tag: 'Taunted', tip: 'Must aim its single-target attacks at the taunter.' },
  quarry: { name: 'Quarry', icon: 'quarry', bad: true, res: 'debuff', v: 20, tag: 'Quarry', tip: 'Every attacker gets +20% crit chance against it.' },
  charging: { name: 'Charging', icon: 'charge', bad: true, time: 'use', tag: 'Charging', tip: 'Gathering a big attack. It lands on its next turn.' },
  marked: { name: 'Marked', icon: 'mark', bad: true, time: 'use', tag: 'Marked', tip: 'A charging attack has picked this one.' },
  deathmark: { name: 'Marked for Death', icon: 'skull', bad: true, time: 'use', tag: 'Marked', tip: 'The Sellsword’s mark: it takes extra damage from them until it falls.' },
  trap: { name: 'Trapped', icon: 'trap', bad: true, time: 'use', tag: 'Trap set', tip: 'A trap springs at the start of its next turn.' },
  // helpful
  guarding: { name: 'Guarding', icon: 'shield', time: 'start', v: 30, tip: 'Takes every single-target attack aimed at an ally, at 30% less damage, until its next turn.' },
  covered: { name: 'Covered', icon: 'cover', tip: 'A Warden takes every attack aimed at this ally, area hits included.' },
  kindled: { name: 'Kindled', icon: 'kindle', v: 30, tip: 'Deals 30% more damage.' },
  hasted: { name: 'Hasted', icon: 'haste', v: 30, tag: 'Hasted', tip: 'Speed +30%.' },
  warded: { name: 'Warded', icon: 'ward', tag: 'Warded', tip: 'Absorbs damage until the Ward breaks.' },
  blessed: { name: 'Blessed', icon: 'bless', time: 'tick', tip: 'Heals at the start of each turn.' },
  braced: { name: 'Braced', icon: 'brace', v: 30, tip: 'Takes less damage.' },
  fortified: { name: 'Fortified', icon: 'fort', v: 20, tip: 'Takes 20% less damage.' },
  veiled: { name: 'Veiled', icon: 'smoke', v: 20, tip: 'Dodge +20%.' },
  hidden: { name: 'Hidden', icon: 'hidden', tag: 'Hidden', tip: 'Single-target attacks can’t aim at it. Ends when it attacks.' },
  parrying: { name: 'Parrying', icon: 'parry', time: 'use', tag: 'Parrying', tip: 'The next few single-target attacks against it miss.' },
  riposte: { name: 'Riposte', icon: 'riposte', time: 'start', tip: 'Counters each melee attacker and takes 20% less damage.' },
  retaliating: { name: 'Retaliating', icon: 'thorns', tip: 'Each foe that damages it takes damage back.' },
  unbroken: { name: 'Unbroken', icon: 'anchor', tip: 'Can’t fall below 1 health.' },
  hexward: { name: 'Hex Ward', icon: 'eye', tip: 'Each foe that hits it becomes Doomed.' },
  bloodlust: { name: 'Bloodlust', icon: 'rage', tip: 'Deals more damage.' },
  steadfast: { name: 'Holding the line', icon: 'fort', tip: 'Can’t be pushed back, Stunned or swapped, and takes 10% less damage.' },
  bastion: { name: 'Last Bastion', icon: 'shield', tip: 'Takes every attack aimed at any ally, at less damage.' },
  unyielding: { name: 'Unyielding', icon: 'anchor', tip: 'No single hit can take more than a small share of its health.' },
  immune: { name: 'Untouched', icon: 'holy', tip: 'Immune to new harmful statuses.' },
  laudanum: { name: 'Laudanum', icon: 'flask', tip: 'Takes less damage.' },
  perfect: { name: 'Perfect Counter', icon: 'riposte', tip: 'Every attack it dodges is countered.' },
  oath: { name: 'Second’s Oath', icon: 'riposte', tip: 'A Duellist counters whoever attacks this ally.' },
  mirror: { name: 'Mirror Guard', icon: 'parry', tip: 'Attacks on it use a Duellist’s Dodge.' },
  counterstorm: { name: 'Counterstorm', icon: 'riposte', tip: 'Counters every attack on any ally.' },
  resup: { name: 'Hardened', icon: 'fort', tip: 'Higher resistances.' },
  anchor: { name: 'Soul Anchor', icon: 'bone', tip: 'A thrall falls in its place.' },
};
const STATUS_KEYS = Object.keys(STATUSES);
const isBad = k => !!(STATUSES[k] && STATUSES[k].bad);

// ── Foe skills, party items and the shared actions
// shape: who a skill reaches.
//   foe     one foe            front    the front row (the back row if the front is empty)
//   back    the back row (the front row if the back is empty)
//   random3 3 random foes      foes     all foes
//   ally    one ally           allies   all allies         self   the user          fallen   every fallen ally
// range: melee attacks must hit the front row while anyone stands there; ranged and magic reach anyone.
//   reach: true lets a melee skill ignore that, and lets it be used from the back row.
// power: damage as a multiple of the user's Power. heal / healPct: healing from Power / the target's max health.
// status: applied to each target hit. selfStatus: applied to the user. stagger: pushes the target back on the
// timeline by that share of its turn. charge: spend this turn gathering; the named skill lands next turn.
// icon marks the skill on the turn flags; fx and sfx pick its animation and sound on the battle screen.
// Hero skills use the richer form described in js/classes.js; both run through the same simulation.
const SKILLS = {
  // Gravefields foes
  claw: { name: 'Claw', icon: 'claw', shape: 'foe', range: 'melee', power: 1, fx: 'claw' },
  gnaw: { name: 'Gnaw', icon: 'claw', shape: 'foe', range: 'melee', power: 1.25, cost: 15, status: { key: 'bleed', turns: 3, power: 0.3 }, fx: 'bite' },
  bite: { name: 'Bite', icon: 'claw', shape: 'foe', range: 'melee', power: 1, fx: 'bite' },
  skitter: { name: 'Skittering Swarm', icon: 'claw', shape: 'front', range: 'melee', power: 0.6, cost: 15, status: { key: 'bleed', turns: 2, power: 0.25 }, fx: 'swarm' },
  bonetoss: { name: 'Bone Toss', icon: 'bone', shape: 'foe', range: 'ranged', power: 1, fx: 'bone' },
  reassemble: { name: 'Reassemble', icon: 'bone', shape: 'self', healPct: 0.35, cost: 20, fx: 'reassemble' },
  halberd: { name: 'Halberd', icon: 'mace', shape: 'foe', range: 'melee', power: 1, fx: 'smash' },
  reaphook: { name: 'Reaping Hook', icon: 'claw', shape: 'foe', range: 'melee', reach: true, power: 1.2, cost: 20, fx: 'reap', tip: 'Hooks a foe anywhere, even in the back row.' },
  watch: { name: 'Stand Watch', icon: 'shield', shape: 'self', cost: 20, selfStatus: { key: 'guarding', turns: 1 }, fx: 'guard', tip: 'Guards its allies until its next turn.' },
  shovel: { name: 'Shovel', icon: 'mace', shape: 'foe', range: 'melee', power: 1, fx: 'smash' },
  dig: { name: 'Dig a Grave', icon: 'charge', shape: 'foe', reach: true, cost: 20, charge: 'burial', fx: 'charge', tip: 'Picks a victim and digs. Next turn: Burial.' },
  burial: { name: 'Burial', icon: 'skull', shape: 'foe', range: 'melee', reach: true, power: 3.4, fx: 'burial' },
  gravedirt: { name: 'Grave Dirt', icon: 'dazzle', shape: 'foes', range: 'ranged', power: 0.45, cost: 20, status: { key: 'dazzled', turns: 1 }, fx: 'dirt' },
  // marks: a charge that Marks this many heroes, the lowest health first, and lands on each (the Sexton's Two Graves)
  dig2: { name: 'Two Graves', icon: 'charge', shape: 'foe', reach: true, cost: 20, charge: 'burial', marks: 2, fx: 'charge', tip: 'Marks the two weakest heroes and digs. Next turn: Burial on both.' },
  grasp: { name: 'Grasp', icon: 'claw', shape: 'foe', range: 'melee', power: 1, fx: 'claw' },
  crushblow: { name: 'Crushing Blow', icon: 'mace', shape: 'foe', range: 'melee', power: 1.9, cost: 20, fx: 'crush', tip: 'One heavy blow.' },
  peck: { name: 'Peck', icon: 'claw', shape: 'foe', range: 'melee', reach: true, power: 0.8, fx: 'peck' },
  dive: { name: 'Carrion Dive', icon: 'claw', shape: 'foe', range: 'melee', reach: true, power: 1.1, cost: 15, fx: 'dive', tip: 'Flies over the front row to any hero.' },
  keen: { name: 'Keen', icon: 'bell', shape: 'foe', range: 'magic', power: 0.8, fx: 'wail' },
  // (its id isn't 'dirge': that is the Bellringer's passive, and the shared id let the passive replace this skill, so
  // in build step 6 the Mourner never kindled anyone. Fixed in step 7, at +15% so Region I keeps its step 6 balance.)
  mdirge: { name: 'Dirge', icon: 'kindle', shape: 'allies', cost: 25, st: [{ k: 'kindled', t: 2, v: 15 }], fx: 'dirge', tip: 'Every foe is Kindled for 2 turns: +15% damage.' },
  shallowgrave: { name: 'Shallow Grave', icon: 'charge', shape: 'foe', reach: true, cost: 20, charge: 'shallowburial', fx: 'charge', tip: 'Marks a hero and digs. Next turn: Shallow Burial.' },
  shallowburial: { name: 'Shallow Burial', icon: 'skull', shape: 'foe', range: 'melee', reach: true, power: 2.4, fx: 'burial' },
  gnawingtide: { name: 'Gnawing Tide', icon: 'claw', shape: 'front', range: 'melee', power: 0.7, cost: 20, status: { key: 'bleed', turns: 2, power: 0.25 }, fx: 'swarm' },
  // call: foes this calls into empty foe slots, front row first, at the caller's level. They drop no spoils.
  callswarm: { name: 'Call the Swarm', icon: 'claw', shape: 'self', cost: 20, call: { key: 'rats', n: 2 }, fx: 'call', tip: 'Grave Rats rise in up to 2 empty foe slots.' },
  flutter: { name: 'Flutter', icon: 'claw', shape: 'foe', range: 'melee', reach: true, power: 0.7, fx: 'peck' },
  wingdust: { name: 'Wing Dust', icon: 'dazzle', shape: 'foes', range: 'ranged', power: 0.3, cost: 20, status: { key: 'dazzled', turns: 1 }, fx: 'dust' },
  snap: { name: 'Snap', icon: 'claw', shape: 'foe', range: 'melee', power: 1, fx: 'bite' },
  clangshut: { name: 'Clang Shut', icon: 'brace', shape: 'self', cost: 15, st: [{ k: 'braced', t: 2, v: 40 }], fx: 'guard', tip: 'Braced: −40% damage taken for 2 turns.' },
  // Region II: the Drowned Chapel (campaign spec §4.3)
  brinebolt: { name: 'Brine Bolt', icon: 'wave', shape: 'foe', range: 'magic', power: 0.85, fx: 'brine' },
  hymn: { name: 'Drowned Hymn', icon: 'cross', shape: 'allies', heal: 0.8, cost: 30, fx: 'hymn', tip: 'Heals every foe.' },
  slam: { name: 'Slam', icon: 'mace', shape: 'foe', range: 'melee', power: 1, fx: 'smash' },
  burst: { name: 'Burst', icon: 'burst', shape: 'foes', range: 'magic', power: 0.8, selfDestruct: true, fx: 'burst', tip: 'Bursts, hitting every hero, and is destroyed.' },
  wail: { name: 'Wail', icon: 'bell', shape: 'foe', range: 'magic', power: 1, fx: 'wail' },
  wraithtoll: { name: 'Toll', icon: 'bell', shape: 'foes', range: 'magic', power: 0.25, cost: 30, push: 0.2, fx: 'toll', tip: 'Hits every hero and pushes each one’s next turn back.' },
  psalter: { name: 'Psalter', icon: 'book', shape: 'foe', range: 'magic', power: 0.9, fx: 'psalter' },
  vow: { name: 'Vow of Silence', icon: 'silence', shape: 'foe', range: 'magic', power: 0.4, cost: 25, st: [{ k: 'silenced', t: 2 }], fx: 'vow', tip: 'Silences a hero for 2 turns: basic attacks only. It goes for healers.' },
  chant: { name: 'Silt Chant', icon: 'wave', shape: 'foe', range: 'magic', power: 0.9, fx: 'brine' },
  requiem: { name: 'Requiem', icon: 'doom', shape: 'foes', range: 'magic', power: 0.45, cost: 30, status: { key: 'doom', turns: 2, power: 0.25 }, fx: 'requiem', tip: 'Hits and Dooms every hero.' },
  // drain: mana taken from each hero hit. drainHeal: the share of its max health the user heals for every 10 mana drained.
  latch: { name: 'Latch', icon: 'claw', shape: 'foe', range: 'melee', power: 1, drain: 10, fx: 'latch', tip: 'Drains 10 mana.' },
  drainfont: { name: 'Drain the Font', icon: 'mana', shape: 'foes', range: 'magic', power: 0.4, cost: 20, drain: 15, drainHeal: 0.012, fx: 'drainfont', tip: 'Drains 15 mana from every hero, and heals on it.' },
  crozier: { name: 'Crozier', icon: 'mace', shape: 'foe', range: 'melee', power: 1, fx: 'smash' },
  baptism: { name: 'Baptism', icon: 'charge', shape: 'foe', reach: true, cost: 25, charge: 'drown', fx: 'charge', tip: 'Picks a victim and calls up the font. Next turn: Drown.' },
  drown: { name: 'Drown', icon: 'wave', shape: 'foe', range: 'magic', power: 3.4, fx: 'drown' },
  font: { name: 'Font of Brine', icon: 'wave', shape: 'foes', range: 'magic', power: 0.5, cost: 25, fx: 'font', tip: 'Floods every hero.' },
  font2: { name: 'Font of Brine', icon: 'wave', shape: 'foes', range: 'magic', power: 0.5, cost: 25, push: 0.25, fx: 'font', tip: 'The font overflows: it floods every hero and pushes their turns back.' },
  raise: { name: 'Raise the Drowned', icon: 'holy', shape: 'ally', revive: 0.5, cost: 35, fx: 'raise', tip: 'Raises a fallen foe with half its health.' },
  // Region III: Thornwood
  packtear: { name: 'Pack Tear', icon: 'claw', shape: 'foe', range: 'melee', power: 0.8, cost: 15, status: { key: 'bleed', turns: 3, power: 0.3 }, fx: 'packtear', tip: 'Bleeds a hero, and hits 15% harder for every other wolf standing.',
    mult: (E, u) => 1 + 0.15 * E.heroes(u).filter(x => x !== u && x.key === 'briarwolf').length },
  thornlash: { name: 'Thorn Lash', icon: 'thorns', shape: 'foe', range: 'magic', power: 1, fx: 'thornlash' },
  entangle: { name: 'Entangle', icon: 'slow', shape: 'front', range: 'magic', power: 0.5, cost: 20, st: [{ k: 'slowed', t: 2 }], fx: 'entangle', tip: 'Vines slow your front row for 2 turns.' },
  witchbloom: { name: 'Rot Bloom', icon: 'poison', shape: 'foe', range: 'magic', cost: 25, st: [{ k: 'poison', t: 3, p: 0.3 }], fx: 'rotbloom', tip: 'Poisons a hero for 3 turns. Each tick is stronger than the last.' },
  noose: { name: 'Noose', icon: 'claw', shape: 'foe', range: 'melee', reach: true, power: 1, fx: 'noose' },
  gallows: { name: 'Gallows Drop', icon: 'stun', shape: 'foe', range: 'melee', reach: true, power: 1.2, cost: 25, st: [{ k: 'stunned', t: 1 }], fx: 'gallows', tip: 'Drops onto a hero and stuns them. It goes for the back row.' },
  willlight: { name: 'Will-light', icon: 'orb', shape: 'foe', range: 'magic', power: 0.9, fx: 'willlight' },
  // pull: draws a back-row hero into the front row, trading places; Move resistance resists it.
  lure: { name: 'Lure', icon: 'lantern', shape: 'foe', range: 'magic', cost: 20, pull: true, pick: (E, u, x) => x.row === 'back', fx: 'lure', tip: 'Draws a back-row hero into the front row. Move resistance resists it.' },
  thornslam: { name: 'Thorn Slam', icon: 'mace', shape: 'foe', range: 'melee', power: 1, fx: 'smash' },
  bramblehide: { name: 'Bramble Hide', icon: 'thorns', shape: 'self', cost: 20, st: [{ k: 'retaliating', t: 2, v: 0.4 }], fx: 'bramble', tip: 'Thorns for 2 turns: whoever hits her takes 0.4× back.' },
  rotcloud: { name: 'Rot Bloom', icon: 'poison', shape: 'foes', range: 'magic', cost: 30, st: [{ k: 'poison', t: 2, p: 0.25 }], fx: 'rotcloud', tip: 'Poisons every hero for 2 turns.' },
  gore: { name: 'Gore', icon: 'claw', shape: 'foe', range: 'melee', power: 1, fx: 'gore' },
  thundercharge: { name: 'Thundering Charge', icon: 'charge', shape: 'front', range: 'melee', cost: 25, charge: 'thunderhit', fx: 'charge', tip: 'Lowers its head at your front row. Next turn: a charge that stuns them all.' },
  thunderhit: { name: 'Thundering Charge', icon: 'stun', shape: 'front', range: 'melee', power: 2, st: [{ k: 'stunned', t: 1 }], fx: 'thunder' },
  antlerrake: { name: 'Antler Rake', icon: 'claw', shape: 'foe', range: 'melee', power: 1, fx: 'rake' },
  rut: { name: 'Rut', icon: 'charge', shape: 'foe', reach: true, cost: 25, charge: 'rutstrike', fx: 'charge', tip: 'Paws the ground at your hardest hitter. Next turn: a goring charge that stuns for 2 turns.' },
  rutstrike: { name: 'Rut', icon: 'stun', shape: 'foe', range: 'melee', reach: true, power: 3, st: [{ k: 'stunned', t: 1, n: 2 }], fx: 'rut' },
  // Region IV: the Ashen Keep
  ashblade: { name: 'Ashen Blade', icon: 'sword', shape: 'foe', range: 'melee', power: 1, fx: 'ashblade' },
  ashwall: { name: 'Shield Wall', icon: 'brace', shape: 'self', cost: 20, st: [{ k: 'braced', t: 2, v: 40 }], fx: 'guard', tip: 'Braced: −40% damage taken for 2 turns.' },
  emberbite: { name: 'Ember Bite', icon: 'fire', shape: 'foe', range: 'melee', power: 1, st: [{ k: 'burn', t: 2, p: 0.25 }], fx: 'emberbite' },
  firebreath: { name: 'Firebreath', icon: 'fire', shape: 'front', range: 'magic', power: 0.7, cost: 20, st: [{ k: 'burn', t: 2, p: 0.25 }], fx: 'firebreath', tip: 'Sets your whole front row Burning.' },
  spear: { name: 'Thrown Spear', icon: 'arrow', shape: 'foe', range: 'ranged', power: 0.9, fx: 'spear' },
  serve: { name: 'Serve', icon: 'cover', shape: 'ally', notSelf: true, cost: 15, st: [{ k: 'covered', t: 2 }], fx: 'serve', tip: 'Covers its strongest ally for 2 turns: the Squire takes every attack aimed at it.' },
  ashbolt: { name: 'Bolt', icon: 'arrow', shape: 'foe', range: 'ranged', power: 1, fx: 'bolt' },
  siegeshot: { name: 'Siege Shot', icon: 'charge', shape: 'foe', range: 'ranged', cost: 25, charge: 'siegehit', fx: 'charge', tip: 'Winds the windlass at a back-row hero. Next turn: a 3.0× bolt.' },
  siegehit: { name: 'Siege Shot', icon: 'arrow', shape: 'foe', range: 'ranged', power: 2.4, fx: 'siege' },
  furnacefist: { name: 'Furnace Fist', icon: 'mace', shape: 'foe', range: 'melee', power: 1, fx: 'crush' },
  stoke: { name: 'Stoke the Kiln', icon: 'charge', shape: 'foes', range: 'magic', cost: 30, charge: 'kilnblast', fx: 'charge', tip: 'Stokes its fire at the whole party. Next turn: a blast on every hero, 2.4× and Burning.' },
  kilnblast: { name: 'Kiln Blast', icon: 'fire', shape: 'foes', range: 'magic', power: 1.3, st: [{ k: 'burn', t: 3, p: 0.3 }], fx: 'kilnblast' },
  brand: { name: 'Brand', icon: 'fire', shape: 'foe', range: 'magic', power: 1, st: [{ k: 'burn', t: 2, p: 0.3 }], fx: 'brand' },
  riteofash: { name: 'Rite of Ash', icon: 'kindle', shape: 'allies', heal: 0.5, cost: 30, st: [{ k: 'kindled', t: 2, v: 30 }], fx: 'riteofash', tip: 'Heals every foe and kindles them.' },
  // splash: the share of each blow that also lands on the hero beside the one it hits.
  marshalblade: { name: 'Marshal’s Blade', icon: 'sword', shape: 'foe', range: 'melee', power: 1, splash: 0.25, fx: 'marshal', tip: 'A quarter of each blow splashes onto the other front-row hero.' },
  rally: { name: 'Rally', icon: 'kindle', shape: 'allies', cost: 25, st: [{ k: 'kindled', t: 2, v: 30 }, { k: 'fortified', t: 2, v: 20 }], fx: 'rally', tip: 'Kindles and fortifies every foe for 2 turns.' },
  burntcharge: { name: 'Charge of the Burnt', icon: 'charge', shape: 'front', range: 'melee', cost: 30, charge: 'burnthit', fx: 'charge', tip: 'Sounds the charge at your front row. Next turn: 2.8× to each.' },
  burnthit: { name: 'Charge of the Burnt', icon: 'sword', shape: 'front', range: 'melee', power: 2.8, fx: 'burnt' },
  // Region V: the Hollow Throne
  compliment: { name: 'Barbed Compliment', icon: 'orb', shape: 'foe', range: 'magic', power: 1, fx: 'compliment' },
  flattery: { name: 'Flattery', icon: 'confuse', shape: 'foe', range: 'magic', cost: 20, st: [{ k: 'confused', t: 1 }], fx: 'flattery', tip: 'Confuses your hardest hitter: their next attack may strike their own side.' },
  shadetouch: { name: 'Shade Touch', icon: 'claw', shape: 'foe', range: 'melee', power: 1, fx: 'shadetouch' },
  // steal: takes that many helpful statuses for itself.
  usurp: { name: 'Usurp', icon: 'boss', shape: 'foe', range: 'magic', power: 0.6, cost: 20, steal: 1, fx: 'usurp', tip: 'Steals one helpful status from a hero.' },
  proclamation: { name: 'Proclamation', icon: 'bell', shape: 'foe', range: 'magic', power: 0.9, fx: 'proclaim' },
  heraldsdoom: { name: 'Herald’s Doom', icon: 'doom', shape: 'foe', range: 'magic', cost: 25, st: [{ k: 'doom', t: 3, p: 0.45 }], fx: 'doom', tip: 'Announces a death: your hardest hitter is Doomed for 3 turns, 0.45× a tick.' },
  gutter: { name: 'Gutter', icon: 'orb', shape: 'foe', range: 'magic', power: 0.9, fx: 'gutter' },
  // strip: a list of the helpful statuses it strips.
  snufflight: { name: 'Snuff the Light', icon: 'lantern', shape: 'foes', range: 'magic', power: 0.3, cost: 25, strip: ['kindled', 'hasted', 'warded', 'blessed'], fx: 'snufflight', tip: 'Strips Kindled, Hasted, Warded and Blessed from every hero.' },
  guardhalberd: { name: 'Guard’s Halberd', icon: 'mace', shape: 'foe', range: 'melee', power: 1.3, fx: 'smash' },
  kgoath: { name: 'Oath', icon: 'cover', shape: 'ally', notSelf: true, cost: 20, st: [{ k: 'covered', t: 2 }], fx: 'serve', tip: 'Covers its most hurt ally for 2 turns, area hits included.' },
  rod: { name: 'Rod of Office', icon: 'mace', shape: 'foe', range: 'magic', power: 1, fx: 'rod' },
  reorder: { name: 'Reorder the Court', icon: 'boot', shape: 'foe', range: 'magic', cost: 25, pull: true, pick: (E, u, x) => x.row === 'back', fx: 'reorder', tip: 'Swaps a back-row hero into the front row. Move resistance resists it.' },
  summoncourt: { name: 'Summon the Court', icon: 'boss', shape: 'self', cost: 30, call: { key: 'courtier', n: 1 }, fx: 'court', tip: 'A Hollow Courtier rises in an empty slot.' },
  sceptre: { name: 'Sceptre', icon: 'boss', shape: 'foe', range: 'magic', power: 1, fx: 'sceptre' },
  sceptrerow: { name: 'Sceptre', icon: 'boss', shape: 'back', range: 'magic', power: 0.8, fx: 'sceptrerow', tip: 'Long Live the King: the Sceptre strikes your whole back row.' },
  courtofshades: { name: 'Court of Shades', icon: 'boss', shape: 'self', cost: 40, call: { key: 'shade', n: 1 }, fx: 'court', tip: 'A Crowned Shade rises in an empty slot.' },

  // Party items: what each does when used (see ITEMS). mana: mana restored to each target. cleanse: removes harmful
  // statuses.
  draught: { name: 'Healing Draught', icon: 'flask', shape: 'ally', healPct: 0.4, item: true, fx: 'mend', tip: 'Restores 40% of one ally’s health.' },
  salts: { name: 'Smelling Salts', icon: 'salts', shape: 'ally', revive: 0.3, item: true, fx: 'rites', tip: 'A fallen ally gets back up with 30% health.' },
  lampoil: { name: 'Lamp Oil', icon: 'oil', shape: 'allies', mana: 20, item: true, fx: 'kindle', tip: 'Every ally gains 20 mana.' },
  tincture: { name: 'Bitter Tincture', icon: 'tincture', shape: 'ally', cleanse: 'all', item: true, fx: 'cleanse', tip: 'Removes all harmful statuses from one ally.' },

  // Shared actions: Defend is a rule action for every hero (content spec §5).
  defend: { name: 'Defend', icon: 'brace', shape: 'self', basic: true, st: [{ k: 'braced', v: 30, time: 'start' }], fx: 'guard', tip: 'Braced (−30% damage taken) until its next turn, and restores mana like a basic attack.' },
  // Nothing it can do: it waits.
  wait: { name: 'Wait', icon: 'mana', shape: 'self', fx: 'none' },
  // A waiting foe steps into an open front slot (campaign spec §3.3).
  stepup: { name: 'Step Up', icon: 'boot', shape: 'self', fx: 'none', tip: 'Steps into the open front slot.' },
  // Move and Gather: rule actions every hero has once the Tactician teaches them (content spec §5): Move with lesson I,
  // Gather with lesson II.
  move: { name: 'Move', icon: 'boot', shape: 'self', move: true, fx: 'none', tip: 'Swaps places with the nearest ally in the other row, or steps into an empty slot there. Uses the turn.' },
  gather: { name: 'Gather', icon: 'mana', shape: 'self', gather: true, fx: 'gather', tip: 'Doesn’t attack, and restores twice the basic attack’s mana.' },
};
for (const id in SKILLS) SKILLS[id].id = id;

// ── Rule conditions ("Tactics")
// A rule is { if, n?, s?, do, on }: when the condition holds and the action is possible, the character takes it.
// Conditions are plain data, so adding one needs no code anywhere else:
//   group     where the editor lists it: self, ally, foe or battle
//   who       the units it looks at: 'self', 'ally' (living allies, self included), 'fallen' (fallen allies) or
//             'foe' (living foes). Leave it out for a test of the whole battle, and give when() instead.
//   filter(x, r, c)   which of those units qualify. With no filter, all of them do.
//   best(x, b, r, c)  which qualifying unit it picks: true when x beats b. With no best, the nearest one.
//   when(r, c)        for a battle-wide condition: whether it holds.
//   n / s     the numbers or statuses a player can choose for the rule (r.n, r.s)
//   start     which of its variants a new player knows: true for all, or a list of values. The rest are taught later.
//   from      where a locked condition is learned, shown in the editor (the Tactician when not given)
//   label(r)  how a rule shows it. tip: an optional line of help in the editor.
// x and b are units as the simulation holds them (hp, maxHp, mp, maxMp, pow, row, boss, tags, st for statuses).
// c is the battle as the acting character sees it: { u, foes, allies, fallen, round, enrage, leader, thralls }.
// When the condition looks at the side a single-target skill hits, it also picks that skill's target (FF12 style).
// Otherwise it only decides whether the rule fires.
const hpPct = x => (100 * x.hp) / x.maxHp;
const mpPct = x => (x.maxMp ? (100 * x.mp) / x.maxMp : 100);
const stAdj = s => (STATUSES[s] ? STATUSES[s].adj || STATUSES[s].name : s);
const stName = s => (STATUSES[s] ? STATUSES[s].name : s);
// Foe kinds that conditions can name. Foes list theirs in tags.
const TAGS = { undead: 'Undead', spirit: 'Spirit', beast: 'Beast' };
// The statuses a "has" or "without" condition can name.
const HELPFUL_ST = ['guarding', 'kindled', 'hasted', 'warded', 'blessed', 'braced', 'fortified', 'veiled', 'hidden', 'parrying', 'riposte', 'retaliating', 'unbroken', 'covered'];
const HARMFUL_ST = ['marked', 'charging', 'doom', 'bleed', 'burn', 'poison', 'dazzled', 'weak', 'exposed', 'corroded', 'slowed', 'silenced', 'stunned', 'confused', 'festering', 'taunted', 'quarry'];
const ALL_ST = HARMFUL_ST.concat(HELPFUL_ST);
const THRESH = [25, 30, 40, 50, 60, 75, 90];
const CONDITIONS = {
  always: { group: 'battle', start: true, when: () => true, label: () => 'Always', tip: 'Always true. Put it last, as a fallback.' },
  // Self
  self_hp_lt: { group: 'self', who: 'self', n: THRESH, start: [50], filter: (x, r) => hpPct(x) < r.n, label: r => `Self: health below ${r.n}%` },
  self_hp_gt: { group: 'self', who: 'self', n: THRESH, filter: (x, r) => hpPct(x) > r.n, label: r => `Self: health above ${r.n}%` },
  self_mp_lt: { group: 'self', who: 'self', n: THRESH, filter: (x, r) => mpPct(x) < r.n, label: r => `Self: mana below ${r.n}%` },
  self_front: { group: 'self', who: 'self', filter: x => x.row === 'front', label: () => 'Self: in the front row' },
  self_back: { group: 'self', who: 'self', filter: x => x.row === 'back', label: () => 'Self: in the back row' },
  self_has: { group: 'self', who: 'self', s: ALL_ST, filter: (x, r) => !!x.st[r.s], label: r => `Self: has ${stName(r.s)}` },
  self_without: { group: 'self', who: 'self', s: ALL_ST, filter: (x, r) => !x.st[r.s], label: r => `Self: without ${stName(r.s)}` },
  self_thralls_lt: { group: 'self', who: 'self', n: [1, 2, 3, 4], filter: (x, r, c) => c.thralls < r.n, label: r => `Self: fewer than ${r.n} thrall${r.n === 1 ? '' : 's'}`, tip: 'Thralls the party has standing.' },
  // Ally
  ally_hp_lt: { group: 'ally', who: 'ally', n: THRESH, start: [50], filter: (x, r) => hpPct(x) < r.n, best: (x, b) => hpPct(x) < hpPct(b), label: r => `Ally: health below ${r.n}%`, tip: 'Picks the most hurt ally below the line.' },
  ally_hurt: { group: 'ally', who: 'ally', from: 'a battle reward', filter: x => x.hp < x.maxHp, best: (x, b) => hpPct(x) < hpPct(b), label: () => 'Ally: most hurt' },
  ally_fallen: { group: 'ally', who: 'fallen', from: 'a battle reward', label: () => 'Ally: fallen' },
  ally_has: { group: 'ally', who: 'ally', s: ALL_ST, filter: (x, r) => !!x.st[r.s], label: r => `Ally: ${stAdj(r.s)}`, tip: 'An ally with this status. Marked means a foe is charging a big attack at them.' },
  ally_without: { group: 'ally', who: 'ally', s: ALL_ST, filter: (x, r) => !x.st[r.s], label: r => `Ally: not ${stName(r.s)}` },
  ally_mp_lt: { group: 'ally', who: 'ally', n: THRESH, filter: (x, r) => x.maxMp > 0 && mpPct(x) < r.n, best: (x, b) => mpPct(x) < mpPct(b), label: r => `Ally: mana below ${r.n}%` },
  ally_top_pow: { group: 'ally', who: 'ally', from: 'a battle reward', best: (x, b) => x.pow > b.pow, label: () => 'Ally: highest Power' },
  // Foe
  front_foe: { group: 'foe', who: 'foe', start: true, filter: x => x.row === 'front', label: () => 'Front foe' },
  foe_lowest: { group: 'foe', who: 'foe', start: true, best: (x, b) => x.hp < b.hp, label: () => 'Foe: lowest health' },
  foe_hp_lt: { group: 'foe', who: 'foe', n: THRESH, filter: (x, r) => hpPct(x) < r.n, best: (x, b) => hpPct(x) < hpPct(b), label: r => `Foe: health below ${r.n}%` },
  foe_highest: { group: 'foe', who: 'foe', best: (x, b) => x.hp > b.hp, label: () => 'Foe: highest health' },
  foe_highest_pow: { group: 'foe', who: 'foe', from: 'a battle reward', best: (x, b) => x.pow > b.pow, label: () => 'Foe: highest attack' },
  foe_charging: { group: 'foe', who: 'foe', from: 'a battle reward', filter: x => !!x.st.charging, label: () => 'Foe: charging a big attack' },
  foe_tag: { group: 'foe', who: 'foe', s: ['undead', 'spirit', 'beast'], from: 'a battle reward', filter: (x, r) => x.tags.includes(r.s), label: r => `Foe: ${TAGS[r.s] || r.s}` },
  foe_back: { group: 'foe', who: 'foe', from: 'a battle reward', filter: x => x.row === 'back', label: () => 'Foe: in the back row' },
  foe_boss: { group: 'foe', who: 'foe', from: 'a battle reward', filter: x => x.boss || x.elite, best: (x, b) => (x.boss && !b.boss) || x.hp > b.hp, label: () => 'Foe: boss or elite' },
  foe_healer: { group: 'foe', who: 'foe', from: 'a battle reward', filter: x => !!x.healer, label: () => 'Foe: healer' },
  foe_next: { group: 'foe', who: 'foe', from: 'a battle reward', best: (x, b) => x.next < b.next, label: () => 'Foe: acts next', tip: 'The foe first on the turn strip.' },
  leader_target: { group: 'foe', who: 'foe', filter: (x, r, c) => !!c.leader && c.leader.lastTarget === x, label: () => "Foe: the leader's target", tip: 'The foe the party leader (the first hero still standing) last attacked.' },
  foe_has: { group: 'foe', who: 'foe', s: ALL_ST, filter: (x, r) => !!x.st[r.s], label: r => `Foe: has ${stName(r.s)}` },
  foe_without: { group: 'foe', who: 'foe', s: ALL_ST, filter: (x, r) => !x.st[r.s], label: r => `Foe: not ${stAdj(r.s)}` },
  // Battle
  foes_at_least: { group: 'battle', n: [2, 3, 4, 5, 6], when: (r, c) => c.foes.length >= r.n, label: r => `${r.n} or more foes` },
  one_foe: { group: 'battle', when: (r, c) => c.foes.length === 1, label: () => 'One foe left' },
  boss_present: { group: 'battle', from: 'a battle reward', when: (r, c) => c.foes.some(f => f.boss), label: () => 'Boss present' },
  battle_start: { group: 'battle', when: (r, c) => c.round <= 1, label: () => 'Battle start', tip: 'True during the first round.' },
  enraged: { group: 'battle', from: 'a battle reward', when: (r, c) => c.enrage > 0, label: () => 'Foes enraged', tip: 'True once the turn limit is reached and foes hit harder every round.' },
  allies_hurt: { group: 'battle', n: [2, 3, 4], when: (r, c) => c.allies.filter(x => hpPct(x) < 60).length >= r.n, label: r => `${r.n} or more allies below 60%` },
  allies_lt: { group: 'battle', n: [2, 3, 4, 5], from: 'a battle reward', when: (r, c) => c.allies.length < r.n, label: r => `Fewer than ${r.n} allies standing` },
  // Between battles: only party rules use these, with the Return to base action. They are checked after each win on a
  // trip (js/campaign.js), never in battle. x: { chars (the heroes on the trip), fell (someone fell in that battle),
  // next (the stage the party would walk on to), bag (the party items left in the Bag) }.
  bb_fatigue: { group: 'between', between: true, n: [50, 75, 90], start: [75], when: () => false, bb: (r, x) => x.chars.some(c => c.fatigue >= r.n), label: r => `Between battles: any character at ${r.n}+ fatigue`, tip: 'Checked after each win on the road.' },
  bb_fell: { group: 'between', between: true, when: () => false, bb: (r, x) => !!x.fell, label: () => 'Between battles: an ally fell', tip: 'Someone was knocked out in the battle just won.' },
  bb_next_boss: { group: 'between', between: true, from: 'a battle reward', when: () => false, bb: (r, x) => !!(x.next && (x.next.boss || x.next.elite)), label: () => 'Between battles: next stage has a boss or elite' },
  bb_out: { group: 'between', between: true, s: ['draught', 'salts', 'lampoil', 'tincture'], when: () => false, bb: (r, x) => !!x.bag && !(x.bag[r.s] > 0), label: r => `Between battles: out of ${ITEMS_MANY[r.s] || r.s}`, tip: 'The Bag has none left, so its loadout slots go into the next battle empty.' },
};
for (const id in CONDITIONS) CONDITIONS[id].id = id;

// ── Party items
// The party packs items into its loadout before a battle: one item per slot, used once per battle. They belong to the
// party, not to a character, so using one takes no one's turn. The player can use them by hand at any moment of a
// battle, and party rules can use them on their own (below).
// skill is what an item does (in SKILLS), so the battle screen animates it like any skill.
const ITEMS = {
  draught: { name: 'Healing Draught', icon: 'flask', skill: 'draught', tip: 'Restores 40% of one ally’s health.' },
  salts: { name: 'Smelling Salts', icon: 'salts', skill: 'salts', tip: 'A fallen ally gets back up with 30% health.' },
  lampoil: { name: 'Lamp Oil', icon: 'oil', skill: 'lampoil', tip: 'Every ally gains 20 mana.' },
  tincture: { name: 'Bitter Tincture', icon: 'tincture', skill: 'tincture', tip: 'Removes all harmful statuses from one ally.' },
};
// Party items by the many, for “out of Healing Draughts”.
const ITEMS_MANY = { draught: 'Healing Draughts', salts: 'Smelling Salts', lampoil: 'Lamp Oil', tincture: 'Bitter Tinctures' };
// Loadout slots: how many a party starts with and the most it can open (from a home base building later), and the
// starting loadout (tune).
const LOADOUT = { slots: [2, 4], items: ['draught', 'salts'] };

// ── Party rules
// A separate, small list of team-wide rules, read from the top.
//   An item rule is checked between every two turns. The first that holds uses that item, if one is still packed.
//   A focus rule names a foe. On each hero's turn, the hero attacks it whenever their own rule didn't pick a target.
// kind: item (uses ITEMS[item]) or focus. who: for focus, the side its condition must look at.
const PARTY_ACTIONS = {};
for (const id in ITEMS) PARTY_ACTIONS[id] = { kind: 'item', item: id, name: ITEMS[id].name, icon: ITEMS[id].icon, tip: ITEMS[id].tip + ' Used at once, if one is packed.' };
PARTY_ACTIONS.focus = { kind: 'focus', who: 'foe', name: 'Focus fire', icon: 'mark', tip: 'Every hero attacks this foe, unless their own rule picked a target.' };
// Return to base: a between-battle rule's action. The party walks home after the battle it was checked after.
PARTY_ACTIONS.home = { kind: 'home', name: 'Return to base', icon: 'lantern', tip: 'The party walks home after this battle.' };
// The come-home rule that arrives with Keep going (1-6), on by default.
const HOME_RULE = { if: 'bb_fatigue', n: 75, do: 'home' };
// Party rule slots: the starting number and the most the Tactician can add (tune). rules: the starting set.
const PARTY_RULES = { slots: [2, 5], rules: [{ if: 'ally_hp_lt', n: 30, do: 'draught' }, { if: 'foe_lowest', do: 'focus', on: false }] };

const ruleCond = r => (CONDITIONS[r.if] ? CONDITIONS[r.if].label(r) : r.if);
const ruleAction = r => (PARTY_ACTIONS[r.do] ? PARTY_ACTIONS[r.do].name : SKILLS[r.do] ? SKILLS[r.do].name : r.do);
const ruleText = r => `${ruleCond(r)} → ${ruleAction(r)}`;

/// ── Foes
// Each foe keeps its level-1 stats here; foeStats(F, level) grows them with its stage's level (campaign spec §3.1).
//   tags: the kinds of foe it counts as, for rule conditions (TAGS). healer: counts for "Foe: healer".
//   elite / boss: its rank. Elites are marked on the turn flags and the map; bosses are drawn larger.
//   res: its resistances at level 1, family shifts included (campaign spec §4.1); without it, FOE_RES by rank.
//   phases: a boss's once-only changes below a share of its health: { below, name, line, swap: { old skill: new } }.
//   flee: it scuttles off at the start of this round (the Cage Mimic). wander: a wandering foe (§3.4).
//   role: one line for the stage sheet. intro and death: what the road says when it appears and when it falls.
const FOES = {
  // Region I: the Gravefields (campaign spec §4.1)
  shambler: { name: 'Shambler', tags: ['undead'], role: 'Slow and weak: the first foe.', intro: 'Something in the barrow dirt sits up, slowly.', death: 'It lies back down as if it never rose.', hp: 48, mp: 0, pow: 13, def: 2, spd: 7, crit: 0, dodge: 0, mpGain: 0, basic: 'grasp', skills: [], rules: [], res: { stun: 10, move: 10, bleed: 50, blight: 30, curse: 10, debuff: 10 } },
  ghoul: { name: 'Ghoul', tags: ['undead'], role: 'Bleeds the weakest hero.', intro: 'A ghoul lifts its head from an open grave.', death: 'It folds back into the dirt it came from.', hp: 72, mp: 20, pow: 20, def: 3, spd: 9, crit: 5, dodge: 5, mpGain: 10, basic: 'claw', skills: ['gnaw'], rules: [{ if: 'foe_lowest', do: 'gnaw' }], res: { stun: 20, move: 20, bleed: 60, blight: 40, curse: 20, debuff: 20 } },
  rats: { name: 'Grave Rats', tags: ['beast'], role: 'Fast, and hits the whole front row.', intro: 'The ground boils with fat grey rats.', death: 'The survivors scatter into the barrows.', hp: 56, mp: 20, pow: 14, def: 2, spd: 13, crit: 5, dodge: 15, mpGain: 10, basic: 'bite', skills: ['skitter'], rules: [{ if: 'front_foe', do: 'skitter' }], res: { stun: 5, move: 25, bleed: 10, blight: 20, curse: 15, debuff: 15 } },
  bones: { name: 'Restless Bones', tags: ['undead'], role: 'Throws from behind, and heals itself.', intro: 'A skeleton pulls itself together, joint by joint.', death: 'It comes apart and stays apart.', hp: 62, mp: 20, pow: 17, def: 6, spd: 8, crit: 5, dodge: 0, mpGain: 10, basic: 'bonetoss', skills: ['reassemble'], rules: [{ if: 'self_hp_lt', n: 50, do: 'reassemble' }, { if: 'foe_lowest', do: 'bonetoss' }], res: { stun: 20, move: 30, bleed: 60, blight: 40, curse: 25, debuff: 20 } },
  glutton: { name: 'Grave Glutton', tags: ['undead'], role: 'Slow, and hits hardest.', intro: 'Something swollen with grave-meat heaves itself upright.', death: 'It sags into a heap and does not get up.', hp: 150, mp: 20, pow: 26, def: 4, spd: 6, crit: 5, dodge: 0, mpGain: 10, basic: 'slam', skills: ['crushblow'], rules: [{ if: 'front_foe', do: 'crushblow' }], res: { stun: 35, move: 40, bleed: 60, blight: 50, curse: 20, debuff: 25 } },
  gravewarden: { name: 'The Gravewarden', tags: ['undead'], elite: true, role: 'Guards its allies, and hooks your back row.', intro: 'An armoured keeper of the dead steps out of the fog.', death: 'Its armour falls empty to the ground.', hp: 225, mp: 40, pow: 65, def: 8, spd: 8, crit: 5, dodge: 0, mpGain: 10, basic: 'halberd', skills: ['watch', 'reaphook'], rules: [{ if: 'ally_hp_lt', n: 75, do: 'watch' }, { if: 'foe_lowest', do: 'reaphook' }], res: { stun: 45, move: 55, bleed: 80, blight: 55, curse: 35, debuff: 40 } },
  crows: { name: 'Carrion Crows', tags: ['beast'], role: 'Reach: dives on the weakest hero.', intro: 'A black flock settles on the headstones, watching.', death: 'The last of them flaps off, cawing.', hp: 40, mp: 20, pow: 14, def: 1, spd: 13, crit: 10, dodge: 20, mpGain: 10, basic: 'peck', skills: ['dive'], rules: [{ if: 'foe_lowest', do: 'dive' }, { if: 'foe_lowest', do: 'peck' }], res: { stun: 10, move: 40, bleed: 10, blight: 20, curse: 20, debuff: 20 } },
  mourner: { name: 'Mourner', role: 'Kindles the other foes. Kill her first.', intro: 'A veiled woman keens over a grave that is not hers.', death: 'Her veil drifts down onto the grass.', hp: 58, mp: 30, pow: 13, def: 3, spd: 10, crit: 5, dodge: 5, mpGain: 12, basic: 'keen', skills: ['mdirge'], rules: [{ if: 'ally_without', s: 'kindled', do: 'mdirge' }], res: { stun: 20, move: 20, bleed: 25, blight: 25, curse: 40, debuff: 30 } },
  digger: { name: 'Gravedigger', role: 'Marks a hero, then strikes.', intro: 'A man with a spade measures you by eye.', death: 'He drops his spade into the hole he dug.', hp: 80, mp: 30, pow: 18, def: 4, spd: 9, crit: 5, dodge: 5, mpGain: 10, basic: 'shovel', skills: ['shallowgrave'], rules: [{ if: 'foe_lowest', do: 'shallowgrave' }], res: { stun: 25, move: 25, bleed: 25, blight: 25, curse: 25, debuff: 25 } },
  ratking: { name: 'The Rat King', tags: ['beast'], elite: true, role: 'Calls rats into empty slots while he stands.', intro: 'A knot of rats in a tin crown squeals for its subjects.', death: 'The crown rolls away. The knot comes apart.', hp: 230, mp: 40, pow: 29, def: 5, spd: 11, crit: 5, dodge: 10, mpGain: 10, basic: 'bite', skills: ['gnawingtide', 'callswarm'], rules: [{ if: 'allies_lt', n: 4, do: 'callswarm' }, { if: 'front_foe', do: 'gnawingtide' }], res: { stun: 30, move: 40, bleed: 35, blight: 40, curse: 40, debuff: 40 } },
  sexton: { name: 'The Sexton', boss: true, role: 'Digs graves for Marked heroes, and two at half health.', intro: 'The gravedigger of the Gravefields has a hole dug for you.', death: 'He falls into his own last grave.', hp: 415, mp: 40, pow: 35, def: 8, spd: 9, crit: 8, dodge: 0, mpGain: 10, basic: 'shovel', skills: ['dig', 'gravedirt'], rules: [{ if: 'foe_hp_lt', n: 75, do: 'dig' }, { if: 'foes_at_least', n: 4, do: 'gravedirt' }], res: { stun: 60, move: 70, bleed: 55, blight: 55, curse: 50, debuff: 60 },
    phases: [{ below: 0.5, name: 'Two Graves', line: 'He digs two graves now', swap: { dig: 'dig2' } }] },
  // Wandering foes: they join replays only, rolled from the battle's seed (campaign spec §3.4, §4.2)
  moths: { name: 'Moth Swarm', tags: ['beast'], wander: true, role: 'A wandering swarm that dazzles everyone.', intro: 'Pale moths pour out of a cracked lantern.', death: 'The dust settles.', hp: 50, mp: 20, pow: 12, def: 1, spd: 14, crit: 5, dodge: 25, mpGain: 10, basic: 'flutter', skills: ['wingdust'], rules: [{ if: 'foes_at_least', n: 3, do: 'wingdust' }], res: { stun: 10, move: 50, bleed: 10, blight: 20, curse: 20, debuff: 20 } },
  mimic: { name: 'Cage Mimic', wander: true, flee: 6, role: 'A wandering cage. It runs at round 6; killed, it drops better gear.', intro: 'An iron gibbet-cage by the road opens one eye.', death: 'It springs open, and something glints inside.', hp: 90, mp: 20, pow: 18, def: 10, spd: 8, crit: 5, dodge: 0, mpGain: 10, basic: 'snap', skills: ['clangshut'], rules: [{ if: 'self_hp_lt', n: 50, do: 'clangshut' }], res: { stun: 50, move: 60, bleed: 40, blight: 40, curse: 30, debuff: 40 } },
  // Region II: the Drowned Chapel (campaign spec §4.3). Undead and spirits: foes that heal and raise, turn delays,
  // silence on your healer, mana drain and bursting corpses.
  acolyte: { name: 'Drowned Acolyte', healer: true, tags: ['undead'], role: 'Heals the other foes. Kill it first.', intro: 'A sodden acolyte gargles a hymn at you.', death: 'It slumps, pouring water from its sleeves.', hp: 66, mp: 30, pow: 17, def: 4, spd: 10, crit: 5, dodge: 5, mpGain: 10, basic: 'brinebolt', skills: ['hymn'], rules: [{ if: 'ally_hp_lt', n: 60, do: 'hymn' }, { if: 'foe_lowest', do: 'brinebolt' }] },
  bloat: { name: 'Bloated Corpse', tags: ['undead'], role: 'Bursts below a third of its health, hitting every hero.', intro: 'Something swollen waddles out of the flooded nave.', death: 'It bursts. You will smell it for days.', hp: 150, mp: 0, pow: 20, def: 5, spd: 6, crit: 0, dodge: 0, mpGain: 0, basic: 'slam', skills: ['burst'], rules: [{ if: 'self_hp_lt', n: 35, do: 'burst' }] },
  bellwraith: { name: 'Bell Wraith', tags: ['spirit'], role: 'Its Toll pushes your turns back. A spirit: it dodges.', intro: 'A drowned bell tolls, and a pale shape answers.', death: 'The tolling stops.', hp: 60, mp: 30, pow: 17, def: 3, spd: 11, crit: 5, dodge: 20, mpGain: 10, basic: 'wail', skills: ['wraithtoll'], rules: [{ if: 'foes_at_least', n: 3, do: 'wraithtoll' }, { if: 'foe_hp_lt', n: 50, do: 'wail' }] },
  sister: { name: 'Silent Sister', tags: ['undead'], role: 'Silences your healer.', intro: 'A nun in a sodden wimple lifts one finger to her lips.', death: 'She sinks without a sound, as she lived.', hp: 70, mp: 30, pow: 16, def: 4, spd: 10, crit: 5, dodge: 5, mpGain: 10, basic: 'psalter', skills: ['vow'], rules: [{ if: 'foe_healer', do: 'vow' }, { if: 'foe_lowest', do: 'psalter' }] },
  choir: { name: 'Choir of Silt', healer: true, tags: ['spirit'], elite: true, role: 'Heals the foes, and Dooms every hero.', intro: 'A dozen drowned mouths sing in the dark water.', death: 'The choir falls silent, one voice at a time.', hp: 440, mp: 40, pow: 30, def: 6, spd: 10, crit: 5, dodge: 5, mpGain: 12, basic: 'chant', skills: ['hymn', 'requiem'], rules: [{ if: 'ally_hp_lt', n: 50, do: 'hymn' }, { if: 'foes_at_least', n: 3, do: 'requiem' }] },
  leech: { name: 'The Font Leech', tags: ['beast'], elite: true, role: 'Drains your mana, and heals on it.', intro: 'Something pale and ringed uncoils from the font.', death: 'It shrivels, spilling all the light it drank.', hp: 460, mp: 40, pow: 30, def: 6, spd: 7, crit: 5, dodge: 0, mpGain: 10, basic: 'latch', skills: ['drainfont'], rules: [{ if: 'foes_at_least', n: 3, do: 'drainfont' }, { if: 'foe_lowest', do: 'latch' }] },
  bishop: { name: 'The Drowned Bishop', tags: ['undead'], boss: true, role: 'Raises the fallen, baptises a Marked hero, and floods the nave.', intro: 'The bishop rises from the font, robes streaming.', death: 'He sinks back into the black font.', hp: 470, mp: 50, pow: 50, def: 8, spd: 9, crit: 8, dodge: 0, mpGain: 12, basic: 'crozier', skills: ['raise', 'baptism', 'font'], rules: [{ if: 'ally_fallen', do: 'raise' }, { if: 'foe_hp_lt', n: 75, do: 'baptism' }, { if: 'foes_at_least', n: 4, do: 'font' }],
    phases: [{ below: 0.5, name: 'The Font Overflows', line: 'Font of Brine now pushes your turns back', swap: { font: 'font2' } }] },
  // Region III: Thornwood. Mostly beasts: packs, stuns, your formation broken, thorns and poison.
  briarwolf: { name: 'Briar Wolf', tags: ['beast'], role: 'Hunts in packs: hits harder for every other wolf standing.', intro: 'Wolves with briars for hackles slip out of the undergrowth.', death: 'It limps off into the thorns and lies down.', hp: 120, mp: 20, pow: 20, def: 4, spd: 12, crit: 5, dodge: 10, mpGain: 10, basic: 'bite', skills: ['packtear'], rules: [{ if: 'foe_lowest', do: 'packtear' }] },
  thornwitch: { name: 'Thorn Witch', role: 'Poisons, and slows your front row.', intro: 'A woman in bark-cloth hums, and the brambles lean in to listen.', death: 'Her hum stops, and the vines go slack.', hp: 95, mp: 30, pow: 20, def: 4, spd: 10, crit: 5, dodge: 5, mpGain: 12, basic: 'thornlash', skills: ['witchbloom', 'entangle'], rules: [{ if: 'foe_without', s: 'poison', do: 'witchbloom' }, { if: 'front_foe', do: 'entangle' }] },
  hanged: { name: 'The Hanged Man', tags: ['undead'], hidden: true, role: 'Hides in the branches until he drops on your back row.', intro: 'A rope creaks in the branches above you.', death: 'The rope snaps. He does not get up.', hp: 115, mp: 50, pow: 22, def: 5, spd: 9, crit: 8, dodge: 5, mpGain: 10, basic: 'noose', skills: ['gallows'], rules: [{ if: 'foe_back', do: 'gallows' }] },
  marshlantern: { name: 'Marsh Lantern', tags: ['spirit'], role: 'Lures your back-row heroes into the front row.', intro: 'A light bobs off the road, warm and friendly.', death: 'The light goes out, and the fen is only a fen.', hp: 90, mp: 40, pow: 18, def: 3, spd: 11, crit: 5, dodge: 20, mpGain: 10, basic: 'willlight', skills: ['lure'], rules: [{ if: 'foe_back', do: 'lure' }] },
  bramble: { name: 'Mother Bramble', elite: true, role: 'Her thorns hurt whoever hits her. Hold back while they are up.', intro: 'The thicket opens an eye, and then a mouth.', death: 'She withers back into an ordinary hedge.', hp: 470, mp: 40, pow: 44, def: 8, spd: 7, crit: 5, dodge: 0, mpGain: 12, basic: 'thornslam', skills: ['bramblehide', 'rotcloud'], rules: [{ if: 'self_without', s: 'retaliating', do: 'bramblehide' }, { if: 'foes_at_least', n: 3, do: 'rotcloud' }] },
  thornback: { name: 'The Thornback', tags: ['beast'], elite: true, role: 'Charges your whole front row, and stuns it.', intro: 'A boar the size of a cart, grown over with bark and thorns, lowers its head.', death: 'It crashes down, a mound of briar.', hp: 640, mp: 50, pow: 50, def: 10, spd: 8, crit: 5, dodge: 0, mpGain: 10, basic: 'gore', skills: ['thundercharge'], rules: [{ if: 'always', do: 'thundercharge' }] },
  antlered: { name: 'The Antlered One', tags: ['beast'], boss: true, regen: 0.015, role: 'Heals every turn, gores and stuns your hardest hitter, and calls the Wild Hunt.', intro: 'Something old and antlered steps out from between the trees.', death: 'The Antlered One kneels, and the wood goes quiet.', hp: 220, mp: 50, pow: 54, def: 9, spd: 10, crit: 8, dodge: 0, mpGain: 12, basic: 'antlerrake', skills: ['rut'], rules: [{ if: 'foe_highest_pow', do: 'rut' }],
    phases: [{ below: 0.6, name: 'The Wild Hunt', line: 'Two Briar Wolves answer the horn', call: { key: 'briarwolf', n: 2 } }] },
  // Region IV: the Ashen Keep. Undead knights, beasts of coal and fire-priests: Burning everywhere, heavy armour, covers,
  // siege shots at your back row and telegraphed blasts.
  ashknight: { name: 'Ash Knight', tags: ['undead'], role: 'Heavy armour, and a Shield Wall when hurt.', intro: 'A knight in fire-blackened plate grinds to attention.', death: 'The armour falls in, full of ash.', hp: 80, mp: 30, pow: 26, def: 12, spd: 8, crit: 5, dodge: 0, mpGain: 10, basic: 'ashblade', skills: ['ashwall'], rules: [{ if: 'self_hp_lt', n: 50, do: 'ashwall' }] },
  cinderhound: { name: 'Cinder Hound', tags: ['beast'], role: 'Fast, and sets your front row Burning.', intro: 'Hounds of coal and cinders pad out of the kennels, smoking.', death: 'It crumbles to embers.', hp: 90, mp: 20, pow: 22, def: 4, spd: 13, crit: 5, dodge: 10, mpGain: 10, basic: 'emberbite', skills: ['firebreath'], rules: [{ if: 'front_foe', do: 'firebreath' }] },
  squire: { name: 'Flayed Squire', tags: ['undead'], role: 'Covers its strongest ally, taking every hit for it.', intro: 'A squire with no skin left holds his knight’s spear.', death: 'He kneels, as if to be knighted, and falls.', hp: 95, mp: 30, pow: 18, def: 6, spd: 10, crit: 5, dodge: 5, mpGain: 10, basic: 'spear', skills: ['serve'], rules: [{ if: 'ally_top_pow', do: 'serve' }] },
  arbalist: { name: 'Ashen Arbalist', tags: ['undead'], role: 'Winds up a siege shot at your back row.', intro: 'A crossbow cranks somewhere on the battlements.', death: 'The windlass spins loose.', hp: 85, mp: 30, pow: 21, def: 5, spd: 8, crit: 8, dodge: 0, mpGain: 10, basic: 'ashbolt', skills: ['siegeshot'], rules: [{ if: 'foe_back', do: 'siegeshot' }] },
  kilnwarden: { name: 'The Kiln Warden', elite: true, role: 'Stokes a blast that burns every hero. Ward the party before it lands.', intro: 'A furnace on iron legs stamps out of the forge, roaring.', death: 'Its fire gutters, and it cools with a long tick.', hp: 320, mp: 50, pow: 26, def: 12, spd: 6, crit: 5, dodge: 0, mpGain: 10, basic: 'furnacefist', skills: ['stoke'], rules: [{ if: 'always', do: 'stoke' }], res: { stun: 50, move: 60, bleed: 70, blight: 90, curse: 30, debuff: 40 } },
  pyrepriest: { name: 'The Pyre Priest', healer: true, elite: true, role: 'Heals and kindles the foes from behind their armour.', intro: 'A priest in a burning mitre blesses the knights with fire.', death: 'The flames go out, and only the cinders kneel.', hp: 215, mp: 50, pow: 44, def: 6, spd: 9, crit: 5, dodge: 5, mpGain: 12, basic: 'brand', skills: ['riteofash'], rules: [{ if: 'ally_hp_lt', n: 60, do: 'riteofash' }, { if: 'foe_without', s: 'burn', do: 'brand' }], res: { stun: 35, move: 40, bleed: 40, blight: 80, curse: 40, debuff: 40 } },
  marshal: { name: 'The Burnt Marshal', tags: ['undead'], boss: true, role: 'Splashing blows, a Rally, a charge on your front row, and the keep burns.', intro: 'The Burnt Marshal raises a blade that never cooled.', death: 'He falls, and the keep burns down to embers at last.', hp: 360, mp: 50, pow: 50, def: 10, spd: 9, crit: 8, dodge: 0, mpGain: 12, basic: 'marshalblade', skills: ['rally', 'burntcharge'], rules: [{ if: 'ally_without', s: 'kindled', do: 'rally' }, { if: 'front_foe', do: 'burntcharge' }],
    phases: [{ below: 0.5, name: 'The Keep Burns', line: 'Every hero burns at the start of each turn', aura: { k: 'burn', p: 0.2 } }] },
  // Region V: the Hollow Throne. Spirits and undead: buffs stripped, confusion, a death announced, your formation
  // rearranged, and cover on everything that matters. Nothing new to learn: it tests what you've built.
  courtier: { name: 'Hollow Courtier', tags: ['spirit'], role: 'Flatters your hardest hitter into confusion.', intro: 'A courtier with no face bows too low.', death: 'It fades in the middle of a bow.', hp: 90, mp: 30, pow: 22, def: 5, spd: 11, crit: 5, dodge: 10, mpGain: 10, basic: 'compliment', skills: ['flattery'], rules: [{ if: 'foe_highest_pow', do: 'flattery' }] },
  shade: { name: 'Crowned Shade', tags: ['spirit'], role: 'Steals a helpful status from a kindled hero.', intro: 'A shade in a paper crown reaches for what is yours.', death: 'The crown floats down, empty.', hp: 100, mp: 30, pow: 24, def: 5, spd: 11, crit: 5, dodge: 20, mpGain: 10, basic: 'shadetouch', skills: ['usurp'], rules: [{ if: 'foe_has', s: 'kindled', do: 'usurp' }] },
  herald: { name: 'Bone Herald', tags: ['undead'], role: 'Dooms your hardest hitter, three turns ahead.', intro: 'A skeleton in a herald’s tabard unrolls a scroll with your name on it.', death: 'The scroll burns, and the name on it with it.', hp: 95, mp: 40, pow: 22, def: 8, spd: 9, crit: 5, dodge: 0, mpGain: 10, basic: 'proclamation', skills: ['heraldsdoom'], rules: [{ if: 'foe_highest_pow', do: 'heraldsdoom' }] },
  wickwraith: { name: 'Wick Wraith', tags: ['spirit'], role: 'Snuffs the Kindled, Hasted, Warded and Blessed from your party.', intro: 'A wraith of melted tallow carries its own guttering wick.', death: 'It drips away to a puddle of wax.', hp: 80, mp: 30, pow: 20, def: 4, spd: 12, crit: 5, dodge: 15, mpGain: 10, basic: 'gutter', skills: ['snufflight'], rules: [{ if: 'foe_has', s: 'kindled', do: 'snufflight' }] },
  kingsguard: { name: 'Kingsguard Revenant', tags: ['undead'], elite: true, role: 'Covers its wounded, and will not fall the first time.', intro: 'The Kingsguard stands its ground, as it has for a hundred years.', death: 'It falls at its post.', hp: 360, mp: 40, pow: 82, def: 16, spd: 8, crit: 5, dodge: 0, mpGain: 10, basic: 'guardhalberd', skills: ['kgoath'], rules: [{ if: 'ally_hurt', do: 'kgoath' }],
    phases: [{ below: 0.25, name: 'Last Stand', line: 'It will not fall this turn', self: [{ k: 'unbroken', t: 1 }] }] },
  chamberlain: { name: 'The Lord Chamberlain', tags: ['spirit'], elite: true, role: 'Rearranges your party, and summons the court.', intro: 'The Lord Chamberlain raps his rod: the court will come to order.', death: 'The rod clatters to the floor. Court is dismissed.', hp: 320, mp: 50, pow: 44, def: 6, spd: 10, crit: 5, dodge: 10, mpGain: 12, basic: 'rod', skills: ['summoncourt', 'reorder'], rules: [{ if: 'allies_lt', n: 4, do: 'summoncourt' }, { if: 'foe_back', do: 'reorder' }] },
  hollowking: { name: 'The Hollow King', tags: ['spirit'], boss: true, role: 'Calls his court, snuffs your lanterns, and dooms you all.', intro: 'On a throne of tallow and bone, the Hollow King lifts his head.', death: 'The crown rolls from his hollow head. The lanterns burn on.', hp: 210, mp: 60, pow: 36, def: 10, spd: 10, crit: 8, dodge: 0, mpGain: 12, basic: 'sceptre', skills: ['courtofshades'], rules: [{ if: 'allies_lt', n: 4, do: 'courtofshades' }],
    phases: [
      { below: 0.66, name: 'Snuff the Lanterns', line: 'Every blessing is stripped, every hero Dazzled, and the court is done', strip: true, foes: [{ k: 'dazzled', t: 2 }], swap: { courtofshades: 'snufflight' } },
      { below: 0.33, name: 'Long Live the King', line: 'Every hero is Doomed, and his Sceptre strikes a row', foes: [{ k: 'doom', t: 3, p: 0.2 }], swap: { sceptre: 'sceptrerow' } },
    ] },
};
for (const id in FOES) FOES[id].id = id;
const foeRank = F => (F.boss ? 'boss' : F.elite ? 'elite' : 'normal');
// Foe resistances when a foe lists none, before family shifts (content spec §3): normal foes 10–40%, elites 30–60%,
// bosses 50–90% (tune). A family shift can take one to 100% or more, which makes that foe immune.
const FOE_RES = { normal: 20, elite: 40, boss: 65 };
const FAMILY_RES = { undead: { bleed: 40, blight: 20 }, spirit: { bleed: 60, move: 40, curse: -20 }, beast: { bleed: -10, stun: -10 } };
function foeRes(F) {
  if (F.res) return Object.assign({}, F.res);
  const base = FOE_RES[foeRank(F)], r = {};
  for (const k of RES_KEYS) r[k] = base;
  for (const t of F.tags || []) for (const k in FAMILY_RES[t] || {}) r[k] += FAMILY_RES[t][k];
  return r;
}

// ── How foes grow with their stage's level (campaign spec §3.1, tune)
// Health starts gentle and steepens to level 10, so early stages are quick and cheap in fatigue; Power grows faster
// than Health, so foes stay dangerous without making battles long. From level 10 the party is full, and foes grow at
// about the heroes' own pace. Speed rises 0.02 a level and resistances 0.1 a level; mana, Crit and Dodge stay put.
// From level 50, heroes take a step up (the second skill slot, tier 3, then Rare gear) and keep pulling ahead through
// tier 4 at 80, so foe Health steps up with them: ×1.5 from level 50, rising to ×2 at level 100. Power keeps its pace
// (build step 7's reference party, tools/reference.js; tune).
const FOE_LATE_HP = L => (L < 50 ? 1 : L <= 75 ? 1.5 : 1.5 + 0.02 * (L - 75));
const FOE_GROW = {
  hp: L => (L <= 10 ? 1 + 0.064 * (L - 1) + 0.024 * (L - 1) * (L - 1) : 3.52 * (1 + 0.065 * (L - 10)) * FOE_LATE_HP(L)),
  pow: L => (L <= 10 ? 1 + 0.42 * (L - 1) : 4.78 * (1 + 0.06 * (L - 10))),
  def: L => 1 + 0.06 * (L - 1),
  spd: 0.02, res: 0.1,
};
// A foe's stats at a level: { hp, mp, pow, def, spd, crit, dodge, mpGain, res }.
function foeStats(F, level) {
  const L = Math.max(1, level || 1);
  const res = foeRes(F);
  for (const k in res) res[k] = +(res[k] + FOE_GROW.res * (L - 1)).toFixed(1);
  return {
    hp: Math.max(1, Math.round(F.hp * FOE_GROW.hp(L))), mp: F.mp, pow: F.pow * FOE_GROW.pow(L), def: F.def * FOE_GROW.def(L),
    spd: F.spd + FOE_GROW.spd * (L - 1), crit: F.crit, dodge: F.dodge, mpGain: F.mpGain, res,
  };
}

// ── Regions
// Five regions along the road (campaign spec §2, §6), every one built.
// mat: the material it drops most (MATERIALS in js/save.js). opens: what lights the road into it. lit: what the trip
// summary says when its boss falls.
const REGIONS = [
  { num: 'I', name: 'Gravefields', levels: [1, 10], mat: 'bone_dust', boss: 'The Sexton', relic: 'gravediggersspade', stages: 18, line: 'Barrow-fields under a low moon. The dead do not stay put.', lit: 'The Gravefields are lit.' },
  { num: 'II', name: 'Drowned Chapel', levels: [11, 30], mat: 'chapel_wax', boss: 'The Drowned Bishop', relic: 'bishopscrozier', stages: 17, opens: 'Beat the Sexton to enter', line: 'A flooded chapel where the drowned still hold their services, and bells toll under the water.', lit: 'The Drowned Chapel is lit.' },
  { num: 'III', name: 'Thornwood', levels: [31, 50], mat: 'heartwood', boss: 'The Antlered One', relic: 'barkofoldgod', stages: 17, opens: 'Beat the Drowned Bishop to enter', line: 'An old wood where the road narrows, wolves run in packs, and an old god waits.', lit: 'Thornwood is lit.' },
  { num: 'IV', name: 'Ashen Keep', levels: [51, 75], mat: 'cinder_iron', boss: 'The Burnt Marshal', relic: 'marshalsblade', stages: 18, opens: 'Beat the Antlered One to enter', line: 'A keep its own marshal burned. It is burning still.', lit: 'The Ashen Keep is lit, and its fires are out.' },
  { num: 'V', name: 'Hollow Throne', levels: [76, 100], mat: 'throne_tallow', boss: 'The Hollow King', relic: 'hollowcrown', stages: 18, opens: 'Beat the Burnt Marshal to enter', line: 'A court of the dead under a throne of tallow and bone, where would-be kings wait for a crown.', lit: 'Every lantern on the road burns.' },
];
const REGION_NAMES = REGIONS; // the battle screen's older name for the same list
const TOTAL_STAGES = REGIONS.reduce((n, R) => n + R.stages, 0);

// ── What a first clear unlocks (campaign spec §5.3)
// kind: feature (works now), condition (a rule condition), building (a blueprint: the home base, build step 5, turns
// it into one), relic, class (joins the recruit board, step 5) or region. step: the build step that makes it do
// something, when it does nothing yet. cond: the Tactics keys a condition unlock teaches.
const UNLOCKS = {
  tactics: { kind: 'feature', name: 'The Tactics screen', icon: 'book', line: 'Give your heroes rules: what to do, and when.' },
  recruitboard: { kind: 'building', name: 'The Recruit Board', icon: 'heart', line: 'It opens, and its first recruit is free.', step: 5 },
  items: { kind: 'feature', name: 'Party items', icon: 'flask', line: '2 loadout slots, 2 Healing Draughts, and “Ally: health below 50% → Healing Draught”.' },
  'cond:foes_at_least': { kind: 'condition', name: 'N or more foes', icon: 'scroll', cond: ['foes_at_least'] },
  'cond:foe_back': { kind: 'condition', name: 'Foe: in the back row', icon: 'scroll', cond: ['foe_back'] },
  tollhouse: { kind: 'building', name: 'Toll House blueprint', icon: 'bell', line: 'Gold while you are away.', step: 5 },
  keepgoing: { kind: 'feature', name: 'Keep going after a win', icon: 'lantern', line: 'Chain stages until fatigue or a party rule sends the party home.' },
  'cond:foe_tag:undead': { kind: 'condition', name: 'Foe: undead', icon: 'scroll', cond: ['foe_tag:undead'] },
  infirmary: { kind: 'building', name: 'Infirmary blueprint', icon: 'cross', line: 'Beds rest fatigue away faster.', step: 5 },
  'cond:foe_highest_pow': { kind: 'condition', name: 'Foe: highest attack', icon: 'scroll', cond: ['foe_highest_pow'] },
  trainingyard: { kind: 'building', name: 'Training Yard blueprint', icon: 'sword', line: 'XP while you are away.', step: 5 },
  'cond:foe_boss': { kind: 'condition', name: 'Foe: boss or elite', icon: 'scroll', cond: ['foe_boss'] },
  'cond:ally_hurt': { kind: 'condition', name: 'Ally: most hurt', icon: 'scroll', cond: ['ally_hurt'] },
  shop: { kind: 'building', name: 'Shop blueprint', icon: 'coin', line: 'Party items and a small gear stall.', step: 5 },
  tactician: { kind: 'feature', name: 'Tactician I', icon: 'book', line: 'Thresholds, Focus fire, saved rule sets and a dozen conditions, and the Tactician’s blueprint.' },
  'cond:foe_charging': { kind: 'condition', name: 'Foe: charging a big attack', icon: 'scroll', cond: ['foe_charging'] },
  scavengercamp: { kind: 'building', name: 'Scavenger Camp blueprint', icon: 'bag', line: 'Gear and materials while you are away.', step: 5 },
  'cond:bb_next_boss': { kind: 'condition', name: 'Between battles: next stage has a boss or elite', icon: 'scroll', cond: ['bb_next_boss'] },
  barracks: { kind: 'building', name: 'Barracks blueprint', icon: 'shield', line: 'Room for more heroes.', step: 5 },
  salvagepit: { kind: 'building', name: 'Salvage Pit blueprint', icon: 'bone', line: 'Gear rolls while you are away.', step: 5 },
  'cond:boss_present': { kind: 'condition', name: 'Boss present', icon: 'scroll', cond: ['boss_present'] },
  'relic:gravediggersspade': { kind: 'relic', name: 'Relic: the Gravedigger’s Spade', icon: 'star', relic: 'gravediggersspade' },
  gravecaller: { kind: 'class', name: 'The Gravecaller joins the recruit board', icon: 'bone', step: 5 },
  'region:1': { kind: 'region', name: 'The Drowned Chapel opens', icon: 'lantern', line: 'The road goes on, down into a flooded chapel.' },
  'cond:ally_fallen': { kind: 'condition', name: 'Ally: fallen', icon: 'scroll', cond: ['ally_fallen'] },
  // Region II opens with the Masters' Hall and the Shrine (home-base spec §3)
  mastershall: { kind: 'building', name: 'Masters’ Hall blueprint', icon: 'book', line: 'Trains skill slots and rule slots while a hero is away.', step: 5 },
  shrine: { kind: 'building', name: 'Shrine blueprint', icon: 'holy', line: 'Respecs a hero’s skill trees for gold.', step: 5 },
  // Region II: the Drowned Chapel (its classes join as it opens, after the Sexton)
  'cond:foe_tag:spirit': { kind: 'condition', name: 'Foe: spirit', icon: 'scroll', cond: ['foe_tag:spirit'] },
  surgeon: { kind: 'class', name: 'The Barber-Surgeon joins the recruit board', icon: 'cross', line: 'A healer who cleanses: Silence, poison and fire.', step: 5 },
  bellringer: { kind: 'class', name: 'The Bellringer joins the recruit board', icon: 'bell', line: 'Turn delays, slows and stuns: the Toll, done to them.', step: 5 },
  'cond:foe_healer': { kind: 'condition', name: 'Foe: healer', icon: 'scroll', cond: ['foe_healer'] },
  'cond:enraged': { kind: 'condition', name: 'Foes enraged', icon: 'scroll', cond: ['enraged'] },
  'relic:bishopscrozier': { kind: 'relic', name: 'Relic: the Bishop’s Crozier', icon: 'star', relic: 'bishopscrozier' },
  duellist: { kind: 'class', name: 'The Duellist joins the recruit board', icon: 'sword', line: 'A tank who dodges and counters.', step: 5 },
  'region:2': { kind: 'region', name: 'Thornwood opens', icon: 'lantern', line: 'The road narrows into an old wood.' },
  whetstone: { kind: 'building', name: 'Whetstone blueprint', icon: 'sword', line: 'A passive bonus: +Power or +Crit for the party.', step: 5 },
  ossuary: { kind: 'building', name: 'Ossuary blueprint', icon: 'bone', line: 'A passive bonus: +max Health or +Defense for the party.', step: 5 },
  // Region III: Thornwood
  'cond:foe_tag:beast': { kind: 'condition', name: 'Foe: beast', icon: 'scroll', cond: ['foe_tag:beast'] },
  cutpurse: { kind: 'class', name: 'The Cutpurse joins the recruit board', icon: 'coin', line: 'An assassin who steals gold as it kills.', step: 5 },
  'cond:ally_top_pow': { kind: 'condition', name: 'Ally: highest Power', icon: 'scroll', cond: ['ally_top_pow'] },
  'cond:foe_next': { kind: 'condition', name: 'Foe: acts next', icon: 'scroll', cond: ['foe_next'] },
  'relic:barkofoldgod': { kind: 'relic', name: 'Relic: the Bark of the Old God', icon: 'star', relic: 'barkofoldgod' },
  alchemist: { kind: 'class', name: 'The Alchemist joins the recruit board', icon: 'flask', line: 'Fire, acid and the party’s items.', step: 5 },
  'region:3': { kind: 'region', name: 'The Ashen Keep opens', icon: 'lantern', line: 'Beyond the wood, a keep is still burning.' },
  hexingstone: { kind: 'building', name: 'Hexing Stone blueprint', icon: 'eye', line: 'A passive bonus: the party’s harmful effects land more often.', step: 5 },
  belltower: { kind: 'building', name: 'Bell Tower blueprint', icon: 'bell', line: 'A passive bonus: +resistances for the party.', step: 5 },
  // Region IV: the Ashen Keep
  'cond:allies_lt': { kind: 'condition', name: 'Fewer than N allies standing', icon: 'scroll', cond: ['allies_lt'] },
  'relic:marshalsblade': { kind: 'relic', name: 'Relic: the Marshal’s Ashen Blade', icon: 'star', relic: 'marshalsblade' },
  'region:4': { kind: 'region', name: 'The Hollow Throne opens', icon: 'lantern', line: 'The road climbs to a throne of tallow and bone.' },
  // Region V: the Hollow Throne teaches nothing new. Its boss lights the last lantern.
  'relic:hollowcrown': { kind: 'relic', name: 'Relic: the Hollow Crown', icon: 'star', relic: 'hollowcrown' },
  roadlit: { kind: 'feature', name: 'Every lantern on the road burns', icon: 'lantern', line: 'The Hollow King has fallen. Every stage stays open to farm.' },
};
for (const id in UNLOCKS) UNLOCKS[id].id = id;
// What opening a region also brings (home-base spec §3): its buildings' blueprints and the classes that join the recruit
// board (the home base acts on the region's own unlock: BUILDINGS and CLASS_JOINS in js/base.js). These are the records
// the road shows; a save that crossed into a region before they existed gets them the next time the campaign loads.
const REGION_OPENS = { 'region:1': ['mastershall', 'shrine', 'surgeon', 'bellringer'], 'region:2': ['whetstone', 'ossuary', 'duellist', 'cutpurse'], 'region:3': ['hexingstone', 'belltower', 'alchemist'] };
// The conditions Tactician I teaches (content spec §5), besides every threshold.
const TACTICIAN_I = ['self_mp_lt', 'self_front', 'self_back', 'self_has', 'self_without', 'self_thralls_lt', 'ally_has', 'ally_without', 'foe_hp_lt', 'leader_target', 'foe_without', 'one_foe', 'bb_fell', 'bb_out'];
// Lesson II comes with the home base's Tactician at level 3 (TACTICIAN_LESSONS in js/base.js), and the Gather action with it.

// ── Stages (campaign spec §5.2–5.3)
// foes: the foe in each slot (null for an empty one): front F1 F2, then back B1–B4, as the party's slots. A slot is a
// foe id, or { key, level?, over? } where over changes some of its level-1 stats in this stage only. A melee foe placed
// in the back row waits there and steps up when a front slot opens (js/sim.js).
// kind: road, elite or boss. level: its foes' level, and the hero level it recommends for `party` heroes.
// tier: the reward tier (js/campaign.js): light, standard, rich, elite or boss. first: what its first clear unlocks.
// teaches: what is new in the battle. hint: what the report leads with after a loss.
// The Gravewarden's Bones throw softer than the road's, so the Watch's threat is the Gravewarden itself: fewer, bigger
// hits make a wall less of a pure stat check (the softened cliff, campaign spec §5.6, tune).
const WATCH_BONES = { key: 'bones', over: { pow: 10 } };
const foeKey = x => (x && typeof x === 'object' ? x.key : x);
const STAGES = [
  { id: '1-1', name: 'The Edge of the Light', kind: 'road', level: 1, party: 1, tier: 'light', foes: ['shambler', null, null, null, null, null], first: ['tactics'],
    teaches: 'How a battle runs: the turn strip, a basic attack, your skill and the callouts.', hint: 'Your skill costs mana. Basic attacks restore it.' },
  { id: '1-2', name: 'The Barrow Gate', kind: 'road', level: 1, party: 1, tier: 'light', foes: ['shambler', 'shambler', null, null, null, null], first: ['recruitboard'],
    teaches: 'Rules in action: each callout names the rule that fired.', hint: 'Rules fire from the top. Put the one you want most first.' },
  { id: '1-3', name: 'Gnawed Headstones', kind: 'road', level: 2, party: 2, tier: 'light', foes: ['ghoul', 'shambler', null, 'shambler', null, null], first: ['items'],
    teaches: 'Formation: a front row and a back row. A Shambler waits behind, and the Ghoul brings Bleeding.', hint: 'Put your sturdier hero in front. Claws can’t reach the back row while someone stands in front.' },
  { id: '1-4', name: 'Rat-Choked Crypt', kind: 'road', level: 2, party: 2, tier: 'standard', foes: ['rats', 'rats', null, 'rats', null, null], first: ['cond:foes_at_least'],
    teaches: 'Speed: the rats show up on the turn strip more than anyone.', hint: 'Rats act often and come in waves. A skill that hits the whole front row, like Cleave, handles many at once.' },
  { id: '1-5', name: 'The Sunken Path', kind: 'road', level: 3, party: 2, tier: 'standard', foes: ['ghoul', 'shambler', null, 'bones', null, null], first: ['cond:foe_back', 'tollhouse'],
    teaches: 'Back-row foes: the Bones throw from behind their front row.', hint: 'Melee can’t reach the Bones while their front row stands. Ranged and magic can.' },
  { id: '1-6', name: 'The Ossuary Steps', kind: 'road', level: 3, party: 3, tier: 'standard', foes: ['ghoul', 'ghoul', null, 'bones', 'bones', null], first: ['keepgoing'],
    teaches: 'Chaining: two stages in a row, and fatigue.', hint: 'Fatigue builds with every turn a hero takes. Rest at camp, or swap in a fresh hero.' },
  { id: '1-7', name: 'Rootbound Barrows', kind: 'road', level: 4, party: 3, tier: 'standard', foes: ['ghoul', 'rats', null, 'bones', 'rats', null], first: ['cond:foe_tag:undead', 'infirmary'],
    teaches: 'Families: undead and beasts side by side. Holy damage only doubles on the undead.', hint: 'Holy damage doubles on the undead, not on the rats.' },
  { id: '1-8', name: 'The Glutton’s Pit', kind: 'road', level: 4, party: 3, tier: 'rich', foes: ['glutton', 'shambler', null, 'bones', 'shambler', null], first: ['cond:foe_highest_pow', 'trainingyard'],
    teaches: 'A heavy hitter: the Glutton’s Crushing Blow.', hint: 'The Glutton hits hardest. Guard against it, Dazzle it, or kill the rest first.' },
  { id: '1-9', name: 'The Gravewarden’s Watch', kind: 'elite', elite: true, level: 5, party: 4, tier: 'elite', foes: ['gravewarden', 'ghoul', WATCH_BONES, WATCH_BONES, null, WATCH_BONES], first: ['cond:foe_boss'],
    teaches: 'An elite: the Gravewarden guards its allies, and its hook reaches your back row.', hint: 'The Gravewarden guards its wounded. Hits on a whole row aren’t redirected, and Doom keeps ticking.' },
  { id: '1-10', name: 'Crowfield', kind: 'road', level: 5, party: 4, tier: 'standard', foes: ['ghoul', 'ghoul', 'crows', 'bones', null, 'crows'], first: ['cond:ally_hurt', 'shop'],
    teaches: 'Reach: the Crows fly over your front row to the weakest hero.', hint: 'Crows go for the weakest. Heal the most hurt ally first.' },
  { id: '1-11', name: 'The Mourning Path', kind: 'road', level: 6, party: 4, tier: 'standard', foes: ['ghoul', 'glutton', null, 'mourner', 'bones', null], first: ['tactician'],
    teaches: 'Foe support: the Mourner’s Dirge kindles every foe.', hint: 'Kill the Mourner first. She’s in the back row.' },
  { id: '1-12', name: 'Fresh Graves', kind: 'road', level: 6, party: 4, tier: 'standard', foes: ['digger', 'ghoul', 'bones', 'mourner', 'bones', null], first: ['cond:foe_charging'],
    teaches: 'Charged attacks: a Gravedigger Marks a hero, then strikes.', hint: 'When a digger Marks a hero, Guard that hero or kill the digger.' },
  { id: '1-13', name: 'The Digging Fields', kind: 'road', level: 7, party: 5, tier: 'standard', foes: ['digger', 'digger', 'crows', 'mourner', 'bones', null], first: ['scavengercamp'],
    teaches: 'Two chargers at once.', hint: 'Two diggers, two Marks. A Warden’s Guard covers both.' },
  { id: '1-14', name: 'The Lych-gate', kind: 'road', level: 7, party: 5, tier: 'rich', foes: ['glutton', 'ghoul', 'bones', 'mourner', 'bones', null], first: [],
    teaches: 'Everything so far, in one stage.', hint: 'The Lych-gate mixes everything. The battle report shows what hurt most.' },
  { id: '1-15', name: 'The Rat King’s Court', kind: 'elite', elite: true, level: 8, party: 5, tier: 'elite', foes: ['ratking', 'rats', null, 'rats', 'rats', null], first: ['cond:bb_next_boss', 'barracks'],
    teaches: 'An elite: the Rat King calls more rats while he stands.', hint: 'The rats keep coming while the King stands. Kill the King.' },
  { id: '1-16', name: 'The Mourners’ Walk', kind: 'road', level: 8, party: 6, tier: 'standard', foes: ['glutton', 'ghoul', 'mourner', 'bones', 'bones', 'mourner'], first: ['salvagepit'],
    teaches: 'Two Mourners: support that stacks.', hint: 'Two Mourners keep every foe kindled. Hit the back row first.' },
  { id: '1-17', name: 'The Sexton’s Yard', kind: 'road', level: 9, party: 6, tier: 'rich', foes: ['digger', 'digger', 'mourner', 'crows', 'bones', 'crows'], first: [],
    teaches: 'The Sexton’s men: diggers, crows and a Mourner.', hint: 'If the yard is hard, the Sexton is harder. Farm here first.' },
  { id: '1-18', name: 'The Sexton’s Grave', kind: 'boss', boss: true, level: 10, party: 6, tier: 'boss', foes: ['sexton', 'digger', null, 'mourner', 'bones', null], first: ['cond:boss_present', 'relic:gravediggersspade', 'gravecaller', 'region:1', 'mastershall', 'shrine', 'surgeon', 'bellringer'],
    teaches: 'A boss: the Sexton digs graves, throws grave dirt, and digs two graves below half health.', hint: 'When the Sexton digs, Guard the Marked hero. Below half health he digs two graves.' },

  // ── Region II: the Drowned Chapel, levels 11–30 (campaign spec §6). threat: a stage that brings a new threat, so its
  // target is 85%+ instead of 90%+, as the rich ones are. Gravefields dead who followed the road down fill its front row
  // at first.
  { id: '2-1', name: 'The Chapel Steps', kind: 'road', level: 11, party: 6, tier: 'standard', foes: ['ghoul', 'ghoul', 'bones', 'acolyte', null, 'bones'], first: [],
    teaches: 'Foes that heal: the Drowned Acolyte’s hymn heals every foe.', hint: 'The Acolyte heals the rest. Ranged and magic reach it in the back row: kill it first.' },
  { id: '2-2', name: 'The Bell-Drowned Nave', kind: 'road', level: 12, party: 6, tier: 'standard', threat: true, foes: ['ghoul', 'glutton', 'bellwraith', 'acolyte', null, 'bellwraith'], first: ['cond:foe_tag:spirit'],
    teaches: 'Spirits: the Bell Wraiths dodge, barely bleed, and their Toll pushes your turns back.', hint: 'Spirits dodge and shrug off Bleeding, but curses like Doom bite them harder.' },
  { id: '2-3', name: 'The Swollen Pews', kind: 'road', level: 13, party: 6, tier: 'standard', threat: true, foes: ['bloat', 'bloat', null, 'acolyte', 'bones', null], first: [],
    teaches: 'Bursting corpses: a Bloated Corpse bursts below a third of its health, hitting every hero.', hint: 'Hit a corpse hard, all at once, so it never gets the chance to burst. A Ward soaks the blast.' },
  { id: '2-4', name: 'The Silent Cloister', kind: 'road', level: 14, party: 6, tier: 'standard', threat: true, foes: ['bloat', 'ghoul', 'sister', 'acolyte', null, 'bones'], first: [],
    teaches: 'Silence: the Silent Sister’s vow leaves your healer only a basic attack for 2 turns.', hint: 'The Sister goes for your healer. A Bitter Tincture breaks the silence, or kill her first.' },
  { id: '2-5', name: 'The Belfry Stair', kind: 'road', level: 15, party: 6, tier: 'standard', foes: ['bloat', 'bellwraith', 'bellwraith', 'acolyte', null, 'bellwraith'], first: [],
    teaches: 'Toll after Toll: three Bell Wraiths keep pushing your turns back.', hint: 'Three wraiths toll in turn. They’re fragile, if you can hit them: sure hits and area skills find them.' },
  { id: '2-6', name: 'The Choir Stalls', kind: 'road', level: 16, party: 6, tier: 'standard', foes: ['bloat', 'ghoul', 'acolyte', 'sister', 'acolyte', null], first: [],
    teaches: 'Two healers: they heal each other, so kill them one at a time.', hint: 'Two Acolytes keep each other standing. Focus one until it falls, then the other.' },
  { id: '2-7', name: 'The Sunken Ossuary', kind: 'road', level: 17, party: 6, tier: 'rich', foes: ['bloat', 'ghoul', 'acolyte', 'bellwraith', null, 'sister'], first: [],
    teaches: 'Everything the chapel has shown, before its first wall.', hint: 'If the ossuary is hard, the Choir is harder. Farm here first.' },
  { id: '2-8', name: 'The Choir of Silt', kind: 'elite', elite: true, level: 18, party: 6, tier: 'elite', foes: ['choir', 'bloat', 'acolyte', null, null, 'acolyte'], first: ['cond:foe_healer'],
    teaches: 'An elite: the Choir heals its own and Dooms every hero.', hint: 'The Choir and both Acolytes heal. Kill the Acolytes first; Doom keeps ticking through the hymns.' },
  { id: '2-9', name: 'The Drowned Library', kind: 'road', level: 18, party: 6, tier: 'standard', foes: ['bloat', 'ghoul', 'sister', 'acolyte', 'bellwraith', null], first: [],
    teaches: 'Put “Foe: healer” to work: it finds the Acolyte wherever it stands.', hint: '“Foe: healer → Aimed Shot” finds the Acolyte. The Sister is hunting your healer too.' },
  { id: '2-10', name: 'The Bell Tower', kind: 'road', level: 19, party: 6, tier: 'standard', foes: ['bellwraith', 'bellwraith', 'bellwraith', null, 'acolyte', 'bellwraith'], first: [],
    teaches: 'A belfry of wraiths, in the front row too.', hint: 'Spirits dodge. Sure hits, skills that hit a row and curses all find them.' },
  { id: '2-11', name: 'The Font Cellars', kind: 'road', level: 20, party: 6, tier: 'standard', foes: ['bloat', 'bloat', 'acolyte', 'sister', null, 'bones'], first: [],
    teaches: 'Two corpses with a healer behind: the Acolyte keeps them from bursting until it’s too late.', hint: 'Kill the Acolyte, then burst the corpses one at a time.' },
  { id: '2-12', name: 'The Vestry', kind: 'road', level: 22, party: 6, tier: 'standard', foes: ['ghoul', 'bloat', 'sister', 'bellwraith', 'sister', null], first: [],
    teaches: 'Two Sisters: two silences.', hint: 'Two Sisters can silence two healers. Pack Bitter Tinctures, or kill them first.' },
  { id: '2-13', name: 'The Font Steps', kind: 'road', level: 23, party: 6, tier: 'rich', foes: ['bloat', 'bloat', 'acolyte', 'bellwraith', null, 'sister'], first: [],
    teaches: 'The steps up to the font: healers, tolls and corpses together.', hint: 'The Leech waits at the top of these steps. Farm here until the party is ready.' },
  { id: '2-14', name: 'The Font Leech', kind: 'elite', elite: true, level: 25, party: 6, tier: 'elite', foes: ['leech', 'bloat', null, 'acolyte', 'sister', null], first: ['cond:enraged'],
    teaches: 'An elite: the Font Leech drains your mana and heals on it, until the fight drags into enrage.', hint: 'The Leech drains mana. Basic attacks restore it, and so do Lamp Oil and Gather.' },
  { id: '2-15', name: 'The Drowned Choir', kind: 'road', level: 25, party: 6, tier: 'standard', foes: ['bloat', 'ghoul', 'acolyte', 'bellwraith', null, 'bellwraith'], first: [],
    teaches: 'The choir that stayed: two healers behind two tolling wraiths.', hint: 'Kill the Acolytes first. “Foe: healer” finds them.' },
  { id: '2-16', name: 'The Bishop’s Antechamber', kind: 'road', level: 27, party: 6, tier: 'rich', foes: ['bloat', 'ghoul', 'acolyte', 'sister', 'bellwraith', null], first: [],
    teaches: 'The Bishop’s own: everything the chapel has, at once.', hint: 'If the antechamber is hard, the Bishop is harder. Farm here first.' },
  { id: '2-17', name: 'The Black Font', kind: 'boss', boss: true, level: 30, party: 6, tier: 'boss', foes: ['bishop', 'bloat', null, 'acolyte', 'sister', null], first: ['relic:bishopscrozier', 'region:2', 'whetstone', 'ossuary', 'duellist', 'cutpurse'],
    teaches: 'A boss: the Drowned Bishop raises the fallen, baptises a Marked hero, and floods the nave. Below half health the font overflows.', hint: 'Kill the Acolyte before the Bishop raises the rest. When he Marks a hero, Guard them.' },

  // ── Region III: Thornwood, levels 31–50. Mostly beasts.
  { id: '3-1', name: 'The Wood’s Edge', kind: 'road', level: 31, party: 6, tier: 'standard', foes: ['thornwitch', 'briarwolf', 'crows', null, 'thornwitch', 'crows'], first: [],
    teaches: 'Poison: each tick of the Thorn Witches’ Rot Bloom is stronger than the last.', hint: 'Poison grows with every tick. Cleanse it early, or kill the witch who cast it.' },
  { id: '3-2', name: 'The Wolf Run', kind: 'road', level: 32, party: 6, tier: 'standard', threat: true, foes: ['briarwolf', 'briarwolf', null, 'thornwitch', 'briarwolf', null], first: ['cond:foe_tag:beast'],
    teaches: 'Packs: each Briar Wolf hits harder for every other wolf standing.', hint: 'Wolves hit harder while the pack stands. Thin it with skills that hit the whole front row.' },
  { id: '3-3', name: 'The Hanging Wood', kind: 'road', level: 33, party: 6, tier: 'standard', threat: true, foes: ['briarwolf', 'briarwolf', 'hanged', null, 'thornwitch', null], first: [],
    teaches: 'Hidden foes: the Hanged Man waits in the branches until he drops on your back row.', hint: 'You can’t aim at the Hanged Man until he attacks. Skills that hit a row still find him.' },
  { id: '3-4', name: 'The Wisp Fen', kind: 'road', level: 34, party: 6, tier: 'standard', threat: true, foes: ['briarwolf', 'briarwolf', 'marshlantern', null, null, 'thornwitch'], first: [],
    teaches: 'Your formation, broken: the Marsh Lantern lures a back-row hero into the front row.', hint: 'A lured hero can walk back: “Self: in the front row → Move”. Move resistance resists the lure.' },
  { id: '3-5', name: 'The Briar Crossing', kind: 'road', level: 35, party: 6, tier: 'standard', foes: ['briarwolf', 'briarwolf', 'thornwitch', 'briarwolf', 'briarwolf', null], first: [],
    teaches: 'A bigger pack: the wolves behind step up as the front falls.', hint: 'Four wolves, and every one hits harder while the rest stand. Hit the whole row.' },
  { id: '3-6', name: 'The Gallows Glade', kind: 'road', level: 36, party: 6, tier: 'standard', foes: ['briarwolf', 'thornwitch', 'hanged', 'thornwitch', 'hanged', null], first: [],
    teaches: 'Two Hanged Men: two drops from hiding on your back row.', hint: 'Stun resistance and a Bitter Tincture answer the drops. A Warden’s Guard takes the second one.' },
  { id: '3-7', name: 'The Old Wood’s Heart', kind: 'road', level: 37, party: 6, tier: 'rich', foes: ['briarwolf', 'thornwitch', 'marshlantern', 'hanged', null, 'thornwitch'], first: [],
    teaches: 'Everything the wood has shown, before Mother Bramble.', hint: 'If the heart of the wood is hard, Mother Bramble is harder. Farm here first.' },
  { id: '3-8', name: 'Mother Bramble’s Hollow', kind: 'elite', elite: true, level: 38, party: 6, tier: 'elite', foes: ['bramble', 'briarwolf', 'thornwitch', null, null, 'thornwitch'], first: ['cond:ally_top_pow'],
    teaches: 'An elite: Mother Bramble’s thorns hurt whoever hits her while they’re up.', hint: 'While her thorns are up, every hit on her hurts you back. Hit the others until they drop: “Foe: not Retaliating”.' },
  { id: '3-9', name: 'The Thorn Path', kind: 'road', level: 38, party: 6, tier: 'standard', foes: ['briarwolf', 'briarwolf', 'thornwitch', 'marshlantern', null, null], first: [],
    teaches: '“Ally: highest Power”: put a Haste or a Cover on your hardest hitter.', hint: 'The Lantern lures; the wolves wait for whoever comes forward.' },
  { id: '3-10', name: 'The Rotting Bower', kind: 'road', level: 39, party: 6, tier: 'standard', foes: ['briarwolf', 'thornwitch', 'thornwitch', 'hanged', null, 'thornwitch'], first: [],
    teaches: 'A bower of witches: poison on everyone.', hint: 'Three witches poison three heroes. Blight resistance and cleansing keep up.' },
  { id: '3-11', name: 'The Hollow Oak', kind: 'road', level: 40, party: 6, tier: 'standard', foes: ['briarwolf', 'briarwolf', 'hanged', 'marshlantern', 'thornwitch', null], first: [],
    teaches: 'Lured forward, then dropped on: the Lantern and the Hanged Men work together.', hint: 'Kill the Lantern first, and Move lured heroes back.' },
  { id: '3-12', name: 'The Moonlit Clearing', kind: 'road', level: 42, party: 6, tier: 'standard', foes: ['briarwolf', 'briarwolf', 'briarwolf', 'marshlantern', 'thornwitch', null], first: [],
    teaches: 'The whole pack under the moon.', hint: 'Four wolves at once. Thin the pack before anything else.' },
  { id: '3-13', name: 'The Boar Wallow', kind: 'road', level: 43, party: 6, tier: 'rich', foes: ['briarwolf', 'briarwolf', 'thornwitch', 'hanged', 'marshlantern', null], first: [],
    teaches: 'The trampled ground where the Thornback wallows.', hint: 'The Thornback is next. Farm here until the party is ready.' },
  { id: '3-14', name: 'The Thornback', kind: 'elite', elite: true, level: 45, party: 6, tier: 'elite', foes: ['thornback', 'briarwolf', null, 'thornwitch', 'briarwolf', null], first: ['cond:foe_next'],
    teaches: 'An elite: the Thornback charges your whole front row, and stuns it.', hint: 'When the Thornback lowers its head, Guard, Ward, or break the charge with a stun.' },
  { id: '3-15', name: 'The Antler Grove', kind: 'road', level: 45, party: 6, tier: 'standard', foes: ['briarwolf', 'briarwolf', 'hanged', 'thornwitch', 'marshlantern', null], first: [],
    teaches: '“Foe: acts next”: push back whoever is about to act, before they do.', hint: 'Witches, a Lantern and a Hanged Man behind two wolves. Kill order matters.' },
  { id: '3-16', name: 'The Old God’s Threshold', kind: 'road', level: 47, party: 6, tier: 'rich', foes: ['briarwolf', 'briarwolf', 'thornwitch', 'hanged', 'marshlantern', null], first: [],
    teaches: 'The last of the wood before its god.', hint: 'If the threshold is hard, the Antlered One is harder. Farm here first.' },
  { id: '3-17', name: 'The Heart of the Wood', kind: 'boss', boss: true, level: 50, party: 6, tier: 'boss', foes: ['antlered', 'briarwolf', null, 'thornwitch', null, null], first: ['relic:barkofoldgod', 'region:3', 'hexingstone', 'belltower', 'alchemist'],
    teaches: 'A boss: the Antlered One heals every turn, gores and stuns your hardest hitter, and calls the Wild Hunt below 60% health.', hint: 'It heals every turn: Festering halves that. When it Marks your hardest hitter, Guard them.' },

  // ── Region IV: the Ashen Keep, levels 51–75. Undead knights, beasts of coal and fire-priests.
  { id: '4-1', name: 'The Cinder Gate', kind: 'road', level: 51, party: 6, tier: 'standard', foes: ['ashknight', 'ashknight', null, 'ashknight', null, null], first: [],
    teaches: 'Heavy armour: the Ash Knights shrug off light blows, and raise a Shield Wall when hurt.', hint: 'Armour blunts small hits. Corroded cuts Defense, and big single hits beat many small ones.' },
  { id: '4-2', name: 'The Ember Kennels', kind: 'road', level: 52, party: 6, tier: 'standard', threat: true, foes: ['cinderhound', 'cinderhound', null, 'cinderhound', 'ashknight', null], first: [],
    teaches: 'Burning everywhere: the Cinder Hounds set your front row alight.', hint: 'Blight resistance stops Burning landing, and a Bitter Tincture puts it out.' },
  { id: '4-3', name: 'The Squires’ Yard', kind: 'road', level: 53, party: 6, tier: 'standard', threat: true, foes: ['ashknight', 'ashknight', 'squire', null, null, 'squire'], first: [],
    teaches: 'Covers: each Flayed Squire takes every hit aimed at its knight.', hint: 'While a squire stands, it takes its knight’s blows. Kill the squire first.' },
  { id: '4-4', name: 'The Arrow Slits', kind: 'road', level: 54, party: 6, tier: 'standard', threat: true, foes: ['ashknight', 'cinderhound', 'arbalist', null, 'squire', 'arbalist'], first: [],
    teaches: 'Siege shots: the Arbalists wind up a huge bolt at your back row.', hint: 'A Marked back-row hero takes a siege shot next turn. Guard or Cover them.' },
  { id: '4-5', name: 'The Burnt Barracks', kind: 'road', level: 56, party: 6, tier: 'standard', foes: ['ashknight', 'ashknight', 'squire', 'arbalist', 'cinderhound', null], first: [],
    teaches: 'The keep’s garrison: armour, covers and bolts together.', hint: 'Squire first, then the Arbalist, then the knights.' },
  { id: '4-6', name: 'The Kennel Yard', kind: 'road', level: 57, party: 6, tier: 'standard', foes: ['cinderhound', 'cinderhound', 'cinderhound', 'squire', 'cinderhound', null], first: [],
    teaches: 'A yard of hounds: fire on your front row, again and again.', hint: 'The hounds are fast and fragile. Hit the whole row, and keep the fire cleansed.' },
  { id: '4-7', name: 'The Forge Stair', kind: 'road', level: 58, party: 6, tier: 'rich', foes: ['ashknight', 'ashknight', 'squire', 'arbalist', 'arbalist', 'squire'], first: [],
    teaches: 'The stair to the forge, held by the garrison.', hint: 'The Kiln Warden is at the top. Farm here first.' },
  { id: '4-8', name: 'The Kiln', kind: 'elite', elite: true, level: 60, party: 6, tier: 'elite', foes: ['kilnwarden', 'ashknight', 'squire', null, null, 'arbalist'], first: ['cond:allies_lt'],
    teaches: 'An elite: the Kiln Warden stokes a blast that burns every hero. It lands the turn after.', hint: 'When the Kiln stokes, every hero is Marked. Ward the party before the blast lands.' },
  { id: '4-9', name: 'The Smoking Hall', kind: 'road', level: 60, party: 6, tier: 'standard', foes: ['ashknight', 'cinderhound', 'squire', null, 'arbalist', null], first: [],
    teaches: '“Fewer than N allies standing”: a last stand when the party is thinning.', hint: 'Cover, siege shots and fire, in a smaller hall.' },
  { id: '4-10', name: 'The Chapel of Cinders', kind: 'road', level: 61, party: 6, tier: 'standard', foes: ['ashknight', 'ashknight', 'squire', 'cinderhound', 'squire', null], first: [],
    teaches: 'Two squires for two knights.', hint: 'Kill both squires before the knights, or hit everything at once.' },
  { id: '4-11', name: 'The Gatehouse', kind: 'road', level: 63, party: 6, tier: 'standard', foes: ['ashknight', 'ashknight', 'arbalist', 'squire', 'arbalist', null], first: [],
    teaches: 'Two Arbalists on the gatehouse walls.', hint: 'Two siege shots can land together. Guard one Marked hero, Cover the other.' },
  { id: '4-12', name: 'The Burning Walk', kind: 'road', level: 64, party: 6, tier: 'standard', foes: ['cinderhound', 'ashknight', 'cinderhound', 'arbalist', 'squire', null], first: [],
    teaches: 'Fire on the wall-walk: hounds in front and behind.', hint: 'Hounds wait behind the front row and step up. Keep the fire off your front row.' },
  { id: '4-13', name: 'The Armoury', kind: 'road', level: 66, party: 6, tier: 'standard', foes: ['ashknight', 'ashknight', 'squire', 'ashknight', 'squire', null], first: [],
    teaches: 'The armoury: four knights and their squires.', hint: 'So much armour: Corroded and heavy single hits.' },
  { id: '4-14', name: 'The Pyre Steps', kind: 'road', level: 67, party: 6, tier: 'rich', foes: ['ashknight', 'cinderhound', 'squire', 'arbalist', 'arbalist', 'squire'], first: [],
    teaches: 'The steps up to the pyre.', hint: 'The Pyre Priest is next. Farm here first.' },
  { id: '4-15', name: 'The Pyre', kind: 'elite', elite: true, level: 69, party: 6, tier: 'elite', foes: ['ashknight', 'ashknight', 'squire', 'pyrepriest', null, 'squire'], first: [],
    teaches: 'An elite: the Pyre Priest heals and kindles its knights from behind their armour.', hint: 'The Priest is a healer in the back row: “Foe: healer” finds it, and ranged and magic reach it.' },
  { id: '4-16', name: 'The Marshal’s Gallery', kind: 'road', level: 69, party: 6, tier: 'standard', foes: ['ashknight', 'cinderhound', 'arbalist', 'squire', 'cinderhound', 'arbalist'], first: [],
    teaches: 'Portraits of the Marshal, every one burnt.', hint: 'Squire, Arbalists, hounds: in that order.' },
  { id: '4-17', name: 'The War Room', kind: 'road', level: 72, party: 6, tier: 'rich', foes: ['ashknight', 'ashknight', 'squire', 'arbalist', 'squire', 'arbalist'], first: [],
    teaches: 'The Marshal’s war room, still holding its last council.', hint: 'If the war room is hard, the Marshal is harder. Farm here first.' },
  { id: '4-18', name: 'The Burning Keep', kind: 'boss', boss: true, level: 75, party: 6, tier: 'boss', foes: ['marshal', 'ashknight', null, 'squire', 'arbalist', null], first: ['relic:marshalsblade', 'region:4'],
    teaches: 'A boss: the Burnt Marshal’s blows splash, his Rally kindles the keep, and below half health the keep burns.', hint: 'Below half health every hero burns each turn: save your burst for then, and finish him fast.' },

  // ── Region V: the Hollow Throne, levels 76–100. Spirits and undead, and nothing new to learn.
  { id: '5-1', name: 'The Tallow Road', kind: 'road', level: 76, party: 6, tier: 'standard', foes: ['shade', 'shade', null, 'bellwraith', 'bellwraith', null], first: [],
    teaches: 'Buffs stolen: the Crowned Shades take what a kindled hero has.', hint: 'Shades steal one helpful status. Re-apply it with rules: “Ally: not Kindled → Kindle”.' },
  { id: '5-2', name: 'The Hall of Bows', kind: 'road', level: 77, party: 6, tier: 'standard', threat: true, foes: ['shade', 'shade', 'courtier', null, null, 'courtier'], first: [],
    teaches: 'Confusion: the Courtier’s Flattery may turn your hardest hitter on its own side.', hint: 'A Confused hero may strike their own side. The Bellringer’s Wake clears it, or kill the Courtiers first.' },
  { id: '5-3', name: 'The Heralds’ Gallery', kind: 'road', level: 78, party: 6, tier: 'standard', threat: true, foes: ['shade', 'shade', 'herald', 'courtier', null, 'herald'], first: [],
    teaches: 'A death announced: the Bone Herald Dooms your hardest hitter three turns ahead.', hint: 'Herald’s Doom ticks hard. Cleanse it, or out-heal it.' },
  { id: '5-4', name: 'The Candle Gallery', kind: 'road', level: 80, party: 6, tier: 'standard', threat: true, foes: ['shade', 'shade', 'wickwraith', 'herald', null, 'wickwraith'], first: [],
    teaches: 'Snuffed: the Wick Wraiths strip Kindled, Hasted, Warded and Blessed from the whole party.', hint: 'Rules that re-apply buffs answer the wraiths: “Ally: not Kindled → Kindle”.' },
  { id: '5-5', name: 'The Mirror Hall', kind: 'road', level: 81, party: 6, tier: 'standard', foes: ['shade', 'ashknight', 'courtier', 'wickwraith', 'herald', null], first: [],
    teaches: 'The court together: a thief, a flatterer, a snuffer and a herald.', hint: 'Spirits dodge and resist bleeding. Curses and sure hits work.' },
  { id: '5-6', name: 'The Waxworks', kind: 'road', level: 82, party: 6, tier: 'standard', foes: ['shade', 'shade', 'wickwraith', 'wickwraith', 'courtier', null], first: [],
    teaches: 'Two Wick Wraiths: your buffs won’t last.', hint: 'Two wraiths snuff twice as often. Kill them before buffing again.' },
  { id: '5-7', name: 'The Guard Room', kind: 'road', level: 84, party: 6, tier: 'rich', foes: ['shade', 'shade', 'herald', 'courtier', 'wickwraith', 'herald'], first: [],
    teaches: 'The guard room before the Kingsguard.', hint: 'The Kingsguard is next. Farm here first.' },
  { id: '5-8', name: 'The Kingsguard', kind: 'elite', elite: true, level: 85, party: 6, tier: 'elite', foes: ['kingsguard', 'shade', 'herald', null, null, 'wickwraith'], first: [],
    teaches: 'An elite: the Kingsguard Revenant covers its most hurt ally, and won’t fall the first time.', hint: 'While it covers an ally, it takes that ally’s hits, area hits included. Below a quarter it stands one more turn.' },
  { id: '5-9', name: 'The Hall of Petitions', kind: 'road', level: 85, party: 6, tier: 'standard', foes: ['shade', 'shade', 'courtier', 'herald', 'courtier', null], first: [],
    teaches: 'Two Courtiers: two confusions.', hint: 'Two Courtiers can turn two heroes. Kill them first.' },
  { id: '5-10', name: 'The Long Gallery', kind: 'road', level: 87, party: 6, tier: 'standard', foes: ['shade', 'ashknight', 'wickwraith', 'courtier', 'herald', null], first: [],
    teaches: 'A knight of the Ashen Keep, come to court.', hint: 'Armour in front, the court behind. Ranged and magic reach the court.' },
  { id: '5-11', name: 'The Tallow Chapel', kind: 'road', level: 88, party: 6, tier: 'standard', foes: ['shade', 'shade', 'acolyte', 'wickwraith', null, 'herald'], first: [],
    teaches: 'Drowned Acolytes, still singing for a new king.', hint: 'Healers again: “Foe: healer” finds them.' },
  { id: '5-12', name: 'The Bone Cloisters', kind: 'road', level: 90, party: 6, tier: 'standard', foes: ['shade', 'shade', 'herald', 'herald', 'wickwraith', null], first: [],
    teaches: 'Two Heralds: two deaths announced.', hint: 'Two Dooms on your hardest hitters. Cleanse one, heal through the other.' },
  { id: '5-13', name: 'The Ashen Guard', kind: 'road', level: 91, party: 6, tier: 'standard', foes: ['ashknight', 'shade', 'squire', 'courtier', 'herald', null], first: [],
    teaches: 'Knights and squires from the keep, guarding the court.', hint: 'Kill the squire, and the knight is only armour.' },
  { id: '5-14', name: 'The Chamberlain’s Door', kind: 'road', level: 93, party: 6, tier: 'rich', foes: ['shade', 'shade', 'courtier', 'herald', 'wickwraith', 'courtier'], first: [],
    teaches: 'The door to the Lord Chamberlain’s court.', hint: 'The Chamberlain is next. Farm here first.' },
  { id: '5-15', name: 'The Lord Chamberlain', kind: 'elite', elite: true, level: 95, party: 6, tier: 'elite', foes: ['shade', 'shade', 'courtier', 'chamberlain', null, 'herald'], first: [],
    teaches: 'An elite: the Lord Chamberlain swaps your heroes between rows, and summons the court.', hint: 'Move resistance resists his Reorder, and “Self: in the front row → Move” walks a hero back.' },
  { id: '5-16', name: 'The Throne Stair', kind: 'road', level: 95, party: 6, tier: 'standard', foes: ['shade', 'shade', 'wickwraith', 'herald', 'courtier', null], first: [],
    teaches: 'The stair to the throne, lit by tallow.', hint: 'Everything the court does, together.' },
  { id: '5-17', name: 'The Last Antechamber', kind: 'road', level: 97, party: 6, tier: 'rich', foes: ['shade', 'shade', 'herald', 'courtier', 'wickwraith', null], first: [],
    teaches: 'The last room before the throne.', hint: 'If the antechamber is hard, the King is harder. Farm here first.' },
  { id: '5-18', name: 'The Hollow Throne', kind: 'boss', boss: true, level: 100, party: 6, tier: 'boss', foes: ['hollowking', null, null, 'wickwraith', 'herald', null], first: ['relic:hollowcrown', 'roadlit'],
    teaches: 'The last boss: the Hollow King calls his court, snuffs your lanterns below two thirds, and Dooms you all below a third.', hint: 'Cleanse, Ward and re-buff with rules. Below a third every hero is Doomed: finish him.' },
];
// Each stage's region (0–4, from its id), its place on the whole road, and its number.
STAGES.forEach((s, i) => { s.region = Number(s.id.split('-')[0]) - 1; s.index = i; s.n = i + 1; });
// Wandering foes on replays (campaign spec §3.4, tune): the chance per replay of each filling an empty foe slot.
const WANDERERS = [{ key: 'moths', chance: 0.05 }, { key: 'mimic', chance: 0.02 }];

// ── Rewards (home-base spec §5, tune)
// Amounts scale with the stage's level through S = 1 + L ÷ 5. XP is a share of a level at the stage's level: what a
// hero needs to go from L to L + 1, so a hero below the stage's level gains more than that share of their own level.
const GOLD_SCALE = L => 1 + L / 5;
// Battle spoils, from every foe defeated (not summoned, not fled): gold × S, XP for each hero, and the loot chance.
const SPOILS = {
  normal: { gold: 8, xp: 0.06, loot: 0.1, rolls: 1 },
  elite: { gold: 24, xp: 0.18, loot: 0.4, rolls: 1 },
  boss: { gold: 80, xp: 0.6, loot: 1, rolls: 2 },
};
// The clear reward, by tier. other: another reached region's material, as [chance, amount]. items: party items, as
// [chance, amount]. gear: the chance of a gear roll. First clears double the gold and materials, and a Light or
// Standard stage's gear roll is certain.
const CLEAR = {
  light: { name: 'Light', gold: 12, xp: 0.09, mat: 2, other: [0.1, 1], items: [0.1, 1], gear: 0.05 },
  standard: { name: 'Standard', gold: 20, xp: 0.15, mat: 3, other: [0.25, 1], items: [0.15, 1], gear: 0.1 },
  rich: { name: 'Rich', gold: 40, xp: 0.22, mat: 5, other: [1, 1], items: [1, 1], gear: 1 },
  elite: { name: 'Elite', gold: 60, xp: 0.38, mat: 8, other: [1, 1], items: [1, 1], gear: 1 },
  boss: { name: 'Boss', gold: 200, xp: 0.9, mat: 20, other: [1, 3], items: [1, 2], gear: 1 },
};
// A loot roll is a party item 60% of the time, by these odds, and a gear roll otherwise.
const LOOT_ITEM = 0.6;
const LOOT_ITEMS = [['draught', 50], ['lampoil', 25], ['tincture', 15], ['salts', 10]];
// Fatigue (home-base spec §6): +1 for each turn a hero takes, nothing else. Weary 50, Exhausted 75, Spent 100.
const FATIGUE = { PER_TURN: 1, WEARY: 50, EXHAUSTED: 75, SPENT: 100, FIT: 50 };
