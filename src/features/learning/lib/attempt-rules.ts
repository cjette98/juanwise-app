/**
 * Pure attempt rules, mirroring juanwise-be `progress-rules.ts` and
 * `attempt-points.ts` so the Activity List can react the instant an attempt
 * ends. The server stays the authority; `refresh()` reconciles afterwards.
 */
export const MAX_ATTEMPTS = 3;
export const ATTEMPT_POINT_SHARES = [1, 0.7, 0.4] as const;

const POINTS_PER_ACTIVITY = 15;
const ACTIVITIES_PER_LEVEL = 6;
const MAX_LEVEL = 5;

/** 15 / 10 / 6 for attempts 1-3; anything outside that range pays nothing. */
export function pointsForAttempt(attemptSeq: number): number {
  if (!Number.isInteger(attemptSeq) || attemptSeq < 1 || attemptSeq > MAX_ATTEMPTS) return 0;
  return Math.floor(POINTS_PER_ACTIVITY * ATTEMPT_POINT_SHARES[attemptSeq - 1]);
}

export type SlotStatus = 'open' | 'passed' | 'exhausted';

export function slotStatus(passed: boolean, attemptsUsed: number): SlotStatus {
  if (passed) return 'passed';
  return attemptsUsed >= MAX_ATTEMPTS ? 'exhausted' : 'open';
}

export function triesLeft(attemptsUsed: number): number {
  return Math.max(0, MAX_ATTEMPTS - attemptsUsed);
}

interface SlotKey {
  category: string;
  activityType: string;
  level: number;
  activityNum: number;
}

/** The attempt number the next try on `slot` will be: matching rows (cached or pending) + 1. */
export function nextAttemptSeq(existing: SlotKey[], slot: SlotKey): number {
  const used = existing.filter(
    (r) =>
      r.category === slot.category &&
      r.activityType === slot.activityType &&
      r.level === slot.level &&
      r.activityNum === slot.activityNum,
  ).length;
  return used + 1;
}

export interface LocalTrack {
  unlockedLevel: number;
  /** Global activity ids: `(level - 1) * 6 + activityNum`. */
  completed: number[];
  failed: number[];
  /** Subset of failed: all attempts used, never passed. */
  exhausted: number[];
  /** global id -> attempts used */
  attempts: Record<number, number>;
}

const levelOf = (id: number) => Math.ceil(id / ACTIVITIES_PER_LEVEL);

export function applyAttemptToTrack(
  track: LocalTrack,
  level: number,
  activityNum: number,
  passed: boolean,
  attemptSeq: number,
): LocalTrack {
  const id = (level - 1) * ACTIVITIES_PER_LEVEL + activityNum;
  let completed = track.completed;
  let failed = track.failed;
  let exhausted = track.exhausted;

  if (passed) {
    if (!completed.includes(id)) completed = [...completed, id];
    failed = failed.filter((x) => x !== id);
    exhausted = exhausted.filter((x) => x !== id);
  } else if (!completed.includes(id)) {
    // A failed retry never revokes a pass that was already earned.
    if (!failed.includes(id)) failed = [...failed, id];
    if (attemptSeq >= MAX_ATTEMPTS && !exhausted.includes(id)) exhausted = [...exhausted, id];
  }

  // Walk up from level 1 while every slot is completed or exhausted.
  const finished = new Set([...completed, ...exhausted]);
  const perLevel = new Map<number, number>();
  for (const fid of finished) perLevel.set(levelOf(fid), (perLevel.get(levelOf(fid)) ?? 0) + 1);

  let unlocked = 1;
  while (unlocked < MAX_LEVEL && (perLevel.get(unlocked) ?? 0) >= ACTIVITIES_PER_LEVEL) unlocked += 1;
  unlocked = Math.min(Math.max(unlocked, track.unlockedLevel), MAX_LEVEL);

  return {
    unlockedLevel: unlocked,
    completed,
    failed,
    exhausted,
    attempts: { ...track.attempts, [id]: Math.max(track.attempts[id] ?? 0, attemptSeq) },
  };
}
