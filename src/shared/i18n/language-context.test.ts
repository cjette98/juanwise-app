import { describe, expect, it } from 'vitest';
import { translate } from './language-context';

/**
 * `en` and `tl` are read back out of the module source rather than exported:
 * the dictionaries are private, and a test that re-declared them would only
 * prove the copy in the test matches itself.
 */
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(__dirname, 'language-context.tsx'), 'utf8');

function entriesOf(startMarker: string, endMarker: string): Map<string, string> {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  const block = source.slice(start, end);
  const out = new Map<string, string>();
  // Values are single-quoted and may be concatenated across lines with `+`.
  for (const m of block.matchAll(/^ {2}([A-Za-z][A-Za-z0-9_]*):\s*((?:'(?:\\.|[^'\\])*'\s*\+?\s*)+),?$/gms)) {
    out.set(m[1], m[2]);
  }
  return out;
}

/** The `{name}` slots a string interpolates. */
function placeholders(value: string): string[] {
  return [...value.matchAll(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g)].map((m) => m[1]).sort();
}

function keysOf(startMarker: string, endMarker: string): string[] {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  expect(start, `marker not found: ${startMarker}`).toBeGreaterThan(-1);
  expect(end, `marker not found: ${endMarker}`).toBeGreaterThan(start);
  const block = source.slice(start, end);
  return [...block.matchAll(/^ {2}([A-Za-z][A-Za-z0-9_]*):/gm)].map((m) => m[1]);
}

const enKeys = keysOf('const en = {', 'export type TranslationKey');
const tlKeys = keysOf('const tl: Record<TranslationKey, string> = {', 'const translations = { en, tl }');

describe('translation dictionaries', () => {
  it('reads a non-trivial number of keys, so the parity checks below mean something', () => {
    expect(enKeys.length).toBeGreaterThan(300);
  });

  it('defines every English key in Tagalog too', () => {
    expect([...tlKeys].sort()).toEqual([...enKeys].sort());
  });

  it('never declares the same key twice in one dictionary', () => {
    expect(new Set(enKeys).size).toBe(enKeys.length);
    expect(new Set(tlKeys).size).toBe(tlKeys.length);
  });
});

describe('placeholder parity', () => {
  const enEntries = entriesOf('const en = {', 'export type TranslationKey');
  const tlEntries = entriesOf('const tl: Record<TranslationKey, string> = {', 'const translations = { en, tl }');

  it('parses a value for nearly every key, so the comparison below is not vacuous', () => {
    expect(enEntries.size).toBeGreaterThan(300);
    expect(tlEntries.size).toBeGreaterThan(300);
  });

  it('interpolates the same variables in Tagalog as in English', () => {
    const mismatched: string[] = [];
    for (const [key, enValue] of enEntries) {
      const tlValue = tlEntries.get(key);
      if (tlValue === undefined) continue;
      const a = placeholders(enValue);
      const b = placeholders(tlValue);
      if (a.join(',') !== b.join(',')) mismatched.push(`${key}: en{${a}} vs tl{${b}}`);
    }
    expect(mismatched).toEqual([]);
  });
});

describe('translate', () => {
  it('returns the English copy before any provider has set a language', () => {
    expect(translate('loginBtn')).toBe('LOGIN');
  });

  it('substitutes every occurrence of a placeholder', () => {
    expect(translate('levelNum', { n: 3 })).toBe('Level 3');
    expect(translate('passedWithCount', { correct: 2, required: 5 })).toBe('Passed (2/5)');
  });

  it('accepts numbers as well as strings', () => {
    expect(translate('detailQuestionCount', { num: 3, level: 2 })).toBe(
      'Question #: 3 of 6 · Level 2/5',
    );
  });

  it('leaves an unfilled placeholder alone rather than printing undefined', () => {
    expect(translate('levelNum')).toBe('Level {n}');
  });
});
