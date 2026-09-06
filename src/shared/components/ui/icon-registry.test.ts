import { describe, expect, it } from 'vitest';
import { ICONS, type IconName } from './icon-registry';

// Every emoji the old screens used as an icon needs a replacement, or the
// revamp cannot remove it.
const REQUIRED: IconName[] = [
  'home', 'book', 'lesson', 'quiz', 'puzzle', 'trophy', 'user', 'star',
  'clock', 'lock', 'check', 'close', 'chevronLeft', 'chevronRight',
  'medal', 'play', 'key', 'lightbulb', 'chart', 'flag', 'bolt', 'refresh',
  'eye', 'logout', 'grid', 'bookmark',
];

describe('icon registry', () => {
  it.each(REQUIRED)('has an icon for %s', (name) => {
    expect(ICONS[name]).toBeDefined();
    expect(ICONS[name].length).toBeGreaterThan(0);
  });

  it('gives every icon at least one well-formed path', () => {
    // Deliberately not asserting coordinate ranges: a regex over path numbers
    // cannot tell a coordinate from a relative delta from an arc flag, and two
    // attempts at it failed on correct data. What is worth guarding is that
    // every icon actually draws something and starts with a move command.
    for (const [name, paths] of Object.entries(ICONS)) {
      expect(paths.length, `${name} has no paths`).toBeGreaterThan(0);
      for (const d of paths) {
        expect(d.trim(), `${name} has an empty path`).not.toBe('');
        expect(d, `${name} does not start with a move command`).toMatch(/^[Mm]/);
      }
    }
  });
});
