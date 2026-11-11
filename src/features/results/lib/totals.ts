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
//   ones the player later retried and passed.
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

/** A pass is any attempt that earned points; a fail or timeout earns 0. */
export function isPass(entry: { points: number }): boolean {
  return entry.points > 0;
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

export function totalsFor(entries: ScoredAttempt[]): Totals {
  const passed = canonicalAttempts(entries).filter(isPass);
  const totalPoints = passed.reduce((sum, e) => sum + e.points, 0);
  const totalTimeSec = passed.reduce((sum, e) => sum + countedTime(e), 0);
  const completed = passed.length;
  return {
    totalPoints,
    totalTimeSec,
    completed,
    failedAttempts: entries.filter((e) => !isPass(e)).length,
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
