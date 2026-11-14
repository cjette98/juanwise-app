import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  ApiError,
  enqueueResult,
  errorMessage,
  flushOutbox,
  readCache,
  resultsApi,
  writeCache,
  type ApiActivityResult,
  type ApiActivityType,
  type ApiCategoryKey,
  type SubmitResultRequest,
} from '@/shared/api';
import { Medal } from '@/shared/components/activity-timer';
import { useUser } from '@/features/auth/context/user-context';
import { useClass } from '@/features/teacher/context/class-context';
import { deductionFor, nextAttemptSeq, scorePass } from '@/features/learning/lib/attempt-rules';
import { useLanguage } from '@/shared/i18n/language-context';
import { canonicalAttempts, inActiveClass } from '../lib/totals';

export { activitySlots, deductionOf, isPass, levelScore, netPoints, triesAt, totalsFor, type LevelScore, type Totals } from '../lib/totals';

import {
  ACTIVITIES_PER_LEVEL,
  CATEGORY_MAX_POINTS,
  COMBINED_MAX_POINTS,
  COMBINED_MAX_TIME_SECONDS,
  JIGSAW_MAX_POINTS,
  JIGSAW_MAX_TIME_SECONDS,
  JIGSAW_TIME_BUDGET_SECONDS,
  LEVELS_PER_TYPE,
  MIN_ACTIVITY_TIME_SECONDS,
  POINTS_PER_ACTIVITY,
  POINTS_PER_LEVEL,
  QUIZ_MAX_POINTS,
  QUIZ_MAX_TIME_SECONDS,
  QUIZ_TIME_BUDGET_SECONDS,
  TOTAL_QUIZ_ACTIVITIES,
  TROPHY_TIERS,
  type Trophy,
} from '../lib/game-limits';

// The game's limits and trophy tiers live in `lib/game-limits.ts` (pure, tested);
// they are re-exported here so existing imports keep working.
export {
  ACTIVITIES_PER_LEVEL,
  CATEGORY_MAX_POINTS,
  COMBINED_MAX_POINTS,
  COMBINED_MAX_TIME_SECONDS,
  JIGSAW_MAX_POINTS,
  JIGSAW_MAX_TIME_SECONDS,
  JIGSAW_TIME_BUDGET_SECONDS,
  LEVELS_PER_TYPE,
  MIN_ACTIVITY_TIME_SECONDS,
  POINTS_PER_ACTIVITY,
  POINTS_PER_LEVEL,
  QUIZ_MAX_POINTS,
  QUIZ_MAX_TIME_SECONDS,
  QUIZ_TIME_BUDGET_SECONDS,
  TOTAL_QUIZ_ACTIVITIES,
  TROPHY_TIERS,
};
export type { Trophy };
export { averageTriesToPass } from './performance-score';

/**
 * One canonical attempt per activity, by the server's rule: a pass beats a
 * failure, otherwise the latest attempt counts. See `lib/totals.ts`.
 */
export function getCanonicalAttempts(entries: ActivityResult[]): ActivityResult[] {
  return canonicalAttempts(entries);
}

const RESULTS_CACHE_KEY = 'results';

export interface ActivityResult {
  id: string;
  /** Firebase uid of the student who made the attempt. */
  uid: string;
  studentName: string;
  /** The class the student was in when they made it; null with no class. */
  classId: string | null;
  category: string;
  activityType: 'quiz' | 'jigsaw';
  level: number;
  activityNum: number;
  /** The API's `'none'` is normalised to `null` — a fail has no medal. */
  medal: Medal;
  points: number;
  timeUsed: number;
  timedOut: boolean;
  timestamp: number;
  correctCount?: number;
  requiredCount?: number;
  /** 1 for the first try, incremented on each retry. */
  attemptSeq: number;
  /** True while this attempt is queued locally and not yet accepted by the server. */
  pending?: boolean;
}

export function toActivityResult(api: ApiActivityResult): ActivityResult {
  return {
    id: api.id,
    uid: api.uid,
    studentName: api.studentName,
    classId: api.classId ?? null,
    category: api.category,
    activityType: api.activityType,
    level: api.level,
    activityNum: api.activityNum,
    medal: api.medal === 'none' ? null : api.medal,
    points: api.points,
    timeUsed: api.timeUsed,
    timedOut: api.timedOut,
    timestamp: Date.parse(api.createdAt) || Date.now(),
    correctCount: api.correctCount,
    requiredCount: api.requiredCount,
    attemptSeq: api.attemptSeq,
  };
}

export type LearnerPace = 'fast' | 'steady' | 'needs-support';

export interface ResultFilter {
  category?: string;
  activityType?: 'quiz' | 'jigsaw';
  level?: number;
}

export type ProgressionTrend = 'improving' | 'steady' | 'needs-support' | 'not-enough-data' | 'not-started';

export interface StudentProgression {
  uid: string;
  studentName: string;
  attempts: ActivityResult[];
  trend: ProgressionTrend;
  earlyAvgPoints: number;
  lateAvgPoints: number;
  earlyAvgTime: number;
  lateAvgTime: number;
  pointsDelta: number;
  timeDelta: number;
}

function medalToStars(medal: Medal): 0 | 1 | 2 | 3 {
  if (medal === 'gold') return 3;
  if (medal === 'silver') return 2;
  if (medal === 'bronze') return 1;
  return 0;
}

/** Stars shown after an attempt are derived from the medal the server awarded. */
export function starsForMedal(medal: Medal): 0 | 1 | 2 | 3 {
  return medalToStars(medal);
}

function matchesFilter(r: ActivityResult, filter?: ResultFilter) {
  if (!filter) return true;
  if (filter.category && r.category !== filter.category) return false;
  if (filter.activityType && r.activityType !== filter.activityType) return false;
  if (filter.level && r.level !== filter.level) return false;
  return true;
}

/** What a gameplay screen reports when an activity ends. */
export interface AttemptInput {
  category: string;
  activityType: 'quiz' | 'jigsaw';
  level: number;
  activityNum: number;
  /** Seconds spent; the server clamps this to the activity's time budget. */
  timeUsed: number;
  timedOut: boolean;
  /**
   * How many required answers were correct. Multiple-choice and jigsaw report
   * 1/1 for a pass and 0/1 for a fail; enumeration reports its real tally.
   */
  correctCount: number;
  requiredCount: number;
}

export interface SubmitOutcome {
  result: ActivityResult;
  /** True when the network was down and the attempt is queued for replay. */
  queued: boolean;
}

type StudentResultsContextType = {
  ready: boolean;
  results: ActivityResult[];
  /** Set when the last fetch failed and the screens are showing cached data. */
  error: string | null;
  /** Records the attempt and returns the server-scored result to display. */
  addResult: (attempt: AttemptInput) => Promise<SubmitOutcome>;
  /** Admin only — the API refuses an unscoped delete. */
  clearResults: () => Promise<{ success: boolean; message: string }>;
  refresh: () => Promise<void>;
  /**
   * Bumped whenever an outbox replay settled queued attempts and nothing is
   * left queued, i.e. the server now holds every attempt. The progress
   * provider refreshes on it, since a replay also advanced server progress.
   */
  outboxSettledVersion: number;
  getFilteredResults: (filter?: ResultFilter) => ActivityResult[];
  /** For a roster, computes each student's improvement trend by comparing
   *  their earliest attempts to their most recent ones (within an optional
   *  filter), matched on uid. Students with no attempts are included with
   *  trend: 'not-started' so non-participants are identifiable too. */
  getProgression: (roster: { uid: string; name: string }[], filter?: ResultFilter) => StudentProgression[];
};

const StudentResultsContext = createContext<StudentResultsContextType | undefined>(undefined);

export function StudentResultsProvider({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage();
  const { signedIn, ready: userReady, uid, role, name } = useUser();
  const { classId, ready: classReady } = useClass();

  // Everything fetched for this scope. Students get every class they were
  // ever in, so `results` below narrows it to the current one.
  const [fetched, setResults] = useState<ActivityResult[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outboxSettledVersion, setOutboxSettledVersion] = useState(0);
  const mounted = useRef(true);

  useEffect(() => () => { mounted.current = false; }, []);

  const isTeacher = role === 'teacher' || role === 'admin';

  // The class leaderboard ranks attempts made in the class, and the server
  // numbers attempts per class, so a student's history is scoped the same way:
  // the class they are in now, or their unassigned attempts with no class.
  // Teachers already fetch one class.
  const results = useMemo(
    () => (isTeacher ? fetched : inActiveClass(fetched, classId ?? null)),
    [fetched, isTeacher, classId],
  );

  // Students are pinned to their own results server-side; teachers must scope
  // by a class they own, so there is nothing to fetch before one exists.
  const scopeKey = isTeacher ? classId : uid;

  const store = useCallback(
    (rows: ActivityResult[]) => {
      setResults(rows);
      writeCache(`${RESULTS_CACHE_KEY}:${scopeKey}`, rows);
    },
    [scopeKey],
  );

  const refresh = useCallback(async () => {
    if (!signedIn || (isTeacher && !classId)) {
      setResults([]);
      return;
    }
    try {
      // Replay anything stranded by an earlier outage before reading back, so
      // the list the student sees already includes what they just earned.
      if (!isTeacher && uid) {
        const flushed = await flushOutbox(uid);
        if (flushed.settled && !flushed.remaining && mounted.current) setOutboxSettledVersion((v) => v + 1);
      }

      const rows = await resultsApi.listAll(isTeacher ? { classId: classId! } : {});
      if (!mounted.current) return;
      store(rows.map(toActivityResult).sort((a, b) => a.timestamp - b.timestamp));
      setError(null);
    } catch (err) {
      if (!mounted.current) return;
      setError(errorMessage(err, t('resultsLoadFailedMsg')));
    }
  }, [signedIn, isTeacher, classId, uid, store, t]);

  useEffect(() => {
    if (!userReady || !classReady) return;

    (async () => {
      if (!signedIn) {
        setResults([]);
        setReady(true);
        return;
      }
      const cached = await readCache<ActivityResult[]>(`${RESULTS_CACHE_KEY}:${scopeKey}`);
      if (cached && mounted.current) setResults(cached);
      await refresh();
      if (mounted.current) setReady(true);
    })();
  }, [userReady, classReady, signedIn, scopeKey, refresh]);

  const addResult: StudentResultsContextType['addResult'] = useCallback(
    async (attempt) => {
      const payload: SubmitResultRequest = {
        category: attempt.category as ApiCategoryKey,
        activityType: attempt.activityType as ApiActivityType,
        level: attempt.level,
        activityNum: attempt.activityNum,
        correctCount: Math.min(attempt.correctCount, attempt.requiredCount),
        requiredCount: Math.max(1, attempt.requiredCount),
        timeUsed: attempt.timeUsed,
        timedOut: attempt.timedOut,
      };

      // Mirror the server's rule so the student still sees the right outcome
      // offline: a pass is worth its time window, a failure its deduction.
      const queueOffline = async () => {
        if (uid) await enqueueResult(uid, payload);
        const optimistic = scoreLocally(attempt, uid, name, classId ?? null, nextAttemptSeq(results, attempt));
        if (mounted.current) {
          setResults((prev) => {
            const next = [...prev, optimistic];
            writeCache(`${RESULTS_CACHE_KEY}:${scopeKey}`, next);
            return next;
          });
        }
        return { result: optimistic, queued: true };
      };

      // Earlier offline attempts must reach the server first: it numbers
      // attempts in arrival order, so a live submit that overtook them would be
      // scored as the wrong try and push the queued ones past the cap.
      const flushed = uid ? await flushOutbox(uid) : { settled: 0, remaining: 0 };
      // The replay hit another outage: wait behind what is still queued.
      if (flushed.remaining) return queueOffline();

      // The replay replaced optimistic rows server-side: read them back, and
      // let progress pick up what the replay advanced.
      const syncAfterReplay = () => {
        if (!flushed.settled || !mounted.current) return;
        setOutboxSettledVersion((v) => v + 1);
        void refresh();
      };

      try {
        const recorded = toActivityResult(await resultsApi.submit(payload));
        if (mounted.current) {
          setResults((prev) => {
            const next = [...prev, recorded];
            writeCache(`${RESULTS_CACHE_KEY}:${scopeKey}`, next);
            return next;
          });
        }
        syncAfterReplay();
        return { result: recorded, queued: false };
      } catch (err) {
        // A rejected payload is a bug, not an outage — surface it rather than
        // queueing something the server will never accept.
        if (err instanceof ApiError && !err.isTransient) {
          syncAfterReplay();
          throw err;
        }
        return queueOffline();
      }
    },
    [uid, name, classId, scopeKey, results, refresh],
  );

  const clearResults: StudentResultsContextType['clearResults'] = useCallback(async () => {
    if (!classId) return { success: false, message: t('noClassSelectedMsg') };
    try {
      const { deleted } = await resultsApi.deleteMany({ classId });
      await refresh();
      return { success: true, message: t('resultsDeletedMsg', { count: deleted }) };
    } catch (err) {
      return {
        success: false,
        message: errorMessage(err, t('resultsDeleteFailedMsg')),
      };
    }
  }, [classId, refresh, t]);

  const getFilteredResults: StudentResultsContextType['getFilteredResults'] = useCallback(
    (filter) => results.filter((r) => matchesFilter(r, filter)),
    [results],
  );

  // Compares each student's earliest attempts against their most recent ones
  // (split in half by chronological order) to flag improvement. Students in
  // `studentNames` with zero matching attempts are still returned so a
  // teacher/admin can spot who hasn't participated at all.
  const getProgression: StudentResultsContextType['getProgression'] = useCallback(
    (roster, filter) => {
      const scoped = results.filter((r) => matchesFilter(r, filter));
      const byStudent = new Map<string, ActivityResult[]>();
      for (const r of scoped) {
        const list = byStudent.get(r.uid) || [];
        list.push(r);
        byStudent.set(r.uid, list);
      }

      // Include participants not on the roster too, e.g. a removed student.
      const names = new Map<string, string>(roster.map((m) => [m.uid, m.name]));
      for (const [uid, list] of byStudent) if (!names.has(uid)) names.set(uid, list[0]?.studentName ?? '');

      return Array.from(names, ([uid, studentName]) => {
        const attempts = (byStudent.get(uid) || []).slice().sort((a, b) => a.timestamp - b.timestamp);

        if (attempts.length === 0) {
          return {
            uid,
            studentName,
            attempts: [],
            trend: 'not-started' as ProgressionTrend,
            earlyAvgPoints: 0,
            lateAvgPoints: 0,
            earlyAvgTime: 0,
            lateAvgTime: 0,
            pointsDelta: 0,
            timeDelta: 0,
          };
        }

        if (attempts.length < 2) {
          return {
            uid,
            studentName,
            attempts,
            trend: 'not-enough-data' as ProgressionTrend,
            earlyAvgPoints: attempts[0].points,
            lateAvgPoints: attempts[0].points,
            earlyAvgTime: attempts[0].timeUsed,
            lateAvgTime: attempts[0].timeUsed,
            pointsDelta: 0,
            timeDelta: 0,
          };
        }

        const mid = Math.ceil(attempts.length / 2);
        const early = attempts.slice(0, mid);
        const late = attempts.slice(mid);
        const avg = (list: ActivityResult[], key: 'points' | 'timeUsed') =>
          list.reduce((sum, e) => sum + e[key], 0) / list.length;

        const earlyAvgPoints = avg(early, 'points');
        const lateAvgPoints = avg(late, 'points');
        const earlyAvgTime = avg(early, 'timeUsed');
        const lateAvgTime = avg(late, 'timeUsed');
        const pointsDelta = lateAvgPoints - earlyAvgPoints;
        const timeDelta = earlyAvgTime - lateAvgTime; // positive = getting faster

        let trend: ProgressionTrend = 'steady';
        if (pointsDelta > 2 || timeDelta > 2) trend = 'improving';
        else if (pointsDelta < -2 || timeDelta < -2) trend = 'needs-support';

        return { uid, studentName, attempts, trend, earlyAvgPoints, lateAvgPoints, earlyAvgTime, lateAvgTime, pointsDelta, timeDelta };
      });
    },
    [results],
  );

  const value = useMemo<StudentResultsContextType>(
    () => ({
      ready,
      results,
      error,
      addResult,
      clearResults,
      refresh,
      outboxSettledVersion,
      getFilteredResults,
      getProgression,
    }),
    [ready, results, error, addResult, clearResults, refresh, outboxSettledVersion, getFilteredResults, getProgression],
  );

  return <StudentResultsContext.Provider value={value}>{children}</StudentResultsContext.Provider>;
}

/**
 * Offline stand-in for `scoreAttempt` in juanwise-be `results/scoring.ts`. It
 * has to agree with the server, because the queued attempt will be re-scored
 * there and the local row replaced on the next refresh.
 */
function scoreLocally(
  attempt: AttemptInput,
  uid: string,
  studentName: string,
  classId: string | null,
  attemptSeq: number,
): ActivityResult {
  const budget = attempt.activityType === 'jigsaw' ? JIGSAW_TIME_BUDGET_SECONDS : QUIZ_TIME_BUDGET_SECONDS;
  const timeUsed = Math.max(MIN_ACTIVITY_TIME_SECONDS, Math.min(Math.round(attempt.timeUsed), budget));
  const passed = !attempt.timedOut && attempt.requiredCount > 0 && attempt.correctCount >= attempt.requiredCount;

  const score = passed ? scorePass(timeUsed) : { points: -deductionFor(attemptSeq), stars: 0 };
  const medal: Medal = score.stars === 3 ? 'gold' : score.stars === 2 ? 'silver' : score.stars === 1 ? 'bronze' : null;

  return {
    id: `pending-${uid}-${Date.now()}`,
    uid,
    studentName,
    classId,
    category: attempt.category,
    activityType: attempt.activityType,
    level: attempt.level,
    activityNum: attempt.activityNum,
    medal,
    points: score.points,
    timeUsed,
    timedOut: attempt.timedOut,
    timestamp: Date.now(),
    correctCount: attempt.correctCount,
    requiredCount: attempt.requiredCount,
    attemptSeq,
    pending: true,
  };
}

export function useStudentResults() {
  const context = useContext(StudentResultsContext);
  if (!context) throw new Error('useStudentResults must be used within StudentResultsProvider');
  return context;
}
