"""Walks Wick's first session (js/firstsession.js, docs/first-session-spec.md) from a new game in headless Chromium,
through real input, the way a player taps it, and saves a screenshot of every step.

  python tools/guide_check.py                                   # 844x390 and a phone held upright (turned)
  python tools/guide_check.py --sizes 844x390 --shots docs/screens/guide

At each step it checks that Wick's step is up with its line (Bess's, in her bubble, on her panel), that a press away
from the lit thing is held back (the screen and the step don't change), then does what the step asks: a tap anywhere
for a line, a tap on the lit thing, the name box, the first pick and the paid hire (a row, its +, Hire, the reveal and
the hero's line; the hire's price comes off the purse), the stats (a tap on two, each with its tooltip, then Next),
Spend's + and Done, the gear (a slot, the new piece, Wear), the drag in Formation, the directed 1-2 (Set out glows, the
soft line on the road, nothing held back), the drag round the camp to the buildings view, a plot's No plans, Bess's
cart and her panel (Accept). On the story's first line it opens Settings (Wick steps aside, Wick's lessons do nothing
while the session runs, Wick comes back) and the Codex (Help), both from the Hearth's dock; at the turned size it then
presses Skip, which goes straight to the name box, and at the other it taps every line. The battles play at the speed
Wick sets. At the end the session is done, the save holds two heroes in the formation, 1-1 and 1-2 are cleared, the
buildings view is open with nothing to build, Bess's quest is on, the goal tracker says "Clear 1-3" with "The Sexton"
under it, and a tap on Wick at the fire opens his menu (a hint, the nine lessons, the Codex), whose Gear lesson replays
its lines on the hero card without holding anything back; Settings → Wick's lessons opens it too. Then, in the same
save: 1-3's New chip, Wick's card, Show me and the soft visit to Tactics; a hero at level 5 and the Skill points visit;
and the first "While you were away" with tolls, which has Wick's line on them. Console errors fail the run.

  python tools/guide_check.py --resume                          # 844x390, a reload at every step (play-test note 3.6)

With --resume, at every step (and inside the board's pick and hire, after the stats' taps, after + on Spend, and during
1-2's battle) the save as it stands, without the flush a page makes as it closes, is opened in a new page, as if the
app had been closed there and opened again: past the title, the step RESUME names must come back from its start with
the screen it needs (the same step where it can be had again, else the Hearth step its part starts from, as the spec's
"Resume at" column says), and the session must not be over.
"""
import argparse, functools, http.server, json, os, socketserver, sys, threading, time
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SIZES = '844x390,390x844t'

# The steps in order, with what each one says (its first words; "~words" for words in the middle), and how to answer it.
#   any: a tap anywhere   target: a tap on the lit thing   name, pick, hire, stats, plus, place, drag: special
#   soft-setout, soft-go: the directed 1-2's soft steps (nothing held back), answered by Set out
#   bess: a line of Bess's (in her bubble), a tap anywhere
STEPS = [
    ('hello', 'Another company. Come in.', 'any'), ('inn', 'I’m Wick. I keep the inn', 'any'),
    ('king', 'Fifty years ago, the king', 'any'), ('hollow', 'So he learned to raise the dead', 'any'),
    ('wall', 'His people fled', 'any'), ('offer', 'Now the crown has an offer', 'any'),
    ('name', 'Who’s in charge?', 'name'), ('welcome', 'Roflz. Welcome to the Hearth.', 'any'),
    ('board', 'First, you’ll need heroes.', 'target'), ('pick', None, 'pick'),
    ('setout', 'The road starts at the gate. Take', 'target'), ('stage', 'Each stage is a stretch of road.', 'any'),
    ('go', 'Clear the first.', 'target'),
    ('order', 'Battles fight themselves. The turn order shows who acts now', 'any'), ('speed', 'Speed it up', 'target'),
    ('xp', 'Your first level. Each one makes them stronger.', 'any'), ('loot', 'Gear, off the road. We’ll put it on.', 'any'),
    ('home', 'Back to the Hearth', 'target'),
    ('heroes', '~has a stat point. Let’s spend it.', 'target'), ('hero', None, 'target'),
    ('stats', 'Each level brings a stat point. Tap a stat to hear what it does.', 'stats'),
    ('spendbtn', None, 'target'), ('spend', 'Tap + on the one you want, or Auto.', 'plus'), ('keep', None, 'target'),
    ('strong', 'Stronger already.', 'any'), ('later', 'Keep levelling. Bigger rewards come later.', 'any'),
    ('weapon', 'Now the gear you found. Weapon first.', 'target'), ('pickw', 'Wear it. Watch the numbers.', 'target'),
    ('wearw', None, 'target'), ('worn', 'Every piece changes their numbers, and their look.', 'any'),
    ('armor', 'Now the armour.', 'target'), ('picka', None, 'target'), ('weara', None, 'target'),
    ('worna', 'Weapon, armour, accessory. Some pieces cost as much as they give.', 'any'),
    ('heroback', None, 'target'), ('tabhome', None, 'target'),
    ('board2', 'One hero won’t clear the road. The board has more.', 'target'), ('hire', None, 'hire'),
    ('form', 'Two of you now', 'target'), ('place', 'Sturdy heroes in front', 'place'), ('done', 'Well placed', 'target'),
    ('setout2', None, 'soft-setout'), ('yours', 'First stretch cleared. It’s yours now.', 'soft-go'), ('home2', None, 'target'),
    ('drag', 'Companies that stay, build. Drag to look round the camp.', 'drag'),
    ('plots', 'Each plot takes one building. It needs gold, bone dust and a plan.', 'target'),
    ('noplans', 'No plans yet. I know someone who can help.', 'any'),
    ('bess', 'That’s Bess. She drives the carts on your road. Hear her out.', 'target'),
    ('offer1', None, 'bess'), ('offer2', None, 'bess'), ('accept', None, 'target'), ('thanks1', None, 'bess'), ('thanks2', None, 'bess'),
    ('bye1', 'That’s the job. The rest is up to you.', 'any'), ('bye2', 'Not everything’s open yet. The road opens it.', 'any'),
    ('bye3', 'Fight, level up, hire more hands. That’s the work.', 'any'), ('bye4', 'Questions? I’ll be by the fire.', 'any'),
]
# Bess's lines on her panel (js/quests.js, BESS_LINES)
BESS = {'offer1': 'Folk want to use your road.', 'offer2': 'Something past the graves keeps digging up the dead.',
        'thanks1': 'Stop it, and the travellers will make it worth your while.', 'thanks2': 'I’ll have smaller jobs most days, too.'}
# --resume: what the app opened again at each moment brings back: (the step that must show, a test of the screen it
# needs[, its line where it isn't the step's own]). The same step, from its start, wherever it can be had again; else
# the Hearth step its part starts from (the spec's "Resume at"), or the step the session carries on with where the moment
# has passed (a battle resolved while the app was closed, a point spent, a piece worn). The moments inside a step are the
# walk's own: pick-card (a row chosen), pick-confirm (its + pressed: Hire asks first), pick-reveal (hired: the reveal),
# stats-tapped (two stats tapped), spend-placed (+ pressed, not kept), battle-1-2 (1-2 under way).
HEARTH = "App.current === 'home' && !!Camp.scene && !Camp.scene.onRoad && document.getElementById('sheet').hidden"
BOARD = "FirstPick.shown && !document.querySelector('#sheet .fp .rb-row.on') && !document.querySelector('#sheet .fp .rb-modal') && !document.querySelector('[data-tut=pick-reveal]')"
PANEL = "Quests.shown && !!document.querySelector('[data-tut=quest-card]')"
GEAR = '~new gear is waiting. Let’s put it on.'
RESUME = {
    **{k: (k, HEARTH) for k in ('hello', 'inn', 'king', 'hollow', 'wall', 'offer', 'name', 'welcome', 'board', 'setout', 'heroes', 'board2', 'form', 'setout2', 'drag', 'bess', 'bye1', 'bye2', 'bye3', 'bye4')},
    'pick': ('pick', BOARD), 'pick-card': ('pick', BOARD), 'pick-confirm': ('pick', BOARD), 'pick-reveal': ('setout', HEARTH),
    'stage': ('setout', HEARTH), 'go': ('setout', HEARTH),
    'order': ('heroes', HEARTH), 'speed': ('heroes', HEARTH), 'xp': ('heroes', HEARTH), 'loot': ('heroes', HEARTH), 'home': ('heroes', HEARTH),
    'hero': ('heroes', HEARTH), 'stats': ('heroes', HEARTH), 'stats-tapped': ('heroes', HEARTH), 'spendbtn': ('heroes', HEARTH),
    'spend': ('heroes', HEARTH), 'spend-placed': ('heroes', HEARTH), 'keep': ('heroes', HEARTH),
    'strong': ('heroes', HEARTH, GEAR), 'later': ('heroes', HEARTH, GEAR), 'weapon': ('heroes', HEARTH, GEAR), 'pickw': ('heroes', HEARTH, GEAR),
    'wearw': ('heroes', HEARTH, GEAR), 'worn': ('heroes', HEARTH, GEAR), 'armor': ('heroes', HEARTH, GEAR), 'picka': ('heroes', HEARTH, GEAR),
    'weara': ('heroes', HEARTH, GEAR), 'worna': ('board2', HEARTH), 'heroback': ('board2', HEARTH), 'tabhome': ('board2', HEARTH),
    'hire': ('board2', HEARTH), 'hire-card': ('board2', HEARTH), 'hire-confirm': ('board2', HEARTH), 'hire-reveal': ('form', HEARTH),
    'place': ('form', HEARTH), 'done': ('setout2', HEARTH),
    'yours': ('setout2', HEARTH), 'battle-1-2': ('drag', HEARTH), 'home2': ('drag', HEARTH),
    'plots': ('drag', HEARTH), 'noplans': ('drag', HEARTH),
    'offer1': ('offer1', PANEL), 'offer2': ('offer2', PANEL), 'accept': ('accept', PANEL), 'thanks1': ('bye1', HEARTH), 'thanks2': ('bye1', HEARTH),
}
# Wick's visit to Tactics after 1-3's first clear (js/visits.js): his soft lines, in order; and to a hero's skills
VISIT = ['When an ally’s hurt, the party drinks a draught.', 'Your hero has tactics like this too.', 'Tactics run from the top.']
SKILLS = ['A skill point. Learn a new skill, or sharpen one.', 'Equip it here. Up to two at once.']

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
window.__state = () => ({ screen: App.current, road: !!(Camp.scene && Camp.scene.onRoad), view: Camp.scene ? Math.round(Camp.scene.w * 100) / 100 : null, sheet: document.getElementById('sheet').hidden ? '' : document.getElementById('sheet').className, step: FirstSession.step });
// a thing the camp's scene draws, as a point on the client: its anchor's box's middle
window.__scene = id => { const a = Camp.scene && Camp.scene.out.anchors.find(q => q.id === id); if (!a || !a.box) return null; const o = Frame.box(document.querySelector('.camp'), document.getElementById('stage')); return __toClient(o.left + (a.box[0] + a.box[2]), o.top + (a.box[1] + a.box[3])); };
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

            LINES = {sid: line for sid, line, _ in STEPS}

            def probe(moment):
                """--resume: the save as it stands (committed, not flushed) in a new page, past the title: the step
                RESUME names comes back, from its start, with its screen; the session isn't over, and nothing errs."""
                if not a.resume or moment not in RESUME:
                    return
                want, screen = RESUME[moment][:2]
                line = RESUME[moment][2] if len(RESUME[moment]) > 2 else LINES.get(want)
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

            def drag(d0, d1, steps=14, lift=True):
                """A finger (or the mouse) from one point to another, in design pixels: up first (lift), so a drag from
                the roster lifts the hero rather than scrolling the strip (in a turned frame too); without it, straight."""
                pre = [(d0[0], d0[1]), (d0[0], d0[1] - 14)] if lift else [(d0[0], d0[1])]
                y0 = d0[1] - 14 if lift else d0[1]
                pts = pre + [(d0[0] + (d1[0] - d0[0]) * i / steps, y0 + (d1[1] - y0) * i / steps) for i in range(1, steps + 1)]
                pts = [at(*q) for q in pts]
                if touch:
                    cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': pts[0][0], 'y': pts[0][1]}]})
                    for q in pts[1:]:
                        cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': q[0], 'y': q[1]}]})
                        page.wait_for_timeout(16)
                    page.wait_for_timeout(120 if lift else 250)
                    cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
                else:
                    page.mouse.move(*pts[0]); page.mouse.down()
                    for q in pts[1:]:
                        page.mouse.move(*q); page.wait_for_timeout(16)
                    if not lift:
                        page.wait_for_timeout(250)  # still before letting go: no flick
                    page.mouse.up()
                page.wait_for_timeout(400)

            def bess_says():
                return js("(() => { const e = document.querySelector('.qs-say span'); return e ? e.textContent : ''; })()")

            # a neutral point for "tap anywhere", clear of anything lit: the stage's top middle
            W = js('Frame.W')
            anywhere = lambda: at(W / 2, 70)
            broke = skipped = False
            gold = {}
            for sid, line, how in STEPS:
                if skipped and sid in ('inn', 'king', 'hollow', 'wall', 'offer'):
                    continue
                s = wait_step(sid, 120 if sid in ('home2', 'bess') else 40)
                if not check(bool(s), f'step {sid} is up'):
                    print('    state:', js('__state()'))
                    broke = True
                    break
                if line:
                    check(says(s, line), f'  Wick says “{line.lstrip("~")}…”' + ('' if says(s, line) else f' (got “{s["text"]}”)'))
                if sid in BESS:
                    said = bess_says()
                    check(said.startswith(BESS[sid]) and not s['text'], f'  Bess says “{BESS[sid]}…” (got “{said}”)')
                shot(sid)
                probe(sid)
                if sid == 'hello':
                    # Help and Settings at every step (play-test note 2.2), and Wick's lessons do no harm
                    def lessons_and_close():
                        js("(() => { const b = [...document.querySelectorAll('#sheet .setbox .btn')].find(x => /^Wick’s lessons/.test(x.textContent)); if (b) b.scrollIntoView({ block: 'center' }); })()")
                        page.wait_for_timeout(250)
                        b = js("(() => { const b = [...document.querySelectorAll('#sheet .setbox .btn')].find(x => /^Wick’s lessons/.test(x.textContent)); return b ? __mid(b) : null; })()")
                        press(b, 500)
                        check(js("document.getElementById('sheet').hidden") and not js('WickMenu.shown') and any('showing you round already' in t for t in js("[...document.querySelectorAll('#toasts .toast')].map(t => t.textContent)")),
                              '  Wick’s lessons close Settings, and do nothing while the session runs (“Wick is showing you round already”)')
                    aside('Settings', '.camp [data-tut=hearth-settings]', '#sheet:not([hidden]) .setbox', lessons_and_close)
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
                if how in ('target', 'pick', 'hire', 'place', 'name', 'plus', 'stats', 'drag'):
                    before = js('__state()')
                    cands = [at(24, 200), at(W - 24, 200), at(W / 2, 24)]
                    hx = s['hole'] or at(W / 2, 200)
                    far = max(cands, key=lambda c: abs(c[0] - hx[0]) + abs(c[1] - hx[1]))
                    press(far, 250)
                    after = js('__state()')
                    check(after == before, '  a press elsewhere is held back')
                if how in ('any', 'bess'):
                    press(anywhere())
                    if sid == 'thanks2':
                        page.wait_for_timeout(400)
                        check(not js('Quests.shown'), '  her panel closes')
                elif how in ('soft-setout', 'soft-go'):
                    # the directed 1-2: a soft step, and nothing is held back
                    check(s['soft'] and js('!Wick.held && !Wick.step'), '  a soft step: nothing is held back')
                    if how == 'soft-setout':
                        goal = js("document.querySelector('.camp .cv-gt').textContent")
                        check(goal == 'Clear 1-2', f'  the goal tracker says “Clear 1-2” (got “{goal}”)')
                        press(js("__mid('[data-tut=hearth-setout]')"), 600)
                        check(js('!!(Camp.scene && Camp.scene.onRoad)'), '  Set out (pressed by the player) flies up the road')
                    else:
                        c = js("(() => { const c = document.querySelector('.cv-card'); return c ? c.textContent : ''; })()")
                        check('1-2' in c and js("Save.state.party.filter(Boolean).length") == 2, '  1-2’s card, and two heroes to fight it')
                        press(js("__mid('[data-tut=road-go]')"), 900)
                        check(js("App.current") == 'battle', '  the card’s Set out (pressed by the player) starts 1-2')
                        page.wait_for_timeout(1500)
                        check(js('!Battle.paused && !Wick.step'), '  1-2 plays on: nothing stops it')
                        probe('battle-1-2')
                elif how == 'stats':
                    # a tap on a stat shows its tooltip, the line on what it does; Next comes after two
                    check(js("!!document.querySelector('[data-tut=wick-next]') && document.querySelector('[data-tut=wick-next]').hidden"), '  no Next before a stat is tapped')
                    for k, want in (('hp', 'How much harm they take before they fall.'), ('pow', 'How hard they hit, and how much they heal.')):
                        press(js(f"__mid('[data-tut=hero-stat-{k}]')"), 400)
                        tip = js("(() => { const t = document.querySelector('#stage > .tp'); return t ? t.textContent : ''; })()")
                        check(want in tip, f'  a tap on {k}: its tooltip, “{want}” (got “{tip}”)')
                    page.wait_for_timeout(300)
                    shot('stats-tapped')
                    probe('stats-tapped')
                    nx = js("__mid('[data-tut=wick-next]')")
                    check(bool(nx), '  after two, Next')
                    press(nx, 400)
                elif how == 'plus':
                    press(js("__mid('[data-tut=hero-plus-pow]')"), 400)
                    check(js('HeroSheet.placing') == 1, '  + places a point (Done comes next)')
                    probe('spend-placed')
                elif how == 'target':
                    if sid == 'accept':
                        gold['quest'] = js('Save.state.quests.story')
                    press(s['hole'])
                    if sid == 'wearw' or sid == 'weara':
                        slot = 'weapon' if sid == 'wearw' else 'armor'
                        g = js(f"(() => {{ const c = Save.state.roster[0], x = c.gear['{slot}']; return x ? [GEAR[x.id].rarity, x.st, x.lv, x.uid === Save.state.guide.gear['{slot}']] : null; }})()")
                        check(bool(g) and g[0] == 'fine' and g[1] == 0 and g[2] == 1 and g[3], f'  1-1’s {slot}, Fine, ★0, level 1, is worn ({g})')
                    if sid == 'plots':
                        page.wait_for_timeout(300)
                        check(js("(() => { const e = document.querySelector('#sheet:not([hidden]) [data-tut=plot-none]'); return !!e && e.textContent === 'No plans'; })()"), '  the plot’s panel: No plans')
                    if sid == 'accept':
                        check(js("Quests.accepted()") and gold['quest'] == 'offered', '  The Gravedigger is accepted')
                elif how == 'drag':
                    check(js('Save.state.guide.camp') and js('Camp.scene.locked') is False and js("!!document.querySelector('#wk .wk-hand')"), '  the buildings view opens (with nothing to build), and a hand shows the drag')
                    drag((W - 270, 250), (130, 250), steps=24, lift=False)
                    page.wait_for_timeout(1400)
                    check(js('Camp.scene.w') > 0.95, f'  dragged round to the buildings view ({js("__state()")})')
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
                    if how == 'hire':
                        bub = js("document.querySelector('#sheet .fp .wick-bubble').textContent")
                        check(bub.startswith('This lot want paying. The crown’s advance covers one.'), f'  Wick on the prices: “{bub}”')
                        prices = js("[...document.querySelectorAll('#sheet .fp [data-tut=pick-price]')].map(p => p.textContent)")
                        check(all(p != 'Free' for p in prices), f'  each with a price ({prices})')
                    want = 'sellsword' if how == 'pick' else ('pilgrim' if 'pilgrim' in cards else cards[0])
                    k = cards.index(want) if want in cards else 0
                    press(js(f"__mid(document.querySelectorAll('#sheet .fp [data-tut=pick-card]')[{k}])"))
                    bub = js("document.querySelector('#sheet .fp .wick-bubble').textContent")
                    check(bool(bub) and not bub.startswith('Three') and not bub.startswith('This lot'), f'  Wick says a line on the {want}: “{bub}”')
                    shot(how + '-card')
                    probe(how + '-card')
                    # its +: Hire asks first (the recruit, the price, Cancel and Hire)
                    press(js(f"__mid(document.querySelectorAll('#sheet .fp [data-tut=pick-plus]')[{k}])"), 400)
                    check(js("(() => { const h = document.querySelector('#sheet .fp .rb-modal [data-tut=pick-hire]'); return !!h && !h.disabled; })()"), '  its +: Hire asks first')
                    shot(how + '-confirm')
                    probe(how + '-confirm')
                    g0 = js('Save.state.currencies.gold')
                    price = js(f"(() => {{ const r = Save.state.board.recruits.find(r => r.cls === '{want}'); return r ? Base.recruitPrice(r, Save.state) : 0; }})()") if how == 'hire' else 0
                    press(js("__mid('[data-tut=pick-hire]')"), 700)
                    check(js("!!document.querySelector('[data-tut=pick-reveal]')"), '  Hire: the reveal')
                    if how == 'hire':
                        g1 = js('Save.state.currencies.gold')
                        check(price >= 162 and g1 == g0 - price, f'  the price comes off the purse ({g0} − {price} = {g1})')
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
                if sid == 'loot':
                    pass
                if sid == 'xp':
                    tiles = js("[...document.querySelectorAll('[data-tut=loot-gear]')].length")
                    check(tiles == 2, f'  1-1’s results: two gear tiles, a weapon and an armour ({tiles})')
            if broke:
                ctx.close()
                continue
            check(js('Save.state.guide.done') is True, 'the session is done')
            check(js("Save.state.campaign.cleared.slice(0, 2).join()") == '1-1,1-2', '1-1 and 1-2 are cleared')
            check(js('Save.state.party.filter(Boolean).length') == 2, 'two heroes in the formation')
            check(js("Save.state.guide.camp && Base.viewOpen(Save.state) && !Base.available(Save.state).length"), 'the buildings view is open, with nothing to build')
            check(js("Save.state.quests.bess && Save.state.quests.story === 'on' && Save.state.quests.jobs === 'due'"), 'Bess is at the fire, her quest on, the daily jobs due on the next trip home')
            check(js("Guide.seen('stat') && !Guide.seen('c:rule')"), 'the stat-point tip is marked seen (the session said it); the turn order’s tactic still has its coach mark to come')
            page.wait_for_timeout(600)
            check(js('!Wick.held'), 'nothing is held back after it')
            goal = js("document.querySelector('.camp .cv-gt').textContent")
            # (1-2 can level the new recruit: then a point to spend comes first)
            check(goal == 'Clear 1-3' or goal.startswith('Spend 1 stat point'), f'the goal tracker takes over: “{goal}”')
            ql = js("(() => { const q = document.querySelector('.camp [data-tut=hearth-quest]'); return q && !q.hidden ? q.textContent : ''; })()")
            check('The Sexton' in ql and '1-18' in ql, f'  with the quest under it: “{ql}”')
            shot('after')

            # ── Wick's menu: a tap on him at the fire
            def wait(cond, what, timeout=15000):
                try:
                    page.wait_for_function(cond, timeout=timeout, polling=100)
                    return True
                except Exception:
                    check(False, f'{what} (now {js("__state()")}, Wick {js("__wk()")})')
                    if a.shots:
                        shot('missed')
                    return False

            press(js("__scene('wick')"), 600)
            if wait('WickMenu.shown', 'a tap on Wick at the fire opens his menu'):
                names = js("[...document.querySelectorAll('#sheet [data-tut=wick-lesson]')].map(b => b.textContent)")
                hint = js("document.querySelector('#sheet .wm-say span').textContent")
                check(names[:9] == ['The story', 'The road', 'Battles', 'Levels and stats', 'Gear', 'Recruiting', 'Formation', 'Buildings', 'Quests'], f'his menu: the nine lessons ({names})')
                check(hint == js('WickMenu.hint(Save.state)') and len(hint) > 10 and js("!!document.querySelector('#sheet [data-tut=wick-codex]')"), f'  his hint, “{hint}”, and the Codex')
                shot('wick-menu')
                press(js("__mid('#sheet [data-tut=wick-lesson][data-id=gear]')"), 900)
                t0 = time.time()
                while time.time() - t0 < 8 and not (js('__wk()') or {}).get('soft'):
                    page.wait_for_timeout(100)
                page.wait_for_timeout(400)
                s = js('__wk()')
                check(js("App.current") == 'hero' and bool(s) and s['soft'] and s['text'].startswith('Now the gear you found.'), f'  Gear: the hero card, and his first gear line again as a soft step ({s})')
                check(js('!Wick.held && !Wick.step'), '  nothing is held back')
                shot('wick-lesson')
                js("Wick.hide(); App.go('home', {}, { instant: true }); 'ok'")
                page.wait_for_timeout(900)
            # Settings → Wick's lessons opens his menu
            js("App.openSettings(); 'ok'")
            page.wait_for_timeout(300)
            press(js("(() => { const b = [...document.querySelectorAll('#sheet .setbox .btn')].find(x => /^Wick’s lessons/.test(x.textContent)); if (b) b.scrollIntoView({ block: 'center' }); return b ? __mid(b) : null; })()"), 600)
            check(js('WickMenu.shown'), 'Settings → Wick’s lessons opens his menu')
            js("WickMenu.close(); 'ok'")
            page.wait_for_timeout(400)

            # ── 1-3's first clear: the New chip, Wick's card at the Hearth, Show me, and the soft visit to Tactics
            js("Proto.train(1); Proto.restAll(); Save.commit(); App.refresh(); 'ok'")  # a sure win, so the walk stays about the guide (and no hero at 5 yet)
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

            # ── a hero reaches level 5: the Skill points visit, on their hero card
            js("App.go('home', {}, { instant: true }); Proto.trainTo(5); Save.commit(); App.refresh(); 'ok'")
            t0 = time.time()
            while time.time() - t0 < 15 and not js("Visits.card"):
                page.wait_for_timeout(100)
            page.wait_for_timeout(450)
            check(js('Visits.card') and 'Skill points' in js("document.querySelector('#wk .wk-card').textContent"), 'a hero at level 5: Wick’s card, “Skill points”')
            shot('skills-card')
            press(js("__mid('[data-tut=visit-show]')"), 800)
            check(js("App.current") == 'hero', 'Show me: the hero card')
            for k, line in enumerate(SKILLS):
                t0 = time.time()
                while time.time() - t0 < 8 and not ((js('__wk()') or {}).get('soft') and js('Visits.step') == k):
                    page.wait_for_timeout(100)
                page.wait_for_timeout(450)
                s = js('__wk()')
                ok = bool(s) and s['soft'] and s['text'].startswith(line)
                check(ok, f'  skills step {k + 1}, a soft step: “{line}…”' + ('' if ok else f' (got {s})'))
                shot(f'skills-{k + 1}')
                press(at(W / 2, 24), 500)
            page.wait_for_timeout(600)
            check(js("Save.state.guide.visits.skills") == 'seen', 'the Skill points visit is seen')

            # ── the first "While you were away" with tolls on it: Wick's line on them
            js("App.go('home', {}, { instant: true }); Base.proto.skip(3, Save.state); Camp.showAway(3 * 3600000); 'ok'")
            page.wait_for_timeout(700)
            line = js("(() => { const e = document.querySelector('#sheet [data-tut=away-tolls]'); return e ? e.textContent : ''; })()")
            check(line == 'The road earned tolls while you were gone.', f'the first “While you were away” with tolls: Wick’s line on them (“{line}”)')
            shot('away-tolls')
            js("closeSheet(); Base.proto.skip(3, Save.state); Camp.showAway(3 * 3600000); 'ok'")
            page.wait_for_timeout(500)
            check(not js("!!document.querySelector('#sheet [data-tut=away-tolls]')"), '  only the first time')
            js("closeSheet(); 'ok'")
            ctx.close()
        b.close()
    srv.shutdown()
    for e in errors:
        print('  console:', e)
    print(f'{len(fails)} failed' + (f', {len(errors)} console errors' if errors else ''))
    sys.exit(1 if fails or errors else 0)


if __name__ == '__main__':
    main()
