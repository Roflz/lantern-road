"""Checks Formation (js/formation.js, screen 5) in headless Chromium through real input, and takes its screenshots.

From a fresh save set up in the page, it taps the camp's formation grid where it is drawn and checks the panel opens
inside the frame, then drags with the mouse, or with a finger (CDP touch events, through the quarter-turn when the
frame is turned):
  - a portrait from the roster onto an open place joins the party there
  - a hero onto another place swaps them
  - a hero onto the roster rests them, but the last hero stays
  - Auto fills the open places with rested heroes, front-row classes in front, leaving the Spent hero out
  - a melee hero moved to the back shows Defends only
  - the Oathbound Gorget keeps its wearer in front
  - a drag along a long roster scrolls it and lifts nobody
  - a tap on a portrait opens the hero screen; Done and the ✕ close the panel, and the camp's grid shows the change
  - the guide's data-tut anchors (formation-front, -back, -open, -roster) are there, inside the panel
  python tools/formation_check.py [--sizes 844x390,667x375t,1280x720,390x844t] [--shots docs/screens/formation]
A size ending in t has a touch screen (and 390x844t is turned).
"""
import argparse, functools, http.server, json, os, socketserver, sys, threading
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SIZES = '844x390,667x375t,1280x720,390x844t'

# A save mid Region I (the mockup's F1): six heroes, four set out, the Lamplighter Spent, 1-9 the frontier.
# 'first' is the first visit (F3): a Sellsword and a Pilgrim who has just joined. 'many' adds a long roster.
SETUP = """
(scene) => {
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
  const ids = {};
  if (scene === 'first') {
    ids.fulke = P('sellsword', 'Fulke', 2, 30).id; ids.agnes = P('pilgrim', 'Agnes', 1, 0).id;
    s.party = [ids.fulke, null, null, null, null, null];
    Proto.lightNext(s); Proto.lightNext(s);
  } else {
    for (const [k, cls, lv, f] of [['fulke', 'sellsword', 6, 41], ['brand', 'warden', 5, 22], ['isolde', 'crossbowman', 4, 18], ['agnes', 'pilgrim', 6, 56], ['morrow', 'hexblade', 3, 0], ['tobin', 'lamplighter', 2, 100]])
      ids[k] = P(cls, k[0].toUpperCase() + k.slice(1), lv, f).id;
    if (scene === 'many') for (let k = 0; k < 10; k++) P(['warden', 'pilgrim', 'crossbowman', 'sellsword', 'hexblade'][k % 5], 'Extra ' + (k + 1), 1, 0);
    s.party = [ids.brand, ids.fulke, ids.isolde, ids.agnes, null, null];
    for (let k = 0; k < 8; k++) Proto.lightNext(s);
  }
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
            for scene in ('mid', 'first', 'many'):
                ctx = b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=1, is_mobile=touch, has_touch=touch)
                page = ctx.new_page()
                tag = f'{w}x{h}{" touch" if touch else ""} · {scene}'
                page.on('console', lambda m, t=tag: errors.append(f'{t}: {m.text}') if m.type == 'error' else None)
                page.on('pageerror', lambda e, t=tag: errors.append(f'{t}: {e}'))
                page.goto(f'http://127.0.0.1:{port}/index.html')
                js = page.evaluate
                page.wait_for_function("typeof Title !== 'undefined' && Title.ready", timeout=60000, polling=50)
                page.click('#title')
                page.wait_for_timeout(700)
                cdp = ctx.new_cdp_session(page)
                ids = js(SETUP, scene)
                page.wait_for_timeout(900)
                print(f'{tag}: frame {js("Frame.W")} wide{", turned" if js("Frame.turned") else ""}')

                def shot(name):
                    if a.shots:
                        js("document.querySelectorAll('#toasts .toast').forEach(t => t.remove())")  # Renown and the like, from the setup
                        page.screenshot(path=os.path.join(a.shots, f'{name}-{w}x{h}.png'))

                def centre(sel):
                    """Where an element is drawn, in design pixels: [x, y]."""
                    return js("(sel) => { const el = document.querySelector(sel); if (!el) return null; const b = Frame.box(el); return [b.left + b.width / 2, b.top + b.height / 2]; }", sel)

                def client(x, y):
                    r = js("([x, y]) => { const r = document.getElementById('stage').getBoundingClientRect(), k = Frame.k; return Frame.turned ? [r.left + (Frame.H - y) * k, r.top + x * k] : [r.left + x * k, r.top + y * k]; }", [x, y])
                    return r

                def tap(sel, wait=500):
                    c = centre(sel)
                    if not c:
                        return False
                    x, y = client(*c)
                    if touch:
                        page.touchscreen.tap(x, y)
                    else:
                        page.mouse.click(x, y)
                    page.wait_for_timeout(wait)
                    return True

                def drag(src, dst, n=12, hold=None, lift=(0, -14)):
                    """A finger (or the mouse) from one element to another, in design pixels. lift: the first step's
                    direction (up, so a drag from the roster lifts the hero rather than scrolling). hold: a screenshot
                    name to take before letting go."""
                    a0 = centre(src) if isinstance(src, str) else src
                    a1 = centre(dst) if isinstance(dst, str) else dst
                    if not a0 or not a1:
                        return False
                    pts = [(a0[0], a0[1]), (a0[0] + lift[0], a0[1] + lift[1])] + [(a0[0] + lift[0] + (a1[0] - a0[0] - lift[0]) * i / n, a0[1] + lift[1] + (a1[1] - a0[1] - lift[1]) * i / n) for i in range(1, n + 1)]
                    cs = [client(*q) for q in pts]
                    if touch:
                        cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': cs[0][0], 'y': cs[0][1]}]})
                        for c in cs[1:]:
                            cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': c[0], 'y': c[1]}]})
                            page.wait_for_timeout(16)
                        # the finger stops before it lifts, as a player's does: let go while moving and Chrome flings,
                        # and the next tap goes to stopping the fling instead of to a click
                        page.wait_for_timeout(120)
                        cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': cs[-1][0], 'y': cs[-1][1]}]})
                        if hold:
                            page.wait_for_timeout(150); shot(hold)
                        cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
                    else:
                        page.mouse.move(*cs[0]); page.mouse.down()
                        for c in cs[1:]:
                            page.mouse.move(*c); page.wait_for_timeout(16)
                        if hold:
                            page.wait_for_timeout(150); shot(hold)
                        page.mouse.up()
                    page.wait_for_timeout(350)
                    return True

                party = lambda: js('Save.state.party.slice()')
                shown = lambda: js("!!document.querySelector('#sheet.formation:not([hidden]) .kp.fm')")
                slot = lambda i: f'.fm-slot[data-slot="{i}"]'
                portrait = lambda k: f'.fm-port[data-id="{ids[k]}"] .fm-pf'

                # opening it: a tap on the camp's formation grid, where it is drawn
                check(tap('.cv-tile[data-slot="2"]') and shown(), f'{tag}: a tap on the camp\'s formation grid opens Formation')
                fb = js("(() => { const b = Frame.box(document.querySelector('.kp.fm')); return [b.left, b.top, b.right, b.bottom, Frame.W]; })()")
                check(fb[0] >= -1 and fb[1] >= -1 and fb[2] <= fb[4] + 1 and fb[3] <= 391, f'{tag}: the panel sits inside the frame ({[round(v) for v in fb]})')
                over = js("(() => { const out = []; const P = Frame.box(document.querySelector('.kp.fm')); for (const el of document.querySelectorAll('.kp.fm .fm-slot, .kp.fm .fm-port, .kp.fm .kp-btn, .fm-side')) { const b = Frame.box(el); if (el.closest('.fm-strip') && el.classList.contains('fm-port')) continue; if (b.left < P.left - 1 || b.right > P.right + 1 || b.top < P.top - 1 || b.bottom > P.bottom + 1) out.push(el.className); } return out; })()")
                check(not over, f'{tag}: nothing spills out of the panel {over}')
                tuts = js("['formation-front', 'formation-back', 'formation-open', 'formation-roster'].map(k => { const el = document.querySelector(`.kp.fm [data-tut=\"${k}\"]`); if (!el) return k + ' missing'; const b = Frame.box(el); return b.width > 10 && b.height > 10 ? null : k + ' empty'; }).filter(Boolean)")
                check(not tuts, f'{tag}: the guide\'s anchors are there {tuts}')

                if scene == 'mid':
                    n = js("document.querySelector('.kp.fm .kp-ct').textContent")
                    st = js("(() => { const s = Save.state, t = s.roster.find(c => c.spent); return [document.querySelectorAll('.fm-port.in').length, !!document.querySelector(`.fm-port.spent[data-id=\"${t.id}\"] .fm-tag`), document.querySelector('.fm-stage').textContent, document.querySelectorAll('.fm-foes img').length]; })()")
                    check(n == '4 / 6' and st[0] == 4 and st[1] and st[2] == '1-9' and st[3] > 0, f'{tag}: 4 / 6, four marked in the party, the Spent hero tagged, 1-9\'s foes ({n}, {st})')
                    shot('formation')
                    drag(portrait('morrow'), slot(4), hold='drag')
                    check(party()[4] == ids['morrow'], f'{tag}: a portrait dropped on an open place joins the party there')
                    drag(slot(2), slot(3), lift=(0, 0))
                    check(party()[2] == ids['agnes'] and party()[3] == ids['isolde'], f'{tag}: a hero dragged onto another swaps them')
                    drag(slot(4), '.fm-strip', lift=(0, 0))
                    check(ids['morrow'] not in party(), f'{tag}: a hero dragged to the roster rests')
                    tap('.fm-auto', wait=400)
                    pp = party()
                    check(pp.count(None) == 1 and ids['morrow'] in pp and ids['tobin'] not in pp, f'{tag}: Auto fills the open places, leaving the Spent hero out ({pp})')
                    drag(slot(1), slot(5), lift=(0, 0))
                    warn = js("(() => { const w = document.querySelector('.fm-slot[data-slot=\"5\"] .fm-warn'); return w && w.textContent; })()")
                    check(party()[5] == ids['fulke'] and warn and 'Defends only' in warn, f'{tag}: a melee hero moved to the back shows Defends only ({warn})')
                    # the Spent hero is greyed but placeable (the user's decision on 1.31)
                    drag(portrait('tobin'), slot(1))
                    check(party()[1] == ids['tobin'] and js("!!document.querySelector('.fm-slot[data-slot=\"1\"] .fm-sp.spent')"), f'{tag}: a Spent hero can be placed, and stands greyed')
                    shot('warnings')
                    # the Oathbound Gorget keeps its wearer in front
                    js(f"(() => {{ const c = Save.char('{ids['brand']}'); c.gear[GEAR.oathboundgorget.slot] = Items.make('oathboundgorget'); Save.commit(); 'ok'; }})()")
                    before = party()
                    drag(slot(0), slot(2), lift=(0, 0))
                    check(party() == before and js("[...document.querySelectorAll('#toasts .toast')].some(t => /Oathbound Gorget/.test(t.textContent))"), f'{tag}: the Oathbound Gorget keeps its wearer in front')
                    # Done closes it, and the camp's grid shows the change
                    tap('.fm-done')
                    grid = js(f"document.querySelector('.cv-tile[data-slot=\"5\"] img') !== null && !document.querySelector('#sheet.formation:not([hidden])')")
                    check(not shown() and grid and js('App.current') == 'home', f'{tag}: Done closes it, back on the Hearth with the grid updated ({shown()}, {grid}, {js("App.current")})')
                    tap('.cv-tile[data-slot="0"]')
                    tap('.kp.fm .kp-x')
                    check(not shown(), f'{tag}: the ✕ closes it')
                    tap('.cv-tile[data-slot="0"]')
                    tap(portrait('isolde'), wait=700)
                    check(js('App.current') == 'hero' and not shown(), f'{tag}: a tap on a portrait opens the hero screen ({js("App.current")})')
                elif scene == 'first':
                    shot('first')
                    drag(slot(0), '.fm-strip', lift=(0, 0))
                    check(party()[0] == ids['fulke'] and js("[...document.querySelectorAll('#toasts .toast')].some(t => /One hero has to set out/.test(t.textContent))"), f'{tag}: the last hero can\'t be rested')
                    drag(portrait('agnes'), '[data-tut="formation-open"]')
                    check(party()[1] == ids['agnes'], f'{tag}: the new hero dropped on the first open place joins ({party()})')
                    tap('.cv-tile[data-slot="0"]') if not shown() else None
                    tap(slot(1), wait=700)
                    check(js('App.current') == 'hero', f'{tag}: a tap on a hero in the line opens the hero screen')
                else:
                    s0 = js("document.querySelector('.fm-strip').scrollLeft")
                    a0 = centre('.fm-strip .fm-port:nth-of-type(6) .fm-pf')
                    before = party()
                    drag(a0, [a0[0] - 220, a0[1]], lift=(-14, 0))
                    s1 = js("document.querySelector('.fm-strip').scrollLeft")
                    check(s1 > s0 + 100 and party() == before and shown(), f'{tag}: a drag along the long roster scrolls it ({s0} -> {s1}) and lifts nobody')
                    shot('many')
                ctx.close()
        b.close()
    srv.shutdown()
    if errors:
        print('console errors:'); [print('  ' + e) for e in errors]
    print(f'{"FAILED: " + str(len(fails)) if fails or errors else "all passed"}')
    sys.exit(1 if fails or errors else 0)


if __name__ == '__main__':
    main()
