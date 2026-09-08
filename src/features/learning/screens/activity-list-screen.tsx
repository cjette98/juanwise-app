import React from 'react';
import { Image, View, TouchableOpacity, StyleSheet, ScrollView, type ImageSourcePropType, type ViewStyle } from 'react-native';
import { useGameProgress } from '@/features/learning/context/game-progress-context';
import { useClassContent } from '@/features/learning/context/class-content-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { toNum } from '@/shared/lib/params';
import { getPrimaryActivityAction } from '@/features/learning/lib/activity-list-model';
import { Screen, ScreenHeader, Card, Button, Pill, ProgressBar, Icon, BodyStrong, Caption, Label } from '@/shared/components/ui';
import { tokens, categoryColor } from '@/shared/theme/tokens';

function getLevelDifficulty(level: number) {
  if (level === 1) return { label: 'Easy', color: tokens.color.success };
  if (level === 2 || level === 3) return { label: 'Normal', color: tokens.color.warning };
  return { label: 'Hard', color: tokens.color.danger };
}

export default function ActivityListScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    category: string;
    label: string;
    color: string;
    activityType: string;
    level: string;
  }>();
  const { category, label, color, activityType } = params;
  const level = toNum(params.level, 1);
  const { getProgress, getFailed } = useGameProgress();
  // The admin console sets the cut per activity; unset ones keep the ramp that
  // used to be hardcoded here.
  const { getJigsawPieceCount, getEffectiveQuestion, getEffectiveCategoryContent } = useClassContent();
  const completed = getProgress(category, activityType, level);
  const failed = getFailed(category, activityType, level);
  const { label: diffLabel, color: diffColor } = getLevelDifficulty(level);

  const activities = [1, 2, 3, 4, 5, 6].map((num) => {
    const globalId = (level - 1) * 6 + num;
    const isDone = completed.includes(globalId);
    const isFailed = !isDone && failed.includes(globalId);
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
      pieceCount,
      image,
      title: isJigsaw ? categoryContent.title || `${label} Picture Puzzle` : question.question,
      meta: isJigsaw ? `Jigsaw · ${pieceCount} pieces` : 'Mini lesson · Quiz',
    };
  });

  const doneCount = completed.length;
  // Visual-only: the first card that is neither done nor failed gets the
  // "next playable" treatment. Purely derived from the flags above.
  const nextPlayableNum = activities.find((a) => !a.isDone && !a.isFailed)?.num;

  const openActivity = (act: any) => {
    if (activityType === 'jigsaw') {
      router.navigate({ pathname: '/jigsaw-puzzle', params: {
        category, label, color, level, activityNum: act.num,
        pieceCount: act.pieceCount, difficulty: diffLabel,
      } });
    } else {
      router.navigate({ pathname: '/activity-play', params: {
        category, label, color, activityType, level, activityNum: act.num, difficulty: diffLabel,
      } });
    }
  };

  const cat = categoryColor(category);
  const headerColor = color || tokens.color.primary;
  const primaryAction = getPrimaryActivityAction(
    activities.filter((activity) => activity.isDone).map((activity) => activity.num),
    level,
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
        title={`Level ${level}`}
        subtitle={`${label} · ${activityType === 'jigsaw' ? 'Jigsaw Puzzle' : 'Quiz'}`}
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
          <Caption style={styles.progressCount}>{doneCount} of 6</Caption>
        </View>
      </ScreenHeader>

      <ScrollView contentContainerStyle={styles.list}>
        <Label style={styles.sectionLabel}>
          {doneCount === 6 ? 'Level complete' : 'Choose an activity'}
        </Label>
        <View style={styles.activityList}>
          {activities.map((act) => {
            // Every activity in a reached level is playable, in any order —
            // that is how the game has always worked, and the only real gate is
            // per-LEVEL (`isLevelUnlocked`, on the level map). An earlier draft
            // of this screen drew a padlock on the not-yet-reached ones, which
            // was cosmetic only: the card still opened on tap. `isNext` marks a
            // suggested next activity without claiming the others are shut.
            const isNext = !act.isDone && !act.isFailed && act.num === nextPlayableNum;
            const cardStyle = [
              styles.activityCard,
              act.isDone && styles.activityCardDone,
              act.isFailed && styles.activityCardFailed,
              isNext && { borderWidth: 2.5, borderColor: headerColor },
            ].filter(Boolean) as ViewStyle[];

            return (
              <TouchableOpacity
                key={act.num}
                onPress={() => openActivity(act)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={`Activity ${act.num}: ${act.title}`}
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
                    <Caption style={[styles.activityNumber, { color: headerColor }]}>Activity {act.num}</Caption>
                    <BodyStrong numberOfLines={2}>{act.title}</BodyStrong>
                    <Caption numberOfLines={1}>{act.meta}</Caption>
                  </View>

                  {act.isDone ? (
                    <View style={styles.checkChip}>
                      <Icon name="check" size={15} color={tokens.color.onDark} strokeWidth={3} />
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
        <Button label={primaryAction.label} onPress={handlePrimaryAction} color={cat.base} shadowColor={cat.dark} icon="chevronRight" />
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
