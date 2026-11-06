'use strict';
// Lantern Road · the glossary: every term a player meets, defined once (onboarding spec §7, §8 and §10).
// Tooltips, the Codex (the book on the Hearth's dock) and Old Wick all read from this one table. It is also the naming
// list: every name a player sees, in one place, to review and rename in a single pass.
// docs/glossary.md is generated from it by `node tools/glossary.js`, which also checks it against the game's own tables.
// It is plain data: it needs no other file, touches no page, and nothing reads it yet.
//
// ── An entry: GLOSSARY[id]
//   id      its key, repeated on the entry
//   name    what the screen calls it
//   icon    a UI_ICONS key (js/art.js, plus the ones js/camp.js and js/rules.js add), or null where none fits
//   line    the tooltip card: one sentence, at most 14 words, plain and warm
//   more    optional, at most two short sentences: the Codex page adds them under the line
//   topic   the Codex topic, one of: the basics, battle, rules, heroes, gear, the Hearth, the road, statuses, resources
//   see     optional: the ids of related entries, for the Codex's "See also"
//
// ── Ids
// Most ids are short words. Where a term mirrors a game table, the id is that table's key, so a screen can look it up
// from the key it already holds:
//   STATUSES → st_<key>   RESISTS → res_<key>   CONDITIONS → cond_<key>
//   BUILDINGS, MATERIALS, ITEMS (party items), STAT_LABELS, RARITY_NAMES and SLOT_NAMES → their own keys as they are
// A condition's name is its rules-editor label, with N for the number you choose and [status], [kind] or [item] for
// the choice it offers.
// docs/glossary.md maps each one-line battle tip (TIPS in js/main.js) to the entry it should open.
//
// ── Names
// The names are the ones decided on 2026-11-04, even where the game still shows an older one. docs/glossary.md lists
// them under Decided names, with where each old name still appears, and tools/glossary.js reports them as pending
// renames until the game's rename pass lands.

const GLOSSARY = (() => {
  const G = {};
  const topic = (name, entries) => { for (const id in entries) G[id] = Object.assign({ id, topic: name }, entries[id]); };

  // ═══════════════════════════════════════════════════════════════════ the basics
  topic('the basics', {
    hero: { name: 'Hero', icon: 'helm', line: 'One of your lantern-bearers, who keeps their levels, skills and gear for good.', more: 'Heroes never die. One who falls in battle is back on their feet when it ends.', see: ['class', 'party', 'roster'] },
    party: { name: 'Party', icon: 'helm', line: 'Up to six heroes who set out together: two in front, four behind.', more: 'Early stages want fewer heroes, since you start with one.', see: ['formation', 'front_row', 'back_row'] },
    foe: { name: 'Foe', icon: 'skull', line: 'Whatever stands against your party on the road; each region has its own.', more: 'Tap a foe on the stage sheet for its stats, skills and resistances.', see: ['elite', 'boss', 'undead', 'spirit', 'beast'] },
    hearth: { name: 'The Hearth', icon: 'tent', line: 'Your home: the fire, your heroes and the buildings in a ring around them.', more: 'Heroes rest here between trips, even while the app is closed. The Hearth button brings you back.', see: ['fire', 'plot', 'renown'] },
    road: { name: 'The Lantern Road', icon: 'lantern', line: 'The way through five regions of stages, lit one lantern at a time.', more: 'Each cleared stage burns on the map, so you can see how far your light reaches.', see: ['region', 'stage', 'trip'] },
    battle: { name: 'Battle', icon: 'cleave', line: 'Your party against a stage’s foes, fought on its own while you watch.', more: 'You win by preparing: the formation, the rules, the skills and the gear. Speed it up, or skip it, any time.', see: ['turn', 'rule', 'skip'] },
    wick: { name: 'Old Wick', icon: 'lantern', line: 'The innkeeper at the fire, who knows the road and shows you the way.', more: 'Tap him at the fire for a hint, and to hear any lesson again.', see: ['codex', 'hearth'] },
    codex: { name: 'Codex', icon: 'book', line: 'The book on the Hearth’s dock: how battles work, and every term and foe.', more: 'Foes you haven’t met and gear you haven’t found show as silhouettes.', see: ['wick'] },
    // Bess and her quests (js/quests.js, docs/first-session-spec.md §4); "jobs" is her word for quests
    bess: { name: 'Bess', icon: 'scroll', line: 'The carter by the road out of the Hearth, with quests for your company.', more: 'She drives the carts that carry travellers on the road you’ve cleared. Tap her for her quests.', see: ['quests', 'jobs'] },
    quests: { name: 'Quests', icon: 'scroll', line: 'Bess’s work for your company: a goal on the road, and pay for it.', more: 'Accept one on her panel, and claim what it pays there once it’s done.', see: ['bess', 'gravedigger', 'jobs'] },
    gravedigger: { name: 'The Gravedigger', icon: 'skull', line: 'Bess’s first quest: defeat the Sexton at 1-18, for the travellers.', more: 'The travellers pay with the Toll House plan.', see: ['quests', 'tollhouse', 'gravefields'] },
    jobs: { name: 'Jobs', icon: 'hourglass', line: 'Three small quests from Bess each day, each paying gold and a material.', more: 'New ones come at midnight. Do all three for a gear roll and a party item.', see: ['bess', 'quests', 'gear_roll'] },
  });

  // ═══════════════════════════════════════════════════════════════════ battle
  topic('battle', {
    turn: { name: 'Turn', icon: 'hourglass', line: 'A hero or foe’s moment to act; faster ones get more turns.', more: 'Each turn a hero takes adds 1 fatigue.', see: ['spd', 'turn_order', 'fatigue'] },
    round: { name: 'Round', icon: 'hourglass', line: 'The battle’s clock: anyone with Speed 10 acts once a round.', see: ['turn', 'enrage', 'spd'] },
    turn_order: { name: 'Turn order', icon: 'hourglass', line: 'The banners along the top: who acts next, and the skill each will use.', more: 'The first banner is the turn being played, and it names the rule that chose it.', see: ['turn', 'rule'] },
    basic_attack: { name: 'Basic attack', icon: 'sword', line: 'A free attack that restores mana, used whenever no rule fits.', more: 'Every class has its own.', see: ['mp', 'rule', 'active_skill'] },
    formation: { name: 'Formation', icon: 'shield', line: 'Who stands where: two slots in the front row, four in the back.', more: 'Sturdy heroes in front, the rest behind. Slots can be left empty.', see: ['front_row', 'back_row', 'party'] },
    front_row: { name: 'Front row', icon: 'shield', line: 'The two slots nearest the foes; melee attacks must hit here first.', more: 'While anyone stands in the front row, melee attacks can’t reach the back.', see: ['back_row', 'melee', 'guard'] },
    back_row: { name: 'Back row', icon: 'arrow', line: 'The four slots behind, out of melee’s reach while the front row stands.', more: 'Ranged attacks, magic and skills with reach can still hit it.', see: ['front_row', 'ranged', 'reach'] },
    melee: { name: 'Melee', icon: 'claw', line: 'Close-up attacks, which must hit the front row while anyone stands there.', more: 'A melee skill without reach can’t be used from the back row.', see: ['reach', 'front_row'] },
    ranged: { name: 'Ranged', icon: 'arrow', line: 'Attacks from afar, which can reach any foe in either row.', see: ['magic', 'back_row'] },
    magic: { name: 'Magic', icon: 'orb', line: 'Spells, which reach anyone in either row, as ranged attacks do.', see: ['ranged', 'back_row'] },
    reach: { name: 'Reach', icon: 'claw', line: 'Lets a melee skill hit any row, and be used from either.', see: ['melee', 'back_row'] },
    shape: { name: 'Shape', icon: 'mark', line: 'Who a skill hits: one foe, a row, all foes, allies or itself.', more: 'The eight: one foe, the front row, the back row, 3 random foes, all foes, one ally, all allies and self. A row skill hits the other row when its own is empty.', see: ['front_row', 'back_row'] },
    guard: { name: 'Guard', icon: 'shield', line: 'Draws attacks aimed at a single ally onto the one guarding, for less damage.', more: 'Hits on a whole row or every ally still land where they fall. Cover goes further and takes those too.', see: ['st_guarding', 'st_covered'] },
    enrage: { name: 'Enrage', icon: 'rage', line: 'From round 15 the foes hit harder every round, so no battle drags on.', more: 'Each round of enrage adds 25% to their damage, and from round 40 it doubles every round too, and breaks through Unbroken.', see: ['round', 'cond_enraged'] },
    fallen: { name: 'Fallen', icon: 'skull', line: 'At 0 health a hero falls, and is out of the fight.', more: 'They’re back on their feet after the battle, at full health. Smelling Salts raise them sooner.', see: ['hp', 'salts', 'cond_ally_fallen'] },
    called_foe: { name: 'Called foe', icon: 'bone', line: 'A foe called into battle by another; it drops no gold, XP or loot.', more: 'Beat the one calling them, and the calls stop.', see: ['foe', 'loot'] },
    step_up: { name: 'Step Up', icon: 'boot', line: 'A melee foe waiting behind steps forward when a front slot opens.', more: 'The stage sheet marks these foes “waits”.', see: ['melee', 'front_row'] },
    wanderer: { name: 'Wandering foe', icon: 'boot', line: 'A stray that sometimes joins a stage you replay.', more: 'The Moth Swarm and the Cage Mimic wander. The Mimic runs at round 6, and drops better gear if it falls first.', see: ['farm'] },
    phase: { name: 'Phase', icon: 'rage', line: 'A boss changes how it fights once its health falls past a mark.', more: 'Each change comes once, with a callout, and the stage sheet lists them.', see: ['boss'] },
    thrall: { name: 'Thrall', icon: 'bone', line: 'A bone servant the Gravecaller raises to fight beside the party.', more: 'Rules ignore thralls, they build no fatigue, and they crumble when the battle ends. Usually two can stand at once.', see: ['cond_self_thralls_lt', 'st_anchor'] },
    splash: { name: 'Splash', icon: 'burst', line: 'Part of a heavy blow spills onto the other hero in the front row.', more: 'The Burnt Marshal’s blade splashes a quarter of each blow.', see: ['front_row'] },
    lured: { name: 'Lured', icon: 'lantern', line: 'A foe pulled a hero out of the back row and into the front.', more: 'Move resistance holds a hero in place, and the Move action walks them back.', see: ['res_move', 'move'] },
    mana_drain: { name: 'Mana drain', icon: 'mana', line: 'Some foes steal a hero’s mana, and some heal themselves with it.', see: ['mp', 'lampoil'] },
    regenerating: { name: 'Regenerating', icon: 'heart', line: 'Heals a little at the start of every turn: hit it hard and fast.', see: ['foe'] },
    undead: { name: 'Undead', icon: 'skull', line: 'Risen dead, who barely bleed and shrug off some poison and fire.', more: 'They have +40% Bleed resistance and +20% Blight. “Foe: Undead” lets rules pick them out.', see: ['res_bleed', 'res_blight', 'cond_foe_tag'] },
    spirit: { name: 'Spirit', icon: 'eye', line: 'Ghostly foes: hard to bleed or move, but curses bite deep.', more: 'They have +60% Bleed and +40% Move resistance, but −20% Curse.', see: ['res_curse', 'cond_foe_tag'] },
    beast: { name: 'Beast', icon: 'claw', line: 'Animal foes, a little easier to make bleed or stun.', more: 'They have −10% Bleed and Stun resistance.', see: ['res_bleed', 'res_stun', 'cond_foe_tag'] },
    battle_speed: { name: 'Battle speed', icon: 'hourglass', line: 'Watch a battle at 1×, 2× or 4×.', more: 'Pause, then Turn plays one turn at a time.', see: ['skip'] },
    skip: { name: 'Skip', icon: 'haste', line: 'Jump straight to a battle’s end; it turns out just as if you’d watched.', see: ['battle_speed', 'report'] },
    report: { name: 'Report', icon: 'scroll', line: 'How a battle went: damage, healing, and how often each rule fired.', more: 'After a loss it leads with the stage’s hint.', see: ['hint', 'rule'] },
    party_items: { name: 'Party items', icon: 'flask', line: 'Draughts, salts, oil and tinctures, used in battle without costing anyone a turn.', more: 'Tap one in battle to use it, or let a party rule use it for you. Nothing refills for free.', see: ['loadout', 'party_rules', 'draught'] },
    loadout: { name: 'Loadout', icon: 'bag', line: 'The party items packed for a battle: one per slot, each used once.', more: 'It draws from the Bag. You start with 2 slots, and the Tactician adds up to 2 more.', see: ['party_items', 'bag', 'tactician'] },
    draught: { name: 'Healing Draught', icon: 'flask', line: 'Restores 40% of one ally’s health.', more: 'One waits by the fire every 4 hours, up to 3.', see: ['party_items', 'fire'] },
    salts: { name: 'Smelling Salts', icon: 'salts', line: 'A fallen ally gets back up with 30% health.', see: ['party_items', 'fallen'] },
    lampoil: { name: 'Lamp Oil', icon: 'oil', line: 'Every ally gains 20 mana.', see: ['party_items', 'mp'] },
    tincture: { name: 'Bitter Tincture', icon: 'tincture', line: 'Removes every harmful status from one ally.', see: ['party_items', 'cleanse'] },
  });

  // ═══════════════════════════════════════════════════════════════════ rules
  topic('rules', {
    tactics: { name: 'Tactics', icon: 'book', line: 'Where you set each hero’s rules, the party rules and the loadout.', more: 'It opens with the first clear of 1-1.', see: ['rule', 'party_rules', 'loadout'] },
    rule: { name: 'Rule', icon: 'scroll', line: 'A “when this, do that” order a hero follows in battle.', more: 'On each turn a hero reads their rules from the top and uses the first that is true and possible. If none fits, they use their basic attack.', see: ['condition', 'action', 'rule_slot'] },
    rule_slot: { name: 'Rule slot', icon: 'scroll', line: 'Room for one rule; every hero starts with 3.', more: 'The Masters’ Hall teaches more, up to each class’s most.', see: ['rule', 'mastershall'] },
    condition: { name: 'Condition', icon: 'scroll', line: 'The “when” half of a rule, like “Self: health below 50%”.', more: 'You start with a few. First clears and the Tactician teach the rest.', see: ['rule', 'action', 'tactician'] },
    action: { name: 'Action', icon: 'check', line: 'The “do” half of a rule: a skill the hero has equipped, or Defend.', more: 'Move and Gather join them once the Tactician teaches them. Party rules use party items, Focus fire or Return to the Hearth instead.', see: ['rule', 'defend', 'move', 'gather'] },
    party_rules: { name: 'Party rules', icon: 'scroll', line: 'A few rules for the whole team, checked between every two turns.', more: 'They use party items, pick one target for everyone, or decide when a trip comes home.', see: ['party_rule_slot', 'focus_fire', 'between_battles'] },
    party_rule_slot: { name: 'Party rule slot', icon: 'scroll', line: 'Room for one party rule; you start with 2, and the Tactician adds more.', more: 'Up to 5 in all.', see: ['party_rules', 'tactician'] },
    between_battles: { name: 'Between battles', icon: 'lantern', line: 'Party rules checked after each win on a trip, never during a battle.', more: 'Their action is Return to the Hearth. The stage sheet’s “Return when…” chips are these rules.', see: ['return_to_hearth', 'return_when', 'trip'] },
    focus_fire: { name: 'Focus fire', icon: 'mark', line: 'Every hero attacks this foe, unless their own rule picked a target.', see: ['party_rules'] },
    return_to_hearth: { name: 'Return to the Hearth', icon: 'lantern', line: 'The party heads home to the Hearth once the battle under way ends.', more: 'A party rule can call it between battles, and the Hearth button calls it by hand.', see: ['between_battles', 'return_when', 'hearth'] },
    defend: { name: 'Defend', icon: 'brace', line: 'Brace for 30% less damage until the next turn, and regain mana.', more: 'Every hero can Defend. A hero who can’t reach anyone from the back row Defends instead.', see: ['st_braced', 'action'] },
    move: { name: 'Move', icon: 'boot', line: 'Swap places with the nearest ally in the other row; it uses the turn.', more: 'Or step into an empty slot there. The Tactician’s Lesson I teaches it.', see: ['front_row', 'back_row', 'lured'] },
    gather: { name: 'Gather', icon: 'mana', line: 'Skip the attack and restore twice a basic attack’s mana.', more: 'The Tactician’s Lesson II teaches it.', see: ['mp', 'basic_attack'] },
    rule_set: { name: 'Rule set', icon: 'book', line: 'Every hero’s rules, the party rules and the loadout, saved under one name.', more: 'Switch sets for different stages. The stage sheet remembers the one you last chose there.', see: ['tactics', 'lesson_i'] },
    lesson_i: { name: 'Lesson I', icon: 'book', line: 'The Tactician’s first lesson, from 1-11: conditions, Move, Focus fire and rule sets.', more: 'It teaches a dozen conditions and every health and mana step from 25% to 90%, and brings the Tactician’s blueprint.', see: ['tactician', 'condition', 'rule_set'] },

    // Conditions, in the rules editor's order: self, ally, foe, battle, between battles
    cond_always: { name: 'Always', icon: 'check', line: 'Always true, so it belongs last, as a fallback.', see: ['condition'] },
    cond_self_hp_lt: { name: 'Self: health below N%', icon: 'heart', line: 'True while this hero’s health is below the number you set.', more: 'You start with 50%. Lesson I teaches the rest, from 25% to 90%.', see: ['hp', 'condition'] },
    cond_self_hp_gt: { name: 'Self: health above N%', icon: 'heart', line: 'True while this hero’s health is above the number you set.', see: ['hp'] },
    cond_self_mp_lt: { name: 'Self: mana below N%', icon: 'mana', line: 'True while this hero’s mana is below the number you set.', see: ['mp', 'gather'] },
    cond_self_front: { name: 'Self: in the front row', icon: 'shield', line: 'True while this hero stands in the front row.', see: ['front_row'] },
    cond_self_back: { name: 'Self: in the back row', icon: 'arrow', line: 'True while this hero stands in the back row.', see: ['back_row'] },
    cond_self_has: { name: 'Self: has [status]', icon: 'mark', line: 'True while this hero has that status.', see: ['status'] },
    cond_self_without: { name: 'Self: without [status]', icon: 'mark', line: 'True while this hero lacks that status: handy for keeping one going.', see: ['status'] },
    cond_self_thralls_lt: { name: 'Self: fewer than N thralls', icon: 'bone', line: 'True while the party has fewer thralls standing than this.', see: ['thrall'] },
    cond_ally_hp_lt: { name: 'Ally: health below N%', icon: 'heart', line: 'Picks the most hurt ally below the number you set; the hero counts too.', more: 'You start with 50%. Lesson I teaches the rest, from 25% to 90%.', see: ['hp', 'draught'] },
    cond_ally_hurt: { name: 'Ally: most hurt', icon: 'heart', line: 'Picks the ally with the lowest share of their health.', see: ['hp'] },
    cond_ally_fallen: { name: 'Ally: fallen', icon: 'skull', line: 'True when an ally has fallen, for skills that raise them.', see: ['fallen', 'salts'] },
    cond_ally_has: { name: 'Ally: [status]', icon: 'mark', line: 'Picks an ally who has that status.', more: '“Ally: Marked” finds the hero a foe is charging at.', see: ['st_marked', 'status'] },
    cond_ally_without: { name: 'Ally: not [status]', icon: 'mark', line: 'Picks an ally who doesn’t have that status yet.', see: ['status'] },
    cond_ally_mp_lt: { name: 'Ally: mana below N%', icon: 'mana', line: 'Picks the ally lowest on mana, below the number you set.', see: ['mp', 'lampoil'] },
    cond_ally_top_pow: { name: 'Ally: highest Power', icon: 'sword', line: 'Picks the ally who hits hardest.', see: ['pow'] },
    cond_front_foe: { name: 'Front foe', icon: 'sword', line: 'Picks the nearest foe in the front row.', see: ['front_row'] },
    cond_foe_lowest: { name: 'Foe: lowest health', icon: 'heart', line: 'Picks the foe with the least health left.', see: ['hp'] },
    cond_foe_hp_lt: { name: 'Foe: health below N%', icon: 'heart', line: 'Picks the most hurt foe below the number you set.', see: ['hp'] },
    cond_foe_highest: { name: 'Foe: highest health', icon: 'heart', line: 'Picks the foe with the most health left.', see: ['hp'] },
    cond_foe_highest_pow: { name: 'Foe: highest Power', icon: 'sword', line: 'Picks the foe that hits hardest.', see: ['pow'] },
    cond_foe_charging: { name: 'Foe: charging a big attack', icon: 'charge', line: 'Picks a foe gathering a big attack, so you can answer it.', see: ['st_charging', 'st_marked'] },
    cond_foe_tag: { name: 'Foe: [kind]', icon: 'skull', line: 'Picks an undead, spirit or beast foe, whichever you choose.', more: 'Each kind is taught by a different region’s first clears.', see: ['undead', 'spirit', 'beast'] },
    cond_foe_back: { name: 'Foe: in the back row', icon: 'arrow', line: 'Picks a foe standing in the back row.', see: ['back_row', 'reach'] },
    cond_foe_boss: { name: 'Foe: boss or elite', icon: 'boss', line: 'Picks a boss or elite, the boss first.', see: ['boss', 'elite'] },
    cond_foe_healer: { name: 'Foe: healer', icon: 'cross', line: 'Picks a foe that heals its side.', see: ['foe'] },
    cond_foe_next: { name: 'Foe: acts next', icon: 'hourglass', line: 'Picks the foe whose turn comes soonest.', see: ['turn_order'] },
    cond_leader_target: { name: 'Foe: the leader’s target', icon: 'mark', line: 'Picks the foe your party leader last attacked.', more: 'The leader is the first hero still standing.', see: ['focus_fire'] },
    cond_foe_has: { name: 'Foe: has [status]', icon: 'mark', line: 'Picks a foe that has that status.', see: ['status'] },
    cond_foe_without: { name: 'Foe: not [status]', icon: 'mark', line: 'Picks a foe that doesn’t have that status yet.', see: ['status'] },
    cond_foes_at_least: { name: 'N or more foes', icon: 'skull', line: 'True while at least this many foes stand.', see: ['shape'] },
    cond_one_foe: { name: 'One foe left', icon: 'skull', line: 'True when a single foe is left standing.' },
    cond_boss_present: { name: 'Boss present', icon: 'boss', line: 'True while a boss is in the battle.', see: ['boss'] },
    cond_battle_start: { name: 'Battle start', icon: 'hourglass', line: 'True during the first round.', see: ['round'] },
    cond_enraged: { name: 'Foes enraged', icon: 'rage', line: 'True once the foes are enraged and hit harder every round.', see: ['enrage'] },
    cond_allies_hurt: { name: 'N or more allies below 60%', icon: 'heart', line: 'True while this many allies are under 60% health.', see: ['hp'] },
    cond_allies_lt: { name: 'Fewer than N allies standing', icon: 'heart', line: 'True once the party is down to fewer than this many.', see: ['fallen'] },
    cond_bb_fatigue: { name: 'Between battles: any hero at N+ fatigue', icon: 'fatigue', line: 'After a win, true if any hero on the trip is this tired.', more: 'It comes on by default with Keep going, at 75.', see: ['fatigue', 'between_battles', 'keep_going'] },
    cond_bb_fell: { name: 'Between battles: an ally has fallen', icon: 'skull', line: 'After a win, true if any hero has fallen in that battle.', see: ['between_battles', 'fallen'] },
    cond_bb_next_boss: { name: 'Between battles: next stage has a boss or elite', icon: 'boss', line: 'After a win, true if the next stage holds a boss or elite.', see: ['between_battles', 'boss', 'elite'] },
    cond_bb_out: { name: 'Between battles: out of [item]', icon: 'flask', line: 'After a win, true if the Bag has none of that item left.', more: 'Otherwise its loadout slots would go into the next battle empty.', see: ['between_battles', 'loadout'] },
  });

  // ═══════════════════════════════════════════════════════════════════ heroes
  topic('heroes', {
    class: { name: 'Class', icon: 'helm', line: 'What a hero is, like Sellsword or Pilgrim: their stats, weapon and skills.', more: 'There are twelve. Six are on the Recruit Board from the start, and six join as the road goes on.', see: ['skill_tree', 'combine', 'recruit'] },
    xp: { name: 'XP', icon: 'star', line: 'Experience from battles and training; enough of it brings a new level.', more: 'Battle XP is a share of a level at the stage’s level, so a hero below it catches up fast. A first clear pays at least 30% of a level at your top hero’s level.', see: ['level', 'trainingyard', 'too_easy', 'first_clear'] },
    too_easy: { name: 'Too easy', icon: 'star', line: 'A stage that pays a hero under 10% of their own level in XP.', more: 'A stage below a hero’s level pays less of theirs. New stages on the road pay more.', see: ['xp', 'farm'] },
    level: { name: 'Level', icon: 'star', line: 'How far a hero has grown, from 1 up to 200.', more: 'Each level brings a stat point and the class’s own growth. Every fifth brings a skill point.', see: ['xp', 'stat_point', 'skill_point', 'threshold'] },
    stat_point: { name: 'Stat point', icon: 'plus', line: 'One for every level: spend it on a stat.', more: 'Speed, Crit and Dodge take 25 points at most. Resistances grow with each level on their own.', see: ['level', 'resistance', 'respec'] },
    skill_point: { name: 'Skill point', icon: 'plus', line: 'One for every fifth level: learn a skill, or raise one a level.', see: ['skill_level', 'awakening', 'respec'] },
    threshold: { name: 'Threshold', icon: 'star', line: 'Levels 30, 50, 80, 100, 120, 150, 180 and 200, where something new opens.', more: 'Each brings a free respec and one choice: the next tier of a tree, another class, or an awakening.', see: ['tier', 'combine', 'awakening', 'respec'] },
    skill: { name: 'Skill', icon: 'book', line: 'A hero’s ability: an active they use, or a passive that’s always on.', see: ['active_skill', 'passive_skill', 'skill_tree'] },
    active_skill: { name: 'Active skill', icon: 'sword', line: 'A skill that costs mana, used when a rule calls for it, if equipped.', see: ['skill_slot', 'mp', 'rule'] },
    passive_skill: { name: 'Passive skill', icon: 'check', line: 'Always on once learned, and never needs a slot.', see: ['keystone', 'skill'] },
    keystone: { name: 'Keystone', icon: 'star', line: 'A passive that changes how a hero fights, always with a catch.', more: 'Each class has three.', see: ['passive_skill', 'skill_tree'] },
    skill_level: { name: 'Skill level', icon: 'star', line: 'Each skill grows from level 1 to 5, one skill point a level.', see: ['skill_point', 'awakening'] },
    starter_skill: { name: 'Starter skill', icon: 'book', line: 'The skill every recruit of a class knows from the start, for free.', see: ['skill', 'recruit'] },
    skill_slot: { name: 'Skill slot', icon: 'book', line: 'Room for one active skill; only skills in a slot are used in battle.', more: 'One to start, one more at level 50 and at 200, and up to 2 from the Masters’ Hall.', see: ['active_skill', 'mastershall'] },
    skill_tree: { name: 'Skill tree', icon: 'book', line: 'A class’s 28 skills in three paths, opened tier by tier.', more: 'You can’t take everything, so every build is a choice.', see: ['path', 'tier', 'keystone'] },
    path: { name: 'Path', icon: 'book', line: 'One of a class’s three ways to build, with a skill at every tier.', see: ['skill_tree', 'tier'] },
    tier: { name: 'Tier', icon: 'star', line: 'A step up the skill tree; each threshold can open the next one.', more: 'Each tree has 9 tiers, and tier 1 is open from the start.', see: ['threshold', 'skill_tree'] },
    awakening: { name: 'Awakening', icon: 'holy', line: 'A level-5 skill made greater still, for 5 more skill points.', more: 'From level 100, a threshold can open an awakening instead of a tier.', see: ['threshold', 'skill_level'] },
    combine: { name: 'Combining classes', icon: 'helm', line: 'At level 50, and again at 200, a hero can take up another class.', more: 'They gain its first tier and starter skill, and keep their own stats and basic attack.', see: ['threshold', 'class'] },
    respec: { name: 'Respec', icon: 'holy', line: 'Take back every stat and skill point, and spend them again.', more: 'Each threshold gives a free one, and the Shrine sells more. Opened tiers and classes stay.', see: ['shrine', 'threshold'] },
    recruit: { name: 'Recruit', icon: 'scroll', line: 'A hero waiting on the Recruit Board, with stats rolled within their class’s range.', more: 'Their card’s bars show where each roll falls, so two recruits of one class can differ.', see: ['recruitboard', 'class'] },
    roster: { name: 'Roster', icon: 'helm', line: 'Every hero you’ve hired, in the party or not.', more: 'It holds 8 to start, and the Barracks makes room for up to 24.', see: ['barracks', 'dismiss'] },
    dismiss: { name: 'Dismiss', icon: 'boot', line: 'Send a hero away for good; only their gear comes back.', see: ['roster'] },
    fatigue: { name: 'Fatigue', icon: 'fatigue', line: 'Tiredness from 0 to 100: every turn a hero takes adds 1.', more: 'Heroes shed it resting at the Hearth. Using a party item takes no one’s turn, so it costs none.', see: ['weary', 'exhausted', 'spent', 'rest'] },
    fresh: { name: 'Fresh', icon: 'fatigue', line: 'Under 50 fatigue, a hero fights at full strength.', see: ['fatigue', 'weary'] },
    weary: { name: 'Weary', icon: 'fatigue', line: 'At 50 fatigue a hero loses 5% of their Power, Defence and Speed.', see: ['fatigue', 'rest'] },
    exhausted: { name: 'Exhausted', icon: 'fatigue', line: 'At 75 fatigue a hero loses 15% of their Power, Defence and Speed.', see: ['fatigue', 'rest'] },
    spent: { name: 'Spent', icon: 'fatigue', line: 'At 100 fatigue a hero can’t fight until they rest below 50.', more: 'A hero Spent on a trip walks home alone after that battle, and the rest carry on.', see: ['fatigue', 'rest', 'bed'] },
    hp: { name: 'Health', icon: 'heart', line: 'How much harm a hero or foe can take before they fall.', more: 'Health is full again at the start of every battle.', see: ['fallen', 'def'] },
    mp: { name: 'Mana', icon: 'mana', line: 'Pays for skills, and every basic attack restores some.', more: 'Every battle starts at half mana.', see: ['basic_attack', 'active_skill', 'gather'] },
    pow: { name: 'Power', icon: 'sword', line: 'Sets the damage, healing and strength of everything a hero or foe does.', more: '“1.4×” on a skill means 1.4 times the user’s Power.', see: ['def', 'crit'] },
    def: { name: 'Defence', icon: 'shield', line: 'Cuts the damage a hero or foe takes from every hit.', more: 'The same Defence counts for less against higher-level foes.', see: ['hp', 'dodge'] },
    spd: { name: 'Speed', icon: 'boot', line: 'How soon a hero or foe acts again; faster ones take more turns.', more: 'Speed 12 acts 20% more often than Speed 10. Faster heroes also tire sooner.', see: ['turn', 'round', 'fatigue'] },
    crit: { name: 'Crit', icon: 'star', line: 'The chance a hit lands extra hard, for 1.6× damage.', see: ['pow', 'st_quarry'] },
    dodge: { name: 'Dodge', icon: 'feather', line: 'The chance a hit misses, dealing nothing and applying nothing.', see: ['def', 'light_armour', 'st_veiled'] },
  });

  // ═══════════════════════════════════════════════════════════════════ gear
  topic('gear', {
    gear: { name: 'Gear', icon: 'bag', line: 'What a hero wears: a weapon, armour and an accessory.', more: 'Most pieces trade a bonus for a cost, or only work under a condition. Every piece shows on the hero’s sprite.', see: ['weapon', 'armor', 'accessory', 'rarity'] },
    weapon: { name: 'Weapon', icon: 'sword', line: 'Each class fights with its own kind, like swords or censers.', more: 'Every recruit carries a Common one. A hero who combines classes can use each class’s kind.', see: ['gear', 'combine'] },
    armor: { name: 'Armour', icon: 'plate', line: 'Light, medium or heavy; any class can wear any weight.', more: 'Heavier armour gives more health and Defence, at a cost to Dodge or Speed.', see: ['light_armour', 'medium_armour', 'heavy_armour'] },
    accessory: { name: 'Accessory', icon: 'bag', line: 'A charm, ring or token; most suit anyone, a few only one class.', see: ['class_only', 'gear'] },
    light_armour: { name: 'Light armour', icon: 'feather', line: 'A little health, and plenty of Dodge.', see: ['armor', 'dodge'] },
    medium_armour: { name: 'Medium armour', icon: 'shield', line: 'Health and Defence, at a small cost to Dodge.', see: ['armor', 'def'] },
    heavy_armour: { name: 'Heavy armour', icon: 'plate', line: 'The most health and Defence, at a cost to Speed.', see: ['armor', 'spd'] },
    class_only: { name: 'Class-only', icon: 'bag', line: 'An accessory that only one class can wear.', see: ['accessory'] },
    rarity: { name: 'Rarity', icon: 'star', line: 'What kind of piece it is: Common, Fine, Rare or Relic, by its frame.', more: 'Later regions roll rarer gear, and elites and bosses rarer still. How well a copy rolled is its stars.', see: ['common', 'fine', 'rare', 'relic', 'stars'] },
    stars: { name: 'Stars', icon: 'star', line: 'How well a piece rolled: up to four, each bringing an enchantment.', more: 'Two pieces in five have a star, and four stars come about once in 420. Elites, bosses, the Cage Mimic and Bess’s daily bonus give at least one, and a Relic always has two.', see: ['enchantment', 'rarity', 'sell', 'jobs'] },
    enchantment: { name: 'Enchantment', icon: 'star', line: 'A small bonus a star brings, on top of the piece’s own.', more: 'Most add a share of the hero’s own Power, Health, Defence or Mana, so they grow as the hero does. A Pair gives two stats; a Bargain trades a little of one for more of another.', see: ['stars', 'gear'] },
    common: { name: 'Common', icon: 'star', line: 'Everyday gear; every recruit carries a Common weapon.', see: ['rarity'] },
    fine: { name: 'Fine', icon: 'star', line: 'A step above Common, and worth more gold.', see: ['rarity'] },
    rare: { name: 'Rare', icon: 'star', line: 'Hard to find, and among the strongest gear on the road.', see: ['rarity'] },
    relic: { name: 'Relic', icon: 'star', line: 'A boss’s one-of-a-kind treasure: you can only ever own one.', more: 'Each boss gives its Relic on the first clear, at the boss’s level and with two stars. Relics never sell, and always find room in the Bag.', see: ['boss', 'rarity', 'stars'] },
    region_gear: { name: 'Region gear', icon: 'lantern', line: 'Gear that drops only in its own region; its card names the region.', more: 'A region’s gear rolls try its own line first: 40% of them on the road, 70% at elites, every one at its boss.', see: ['gear', 'region', 'trophy'] },
    item_level: { name: 'Item level', icon: 'star', line: 'The level of the stage a piece came from; higher means stronger stats.', more: 'Health, Mana, Power and Defence grow with it. The rest stay as they are.', see: ['gear', 'sell'] },
    bag: { name: 'Bag', icon: 'bag', line: 'Where unworn gear and party items wait; it holds 60 pieces of gear.', more: 'When it’s full, new gear sells where it drops, so a full Bag never sends the party home.', see: ['sell', 'loadout'] },
    sell: { name: 'Sell', icon: 'coin', line: 'Trade gear you don’t need for gold: rarer, higher-level pieces fetch more.', more: 'Each star adds half again to a piece’s price. Party items sell for 30% of their Shop price, and Relics never sell.', see: ['gold', 'bag', 'stars'] },
    try_on: { name: 'Try on', icon: 'helm', line: 'See a piece on the hero’s sprite before you equip it.', see: ['equip'] },
    equip: { name: 'Equip', icon: 'check', line: 'Put a piece on a hero; what they wore goes back to the Bag.', see: ['try_on', 'bag'] },
    gear_roll: { name: 'Gear roll', icon: 'bag', line: 'A random piece of gear, from loot or a building; later stages roll better.', see: ['loot', 'salvagepit', 'rarity'] },
  });

  // ═══════════════════════════════════════════════════════════════════ the Hearth
  topic('the Hearth', {
    fire: { name: 'The fire', icon: 'fire', line: 'The Hearth’s own fire, where heroes rest and free Healing Draughts wait.', more: 'Heroes rest 10 fatigue an hour here. A Healing Draught appears every 4 hours, up to 3.', see: ['rest', 'draught'] },
    rest: { name: 'Rest', icon: 'fatigue', line: 'Heroes at the Hearth lose fatigue over time, even while the app is closed.', more: '10 an hour at the fire, 20 to 35 in an Infirmary bed, and 10 training or at a lesson.', see: ['fatigue', 'bed', 'fire'] },
    bed: { name: 'Bed', icon: 'cross', line: 'An Infirmary bed, where the most tired hero at the Hearth rests faster.', more: 'Pin a hero to keep a bed for them.', see: ['infirmary', 'rest'] },
    plot: { name: 'Plot', icon: 'plus', line: 'A space in the ring around the fire where one building can stand.', more: 'You start with 3. Renown clears more, up to 14.', see: ['renown', 'blueprint', 'tear_down'] },
    blueprint: { name: 'Blueprint', icon: 'scroll', line: 'A building you can now raise, brought to you by the road.', more: 'None comes before the Sexton: Bess’s first quest brings the Toll House’s plan, and first clears from Region II on bring the rest.', see: ['plot', 'first_clear'] },
    upgrade: { name: 'Upgrade', icon: 'plus', line: 'Raise a building a level, for gold and a material; it’s instant.', more: 'Every building has five levels. Levels 1 and 2 cost Bone Dust, and level 3 and up its home material.', see: ['home_material', 'choice'] },
    home_material: { name: 'Home material', icon: 'bone', line: 'The material a building costs from level 3, which ties it to one region.', see: ['material', 'upgrade'] },
    choice: { name: 'Choice', icon: 'check', line: 'At levels 3 and 5, an idle building offers two upgrades: pick one.', more: 'One always adds storage. You can switch later by paying that level’s cost again.', see: ['idle_building', 'storage'] },
    focus: { name: 'Focus', icon: 'mark', line: 'What a building works towards, like gold or party items.', more: 'Changing it is free. An idle building hands over what it stored first.', see: ['idle_building'] },
    tear_down: { name: 'Tear down', icon: 'cleave', line: 'Free a plot for something else; nothing comes back.', more: 'What a building taught stays, such as conditions and trained slots. What it provides goes.', see: ['plot'] },
    idle_building: { name: 'Idle building', icon: 'hourglass', line: 'A building that keeps producing on real time, even while the app is closed.', more: 'The Toll House, Scavenger Camp, Training Yard and Salvage Pit work this way.', see: ['storage', 'collect', 'away'] },
    storage: { name: 'Storage', icon: 'hourglass', line: 'How many hours of output an idle building holds before it stops.', more: '8 hours to start. Its level 3 and 5 choices can add more.', see: ['idle_building', 'choice'] },
    collect: { name: 'Collect', icon: 'bag', line: 'Take what an idle building has made: gold, XP, materials, items or gear.', see: ['idle_building', 'away'] },
    away: { name: 'While you were away', icon: 'hourglass', line: 'What came in while the app was closed, shown when you return.', more: 'It shows after 5 minutes or more away. Gather it all collects everything at once.', see: ['idle_building', 'rest'] },
    renown: { name: 'Renown', icon: 'lantern', line: 'How far your company has come; as it rises, more plots clear.', more: 'Stages lit, battle XP, bosses, thresholds, new classes and buildings all raise it.', see: ['plot'] },
    lesson: { name: 'Lesson', icon: 'book', line: 'Time a hero spends away at the Masters’ Hall, learning a new slot.', more: 'They rest at the fire’s rate while they study.', see: ['mastershall', 'skill_slot', 'rule_slot'] },
    gear_stall: { name: 'Gear stall', icon: 'bag', line: 'The Shop’s small offer of gear, restocked every 8 hours.', see: ['shop'] },
    still_room: { name: 'Still-room', icon: 'flask', line: 'Where the Infirmary brews Healing Draughts, and later Smelling Salts.', more: 'From level 3, a Healing Draught every 6 hours, up to 4. From level 5, Smelling Salts every 24 hours.', see: ['infirmary', 'draught', 'salts'] },
    notices: { name: 'Notices', icon: 'scroll', line: 'A Recruit Board track: more recruits on each board.', see: ['recruitboard'] },
    picks: { name: 'Picks', icon: 'scroll', line: 'A Recruit Board track: more hires from each board.', see: ['recruitboard'] },
    veterans: { name: 'Veterans', icon: 'scroll', line: 'A Recruit Board track: recruits who arrive at higher levels, points spent.', more: 'The top rank brings storied recruits, some already combined or awakened.', see: ['recruitboard', 'recruit'] },

    // The buildings, one line each
    recruitboard: { name: 'Recruit Board', icon: 'scroll', line: 'Where new heroes wait to be hired; it stands outside the plots.', more: 'A new board comes whenever the party comes home, and every 4 hours. Only your first pick is free.', see: ['recruit', 'notices', 'picks', 'veterans'] },
    tollhouse: { name: 'Toll House', icon: 'coin', line: 'Raises the tolls travellers pay to use the road you’ve cleared.', more: 'It earns more the further you’ve cleared. Its focus can take party items instead of gold.', see: ['tolls', 'idle_building', 'focus'] },
    infirmary: { name: 'Infirmary', icon: 'cross', line: 'Beds where tired heroes rest faster than at the fire.', more: 'More levels bring more and better beds, and from level 3 a still-room.', see: ['bed', 'still_room', 'rest'] },
    trainingyard: { name: 'Training Yard', icon: 'sword', line: 'XP for resting heroes, up to the level of your highest lit stage.', more: 'You choose who trains.', see: ['xp', 'idle_building'] },
    shop: { name: 'Shop', icon: 'bag', line: 'Party items for gold, and a small stall of gear.', more: 'Prices rise with the furthest region you’ve reached.', see: ['party_items', 'gear_stall'] },
    tactician: { name: 'Tactician', icon: 'book', line: 'New rule conditions, and more party rule slots and loadout slots.', more: 'Lesson I comes with the 1-11 clear, and its level 3 brings Lesson II, with the Gather action.', see: ['lesson_i', 'party_rule_slot', 'loadout'] },
    scavengercamp: { name: 'Scavenger Camp', icon: 'bone', line: 'Scavengers bring back a region’s material while you’re away.', more: 'You choose the region. Now and then they bring a rare find: a party item or a piece of gear.', see: ['material', 'idle_building', 'focus'] },
    barracks: { name: 'Barracks', icon: 'shield', line: 'Room for more heroes on the roster.', more: 'The roster holds 8 to start, and up to 24.', see: ['roster'] },
    salvagepit: { name: 'Salvage Pit', icon: 'bag', line: 'Diggers turn up gear of the kind you choose.', more: 'A gear roll every 3 hours to start, and every 2 from level 4.', see: ['gear_roll', 'idle_building', 'focus'] },
    mastershall: { name: 'Masters’ Hall', icon: 'star', line: 'Masters teach a hero a new skill slot or rule slot, while they’re away.', more: 'Rule slots IV to VI and skill slots I and II, each from a set level.', see: ['lesson', 'skill_slot', 'rule_slot'] },
    shrine: { name: 'Shrine', icon: 'holy', line: 'Unlearn and start again: respec a hero for gold.', more: 'Higher levels make respecs cheaper, let a hero unlearn one skill, and give a free respec a day.', see: ['respec'] },
    whetstone: { name: 'Whetstone', icon: 'sword', line: 'Every hero hits a little harder: more Power, or more Crit.', see: ['pow', 'crit', 'focus'] },
    ossuary: { name: 'Ossuary', icon: 'skull', line: 'Every hero stands a little longer: more Health, or more Defence.', see: ['hp', 'def', 'focus'] },
    hexingstone: { name: 'Hexing Stone', icon: 'curse', line: 'Your harmful effects land more often.', more: 'Wide helps every kind a little; Deep helps one kind more.', see: ['harmful', 'resistance', 'focus'] },
    belltower: { name: 'Bell Tower', icon: 'bell', line: 'Every hero resists harmful effects a little more.', more: 'Wide raises all six resistances; Deep raises one by more.', see: ['resistance', 'focus'] },
  });

  // ═══════════════════════════════════════════════════════════════════ the road
  topic('the road', {
    region: { name: 'Region', icon: 'lantern', line: 'A stretch of the road with its own foes, weather and material.', more: 'There are five, each ending in a boss. A region stays dark until the boss before it falls.', see: ['gravefields', 'boss', 'material'] },
    gravefields: { name: 'Gravefields', icon: 'bone', line: 'Region I, levels 1 to 10: barrow-fields where the dead don’t stay put.', more: 'Its boss is the Sexton, and it drops Bone Dust most.', see: ['region', 'bone_dust'] },
    drownedchapel: { name: 'Drowned Chapel', icon: 'wax', line: 'Region II, levels 11 to 30: a flooded chapel where bells toll underwater.', more: 'Its boss is the Drowned Bishop, and it drops Chapel Wax most.', see: ['region', 'chapel_wax'] },
    thornwood: { name: 'Thornwood', icon: 'wood', line: 'Region III, levels 31 to 50: an old wood where wolves run in packs.', more: 'Its boss is the Antlered One, and it drops Heartwood most.', see: ['region', 'heartwood'] },
    ashenkeep: { name: 'Ashen Keep', icon: 'iron', line: 'Region IV, levels 51 to 75: a keep its own marshal burned, burning still.', more: 'Its boss is the Burnt Marshal, and it drops Cinder Iron most.', see: ['region', 'cinder_iron'] },
    hollowthrone: { name: 'Hollow Throne', icon: 'tallow', line: 'Region V, levels 76 to 100: a court of the dead awaiting a crown.', more: 'Its boss is the Hollow King, and it drops Throne Tallow most.', see: ['region', 'throne_tallow'] },
    stage: { name: 'Stage', icon: 'lantern', line: 'One battle on the road, marked by a lantern on the map.', more: 'Its number, like 1-6, gives the region and its place in it.', see: ['road_stage', 'elite', 'boss', 'recommended'] },
    road_stage: { name: 'Road stage', icon: 'lantern', line: 'An everyday stage on the road, easier than the elites and the boss.', see: ['stage', 'elite', 'boss'] },
    elite: { name: 'Elite', icon: 'mark', line: 'A hard stage marked by a red diamond, built around a stronger foe.', more: 'Elite foes resist more and drop richer loot. Each region has two elite stages.', see: ['stage', 'boss', 'cond_foe_boss'] },
    boss: { name: 'Boss', icon: 'skull', line: 'The great foe at the end of each region, marked by a skull.', more: 'Each boss’s first clear gives its Relic, and all but the last open the next region. When a boss falls, the party comes home.', see: ['relic', 'phase', 'region'] },
    lit: { name: 'Lit', icon: 'lantern', line: 'A cleared stage: its lantern burns, and you can farm it.', see: ['farm', 'frontier'] },
    frontier: { name: 'Frontier', icon: 'lantern', line: 'The next stage to light, where the party’s marker waits.', see: ['lit', 'dark', 'set_out'] },
    dark: { name: 'Dark', icon: 'lock', line: 'A stage not yet reached; its foes show only as silhouettes.', more: 'Light the stages before it first.', see: ['frontier'] },
    recommended: { name: 'Recommended level', icon: 'star', line: 'The level, and the number of heroes, a stage is built for.', more: 'Gold means ready, amber close, and red under-strength. Good rules can win a level or two early.', see: ['stage', 'level'] },
    set_out: { name: 'Set out', icon: 'boot', line: 'Send the party down the road to the next stage.', see: ['trip', 'frontier'] },
    farm: { name: 'Farm', icon: 'coin', line: 'Replay a lit stage for its loot, again and again.', more: 'Farming never repeats a first clear’s unlocks, and wandering foes may join.', see: ['lit', 'wanderer', 'keep_going'] },
    trip: { name: 'Trip', icon: 'boot', line: 'One outing from the Hearth: the party sets out, fights, and comes home.', more: 'With Keep going on, one trip can take in many stages.', see: ['keep_going', 'return_when', 'trip_summary'] },
    keep_going: { name: 'Keep going after a win', icon: 'lantern', line: 'After a win, the party walks on to the next stage.', more: 'It comes with 1-6, along with a party rule that brings everyone home at 75 fatigue.', see: ['trip', 'return_when', 'cond_bb_fatigue'] },
    return_when: { name: 'Return when…', icon: 'lantern', line: 'Chips on the stage sheet that end a trip; each is a party rule.', more: 'Fatigue 75+, An ally has fallen, Out of draughts and Before a boss or elite. Each needs a free party rule slot.', see: ['between_battles', 'party_rule_slot', 'return_to_hearth'] },
    first_clear: { name: 'First clear', icon: 'star', line: 'Your first win at a stage: double gold and materials, and often something new.', see: ['unlock', 'lit'] },
    tolls: { name: 'Tolls', icon: 'coin', line: 'Gold travellers pay to use the road you’ve cleared, even while you’re away.', more: 'Each cleared stage earns 5 gold an hour, stored up to 8 hours. The Toll House adds more.', see: ['tollhouse', 'collect', 'away'] },
    unlock: { name: 'Unlock', icon: 'star', line: 'What a first clear brings: a feature, a condition, a blueprint or a class.', see: ['first_clear', 'blueprint', 'condition'] },
    loot: { name: 'Loot', icon: 'bag', line: 'What a battle brings home: gold, XP, materials, party items and gear.', more: 'Every foe beaten drops some, and a win adds more for clearing the stage.', see: ['gold', 'gear_roll', 'first_clear'] },
    hint: { name: 'Hint', icon: 'book', line: 'After a loss, the stage’s advice on what to try next.', see: ['report', 'farm'] },
    trip_summary: { name: 'Trip summary', icon: 'scroll', line: 'What a trip brought home, and why it ended.', see: ['trip', 'loot'] },
  });

  // ═══════════════════════════════════════════════════════════════════ statuses
  topic('statuses', {
    status: { name: 'Status', icon: 'mark', line: 'An effect on a hero or foe for a few turns, helpful or harmful.', more: 'Durations count the owner’s own turns. Healing never removes a harmful status: only cleansing does.', see: ['harmful', 'helpful', 'cleanse'] },
    harmful: { name: 'Harmful status', icon: 'curse', line: 'A status that hurts or hinders; a resistance may stop it landing.', see: ['resistance', 'cleanse'] },
    helpful: { name: 'Helpful status', icon: 'holy', line: 'A status that helps; it always lands on an ally.', see: ['status'] },
    cleanse: { name: 'Cleanse', icon: 'tincture', line: 'Remove harmful statuses; healing alone never does.', see: ['tincture', 'harmful'] },
    resistance: { name: 'Resistance', icon: 'shield', line: 'Lowers the chance a harmful effect lands; the damage still lands.', more: 'Everyone has six. An effect lands on a roll of its chance plus the attacker’s bonus, minus the resistance.', see: ['res_stun', 'res_move', 'res_bleed', 'res_blight', 'res_curse', 'res_debuff'] },
    res_stun: { name: 'Stun resistance', icon: 'stun', line: 'Resists being Stunned or Confused, and having a charge broken.', see: ['st_stunned', 'st_confused', 'resistance'] },
    res_move: { name: 'Move resistance', icon: 'boot', line: 'Resists push-backs in the turn order, swaps and being pulled between rows.', see: ['lured', 'resistance'] },
    res_bleed: { name: 'Bleed resistance', icon: 'bleed', line: 'Resists Bleeding; each stack rolls on its own.', see: ['st_bleed', 'resistance'] },
    res_blight: { name: 'Blight resistance', icon: 'poison', line: 'Resists being Poisoned or set Burning.', see: ['st_poison', 'st_burn', 'resistance'] },
    res_curse: { name: 'Curse resistance', icon: 'doom', line: 'Resists Doom and Festering.', see: ['st_doom', 'st_festering', 'resistance'] },
    res_debuff: { name: 'Debuff resistance', icon: 'weak', line: 'Resists Weak, Exposed, Corroded, Slowed, Dazzled, Silenced, Taunted and Quarry.', see: ['resistance'] },

    // Harmful
    st_bleed: { name: 'Bleeding', icon: 'bleed', line: 'Loses health at the start of each turn; every new wound adds a stack.', more: 'Each stack keeps its own damage and length. Healing doesn’t stop it.', see: ['res_bleed', 'cleanse'] },
    st_doom: { name: 'Doom', icon: 'doom', line: 'A curse that strikes once, heavily, at the start of each turn.', more: 'It doesn’t stack. Some Hexblade skills spread it, or set it off at once.', see: ['res_curse'] },
    st_burn: { name: 'Burning', icon: 'fire', line: 'Loses health at the start of each turn, and fire skills hit it harder.', see: ['res_blight'] },
    st_poison: { name: 'Poisoned', icon: 'poison', line: 'Loses health at the start of each turn, a little more each time.', more: 'Each tick is 25% stronger than the last.', see: ['res_blight'] },
    st_dazzled: { name: 'Dazzled', icon: 'dazzle', line: 'Half-blinded by light: 40% of its attacks miss.', more: 'Hits that can’t miss still land.', see: ['res_debuff'] },
    st_weak: { name: 'Weak', icon: 'weak', line: 'Deals 25% less damage.', see: ['res_debuff'] },
    st_exposed: { name: 'Exposed', icon: 'exposed', line: 'Takes 25% more damage, and can’t dodge.', see: ['res_debuff', 'dodge'] },
    st_corroded: { name: 'Corroded', icon: 'acid', line: 'Its Defence is 30% lower.', see: ['res_debuff', 'def'] },
    st_slowed: { name: 'Slowed', icon: 'slow', line: 'Its Speed is 30% lower, so its turns come round more slowly.', see: ['res_debuff', 'spd'] },
    st_silenced: { name: 'Silenced', icon: 'silence', line: 'Can only use its basic attack.', more: 'A charge it already started still lands.', see: ['res_debuff', 'basic_attack'] },
    st_stunned: { name: 'Stunned', icon: 'stun', line: 'Too dazed to act: it loses its next turn.', more: 'A charge it’s gathering waits a turn.', see: ['res_stun'] },
    st_confused: { name: 'Confused', icon: 'confuse', line: 'Its next single-target attack picks anyone at random, even its own side.', see: ['res_stun'] },
    st_festering: { name: 'Festering', icon: 'fester', line: 'Healing it receives is halved.', see: ['res_curse'] },
    st_taunted: { name: 'Taunted', icon: 'taunt', line: 'Must aim its single-target attacks at whoever taunted it.', more: 'It only goes elsewhere when it can’t reach them.', see: ['res_debuff'] },
    st_quarry: { name: 'Quarry', icon: 'quarry', line: 'Hunted: every attacker gets +20% crit chance against it.', see: ['res_debuff', 'crit'] },
    st_charging: { name: 'Charging', icon: 'charge', line: 'Gathering a big attack that lands on its next turn.', more: 'Stunning it makes the blow wait a turn. “Foe: charging a big attack” lets rules answer it.', see: ['st_marked', 'cond_foe_charging'] },
    st_marked: { name: 'Marked', icon: 'mark', line: 'A charging foe has picked this one: the big hit lands next turn.', more: 'Guard them, or beat the one charging first.', see: ['st_charging', 'guard', 'cond_ally_has'] },
    st_deathmark: { name: 'Marked for Death', icon: 'skull', line: 'The Sellsword’s mark: it takes extra damage from them until it falls.', see: ['keystone'] },
    st_trap: { name: 'Trapped', icon: 'trap', line: 'A trap springs at the start of its next turn.' },

    // Helpful
    st_guarding: { name: 'Guarding', icon: 'shield', line: 'Takes single-target attacks meant for allies, at 30% less damage, until its next turn.', see: ['guard', 'st_covered'] },
    st_covered: { name: 'Covered', icon: 'cover', line: 'A protector takes every attack aimed at this one, even area hits.', see: ['guard', 'st_guarding'] },
    st_kindled: { name: 'Kindled', icon: 'kindle', line: 'Fired up: deals more damage, usually 30% more.', see: ['pow'] },
    st_hasted: { name: 'Hasted', icon: 'haste', line: 'Speed 30% higher, so its turns come sooner.', see: ['spd'] },
    st_warded: { name: 'Warded', icon: 'ward', line: 'A Ward soaks up damage until it breaks.', more: 'Its strength is set when it’s given, and it lasts up to 3 turns.' },
    st_blessed: { name: 'Blessed', icon: 'bless', line: 'Heals a little at the start of each turn.' },
    st_braced: { name: 'Braced', icon: 'brace', line: 'Takes less damage: 30% less when Defending, more from some skills.', see: ['defend'] },
    st_fortified: { name: 'Fortified', icon: 'fort', line: 'Takes 20% less damage.' },
    st_veiled: { name: 'Veiled', icon: 'smoke', line: 'Wrapped in smoke: Dodge +20%.', see: ['dodge'] },
    st_hidden: { name: 'Hidden', icon: 'hidden', line: 'Single-target attacks can’t aim at it, until it attacks.', more: 'Hits on a whole row still reach it, and a charged attack aimed at it misses.', see: ['shape'] },
    st_parrying: { name: 'Parrying', icon: 'parry', line: 'The next few single-target attacks against it miss.' },
    st_riposte: { name: 'Riposte', icon: 'riposte', line: 'Strikes back at every melee attacker, and takes 20% less damage.', see: ['melee'] },
    st_retaliating: { name: 'Retaliating', icon: 'thorns', line: 'Whoever damages it takes damage back.', more: 'Thorns work like this, and sting ranged and magic attackers too.' },
    st_unbroken: { name: 'Unbroken', icon: 'anchor', line: 'Can’t fall below 1 health.', see: ['fallen'] },
    st_hexward: { name: 'Hex Ward', icon: 'eye', line: 'Each foe that hits it becomes Doomed.', see: ['st_doom'] },
    st_bloodlust: { name: 'Bloodlust', icon: 'rage', line: 'In a fury: deals more damage.' },
    st_steadfast: { name: 'Holding the Line', icon: 'fort', line: 'Can’t be pushed back, Stunned or swapped, and takes 10% less damage.', see: ['res_move', 'res_stun'] },
    st_bastion: { name: 'Last Bastion', icon: 'shield', line: 'Takes every attack aimed at any ally, at less damage.', more: 'From the Warden’s Last Bastion, area hits included.', see: ['guard'] },
    st_unyielding: { name: 'Unyielding', icon: 'anchor', line: 'No single hit can take more than a small share of its health.' },
    st_immune: { name: 'Untouched', icon: 'holy', line: 'No new harmful status can land on it.', see: ['harmful'] },
    st_laudanum: { name: 'Laudanum', icon: 'flask', line: 'Takes less damage, and its turns build half the fatigue.', see: ['fatigue'] },
    st_perfect: { name: 'Perfect Counter', icon: 'riposte', line: 'Every attack it dodges is countered.', see: ['dodge'] },
    st_oath: { name: 'Second’s Oath', icon: 'riposte', line: 'A Duellist strikes back at whoever attacks this ally.' },
    st_mirror: { name: 'Mirror Guard', icon: 'parry', line: 'Attacks on it use a Duellist’s Dodge instead of its own.', see: ['dodge'] },
    st_counterstorm: { name: 'Counterstorm', icon: 'riposte', line: 'Every attack on any ally is answered with a counter.' },
    st_resup: { name: 'Hardened', icon: 'fort', line: 'Its resistances are higher for a while.', see: ['resistance'] },
    st_anchor: { name: 'Soul Anchor', icon: 'bone', line: 'A blow that would bring it down destroys a thrall instead.', see: ['thrall'] },
  });

  // ═══════════════════════════════════════════════════════════════════ resources
  topic('resources', {
    gold: { name: 'Gold', icon: 'coin', line: 'The coin of the road, for recruits, buildings, items and respecs.', more: 'You start with 300, the crown’s advance. Foes further down the road drop more.', see: ['loot', 'sell', 'tollhouse'] },
    material: { name: 'Material', icon: 'bone', line: 'What buildings are made of; each region drops one more than the rest.', more: 'The Scavenger Camp gathers them while you’re away.', see: ['home_material', 'scavengercamp'] },
    bone_dust: { name: 'Bone Dust', icon: 'bone', line: 'The Gravefields’ material, which every building’s first two levels need.', more: 'It also pays for the Recruit Board’s ranks, and the Training Yard and Shop past level 2.', see: ['gravefields', 'upgrade'] },
    chapel_wax: { name: 'Chapel Wax', icon: 'wax', line: 'The Drowned Chapel’s material, for raising some buildings past level 2.', more: 'The Toll House, Infirmary and Tactician need it from level 3.', see: ['drownedchapel', 'home_material'] },
    heartwood: { name: 'Heartwood', icon: 'wood', line: 'Thornwood’s material, for raising some buildings past level 2.', more: 'The Scavenger Camp, Barracks, Shrine and Hexing Stone need it from level 3.', see: ['thornwood', 'home_material'] },
    cinder_iron: { name: 'Cinder Iron', icon: 'iron', line: 'The Ashen Keep’s material, for raising some buildings past level 2.', more: 'The Salvage Pit, Whetstone and Ossuary need it from level 3.', see: ['ashenkeep', 'home_material'] },
    throne_tallow: { name: 'Throne Tallow', icon: 'tallow', line: 'The Hollow Throne’s material, for raising some buildings past level 2.', more: 'The Masters’ Hall and Bell Tower need it from level 3.', see: ['hollowthrone', 'home_material'] },
    trophy: { name: 'Trophy', icon: 'burialcoin', line: 'A region’s rarer material, for making and remaking its gear at the Smithy.', more: 'Its elites and boss always drop it, and a few of its own foes sometimes. The stage sheet shows which.', see: ['region_gear', 'burial_coin', 'bell_bronze'] },
    burial_coin: { name: 'Burial Coin', icon: 'burialcoin', line: 'The Gravefields’ Trophy, for making and remaking Gravefields gear at the Smithy.', more: 'Gravediggers and Mourners sometimes drop it; elites and the Sexton always do. The Smithy opens after the Sexton.', see: ['trophy', 'gravefields'] },
    bell_bronze: { name: 'Bell Bronze', icon: 'bellbronze', line: 'The Drowned Chapel’s Trophy, for making and remaking its gear at the Smithy.', more: 'Bell Wraiths and Silent Sisters sometimes drop it; elites and the Drowned Bishop always do.', see: ['trophy', 'drownedchapel'] },
  });

  return G;
})();
