'use strict';
// Lantern Road · equipment: the 92 items of the content spec (§6), the pieces you own, loot rolls and the Bag.
// docs/content-spec.md §6 is the source of truth; every number here is a starting value to tune.
// It touches no page, so tools/simtest.js tests it in Node. The art for every item lives in js/art.js (GEAR_ART).
//
// ── How an item reads (GEAR[id])
// name, slot ('weapon', 'armor' or 'accessory'), rarity ('common', 'fine', 'rare' or 'relic'), and
//   type     a weapon's type (WEAPON_TYPES), used by the classes in its cls list
//   weight   an armour's weight: 'light', 'medium' or 'heavy'
//   cls      a class-only accessory's class
//   stats    plain stats: Health (hp), Mana (mp), Power (pow), Defense (def), Speed (spd), Crit and Dodge (%). Health,
//            Mana, Power and Defense grow with the item's level (ITEM.GROWTH); the rest stay as they are
//   cost     fixed stat costs from the effect: they don't grow
//   lines    what the card says beyond the plain stats: ['+', text, icon] a bonus, ['-', text, icon] a cost,
//            ['?', when, text, icon, test] a bonus under a condition. test(where) checks it outside battle
//            ({ row }): true, false, or nothing when only the battle can tell. A line may carry { later: 'fatigue' }
//   fx       its effect, as passive hooks (js/sim.js lists them). An action hook returns true when it acted, so the
//            balance test can see every effect fire
//   fatigue  fatigue gained × this (build step 5 reads it)
// ── A piece you own (an instance): { uid, id, lv }, plus fresh: true until you have seen it in the Bag.
//   lv is the level of the stage it dropped from. Its rarity is its item's.

const ITEM = {
  BAG: 60,                     // the Bag holds 60 pieces; equipped gear doesn't count (home-base spec, decided overnight)
  GROWTH: 15,                  // plain stats × (1 + (level − 1) ÷ 15): a level-1 drop matches the tables (tune)
  SELL: { common: 10, fine: 25, rare: 60, relic: 0 }, // gold × S, with S = 1 + level ÷ 5 (home-base spec §5) (tune)
  SLOT_ODDS: { weapon: 40, armor: 30, accessory: 30 }, // a gear roll's slot (home-base spec)
  // Rarity by region (content spec §6): Common, Fine, Rare. Elite stages move 10 points from Common to Rare, bosses 20.
  RATES: [[70, 25, 5], [55, 35, 10], [45, 40, 15], [35, 45, 20], [25, 50, 25]],
  RANK_SHIFT: { normal: 0, elite: 10, boss: 20 },
};
const RARITY_NAMES = { common: 'Common', fine: 'Fine', rare: 'Rare', relic: 'Relic' };
const SLOTS = ['weapon', 'armor', 'accessory'];
const SLOT_NAMES = { weapon: 'Weapon', armor: 'Armour', accessory: 'Accessory' };
const WEIGHT_NAMES = { light: 'Light', medium: 'Medium', heavy: 'Heavy' };
// Each class uses one weapon type (content spec §6).
const WEAPON_TYPES = {
  sword: { name: 'Sword', plural: 'Swords', cls: 'sellsword' },
  cursed: { name: 'Cursed blade', plural: 'Cursed blades', cls: 'hexblade' },
  censer: { name: 'Censer', plural: 'Censers', cls: 'pilgrim' },
  mace: { name: 'Mace and shield', plural: 'Maces and shields', cls: 'warden' },
  lantern: { name: 'Lantern', plural: 'Lanterns', cls: 'lamplighter' },
  crossbow: { name: 'Crossbow', plural: 'Crossbows', cls: 'crossbowman' },
  rapier: { name: 'Rapier', plural: 'Rapiers', cls: 'duellist' },
  flask: { name: 'Flask', plural: 'Flasks', cls: 'alchemist' },
  bonesaw: { name: 'Bonesaw', plural: 'Bonesaws', cls: 'surgeon' },
  handbell: { name: 'Handbell', plural: 'Handbells', cls: 'bellringer' },
  stave: { name: 'Bone staff', plural: 'Bone staves', cls: 'gravecaller' },
  dagger: { name: 'Dagger', plural: 'Daggers', cls: 'cutpurse' },
};
const WEAPON_OF = Object.fromEntries(Object.entries(WEAPON_TYPES).map(([k, T]) => [T.cls, k]));
const GEAR_STAT_ICONS = { hp: 'heart', mp: 'mana', pow: 'sword', def: 'shield', spd: 'boot', crit: 'star', dodge: 'feather' };
const GEAR_STAT_NAMES = { hp: 'Health', mp: 'Mana', pow: 'Power', def: 'Defense', spd: 'Speed', crit: 'Crit', dodge: 'Dodge' };

const GEAR = {};
const GEAR_ORDER = [];
// For the balance test: when set to an object, every item effect that acts counts itself here.
const GEAR_TRACK = { on: null };
// What a hook returns when it changes nothing; anything else counts as the effect firing.
const HOOK_NEUTRAL = { out: 1, taken: 1, healOut: 1, healIn: 1, dotOut: 1, dotIn: 1, pushMul: 1, stealMul: 1, aIn: 1, crit: 0, dodge: 0, critX: 0, healCap: 1 };
function trackHook(id, k, fn) {
  return function (...a) {
    const r = fn(...a), T = GEAR_TRACK.on;
    if (T) {
      const fired = k === 'stat' ? true : k in HOOK_NEUTRAL ? r != null && r !== HOOK_NEUTRAL[k] && !(k === 'critX' && !r) : r != null && r !== false ? !!r : k === 'statusIn' && r === false;
      if (fired) T[id] = (T[id] || 0) + 1;
    }
    return r;
  };
}
function defItem(id, o) {
  const it = Object.assign({ id, stats: {}, cost: {}, lines: [] }, o);
  if (it.fx) {
    const fx = { id: 'item:' + id, item: id };
    for (const k in it.fx) fx[k] = typeof it.fx[k] === 'function' ? trackHook(id, k, it.fx[k]) : it.fx[k];
    it.fx = fx;
  }
  GEAR[id] = it;
  GEAR_ORDER.push(id);
}
const B = (text, icon, o) => Object.assign(['+', text, icon], { o });
const X = (text, icon, o) => Object.assign(['-', text, icon], { o });
const W = (when, text, icon, test, o) => Object.assign(['?', when, text, icon, test], { o });
const FRONT = w => (w && w.row ? w.row === 'front' : undefined);
const BACK = w => (w && w.row ? w.row === 'back' : undefined);
const LATER_FATIGUE = {}; // fatigue works since build step 5 (js/rest.js reads Items.fatigueMul)

// Small helpers the effects share.
const isHealSkill = sk => !!(sk && (sk.heal || sk.healPct || sk.fx === 'mend'));
const isCleanseSkill = sk => !!(sk && sk.cleanse);
const direct = c => c && !c.dot;
// "First 2 turns: +n Speed": faster from the start, back to normal after the second turn.
const earlySpeed = (id, n) => ({
  start: (E, u) => { const a = u.spd; u.spd += n; u.next = u.next * a / u.spd; u['_' + id] = true; return true; },
  turnEnd: (E, u) => { if (u['_' + id] && E.turns(u) >= 2) { u.spd -= n; u['_' + id] = false; return true; } },
});
const killMana = n => ({ kill: (E, u) => E.mana(u, n) > 0 });
const maxHpCut = k => ({ stat: u => { u.maxHp *= 1 - k; } });

// ═══════════════════════════════════════════════════════════════════ Weapons
const weapon = (id, type, rarity, name, stats, o = {}) => defItem(id, Object.assign({ name, slot: 'weapon', type, rarity, stats }, o));

// Swords: Sellsword
weapon('notchedsword', 'sword', 'common', 'Notched Sword', { pow: 4 }, { flavor: 'Every notch is a fight it came back from.' });
weapon('hirelingsabre', 'sword', 'fine', 'Hireling’s Sabre', { pow: 5, crit: 3 }, { lines: [W('On a kill', 'Restore 10 mana', 'mana')], fx: killMana(10), flavor: 'Paid by the head, and the head is the point.' });
weapon('headsmansblade', 'sword', 'rare', 'Headsman’s Blade', { pow: 7 }, {
  lines: [W('Foe below 30% health', '+35% damage', 'skull'), X('−15% damage to foes above 70% health', 'sword')],
  fx: { out: (E, u, t, p, c) => (!direct(c) ? 1 : E.pct(t) < 0.3 ? 1.35 : E.pct(t) > 0.7 ? 0.85 : 1) },
  flavor: 'Made for necks that have stopped struggling.',
});
weapon('gravecutter', 'sword', 'rare', 'Gravecutter', { pow: 9 }, {
  cost: { spd: -1, dodge: -4 },
  lines: [B('Cleave and other front-row skills +20% damage', 'cleave')],
  fx: { out: (E, u, t, p, c) => (direct(c) && c.sk && c.sk.shape === 'front' ? 1.2 : 1) },
  flavor: 'Too heavy to swing twice. It rarely needs to.',
});
// Cursed blades: Hexblade
weapon('rustedsickle', 'cursed', 'common', 'Rusted Sickle', { pow: 3, mp: 5 }, { flavor: 'It reaped wheat once. It remembers.' });
weapon('hexedkris', 'cursed', 'fine', 'Hexed Kris', { pow: 4 }, {
  lines: [B('Doom the Hexblade applies lasts 1 turn longer', 'doom')],
  fx: { applyOut: (E, u, t, p, s) => { if (s.key === 'doom' && s.turns < 90) { s.turns += 1; return true; } } },
  flavor: 'The wave in the blade is a word, spoken slowly.',
});
weapon('witchironsickle', 'cursed', 'rare', 'Witch-iron Sickle', { pow: 6 }, {
  lines: [B('Doom ticks +25%', 'doom'), X('Max health −10%', 'heart')],
  fx: Object.assign({ dotOut: (E, u, t, p, c) => (c.key === 'doom' ? 1.25 : 1) }, maxHpCut(0.1)),
  flavor: 'Cold to hold. Colder to be cut by.',
});
weapon('mourningblade', 'cursed', 'rare', 'Mourning Blade', { pow: 5, mp: 10 }, {
  lines: [W('A foe the Hexblade Doomed falls', 'Restore 15 mana', 'mana'), X('Hex Bolt −20% damage', 'curse')],
  fx: {
    aFall: (E, o, t) => (o.alive && t.side !== o.side && t.st.doom && t.st.doom.src === o.id ? E.mana(o, 15) > 0 : false),
    out: (E, u, t, p, c) => (direct(c) && c.sk && c.sk.id === 'hexbolt' ? 0.8 : 1),
  },
  flavor: 'The black ribbon is tied fresh for every funeral it causes.',
});
// Censers: Pilgrim
weapon('tincenser', 'censer', 'common', 'Tin Censer', { pow: 3, mp: 5 }, { flavor: 'Cheap incense, honest prayers.' });
weapon('chapelcenser', 'censer', 'fine', 'Chapel Censer', { pow: 3, mp: 8 }, {
  lines: [B('Healing +10%', 'cross')],
  fx: { healOut: () => 1.1 },
  flavor: 'Brass, and polished by a hundred hands at vespers.',
});
weapon('drownedcenser', 'censer', 'rare', 'Drowned Censer', { pow: 4, mp: 10 }, {
  lines: [W('Ally below 30% health', 'Heals +35%', 'cross'), X('Heals on allies above 70% health −25%', 'cross')],
  fx: { healOut: (E, u, t) => (E.pct(t) < 0.3 ? 1.35 : E.pct(t) > 0.7 ? 0.75 : 1) },
  flavor: 'It still drips. Nobody knows from where.',
});
weapon('emberthurible', 'censer', 'rare', 'Ember Thurible', { pow: 6 }, {
  lines: [B('Smite also heals the most hurt ally for 30% of its damage', 'holy'), X('Mend costs 5 more', 'mana')],
  fx: {
    hit: (E, u, t, p, c) => { if (c.counter || !c.sk || (c.sk.id !== 'smite' && c.sk.id !== 'crusadersmite') || !c.d) return; const a = E.hurtest(E.heroes(u)); return a ? E.heal(u, a, c.d * 0.3, { raw: true }) > 0 : false; },
    cost: (E, u, sk, p, c) => { if (sk.id === 'mend') { c.add += 5; return true; } },
  },
  flavor: 'The coals inside have burned since the old saint died.',
});
// Maces and shields: Warden
weapon('ironmace', 'mace', 'common', 'Iron Mace and Buckler', { pow: 3, def: 2 }, { flavor: 'Plain iron. It does what it is told.' });
weapon('watchmansflail', 'mace', 'fine', 'Watchman’s Flail', { pow: 3, def: 3 }, {
  lines: [W('While Guarding', 'A further −10% damage taken', 'shield')],
  fx: { taken: (E, u) => (u.st.guarding ? 0.9 : 1) },
  flavor: 'The night watch swung it at anything that walked the lanes after curfew.',
});
weapon('towershield', 'mace', 'rare', 'Tower Shield and Maul', { pow: 2, def: 7, hp: 20 }, { cost: { spd: -2 }, flavor: 'A wall you carry. Slowly.' });
weapon('spikedbulwark', 'mace', 'rare', 'Spiked Bulwark', { pow: 4, def: 4 }, {
  lines: [B('Foes that hit the Warden take 0.3× back', 'thorns'), X('Healing received −15%', 'cross')],
  fx: { stat: u => { u.thorns = (u.thorns || 0) + 0.3; }, healIn: () => 0.85 },
  flavor: 'Hugging it is a mistake people make once.',
});
// Lanterns: Lamplighter
weapon('tinlantern', 'lantern', 'common', 'Tin Lantern', { pow: 3, dodge: 2 }, { flavor: 'A wick, a pole and some nerve.' });
weapon('shutteredlantern', 'lantern', 'fine', 'Shuttered Lantern', { pow: 3, mp: 8 }, {
  lines: [B('Kindle also restores 5 mana to each ally', 'mana')],
  fx: { used: (E, u, sk) => { if (sk.id !== 'kindle') return; let n = 0; for (const a of E.heroes(u)) n += E.mana(a, 5); return n > 0; } },
  flavor: 'Open the shutters and the whole road takes heart.',
});
weapon('mothlure', 'lantern', 'rare', 'Moth-lure Lantern', { pow: 5 }, {
  lines: [B('Foes the Lamplighter hits are Exposed for 1 turn', 'exposed'), X('Spirits aim every single-target attack at the Lamplighter', 'taunt')],
  fx: {
    hit: (E, u, t, p, c) => (direct(c) && t.alive && t.side !== u.side ? E.status(u, t, 'exposed', { turns: 1 }) : false),
    aAim: (E, o, f, p, plan) => (o.alive && f.side !== o.side && (f.tags || []).includes('spirit') && plan.pool && plan.pool.includes(o) ? o : null),
  },
  flavor: 'Pale light. Things that are not quite there come to it.',
});
weapon('bonfirelantern', 'lantern', 'rare', 'Bonfire Lantern', { pow: 6 }, {
  lines: [B('Kindled gives +40% instead of +30%', 'kindle'), X('Kindle costs 10 more', 'mana')],
  fx: {
    helpOut: (E, u, t, p, s) => { if (s.key === 'kindled') { s.v = (s.v || 30) + 10; return true; } },
    cost: (E, u, sk, p, c) => { if (sk.id === 'kindle') { c.add += 10; return true; } },
  },
  flavor: 'Less a lantern than a small, portable fire.',
});
// Crossbows: Crossbowman
weapon('huntingcrossbow', 'crossbow', 'common', 'Hunting Crossbow', { pow: 4 }, { flavor: 'For deer, mostly. Mostly.' });
weapon('windlass', 'crossbow', 'fine', 'Windlass Crossbow', { pow: 7 }, { cost: { spd: -1 }, flavor: 'Crank, crank, crank, thunk.' });
weapon('repeater', 'crossbow', 'rare', 'Repeater', { pow: 3, spd: 1 }, {
  lines: [B('Rapid Fire, Scatter Shot and Volley +20% damage', 'arrow'), X('Aimed Shot −20% damage', 'mark')],
  fx: { out: (E, u, t, p, c) => (!direct(c) || !c.sk ? 1 : ['rapidfire', 'scattershot', 'volley'].includes(c.sk.id) ? 1.2 : c.sk.id === 'aimed' ? 0.8 : 1) },
  flavor: 'A box of bolts and a lever. Accuracy is someone else’s problem.',
});
weapon('arbalest', 'crossbow', 'rare', 'Arbalest of the Keep', { pow: 10 }, {
  cost: { spd: -2 },
  lines: [W('First 2 turns', '+25% crit chance', 'star')],
  fx: { crit: (E, u) => (E.turns(u) <= 2 ? 25 : 0) },
  flavor: 'It took two men to wind it on the walls. You manage alone.',
});
// Rapiers: Duellist
weapon('practicerapier', 'rapier', 'common', 'Practice Rapier', { pow: 3, dodge: 3 }, { flavor: 'The button came off the tip years ago.' });
weapon('smallsword', 'rapier', 'fine', 'Fencer’s Smallsword', { pow: 4, dodge: 4 }, {
  lines: [W('After a dodge', 'The next attack deals +20%', 'riposte')],
  fx: {
    dodged: (E, u) => { u._smallsword = true; return true; },
    out: (E, u, t, p, c) => (direct(c) && u._smallsword ? 1.2 : 1),
    used: (E, u, sk) => { if (u._smallsword && sk.power) { u._smallsword = false; } },
  },
  flavor: 'Light enough to answer before the question is finished.',
});
weapon('maingauche', 'rapier', 'rare', 'Main-gauche', { pow: 5, dodge: 6 }, {
  lines: [B('Counters deal +30%', 'riposte'), X('Max health −10%', 'heart')],
  fx: Object.assign({ out: (E, u, t, p, c) => (c && c.counter ? 1.3 : 1) }, maxHpCut(0.1)),
  flavor: 'The left hand’s blade. It waits for the right one’s opening.',
});
// Flasks: Alchemist
weapon('clayflasks', 'flask', 'common', 'Clay Flasks', { pow: 4 }, { flavor: 'Stoppered with wax and hope.' });
weapon('grenadoes', 'flask', 'fine', 'Glass Grenadoes', { pow: 5 }, {
  lines: [B('Burning the Alchemist applies lasts 1 turn longer', 'fire')],
  fx: { applyOut: (E, u, t, p, s) => { if (s.key === 'burn' && s.turns < 90) { s.turns += 1; return true; } } },
  flavor: 'Thin glass, short fuse, long burn.',
});
weapon('witchfiresatchel', 'flask', 'rare', 'Witchfire Satchel', { pow: 7 }, {
  lines: [B('Area skills +20% damage', 'burst'), X('The Alchemist starts each battle Burning (2 turns)', 'fire')],
  fx: {
    out: (E, u, t, p, c) => (direct(c) && c.area ? 1.2 : 1),
    start: (E, u) => E.status(u, u, 'burn', { turns: 2, p: 0.2, sure: true, raw: true }),
  },
  flavor: 'The bag smoulders. So, a little, does whoever carries it.',
});
// Bonesaws: Barber-Surgeon
weapon('rustybonesaw', 'bonesaw', 'common', 'Rusty Bonesaw', { pow: 3, mp: 5 }, { flavor: 'Sharp enough. Clean enough. Usually.' });
weapon('surgeonskit', 'bonesaw', 'fine', 'Surgeon’s Kit', { pow: 3, mp: 8 }, {
  lines: [B('Cleanses also heal 1.0×', 'cross')],
  fx: { used: (E, u, sk, p, c) => { if (!isCleanseSkill(sk)) return; let n = 0; for (const t of c.targets || []) if (t.alive && t.side === u.side) n += E.heal(u, t, u.pow); return n > 0; } },
  flavor: 'Every blade in its own pocket, every pocket labelled.',
});
weapon('butcherssaw', 'bonesaw', 'rare', 'Butcher’s Saw', { pow: 6 }, {
  lines: [B('Lancet Throw applies Bleeding (2 turns, 0.2×)', 'bleed'), X('Heals cost 3 more', 'mana')],
  fx: {
    hit: (E, u, t, p, c) => (direct(c) && c.sk && c.sk.id === 'lancet' && t.alive ? E.status(u, t, 'bleed', { turns: 2, p: 0.2 }) : false),
    cost: (E, u, sk, p, c) => { if (isHealSkill(sk)) { c.add += 3; return true; } },
  },
  flavor: 'Bought from a butcher. The butcher did not ask why.',
});
// Handbells: Bellringer
weapon('brasshandbell', 'handbell', 'common', 'Brass Handbell', { pow: 3, mp: 5 }, { flavor: 'Rung for the dead cart, once.' });
weapon('vesperbell', 'handbell', 'fine', 'Vesper Bell', { pow: 3, mp: 8 }, {
  lines: [B('Push-backs are 10% stronger', 'hourglass')],
  fx: { pushMul: () => 1.1 },
  flavor: 'Its note hangs in the air a moment longer than it should.',
});
weapon('chapelbell', 'handbell', 'rare', 'Cracked Chapel Bell', { pow: 5 }, {
  lines: [B('Stunned foes take +25% damage from everyone', 'stun'), X('The Bellringer is Slowed for the first 2 turns', 'slow')],
  fx: {
    aIn: (E, o, t, src, p, c) => (direct(c) && t.side !== o.side && t.st.stunned ? 1.25 : 1),
    start: (E, u) => E.status(u, u, 'slowed', { turns: 2, sure: true, raw: true }),
  },
  flavor: 'The crack makes it ring wrong. Wrong is what you want.',
});
// Bone staves: Gravecaller
weapon('femurstaff', 'stave', 'common', 'Femur Staff', { pow: 4 }, { flavor: 'Somebody’s. Nobody asks whose.' });
weapon('ossuaryrod', 'stave', 'fine', 'Ossuary Rod', { pow: 4, mp: 8 }, {
  lines: [B('Thralls have +15% health', 'bone')],
  fx: { thrall: (E, o, t) => { t.maxHp *= 1.15; return true; } },
  flavor: 'Little skulls, stacked like beads.',
});
weapon('barrowkingstaff', 'stave', 'rare', 'Barrow-king’s Staff', { pow: 6 }, {
  lines: [B('Thralls deal +25% damage', 'bone'), X('The Gravecaller takes +15% damage', 'exposed')],
  fx: { thrall: (E, o, t) => { t.pow *= 1.25; return true; }, taken: () => 1.15 },
  flavor: 'The king in the barrow still wears his crown, and still gives orders.',
});
// Daggers: Cutpurse
weapon('rustyshiv', 'dagger', 'common', 'Rusty Shiv', { pow: 4 }, { flavor: 'Tetanus is a kind of poison.' });
weapon('twinstilettos', 'dagger', 'fine', 'Twin Stilettos', { pow: 5, crit: 3 }, {
  lines: [B('Backstab +15% damage', 'knife')],
  fx: { out: (E, u, t, p, c) => (direct(c) && c.sk && c.sk.id === 'backstab' ? 1.15 : 1) },
  flavor: 'One for the ribs, one for luck.',
});
weapon('widowskiss', 'dagger', 'rare', 'Widow’s Kiss', { pow: 6 }, {
  lines: [B('Poison the Cutpurse applies ticks 30% harder', 'poison'), X('Max health −10%', 'heart')],
  fx: Object.assign({ dotOut: (E, u, t, p, c) => (c.key === 'poison' ? 1.3 : 1) }, maxHpCut(0.1)),
  flavor: 'Black glass, and a groove for something green.',
});

// ═══════════════════════════════════════════════════════════════════ Armour
// Weights: light +10 Health +5% Dodge; medium +20 Health +2 Defense −2% Dodge; heavy +35 Health +4 Defense −1 Speed.
const armour = (id, weight, rarity, name, stats, o = {}) => defItem(id, Object.assign({ name, slot: 'armor', weight, rarity, stats }, o));
armour('travellerscoat', 'light', 'common', 'Traveller’s Coat', { hp: 10, dodge: 5 }, { flavor: 'Patched at the elbows, dry at the collar.' });
armour('gravediggersleathers', 'light', 'fine', 'Gravedigger’s Leathers', { hp: 12, dodge: 6 }, {
  lines: [W('Below 50% health', '+6% more Dodge', 'feather')],
  fx: { dodge: (E, u) => (E.pct(u) < 0.5 ? 6 : 0) },
  flavor: 'Stiff with clay. It knows when to duck.',
});
armour('penitentsrags', 'light', 'fine', 'Penitent’s Rags', { hp: 6, dodge: 3 }, {
  lines: [B('Healing done +15%', 'cross'), X('Max health −8%', 'heart')],
  fx: Object.assign({ healOut: () => 1.15 }, maxHpCut(0.08)),
  flavor: 'Worn thin on purpose. Suffering sharpens the prayer.',
});
armour('shadowweave', 'light', 'rare', 'Shadowweave Cloak', { hp: 8, dodge: 12 }, {
  lines: [W('Each dodge', 'Restore 5 mana', 'mana'), X('Healing received −20%', 'cross')],
  fx: { dodged: (E, u) => E.mana(u, 5) > 0, healIn: () => 0.8 },
  flavor: 'Hard to see the edges of. Hard to see you in.',
});
armour('mothsilk', 'light', 'rare', 'Moth-silk Robe', { hp: 10, dodge: 4, mp: 12 }, {
  cost: { def: -2 },
  lines: [W('First 2 turns', '+2 Speed', 'boot')],
  fx: earlySpeed('mothsilk', 2),
  flavor: 'Woven by things that fly toward lanterns.',
});
armour('brigandine', 'medium', 'common', 'Brigandine', { hp: 20, def: 2, dodge: -2 }, { flavor: 'Iron plates riveted inside canvas. Ugly, honest.' });
armour('huntershauberk', 'medium', 'fine', 'Hunter’s Hauberk', { hp: 18, def: 2, crit: 3, dodge: -2 }, {
  lines: [W('Against beasts', '+10% damage', 'claw')],
  fx: { out: (E, u, t, p, c) => (direct(c) && (t.tags || []).includes('beast') ? 1.1 : 1) },
  flavor: 'Smells of the kennel. The rats can tell.',
});
armour('sellswordsjack', 'medium', 'fine', 'Sellsword’s Jack', { hp: 22, def: 2, dodge: -2 }, {
  lines: [W('In the front row', '+10% damage', 'sword', FRONT)],
  fx: { out: (E, u, t, p, c) => (direct(c) && u.row === 'front' ? 1.1 : 1) },
  flavor: 'Quilted, studded, and paid for in advance.',
});
armour('drownedmail', 'medium', 'rare', 'Drowned Mail', { hp: 25, def: 3, dodge: -2 }, {
  cost: { spd: -1 },
  lines: [B('Bleeding and Doom deal 50% less to the wearer', 'ward')],
  fx: { dotIn: (E, u, p, c) => (c.key === 'bleed' || c.key === 'doom' ? 0.5 : 1) },
  flavor: 'Green with the font’s water. Curses slide off it like rain.',
});
armour('thornmail', 'medium', 'rare', 'Thornmail', { hp: 20, def: 3, dodge: -4 }, {
  lines: [B('Melee attackers take 0.25× the wearer’s Power', 'thorns')],
  fx: { hurt: (E, u, src, p, c) => (!c.counter && direct(c) && c.sk && c.sk.range === 'melee' && src.alive && src.side !== u.side && u.alive ? !!E.counter(u, src, 0.25, { sure: true }) : false) },
  flavor: 'Every link ends in a hook.',
});
armour('rustedplate', 'heavy', 'common', 'Rusted Plate', { hp: 35, def: 4, spd: -1 }, { flavor: 'It squeaks. It holds.' });
armour('gravewardensplate', 'heavy', 'fine', 'Gravewarden’s Plate', { hp: 40, def: 5, spd: -1 }, {
  lines: [B('Fatigue gained −15%', 'fatigue', LATER_FATIGUE)], fatigue: 0.85,
  flavor: 'The Gravewarden never tired. Neither, quite, do you.',
});
armour('ashenplate', 'heavy', 'rare', 'Ashen Plate', { hp: 45, def: 6, spd: -1 }, {
  lines: [W('In the front row', '−15% damage taken', 'shield', FRONT), W('In the back row', '+15% damage taken', 'exposed', BACK, { cost: true })],
  fx: { taken: (E, u) => (u.row === 'front' ? 0.85 : 1.15) },
  flavor: 'Forged to stand in the gate, not to hide behind it.',
});
armour('bastionplate', 'heavy', 'rare', 'Bastion Plate', { hp: 55, def: 7, spd: -2 }, {
  lines: [W('While Guarding', 'A further −15% damage taken', 'shield')],
  fx: { taken: (E, u) => (u.st.guarding ? 0.85 : 1) },
  flavor: 'Built around one idea: nothing gets past.',
});
armour('penanceplate', 'heavy', 'rare', 'Penance Plate', { hp: 65, def: 5, spd: -1 }, {
  lines: [X('Healing received −30%', 'cross')],
  fx: { healIn: () => 0.7 },
  flavor: 'Lined with nails, points inward.',
});

// ═══════════════════════════════════════════════════════════════════ Accessories
// Common accessories are plain stats; the rest are effects (content spec: the first five Fine ones are the design's).
const accessory = (id, rarity, name, o = {}) => defItem(id, Object.assign({ name, slot: 'accessory', rarity }, o));
accessory('bonecharm', 'common', 'Bone Charm', { stats: { hp: 15 }, flavor: 'A knucklebone on a string. Better than nothing.' });
accessory('knucklebone', 'common', 'Knucklebone Die', { stats: { crit: 4 }, flavor: 'Loaded, a little.' });
accessory('haresfoot', 'common', 'Hare’s Foot', { stats: { dodge: 4 }, flavor: 'It wasn’t lucky for the hare.' });
accessory('prayerbeads', 'common', 'Prayer Beads', { stats: { mp: 10 }, flavor: 'Thirty-three beads, worn smooth.' });
accessory('vanguardsbadge', 'fine', 'Vanguard’s Badge', {
  lines: [W('In the front row', '+25% damage, but −1 Speed', 'sword', FRONT)],
  fx: { stat: u => { if (u.row === 'front') u.spd -= 1; }, out: (E, u, t, p, c) => (direct(c) && u.row === 'front' ? 1.25 : 1) },
  flavor: 'Given to the first through the breach. Few wore it long.',
});
accessory('lastbreath', 'fine', 'Last-breath Locket', {
  lines: [W('Below 30% health', '+40% damage', 'rage')],
  fx: { out: (E, u, t, p, c) => (direct(c) && E.pct(u) < 0.3 ? 1.4 : 1) },
  flavor: 'Holds a curl of hair and a reason not to fall.',
});
accessory('courierspur', 'fine', 'Courier’s Spur', { lines: [W('First 2 turns', '+6 Speed', 'boot')], fx: earlySpeed('courierspur', 6), flavor: 'The message always arrives. The horse, less often.' });
accessory('tallowcoin', 'fine', 'Tallow Coin', { lines: [W('On a kill', 'Restore 10 mana', 'mana')], fx: killMana(10), flavor: 'A coin cast in candle fat, for the ferryman’s light.' });
accessory('halberdiershook', 'fine', 'Halberdier’s Hook', {
  lines: [B('Melee skills work from the back row', 'claw'), W('Melee from the back row', '−30% damage', 'weak', BACK, { cost: true })],
  fx: {
    hook: (E, u) => u.row === 'back',
    out: (E, u, t, p, c) => (direct(c) && u.row === 'back' && c.sk && c.sk.range === 'melee' && !c.sk.reach && !c.counter ? 0.7 : 1),
  },
  flavor: 'The business end of a polearm, without the pole.',
});
accessory('duellistsring', 'fine', 'Duellist’s Ring', {
  lines: [W('At full health', '+15% damage', 'sword'), W('Below 50% health', '−10% damage', 'weak', null, { cost: true })],
  fx: { out: (E, u, t, p, c) => (!direct(c) ? 1 : u.hp >= u.maxHp ? 1.15 : E.pct(u) < 0.5 ? 0.9 : 1) },
  flavor: 'Won in a first-blood duel. The loser kept the finger.',
});
accessory('earstoppers', 'fine', 'Wax Ear-stoppers', {
  cost: { crit: -5 },
  lines: [B('Immune to Silenced and Dazzled', 'silence')],
  fx: { statusIn: (E, t, src, p, s) => (s.key === 'silenced' || s.key === 'dazzled' ? false : undefined) },
  flavor: 'Bellringers swear by them. Bellringers can’t hear you swear back.',
});
accessory('blessedbandage', 'fine', 'Blessed Bandage', { lines: [B('+30% Bleed resistance', 'bleed')], fx: { stat: u => { u.res.bleed += 30; } }, flavor: 'Wound by a nun who prayed over every turn.' });
accessory('saintsmedal', 'fine', 'Saint’s Medal', {
  lines: [B('+30% Curse resistance', 'doom'), X('Healing received −5%', 'cross')],
  fx: { stat: u => { u.res.curse += 30; }, healIn: () => 0.95 },
  flavor: 'Struck in the saint’s likeness. The saint looks tired.',
});
accessory('hobnailedboots', 'fine', 'Hobnailed Boots', {
  cost: { dodge: -3 },
  lines: [B('+25% Stun and Move resistance', 'stun')],
  fx: { stat: u => { u.res.stun += 25; u.res.move += 25; } },
  flavor: 'Iron studs. You stay where you’re put.',
});
accessory('ironboundcollar', 'rare', 'Ironbound Collar', {
  cost: { spd: -1 },
  lines: [B('Can’t be staggered or Stunned', 'stun')],
  fx: { statusIn: (E, t, src, p, s) => (s.key === 'stunned' ? false : undefined), noPush: () => true },
  flavor: 'Heavy enough to keep your head on straight.',
});
accessory('emberheart', 'rare', 'Ember Heart', {
  lines: [B('+15% damage', 'kindle'), X('Loses 3% of max health at the start of each turn', 'fire')],
  fx: { out: (E, u, t, p, c) => (direct(c) ? 1.15 : 1), turnStart: (E, u) => E.selfCost(u, u.maxHp * 0.03) > 0 },
  flavor: 'It beats. It burns. It is not yours.',
});
accessory('mournersveil', 'rare', 'Mourner’s Veil', {
  lines: [B('Fatigue gained −30%', 'fatigue', LATER_FATIGUE), X('Damage dealt −10%', 'weak')],
  fx: { out: (E, u, t, p, c) => (direct(c) ? 0.9 : 1) }, fatigue: 0.7,
  flavor: 'Grief is heavy. The veil carries some of it.',
});
accessory('gamblerscoin', 'rare', 'Gambler’s Coin', {
  lines: [B('Crits deal ×2.0 instead of ×1.6', 'star'), X('Hits that don’t crit deal −10%', 'weak')],
  // Every hit deals 0.9 and a crit's multiplier is raised to match, so a crit lands at ×2.0 and anything else at 0.9.
  fx: { out: (E, u, t, p, c) => (direct(c) ? 0.9 : 1), critX: () => 2 / 0.9 },
  flavor: 'Heads, they fall. Tails, you do.',
});
// Class-only accessories
const classOnly = (id, cls, name, o) => accessory(id, 'rare', name, Object.assign({ cls }, o));
classOnly('bloodcontract', 'sellsword', 'Blood Contract', {
  lines: [W('Each kill', '+10% Power for the rest of the battle, up to 3 times', 'sword'), X('Can’t be healed above 75% health', 'heart')],
  fx: {
    start: (E, u) => { u._contract = 0; u._contractPow = u.pow; },
    kill: (E, u) => { if ((u._contract || 0) >= 3) return; u._contract = (u._contract || 0) + 1; u.pow += (u._contractPow || u.pow) * 0.1; return true; },
    healCap: () => 0.75,
  },
  flavor: 'Signed in blood. The ink is still wet.',
});
classOnly('witchsknot', 'hexblade', 'Witch’s Knot', {
  lines: [B('Hex Swarm and Contagion cost 8 less', 'mana'), X('Harmful statuses on the Hexblade last 1 turn longer', 'curse')],
  fx: {
    cost: (E, u, sk, p, c) => { if (sk.id === 'hexswarm' || sk.id === 'contagion') { c.add -= 8; return true; } },
    statusIn: (E, t, src, p, s) => { if (s.turns < 90 && STATUSES[s.key] && STATUSES[s.key].time !== 'use') { s.turns += 1; return true; } },
  },
  flavor: 'Tied by a witch who didn’t want it untied.',
});
classOnly('fingerbone', 'pilgrim', 'Saint’s Finger-bone', {
  cost: { spd: -1 },
  lines: [B('Last Rites raises with 20% more health', 'holy')],
  fx: { used: (E, u, sk, p, c) => { if (sk.id !== 'rites') return; let n = 0; for (const t of c.targets || []) if (t.alive) n += E.heal(u, t, t.hp * 0.2, { raw: true }); return n > 0; } },
  flavor: 'It points the way to heaven. It points at you.',
});
classOnly('oathboundgorget', 'warden', 'Oathbound Gorget', {
  lines: [B('Guard and Cover cost 5 less', 'mana'), X('The Warden can’t leave the front row', 'anchor')],
  fx: {
    cost: (E, u, sk, p, c) => { if (sk.id === 'guard' || sk.id === 'cover') { c.add -= 5; return true; } },
    stat: u => { u.fixedFront = true; },
  },
  flavor: 'The oath is engraved inside, against the throat.',
});
classOnly('wickshears', 'lamplighter', 'Wick Shears', {
  lines: [B('Light the Way also Hastes the ally for 2 turns', 'haste'), X('Max health −15%', 'heart')],
  fx: Object.assign({ used: (E, u, sk, p, c) => { if (sk.id !== 'lighttheway') return; let n = 0; for (const t of c.targets || []) if (t.alive && E.status(u, t, 'hasted', { turns: 2 })) n++; return n > 0; } }, maxHpCut(0.15)),
  flavor: 'Trim the wick and the flame leaps.',
});
classOnly('blackbolts', 'crossbowman', 'Quiver of Black Bolts', {
  lines: [B('Aimed Shot also applies Bleeding (3 turns, 0.35×)', 'bleed'), X('Bolt −10% damage', 'arrow')],
  fx: {
    hit: (E, u, t, p, c) => (direct(c) && !c.counter && c.sk && c.sk.id === 'aimed' && t.alive ? E.status(u, t, 'bleed', { turns: 3, p: 0.35 }) : false),
    out: (E, u, t, p, c) => (direct(c) && c.sk && c.sk.id === 'bolt' && !c.counter ? 0.9 : 1),
  },
  flavor: 'Barbed, blackened, and never pulled out cleanly.',
});
classOnly('fencingglove', 'duellist', 'Fencing Glove', {
  cost: { spd: -1 },
  lines: [B('Challenge also leaves the Duellist Parrying 1 attack', 'parry')],
  fx: { used: (E, u, sk) => (sk.id === 'challenge' && u.alive ? E.status(u, u, 'parrying', { turns: 2, n: 1 }) : undefined) },
  flavor: 'Thrown down, picked up, worn ever since.',
});
classOnly('philosopherspebble', 'alchemist', 'Philosopher’s Pebble', {
  lines: [B('Quick Brew also Wards the ally, absorbing 1.0×', 'ward'), X('Max health −10%', 'heart')],
  fx: Object.assign({ used: (E, u, sk, p, c) => { if (sk.id !== 'quickbrew') return; let n = 0; for (const t of c.targets || []) if (t.alive && E.status(u, t, 'warded', { turns: 3, v: Math.round(u.pow) })) n++; return n > 0; } }, maxHpCut(0.1)),
  flavor: 'Not gold. Not yet.',
});
classOnly('surgeonsapron', 'surgeon', 'Surgeon’s Apron', {
  lines: [B('Cleanses cost 5 less', 'mana'), X('Healing the Surgeon receives −20%', 'cross')],
  fx: { cost: (E, u, sk, p, c) => { if (isCleanseSkill(sk)) { c.add -= 5; return true; } }, healIn: () => 0.8 },
  flavor: 'It was white once. Nobody remembers when.',
});
classOnly('bellrope', 'bellringer', 'Bell-rope', {
  lines: [B('Toll also Slows for 1 turn', 'slow'), X('Toll costs 5 more', 'mana')],
  fx: {
    hit: (E, u, t, p, c) => (direct(c) && !c.counter && c.sk && c.sk.id === 'toll' && t.alive ? E.status(u, t, 'slowed', { turns: 1 }) : false),
    cost: (E, u, sk, p, c) => { if (sk.id === 'toll') { c.add += 5; return true; } },
  },
  flavor: 'Cut from the tower when the bell came down.',
});
classOnly('phylactery', 'gravecaller', 'Phylactery', {
  cost: { spd: -1 },
  lines: [B('Thralls rise Fortified for 2 turns', 'fort')],
  fx: { thrall: (E, o, t) => { t.fort = Math.max(t.fort || 0, 2); return true; } },
  flavor: 'Something inside it is keeping count.',
});
classOnly('fencesledger', 'cutpurse', 'Fence’s Ledger', {
  lines: [B('Gold the Cutpurse steals +50%', 'coin'), X('The Cutpurse starts each battle Exposed for 1 turn', 'exposed')],
  fx: { stealMul: () => 1.5, start: (E, u) => E.status(u, u, 'exposed', { turns: 1, sure: true, raw: true }) },
  flavor: 'Every name in it owes somebody something.',
});

// ═══════════════════════════════════════════════════════════════════ Relics
// One per region's boss, dropped on the first clear. You can own only one of each.
defItem('gravediggersspade', {
  name: 'Gravedigger’s Spade', slot: 'accessory', rarity: 'relic', region: 0, boss: 'The Sexton',
  lines: [W('When an ally falls', 'Hasted and +20% damage for the rest of the battle', 'haste'), X('Fatigue gained +20%', 'fatigue', LATER_FATIGUE)], fatigue: 1.2,
  fx: {
    aFall: (E, o, t) => { if (!o.alive || o.spade || t === o || t.side !== o.side || t.thrall) return; o.spade = true; E.status(o, o, 'hasted', { turns: 99, sure: true }); return true; },
    out: (E, u, t, p, c) => (direct(c) && u.spade ? 1.2 : 1),
  },
  flavor: 'The Sexton’s own. It has dug for everyone you have lost.',
});
defItem('bishopscrozier', {
  name: 'Bishop’s Crozier', slot: 'weapon', type: 'censer', rarity: 'relic', region: 1, boss: 'The Drowned Bishop', stats: { pow: 8, mp: 15 },
  lines: [B('Last Rites costs 15 less and raises with 50% health', 'holy'), X('Each raise leaves the Pilgrim Doomed (3 turns, 0.4×)', 'doom')],
  fx: {
    cost: (E, u, sk, p, c) => { if (sk.id === 'rites') { c.add -= 15; return true; } },
    used: (E, u, sk, p, c) => {
      if (sk.id !== 'rites') return;
      let n = 0;
      for (const t of c.targets || []) if (t.alive && t.side === u.side) { if (t.hp < t.maxHp * 0.5) E.heal(u, t, t.maxHp * 0.5 - t.hp, { raw: true }); n++; if (u.alive) E.status(u, u, 'doom', { turns: 3, p: 0.4, sure: true, raw: true }); }
      return n > 0;
    },
  },
  flavor: 'The Bishop raised his flock with it, again and again, long after they should have stayed down.',
});
defItem('barkofoldgod', {
  name: 'Bark of the Old God', slot: 'armor', weight: 'medium', rarity: 'relic', region: 2, boss: 'The Antlered One', stats: { hp: 40, def: 4 },
  lines: [B('Heals 4% of max health at the start of each turn', 'heart'), X('Healing from others −50%', 'cross')],
  fx: {
    turnStart: (E, u) => E.heal(u, u, u.maxHp * 0.04, { raw: true }) > 0,
    healIn: (E, u, src) => (src && src !== u ? 0.5 : 1),
  },
  flavor: 'It grows over the wearer, slowly, and does not want to come off.',
});
defItem('marshalsblade', {
  name: 'Marshal’s Ashen Blade', slot: 'weapon', type: 'sword', rarity: 'relic', region: 3, boss: 'The Burnt Marshal', stats: { pow: 12 },
  lines: [B('Each hit also deals 25% of its damage to the other front-row foe', 'cleave'), X('Loses 2% of max health at the start of each turn', 'fire')],
  fx: {
    hit: (E, u, t, p, c) => {
      if (c.counter || c.dot || !c.d || c.splash) return;
      const o = E.foes(u).find(x => x !== t && x.row === 'front' && x.alive);
      if (!o) return;
      E.pure(u, o, c.d * 0.25, { hit: true });
      return true;
    },
    turnStart: (E, u) => E.selfCost(u, u.maxHp * 0.02) > 0,
  },
  flavor: 'It never cooled after the keep burned. Neither did the Marshal.',
});
defItem('hollowcrown', {
  name: 'The Hollow Crown', slot: 'accessory', rarity: 'relic', region: 4, boss: 'The Hollow King',
  lines: [B('Every stat +10%', 'boss'), X('Fatigue gained ×2', 'fatigue', LATER_FATIGUE)], fatigue: 2,
  fx: { stat: u => { for (const k of ['maxHp', 'maxMp', 'pow', 'def', 'spd', 'crit', 'dodge']) u[k] *= 1.1; } },
  flavor: 'Nothing inside it but a king’s idea of himself.',
});
const RELICS = ['gravediggersspade', 'bishopscrozier', 'barkofoldgod', 'marshalsblade', 'hollowcrown'];

// ═══════════════════════════════════════════════════════════════════ The model
const Items = (() => {
  let seq = 0;
  const def = x => GEAR[typeof x === 'string' ? x : x && x.id] || null;
  const uid = () => 'g' + Date.now().toString(36) + (++seq).toString(36) + Math.floor(Math.random() * 1296).toString(36);
  // A new piece: { uid, id, lv }.
  function make(id, lv = 1) {
    if (!GEAR[id]) return null;
    return { uid: uid(), id, lv: clamp(Math.round(lv) || 1, 1, 999) };
  }
  // Saved data, checked. slot: the slot it must fit, if any.
  function valid(x, slot) {
    if (!x || typeof x !== 'object' || !GEAR[x.id]) return null;
    if (slot && GEAR[x.id].slot !== slot) return null;
    const o = { uid: typeof x.uid === 'string' && x.uid ? x.uid : uid(), id: x.id, lv: clamp(Math.round(x.lv) || 1, 1, 999) };
    if (x.fresh) o.fresh = true;
    return o;
  }

  // ── what a piece gives
  const growth = lv => 1 + (Math.max(1, lv) - 1) / ITEM.GROWTH;
  const GROWS = ['hp', 'mp', 'pow', 'def'];
  // Plain stats at the piece's level, with the effect's fixed costs: { hp, mp, pow, def, spd, crit, dodge }.
  function stats(inst) {
    const D = def(inst), out = {};
    if (!D) return out;
    const g = growth(inst.lv || 1);
    for (const k in D.stats) out[k] = GROWS.includes(k) && D.stats[k] > 0 ? Math.round(D.stats[k] * g) : D.stats[k];
    for (const k in D.cost) out[k] = (out[k] || 0) + D.cost[k];
    return out;
  }
  const rarity = x => (def(x) ? def(x).rarity : 'common');
  // Its kind, for the card: "Rare weapon · sword", "Fine armour · light", "Rare accessory · Sellsword only".
  function kind(x) {
    const D = def(x);
    if (!D) return '';
    const r = RARITY_NAMES[D.rarity];
    if (D.slot === 'weapon') return `${r} weapon · ${WEAPON_TYPES[D.type].name.toLowerCase()}`;
    if (D.slot === 'armor') return `${r} armour · ${WEIGHT_NAMES[D.weight].toLowerCase()}`;
    return `${r} accessory · ${D.cls ? CLASSES[D.cls].name + ' only' : 'any class'}`;
  }
  // Who can use it: a weapon's type belongs to one class; a class-only accessory to its class.
  const usersOf = x => { const D = def(x); return !D ? [] : D.slot === 'weapon' ? [WEAPON_TYPES[D.type].cls] : D.cls ? [D.cls] : CLASS_ORDER.slice(); };
  function canUse(c, x) {
    const D = def(x);
    if (!D || !c) return false;
    if (D.slot === 'weapon') return c.classes.includes(WEAPON_TYPES[D.type].cls);
    if (D.cls) return c.classes.includes(D.cls);
    return true;
  }
  // Why a character can't use it, in a sentence.
  function whyNot(c, x) {
    const D = def(x);
    if (!D || canUse(c, x)) return '';
    const many = n => (n.endsWith('man') ? n.slice(0, -3) + 'men' : n + 's');
    const who = usersOf(x).map(k => many(CLASSES[k].name)), mine = c.classes.map(k => many(CLASSES[k].name));
    if (D.slot === 'weapon') return `${mine.join(' and ')} can’t use ${WEAPON_TYPES[D.type].plural.toLowerCase()}. ${who.join(' and ')} can.`;
    return `Only a ${who[0]} can wear it.`;
  }

  // ── the battle's view of a character's gear (Hero.spec)
  const worn = c => SLOTS.map(k => c.gear && c.gear[k]).filter(x => x && GEAR[x.id]);
  // Plain stats from everything worn. Plate-born (the Warden's passive) lowers heavy armour's Speed cost and, awakened,
  // adds 10% to its health.
  function gearStats(c) {
    const out = { hp: 0, mp: 0, pow: 0, def: 0, spd: 0, crit: 0, dodge: 0 };
    for (const x of worn(c)) {
      const s = stats(x), D = def(x);
      if (D.slot === 'armor' && D.weight === 'heavy' && c.skills && c.skills.plateborn) {
        const p = skillLevel(c.skills.plateborn, (c.awakened || []).includes('plateborn'));
        if (s.spd < 0) s.spd = Math.min(0, s.spd + p.n([1, 2]));
        if (p.A && s.hp > 0) s.hp = Math.round(s.hp * 1.1);
      }
      for (const k in s) out[k] = (out[k] || 0) + s[k];
    }
    return out;
  }
  // The effects worn, as the simulation reads them: item ids.
  const effects = c => worn(c).map(x => x.id).filter(id => GEAR[id].fx);
  // How the sprite looks: [weapon id, armour id, accessory id], each or null.
  const look = c => SLOTS.map(k => (c.gear && c.gear[k] && GEAR[c.gear[k].id] ? c.gear[k].id : null));
  // Fatigue gained × this, from what is worn (js/rest.js).
  const fatigueMul = c => worn(c).reduce((m, x) => m * (def(x).fatigue || 1), 1);
  // The Oathbound Gorget keeps its wearer in the front row (the formation and the Move action, build step 5).
  const fixedFront = c => worn(c).some(x => x.id === 'oathboundgorget');

  // ── loot
  // The rarity odds for a region (0–4) and a stage's rank: { common, fine, rare } in percent.
  function odds(region, rank = 'normal') {
    const r = ITEM.RATES[clamp(region | 0, 0, ITEM.RATES.length - 1)], sh = Math.min(r[0], ITEM.RANK_SHIFT[rank] || 0);
    return { common: r[0] - sh, fine: r[1], rare: r[2] + sh };
  }
  const pickW = (rng, entries) => { const tot = entries.reduce((a, [, w]) => a + w, 0); let x = rng() * tot; for (const [k, w] of entries) { if ((x -= w) < 0) return k; } return entries[entries.length - 1][0]; };
  // A random piece from a stage of this level, in this region (0–4).
  // o: { rank: 'normal' | 'elite' | 'boss', classes: class ids on the roster (weapons and class-only accessories follow
  //      them, weighted by how many of each; every class when left out), slot, rarity (to force either) }
  function roll(level, region, rng = Math.random, o = {}) {
    const od = odds(region, o.rank);
    const rar = o.rarity || pickW(rng, [['common', od.common], ['fine', od.fine], ['rare', od.rare]]);
    const slot = o.slot || pickW(rng, Object.entries(ITEM.SLOT_ODDS));
    const classes = (o.classes && o.classes.length ? o.classes : CLASS_ORDER).filter(k => CLASSES[k]);
    let pool;
    if (slot === 'weapon') {
      const cls = classes[Math.floor(rng() * classes.length)];
      pool = GEAR_ORDER.filter(id => GEAR[id].slot === 'weapon' && GEAR[id].rarity === rar && GEAR[id].type === WEAPON_OF[cls]);
    } else if (slot === 'armor') pool = GEAR_ORDER.filter(id => GEAR[id].slot === 'armor' && GEAR[id].rarity === rar);
    else pool = GEAR_ORDER.filter(id => GEAR[id].slot === 'accessory' && GEAR[id].rarity === rar && (!GEAR[id].cls || classes.includes(GEAR[id].cls)));
    if (!pool.length) pool = GEAR_ORDER.filter(id => GEAR[id].slot === slot && GEAR[id].rarity === rar);
    const inst = make(pool[Math.floor(rng() * pool.length)], level);
    inst.fresh = true;
    return inst;
  }
  // The Common weapon a recruit carries.
  function starter(cls, lv = 1) {
    const id = GEAR_ORDER.find(k => GEAR[k].slot === 'weapon' && GEAR[k].rarity === 'common' && GEAR[k].type === WEAPON_OF[cls]);
    return id ? make(id, lv) : null;
  }

  // ── the Bag and selling (state: Save.state)
  const bag = state => state.inventory.items;
  const room = state => ITEM.BAG - bag(state).length;
  function everything(state) {
    const out = bag(state).slice();
    for (const c of state.roster) for (const x of worn(c)) out.push(x);
    return out;
  }
  const owns = (state, id) => everything(state).some(x => x.id === id);
  // What a piece sells for: gold by rarity × S (S = 1 + level ÷ 5), and the Cutpurse's Fence in the party adds to it.
  // Relics don't sell.
  function sellPrice(x, state) {
    const D = def(x);
    if (!D || D.rarity === 'relic') return 0;
    let k = 1;
    if (state) for (const id of state.party || []) {
      const c = id && state.roster.find(r => r.id === id);
      if (c && c.skills && c.skills.fence && typeof SKILLS !== 'undefined' && SKILLS.fence) k = Math.max(k, 1 + skillLevel(c.skills.fence, false).v([0.1, 0.3]));
    }
    return Math.max(1, Math.round(ITEM.SELL[D.rarity] * (1 + (x.lv || 1) / 5) * k));
  }
  // A new piece goes into the Bag. When the Bag is full it is sold where it dropped: { added } or { sold: gold }.
  // A Relic always finds room.
  function add(state, x) {
    if (!x || !GEAR[x.id]) return { added: false };
    if (rarity(x) === 'relic' || room(state) > 0) { bag(state).push(x); return { added: true, item: x }; }
    const g = sellPrice(x, state);
    state.currencies.gold += g;
    return { added: false, sold: g, item: x };
  }
  // A boss's Relic on its first clear: given once, never again.
  function grantRelic(state, id) {
    if (!GEAR[id] || GEAR[id].rarity !== 'relic' || owns(state, id)) return null;
    const x = make(id, 1);
    x.fresh = true;
    add(state, x);
    return x;
  }
  const relicOf = region => RELICS[region] || null;
  function sell(state, uid) {
    const i = bag(state).findIndex(x => x.uid === uid);
    if (i < 0) return 0;
    const x = bag(state)[i], g = sellPrice(x, state);
    if (!g) return 0;
    bag(state).splice(i, 1);
    state.currencies.gold += g;
    return g;
  }
  // Where a piece is: { where: 'bag' } or { where: 'worn', c, slot }.
  function find(state, uid) {
    if (bag(state).some(x => x.uid === uid)) return { where: 'bag', item: bag(state).find(x => x.uid === uid) };
    for (const c of state.roster) for (const k of SLOTS) if (c.gear[k] && c.gear[k].uid === uid) return { where: 'worn', c, slot: k, item: c.gear[k] };
    return null;
  }
  // Puts a piece on a character, from the Bag or from another character. What they wore goes to the Bag (or back to
  // the other character, as a swap).
  function equip(state, c, uid) {
    const f = find(state, uid);
    if (!f || !canUse(c, f.item)) return false;
    const slot = def(f.item).slot, old = c.gear[slot];
    if (f.where === 'worn' && f.c === c) return true;
    if (f.where === 'bag') {
      bag(state).splice(bag(state).indexOf(f.item), 1);
      delete f.item.fresh;
      if (old) bag(state).push(old);
    } else {
      f.c.gear[f.slot] = old && canUse(f.c, old) ? old : null;
      if (old && !f.c.gear[f.slot]) bag(state).push(old);
    }
    c.gear[slot] = f.item;
    return true;
  }
  // Takes a piece off into the Bag. A full Bag still takes it: 60 is where drops start selling, not a wall.
  function unequip(state, c, slot) {
    const x = c.gear[slot];
    if (!x) return false;
    c.gear[slot] = null;
    bag(state).push(x);
    return true;
  }

  // ── what the card says: the bands Always, Costs and When
  // where: { row } for checking row conditions. Returns { good: [{ icon, text, later }], bad: [...], when: [{ tag, icon,
  // text, on, cost, later }] }.
  function bands(x, where) {
    const D = def(x), s = stats(x), out = { good: [], bad: [], when: [] };
    const fmtS = (k, v) => `${v > 0 ? '+' : '−'}${Math.abs(k === 'spd' ? Math.round(v * 10) / 10 : Math.round(v))}${k === 'crit' || k === 'dodge' ? '%' : ''} ${GEAR_STAT_NAMES[k]}`;
    for (const k of STAT_ORDER) if (s[k]) (s[k] > 0 ? out.good : out.bad).push({ icon: GEAR_STAT_ICONS[k], text: fmtS(k, s[k]), stat: k });
    for (const l of D.lines) {
      const o = l.o || {};
      if (l[0] === '+') out.good.push({ icon: l[2], text: l[1], later: o.later });
      else if (l[0] === '-') out.bad.push({ icon: l[2], text: l[1], later: o.later });
      else { const on = l[4] ? l[4](where) : undefined; out.when.push({ tag: l[1], text: l[2], icon: l[3], on, cost: !!o.cost, later: o.later }); }
    }
    return out;
  }
  // A rough worth, for the ▲ ▼ marks against what's worn: plain stats, plus a little for each effect and its rarity.
  function score(x) {
    const s = stats(x), D = def(x);
    if (!D) return 0;
    const w = { hp: 0.1, mp: 0.15, pow: 1, def: 0.8, spd: 2.5, crit: 0.35, dodge: 0.35 };
    let n = 0;
    for (const k in s) n += (w[k] || 0) * s[k];
    return n + { common: 0, fine: 1, rare: 2, relic: 4 }[D.rarity];
  }
  return {
    make, valid, def, stats, rarity, kind, usersOf, canUse, whyNot, worn, gearStats, effects, look, fatigueMul, fixedFront, odds, roll, starter,
    room, everything, owns, sellPrice, add, grantRelic, relicOf, sell, find, equip, unequip, bands, score, uid,
  };
})();
const STAT_ORDER = ['pow', 'hp', 'def', 'mp', 'spd', 'crit', 'dodge'];
