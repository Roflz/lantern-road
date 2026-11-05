"""Checks the hero screen (js/sheet.js, screen 8) in headless Chromium through real input, and takes its screenshots.

From a save set up in the page (six heroes, four set out; Agnes the Pilgrim with stat points to place, nothing in her
armour or accessory slots, and three pieces in the Bag she can wear), it opens Formation from the camp's grid and taps
Agnes's portrait, then, with taps where things are drawn (through the quarter-turn when the frame is turned):
  - the arch and the panel sit inside the frame, nothing spills out, and the guide's anchors are there
  - ‹ › step through the party, then the resting heroes, and come round again
  - Stats: + places a point and Reset takes it back; Auto places them all the way the class prefers; Keep keeps them
  - Skills: a tap on a skill shows its card, a second tap watches it in the arch
  - a threshold: a path to choose lights the Skills tab; choosing a tier opens it, and the tree learns a skill
  - Gear: a tap tries a piece on (the arch says so); Auto-equip puts on the best that fits in each slot; Unequip
  - Tactics: one row a tactic plus Otherwise, under the plate Tactics, top first; Edit tactics opens the editor, and
    its Back comes back to them
  - Respec gives the points back; Back returns to the camp with Formation open
  python tools/hero_check.py [--sizes 844x390,667x375t,1280x720,390x844t] [--shots docs/screens/hero]
A size ending in t has a touch screen (and 390x844t is turned).
"""
import argparse, functools, http.server, os, socketserver, sys, threading
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SIZES = '844x390,667x375t,1280x720,390x844t'

SETUP = """
() => {
  const s = Save.state, P = (cls, name, level, fat) => {
    const c = s.roster.length ? Hero.create(cls, 'c' + s.nextId++, { name, level }) : Base.newGame(cls, s, { name });
    if (level > 1 && c.level < level) Hero.gainXp(c, Hero.xpBetween(c.level, level));
    Hero.autoBuild(c);
    c.fatigue = fat; if (fat >= 100) c.spent = true;
    if (!s.roster.includes(c)) { s.roster.push(c); Base.place(c, s); }
    Tactics.owner(c.id);
    return c;
  };
  closeScreen();
  s.settings.tips = false;
  if (typeof FirstSession !== 'undefined') FirstSession.skip(); // Wick's first session: done (tools/guide_check.py walks it)
  const ids = {};
  for (const [k, cls, lv, f] of [['fulke', 'sellsword', 6, 41], ['brand', 'warden', 5, 22], ['isolde', 'crossbowman', 4, 18], ['agnes', 'pilgrim', 6, 56], ['morrow', 'hexblade', 3, 0], ['tobin', 'lamplighter', 2, 100]])
    ids[k] = P(cls, k[0].toUpperCase() + k.slice(1), lv, f).id;
  s.party = [ids.brand, ids.fulke, ids.isolde, ids.agnes, null, null];
  for (let k = 0; k < 8; k++) Proto.lightNext(s);
  // Agnes: her stat points back to place, nothing but her weapon worn, and three pieces in the Bag that fit her
  const a = Save.char(ids.agnes);
  for (const k of STAT_KEYS) a.alloc[k] = 0;
  for (const k of RES_KEYS) a.alloc.res[k] = 0;
  a.gear.armor = null; a.gear.accessory = null;
  s.inventory.items = s.inventory.items.filter(x => false);
  for (const [id, lv] of [['penitentsrags', 3], ['gravediggersleathers', 5], ['bonecharm', 4]]) Items.add(s, Items.make(id, lv));
  Base.tick(s);
  Save.commit();
  App.go('home', {}, { instant: true });
  return ids;
}
"""


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--sizes', default=SIZES)
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
            ctx = b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=1, is_mobile=touch, has_touch=touch)
            page = ctx.new_page()
            tag = f'{w}x{h}{" touch" if touch else ""}'
            page.on('console', lambda m, t=tag: errors.append(f'{t}: {m.text}') if m.type == 'error' else None)
            page.on('pageerror', lambda e, t=tag: errors.append(f'{t}: {e}'))
            page.goto(f'http://127.0.0.1:{port}/index.html')
            js = page.evaluate
            page.wait_for_function("typeof Title !== 'undefined' && Title.ready", timeout=60000, polling=50)
            page.click('#title')
            page.wait_for_timeout(700)
            ids = js(SETUP)
            page.wait_for_timeout(900)
            print(f'{tag}: frame {js("Frame.W")} wide{", turned" if js("Frame.turned") else ""}')

            def shot(name):
                if a.shots:
                    js("document.querySelectorAll('#toasts .toast').forEach(t => t.remove())")
                    page.wait_for_timeout(120)
                    page.screenshot(path=os.path.join(a.shots, f'{name}-{w}x{h}.png'))

            def centre(sel):
                return js("(sel) => { const el = document.querySelector(sel); if (!el) return null; const b = Frame.box(el); return [b.left + b.width / 2, b.top + b.height / 2]; }", sel)

            def client(x, y):
                return js("([x, y]) => { const r = document.getElementById('stage').getBoundingClientRect(), k = Frame.k; return Frame.turned ? [r.left + (Frame.H - y) * k, r.top + x * k] : [r.left + x * k, r.top + y * k]; }", [x, y])

            def tap(sel, wait=350):
                c = centre(sel)
                if not c:
                    print(f'  (nothing to tap: {sel})')
                    return False
                x, y = client(*c)
                if touch:
                    page.touchscreen.tap(x, y)
                else:
                    page.mouse.click(x, y)
                page.wait_for_timeout(wait)
                return True

            def tab(k):
                return tap(f'[data-tut="hero-tab-{k}"]')

            on = lambda: js("App.current") == 'hero'
            who = lambda: js("HeroSheet.id")
            char = lambda k, expr: js(f"(() => {{ const c = Save.char('{ids[k]}'); return {expr}; }})()")
            exists = lambda sel: js(f"!!document.querySelector('{sel}')")

            # in: the camp's grid opens Formation, a tap on Agnes's portrait opens her
            tap('.cv-tile[data-slot="2"]', wait=500)
            tap(f'.fm-port[data-id="{ids["agnes"]}"] .fm-pf', wait=600)
            check(on() and who() == ids['agnes'], f'{tag}: Formation\'s portrait opens the hero screen on Agnes ({js("App.current")})')
            if not on():
                ctx.close(); continue

            # the layout: inside the frame, nothing spilling, the anchors there
            box = js("""(() => { const F = Frame.W, out = [];
              for (const sel of ['.hr-arch', '.kp.hr-panel', '.hr-purse', '.hr-who', '.hr-back']) { const b = Frame.box(document.querySelector(sel)); if (b.left < -1 || b.top < -1 || b.right > F + 1 || b.bottom > 391) out.push(sel + ' ' + [b.left, b.top, b.right, b.bottom].map(Math.round)); }
              const P = Frame.box(document.querySelector('.kp.hr-panel'));
              for (const el of document.querySelectorAll('.kp.hr-panel .hr-st, .kp.hr-panel .hr-rs, .kp.hr-panel .kp-btn, .kp.hr-panel .hr-tab')) { const b = Frame.box(el); if (b.left < P.left - 1 || b.right > P.right + 1 || b.top < P.top - 1 || b.bottom > P.bottom + 1) out.push(el.className); }
              const A = Frame.box(document.querySelector('.hr-arch')); if (A.right > P.left) out.push('arch overlaps panel');
              const N = Frame.box(document.querySelector('.hr-who')), U = Frame.box(document.querySelector('.hr-purse')); if (N.right > U.left - 4) out.push('name runs into the purse');
              return out; })()""")
            check(not box, f'{tag}: the arch, the panel and the top sit inside the frame, nothing spills {box}')
            tuts = js("['hero-tab-stats', 'hero-tab-skills', 'hero-tab-gear', 'hero-tab-rules', 'hero-next', 'hero-points', 'hero-auto'].filter(k => { const el = document.querySelector(`[data-tut=\"${k}\"]`); if (!el) return true; const b = Frame.box(el); return b.width < 8 || b.height < 8; })")
            check(not tuts, f'{tag}: the tabs\', ›, points\' and Auto\'s anchors are there {tuts}')
            dots = js("[...document.querySelectorAll('.hr-tab')].map(b => !!b.querySelector('.hr-dot'))")
            check(dots[0] and dots[2] and not dots[3], f'{tag}: red dots on Stats (points) and Gear (empty slots, better in the Bag) ({dots})')
            plate = js("(() => { const p = document.querySelector('.hr-plate'); return p && p.textContent; })()")
            check(js("document.querySelector('.hr-nm b').textContent") == 'Agnes' and 'Pilgrim · Back' in js("document.querySelector('.hr-nm span').textContent") and bool(plate),
                  f'{tag}: the name, Pilgrim · Back, and the path on its plate ({plate})')
            shot('stats')

            # ‹ ›: the party in order, then the resting, round again
            order = js("(() => { const p = Save.state.party.filter(Boolean); return p.concat(Save.state.roster.map(c => c.id).filter(x => !p.includes(x))); })()")
            seen = [who()]
            for _ in range(len(order)):
                tap('[data-tut="hero-next"]', wait=200)
                seen.append(who())
            i0 = order.index(ids['agnes'])
            check(seen == [order[(i0 + k) % len(order)] for k in range(len(order) + 1)], f'{tag}: › steps through the party, then the resting, and comes round')
            tap('.hr-who .hr-arr', wait=200)
            check(who() == order[(i0 - 1) % len(order)], f'{tag}: ‹ steps back')
            tap('[data-tut="hero-next"]', wait=200)
            check(who() == ids['agnes'] and js("HeroSheet.tab") == 'stats', f'{tag}: back on Agnes, on Stats')

            # Stats: +, Reset, Auto, Keep
            before = char('agnes', 'Hero.points(c).stat')
            tap('.hr-st .hr-plus')
            check(js("document.querySelector('[data-tut=\"hero-points\"]').textContent") == f'{before - 1} to place' and exists('.hr-st.up'), f'{tag}: + places a point ({before} → {before - 1} to place)')
            tap('.kp-btn:not(.hr-auto):not(.hr-keep)')
            check(js("document.querySelector('[data-tut=\"hero-points\"]').textContent") == f'{before} to place' and not exists('.hr-st.up'), f'{tag}: Reset takes it back')
            tap('[data-tut="hero-auto"]')
            check(not exists('.hr-chip[data-tut="hero-points"]') and not exists('.hr-plus') and char('agnes', 'Hero.points(c).stat') == before, f'{tag}: Auto places them all, not kept yet')
            shot('auto')
            tap('.hr-keep')
            got = char('agnes', '[Hero.points(c).stat, c.alloc.pow, c.alloc.hp, c.alloc.mp, c.alloc.def]')
            check(got[0] == 0 and got[1] > 0 and got[1] >= got[2] >= got[3] and got[4] == 0, f'{tag}: Keep keeps them, the way a back-row class likes: Power, Health, Mana ({got})')
            check(not js("document.querySelector('[data-tut=\"hero-tab-stats\"] .hr-dot')"), f'{tag}: the Stats dot goes')

            # Skills: a tap for the card, a second to watch
            tab('skills')
            tap('.hr-li')
            card = js("(() => { const c = document.querySelector('.hr-card b'); return c && c.textContent; })()")
            check(bool(card) and not js("HeroSheet.playing"), f'{tag}: a tap on a skill shows its card ({card})')
            tap('.hr-li.on', wait=150)
            check(js("HeroSheet.playing"), f'{tag}: a second tap watches it in the arch')
            shot('skills')

            # a threshold: a path to choose, then the tree
            char('agnes', "(Hero.gainXp(c, Hero.xpBetween(c.level, 30)), Save.commit(), HeroSheet.draw(), c.level)")
            page.wait_for_timeout(200)
            check(js("!!document.querySelector('[data-tut=\"hero-tab-skills\"] .hr-dot')") and exists('.hr-thr'), f'{tag}: level 30 lights Skills, with a path to choose')
            tap('.hr-thr')
            tap('.hr-opt')
            shot('threshold')
            tiers = char('agnes', 'c.tiers.pilgrim')
            tap('.hr-choose', wait=450)
            check(char('agnes', '[c.tiers.pilgrim, Hero.pending(c).length]') == [tiers + 1, 0] and exists('.kp.hr-over .hr-tree'), f'{tag}: choosing a tier opens it, and the tree shows ({tiers} → {char("agnes", "c.tiers.pilgrim")})')
            node = js("(() => { const c = Save.char(HeroSheet.id); const el = [...document.querySelectorAll('.hr-node.can')].find(n => SKILLS[n.dataset.id].tier === 2); return el && el.dataset.id; })()")
            if check(bool(node), f'{tag}: a tier II skill can be learned ({node})'):
                tap(f'.hr-node[data-id="{node}"]')
                shot('tree')
                tap('.hr-card .hr-learn')
                check(char('agnes', f"c.skills['{node}'] || 0") == 1, f'{tag}: the card learns it')
            tap('.kp.hr-over .kp-x')
            check(not exists('.kp.hr-over') and exists('.kp.hr-panel'), f'{tag}: the ✕ closes the tree')

            # Gear: try on, Auto-equip, Unequip
            tab('gear')
            check(exists('[data-tut="hero-autoequip"]:not([disabled])') and js("document.querySelectorAll('.hr-gs.empty').length") == 2, f'{tag}: two empty slots, and Auto-equip lit')
            tap('.hr-it')
            check(js("(() => { const p = document.querySelector('.hr-plate'); return p && p.textContent; })()") == 'Trying on' and exists('.hr-tryrow'), f'{tag}: a tap on a piece tries it on')
            shot('gear-try')
            tap('.hr-tryrow .hr-card-b')
            check(js("!$('#sheet').hidden && !!document.querySelector('#sheet .gr-card')"), f'{tag}: Card opens the piece’s card')
            js("closeSheet()")
            page.wait_for_timeout(200)
            tap('.hr-tryrow .hr-stop')
            check(not exists('.hr-tryrow') and js("(() => { const p = document.querySelector('.hr-plate'); return !p || p.textContent !== 'Trying on'; })()"), f'{tag}: ✕ stops trying it on')
            tap('.hr-it')
            uid = js("document.querySelector('.hr-it.sel').dataset.uid")
            tap('.hr-equip', wait=450)
            check(js(f"(() => {{ const f = Items.find(Save.state, '{uid}'); return f.where === 'worn' && f.c.id === '{ids['agnes']}'; }})()"), f'{tag}: Equip puts the piece tried on')
            best = js("(() => { const c = Save.char(HeroSheet.id); return HeroSheet.autoEquipPlan(c).map(x => x.uid); })()")
            tap('[data-tut="hero-autoequip"]', wait=450)
            worn = char('agnes', '[c.gear.armor && c.gear.armor.uid, c.gear.accessory && c.gear.accessory.uid]')
            check(all(worn) and set(best) <= set(worn) and js("document.querySelector('[data-tut=\"hero-autoequip\"]').disabled"),
                  f'{tag}: Auto-equip puts on the best that fits, then has nothing left to do ({worn})')
            check(not js("document.querySelector('[data-tut=\"hero-tab-gear\"] .hr-dot')"), f'{tag}: the Gear dot goes')
            shot('gear')
            tap('.hr-unequip', wait=450)
            check(char('agnes', '[c.gear.armor, c.gear.accessory, !!c.gear.weapon]') == [None, None, True], f'{tag}: Unequip takes off the armour and accessory, and keeps the weapon')
            tap('[data-tut="hero-autoequip"]', wait=450)

            # Tactics (rules in the code)
            tab('rules')
            n = js(f"Tactics.owner('{ids['agnes']}').rules.length")
            words = js("[document.querySelector('[data-tut=\"hero-tab-rules\"]').textContent, document.querySelector('.tab-rules h4').textContent, document.querySelector('.hr-edit').textContent]")
            check(words[0] == 'Tactics' and words[1].startswith('Tactics, top first') and words[2] == 'Edit tactics', f'{tag}: the tab, its plate and its button say Tactics ({words})')
            check(js("document.querySelectorAll('[data-tut=\"hero-rules\"] .hr-rule').length") == n + 1 and 'Otherwise' in js("document.querySelector('.hr-rule.other').textContent"), f'{tag}: the tactics list has {n} tactics and Otherwise')
            shot('rules')
            tap('.hr-edit', wait=500)
            check(js("App.current") == 'tactics', f'{tag}: Edit tactics opens the editor')
            tap('.tx-back', wait=600)
            check(on() and js("HeroSheet.tab") == 'rules' and who() == ids['agnes'], f'{tag}: the editor\'s Back comes back to Tactics')

            # Respec
            tab('skills')
            char('agnes', '(c.respecs = Math.max(1, c.respecs), Save.commit(), 1)')
            tap('.hr-hb .hr-mini:last-child')
            shot('respec')
            tap('.hr-free', wait=400)
            pts = char('agnes', 'Hero.points(c)')
            check(pts['stat'] == char('agnes', 'c.level - 1') and not exists('.kp.hr-over'), f'{tag}: a free respec gives every point back ({pts})')

            # Back: the camp, with Formation open again
            tap('.hr-back', wait=600)
            check(js("App.current") == 'home' and js("Formation.shown"), f'{tag}: Back returns to the camp with Formation open')
            ctx.close()
        b.close()
    srv.shutdown()
    if errors:
        print('console errors:'); [print('  ' + e) for e in errors]
    print(f'{"FAILED: " + str(len(fails)) if fails or errors else "all passed"}')
    sys.exit(1 if fails or errors else 0)


if __name__ == '__main__':
    main()
