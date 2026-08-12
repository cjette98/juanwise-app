import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '@/shared/i18n/language-context';
import { images } from '@/shared/assets/images';
import { useRouter } from 'expo-router';

export default function CategoriesScreen() {
  const router = useRouter();
  const { t } = useLanguage();

  const categories = [
    { key: 'history', label: t('catHistory'), image: images.catHistory, color: '#2E6FB8' },
    { key: 'culture', label: t('catCulture'), image: images.catCulture, color: '#C9631D' },
    { key: 'geography', label: t('catGeography'), image: images.catGeography, color: '#3E9E4F' },
    { key: 'festival', label: t('catFestival'), image: images.catFestival, color: '#B84FA0' },
    { key: 'national', label: t('catNational'), image: images.catNational, color: '#C4304A' },
    { key: 'heroes', label: t('catHeroes'), image: images.catHeroes, color: '#8A5A2B' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>{t('juanWiseTitle')}</Text>
      </View>

      <Text style={styles.title}>{t('categoriesTitle')}</Text>

      <ScrollView contentContainerStyle={styles.list}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.key}
            style={[styles.catButton, { backgroundColor: cat.color }]}
            activeOpacity={0.85}
            onPress={() => router.navigate({ pathname: '/activity-choice', params: { category: cat.key, label: cat.label, color: cat.color } })}
          >
            <Image source={cat.image} style={styles.catImage} />
            <Text style={styles.catLabel}>{cat.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => router.navigate('/student-home')}>
          <Text style={styles.navIcon}>🏠</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.navigate('/profile')}>
          <Text style={styles.navIcon}>👤</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5EFE0' },
  header: { backgroundColor: '#0038A8', alignItems: 'center', paddingVertical: 12 },
  headerText: { color: '#FCD116', fontSize: 20, fontWeight: 'bold' },
  title: { textAlign: 'center', fontWeight: 'bold', fontSize: 13, color: '#5C3A21', marginVertical: 14, letterSpacing: 0.5 },
  list: { paddingHorizontal: 20, paddingBottom: 20 },
  catButton: { flexDirection: 'row', alignItems: 'center', borderRadius: 18, marginBottom: 14, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
  catImage: { width: 52, height: 52, borderRadius: 12, marginRight: 14, borderWidth: 2, borderColor: '#FFF' },
  catLabel: { color: '#FFF', fontWeight: 'bold', fontSize: 17, flexShrink: 1 },
  bottomNav: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', backgroundColor: '#0038A8', paddingVertical: 12 },
  navItem: { padding: 6 },
  navItemActive: { padding: 6, backgroundColor: '#FCD116', borderRadius: 20 },
  navIcon: { fontSize: 20 },
});