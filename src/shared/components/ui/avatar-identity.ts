/**
 * Turning a student name into an avatar, deterministically.
 *
 * The results API carries no avatar image — only a name — so the leaderboard
 * draws initials on a coloured disc instead. Both halves must be stable: a
 * student who is blue with "JD" on the podium has to stay blue with "JD" in
 * the list below it and on every later render, which rules out anything
 * random or index-derived.
 *
 * Kept free of React so the hash and the initials rule can be unit-tested
 * without a native renderer, matching the other pure modules under test here.
 */

import { categoryColor } from '@/shared/theme/tokens';

/** The six category hues, reused so the avatars stay inside the app's palette. */
const AVATAR_KEYS = ['history', 'culture', 'geography', 'festival', 'national', 'heroes'] as const;

/**
 * FNV-1a, 32-bit. Any stable string hash would do; this one is short, has no
 * dependencies and spreads short names (which is all we get) across the six
 * buckets far better than summing char codes does.
 */
export function hashName(name: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * The `{ base, dark }` pair for a name — `base` fills the disc, `dark` rings
 * it, which is the same relationship the category buttons use.
 */
export function avatarPalette(name: string): { base: string; dark: string } {
  const key = AVATAR_KEYS[hashName(name.trim().toLowerCase()) % AVATAR_KEYS.length];
  return categoryColor(key);
}

/**
 * Up to two initials: first letter of the first word and of the last word.
 *
 * A single-word name yields one letter rather than two from the same word —
 * "Juan" reads better as "J" than as "JJ". Non-letter leading characters are
 * skipped so a name that arrives quoted or bulleted still initialises on its
 * actual letters, and an empty or letterless name falls back to "?" so the
 * disc is never blank.
 */
export function initialsOf(name: string): string {
  const words = name
    .split(/[\s._-]+/)
    .map((w) => w.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter(Boolean);

  if (words.length === 0) return '?';

  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : '';
  return (first + last).toLocaleUpperCase();
}
