import React from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { H2, Body } from '@/shared/components/ui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';

type InfoScreenParams = {
  title: string;
  body: string;
  icon?: keyof typeof Ionicons.glyphMap;
};

export default function InfoScreen() {
  const router = useRouter();
  const { title, body, icon = 'information-circle-outline' } =
    useLocalSearchParams<InfoScreenParams>();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <Ionicons name="chevron-back" size={22} color="#FFF" />
        </TouchableOpacity>
        <H2 style={styles.headerTitle}>{title}</H2>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.iconWrap}>
          <Ionicons name={icon} size={28} color="#0038A8" />
        </View>
        <Body style={styles.bodyText}>{body}</Body>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5EFE0' },
  header: {
    backgroundColor: '#0038A8', paddingTop: 10, paddingBottom: 16, paddingHorizontal: 16,
    borderBottomLeftRadius: 20, borderBottomRightRadius: 20,
  },
  headerBack: { marginBottom: 4 },
  headerTitle: { color: '#FCD116' },
  body: { padding: 20, paddingBottom: 48 },
  iconWrap: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFF', borderWidth: 2,
    borderColor: '#E0D5BE', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  bodyText: { color: '#2B2B2B' },
});