"""The play-through again, in the browser, through the game's own buttons (build step 7b).

A new game is played through Region I the way a player taps it: Wick's first session (js/firstsession.js), every
forced step by touch where it is lit: his story and the name box, the first pick at the Recruit Board, 1-1 with his
pauses, the results, Grow (a + on the hero's Stats tab, and Keep), the unforced 1-2 (Set out, and the road's Set out),
the free recruit and the drag in Formation; then at the Hearth (screen 2, views around the fire) the corner's Set out
for the first trip, then a tap on the road in the scene; either flies up the road to the frontier's card (the road
view), whose Set out sets out (or after two losses there, ↓ a stage back and Farm); Skip in battle, then the results
popup (a tap skips its fill; Report and back on the first two trips; its New things, opening "+N" when there are more
than it shows; Hearth); Wick's card after 1-3 (Show me, and his soft visit to Tactics); the Recruit Board, tapped in
the Hearth's party view, hiring a class the party lacks (the cheapest of those, as tools/playthrough.js hires); and
Build, by turning to the buildings view and tapping an empty plot. No prototype tools. Three stand-ins for a player's
own time: the clock is moved on to rest the party (the camp's ticking does the rest, as when the app stays open),
points are spent as the Stats tab's + buttons would (Hero.autoBuild), and gear is worn as the Gear tab's Auto-equip
would wear it (HeroSheet.autoEquipPlan). Taps in the Hearth's scene are real touches at the place on the screen, so they
go through the turned frame.

It records every console error, every coach mark and tip as it appears, and every new thing the results popup shows,
and fails when the road stops moving.

Quick, for builders: --quick stops as soon as every flow below has run once, and fails if one never did. The partner
session runs the whole play-through (the default) once before merging.
  python tools/playthrough_ui.py [pilgrim|sellsword|hexblade] [--quick] [--shots DIR] [--minutes N]

How it keeps quick: each tap waits for what it should bring up next (wait_for_function on the game's own state: the
camera still, the road's card up, a battle under way, the popup's fill done) instead of sleeping, and the battle speed
button is set to 4×. One test switch, which players never have: window.__test.fastWalk, read where the walk between
battles is timed (walkOn in js/main.js), makes that walk instant. The guide's coach marks need time on screen, so on
the first trips battles play before Skip until it has shown its marks in battle, and the walk takes its time until it
has shown the one between battles.

To add a step (the guide's forced steps, say): tap(sel, text, then=JS) taps and waits for JS to be true; touch() is
for things in the camp's scene; ran('name') marks a flow done, and FLOWS lists the ones --quick waits for.
"""
import argparse, functools, http.server, json, os, socketserver, sys, threading, time
from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

# the flows --quick waits for, each once; in the order a new game first meets them
FLOWS = {
    'guide': "Wick's first session, every forced step, and the unforced 1-2 in it",
    'pick': 'the first pick',
    'visit': "Wick's card at the Hearth after 1-3's first clear (Show me), and his soft visit to Tactics",
    'set out': "Set out at the Hearth, up the road to the frontier's card",
    'battle': 'a battle, skipped',
    'results': 'the results popup, with Report',
    'hearth': 'the Hearth button on the results',
    'hire': 'a hire at the Recruit Board',
    'build': 'a building on an empty plot',
}


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


CLOCK = """
(() => {
  const real = Date.now.bind(Date); let skew = 0;
  Date.now = () => real() + skew;
  window.__pass = ms => { skew += ms; };
  // the play-through's switches (players never have window.__test): the walk between battles takes no time
  window.__test = { fastWalk: true };
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

# What each step waits for. The camp's camera is still (it has stood 200 ms where it was going: js/campscene.js's
# out.still) in a view, or at the end of the road's flight with the frontier's card up.
VIEW_STILL = """want => { const L = Camp.scene; if (App.current !== 'home' || !L || !L.out || !L.out.still || L.onRoad || L.road !== 0) return false;
  const y = ((L.out.yaw % 360) + 360) % 360; return L.view === want && Math.abs(y - (want === 'build' ? 180 : 0)) < 0.1; }"""
ROAD_STILL = """() => { const L = Camp.scene, b = document.querySelector('.cv-roadgo');
  return !!(L && L.onRoad && L.road === 1 && L.out && L.out.still && L.out.road && b && b.offsetWidth); }"""
IN_BATTLE = "() => !!(Battle.busy && !document.getElementById('controls').hidden)"
SHEET_OR_BATTLE = "() => !document.getElementById('sheet').hidden || (Battle.busy && !document.getElementById('controls').hidden)"
RESULTS = "() => !!document.querySelector('#sheet.results:not([hidden]) .rs-box')"
# Wick's first session: one of his forced steps is up (js/wick.js), the session is in its unforced 1-2 (setout2, yours:
# the player sets out), or it is over. His gate holds back the synthetic clicks tap() makes, so his steps are answered
# with real touches where they are drawn.
UNFORCED = ['setout2', 'yours']
WICK_UP = "() => { const g = Wick.step; return !FirstSession.on || !!(g && !g.closed && g.root.classList.contains('in')) || " + json.dumps(UNFORCED) + ".includes(FirstSession.step); }"
WICK_NOW = """() => { const g = Wick.step; if (!g || g.closed) return null;
  const m = el => { if (!el) return null; const r = el.getBoundingClientRect(); return r.width ? [r.left + r.width / 2, r.top + r.height / 2] : null; };
  return { step: FirstSession.step, tap: g.tap, hole: m(g.root.querySelector('.wk-hole')) }; }"""
# the middle of an element on the screen, and a point in the stage's design pixels on the screen (through the turn)
MID = "sel => { const el = typeof sel === 'string' ? document.querySelector(sel) : sel; if (!el) return null; const r = el.getBoundingClientRect(); return r.width ? [r.left + r.width / 2, r.top + r.height / 2] : null; }"
TO_CLIENT = "([x, y]) => { const r = document.getElementById('stage').getBoundingClientRect(), k = Frame.k; return Frame.turned ? [r.left + (Frame.H - y) * k, r.top + x * k] : [r.left + x * k, r.top + y * k]; }"
# The recruit to hire: a class the party lacks, the cheapest of those that can be paid for (its place on the board).
WANTED = """() => { const s = Save.state, have = new Set(s.roster.map(c => c.cls)), price = r => Base.recruitPrice(r, s);
  const list = s.board.recruits.map((r, i) => ({ r, i })).filter(x => price(x.r) <= s.currencies.gold).sort((a, b) => (have.has(a.r.cls) - have.has(b.r.cls)) || (price(a.r) - price(b.r)));
  return list.length ? list[0].i : 0; }"""
# The guide's coach marks in battle and between battles (js/guide.js) come with time on screen: until each has shown,
# battles play (at 4×) before Skip, and the walk between battles takes its time.
WATCH_KEYS = ['c:flags', 'c:items', 'c:rule']
WATCHING = f"() => {json.dumps(WATCH_KEYS)}.some(k => !Guide.seen(k))"
WATCH_TRIPS, WATCH_MS = 8, 12000


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('hero', nargs='?', default='sellsword')
    ap.add_argument('--shots', default='')
    ap.add_argument('--minutes', type=float, default=25)
    ap.add_argument('--quick', action='store_true', help='stop once every flow has run')
    a = ap.parse_args()

    handler = functools.partial(Quiet, directory=ROOT)
    srv = socketserver.TCPServer(('127.0.0.1', 0), handler)
    port = srv.server_address[1]
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    errors, problems, done = [], [], {}
    t0 = time.time()
    t_end = t0 + a.minutes * 60

    def ran(flow):
        done.setdefault(flow, round(time.time() - t0, 1))

    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=1, is_mobile=True, has_touch=True)
        page = ctx.new_page()
        page.add_init_script(CLOCK)
        page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(f'http://127.0.0.1:{port}/index.html')
        js = page.evaluate
        n_shot = [0]

        def shot(name):
            if a.shots:
                n_shot[0] += 1
                page.screenshot(path=os.path.join(a.shots, f'{n_shot[0]:03d}-{name}.png'))

        def until(cond, arg=None, timeout=5000):
            """Waits for cond (a JS function) to be true, polling every 25 ms. True if it came true in time."""
            try:
                page.wait_for_function(cond, arg=arg, timeout=timeout, polling=25)
                return True
            except PWTimeout:
                return False

        def tap(sel, text=None, then=None, arg=None, timeout=5000, settle=0):
            """Taps the first visible element matching sel (and text, a regex), as a finger would; then waits for then
            (a JS function) to be true, or settle ms when nothing on screen tells. True if it tapped (and then came
            true)."""
            ok = js("""([sel, text]) => { const re = text ? new RegExp(text) : null;
              const el = [...document.querySelectorAll(sel)].find(e => e.offsetWidth && !e.disabled && (!re || re.test(e.textContent)));
              if (!el) return false; el.scrollIntoView({ block: 'center' }); el.click(); return true; }""", [sel, text])
            if not ok:
                return False
            if then:
                return until(then, arg, timeout)
            if settle:
                page.wait_for_timeout(settle)
            return True

        def touch(sel, text=None, then=None, timeout=5000):
            """Touches the middle of the first visible element matching sel (and text), where it is drawn on the screen and
            nothing of the HUD lies over it: for things in the camp's scene, which answer to the touch itself rather than
            to a click. Then waits for then. Returns where it touched and what was there, or None."""
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
            if then:
                until(then, None, timeout)
            return r

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
            """Back to camp (the Hearth tab, from the other screens), turned to a view with the arrow keys, the camera
            still."""
            if js("() => App.current") != 'home' and not tap('#tabbar .tab', '^Hearth$', "() => App.current === 'home' && !!(Camp.scene && Camp.scene.out)"):
                problems.append(f"no Hearth tab on {js('() => App.current')}")
                return False
            if js("() => Camp.scene ? Camp.scene.view : null") != view:
                page.keyboard.press('ArrowRight')
            if not until(VIEW_STILL, view):
                problems.append(f'the camp did not turn to the {view} view: now {where()}')
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
        if not tap('#title', None, WICK_UP, timeout=10000):
            problems.append(f"no title to tap, or no step of Wick's after it: now {where()}")

        # ── Wick's first session (js/firstsession.js): every forced step, answered as a player would
        def press(c):
            if c:
                page.touchscreen.tap(c[0], c[1])
            return bool(c)

        def stage_point(x, y):
            return js(TO_CLIENT, [x, y])

        def drag(d0, d1, steps=14, lift=True):
            """A finger from one point to another in design pixels: up first, so it lifts a hero off Formation's strip;
            without lift, straight (a drag round the camp: at the fire a drag goes the way it first heads)."""
            if lift:
                pts = [(d0[0], d0[1]), (d0[0], d0[1] - 14)] + [(d0[0] + (d1[0] - d0[0]) * i / steps, d0[1] - 14 + (d1[1] - d0[1] + 14) * i / steps) for i in range(1, steps + 1)]
            else:
                pts = [(d0[0], d0[1])] + [(d0[0] + (d1[0] - d0[0]) * i / steps, d0[1] + (d1[1] - d0[1]) * i / steps) for i in range(1, steps + 1)]
            pts = [stage_point(*q) for q in pts]
            cdp = ctx.new_cdp_session(page)
            cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': pts[0][0], 'y': pts[0][1]}]})
            for q in pts[1:]:
                cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': q[0], 'y': q[1]}]})
                page.wait_for_timeout(16)
            page.wait_for_timeout(120 if lift else 250)
            cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
            cdp.detach()

        def board(pick):
            """The Recruit Board's panel (js/firstpick.js): a row, its +, Hire, then the reveal, each by touch."""
            cards = js("() => [...document.querySelectorAll('#sheet .fp [data-tut=pick-card]')].map(c => c.dataset.cls)")
            if len(cards) != 3:
                problems.append(f'the Recruit Board shows {len(cards)} faces, not three')
                return False
            k = cards.index(pick) if pick in cards else 0
            press(js(f"() => ({MID})(document.querySelectorAll('#sheet .fp [data-tut=pick-card]')[{k}])"))
            press(js(f"() => ({MID})(document.querySelectorAll('#sheet .fp [data-tut=pick-plus]')[{k}])"))
            if not until("() => !!document.querySelector('[data-tut=pick-hire]')", None, 3000):
                problems.append('no Hire on the Recruit Board after its + on a face')
                return False
            press(js(f"() => ({MID})('[data-tut=pick-hire]')"))
            if not until("() => !!document.querySelector('[data-tut=pick-reveal]')", None, 3000):
                problems.append(f'no reveal after Hire: {where()}')
                return False
            page.wait_for_timeout(550)  # the reveal takes a tap only after half a second
            press(stage_point(js('() => Frame.W') / 2, 200))
            return until("() => !document.querySelector('#sheet .fp')", None, 3000)

        def card():
            """Wick's card at the Hearth when a first clear opened something (js/visits.js): Show me, then his soft steps
            on the screen it opens (a press anywhere goes on), then ‹ back to the Hearth. Its gate holds back tap()'s
            synthetic clicks, so it is answered with real touches."""
            if not js("() => Visits.card || Object.values(Save.state.guide.visits || {}).includes('new')"):
                return
            if not until("() => Visits.card", None, 4000):
                return
            page.wait_for_timeout(450)
            shot('visit-card')
            press(js(f"() => ({MID})('[data-tut=visit-show]')"))
            n = 0
            while js('() => Visits.on') and n < 6:
                if until("() => !!Wick.soft || !Visits.on", None, 6000) and js('() => !!Wick.soft'):
                    page.wait_for_timeout(450)
                    shot(f'visit-{n + 1}')
                    press(stage_point(js('() => Frame.W') / 2, 24))
                    page.wait_for_timeout(200)
                n += 1
            if js("() => !Visits.on && Save.state.guide.visits.items === 'seen'"):
                ran('visit')
            else:
                problems.append(f"Wick's visit after Show me did not finish: now {where()}")
            tap('.tx-back', None, "() => App.current === 'home'")

        steps = []
        while js('() => FirstSession.on') and time.time() < t_end:
            if not until(WICK_UP, None, 60000):
                problems.append(f"Wick's step after {steps[-1] if steps else 'the title'} never came: now {where()}")
                break
            if not js('() => FirstSession.on'):
                break
            sid = js('() => FirstSession.step')
            if sid in UNFORCED and not js(WICK_NOW):
                # the unforced 1-2: Set out glows (a soft step), and the player sets out; on the road a soft line, and
                # the card's Set out; the battle plays on its own, and its results bring the next forced step
                page.wait_for_timeout(450)
                steps.append(sid)
                shot('wick-' + sid)
                if sid == 'setout2':
                    until("() => !!Wick.soft && Wick.soft.root.classList.contains('in')", None, 5000)  # Set out glows
                    page.wait_for_timeout(400)
                    press(js(f"() => ({MID})('[data-tut=hearth-setout]')"))
                    if not until(ROAD_STILL, None, 15000):
                        problems.append(f"Set out in the unforced 1-2 did not fly up the road: now {where()}")
                        break
                    if until("() => FirstSession.step === 'yours' && !!Wick.soft", None, 3000):
                        page.wait_for_timeout(450)
                        steps.append('yours')
                        shot('wick-yours')
                press(js(f"() => ({MID})('[data-tut=road-go]')"))
                if not until(IN_BATTLE, None, 8000):
                    problems.append(f"the road's Set out in the unforced 1-2 did not start 1-2: now {where()}")
                    break
                until("() => !" + json.dumps(UNFORCED) + ".includes(FirstSession.step)", None, 3000)
                continue
            page.wait_for_timeout(450)  # it has risen and settled on what it lights (a tap sooner is taken for a stray one)
            w = js(WICK_NOW)
            if not w:
                continue
            sid = w['step']
            steps.append(sid)
            shot('wick-' + sid)
            if sid == 'name':
                press(js(f"() => ({MID})('.wk-name input')"))
                page.keyboard.type('Roflz')
                press(js(f"() => ({MID})('[data-tut=name-ok]')"))
            elif sid in ('pick', 'hire'):
                if board(a.hero if sid == 'pick' else 'pilgrim') and sid == 'pick':
                    ran('pick')
            elif sid == 'place':
                fresh = js("() => Save.state.roster.find(c => !Save.state.party.includes(c.id)).id")
                d0 = js(f"() => {{ const b = Frame.box(document.querySelector('.fm-port[data-id=\"{fresh}\"] .fm-pf'), document.getElementById('stage')); return [b.left + b.width / 2, b.top + b.height / 2]; }}")
                to = js("() => { const h = document.querySelector('#wk .wk-hand'); return [parseFloat(h.style.left) + 6 + parseFloat(h.style.getPropertyValue('--dx')), parseFloat(h.style.top) + 4 + parseFloat(h.style.getPropertyValue('--dy'))]; }")
                drag(d0, to)
            elif sid == 'speed':
                press(js(f"() => ({MID})('[data-tut=battle-speed]')"))
            elif sid == 'spend':
                press(js(f"() => ({MID})('[data-tut=hero-plus-pow]')"))  # + on a stat, after Spend (Done is the next step)
            elif sid == 'stats':
                # the stats: a tap on two (each shows its tooltip), then Next in Wick's bubble
                for k in ('hp', 'pow'):
                    press(js(f"() => ({MID})('[data-tut=hero-stat-{k}]')"))
                    page.wait_for_timeout(350)
                press(js(f"() => ({MID})('[data-tut=wick-next]')"))
            elif sid == 'drag':
                # the buildings view: a drag round the camp, inside the lit part of the scene, still before letting go
                W = js('() => Frame.W')
                drag((W - 270, 250), (130, 250), steps=24, lift=False)
            elif w['tap'] == 'any':
                press(stage_point(js('() => Frame.W') / 2, 60))
            else:
                press(w['hole'])
            if not until("prev => !FirstSession.on || FirstSession.step !== prev || !Wick.step", sid, 15000):
                problems.append(f"Wick's step {sid} did not go on after its tap: now {where()}")
                break
        if js('() => !FirstSession.on && Save.state.guide.done'):
            ran('guide')
        else:
            problems.append(f"Wick's first session did not finish: {len(steps)} steps, the last {steps[-1] if steps else None}")
            t_end = time.time()  # the road can't be played past a session stuck at the Hearth
        print(f"Wick's first session: {len(steps)} forced steps ({', '.join(steps)})")
        until(VIEW_STILL, 'party', 10000)
        shot('camp')

        trips, last_fr, still, battles = 0, -1, 0, 0
        at = {}  # trips set out with each stage as the frontier: where a run spent them
        while time.time() < t_end:
            st = state()
            if st['fr'] >= st['n']:
                break
            if a.quick and all(f in done for f in FLOWS):
                break
            at[st['fr']] = at.get(st['fr'], 0) + 1
            if st['fr'] == last_fr:
                still += 1
            else:
                still, last_fr = 0, st['fr']
            if still > 40:
                problems.append(f"the road stopped at stage {st['fr'] + 1} for 40 trips")
                break
            # Wick's card, if a first clear has just opened something
            card()
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
            # gear, as the hero screen's Auto-equip would wear it (the Gear tab's button, HeroSheet.autoEquipPlan), the
            # formation first. Without it every hero fights Region I with their starting weapon, and a run stalls at a
            # wall or not as luck has it (on main too).
            js('() => { const s = Save.state, ids = s.party.filter(Boolean).concat(s.roster.map(c => c.id).filter(id => !s.party.includes(id))); for (const id of ids) { const c = Save.char(id); for (const x of HeroSheet.autoEquipPlan(c)) Items.equip(s, c, x.uid); } Save.commit(); }')
            # hire: the Recruit Board, tapped in the camp's party view (its plaque), the card of a class the party lacks
            # (the cheapest of those, as tools/playthrough.js hires), Hire
            while st['board'] and st['picks'] > 0 and st['roster'] < min(st['need'], st['cap']) and st['cheapest'] <= st['gold']:
                if not to_camp('party'):
                    break
                t = touch('.camp .cv-plq[data-id="board"]', None, "() => RecruitBoard.shown")
                if not t or not js("() => RecruitBoard.shown"):
                    problems.append(f"a tap on the Recruit Board at camp did not open it: touched {t}, now {where()}")
                    break
                # the recruit's +, then the confirmation's Hire, then the reveal (a tap goes on, back to the board)
                k = js(WANTED)
                tap(f'#sheet.board .rb-row[data-i="{k}"] [data-tut=pick-plus]', None, "() => { const b = document.querySelector('#sheet.board .rb-modal [data-tut=pick-hire]'); return !!b && !b.disabled; }", timeout=2000)
                n = st['roster']
                if not tap('#sheet.board .rb-modal [data-tut=pick-hire]', None, 'n => Save.state.roster.length > n', n):
                    break
                page.wait_for_timeout(550)  # the reveal takes a tap only after half a second
                tap('#sheet.board [data-tut=pick-reveal]', None, "() => !document.querySelector('#sheet.board .rb-reveal')", timeout=2000)
                tap('#sheet.board .rb-x', None, '() => !RecruitBoard.shown', timeout=2000)
                ran('hire')
                shot('hired')
                st = state()
            # build: turn the camp to the buildings view, tap an empty plot, pick, Build the …
            if st['build'] and to_camp('build'):
                t = touch('.camp .cv-plq.empty', None, "() => !!document.querySelector('#sheet:not([hidden]) .buildbox')", timeout=3000)
                if t and js("() => !!document.querySelector('#sheet:not([hidden]) .buildbox')"):
                    tap('.buildbox .opt', None, settle=50)
                    if tap('.buildbox .btn.primary', '^Build the', "() => !document.querySelector('#sheet:not([hidden]) .buildbox')"):
                        ran('build')
                        shot('built')
                    else:
                        tap('.sheet-x', None, "() => document.getElementById('sheet').hidden")
                else:
                    problems.append(f'a tap on an empty plot at camp did not open its build sheet: touched {t}, now {where()}')
                    shot('missed-plot')
                    tap('.sheet-x', None, "() => document.getElementById('sheet').hidden")
            # the road view: the first trip by the camp's Set out, after that a tap on the road in the camp's scene; the
            # camera flies up the road to the frontier with its card open. Its Set out, or after two losses there, a
            # step back down the road (↓) and Farm.
            to_camp('party')
            card()
            if trips == 0:
                if not tap('.camp [data-tut=hearth-setout]', None, ROAD_STILL):
                    problems.append(f"no Set out at the Hearth, or no flight up the road after it: now {where()}")
            else:
                pt = road_point()
                if pt:
                    page.touchscreen.tap(pt[0], pt[1])
                    until(ROAD_STILL)
            on_road = js("() => !!(Camp.scene && Camp.scene.onRoad && Camp.scene.out.road === 1)")
            front = js("() => { const fr = Campaign.frontier(); return Camp.scene.sel === STAGES.filter(x => x.region === STAGES[fr].region).indexOf(STAGES[fr]); }") if on_road else False
            if not on_road or not front:
                problems.append(f"{'the Hearth' + chr(39) + 's Set out' if trips == 0 else 'a tap on the road at camp'} did not fly up the road to the frontier: now {where()}, on the road {on_road}")
                shot('missed-road')
                if not on_road:
                    tap('.camp [data-tut=hearth-setout]', None, ROAD_STILL)
            elif trips == 0:
                ran('set out')
            if trips < 2:
                shot('road')
            # the walk between battles is instant once the guide has pointed at it
            js("() => { __test.fastWalk = Guide.seen('c:walk'); }")
            farm = js('() => window.__lost >= 2 && Campaign.frontier() % 18 > 0')
            if farm:
                page.keyboard.press('ArrowDown')
                until("() => /^Farm$/.test((document.querySelector('.cv-roadgo') || {}).textContent || '')")
                if tap('.cv-roadgo', '^Farm$', IN_BATTLE, timeout=8000):
                    js('() => { window.__lost = 1; }')
                else:
                    problems.append(f"no Farm a stage back from {st['fr'] + 1}")
                    farm = False
            if not farm and not tap('.cv-roadgo', '^Set out$', IN_BATTLE, timeout=8000):
                problems.append(f"no Set out on the road at stage {st['fr'] + 1}, or no battle after it: the button says {js('() => (document.querySelector(`.cv-roadgo`) || {}).textContent')}, now {where()}")
                js("() => Camp.scene && Camp.scene.toCamp(true)")
                continue
            trips += 1
            if trips <= 2:
                shot('battle')
            # the battle speed button, to 4× (it scales the battle's last beats and the walk between battles)
            for _ in range(3):
                if js("() => Save.state.settings.speed") >= 4 or not tap('#bSpeed'):
                    break
            # the trip: Skip each battle; between battles the party walks on by itself; the results popup ends it
            for _ in range(80):
                # a battle under way, or a sheet (the results popup hides the battle's controls behind it)
                if not until(SHEET_OR_BATTLE, timeout=20000):
                    problems.append(f'no battle and no results 20 s after a battle: now {where()}')
                    break
                if js(RESULTS):
                    # a tap skips the fill; then what came home, a look at the report, and back to camp
                    tap('#sheet .rs-banner', None, '() => !Results.busy')
                    won = js("() => document.querySelector('#sheet .rs-banner b').textContent === 'Victory'")
                    js('w => { window.__lost = w ? 0 : (window.__lost || 0) + 1; }', won)
                    if tap('#sheet .rs-new.more', None, "() => !!document.querySelector('#sheet .rs-list')"):
                        news = js("() => [...document.querySelectorAll('#sheet .rs-list .newrow b')].map(b => b.textContent)")
                        tap('#sheet .rs-list .sheet-x', None, RESULTS)
                    else:
                        news = js("() => [...document.querySelectorAll('#sheet .rs-new')].map(b => b.getAttribute('aria-label'))")
                    if news:
                        js('n => __seen.news.push(...n)', news)
                        shot('news')
                    if trips <= 2:
                        shot('results')
                        if tap('#sheet .rs-b[data-tut=report]', None, "() => !!document.querySelector('#sheet:not([hidden]) .report-box')"):
                            if tap('#sheet .report-wrap > .sheet-x', None, RESULTS):
                                ran('results')
                            else:
                                problems.append('the report did not close back to the results')
                        else:
                            problems.append('Report on the results did not open the battle report')
                    if tap('#sheet .rs-b[data-tut=camp]', None, "() => App.current === 'home' && document.getElementById('sheet').hidden"):
                        ran('hearth')
                    else:
                        problems.append(f'no Hearth button on the results, or no Hearth after it: now {where()}')
                    break
                if js("() => { const b = Battle.battle; if (!b || b.counted) return false; b.counted = true; return true; }"):
                    battles += 1
                if js("() => !document.getElementById('sheet').hidden"):
                    if not tap('#sheet .sheet-x', None, "() => document.getElementById('sheet').hidden"):
                        page.wait_for_timeout(100)
                    continue
                # on the first trips, the battle plays until the guide has shown what it shows in battle
                if trips <= WATCH_TRIPS and js(WATCHING):
                    until(f"() => !Battle.busy || !({WATCHING})()", timeout=WATCH_MS)
                    if not js('() => Battle.busy'):
                        continue
                if tap('#bSkip', None, '() => !Battle.busy'):
                    ran('battle')
            if js('() => Campaign.trip() != null'):
                problems.append('a trip did not end')
                js("() => { Campaign.end({ k: 'called', text: 'test' }); App.go('map'); }")

        tap('#tabbar .tab', 'Road', settle=300)
        st = state()
        seen = js('() => window.__seen')
        shot('end')
        b.close()
    srv.shutdown()
    took = time.time() - t0
    if a.quick:
        missing = [f for f in FLOWS if f not in done]
        if missing:
            problems.append(f"in {a.minutes:g} minutes these flows never ran: {', '.join(missing)}")
    elif st['fr'] < st['n']:
        problems.append(f"stopped at stage {st['fr'] + 1} of {st['n']} after {trips} trips")
    print(f"UI play-through ({a.hero}{', quick' if a.quick else ''}): {st['cleared']} stages lit in {trips} trips, {battles} battles, {st['roster']} heroes, {st['gold']} gold, {took:.0f} s")
    print('flows:', ', '.join(f"{f} ({done[f]} s)" if f in done else f"{f} (never)" for f in FLOWS))
    print('trips at one frontier, 5 or more:', ' · '.join(f"stage {k + 1} ×{n}" for k, n in sorted(at.items()) if n >= 5) or 'none')
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
