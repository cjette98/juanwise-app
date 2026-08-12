import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useStudentResults, TROPHY_TIERS, Trophy, COMBINED_MAX_POINTS, COMBINED_MAX_TIME_SECONDS, LearnerPace } from '@/features/results/context/student-results-context';
import { useUser } from '@/features/auth/context/user-context';
import { useRouter } from 'expo-router';

type SortMode = 'points' | 'speed';

const PACE_META: Record<LearnerPace, { label: string; color: string }> = {
  fast: { label: '🚀 Mabilis Matuto', color: '#D4A017' },
  steady: { label: '🚶 Sakto sa Bilis', color: '#8E9AAF' },
  'needs-support': { label: '🐢 Kailangan ng Tulong', color: '#B08D57' },
};

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

function starsDisplay(avgStars: number) {
  const rounded = Math.round(avgStars);
  return '⭐'.repeat(rounded) + '☆'.repeat(Math.max(0, 3 - rounded));
}

function formatSeconds(total: number) {
  const s = Math.max(0, Math.round(total));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${mm}m ${ss.toString().padStart(2, '0')}s`;
}

export default function StudentLeaderboardScreen() {
  const router = useRouter();
  const { name } = useUser();
  const { leaderboard, ready } = useStudentResults();
  const [sortMode, setSortMode] = useState<SortMode>('points');
  const [peekStudent, setPeekStudent] = useState<string | null>(null);
  const [showLegend, setShowLegend] = useState(false);

  const sorted = useMemo(() => {
    const list = [...leaderboard];
    if (sortMode === 'points') list.sort((a, b) => b.totalPoints - a.totalPoints);
    // 'speed' is already sorted fastest-average-time-first from the context
    return list;
  }, [leaderboard, sortMode]);

  const myRankIndex = sorted.findIndex((s) => s.studentName === name);
  const myRank = myRankIndex >= 0 ? myRankIndex + 1 : null;
  const mySummary = myRankIndex >= 0 ? sorted[myRankIndex] : null;

  const peekSummary = peekStudent ? sorted.find((s) => s.studentName === peekStudent) || null : null;

  const handleRowPress = (studentName: string) => {
    if (studentName === name) {
      router.navigate({ pathname: '/student-summary', params: { studentName } });
    } else {
      setPeekStudent(studentName);
    }
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
            <Text style={styles.headerSubtitle}>{leaderboard.length} estudyanteng may resulta</Text>
          </View>
          <TouchableOpacity style={styles.legendButton} onPress={() => setShowLegend((v) => !v)}>
            <Ionicons name="trophy" size={14} color="#D63B6E" />
            <Text style={styles.legendButtonText}>Trophy Guide</Text>
          </TouchableOpacity>
        </View>
      </View>

      {showLegend && (
        <View style={styles.legendCard}>
          <Text style={styles.legendTitle}>Paano makakuha ng Trophy (Combined Quiz & Jigsaw)</Text>
          {TROPHY_TIERS.map((t) => (
            <View key={t.trophy} style={styles.legendRow}>
              <Text style={styles.legendRowLabel}>{t.label}</Text>
              <Text style={styles.legendRowDetail}>{t.minPoints}+ pts · {t.timeLabel}</Text>
            </View>
          ))}
          <Text style={styles.legendFoot}>Max posible: {COMBINED_MAX_POINTS} pts sa {COMBINED_MAX_TIME_SECONDS.toLocaleString()} sec (Quiz + Jigsaw, lahat ng level)</Text>

          <View style={styles.legendDivider} />
          <View style={styles.legendRow}>
            <Text style={styles.legendRowLabel}>{trophyIcon('gold')} Gold</Text>
            <Text style={styles.legendRowDetail}>→ 🚀 Mabilis Matuto</Text>
          </View>
          <View style={styles.legendRow}>
            <Text style={styles.legendRowLabel}>{trophyIcon('silver')} Silver</Text>
            <Text style={styles.legendRowDetail}>→ 🚶 Sakto sa Bilis</Text>
          </View>
          <View style={styles.legendRow}>
            <Text style={styles.legendRowLabel}>{trophyIcon('bronze')} Bronze / Wala</Text>
            <Text style={styles.legendRowDetail}>→ 🐢 Kailangan ng Tulong</Text>
          </View>
          <Text style={styles.legendFoot}>⭐ Stars = average na bituin kada gawain</Text>
        </View>
      )}

      {mySummary && (
        <TouchableOpacity style={styles.myRankCard} onPress={() => router.navigate({ pathname: '/student-summary', params: { studentName: name } })}>
          <Text style={styles.myRankLabel}>Ranggo mo · Tap para sa buong record</Text>
          <Text style={styles.myRankNumber}>#{myRank}</Text>
          <View style={[styles.paceBadge, { backgroundColor: PACE_META[mySummary.pace].color }]}>
            <Text style={styles.paceBadgeText}>{PACE_META[mySummary.pace].label}</Text>
          </View>
          <View style={styles.myRankStats}>
            <Text style={styles.myRankStat}>{trophyIcon(mySummary.trophy)} Trophy</Text>
            <Text style={styles.myRankStat}>★ {mySummary.totalPoints}/900 pts</Text>
            <Text style={styles.myRankStat}>⏱ {formatSeconds(mySummary.totalTimeUsed)}</Text>
          </View>
          <Text style={styles.myRankStars}>{starsDisplay(mySummary.avgStars)} ({mySummary.avgStars.toFixed(1)} avg)</Text>
          <Text style={styles.myRankQuiz}>✅ {mySummary.quizCorrect}/30 tama · ❌ {mySummary.quizWrongOutOf30}/30 mali (Quiz)</Text>
        </TouchableOpacity>
      )}

      <View style={styles.sortRow}>
        <TouchableOpacity
          style={[styles.sortChip, sortMode === 'points' && styles.sortChipActive]}
          onPress={() => setSortMode('points')}
        >
          <Text style={[styles.sortChipText, sortMode === 'points' && styles.sortChipTextActive]}>★ Puntos</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sortChip, sortMode === 'speed' && styles.sortChipActive]}
          onPress={() => setSortMode('speed')}
        >
          <Text style={[styles.sortChipText, sortMode === 'speed' && styles.sortChipTextActive]}>⏱ Bilis</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {!ready && <Text style={styles.emptyText}>Naglo-load...</Text>}
        {ready && sorted.length === 0 && (
          <Text style={styles.emptyText}>Wala pang natatapos na gawain. Sagutan ang isang Quiz o Jigsaw Puzzle para lumabas dito.</Text>
        )}
        {sorted.map((s, i) => {
          const isMe = s.studentName === name;
          return (
            <TouchableOpacity
              key={s.studentName}
              style={[styles.row, isMe && styles.rowMine]}
              onPress={() => handleRowPress(s.studentName)}
            >
              <Text style={styles.rank}>{i + 1}</Text>
              <View style={styles.rowMain}>
                <Text style={styles.studentName}>{s.studentName}{isMe ? ' (Ikaw)' : ''}</Text>
                <Text style={styles.rowSub}>{s.attempts} gawain natapos</Text>
                <View style={[styles.rowPaceBadge, { backgroundColor: PACE_META[s.pace].color }]}>
                  <Text style={styles.rowPaceBadgeText}>{PACE_META[s.pace].label}</Text>
                </View>
              </View>
              <View style={styles.statsBlock}>
                <Text style={styles.statLine}>{trophyIcon(s.trophy)} ★ {s.totalPoints} pts</Text>
                <Text style={styles.statLineSmall}>⏱ {formatSeconds(s.totalTimeUsed)}</Text>
                <Text style={styles.statLineSmall}>{starsDisplay(s.avgStars)}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Quick public peek — points & time are visible to everyone, same as
          the leaderboard row itself. The full per-category/level breakdown
          is only reachable by tapping your OWN row (see handleRowPress). */}
      <Modal visible={!!peekStudent} transparent animationType="fade" onRequestClose={() => setPeekStudent(null)}>
        <TouchableOpacity style={styles.peekOverlay} activeOpacity={1} onPress={() => setPeekStudent(null)}>
          <View style={styles.peekCard}>
            <Text style={styles.peekName}>{peekStudent}</Text>
            {peekSummary && (
              <>
                <View style={[styles.paceBadge, { backgroundColor: PACE_META[peekSummary.pace].color, marginBottom: 8 }]}>
                  <Text style={styles.paceBadgeText}>{PACE_META[peekSummary.pace].label}</Text>
                </View>
                <View style={styles.peekStatsRow}>
                  <Text style={styles.peekStat}>{trophyIcon(peekSummary.trophy)} Trophy</Text>
                  <Text style={styles.peekStat}>★ {peekSummary.totalPoints} pts</Text>
                  <Text style={styles.peekStat}>⏱ {formatSeconds(peekSummary.totalTimeUsed)}</Text>
                </View>
                <Text style={styles.peekStars}>{starsDisplay(peekSummary.avgStars)}</Text>
              </>
            )}
            <Text style={styles.peekHint}>Tap kahit saan para isara</Text>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5EFE0' },
  header: {
    backgroundColor: '#D63B6E', paddingTop: 10, paddingBottom: 16, paddingHorizontal: 16,
    borderBottomLeftRadius: 20, borderBottomRightRadius: 20,
  },
  headerBack: { marginBottom: 4 },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { color: '#FFF', fontWeight: 'bold', fontSize: 19 },
  headerSubtitle: { color: '#FFF', fontSize: 12, opacity: 0.9, marginTop: 2 },
  legendButton: {
    flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FFF',
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 14,
  },
  legendButtonText: { fontSize: 11, fontWeight: 'bold', color: '#D63B6E' },
  legendCard: {
    margin: 16, marginBottom: 0, backgroundColor: '#FFF', borderRadius: 14, padding: 14,
    borderWidth: 1.5, borderColor: '#D63B6E',
  },
  legendTitle: { fontSize: 12.5, fontWeight: 'bold', color: '#5C3A21', marginBottom: 8 },
  legendRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  legendRowLabel: { fontSize: 12, fontWeight: '700', color: '#1A1A1A' },
  legendRowDetail: { fontSize: 11, color: '#5C3A21', fontWeight: '600' },
  legendFoot: { fontSize: 10, color: '#8E8E93', marginTop: 8, fontStyle: 'italic' },
  legendDivider: { height: 1, backgroundColor: '#E0D5BE', marginVertical: 10 },
  myRankCard: {
    margin: 16, marginBottom: 0, backgroundColor: '#FFF', borderRadius: 16, padding: 16,
    alignItems: 'center', borderWidth: 2, borderColor: '#D63B6E',
  },
  myRankLabel: { fontSize: 12, color: '#8E8E93', fontWeight: '600' },
  myRankNumber: { fontSize: 32, fontWeight: '900', color: '#D63B6E', marginVertical: 2 },
  myRankStats: { flexDirection: 'row', gap: 16, marginTop: 4 },
  myRankStat: { fontSize: 12.5, fontWeight: '700', color: '#5C3A21' },
  myRankStars: { fontSize: 13, marginTop: 6 },
  myRankQuiz: { fontSize: 11, color: '#8E8E93', marginTop: 8, fontWeight: '600' },
  paceBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, marginTop: 8 },
  paceBadgeText: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },
  rowPaceBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginTop: 4 },
  rowPaceBadgeText: { color: '#FFF', fontSize: 9.5, fontWeight: 'bold' },
  sortRow: { flexDirection: 'row', gap: 8, padding: 14, justifyContent: 'center' },
  sortChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, backgroundColor: '#E5DCC8' },
  sortChipActive: { backgroundColor: '#D63B6E' },
  sortChipText: { fontWeight: 'bold', fontSize: 12, color: '#5C3A21' },
  sortChipTextActive: { color: '#FFF' },
  list: { padding: 16, paddingTop: 0, gap: 10 },
  emptyText: { textAlign: 'center', color: '#8E8E93', marginTop: 30, fontSize: 13, paddingHorizontal: 10 },
  row: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 14,
    padding: 12, borderWidth: 1.5, borderColor: '#E0D5BE', gap: 10,
  },
  rowMine: { borderColor: '#D63B6E', backgroundColor: '#FCEAF0' },
  rank: { fontWeight: '900', fontSize: 18, color: '#5C3A21', width: 24, textAlign: 'center' },
  rowMain: { flex: 1 },
  studentName: { fontWeight: 'bold', fontSize: 14.5, color: '#1A1A1A' },
  rowSub: { fontSize: 11, color: '#8E8E93', marginTop: 2 },
  statsBlock: { alignItems: 'flex-end' },
  statLine: { fontSize: 12.5, fontWeight: '700', color: '#5C3A21' },
  statLineSmall: { fontSize: 10.5, color: '#8E8E93', marginTop: 2 },
  peekOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  peekCard: { backgroundColor: '#FFF', borderRadius: 18, padding: 20, width: '100%', alignItems: 'center', borderWidth: 2, borderColor: '#D63B6E' },
  peekName: { fontSize: 17, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 10 },
  peekStatsRow: { flexDirection: 'row', gap: 14, flexWrap: 'wrap', justifyContent: 'center' },
  peekStat: { fontSize: 13, fontWeight: '700', color: '#5C3A21' },
  peekStars: { fontSize: 15, marginTop: 10 },
  peekHint: { fontSize: 10.5, color: '#8E8E93', marginTop: 14 },
});