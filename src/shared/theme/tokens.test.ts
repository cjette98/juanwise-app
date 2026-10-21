import { describe, expect, it } from 'vitest';
import {
  BASE_SCREEN_WIDTH,
  MAX_FONT_SCALE,
  MIN_FONT_SCALE,
  categoryColor,
  fontScaleFor,
  scaleTypeStyle,
  tokens,
} from './tokens';

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

describe('font scale', () => {
  it('draws the layouts at 1 on the width they were drawn for', () => {
    expect(fontScaleFor(BASE_SCREEN_WIDTH)).toBe(1);
  });

  it('shrinks on a small phone and grows on a tablet, within the clamp', () => {
    expect(fontScaleFor(320)).toBe(MIN_FONT_SCALE);
    expect(fontScaleFor(768)).toBe(MAX_FONT_SCALE);
    expect(fontScaleFor(412)).toBeCloseTo(412 / BASE_SCREEN_WIDTH, 5);
  });

  it('falls back to 1 when the width is not a usable number', () => {
    for (const width of [0, -320, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(fontScaleFor(width)).toBe(1);
    }
  });

  it('scales a style and its line height together, keeping the family', () => {
    const scaled = scaleTypeStyle(tokens.type.body, 1.1);
    expect(scaled.fontSize).toBe(16.5);
    expect(scaled.lineHeight).toBe(25.3);
    expect(scaled.fontFamily).toBe(tokens.type.body.fontFamily);
  });
});
