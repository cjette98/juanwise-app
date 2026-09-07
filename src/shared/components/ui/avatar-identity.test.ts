import { describe, expect, it } from 'vitest';
import { avatarPalette, hashName, initialsOf } from './avatar-identity';

describe('initialsOf', () => {
  it('takes the first letter of the first and last word', () => {
    expect(initialsOf('Juan Dela Cruz')).toBe('JC');
    expect(initialsOf('Maria Santos')).toBe('MS');
  });

  it('gives a one-word name a single letter', () => {
    expect(initialsOf('Juan')).toBe('J');
  });

  it('uppercases whatever it finds', () => {
    expect(initialsOf('juan dela cruz')).toBe('JC');
  });

  it('splits on separators the roster might use instead of spaces', () => {
    expect(initialsOf('juan.dela_cruz')).toBe('JC');
    expect(initialsOf('  Juan   Cruz  ')).toBe('JC');
  });

  it('never returns an empty label', () => {
    expect(initialsOf('')).toBe('?');
    expect(initialsOf('   ')).toBe('?');
    expect(initialsOf('!!!')).toBe('?');
  });
});

describe('avatarPalette', () => {
  it('gives the same name the same colour every time', () => {
    expect(avatarPalette('Juan Dela Cruz')).toEqual(avatarPalette('Juan Dela Cruz'));
  });

  it('ignores casing and surrounding space, so one student keeps one colour', () => {
    expect(avatarPalette('  juan dela cruz ')).toEqual(avatarPalette('Juan Dela Cruz'));
  });

  it('always returns a usable base/dark pair', () => {
    for (const name of ['A', 'Maria Santos', 'Jose Rizal', '', 'Zzz']) {
      const palette = avatarPalette(name);
      expect(palette.base).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(palette.dark).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(palette.dark).not.toBe(palette.base);
    }
  });

  it('spreads a realistic roster over more than one hue', () => {
    const roster = [
      'Juan Dela Cruz', 'Maria Santos', 'Jose Rizal', 'Andres Bonifacio',
      'Gabriela Silang', 'Apolinario Mabini', 'Melchora Aquino', 'Emilio Jacinto',
    ];
    const hues = new Set(roster.map((n) => avatarPalette(n).base));
    expect(hues.size).toBeGreaterThan(2);
  });
});

describe('hashName', () => {
  it('stays inside the unsigned 32-bit range', () => {
    for (const name of ['', 'a', 'Juan Dela Cruz', 'x'.repeat(200)]) {
      const h = hashName(name);
      expect(Number.isInteger(h)).toBe(true);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThanOrEqual(0xffffffff);
    }
  });

  it('separates names that differ by one character', () => {
    expect(hashName('Maria')).not.toBe(hashName('Marla'));
  });
});
