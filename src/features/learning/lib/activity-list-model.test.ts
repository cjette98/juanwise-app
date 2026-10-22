import { describe, expect, it } from 'vitest';
import {
  difficultyLabelKey,
  getLevelDifficultyKey,
  getPrimaryActivityAction,
} from './activity-list-model';

describe('getPrimaryActivityAction', () => {
  it('continues the first unfinished activity while the level is incomplete', () => {
    expect(getPrimaryActivityAction([1, 3], 2)).toEqual({
      kind: 'activity',
      activityNum: 2,
      labelKey: 'continueQuestion',
      labelVars: { n: 2 },
    });
  });

  it('proceeds to the summary only after all six activities are complete', () => {
    expect(getPrimaryActivityAction([1, 2, 3, 4, 5, 6], 2)).toEqual({
      kind: 'summary',
      labelKey: 'completeLevel',
      labelVars: { n: 2 },
    });
  });
});

describe('getPrimaryActivityAction with exhausted activities', () => {
  it('goes to the summary when the last activity is exhausted rather than passed', () => {
    // The caller passes completed ∪ exhausted.
    expect(getPrimaryActivityAction([1, 2, 3, 4, 5, 6], 3)).toEqual({
      kind: 'summary',
      labelKey: 'completeLevel',
      labelVars: { n: 3 },
    });
  });

  it('skips an exhausted activity when picking the next one', () => {
    expect(getPrimaryActivityAction([1, 2, 3], 1)).toMatchObject({ kind: 'activity', activityNum: 4 });
  });
});

describe('level difficulty', () => {
  it('keeps the ramp the jigsaw guide opacity reads', () => {
    expect(getLevelDifficultyKey(1)).toBe('Easy');
    expect(getLevelDifficultyKey(2)).toBe('Normal');
    expect(getLevelDifficultyKey(3)).toBe('Normal');
    expect(getLevelDifficultyKey(4)).toBe('Hard');
    expect(getLevelDifficultyKey(5)).toBe('Hard');
  });

  it('maps each difficulty to its dictionary key', () => {
    expect(difficultyLabelKey('Easy')).toBe('easy');
    expect(difficultyLabelKey('Normal')).toBe('normal');
    expect(difficultyLabelKey('Hard')).toBe('hard');
  });

  it('falls back rather than rendering a raw key for an unknown difficulty', () => {
    expect(difficultyLabelKey('Impossible')).toBe('normal');
  });
});
