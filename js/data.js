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
  dirge: { name: 'Dirge', icon: 'kindle', shape: 'allies', cost: 25, st: [{ k: 'kindled', t: 2, v: 30 }], fx: 'dirge', tip: 'Every foe is Kindled for 2 turns: +30% damage.' },
  shallowgrave: { name: 'Shallow Grave', icon: 'charge', shape: 'foe', reach: true, cost: 20, charge: 'shallowburial', fx: 'charge', tip: 'Marks a hero and digs. Next turn: Shallow Burial.' },
  shallowburial: { name: 'Shallow Burial', icon: 'skull', shape: 'foe', range: 'melee', reach: true, power: 2.4, fx: 'burial' },
  gnawingtide: { name: 'Gnawing Tide', icon: 'claw', shape: 'front', range: 'melee', power: 0.7, cost: 20, status: { key: 'bleed', turns: 2, power: 0.25 }, fx: 'swarm' },
  // call: foes this calls into empty foe slots, front row first, at the caller's level. They drop no spoils.
  callswarm: { name: 'Call the Swarm', icon: 'claw', shape: 'self', cost: 20, call: { key: 'rats', n: 2 }, fx: 'call', tip: 'Grave Rats rise in up to 2 empty foe slots.' },
  flutter: { name: 'Flutter', icon: 'claw', shape: 'foe', range: 'melee', reach: true, power: 0.7, fx: 'peck' },
  wingdust: { name: 'Wing Dust', icon: 'dazzle', shape: 'foes', range: 'ranged', power: 0.3, cost: 20, status: { key: 'dazzled', turns: 1 }, fx: 'dust' },
  snap: { name: 'Snap', icon: 'claw', shape: 'foe', range: 'melee', power: 1, fx: 'bite' },
  clangshut: { name: 'Clang Shut', icon: 'brace', shape: 'self', cost: 15, st: [{ k: 'braced', t: 2, v: 40 }], fx: 'guard', tip: 'Braced: −40% damage taken for 2 turns.' },
  // Drowned Chapel foes
  brinebolt: { name: 'Brine Bolt', icon: 'wave', shape: 'foe', range: 'magic', power: 1, fx: 'brine' },
  hymn: { name: 'Drowned Hymn', icon: 'cross', shape: 'allies', heal: 1.2, cost: 30, fx: 'hymn', tip: 'Heals every ally a little.' },
  slam: { name: 'Slam', icon: 'mace', shape: 'foe', range: 'melee', power: 1, fx: 'smash' },
  burst: { name: 'Burst', icon: 'burst', shape: 'foes', range: 'magic', power: 1.1, selfDestruct: true, fx: 'burst', tip: 'Bursts, hitting everyone, and is destroyed.' },
  wail: { name: 'Wail', icon: 'bell', shape: 'foe', range: 'magic', power: 1, fx: 'wail' },
  wraithtoll: { name: 'Toll', icon: 'bell', shape: 'foes', range: 'magic', power: 0.5, cost: 25, fx: 'toll' },
  chant: { name: 'Silt Chant', icon: 'wave', shape: 'foe', range: 'magic', power: 0.9, fx: 'brine' },
  requiem: { name: 'Requiem', icon: 'doom', shape: 'foes', range: 'magic', power: 0.45, cost: 30, status: { key: 'doom', turns: 2, power: 0.25 }, fx: 'requiem' },
  crozier: { name: 'Crozier', icon: 'mace', shape: 'foe', range: 'melee', power: 1, fx: 'smash' },
  baptism: { name: 'Baptism', icon: 'charge', shape: 'foe', reach: true, cost: 25, charge: 'drown', fx: 'charge', tip: 'Picks a victim and calls up the font. Next turn: Drown.' },
  drown: { name: 'Drown', icon: 'wave', shape: 'foe', range: 'magic', power: 3.4, fx: 'drown' },
  font: { name: 'Font of Brine', icon: 'wave', shape: 'foes', range: 'magic', power: 0.5, cost: 25, fx: 'font' },
  raise: { name: 'Raise the Drowned', icon: 'holy', shape: 'ally', revive: 0.5, cost: 35, fx: 'raise', tip: 'Raises a fallen ally with half its health.' },

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
  mourner: { name: 'Mourner', role: 'Kindles the other foes. Kill her first.', intro: 'A veiled woman keens over a grave that is not hers.', death: 'Her veil drifts down onto the grass.', hp: 58, mp: 30, pow: 13, def: 3, spd: 10, crit: 5, dodge: 5, mpGain: 12, basic: 'keen', skills: ['dirge'], rules: [{ if: 'ally_without', s: 'kindled', do: 'dirge' }], res: { stun: 20, move: 20, bleed: 25, blight: 25, curse: 40, debuff: 30 } },
  digger: { name: 'Gravedigger', role: 'Marks a hero, then strikes.', intro: 'A man with a spade measures you by eye.', death: 'He drops his spade into the hole he dug.', hp: 80, mp: 30, pow: 18, def: 4, spd: 9, crit: 5, dodge: 5, mpGain: 10, basic: 'shovel', skills: ['shallowgrave'], rules: [{ if: 'foe_lowest', do: 'shallowgrave' }], res: { stun: 25, move: 25, bleed: 25, blight: 25, curse: 25, debuff: 25 } },
  ratking: { name: 'The Rat King', tags: ['beast'], elite: true, role: 'Calls rats into empty slots while he stands.', intro: 'A knot of rats in a tin crown squeals for its subjects.', death: 'The crown rolls away. The knot comes apart.', hp: 230, mp: 40, pow: 29, def: 5, spd: 11, crit: 5, dodge: 10, mpGain: 10, basic: 'bite', skills: ['gnawingtide', 'callswarm'], rules: [{ if: 'allies_lt', n: 4, do: 'callswarm' }, { if: 'front_foe', do: 'gnawingtide' }], res: { stun: 30, move: 40, bleed: 35, blight: 40, curse: 40, debuff: 40 } },
  sexton: { name: 'The Sexton', boss: true, role: 'Digs graves for Marked heroes, and two at half health.', intro: 'The gravedigger of the Gravefields has a hole dug for you.', death: 'He falls into his own last grave.', hp: 415, mp: 40, pow: 37, def: 8, spd: 9, crit: 8, dodge: 0, mpGain: 10, basic: 'shovel', skills: ['dig', 'gravedirt'], rules: [{ if: 'foe_hp_lt', n: 75, do: 'dig' }, { if: 'foes_at_least', n: 4, do: 'gravedirt' }], res: { stun: 60, move: 70, bleed: 55, blight: 55, curse: 50, debuff: 60 },
    phases: [{ below: 0.5, name: 'Two Graves', line: 'He digs two graves now', swap: { dig: 'dig2' } }] },
  // Wandering foes: they join replays only, rolled from the battle's seed (campaign spec §3.4, §4.2)
  moths: { name: 'Moth Swarm', tags: ['beast'], wander: true, role: 'A wandering swarm that dazzles everyone.', intro: 'Pale moths pour out of a cracked lantern.', death: 'The dust settles.', hp: 50, mp: 20, pow: 12, def: 1, spd: 14, crit: 5, dodge: 25, mpGain: 10, basic: 'flutter', skills: ['wingdust'], rules: [{ if: 'foes_at_least', n: 3, do: 'wingdust' }], res: { stun: 10, move: 50, bleed: 10, blight: 20, curse: 20, debuff: 20 } },
  mimic: { name: 'Cage Mimic', wander: true, flee: 6, role: 'A wandering cage. It runs at round 6; killed, it drops better gear.', intro: 'An iron gibbet-cage by the road opens one eye.', death: 'It springs open, and something glints inside.', hp: 90, mp: 20, pow: 18, def: 10, spd: 8, crit: 5, dodge: 0, mpGain: 10, basic: 'snap', skills: ['clangshut'], rules: [{ if: 'self_hp_lt', n: 50, do: 'clangshut' }], res: { stun: 50, move: 60, bleed: 40, blight: 40, curse: 30, debuff: 40 } },
  // Region II: the Drowned Chapel (step 7 builds its stages)
  acolyte: { name: 'Drowned Acolyte', healer: true, tags: ['undead'], intro: 'A sodden acolyte gargles a hymn at you.', death: 'It slumps, pouring water from its sleeves.', hp: 66, mp: 30, pow: 17, def: 4, spd: 10, crit: 5, dodge: 5, mpGain: 10, basic: 'brinebolt', skills: ['hymn'], rules: [{ if: 'ally_hp_lt', n: 60, do: 'hymn' }, { if: 'foe_lowest', do: 'brinebolt' }] },
  bloat: { name: 'Bloated Corpse', tags: ['undead'], intro: 'Something swollen waddles out of the flooded nave.', death: 'It bursts. You will smell it for days.', hp: 150, mp: 0, pow: 20, def: 5, spd: 6, crit: 0, dodge: 0, mpGain: 0, basic: 'slam', skills: ['burst'], rules: [{ if: 'self_hp_lt', n: 35, do: 'burst' }] },
  bellwraith: { name: 'Bell Wraith', tags: ['spirit'], intro: 'A drowned bell tolls, and a pale shape answers.', death: 'The tolling stops.', hp: 60, mp: 30, pow: 20, def: 3, spd: 11, crit: 5, dodge: 20, mpGain: 10, basic: 'wail', skills: ['wraithtoll'], rules: [{ if: 'foes_at_least', n: 3, do: 'wraithtoll' }, { if: 'foe_hp_lt', n: 50, do: 'wail' }] },
  choir: { name: 'Choir of Silt', healer: true, tags: ['spirit'], elite: true, intro: 'A dozen drowned mouths sing in the dark water.', death: 'The choir falls silent, one voice at a time.', hp: 230, mp: 40, pow: 21, def: 6, spd: 10, crit: 5, dodge: 5, mpGain: 12, basic: 'chant', skills: ['hymn', 'requiem'], rules: [{ if: 'ally_hp_lt', n: 50, do: 'hymn' }, { if: 'foes_at_least', n: 3, do: 'requiem' }] },
  bishop: { name: 'The Drowned Bishop', tags: ['undead'], boss: true, intro: 'The bishop rises from the font, robes streaming.', death: 'He sinks back into the black font.', hp: 380, mp: 50, pow: 31, def: 8, spd: 9, crit: 8, dodge: 0, mpGain: 12, basic: 'crozier', skills: ['raise', 'baptism', 'font'], rules: [{ if: 'ally_fallen', do: 'raise' }, { if: 'foe_hp_lt', n: 75, do: 'baptism' }, { if: 'foes_at_least', n: 4, do: 'font' }] },
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
const FOE_GROW = {
  hp: L => (L <= 10 ? 1 + 0.064 * (L - 1) + 0.024 * (L - 1) * (L - 1) : 3.52 * (1 + 0.065 * (L - 10))),
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
// Five regions along the road (campaign spec §2). Region I is built; II–V show on the map, locked until step 7.
// mat: the material it drops most (MATERIALS in js/save.js). opens: what lights the road into it.
const REGIONS = [
  { num: 'I', name: 'Gravefields', levels: [1, 10], mat: 'bone_dust', boss: 'The Sexton', relic: 'gravediggersspade', stages: 18, line: 'Barrow-fields under a low moon. The dead do not stay put.' },
  { num: 'II', name: 'Drowned Chapel', levels: [11, 30], mat: 'chapel_wax', boss: 'The Drowned Bishop', relic: 'bishopscrozier', stages: 17, opens: 'Beat the Sexton to enter', line: 'A flooded chapel where the drowned still hold their services.' },
  { num: 'III', name: 'Thornwood', levels: [31, 50], mat: 'heartwood', boss: 'The Antlered One', relic: 'barkofoldgod', stages: 17, opens: 'Beat the Drowned Bishop to enter', line: 'An old wood where the road narrows and wolves run in packs.' },
  { num: 'IV', name: 'Ashen Keep', levels: [51, 75], mat: 'cinder_iron', boss: 'The Burnt Marshal', relic: 'marshalsblade', stages: 18, opens: 'Beat the Antlered One to enter', line: 'A keep its own marshal burned. It is burning still.' },
  { num: 'V', name: 'Hollow Throne', levels: [76, 100], mat: 'throne_tallow', boss: 'The Hollow King', relic: 'hollowcrown', stages: 18, opens: 'Beat the Burnt Marshal to enter', line: 'A court of the dead under a throne of tallow and bone.' },
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
  tactician: { kind: 'feature', name: 'Tactician I', icon: 'book', line: 'Thresholds, Focus fire, saved rule sets and a dozen conditions. The building itself comes with the home base.' },
  'cond:foe_charging': { kind: 'condition', name: 'Foe: charging a big attack', icon: 'scroll', cond: ['foe_charging'] },
  scavengercamp: { kind: 'building', name: 'Scavenger Camp blueprint', icon: 'bag', line: 'Gear and materials while you are away.', step: 5 },
  'cond:bb_next_boss': { kind: 'condition', name: 'Between battles: next stage has a boss or elite', icon: 'scroll', cond: ['bb_next_boss'] },
  barracks: { kind: 'building', name: 'Barracks blueprint', icon: 'shield', line: 'Room for more heroes.', step: 5 },
  salvagepit: { kind: 'building', name: 'Salvage Pit blueprint', icon: 'bone', line: 'Gear rolls while you are away.', step: 5 },
  'cond:boss_present': { kind: 'condition', name: 'Boss present', icon: 'scroll', cond: ['boss_present'] },
  'relic:gravediggersspade': { kind: 'relic', name: 'Relic: the Gravedigger’s Spade', icon: 'star', relic: 'gravediggersspade' },
  gravecaller: { kind: 'class', name: 'The Gravecaller joins the recruit board', icon: 'bone', step: 5 },
  'region:1': { kind: 'region', name: 'The Drowned Chapel opens', icon: 'lantern', line: 'Its stages come in the next build.', step: 7 },
  'cond:ally_fallen': { kind: 'condition', name: 'Ally: fallen', icon: 'scroll', cond: ['ally_fallen'] },
};
for (const id in UNLOCKS) UNLOCKS[id].id = id;
// The conditions Tactician I teaches (content spec §5), besides every threshold.
const TACTICIAN_I = ['self_mp_lt', 'self_front', 'self_back', 'self_has', 'self_without', 'self_thralls_lt', 'ally_has', 'ally_without', 'foe_hp_lt', 'leader_target', 'foe_without', 'one_foe', 'bb_fell', 'bb_out'];

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
  { id: '1-18', name: 'The Sexton’s Grave', kind: 'boss', boss: true, level: 10, party: 6, tier: 'boss', foes: ['sexton', 'digger', null, 'mourner', 'bones', null], first: ['cond:boss_present', 'relic:gravediggersspade', 'gravecaller', 'region:1'],
    teaches: 'A boss: the Sexton digs graves, throws grave dirt, and digs two graves below half health.', hint: 'When the Sexton digs, Guard the Marked hero. Below half health he digs two graves.' },
];
STAGES.forEach((s, i) => { s.region = 0; s.index = i; s.n = i + 1; });
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
