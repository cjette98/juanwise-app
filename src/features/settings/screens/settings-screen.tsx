import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '@/shared/i18n/language-context';
import { useRouter } from 'expo-router';

type MenuItem = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress: () => void;
};

export default function SettingsScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const [soundsOn, setSoundsOn] = useState(true);

  const menuItems: MenuItem[] = [
    {
      key: 'help',
      label: t('helpLabel'),
      icon: 'help-circle-outline',
      color: '#3E9E4F',
      onPress: () => router.navigate({ pathname: '/info', params: { title: t('helpLabel'), body: t('helpBody'), icon: 'help-buoy-outline' } }),
    },
    {
      key: 'about',
      label: t('aboutGameLabel'),
      icon: 'information-circle-outline',
      color: '#0038A8',
      onPress: () => router.navigate('/about-game'),
    },
    {
      key: 'privacyRights',
      label: t('privacyRightsLabel'),
      icon: 'shield-checkmark-outline',
      color: '#6C4AB6',
      onPress: () =>
        router.navigate({ pathname: '/info', params: { title: t('privacyRightsLabel'), body: t('privacyRightsBody'), icon: 'shield-checkmark-outline' } }),
    },
    {
      key: 'privacyPreferences',
      label: t('privacyPreferencesLabel'),
      icon: 'person-circle-outline',
      color: '#CE1126',
      onPress: () =>
        router.navigate({ pathname: '/info', params: {
          title: t('privacyPreferencesLabel'),
          body: t('privacyPreferencesBody'),
          icon: 'person-circle-outline',
        } }),
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <Ionicons name="chevron-back" size={22} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('settingsTitle')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={[styles.iconWrap, { backgroundColor: '#0038A8' }]}>
              <Ionicons name="volume-high-outline" size={18} color="#FFF" />
            </View>
            <Text style={styles.rowLabel}>{t('soundsLabel')}</Text>
            <Switch
              value={soundsOn}
              onValueChange={setSoundsOn}
              trackColor={{ false: '#D0D0D0', true: '#3E9E4F' }}
              thumbColor="#FFF"
            />
          </View>
        </View>

        <View style={[styles.card, { marginTop: 12 }]}>
          {menuItems.map((item, i) => (
            <TouchableOpacity
              key={item.key}
              style={[styles.row, i !== menuItems.length - 1 && styles.rowDivider]}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View style={[styles.iconWrap, { backgroundColor: item.color }]}>
                <Ionicons name={item.icon} size={18} color="#FFF" />
              </View>
              <Text style={styles.rowLabel}>{item.label}</Text>
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
  body: { padding: 16, paddingBottom: 48 },

  card: { backgroundColor: '#FFF', borderRadius: 16, borderWidth: 1, borderColor: '#E0D5BE', overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: '#F0E9D8' },
  iconWrap: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  rowLabel: { flex: 1, fontSize: 14.5, color: '#1A1A1A' },
});