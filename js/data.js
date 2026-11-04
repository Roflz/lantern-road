'use strict';
// Lantern Road · game data: formation, statuses, skills, rule conditions, classes, foes and stages.
// docs/design.md is the source of truth. Numbers here are starting values to tune in play-testing.

// ── Formation
// Each side has six slots. Slots 0–1 are the front row and 2–5 the back row.
// LANE is each slot's left-to-right position on screen. A character who picks "the nearest foe" prefers
// the one in the closest lane.
const ROWS = ['front', 'front', 'back', 'back', 'back', 'back'];
const LANE = [-1, 1, -3, -1, 1, 3];

// ── Statuses
// What each one does lives in the simulation (js/sim.js); this is how it is named and explained.
const STATUSES = {
  doom: { name: 'Doom', adj: 'Doomed', icon: 'doom', bad: true, tip: 'Takes damage at the start of each of its turns.' },
  bleed: { name: 'Bleed', icon: 'bleed', bad: true, tip: 'Loses health at the start of each of its turns.' },
  dazzled: { name: 'Dazzled', icon: 'dazzle', bad: true, tip: 'Blinded by light: its attacks miss 40% of the time.' },
  kindled: { name: 'Kindled', icon: 'kindle', tip: 'Lit by the Lamplighter: deals 30% more damage.' },
  guarding: { name: 'Guarding', icon: 'shield', tip: 'Takes every single-target attack aimed at an ally, at 30% less damage, until its next turn.' },
  charging: { name: 'Charging', icon: 'charge', bad: true, tip: 'Gathering a big attack. It lands on its next turn.' },
  marked: { name: 'Marked', icon: 'mark', bad: true, tip: 'A charging foe has picked this one for its big attack.' },
};

// ── Skills
// shape: who a skill reaches.
//   foe     one foe            front    the front row (the back row if the front is empty)
//   back    the back row (the front row if the back is empty)
//   random3 3 random foes      foes     all foes
//   ally    one ally           allies   all allies         self   the user
// range: melee attacks must hit the front row while anyone stands there; ranged and magic reach anyone.
//   reach: true lets a melee skill ignore that.
// power: damage as a multiple of the user's Power. heal / healPct: healing from Power / the target's max health.
// status: applied to each target hit. selfStatus: applied to the user. stagger: pushes the target back on the
// timeline by that share of its turn. charge: spend this turn gathering; the named skill lands next turn.
// icon marks the skill on the turn flags; fx and sfx pick its animation and sound on the battle screen.
const SKILLS = {
  // Warden
  mace: { name: 'Mace', icon: 'mace', shape: 'foe', range: 'melee', power: 0.9, fx: 'smash' },
  guard: { name: 'Guard', icon: 'shield', shape: 'self', cost: 15, selfStatus: { key: 'guarding', turns: 1 }, fx: 'guard', tip: 'Until its next turn, takes every single-target attack aimed at an ally, at 30% less damage.' },
  bash: { name: 'Shield Bash', icon: 'shield', shape: 'foe', range: 'melee', power: 1, cost: 15, stagger: 0.6, fx: 'bash', tip: 'Knocks the foe back on the timeline.' },
  // Sellsword
  strike: { name: 'Strike', icon: 'sword', shape: 'foe', range: 'melee', power: 1, fx: 'slash' },
  cleave: { name: 'Cleave', icon: 'cleave', shape: 'front', range: 'melee', power: 0.8, cost: 15, fx: 'cleave', tip: 'Hits the whole front row.' },
  lunge: { name: 'Lunge', icon: 'sword', shape: 'foe', range: 'melee', reach: true, power: 1.4, cost: 20, fx: 'lunge', tip: 'Leaps past the front line to strike any foe, even in the back row.' },
  // Crossbowman
  bolt: { name: 'Bolt', icon: 'arrow', shape: 'foe', range: 'ranged', power: 1, fx: 'bolt' },
  aimed: { name: 'Aimed Shot', icon: 'mark', shape: 'foe', range: 'ranged', power: 1.8, crit: 25, cost: 18, fx: 'aimed', tip: 'A heavy bolt with a high chance to crit.' },
  volley: { name: 'Volley', icon: 'arrow', shape: 'back', range: 'ranged', power: 0.75, cost: 22, fx: 'volley', tip: 'Rains bolts on the back row.' },
  // Pilgrim
  smite: { name: 'Smite', icon: 'holy', shape: 'foe', range: 'magic', power: 0.8, fx: 'smite' },
  mend: { name: 'Mend', icon: 'cross', shape: 'ally', heal: 2.8, healPct: 0.1, cost: 15, fx: 'mend', tip: 'Heals one ally.' },
  rites: { name: 'Last Rites', icon: 'holy', shape: 'ally', revive: 0.35, cost: 35, fx: 'rites', tip: 'Raises a fallen ally with 35% health.' },
  // Lamplighter
  flare: { name: 'Flare', icon: 'orb', shape: 'foe', range: 'magic', power: 0.8, fx: 'flare' },
  kindle: { name: 'Kindle', icon: 'kindle', shape: 'allies', cost: 20, status: { key: 'kindled', turns: 2 }, fx: 'kindle', tip: 'Every ally deals 30% more damage for 2 turns.' },
  dazzle: { name: 'Dazzle', icon: 'dazzle', shape: 'foes', range: 'magic', power: 0.25, cost: 25, status: { key: 'dazzled', turns: 2 }, fx: 'dazzle', tip: 'A blinding flash: every foe hit misses 40% of its attacks for 2 turns.' },
  // Hexblade
  hexbolt: { name: 'Hex Bolt', icon: 'curse', shape: 'foe', range: 'magic', power: 0.9, fx: 'hexbolt' },
  doom: { name: 'Doom', icon: 'doom', shape: 'foe', range: 'magic', power: 0.4, cost: 15, status: { key: 'doom', turns: 3, power: 0.65 }, fx: 'doom', tip: 'Curses one foe: it takes damage at the start of each of its next 3 turns.' },
  hexswarm: { name: 'Hex Swarm', icon: 'doom', shape: 'random3', range: 'magic', power: 0.6, cost: 20, status: { key: 'doom', turns: 2, power: 0.3 }, fx: 'hexswarm', tip: 'Curses 3 random foes.' },

  // Gravefields foes
  claw: { name: 'Claw', icon: 'claw', shape: 'foe', range: 'melee', power: 1, fx: 'claw' },
  gnaw: { name: 'Gnaw', icon: 'claw', shape: 'foe', range: 'melee', power: 1.25, cost: 15, status: { key: 'bleed', turns: 3, power: 0.3 }, fx: 'bite' },
  bite: { name: 'Bite', icon: 'claw', shape: 'foe', range: 'melee', power: 1, fx: 'bite' },
  skitter: { name: 'Skittering Swarm', icon: 'claw', shape: 'front', range: 'melee', power: 0.6, cost: 15, status: { key: 'bleed', turns: 2, power: 0.25 }, fx: 'swarm' },
  bonetoss: { name: 'Bone Toss', icon: 'bone', shape: 'foe', range: 'ranged', power: 1, fx: 'bone' },
  reassemble: { name: 'Reassemble', icon: 'bone', shape: 'self', healPct: 0.35, cost: 20, fx: 'reassemble' },
  halberd: { name: 'Halberd', icon: 'mace', shape: 'foe', range: 'melee', power: 1, fx: 'smash' },
  reap: { name: 'Reaping Hook', icon: 'claw', shape: 'foe', range: 'melee', reach: true, power: 1.2, cost: 20, fx: 'reap', tip: 'Hooks a foe anywhere, even in the back row.' },
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
  toll: { name: 'Toll', icon: 'bell', shape: 'foes', range: 'magic', power: 0.5, cost: 25, fx: 'toll' },
  chant: { name: 'Silt Chant', icon: 'wave', shape: 'foe', range: 'magic', power: 0.9, fx: 'brine' },
  requiem: { name: 'Requiem', icon: 'doom', shape: 'foes', range: 'magic', power: 0.45, cost: 30, status: { key: 'doom', turns: 2, power: 0.25 }, fx: 'requiem' },
  crozier: { name: 'Crozier', icon: 'mace', shape: 'foe', range: 'melee', power: 1, fx: 'smash' },
  baptism: { name: 'Baptism', icon: 'charge', shape: 'foe', reach: true, cost: 25, charge: 'drown', fx: 'charge', tip: 'Picks a victim and calls up the font. Next turn: Drown.' },
  drown: { name: 'Drown', icon: 'wave', shape: 'foe', range: 'magic', power: 3.4, fx: 'drown' },
  font: { name: 'Font of Brine', icon: 'wave', shape: 'foes', range: 'magic', power: 0.5, cost: 25, fx: 'font' },
  raise: { name: 'Raise the Drowned', icon: 'holy', shape: 'ally', revive: 0.5, cost: 35, fx: 'raise', tip: 'Raises a fallen ally with half its health.' },

  // Party items: what each does when a party rule uses it.
  draught: { name: 'Healing Draught', icon: 'flask', shape: 'ally', healPct: 0.4, item: true, fx: 'mend', tip: 'Restores 40% of one ally’s health.' },

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
// c is the battle as the acting character sees it: { u, foes, allies, fallen, round, enrage, leader }.
// When the condition looks at the side a single-target skill hits, it also picks that skill's target (FF12 style).
// Otherwise it only decides whether the rule fires.
const hpPct = x => (100 * x.hp) / x.maxHp;
const mpPct = x => (x.maxMp ? (100 * x.mp) / x.maxMp : 100);
const stAdj = s => (STATUSES[s] ? STATUSES[s].adj || STATUSES[s].name : s);
const stName = s => (STATUSES[s] ? STATUSES[s].name : s);
// Foe kinds that conditions can name. Foes list theirs in tags.
const TAGS = { undead: 'Undead', spirit: 'Spirit', beast: 'Beast' };
const CONDITIONS = {
  always: { group: 'battle', start: true, when: () => true, label: () => 'Always', tip: 'Always true. Put it last, as a fallback.' },
  self_hp_lt: { group: 'self', who: 'self', n: [25, 50, 75], start: [50], filter: (x, r) => hpPct(x) < r.n, label: r => `Self: health below ${r.n}%` },
  self_mp_lt: { group: 'self', who: 'self', n: [25, 50], filter: (x, r) => mpPct(x) < r.n, label: r => `Self: mana below ${r.n}%` },
  ally_hp_lt: { group: 'ally', who: 'ally', n: [25, 30, 50, 75], start: [50], filter: (x, r) => hpPct(x) < r.n, best: (x, b) => hpPct(x) < hpPct(b), label: r => `Ally: health below ${r.n}%`, tip: 'Picks the most hurt ally below the line.' },
  ally_fallen: { group: 'ally', who: 'fallen', label: () => 'Ally: fallen' },
  ally_has: { group: 'ally', who: 'ally', s: ['marked', 'doom', 'bleed'], filter: (x, r) => !!x.st[r.s], label: r => `Ally: ${stAdj(r.s)}`, tip: 'An ally with this status. Marked means a foe is charging a big attack at them.' },
  ally_without: { group: 'ally', who: 'ally', s: ['kindled', 'guarding'], filter: (x, r) => !x.st[r.s], label: r => `Ally: not ${stName(r.s)}` },
  front_foe: { group: 'foe', who: 'foe', start: true, filter: x => x.row === 'front', label: () => 'Front foe' },
  foe_lowest: { group: 'foe', who: 'foe', start: true, best: (x, b) => x.hp < b.hp, label: () => 'Foe: lowest health' },
  foe_hp_lt: { group: 'foe', who: 'foe', n: [25, 35, 50, 75], filter: (x, r) => hpPct(x) < r.n, best: (x, b) => hpPct(x) < hpPct(b), label: r => `Foe: health below ${r.n}%` },
  foe_highest_pow: { group: 'foe', who: 'foe', best: (x, b) => x.pow > b.pow, label: () => 'Foe: highest attack' },
  foe_charging: { group: 'foe', who: 'foe', from: 'a battle reward', filter: x => !!x.st.charging, label: () => 'Foe: charging a big attack' },
  foe_without: { group: 'foe', who: 'foe', s: ['doom', 'dazzled'], filter: (x, r) => !x.st[r.s], label: r => `Foe: not ${stAdj(r.s)}` },
  foe_tag: { group: 'foe', who: 'foe', s: ['undead', 'spirit', 'beast'], from: 'a battle reward', filter: (x, r) => x.tags.includes(r.s), label: r => `Foe: ${TAGS[r.s] || r.s}` },
  leader_target: { group: 'foe', who: 'foe', filter: (x, r, c) => !!c.leader && c.leader.lastTarget === x, label: () => "Foe: the leader's target", tip: 'The foe the party leader (the first hero still standing) last attacked.' },
  foes_at_least: { group: 'battle', n: [2, 3, 4, 5], when: (r, c) => c.foes.length >= r.n, label: r => `${r.n} or more foes` },
  boss_present: { group: 'battle', from: 'a battle reward', when: (r, c) => c.foes.some(f => f.boss), label: () => 'Boss present' },
  enraged: { group: 'battle', when: (r, c) => c.enrage > 0, label: () => 'Foes enraged', tip: 'True once the turn limit is reached and foes hit harder every round.' },
};
for (const id in CONDITIONS) CONDITIONS[id].id = id;

// ── Rule slots
// Each class starts with slots[0] rule slots and can buy up to slots[1] (see CLASSES). Extra slots cost level-up
// points, each more than the last: RULE_SLOT_COST[k] is the price of the (k+1)-th extra slot (tune).
const RULE_SLOT_COST = [1, 2, 3, 4, 5];

// ── Party items and party rules
// Party rules are read from the top at the start of every hero's turn, before that hero's own rules.
//   An item rule that is true and possible spends that hero's turn on the item, from the party's stock.
//   A focus rule names a foe. Heroes attack it whenever their own rule didn't pick a target.
// An item's skill is what it does when used, so the battle screen animates it like any skill.
// carry: how many the party takes into each battle (tune).
const ITEMS = {
  draught: { name: 'Healing Draught', icon: 'flask', skill: 'draught', carry: 3, tip: 'Restores 40% of one ally’s health.' },
};
// kind: item (uses ITEMS[item]) or focus. who: for focus, the side its condition must look at.
const PARTY_ACTIONS = {
  draught: { kind: 'item', item: 'draught', name: 'Healing Draught', icon: 'flask', tip: 'Restores 40% of one ally’s health. The hero whose turn it is uses it.' },
  focus: { kind: 'focus', who: 'foe', name: 'Focus fire', icon: 'mark', tip: 'Every hero attacks this foe, unless their own rule picked a target.' },
};
// Party rule slots: the starting number and the most the Tactician can add (tune). rules: the starting set.
const PARTY_RULES = { slots: [2, 5], rules: [{ if: 'ally_hp_lt', n: 30, do: 'draught' }, { if: 'foe_lowest', do: 'focus', on: false }] };

const ruleCond = r => (CONDITIONS[r.if] ? CONDITIONS[r.if].label(r) : r.if);
const ruleAction = r => (PARTY_ACTIONS[r.do] ? PARTY_ACTIONS[r.do].name : SKILLS[r.do] ? SKILLS[r.do].name : r.do);
const ruleText = r => `${ruleCond(r)} → ${ruleAction(r)}`;

// ── The six classes
// Stats: hp, mp (mana), pow (Power), def (Defense), spd (Speed), crit and dodge (percent chances).
// mpGain: mana each basic attack restores. Each class has a basic attack, two skills and a short rule list.
// slots: [rule slots it starts with, the most it can buy] (tune).
const CLASSES = {
  warden: {
    name: 'Warden', role: 'Front-row tank', hp: 190, mp: 30, pow: 14, def: 14, spd: 8, crit: 5, dodge: 0, mpGain: 10,
    basic: 'mace', skills: ['guard', 'bash'], slots: [2, 5],
    rules: [{ if: 'foe_charging', do: 'guard' }, { if: 'ally_hp_lt', n: 50, do: 'guard' }, { if: 'front_foe', do: 'bash' }],
  },
  sellsword: {
    name: 'Sellsword', role: 'Front-row damage', hp: 135, mp: 30, pow: 20, def: 6, spd: 10, crit: 10, dodge: 5, mpGain: 10,
    basic: 'strike', skills: ['cleave', 'lunge'], slots: [2, 4],
    rules: [{ if: 'foe_hp_lt', n: 35, do: 'lunge' }, { if: 'front_foe', do: 'cleave' }],
  },
  crossbowman: {
    name: 'Crossbowman', role: 'Back-row ranged damage', hp: 100, mp: 30, pow: 20, def: 4, spd: 10, crit: 15, dodge: 8, mpGain: 10,
    basic: 'bolt', skills: ['aimed', 'volley'], slots: [1, 5],
    rules: [{ if: 'foes_at_least', n: 4, do: 'volley' }, { if: 'foe_lowest', do: 'aimed' }],
  },
  pilgrim: {
    name: 'Pilgrim', role: 'Healer', hp: 105, mp: 50, pow: 14, def: 5, spd: 9, crit: 5, dodge: 5, mpGain: 12,
    basic: 'smite', skills: ['mend', 'rites'], slots: [2, 6],
    rules: [{ if: 'ally_fallen', do: 'rites' }, { if: 'ally_hp_lt', n: 50, do: 'mend' }],
  },
  lamplighter: {
    name: 'Lamplighter', role: 'Support', hp: 95, mp: 40, pow: 14, def: 4, spd: 12, crit: 5, dodge: 10, mpGain: 12,
    basic: 'flare', skills: ['kindle', 'dazzle'], slots: [1, 6],
    rules: [{ if: 'foe_charging', do: 'dazzle' }, { if: 'ally_hp_lt', n: 50, do: 'dazzle' }, { if: 'ally_without', s: 'kindled', do: 'kindle' }],
  },
  hexblade: {
    name: 'Hexblade', role: 'Curses and damage over time', hp: 100, mp: 40, pow: 18, def: 4, spd: 11, crit: 8, dodge: 8, mpGain: 12,
    basic: 'hexbolt', skills: ['doom', 'hexswarm'], slots: [2, 5],
    rules: [{ if: 'foes_at_least', n: 3, do: 'hexswarm' }, { if: 'foe_without', s: 'doom', do: 'doom' }],
  },
};
// The fixed party for this prototype, by slot: Warden and Sellsword in front, the rest behind.
const PARTY = ['warden', 'sellsword', 'crossbowman', 'pilgrim', 'lamplighter', 'hexblade'];

// ── Foes
// tags: the kinds of foe it counts as, for rule conditions (TAGS).
// elite and boss foes are marked on the turn flags, bosses drawn larger. death is the report's closing line when that foe falls last.
const FOES = {
  ghoul: { name: 'Ghoul', tags: ['undead'], death: 'It folds back into the dirt it came from.', hp: 72, mp: 20, pow: 20, def: 3, spd: 9, crit: 5, dodge: 5, mpGain: 10, basic: 'claw', skills: ['gnaw'], rules: [{ if: 'foe_lowest', do: 'gnaw' }] },
  rats: { name: 'Grave Rats', tags: ['beast'], death: 'The survivors scatter into the barrows.', hp: 56, mp: 20, pow: 14, def: 2, spd: 13, crit: 5, dodge: 15, mpGain: 10, basic: 'bite', skills: ['skitter'], rules: [{ if: 'front_foe', do: 'skitter' }] },
  bones: { name: 'Restless Bones', tags: ['undead'], death: 'It comes apart and stays apart.', hp: 62, mp: 20, pow: 17, def: 6, spd: 8, crit: 5, dodge: 0, mpGain: 10, basic: 'bonetoss', skills: ['reassemble'], rules: [{ if: 'self_hp_lt', n: 50, do: 'reassemble' }, { if: 'foe_lowest', do: 'bonetoss' }] },
  gravewarden: { name: 'The Gravewarden', tags: ['undead'], death: 'Its armour falls empty to the ground.', elite: true, hp: 210, mp: 40, pow: 22, def: 12, spd: 8, crit: 5, dodge: 0, mpGain: 10, basic: 'halberd', skills: ['watch', 'reap'], rules: [{ if: 'ally_hp_lt', n: 50, do: 'watch' }, { if: 'foe_lowest', do: 'reap' }] },
  sexton: { name: 'The Sexton', death: 'He falls into his own last grave.', boss: true, hp: 360, mp: 40, pow: 30, def: 8, spd: 9, crit: 8, dodge: 0, mpGain: 10, basic: 'shovel', skills: ['dig', 'gravedirt'], rules: [{ if: 'foe_hp_lt', n: 75, do: 'dig' }, { if: 'foes_at_least', n: 4, do: 'gravedirt' }] },
  acolyte: { name: 'Drowned Acolyte', death: 'It slumps, pouring water from its sleeves.', hp: 66, mp: 30, pow: 17, def: 4, spd: 10, crit: 5, dodge: 5, mpGain: 10, basic: 'brinebolt', skills: ['hymn'], rules: [{ if: 'ally_hp_lt', n: 60, do: 'hymn' }, { if: 'foe_lowest', do: 'brinebolt' }] },
  bloat: { name: 'Bloated Corpse', tags: ['undead'], death: 'It bursts. You will smell it for days.', hp: 150, mp: 0, pow: 20, def: 5, spd: 6, crit: 0, dodge: 0, mpGain: 0, basic: 'slam', skills: ['burst'], rules: [{ if: 'self_hp_lt', n: 35, do: 'burst' }] },
  bellwraith: { name: 'Bell Wraith', tags: ['spirit'], death: 'The tolling stops.', hp: 60, mp: 30, pow: 20, def: 3, spd: 11, crit: 5, dodge: 20, mpGain: 10, basic: 'wail', skills: ['toll'], rules: [{ if: 'foes_at_least', n: 3, do: 'toll' }, { if: 'foe_hp_lt', n: 50, do: 'wail' }] },
  choir: { name: 'Choir of Silt', tags: ['spirit'], death: 'The choir falls silent, one voice at a time.', elite: true, hp: 230, mp: 40, pow: 21, def: 6, spd: 10, crit: 5, dodge: 5, mpGain: 12, basic: 'chant', skills: ['hymn', 'requiem'], rules: [{ if: 'ally_hp_lt', n: 50, do: 'hymn' }, { if: 'foes_at_least', n: 3, do: 'requiem' }] },
  bishop: { name: 'The Drowned Bishop', death: 'He sinks back into the black font.', boss: true, hp: 380, mp: 50, pow: 31, def: 8, spd: 9, crit: 8, dodge: 0, mpGain: 12, basic: 'crozier', skills: ['raise', 'baptism', 'font'], rules: [{ if: 'ally_fallen', do: 'raise' }, { if: 'foe_hp_lt', n: 75, do: 'baptism' }, { if: 'foes_at_least', n: 4, do: 'font' }] },
};

// ── Regions and stages
// foes lists the foe in each slot (null for an empty slot), in the same slot order as the party.
const REGION_NAMES = [{ name: 'Gravefields', num: 'I' }, { name: 'Drowned Chapel', num: 'II' }];
const STAGES = [
  { id: '1-1', region: 0, name: 'The Barrow Gate', foes: ['ghoul', 'ghoul', null, 'bones', 'bones', null] },
  { id: '1-2', region: 0, name: 'Rat-Choked Crypt', foes: ['rats', 'rats', 'bones', 'bones', null, 'bones'] },
  { id: '1-3', region: 0, name: "The Sexton's Grave", boss: true, foes: ['sexton', 'gravewarden', 'bones', null, null, 'bones'] },
  { id: '2-1', region: 1, name: 'The Flooded Nave', foes: ['bloat', 'bloat', 'acolyte', 'bellwraith', null, 'acolyte'] },
  { id: '2-2', region: 1, name: 'The Choir Loft', foes: ['bloat', 'ghoul', 'bellwraith', 'choir', null, 'bellwraith'] },
  { id: '2-3', region: 1, name: 'The Black Font', boss: true, foes: ['bishop', 'bloat', 'acolyte', null, 'bellwraith', 'acolyte'] },
];
