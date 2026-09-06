import React from 'react';
import { View, TouchableOpacity, ScrollView, Image, StyleSheet } from 'react-native';
import { useLanguage } from '@/shared/i18n/language-context';
import { images } from '@/shared/assets/images';
import { useRouter } from 'expo-router';
import { Screen, ScreenHeader, Card, H2, Icon, BottomNav } from '@/shared/components/ui';
import { tokens, categoryColor } from '@/shared/theme/tokens';

export default function CategoriesScreen() {
  const router = useRouter();
  const { t } = useLanguage();

  // categoryColor(key).base replaces the local hardcoded hex list — it holds
  // the exact same six values, so the `color` param handed to the next
  // screen is unchanged.
  const categories = [
    { key: 'history', label: t('catHistory'), image: images.catHistory },
    { key: 'culture', label: t('catCulture'), image: images.catCulture },
    { key: 'geography', label: t('catGeography'), image: images.catGeography },
    { key: 'festival', label: t('catFestival'), image: images.catFestival },
    { key: 'national', label: t('catNational'), image: images.catNational },
    { key: 'heroes', label: t('catHeroes'), image: images.catHeroes },
  ];

  return (
    <Screen>
      <ScreenHeader title={t('categoriesTitle')} color={tokens.color.primary} />

      <ScrollView contentContainerStyle={styles.list}>
        {categories.map((cat) => {
          const color = categoryColor(cat.key).base;
          return (
            <TouchableOpacity
              key={cat.key}
              activeOpacity={0.85}
              onPress={() =>
                router.navigate({ pathname: '/activity-choice', params: { category: cat.key, label: cat.label, color } })
              }
            >
              <Card style={styles.row}>
                <Image source={cat.image} style={styles.thumb} />
                <View style={styles.info}>
                  <H2 numberOfLines={1}>{cat.label}</H2>
                </View>
                <View style={[styles.chevronChip, { backgroundColor: color }]}>
                  <Icon name="chevronRight" size={20} color={tokens.color.onDark} strokeWidth={2.6} />
                </View>
              </Card>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <BottomNav active="learn" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: tokens.space.lg, paddingTop: tokens.space.md, paddingBottom: tokens.space.xl, gap: tokens.space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.md },
  thumb: { width: 74, height: 74, borderRadius: tokens.radius.lg },
  info: { flex: 1 },
  chevronChip: {
    width: 36,
    height: 36,
    borderRadius: tokens.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
