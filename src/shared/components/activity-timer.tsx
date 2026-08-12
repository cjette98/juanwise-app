import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';

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
  ({ durationSeconds = 60, color = '#3B7DD8', isPaused = false, onExpire }, ref) => {
    const [secondsLeft, setSecondsLeft] = useState(durationSeconds);
    const secondsLeftRef = useRef(secondsLeft);
    const finishedRef = useRef(false);

    const handRotation = useRef(new Animated.Value(0)).current;
    const badgePulse = useRef(new Animated.Value(1)).current;

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

    // Animated clock hand — one full sweep across the whole duration.
    useEffect(() => {
      if (isPaused) {
        handRotation.stopAnimation();
        return;
      }
      Animated.timing(handRotation, {
        toValue: 1,
        duration: secondsLeft * 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start();
    }, [isPaused]); // eslint-disable-line react-hooks/exhaustive-deps

    // Medal badge pulses faster as time runs low (urgency cue).
    useEffect(() => {
      if (isPaused || finishedRef.current) return;
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(badgePulse, {
            toValue: 1.15,
            duration: secondsLeft <= 10 ? 300 : 700,
            useNativeDriver: true,
          }),
          Animated.timing(badgePulse, {
            toValue: 1,
            duration: secondsLeft <= 10 ? 300 : 700,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }, [secondsLeft <= 10, isPaused]); // eslint-disable-line react-hooks/exhaustive-deps

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
        handRotation.stopAnimation();
        return buildResult();
      },
    }));

    const rotateDeg = handRotation.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg'],
    });

    const mm = Math.floor(Math.max(secondsLeft, 0) / 60)
      .toString()
      .padStart(2, '0');
    const ss = Math.max(secondsLeft, 0) % 60;
    const ssStr = ss.toString().padStart(2, '0');

    const liveMedal = getMedalForTimeRemaining(secondsLeft, durationSeconds);
    const lowTime = secondsLeft <= 10;
    const medalColors = MEDAL_TIER_COLORS[liveMedal ?? 'bronze'];

    return (
      <View style={styles.row}>
        {/* Cartoon toy clock */}
        <View style={styles.clockShadow}>
          <View style={styles.clockOuter}>
            <View style={styles.clockInnerRing}>
              <View style={styles.clockFace}>
                {TICK_POSITIONS.map((pos, i) => (
                  <View key={i} style={[styles.tickDot, { left: pos.x, top: pos.y }]} />
                ))}
                <Animated.View style={[styles.hand, { transform: [{ rotate: rotateDeg }] }]} />
                <View style={styles.clockCenter} />
              </View>
            </View>
          </View>
        </View>

        {/* Glossy digital pill */}
        <View style={[styles.pill, { backgroundColor: color }, lowTime && styles.pillDanger]}>
          <View style={styles.pillShine} />
          <Text style={styles.pillText}>
            {mm}:{ssStr}
          </Text>
        </View>

        {/* Ribbon medal badge */}
        <Animated.View style={[styles.medalWrap, { transform: [{ scale: badgePulse }] }]}>
          <View style={styles.ribbonTailLeft} />
          <View style={styles.ribbonTailRight} />
          <View style={[styles.medalOuter, { backgroundColor: medalColors.outer, borderColor: medalColors.border }]}>
            <View style={[styles.medalInner, { borderColor: medalColors.inner }]}>
              <Text style={[styles.medalStar, { color: medalColors.border }]}>★</Text>
            </View>
          </View>
        </Animated.View>
      </View>
    );
  }
);

export default ActivityTimer;

// Precomputed positions for 8 tick dots evenly spaced around the clock face.
const FACE_RADIUS = 15;
const FACE_CENTER = 16;
const TICK_POSITIONS = Array.from({ length: 8 }, (_, i) => {
  const angle = (i * Math.PI) / 4;
  return {
    x: FACE_CENTER + FACE_RADIUS * Math.sin(angle) - 2,
    y: FACE_CENTER - FACE_RADIUS * Math.cos(angle) - 2,
  };
});

const MEDAL_TIER_COLORS: Record<'gold' | 'silver' | 'bronze', { outer: string; border: string; inner: string }> = {
  gold: { outer: '#FCD116', border: '#B8860B', inner: '#FFE98A' },
  silver: { outer: '#E3E6E8', border: '#9AA0A6', inner: '#F5F7F8' },
  bronze: { outer: '#D08A4E', border: '#8B5A2B', inner: '#E8B584' },
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  // Clock
  clockShadow: {
    borderRadius: 24, backgroundColor: 'rgba(0,0,0,0.18)',
  },
  clockOuter: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#0D5C99',
    alignItems: 'center', justifyContent: 'center', marginBottom: 2, marginRight: 2,
  },
  clockInnerRing: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: '#29ABE2',
    alignItems: 'center', justifyContent: 'center',
  },
  clockFace: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#FFFFFF',
  },
  tickDot: {
    position: 'absolute', width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#5CC9E8',
  },
  hand: {
    position: 'absolute', width: 2.5, height: 11, backgroundColor: '#0D5C99',
    borderRadius: 1.5, top: 5, left: 15,
  },
  clockCenter: {
    position: 'absolute', width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#0D5C99',
    top: 13.5, left: 13.5,
  },

  // Digital pill
  pill: {
    paddingVertical: 7, paddingHorizontal: 18, borderRadius: 18,
    borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.55)', overflow: 'hidden',
  },
  pillDanger: { backgroundColor: '#C4304A' },
  pillShine: {
    position: 'absolute', top: 2, left: 8, right: 8, height: 5,
    borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.35)',
  },
  pillText: {
    color: '#FFF', fontWeight: '900', fontSize: 16, letterSpacing: 1.5,
    textShadowColor: 'rgba(0,0,0,0.25)', textShadowOffset: { width: 0, height: 1.5 }, textShadowRadius: 0,
  },

  // Ribbon medal badge
  medalWrap: { width: 34, height: 40, alignItems: 'center' },
  ribbonTailLeft: {
    position: 'absolute', bottom: 0, left: 6, width: 9, height: 16,
    backgroundColor: '#CE1126', transform: [{ rotate: '18deg' }], borderRadius: 2,
  },
  ribbonTailRight: {
    position: 'absolute', bottom: 0, right: 6, width: 9, height: 16,
    backgroundColor: '#A80D1C', transform: [{ rotate: '-18deg' }], borderRadius: 2,
  },
  medalOuter: {
    width: 30, height: 30, borderRadius: 15, borderWidth: 2.5,
    alignItems: 'center', justifyContent: 'center',
  },
  medalInner: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  medalStar: { fontSize: 12, fontWeight: 'bold' },
});