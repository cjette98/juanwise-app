import React, { useEffect, useRef, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, ImageBackground, Animated, Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { images } from '@/shared/assets/images';
import { useRouter } from 'expo-router';
import { Card, Button, H1, H2, Body, BodyStrong, Caption, Label } from '@/shared/components/ui';
import { tokens } from '@/shared/theme/tokens';

type InfoKey = 'privacy' | 'about' | null;

const INFO_CONTENT: Record<Exclude<InfoKey, null>, { title: string; body: string }> = {
  privacy: {
    title: 'Privacy Preferences',
    body:
      "Kinokolekta lang ng JuanWise ang kailangan para gumana ang app at masubaybayan ang progreso ng pag-aaral — pangalan, grade level, at resulta ng mga activity.\n\n" +
      'Ang progress dashboard at performance data ay makikita lamang ng estudyante mismo, ng kanyang magulang/guardian, at ng mga awtorisadong guro. Hindi ito ibinebenta o ibinabahagi sa ibang tao.\n\n' +
      'Para sa buong detalye, tingnan ang Terms and Conditions.',
  },
  about: {
    title: 'About the Game',
    body:
      'Ang JuanWise ay isang gamified supplementary learning tool na nagtuturo ng kasaysayan, kultura, at heograpiya ng Pilipinas sa pamamagitan ng quiz at jigsaw puzzle.\n\n' +
      'Dadaan ang mga estudyante sa 5 level bawat kategorya, kumikita ng points, stars, at trophy sa bawat hakbang. Makikita naman ng mga guro ang live leaderboard at progress dashboard para masubaybayan ang klase.',
  },
};

// This screen keeps its own `ImageBackground` + `SafeAreaView` root rather
// than `<Screen>`: `<Screen>` paints an opaque canvas colour behind its
// content, which would hide the full-bleed welcome artwork entirely.
export default function WelcomeScreen() {
  const router = useRouter();
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
            <Label style={styles.subtitle}>Gamified Philippine Knowledge</Label>
            <BodyStrong style={styles.intro}>Maligayang pagdating! Tara, kilalanin natin ang JuanWise</BodyStrong>
          </Animated.View>

          <Animated.View style={[styles.iconClusterWrap, fadeUp(cardsAnim)]}>
            <Card style={styles.iconCard}>
              <Animated.Image
                source={images.welcomeIcon}
                style={[styles.badgeImage, floatStyle]}
                resizeMode="contain"
              />
              <Caption style={styles.iconClusterCaption}>Estudyante · Guro · Paaralan · Araling Panlipunan</Caption>
            </Card>
          </Animated.View>

          <Animated.View style={[styles.blurbArea, fadeUp(blurbAnim)]}>
            <Card style={[styles.featureCard, { borderLeftColor: tokens.color.navLeaderboard }]}>
              <Label style={[styles.blurbTag, { color: tokens.color.navLeaderboard }]}>PARA SA ESTUDYANTE</Label>
              <Body style={styles.blurbText}>
                 Ikaw ang player dito! Mag-enjoy sa mga quiz at jigsaw puzzle habang natututo ka tungkol sa kasaysayan, kultura, at heograpiya at ibang angkop sa ating pinakamahal na bayan nating Pilipinas.
              </Body>
            </Card>
            <Card style={[styles.featureCard, { borderLeftColor: tokens.color.success }]}>
              <Label style={[styles.blurbTag, { color: tokens.color.success }]}>PARA SA GURO / ADMIN</Label>
              <Body style={styles.blurbText}>
                Bilang guro o admin, ikaw ang gagabay sa mga estudyante gamit ang JuanWise — isang supplementary tool para mas masaya at epektibo ang pagtuturo.
              </Body>
            </Card>
          </Animated.View>

          <Animated.View style={[styles.linksRow, fadeUp(linksAnim)]}>
            <TouchableOpacity style={styles.linkTarget} onPress={() => setInfoModal('privacy')}>
              <Caption style={styles.linkText}>Privacy Preferences</Caption>
            </TouchableOpacity>
            <TouchableOpacity style={styles.linkTarget} onPress={() => setInfoModal('about')}>
              <Caption style={styles.linkText}>About the Game</Caption>
            </TouchableOpacity>
            <TouchableOpacity style={styles.linkTarget} onPress={() => router.navigate('/terms')}>
              <Caption style={styles.linkText}>Terms and Conditions</Caption>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={fadeUp(buttonAnim)}>
            <Button label="Sige, tara na!" onPress={handleAccept} variant="gold" />
          </Animated.View>
        </ScrollView>
      </SafeAreaView>

      <Modal visible={infoModal !== null} transparent animationType="fade" onRequestClose={() => setInfoModal(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBackdrop} />
          <Card style={styles.modalCard}>
            {infoModal && (
              <>
                <H2 style={styles.modalTitle}>{INFO_CONTENT[infoModal].title}</H2>
                <ScrollView style={styles.modalScroll}>
                  <Body style={styles.modalBody}>{INFO_CONTENT[infoModal].body}</Body>
                </ScrollView>
              </>
            )}
            <Button label="Close" onPress={() => setInfoModal(null)} variant="secondary" />
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
