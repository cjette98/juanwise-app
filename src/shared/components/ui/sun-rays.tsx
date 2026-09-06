import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';
import { tokens } from '@/shared/theme/tokens';

/**
 * The eight rays of the Philippine sun, fanning from just above the top edge.
 *
 * Drawn as polygons rather than a CSS conic gradient, which React Native has
 * no equivalent for. Purely decorative, so it is `pointerEvents="none"` and
 * sits behind the header's content.
 */
export function SunRays({
  color = tokens.color.gold,
  opacity = 0.16,
}: {
  color?: string;
  opacity?: number;
}) {
  const cx = 200;
  const cy = -40;
  const length = 460;
  const half = 4; // half-angle of each ray, in degrees

  const rays = Array.from({ length: 8 }, (_, i) => {
    const mid = (360 / 8) * i;
    const point = (deg: number) => {
      const rad = ((deg - 90) * Math.PI) / 180;
      return `${cx + Math.cos(rad) * length},${cy + Math.sin(rad) * length}`;
    };
    return `${cx},${cy} ${point(mid - half)} ${point(mid + half)}`;
  });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox="0 0 400 260">
        {rays.map((points, i) => (
          <Polygon key={i} points={points} fill={color} opacity={opacity} />
        ))}
      </Svg>
    </View>
  );
}

export default SunRays;
