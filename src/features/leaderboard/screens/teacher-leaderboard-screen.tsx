import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useStudentResults, LearnerPace, ResultFilter, TROPHY_TIERS, Trophy, COMBINED_MAX_POINTS, COMBINED_MAX_TIME_SECONDS } from '@/features/results/context/student-results-context';
import CATEGORY_META from '@/shared/content/category-meta';
import { useRouter } from 'expo-router';

type SortMode = 'speed' | 'points';
const LEVELS = [1, 2, 3, 4, 5];

const TROPHY_COLORS: Record<'gold' | 'silver' | 'bronze', string> = {
  gold: '#FFC700',
  silver: '#A8AEB8',
  bronze: '#CD7F32',
};

function trophyIcon(trophy: Trophy, size = 15) {
  if (trophy === 'gold' || trophy === 'silver' || trophy === 'bronze') {
    return <Ionicons name="trophy" size={size} color={TROPHY_COLORS[trophy]} />;
  }
  return <Text style={{ color: '#8E8E93' }}>—</Text>;
}

function formatSeconds(total: number) {
  const s = Math.max(0, Math.round(total));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${mm}m ${ss.toString().padStart(2, '0')}s`;
}

const PACE_META: Record<LearnerPace, { label: string; color: string; icon: string }> = {
  fast: { label: '🚀 Mabilis Matuto', color: '#D4A017', icon: 'flash' },
  steady: { label: '🚶 Sakto sa Bilis', color: '#8E9AAF', icon: 'walk' },
  'needs-support': { label: '🐢 Kailangan ng Tulong', color: '#B08D57', icon: 'help-buoy' },
};

function starsDisplay(avgStars: number) {
  const rounded = Math.round(avgStars);
  return '⭐'.repeat(rounded) + '☆'.repeat(Math.max(0, 3 - rounded));
}

export default function TeacherLeaderboardScreen() {
  const router = useRouter();
  const { getLeaderboard, getFilteredResults, ready, clearResults } = useStudentResults();
  const [sortMode, setSortMode] = useState<SortMode>('speed');
  const [category, setCategory] = useState<string | null>(null);
  const [activityType, setActivityType] = useState<'quiz' | 'jigsaw' | null>(null);
  const [level, setLevel] = useState<number | null>(null);
  const [showLegend, setShowLegend] = useState(false);

  const isUnfiltered = !category && !activityType && !level;

  const filter: ResultFilter = useMemo(
    () => ({
      ...(category ? { category } : {}),
      ...(activityType ? { activityType } : {}),
      ...(level ? { level } : {}),
    }),
    [category, activityType, level]
  );

  const scopedResults = useMemo(() => getFilteredResults(filter), [getFilteredResults, filter]);
  const leaderboard = useMemo(() => getLeaderboard(filter), [getLeaderboard, filter]);

  const sorted = useMemo(() => {
    const list = [...leaderboard];
    if (sortMode === 'points') list.sort((a, b) => b.totalPoints - a.totalPoints);
    // 'speed' is already sorted fastest-first from the context
    return list;
  }, [leaderboard, sortMode]);

  // DELETE /results is scoped to this class and admin-only — a teacher gets a
  // clear 403 message back rather than a button that silently does nothing.
  const handleClear = () => {
    Alert.alert('I-clear ang Leaderboard?', 'Buburahin lahat ng naitalang resulta ng klaseng ito.', [
      { text: 'Kanselahin', style: 'cancel' },
      {
        text: 'I-clear',
        style: 'destructive',
        onPress: async () => {
          const result = await clearResults();
          Alert.alert(result.success ? 'Tapos na' : 'Hindi Nabura', result.message);
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <Ionicons name="chevron-back" size={22} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.headerTopRow}>
          <View>
            <Text style={styles.headerTitle}>Leaderboard</Text>
            <Text style={styles.headerSubtitle}>{scopedResults.length} kabuuang gawaing natapos · {leaderboard.length} estudyante</Text>
          </View>
          <TouchableOpacity style={styles.legendButton} onPress={() => setShowLegend((v) => !v)}>
            <Ionicons name="trophy" size={14} color="#2E9E5B" />
            <Text style={styles.legendButtonText}>Trophy Guide</Text>
          </TouchableOpacity>
        </View>
      </View>

      {showLegend && (
        <View style={styles.legendCard}>
          <Text style={styles.legendTitle}>Paano makakuha ng Trophy (Combined Quiz & Jigsaw, walang filter)</Text>
          {TROPHY_TIERS.map((t) => (
            <View key={t.trophy} style={styles.legendRow}>
              <Text style={styles.legendRowLabel}>{t.label}</Text>
              <Text style={styles.legendRowDetail}>{t.minPoints}+ pts · {t.timeLabel}</Text>
            </View>
          ))}
          <Text style={styles.legendFoot}>Max posible: {COMBINED_MAX_POINTS} pts sa {COMBINED_MAX_TIME_SECONDS.toLocaleString()} sec. Trophy ay makikita lamang kapag "Lahat" ang filter sa Kategorya, Uri ng Gawain, at Level.</Text>

          <View style={styles.legendDivider} />
          <Text style={styles.legendTitle}>Trophy = Pace (parehong batayan)</Text>
          <View style={styles.legendRow}>
            <Text style={styles.legendRowLabel}>{trophyIcon('gold')} Gold</Text>
            <Text style={styles.legendRowDetail}>→ 🚀 Mabilis Matuto (Fast Learner)</Text>
          </View>
          <View style={styles.legendRow}>
            <Text style={styles.legendRowLabel}>{trophyIcon('silver')} Silver</Text>
            <Text style={styles.legendRowDetail}>→ 🚶 Sakto sa Bilis (Steady/Normal)</Text>
          </View>
          <View style={styles.legendRow}>
            <Text style={styles.legendRowLabel}>{trophyIcon('bronze')} Bronze / Wala</Text>
            <Text style={styles.legendRowDetail}>→ 🐢 Kailangan ng Tulong (Needs Support)</Text>
          </View>
          <Text style={styles.legendFoot}>⭐ Stars = average na bituin kada gawain (3⭐ pinakamabilis/tama, 1⭐ pumasa lang, 0⭐ mali/timeout).</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent}>
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
              <Text style={[styles.chipText, activityType === 'quiz' && { color: '#FFF' }]}>Quiz</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.chip, styles.gameChip, activityType === 'jigsaw' && styles.gameChipActive]}
              onPress={() => setActivityType(activityType === 'jigsaw' ? null : 'jigsaw')}
            >
              <Text style={[styles.chipText, activityType === 'jigsaw' && { color: '#FFF' }]}>Jigsaw</Text>
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

        <View style={styles.sortRow}>
          <TouchableOpacity
            style={[styles.sortChip, sortMode === 'speed' && styles.sortChipActive]}
            onPress={() => setSortMode('speed')}
          >
            <Text style={[styles.sortChipText, sortMode === 'speed' && styles.sortChipTextActive]}>⏱ Pinakamabilis</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortChip, sortMode === 'points' && styles.sortChipActive]}
            onPress={() => setSortMode('points')}
          >
            <Text style={[styles.sortChipText, sortMode === 'points' && styles.sortChipTextActive]}>★ Pinakamataas na Puntos</Text>
          </TouchableOpacity>
        </View>

        {!ready && <Text style={styles.emptyText}>Naglo-load...</Text>}
        {ready && sorted.length === 0 && (
          <Text style={styles.emptyText}>Wala pang natatapos na gawain ang mga estudyante sa napiling filter.</Text>
        )}
        {sorted.map((s, i) => {
          const meta = PACE_META[s.pace];
          return (
            <TouchableOpacity
              key={s.studentName}
              style={styles.row}
              onPress={() => router.navigate({ pathname: '/student-summary', params: { studentName: s.studentName } })}
            >
              <Text style={styles.rank}>{i + 1}</Text>
              <View style={styles.rowMain}>
                <Text style={styles.studentName}>{s.studentName}</Text>
                <View style={[styles.paceBadge, { backgroundColor: meta.color }]}>
                  <Ionicons name={meta.icon as any} size={12} color="#FFF" />
                  <Text style={styles.paceBadgeText}>{meta.label}</Text>
                </View>
                <Text style={styles.starsLine}>{starsDisplay(s.avgStars)} ({s.avgStars.toFixed(1)} avg)</Text>
              </View>
              <View style={styles.statsBlock}>
                {isUnfiltered ? (
                  <Text style={styles.statLine}>{trophyIcon(s.trophy)} ★ {s.totalPoints}/{COMBINED_MAX_POINTS} pts</Text>
                ) : (
                  <Text style={styles.statLine}>★ {s.totalPoints} pts</Text>
                )}
                <Text style={styles.statLine}>⏱ {formatSeconds(s.totalTimeUsed)} total</Text>
                <Text style={styles.statLineSmall}>{s.attempts} gawain · {s.timeOuts} timeout</Text>
                {isUnfiltered && (
                  <Text style={styles.statLineSmall}>Quiz: {s.quizCorrect}/30 tama</Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={18} color="#8E8E93" />
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {scopedResults.length > 0 && (
        <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
          <Text style={styles.clearButtonText}>I-clear ang Lahat ng Data</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5EFE0' },
  header: { backgroundColor: '#2E9E5B', paddingTop: 10, paddingBottom: 16, paddingHorizontal: 16, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerBack: { marginBottom: 4 },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { color: '#FFF', fontWeight: 'bold', fontSize: 19 },
  headerSubtitle: { color: '#FFF', fontSize: 12, opacity: 0.9, marginTop: 2 },
  legendButton: {
    flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FFF',
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 14,
  },
  legendButtonText: { fontSize: 11, fontWeight: 'bold', color: '#2E9E5B' },
  legendCard: {
    marginHorizontal: 16, marginTop: 12, backgroundColor: '#FFF', borderRadius: 14, padding: 14,
    borderWidth: 1.5, borderColor: '#2E9E5B',
  },
  legendTitle: { fontSize: 12.5, fontWeight: 'bold', color: '#5C3A21', marginBottom: 8 },
  legendRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  legendRowLabel: { fontSize: 12, fontWeight: '700', color: '#1A1A1A' },
  legendRowDetail: { fontSize: 11, color: '#5C3A21', fontWeight: '600' },
  legendFoot: { fontSize: 10, color: '#8E8E93', marginTop: 8, fontStyle: 'italic' },
  legendDivider: { height: 1, backgroundColor: '#E0D5BE', marginVertical: 10 },

  scrollContent: { padding: 16, paddingBottom: 20 },

  filterCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#E0D5BE' },
  filterLabel: { fontSize: 12, fontWeight: 'bold', color: '#333', marginTop: 6, marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1.5, borderColor: '#CCC', backgroundColor: '#FFF' },
  chipText: { fontWeight: 'bold', fontSize: 11.5, color: '#5C3A21' },
  chipTextActive: { color: '#FFF' },
  chipActiveNeutral: { backgroundColor: '#5C3A21', borderColor: '#5C3A21' },
  gameChip: { borderColor: '#2E9E5B' },
  gameChipActive: { backgroundColor: '#2E9E5B' },

  sortRow: { flexDirection: 'row', gap: 8, marginBottom: 14, justifyContent: 'center' },
  sortChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, backgroundColor: '#E5DCC8' },
  sortChipActive: { backgroundColor: '#2E9E5B' },
  sortChipText: { fontWeight: 'bold', fontSize: 12, color: '#5C3A21' },
  sortChipTextActive: { color: '#FFF' },

  emptyText: { textAlign: 'center', color: '#8E8E93', marginTop: 20, fontSize: 13 },
  row: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 14,
    padding: 12, borderWidth: 1.5, borderColor: '#E0D5BE', gap: 10, marginBottom: 10,
  },
  rank: { fontWeight: '900', fontSize: 18, color: '#5C3A21', width: 24, textAlign: 'center' },
  rowMain: { flex: 1 },
  studentName: { fontWeight: 'bold', fontSize: 14.5, color: '#1A1A1A', marginBottom: 4 },
  paceBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  paceBadgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  starsLine: { fontSize: 11, color: '#5C3A21', marginTop: 4, fontWeight: '600' },
  statsBlock: { alignItems: 'flex-end' },
  statLine: { fontSize: 12, fontWeight: '700', color: '#5C3A21' },
  statLineSmall: { fontSize: 10, color: '#8E8E93', marginTop: 2 },
  clearButton: { alignSelf: 'center', marginBottom: 16, marginTop: 4, paddingVertical: 10, paddingHorizontal: 22, borderRadius: 18, backgroundColor: '#C4304A' },
  clearButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
});