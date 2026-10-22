import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { View, type ViewStyle } from 'react-native';
import { ICONS } from './icon-registry';
import { tierColor, type AchievementTier } from './achievement-tiers';

/**
 * The two achievement glyphs, in one place — item 5.1 of the client
 * evaluation, which asked for "one distinct trophy icon for level
 * achievements and one medal icon for each question or puzzle, used the same
 * everywhere".
 *
 * It was not: the student leaderboard drew a trophy tier as a crowned hexagon
 * of its own while every other screen drew the line-icon cup, and four screens
 * each kept a private copy of the gold/silver/bronze tint table.
 *
 * Both badges take their outlines from `icon-registry`, so they are the same
 * drawings the rest of the app uses — what they add is the tier colour and a
 * solid body, which is what makes a tier readable at 14-30px.
 */

interface BadgeProps {
  tier: AchievementTier | 'none' | null | undefined;
  size?: number;
  /**
   * Draws the unearned glyph as an outline in this colour. Left out, an
   * unearned badge renders nothing, so a row closes up instead of leaving a
   * hole where the badge would be.
   */
  mutedColor?: string;
  style?: ViewStyle;
}

/**
 * Decorative to screen readers: a badge always sits in a row, card or podium
 * column that names the achievement in its own label, and a nested accessible
 * child would split that into two focus stops.
 */
function Badge({
  solid,
  outlined,
  color,
  filled,
  size,
  style,
}: {
  solid: readonly string[];
  outlined: readonly string[];
  color: string;
  filled: boolean;
  size: number;
  style?: ViewStyle;
}) {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={style}>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        {solid.map((d, i) => (
          <Path
            key={`s${i}`}
            d={d}
            fill={filled ? color : 'none'}
            stroke={filled ? 'none' : color}
            strokeWidth={2}
            strokeLinejoin="round"
          />
        ))}
        {outlined.map((d, i) => (
          <Path
            key={`o${i}`}
            d={d}
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </Svg>
    </View>
  );
}

/**
 * A level achievement. The cup is solid in the tier colour; the handles, stem
 * and base stay stroked, because filling an open path draws a blot rather
 * than a trophy.
 */
export function TrophyBadge({ tier, size = 24, mutedColor, style }: BadgeProps) {
  const color = tierColor(tier);
  if (!color && !mutedColor) return null;

  return (
    <Badge
      solid={[ICONS.trophy[0]]}
      outlined={ICONS.trophy.slice(1)}
      color={color ?? mutedColor!}
      filled={color !== null}
      size={size}
      style={style}
    />
  );
}

/** One question or one puzzle. Disc and ribbon are both closed, so both fill. */
export function MedalBadge({ tier, size = 20, mutedColor, style }: BadgeProps) {
  const color = tierColor(tier);
  if (!color && !mutedColor) return null;

  return (
    <Badge
      solid={ICONS.medal}
      outlined={[]}
      color={color ?? mutedColor!}
      filled={color !== null}
      size={size}
      style={style}
    />
  );
}
