import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ImageBackground, Modal, TextInput, Alert, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@/features/auth/context/user-context';
import { useStudentResults } from '@/features/results/context/student-results-context';
import { useLanguage } from '@/shared/i18n/language-context';
import { useClass } from '@/features/teacher/context/class-context';
import { useGameProgress } from '@/features/learning/context/game-progress-context';
import { images } from '@/shared/assets/images';
import { useRouter } from 'expo-router';

export default function StudentHome() {
  const router = useRouter();
  const { name, avatar, photoUri, uid, classId } = useUser();
  const { results } = useStudentResults();
  const { t } = useLanguage();
  const { joinClass } = useClass();
  const { unlockedLevel } = useGameProgress();

  const [codeModalVisible, setCodeModalVisible] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [joining, setJoining] = useState(false);

  const myResults = useMemo(() => results.filter((r) => r.uid === uid), [results, uid]);
  const points = myResults.reduce((sum, r) => sum + r.points, 0);

  // The roster is teacher-only, so membership is read off the student's own
  // profile — `POST /classes/join` sets `classId` on it.
  const isJoined = !!classId;

  // Highest level opened across every category and both activity types, so the
  // row of level pips reflects real progress instead of a hardcoded "1-3".
  const highestUnlocked = useMemo(() => {
    const categories = ['history', 'culture', 'geography', 'festival', 'national', 'heroes'];
    let best = 1;
    for (const category of categories) {
      for (const type of ['quiz', 'jigsaw'] as const) {
        best = Math.max(best, unlockedLevel(category, type));
      }
    }
    return best;
  }, [unlockedLevel]);

  const handleJoin = async () => {
    if (!codeInput.trim() || joining) return;
    setJoining(true);
    try {
      // Resolved against Firestore, so the code works no matter which device
      // the teacher created the class on.
      const result = await joinClass(codeInput);
      if (!result.success) {
        Alert.alert(t('invalidClassCode'), result.message);
        return;
      }
      Alert.alert(t('registerSuccess'), result.message);
      setCodeModalVisible(false);
      setCodeInput('');
    } finally {
      setJoining(false);
    }
  };

  const menuItems = [
    { label: t('categories'), icon: 'book', color: '#E8801A', href: '/categories' },
    { label: t('miniLessons'), icon: 'school', color: '#2E9E5B', href: '/mini-lessons' },
    { label: t('quiz'), icon: 'create', color: '#3B7DD8', href: '/quiz-results' },
    { label: t('jigsawPuzzle'), icon: 'extension-puzzle', color: '#9B4FD6', href: '/jigsaw-results' },
    { label: t('leaderboard'), icon: 'trophy', color: '#D63B6E', href: '/leaderboard' },
  ] as const;

  return (
    <ImageBackground source={images.studentDashboard} style={styles.container} resizeMode="cover">
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.logo}>{t('studentAccountTitle')}</Text>
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

          <View style={styles.statsRow}>
            <View style={[styles.statPill, { backgroundColor: '#D6A93B' }]}>
              <Ionicons name="star" size={16} color="#FFF" />
              <Text style={styles.statText}>{points} {t('points')}</Text>
            </View>
          </View>

          {isJoined ? (
            <View style={styles.joinedPill}>
              <Ionicons name="checkmark-circle" size={16} color="#FFF" />
              <Text style={styles.statText}>{t('enrolledStatus')}</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.joinBtn} onPress={() => setCodeModalVisible(true)}>
              <Ionicons name="key" size={16} color="#FFF" />
              <Text style={styles.statText}>{t('enterCode')}</Text>
            </TouchableOpacity>
          )}

          <View style={styles.menuList}>
            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.label}
                style={[styles.menuButton, { backgroundColor: item.color }]}
                onPress={() => router.navigate(item.href)}
                activeOpacity={0.8}
              >
                <Ionicons name={item.icon as any} size={20} color="#FFF" style={styles.menuIcon} />
                <Text style={styles.menuText}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.levelRow}>
            {[1, 2, 3, 4, 5].map((lvl) => (
              <View
                key={lvl}
                style={[styles.levelCircle, lvl <= highestUnlocked ? styles.levelUnlocked : styles.levelLocked]}
              >
                <Text style={styles.levelText}>{lvl <= highestUnlocked ? lvl : '🔒'}</Text>
              </View>
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

      <Modal visible={codeModalVisible} transparent animationType="fade" onRequestClose={() => setCodeModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('classCodeLabel')}</Text>
            <TextInput
              style={styles.modalInput}
              value={codeInput}
              onChangeText={(v) => setCodeInput(v.toUpperCase())}
              maxLength={10}
              autoCapitalize="characters"
              placeholder="A1B2C3D4E5"
              placeholderTextColor="#AAB"
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnJoin, joining && styles.modalBtnBusy]}
                onPress={handleJoin}
                disabled={joining}
              >
                {joining ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.modalBtnText}>{t('saveCode')}</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => { setCodeModalVisible(false); setCodeInput(''); }}
                disabled={joining}
              >
                <Text style={styles.modalBtnText}>{t('cancelCode')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: { alignItems: 'center', justifyContent: 'center', paddingVertical: 4, marginTop: 30 },
  logo: { fontSize: 24, fontWeight: '900', color: '#FCD116', textAlign: 'center', textShadowColor: '#000000', textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 4 },
  scrollContent: { alignItems: 'center', paddingBottom: 20 },
  avatarWrap: { marginTop: -4 },
  avatarCircle: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#FFF', borderWidth: 3, borderColor: '#0038A8', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarEmoji: { fontSize: 44 },
  avatarImage: { width: '100%', height: '100%' },
  name: { fontSize: 20, fontWeight: 'bold', color: '#FFF', marginTop: 8, backgroundColor: '#0038A8', paddingHorizontal: 20, paddingVertical: 4, borderRadius: 15 },
  statsRow: { flexDirection: 'row', marginTop: 14, gap: 10 },
  statPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, gap: 6 },
  statText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  joinedPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, gap: 6, backgroundColor: '#2E9E5B', marginTop: 10 },
  joinBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, gap: 6, backgroundColor: '#B23A3A', marginTop: 10 },
  menuList: { width: '85%', marginTop: 20 },
  menuButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 25, marginBottom: 12, borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)' },
  menuIcon: { marginRight: 10 },
  menuText: { color: '#FFF', fontWeight: 'bold', fontSize: 14, letterSpacing: 0.5 },
  levelRow: { flexDirection: 'row', marginTop: 10, gap: 8 },
  levelCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  levelUnlocked: { backgroundColor: '#FCD116' },
  levelLocked: { backgroundColor: '#B0B0B0' },
  levelText: { fontWeight: 'bold', color: '#1A1A1A', fontSize: 12 },
  bottomNav: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', backgroundColor: '#0038A8', paddingVertical: 12 },
  navItem: { padding: 6 },
  navItemActive: { padding: 6, backgroundColor: '#FCD116', borderRadius: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  modalCard: { width: '85%', backgroundColor: '#FFF', borderRadius: 18, padding: 20, alignItems: 'center' },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#0038A8', marginBottom: 12 },
  modalInput: { borderWidth: 2, borderColor: '#0038A8', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, fontSize: 18, fontWeight: 'bold', letterSpacing: 2, color: '#1A1A1A', width: '100%', textAlign: 'center', marginBottom: 14 },
  modalBtnRow: { flexDirection: 'row', gap: 10 },
  modalBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 14 },
  modalBtnJoin: { backgroundColor: '#2E9E5B', minWidth: 90, alignItems: 'center' },
  modalBtnBusy: { opacity: 0.7 },
  modalBtnCancel: { backgroundColor: '#B23A3A' },
  modalBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
});