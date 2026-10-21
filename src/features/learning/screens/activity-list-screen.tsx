import React from 'react';
import { Image, View, TouchableOpacity, StyleSheet, ScrollView, type ImageSourcePropType, type ViewStyle } from 'react-native';
import { useGameProgress } from '@/features/learning/context/game-progress-context';
import { useClassContent } from '@/features/learning/context/class-content-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { toNum } from '@/shared/lib/params';
import {
  difficultyLabelKey,
  getLevelDifficultyKey,
  getPrimaryActivityAction,
} from '@/features/learning/lib/activity-list-model';
import { Screen, ScreenHeader, Card, Button, Pill, ProgressBar, Icon, BodyStrong, Caption, Label } from '@/shared/components/ui';
import { tokens, categoryColor } from '@/shared/theme/tokens';
import { slotStatus, triesLeft } from '@/features/learning/lib/attempt-rules';
import { activityNaming } from '@/features/learning/lib/activity-naming';
import { useLanguage } from '@/shared/i18n/language-context';
import { getCategoryMeta } from '@/shared/content/category-meta';

function difficultyColor(level: number) {
  if (level === 1) return tokens.color.success;
  if (level === 2 || level === 3) return tokens.color.warning;
  return tokens.color.danger;
}

export default function ActivityListScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const params = useLocalSearchParams<{
    category: string;
    label: string;
    color: string;
    activityType: string;
    level: string;
  }>();
  const { category, color, activityType } = params;
  const level = toNum(params.level, 1);
  const { getProgress, getFailed, getExhausted, getAttemptsUsed } = useGameProgress();
  // The admin console sets the cut per activity; unset ones keep the ramp that
  // used to be hardcoded here.
  const { getJigsawPieceCount, getEffectiveQuestion, getEffectiveCategoryContent } = useClassContent();
  const completed = getProgress(category, activityType, level);
  const failed = getFailed(category, activityType, level);
  const exhausted = getExhausted(category, activityType, level);
  // `diffKey` stays English: it rides the route params and the jigsaw screen
  // branches on it. Only `diffLabel` is language-dependent.
  const diffKey = getLevelDifficultyKey(level);
  const diffLabel = t(difficultyLabelKey(diffKey));
  const diffColor = difficultyColor(level);
  const label = t(getCategoryMeta(category).labelKey) || params.label;
  // Quiz cards read "Question 1-6", jigsaw cards "Puzzle 1-6" (item 4.4).
  const naming = activityNaming(activityType);

  const activities = [1, 2, 3, 4, 5, 6].map((num) => {
    const globalId = (level - 1) * 6 + num;
    const isDone = completed.includes(globalId);
    const attemptsUsed = getAttemptsUsed(category, activityType, level, num);
    const status = slotStatus(isDone, attemptsUsed);
    // A slot the server (or the local mirror) closed after 3 fails is exhausted
    // even if the cached attempt count lags; it never shows as "retry".
    const isExhausted = !isDone && (status === 'exhausted' || exhausted.includes(globalId));
    const isFailed = !isDone && !isExhausted && failed.includes(globalId);
    const left = triesLeft(attemptsUsed);
    const pieceCount = getJigsawPieceCount(category, level, num);
    const isJigsaw = activityType === 'jigsaw';
    const categoryContent = isJigsaw
      ? getEffectiveCategoryContent(category, level, num)
      : getEffectiveCategoryContent(category);
    const question = getEffectiveQuestion(category, level, num);
    const image = (isJigsaw
      ? categoryContent.image
      : question.miniLessonImageUrl
        ? { uri: question.miniLessonImageUrl }
        : categoryContent.image) as ImageSourcePropType;

    return {
      num,
      globalId,
      isDone,
      isFailed,
      isExhausted,
      attemptsUsed,
      left,
      pieceCount,
      image,
      title: isJigsaw
        ? categoryContent.title || t('picturePuzzleTitle', { label })
        : question.question,
      meta: isJigsaw ? t('jigsawPiecesMeta', { count: pieceCount }) : t('miniLessonQuizMeta'),
    };
  });

  const doneCount = activities.filter((a) => a.isDone || a.isExhausted).length;
  // Visual-only: the first card that is neither done, exhausted nor failed gets
  // the "next playable" treatment. Purely derived from the flags above.
  const nextPlayableNum = activities.find((a) => !a.isDone && !a.isExhausted && !a.isFailed)?.num;

  const openActivity = (act: any) => {
    if (activityType === 'jigsaw') {
      router.navigate({ pathname: '/jigsaw-puzzle', params: {
        category, label, color, level, activityNum: act.num,
        pieceCount: act.pieceCount, difficulty: diffKey,
      } });
    } else {
      router.navigate({ pathname: '/activity-play', params: {
        category, label, color, activityType, level, activityNum: act.num, difficulty: diffKey,
      } });
    }
  };

  const cat = categoryColor(category);
  const headerColor = color || tokens.color.primary;
  const primaryAction = getPrimaryActivityAction(
    activities.filter((activity) => activity.isDone || activity.isExhausted).map((activity) => activity.num),
    level,
    activityType,
  );

  const handlePrimaryAction = () => {
    if (primaryAction.kind === 'activity') {
      const activity = activities.find((item) => item.num === primaryAction.activityNum);
      if (activity) openActivity(activity);
      return;
    }

    router.navigate({ pathname: '/level-summary', params: { category, label, color, activityType, level } });
  };

  return (
    <Screen>
      <ScreenHeader
        title={t('levelNum', { n: level })}
        subtitle={t('levelSubtitle', {
          label,
          mode: activityType === 'jigsaw' ? t('gameTypeJigsaw') : t('gameTypeQuiz'),
        })}
        color={headerColor}
        onBack={() => router.back()}
        right={
          <Pill
            label={diffLabel}
            tone="translucent"
            style={{ backgroundColor: diffColor, borderColor: 'transparent' }}
          />
        }
      >
        <View style={styles.progressRow}>
          <View style={styles.progressBarWrap}>
            <ProgressBar value={doneCount / 6} color={tokens.color.gold} />
          </View>
          <Caption style={styles.progressCount}>{t('doneOfSixShort', { done: doneCount })}</Caption>
        </View>
      </ScreenHeader>

      <ScrollView contentContainerStyle={styles.list}>
        <Label style={styles.sectionLabel}>
          {doneCount === 6 ? t('levelCompleteLabel') : t('chooseAnActivity')}
        </Label>
        <View style={styles.activityList}>
          {activities.map((act) => {
            // Every activity in a reached level is playable, in any order —
            // that is how the game has always worked, and the only real gate is
            // per-LEVEL (`isLevelUnlocked`, on the level map). An earlier draft
            // of this screen drew a padlock on the not-yet-reached ones, which
            // was cosmetic only: the card still opened on tap. `isNext` marks a
            // suggested next activity without claiming the others are shut.
            const isNext = !act.isDone && !act.isExhausted && !act.isFailed && act.num === nextPlayableNum;
            const cardStyle = [
              styles.activityCard,
              act.isDone && styles.activityCardDone,
              (act.isFailed || act.isExhausted) && styles.activityCardFailed,
              isNext && { borderWidth: 2.5, borderColor: headerColor },
            ].filter(Boolean) as ViewStyle[];

            const closed = act.isDone || act.isExhausted;
            return (
              <TouchableOpacity
                key={act.num}
                onPress={() => openActivity(act)}
                disabled={closed}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityState={{ disabled: closed }}
                accessibilityLabel={t(naming.numTitle, { num: act.num, title: act.title })}
              >
                <Card style={cardStyle}>
                  <View style={styles.thumbnailWrap}>
                    <Image source={act.image} style={styles.thumbnail} resizeMode="cover" />
                    {isNext && (
                      <View style={[styles.thumbnailPlay, { backgroundColor: headerColor }]}>
                        <Icon name="play" size={13} color={tokens.color.onDark} />
                      </View>
                    )}
                  </View>

                  <View style={styles.activityCopy}>
                    <Caption style={[styles.activityNumber, { color: headerColor }]}>{t(naming.numShort, { num: act.num })}</Caption>
                    <BodyStrong numberOfLines={2}>{act.title}</BodyStrong>
                    <Caption numberOfLines={1}>{act.meta}</Caption>
                    {act.isExhausted ? (
                      <Caption style={styles.triesLeftCaption} numberOfLines={1}>{t('outOfTries')}</Caption>
                    ) : !act.isDone && act.attemptsUsed > 0 ? (
                      <Caption style={styles.triesLeftCaption} numberOfLines={1}>
                        {act.left === 1 ? t('triesLeftOne') : t('triesLeftMany', { n: act.left })}
                      </Caption>
                    ) : null}
                  </View>

                  {act.isDone ? (
                    <View style={styles.checkChip}>
                      <Icon name="check" size={15} color={tokens.color.onDark} strokeWidth={3} />
                    </View>
                  ) : act.isExhausted ? (
                    <View style={styles.retryChip}>
                      <Icon name="close" size={14} color={tokens.color.dangerInk} strokeWidth={2.4} />
                    </View>
                  ) : act.isFailed ? (
                    <View style={styles.retryChip}>
                      <Icon name="refresh" size={14} color={tokens.color.dangerInk} strokeWidth={2.4} />
                    </View>
                  ) : (
                    <Icon name="chevronRight" size={20} color={tokens.color.inkFaint} />
                  )}
                </Card>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button label={t(primaryAction.labelKey, primaryAction.labelVars)} onPress={handlePrimaryAction} color={cat.base} shadowColor={cat.dark} icon="chevronRight" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm, marginTop: tokens.space.md },
  progressBarWrap: { flex: 1 },
  progressCount: { color: tokens.color.onDarkMuted, fontFamily: tokens.font.bodyBold },
  list: { padding: tokens.space.lg, paddingBottom: tokens.space.xxl, gap: tokens.space.sm },
  sectionLabel: { paddingHorizontal: tokens.space.xs, marginBottom: tokens.space.xs },
  activityList: { gap: tokens.space.sm },
  activityCard: {
    minHeight: 96,
    padding: tokens.space.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.md,
  },
  activityCardDone: { borderColor: tokens.color.successBorder, backgroundColor: tokens.color.successSoft },
  activityCardFailed: { borderColor: tokens.color.dangerBorder, backgroundColor: tokens.color.dangerSoft },
  thumbnailWrap: { width: 92, height: 74, borderRadius: tokens.radius.md, overflow: 'hidden' },
  thumbnail: { width: '100%', height: '100%', backgroundColor: tokens.color.surfaceSunken },
  thumbnailPlay: {
    position: 'absolute',
    right: tokens.space.xs,
    bottom: tokens.space.xs,
    width: 28,
    height: 28,
    borderRadius: tokens.radius.pill,
    borderWidth: 2,
    borderColor: tokens.color.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityCopy: { flex: 1, alignItems: 'flex-start', gap: 1 },
  activityNumber: { fontFamily: tokens.font.bodyBlack, textTransform: 'uppercase', letterSpacing: 0.7 },
  triesLeftCaption: { color: tokens.color.dangerInk, fontFamily: tokens.font.bodyBold },
  checkChip: {
    width: 28,
    height: 28,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.color.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryChip: {
    width: 28,
    height: 28,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.color.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: { paddingHorizontal: tokens.space.lg, paddingBottom: tokens.space.lg, paddingTop: tokens.space.sm },
});
