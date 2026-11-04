'use strict';
// Lantern Road · the Road tab: the region map, the stage sheet and the whole road (campaign spec §7, the screen
// mockups' Road screens). Portrait, one-handed: the frontier sits near the thumb and the dark lies above.
// The model is js/campaign.js; this file only draws it and turns taps into Campaign calls.

const RoadMap = (() => {
  const SC = 2;            // css px per map pixel
  const STEP = 27;         // map pixels between two lanterns on the road
  const PAD_T = 46, PAD_B = 30;
  let region = null;       // the region on show
  let view = null;         // { el, wrap, pts } of the map on screen
  const click = () => sfx('click');

  // ── the road's shape: lantern k of n winds up from the bottom
  function layout(n, W) {
    const H = PAD_T + PAD_B + (n - 1) * STEP;
    const amp = Math.min(58, W * 0.3);
    const pt = t => ({ x: W / 2 + Math.sin(t * Math.PI * 3.1 + 0.4) * amp, y: H - PAD_B - t * (H - PAD_T - PAD_B) });
    return { H, pt, pts: Array.from({ length: n }, (_, k) => pt(n > 1 ? k / (n - 1) : 0)) };
  }
  const rng = seed => makeRng(seed);

  // ── the map canvas
  function draw(cv, r, W, L) {
    const x = cv.getContext('2d'), H = L.H, R = rng(11 + r), A = REGION_ART[Math.min(r, REGION_ART.length - 1)];
    const list = STAGES.filter(st => st.region === r), built = list.length > 0;
    const fr = built ? Campaign.frontier() : -1, frontierK = built ? list.findIndex(st => st.index === fr) : -1;
    const litN = built ? list.filter(st => Campaign.isLit(st.id)).length : 0, allLit = built && litN === list.length;
    // the night, colder at the top
    const g = x.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#07050b'); g.addColorStop(0.55, '#100c17'); g.addColorStop(1, A.ground || '#1a1320');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    for (let i = 0; i < W * H / 60; i++) { x.fillStyle = R() > 0.5 ? (A.speck || '#1c1624') : '#140f1b'; x.fillRect(R() * W | 0, R() * H | 0, 2, 1); }
    // the road: a dark verge, the dirt, then the lit stretch in warm light up to the frontier
    const path = [];
    for (let i = 0; i <= 240; i++) path.push(L.pt(i / 240));
    const upto = built ? (frontierK < 0 ? 1 : Math.max(0, (frontierK - 0.5) / Math.max(1, list.length - 1))) : 0;
    const stroke = (w, c, to = 1) => { x.strokeStyle = c; x.lineWidth = w; x.lineCap = 'round'; x.lineJoin = 'round'; x.beginPath(); path.slice(0, Math.round(to * 240) + 1).forEach((p, i) => (i ? x.lineTo(p.x, p.y) : x.moveTo(p.x, p.y))); x.stroke(); };
    stroke(11, '#0b0810'); stroke(8, A.edge || '#2a1f26'); stroke(6, A.road || '#38322a');
    if (upto > 0) { stroke(6, '#5a3e28', upto); stroke(2, '#8a6038', upto); }
    // graves, crosses and dead trees off the road
    const near = (px, py) => path.some(p => Math.abs(p.x - px) < 13 && Math.abs(p.y - py) < 10);
    const props = A.props.filter(k => k !== 'post' && k !== 'candle');
    for (let i = 0; i < H / 7; i++) {
      const px = R() * (W - 8) | 0, py = 12 + R() * (H - 16) | 0, k = props[Math.floor(R() * props.length)];
      if (near(px + 3, py)) continue;
      const pr = PROPS[k], s = sprite(pr.map, A.pc, 'mp' + r + k);
      x.globalAlpha = 0.45 + R() * 0.3; x.drawImage(s, px, py - s.height); x.globalAlpha = 1;
    }
    // the light the lit lanterns throw: pools that join up, showing how far the light reaches
    x.globalCompositeOperation = 'lighter';
    list.forEach((st, k) => {
      const lit = Campaign.isLit(st.id), front = k === frontierK;
      if (!lit && !front) return;
      const p = L.pts[k], rad = allLit ? 34 : front ? 22 : 28, a = allLit ? 0.48 : front ? 0.2 : 0.36;
      const lg = x.createRadialGradient(p.x, p.y, 1, p.x, p.y, rad);
      lg.addColorStop(0, `rgba(244,166,70,${a})`); lg.addColorStop(1, 'rgba(244,166,70,0)');
      x.fillStyle = lg; x.fillRect(p.x - rad, p.y - rad, rad * 2, rad * 2);
    });
    x.globalCompositeOperation = 'source-over';
    // the dark above the frontier
    if (!allLit) {
      const fy = built && frontierK >= 0 ? L.pts[frontierK].y : H;
      const dk = x.createLinearGradient(0, fy - 6, 0, fy - 80);
      dk.addColorStop(0, 'rgba(7,5,11,0)'); dk.addColorStop(1, 'rgba(7,5,11,.66)');
      x.fillStyle = dk; x.fillRect(0, 0, W, Math.max(0, fy - 6));
    }
    // the lanterns: lit, guttering at the frontier, or an unlit post; elites are red diamonds and the boss a skull
    list.forEach((st, k) => {
      const p = L.pts[k], px = Math.round(p.x), py = Math.round(p.y), lit = Campaign.isLit(st.id), front = k === frontierK;
      if (st.boss) {
        const s = sprite(UI_ICONS.skull.map, lit ? { b: '#f0d8b0', k: '#1a0d10', w: '#fff' } : { b: front ? '#e07a6a' : '#7a3a3a', k: '#1a0d10', w: '#c8a0a0' }, 'mapskull' + lit + front);
        x.fillStyle = '#0d0911'; x.fillRect(px - 5, py - 6, 11, 11);
        x.drawImage(s, px - 3, py - 4);
        return;
      }
      if (st.elite) {
        x.fillStyle = '#0d0911'; for (let d = 0; d <= 5; d++) { x.fillRect(px - d, py - 5 + d, d * 2 + 1, 1); x.fillRect(px - d, py + 5 - d, d * 2 + 1, 1); }
        x.fillStyle = lit ? '#e05a4a' : front ? '#a8403a' : '#4a2a32'; for (let d = 0; d <= 4; d++) { x.fillRect(px - d, py - 4 + d, d * 2 + 1, 1); x.fillRect(px - d, py + 4 - d, d * 2 + 1, 1); }
        if (lit) { x.fillStyle = '#ffd0a0'; x.fillRect(px, py - 1, 1, 2); }
        return;
      }
      x.fillStyle = '#0d0911'; x.fillRect(px - 3, py - 5, 7, 9);
      x.fillStyle = lit || front ? '#9a8ea4' : '#3a3044'; x.fillRect(px - 2, py - 4, 5, 7);
      x.fillStyle = lit ? '#f4a646' : front ? '#ffe2a0' : '#1a1420'; x.fillRect(px - 1, py - 3, 3, 4);
      if (lit) { x.fillStyle = '#ffe2a0'; x.fillRect(px, py - 2, 1, 2); }
      x.fillStyle = '#3a3044'; x.fillRect(px, py + 3, 1, 3);
    });
  }

  // ── the screen
  function header(r) {
    const R = REGIONS[r], list = STAGES.filter(st => st.region === r);
    const lit = Campaign.litIn(r);
    const go = d => { const n = r + d; if (n < 0 || n >= REGIONS.length) return; click(); region = n; App.refresh(); };
    return h('header', { class: 'maphead' },
      h('button', { class: 'sq', 'aria-label': 'The region before', disabled: r === 0, onclick: () => go(-1) }, '‹'),
      h('button', { class: 'rn', 'aria-label': 'Open the whole road', onclick: () => { click(); wholeRoad(); } },
        h('span', { class: 'k', text: `Region ${R.num} · ${list.length ? `${lit}/${list.length} lit` : 'in the dark'}` }),
        h('span', { class: 'nm', text: R.name })),
      h('button', { class: 'sq', 'aria-label': 'The region after', disabled: r === REGIONS.length - 1, onclick: () => go(1) }, '›'));
  }
  function render() {
    Campaign.ensure();
    if (region == null) region = Math.min(STAGES[Math.min(Campaign.frontier(), STAGES.length - 1)].region, REGIONS.length - 1);
    const r = region, list = STAGES.filter(st => st.region === r);
    const page = h('div', { class: 'road-page' });
    page.append(header(r));
    const wrap = h('div', { class: 'mapwrap' });
    page.append(wrap);
    const s = Save.state, last = s.campaign.lastTrip;
    if (last && !last.seen) page.append(tripCard(last));
    if (!list.length) { wrap.append(darkRegion(r)); view = { el: page, wrap }; return page; }
    // the map is drawn once the page has a width
    view = { el: page, wrap, r };
    requestAnimationFrame(() => paint(r));
    page.append(cta(r));
    return page;
  }
  function paint(r) {
    if (!view || view.r !== r || !view.wrap.isConnected) return;
    const wrap = view.wrap, list = STAGES.filter(st => st.region === r);
    const W = Math.max(150, Math.floor(wrap.clientWidth / SC)), L = layout(list.length, W);
    const inner = h('div', { class: 'mapinner', style: `height:${L.H * SC}px` });
    const cv = h('canvas', { class: 'mapcv', width: W, height: L.H, 'aria-hidden': 'true' });
    cv.style.width = W * SC + 'px'; cv.style.height = L.H * SC + 'px';
    draw(cv, r, W, L);
    inner.append(cv);
    const fr = Campaign.frontier(), at = p => `left:${p.x * SC}px;top:${p.y * SC}px`;
    list.forEach((st, k) => {
      const p = L.pts[k], state = Campaign.stateOf(st.index), side = p.x > W / 2 ? 'l' : 'r';
      const kind = st.boss ? 'Boss' : st.elite ? 'Elite' : '';
      inner.append(h('button', { class: `node ${state}${st.boss ? ' boss' : st.elite ? ' elite' : ''}`, style: at(p), 'aria-label': `${st.id} ${st.name}${kind ? ', ' + kind.toLowerCase() : ''}, ${state === 'lit' ? 'lit' : state === 'frontier' ? 'next on the road' : 'dark'}`, onclick: () => { click(); stageSheet(st.index); } }));
      if (state === 'frontier') {
        inner.append(h('span', { class: 'ring', style: at(p) }), h('span', { class: 'flame', style: at(p) }));
        inner.append(h('span', { class: 'mlabel cur ' + side, style: at(p) }, `${st.id} · ${st.name}`));
        const lead = Campaign.fit()[0];
        if (lead) inner.append(h('img', { class: 'marker ' + side, style: at(p), src: heroImgURL(lead.cls, Items.look(lead)), alt: '' }));
      } else if (st.boss) inner.append(h('span', { class: 'mlabel boss', style: at(p) }, REGIONS[r].boss));
      else if (st.elite) inner.append(h('span', { class: 'mlabel elite ' + side, style: at(p) }, state === 'lit' ? `${st.id} · Elite` : 'Elite'));
      else if (state === 'lit') inner.append(h('span', { class: 'mlabel ' + side, style: at(p) }, st.id));
    });
    wrap.replaceChildren(inner);
    // Start with the frontier near the thumb: about two thirds of the way down.
    const fk = list.findIndex(st => st.index === fr), y = (fk < 0 ? L.pts[list.length - 1].y : L.pts[fk].y) * SC;
    wrap.scrollTop = Math.max(0, y - wrap.clientHeight * 0.62);
  }
  // A region not reached yet: in darkness, naming what opens it.
  function darkRegion(r) {
    const R = REGIONS[r], open = Campaign.reached(r);
    return h('div', { class: 'darkregion' },
      h('div', { class: 'dr-l' }, ico(open ? 'lantern' : 'lock')),
      h('h2', { text: R.name }),
      h('p', { class: 'flavor', text: R.line }),
      h('p', { class: 'k', text: open ? 'The road is open. Its stages come in the next build.' : R.opens }),
      h('p', { class: 'k dim', text: `Levels ${R.levels[0]}–${R.levels[1]} · ${R.stages} stages · ${MATERIALS.find(m => m.id === R.mat).name}` }));
  }
  // The buttons at the thumb: farm the last lit stage, or set out for the frontier.
  function cta(r) {
    const fr = Campaign.frontier(), lastLit = fr - 1;
    const kids = [];
    if (lastLit >= 0 && STAGES[lastLit].region === r) kids.push(h('button', { class: 'btn', onclick: () => { click(); stageSheet(lastLit); } }, `Farm ${STAGES[lastLit].id}`));
    if (fr < STAGES.length && STAGES[fr].region === r) kids.push(h('button', { class: 'btn primary', onclick: () => { click(); stageSheet(fr); } }, `Next · ${STAGES[fr].id}`, h('span', { class: 'sub', text: STAGES[fr].name })));
    else if (fr >= STAGES.length) kids.push(h('div', { class: 'allit', text: 'Every lantern in the Gravefields burns.' }));
    return h('div', { class: 'mapcta' }, kids);
  }

  // ── the trip summary, when the party is home (campaign spec §7.5)
  function tripCard(T) {
    const mats = MATERIALS.filter(m => T.mats[m.id]).map(m => `${m.name} ×${T.mats[m.id]}`);
    const items = Object.keys(T.items).map(id => `${ITEMS[id].name}${T.items[id] > 1 ? ' ×' + T.items[id] : ''}`);
    const stat = (icon, v, k) => h('div', { class: 'ts-st' }, ico(icon), h('b', { text: v }), h('span', { text: k }));
    return h('section', { class: 'tripcard', 'aria-label': 'Back from the road' },
      h('div', { class: 'ts-head' }, h('span', { class: 'kicker', text: 'Back from the road' }),
        h('button', { class: 'small', onclick: () => { click(); T.seen = true; Save.commit(); App.refresh(); } }, 'Got it')),
      h('p', { class: 'ts-why ' + T.why.k, text: T.why.text }),
      h('div', { class: 'ts-grid' },
        stat('lantern', T.lit.length, T.lit.length === 1 ? 'stage lit' : 'stages lit'),
        stat('sword', `${T.won}/${T.battles}`, 'battles won'),
        stat('coin', fmt(T.gold), 'gold'),
        stat('star', fmt(T.xp), 'XP each')),
      mats.length || items.length || T.gear ? h('p', { class: 'ts-loot', text: [...mats, ...items, T.gear ? plural(T.gear, 'piece') + ' of gear' + (T.sold ? ` (${T.sold} gold from a full Bag)` : '') : null].filter(Boolean).join(' · ') }) : null,
      T.unlocks.length ? h('div', { class: 'ts-unl' }, T.unlocks.map(id => h('span', { class: 'rw unlock' }, ico(UNLOCKS[id].icon), UNLOCKS[id].name))) : null,
      h('div', { class: 'ts-heroes' }, T.heroes.map(x => {
        const c = Save.char(x.id);
        return c ? h('span', { class: 'fg' + (x.after >= FATIGUE.EXHAUSTED ? ' exh' : x.after >= FATIGUE.WEARY ? ' weary' : '') + (x.out ? ' out' : ''), title: `${c.name}: fatigue ${Math.floor(x.before)} → ${Math.floor(x.after)}` },
          h('img', { src: heroPortrait(c), alt: '' }), h('span', { class: 'fbar' }, h('i', { style: `width:${x.after}%` })), h('b', { text: Math.floor(x.after) })) : null;
      })));
  }

  // ── the whole road: all five regions, stacked (campaign spec §7.2)
  function wholeRoad() {
    const total = STAGES.filter(st => Campaign.isLit(st.id)).length;
    const regions = REGIONS.map((R, r) => {
      const list = STAGES.filter(st => st.region === r), here = list.length && Campaign.frontier() < STAGES.length && STAGES[Campaign.frontier()].region === r;
      const open = Campaign.reached(r);
      return h('button', { class: 'reg ' + (list.length && open ? 'lit' : 'dark') + (here ? ' here' : ''), onclick: () => { click(); region = r; closeSheet(); App.refresh(); } },
        h('div', { class: 'row' }, h('span', { class: 'nm', text: R.name }), h('span', { class: 'sp' }), here ? h('span', { class: 'tag e', text: 'You are here' }) : h('span', { class: 'k', text: R.num })),
        list.length ? h('div', { class: 'pips' }, list.map(st => h('i', { class: (Campaign.isLit(st.id) ? 'f' : '') + (st.elite ? ' el' : '') + (st.boss ? ' bs' : '') }))) : null,
        h('span', { class: 'kv', text: list.length ? `${Campaign.litIn(r)}/${list.length} lit · ${list.filter(x => x.elite).length} elites · boss: ${R.boss}` : open ? `${R.stages} stages · open, built in the next step` : `${R.stages} stages · ${R.opens}` }),
        h('span', { class: 'kv' }, ico('bone'), ` Drops ${MATERIALS.find(m => m.id === R.mat).name.toLowerCase()} most`));
    }).reverse();
    openSheet(h('div', { class: 'box roadbox' },
      h('button', { class: 'sheet-x', 'aria-label': 'Close', onclick: () => { click(); closeSheet(); } }, '×'),
      h('div', { class: 'kicker', text: `${total}/${TOTAL_STAGES} lit` }), h('h2', { text: 'The Lantern Road' }),
      h('div', { class: 'regions' }, regions),
      h('p', { class: 'hint', text: 'Tap a region to open its map.' })), 'sheet-bottom');
  }

  // ── the stage sheet (campaign spec §7.3)
  const READY = { gold: 'Ready', amber: 'Close', red: 'Under-strength' };
  function stageSheet(i, info) {
    Campaign.ensure();
    const st = STAGES[i], state = Campaign.stateOf(i), s = Save.state;
    if (state === 'dark') return darkSheet(st);
    const ready = Campaign.readiness(st), best = s.campaign.best[st.id], first = state === 'frontier';
    const kids = [
      h('button', { class: 'sheet-x', 'aria-label': 'Close', onclick: () => { click(); closeSheet(); } }, '×'),
      h('div', { class: 'ss-top' },
        h('div', { class: 'ss-t' },
          h('span', { class: 'kicker', text: `Stage ${st.id} · ${first ? 'next on the road' : best ? `lit · best: round ${best}` : 'lit'}` }),
          h('h2', {}, st.name, st.boss ? h('span', { class: 'kb boss', text: 'Boss' }) : st.elite ? h('span', { class: 'kb elite', text: 'Elite' }) : null)),
        h('span', { class: 'rec ' + ready, title: READY[ready] }, `Rec. lv ${st.level} · ${plural(st.party, 'hero').replace('heros', 'heroes')}`)),
      h('p', { class: 'ss-teach', text: st.teaches }),
      formation(st, info),
      rewards(st, first),
      roadSettings(i),
      partyStrip(st),
    ];
    const fit = Campaign.fit().length > 0;
    kids.push(h('button', { class: 'btn primary go', disabled: !fit, onclick: () => setOut(i) }, first ? 'Set out' : 'Farm', h('span', { class: 'sub', text: fit ? (first ? `Light ${st.id} · ${st.name}` : `Replay ${st.id} for its rewards`) : 'No one is fit to set out' })));
    openSheet(h('div', { class: 'box stagebox' }, kids), 'sheet-bottom');
  }
  function darkSheet(st) {
    openSheet(h('div', { class: 'box stagebox dark' },
      h('button', { class: 'sheet-x', 'aria-label': 'Close', onclick: () => { click(); closeSheet(); } }, '×'),
      h('span', { class: 'kicker', text: `Stage ${st.id} · in the dark` }),
      h('h2', {}, st.boss || st.elite ? (st.boss ? 'A boss waits here' : 'An elite waits here') : 'The road goes on'),
      formation(st, null, true),
      h('p', { class: 'flavor', text: 'Light the stages before it.' })), 'sheet-bottom');
  }
  // The foes in their formation: the back row behind, the front row nearest the party. Tap one to read it.
  function formation(st, info, dark) {
    const cell = (x, slot) => {
      if (!x) return h('span', { class: 'fcell empty' });
      const key = foeKey(x), F = FOES[key], spr = foeSprite(key);
      const waits = slot >= 2 && isWaiter(F);
      const img = h('img', { class: 'fspr' + (F.boss ? ' big' : ''), src: spr.toDataURL(), alt: dark ? 'Unknown foe' : F.name });
      return h('button', { class: 'fcell' + (dark ? ' sil' : '') + (info === slot ? ' on' : '') + (F.elite ? ' elite' : '') + (F.boss ? ' boss' : ''), disabled: !!dark, 'aria-label': dark ? 'An unknown foe' : `${F.name}${waits ? ', waits behind' : ''}`, onclick: () => { click(); stageSheet(st.index, info === slot ? null : slot); } },
        img, h('span', { class: 'fn', text: dark ? '?' : F.name.replace(/^The /, '') }), waits && !dark ? h('span', { class: 'wt', text: 'waits' }) : null);
    };
    const kids = [
      h('div', { class: 'frow back' }, h('span', { class: 'fl', text: 'Back' }), [2, 3, 4, 5].map(k => cell(st.foes[k], k))),
      h('div', { class: 'frow front' }, h('span', { class: 'fl', text: 'Front' }), [0, 1].map(k => cell(st.foes[k], k))),
    ];
    if (info != null && st.foes[info]) kids.push(foeInfo(st, st.foes[info]));
    return h('div', { class: 'foeform' }, kids);
  }
  const isWaiter = F => { const at = [F.basic, ...F.skills].map(id => SKILLS[id]).filter(sk => sk && (sk.power || sk.charge)); return at.length > 0 && at.every(sk => { const t = sk.charge ? SKILLS[sk.charge] : sk; return t.range === 'melee' && !sk.reach && !t.reach; }); };
  function foeInfo(st, x) {
    const key = foeKey(x), F = Object.assign({}, FOES[key], (x && x.over) || {}), L = (x && x.level) || st.level, fs = foeStats(F, L);
    const sk = id => { const S = SKILLS[id]; return h('li', {}, ico(S.icon), h('b', { text: S.name }), h('span', { text: [S.cost ? `${S.cost} mana` : 'basic', S.tip].filter(Boolean).join(' · ') })); };
    const phase = (FOES[key].phases || []).map(p => h('li', { class: 'ph' }, ico('rage'), h('b', { text: p.name }), h('span', { text: `below ${Math.round(p.below * 100)}% health: ${p.line}` })));
    return h('div', { class: 'foeinfo' },
      h('div', { class: 'fi-h' }, h('b', { text: F.name }), h('span', { text: `${F.boss ? 'Boss' : F.elite ? 'Elite' : 'Foe'} · Lv ${L}${F.tags && F.tags.length ? ' · ' + F.tags.map(t => TAGS[t]).join(', ') : ''}` })),
      h('p', { class: 'flavor', text: F.intro || '' }),
      h('div', { class: 'fi-st' }, [['heart', fs.hp, 'Health'], ['sword', Math.round(fs.pow), 'Power'], ['shield', Math.round(fs.def), 'Defense'], ['boot', fs.spd.toFixed(1), 'Speed']].map(([i, v, k]) => h('span', { title: k }, ico(i), v))),
      h('ul', { class: 'fi-sk' }, [F.basic, ...F.skills].filter(id => SKILLS[id]).map(sk), phase),
      h('div', { class: 'fi-res' }, RES_KEYS.map(k => h('span', {}, RESISTS[k].name, h('b', { text: Math.round(fs.res[k]) + '%' })))));
  }
  // The stage's rewards, by its tier; and until the first clear, the ribbon with what lighting it brings.
  function rewards(st, first) {
    const p = Campaign.preview(st, first), R = REGIONS[st.region];
    const tag = (cls, icon, text, title) => h('span', { class: 'tag ' + cls, title: title || '' }, icon ? ico(icon) : null, text);
    const kids = [
      h('span', { class: 'k', text: p.tier }),
      tag('y', 'coin', `~${fmt(p.gold)}`, 'Gold for clearing it, every foe defeated'),
      tag('', 'star', `~${fmt(p.xp)} XP`, `About ${Math.round(p.xpLv * 100)}% of a level at level ${st.level}`),
      tag('', 'bone', `${MATERIALS.find(m => m.id === R.mat).name} ×${p.mat}`),
      tag('w', 'bag', p.gear >= 1 ? 'Gear' : `Gear ${Math.round(p.gear * 100)}%`, st.kind === 'boss' ? 'Boss rarity: up to Rare' : st.kind === 'elite' ? 'Elite rarity' : 'Region I rarity'),
    ];
    const unl = first && st.first.length ? h('div', { class: 'ribbon1' }, h('span', { class: 'k', text: 'First clear' }), h('span', { class: 'tag e', text: '×2 gold and materials' }), st.first.map(id => tag('e', UNLOCKS[id].icon, UNLOCKS[id].kind === 'condition' ? 'Condition: ' + UNLOCKS[id].name : UNLOCKS[id].name, UNLOCKS[id].line || ''))) : first ? h('div', { class: 'ribbon1' }, h('span', { class: 'k', text: 'First clear' }), h('span', { class: 'tag e', text: '×2 gold and materials' })) : null;
    return h('div', { class: 'ss-rw' }, h('div', { class: 'row' }, kids), unl);
  }
  // Trip settings: Keep going, the come-home chips (the between-battle party rules: one list, seen from here too) and
  // the rule set this stage remembers.
  const CHIPS = [
    { rule: HOME_RULE, label: 'Fatigue 75+', icon: 'fatigue', need: 'keepgoing', at: '1-6' },
    { rule: { if: 'bb_fell', do: 'home' }, label: 'An ally fell', icon: 'skull', need: 'tactician', at: '1-11' },
    { rule: { if: 'bb_next_boss', do: 'home' }, label: 'Before a boss or elite', icon: 'boss', need: 'cond:bb_next_boss', at: '1-15' },
    { rule: { if: 'bb_out', s: 'draught', do: 'home' }, label: 'Out of draughts', icon: 'flask', need: 'tactician', at: '1-11' },
  ];
  function roadSettings(i) {
    const s = Save.state, road = s.campaign.road, kg = Campaign.has('keepgoing');
    const prules = Tactics.owner('party').rules;
    const idxOf = r => prules.findIndex(x => x.if === r.if && x.do === r.do && (r.n == null || x.n === r.n) && (r.s == null || x.s === r.s));
    const chip = c => {
      const open = Campaign.has(c.need), k = idxOf(c.rule), on = open && k >= 0 && prules[k].on;
      return h('button', { class: 'chip' + (on ? ' on' : '') + (open ? '' : ' locked'), 'aria-pressed': on ? 'true' : 'false', disabled: !open, title: open ? `Party rule: ${ruleText(c.rule)}` : `Opens at ${c.at}`,
        onclick: () => {
          click();
          if (k >= 0) Tactics.toggle('party', k);
          else if (!Tactics.add('party', c.rule)) { toast(prules.length >= Tactics.owner('party').slots ? 'The party rules are full. Make room on the Tactics screen, or the Tactician adds slots.' : 'That rule isn’t taught yet.'); return; }
          Save.commit(); stageSheet(i);
        } }, ico(open ? (UI_ICONS[c.icon] ? c.icon : 'lantern') : 'lock'), c.label);
    };
    const sets = Tactics.sets(), cur = Campaign.setFor(i);
    const setRow = Campaign.has('tactician') && sets.length
      ? h('select', { class: 'setpick', 'aria-label': 'Rule set for this stage', onchange: e => { const v = e.target.value; if (v) { Campaign.chooseSet(i, v); toast(`“${v}” loaded`); } else Campaign.chooseSet(i, null); Save.commit(); } },
        h('option', { value: '' }, 'As they are'), sets.map(x => h('option', { value: x.name, selected: cur === x.name ? 'selected' : null }, x.name)))
      : h('span', { class: 'chip locked' }, ico('lock'), Campaign.has('tactician') ? 'Save a set on Tactics' : 'Opens at 1-11');
    return h('div', { class: 'panel roadset' },
      h('div', { class: 'row' }, h('span', { class: 'k', text: 'Keep going after a win' }), h('span', { class: 'sp' }),
        kg ? h('button', { class: 'tg' + (road.keepGoing ? ' on' : ''), role: 'switch', 'aria-checked': road.keepGoing ? 'true' : 'false', 'aria-label': 'Keep going after a win', onclick: () => { click(); road.keepGoing = !road.keepGoing; Save.commit(); stageSheet(i); } }, h('i'))
          : h('span', { class: 'chip locked' }, ico('lock'), 'Opens at 1-6')),
      h('div', { class: 'row wrap' }, h('span', { class: 'k', text: 'Come home when' }), h('span', { class: 'sp' }), h('div', { class: 'chips' }, CHIPS.map(chip))),
      h('div', { class: 'row' }, h('span', { class: 'k', text: 'Rule set' }), h('span', { class: 'sp' }), setRow));
  }
  // The party: each hero's sprite, level and fatigue sliver, tired heroes flagged. A Spent hero rests at camp until
  // fit again (below 50): the strip says when, and leads to the beds. Edit opens the Party board.
  const timeStr = ms => (typeof Camp !== 'undefined' ? Camp.timeStr(ms) : `${Math.max(1, Math.ceil(ms / 60000))}m`);
  const fitIn = (c, s) => (typeof Fatigue !== 'undefined' ? Fatigue.timeTo(c, REST.FIT - 0.01, s) : null);
  function partyStrip(st) {
    const s = Save.state, list = s.party.map(id => Save.char(id)).filter(Boolean);
    const out = list.filter(c => Campaign.spent(c));
    return h('div', { class: 'pstrip' },
      h('div', { class: 'ps-list' }, list.map(c => {
        const f = c.fatigue || 0, cls = Campaign.spent(c) ? 'spent' : f >= FATIGUE.EXHAUSTED ? 'exh' : f >= FATIGUE.WEARY ? 'weary' : '';
        const low = c.level < st.level;
        const t = Campaign.spent(c) ? fitIn(c, s) : null;
        return h('span', { class: 'ph ' + cls, title: `${c.name} · Lv ${c.level} · fatigue ${Math.floor(f)}${Campaign.spent(c) ? (t != null ? ` · Spent: fit in ${timeStr(t)}` : ' · Spent: can’t set out') : f >= FATIGUE.EXHAUSTED ? ' · Exhausted' : f >= FATIGUE.WEARY ? ' · Weary' : ''}` },
          h('img', { src: heroImgURL(c.cls, Items.look(c)), alt: '' }), h('b', { class: low ? 'low' : '', text: c.level }), h('span', { class: 'fbar' }, h('i', { style: `width:${f}%` })));
      })),
      h('div', { class: 'ps-acts' },
        out.length ? restNote(out, s) : h('span'),
        h('button', { class: 'small', onclick: () => { click(); closeSheet(); App.go('party'); } }, 'Edit party')));
  }
  // Spent heroes rest at camp: when the last of them is fit again. It opens the Infirmary, whose beds rest faster, or
  // the camp's fire before the Infirmary stands.
  function restNote(list, s) {
    const times = list.map(c => fitIn(c, s)), t = times.every(x => x != null) ? Math.max(...times) : null;
    const beds = typeof Base !== 'undefined' && Base.built('infirmary', s);
    const each = list.map((c, k) => `${c.name}: ${times[k] != null ? 'fit in ' + timeStr(times[k]) : 'Spent'}`).join(' · ');
    return h('button', { class: 'textbtn rest', title: `${each}. Spent heroes rest at camp, ${beds ? 'by the fire or faster in the Infirmary’s beds' : 'by the fire'}.`,
      onclick: () => { click(); closeSheet(); if (beds && App.actions.building) App.actions.building('infirmary'); else App.go('home'); } },
      ico('fatigue'), t != null ? `${list.length > 1 ? 'All fit' : 'Fit'} in ${timeStr(t)}` : 'Spent: resting');
  }
  // Set out (or farm): the party walks the lit road and the battle starts where they stop.
  function setOut(i) {
    click();
    const T = Campaign.setOut(i);
    if (!T) { toast('No one is fit to set out.'); return; }
    const set = Campaign.setFor(i);
    if (set) Campaign.chooseSet(i, set);
    Save.commit();
    closeSheet();
    App.go('battle', { stage: i });
  }

  App.screen('map', { tab: true, render, enter: () => App.rest() });
  return { render, stageSheet, wholeRoad, show: r => { region = r; App.go('map'); } };
})();
