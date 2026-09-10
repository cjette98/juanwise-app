import React, { useState } from 'react';
import { View, TextInput, StyleSheet, ScrollView, Alert, Share, RefreshControl, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useLanguage } from '@/shared/i18n/language-context';
import { useClass } from '@/features/teacher/context/class-context';
import {
  Screen,
  ScreenHeader,
  Card,
  Button,
  Pill,
  Icon,
  Avatar,
  Display,
  Body,
  BodyStrong,
  Caption,
  Label,
} from '@/shared/components/ui';
import { tokens } from '@/shared/theme/tokens';

export default function ClassOverviewScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  // The roster comes from GET /classes/:id/members, so every student who joined
  // with this code shows up here regardless of the device they joined from.
  const { classCode, students, totalStudents, currentClass, generateCode, setCustomCode, removeStudent, refresh, error } =
    useClass();

  const [editing, setEditing] = useState(false);
  const [draftCode, setDraftCode] = useState(classCode);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleGenerate = async () => {
    setBusy(true);
    try {
      const result = await generateCode();
      if (!result.success) {
        Alert.alert(t('invalidClassCode'), result.message);
        return;
      }
      if (result.code) setDraftCode(result.code);
      setEditing(false);
    } finally {
      setBusy(false);
    }
  };

  const handleStartEdit = () => {
    setDraftCode(classCode);
    setEditing(true);
  };

  const handleSaveCustom = async () => {
    setBusy(true);
    try {
      const result = await setCustomCode(draftCode);
      if (!result.success) {
        Alert.alert(t('invalidClassCode'), result.message);
        return;
      }
      setEditing(false);
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = (uid: string, name: string) => {
    Alert.alert(t('removeStudentTitle'), t('removeStudentMsg', { name }), [
      { text: t('cancelBtn'), style: 'cancel' },
      {
        text: t('removeStudentBtn'),
        style: 'destructive',
        onPress: async () => {
          const result = await removeStudent(uid);
          if (!result.success) Alert.alert(t('invalidClassCode'), result.message);
        },
      },
    ]);
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

  const hasGradeSection = !!(currentClass?.gradeLevel || currentClass?.section);
  const gradeSection = `${t('grade')} ${currentClass?.gradeLevel || '—'} · ${t('section')} ${currentClass?.section || '—'}`;

  return (
    <Screen>
      <ScreenHeader
        title={t('classOverview')}
        subtitle={hasGradeSection ? gradeSection : undefined}
        onBack={() => router.back()}
      >
        <View style={styles.headerPills}>
          <Pill label={`${t('totalStudents')}: ${totalStudents}`} icon="grid" tone="translucent" />
        </View>
      </ScreenHeader>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={tokens.color.primary} />
        }
      >
        {!!error && (
          <Card style={styles.errorBanner}>
            <Icon name="flag" size={18} color={tokens.color.dangerInk} />
            <Body style={styles.errorBannerText}>{error}</Body>
          </Card>
        )}

        {/* CLASS CODE CARD */}
        <Card raised style={styles.codeCard}>
          <Label>{t('classCodeLabel')}</Label>

          {editing ? (
            <>
              <TextInput
                style={styles.codeInput}
                value={draftCode}
                onChangeText={(v) => setDraftCode(v.toUpperCase())}
                maxLength={10}
                autoCapitalize="characters"
                placeholder="A1B2C3D4E5"
                placeholderTextColor={tokens.color.inkFaint}
              />
              <View style={styles.codeBtnRow}>
                <Button
                  label={t('saveCode')}
                  onPress={handleSaveCustom}
                  busy={busy}
                  color={tokens.color.success}
                  shadowColor={tokens.color.successDark}
                  style={styles.codeActionBtn}
                />
                <Button
                  label={t('cancelCode')}
                  onPress={() => setEditing(false)}
                  disabled={busy}
                  color={tokens.color.danger}
                  shadowColor={tokens.color.dangerInk}
                  style={styles.codeActionBtn}
                />
              </View>
            </>
          ) : (
            <>
              <View style={styles.codePlate}>
                <Display style={styles.codeValue} numberOfLines={1} adjustsFontSizeToFit allowFontScaling={false}>
                  {classCode || '— — — — — — — — — —'}
                </Display>
              </View>
              <View style={styles.codeBtnRow}>
                <Button label={t('generateCode')} onPress={handleGenerate} busy={busy} icon="refresh" style={styles.generateBtn} />
                <TouchableOpacity
                  style={[styles.iconBtn, { backgroundColor: tokens.color.navQuiz }]}
                  onPress={handleStartEdit}
                  accessibilityRole="button"
                  accessibilityLabel={t('editCode')}
                >
                  <Icon name="pencil" size={22} color={tokens.color.onDark} />
                </TouchableOpacity>
                {!!classCode && (
                  <TouchableOpacity
                    style={[styles.iconBtn, { backgroundColor: tokens.color.success }]}
                    onPress={handleShare}
                    accessibilityRole="button"
                    accessibilityLabel={t('copyCode')}
                  >
                    <Icon name="share" size={22} color={tokens.color.onDark} />
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}
        </Card>

        {/* STUDENT LIST */}
        <Label style={styles.sectionLabel}>{t('joinedStudents')}</Label>

        {students.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="grid" size={40} color={tokens.color.inkFaint} />
            <Body style={styles.emptyText}>{t('noStudentsYet')}</Body>
          </View>
        ) : (
          <View style={styles.studentList}>
            {students.map((s) => (
              <Card key={s.uid} style={styles.studentRow}>
                <Avatar name={s.name} />
                <View style={styles.studentInfo}>
                  <BodyStrong numberOfLines={1}>{s.name}</BodyStrong>
                  <Caption numberOfLines={1}>@{s.username}</Caption>
                </View>
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => handleRemove(s.uid, s.name)}
                  accessibilityRole="button"
                  accessibilityLabel={t('removeStudentBtn')}
                >
                  <Icon name="close" size={18} color={tokens.color.dangerInk} />
                </TouchableOpacity>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: tokens.space.lg, gap: tokens.space.sm, paddingBottom: tokens.space.xxl },

  headerPills: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm, marginTop: tokens.space.md },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.sm,
    backgroundColor: tokens.color.dangerSoft,
    borderColor: tokens.color.dangerBorder,
  },
  errorBannerText: { flex: 1, color: tokens.color.dangerInk },

  codeCard: { alignItems: 'center', gap: tokens.space.sm },
  codePlate: {
    width: '100%',
    backgroundColor: tokens.color.surfaceSunken,
    borderRadius: tokens.radius.md,
    paddingVertical: tokens.space.lg,
    alignItems: 'center',
  },
  codeValue: { color: tokens.color.primary, letterSpacing: 4 },
  codeInput: {
    width: '100%',
    borderWidth: 2,
    borderColor: tokens.color.border,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.space.md,
    paddingVertical: tokens.space.sm,
    textAlign: 'center',
    color: tokens.color.ink,
    ...tokens.type.display,
    letterSpacing: 4,
  },
  codeBtnRow: { flexDirection: 'row', gap: tokens.space.sm, width: '100%', alignItems: 'center' },
  generateBtn: { flex: 1 },
  codeActionBtn: { flex: 1 },
  iconBtn: {
    width: tokens.hit.primary,
    height: tokens.hit.primary,
    borderRadius: tokens.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sectionLabel: { marginTop: tokens.space.xs },

  emptyState: { alignItems: 'center', paddingVertical: tokens.space.xxl, gap: tokens.space.sm },
  emptyText: { textAlign: 'center' },

  studentList: { gap: tokens.space.sm },
  studentRow: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.md },
  studentInfo: { flex: 1, gap: 2 },
  removeBtn: {
    width: tokens.hit.min,
    height: tokens.hit.min,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.color.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
