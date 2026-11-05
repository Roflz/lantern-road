'use strict';
// Lantern Road · the Battle screen and its controls, what the results popup's buttons do, the battle report, help, and boot.
// The other screens, settings and the shell live in js/app.js; the game state and saving in js/save.js.

const scr = $('#screen'), sheet = $('#sheet');
const progress = () => Save.state.campaign;
const speedSetting = () => Save.state.settings.speed;

let current = null;        // { index, stage, seed, res } for the battle on screen
let menuWasPaused = false; // whether the battle was paused before the menu opened
let reportRes = null;      // the battle the open report describes

function toast(text, cls = '') {
  const el = h('div', { class: 'toast ' + cls, text });
  $('#toasts').append(el); setTimeout(() => el.remove(), cls.includes('tip') ? 5600 : 2600);
  const all = $('#toasts').children; if (all.length > 3) all[0].remove();
}
function setScreen(el) { scr.replaceChildren(el); scr.hidden = false; scr.scrollTop = 0; }
function closeScreen() { scr.hidden = true; scr.replaceChildren(); }
function openSheet(el, cls = '') { const was = sheet.hidden; sheet.className = cls; sheet.replaceChildren(el); sheet.hidden = false; if (was && !cls.includes('report')) sfx('sheet'); }
// A sheet closes at once (the game moves on), and a copy of it slides away so the eye can follow it out.
function closeSheet() {
  const box = !sheet.hidden && sheet.firstElementChild;
  if (box && !noMotion() && sheet.className.includes('sheet-bottom')) {
    const ghost = h('div', { class: 'sheet-ghost ' + sheet.className, 'aria-hidden': 'true' }, box.cloneNode(true));
    ghost.inert = true;
    $('#frame').append(ghost);
    setTimeout(() => ghost.remove(), 240);
  }
  sheet.hidden = true; sheet.replaceChildren(); reportRes = null; reportView = null;
}
const btn = (label, fn, cls = '', sub) => h('button', { class: 'btn ' + cls, onclick: () => { sfx('click'); fn(); } }, label, sub ? h('span', { class: 'sub', text: sub }) : null);

// Leave the battle for the road (the Campaign Map).
function showCamp() { App.go('map'); }

// ── a battle on a trip
// The Battle screen. A battle under way is remembered in the save. On a reload while the page is republished, the same
// seed replays it; on a return after closing the app, it is resolved at once and the party comes home (boot, below).
App.screen('battle', {
  full: true,
  enter(p) { startStage(p.stage, p.seed); },
  leave() { walkToken++; hideBetween(); current = null; progress().current = null; Save.commit(); },
});
function startStage(i, seed) {
  closeScreen(); closeSheet(); hideBetween();
  const stage = STAGES[i];
  // Setting out from anywhere but the map (a reload, Try again): a trip starts here.
  if (!Campaign.trip()) Campaign.setOut(i);
  seed = seed != null ? seed : (Date.now() ^ (i * 7919)) >>> 0;
  Battle.play();
  current = { index: i, stage, seed, res: null };
  progress().current = { stage: i, seed };
  Save.commit();
  Guide.battleStart(i);
  current.res = Battle.run(stage, seed, { onEnd: res => afterBattle(res), first: true, setup: Campaign.setup(i, seed) });
  syncControls();
}
// The battle is over: rewards, XP, fatigue and unlocks are settled (js/campaign.js), then the party walks on, or the
// trip ends and the results popup shows what it brought home. res.home: the trip's summary, once it has ended.
function afterBattle(res) {
  if (!current || res.camp) return;
  const trip = !!Campaign.trip();
  const out = Campaign.afterBattle(res);
  res.camp = out; res.xp = out.r.xp; res.gains = out.r.gains; res.saved = true;
  res.home = trip && out.next == null ? progress().lastTrip : null;
  if (out.next == null) progress().current = null;
  Save.commit();
  Guide.battleEnd();
  afterTips(res);
  if (out.next != null) betweenBattles(res);
  else showResults(res);
}
// ── the party is home: the results popup (js/results.js), and what its buttons do. After a win, Next is the frontier;
// after a loss at the frontier, Farm is the stage before it, when that is lit (campaign spec §8.2: 1-9's wall).
function showResults(res) {
  const i = current.index, won = res.winner === 0, fr = Campaign.frontier(), T = res.home;
  // The popup is the trip's summary now: the Road tab's "Back from the road" card would only say it again.
  if (T && !T.seen) { T.seen = true; Save.commit(); }
  const farmI = !won && i === fr && fr > 0 && Campaign.isLit(STAGES[fr - 1].id) ? fr - 1 : -1;
  const go = k => () => { if (Campaign.setOut(k)) { Save.commit(); startStage(k); } else toast('No one is fit to set out.'); };
  Results.show(res, {
    index: i, trip: T && T.battles > 1 ? T : null,
    next: won && fr < STAGES.length && fr !== i ? STAGES[fr] : null,
    farm: farmI >= 0 ? STAGES[farmI] : null,
    on: {
      report: () => showReport(res),
      camp: () => App.go('home'),
      again: go(i),
      // Next will fly up the road once the road view is built; until then, the Road tab with the next stage's sheet.
      next: () => { RoadMap.show(STAGES[fr].region); RoadMap.stageSheet(fr); },
      farm: go(farmI),
    },
  });
}

// ── between battles (campaign spec §7.4): loot into the Bag, a level-up banner, the party rules checked, then the
// party walks on for about 3 seconds and the next battle starts where they stop. Report and Come home stay at hand.
const WALK_MS = 1400; // the walk between stages, in play time: about 3 seconds at 1× (tune)
let betweenEl = null, walkToken = 0;
function hideBetween() { if (betweenEl) { betweenEl.remove(); betweenEl = null; } }
function betweenBattles(res) {
  const c = res.camp, next = STAGES[c.next];
  hideBetween();
  const ups = res.gains.filter(x => x.g.to > x.g.from);
  const bar = h('i');
  betweenEl = h('div', { class: 'between', role: 'status' },
    h('div', { class: 'bt-head' }, h('span', { class: 'kicker won', text: `${current.stage.id} is clear` }), h('b', { text: next.id === current.stage.id ? `Again: ${next.name}` : `On to ${next.id} · ${next.name}` })),
    rewardChips(c, true),
    ups.length ? h('div', { class: 'bt-ups' }, ups.map(x => h('span', { class: 'lvup' }, ico('star'), `${x.c.name} · Lv ${x.g.to}`))) : null,
    c.left.length ? h('div', { class: 'bt-left', text: c.left.map(id => Save.char(id).name).join(', ') + (c.left.length > 1 ? ' are' : ' is') + ' Spent, and walks home alone.' }) : null,
    h('div', { class: 'bt-bar' }, bar),
    h('div', { class: 'bt-acts' },
      h('button', { class: 'btn', onclick: () => { sfx('click'); walkToken++; hideBetween(); showReport(res, { paused: true }); } }, 'Report'),
      h('button', { class: 'btn', onclick: () => { sfx('click'); comeHomeNow(res); } }, 'Come home')));
  $('#frame').append(betweenEl);
  if (ups.length) sfx('win');
  if (c.r.unlocks.length) sfx('unlock');
  Guide.between();
  walkOn(res, bar);
}
// The party walks on to the next stage; the next battle starts where they stop.
function walkOn(res, bar) {
  const T = Campaign.trip();
  if (!T || !current) return showCamp();
  const token = ++walkToken, real = WALK_MS / (0.5 * Math.max(1, Battle.speed));
  if (bar) requestAnimationFrame(() => requestAnimationFrame(() => { bar.style.transition = `width ${real}ms linear`; bar.style.width = '100%'; }));
  Battle.travel(window.__test && __test.fastWalk ? 0 : WALK_MS, () => { if (token !== walkToken || !current || !Campaign.trip()) return; hideBetween(); startStage(T.stage); });
}
// Come home from between battles: the trip ends here, and the results popup shows what it brought.
function comeHomeNow(res) {
  walkToken++; hideBetween();
  const why = { k: 'called', text: 'You called the party home.' };
  const home = Campaign.end(why);
  if (res && res.camp) { res.camp.next = null; res.camp.why = why; res.home = home; }
  Save.commit();
  if (res && current) showResults(res); else showCamp();
}

// Battle controls: play or pause, one turn at a time, speed, skip.
const ICON_PLAY = '<svg viewBox="0 0 10 10"><path d="M2 1v8l7-4z"/></svg>';
const ICON_PAUSE = '<svg viewBox="0 0 10 10"><path d="M2 1h2v8H2zM6 1h2v8H6z"/></svg>';
// Pause lets the turn on screen play out, then stops before the next turn; the button shows paused at once.
// The pause menu stops the clock at once, mid-move (openMenu).
const pausedNow = () => Battle.paused || Battle.pausing;
function togglePlay() {
  if (!Battle.busy) return;
  if (pausedNow()) Battle.play(); else Battle.pauseAfterTurn();
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
  const p = pausedNow(), b = $('#bPlay');
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
  const T = Campaign.trip();
  openSheet(h('div', { class: 'box' },
    h('div', { class: 'kicker', text: current ? `${current.stage.id} · ${current.stage.name}` : 'Paused' }),
    h('h2', { text: 'Paused' }),
    btn('Resume', resumeFromMenu, 'primary'),
    T && !T.home
      ? btn('Come home after this battle', () => { Campaign.callHome(); Save.commit(); toast('The party comes home after this battle'); resumeFromMenu(); }, '', 'The battle finishes first. Skip it to come home now.')
      : T ? h('p', { class: 'flavor', text: 'The party comes home after this battle.' }) : null,
    settingRows(() => openMenu(true)),
    btn('How battles work', () => { closeSheet(); showHow(() => { closeScreen(); openMenu(true); }); })), 'menu');
  syncControls();
}

// ── what a battle brought home: chips for gold, XP, materials, items, gear and unlocks
const RARITY_COLOR = { common: '#c9c2b0', fine: '#8cc4e6', rare: '#f1d36a', relic: '#ff9a5a' };
function rewardChips(camp, small) {
  const r = camp.r, kids = [];
  const chip = (cls, icon, text, title) => h('span', { class: 'rw ' + cls, title: title || text }, icon ? ico(icon) : null, text);
  if (r.gold) kids.push(chip('gold', 'coin', `+${fmt(r.gold)}`, `${r.spoilsGold} gold from the foes${r.clearGold ? `, ${r.clearGold} for the clear` : ''}`));
  if (r.xp) kids.push(chip('xp', 'star', `+${fmt(r.xp)} XP`, 'XP for each hero who fought'));
  for (const m of MATERIALS) if (r.mats[m.id]) kids.push(chip('mat', 'bone', `${m.name} ×${r.mats[m.id]}`));
  for (const id in r.items) kids.push(chip('item', ITEMS[id].icon, `${ITEMS[id].name}${r.items[id] > 1 ? ' ×' + r.items[id] : ''}`));
  for (const g of r.gear) {
    const D = Items.def(g.piece), rar = Items.rarity(g.piece);
    const el = chip('gear' + (g.sold ? ' sold' : ''), null, g.sold ? `${D.name} · sold +${g.sold}` : D.name, `${RARITY_NAMES[rar]} ${SLOT_NAMES[D.slot].toLowerCase()}${g.sold ? ': the Bag was full, so it sold where it dropped' : ', into the Bag'}`);
    el.style.setProperty('--rc', RARITY_COLOR[rar]);
    kids.push(el);
  }
  if (r.first && !small) kids.push(chip('first', 'lantern', 'First clear · gold and materials doubled'));
  for (const id of r.unlocks) { const U = UNLOCKS[id]; kids.push(chip('unlock', U.icon, U.kind === 'condition' ? `New condition: ${U.name}` : U.name, U.line || '')); }
  if (r.called) kids.push(chip('dim', null, `${r.called} called foe${r.called > 1 ? 's' : ''}: no spoils`));
  return h('div', { class: 'rewards' + (small ? ' compact' : '') }, kids.length ? kids : h('span', { class: 'rw dim', text: 'Nothing this time' }));
}
// What the trip did to each hero's fatigue, for the report.
function fatigueLine(camp) {
  const f = camp.r.fatigue, ids = Object.keys(f);
  if (!ids.length) return null;
  return h('div', { class: 'fatigues' }, ids.map(id => {
    const c = Save.char(id), x = f[id], lvl = x.after >= FATIGUE.SPENT ? 'spent' : x.after >= FATIGUE.EXHAUSTED ? 'exh' : x.after >= FATIGUE.WEARY ? 'weary' : '';
    return h('span', { class: 'fg ' + lvl, title: `${c.name}: +${x.gain} fatigue from ${x.gain} turns` }, h('img', { src: heroPortrait(c), alt: '' }), h('span', { class: 'fbar' }, h('i', { style: `width:${x.after}%` })), h('b', { text: Math.floor(x.after) }));
  }));
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
function showReport(res, opts = {}) {
  const stage = current.stage, won = res.winner === 0, camp = res.camp;
  const again = reportView && reportView.res === res && !sheet.hidden && sheet.classList.contains('report');
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
  // On a trip that carries on (the report was opened between battles): walk on, or come home. Once the trip is over
  // the report opens from the results popup (js/results.js). Its close button stays in the corner as the report
  // scrolls: back to the results, or between battles, on with the walk.
  const going = camp && camp.next != null && Campaign.trip();
  const walkOn = () => { sfx('click'); closeSheet(); betweenBattles(res); };
  const actions = going
    ? [h('button', { class: 'btn primary', onclick: walkOn }, 'Walk on', h('span', { class: 'sub', text: `${STAGES[camp.next].id} · ${STAGES[camp.next].name}` })), btn('Come home', () => comeHomeNow(res))]
    : [];
  const close = h('button', { class: 'sheet-x', 'aria-label': going ? 'Close the report and walk on' : 'Back to the results',
    onclick: going ? walkOn : () => { sfx('click'); if (Results.res === res) Results.reopen(); else showCamp(); } }, '×');
  // Why the trip ended, and after a loss, the stage's hint first (campaign spec §8.1). The first loss also says what
  // a loss costs.
  if (!won && res.firstLoss == null) res.firstLoss = Guide.once('lossnote');
  const why = camp && camp.why && !going ? h('div', { class: 'why ' + camp.why.k }, camp.why.hint ? h('p', { class: 'hint' }, ico('book'), camp.why.hint) : null, h('span', { text: camp.why.text }),
    !won && res.firstLoss ? h('span', { class: 'note', text: 'A loss costs only time and fatigue. Farm a lit stage for XP and gear, then try again.' }) : null) : null;
  const box = h('div', { class: 'box report-box wide' },
    h('div', { class: 'rhead' },
      h('div', { class: 'rtitle' },
        h('div', { class: 'kicker ' + (won ? 'won' : 'lost'), text: `${won ? 'Victory' : 'Defeat'} · ${REGION_NAMES[stage.region].name} ${stage.id}` }),
        h('h2', { text: won ? `${stage.name} is clear` : `Driven back at ${stage.name}` }),
        h('p', { class: 'flavor', text: flavorLine(res, won) }),
        h('div', { class: 'badges' }, badge(`Round ${res.rounds}`), badge(`${res.actions} turns`),
          badge(kos ? plural(kos, 'knockout') : 'No knockouts', kos ? 'bad' : 'good'), res.rounds >= SIM.ENRAGE_ROUND ? badge('Enraged', 'bad', 'rage') : null,
          h('div', { class: 'sides', role: 'tablist', 'aria-label': 'Whose fight to show' }, [[0, 'Your party'], [1, 'Foes']].map(([id, label]) => h('button', { class: v.side === id ? 'on' : '', role: 'tab', 'aria-selected': v.side === id ? 'true' : 'false', onclick: () => { sfx('click'); showReport(res, { side: id, sel: null }); } }, label))))),
      h('div', { class: 'rside' }, actions.length ? h('div', { class: 'actions' }, actions) : null, why, camp ? rewardChips(camp) : null, camp ? fatigueLine(camp) : null)),
    h('div', { class: 'report' },
      h('div', { class: 'stabs' },
        h('div', { class: 'stats', role: 'tablist' }, REPORT_STATS.map(x => h('button', { class: 'stab ' + (x.heal ? 'heal' : 'dmg') + (x.k === v.stat ? ' on' : ''), role: 'tab', 'aria-selected': x.k === v.stat ? 'true' : 'false', title: x.tip, onclick: () => { sfx('click'); showReport(res, { stat: x.k }); } }, ico(x.icon), x.label))),
),
      h('div', { class: 'lines' }, rows),
      h('div', { class: 'line total' }, h('span'), h('span', { class: 'nm', text: `Total ${st.tip.toLowerCase()}` }), h('span'), h('b', { text: fmt(units.reduce((n, u) => n + S[u.id][st.k], 0)) }), h('span')),
      h('div', { class: 'seed', text: `Battle seed ${res.seed}` })),
    h('div', { class: 'side' }, characterCard(units.find(u => u.id === v.sel), res)));
  const wrap = h('div', { class: 'report-wrap' }, box, close);
  // Redrawn in place (a tab, a side, a character): it keeps where it was scrolled to.
  if (again) { const old = sheet.querySelector('.report-box'), y = old ? old.scrollTop : 0; box.classList.add('quiet'); sheet.replaceChildren(wrap); box.scrollTop = y; }
  else {
    // A battle tip still showing would sit over the report: it has had its moment.
    for (const t of $('#toasts').querySelectorAll('.toast.tip')) t.remove();
    Guide.clear();
    openSheet(wrap, 'report');
  }
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
    h('button', { class: 'btn back', onclick: () => { sfx('click'); back(); } }, '‹ Back'),
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
      h('h3', { text: 'Party items' }),
      h('p', { text: 'From 1-3 the party packs items, like Healing Draughts. A party rule can use them, or tap one beside the controls to use it at once.' }),
      h('h3', { text: 'Watching' }),
      h('p', { text: 'Battles are played in landscape: turn your phone sideways. They play on their own. Pause, then tap Turn to play one turn at a time; tap play to carry on. Change the speed between 1×, 2× and 4×, or skip to the result.' }),
      h('h3', { text: 'The road' }),
      h('p', { text: 'With Keep going on, the party walks on after a win to the next stage, until a party rule, a loss, a boss or fatigue brings it home. Every turn a hero takes adds a point of fatigue; they rest at camp.' }),
      h('h3', { text: 'The report' }),
      h('p', { text: 'After each battle, pick a stat from the tabs to rank everyone by damage dealt or taken, or healing done or received. Tap a character to see every turn they took, how often each of their tactics fired, and their best moments.' }))));
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
  if (Title.up) return; // the title takes its own keys: Enter or Space begins, Escape closes the servers
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
// Every boot opens on the title (js/title.js), which loads the game behind its lanterns: the fonts, the sprites, and
// the save with its cloud copy. One tap begins.
// When the page is republished or reloaded, a viewer mid-battle gets the same battle again: the same seed replays it.
let hotData = null;
function boot(data) {
  hotData = data || null;
  Title.run({ load: loadSave, prepare: prepareSave, begin });
}
// The last server's save, then its cloud copy when the page runs as an artifact. The title waits up to 6 seconds for
// the cloud; a copy that comes later still replaces the save.
async function loadSave(report) {
  Save.load();
  report('save', 1);
  await Promise.race([Save.initCloud(), new Promise(r => setTimeout(r, 6000))]);
  report('cloud', 1);
}
// The save the title opens on, made ready to play: once at boot (first), and again for another server's save.
function prepareSave(first) {
  Campaign.ensure();
  // The camp listens to the road from the start, so a battle resolved below still counts for Renown and items.
  if (typeof Base !== 'undefined') Base.prepare();
  // Republished while a battle played: the same seed replays it. Back after closing the app: the battle that was
  // under way is resolved now, and the party comes home (campaign spec §7.5). Nothing played while the app was closed.
  const data = first ? hotData : null;
  if (data && Number.isInteger(data.stage) && STAGES[data.stage] && Number.isFinite(data.seed)) progress().current = { stage: data.stage, seed: data.seed };
  else if (progress().current) resolveClosed();
  // The camp catches up on the time away (js/base.js): rest, lessons, idle buildings, the board and the free draught.
  if (typeof Base !== 'undefined') Base.start();
}
// The tap on the title: a returning player goes to camp (or the battle under way), with "While you were away" first
// after 5 minutes or more; a new save goes on to the first pick.
function begin() {
  Battle.init();
  Battle.onPause = () => syncControls();
  Battle.onEvent = battleTip;
  App.start();
  startMusic();
  if (progress().rebuilt) { delete progress().rebuilt; Save.commit(); setTimeout(() => toast('The road was rebuilt: Region I has 18 stages now. Your heroes keep their levels and gear.', 'tip'), 600); }
}
// The battle under way when the app closed: resolved from its seed, its rewards settled, and the trip over.
function resolveClosed() {
  const cur = progress().current;
  try {
    if (!Campaign.trip()) Campaign.setOut(cur.stage);
    const res = simulate(Campaign.setup(cur.stage, cur.seed));
    const out = Campaign.afterBattle(res, Save.state, { closed: true });
    if (out.next != null || Campaign.trip()) Campaign.end({ k: 'closed', text: 'The app closed, so the party came home after that battle.' });
  } catch (e) { console.warn('Lantern Road: the battle under way could not be resolved', e); Campaign.end({ k: 'closed', text: 'The party came home.' }); }
  progress().current = null;
  Save.commit();
}

// ── first-time tips (campaign spec §8.3): one line, the first time something happens, never blocking the battle
const TIPS = {
  bleed: 'Bleeding: loses health each turn. Healing doesn’t stop it.',
  marked: 'Marked: a big hit lands on this hero next turn. Guard them, or kill the one charging.',
  enrage: 'Enraged: from round 15 foes hit harder every round.',
  fell: 'Knocked out: back up after the battle, at full health. “Ally: fallen” is now a condition.',
  step: 'A melee foe in the back row waits, and steps up when a front slot opens.',
  called: 'Called foes drop no spoils. Kill the one calling them.',
  // the first session's fatigue line, moved here: it comes the first time a hero gets tired (tutorial study §5)
  weary: 'Weary: every turn tires a hero a little. They rest at the Hearth.',
  stat: 'A stat point: spend it on the hero’s Stats tab.',
  skill: 'A skill point: learn a tier-1 skill, then choose which one to equip.',
  // Regions II–V (build step 7b): their new foes, the first time each trick is played
  hidden: 'Hidden: single-target attacks can’t aim at it until it attacks. Hits on a whole row still reach it.',
  lured: 'Lured: a foe pulled a hero out of the back row. Move resistance holds them in place.',
  thorns: 'Thorns: this foe hurts whoever strikes it. Ranged and magic attacks take the sting too.',
  drain: 'Mana drain: the foe steals a hero’s mana and heals itself with it.',
  regen: 'Regenerating: this foe heals at the start of every turn. Hit it hard and fast.',
  splash: 'Splash: a heavy blow on the front row spills onto the hero behind.',
  threshold: 'A threshold: choose what it opens on the hero’s Skills tab, the next tier or more.',
  move: 'Move: a rule sent this hero to the other row. It costs the turn.',
  gather: 'Gather: no attack this turn, but twice the mana back.',
};
function showTip(k, text) { Guide.tip(k, text || TIPS[k]); }
const isHeroId = id => /^p\d$/.test(id);
function battleTip(e) {
  if (!current) return;
  Guide.battleEvent(e);
  // A foe that starts the battle Hidden (Region III's Hanged Man): said at the first turn, before anyone misses it.
  if (e.t === 'turn' && current.res && current.res.start.some(u => u.side === 1 && u.st && u.st.hidden)) showTip('hidden');
  if (e.t === 'act' && isHeroId(e.who) && (e.skill === 'move' || e.skill === 'gather')) showTip(e.skill);
  if (e.t === 'status' && e.on && isHeroId(e.who) && (e.key === 'bleed' || e.key === 'marked')) showTip(e.key);
  else if (e.t === 'hit' && e.guard && e.tgt[0] === 'f') {
    const g = current.res && current.res.start.find(u => u.id === e.tgt);
    showTip('guarded', `Guarded: ${g ? (/^The /.test(g.name) ? g.name.replace(/^The /, 'the ') : g.name) : 'a foe'} took that hit for its ally.`);
  } else if (e.t === 'enrage') showTip('enrage');
  else if (e.t === 'die' && isHeroId(e.who)) showTip('fell');
  else if (e.t === 'step') showTip('step');
  else if (e.t === 'summon' && e.unit.side === 1) showTip('called');
  else if (e.t === 'miss' && e.why === 'hidden') showTip('hidden');
  else if (e.t === 'swap' && e.why === 'lure' && [e.a, e.b].some(id => id && isHeroId(id))) showTip('lured');
  else if (e.t === 'counter' && e.why === 'thorns' && isHeroId(e.tgt)) showTip('thorns');
  else if (e.t === 'heal' && (e.how === 'drain' || e.how === 'regen') && e.tgt && e.tgt[0] === 'f') showTip(e.how);
  else if (e.t === 'hit' && e.splash && isHeroId(e.tgt)) showTip('splash');
}
function afterTips(res) {
  const f = res.camp.r.fatigue;
  if (Object.values(f).some(x => x.before < FATIGUE.WEARY && x.after >= FATIGUE.WEARY)) showTip('weary');
  if (res.gains.some(x => x.g.to > x.g.from)) showTip('stat');
  if (res.gains.some(x => x.g.skillPts > 0)) showTip('skill');
  if (res.gains.some(x => x.g.thresholds && x.g.thresholds.length)) showTip('threshold');
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
