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

// ─── Scoring reference ───────────────────────────────────────────────────────
// Points and medals are now awarded by the server (juanwise-be
// `results/scoring.ts`) from what the client reports — correctCount,
// requiredCount, timeUsed and timedOut — so a modified payload cannot mint
// points. The ceilings below still describe the game and drive the trophy
// tiers, and they match `shared/constants.ts` on the backend exactly.
//
// Quiz:   15 pts max per activity, 60s budget,  6 activities/level, 5 levels → 450 pts / 1,800 sec
// Jigsaw: 15 pts max per activity, 120s budget, 6 activities/level, 5 levels → 450 pts / 3,600 sec
// Combined: 900 pts, 5,400 sec
export const POINTS_PER_ACTIVITY = 15;
export const ACTIVITIES_PER_LEVEL = 6;
export const LEVELS_PER_TYPE = 5;
export const POINTS_PER_LEVEL = POINTS_PER_ACTIVITY * ACTIVITIES_PER_LEVEL; // 90
export const QUIZ_MAX_POINTS = POINTS_PER_LEVEL * LEVELS_PER_TYPE; // 450
export const JIGSAW_MAX_POINTS = POINTS_PER_LEVEL * LEVELS_PER_TYPE; // 450
export const COMBINED_MAX_POINTS = QUIZ_MAX_POINTS + JIGSAW_MAX_POINTS; // 900
export const QUIZ_MAX_TIME_SECONDS = 60 * ACTIVITIES_PER_LEVEL * LEVELS_PER_TYPE; // 1,800
export const JIGSAW_MAX_TIME_SECONDS = 120 * ACTIVITIES_PER_LEVEL * LEVELS_PER_TYPE; // 3,600
export const COMBINED_MAX_TIME_SECONDS = QUIZ_MAX_TIME_SECONDS + JIGSAW_MAX_TIME_SECONDS; // 5,400
export const TOTAL_QUIZ_ACTIVITIES = ACTIVITIES_PER_LEVEL * LEVELS_PER_TYPE; // 30

export type Trophy = 'gold' | 'silver' | 'bronze' | null;

export const TROPHY_TIERS: { trophy: Exclude<Trophy, null>; label: string; minPoints: number; maxTimeSeconds: number; timeLabel: string }[] = [
  { trophy: 'gold', label: '🥇 Gold Trophy', minPoints: 450, maxTimeSeconds: 3600, timeLabel: '≤ 3,600 sec (60 mins)' },
  { trophy: 'silver', label: '🥈 Silver Trophy', minPoints: 300, maxTimeSeconds: 4500, timeLabel: '3,601–4,500 sec' },
  { trophy: 'bronze', label: '🥉 Bronze Trophy', minPoints: 150, maxTimeSeconds: 5400, timeLabel: '4,501–5,400 sec' },
];

function computeTrophy(totalPoints: number, totalTimeUsed: number): Trophy {
  for (const tier of TROPHY_TIERS) {
    if (totalPoints >= tier.minPoints && totalTimeUsed <= tier.maxTimeSeconds) return tier.trophy;
  }
  return null;
}

const canonicalKey = (r: ActivityResult) =>
  `${r.studentName}::${r.category}::${r.activityType}::${r.level}::${r.activityNum}`;

// Collapses repeated attempts on the same activity down to ONE canonical
// result per (student, category, type, level, activity#) — the latest
// PASSING attempt if the student ever passed it, otherwise their latest
// attempt (a fail/timeout, 0 points). Without this, retrying an activity
// multiple times would add its points/time again each time, inflating
// totals past the real possible max (900 pts / 5,400 sec combined).
export function getCanonicalAttempts(entries: ActivityResult[]): ActivityResult[] {
  const groups = new Map<string, ActivityResult[]>();
  for (const r of entries) {
    const list = groups.get(canonicalKey(r)) || [];
    list.push(r);
    groups.set(canonicalKey(r), list);
  }
  const canonical: ActivityResult[] = [];
  for (const list of groups.values()) {
    const sorted = [...list].sort((a, b) => a.timestamp - b.timestamp);
    const passed = [...sorted].reverse().find((r) => r.medal);
    canonical.push(passed || sorted[sorted.length - 1]);
  }
  return canonical;
}

const RESULTS_CACHE_KEY = 'results';

export interface ActivityResult {
  id: string;
  /** Firebase uid of the student who made the attempt. */
  uid: string;
  studentName: string;
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

export interface StudentSummary {
  studentName: string;
  attempts: number;
  totalPoints: number;
  totalTimeUsed: number;
  avgTimeUsed: number;
  fastestTimeUsed: number;
  timeOuts: number;
  pace: LearnerPace;
  trophy: Trophy;
  avgStars: number;
  quizCorrect: number;
  quizWrongOutOf30: number;
}

export interface ResultFilter {
  category?: string;
  activityType?: 'quiz' | 'jigsaw';
  level?: number;
}

export type ProgressionTrend = 'improving' | 'steady' | 'needs-support' | 'not-enough-data' | 'not-started';

export interface StudentProgression {
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

// Pure helper — groups a list of results by student and computes the same
// summary/pace stats used by both the global leaderboard and any filtered
// (per-category / per-level / per-activity-type) view.
function summarize(entries: ActivityResult[]): StudentSummary[] {
  // Dedupe FIRST — a retried activity must only ever count once, using its
  // best (passing) attempt, so totals can never exceed the real possible
  // max (900 pts / 5,400 sec combined).
  const canonical = getCanonicalAttempts(entries);

  const byStudent = new Map<string, ActivityResult[]>();
  for (const r of canonical) {
    const list = byStudent.get(r.studentName) || [];
    list.push(r);
    byStudent.set(r.studentName, list);
  }

  const summaries: StudentSummary[] = Array.from(byStudent.entries()).map(
    ([studentName, list]) => {
      const attempts = list.length;
      const totalPoints = list.reduce((sum, e) => sum + e.points, 0);
      const totalTimeUsed = list.reduce((sum, e) => sum + e.timeUsed, 0);
      const avgTimeUsed = totalTimeUsed / attempts;
      const fastestTimeUsed = Math.min(...list.map((e) => e.timeUsed));
      const timeOuts = list.filter((e) => e.timedOut).length;
      const quizList = list.filter((e) => e.activityType === 'quiz');
      const quizCorrect = quizList.filter((e) => e.medal).length;
      const quizWrongOutOf30 = TOTAL_QUIZ_ACTIVITIES - quizCorrect;
      const trophy = computeTrophy(totalPoints, totalTimeUsed);
      const avgStars = list.reduce((sum, e) => sum + medalToStars(e.medal), 0) / attempts;

      // Learner pace is DERIVED directly from the trophy tier — the same
      // points/time table drives Trophy AND Pace, so they always agree
      // instead of being two separate, possibly-conflicting metrics:
      //   🥇 Gold trophy   → 🚀 Fast Learner
      //   🥈 Silver trophy → 🚶 Steady/Normal Learner
      //   🥉 Bronze or none → 🐢 Needs Support
      let pace: LearnerPace = 'needs-support';
      if (trophy === 'gold') pace = 'fast';
      else if (trophy === 'silver') pace = 'steady';

      return {
        studentName,
        attempts,
        totalPoints,
        totalTimeUsed,
        avgTimeUsed,
        fastestTimeUsed,
        timeOuts,
        trophy,
        pace,
        avgStars,
        quizCorrect,
        quizWrongOutOf30,
      };
    }
  );

  // Fastest average time first (used when the UI sorts by speed).
  return summaries.sort((a, b) => a.avgTimeUsed - b.avgTimeUsed);
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
  leaderboard: StudentSummary[];
  /** Same ranking logic as `leaderboard`, but scoped to a category / game type / level
   *  so per-level, per-activity-type fast/slow rankings can be shown. */
  getLeaderboard: (filter?: ResultFilter) => StudentSummary[];
  getFilteredResults: (filter?: ResultFilter) => ActivityResult[];
  /** For a given roster of student names, computes each student's improvement
   *  trend by comparing their earliest attempts to their most recent ones
   *  (within an optional filter). Students with no attempts are included with
   *  trend: 'not-started' so non-participants are identifiable too. */
  getProgression: (studentNames: string[], filter?: ResultFilter) => StudentProgression[];
};

const StudentResultsContext = createContext<StudentResultsContextType | undefined>(undefined);

export function StudentResultsProvider({ children }: { children: React.ReactNode }) {
  const { signedIn, ready: userReady, uid, role, name } = useUser();
  const { classId, ready: classReady } = useClass();

  const [results, setResults] = useState<ActivityResult[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => () => { mounted.current = false; }, []);

  const isTeacher = role === 'teacher' || role === 'admin';
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
      if (!isTeacher && uid) await flushOutbox(uid);

      const rows = await resultsApi.listAll(isTeacher ? { classId: classId! } : {});
      if (!mounted.current) return;
      store(rows.map(toActivityResult).sort((a, b) => a.timestamp - b.timestamp));
      setError(null);
    } catch (err) {
      if (!mounted.current) return;
      setError(errorMessage(err, 'Could not load results.'));
    }
  }, [signedIn, isTeacher, classId, uid, store]);

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

      try {
        const recorded = toActivityResult(await resultsApi.submit(payload));
        if (mounted.current) {
          setResults((prev) => {
            const next = [...prev, recorded];
            writeCache(`${RESULTS_CACHE_KEY}:${scopeKey}`, next);
            return next;
          });
        }
        return { result: recorded, queued: false };
      } catch (err) {
        // A rejected payload is a bug, not an outage — surface it rather than
        // queueing something the server will never accept.
        if (err instanceof ApiError && !err.isTransient) throw err;

        if (uid) await enqueueResult(uid, payload);

        // Mirror the server's rule so the student still sees the right outcome
        // offline: a pass is worth full marks, medal by fraction of the budget.
        const optimistic = scoreLocally(attempt, uid, name);
        if (mounted.current) {
          setResults((prev) => {
            const next = [...prev, optimistic];
            writeCache(`${RESULTS_CACHE_KEY}:${scopeKey}`, next);
            return next;
          });
        }
        return { result: optimistic, queued: true };
      }
    },
    [uid, name, scopeKey],
  );

  const clearResults: StudentResultsContextType['clearResults'] = useCallback(async () => {
    if (!classId) return { success: false, message: 'Walang klaseng napili.' };
    try {
      const { deleted } = await resultsApi.deleteMany({ classId });
      await refresh();
      return { success: true, message: `Nabura ang ${deleted} na resulta.` };
    } catch (err) {
      return {
        success: false,
        message: errorMessage(err, 'Hindi nabura ang mga resulta.'),
      };
    }
  }, [classId, refresh]);

  const leaderboard = useMemo<StudentSummary[]>(() => summarize(results), [results]);

  const getFilteredResults: StudentResultsContextType['getFilteredResults'] = useCallback(
    (filter) => results.filter((r) => matchesFilter(r, filter)),
    [results],
  );

  const getLeaderboard: StudentResultsContextType['getLeaderboard'] = useCallback(
    (filter) => {
      if (!filter || (!filter.category && !filter.activityType && !filter.level)) return leaderboard;
      return summarize(results.filter((r) => matchesFilter(r, filter)));
    },
    [leaderboard, results],
  );

  // Compares each student's earliest attempts against their most recent ones
  // (split in half by chronological order) to flag improvement. Students in
  // `studentNames` with zero matching attempts are still returned so a
  // teacher/admin can spot who hasn't participated at all.
  const getProgression: StudentResultsContextType['getProgression'] = useCallback(
    (studentNames, filter) => {
      const scoped = results.filter((r) => matchesFilter(r, filter));
      const byStudent = new Map<string, ActivityResult[]>();
      for (const r of scoped) {
        const list = byStudent.get(r.studentName) || [];
        list.push(r);
        byStudent.set(r.studentName, list);
      }

      const names = new Set<string>(studentNames);
      for (const n of byStudent.keys()) names.add(n); // include participants not in roster too

      return Array.from(names).map((studentName) => {
        const attempts = (byStudent.get(studentName) || []).slice().sort((a, b) => a.timestamp - b.timestamp);

        if (attempts.length === 0) {
          return {
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

        return { studentName, attempts, trend, earlyAvgPoints, lateAvgPoints, earlyAvgTime, lateAvgTime, pointsDelta, timeDelta };
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
      leaderboard,
      getLeaderboard,
      getFilteredResults,
      getProgression,
    }),
    [ready, results, error, addResult, clearResults, refresh, leaderboard, getLeaderboard, getFilteredResults, getProgression],
  );

  return <StudentResultsContext.Provider value={value}>{children}</StudentResultsContext.Provider>;
}

/**
 * Offline stand-in for `scoreAttempt` in juanwise-be `results/scoring.ts`. It
 * has to agree with the server, because the queued attempt will be re-scored
 * there and the local row replaced on the next refresh.
 */
function scoreLocally(attempt: AttemptInput, uid: string, studentName: string): ActivityResult {
  const budget = attempt.activityType === 'jigsaw' ? 120 : 60;
  const timeUsed = Math.max(0, Math.min(Math.round(attempt.timeUsed), budget));
  const passed = !attempt.timedOut && attempt.requiredCount > 0 && attempt.correctCount >= attempt.requiredCount;

  const fraction = timeUsed / budget;
  const medal: Medal = !passed ? null : fraction <= 0.5 ? 'gold' : fraction <= 0.75 ? 'silver' : 'bronze';

  return {
    id: `pending-${uid}-${Date.now()}`,
    uid,
    studentName,
    category: attempt.category,
    activityType: attempt.activityType,
    level: attempt.level,
    activityNum: attempt.activityNum,
    medal,
    points: passed ? POINTS_PER_ACTIVITY : 0,
    timeUsed,
    timedOut: attempt.timedOut,
    timestamp: Date.now(),
    correctCount: attempt.correctCount,
    requiredCount: attempt.requiredCount,
    attemptSeq: 1,
    pending: true,
  };
}

export function useStudentResults() {
  const context = useContext(StudentResultsContext);
  if (!context) throw new Error('useStudentResults must be used within StudentResultsProvider');
  return context;
}
