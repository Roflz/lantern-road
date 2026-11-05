"""The play-through again, in the browser, through the game's own buttons (build step 7b).

A new game is played through Region I the way a player taps it: the first pick; at the Hearth (screen 2, views around
the fire) the corner's Set out for the first trip, then a tap on the road in the scene; either flies up the road to the
frontier's card (the road view), whose Set out sets out (or after two losses there, ↓ a stage back and Farm); Skip in
battle, then the results popup (a tap skips its fill; Report and back on the first two trips; its New things, opening
"+N" when there are more than it shows; Hearth); the Recruit
Board, tapped in the Hearth's party view; and Build, by turning to the buildings view and tapping an empty plot. No
prototype tools. Two stand-ins for a player's own time: the clock is moved on to rest the party (the camp's ticking
does the rest, as when the app stays open), and points are spent as the Stats tab's + buttons would (Hero.autoBuild).
Taps in the Hearth's scene are real touches at the place on the screen, so they go through the turned frame.

It records every console error, every coach mark and tip as it appears, and every new thing the results popup shows,
and fails when the road stops moving.
  python tools/playthrough_ui.py [pilgrim|sellsword|hexblade] [--shots DIR]
"""
import argparse, functools, http.server, json, os, socketserver, sys, threading, time
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


CLOCK = """
(() => {
  const real = Date.now.bind(Date); let skew = 0;
  Date.now = () => real() + skew;
  window.__pass = ms => { skew += ms; };
  // what the first hour shows, as it appears
  window.__seen = { coach: [], tips: [], news: [] };
  const watch = () => new MutationObserver(list => { for (const m of list) for (const n of m.addedNodes) {
    if (!(n instanceof HTMLElement)) continue;
    if (n.classList.contains('coach-tip')) window.__seen.coach.push(n.textContent);
    if (n.classList.contains('toast') && n.classList.contains('tip')) window.__seen.tips.push(n.textContent);
  } }).observe(document.body, { childList: true, subtree: true });
  if (document.body) watch(); else document.addEventListener('DOMContentLoaded', watch);
})();
"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('hero', nargs='?', default='sellsword')
    ap.add_argument('--shots', default='')
    ap.add_argument('--minutes', type=float, default=25)
    a = ap.parse_args()

    handler = functools.partial(Quiet, directory=ROOT)
    srv = socketserver.TCPServer(('127.0.0.1', 0), handler)
    port = srv.server_address[1]
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    errors, problems = [], []
    t_end = time.time() + a.minutes * 60

    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=1, is_mobile=True, has_touch=True)
        page = ctx.new_page()
        page.add_init_script(CLOCK)
        page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(f'http://127.0.0.1:{port}/index.html')
        page.wait_for_timeout(3000)
        js = page.evaluate
        n_shot = [0]

        def shot(name):
            if a.shots:
                n_shot[0] += 1
                page.screenshot(path=os.path.join(a.shots, f'{n_shot[0]:03d}-{name}.png'))

        def tap(sel, text=None, wait=500):
            """Taps the first visible element matching sel (and text, a regex), as a finger would. True if it did."""
            ok = js("""([sel, text]) => { const re = text ? new RegExp(text) : null;
              const el = [...document.querySelectorAll(sel)].find(e => e.offsetWidth && !e.disabled && (!re || re.test(e.textContent)));
              if (!el) return false; el.scrollIntoView({ block: 'center' }); el.click(); return true; }""", [sel, text])
            if ok:
                page.wait_for_timeout(wait)
            return ok

        def touch(sel, text=None, wait=600):
            """Touches the middle of the first visible element matching sel (and text), where it is drawn on the screen and
            nothing of the HUD lies over it: for things in the camp's scene, which answer to the touch itself rather than
            to a click. Returns where it touched and what was there, or None."""
            r = js("""([sel, text]) => { const re = text ? new RegExp(text) : null, camp = document.querySelector('.camp');
              const toClient = (x, y) => { const r = document.getElementById('stage').getBoundingClientRect(), b = Frame.box(camp), k = Frame.k; x += b.left; y += b.top; return Frame.turned ? [r.left + (Frame.H - y) * k, r.top + x * k] : [r.left + x * k, r.top + y * k]; };
              for (const el of document.querySelectorAll(sel)) {
                if (!el.offsetWidth || +getComputedStyle(el).opacity <= 0.5 || (re && !re.test(el.textContent))) continue;
                // a point on it that a tap reaches: not under another plaque or chip, nor a button
                const b = Frame.box(el, camp);
                for (const f of [0.5, 0.25, 0.75, 0.1, 0.9]) {
                  const x = b.left + b.width * f, y = b.top + b.height / 2, hit = Camp.at(x, y), c = toClient(x, y), under = document.elementFromPoint(c[0], c[1]);
                  if (hit && hit.id === el.dataset.id && under && under.closest('.camp') && !under.closest('button, .cv-form')) return [c[0], c[1], el.dataset.id];
                }
              } return null; }""", [sel, text])
            if not r:
                return None
            page.touchscreen.tap(r[0], r[1])
            page.wait_for_timeout(wait)
            return r

        def scene_point(anchor):
            """Where an anchor of the camp's scene (js/campscene.js) is on the screen: the middle of its box."""
            return js("""id => { const L = Camp.scene; if (!L || !L.out) return null; const a = L.out.anchors.find(q => q.id === id); if (!a) return null;
              const x = (a.box[0] + a.box[2]) / 2 * 2, y = (a.box[1] + a.box[3]) / 2 * 2, r = document.getElementById('stage').getBoundingClientRect(), k = Frame.k;
              return Frame.turned ? [r.left + (Frame.H - y) * k, r.top + x * k] : [r.left + x * k, r.top + y * k]; }""", anchor)

        def road_point():
            """A lantern on the road in the camp's party view that a tap there reaches: the road under it, and no plaque,
            chip or button over it."""
            return js("""() => { const L = Camp.scene; if (!L || !L.out) return null;
              const marks = [...document.querySelectorAll('.cv-marks > *')].filter(m => m._at && m._at.o > 0.5).map(m => [m._at.x - m.offsetWidth / 2 - 6, m._at.y - 6, m._at.x + m.offsetWidth / 2 + 6, m._at.y + m.offsetHeight + 6]);
              for (const k of [5, 4, 6, 3, 7, 2, 8]) {
                const a = L.out.anchors.find(q => q.id === 'stage' + k); if (!a) continue;
                const cx = (a.box[0] + a.box[2]) / 2, cy = (a.box[1] + a.box[3]) / 2, x = cx * 2, y = cy * 2;
                const h = L.hit(cx, cy); if (!h || h.id !== 'road' || marks.some(b => x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3])) continue;
                const r = document.getElementById('stage').getBoundingClientRect(), K = Frame.k, p = Frame.turned ? [r.left + (Frame.H - y) * K, r.top + x * K] : [r.left + x * K, r.top + y * K];
                const under = document.elementFromPoint(p[0], p[1]); if (under && under.closest('button, .cv-form')) continue;
                return p;
              } return null; }""")

        def where():
            return js("() => JSON.stringify({ on: App.current, sheet: !document.getElementById('sheet').hidden && document.getElementById('sheet').firstChild && document.getElementById('sheet').firstChild.className, view: Camp.scene && Camp.scene.view, yaw: Camp.scene && Math.round(Camp.scene.yaw), toasts: [...document.querySelectorAll('#toasts .toast')].map(t => t.textContent).slice(-2) })")

        def to_camp(view='party'):
            """Back to camp (the Hearth tab, from the other screens), turned to a view with the arrow keys."""
            if js("() => App.current") != 'home' and not tap('#tabbar .tab', '^Hearth$', 1200):
                problems.append(f"no Hearth tab on {js('() => App.current')}")
                return False
            if js("() => Camp.scene ? Camp.scene.view : null") != view:
                page.keyboard.press('ArrowRight')
                page.wait_for_timeout(1600)
            if js("() => Camp.scene ? Camp.scene.view : null") != view:
                problems.append(f'the camp did not turn to the {view} view')
                return False
            return True

        def state():
            return js("""() => { const s = Save.state, fr = Campaign.frontier();
              return { fr, n: STAGES.filter(x => x.region === 0).length, fit: Campaign.fit().length, roster: s.roster.length,
                party: s.party.filter(Boolean).length, gold: s.currencies.gold, board: Base.boardOpen(s), picks: s.board.picks,
                cheapest: Math.min(...s.board.recruits.map(r => Base.recruitPrice(r, s)), 1e9), need: (STAGES[Math.min(fr + 1, STAGES.length - 1)] || {}).party || 6,
                cap: Base.rosterCap(s), tired: Campaign.chars().some(c => Campaign.spent(c) || (c.fatigue || 0) >= 70),
                build: Base.available(s).filter(id => Base.canPay(Base.cost(id, 1), s)).length > 0 && s.base.plots.some((x, i) => i < Base.plotsCleared(s) && !x),
                trip: !!s.campaign.trip, cleared: s.campaign.cleared.length }; }""")

        # ── the title (js/title.js): once it has loaded, a tap begins
        page.wait_for_function("typeof Title !== 'undefined' && Title.ready", timeout=60000, polling=50)
        shot('title')
        if not tap('#title', None, 1500):
            problems.append('no title to tap')
        # ── the first pick
        if not tap('.pickc', a.hero.capitalize()) and not tap('.pickc'):
            problems.append('no first pick on a new game')
        shot('pick')
        if not tap('.page.pick .btn.primary', wait=1500):
            problems.append('no Begin button on the first pick')
        shot('camp')

        trips, last_fr, still = 0, -1, 0
        while time.time() < t_end:
            st = state()
            if st['fr'] >= st['n']:
                break
            if st['fr'] == last_fr:
                still += 1
            else:
                still, last_fr = 0, st['fr']
            if still > 40:
                problems.append(f"the road stopped at stage {st['fr'] + 1} for 40 trips")
                break
            # rest: the clock moves on, and the camp's own ticking brings the party back
            waited = 0
            while st['tired'] or not st['fit']:
                js('() => { __pass(30 * 60000); Base.tick(Save.state); }')
                waited += 30
                st = state()
                if waited > 48 * 60:
                    problems.append('48 hours of rest left the party unfit')
                    break
            # points, as the Stats tab's + buttons would place them
            js('() => { for (const c of Save.state.roster) Hero.autoBuild(c); Save.commit(); }')
            # hire: the Recruit Board, tapped in the camp's party view (its plaque), a card, Hire
            while st['board'] and st['picks'] > 0 and st['roster'] < min(st['need'], st['cap']) and st['cheapest'] <= st['gold']:
                to_camp('party')
                t = touch('.camp .cv-plq[data-id="board"]', None, 900)
                if not t or js("() => App.current") != 'building':
                    problems.append(f"a tap on the Recruit Board at camp did not open it: touched {t}, now {where()}")
                    break
                tap('.recruit', None, 300)
                if not tap('.bld-view .btn.primary', '^Hire', 900):
                    break
                shot('hired')
                st = state()
            # build: turn the camp to the buildings view, tap an empty plot, pick, Build the …
            if st['build'] and to_camp('build'):
                t = touch('.camp .cv-plq.empty', None, 900)
                if t and js("() => !!document.querySelector('#sheet .buildbox')"):
                    tap('.buildbox .opt', None, 300)
                    if tap('.buildbox .btn.primary', '^Build the', 900):
                        shot('built')
                    else:
                        tap('.sheet-x', None, 300)
                else:
                    problems.append(f'a tap on an empty plot at camp did not open its build sheet: touched {t}, now {where()}')
                    shot('missed-plot')
                    tap('.sheet-x', None, 300)
            # the road view: the first trip by the camp's Set out, after that a tap on the road in the camp's scene; the
            # camera flies up the road to the frontier with its card open. Its Set out, or after two losses there, a
            # step back down the road (↓) and Farm.
            to_camp('party')
            if trips == 0:
                if not tap('.camp .cv-dock .cv-big', 'Set out', 2000):
                    problems.append("no Set out at the Hearth")
                    break
            else:
                pt = road_point()
                if pt:
                    page.touchscreen.tap(pt[0], pt[1])
                    page.wait_for_timeout(2000)
            on_road = js("() => !!(Camp.scene && Camp.scene.onRoad && Camp.scene.out.road === 1)")
            front = js("() => { const fr = Campaign.frontier(); return Camp.scene.sel === STAGES.filter(x => x.region === STAGES[fr].region).indexOf(STAGES[fr]); }") if on_road else False
            if not on_road or not front:
                problems.append(f"{'the Hearth' + chr(39) + 's Set out' if trips == 0 else 'a tap on the road at camp'} did not fly up the road to the frontier: now {where()}, on the road {on_road}")
                shot('missed-road')
                if not on_road:
                    tap('.camp .cv-dock .cv-big', 'Set out', 2000)
            if trips < 2:
                shot('road')
            farm = js('() => window.__lost >= 2 && Campaign.frontier() % 18 > 0')
            if farm:
                page.keyboard.press('ArrowDown')
                page.wait_for_timeout(900)
                if tap('.cv-roadgo', '^Farm$', 1500):
                    js('() => { window.__lost = 1; }')
                else:
                    problems.append(f"no Farm a stage back from {st['fr'] + 1}")
                    farm = False
            if not farm and not tap('.cv-roadgo', '^Set out$', 1500):
                problems.append(f"no Set out on the road at stage {st['fr'] + 1}: the button says {js('() => (document.querySelector(`.cv-roadgo`) || {}).textContent')}")
                js("() => Camp.scene && Camp.scene.toCamp(true)")
                continue
            trips += 1
            if trips <= 2:
                shot('battle')
            # the trip: Skip each battle; between battles the party walks on by itself; the results popup ends it
            for _ in range(80):
                # a battle under way, or a sheet (the results popup hides the battle's controls behind it)
                page.wait_for_function("() => !document.getElementById('sheet').hidden || (Battle.busy && !document.getElementById('controls').hidden)", timeout=20000, polling=100)
                page.wait_for_timeout(300)
                if js("() => !!document.querySelector('#sheet.results:not([hidden]) .rs-box')"):
                    # a tap skips the fill; then what came home, a look at the report, and back to camp
                    tap('#sheet .rs-banner', None, 400)
                    won = js("() => document.querySelector('#sheet .rs-banner b').textContent === 'Victory'")
                    js('w => { window.__lost = w ? 0 : (window.__lost || 0) + 1; }', won)
                    if tap('#sheet .rs-new.more', None, 600):
                        news = js("() => [...document.querySelectorAll('#sheet .rs-list .newrow b')].map(b => b.textContent)")
                        tap('#sheet .rs-list .sheet-x', None, 500)
                    else:
                        news = js("() => [...document.querySelectorAll('#sheet .rs-new')].map(b => b.getAttribute('aria-label'))")
                    if news:
                        js('n => __seen.news.push(...n)', news)
                        shot('news')
                    if trips <= 2:
                        shot('results')
                        if tap('#sheet .rs-b[data-tut=report]', None, 800) and js("() => !!document.querySelector('#sheet .report-box')"):
                            tap('#sheet .report-wrap > .sheet-x', None, 600)
                        else:
                            problems.append('Report on the results did not open the battle report')
                    if not tap('#sheet .rs-b[data-tut=camp]', None, 1200):
                        problems.append('no Hearth button on the results')
                    break
                if js("() => !document.getElementById('sheet').hidden"):
                    tap('#sheet .sheet-x', None, 400)
                    continue
                tap('#bSkip', None, 900)
                # between battles: wait for the walk, or for the results
                for _ in range(40):
                    if js("() => !document.getElementById('sheet').hidden || !!(Battle.busy && !document.querySelector('.between'))"):
                        break
                    page.wait_for_timeout(250)
            if js('() => Campaign.trip() != null'):
                problems.append('a trip did not end')
                js("() => { Campaign.end({ k: 'called', text: 'test' }); App.go('map'); }")

        tap('#tabbar .tab', 'Road', 900)
        st = state()
        seen = js('() => window.__seen')
        shot('end')
        b.close()
    srv.shutdown()
    if st['fr'] < st['n']:
        problems.append(f"stopped at stage {st['fr'] + 1} of {st['n']} after {trips} trips")
    print(f"UI play-through ({a.hero}): {st['cleared']} stages lit in {trips} trips, {st['roster']} heroes, {st['gold']} gold")
    print('coach marks:', json.dumps(seen['coach'], ensure_ascii=False))
    print('tips:', json.dumps(seen['tips'], ensure_ascii=False))
    print('new things:', json.dumps(seen['news'], ensure_ascii=False))
    print('console errors:', len(errors))
    for e in errors[:10]:
        print('   ', e)
    for pr in problems:
        print('PROBLEM:', pr)
    sys.exit(1 if errors or problems else 0)


if __name__ == '__main__':
    main()
