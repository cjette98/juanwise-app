// Kept free of React Native imports (unlike student-results-context.tsx) so
// it can be unit tested directly with Vitest.

/**
 * Mean attemptSeq over the passing entries of an already-canonical list,
 * rounded to 1 decimal; null when nothing passed.
 */
export function averageTriesToPass(
  canonical: { medal: unknown; attemptSeq: number }[],
): number | null {
  const passes = canonical.filter((e) => e.medal);
  if (passes.length === 0) return null;
  const mean = passes.reduce((sum, e) => sum + e.attemptSeq, 0) / passes.length;
  return Math.round(mean * 10) / 10;
}
