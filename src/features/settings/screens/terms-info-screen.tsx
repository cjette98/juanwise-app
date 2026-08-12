import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
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
        <Text style={styles.headerTitle}>{t('termsConditionsLabel')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
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
  headerTitle: { color: '#FCD116', fontWeight: 'bold', fontSize: 19 },
  body: { padding: 20, paddingBottom: 48 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#8B2E1F', marginTop: 14, marginBottom: 6 },
  subTitle: { fontSize: 13.5, fontWeight: 'bold', color: '#0038A8', marginTop: 10, marginBottom: 4 },
  bodyText: { fontSize: 13.5, color: '#2B2B2B', lineHeight: 20 },
});