export type PrimaryActivityAction =
  | { kind: 'activity'; activityNum: number; label: string }
  | { kind: 'summary'; label: string };

export function getPrimaryActivityAction(
  completedActivityNumbers: number[],
  level: number,
): PrimaryActivityAction {
  const nextActivity = [1, 2, 3, 4, 5, 6].find(
    (activityNum) => !completedActivityNumbers.includes(activityNum),
  );

  if (nextActivity !== undefined) {
    return {
      kind: 'activity',
      activityNum: nextActivity,
      label: `Continue Activity ${nextActivity}`,
    };
  }

  return { kind: 'summary', label: `Complete Level ${level}` };
}
