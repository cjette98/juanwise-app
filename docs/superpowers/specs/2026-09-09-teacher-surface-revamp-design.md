# JuanWise Teacher Surface Revamp — Design Spec

**Status:** approved (canvas signed off 2026-09-09)
**Visual spec:** https://claude.ai/code/artifact/0c4a95e4-a4bb-47d0-b44f-bc4929b79a41
**Direction:** Playful Heritage, at adult density
**Follows:** `2026-09-06-ui-revamp-design.md`, which deferred these screens

## Problem

The UI revamp stopped at the student journey, exactly as its spec said it would. The result is
that JuanWise is two design languages at once: 21 screens compose the shared primitives, and 14
still re-declare private `StyleSheet`s full of hardcoded values. The split is not random — every
student-facing screen was migrated and every teacher- and admin-facing screen was not.

The teacher surface is the worst of it, because it is what a teacher opens every day:

| Screen | Token references | Hardcoded hex | Wrapper |
|---|---|---|---|
| `teacher-dashboard-screen.tsx` | 0 | 22 | `ImageBackground` + `SafeAreaView` |
| `class-overview-screen.tsx` | 0 | 35 | `SafeAreaView` |
| `class-map-screen.tsx` | 0 | 33 | `SafeAreaView` |
| `teacher-leaderboard-screen.tsx` | 0 | 54 | `SafeAreaView` |

`teacher-leaderboard-screen.tsx` additionally breaks two rules the first revamp settled: it draws
icons with emoji (`'🚀 Mabilis Matuto'`, `'🐢 Kailangan ng Tulong'`, and a star rating built by
repeating `'⭐'` and `'☆'`), and none of its copy goes through `t()` — every string is hardcoded
Tagalog, so the screen has no English at all.

## Direction

No new visual language. These screens adopt the one that already exists — `tokens.ts`,
`Screen`/`ScreenHeader`/`Card`/`Button`/`Pill`/`Segmented`/`Avatar`/`StarRow`, the cream canvas,
the sun-ray header — at a density suited to adults reading rosters and tables rather than
grade-schoolers playing.

The photographic `ImageBackground` on the dashboard goes. It is the single biggest reason the
teacher side reads as a different app, and it forces white-on-photo text that the legibility
floor exists to prevent.

## Scope

Four screens, plus one deletion:

1. **Teacher Account** (`teacher-dashboard-screen.tsx`) — restyled, and reworked to surface the
   class's active content pack.
2. **Class Overview** (`class-overview-screen.tsx`) — restyled; class code card and roster.
3. **Class Content** (`class-map-screen.tsx`, renamed) — restyled, with the legacy assign/lock
   card deleted.
4. **Leader Board** (`teacher-leaderboard-screen.tsx`) — restyled, de-emojified, and routed
   through `t()`.

Out of scope for this pass, each its own later slice: Performance Progression, the four admin
screens, the four settings/info screens, and the splash screen.

## Requirements

### R1 — Inherit the shared design layer

As R1 of the original revamp: no screen in scope may hardcode a colour, radius, font size or
shadow. Layout-only local `StyleSheet`s are still fine.

### R2 — Legibility, tap targets, no emoji as icons

R2, R3 and R4 of the original revamp apply unchanged. R4 is the one with real work behind it
here: the pace badges and the star rating on the leader board become `Icon` and `StarRow`.

### R3 — Behaviour is unchanged, except where this spec says otherwise

No API call changes, no analytics changes, no new destinations. Every existing action — generate
code, edit code, share, remove student, assign pack, clear pack, clear results, navigate to a
student summary — survives with the same semantics. The deliberate exceptions are R4 through R7.

### R4 — The legacy assign/lock is deleted

`class-map-screen.tsx`'s Assign / Lock Activity card is removed outright, along with the
`assignment`, `setAssignment` and `clearAssignment` members of `class-context.tsx`. A grep over
`src` confirms `class-map-screen.tsx` is their only consumer.

This is safe because the feature is already dead. Content packs superseded it, and the class
`assignment` is read by nothing else: not by any student screen in the app, and not by any
backend route outside `modules/classes/*`. (`modules/content/*` mentions "assignment", but that
is a jigsaw activity/picture assignment — an unrelated concept.) A class that still carries a
stale `assignment` on its document is inert.

`ApiClass.assignment` and `classesApi.setAssignment`/`clearAssignment` stay in the API layer —
the backend route still exists, and removing the client wrappers is not this slice's business.

### R5 — Class Map becomes Class Content

With the assign card gone the screen holds only the content-pack card and a link to the pack
library, so the name no longer describes it. The route file, the screen file, the menu entry and
the `classMap` i18n key are renamed together.

Not resolved by this spec: Class Content now overlaps the dashboard's own Content Packs row.
Merging them is a navigation change and needs its own decision — flagged on the canvas, left
alone here.

### R6 — Every teacher string goes through `t()`

`teacher-leaderboard-screen.tsx` is the offender; the other three screens are already routed.
Each new or rescued string gets both an `en` and a `tl` entry, following the precedent set by
`e9fd40d` ("route AssignPackDialog copy through t() instead of hardcoded Tagalog"). The existing
Tagalog wording is preserved as the `tl` value rather than retranslated.

### R7 — Menu labels lose their shouting

`classOverview`, `leaderBoard`, `classMap` and `performanceProgression` are stored uppercase
(`'CLASS OVERVIEW'`) and then passed through `.toUpperCase()` again at the call site. The stored
values become Title Case and the call-site `.toUpperCase()` goes; the design renders them in
`bodyStrong`, where caps read as shouting.

## Non-goals

- New analytics. The dashboard shows the pack name and member count because both are already on
  `ApiClass`; it does not gain a completion percentage, which would need a second fetch.
- Merging Class Content with Content Packs (see R5).
- Changing what "Clear All Data" does, though it is worth a separate look: it is one tap from the
  leader board and calls `DELETE /results` for the whole class.
- Retranslating existing Tagalog copy.
- Tablet layouts, dark mode, animation beyond what exists.

## Risks

- **No screen-level test infrastructure.** Unchanged from the original revamp: `vitest` here runs
  pure modules only. Anything extractable and pure — a pace-to-tone mapping, a duration
  formatter — gets a real unit test; the screens themselves are verified by running the app
  against a per-screen checklist. The plan will not pretend otherwise.
- **The leader board is the big one.** It carries filters, a legend, sorting, pace badges, a
  destructive action and roughly 30 hardcoded strings. It is a task of its own and should land in
  its own commit.
- **Tagalog runs longer than English.** The menu rows and the pack card have slack, but
  `performanceProgression` in `tl` is long and needs checking at 390px before merge.
- **A concurrent session is active in this repo.** The leaderboard/avatar work landed here while
  this design was being drawn. Each screen is its own commit so any one can be reverted alone,
  and `src/shared/components/ui/index.ts` is a likely collision point.
