// src/shared/components/ui/star-row.tsx
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon } from './icon';
import { tokens } from '@/shared/theme/tokens';

export function StarRow({ earned, of = 3, size = 15 }: { earned: number; of?: number; size?: number }) {
  return (
    <View style={styles.row}>
      {Array.from({ length: of }, (_, i) => (
        <Icon key={i} name="star" size={size} filled color={i < earned ? tokens.color.gold : tokens.color.starEmpty} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', gap: 2 } });
