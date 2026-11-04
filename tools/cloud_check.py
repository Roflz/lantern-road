"""Each server's cloud save, against a stand-in for the artifact host's db (window.claude), in headless Chromium.

  python tools/cloud_check.py

S1 saves to data/users/<id>/game, as before servers came; S2 to game-s2; the servers' index to data/users/<id>/servers;
nothing touches data/users/<id>/save (the old roguelike's); and a second device, with nothing saved locally, opens S1
from the cloud, knows S2 is yours, and opens it too. The stand-in keeps its documents in localStorage under mockdb:.
"""
import functools, http.server, os, socketserver, sys, threading
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')  # the checks quote the game's text (’), which a Windows console can't always print

MOCK = """
(() => {
  const KEY = p => 'mockdb:' + p;
  const doc = path => ({
    get: async () => { await new Promise(r => setTimeout(r, 120)); const raw = localStorage.getItem(KEY(path)); return { exists: raw != null, data: () => JSON.parse(raw) }; },
    set: async d => { await new Promise(r => setTimeout(r, 60)); localStorage.setItem(KEY(path), JSON.stringify(d)); (window.__writes = window.__writes || []).push(path); },
  });
  window.claude = { use: async k => (k === 'db' ? { doc } : k === 'user' ? { id: async () => 'u1' } : null) };
})();
"""


class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))


def main():
    srv = socketserver.TCPServer(('127.0.0.1', 0), functools.partial(Q, directory=ROOT))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    url = f'http://127.0.0.1:{srv.server_address[1]}/index.html'
    fails, errors = [], []

    def check(ok, what):
        print(('  ok   ' if ok else '  FAIL ') + what)
        if not ok:
            fails.append(what)

    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={'width': 844, 'height': 390})
        ctx.add_init_script(MOCK)
        page = ctx.new_page()
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
        js = page.evaluate
        ready = lambda: page.wait_for_function("typeof Title !== 'undefined' && Title.ready", timeout=30000, polling=50)
        db = lambda path: js(f"(() => {{ const r = localStorage.getItem('mockdb:data/users/u1/{path}'); return r && JSON.parse(r); }})()")

        page.goto(url); ready()
        check(js('Save.server') == 1 and js("Save.info.cloud") == 'synced', f'S1, and the cloud connected ({js("Save.info.cloud")})')
        js("Base.newGame('sellsword', Save.state); Save.state.currencies.gold = 1111; Save.commit(); 'ok'")
        page.wait_for_timeout(2600)
        g = db('game')
        check(g and g['roster'][0]['cls'] == 'sellsword' and g['currencies']['gold'] == 1111, 'S1 saves to data/users/u1/game')
        idx = db('servers')
        check(idx and '1' in idx['saves'] and idx['saves']['1']['lead'] == 'sellsword', f'the index goes to data/users/u1/servers ({idx})')

        # S2 from the title
        page.reload(); ready()
        page.click('.tt-pill'); page.click('.tt-svr:not(.cur)'); page.click('.tt-cf .pri')
        page.wait_for_function("Title.ready && Save.server === 2", timeout=20000)
        page.click('#title'); page.wait_for_timeout(800)
        js("Base.newGame('pilgrim', Save.state); Save.state.currencies.gold = 2222; Save.commit(); 'ok'")
        page.wait_for_timeout(2600)
        g2, g1 = db('game-s2'), db('game')
        check(g2 and g2['roster'][0]['cls'] == 'pilgrim' and g2['currencies']['gold'] == 2222, 'S2 saves to data/users/u1/game-s2')
        check(g1 and g1['roster'][0]['cls'] == 'sellsword' and g1['currencies']['gold'] == 1111, 'S1’s cloud save is untouched')
        page.wait_for_timeout(2200)
        idx = db('servers')
        check(idx and set(idx['saves']) == {'1', '2'} and idx['saves']['2']['lead'] == 'pilgrim', 'the index lists both servers')
        check(db('save') is None and all(not w.endswith('/save') for w in js('window.__writes || []')), 'nothing touches data/users/u1/save, the roguelike’s')

        # a second device: this browser's own saves gone, the cloud kept
        js("for (const k of Object.keys(localStorage)) if (k.startsWith('lantern-road')) localStorage.removeItem(k); 'ok'")
        page.reload(); ready()
        check(js('Save.server') == 1 and js("Save.state.roster.length && Save.state.roster[0].cls") == 'sellsword' and js('Save.state.currencies.gold') == 1111, 'a new device opens S1 from the cloud')
        page.click('.tt-pill')
        labels = js("[...document.querySelectorAll('.tt-svr')].map(b => b.getAttribute('aria-label')).join()")
        check(labels == 'S1, your server, current,S2, your server,S3, new', f'and knows S2 is yours ({labels})')
        page.click('.tt-svr:not(.cur)')
        page.wait_for_function("Title.ready && Save.server === 2", timeout=20000)
        page.wait_for_timeout(500)
        check(js("Save.state.roster.length && Save.state.roster[0].cls") == 'pilgrim' and js('Save.state.currencies.gold') == 2222, 'S2 opens from the cloud too')
        b.close()
    srv.shutdown()
    for e in errors:
        print('  console error:', e)
    print('result:', 'FAIL' if fails or errors else 'ok', f'({len(fails)} failed, {len(errors)} console errors)')
    sys.exit(1 if fails or errors else 0)


if __name__ == '__main__':
    main()
