import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Medal } from '@/shared/components/activity-timer';

// ─── Scoring reference (verified against ActivityPlayScreen / JigsawPuzzleScreen / ActivityTimer) ───
// Quiz:   15 pts max per activity, 60s time budget per activity, 6 activities/level, 5 levels
//         → 450 pts max, 1,800 sec max
// Jigsaw: 15 pts max per activity, 120s time budget per activity, 6 activities/level, 5 levels
//         → 450 pts max, 3,600 sec max
// Combined (Quiz + Jigsaw): 900 pts max, 5,400 sec max
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

const RESULTS_KEY = 'juanwise_student_results_v1';

export interface ActivityResult {
  id: string;
  studentName: string;
  category: string;
  activityType: 'quiz' | 'jigsaw';
  level: number;
  activityNum: number;
  medal: Medal;
  points: number;
  timeUsed: number;
  timedOut: boolean;
  timestamp: number;
  /** 'enumeration' activities only — how many of the required answers were correct on this attempt. */
  correctCount?: number;
  /** 'enumeration' activities only — how many correct answers were required to pass. */
  requiredCount?: number;
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

      // Learner pace is now DERIVED directly from the trophy tier — the
      // same points/time table drives Trophy AND Pace, so they always
      // agree instead of being two separate, possibly-conflicting metrics:
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

type StudentResultsContextType = {
  ready: boolean;
  results: ActivityResult[];
  addResult: (r: Omit<ActivityResult, 'id' | 'timestamp'>) => void;
  clearResults: () => void;
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
  const [results, setResults] = useState<ActivityResult[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(RESULTS_KEY);
        if (raw) setResults(JSON.parse(raw));
      } catch (e) {
        console.warn('StudentResultsContext: failed to load results', e);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const persist = (next: ActivityResult[]) => {
    setResults(next);
    AsyncStorage.setItem(RESULTS_KEY, JSON.stringify(next)).catch((e) =>
      console.warn('StudentResultsContext: failed to save results', e)
    );
  };

  const addResult: StudentResultsContextType['addResult'] = (r) => {
    const entry: ActivityResult = {
      ...r,
      id: `${r.studentName}-${Date.now()}-${Math.round(Math.random() * 1000)}`,
      timestamp: Date.now(),
    };
    persist([...results, entry]);
  };

  const clearResults = () => persist([]);

  // Group by student, then rank by average time-used (faster = "fast learner").
  // Uses simple top/bottom-third split so it still makes sense with a small class.
  const leaderboard = useMemo<StudentSummary[]>(() => summarize(results), [results]);

  const getFilteredResults: StudentResultsContextType['getFilteredResults'] = (filter) =>
    results.filter((r) => matchesFilter(r, filter));

  const getLeaderboard: StudentResultsContextType['getLeaderboard'] = (filter) => {
    if (!filter || (!filter.category && !filter.activityType && !filter.level)) return leaderboard;
    return summarize(results.filter((r) => matchesFilter(r, filter)));
  };

  // Compares each student's earliest attempts against their most recent ones
  // (split in half by chronological order) to flag improvement. Students in
  // `studentNames` with zero matching attempts are still returned so a
  // teacher/admin can spot who hasn't participated at all.
  const getProgression: StudentResultsContextType['getProgression'] = (studentNames, filter) => {
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
  };

  return (
    <StudentResultsContext.Provider
      value={{ ready, results, addResult, clearResults, leaderboard, getLeaderboard, getFilteredResults, getProgression }}
    >
      {children}
    </StudentResultsContext.Provider>
  );
}

export function useStudentResults() {
  const context = useContext(StudentResultsContext);
  if (!context) throw new Error('useStudentResults must be used within StudentResultsProvider');
  return context;
}