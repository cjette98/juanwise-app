import { describe, expect, it } from 'vitest';
import { validateQuestionDraft, type LangDraft } from './question-validation';

const MIN = 3;

const mc = (over: Partial<LangDraft> = {}): LangDraft => ({
  hint: 'h',
  miniLesson: '',
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
      expect(r.en.correctAnswer).toBe('y');
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
  });

  it('keeps the hint required in both languages', () => {
    const en = run('multiple-choice', mc(), mc({ hint: ' ' }));
    expect(en.ok === false && en.error).toMatchObject({ msgKey: 'needLessonAndQuestionMsg', english: true });
    const tl = run('multiple-choice', mc({ hint: '' }), mc());
    expect(tl.ok === false && tl.error).toMatchObject({ msgKey: 'needLessonAndQuestionMsg', english: false });
  });

  it('treats the mini-lesson as optional: both empty is fine, one filled needs the other', () => {
    const none = run('multiple-choice', mc(), mc({ miniLesson: ' ' }));
    expect(none.ok && [none.tl.miniLesson, none.en.miniLesson]).toEqual(['', '']);
    const a = run('multiple-choice', mc({ miniLesson: 'x' }), mc());
    expect(a).toEqual({ ok: false, error: { titleKey: 'missingInfo', msgKey: 'bothLanguagesRequired', english: false } });
    const b = run('multiple-choice', mc(), mc({ miniLesson: 'x' }));
    expect(b.ok === false && b.error.msgKey).toBe('bothLanguagesRequired');
  });

  it('returns trimmed mini-lessons for both languages', () => {
    const r = run('multiple-choice', mc({ miniLesson: ' T ' }), mc({ miniLesson: ' E ' }));
    expect(r.ok && [r.tl.miniLesson, r.en.miniLesson]).toEqual(['T', 'E']);
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

  it('sends the matching choice\'s own spelling as the correct answer', () => {
    const r = run('multiple-choice', mc({ choices: ['Yes', 'No', '', ''], correctAnswer: ' yes ' }), mc({ choices: ['Oo', 'Hindi', '', ''], correctAnswer: 'HINDI' }));
    expect(r.ok && r.tl.correctAnswer).toBe('Yes');
    expect(r.ok && r.en.correctAnswer).toBe('Hindi');
  });

  it('treats inner whitespace differences as duplicates', () => {
    const i = () => mc({ choices: [], correctAnswer: 'x  y', acceptedAnswers: ['x y', 'a  b', 'a b'] });
    const r = run('identification', i(), i());
    expect(r.ok && r.tl.acceptedAnswers).toEqual(['a  b']);
    const e = () => mc({ choices: [], answerPool: ['a  b', 'a b', 'c'] });
    expect(run('enumeration', e(), e(), '2').ok).toBe(false);
  });

  it('rejects identification answers over 200 characters', () => {
    const long = 'x'.repeat(201);
    const i = (over: Partial<LangDraft>) => mc({ choices: [], correctAnswer: 'ok', ...over });
    const a = run('identification', i({ correctAnswer: long }), i({}));
    expect(a.ok === false && a.error).toMatchObject({ msgKey: 'answerTooLongMsg', english: false, params: { max: 200 } });
    const b = run('identification', i({}), i({ acceptedAnswers: [long] }));
    expect(b.ok === false && b.error).toMatchObject({ msgKey: 'answerTooLongMsg', english: true });
    expect(run('identification', i({ correctAnswer: 'x'.repeat(200) }), i({})).ok).toBe(true);
  });
});
