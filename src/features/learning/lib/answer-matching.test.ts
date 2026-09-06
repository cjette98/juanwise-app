import { describe, expect, it } from 'vitest';
import { matchesIdentificationAnswer, normalizeAnswer } from './answer-matching';

describe('normalizeAnswer', () => {
  it('trims, collapses whitespace, and lowercases', () => {
    expect(normalizeAnswer('  Andres   BONIFACIO ')).toBe('andres bonifacio');
  });

  it('collapses tabs and newlines too', () => {
    expect(normalizeAnswer('Andres\t\nBonifacio')).toBe('andres bonifacio');
  });
});

describe('matchesIdentificationAnswer', () => {
  it('matches the primary answer', () => {
    expect(matchesIdentificationAnswer(' ANDRÉS  BONIFACIO ', 'Andrés Bonifacio')).toBe(true);
  });

  it('matches an accepted alternative', () => {
    expect(matchesIdentificationAnswer('bonifacio', 'Andrés Bonifacio', ['Bonifacio'])).toBe(true);
  });

  it('does not strip accents or accept unrelated text', () => {
    expect(matchesIdentificationAnswer('Andres Bonifacio', 'Andrés Bonifacio')).toBe(false);
    expect(matchesIdentificationAnswer('Jose Rizal', 'Andrés Bonifacio', ['Bonifacio'])).toBe(false);
  });

  it('does not strip punctuation', () => {
    expect(matchesIdentificationAnswer('Andres Bonifacio.', 'Andres Bonifacio')).toBe(false);
  });

  it('rejects a blank answer even when an alternative is blank-ish', () => {
    expect(matchesIdentificationAnswer('   ', 'Andrés Bonifacio')).toBe(false);
  });

  it('treats null and omitted alternatives as none', () => {
    expect(matchesIdentificationAnswer('Bonifacio', 'Andrés Bonifacio', null)).toBe(false);
    expect(matchesIdentificationAnswer('Andrés Bonifacio', 'Andrés Bonifacio', null)).toBe(true);
  });
});
