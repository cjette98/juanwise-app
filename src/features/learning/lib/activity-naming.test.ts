import { describe, expect, it } from 'vitest';
import { activityNaming } from './activity-naming';

describe('activityNaming', () => {
  it('numbers a jigsaw as a puzzle', () => {
    expect(activityNaming('jigsaw')).toMatchObject({
      numShort: 'puzzleNumShort',
      detailCount: 'detailPuzzleCount',
    });
  });

  it('numbers a quiz as a question', () => {
    expect(activityNaming('quiz')).toMatchObject({
      numShort: 'questionNumShort',
      detailCount: 'detailQuestionCount',
    });
  });

  it('falls back to the quiz naming for a missing or unknown type', () => {
    for (const type of [undefined, '', 'Jigsaw', 'crossword']) {
      expect(activityNaming(type).numShort).toBe('questionNumShort');
    }
  });
});
