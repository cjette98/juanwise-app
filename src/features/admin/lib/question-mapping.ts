import type { ApiQuestion } from '@/shared/api';
import type { QuizQuestion } from '@/shared/content/quiz-content';

/**
 * API question → the shape the Quiz screen and the editor already speak.
 *
 * Pure and type-only in its imports so it can be unit tested without loading
 * Expo's asset or native modules.
 *
 * Each type is mapped explicitly rather than by falling through to a default,
 * because the fall-through is what previously turned an identification question
 * into a multiple-choice one with no choices.
 */
export function toQuizQuestion(api: ApiQuestion, fallback: QuizQuestion): QuizQuestion {
  if (api.type === 'enumeration') {
    const answerPool = api.answerPool ?? [];
    return {
      hint: api.hint ?? fallback.hint,
      type: 'enumeration',
      question: api.question,
      correctAnswer: api.correctAnswer ?? answerPool.join(', '),
      answerPool,
      requiredAnswers: api.requiredAnswers ?? Math.min(3, answerPool.length || 1),
      explanation: api.explanation ?? fallback.explanation,
    };
  }

  if (api.type === 'identification') {
    return {
      hint: api.hint ?? fallback.hint,
      type: 'identification',
      question: api.question,
      correctAnswer: api.correctAnswer ?? '',
      // Null on a document written before identification existed.
      acceptedAnswers: api.acceptedAnswers ?? [],
      explanation: api.explanation ?? fallback.explanation,
    };
  }

  return {
    hint: api.hint ?? fallback.hint,
    type: 'multiple-choice',
    question: api.question,
    choices: api.choices ?? [],
    correctAnswer: api.correctAnswer ?? '',
    explanation: api.explanation ?? fallback.explanation,
  };
}
