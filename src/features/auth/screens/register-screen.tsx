import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '@/shared/i18n/language-context';
import { useUser } from '@/features/auth/context/user-context';
import { images } from '@/shared/assets/images';
import { useRouter } from 'expo-router';

const LRN_REGEX = /^\d{12}$/;
const TEACHER_ID_REGEX = /^\d{7}$/;
const GRADE_REGEX = /^\d+$/;
const GMAIL_REGEX = /^[^\s@]+@gmail\.com$/i;
const DEPED_GMAIL_REGEX = /^\S+@deped\.gov\.ph$/i;
const USERNAME_REGEX = /^\S+$/;

function isFullName(name: string) {
  return name.trim().split(/\s+/).length >= 2;
}

export default function RegisterScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { registerUser } = useUser();
  const [role, setRole] = useState<'student' | 'teacher'>('student');

  const [lrn, setLrn] = useState('');
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [grade, setGrade] = useState('');
  const [section, setSection] = useState('');
  const [email, setEmail] = useState('');

  const [teacherName, setTeacherName] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [handleGrade, setHandleGrade] = useState('');
  const [teacherSection, setTeacherSection] = useState('');
  const [depedGmail, setDepedGmail] = useState('');

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const markTouched = (key: string) => setTouched((prev) => ({ ...prev, [key]: true }));

  const logo =
    role === 'student'
      ? images.studentLogo
      : images.teacherLogo;

  const pwChecks = useMemo(
    () => ({
      minChars: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
    }),
    [password]
  );
  const passwordValid = Object.values(pwChecks).every(Boolean);

  const errorFor = (key: string, value: string, valid: boolean, msg: string) =>
    touched[key] && value.length > 0 && !valid ? msg : undefined;

  const lrnError = errorFor('lrn', lrn, LRN_REGEX.test(lrn), t('invalidLrnMsg'));
  const fullNameError = errorFor('fullName', fullName, isFullName(fullName), t('invalidFullNameMsg'));
  const gradeError = errorFor('grade', grade, GRADE_REGEX.test(grade), t('invalidGradeMsg'));
  const emailError = errorFor('email', email, GMAIL_REGEX.test(email), t('invalidGmailMsg'));
  const teacherNameError = errorFor('teacherName', teacherName, isFullName(teacherName), t('invalidFullNameMsg'));
  const teacherIdError = errorFor('teacherId', teacherId, TEACHER_ID_REGEX.test(teacherId), t('invalidTeacherIdMsg'));
  const handleGradeError = errorFor('handleGrade', handleGrade, GRADE_REGEX.test(handleGrade), t('invalidGradeMsg'));
  const depedGmailError = errorFor('depedGmail', depedGmail, DEPED_GMAIL_REGEX.test(depedGmail), t('invalidDepedGmailMsg'));
  const usernameError = errorFor('username', username, USERNAME_REGEX.test(username), t('invalidUsernameMsg'));

  const handleRegister = () => {
    setTouched({
      lrn: true, fullName: true, grade: true, email: true,
      teacherName: true, teacherId: true, handleGrade: true, depedGmail: true,
      username: true,
    });

    if (!username.trim() || !USERNAME_REGEX.test(username)) {
      Alert.alert(t('missingInfo'), t('invalidUsernameMsg'));
      return;
    }
    if (!passwordValid) {
      Alert.alert(t('missingInfo'), t('invalidPasswordMsg'));
      return;
    }

    if (role === 'student') {
      if (!lrn || !fullName || !age || !grade || !section || !email) {
        Alert.alert(t('missingInfo'), t('fillUsernamePass'));
        return;
      }
      if (!LRN_REGEX.test(lrn)) {
        Alert.alert(t('missingInfo'), t('invalidLrnMsg'));
        return;
      }
      if (!isFullName(fullName)) {
        Alert.alert(t('missingInfo'), t('invalidFullNameMsg'));
        return;
      }
      if (!GRADE_REGEX.test(grade)) {
        Alert.alert(t('missingInfo'), t('invalidGradeMsg'));
        return;
      }
      if (!GMAIL_REGEX.test(email)) {
        Alert.alert(t('missingInfo'), t('invalidGmailMsg'));
        return;
      }
      registerUser({
        role: 'student',
        name: fullName,
        lrn,
        age,
        grade,
        section,
        email,
        username,
        password,
        avatar: '🧑‍🎓',
      });
    } else {
      if (!teacherName || !teacherId || !handleGrade || !teacherSection || !depedGmail) {
        Alert.alert(t('missingInfo'), t('fillUsernamePass'));
        return;
      }
      if (!isFullName(teacherName)) {
        Alert.alert(t('missingInfo'), t('invalidFullNameMsg'));
        return;
      }
      if (!TEACHER_ID_REGEX.test(teacherId)) {
        Alert.alert(t('missingInfo'), t('invalidTeacherIdMsg'));
        return;
      }
      if (!GRADE_REGEX.test(handleGrade)) {
        Alert.alert(t('missingInfo'), t('invalidGradeMsg'));
        return;
      }
      if (!DEPED_GMAIL_REGEX.test(depedGmail)) {
        Alert.alert(t('missingInfo'), t('invalidDepedGmailMsg'));
        return;
      }
      registerUser({
        role: 'teacher',
        name: teacherName,
        teacherId,
        grade: handleGrade,
        section: teacherSection,
        depedGmail,
        username,
        password,
        avatar: '🧑‍🏫',
      });
    }

    Alert.alert(t('registerSuccess'), t('registerSuccessMsg'), [
      { text: 'OK', onPress: () => router.navigate('/login') },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>{t('registerTitle')}</Text>

        <Image source={logo} style={styles.logo} resizeMode="contain" />

        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleBtn, role === 'student' && styles.toggleBtnActive]}
            onPress={() => setRole('student')}
          >
            <Text style={[styles.toggleText, role === 'student' && styles.toggleTextActive]}>
              {t('student')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, role === 'teacher' && styles.toggleBtnActive]}
            onPress={() => setRole('teacher')}
          >
            <Text style={[styles.toggleText, role === 'teacher' && styles.toggleTextActive]}>
              {t('teacher')}
            </Text>
          </TouchableOpacity>
        </View>

        {role === 'student' ? (
          <>
            <Field
              label={t('lrn')}
              placeholder="123456789012"
              value={lrn}
              onChangeText={setLrn}
              onBlur={() => markTouched('lrn')}
              keyboardType="number-pad"
              maxLength={12}
              error={lrnError}
            />
            <Field
              label={t('fullName')}
              placeholder="Juan Dela Cruz"
              value={fullName}
              onChangeText={setFullName}
              onBlur={() => markTouched('fullName')}
              error={fullNameError}
            />
            <Field label={t('age')} value={age} onChangeText={setAge} keyboardType="number-pad" />
            <Field
              label={t('grade')}
              placeholder="6"
              value={grade}
              onChangeText={setGrade}
              onBlur={() => markTouched('grade')}
              keyboardType="number-pad"
              error={gradeError}
            />
            <Field label={t('section')} value={section} onChangeText={setSection} />
            <Field
              label={t('email')}
              placeholder="juan123@gmail.com"
              value={email}
              onChangeText={setEmail}
              onBlur={() => markTouched('email')}
              keyboardType="email-address"
              autoCapitalize="none"
              error={emailError}
            />
          </>
        ) : (
          <>
            <Field
              label={t('fullName')}
              placeholder="Maria Cruz"
              value={teacherName}
              onChangeText={setTeacherName}
              onBlur={() => markTouched('teacherName')}
              error={teacherNameError}
            />
            <Field
              label={t('teacherId')}
              placeholder="1234567"
              value={teacherId}
              onChangeText={setTeacherId}
              onBlur={() => markTouched('teacherId')}
              keyboardType="number-pad"
              maxLength={7}
              error={teacherIdError}
            />
            <Field
              label={t('handleGrade')}
              placeholder="5"
              value={handleGrade}
              onChangeText={setHandleGrade}
              onBlur={() => markTouched('handleGrade')}
              keyboardType="number-pad"
              error={handleGradeError}
            />
            <Field label={t('section')} value={teacherSection} onChangeText={setTeacherSection} />
            <Field
              label={t('depedGmail')}
              placeholder="maria.cruz@deped.gov.ph"
              value={depedGmail}
              onChangeText={setDepedGmail}
              onBlur={() => markTouched('depedGmail')}
              keyboardType="email-address"
              autoCapitalize="none"
              error={depedGmailError}
            />
          </>
        )}

        <Field
          label={t('username')}
          placeholder={t('usernameHint')}
          value={username}
          onChangeText={setUsername}
          onBlur={() => markTouched('username')}
          autoCapitalize="none"
          error={usernameError}
        />

        <View style={styles.fieldWrap}>
          <Text style={styles.fieldLabel}>{t('password')}</Text>
          <View style={styles.pwInputRow}>
            <TextInput
              style={[styles.fieldInput, styles.pwInput]}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowPassword((prev) => !prev)} style={styles.eyeBtn}>
              <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={18} color="#8E8E93" />
            </TouchableOpacity>
          </View>
          <View style={styles.pwChecklist}>
            <PwRule ok={pwChecks.minChars} label={t('pwMinChars')} />
            <PwRule ok={pwChecks.lowercase} label={t('pwLowercase')} />
            <PwRule ok={pwChecks.uppercase} label={t('pwUppercase')} />
            <PwRule ok={pwChecks.number} label={t('pwNumber')} />
            <PwRule ok={pwChecks.special} label={t('pwSpecial')} />
          </View>
        </View>

        <TouchableOpacity style={styles.registerButton} onPress={handleRegister}>
          <Text style={styles.registerButtonText}>{t('registerBtn')}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.navigate('/login')}>
          <Text style={styles.signInText}>
            {t('haveAccount')} <Text style={styles.signInLink}>{t('signIn')}</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, error, ...props }: any) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, error && styles.fieldInputError]}
        placeholderTextColor="#C7C7C7"
        {...props}
      />
      {!!error && (
        <View style={styles.warnRow}>
          <Ionicons name="warning" size={11} color="#CE1126" />
          <Text style={styles.warnText}>{error}</Text>
        </View>
      )}
    </View>
  );
}

function PwRule({ ok, label }: { ok: boolean; label: string }) {
  return (
    <View style={styles.pwRuleRow}>
      <Ionicons
        name={ok ? 'checkmark-circle' : 'ellipse-outline'}
        size={13}
        color={ok ? '#3E9E4F' : '#B0B0B0'}
      />
      <Text style={[styles.pwRuleText, ok && styles.pwRuleTextOk]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollContent: { padding: 16, alignItems: 'center', paddingBottom: 28 },
  title: { fontSize: 21, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 6, letterSpacing: 0.5 },
  logo: { width: 56, height: 56, marginBottom: 10 },
  toggleRow: {
    flexDirection: 'row', width: '100%', backgroundColor: '#EFEFEF',
    borderRadius: 22, padding: 3, marginBottom: 12,
  },
  toggleBtn: { flex: 1, paddingVertical: 8, borderRadius: 18, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: '#E8801A' },
  toggleText: { fontWeight: 'bold', color: '#8E8E93', fontSize: 13 },
  toggleTextActive: { color: '#FFFFFF' },
  fieldWrap: { width: '100%', marginBottom: 8 },
  fieldLabel: { fontSize: 11, color: '#8E8E93', marginBottom: 2, fontWeight: '600' },
  fieldInput: {
    borderBottomWidth: 1, borderBottomColor: '#D0D0D0', paddingVertical: 6, fontSize: 14, color: '#1A1A1A',
  },
  fieldInputError: { borderBottomColor: '#CE1126' },
  pwInputRow: { flexDirection: 'row', alignItems: 'center' },
  pwInput: { flex: 1 },
  eyeBtn: { padding: 6, marginLeft: 4 },
  warnRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  warnText: { fontSize: 10, color: '#CE1126', flexShrink: 1 },
  pwChecklist: { marginTop: 6, gap: 3 },
  pwRuleRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  pwRuleText: { fontSize: 10.5, color: '#8E8E93' },
  pwRuleTextOk: { color: '#3E9E4F' },
  registerButton: {
    width: '100%', backgroundColor: '#E8801A', paddingVertical: 13,
    borderRadius: 22, alignItems: 'center', marginTop: 8, marginBottom: 12,
  },
  registerButtonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 15, letterSpacing: 0.5 },
  signInText: { fontSize: 12, color: '#555' },
  signInLink: { color: '#E8801A', fontWeight: 'bold' },
});