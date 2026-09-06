import type { ApiQuestion, UpsertQuestionRequest } from '@/shared/api';
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
      miniLesson: api.miniLesson ?? fallback.miniLesson,
      miniLessonImageUrl: api.miniLessonImageUrl ?? null,
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
      miniLesson: api.miniLesson ?? fallback.miniLesson,
      miniLessonImageUrl: api.miniLessonImageUrl ?? null,
    };
  }

  return {
    hint: api.hint ?? fallback.hint,
    type: 'multiple-choice',
    question: api.question,
    choices: api.choices ?? [],
    correctAnswer: api.correctAnswer ?? '',
    explanation: api.explanation ?? fallback.explanation,
    miniLesson: api.miniLesson ?? fallback.miniLesson,
    miniLessonImageUrl: api.miniLessonImageUrl ?? null,
  };
}

/**
 * The text the Mini-Lessons screen shows for a quiz activity.
 *
 * Prefers the authored mini-lesson and falls back to `explanation`, which is
 * what the screen showed before the field existed — so every question written
 * before mini-lessons, and every one an admin has not filled in, keeps working
 * rather than rendering an empty card.
 */
export function quizLessonText(question: QuizQuestion): string {
  return question.miniLesson?.trim() || question.explanation;
}

/** Sends only the answer fields the chosen type owns. */
export function toUpsertRequest(q: QuizQuestion): UpsertQuestionRequest {
  const common = {
    question: q.question.trim(),
    hint: q.hint.trim() || null,
    explanation: q.explanation.trim() || null,
    // Sent on every save, not only when edited: the PUT is a full overwrite, so
    // omitting it would clear the write-up the Mini-Lessons screen shows.
    miniLesson: q.miniLesson?.trim() || null,
    // Same reason as the write-up above: the picture would be cleared by any
    // save that did not resend it.
    miniLessonImageUrl: q.miniLessonImageUrl?.trim() || null,
  };

  if (q.type === 'enumeration') {
    return {
      ...common,
      type: 'enumeration',
      answerPool: (q.answerPool ?? []).map((a) => a.trim()).filter(Boolean),
      requiredAnswers: q.requiredAnswers ?? 1,
    };
  }

  if (q.type === 'identification') {
    return {
      ...common,
      type: 'identification',
      correctAnswer: q.correctAnswer.trim(),
      // Blank rows are dropped rather than sent: the server rejects an empty
      // alternative, and an editor that left one behind would fail the save.
      acceptedAnswers: (q.acceptedAnswers ?? []).map((a) => a.trim()).filter(Boolean),
    };
  }

  return {
    ...common,
    type: 'multiple-choice',
    choices: (q.choices ?? []).map((c) => c.trim()).filter(Boolean),
    correctAnswer: q.correctAnswer.trim(),
  };
}
