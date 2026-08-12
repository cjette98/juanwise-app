import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '@/shared/i18n/language-context';
import { authApi, errorMessage } from '@/shared/api';
import { useRouter, useLocalSearchParams } from 'expo-router';

/**
 * Password recovery is Firebase's, via `POST /auth/forgot-password`: the server
 * emails a one-time reset link and the new password is set on Firebase's own
 * page. That replaces the old demo flow, which generated an OTP on the device,
 * showed it in an alert, and never actually changed any stored password.
 *
 * The endpoint always reports success — telling an anonymous caller whether an
 * address is registered is exactly the enumeration leak `POST /auth/login`
 * avoids — so the confirmation below is deliberately non-committal.
 */
export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { role = 'student' } = useLocalSearchParams<{ role?: string }>();
  const isTeacher = role === 'teacher';

  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState('');

  const themeColor = isTeacher ? '#1E8449' : '#0038A8';
  const emailLabel = isTeacher ? t('teacherGmailLabel') : t('studentGmailLabel');

  const handleSendResetLink = async () => {
    if (!email.trim()) {
      Alert.alert(t('missingInfo'), t('step1Desc', { email: emailLabel }));
      return;
    }

    setBusy(true);
    try {
      await authApi.forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      Alert.alert(t('missingInfo'), errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { backgroundColor: themeColor }]}>
        <Text style={styles.headerText}>
          {isTeacher ? t('forgotTeacherTitle') : t('forgotStudentTitle')}
        </Text>
      </View>

      <View style={styles.content}>
        {!sent ? (
          <>
            <Text style={styles.stepTitle}>{t('step1Title')}</Text>
            <Text style={styles.stepDesc}>{t('step1Desc', { email: emailLabel })}</Text>
            <TextInput
              style={styles.input}
              placeholder={emailLabel}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!busy}
            />
            <TouchableOpacity
              style={[styles.button, { backgroundColor: themeColor }, busy && styles.buttonBusy]}
              onPress={handleSendResetLink}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.buttonText}>{t('sendOtpBtn')}</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.successBox}>
            <Text style={styles.successIcon}>✓</Text>
            <Text style={styles.stepTitle}>{t('step5Title')}</Text>
            <Text style={styles.stepDesc}>{t('resetSuccessMsg')}</Text>
            <Text style={styles.noteText}>{t('resetEmailNote')}</Text>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: themeColor, marginTop: 20 }]}
              onPress={() => router.replace('/login')}
            >
              <Text style={styles.buttonText}>{t('backToLogin')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {!sent && (
          <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
            <Text style={styles.backLinkText}>{t('backLink')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { paddingVertical: 16, alignItems: 'center' },
  headerText: { color: '#FFF', fontWeight: 'bold', fontSize: 14, letterSpacing: 0.5 },
  content: { flex: 1, padding: 24, justifyContent: 'center' },
  stepTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 6, textAlign: 'center' },
  stepDesc: { fontSize: 13, color: '#666', marginBottom: 20, textAlign: 'center', lineHeight: 19 },
  noteText: { fontSize: 12, color: '#8E8E93', textAlign: 'center', fontStyle: 'italic' },
  input: { borderWidth: 1, borderColor: '#D0D0D0', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginBottom: 16 },
  button: { paddingVertical: 15, borderRadius: 25, alignItems: 'center', marginTop: 6 },
  buttonBusy: { opacity: 0.7 },
  buttonText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
  successBox: { alignItems: 'center' },
  successIcon: { fontSize: 50, color: '#34C759', fontWeight: 'bold', marginBottom: 10, borderWidth: 3, borderColor: '#34C759', borderRadius: 50, width: 80, height: 80, textAlign: 'center', lineHeight: 76 },
  backLink: { marginTop: 24, alignItems: 'center' },
  backLinkText: { color: '#8E8E93', fontSize: 13 },
});
