import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '@/shared/i18n/language-context';
import { useClass } from '@/features/teacher/context/class-context';
import { useRouter } from 'expo-router';

export default function ClassOverviewScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { classCode, students, totalStudents, generateCode, setCustomCode } = useClass();

  const [editing, setEditing] = useState(false);
  const [draftCode, setDraftCode] = useState(classCode);

  const handleGenerate = () => {
    const code = generateCode();
    setDraftCode(code);
    setEditing(false);
  };

  const handleStartEdit = () => {
    setDraftCode(classCode);
    setEditing(true);
  };

  const handleSaveCustom = () => {
    const result = setCustomCode(draftCode);
    if (!result.success) {
      Alert.alert(t('invalidClassCode'), result.message);
      return;
    }
    setEditing(false);
  };

  const handleShare = async () => {
    if (!classCode) return;
    try {
      await Share.share({
        message: `JuanWise Class Code: ${classCode}`,
      });
    } catch (e) {
      // user cancelled or share failed silently
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>{t('back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('classOverview')}</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* CLASS CODE CARD */}
        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>{t('classCodeLabel')}</Text>

          {editing ? (
            <>
              <TextInput
                style={styles.codeInput}
                value={draftCode}
                onChangeText={(v) => setDraftCode(v.toUpperCase())}
                maxLength={10}
                autoCapitalize="characters"
                placeholder="A1B2C3D4E5"
                placeholderTextColor="#AAB"
              />
              <View style={styles.codeBtnRow}>
                <TouchableOpacity style={[styles.smallBtn, styles.saveBtn]} onPress={handleSaveCustom}>
                  <Text style={styles.smallBtnText}>{t('saveCode')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.smallBtn, styles.cancelBtn]}
                  onPress={() => setEditing(false)}
                >
                  <Text style={styles.smallBtnText}>{t('cancelCode')}</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.codeValue}>{classCode || '— — — — — — — — — —'}</Text>
              <View style={styles.codeBtnRow}>
                <TouchableOpacity style={[styles.smallBtn, styles.generateBtn]} onPress={handleGenerate}>
                  <Ionicons name="refresh" size={14} color="#FFF" />
                  <Text style={styles.smallBtnText}>{t('generateCode')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.smallBtn, styles.editBtn]} onPress={handleStartEdit}>
                  <Ionicons name="pencil" size={14} color="#FFF" />
                  <Text style={styles.smallBtnText}>{t('editCode')}</Text>
                </TouchableOpacity>
                {!!classCode && (
                  <TouchableOpacity style={[styles.smallBtn, styles.shareBtn]} onPress={handleShare}>
                    <Ionicons name="share-social" size={14} color="#FFF" />
                    <Text style={styles.smallBtnText}>{t('copyCode')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}
        </View>

        {/* TOTAL STUDENTS */}
        <View style={styles.totalPill}>
          <Ionicons name="people" size={16} color="#FFF" />
          <Text style={styles.totalText}>{t('totalStudents')}: {totalStudents}</Text>
        </View>

        {/* STUDENT LIST */}
        <Text style={styles.sectionTitle}>{t('joinedStudents')}</Text>

        {students.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={40} color="#9AA" />
            <Text style={styles.emptyText}>{t('noStudentsYet')}</Text>
          </View>
        ) : (
          students.map((s) => (
            <View key={s.username} style={styles.studentCard}>
              <View style={styles.studentAvatar}>
                <Text style={styles.studentAvatarText}>🧑‍🎓</Text>
              </View>
              <View style={styles.studentInfo}>
                <Text style={styles.studentName}>{s.name}</Text>
                <Text style={styles.studentDetail}>{t('gradeLabel')}: {s.grade} — {s.section}</Text>
                <Text style={styles.studentDetail}>{t('lrnShort')}: {s.lrn}</Text>
                <Text style={styles.studentDetail}>{t('gmailShort')}: {s.email}</Text>
              </View>
            </View>
          ))
        )}
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

  codeCard: {
    backgroundColor: '#FFFFFF', borderRadius: 18, padding: 18,
    alignItems: 'center', marginBottom: 14,
  },
  codeLabel: { fontSize: 12, color: '#666', fontWeight: '700', marginBottom: 6, letterSpacing: 1 },
  codeValue: {
    fontSize: 24, fontWeight: '900', color: '#0038A8', letterSpacing: 3, marginBottom: 12,
  },
  codeInput: {
    borderWidth: 2, borderColor: '#0038A8', borderRadius: 10, paddingHorizontal: 14,
    paddingVertical: 8, fontSize: 18, fontWeight: 'bold', letterSpacing: 2, color: '#1A1A1A',
    width: '100%', textAlign: 'center', marginBottom: 12,
  },
  codeBtnRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  smallBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8,
    paddingHorizontal: 12, borderRadius: 14,
  },
  generateBtn: { backgroundColor: '#E8801A' },
  editBtn: { backgroundColor: '#3B7DD8' },
  shareBtn: { backgroundColor: '#2E9E5B' },
  saveBtn: { backgroundColor: '#2E9E5B' },
  cancelBtn: { backgroundColor: '#B23A3A' },
  smallBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },

  totalPill: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#B23A3A', paddingVertical: 10, borderRadius: 16, marginBottom: 18,
  },
  totalText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },

  sectionTitle: { color: '#FCD116', fontWeight: '900', fontSize: 15, marginBottom: 10 },

  emptyState: { alignItems: 'center', paddingVertical: 30, gap: 8 },
  emptyText: { color: '#DDE', textAlign: 'center', fontSize: 13, paddingHorizontal: 20 },

  studentCard: {
    flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 14, padding: 12,
    marginBottom: 10, alignItems: 'center', gap: 12,
  },
  studentAvatar: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: '#EFF3FF',
    alignItems: 'center', justifyContent: 'center',
  },
  studentAvatarText: { fontSize: 22 },
  studentInfo: { flex: 1 },
  studentName: { fontWeight: 'bold', fontSize: 14, color: '#1A1A1A', marginBottom: 2 },
  studentDetail: { fontSize: 11, color: '#666' },
});