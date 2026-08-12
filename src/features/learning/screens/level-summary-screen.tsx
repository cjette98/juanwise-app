import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStudentResults, ActivityResult } from '@/features/results/context/student-results-context';
import { useUser } from '@/features/auth/context/user-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { toNum, toBool } from '@/shared/lib/params';

type LevelMedal = 'gold' | 'silver' | 'bronze' | null;

function medalForPoints(points: number): LevelMedal {
  if (points >= 75) return 'gold';
  if (points >= 50) return 'silver';
  if (points >= 25) return 'bronze';
  return null;
}

function medalLabel(medal: LevelMedal) {
  if (medal === 'gold') return '🥇 Gold Medal';
  if (medal === 'silver') return '🥈 Silver Medal';
  if (medal === 'bronze') return '🥉 Bronze Medal';
  return '— Walang Medal Pa';
}

function starsForMedal(medal: ActivityResult['medal']) {
  if (medal === 'gold') return '⭐⭐⭐ 3 Stars';
  if (medal === 'silver') return '⭐⭐ 2 Stars';
  if (medal === 'bronze') return '⭐ 1 Star';
  return '—';
}

// Question format is determined by Level (Level 1 = MC, 2-3 = Identification,
// 4-5 = Enumeration) — see quizContent.ts getQuizQuestion().
function formatQuestionType(level: number) {
  if (level === 1) return 'MC';
  if (level <= 3) return 'ID';
  return 'Enum';
}

// Jigsaw piece count is determined by Activity number within the level
// (Activity 1-2 = 6pcs, 3-4 = 9pcs, 5-6 = 12pcs) — see ActivityListScreen.tsx.
function getJigsawPieceCount(activityNum: number) {
  if (activityNum <= 2) return 6;
  if (activityNum <= 4) return 9;
  return 12;
}

// Per-activity timer duration by activity type — Quiz = 60s, Jigsaw = 120s
// (per spec). Used to compute the level's total-time cap (6 activities).
function maxTimePerActivity(activityType: string) {
  return activityType === 'jigsaw' ? 120 : 60;
}

function formatTime(seconds: number) {
  const s = Math.max(0, Math.round(seconds));
  const mm = Math.floor(s / 60).toString().padStart(2, '0');
  const ss = (s % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
}

export default function LevelSummaryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    category: string;
    label: string;
    color: string;
    activityType: 'quiz' | 'jigsaw';
    level: string;
    viewStudentName?: string;
    readOnly?: string;
  }>();
  const { category, label, color, activityType, viewStudentName } = params;
  const level = toNum(params.level, 1);
  const readOnly = toBool(params.readOnly);
  const { name: loggedInName } = useUser();
  const studentName = viewStudentName || loggedInName;
  const isReadOnly = !!readOnly;
  const { getFilteredResults } = useStudentResults();

  // Every attempt (pass + fail) this student has made on this category /
  // level, oldest first — connected directly to what ActivityPlayScreen
  // recorded via addResult().
  const attempts = useMemo(
    () =>
      getFilteredResults({ category, activityType, level })
        .filter((r) => r.studentName === studentName)
        .sort((a, b) => a.timestamp - b.timestamp),
    [getFilteredResults, category, activityType, level, studentName]
  );

  const perActivity = useMemo(() => {
    return [1, 2, 3, 4, 5, 6].map((num) => {
      const forActivity = attempts.filter((a) => a.activityNum === num);
      const firstAttempt = forActivity[0] || null;
      // The attempt that actually unlocked this activity (medal set = pass).
      const passingAttempt = [...forActivity].reverse().find((a) => a.medal) || null;
      return {
        num,
        firstAttempt,
        passingAttempt,
        firstAttemptCorrect: !!firstAttempt?.medal,
      };
    });
  }, [attempts]);

  const allComplete = perActivity.every((a) => !!a.passingAttempt);

  const totalPoints = perActivity.reduce((sum, a) => sum + (a.passingAttempt?.points ?? 0), 0);
  const totalTime = perActivity.reduce((sum, a) => sum + (a.passingAttempt?.timeUsed ?? 0), 0);
  const totalTimeCap = maxTimePerActivity(activityType) * 6;
  const levelMedal = medalForPoints(totalPoints);

  const firstAttemptCorrectCount = perActivity.filter((a) => a.firstAttemptCorrect).length;
  const firstAttemptWrongCount = 6 - firstAttemptCorrectCount;

  const classification =
    firstAttemptCorrectCount >= 5 ? 'Fast Learner' : firstAttemptCorrectCount >= 3 ? 'Moderate Learner' : 'Slow Learner';
  const classificationIcon = firstAttemptCorrectCount >= 5 ? '⚡' : firstAttemptCorrectCount >= 3 ? '🙂' : '🐢';

  const handleProceed = () => {
    if (level < 5) {
      router.replace({ pathname: '/activity-list', params: { category, label, color, activityType, level: level + 1 } });
    } else {
      router.replace({ pathname: '/level-map', params: { category, label, color, activityType } });
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { backgroundColor: color }]}>
        <Text style={styles.headerTitle}>Level {level} — {label} {isReadOnly ? '📋 Summary' : '✅ Complete'}</Text>
        <Text style={styles.headerSubtitle}>Student: {studentName}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.medalCard}>
          <Text style={styles.medalLabel}>{medalLabel(levelMedal)}</Text>
          <Text style={styles.pointsText}>TOTAL POINTS: {totalPoints} / 90</Text>
          <Text style={styles.timeText}>TOTAL TIME: {totalTime} / {totalTimeCap} seconds</Text>
        </View>

        <View style={styles.trackingCard}>
          <Text style={styles.trackingTitle}>📊 LEARNER TRACKING (LEADERBOARD METRICS)</Text>
          <Text style={styles.trackingLine}>✅ First-Attempt Correct: {firstAttemptCorrectCount} / 6</Text>
          <Text style={styles.trackingLine}>🚩 First-Attempt Wrong: {firstAttemptWrongCount} / 6</Text>
          <Text style={styles.trackingLine}>
            {classificationIcon} Learner Classification: {classification}
          </Text>
        </View>

        <View style={styles.tableCard}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 1.2 }]}>Activity</Text>
            <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 1.1 }]}>Type</Text>
            <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 0.8 }]}>Time</Text>
            <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 1.3 }]}>Stars</Text>
            <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 1.1 }]}>Status</Text>
            <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 0.8 }]}>Pts</Text>
          </View>
          {perActivity.map((a) => {
            const p = a.passingAttempt;
            const typeLabel =
              activityType === 'jigsaw'
                ? `Jigsaw (${getJigsawPieceCount(a.num)} pcs)`
                : formatQuestionType(level);
            const statusLabel = p
              ? typeof p.requiredCount === 'number'
                ? `Passed ✅ (${p.correctCount}/${p.requiredCount})`
                : 'Passed ✅'
              : 'Retry ❌';
            return (
              <View key={a.num} style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 1.2 }]}>Activity {a.num}</Text>
                <Text style={[styles.tableCell, { flex: 1.1 }]}>{typeLabel}</Text>
                <Text style={[styles.tableCell, { flex: 0.8 }]}>{p ? formatTime(p.timeUsed) : '—'}</Text>
                <Text style={[styles.tableCell, { flex: 1.3 }]}>{p ? starsForMedal(p.medal) : '—'}</Text>
                <Text style={[styles.tableCell, { flex: 1.1 }]}>{statusLabel}</Text>
                <Text style={[styles.tableCell, { flex: 0.8 }]}>{p ? `${p.points} pts` : '0 pts'}</Text>
              </View>
            );
          })}
        </View>

        {!allComplete && (
          <View style={styles.warningCard}>
            <Text style={styles.warningText}>
              ⚠️ Ang ibang activities ay hindi pa naka-record ng resulta para sa student na ito. Bumalik sa Activity List para makumpleto.
            </Text>
          </View>
        )}
      </ScrollView>

      {isReadOnly ? (
        <TouchableOpacity style={[styles.proceedButton, { backgroundColor: color }]} onPress={handleBack}>
          <Text style={styles.proceedButtonText}>← Back to Summary</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.proceedButton, { backgroundColor: color }, !allComplete && styles.proceedButtonDisabled]}
          onPress={handleProceed}
          disabled={!allComplete}
        >
          <Text style={styles.proceedButtonText}>
            {level < 5 ? `Proceed to Next Level → Unlock Level ${level + 1}` : 'Proceed to Level Map'}
          </Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5EFE0' },
  header: { alignItems: 'center', paddingVertical: 18, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerTitle: { color: '#FFF', fontWeight: 'bold', fontSize: 17, textAlign: 'center', paddingHorizontal: 16 },
  headerSubtitle: { color: '#FCD116', fontSize: 13, marginTop: 6, fontWeight: '600' },
  body: { padding: 20, gap: 16 },
  medalCard: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 18, alignItems: 'center',
    borderWidth: 2, borderColor: '#E0D5BE',
  },
  medalLabel: { fontSize: 20, fontWeight: 'bold', color: '#5C3A21', marginBottom: 10 },
  pointsText: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 },
  timeText: { fontSize: 13, color: '#8E8E93' },
  trackingCard: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 16,
    borderWidth: 2, borderColor: '#E0D5BE', gap: 6,
  },
  trackingTitle: { fontSize: 13, fontWeight: 'bold', color: '#5C3A21', marginBottom: 4 },
  trackingLine: { fontSize: 13.5, color: '#2B2B2B' },
  tableCard: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 12,
    borderWidth: 2, borderColor: '#E0D5BE',
  },
  tableHeaderRow: { flexDirection: 'row', borderBottomWidth: 1.5, borderColor: '#E0D5BE', paddingBottom: 8, marginBottom: 4 },
  tableHeaderText: { fontWeight: 'bold', color: '#5C3A21' },
  tableRow: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderColor: '#F0EAD8' },
  tableCell: { fontSize: 11.5, color: '#2B2B2B' },
  warningCard: { backgroundColor: '#FCEAEA', borderRadius: 14, padding: 14 },
  warningText: { color: '#C4304A', fontSize: 12.5, lineHeight: 18 },
  proceedButton: { margin: 20, paddingVertical: 15, borderRadius: 25, alignItems: 'center' },
  proceedButtonDisabled: { opacity: 0.5 },
  proceedButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 14, textAlign: 'center' },
});