"""Walks Wick's first session (js/firstsession.js, onboarding spec §6.4) from a new game in headless Chromium, through
real input, the way a player taps it, and saves a screenshot of every step.

  python tools/guide_check.py                                   # 844x390 and a phone held upright (turned)
  python tools/guide_check.py --sizes 844x390 --shots docs/screens/guide

At each step it checks that Wick's step is up with its line, that a press away from the lit thing is held back (the
screen and the step don't change), then does what the step asks: a tap anywhere for a line, a tap on the lit thing,
the name box, the first pick and the free recruit (a card, Hire, the reveal), and the drag in Formation. The battles
play at the speed Wick sets (2× after his second pause). At the end the session is done, the save holds two heroes
in the formation, 1-1 and 1-2 are lit, and Settings → Replay the guide shows his first line again without holding
anything back. Console errors fail the run.
"""
import argparse, functools, http.server, os, socketserver, sys, threading, time
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SIZES = '844x390,390x844t'

# The steps in order, with what each one says (the first words), and how to answer it.
#   any: a tap anywhere   target: a tap on the lit thing   name, pick, hire, place: special
STEPS = [
    ('hello', 'Ah, a traveller', 'any'), ('dark', 'The road', 'any'), ('name', 'What do they call you', 'name'),
    ('show', 'Roflz. A good name', 'any'), ('board', 'The Recruit Board', 'target'), ('pick', None, 'pick'),
    ('setout', 'A bearer needs a road', 'target'), ('lantern', 'Each lantern is a stage', 'any'), ('go', 'Light the first', 'target'),
    ('order', 'Battles fight themselves', 'any'), ('speed', 'Speed it up', 'target'),
    ('xp', 'Your first level', 'any'), ('fatigue', 'Every turn tires', 'any'), ('home', 'Back to the Hearth', 'target'),
    ('heroes', 'Your hero fights by tactics', 'target'), ('hero', None, 'target'), ('tab', None, 'target'),
    ('rules', 'Tactics run from the top', 'any'), ('heroback', None, 'target'), ('tabhome', None, 'target'),
    ('setout2', 'On to 1-2', 'target'), ('go2', None, 'target'), ('why', 'The turn order names the tactic', 'soft'),
    ('new', 'The Recruit Board is open', 'any'), ('home2', None, 'target'),
    ('board2', 'The board has a free recruit', 'target'), ('hire', None, 'hire'),
    ('form', 'Two of you now', 'target'), ('place', 'Sturdy heroes in front', 'place'), ('done', 'Well placed', 'target'),
    ('bye', 'That’s the road', 'any'),
]

HELPERS = """
window.__toClient = (x, y) => {
  const r = document.getElementById('stage').getBoundingClientRect(), k = Frame.k;
  return Frame.turned ? [r.left + (Frame.H - y) * k, r.top + x * k] : [r.left + x * k, r.top + y * k];
};
window.__mid = el => { if (typeof el === 'string') el = document.querySelector(el); if (!el) return null; const r = el.getBoundingClientRect(); return r.width ? [r.left + r.width / 2, r.top + r.height / 2] : null; };
window.__wk = () => {
  const g = Wick.step, soft = document.querySelector('#wk .wk-step.soft:not(.out)');
  const el = g && !g.closed ? g.root : soft;
  if (!el || !el.classList.contains('in')) return null;
  const t = el.querySelector('.wk-bubble span, .wk-panel p');
  return { step: FirstSession.step, soft: !!(soft && el === soft), tap: g && !g.closed ? g.tap : 'free', text: t ? t.textContent : '', hole: __mid(el.querySelector('.wk-hole')) };
};
window.__state = () => ({ screen: App.current, road: !!(Camp.scene && Camp.scene.onRoad), sheet: document.getElementById('sheet').hidden ? '' : document.getElementById('sheet').className, step: FirstSession.step });
'ok'
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
            page.on('console', lambda m, tag=size: errors.append(f'{tag}: {m.text}') if m.type == 'error' else None)
            page.on('pageerror', lambda e, tag=size: errors.append(f'{tag}: {e}'))
            page.goto(f'http://127.0.0.1:{port}/index.html')
            js = page.evaluate
            page.wait_for_function("typeof Title !== 'undefined' && Title.ready", timeout=60000, polling=50)
            page.click('#title')
            page.wait_for_timeout(600)
            js(HELPERS)
            cdp = ctx.new_cdp_session(page)
            print(f'{w}x{h}{" touch" if touch else ""}: frame {js("Frame.W")} wide{", turned" if js("Frame.turned") else ""}')
            n = [0]

            def shot(name):
                if a.shots:
                    n[0] += 1
                    page.screenshot(path=os.path.join(a.shots, f'{n[0]:02d}-{name}-{w}x{h}.png'))

            def press(c, wait=350):
                if not c:
                    return False
                if touch:
                    page.touchscreen.tap(*c)
                else:
                    page.mouse.click(*c)
                page.wait_for_timeout(wait)
                return True

            def at(x, y):
                return js(f'__toClient({x}, {y})')

            def wait_step(sid, timeout=40):
                t0 = time.time()
                while time.time() - t0 < timeout:
                    s = js('__wk()')
                    if s and (s['step'] == sid or (sid == 'why' and s['soft'])):
                        page.wait_for_timeout(450)  # it has risen, and settled on its target
                        return js('__wk()')
                    page.wait_for_timeout(100)
                return None

            def drag(d0, d1, steps=14):
                """A finger (or the mouse) from one point to another, in design pixels: up first, so a drag from the
                roster lifts the hero rather than scrolling the strip (in a turned frame too)."""
                pts = [(d0[0], d0[1]), (d0[0], d0[1] - 14)] + [(d0[0] + (d1[0] - d0[0]) * i / steps, d0[1] - 14 + (d1[1] - d0[1] + 14) * i / steps) for i in range(1, steps + 1)]
                pts = [at(*q) for q in pts]
                if touch:
                    cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': pts[0][0], 'y': pts[0][1]}]})
                    for q in pts[1:]:
                        cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': q[0], 'y': q[1]}]})
                        page.wait_for_timeout(16)
                    page.wait_for_timeout(120)
                    cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
                else:
                    page.mouse.move(*pts[0]); page.mouse.down()
                    for q in pts[1:]:
                        page.mouse.move(*q); page.wait_for_timeout(16)
                    page.mouse.up()
                page.wait_for_timeout(400)

            # a neutral point for "tap anywhere", clear of anything lit: the stage's top middle
            W = js('Frame.W')
            anywhere = lambda: at(W / 2, 70)
            for sid, line, how in STEPS:
                s = wait_step(sid)
                if not check(bool(s), f'step {sid} is up'):
                    print('    state:', js('__state()'))
                    break
                if line:
                    check(s['text'].startswith(line), f'  Wick says “{line}…”' + ('' if s['text'].startswith(line) else f' (got “{s["text"]}”)'))
                shot(sid)
                # a press away from what's lit is held back
                if how in ('target', 'pick', 'hire', 'place', 'name'):
                    before = js('__state()')
                    cands = [at(24, 200), at(W - 24, 200), at(W / 2, 24)]
                    hx = s['hole'] or at(W / 2, 200)
                    far = max(cands, key=lambda c: abs(c[0] - hx[0]) + abs(c[1] - hx[1]))
                    press(far, 250)
                    after = js('__state()')
                    check(after == before, '  a press elsewhere is held back')
                if how == 'any':
                    press(anywhere())
                elif how == 'soft':
                    page.wait_for_timeout(300)
                elif how == 'target':
                    press(s['hole'])
                elif how == 'name':
                    page.wait_for_timeout(300)
                    press(js("__mid('.wk-name input')"), 200)
                    page.keyboard.type('Roflz')
                    press(js("__mid('[data-tut=name-ok]')"))
                    check(js('Save.state.name') == 'Roflz', '  the name is kept')
                    check(js("document.querySelector('.camp .cv-nm').textContent") == 'Roflz', '  and shows by the Renown')
                elif how in ('pick', 'hire'):
                    cards = js("[...document.querySelectorAll('#sheet .fp [data-tut=pick-card]')].map(c => c.dataset.cls)")
                    check(len(cards) == 3, f'  the board shows three: {", ".join(cards)}')
                    want = 'sellsword' if how == 'pick' else ('pilgrim' if 'pilgrim' in cards else cards[0])
                    k = cards.index(want) if want in cards else 0
                    press(js(f"__mid(document.querySelectorAll('#sheet .fp [data-tut=pick-card]')[{k}])"))
                    bub = js("document.querySelector('#sheet .fp .wick-bubble').textContent")
                    check(bool(bub) and not bub.startswith('Three'), f'  Wick says a line on the {want}: “{bub}”')
                    shot(how + '-card')
                    press(js("__mid('[data-tut=pick-hire]')"), 700)
                    check(js("!!document.querySelector('[data-tut=pick-reveal]')"), '  Hire: the reveal')
                    shot(how + '-reveal')
                    press(at(W / 2, 200), 700)
                    check(js('Save.state.roster.length') == (1 if how == 'pick' else 2), f'  the roster has {1 if how == "pick" else 2}')
                    if how == 'hire':
                        check(js('Save.state.party.filter(Boolean).length') == 1, '  the new hero waits at the fire, for Formation')
                elif how == 'place':
                    fresh = js("Save.state.roster.find(c => !Save.state.party.includes(c.id)).id")
                    check(js("document.querySelectorAll('#wk .wk-call').length") == 2 and js("!!document.querySelector('#wk .wk-hand')"), '  two callouts, and the hand showing the drag')
                    to = js("(() => { const h = document.querySelector('#wk .wk-hand'); return h ? [parseFloat(h.style.left) + 6 + parseFloat(h.style.getPropertyValue('--dx')), parseFloat(h.style.top) + 4 + parseFloat(h.style.getPropertyValue('--dy'))] : null; })()")
                    d0 = js(f"(() => {{ const b = Frame.box(document.querySelector('.fm-port[data-id=\"{fresh}\"] .fm-pf'), document.getElementById('stage')); return [b.left + b.width / 2, b.top + b.height / 2]; }})()")
                    drag(d0, to)
                    check(fresh in js('Save.state.party'), '  dragged into the formation')
            check(js('Save.state.guide.done') is True, 'the session is done')
            check(js("Save.state.campaign.cleared.slice(0, 2).join()") == '1-1,1-2', '1-1 and 1-2 are lit')
            check(js('Save.state.party.filter(Boolean).length') == 2, 'two heroes in the formation')
            page.wait_for_timeout(600)
            check(js('!Wick.held'), 'nothing is held back after it')
            check(bool(js("document.querySelector('.camp .cv-gt').textContent")), 'the goal tracker takes over: ' + js("document.querySelector('.camp .cv-gt').textContent"))
            shot('after')
            # Settings → Replay the guide: his first line again, held back from nothing
            js("FirstSession.replay()")
            t0 = time.time()
            while time.time() - t0 < 6 and not (js('__wk()') or {}).get('soft'):
                page.wait_for_timeout(100)
            page.wait_for_timeout(400)
            s = js('__wk()')
            ok = bool(s) and s['soft']
            check(ok and s['text'].startswith('Ah, a traveller'), 'Replay the guide: his first line again, as a soft step')
            if ok:
                shot('replay')
                press(at(W / 2, 70))
            ctx.close()
        b.close()
    srv.shutdown()
    for e in errors:
        print('  console:', e)
    print(f'{len(fails)} failed' + (f', {len(errors)} console errors' if errors else ''))
    sys.exit(1 if fails or errors else 0)


if __name__ == '__main__':
    main()
