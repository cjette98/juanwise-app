import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useLanguage } from '@/shared/i18n/language-context';
import { Screen, ScreenHeader, Card, H2, Icon } from '@/shared/components/ui';
import { tokens } from '@/shared/theme/tokens';

export default function ActivityChoiceScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { category, label, color } = useLocalSearchParams<{
    category: string;
    label: string;
    color: string;
  }>();

  const choose = (type: 'quiz' | 'jigsaw') => {
    router.navigate({ pathname: '/level-map', params: { category, label, color, activityType: type } });
  };

  return (
    <Screen>
      <ScreenHeader
        title={label}
        subtitle={t('chooseActivity')}
        color={color || tokens.color.primary}
        onBack={() => router.back()}
      />

      <View style={styles.content}>
        <TouchableOpacity activeOpacity={0.85} onPress={() => choose('quiz')}>
          <Card style={[styles.choiceCard, { backgroundColor: tokens.color.navQuiz }]}>
            <View style={styles.watermark}>
              <Icon name="quiz" size={72} color={tokens.color.onDark} />
            </View>
            <H2 style={styles.choiceLabel}>{t('quiz')}</H2>
          </Card>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.85} onPress={() => choose('jigsaw')}>
          <Card style={[styles.choiceCard, { backgroundColor: tokens.color.navJigsaw }]}>
            <View style={styles.watermark}>
              <Icon name="puzzle" size={72} color={tokens.color.onDark} />
            </View>
            <H2 style={styles.choiceLabel}>{t('jigsawPuzzle')}</H2>
          </Card>
        </TouchableOpacity>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, justifyContent: 'center', padding: tokens.space.lg, gap: tokens.space.lg },
  choiceCard: { minHeight: 140, justifyContent: 'flex-end', overflow: 'hidden' },
  watermark: { position: 'absolute', top: tokens.space.lg, right: tokens.space.lg, opacity: 0.25 },
  choiceLabel: { color: tokens.color.onDark },
});
