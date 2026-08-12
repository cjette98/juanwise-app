import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ImageBackground,
  Animated,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '@/shared/i18n/language-context';
import { images } from '@/shared/assets/images';
import { termsContent } from '@/shared/content/terms-content';
import { useRouter } from 'expo-router';

export default function TermsScreen() {
  const router = useRouter();
  const { language } = useLanguage();
  const [accepted, setAccepted] = useState(false);
  const content = termsContent[language];

  const star1 = useRef(new Animated.Value(0)).current;
  const star2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const float = (val: Animated.Value, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(val, { toValue: 1, duration: 1800, delay, useNativeDriver: true }),
          Animated.timing(val, { toValue: 0, duration: 1800, useNativeDriver: true }),
        ])
      ).start();
    };
    float(star1, 0);
    float(star2, 600);
  }, []);

  const star1Style = {
    opacity: star1.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
    transform: [{ translateY: star1.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) }],
  };
  const star2Style = {
    opacity: star2.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
    transform: [{ translateY: star2.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) }],
  };

  const handleContinue = () => {
    if (!accepted) {
      Alert.alert(content.cancelAlertTitle, content.cancelAlertMsg);
      return;
    }
    router.navigate('/register');
  };

  const handleCancel = () => {
    router.navigate('/language-select');
  };

  return (
    <ImageBackground
      source={images.termsBackground}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay} />
      <Animated.Text style={[styles.floatingStar, { top: 40, left: 24 }, star1Style]}>★</Animated.Text>
      <Animated.Text style={[styles.floatingStar, { top: 60, right: 30 }, star2Style]}>★</Animated.Text>

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.card}>
          <ScrollView showsVerticalScrollIndicator={true} style={styles.scroll}>
            <Text style={styles.sectionTitle}>{content.consentTitle}</Text>
            <Text style={styles.bodyText}>{content.consentBody}</Text>

            <Text style={styles.sectionTitle}>{content.mechanicsTitle}</Text>
            <Text style={styles.bodyText}>{content.mechanicsBody}</Text>

            <Text style={styles.sectionTitle}>{content.conductTitle}</Text>

            <Text style={styles.subTitle}>{content.playerRulesTitle}</Text>
            <Text style={styles.bodyText}>{content.playerRules}</Text>

            <Text style={styles.subTitle}>{content.adminRulesTitle}</Text>
            <Text style={styles.bodyText}>{content.adminRules}</Text>
          </ScrollView>

          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setAccepted(!accepted)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, accepted && styles.checkboxChecked]}>
              {accepted && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>{content.checkboxLabel}</Text>
          </TouchableOpacity>

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
              <Text style={styles.cancelButtonText}>{content.cancelBtn}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.continueButton, !accepted && styles.continueButtonDisabled]}
              onPress={handleContinue}
            >
              <Text style={styles.continueButtonText}>{content.continueBtn}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, width: '100%', height: '100%' },
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(60,30,10,0.25)' },
  floatingStar: { position: 'absolute', fontSize: 22, color: '#FCD116' },
  safeArea: { flex: 1, padding: 16, justifyContent: 'center' },
  card: {
    backgroundColor: '#FFFDF7',
    borderRadius: 20,
    padding: 18,
    maxHeight: '92%',
    borderWidth: 2,
    borderColor: '#D9A441',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  scroll: { maxHeight: '68%', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: 'bold', color: '#8B2E1F', marginTop: 14, marginBottom: 6 },
  subTitle: { fontSize: 14, fontWeight: 'bold', color: '#0038A8', marginTop: 10, marginBottom: 4 },
  bodyText: { fontSize: 13.5, color: '#2B2B2B', lineHeight: 20 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, paddingHorizontal: 4 },
  checkbox: {
    width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#8B2E1F',
    marginRight: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFDF7',
  },
  checkboxChecked: { backgroundColor: '#8B2E1F' },
  checkmark: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
  checkboxLabel: { flex: 1, fontSize: 13, color: '#2B2B2B', fontWeight: '600' },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between' },
  cancelButton: {
    flex: 1, backgroundColor: '#EFE3D0', paddingVertical: 14, borderRadius: 25,
    alignItems: 'center', marginRight: 8, borderWidth: 2, borderColor: '#B0A18A',
  },
  cancelButtonText: { color: '#5C3A21', fontWeight: 'bold', fontSize: 15 },
  continueButton: {
    flex: 1, backgroundColor: '#0038A8', paddingVertical: 14, borderRadius: 25,
    alignItems: 'center', marginLeft: 8,
  },
  continueButtonDisabled: { backgroundColor: '#A9B8D9' },
  continueButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
});