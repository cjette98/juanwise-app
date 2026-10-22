import type { TranslationKey } from '@/shared/i18n/language-context';

/**
 * What a numbered activity is called on screen. The client evaluation (item
 * 4.4) asked that a quiz be numbered "Question 1-6", matching the "Puzzle 1-6"
 * the jigsaw already used in conversation — both were labelled "Activity 1-6".
 *
 * Every screen that prints a number therefore has to know which game it is
 * showing; the route param or the result row supplies that, and this module
 * turns it into the right translation keys.
 */
export interface ActivityNaming {
  /** `Question 3` */
  numShort: TranslationKey;
  /** `Question 3: Rizal's Retreat` — the card's accessibility label. */
  numTitle: TranslationKey;
  /** `Question #: 3 of 6 · Level 2/5` — the result pop-up. */
  detailCount: TranslationKey;
  /** `Level 2 · Question 3` */
  levelLine: TranslationKey;
  /** `Level 2 · Question 3 · 4 Mar 2026` — a history row. */
  historyRow: TranslationKey;
  /** `Continue Question 3` — the activity list's primary button. */
  continueLabel: TranslationKey;
}

const QUIZ: ActivityNaming = {
  numShort: 'questionNumShort',
  numTitle: 'questionNumTitle',
  detailCount: 'detailQuestionCount',
  levelLine: 'levelQuestionLine',
  historyRow: 'historyRowQuestion',
  continueLabel: 'continueQuestion',
};

const JIGSAW: ActivityNaming = {
  numShort: 'puzzleNumShort',
  numTitle: 'puzzleNumTitle',
  detailCount: 'detailPuzzleCount',
  levelLine: 'levelPuzzleLine',
  historyRow: 'historyRowPuzzle',
  continueLabel: 'continuePuzzle',
};

/**
 * Anything that is not the jigsaw is a quiz: `activityType` rides the route as
 * a plain string, and a missing or misspelled one should name the game the
 * student is far more often in rather than crash.
 */
export function activityNaming(activityType: string | undefined): ActivityNaming {
  return activityType === 'jigsaw' ? JIGSAW : QUIZ;
}
