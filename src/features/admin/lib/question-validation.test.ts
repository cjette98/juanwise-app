import { describe, expect, it } from 'vitest';
import { validateQuestionDraft, type LangDraft } from './question-validation';

const MIN = 3;

const mc = (over: Partial<LangDraft> = {}): LangDraft => ({
  hint: 'h',
  question: 'q',
  choices: ['a', 'b', '', ''],
  correctAnswer: 'a',
  acceptedAnswers: [],
  answerPool: [],
  explanation: '',
  ...over,
});

const run = (type: 'multiple-choice' | 'identification' | 'enumeration', tl: LangDraft, en: LangDraft, required = '2') =>
  validateQuestionDraft({ type, tl, en, requiredAnswers: required, minPool: MIN });

describe('validateQuestionDraft', () => {
  it('accepts a complete multiple-choice pair and trims/falls back', () => {
    const r = run('multiple-choice', mc(), mc({ question: ' Q ', choices: ['x', 'y', '', ''], correctAnswer: 'Y', explanation: '' }));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.tl.choices).toEqual(['a', 'b']);
      expect(r.tl.explanation).toBe('h');
      expect(r.en.question).toBe('Q');
      expect(r.en.choices).toEqual(['x', 'y']);
    }
  });

  it('asks for both languages when only one question is filled', () => {
    const r = run('multiple-choice', mc(), mc({ question: '  ' }));
    expect(r).toEqual({ ok: false, error: { titleKey: 'missingInfo', msgKey: 'bothLanguagesRequired', english: false } });
    const r2 = run('multiple-choice', mc({ question: '' }), mc());
    expect(r2.ok === false && r2.error.msgKey).toBe('bothLanguagesRequired');
  });

  it('flags the Tagalog problem without the English prefix', () => {
    const r = run('multiple-choice', mc({ correctAnswer: 'zzz' }), mc());
    expect(r.ok === false && r.error).toMatchObject({ msgKey: 'mismatchMsg', english: false });
  });

  it('flags an English problem with english: true', () => {
    const r = run('multiple-choice', mc(), mc({ correctAnswer: 'zzz' }));
    expect(r.ok === false && r.error).toMatchObject({ msgKey: 'mismatchMsg', english: true });
    const r2 = run('multiple-choice', mc(), mc({ choices: ['only', '', '', ''], correctAnswer: 'only' }));
    expect(r2.ok === false && r2.error).toMatchObject({ msgKey: 'needChoicesMsg', english: true });
    const r3 = run('multiple-choice', mc(), mc({ hint: '' }));
    expect(r3.ok === false && r3.error).toMatchObject({ msgKey: 'needLessonAndQuestionMsg', english: true });
  });

  it('checks the enumeration pool in each language against the shared required count', () => {
    const pool = ['a', 'b', 'c'];
    const e = (over: Partial<LangDraft> = {}) => mc({ choices: [], correctAnswer: '', answerPool: pool, ...over });
    expect(run('enumeration', e(), e()).ok).toBe(true);
    const small = run('enumeration', e(), e({ answerPool: ['a', 'A', 'b', ''] }));
    expect(small.ok === false && small.error).toMatchObject({ msgKey: 'poolTooSmallMsg', english: true, params: { min: MIN, count: 2 } });
    const bad = run('enumeration', e(), e(), '0');
    expect(bad.ok === false && bad.error).toMatchObject({ msgKey: 'invalidRequiredMsg', english: false });
    const over = run('enumeration', e(), e(), '4');
    expect(over.ok === false && over.error).toMatchObject({ msgKey: 'requiredExceedsPoolMsg', english: false });
  });

  it('dedupes identification alternatives and drops the primary answer', () => {
    const i = (over: Partial<LangDraft> = {}) =>
      mc({ choices: [], correctAnswer: 'Bonifacio', acceptedAnswers: [' bonifacio ', 'Andres', 'andres', ''], ...over });
    const r = run('identification', i(), i());
    expect(r.ok && r.tl.acceptedAnswers).toEqual(['Andres']);
    expect(r.ok && r.en.acceptedAnswers).toEqual(['Andres']);
    const missing = run('identification', i(), i({ correctAnswer: '' }));
    expect(missing.ok === false && missing.error).toMatchObject({ msgKey: 'needCorrectAnswerMsg', english: true });
  });
});
