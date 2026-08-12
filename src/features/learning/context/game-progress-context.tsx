import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  progressApi,
  readCache,
  writeCache,
  type ApiActivityType,
  type ApiCategoryKey,
  type ApiProgressTrack,
} from '@/shared/api';
import { useUser } from '@/features/auth/context/user-context';

/**
 * Unlock state, now owned by the server.
 *
 * The unlock rule — all 6 activities in a level open the next, capped at 5 —
 * lives in juanwise-be `progress.repository.ts`, so it cannot be tampered with
 * client-side, and progress survives a reinstall or a change of device.
 *
 * Reads stay synchronous against a local mirror of the fetched tracks: the
 * Level Map and Activity List render straight from it, exactly as they did when
 * this was in-memory React state.
 */
const ACTIVITIES_PER_LEVEL = 6;
const MAX_LEVEL = 5;
const PROGRESS_CACHE_KEY = 'progress';

type TrackKey = string; // `${category}_${activityType}`

interface LocalTrack {
  unlockedLevel: number;
  /** Global activity ids: `(level - 1) * 6 + activityNum`. */
  completed: number[];
  failed: number[];
}

type TrackMap = Record<TrackKey, LocalTrack>;

const makeKey = (category: string, activityType: string): TrackKey => `${category}_${activityType}`;

/** `"3_4"` (level 3, activity 4) → global id 16. */
function toGlobalId(slot: string): number | null {
  const [level, activityNum] = slot.split('_').map(Number);
  if (!Number.isFinite(level) || !Number.isFinite(activityNum)) return null;
  return (level - 1) * ACTIVITIES_PER_LEVEL + activityNum;
}

function toLocal(tracks: ApiProgressTrack[]): TrackMap {
  const out: TrackMap = {};
  for (const track of tracks) {
    out[makeKey(track.category, track.activityType)] = {
      unlockedLevel: track.unlockedLevel,
      completed: track.completedActivities.map(toGlobalId).filter((id): id is number => id !== null),
      failed: track.failedActivities.map(toGlobalId).filter((id): id is number => id !== null),
    };
  }
  return out;
}

const EMPTY_TRACK: LocalTrack = { unlockedLevel: 1, completed: [], failed: [] };

type GameProgressContextType = {
  ready: boolean;
  /** Completed activity ids within `level`, as the Activity List expects. */
  getProgress: (categoryKey: string, activityType: string, level: number) => number[];
  /** Attempted-but-not-yet-passed ids within `level` — the red cards. */
  getFailed: (categoryKey: string, activityType: string, level: number) => number[];
  isLevelUnlocked: (categoryKey: string, activityType: string, level: number) => boolean;
  unlockedLevel: (categoryKey: string, activityType: string) => number;
  completeActivity: (categoryKey: string, activityType: string, level: number, activityNum: number) => Promise<void>;
  failActivity: (categoryKey: string, activityType: string, level: number, activityNum: number) => Promise<void>;
  refresh: () => Promise<void>;
};

const GameProgressContext = createContext<GameProgressContextType | undefined>(undefined);

export function GameProgressProvider({ children }: { children: React.ReactNode }) {
  const { signedIn, ready: userReady, uid } = useUser();
  const [tracks, setTracks] = useState<TrackMap>({});
  const [ready, setReady] = useState(false);
  const mounted = useRef(true);

  useEffect(() => () => { mounted.current = false; }, []);

  const refresh = useCallback(async () => {
    if (!signedIn) {
      setTracks({});
      return;
    }
    try {
      const { tracks: apiTracks } = await progressApi.get();
      if (!mounted.current) return;
      const local = toLocal(apiTracks);
      setTracks(local);
      writeCache(`${PROGRESS_CACHE_KEY}:${uid}`, local);
    } catch (e) {
      // Keep the cached tracks on screen; a wrong "locked" beats a crash.
      console.warn('progress: refresh failed', e);
    }
  }, [signedIn, uid]);

  useEffect(() => {
    if (!userReady) return;

    (async () => {
      if (!signedIn) {
        setTracks({});
        setReady(true);
        return;
      }
      const cached = await readCache<TrackMap>(`${PROGRESS_CACHE_KEY}:${uid}`);
      if (cached && mounted.current) setTracks(cached);
      await refresh();
      if (mounted.current) setReady(true);
    })();
  }, [userReady, signedIn, uid, refresh]);

  const trackFor = useCallback(
    (categoryKey: string, activityType: string) => tracks[makeKey(categoryKey, activityType)] ?? EMPTY_TRACK,
    [tracks],
  );

  const inLevel = (ids: number[], level: number) =>
    ids.filter((id) => Math.ceil(id / ACTIVITIES_PER_LEVEL) === level);

  const getProgress: GameProgressContextType['getProgress'] = useCallback(
    (categoryKey, activityType, level) => inLevel(trackFor(categoryKey, activityType).completed, level),
    [trackFor],
  );

  const getFailed: GameProgressContextType['getFailed'] = useCallback(
    (categoryKey, activityType, level) => inLevel(trackFor(categoryKey, activityType).failed, level),
    [trackFor],
  );

  const unlockedLevel: GameProgressContextType['unlockedLevel'] = useCallback(
    (categoryKey, activityType) => trackFor(categoryKey, activityType).unlockedLevel,
    [trackFor],
  );

  const isLevelUnlocked: GameProgressContextType['isLevelUnlocked'] = useCallback(
    (categoryKey, activityType, level) => level <= 1 || level <= trackFor(categoryKey, activityType).unlockedLevel,
    [trackFor],
  );

  /**
   * Applies the server's unlock rule locally so the Activity List updates the
   * instant an activity is finished, then reconciles with the server response.
   */
  const applyLocally = useCallback(
    (categoryKey: string, activityType: string, level: number, activityNum: number, outcome: 'completed' | 'failed') => {
      const key = makeKey(categoryKey, activityType);
      setTracks((prev) => {
        const entry = prev[key] ?? EMPTY_TRACK;
        const globalId = (level - 1) * ACTIVITIES_PER_LEVEL + activityNum;

        if (outcome === 'failed') {
          // A failed retry never revokes an unlock that was already earned.
          if (entry.completed.includes(globalId)) return prev;
          if (entry.failed.includes(globalId)) return prev;
          return { ...prev, [key]: { ...entry, failed: [...entry.failed, globalId] } };
        }

        const completed = entry.completed.includes(globalId)
          ? entry.completed
          : [...entry.completed, globalId];
        const failed = entry.failed.filter((id) => id !== globalId);
        const doneInLevel = inLevel(completed, level).length;
        const unlocked =
          doneInLevel >= ACTIVITIES_PER_LEVEL && level >= entry.unlockedLevel
            ? Math.min(level + 1, MAX_LEVEL)
            : entry.unlockedLevel;

        return { ...prev, [key]: { unlockedLevel: unlocked, completed, failed } };
      });
    },
    [],
  );

  const mark = useCallback(
    async (
      categoryKey: string,
      activityType: string,
      level: number,
      activityNum: number,
      outcome: 'completed' | 'failed',
    ) => {
      applyLocally(categoryKey, activityType, level, activityNum, outcome);

      const payload = {
        category: categoryKey as ApiCategoryKey,
        activityType: activityType as ApiActivityType,
        level,
        activityNum,
      };

      try {
        const track = outcome === 'completed'
          ? await progressApi.complete(payload)
          : await progressApi.fail(payload);
        if (!mounted.current) return;
        setTracks((prev) => {
          const next = { ...prev, ...toLocal([track]) };
          writeCache(`${PROGRESS_CACHE_KEY}:${uid}`, next);
          return next;
        });
      } catch (e) {
        // Safe to swallow: `POST /results` advances progress server-side too, and
        // a queued result replays that write when the connection comes back.
        console.warn('progress: mark failed, will reconcile on next refresh', e);
      }
    },
    [applyLocally, uid],
  );

  const completeActivity: GameProgressContextType['completeActivity'] = useCallback(
    (categoryKey, activityType, level, activityNum) =>
      mark(categoryKey, activityType, level, activityNum, 'completed'),
    [mark],
  );

  const failActivity: GameProgressContextType['failActivity'] = useCallback(
    (categoryKey, activityType, level, activityNum) =>
      mark(categoryKey, activityType, level, activityNum, 'failed'),
    [mark],
  );

  const value = useMemo<GameProgressContextType>(
    () => ({
      ready,
      getProgress,
      getFailed,
      isLevelUnlocked,
      unlockedLevel,
      completeActivity,
      failActivity,
      refresh,
    }),
    [ready, getProgress, getFailed, isLevelUnlocked, unlockedLevel, completeActivity, failActivity, refresh],
  );

  return <GameProgressContext.Provider value={value}>{children}</GameProgressContext.Provider>;
}

export function useGameProgress() {
  const context = useContext(GameProgressContext);
  if (!context) throw new Error('useGameProgress must be used within GameProgressProvider');
  return context;
}
