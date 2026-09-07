// src/shared/components/ui/avatar.tsx
import React from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { avatarPalette, initialsOf } from './avatar-identity';
import { tokens } from '@/shared/theme/tokens';

/**
 * A student's initials on a disc coloured from their name.
 *
 * `ring` paints the border in a caller-chosen colour — the leaderboard uses it
 * to carry the medal hue on the podium — and defaults to the darker shade of
 * the name's own pair, which is what every list row wants.
 *
 * The label is a bare `Text` rather than one of the typography components
 * because it has to scale with `size`; the shared styles are all fixed-size by
 * design. It still takes its family from the tokens.
 *
 * Hidden from screen readers: every caller draws the student's name as text
 * beside the disc, so announcing the initials as well would read the same
 * person twice and split the row into two focus stops.
 */
export function Avatar({
  name,
  size = 44,
  ring,
  ringWidth = 2.5,
  style,
}: {
  name: string;
  size?: number;
  ring?: string;
  ringWidth?: number;
  style?: ViewStyle;
}) {
  const palette = avatarPalette(name);
  const initials = initialsOf(name);

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.disc,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: palette.base,
          borderColor: ring ?? palette.dark,
          borderWidth: ringWidth,
        },
        style,
      ]}
    >
      <Text
        allowFontScaling={false}
        style={[styles.initials, { fontSize: size * 0.38, lineHeight: size * 0.46 }]}
      >
        {initials}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  disc: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  initials: { fontFamily: tokens.font.bodyBlack, color: tokens.color.onDark },
});

export default Avatar;
