// src/shared/components/ui/pill.tsx
import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { Icon, type IconName } from './icon';
import { Caption } from './text';
import { tokens } from '@/shared/theme/tokens';

const TONES = {
  gold: { bg: tokens.color.gold, fg: tokens.color.goldInk, border: 'transparent' },
  success: { bg: tokens.color.success, fg: tokens.color.onDark, border: 'transparent' },
  neutral: { bg: tokens.color.surfaceSunken, fg: tokens.color.inkMuted, border: 'transparent' },
  translucent: { bg: tokens.color.onDarkFill, fg: tokens.color.onDark, border: tokens.color.onDarkBorder },
} as const;

export function Pill({
  label,
  icon,
  tone = 'neutral',
  style,
}: {
  label: string;
  icon?: IconName;
  tone?: keyof typeof TONES;
  style?: ViewStyle;
}) {
  const t = TONES[tone];
  return (
    <View style={[styles.pill, { backgroundColor: t.bg, borderColor: t.border }, style]}>
      {icon && <Icon name={icon} size={16} color={t.fg} filled={icon === 'star'} />}
      <Caption style={{ color: t.fg, fontFamily: tokens.font.bodyBold }}>{label}</Caption>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.xs,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: tokens.radius.pill,
    borderWidth: 1.5,
  },
});
