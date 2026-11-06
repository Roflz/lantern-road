'use strict';
// Lantern Road · the app shell: screens, the tab bar, the purse, settings and the "while you were away" note.
// The Home Base (the camp around the fire) is js/camp.js. The Road tab is js/map.js, and the battle is a screen too;
// js/main.js registers it.
//
// A screen is registered with App.screen(name, def):
//   def.full    true for a screen built for the landscape frame, drawn on the whole stage (the battle). Every other
//               screen keeps its portrait layout in the frame's centred column until it is redesigned (js/frame.js).
//   def.tab     true to show the top bar and tab bar (and to slide between tabs)
//   def.bare    with tab: no top bar or tab bar (the camp draws its own HUD)
//   def.refresh (params) => void: App.refresh() calls it instead of building the screen again (the camp updates in place)
//   def.parent  the tab to light while it shows (the hero sheet lights Party)
//   def.render  (params) => element: builds the screen's page, every time it is shown
//   def.enter   (params) => void: called after it is shown (the battle starts its fight here)
//   def.leave   () => void: called before another screen replaces it
// App.go(name, params) moves between screens. App.refresh() rebuilds the current one after the state changes.

const App = (() => {
  const shell = $('#shell'), views = $('#views'), tabbar = $('#tabbar'), purse = $('#purse');
  const screens = {};
  const TABS = [
    { id: 'home', label: 'Hearth', icon: 'kindle' },
    { id: 'map', label: 'Road', icon: 'lantern' },
    { id: 'party', label: 'Party', icon: 'shield' },
    { id: 'bag', label: 'Bag', icon: 'bag' },          // js/bag.js
  ];
  let cur = null, curParams = {};
  const actions = {}; // hooks other modules fill in, e.g. actions.tactics(charId) opens the rules editor
  const awayGains = []; // (ms, state) => [{ icon, text }]: what idle buildings made while the player was away
  const G = () => (typeof Guide !== 'undefined' ? Guide : null); // the first hour's teaching (js/guide.js)
  const fast = () => noMotion();

  function screen(name, def) { screens[name] = def; }

  function go(name, params = {}, opts = {}) {
    const def = screens[name];
    if (!def) return;
    const prev = cur ? screens[cur] : null;
    if (prev && prev.leave) prev.leave(name);
    const from = cur;
    cur = name; curParams = params;
    closeSheet();
    Frame.column(!def.full);
    if (def.tab) {
      const el = def.render(params);
      el.classList.add('view');
      shell.classList.toggle('bare', !!def.bare);
      // Slide toward the tab you picked; fade when coming from somewhere with no tab. Between the whole stage and the
      // column there's nothing to slide: the old screen goes at once.
      const ti = TABS.findIndex(t => t.id === name), fi = TABS.findIndex(t => t.id === from);
      const dir = fi < 0 || ti < 0 || ti === fi ? 0 : ti > fi ? 1 : -1;
      const old = [...views.children], reshaped = !!prev && !!prev.full !== !!def.full;
      if (fast() || opts.instant || reshaped) old.forEach(o => o.remove());
      else old.forEach(o => { o.classList.add('out'); o.style.setProperty('--dir', -dir); o.inert = true; setTimeout(() => o.remove(), 260); });
      if (!fast() && !opts.instant) { el.classList.add('in'); el.style.setProperty('--dir', dir); el.addEventListener('animationend', () => el.classList.remove('in'), { once: true }); }
      views.append(el);
      showShell(true);
      syncTabs();
      syncPurse();
      Save.touch();
    } else showShell(false);
    if (G()) { if (from !== name) G().clear(); G().visit(name); }
    if (def.enter) def.enter(params);
    if (G()) { if (from !== name) G().onScreen(name); syncTabs(); }
  }
  function refresh() {
    if (cur && screens[cur].refresh) { screens[cur].refresh(curParams); syncPurse(); syncTabs(); return; }
    if (cur && screens[cur].tab) go(cur, curParams, { instant: true }); else { syncPurse(); syncTabs(); }
  }
  function showShell(on) {
    if (on) { shell.hidden = false; shell.classList.remove('gone'); }
    else { shell.classList.add('gone'); views.replaceChildren(); shell.hidden = true; }
  }
  function syncTabs() {
    const lit = cur && screens[cur] && screens[cur].parent ? screens[cur].parent : cur;
    const dots = actions.dots ? actions.dots() : {};
    for (const b of tabbar.children) {
      const on = b.dataset.tab === lit;
      b.classList.toggle('on', on);
      b.classList.toggle('dot', !on && !!dots[b.dataset.tab]);
      b.setAttribute('aria-current', on ? 'page' : 'false');
    }
  }
  function syncPurse() {
    const s = Save.state, reached = Math.max(0, ...s.campaign.cleared.map(id => (STAGES.find(x => x.id === id) || { region: 0 }).region));
    purse.replaceChildren(
      h('span', { class: 'coin', title: 'Gold' }, h('i', { class: 'goldpip' }), h('b', { text: fmt(s.currencies.gold) })),
      // the staples of the regions reached, and a Trophy once you have one (its tooltip says what it is for)
      ...MATERIALS.filter(m => (!m.trophy && m.region <= reached) || (s.currencies.mats[m.id] || 0) > 0).map(m => h('span', { class: 'coin mat', title: m.trophy ? `${m.name}: ${matUse(m.id)}` : m.name }, ico(typeof Base !== 'undefined' ? Base.matIcon(m.id) : 'bone'), h('b', { text: fmt(s.currencies.mats[m.id] || 0) }))));
  }

  TABS.forEach(t => tabbar.append(h('button', { class: 'tab', 'data-tab': t.id, 'data-tut': 'tab-' + t.id, onclick: () => { if (cur !== t.id) { sfx('click'); go(t.id); } } }, ico(t.icon), h('span', { text: t.label }))));
  $('#tbSettings').append(ico('gear'));
  $('#tbSettings').setAttribute('data-wk-free', ''); // Settings takes a tap at every step of Wick's guide (js/wick.js)
  $('#tbSettings').addEventListener('click', () => { sfx('click'); openSettings(); });

  // ── shared pieces
  function sheetBox(kids, cls = '') {
    return h('div', { class: 'box ' + cls }, h('button', { class: 'sheet-x', 'aria-label': 'Close', onclick: () => { sfx('click'); closeSheet(); } }, '×'), kids);
  }
  const stageIndex = () => Math.min(Campaign.frontier(), STAGES.length - 1);
  const placeholder = (text) => h('p', { class: 'ph-note' }, h('span', { class: 'ph-tag', text: 'Placeholder' }), text);

  // The party waits on the road behind the tab screens. Only reset it when coming back from a battle (or at boot),
  // so moving between tabs doesn't make them jump.
  let resting = false;
  function restScene() {
    if (resting && !Battle.battle) return;
    Battle.idle(STAGES[stageIndex()].region);
    resting = true;
  }

  // ── Home Base: the camp around the fire is js/camp.js (build step 5), which registers the 'home' screen.

  // ── the formation's moves (Formation, js/formation.js, and the Hearth's party panel). The Party tab's screen,
  // 'party', is the Heroes list (js/heroes.js).
  // The Oathbound Gorget keeps its wearer in the front row (js/items.js): a move that would put them behind is refused.
  function frontLocked(moves) {
    for (const [id, slot] of moves) { const c = id && Save.char(id); if (c && slot >= 2 && Items.fixedFront(c)) { toast(`${c.name} wears the Oathbound Gorget: front row only`); return true; } }
    return false;
  }
  // Swaps two formation slots (either may be empty), as Arrange does. False when the Oathbound Gorget refuses it.
  function swapSlots(a, b) {
    const p = Save.state.party;
    if (a === b || a < 0 || b < 0 || a > 5 || b > 5) return false;
    if (frontLocked([[p[a], b], [p[b], a]])) return false;
    [p[a], p[b]] = [p[b], p[a]];
    Save.commit();
    return true;
  }
  // Puts a hero in a formation slot: from another slot they swap with whoever stands there; from the roster, whoever
  // stands there goes to rest. False when the Oathbound Gorget refuses it.
  function placeIn(slot, id) {
    const p = Save.state.party, was = p.indexOf(id);
    if (slot < 0 || slot > 5 || was === slot) return false;
    if (frontLocked([[id, slot], [p[slot], was]])) return false;
    if (was >= 0) p[was] = p[slot];
    p[slot] = id;
    Save.commit();
    return true;
  }
  // The hero card (js/sheet.js).
  function showCharacter(id, tab) {
    if (!Save.char(id)) return;
    if (actions.hero) actions.hero(id, tab);
  }

  // ── time away
  const AWAY_MIN = 5 * 60 * 1000; // shorter absences pass without a note (home-base spec §4, tune)
  function duration(ms) {
    const m = Math.floor(ms / 60000), hh = Math.floor(m / 60), d = Math.floor(hh / 24);
    if (d) return `${d}d ${hh % 24}h`;
    if (hh) return `${hh}h ${m % 60}m`;
    return `${Math.max(1, m)}m`;
  }
  function showAway(ms) {
    if (actions.away) return actions.away(ms);
    const gains = awayGains.flatMap(fn => { try { return fn(ms, Save.state) || []; } catch (e) { return []; } });
    openSheet(sheetBox([
      h('div', { class: 'kicker', text: 'While you were away' }),
      h('h2', { text: `Gone ${duration(ms)}` }),
      gains.length
        ? h('div', { class: 'gains' }, gains.map(g => h('div', { class: 'gain' }, ico(g.icon || 'lantern'), h('span', { text: g.text }))))
        : h('p', { class: 'flavor', text: 'The lantern burned low and the road kept quiet. Once idle buildings stand at the base, what they gather will be waiting here.' }),
      btn('Back to it', closeSheet, 'primary'),
    ], 'awaybox'), 'sheet-bottom');
  }

  // ── settings
  function openSettings(again) {
    const s = Save.state.settings;
    const row = (name, desc, on, fn) => h('div', { class: 'setting' }, h('div', { class: 'nm', text: name }), h('div', { class: 'ds', text: desc }),
      h('button', { class: 'small' + (on ? ' on' : ''), role: 'switch', 'aria-checked': on ? 'true' : 'false', 'aria-label': name, onclick: () => { fn(); applySettings(true); Save.commit(); sfx('click'); openSettings(true); } }, on ? 'On' : 'Off'));
    const ago = Save.info.savedAt ? Math.max(0, Math.round((Date.now() - Save.info.savedAt) / 1000)) : null;
    const box = sheetBox([
      h('div', { class: 'kicker', text: 'Make it yours' }), h('h2', { text: 'Settings' }),
      row('Sound effects', 'Swords, spells and footfalls.', s.sfx, () => { s.sfx = !s.sfx; }),
      // The music was switched off on 2026-11-03 (the drone sounded broken) until it is reworked: no switch until then.
      MUSIC_ON ? row('Music', 'A low drone and a sparse melody.', s.music, () => { s.music = !s.music; })
        : h('div', { class: 'setting off' }, h('div', { class: 'nm', text: 'Music' }), h('div', { class: 'ds', text: 'Being reworked: it comes back in a later build.' }), h('span', { class: 'ph-tag', text: 'Later' })),
      row('Reduced motion', 'No screen shake or flashes, and no sliding between screens.', !s.motion, () => { s.motion = !s.motion; }),
      row('First-time tips', 'A one-line tip the first time something happens, and a pointer to each new thing the road unlocks.', s.tips, () => { s.tips = !s.tips; }),
      // Wick's lessons are his menu now, by the fire (js/wickmenu.js)
      typeof WickMenu !== 'undefined' ? btn('Wick’s lessons', () => { closeSheet(); if (typeof FirstSession !== 'undefined' && FirstSession.on) { toast('Wick is showing you round already'); return; } if (App.current !== 'home') go('home'); WickMenu.open(); }, '', 'Tap Wick by the fire') : null,
      h('div', { class: 'savewhere', text: `Saved ${ago == null ? 'never' : ago < 5 ? 'just now' : ago < 60 ? ago + 's ago' : duration(ago * 1000) + ' ago'} · ${Save.info.cloud === 'off' ? 'this device only' : 'synced to your account'}` }),
      btn('How battles work', () => { closeSheet(); showHow(() => closeScreen()); }),
      actions.proto ? h('button', { class: 'btn pt-open', onclick: () => { sfx('click'); actions.proto(); } }, h('span', { class: 'ph-tag', text: 'Prototype' }), ' Prototype tools', h('span', { class: 'sub', text: 'Light the road, add gold and materials, train the party. For play-testing.' })) : null,
      btn('Start over', confirmReset, 'danger', 'Erase this save and begin again'),
    ], 'setbox' + (again ? ' quiet' : ''));
    const prev = again && $('#sheet .setbox'), y = prev ? prev.scrollTop : 0;
    openSheet(box, 'sheet-bottom');
    if (y) box.scrollTop = y;
  }
  function confirmReset() {
    openSheet(sheetBox([
      h('div', { class: 'kicker', text: 'Start over' }), h('h2', { text: 'Erase everything?' }),
      h('p', { class: 'flavor', text: 'Your party, progress and buildings will be gone. The previous save is kept as a backup on this device.' }),
      btn('Erase and start over', () => { Save.reset(); applySettings(); closeSheet(); go('home', {}, { instant: true }); toast('A new road begins'); }, 'danger'),
      btn('Keep my save', openSettings, 'primary'),
    ], 'setbox'), 'sheet-bottom');
  }
  // The audio module keeps its own copy of the settings; the save is the source of truth.
  // `byPlayer` is true when a tap changed them, the only time audio may start.
  function applySettings(byPlayer) {
    const s = Save.state.settings;
    Object.assign(settings, { sfx: s.sfx, music: s.music, motion: s.motion });
    saveSettings();
    document.body.classList.toggle('no-proto', s.proto === false); // hides every .proto-only control (js/proto.js)
    if (!settings.music) stopMusic(); else if (byPlayer) startMusic();
    Battle.setSpeed(s.speed);
  }

  // ── keeping the save fresh
  // lastSeen is refreshed every 30 seconds while open, and on hide, so time away is accurate to about that.
  setInterval(() => { if (!document.hidden) Save.touch(); }, 30000);
  let hiddenAt = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { hiddenAt = Date.now(); Save.flush(); return; }
    if (!Save.state) return; // still on the title, before the save has loaded
    // Back after a while with the page left open (a phone switching apps): count it as time away too.
    const ms = hiddenAt ? Date.now() - Save.state.lastSeen : 0;
    hiddenAt = 0;
    if (ms >= AWAY_MIN) {
      const a = Save.state.away;
      a.last = ms; a.total += ms; a.returns++; a.at = Date.now();
      Save.commit();
      if (cur && screens[cur].tab && !(typeof FirstSession !== 'undefined' && FirstSession.on)) showAway(ms);
    } else Save.touch();
  });
  window.addEventListener('pagehide', () => Save.flush());

  // Called once at boot, after the save has loaded.
  function start() {
    applySettings();
    Save.onReplace = () => { applySettings(); refresh(); toast('Loaded your save from your account'); };
    const info = Save.info;
    if (info.recovered === 'backup') toast('Your save was damaged. Restored the last good copy.', 'bad');
    else if (info.recovered === 'fresh') toast('Your save could not be read. Starting a new road.', 'bad');
    else if (info.source === 'legacy') toast('Carried your cleared stages over from the prototype');
    const c = Save.state.campaign.current, last = Save.state.campaign.lastTrip;
    if (c && STAGES[c.stage]) go('battle', { stage: c.stage, seed: c.seed });
    else {
      // Wick's first session (js/firstsession.js) keeps a new player at the Hearth: no road card, no time-away note
      const guided = typeof FirstSession !== 'undefined' && FirstSession.on;
      go(last && !last.seen && !guided ? 'map' : 'home', {}, { instant: true });
      if (info.awayMs >= AWAY_MIN && !guided) showAway(info.awayMs);
    }
    Save.initCloud();
  }

  return {
    screen, go, refresh, start, applySettings, actions, awayGains, showAway, showCharacter, openSettings, rest: restScene, syncTabs, swapSlots, placeIn, frontLocked,
    get current() { return cur; },
  };
})();
