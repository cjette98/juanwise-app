// Kept free of React Native imports (unlike student-results-context.tsx) so
// it can be unit tested directly with Vitest.

/**
 * Blends points earned (volume of correct work) with pace into a single
 * 0–1 ranking score for the "Top Performers" leaderboard, weighted 70/30
 * toward points so a student who completes many activities isn't
 * out-ranked by one who did only one or two quickly.
 *
 * Pace is normalized against a FIXED per-activity time ceiling (pass the
 * larger activity type's time budget, e.g. jigsaw's 120s — no single
 * attempt's timeUsed can exceed its own budget), not the current cohort's
 * own slowest average. Normalizing against the cohort instead would zero
 * out the slowest student's pace credit entirely, which degenerates badly
 * in a small class: with only two students, the slower one always scores
 * 0 on pace no matter how close their time actually was.
 */
export const PERFORMANCE_POINTS_WEIGHT = 0.7;
const PERFORMANCE_SPEED_WEIGHT = 1 - PERFORMANCE_POINTS_WEIGHT;

export function computePerformanceScore(
  totalPoints: number,
  avgTimeUsed: number,
  maxPoints: number,
  maxActivityTimeSeconds: number,
): number {
  const normPoints = totalPoints / maxPoints;
  const normSpeed = maxActivityTimeSeconds > 0 ? Math.max(0, 1 - avgTimeUsed / maxActivityTimeSeconds) : 0;
  return PERFORMANCE_POINTS_WEIGHT * normPoints + PERFORMANCE_SPEED_WEIGHT * normSpeed;
}
