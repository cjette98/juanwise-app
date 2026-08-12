import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '@/shared/i18n/language-context';
import { useClass, GameType } from '@/features/teacher/context/class-context';
import { CATEGORY_LIST } from '@/features/admin/context/admin-content-context';
import { useRouter } from 'expo-router';

const CATEGORY_META: Record<string, { label: string; color: string }> = {
  history: { label: 'History', color: '#2E6FB8' },
  culture: { label: 'Culture & Tradition', color: '#C9631D' },
  geography: { label: 'Geography', color: '#3E9E4F' },
  festival: { label: 'Festival Arts', color: '#B84FA0' },
  national: { label: 'National Symbols', color: '#C4304A' },
  heroes: { label: 'Filipino Heroes', color: '#8A5A2B' },
};

export default function ClassMapScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { assignment, setAssignment, clearAssignment } = useClass();

  const [draftCategory, setDraftCategory] = useState<string | null>(assignment?.category ?? null);
  const [draftGameType, setDraftGameType] = useState<GameType | null>(assignment?.gameType ?? null);

  const handleAssign = () => {
    if (!draftCategory || !draftGameType) return;
    setAssignment(draftCategory, draftGameType);
  };

  const handleClear = () => {
    clearAssignment();
    setDraftCategory(null);
    setDraftGameType(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>{t('back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('classMap')}</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* ASSIGN / LOCK CARD */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('assignLockTitle')}</Text>
          <Text style={styles.cardDesc}>{t('assignLockDesc')}</Text>

          {assignment ? (
            <View style={styles.currentBadge}>
              <Ionicons name="lock-closed" size={14} color="#FFF" />
              <Text style={styles.currentBadgeText}>
                {t('currentlyAssigned')}: {CATEGORY_META[assignment.category]?.label ?? assignment.category} — {assignment.gameType === 'quiz' ? t('gameTypeQuiz') : t('gameTypeJigsaw')}
              </Text>
            </View>
          ) : (
            <Text style={styles.noAssignText}>{t('noAssignmentYet')}</Text>
          )}

          <Text style={styles.label}>{t('selectCategoryLabel')}</Text>
          <View style={styles.chipRow}>
            {CATEGORY_LIST.map((key) => {
              const meta = CATEGORY_META[key] ?? { label: key, color: '#666' };
              const active = draftCategory === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.chip, { borderColor: meta.color }, active && { backgroundColor: meta.color }]}
                  onPress={() => setDraftCategory(key)}
                >
                  <Text style={[styles.chipText, { color: active ? '#FFF' : meta.color }]}>{meta.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.label}>{t('selectGameTypeLabel')}</Text>
          <View style={styles.chipRow}>
            <TouchableOpacity
              style={[styles.chip, styles.gameChip, draftGameType === 'quiz' && styles.gameChipActive]}
              onPress={() => setDraftGameType('quiz')}
            >
              <Text style={[styles.chipText, draftGameType === 'quiz' && { color: '#FFF' }]}>{t('gameTypeQuiz')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.chip, styles.gameChip, draftGameType === 'jigsaw' && styles.gameChipActive]}
              onPress={() => setDraftGameType('jigsaw')}
            >
              <Text style={[styles.chipText, draftGameType === 'jigsaw' && { color: '#FFF' }]}>{t('gameTypeJigsaw')}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.assignBtn, (!draftCategory || !draftGameType) && styles.disabledBtn]}
              onPress={handleAssign}
              disabled={!draftCategory || !draftGameType}
            >
              <Text style={styles.actionBtnText}>{t('assignBtn')}</Text>
            </TouchableOpacity>
            {!!assignment && (
              <TouchableOpacity style={[styles.actionBtn, styles.clearBtn]} onPress={handleClear}>
                <Text style={styles.actionBtnText}>{t('clearAssignBtn')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* CONTENT MANAGEMENT LINKS */}
        <Text style={styles.sectionTitle}>{t('contentManagementTitle')}</Text>

        <TouchableOpacity
          style={[styles.linkCard, { backgroundColor: '#3B7DD8' }]}
          onPress={() => router.navigate('/admin-content-manager')}
        >
          <Ionicons name="help-circle" size={22} color="#FFF" />
          <Text style={styles.linkCardText}>{t('quizContentBtn')}</Text>
          <Ionicons name="chevron-forward" size={18} color="#FFF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.linkCard, { backgroundColor: '#9B4FD6' }]}
          onPress={() => router.navigate('/jigsaw-content')}
        >
          <Ionicons name="extension-puzzle" size={22} color="#FFF" />
          <Text style={styles.linkCardText}>{t('jigsawContentBtn')}</Text>
          <Ionicons name="chevron-forward" size={18} color="#FFF" />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B3D91' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4,
  },
  backText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  title: { color: '#FCD116', fontWeight: '900', fontSize: 18 },
  scrollContent: { padding: 16, paddingBottom: 40 },

  card: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16, marginBottom: 20 },
  cardTitle: { fontSize: 15, fontWeight: '900', color: '#0038A8', marginBottom: 4 },
  cardDesc: { fontSize: 12, color: '#666', marginBottom: 12, lineHeight: 17 },

  currentBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#B23A3A',
    borderRadius: 12, paddingVertical: 8, paddingHorizontal: 10, marginBottom: 12,
  },
  currentBadgeText: { color: '#FFF', fontWeight: 'bold', fontSize: 12, flex: 1 },
  noAssignText: { fontSize: 12, color: '#2E9E5B', fontWeight: '600', marginBottom: 12 },

  label: { fontSize: 12, fontWeight: 'bold', color: '#333', marginTop: 8, marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1.5, backgroundColor: '#FFF' },
  chipText: { fontWeight: 'bold', fontSize: 12 },
  gameChip: { borderColor: '#0038A8' },
  gameChipActive: { backgroundColor: '#0038A8' },

  actionRow: { flexDirection: 'row', gap: 10, marginTop: 16, flexWrap: 'wrap' },
  actionBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 14 },
  assignBtn: { backgroundColor: '#2E9E5B' },
  clearBtn: { backgroundColor: '#B23A3A' },
  disabledBtn: { opacity: 0.4 },
  actionBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },

  sectionTitle: { color: '#FCD116', fontWeight: '900', fontSize: 15, marginBottom: 10 },
  linkCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16,
    padding: 16, marginBottom: 12,
  },
  linkCardText: { color: '#FFF', fontWeight: 'bold', fontSize: 14, flex: 1 },
});