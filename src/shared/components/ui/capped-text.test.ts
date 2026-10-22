import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Item 3.2 of the client evaluation. The design-system text variants cap the
 * phone's font-size setting, but screens that drew React Native's own `Text`
 * or `TextInput` had no cap at all: at the largest setting the teacher's
 * Activity Management heading broke mid-word and the login fields grew past
 * their boxes. Every screen now takes those two from `capped-text`, which
 * carries a default cap — this keeps a new screen from bringing the raw ones
 * back.
 */

const SRC = path.join(__dirname, '..', '..', '..');
const ALLOWED = new Set([
  path.join(__dirname, 'capped-text.tsx'),
  path.join(__dirname, 'text.tsx'),
]);

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

/** The names a file imports from 'react-native', across one or many lines. */
function reactNativeImports(source: string): string[] {
  return [...source.matchAll(/import\s*\{([^}]*)\}\s*from\s*'react-native'/g)].flatMap((m) =>
    m[1].split(',').map((name) => name.trim().replace(/^type\s+/, '')),
  );
}

describe('raw text components', () => {
  it('reads the app source, so the check below is not vacuous', () => {
    expect(sourceFiles(SRC).length).toBeGreaterThan(50);
  });

  it('takes Text and TextInput from capped-text everywhere', () => {
    const offenders = sourceFiles(SRC)
      .filter((file) => !ALLOWED.has(file))
      .filter((file) => {
        const names = reactNativeImports(fs.readFileSync(file, 'utf8'));
        return names.includes('Text') || names.includes('TextInput');
      })
      .map((file) => path.relative(SRC, file));
    expect(offenders).toEqual([]);
  });
});
