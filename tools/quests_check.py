"""Checks Bess the carter and her quests (js/quests.js, docs/first-session-spec.md §4) in headless Chromium, through real
input, and takes their screenshots.

From a save set up in the page (two heroes, 1-1 and 1-2 cleared, Wick's first session over), at the Hearth:
  - Bess comes by herself: her cart rolls up the road and stops by the fire, then she stands there with her scene
    anchor and [data-tut=hearth-bess]; the goal tracker's quest line says Bess, New, and a chip over her counts 1
  - a press on her: she tips her hat and her panel opens, inside the frame, with her portrait, her first line and
    The Gravedigger's card (quest-card, quest-accept)
  - Accept: the quest is on, her line changes, and the tracker shows The Sexton, 1-18; Escape (or the ✕) closes the
    panel, and the tracker's line opens it again
  - the next trip home: Bess's card "New: Daily jobs", Show me, and her panel with three jobs, the bonus and the timer
  - a job done: Claim pays its gold; all three: the bonus puts a piece in the Bag
  - 1-18 lit: The Gravedigger is done, Claim pays, and the tracker's line goes
  - the app opened again: Bess stands there at once, and her quests are as they were
  python tools/quests_check.py [--sizes 844x390,694x390,390x844t] [--shots docs/screens/bess]
A size ending in t has a touch screen (and 390x844t is turned). Screenshots are taken at the first size only.
Console errors fail the run.
"""
import argparse, functools, http.server, os, re, socketserver, sys, threading
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SIZES = '844x390,694x390,390x844t'

SETUP = """
() => {
  const s = Save.state;
  closeScreen();
  if (typeof FirstSession !== 'undefined') FirstSession.skip(); // Wick's first session (tools/guide_check.py walks it)
  s.name = 'Roflz';
  Base.newGame('sellsword', s, { name: 'Fulke' });
  const b = Hero.create('pilgrim', 'c' + s.nextId++, { name: 'Agnes', level: 2 });
  s.roster.push(b); Base.place(b, s); Tactics.owner(b.id);
  Proto.lightNext(s); Proto.lightNext(s);
  for (const k of ['c:board', 'c:flags', 'c:speed', 'c:rule']) s.campaign.tips[k] = 1;
  Base.tick(s); Save.commit();
  App.go('home', {}, { instant: true });
  return { bess: s.quests.bess, done: s.guide.done, lit: s.campaign.cleared.slice() };
}
"""
HEARTH = "App.current === 'home' && !!Camp.scene && !Camp.scene.onRoad && document.getElementById('sheet').hidden"
PANEL = "Quests.shown && !!document.querySelector('#sheet.quests:not([hidden]) .qs .kp')"


class Server(socketserver.ThreadingTCPServer):
    """A page asks for its forty-odd files at once: a server that takes one request at a time could drop one."""
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
    if a.shots:
        os.makedirs(a.shots, exist_ok=True)

    def check(ok, what):
        print(('  ok   ' if ok else '  FAIL ') + what)
        if not ok:
            fails.append(what)
        return ok

    with sync_playwright() as p:
        b = p.chromium.launch()
        for n, size in enumerate(a.sizes.split(',')):
            touch = size.endswith('t')
            w, h = (int(v) for v in size.rstrip('t').split('x'))
            tag = f'{w}x{h}{" touch" if touch else ""}'
            ctx = b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=1, is_mobile=touch, has_touch=touch)
            page = ctx.new_page()
            page.on('console', lambda m, t=tag: errors.append(f'{t}: {m.text}') if m.type == 'error' else None)
            page.on('pageerror', lambda e, t=tag: errors.append(f'{t}: {e}'))
            js = page.evaluate

            def boot(pg):
                pg.goto(f'http://127.0.0.1:{port}/index.html')
                pg.wait_for_function("typeof Title !== 'undefined' && Title.ready", timeout=60000, polling=50)
                pg.click('#title')
                pg.wait_for_timeout(700)

            boot(page)
            print(f'{tag}: {js(SETUP)}')

            def shot(name):
                if a.shots and n == 0:
                    js("document.querySelectorAll('#toasts .toast').forEach(t => t.remove())")
                    page.screenshot(path=os.path.join(a.shots, f'{name}-{w}x{h}.png'))

            def wait(expr, ms=3000):
                try:
                    page.wait_for_function(expr, timeout=ms, polling=50)
                    return True
                except Exception:
                    return False

            def client(x, y):
                return js("([x, y]) => { const r = document.getElementById('stage').getBoundingClientRect(), k = Frame.k; return Frame.turned ? [r.left + (Frame.H - y) * k, r.top + x * k] : [r.left + x * k, r.top + y * k]; }", [x, y])

            def centre(sel):
                """Where an element is drawn, in design pixels, or None while it isn't shown."""
                return js("(sel) => { const el = document.querySelector(sel); if (!el || !el.getClientRects().length) return null; const b = Frame.box(el); return b.width > 0 ? [b.left + b.width / 2, b.top + b.height / 2] : null; }", sel)

            def press(x, y, wait_ms=400):
                cx, cy = client(x, y)
                if touch:
                    page.touchscreen.tap(cx, cy)
                else:
                    page.mouse.click(cx, cy)
                page.wait_for_timeout(wait_ms)

            def tap(sel, wait_ms=400):
                c = centre(sel)
                if not c:
                    return False
                press(*c, wait_ms=wait_ms)
                return True

            def inside(sel):
                return js("(sel) => { const P = Frame.box(document.querySelector(sel)); return [P.left, P.top, P.right, P.bottom, Frame.W, Frame.H]; }", sel)

            q = lambda: js('JSON.parse(JSON.stringify(Save.state.quests))')
            line = lambda: js("(document.querySelector('.qs-say span') || {}).textContent || ''")
            tracker = lambda: js("(() => { const el = document.querySelector('.camp [data-tut=hearth-quest]'); return el && !el.hidden ? el.textContent : null; })()")

            # ── she comes by herself, and her cart rolls up the road
            check(wait('Quests.arriving', 4000), f'{tag}: back at the Hearth after 1-2, Bess’s cart starts rolling in')
            page.wait_for_timeout(1700)
            shot('01-arriving')
            check(js("Camp.scene.state.bess && Camp.scene.state.bess.arrive > 0 && !Camp.scene.out.anchors.some(a => a.id === 'bess')"), f'{tag}: while it rolls, she can’t be tapped yet')
            check(wait(f"!Quests.arriving && {HEARTH} && !!Wick.boxOf('[data-tut=hearth-bess]')", 8000), f'{tag}: the cart stops by the road, and [data-tut=hearth-bess] is on her')
            page.wait_for_timeout(400)
            Q = q()
            check(Q['bess'] and Q['story'] == 'offered' and Q['jobs'] == '', f'{tag}: the save has her there, The Gravedigger offered {Q}')
            ab = js("(() => { const a = Camp.scene.out.anchors.find(a => a.id === 'bess'); const t = Wick.boxOf('[data-tut=hearth-bess]'); return a && t ? [a.box, t] : null; })()")
            check(ab and ab[1]['w'] > 40 and ab[1]['h'] > 20, f'{tag}: her scene anchor and box {ab}')
            check(tracker() == 'BessNew', f'{tag}: the goal tracker’s quest line says Bess, New ({tracker()!r})')
            chip = js("(() => { const el = document.querySelector('.cv-wait[data-id=bess]'); return el && +el.style.opacity > 0.5 ? el.textContent : null; })()")
            check(chip == '1', f'{tag}: a chip over her counts 1 ({chip!r})')
            shot('02-hearth')

            # ── a press on her: she tips her hat, and her panel opens
            c = centre('[data-tut=hearth-bess]')
            press(c[0], c[1] + 6, wait_ms=110)
            shot('03-tap')
            check(wait(PANEL, 2000), f'{tag}: a press on Bess opens her panel')
            page.wait_for_timeout(450)
            fb = inside('.qs .kp')
            check(fb[0] >= -1 and fb[1] >= -1 and fb[2] <= fb[4] + 1 and fb[3] <= fb[5] + 1, f'{tag}: the panel sits inside the frame ({[round(v) for v in fb]})')
            pt = inside('.qs-pt')
            check(pt[0] >= -1 and pt[2] <= fb[0] + 40 and js("document.querySelector('.qs-pt').naturalWidth") == 184, f'{tag}: Bess drawn large beside it ({[round(v) for v in pt]})')
            check(line() == 'Folk want to use your road. They’re too scared to.', f'{tag}: her first line ({line()!r})')
            card = js("(() => { const el = document.querySelector('[data-tut=quest-card]'); return el ? [el.querySelector('.qs-nm').textContent, el.querySelector('.qs-gt').textContent, !!el.querySelector('[data-tut=quest-accept]'), el.querySelector('.qs-rw').textContent] : null; })()")
            check(card and card[0] == 'The Gravedigger' and card[1] == 'Defeat the Sexton1-18' and card[2] and 'Toll House' in card[3], f'{tag}: The Gravedigger’s card, its goal, its plan and Accept {card}')
            spill = js("(() => { const P = Frame.box(document.querySelector('.qs .kp')); return [...document.querySelectorAll('.qs .kp-body *')].filter(el => { const b = Frame.box(el); return b.width && (b.left < P.left - 1 || b.right > P.right + 1 || b.bottom > P.bottom + 1); }).map(el => el.className); })()")
            check(not spill, f'{tag}: nothing spills out of the panel {spill}')
            shot('04-offer')

            # ── Accept
            check(tap('[data-tut=quest-accept]', 350) and js('Quests.accepted()'), f'{tag}: Accept takes the quest')
            check(line() == 'Stop it, and the travellers will make it worth your while.' and not js("!!document.querySelector('[data-tut=quest-accept]')"), f'{tag}: her line after it, and no Accept ({line()!r})')
            check(q()['jobs'] == 'due', f'{tag}: the daily jobs are due on the next trip home')
            shot('05-accepted')
            if touch:
                tap('.qs .kp-x', 400)
            else:
                page.keyboard.press('Escape')
                page.wait_for_timeout(400)
            check(wait(f'!Quests.shown && {HEARTH}', 1500), f'{tag}: {"the ✕" if touch else "Escape"} closes her panel')
            check(tracker() == 'The Sexton1-18', f'{tag}: the tracker shows The Sexton, 1-18 ({tracker()!r})')
            shot('06-tracker')
            check(tap('.camp [data-tut=hearth-quest]', 500) and wait(PANEL, 1500), f'{tag}: the tracker’s line opens her panel')
            tap('.qs .kp-x', 400)
            check(wait(f'!Quests.shown && {HEARTH}', 1500), f'{tag}: the ✕ closes it')

            # ── the next trip home: Bess's card, and her jobs
            js("(() => { const s = Save.state; Campaign.setOut(STAGES.findIndex(x => x.id === '1-3'), s); Campaign.end({ k: 'called', text: 'Home' }, s); s.campaign.lastTrip.seen = true; Save.commit(); App.refresh(); })()")
            check(q()['jobs'] == 'new' and len(q()['daily']['jobs']) == 3, f'{tag}: home from a trip, the jobs open: {[j["kind"] for j in (q()["daily"] or {}).get("jobs", [])]}')
            check(wait("!!document.querySelector('#wk .qs-card-new') && Quests.card", 2500), f'{tag}: Bess’s card, New: Daily jobs')
            page.wait_for_timeout(400)
            shot('07-jobs-card')
            check(tap('#wk [data-tut=jobs-show]', 600) and wait(PANEL + " && !!document.querySelector('[data-tut=jobs]')", 1500), f'{tag}: Show me opens her panel on the jobs')
            rows = js("[...document.querySelectorAll('.qs-job')].map(r => [r.querySelector('.qs-jn').textContent, r.querySelector('.qs-n').textContent])")
            timer = js("(document.querySelector('.qs-timer span') || {}).textContent")
            check(len(rows) == 4 and rows[3][0] == 'All three' and all(re.match(r'^0/\d+$', r[1]) for r in rows), f'{tag}: three jobs and the bonus {rows}')
            check(bool(re.match(r'^(\d+h \d\dm|\d+m)$', timer or '')), f'{tag}: the timer to new jobs ({timer})')
            check(q()['jobs'] == 'seen' and line() == 'Jobs today. Do all three and there’s a bit extra.', f'{tag}: the card is answered, and her line ({line()!r})')
            fb = inside('.qs .kp')
            spill = js("(() => { const P = Frame.box(document.querySelector('.qs .kp')); return [...document.querySelectorAll('.qs .kp-body *')].filter(el => { const b = Frame.box(el); return b.width && (b.left < P.left - 1 || b.right > P.right + 1 || b.bottom > P.bottom + 1); }).map(el => el.className); })()")
            check(not spill, f'{tag}: the jobs fit the panel {spill}')
            shot('08-jobs')

            # ── a job done: Claim; all three: the bonus
            js("(() => { const D = Save.state.quests.daily; D.jobs[0].done = D.jobs[0].need; Save.commit(); Quests.close(); Quests.open(); })()")
            page.wait_for_timeout(350)
            g0, R = js('Save.state.currencies.gold'), js('Quests.jobReward()')
            check(js('Quests.ready()') >= 1 and tap('[data-tut=job-claim]', 400), f'{tag}: a job done has Claim')
            check(js('Save.state.currencies.gold') == g0 + R['gold'] and q()['daily']['jobs'][0]['claimed'], f'{tag}: Claim pays {R["gold"]} gold and {R["n"]} {R["mat"]}')
            js("(() => { const D = Save.state.quests.daily; for (const j of D.jobs) j.done = j.need; Save.commit(); Quests.close(); Quests.open(); })()")
            page.wait_for_timeout(350)
            bag0 = js('Save.state.inventory.items.length')
            check(tap('[data-tut=bonus-claim]', 400) and q()['daily']['bonus'] and js('Save.state.inventory.items.length') == bag0 + 1, f'{tag}: all three: the bonus puts a piece in the Bag')
            shot('09-claimed')
            tap('.qs .kp-x', 400)

            # ── 1-18 lit: The Gravedigger is done
            js("(() => { Proto.lightTo(1); Base.tick(Save.state); Save.commit(); App.refresh(); })()")
            page.wait_for_timeout(500)
            check(tracker() == 'The GravediggerClaim', f'{tag}: the Sexton beaten, the tracker says Claim ({tracker()!r})')
            check(tap('.camp [data-tut=hearth-quest]', 500) and wait(PANEL + " && !!document.querySelector('[data-tut=quest-claim]')", 1500), f'{tag}: her panel has The Gravedigger’s Claim')
            shot('10-done')
            g0 = js('Save.state.currencies.gold')
            check(tap('[data-tut=quest-claim]', 400) and q()['story'] == 'claimed' and js("Base.blueprint('tollhouse', Save.state)"), f'{tag}: Claim brings the Toll House plan (no stage brings it)')
            check(not js("!!document.querySelector('[data-tut=quest-card]')"), f'{tag}: the card is gone')
            tap('.qs .kp-x', 400)
            check(tracker() is None, f'{tag}: and so is the tracker’s line')

            # ── the app opened again: she's simply there
            saved = q()
            js('Save.flush && Save.flush()')
            page2 = ctx.new_page()
            page2.on('pageerror', lambda e, t=tag: errors.append(f'{t} (again): {e}'))
            boot(page2)
            try:
                page2.wait_for_function(f"{HEARTH} && !!Camp.scene.out && Camp.scene.out.anchors.some(a => a.id === 'bess')", timeout=4000, polling=50)
                there = True
            except Exception:
                there = False
            check(there and not page2.evaluate('Quests.arriving'), f'{tag}: opened again, Bess stands there at once')
            check(page2.evaluate('JSON.parse(JSON.stringify(Save.state.quests))') == saved, f'{tag}: her quests are as they were')
            page2.close()
            ctx.close()
        b.close()
    print()
    for e in errors:
        print('  console: ' + e)
    if fails or errors:
        print(f'{len(fails)} failed, {len(errors)} console errors')
        sys.exit(1)
    print('All Bess checks passed.')


if __name__ == '__main__':
    main()
