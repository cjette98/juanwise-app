import { describe, expect, it } from 'vitest';
import {
  COMBINED_MAX_POINTS,
  COMBINED_MAX_TIME_SECONDS,
  QUIZ_MAX_POINTS,
  countedTime,
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

  it('uses the ceilings of the client reference sheet: 360 activities (Correction 1, F3)', () => {
    expect(QUIZ_MAX_POINTS).toBe(2700);
    expect(COMBINED_MAX_POINTS).toBe(5400);
    expect(COMBINED_MAX_TIME_SECONDS).toBe(21600);
  });

  it('counts an attempt as taking 1 s to its budget (F2)', () => {
    expect(countedTime({ activityType: 'quiz', timeUsed: 0 })).toBe(1);
    expect(countedTime({ activityType: 'jigsaw', timeUsed: 110 })).toBe(60);
    expect(countedTime({ activityType: 'jigsaw', timeUsed: 37 })).toBe(37);
  });

  // Must match TROPHY_TIERS in juanwise-be src/shared/constants.ts.
  it('keeps trophy time allowances at 2 h, 4 h and 6 h (Correction 2, #6)', () => {
    expect(TROPHY_TIERS.map((t) => [t.trophy, t.minPoints, t.maxTimeSeconds])).toEqual([
      ['gold', 2700, 7200],
      ['silver', 1800, 14400],
      ['bronze', 900, 21600],
    ]);
  });

  it('labels each tier with its time limit', () => {
    expect(TROPHY_TIERS.map((t) => t.timeLabel)).toEqual([
      '≤ 7,200 sec (2 h)',
      '≤ 14,400 sec (4 h)',
      '≤ 21,600 sec (6 h)',
    ]);
  });
});
