// ─── Scoring reference ───────────────────────────────────────────────────────
// Points and medals are awarded by the server (juanwise-be `results/scoring.ts`)
// from what the client reports — correctCount, requiredCount, timeUsed and
// timedOut — so a modified payload cannot mint points. The ceilings below still
// describe the game and drive the trophy tiers, and they must match
// `shared/constants.ts` on the backend exactly.
//
// Every category has its own 5 levels of 6 quizzes and 6 jigsaws: 360
// activities in all, as the client's Correction 1 reference sheet sets out.
// Quiz:   15 pts × 6 activities × 5 levels × 6 categories → 2,700 pts / 10,800 sec
// Jigsaw: the same                                        → 2,700 pts / 10,800 sec
// Combined: 5,400 pts, 21,600 sec (six hours). These were 900 and 3,600, which
// counted 60 activities and let real records pass the cap (F3).
//
// Pure on purpose (no React, no Expo), so it can be unit-tested.

export const POINTS_PER_ACTIVITY = 15;
export const ACTIVITIES_PER_LEVEL = 6;
export const LEVELS_PER_TYPE = 5;
export const CATEGORY_COUNT = 6;
export const POINTS_PER_LEVEL = POINTS_PER_ACTIVITY * ACTIVITIES_PER_LEVEL; // 90
export const QUIZ_MAX_POINTS = POINTS_PER_LEVEL * LEVELS_PER_TYPE * CATEGORY_COUNT; // 2,700
export const JIGSAW_MAX_POINTS = POINTS_PER_LEVEL * LEVELS_PER_TYPE * CATEGORY_COUNT; // 2,700
export const COMBINED_MAX_POINTS = QUIZ_MAX_POINTS + JIGSAW_MAX_POINTS; // 5,400
/** One category, quiz and jigsaw together. */
export const CATEGORY_MAX_POINTS = COMBINED_MAX_POINTS / CATEGORY_COUNT; // 900
/** The shortest time an activity counts as taking (reference sheet, 4C). */
export const MIN_ACTIVITY_TIME_SECONDS = 1;

/** 60 s for both quiz and jigsaw, per the client's clarification of 2026-11-07 (was 120 s for a jigsaw). */
export const QUIZ_TIME_BUDGET_SECONDS = 60;
export const JIGSAW_TIME_BUDGET_SECONDS = 60;
export const QUIZ_MAX_TIME_SECONDS = QUIZ_TIME_BUDGET_SECONDS * ACTIVITIES_PER_LEVEL * LEVELS_PER_TYPE * CATEGORY_COUNT; // 10,800
export const JIGSAW_MAX_TIME_SECONDS = JIGSAW_TIME_BUDGET_SECONDS * ACTIVITIES_PER_LEVEL * LEVELS_PER_TYPE * CATEGORY_COUNT; // 10,800
export const COMBINED_MAX_TIME_SECONDS = QUIZ_MAX_TIME_SECONDS + JIGSAW_MAX_TIME_SECONDS; // 21,600
/** Quizzes in one category. */
export const TOTAL_QUIZ_ACTIVITIES = ACTIVITIES_PER_LEVEL * LEVELS_PER_TYPE; // 30

export function timeBudgetFor(activityType: 'quiz' | 'jigsaw'): number {
  return activityType === 'jigsaw' ? JIGSAW_TIME_BUDGET_SECONDS : QUIZ_TIME_BUDGET_SECONDS;
}

/**
 * The seconds an attempt counts for in any total: within 1 s and its budget,
 * as the server's `countedTime` (Correction 1, F2). Holds jigsaws recorded
 * under the old 120 s limit to 60 s.
 */
export function countedTime(entry: { activityType: 'quiz' | 'jigsaw'; timeUsed: number }): number {
  return Math.min(timeBudgetFor(entry.activityType), Math.max(MIN_ACTIVITY_TIME_SECONDS, entry.timeUsed));
}

export type Trophy = 'gold' | 'silver' | 'bronze' | null;

// Points are 1/2, 1/3 and 1/6 of COMBINED_MAX_POINTS and time 2/3, 5/6 and all
// of COMBINED_MAX_TIME_SECONDS, as on the backend: the same shares as the old
// 450 / 300 / 150 against 900, moved with the ceilings (Correction 1, F3). A
// tier needs its points within its time, so each label is an upper bound.
export const TROPHY_TIERS: {
  trophy: Exclude<Trophy, null>;
  label: string;
  minPoints: number;
  maxTimeSeconds: number;
  timeLabel: string;
}[] = [
  { trophy: 'gold', label: '🥇 Gold Trophy', minPoints: 2700, maxTimeSeconds: 14400, timeLabel: '≤ 14,400 sec (4 h)' },
  { trophy: 'silver', label: '🥈 Silver Trophy', minPoints: 1800, maxTimeSeconds: 18000, timeLabel: '≤ 18,000 sec (5 h)' },
  { trophy: 'bronze', label: '🥉 Bronze Trophy', minPoints: 900, maxTimeSeconds: 21600, timeLabel: '≤ 21,600 sec (6 h)' },
];
