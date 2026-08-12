import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '@/shared/i18n/language-context';
import { images } from '@/shared/assets/images';
import { useRouter } from 'expo-router';

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
          <Text style={styles.title}>JuanWise</Text>
          <Text style={styles.subtitle}>Gamified Philippine Knowledge</Text>
        </View>

        <View style={styles.buttonArea}>
          <Text style={styles.prompt}>{t('chooseLanguage')}</Text>

          <TouchableOpacity
            style={styles.langButton}
            onPress={() => selectLanguage('tl')}
            activeOpacity={0.8}
          >
            <Text style={styles.langButtonText}>TAGALOG</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.langButton}
            onPress={() => selectLanguage('en')}
            activeOpacity={0.8}
          >
            <Text style={styles.langButtonText}>ENGLISH</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, width: '100%', height: '100%' },
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(120,60,20,0.18)' },
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  logoArea: { alignItems: 'center', marginBottom: 70 },
  title: { fontSize: 46, fontWeight: 'bold', color: '#8B2E1F', textShadowColor: '#FFE8B8', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },
  subtitle: { fontSize: 14, color: '#5C3A21', marginTop: 6, fontWeight: '700' },
  buttonArea: { width: '100%', alignItems: 'center' },
  prompt: { fontSize: 16, color: '#5C3A21', marginBottom: 22, fontWeight: 'bold', letterSpacing: 1 },
  langButton: { width: '82%', paddingVertical: 18, borderRadius: 30, alignItems: 'center', marginBottom: 18, backgroundColor: '#F5E1B8', borderWidth: 2, borderColor: '#D9A441', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
  langButtonText: { color: '#8B2E1F', fontSize: 19, fontWeight: 'bold', letterSpacing: 1 },
});