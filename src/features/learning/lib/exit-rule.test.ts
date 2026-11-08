import { describe, expect, it } from 'vitest';
import { decideExit, quizAnswerStarted } from './exit-rule';

/**
 * Adjustment 3, item 2: leaving before answering must not count as a failed
 * attempt. Only an attempt the player started answering counts (client,
 * 2026-11-07).
 */
describe('decideExit', () => {
  it('lets the player leave with no attempt before they start answering', () => {
    expect(decideExit({ inPlay: true, started: false })).toBe('leave');
  });

  it('records a failed attempt once they have started', () => {
    expect(decideExit({ inPlay: true, started: true })).toBe('record-fail');
  });

  it('just leaves outside play (mini-lesson, result pop-up)', () => {
    expect(decideExit({ inPlay: false, started: true })).toBe('leave');
  });
});

describe('quizAnswerStarted', () => {
  it('never counts a multiple-choice question as started, since a tap submits it', () => {
    expect(quizAnswerStarted('multiple-choice', '', [])).toBe(false);
  });

  it('counts an identification answer once something is typed', () => {
    expect(quizAnswerStarted('identification', '   ', [])).toBe(false);
    expect(quizAnswerStarted('identification', 'Rizal', [])).toBe(true);
  });

  it('counts an enumeration once any box has an answer', () => {
    expect(quizAnswerStarted('enumeration', '', ['', ' '])).toBe(false);
    expect(quizAnswerStarted('enumeration', '', ['', 'Luzon'])).toBe(true);
  });
});
