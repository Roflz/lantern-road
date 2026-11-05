"""Checks the Bag (js/bag.js, screen 9; docs/mockups/hero-card.html's Bag state) in headless Chromium through real
input, and takes its screenshots.

From a save set up in the page (six heroes, four set out, a Bag of 21 pieces with a Relic among them), it opens the
Bag from the Hearth's Bag button, then, with taps where things are drawn (through the quarter-turn when turned):
  - the cards, the piece's card and the portraits sit inside the frame without overlapping, the anchors are there, and
    the screen keeps to two typefaces with no letter-spaced capitals
  - the sorts: rarity puts the Relic first, name orders the names, slot orders the slots, fits puts what fits first;
    a sort's tooltip says what it does (with a mouse)
  - a tap on a piece shows its card; a portrait changes whose ▲ ▼ the cards show, and whom Give to names
  - Sell takes two taps and pays its price; a Relic has no Sell; a piece the hero can't use says so, with no Give to
  - Give to opens the hero card dressing, with the piece tried on; Wear wears it; the card's ‹ comes back to the Bag
  - ‹ goes back to the Hearth
  python tools/bag_heroes_check.py [--sizes 844x390,667x375t,390x844t] [--shots docs/screens]
--shots saves into its bag/ folder. A size ending in t has a touch screen (and 390x844t is turned).
"""
import argparse, functools, http.server, os, socketserver, sys, threading
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SIZES = '844x390,667x375t,390x844t'

SETUP = """
() => {
  const s = Save.state, P = (cls, name, level, fat) => {
    const c = s.roster.length ? Hero.create(cls, 'c' + s.nextId++, { name, level }) : Base.newGame(cls, s, { name });
    if (level > 1 && c.level < level) Hero.gainXp(c, Hero.xpBetween(c.level, level));
    Hero.autoBuild(c);
    c.fatigue = fat; if (fat >= 100) c.spent = true;
    if (!s.roster.includes(c)) { s.roster.push(c); Base.place(c, s); }
    Tactics.owner(c.id);
    return c;
  };
  closeScreen();
  s.settings.tips = false;
  if (typeof FirstSession !== 'undefined') FirstSession.skip(); // Wick's first session: done (tools/guide_check.py walks it)
  const ids = {};
  for (const [k, cls, lv, f] of [['fulke', 'sellsword', 6, 41], ['brand', 'warden', 5, 22], ['isolde', 'crossbowman', 4, 18], ['agnes', 'pilgrim', 6, 56], ['morrow', 'hexblade', 3, 0], ['tobin', 'lamplighter', 2, 100]])
    ids[k] = P(cls, k[0].toUpperCase() + k.slice(1), lv, f).id;
  s.party = [ids.fulke, ids.brand, ids.isolde, ids.agnes, null, null];
  for (let k = 0; k < 8; k++) Proto.lightNext(s);
  s.inventory.items = [];
  for (const [id, lv] of [['notchedsword', 1], ['gravecutter', 3], ['hexedkris', 2], ['chapelcenser', 2], ['windlass', 3], ['watchmansflail', 2], ['rustyshiv', 1],
    ['travellerscoat', 2], ['brigandine', 3], ['gravediggersleathers', 2], ['huntershauberk', 3], ['gravewardensplate', 4], ['mothsilk', 4],
    ['bonecharm', 1], ['knucklebone', 2], ['haresfoot', 1], ['courierspur', 3], ['vanguardsbadge', 2], ['tallowcoin', 3], ['bloodcontract', 3]]) Items.add(s, Items.make(id, lv));
  Items.grantRelic(s, 'gravediggersspade');
  for (const x of s.inventory.items) delete x.fresh;
  Base.tick(s);
  Save.commit();
  App.go('home', {}, { instant: true });
  document.querySelectorAll('#toasts .toast').forEach(t => t.remove());
  return ids;
}
"""
TYPE = """(sel) => { const out = new Set();
  for (const el of document.querySelectorAll(sel + ' *')) {
    if (![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
    const cs = getComputedStyle(el), fam = cs.fontFamily;
    if (!/Pirata One|Spectral/.test(fam.split(',')[0])) out.add('font ' + fam.split(',')[0] + ' on ' + el.className);
    if (cs.textTransform === 'uppercase' && cs.letterSpacing !== 'normal') out.add('spaced capitals on ' + el.className);
    if (parseFloat(cs.fontSize) < 9) out.add('tiny text on ' + el.className);
  }
  return [...out]; }"""
INSIDE = """(sels) => { const F = Frame.W, out = [];
  for (const sel of sels) { const el = document.querySelector(sel); if (!el) { out.push('missing ' + sel); continue; } const b = Frame.box(el); if (b.left < 3 || b.top < 3 || b.right > F - 3 || b.bottom > 387) out.push(sel + ' ' + [b.left, b.top, b.right, b.bottom].map(Math.round)); }
  return out; }"""
APART = """(pairs) => pairs.filter(([a, b]) => { const p = Frame.box(document.querySelector(a)), q = Frame.box(document.querySelector(b)); return p.left < q.right - 1 && q.left < p.right - 1 && p.top < q.bottom - 1 && q.top < p.bottom - 1; }).map(x => x.join(' overlaps '))"""


class Server(socketserver.ThreadingTCPServer):
    daemon_threads = True
    request_queue_size = 64


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--sizes', default=SIZES)
    ap.add_argument('--shots', default='')
    a = ap.parse_args()
    srv = Server(('127.0.0.1', 0), functools.partial(Quiet, directory=ROOT))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    port = srv.server_address[1]
    fails, errors = [], []
    for d in ('bag',):
        if a.shots:
            os.makedirs(os.path.join(a.shots, d), exist_ok=True)

    def check(ok, what):
        print(('  ok   ' if ok else '  FAIL ') + what)
        if not ok:
            fails.append(what)
        return ok

    with sync_playwright() as p:
        b = p.chromium.launch()
        for size in a.sizes.split(','):
            touch = size.endswith('t')
            w, h = (int(v) for v in size.rstrip('t').split('x'))
            ctx = b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=1, is_mobile=touch, has_touch=touch)
            page = ctx.new_page()
            tag = f'{w}x{h}{" touch" if touch else ""}'
            page.on('console', lambda m, t=tag: errors.append(f'{t}: {m.text}') if m.type == 'error' else None)
            page.on('pageerror', lambda e, t=tag: errors.append(f'{t}: {e}'))
            page.goto(f'http://127.0.0.1:{port}/index.html')
            js = page.evaluate
            page.wait_for_function("typeof Title !== 'undefined' && Title.ready", timeout=60000, polling=50)
            page.click('#title')
            page.wait_for_timeout(700)
            ids = js(SETUP)
            page.wait_for_timeout(900)
            print(f'{tag}: frame {js("Frame.W")} wide{", turned" if js("Frame.turned") else ""}')

            def shot(folder, name):
                if a.shots:
                    js("document.querySelectorAll('#toasts .toast').forEach(t => t.remove()); Tip.hide()")
                    page.wait_for_timeout(150)
                    page.screenshot(path=os.path.join(a.shots, folder, f'{name}-{w}x{h}.png'))

            def centre(sel):
                return js("(sel) => { const el = document.querySelector(sel); if (!el) return null; const b = Frame.box(el); return [b.left + b.width / 2, b.top + b.height / 2]; }", sel)

            def client(x, y):
                return js("([x, y]) => { const r = document.getElementById('stage').getBoundingClientRect(), k = Frame.k; return Frame.turned ? [r.left + (Frame.H - y) * k, r.top + x * k] : [r.left + x * k, r.top + y * k]; }", [x, y])

            def tap(sel, wait=350):
                js("(sel) => { const el = document.querySelector(sel), g = el && el.closest('[data-scroll]'); if (g && el !== g) el.scrollIntoView({ block: 'nearest' }); }", sel)
                c = centre(sel)
                if not c:
                    print(f'  (nothing to tap: {sel})')
                    return False
                x, y = client(*c)
                if touch:
                    page.touchscreen.tap(x, y)
                else:
                    page.mouse.click(x, y)
                page.wait_for_timeout(wait)
                return True

            exists = lambda sel: js(f"!!document.querySelector('{sel}')")
            count = lambda sel: js(f"document.querySelectorAll('{sel}').length")
            cards = lambda: js("[...document.querySelectorAll('[data-tut=bag-piece]')].map(el => { const x = Items.find(Save.state, el.dataset.uid).item, D = Items.def(x); return [D.name, D.rarity, D.slot, el.dataset.uid]; })")
            bag_n = lambda: js("Save.state.inventory.items.length")

            # ── the Bag, from the Hearth
            tap('[data-tut="hearth-bag"]', wait=700)
            check(js("App.current") == 'bag' and exists('.bg-view'), f'{tag}: the Hearth\'s Bag opens the Bag ({js("App.current")})')
            bad = js(INSIDE, ['.hc-back', '.hc-title', '.hc-sorts', '.bg-grid', '.bg-card', '.bg-for']) + js(APART, [['.bg-grid', '.bg-card'], ['.bg-grid', '.bg-for'], ['.hc-title', '.hc-sorts'], ['.bg-card', '.bg-for']])
            check(not bad, f'{tag}: the cards, the piece\'s card and the portraits sit inside the frame, apart {bad}')
            missing = [t for t in ['bag-back', 'bag-sort-fits', 'bag-sort-rarity', 'bag-sort-name', 'bag-sort-slot', 'bag-piece', 'bag-for', 'bag-give', 'bag-sell'] if not exists(f'[data-tut="{t}"]')]
            check(not missing, f'{tag}: the anchors are there {missing}')
            bad = js(TYPE, '.bg-view')
            check(not bad, f'{tag}: two typefaces, no letter-spaced capitals, no text under 9 px {bad}')
            n = bag_n()
            check(count('[data-tut="bag-piece"]') == n and js("document.querySelector('.hc-title span').textContent") == f'{n} / 60', f'{tag}: {n} pieces, and {n} / 60 by the title')
            check(js("document.querySelector('.bg-card .pc-nm').textContent") == js("Items.def(Items.find(Save.state, document.querySelector('[data-tut=bag-piece]').dataset.uid).item).name"), f'{tag}: the first piece\'s card shows')
            shot('bag', 'bag')

            # the sorts
            tap('[data-tut="bag-sort-rarity"]')
            got = cards()
            ranks = ['relic', 'rare', 'fine', 'common']
            check(got[0][1] == 'relic' and [ranks.index(r) for _, r, _, _ in got] == sorted(ranks.index(r) for _, r, _, _ in got), f'{tag}: rarity puts the Relic first, then Rare, Fine, Common')
            tap('[data-tut="bag-sort-name"]')
            names = [x[0] for x in cards()]
            check(names == js("(n) => n.slice().sort((a, b) => a.localeCompare(b))", names), f'{tag}: name orders the names')
            tap('[data-tut="bag-sort-slot"]')
            order = ['weapon', 'armor', 'accessory']
            slots = [order.index(x[2]) for x in cards()]
            check(slots == sorted(slots), f'{tag}: slot orders the slots')
            tap('[data-tut="bag-sort-fits"]')
            fits = js("[...document.querySelectorAll('[data-tut=bag-piece]')].map(el => !el.classList.contains('no'))")
            check(fits == sorted(fits, reverse=True) and any(fits) and not all(fits), f'{tag}: fits puts what Fulke can use first, the rest dimmed')
            if not touch:
                x, y = client(*centre('[data-tut="bag-sort-name"]'))
                page.mouse.move(x, y)
                page.wait_for_timeout(300)
                t = js("(() => { const t = document.querySelector('.tp'); return t ? t.textContent : ''; })()")
                check(t == 'Sort by name', f'{tag}: a sort\'s tooltip says what it does ({t!r})')
                page.mouse.move(2, 2)

            # a piece's card; whose ▲ ▼
            uid = js("[...document.querySelectorAll('[data-tut=bag-piece]')].find(el => el.dataset.uid !== GearUI.sel && Items.def(Items.find(Save.state, el.dataset.uid).item).slot === 'armor').dataset.uid")
            tap(f'[data-uid="{uid}"]')
            check(js("GearUI.sel") == uid and js("document.querySelector('.bg-card .pc-nm').textContent") == js(f"Items.def(Items.find(Save.state, '{uid}').item).name"), f'{tag}: a tap on a piece shows its card')
            give = js("document.querySelector('[data-tut=bag-give]').textContent")
            tap(f'[data-tut="bag-for"][data-id="{ids["agnes"]}"]')
            check(js("GearUI.for") == ids['agnes'] and js("document.querySelector('[data-tut=bag-give]').textContent") == 'Give to Agnes' and give == 'Give to Fulke', f'{tag}: a portrait chooses whose ▲ ▼ show, and whom Give to names ({give} → Agnes)')

            # Sell: two taps; a Relic has none; a piece the hero can't use
            tap('[data-tut="bag-sell"]')
            armed = js("document.querySelector('[data-tut=bag-sell]').textContent")
            price = js(f"Items.sellPrice(Items.find(Save.state, '{uid}').item, Save.state)")
            check(armed == f'Sell · {price}' and bag_n() == n, f'{tag}: the first tap on Sell shows its price ({armed!r})')
            shot('bag', 'sell')
            gold = js("Save.state.currencies.gold")
            tap('[data-tut="bag-sell"]', wait=450)
            check(bag_n() == n - 1 and js("Save.state.currencies.gold") == gold + price and not js(f"Items.find(Save.state, '{uid}')"), f'{tag}: the second sells it for {price} gold')
            relic = js("document.querySelector('[data-tut=bag-piece][data-uid]') && [...document.querySelectorAll('[data-tut=bag-piece]')].find(el => Items.rarity(Items.find(Save.state, el.dataset.uid).item) === 'relic').dataset.uid")
            tap(f'[data-uid="{relic}"]')
            check(not exists('[data-tut="bag-sell"]'), f'{tag}: a Relic has no Sell')
            sword = js("[...document.querySelectorAll('[data-tut=bag-piece]')].find(el => Items.find(Save.state, el.dataset.uid).item.id === 'notchedsword').dataset.uid")
            tap(f'[data-uid="{sword}"]')
            check(not exists('[data-tut="bag-give"]') and js("document.querySelector('.bg-no').textContent") == 'Can’t use', f'{tag}: a sword Agnes can\'t use says so, with no Give to')

            # Give to: the hero card, dressing, with the piece tried on
            tap(f'[data-tut="bag-for"][data-id="{ids["fulke"]}"]')
            if js("GearUI.sel") != sword:
                tap(f'[data-uid="{sword}"]')
            tap('[data-tut="bag-give"]', wait=700)
            check(js("App.current") == 'hero' and js("HeroSheet.id") == ids['fulke'] and js("HeroSheet.mode") == 'dress' and exists('.hr-arch.trying') and exists(f'.hr-cover [data-uid="{sword}"].sel'),
                  f'{tag}: Give to opens Fulke\'s card, dressing, with the sword tried on')
            shot('bag', 'give')
            tap('[data-tut="gear-wear"]', wait=450)
            check(js(f"Save.char('{ids['fulke']}').gear.weapon.uid") == sword, f'{tag}: Wear wears it')
            tap('[data-tut="hero-back"]', wait=600)
            check(js("App.current") == 'bag' and bag_n() == n - 1, f'{tag}: the card\'s ‹ comes back to the Bag, with his old weapon in it')
            tap('[data-tut="bag-back"]', wait=600)
            check(js("App.current") == 'home', f'{tag}: ‹ goes back to the Hearth')
            ctx.close()
        b.close()
    srv.shutdown()
    if errors:
        print('console errors:')
        for e in errors:
            print('  ' + e)
    print(f'{"FAILED: " + str(len(fails)) if fails or errors else "all passed"}')
    sys.exit(1 if fails or errors else 0)


if __name__ == '__main__':
    main()
