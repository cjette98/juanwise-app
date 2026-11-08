// ─── Leaving an activity (Adjustment 3, item 2) ──────────────────────────────
// Leaving before answering must not count as a failed attempt; only an attempt
// the player started answering counts (client, 2026-11-07). A player who
// leaves early comes back to a fresh timer. The on-screen Back button, Android's
// hardware back and the iOS swipe-back all go through this one rule.
//
// Pure on purpose (no React, no Expo), so it can be unit-tested.

import type { ApiQuestionType } from '@/shared/api/types';

export type ExitDecision = 'leave' | 'record-fail';

export function decideExit({ inPlay, started }: { inPlay: boolean; started: boolean }): ExitDecision {
  return inPlay && started ? 'record-fail' : 'leave';
}

/**
 * Whether the player has started answering a quiz question. A multiple-choice
 * tap submits on the spot, so there is nothing in between; typed answers count
 * from the first character.
 */
export function quizAnswerStarted(type: ApiQuestionType, textAnswer: string, enumAnswers: string[]): boolean {
  if (type === 'identification') return textAnswer.trim().length > 0;
  if (type === 'enumeration') return enumAnswers.some((a) => a.trim().length > 0);
  return false;
}
