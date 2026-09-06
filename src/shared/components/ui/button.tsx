// src/shared/components/ui/button.tsx
import React from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View, type ViewStyle } from 'react-native';
import { Icon, type IconName } from './icon';
import { H3 } from './text';
import { tokens } from '@/shared/theme/tokens';

type Variant = 'primary' | 'gold' | 'secondary' | 'locked';

const VARIANTS: Record<Variant, { bg: string; shadow: string; fg: string; border?: string }> = {
  primary: { bg: tokens.color.primary, shadow: tokens.color.primaryDark, fg: tokens.color.onDark },
  gold: { bg: tokens.color.gold, shadow: tokens.color.goldDark, fg: tokens.color.goldInk },
  secondary: { bg: tokens.color.surface, shadow: tokens.color.border, fg: tokens.color.inkMuted, border: tokens.color.border },
  locked: { bg: tokens.color.locked, shadow: tokens.color.locked, fg: tokens.color.inkDisabled },
};

/**
 * `color` overrides the variant's fill — the category-coloured call to action
 * on the level and activity screens. The chunky look is a solid bottom border
 * rather than a shadow: React Native has no `box-shadow: 0 6px 0`, and this
 * renders the same on both platforms.
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  color,
  shadowColor,
  icon,
  disabled = false,
  busy = false,
  style,
}: {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  color?: string;
  shadowColor?: string;
  icon?: IconName;
  disabled?: boolean;
  busy?: boolean;
  style?: ViewStyle;
}) {
  const v = VARIANTS[variant];
  const locked = variant === 'locked' || disabled;
  return (
    <TouchableOpacity
      onPress={locked || busy ? undefined : onPress}
      disabled={locked || busy}
      activeOpacity={0.85}
      style={[
        styles.button,
        {
          backgroundColor: color ?? v.bg,
          borderBottomColor: shadowColor ?? v.shadow,
          borderWidth: v.border ? 2 : 0,
          borderColor: v.border ?? 'transparent',
          borderBottomWidth: tokens.hardShadow,
          opacity: busy ? 0.75 : 1,
        },
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <View style={styles.inner}>
          {icon && <Icon name={icon} size={20} color={v.fg} />}
          <H3 style={{ color: v.fg }} numberOfLines={1}>
            {label}
          </H3>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: tokens.hit.primary,
    borderRadius: tokens.radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: tokens.space.lg,
  },
  inner: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm },
});
