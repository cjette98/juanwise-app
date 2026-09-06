import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '@/shared/i18n/language-context';
import { authApi, errorMessage } from '@/shared/api';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Screen, ScreenHeader, Button, Icon, H2, Body, Caption } from '@/shared/components/ui';
import { tokens } from '@/shared/theme/tokens';

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

  const themeColor = isTeacher ? tokens.color.success : tokens.color.primary;
  const themeShadow = isTeacher ? tokens.color.successDark : tokens.color.primaryDark;
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
    <Screen>
      <ScreenHeader
        title={isTeacher ? t('forgotTeacherTitle') : t('forgotStudentTitle')}
        color={themeColor}
      />

      <View style={styles.content}>
        {!sent ? (
          <>
            <H2 style={styles.stepTitle}>{t('step1Title')}</H2>
            <Body style={styles.stepDesc}>{t('step1Desc', { email: emailLabel })}</Body>

            <View style={styles.fieldWrap}>
              {/* Registry has no mail/envelope icon; Ionicons fills that one gap. */}
              <Ionicons name="mail-outline" size={20} color={tokens.color.inkMuted} />
              <TextInput
                style={styles.fieldInput}
                placeholder={emailLabel}
                placeholderTextColor={tokens.color.inkFaint}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!busy}
              />
            </View>

            <Button
              label={t('sendOtpBtn')}
              onPress={handleSendResetLink}
              busy={busy}
              color={themeColor}
              shadowColor={themeShadow}
              style={styles.button}
            />
          </>
        ) : (
          <View style={styles.successBox}>
            <View style={[styles.successIconWrap, { borderColor: themeColor }]}>
              <Icon name="check" size={36} color={themeColor} strokeWidth={3} />
            </View>
            <H2 style={styles.stepTitle}>{t('step5Title')}</H2>
            <Body style={styles.stepDesc}>{t('resetSuccessMsg')}</Body>
            <Caption style={styles.noteText}>{t('resetEmailNote')}</Caption>

            <Button
              label={t('backToLogin')}
              onPress={() => router.replace('/login')}
              color={themeColor}
              shadowColor={themeShadow}
              style={styles.backToLoginButton}
            />
          </View>
        )}

        {!sent && (
          <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
            <Caption style={styles.backLinkText}>{t('backLink')}</Caption>
          </TouchableOpacity>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, padding: tokens.space.xl, justifyContent: 'center' },
  stepTitle: { marginBottom: tokens.space.xs, textAlign: 'center' },
  stepDesc: { marginBottom: tokens.space.lg, textAlign: 'center' },
  noteText: { textAlign: 'center', fontStyle: 'italic' },

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
    marginBottom: tokens.space.lg,
  },
  fieldInput: {
    flex: 1,
    fontFamily: tokens.font.body,
    fontSize: tokens.type.body.fontSize,
    color: tokens.color.ink,
  },

  button: { width: '100%' },

  successBox: { alignItems: 'center' },
  successIconWrap: {
    width: 80,
    height: 80,
    borderRadius: tokens.radius.pill,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: tokens.space.md,
  },
  backToLoginButton: { width: '100%', marginTop: tokens.space.md },

  backLink: { marginTop: tokens.space.xl, minHeight: tokens.hit.min, alignItems: 'center', justifyContent: 'center' },
  backLinkText: { color: tokens.color.inkMuted },
});
