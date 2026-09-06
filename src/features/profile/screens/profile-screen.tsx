import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
  Image,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useUser } from '@/features/auth/context/user-context';
import { useStudentResults, COMBINED_MAX_POINTS } from '@/features/results/context/student-results-context';
import { useLanguage } from '@/shared/i18n/language-context';
import { errorMessage } from '@/shared/api';
import { useRouter } from 'expo-router';
import { Screen, ScreenHeader, Card, Button, Pill, ProgressBar, Icon, type IconName, H3, BodyStrong, Body, Label, Caption } from '@/shared/components/ui';
import { tokens, categoryColor } from '@/shared/theme/tokens';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const AVATAR_SIZE = 96;
const AVATAR_OPTION_SIZE = 66;

// Token-sourced replacement for the old hex accent list — same five-colour
// rotation, cycled by field index exactly as before.
const ACCENTS = [
  tokens.color.primary,
  tokens.color.points,
  tokens.color.success,
  tokens.color.red,
  tokens.color.navJigsaw,
];

// The six content categories, matched to `categoryColor` and to
// `src/shared/content/category-meta.ts`. Points per category are derived
// entirely from `results`, which the screen already reads via `useStudentResults`.
const CATEGORY_KEYS = ['history', 'culture', 'geography', 'festival', 'national', 'heroes'] as const;
const CATEGORY_LABEL_KEY = {
  history: 'catHistory',
  culture: 'catCulture',
  geography: 'catGeography',
  festival: 'catFestival',
  national: 'catNational',
  heroes: 'catHeroes',
} as const;

const STUDENT_AVATAR_OPTIONS = [
  { key: 'boy', emoji: '👦' },
  { key: 'girl', emoji: '👧' },
];
const TEACHER_AVATAR_OPTIONS = [
  { key: 'boy', emoji: '👨‍🏫' },
  { key: 'girl', emoji: '👩‍🏫' },
];

type FieldDef = {
  key: string;
  label: string;
  icon: IconName;
  value: string;
  draft: string;
  onChangeText: (v: string) => void;
  keyboardType?: 'default' | 'numeric' | 'email-address';
  /**
   * Identity, not a preference. `PATCH /users/me` refuses role, username,
   * email, LRN and teacher ID — changing them would desynchronise the username
   * reservation and the Firebase Auth record — so they render read-only.
   */
  readOnly?: boolean;
};

export default function ProfileScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const {
    uid,
    role,
    name,
    grade,
    section,
    avatar,
    photoUri,
    lrn,
    age,
    email,
    username,
    teacherId,
    depedGmail,
    updateProfile,
    uploadPhoto,
    requestPasswordReset,
    logout,
  } = useUser();
  const { results } = useStudentResults();
  const isTeacher = role === 'teacher' || role === 'admin';
  const AVATAR_OPTIONS = isTeacher ? TEACHER_AVATAR_OPTIONS : STUDENT_AVATAR_OPTIONS;

  const [editing, setEditing] = useState(false);
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [draftName, setDraftName] = useState(name);
  const [draftAge, setDraftAge] = useState(age);
  const [draftGrade, setDraftGrade] = useState(grade);
  const [draftSection, setDraftSection] = useState(section);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 450, useNativeDriver: true }).start();
  }, [fadeAnim]);

  const myResults = useMemo(
    () => (isTeacher ? [] : results.filter((r) => r.uid === uid)),
    [results, uid, isTeacher]
  );
  const totalPoints = myResults.reduce((sum, r) => sum + r.points, 0);
  const lastResult = useMemo(
    () => [...myResults].sort((a, b) => b.timestamp - a.timestamp)[0] || null,
    [myResults]
  );

  // Per-category totals for the progress card, built from the same
  // `myResults` the stat cards already use — no new context call.
  const categoryTotals = useMemo(() => {
    const map = new Map<string, number>();
    for (const key of CATEGORY_KEYS) {
      map.set(key, myResults.filter((r) => r.category === key).reduce((sum, r) => sum + r.points, 0));
    }
    return map;
  }, [myResults]);

  const classLabel = `${isTeacher ? t('handleGrade') : t('grade')} ${grade || '—'} · ${section || '—'}`;

  const expand = () => LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

  const startEditing = () => {
    setDraftName(name);
    setDraftAge(age);
    setDraftGrade(grade);
    setDraftSection(section);
    expand();
    setEditing(true);
  };

  const cancelEditing = () => {
    expand();
    setEditing(false);
  };

  // PATCH /users/me. Only the editable half is sent — identity fields are
  // fixed at registration and the API rejects them.
  const saveProfile = async () => {
    const requiredValues = isTeacher
      ? [draftName, draftGrade, draftSection]
      : [draftName, draftAge, draftGrade, draftSection];

    if (requiredValues.some((v) => !v.trim())) {
      Alert.alert(t('requiredFieldTitle'), t('requiredFieldMsg'));
      return;
    }

    setSaving(true);
    try {
      await updateProfile({
        name: draftName.trim(),
        grade: draftGrade.trim(),
        section: draftSection.trim(),
        ...(isTeacher ? {} : { age: draftAge.trim() }),
      });
      expand();
      setEditing(false);
      Alert.alert(t('profileUpdatedTitle'), t('profileUpdatedMsg'));
    } catch (err) {
      Alert.alert(t('requiredFieldTitle'), errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  /**
   * There is no "change password" endpoint by design: the API never sees a
   * password. Recovery goes through Firebase's reset email, the same route the
   * Forgot Password screen uses.
   */
  const handleChangePassword = () => {
    const target = isTeacher ? depedGmail || email : email;
    Alert.alert(t('changePasswordBtn'), t('passwordResetPrompt', { email: target || '—' }), [
      { text: t('cancelBtn'), style: 'cancel' },
      {
        text: t('sendOtpBtn'),
        onPress: async () => {
          try {
            await requestPasswordReset(target);
            Alert.alert(t('step5Title'), t('resetSuccessMsg'));
          } catch (err) {
            Alert.alert(t('changePasswordBtn'), errorMessage(err));
          }
        },
      },
    ]);
  };

  const handleLogout = () => {
    Alert.alert(t('logOutConfirmTitle'), t('logOutConfirmMsg'), [
      { text: t('cancelBtn'), style: 'cancel' },
      {
        text: t('logOutBtn'),
        style: 'destructive',
        // POST /auth/logout revokes every refresh token for the account, so the
        // session is dead server-side too, not just wiped off this device.
        onPress: async () => {
          await logout();
          // Equivalent of the old navigation.reset() — wipe the history so
          // "back" can't walk the user straight back into the logged-in app.
          if (router.canDismiss()) router.dismissAll();
          router.replace('/login');
        },
      },
    ]);
  };

  // The file goes to Cloud Storage via a signed URL, and the profile stores the
  // resulting public URL — so the photo follows the account to a new device
  // instead of being a file:// path that only this phone can resolve.
  const pickPhotoFromLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('photoPermissionTitle'), t('photoPermissionMsg'));
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    const asset = picked.assets?.[0];
    if (picked.canceled || !asset?.uri) return;

    setUploading(true);
    try {
      await uploadPhoto(asset.uri, asset.mimeType ?? undefined);
      setAvatarModalVisible(false);
    } catch (err) {
      Alert.alert(t('photoPermissionTitle'), errorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const chooseAvatar = async (emoji: string) => {
    try {
      await updateProfile({ avatar: emoji, photoUri: '' });
      setAvatarModalVisible(false);
    } catch (err) {
      Alert.alert(t('profilePhotoTitle'), errorMessage(err));
    }
  };

  const removePhoto = async () => {
    try {
      await updateProfile({ photoUri: '' });
      setAvatarModalVisible(false);
    } catch (err) {
      Alert.alert(t('profilePhotoTitle'), errorMessage(err));
    }
  };

  const handleAvatarPress = () => setAvatarModalVisible(true);

  const noop = () => {};

  const fields: FieldDef[] = isTeacher
    ? [
        { key: 'fullName', label: t('fullName'), icon: 'user', value: name, draft: draftName, onChangeText: setDraftName },
        { key: 'teacherId', label: t('teacherId'), icon: 'bookmark', value: teacherId, draft: teacherId, onChangeText: noop, readOnly: true },
        {
          key: 'gradeSection',
          label: t('gradeSectionLabel'),
          icon: 'book',
          value: grade || section ? `${t('handleGrade')} ${grade || '—'} · ${section || '—'}` : '—',
          draft: draftGrade,
          onChangeText: setDraftGrade,
        },
        // `email` is the same column server-side — falling back to it keeps the
        // row populated for any staff role, not just `teacher`.
        { key: 'depedGmail', label: t('depedGmail'), icon: 'flag', value: depedGmail || email, draft: depedGmail || email, onChangeText: noop, keyboardType: 'email-address', readOnly: true },
        { key: 'username', label: t('username'), icon: 'user', value: username, draft: username, onChangeText: noop, readOnly: true },
      ]
    : [
        { key: 'fullName', label: t('fullName'), icon: 'user', value: name, draft: draftName, onChangeText: setDraftName },
        { key: 'lrn', label: t('lrn'), icon: 'bookmark', value: lrn, draft: lrn, onChangeText: noop, keyboardType: 'numeric', readOnly: true },
        { key: 'age', label: t('age'), icon: 'clock', value: age, draft: draftAge, onChangeText: setDraftAge, keyboardType: 'numeric' },
        {
          key: 'gradeSection',
          label: t('gradeSectionLabel'),
          icon: 'book',
          value: grade || section ? `${t('grade')} ${grade || '—'}, ${section || '—'}` : '—',
          draft: draftGrade,
          onChangeText: setDraftGrade,
        },
        { key: 'email', label: t('email'), icon: 'flag', value: email, draft: email, onChangeText: noop, keyboardType: 'email-address', readOnly: true },
        { key: 'username', label: t('username'), icon: 'user', value: username, draft: username, onChangeText: noop, readOnly: true },
      ];

  const settingsItems: { key: string; label: string; icon: IconName; color: string; onPress: () => void }[] = [
    { key: 'update', label: t('updateProfileInfoBtn'), icon: 'user', color: tokens.color.points, onPress: startEditing },
    { key: 'password', label: t('changePasswordBtn'), icon: 'key', color: tokens.color.success, onPress: handleChangePassword },
    { key: 'settings', label: t('settingsBtn'), icon: 'grid', color: tokens.color.navJigsaw, onPress: () => router.navigate('/settings') },
    { key: 'logout', label: t('logOutBtn'), icon: 'logout', color: tokens.color.red, onPress: handleLogout },
  ];

  return (
    <Screen>
      <ScreenHeader
        title={name}
        subtitle={isTeacher ? t('adminProfileTitle') : t('studentProfileTitle')}
        color={tokens.color.primary}
        onBack={() => router.back()}
        right={
          <View style={styles.avatarWrap}>
            <TouchableOpacity activeOpacity={0.8} onPress={handleAvatarPress} style={styles.avatarCircle}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarEmoji}>{avatar}</Text>
              )}
            </TouchableOpacity>
            <View style={[styles.roleBadge, { borderColor: isTeacher ? tokens.color.points : tokens.color.primary }]}>
              <Icon name={isTeacher ? 'book' : 'user'} size={14} color={isTeacher ? tokens.color.points : tokens.color.primary} />
            </View>
            <TouchableOpacity style={styles.cameraBadge} onPress={handleAvatarPress}>
              <Ionicons name="camera" size={16} color={tokens.color.onDark} />
            </TouchableOpacity>
          </View>
        }
      >
        <View style={styles.headerPills}>
          <Pill label={classLabel} icon="book" tone="translucent" />
        </View>
      </ScreenHeader>

      <Animated.ScrollView style={{ opacity: fadeAnim }} contentContainerStyle={styles.body}>
        {!isTeacher && (
          <View style={styles.statsRow}>
            <Card style={styles.statCard}>
              <Icon name="star" size={20} color={tokens.color.points} filled />
              <H3 style={styles.statValue}>{totalPoints}</H3>
              <Label style={styles.statLabel} numberOfLines={1}>{t('totalPointsLabel')}</Label>
            </Card>
            <Card style={styles.statCard}>
              <Icon name="check" size={20} color={tokens.color.success} />
              <H3 style={styles.statValue}>{myResults.length}</H3>
              <Label style={styles.statLabel} numberOfLines={1}>{t('completed')}</Label>
            </Card>
            <Card style={styles.statCard}>
              <Icon name="medal" size={20} color={tokens.color.primary} />
              {lastResult ? (
                <>
                  <H3 style={styles.statValue}>{lastResult.points}</H3>
                  <Label style={styles.statLabel} numberOfLines={1}>{t('lastPointsLabel')}</Label>
                </>
              ) : (
                <Caption style={styles.statEmpty}>{t('noActivityYet')}</Caption>
              )}
            </Card>
          </View>
        )}

        {!isTeacher && (
          <Card style={styles.progressCard}>
            <Label style={styles.progressTitle}>{t('performanceProgression')}</Label>
            <View style={styles.progressList}>
              {CATEGORY_KEYS.map((key) => (
                <View key={key} style={styles.progressRow}>
                  <View style={styles.progressRowHead}>
                    <Body numberOfLines={1} style={styles.progressLabel}>{t(CATEGORY_LABEL_KEY[key])}</Body>
                    <Caption>{categoryTotals.get(key) || 0} {t('ptsSuffix')}</Caption>
                  </View>
                  <ProgressBar
                    value={(categoryTotals.get(key) || 0) / COMBINED_MAX_POINTS}
                    color={categoryColor(key).base}
                  />
                </View>
              ))}
            </View>
          </Card>
        )}

        <Card style={styles.fieldsCard}>
          {fields.map((f, i) => {
            const accent = ACCENTS[i % ACCENTS.length];
            const isGradeSection = f.key === 'gradeSection';

            return (
              <View key={f.key} style={styles.cardRow}>
                <View style={[styles.cardIconWrap, { backgroundColor: accent }]}>
                  <Icon name={f.icon} size={18} color={tokens.color.onDark} />
                </View>

                <View style={styles.cardBody}>
                  <Label style={styles.cardLabel}>{f.label}</Label>

                  {!editing || f.readOnly ? (
                    <>
                      <BodyStrong numberOfLines={1}>{f.value || '—'}</BodyStrong>
                      {editing && f.readOnly && (
                        <View style={styles.lockedHint}>
                          <Icon name="lock" size={11} color={tokens.color.inkFaint} />
                          <Caption style={styles.lockedHintText}>{t('fieldLockedHint')}</Caption>
                        </View>
                      )}
                    </>
                  ) : isGradeSection ? (
                    <View style={styles.inlineRow}>
                      <TextInput
                        style={[styles.cardInput, styles.inlineInput]}
                        value={draftGrade}
                        onChangeText={setDraftGrade}
                        placeholder={t('grade')}
                        placeholderTextColor={tokens.color.inkFaint}
                      />
                      <TextInput
                        style={[styles.cardInput, styles.inlineInput]}
                        value={draftSection}
                        onChangeText={setDraftSection}
                        placeholder={t('section')}
                        placeholderTextColor={tokens.color.inkFaint}
                      />
                    </View>
                  ) : (
                    <TextInput
                      style={styles.cardInput}
                      value={f.draft}
                      onChangeText={f.onChangeText}
                      keyboardType={f.keyboardType || 'default'}
                      placeholder={f.label}
                      placeholderTextColor={tokens.color.inkFaint}
                    />
                  )}
                </View>
              </View>
            );
          })}
        </Card>

        {editing && (
          <View style={styles.editActionsRow}>
            <Button label={t('cancelBtn')} variant="secondary" onPress={cancelEditing} disabled={saving} style={styles.editBtn} />
            <Button
              label={t('saveBtn')}
              onPress={saveProfile}
              busy={saving}
              color={tokens.color.success}
              shadowColor={tokens.color.successDark}
              style={styles.editBtn}
            />
          </View>
        )}

        {!editing && (
          <Card style={styles.settingsCard}>
            {settingsItems.map((item, i) => (
              <TouchableOpacity
                key={item.key}
                style={[styles.settingsRow, i !== settingsItems.length - 1 && styles.settingsRowDivider]}
                onPress={item.onPress}
                activeOpacity={0.7}
              >
                <View style={[styles.iconChip, { backgroundColor: item.color }]}>
                  <Icon name={item.icon} size={18} color={tokens.color.onDark} />
                </View>
                <BodyStrong style={styles.settingsLabel} numberOfLines={1}>{item.label}</BodyStrong>
                <Icon name="chevronRight" size={18} color={tokens.color.inkFaint} />
              </TouchableOpacity>
            ))}
          </Card>
        )}
      </Animated.ScrollView>

      <Modal visible={avatarModalVisible} transparent animationType="fade" onRequestClose={() => setAvatarModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setAvatarModalVisible(false)}>
          <View style={styles.modalBackdrop} />
          <TouchableOpacity activeOpacity={1} style={styles.modalCard} onPress={() => {}}>
            <H3 style={styles.modalTitle}>{t('profilePhotoTitle')}</H3>

            <TouchableOpacity style={styles.uploadRow} onPress={pickPhotoFromLibrary} disabled={uploading}>
              <View style={[styles.uploadIconWrap, { backgroundColor: tokens.color.primary }]}>
                {uploading ? (
                  <ActivityIndicator color={tokens.color.onDark} size="small" />
                ) : (
                  <Ionicons name="image-outline" size={18} color={tokens.color.onDark} />
                )}
              </View>
              <BodyStrong>{t('uploadFromGalleryBtn')}</BodyStrong>
            </TouchableOpacity>

            <Label style={styles.orLabel}>{t('orChooseAvatarLabel')}</Label>

            <View style={styles.avatarOptionsRow}>
              {AVATAR_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.avatarOption, avatar === opt.emoji && !photoUri && styles.avatarOptionSelected]}
                  onPress={() => chooseAvatar(opt.emoji)}
                >
                  <Text style={styles.avatarOptionEmoji}>{opt.emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {!!photoUri && (
              <TouchableOpacity style={styles.removePhotoRow} onPress={removePhoto}>
                <Ionicons name="trash-outline" size={16} color={tokens.color.red} />
                <BodyStrong style={styles.removePhotoText}>{t('removePhotoBtn')}</BodyStrong>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setAvatarModalVisible(false)}>
              <BodyStrong style={styles.modalCancelText}>{t('cancelBtn')}</BodyStrong>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { padding: tokens.space.lg, paddingBottom: tokens.space.xxl, gap: tokens.space.lg },

  headerPills: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm, marginTop: tokens.space.md },

  avatarWrap: { width: AVATAR_SIZE, height: AVATAR_SIZE, position: 'relative' },
  avatarCircle: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.color.surface,
    borderWidth: 3,
    borderColor: tokens.color.onDarkBorder,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarEmoji: { fontSize: Math.round(AVATAR_SIZE * 0.48) },
  roleBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 30,
    height: 30,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.color.surface,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: -4,
    left: -4,
    width: tokens.hit.min,
    height: tokens.hit.min,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.color.primaryDark,
    borderWidth: 2,
    borderColor: tokens.color.onDark,
    alignItems: 'center',
    justifyContent: 'center',
  },

  statsRow: { flexDirection: 'row', gap: tokens.space.sm },
  statCard: { flex: 1, alignItems: 'center', gap: tokens.space.xs, padding: tokens.space.md },
  statValue: { marginTop: tokens.space.xs },
  statLabel: { textAlign: 'center' },
  statEmpty: { textAlign: 'center' },

  progressCard: { gap: tokens.space.md },
  progressTitle: { marginBottom: tokens.space.xs },
  progressList: { gap: tokens.space.md },
  progressRow: { gap: tokens.space.xs },
  progressRowHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: tokens.space.sm },
  progressLabel: { flex: 1 },

  fieldsCard: { gap: tokens.space.md },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.md },
  cardIconWrap: { width: 36, height: 36, borderRadius: tokens.radius.md, alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1 },
  cardLabel: { marginBottom: 2 },
  lockedHint: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  lockedHintText: { fontStyle: 'italic' },
  cardInput: {
    fontFamily: tokens.font.bodyBold,
    fontSize: tokens.type.body.fontSize,
    color: tokens.color.ink,
    borderBottomWidth: 1,
    borderBottomColor: tokens.color.border,
    paddingVertical: tokens.space.xs,
  },
  inlineRow: { flexDirection: 'row', gap: tokens.space.sm },
  inlineInput: { flex: 1 },

  editActionsRow: { flexDirection: 'row', gap: tokens.space.md },
  editBtn: { flex: 1 },

  settingsCard: { padding: 0, overflow: 'hidden' },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.md,
    minHeight: tokens.hit.min,
    paddingHorizontal: tokens.space.lg,
    paddingVertical: tokens.space.sm,
  },
  settingsRowDivider: { borderBottomWidth: 1, borderBottomColor: tokens.color.divider },
  iconChip: { width: 36, height: 36, borderRadius: tokens.radius.md, alignItems: 'center', justifyContent: 'center' },
  settingsLabel: { flex: 1 },

  modalOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: tokens.space.xl },
  modalBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: tokens.color.ink, opacity: 0.5 },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: tokens.color.surface,
    borderRadius: tokens.radius.lg,
    padding: tokens.space.xl,
    borderWidth: 2,
    borderColor: tokens.color.border,
  },
  modalTitle: { textAlign: 'center', marginBottom: tokens.space.lg },
  uploadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: tokens.hit.min,
    backgroundColor: tokens.color.surfaceSunken,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.space.md,
    gap: tokens.space.md,
  },
  uploadIconWrap: { width: 34, height: 34, borderRadius: tokens.radius.sm, alignItems: 'center', justifyContent: 'center' },
  orLabel: { textAlign: 'center', marginTop: tokens.space.lg, marginBottom: tokens.space.sm },
  avatarOptionsRow: { flexDirection: 'row', justifyContent: 'center', gap: tokens.space.lg },
  avatarOption: {
    width: AVATAR_OPTION_SIZE,
    height: AVATAR_OPTION_SIZE,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.color.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: tokens.color.border,
  },
  avatarOptionSelected: { borderColor: tokens.color.success, backgroundColor: tokens.color.successSoft },
  avatarOptionEmoji: { fontSize: Math.round(AVATAR_OPTION_SIZE * 0.48) },
  removePhotoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: tokens.space.xs, minHeight: tokens.hit.min, marginTop: tokens.space.md },
  removePhotoText: { color: tokens.color.red },
  modalCancelBtn: {
    marginTop: tokens.space.md,
    minHeight: tokens.hit.min,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: tokens.color.divider,
  },
  modalCancelText: { color: tokens.color.inkMuted },
});
