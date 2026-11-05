"""Checks the hero card (js/sheet.js, screen 8; docs/mockups/hero-card.html) in headless Chromium through real input, and
takes its screenshots.

From a save set up in the page (six heroes, four set out; Agnes the Pilgrim with stat points to spend, nothing in her
armour or accessory slots, three pieces in the Bag she can wear and a sword she can't), it opens Formation from the
camp's grid and taps Agnes's portrait, then, with taps where things are drawn (through the quarter-turn when the frame
is turned):
  - the hero, the stats and the four sections sit inside the frame without overlapping, the guide's anchors are there,
    and the screen keeps to two typefaces (Pirata One, Spectral) with no letter-spaced capitals
  - a stat's tooltip: its name and what it does (hover with a mouse, a tap with a finger)
  - ◂ ▸ step through the party, then the resting heroes, and come round again
  - Spend: + on each stat and none on the resistances; a tap places a point (in green), Auto places the rest the way
    the class likes, Done keeps them
  - dressing: a gear slot opens the Bag on that slot; a tap tries a piece on (the arch and the stats show it), Wear
    wears it, the slot icons switch slots, Take off puts it back, ✓ closes; Best wears the best that fits
  - a skill slot: the skills that fit replace Tactics, and Use puts one in the slot
  - the tree, a threshold's choice (a tier opens, a skill is learned), and a respec
  - rename: 12 letters at most, kept; Edit tactics opens the Tactics screen, and its Back comes back
  - ‹ returns to the camp with Formation open
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
  // Agnes: her stat points back to spend, nothing but her weapon worn, three pieces in the Bag that fit her, one that doesn't
  const a = Save.char(ids.agnes);
  for (const k of STAT_KEYS) a.alloc[k] = 0;
  a.gear.armor = null; a.gear.accessory = null;
  s.inventory.items = s.inventory.items.filter(x => false);
  for (const [id, lv] of [['penitentsrags', 3], ['gravediggersleathers', 5], ['bonecharm', 4], ['notchedsword', 2]]) Items.add(s, Items.make(id, lv));
  Base.tick(s);
  Save.commit();
  App.go('home', {}, { instant: true });
  document.querySelectorAll('#toasts .toast').forEach(t => t.remove());
  return ids;
}
"""
# Every anchor the card keeps for the guide (docs/first-session-spec.md, "Anchors the redesigns must keep or add")
ANCHORS = ['hero-back', 'hero-rename', 'hero-next', 'hero-stats', 'hero-points', 'hero-tab-gear', 'hero-stat-res', 'hero-tab-skills',
           'hero-skills', 'hero-skill-slot', 'hero-tree', 'hero-tab-rules', 'hero-rules', 'hero-edit']
ANCHORS += [f'hero-stat-{k}' for k in ('hp', 'mp', 'pow', 'def', 'spd', 'crit', 'dodge')]
ANCHORS += [f'hero-stat-res-{k}' for k in ('stun', 'move', 'bleed', 'blight', 'curse', 'debuff')]
ANCHORS += [f'hero-slot-{k}' for k in ('weapon', 'armor', 'accessory')]

LAYOUT = """(() => { const F = Frame.W, out = [], B = el => Frame.box(el);
  const parts = ['.hr-back', '.hr-name', '.hr-nav', '.hr-arch', '.hr-stats', '.hr-sect.g1', '.hr-sect.g2', '.hr-sect.r1', '.hr-sect.r2'];
  for (const sel of parts) { const el = document.querySelector(sel); if (!el) { out.push('missing ' + sel); continue; } const b = B(el); if (b.left < 3 || b.top < 3 || b.right > F - 3 || b.bottom > 387) out.push(sel + ' ' + [b.left, b.top, b.right, b.bottom].map(Math.round)); }
  const over = (a, b) => { const p = B(document.querySelector(a)), q = B(document.querySelector(b)); return p.left < q.right - 1 && q.left < p.right - 1 && p.top < q.bottom - 1 && q.top < p.bottom - 1; };
  for (const [a, b] of [['.hr-arch', '.hr-stats'], ['.hr-stats', '.hr-sect.g2'], ['.hr-arch', '.hr-sect.g1'], ['.hr-sect.g1', '.hr-sect.r1'], ['.hr-sect.g2', '.hr-sect.r2'], ['.hr-sect.g1', '.hr-sect.g2'], ['.hr-sect.r1', '.hr-sect.r2'], ['.hr-name', '.hr-nav > :first-child']]) if (over(a, b)) out.push(a + ' overlaps ' + b);
  const R = B(document.querySelector('.hr-sect.r1'));
  for (const el of document.querySelectorAll('.hr-tile')) { const b = B(el); if (b.height && b.top < R.bottom && (b.right > R.right + 1 || b.left < R.left - 1)) out.push('a skill tile spills out ' + Math.round(b.right)); }
  const M = B(document.querySelector('.hr-sect.g1'));
  for (const el of document.querySelectorAll('.hr-gear .gc')) { const b = B(el); if (b.right > M.right + 1 || b.left < M.left - 1) out.push('a gear card spills out'); }
  return out; })()"""
# two typefaces, no letter-spaced capitals, nothing under 9 design pixels (docs/ui-rules.md)
TYPE = """(() => { const out = new Set();
  for (const el of document.querySelectorAll('.hr-view *')) {
    if (![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
    const cs = getComputedStyle(el), fam = cs.fontFamily;
    if (!/Pirata One|Spectral/.test(fam.split(',')[0])) out.add('font ' + fam.split(',')[0] + ' on ' + el.className);
    if (cs.textTransform === 'uppercase' && cs.letterSpacing !== 'normal') out.add('spaced capitals on ' + el.className);
    if (parseFloat(cs.fontSize) < 9) out.add('tiny text on ' + el.className);
  }
  return [...out]; })()"""


class Server(socketserver.ThreadingTCPServer):
    daemon_threads = True
    request_queue_size = 64


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--sizes', default=SIZES)
    ap.add_argument('--shots', default='')
    a = ap.parse_args()
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
                    if name != 'tip':
                        js("Tip.hide()")
                    page.wait_for_timeout(150)
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

            def point_at(sel):
                """A finger taps it; a mouse rests over it."""
                c = centre(sel)
                if not c:
                    return False
                x, y = client(*c)
                if touch:
                    page.touchscreen.tap(x, y)
                else:
                    page.mouse.move(2, 2)
                    page.mouse.move(x, y)
                page.wait_for_timeout(300)
                return True

            on = lambda: js("App.current") == 'hero'
            who = lambda: js("HeroSheet.id")
            mode = lambda: js("HeroSheet.mode")
            char = lambda k, expr: js(f"(() => {{ const c = Save.char('{ids[k]}'); return {expr}; }})()")
            exists = lambda sel: js(f"!!document.querySelector('{sel}')")
            count = lambda sel: js(f"document.querySelectorAll('{sel}').length")
            tip_text = lambda: js("(() => { const t = document.querySelector('.tip-box'); return t ? t.textContent : ''; })()")

            # in: the camp's grid opens Formation, a tap on Agnes's portrait opens her
            tap('.cv-tile[data-slot="2"]', wait=500)
            tap(f'.fm-port[data-id="{ids["agnes"]}"] .fm-pf', wait=700)
            check(on() and who() == ids['agnes'], f'{tag}: Formation\'s portrait opens the hero card on Agnes ({js("App.current")})')
            if not on():
                ctx.close()
                continue

            # the layout, the anchors, the type
            bad = js(LAYOUT)
            check(not bad, f'{tag}: the hero, the stats and the four sections sit inside the frame, apart {bad}')
            missing = js("(t) => t.filter(k => { const el = document.querySelector(`[data-tut=\"${k}\"]`); if (!el) return true; const b = Frame.box(el); return b.width < 8 || b.height < 8; })", ANCHORS)
            check(not missing, f'{tag}: the guide\'s {len(ANCHORS)} anchors are there {missing}')
            bad = js(TYPE)
            check(not bad, f'{tag}: two typefaces, no letter-spaced capitals, no text under 9 px {bad}')
            words = js("[document.querySelector('.hr-name b').textContent, document.querySelector('.hr-class').textContent]")
            check(words == ['Agnes', 'Pilgrim'], f'{tag}: the name and the class ({words})')
            check(count('.hr-rs') == 6 and count('.hr-st:not(.none)') == 7 and js("document.querySelector('[data-tut=hero-points] .hc-badge').textContent") == str(char('agnes', 'Hero.points(c).stat')),
                  f'{tag}: seven stats, six resistances, and Spend with the points on its badge')
            shot('card')

            # a stat's tooltip
            point_at('[data-tut="hero-stat-pow"]')
            t = tip_text()
            check(t.startswith('Power') and 'hard they hit' in t, f'{tag}: Power\'s tooltip says what it does ({t!r})')
            shot('tip')
            js("Tip.hide()")
            if not touch:
                page.mouse.move(2, 2)

            # ◂ ▸: the party in order, then the resting, round again
            order = js("(() => { const p = Save.state.party.filter(Boolean); return p.concat(Save.state.roster.map(c => c.id).filter(x => !p.includes(x))); })()")
            seen = [who()]
            for _ in range(len(order)):
                tap('[data-tut="hero-next"]', wait=200)
                seen.append(who())
            i0 = order.index(ids['agnes'])
            check(seen == [order[(i0 + k) % len(order)] for k in range(len(order) + 1)], f'{tag}: ▸ steps through the party, then the resting, and comes round')
            tap('.hr-nav .hc-ib', wait=200)
            check(who() == order[(i0 - 1) % len(order)], f'{tag}: ◂ steps back')
            tap('[data-tut="hero-next"]', wait=300)
            check(who() == ids['agnes'], f'{tag}: back on Agnes')

            # Spend: +, Auto, Done
            before = char('agnes', 'Hero.points(c).stat')
            tap('[data-tut="hero-points"]')
            check(mode() == 'spend' and count('[data-tut^="hero-plus-"]') == 7 and not exists('.hr-rs .plus') and exists('[data-tut="hero-keep"]') and not exists('[data-tut="hero-next"]'),
                  f'{tag}: Spend: a + on each of the seven stats, none on the resistances, and Done in the arrows\' place')
            shot('spend')
            tap('[data-tut="hero-stat-pow"]')
            check(js('HeroSheet.placing') == 1 and exists('[data-tut="hero-stat-pow"].up') and char('agnes', 'Hero.points(c).stat') == before, f'{tag}: a tap places a point in Power, in green, not kept yet')
            tap('[data-tut="hero-auto"]')
            check(js('HeroSheet.placing') == before and not exists('[data-tut^="hero-plus-"]'), f'{tag}: Auto places the rest ({js("HeroSheet.placing")} of {before})')
            tap('[data-tut="hero-keep"]', wait=450)
            got = char('agnes', '[Hero.points(c).stat, c.alloc.pow, c.alloc.hp, c.alloc.mp, c.alloc.def]')
            check(got[0] == 0 and got[1] > 0 and got[1] >= got[2] >= got[3] and got[4] == 0 and mode() == 'card' and not exists('[data-tut="hero-points"]'),
                  f'{tag}: Done keeps them, the way a back-row class likes: Power, Health, Mana; Spend goes ({got})')

            # dressing: armour, then the accessory; Wear, Take off, ✓; then Best
            tap('[data-tut="hero-slot-armor"]')
            slots = js("[...document.querySelectorAll('[data-tut=gear-pick]')].map(el => Items.def(Items.find(Save.state, el.dataset.uid).item).slot)")
            check(mode() == 'dress' and slots and set(slots) == {'armor'}, f'{tag}: the armour slot opens the Bag on armour ({slots})')
            hp0 = js("document.querySelector('[data-tut=hero-stat-hp] b').textContent")
            uid = js("document.querySelector('[data-tut=gear-pick]').dataset.uid")
            tap(f'[data-uid="{uid}"]')
            hp1 = js("document.querySelector('[data-tut=hero-stat-hp] b').textContent")
            check(exists('.hr-arch.trying') and exists('.hr-stats .hr-st.up') and hp1 != hp0 and exists('[data-tut="gear-wear"]'), f'{tag}: a tap tries it on: the arch and the stats show it ({hp0} → {hp1}), and its card has Wear')
            check(exists('[data-tut="hero-effects"]') == bool(js(f"GearUI.effectWords(Items.find(Save.state, '{uid}').item).length")), f'{tag}: what it adds shows in the eighth place')
            shot('dress')
            tap('[data-tut="gear-wear"]', wait=450)
            check(char('agnes', 'c.gear.armor && c.gear.armor.uid') == uid and not exists('.hr-arch.trying'), f'{tag}: Wear wears it')
            tap('[data-tut="gear-tab-accessory"]')
            acc = js("[...document.querySelectorAll('[data-tut=gear-pick]')].map(el => el.dataset.uid)")
            check(len(acc) == 1 and js("document.querySelector('.hc-plate h4').textContent") == 'Accessories', f'{tag}: the slot icons switch to the accessories')
            tap('[data-tut="gear-tab-armor"]')
            tap('[data-tut="gear-off"]', wait=400)
            check(char('agnes', 'c.gear.armor') is None, f'{tag}: the worn piece\'s Take off puts it back in the Bag')
            tap('[data-tut="gear-done"]')
            check(mode() == 'card' and exists('[data-tut="hero-autoequip"]'), f'{tag}: ✓ closes the Bag; Best shows, with better in the Bag')
            plan = js(f"HeroSheet.autoEquipPlan(Save.char('{ids['agnes']}')).map(x => x.uid)")
            tap('[data-tut="hero-autoequip"]', wait=450)
            worn = char('agnes', '[c.gear.armor && c.gear.armor.uid, c.gear.accessory && c.gear.accessory.uid]')
            check(all(worn) and set(plan) <= set(worn) and not exists('[data-tut="hero-autoequip"]'), f'{tag}: Best wears the best that fits, then goes ({worn})')
            shot('gear')

            # a skill slot: the skills that fit, and Use
            tap('[data-tut="hero-skill-slot"]')
            check(mode() == 'pick' and count('.hr-known') == char('agnes', 'Hero.actives(c).length') and not exists('[data-tut="hero-rules"]'), f'{tag}: a skill slot shows the skills that fit, in Tactics\' place')
            shot('skill-pick')
            other = js(f"(() => {{ const c = Save.char('{ids['agnes']}'); return Hero.actives(c).find(id => id !== c.equip[0]) || null; }})()")
            if other:
                tap(f'.hr-known[data-id="{other}"]')
                tap('[data-tut="hero-use"]', wait=400)
                check(char('agnes', 'c.equip[0]') == other and mode() == 'card', f'{tag}: Use puts {other} in Skill I')
            else:
                check(js("document.querySelector('[data-tut=hero-use]').disabled"), f'{tag}: with one skill, Use has nothing to do')
                tap('.hr-sect.r2 .hc-plate .hc-ib')
            check(mode() == 'card' and exists('[data-tut="hero-rules"]'), f'{tag}: Tactics is back')

            # a threshold: the tree's button lights, a tier opens, the tree learns a skill; then a respec
            char('agnes', "(Hero.gainXp(c, Hero.xpBetween(c.level, 30)), Save.commit(), HeroSheet.draw(), c.level)")
            page.wait_for_timeout(200)
            check(exists('[data-tut="hero-tree"].on'), f'{tag}: level 30 lights the tree\'s button')
            tap('[data-tut="hero-tree"]')
            check(mode() == 'tree' and js("document.querySelector('.hr-cover .hc-plate h4').textContent") == 'Level 30', f'{tag}: it opens the threshold\'s choice')
            tap('.hr-opt')
            shot('threshold')
            tiers = char('agnes', 'c.tiers.pilgrim')
            tap('.hr-choose', wait=450)
            check(char('agnes', '[c.tiers.pilgrim, Hero.pending(c).length]') == [tiers + 1, 0] and exists('.hr-cover .hr-tree'), f'{tag}: choosing a tier opens it, and the tree shows')
            node = js("(() => { const el = [...document.querySelectorAll('.hr-node.can')].find(n => SKILLS[n.dataset.id].tier === 2); return el && el.dataset.id; })()")
            if check(bool(node), f'{tag}: a tier II skill can be learned ({node})'):
                tap(f'.hr-node[data-id="{node}"]')
                shot('tree')
                tap('.hr-card .hr-learn')
                check(char('agnes', f"c.skills['{node}'] || 0") == 1, f'{tag}: the card learns it')
            char('agnes', '(c.respecs = Math.max(1, c.respecs), Save.commit(), 1)')
            tap('[data-tut="hero-respec"]')
            shot('respec')
            tap('.hr-free', wait=400)
            pts = char('agnes', 'Hero.points(c)')
            check(pts['stat'] == char('agnes', 'c.level - 1') and mode() == 'card', f'{tag}: a free respec gives every point back ({pts})')

            # rename: 12 letters at most
            tap('[data-tut="hero-rename"]')
            check(exists('[data-tut="hero-name"]'), f'{tag}: the pencil opens the name box')
            js("document.querySelector('[data-tut=hero-name]').select()")
            page.keyboard.type('Agnes of the Long Road')
            shot('rename')
            tap('[data-tut="hero-name-ok"]')
            nm = char('agnes', 'c.name')
            check(nm == 'Agnes of the'[:12] and js("document.querySelector('.hr-name b').textContent") == nm, f'{tag}: the name is kept, 12 letters at most ({nm!r})')
            char('agnes', "(c.name = 'Agnes', Save.commit(), HeroSheet.draw(), 1)")

            # Tactics: Edit opens the editor, and its Back comes back
            tap('[data-tut="hero-edit"]', wait=600)
            check(js("App.current") == 'tactics', f'{tag}: Edit opens the Tactics screen')
            tap('.tx-back', wait=700)
            check(on() and who() == ids['agnes'] and mode() == 'card', f'{tag}: its Back comes back to the hero card')

            # ‹: the camp, with Formation open again
            tap('[data-tut="hero-back"]', wait=700)
            check(js("App.current") == 'home' and js("Formation.shown"), f'{tag}: ‹ returns to the camp with Formation open')
            ctx.close()
        b.close()
    srv.shutdown()
    if errors:
        print('console errors:')
        for e in errors:
            print('  ' + e)
    print(f'{"FAILED: " + str(len(fails)) if fails or errors else "all passed"}')
    sys.exit(1 if fails or errors else 0)


if __name__ == '__main__':
    main()
