'use strict';
// Lantern Road · the building screens (build step 5, home-base spec §3–§9): what each building does, what it holds, its
// focus, its next level and the level-3 and level-5 choices, and tearing it down. Also the sheet for building on an
// empty plot. You reach a building only through the camp ring (js/camp.js). The model is js/base.js.

const Buildings = (() => {
  const click = () => sfx('click');
  const s = () => Save.state;
  const noun = (n, a, b) => `${n} ${n === 1 ? a : b || a + 's'}`;
  const timeStr = ms => Camp.timeStr(ms);
  const art = (k, scale = 3) => { const c = sprite(BUILD_ART[k], BP, 'b:' + k); return h('img', { class: 'bart', src: c.toDataURL(), alt: '', style: `width:${c.width * scale}px;height:${c.height * scale}px` }); };
  const costEl = (c, st = s()) => h('span', { class: 'cost' },
    h('span', { class: st.currencies.gold < c.gold ? 'short' : '' }, ico('coin'), fmt(c.gold)),
    h('span', { class: (st.currencies.mats[c.mat] || 0) < c.n ? 'short' : '' }, ico(Base.matIcon(c.mat)), `${c.n} ${Base.matName(c.mat)}`));
  const gold = n => h('span', { class: 'gold' }, ico('coin'), fmt(n));
  let cur = null;
  function open(id) { cur = id; App.go('building', { id }); }
  // Redraws the open building screen in place, keeping its scroll.
  function redraw() {
    const v = document.querySelector('#views .view.bld-view:not(.out)');
    if (!v) return App.refresh();
    const y = v.scrollTop;
    v.replaceChildren(...page(cur));
    v.scrollTop = y;
  }
  const done = (msg, snd = 'kindle') => { Save.commit(); if (snd) sfx(snd); if (msg) toast(msg); redraw(); };

  // ── what each level gives (home-base spec §3–§4), in words
  function levelText(id, lv) {
    switch (id) {
      case 'tollhouse': return lv === 1 ? '50 × S gold an hour, or 1 party item an hour' : lv === 2 ? '65 × S gold an hour, or 1.3 party items' : lv === 4 ? '80 × S gold an hour, or 1.6 party items' : null;
      case 'infirmary': return [null, '2 beds, 20 fatigue an hour', '3 beds at 22 an hour', 'Beds at 26 an hour, and a still-room that brews a Healing Draught every 6 hours', '4 beds at 30 an hour', '5 beds at 35 an hour; the fire rests 14 an hour; the still-room also brews Smelling Salts'][lv];
      case 'trainingyard': return [null, '1 trainee, 10% of a level an hour', '2 trainees', null, '3 trainees', null][lv];
      case 'shop': return [null, 'Healing Draughts and Lamp Oil, and 2 pieces of gear', 'Adds Smelling Salts', 'Adds Bitter Tinctures, and a third piece of gear', 'Party items cost 15% less', '4 pieces of gear, at least one Fine or better'][lv];
      case 'tactician': return [null, '3 party rule slots', '3 loadout slots', 'Lesson II, and 4 party rule slots', 'Lesson III: Switch rule set, and 4 loadout slots', '5 party rule slots'][lv];
      case 'scavengercamp': return [null, '1.5 an hour', '2 an hour', null, '2.5 an hour', null][lv];
      case 'barracks': return `Roster cap ${BLV.roster[lv]}`;
      case 'salvagepit': return [null, 'A gear roll every 3 hours', 'Every 2.5 hours', null, 'Every 2 hours', null][lv];
      case 'mastershall': return [null, '1 room: Rule slot IV and Skill slot I', '2 rooms, and Rule slot V', 'Rule slot VI', 'Skill slot II', '3 rooms, and every lesson takes 25% less time'][lv];
      case 'shrine': return [null, 'Respec any hero for gold', 'Respecs cost 25% less', 'Unlearn: one skill’s points back for 20% of a respec', 'A free respec every 24 hours', 'Respecs cost 50% less'][lv];
      case 'whetstone': return `+${2 * lv}% Power, or +${lv}% Crit`;
      case 'ossuary': return `+${2 * lv}% max Health, or +${2 * lv}% Defense`;
      case 'hexingstone': return `+${2 * lv} landing chance for every kind, or +${4 * lv} for one`;
      case 'belltower': return `+${2 * lv}% to every resistance, or +${4 * lv}% to one`;
    }
    return null;
  }
  const RES_NAMES = { stun: 'Stun', move: 'Move', bleed: 'Bleed', blight: 'Blight', curse: 'Curse', debuff: 'Debuff' };
  // A passive building's bonus now, in words.
  function bonusText(id, st = s()) {
    const L = Base.level(id, st), f = (Base.rec(id, st) || {}).focus || '', kind = f.split(':')[1] || 'stun';
    if (!L) return '';
    if (id === 'whetstone') return f === 'point' ? `Point · +${L}% Crit` : `Edge · +${2 * L}% Power`;
    if (id === 'ossuary') return f === 'shell' ? `Shell · +${2 * L}% Defense` : `Bone · +${2 * L}% max Health`;
    if (id === 'hexingstone') return f.startsWith('deep') ? `Deep · +${4 * L} ${RES_NAMES[kind]} landing chance` : `Wide · +${2 * L} landing chance`;
    if (id === 'belltower') return f.startsWith('deep') ? `Deep · +${4 * L}% ${RES_NAMES[kind]} resistance` : `Wide · +${2 * L}% every resistance`;
    return '';
  }
  const rateText = (id, st = s()) => {
    const R = Base.rates(id, st);
    if (id === 'tollhouse') return [R.gold ? `${fmt(R.gold)} gold an hour` : null, R.items ? `${Math.round(R.items * 10) / 10} party items an hour` : null].filter(Boolean).join(' and ');
    if (id === 'scavengercamp') return Object.entries(R.mats || {}).map(([m, n]) => `${Math.round(n * 10) / 10} ${Base.matName(m).toLowerCase()} an hour`).join(' and ') + ` · a rare find ${Math.round(R.rare * 100)}% of hours`;
    if (id === 'salvagepit') return R.rolls ? `A gear roll every ${Math.round(10 / R.rolls) / 10} hours` : '';
    if (id === 'trainingyard') return `${Math.round(R.xp * 100)}% of a level an hour, at each trainee’s level`;
    return '';
  };

  // ── panels
  const panel = (...kids) => h('div', { class: 'bpanel' }, kids);
  const ey = text => h('span', { class: 'ey', text });
  function storedPanel(id, st) {
    const S = Base.storage(id, st), got = Base.preview(id, st);
    return panel(
      h('div', { class: 'row' }, h('span', { class: 'k', text: 'Stored' }), h('span', { class: 'sp' }), h('span', { class: 'kv', text: `${timeStr(Math.min(S.held, S.cap) || 60000)} / ${Base.storeHours(id, st)}h` })),
      h('span', { class: 'meter big' }, h('i', { style: `width:${Math.round(S.pct * 100)}%` })),
      S.fullFor > 60000 ? h('span', { class: 'k b', text: `Full for ${timeStr(S.fullFor)}: it stops until you collect` }) : h('span', { class: 'k', text: S.pct >= 1 ? 'Full: it stops until you collect' : `Full in ${timeStr(S.fullIn)} · ${rateText(id, st)}` }),
      h('div', { class: 'row' },
        h('div', { class: 'gotl' }, got.length ? got.map(g => h('span', { class: 'got' }, g.kind === 'gear' ? gearIco(g.piece.id) : g.kind === 'xp' ? h('img', { class: 'ico', src: heroPortrait(g.c), alt: '' }) : ico(g.kind === 'gold' ? 'coin' : g.kind === 'mat' ? Base.matIcon(g.mat) : ITEMS[g.item].icon), g.text.replace(/^\+/, ''))) : h('span', { class: 'k', text: 'Nothing yet' })),
        h('button', { class: 'small on', disabled: !got.length, onclick: () => { click(); const out = Base.collect(id, st); for (const g of out) if (g.kind === 'xp' && g.to > g.from) LevelUp.toast(g.c, { from: g.from, to: g.to }); done(out.map(g => g.text).join(' · '), 'coin'); } }, 'Collect')));
  }
  function focusPanel(id, st) {
    const D = BUILDINGS[id], x = Base.rec(id, st);
    let opts = [];
    if (id === 'scavengercamp') {
      const [a, b] = String(x.focus || 'r0').split(',');
      const wide = Base.hasChoice(id, 'widenet', st);
      opts = MATERIALS.map((m, r) => ({ key: 'r' + r, name: Base.regionName(r), line: `Mostly ${m.name.toLowerCase()}`, on: a === 'r' + r, second: wide && b === 'r' + r, lock: !Base.reached(r, st) }));
      return [ey(wide ? 'Focus · two regions, each at 60%' : 'Focus · where they scavenge'),
        h('div', { class: 'focus' }, opts.map(o => h('button', { class: 'fo' + (o.on || o.second ? ' sel' : '') + (o.lock ? ' lk' : ''), disabled: o.lock, onclick: () => {
          click();
          let f;
          if (!wide) f = o.key;
          else if (o.on) return;
          else f = `${a},${o.key}`;
          Base.setFocus(id, f, st); done(null, null);
        } }, o.lock ? ico('lock') : h('span', { class: 'radio' }), h('div', {}, h('span', { class: 'nm', text: o.name }), h('span', { class: 'k', text: o.lock ? 'Reach it on the road first' : o.line + (o.second ? ' · second region' : '') })), ico(Base.matIcon(MATERIALS[+o.key.slice(1)].id), 'm'))))];
    }
    if (!D.focus) return [];
    const f = x.focus || D.focus[0][0], base = f.split(':')[0], kind = f.split(':')[1] || 'stun';
    const out = [ey(D.passive ? 'Focus · free to change between trips' : 'Focus · what it gathers'),
      h('div', { class: 'focus' }, D.focus.map(([k, n, line]) => h('button', { class: 'fo' + (base === k ? ' sel' : ''), onclick: () => { click(); Base.setFocus(id, D.kinds ? `${k}:${kind}` : k, st); done(null, null); } },
        h('span', { class: 'radio' }), h('div', {}, h('span', { class: 'nm', text: n }), h('span', { class: 'k', text: line })))))];
    if (D.kinds && base === 'deep') out.push(h('div', { class: 'kinds' }, RES_KEYS.map(k => h('button', { class: 'small' + (kind === k ? ' on' : ''), onclick: () => { click(); Base.setFocus(id, `deep:${k}`, st); done(null, null); } }, RES_NAMES[k]))));
    return out;
  }
  function upgradePanel(id, st) {
    const D = BUILDINGS[id], L = Base.level(id, st), n = Base.next(id, st), x = Base.rec(id, st), out = [];
    if (!n) out.push(panel(h('span', { class: 'k', text: L >= 5 ? 'Fully built.' : '' })));
    else {
      out.push(ey(n.fork ? `Level ${n.level} · choose one` : `Next · level ${n.level}`));
      if (n.fork) {
        out.push(h('div', { class: 'fork' }, n.fork.map(([k, nm, line]) => h('button', { class: 'fk' + (pickFor[id] === k ? ' sel' : ''), onclick: () => { click(); pickFor[id] = k; redraw(); } }, h('span', { class: 'nm', text: nm }), h('span', { class: 'kv', text: line })))));
        const pk = pickFor[id];
        out.push(h('button', { class: 'btn primary', disabled: !pk || !n.can, onclick: () => { if (Base.upgrade(id, pk, st)) { delete pickFor[id]; done(`${D.name} · level ${n.level}`); } } },
          pk ? `Build ${D.choices[n.level].find(c => c[0] === pk)[1]}` : 'Pick one above', h('span', { class: 'sub' }, costEl(n.cost, st), n.can ? null : h('span', { class: 'short', text: ` · ${n.short} short` }))));
      } else {
        const t = levelText(id, n.level);
        out.push(h('button', { class: 'btn primary', disabled: !n.can, onclick: () => { if (Base.upgrade(id, null, st)) done(`${D.name} · level ${n.level}`); } },
          `Upgrade to level ${n.level}`, h('span', { class: 'sub' }, t ? t + ' · ' : '', costEl(n.cost, st), n.can ? null : h('span', { class: 'short', text: ` · ${n.short} short` }))));
      }
    }
    // choices taken, and switching them for that level's cost again
    if (D.choices) for (const lv of [3, 5]) {
      const c = x.choices[lv];
      if (!c) continue;
      const other = D.choices[lv].find(o => o[0] !== c), mine = D.choices[lv].find(o => o[0] === c), cost = Base.cost(id, lv);
      out.push(h('div', { class: 'chosen' }, h('span', { class: 'k', text: `Level ${lv}: ` }), h('b', { text: mine[1] }), h('span', { class: 'k', text: ` · ${mine[2]}` }),
        h('button', { class: 'small', disabled: !Base.canPay(cost, st), onclick: () => { click(); if (Base.rechoose(id, lv, other[0], st)) done(`Switched to ${other[1]}`); } }, `Switch to ${other[1]}`)));
    }
    if (D.plot !== false) out.push(h('div', { class: 'row teardown' }, h('span', { class: 'hint', text: 'Frees the plot. Nothing comes back.' }), h('button', { class: 'small danger', onclick: () => { click(); confirmTear(id); } }, 'Tear down')));
    return out;
  }
  const pickFor = {};
  function confirmTear(id) {
    const D = BUILDINGS[id], st = s();
    const goes = { infirmary: 'Its beds go, and so does the still-room.', tactician: 'Its party rule and loadout slots go. The conditions it taught stay.', barracks: 'The roster cap falls back. Nobody is sent away, but you can’t hire past the cap.', mastershall: 'Lessons under way are cancelled, with their progress kept. Slots already learned stay.', shop: 'The Shop and its gear stall go.', trainingyard: 'Trainees stop, and their stored XP is collected first.' }[id] || 'What it provides goes. What it taught stays.';
    openSheet(h('div', { class: 'box' },
      h('button', { class: 'sheet-x', 'aria-label': 'Close', onclick: () => { click(); closeSheet(); } }, '×'),
      h('div', { class: 'kicker', text: 'Tear down' }), h('h2', { text: `Tear down the ${D.name}?` }),
      h('p', { class: 'flavor', text: `The plot is freed and nothing comes back. ${goes} Anything stored is collected first. Raised again, it starts at level 1.` }),
      btn(`Tear down the ${D.name}`, () => { Base.tearDown(id, st); Save.commit(); closeSheet(); toast(`The ${D.name} is gone`); App.go('home'); }, 'danger'),
      btn('Keep it', closeSheet, 'primary')), 'sheet-bottom');
  }

  // ── each building's own panels
  function trainingPanel(st) {
    const ts = Base.trainees(st), cap = Base.yardCap(st), ceil = Base.yardCeiling(st), x = Base.rec('trainingyard', st);
    const rows = ts.map(cid => {
      const c = Save.char(cid), T = x.trainees[cid], w = Fatigue.where(c, st), capped = c.level >= ceil;
      return h('div', { class: 'rost' }, h('img', { class: 'sbox', src: heroPortrait(c), alt: '' }),
        h('div', {}, h('span', { class: 'nm', text: c.name }), h('span', { class: 'k', text: capped ? `Lv ${c.level} · at the road’s level: no more to learn here` : w === 'road' ? `Lv ${c.level} · out on the road` : `Lv ${c.level} · ${timeStr(T.held || 60000)} stored` })),
        h('button', { class: 'small', onclick: () => { click(); Base.setTrainee(cid, false, st); done(`${c.name} stops training`, null); } }, 'Stop'));
    });
    const free = st.roster.filter(c => !ts.includes(c.id) && !st.base.hall[c.id]);
    return [ey(`Trainees · ${ts.length} of ${cap}`),
      h('div', { class: 'pickl' }, rows.length ? rows : h('p', { class: 'k', text: 'Nobody is training.' })),
      ts.length < cap && free.length ? h('div', { class: 'addl' }, free.map(c => h('button', { class: 'small', onclick: () => { click(); if (Base.setTrainee(c.id, true, st)) done(`${c.name} trains in the yard`, null); } }, h('img', { class: 'ico', src: heroPortrait(c), alt: '' }), c.name))) : null,
      h('p', { class: 'hint', text: `Trainees stop at level ${ceil}, the level of your highest lit stage: the yard can’t teach what the road hasn’t. They rest at the fire’s pace${Base.hasChoice('trainingyard', 'harddrills', st) ? ', except under Hard Drills' : ''}, and setting out takes them out of the yard until the party is home. Yard XP doesn’t count toward Renown.` })];
  }
  function infirmaryPanel(st) {
    const beds = st.base.beds, L = Base.level('infirmary', st);
    const rows = beds.map((cid, i) => {
      const c = cid && Save.char(cid);
      if (!c) return h('div', { class: 'rost empty' }, ico('tent', 'l'), h('div', {}, h('span', { class: 'nm', text: `Bed ${i + 1}` }), h('span', { class: 'k', text: 'Empty: the next tired hero at camp takes it' })), h('span'));
      const t = Fatigue.timeTo(c, 0, st), pinned = st.base.pins.includes(c.id);
      return h('div', { class: 'rost' }, h('img', { class: 'sbox', src: heroPortrait(c), alt: '' }),
        h('div', {}, h('span', { class: 'nm', text: c.name }), h('span', { class: 'k', text: `Fatigue ${Math.floor(c.fatigue)} · rested in ${timeStr(t || 0)}` }), h('span', { class: 'meter' }, h('i', { style: `width:${Math.min(100, c.fatigue)}%;background:var(--doom)` }))),
        h('button', { class: 'small' + (pinned ? ' on' : ''), onclick: () => { click(); Fatigue.pin(c.id, !pinned, st); done(pinned ? `${c.name} unpinned` : `${c.name} keeps this bed`, null); } }, pinned ? 'Pinned' : 'Pin'));
    });
    const fire = st.roster.filter(c => Fatigue.where(c, st) === 'fire' && c.fatigue > 0);
    const brew = Base.brewWaiting(st);
    return [ey(`Beds · ${BLV.bedRate[L]} fatigue an hour`), h('div', { class: 'pickl' }, rows),
      fire.length ? [ey(`At the fire · ${L >= 5 ? REST.FIRE5 : REST.FIRE} an hour`), h('div', { class: 'pickl' }, fire.map(c => h('div', { class: 'rost' }, h('img', { class: 'sbox', src: heroPortrait(c), alt: '' }),
        h('div', {}, h('span', { class: 'nm', text: c.name }), h('span', { class: 'k', text: `Fatigue ${Math.floor(c.fatigue)} · rested in ${timeStr(Fatigue.timeTo(c, 0, st) || 0)}` })),
        h('button', { class: 'small', onclick: () => { click(); Fatigue.pin(c.id, true, st); done(`${c.name} takes the first free bed`, null); } }, 'Pin'))))] : null,
      L >= 3 ? [ey('The still-room'), panel(h('div', { class: 'row' }, h('span', { class: 'k', text: brew.length ? brew.map(g => g.text).join(' · ') : `Brews a Healing Draught every 6 hours, up to 4${L >= 5 ? ', and Smelling Salts every 24, up to 2' : ''}` }), h('span', { class: 'sp' }),
        h('button', { class: 'small on', disabled: !brew.length, onclick: () => { click(); const out = Base.collectBrew(st); done(out.map(g => g.text).join(' · '), 'coin'); } }, 'Collect')))] : null,
      h('p', { class: 'hint', text: 'The most tired heroes at camp take the beds. A hero keeps a bed until fully rested or until they leave camp. Pin a hero to give them the next free bed.' })];
  }
  function boardPanel(st) {
    if (!Base.boardOpen(st)) return [panel(h('p', { class: 'flavor', text: 'The board is bare. Clear 1-2 on the road, and the first faces arrive, the first one free.' }))];
    const b = st.board, cap = Base.rosterCap(st), full = st.roster.length >= cap;
    const pick = sel.recruit && b.recruits.find(r => r.id === sel.recruit) ? sel.recruit : (b.recruits[0] || {}).id;
    const statBar = (r, k, icon, label) => {
      const [a, z] = CLASSES[r.cls].stats[k], v = r.base[k], q = z > a ? clamp((v - a) / (z - a), 0, 1) : 0.5;
      return h('div', { class: 'rng' }, ico(icon), h('span', { class: 'k', text: label }), h('span', { class: 'tr' }, h('i', { class: q >= 0.8 ? 'hi' : q <= 0.2 ? 'lo' : '', style: `left:${Math.round(q * 96)}%` })), h('span', { class: 'v' + (q >= 0.8 ? ' g' : q <= 0.2 ? ' b' : ''), text: k === 'spd' ? v.toFixed(1) : String(v) }));
    };
    const hint = r => { const best = STAT_KEYS.map(k => [k, rel(r, k)]).sort((x, y) => y[1] - x[1]), hi = best[0], lo = best[best.length - 1]; return `${{ hp: 'Sturdy', mp: 'Deep reserves', pow: 'Hits hard', def: 'Hard to hurt', spd: 'Quick', crit: 'A keen eye', dodge: 'Slippery' }[hi[0]]}${lo[1] < 0.25 ? `, ${{ hp: 'but breaks easily', mp: 'but runs dry', pow: 'but hits soft', def: 'but thin-skinned', spd: 'but slow', crit: 'but rarely lands a crit', dodge: 'but easy to hit' }[lo[0]]}` : ''}.`; };
    const rel = (r, k) => { const [a, z] = CLASSES[r.cls].stats[k]; return z > a ? (r.base[k] - a) / (z - a) : 0.5; };
    const cards = b.recruits.map(r => {
      const on = r.id === pick, price = Base.recruitPrice(r, st);
      return h('button', { class: 'recruit' + (on ? ' sel' : ''), 'aria-pressed': on ? 'true' : 'false', onclick: () => { click(); sel.recruit = r.id; redraw(); } },
        h('div', { class: 'row' }, h('span', { class: 'sbox' }, h('img', { src: heroImgURL(r.cls, [Items.starter(r.cls, 1).id, null, null]), alt: '' })),
          h('div', { class: 'who' }, h('span', { class: 'nm', text: r.name }), h('span', { class: 'k', text: `${CLASSES[r.cls].name} · Lv ${r.level}${r.storied ? (r.storied.combine ? ` · combined with the ${CLASSES[r.storied.combine].name}` : ' · an awakened skill') : ''}` })),
          price ? gold(price) : h('span', { class: 'tag g', text: 'Free' })),
        on ? [statBar(r, 'pow', 'sword', 'Power'), statBar(r, 'spd', 'boot', 'Speed'), statBar(r, 'hp', 'heart', 'Health'), statBar(r, 'def', 'shield', 'Defense'), h('span', { class: 'hint', text: hint(r) })] : null);
    });
    const r = b.recruits.find(x => x.id === pick), price = r ? Base.recruitPrice(r, st) : 0;
    const why = !r ? '' : b.picks <= 0 ? 'No picks left on this board' : full ? 'The roster is full: dismiss someone, or build the Barracks' : st.currencies.gold < price ? `${fmt(price - st.currencies.gold)} gold short` : '';
    const tracks = Object.entries(BOARD_TRACKS).map(([k, T]) => {
      const rk = b.ranks[k], c = Base.rankCost(k, st);
      return h('div', { class: 'track' }, h('div', {}, h('span', { class: 'nm', text: `${T.name} · rank ${rk}/${T.ranks.length}` }), h('span', { class: 'k', text: T.give(rk) }), c ? h('span', { class: 'k e', text: `Next: ${T.give(rk + 1)}` }) : null),
        c ? h('button', { class: 'small', disabled: !Base.canPay(c, st), onclick: () => { click(); if (Base.buyRank(k, st)) done(`${T.name} · rank ${rk + 1}`); } }, costEl(c, st)) : h('span', { class: 'tag g', text: 'Done' }));
    });
    return [
      h('div', { class: 'row tags' }, h('span', { class: 'tag e', text: noun(b.picks, 'pick') + ' left' }), h('span', { class: 'tag' }, ico('hourglass'), `New board ${timeStr(Base.boardIn(st))}`), h('span', { class: 'sp' }), h('span', { class: 'k', text: `Roster ${st.roster.length}/${cap}` })),
      cards.length ? h('div', { class: 'recruits' }, cards) : panel(h('p', { class: 'k', text: 'Everyone on this board has been hired. A new board comes when the party comes home from a battle, or with the timer.' })),
      r ? h('button', { class: 'btn primary', disabled: !!why, onclick: () => {
        const c = Base.hire(r.id, st);
        if (!c) return;
        sel.recruit = null; Tactics.owner(c.id);
        done(`${c.name} the ${CLASSES[c.cls].name} joins the company${st.party.includes(c.id) ? '' : ' (the formation is full: they wait at camp)'}`);
      } }, `Hire ${r.name}${price ? ' · ' + fmt(price) + ' gold' : ' · free'}`, why ? h('span', { class: 'sub', text: why }) : null) : null,
      h('p', { class: 'hint', text: 'Stat bars show where each roll falls in the class’s range: green near the top, red near the bottom. A better roll costs more.' }),
      ey('Upgrades'), h('div', { class: 'tracks' }, tracks)];
  }
  const sel = { recruit: null, shrine: null };
  function hallPanel(st) {
    const ids = Base.inHall(st), rooms = Base.rooms(st);
    const away = ids.map(cid => { const c = Save.char(cid), l = Base.lessonOf(cid, st); return h('div', { class: 'rost' }, h('img', { class: 'sbox', src: heroPortrait(c), alt: '' }),
      h('div', {}, h('span', { class: 'nm', text: c.name }), h('span', { class: 'k', text: `${l.L.name} · ${timeStr(l.left)} left` }), h('span', { class: 'meter' }, h('i', { style: `width:${Math.round(l.pct * 100)}%;background:var(--doom)` }))),
      h('button', { class: 'small', onclick: () => { click(); Base.cancelLesson(cid, st); done(`${c.name} comes home. Their progress is kept.`, null); } }, 'Cancel')); });
    const rows = [];
    for (const c of st.roster) {
      if (ids.includes(c.id)) continue;
      const ls = Base.lessonsFor(c, st), why = Base.whyNotStudy(c, st);
      if (!ls.length) continue;
      rows.push(h('div', { class: 'lesson' }, h('div', { class: 'row' }, h('img', { class: 'sbox', src: heroPortrait(c), alt: '' }), h('div', {}, h('span', { class: 'nm', text: c.name }), h('span', { class: 'k', text: `${CLASSES[c.cls].name} · Lv ${c.level} · ${Hero.ruleSlots(c)} of ${Hero.ruleMax(c)} rule slots` }))),
        ls.map(o => h('div', { class: 'lrow' }, h('div', {}, h('b', { text: o.L.name }), h('span', { class: 'k', text: `${timeStr(o.need - o.done)}${o.done ? ' left' : ''} · ${o.gold ? fmt(o.gold) + ' gold' : 'paid'}${o.why ? ' · ' + o.why : ''}` })),
          h('button', { class: 'small on', disabled: !!(o.why || why), onclick: () => { click(); if (Base.startLesson(c.id, o.L.id, st)) done(`${c.name} begins ${o.L.name}`); } }, why && !o.why ? (why.includes('room') ? 'No room' : 'Busy') : 'Start')))));
    }
    return [ey(`Rooms · ${ids.length} of ${rooms} in use`), away.length ? h('div', { class: 'pickl' }, away) : null,
      ey('Lessons'), rows.length ? h('div', { class: 'lessons' }, rows) : panel(h('p', { class: 'k', text: 'No hero is ready for a lesson yet. Rule slot IV needs level 15, and Skill slot I level 20.' })),
      h('p', { class: 'hint', text: 'A hero at a lesson is away: out of the party, resting at the fire’s pace. Cancel brings them home and keeps their progress, and the gold is only paid once. What they learn stays, even if the Hall comes down.' })];
  }
  function shrinePanel(st) {
    const L = Base.level('shrine', st), free = Base.freeRespecIn(st);
    const rows = st.roster.map(c => {
      const P = Hero.points(c), spent = c.level - 1 - P.stat + Math.floor(c.level / 5) - P.skill, price = Base.respecPrice(c, st);
      return h('div', { class: 'rost' }, h('img', { class: 'sbox', src: heroPortrait(c), alt: '' }),
        h('div', {}, h('span', { class: 'nm', text: c.name }), h('span', { class: 'k', text: `Lv ${c.level} · ${noun(spent, 'point')} placed${c.respecs ? ` · ${noun(c.respecs, 'free respec')} from thresholds` : ''}` })),
        h('div', { class: 'col' },
          h('button', { class: 'small', disabled: !spent || st.currencies.gold < price, onclick: () => { click(); confirmRespec(c, price, false); } }, gold(price)),
          free === 0 ? h('button', { class: 'small on', disabled: !spent, onclick: () => { click(); confirmRespec(c, 0, true); } }, 'Free') : null,
          L >= 3 ? h('button', { class: 'small', onclick: () => { click(); unlearnSheet(c); } }, 'Unlearn') : null));
    });
    return [ey('Respecs'), h('div', { class: 'pickl' }, rows),
      L >= 4 ? h('p', { class: 'hint', text: free === 0 ? 'Today’s free respec is ready.' : `The next free respec in ${timeStr(free)}.` }) : null,
      h('p', { class: 'hint', text: 'A respec returns every stat and skill point. Opened tiers, combined classes and open awakenings stay. Free respecs from level thresholds are on each hero’s sheet.' })];
  }
  function confirmRespec(c, price, free) {
    openSheet(h('div', { class: 'box' },
      h('button', { class: 'sheet-x', 'aria-label': 'Close', onclick: () => { click(); closeSheet(); } }, '×'),
      h('div', { class: 'kicker', text: 'The Shrine' }), h('h2', { text: `Respec ${c.name}?` }),
      h('p', { class: 'flavor', text: 'Every stat and skill point comes back to place again. Awakened skills go back to level 1.' }),
      btn(free ? 'Use the free respec' : `Respec for ${fmt(price)} gold`, () => { if (Base.respec(c.id, Save.state, { free })) { closeSheet(); done(`${c.name}’s points are back`); } }, 'primary'),
      btn('Keep the build', closeSheet)), 'sheet-bottom');
  }
  function unlearnSheet(c) {
    const st = s(), price = Base.unlearnPrice(c, st);
    const skills = Object.keys(c.skills).filter(id => !(c.classes.some(k => CLASSES[k].starter === id) && c.skills[id] <= 1));
    openSheet(h('div', { class: 'box' },
      h('button', { class: 'sheet-x', 'aria-label': 'Close', onclick: () => { click(); closeSheet(); } }, '×'),
      h('div', { class: 'kicker', text: 'Unlearn' }), h('h2', { text: `One of ${c.name}’s skills` }),
      h('p', { class: 'flavor', text: `Its points come back, for ${fmt(price)} gold: 20% of a full respec. A starter skill goes back to level 1.` }),
      h('div', { class: 'pickl' }, skills.length ? skills.map(id => h('button', { class: 'rost', disabled: st.currencies.gold < price, onclick: () => { click(); if (Base.unlearn(c.id, id, st)) { closeSheet(); done(`${c.name} unlearns ${SKILLS[id].name}`); } } },
        ico(SKILLS[id].icon, 'l'), h('div', {}, h('span', { class: 'nm', text: SKILLS[id].name }), h('span', { class: 'k', text: `Level ${c.skills[id]}` })), gold(price))) : h('p', { class: 'k', text: 'Nothing to unlearn.' }))), 'sheet-bottom');
  }
  function shopPanel(st) {
    const items = Base.shopItems(st), stall = st.shop.stall, room = Items.room(st);
    const owned = Object.keys(ITEMS).filter(k => (st.inventory.potions[k] || 0) > 0);
    return [ey('Party items'),
      h('div', { class: 'pickl' }, items.map(it => h('div', { class: 'rost' }, ico(ITEMS[it.id].icon, 'l'),
        h('div', {}, h('span', { class: 'nm', text: ITEMS[it.id].name }), h('span', { class: 'ds', text: ITEMS[it.id].tip }), h('span', { class: 'k', text: `${it.have} in the Bag` })),
        h('div', { class: 'col' }, h('button', { class: 'small', disabled: st.currencies.gold < it.price, onclick: () => { click(); if (Base.buyItem(it.id, 1, st)) done(`Bought a ${ITEMS[it.id].name}`, 'coin'); } }, gold(it.price)),
          h('button', { class: 'small', disabled: st.currencies.gold < it.price * 5, onclick: () => { click(); if (Base.buyItem(it.id, 5, st)) done(`Bought 5 × ${ITEMS[it.id].name}`, 'coin'); } }, '×5'))))),
      h('p', { class: 'hint', text: `Prices rise with your furthest region${Base.shopLevel(st) >= 4 ? ', less 15% at this Shop' : ''}.` }),
      ey(`Gear stall · new stock in ${timeStr(Base.stallIn(st) || 0)}`),
      stall.length ? h('div', { class: 'stall' }, stall.map(x => { const p = Base.stallPrice(x, st), D = GEAR[x.id]; return h('div', { class: 'gearc r-' + D.rarity }, gearIco(x.id, 'l'),
        h('div', {}, h('span', { class: 'nm', text: D.name }), h('span', { class: 'k', text: `${Items.kind(x)} · item level ${x.lv}` })),
        h('button', { class: 'small', disabled: st.currencies.gold < p || room <= 0, onclick: () => { click(); const got = Base.buyGear(x.uid, st); if (got) done(`${D.name} is in the Bag`, 'coin'); } }, gold(p))); })) : panel(h('p', { class: 'k', text: 'Sold out until the next stock.' })),
      room <= 0 ? h('p', { class: 'hint b', text: 'The Bag is full: sell some gear first.' }) : null,
      owned.length ? [ey('Sell party items'), h('div', { class: 'addl' }, owned.map(k => h('button', { class: 'small', onclick: () => { click(); const g = Base.sellItem(k, st); if (g) done(`Sold a ${ITEMS[k].name} for ${g} gold`, 'coin'); } }, ico(ITEMS[k].icon), `${st.inventory.potions[k]} · sell for ${Base.itemSell(k, st)}`)))] : null];
  }
  function tacticianPanel(st) {
    const L = Base.level('tactician', st);
    return [ey('Now'), panel(h('div', { class: 'stats2' },
      h('div', { class: 'stt' }, h('span', { class: 'k', text: 'Party rule slots' }), h('span', { class: 'v', text: String(Base.partySlots(st)) })),
      h('div', { class: 'stt' }, h('span', { class: 'k', text: 'Loadout slots' }), h('span', { class: 'v', text: String(Base.loadoutSlots(st)) })))),
      ey('Lessons'), h('div', { class: 'pickl' },
        // Lesson I is the road's (the 1-11 clear); the building's levels 3 and 4 teach the next two.
        lessonRow('Lesson I', TACTICIAN_I_LINE, Base.unlocked('tactician', st), 'Clear 1-11'),
        Object.entries(TACTICIAN_LESSONS).map(([lv, T]) => lessonRow(T.name, T.line, L >= +lv, `Level ${lv}`))),
      h('p', { class: 'hint', text: 'Lesson I came with the 1-11 clear, on the road. What the Tactician teaches stays if it comes down, but its slots go with it.' })];
  }
  function lessonRow(name, line, got, when) {
    return h('div', { class: 'rost' + (got ? '' : ' no') }, ico(got ? 'check' : 'lock', 'l'),
      h('div', {}, h('span', { class: 'nm', text: name }), h('span', { class: 'k', text: line })), h('span', { class: 'tag ' + (got ? 'g' : ''), text: got ? 'Taught' : when }));
  }
  function barracksPanel(st) {
    const L = Base.level('barracks', st);
    return [panel(h('div', { class: 'stats2' }, h('div', { class: 'stt' }, h('span', { class: 'k', text: 'Roster' }), h('span', { class: 'v', text: `${st.roster.length}/${Base.rosterCap(st)}` })),
      L < 5 ? h('div', { class: 'stt' }, h('span', { class: 'k', text: 'Next level' }), h('span', { class: 'v', text: String(BLV.roster[L + 1]) })) : null))];
  }
  function passivePanel(id, st) { return [panel(h('span', { class: 'kv e', text: bonusText(id, st) }), h('span', { class: 'k', text: 'Every hero, in every battle.' }))]; }

  // ── the page
  function page(id) {
    const st = s(), D = BUILDINGS[id];
    Base.tick(st);
    if (!D || !Base.built(id, st)) return [h('button', { class: 'btn back', onclick: () => { click(); App.go('home'); } }, '‹ Camp'), h('p', { class: 'flavor', text: 'It isn’t standing.' })];
    const x = Base.rec(id, st), L = x.level;
    const body = [];
    if (D.idle) body.push(storedPanel(id, st));
    if (id === 'trainingyard') body.push(...trainingPanel(st));
    if (id === 'infirmary') body.push(...infirmaryPanel(st));
    if (id === 'recruitboard') body.push(...boardPanel(st));
    if (id === 'mastershall') body.push(...hallPanel(st));
    if (id === 'shrine') body.push(...shrinePanel(st));
    if (id === 'shop') body.push(...shopPanel(st));
    if (id === 'tactician') body.push(...tacticianPanel(st));
    if (id === 'barracks') body.push(...barracksPanel(st));
    if (D.passive) body.push(...passivePanel(id, st));
    body.push(...focusPanel(id, st));
    if (id !== 'recruitboard') body.push(...upgradePanel(id, st));
    const plot = D.plot === false ? 'Outside the plots' : `Plot ${x.plot + 1}`;
    return flat([
      h('div', { class: 'bhead' },
        h('button', { class: 'btn back', onclick: () => { click(); App.go('home'); } }, '‹ Camp'),
        h('div', { class: 'bwell' }, art(D.art, 3)),
        h('div', { class: 'kicker', text: id === 'recruitboard' ? plot : `${plot} · level ${L}` }),
        h('h1', { text: D.name }),
        h('p', { class: 'flavor', text: D.line })),
      ...body,
    ]);
  }
  const flat = a => a.flat(Infinity).filter(x => x != null && x !== false);
  App.screen('building', {
    tab: true, parent: 'home',
    render(p) { cur = p.id || cur; const v = h('div', { class: 'bld-view' }); v.append(...page(cur)); return v; },
  });
  // keep numbers moving while a building is open
  setInterval(() => { if (App.current === 'building' && !document.hidden && sheet.hidden) { Base.tick(Save.state); redraw(); } }, 15000);

  // ── building on an empty plot (the screen mockups' "Build here")
  const UNLOCK_WHERE = { recruitboard: '1-2', tollhouse: 'clear 1-5', infirmary: 'clear 1-7', trainingyard: 'clear 1-8', shop: 'clear 1-10', tactician: 'clear 1-11', scavengercamp: 'clear 1-13', barracks: 'clear 1-15', salvagepit: 'clear 1-16', 'region:1': 'reach the Drowned Chapel', 'region:2': 'reach Thornwood', 'region:3': 'reach the Ashen Keep' };
  function buildSheet(plot, chosen) {
    const st = s();
    const avail = Base.available(st), later = BUILDING_ORDER.filter(id => BUILDINGS[id].plot !== false && !Base.built(id, st) && !Base.blueprint(id, st));
    const pick = chosen && avail.includes(chosen) ? chosen : avail[0];
    const builtN = BUILDING_ORDER.filter(id => BUILDINGS[id].plot !== false && Base.built(id, st)).length;
    const R = Base.renown(st);
    const opts = avail.map(id => { const D = BUILDINGS[id], c = Base.cost(id, 1); return h('button', { class: 'opt' + (id === pick ? ' sel' : ''), onclick: () => { click(); buildSheet(plot, id); } },
      h('span', { class: 'well bld' }, art(D.art, 2)), h('div', {}, h('span', { class: 'nm', text: D.name }), h('span', { class: 'k', text: D.line }), costEl(c, st)), id === pick ? h('span', { class: 'tag e', text: 'Pick' }) : h('span')); });
    const c = pick && Base.cost(pick, 1), can = pick && Base.canPay(c, st);
    openSheet(h('div', { class: 'box buildbox' },
      h('button', { class: 'sheet-x', 'aria-label': 'Close', onclick: () => { click(); closeSheet(); } }, '×'),
      h('div', { class: 'row' }, h('div', {}, h('span', { class: 'ey', text: `Plot ${plot + 1}${Base.renownFor(plot) ? ' · Renown ' + Base.renownFor(plot) : ''}` }), h('h2', { text: 'Build here' })), h('span', { class: 'sp' }), h('span', { class: 'kv', text: `${builtN}/${Base.plotsCleared(st)} built` })),
      opts.length ? h('div', { class: 'opts' }, opts) : h('p', { class: 'flavor', text: 'No blueprints yet. The road brings them: the Toll House comes with 1-5.' }),
      later.length ? h('div', { class: 'later' }, h('span', { class: 'ey', text: 'Later' }), later.slice(0, 4).map(id => h('span', { class: 'k' }, ico('lock'), `${BUILDINGS[id].name} · ${UNLOCK_WHERE[BUILDINGS[id].unlock] || 'later'}`))) : null,
      h('div', { class: 'row' }, h('span', { class: 'hint', text: 'Every plot you fill is a choice.' }), h('span', { class: 'sp' }), R.nextPlot ? h('span', { class: 'k', text: `Next plot · Renown ${R.nextPlot}` }) : null),
      pick ? h('button', { class: 'btn primary', disabled: !can, onclick: () => {
        if (!Base.build(pick, plot, st)) return;
        Save.commit(); sfx('kindle'); closeSheet();
        toast(`The ${BUILDINGS[pick].name} stands`);
        App.refresh();
      } }, `Build the ${BUILDINGS[pick].name}`, h('span', { class: 'sub' }, costEl(c, st), can ? null : h('span', { class: 'short', text: ` · ${Base.short(c, st)} short` }))) : null), 'sheet-bottom');
  }

  return { open, buildSheet, bonusText, levelText, redraw };
})();
