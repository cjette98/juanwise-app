import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '@/shared/i18n/language-context';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { role = 'student' } = useLocalSearchParams<{ role?: string }>();
  const isTeacher = role === 'teacher';

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const themeColor = isTeacher ? '#1E8449' : '#0038A8';
  const emailLabel = isTeacher ? t('teacherGmailLabel') : t('studentGmailLabel');

  const handleSendOtp = () => {
    if (!email) {
      Alert.alert(t('missingInfo'), t('step1Desc', { email: emailLabel }));
      return;
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(otp);
    Alert.alert(t('otpSentDemo'), t('otpDemoMsg', { otp }));
    setStep(2);
  };

  const handleVerifyOtp = () => {
    if (enteredOtp !== generatedOtp) {
      Alert.alert(t('invalidCode'), t('invalidCodeMsg'));
      return;
    }
    setStep(3);
  };

  const handleResetPassword = () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert(t('missingInfo'), t('fillUsernamePass'));
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(t('passwordMismatch'), t('passwordMismatchMsg'));
      return;
    }
    setStep(4);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { backgroundColor: themeColor }]}>
        <Text style={styles.headerText}>
          {isTeacher ? t('forgotTeacherTitle') : t('forgotStudentTitle')}
        </Text>
      </View>

      <View style={styles.content}>
        {step === 1 && (
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
            />
            <TouchableOpacity style={[styles.button, { backgroundColor: themeColor }]} onPress={handleSendOtp}>
              <Text style={styles.buttonText}>{t('sendOtpBtn')}</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 2 && (
          <>
            <Text style={styles.stepTitle}>{t('step2Title')}</Text>
            <Text style={styles.stepDesc}>{t('step2Desc')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('enterOtp')}
              value={enteredOtp}
              onChangeText={setEnteredOtp}
              keyboardType="number-pad"
              maxLength={6}
            />
            <TouchableOpacity style={[styles.button, { backgroundColor: themeColor }]} onPress={handleVerifyOtp}>
              <Text style={styles.buttonText}>{t('verifyBtn')}</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 3 && (
          <>
            <Text style={styles.stepTitle}>{t('step3Title')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('newPassword')}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
            />
            <TextInput
              style={styles.input}
              placeholder={t('confirmPassword')}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
            <TouchableOpacity style={[styles.button, { backgroundColor: themeColor }]} onPress={handleResetPassword}>
              <Text style={styles.buttonText}>{t('resetBtn')}</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 4 && (
          <View style={styles.successBox}>
            <Text style={styles.successIcon}>✓</Text>
            <Text style={styles.stepTitle}>{t('step5Title')}</Text>
            <Text style={styles.stepDesc}>{t('resetSuccessMsg')}</Text>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: themeColor, marginTop: 20 }]}
              onPress={() => router.navigate('/login')}
            >
              <Text style={styles.buttonText}>{t('backToLogin')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {step < 4 && (
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
  stepTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 6 },
  stepDesc: { fontSize: 13, color: '#666', marginBottom: 20 },
  input: { borderWidth: 1, borderColor: '#D0D0D0', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginBottom: 16 },
  button: { paddingVertical: 15, borderRadius: 25, alignItems: 'center', marginTop: 6 },
  buttonText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
  successBox: { alignItems: 'center' },
  successIcon: { fontSize: 50, color: '#34C759', fontWeight: 'bold', marginBottom: 10, borderWidth: 3, borderColor: '#34C759', borderRadius: 50, width: 80, height: 80, textAlign: 'center', lineHeight: 76 },
  backLink: { marginTop: 24, alignItems: 'center' },
  backLinkText: { color: '#8E8E93', fontSize: 13 },
});