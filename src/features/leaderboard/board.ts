// ─── Leaderboard rows as the server ranked them (Adjustment 3, items 6–8) ────
// The server ranks every board (juanwise-be `results/scoring.ts`):
// - Points board (quiz): points, then less total time, then fewer failed or
//   timed-out attempts.
// - Time board (jigsaw): average time per completed activity, then more
//   points, then fewer failed or timed-out attempts.
// - Players tied on every step share a rank (1, 1, 3).
// The app shows that order and those ranks as they come. It never re-sorts,
// so the phone, the admin web and Performance Progression agree.
//
// Pure on purpose (no React, no Expo), so it can be unit-tested.

import type { ApiLeaderboardBoard, ApiPace, ApiStudentSummary, ApiTrophy } from '@/shared/api/types';

export type Board = ApiLeaderboardBoard;

/** A leaderboard item as it arrives; older servers omit the Adjustment 3 fields. */
export type ApiBoardItem = ApiStudentSummary & { rank?: number };

export interface BoardRow {
  uid: string;
  studentName: string;
  rank: number;
  totalPoints: number;
  totalTimeSec: number;
  completed: number;
  /** Mean seconds per completed activity; null before the first one. */
  avgTimeSec: number | null;
  /** Failed or timed-out attempts; null when the server does not report them. */
  failedAttempts: number | null;
  avgStars: number;
  trophy: ApiTrophy;
  pace: ApiPace;
}

export function boardForType(activityType: 'quiz' | 'jigsaw'): Board {
  return activityType === 'jigsaw' ? 'time' : 'points';
}

export function toBoardRows(items: ApiBoardItem[]): BoardRow[] {
  return items.map((item, i) => {
    const completed = item.activitiesCompleted;
    const stars = item.goldMedals * 3 + item.silverMedals * 2 + item.bronzeMedals;
    const avgTimeSec =
      item.avgTimeSec !== undefined
        ? item.avgTimeSec
        : completed > 0
          ? Math.round((item.totalTimeSec / completed) * 10) / 10
          : null;
    return {
      uid: item.uid,
      studentName: item.studentName,
      rank: item.rank ?? i + 1,
      totalPoints: item.totalPoints,
      totalTimeSec: item.totalTimeSec,
      completed,
      avgTimeSec,
      failedAttempts: item.failedAttempts ?? null,
      avgStars: completed > 0 ? stars / completed : 0,
      trophy: item.trophy,
      pace: item.pace,
    };
  });
}

/** True when the row at `index` shares its rank with the row before or after it. */
export function isTiedAt(rows: BoardRow[], index: number): boolean {
  const rank = rows[index]?.rank;
  if (rank === undefined) return false;
  return rows[index - 1]?.rank === rank || rows[index + 1]?.rank === rank;
}

export function findMine(rows: BoardRow[], uid: string | null | undefined): BoardRow | null {
  if (!uid) return null;
  return rows.find((r) => r.uid === uid) ?? null;
}
