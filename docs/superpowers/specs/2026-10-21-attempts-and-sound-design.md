# JuanWise Attempt Limits, Attempt-Weighted Scoring & Sound — Design Spec

**Status:** draft, awaiting approval
**Repos:** `juanwise-app-v2` (Expo client) and `juanwise-be` (API, sibling directory)

## Why

The client asked for this (paraphrased from Tagalog):

> When two players take a quiz and one gets it right on the first try while the other needs three
> retries, the system should record how many attempts each took. On the leaderboard, players who
> got it right in fewer attempts should rank higher. Only 3 attempts are allowed. And sound.

Today a student can retry a red "Needs Retry" activity as many times as they like. A pass always
earns full points (`scoreAttempt` in `juanwise-be/src/modules/results/scoring.ts`), so passing on
the 5th try scores the same as passing on the 1st. The attempt count is already stored on every
result as `attemptSeq` (counted per student + class + activity slot in `results.service.ts`
`submit`), but nothing reads it. The app plays no sound at all.

**Success:** of two students with the same speed, the one who passed in fewer tries ranks higher;
no one can play an activity a 4th time; the app has music and feedback sounds that a teacher can
turn off.

## Part 1 — Attempt limit and attempt-weighted points

Applies to **both Quiz and Jigsaw**.

### Rules (decided by the user)

- **At most 3 attempts per activity slot.** The slot is the existing `attemptKey`
  (uid, category, activityType, level, activityNum), scoped by class as `countAttempts` already
  does.
- **Points drop per attempt.** The pass award is a share of `POINTS_PER_ACTIVITY` (15):

  | Attempt that passes | Share | Points |
  |---|---|---|
  | 1st | 100% | 15 |
  | 2nd | 70%  | 10 |
  | 3rd | 40%  | 6  |

  The 100/70/40 split was proposed by Claude and not objected to. Points are whole numbers, so
  70% and 40% of 15 are rounded (10.5 → 10, 6 → 6) — *Claude's call*. Keep the shares in one
  constant table on the server so they can be tuned.
- **Medals are unchanged**: still decided by time used (`fraction <= 0.5` gold, etc.). Only points
  drop.
- **Failing all 3 attempts** ends the slot with 0 points. The activity shows as done-but-failed
  (red, not playable) and the student is never stuck (decided by the user). Activities within a
  reached level are already playable in any order — the only real gate is the level, which opens
  when all 6 activities are finished. So **an exhausted activity counts as finished toward its
  level's 6**: `markActivity`'s next-level unlock and `computeProgression`'s `levelsCompleted`
  both count it. The level-summary screen shows it as a 0-point red slot. *Claude's call, derived
  from "never stuck".*
- **A passed activity is closed** — it cannot be replayed. *Claude's call, not objected to*:
  replaying under a cap would either lower the score or burn an attempt for nothing.

### Enforcement

- The **server is the authority.** `results.service.submit` rejects a submission when the slot is
  already passed or already has 3 attempts (a 409 with a clear message). The client hides the
  play action in those states, but a stale or tampered client must still be refused.
- `scoreAttempt` gains the attempt number as an input and applies the share above. The client
  never sends points.
- Progress (`progressRepo.markActivity`) needs a third outcome besides `'completed'` and
  `'failed'`: an **exhausted** state (3rd attempt failed) that counts as finished for unlocking the
  next activity, but is shown red. Whether that is a new status value or `'failed'` plus an
  attempts field is the builder's choice — but the unlock rule must treat it as finished, and a
  later lost-race write must never downgrade `'completed'`.
- **The direct progress endpoints** `POST /progress/complete` and `/progress/fail` can currently
  mark a slot without spending an attempt. The app calls them right after `addResult`
  (`game-progress-context.tsx` `completeActivity` / `failActivity`), redundantly, since `submit`
  already writes progress. Stop calling them from the play screens and refresh progress from the
  submit response instead; on the server, refuse a `'completed'` mark unless a passing result for
  that slot exists. *Claude's call.*
- The progress payload returned to the client must carry **attempts used per activity**, so the
  activity list can show tries left without fetching results.

### Which attempt counts

`pickCanonical` currently keeps the most recent attempt. Change it to: **the passing attempt if
the slot has one, otherwise the most recent.** For new data the two are the same (nothing can be
played after a pass), but old data has slots where a pass was followed by a failed replay; under
"latest wins" those would score 0 on the leaderboard while showing green. Keeping the pass
matches what the student sees. *Claude's call.*

### Offline attempts

`student-results-context.tsx` queues an attempt when the network is down and scores it locally.
*Claude's calls:*

- The local score mirrors the server: same 100/70/40 shares, using the cached attempt count plus
  any attempts already queued for that slot. Share the table in one client constant next to the
  existing local scoring.
- The client blocks a 4th attempt or a replay after a pass using cached progress plus the queue,
  so the cap holds offline too.
- When a queued attempt is later refused with a 409 (cache was stale), drop it from the queue
  silently and refresh progress. The server's record wins; no error is shown.

### Leaderboard

- **The ranking formula does not change.** `computePerformanceScore` (70% points / 30% speed,
  `src/features/results/context/performance-score.ts`) and the server's `summarize` sort both run
  on points, which now already reflect attempts. That alone puts first-try passers ahead.
- The **teacher leaderboard** shows each student's average attempts per passed activity, so a
  teacher can see why a student ranks lower. *Claude's call.* The student leaderboard does not.

### Student-facing UI

- Activity cards on the activity list show tries left on an unpassed, unexhausted activity
  ("2 tries left" / "1 try left"), in both English and Filipino through `t()`. *Claude's call.*
- The "incorrect" result modal (quiz and jigsaw) says how many tries remain, or that the activity
  is finished when none remain.
- The success modal shows the reduced points as awarded by the server (it already displays the
  server's `points`).

### Existing data

- Results already saved **keep their stored points.** New shares apply only to attempts made after
  release. *Claude's call.*
- A slot that already has 3+ attempts is treated as out of attempts — closed if it was ever
  passed, exhausted otherwise.

## Part 2 — Sound

### Assets (provided by the user)

At `/Users/jettekerzcastillo/Downloads/sounds/` — 44.1 kHz stereo 16-bit WAV:

| File | Length | Use |
|---|---|---|
| `background-music-loop.wav` | 15.2 s, 2.6 MB | Background music, looped |
| `sfx-correct.wav` | 3.0 s | Quiz passed (a quiz pass *is* the correct answer, so it gets this one sound, not both) |
| `sfx-wrong.wav` | 2.2 s | Wrong answer, time-out, or leaving the question unanswered (quiz and jigsaw) |
| `sfx-complete.wav` | 4.5 s | Jigsaw solved; level summary reached with all 6 finished |
| `sfx-snap.wav` | 1.5 s | A jigsaw piece locking into place |
| `sfx-tap.wav` | 0.6 s | Tapping an answer choice / primary in-game button |

Mapping of files to moments is *Claude's call* from the file names. Copy them into the repo under
`assets/sounds/`. Converting to a compressed format (e.g. AAC `.m4a` via macOS `afconvert`) to
shrink the ~4.6 MB bundle is left to the builder; the music loop must still loop without an
audible gap.

### Behaviour

- **Background music plays throughout the whole app** (decided by the user), looping, at low
  volume. It continues across screen changes rather than restarting.
- The music pauses when the app goes to the background and resumes on return.
- While a sound effect plays, the music dips in volume so the effect is clear. *Claude's call.*
- `sfx-tap` is for in-game taps only (answer choices, jigsaw controls), not every button in the
  app. *Claude's call* — a click on every navigation tap would be tiring.
- On iOS, sound respects the silent switch. *Claude's call.*

### Settings

- Settings gets two independent switches: **Music** and **Sound effects**, both on by default,
  remembered on the device. *Claude's call* — a teacher with a roomful of tablets wants music off
  and effects on. Labels go through `t()`.

### How it gets made

- Library: `expo-audio` (Expo SDK 57's audio package; the app has no audio library today).
  *Claude's call.*
- One app-level audio owner (a provider near the root layout) holds the music player and the
  preferences; screens call small helpers like `playSfx('correct')`. Exact shape is the builder's.

## Non-goals

- No change to the medal thresholds, trophy tiers, or the 70/30 performance formula.
- No teacher-side "reset attempts" control (the user chose auto-unlock after 3 fails instead).
- No per-category or per-level music.
- No change to `MAX_POINTS` (900) — it remains the ceiling for a perfect, all-first-try run.

## Left to the builder

- How the exhausted state is stored in progress (new status vs. extra field).
- Audio file format and compression.
- Exact copy for "tries left" strings, within the existing tone.
- Test structure, following the existing Vitest setup in both repos.
