import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function ComingSoonScreen() {
  const router = useRouter();
  const { title = 'Coming Soon' } = useLocalSearchParams<{ title?: string }>();

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.emoji}>🚧</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>Nasa proseso pa ito ng paggawa. Balik ka na lang mamaya!</Text>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>← Bumalik</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5EFE0', alignItems: 'center', justifyContent: 'center', padding: 24 },
  emoji: { fontSize: 48, marginBottom: 12 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#5C3A21', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 13, color: '#8E8E93', textAlign: 'center', marginBottom: 24 },
  backButton: { backgroundColor: '#5C3A21', paddingVertical: 12, paddingHorizontal: 28, borderRadius: 20 },
  backButtonText: { color: '#FFF', fontWeight: 'bold' },
});
