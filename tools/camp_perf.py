"""How long the camp (screen 2, views around the fire) takes to draw a frame, in headless Chromium.

  python tools/camp_perf.py [--w 844 --h 390] [--seconds 3] [--rates 1,4]

A camp mid Region I (six heroes, three buildings) and a late one (Renown 25, fourteen plots) are each measured at rest
in the party view and the buildings view, and while turning without stopping (every frame drawn whole). For each:
  draw   the scene's own drawing time a frame (js/campscene.js keeps the last 240): the average and the 95th percentile
  fps    frames the scene drew a second (at rest it draws thirty: only the fire and the lights move)
  main   the browser's main-thread time a frame at 60 Hz, from Chrome's TaskDuration: everything the page does, the
         HUD's plaques and the browser's own painting included. Over 16.7 ms, frames are dropped.
--rates throttles the CPU (Emulation.setCPUThrottlingRate): 4 stands in for a mid-range phone. Needs Playwright.
"""
import argparse, functools, http.server, json, os, socketserver, sys, threading
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


MID = """(() => { const s = Save.state; if (typeof FirstSession !== 'undefined') FirstSession.skip(); Base.newGame('sellsword', s); Tactics.owner(s.roster[0].id); closeScreen(); for (let i = 0; i < 8; i++) Proto.lightNext(s);
  Proto.fill(s); Base.proto.gold(1500, s); Base.proto.mats(40, s); Base.build('tollhouse', 0, s); Base.build('infirmary', 1, s); Base.build('trainingyard', 2, s);
  Base.proto.skip(3, s); s.renown.up = 0; s.renown.newPlot = 0; Save.commit(); App.go('home', {}, { instant: true }); return 'mid'; })()"""
LATE = """(() => { const s = Save.state; Proto.lightTo(3, s); for (let i = 0; i < 9; i++) Proto.lightNext(s); Proto.trainTo(48, s); Proto.spendPoints(s); Base.proto.blueprints(s);
  Base.proto.gold(5e6, s); Base.proto.mats(900, s); for (let k = 0; k < 40 && Base.renown(s).level < 25; k++) Base.proto.renown(s); Base.ensure(s);
  let p = 0; for (const id of BUILDING_ORDER) { if (BUILDINGS[id].plot === false || Base.built(id, s)) continue; while (p < 14 && s.base.plots[p]) p++; if (p < 14) Base.build(id, p, s); }
  Base.proto.skip(5, s); s.renown.up = 0; s.renown.newPlot = 0; Save.commit(); App.go('home', {}, { instant: true }); return 'late'; })()"""
# Turning without stopping: a finger dragging along the frame, a few pixels every frame.
TURN = """(() => { const L = Camp.scene; window.__turning = true; let x = 0; L.dragStart(0);
  const step = () => { if (!window.__turning) { L.dragEnd(); return; } x -= 3; L.dragMove(x); requestAnimationFrame(step); }; requestAnimationFrame(step); return 1; })()"""
COUNT = "(() => { window.__frames = 0; const f = () => { window.__frames++; if (window.__counting) requestAnimationFrame(f); }; window.__counting = true; requestAnimationFrame(f); return 1; })()"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--w', type=int, default=844)
    ap.add_argument('--h', type=int, default=390)
    ap.add_argument('--seconds', type=float, default=3)
    ap.add_argument('--rates', default='1,4')
    a = ap.parse_args()
    srv = socketserver.TCPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=ROOT))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    port = srv.server_address[1]
    rows, errors = [], []
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={'width': a.w, 'height': a.h}, device_scale_factor=1)
        page = ctx.new_page()
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(f'http://127.0.0.1:{port}/index.html')
        page.wait_for_function("typeof Title !== 'undefined' && Title.ready", timeout=60000, polling=50)
        page.click('#title')
        page.wait_for_timeout(800)
        js = page.evaluate
        cdp = ctx.new_cdp_session(page)
        cdp.send('Performance.enable')

        def task():
            return next(m['value'] for m in cdp.send('Performance.getMetrics')['metrics'] if m['name'] == 'TaskDuration')

        def measure(camp, what, rate):
            cdp.send('Emulation.setCPUThrottlingRate', {'rate': rate})
            if what == 'turning':
                js(TURN)
            page.wait_for_timeout(1200)  # let it settle (and, at rest, fill its cache)
            js(COUNT)
            d0, t0 = js('Camp.scene.drawn'), task()
            page.wait_for_timeout(int(a.seconds * 1000))
            t1, d1 = task(), js('Camp.scene.drawn')
            n = js('(() => { window.__counting = false; return window.__frames; })()')
            times = js('Camp.scene.times')[-max(1, d1 - d0):]
            if what == 'turning':
                js('window.__turning = false; 0')
            cdp.send('Emulation.setCPUThrottlingRate', {'rate': 1})
            times.sort()
            avg = sum(times) / len(times)
            rows.append({'camp': camp, 'view': what, 'cpu': f'{rate}x', 'draw avg ms': round(avg, 2), 'draw p95 ms': round(times[max(0, int(len(times) * 0.95) - 1)], 2),
                         'fps': round((d1 - d0) / a.seconds, 1), 'main ms/frame': round((t1 - t0) * 1000 / max(1, n), 2)})
            page.wait_for_timeout(1500)

        for camp, setup in (('mid', MID), ('late', LATE)):
            js(setup)
            page.wait_for_timeout(1500)
            for rate in [int(r) for r in a.rates.split(',')]:
                js("Camp.scene.go('party', true); 0")
                measure(camp, 'party', rate)
                js("Camp.scene.go('build', true); 0")
                measure(camp, 'buildings', rate)
                js("Camp.scene.go('party', true); 0")
                measure(camp, 'turning', rate)
        b.close()
    srv.shutdown()
    keys = list(rows[0].keys())
    print(f'camp frame times, {a.w}x{a.h}, {a.seconds:g}s each')
    print('  '.join(f'{k:>13}' for k in keys))
    for r in rows:
        print('  '.join(f'{str(r[k]):>13}' for k in keys))
    for e in errors:
        print('page error:', e)
    sys.exit(1 if errors else 0)


if __name__ == '__main__':
    main()
