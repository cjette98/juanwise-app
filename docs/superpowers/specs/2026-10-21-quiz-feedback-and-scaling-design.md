# Quiz feedback, naming and text scaling — design

Items 3.1–3.3 and 4.1–4.4 of the client evaluation ("Improvement function
based on the evaluation", 2026-10-21). App-only; no API change.

| # | Was | Is |
| --- | --- | --- |
| 3.1 | A tapped answer changed nothing until the server replied | Marked and sounded on the same frame |
| 3.2 | Fixed point sizes, no cap on the phone's font setting | Scaled to the screen, each variant capped |
| 3.3 | Mini-lesson pictures stuck at 68–160px | Open full screen, 1x/2x/3x on tap |
| 4.1 | No highlight on the chosen answer | Green if right, red if wrong, immediately |
| 4.2 | Points were the fourth of seven lines | `+15 points` leads the pop-up |
| 4.3 | One title for every failure | "Time's Up!" vs "Incorrect Answer" |
| 4.4 | Both games said "Activity 1–6" | Quiz "Question 1–6", jigsaw "Puzzle 1–6" |

## 3.1 and 4.1 — the tap, not the reply

Grading is already local: `isCorrect()` knows the answer the moment it is
tapped, and the server decides only how many points it is worth. The screen
was waiting for that round trip before showing anything, which is why students
tapped again — the bug the client described as touch latency is a feedback
bug, not a performance one.

`picked` now records the answer and its correctness on the tap. The chosen
row turns green or red, its chip swaps the letter for a check or a cross, the
other choices fade to 45% and stop responding, and the correct/wrong sound
plays then rather than on the reply. A "Checking your answer…" line sits under
the choices while the attempt is in flight. Typed and enumeration answers tint
their boxes the same way.

The jigsaw got the same treatment at its one latency point: the fanfare and a
"scoring it now" line fire when the last piece lands, not when the result
comes back.

**Deliberate:** a wrong answer does not reveal the correct one. With three
attempts per activity that would hand the student the next try.

## 4.2 and 4.3 — the pop-ups

A shared `ScoreBadge` opens both result sheets: `+15 points` in green, or `0`
in red. Everything below it is the pop-up the app already had — the client
asked to keep the old notification, so only the order changed, plus the
removal of the now-duplicated points line.

A failed quiz attempt names its failure: the clock running out, a wrong
answer, or walking away mid-question all used to read "Activity Complete
(Incorrect)".

## 4.4 — naming

`activityNaming(activityType)` maps a quiz or a jigsaw to its translation
keys, so the list, the level summary, both pop-ups, the results lists,
Mini-Lessons and the full record all agree. Tagalog uses "Tanong", the word
the question editor already uses; the jigsaw keeps "Puzzle", as the rest of
the Tagalog copy does.

## 3.2 — text scaling

Two separate problems, both fixed in the type layer rather than per screen:

1. **Screen width.** `fontScaleFor(width)` (pure, in `tokens.ts`) clamps
   `width / 375` to ±12% — past that the spacing scale, which stays fixed, no
   longer matches the type. `typography.ts` applies it once at import and
   exports `typeScale`; every `tokens.type.*` user now reads from there.
2. **The phone's font setting.** Each variant carries a
   `maxFontSizeMultiplier` (1.2 for headings, 1.4 for body). Accessibility
   still enlarges text; it cannot push a heading out of its row.

Labels with nowhere to wrap — the primary button, the tab bar, the segmented
control — shrink to fit rather than ellipsize, because a truncated label is
not "fully visible" either.

**Read once, not through a hook:** the app is portrait-only, so the window
width cannot change while it runs, and a module constant keeps StyleSheets
(also built once) in step with the components.

## Testing

`npx vitest run` — 186 passed, including the new `activity-naming` cases and
the font-scale cases in `tokens.test.ts`. `npx tsc --noEmit` clean. Lint is
unchanged at the 56 problems already on main.

Still to do by hand, on a device: tap-through of a quiz question (highlight,
sound, pop-up), a mini-lesson picture at each zoom step, and a look at the
small-phone and large-font-setting layouts.
