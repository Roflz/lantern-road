"""Checks the landscape frame (js/frame.js) in headless Chromium through real input: taps, drags and scrolling.

Run it turned (a touch phone held upright, the default), flat, and at desktop sizes:
  python tools/frame_check.py                          # 390×844, touch: the frame is drawn a quarter-turn
  python tools/frame_check.py --w 844 --h 390 --touch  # a phone on its side
  python tools/frame_check.py --w 1280 --h 720         # a desktop window with a mouse: letterboxed, never turned

It checks that a tap lands where it was aimed, in design pixels; the camp turns under a drag along the frame and not
across it; a roster row's swipe opens Dismiss; rules reorder by drag; the Party tab, Settings, the Road map and Tactics
scroll the way the finger goes (or the wheel, with a mouse); in a battle the art is drawn at 3×, the coach mark rings
the thing it points at, and a tap on the HUD answers; and, with touch, the frame keeps clear of emulated notches.
Fingers are CDP touch events, so the browser's own touch scrolling and pointer events run as on a phone. --shots DIR
saves a few screenshots.
"""
import argparse, functools, http.server, json, os, socketserver, sys, threading
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

# The test's own inverse of the frame's transform (design pixels to the window), so Frame.point is checked against it.
HELPERS = """
window.__toClient = (x, y) => {
  const r = document.getElementById('stage').getBoundingClientRect(), k = Frame.k;
  return Frame.turned ? [r.left + (Frame.H - y) * k, r.top + x * k] : [r.left + x * k, r.top + y * k];
};
window.__design = sel => { const el = document.querySelector(sel); if (!el) return null; const b = Frame.box(el); return [b.left + b.width / 2, b.top + b.height / 2, b.width, b.height]; };
window.__seen = [];
document.addEventListener('pointerdown', e => window.__seen.push(['down', Frame.point(e).x, Frame.point(e).y]), true);
'ok'
"""


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--page', default='index.html')
    ap.add_argument('--w', type=int, default=390)
    ap.add_argument('--h', type=int, default=844)
    ap.add_argument('--touch', action='store_true', help='a touch screen (on by default at the default size)')
    ap.add_argument('--shots', default='')
    a = ap.parse_args()
    if a.w == 390 and a.h == 844:
        a.touch = True
    srv = socketserver.TCPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=ROOT))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    port = srv.server_address[1]
    fails, errors = [], []

    def check(ok, what):
        print(('  ok   ' if ok else '  FAIL ') + what)
        if not ok:
            fails.append(what)

    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={'width': a.w, 'height': a.h}, device_scale_factor=1, is_mobile=a.touch, has_touch=a.touch)
        page = ctx.new_page()
        page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(f'http://127.0.0.1:{port}/{a.page}')
        page.wait_for_timeout(2600)
        js = page.evaluate
        js(HELPERS)
        cdp = ctx.new_cdp_session(page)
        info = js("({ W: Frame.W, k: +Frame.k.toFixed(3), turned: Frame.turned, stage: document.getElementById('stage').style.transform })")
        print(f'{a.w}x{a.h}{" touch" if a.touch else ""}:', json.dumps(info))

        def shot(name):
            if a.shots:
                page.screenshot(path=os.path.join(a.shots, f'{a.w}x{a.h}-{name}.png'))

        def to_client(x, y):
            return js(f'__toClient({x}, {y})')

        def drag(x0, y0, x1, y1, n=14, still=False):
            """A finger (or the mouse) from design point (x0, y0) to (x1, y1). still: it stops before letting go."""
            c0, c1 = to_client(x0, y0), to_client(x1, y1)
            at = lambda i: (c0[0] + (c1[0] - c0[0]) * i / n, c0[1] + (c1[1] - c0[1]) * i / n)
            if a.touch:
                cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': c0[0], 'y': c0[1]}]})
                for i in range(1, n + 2 if still else n + 1):
                    if i > n:
                        page.wait_for_timeout(150)
                    x, y = at(min(i, n))
                    cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': x, 'y': y}]})
                    page.wait_for_timeout(16)
                cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
            else:
                page.mouse.move(*c0)
                page.mouse.down()
                for i in range(1, n + 2 if still else n + 1):
                    if i > n:
                        page.wait_for_timeout(150)
                    page.mouse.move(*at(min(i, n)))
                    page.wait_for_timeout(16)
                page.mouse.up()
            page.wait_for_timeout(700)

        def tap_at(c):
            if a.touch:
                page.touchscreen.tap(*c)
            else:
                page.mouse.click(*c)
            page.wait_for_timeout(600)

        def tap_el(sel):
            """Taps the middle of an element where it is drawn on the screen."""
            r = js(f"(() => {{ const el = document.querySelector({json.dumps(sel)}); if (!el) return null; const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }})()")
            if r:
                tap_at(r)
            return bool(r)

        # 1. a pointer lands where it was aimed, in design pixels
        tap_at(to_client(200, 120))
        seen = js('__seen')
        check(bool(seen) and abs(seen[0][1] - 200) < 1.5 and abs(seen[0][2] - 120) < 1.5, f'a tap at design (200, 120) reads as {seen[:1]}')

        # 2. a new game; the camp card's Map button, tapped where it is drawn
        js("Base.newGame('sellsword', Save.state); Tactics.owner(Save.state.roster[0].id); Base.tick(Save.state); Save.commit(); closeScreen(); App.go('home', {}, {instant: true}); 'ok'")
        page.wait_for_timeout(1200)
        shot('camp')
        check(tap_el('.camp .bcard [data-role=btns] .btn') and js('App.current') == 'map', f'tapping the camp card\'s Map opens the Road (now {js("App.current")})')

        # 3. the camp turns under a drag along the frame, and not across it
        js("App.go('home', {}, {instant: true}); 'ok'")
        page.wait_for_timeout(1200)
        face = lambda: js("document.querySelector('.bcard [data-role=name]').textContent")
        name0 = face()
        cx, cy = js("__design('.camp canvas')")[:2]
        drag(cx - 40, cy - 30, cx - 40, cy + 30)
        page.wait_for_timeout(600)
        check(face() == name0, f'a drag across the frame leaves the camp facing {name0!r} (now {face()!r})')
        # one building's worth each way, stopping before letting go: left brings the plot round, right the Recruit Board
        # (as a mouse does on a desktop window, which is never turned)
        drag(cx + 30, cy - 30, cx - 30, cy - 30, still=True)
        page.wait_for_timeout(900)
        name2 = face()
        check(name2 == 'Empty Plot', f'a drag to the left turns the camp from {name0!r} to the plot ({name2!r})')
        drag(cx - 30, cy - 30, cx + 30, cy - 30, still=True)
        page.wait_for_timeout(900)
        drag(cx - 30, cy - 30, cx + 30, cy - 30, still=True)
        page.wait_for_timeout(900)
        name3 = face()
        check(name3 == 'Recruit Board', f'two drags to the right turn it on to the Recruit Board ({name3!r})')

        # 4. a roster row's swipe left opens Dismiss, and a swipe along the frame's height from a row still scrolls
        js("App.go('party', {}, {instant: true}); 'ok'")
        page.wait_for_timeout(800)
        js("document.querySelector('.rwrap .rrow').scrollIntoView({ block: 'center' }); 'ok'")
        page.wait_for_timeout(300)
        rx, ry = js("__design('.rwrap .rrow')")[:2]
        drag(rx + 50, ry, rx - 90, ry, n=10)
        tf = js("document.querySelector('.rwrap .rrow').style.transform")
        check(tf == 'translateX(-92px)', f'a swipe left on a roster row opens Dismiss ({tf!r})')
        shot('roster-swipe')
        js("App.go('party', {}, {instant: true}); 'ok'")
        page.wait_for_timeout(600)
        js("document.querySelector('.rwrap .rrow').scrollIntoView({ block: 'center' }); 'ok'")
        page.wait_for_timeout(300)
        rx, ry = js("__design('.rwrap .rrow')")[:2]
        view = "document.querySelector('#views .view:not(.out)')"
        v0 = js(f'{view}.scrollTop')
        if a.touch and v0 > 20:
            drag(rx - 100, ry - 20, rx - 100, ry + 60)
            v1 = js(f'{view}.scrollTop')
            check(v1 < v0 - 30, f'a swipe down the frame from a roster row scrolls the Party tab back ({v0:.0f} -> {v1:.0f})')
        js(f"{view}.scrollTop = 0; 'ok'")

        # 5. scrolling: a finger moving up the frame (or the wheel) scrolls the content down, and back
        def scroll_check(sel, what, dist=140):
            q = f'document.querySelector({json.dumps(sel)})'
            el = js(f'(() => {{ const el = {q}; return el ? [el.scrollTop, el.scrollHeight - el.clientHeight] : null; }})()')
            if not el:
                check(False, f'{what}: {sel} not found')
                return
            if el[1] < 40:
                print(f'  skip {what}: only {el[1]}px to scroll')
                return
            if el[0] > el[1] - dist:
                js(f'{q}.scrollTop = 0; 0')
                page.wait_for_timeout(200)
                el[0] = 0
            x, y = js(f'__design({json.dumps(sel)})')[:2]
            if a.touch:
                drag(x, y + dist / 2, x, y - dist / 2)
            else:
                page.mouse.move(*to_client(x, y))
                page.mouse.wheel(0, dist)
                page.wait_for_timeout(600)
            after = js(f'{q}.scrollTop')
            check(after - el[0] > dist * 0.5, f'{what} scrolls down {after - el[0]:.0f}px for a {dist}px ' + ('swipe up the frame' if a.touch else 'turn of the wheel'))
            if a.touch:
                drag(x, y - dist / 2, x, y + dist / 2)
            else:
                page.mouse.wheel(0, -dist)
                page.wait_for_timeout(600)
            back = js(f'{q}.scrollTop')
            check(back < after - dist * 0.4, f'{what} scrolls back ({after:.0f} -> {back:.0f})')

        js("Save.state.roster.length < 4 && Proto.fill(); Save.commit(); App.go('party', {}, {instant: true}); 'ok'")
        page.wait_for_timeout(800)
        scroll_check('#views .view:not(.out)', 'the Party tab')
        js("App.openSettings(); 'ok'")
        page.wait_for_timeout(700)
        scroll_check('#sheet .box', 'the Settings sheet', dist=120)
        js("closeSheet(); App.go('map', {}, {instant: true}); 'ok'")
        page.wait_for_timeout(900)
        scroll_check('.mapwrap', 'the Road map', dist=100)

        # 6. rules reorder by drag on Tactics
        js("Proto.lightNext(); Save.commit(); App.actions.tactics(Save.state.roster[0].id); 'ok'")
        page.wait_for_timeout(1000)
        rules = lambda: js("[...document.querySelectorAll('.tx-rule .tx-body')].map(r => r.textContent.replace(/\\s+/g, ' ').trim().slice(0, 48))")
        r0 = rules()
        js("document.querySelector('.tx-rule').scrollIntoView({ block: 'center' }); 'ok'")
        page.wait_for_timeout(300)
        g = js("__design('.tx-rule .tx-grip')")
        step = js("(() => { const l = [...document.querySelectorAll('.tx-rule')].map(el => Frame.box(el).top); return l[1] - l[0]; })()")
        if len(r0) >= 2 and g:
            drag(g[0], g[1], g[0], g[1] + step * 1.1, n=16)
            r1 = rules()
            check(r1[0] == r0[1] and r1[1] == r0[0], f'dragging rule 1 down a row swaps it with rule 2 ({r1[0][:20]!r} is first)')
            shot('rules-after-drag')
        else:
            check(False, f'Tactics shows two rules to drag ({len(r0)} rules)')
        js("document.getElementById('screen').scrollTop = 0; 'ok'")
        scroll_check('#screen', 'the Tactics screen', dist=140)

        # 7. a battle: the whole stage, the art at 3×, the coach mark on its target, and a tap on the HUD
        js("TacticsEditor.close(); App.go('battle', { stage: 1 }); Battle.setSpeed(1); 'ok'")
        page.wait_for_timeout(2500)
        art = js("(() => { const cv = document.getElementById('world'); return [cv.width, cv.height, parseFloat(cv.style.width), parseFloat(cv.style.height), document.getElementById('frame').className, document.getElementById('frame').clientWidth]; })()")
        check(art[3] == 390 and art[2] == art[0] * 3 and art[3] == art[1] * 3 and 'column' not in art[4] and art[5] == info['W'], f'the battle fills the stage ({art[5]} wide) with its art at 3x ({art[0]}x{art[1]} -> {art[2]:.0f}x{art[3]:.0f})')
        js("Guide.coach('check', '#bSkip', 'Skip', { force: true, place: 'above' }); 'ok'")
        page.wait_for_timeout(500)
        ring = js("(() => { const r = Frame.box(document.querySelector('.coach-ring')), s = Frame.box(document.getElementById('bSkip')); return [r.left - s.left, r.top - s.top, r.right - s.right, r.bottom - s.bottom]; })()")
        check(all(abs(abs(v) - 3) < 2.5 for v in ring), f'the coach ring sits 3px round Skip ({[round(v, 1) for v in ring]})')
        shot('battle')
        check(tap_el('#hudRound') and js("[...document.querySelectorAll('#toasts .toast')].some(t => /Enrage/.test(t.textContent))"), 'a tap on the round counter shows its toast')

        # 8. notches: 47px safe-area insets at both ends of the frame's long side, which it keeps clear of
        if a.touch:
            ctx2 = b.new_context(viewport={'width': a.w, 'height': a.h}, device_scale_factor=1, is_mobile=True, has_touch=True)
            p2 = ctx2.new_page()
            turned = a.h > a.w
            ins = {'left': 0, 'right': 0, 'top': 47, 'bottom': 34} if turned else {'left': 47, 'right': 47, 'top': 0, 'bottom': 21}
            try:
                ctx2.new_cdp_session(p2).send('Emulation.setSafeAreaInsetsOverride', {'insets': ins})
                p2.goto(f'http://127.0.0.1:{port}/{a.page}')
                p2.wait_for_timeout(1500)
                r = p2.evaluate("(() => { const r = document.getElementById('stage').getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom]; })()")
                ok = (r[1] >= 46.5 and r[3] <= a.h - 33.5) if turned else (r[0] >= 46.5 and r[2] <= a.w - 46.5)
                check(ok, f'the frame keeps clear of the notches ({[round(v) for v in r]} with insets {ins})')
            except Exception as e:
                print('  skip notches: this Chromium cannot emulate safe-area insets', str(e)[:80])
            ctx2.close()
        b.close()
    srv.shutdown()
    for e in errors:
        print('  console error:', e)
    print('result:', 'FAIL' if fails or errors else 'ok', f'({len(fails)} failed, {len(errors)} console errors)')
    sys.exit(1 if fails or errors else 0)


if __name__ == '__main__':
    main()
