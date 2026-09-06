import React, { useMemo, useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, ScrollView, Image, Alert, type TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '@/shared/i18n/language-context';
import { useUser } from '@/features/auth/context/user-context';
import { images } from '@/shared/assets/images';
import { errorMessage } from '@/shared/api';
import { useRouter } from 'expo-router';
import { Screen, Button, Icon, type IconName, H1, Label, Caption } from '@/shared/components/ui';
import { tokens } from '@/shared/theme/tokens';

const LRN_REGEX = /^\d{12}$/;
const TEACHER_ID_REGEX = /^\d{7}$/;
const GRADE_REGEX = /^\d+$/;
const GMAIL_REGEX = /^[^\s@]+@gmail\.com$/i;
const USERNAME_REGEX = /^\S+$/;

/**
 * Mirrors TEACHER_EMAIL_DOMAINS in juanwise-be `shared/constants.ts` — kept here
 * only for instant feedback; the API re-checks it. Not every teacher has a
 * department mailbox yet, and an admin is a teacher account granted the claim
 * out of band, so admins inherit the same list.
 */
const TEACHER_EMAIL_DOMAINS = ['@deped.gov.ph', '@gmail.com', '@yopmail.com'];
const TEACHER_EMAIL_REGEX = /^\S+@(deped\.gov\.ph|gmail\.com|yopmail\.com)$/i;

function isFullName(name: string) {
  return name.trim().split(/\s+/).length >= 2;
}

export default function RegisterScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { register } = useUser();
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [busy, setBusy] = useState(false);

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
  const depedGmailError = errorFor('depedGmail', depedGmail, TEACHER_EMAIL_REGEX.test(depedGmail), t('invalidDepedGmailMsg'));
  const usernameError = errorFor('username', username, USERNAME_REGEX.test(username), t('invalidUsernameMsg'));

  const handleRegister = async () => {
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
      await submit({
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
      return;
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
      if (!TEACHER_EMAIL_REGEX.test(depedGmail)) {
        Alert.alert(t('missingInfo'), t('invalidDepedGmailMsg'));
        return;
      }
      await submit({
        role: 'teacher',
        name: teacherName,
        teacherId,
        grade: handleGrade,
        section: teacherSection,
        // The API keeps one email column, whatever the role.
        email: depedGmail,
        username,
        password,
        avatar: '🧑‍🏫',
      });
    }
  };

  // POST /auth/register creates the Firebase account and signs it in, so the
  // new user goes straight to their dashboard rather than back to Login.
  const submit = async (input: Parameters<typeof register>[0]) => {
    setBusy(true);
    try {
      const profile = await register(input);
      Alert.alert(t('registerSuccess'), t('registerSuccessMsg'), [
        {
          text: 'OK',
          onPress: () =>
            router.replace(profile.role === 'student' ? '/student-home' : '/teacher-dashboard'),
        },
      ]);
    } catch (err) {
      Alert.alert(t('missingInfo'), errorMessage(err, 'Hindi nakumpleto ang pagpaparehistro.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <H1 style={styles.title}>{t('registerTitle')}</H1>

        <Image source={logo} style={styles.logo} resizeMode="contain" />

        <View style={styles.toggleTrack}>
          <TouchableOpacity
            style={[styles.toggleHalf, role === 'student' && styles.toggleHalfActive]}
            onPress={() => setRole('student')}
          >
            <Label style={[styles.toggleText, role === 'student' && styles.toggleTextActive]}>
              {t('student')}
            </Label>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleHalf, role === 'teacher' && styles.toggleHalfActive]}
            onPress={() => setRole('teacher')}
          >
            <Label style={[styles.toggleText, role === 'teacher' && styles.toggleTextActive]}>
              {t('teacher')}
            </Label>
          </TouchableOpacity>
        </View>

        {role === 'student' ? (
          <>
            <Field
              label={t('lrn')}
              icon="book"
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
              icon="user"
              placeholder="Juan Dela Cruz"
              value={fullName}
              onChangeText={setFullName}
              onBlur={() => markTouched('fullName')}
              error={fullNameError}
            />
            <Field label={t('age')} icon="chart" value={age} onChangeText={setAge} keyboardType="number-pad" />
            <Field
              label={t('grade')}
              icon="book"
              placeholder="6"
              value={grade}
              onChangeText={setGrade}
              onBlur={() => markTouched('grade')}
              keyboardType="number-pad"
              error={gradeError}
            />
            <Field label={t('section')} icon="book" value={section} onChangeText={setSection} />
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
              icon="user"
              placeholder="Maria Cruz"
              value={teacherName}
              onChangeText={setTeacherName}
              onBlur={() => markTouched('teacherName')}
              error={teacherNameError}
            />
            <Field
              label={t('teacherId')}
              icon="book"
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
              icon="book"
              placeholder="5"
              value={handleGrade}
              onChangeText={setHandleGrade}
              onBlur={() => markTouched('handleGrade')}
              keyboardType="number-pad"
              error={handleGradeError}
            />
            <Field label={t('section')} icon="book" value={teacherSection} onChangeText={setTeacherSection} />
            <Field
              label={t('depedGmail')}
              placeholder="maria.cruz@deped.gov.ph"
              value={depedGmail}
              onChangeText={setDepedGmail}
              onBlur={() => markTouched('depedGmail')}
              keyboardType="email-address"
              autoCapitalize="none"
              error={depedGmailError}
              hint={TEACHER_EMAIL_DOMAINS.join(' · ')}
            />
          </>
        )}

        <Field
          label={t('username')}
          icon="user"
          placeholder={t('usernameHint')}
          value={username}
          onChangeText={setUsername}
          onBlur={() => markTouched('username')}
          autoCapitalize="none"
          error={usernameError}
        />

        <View style={styles.fieldGroup}>
          <Label style={styles.fieldLabel}>{t('password')}</Label>
          <View style={styles.fieldWrap}>
            <Icon name="lock" size={20} color={tokens.color.inkMuted} />
            <TextInput
              style={styles.fieldInput}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              placeholderTextColor={tokens.color.inkFaint}
            />
            <TouchableOpacity onPress={() => setShowPassword((prev) => !prev)} style={styles.eyeBtn}>
              <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color={tokens.color.inkMuted} />
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

        <Button label={t('registerBtn')} onPress={handleRegister} busy={busy} style={styles.registerButton} />

        <Button
          label={`${t('haveAccount')} ${t('signIn')}`}
          onPress={() => router.navigate('/login')}
          variant="secondary"
          style={styles.signInButton}
        />
      </ScrollView>
    </Screen>
  );
}

function Field({
  label,
  icon,
  error,
  hint,
  ...props
}: {
  label: string;
  icon?: IconName;
  error?: string;
  hint?: string;
} & TextInputProps) {
  return (
    <View style={styles.fieldGroup}>
      <Label style={styles.fieldLabel}>{label}</Label>
      <View style={[styles.fieldWrap, error && styles.fieldWrapError]}>
        {icon && <Icon name={icon} size={20} color={tokens.color.inkMuted} />}
        <TextInput
          style={styles.fieldInput}
          placeholderTextColor={tokens.color.inkFaint}
          {...props}
        />
      </View>
      {!!error && <Caption style={styles.errorText}>{error}</Caption>}
      {!error && !!hint && <Caption style={styles.hintText}>{hint}</Caption>}
    </View>
  );
}

// Colour alone must not carry the pass/fail signal for a child with a colour
// vision deficiency, so a satisfied rule swaps to a different mark shape
// (a check) rather than just a different tint of the same dot.
function PwRule({ ok, label }: { ok: boolean; label: string }) {
  return (
    <View style={styles.pwRuleRow}>
      {ok ? (
        <Icon name="check" size={15} color={tokens.color.success} strokeWidth={2.6} />
      ) : (
        <View style={styles.pwRuleUnmet} />
      )}
      <Caption style={[styles.pwRuleText, ok && styles.pwRuleTextOk]}>{label}</Caption>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: tokens.space.xl,
    alignItems: 'center',
    gap: tokens.space.md,
    paddingBottom: tokens.space.xxl,
  },
  title: { letterSpacing: 1 },
  logo: { width: 64, height: 64, marginBottom: tokens.space.xs },

  toggleTrack: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: tokens.color.surfaceSunken,
    borderRadius: tokens.radius.pill,
    padding: tokens.space.xs,
  },
  toggleHalf: {
    flex: 1,
    minHeight: tokens.hit.min,
    borderRadius: tokens.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: tokens.space.sm,
  },
  toggleHalfActive: {
    backgroundColor: tokens.color.surface,
    ...tokens.elevation.card,
  },
  // See login-screen.tsx: tighter tracking (rather than numberOfLines +
  // adjustsFontSizeToFit) is what fits "ACCOUNT NG ESTUDYANTE" without
  // truncating, and textAlign keeps it centred if it still wraps.
  toggleText: { color: tokens.color.inkMuted, letterSpacing: 0.3, textAlign: 'center' },
  toggleTextActive: { color: tokens.color.primary },

  fieldGroup: { width: '100%' },
  fieldLabel: { marginBottom: tokens.space.xs, color: tokens.color.inkMuted },
  fieldWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    minHeight: 58,
    gap: tokens.space.sm,
    borderWidth: 2,
    borderColor: tokens.color.border,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.space.md,
    backgroundColor: tokens.color.surface,
  },
  fieldWrapError: { borderColor: tokens.color.danger },
  fieldInput: {
    flex: 1,
    fontFamily: tokens.font.body,
    fontSize: tokens.type.body.fontSize,
    color: tokens.color.ink,
  },
  eyeBtn: { minWidth: tokens.hit.min, minHeight: tokens.hit.min, alignItems: 'center', justifyContent: 'center' },

  errorText: { color: tokens.color.danger, marginTop: tokens.space.xs },
  hintText: { color: tokens.color.inkFaint, marginTop: tokens.space.xs },

  pwChecklist: { marginTop: tokens.space.sm, gap: tokens.space.xs },
  pwRuleRow: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.xs },
  pwRuleUnmet: {
    width: 15,
    height: 15,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: tokens.color.inkDisabled,
    backgroundColor: 'transparent',
  },
  pwRuleText: { color: tokens.color.inkMuted },
  pwRuleTextOk: { color: tokens.color.success },

  registerButton: { width: '100%' },
  signInButton: { width: '100%' },
});
