import React from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage, LANGUAGES, type Language } from '@/shared/i18n/language-context';
import { useRouter } from 'expo-router';
import { Screen, ScreenHeader, Card, Icon, type IconName, BodyStrong } from '@/shared/components/ui';
import { useSound } from '@/shared/audio/sound-context';
import { tokens } from '@/shared/theme/tokens';

type MenuItem = {
  key: string;
  label: string;
  icon: IconName;
  color: string;
  onPress: () => void;
};

export default function SettingsScreen() {
  const router = useRouter();
  const { t, language, setLanguage } = useLanguage();
  const { prefs, setMusic, setEffects } = useSound();

  // Onboarding asks once and never again, so this is the only place a user can
  // change their mind about the language afterwards.
  const LANGUAGE_LABEL: Record<Language, string> = { en: t('english'), tl: t('tagalog') };

  const menuItems: MenuItem[] = [
    {
      key: 'help',
      label: t('helpLabel'),
      icon: 'lightbulb',
      color: tokens.color.success,
      onPress: () => router.navigate({ pathname: '/info', params: { title: t('helpLabel'), body: t('helpBody'), icon: 'help-buoy-outline' } }),
    },
    {
      key: 'about',
      label: t('aboutGameLabel'),
      icon: 'book',
      color: tokens.color.primary,
      onPress: () => router.navigate('/about-game'),
    },
    {
      key: 'privacyRights',
      label: t('privacyRightsLabel'),
      icon: 'lock',
      color: tokens.color.navJigsaw,
      onPress: () =>
        router.navigate({ pathname: '/info', params: { title: t('privacyRightsLabel'), body: t('privacyRightsBody'), icon: 'shield-checkmark-outline' } }),
    },
    {
      key: 'privacyPreferences',
      label: t('privacyPreferencesLabel'),
      icon: 'user',
      color: tokens.color.red,
      onPress: () =>
        router.navigate({ pathname: '/info', params: {
          title: t('privacyPreferencesLabel'),
          body: t('privacyPreferencesBody'),
          icon: 'person-circle-outline',
        } }),
    },
  ];

  return (
    <Screen>
      <ScreenHeader title={t('settingsTitle')} color={tokens.color.primary} onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.body}>
        <Card style={styles.settingsCard}>
          <View style={styles.settingsRow}>
            <View style={[styles.iconChip, { backgroundColor: tokens.color.navLessons }]}>
              <Ionicons name="language-outline" size={18} color={tokens.color.onDark} />
            </View>
            <BodyStrong style={styles.settingsLabel} numberOfLines={1}>{t('languageLabel')}</BodyStrong>
            <View style={styles.langRow}>
              {LANGUAGES.map((lang) => {
                const active = language === lang;
                return (
                  <TouchableOpacity
                    key={lang}
                    style={[styles.langChip, active && styles.langChipActive]}
                    onPress={() => setLanguage(lang)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={LANGUAGE_LABEL[lang]}
                  >
                    <BodyStrong style={active ? styles.langChipTextActive : styles.langChipText}>
                      {LANGUAGE_LABEL[lang]}
                    </BodyStrong>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </Card>

        <Card style={[styles.settingsCard, styles.menuCard]}>
          <View style={[styles.settingsRow, styles.settingsRowDivider]}>
            <View style={[styles.iconChip, { backgroundColor: tokens.color.primary }]}>
              {/* Registry has no music/speaker icons; Ionicons fills that gap. */}
              <Ionicons name="musical-notes-outline" size={18} color={tokens.color.onDark} />
            </View>
            <BodyStrong style={styles.settingsLabel} numberOfLines={1}>{t('musicLabel')}</BodyStrong>
            <Switch
              value={prefs.music}
              onValueChange={setMusic}
              trackColor={{ false: tokens.color.track, true: tokens.color.success }}
              thumbColor={tokens.color.surface}
            />
          </View>
          <View style={styles.settingsRow}>
            <View style={[styles.iconChip, { backgroundColor: tokens.color.primary }]}>
              <Ionicons name="volume-high-outline" size={18} color={tokens.color.onDark} />
            </View>
            <BodyStrong style={styles.settingsLabel} numberOfLines={1}>{t('soundEffectsLabel')}</BodyStrong>
            <Switch
              value={prefs.effects}
              onValueChange={setEffects}
              trackColor={{ false: tokens.color.track, true: tokens.color.success }}
              thumbColor={tokens.color.surface}
            />
          </View>
        </Card>

        <Card style={[styles.settingsCard, styles.menuCard]}>
          {menuItems.map((item, i) => (
            <TouchableOpacity
              key={item.key}
              style={[styles.settingsRow, i !== menuItems.length - 1 && styles.settingsRowDivider]}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View style={[styles.iconChip, { backgroundColor: item.color }]}>
                <Icon name={item.icon} size={18} color={tokens.color.onDark} />
              </View>
              <BodyStrong style={styles.settingsLabel} numberOfLines={1}>{item.label}</BodyStrong>
              <Icon name="chevronRight" size={18} color={tokens.color.inkFaint} />
            </TouchableOpacity>
          ))}
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { padding: tokens.space.lg, paddingBottom: tokens.space.xxl },

  settingsCard: { padding: 0, overflow: 'hidden' },
  menuCard: { marginTop: tokens.space.md },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.md,
    minHeight: tokens.hit.min,
    paddingHorizontal: tokens.space.lg,
    paddingVertical: tokens.space.sm,
  },
  settingsRowDivider: { borderBottomWidth: 1, borderBottomColor: tokens.color.divider },
  iconChip: { width: 36, height: 36, borderRadius: tokens.radius.md, alignItems: 'center', justifyContent: 'center' },
  settingsLabel: { flex: 1 },

  langRow: { flexDirection: 'row', gap: tokens.space.xs },
  langChip: {
    paddingHorizontal: tokens.space.md,
    paddingVertical: tokens.space.xs,
    borderRadius: tokens.radius.pill,
    borderWidth: 2,
    borderColor: tokens.color.border,
    backgroundColor: tokens.color.surface,
  },
  langChipActive: { backgroundColor: tokens.color.primary, borderColor: tokens.color.primary },
  langChipText: { color: tokens.color.inkMuted },
  langChipTextActive: { color: tokens.color.onDark },
});
