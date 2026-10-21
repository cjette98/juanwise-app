import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

import { DEFAULT_SOUND_PREFS, SOUND_PREFS_KEY, parseSoundPrefs, type SoundPrefs } from './sound-prefs';

export type SfxName = 'correct' | 'wrong' | 'complete' | 'snap' | 'tap';

const MUSIC_VOLUME = 0.25;
const DUCKED_VOLUME = 0.08;

const MUSIC_SOURCE = require('../../../assets/sounds/background-music-loop.m4a');

// `ms` is the clip length, used to bring the music back up once the effect is done.
const SFX: Record<SfxName, { source: number; ms: number }> = {
  correct: { source: require('../../../assets/sounds/sfx-correct.m4a'), ms: 3000 },
  wrong: { source: require('../../../assets/sounds/sfx-wrong.m4a'), ms: 2200 },
  complete: { source: require('../../../assets/sounds/sfx-complete.m4a'), ms: 4500 },
  snap: { source: require('../../../assets/sounds/sfx-snap.m4a'), ms: 1500 },
  tap: { source: require('../../../assets/sounds/sfx-tap.m4a'), ms: 600 },
};

type SoundContextType = {
  prefs: SoundPrefs;
  setMusic: (on: boolean) => void;
  setEffects: (on: boolean) => void;
  playSfx: (name: SfxName) => void;
};

const SoundContext = createContext<SoundContextType | undefined>(undefined);

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<SoundPrefs>(DEFAULT_SOUND_PREFS);
  const [loaded, setLoaded] = useState(false);
  const [active, setActive] = useState(AppState.currentState === 'active');

  const musicRef = useRef<AudioPlayer | null>(null);
  const sfxRef = useRef<Partial<Record<SfxName, AudioPlayer>>>({});
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;
  // Effects can overlap; the music stays ducked until the last one is done.
  const duckCount = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    // Respect the iOS silent switch: music and effects are never forced through it.
    setAudioModeAsync({ playsInSilentMode: false }).catch((e) => console.warn('sound: failed to set audio mode', e));

    try {
      const music = createAudioPlayer(MUSIC_SOURCE);
      music.loop = true;
      music.volume = MUSIC_VOLUME;
      musicRef.current = music;
      for (const name of Object.keys(SFX) as SfxName[]) {
        sfxRef.current[name] = createAudioPlayer(SFX[name].source);
      }
    } catch (e) {
      console.warn('sound: failed to create players', e);
    }

    let cancelled = false;
    AsyncStorage.getItem(SOUND_PREFS_KEY)
      .then((raw) => {
        if (!cancelled) setPrefs(parseSoundPrefs(raw));
      })
      .catch((e) => console.warn('sound: failed to read prefs', e))
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });

    const sub = AppState.addEventListener('change', (state) => setActive(state === 'active'));

    return () => {
      cancelled = true;
      sub.remove();
      timers.current.forEach(clearTimeout);
      timers.current = [];
      try {
        musicRef.current?.remove();
        Object.values(sfxRef.current).forEach((p) => p?.remove());
      } catch (e) {
        console.warn('sound: failed to release players', e);
      }
      musicRef.current = null;
      sfxRef.current = {};
    };
  }, []);

  // Music plays only once the saved choice is known (so an "off" user never hears
  // a blip on launch), and pauses whenever the app leaves the foreground.
  useEffect(() => {
    const music = musicRef.current;
    if (!music || !loaded) return;
    try {
      if (prefs.music && active) music.play();
      else music.pause();
    } catch (e) {
      console.warn('sound: failed to toggle music', e);
    }
  }, [loaded, prefs.music, active]);

  const persist = useCallback((next: SoundPrefs) => {
    setPrefs(next);
    AsyncStorage.setItem(SOUND_PREFS_KEY, JSON.stringify(next)).catch((e) =>
      console.warn('sound: failed to save prefs', e),
    );
  }, []);

  const setMusic = useCallback((on: boolean) => persist({ ...prefsRef.current, music: on }), [persist]);
  const setEffects = useCallback((on: boolean) => persist({ ...prefsRef.current, effects: on }), [persist]);

  const playSfx = useCallback((name: SfxName) => {
    if (!prefsRef.current.effects) return;
    const player = sfxRef.current[name];
    if (!player) return;
    try {
      const music = musicRef.current;
      if (music) music.volume = DUCKED_VOLUME;
      duckCount.current += 1;
      player.seekTo(0).catch(() => {});
      player.play();
      const timer = setTimeout(() => {
        timers.current = timers.current.filter((t) => t !== timer);
        duckCount.current = Math.max(0, duckCount.current - 1);
        if (duckCount.current === 0 && musicRef.current) musicRef.current.volume = MUSIC_VOLUME;
      }, SFX[name].ms);
      timers.current.push(timer);
    } catch (e) {
      console.warn(`sound: failed to play ${name}`, e);
    }
  }, []);

  const value = useMemo(() => ({ prefs, setMusic, setEffects, playSfx }), [prefs, setMusic, setEffects, playSfx]);

  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
}

export function useSound() {
  const ctx = useContext(SoundContext);
  if (!ctx) throw new Error('useSound must be used within SoundProvider');
  return ctx;
}
