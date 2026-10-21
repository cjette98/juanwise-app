import { describe, expect, it } from 'vitest';
import {
  filterGradeInput,
  filterNameInput,
  filterSectionInput,
  isFullName,
  isGradeLevel,
  isSection,
} from './profile-fields';

describe('isFullName', () => {
  it('accepts two or more words of letters, including accents', () => {
    expect(isFullName('Juan Dela Cruz')).toBe(true);
    expect(isFullName('  Maria Cruz  ')).toBe(true);
    expect(isFullName('Niña José')).toBe(true);
  });

  it('refuses special characters and digits', () => {
    expect(isFullName('Juan @#$%^&*')).toBe(false);
    expect(isFullName('Juan Cruz3')).toBe(false);
    expect(isFullName('Juan_Cruz')).toBe(false);
    expect(isFullName('Dela Cruz-Santos')).toBe(false);
  });

  it('still wants a first and a last name', () => {
    expect(isFullName('Juan')).toBe(false);
    expect(isFullName('')).toBe(false);
    expect(isFullName('   ')).toBe(false);
  });

  it('refuses double spaces and over-long names', () => {
    expect(isFullName('Juan  Cruz')).toBe(false);
    expect(isFullName(`${'a'.repeat(80)} Cruz`)).toBe(false);
  });
});

describe('isGradeLevel', () => {
  it('accepts 1 to 12 only', () => {
    for (const grade of ['1', '6', '12', ' 7 ']) expect(isGradeLevel(grade)).toBe(true);
  });

  it('refuses anything outside the range or not a plain number', () => {
    for (const grade of ['0', '13', '999', '', '6.5', '06', '-1', 'six']) {
      expect(isGradeLevel(grade)).toBe(false);
    }
  });
});

describe('isSection', () => {
  it('accepts letters and digits', () => {
    expect(isSection('Infinity1')).toBe(true);
    expect(isSection('A')).toBe(true);
    expect(isSection(' Rizal2 ')).toBe(true);
  });

  it('refuses spaces, punctuation and empties', () => {
    for (const section of ['St. Rizal', 'Section 1', 'A-1', '!!!', '', 'a'.repeat(41)]) {
      expect(isSection(section)).toBe(false);
    }
  });
});

describe('input filters', () => {
  it('drops what the field does not allow as the user types', () => {
    expect(filterNameInput('Ju@n#1 Cruz')).toBe('Jun Cruz');
    expect(filterGradeInput('1a2b3')).toBe('12');
    expect(filterSectionInput('Infinity 1!')).toBe('Infinity1');
  });

  it('keeps a trailing space in a name so the next word can be typed', () => {
    expect(filterNameInput('Juan ')).toBe('Juan ');
    expect(filterNameInput('Juan   ')).toBe('Juan ');
  });
});
