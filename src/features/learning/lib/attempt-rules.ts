/**
 * Pure attempt rules, mirroring juanwise-be `progress-rules.ts` and
 * `attempt-points.ts` so the Activity List can react the instant an attempt
 * ends. The server stays the authority; `refresh()` reconciles afterwards.
 */
export const MAX_ATTEMPTS = 3;

const ACTIVITIES_PER_LEVEL = 6;
const MAX_LEVEL = 5;

/**
 * The client's reference sheet (Correction 1, F4), as juanwise-be
 * `results/scoring.ts` scores it (Correction 3, #1): a pass earns points by
 * finish time, less the last failed try's deduction on a retry (2nd try -5,
 * 3rd try -10), never below 5, and that is the activity's whole worth. Each
 * failed try is stored as its deduction (-5, -10, -10), which counts only if
 * the activity is never passed. Stars are the lower of the time stars and the
 * points stars.
 */
export const TIME_WINDOWS = [
  { maxSec: 20, points: 15, stars: 3 },
  { maxSec: 40, points: 10, stars: 2 },
  { maxSec: 60, points: 5, stars: 1 },
] as const;
export const FAILED_TRY_DEDUCTIONS = [5, 10, 10] as const;
export const MIN_PASS_POINTS = 5;

/** What failed try `attemptSeq` (1-based) takes off the total. */
export function deductionFor(attemptSeq: number): number {
  const index = Math.min(Math.max(attemptSeq, 1), FAILED_TRY_DEDUCTIONS.length) - 1;
  return FAILED_TRY_DEDUCTIONS[index];
}

/** Points and stars for a pass that took `timeUsed` seconds on try `attemptSeq`. */
export function scorePass(timeUsed: number, attemptSeq: number): { points: number; stars: 1 | 2 | 3 } {
  const window = TIME_WINDOWS.find((w) => timeUsed <= w.maxSec) ?? TIME_WINDOWS[TIME_WINDOWS.length - 1];
  const retryDeduction = attemptSeq > 1 ? deductionFor(attemptSeq - 1) : 0;
  const points = Math.max(MIN_PASS_POINTS, window.points - retryDeduction);
  const pointStars = points >= 15 ? 3 : points >= 10 ? 2 : 1;
  return { points, stars: Math.min(window.stars, pointStars) as 1 | 2 | 3 };
}

export type SlotStatus = 'open' | 'passed' | 'exhausted';

export function slotStatus(passed: boolean, attemptsUsed: number): SlotStatus {
  if (passed) return 'passed';
  return attemptsUsed >= MAX_ATTEMPTS ? 'exhausted' : 'open';
}

export function triesLeft(attemptsUsed: number): number {
  return Math.max(0, MAX_ATTEMPTS - attemptsUsed);
}

interface SlotKey {
  category: string;
  activityType: string;
  level: number;
  activityNum: number;
}

/** The attempt number the next try on `slot` will be: matching rows (cached or pending) + 1. */
export function nextAttemptSeq(existing: SlotKey[], slot: SlotKey): number {
  const used = existing.filter(
    (r) =>
      r.category === slot.category &&
      r.activityType === slot.activityType &&
      r.level === slot.level &&
      r.activityNum === slot.activityNum,
  ).length;
  return used + 1;
}

export interface LocalTrack {
  unlockedLevel: number;
  /** Global activity ids: `(level - 1) * 6 + activityNum`. */
  completed: number[];
  failed: number[];
  /** Subset of failed: all attempts used, never passed. */
  exhausted: number[];
  /** global id -> attempts used */
  attempts: Record<number, number>;
}

const levelOf = (id: number) => Math.ceil(id / ACTIVITIES_PER_LEVEL);

export function applyAttemptToTrack(
  track: LocalTrack,
  level: number,
  activityNum: number,
  passed: boolean,
  attemptSeq: number,
): LocalTrack {
  const id = (level - 1) * ACTIVITIES_PER_LEVEL + activityNum;
  let completed = track.completed;
  let failed = track.failed;
  let exhausted = track.exhausted;

  if (passed) {
    if (!completed.includes(id)) completed = [...completed, id];
    failed = failed.filter((x) => x !== id);
    exhausted = exhausted.filter((x) => x !== id);
  } else if (!completed.includes(id)) {
    // A failed retry never revokes a pass that was already earned.
    if (!failed.includes(id)) failed = [...failed, id];
    if (attemptSeq >= MAX_ATTEMPTS && !exhausted.includes(id)) exhausted = [...exhausted, id];
  }

  // Walk up from level 1 while every slot is completed or exhausted.
  const finished = new Set([...completed, ...exhausted]);
  const perLevel = new Map<number, number>();
  for (const fid of finished) perLevel.set(levelOf(fid), (perLevel.get(levelOf(fid)) ?? 0) + 1);

  let unlocked = 1;
  while (unlocked < MAX_LEVEL && (perLevel.get(unlocked) ?? 0) >= ACTIVITIES_PER_LEVEL) unlocked += 1;
  unlocked = Math.min(Math.max(unlocked, track.unlockedLevel), MAX_LEVEL);

  return {
    unlockedLevel: unlocked,
    completed,
    failed,
    exhausted,
    attempts: { ...track.attempts, [id]: Math.max(track.attempts[id] ?? 0, attemptSeq) },
  };
}
