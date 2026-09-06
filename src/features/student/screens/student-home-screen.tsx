import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal, TextInput, Alert, Image } from 'react-native';
import { useUser } from '@/features/auth/context/user-context';
import { useStudentResults } from '@/features/results/context/student-results-context';
import { useLanguage } from '@/shared/i18n/language-context';
import { useClass } from '@/features/teacher/context/class-context';
import { useGameProgress } from '@/features/learning/context/game-progress-context';
import { useRouter } from 'expo-router';
import { Screen, ScreenHeader, Card, Button, Pill, Icon, BottomNav, H3 } from '@/shared/components/ui';
import { tokens } from '@/shared/theme/tokens';

const AVATAR_SIZE = 64;

export default function StudentHome() {
  const router = useRouter();
  const { name, avatar, photoUri, uid, classId, grade, section } = useUser();
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

  // Same "Grade: X — Y" convention as class-overview-screen.tsx; no dedicated
  // greeting copy exists in the language file, so the header's title carries
  // the student's name and this class line sits as its subtitle.
  const classLine = grade || section ? `${t('gradeLabel')}: ${grade || '—'} — ${section || '—'}` : undefined;

  const menuItems = [
    { label: t('categories'), icon: 'grid', color: tokens.color.navCategories, href: '/categories' },
    { label: t('miniLessons'), icon: 'lesson', color: tokens.color.navLessons, href: '/mini-lessons' },
    { label: t('quiz'), icon: 'quiz', color: tokens.color.navQuiz, href: '/quiz-results' },
    { label: t('jigsawPuzzle'), icon: 'puzzle', color: tokens.color.navJigsaw, href: '/jigsaw-results' },
  ] as const;

  const leaderboardItem = { label: t('leaderboard'), icon: 'trophy', color: tokens.color.navLeaderboard, href: '/leaderboard' } as const;

  return (
    <>
      <Screen>
        <ScreenHeader
          title={name}
          subtitle={classLine}
          color={tokens.color.primary}
          right={
            <View style={styles.avatarWrap}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarEmoji}>{avatar}</Text>
              )}
            </View>
          }
        >
          <View style={styles.headerControls}>
            <Pill label={`${points} ${t('points')}`} icon="star" tone="gold" />
            {isJoined ? (
              <Pill label={t('enrolledStatus')} icon="check" tone="success" />
            ) : (
              <TouchableOpacity style={styles.joinTarget} onPress={() => setCodeModalVisible(true)} activeOpacity={0.85}>
                <Pill label={t('enterCode')} icon="key" tone="translucent" />
              </TouchableOpacity>
            )}
          </View>
        </ScreenHeader>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.grid}>
            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.label}
                style={styles.gridItem}
                onPress={() => router.navigate(item.href)}
                activeOpacity={0.85}
              >
                <Card style={styles.menuCard}>
                  <View style={[styles.iconChip, { backgroundColor: item.color }]}>
                    <Icon name={item.icon} size={24} color={tokens.color.onDark} />
                  </View>
                  <H3 numberOfLines={1}>{item.label}</H3>
                </Card>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity onPress={() => router.navigate(leaderboardItem.href)} activeOpacity={0.85}>
            <Card style={[styles.leaderboardCard, { backgroundColor: leaderboardItem.color }]}>
              <View style={styles.leaderboardRow}>
                <View style={[styles.iconChip, styles.iconChipOnDark]}>
                  <Icon name={leaderboardItem.icon} size={24} color={tokens.color.onDark} />
                </View>
                <H3 style={styles.onDarkText}>{leaderboardItem.label}</H3>
              </View>
            </Card>
          </TouchableOpacity>

          <View style={styles.levelRow}>
            {[1, 2, 3, 4, 5].map((lvl) => {
              const unlocked = lvl <= highestUnlocked;
              return (
                <View key={lvl} style={[styles.levelCell, { backgroundColor: unlocked ? tokens.color.gold : tokens.color.locked }]}>
                  {unlocked ? (
                    <H3 style={styles.levelText}>{lvl}</H3>
                  ) : (
                    <Icon name="lock" size={20} color={tokens.color.inkDisabled} />
                  )}
                </View>
              );
            })}
          </View>
        </ScrollView>

        <BottomNav active="home" />
      </Screen>

      <Modal visible={codeModalVisible} transparent animationType="fade" onRequestClose={() => setCodeModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBackdrop} />
          <Card style={styles.modalCard}>
            <H3 style={styles.modalTitle}>{t('classCodeLabel')}</H3>
            <TextInput
              style={styles.modalInput}
              value={codeInput}
              onChangeText={(v) => setCodeInput(v.toUpperCase())}
              maxLength={10}
              autoCapitalize="characters"
              placeholder="A1B2C3D4E5"
              placeholderTextColor={tokens.color.inkFaint}
            />
            <View style={styles.modalBtnRow}>
              <Button
                label={t('saveCode')}
                onPress={handleJoin}
                busy={joining}
                color={tokens.color.success}
                shadowColor={tokens.color.successDark}
                style={styles.modalBtn}
              />
              <Button
                label={t('cancelCode')}
                onPress={() => { setCodeModalVisible(false); setCodeInput(''); }}
                variant="secondary"
                disabled={joining}
                style={styles.modalBtn}
              />
            </View>
          </Card>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  headerControls: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm, marginTop: tokens.space.md },
  joinTarget: { minHeight: tokens.hit.min, justifyContent: 'center' },
  avatarWrap: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.color.onDarkChip,
    borderWidth: 2,
    borderColor: tokens.color.onDarkBorder,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarEmoji: { fontSize: Math.round(AVATAR_SIZE * 0.52) },
  scrollContent: { padding: tokens.space.lg, gap: tokens.space.lg, paddingBottom: tokens.space.xxl },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.md },
  gridItem: { width: '47%' },
  menuCard: { alignItems: 'flex-start', gap: tokens.space.xs, padding: tokens.space.md },
  iconChip: {
    width: 48,
    height: 48,
    borderRadius: tokens.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconChipOnDark: { backgroundColor: tokens.color.onDarkChip },
  leaderboardCard: { padding: tokens.space.lg },
  leaderboardRow: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.md },
  onDarkText: { color: tokens.color.onDark },
  levelRow: { flexDirection: 'row', gap: tokens.space.sm, justifyContent: 'center' },
  levelCell: {
    width: 48,
    height: 48,
    borderRadius: tokens.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelText: { color: tokens.color.goldInk },
  modalOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: tokens.color.ink,
    opacity: 0.5,
  },
  modalCard: { width: '85%', alignItems: 'center', gap: tokens.space.md },
  modalTitle: { color: tokens.color.primary },
  modalInput: {
    borderWidth: 2,
    borderColor: tokens.color.primary,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.space.md,
    paddingVertical: tokens.space.sm,
    fontSize: tokens.type.h3.fontSize,
    fontFamily: tokens.font.bodyBold,
    letterSpacing: 2,
    color: tokens.color.ink,
    width: '100%',
    textAlign: 'center',
  },
  modalBtnRow: { flexDirection: 'row', gap: tokens.space.sm, width: '100%' },
  modalBtn: { flex: 1 },
});
