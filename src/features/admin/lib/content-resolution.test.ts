import { describe, expect, it } from 'vitest';
import type { ApiCategory, ApiQuestion } from '@/shared/api';
import type { QuizQuestion } from '@/shared/content/quiz-content';
import {
  jigsawSlotKey,
  rampPieceCount,
  resolveEffectiveCategoryContent,
  resolveEffectiveQuestion,
  resolveJigsawPieceCount,
  slotId,
} from './content-resolution';

const localQuestion: QuizQuestion = {
  hint: 'bundled hint',
  type: 'multiple-choice',
  question: 'bundled question',
  choices: ['a', 'b'],
  correctAnswer: 'a',
  explanation: 'bundled explanation',
};

const apiQuestionCommon = {
  id: 'history_1_1',
  category: 'history' as const,
  level: 1,
  activityNum: 1,
  type: 'multiple-choice' as const,
  question: 'api question',
  hint: 'api hint',
  explanation: 'api explanation',
  miniLesson: null,
  miniLessonImageUrl: null,
  choices: ['x', 'y'],
  correctAnswer: 'x',
  answerPool: null,
  requiredAnswers: null,
  acceptedAnswers: null,
  updatedBy: null,
  updatedAt: null,
};

describe('slotId / jigsawSlotKey', () => {
  it('formats the composite keys the API uses', () => {
    expect(slotId('history', 2, 3)).toBe('history_2_3');
    expect(jigsawSlotKey(2, 3)).toBe('2_3');
  });
});

describe('rampPieceCount', () => {
  it('ramps 6 -> 9 -> 12 across a level of six activities', () => {
    expect(rampPieceCount(1)).toBe(6);
    expect(rampPieceCount(2)).toBe(6);
    expect(rampPieceCount(3)).toBe(9);
    expect(rampPieceCount(4)).toBe(9);
    expect(rampPieceCount(5)).toBe(12);
    expect(rampPieceCount(6)).toBe(12);
  });
});

describe('resolveEffectiveQuestion', () => {
  it('returns the bundled fallback when there is no API question', () => {
    expect(resolveEffectiveQuestion(localQuestion, undefined)).toEqual(localQuestion);
  });

  it('returns the bundled fallback when the API question is not an override', () => {
    const api: ApiQuestion = { ...apiQuestionCommon, isOverride: false };
    expect(resolveEffectiveQuestion(localQuestion, api)).toEqual(localQuestion);
  });

  it('returns the mapped API question when it is an override', () => {
    const api: ApiQuestion = { ...apiQuestionCommon, isOverride: true };
    const result = resolveEffectiveQuestion(localQuestion, api);
    expect(result.question).toBe('api question');
    expect(result.choices).toEqual(['x', 'y']);
  });
});

describe('resolveEffectiveCategoryContent', () => {
  const base = { image: 'base-image' as any, context_tl: 'base context' };

  it('falls back to the base category content with no API category', () => {
    const result = resolveEffectiveCategoryContent(base, undefined);
    expect(result).toEqual({
      image: 'base-image',
      context: 'base context',
      definition: null,
      title: null,
      hasCustomImage: false,
    });
  });

  it('uses the API category image and context when set', () => {
    const api: Partial<ApiCategory> = {
      imageUrl: 'https://example.test/cat.jpg',
      context_tl: 'api context',
      context_en: null,
      definition_tl: null,
      definition_en: null,
      jigsaws: [],
      jigsawSlots: {},
    };
    const result = resolveEffectiveCategoryContent(base, api as ApiCategory);
    expect(result.image).toEqual({ uri: 'https://example.test/cat.jpg' });
    expect(result.context).toBe('api context');
    expect(result.hasCustomImage).toBe(true);
  });

  it('prefers the activity-assigned jigsaw picture over the category default', () => {
    const api: Partial<ApiCategory> = {
      imageUrl: 'https://example.test/cat.jpg',
      context_tl: 'api context',
      context_en: null,
      definition_tl: null,
      definition_en: null,
      jigsawSlots: { '3_4': 'pic-1' },
      jigsaws: [
        {
          id: 'pic-1',
          title: 'Picture One',
          imageUrl: 'https://example.test/pic1.jpg',
          definition_en: null,
          definition_tl: 'depiction',
          context_en: null,
          context_tl: 'picture context',
        },
      ],
    };
    const result = resolveEffectiveCategoryContent(base, api as ApiCategory, 3, 4);
    expect(result.image).toEqual({ uri: 'https://example.test/pic1.jpg' });
    expect(result.context).toBe('picture context');
    expect(result.definition).toBe('depiction');
    expect(result.title).toBe('Picture One');
    expect(result.hasCustomImage).toBe(true);
  });

  it('ignores a jigsaw slot for an activity nobody assigned', () => {
    const api: Partial<ApiCategory> = {
      imageUrl: null,
      context_tl: 'api context',
      context_en: null,
      definition_tl: null,
      definition_en: null,
      jigsawSlots: { '3_4': 'pic-1' },
      jigsaws: [],
    };
    // Different activity — 1_1 has no slot entry.
    const result = resolveEffectiveCategoryContent(base, api as ApiCategory, 1, 1);
    expect(result.image).toBe('base-image');
    expect(result.hasCustomImage).toBe(false);
  });
});

describe('resolveJigsawPieceCount', () => {
  it('follows the ramp when nobody chose a cut', () => {
    const api: Partial<ApiCategory> = { jigsawPieces: {} };
    expect(resolveJigsawPieceCount(api as ApiCategory, 5, 6)).toBe(12);
  });

  it('uses the explicit per-activity cut when one is set', () => {
    const api: Partial<ApiCategory> = { jigsawPieces: { '1_1': 12 } };
    expect(resolveJigsawPieceCount(api as ApiCategory, 1, 1)).toBe(12);
  });

  it('falls back to the ramp with no API category at all', () => {
    expect(resolveJigsawPieceCount(undefined, 2, 2)).toBe(6);
  });
});
