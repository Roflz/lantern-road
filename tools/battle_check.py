"""Checks the battle screen's Pause and its turn order (js/battle.js, js/main.js) in headless Chromium, through real
taps, and takes screenshots of the flags.

  python tools/battle_check.py [--sizes 844x390] [--scenes pause,menu,guide] [--shots docs/screens/battle] [--prefix after-]

pause  A four-hero battle at 1-7, at 1x. Pause pressed during the walk in: the battle stops before the first turn.
       Pause pressed early in a turn: the button says Play at once, the turn plays out (the clock runs to the turn's
       end), and the battle stops before the next turn; the first flag is then the next turn to act, and none is marked
       now. Turn from there plays one turn (its flag on top, marked now, while it plays) and stops before the next, the
       first flag the turn after it. Play carries on. Pause in the last turn: the last blow lands, and the battle stops
       before Victory, with no flags left; Play ends it.
menu   The pause menu still stops the clock at once, mid-move, with the turn on screen still marked now; Resume plays
       on. Pause, then the menu, then Resume: the move finishes and the battle stops before the next turn. With a
       Healing Draught packed, aiming it stops the clock at once too, and Cancel plays on.
guide  Wick's first session at 1-1's first turn (js/firstsession.js, step 6): it stops the clock at once, mid-turn, and
       lights the turn order; the first flag is the turn being played, marked now.
Screenshots (with --shots): <prefix>walkin, <prefix>paused, <prefix>playing, <prefix>stepped, <prefix>last,
<prefix>guide, each -<w>x<h>.png.
"""
import argparse, functools, http.server, os, socketserver, sys, threading
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

# A fresh save, Wick's session skipped (the guide scene puts it back at the turn order), tips off, 1x; then the battle.
SETUP = """
(scene) => {
  const s = Save.state, P = (cls, name, level) => {
    const c = s.roster.length ? Hero.create(cls, 'c' + s.nextId++, { name, level }) : Base.newGame(cls, s, { name });
    if (level > 1 && c.level < level) Hero.gainXp(c, Hero.xpBetween(c.level, level));
    Hero.autoBuild(c);
    if (!s.roster.includes(c)) { s.roster.push(c); Base.place(c, s); }
    Tactics.owner(c.id);
    return c;
  };
  closeScreen();
  if (typeof FirstSession !== 'undefined') FirstSession.skip();
  s.settings.tips = false; s.settings.speed = 1; Battle.setSpeed(1);
  let stage = 0, seed = 1;
  if (scene === 'guide') P('sellsword', 'Fulke', 1);
  else {
    P('sellsword', 'Fulke', 4); P('pilgrim', 'Agnes', 4); P('warden', 'Osric', 4); P('crossbowman', 'Mira', 3);
    for (let k = 0; k < 6; k++) Proto.lightNext(s);
    stage = 6; s.campaign.road.keepGoing = false;
    // a win long enough to press things in
    while (seed < 400) { const r = simulate(Campaign.setup(stage, seed)); if (r.winner === 0 && r.log.filter(e => e.t === 'turn').length >= 14) break; seed++; }
  }
  Base.tick(s);
  Save.commit();
  App.go('battle', { stage, seed });
  // Wick's session, back at 1-1's turn order (set once the battle is on screen, so the Hearth doesn't take it back)
  if (scene === 'guide') { s.guide.done = false; s.guide.step = 'order'; Save.commit(); }
  return seed;
}
"""

HELPERS = """
// the battle as it stands: the turn on screen (k), the play clock (t), where that turn ends (until), the next beat
window.__b = () => {
  const B = Battle.battle, p = Battle.progress();
  if (!B) return null;
  return { k: B.curK, t: p.t, until: B.turnUntil, next: B.res.log[B.i] ? B.res.log[B.i].t : null, n: B.turns.length,
    paused: Battle.paused, pausing: !!Battle.pausing, started: B.started, over: B.over,
    label: document.getElementById('bPlay').getAttribute('aria-label'), tag: !document.getElementById('pausedTag').hidden };
};
// the flags on show, left to right: who, the skill, and whether it's marked now
window.__flags = () => [...document.querySelectorAll('#flags .flag.in')].sort((a, b) => parseFloat(a.style.left) - parseFloat(b.style.left))
  .map(el => ({ who: el.querySelector('.who').textContent, skn: el.querySelector('.skn').textContent, now: el.classList.contains('now') }));
// Which turn the first flag is: the k whose turns, from k on, read as the flags do (null if none does).
window.__firstK = () => {
  const B = Battle.battle, f = __flags();
  if (!B || !f.length) return null;
  const unit = id => B.res.start.find(u => u.id === id) || (B.res.log.find(e => e.t === 'summon' && e.unit.id === id) || {}).unit;
  const say = t => { const sk = t.skill && SKILLS[t.skill]; return { who: (unit(t.who) || {}).name, skn: sk ? sk.name : t.skip ? 'Stunned' : 'Succumbs' }; };
  for (let k = Math.max(0, B.curK - 1); k <= B.curK + 2; k++) {
    const want = B.turns.slice(k, k + f.length).map(say);
    if (want.length === f.length && want.every((w, j) => w.who === f[j].who && w.skn === f[j].skn)) return k;
  }
  return null;
};
window.__mid = el => { if (typeof el === 'string') el = document.querySelector(el); if (!el) return null; const r = el.getBoundingClientRect(); return r.width ? [r.left + r.width / 2, r.top + r.height / 2] : null; };
'ok'
"""


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--sizes', default='844x390')
    ap.add_argument('--scenes', default='pause,menu,guide')
    ap.add_argument('--shots', default='')
    ap.add_argument('--prefix', default='')
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
        br = p.chromium.launch()
        for size in a.sizes.split(','):
            w, h = (int(v) for v in size.split('x'))
            for scene in a.scenes.split(','):
                ctx = br.new_context(viewport={'width': w, 'height': h}, device_scale_factor=1)
                page = ctx.new_page()
                page.on('console', lambda m, tag=f'{size} {scene}': errors.append(f'{tag}: {m.text}') if m.type == 'error' else None)
                page.on('pageerror', lambda e, tag=f'{size} {scene}': errors.append(f'{tag}: {e}'))
                page.goto(f'http://127.0.0.1:{port}/index.html')
                js = page.evaluate
                page.wait_for_function("typeof Title !== 'undefined' && Title.ready", timeout=60000, polling=50)
                page.click('#title')
                page.wait_for_timeout(700)
                js(HELPERS)
                tag = f'{w}x{h} · {scene}'
                print(f'{tag}:')

                def shot(name):
                    if a.shots:
                        page.screenshot(path=os.path.join(a.shots, f'{a.prefix}{name}-{w}x{h}.png'))

                def tap(sel, wait=0):
                    c = js('__mid', sel)
                    if c:
                        page.mouse.click(*c)
                    if wait:
                        page.wait_for_timeout(wait)
                    return bool(c)

                def wait(cond, timeout=30000):
                    try:
                        page.wait_for_function(cond, timeout=timeout, polling=20)
                        return True
                    except Exception:
                        return False

                def next_turn():
                    """Waits for the next turn to start, and returns the battle a moment into it."""
                    k = js('__b().k')
                    wait(f'__b() && __b().k > {k}')
                    return js('__b()')

                def stopped(b0, what):
                    """The battle has stopped where it should: the turn b0 was playing ran to its end, and the next
                    didn't start; the clock stays still; the first flag is the next turn to act, none marked now."""
                    ok = wait('__b().paused', 30000)
                    b = js('__b()')
                    check(ok and b['k'] == b0['k'] and b['t'] >= b0['until'] - 1 and b['next'] in ('turn', 'end'),
                          f'{tag}: {what}: turn {b0["k"]} played out (clock {b["t"]:.0f} of {b0["until"]:.0f}) and the battle stopped before the next ({b["next"]}, turn {b["k"]})')
                    page.wait_for_timeout(600)
                    b2 = js('__b()')
                    check(b2['t'] == b['t'] and b2['k'] == b['k'], f'{tag}: {what}: the clock stays still')
                    f, k = js('__flags()'), js('__firstK()')
                    check(k == b0['k'] + 1 and not any(x['now'] for x in f), f'{tag}: {what}: the first flag is the next turn to act ({k}, after {b0["k"]}), none marked now ({[("*" if x["now"] else "") + x["who"] for x in f][:3]})')
                    return b2

                if scene == 'guide':
                    js(SETUP, scene)
                    up = wait("Wick.step && !Wick.step.closed && Wick.step.root.classList.contains('in')", 30000)
                    page.wait_for_timeout(500)
                    s = js("(() => { const g = Wick.step; return g && !g.closed ? { text: (g.root.querySelector('.wk-bubble span') || {}).textContent, hole: (() => { const r = g.root.querySelector('.wk-hole'); if (!r) return null; const b = r.getBoundingClientRect(); return [b.left, b.top, b.right, b.bottom]; })() } : null; })()")
                    check(up and s and s['text'].startswith('Battles fight themselves'), f'{tag}: Wick\'s turn-order step is up ({s and s["text"]})')
                    b = js('__b()')
                    check(b['paused'] and b['k'] == 0 and b['t'] < b['until'], f'{tag}: it stopped the clock at once, mid-way through turn 0 ({b["t"]:.0f} of {b["until"]:.0f})')
                    f, k = js('__flags()'), js('__firstK()')
                    check(k == 0 and f and f[0]['now'], f'{tag}: the first flag is the turn being played, marked now')
                    first = js("(() => { const el = [...document.querySelectorAll('#flags .flag.in')].sort((a, b) => parseFloat(a.style.left) - parseFloat(b.style.left))[0]; const b = el.getBoundingClientRect(); return [b.left, b.top, b.right, b.bottom]; })()")
                    hole = s and s['hole']
                    check(bool(hole) and hole[0] <= first[0] + 1 and hole[1] <= first[1] + 1 and hole[2] >= first[2] - 1 and hole[3] >= first[3] - 1, f'{tag}: the spotlight takes in the first flag (hole {hole}, flag {first})')
                    shot('guide')
                    page.mouse.click(w / 2, h * 0.6)
                    page.wait_for_timeout(500)
                    check(not js('Battle.paused') and js('!Wick.step || Wick.step.closed'), f'{tag}: a tap, and the battle plays on')
                    ctx.close()
                    continue

                seed = js(SETUP, scene)
                wait('Battle.busy && __b()')
                print(f'    1-7, seed {seed}, {js("__b().n")} turns; packed: {js("(Battle.battle.res.loadout || []).join() || 'nothing'")}')

                if scene == 'pause':
                    # ── Pause in the walk in: the party walks up, and the battle stops before the first turn
                    page.wait_for_timeout(300)
                    b0 = js('__b()')
                    tap('#bPlay')
                    b = js('__b()')
                    check(not b0['started'] and b['label'] == 'Play' and b['tag'], f'{tag}: Pause in the walk in: the button says Play at once, and "Paused" shows')
                    ok = wait('__b().paused', 15000)
                    b = js('__b()')
                    check(ok and b['started'] and b['k'] == -1 and b['next'] == 'turn', f'{tag}: the party walks in, and the battle stops before the first turn (turn {b["k"]}, next {b["next"]})')
                    f, k = js('__flags()'), js('__firstK()')
                    check(k == 0 and not any(x['now'] for x in f), f'{tag}: the first flag is turn 0, none marked now')
                    shot('walkin')
                    tap('#bPlay', 200)
                    check(not js('Battle.paused') and js('__b().label') == 'Pause', f'{tag}: Play plays on')

                    # ── Pause early in a turn
                    wait('__b().k >= 1')
                    b0 = next_turn()
                    tap('#bPlay')
                    b = js('__b()')
                    check(b['k'] == b0['k'] and b['t'] < b0['until'], f'{tag}: Pause pressed mid-move (turn {b["k"]}, clock {b["t"]:.0f} of {b0["until"]:.0f})')
                    check(b['label'] == 'Play' and b['tag'], f'{tag}: the button says Play at once, and "Paused" shows ({b["label"]})')
                    page.wait_for_timeout(150)
                    b1 = js('__b()')
                    check(not b1['paused'] and b1['t'] > b['t'] and b1['k'] == b0['k'], f'{tag}: the move plays on ({b["t"]:.0f} → {b1["t"]:.0f})')
                    stopped(b0, 'Pause')
                    shot('paused')

                    # ── Turn from there: one turn, its flag on top and marked now while it plays, then a stop
                    b0 = js('__b()')
                    tap('#bStep')
                    ok = wait(f'__b().k === {b0["k"] + 1}', 15000)
                    page.wait_for_timeout(120)
                    f, k, b1 = js('__flags()'), js('__firstK()'), js('__b()')
                    check(ok and k == b0['k'] + 1 and f and f[0]['now'], f'{tag}: Turn plays turn {b0["k"] + 1}: its flag on top, marked now')
                    shot('playing')
                    stopped(b1, 'Turn')
                    shot('stepped')

                    # ── Play carries on
                    k0 = js('__b().k')
                    tap('#bPlay', 100)
                    b = js('__b()')
                    check(not b['paused'] and not b['pausing'] and b['label'] == 'Pause' and not b['tag'], f'{tag}: Play: the button says Pause, "Paused" goes')
                    check(wait(f'__b().k > {k0}', 15000), f'{tag}: Play: the next turn starts')

                    # ── Pause in the last turn: the last blow lands, and the battle stops before Victory
                    js('Battle.setSpeed(4)')
                    wait('__b().k >= __b().n - 2', 60000)
                    js('Battle.setSpeed(1)')
                    wait('__b().k === __b().n - 1', 15000)
                    b0 = js('__b()')
                    tap('#bPlay')
                    ok = wait('__b().paused', 15000)
                    b = js('__b()')
                    check(ok and not b['over'] and b['next'] == 'end' and b['t'] >= b0['until'] - 1 and len(js('__flags()')) == 0, f'{tag}: Pause in the last turn: it plays out, and the battle stops before Victory, no flags left (next {b["next"]}, over {b["over"]})')
                    page.wait_for_timeout(500)
                    shot('last')
                    tap('#bPlay')
                    check(wait('Battle.battle && Battle.battle.over', 5000), f'{tag}: Play: Victory')

                elif scene == 'menu':
                    # ── the pause menu stops the clock at once, mid-move
                    wait('__b().k >= 1')
                    b0 = next_turn()
                    tap('#bMenu', 100)
                    b = js('__b()')
                    page.wait_for_timeout(400)
                    b2 = js('__b()')
                    f = js('__flags()')
                    check(b['paused'] and b['k'] == b0['k'] and b['t'] < b0['until'] and b2['t'] == b['t'], f'{tag}: the menu stops the clock at once, mid-move ({b["t"]:.0f} of {b0["until"]:.0f})')
                    check(js('__firstK()') == b0['k'] and f and f[0]['now'], f'{tag}: the turn on screen stays on top, marked now')
                    page.keyboard.press('Escape')
                    page.wait_for_timeout(150)
                    check(not js('Battle.paused') and js('__b().t') > b2['t'], f'{tag}: Resume plays on')

                    # ── Pause, then the menu, then Resume: the move finishes, and the battle stops before the next turn
                    b0 = next_turn()
                    tap('#bPlay')
                    tap('#bMenu', 100)
                    b = js('__b()')
                    check(b['paused'] and b['t'] < b0['until'], f'{tag}: Pause, then the menu: the clock stops at once')
                    page.keyboard.press('Escape')
                    page.wait_for_timeout(100)
                    b = js('__b()')
                    check(not b['paused'] and b['pausing'] and b['label'] == 'Play', f'{tag}: Resume: the move plays on, and Pause still holds')
                    stopped(b0, 'Pause, the menu, Resume')
                    tap('#bPlay', 100)

                    # ── aiming a Healing Draught stops the clock at once; Cancel plays on
                    slot = js("(Battle.battle.res.loadout || []).indexOf('draught')")
                    if slot >= 0:
                        b0 = next_turn()
                        tap(f'.it-btn[data-slot="{slot}"]', 100)
                        b = js('__b()')
                        check(js("!!document.querySelector('.it-aim:not([hidden])')") and b['paused'] and b['t'] < b0['until'], f'{tag}: aiming a draught stops the clock at once, mid-move')
                        tap('.it-aim .it-hint', 150)
                        check(not js('Battle.paused') and js('__b().t') > b['t'], f'{tag}: Cancel plays on')
                    else:
                        print('    (no draught packed: the aim is not checked)')
                ctx.close()
        br.close()
    srv.shutdown()
    for e in errors:
        print('  console error:', e)
    print('result:', 'FAIL' if fails or errors else 'ok', f'({len(fails)} failed, {len(errors)} console errors)')
    sys.exit(1 if fails or errors else 0)


if __name__ == '__main__':
    main()
