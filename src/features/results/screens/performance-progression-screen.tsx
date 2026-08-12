import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '@/shared/i18n/language-context';
import { useClass } from '@/features/teacher/context/class-context';
import {
  useStudentResults,
  ProgressionTrend,
  StudentProgression,
  ResultFilter,
  ActivityResult,
} from '@/features/results/context/student-results-context';
import CATEGORY_META, { getCategoryMeta } from '@/shared/content/category-meta';
import { useRouter } from 'expo-router';

const LEVELS = [1, 2, 3, 4, 5];

const TREND_META: Record<
  ProgressionTrend,
  { label: string; color: string; icon: string; order: number }
> = {
  improving: { label: 'Umuunlad', color: '#2E9E5B', icon: 'trending-up', order: 0 },
  steady: { label: 'Pantay-pantay', color: '#3B7DD8', icon: 'remove-circle', order: 1 },
  'needs-support': { label: 'Kailangan ng Tulong', color: '#C4304A', icon: 'trending-down', order: 2 },
  'not-enough-data': { label: 'Kulang ang Datos', color: '#C9631D', icon: 'time', order: 3 },
  'not-started': { label: 'Hindi pa Nakasali', color: '#8E8E93', icon: 'ellipse-outline', order: 4 },
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
  const { students } = useClass();
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

  const rosterNames = useMemo(() => students.map((s) => s.name), [students]);

  const progression = useMemo<StudentProgression[]>(() => {
    const list = getProgression(rosterNames, filter);
    return [...list].sort((a, b) => {
      const orderDiff = TREND_META[a.trend].order - TREND_META[b.trend].order;
      if (orderDiff !== 0) return orderDiff;
      return b.pointsDelta - a.pointsDelta;
    });
  }, [rosterNames, filter, getProgression]);

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
        <Text style={styles.headerTitle}>{t('performanceProgression')}</Text>
        <Text style={styles.headerSubtitle}>
          Hinahambing ang unang mga sagot laban sa pinakabagong mga sagot para makita kung sino ang umuunlad.
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* SUMMARY PILLS */}
        <View style={styles.summaryRow}>
          {(Object.keys(TREND_META) as ProgressionTrend[]).map((key) => {
            const meta = TREND_META[key];
            return (
              <View key={key} style={[styles.summaryPill, { backgroundColor: meta.color }]}>
                <Ionicons name={meta.icon as any} size={13} color="#FFF" />
                <Text style={styles.summaryPillText}>{counts[key]}</Text>
              </View>
            );
          })}
        </View>

        {/* FILTERS */}
        <View style={styles.filterCard}>
          <Text style={styles.filterLabel}>Kategorya</Text>
          <View style={styles.chipRow}>
            <TouchableOpacity
              style={[styles.chip, !category && styles.chipActiveNeutral]}
              onPress={() => setCategory(null)}
            >
              <Text style={[styles.chipText, !category && styles.chipTextActive]}>Lahat</Text>
            </TouchableOpacity>
            {CATEGORY_META.map((c) => {
              const active = category === c.key;
              return (
                <TouchableOpacity
                  key={c.key}
                  style={[styles.chip, { borderColor: c.color }, active && { backgroundColor: c.color }]}
                  onPress={() => setCategory(active ? null : c.key)}
                >
                  <Text style={[styles.chipText, { color: active ? '#FFF' : c.color }]}>{c.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.filterLabel}>Uri ng Gawain</Text>
          <View style={styles.chipRow}>
            <TouchableOpacity
              style={[styles.chip, !activityType && styles.chipActiveNeutral]}
              onPress={() => setActivityType(null)}
            >
              <Text style={[styles.chipText, !activityType && styles.chipTextActive]}>Lahat</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.chip, styles.gameChip, activityType === 'quiz' && styles.gameChipActive]}
              onPress={() => setActivityType(activityType === 'quiz' ? null : 'quiz')}
            >
              <Text style={[styles.chipText, activityType === 'quiz' && { color: '#FFF' }]}>{t('gameTypeQuiz')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.chip, styles.gameChip, activityType === 'jigsaw' && styles.gameChipActive]}
              onPress={() => setActivityType(activityType === 'jigsaw' ? null : 'jigsaw')}
            >
              <Text style={[styles.chipText, activityType === 'jigsaw' && { color: '#FFF' }]}>{t('gameTypeJigsaw')}</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.filterLabel}>Level</Text>
          <View style={styles.chipRow}>
            <TouchableOpacity
              style={[styles.chip, !level && styles.chipActiveNeutral]}
              onPress={() => setLevel(null)}
            >
              <Text style={[styles.chipText, !level && styles.chipTextActive]}>Lahat</Text>
            </TouchableOpacity>
            {LEVELS.map((lvl) => {
              const active = level === lvl;
              return (
                <TouchableOpacity
                  key={lvl}
                  style={[styles.chip, styles.gameChip, active && styles.gameChipActive]}
                  onPress={() => setLevel(active ? null : lvl)}
                >
                  <Text style={[styles.chipText, active && { color: '#FFF' }]}>Lvl {lvl}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* STUDENT LIST */}
        {!ready && <Text style={styles.emptyText}>Naglo-load...</Text>}
        {ready && progression.length === 0 && (
          <Text style={styles.emptyText}>Wala pang estudyanteng nakarehistro o may resulta.</Text>
        )}

        {progression.map((p) => {
          const meta = TREND_META[p.trend];
          const hasAttempts = p.attempts.length > 0;
          const catMeta = category ? getCategoryMeta(category) : null;
          return (
            <View key={p.studentName} style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.studentName}>{p.studentName}</Text>
                <View style={[styles.trendBadge, { backgroundColor: meta.color }]}>
                  <Ionicons name={meta.icon as any} size={12} color="#FFF" />
                  <Text style={styles.trendBadgeText}>{meta.label}</Text>
                </View>
              </View>

              {hasAttempts ? (
                <>
                  <View style={styles.deltaRow}>
                    <View style={styles.deltaBlock}>
                      <Text style={styles.deltaLabel}>★ Puntos</Text>
                      <Text
                        style={[
                          styles.deltaValue,
                          { color: p.pointsDelta > 0 ? '#2E9E5B' : p.pointsDelta < 0 ? '#C4304A' : '#666' },
                        ]}
                      >
                        {formatDelta(p.pointsDelta, ' pts')}
                      </Text>
                      <Text style={styles.deltaSub}>
                        {p.earlyAvgPoints.toFixed(1)} → {p.lateAvgPoints.toFixed(1)}
                      </Text>
                    </View>
                    <View style={styles.deltaBlock}>
                      <Text style={styles.deltaLabel}>⏱ Bilis</Text>
                      <Text
                        style={[
                          styles.deltaValue,
                          { color: p.timeDelta > 0 ? '#2E9E5B' : p.timeDelta < 0 ? '#C4304A' : '#666' },
                        ]}
                      >
                        {formatDelta(p.timeDelta, 's')}
                      </Text>
                      <Text style={styles.deltaSub}>
                        {p.earlyAvgTime.toFixed(1)}s → {p.lateAvgTime.toFixed(1)}s
                      </Text>
                    </View>
                    <View style={styles.deltaBlock}>
                      <Text style={styles.deltaLabel}>Gawain</Text>
                      <Text style={styles.deltaValue}>{p.attempts.length}</Text>
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
                <Text style={styles.noAttemptsText}>Wala pang sinagutang gawain{catMeta ? ` sa ${catMeta.label}` : ''}.</Text>
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
  headerTitle: { color: '#FFF', fontWeight: 'bold', fontSize: 19 },
  headerSubtitle: { color: '#FFF', fontSize: 11.5, opacity: 0.9, marginTop: 4, lineHeight: 15 },

  scrollContent: { padding: 16, paddingBottom: 40 },

  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16, justifyContent: 'center' },
  summaryPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14 },
  summaryPillText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },

  filterCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#E0D5BE' },
  filterLabel: { fontSize: 12, fontWeight: 'bold', color: '#333', marginTop: 6, marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1.5, borderColor: '#CCC', backgroundColor: '#FFF' },
  chipText: { fontWeight: 'bold', fontSize: 11.5, color: '#5C3A21' },
  chipTextActive: { color: '#FFF' },
  chipActiveNeutral: { backgroundColor: '#5C3A21', borderColor: '#5C3A21' },
  gameChip: { borderColor: '#9B4FD6' },
  gameChipActive: { backgroundColor: '#9B4FD6' },

  emptyText: { textAlign: 'center', color: '#8E8E93', marginTop: 20, fontSize: 13 },

  card: { backgroundColor: '#FFF', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1.5, borderColor: '#E0D5BE' },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 6 },
  studentName: { fontWeight: 'bold', fontSize: 14.5, color: '#1A1A1A' },
  trendBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10 },
  trendBadgeText: { color: '#FFF', fontSize: 10.5, fontWeight: 'bold' },

  deltaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  deltaBlock: { alignItems: 'center', flex: 1 },
  deltaLabel: { fontSize: 10.5, color: '#8E8E93', fontWeight: '600' },
  deltaValue: { fontSize: 15, fontWeight: '900', marginTop: 2 },
  deltaSub: { fontSize: 10, color: '#8E8E93', marginTop: 2 },

  dotsRow: { flexDirection: 'row', gap: 5, marginTop: 12, flexWrap: 'wrap' },
  medalDot: { width: 10, height: 10, borderRadius: 5 },

  noAttemptsText: { fontSize: 12, color: '#8E8E93', fontStyle: 'italic' },
});