'use strict';
// Lantern Road · the glossary's checks, and the generated parts of docs/glossary.md.
// It loads the game's data in Node, as tools/simtest.js does, then js/glossary.js, and checks every entry:
//   - its shape: a name, a topic, a line of one sentence and at most 14 words, at most two sentences more, an icon
//     that exists, and see ids that exist
//   - no two entries share a name; no "push" (for a trip), "trinket" or retired name (DECIDED below) anywhere; curly
//     apostrophes; Title Case for statuses, skills, items, buildings and regions; sentence case for conditions and
//     rule actions
//   - every status, resistance, condition, building, material, party item, stat, rarity, gear slot, armour weight,
//     fatigue state, foe kind, Recruit Board track, region and shared rule action has its entry, named as the game
//     names it, or as decided: a pending rename, which it reports but doesn't fail on
//   - the numbers and lists its text quotes match the game's tables
// Then it writes the generated parts of docs/glossary.md: the glossary's tables, and the decided names with where each
// old name is still in the game's strings. The rest of the doc is hand-written.
// Run: node tools/glossary.js           check, then rewrite the doc's generated parts
//      node tools/glossary.js --check   check, and fail if the doc is out of date (writes nothing)
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const run = f => vm.runInThisContext(fs.readFileSync(path.join(ROOT, 'js', f), 'utf8'), { filename: f });
// The model files in index.html's order: art.js comes before rules.js, which adds the party items' icons to it.
for (const f of ['core.js', 'data.js', 'classes.js', 'classes-late.js', 'items.js', 'sim.js', 'hero.js', 'base.js', 'rest.js', 'art.js', 'save.js', 'rules.js', 'campaign.js']) run(f);
// camp.js adds its icons (the plot's plus, the tent and the materials) before anything in it needs a page.
try { run('camp.js'); } catch (e) { /* the camp screen itself needs a page */ }
run('glossary.js');

// ── Names decided on 2026-11-04 (the play-test log), where the game still shows the old ones
// The glossary uses the decided names already. The game-wide rename pass changes the code, working from the doc's
// Decided names table, which lists where each old name is still in the game's strings.
//   old, now  the name the game shows today, and the decided one       note  what the rename pass should know
//   find      the old name as it shows in the game's strings; the glossary may not use it either
//   swap      [pattern, replacement]: turns a game name into the decided one, for the names the checks compare
//   data      [where it lives, its value now, the old value, its file], for a name held in a game table
const DECIDED = [
  { old: 'Camp, Base, Home, home base', now: 'the Hearth, and “Hearth” on buttons', note: 'One name for the home base, like Darkest Dungeon’s Hamlet. Players don’t name it.', find: /(?<!Scavenger )\b[Cc]amp\b|\bBase\b|\bHome\b(?! material)|\bhome base\b/ },
  { old: 'Come home, the come-home rule', now: '“Hearth” on the button, and Return to the Hearth for the action', note: 'Calling the party home. A battle under way finishes first.', find: /\bCome home\b(?! when)|\bcome home\b|\bcome-home\b/ },
  { old: 'Return to base', now: 'Return to the Hearth', note: 'The party rule action that ends a trip.', find: /\bReturn to base\b/, swap: [/\bReturn to base\b/g, 'Return to the Hearth'] },
  { old: 'Come home when', now: 'Return when…', note: 'The stage sheet’s chips.', find: /\bCome home when\b/ },
  { old: 'turn strip, turn flags, flag', now: 'Turn order', note: 'The banners along the top.', find: /\bturn (strip|flags?)\b|\bflags?\b/i },
  { old: 'character', now: 'hero', note: 'On every screen.', find: /\bcharacters?\b/i, swap: [/\bcharacter\b/g, 'hero'] },
  { old: 'Knocked out, knockouts, fell', now: 'Fallen, and “An ally has fallen”', note: 'A hero at 0 health.', find: /\bknock(ed|s)?[ -]?outs?\b|\bknock out\b|\bfell\b/i, swap: [/\ban ally fell\b/g, 'an ally has fallen'] },
  { old: 'spoils, rewards', now: 'Loot', note: 'What battles drop. The rules editor’s “learned from a battle reward” means a first clear, not loot.', find: /\bspoils?\b|\brewards?\b/i },
  { old: 'Defense', now: 'Defence', note: 'British spelling throughout, as in Armour and Draught.', find: /\bDefense\b/i, swap: [/\bDefense\b/g, 'Defence'] },
  { old: 'Foe: highest attack', now: 'Foe: highest Power', find: /\bhighest attack\b/i, swap: [/\bhighest attack\b/g, 'highest Power'] },
  { old: 'Tactician I', now: 'Lesson I', note: 'The Tactician’s lessons are Lesson I, II and III.', find: /\bTactician I\b/, swap: [/\bTactician I\b/g, 'Lesson I'] },
  { old: 'Holding the line', now: 'Holding the Line', note: 'Title Case for skills, statuses, items, paths, buildings and regions.', find: /\bHolding the line\b/, swap: [/\bHolding the line\b/g, 'Holding the Line'] },
  { old: 'Empty Plot, How Battles Work', now: 'Empty plot, How battles work', note: 'Sentence case for rules, conditions, buttons and labels.', find: /\bEmpty Plot\b|\bHow Battles Work\b/ },
  { old: 'straight apostrophes', now: 'curly ones (’)', find: /\w'\w/, swap: [/'/g, '’'] },
  { old: 'Ossuary, the Gravecaller’s first path', now: 'Charnel Host', note: 'The Boneward path ends in Charnel Fortress.', data: ['CLASSES.gravecaller.paths[0]', () => CLASSES.gravecaller.paths[0][0], 'Ossuary', 'classes-late.js'] },
  { old: 'Surgeon, the Barber-Surgeon’s second path', now: 'Sawbones', data: ['CLASSES.surgeon.paths[1]', () => CLASSES.surgeon.paths[1][0], 'Surgeon', 'classes-late.js'] },
  { old: 'Bastion, the Warden’s second path', now: 'Unbroken', note: 'Unbroken is also a skill on that path, and the status the skill gives.', data: ['CLASSES.warden.paths[1]', () => CLASSES.warden.paths[1][0], 'Bastion', 'classes.js'] },
  { old: 'Ossuary, the Gravecaller’s passive', now: 'Bone Retinue', note: 'Each battle starts with a free Bone Thrall, two when awakened. The building, the Ossuary Steps, the Sunken Ossuary and the Ossuary Rod keep their names.', data: ['SKILLS.ossuarypassive', () => SKILLS.ossuarypassive.name, 'Ossuary', 'classes-late.js'] },
  { old: 'Wick, a recruit name', now: '(removed)', note: 'Wick is the guide.', data: ['RECRUIT_NAMES', () => (RECRUIT_NAMES.includes('Wick') ? 'Wick' : null), 'Wick', 'base.js'] },
];
const renamed = name => DECIDED.reduce((t, d) => (d.swap ? t.replace(d.swap[0], d.swap[1]) : t), name);

// ── the game's strings: every string and template literal in js/, with comments and code skipped
function strings(src) {
  const out = [];
  let i = 0, line = 1, prev = '';
  while (i < src.length) {
    const c = src[i];
    if (c === '\n') { line++; i++; continue; }
    if (c === '/' && src[i + 1] === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i + 1] === '*') { i += 2; while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) { if (src[i] === '\n') line++; i++; } i += 2; continue; }
    if (c === '"' || c === "'" || c === '`') {
      const at = line;
      let j = i + 1, s = '';
      while (j < src.length && src[j] !== c) {
        if (src[j] === '\\') { s += src[j + 1]; j += 2; continue; }
        if (c === '`' && src[j] === '$' && src[j + 1] === '{') { // an expression: skipped, its braces balanced
          let depth = 1; j += 2; s += '…';
          while (j < src.length && depth) { if (src[j] === '{') depth++; else if (src[j] === '}') depth--; else if (src[j] === '\n') line++; j++; }
          continue;
        }
        if (src[j] === '\n') line++;
        s += src[j++];
      }
      out.push({ text: s, line: at });
      i = j + 1; prev = 'x';
      continue;
    }
    // A regex literal, told from a division by what comes before it.
    if (c === '/' && (!prev || '(,=:[!&|?{};+-*%<>~^'.includes(prev) || /\b(return|typeof|case)$/.test(src.slice(Math.max(0, i - 8), i).trimEnd()))) {
      let j = i + 1, cls = false;
      while (j < src.length && src[j] !== '\n') { if (src[j] === '\\') { j += 2; continue; } if (src[j] === '[') cls = true; else if (src[j] === ']') cls = false; else if (src[j] === '/' && !cls) break; j++; }
      i = j + 1;
      while (i < src.length && /[a-z]/.test(src[i])) i++;
      prev = 'x';
      continue;
    }
    if (!/\s/.test(c)) prev = c;
    i++;
  }
  return out;
}
// The strings a player can read: not CSS selectors, and not bare keys or class names like 'camp' or 'flag '.
const shown = s => !/^[.#][\w-]/.test(s.trim()) && !/^[a-z_$][\w$:-]*$/.test(s.trim());
const GAME = fs.readdirSync(path.join(ROOT, 'js')).filter(f => f.endsWith('.js') && f !== 'glossary.js').sort()
  .flatMap(f => strings(fs.readFileSync(path.join(ROOT, 'js', f), 'utf8')).filter(s => shown(s.text)).map(s => Object.assign({ file: f }, s)));
// Where a decided rename still has to happen: "js/file line, line · js/other line", or '' once it's done.
function stillIn(d) {
  if (d.data) { const [where, now, old, file] = d.data; return now() === old ? `js/${file}: ${where}` : ''; }
  const by = new Map();
  for (const s of GAME) if (d.find.test(s.text)) { if (!by.has(s.file)) by.set(s.file, new Set()); by.get(s.file).add(s.line); }
  return [...by].map(([f, lines]) => `js/${f} ${[...lines].join(', ')}`).join(' · ');
}

const TOPICS = ['the basics', 'battle', 'rules', 'heroes', 'gear', 'the Hearth', 'the road', 'statuses', 'resources'];
const FIELDS = new Set(['id', 'topic', 'name', 'icon', 'line', 'more', 'see']);
const MAX_WORDS = 14, MAX_MORE_WORDS = 36;
const problems = [], pending = [];
const bad = (id, msg) => problems.push(`${id}: ${msg}`);
const words = s => s.trim().split(/\s+/).length;
const sentences = s => (s.match(/[.!?](?=\s|$)/g) || []).length;
const text = e => [e.name, e.line, e.more || ''].join(' ');
const regionId = R => R.name.toLowerCase().replace(/[^a-z]/g, '');
// Capitals: Title Case for skills, statuses, items, buildings and regions; sentence case for conditions and rule actions,
// where only stat names, the Hearth and N keep a capital after the first word.
const MINOR = new Set(['a', 'an', 'the', 'and', 'or', 'but', 'of', 'in', 'on', 'at', 'to', 'for', 'by', 'with', 'from', 'as', 'nor']);
const titled = s => s.split(/\s+/).every((w, i) => !/^[a-z]/.test(w) || (i > 0 && MINOR.has(w)));
const isTitled = id => id.startsWith('st_') || !!ITEMS[id] || !!BUILDINGS[id] || !!SKILLS[id] || id === 'step_up' || REGIONS.some(R => regionId(R) === id);
const PROPER = new Set(['N', 'N+', 'Hearth', 'Defence', ...Object.values(STAT_LABELS)]);
const sentenced = s => s.split(/\s+/).slice(1).every(w => !/^[A-Z]/.test(w) || PROPER.has(w.replace(/[^A-Za-z+]+$/, '')));
const isSentenced = id => id.startsWith('cond_') || ['focus_fire', 'return_to_hearth', 'return_when', 'keep_going'].includes(id);

// ── each entry's shape
const names = new Map();
for (const [id, e] of Object.entries(GLOSSARY)) {
  for (const k in e) if (!FIELDS.has(k)) bad(id, `unknown field “${k}”`);
  if (e.id !== id) bad(id, 'its id field differs from its key');
  if (!TOPICS.includes(e.topic)) bad(id, `unknown topic “${e.topic}”`);
  if (typeof e.name !== 'string' || !e.name.trim()) bad(id, 'no name');
  else {
    const k = e.name.toLowerCase();
    if (names.has(k)) bad(id, `shares the name “${e.name}” with ${names.get(k)}`);
    names.set(k, id);
    if (isTitled(id) && !titled(e.name)) bad(id, `“${e.name}” should be in Title Case`);
    if (isSentenced(id) && !sentenced(e.name)) bad(id, `“${e.name}” should be in sentence case`);
  }
  if (e.icon !== null && !(typeof e.icon === 'string' && UI_ICONS[e.icon])) bad(id, `no UI_ICONS icon “${e.icon}”`);
  if (typeof e.line !== 'string' || !/[.!?]$/.test(e.line) || sentences(e.line) !== 1) bad(id, 'its line must be one sentence');
  else if (words(e.line) > MAX_WORDS) bad(id, `its line has ${words(e.line)} words, more than ${MAX_WORDS}`);
  if (e.more !== undefined) {
    if (typeof e.more !== 'string' || !/[.!?]$/.test(e.more) || sentences(e.more) > 2) bad(id, 'more must be one or two sentences');
    else if (words(e.more) > MAX_MORE_WORDS) bad(id, `more has ${words(e.more)} words, more than ${MAX_MORE_WORDS}`);
  }
  if (e.see !== undefined) {
    if (!Array.isArray(e.see) || !e.see.length) bad(id, 'see must be a list of ids');
    else for (const s of e.see) if (!GLOSSARY[s] || s === id || e.see.indexOf(s) !== e.see.lastIndexOf(s)) bad(id, `see: “${s}” isn't another entry, or is listed twice`);
  }
  // A run of stages is a trip, never a push (a push-back on the turn order is fine). Accessories, never trinkets.
  if (/\bpush(?:es|ed|ing)?\b(?![- ]back)/i.test(text(e))) bad(id, 'says “push”: a run of stages is a trip');
  if (/trinket/i.test(text(e))) bad(id, 'says “trinket”: they are accessories');
  for (const d of DECIDED) if (d.find && d.find.test(text(e))) bad(id, `uses “${text(e).match(d.find)[0]}”, retired for ${d.now}`);
}

// ── every term from the game's tables, named as the game names it, or as decided
const expect = (id, name, table) => {
  const e = GLOSSARY[id];
  if (!e) bad(id, `missing (${table} has it)`);
  else if (e.name === name) return;
  else if (renamed(name) === e.name) pending.push(`${id}: ${table} says “${name}”, decided “${e.name}”`);
  else bad(id, `named “${e.name}”, but ${table} says “${name}”`);
};
const placeholder = c => (!c.s ? undefined : c.s === ALL_ST ? '[status]' : c.s.every(x => ITEMS[x]) ? '[item]' : '[kind]');
for (const k in STATUSES) expect('st_' + k, STATUSES[k].name, 'STATUSES');
for (const k in RESISTS) expect('res_' + k, RESISTS[k].name + ' resistance', 'RESISTS');
for (const k in CONDITIONS) expect('cond_' + k, CONDITIONS[k].label({ n: 'N', s: placeholder(CONDITIONS[k]) }), 'CONDITIONS');
for (const k in BUILDINGS) expect(k, BUILDINGS[k].name, 'BUILDINGS');
for (const m of MATERIALS) expect(m.id, m.name, 'MATERIALS');
for (const k in ITEMS) expect(k, ITEMS[k].name, 'ITEMS');
for (const k in STAT_LABELS) expect(k, STAT_LABELS[k], 'STAT_LABELS');
for (const k in RARITY_NAMES) expect(k, RARITY_NAMES[k], 'RARITY_NAMES');
for (const k in SLOT_NAMES) expect(k, SLOT_NAMES[k], 'SLOT_NAMES');
for (const k in WEIGHT_NAMES) expect(k + '_armour', WEIGHT_NAMES[k] + ' armour', 'WEIGHT_NAMES');
for (const k in FATIGUE_NAMES) expect(k, FATIGUE_NAMES[k], 'FATIGUE_NAMES');
for (const k in TAGS) expect(k, TAGS[k], 'TAGS');
for (const k in BOARD_TRACKS) expect(k, BOARD_TRACKS[k].name, 'BOARD_TRACKS');
for (const R of REGIONS) expect(regionId(R), R.name, 'REGIONS');
expect('focus_fire', PARTY_ACTIONS.focus.name, 'PARTY_ACTIONS');
expect('return_to_hearth', PARTY_ACTIONS.home.name, 'PARTY_ACTIONS');
for (const [id, k] of [['defend', 'defend'], ['move', 'move'], ['gather', 'gather'], ['step_up', 'stepup']]) expect(id, SKILLS[k].name, 'SKILLS');
expect('lesson_i', UNLOCKS.tactician.name, 'UNLOCKS');
expect('keep_going', UNLOCKS.keepgoing.name, 'UNLOCKS');
expect('party_items', UNLOCKS.items.name, 'UNLOCKS');
// A decided name held in a table is either still the old one (pending) or the decided one (done).
for (const d of DECIDED) if (d.data) {
  const [where, now, old] = d.data, v = now();
  if (v !== old && v !== null && v !== d.now) bad('DECIDED', `${where} is “${v}”, neither “${old}” nor the decided “${d.now}”`);
}

// ── the numbers and lists the text quotes
const says = (id, ...vals) => {
  const e = GLOSSARY[id];
  if (!e) return;
  for (const v of vals) if (!text(e).includes(String(v))) bad(id, `should say “${v}”, as the game's tables do`);
};
const holds = (id, ok, what) => { if (!ok) bad(id, `the game no longer matches: ${what}`); };
const pct = x => `${Math.round(x * 100)}%`;
const last = a => a[a.length - 1];
const firstClearOf = unlock => (STAGES.find(st => (st.first || []).includes(unlock)) || {}).id;
const lines = `from ${THRESH[0]}% to ${last(THRESH)}%`;

says('fatigue', `adds ${FATIGUE.PER_TURN}`, `0 to ${FATIGUE.SPENT}`);
says('turn', `adds ${FATIGUE.PER_TURN} fatigue`);
says('fresh', `Under ${REST.WEARY}`);
says('weary', `At ${REST.WEARY}`, pct(REST.PEN.weary));
says('exhausted', `At ${REST.EXHAUSTED}`, pct(REST.PEN.exhausted));
says('spent', `At ${REST.SPENT}`, `below ${REST.FIT}`);
says('fire', `${REST.FIRE} fatigue an hour`, `every ${BASE.POTION.every} hours, up to ${BASE.POTION.max}`);
says('draught', pct(SKILLS.draught.healPct), `every ${BASE.POTION.every} hours, up to ${BASE.POTION.max}`);
says('rest', `${REST.FIRE} an hour`, `${BLV.bedRate[1]} to ${last(BLV.bedRate)}`, `${REST.YARD} training or at a lesson`);
holds('rest', REST.HALL === REST.YARD, 'a lesson rests at the yard’s rate');
says('salts', pct(SKILLS.salts.revive));
says('lampoil', `${SKILLS.lampoil.mana} mana`);
says('enrage', `round ${SIM.ENRAGE_ROUND}`, pct(SIM.ENRAGE_STEP), `round ${SIM.ENRAGE_SURGE}`);
says('crit', `${SIM.CRIT}×`);
holds('round', SIM.ROUND === 100, 'anyone with Speed 10 acts once a round');
says('st_dazzled', pct(SIM.DAZZLE_MISS));
says('st_poison', pct(SIM.POISON_GROW));
for (const k of ['weak', 'exposed', 'corroded', 'slowed', 'quarry', 'kindled', 'hasted', 'fortified', 'veiled', 'guarding']) says('st_' + k, `${STATUSES[k].v}%`);
says('st_braced', `${SKILLS.defend.st[0].v}%`);
says('defend', `${SKILLS.defend.st[0].v}%`);
says('bag', `${ITEM.BAG} pieces`);
says('sell', pct(BASE.ITEM_SELL));
says('plot', `start with ${BASE.START_PLOTS}`, `up to ${BASE.START_PLOTS + BASE.PLOT_RENOWN.length}`);
says('threshold', HERO.THRESHOLDS.slice(0, -1).join(', ') + ' and ' + last(HERO.THRESHOLDS));
says('level', `up to ${HERO.CAP}`);
says('xp', `at least ${pct(XP_FLOOR)} of a level`);
says('too_easy', `under ${pct(XP_TOO_EASY)}`);
says('combine', `level ${HERO.COMBINE_AT[0]}`, `at ${HERO.COMBINE_AT[1]}`);
says('awakening', `${HERO.AWAKEN_COST} more skill points`, `level ${HERO.AWAKEN_FROM}`);
says('tier', `${HERO.TIERS} tiers`);
says('skill_level', `1 to ${SKILL_LV_MAX}`);
says('skill_slot', `up to ${HERO.LESSONS}`);
says('stat_point', `${HERO.RES_CAP} points`);
holds('stat_point', ['spd', 'crit', 'dodge'].every(k => HERO.POINT_CAP[k] === HERO.RES_CAP), 'Speed, Crit, Dodge and each resistance share one cap');
says('rule_slot', `starts with ${HERO.RULE_SLOTS}`);
says('loadout', `start with ${LOADOUT.slots[0]}`, `up to ${LOADOUT.slots[1] - LOADOUT.slots[0]} more`);
says('party_rule_slot', `start with ${PARTY_RULES.slots[0]}`, `Up to ${PARTY_RULES.slots[1]}`);
says('roster', `holds ${BLV.roster[0]}`, `up to ${last(BLV.roster)}`);
says('barracks', `holds ${BLV.roster[0]}`, `up to ${last(BLV.roster)}`);
says('gold', `start with ${BASE.START_GOLD}`);
says('storage', `${BASE.STORE} hours`);
says('tolls', `${BASE.TOLL} gold an hour`, `${BASE.STORE} hours`);
says('gear_stall', `every ${BASE.STALL_EVERY} hours`);
says('recruitboard', `every ${BASE.BOARD.every} hours`);
says('salvagepit', `every ${Math.round(1 / BLV.pit[1])} hours`, `every ${Math.round(1 / BLV.pit[4])} from level 4`);
says('wanderer', `round ${FOES.mimic.flee}`);
says('undead', `+${FAMILY_RES.undead.bleed}% Bleed`, `+${FAMILY_RES.undead.blight}% Blight`);
says('spirit', `+${FAMILY_RES.spirit.bleed}% Bleed`, `+${FAMILY_RES.spirit.move}% Move`, `${Math.abs(FAMILY_RES.spirit.curse)}% Curse`);
says('beast', `${Math.abs(FAMILY_RES.beast.bleed)}% Bleed and Stun`);
holds('beast', FAMILY_RES.beast.bleed === FAMILY_RES.beast.stun, 'beasts shift Bleed and Stun alike');
says('cond_self_hp_lt', `start with ${CONDITIONS.self_hp_lt.start[0]}%`, lines);
says('cond_ally_hp_lt', `start with ${CONDITIONS.ally_hp_lt.start[0]}%`, lines);
says('lesson_i', `from ${firstClearOf('tactician')}:`, lines);
says('tactics', `of ${firstClearOf('tactics')}`);
says('keep_going', `with ${firstClearOf('keepgoing')}`, `at ${HOME_RULE.n} fatigue`);
says('cond_bb_fatigue', `at ${HOME_RULE.n}`);
says('return_when', `Fatigue ${HOME_RULE.n}+`);
says('splash', SKILLS.marshalblade.splash === 0.25 ? 'a quarter' : pct(SKILLS.marshalblade.splash));
holds('thrall', SIM.THRALLS === 2, 'two thralls can stand at once');
holds('class', CLASS_ORDER.length === 12 && Object.keys(CLASS_JOINS).length === 6, 'twelve classes, six of them joining later');
holds('keystone', CLASS_ORDER.every(k => Object.values(SKILLS).filter(s => s.cls === k && s.kind === 'key').length === 3), 'three keystones in every class');
says('skill_tree', `${1 + CLASSES.sellsword.tree.flat().length} skills`);
holds('skill_tree', CLASS_ORDER.every(k => CLASSES[k].tree.length === 3 && CLASSES[k].tree.every(p => p.length === HERO.TIERS)), 'three paths of one skill per tier');
holds('region', REGIONS.length === 5, 'five regions');
holds('elite', REGIONS.every((R, i) => STAGES.filter(st => st.region === i && st.kind === 'elite').length === 2), 'two elite stages in every region');
holds('choice', Object.values(BUILDINGS).every(B => !B.choices || B.idle), 'only idle buildings offer level 3 and 5 choices');
says('idle_building', ...Object.values(BUILDINGS).filter(B => B.idle).map(B => B.name));
REGIONS.forEach(R => {
  const mat = MATERIALS.find(m => m.id === R.mat).name;
  says(regionId(R), `Region ${R.num}`, `levels ${R.levels[0]} to ${R.levels[1]}`, R.boss.replace(/^The /, 'the '), `drops ${mat} most`);
});
// Each material names the buildings it raises past level 2 (the Recruit Board, outside the plots, has ranks instead).
for (const m of MATERIALS) says(m.id, ...Object.values(BUILDINGS).filter(B => B.home === m.id && B.plot !== false).map(B => B.name));

const counts = TOPICS.map(t => [t, Object.values(GLOSSARY).filter(e => e.topic === t).length]);
console.log(`${Object.keys(GLOSSARY).length} entries: ${counts.map(([t, n]) => `${t} ${n}`).join(', ')}`);
const left = DECIDED.filter(d => stillIn(d));
console.log(`${pending.length} pending renames in the game's tables, and ${left.length} of ${DECIDED.length} decided renames still to do in the game (docs/glossary.md, Decided names)`);
for (const p of pending) console.log('  pending: ' + p);
if (problems.length) {
  console.log(`\n${problems.length} problem${problems.length === 1 ? '' : 's'}:\n  ` + problems.join('\n  '));
  process.exit(1);
}

// ── docs/glossary.md: the generated parts, each between its markers
const DOC = path.join(ROOT, 'docs', 'glossary.md');
const title = t => t[0].toUpperCase() + t.slice(1);
const cell = s => String(s || '').replace(/\|/g, '\\|');
function tables() {
  const out = ['| Topic | Entries |', '|---|---|'];
  for (const [t, n] of counts) out.push(`| [${title(t)}](#${t.toLowerCase().replace(/ /g, '-')}) | ${n} |`);
  out.push(`| **All** | **${Object.keys(GLOSSARY).length}** |`, '');
  for (const t of TOPICS) {
    out.push(`## ${title(t)}`, '', '| Name | Line | More, for the Codex | Id · icon |', '|---|---|---|---|');
    for (const e of Object.values(GLOSSARY).filter(x => x.topic === t)) out.push(`| **${cell(e.name)}** | ${cell(e.line)} | ${cell(e.more)} | \`${e.id}\` · ${e.icon || '–'} |`);
    out.push('');
  }
  return out.join('\n');
}
function decided() {
  const out = ['| Old name | Decided name | Note | Still in the game |', '|---|---|---|---|'];
  for (const d of DECIDED) out.push(`| ${cell(d.old)} | ${cell(d.now)} | ${cell(d.note)} | ${cell(stillIn(d)) || 'Done'} |`);
  return out.join('\n') + '\n';
}
const BLOCKS = [
  ['<!-- glossary:start · generated by tools/glossary.js from js/glossary.js: edit that file, then run the tool -->', '<!-- glossary:end -->', tables],
  ['<!-- decided:start · generated by tools/glossary.js from its DECIDED list -->', '<!-- decided:end -->', decided],
];
const old = fs.existsSync(DOC) ? fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n') : null;
let doc = old || '# Lantern Road: Glossary\n';
for (const [a, b, make] of BLOCKS) {
  const i = doc.indexOf(a), j = doc.indexOf(b), block = `${a}\n\n${make()}\n${b}`;
  doc = i >= 0 && j > i ? doc.slice(0, i) + block + doc.slice(j + b.length) : `${doc.trimEnd()}\n\n${block}\n`;
}
if (process.argv.includes('--check')) {
  if (doc !== old) { console.log('docs/glossary.md is out of date: run node tools/glossary.js'); process.exit(1); }
  console.log('docs/glossary.md is up to date.');
} else if (doc !== old) {
  fs.writeFileSync(DOC, doc);
  console.log('Wrote docs/glossary.md.');
} else console.log('docs/glossary.md is up to date.');
