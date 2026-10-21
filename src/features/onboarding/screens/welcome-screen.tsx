import React, { useEffect, useRef, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, ImageBackground, Animated, Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { images } from '@/shared/assets/images';
import { useRouter } from 'expo-router';
import { Card, Button, H1, H2, Body, BodyStrong, Caption, Label } from '@/shared/components/ui';
import { tokens } from '@/shared/theme/tokens';
import { useLanguage, type TranslationKey } from '@/shared/i18n/language-context';

type InfoKey = 'privacy' | 'about' | null;

const INFO_CONTENT: Record<Exclude<InfoKey, null>, { titleKey: TranslationKey; bodyKey: TranslationKey }> = {
  privacy: { titleKey: 'privacyPreferencesLabel', bodyKey: 'welcomePrivacyBody' },
  about: { titleKey: 'aboutGameLabel', bodyKey: 'welcomeAboutBody' },
};

// This screen keeps its own `ImageBackground` + `SafeAreaView` root rather
// than `<Screen>`: `<Screen>` paints an opaque canvas colour behind its
// content, which would hide the full-bleed welcome artwork entirely.
export default function WelcomeScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const [infoModal, setInfoModal] = useState<InfoKey>(null);

  const logoAnim = useRef(new Animated.Value(0)).current;
  const cardsAnim = useRef(new Animated.Value(0)).current;
  const blurbAnim = useRef(new Animated.Value(0)).current;
  const linksAnim = useRef(new Animated.Value(0)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const seq = Animated.stagger(120, [
      Animated.timing(logoAnim, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.timing(cardsAnim, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.timing(blurbAnim, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.timing(linksAnim, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.timing(buttonAnim, { toValue: 1, duration: 450, useNativeDriver: true }),
    ]);
    seq.start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: 1, duration: 1300, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 1300, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const fadeUp = (anim: Animated.Value) => ({
    opacity: anim,
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
  });

  const floatStyle = {
    transform: [
      { translateY: floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) },
      { rotate: floatAnim.interpolate({ inputRange: [0, 1], outputRange: ['-3deg', '3deg'] }) },
    ],
  };

  const handleAccept = () => {
    router.replace('/language-select');
  };

  return (
    <ImageBackground
      source={images.welcomeBackground}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay} />

      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Animated.View style={[styles.logoArea, fadeUp(logoAnim)]}>
            <H1 style={styles.title}>JuanWise</H1>
            <Label style={styles.subtitle}>{t('appTagline')}</Label>
            <BodyStrong style={styles.intro}>{t('welcomeIntro')}</BodyStrong>
          </Animated.View>

          <Animated.View style={[styles.iconClusterWrap, fadeUp(cardsAnim)]}>
            <Card style={styles.iconCard}>
              <Animated.Image
                source={images.welcomeIcon}
                style={[styles.badgeImage, floatStyle]}
                resizeMode="contain"
              />
              <Caption style={styles.iconClusterCaption}>{t('welcomeAudience')}</Caption>
            </Card>
          </Animated.View>

          <Animated.View style={[styles.blurbArea, fadeUp(blurbAnim)]}>
            <Card style={[styles.featureCard, { borderLeftColor: tokens.color.navLeaderboard }]}>
              <Label style={[styles.blurbTag, { color: tokens.color.navLeaderboard }]}>{t('welcomeForStudents')}</Label>
              <Body style={styles.blurbText}>{t('welcomeStudentBlurb')}</Body>
            </Card>
            <Card style={[styles.featureCard, { borderLeftColor: tokens.color.success }]}>
              <Label style={[styles.blurbTag, { color: tokens.color.success }]}>{t('welcomeForTeachers')}</Label>
              <Body style={styles.blurbText}>{t('welcomeTeacherBlurb')}</Body>
            </Card>
          </Animated.View>

          <Animated.View style={[styles.linksRow, fadeUp(linksAnim)]}>
            <TouchableOpacity style={styles.linkTarget} onPress={() => setInfoModal('privacy')}>
              <Caption style={styles.linkText}>{t('privacyPreferencesLabel')}</Caption>
            </TouchableOpacity>
            <TouchableOpacity style={styles.linkTarget} onPress={() => setInfoModal('about')}>
              <Caption style={styles.linkText}>{t('aboutGameLabel')}</Caption>
            </TouchableOpacity>
            <TouchableOpacity style={styles.linkTarget} onPress={() => router.navigate('/terms')}>
              <Caption style={styles.linkText}>{t('termsConditionsLabel')}</Caption>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={fadeUp(buttonAnim)}>
            <Button label={t('welcomeCta')} onPress={handleAccept} variant="gold" />
          </Animated.View>
        </ScrollView>
      </SafeAreaView>

      <Modal visible={infoModal !== null} transparent animationType="fade" onRequestClose={() => setInfoModal(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBackdrop} />
          <Card style={styles.modalCard}>
            {infoModal && (
              <>
                <H2 style={styles.modalTitle}>{t(INFO_CONTENT[infoModal].titleKey)}</H2>
                <ScrollView style={styles.modalScroll}>
                  <Body style={styles.modalBody}>{t(INFO_CONTENT[infoModal].bodyKey)}</Body>
                </ScrollView>
              </>
            )}
            <Button label={t('closeBtn')} onPress={() => setInfoModal(null)} variant="secondary" />
          </Card>
        </View>
      </Modal>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, width: '100%', height: '100%' },
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: tokens.color.ink, opacity: 0.28 },
  container: { flex: 1 },
  scrollContent: {
    paddingHorizontal: tokens.space.xl,
    paddingTop: tokens.space.md,
    paddingBottom: tokens.space.lg,
    flexGrow: 1,
    justifyContent: 'center',
    gap: tokens.space.sm,
  },

  logoArea: { alignItems: 'center', marginBottom: tokens.space.xs },
  title: { color: tokens.color.ink, textAlign: 'center' },
  subtitle: { color: tokens.color.inkBody, marginTop: 2, textAlign: 'center' },
  intro: { color: tokens.color.ink, marginTop: tokens.space.xs, textAlign: 'center' },

  iconClusterWrap: { alignItems: 'center', marginBottom: tokens.space.xs },
  iconCard: { alignItems: 'center', gap: tokens.space.xs, paddingVertical: tokens.space.md },
  badgeImage: { width: 108, height: 108 },
  iconClusterCaption: { textAlign: 'center' },

  blurbArea: { marginBottom: tokens.space.xs, gap: tokens.space.sm },
  featureCard: { borderLeftWidth: 4, padding: tokens.space.md, gap: tokens.space.xs },
  blurbTag: { letterSpacing: 0.5 },
  blurbText: { color: tokens.color.inkBody },

  linksRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginBottom: tokens.space.xs },
  linkTarget: { minHeight: tokens.hit.min, paddingHorizontal: tokens.space.sm, alignItems: 'center', justifyContent: 'center' },
  linkText: { color: tokens.color.ink, fontFamily: tokens.font.bodyBold, textDecorationLine: 'underline' },

  modalOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: tokens.space.xl },
  modalBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: tokens.color.ink, opacity: 0.55 },
  modalCard: { width: '100%', maxHeight: '70%', gap: tokens.space.md },
  modalTitle: {},
  modalScroll: {},
  modalBody: { color: tokens.color.inkBody },
});
