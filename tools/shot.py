"""Screenshots of the game in headless Chromium, with the console printed.

Serves the repository on a free local port, opens a page at phone size, runs optional steps, and saves PNGs.

  python tools/shot.py index.html out.png
  python tools/shot.py index.html out.png --steps "wait:1500; shot:a.png; js:Battle.setSpeed(4); wait:4000; shot:b.png"

Steps: wait:<ms>, shot:<file>, js:<expression>, until:<expression> (waits, up to 3 minutes, for it to be true),
click:<css selector>, tap:<x>,<y>, size:<w>,<h> (turn the phone)
With --steps-file, steps are read one per line, so JavaScript may contain semicolons.
With --artifact, the page is served inside the document skeleton the Claude artifact host adds.
"""
import argparse, functools, http.server, os, socketserver, sys, threading
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))


SKELETON = ('<!doctype html><html><head><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
            '<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}'
            'body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style>'
            '</head><body>{}</body></html>')


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def do_GET(self):
        if self.path.endswith('?artifact'):
            name = os.path.join(ROOT, self.path[1:-len('?artifact')])
            with open(name, encoding='utf-8') as f:
                body = SKELETON.replace('{}', f.read()).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('page')
    ap.add_argument('out')
    ap.add_argument('--w', type=int, default=390)
    ap.add_argument('--h', type=int, default=844)
    ap.add_argument('--dpr', type=float, default=2)
    ap.add_argument('--wait', type=int, default=1200)
    ap.add_argument('--steps', default='')
    ap.add_argument('--steps-file', default='')
    ap.add_argument('--hash', default='')
    ap.add_argument('--artifact', action='store_true')
    a = ap.parse_args()

    handler = functools.partial(Quiet, directory=ROOT)
    srv = socketserver.TCPServer(('127.0.0.1', 0), handler)
    port = srv.server_address[1]
    threading.Thread(target=srv.serve_forever, daemon=True).start()

    errors = 0
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={'width': a.w, 'height': a.h}, device_scale_factor=a.dpr, is_mobile=a.w < 600, has_touch=a.w < 600)
        page = ctx.new_page()

        def on_console(m):
            nonlocal errors
            if m.type in ('error', 'warning'):
                errors += m.type == 'error'
                print(f'[console {m.type}] {m.text}')

        page.on('console', on_console)
        page.on('pageerror', lambda e: (print(f'[pageerror] {e}'), sys.stdout.flush()))
        page.goto(f'http://127.0.0.1:{port}/{a.page}' + ('?artifact' if a.artifact else '') + a.hash)
        page.wait_for_timeout(a.wait)
        shots = 0
        steps = [s.strip() for s in a.steps.split(';') if s.strip()]
        if a.steps_file:
            with open(a.steps_file, encoding='utf-8') as f:
                steps = [s.strip() for s in f.read().splitlines() if s.strip() and not s.startswith('#')]
        for step in steps:
            kind, _, arg = step.partition(':')
            if kind == 'wait':
                page.wait_for_timeout(int(arg))
            elif kind == 'shot':
                page.screenshot(path=arg)
                shots += 1
                print('saved', arg)
            elif kind == 'js':
                r = page.evaluate(arg)
                if r is not None:
                    print('js ->', r)
            elif kind == 'until':
                page.wait_for_function(arg, timeout=180000, polling=50)
            elif kind == 'click':
                page.click(arg)
            elif kind == 'tap':
                x, y = arg.split(',')
                page.mouse.click(float(x), float(y))
            elif kind == 'size':
                w, h = arg.split(',')
                page.set_viewport_size({'width': int(w), 'height': int(h)})
        if not shots or a.out != '-':
            page.screenshot(path=a.out)
            print('saved', a.out)
        b.close()
    srv.shutdown()
    print('console errors:', errors)


if __name__ == '__main__':
    main()
