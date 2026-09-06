// src/shared/components/ui/card.tsx
import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { tokens } from '@/shared/theme/tokens';

export function Card({
  children,
  raised = false,
  style,
}: {
  children: React.ReactNode;
  raised?: boolean;
  style?: ViewStyle | ViewStyle[];
}) {
  return <View style={[styles.card, raised ? tokens.elevation.raised : tokens.elevation.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: tokens.color.surface,
    borderRadius: tokens.radius.card,
    borderWidth: 2,
    borderColor: tokens.color.border,
    padding: tokens.space.lg,
  },
});
