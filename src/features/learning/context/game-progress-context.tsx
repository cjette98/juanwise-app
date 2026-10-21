import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { progressApi, readCache, writeCache, type ApiProgressTrack } from '@/shared/api';
import { useUser } from '@/features/auth/context/user-context';
import { useClass } from '@/features/teacher/context/class-context';
import { useStudentResults } from '@/features/results/context/student-results-context';
import { applyAttemptToTrack, type LocalTrack } from '../lib/attempt-rules';

/**
 * Unlock state, now owned by the server.
 *
 * The unlock rule — all 6 activities in a level, passed or out of attempts, open the next, capped at 5 —
 * lives in juanwise-be `progress.repository.ts`, so it cannot be tampered with
 * client-side, and progress survives a reinstall or a change of device.
 *
 * Reads stay synchronous against a local mirror of the fetched tracks: the
 * Level Map and Activity List render straight from it, exactly as they did when
 * this was in-memory React state.
 */
const ACTIVITIES_PER_LEVEL = 6;
const PROGRESS_CACHE_KEY = 'progress';

type TrackKey = string; // `${category}_${activityType}`

type TrackMap = Record<TrackKey, LocalTrack>;

const makeKey = (category: string, activityType: string): TrackKey => `${category}_${activityType}`;

/** `"3_4"` (level 3, activity 4) → global id 16. */
function toGlobalId(slot: string): number | null {
  const [level, activityNum] = slot.split('_').map(Number);
  if (!Number.isFinite(level) || !Number.isFinite(activityNum)) return null;
  return (level - 1) * ACTIVITIES_PER_LEVEL + activityNum;
}

function toAttempts(raw: Record<string, number>): Record<number, number> {
  const out: Record<number, number> = {};
  for (const [slot, used] of Object.entries(raw)) {
    const id = toGlobalId(slot);
    if (id !== null) out[id] = used;
  }
  return out;
}

function toLocal(tracks: ApiProgressTrack[]): TrackMap {
  const out: TrackMap = {};
  for (const track of tracks) {
    out[makeKey(track.category, track.activityType)] = {
      unlockedLevel: track.unlockedLevel,
      completed: track.completedActivities.map(toGlobalId).filter((id): id is number => id !== null),
      failed: track.failedActivities.map(toGlobalId).filter((id): id is number => id !== null),
      exhausted: (track.exhaustedActivities ?? []).map(toGlobalId).filter((id): id is number => id !== null),
      attempts: toAttempts(track.attempts ?? {}),
    };
  }
  return out;
}

const EMPTY_TRACK: LocalTrack = { unlockedLevel: 1, completed: [], failed: [], exhausted: [], attempts: {} };

type GameProgressContextType = {
  ready: boolean;
  /** Completed activity ids within `level`, as the Activity List expects. */
  getProgress: (categoryKey: string, activityType: string, level: number) => number[];
  /** Attempted-but-not-yet-passed ids within `level` — the red cards. */
  getFailed: (categoryKey: string, activityType: string, level: number) => number[];
  /** Out-of-attempts ids within `level` — locked cards that still count toward the 6. */
  getExhausted: (categoryKey: string, activityType: string, level: number) => number[];
  /** Attempts already used on one activity (0-3). */
  getAttemptsUsed: (categoryKey: string, activityType: string, level: number, activityNum: number) => number;
  isLevelUnlocked: (categoryKey: string, activityType: string, level: number) => boolean;
  unlockedLevel: (categoryKey: string, activityType: string) => number;
  /** Applies a finished attempt locally, then reconciles with the server in the background. */
  recordOutcome: (
    categoryKey: string,
    activityType: string,
    level: number,
    activityNum: number,
    passed: boolean,
    attemptSeq: number,
    options?: { queued?: boolean },
  ) => void;
  refresh: () => Promise<void>;
};

const GameProgressContext = createContext<GameProgressContextType | undefined>(undefined);

export function GameProgressProvider({ children }: { children: React.ReactNode }) {
  const { signedIn, ready: userReady, uid } = useUser();
  const { classId } = useClass();
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
      const { tracks: apiTracks } = await progressApi.get(undefined, classId ?? undefined);
      if (!mounted.current) return;
      const local = toLocal(apiTracks);
      setTracks(local);
      writeCache(`${PROGRESS_CACHE_KEY}:${uid}`, local);
    } catch (e) {
      // Keep the cached tracks on screen; a wrong "locked" beats a crash.
      console.warn('progress: refresh failed', e);
    }
  }, [signedIn, uid, classId]);

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

  // Queued offline attempts reached the server (or were refused) and nothing is
  // still queued, so server progress is now complete — adopt it. Skipped while
  // anything is queued, since that refresh would wipe the optimistic attempts.
  const { outboxSettledVersion } = useStudentResults();
  useEffect(() => {
    if (outboxSettledVersion) void refresh();
  }, [outboxSettledVersion, refresh]);

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

  const getExhausted: GameProgressContextType['getExhausted'] = useCallback(
    (categoryKey, activityType, level) => inLevel(trackFor(categoryKey, activityType).exhausted, level),
    [trackFor],
  );

  const getAttemptsUsed: GameProgressContextType['getAttemptsUsed'] = useCallback(
    (categoryKey, activityType, level, activityNum) =>
      trackFor(categoryKey, activityType).attempts[(level - 1) * ACTIVITIES_PER_LEVEL + activityNum] ?? 0,
    [trackFor],
  );

  /**
   * `POST /results` already advanced progress on the server, so this only
   * mirrors the rule locally for an instant Activity List, then refreshes.
   */
  const recordOutcome: GameProgressContextType['recordOutcome'] = useCallback(
    (categoryKey, activityType, level, activityNum, passed, attemptSeq, options) => {
      const key = makeKey(categoryKey, activityType);
      setTracks((prev) => {
        const next = {
          ...prev,
          [key]: applyAttemptToTrack(prev[key] ?? EMPTY_TRACK, level, activityNum, passed, attemptSeq),
        };
        writeCache(`${PROGRESS_CACHE_KEY}:${uid}`, next);
        return next;
      });
      // A queued attempt is not on the server yet; a refresh that beat the
      // outbox would replace the optimistic track with state missing it.
      if (!options?.queued) void refresh();
    },
    [uid, refresh],
  );

  const value = useMemo<GameProgressContextType>(
    () => ({
      ready,
      getProgress,
      getFailed,
      isLevelUnlocked,
      getExhausted,
      getAttemptsUsed,
      unlockedLevel,
      recordOutcome,
      refresh,
    }),
    [ready, getProgress, getFailed, getExhausted, getAttemptsUsed, isLevelUnlocked, unlockedLevel, recordOutcome, refresh],
  );

  return <GameProgressContext.Provider value={value}>{children}</GameProgressContext.Provider>;
}

export function useGameProgress() {
  const context = useContext(GameProgressContext);
  if (!context) throw new Error('useGameProgress must be used within GameProgressProvider');
  return context;
}
