'use strict';
// Lantern Road · the hero sheet (build step 3): one character's Stats, Skills, Gear and Rules, after the screen
// mockups (docs/mockups/index.html, "Character sheet").
//   Stats   the sprite stage (watch a skill play on a training dummy), level and XP, points to spend, the stat grid with
//           resistances, and the equipped skills
//   Skills  the skill tree of each of the character's classes, tier by tier; a node's card learns, raises, awakens and
//           equips its skill
//   Gear    waits for build step 4      Rules  the character's rules, and the way into the rules editor
// Threshold choices, equipping and resistances open as sheets. Every change goes through the hero model (js/hero.js).

const HeroSheet = (() => {
  const ui = { id: null, tab: 'stats', pending: {}, cls: null, stageEl: null, stage: null, stageFor: null };
  const click = () => sfx('click');
  const char = () => Save.char(ui.id);
  const SHAPES = { foe: 'One foe', front: 'Front row', back: 'Back row', random3: '3 random foes', foes: 'All foes', ally: 'One ally', allies: 'All allies', self: 'Self', fallen: 'Fallen allies' };
  const STAT_ICONS = { hp: 'heart', mp: 'mana', pow: 'sword', def: 'shield', spd: 'boot', crit: 'star', dodge: 'feather' };
  const RES_ICONS = { stun: 'stun', move: 'boot', bleed: 'bleed', blight: 'poison', curse: 'doom', debuff: 'weak' };
  const roman = n => ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'][n] || String(n);
  const fmtStat = (k, v) => (k === 'spd' ? (Math.round(v * 10) / 10).toFixed(1) : k === 'crit' || k === 'dodge' ? Math.round(v) + '%' : fmt(v));
  const plural2 = (n, a, b) => `${n} ${n === 1 ? a : b}`;

  // ── the character with the points the player has placed but not yet confirmed
  function preview(c) {
    const p = JSON.parse(JSON.stringify(c));
    for (const k in ui.pending) Hero.allocate(p, k, ui.pending[k]);
    return p;
  }
  const pendingTotal = () => Object.values(ui.pending).reduce((a, b) => a + b, 0);
  function addPending(k) {
    const c = char(), p = preview(c);
    if (Hero.points(p).stat <= 0 || Hero.placed(p, k) >= Hero.capOf(k)) { sfx('miss'); return; }
    ui.pending[k] = (ui.pending[k] || 0) + 1;
    click(); draw();
  }
  function confirm() {
    const c = char();
    for (const k in ui.pending) Hero.allocate(c, k, ui.pending[k]);
    ui.pending = {};
    Save.commit(); sfx('kindle'); toast('Points placed'); draw();
  }

  // ── open, switch and redraw
  function open(id, tab) {
    if (ui.id !== id) { ui.pending = {}; ui.cls = null; }
    ui.id = id; if (tab) ui.tab = tab;
    App.go('hero', { id, tab: ui.tab });
  }
  function root() { return document.querySelector('#views .view.hs-view:not(.out)'); }
  function draw() {
    const v = root();
    if (!v) return;
    const y = v.scrollTop;
    v.replaceChildren(...build());
    v.scrollTop = y;
  }
  function others(d) {
    const ids = Save.state.party.filter(Boolean).concat(Save.state.roster.map(c => c.id).filter(x => !Save.state.party.includes(x)));
    const i = ids.indexOf(ui.id);
    return ids[(i + d + ids.length) % ids.length];
  }

  // ── the parts every tab shares
  function header(c) {
    const P = Hero.points(c), pend = Hero.pending(c).length;
    return h('div', { class: 'hs-top' },
      h('button', { class: 'hs-sq', 'aria-label': 'Back to the party', onclick: () => { click(); App.go('party'); } }, '‹'),
      h('div', { class: 'hs-name' }, h('h1', { text: c.name }),
        h('span', { class: 'hs-sub' }, h('b', { text: 'Lv ' + c.level }), ' · ', c.classes.map(k => CLASSES[k].name).join(' + '))),
      (P.skill > 0 || P.stat > 0 || pend) ? h('span', { class: 'hs-pts', title: 'Points to spend' }, pend ? ico('star') : null, `${P.stat + P.skill} pts`) : null,
      h('div', { class: 'hs-sw' },
        h('button', { class: 'hs-sq', 'aria-label': 'Previous hero', onclick: () => { click(); open(others(-1)); } }, '‹'),
        h('button', { class: 'hs-sq', 'aria-label': 'Next hero', onclick: () => { click(); open(others(1)); } }, '›')));
  }
  function tabs() {
    return h('div', { class: 'hs-seg', role: 'tablist' }, [['stats', 'Stats'], ['skills', 'Skills'], ['gear', 'Gear'], ['rules', 'Rules']].map(([k, n]) =>
      h('button', { class: ui.tab === k ? 'on' : '', role: 'tab', 'aria-selected': ui.tab === k ? 'true' : 'false', onclick: () => { if (ui.tab === k) return; click(); ui.tab = k; draw(); } }, n)));
  }
  // What a skill would do on the dummy: its damage or healing at the character's level.
  function playInfo(c, id) {
    const sk = SKILLS[id], L = c.skills[id] || 1, p = skillLevel(L, c.awakened.includes(id)), s = Hero.sheet(c);
    if (sk.power) return { num: Math.max(1, Math.round(s.pow * p.v(sk.power) * (sk.hits || 1))) };
    if (sk.heal || sk.healPct) return { heal: Math.round(s.pow * p.v(sk.heal || 0) + s.hp * p.v(sk.healPct || 0)) };
    if (sk.revive) return { tag: 'Raised' };
    const st = (sk.st || sk.self || [])[0];
    return { tag: st && STATUSES[st.k] ? STATUSES[st.k].name : sk.name };
  }
  function stageFor(c) {
    // One stage per hero, kept between redraws so the sprite doesn't flicker as points go in.
    if (ui.stageFor !== c.id || !ui.stageEl) {
      if (ui.stage) ui.stage.stop();
      ui.stageEl = h('div', { class: 'hs-stage', tabindex: '0', role: 'button', 'aria-label': `${c.name}’s battle sprite. Tap to play a skill.` });
      ui.stage = new SpriteStage(ui.stageEl, { cls: c.cls, scale: 6, hx: 0.3, ambient: [] });
      ui.stageFor = c.id;
      let k = 0;
      ui.stageEl.addEventListener('click', () => { const list = watchList(char()); const id = list[k++ % list.length]; play(id); });
    }
    const el = ui.stageEl;
    [...el.querySelectorAll('.hs-ov')].forEach(x => x.remove());
    const C = CLASSES[c.cls], need = Hero.xpToNext(c.level), row = Save.state.party.indexOf(c.id);
    el.append(
      h('div', { class: 'hs-ov who' }, h('span', { class: 'kicker', text: `${C.name} · ${C.role.split(':')[0]}` }), h('span', { class: 'hs-kv' }, h('b', { text: 'Lv ' + c.level }), row < 0 ? ' · resting' : row < 2 ? ' · front row' : ' · back row')),
      h('div', { class: 'hs-ov fat' }, h('span', { class: 'hs-tag ' + (c.fatigue >= 50 ? 'b' : 'g') }, ico('fatigue'), c.fatigue >= 75 ? `Exhausted ${c.fatigue}` : c.fatigue >= 50 ? `Weary ${c.fatigue}` : 'Rested'),
        h('span', { class: 'hs-k', text: 'Fatigue · step 5' })),
      h('div', { class: 'hs-ov xpbar' }, h('span', { class: 'hs-k', text: 'XP' }),
        h('div', { class: 'hs-meter' }, h('i', { style: `width:${c.level >= HERO.CAP ? 100 : Math.min(100, 100 * c.xp / need)}%` })),
        h('span', { class: 'hs-k', text: c.level >= HERO.CAP ? 'Level cap' : `${fmt(c.xp)}/${fmt(need)}` })));
    return el;
  }
  const watchList = c => [CLASSES[c.cls].basic, ...c.equip.filter(Boolean)];
  function play(id) {
    const c = char();
    if (!ui.stage || !id) return;
    ui.stage.play(SKILLS[id], playInfo(c, id));
    document.querySelectorAll('.hs-watch .play').forEach(b => b.classList.toggle('on', b.dataset.id === id));
  }
  function thresholdBanner(c) {
    const list = Hero.pending(c);
    if (!list.length) return null;
    return h('button', { class: 'hs-banner warm', onclick: () => { click(); openThreshold(list[0]); } }, ico('star'),
      h('div', {}, h('b', { text: list.length > 1 ? `${list.length} thresholds reached` : `Level ${list[0]} · a threshold` }),
        h('span', { text: list[0] >= 100 ? 'Open the next tier, or awaken a skill' : HERO.COMBINE_AT.includes(list[0]) ? 'Open the next tier, or combine with a second class' : 'Open the next tier of your tree' })),
      h('span', { class: 'hs-go', text: 'Choose' }));
  }

  // ── Stats
  function statsTab(c) {
    const p = preview(c), s = Hero.sheet(p), now = Hero.sheet(c), P = Hero.points(p), res = s.res;
    const watch = h('div', { class: 'hs-watch' }, h('span', { class: 'hs-k vert', text: 'Watch' }),
      watchList(c).map(id => h('button', { class: 'play', 'data-id': id, onclick: () => { click(); play(id); } }, h('span', { class: 'tri' }), ico(SKILLS[id].icon), SKILLS[id].name)));
    const tile = k => {
      const add = (p.alloc[k] || 0) - (c.alloc[k] || 0), cap = Hero.placed(p, k) >= Hero.capOf(k);
      const v = s[k], diff = v - now[k];
      return h('div', { class: 'hs-stt' + (add ? ' p' : '') },
        h('span', { class: 'hs-k' }, ico(STAT_ICONS[k]), STAT_LABELS[k]),
        h('span', { class: 'v' }, fmtStat(k, v), diff > 0.001 ? h('small', { text: ' +' + (k === 'spd' ? diff.toFixed(1) : Math.round(diff)) }) : null),
        P.stat > 0 && !cap ? h('button', { class: 'pl', 'aria-label': `Add a point to ${STAT_LABELS[k]}`, onclick: () => addPending(k) }, '+') : null);
    };
    const rmin = Math.round(Math.min(...RES_KEYS.map(k => res[k]))), rmax = Math.round(Math.max(...RES_KEYS.map(k => res[k])));
    const resTile = h('button', { class: 'hs-stt res' + (RES_KEYS.some(k => ui.pending['res:' + k]) ? ' p' : ''), onclick: () => { click(); openResists(); } },
      h('span', { class: 'hs-k' }, ico('fort'), 'Resists'), h('span', { class: 'v' }, `${rmin}–${rmax}%`), h('span', { class: 'pl more', 'aria-hidden': 'true' }, '›'));
    const slots = Hero.activeSlots(c);
    const slotCell = (i, label, lock) => {
      if (lock) return h('div', { class: 'lk' }, h('span', { class: 'hs-k', text: label }), h('span', { class: 'hs-sk dim' }, ico('lock'), lock));
      const id = c.equip[i];
      return h('button', { class: id ? 'on' : 'empty', onclick: () => { click(); openEquip(i); } }, h('span', { class: 'hs-k', text: label }),
        id ? h('span', { class: 'hs-sk' }, ico(SKILLS[id].icon), SKILLS[id].name) : h('span', { class: 'hs-sk dim', text: '+ Equip' }));
    };
    const eq = [h('div', {}, h('span', { class: 'hs-k', text: 'Basic' }), h('span', { class: 'hs-sk' }, ico(SKILLS[CLASSES[c.cls].basic].icon), SKILLS[CLASSES[c.cls].basic].name))];
    const names = ['Skill I', 'Skill II', 'Skill III', 'Skill IV', 'Skill V'];
    for (let i = 0; i < Math.max(slots, 2); i++) eq.push(i < slots ? slotCell(i, names[i]) : slotCell(i, names[i], c.level < 50 ? 'Lv 50' : 'Lv 200'));
    const placed = pendingTotal();
    return [
      stageFor(c), watch, thresholdBanner(c),
      h('div', { class: 'hs-points' + (P.stat + placed > 0 ? '' : ' none') },
        h('span', { class: 'big', text: String(P.stat) }),
        h('div', {}, h('span', { class: 'kicker', text: P.stat === 1 ? 'Stat point to spend' : 'Stat points to spend' }), h('span', { class: 'hs-kv', text: 'One a level · tap a + to place one' })),
        h('button', { class: 'hs-tag e', onclick: () => { click(); ui.tab = 'skills'; draw(); } }, ico('book'), plural2(Hero.points(c).skill, 'skill point', 'skill points'))),
      h('div', { class: 'hs-stats' }, STAT_KEYS.map(tile), resTile),
      placed ? h('div', { class: 'hs-confirm' }, h('span', { class: 'hs-kv', text: `${placed} placed · not yet kept` }),
        h('button', { class: 'small', onclick: () => { click(); ui.pending = {}; draw(); } }, 'Reset'), h('button', { class: 'small on', onclick: confirm }, 'Confirm')) : null,
      h('div', { class: 'hs-eqs', style: `grid-template-columns:repeat(${eq.length},minmax(0,1fr))` }, eq),
      proto(c),
    ];
  }
  // Prototype tools: XP for play-testing the later thresholds, until the Training Yard (step 5) and more stages.
  function proto(c) {
    const give = n => { click(); const g = Hero.gainXp(c, Hero.xpBetween(c.level, Math.min(HERO.CAP, c.level + n))); Save.commit(); if (g.to > g.from) LevelUp.toast(c, g); draw(); };
    return h('div', { class: 'hs-proto' }, h('span', { class: 'ph-tag', text: 'Prototype' }), h('span', { class: 'hs-kv', text: 'Train' }),
      [1, 5, 25].map(n => h('button', { class: 'small', disabled: c.level >= HERO.CAP, onclick: () => give(n) }, `+${n} Lv`)));
  }

  // ── Skills: the tree
  function skillsTab(c) {
    const cls = c.classes.includes(ui.cls) ? ui.cls : c.cls, C = CLASSES[cls], P = Hero.points(c);
    const open = c.tiers[cls] || 0;
    const node = id => {
      const sk = SKILLS[id], st = Hero.skill(c, id), have = st.L > 0;
      const state = have ? 'have' : st.canLearn ? 'can' : st.open ? '' : 'lock';
      return h('button', { class: `hs-node ${sk.kind === 'active' ? '' : sk.kind === 'key' ? 'key' : 'pas'} ${state}${st.awakened ? ' awk' : ''}${st.equipped ? ' eq' : ''}`, 'aria-label': `${sk.name}, ${have ? 'level ' + st.L : st.open ? 'not learned' : 'locked'}`, onclick: () => { click(); openNode(id); } },
        h('span', { class: 'in' }, ico(sk.icon, 'l')),
        have ? h('span', { class: 'pips' }, Array.from({ length: SKILL_LV_MAX }, (_, i) => h('i', { class: i < st.L ? 'f' : '' }))) : null,
        st.equipped ? h('span', { class: 'eqmark', title: 'Equipped' }) : null);
    };
    const rows = [];
    rows.push(h('span', { class: 'hs-lv' }), ...C.paths.map(([n]) => h('span', { class: 'hs-colh', text: n })));
    rows.push(h('span', { class: 'hs-lv hs-k', text: 'Root' }), h('span'), h('div', { class: 'hs-cell root' }, node(C.starter)), h('span'));
    for (let t = 1; t <= HERO.TIERS; t++) {
      const locked = t > open;
      rows.push(h('span', { class: 'hs-lv' + (locked ? ' lock' : '') }, locked && t === open + 1 ? ico('lock') : null, h('b', { text: roman(t) })));
      for (let pi = 0; pi < 3; pi++) {
        const id = C.tree[pi][t - 1], above = t === 1 ? null : C.tree[pi][t - 2];
        const lit = above && (c.skills[above] || 0) > 0 && (c.skills[id] || 0) > 0;
        rows.push(h('div', { class: 'hs-cell' + (t > 1 ? ' link' : '') + (lit ? ' lit' : '') + (locked ? ' locked' : '') }, node(id)));
      }
      if (t === open && open < HERO.TIERS) {
        const next = HERO.THRESHOLDS.find(x => x > c.level);
        rows.push(h('div', { class: 'hs-tierline' }, h('span', { text: Hero.pending(c).length ? `Tier ${roman(open + 1)} opens at a threshold · one is waiting` : next ? `Tier ${roman(open + 1)} opens at a threshold · next at level ${next}` : `Tier ${roman(open + 1)} stays closed` })));
      }
    }
    return [
      thresholdBanner(c),
      h('div', { class: 'hs-skillbar' },
        h('div', { class: 'hs-points small-pts' + (P.skill ? '' : ' none') }, h('span', { class: 'big', text: String(P.skill) }), h('div', {}, h('span', { class: 'kicker', text: P.skill === 1 ? 'Skill point' : 'Skill points' }), h('span', { class: 'hs-kv', text: 'One every 5 levels' }))),
        h('button', { class: 'small', onclick: () => { click(); openRespec(); } }, ico('book'), c.respecs ? `Respec · ${c.respecs} free` : 'Respec')),
      Hero.awakenOpen(c) > 0 ? h('div', { class: 'hs-banner ok' }, ico('star'), h('div', {}, h('b', { text: 'An awakening is open' }), h('span', { text: 'A level-5 skill can awaken for 5 skill points.' }))) : null,
      c.classes.length > 1 ? h('div', { class: 'hs-clsw' }, c.classes.map(k => h('button', { class: k === cls ? 'on' : '', onclick: () => { click(); ui.cls = k; draw(); } }, CLASSES[k].name, h('span', { text: ' · tier ' + roman(c.tiers[k]) })))) : null,
      h('div', { class: 'hs-tree' }, rows),
      h('div', { class: 'hs-legend' }, h('span', { class: 'hs-k', text: '■ active' }), h('span', { class: 'hs-k', text: '● passive' }), h('span', { class: 'hs-k', text: '◆ keystone' }), h('span', { class: 'hs-k e', text: 'Dashed · can learn' })),
    ];
  }
  // The text of a skill at a level, with its growing numbers marked (and what the next level brings).
  function descEl(sk, L, which = 'd', withNext = true) {
    return h('p', { class: 'hs-desc' + (which === 'aw' ? ' aw' : '') }, skillParts(sk, L, which).map(x => (x.text != null ? x.text : h('b', { class: 'hs-num' }, x.num, withNext && x.next && x.next !== x.num ? h('span', { class: 'next', text: ' → ' + x.next }) : null))));
  }
  function tagsOf(sk) {
    if (sk.kind !== 'active') return [h('span', { class: 'hs-tag g' }, sk.kind === 'key' ? 'Keystone' : 'Passive'), h('span', { class: 'hs-tag', text: 'Always on · no slot' })];
    const range = sk.range ? sk.range + (sk.reach ? ' · reach' : '') : null;
    const cost = [sk.cost ? `${sk.cost} mana` : null, sk.hpCost ? `${Math.round(sk.hpCost * 100)}% health` : null, sk.hpCur ? `${Math.round(sk.hpCur * 100)}% of current health` : null].filter(Boolean).join(' + ') || 'No mana';
    return [h('span', { class: 'hs-tag w' }, ico('mana'), cost), h('span', { class: 'hs-tag', text: SHAPES[sk.shape] || sk.shape }), range ? h('span', { class: 'hs-tag', text: range }) : null, sk.charge ? h('span', { class: 'hs-tag b', text: 'Charged' }) : null];
  }
  // A node's card: what the skill does, and learning, raising, awakening and equipping it.
  function openNode(id) {
    const c = char(), sk = SKILLS[id], st = Hero.skill(c, id), C = CLASSES[sk.cls], P = Hero.points(c);
    const L = Math.max(1, st.L);
    const path = sk.path ? C.paths[sk.path - 1][0] : 'Root';
    let mini = null;
    if (sk.kind === 'active') { mini = h('div', { class: 'hs-mini' }); }
    const why = !st.open ? `Tier ${roman(sk.tier)} of the ${C.name} tree opens at a threshold.` : st.L >= SKILL_LV_MAX && !st.awakened ? (Hero.awakenOpen(c) ? (P.skill < HERO.AWAKEN_COST ? `Awakening needs ${HERO.AWAKEN_COST} skill points.` : '') : 'At level 5. An awakening opens at a threshold from level 100.') : P.skill < 1 && st.L < SKILL_LV_MAX ? 'No skill points left: one comes every 5 levels.' : '';
    const learnBtn = st.L < SKILL_LV_MAX
      ? h('button', { class: 'btn primary hs-learn', disabled: !st.canLearn, onclick: () => { if (Hero.learn(c, id)) { Save.commit(); sfx('kindle'); toast(st.L ? `${sk.name} · level ${st.L + 1}` : `Learned ${sk.name}`); draw(); openNode(id); } } }, st.L ? `Raise to level ${st.L + 1} · 1 pt` : st.starter ? 'Known' : 'Learn · 1 pt')
      : !st.awakened ? h('button', { class: 'btn primary hs-learn', disabled: !st.canAwaken, onclick: () => { if (Hero.awaken(c, id)) { Save.commit(); sfx('region'); toast(`${sk.name} awakens`); draw(); openNode(id); } } }, `Awaken · ${HERO.AWAKEN_COST} pts`) : h('button', { class: 'btn hs-learn', disabled: true }, 'Awakened');
    const equipBtn = sk.kind === 'active' && st.L ? h('button', { class: 'btn', onclick: () => { click(); if (st.equipped) { Hero.equip(c, c.equip.indexOf(id), null); Save.commit(); draw(); openNode(id); } else openEquip(c.equip.indexOf(null) >= 0 ? c.equip.indexOf(null) : 0, id); } }, st.equipped ? 'Unequip' : 'Equip') : null;
    openSheet(h('div', { class: 'box hs-card' },
      h('button', { class: 'sheet-x', 'aria-label': 'Close', onclick: () => { click(); closeSheet(); } }, '×'),
      h('div', { class: 'hs-cardtop' },
        mini || h('div', { class: 'hs-well' }, ico(sk.icon, 'xl')),
        h('div', { class: 'hs-cardtxt' },
          h('span', { class: 'kicker', text: `${path} · ${sk.kind === 'active' ? 'skill' : sk.kind === 'key' ? 'keystone' : 'passive'} · ${st.L ? 'level ' + st.L + '/' + SKILL_LV_MAX : 'not learned'}${st.awakened ? ' · awakened' : ''}` }),
          h('h2', { text: sk.name }),
          h('div', { class: 'hs-tags' }, tagsOf(sk)))),
      descEl(sk, L, 'd', st.L > 0 && st.L < SKILL_LV_MAX),
      h('div', { class: 'hs-aw' + (st.awakened ? ' on' : '') }, h('span', { class: 'hs-k', text: st.awakened ? 'Awakened' : 'When awakened' }), descEl(sk, SKILL_LV_MAX, 'aw', false)),
      sk.later ? h('p', { class: 'ph-note' }, h('span', { class: 'ph-tag', text: 'Later' }), `This works once ${{ fatigue: 'fatigue', gold: 'gold and loot', gear: 'gear' }[sk.later]} arrives (build step ${sk.later === 'gear' ? 4 : 5}).`) : null,
      why ? h('p', { class: 'hs-why', text: why }) : null,
      h('div', { class: 'hs-row' }, equipBtn, learnBtn)), 'sheet-bottom');
    if (mini) {
      const s = new SpriteStage(mini, { cls: c.cls, scale: 3, hx: 0.24, ambient: [{ sk, info: playInfo(c, id) }] });
      setTimeout(() => s.play(sk, playInfo(c, id)), 350);
      mini.addEventListener('click', () => s.play(sk, playInfo(c, id)));
    }
  }
  function openRespec() {
    const c = char(), P = Hero.points(c), spent = c.level - 1 - P.stat + Math.floor(c.level / 5) - P.skill;
    openSheet(h('div', { class: 'box' },
      h('button', { class: 'sheet-x', 'aria-label': 'Close', onclick: () => { click(); closeSheet(); } }, '×'),
      h('div', { class: 'kicker', text: 'Respec' }), h('h2', { text: 'Unlearn and start again' }),
      h('p', { class: 'flavor', text: `Every stat and skill point comes back: ${spent} in all. Opened tiers, combined classes and open awakenings stay; awakened skills go back to level 1.` }),
      c.respecs ? btn(`Use a free respec (${c.respecs} left)`, () => { Hero.respec(c, true); Save.commit(); closeSheet(); ui.pending = {}; toast('Points returned'); draw(); }, 'primary', 'Every threshold gives one, kept until you use it') : null,
      btn('Respec at the Shrine', () => { Hero.respec(c, false); Save.commit(); closeSheet(); ui.pending = {}; toast('Points returned'); draw(); }, c.respecs ? '' : 'primary', 'The Shrine will charge gold in build step 5. Free in this prototype.'),
      btn('Keep my build', closeSheet)), 'sheet-bottom');
  }

  // ── equipping an active skill
  function openEquip(slot, want) {
    const c = char(), learned = Hero.actives(c);
    let pick = want || c.equip[slot] || null;
    const render = () => {
      const old = c.equip[slot], rules = (Tactics.owner(c.id).rules || []);
      const loses = old && old !== pick ? rules.map((r, i) => (r.do === old ? i + 1 : 0)).filter(Boolean) : [];
      const gains = pick && pick !== old ? rules.map((r, i) => (r.do === pick ? i + 1 : 0)).filter(Boolean) : [];
      openSheet(h('div', { class: 'box hs-equip' },
        h('button', { class: 'sheet-x', 'aria-label': 'Close', onclick: () => { click(); closeSheet(); } }, '×'),
        h('div', { class: 'hs-row' }, h('h2', { text: ['Skill I', 'Skill II', 'Skill III', 'Skill IV', 'Skill V'][slot] }), h('span', { class: 'hs-k', text: 'Learned skills' })),
        learned.map(id => {
          const sk = SKILLS[id], where = c.equip.indexOf(id);
          return h('button', { class: 'hs-opt' + (pick === id ? ' sel' : ''), onclick: () => { click(); pick = id; render(); } },
            h('span', { class: 'hs-well' }, ico(sk.icon, 'm')),
            h('div', {}, h('span', { class: 'hs-sk', text: sk.name }), h('span', { class: 'hs-k', text: `${SHAPES[sk.shape]} · level ${c.skills[id]}${where >= 0 && where !== slot ? ' · in Skill ' + roman(where + 1) : ''}` })),
            h('span', { class: 'hs-mana', text: sk.cost ? String(sk.cost) : '—' }));
        }),
        learned.length < 2 ? h('p', { class: 'hs-why', text: 'Learn more actives in the skill tree: a skill point comes every 5 levels.' }) : null,
        loses.length ? h('div', { class: 'hs-banner' }, ico('scroll'), h('span', { class: 'txt' }, `Rule ${loses.join(' and ')} uses ${SKILLS[old].name}, and stops firing once it’s unequipped.`)) : null,
        gains.length ? h('div', { class: 'hs-banner ok' }, ico('scroll'), h('span', { class: 'txt' }, `Rule ${gains.join(' and ')} already uses ${SKILLS[pick].name}.`)) : pick && pick !== old && !rules.some(r => r.do === pick) ? h('div', { class: 'hs-banner warm' }, ico('scroll'), h('span', { class: 'txt' }, `No rule uses ${SKILLS[pick].name} yet: add one in Rules, or it never fires.`)) : null,
        h('div', { class: 'hs-row' },
          old ? h('button', { class: 'btn', onclick: () => { click(); Hero.equip(c, slot, null); Save.commit(); closeSheet(); draw(); } }, 'Empty slot') : btn('Cancel', closeSheet),
          h('button', { class: 'btn primary', disabled: !pick || pick === old, onclick: () => { Hero.equip(c, slot, pick); Save.commit(); sfx('guard'); closeSheet(); toast(`${SKILLS[pick].name} equipped`); draw(); } }, 'Equip'))), 'sheet-bottom');
    };
    render();
  }

  // ── resistances: six of them, a point buys 1%, up to 25 points each
  function openResists() {
    const render = () => {
      const c = char(), p = preview(c), r = Hero.sheet(p).res, P = Hero.points(p);
      openSheet(h('div', { class: 'box hs-res' },
        h('button', { class: 'sheet-x', 'aria-label': 'Close', onclick: () => { click(); closeSheet(); draw(); } }, '×'),
        h('div', { class: 'kicker', text: 'Resistances' }), h('h2', { text: 'What they shrug off' }),
        h('p', { class: 'hs-why', text: `A harmful effect lands on its chance minus the resistance. Each point adds 1%, up to ${HERO.RES_CAP} points each. ${P.stat} to spend.` }),
        RES_KEYS.map(k => {
          const key = 'res:' + k, add = ui.pending[key] || 0, have = Hero.placed(c, key);
          return h('div', { class: 'hs-resrow' + (add ? ' p' : '') },
            ico(RES_ICONS[k], 'm'),
            h('div', {}, h('b', { text: RESISTS[k].name }), h('span', { text: RESISTS[k].tip })),
            h('span', { class: 'v', text: Math.round(r[k]) + '%' }),
            h('span', { class: 'hs-k', text: `${have + add}/${HERO.RES_CAP}` }),
            h('button', { class: 'small', disabled: !add, 'aria-label': `Take a point from ${RESISTS[k].name}`, onclick: () => { click(); ui.pending[key]--; if (!ui.pending[key]) delete ui.pending[key]; render(); } }, '−'),
            h('button', { class: 'small', disabled: P.stat <= 0 || have + add >= HERO.RES_CAP, 'aria-label': `Add a point to ${RESISTS[k].name}`, onclick: () => { addPending(key); render(); } }, '+'));
        }),
        h('div', { class: 'hs-row' }, btn('Done', () => { closeSheet(); draw(); }), pendingTotal() ? h('button', { class: 'btn primary', onclick: () => { closeSheet(); confirm(); } }, 'Confirm') : null)), 'sheet-bottom');
    };
    render();
  }

  // ── thresholds: the next tier, a second class, or an awakening
  function openThreshold(t) {
    const c = char(), o = Hero.options(c, t);
    let pick = null;
    const tierOf = k => (c.tiers[k] || 0) + 1;
    const render = () => {
      const card = (ch, title, sub, kids) => h('button', { class: 'hs-choice' + (pick && pick.kind === ch.kind && pick.cls === ch.cls ? ' sel' : ''), onclick: () => { click(); pick = ch; render(); } },
        h('div', { class: 'hs-row' }, h('b', { text: title }), h('span', { class: 'hs-k', text: sub })), kids);
      const preview3 = (k, tier) => h('div', { class: 'hs-three' }, CLASSES[k].tree.map(p => { const sk = SKILLS[p[tier - 1]]; return h('span', { class: 'hs-sk' }, ico(sk.icon), sk.name); }));
      openSheet(h('div', { class: 'box hs-thresh' },
        h('button', { class: 'sheet-x', 'aria-label': 'Close', onclick: () => { click(); closeSheet(); } }, '×'),
        h('div', { class: 'kicker', text: `Threshold · level ${t}` }), h('h2', { text: 'Choose your path' }),
        h('p', { class: 'hs-why', text: 'Each threshold opens the next tier of a tree, and brings a free respec to keep until you need it.' }),
        o.tier.map(k => card({ kind: 'tier', cls: k }, `Open tier ${roman(tierOf(k))}`, CLASSES[k].name + ' tree', preview3(k, tierOf(k)))),
        o.combine.length ? h('div', { class: 'hs-grp' }, h('h4', { text: c.classes.length === 1 ? 'Or combine with a second class' : 'Or combine with a third class' }),
          h('p', { class: 'hs-why', text: 'Gain its first tier and its starter skill. You keep your first class’s stats, growth and basic attack.' }),
          h('div', { class: 'hs-classes' }, o.combine.map(k => h('button', { class: 'hs-cls' + (pick && pick.kind === 'combine' && pick.cls === k ? ' sel' : ''), onclick: () => { click(); pick = { kind: 'combine', cls: k }; render(); } },
            ico(SKILLS[CLASSES[k].starter].icon, 'm'), h('b', { text: CLASSES[k].name }), h('span', { text: CLASSES[k].role.split(':')[0] }))))) : null,
        o.awaken ? card({ kind: 'awaken' }, 'Open an awakening', 'from level 100', h('p', { class: 'hs-why', text: `Lets one level-5 skill awaken for ${HERO.AWAKEN_COST} skill points.` })) : null,
        pick && pick.kind === 'combine' ? h('div', { class: 'hs-banner warm' }, ico(SKILLS[CLASSES[pick.cls].starter].icon), h('span', { class: 'txt' }, `${c.name} becomes a ${CLASSES[c.cls].name} and ${CLASSES[pick.cls].name}, and learns ${SKILLS[CLASSES[pick.cls].starter].name}. A combination is for good: a respec keeps it.`)) : null,
        h('div', { class: 'hs-row' }, btn('Later', closeSheet),
          h('button', { class: 'btn primary', disabled: !pick, onclick: () => { if (Hero.choose(c, t, pick)) { Save.commit(); sfx('region'); closeSheet(); toast(pick.kind === 'combine' ? `${CLASSES[pick.cls].name} combined` : pick.kind === 'awaken' ? 'An awakening is open' : `Tier ${roman(c.tiers[pick.cls])} is open`); if (pick.kind !== 'awaken') { ui.cls = pick.cls; ui.tab = 'skills'; } draw(); } } }, 'Choose'))), 'sheet-bottom');
    };
    render();
  }

  // ── Gear and Rules
  function gearTab(c) {
    const C = CLASSES[c.cls];
    return [
      stageFor(c),
      h('div', { class: 'hs-gslots' }, [['weapon', 'Weapon', 'sword'], ['armor', 'Armour', 'plate'], ['accessory', 'Accessory', 'bag']].map(([k, n, i]) => h('div', { class: 'hs-gslot' }, h('span', { class: 'hs-well' }, ico(i, 'm')), h('b', { text: n }), h('span', { class: 'hs-k', text: c.gear[k] || 'Empty' })))),
      h('p', { class: 'hs-why', text: `Weapons: ${c.classes.map(k => CLASSES[k].weapon).join(', ')}. Any armour weight; accessories suit anyone.` }),
      h('p', { class: 'ph-note' }, h('span', { class: 'ph-tag', text: 'Step 4' }), 'Loot arrives in build step 4: every item changes how the hero looks.'),
    ];
  }
  function rulesTab(c) {
    const o = Tactics.owner(c.id);
    return [
      h('div', { class: 'hs-rules' }, o.rules.length ? o.rules.map((r, i) => {
        const x = Tactics.explain(c.id, r), sk = SKILLS[r.do];
        return h('div', { class: 'hs-rule' + (r.on ? '' : ' off') + (x.warn ? ' warn' : '') }, h('b', { class: 'n', text: String(i + 1) }),
          h('div', {}, h('span', { class: 'cond', text: ruleCond(r) }), h('span', { class: 'hs-sk' }, h('span', { class: 'arr', text: '→' }), ico(sk.icon), sk.name), h('span', { class: 'hint', text: r.on ? x.text : 'Switched off' })));
      }) : h('p', { class: 'hs-why', text: 'No rules yet: this hero only uses their basic attack.' })),
      h('div', { class: 'hs-default' }, h('span', { class: 'hs-k', text: 'Otherwise' }), ico(SKILLS[CLASSES[c.cls].basic].icon), h('b', { text: SKILLS[CLASSES[c.cls].basic].name }), h('span', { class: 'hs-kv', text: 'basic attack' })),
      h('p', { class: 'hs-why', text: `${o.rules.length} of ${o.slots} rule slots used. Every hero starts with 3; the Masters’ Hall teaches more, up to ${o.max}.` }),
      btn('Edit rules', () => App.actions.tactics(c.id, () => open(c.id, 'rules')), 'primary', 'Reorder, switch off, or change what each rule does'),
    ];
  }

  function build() {
    const c = char();
    if (!c) return [h('p', { text: 'No such hero.' })];
    const body = ui.tab === 'skills' ? skillsTab(c) : ui.tab === 'gear' ? gearTab(c) : ui.tab === 'rules' ? rulesTab(c) : statsTab(c);
    return [header(c), tabs(), h('div', { class: 'hs-body tab-' + ui.tab }, body)];
  }

  App.screen('hero', {
    tab: true, parent: 'party',
    render(p) {
      if (p && p.id) { if (ui.id !== p.id) { ui.pending = {}; ui.cls = null; } ui.id = p.id; }
      if (p && p.tab) ui.tab = p.tab;
      return h('div', { class: 'hs-view' }, build());
    },
    enter() { App.rest(); },
    leave() { if (ui.stage) { ui.stage.stop(); ui.stage = null; ui.stageEl = null; ui.stageFor = null; } ui.pending = {}; },
  });
  return { open, draw, play, get id() { return ui.id; } };
})();
// The Party screen opens the hero sheet.
App.actions.hero = (id, tab) => HeroSheet.open(id, tab);

// ── the level-up moment after a battle: XP fills, levels ring, and new points and choices are named
const LevelUp = (() => {
  // gains: [{ c, g (Hero.gainXp's result), before: { level, xp } }]
  function show(gains, xp, done) {
    const ups = gains.filter(x => x.g.to > x.g.from);
    const card = x => {
      const c = x.c, up = x.g.to > x.g.from, need = Hero.xpToNext(c.level);
      const fromPct = up ? 0 : Math.min(100, 100 * x.before.xp / Hero.xpToNext(x.before.level)), toPct = c.level >= HERO.CAP ? 100 : Math.min(100, 100 * c.xp / need);
      const bar = h('i', { style: `width:${fromPct}%` });
      requestAnimationFrame(() => requestAnimationFrame(() => { bar.style.width = toPct + '%'; }));
      const chips = [];
      if (up) chips.push(h('span', { class: 'hs-tag e' }, `+${x.g.to - x.g.from} stat point${x.g.to - x.g.from === 1 ? '' : 's'}`));
      if (x.g.skillPts) chips.push(h('span', { class: 'hs-tag g' }, `+${x.g.skillPts} skill point${x.g.skillPts === 1 ? '' : 's'}`));
      if (x.g.slots) chips.push(h('span', { class: 'hs-tag w' }, 'New skill slot'));
      for (const t of x.g.thresholds) chips.push(h('span', { class: 'hs-tag y' }, ico('star'), `Threshold · Lv ${t}`));
      return h('div', { class: 'lu-card' + (up ? ' up' : '') },
        h('div', { class: 'pennant hero' }, h('img', { src: portraitURL(c.cls, true), alt: '' })),
        h('div', { class: 'lu-mid' },
          h('div', { class: 'lu-nm' }, h('b', { text: c.name }), up ? h('span', { class: 'lu-lv' }, `Lv ${x.g.from} `, h('em', { text: '→ ' + x.g.to })) : h('span', { class: 'lu-lv dim', text: 'Lv ' + c.level })),
          h('div', { class: 'lu-bar' }, bar),
          chips.length ? h('div', { class: 'lu-chips' }, chips) : null));
    };
    const box = h('div', { class: 'box lu-box' },
      h('div', { class: 'lu-head' }, h('div', { class: 'kicker', text: `Victory · +${fmt(xp)} XP each` }), h('h2', { class: 'lu-title', text: ups.length ? (ups.length === 1 ? `${ups[0].c.name} levels up` : 'Level up') : 'Experience' })),
      h('div', { class: 'lu-list' }, gains.map(card)),
      h('div', { class: 'lu-actions' },
        h('button', { class: 'btn primary', onclick: () => { sfx('click'); done(); } }, 'The battle report'),
        ups.length ? h('button', { class: 'btn', onclick: () => { sfx('click'); closeSheet(); App.actions.hero(ups[0].c.id, Hero.pending(ups[0].c).length || Hero.points(ups[0].c).skill ? 'skills' : 'stats'); } }, 'Spend points', h('span', { class: 'sub', text: 'Open the hero sheet' })) : null));
    openSheet(box, 'report levelup');
    if (ups.length) { sfx('win'); box.querySelectorAll('.lu-card.up').forEach((el, i) => setTimeout(() => el.classList.add('ring'), 300 + i * 160)); }
  }
  // A small note when a level comes from outside a battle (the prototype's training).
  function toastOf(c, g) { toast(`${c.name} reaches level ${g.to}${g.thresholds.length ? ' · a threshold' : ''}`); }
  return { show, toast: toastOf };
})();
