'use strict';
// Lantern Road · the app shell: screens, the tab bar, the purse, settings and the "while you were away" note.
// The Home Base (the camp around the fire) is js/camp.js. The Road tab is js/map.js, and the battle is a screen too;
// js/main.js registers it.
//
// A screen is registered with App.screen(name, def):
//   def.full    true for a screen built for the landscape frame, drawn on the whole stage (the battle). Every other
//               screen keeps its portrait layout in the frame's centred column until it is redesigned (js/frame.js).
//   def.tab     true to show the top bar and tab bar (and to slide between tabs)
//   def.parent  the tab to light while it shows (the hero sheet lights Party)
//   def.render  (params) => element: builds the screen's page, every time it is shown
//   def.enter   (params) => void: called after it is shown (the battle starts its fight here)
//   def.leave   () => void: called before another screen replaces it
// App.go(name, params) moves between screens. App.refresh() rebuilds the current one after the state changes.

const App = (() => {
  const shell = $('#shell'), views = $('#views'), tabbar = $('#tabbar'), purse = $('#purse');
  const screens = {};
  const TABS = [
    { id: 'home', label: 'Base', icon: 'kindle' },
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
      // Slide toward the tab you picked; fade when coming from somewhere with no tab.
      const ti = TABS.findIndex(t => t.id === name), fi = TABS.findIndex(t => t.id === from);
      const dir = fi < 0 || ti < 0 || ti === fi ? 0 : ti > fi ? 1 : -1;
      const old = [...views.children];
      if (fast() || opts.instant) old.forEach(o => o.remove());
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
  function refresh() { if (cur && screens[cur].tab) go(cur, curParams, { instant: true }); else { syncPurse(); syncTabs(); } }
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
      ...MATERIALS.filter(m => m.region <= reached || (s.currencies.mats[m.id] || 0) > 0).map(m => h('span', { class: 'coin mat', title: m.name }, ico(typeof Base !== 'undefined' ? Base.matIcon(m.id) : 'bone'), h('b', { text: fmt(s.currencies.mats[m.id] || 0) }))));
  }

  TABS.forEach(t => tabbar.append(h('button', { class: 'tab', 'data-tab': t.id, onclick: () => { if (cur !== t.id) { sfx('click'); go(t.id); } } }, ico(t.icon), h('span', { text: t.label }))));
  $('#tbSettings').append(ico('gear'));
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

  // ── Party: the formation and the roster
  let arrange = null; // the formation slot picked while arranging, or -1 when arranging with none picked
  // The Oathbound Gorget keeps its wearer in the front row (js/items.js): a move that would put them behind is refused.
  function frontLocked(moves) {
    for (const [id, slot] of moves) { const c = id && Save.char(id); if (c && slot >= 2 && Items.fixedFront(c)) { toast(`${c.name} wears the Oathbound Gorget: front row only`); return true; } }
    return false;
  }
  function placeIn(slot, id) {
    const p = Save.state.party, was = p.indexOf(id);
    if (frontLocked([[id, slot], [p[slot], was]])) return;
    if (was >= 0) p[was] = p[slot];
    p[slot] = id;
    Save.commit();
  }
  screen('party', {
    tab: true,
    render() {
      const s = Save.state;
      // What a character has waiting: points to spend, or a threshold to choose.
      const flags = c => {
        const P = Hero.points(c), t = Hero.pending(c).length;
        return t ? h('span', { class: 'pflag t', title: 'A threshold to choose' }, ico('star')) : P.stat + P.skill > 0 ? h('span', { class: 'pflag', title: `${P.stat} stat and ${P.skill} skill points to spend`, text: String(P.stat + P.skill) }) : null;
      };
      const xpPct = c => (c.level >= HERO.CAP ? 100 : Math.min(100, 100 * c.xp / Hero.xpToNext(c.level)));
      // Arranging: tap a slot, then another slot to swap them, or a hero in the roster to put them there.
      const pickSlot = i => {
        sfx('click');
        if (arrange == null || arrange < 0) { arrange = i; refresh(); return; }
        if (arrange === i) { arrange = -1; refresh(); return; }
        const a = s.party[arrange], b = s.party[i];
        if (frontLocked([[a, i], [b, arrange]])) return;
        s.party[arrange] = b; s.party[i] = a; arrange = -1; Save.commit(); refresh();
      };
      const slot = i => {
        const c = Save.char(s.party[i]);
        if (arrange != null) return h('button', { class: 'pslot arr' + (c ? '' : ' empty') + (arrange === i ? ' sel' : ''), 'aria-pressed': arrange === i ? 'true' : 'false', onclick: () => pickSlot(i) },
          c ? [h('span', { class: 'pspr' }, h('img', { src: heroImgURL(c.cls, Items.look(c)), alt: '' })), h('b', { text: c.name }), h('span', { class: 'lv', text: 'Lv ' + c.level })] : h('span', { text: arrange === i ? 'Pick a hero' : 'Empty' }));
        if (!c) return h('div', { class: 'pslot empty' }, h('span', { text: 'Empty' }));
        return h('button', { class: 'pslot' + (typeof Fatigue !== 'undefined' && Fatigue.spent(c) ? ' spent' : ''), onclick: () => { sfx('click'); showCharacter(c.id); } },
          h('span', { class: 'pspr' }, h('img', { src: heroImgURL(c.cls, Items.look(c)), alt: '' })),
          h('b', { text: c.name }), h('span', { class: 'lv', text: 'Lv ' + c.level }), flags(c),
          h('span', { class: 'xp' }, h('i', { style: `width:${xpPct(c)}%` })), fat(c));
      };
      // Fatigue under each hero in the formation (js/rest.js): Weary, Exhausted and Spent show in their colours.
      const fat = c => (typeof Fatigue !== 'undefined' ? h('span', { class: 'fat ' + Fatigue.state(c), title: `Fatigue ${Math.floor(c.fatigue || 0)}` }, h('i', { style: `width:${Math.min(100, c.fatigue || 0)}%` })) : null);
      const n = s.party.filter(Boolean).length;
      const arrTools = arrange != null
        ? h('div', { class: 'arrbar' }, h('span', { text: arrange >= 0 ? 'Tap another slot to swap, or a hero below to put them here.' : 'Tap a slot to move a hero.' }),
          arrange >= 0 && s.party[arrange] && n > 1 ? h('button', { class: 'small', onclick: () => { sfx('click'); s.party[arrange] = null; arrange = -1; Save.commit(); refresh(); } }, 'Leave out') : null,
          h('button', { class: 'small on', onclick: () => { sfx('click'); arrange = null; refresh(); } }, 'Done'))
        : h('div', { class: 'arrbar' }, h('span', { text: `${n} of 6 set out · 2 in front, 4 behind` }), h('button', { class: 'small', onclick: () => { sfx('click'); arrange = -1; refresh(); } }, 'Arrange'));
      const cap = typeof Base !== 'undefined' ? Base.rosterCap(s) : null;
      return h('div', { class: 'party' },
        h('div', { class: 'kicker', text: cap ? `${s.roster.length} of ${cap} in the roster` : `${s.roster.length} in the roster` }), h('h1', { text: 'The Party' }),
        arrTools,
        h('h3', { class: 'sect', text: 'Front row' }), h('div', { class: 'prow front' }, [0, 1].map(slot)),
        h('h3', { class: 'sect', text: 'Back row' }), h('div', { class: 'prow back' }, [2, 3, 4, 5].map(slot)),
        h('h3', { class: 'sect', text: 'Roster' }),
        // The camp's rows (js/camp.js): where each hero is, their fatigue, and a swipe left to dismiss. While arranging,
        // a tap puts the hero in the slot picked.
        h('div', { class: 'roster' }, s.roster.map(c => actions.rosterRow && !(arrange != null && arrange >= 0) ? actions.rosterRow(c) : h('button', { class: 'rrow' + (s.party.includes(c.id) ? '' : ' bench'), onclick: () => { sfx('click'); if (arrange != null && arrange >= 0) { placeIn(arrange, c.id); arrange = -1; refresh(); } else showCharacter(c.id); } },
          h('img', { src: heroPortrait(c), alt: '' }),
          h('span', { class: 'nm' }, h('b', { text: c.name }), h('span', { text: c.classes.length > 1 ? c.classes.map(k => CLASSES[k].name).join(' + ') : CLASSES[c.cls].role })),
          h('span', { class: 'lv' }, flags(c), s.party.includes(c.id) ? '' : h('em', { class: 'benched', text: 'resting' }), 'Lv ' + c.level),
          h('span', { class: 'xp' }, h('i', { style: `width:${xpPct(c)}%` })),
          h('span', { class: 'chev', 'aria-hidden': 'true' })))),
        actions.recruitLink ? actions.recruitLink() : null);
    },
    enter: restScene,
  });

  // The hero sheet (js/sheet.js).
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
      if (cur && screens[cur].tab) showAway(ms);
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
      go(last && !last.seen ? 'map' : 'home', {}, { instant: true });
      if (info.awayMs >= AWAY_MIN) showAway(info.awayMs);
    }
    Save.initCloud();
  }

  return {
    screen, go, refresh, start, applySettings, actions, awayGains, showAway, showCharacter, openSettings, rest: restScene, syncTabs,
    get current() { return cur; },
  };
})();
