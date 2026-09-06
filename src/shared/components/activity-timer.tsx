import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { tokens } from '@/shared/theme/tokens';

export type Medal = 'gold' | 'silver' | 'bronze' | null;

export interface ActivityTimerResult {
  medal: Medal;
  points: number;
  timeRemaining: number;
  timeUsed: number;
  timedOut: boolean;
}

export interface ActivityTimerHandle {
  /** Call this the moment the player finishes (puzzle solved / last question answered). */
  stop: () => ActivityTimerResult;
}

interface ActivityTimerProps {
  /** Total seconds for the activity. Default 60 per spec. */
  durationSeconds?: number;
  /** Accent color coming from the category (header color). */
  color?: string;
  /** Pause the countdown (e.g. while a success/failure modal is shown). */
  isPaused?: boolean;
  /** Called once when the timer reaches 0 without stop() having been called yet. */
  onExpire?: (result: ActivityTimerResult) => void;
}

// Point values per medal tier.
// NOTE: flat values for now (assumption) — easy to swap for a formula
// (e.g. pieceCount * multiplier) once Admin/Firebase content lands.
export const MEDAL_POINTS: Record<'gold' | 'silver' | 'bronze', number> = {
  gold: 100,
  silver: 60,
  bronze: 30,
};

export function getMedalForTimeRemaining(timeRemaining: number, duration: number): Medal {
  if (duration <= 0) return null;
  const ratio = timeRemaining / duration;
  if (ratio >= 0.66) return 'gold';
  if (ratio >= 0.33) return 'silver';
  return 'bronze';
}

const ActivityTimer = forwardRef<ActivityTimerHandle, ActivityTimerProps>(
  ({ durationSeconds = 60, color = tokens.color.primary, isPaused = false, onExpire }, ref) => {
    const [secondsLeft, setSecondsLeft] = useState(durationSeconds);
    const secondsLeftRef = useRef(secondsLeft);
    const finishedRef = useRef(false);

    useEffect(() => {
      secondsLeftRef.current = secondsLeft;
    }, [secondsLeft]);

    // Digital countdown — ticks every second.
    useEffect(() => {
      if (isPaused || finishedRef.current) return;
      if (secondsLeft <= 0) {
        if (!finishedRef.current) {
          finishedRef.current = true;
          onExpire?.(buildResult(0));
        }
        return;
      }
      const id = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
      return () => clearTimeout(id);
    }, [secondsLeft, isPaused]);

    const buildResult = (timeRemainingOverride?: number): ActivityTimerResult => {
      const timeRemaining = timeRemainingOverride ?? secondsLeftRef.current;
      const timedOut = timeRemaining <= 0;
      const medal = timedOut ? null : getMedalForTimeRemaining(timeRemaining, durationSeconds);
      const points = medal ? MEDAL_POINTS[medal] : 0;
      return {
        medal,
        points,
        timeRemaining,
        timeUsed: durationSeconds - timeRemaining,
        timedOut,
      };
    };

    useImperativeHandle(ref, () => ({
      stop: () => {
        finishedRef.current = true;
        return buildResult();
      },
    }));

    const mm = Math.floor(Math.max(secondsLeft, 0) / 60)
      .toString()
      .padStart(2, '0');
    const ss = Math.max(secondsLeft, 0) % 60;
    const ssStr = ss.toString().padStart(2, '0');

    const lowTime = secondsLeft <= 10;

    // R = 23, so the circumference is 2 * Math.PI * 23 = 144.51.
    const CIRCUMFERENCE = 144.51;
    const progress = Math.max(0, Math.min(1, secondsLeft / durationSeconds));

    return (
      <View style={styles.ring}>
        <Svg width={54} height={54} viewBox="0 0 54 54" style={StyleSheet.absoluteFill}>
          <Circle cx="27" cy="27" r="23" stroke={tokens.color.onDarkFaint} strokeWidth={6} fill="none" />
          <Circle
            cx="27"
            cy="27"
            r="23"
            stroke={lowTime ? tokens.color.red : tokens.color.gold}
            strokeWidth={6}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
            transform="rotate(-90 27 27)"
          />
        </Svg>
        <Text style={styles.ringText}>{secondsLeft >= 60 ? `${mm}:${ssStr}` : String(Math.max(secondsLeft, 0))}</Text>
      </View>
    );
  }
);

export default ActivityTimer;

const styles = StyleSheet.create({
  ring: { width: 54, height: 54, alignItems: 'center', justifyContent: 'center' },
  ringText: { ...tokens.type.h3, color: tokens.color.onDark },
});
