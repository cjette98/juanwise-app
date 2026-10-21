import type { TranslationKey } from '@/shared/i18n/language-context';
import { activityNaming } from './activity-naming';

/**
 * The primary footer action, described rather than rendered: the screen holds
 * the `t()` the label needs, so this returns the dictionary key and its
 * interpolation vars instead of a finished English string.
 */
export type PrimaryActivityAction =
  | { kind: 'activity'; activityNum: number; labelKey: TranslationKey; labelVars: { n: number } }
  | { kind: 'summary'; labelKey: TranslationKey; labelVars: { n: number } };

/** `finishedActivityNumbers` is completed ∪ exhausted: both close a slot. */
export function getPrimaryActivityAction(
  finishedActivityNumbers: number[],
  level: number,
  /** Quiz or jigsaw: the button says "Continue Question 3" or "Continue Puzzle 3". */
  activityType?: string,
): PrimaryActivityAction {
  const nextActivity = [1, 2, 3, 4, 5, 6].find(
    (activityNum) => !finishedActivityNumbers.includes(activityNum),
  );

  if (nextActivity !== undefined) {
    return {
      kind: 'activity',
      activityNum: nextActivity,
      labelKey: activityNaming(activityType).continueLabel,
      labelVars: { n: nextActivity },
    };
  }

  return { kind: 'summary', labelKey: 'completeLevel', labelVars: { n: level } };
}

/**
 * The difficulty a level plays at. `key` is the stable English value the route
 * params and the jigsaw guide-opacity check both rely on; `labelKey` is what
 * gets rendered.
 */
export type DifficultyKey = 'Easy' | 'Normal' | 'Hard';

export function getLevelDifficultyKey(level: number): DifficultyKey {
  if (level === 1) return 'Easy';
  if (level === 2 || level === 3) return 'Normal';
  return 'Hard';
}

const DIFFICULTY_LABEL_KEYS: Record<DifficultyKey, TranslationKey> = {
  Easy: 'easy',
  Normal: 'normal',
  Hard: 'hard',
};

export function difficultyLabelKey(difficulty: string): TranslationKey {
  return DIFFICULTY_LABEL_KEYS[difficulty as DifficultyKey] ?? 'normal';
}
