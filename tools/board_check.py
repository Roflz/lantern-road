"""Checks the Recruit Board's panel and the Hearth's dock (docs/mockups/recruit-board.html and hearth-dock.html, approved
2026-11-05; RecruitBoard in js/buildings.js, js/firstpick.js, js/camp.js, js/tip.js) in headless Chromium through
real input, at the frame's sizes, and saves their screenshots.

  python tools/board_check.py                                              # every size
  python tools/board_check.py --sizes 844x390 --shots docs/screens         # screenshots in board/ and dock/

The first pick, on a new game: three rows, each Free, no ✕, Wick's line; a tap on a row is his line on the class and
the pointer over its +; + asks first (Free, Cancel and Hire); Hire ends in the reveal (the hero's name and why they
signed on); a tap goes on, with one hero.
The dock, on a save with 1-1 to 1-8 lit: 48 tall along the bottom, 16 from each side; gold and Bone Dust as icon and
number with tooltips, a + by each (the Toll House's and the Scavenger Camp's word, or the building); Set out in the
middle flies up the road (the dock goes, and comes back); the six menu objects, each named in a tooltip, open the board,
Heroes, Tactics, the Bag, the Codex (Help) and Settings; the anchors Wick's guide hangs on are there; the scene sits 22
design pixels higher; gold coming in glints and counts up; Collect rises over the menus at the right once the buildings
view is open (clear of the Recruit Board's plaque); on the road the gold shows at the top right; from three materials
they sit in two rows, and big numbers shorten (48.2k, 1.9k).
The board: a row per recruit (level, portrait, name, class, price, +; no stats), the class's tooltip (where they stand
and what they do), hires left, the timer and the roster along the top, a locked notice under the last row; + asks first
(the price, gold before and after, Cancel and Hire); Hire ends in the reveal, then the board without them, the gold
paid and a pick spent; short of gold Hire is grey and its tooltip says how short; a tap on a row opens the recruit's
card (their stats, Hire); the Upgrades tab's three ranks (Upgrade grey and named short when you can't pay, a rank
bought when you can); ✕ closes it. Prices are the model's (Base.recruitPrice): only the first pick is free.
Everywhere: no pixel font and no letter-spaced capitals on these screens. Console errors fail the run.
"""
import argparse, functools, http.server, os, socketserver, sys, threading
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SIZES = '844x390,1280x720,390x844t'

HELPERS = """
window.__toClient = (x, y) => {
  const r = document.getElementById('stage').getBoundingClientRect(), k = Frame.k;
  return Frame.turned ? [r.left + (Frame.H - y) * k, r.top + x * k] : [r.left + x * k, r.top + y * k];
};
window.__el = q => (typeof q === 'string' ? document.querySelector(q) : q);
window.__mid = q => { const el = __el(q); if (!el) return null; const r = el.getBoundingClientRect(); return r.width ? [r.left + r.width / 2, r.top + r.height / 2] : null; };
window.__box = q => { const el = __el(q); if (!el) return null; const b = Frame.box(el, document.getElementById('stage')); return [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)]; };
window.__tip = () => { const t = document.querySelector('#stage > .tp'); return t ? [t.querySelector('b').textContent, t.querySelector('span') ? t.querySelector('span').textContent : ''] : null; };
// every element with text of its own under root: its font and letter-spacing (no pixel font, no spaced capitals)
window.__type = root => { const out = []; for (const el of document.querySelectorAll(root)) for (const n of [el, ...el.querySelectorAll('*')]) { if (![...n.childNodes].some(c => c.nodeType === 3 && c.textContent.trim())) continue; const cs = getComputedStyle(n); if (/Silkscreen/.test(cs.fontFamily) || (cs.letterSpacing !== 'normal' && parseFloat(cs.letterSpacing) > 0.5) || cs.textTransform === 'uppercase') out.push(n.className + ':' + n.textContent.trim().slice(0, 20) + ':' + cs.fontFamily.split(',')[0] + ':' + cs.letterSpacing); } return out; };
'ok'
"""

# 1-1 to 1-8 lit, four heroes at level 5 or 6 (the dock mockup's middle of Region I), 1,240 gold and 34 Bone Dust, the
# board open with its own three. The buildings view waits (no blueprint comes before the Sexton, and Wick hasn't shown
# it: save.guide.camp).
SETUP = """
() => {
  const s = Save.state;
  const P = (cls, name, level) => {
    const c = s.roster.length ? Hero.create(cls, 'c' + s.nextId++, { name, level }) : Base.newGame(cls, s, { name });
    if (level > 1 && c.level < level) Hero.gainXp(c, Hero.xpBetween(c.level, level));
    Hero.autoBuild(c);
    if (!s.roster.includes(c)) { s.roster.push(c); Base.place(c, s); }
    Tactics.owner(c.id);
    return c;
  };
  closeScreen(); closeSheet();
  if (typeof FirstSession !== 'undefined') FirstSession.skip();
  s.guide.camp = false;
  s.settings.tips = false;
  if (!s.roster.length) P('sellsword', 'Fulke', 6);
  P('pilgrim', 'Agnes', 6); P('warden', 'Osric', 5); P('crossbowman', 'Mira', 4);
  for (let k = 0; k < 8; k++) Proto.lightNext(s);
  s.board.refreshedAt = 0;
  Base.tick(s);
  s.currencies.gold = 1240; s.currencies.mats.bone_dust = 34;
  Save.commit();
  App.go('home', {}, { instant: true });
  return 'ok';
}
"""


class Server(socketserver.ThreadingTCPServer):
    daemon_threads = True
    request_queue_size = 64


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--sizes', default=SIZES)
    ap.add_argument('--shots', default='', help='a folder: the screenshots go in its board/ and dock/')
    a = ap.parse_args()
    srv = Server(('127.0.0.1', 0), functools.partial(Quiet, directory=ROOT))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    port = srv.server_address[1]
    fails, errors = [], []
    if a.shots:
        for d in ('board', 'dock'):
            os.makedirs(os.path.join(a.shots, d), exist_ok=True)

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
            page.wait_for_timeout(700)
            js(HELPERS)
            cdp = ctx.new_cdp_session(page)
            W = js('Frame.W')
            print(f'{w}x{h}{" touch" if touch else ""}: frame {W} wide{", turned" if js("Frame.turned") else ""}')
            fmt = lambda n: f'{n:,}'

            def shot(folder, name):
                if a.shots and w == 844 and h == 390:
                    page.screenshot(path=os.path.join(a.shots, folder, f'{name}-{w}x{h}.png'))

            def press(q, wait=500):
                c = js('q => __mid(q)', q) if isinstance(q, str) else q
                if not c:
                    return False
                if touch:
                    page.touchscreen.tap(*c)
                else:
                    page.mouse.click(*c)
                page.wait_for_timeout(wait)
                return True

            def tip(q):
                """The tooltip on q: a hover with the mouse, a press held with a finger. Returns [title, line] or None."""
                c = js('q => __mid(q)', q)
                if not c:
                    return None
                if touch:
                    cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': c[0], 'y': c[1]}]})
                    page.wait_for_timeout(650)
                    t = js('__tip()')
                    cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
                    page.wait_for_timeout(150)
                    return t
                page.mouse.move(*c)
                page.wait_for_timeout(250)
                return js('__tip()')

            def untip():
                if touch:
                    js("Tip.hide()")
                else:
                    page.mouse.move(2, 2)
                page.wait_for_timeout(150)

            def typeface(root, what):
                bad = js('r => __type(r)', root)
                check(not bad, f'{what}: two faces, no pixel font, no spaced capitals' + ('' if not bad else f' ({bad[:4]})'))

            # ── 1. the first pick, on a new game (Wick's session skipped: the board's own panel opens at the Hearth)
            js("FirstSession.skip(); App.go('home', {}, { instant: true }); 'ok'")
            page.wait_for_timeout(900)
            if not js('FirstPick.shown'):
                js("FirstPick.open({ mode: 'pick' }); 'ok'")
                page.wait_for_timeout(600)
            check(js('FirstPick.shown') and js("!!document.querySelector('#sheet.firstpick .fp .rb.first')"), 'a new game: the first pick is the board\'s own panel')
            rows = js("[...document.querySelectorAll('#sheet .fp [data-tut=pick-card]')].map(r => [r.dataset.cls, r.querySelector('.rb-price').textContent, r.querySelector('.rb-who b').textContent])")
            check(len(rows) == 3 and all(r[1] == 'Free' for r in rows) and all(r[2] for r in rows), f'three rows, each named and Free: {rows}')
            check(not js("!!document.querySelector('#sheet .fp .rb-x')") and not js("!!document.querySelector('#sheet .fp .rb-tabs, #sheet .fp .rb-st')"), 'no ✕, no tabs, no counts')
            check(js("document.querySelector('#sheet .fp .wick-bubble').textContent").startswith('Three looking for work'), 'Wick: “Three looking for work…”')
            if not touch:
                page.mouse.move(2, 2)  # (the title's tap left the mouse over a row)
            page.wait_for_timeout(400)
            shot('board', 'first')
            k = [r[0] for r in rows].index('sellsword')
            press(js(f"__mid(document.querySelectorAll('#sheet .fp [data-tut=pick-card]')[{k}])"))
            bub = js("document.querySelector('#sheet .fp .wick-bubble').textContent")
            arrow = js("(() => { const a = document.querySelector('#sheet .fp .fp-arrow'), p = document.querySelectorAll('#sheet .fp [data-tut=pick-plus]')[%d]; if (!a || a.hidden) return null; const A = __box(a), P = __box(p); return [A[0] + A[2] / 2 - (P[0] + P[2] / 2), P[1] - (A[1] + A[3])]; })()" % k)
            check(bub.startswith('Hits hardest') and js(f"document.querySelectorAll('#sheet .fp .rb-row')[{k}].classList.contains('on')"), f'a tap on a row: Wick\'s line on the class (“{bub}”), the row in the light')
            check(bool(arrow) and abs(arrow[0]) <= 1 and 0 <= arrow[1] <= 8, f'  and the pointer over its + ({arrow})')
            shot('board', 'firstsel')
            press(js(f"__mid(document.querySelectorAll('#sheet .fp [data-tut=pick-plus]')[{k}])"))
            cf = js("(() => { const m = document.querySelector('#sheet .fp .rb-modal'); return m ? [m.querySelector('h3').textContent, m.querySelector('.rb-pr').textContent, !!m.querySelector('.rb-af'), m.querySelector('[data-tut=pick-hire]').disabled] : null; })()")
            check(bool(cf) and cf[0] == f'Hire {rows[k][2]}?' and cf[1] == 'Free' and not cf[2] and not cf[3], f'+ asks first: “Hire {rows[k][2]}?”, Free, Hire ({cf})')
            press('#sheet .fp .rb-btn.quiet')
            check(not js("!!document.querySelector('#sheet .fp .rb-modal')") and js('Save.state.roster.length') == 0, '  Cancel goes back, nobody hired')
            press(js(f"__mid(document.querySelectorAll('#sheet .fp [data-tut=pick-plus]')[{k}])"))
            press('[data-tut=pick-hire]', 900)
            said = js("(() => { const e = document.querySelector('[data-tut=pick-says]'); return e ? e.textContent : ''; })()")
            check(js("!!document.querySelector('#sheet .fp [data-tut=pick-reveal]')") and said == js("SIGN_ON.sellsword") and js("document.querySelector('.rb-rpl b').textContent") == rows[k][2], f'Hire: the reveal, {rows[k][2]} and why they signed on')
            shot('board', 'reveal')
            press(js(f'__toClient({W / 2}, 200)'), 700)
            check(not js('FirstPick.shown') and js('Save.state.roster.length') == 1 and js('Save.state.roster[0].name') == rows[k][2], 'a tap goes on: one hero, the name the row showed')
            typeface('#sheet', 'the first pick')

            # ── 2. the dock
            js(f'({SETUP})()')
            page.wait_for_timeout(1500)
            dock = js("__box('.camp .cv-dock')")
            check(dock == [0, 342, W, 48], f'the dock: 48 tall along the bottom, the frame\'s width ({dock})')
            res, objs, so = js("__box('.cv-res')"), js("__box('.cv-objs')"), js("__box('[data-tut=hearth-setout]')")
            # (a 16:9 frame has less room: there Set out may sit off the middle, as long as it keeps clear of both)
            mid = abs(so[0] + so[2] / 2 - W / 2) <= 1 or W < 780
            clear = so[0] - (res[0] + res[2]) >= 16 and objs[0] - (so[0] + so[2]) >= 16
            check(res[0] == 16 and objs[0] + objs[2] == W - 16 and mid and clear, f'gold and materials 16 from the left, the menus 16 from the right, Set out in the middle, 16 clear of both ({res}, {objs}, {so})')
            gold = js("document.querySelector('[data-tut=hearth-gold] b').textContent")
            mats = js("[...document.querySelectorAll('.cv-mats .cv-rs')].map(m => m.dataset.res + ':' + m.textContent)")
            check(gold == '1,240' and mats == ['bone_dust:34'], f'gold and Bone Dust as icon and number ({gold}, {mats})')
            t = tip('[data-tut=hearth-gold]')
            check(bool(t) and t[0] == 'Gold' and t[1].startswith('1,240'), f'  gold\'s tooltip ({t})')
            untip()
            t = tip('.cv-mats [data-res=bone_dust]')
            check(bool(t) and t[0] == 'Bone Dust' and 'Gravefields' in t[1], f'  Bone Dust\'s tooltip ({t})')
            shot('dock', 'tip')
            untip()
            names = js("[...document.querySelectorAll('.cv-objs .cv-ob')].map(o => o.getAttribute('aria-label') + ':' + o.dataset.tut + ':' + ([...o.childNodes].some(n => (n.nodeType === 3 && n.textContent.trim()) || (n.tagName === 'SPAN')) ? 'label' : ''))")
            check(names == ['Recruit Board:hearth-board:', 'Heroes:hearth-heroes:', 'Tactics:hearth-tactics:', 'Bag:hearth-bag:', 'Codex:hearth-codex:', 'Settings:hearth-settings:'], f'the six menus, drawn things with no labels ({names})')
            t = tip('[data-tut=hearth-tactics]')
            check(bool(t) and t[0] == 'Tactics', f'  each named in a tooltip ({t})')
            shot('dock', 'tipmenu')
            untip()
            anchors = js("['hearth-me','hearth-goal','hearth-formation','hearth-gold','hearth-setout','hearth-board','hearth-heroes','hearth-tactics','hearth-bag','hearth-codex','hearth-settings'].filter(k => !document.querySelector(`.camp [data-tut=${k}]`))")
            check(not anchors, f'the anchors for Wick\'s guide are there (missing: {anchors})')
            cam = js("(() => { const o = Camp.scene.out, f = o.anchors.find(q => q.id === 'fire'); return [o.cam.v.cy, CampScene.VIEWS.party.cy, f ? f.box[3] * 2 : null]; })()")
            check(abs(cam[0] - (cam[1] - 11)) < 0.01 and cam[2] is not None and cam[2] < 342 - 24, f'the scene sits 22 design px higher, the fire well clear of the dock ({cam})')
            typeface('.camp .cv-dock, .camp .cv-me, .camp .cv-goal, .camp .cv-form, .camp .cv-banner, .camp .cv-col', 'the Hearth\'s HUD')
            shot('dock', 'party')
            # + by gold and by the materials: the Toll House and the Scavenger Camp (here, where their plans come from:
            # Bess's quest, and 2-5)
            js("document.querySelectorAll('#toasts .toast').forEach(t => t.remove()); 'ok'")
            t = tip('.cv-res .cv-pl[aria-label="More gold"]')
            check(bool(t) and t[0] == 'More gold' and 'Toll House' in t[1], f'+ by gold: “More gold”, the Toll House ({t})')
            shot('dock', 'plus')
            untip()
            # (no building comes before the Sexton: the Toll House's plan is Bess's quest's reward; the Scavenger Camp's
            # comes with 2-5)
            press('.cv-res .cv-pl[aria-label="More gold"]')
            toasts = js("[...document.querySelectorAll('#toasts .toast')].map(t => t.textContent).join(' | ')")
            check(js("document.getElementById('sheet').hidden") and 'Toll House' in toasts and 'Bess' in toasts, f'  a tap: where the Toll House\'s plan comes from, Bess ({toasts})')
            js("closeSheet(); document.querySelectorAll('#toasts .toast').forEach(t => t.remove()); 'ok'")
            page.wait_for_timeout(300)
            press('.cv-res .cv-pl[aria-label="More materials"]')
            toasts = js("[...document.querySelectorAll('#toasts .toast')].map(t => t.textContent).join(' | ')")
            check('Scavenger Camp' in toasts and '2-5' in toasts, f'+ by the materials: where the Scavenger Camp\'s plan comes from ({toasts})')
            # gold coming in: the coin glints, the gain rises, the number counts up
            js("Save.state.currencies.gold += 25; App.refresh(); 'ok'")
            page.wait_for_timeout(120)
            glint = js("[document.querySelector('.cv-coin').classList.contains('glint'), (document.querySelector('.cv-pop') || {}).textContent]")
            page.wait_for_timeout(900)
            check(glint[0] and glint[1] == '+25' and js("document.querySelector('[data-tut=hearth-gold] b').textContent") == '1,265', f'gold coming in glints, rises (+25) and counts up to 1,265 ({glint})')
            js("Save.state.currencies.gold = 1240; App.refresh(); 'ok'")
            # the menus open what they name
            for tut, want, back in [
                ('hearth-heroes', "App.current === 'party'", "App.go('home', {}, { instant: true })"),
                ('hearth-tactics', "App.current === 'tactics'", "App.go('home', {}, { instant: true })"),
                ('hearth-bag', "App.current === 'bag'", "App.go('home', {}, { instant: true })"),
                ('hearth-codex', "!!document.querySelector('#screen:not([hidden]) .page.how')", "closeScreen()"),
                ('hearth-settings', "!!document.querySelector('#sheet:not([hidden]) .setbox')", "closeSheet()"),
                ('hearth-board', "RecruitBoard.shown", "RecruitBoard.close()"),
            ]:
                press(f'.camp [data-tut={tut}]', 700)
                check(js(f'!!({want})'), f'the {tut[7:]} object opens it')
                js(f'{back}; "ok"')
                page.wait_for_timeout(700)
            # Set out flies up the road; the dock goes, and comes back at the fire
            press('.camp [data-tut=hearth-setout]', 2200)
            check(js('Camp.scene.onRoad') and js("getComputedStyle(document.querySelector('.cv-dock')).visibility") == 'hidden', 'Set out flies up the road, and the dock goes')
            rg = js("(() => { const g = document.querySelector('[data-tut=road-gold]'); return g && getComputedStyle(g).visibility === 'visible' ? [__box(g), g.textContent] : null; })()")
            check(bool(rg) and rg[1] == '1,240' and rg[0][0] + rg[0][2] == js('Frame.W') - 18 and rg[0][1] == 13, f'  on the road the gold shows at the top right ({rg})')
            shot('dock', 'road')
            js("Camp.scene.toCamp(true); 'ok'")
            page.wait_for_timeout(1000)
            check(js("getComputedStyle(document.querySelector('.cv-dock')).visibility") == 'visible', '  home again, the dock is back')
            # the buildings view: Collect over the menus while something waits
            check(js("document.querySelector('[data-tut=hearth-collect]').hidden"), 'no Collect before the buildings view opens')
            js("(() => { const s = Save.state; s.unlocks.tollhouse = Date.now(); s.unlocks.trainingyard = Date.now(); Base.ensure(s); s.currencies.gold = 99999; s.currencies.mats.bone_dust = 999; Base.build('tollhouse', 0, s); Base.build('trainingyard', 1, s); Base.proto.skip(6, s); s.currencies.gold = 1240; s.currencies.mats.bone_dust = 34; Save.commit(); App.go('home', {}, { instant: true }); })(); 'ok'")
            page.wait_for_timeout(1200)
            js("Camp.scene.go('build', true); 'ok'")
            page.wait_for_timeout(1500)
            col = js("(() => { const c = document.querySelector('[data-tut=hearth-collect]'); return c && !c.hidden ? [__box(c), c.textContent] : null; })()")
            check(bool(col) and col[0][0] + col[0][2] == js('Frame.W') - 16 and col[0][1] + col[0][3] == 342 - 8 and 'Collect' in col[1], f'the buildings view: Collect rises over the menus, 8 above the dock ({col})')
            check(js("getComputedStyle(document.querySelector('[data-tut=hearth-setout]')).visibility") == 'visible', '  and Set out stays in the dock')
            shot('dock', 'build')
            g0 = js('Save.state.currencies.gold')
            press('[data-tut=hearth-collect]', 700)
            check(js('Save.state.currencies.gold') > g0 and js("document.querySelector('[data-tut=hearth-collect]').hidden"), f'Collect gathers it, and goes ({g0} → {js("Save.state.currencies.gold")})')
            js("Camp.scene.go('party', true); 'ok'")
            page.wait_for_timeout(1200)
            # in the party view, Collect stays clear of the Recruit Board's plaque
            js("(() => { const s = Save.state; Base.proto.skip(6, s); s.currencies.gold = 1240; Save.commit(); App.refresh(); })(); 'ok'")
            page.wait_for_timeout(1300)
            clear = js("(() => { const c = document.querySelector('[data-tut=hearth-collect]'), p = document.querySelector('.cv-plq[data-id=board]'); if (!c || c.hidden || !p) return null; const a = __box(c), b = __box(p); return [a, b, a[0] >= b[0] + b[2] || b[0] >= a[0] + a[2] || a[1] >= b[1] + b[3] || b[1] >= a[1] + a[3]]; })()")
            check(bool(clear) and clear[2], f'the party view: Collect clear of the Recruit Board\'s plaque ({clear})')
            shot('dock', 'collect')
            press('[data-tut=hearth-collect]', 700)
            # later: five materials in two rows, big numbers shortened
            js("(() => { const s = Save.state; s.currencies.gold = 48210; Object.assign(s.currencies.mats, { bone_dust: 1904, chapel_wax: 862, heartwood: 411, cinder_iron: 96, throne_tallow: 1 }); Save.commit(); App.refresh(); })(); 'ok'")
            page.wait_for_timeout(1300)
            late = js("[document.querySelector('.cv-mats').classList.contains('grid'), document.querySelector('[data-tut=hearth-gold] b').textContent, [...document.querySelectorAll('.cv-mats .cv-rs b')].map(b => b.textContent)]")
            check(late[0] and late[1] == '48.2k' and late[2][:3] == ['1.9k', '862', '411'], f'later: the materials in two rows, gold and big numbers shortened ({late})')
            nogap = js("(() => { const r = __box('.cv-res'), s = __box('[data-tut=hearth-setout]'); return s[0] - (r[0] + r[2]); })()")
            check(nogap >= 16, f'  and clear of Set out ({nogap} px)')
            shot('dock', 'late')

            # ── 3. the board
            js("(() => { const s = Save.state; s.currencies.gold = 1240; Object.assign(s.currencies.mats, { bone_dust: 34, chapel_wax: 0, heartwood: 0, cinder_iron: 0, throne_tallow: 0 }); Save.commit(); App.go('home', {}, { instant: true }); })(); 'ok'")
            page.wait_for_timeout(1200)
            press('.camp .cv-plq[data-id="board"]', 800)
            check(js('RecruitBoard.shown'), 'a tap on the Recruit Board in the scene opens its panel')
            page.wait_for_timeout(500)
            rec = js("Save.state.board.recruits.map(r => [r.cls, r.name, r.level, Base.recruitPrice(r)])")
            rows = js("[...document.querySelectorAll('#sheet.board .rb-row:not(.locked)')].map(r => [r.dataset.cls, r.querySelector('.rb-who b').textContent, +r.querySelector('.rb-lv').textContent, r.querySelector('.rb-price').textContent, !!r.querySelector('.rb-pt img'), !!r.querySelector('[data-tut=pick-plus]'), r.querySelectorAll('.rb-stat, .rng').length])")
            check(len(rows) == len(rec) and all(r[0] == q[0] and r[1] == q[1] and r[2] == q[2] and r[3] == fmt(q[3]) and r[4] and r[5] and not r[6] for r, q in zip(rows, rec)), f'a row per recruit: level, portrait, name, class, the model\'s price and +, no stats ({rows})')
            top = js("[...document.querySelectorAll('#sheet.board .rb-top > *')].map(e => e.className + ':' + e.textContent)")
            check(len(top) == 6 and top[0].endswith(':1') and 'board-timer' in js("document.querySelector('#sheet.board .rb-top [data-tut=board-timer]') ? 'board-timer' : ''") and top[2].endswith(f':{js("Save.state.roster.length")}/{js("Base.rosterCap()")}') and top[4].endswith('1,240'), f'along the top: hires left, the timer, the roster, gold and ✕ ({top})')
            t = tip('#sheet.board [data-tut=board-timer]')
            check(bool(t) and t[0] == 'New board', f'  the timer\'s tooltip ({t})')
            untip()
            t = tip('#sheet.board .rb-row:not(.locked) .rb-cl')
            want = js("(() => { const c = Save.state.board.recruits[0].cls, S = RecruitBoard.stance(c); return [CLASSES[c].name, S[0] + ' · ' + S[1]]; })()")
            check(t == want, f'the class\'s tooltip: where they stand and what they do ({t})')
            shot('board', 'tip')
            untip()
            locked = js("(() => { const l = document.querySelector('#sheet.board .rb-row.locked'); return l ? l.previousElementSibling.classList.contains('rb-row') : false; })()")
            t = tip('#sheet.board .rb-row.locked .rb-pt')
            check(locked and bool(t) and t[0] == 'A fourth notice' and t[1] == 'Notices, rank 1', f'a locked notice under the last row, its tooltip naming the rank ({t})')
            untip()
            shot('board', 'board')
            typeface('#sheet.board', 'the board')
            # + asks first, Cancel; + again, Hire, the reveal, back to the board without them
            r0 = rec[0]
            press('#sheet.board .rb-row:not(.locked) [data-tut=pick-plus]')
            cf = js("(() => { const m = document.querySelector('#sheet.board .rb-modal'); return m ? [m.querySelector('h3').textContent, m.querySelector('.rb-pr').textContent, m.querySelector('.rb-af').textContent, m.querySelector('[data-tut=pick-hire]').disabled] : null; })()")
            check(bool(cf) and cf[0] == f'Hire {r0[1]}?' and cf[1] == fmt(r0[3]) and cf[2] == f'1,240→{fmt(1240 - r0[3])}' and not cf[3], f'+ asks first: the recruit, the price, gold before and after, Hire ({cf})')
            shot('board', 'confirm')
            typeface('#sheet.board .rb-modal', 'the confirmation')
            press('#sheet.board .rb-modal .rb-btn.quiet')
            check(not js("!!document.querySelector('#sheet.board .rb-modal')"), '  Cancel goes back')
            n0, picks = js('Save.state.roster.length'), js('Save.state.board.picks')
            press('#sheet.board .rb-row:not(.locked) [data-tut=pick-plus]')
            press('#sheet.board [data-tut=pick-hire]', 900)
            check(js("!!document.querySelector('#sheet.board [data-tut=pick-reveal]')") and js("document.querySelector('[data-tut=pick-says]').textContent") == js(f"SIGN_ON['{r0[0]}']"), 'Hire: the reveal, and why they signed on')
            press(js(f'__toClient({W / 2}, 200)'), 700)
            after = js("[Save.state.roster.length, Save.state.board.picks, Save.state.currencies.gold, document.querySelectorAll('#sheet.board .rb-row:not(.locked)').length, !!document.querySelector('#sheet.board .rb-reveal')]")
            check(after[0] == n0 + 1 and after[1] == picks - 1 and after[2] == 1240 - r0[3] and after[3] == len(rec) - 1 and not after[4], f'a tap goes on: the board without them, the gold paid, a pick spent ({after})')
            # short of gold, and out of picks: Hire grey, its tooltip says why
            js("Save.state.board.picks = 1; Save.state.currencies.gold = 160; Save.commit(); RecruitBoard.close(); Buildings.open('recruitboard'); 'ok'")
            page.wait_for_timeout(700)
            price = js("Base.recruitPrice(Save.state.board.recruits[0])")
            press('#sheet.board .rb-row:not(.locked) [data-tut=pick-plus]')
            cf = js("(() => { const m = document.querySelector('#sheet.board .rb-modal'); return m ? [m.querySelector('[data-tut=pick-hire]').disabled, m.querySelector('.rb-af .b').textContent] : null; })()")
            t = tip('#sheet.board .rb-modal .rb-hw')
            check(bool(cf) and cf[0] and cf[1] == '−' + fmt(price - 160) and bool(t) and t[0] == f'{fmt(price - 160)} short', f'short of gold: the after in red, Hire grey, “{fmt(price - 160)} short” ({cf}, {t})')
            shot('board', 'short')
            untip()
            press('#sheet.board .rb-modal .rb-btn.quiet')
            # a tap on a row: the recruit's card, their stats, Hire (which asks first), ‹ back
            press('#sheet.board .rb-row:not(.locked) .rb-lv')
            card = js("(() => { const c = document.querySelector('#sheet.board .rb-hc'); return c ? [c.querySelector('.rb-fig b').textContent, c.querySelectorAll('.rb-stat').length, !!c.querySelector('[data-tut=pick-hire]')] : null; })()")
            check(bool(card) and card[0] == js("Save.state.board.recruits[0].name") and card[1] == 7 and card[2], f'a tap on a row: the recruit\'s card, seven stats and Hire ({card})')
            shot('board', 'card')
            typeface('#sheet.board .rb-hc', "the recruit's card")
            press('#sheet.board .rb-hc [data-tut=pick-hire]')
            check(js("!!document.querySelector('#sheet.board .rb-modal') && !document.querySelector('#sheet.board .rb-hc')"), '  its Hire asks first')
            press('#sheet.board .rb-modal .rb-btn.quiet')
            press('#sheet.board .rb-row:not(.locked) .rb-lv')
            press('#sheet.board .rb-hc .rb-back')
            check(not js("!!document.querySelector('#sheet.board .rb-hc')"), '  ‹ goes back to the board')
            # the Upgrades tab: three ranks; Upgrade grey when short, a rank bought when not
            press('#sheet.board [data-tut=board-upgrades]')
            trk = js("[...document.querySelectorAll('#sheet.board .rb-row.trk')].map(r => [r.querySelector('.rb-tn b').textContent, r.querySelector('.rb-ch').textContent, r.querySelector('.rb-btn') ? r.querySelector('.rb-btn').disabled : null])")
            check([t[0] for t in trk] == ['Notices', 'Picks', 'Veterans'] and trk[0][1] == '3→4' and all(t[2] for t in trk), f'the Upgrades tab: Notices, Picks and Veterans, what the next rank changes, Upgrade grey ({trk})')
            t = tip('#sheet.board .rb-row.trk .rb-hw')
            check(bool(t) and t[0].endswith('short') and 'gold' in t[0], f'  its tooltip says what\'s short ({t})')
            untip()
            js("Save.state.currencies.gold = 1240; Save.commit(); RecruitBoard.close(); Buildings.open('recruitboard'); 'ok'")
            page.wait_for_timeout(600)
            press('#sheet.board [data-tut=board-upgrades]')
            untip()
            shot('board', 'upgrades')
            typeface('#sheet.board', 'the Upgrades tab')
            press('#sheet.board .rb-row.trk .rb-btn')
            check(js('Save.state.board.ranks.notices') == 1 and js('Save.state.currencies.gold') == 640 and js("document.querySelectorAll('#sheet.board .rb-row.trk')[0].querySelectorAll('.rb-pips i.on').length") == 1, 'Upgrade buys a rank: 600 gold and 12 Bone Dust, one pip')
            # only the first pick is free: the board's every recruit has a price; and ✕ closes it
            js("RecruitBoard.close(); Base.rollBoard(Save.state, 'home'); Save.commit(); Buildings.open('recruitboard'); 'ok'")
            page.wait_for_timeout(600)
            prices = js("[...document.querySelectorAll('#sheet.board .rb-row:not(.locked) .rb-price')].map(p => p.textContent)")
            check(prices and all(p != 'Free' and p.replace(',', '').isdigit() for p in prices), f'the board: a price on each recruit, none Free ({prices})')
            press('#sheet.board .rb-x')
            check(not js('RecruitBoard.shown') and js("document.getElementById('sheet').hidden"), '✕ closes the board')
            ctx.close()
        b.close()
    srv.shutdown()
    for e in errors:
        print('  console:', e)
    print(f'{len(fails)} failed' + (f', {len(errors)} console errors' if errors else ''))
    sys.exit(1 if fails or errors else 0)


if __name__ == '__main__':
    main()
