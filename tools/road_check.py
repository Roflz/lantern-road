"""Checks the road view (docs/mockups/road-view.html; js/camp.js and js/campscene.js) in headless Chromium through real
input, at the frame's sizes, and saves its screenshots.

  python tools/road_check.py                                   # every size
  python tools/road_check.py --sizes 844x390 --shots docs/screens/road-view

On a save with 1-1 to 1-8 lit (the party at level 6, 1-9 the frontier) it checks that the Hearth's Set out flies up the
road to 1-9 with its card open (Set out); a drag along the road moves a stage for every 64 design pixels and settles
on one, and a flick carries further; the labels show the stage ids, the frontier's callout, the boss's name, the
bubbles over stages with something new and the gate; a far stage's card says Locked and a lit one's Farm; a tap on a
stage opens its card; the wheel steps a stage (with a mouse); a drag back past 1-1 flies home, and so does ‹; a tap on
the road in the party view flies to the frontier; the card opens the stage sheet; and the big button sets out.
Held past the boss, the drag shows the gate to the next region. --shots DIR saves R1–R4 as the mockup has them, and
the Hearth's view of the same road.
"""
import argparse, functools, http.server, json, os, socketserver, sys, threading
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SIZES = '844x390,667x375t,1280x720,900x800,390x844t'

HELPERS = """
window.__toClient = (x, y) => {
  const r = document.getElementById('stage').getBoundingClientRect(), k = Frame.k;
  return Frame.turned ? [r.left + (Frame.H - y) * k, r.top + x * k] : [r.left + x * k, r.top + y * k];
};
window.__road = () => { const L = Camp.scene, o = L && L.out; return o ? { on: L.onRoad, road: +o.road.toFixed(3), stage: +L.stage.toFixed(3), sel: L.sel, view: L.view } : null; };
window.__card = () => { const c = document.querySelector('.cv-card'), b = document.querySelector('.cv-roadgo'); return c ? { id: c.querySelector('.cv-id').textContent, name: c.querySelector('.cv-cn').textContent, chips: [...c.querySelectorAll('.cv-chip')].map(x => x.className.split(' ').pop() + ':' + x.textContent), foes: c.querySelectorAll('.cv-foes img').length, dark: c.querySelectorAll('.cv-foes .dark').length, first: c.querySelectorAll('.cv-loot .first').length, go: b ? b.textContent : null } : null; };
window.__labels = () => [...document.querySelectorAll('.cv-labels > *')].filter(n => +n.style.opacity > 0.5).map(n => n.className + ':' + n.textContent);
window.__stageAt = k => { const a = Camp.scene.out.anchors.find(q => q.stage === k); return a ? [a.x * 2, (a.y + a.top)] : null; };
'ok'
"""

# 1-1 to 1-8 lit, four heroes at level 6 (the mockup's R1).
SETUP = """
() => {
  const s = Save.state;
  const P = (cls, name, level) => {
    const c = s.roster.length ? Hero.create(cls, 'c' + s.nextId++, { name, level }) : Base.newGame(cls, s, { name });
    if (level > 1 && c.level < level) Hero.gainXp(c, Hero.xpBetween(c.level, level));
    Hero.autoBuild(c);
    if (!s.roster.includes(c)) { s.roster.push(c); Base.place(c, s); }
    Tactics.owner(c.id);
    return c;
  };
  closeScreen();
  if (typeof FirstSession !== 'undefined') FirstSession.skip(); // Wick's first session (tools/guide_check.py walks it)
  s.settings.tips = false;
  P('sellsword', 'Fulke', 6); P('pilgrim', 'Agnes', 6); P('warden', 'Osric', 6); P('crossbowman', 'Mira', 6);
  for (let k = 0; k < 8; k++) Proto.lightNext(s);
  Base.tick(s); Save.commit();
  App.go('home', {}, { instant: true });
  return 'ok';
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
            page.on('console', lambda m, tag=size: errors.append(f'{tag}: {m.text}') if m.type == 'error' else None)
            page.on('pageerror', lambda e, tag=size: errors.append(f'{tag}: {e}'))
            page.goto(f'http://127.0.0.1:{port}/index.html')
            js = page.evaluate
            page.wait_for_function("typeof Title !== 'undefined' && Title.ready", timeout=60000, polling=50)
            page.click('#title')
            page.wait_for_timeout(700)
            js(HELPERS)
            cdp = ctx.new_cdp_session(page)
            print(f'{w}x{h}{" touch" if touch else ""}: frame {js("Frame.W")} wide{", turned" if js("Frame.turned") else ""}')

            def shot(name):
                if a.shots:
                    page.screenshot(path=os.path.join(a.shots, f'{name}-{w}x{h}.png'))

            def client(x, y):
                return js(f'__toClient({x}, {y})')

            def tap_at(x, y, wait=600):
                c = client(x, y)
                if touch:
                    page.touchscreen.tap(*c)
                else:
                    page.mouse.click(*c)
                page.wait_for_timeout(wait)

            def tap(sel, wait=600):
                r = js("sel => { const el = document.querySelector(sel); if (!el) return null; const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }", sel)
                if not r:
                    return False
                if touch:
                    page.touchscreen.tap(*r)
                else:
                    page.mouse.click(*r)
                page.wait_for_timeout(wait)
                return True

            def drag(x0, y0, x1, y1, n=16, still=True, wait=900, hold=None):
                """A finger (or the mouse) in design pixels; still: it stops before letting go, so there's no flick.
                hold: called while the finger is still down, before it lets go."""
                c0, c1 = client(x0, y0), client(x1, y1)
                at = lambda i: (c0[0] + (c1[0] - c0[0]) * i / n, c0[1] + (c1[1] - c0[1]) * i / n)
                if touch:
                    cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': c0[0], 'y': c0[1]}]})
                else:
                    page.mouse.move(*c0)
                    page.mouse.down()
                for i in range(1, n + 2 if still else n + 1):
                    if i > n:
                        page.wait_for_timeout(150)
                    x, y = at(min(i, n))
                    if touch:
                        cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': x, 'y': y}]})
                    else:
                        page.mouse.move(x, y)
                    page.wait_for_timeout(8 if not still else 16)
                if hold:
                    page.wait_for_timeout(500)
                    hold()
                if touch:
                    cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
                else:
                    page.mouse.up()
                page.wait_for_timeout(wait)

            road = lambda: js('__road()')
            card = lambda: js('__card()')
            W = js('Frame.W')
            mid = W / 2

            js(SETUP)
            page.wait_for_timeout(1400)
            shot('00-hearth')

            # Set out from the Hearth: up the road to the frontier, its card open
            tap('.camp .cv-dock .cv-big:not([hidden])', 2200)
            r, c = road(), card()
            check(r and r['on'] and r['road'] == 1 and r['sel'] == 8 and abs(r['stage'] - 8) < 0.01, f'the Hearth\'s Set out flies up the road to 1-9 ({r})')
            check(c and c['id'] == '1-9' and c['go'] == 'Set out' and c['chips'] == ['ok:Lv 5', 'ok:4'] and c['foes'] >= 2 and c['dark'] == 0, f'its card: 1-9, Lv and party met, its foes, Set out ({c})')
            L = js('__labels()')
            check(any(x.startswith('cv-call') and '1-9' in x for x in L), f'the frontier\'s callout shows ({[x for x in L if "call" in x]})')
            check(any(x.startswith('cv-sid') and '1-10' in x for x in L) and any('cv-unl' in x for x in L), f'stage ids and an unlock bubble show ({len(L)} labels)')
            check(js("getComputedStyle(document.querySelector('.cv-dock')).visibility") == 'hidden' and js("getComputedStyle(document.querySelector('.cv-roadhud')).visibility") == 'visible', 'the camp\'s buttons are gone and the road\'s are up')
            gap = js("(() => { const a = Frame.box(document.querySelector('.cv-region')), b = Frame.box(document.querySelector('.cv-purse')), c = Frame.box(document.querySelector('.cv-card')), d = Frame.box(document.querySelector('.cv-roadgo')); return [Math.round(b.left - a.right), Math.round(d.left - c.right)]; })()")
            check(gap[0] >= 8 and gap[1] >= 8, f'the region clears the purse, and the card its button ({gap} apart)')
            shot('r1-frontier')

            # a drag along the road: 64 design pixels a stage, settling on one
            drag(mid, 200, mid, 264)
            r = road()
            check(r['sel'] == 9 and abs(r['stage'] - 9) < 0.01, f'a drag of 64 down the road moves one stage on, to 1-10 ({r})')
            drag(mid, 80, mid, 272)
            r = road()
            check(r['sel'] == 12 and abs(r['stage'] - 12) < 0.01, f'and 192 moves three, to 1-13 ({r})')
            drag(mid, 150, mid, 174, n=3, still=False, wait=1200)
            r = road()
            check(r['sel'] is not None and r['sel'] >= 13, f'a flick of 24 is carried on to the next stage or further ({r})')
            c = card()
            check(c and c['go'] == 'Locked' and c['dark'] >= 1, f'a stage beyond the light: its foes as shadows, Locked ({c})')

            # the far end: the boss and the gate
            drag(mid, 80, mid, 272, wait=600)
            drag(mid, 80, mid, 272, wait=1400)
            r, L = road(), js('__labels()')
            check(r['sel'] == 17, f'the far end settles on the boss, 1-18 ({r})')
            check(any('cv-bossname' in x for x in L) or any(x.startswith('cv-call') for x in L), f'the boss\'s name shows by the chapel ({[x for x in L if "boss" in x]})')
            shot('r2-ahead')
            past = {}
            drag(mid, 120, mid, 240, wait=1200, hold=lambda: past.update(L=js('__labels()')))
            L = past.get('L', [])
            check(any('cv-gate' in x and 'Drowned Chapel' in x for x in L), f'held past the boss, the gate to Region II ({[x for x in L if "gate" in x]})')
            check(road()['sel'] == 17, f'and let go, it settles back on the boss ({road()})')

            # a tap on a lit stage opens its card: Farm
            js('Camp.scene.panTo(2)')
            page.wait_for_timeout(1200)
            pt = js('__stageAt(3)')
            if pt:
                tap_at(pt[0], pt[1], 1400)
            r, c = road(), card()
            check(r['sel'] == 3 and c and c['id'] == '1-4' and c['go'] == 'Farm', f'a tap on 1-4 opens its card: Farm ({r}, {c})')
            shot('r3-farm')

            if not touch:
                page.mouse.move(*client(mid, 200))
                page.mouse.wheel(0, -100)
                page.wait_for_timeout(900)
                r = road()
                check(r['sel'] == 4, f'the wheel steps one stage on ({r})')
                page.mouse.wheel(0, 100)
                page.wait_for_timeout(900)

            # the card opens the stage sheet; the stage sheet closes back onto the road
            tap('.cv-card', 700)
            check(js("!!document.querySelector('#sheet .stagebox')"), 'a tap on the card opens the stage in full')
            js('closeSheet()')
            page.wait_for_timeout(300)

            # pulled back past 1-1, home to the fire
            js('Camp.scene.panTo(0)')
            page.wait_for_timeout(1400)
            drag(mid, 270, mid, 130, wait=2400)
            r = road()
            check(r and not r['on'] and r['road'] == 0, f'a drag back past 1-1 flies home ({r})')
            check(js("getComputedStyle(document.querySelector('.cv-dock')).visibility") == 'visible', 'the camp\'s buttons are back')

            # a tap on the road in the party view flies to the frontier
            pt = js("""(() => { const L = Camp.scene, W = Frame.W; for (let y = 200; y > 110; y -= 3) for (let x = W / 2 - 60; x < W / 2 + 60; x += 3) { const h = Camp.at(x, y); if (h && h.id === 'road' && h.stage == null) return [x, y]; } return null; })()""")
            if check(bool(pt), f'the road shows in the party view ({pt})'):
                tap_at(pt[0], pt[1], 0)
                page.wait_for_timeout(230)
                shot('r4-flight')
                page.wait_for_timeout(1800)
                r = road()
                check(r['on'] and r['road'] == 1 and r['sel'] == 8, f'a tap on the road flies to the frontier ({r})')
            # ‹ flies home from anywhere
            js('Camp.scene.panTo(12)')
            page.wait_for_timeout(1000)
            tap('.cv-back', 2400)
            r = road()
            check(not r['on'] and r['road'] == 0, f'‹ flies home from 1-13 ({r})')

            # one region open: ‹ and › are shut; Set out on the road sets out
            js("Camp.scene.toRoad(8, true)")
            page.wait_for_timeout(600)
            check(js("[...document.querySelectorAll('.cv-arw')].every(b => b.classList.contains('shut'))"), 'with one region open, ‹ and › are shut')
            check(js("document.querySelector('.cv-rk').textContent") == 'Region I · 8 of 18 lit' and js("document.querySelector('.cv-rn').textContent") == 'Gravefields', 'the region: Region I · 8 of 18 lit, Gravefields')
            tap('.cv-roadgo', 1200)
            check(js("App.current") == 'battle', f'the card\'s Set out sets out ({js("App.current")})')
            ctx.close()
        b.close()
    srv.shutdown()
    for e in errors:
        print('  error', e)
    print(f'{len(fails)} failed' if fails else 'all passed')
    sys.exit(1 if fails or errors else 0)


if __name__ == '__main__':
    main()
