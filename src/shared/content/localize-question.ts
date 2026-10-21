import type { Language } from '@/shared/i18n/language-context';
import type { QuizQuestion } from './quiz-content';

/**
 * The question as one language, with no `en` left on it.
 *
 * English mode uses the English version when there is one, otherwise the
 * Tagalog version. A question is never mixed: once the English version is
 * chosen every text field comes from it, so a missing English hint is `''`
 * rather than the Tagalog hint. Pictures, `type` and `requiredAnswers` are
 * shared and carry over unchanged.
 */
export function localizeQuestion(q: QuizQuestion, language: Language): QuizQuestion {
  const { en, ...tagalog } = q;
  if (language !== 'en' || !en) return tagalog;

  const base = {
    type: q.type,
    requiredAnswers: q.requiredAnswers,
    miniLessonImageUrl: q.miniLessonImageUrl,
    question: en.question,
    hint: en.hint ?? '',
    explanation: en.explanation ?? '',
    miniLesson: en.miniLesson,
  };

  if (q.type === 'enumeration') {
    const answerPool = en.answerPool ?? [];
    return { ...base, correctAnswer: en.correctAnswer ?? answerPool.join(', '), answerPool };
  }
  if (q.type === 'identification') {
    return {
      ...base,
      correctAnswer: en.correctAnswer ?? '',
      acceptedAnswers: en.acceptedAnswers ?? [],
    };
  }
  return { ...base, choices: en.choices ?? [], correctAnswer: en.correctAnswer ?? '' };
}
