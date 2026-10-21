# Attempt Limits, Attempt-Weighted Points & Sound — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cap every Quiz/Jigsaw activity at 3 attempts, award 15/10/6 points for a pass on attempt 1/2/3, let exhausted activities count toward finishing a level, and add app-wide music plus feedback sounds with Music / Sound-effects switches.

**Architecture:** The API (`juanwise-be`) is the authority: `scoreAttempt` takes the attempt number, `results.submit` refuses a 4th attempt or a replay after a pass, and progress tracks store attempts-per-slot and an `exhaustedActivities` list that counts toward the level unlock. The app mirrors the same rules in a pure `attempt-rules.ts` for offline play and UI, stops calling the direct progress endpoints, and gets one root `SoundProvider` built on `expo-audio`.

**Tech Stack:** Express + Firestore + Zod + Vitest (`juanwise-be`); Expo SDK 57, expo-router, React Native 0.86, Vitest (`juanwise-app-v2`); `expo-audio`.

**Spec:** `docs/superpowers/specs/2026-10-21-attempts-and-sound-design.md`

Paths prefixed `be/` are in `/Volumes/SSD/juanwise-app-main/juanwise-be`; all others are in `/Volumes/SSD/juanwise-app-main/juanwise-app-v2`. Run each repo's tests from its own root (`npm test`, and `npm run typecheck` in `be/`).

## Global Constraints

- `MAX_ATTEMPTS = 3` per slot (uid + class + category + activityType + level + activityNum).
- Pass points = `Math.floor(POINTS_PER_ACTIVITY * share)`, shares `[1, 0.7, 0.4]` → **15, 10, 6**. A fail is 0.
- Medal thresholds, trophy tiers, the 70/30 performance formula and `MAX_POINTS` (900) do not change.
- A passed slot can never be played again; an exhausted slot (3 failed attempts) can never be played again and counts toward its level's 6.
- Points already stored on existing results are never rewritten.
- Every new user-visible string goes through `t()` with both `en` and `tl` entries in `src/shared/i18n/language-context.tsx`.
- Music plays across the whole app; `sfx-tap` only on in-game taps; sound respects the iOS silent switch; Music and Sound effects default on and persist on the device.

## Review Focus

1. **A slot with 3+ legacy attempts and no `attempts` map on its track** → the server still refuses a 4th (it counts results, not the map) and the backfill marks it exhausted. Test in Task 3 (`assertCanAttempt(3, false)` throws) and Task 5 (backfill fixture).
2. **A queued offline attempt that the server later refuses with 409** → the outbox drops it (existing behaviour for non-transient errors) and the next progress refresh shows the server's state; no alert. Test in Task 7.
3. **Old data: pass followed by a failed replay** → the pass counts on the server leaderboard (15 points, not 0). Test in Task 1.
4. **The direct `POST /progress/complete` with no passing result** → no slot is marked completed. Test in Task 4.
5. **Music across app background/foreground and toggling Music off mid-track** → music pauses on background, resumes on foreground only if Music is on, and stops immediately when switched off. Manual check in Task 10.

---

### Task 1: Server scoring — attempt shares and pass-first canonical

**Files:**
- Modify: `be/src/shared/constants.ts`
- Modify: `be/src/modules/results/scoring.ts` (`pickCanonical`, `scoreAttempt`)
- Test: `be/tests/scoring.test.ts`

**Interfaces:**
- Produces: `MAX_ATTEMPTS = 3`, `ATTEMPT_POINT_SHARES = [1, 0.7, 0.4] as const` in constants; `pointsForAttempt(attemptSeq: number): number` in `scoring.ts`; `scoreAttempt(input)` gains a required `attemptSeq: number` field.

- [ ] **Step 1: Write failing tests** in `be/tests/scoring.test.ts`:
  - `pointsForAttempt(1) === 15`, `(2) === 10`, `(3) === 6`; `pointsForAttempt(4)` and `(0)` → `0`.
  - `scoreAttempt({ activityType: 'quiz', correctCount: 1, requiredCount: 1, timeUsed: 10, timedOut: false, attemptSeq: 2 })` → `{ points: 10, medal: 'gold', timeUsed: 10 }`.
  - A failed attempt with `attemptSeq: 1` → `points: 0, medal: 'none'`.
  - `getCanonicalAttempts([pass at 2026-01-01 attemptSeq 1, fail at 2026-01-02 attemptSeq 2])` returns the pass; `summarize` of those gives `totalPoints: 15`.
  - Two failures → the later one is canonical (unchanged behaviour).
- [ ] **Step 2: Run** `npm test -- scoring` in `be/` — expect the new tests to FAIL.
- [ ] **Step 3: Implement.** `pointsForAttempt` returns `Math.floor(POINTS_PER_ACTIVITY * ATTEMPT_POINT_SHARES[attemptSeq - 1])`, or 0 out of range. `scoreAttempt` uses it for a pass. `pickCanonical`: if exactly one of `a`/`b` has `points > 0`, return it; otherwise keep today's latest-wins logic. Update its doc comment (the ASSUMPTION note is resolved).
- [ ] **Step 4: Run** `npm test && npm run typecheck` in `be/` — PASS. (`results.service.ts` will fail typecheck until Task 3. Pass `attemptSeq: priorAttempts + 1` there now so the tree compiles.)
- [ ] **Step 5: Commit** in `be/`: `feat(scoring): reduce pass points by attempt and keep the passing attempt`

### Task 2: Progress rules — attempts map and exhausted slots

**Files:**
- Create: `be/src/modules/progress/progress-rules.ts`
- Modify: `be/src/modules/progress/progress.repository.ts` (`emptyTrack`, `listTracks`, `getTrack`, `markActivity`)
- Modify: `be/src/modules/progress/progress.schema.ts` (`trackSchema`)
- Test: `be/tests/progress-rules.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface TrackState {
    unlockedLevel: number;
    completedActivities: string[];   // `${level}_${activityNum}`
    failedActivities: string[];
    exhaustedActivities: string[];   // subset of failed: 3 attempts, never passed
    attempts: Record<string, number>; // marker -> attempts used
  }
  export function applyOutcome(current: TrackState, level: number, activityNum: number,
    outcome: 'completed' | 'failed', attemptSeq: number): TrackState;
  ```
  `markActivity(uid, classId, category, activityType, level, activityNum, outcome, attemptSeq)` gains the trailing `attemptSeq: number`. `trackSchema` gains `exhaustedActivities: z.array(z.string())` and `attempts: z.record(z.string(), z.number().int())`; reads default both to empty when the field is missing.

- [ ] **Step 1: Write failing tests** in `be/tests/progress-rules.test.ts`:
  - A fail at attemptSeq 1 puts `1_1` in `failedActivities`, `attempts['1_1'] === 1`, not exhausted.
  - A fail at attemptSeq 3 also puts `1_1` in `exhaustedActivities`.
  - 5 completed + 1 exhausted in level 1 → `unlockedLevel === 2`.
  - A completed slot stays completed after a later `'failed'` call, and is never added to failed/exhausted.
  - `attempts[marker]` is `Math.max(existing, attemptSeq)` (a replayed lower seq never lowers it).
  - Unlock never regresses below `current.unlockedLevel`, and is capped at `LEVELS_PER_TYPE`.
- [ ] **Step 2: Run** `npm test -- progress-rules` — FAIL.
- [ ] **Step 3: Implement `applyOutcome`** by moving the set and unlock logic out of `markActivity`. The per-level count is over `completed ∪ exhausted`. Exhausted = `outcome === 'failed' && attemptSeq >= MAX_ATTEMPTS && !completed`. `markActivity` keeps the transaction and calls `applyOutcome`. Its write and return include the two new fields.
- [ ] **Step 4: Run** `npm test && npm run typecheck` in `be/` — PASS. (Callers of `markActivity` get `attemptSeq` in Tasks 3–4. Until then, pass `priorAttempts + 1` from `submit` and `0` from the progress service.)
- [ ] **Step 5: Commit**: `feat(progress): track attempts per activity and let exhausted activities finish a level`

### Task 3: Submit guard — refuse a 4th attempt or a replay

**Files:**
- Modify: `be/src/modules/results/results.service.ts` (`submit`)
- Modify: `be/src/modules/results/results.repository.ts` (add `listSlotAttempts`, re-express `countAttempts` on it)
- Test: `be/tests/attempt-guard.test.ts`

**Interfaces:**
- Produces: `assertCanAttempt(priorAttempts: number, alreadyPassed: boolean): void`, exported from `results.service.ts`, throws `ConflictError`. `listSlotAttempts(uid, classId, category, activityType, level, activityNum): Promise<ActivityResult[]>` uses the same equality filters as today's `countAttempts`. Those filters are already indexed, and there are never more than 3 rows per slot.

- [ ] **Step 1: Write failing tests:** `assertCanAttempt(0,false)` and `(2,false)` don't throw. `(3,false)` throws `ConflictError` with message `'You have used all 3 tries for this activity.'`. `(1,true)` throws with `'You already passed this activity.'`.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement.** In `submit`, load `listSlotAttempts` before scoring. `alreadyPassed = rows.some(r => r.points > 0)` (from results, not the track, so legacy slots are covered). Call `assertCanAttempt(rows.length, alreadyPassed)`. Then pass `attemptSeq = rows.length + 1` to `scoreAttempt` and `markActivity`.
- [ ] **Step 4: Run** `npm test && npm run typecheck` — PASS.
- [ ] **Step 5: Commit**: `feat(results): cap activities at 3 attempts and close them once passed`

### Task 4: Lock the direct progress endpoints

**Files:**
- Modify: `be/src/modules/progress/progress.service.ts` (`markCompleted`, `markFailed`)
- Create: `be/src/modules/progress/progress-sync.ts`
- Test: `be/tests/progress-sync.test.ts`

**Interfaces:**
- Produces: `outcomeFromResults(rows: ActivityResult[]): { outcome: 'completed' | 'failed'; attemptSeq: number } | null`, which returns `null` when there are no rows.
- Behaviour: both endpoints now ignore which one was called. They read `listSlotAttempts` for the slot, using the student's `classId` the same way `submit` does, and apply `outcomeFromResults`. A `null` returns the current track unchanged via `getTrack`. Route signatures and response shape stay the same, so released app builds keep working.

- [ ] **Step 1: Write failing tests:** `[]` → `null`. `[fail seq1]` → `{ outcome: 'failed', attemptSeq: 1 }`. `[fail seq1, pass seq2]` → `{ outcome: 'completed', attemptSeq: 2 }`. Three fails → `{ 'failed', 3 }`.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement** `outcomeFromResults` and rewire both service functions.
- [ ] **Step 4: Run** `npm test && npm run typecheck` — PASS.
- [ ] **Step 5: Commit**: `fix(progress): derive progress marks from recorded results`

### Task 5: Backfill attempts onto existing tracks

**Files:**
- Create: `be/scripts/backfill-attempts.ts`, plus `"backfill-attempts": "tsx scripts/backfill-attempts.ts"` in `be/package.json`
- Create: `be/src/modules/progress/backfill-plan.ts`
- Test: `be/tests/backfill-attempts.test.ts`

**Interfaces:**
- Produces: `planTrackBackfill(current: TrackState, rows: ActivityResult[]): TrackState`. It folds every slot's `outcomeFromResults` (Task 4) through `applyOutcome` (Task 2), with rows already scoped to one uid + progress class + track.
- Script: follows `scripts/backfill-mini-lessons.ts` (`--dry-run` logs, otherwise `set(..., { merge: true })`). Results are grouped by uid, by `resolveProgressClassId(undefined, classId ? [classId] : [])` and by track. Points on result documents are never touched.

- [ ] **Step 1: Write failing tests:** a fixture slot with 4 legacy fails → exhausted with `attempts === 4`. A slot with a pass then a fail → completed, not failed. An already-unlocked level 3 stays 3.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** `npm test && npm run typecheck` — PASS.
- [ ] **Step 5: Commit**: `chore(progress): backfill attempt counts onto existing tracks`. Running the script against production is a deploy step for the user, not part of this task.

### Task 6: App attempt rules and progress context

**Files:**
- Create: `src/features/learning/lib/attempt-rules.ts`
- Test: `src/features/learning/lib/attempt-rules.test.ts`
- Modify: `src/shared/api/types.ts` (`ApiProgressTrack`)
- Modify: `src/features/learning/context/game-progress-context.tsx`

**Interfaces:**
- Produces (pure, no React Native imports):
  ```ts
  export const MAX_ATTEMPTS = 3;
  export const ATTEMPT_POINT_SHARES = [1, 0.7, 0.4] as const;
  export function pointsForAttempt(attemptSeq: number): number;            // mirrors server
  export type SlotStatus = 'open' | 'passed' | 'exhausted';
  export function slotStatus(passed: boolean, attemptsUsed: number): SlotStatus;
  export function triesLeft(attemptsUsed: number): number;                  // max(0, 3 - used)
  export interface LocalTrack { unlockedLevel: number; completed: number[]; failed: number[]; exhausted: number[]; attempts: Record<number, number> }
  export function applyAttemptToTrack(track: LocalTrack, level: number, activityNum: number, passed: boolean, attemptSeq: number): LocalTrack;
  ```
  `ApiProgressTrack` gains `exhaustedActivities: string[]` and `attempts: Record<string, number>`. Both are optional when read, defaulting to empty, so an older API response still parses.
- Context changes: `LocalTrack` moves to `attempt-rules.ts`. Add `getExhausted(category, type, level): number[]` and `getAttemptsUsed(category, type, level, activityNum): number`. Replace `completeActivity` and `failActivity` with `recordOutcome(category, type, level, activityNum, passed: boolean, attemptSeq: number): void`. It calls `applyAttemptToTrack`, writes the cache, then fires `refresh()` without awaiting. Delete the `progressApi.complete` / `progressApi.fail` calls and the now-unused `mark` / `applyLocally`.

- [ ] **Step 1: Write failing tests** in `attempt-rules.test.ts`: the same 15/10/6/0 table as Task 1. `slotStatus(false,3) === 'exhausted'`, `slotStatus(true,1) === 'passed'`, `slotStatus(false,2) === 'open'`. `applyAttemptToTrack` with 5 completed + an exhausting 3rd fail in level 1 → `unlockedLevel === 2`. A fail after a pass leaves it completed.
- [ ] **Step 2: Run** `npm test -- attempt-rules` — FAIL.
- [ ] **Step 3: Implement** `attempt-rules.ts`, then update the context and every caller of `completeActivity` / `failActivity` (`activity-play-screen.tsx`, `jigsaw-puzzle-screen.tsx`) to call `recordOutcome(..., !!recorded.medal, recorded.attemptSeq)`.
- [ ] **Step 4: Run** `npm test && npx tsc --noEmit` — PASS.
- [ ] **Step 5: Commit**: `feat(progress): mirror the 3-attempt rules on the device`

### Task 7: Offline scoring with attempts

**Files:**
- Modify: `src/features/results/context/student-results-context.tsx` (`addResult`, `scoreLocally`)
- Test: `src/features/learning/lib/attempt-rules.test.ts` (extend)

**Interfaces:**
- Consumes: `pointsForAttempt`, `MAX_ATTEMPTS` from Task 6.
- Produces: `nextAttemptSeq(existing: { category: string; activityType: string; level: number; activityNum: number }[], slot: same shape): number` in `attempt-rules.ts`, which counts the matching rows + 1. `scoreLocally(attempt, uid, name, attemptSeq)` uses `pointsForAttempt(attemptSeq)` for a pass and stores `attemptSeq`.

- [ ] **Step 1: Write failing tests:** `nextAttemptSeq` returns 1 for no rows. With 2 matching rows (one `pending`), it returns 3. Rows for another slot are ignored.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement.** In `addResult`'s offline branch, compute `nextAttemptSeq(results, attempt)` from the context's current `results` (which already holds cached and pending rows) and pass it to `scoreLocally`. Confirm `flushOutbox` drops a 409 (`ApiError.isTransient === false`) without an alert. If it doesn't, make it drop. Per spec, the online branch rethrows a 409 so the play screen's existing `Alert` shows the server's message.
- [ ] **Step 4: Run** `npm test && npx tsc --noEmit` — PASS.
- [ ] **Step 5: Commit**: `feat(results): score offline attempts with the attempt-based points`

### Task 8: Student UI — tries left, closed activities, fail modals

**Files:**
- Modify: `src/features/learning/screens/activity-list-screen.tsx`
- Modify: `src/features/learning/lib/activity-list-model.ts` (`getPrimaryActivityAction`) and `activity-list-model.test.ts`
- Modify: `src/features/learning/screens/activity-play-screen.tsx` (incorrect modal)
- Modify: `src/features/jigsaw/screens/jigsaw-puzzle-screen.tsx` (incorrect modal, around line 618)
- Modify: `src/features/learning/screens/level-summary-screen.tsx` (an exhausted slot renders as a red 0-point slot)
- Modify: `src/shared/i18n/language-context.tsx`

**Interfaces:**
- Consumes: `getExhausted`, `getAttemptsUsed`, `slotStatus`, `triesLeft` from Task 6.
- `getPrimaryActivityAction(finishedActivityNumbers, level)`: the parameter is renamed, and the caller passes completed ∪ exhausted.
- New i18n keys (en / tl):
  - `triesLeftOne`: `'1 try left'` / `'1 subok na lang'`
  - `triesLeftMany`: `'{n} tries left'` / `'{n} subok pa'`
  - `outOfTries`: `'No tries left'` / `'Wala nang subok'`
  - `triesLeftAfterFail`: `'You have {n} more {tries} for this activity.'` / `'May {n} {tries} ka pa sa aktibidad na ito.'`, where `tries` is `t('tryWordOne')` / `t('tryWordMany')`: `'try'`/`'tries'` and `'subok'`/`'subok'`
  - `activityFinishedNoTries`: `'You used all 3 tries. The next activity is open.'` / `'Nagamit mo na ang 3 subok. Bukas na ang susunod na aktibidad.'`

- [ ] **Step 1: Write the failing test** in `activity-list-model.test.ts`: with `[1,2,3,4,5]` finished and `6` exhausted passed in as finished, the result is `{ kind: 'summary' }`.
- [ ] **Step 2: Run** — FAIL (or adjust the existing test name). **Step 3: Implement:**
  - On the activity list, passed and exhausted cards are not pressable (`disabled`, and `accessibilityState.disabled`).
  - An exhausted card uses `activityCardFailed` styling with an `outOfTries` caption instead of the retry chip.
  - An open card with attempts > 0 shows `triesLeftOne` / `triesLeftMany` under its meta line.
  - `nextPlayableNum` skips exhausted cards.
  - `doneCount` counts completed + exhausted.
  - Both incorrect modals show `triesLeftAfterFail` when `triesLeft(recorded.attemptSeq) > 0`, otherwise `activityFinishedNoTries`.
- [ ] **Step 4: Run** `npm test && npx tsc --noEmit` — PASS.
- [ ] **Step 5: Commit**: `feat(learning): show tries left and close finished activities`

### Task 9: Teacher leaderboard average tries

**Files:**
- Modify: `src/features/results/context/student-results-context.tsx` (`StudentSummary`, `summarize`)
- Modify: `src/features/leaderboard/screens/teacher-leaderboard-screen.tsx` (row sub-stat, around line 409)
- Modify: `src/shared/i18n/language-context.tsx`

**Interfaces:**
- Produces: `StudentSummary.avgTriesToPass: number | null`, the mean `attemptSeq` over canonical *passing* entries, rounded to 1 decimal, or `null` with no passes. Extract it as `averageTriesToPass(canonical: { medal: unknown; attemptSeq: number }[]): number | null` in `performance-score.ts` so it's testable.
- i18n key `avgTriesStat`: `'{n} avg tries to pass'` / `'{n} karaniwang subok bago pumasa'`.

- [ ] **Step 1: Write failing tests** in `student-results-context.test.ts`: passes at seq 1 and 3 plus a fail → `2`. No passes → `null`.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** The teacher row renders `avgTriesStat` after `activityTimeoutStat` when it isn't null. The student leaderboard is unchanged. **Step 4: Run** `npm test && npx tsc --noEmit` — PASS.
- [ ] **Step 5: Commit**: `feat(leaderboard): show teachers average tries to pass`

### Task 10: Sound system and Settings switches

**Files:**
- Create: `assets/sounds/{background-music-loop,sfx-complete,sfx-correct,sfx-snap,sfx-tap,sfx-wrong}.m4a`
- Create: `src/shared/audio/sound-prefs.ts`, `src/shared/audio/sound-prefs.test.ts`
- Create: `src/shared/audio/sound-context.tsx`
- Modify: `src/app/_layout.tsx` (wrap inside `LanguageProvider`, outside `UserProvider`)
- Modify: `src/features/settings/screens/settings-screen.tsx` (replace the single `soundsOn` switch, which saves nothing, with two)
- Modify: `src/shared/i18n/language-context.tsx`, `package.json`, `app.json` (only if `expo-audio`'s config plugin is required)

**Interfaces:**
- `sound-prefs.ts` (pure): `export interface SoundPrefs { music: boolean; effects: boolean }`, `DEFAULT_SOUND_PREFS = { music: true, effects: true }`, `parseSoundPrefs(raw: string | null): SoundPrefs`, `SOUND_PREFS_KEY = 'juanwise_sound_prefs_v1'`.
- `sound-context.tsx`: `export type SfxName = 'correct' | 'wrong' | 'complete' | 'snap' | 'tap'`. `useSound(): { prefs: SoundPrefs; setMusic(on: boolean): void; setEffects(on: boolean): void; playSfx(name: SfxName): void }`.

- [ ] **Step 1: Convert assets**, for each file: `afconvert -f m4af -d aac -b 128000 ~/Downloads/sounds/<name>.wav assets/sounds/<name>.m4a`. Then play the loop end-to-end twice (`afplay`) and listen for a gap at the seam. If there's an audible gap, keep `background-music-loop.wav` as WAV instead.
- [ ] **Step 2: Install** `npx expo install expo-audio`.
- [ ] **Step 3: Write failing tests** for `parseSoundPrefs`: `null` → defaults. `'{"music":false}'` → `{ music: false, effects: true }`. `'garbage'` → defaults.
- [ ] **Step 4: Run** — FAIL. Then implement `sound-prefs.ts` — PASS.
- [ ] **Step 5: Implement `SoundProvider`:**
  - `setAudioModeAsync({ playsInSilentMode: false })` keeps the iOS silent switch respected.
  - One looping music player at volume `0.25`. It plays when `prefs.music` is on, pauses on `AppState` `background`/`inactive`, and resumes on `active` only if music is on.
  - SFX players are preloaded once. `playSfx` is a no-op when effects are off. Each play seeks to 0, ducks the music to `0.08`, and restores `0.25` when the effect finishes. If the status callback is awkward, use a timer of the clip's length.
  - Prefs load from and save to AsyncStorage under `SOUND_PREFS_KEY`, with every call wrapped in try/catch.
- [ ] **Step 6: Settings.** Show two rows, `musicLabel` (`'Music'` / `'Musika'`) and `soundEffectsLabel` (`'Sound effects'` / `'Mga tunog'`), bound to `useSound()`. Remove the old `soundsLabel` row and key if nothing else uses it.
- [ ] **Step 7: Verify on a device or simulator** (`npm run ios`). Check that:
  - music starts on launch and keeps playing across navigation;
  - it pauses when the app is backgrounded;
  - Music off stops it immediately, and it stays off after relaunch;
  - Sound effects off silences effects;
  - the iOS silent switch mutes everything.
  Then run `npm test && npx tsc --noEmit` — PASS.
- [ ] **Step 8: Commit**: `feat(audio): add app-wide music and sound settings`

### Task 11: Wire sound effects into the games

**Files:**
- Modify: `src/features/learning/screens/activity-play-screen.tsx`
- Modify: `src/features/jigsaw/screens/jigsaw-puzzle-screen.tsx`
- Modify: `src/features/learning/screens/level-summary-screen.tsx`

**Interfaces:**
- Consumes: `useSound().playSfx` from Task 10.
- Mapping, refined from the spec so two sounds never stack on one moment:
  - Quiz passed → `correct`.
  - Quiz failed, timed out or left unanswered → `wrong`.
  - Jigsaw piece placed (where `setPlacedIds` adds a piece, around lines 299/316) → `snap`.
  - Jigsaw solved → `complete`; Jigsaw failed or timed out → `wrong`.
  - Level summary opened with all 6 finished → `complete`.
  - Tapping an answer choice, the text-answer submit, the enumeration submit and the "Start question" button → `tap`.
  - Play each effect once, when the phase changes, not on re-render.

- [ ] **Step 1: Implement** each call at the point the outcome is known (`setPhase('success')` / `setPhase('incorrect')` in `recordAttempt`, and the jigsaw equivalents).
- [ ] **Step 2: Verify on a device**, playing one quiz pass, one quiz fail, one jigsaw solve and one jigsaw time-out. Each moment plays exactly its sound, and the music dips under it. Run `npx tsc --noEmit` — PASS.
- [ ] **Step 3: Commit**: `feat(audio): play feedback sounds in quiz and jigsaw`
