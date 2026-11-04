"""The play-through again, in the browser, through the game's own buttons (build step 7b).

A new game is played through Region I the way a player taps it: the first pick, the Road tab's Next and the stage
sheet's Set out, Skip in battle, the report's Home, the trip summary's new things, the Recruit Board, Build on an
empty plot. No prototype tools. Two stand-ins for a player's own time: the clock is moved on to rest the party (the
camp's ticking does the rest, as when the app stays open), and points are spent as the Stats tab's + buttons would
(Hero.autoBuild).

It records every console error, every coach mark and tip as it appears, and every new thing the trip summary lists,
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
  new MutationObserver(list => { for (const m of list) for (const n of m.addedNodes) {
    if (!(n instanceof HTMLElement)) continue;
    if (n.classList.contains('coach-tip')) window.__seen.coach.push(n.textContent);
    if (n.classList.contains('toast') && n.classList.contains('tip')) window.__seen.tips.push(n.textContent);
  } }).observe(document.documentElement, { childList: true, subtree: true });
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

        def state():
            return js("""() => { const s = Save.state, fr = Campaign.frontier();
              return { fr, n: STAGES.filter(x => x.region === 0).length, fit: Campaign.fit().length, roster: s.roster.length,
                party: s.party.filter(Boolean).length, gold: s.currencies.gold, board: Base.boardOpen(s), picks: s.board.picks,
                cheapest: Math.min(...s.board.recruits.map(r => Base.recruitPrice(r, s)), 1e9), need: (STAGES[Math.min(fr + 1, STAGES.length - 1)] || {}).party || 6,
                cap: Base.rosterCap(s), tired: Campaign.chars().some(c => Campaign.spent(c) || (c.fatigue || 0) >= 70),
                build: Base.available(s).filter(id => Base.canPay(Base.cost(id, 1), s)).length > 0 && s.base.plots.some((x, i) => i < Base.plotsCleared(s) && !x),
                trip: !!s.campaign.trip, cleared: s.campaign.cleared.length }; }""")

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
            # hire: the Party tab's Recruit Board button, a card, Hire
            while st['board'] and st['picks'] > 0 and st['roster'] < min(st['need'], st['cap']) and st['cheapest'] <= st['gold']:
                tap('#tabbar .tab', 'Party', 700)
                if not tap('.view .btn.primary', 'Recruit Board', 900):
                    problems.append('no Recruit Board button on the Party tab')
                    break
                tap('.recruit', None, 300)
                if not tap('.bld-view .btn.primary', '^Hire', 900):
                    break
                shot('hired')
                st = state()
            # build: walk round the fire to an empty plot, Build, pick, Build the …
            if st['build']:
                tap('#tabbar .tab', 'Base', 1200)
                for _ in range(14):
                    if js("() => /Empty Plot/.test(document.querySelector('.bcard [data-role=name]')?.textContent || '')"):
                        break
                    tap('.bcard .sq[data-step="1"]', None, 650)
                if tap('.bcard .btn, .bcard button', '^Build$', 800):
                    tap('.buildbox .opt', None, 300)
                    if tap('.buildbox .btn.primary', '^Build the', 900):
                        shot('built')
                    else:
                        tap('.sheet-x', None, 300)
            # the road: Next (or Farm after two losses there), then Set out
            tap('#tabbar .tab', 'Road', 900)
            news = js("() => [...document.querySelectorAll('.tripcard .newrow b')].map(b => b.textContent)")
            if news:
                js('n => __seen.news.push(...n)', news)
                shot('news')
            tap('.tripcard .small', 'Got it', 400)
            farm = js('() => window.__lost >= 2')
            if farm and tap('.mapcta .btn:not(.primary)', '^Farm', 800):
                js('() => { window.__lost = 1; }')
            elif not tap('.mapcta .btn.primary', 'Next', 800):
                problems.append(f"no Next button on the Road tab at stage {st['fr'] + 1}")
                break
            if not tap('.stagebox .btn.go', None, 1500):
                problems.append(f"no Set out on the stage sheet at stage {st['fr'] + 1}")
                tap('.sheet-x', None, 300)
                continue
            trips += 1
            if trips <= 2:
                shot('battle')
            # the trip: Skip each battle; between battles the party walks on by itself; the report ends it
            for _ in range(80):
                page.wait_for_selector('#bSkip:not([hidden]), #sheet:not([hidden])', timeout=20000)
                page.wait_for_timeout(300)
                if js("() => !document.getElementById('sheet').hidden"):
                    if tap('#sheet .btn.primary', 'battle report', 700):
                        pass
                    if js("() => !!document.querySelector('#sheet .report-box')"):
                        won = js("() => !!document.querySelector('#sheet .kicker.won')")
                        js('w => { window.__lost = w ? 0 : (window.__lost || 0) + 1; }', won)
                        tap('#sheet .btn.primary', 'Home', 1200)
                        break
                    tap('#sheet .sheet-x', None, 400)
                    continue
                tap('#bSkip', None, 900)
                # between battles: wait for the walk, or for the report
                for _ in range(40):
                    if js("() => !document.getElementById('sheet').hidden || !!(Battle.busy && !document.querySelector('.between'))"):
                        break
                    page.wait_for_timeout(250)
            if js('() => Campaign.trip() != null'):
                problems.append('a trip did not end')
                js("() => { Campaign.end({ k: 'called', text: 'test' }); App.go('map'); }")

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
