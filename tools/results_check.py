"""Checks the results popup (js/results.js) in headless Chromium through real taps, and takes its screenshots.

Four scenes, each from a fresh save set up in the page, then played through the game's own battle flow (Skip, then the
popup, as a player sees it):
  first   1-1's first clear: one hero, levelling up. (1-1 gives 5 XP today, so the hero starts 2 XP short of level 2.)
  four    a four-hero win at 1-7 (Keep going off): mid-way through the fill, and at its end
  six     a six-hero win at 1-16: three rows of heroes, the tightest fit
  loss    driven back at 1-9's wall, with four heroes: Wick gives the stage's hint, and Farm 1-8 is offered
  trip    a trip of three battles with Keep going on (1-6, 1-7, 1-8), then Come home between battles: the trip's totals
At each size it checks what the popup says and that it sits inside the frame with nothing spilling over, the guide's
data-tut hooks, that a tap during the fill skips to the end without pressing what it landed on, and the buttons and
taps: a fatigue bar and a piece of loot say what they are, Report opens the battle report (which scrolls) and Back
returns, and Hearth, Next, Farm and New go where they should. Taps land where the element is drawn on the screen, so
in the turned frame (390x844 with touch) they go through the quarter-turn.
  python tools/results_check.py [--sizes 844x390,667x375t,1280x720,900x800,390x844t] [--scenes first,four,six,loss,trip]
                                [--shots docs/screens/results]
A size ending in t has a touch screen (and 390x844t is turned). Screenshots are <scene>-<w>x<h>.png, and four-mid-...
for the fill under way.
"""
import argparse, functools, http.server, json, os, socketserver, sys, threading
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')  # the checks quote the game's text (’, ›), which a Windows console can't print

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SIZES = '844x390,667x375t,1280x720,900x800,390x844t'

# Sets up a scene on a fresh save, then sets out: the battle starts, and the check taps Skip.
SETUP = """
(scene) => {
  const s = Save.state, P = (cls, name, level, frac) => {
    const c = s.roster.length ? Hero.create(cls, 'c' + s.nextId++, { name, level }) : Base.newGame(cls, s, { name });
    if (level > 1 && c.level < level) Hero.gainXp(c, Hero.xpBetween(c.level, level));
    Hero.autoBuild(c);
    c.xp = Math.floor(frac * Hero.xpToNext(c.level));
    if (!s.roster.includes(c)) { s.roster.push(c); Base.place(c, s); }
    Tactics.owner(c.id);
    return c;
  };
  closeScreen();
  if (typeof FirstSession !== 'undefined') FirstSession.skip(); // Wick's first session (tools/guide_check.py walks it)
  s.settings.tips = false; // no first-time tips or coach marks over the shots
  const light = n => { for (let k = 0; k < n; k++) Proto.lightNext(s); };
  let stage = 0, want = 0;
  if (scene === 'first') { const c = P('sellsword', 'Fulke', 1, 0); c.xp = Hero.xpToNext(1) - 2; }
  else if (scene === 'four' || scene === 'loss') {
    P('sellsword', 'Fulke', 4, 0.72); P('pilgrim', 'Agnes', 4, 0.68); P('warden', 'Osric', 4, 0.15); P('crossbowman', 'Mira', 2, 0.8);
    s.roster.find(c => c.name === 'Agnes').fatigue = 44; s.roster.find(c => c.name === 'Fulke').fatigue = 22;
    if (scene === 'four') { light(6); stage = 6; } else { light(8); stage = 8; want = 1; }
    s.campaign.road.keepGoing = false;
  } else if (scene === 'six') {
    P('sellsword', 'Fulke', 10, 0.8); P('warden', 'Osric', 10, 0.2); P('pilgrim', 'Agnes', 10, 0.55); P('crossbowman', 'Mira', 9, 0.9);
    P('hexblade', 'Morwen', 9, 0.4); P('lamplighter', 'Hugh', 9, 0.1);
    light(15); stage = 15; s.campaign.road.keepGoing = false;
  } else if (scene === 'trip') {
    P('sellsword', 'Fulke', 11, 0.8); P('pilgrim', 'Agnes', 11, 0.55); P('warden', 'Osric', 10, 0.9); P('crossbowman', 'Mira', 10, 0.35);
    for (const c of s.roster) c.fatigue = 20;
    // three stages with no elite (1-9's Gravewarden can beat even this party), so Keep going is given rather than lit
    light(5); Campaign.unlock('keepgoing', s); stage = 5; s.campaign.road.keepGoing = true;
  }
  Base.tick(s);
  Save.commit();
  // a seed that ends the way the scene wants: a win, or for the loss a defeat
  let seed = 1;
  while (seed < 400 && simulate(Campaign.setup(stage, seed)).winner !== want) seed++;
  App.go('battle', { stage, seed });
  return seed;
}
"""


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--sizes', default=SIZES)
    ap.add_argument('--scenes', default='first,four,six,loss,trip')
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
            for scene in a.scenes.split(','):
                ctx = b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=1, is_mobile=touch, has_touch=touch)
                page = ctx.new_page()
                page.on('console', lambda m, tag=f'{size} {scene}': errors.append(f'{tag}: {m.text}') if m.type == 'error' else None)
                page.on('pageerror', lambda e, tag=f'{size} {scene}': errors.append(f'{tag}: {e}'))
                page.goto(f'http://127.0.0.1:{port}/index.html')
                js = page.evaluate
                page.wait_for_function("typeof Title !== 'undefined' && Title.ready", timeout=60000, polling=50)
                page.click('#title')
                page.wait_for_timeout(700)
                tag = f'{w}x{h}{" touch" if touch else ""} · {scene}'
                print(f'{tag}: frame {js("Frame.W")} wide{", turned" if js("Frame.turned") else ""}')

                def shot(name):
                    if a.shots:
                        page.screenshot(path=os.path.join(a.shots, f'{name}-{w}x{h}.png'))

                def tap(sel, n=0, wait=500):
                    """Taps the middle of the nth match where it is drawn on the screen: through the turn, when turned."""
                    r = js("([sel, n]) => { const el = document.querySelectorAll(sel)[n]; if (!el) return null; const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }", [sel, n])
                    if not r:
                        return False
                    if touch:
                        page.touchscreen.tap(*r)
                    else:
                        page.mouse.click(*r)
                    page.wait_for_timeout(wait)
                    return True

                def play_until_popup(skips=1):
                    for _ in range(skips):
                        page.wait_for_function('Battle.busy', timeout=30000, polling=50)
                        page.wait_for_timeout(300)
                        tap('#bSkip', wait=200)
                        if skips > 1:
                            page.wait_for_function("!!document.querySelector('.between') || !!document.querySelector('#sheet.results:not([hidden])')", timeout=30000, polling=50)
                    page.wait_for_function("!!document.querySelector('#sheet.results:not([hidden]) .rs-box')", timeout=30000, polling=50)

                seed = js(SETUP, scene)
                if scene == 'trip':
                    # three battles: Skip each, the party walks on by itself between them; then Come home
                    for k in range(3):
                        page.wait_for_function('Battle.busy', timeout=40000, polling=50)
                        page.wait_for_timeout(300)
                        tap('#bSkip', wait=200)
                        page.wait_for_function("!!document.querySelector('.between') || !!document.querySelector('#sheet.results:not([hidden])')", timeout=30000, polling=50)
                    check(js("!!document.querySelector('.between')"), f'{tag}: after three wins the party is between battles')
                    page.wait_for_timeout(600)  # the card rises into place first
                    tap('.between .bt-acts .btn', 1, wait=300)
                    page.wait_for_function("!!document.querySelector('#sheet.results:not([hidden]) .rs-box')", timeout=30000, polling=50)
                else:
                    play_until_popup()

                # ── during the fill
                if scene == 'four':
                    page.wait_for_timeout(1500)
                    check(js('Results.busy'), f'{tag}: the bars are still filling 1.5 s in')
                    shot('four-mid')
                    # a tap on Hearth while the bars fill only skips to the end
                    tap('.rs-b[data-tut=camp]', wait=400)
                    check(js("!Results.busy && App.current === 'battle' && !!document.querySelector('#sheet.results .rs-root.done')"), f'{tag}: a tap during the fill skips to the end, and Hearth is not pressed')
                else:
                    page.wait_for_function('!Results.busy', timeout=15000, polling=100)
                page.wait_for_timeout(500)
                shot(scene)

                # ── what it says, and that it fits
                info = js("""() => {
                  const fr = Frame.box(document.getElementById('frame')), box = document.querySelector('.rs-box'), q = s => [...document.querySelectorAll(s)];
                  // (Wick's portrait runs 4px off the bottom edge, as in the mockup)
                  const inFrame = (el, below = 0.5) => { const b = Frame.box(el); return b.left >= fr.left - 0.5 && b.top >= fr.top - 0.5 && b.right <= fr.right + 0.5 && b.bottom <= fr.bottom + below; };
                  const fits = el => el.scrollWidth <= el.clientWidth + 1;
                  return {
                    banner: document.querySelector('.rs-banner b').textContent, sub: document.querySelector('.rs-sub').textContent,
                    heroes: q('.rs-hr').length, cols: getComputedStyle(document.querySelector('.rs-heroes')).gridTemplateColumns.split(' ').length,
                    ups: q('.rs-hr .lvup.on').length, xp: q('.rs-hr .xpn').map(e => e.textContent), fat: q('.rs-hr .fv').map(e => e.textContent + (e.className.includes('exh') ? '!' : e.className.includes('weary') ? '~' : '')),
                    lvls: q('.rs-hr .face em').map(e => +e.textContent), loot: q('.rs-it').length, lootIn: q('.rs-it.in').length, news: q('.rs-new').map(e => e.textContent),
                    acts: q('.rs-b').map(e => e.textContent), pri: (document.querySelector('.rs-b.pri') || {}).textContent || '',
                    tut: q('[data-tut]').map(e => e.dataset.tut),
                    inside: [box, document.querySelector('.rs-banner'), ...q('.wick-bubble')].every(el => inFrame(el)) && q('.wick-pt').every(el => inFrame(el, 4.5)),
                    spill: [document.querySelector('.rs-loot'), document.querySelector('.rs-acts'), ...q('.rs-hr .top'), document.querySelector('.rs-sub')].filter(el => !fits(el)).map(el => el.className),
                    actsIn: Frame.box(document.querySelector('.rs-acts')).right <= Frame.box(box).right + 0.5 && Frame.box(document.querySelector('.rs-acts')).left >= Frame.box(box).left - 0.5,
                    wick: document.querySelector('.wick-bubble') ? document.querySelector('.wick-bubble').textContent : null,
                    // Wick's bubble may reach the popup's edge, as in the mockup, but not the heroes or the banner
                    bubbleClear: !document.querySelector('.wick-bubble') || [document.querySelector('.rs-hr'), document.querySelector('.rs-banner')].every(el => { const a = Frame.box(document.querySelector('.wick-bubble')), b = Frame.box(el); return a.right <= b.left + 0.5 || a.bottom <= b.top + 0.5; }),
                    boxW: Math.round(Frame.box(box).width), boxTop: Math.round(Frame.box(document.querySelector('.rs-banner')).top), boxBottom: Math.round(Frame.box(box).bottom),
                  };
                }""")
                print('   ', json.dumps({k: info[k] for k in ('banner', 'sub', 'heroes', 'cols', 'ups', 'lvls', 'xp', 'fat', 'loot', 'news', 'acts', 'boxW', 'boxTop', 'boxBottom')}, ensure_ascii=False))
                check(info['inside'], f'{tag}: the popup, its banner and Wick sit inside the frame (banner top {info["boxTop"]}, bottom {info["boxBottom"]})')
                check(not info['spill'] and info['actsIn'], f'{tag}: nothing spills over: the loot, the buttons, the names, the subline ({info["spill"]})')
                check(info['lootIn'] == info['loot'], f'{tag}: every piece of loot is in at the end ({info["lootIn"]}/{info["loot"]})')
                need = ['xp', 'fatigue', 'report', 'camp', 'again'] + (['next'] if len(info['acts']) == 4 else []) + (['new'] if info['news'] else [])
                check(all(t in info['tut'] for t in need), f'{tag}: the guide\'s hooks are there: {", ".join(need)} ({info["tut"]})')
                if scene == 'first':
                    check(info['banner'] == 'Victory' and '1-1' in info['sub'] and 'First clear' in info['sub'] and info['heroes'] == 1 and info['cols'] == 1, f'{tag}: Victory at 1-1, First clear, one hero in one column')
                    check(info['ups'] == 1 and info['lvls'] == [2], f'{tag}: Fulke levels up to 2')
                    check(any('Tactics' in n for n in info['news']), f'{tag}: New: Tactics ({info["news"]})')
                    check(info['acts'][:3] == ['Report', 'Hearth', 'Fight again'] and info['pri'].startswith('Next') and '1-2' in info['pri'], f'{tag}: Report · Hearth · Fight again · Next 1-2 ({info["acts"]})')
                    # the guide can point at a hook: a coach mark rings the XP bar, above the popup
                    js("Guide.coach('check', '[data-tut=xp]', 'Your first level. Each one brings a stat point.', { force: true, place: 'below', ms: 30000 })")
                    page.wait_for_timeout(500)
                    ring = js("(() => { const r = document.querySelector('.coach-ring'); if (!r) return null; const a = Frame.box(r), b = Frame.box(document.querySelector('[data-tut=xp]')); return [a.left - b.left, a.top - b.top, b.right - a.right, b.bottom - a.bottom, +getComputedStyle(r).zIndex > +getComputedStyle(document.getElementById('sheet')).zIndex]; })()")
                    check(bool(ring) and all(abs(v + 3) < 2.5 for v in ring[:4]) and ring[4], f'{tag}: a coach mark on data-tut=xp rings the XP bar, above the popup ({ring})')
                    if w == 844:
                        shot('coach')
                    js("Guide.clear()")
                    page.wait_for_timeout(400)
                elif scene == 'four':
                    check(info['banner'] == 'Victory' and '1-7' in info['sub'] and info['heroes'] == 4 and info['cols'] == 2, f'{tag}: Victory at 1-7, four heroes in two columns')
                    check(info['ups'] >= 1, f'{tag}: at least one hero levels up ({info["ups"]})')
                    check('1-8' in info['pri'], f'{tag}: Next is 1-8 ({info["pri"]})')
                elif scene == 'six':
                    check(info['banner'] == 'Victory' and '1-16' in info['sub'] and info['heroes'] == 6 and info['cols'] == 2, f'{tag}: Victory at 1-16, six heroes in two columns of three')
                elif scene == 'loss':
                    check(info['banner'] == 'Driven back' and '1-9' in info['sub'] and 'First clear' not in info['sub'], f'{tag}: Driven back at 1-9')
                    check(info['wick'] == js('STAGES[8].hint') and info['bubbleClear'], f'{tag}: Wick gives 1-9\'s hint, clear of the heroes and the banner')
                    check(info['acts'][:3] == ['Report', 'Hearth', 'Try again'] and info['pri'].startswith('Farm 1-8'), f'{tag}: Report · Hearth · Try again · Farm 1-8 ({info["acts"]})')
                elif scene == 'trip':
                    check(info['banner'] == 'Victory' and '1-6 · 1-7 · 1-8' in info['sub'], f'{tag}: the subline names the stages fought ({info["sub"]})')
                    tot = js("(() => { const T = Save.state.campaign.lastTrip; return T.heroes.map(x => { const c = Save.char(x.id); return Hero.xpBetween(x.from.level, c.level) - x.from.xp + c.xp; }); })()")
                    shown = [int(x.replace('+', '').replace(' XP', '').replace(',', '')) for x in info['xp']]
                    check(shown == tot and js('Save.state.campaign.lastTrip.battles') == 3, f'{tag}: each hero\'s XP since setting out, over three battles ({shown})')

                # ── taps: fatigue, loot, Report and back
                tap('.rs-fat', 0, wait=300)
                check(js("[...document.querySelectorAll('#toasts .toast')].some(t => / is (Fresh|Weary|Exhausted|Spent): /.test(t.textContent))"), f'{tag}: a tap on a fatigue bar says what its state means')
                if info['loot']:
                    tap('.rs-it', 0, wait=300)
                    check(js("[...document.querySelectorAll('#toasts .toast')].some(t => /gold/.test(t.textContent))"), f'{tag}: a tap on the gold names it')
                if js("!!document.querySelector('.rs-it.gear:not(.sold)')"):
                    tap('.rs-it.gear:not(.sold)', 0, wait=500)
                    check(js("!!document.querySelector('#sheet .gr-box')"), f'{tag}: a tap on a piece of gear opens its card')
                    tap('#sheet .gr-box .sheet-x', 0, wait=500)
                    check(js("!!document.querySelector('#sheet.results .rs-root.still')"), f'{tag}: closing the card goes back to the results, at their end')
                tap('.rs-b[data-tut=report]', 0, wait=600)
                rep = js("(() => { const b = document.querySelector('#sheet .report-box'); return b ? [b.scrollHeight - b.clientHeight, Frame.box(b).bottom <= Frame.box(document.getElementById('frame')).bottom + 0.5] : null; })()")
                check(bool(rep) and rep[1], f'{tag}: Report opens the battle report, inside the frame ({rep})')
                if scene == 'four':
                    js("document.getElementById('toasts').replaceChildren()")  # the taps' toasts have had their moment
                    page.wait_for_timeout(400)
                    shot('report')
                if rep and rep[0] > 40:
                    js("document.querySelector('#sheet .report-box').scrollTop = 1e6")
                    page.wait_for_timeout(200)
                    check(js("(() => { const b = document.querySelector('#sheet .report-box'), s = b.querySelector('.side'); return Frame.box(s).bottom <= Frame.box(b).bottom + 1; })()"), f'{tag}: the report scrolls to its end: nothing is cut off ({rep[0]}px to scroll)')
                    if scene == 'four' and w == 844:
                        shot('report-end')
                tap('#sheet .report-wrap > .sheet-x', 0, wait=600)
                check(js("!!document.querySelector('#sheet.results .rs-root.still') && !Results.busy"), f'{tag}: Back returns to the results, at their end')
                if scene == 'four':
                    tap('.rs-b[data-tut=report]', 0, wait=600)
                    check(js("document.getElementById('sheet').className === 'report' && !!document.querySelector('#sheet .report-wrap')"), f'{tag}: Report opens the report again, a second time')
                    tap('#sheet .report-wrap > .sheet-x', 0, wait=600)

                # ── where the buttons go
                if scene == 'first':
                    tap('.rs-new', 0, wait=900)
                    check(js("App.current") == 'tactics', f'{tag}: New: Tactics opens Tactics, as the trip summary\'s row does ({js("App.current")})')
                elif scene == 'four':
                    tap('.rs-b[data-tut=next]', 0, wait=900)
                    check(js("App.current === 'map' && !!document.querySelector('#sheet .stagebox') && /1-8/.test(document.querySelector('#sheet .stagebox .kicker').textContent)"), f'{tag}: Next opens the Road with 1-8\'s sheet')
                    check(js("!document.querySelector('.tripcard')"), f'{tag}: the Road doesn\'t repeat the trip in its "Back from the road" card')
                    if w == 844:
                        shot('next-road')
                elif scene == 'loss':
                    tap('.rs-b[data-tut=next]', 0, wait=900)
                    check(js("App.current === 'battle' && current && current.index === 7"), f'{tag}: Farm 1-8 sets out for 1-8')
                elif scene == 'trip':
                    tap('.rs-b[data-tut=camp]', 0, wait=900)
                    check(js("App.current") == 'home', f'{tag}: Hearth goes home ({js("App.current")})')
                ctx.close()

        # ── reduced motion: the end at once
        ctx = b.new_context(viewport={'width': 844, 'height': 390}, device_scale_factor=1, reduced_motion='reduce')
        page = ctx.new_page()
        page.on('pageerror', lambda e: errors.append(f'reduced motion: {e}'))
        page.goto(f'http://127.0.0.1:{port}/index.html')
        page.wait_for_function("typeof Title !== 'undefined' && Title.ready", timeout=60000, polling=50)
        page.click('#title')
        page.wait_for_timeout(700)
        page.evaluate(SETUP, 'four')
        page.wait_for_function('Battle.busy', timeout=30000, polling=50)
        page.wait_for_timeout(300)
        page.click('#bSkip')
        page.wait_for_function("!!document.querySelector('#sheet.results:not([hidden]) .rs-box')", timeout=30000, polling=50)
        check(page.evaluate("!Results.busy && document.querySelectorAll('.rs-it.in').length === document.querySelectorAll('.rs-it').length && !!document.querySelector('.rs-root.still')"), 'reduced motion: the popup shows its end at once')
        ctx.close()
        b.close()
    srv.shutdown()
    for e in errors:
        print('  console error:', e)
    print('result:', 'FAIL' if fails or errors else 'ok', f'({len(fails)} failed, {len(errors)} console errors)')
    sys.exit(1 if fails or errors else 0)


if __name__ == '__main__':
    main()
