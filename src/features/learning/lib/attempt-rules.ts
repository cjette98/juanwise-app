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
 * `results/scoring.ts` scores it: base points and time stars by finish time,
 * less 5 after one failed try and 15 after two, never below 0. Stars are the
 * lower of the time stars and the points stars.
 */
export const TIME_WINDOWS = [
  { maxSec: 20, points: 15, stars: 3 },
  { maxSec: 40, points: 10, stars: 2 },
  { maxSec: 60, points: 5, stars: 1 },
] as const;
export const FAILED_TRY_PENALTIES = [5, 10, 10] as const;

/** Points and stars for a pass that took `timeUsed` seconds on try `attemptSeq`. */
export function scorePass(timeUsed: number, attemptSeq: number): { points: number; stars: 0 | 1 | 2 | 3 } {
  const window = TIME_WINDOWS.find((w) => timeUsed <= w.maxSec) ?? TIME_WINDOWS[TIME_WINDOWS.length - 1];
  const penalty = FAILED_TRY_PENALTIES.slice(0, Math.max(0, attemptSeq - 1)).reduce((sum, p) => sum + p, 0);
  const points = Math.max(0, window.points - penalty);
  const pointStars = points >= 15 ? 3 : points >= 10 ? 2 : points >= 5 ? 1 : 0;
  return { points, stars: Math.min(window.stars, pointStars) as 0 | 1 | 2 | 3 };
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
