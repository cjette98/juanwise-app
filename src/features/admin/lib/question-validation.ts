import type { TranslationKey } from '@/shared/i18n/language-context';

export type DraftQuizType = 'multiple-choice' | 'identification' | 'enumeration';

/** The text of one language's version of a question, as the editor holds it. */
export interface LangDraft {
  hint: string;
  question: string;
  choices: string[];
  correctAnswer: string;
  acceptedAnswers: string[];
  answerPool: string[];
  explanation: string;
}

export interface DraftError {
  titleKey: TranslationKey;
  msgKey: TranslationKey;
  params?: Record<string, string | number>;
  /** True when the problem is in the English version, so the message gets the English prefix. */
  english: boolean;
}

export type DraftResult =
  | { ok: true; tl: LangDraft; en: LangDraft; requiredAnswers: number }
  | { ok: false; error: DraftError };

/** Case-insensitive; keeps the first spelling of each. */
const dedupe = (list: string[]) =>
  Array.from(new Map(list.reverse().map((a) => [a.toLowerCase(), a])).values()).reverse();

const fail = (
  english: boolean,
  titleKey: TranslationKey,
  msgKey: TranslationKey,
  params?: Record<string, string | number>,
): { ok: false; error: DraftError } => ({ ok: false, error: { titleKey, msgKey, english, ...(params && { params }) } });

type LangResult = { ok: true; value: LangDraft } | { ok: false; error: DraftError };

/** One language's checks. `required` is the shared enumeration count (NaN when unparsable). */
function validateLang(
  type: DraftQuizType,
  d: LangDraft,
  required: number,
  minPool: number,
  english: boolean,
): LangResult {
  const hint = d.hint.trim();
  const question = d.question.trim();
  if (!question || !hint) return fail(english, 'missingInfo', 'needLessonAndQuestionMsg');
  const explanation = d.explanation.trim() || hint;
  const base = { hint, question, explanation, choices: [], acceptedAnswers: [], answerPool: [], correctAnswer: '' };

  if (type === 'enumeration') {
    const pool = dedupe(d.answerPool.map((a) => a.trim()).filter(Boolean));
    if (pool.length < minPool) {
      return fail(english, 'poolTooSmallTitle', 'poolTooSmallMsg', { min: minPool, count: pool.length });
    }
    if (!required || required < 1) return fail(english, 'invalidTitle', 'invalidRequiredMsg');
    if (required > pool.length) {
      return fail(english, 'invalidTitle', 'requiredExceedsPoolMsg', { required, pool: pool.length });
    }
    return { ok: true, value: { ...base, answerPool: pool, correctAnswer: pool.join(', ') } };
  }

  const correctAnswer = d.correctAnswer.trim();
  if (!correctAnswer) return fail(english, 'missingInfo', 'needCorrectAnswerMsg');

  if (type === 'multiple-choice') {
    const choices = d.choices.map((c) => c.trim()).filter(Boolean);
    if (choices.length < 2) return fail(english, 'needChoicesTitle', 'needChoicesMsg');
    if (!choices.some((c) => c.toLowerCase() === correctAnswer.toLowerCase())) {
      return fail(english, 'mismatchTitle', 'mismatchMsg');
    }
    return { ok: true, value: { ...base, choices, correctAnswer } };
  }

  const acceptedAnswers = dedupe(d.acceptedAnswers.map((a) => a.trim()).filter(Boolean)).filter(
    (a) => a.toLowerCase() !== correctAnswer.toLowerCase(),
  );
  return { ok: true, value: { ...base, correctAnswer, acceptedAnswers } };
}

/**
 * Both languages are required, and the English version obeys the same per-type
 * rules as the Tagalog one. Returns the trimmed, de-duplicated drafts to save.
 */
export function validateQuestionDraft(input: {
  type: DraftQuizType;
  tl: LangDraft;
  en: LangDraft;
  requiredAnswers: string;
  minPool: number;
}): DraftResult {
  const { type, tl, en, minPool } = input;
  const required = parseInt(input.requiredAnswers, 10);

  // Exactly one version written: say so, rather than a generic "missing" error.
  if (!!tl.question.trim() !== !!en.question.trim()) {
    return fail(false, 'missingInfo', 'bothLanguagesRequired');
  }

  const tlResult = validateLang(type, tl, required, minPool, false);
  if (!tlResult.ok) return tlResult;
  const enResult = validateLang(type, en, required, minPool, true);
  if (!enResult.ok) return enResult;

  return { ok: true, tl: tlResult.value, en: enResult.value, requiredAnswers: required || 0 };
}
