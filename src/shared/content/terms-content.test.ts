import { describe, expect, it } from 'vitest';
import { termsContent } from './terms-content';

/**
 * The client replaced the Terms and Conditions (Adjustment 3, item 10). These
 * pin the facts the old copy got wrong, in both languages, so the terms cannot
 * drift from the game again.
 */
describe('terms content', () => {
  it('has the same sections in English and Tagalog', () => {
    expect(Object.keys(termsContent.tl).sort()).toEqual(Object.keys(termsContent.en).sort());
    for (const value of [...Object.values(termsContent.en), ...Object.values(termsContent.tl)]) {
      expect(value.trim()).not.toBe('');
    }
  });

  it('states the real game structure in English', () => {
    const body = termsContent.en.mechanicsBody;
    // The names the app shows on the category cards.
    expect(body).toContain('History, Culture & Tradition, Geography, Festival Arts, National Symbols, and Filipino Heroes');
    expect(body).toContain('6 activities');
    expect(body).toContain('60 seconds');
    expect(body).toContain('6 pieces (2x3 grid)');
    expect(body).toContain('9 pieces (3x3 grid)');
    expect(body).toContain('12 pieces (3x4 grid)');
    expect(body).toContain('15 points');
  });

  it('states the real game structure in Tagalog', () => {
    const body = termsContent.tl.mechanicsBody;
    expect(body).toContain('Kasaysayan, Kultura at Tradisyon, Heograpiya, Pista at Sining, Pambansang Sagisag, at Mga Bayaning Pilipino');
    expect(body).toContain('60 segundo');
    expect(body).toContain('6 piraso (2x3)');
    expect(body).toContain('9 piraso (3x3)');
    expect(body).toContain('12 piraso (3x4)');
    expect(body).toContain('15 puntos');
  });

  it('drops what the game never had', () => {
    for (const lang of [termsContent.en, termsContent.tl]) {
      const all = Object.values(lang).join('\n').toLowerCase();
      expect(all).not.toContain('coins');
      expect(all).not.toContain('5-piece');
      expect(all).not.toContain('5-piraso');
      expect(all).not.toContain('5 questions');
      expect(all).not.toContain('5 tanong');
    }
  });

  it('has rules for main admins (developers) on the web', () => {
    expect(termsContent.en.mainAdminRulesTitle).toContain('MAIN ADMINS');
    expect(termsContent.en.mainAdminRules).toContain('Delete unused accounts, packs and classes');
    expect(termsContent.tl.mainAdminRules.length).toBeGreaterThan(0);
  });
});
