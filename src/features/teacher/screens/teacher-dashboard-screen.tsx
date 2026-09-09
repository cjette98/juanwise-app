import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ImageBackground, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '@/shared/i18n/language-context';
import { useUser } from '@/features/auth/context/user-context';
import { useClass } from '@/features/teacher/context/class-context';
import { images } from '@/shared/assets/images';
import { useRouter } from 'expo-router';

export default function TeacherDashboardScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  // Name, grade and section come off the signed-in profile now, and the roster
  // count is whatever GET /classes/mine reports — no more placeholders.
  const { avatar, photoUri, name, grade: profileGrade, section } = useUser();
  const { currentClass, totalStudents } = useClass();

  const grade =
    currentClass?.gradeLevel || profileGrade
      ? [currentClass?.gradeLevel ?? profileGrade, currentClass?.section ?? section]
          .filter(Boolean)
          .join('-')
      : '—';

  const menuItems = [
    { label: t('classOverview'), icon: 'people', color: '#E8801A', href: '/class-overview' },
    { label: t('leaderBoard'), icon: 'trophy', color: '#2E9E5B', href: '/teacher-leaderboard' },
    { label: t('classMap'), icon: 'map', color: '#3B7DD8', href: '/class-map' },
    { label: t('managePacksBtn'), icon: 'albums', color: '#9B4FD6', href: '/packs' },
    { label: t('performanceProgression'), icon: 'stats-chart', color: '#9B4FD6', href: '/performance' },
  ] as const;

  return (
    <ImageBackground source={images.teacherDashboard} style={styles.container} resizeMode="cover">
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.logo}>{t('teacherAccountTitle')}</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatarCircle}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarEmoji}>{avatar}</Text>
              )}
            </View>
          </View>
          <Text style={styles.name}>{name}</Text>

          <View style={styles.statsCol}>
            <View style={styles.statPill}>
              <Ionicons name="school" size={16} color="#FFF" />
              <Text style={styles.statText}>{t('gradeLabel')}: {grade}</Text>
            </View>
            <View style={styles.statPill}>
              <Ionicons name="people" size={16} color="#FFF" />
              <Text style={styles.statText}>{t('totalStudents')}: {totalStudents}</Text>
            </View>
          </View>

          <View style={styles.menuList}>
            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.label}
                style={[styles.menuButton, { backgroundColor: item.color }]}
                onPress={() => router.navigate(item.href)}
                activeOpacity={0.8}
              >
                <Ionicons name={item.icon as any} size={20} color="#FFF" style={styles.menuIcon} />
                <Text style={styles.menuText}>{item.label.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <View style={styles.bottomNav}>
          <TouchableOpacity style={styles.navItem}>
            <Ionicons name="home" size={24} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => router.navigate('/profile')}>
            <Ionicons name="person-circle" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: { alignItems: 'center', justifyContent: 'center', paddingVertical: 4, marginTop: 30 },
  logo: { fontSize: 24, fontWeight: '900', color: '#FCD116', textAlign: 'center', textShadowColor: '#000000', textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 4 },
  editionText: { color: '#FFF', fontSize: 11, fontStyle: 'italic' },
  scrollContent: { alignItems: 'center', paddingBottom: 20 },
  avatarWrap: { marginTop: -4 },
  avatarCircle: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#FFF', borderWidth: 3, borderColor: '#0038A8', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarEmoji: { fontSize: 44 },
  avatarImage: { width: '100%', height: '100%' },
  name: { fontSize: 18, fontWeight: 'bold', color: '#FFF', marginTop: 8, backgroundColor: '#0038A8', paddingHorizontal: 18, paddingVertical: 4, borderRadius: 15 },
  statsCol: { marginTop: 14, gap: 8, width: '80%' },
  statPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 15, gap: 8, backgroundColor: '#B23A3A', justifyContent: 'center' },
  statText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  menuList: { width: '85%', marginTop: 20 },
  menuButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 25, marginBottom: 12, borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)' },
  menuIcon: { marginRight: 10 },
  menuText: { color: '#FFF', fontWeight: 'bold', fontSize: 13, letterSpacing: 0.3 },
  bottomNav: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', backgroundColor: '#0038A8', paddingVertical: 12 },
  navItem: { padding: 6 },
  navItemActive: { padding: 6, backgroundColor: '#FCD116', borderRadius: 20 },
});