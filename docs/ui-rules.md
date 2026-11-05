# UI rules

From your review of the hero card mockup, 2026-11-05: it was "not making good use of space", had "way too much text that should be consolidated to tooltips", and was "missing a lot of key design concepts that are needed to make the interfaces visually comfortable". Every mockup and every screen follows these rules. Darkest Dungeon's character card (your screenshot 9) is the reference for comfort: one big hero, plain lists on a dark ground, header plates, and everything else on hover.

## The rules

1. **One focal point.** What the screen is about (the hero, the recruit, the fire) is the largest and brightest thing on it. Everything else is quieter.
2. **Three levels of emphasis, no more.** Section titles (display face, on a header plate), values (bright), labels (dim, sentence case). No letter-spaced capitals for labels. When everything is emphasised, nothing is.
3. **Show, don't tell.** Icons and numbers on the screen; names, descriptions and rules in a tooltip (hover on a computer, long press on a phone). No sentences on a screen. A label is a word, a value is a number.
4. **No boxes in boxes.** A section is a header plate and its contents on the panel's ground. No border round every stat, row or button group. One frame per panel.
5. **Space is part of the design.** Spacing comes from one scale: 4, 8, 16 and 24 design px. At least 8 between items and 16 between sections. Leave about a quarter of each panel empty. Equal margins on every side.
6. **Align to a grid.** Columns share edges, rows share baselines, numbers line up on the right in a column, and icons in a list are one size.
7. **Two typefaces.** The display face for titles and names only; one readable face for everything else, in no more than three sizes.
8. **Colour carries meaning.** One accent (ember gold) for things you can press. Green and red only for gains and losses. Rarity colours only on item frames. Everything else in the panel's neutral tones.
9. **Actions only where they're needed.** No permanent + on every row: one button opens a mode (Spend points shows the + buttons; Done hides them). Never show an action that does nothing.
10. **Disclose in steps.** The first look shows what you need to decide. Details open on a tap: the item card, the skill card, a stat's tooltip. Deeper screens (the skill tree, the Tactics editor) stay one tap away, summarised on the screen, not crammed into it.
11. **Big enough to touch.** Touch targets are at least 32 design px, with space between them.
12. **Readable on a phone.** The smallest text is 9 design px in the body face. Check every screen as a phone-sized screenshot at 844×390 before showing it.
13. **Quiet motion.** Idle life (a flicker, a breath) and feedback (a glint when a piece is worn). Nothing that moves while you read.

## Before showing a mockup

- Count the words on screen, leaving out names and numbers: under 40 for a whole screen.
- Squint at it: the focal point still stands out, and the sections read as groups.
- Every border, box and line has a reason.
- No letter-spaced capital labels, no instruction lines, no "What it does" links.
- Every + and button does something now.

Related: the UI-words rule in `docs/playtest-log.md` (screens show names, numbers and actions; explanations go to tooltips, the guide or the Codex).
