import { describe, expect, it } from 'vitest';
import { averageTriesToPass } from './performance-score';

describe('averageTriesToPass', () => {
  it('averages attemptSeq over passing entries only', () => {
    expect(
      averageTriesToPass([
        { points: 15, timedOut: false, attemptSeq: 1 },
        { points: 5, timedOut: false, attemptSeq: 3 },
        { points: 0, timedOut: true, attemptSeq: 3 },
      ]),
    ).toBe(2);
  });

  it('rounds to one decimal', () => {
    expect(
      averageTriesToPass([
        { points: 15, timedOut: false, attemptSeq: 1 },
        { points: 15, timedOut: false, attemptSeq: 1 },
        { points: 15, timedOut: false, attemptSeq: 2 },
      ]),
    ).toBe(1.3);
  });

  it('counts a 0-point pass, which the reference sheet allows (F4)', () => {
    expect(
      averageTriesToPass([{ points: 0, timedOut: false, correctCount: 6, requiredCount: 6, attemptSeq: 2 }]),
    ).toBe(2);
  });

  it('returns null with no passes', () => {
    expect(averageTriesToPass([{ points: 0, timedOut: true, attemptSeq: 3 }])).toBeNull();
    expect(averageTriesToPass([])).toBeNull();
  });
});
