import { describe, expect, it } from 'vitest';
import { beatsPercent } from './percentile';

describe('beatsPercent', () => {
  it('gives the top student 100 and the last student 0', () => {
    expect(beatsPercent(1, 5)).toBe(100);
    expect(beatsPercent(5, 5)).toBe(0);
  });

  it('measures against the other students, not the whole board', () => {
    // 4th of 6 beats two of the five others.
    expect(beatsPercent(4, 6)).toBe(40);
    expect(beatsPercent(3, 5)).toBe(50);
  });

  it('returns null when there is nobody to compare against', () => {
    expect(beatsPercent(1, 1)).toBeNull();
    expect(beatsPercent(1, 0)).toBeNull();
  });

  it('returns null for a rank that is not on the board', () => {
    expect(beatsPercent(0, 5)).toBeNull();
    expect(beatsPercent(6, 5)).toBeNull();
    expect(beatsPercent(-2, 5)).toBeNull();
  });

  it('returns null rather than NaN for non-finite input', () => {
    expect(beatsPercent(NaN, 5)).toBeNull();
    expect(beatsPercent(1, Infinity)).toBeNull();
  });

  it('stays a whole number inside 0–100 across a range of boards', () => {
    for (let total = 2; total <= 40; total++) {
      for (let rank = 1; rank <= total; rank++) {
        const pct = beatsPercent(rank, total);
        expect(pct).not.toBeNull();
        expect(Number.isInteger(pct)).toBe(true);
        expect(pct!).toBeGreaterThanOrEqual(0);
        expect(pct!).toBeLessThanOrEqual(100);
      }
    }
  });

  it('never rates a worse rank higher than a better one', () => {
    for (let rank = 1; rank < 20; rank++) {
      expect(beatsPercent(rank, 20)!).toBeGreaterThan(beatsPercent(rank + 1, 20)!);
    }
  });
});
