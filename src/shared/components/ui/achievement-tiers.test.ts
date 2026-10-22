import { describe, expect, it } from 'vitest';
import { tierColor } from './achievement-tiers';
import { ICONS } from './icon-registry';
import { tokens } from '@/shared/theme/tokens';

/**
 * Item 5.1 of the client evaluation. The badges themselves are SVG, which
 * this project does not render in tests; what is worth pinning down is the
 * part that used to be copied into four screens — the tier tint — and that
 * both badges are drawn from the shared icon set rather than a glyph of
 * their own, which is how the leaderboard ended up with a crowned hexagon.
 */

describe('tierColor', () => {
  it('gives each tier its medal colour', () => {
    expect(tierColor('gold')).toBe(tokens.color.medalGold);
    expect(tierColor('silver')).toBe(tokens.color.medalSilver);
    expect(tierColor('bronze')).toBe(tokens.color.medalBronze);
  });

  it('has no colour for an achievement that was not earned', () => {
    // The API spells it 'none'; the screens spell it null or undefined.
    expect(tierColor('none')).toBeNull();
    expect(tierColor(null)).toBeNull();
    expect(tierColor(undefined)).toBeNull();
  });

  it('gives the three tiers three different colours', () => {
    const colors = new Set([tierColor('gold'), tierColor('silver'), tierColor('bronze')]);
    expect(colors.size).toBe(3);
  });
});

describe('the glyphs the badges draw', () => {
  it('draws a trophy whose cup can be filled and whose handles cannot', () => {
    // The cup is the first path and is closed (ends in z), so filling it
    // gives a solid trophy; the handles and stem are open and stay stroked.
    expect(ICONS.trophy[0].trim().endsWith('z')).toBe(true);
    expect(ICONS.trophy.length).toBeGreaterThan(1);
  });

  it('draws a medal as a disc and a ribbon, both of which fill', () => {
    // The disc is explicitly closed; the ribbon is left open because `fill`
    // closes a subpath implicitly, which is what the medal has always relied
    // on. Both are filled together, unlike the trophy.
    expect(ICONS.medal).toHaveLength(2);
    expect(ICONS.medal[0].trim().endsWith('z')).toBe(true);
  });

  it('keeps the trophy and the medal as two distinct drawings', () => {
    expect(ICONS.trophy).not.toEqual(ICONS.medal);
  });
});
