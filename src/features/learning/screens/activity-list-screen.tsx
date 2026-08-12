import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGameProgress } from '@/features/learning/context/game-progress-context';
import { useUser } from '@/features/auth/context/user-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { toNum } from '@/shared/lib/params';

function getLevelDifficulty(level: number) {
  if (level === 1) return { label: 'Easy', color: '#3E9E4F' };
  if (level === 2 || level === 3) return { label: 'Normal', color: '#E8A93D' };
  return { label: 'Hard', color: '#C4304A' };
}

function getPieceCount(num: number) {
  if (num <= 2) return 6;
  if (num <= 4) return 9;
  return 12;
}

export default function ActivityListScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    category: string;
    label: string;
    color: string;
    activityType: string;
    level: string;
  }>();
  const { category, label, color, activityType } = params;
  const level = toNum(params.level, 1);
  const { getProgress, getFailed } = useGameProgress();
  const { name: studentName } = useUser();
  const completed = getProgress(category, activityType, level);
  const failed = getFailed(category, activityType, level);
  const { label: diffLabel, color: diffColor } = getLevelDifficulty(level);
  const [showIncompleteModal, setShowIncompleteModal] = useState(false);

  const activities = [1, 2, 3, 4, 5, 6].map((num) => {
    const globalId = (level - 1) * 6 + num;
    const isDone = completed.includes(globalId);
    const isFailed = !isDone && failed.includes(globalId);
    const pieceCount = getPieceCount(num);
    return { num, globalId, isDone, isFailed, pieceCount };
  });

  const doneCount = completed.length;
  const incomplete = activities.filter((a) => !a.isDone);

  const openActivity = (act: any) => {
    if (activityType === 'jigsaw') {
      router.navigate({ pathname: '/jigsaw-puzzle', params: {
        category, label, color, level, activityNum: act.num,
        pieceCount: act.pieceCount, difficulty: diffLabel,
      } });
    } else {
      router.navigate({ pathname: '/activity-play', params: {
        category, label, color, activityType, level, activityNum: act.num, difficulty: diffLabel,
      } });
    }
  };

  const handleProceed = () => {
    if (incomplete.length > 0) {
      setShowIncompleteModal(true);
      return;
    }
    // All 6 passed — show the Level Summary screen (record of all 6
    // activities) before unlocking the next level.
    router.navigate({ pathname: '/level-summary', params: { category, label, color, activityType, level } });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { backgroundColor: color }]}>
        <Text style={styles.headerTitle}>{label} — Level {level}</Text>
        <View style={[styles.diffBadgeTop, { backgroundColor: diffColor }]}>
          <Text style={styles.diffBadgeTopText}>{diffLabel}</Text>
        </View>
        <Text style={styles.headerSubtitle}>
          {activityType === 'jigsaw' ? '🧩 Jigsaw Puzzle' : '📝 Quiz'} · {doneCount}/6 Completed
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {activities.map((act) => (
          <TouchableOpacity
            key={act.num}
            style={[
              styles.activityCard,
              act.isDone && styles.activityCardDone,
              act.isFailed && styles.activityCardFailed,
            ]}
            onPress={() => openActivity(act)}
            activeOpacity={0.8}
          >
            <Text style={styles.activityLabel}>Activity {act.num}</Text>
            {act.isDone && <Text style={styles.checkMark}>✓</Text>}
            {act.isFailed && <Text style={styles.crossMark}>✕</Text>}
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity style={[styles.proceedButton, { backgroundColor: color }]} onPress={handleProceed}>
        <Text style={styles.proceedButtonText}>Proceed to Next Level →</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>← Back to Level Map</Text>
      </TouchableOpacity>

      <Modal visible={showIncompleteModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>⚠️ Complete All 6 Activities to Unlock Next Level!</Text>
            <View style={styles.detailBlock}>
              <Text style={styles.detailLine}>Student: {studentName}</Text>
              <Text style={styles.detailLine}>
                You need to complete {incomplete.length} / 6 activities to unlock Level {Math.min(level + 1, 5)}!
              </Text>
              <Text style={styles.detailLine}>
                📍 Activities to Retry: {incomplete.map((a) => `Activity ${a.num}`).join(', ')}
              </Text>
              <Text style={styles.encourageLine}>
                💬 Retry the answer again, maybe you will answer it if you try!
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: color }]}
              onPress={() => setShowIncompleteModal(false)}
            >
              <Text style={styles.modalButtonText}>Retry Unanswered / Failed Activities</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5EFE0' },
  header: { alignItems: 'center', paddingVertical: 18, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerTitle: { color: '#FFF', fontWeight: 'bold', fontSize: 17 },
  diffBadgeTop: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginTop: 6 },
  diffBadgeTopText: { color: '#FFF', fontWeight: 'bold', fontSize: 11 },
  headerSubtitle: { color: '#FCD116', fontSize: 13, marginTop: 6, fontWeight: '600' },
  list: { padding: 20 },
  activityCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 16,
    padding: 16, marginBottom: 12, borderWidth: 2, borderColor: '#E0D5BE',
  },
  activityCardDone: { borderColor: '#3E9E4F', backgroundColor: '#EAF7EC' },
  activityCardFailed: { borderColor: '#C4304A', backgroundColor: '#FCEAEA' },
  activityLabel: { flex: 1, fontSize: 16, fontWeight: 'bold', color: '#1A1A1A' },
  activitySub: { fontSize: 13, color: '#8E8E93', marginRight: 10 },
  checkMark: { fontSize: 20, color: '#3E9E4F', fontWeight: 'bold' },
  crossMark: { fontSize: 20, color: '#C4304A', fontWeight: 'bold' },
  proceedButton: { alignSelf: 'center', paddingVertical: 12, paddingHorizontal: 28, borderRadius: 22, marginBottom: 10 },
  proceedButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  backButton: { alignSelf: 'center', backgroundColor: '#5C3A21', paddingVertical: 10, paddingHorizontal: 24, borderRadius: 20, marginBottom: 20 },
  backButtonText: { color: '#FFF', fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { backgroundColor: '#FFFDF7', borderRadius: 20, padding: 20, width: '100%', alignItems: 'center' },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#C4304A', marginBottom: 14, textAlign: 'center' },
  detailBlock: { width: '100%', marginBottom: 18, gap: 6 },
  detailLine: { fontSize: 13.5, color: '#2B2B2B', lineHeight: 19 },
  encourageLine: { fontSize: 13.5, color: '#5C3A21', fontStyle: 'italic', lineHeight: 19, marginTop: 4 },
  modalButton: { width: '100%', paddingVertical: 14, borderRadius: 25, alignItems: 'center' },
  modalButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 14, textAlign: 'center' },
});