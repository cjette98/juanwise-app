import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ImageBackground, Animated, Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { images } from '@/shared/assets/images';
import { useRouter } from 'expo-router';

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
            <Text style={styles.title}>JuanWise</Text>
            <Text style={styles.subtitle}>Gamified Philippine Knowledge</Text>
            <Text style={styles.intro}>Maligayang pagdating! Tara, kilalanin natin ang JuanWise</Text>
          </Animated.View>

          <Animated.View style={[styles.iconClusterWrap, fadeUp(cardsAnim)]}>
            <Animated.Image
              source={images.welcomeIcon}
              style={[styles.badgeImage, floatStyle]}
              resizeMode="contain"
            />
            <Text style={styles.iconClusterCaption}>Estudyante · Guro · Paaralan · Araling Panlipunan</Text>
          </Animated.View>

          <Animated.View style={[styles.blurbArea, fadeUp(blurbAnim)]}>
            <View style={[styles.blurbCard, { borderLeftColor: '#D63B6E' }]}>
              <Text style={[styles.blurbTag, { color: '#D63B6E' }]}>PARA SA ESTUDYANTE</Text>
              <Text style={styles.blurbText}>
                 Ikaw ang player dito! Mag-enjoy sa mga quiz at jigsaw puzzle habang natututo ka tungkol sa kasaysayan, kultura, at heograpiya at ibang angkop sa ating pinakamahal na bayan nating Pilipinas.
              </Text>
            </View>
            <View style={[styles.blurbCard, { borderLeftColor: '#2E9E5B' }]}>
              <Text style={[styles.blurbTag, { color: '#2E9E5B' }]}>PARA SA GURO / ADMIN</Text>
              <Text style={styles.blurbText}>
                Bilang guro o admin, ikaw ang gagabay sa mga estudyante gamit ang JuanWise — isang supplementary tool para mas masaya at epektibo ang pagtuturo.
              </Text>
            </View>
          </Animated.View>

          <Animated.View style={[styles.linksRow, fadeUp(linksAnim)]}>
            <TouchableOpacity onPress={() => setInfoModal('privacy')}>
              <Text style={styles.linkText}>Privacy Preferences</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setInfoModal('about')}>
              <Text style={styles.linkText}>About the Game</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.navigate('/terms')}>
              <Text style={styles.linkText}>Terms and Conditions</Text>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={fadeUp(buttonAnim)}>
            <TouchableOpacity style={styles.acceptButton} onPress={handleAccept} activeOpacity={0.85}>
              <Text style={styles.acceptButtonText}>Sige, tara na!</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>

      <Modal visible={infoModal !== null} transparent animationType="fade" onRequestClose={() => setInfoModal(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {infoModal && (
              <>
                <Text style={styles.modalTitle}>{INFO_CONTENT[infoModal].title}</Text>
                <ScrollView style={styles.modalScroll}>
                  <Text style={styles.modalBody}>{INFO_CONTENT[infoModal].body}</Text>
                </ScrollView>
              </>
            )}
            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setInfoModal(null)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, width: '100%', height: '100%' },
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(120,60,20,0.28)' },
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16, flexGrow: 1, justifyContent: 'center' },

  logoArea: { alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 30, fontWeight: 'bold', color: '#8B2E1F', textShadowColor: '#FFE8B8', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },
  subtitle: { fontSize: 11.5, color: '#5C3A21', marginTop: 2, fontWeight: '700' },
  intro: { fontSize: 12, color: '#1A1A1A', marginTop: 6, fontWeight: '700', textAlign: 'center' },

  iconClusterWrap: { alignItems: 'center', marginBottom: 8 },
  badgeImage: { width: 108, height: 108 },
  iconClusterCaption: { fontSize: 10, fontWeight: '700', color: '#1A1A1A', marginTop: 2, textAlign: 'center' },

  blurbArea: { marginBottom: 8 },
  blurbCard: { backgroundColor: 'rgba(255,249,236,0.94)', borderRadius: 12, padding: 9, borderLeftWidth: 3, marginBottom: 7 },
  blurbTag: { fontSize: 10, fontWeight: 'bold', letterSpacing: 0.5 },
  blurbText: { fontSize: 11.5, color: '#5C3A21', marginTop: 3, lineHeight: 15.5 },

  linksRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginBottom: 10 },
  linkText: { fontSize: 10.5, color: '#8B2E1F', fontWeight: '700', textDecorationLine: 'underline' },

  acceptButton: {
    width: '100%', paddingVertical: 13, borderRadius: 30, alignItems: 'center',
    backgroundColor: '#F5E1B8', borderWidth: 2, borderColor: '#D9A441',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5,
  },
  acceptButtonText: { color: '#8B2E1F', fontSize: 15.5, fontWeight: 'bold', letterSpacing: 0.5 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { backgroundColor: '#FFF', borderRadius: 18, padding: 20, width: '100%', maxHeight: '70%', borderWidth: 2, borderColor: '#D9A441' },
  modalTitle: { fontSize: 17, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 10 },
  modalScroll: { marginBottom: 14 },
  modalBody: { fontSize: 13, color: '#5C3A21', lineHeight: 20 },
  modalCloseButton: { alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 28, borderRadius: 20, backgroundColor: '#8B2E1F' },
  modalCloseText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
});