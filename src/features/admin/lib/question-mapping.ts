import type { ApiQuestion, ApiQuestionEn, UpsertQuestionRequest } from '@/shared/api';
import type { QuizQuestion, QuizQuestionEn } from '@/shared/content/quiz-content';

/** Null fields become empty strings, which is what the editor's inputs hold. */
function toQuizQuestionEn(en: ApiQuestionEn | null | undefined): QuizQuestionEn | null {
  if (!en) return null;
  return {
    question: en.question,
    hint: en.hint ?? '',
    explanation: en.explanation ?? '',
    miniLesson: en.miniLesson ?? '',
    ...(en.choices && { choices: en.choices }),
    ...(en.correctAnswer !== null && { correctAnswer: en.correctAnswer }),
    ...(en.answerPool && { answerPool: en.answerPool }),
    ...(en.acceptedAnswers && { acceptedAnswers: en.acceptedAnswers }),
  };
}

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
      en: toQuizQuestionEn(api.en),
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
      en: toQuizQuestionEn(api.en),
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
    en: toQuizQuestionEn(api.en),
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

const trimmed = (list: string[] | undefined) => (list ?? []).map((a) => a.trim()).filter(Boolean);

/**
 * The English version with only the fields `type` owns, so a stale field left
 * over from a type change is never sent. The server requires it on every save,
 * so a blank English question throws here rather than sending `null`; the
 * editor blocks saving before this can happen.
 */
function toUpsertEn(en: QuizQuestionEn | null | undefined, type: 'enumeration'): Extract<UpsertQuestionRequest, { type: 'enumeration' }>['en'];
function toUpsertEn(en: QuizQuestionEn | null | undefined, type: 'identification'): Extract<UpsertQuestionRequest, { type: 'identification' }>['en'];
function toUpsertEn(en: QuizQuestionEn | null | undefined, type: 'multiple-choice'): Extract<UpsertQuestionRequest, { type: 'multiple-choice' }>['en'];
function toUpsertEn(en: QuizQuestionEn | null | undefined, type: QuizQuestion['type']): UpsertQuestionRequest['en'] {
  const question = en?.question.trim();
  if (!en || !question) throw new Error('The English version of the question is required.');
  const common = {
    question,
    hint: en.hint.trim() || null,
    explanation: en.explanation.trim() || null,
    miniLesson: en.miniLesson?.trim() || null,
  };
  if (type === 'enumeration') return { ...common, answerPool: trimmed(en.answerPool) };
  if (type === 'identification') {
    return {
      ...common,
      correctAnswer: (en.correctAnswer ?? '').trim(),
      acceptedAnswers: trimmed(en.acceptedAnswers),
    };
  }
  return {
    ...common,
    choices: trimmed(en.choices),
    correctAnswer: (en.correctAnswer ?? '').trim(),
  };
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
      en: toUpsertEn(q.en, 'enumeration'),
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
      en: toUpsertEn(q.en, 'identification'),
    };
  }

  return {
    ...common,
    type: 'multiple-choice',
    choices: (q.choices ?? []).map((c) => c.trim()).filter(Boolean),
    correctAnswer: q.correctAnswer.trim(),
    en: toUpsertEn(q.en, 'multiple-choice'),
  };
}
