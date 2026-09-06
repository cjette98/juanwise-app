import React, { useState, useEffect, useRef } from 'react';
import {
  View,
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
import { Card, Button, Icon, H2, H3, Body, BodyStrong } from '@/shared/components/ui';
import { tokens } from '@/shared/theme/tokens';

// This screen keeps its own `ImageBackground` + `SafeAreaView` root rather
// than `<Screen>`: `<Screen>` paints an opaque canvas colour behind its
// content, which would hide the full-bleed terms artwork entirely.
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
      <Animated.View style={[styles.floatingStar, { top: 40, left: 24 }, star1Style]}>
        <Icon name="star" size={22} color={tokens.color.gold} filled />
      </Animated.View>
      <Animated.View style={[styles.floatingStar, { top: 60, right: 30 }, star2Style]}>
        <Icon name="star" size={22} color={tokens.color.gold} filled />
      </Animated.View>

      <SafeAreaView style={styles.safeArea}>
        <Card style={styles.card}>
          <ScrollView showsVerticalScrollIndicator={true} style={styles.scroll}>
            <H2 style={styles.sectionTitle}>{content.consentTitle}</H2>
            <Body style={styles.bodyText}>{content.consentBody}</Body>

            <H2 style={styles.sectionTitle}>{content.mechanicsTitle}</H2>
            <Body style={styles.bodyText}>{content.mechanicsBody}</Body>

            <H2 style={styles.sectionTitle}>{content.conductTitle}</H2>

            <H3 style={styles.subTitle}>{content.playerRulesTitle}</H3>
            <Body style={styles.bodyText}>{content.playerRules}</Body>

            <H3 style={styles.subTitle}>{content.adminRulesTitle}</H3>
            <Body style={styles.bodyText}>{content.adminRules}</Body>
          </ScrollView>

          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setAccepted(!accepted)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, accepted && styles.checkboxChecked]}>
              {accepted && <Icon name="check" size={14} color={tokens.color.onDark} strokeWidth={3} />}
            </View>
            <BodyStrong style={styles.checkboxLabel}>{content.checkboxLabel}</BodyStrong>
          </TouchableOpacity>

          <View style={styles.buttonRow}>
            <Button
              label={content.cancelBtn}
              onPress={handleCancel}
              variant="secondary"
              style={styles.cancelButton}
            />

            <Button
              label={content.continueBtn}
              onPress={handleContinue}
              color={accepted ? tokens.color.primary : tokens.color.locked}
              shadowColor={accepted ? tokens.color.primaryDark : tokens.color.locked}
              style={styles.continueButton}
            />
          </View>
        </Card>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, width: '100%', height: '100%' },
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: tokens.color.ink, opacity: 0.25 },
  floatingStar: { position: 'absolute' },
  safeArea: { flex: 1, padding: tokens.space.lg, justifyContent: 'center' },
  card: { maxHeight: '92%' },
  scroll: { maxHeight: '68%', marginBottom: tokens.space.sm },
  sectionTitle: { marginTop: tokens.space.md, marginBottom: tokens.space.xs },
  subTitle: { color: tokens.color.primary, marginTop: tokens.space.sm, marginBottom: tokens.space.xs },
  bodyText: {},
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: tokens.hit.min,
    marginBottom: tokens.space.sm,
    paddingHorizontal: tokens.space.xs,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: tokens.radius.sm,
    borderWidth: 2,
    borderColor: tokens.color.primary,
    marginRight: tokens.space.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.color.surface,
  },
  checkboxChecked: { backgroundColor: tokens.color.primary },
  checkboxLabel: { flex: 1 },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', gap: tokens.space.sm },
  cancelButton: { flex: 1 },
  continueButton: { flex: 1 },
});
