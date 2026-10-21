import { describe, expect, it } from 'vitest';
import type { QuizQuestion } from './quiz-content';
import { localizeQuestion } from './localize-question';

const withEn: QuizQuestion = {
  hint: 'Pahiwatig',
  type: 'multiple-choice',
  question: 'Sino ang nagtatag ng Katipunan?',
  choices: ['Andres Bonifacio', 'Jose Rizal'],
  correctAnswer: 'Andres Bonifacio',
  explanation: 'Tama!',
  miniLesson: 'Aralin',
  miniLessonImageUrl: 'https://img/x.png',
  en: {
    question: 'Who founded the Katipunan?',
    hint: '',
    explanation: 'Correct!',
    miniLesson: 'Lesson',
    choices: ['Andres Bonifacio', 'Jose Rizal'],
    correctAnswer: 'Andres Bonifacio',
  },
};

describe('localizeQuestion', () => {
  it('returns the English text in English mode and keeps shared fields', () => {
    const q = localizeQuestion(
      { ...withEn, en: { ...withEn.en!, choices: ['A. Bonifacio', 'J. Rizal'], correctAnswer: 'A. Bonifacio' } },
      'en',
    );
    expect(q.question).toBe('Who founded the Katipunan?');
    expect(q.choices).toEqual(['A. Bonifacio', 'J. Rizal']);
    expect(q.correctAnswer).toBe('A. Bonifacio');
    expect(q.explanation).toBe('Correct!');
    expect(q.type).toBe('multiple-choice');
    expect(q.miniLessonImageUrl).toBe('https://img/x.png');
    expect('en' in q).toBe(false);
  });

  it('keeps requiredAnswers for enumeration', () => {
    const q = localizeQuestion(
      {
        hint: 'h',
        type: 'enumeration',
        question: 'Isa-isahin',
        correctAnswer: 'a, b',
        answerPool: ['a', 'b'],
        requiredAnswers: 3,
        explanation: 'e',
        en: { question: 'List', hint: 'x', explanation: 'y', answerPool: ['c', 'd'] },
      },
      'en',
    );
    expect(q.answerPool).toEqual(['c', 'd']);
    expect(q.requiredAnswers).toBe(3);
  });

  it('falls back to Tagalog when there is no English version', () => {
    const q = localizeQuestion({ ...withEn, en: null }, 'en');
    expect(q.question).toBe('Sino ang nagtatag ng Katipunan?');
    expect(q.hint).toBe('Pahiwatig');
    expect('en' in q).toBe(false);
  });

  it('returns Tagalog in Tagalog mode even with an English version', () => {
    const q = localizeQuestion(withEn, 'tl');
    expect(q.question).toBe('Sino ang nagtatag ng Katipunan?');
    expect(q.explanation).toBe('Tama!');
    expect('en' in q).toBe(false);
  });

  it('uses an empty hint, not the Tagalog one, when English has none', () => {
    expect(localizeQuestion(withEn, 'en').hint).toBe('');
  });
});
