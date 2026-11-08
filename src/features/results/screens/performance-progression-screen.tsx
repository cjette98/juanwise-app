import React, { useEffect, useMemo, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { H2, H3, Body, Caption } from '@/shared/components/ui';
import { tokens } from '@/shared/theme/tokens';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage, type TranslationKey } from '@/shared/i18n/language-context';
import { useClass } from '@/features/teacher/context/class-context';
import {
  useStudentResults,
  ProgressionTrend,
  StudentProgression,
  ResultFilter,
  ActivityResult,
} from '@/features/results/context/student-results-context';
import CATEGORY_META, { getCategoryMeta } from '@/shared/content/category-meta';
import { analyticsApi, type ApiCategoryKey, type ApiStudentProgression } from '@/shared/api';
import { formatDuration } from '@/features/leaderboard/teacher-leaderboard-format';
import { useRouter } from 'expo-router';

const LEVELS = [1, 2, 3, 4, 5];

const TREND_META: Record<
  ProgressionTrend,
  { labelKey: TranslationKey; color: string; icon: string; order: number }
> = {
  improving: { labelKey: 'trendImproving', color: '#2E9E5B', icon: 'trending-up', order: 0 },
  steady: { labelKey: 'trendSteady', color: '#3B7DD8', icon: 'remove-circle', order: 1 },
  'needs-support': { labelKey: 'trendNeedsHelp', color: '#C4304A', icon: 'trending-down', order: 2 },
  'not-enough-data': { labelKey: 'trendNotEnoughData', color: '#C9631D', icon: 'time', order: 3 },
  'not-started': { labelKey: 'trendNotJoined', color: '#8E8E93', icon: 'ellipse-outline', order: 4 },
};

const MEDAL_DOT_COLOR: Record<string, string> = {
  gold: '#E8B923',
  silver: '#B7C0C9',
  bronze: '#C9793A',
};

function formatDelta(value: number, suffix: string) {
  const rounded = Math.round(value * 10) / 10;
  if (rounded === 0) return `0${suffix}`;
  return `${rounded > 0 ? '+' : ''}${rounded}${suffix}`;
}

export default function PerformanceProgressionScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { students, classId } = useClass();
  const { ready, getProgression } = useStudentResults();

  const [category, setCategory] = useState<string | null>(null);
  const [activityType, setActivityType] = useState<'quiz' | 'jigsaw' | null>(null);
  const [level, setLevel] = useState<number | null>(null);

  const filter: ResultFilter = useMemo(
    () => ({
      ...(category ? { category } : {}),
      ...(activityType ? { activityType } : {}),
      ...(level ? { level } : {}),
    }),
    [category, activityType, level]
  );

  const roster = useMemo(() => students.map((s) => ({ uid: s.uid, name: s.name })), [students]);

  // Points, time and completed activities come from the server, the same
  // numbers the leaderboard shows (Adjustment 3, items 1 and 7). The trend
  // badge compares the student's earlier and later attempts on the phone.
  const filterKey = [classId, category, activityType, level].join('|');
  const [serverRows, setServerRows] = useState<{ key: string; byUid: Map<string, ApiStudentProgression> } | null>(null);
  useEffect(() => {
    if (!classId) return;
    let cancelled = false;
    analyticsApi
      .progression(classId, {
        ...(category ? { category: category as ApiCategoryKey } : {}),
        ...(activityType ? { activityType } : {}),
        ...(level ? { level } : {}),
      })
      .then((items) => {
        if (!cancelled) setServerRows({ key: filterKey, byUid: new Map(items.map((i) => [i.uid, i])) });
      })
      .catch(() => {
        if (!cancelled) setServerRows({ key: filterKey, byUid: new Map() });
      });
    return () => {
      cancelled = true;
    };
  }, [classId, category, activityType, level, filterKey]);
  const totalsByUid = serverRows?.key === filterKey ? serverRows.byUid : null;

  const progression = useMemo<StudentProgression[]>(() => {
    const list = getProgression(roster, filter);
    return [...list].sort((a, b) => {
      const orderDiff = TREND_META[a.trend].order - TREND_META[b.trend].order;
      if (orderDiff !== 0) return orderDiff;
      return b.pointsDelta - a.pointsDelta;
    });
  }, [roster, filter, getProgression]);

  const counts = useMemo(() => {
    const base: Record<ProgressionTrend, number> = {
      improving: 0,
      steady: 0,
      'needs-support': 0,
      'not-enough-data': 0,
      'not-started': 0,
    };
    for (const p of progression) base[p.trend] += 1;
    return base;
  }, [progression]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <Ionicons name="chevron-back" size={22} color="#FFF" />
        </TouchableOpacity>
        <H2 style={styles.headerTitle}>{t('performanceProgression').toUpperCase()}</H2>
        <Caption style={styles.headerSubtitle}>{t('performanceSubtitle')}</Caption>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* SUMMARY PILLS */}
        <View style={styles.summaryRow}>
          {(Object.keys(TREND_META) as ProgressionTrend[]).map((key) => {
            const meta = TREND_META[key];
            return (
              <View key={key} style={[styles.summaryPill, { backgroundColor: meta.color }]}>
                <Ionicons name={meta.icon as any} size={13} color="#FFF" />
                <Caption style={styles.summaryPillText}>{counts[key]}</Caption>
              </View>
            );
          })}
        </View>

        {/* FILTERS */}
        <View style={styles.filterCard}>
          <Caption style={styles.filterLabel}>{t('topicLabel')}</Caption>
          <View style={styles.chipRow}>
            <TouchableOpacity
              style={[styles.chip, !category && styles.chipActiveNeutral]}
              onPress={() => setCategory(null)}
            >
              <Caption style={[styles.chipText, !category && styles.chipTextActive]}>{t('allFilter')}</Caption>
            </TouchableOpacity>
            {CATEGORY_META.map((c) => {
              const active = category === c.key;
              return (
                <TouchableOpacity
                  key={c.key}
                  style={[styles.chip, { borderColor: c.color }, active && { backgroundColor: c.color }]}
                  onPress={() => setCategory(active ? null : c.key)}
                >
                  <Caption style={[styles.chipText, { color: active ? '#FFF' : c.color }]}>{t(c.labelKey)}</Caption>
                </TouchableOpacity>
              );
            })}
          </View>

          <Caption style={styles.filterLabel}>{t('activityTypeLabel')}</Caption>
          <View style={styles.chipRow}>
            <TouchableOpacity
              style={[styles.chip, !activityType && styles.chipActiveNeutral]}
              onPress={() => setActivityType(null)}
            >
              <Caption style={[styles.chipText, !activityType && styles.chipTextActive]}>{t('allFilter')}</Caption>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.chip, styles.gameChip, activityType === 'quiz' && styles.gameChipActive]}
              onPress={() => setActivityType(activityType === 'quiz' ? null : 'quiz')}
            >
              <Caption style={[styles.chipText, activityType === 'quiz' && { color: '#FFF' }]}>{t('gameTypeQuiz')}</Caption>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.chip, styles.gameChip, activityType === 'jigsaw' && styles.gameChipActive]}
              onPress={() => setActivityType(activityType === 'jigsaw' ? null : 'jigsaw')}
            >
              <Caption style={[styles.chipText, activityType === 'jigsaw' && { color: '#FFF' }]}>{t('gameTypeJigsaw')}</Caption>
            </TouchableOpacity>
          </View>

          <Caption style={styles.filterLabel}>{t('level')}</Caption>
          <View style={styles.chipRow}>
            <TouchableOpacity
              style={[styles.chip, !level && styles.chipActiveNeutral]}
              onPress={() => setLevel(null)}
            >
              <Caption style={[styles.chipText, !level && styles.chipTextActive]}>{t('allFilter')}</Caption>
            </TouchableOpacity>
            {LEVELS.map((lvl) => {
              const active = level === lvl;
              return (
                <TouchableOpacity
                  key={lvl}
                  style={[styles.chip, styles.gameChip, active && styles.gameChipActive]}
                  onPress={() => setLevel(active ? null : lvl)}
                >
                  <Caption style={[styles.chipText, active && { color: '#FFF' }]}>{t('levelChipShort', { n: lvl })}</Caption>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* STUDENT LIST */}
        {!ready && <Body style={styles.emptyText}>{t('loading')}</Body>}
        {ready && progression.length === 0 && (
          <Body style={styles.emptyText}>{t('noStudentsYetPerf')}</Body>
        )}

        {progression.map((p) => {
          const meta = TREND_META[p.trend];
          const hasAttempts = p.attempts.length > 0;
          const catMeta = category ? getCategoryMeta(category) : null;
          const totals = totalsByUid?.get(p.uid);
          return (
            <View key={p.uid} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.nameBlock}>
                  <H3 style={styles.studentName}>{p.studentName}</H3>
                  {totals && (
                    <Caption style={styles.totalsLine}>
                      {t('statPointsShort', { points: totals.totalPoints })} · {formatDuration(totals.totalTimeSec)}
                    </Caption>
                  )}
                </View>
                <View style={[styles.trendBadge, { backgroundColor: meta.color }]}>
                  <Ionicons name={meta.icon as any} size={12} color="#FFF" />
                  <Caption style={styles.trendBadgeText}>{t(meta.labelKey)}</Caption>
                </View>
              </View>

              {hasAttempts ? (
                <>
                  <View style={styles.deltaRow}>
                    <View style={styles.deltaBlock}>
                      <Caption style={styles.deltaLabel}>{t('statPoints')}</Caption>
                      <H3
                        style={[
                          styles.deltaValue,
                          { color: p.pointsDelta > 0 ? '#2E9E5B' : p.pointsDelta < 0 ? '#C4304A' : '#666' },
                        ]}
                      >
                        {formatDelta(p.pointsDelta, ' pts')}
                      </H3>
                      <Caption style={styles.deltaSub}>
                        {p.earlyAvgPoints.toFixed(1)} → {p.lateAvgPoints.toFixed(1)}
                      </Caption>
                    </View>
                    <View style={styles.deltaBlock}>
                      <Caption style={styles.deltaLabel}>{t('statSpeed')}</Caption>
                      <H3
                        style={[
                          styles.deltaValue,
                          { color: p.timeDelta > 0 ? '#2E9E5B' : p.timeDelta < 0 ? '#C4304A' : '#666' },
                        ]}
                      >
                        {formatDelta(p.timeDelta, 's')}
                      </H3>
                      <Caption style={styles.deltaSub}>
                        {p.earlyAvgTime.toFixed(1)}s → {p.lateAvgTime.toFixed(1)}s
                      </Caption>
                    </View>
                    <View style={styles.deltaBlock}>
                      <Caption style={styles.deltaLabel}>{t('statActivities')}</Caption>
                      <H3 style={styles.deltaValue}>
                        {totals ? `${totals.activitiesCompleted}/${totals.totalActivities}` : '—'}
                      </H3>
                    </View>
                  </View>

                  <View style={styles.dotsRow}>
                    {p.attempts.slice(-10).map((a: ActivityResult) => (
                      <View
                        key={a.id}
                        style={[
                          styles.medalDot,
                          { backgroundColor: a.timedOut ? '#8E8E93' : MEDAL_DOT_COLOR[a.medal ?? ''] || '#B0B0B0' },
                        ]}
                      />
                    ))}
                  </View>
                </>
              ) : (
                <Caption style={styles.noAttemptsText}>
                  {catMeta ? t('noAttemptsInCategory', { category: t(catMeta.labelKey) }) : t('noAttemptsAtAll')}
                </Caption>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5EFE0' },
  header: {
    backgroundColor: '#9B4FD6', paddingTop: 10, paddingBottom: 16, paddingHorizontal: 16,
    borderBottomLeftRadius: 20, borderBottomRightRadius: 20,
  },
  headerBack: { marginBottom: 4 },
  headerTitle: { color: '#FFF' },
  headerSubtitle: { color: '#FFF', opacity: 0.9, marginTop: 4 },

  scrollContent: { padding: 16, paddingBottom: 40 },

  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16, justifyContent: 'center' },
  summaryPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14 },
  summaryPillText: { color: '#FFF', fontFamily: tokens.font.bodyBold },

  filterCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#E0D5BE' },
  filterLabel: { fontFamily: tokens.font.bodyBold, color: '#333', marginTop: 6, marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1.5, borderColor: '#CCC', backgroundColor: '#FFF' },
  chipText: { fontFamily: tokens.font.bodyBold, color: '#5C3A21' },
  chipTextActive: { color: '#FFF' },
  chipActiveNeutral: { backgroundColor: '#5C3A21', borderColor: '#5C3A21' },
  gameChip: { borderColor: '#9B4FD6' },
  gameChipActive: { backgroundColor: '#9B4FD6' },

  emptyText: { textAlign: 'center', color: '#8E8E93', marginTop: 20 },

  card: { backgroundColor: '#FFF', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1.5, borderColor: '#E0D5BE' },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 6 },
  nameBlock: { flexShrink: 1, gap: 2 },
  studentName: { color: '#1A1A1A' },
  totalsLine: { color: '#666' },
  trendBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10 },
  trendBadgeText: { color: '#FFF', fontFamily: tokens.font.bodyBold },

  deltaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  deltaBlock: { alignItems: 'center', flex: 1 },
  deltaLabel: { color: '#8E8E93' },
  deltaValue: { fontFamily: tokens.font.display, marginTop: 2 },
  deltaSub: { color: '#8E8E93', marginTop: 2 },

  dotsRow: { flexDirection: 'row', gap: 5, marginTop: 12, flexWrap: 'wrap' },
  medalDot: { width: 10, height: 10, borderRadius: 5 },

  noAttemptsText: { color: '#8E8E93', fontStyle: 'italic' },
});