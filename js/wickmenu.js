'use strict';
// Lantern Road · Wick's menu (docs/first-session-spec.md §3): once the first session is over, a tap on Wick at the fire
// opens his panel, as Bess's opens hers (js/quests.js): Wick drawn large on the left with a hint in his bubble, and on
// the right the lessons seen so far, each a tap to hear again, and the Codex.
//   the hint     one line on what to do next: the first of HINTS that fits the save
//   Lessons      the session's (FirstSession.lessons(): The story, The road, Battles, Levels and stats, Gear,
//                Recruiting, Formation, Buildings, Quests), then each visit seen (Party items and tactics, Skill points,
//                Daily jobs, the first building). A tap closes the panel and replays it as soft steps, holding nothing back
//                (FirstSession.replayLesson, Visits.start, Bess's panel)
//   Codex        opens it (for now, Help: How battles work)
// It takes the place of Settings → Replay the guide; Settings points here. Anchors: wick-lesson (each, data-id),
// wick-codex. Styles in css/wick.css (wm-), with Bess's panel's layout (qs-, css/quests.css).
//   WickMenu.open() (false while the first session runs), WickMenu.close(), WickMenu.shown, WickMenu.hint(s)

const WickMenu = (() => {
  const st = () => (typeof Save !== 'undefined' ? Save.state : null);
  const click = () => sfx('click');
  const ico = (n, size) => h('img', { class: 'px', src: iconURL(UI_ICONS[n] ? n : 'star'), alt: '', width: size || 18, height: size || 18, draggable: 'false' });
  // The visits his menu lists once seen, by their names in the spec
  const VISIT_NAMES = { items: 'Party items and tactics', skills: 'Skill points', plan: 'The first building' };

  // ── the hint: the first that fits (§3)
  function claimable(s) {
    if (typeof Quests === 'undefined' || !Quests.here(s)) return false;
    if (Quests.story(s).state === 'done') return true;
    const D = Quests.today(s);
    return !!D && (D.jobs.some(j => j.done >= j.need && !j.claimed) || Quests.bonusReady(s));
  }
  function hint(s = st()) {
    const party = s.party.map(id => Save.char(id)).filter(Boolean), team = party.concat(s.roster.filter(c => !party.includes(c)));
    const pts = team.find(c => { const P = Hero.points(c); return P.stat > 0 || P.skill > 0; });
    if (pts) return `${pts.name} has points to spend.`;
    const better = party.some(c => SLOTS.some(k => s.inventory.items.some(x => { const D = Items.def(x); return D && D.slot === k && Items.canUse(c, x) && (!c.gear[k] || Items.score(x) > Items.score(c.gear[k]) + 0.5); })));
    if (better) return 'There’s gear in the bag nobody’s wearing.';
    const fi = Campaign.frontier(s), front = STAGES[fi], T = s.campaign.lastTrip;
    if (front && T && T.why && T.why.k === 'lost' && (T.fought || []).slice(-1)[0] === front.id) return `${front.id} beat you. More levels, better gear, or a new formation.`;
    if (party.length && party.filter(c => Fatigue.state(c) !== 'fresh').length * 2 > party.length) return 'They’re tired. Let them rest, or send fresh ones.';
    if (Base.boardOpen(s) && s.board.picks > 0 && Base.canHire(s) && party.length < 6 && s.board.recruits.some(r => Base.recruitPrice(r, s) <= s.currencies.gold)) return 'New faces on the board. You can afford one.';
    if (claimable(s)) return 'Bess has something for you.';
    if (typeof Quests !== 'undefined' && Quests.story(s).state === 'on') return `The Sexton’s at ${Quests.STORY.stage}. Keep clearing the road.`;
    return front ? `Next stretch is ${front.id}. The road’s waiting.` : 'Every stretch is cleared. The road’s yours.';
  }

  // ── what he can show you again
  function lessons(s = st()) {
    const out = typeof FirstSession !== 'undefined' ? FirstSession.lessons().map(L => Object.assign({ go: () => FirstSession.replayLesson(L.id) }, L)) : [];
    if (typeof Visits !== 'undefined') for (const id in Visits.VISITS) if (s.guide.visits && s.guide.visits[id] === 'seen') out.push({ id: 'visit:' + id, name: VISIT_NAMES[id] || Visits.VISITS[id].name, icon: Visits.VISITS[id].icon, go: () => Visits.start(id) });
    if (typeof Quests !== 'undefined' && s.quests && s.quests.jobs === 'seen') out.push({ id: 'jobs', name: 'Daily jobs', icon: 'scroll', go: () => { if (App.current !== 'home') App.go('home'); Quests.open({ line: Quests.LINES.jobsNew }); } });
    return out;
  }

  // ── his panel
  let P = null;
  const shown = () => !!P && P.isConnected;
  function open() {
    const s = st();
    if (!s || (typeof FirstSession !== 'undefined' && FirstSession.on)) return false;
    if (shown()) close();
    const K = Kit.panel({ icon: 'lantern', title: 'Old Wick', cls: 'wm-panel', onClose: close });
    const list = lessons(s).map(L => h('button', { class: 'wm-ls', type: 'button', 'data-tut': 'wick-lesson', 'data-id': L.id, onclick: () => { click(); close(); L.go(); } }, ico(L.icon), h('span', { text: L.name })));
    K.body.append(h('div', { class: 'wm-body' },
      h('div', { class: 'wm-hd' }, h('h4', { text: 'Lessons' })),
      h('div', { class: 'wm-list' }, list),
      h('div', { class: 'wm-foot' }, h('button', { class: 'kp-btn sec wm-codex', type: 'button', 'data-tut': 'wick-codex', onclick: () => { click(); close(); showHow(() => closeScreen()); } }, ico('book', 18), h('span', { text: 'Codex' })))));
    const say = h('div', { class: 'qs-say wm-say', role: 'note' }, h('b', { text: 'Wick' }), h('span', { text: hint(s) }));
    P = h('div', { class: 'qs wm' }, K.root, h('img', { class: 'qs-pt wm-pt', src: Wick.portraitURL(), alt: 'Old Wick', draggable: 'false' }), say);
    openSheet(P, 'wickmenu');
    return true;
  }
  function close() {
    const was = shown();
    P = null;
    if (was && !$('#sheet').hidden && $('#sheet').querySelector('.wm')) closeSheet();
  }
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && shown()) { e.preventDefault(); click(); close(); } });
  return { open, close, hint, lessons, get shown() { return shown(); } };
})();
