import { describe, expect, it } from 'vitest';
import { DEFAULT_SOUND_PREFS, parseSoundPrefs } from './sound-prefs';

describe('parseSoundPrefs', () => {
  it('returns the defaults when nothing is stored', () => {
    expect(parseSoundPrefs(null)).toEqual({ music: true, effects: true });
    expect(parseSoundPrefs(null)).toEqual(DEFAULT_SOUND_PREFS);
  });

  it('fills missing fields from the defaults', () => {
    expect(parseSoundPrefs('{"music":false}')).toEqual({ music: false, effects: true });
    expect(parseSoundPrefs('{"effects":false}')).toEqual({ music: true, effects: false });
  });

  it('reads both fields when present', () => {
    expect(parseSoundPrefs('{"music":false,"effects":false}')).toEqual({ music: false, effects: false });
  });

  it('falls back to the defaults on garbage', () => {
    expect(parseSoundPrefs('garbage')).toEqual(DEFAULT_SOUND_PREFS);
    expect(parseSoundPrefs('42')).toEqual(DEFAULT_SOUND_PREFS);
    expect(parseSoundPrefs('{"music":"no"}')).toEqual(DEFAULT_SOUND_PREFS);
  });
});
