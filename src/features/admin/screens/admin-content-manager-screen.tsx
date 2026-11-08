import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView, Alert, Switch, ActivityIndicator } from 'react-native';
import { H2, H3, Body, BodyStrong, Caption } from '@/shared/components/ui';
import { tokens } from '@/shared/theme/tokens';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAdminContent } from '@/features/admin/context/admin-content-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useLanguage } from '@/shared/i18n/language-context';
import { CATEGORY_META as CATEGORIES } from '@/shared/content/category-meta';

const LEVELS = [1, 2, 3, 4, 5];
const ACTIVITIES = [1, 2, 3, 4, 5, 6];

export default function AdminContentManagerScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { packId } = useLocalSearchParams<{ packId: string }>();
  const [category, setCategory] = useState(CATEGORIES[0].key);
  const [level, setLevel] = useState(1);
  // Every read and write here goes through the content module, so an edit made
  // on this device is what every student's app fetches next.
  const {
    isPackReady,
    error,
    ensurePackLoaded,
    getPack,
    getEffectiveQuestion,
    isOverridden,
    deleteQuestionOverride,
    setShowMiniLesson,
  } = useAdminContent();

  useEffect(() => {
    if (packId) ensurePackLoaded(packId);
  }, [packId, ensurePackLoaded]);

  if (!packId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorBanner}>
          <Caption style={styles.errorBannerText}>{t('adminNoPackSelected')}</Caption>
        </View>
      </SafeAreaView>
    );
  }

  const ready = isPackReady(packId);
  const pack = getPack(packId);

  const activeCategory = CATEGORIES.find((c) => c.key === category)!;

  const handleDelete = (activityNum: number) => {
    Alert.alert(
      t('removeCustomQuestionTitle'),
      t('removeCustomQuestionMsg', { num: activityNum }),
      [
        { text: t('cancelBtn'), style: 'cancel' },
        {
          text: t('removeBtn'),
          style: 'destructive',
          onPress: async () => {
            const result = await deleteQuestionOverride(packId, category, level, activityNum);
            if (!result.success) Alert.alert(t('adminRemoveFailedTitle'), result.message);
          },
        },
      ]
    );
  };

  const handleToggleMiniLesson = async (value: boolean) => {
    const result = await setShowMiniLesson(packId, value);
    if (!result.success) Alert.alert(t('adminSaveFailedTitle'), result.message);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { backgroundColor: activeCategory.color }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <Ionicons name="chevron-back" size={22} color="#FFF" />
        </TouchableOpacity>
        <H2 style={styles.headerTitle}>{t('contentManagerTitle')}</H2>
        <Caption style={styles.headerSubtitle}>{t('contentManagerSubtitle', { name: pack?.name ?? '...' })}</Caption>
      </View>

      <View style={styles.catRowWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catRowContent}
        >
          {CATEGORIES.map((c) => (
            <TouchableOpacity
              key={c.key}
              style={[styles.catChip, { borderColor: c.color }, category === c.key && { backgroundColor: c.color }]}
              onPress={() => setCategory(c.key)}
            >
              <Caption style={[styles.catChipText, { color: category === c.key ? '#FFF' : c.color }]}>
                {t(c.labelKey)}
              </Caption>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.levelRow}>
        {LEVELS.map((lvl) => (
          <TouchableOpacity
            key={lvl}
            style={[styles.levelChip, level === lvl && { backgroundColor: activeCategory.color }]}
            onPress={() => setLevel(lvl)}
          >
            <Caption style={[styles.levelChipText, level === lvl && { color: '#FFF' }]}>{t('levelNum', { n: lvl })}</Caption>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.miniLessonRow}>
        <View style={{ flex: 1 }}>
          <BodyStrong style={styles.miniLessonTitle}>{t('miniLessonBeforeQuiz')}</BodyStrong>
          <Caption style={styles.miniLessonSub}>{t('miniLessonToggleDesc')}</Caption>
        </View>
        <Switch
          value={pack?.showMiniLesson ?? true}
          onValueChange={handleToggleMiniLesson}
          trackColor={{ false: '#D0D0D0', true: activeCategory.color }}
          thumbColor="#FFF"
        />
      </View>
      <Caption style={styles.miniLessonNote}>{t('miniLessonToggleNote')}</Caption>

      {!!error && (
        <View style={styles.errorBanner}>
          <Ionicons name="cloud-offline-outline" size={16} color="#FFF" />
          <Caption style={styles.errorBannerText}>{error}</Caption>
        </View>
      )}

      {!ready && (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={activeCategory.color} />
          <Caption style={styles.loadingText}>{t('adminFetchingContent')}</Caption>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.list}>
        {ready && ACTIVITIES.map((num) => {
          const q = getEffectiveQuestion(packId, category, level, num);
          const custom = isOverridden(packId, category, level, num);
          return (
            <View key={num} style={styles.card}>
              <View style={styles.cardTop}>
                <H3 style={styles.cardTitle}>{t('questionNumShort', { num })}</H3>
                {custom ? (
                  <View style={styles.customBadge}>
                    <Caption style={styles.customBadgeText}>{t('customBadge')}</Caption>
                  </View>
                ) : (
                  <View style={styles.defaultBadge}>
                    <Caption style={styles.defaultBadgeText}>{t('defaultBadge')}</Caption>
                  </View>
                )}
              </View>
              <Body style={styles.cardQuestion} numberOfLines={2}>{q.question}</Body>
              <Caption style={styles.cardAnswer}>{t('answerLabelShort', { answer: q.correctAnswer })}</Caption>
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: activeCategory.color }]}
                  onPress={() =>
                    router.navigate({ pathname: '/question-editor', params: { packId, category, level, activityNum: num, categoryColor: activeCategory.color, categoryLabel: t(activeCategory.labelKey) } })
                  }
                >
                  <Ionicons name="create-outline" size={16} color="#FFF" />
                  <Caption style={styles.actionBtnText}>{t('editBtn')}</Caption>
                </TouchableOpacity>
                {custom && (
                  <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => handleDelete(num)}>
                    <Ionicons name="trash-outline" size={16} color="#FFF" />
                    <Caption style={styles.actionBtnText}>{t('deleteBtn')}</Caption>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5EFE0' },
  header: { paddingTop: 10, paddingBottom: 16, paddingHorizontal: 16, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerBack: { marginBottom: 4 },
  headerTitle: { color: '#FFF' },
  headerSubtitle: { color: '#FFF', opacity: 0.9, marginTop: 2 },
  /**
   * One scrollable line of category chips.
   *
   * Every cross-axis size here is explicit on purpose. A horizontal ScrollView
   * in a column layout has no natural height, so it either grows to fill the
   * screen or collapses — and the usual patches for that are what broke this
   * row twice: `maxHeight` capped the box but let the chips lay out taller and
   * clipped their labels, and `alignItems: 'center'` against an indefinite
   * cross-size collapsed the labels to nothing while the pills kept their
   * shape. With a fixed height on the wrapper *and* on the chip, nothing has to
   * be inferred: the wrapper defines the band, the chip defines its own pill,
   * and the label is centred inside a box that is already 34px tall.
   */
  catRowWrap: { height: 46, marginTop: 12 },
  catRowContent: { paddingHorizontal: 12, gap: 8, alignItems: 'center' },
  catChip: {
    height: 34, paddingHorizontal: 12, borderRadius: 17, borderWidth: 1.5,
    backgroundColor: '#FFF', justifyContent: 'center',
  },
  catChipText: { fontFamily: tokens.font.bodyBold },
  levelRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 12, paddingHorizontal: 12 },
  levelChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: '#E5DCC8' },
  levelChipText: { fontFamily: tokens.font.bodyBold, color: '#5C3A21' },
  miniLessonRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFF',
    marginHorizontal: 16, marginTop: 14, padding: 14, borderRadius: 14,
    borderWidth: 1.5, borderColor: '#E0D5BE',
  },
  miniLessonTitle: { color: '#1A1A1A' },
  miniLessonSub: { color: '#8E8E93', marginTop: 2 },
  miniLessonNote: { color: '#8E8E93', marginTop: 4, paddingHorizontal: 16 },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#B23A3A',
    borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, marginHorizontal: 16, marginTop: 12,
  },
  errorBannerText: { color: '#FFF', flex: 1 },
  loadingWrap: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  loadingText: { color: '#8E8E93' },
  list: { padding: 16, gap: 12 },
  card: { backgroundColor: '#FFF', borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: '#E0D5BE' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardTitle: { color: '#1A1A1A' },
  customBadge: { backgroundColor: '#2E9E5B', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  customBadgeText: { color: '#FFF', fontFamily: tokens.font.bodyBold },
  defaultBadge: { backgroundColor: '#B0B0B0', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  defaultBadgeText: { color: '#FFF', fontFamily: tokens.font.bodyBold },
  cardQuestion: { color: '#2B2B2B', marginBottom: 4 },
  cardAnswer: { color: '#5C3A21', marginBottom: 10 },
  cardActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14 },
  deleteBtn: { backgroundColor: '#C4304A' },
  actionBtnText: { color: '#FFF', fontFamily: tokens.font.bodyBold },
});