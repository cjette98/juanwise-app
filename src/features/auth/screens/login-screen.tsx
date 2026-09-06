import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '@/shared/i18n/language-context';
import { useUser } from '@/features/auth/context/user-context';
import { images } from '@/shared/assets/images';
import { ApiError, errorMessage } from '@/shared/api';
import { useRouter } from 'expo-router';
import { Screen, Button, Icon, H1, Label, Caption } from '@/shared/components/ui';
import { tokens } from '@/shared/theme/tokens';

export default function LoginScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { login, logout } = useUser();
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  const logo =
    role === 'student'
      ? images.studentLogo
      : images.teacherLogo;

  // Credentials are checked by Firebase Auth through POST /auth/login — the app
  // never holds a password, and the account works from any device.
  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert(t('missingInfo'), t('enterUsernamePass'));
      return;
    }

    setBusy(true);
    try {
      const profile = await login(username, password);

      // Admins are granted by custom claim and have no toggle of their own;
      // they land on the teacher dashboard, which is where content management is.
      if (profile.role !== role && profile.role !== 'admin') {
        await logout();
        Alert.alert(t('wrongAccountType'), t('wrongAccountTypeMsg'));
        return;
      }

      router.replace(profile.role === 'student' ? '/student-home' : '/teacher-dashboard');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        Alert.alert(t('invalidLogin'), t('invalidLoginMsg'));
        return;
      }
      if (err instanceof ApiError && err.status === 404) {
        Alert.alert(t('noAccountFound'), t('noAccountFoundMsg'));
        return;
      }
      Alert.alert(t('invalidLogin'), errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <View style={styles.content}>
        <H1 style={styles.title}>{t('loginTitle')}</H1>

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

        <View style={styles.fieldWrap}>
          <Icon name="user" size={20} color={tokens.color.inkMuted} />
          <TextInput
            style={styles.fieldInput}
            value={username}
            onChangeText={setUsername}
            placeholder={t('username')}
            placeholderTextColor={tokens.color.inkFaint}
          />
        </View>

        <View style={styles.fieldWrap}>
          <Icon name="lock" size={20} color={tokens.color.inkMuted} />
          <TextInput
            style={styles.fieldInput}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            placeholder={t('password')}
            placeholderTextColor={tokens.color.inkFaint}
          />
          <TouchableOpacity onPress={() => setShowPassword((prev) => !prev)} style={styles.eyeBtn}>
            <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color={tokens.color.inkMuted} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.forgotTarget}
          onPress={() => router.navigate({ pathname: '/forgot-password', params: { role } })}
        >
          <Caption style={styles.forgotText}>{t('forgotPassword')}</Caption>
        </TouchableOpacity>

        <Button label={t('loginBtn')} onPress={handleLogin} busy={busy} style={styles.loginButton} />

        <Button
          label={`${t('noAccount')} ${t('signUp')}`}
          onPress={() => router.navigate('/register')}
          variant="secondary"
          style={styles.signUpButton}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, padding: tokens.space.xl, alignItems: 'center', justifyContent: 'center', gap: tokens.space.md, width: '100%' },
  title: { letterSpacing: 1 },
  logo: { width: 80, height: 80, marginBottom: tokens.space.sm },

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
  // Uses the short role labels (`student`/`teacher` -> ESTUDYANTE / GURO), not
  // the `studentAcc`/`teacherAcc` pair. "ACCOUNT NG ESTUDYANTE" needs ~189px
  // against the 147px each half gets on a 390pt screen, so it wrapped to two
  // lines beside a single-line sibling. The short form fits at Label's normal
  // tracking, and the screen title already says this is the log-in choice.
  // textAlign guards a longer translation landing here later.
  toggleText: { color: tokens.color.inkMuted, textAlign: 'center' },
  toggleTextActive: { color: tokens.color.primary },

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
  fieldInput: {
    flex: 1,
    fontFamily: tokens.font.body,
    fontSize: tokens.type.body.fontSize,
    color: tokens.color.ink,
  },
  eyeBtn: { minWidth: tokens.hit.min, minHeight: tokens.hit.min, alignItems: 'center', justifyContent: 'center' },

  forgotTarget: { alignSelf: 'flex-end', minHeight: tokens.hit.min, justifyContent: 'center', paddingHorizontal: tokens.space.xs },
  forgotText: { color: tokens.color.inkMuted },

  loginButton: { width: '100%' },
  signUpButton: { width: '100%' },
});
