"""Checks the Tactics screen (js/rules.js TacticsEditor, screen 11) in headless Chromium through real input, and takes its
screenshots.

From a save set up in the page (four heroes set out, the road lit to 1-11 so the Tactician's sets are open), it opens
Tactics on Brand the Warden from the hero card's Edit tactics, then, with taps where things are drawn (through the
quarter-turn when the frame is turned):
  - the owners, the panel and the picker sit inside the frame, the guide's anchors are there, and no word says "rules"
  - a condition: tapping tactic 1's "when" and a condition in the picker changes it; its number steps with ‹ ›
  - the lantern switches a tactic off and on
  - an action: tapping tactic 2's "do" and a skill not equipped changes it and flags it with a red "!", and the owner
    gets a red dot; a long press on the "!" chip says why; a long press on a condition shows its glossary line
  - + add makes a third tactic (a condition, then an action), and dragging its grip to the top moves it there
  - ✕ Tactic removes one
  - the owners: the Party shows its tactics and Return to the Hearth; the Loadout's picker puts an item in a slot
  - sets: Save under a name, the chip shows it, a change clears it, Load brings it back, Delete takes two taps
  - Back returns to the hero card
  python tools/tactics_check.py [--sizes 844x390,667x375t,1280x720,390x844t] [--shots docs/screens/tactics]
A size ending in t has a touch screen (and 390x844t is turned).
"""
import argparse, functools, http.server, os, socketserver, sys, threading
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SIZES = '844x390,667x375t,1280x720,390x844t'

SETUP = """
() => {
  const s = Save.state, P = (cls, name, level) => {
    const c = s.roster.length ? Hero.create(cls, 'c' + s.nextId++, { name, level }) : Base.newGame(cls, s, { name });
    if (level > 1 && c.level < level) Hero.gainXp(c, Hero.xpBetween(c.level, level));
    Hero.autoBuild(c);
    if (!s.roster.includes(c)) { s.roster.push(c); Base.place(c, s); }
    Tactics.owner(c.id);
    return c;
  };
  closeScreen();
  s.settings.tips = false;
  if (typeof FirstSession !== 'undefined') FirstSession.skip(); // Wick's first session: done (tools/guide_check.py walks it)
  const ids = {};
  for (const [k, cls, lv] of [['fulke', 'sellsword', 6], ['brand', 'warden', 5], ['isolde', 'crossbowman', 4], ['agnes', 'pilgrim', 6]])
    ids[k] = P(cls, k[0].toUpperCase() + k.slice(1), lv).id;
  s.party = [ids.brand, ids.fulke, ids.isolde, ids.agnes, null, null];
  for (let k = 0; k < 11; k++) Proto.lightNext(s);
  for (const c of s.roster) c.fatigue = 0;
  Tactics.learnMany(['self_mp_lt:50', 'self_mp_lt:25', 'self_mp_lt:75', 'foe_lowest']);
  Base.tick(s);
  Save.commit();
  App.go('home', {}, { instant: true });
  return ids;
}
"""


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--sizes', default=SIZES)
    ap.add_argument('--shots', default='')
    a = ap.parse_args()
    srv = socketserver.TCPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=ROOT))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    port = srv.server_address[1]
    fails, errors = [], []
    if a.shots:
        os.makedirs(a.shots, exist_ok=True)

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
            cdp = ctx.new_cdp_session(page)
            ids = js(SETUP)
            page.wait_for_timeout(900)
            print(f'{tag}: frame {js("Frame.W")} wide{", turned" if js("Frame.turned") else ""}')

            def shot(name):
                if a.shots:
                    js("document.querySelectorAll('#toasts .toast').forEach(t => t.remove())")
                    page.wait_for_timeout(120)
                    page.screenshot(path=os.path.join(a.shots, f'{name}-{w}x{h}.png'))

            def centre(sel):
                return js("(sel) => { const el = document.querySelector(sel); if (!el) return null; const b = Frame.box(el); return [b.left + b.width / 2, b.top + b.height / 2]; }", sel)

            def client(x, y):
                return js("([x, y]) => { const r = document.getElementById('stage').getBoundingClientRect(), k = Frame.k; return Frame.turned ? [r.left + (Frame.H - y) * k, r.top + x * k] : [r.left + x * k, r.top + y * k]; }", [x, y])

            def tap(sel, wait=300):
                # a choice down a list is scrolled into the middle of it first, as a player would
                js("(sel) => { const el = document.querySelector(sel), l = el && el.closest('.tx-opts, .tx-list'); if (l && el !== l && (el.offsetTop < l.scrollTop || el.offsetTop + el.offsetHeight > l.scrollTop + l.clientHeight)) { l.scrollTop += (el.offsetTop - l.scrollTop) - (l.clientHeight - el.offsetHeight) / 2; } }", sel)
                page.wait_for_timeout(60)
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

            def hold(sel, ms=700):
                """A long press: the finger (or the button) down, still, then up."""
                c = centre(sel)
                if not c:
                    return False
                x, y = client(*c)
                if touch:
                    cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': x, 'y': y}]})
                    page.wait_for_timeout(ms)
                    tip = js("(() => { const t = document.querySelector('.tx-tip'); return t ? t.textContent : null; })()")
                    cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
                else:
                    page.mouse.move(x, y); page.mouse.down()
                    page.wait_for_timeout(ms)
                    tip = js("(() => { const t = document.querySelector('.tx-tip'); return t ? t.textContent : null; })()")
                    page.mouse.up()
                page.wait_for_timeout(200)
                return tip

            def drag(src, dst, n=12):
                a0, a1 = centre(src), centre(dst)
                if not a0 or not a1:
                    return False
                pts = [(a0[0], a0[1] + (a1[1] - a0[1]) * i / n) for i in range(n + 1)]
                cs = [client(*q) for q in pts]
                if touch:
                    cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': cs[0][0], 'y': cs[0][1]}]})
                    for c in cs[1:]:
                        cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': c[0], 'y': c[1]}]})
                        page.wait_for_timeout(16)
                    page.wait_for_timeout(120)  # the finger stops before it lifts, or Chrome flings (docs: formation.md)
                    cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': cs[-1][0], 'y': cs[-1][1]}]})
                    page.wait_for_timeout(100); shot('drag')
                    cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
                else:
                    page.mouse.move(*cs[0]); page.mouse.down()
                    for c in cs[1:]:
                        page.mouse.move(*c); page.wait_for_timeout(16)
                    page.wait_for_timeout(100); shot('drag')
                    page.mouse.up()
                page.wait_for_timeout(350)
                return True

            on = lambda: js("App.current") == 'tactics'
            rules = lambda o: js(f"Tactics.owner('{o}').rules")
            row = lambda i, part: f'.tx-main .tx-rule[data-i="{i}"] .tx-{part}'
            plate = lambda: js("document.querySelector('.tx-main .kp-plate h3').textContent")
            opt = lambda attr, v: f'.tx-opts .tx-opt[data-{attr}="{v}"]'
            brand, party = ids['brand'], 'party'

            # in: the hero card's Edit tactics
            js(f"HeroSheet.open('{brand}'); 'ok'")
            page.wait_for_timeout(700)
            tap('.hr-edit', wait=700)
            check(on() and plate() == 'Brand', f'{tag}: Edit tactics opens Tactics on Brand ({js("App.current")}, {plate() if on() else ""})')
            if not on():
                ctx.close(); continue
            fit = js("""(() => { const W = Frame.W, bad = [];
              for (const el of document.querySelectorAll('.tx-view .tx-back, .tx-view .tx-title, .tx-view .tx-setchip, .tx-owners, .kp.tx-main, .kp.tx-pick, .tx-ow, .tx-main .tx-rule')) {
                const b = Frame.box(el); if (b.left < -1 || b.top < -1 || b.right > W + 1 || b.bottom > 391) bad.push(el.className); }
              const m = Frame.box(document.querySelector('.kp.tx-main')), k = Frame.box(document.querySelector('.kp.tx-pick'));
              if (m.right > k.left - 4) bad.push('panels overlap');
              return bad; })()""")
            check(not fit, f'{tag}: the owners, the panel and the picker sit inside the frame ({fit})')
            tuts = ['tactics-owners', 'tactics-row-1', 'tactics-when', 'tactics-do', 'tactics-lamp', 'tactics-picker']
            missing = [t for t in tuts if not js(f"!!document.querySelector('[data-tut=\"{t}\"]')")]
            check(not missing, f'{tag}: the guide\'s anchors are there ({missing or "all six"})')
            words = js("document.querySelector('.tx-view').innerText")
            check('rule' not in words.lower() and 'Tactics' in words, f'{tag}: the screen says Tactics, never rules')
            n_own = js("document.querySelectorAll('.tx-ow').length")
            check(n_own == 6 and js("[...document.querySelectorAll('.tx-ow')].map(b => b.dataset.owner).slice(-2).join()") == 'party,loadout', f'{tag}: four heroes, then the Party and the Loadout ({n_own} owners)')
            shot('hero')

            # a condition, and its number
            tap(row(0, 'when'))
            tap(opt('cond', 'self_mp_lt'))
            r0 = rules(brand)[0]
            check(r0['if'] == 'self_mp_lt' and r0['n'] == 50, f'{tag}: picking a condition changes tactic 1 ({r0})')
            check(js("!!document.querySelector('.tx-stepbar')"), f'{tag}: a numeric condition shows its stepper')
            tap('.tx-stepin button:last-child')
            r0 = rules(brand)[0]
            label = js(f"document.querySelector('{row(0, 'when')}').textContent")
            check(r0['n'] > 50 and f"{r0['n']}%" in label, f'{tag}: › steps the number up ({r0.get("n")}, {label})')
            tap('.tx-stepin button:first-child')
            check(rules(brand)[0]['n'] == 50, f'{tag}: ‹ steps it back down')
            tip = hold(row(0, 'when'))
            check(bool(tip) and 'mana' in tip.lower(), f'{tag}: a long press on a condition shows its glossary line ({tip})')
            shot('when')

            # the lantern
            tap(f'.tx-main .tx-rule[data-i="0"] .tx-lamp')
            check(rules(brand)[0]['on'] is False and js("document.querySelector('.tx-main .tx-rule[data-i=\"0\"]').classList.contains('off')"), f'{tag}: the lantern switches tactic 1 off')
            tap(f'.tx-main .tx-rule[data-i="0"] .tx-lamp')
            check(rules(brand)[0]['on'] is True, f'{tag}: and on again')

            # an action not equipped: the red !, the dot, and why on a long press
            tap(row(1, 'do'))
            check(js("TacticsEditor.pane") == 'do' and js("!!document.querySelector('.tx-opts .tx-opt[data-act]')"), f'{tag}: tapping a "do" opens the Do tab')
            tap(opt('act', 'bash'))
            r1 = rules(brand)[1]
            warn = js(f"!!document.querySelector('{row(1, 'do')}.warn .tx-bad')")
            dot = js(f"!!document.querySelector('.tx-ow[data-owner=\"{brand}\"] .tx-dot')")
            check(r1['do'] == 'bash' and warn and dot, f'{tag}: a skill not equipped shows a red ! and a dot on the owner ({r1["do"]}, ! {warn}, dot {dot})')
            tip = hold(row(1, 'do'))
            check(bool(tip) and 'equipped' in tip, f'{tag}: a long press on it says why ({tip})')
            shot('do')
            tap(opt('act', 'guard'))
            check(rules(brand)[1]['do'] == 'guard' and not js(f"!!document.querySelector('.tx-ow[data-owner=\"{brand}\"] .tx-dot')"), f'{tag}: an equipped skill clears the ! and the dot')

            # + add, then drag the new tactic to the top
            tap('.tx-main .tx-open .tx-add')
            tap(opt('cond', 'foe_lowest'))
            check(js("TacticsEditor.pane") == 'do', f'{tag}: a new tactic\'s condition moves the picker to Do')
            tap(opt('act', 'mace'))
            rs = rules(brand)
            check(len(rs) == 3 and rs[2]['if'] == 'foe_lowest' and rs[2]['do'] == 'mace', f'{tag}: + add makes tactic 3 ({len(rs)} tactics)')
            before = [r['if'] for r in rules(brand)]
            drag('.tx-main .tx-rule[data-i="2"] .tx-grip', '.tx-main .tx-rule[data-i="0"]')
            after = [r['if'] for r in rules(brand)]
            check(after == [before[2], before[0], before[1]], f'{tag}: dragging tactic 3 to the top moves it there ({after})')
            shot('dragged')
            tap('.tx-rm')
            check(len(rules(brand)) == 2, f'{tag}: ✕ Tactic removes the chosen one ({len(rules(brand))} left)')

            # the owners: Party, Loadout
            tap('.tx-ow[data-owner="party"]')
            names = js("[...document.querySelectorAll('.tx-main .tx-rule .tx-do span')].map(s => s.textContent)")
            check(plate() == 'Party' and 'Return to the Hearth' in names, f'{tag}: the Party shows its tactics ({names})')
            tap(row(1, 'do'))
            acts = js("[...document.querySelectorAll('.tx-opts .tx-opt')].map(b => b.dataset.act)")
            check(acts == ['draught', 'salts', 'lampoil', 'tincture', 'focus', 'home'], f'{tag}: the party\'s Do tab: its items, Focus fire and Return to the Hearth ({acts})')
            shot('party')
            tap('.tx-ow[data-owner="loadout"]')
            check(plate() == 'Loadout' and js("!!document.querySelector('.tx-opts .tx-opt[data-item]')"), f'{tag}: the Loadout shows its slots and items')
            tap('.tx-main .tx-rule[data-i="1"] .tx-item')
            tap(opt('item', 'lampoil'))
            items = js("Tactics.loadout().items")
            check(items[1] == 'lampoil', f'{tag}: the Loadout\'s picker puts Lamp Oil in slot 2 ({items})')
            shot('loadout')

            # sets
            tap(f'.tx-ow[data-owner="{brand}"]')
            tap('.tx-setchip')
            check(js("!!document.querySelector('.tx-menu')"), f'{tag}: the set chip opens its menu')
            tap('.tx-name')
            page.keyboard.type('Gravefields')
            tap('.tx-save .kp-btn')
            chip = js("document.querySelector('.tx-setchip b').textContent")
            check(chip == 'Gravefields' and js("Tactics.sets().length") == 1, f'{tag}: Save keeps the set, and the chip names it ({chip})')
            tap(f'.tx-main .tx-rule[data-i="0"] .tx-lamp')
            check(js("document.querySelector('.tx-setchip b').textContent") == '—', f'{tag}: a change leaves the set')
            tap('.tx-setchip')
            shot('sets')
            tap('.tx-setnm')
            check(rules(brand)[0]['on'] is True and js("document.querySelector('.tx-setchip b').textContent") == 'Gravefields', f'{tag}: Load brings it back')
            tap('.tx-setchip')
            tap('.tx-setx')
            check(js("Tactics.sets().length") == 1, f'{tag}: the first tap on ✕ only arms Delete')
            tap('.tx-setx')
            check(js("Tactics.sets().length") == 0, f'{tag}: the second deletes the set')
            tap('.tx-scrim')

            # Back
            tap('.tx-back', wait=600)
            check(js("App.current") == 'hero' and js("HeroSheet.id") == brand and js("HeroSheet.mode") == 'card' and js("!!document.querySelector('[data-tut=hero-rules]')"), f'{tag}: Back returns to the hero card, with its Tactics ({js("App.current")})')
            ctx.close()
        b.close()
    srv.shutdown()
    if errors:
        print('console errors:'); [print('  ' + e) for e in errors]
    print(f'{"FAILED: " + str(len(fails)) if fails or errors else "all passed"}')
    sys.exit(1 if fails or errors else 0)


if __name__ == '__main__':
    main()
