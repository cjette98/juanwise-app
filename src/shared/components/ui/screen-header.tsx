// src/shared/components/ui/screen-header.tsx
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Icon } from './icon';
import { SunRays } from './sun-rays';
import { Caption, H1 } from './text';
import { tokens } from '@/shared/theme/tokens';

export function ScreenHeader({
  title,
  subtitle,
  color = tokens.color.primary,
  onBack,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  color?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <View style={[styles.header, { backgroundColor: color }]}>
      <SunRays />
      <View style={styles.row}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.back} accessibilityRole="button" accessibilityLabel="Bumalik">
            <Icon name="chevronLeft" size={21} color={tokens.color.onDark} strokeWidth={3} />
          </TouchableOpacity>
        )}
        <View style={styles.titles}>
          <H1 style={{ color: tokens.color.onDark }} numberOfLines={1}>
            {title}
          </H1>
          {!!subtitle && (
            <Caption style={{ color: tokens.color.onDarkMuted }} numberOfLines={1}>
              {subtitle}
            </Caption>
          )}
        </View>
        {right}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: tokens.space.md,
    paddingBottom: tokens.space.lg,
    paddingHorizontal: tokens.space.lg,
    borderBottomLeftRadius: tokens.radius.card,
    borderBottomRightRadius: tokens.radius.card,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.md },
  back: {
    width: tokens.hit.min,
    height: tokens.hit.min,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.color.onDarkChip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titles: { flex: 1, gap: 1 },
});
