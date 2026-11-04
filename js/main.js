'use strict';
// Lantern Road · the Battle screen and its controls, the battle report, help, and boot.
// The other screens, settings and the shell live in js/app.js; the game state and saving in js/save.js.

const scr = $('#screen'), sheet = $('#sheet');
const progress = () => Save.state.campaign;
const speedSetting = () => Save.state.settings.speed;

let current = null;        // { index, stage, seed, res } for the battle on screen
let menuWasPaused = false; // whether the battle was paused before the menu opened
let reportRes = null;      // the battle the open report describes

function toast(text, cls = '') {
  const el = h('div', { class: 'toast ' + cls, text });
  $('#toasts').append(el); setTimeout(() => el.remove(), 2600);
  const all = $('#toasts').children; if (all.length > 3) all[0].remove();
}
function setScreen(el) { scr.replaceChildren(el); scr.hidden = false; scr.scrollTop = 0; }
function closeScreen() { scr.hidden = true; scr.replaceChildren(); }
function openSheet(el, cls = '') { sheet.className = cls; sheet.replaceChildren(el); sheet.hidden = false; }
function closeSheet() { sheet.hidden = true; sheet.replaceChildren(); reportRes = null; reportView = null; }
const btn = (label, fn, cls = '', sub) => h('button', { class: 'btn ' + cls, onclick: () => { sfx('click'); fn(); } }, label, sub ? h('span', { class: 'sub', text: sub }) : null);

// Leave the battle for the road (the Campaign Map).
function showCamp() { App.go('map'); }

// ── a battle
// The Battle screen. A battle in progress is remembered in the save, so a reload replays the same fight.
App.screen('battle', {
  enter(p) { startStage(p.stage, p.seed); },
  leave() { current = null; progress().current = null; Save.commit(); },
});
function startStage(i, seed) {
  closeScreen(); closeSheet();
  const stage = STAGES[i];
  seed = seed != null ? seed : (Date.now() ^ (i * 7919)) >>> 0;
  Battle.play();
  current = { index: i, stage, seed, res: null };
  progress().current = { stage: i, seed };
  Save.commit();
  current.res = Battle.run(stage, seed, { onEnd: res => showReport(res), first: true });
  syncControls();
}

// Battle controls: play or pause, one turn at a time, speed, skip.
const ICON_PLAY = '<svg viewBox="0 0 10 10"><path d="M2 1v8l7-4z"/></svg>';
const ICON_PAUSE = '<svg viewBox="0 0 10 10"><path d="M2 1h2v8H2zM6 1h2v8H6z"/></svg>';
function togglePlay() {
  if (!Battle.busy) return;
  if (Battle.paused) Battle.play(); else Battle.setPaused(true);
  syncControls();
}
function stepTurn() { if (Battle.busy) { Battle.stepOnce(); syncControls(); } }
function onSkip() { if (Battle.busy) { sfx('click'); Battle.skip(); } }
function cycleSpeed() {
  const l = [1, 2, 4];
  const st = Save.state.settings;
  st.speed = l[(l.indexOf(st.speed) + 1) % l.length]; Save.commit();
  Battle.setSpeed(st.speed); syncControls();
}
function syncControls() {
  const p = Battle.paused, b = $('#bPlay');
  b.innerHTML = p ? ICON_PLAY : ICON_PAUSE;
  b.setAttribute('aria-label', p ? 'Play' : 'Pause');
  b.classList.toggle('on', p);
  $('#bSpeed').textContent = speedSetting() + '×';
  $('#bSpeed').classList.toggle('on', speedSetting() > 1);
  $('#pausedTag').hidden = !(p && Battle.busy && sheet.hidden);
}
function resumeFromMenu() { closeSheet(); closeScreen(); Battle.setPaused(menuWasPaused); syncControls(); }
function openMenu(again) {
  if (!again) menuWasPaused = Battle.paused;
  Battle.setPaused(true);
  openSheet(h('div', { class: 'box' },
    h('div', { class: 'kicker', text: current ? `${current.stage.id} · ${current.stage.name}` : 'Paused' }),
    h('h2', { text: 'Paused' }),
    btn('Resume', resumeFromMenu, 'primary'),
    btn('Retreat to the road', () => { closeSheet(); showCamp(); }, '', 'Leave this battle. Nothing is lost.'),
    settingRows(() => openMenu(true)),
    btn('How battles work', () => { closeSheet(); showHow(() => { closeScreen(); openMenu(true); }); })), 'menu');
  syncControls();
}

// ── the battle report
// The result across the top. On the left, everyone ranked by one stat at a time: pick the stat from the tabs.
// On the right, one character's fight: a ribbon of every turn they took, their tactics and how often each fired,
// and their best moments. Rule colours match between the ribbon and the tactics.
const REPORT_STATS = [
  { k: 'dealt', label: 'Dealt', icon: 'sword', heal: false, tip: 'Damage dealt' },
  { k: 'taken', label: 'Taken', icon: 'bleed', heal: false, tip: 'Damage taken' },
  { k: 'healed', label: 'Healed', icon: 'cross', heal: true, tip: 'Healing done' },
  { k: 'healedIn', label: 'Received', icon: 'heart', heal: true, tip: 'Healing received' },
];
const RULE_COLORS = ['#f1d36a', '#8cc4e6', '#c9a6ff', '#b4de98', '#f08c76', '#e8c88a'];
const ruleColor = r => (r >= 0 ? RULE_COLORS[r % RULE_COLORS.length] : r === -2 ? '#e05a4a' : '#8a7e92');
const roleOf = u => (u.thrall ? 'Thrall' : u.side === 0 ? `${CLASSES[u.key].role} · Lv ${u.lv || 1}` : `${u.boss ? 'Boss' : u.elite ? 'Elite foe' : 'Foe'} · Lv ${u.lv || 1}`);
const faceURL = u => (u.thrall ? portraitURL('thrall:' + u.key, false) : portraitURL(u.key, u.side === 0, u.look));
const aName = n => (/^The /.test(n) ? n.replace(/^The /, 'the ') : (/^[AEIOU]/.test(n) ? 'an ' : 'a ') + n);
let reportView = null; // { res, side, stat, sel }

// What the road says when a battle ends: on a win, how the last foe to fall went down.
function flavorLine(res, won) {
  if (!won) return 'The lanterns gutter. The party falls back down the road.';
  const last = [...res.log].reverse().find(e => e.t === 'die' && e.who[0] === 'f');
  const u = last && res.start.find(x => x.id === last.who);
  return (u && FOES[u.key].death) || 'The road ahead is quiet.';
}
const badge = (text, cls = '', icon) => h('span', { class: 'badge ' + cls }, icon ? ico(icon) : null, text);
// Every turn a character took, in order: the skill used and the rule that chose it.
function turnsOf(res, id) {
  const out = [];
  res.log.forEach((e, i) => {
    if (e.t !== 'turn' || e.who !== id) return;
    let t = null;
    for (let j = i + 1; j < res.log.length && res.log[j].t !== 'turn'; j++) {
      const x = res.log[j];
      if (x.t === 'act') { t = { skill: x.skill, rule: x.rule }; break; }
    }
    out.push(t || { skill: null, rule: -3 });
  });
  return out;
}
function characterCard(u, res) {
  const s = res.stats[u.id], f = res.final.find(x => x.id === u.id), hero = u.side === 0;
  const status = f.alive
    ? h('div', { class: 'state ok' }, h('span', { class: 'lbl', text: 'Standing' }), h('span', { class: 'hpbar' }, h('i', { style: `width:${Math.round(100 * f.hp / f.maxHp)}%` })), h('b', { text: `${f.hp}/${f.maxHp}` }))
    : h('div', { class: 'state down' }, h('span', { class: 'lbl', text: `${hero ? 'Knocked out' : 'Fell'} · round ${s.koRounds[s.koRounds.length - 1]}` }));
  const strip = h('div', { class: 'strip' }, REPORT_STATS.map(st => h('span', { class: 'st ' + (st.heal ? 'heal' : 'dmg'), title: st.tip }, ico(st.icon), h('b', { text: s[st.k] ? fmt(s[st.k]) : '–' }))));
  const ribbon = h('div', { class: 'ribbon' }, turnsOf(res, u.id).map((t, n) => {
    const sk = t.skill && SKILLS[t.skill];
    const why = t.rule >= 0 ? `tactic ${t.rule + 1}` : t.rule === -2 ? 'charged attack' : t.rule === -3 ? 'fell before acting' : 'default';
    return h('span', { class: 'tn', style: `--c:${ruleColor(t.rule)}`, title: `Turn ${n + 1}: ${sk ? sk.name : 'fell'} (${why})` }, ico(sk ? sk.icon : 'skull'));
  }));
  const pips = n => h('span', { class: 'pips' }, n ? [Array.from({ length: Math.min(n, 8) }, () => h('i')), h('b', { text: '×' + n })] : h('em', { text: 'never fired' }));
  const chip = id => h('span', { class: 'chip' }, ico(SKILLS[id].icon), SKILLS[id].name);
  const slot = (mark, color, cond, skill, n, cls = '') => h('div', { class: 'slot ' + cls + (n ? '' : ' idle'), style: `--c:${color}` },
    h('span', { class: 'mark', text: mark }), h('span', { class: 'cond', text: cond }), h('span', { class: 'arrow', text: '→' }), chip(skill), pips(n));
  const tactics = u.rules.map((r, k) => slot(k + 1, ruleColor(k), ruleCond(r), SKILLS[r.do] ? r.do : u.basic, s.rules[k]));
  tactics.push(slot('Default', ruleColor(-1), 'When no tactic fits', u.basic, s.basic, 'default'));
  if (s.charged) tactics.push(slot('!', ruleColor(-2), 'Charged the turn before', u.skills.map(k => SKILLS[k].charge).find(Boolean) || u.basic, s.charged, 'default'));
  const moments = [];
  const m = (icon, big, small) => moments.push(h('div', { class: 'moment' }, ico(icon), h('div', {}, h('b', { text: big }), small ? h('span', { text: small }) : null)));
  if (s.best) m(s.best.crit ? 'mark' : 'sword', `Biggest hit · ${s.best.dmg}${s.best.crit ? ' critical' : ''}`, `${SKILLS[s.best.skill].name} on ${aName(s.best.tgt)}`);
  if (s.kills) m('skull', `Felled ${plural(s.kills, hero ? 'foe' : 'hero').replace('heros', 'heroes')}`);
  if (s.soaked) m('shield', `Guarded ${fmt(s.soaked)}`, 'damage meant for allies');
  if (s.revives) m('holy', `Raised ${plural(s.revives, 'ally').replace('allys', 'allies')}`);
  if (s.dot) m('doom', `${fmt(s.dot)} from curses`, 'damage over time');
  if (s.crits > (s.best && s.best.crit ? 1 : 0)) m('mark', plural(s.crits, 'critical hit'));
  if (s.raised) m('holy', `Raised ${s.raised === 1 ? 'once' : s.raised + ' times'}`, 'brought back to fight');
  return h('div', { class: 'card' },
    h('div', { class: 'chead' },
      h('div', { class: 'pennant ' + (hero ? 'hero' : 'foe') }, h('img', { src: faceURL(u), alt: '' })),
      h('div', { class: 'ctitle' }, h('div', { class: 'nm', text: u.name }), h('div', { class: 'k', text: roleOf(u) })),
      status),
    strip,
    h('h4', {}, 'This fight, turn by turn', h('span', { text: plural(s.turns, 'turn') })),
    ribbon,
    h('h4', { text: 'Tactics' }),
    h('div', { class: 'slots' }, tactics),
    moments.length ? [h('h4', { text: 'Moments' }), h('div', { class: 'moments' }, moments)] : null);
}
// XP from the foes the party felled goes to every character who fought (design §5). Returns what changed for each.
function awardXp(res) {
  const out = [];
  for (const u of res.start) {
    const c = u.side === 0 && u.char && Save.char(u.char);
    if (!c) continue;
    const before = { level: c.level, xp: c.xp };
    out.push({ c, before, g: Hero.gainXp(c, res.xp) });
  }
  if (res.loot && res.loot.gold) Save.state.currencies.gold += res.loot.gold;
  return out;
}
function showReport(res, opts = {}) {
  const stage = current.stage, won = res.winner === 0;
  if (!res.saved) {
    res.saved = true;
    const save = progress(), first = won && !save.cleared.includes(stage.id);
    if (first) save.cleared.push(stage.id);
    if (won) { const b = save.best[stage.id]; if (!b || res.rounds < b) save.best[stage.id] = res.rounds; }
    save.current = null; // the fight is over: a reload now returns to the road, not into this battle
    res.gains = awardXp(res);
    // The camp (js/base.js): fatigue, party items used, Renown, and a new recruit board once the party is home. With the
    // campaign (js/campaign.js) present, its hooks do this instead.
    if (typeof Base !== 'undefined' && typeof Campaign === 'undefined') res.base = Base.afterBattle(res, stage, { won, first, xpLv: (res.xp || 0) / Hero.xpToNext(stage.level || 1), heroes: res.gains.length, fatigue: true, home: true });
    Save.commit();
    // Level-ups are celebrated after the battle, before the report.
    if (res.gains.some(x => x.g.to > x.g.from) && !opts.report) { LevelUp.show(res.gains, res.xp, () => { closeSheet(); showReport(res, { report: true }); }, won); return; }
  }
  const again = reportView && reportView.res === res && !sheet.hidden;
  const v = reportView = Object.assign(again ? reportView : { res, side: 0, stat: 'dealt', sel: null }, opts);
  const S = res.stats, units = res.start.filter(u => u.side === v.side);
  const st = REPORT_STATS.find(x => x.k === v.stat);
  if (!units.some(u => u.id === v.sel)) v.sel = units.reduce((b, u) => (S[u.id].dealt > (b ? S[b.id].dealt : -1) ? u : b), null).id;
  const alive = {};
  for (const f of res.final) alive[f.id] = f.alive;
  const top = Math.max(1, ...units.map(u => S[u.id][st.k]));
  const kos = res.start.filter(u => u.side === 0).reduce((n, u) => n + S[u.id].falls, 0);
  const rows = units.map(u => {
    const val = S[u.id][st.k], sel = v.sel === u.id;
    return h('button', { class: 'line' + (sel ? ' sel' : '') + (alive[u.id] ? '' : ' down'), 'aria-pressed': sel ? 'true' : 'false', onclick: () => { sfx('click'); showReport(res, { sel: u.id }); } },
      h('img', { src: faceURL(u), alt: '' }),
      h('span', { class: 'nm' }, h('span', { class: 't', text: u.name }), alive[u.id] ? null : h('span', { class: 'ko', text: u.side === 0 ? 'KO' : 'Fell' })),
      h('span', { class: 'bar ' + (st.heal ? 'heal' : 'dmg') + (val && val === top ? ' top' : '') }, h('i', { style: `width:${Math.round(100 * val / top)}%` })),
      h('b', { class: val ? '' : 'zero', text: val ? fmt(val) : '–' }),
      h('span', { class: 'chev', 'aria-hidden': 'true' }));
  });
  const nextI = current.index + 1 < STAGES.length ? current.index + 1 : -1;
  const actions = won
    ? [nextI >= 0 ? h('button', { class: 'btn primary', onclick: () => { sfx('click'); startStage(nextI); } }, 'Next stage', h('span', { class: 'sub', text: `${STAGES[nextI].id} · ${STAGES[nextI].name}` }))
      : h('button', { class: 'btn primary', onclick: () => { sfx('click'); App.go('home'); } }, 'The road is clear', h('span', { class: 'sub', text: 'Back to base' })),
    btn('Fight again', () => startStage(current.index)), btn('Road', showCamp)]
    : [btn('Try again', () => startStage(current.index), 'primary'), btn('Road', showCamp)];
  const box = h('div', { class: 'box report-box wide' },
    h('div', { class: 'rhead' },
      h('div', { class: 'rtitle' },
        h('div', { class: 'kicker ' + (won ? 'won' : 'lost'), text: `${won ? 'Victory' : 'Defeat'} · ${REGION_NAMES[stage.region].name} ${stage.id}` }),
        h('h2', { text: won ? `${stage.name} is clear` : `Driven back at ${stage.name}` }),
        h('p', { class: 'flavor', text: flavorLine(res, won) }),
        h('div', { class: 'badges' }, badge(`Round ${res.rounds}`), badge(`${res.actions} turns`), res.xp ? h('button', { class: 'badge xp', onclick: () => { sfx('click'); LevelUp.show(res.gains || [], res.xp, () => { closeSheet(); showReport(res, { report: true }); }, won); } }, ico('star'), `+${fmt(res.xp)} XP`, (res.gains || []).some(x => x.g.to > x.g.from) ? ' · level up' : '') : null, res.loot && res.loot.gold ? badge(`+${res.loot.gold} gold`, 'good', 'coin') : null,
          badge(kos ? plural(kos, 'knockout') : 'No knockouts', kos ? 'bad' : 'good'), res.rounds >= SIM.ENRAGE_ROUND ? badge('Enraged', 'bad', 'rage') : null,
          h('div', { class: 'sides', role: 'tablist', 'aria-label': 'Whose fight to show' }, [[0, 'Your party'], [1, 'Foes']].map(([id, label]) => h('button', { class: v.side === id ? 'on' : '', role: 'tab', 'aria-selected': v.side === id ? 'true' : 'false', onclick: () => { sfx('click'); showReport(res, { side: id, sel: null }); } }, label))))),
      h('div', { class: 'actions' }, actions)),
    h('div', { class: 'report' },
      h('div', { class: 'stabs' },
        h('div', { class: 'stats', role: 'tablist' }, REPORT_STATS.map(x => h('button', { class: 'stab ' + (x.heal ? 'heal' : 'dmg') + (x.k === v.stat ? ' on' : ''), role: 'tab', 'aria-selected': x.k === v.stat ? 'true' : 'false', title: x.tip, onclick: () => { sfx('click'); showReport(res, { stat: x.k }); } }, ico(x.icon), x.label))),
),
      h('div', { class: 'lines' }, rows),
      h('div', { class: 'line total' }, h('span'), h('span', { class: 'nm', text: `Total ${st.tip.toLowerCase()}` }), h('span'), h('b', { text: fmt(units.reduce((n, u) => n + S[u.id][st.k], 0)) }), h('span')),
      h('div', { class: 'seed', text: `Battle seed ${res.seed}` })),
    h('div', { class: 'side' }, characterCard(units.find(u => u.id === v.sel), res)));
  if (again) { box.classList.add('quiet'); sheet.replaceChildren(box); }
  else openSheet(box, 'report');
  reportRes = res;
  syncControls();
}

// ── settings and help
const toggle = (on, fn, label) => h('button', { class: 'small' + (on ? ' on' : ''), role: 'switch', 'aria-checked': on ? 'true' : 'false', 'aria-label': label, onclick: () => { fn(); sfx('click'); } }, on ? 'On' : 'Off');
function settingRows(redraw) {
  const st = Save.state.settings;
  const row = (name, desc, on, fn) => h('div', { class: 'setting' }, h('div', { class: 'nm', text: name }), h('div', { class: 'ds', text: desc }), toggle(on, () => { fn(); App.applySettings(true); Save.commit(); redraw(); }, name));
  return [
    row('Sound effects', 'Swords, spells and footfalls.', st.sfx, () => { st.sfx = !st.sfx; }),
    row('Reduced motion', 'No screen shake or flashes.', !st.motion, () => { st.motion = !st.motion; }),
  ];
}
function showHow(back) {
  setScreen(h('div', { class: 'page how' },
    h('button', { class: 'btn back', onclick: () => { sfx('click'); back(); } }, '← Back'),
    h('div', { class: 'kicker', text: 'Learn the road' }), h('h1', { text: 'How Battles Work' }),
    h('div', { class: 'rules-help' },
      h('h3', { text: 'Formation' }),
      h('p', { text: 'Each side has 2 in front and 4 behind. Melee attacks must hit the front row while anyone stands there. Ranged attacks and spells reach anyone. Lunge and the Reaping Hook leap past the front line, and a Guard pulls single-target attacks onto the tank.' }),
      h('h3', { text: 'Turn order' }),
      h('p', { text: 'Faster characters act more often. The flags along the top show who acts next and the skill each will use. The first flag is the turn being played, with the rule that chose it. Tap any flag to read about its skill.' }),
      h('h3', { text: 'Rules' }),
      h('p', { text: 'Each character reads its rules from the top on every turn and uses the first one that is true and that it has the mana for. If none fits, it uses its basic attack.' }),
      h('h3', { text: 'Mana' }),
      h('p', { text: 'Skills cost mana (the blue bar). Basic attacks restore some, so skills come around on their own.' }),
      h('h3', { text: 'Enrage' }),
      h('p', { text: `From round ${SIM.ENRAGE_ROUND}, foes are enraged and hit harder every round, so no battle can stall.` }),
      h('h3', { text: 'Watching' }),
      h('p', { text: 'Battles are played in landscape: turn your phone sideways. They play on their own. Pause, then tap Turn to play one turn at a time; tap play to carry on. Change the speed between 1×, 2× and 4×, or skip to the result.' }),
      h('h3', { text: 'The report' }),
      h('p', { text: 'After each battle, pick a stat from the tabs to rank everyone by damage dealt or taken, or healing done or received. Tap a character to see every turn they took, how often each of their tactics fired, and their best moments. The next stage waits until you choose to march on.' }))));
}

// ── input
$('#bPlay').addEventListener('click', () => { sfx('click'); togglePlay(); });
$('#bStep').addEventListener('click', () => { sfx('click'); stepTurn(); });
$('#bSpeed').addEventListener('click', () => { sfx('click'); cycleSpeed(); });
$('#bSkip').addEventListener('click', onSkip);
$('#bMenu').addEventListener('click', () => { sfx('click'); openMenu(); });
$('#hudRound').addEventListener('click', e => toast(e.currentTarget.dataset.tip.replace('|', ': ')));
document.addEventListener('keydown', e => {
  if (e.target && e.target.tagName === 'INPUT') return;
  if (!sheet.hidden || !scr.hidden) {
    if (e.key !== 'Escape') return;
    if (!sheet.hidden && sheet.className === 'menu') resumeFromMenu();
    else if (!sheet.hidden && App.current !== 'battle') closeSheet();
    else if (!scr.hidden && App.current !== 'battle') closeScreen();
    return;
  }
  if (e.key === ' ' || e.key === 'p' || e.key === 'P') { e.preventDefault(); togglePlay(); }
  else if (e.key === 'n' || e.key === 'N' || e.key === 'ArrowRight') { e.preventDefault(); stepTurn(); }
  else if (e.key === 's' || e.key === 'S') onSkip();
  else if (e.key === 'f' || e.key === 'F') cycleSpeed();
  else if (e.key === 'Escape' && Battle.battle) openMenu();
});

// ── boot
// When the page is republished or reloaded, a viewer mid-battle gets the same battle again: the same seed replays it.
function boot(data) {
  Save.load();
  // The camp catches up on the time away: rest, lessons, idle buildings, the board and the free draught.
  if (typeof Base !== 'undefined') Base.start();
  if (data && Number.isInteger(data.stage) && STAGES[data.stage] && Number.isFinite(data.seed)) progress().current = { stage: data.stage, seed: data.seed };
  Battle.init();
  Battle.onPause = () => syncControls();
  App.start();
}
try {
  const hot = window.claude && window.claude.hot;
  if (hot && typeof hot.snapshot === 'function') hot.snapshot(() => (current && Battle.busy ? { stage: current.index, seed: current.seed } : {}));
} catch (e) { }
(() => {
  const hot = window.claude && window.claude.hot;
  if (hot && typeof hot.ready === 'function') hot.ready(boot);
  else boot((hot && hot.data) || {});
})();
