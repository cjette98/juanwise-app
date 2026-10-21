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
  en: null,
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
    const result = resolveEffectiveCategoryContent(base, undefined, 'tl');
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
    const result = resolveEffectiveCategoryContent(base, api as ApiCategory, 'tl');
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
    const result = resolveEffectiveCategoryContent(base, api as ApiCategory, 'tl', 3, 4);
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
    const result = resolveEffectiveCategoryContent(base, api as ApiCategory, 'tl', 1, 1);
    expect(result.image).toBe('base-image');
    expect(result.hasCustomImage).toBe(false);
  });

  describe('language', () => {
    const bilingual = (over: Partial<ApiCategory> = {}) =>
      ({
        imageUrl: null,
        context_tl: 'TL text',
        context_en: 'EN text',
        definition_tl: 'TL def',
        definition_en: 'EN def',
        jigsawSlots: {},
        jigsaws: [],
        ...over,
      }) as ApiCategory;

    it('shows the English context in English', () => {
      const result = resolveEffectiveCategoryContent(base, bilingual(), 'en');
      expect(result.context).toBe('EN text');
      expect(result.definition).toBe('EN def');
    });

    it('falls back to the Tagalog text when English is empty', () => {
      const result = resolveEffectiveCategoryContent(base, bilingual({ context_en: null, definition_en: null }), 'en');
      expect(result.context).toBe('TL text');
      expect(result.definition).toBe('TL def');
    });

    it('shows Tagalog in Tagalog even when English is set', () => {
      const result = resolveEffectiveCategoryContent(base, bilingual(), 'tl');
      expect(result.context).toBe('TL text');
      expect(result.definition).toBe('TL def');
    });

    it('prefers bundled English over bundled Tagalog when nothing is stored', () => {
      const withEn = { ...base, context_en: 'base EN' };
      expect(resolveEffectiveCategoryContent(withEn, undefined, 'en').context).toBe('base EN');
      expect(resolveEffectiveCategoryContent(withEn, undefined, 'tl').context).toBe('base context');
    });

    it('prefers a picked jigsaw\'s own Tagalog text over category English in English', () => {
      const api = bilingual({
        jigsawSlots: { '3_4': 'pic-1' },
        jigsaws: [
          {
            id: 'pic-1',
            title: 'Picture One',
            imageUrl: 'https://example.test/pic1.jpg',
            definition_en: '',
            definition_tl: 'pic TL def',
            context_en: null,
            context_tl: 'pic TL ctx',
          },
        ],
      });
      const result = resolveEffectiveCategoryContent(base, api, 'en', 3, 4);
      expect(result.context).toBe('pic TL ctx');
      expect(result.definition).toBe('pic TL def');
    });

    it('uses a picked jigsaw\'s English text in English', () => {
      const api = bilingual({
        jigsawSlots: { '3_4': 'pic-1' },
        jigsaws: [
          {
            id: 'pic-1',
            title: 'Picture One',
            imageUrl: 'https://example.test/pic1.jpg',
            definition_en: 'pic EN def',
            definition_tl: 'pic TL def',
            context_en: 'pic EN ctx',
            context_tl: 'pic TL ctx',
          },
        ],
      });
      const en = resolveEffectiveCategoryContent(base, api, 'en', 3, 4);
      expect(en.context).toBe('pic EN ctx');
      expect(en.definition).toBe('pic EN def');
      const tl = resolveEffectiveCategoryContent(base, api, 'tl', 3, 4);
      expect(tl.context).toBe('pic TL ctx');
      expect(tl.definition).toBe('pic TL def');
    });
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
