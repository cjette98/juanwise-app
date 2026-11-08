import { describe, expect, it } from 'vitest';
import {
  COMBINED_MAX_TIME_SECONDS,
  JIGSAW_TIME_BUDGET_SECONDS,
  QUIZ_TIME_BUDGET_SECONDS,
  TROPHY_TIERS,
  timeBudgetFor,
} from './game-limits';

describe('game limits', () => {
  it('gives a quiz and a jigsaw the same 60 seconds (client, 2026-11-07)', () => {
    expect(QUIZ_TIME_BUDGET_SECONDS).toBe(60);
    expect(JIGSAW_TIME_BUDGET_SECONDS).toBe(60);
    expect(timeBudgetFor('quiz')).toBe(60);
    expect(timeBudgetFor('jigsaw')).toBe(60);
  });

  it('caps the combined time at 60 s × 6 activities × 5 levels × 2 types', () => {
    expect(COMBINED_MAX_TIME_SECONDS).toBe(3600);
  });

  // Must match TROPHY_TIERS in juanwise-be src/shared/constants.ts.
  it('keeps trophy time allowances at 2/3, 5/6 and all of the ceiling', () => {
    expect(TROPHY_TIERS.map((t) => [t.trophy, t.minPoints, t.maxTimeSeconds])).toEqual([
      ['gold', 450, 2400],
      ['silver', 300, 3000],
      ['bronze', 150, 3600],
    ]);
  });

  it('labels each tier with its time range', () => {
    expect(TROPHY_TIERS.map((t) => t.timeLabel)).toEqual([
      '≤ 2,400 sec (40 mins)',
      '2,401–3,000 sec',
      '3,001–3,600 sec',
    ]);
  });
});
