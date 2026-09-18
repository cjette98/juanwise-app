import { describe, expect, it } from 'vitest';
import { formatDuration, paceTone } from './teacher-leaderboard-format';
import { tokens } from '@/shared/theme/tokens';

describe('formatDuration', () => {
  it('renders minutes and zero-padded seconds', () => {
    expect(formatDuration(860)).toBe('14m 20s');
    expect(formatDuration(65)).toBe('1m 05s');
  });

  it('rounds to the nearest second', () => {
    expect(formatDuration(64.6)).toBe('1m 05s');
  });

  // The screen sums timings that can arrive empty or, defensively, negative.
  it('floors at zero rather than rendering a negative duration', () => {
    expect(formatDuration(0)).toBe('0m 00s');
    expect(formatDuration(-5)).toBe('0m 00s');
  });

  it('keeps counting in minutes past an hour', () => {
    expect(formatDuration(3725)).toBe('62m 05s');
  });
});

describe('paceTone', () => {
  it('gives every pace a distinct tone and a real icon name', () => {
    const tones = (['fast', 'steady', 'needs-support'] as const).map(paceTone);
    expect(new Set(tones.map((t) => t.bg)).size).toBe(3);
    expect(tones.every((t) => t.icon.length > 0)).toBe(true);
  });

  it('draws from the token palette, never a private hex', () => {
    // Guards the rule the old PACE_META broke: #D4A017, #8E9AAF, #B08D57.
    const palette = new Set<string>(Object.values(tokens.color));
    for (const pace of ['fast', 'steady', 'needs-support'] as const) {
      const { bg, fg } = paceTone(pace);
      expect(palette.has(bg)).toBe(true);
      expect(palette.has(fg)).toBe(true);
    }
  });
});
