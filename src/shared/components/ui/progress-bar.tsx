// src/shared/components/ui/progress-bar.tsx
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { tokens } from '@/shared/theme/tokens';

export function ProgressBar({
  value,
  color = tokens.color.primary,
  height = 9,
}: {
  value: number;
  color?: string;
  height?: number;
}) {
  // Guards the fill against a divide-by-zero upstream (a level with no
  // activities) and against a value over 1 rounding past the track.
  const pct = `${Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0)) * 100}%` as const;
  return (
    <View style={[styles.track, { height, borderRadius: height }]}>
      <View style={{ width: pct, height: '100%', backgroundColor: color, borderRadius: height }} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { backgroundColor: tokens.color.track, overflow: 'hidden', width: '100%' },
});
