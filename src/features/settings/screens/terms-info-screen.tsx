import React from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { H2, H3, Body } from '@/shared/components/ui';
import { tokens } from '@/shared/theme/tokens';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '@/shared/i18n/language-context';
import { termsContent } from '@/shared/content/terms-content';
import { useRouter } from 'expo-router';

export default function TermsInfoScreen() {
  const router = useRouter();
  const { language, t } = useLanguage();
  const content = termsContent[language];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <Ionicons name="chevron-back" size={22} color="#FFF" />
        </TouchableOpacity>
        <H2 style={styles.headerTitle}>{t('termsConditionsLabel')}</H2>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <H3 style={styles.sectionTitle}>{content.consentTitle}</H3>
        <Body style={styles.bodyText}>{content.consentBody}</Body>

        <H3 style={styles.sectionTitle}>{content.mechanicsTitle}</H3>
        <Body style={styles.bodyText}>{content.mechanicsBody}</Body>

        <H3 style={styles.sectionTitle}>{content.conductTitle}</H3>

        <Body style={styles.subTitle}>{content.playerRulesTitle}</Body>
        <Body style={styles.bodyText}>{content.playerRules}</Body>

        <Body style={styles.subTitle}>{content.adminRulesTitle}</Body>
        <Body style={styles.bodyText}>{content.adminRules}</Body>

        <Body style={styles.subTitle}>{content.mainAdminRulesTitle}</Body>
        <Body style={styles.bodyText}>{content.mainAdminRules}</Body>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5EFE0' },
  header: {
    backgroundColor: '#0038A8', paddingTop: 10, paddingBottom: 16, paddingHorizontal: 16,
    borderBottomLeftRadius: 20, borderBottomRightRadius: 20,
  },
  headerBack: { marginBottom: 4 },
  headerTitle: { color: '#FCD116' },
  body: { padding: 20, paddingBottom: 48 },
  sectionTitle: { color: '#8B2E1F', marginTop: 14, marginBottom: 6 },
  subTitle: { fontFamily: tokens.font.bodyBold, color: '#0038A8', marginTop: 10, marginBottom: 4 },
  bodyText: { color: '#2B2B2B' },
});