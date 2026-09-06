# JuanWise UI Revamp — Design Spec

**Status:** approved (prototype signed off 2026-09-06)
**Visual spec:** https://claude.ai/code/artifact/48696afc-8fe1-4dcd-b7f7-6861d60e83dc
**Direction:** Playful Heritage

## Problem

The app works but every screen invents its own look. `src/shared/theme/colors.ts` holds nine
colours and nothing else — no spacing, type, radius or elevation scale — so all 29 screens
re-declare a private `StyleSheet` with hardcoded values. Type runs 11–17px against photographic
backgrounds, tap targets fall to 32px, and 16 screens draw icons with emoji, which render
differently on Android and iOS and cannot take a colour.

The audience is grade-school students. The current UI is not unusable, but it is not built for
them, and it cannot be changed consistently because there is nothing shared to change.

## Direction

Keep the Filipino identity the app already has and modernise its execution:

- The flag palette stays (`#0038A8` blue, `#FCD116` gold, `#CE1126` red) on a warm cream canvas.
- The 8-ray Philippine sun becomes a background motif on coloured headers.
- Chunky rounded cards, hard-shadow buttons that look pressable, generous whitespace.
- Baloo 2 (rounded, friendly) for headings; Nunito for body. Both carry Filipino diacritics.
- Line icons replace every emoji used as an icon.

Two alternate directions were sketched and rejected, and remain on page 2 of the canvas:
**Bright Arcade** (higher energy, no cultural identity) and **Calm Classroom** (most readable,
too adult for Grade 5).

## Scope

The 14 student-journey screens on canvas page 1:

Welcome · Log in · Home · Categories · Quiz-or-puzzle · Level path · Activities · Quiz ·
Result · Jigsaw · Level summary · Mini-lessons · Leaderboard · Profile

Out of scope for this pass: the 9 teacher and admin screens. They serve adults, need their own
density, and get a separate canvas and plan.

## Requirements

### R1 — A shared design layer

Tokens and primitive components live in `src/shared/theme` and `src/shared/components/ui`.
Screens compose primitives and reference tokens. A screen may still hold a local `StyleSheet`
for layout, but must not hardcode a colour, radius, font size or shadow.

### R2 — Legibility floor

No text below 11.5px. Body copy 15px minimum. This is the single rule the current UI most often
breaks and the one that matters most for the audience.

### R3 — Tap target floor

Anything tappable is at least 46px on its shorter axis. Primary actions are 56px.

### R4 — No emoji as icons

Every emoji standing in for an icon becomes a line icon drawn with `react-native-svg`. Emoji
that are *content* (a student's chosen avatar) stay.

### R5 — Behaviour is unchanged

This is a visual and structural revamp. No navigation destination is added or removed, no API
call changes, no game rule changes. The one structural change: the bottom tab bar carries four
existing destinations (Home, Aral, Ranggo, Ako) instead of two, so no new screens — just fewer
taps to reach what already exists.

### R6 — The quiz mini-lesson stays text-only

Settled while building the mini-lesson picture feature: the picture appears in the Mini-Lessons
library after an activity is passed, never above the question, where it would give the answer
away.

## Non-goals

- Dark mode. The app has no dark mode today and the design does not assume one.
- Animation beyond what exists. `welcome-screen.tsx` already has an entrance stagger; keep it.
- Tablet layouts.
- Re-testing game logic. The revamp must not touch it.

## Risks

- **Two new dependencies** (`@expo-google-fonts/baloo-2`, `@expo-google-fonts/nunito`). Both
  load at runtime through `expo-font`, so no native rebuild is needed. If the team would rather
  not add them, the fallback is the platform sans stack and the design loses most of its
  character — worth a decision before Task 2.
- **No screen-level test infrastructure.** `vitest` here runs pure modules only; there is no
  `@testing-library/react-native`. Tokens, helpers and the icon registry get real unit tests.
  Screens are verified by running the app against a per-screen checklist. The plan does not
  pretend otherwise.
- **Regression surface.** 14 screens is a lot of edits to code that currently works. Each screen
  is its own task and its own commit so any one can be reverted alone.
