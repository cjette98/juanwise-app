export interface SoundPrefs {
  music: boolean;
  effects: boolean;
}

export const DEFAULT_SOUND_PREFS: SoundPrefs = { music: true, effects: true };

export const SOUND_PREFS_KEY = 'juanwise_sound_prefs_v1';

/** Reads the stored prefs; anything missing or malformed falls back to "on". */
export function parseSoundPrefs(raw: string | null): SoundPrefs {
  if (!raw) return { ...DEFAULT_SOUND_PREFS };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_SOUND_PREFS };
    const { music, effects } = parsed as Record<string, unknown>;
    return {
      music: typeof music === 'boolean' ? music : DEFAULT_SOUND_PREFS.music,
      effects: typeof effects === 'boolean' ? effects : DEFAULT_SOUND_PREFS.effects,
    };
  } catch {
    return { ...DEFAULT_SOUND_PREFS };
  }
}
