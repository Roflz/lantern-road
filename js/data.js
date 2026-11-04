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
// Party rule slots: the starting number and the most the Tactician can add (tune). rules: the starting set.
const PARTY_RULES = { slots: [2, 5], rules: [{ if: 'ally_hp_lt', n: 30, do: 'draught' }, { if: 'foe_lowest', do: 'focus', on: false }] };

const ruleCond = r => (CONDITIONS[r.if] ? CONDITIONS[r.if].label(r) : r.if);
const ruleAction = r => (PARTY_ACTIONS[r.do] ? PARTY_ACTIONS[r.do].name : SKILLS[r.do] ? SKILLS[r.do].name : r.do);
const ruleText = r => `${ruleCond(r)} → ${ruleAction(r)}`;

// ── Foes
// tags: the kinds of foe it counts as, for rule conditions (TAGS). healer: counts for "Foe: healer".
// elite and boss foes are marked on the turn flags, bosses drawn larger. death is the report's closing line when that foe
// falls last. res: resistances, when they differ from FOE_RES. xp: what felling it is worth at level 1.
const FOES = {
  ghoul: { name: 'Ghoul', tags: ['undead'], death: 'It folds back into the dirt it came from.', hp: 72, mp: 20, pow: 20, def: 3, spd: 9, crit: 5, dodge: 5, mpGain: 10, basic: 'claw', skills: ['gnaw'], rules: [{ if: 'foe_lowest', do: 'gnaw' }] },
  rats: { name: 'Grave Rats', tags: ['beast'], death: 'The survivors scatter into the barrows.', hp: 56, mp: 20, pow: 14, def: 2, spd: 13, crit: 5, dodge: 15, mpGain: 10, basic: 'bite', skills: ['skitter'], rules: [{ if: 'front_foe', do: 'skitter' }] },
  bones: { name: 'Restless Bones', tags: ['undead'], death: 'It comes apart and stays apart.', hp: 62, mp: 20, pow: 17, def: 6, spd: 8, crit: 5, dodge: 0, mpGain: 10, basic: 'bonetoss', skills: ['reassemble'], rules: [{ if: 'self_hp_lt', n: 50, do: 'reassemble' }, { if: 'foe_lowest', do: 'bonetoss' }] },
  gravewarden: { name: 'The Gravewarden', tags: ['undead'], death: 'Its armour falls empty to the ground.', elite: true, hp: 210, mp: 40, pow: 22, def: 12, spd: 8, crit: 5, dodge: 0, mpGain: 10, basic: 'halberd', skills: ['watch', 'reaphook'], rules: [{ if: 'ally_hp_lt', n: 50, do: 'watch' }, { if: 'foe_lowest', do: 'reaphook' }] },
  sexton: { name: 'The Sexton', death: 'He falls into his own last grave.', boss: true, hp: 360, mp: 40, pow: 30, def: 8, spd: 9, crit: 8, dodge: 0, mpGain: 10, basic: 'shovel', skills: ['dig', 'gravedirt'], rules: [{ if: 'foe_hp_lt', n: 75, do: 'dig' }, { if: 'foes_at_least', n: 4, do: 'gravedirt' }] },
  acolyte: { name: 'Drowned Acolyte', healer: true, tags: ['undead'], death: 'It slumps, pouring water from its sleeves.', hp: 66, mp: 30, pow: 17, def: 4, spd: 10, crit: 5, dodge: 5, mpGain: 10, basic: 'brinebolt', skills: ['hymn'], rules: [{ if: 'ally_hp_lt', n: 60, do: 'hymn' }, { if: 'foe_lowest', do: 'brinebolt' }] },
  bloat: { name: 'Bloated Corpse', tags: ['undead'], death: 'It bursts. You will smell it for days.', hp: 150, mp: 0, pow: 20, def: 5, spd: 6, crit: 0, dodge: 0, mpGain: 0, basic: 'slam', skills: ['burst'], rules: [{ if: 'self_hp_lt', n: 35, do: 'burst' }] },
  bellwraith: { name: 'Bell Wraith', tags: ['spirit'], death: 'The tolling stops.', hp: 60, mp: 30, pow: 20, def: 3, spd: 11, crit: 5, dodge: 20, mpGain: 10, basic: 'wail', skills: ['wraithtoll'], rules: [{ if: 'foes_at_least', n: 3, do: 'wraithtoll' }, { if: 'foe_hp_lt', n: 50, do: 'wail' }] },
  choir: { name: 'Choir of Silt', healer: true, tags: ['spirit'], death: 'The choir falls silent, one voice at a time.', elite: true, hp: 230, mp: 40, pow: 21, def: 6, spd: 10, crit: 5, dodge: 5, mpGain: 12, basic: 'chant', skills: ['hymn', 'requiem'], rules: [{ if: 'ally_hp_lt', n: 50, do: 'hymn' }, { if: 'foes_at_least', n: 3, do: 'requiem' }] },
  bishop: { name: 'The Drowned Bishop', tags: ['undead'], death: 'He sinks back into the black font.', boss: true, hp: 380, mp: 50, pow: 31, def: 8, spd: 9, crit: 8, dodge: 0, mpGain: 12, basic: 'crozier', skills: ['raise', 'baptism', 'font'], rules: [{ if: 'ally_fallen', do: 'raise' }, { if: 'foe_hp_lt', n: 75, do: 'baptism' }, { if: 'foes_at_least', n: 4, do: 'font' }] },
};
// Foe resistances, before family shifts (content spec §3): normal foes 10–40%, elites 30–60%, bosses 50–90% (tune).
// A family shift can take one to 100% or more, which makes that foe immune.
const FOE_RES = { normal: 20, elite: 40, boss: 65 };
const FAMILY_RES = { undead: { bleed: 40, blight: 20 }, spirit: { bleed: 60, move: 40, curse: -20 }, beast: { bleed: -10, stun: -10 } };
function foeRes(F) {
  const base = F.boss ? FOE_RES.boss : F.elite ? FOE_RES.elite : FOE_RES.normal, r = {};
  for (const k of RES_KEYS) r[k] = base;
  for (const t of F.tags || []) for (const k in FAMILY_RES[t] || {}) r[k] += FAMILY_RES[t][k];
  return Object.assign(r, F.res || {});
}
// What felling a foe is worth, at level 1 (tune).
const FOE_XP = { normal: 10, elite: 30, boss: 60 };

// ── Regions and stages
// foes lists the foe in each slot (null for an empty slot), in the same slot order as the party.
// level: the stage's level. Its foes grow with it (FOE_GROWTH), and it sets their XP and their side of the Defense
// formula (tune; the campaign map in step 6 sets the real ones).
const REGION_NAMES = [{ name: 'Gravefields', num: 'I' }, { name: 'Drowned Chapel', num: 'II' }];
const STAGES = [
  { id: '1-1', region: 0, level: 1, name: 'The Barrow Gate', foes: ['ghoul', 'ghoul', null, 'bones', 'bones', null] },
  { id: '1-2', region: 0, level: 3, name: 'Rat-Choked Crypt', foes: ['rats', 'rats', 'bones', 'bones', null, 'bones'] },
  { id: '1-3', region: 0, level: 5, name: "The Sexton's Grave", boss: true, foes: ['sexton', 'gravewarden', 'bones', null, null, 'bones'] },
  { id: '2-1', region: 1, level: 8, name: 'The Flooded Nave', foes: ['bloat', 'bloat', 'acolyte', 'bellwraith', null, 'acolyte'] },
  { id: '2-2', region: 1, level: 10, name: 'The Choir Loft', foes: ['bloat', 'ghoul', 'bellwraith', 'choir', null, 'bellwraith'] },
  { id: '2-3', region: 1, level: 12, name: 'The Black Font', boss: true, foes: ['bishop', 'bloat', 'acolyte', null, 'bellwraith', 'acolyte'] },
];
// How foes grow with their stage's level, per level above 1, as a share of their level-1 stats (tune). Heroes grow about
// as fast from their class growth alone, so stat points, skills and gear are what put a party ahead.
const FOE_GROWTH = { hp: 0.065, pow: 0.06, def: 0.04 };
