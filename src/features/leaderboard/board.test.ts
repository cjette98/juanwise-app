import { describe, expect, it } from 'vitest';
import { boardForType, findMine, isTiedAt, toBoardRows, type ApiBoardItem } from './board';

function item(over: Partial<ApiBoardItem> = {}): ApiBoardItem {
  return {
    uid: 'u1',
    studentName: 'Ana',
    rank: 1,
    totalPoints: 30,
    totalTimeSec: 40,
    activitiesCompleted: 2,
    goldMedals: 1,
    silverMedals: 1,
    bronzeMedals: 0,
    trophy: 'none',
    pace: 'none',
    completionPct: 3,
    failedAttempts: 1,
    avgTimeSec: 20,
    ...over,
  };
}

describe('boardForType', () => {
  it('ranks a quiz by points and a jigsaw by time (client, 2026-11-07)', () => {
    expect(boardForType('quiz')).toBe('points');
    expect(boardForType('jigsaw')).toBe('time');
  });
});

describe('toBoardRows', () => {
  it('keeps the server order and ranks', () => {
    const rows = toBoardRows([item({ uid: 'b', rank: 1 }), item({ uid: 'a', rank: 1 }), item({ uid: 'c', rank: 3 })]);
    expect(rows.map((r) => [r.uid, r.rank])).toEqual([
      ['b', 1],
      ['a', 1],
      ['c', 3],
    ]);
  });

  it('works out the average and leaves attempts unknown on an older server', () => {
    const [row] = toBoardRows([item({ failedAttempts: undefined, avgTimeSec: undefined, totalTimeSec: 45, activitiesCompleted: 2 })]);
    expect(row?.avgTimeSec).toBe(22.5);
    expect(row?.failedAttempts).toBeNull();
  });

  it('numbers rows by position when an older server sends no rank', () => {
    const rows = toBoardRows([item({ uid: 'a', rank: undefined }), item({ uid: 'b', rank: undefined })]);
    expect(rows.map((r) => r.rank)).toEqual([1, 2]);
  });

  it('averages stars over completed activities', () => {
    const [row] = toBoardRows([item({ goldMedals: 1, silverMedals: 1, activitiesCompleted: 2 })]);
    expect(row?.avgStars).toBe(2.5);
  });
});

describe('isTiedAt', () => {
  it('marks a row that shares its rank with a neighbour', () => {
    const rows = toBoardRows([item({ uid: 'a', rank: 1 }), item({ uid: 'b', rank: 1 }), item({ uid: 'c', rank: 3 })]);
    expect(rows.map((_, i) => isTiedAt(rows, i))).toEqual([true, true, false]);
  });
});

describe('findMine', () => {
  it('matches on uid, not name', () => {
    const rows = toBoardRows([item({ uid: 'other', studentName: 'Ana' }), item({ uid: 'me', studentName: 'Ana', rank: 2 })]);
    expect(findMine(rows, 'me')?.rank).toBe(2);
    expect(findMine(rows, 'nobody')).toBeNull();
  });
});
