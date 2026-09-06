import React from 'react';
import { View, StyleSheet, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '@/shared/i18n/language-context';
import { images } from '@/shared/assets/images';
import { useRouter } from 'expo-router';
import { Button, H1, H3, Label } from '@/shared/components/ui';
import { tokens } from '@/shared/theme/tokens';

// This screen keeps its own `ImageBackground` + `SafeAreaView` root rather
// than `<Screen>`: `<Screen>` paints an opaque canvas colour behind its
// content, which would hide the full-bleed welcome artwork entirely.
export default function LanguageSelectScreen() {
  const router = useRouter();
  const { setLanguage, t } = useLanguage();

  const selectLanguage = (lang: 'en' | 'tl') => {
    setLanguage(lang);
    router.navigate({ pathname: '/terms', params: { language: lang } });
  };

  return (
    <ImageBackground
      source={images.welcomeBackground}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay} />

      <SafeAreaView style={styles.container}>
        <View style={styles.logoArea}>
          <H1 style={styles.title}>JuanWise</H1>
          <Label style={styles.subtitle}>Gamified Philippine Knowledge</Label>
        </View>

        <View style={styles.buttonArea}>
          <H3 style={styles.prompt}>{t('chooseLanguage')}</H3>

          <Button
            label="TAGALOG"
            onPress={() => selectLanguage('tl')}
            variant="gold"
            style={styles.langButton}
          />

          <Button
            label="ENGLISH"
            onPress={() => selectLanguage('en')}
            variant="gold"
            style={styles.langButton}
          />
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, width: '100%', height: '100%' },
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: tokens.color.ink, opacity: 0.18 },
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: tokens.space.xl },
  logoArea: { alignItems: 'center', marginBottom: tokens.space.xxl * 2 },
  title: { color: tokens.color.ink, textAlign: 'center' },
  subtitle: { color: tokens.color.inkBody, marginTop: tokens.space.xs, textAlign: 'center' },
  buttonArea: { width: '100%', alignItems: 'center' },
  prompt: { color: tokens.color.inkBody, marginBottom: tokens.space.xl, textAlign: 'center' },
  langButton: { width: '82%', marginBottom: tokens.space.lg },
});
