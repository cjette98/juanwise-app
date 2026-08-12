import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGameProgress } from '@/features/learning/context/game-progress-context';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function LevelMapScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    category: string;
    label?: string;
    color?: string;
    activityType: string;
  }>();
  const { category, activityType } = params;
  const label = params.label || 'Category';
  const color = params.color || '#0038A8';
  const { isLevelUnlocked } = useGameProgress();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#F5EFE0' }]}>
      <View style={[styles.header, { backgroundColor: color }]}>
        <Text style={styles.headerTitle}>LEVEL PROGRESSION MAP</Text>
        <Text style={styles.headerSubtitle}>{label}</Text>
        <Text style={styles.headerType}>{activityType === 'quiz' ? '📝 Quiz Mode' : '🧩 Jigsaw Puzzle Mode'}</Text>
      </View>

      <View style={styles.mapArea}>
        {[1, 2, 3, 4, 5].map((lvl) => {
          const unlocked = isLevelUnlocked(category, activityType, lvl);
          return (
            <TouchableOpacity
              key={lvl}
              disabled={!unlocked}
              style={[styles.levelNode, { backgroundColor: unlocked ? color : '#B0B0B0' }]}
              onPress={() =>
                router.navigate({ pathname: '/activity-list', params: { category, label, color, activityType, level: lvl } })
              }
              activeOpacity={0.8}
            >
              <Text style={styles.levelText}>{unlocked ? `Level ${lvl}` : '🔒'}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.footerRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { alignItems: 'center', paddingVertical: 18, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerTitle: { color: '#FFF', fontWeight: 'bold', fontSize: 16, letterSpacing: 1 },
  headerSubtitle: { color: '#FCD116', fontWeight: 'bold', fontSize: 20, marginTop: 4 },
  headerType: { color: '#FFF', fontSize: 13, marginTop: 4 },
  mapArea: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 18 },
  levelNode: {
    width: 140, paddingVertical: 16, borderRadius: 30, alignItems: 'center',
    borderWidth: 2, borderColor: '#FFF', shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25, shadowRadius: 4, elevation: 5,
  },
  levelText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  footerRow: { padding: 20 },
  backButton: { alignSelf: 'flex-start', backgroundColor: '#5C3A21', paddingVertical: 10, paddingHorizontal: 24, borderRadius: 20 },
  backButtonText: { color: '#FFF', fontWeight: 'bold' },
});