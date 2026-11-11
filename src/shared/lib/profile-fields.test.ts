import { describe, expect, it } from 'vitest';
import {
  filterGradeInput,
  filterNameInput,
  filterSectionInput,
  isFullName,
  isGradeLevel,
  identityChanges,
  identityError,
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

describe('identityChanges (Correction 1, F9)', () => {
  const current = { username: 'venice', email: 'venice@gmail.com', lrn: '123456789054', teacherId: '' };

  it('returns only what changed, trimmed, with the email lowercased', () => {
    expect(
      identityChanges(current, { ...current, username: ' venice_f ', email: 'Venice@Gmail.com ' }, false),
    ).toEqual({ username: 'venice_f' });
    expect(identityChanges(current, { ...current, email: 'venice.f@gmail.com' }, false)).toEqual({
      email: 'venice.f@gmail.com',
    });
  });

  it('keeps to the fields the role has', () => {
    const draft = { ...current, lrn: '123456789012', teacherId: '1234567' };
    expect(identityChanges(current, draft, false)).toEqual({ lrn: '123456789012' });
    expect(identityChanges(current, draft, true)).toEqual({ teacherId: '1234567' });
  });

  it('is empty when nothing changed', () => {
    expect(identityChanges(current, current, false)).toEqual({});
  });
});

describe('identityError', () => {
  it('names the first broken rule', () => {
    expect(identityError({ username: 'a b' }, false)).toBe('invalidUsernameMsg');
    expect(identityError({ username: 'ab' }, false)).toBe('invalidUsernameMsg');
    expect(identityError({ email: 'venice@yopmail.com' }, false)).toBe('invalidGmailMsg');
    expect(identityError({ email: 'maria@yopmail.com' }, true)).toBeNull();
    expect(identityError({ lrn: '12345' }, false)).toBe('invalidLrnMsg');
    expect(identityError({ teacherId: '12' }, true)).toBe('invalidTeacherIdMsg');
    expect(identityError({ lrn: '123456789012' }, false)).toBeNull();
  });
});
