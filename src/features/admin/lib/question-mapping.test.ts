import { describe, expect, it } from 'vitest';
import type { ApiQuestion } from '@/shared/api';
import type { QuizQuestion } from '@/shared/content/quiz-content';
import { toQuizQuestion } from './question-mapping';

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
