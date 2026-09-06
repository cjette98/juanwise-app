import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { ICONS, type IconName } from './icon-registry';
import { tokens } from '@/shared/theme/tokens';

export type { IconName };

/**
 * A stroked line icon. `filled` swaps stroke for fill, which is what a star or
 * a medal wants once it has been earned.
 */
export function Icon({
  name,
  size = 24,
  color = tokens.color.ink,
  strokeWidth = 2.2,
  filled = false,
}: {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  filled?: boolean;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {ICONS[name].map((d, i) => (
        <Path
          key={i}
          d={d}
          stroke={filled ? 'none' : color}
          fill={filled ? color : 'none'}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </Svg>
  );
}

export default Icon;
