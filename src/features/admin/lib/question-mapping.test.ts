import { describe, expect, it } from 'vitest';
import type { ApiQuestion } from '@/shared/api';
import type { QuizQuestion } from '@/shared/content/quiz-content';
import { quizLessonText, toQuizQuestion, toUpsertRequest } from './question-mapping';

const fallback: QuizQuestion = {
  hint: 'bundled hint',
  type: 'multiple-choice',
  question: 'bundled question',
  choices: ['a', 'b'],
  correctAnswer: 'a',
  explanation: 'bundled explanation',
};

const apiCommon = {
  id: 'history_1_1',
  category: 'history',
  level: 1,
  activityNum: 1,
  isOverride: true,
  updatedBy: null,
  updatedAt: null,
} as const;

const identification: ApiQuestion = {
  ...apiCommon,
  type: 'identification',
  question: 'Who founded the Katipunan?',
  hint: 'A secret society founded in 1892.',
  explanation: 'Andrés Bonifacio founded it.',
  miniLesson: null,
  choices: null,
  correctAnswer: 'Andrés Bonifacio',
  answerPool: null,
  requiredAnswers: null,
  acceptedAnswers: ['Andres Bonifacio', 'Bonifacio'],
};

describe('toQuizQuestion', () => {
  it('maps an identification question without reinterpreting it', () => {
    expect(toQuizQuestion(identification, fallback)).toEqual({
      hint: 'A secret society founded in 1892.',
      type: 'identification',
      question: 'Who founded the Katipunan?',
      correctAnswer: 'Andrés Bonifacio',
      acceptedAnswers: ['Andres Bonifacio', 'Bonifacio'],
      explanation: 'Andrés Bonifacio founded it.',
    });
  });

  it('treats a response with no acceptedAnswers as having no alternatives', () => {
    const mapped = toQuizQuestion({ ...identification, acceptedAnswers: null }, fallback);
    expect(mapped.acceptedAnswers).toEqual([]);
    expect(mapped.correctAnswer).toBe('Andrés Bonifacio');
  });

  it('falls back to the bundled hint and explanation when the API has none', () => {
    const mapped = toQuizQuestion({ ...identification, hint: null, explanation: null }, fallback);
    expect(mapped.hint).toBe('bundled hint');
    expect(mapped.explanation).toBe('bundled explanation');
  });

  it('still maps multiple-choice and enumeration unchanged', () => {
    const mc = toQuizQuestion(
      { ...identification, type: 'multiple-choice', choices: ['x', 'y'], correctAnswer: 'x', acceptedAnswers: null },
      fallback,
    );
    expect(mc).toMatchObject({ type: 'multiple-choice', choices: ['x', 'y'], correctAnswer: 'x' });

    const pool = Array.from({ length: 10 }, (_, i) => `a${i}`);
    const en = toQuizQuestion(
      { ...identification, type: 'enumeration', correctAnswer: null, answerPool: pool, requiredAnswers: 4, acceptedAnswers: null },
      fallback,
    );
    expect(en).toMatchObject({ type: 'enumeration', answerPool: pool, requiredAnswers: 4 });
  });
});

describe('mini-lesson mapping', () => {
  const lesson = 'Ang Katipunan ay lihim na samahang itinatag noong Hulyo 7, 1892 sa Tondo.';

  it('carries the admin mini-lesson through to the quiz question', () => {
    expect(toQuizQuestion({ ...identification, miniLesson: lesson }, fallback).miniLesson).toBe(
      lesson,
    );
  });

  it('falls back to the bundled mini-lesson when the API has none', () => {
    const bundled = { ...fallback, miniLesson: 'bundled mini-lesson' };
    expect(toQuizQuestion({ ...identification, miniLesson: null }, bundled).miniLesson).toBe(
      'bundled mini-lesson',
    );
  });
});

describe('quizLessonText', () => {
  const question: QuizQuestion = { ...fallback, explanation: 'Short confirmation.' };

  it('prefers the mini-lesson when the admin has written one', () => {
    expect(quizLessonText({ ...question, miniLesson: 'The longer write-up.' })).toBe(
      'The longer write-up.',
    );
  });

  it.each([undefined, '', '   '])(
    'falls back to the explanation when the mini-lesson is %p',
    (miniLesson) => {
      // Every question authored before mini-lessons existed has none, and the
      // explanation is what the screen showed for those before this field.
      expect(quizLessonText({ ...question, miniLesson })).toBe('Short confirmation.');
    },
  );
});

describe('toUpsertRequest', () => {
  const lesson = 'Ang Katipunan ay lihim na samahang itinatag noong 1892.';
  const question: QuizQuestion = { ...fallback, miniLesson: lesson };

  it.each([
    ['multiple-choice', question],
    ['enumeration', { ...question, type: 'enumeration' as const, answerPool: ['a'], requiredAnswers: 1 }],
    ['identification', { ...question, type: 'identification' as const }],
  ])('sends the mini-lesson on a %s question', (_label, q) => {
    // The PUT is a full overwrite server-side, so a request that omits the
    // mini-lesson clears it — saving from this editor must not wipe it.
    expect(toUpsertRequest(q)).toMatchObject({ miniLesson: lesson });
  });

  it('sends null rather than an empty string when there is no mini-lesson', () => {
    expect(toUpsertRequest({ ...fallback, miniLesson: '  ' })).toMatchObject({ miniLesson: null });
  });
});
