import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useStudentResults, ActivityResult } from '@/features/results/context/student-results-context';
import { useUser } from '@/features/auth/context/user-context';
import { getCategoryMeta } from '@/shared/content/category-meta';
import { useRouter } from 'expo-router';

function medalEmoji(medal: ActivityResult['medal']) {
  if (medal === 'gold') return '🥇';
  if (medal === 'silver') return '🥈';
  if (medal === 'bronze') return '🥉';
  return '—';
}

export default function QuizResultsScreen() {
  const router = useRouter();
  const { name } = useUser();
  const { results, ready } = useStudentResults();

  const quizResults = useMemo(
    () =>
      results
        .filter((r) => r.studentName === name && r.activityType === 'quiz')
        .sort((a, b) => b.timestamp - a.timestamp),
    [results, name]
  );

  const totalPoints = quizResults.reduce((sum, r) => sum + r.points, 0);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <Ionicons name="chevron-back" size={22} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quiz Results</Text>
        <Text style={styles.headerSubtitle}>
          {quizResults.length} tamang sagot · ★ {totalPoints} kabuuang puntos
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {!ready && <Text style={styles.emptyText}>Naglo-load...</Text>}
        {ready && quizResults.length === 0 && (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyIcon}>📝</Text>
            <Text style={styles.emptyText}>
              Wala ka pang natatapos na Quiz. Pumunta sa Categories at subukan ang isang Quiz
              activity para makita dito ang resulta mo.
            </Text>
            <TouchableOpacity style={styles.emptyButton} onPress={() => router.navigate('/categories')}>
              <Text style={styles.emptyButtonText}>Pumunta sa Categories</Text>
            </TouchableOpacity>
          </View>
        )}

        {quizResults.map((r) => {
          const meta = getCategoryMeta(r.category);
          return (
            <View key={r.id} style={[styles.row, { borderColor: meta.color }]}>
              <View style={styles.rowLeft}>
                <Text style={[styles.rowCategory, { color: meta.color }]}>{meta.label}</Text>
                <Text style={styles.rowMeta}>
                  Level {r.level} · Activity {r.activityNum}
                </Text>
              </View>
              <View style={styles.rowStats}>
                <Text style={styles.statLine}>{medalEmoji(r.medal)} ⏱ {r.timeUsed}s</Text>
                <Text style={styles.statLinePoints}>★ {r.points} pts</Text>
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
  header: {
    backgroundColor: '#3B7DD8', paddingTop: 10, paddingBottom: 16, paddingHorizontal: 16,
    borderBottomLeftRadius: 20, borderBottomRightRadius: 20,
  },
  headerBack: { marginBottom: 4 },
  headerTitle: { color: '#FFF', fontWeight: 'bold', fontSize: 19 },
  headerSubtitle: { color: '#FFF', fontSize: 12, opacity: 0.9, marginTop: 2 },
  list: { padding: 16, gap: 10 },
  emptyWrap: { alignItems: 'center', marginTop: 30, paddingHorizontal: 10 },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyText: { textAlign: 'center', color: '#8E8E93', fontSize: 13, lineHeight: 19 },
  emptyButton: { marginTop: 16, backgroundColor: '#3B7DD8', paddingVertical: 10, paddingHorizontal: 22, borderRadius: 18 },
  emptyButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
  row: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 14,
    padding: 14, borderWidth: 2, justifyContent: 'space-between',
  },
  rowLeft: { flex: 1 },
  rowCategory: { fontWeight: 'bold', fontSize: 14.5 },
  rowMeta: { fontSize: 12, color: '#8E8E93', marginTop: 2 },
  rowStats: { alignItems: 'flex-end' },
  statLine: { fontSize: 12.5, fontWeight: '700', color: '#5C3A21' },
  statLinePoints: { fontSize: 13, fontWeight: '900', color: '#E8801A', marginTop: 3 },
});
