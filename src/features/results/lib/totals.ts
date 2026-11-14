// ─── One set of numbers everywhere (Adjustment 3, item 1) ────────────────────
// The app's own totals (home, profile, results lists, Student Summary, Level
// Summary) must match the leaderboard, which the server computes in
// juanwise-be `results/scoring.ts`. These mirror its rules exactly:
//
// - One canonical attempt per activity slot (uid, category, type, level, #):
//   a pass always beats a failure, otherwise the latest attempt wins.
// - Points, time and "completed" come from passed activities only, each
//   attempt's time held within 1 s and its budget (`countedTime`).
// - Every failed or timed-out attempt counts toward `failedAttempts`, including
//   ones the player later retried and passed. Its deduction (stored as
//   negative points) comes off `totalPoints` only if the activity was never
//   passed, since a retry pass's points already carry it; the total never
//   goes below 0. (Correction 3, #1)
// - History is scoped to the class the player is in now, as the class
//   leaderboard is.
//
// Pure on purpose (no React, no Expo), so it can be unit-tested.

import { ACTIVITIES_PER_LEVEL, POINTS_PER_LEVEL, countedTime } from './game-limits';

/** The fields of a recorded attempt these totals read. */
export interface ScoredAttempt {
  uid: string;
  classId: string | null;
  category: string;
  activityType: 'quiz' | 'jigsaw';
  level: number;
  activityNum: number;
  points: number;
  timeUsed: number;
  timedOut: boolean;
  attemptSeq: number;
  timestamp: number;
  correctCount?: number;
  requiredCount?: number;
}

export interface Totals {
  totalPoints: number;
  /** Seconds spent on passed activities only. */
  totalTimeSec: number;
  /** Activities passed. */
  completed: number;
  /** Every failed or timed-out attempt in scope. */
  failedAttempts: number;
  /** Mean time per passed activity, to 0.1 s; null before the first pass. */
  avgTimeSec: number | null;
}

/**
 * A pass is every answer right before the timer ran out, as on the server.
 * Rows scored before Correction 3 can hold a 0-point pass, so points alone do
 * not tell a pass from a failure. A row without the counts falls back to the
 * old reading, where every pass scored.
 */
export function isPass(entry: {
  points: number;
  timedOut: boolean;
  correctCount?: number;
  requiredCount?: number;
}): boolean {
  if (!entry.requiredCount) return entry.points > 0;
  return !entry.timedOut && (entry.correctCount ?? 0) >= entry.requiredCount;
}

function slotKey(e: ScoredAttempt): string {
  return [e.uid, e.category, e.activityType, e.level, e.activityNum].join('|');
}

function pickCanonical<T extends ScoredAttempt>(a: T, b: T): T {
  if (isPass(a) !== isPass(b)) return isPass(a) ? a : b;
  if (a.timestamp !== b.timestamp) return a.timestamp > b.timestamp ? a : b;
  return a.attemptSeq >= b.attemptSeq ? a : b;
}

/** Collapses retries to the one attempt per activity that counts. */
export function canonicalAttempts<T extends ScoredAttempt>(entries: T[]): T[] {
  const bySlot = new Map<string, T>();
  for (const entry of entries) {
    const key = slotKey(entry);
    const current = bySlot.get(key);
    bySlot.set(key, current ? pickCanonical(current, entry) : entry);
  }
  return [...bySlot.values()];
}

/** What a failed attempt took off the total: its negative points, else 0. */
export function deductionOf(entry: ScoredAttempt): number {
  return isPass(entry) ? 0 : Math.max(0, -entry.points);
}

/**
 * What one activity is worth: its pass's points, which already carry the
 * failed tries before it, or every failure's deduction if it was never passed
 * (Correction 3, #1).
 */
export function netPoints(tries: ScoredAttempt[]): number {
  const pass = tries.find(isPass);
  return pass ? pass.points : -tries.reduce((sum, e) => sum + deductionOf(e), 0);
}

/** One student's tries at one activity. */
export function triesAt<T extends ScoredAttempt>(
  entries: T[],
  slot: { uid?: string; category: string; activityType: 'quiz' | 'jigsaw'; level: number; activityNum: number },
): T[] {
  return entries.filter(
    (e) =>
      (slot.uid === undefined || e.uid === slot.uid) &&
      e.category === slot.category &&
      e.activityType === slot.activityType &&
      e.level === slot.level &&
      e.activityNum === slot.activityNum,
  );
}

export function totalsFor(entries: ScoredAttempt[]): Totals {
  const passed = canonicalAttempts(entries).filter(isPass);
  const failed = entries.filter((e) => !isPass(e));
  const passedSlots = new Set(passed.map(slotKey));
  const earned = passed.reduce((sum, e) => sum + e.points, 0);
  const deducted = failed.filter((e) => !passedSlots.has(slotKey(e))).reduce((sum, e) => sum + deductionOf(e), 0);
  const totalTimeSec = passed.reduce((sum, e) => sum + countedTime(e), 0);
  const completed = passed.length;
  return {
    totalPoints: Math.max(0, earned - deducted),
    totalTimeSec,
    completed,
    failedAttempts: failed.length,
    avgTimeSec: completed > 0 ? Math.round((totalTimeSec / completed) * 10) / 10 : null,
  };
}

/**
 * Attempts recorded in the player's current class. With no class, the
 * unassigned ones, which is what the guest leaderboard ranks.
 */
export function inActiveClass<T extends { classId: string | null }>(entries: T[], classId: string | null): T[] {
  return entries.filter((e) => (e.classId ?? null) === (classId ?? null));
}

export interface LevelScore {
  points: number;
  maxPoints: number;
  /** Activities passed so far. */
  done: number;
  of: number;
}

/**
 * The running score for one level of one game type, shown while the level is
 * still being played (Adjustment 3, item 5): "25 of 90 points, 2 of 6 done".
 */
export function levelScore(
  entries: ScoredAttempt[],
  slot: { uid: string; category: string; activityType: 'quiz' | 'jigsaw'; level: number },
): LevelScore {
  const inLevel = entries.filter(
    (e) =>
      e.uid === slot.uid &&
      e.category === slot.category &&
      e.activityType === slot.activityType &&
      e.level === slot.level,
  );
  const { totalPoints, completed } = totalsFor(inLevel);
  return { points: totalPoints, maxPoints: POINTS_PER_LEVEL, done: completed, of: ACTIVITIES_PER_LEVEL };
}

/**
 * The attempt that counts for each activity 1-6 of one level, by the same
 * canonical rule as the totals; null where the activity was never played.
 * Drives the per-activity strip on the Full Record (Correction 1, F5).
 */
export function activitySlots<T extends ScoredAttempt>(
  entries: T[],
  slot: { category: string; activityType: 'quiz' | 'jigsaw'; level: number },
): (T | null)[] {
  const inLevel = canonicalAttempts(
    entries.filter(
      (e) => e.category === slot.category && e.activityType === slot.activityType && e.level === slot.level,
    ),
  );
  return Array.from({ length: ACTIVITIES_PER_LEVEL }, (_, i) => inLevel.find((e) => e.activityNum === i + 1) ?? null);
}
