import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
  Image,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useUser } from '@/features/auth/context/user-context';
import { useStudentResults } from '@/features/results/context/student-results-context';
import { useLanguage } from '@/shared/i18n/language-context';
import { useRouter } from 'expo-router';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const ACCENTS = ['#0038A8', '#E8801A', '#3E9E4F', '#CE1126', '#6C4AB6'];
const STUDENT_AVATAR_OPTIONS = [
  { key: 'boy', emoji: '👦' },
  { key: 'girl', emoji: '👧' },
];
const TEACHER_AVATAR_OPTIONS = [
  { key: 'boy', emoji: '👨\u200d🏫' },
  { key: 'girl', emoji: '👩\u200d🏫' },
];

type FieldDef = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  draft: string;
  onChangeText: (v: string) => void;
  keyboardType?: 'default' | 'numeric' | 'email-address';
};

export default function ProfileScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const {
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
    password,
    teacherId,
    depedGmail,
    updateProfile,
  } = useUser();
  const { results } = useStudentResults();
  const isTeacher = role === 'teacher';
  const AVATAR_OPTIONS = isTeacher ? TEACHER_AVATAR_OPTIONS : STUDENT_AVATAR_OPTIONS;

  const [editing, setEditing] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);

  const [draftName, setDraftName] = useState(name);
  const [draftLrn, setDraftLrn] = useState(lrn);
  const [draftAge, setDraftAge] = useState(age);
  const [draftGrade, setDraftGrade] = useState(grade);
  const [draftSection, setDraftSection] = useState(section);
  const [draftEmail, setDraftEmail] = useState(email);
  const [draftUsername, setDraftUsername] = useState(username);
  const [draftTeacherId, setDraftTeacherId] = useState(teacherId);
  const [draftDepedGmail, setDraftDepedGmail] = useState(depedGmail);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 450, useNativeDriver: true }).start();
  }, [fadeAnim]);

  const myResults = useMemo(
    () => (isTeacher ? [] : results.filter((r) => r.studentName === name)),
    [results, name, isTeacher]
  );
  const totalPoints = myResults.reduce((sum, r) => sum + r.points, 0);
  const lastResult = useMemo(
    () => [...myResults].sort((a, b) => b.timestamp - a.timestamp)[0] || null,
    [myResults]
  );

  const expand = () => LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

  const startEditing = () => {
    setDraftName(name);
    setDraftLrn(lrn);
    setDraftAge(age);
    setDraftGrade(grade);
    setDraftSection(section);
    setDraftEmail(email);
    setDraftUsername(username);
    setDraftTeacherId(teacherId);
    setDraftDepedGmail(depedGmail);
    expand();
    setChangingPassword(false);
    setEditing(true);
  };

  const cancelEditing = () => {
    expand();
    setEditing(false);
  };

  const saveProfile = () => {
    const requiredValues = isTeacher
      ? [draftName, draftTeacherId, draftGrade, draftSection, draftDepedGmail, draftUsername]
      : [draftName, draftLrn, draftAge, draftGrade, draftSection, draftEmail, draftUsername];

    if (requiredValues.some((v) => !v.trim())) {
      Alert.alert(t('requiredFieldTitle'), t('requiredFieldMsg'));
      return;
    }

    if (isTeacher) {
      updateProfile({
        name: draftName.trim(),
        teacherId: draftTeacherId.trim(),
        grade: draftGrade.trim(),
        section: draftSection.trim(),
        depedGmail: draftDepedGmail.trim(),
        username: draftUsername.trim(),
      });
    } else {
      updateProfile({
        name: draftName.trim(),
        lrn: draftLrn.trim(),
        age: draftAge.trim(),
        grade: draftGrade.trim(),
        section: draftSection.trim(),
        email: draftEmail.trim(),
        username: draftUsername.trim(),
      });
    }

    expand();
    setEditing(false);
    Alert.alert(t('profileUpdatedTitle'), t('profileUpdatedMsg'));
  };

  const startChangingPassword = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    expand();
    setEditing(false);
    setChangingPassword(true);
  };

  const cancelChangingPassword = () => {
    expand();
    setChangingPassword(false);
  };

  const savePassword = () => {
    if (currentPassword !== password) {
      Alert.alert(t('currentPasswordWrongTitle'), t('currentPasswordWrongMsg'));
      return;
    }
    if (!newPassword.trim() || newPassword !== confirmNewPassword) {
      Alert.alert(t('passwordMismatch'), t('passwordMismatchMsg'));
      return;
    }
    updateProfile({ password: newPassword.trim() });
    expand();
    setChangingPassword(false);
    Alert.alert(t('passwordUpdatedTitle'), t('passwordUpdatedMsg'));
  };

  const handleLogout = () => {
    Alert.alert(t('logOutConfirmTitle'), t('logOutConfirmMsg'), [
      { text: t('cancelBtn'), style: 'cancel' },
      {
        text: t('logOutBtn'),
        style: 'destructive',
        // Equivalent of the old navigation.reset() — wipe the history so
        // "back" can't walk the user straight back into the logged-in app.
        onPress: () => {
          if (router.canDismiss()) router.dismissAll();
          router.replace('/login');
        },
      },
    ]);
  };

  const pickPhotoFromLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('photoPermissionTitle'), t('photoPermissionMsg'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      updateProfile({ photoUri: result.assets[0].uri });
      setAvatarModalVisible(false);
    }
  };

  const chooseAvatar = (emoji: string) => {
    updateProfile({ avatar: emoji, photoUri: '' });
    setAvatarModalVisible(false);
  };

  const removePhoto = () => {
    updateProfile({ photoUri: '' });
    setAvatarModalVisible(false);
  };

  const handleAvatarPress = () => setAvatarModalVisible(true);

  const fields: FieldDef[] = isTeacher
    ? [
        { key: 'fullName', label: t('fullName'), icon: 'person-outline', value: name, draft: draftName, onChangeText: setDraftName },
        { key: 'teacherId', label: t('teacherId'), icon: 'id-card-outline', value: teacherId, draft: draftTeacherId, onChangeText: setDraftTeacherId },
        {
          key: 'gradeSection',
          label: t('gradeSectionLabel'),
          icon: 'school-outline',
          value: grade || section ? `${t('handleGrade')} ${grade || '—'} · ${section || '—'}` : '—',
          draft: draftGrade,
          onChangeText: setDraftGrade,
        },
        { key: 'depedGmail', label: t('depedGmail'), icon: 'mail-outline', value: depedGmail, draft: draftDepedGmail, onChangeText: setDraftDepedGmail, keyboardType: 'email-address' },
        { key: 'username', label: t('username'), icon: 'person-circle-outline', value: username, draft: draftUsername, onChangeText: setDraftUsername },
      ]
    : [
        { key: 'fullName', label: t('fullName'), icon: 'person-outline', value: name, draft: draftName, onChangeText: setDraftName },
        { key: 'lrn', label: t('lrn'), icon: 'card-outline', value: lrn, draft: draftLrn, onChangeText: setDraftLrn, keyboardType: 'numeric' },
        { key: 'age', label: t('age'), icon: 'calendar-outline', value: age, draft: draftAge, onChangeText: setDraftAge, keyboardType: 'numeric' },
        {
          key: 'gradeSection',
          label: t('gradeSectionLabel'),
          icon: 'school-outline',
          value: grade || section ? `${t('grade')} ${grade || '—'}, ${section || '—'}` : '—',
          draft: draftGrade,
          onChangeText: setDraftGrade,
        },
        { key: 'email', label: t('email'), icon: 'mail-outline', value: email, draft: draftEmail, onChangeText: setDraftEmail, keyboardType: 'email-address' },
        { key: 'username', label: t('username'), icon: 'person-circle-outline', value: username, draft: draftUsername, onChangeText: setDraftUsername },
      ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <Ionicons name="chevron-back" size={22} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('profileSettings') || 'Profile'}</Text>
      </View>

      <Animated.ScrollView
        style={{ opacity: fadeAnim }}
        contentContainerStyle={styles.body}
      >
        <View style={styles.avatarWrap}>
          <TouchableOpacity activeOpacity={0.8} onPress={handleAvatarPress} style={styles.avatarCircle}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarEmoji}>{avatar}</Text>
            )}
          </TouchableOpacity>
          <View style={[styles.roleBadge, isTeacher ? styles.roleBadgeTeacher : styles.roleBadgeStudent]}>
            <Text style={styles.roleBadgeEmoji}>{isTeacher ? '🧑‍🏫' : '🎓'}</Text>
          </View>
          <TouchableOpacity style={styles.cameraBadge} onPress={handleAvatarPress}>
            <Ionicons name="camera" size={14} color="#FFF" />
          </TouchableOpacity>
        </View>

        <Text style={styles.profileTitle}>
          {isTeacher ? t('adminProfileTitle') : t('studentProfileTitle')}
        </Text>

        {!isTeacher && (
          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>{t('totalPointsLabel')}</Text>
            <Text style={styles.statsPoints}>★ {totalPoints}</Text>
            <View style={styles.statsDivider} />
            <Text style={styles.statsTitle}>{t('lastPointsLabel')}</Text>
            {lastResult ? (
              <Text style={styles.statsLast}>
                ★ {lastResult.points} {t('ptsSuffix')} · ⏱ {lastResult.timeUsed}{t('timeUsedSuffix')} ·{' '}
                {lastResult.medal ? lastResult.medal.toUpperCase() : t('timeUpTitle')}
              </Text>
            ) : (
              <Text style={styles.statsLastEmpty}>{t('noActivityYet')}</Text>
            )}
          </View>
        )}

        <View style={styles.cardList}>
          {fields.map((f, i) => {
            const accent = ACCENTS[i % ACCENTS.length];
            const isGradeSection = f.key === 'gradeSection';

            return (
              <View key={f.key} style={styles.cardRow}>
                <View style={[styles.cardIconWrap, { backgroundColor: accent }]}>
                  <Ionicons name={f.icon} size={18} color="#FFF" />
                </View>

                <View style={styles.cardBody}>
                  <Text style={styles.cardLabel}>{f.label}</Text>

                  {!editing ? (
                    <Text style={styles.cardValue} numberOfLines={1}>
                      {f.value || '—'}
                    </Text>
                  ) : isGradeSection ? (
                    <View style={styles.inlineRow}>
                      <TextInput
                        style={[styles.cardInput, styles.inlineInput]}
                        value={draftGrade}
                        onChangeText={setDraftGrade}
                        placeholder={t('grade')}
                        placeholderTextColor="#B0B0B0"
                      />
                      <TextInput
                        style={[styles.cardInput, styles.inlineInput]}
                        value={draftSection}
                        onChangeText={setDraftSection}
                        placeholder={t('section')}
                        placeholderTextColor="#B0B0B0"
                      />
                    </View>
                  ) : (
                    <TextInput
                      style={styles.cardInput}
                      value={f.draft}
                      onChangeText={f.onChangeText}
                      keyboardType={f.keyboardType || 'default'}
                      placeholder={f.label}
                      placeholderTextColor="#B0B0B0"
                    />
                  )}
                </View>

                {!editing && (
                  <TouchableOpacity style={styles.pencilBtn} onPress={startEditing}>
                    <Ionicons name="pencil" size={16} color="#8E8E93" />
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>

        {editing && (
          <View style={styles.editActionsRow}>
            <TouchableOpacity style={styles.cancelButton} onPress={cancelEditing}>
              <Text style={styles.cancelButtonText}>{t('cancelBtn')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={saveProfile}>
              <Text style={styles.saveButtonText}>{t('saveBtn')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {changingPassword && (
          <View style={styles.passwordCard}>
            <Text style={styles.passwordCardTitle}>{t('changePasswordBtn')}</Text>
            <Field label={t('currentPassword')} value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry />
            <Field label={t('newPassword')} value={newPassword} onChangeText={setNewPassword} secureTextEntry />
            <Field label={t('confirmNewPassword')} value={confirmNewPassword} onChangeText={setConfirmNewPassword} secureTextEntry />
            <View style={styles.editActionsRow}>
              <TouchableOpacity style={styles.cancelButton} onPress={cancelChangingPassword}>
                <Text style={styles.cancelButtonText}>{t('cancelBtn')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={savePassword}>
                <Text style={styles.saveButtonText}>{t('saveBtn')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {!editing && !changingPassword && (
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.updateBtn} onPress={startEditing}>
              <Ionicons name="create-outline" size={16} color="#FFF" />
              <Text style={styles.actionBtnText}>{t('updateProfileInfoBtn')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.passwordBtn} onPress={startChangingPassword}>
              <Ionicons name="key-outline" size={16} color="#FFF" />
              <Text style={styles.actionBtnText}>{t('changePasswordBtn')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingsBtn} onPress={() => router.navigate('/settings')}>
              <Ionicons name="settings-outline" size={16} color="#FFF" />
              <Text style={styles.actionBtnText}>{t('settingsBtn')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={16} color="#FFF" />
              <Text style={styles.actionBtnText}>{t('logOutBtn')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.ScrollView>

      <Modal visible={avatarModalVisible} transparent animationType="fade" onRequestClose={() => setAvatarModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setAvatarModalVisible(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>{t('profilePhotoTitle')}</Text>

            <TouchableOpacity style={styles.uploadRow} onPress={pickPhotoFromLibrary}>
              <View style={[styles.uploadIconWrap, { backgroundColor: '#0038A8' }]}>
                <Ionicons name="image-outline" size={18} color="#FFF" />
              </View>
              <Text style={styles.uploadRowText}>{t('uploadFromGalleryBtn')}</Text>
            </TouchableOpacity>

            <Text style={styles.orLabel}>{t('orChooseAvatarLabel')}</Text>

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
                <Ionicons name="trash-outline" size={16} color="#CE1126" />
                <Text style={styles.removePhotoText}>{t('removePhotoBtn')}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setAvatarModalVisible(false)}>
              <Text style={styles.modalCancelText}>{t('cancelBtn')}</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

function Field({ label, ...props }: any) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput style={styles.fieldInput} placeholderTextColor="#B0B0B0" {...props} />
    </View>
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
  body: { alignItems: 'center', padding: 20, paddingBottom: 48 },

  avatarWrap: { marginTop: 10, position: 'relative' },
  avatarCircle: {
    width: 90, height: 90, borderRadius: 45, backgroundColor: '#FFF', borderWidth: 3,
    borderColor: '#0038A8', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarEmoji: { fontSize: 44 },
  roleBadge: {
    position: 'absolute', bottom: -2, right: -2, width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#FFF', borderWidth: 2, alignItems: 'center', justifyContent: 'center',
  },
  roleBadgeStudent: { borderColor: '#0038A8' },
  roleBadgeTeacher: { borderColor: '#E8801A' },
  roleBadgeEmoji: { fontSize: 14 },
  cameraBadge: {
    position: 'absolute', bottom: -2, left: -2, width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#6C4AB6', borderWidth: 2, borderColor: '#FFF', alignItems: 'center', justifyContent: 'center',
  },

  profileTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A', marginTop: 14, marginBottom: 4 },

  statsCard: {
    width: '100%', backgroundColor: '#FFF', borderRadius: 16, padding: 18, marginTop: 10,
    borderWidth: 2, borderColor: '#E0D5BE', alignItems: 'center',
  },
  statsTitle: { fontSize: 12, color: '#8E8E93', fontWeight: '600' },
  statsPoints: { fontSize: 28, fontWeight: '900', color: '#E8801A', marginTop: 4, marginBottom: 12 },
  statsDivider: { width: '100%', height: 1, backgroundColor: '#E0D5BE', marginBottom: 12 },
  statsLast: { fontSize: 13, fontWeight: '700', color: '#5C3A21', marginTop: 4, textAlign: 'center' },
  statsLastEmpty: { fontSize: 12, color: '#8E8E93', marginTop: 4 },

  cardList: { width: '100%', marginTop: 18, gap: 10 },
  cardRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 14,
    padding: 12, borderWidth: 1, borderColor: '#E0D5BE',
  },
  cardIconWrap: {
    width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  cardBody: { flex: 1 },
  cardLabel: { fontSize: 11, color: '#8E8E93', fontWeight: '600', marginBottom: 2 },
  cardValue: { fontSize: 15, color: '#1A1A1A', fontWeight: '600' },
  cardInput: {
    fontSize: 15, color: '#1A1A1A', fontWeight: '600', borderBottomWidth: 1,
    borderBottomColor: '#D0D0D0', paddingVertical: 2,
  },
  inlineRow: { flexDirection: 'row', gap: 10 },
  inlineInput: { flex: 1 },
  pencilBtn: { padding: 6, marginLeft: 4 },

  editActionsRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelButton: { paddingVertical: 12, paddingHorizontal: 22, borderRadius: 22, backgroundColor: '#B0B0B0' },
  cancelButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  saveButton: { paddingVertical: 12, paddingHorizontal: 26, borderRadius: 22, backgroundColor: '#3E9E4F' },
  saveButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },

  passwordCard: {
    width: '100%', backgroundColor: '#FFF', borderRadius: 16, padding: 18, marginTop: 18,
    borderWidth: 2, borderColor: '#E0D5BE',
  },
  passwordCardTitle: { fontSize: 14, fontWeight: 'bold', color: '#3E9E4F', marginBottom: 10 },
  fieldWrap: { width: '100%', marginBottom: 14 },
  fieldLabel: { fontSize: 12, color: '#8E8E93', marginBottom: 4, fontWeight: '600' },
  fieldInput: {
    borderBottomWidth: 1, borderBottomColor: '#D0D0D0', paddingVertical: 8, fontSize: 15, color: '#1A1A1A',
  },

  actionButtons: { width: '100%', marginTop: 26, gap: 12 },
  updateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#E8801A', paddingVertical: 14, borderRadius: 24,
  },
  passwordBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#3E9E4F', paddingVertical: 14, borderRadius: 24,
  },
  settingsBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#6C4AB6', paddingVertical: 14, borderRadius: 24,
  },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#CE1126', paddingVertical: 14, borderRadius: 24,
  },
  actionBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 13, letterSpacing: 0.5 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalCard: {
    width: '100%', maxWidth: 340, backgroundColor: '#FFF', borderRadius: 20, padding: 20,
    borderWidth: 2, borderColor: '#E0D5BE',
  },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#1A1A1A', textAlign: 'center', marginBottom: 16 },
  uploadRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5EFE0', borderRadius: 14,
    padding: 12, gap: 12,
  },
  uploadIconWrap: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  uploadRowText: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  orLabel: { fontSize: 12, color: '#8E8E93', textAlign: 'center', marginTop: 18, marginBottom: 10, fontWeight: '600' },
  avatarOptionsRow: { flexDirection: 'row', justifyContent: 'center', gap: 18 },
  avatarOption: {
    width: 66, height: 66, borderRadius: 33, backgroundColor: '#F5EFE0', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#E0D5BE',
  },
  avatarOptionSelected: { borderColor: '#3E9E4F', backgroundColor: '#EAF6EC' },
  avatarOptionEmoji: { fontSize: 32 },
  removePhotoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 18 },
  removePhotoText: { color: '#CE1126', fontWeight: '600', fontSize: 13 },
  modalCancelBtn: { marginTop: 18, paddingVertical: 12, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F0E9D8' },
  modalCancelText: { color: '#8E8E93', fontWeight: '600', fontSize: 13 },
});