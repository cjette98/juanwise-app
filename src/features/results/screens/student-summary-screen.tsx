import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useStudentResults, ActivityResult, getCanonicalAttempts, TROPHY_TIERS, Trophy, COMBINED_MAX_POINTS, COMBINED_MAX_TIME_SECONDS } from '@/features/results/context/student-results-context';
import CATEGORY_META from '@/shared/content/category-meta';
import { useRouter, useLocalSearchParams } from 'expo-router';

const LEVELS = [1, 2, 3, 4, 5];
const ACTIVITY_TYPES: { key: 'quiz' | 'jigsaw'; label: string }[] = [
  { key: 'quiz', label: 'Quiz' },
  { key: 'jigsaw', label: 'Jigsaw Puzzle' },
];

function medalForPoints(points: number): 'gold' | 'silver' | 'bronze' | null {
  if (points >= 75) return 'gold';
  if (points >= 50) return 'silver';
  if (points >= 25) return 'bronze';
  return null;
}

function medalEmoji(medal: 'gold' | 'silver' | 'bronze' | null) {
  if (medal === 'gold') return '🥇';
  if (medal === 'silver') return '🥈';
  if (medal === 'bronze') return '🥉';
  return '—';
}

function formatTime(seconds: number) {
  const s = Math.max(0, Math.round(seconds));
  const mm = Math.floor(s / 60).toString().padStart(2, '0');
  const ss = (s % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
}

function formatDate(timestamp: number) {
  const d = new Date(timestamp);
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
}

function trophyEmoji(trophy: Trophy) {
  if (trophy === 'gold') return '🥇';
  if (trophy === 'silver') return '🥈';
  if (trophy === 'bronze') return '🥉';
  return '—';
}

const PACE_META: Record<'fast' | 'steady' | 'needs-support', { label: string; color: string }> = {
  fast: { label: '🚀 Mabilis Matuto', color: '#D4A017' },
  steady: { label: '🚶 Sakto sa Bilis', color: '#8E9AAF' },
  'needs-support': { label: '🐢 Kailangan ng Tulong', color: '#B08D57' },
};

function starsDisplay(avgStars: number) {
  const rounded = Math.round(avgStars);
  return '⭐'.repeat(rounded) + '☆'.repeat(Math.max(0, 3 - rounded));
}

function computeTrophy(totalPoints: number, totalTimeUsed: number): Trophy {
  for (const tier of TROPHY_TIERS) {
    if (totalPoints >= tier.minPoints && totalTimeUsed <= tier.maxTimeSeconds) return tier.trophy;
  }
  return null;
}

// Same "passing attempt per activity #" logic used by LevelSummaryScreen —
// kept in sync here so level totals shown in this drill-down match exactly
// what the student saw on their own Level Summary screen.
function levelStats(attempts: ActivityResult[], level: number) {
  const forLevel = attempts.filter((a) => a.level === level);
  const perActivity = [1, 2, 3, 4, 5, 6].map((num) => {
    const forActivity = forLevel.filter((a) => a.activityNum === num);
    const passingAttempt = [...forActivity].reverse().find((a) => a.medal) || null;
    return passingAttempt;
  });
  const passedCount = perActivity.filter(Boolean).length;
  const totalPoints = perActivity.reduce((sum, a) => sum + (a?.points ?? 0), 0);
  const totalTime = perActivity.reduce((sum, a) => sum + (a?.timeUsed ?? 0), 0);
  const attempted = forLevel.length > 0;
  return { passedCount, totalPoints, totalTime, attempted, medal: medalForPoints(totalPoints) };
}

export default function StudentSummaryScreen() {
  const router = useRouter();
  const { studentName } = useLocalSearchParams<{ studentName: string }>();
  const { getFilteredResults, ready } = useStudentResults();

  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<Record<string, 'quiz' | 'jigsaw'>>({});
  const [viewMode, setViewMode] = useState<'summary' | 'history'>('summary');

  const allAttempts = useMemo(
    () => getFilteredResults({}).filter((r) => r.studentName === studentName),
    [getFilteredResults, studentName]
  );

  // Deduped to one canonical (best/passing) attempt per activity — retries
  // must not be summed multiple times. Used for every total/stat below.
  // The raw `allAttempts` is kept only for the chronological History feed,
  // which is meant to show every attempt including retries.
  const canonicalAttempts = useMemo(() => getCanonicalAttempts(allAttempts), [allAttempts]);

  const overallTotals = useMemo(() => {
    const totalPoints = canonicalAttempts.reduce((sum, a) => sum + a.points, 0);
    const totalTimeUsed = canonicalAttempts.reduce((sum, a) => sum + a.timeUsed, 0);
    const attempts = canonicalAttempts.length;
    const avgTime = attempts > 0 ? totalTimeUsed / attempts : 0;
    const trophy = computeTrophy(totalPoints, totalTimeUsed);
    const starsSum = canonicalAttempts.reduce((sum, a) => {
      const stars = a.medal === 'gold' ? 3 : a.medal === 'silver' ? 2 : a.medal === 'bronze' ? 1 : 0;
      return sum + stars;
    }, 0);
    const avgStars = attempts > 0 ? starsSum / attempts : 0;
    const pace: 'fast' | 'steady' | 'needs-support' =
      trophy === 'gold' ? 'fast' : trophy === 'silver' ? 'steady' : 'needs-support';
    return { totalPoints, totalTimeUsed, attempts, avgTime, trophy, avgStars, pace };
  }, [canonicalAttempts]);

  const categoryTotals = useMemo(() => {
    const map = new Map<string, { totalPoints: number; attempts: number }>();
    for (const c of CATEGORY_META) {
      const inCat = canonicalAttempts.filter((a) => a.category === c.key);
      map.set(c.key, {
        totalPoints: inCat.reduce((sum, a) => sum + a.points, 0),
        attempts: inCat.length,
      });
    }
    return map;
  }, [canonicalAttempts]);

  const historyFeed = useMemo(
    () => [...allAttempts].sort((a, b) => b.timestamp - a.timestamp),
    [allAttempts]
  );

  const toggleCategory = (key: string) => {
    setExpandedCategory((cur) => (cur === key ? null : key));
    if (!activeType[key]) setActiveType((cur) => ({ ...cur, [key]: 'quiz' }));
  };

  const openLevel = (category: string, label: string, color: string, activityType: 'quiz' | 'jigsaw', level: number) => {
    router.navigate({ pathname: '/level-summary', params: {
      category,
      label,
      color,
      activityType,
      level,
      viewStudentName: studentName,
      // Route params travel as strings; LevelSummary parses this back with toBool().
      readOnly: 'true',
    } });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <Ionicons name="chevron-back" size={22} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{studentName}</Text>
        <Text style={styles.headerSubtitle}>Kompletong Record — Buod at Kasaysayan ng Bawat Gawain</Text>
      </View>

      <View style={styles.overallCard}>
        <View style={styles.overallStat}>
          <Text style={styles.overallValue}>{trophyEmoji(overallTotals.trophy)}</Text>
          <Text style={styles.overallLabel}>Trophy</Text>
        </View>
        <View style={styles.overallStat}>
          <Text style={styles.overallValue}>★ {overallTotals.totalPoints}/{COMBINED_MAX_POINTS}</Text>
          <Text style={styles.overallLabel}>Kabuuang Puntos</Text>
        </View>
        <View style={styles.overallStat}>
          <Text style={styles.overallValue}>{overallTotals.attempts}</Text>
          <Text style={styles.overallLabel}>Gawaing Natapos</Text>
        </View>
        <View style={styles.overallStat}>
          <Text style={styles.overallValue}>⏱ {formatTime(overallTotals.totalTimeUsed)}</Text>
          <Text style={styles.overallLabel}>Kabuuang Oras</Text>
        </View>
      </View>

      <View style={styles.paceRow}>
        <View style={[styles.paceBadge, { backgroundColor: PACE_META[overallTotals.pace].color }]}>
          <Text style={styles.paceBadgeText}>{PACE_META[overallTotals.pace].label}</Text>
        </View>
        <Text style={styles.paceStars}>{starsDisplay(overallTotals.avgStars)} ({overallTotals.avgStars.toFixed(1)} avg)</Text>
      </View>

      <View style={styles.viewToggleRow}>
        <TouchableOpacity
          style={[styles.viewToggleChip, viewMode === 'summary' && styles.viewToggleChipActive]}
          onPress={() => setViewMode('summary')}
        >
          <Text style={[styles.viewToggleText, viewMode === 'summary' && styles.viewToggleTextActive]}>
            📊 Buod (Category/Level)
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewToggleChip, viewMode === 'history' && styles.viewToggleChipActive]}
          onPress={() => setViewMode('history')}
        >
          <Text style={[styles.viewToggleText, viewMode === 'history' && styles.viewToggleTextActive]}>
            🕒 Kasaysayan (Lahat ng Gawain)
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {!ready && <Text style={styles.emptyText}>Naglo-load...</Text>}
        {ready && allAttempts.length === 0 && (
          <Text style={styles.emptyText}>Wala pang natatapos na gawain ang estudyanteng ito.</Text>
        )}

        {ready && allAttempts.length > 0 && viewMode === 'history' && (
          <>
            {historyFeed.map((r) => {
              const meta = CATEGORY_META.find((c) => c.key === r.category) || CATEGORY_META[0];
              const typeIcon = r.activityType === 'jigsaw' ? '🧩' : '📝';
              return (
                <View key={r.id} style={[styles.historyRow, { borderColor: meta.color }]}>
                  <View style={styles.historyRowLeft}>
                    <Text style={[styles.historyCategory, { color: meta.color }]}>
                      {typeIcon} {meta.label}
                    </Text>
                    <Text style={styles.historyMeta}>
                      Level {r.level} · Activity {r.activityNum} · {formatDate(r.timestamp)}
                    </Text>
                  </View>
                  <View style={styles.historyRowRight}>
                    <Text style={styles.historyStatLine}>
                      {medalEmoji(r.medal)} {r.timedOut ? '⏰ Timeout' : `⏱ ${r.timeUsed}s`}
                    </Text>
                    <Text style={styles.historyStatPoints}>★ {r.points} pts</Text>
                  </View>
                </View>
              );
            })}
          </>
        )}

        {ready &&
          allAttempts.length > 0 &&
          viewMode === 'summary' &&
          CATEGORY_META.map((c) => {
            const isExpanded = expandedCategory === c.key;
            const totals = categoryTotals.get(c.key)!;
            const currentType = activeType[c.key] || 'quiz';
            const typedAttempts = allAttempts.filter((a) => a.category === c.key && a.activityType === currentType);

            return (
              <View key={c.key} style={[styles.categoryCard, { borderColor: c.color }]}>
                <TouchableOpacity style={styles.categoryHeader} onPress={() => toggleCategory(c.key)}>
                  <View style={[styles.categoryDot, { backgroundColor: c.color }]} />
                  <View style={styles.categoryHeaderMain}>
                    <Text style={styles.categoryLabel}>{c.label}</Text>
                    <Text style={styles.categorySub}>
                      {totals.attempts > 0 ? `★ ${totals.totalPoints} pts · ${totals.attempts} gawain` : 'Wala pang gawain'}
                    </Text>
                  </View>
                  <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={c.color} />
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.categoryBody}>
                    <View style={styles.typeRow}>
                      {ACTIVITY_TYPES.map((t) => {
                        const active = currentType === t.key;
                        return (
                          <TouchableOpacity
                            key={t.key}
                            style={[styles.typeChip, { borderColor: c.color }, active && { backgroundColor: c.color }]}
                            onPress={() => setActiveType((cur) => ({ ...cur, [c.key]: t.key }))}
                          >
                            <Text style={[styles.typeChipText, { color: active ? '#FFF' : c.color }]}>{t.label}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {LEVELS.map((lvl) => {
                      const stats = levelStats(typedAttempts, lvl);
                      return (
                        <TouchableOpacity
                          key={lvl}
                          style={styles.levelRow}
                          onPress={() => openLevel(c.key, c.label, c.color, currentType, lvl)}
                          disabled={!stats.attempted}
                        >
                          <Text style={styles.levelRowLabel}>Level {lvl}</Text>
                          {stats.attempted ? (
                            <View style={styles.levelRowStats}>
                              <Text style={styles.levelRowStat}>{medalEmoji(stats.medal)} {stats.passedCount}/6</Text>
                              <Text style={styles.levelRowStat}>★ {stats.totalPoints} pts</Text>
                              <Text style={styles.levelRowStatSmall}>⏱ {formatTime(stats.totalTime)}</Text>
                              <Ionicons name="chevron-forward" size={16} color="#8E8E93" />
                            </View>
                          ) : (
                            <Text style={styles.levelRowEmpty}>Wala pang gawain</Text>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
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
    backgroundColor: '#5C3A21', paddingTop: 10, paddingBottom: 16, paddingHorizontal: 16,
    borderBottomLeftRadius: 20, borderBottomRightRadius: 20,
  },
  headerBack: { marginBottom: 4 },
  headerTitle: { color: '#FFF', fontWeight: 'bold', fontSize: 19 },
  headerSubtitle: { color: '#FFF', fontSize: 11.5, opacity: 0.9, marginTop: 2 },

  overallCard: {
    flexDirection: 'row', backgroundColor: '#FFF', margin: 16, marginBottom: 8, borderRadius: 16,
    padding: 14, borderWidth: 2, borderColor: '#5C3A21', justifyContent: 'space-around',
  },
  paceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 4, marginBottom: 4 },
  paceBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14 },
  paceBadgeText: { color: '#FFF', fontSize: 11.5, fontWeight: 'bold' },
  paceStars: { fontSize: 13, fontWeight: '600', color: '#5C3A21' },
  overallStat: { alignItems: 'center' },
  overallValue: { fontSize: 16, fontWeight: '900', color: '#5C3A21' },
  overallLabel: { fontSize: 10, color: '#8E8E93', marginTop: 2, fontWeight: '600' },

  viewToggleRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginTop: 12, marginBottom: 4 },
  viewToggleChip: {
    flex: 1, paddingVertical: 9, borderRadius: 14, backgroundColor: '#E5DCC8', alignItems: 'center',
  },
  viewToggleChipActive: { backgroundColor: '#5C3A21' },
  viewToggleText: { fontWeight: 'bold', fontSize: 11.5, color: '#5C3A21' },
  viewToggleTextActive: { color: '#FFF' },

  historyRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 14,
    padding: 14, borderWidth: 2, justifyContent: 'space-between',
  },
  historyRowLeft: { flex: 1, paddingRight: 8 },
  historyCategory: { fontWeight: 'bold', fontSize: 13.5 },
  historyMeta: { fontSize: 11, color: '#8E8E93', marginTop: 2 },
  historyRowRight: { alignItems: 'flex-end' },
  historyStatLine: { fontSize: 12, fontWeight: '700', color: '#5C3A21' },
  historyStatPoints: { fontSize: 13, fontWeight: '900', color: '#E8801A', marginTop: 3 },

  scrollContent: { padding: 16, paddingTop: 8, paddingBottom: 30, gap: 12 },
  emptyText: { textAlign: 'center', color: '#8E8E93', marginTop: 30, fontSize: 13, paddingHorizontal: 10 },

  categoryCard: { backgroundColor: '#FFF', borderRadius: 16, borderWidth: 2, overflow: 'hidden' },
  categoryHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  categoryDot: { width: 12, height: 12, borderRadius: 6 },
  categoryHeaderMain: { flex: 1 },
  categoryLabel: { fontWeight: 'bold', fontSize: 14.5, color: '#1A1A1A' },
  categorySub: { fontSize: 11.5, color: '#8E8E93', marginTop: 2 },

  categoryBody: { paddingHorizontal: 14, paddingBottom: 14, gap: 8 },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  typeChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, borderWidth: 1.5 },
  typeChipText: { fontWeight: 'bold', fontSize: 11.5 },

  levelRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#F5EFE0', borderRadius: 10, paddingVertical: 9, paddingHorizontal: 12,
  },
  levelRowLabel: { fontWeight: '700', fontSize: 12.5, color: '#5C3A21' },
  levelRowStats: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  levelRowStat: { fontSize: 11.5, fontWeight: '700', color: '#5C3A21' },
  levelRowStatSmall: { fontSize: 10.5, color: '#8E8E93' },
  levelRowEmpty: { fontSize: 11, color: '#8E8E93', fontStyle: 'italic' },
});