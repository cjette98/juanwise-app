import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function ActivityChoiceScreen() {
  const router = useRouter();
  const { category, label, color } = useLocalSearchParams<{
    category: string;
    label: string;
    color: string;
  }>();

  const choose = (type: 'quiz' | 'jigsaw') => {
    router.navigate({ pathname: '/level-map', params: { category, label, color, activityType: type } });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>{label}</Text>
      <Text style={styles.subtitle}>Choose one Interactive Activity</Text>

      <TouchableOpacity style={[styles.choiceButton, { backgroundColor: '#3B7DD8' }]} onPress={() => choose('quiz')}>
        <Text style={styles.choiceIcon}>📝</Text>
        <Text style={styles.choiceLabel}>QUIZ</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.choiceButton, { backgroundColor: '#9B4FD6' }]} onPress={() => choose('jigsaw')}>
        <Text style={styles.choiceIcon}>🧩</Text>
        <Text style={styles.choiceLabel}>JIGSAW PUZZLE</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
        <Text style={styles.backLinkText}>← Back to Categories</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#F5EFE0' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#5C3A21', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#8E8E93', marginBottom: 30 },
  choiceButton: {
    width: '85%', paddingVertical: 22, borderRadius: 20, alignItems: 'center', marginBottom: 18,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)',
  },
  choiceIcon: { fontSize: 34, marginBottom: 6 },
  choiceLabel: { color: '#FFF', fontWeight: 'bold', fontSize: 18, letterSpacing: 1 },
  backLink: { marginTop: 20 },
  backLinkText: { color: '#8E8E93', fontSize: 13 },
});