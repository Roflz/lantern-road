"""Walks Wick's first session (js/firstsession.js, onboarding spec §6.4) from a new game in headless Chromium, through
real input, the way a player taps it, and saves a screenshot of every step.

  python tools/guide_check.py                                   # 844x390 and a phone held upright (turned)
  python tools/guide_check.py --sizes 844x390 --shots docs/screens/guide

At each step it checks that Wick's step is up with its line, that a press away from the lit thing is held back (the
screen and the step don't change), then does what the step asks: a tap anywhere for a line, a tap on the lit thing,
the name box, the first pick and the free recruit (a row, its +, Hire, the reveal and the hero's line), Grow's Spend, + and Done,
the unforced 1-2 (Set out glows, the soft line on the road, nothing held back), and the drag in Formation. On the
story's first line it opens Settings (Wick steps aside, Replay the guide does nothing, Wick comes back) and the Codex
(Help), both from the Hearth's dock; at
the turned size it then presses Skip, which goes straight to the name box, and at the other it taps every line. The
battles play at the speed Wick sets (2× after his second pause). At the end the session is done, the save holds two
heroes in the formation, 1-1 and 1-2 are cleared, the goal tracker says "Clear 1-3", and Settings → Replay the guide
shows his first line again without holding anything back. Then, in the same save, 1-3: its results' New chip, Wick's
card at the Hearth, Show me, and the soft visit to Tactics. Console errors fail the run.

  python tools/guide_check.py --resume                          # 844x390, a reload at every step (play-test note 3.6)

With --resume, at every step (and inside the board's pick and hire, after + on Grow, and during 1-2's battle) the save
as it stands, without the flush a page makes as it closes, is opened in a new page, as if the app had been closed
there and opened again: past the title, the same step must come back from its start with the screen it needs (RESUME
says which, and which step follows instead where the moment has passed), and the session must not be over.
"""
import argparse, functools, http.server, json, os, socketserver, sys, threading, time
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SIZES = '844x390,390x844t'

# The steps in order, with what each one says (its first words; "~words" for words in the middle), and how to answer it.
#   any: a tap anywhere   target: a tap on the lit thing   name, pick, hire, plus, place: special
#   soft-setout, soft-go: the unforced 1-2's soft steps (nothing held back), answered by Set out
# A step id ending in "?" may be passed over (the hero card already spending its points).
STEPS = [
    ('hello', 'Another company. Come in.', 'any'), ('inn', 'I’m Wick. I keep the inn', 'any'),
    ('king', 'Fifty years ago, the king', 'any'), ('hollow', 'So he learned to raise the dead', 'any'),
    ('wall', 'His people fled', 'any'), ('offer', 'Now the crown has an offer', 'any'),
    ('name', 'Who’s in charge?', 'name'), ('welcome', 'Roflz. Welcome to the Hearth.', 'any'),
    ('board', 'First, you’ll need heroes.', 'target'), ('pick', None, 'pick'),
    ('setout', 'The road starts at the gate. Take', 'target'), ('stage', 'Each stage is a stretch of road.', 'any'),
    ('go', 'Clear the first.', 'target'),
    ('order', 'Battles fight themselves', 'any'), ('speed', 'Speed it up', 'target'),
    ('xp', 'Your first level', 'any'), ('home', 'Back to the Hearth', 'target'),
    ('heroes', '~has a stat point. Let’s spend it.', 'target'), ('hero', None, 'target'), ('stats?', None, 'target'),
    ('spend', 'Tap + on a stat, or Auto', 'plus'), ('keep', None, 'target'), ('strong', 'Stronger already.', 'any'),
    ('heroback', None, 'target'), ('tabhome', None, 'target'),
    ('setout2', None, 'soft-setout'), ('yours', 'First stretch cleared. It’s yours now.', 'soft-go'),
    ('new', 'The Recruit Board is open', 'any'), ('home2', None, 'target'),
    ('board2', 'The board has a free recruit', 'target'), ('hire', None, 'hire'),
    ('form', 'Two of you now', 'target'), ('place', 'Sturdy heroes in front', 'place'), ('done', 'Well placed', 'target'),
    ('bye', 'The Sexton’s at the end of the Gravefields.', 'any'), ('tolls', 'The road earns tolls while you’re away.', 'any'),
    ('fire', 'I’ll be by the fire.', 'any'),
]
# --resume: what the app opened again at each moment brings back: (the step that must show, a test of the screen it
# needs). The same step, from its start, wherever it can be had again; where its moment has passed, the step the
# session carries on with (the battle resolved while the app was closed, the results popup gone, the way back to the
# Hearth already made by the load). The moments inside a step are the walk's own: pick-card (a row chosen), pick-confirm
# (its + pressed: Hire asks first), pick-reveal (hired: the reveal), spend-placed (+ pressed, not kept), battle-1-2 (1-2 under way).
HEARTH = "App.current === 'home' && !!Camp.scene && !Camp.scene.onRoad && document.getElementById('sheet').hidden"
ROAD = "!!Camp.scene && Camp.scene.onRoad && !!document.querySelector('.cv-card') && document.querySelector('.cv-card .cv-id').textContent === '{}'"
BOARD = "FirstPick.shown && !document.querySelector('#sheet .fp .rb-row.on') && !document.querySelector('#sheet .fp .rb-modal') && !document.querySelector('[data-tut=pick-reveal]')"
HERO = "App.current === 'hero' && HeroSheet.placing === 0"
SPEND = HERO + " && HeroSheet.mode === 'spend'"
FORM = "Formation.shown"
RESUME = {
    **{k: (k, HEARTH) for k in ('hello', 'inn', 'king', 'hollow', 'wall', 'offer', 'name', 'welcome', 'board', 'setout', 'heroes', 'setout2', 'board2', 'form', 'bye', 'tolls', 'fire')},
    'pick': ('pick', BOARD), 'pick-card': ('pick', BOARD), 'pick-confirm': ('pick', BOARD), 'pick-reveal': ('setout', HEARTH),
    'stage': ('stage', ROAD.format('1-1')), 'go': ('go', ROAD.format('1-1')),
    'order': ('heroes', HEARTH), 'speed': ('heroes', HEARTH), 'xp': ('heroes', HEARTH), 'home': ('heroes', HEARTH),
    'hero': ('hero', "App.current === 'party'"), 'stats': ('stats', HERO), 'spend': ('spend', SPEND), 'spend-placed': ('spend', SPEND),
    'keep': ('spend', SPEND), 'strong': ('strong', "App.current === 'hero'"),
    'heroback': ('setout2', HEARTH), 'tabhome': ('setout2', HEARTH),
    'yours': ('yours', ROAD.format('1-2')), 'battle-1-2': ('board2', HEARTH), 'new': ('board2', HEARTH), 'home2': ('board2', HEARTH),
    'hire': ('hire', BOARD), 'hire-card': ('hire', BOARD), 'hire-confirm': ('hire', BOARD), 'hire-reveal': ('form', HEARTH),
    'place': ('place', FORM + " && document.querySelectorAll('#wk .wk-call').length === 2"), 'done': ('done', FORM),
}
# Wick's visit to Tactics after 1-3's first clear (js/visits.js): his soft lines, in order
VISIT =['When an ally’s hurt, the party drinks a draught.', 'Your hero has tactics like this too.', 'Tactics run from the top.']

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


class Server(socketserver.ThreadingTCPServer):
    """A page asks for its forty-odd files at once, and --resume loads one page after another: a server that takes one
    request at a time, with room for five waiting, could drop one under load (a script missing, the title never ready)."""
    daemon_threads = True
    request_queue_size = 64


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--sizes', default=None)
    ap.add_argument('--shots', default='')
    ap.add_argument('--resume', action='store_true', help='at every step, open the save as it stands in a new page')
    a = ap.parse_args()
    a.sizes = a.sizes or ('844x390' if a.resume else SIZES)
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
                    if s and s['step'] == sid:
                        page.wait_for_timeout(450)  # it has risen, and settled on its target
                        return js('__wk()')
                    page.wait_for_timeout(100)
                return None

            def says(s, line):
                return bool(s) and (line[1:] in s['text'] if line.startswith('~') else s['text'].startswith(line))

            LINES = {sid.rstrip('?'): line for sid, line, _ in STEPS}

            def probe(moment):
                """--resume: the save as it stands (committed, not flushed) in a new page, past the title: the step
                RESUME names comes back, from its start, with its screen; the session isn't over, and nothing errs."""
                if not a.resume or moment not in RESUME:
                    return
                want, screen = RESUME[moment]
                dump = js("JSON.stringify(Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)])))")
                c2 = b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=1, is_mobile=touch, has_touch=touch)
                # the save as it stands, laid down before each boot of the probe's page (it only navigates to boot)
                c2.add_init_script("(() => { const d = JSON.parse(%s); localStorage.clear(); for (const k in d) localStorage.setItem(k, d[k]); })()" % json.dumps(dump))
                p2, errs = c2.new_page(), []
                p2.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
                p2.on('pageerror', lambda e: errs.append(str(e)))
                try:
                    for attempt in (1, 2):  # a page that failed to boot (a file the busy machine didn't serve) gets one more go
                        try:
                            p2.goto(f'http://127.0.0.1:{port}/index.html')
                            p2.wait_for_function("(() => { try { return typeof Title !== 'undefined' && Title.ready; } catch (e) { return false; } })()", timeout=30000, polling=50)
                            break
                        except Exception as e:
                            if attempt == 2:
                                raise
                            print(f'    (the page for {moment} did not boot: {str(e).splitlines()[0]}; once more)')
                            errs.clear()
                    p2.click('#title')
                    p2.evaluate(HELPERS)
                    got, t0 = None, time.time()
                    while time.time() - t0 < 15:
                        got = p2.evaluate('__wk()')
                        if got and got['step'] == want and p2.evaluate(f'!!({screen})'):
                            break
                        p2.wait_for_timeout(150)
                    ok = bool(got) and got['step'] == want and p2.evaluate(f'!!({screen})')
                    line = LINES.get(want)
                    ok_line = not line or says(got, line)
                    over = p2.evaluate('Save.state.guide.done')
                    check(ok and ok_line and not over and not errs,
                          f'  opened again at {moment}: {want}' + (' (the same step)' if want == moment else '') + ' comes back from its start, with its screen'
                          + ('' if ok and ok_line and not over and not errs else f' (got {got}, screen {p2.evaluate(f"!!({screen})")}, {p2.evaluate("__state()")}, done {over}, errors {errs[:2]})'))
                    if a.shots and ok:
                        p2.screenshot(path=os.path.join(a.shots, f'resume-{moment}-{w}x{h}.png'))
                finally:
                    c2.close()

            def aside(what, open_sel, page_sel, close):
                """Help or Settings on a forced step: it opens, Wick steps aside and nothing is held back; it closes,
                and the same step is back."""
                before = js('__wk()')
                press(js(f"__mid('{open_sel}')"), 500)
                page.wait_for_timeout(300)
                hidden = js("getComputedStyle(document.getElementById('wk')).display === 'none'")
                check(js(f"!!document.querySelector('{page_sel}')") and hidden and js('Wick.step && !Wick.step.closed') is True, f'  {what} opens over the step, and Wick steps aside')
                shot(what.lower())
                close()
                page.wait_for_timeout(500)
                after = js('__wk()')
                check(bool(after) and after['step'] == before['step'] and js("getComputedStyle(document.getElementById('wk')).display") != 'none', f'  {what} closes, and Wick is back on the same step')

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
            broke = skipped = False
            for sid, line, how in STEPS:
                if skipped and sid in ('inn', 'king', 'hollow', 'wall', 'offer'):
                    continue
                if sid.endswith('?'):
                    sid = sid[:-1]
                    if not js(f"FirstSession.step === '{sid}'"):
                        continue
                s = wait_step(sid, 120 if sid == 'new' else 40)
                if not check(bool(s), f'step {sid} is up'):
                    print('    state:', js('__state()'))
                    broke = True
                    break
                if line:
                    check(says(s, line), f'  Wick says “{line.lstrip("~")}…”' + ('' if says(s, line) else f' (got “{s["text"]}”)'))
                shot(sid)
                probe(sid)
                if sid == 'hello':
                    # Help and Settings at every step (play-test note 2.2), and Replay the guide does no harm
                    def close_settings():
                        press(js("__mid('#sheet .setbox [data-tut=x], #sheet .setbox .sheet-x')"), 400)
                    def replay_and_close():
                        js("(() => { const b = [...document.querySelectorAll('#sheet .setbox .btn')].find(x => /^Replay the guide/.test(x.textContent)); if (b) b.scrollIntoView({ block: 'center' }); })()")
                        page.wait_for_timeout(250)
                        b = js("(() => { const b = [...document.querySelectorAll('#sheet .setbox .btn')].find(x => /^Replay the guide/.test(x.textContent)); return b ? __mid(b) : null; })()")
                        press(b, 500)
                        check(js("document.getElementById('sheet').hidden") and js('Save.state.guide.replay') is None and any('showing you round already' in t for t in js("[...document.querySelectorAll('#toasts .toast')].map(t => t.textContent)")),
                              '  Replay the guide closes Settings, and does nothing while the session runs (“Wick is showing you round already”)')
                    aside('Settings', '.camp [data-tut=hearth-settings]', '#sheet:not([hidden]) .setbox', replay_and_close)
                    aside('Codex', '.camp [data-tut=hearth-codex]', '#screen:not([hidden]) .page.how', lambda: press(js("__mid('#screen .page.how .back')"), 400))
                    s = js('__wk()')
                    if touch:
                        # the story's Skip, in the panel's corner: straight to the name box (the other size taps through)
                        press(js("__mid('#wk .wk-skip')"), 400)
                        t0 = time.time()
                        while time.time() - t0 < 5 and js('FirstSession.step') != 'name':
                            page.wait_for_timeout(100)
                        check(js('FirstSession.step') == 'name', '  Skip jumps to the name box')
                        skipped = True
                        continue
                # a press away from what's lit is held back
                if how in ('target', 'pick', 'hire', 'place', 'name', 'plus'):
                    before = js('__state()')
                    cands = [at(24, 200), at(W - 24, 200), at(W / 2, 24)]
                    hx = s['hole'] or at(W / 2, 200)
                    far = max(cands, key=lambda c: abs(c[0] - hx[0]) + abs(c[1] - hx[1]))
                    press(far, 250)
                    after = js('__state()')
                    check(after == before, '  a press elsewhere is held back')
                if how == 'any':
                    press(anywhere())
                elif how in ('soft-setout', 'soft-go'):
                    # the unforced 1-2: a soft step, and nothing is held back
                    check(s['soft'] and js('!Wick.held && !Wick.step'), '  a soft step: nothing is held back')
                    if how == 'soft-setout':
                        goal = js("document.querySelector('.camp .cv-gt').textContent")
                        check(goal == 'Clear 1-2', f'  the goal tracker says “Clear 1-2” (got “{goal}”)')
                        press(js("__mid('[data-tut=hearth-setout]')"), 600)
                        check(js('!!(Camp.scene && Camp.scene.onRoad)'), '  Set out (pressed by the player) flies up the road')
                    else:
                        press(js("__mid('[data-tut=road-go]')"), 900)
                        check(js("App.current") == 'battle', '  the card’s Set out (pressed by the player) starts 1-2')
                        page.wait_for_timeout(1500)
                        check(js('!Battle.paused && !Wick.step'), '  1-2 plays on: nothing stops it')
                        probe('battle-1-2')
                elif how == 'plus':
                    press(js("__mid('[data-tut=hero-plus-pow]')"), 400)
                    check(js('HeroSheet.placing') == 1, '  + places a point (Done comes next)')
                    probe('spend-placed')
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
                    probe(how + '-card')
                    # its +: Hire asks first (the recruit, Free, Cancel and Hire)
                    press(js(f"__mid(document.querySelectorAll('#sheet .fp [data-tut=pick-plus]')[{k}])"), 400)
                    check(js("(() => { const h = document.querySelector('#sheet .fp .rb-modal [data-tut=pick-hire]'); return !!h && !h.disabled; })()"), '  its +: Hire asks first')
                    shot(how + '-confirm')
                    probe(how + '-confirm')
                    press(js("__mid('[data-tut=pick-hire]')"), 700)
                    check(js("!!document.querySelector('[data-tut=pick-reveal]')"), '  Hire: the reveal')
                    page.wait_for_timeout(900)  # the hero's line rises
                    said = js("(() => { const e = document.querySelector('[data-tut=pick-says]'); return e ? e.textContent : ''; })()")
                    check(said == js(f"SIGN_ON['{want}']"), f'  the {want} says why they signed on: “{said}”')
                    shot(how + '-reveal')
                    probe(how + '-reveal')
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
            if broke:
                ctx.close()
                continue
            check(js('Save.state.guide.done') is True, 'the session is done')
            check(js("Save.state.campaign.cleared.slice(0, 2).join()") == '1-1,1-2', '1-1 and 1-2 are cleared')
            check(js('Save.state.party.filter(Boolean).length') == 2, 'two heroes in the formation')
            check(js("Guide.seen('stat') && !Guide.seen('c:rule')"), 'the stat-point tip is marked seen (Grow said it); the turn order’s tactic still has its coach mark to come')
            page.wait_for_timeout(600)
            check(js('!Wick.held'), 'nothing is held back after it')
            goal = js("document.querySelector('.camp .cv-gt').textContent")
            check(goal == 'Clear 1-3', f'the goal tracker takes over: “{goal}”')
            check(js('Base.tollRate(Save.state)') == 2 * js('BASE.TOLL'), 'the road earns tolls for its two cleared stages')
            shot('after')
            # Settings → Replay the guide: his first line again, held back from nothing
            js("FirstSession.replay()")
            t0 = time.time()
            while time.time() - t0 < 6 and not (js('__wk()') or {}).get('soft'):
                page.wait_for_timeout(100)
            page.wait_for_timeout(400)
            s = js('__wk()')
            ok = bool(s) and s['soft']
            check(ok and s['text'].startswith('Another company'), 'Replay the guide: his first line again, as a soft step')
            check(js('!Wick.held && !Wick.step'), '  nothing is held back')
            if ok:
                shot('replay')
            # (a press would go through to the scene behind, and the road is there: the replay ends here instead)
            js("Save.state.guide.replay = null; Save.commit(); Wick.hide(); 'ok'")
            page.wait_for_timeout(400)

            # ── 1-3's first clear: the New chip, Wick's card at the Hearth, Show me, and the soft visit to Tactics
            def wait(cond, what, timeout=15000):
                try:
                    page.wait_for_function(cond, timeout=timeout, polling=100)
                    return True
                except Exception:
                    check(False, f'{what} (now {js("__state()")}, Wick {js("__wk()")})')
                    if a.shots:
                        shot('missed')
                    return False

            js("Proto.train(2); Proto.restAll(); Save.commit(); App.refresh(); 'ok'")  # a sure win, so the walk stays about the guide
            page.wait_for_timeout(500)
            press(js("__mid('[data-tut=hearth-setout]')"), 400)
            if not wait("(() => { const b = document.querySelector('[data-tut=road-go]'); return !!(Camp.scene && Camp.scene.road > 0.99 && b && b.offsetWidth); })()", 'Set out at the Hearth flies up the road to 1-3'):
                ctx.close()
                continue
            page.wait_for_timeout(400)
            press(js("__mid('[data-tut=road-go]')"), 1200)
            press(js("__mid('#bSkip')"), 400)
            if not wait("!!document.querySelector('#sheet.results:not([hidden]) .rs-box')", '1-3 is fought, and its results come up', 20000):
                ctx.close()
                continue
            press(js("__mid('#sheet .rs-banner')"), 600)  # the bars, filled at once
            chip = js("(() => { const c = document.querySelector('#sheet [data-tut=new]'); return c ? c.textContent : ''; })()")
            check('Party items' in chip, f'1-3’s results: “New: Party items” (got “{chip}”)')
            shot('visit-new')
            press(js("__mid('#sheet [data-tut=camp]')"), 400)
            t0 = time.time()
            while time.time() - t0 < 15 and not js("Visits.card"):
                page.wait_for_timeout(100)
            page.wait_for_timeout(450)
            check(js('Visits.card') and 'Party items' in js("document.querySelector('#wk .wk-card').textContent"), 'back at the Hearth: Wick’s card, “Party items”, with Show me and Later')
            before = js('App.current')
            press(at(24, 200), 300)
            check(js('Visits.card') and js('App.current') == before, '  a press elsewhere is held back')
            shot('visit-card')
            press(js("__mid('[data-tut=visit-show]')"), 600)
            check(js("App.current") == 'tactics' and js("TacticsEditor.owner") == 'party', 'Show me: the Tactics screen, on the party')
            for k, line in enumerate(VISIT):
                t0 = time.time()
                while time.time() - t0 < 8 and not ((js('__wk()') or {}).get('soft') and js('Visits.step') == k):
                    page.wait_for_timeout(100)
                page.wait_for_timeout(450)
                s = js('__wk()')
                ok = bool(s) and s['soft'] and s['text'].startswith(line)
                check(ok, f'  visit step {k + 1}, a soft step: “{line}…”' + ('' if ok else f' (got {s})'))
                if k == 1:
                    check(js('TacticsEditor.owner') == js('Save.state.party.find(Boolean)'), '  on the hero’s own tactics')
                shot(f'visit-{k + 1}')
                press(at(W / 2, 24), 500)  # a press anywhere goes on
            page.wait_for_timeout(600)
            check(not js('Visits.on') and js("Save.state.guide.visits.items") == 'seen' and js("Guide.seen('c:tactics')"), 'the visit is over: seen, and the Tactics coach mark it said is marked seen')
            check(js("App.current") == 'tactics' and not js('Wick.held'), 'nothing is held back after it')
            ctx.close()
        b.close()
    srv.shutdown()
    for e in errors:
        print('  console:', e)
    print(f'{len(fails)} failed' + (f', {len(errors)} console errors' if errors else ''))
    sys.exit(1 if fails or errors else 0)


if __name__ == '__main__':
    main()
