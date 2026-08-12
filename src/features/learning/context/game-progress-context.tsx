import React, { createContext, useContext, useState } from 'react';

type ProgressState = {
  [key: string]: {
    unlockedLevel: number;
    completedActivities: number[];
    failedActivities: number[];
  };
};

type GameProgressContextType = {
  getProgress: (categoryKey: string, activityType: string, level: number) => number[];
  getFailed: (categoryKey: string, activityType: string, level: number) => number[];
  isLevelUnlocked: (categoryKey: string, activityType: string, level: number) => boolean;
  completeActivity: (categoryKey: string, activityType: string, level: number, activityNum: number) => void;
  failActivity: (categoryKey: string, activityType: string, level: number, activityNum: number) => void;
};

const GameProgressContext = createContext<GameProgressContextType | undefined>(undefined);

export function GameProgressProvider({ children }: { children: React.ReactNode }) {
  const [progress, setProgress] = useState<ProgressState>({});

  const makeKey = (categoryKey: string, activityType: string) => `${categoryKey}_${activityType}`;

  const getProgress = (categoryKey: string, activityType: string, level: number) => {
    const key = makeKey(categoryKey, activityType);
    const entry = progress[key];
    if (!entry) return [];
    return entry.completedActivities.filter((a) => Math.ceil(a / 6) === level);
  };

  // Activities the player has attempted and NOT yet passed (shown red on the
  // Activity List). An activity is removed from here the moment it's
  // completed correctly, so this only ever holds "still needs a retry" ids.
  const getFailed = (categoryKey: string, activityType: string, level: number) => {
    const key = makeKey(categoryKey, activityType);
    const entry = progress[key];
    if (!entry) return [];
    return entry.failedActivities.filter((a) => Math.ceil(a / 6) === level);
  };

  const isLevelUnlocked = (categoryKey: string, activityType: string, level: number) => {
    if (level === 1) return true;
    const key = makeKey(categoryKey, activityType);
    const entry = progress[key];
    const unlocked = entry?.unlockedLevel || 1;
    return level <= unlocked;
  };

  const completeActivity = (categoryKey: string, activityType: string, level: number, activityNum: number) => {
    const key = makeKey(categoryKey, activityType);
    setProgress((prev) => {
      const entry = prev[key] || { unlockedLevel: 1, completedActivities: [], failedActivities: [] };
      const globalActivityId = (level - 1) * 6 + activityNum;
      const newCompleted = entry.completedActivities.includes(globalActivityId)
        ? entry.completedActivities
        : [...entry.completedActivities, globalActivityId];
      // Passing an activity clears it from the "failed / needs retry" list.
      const newFailed = entry.failedActivities.filter((a) => a !== globalActivityId);

      const doneInLevel = newCompleted.filter((a) => Math.ceil(a / 6) === level).length;
      const newUnlockedLevel = doneInLevel >= 6 && level >= entry.unlockedLevel
        ? Math.min(level + 1, 5)
        : entry.unlockedLevel;

      return {
        ...prev,
        [key]: { unlockedLevel: newUnlockedLevel, completedActivities: newCompleted, failedActivities: newFailed },
      };
    });
  };

  // Called when the player leaves an activity (time ran out, or they backed
  // out) without answering it correctly yet. Marks the card red on the
  // Activity List. Does nothing if that activity is already completed.
  const failActivity = (categoryKey: string, activityType: string, level: number, activityNum: number) => {
    const key = makeKey(categoryKey, activityType);
    setProgress((prev) => {
      const entry = prev[key] || { unlockedLevel: 1, completedActivities: [], failedActivities: [] };
      const globalActivityId = (level - 1) * 6 + activityNum;
      if (entry.completedActivities.includes(globalActivityId)) return prev;
      const newFailed = entry.failedActivities.includes(globalActivityId)
        ? entry.failedActivities
        : [...entry.failedActivities, globalActivityId];

      return {
        ...prev,
        [key]: { ...entry, failedActivities: newFailed },
      };
    });
  };

  return (
    <GameProgressContext.Provider
      value={{ getProgress, getFailed, isLevelUnlocked, completeActivity, failActivity }}
    >
      {children}
    </GameProgressContext.Provider>
  );
}

export function useGameProgress() {
  const context = useContext(GameProgressContext);
  if (!context) throw new Error('useGameProgress must be used within GameProgressProvider');
  return context;
}