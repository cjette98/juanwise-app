import { describe, expect, it } from 'vitest';
import { getPrimaryActivityAction } from './activity-list-model';

describe('getPrimaryActivityAction', () => {
  it('continues the first unfinished activity while the level is incomplete', () => {
    expect(getPrimaryActivityAction([1, 3], 2)).toEqual({
      kind: 'activity',
      activityNum: 2,
      label: 'Continue Activity 2',
    });
  });

  it('proceeds to the summary only after all six activities are complete', () => {
    expect(getPrimaryActivityAction([1, 2, 3, 4, 5, 6], 2)).toEqual({
      kind: 'summary',
      label: 'Complete Level 2',
    });
  });
});
