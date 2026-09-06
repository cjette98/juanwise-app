import { describe, expect, it } from 'vitest';
import { tokens, categoryColor } from './tokens';

describe('legibility floor', () => {
  it('has no type style below 11.5px', () => {
    for (const [name, style] of Object.entries(tokens.type)) {
      expect(style.fontSize, `${name} is below the floor`).toBeGreaterThanOrEqual(11.5);
    }
  });

  it('sets body copy at 15px or above', () => {
    expect(tokens.type.body.fontSize).toBeGreaterThanOrEqual(15);
  });

  it('gives every type style an explicit line height and family', () => {
    for (const [name, style] of Object.entries(tokens.type)) {
      expect(style.lineHeight, `${name} has no lineHeight`).toBeGreaterThan(style.fontSize);
      expect(style.fontFamily, `${name} has no fontFamily`).toBeTruthy();
    }
  });
});

describe('tap target floor', () => {
  it('keeps icon buttons at 46 and primary actions at 56', () => {
    expect(tokens.hit.min).toBe(46);
    expect(tokens.hit.primary).toBe(56);
    expect(tokens.hit.primary).toBeGreaterThanOrEqual(tokens.hit.min);
  });
});

describe('categoryColor', () => {
  it('returns the published colour for each of the six categories', () => {
    // These must stay identical to src/shared/content/category-meta.ts — the
    // leaderboard and results screens read that file directly.
    expect(categoryColor('history').base).toBe('#2E6FB8');
    expect(categoryColor('culture').base).toBe('#C9631D');
    expect(categoryColor('geography').base).toBe('#3E9E4F');
    expect(categoryColor('festival').base).toBe('#B84FA0');
    expect(categoryColor('national').base).toBe('#C4304A');
    expect(categoryColor('heroes').base).toBe('#8A5A2B');
  });

  it('falls back to the heroes brown for an unknown key', () => {
    expect(categoryColor('nonsense').base).toBe('#8A5A2B');
  });

  it('gives every category a darker shade for button shadows', () => {
    for (const key of ['history', 'culture', 'geography', 'festival', 'national', 'heroes']) {
      const { base, dark } = categoryColor(key);
      expect(dark).not.toBe(base);
      expect(dark).toMatch(/^#[0-9A-F]{6}$/i);
    }
  });
});
