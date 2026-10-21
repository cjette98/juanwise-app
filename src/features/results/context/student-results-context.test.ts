import { describe, expect, it } from 'vitest';
import { averageTriesToPass, computePerformanceScore } from './performance-score';

const COMBINED_MAX_POINTS = 900;
const JIGSAW_TIME_BUDGET_SECONDS = 120;

describe('computePerformanceScore', () => {
  // Fyang: 2 activities, 30 pts, 19s total (9.5s avg).
  // Catherine: 7 activities, 105 pts, 139s total (~19.86s avg).
  // Catherine should outrank Fyang: far more points earned outweighs the
  // faster-but-tiny sample. See the "Fastest" tab rename discussion.
  it('lets a student with many more points outrank one with a slightly faster average', () => {
    const fyang = computePerformanceScore(30, 9.5, COMBINED_MAX_POINTS, JIGSAW_TIME_BUDGET_SECONDS);
    const catherine = computePerformanceScore(105, 139 / 7, COMBINED_MAX_POINTS, JIGSAW_TIME_BUDGET_SECONDS);
    expect(catherine).toBeGreaterThan(fyang);
  });

  it('scores a perfect 1 for max points and zero time', () => {
    expect(computePerformanceScore(COMBINED_MAX_POINTS, 0, COMBINED_MAX_POINTS, JIGSAW_TIME_BUDGET_SECONDS)).toBeCloseTo(1, 5);
  });

  it('scores 0.7 for max points at exactly the time ceiling', () => {
    expect(
      computePerformanceScore(COMBINED_MAX_POINTS, JIGSAW_TIME_BUDGET_SECONDS, COMBINED_MAX_POINTS, JIGSAW_TIME_BUDGET_SECONDS),
    ).toBeCloseTo(0.7, 5);
  });

  it('does not divide by zero when the time ceiling is zero', () => {
    expect(computePerformanceScore(0, 0, COMBINED_MAX_POINTS, 0)).toBe(0);
  });

  it('rewards a faster average time at equal points', () => {
    const slower = computePerformanceScore(100, 90, COMBINED_MAX_POINTS, JIGSAW_TIME_BUDGET_SECONDS);
    const faster = computePerformanceScore(100, 30, COMBINED_MAX_POINTS, JIGSAW_TIME_BUDGET_SECONDS);
    expect(faster).toBeGreaterThan(slower);
  });
});

describe('averageTriesToPass', () => {
  it('averages attemptSeq over passing entries only', () => {
    expect(
      averageTriesToPass([
        { medal: 'gold', attemptSeq: 1 },
        { medal: 'bronze', attemptSeq: 3 },
        { medal: null, attemptSeq: 3 },
      ]),
    ).toBe(2);
  });

  it('rounds to one decimal', () => {
    expect(
      averageTriesToPass([
        { medal: 'gold', attemptSeq: 1 },
        { medal: 'gold', attemptSeq: 1 },
        { medal: 'gold', attemptSeq: 2 },
      ]),
    ).toBe(1.3);
  });

  it('returns null with no passes', () => {
    expect(averageTriesToPass([{ medal: null, attemptSeq: 3 }])).toBeNull();
    expect(averageTriesToPass([])).toBeNull();
  });
});
