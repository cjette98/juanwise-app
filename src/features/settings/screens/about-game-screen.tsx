import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '@/shared/i18n/language-context';
import { images } from '@/shared/assets/images';
import { useRouter } from 'expo-router';

const APP_VERSION = '1.0.0';
const COPYRIGHT_YEARS = '2024-2026';

export default function AboutGameScreen() {
  const router = useRouter();
  const { t } = useLanguage();

  const rows: { key: string; label: string; onPress: () => void }[] = [
    { key: 'tos', label: t('termsOfServiceLabel'), onPress: () => router.navigate('/terms-info') },
    { key: 'tnc', label: t('termsConditionsLabel'), onPress: () => router.navigate('/terms-info') },
    {
      key: 'privacyPolicy',
      label: t('privacyPolicyLabel'),
      onPress: () =>
        router.navigate({ pathname: '/info', params: { title: t('privacyPolicyLabel'), body: t('comingSoonBody'), icon: 'lock-closed-outline' } }),
    },
    {
      key: 'licenses',
      label: t('licensesLabel'),
      onPress: () =>
        router.navigate({ pathname: '/info', params: { title: t('licensesLabel'), body: t('comingSoonBody'), icon: 'document-text-outline' } }),
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <Ionicons name="chevron-back" size={22} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('aboutGameLabel')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.appCard}>
          <Image source={images.appIcon} style={styles.appIcon} />
          <View style={styles.appInfo}>
            <Text style={styles.appName}>JuanWise</Text>
            <Text style={styles.appVersion}>
              {t('versionLabel')} {APP_VERSION}
            </Text>
            <Text style={styles.appCopyright}>
              © {COPYRIGHT_YEARS} JuanWise. {t('copyrightLabel')}
            </Text>
          </View>
        </View>

        <View style={styles.cardList}>
          {rows.map((r, i) => (
            <TouchableOpacity
              key={r.key}
              style={[styles.row, i === rows.length - 1 && styles.rowLast]}
              onPress={r.onPress}
              activeOpacity={0.7}
            >
              <Text style={styles.rowLabel}>{r.label}</Text>
              <Ionicons name="chevron-forward" size={18} color="#B0B0B0" />
            </TouchableOpacity>
          ))}
        </View>
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
  headerTitle: { color: '#FCD116', fontWeight: 'bold', fontSize: 19 },
  body: { padding: 20, paddingBottom: 48 },

  appCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: '#E0D5BE', marginBottom: 18,
  },
  appIcon: { width: 52, height: 52, borderRadius: 14, marginRight: 14 },
  appInfo: { flex: 1 },
  appName: { fontSize: 17, fontWeight: 'bold', color: '#1A1A1A' },
  appVersion: { fontSize: 12, color: '#8E8E93', marginTop: 2 },
  appCopyright: { fontSize: 11, color: '#B0B0B0', marginTop: 6 },

  cardList: { backgroundColor: '#FFF', borderRadius: 16, borderWidth: 1, borderColor: '#E0D5BE', overflow: 'hidden' },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#F0E9D8',
  },
  rowLast: { borderBottomWidth: 0 },
  rowLabel: { fontSize: 14.5, color: '#1A1A1A' },
});