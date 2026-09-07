// src/shared/components/ui/segmented.tsx
import React from 'react';
import { StyleSheet, TouchableOpacity, View, type ViewStyle } from 'react-native';
import { Icon, type IconName } from './icon';
import { Caption } from './text';
import { tokens } from '@/shared/theme/tokens';

export type SegmentedOption<T extends string> = { value: T; label: string; icon?: IconName };

/**
 * A two-or-more-way switch drawn as one pill track with a filled thumb.
 *
 * Replaces the loose pairs of `Pill`s the leaderboards used for their sort
 * modes: those read as two independent chips, which is the wrong affordance
 * for a choice that is always exactly one of N.
 *
 * `onDark` is for a coloured header, `onCanvas` for the cream body. Both keep
 * the whole track at `hit.min` so each segment clears the tap-target floor.
 */
const TONES = {
  onDark: {
    track: tokens.color.onDarkFill,
    thumb: tokens.color.surface,
    activeFg: tokens.color.ink,
    idleFg: tokens.color.onDarkMuted,
  },
  onCanvas: {
    track: tokens.color.surfaceSunken,
    thumb: tokens.color.primary,
    activeFg: tokens.color.onDark,
    idleFg: tokens.color.inkMuted,
  },
} as const;

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  tone = 'onDark',
  style,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  tone?: keyof typeof TONES;
  style?: ViewStyle;
}) {
  const t = TONES[tone];

  return (
    <View style={[styles.track, { backgroundColor: t.track }, style]}>
      {options.map((option) => {
        const active = option.value === value;
        const fg = active ? t.activeFg : t.idleFg;
        return (
          <TouchableOpacity
            key={option.value}
            style={[styles.segment, active && { backgroundColor: t.thumb }]}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={option.label}
          >
            {option.icon && (
              <Icon name={option.icon} size={15} color={fg} filled={option.icon === 'star'} />
            )}
            <Caption style={{ color: fg, fontFamily: tokens.font.bodyBold }} numberOfLines={1}>
              {option.label}
            </Caption>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    borderRadius: tokens.radius.pill,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.space.xs,
    minHeight: tokens.hit.min - 8,
    paddingHorizontal: tokens.space.sm,
    borderRadius: tokens.radius.pill,
  },
});

export default Segmented;
