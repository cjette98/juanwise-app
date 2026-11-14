import { describe, expect, it } from 'vitest';
import { activitySlots, canonicalAttempts, inActiveClass, isPass, levelScore, netPoints, totalsFor, triesAt, type ScoredAttempt } from './totals';

/**
 * The app's totals must equal the server's (juanwise-be results/scoring.ts):
 * one canonical attempt per activity (a pass beats a failure, else the latest),
 * points from passes only, less each failed try's deduction (Correction 3,
 * #1), time and "completed" from passes only, and every failed or timed-out
 * attempt counted (Adjustment 3, items 1 and 6).
 */

let seq = 0;
function attempt(over: Partial<ScoredAttempt> = {}): ScoredAttempt {
  seq += 1;
  return {
    uid: 'u1',
    classId: 'class-1',
    category: 'history',
    activityType: 'quiz',
    level: 1,
    activityNum: 1,
    points: 15,
    timeUsed: 20,
    timedOut: false,
    attemptSeq: 1,
    timestamp: seq * 1000,
    ...over,
  };
}
const fail = (over: Partial<ScoredAttempt> = {}) => attempt({ points: 0, ...over });

describe('netPoints / triesAt (Correction 3, #1)', () => {
  it('nets an activity: pass points less every failed try', () => {
    expect(netPoints([attempt({ points: 15 })])).toBe(15);
    expect(netPoints([fail({ points: -5 }), attempt({ attemptSeq: 2, points: 15 })])).toBe(10);
    expect(netPoints([fail({ points: -5 }), fail({ attemptSeq: 2, points: -10 }), attempt({ attemptSeq: 3, points: 15 })])).toBe(0);
    expect(netPoints([fail({ points: -5 }), fail({ points: -10 }), fail({ points: -10 })])).toBe(-25);
  });

  it('picks one student\'s tries at one activity', () => {
    const rows = [attempt(), attempt({ activityNum: 2 }), attempt({ uid: 'u2' }), attempt({ level: 2 })];
    expect(triesAt(rows, { uid: 'u1', category: 'history', activityType: 'quiz', level: 1, activityNum: 1 })).toHaveLength(1);
  });
});

describe('isPass', () => {
  it('is a pass only when points were earned', () => {
    expect(isPass(attempt())).toBe(true);
    expect(isPass(fail())).toBe(false);
  });
});

describe('canonicalAttempts', () => {
  it('keeps the pass over a later failure', () => {
    const pass = attempt({ attemptSeq: 1, timestamp: 1 });
    const later = fail({ attemptSeq: 2, timestamp: 2 });
    expect(canonicalAttempts([pass, later])).toEqual([pass]);
  });

  it('keeps the latest of two failures', () => {
    const first = fail({ attemptSeq: 1, timestamp: 1 });
    const second = fail({ attemptSeq: 2, timestamp: 2 });
    expect(canonicalAttempts([second, first])).toEqual([second]);
  });

  it('keys slots by uid, so two students with the same name stay apart', () => {
    const rows = canonicalAttempts([attempt({ uid: 'a' }), attempt({ uid: 'b' })]);
    expect(rows).toHaveLength(2);
  });
});

describe('totalsFor', () => {
  it('adds points, time and completed activities from passes only', () => {
    const totals = totalsFor([
      attempt({ activityNum: 1, points: 15, timeUsed: 20 }),
      attempt({ activityNum: 2, points: 10, timeUsed: 30, attemptSeq: 2 }),
      fail({ activityNum: 3, timeUsed: 60, timedOut: true }),
    ]);
    expect(totals).toMatchObject({ totalPoints: 25, totalTimeSec: 50, completed: 2, avgTimeSec: 25 });
  });

  it('counts every failed or timed-out attempt, including ones later retried', () => {
    const totals = totalsFor([
      fail({ attemptSeq: 1, timestamp: 1 }),
      fail({ attemptSeq: 2, timestamp: 2, timedOut: true }),
      attempt({ attemptSeq: 3, points: 6, timestamp: 3 }),
    ]);
    expect(totals.failedAttempts).toBe(2);
    expect(totals.totalPoints).toBe(6);
  });

  it('takes every failed try off the total, never below 0 (Correction 3, #1)', () => {
    // The client's example: puzzles 1-3 passed for 15 + 10 + 5, puzzle 4
    // failed three times for -5, -10, -10.
    const totals = totalsFor([
      attempt({ activityNum: 1, points: 15 }),
      attempt({ activityNum: 2, points: 10 }),
      attempt({ activityNum: 3, points: 5 }),
      fail({ activityNum: 4, attemptSeq: 1, points: -5, timedOut: true }),
      fail({ activityNum: 4, attemptSeq: 2, points: -10, timedOut: true }),
      fail({ activityNum: 4, attemptSeq: 3, points: -10, timedOut: true }),
    ]);
    expect(totals).toMatchObject({ totalPoints: 5, completed: 3, failedAttempts: 3 });
    expect(totalsFor([fail({ points: -5, timedOut: true })]).totalPoints).toBe(0);
  });

  it('reports no average before anything is completed', () => {
    expect(totalsFor([fail()]).avgTimeSec).toBeNull();
    expect(totalsFor([]).avgTimeSec).toBeNull();
  });

  it('rounds the average to one decimal, like the server', () => {
    const totals = totalsFor([
      attempt({ activityNum: 1, timeUsed: 10 }),
      attempt({ activityNum: 2, timeUsed: 10 }),
      attempt({ activityNum: 3, timeUsed: 11 }),
    ]);
    expect(totals.avgTimeSec).toBe(10.3);
  });
});

describe('inActiveClass', () => {
  it('keeps only attempts recorded in the active class', () => {
    const rows = [attempt({ classId: 'class-1' }), attempt({ classId: 'class-2' }), attempt({ classId: null })];
    expect(inActiveClass(rows, 'class-1').map((r) => r.classId)).toEqual(['class-1']);
  });

  it('keeps unassigned attempts when the player has no class', () => {
    const rows = [attempt({ classId: 'class-1' }), attempt({ classId: null })];
    expect(inActiveClass(rows, null).map((r) => r.classId)).toEqual([null]);
  });
});

describe('levelScore', () => {
  it('totals one level of one game type for one player, out of 90', () => {
    const score = levelScore(
      [
        attempt({ activityNum: 1, points: 15 }),
        attempt({ activityNum: 2, points: 10, attemptSeq: 2 }),
        fail({ activityNum: 3 }),
        attempt({ level: 2, activityNum: 1, points: 15 }),
        attempt({ activityType: 'jigsaw', activityNum: 1, points: 15 }),
        attempt({ uid: 'someone-else', activityNum: 4, points: 15 }),
      ],
      { uid: 'u1', category: 'history', activityType: 'quiz', level: 1 },
    );
    expect(score).toEqual({ points: 25, maxPoints: 90, done: 2, of: 6 });
  });
});

describe('activitySlots', () => {
  it('gives the counting attempt for activities 1-6, null where unplayed', () => {
    const slots = activitySlots(
      [
        fail({ activityNum: 1, timestamp: 1 }),
        attempt({ activityNum: 1, points: 10, attemptSeq: 2, timestamp: 2 }),
        fail({ activityNum: 3 }),
        attempt({ activityNum: 2, level: 2, points: 15 }),
        attempt({ activityNum: 2, activityType: 'jigsaw', points: 15 }),
      ],
      { category: 'history', activityType: 'quiz', level: 1 },
    );
    expect(slots.map((s) => (s ? s.points : null))).toEqual([10, null, 0, null, null, null]);
  });
});
