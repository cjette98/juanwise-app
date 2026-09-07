// src/shared/components/ui/medal-badge.tsx
import React from 'react';
import Svg, { Path, Polygon } from 'react-native-svg';
import { View, type ViewStyle } from 'react-native';
import { tokens } from '@/shared/theme/tokens';

export type MedalTier = 'gold' | 'silver' | 'bronze';

/**
 * A crown inside a flat-topped hexagon, in the medal colours.
 *
 * The glyph is inked dark on all three tiers rather than white: white on
 * `medalGold` is unreadable, and picking per-tier would leave the three badges
 * looking like they came from different sets. The thin `surface` stroke is
 * what keeps the hexagon's edge visible on the coloured podium field; on a
 * white card it simply disappears.
 */
const TIERS: Record<MedalTier, { fill: string; ink: string }> = {
  gold: { fill: tokens.color.medalGold, ink: tokens.color.goldInk },
  silver: { fill: tokens.color.medalSilver, ink: tokens.color.ink },
  bronze: { fill: tokens.color.medalBronze, ink: tokens.color.ink },
};

/** Flat-top hexagon on a 24×24 viewBox: vertices left and right, level edges top and bottom. */
const HEX = '23.5,12 17.75,21.96 6.25,21.96 0.5,12 6.25,2.04 17.75,2.04';

/** Three peaks over a solid band — a crown at the smallest size that still reads as one. */
const CROWN = 'M7 9.4 L9.8 12.6 L12 8.1 L14.2 12.6 L17 9.4 L16.2 16.1 L7.8 16.1 Z';

/**
 * `tier` of `null` renders nothing at all rather than an empty slot, so a row
 * for a student who has not earned a trophy closes up instead of leaving a
 * hole where the badge would be.
 *
 * Decorative to screen readers: the badge always sits inside a row or podium
 * column that names the trophy in its own accessibility label, and a nested
 * accessible child would break that row into two focus stops.
 */
export function MedalBadge({
  tier,
  size = 34,
  style,
}: {
  tier: MedalTier | null;
  size?: number;
  style?: ViewStyle;
}) {
  if (!tier) return null;
  const t = TIERS[tier];

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={style}
    >
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Polygon points={HEX} fill={t.fill} stroke={tokens.color.surface} strokeWidth={1.2} strokeLinejoin="round" />
        <Path d={CROWN} fill={t.ink} strokeLinejoin="round" />
      </Svg>
    </View>
  );
}

export default MedalBadge;
