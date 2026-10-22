// src/shared/components/ui/score-badge.tsx
import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { Display, Label } from './text';
import { tokens } from '@/shared/theme/tokens';

/**
 * The score an attempt earned, as the first thing read in a result pop-up.
 *
 * The client evaluation (item 4.2) asked that a correct answer "show the
 * earned score": the points were already there, but as the fourth line of a
 * seven-line block, which is not where a child's eye goes. A zero scores the
 * same way in red (item 4.3) so a failed attempt is just as unambiguous.
 */
export function ScoreBadge({
  points,
  tone,
  label,
  style,
}: {
  points: number;
  tone: 'win' | 'loss';
  /** The word under the number — "points", or its translation. */
  label: string;
  style?: ViewStyle;
}) {
  const win = tone === 'win';
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: win ? tokens.color.successSoft : tokens.color.dangerSoft,
          borderColor: win ? tokens.color.successBorder : tokens.color.dangerBorder,
        },
        style,
      ]}
      accessibilityRole="text"
      accessibilityLabel={`${points} ${label}`}
    >
      <Display style={{ color: win ? tokens.color.successInk : tokens.color.dangerInk }}>
        {win ? `+${points}` : String(points)}
      </Display>
      <Label style={{ color: win ? tokens.color.successInk : tokens.color.dangerInk }}>{label}</Label>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: tokens.space.xs / 2,
    borderWidth: 2,
    borderRadius: tokens.radius.lg,
    paddingVertical: tokens.space.md,
    paddingHorizontal: tokens.space.lg,
    marginBottom: tokens.space.lg,
  },
});
