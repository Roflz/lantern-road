'use strict';
// Lantern Road · Wick's unlock visits (onboarding spec §6.5). What a first clear opens gets three things:
//   1. a line on the results popup: its New chip, such as "New: Party items" (js/results.js)
//   2. Wick's card back at the Hearth: its icon, its name and one line, with Show me or Later
//   3. Show me: a soft visit of two to four steps on the screen it opened. Soft: a press anywhere goes on (and still
//      does what it pressed), and nothing is held back. Later: the goal tracker carries it until it's seen (js/camp.js).
// The first is Party items, at 1-3's first clear (docs/tutorial-study.md §5, pick 3): the Tactics screen, where the
// party's draught tactic is the first when → do, then the hero's own tactics. Another unlock gets its own entry in VISITS.
// A visit stands in for the coach marks it says (covers: js/guide.js), which are marked seen once it's over. With
// Settings → First-time tips off there's no card and no steps: the goal tracker still carries it, and its Go opens the
// screen. The forced first session comes first (js/firstsession.js): no card while it runs.
// Saved in save.guide.visits: { id: 'new' (earned, the card not answered) | 'later' | 'seen' }.

const Visits = (() => {
  const st = () => (typeof Save !== 'undefined' ? Save.state : null);
  const q = sel => document.querySelector(sel);
  const safe = fn => { try { return !!fn(); } catch (e) { return false; } };
  const tipsOn = () => { const s = st(); return !!s && s.settings.tips !== false; };
  const lead = s => s.party.map(id => Save.char(id)).find(Boolean) || s.roster[0] || null;
  const onTactics = owner => App.current === 'tactics' && typeof TacticsEditor !== 'undefined' && TacticsEditor.owner === owner && !!q('[data-tut=tactics-row-1]');
  // id: { icon, name, line (the card's), goal (the tracker's), screen (where the visit happens), open(), steps, covers }
  // A step: { before() (once, as it comes up), unless() (passed over), at() (its moment), show() (Wick.show's options) }
  const VISITS = {
    items: {
      icon: 'flask', name: 'Party items', line: 'Two Healing Draughts, and a tactic that uses them.', goal: 'Party items', screen: 'tactics',
      open: () => App.actions.tactics('party', 'home'),
      steps: [
        // the party's draught tactic, "Ally: health below 50% → Healing Draught": the plainest when → do
        { at: () => onTactics('party'), show: () => ({ target: '[data-tut=tactics-row-1]', pad: 4, say: 'When an ally’s hurt, the party drinks a draught. That’s a tactic.' }) },
        // the hero's own
        { before: () => { const c = lead(st()); if (c) TacticsEditor.setOwner(c.id); }, at: () => { const c = lead(st()); return !!c && onTactics(c.id); }, show: () => ({ target: '.tx-main .tx-list', pad: 4, say: 'Your hero has tactics like this too.' }) },
        // what the old first session said on the hero's tactics, unless the Tactics screen's coach mark has said it
        { unless: () => typeof Guide !== 'undefined' && Guide.seen('c:tactics'), at: () => { const c = lead(st()); return !!c && onTactics(c.id); }, show: () => ({ target: '.tx-main .tx-list', pad: 4, say: 'Tactics run from the top. The first one that fits is used.' }) },
      ],
      covers: ['c:tactics'],
    },
  };

  // ── where the player is: the Hearth, still, with nothing over it
  const atHearth = () => {
    const c = App.current === 'home' && typeof Camp !== 'undefined' ? Camp.scene : null;
    return !!c && !c.onRoad && c.road < 0.01 && $('#sheet').hidden && $('#screen').hidden && !!q('.camp [data-tut=hearth-setout]');
  };
  const busy = () => (typeof Title !== 'undefined' && Title.up) || (typeof FirstSession !== 'undefined' && FirstSession.on) || !!Wick.step || !!Wick.soft;
  const state = (id, s = st()) => (s && s.guide.visits ? s.guide.visits[id] || null : null);
  function mark(id, v) { const s = st(); if (!s) return; if (!s.guide.visits) s.guide.visits = {}; s.guide.visits[id] = v; Save.commit(); }

  // ── the card at the Hearth: icon, name, one line, Show me or Later
  let card = null; // Wick.show's handle
  function showCard(id) {
    const V = VISITS[id], click = () => { if (typeof sfx === 'function') sfx('click'); };
    const pick = fn => () => { click(); const h0 = card; card = null; if (h0) h0.close(); fn(); };
    const el = h('div', { class: 'wk-card', role: 'dialog', 'aria-label': `New: ${V.name}` },
      h('img', { class: 'wk-card-pt', src: Wick.portraitURL(), alt: 'Old Wick', draggable: 'false' }),
      h('div', { class: 'wk-card-box' },
        h('div', { class: 'wk-card-hd' }, h('span', { class: 'wk-card-ic' }, h('img', { src: iconURL(V.icon), alt: '', draggable: 'false' })), h('b', { text: 'New' })),
        h('div', { class: 'wk-card-nm', text: V.name }),
        h('p', { text: V.line }),
        h('div', { class: 'wk-card-acts' },
          h('button', { class: 'wk-card-b', type: 'button', 'data-tut': 'visit-later', onclick: pick(() => { mark(id, 'later'); if (typeof App !== 'undefined') App.refresh(); }) }, 'Later'),
          h('button', { class: 'wk-card-b pri', type: 'button', 'data-tut': 'visit-show', onclick: pick(() => start(id)) }, 'Show me'))));
    if (typeof sfx === 'function') sfx('unlock');
    card = Wick.show({ ui: el, tap: 'none', onDone: () => { card = null; } });
  }

  // ── the visit
  let run = null; // { id, k (the step), H (on show), prepped, since }
  // Show me (or the goal tracker's Go, or the New chip): the screen, and Wick's steps on it.
  function start(id) {
    const V = VISITS[id], s = st();
    if (!V || !s) return;
    mark(id, 'seen');
    run = tipsOn() ? { id, k: 0, H: null, prepped: false, since: Date.now() } : null;
    V.open();
    if (!run) done(V);
  }
  function done(V) { const s = st(); if (s) { for (const k of V.covers || []) if (!s.campaign.tips[k]) s.campaign.tips[k] = Date.now(); Save.commit(); } }
  function end() {
    if (!run) return;
    const r = run;
    run = null;
    if (r.H) r.H.close();
    done(VISITS[r.id]);
  }
  function step() {
    const V = VISITS[run.id];
    if (run.H) return;
    // the visit ends after its last step, or when its screen is left
    if (run.k >= V.steps.length || App.current !== V.screen) { end(); return; }
    const S = V.steps[run.k];
    if (S.unless && safe(S.unless)) { run.k++; run.prepped = false; return; }
    if (S.before && !run.prepped) { run.prepped = true; try { S.before(); } catch (e) { } }
    if (!safe(S.at)) { if (Date.now() - run.since > 4000) end(); return; }
    const r = run;
    r.H = Wick.show(Object.assign({}, S.show(), { tap: 'free', onDone: () => { r.H = null; r.k++; r.prepped = false; r.since = Date.now(); } }));
  }
  let seenSave = null;
  function tick() {
    const s = st();
    if (!s) return;
    // another save took this one's place (Start over, the cloud's copy): its card or visit goes
    if (s !== seenSave) { const was = seenSave; seenSave = s; if (was) { if (card) { const h0 = card; card = null; h0.close(); } if (run) { const r = run; run = null; if (r.H) r.H.close(); } } }
    if (run) { step(); return; }
    if (card || busy() || !tipsOn() || !atHearth()) return;
    const id = Object.keys(VISITS).find(k => state(k, s) === 'new');
    if (id) showCard(id);
  }
  setInterval(() => { try { tick(); } catch (e) { console.warn('Lantern Road: an unlock visit', e); } }, 250);

  // A first clear in a battle earns the card (not the Prototype tools' lights, nor a save from before this build).
  if (typeof Campaign !== 'undefined' && Campaign.onSettle) Campaign.onSettle((r, stage, res, s) => {
    for (const id of (r && r.unlocks) || []) if (VISITS[id] && s && s.guide && !(s.guide.visits && s.guide.visits[id])) { if (!s.guide.visits) s.guide.visits = {}; s.guide.visits[id] = 'new'; }
  });

  // The goal tracker (js/camp.js): a visit earned and not yet seen, with Go to start it.
  function goal(s = st()) {
    const id = s && Object.keys(VISITS).find(k => ['new', 'later'].includes(state(k, s)));
    return id ? { text: VISITS[id].goal, go: () => start(id) } : null;
  }
  // Whether a visit is still to be seen (the New chip starts it, js/guide.js).
  const waiting = id => !!VISITS[id] && state(id) !== 'seen' && !!state(id);
  return { VISITS, start, goal, waiting, get on() { return !!run; }, get card() { return !!card; }, get step() { return run ? run.k : -1; } };
})();
