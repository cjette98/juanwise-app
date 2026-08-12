import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '@/shared/i18n/language-context';
import { useUser } from '@/features/auth/context/user-context';
import { images } from '@/shared/assets/images';
import { ApiError, errorMessage } from '@/shared/api';
import { useRouter } from 'expo-router';

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
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{t('loginTitle')}</Text>

        <Image source={logo} style={styles.logo} resizeMode="contain" />

        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleBtn, role === 'student' && styles.toggleBtnActive]}
            onPress={() => setRole('student')}
          >
            <Text style={[styles.toggleText, role === 'student' && styles.toggleTextActive]}>
              {t('studentAcc')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, role === 'teacher' && styles.toggleBtnActive]}
            onPress={() => setRole('teacher')}
          >
            <Text style={[styles.toggleText, role === 'teacher' && styles.toggleTextActive]}>
              {t('teacherAcc')}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.fieldWrap}>
          <Text style={styles.fieldLabel}>{t('username')}</Text>
          <TextInput style={styles.fieldInput} value={username} onChangeText={setUsername} />
        </View>

        <View style={styles.fieldWrap}>
          <Text style={styles.fieldLabel}>{t('password')}</Text>
          <View style={styles.pwInputRow}>
            <TextInput
              style={[styles.fieldInput, styles.pwInput]}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword((prev) => !prev)} style={styles.eyeBtn}>
              <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={18} color="#8E8E93" />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity onPress={() => router.navigate({ pathname: '/forgot-password', params: { role } })}>
          <Text style={styles.forgotText}>{t('forgotPassword')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.loginButton, busy && styles.loginButtonBusy]}
          onPress={handleLogin}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.loginButtonText}>{t('loginBtn')}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.navigate('/register')}>
          <Text style={styles.signUpText}>
            {t('noAccount')} <Text style={styles.signUpLink}>{t('signUp')}</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 26, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 12, letterSpacing: 1 },
  logo: { width: 80, height: 80, marginBottom: 18 },
  toggleRow: {
    flexDirection: 'row', width: '100%', backgroundColor: '#EFEFEF',
    borderRadius: 25, padding: 4, marginBottom: 24,
  },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 20, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: '#E8801A' },
  toggleText: { fontWeight: 'bold', color: '#8E8E93', fontSize: 12 },
  toggleTextActive: { color: '#FFFFFF' },
  fieldWrap: { width: '100%', marginBottom: 16 },
  fieldLabel: { fontSize: 12, color: '#8E8E93', marginBottom: 4, fontWeight: '600' },
  fieldInput: {
    borderBottomWidth: 1, borderBottomColor: '#D0D0D0', paddingVertical: 8, fontSize: 15, color: '#1A1A1A',
  },
  pwInputRow: { flexDirection: 'row', alignItems: 'center' },
  pwInput: { flex: 1 },
  eyeBtn: { padding: 6, marginLeft: 4 },
  forgotText: { alignSelf: 'flex-end', color: '#555', fontSize: 12, marginBottom: 20 },
  loginButton: {
    width: '100%', backgroundColor: '#E8801A', paddingVertical: 16,
    borderRadius: 25, alignItems: 'center', marginBottom: 14,
  },
  loginButtonBusy: { opacity: 0.7 },
  loginButtonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16, letterSpacing: 1 },
  signUpText: { fontSize: 13, color: '#555' },
  signUpLink: { color: '#E8801A', fontWeight: 'bold' },
});