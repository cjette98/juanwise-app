// src/shared/components/ui/bottom-nav.tsx
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Icon, type IconName } from './icon';
import { Caption } from './text';
import { tokens } from '@/shared/theme/tokens';

type Tab = 'home' | 'learn' | 'ranks' | 'me';

// Four destinations that all already exist — this adds no screen, it only
// makes Categories and Leaderboard reachable in one tap instead of two.
const TABS: { key: Tab; icon: IconName; label: string; href: string }[] = [
  { key: 'home', icon: 'home', label: 'Home', href: '/student-home' },
  { key: 'learn', icon: 'book', label: 'Aral', href: '/categories' },
  { key: 'ranks', icon: 'trophy', label: 'Ranggo', href: '/leaderboard' },
  { key: 'me', icon: 'user', label: 'Ako', href: '/profile' },
];

export function BottomNav({ active }: { active: Tab }) {
  const router = useRouter();
  return (
    <View style={styles.bar}>
      {TABS.map((tab) => {
        const on = tab.key === active;
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.item}
            onPress={() => router.navigate(tab.href as never)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={tab.label}
          >
            <Icon name={tab.icon} size={25} color={on ? tokens.color.primary : tokens.color.inkDisabled} strokeWidth={2.4} />
            <Caption style={{ ...tokens.type.tab, color: on ? tokens.color.primary : tokens.color.inkDisabled }}>
              {tab.label}
            </Caption>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: tokens.color.surface,
    borderTopWidth: 2,
    borderTopColor: tokens.color.border,
    paddingVertical: tokens.space.sm,
  },
  item: { flex: 1, alignItems: 'center', gap: 4, minHeight: tokens.hit.min, justifyContent: 'center' },
});
