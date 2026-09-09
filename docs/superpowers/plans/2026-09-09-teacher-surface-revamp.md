# Teacher Surface Revamp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the four screens a teacher uses daily onto the shared design system, delete the dead assign/lock feature, and give the leader board the English it never had.

**Architecture:** No new visual language and no new primitives — every screen in scope composes the existing `Screen`/`ScreenHeader`/`Card`/`Button`/`Pill`/`Segmented`/`Avatar`/`StarRow` set and references `tokens`. Two supporting changes come first: the translation dictionaries are restructured so TypeScript enforces `en`/`tl` parity, and the leader board's two pure formatting concerns are extracted into a tested module.

**Tech Stack:** React Native 0.86 / Expo 57, expo-router, TypeScript, vitest (pure modules only), react-native-svg.

**Spec:** `docs/superpowers/specs/2026-09-09-teacher-surface-revamp-design.md`

**Visual spec:** https://claude.ai/code/artifact/0c4a95e4-a4bb-47d0-b44f-bc4929b79a41

## Global Constraints

- No screen may hardcode a colour, radius, font size or shadow. Everything comes from `src/shared/theme/tokens.ts`. Layout-only local `StyleSheet`s are fine. (Spec R1)
- No text below 11.5px; body copy 15px minimum. (Spec R2, inherited)
- Anything tappable is at least 46px on its shorter axis (`tokens.hit.min`); primary actions 56px (`tokens.hit.primary`). (Spec R2, inherited)
- No emoji standing in for an icon. Emoji that are *content* — a user's chosen avatar — stay. (Spec R2, inherited)
- Behaviour is unchanged except where a task says otherwise: no API call changes, no analytics changes, no new destinations. (Spec R3)
- Every user-visible string goes through `t()` with both an `en` and a `tl` entry. Existing Tagalog wording is preserved as the `tl` value, never retranslated. (Spec R6)
- `vitest` here runs pure modules only. A module under test must not import React or anything from `react-native`; import app types with `import type`, which is erased before the test runs.
- Every task ends with `npx tsc --noEmit` and `npx vitest run` both clean, and its own commit.

## File Structure

**Created:**
- `src/features/teacher/lib/leaderboard-format.ts` — the leader board's two pure concerns: seconds → `"14m 20s"`, and `LearnerPace` → the tone tokens and icon name its badge draws with. Pure so it can be tested; no React, no `react-native`.
- `src/features/teacher/lib/leaderboard-format.test.ts` — its tests.

**Modified:**
- `src/shared/i18n/language-context.tsx` — split the one `translations` literal into `en` and a `tl` annotated `Record<TranslationKey, string>`, then add the leader board's keys.
- `src/features/teacher/screens/teacher-dashboard-screen.tsx` — restyle, surface the active pack.
- `src/features/teacher/screens/class-overview-screen.tsx` — restyle.
- `src/features/teacher/screens/class-map-screen.tsx` → renamed `class-content-screen.tsx` — restyle, delete the assign/lock card.
- `src/app/(teacher)/class-map.tsx` → renamed `src/app/(teacher)/class-content.tsx`.
- `src/features/teacher/context/class-context.tsx` — drop `assignment`, `setAssignment`, `clearAssignment`.
- `src/features/leaderboard/screens/teacher-leaderboard-screen.tsx` — restyle, de-emojify, route through `t()`.

---

## Task 1: Make `tl` parity a compile error

`TranslationKey` is `keyof typeof translations['en']`, so `t()` is checked against the English dictionary alone. A key added to `en` and forgotten in `tl` compiles fine and falls back silently at runtime. Task 6 adds ~25 keys to both dictionaries, so close this hole first.

Both dictionaries are at 204 keys and already in perfect parity as of this plan, so this is a pure refactor: after the change `tsc` should be clean with no strings to chase down. If it reports missing properties, someone has added a key since — add the Tagalog values rather than loosening the annotation.

**Files:** Modify `src/shared/i18n/language-context.tsx:5`, `:455-456`

**Interfaces:**
- Produces: `TranslationKey` (unchanged name and meaning), `translations` (unchanged shape `{ en, tl }`)

- [ ] **Step 1: Split the literal**

Replace the opening `const translations = {` / `en: {` with a top-level `const en = {`, and close it at the end of the English block. Then the Tagalog block becomes its own annotated constant, and the pair is reassembled:

```ts
const en = {
  chooseLanguage: 'SELECT YOUR LANGUAGE',
  // ... every existing English entry, unchanged, de-indented one level
};

export type TranslationKey = keyof typeof en;

// Annotated, so a key present in `en` and missing here is a compile error
// rather than a silent English fallback at runtime.
const tl: Record<TranslationKey, string> = {
  chooseLanguage: 'PUMILI NG WIKA',
  // ... every existing Tagalog entry, unchanged, de-indented one level
};

const translations = { en, tl };
```

Delete the old `export type TranslationKey = keyof typeof translations['en'];` line — the type is now declared between the two dictionaries, because `tl`'s annotation depends on it.

- [ ] **Step 2: Prove the guard works**

Temporarily delete any one entry from `tl` and run `npx tsc --noEmit`.
Expected: FAIL, naming the missing property on the `tl` declaration.
Restore the entry and re-run.
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/shared/i18n/language-context.tsx
git commit -m "refactor: make a missing Tagalog string a compile error"
```

---

## Task 2: Extract the leader board's pure formatting

`formatSeconds` and `PACE_META` live inside the screen file, and `PACE_META` carries emoji labels and hardcoded hex. Pull both out, drop the emoji, and map onto tokens — this is the only genuinely testable logic in the slice, so it gets real tests.

**Files:**
- Create: `src/features/teacher/lib/leaderboard-format.ts`
- Test: `src/features/teacher/lib/leaderboard-format.test.ts`

**Interfaces:**
- Consumes: `LearnerPace` from `@/features/results/context/student-results-context` (`'fast' | 'steady' | 'needs-support'`), imported with `import type`.
- Produces:
  - `formatDuration(totalSeconds: number): string`
  - `paceTone(pace: LearnerPace): { bg: string; fg: string; icon: IconName; labelKey: TranslationKey }`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest';
import { formatDuration, paceTone } from './leaderboard-format';

describe('formatDuration', () => {
  it('renders minutes and zero-padded seconds', () => {
    expect(formatDuration(860)).toBe('14m 20s');
    expect(formatDuration(65)).toBe('1m 05s');
  });

  it('rounds to the nearest second', () => {
    expect(formatDuration(64.6)).toBe('1m 05s');
  });

  // The screen sums timings that can arrive empty or, defensively, negative.
  it('floors at zero rather than rendering a negative duration', () => {
    expect(formatDuration(0)).toBe('0m 00s');
    expect(formatDuration(-5)).toBe('0m 00s');
  });

  it('keeps counting in minutes past an hour', () => {
    expect(formatDuration(3725)).toBe('62m 05s');
  });
});

describe('paceTone', () => {
  it('gives every pace a distinct tone and a real icon name', () => {
    const tones = (['fast', 'steady', 'needs-support'] as const).map(paceTone);
    expect(new Set(tones.map((t) => t.bg)).size).toBe(3);
    expect(tones.every((t) => t.icon.length > 0)).toBe(true);
  });

  it('draws from the token palette, never a private hex', () => {
    // Guards the rule the old PACE_META broke: #D4A017, #8E9AAF, #B08D57.
    const palette = new Set(Object.values(tokens.color));
    for (const pace of ['fast', 'steady', 'needs-support'] as const) {
      const { bg, fg } = paceTone(pace);
      expect(palette.has(bg)).toBe(true);
      expect(palette.has(fg)).toBe(true);
    }
  });
});
```

Add `import { tokens } from '@/shared/theme/tokens';` to the test file — `tokens.ts` has no React import on purpose and is already unit-tested, so it is safe to import here.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/features/teacher/lib/leaderboard-format.test.ts`
Expected: FAIL — cannot resolve `./leaderboard-format`.

- [ ] **Step 3: Write the implementation**

```ts
import { tokens } from '@/shared/theme/tokens';
import type { IconName } from '@/shared/components/ui/icon';
import type { TranslationKey } from '@/shared/i18n/language-context';
import type { LearnerPace } from '@/features/results/context/student-results-context';

/** Seconds as `14m 20s`. Minutes keep counting past an hour — a teacher reads these as effort, not clock time. */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  return `${Math.floor(s / 60)}m ${(s % 60).toString().padStart(2, '0')}s`;
}

/**
 * The badge a pace draws with. Replaces the old `PACE_META`, whose labels were
 * emoji strings and whose colours were three hexes belonging to no palette.
 */
export function paceTone(pace: LearnerPace): { bg: string; fg: string; icon: IconName; labelKey: TranslationKey } {
  switch (pace) {
    case 'fast':
      return { bg: tokens.color.successSoft, fg: tokens.color.successInk, icon: 'bolt', labelKey: 'paceFast' };
    case 'needs-support':
      return { bg: tokens.color.goldSoft, fg: tokens.color.goldInk, icon: 'help', labelKey: 'paceNeedsSupport' };
    case 'steady':
    default:
      return { bg: tokens.color.surfaceSunken, fg: tokens.color.inkMuted, icon: 'minus', labelKey: 'paceSteady' };
  }
}
```

- [ ] **Step 4: Reconcile the icon names**

`'bolt'`, `'help'` and `'minus'` must exist in `src/shared/components/ui/icon-registry.ts`. Check with:

```bash
grep -oE "^\s+[a-zA-Z]+:" src/shared/components/ui/icon-registry.ts | tr -d ' :' | sort
```

For each that is missing, add a stroke-based 24×24 path to the registry alongside the existing icons and extend `icon-registry.test.ts` the way that file already covers the others. Do not substitute an unrelated existing icon to avoid the work.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/features/teacher/lib/leaderboard-format.test.ts && npx tsc --noEmit`
Expected: PASS, and no type errors. `paceFast` / `paceSteady` / `paceNeedsSupport` will not exist as keys yet — add them in Task 6 Step 1, or add them now if `tsc` complains here.

- [ ] **Step 6: Commit**

```bash
git add src/features/teacher/lib/ src/shared/components/ui/icon-registry.ts src/shared/components/ui/icon-registry.test.ts
git commit -m "feat: extract and test the leader board's duration and pace formatting"
```

---

## Screen conversion tasks

Tasks 3–6 each convert one screen. **The rules are identical for every one**, so they are stated once here and each task lists only its specifics.

**For every screen task:**

1. Open the matching artboard on the canvas (https://claude.ai/code/artifact/0c4a95e4-a4bb-47d0-b44f-bc4929b79a41) and match it.
2. Replace the screen's `SafeAreaView` root with `<Screen>`, its header block with `<ScreenHeader>`, its cards with `<Card>`, its buttons with `<Button>`, its `<Text>` with the typography components from `@/shared/components/ui`, and every emoji-as-icon with `<Icon>`.
3. Delete from the local `StyleSheet` every rule now served by a primitive. Whatever remains must reference `tokens` — no literal colours, radii, font sizes or shadows.
4. **Change no hook, context call, handler, route or condition** except where the task says so explicitly. If a behaviour change looks necessary and is not listed, stop and raise it.
5. Verify: `npx tsc --noEmit`, `npx vitest run`, then run the app and walk the screen against the task's checklist.
6. Commit alone, so a single screen can be reverted without the others.

---

### Task 3: Teacher Account

**Files:** Modify `src/features/teacher/screens/teacher-dashboard-screen.tsx`

**Artboard:** `Teacher Account`

Specifics:
- The `ImageBackground` with `images.teacherDashboard` goes; the screen sits on the canvas colour.
- `<ScreenHeader>` carries the teacher's `name` as its title, `t('teacherAccountTitle')` as its subtitle, and a 76px avatar in the `right` slot — the same identity pattern `profile-screen.tsx` uses. Below it, two `<Pill tone="translucent">`: grade · section, and the student count.
- New: an active-content-pack `<Card raised>` above the menu, showing the pack name, a `Shared` / `Your own copy` badge from `currentClass.packBinding`, and `currentClass.packVersion`. Tapping it routes to `/class-content`. The pack *name* is not on `ApiClass` — resolve it the way `class-map-screen.tsx` already does rather than inventing a new fetch. When `currentClass?.packId` is null, the card reads `t('contentPackNoneAssigned')` and routes to the same place.
- The five `menuItems` become rows in a `<Card>`-styled list: a 44px tinted icon tile, the label in `<BodyStrong>`, a chevron. Keep every `href` exactly as it is, except `/class-map` → `/class-content` (Task 5 renames the route; until then this will not resolve, so do Task 5 first or land them together).
- Keep the tile colours: Class Overview `points`, Leader Board `success`, Class Content `navQuiz`, Content Packs `navJigsaw`, Performance `navLeaderboard`. The current file uses `#9B4FD6` twice; `navLeaderboard` is what differentiates Performance.
- The 2-item bottom nav keeps its two destinations. `BottomNav` is hardcoded to the four student tabs, so do **not** reuse it — keep a local bar built from `tokens` matching the artboard.

**Checklist:** every menu item still routes; the pack card reflects a class with and without a pack; the student count matches `totalStudents`; grade falls back the way the current `grade` expression does when the class has no `gradeLevel`.

---

### Task 4: Class Overview

**Files:** Modify `src/features/teacher/screens/class-overview-screen.tsx`

**Artboard:** `Class Overview`

Specifics:
- `<ScreenHeader>` with a back button, `t('classOverview')` as title, grade · section as subtitle.
- The class-code block becomes a `<Card raised>`: the code on a `surfaceSunken` plate in `tokens.type.display` with ~4px letter spacing, then a row of a full-width primary `<Button>` for `t('generateCode')` and two 56px icon buttons for edit and share.
- The edit state keeps its `TextInput` — there is no input primitive yet, and adding one belongs to the design-system slice, not here. Style it from `tokens` (border `tokens.color.border`, radius `tokens.radius.md`, `tokens.type.display` for the value) and keep `draftCode`, `handleSaveCustom` and `handleStartEdit` exactly as they are.
- The roster becomes rows carrying `<Avatar>` (which already derives colour and initials from the name), the student name in `<BodyStrong>`, `@username` in `<Caption>`, and a 40px remove button in `dangerSoft`/`dangerInk`.
- Keep `handleRefresh`, the `RefreshControl`, `handleRemove`'s confirmation `Alert`, `handleShare`, and the error banner — restyle the banner with `dangerSoft`/`dangerBorder`/`dangerInk`.

**Checklist:** generate, edit-and-save, and cancel all still write the code; share still opens the sheet; removing a student still confirms first and then removes; pull-to-refresh still refetches; the error banner still appears when `error` is set.

---

### Task 5: Class Content

**Files:**
- Rename: `src/features/teacher/screens/class-map-screen.tsx` → `src/features/teacher/screens/class-content-screen.tsx`
- Rename: `src/app/(teacher)/class-map.tsx` → `src/app/(teacher)/class-content.tsx`
- Modify: `src/features/teacher/context/class-context.tsx`
- Modify: `src/shared/i18n/language-context.tsx`

**Artboards:** `Class Content — pack assigned`, `Class Content — no pack`

Specifics:
- **Delete the Assign / Lock Activity card outright** — the title, description, the current-assignment badge, both chip rows, the assign and clear buttons, and the `draftCategory` / `draftGameType` / `handleAssign` / `handleClear` state and handlers that serve only it. Also delete `assignment`, `setAssignment` and `clearAssignment` from `class-context.tsx`; `grep -rn "assignment" src --include=*.tsx --include=*.ts` should afterwards report only `ApiClass.assignment` in `types.ts`, the two `classesApi` wrappers in `endpoints.ts`, and jigsaw *activity* assignments in the content modules. Leave those alone (Spec R4).
- Rename the route. `expo-router` derives paths from filenames, so `/class-map` becomes `/class-content`; update the `href` in `teacher-dashboard-screen.tsx` and any other navigation to it. `grep -rn "class-map" src` must come back empty.
- Rename the i18n key `classMap` → `classContent` and set the values to `Class Content` / `Nilalaman ng Klase`. Task 1's guard means both dictionaries must change together.
- The pack card becomes a `<Card raised>` matching the assigned artboard: a 52px `navJigsaw` tile, the pack name in `<H2>`, the binding badge, the version, a `divider` rule, one line of `<Body>` explaining what students see, then a primary `<Button>` for `t('contentPackChangeBtn')` and a danger-toned one for `t('contentPackClearBtn')`.
- The no-pack state matches the empty artboard: a 72px `surfaceSunken` tile, `t('contentPackNoneAssigned')`, and a single full-width primary `<Button>`. Both states keep opening `AssignPackDialog` through `setDialogOpen(true)`.
- Keep `handleAssignPack`, `handleClearPack`, `clearingPack`, the `assignedPack` lookup and the `AssignPackDialog` mount untouched.
- The Manage Packs link becomes a row like the dashboard's, still routing to `/packs`.

**Checklist:** assigning a pack through the dialog still assigns; clearing still clears and drops to the empty state; the screen renders both states; `/class-content` resolves from the dashboard; no route or grep still mentions `class-map`; students are unaffected by the deleted assignment (verify one student account still sees its content).

---

### Task 6: Leader Board

The biggest task in the slice: it carries the restyle, the emoji removal, and roughly 30 strings that never went through `t()`.

**Files:** Modify `src/features/leaderboard/screens/teacher-leaderboard-screen.tsx`, `src/shared/i18n/language-context.tsx`

**Artboard:** `Leader Board`

- [ ] **Step 1: Add the strings first**

Add to `en`, and to `tl` using the wording already hardcoded in the screen. Task 1's guard fails the build if either side is missing. The pace keys are the ones `paceTone` returns from Task 2, and their `tl` values are the old labels **with the emoji stripped**:

| key | `en` | `tl` (from the current file) |
|---|---|---|
| `paceFast` | `Fast learner` | `Mabilis Matuto` |
| `paceSteady` | `Steady` | `Sakto sa Bilis` |
| `paceNeedsSupport` | `Needs support` | `Kailangan ng Tulong` |
| `trophyGuide` | `Trophy Guide` | `Gabay sa Trophy` |
| `clearBoardTitle` | `Clear the leaderboard?` | `I-clear ang Leaderboard?` |
| `clearBoardMsg` | `This erases every recorded result for this class.` | `Buburahin lahat ng naitalang resulta ng klaseng ito.` |
| `clearAllData` | `Clear All Data` | `I-clear ang Lahat ng Data` |
| `cancel` | `Cancel` | `Kanselahin` |
| `allFilter` | `All` | `Lahat` |
| `filterTopic` | `All topics` | `Lahat ng paksa` |
| `filterType` | `All types` | `Lahat ng uri` |
| `filterLevel` | `All levels` | `Lahat ng level` |

Continue the same way for every remaining literal in the file — the legend body, the `Tapos na` / `Hindi Nabura` alert titles, the filter section labels, the stats suffixes and the empty-state line. Reuse an existing key where one already says the same thing (`gameTypeQuiz`, `gameTypeJigsaw`, `back`) rather than adding a duplicate.

- [ ] **Step 2: Restyle the screen**

- `<ScreenHeader>` with back, `t('leaderBoard')` as title, and grade · section · activity count as subtitle. A 46px help button in the `right` slot toggles `showLegend`.
- The sort control becomes `<Segmented tone="onDark">` inside the header with `points` and `speed` options — the same control the student board uses. Keep `sortMode` and the existing sort comparison.
- The three stacked filter grids collapse into three chips in one row, each opening its existing option set. Keep `category`, `activityType`, `level` and `isUnfiltered` exactly as they are — `isUnfiltered` still gates the trophy column.
- Rows become `<Card>`s: rank, `<Avatar>`, name in `<BodyStrong>`, a pace badge built from `paceTone(...)`, `<StarRow earned={Math.round(s.avgStars)} />`, and a right column with the trophy `<Icon>` tinted `medalGold`/`medalSilver`/`medalBronze`, the points in `<H3>`, and `formatDuration(s.totalTimeUsed)` in `<Caption>`. Keep the row's `router.navigate` to `/student-summary` with the same params.
- Delete `TROPHY_COLORS`, `formatSeconds`, `PACE_META` and `starsDisplay` from the screen — Task 2 replaced the first three and `<StarRow>` replaces the last. `#FFC700` in particular was a near-miss for `tokens.color.medalGold` (`#FCD116`).
- The legend keeps its content and its toggle; restyle it as a `<Card>` and swap its emoji for the same `<Icon>`s the rows use.
- `Clear All Data` becomes a full-width danger `<Button>`; keep `handleClear`'s confirmation `Alert` and `clearResults()` call unchanged.

- [ ] **Step 3: Verify and commit**

Run: `npx tsc --noEmit && npx vitest run`
Then run the app and walk the checklist.

**Checklist:** switching Points/Speed reorders; each filter narrows the board and the trophy column disappears when any filter is set; the legend opens and closes; a row still opens that student's summary; Clear All Data still confirms and then clears; switching the app to English shows English on this screen for the first time.

```bash
git add src/features/leaderboard/screens/teacher-leaderboard-screen.tsx src/shared/i18n/language-context.tsx
git commit -m "feat: rebuild the teacher leader board on the design system"
```

---

## Task 7: Menu labels and sweep

**Files:** Modify `src/shared/i18n/language-context.tsx`, `src/features/teacher/screens/teacher-dashboard-screen.tsx`

- [ ] **Step 1: Stop the shouting**

`classOverview`, `leaderBoard`, `classContent` and `performanceProgression` are stored uppercase (`'CLASS OVERVIEW'`) and then passed through `.toUpperCase()` again at the call site. Change the stored values to Title Case in both dictionaries and delete the call-site `.toUpperCase()`. The design renders them in `<BodyStrong>`.

Check first whether any other screen renders these keys and relies on the caps:

```bash
grep -rn "classOverview\|leaderBoard\|classContent\|performanceProgression" src --include=*.tsx
```

- [ ] **Step 2: Prove the four screens are actually on the system**

```bash
for f in src/features/teacher/screens/teacher-dashboard-screen.tsx \
         src/features/teacher/screens/class-overview-screen.tsx \
         src/features/teacher/screens/class-content-screen.tsx \
         src/features/leaderboard/screens/teacher-leaderboard-screen.tsx; do
  printf "%-70s tokens=%s rawhex=%s\n" "$f" \
    "$(grep -c 'tokens\.' "$f")" \
    "$(grep -oE \"'#[0-9A-Fa-f]{3,8}'\" "$f" | wc -l | tr -d ' ')"
done
```

Expected: every file has a non-zero `tokens` count and `rawhex=0`. Any remaining hex is a Global Constraints violation — fix it rather than recording it.

- [ ] **Step 3: Check Tagalog at width**

Switch the app to Tagalog and look at the dashboard menu and the pack card at 390px. `performanceProgression` in `tl` is the long one. If a label wraps badly, allow two lines rather than shrinking below the 11.5px floor.

- [ ] **Step 4: Full verification and commit**

Run: `npx tsc --noEmit && npx vitest run && npx expo lint`
Expected: types clean, tests pass, and `expo lint` reports nothing new in the files this plan touched (the repo has pre-existing lint problems elsewhere — compare against `main`).

```bash
git add -A
git commit -m "refactor: title-case the teacher menu labels"
```

---

## Self-Review

**Spec coverage:**

| Spec requirement | Task |
|---|---|
| R1 — inherit the design layer | Tasks 3–6, enforced by Task 7 Step 2 |
| R2 — legibility, tap targets, no emoji | Global Constraints; emoji specifically in Tasks 2 and 6 |
| R3 — behaviour unchanged | Screen-task rule 4, plus each task's checklist |
| R4 — delete the legacy assign/lock | Task 5 |
| R5 — Class Map → Class Content | Task 5 |
| R6 — every string through `t()` | Task 6 Step 1, guarded by Task 1 |
| R7 — menu labels lose their shouting | Task 7 Step 1 |

**Known ordering constraint:** Task 3 points the dashboard at `/class-content`, which Task 5 creates. Land Task 5 before Task 3, or land the two together.

**Deliberately not covered:** merging Class Content with Content Packs (Spec R5 leaves it open), the scope of "Clear All Data" (Spec non-goal), and Performance Progression plus the admin and settings screens (later slices).
