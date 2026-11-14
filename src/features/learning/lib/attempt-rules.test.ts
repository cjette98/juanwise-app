import { describe, expect, it } from 'vitest';
import {
  applyAttemptToTrack,
  deductionFor,
  nextAttemptSeq,
  scorePass,
  slotStatus,
  triesLeft,
  type LocalTrack,
} from './attempt-rules';

const empty: LocalTrack = { unlockedLevel: 1, completed: [], failed: [], exhausted: [], attempts: {} };

describe('scorePass / deductionFor (Correction 3, #1)', () => {
  // A pass earns its time window on any try, as juanwise-be scores it.
  it.each([
    [18, 15, 3],
    [37, 10, 2],
    [55, 5, 1],
  ])('a pass in %is: %i points, %i stars', (time, points, stars) => {
    expect(scorePass(time)).toEqual({ points, stars });
  });

  it('deducts 5 for the first failed try and 10 for the second and third', () => {
    expect([1, 2, 3].map(deductionFor)).toEqual([5, 10, 10]);
  });
});

describe('slotStatus / triesLeft', () => {
  it('derives the slot state', () => {
    expect(slotStatus(false, 3)).toBe('exhausted');
    expect(slotStatus(true, 1)).toBe('passed');
    expect(slotStatus(false, 2)).toBe('open');
    expect(triesLeft(1)).toBe(2);
    expect(triesLeft(5)).toBe(0);
  });
});

describe('applyAttemptToTrack', () => {
  it('unlocks the next level when the 3rd fail exhausts the last slot', () => {
    const track: LocalTrack = { ...empty, completed: [1, 2, 3, 4, 5], attempts: { 6: 2 }, failed: [6] };
    const next = applyAttemptToTrack(track, 1, 6, false, 3);
    expect(next.exhausted).toEqual([6]);
    expect(next.unlockedLevel).toBe(2);
    expect(next.attempts[6]).toBe(3);
  });

  it('does not unlock on a non-exhausting fail', () => {
    const track: LocalTrack = { ...empty, completed: [1, 2, 3, 4, 5] };
    const next = applyAttemptToTrack(track, 1, 6, false, 1);
    expect(next.unlockedLevel).toBe(1);
    expect(next.failed).toEqual([6]);
    expect(next.exhausted).toEqual([]);
  });

  it('keeps a completed slot completed after a later fail', () => {
    const track: LocalTrack = { ...empty, completed: [1], attempts: { 1: 1 } };
    const next = applyAttemptToTrack(track, 1, 1, false, 2);
    expect(next.completed).toEqual([1]);
    expect(next.failed).toEqual([]);
    expect(next.exhausted).toEqual([]);
  });

  it('a pass clears failed/exhausted and never regresses the unlock', () => {
    const track: LocalTrack = { unlockedLevel: 3, completed: [], failed: [2], exhausted: [], attempts: { 2: 1 } };
    const next = applyAttemptToTrack(track, 1, 2, true, 2);
    expect(next.completed).toEqual([2]);
    expect(next.failed).toEqual([]);
    expect(next.unlockedLevel).toBe(3);
    expect(next.attempts[2]).toBe(2);
  });

  it('caps the unlock at level 5', () => {
    const track: LocalTrack = { ...empty, unlockedLevel: 5, completed: [25, 26, 27, 28, 29] };
    const next = applyAttemptToTrack(track, 5, 6, true, 1);
    expect(next.unlockedLevel).toBe(5);
  });
});

describe('nextAttemptSeq', () => {
  const slot = { category: 'math', activityType: 'quiz', level: 1, activityNum: 2 };

  it('is 1 when there are no rows', () => {
    expect(nextAttemptSeq([], slot)).toBe(1);
  });

  it('counts matching rows, including pending ones, plus one', () => {
    const rows = [slot, { ...slot, pending: true }];
    expect(nextAttemptSeq(rows, slot)).toBe(3);
  });

  it('ignores rows for other slots', () => {
    const rows = [
      { ...slot, activityNum: 3 },
      { ...slot, level: 2 },
      { ...slot, activityType: 'jigsaw' },
      { ...slot, category: 'science' },
      slot,
    ];
    expect(nextAttemptSeq(rows, slot)).toBe(2);
  });
});
