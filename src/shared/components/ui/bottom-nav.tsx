// src/shared/components/ui/bottom-nav.tsx
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Icon, type IconName } from './icon';
import { Caption } from './text';
import { tokens } from '@/shared/theme/tokens';
import { useLanguage, type TranslationKey } from '@/shared/i18n/language-context';

type Tab = 'home' | 'learn' | 'ranks' | 'me';

// Four destinations that all already exist — this adds no screen, it only
// makes Categories and Leaderboard reachable in one tap instead of two.
const TABS: { key: Tab; icon: IconName; labelKey: TranslationKey; href: string }[] = [
  { key: 'home', icon: 'home', labelKey: 'navHome', href: '/student-home' },
  { key: 'learn', icon: 'book', labelKey: 'navLearn', href: '/categories' },
  { key: 'ranks', icon: 'trophy', labelKey: 'navRanks', href: '/leaderboard' },
  { key: 'me', icon: 'user', labelKey: 'navMe', href: '/profile' },
];

export function BottomNav({ active }: { active: Tab }) {
  const router = useRouter();
  const { t } = useLanguage();
  return (
    <View style={styles.bar}>
      {TABS.map((tab) => {
        const on = tab.key === active;
        const label = t(tab.labelKey);
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.item}
            onPress={() => router.navigate(tab.href as never)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={label}
          >
            <Icon name={tab.icon} size={25} color={on ? tokens.color.primary : tokens.color.inkDisabled} strokeWidth={2.4} />
            <Caption style={{ ...tokens.type.tab, color: on ? tokens.color.primary : tokens.color.inkDisabled }}>
              {label}
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
