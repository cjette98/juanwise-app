// ─── Scoring reference ───────────────────────────────────────────────────────
// Points and medals are awarded by the server (juanwise-be `results/scoring.ts`)
// from what the client reports — correctCount, requiredCount, timeUsed and
// timedOut — so a modified payload cannot mint points. The ceilings below still
// describe the game and drive the trophy tiers, and they must match
// `shared/constants.ts` on the backend exactly.
//
// Quiz:   15 pts max per activity, 60s budget, 6 activities/level, 5 levels → 450 pts / 1,800 sec
// Jigsaw: 15 pts max per activity, 60s budget, 6 activities/level, 5 levels → 450 pts / 1,800 sec
// Combined: 900 pts, 3,600 sec
//
// Pure on purpose (no React, no Expo), so it can be unit-tested.

export const POINTS_PER_ACTIVITY = 15;
export const ACTIVITIES_PER_LEVEL = 6;
export const LEVELS_PER_TYPE = 5;
export const POINTS_PER_LEVEL = POINTS_PER_ACTIVITY * ACTIVITIES_PER_LEVEL; // 90
export const QUIZ_MAX_POINTS = POINTS_PER_LEVEL * LEVELS_PER_TYPE; // 450
export const JIGSAW_MAX_POINTS = POINTS_PER_LEVEL * LEVELS_PER_TYPE; // 450
export const COMBINED_MAX_POINTS = QUIZ_MAX_POINTS + JIGSAW_MAX_POINTS; // 900

/** 60 s for both quiz and jigsaw, per the client's clarification of 2026-11-07 (was 120 s for a jigsaw). */
export const QUIZ_TIME_BUDGET_SECONDS = 60;
export const JIGSAW_TIME_BUDGET_SECONDS = 60;
export const QUIZ_MAX_TIME_SECONDS = QUIZ_TIME_BUDGET_SECONDS * ACTIVITIES_PER_LEVEL * LEVELS_PER_TYPE; // 1,800
export const JIGSAW_MAX_TIME_SECONDS = JIGSAW_TIME_BUDGET_SECONDS * ACTIVITIES_PER_LEVEL * LEVELS_PER_TYPE; // 1,800
export const COMBINED_MAX_TIME_SECONDS = QUIZ_MAX_TIME_SECONDS + JIGSAW_MAX_TIME_SECONDS; // 3,600
export const TOTAL_QUIZ_ACTIVITIES = ACTIVITIES_PER_LEVEL * LEVELS_PER_TYPE; // 30

export function timeBudgetFor(activityType: 'quiz' | 'jigsaw'): number {
  return activityType === 'jigsaw' ? JIGSAW_TIME_BUDGET_SECONDS : QUIZ_TIME_BUDGET_SECONDS;
}

export type Trophy = 'gold' | 'silver' | 'bronze' | null;

// Time allowances are 2/3, 5/6 and all of COMBINED_MAX_TIME_SECONDS, as on the
// backend. They were 3,600 / 4,500 / 5,400 when a jigsaw had 120 s.
export const TROPHY_TIERS: {
  trophy: Exclude<Trophy, null>;
  label: string;
  minPoints: number;
  maxTimeSeconds: number;
  timeLabel: string;
}[] = [
  { trophy: 'gold', label: '🥇 Gold Trophy', minPoints: 450, maxTimeSeconds: 2400, timeLabel: '≤ 2,400 sec (40 mins)' },
  { trophy: 'silver', label: '🥈 Silver Trophy', minPoints: 300, maxTimeSeconds: 3000, timeLabel: '2,401–3,000 sec' },
  { trophy: 'bronze', label: '🥉 Bronze Trophy', minPoints: 150, maxTimeSeconds: 3600, timeLabel: '3,001–3,600 sec' },
];
