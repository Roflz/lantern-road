# Roadmap

Where Lantern Road goes next. The full design is [docs/design.md](docs/design.md); what each screen's code looks like today is [docs/code-map.md](docs/code-map.md); play-test notes and decisions are in [docs/playtest-log.md](docs/playtest-log.md).

**Where it stands:** build steps 1–7 of the design are playable. All five regions and 88 stages, twelve classes, 92 items, the home base, idle buildings, offline gains and Wick's guided first session work. Since 2026-11-04 every screen is being rebuilt for a phone held sideways, one screen at a time: mockup, approval, build, play-test, fixes.

## Now: the landscape rebuild, screen by screen

Done: the title and servers, the Hearth (camp), the first pick, Formation and the Heroes list, the results popup, the hero card, the Bag, Tactics, and Wick's guide.

- [ ] **The Road and the stage sheet** (screen 4): the road view is in; the region map and stage sheet still use the old portrait layout.
- [ ] **Buildings** (screen 10): every building's screen except the Recruit Board, starting with the Toll House.
- [ ] **Settings, Help and the Codex** (screen 12): the ? pages, the glossary in the game, first-time tips on or off.
- [ ] **The item card** (the rest of screen 9): its bottom sheet keeps its old layout.
- [ ] **Battle detail pass** (screen 6): the battle is landscape already; this is the polish.
- [ ] **The Hearth, phase B:** the crest, menus as drawn objects, names when you look, and barks.

## Next: content and systems

- [ ] **The Smithy:** the building that spends the Trophies, Burial Coins and Bell Bronze that Regions I and II already drop.
- [ ] **Region gear for Regions III–V:** each region's own line of five pieces, as Regions I and II have.
- [ ] **Music:** rework the procedural music, which is off for now.
- [ ] **The rename pass:** apply the glossary's decided names everywhere (`node tools/glossary.js` lists what's left) and settle its open name clashes.
- [ ] **Balance:** tune everything marked *(tune)* in the specs (tolls, costs, the difficulty sawtooth at elites and bosses) against `tools/simtest.js --ref` and play-tests.

## Cleanup

- [ ] Remove the legacy code listed under "Later" in [docs/code-map.md](docs/code-map.md) as each screen leaves the old column.
- [ ] Take the Prototype tools out of player builds (`js/proto.js` says how).
- [ ] Move the first version, the single-file roguelike `lantern-road.html`, out of the main game.

## Later, maybe

- Multiplayer behind the title's server picker, which is a placeholder today.
- From the design's "Not now, maybe later": a permanent-death mode, a roguelike mode, random traits on recruits, and rules with two conditions.
