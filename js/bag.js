'use strict';
// Lantern Road · gear on screen (build step 4): the item card, choosing who wears a piece, and the Bag.
// After the screen mockups (docs/mockups/index.html, "Equipment"). The hero sheet's Gear tab (js/sheet.js) uses the
// card and the try-on. Every change goes through the item model (js/items.js) and is saved.
//   The card    a Now and With pair of sprites, then the bands Always, Costs and When (a row condition is checked
//               against where the hero stands), what it changes against what they wear, and Equip, Unequip or Sell.
//   The Bag     every piece not worn, filtered by slot, with selling and the prototype's gear roll.

const GearUI = (() => {
  const ui = { filter: 'all', sort: 'rarity', region: 0, rank: 'normal', confirm: null, stages: [] };
  const click = () => sfx('click');
  const RANK_ORDER = { relic: 0, rare: 1, fine: 2, common: 3 };
  const rowOf = c => { const i = Save.state.party.indexOf(c.id); return i < 0 ? null : i < 2 ? 'front' : 'back'; };
  const rowWord = r => (r === 'front' ? 'front row' : r === 'back' ? 'back row' : 'resting');
  // The order pieces show in: by slot, then rarity, then level.
  const byOrder = (a, b) => SLOTS.indexOf(Items.def(a).slot) - SLOTS.indexOf(Items.def(b).slot) || RANK_ORDER[Items.rarity(a)] - RANK_ORDER[Items.rarity(b)] || b.lv - a.lv;
  const sorted = list => list.slice().sort(ui.sort === 'level' ? (a, b) => b.lv - a.lv || byOrder(a, b) : ui.sort === 'new' ? (a, b) => (b.fresh ? 1 : 0) - (a.fresh ? 1 : 0) || byOrder(a, b) : byOrder);
  const stopStages = () => { ui.stages.forEach(s => s.stop()); ui.stages = []; };

  // ── a piece's tile: its icon in a frame of its rarity's colour, with what it means against what is worn
  // o: { c (the hero it is compared with), sel, onclick }
  function tile(x, o = {}) {
    const D = Items.def(x), c = o.c, worn = c && c.gear[D.slot] && c.gear[D.slot].uid === x.uid;
    const can = !c || Items.canUse(c, x);
    let mark = null;
    if (c && can && !worn) {
      const now = c.gear[D.slot], d = Items.score(x) - (now ? Items.score(now) : 0);
      mark = d > 0.5 ? h('span', { class: 'up', text: '▲' }) : d < -0.5 ? h('span', { class: 'dn', text: '▼' }) : null;
    }
    return h('button', { class: `gr-it r-${D.rarity}${o.sel ? ' sel' : ''}${can ? '' : ' no'}`, 'aria-label': `${D.name}, ${RARITY_NAMES[D.rarity]}, level ${x.lv}${worn ? ', worn' : ''}`, onclick: o.onclick },
      gearIco(x.id, 'l'), x.fresh ? h('span', { class: 'nw' }) : null, mark, worn ? h('span', { class: 'worn', text: 'ON' }) : null, h('span', { class: 'lv', text: String(x.lv) }));
  }

  // ── the bands: Always, Costs, When
  function bandsEl(x, where) {
    const B = Items.bands(x, where);
    const later = l => (l.later ? h('span', { class: 'hs-tag ph-l', text: 'Later · step 5' }) : null);
    const line = (l, cls) => h('p', { class: 'ln ' + cls }, ico(l.icon || 'star'), h('span', { text: l.text }), later(l));
    const out = [];
    if (B.good.length) out.push(h('span', { class: 'band g', text: 'Always' }), ...B.good.map(l => line(l, 'g')));
    if (B.bad.length) out.push(h('span', { class: 'band b', text: 'Costs' }), ...B.bad.map(l => line(l, 'b')));
    if (B.when.length) {
      out.push(h('span', { class: 'band e', text: 'When' }));
      for (const l of B.when) out.push(h('p', { class: 'ln w' + (l.on === false ? ' off' : '') + (l.cost ? ' cost' : '') }, h('span', { class: 'hs-tag ' + (l.cost ? 'b' : 'e'), text: l.tag }), ico(l.icon || 'star'), h('span', { text: l.text }),
        l.on === false ? h('span', { class: 'hs-tag', text: 'Off · ' + rowWord(where.row) }) : l.on === true ? h('span', { class: 'hs-tag g', text: 'On · ' + rowWord(where.row) }) : null, later(l)));
    }
    if (!out.length) out.push(h('p', { class: 'ln', text: 'No effect.' }));
    return h('div', { class: 'gr-eff' }, out);
  }

  // ── what changes for a hero: their stats now and with the piece on
  function withPiece(c, x) {
    const copy = JSON.parse(JSON.stringify(c));
    copy.gear[Items.def(x).slot] = x;
    return copy;
  }
  function compare(c, x) {
    const row = rowOf(c) || CLASSES[c.cls].row, now = Hero.sheet(c, row), wth = Hero.sheet(withPiece(c, x), row);
    const rows = [];
    const fmtV = (k, v) => (k === 'spd' ? (Math.round(v * 10) / 10).toFixed(1) : k === 'crit' || k === 'dodge' || k.startsWith('res:') ? Math.round(v) + '%' : fmt(v));
    for (const k of STAT_ORDER) {
      const a = now[k], b = wth[k], d = k === 'spd' ? Math.round((b - a) * 10) / 10 : Math.round(b) - Math.round(a);
      if (!d) continue;
      rows.push([GEAR_STAT_ICONS[k], GEAR_STAT_NAMES[k], fmtV(k, a), fmtV(k, b), d]);
    }
    for (const k of RES_KEYS) { const d = Math.round(wth.res[k]) - Math.round(now.res[k]); if (d) rows.push([{ stun: 'stun', move: 'boot', bleed: 'bleed', blight: 'poison', curse: 'doom', debuff: 'weak' }[k], RESISTS[k].name, Math.round(now.res[k]) + '%', Math.round(wth.res[k]) + '%', d]); }
    const old = c.gear[Items.def(x).slot];
    if (!rows.length) return h('p', { class: 'hs-why', text: `${old ? 'Against ' + Items.def(old).name : 'With nothing worn there'}, no plain stat changes: the difference is the effect.` });
    return h('table', { class: 'gr-cmp', 'aria-label': 'What it changes' },
      h('thead', {}, h('tr', {}, h('th', { text: old ? 'vs ' + Items.def(old).name : 'vs nothing worn' }), h('th', { text: 'Now' }), h('th', { text: 'With' }), h('th', { text: 'Change' }))),
      h('tbody', {}, rows.length ? rows.map(([icon, name, a, b, d]) => h('tr', {}, h('td', {}, ico(icon), name), h('td', { text: a }), h('td', { text: b }), h('td', { class: d > 0 ? 'g' : 'b', text: `${d > 0 ? '▲' : '▼'} ${Math.abs(d)}` }))) : h('tr', {}, h('td', { colspan: '4', class: 'same', text: 'No change to plain stats: the difference is the effect.' }))));
  }

  // A small stage with a hero in some gear. label: the corner word.
  function miniStage(c, look, label, withCls) {
    const el = h('div', { class: 'gr-mini' + (withCls ? ' with' : '') }, h('span', { class: 'hs-k' + (withCls ? ' e' : ''), text: label }));
    requestAnimationFrame(() => { if (document.body.contains(el)) ui.stages.push(new SpriteStage(el, { cls: c.cls, look, scale: 4, hx: 0.5, dummy: false, ambient: [] })); });
    return el;
  }
  const lookWith = (c, x) => { const l = Items.look(c); l[SLOTS.indexOf(Items.def(x).slot)] = x.id; return l; };

  // ── the card. uid: the piece. o: { hero (the character it is shown against), back (what Close returns to) }
  function card(uid, o = {}) {
    stopStages();
    const st = Save.state, f = Items.find(st, uid);
    if (!f) { closeSheet(); return; }
    const x = f.item, D = Items.def(x);
    if (x.fresh) { delete x.fresh; Save.commit(); }
    let c = o.hero ? Save.char(o.hero) : f.where === 'worn' ? f.c : null;
    // From the Bag: show it against the first hero in the party who can use it.
    if (!c) c = st.party.map(id => id && Save.char(id)).filter(Boolean).find(r => Items.canUse(r, x)) || st.roster.find(r => Items.canUse(r, x)) || null;
    const can = c && Items.canUse(c, x), mine = f.where === 'worn' && f.c === c, other = f.where === 'worn' && f.c !== c ? f.c : null;
    const where = { row: c ? rowOf(c) : null };
    const price = Items.sellPrice(x, st);
    const done = () => { closeSheet(); stopStages(); if (o.after) o.after(); };
    const top = can
      ? h('div', { class: 'gr-duo' }, miniStage(c, Items.look(c), `${c.name} now`), miniStage(c, mine ? Items.look(c) : lookWith(c, x), mine ? 'Wearing it' : 'With it', true))
      : null;
    const head = h('div', { class: 'gr-head' }, h('span', { class: 'gr-well r-' + D.rarity }, gearIco(x.id, 'xl')),
      h('div', {}, h('h2', { text: D.name }), h('span', { class: 'gr-kind r-' + D.rarity, text: Items.kind(x) }),
        h('span', { class: 'hs-kv', text: `Item level ${x.lv}${D.rarity === 'relic' ? ' · unique' : price ? ` · sells for ${fmt(price)} gold` : ''}` })));
    const kids = [h('button', { class: 'sheet-x', 'aria-label': 'Close', onclick: () => { click(); done(); } }, '×'), top,
      h('div', { class: 'gr-card r-' + D.rarity }, head, bandsEl(x, where), D.flavor ? h('p', { class: 'gr-flavor', text: `“${D.flavor}”` }) : null)];
    if (c && !can) kids.push(h('div', { class: 'hs-banner' }, ico('lock', 'm'), h('span', { class: 'txt', text: Items.whyNot(c, x) })));
    if (can && !mine) kids.push(compare(c, x));
    if (other) kids.push(h('p', { class: 'hs-why', text: `${other.name} wears it now. Equipping it here hands ${other.name} what ${c.name} wears instead, if they can use it.` }));
    // Who else can use it, with a better or worse mark against what they wear.
    const users = st.roster.filter(r => r !== c && Items.canUse(r, x) && !(f.where === 'worn' && f.c === r));
    if (!can && users.length) kids.push(h('span', { class: 'hs-k', text: 'Who can use it' }), pickList(x, users.slice(0, 4), done));
    // the buttons
    const sell = f.where === 'bag' && price ? sellButton(x, price, done) : null;
    const row = [];
    if (mine) row.push(h('button', { class: 'btn', onclick: () => { Items.unequip(st, c, D.slot); Save.commit(); sfx('guard'); toast(`${D.name} goes back in the Bag`); done(); } }, 'Unequip'));
    else if (sell) row.push(sell);
    if (can && !mine) row.push(h('button', { class: 'btn primary', onclick: () => { if (Items.equip(st, c, x.uid)) { Save.commit(); sfx('equip'); toast(`${c.name} equips ${D.name}`); done(); } } }, `Equip on ${c.name}`));
    if (!can && !users.length) row.push(h('button', { class: 'btn', onclick: () => { click(); done(); } }, 'Close'));
    if (f.where === 'bag' && can && users.length) kids.push(h('button', { class: 'gr-other', onclick: () => { click(); pickHero(x, o); } }, 'Equip on another hero ›'));
    if (row.length) kids.push(h('div', { class: 'hs-row gr-actions' }, row));
    openSheet(h('div', { class: 'box hs-card gr-box' }, kids), 'sheet-bottom');
  }
  // Sell, with a second tap to make sure.
  function sellButton(x, price, done) {
    const b = h('button', { class: 'btn gr-sell', onclick: () => {
      if (ui.confirm !== x.uid) { ui.confirm = x.uid; sfx('click'); b.textContent = `Sell for ${fmt(price)}? Tap again`; b.classList.add('arm'); setTimeout(() => { if (ui.confirm === x.uid) { ui.confirm = null; b.textContent = `Sell · ${fmt(price)}`; b.classList.remove('arm'); } }, 2600); return; }
      ui.confirm = null;
      const g = Items.sell(Save.state, x.uid);
      if (g) { Save.commit(); sfx('coin'); toast(`Sold ${Items.def(x).name} for ${fmt(g)} gold`); App.refresh(); }
      done();
    } }, ico('coin'), `Sell · ${fmt(price)}`);
    return b;
  }
  // A list of heroes who could wear a piece, each with what they'd gain.
  function pickList(x, list, done) {
    const D = Items.def(x);
    return h('div', { class: 'gr-pick' }, list.map(r => {
      const now = r.gear[D.slot], d = Items.score(x) - (now ? Items.score(now) : 0);
      return h('button', { class: 'gr-who', onclick: () => { if (Items.equip(Save.state, r, x.uid)) { Save.commit(); sfx('equip'); toast(`${r.name} equips ${D.name}`); done(); } } },
        h('img', { src: heroPortrait(r), alt: '' }),
        h('div', {}, h('b', { text: r.name }), h('span', { class: 'hs-k', text: `${CLASSES[r.cls].name} · Lv ${r.level}${now ? ' · ' + Items.def(now).name : ' · nothing worn'}` })),
        h('span', { class: 'hs-tag ' + (d > 0.5 ? 'g' : d < -0.5 ? 'b' : ''), text: d > 0.5 ? '▲ Better' : d < -0.5 ? '▼ Worse' : 'Similar' }));
    }));
  }
  function pickHero(x, o) {
    stopStages();
    const D = Items.def(x), list = Save.state.roster.filter(r => Items.canUse(r, x));
    openSheet(h('div', { class: 'box hs-card gr-box' },
      h('button', { class: 'sheet-x', 'aria-label': 'Close', onclick: () => { click(); closeSheet(); } }, '×'),
      h('div', { class: 'gr-head' }, h('span', { class: 'gr-well r-' + D.rarity }, gearIco(x.id, 'xl')), h('div', {}, h('span', { class: 'kicker', text: 'Equip on' }), h('h2', { text: D.name }), h('span', { class: 'gr-kind r-' + D.rarity, text: Items.kind(x) }))),
      list.length ? pickList(x, list, () => { closeSheet(); if (o.after) o.after(); }) : h('p', { class: 'hs-why', text: 'Nobody on the roster can use it.' }),
      btn('Back to the card', () => card(x.uid, o))), 'sheet-bottom');
  }

  // ── the Bag
  const levelOf = region => [[1, 10], [11, 30], [31, 50], [51, 75], [76, 100]][region];
  function rollPrototype(n, classes) {
    const st = Save.state, [a, b] = levelOf(ui.region), got = [];
    let sold = 0;
    for (let i = 0; i < n; i++) {
      const x = Items.roll(a + Math.floor(Math.random() * (b - a + 1)), ui.region, Math.random, { rank: ui.rank, classes: classes || st.roster.map(c => c.cls) });
      const r = Items.add(st, x);
      if (r.added) got.push(x); else sold += r.sold || 0;
    }
    Save.commit(); sfx('coin');
    if (got.length) toast(n === 1 ? `Found ${Items.def(got[0]).name} (${RARITY_NAMES[Items.rarity(got[0])]})` : `${got.length} pieces into the Bag`);
    if (sold) toast(`The Bag is full: sold on the spot for ${fmt(sold)} gold`);
    return got;
  }
  function grantNextRelic() {
    const st = Save.state, id = RELICS.find(r => !Items.owns(st, r));
    if (!id) { toast('You own every Relic'); return; }
    const x = Items.grantRelic(st, id);
    Save.commit(); sfx('region'); toast(`A Relic: ${Items.def(x).name}`);
  }
  function bagView() {
    const st = Save.state, all = st.inventory.items;
    const list = sorted(all.filter(x => ui.filter === 'all' || Items.def(x).slot === ui.filter));
    const commons = all.filter(x => Items.rarity(x) === 'common');
    const chip = (k, n) => h('button', { class: 'chip' + (ui.filter === k ? ' on' : ''), onclick: () => { click(); ui.filter = k; App.refresh(); } }, n);
    const worn = st.roster.filter(c => SLOTS.some(k => c.gear[k]));
    return h('div', { class: 'bag' },
      h('div', { class: 'kicker', text: `${all.length} of ${ITEM.BAG} pieces` }), h('h1', { text: 'The Bag' }),
      h('p', { class: 'tagline', text: 'Gear not being worn. Tap a piece for its card: who it suits, what it costs, and what it sells for.' }),
      h('div', { class: 'gr-filters' }, chip('all', 'All'), chip('weapon', 'Weapons'), chip('armor', 'Armour'), chip('accessory', 'Accessories'),
        h('button', { class: 'chip sort', onclick: () => { click(); ui.sort = { rarity: 'level', level: 'new', new: 'rarity' }[ui.sort]; App.refresh(); } }, 'Sort · ' + { rarity: 'rarity', level: 'level', new: 'new' }[ui.sort])),
      h('div', { class: 'gr-meter' }, h('i', { style: `width:${Math.min(100, 100 * all.length / ITEM.BAG)}%` + (all.length >= ITEM.BAG ? ';background:var(--bad)' : '') })),
      list.length ? h('div', { class: 'gr-inv' }, list.map(x => tile(x, { onclick: () => { click(); card(x.uid, { after: () => App.refresh() }); } })))
        : h('p', { class: 'ph-note' }, all.length ? 'Nothing of that kind.' : 'The Bag is empty. Gear drops on the road from build step 6; until then, roll some below.'),
      all.length >= ITEM.BAG ? h('div', { class: 'hs-banner' }, ico('bag', 'm'), h('span', { class: 'txt', text: 'The Bag is full. New gear is sold where it drops until you make room.' })) : null,
      commons.length ? btn(`Sell every Common piece · ${fmt(commons.reduce((a, x) => a + Items.sellPrice(x, st), 0))} gold`, () => confirmSellCommons(commons), '', `${commons.length} piece${commons.length === 1 ? '' : 's'}. Fine, Rare and Relics stay.`) : null,
      h('h3', { class: 'sect', text: 'Worn by your heroes' }),
      h('div', { class: 'gr-worn' }, (worn.length ? worn : st.roster).map(c => h('button', { class: 'rrow gr-wrow', onclick: () => { click(); App.actions.hero(c.id, 'gear'); } },
        h('img', { src: heroPortrait(c), alt: '' }),
        h('span', { class: 'nm' }, h('b', { text: c.name }), h('span', { text: CLASSES[c.cls].name + ' · Lv ' + c.level })),
        h('span', { class: 'gr-three' }, SLOTS.map(k => (c.gear[k] ? h('span', { class: 'gr-mini-it r-' + Items.rarity(c.gear[k]) }, gearIco(c.gear[k].id)) : h('span', { class: 'gr-mini-it none' })))),
        h('span', { class: 'chev', 'aria-hidden': 'true' })))),
      prototypeBox());
  }
  function confirmSellCommons(list) {
    const st = Save.state, total = list.reduce((a, x) => a + Items.sellPrice(x, st), 0);
    openSheet(h('div', { class: 'box' },
      h('button', { class: 'sheet-x', 'aria-label': 'Close', onclick: () => { click(); closeSheet(); } }, '×'),
      h('div', { class: 'kicker', text: 'Sell' }), h('h2', { text: `${list.length} Common piece${list.length === 1 ? '' : 's'}` }),
      h('p', { class: 'flavor', text: `For ${fmt(total)} gold. Gear your heroes wear isn't touched.` }),
      btn(`Sell them · ${fmt(total)} gold`, () => { let g = 0; for (const x of list) g += Items.sell(st, x.uid); Save.commit(); sfx('coin'); closeSheet(); toast(`Sold for ${fmt(g)} gold`); App.refresh(); }, 'primary'),
      btn('Keep them', closeSheet)), 'sheet-bottom');
  }
  // Until the road drops gear (build step 6): roll it by hand, at a region's rates and levels.
  function prototypeBox() {
    const chip = (on, label, fn) => h('button', { class: 'chip' + (on ? ' on' : ''), onclick: () => { click(); fn(); App.refresh(); } }, label);
    const od = Items.odds(ui.region, ui.rank), [a, b] = levelOf(ui.region);
    return h('div', { class: 'gr-proto' },
      h('div', { class: 'hs-row' }, h('span', { class: 'ph-tag', text: 'Prototype' }), h('b', { text: 'Roll gear' })),
      h('p', { class: 'hs-why', text: `Until stages drop loot (build step 6). Region ${['I', 'II', 'III', 'IV', 'V'][ui.region]}: item level ${a}–${b}, ${od.common}% Common, ${od.fine}% Fine, ${od.rare}% Rare.` }),
      h('div', { class: 'gr-filters' }, ['I', 'II', 'III', 'IV', 'V'].map((n, i) => chip(ui.region === i, n, () => { ui.region = i; }))),
      h('div', { class: 'gr-filters' }, [['normal', 'Road'], ['elite', 'Elite'], ['boss', 'Boss']].map(([k, n]) => chip(ui.rank === k, n, () => { ui.rank = k; }))),
      h('div', { class: 'hs-row' },
        h('button', { class: 'small', onclick: () => { rollPrototype(1); App.refresh(); } }, 'Roll 1'),
        h('button', { class: 'small', onclick: () => { rollPrototype(6); App.refresh(); } }, 'Roll 6'),
        h('button', { class: 'small', onclick: () => { grantNextRelic(); App.refresh(); } }, ico('star'), 'A Relic')));
  }
  App.screen('bag', {
    tab: true,
    render() { stopStages(); return bagView(); },
    enter() { App.rest(); },
  });
  return { card, tile, pickHero, rollPrototype, stopStages, rowOf, sorted };
})();
