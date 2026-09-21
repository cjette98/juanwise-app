import React, { useMemo, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import {
  Screen,
  ScreenHeader,
  Card,
  Button,
  Icon,
  Avatar,
  StarRow,
  Segmented,
  H3,
  Body,
  BodyStrong,
  Caption,
  Label,
  type IconName,
  type SegmentedOption,
} from '@/shared/components/ui';
import { tokens, categoryColor } from '@/shared/theme/tokens';
import {
  useStudentResults,
  ResultFilter,
  TROPHY_TIERS,
  Trophy,
  LearnerPace,
  COMBINED_MAX_POINTS,
  COMBINED_MAX_TIME_SECONDS,
} from '@/features/results/context/student-results-context';
import { formatDuration, paceTone } from '@/features/leaderboard/teacher-leaderboard-format';
import CATEGORY_META from '@/shared/content/category-meta';
import { useLanguage, type TranslationKey } from '@/shared/i18n/language-context';
import { useRouter } from 'expo-router';

type SortMode = 'speed' | 'points';
type FilterKey = 'topic' | 'type' | 'level';
const LEVELS = [1, 2, 3, 4, 5];

/** The tier's own name, so the legend never renders `TROPHY_TIERS.label` (emoji + English). */
const TIER_NAME_KEY: Record<'gold' | 'silver' | 'bronze', TranslationKey> = {
  gold: 'medalGold',
  silver: 'medalSilver',
  bronze: 'medalBronze',
};

/** The legend's "Trophy = Pace" rows are keyed on tier, the pace tone helper on pace — this bridges the two. */
const PACE_BY_TIER: Record<'gold' | 'silver' | 'bronze', LearnerPace> = {
  gold: 'fast',
  silver: 'steady',
  bronze: 'needs-support',
};

/**
 * The trophy, drawn as the same line icon the rest of the app uses, tinted to
 * the tier it stands for, rather than the old bespoke `TROPHY_COLORS` hex
 * triplet. `null` (no trophy yet) draws a dash instead of leaving a hole in
 * the row.
 */
function TrophyGlyph({ trophy }: { trophy: Trophy }) {
  if (!trophy) return <Caption style={{ color: tokens.color.inkFaint }}>—</Caption>;
  const color =
    trophy === 'gold' ? tokens.color.medalGold : trophy === 'silver' ? tokens.color.medalSilver : tokens.color.medalBronze;
  return <Icon name="trophy" size={20} color={color} />;
}

/** One of the three collapsed filter chips — shows the active selection, or its "All" default, and opens its option set. */
function FilterChip({
  icon,
  label,
  active,
  open,
  onPress,
}: {
  icon: IconName;
  label: string;
  active: boolean;
  open: boolean;
  onPress: () => void;
}) {
  const highlighted = active || open;
  return (
    <TouchableOpacity
      style={[styles.filterChip, highlighted && styles.filterChipActive]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ expanded: open, selected: active }}
    >
      <Icon name={icon} size={15} color={highlighted ? tokens.color.onDark : tokens.color.inkMuted} />
      <Caption
        style={[styles.filterChipText, highlighted && styles.filterChipTextActive]}
        numberOfLines={1}
      >
        {label}
      </Caption>
    </TouchableOpacity>
  );
}

/** One option inside an open filter panel — "All" or a specific value. */
function OptionPill({
  label,
  active,
  color,
  onPress,
}: {
  label: string;
  active: boolean;
  color?: string;
  onPress: () => void;
}) {
  const border = color ?? tokens.color.border;
  const bg = active ? color ?? tokens.color.primary : tokens.color.surface;
  const fg = active ? tokens.color.onDark : color ?? tokens.color.inkMuted;
  return (
    <TouchableOpacity
      style={[styles.optionPill, { borderColor: border, backgroundColor: bg }]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Caption style={[styles.optionPillText, { color: fg }]}>{label}</Caption>
    </TouchableOpacity>
  );
}

export default function TeacherLeaderboardScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { getLeaderboard, getFilteredResults, ready, clearResults } = useStudentResults();
  const [sortMode, setSortMode] = useState<SortMode>('speed');
  const [category, setCategory] = useState<string | null>(null);
  const [activityType, setActivityType] = useState<'quiz' | 'jigsaw' | null>(null);
  const [level, setLevel] = useState<number | null>(null);
  const [showLegend, setShowLegend] = useState(false);
  const [openFilter, setOpenFilter] = useState<FilterKey | null>(null);

  const isUnfiltered = !category && !activityType && !level;

  const filter: ResultFilter = useMemo(
    () => ({
      ...(category ? { category } : {}),
      ...(activityType ? { activityType } : {}),
      ...(level ? { level } : {}),
    }),
    [category, activityType, level]
  );

  const scopedResults = useMemo(() => getFilteredResults(filter), [getFilteredResults, filter]);
  const leaderboard = useMemo(() => getLeaderboard(filter), [getLeaderboard, filter]);

  const sorted = useMemo(() => {
    const list = [...leaderboard];
    if (sortMode === 'points') list.sort((a, b) => b.totalPoints - a.totalPoints);
    // 'speed' is already sorted by performanceScore (points + pace) from the context
    return list;
  }, [leaderboard, sortMode]);

  // DELETE /results is scoped to this class and admin-only — a teacher gets a
  // clear 403 message back rather than a button that silently does nothing.
  const handleClear = () => {
    Alert.alert(t('clearBoardTitle'), t('clearBoardMsg'), [
      { text: t('cancelBtn'), style: 'cancel' },
      {
        text: t('clearAllData'),
        style: 'destructive',
        onPress: async () => {
          const result = await clearResults();
          Alert.alert(result.success ? t('clearSuccessTitle') : t('clearFailTitle'), result.message);
        },
      },
    ]);
  };

  const toggleFilter = (key: FilterKey) => setOpenFilter((v) => (v === key ? null : key));

  const topicChipLabel = category ? CATEGORY_META.find((c) => c.key === category)?.label ?? category : t('filterTopic');
  const typeChipLabel =
    activityType === 'quiz' ? t('gameTypeQuiz') : activityType === 'jigsaw' ? t('gameTypeJigsaw') : t('filterType');
  const levelChipLabel = level ? `${t('level')} ${level}` : t('filterLevel');

  const SORT_OPTIONS: SegmentedOption<SortMode>[] = [
    { value: 'speed', label: t('sortFastest'), icon: 'clock' },
    { value: 'points', label: t('sortHighestPoints'), icon: 'star' },
  ];

  const subtitle = `${scopedResults.length} ${t('activitiesCompleted')}`;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          title={t('leaderBoard')}
          subtitle={subtitle}
          color={tokens.color.navLeaderboard}
          onBack={() => router.back()}
          right={
            <TouchableOpacity
              style={styles.legendToggle}
              onPress={() => setShowLegend((v) => !v)}
              accessibilityRole="button"
              accessibilityLabel={t('trophyGuide')}
              accessibilityState={{ expanded: showLegend }}
            >
              <Icon name="help" size={22} color={tokens.color.onDark} />
            </TouchableOpacity>
          }
        >
          <Segmented options={SORT_OPTIONS} value={sortMode} onChange={setSortMode} tone="onDark" style={styles.sortSwitch} />

          {showLegend && (
            <Card style={styles.legendCard}>
              <BodyStrong style={styles.legendTitle}>{t('trophyGuideIntro')}</BodyStrong>
              {TROPHY_TIERS.map((tier) => (
                <View key={tier.trophy} style={styles.legendRow}>
                  <View style={styles.legendRowLabelWrap}>
                    <TrophyGlyph trophy={tier.trophy} />
                    <BodyStrong style={styles.legendRowLabel}>{t(TIER_NAME_KEY[tier.trophy])}</BodyStrong>
                  </View>
                  <Caption style={styles.legendRowDetail}>
                    {t('legendPointsAndTime', {
                      points: String(tier.minPoints),
                      time: formatDuration(tier.maxTimeSeconds),
                    })}
                  </Caption>
                </View>
              ))}
              <Caption style={styles.legendFoot}>
                {t('trophyMaxPossible', {
                  points: String(COMBINED_MAX_POINTS),
                  seconds: COMBINED_MAX_TIME_SECONDS.toLocaleString(),
                })}
              </Caption>

              <View style={styles.legendDivider} />
              <BodyStrong style={styles.legendTitle}>{t('trophyPaceTitle')}</BodyStrong>
              {(['gold', 'silver', 'bronze'] as const).map((tier) => {
                const tone = paceTone(PACE_BY_TIER[tier]);
                return (
                  <View key={tier} style={styles.legendRow}>
                    <View style={styles.legendRowLabelWrap}>
                      <TrophyGlyph trophy={tier} />
                      <BodyStrong style={styles.legendRowLabel}>
                        {tier === 'gold' ? t('medalGold') : tier === 'silver' ? t('medalSilver') : t('legendBronzeOrNone')}
                      </BodyStrong>
                    </View>
                    <View style={styles.legendPaceRow}>
                      <Caption style={styles.legendRowDetail}>→</Caption>
                      <Icon name={tone.icon} size={13} color={tokens.color.inkMuted} />
                      <Caption style={styles.legendRowDetail}>{t(tone.labelKey)}</Caption>
                    </View>
                  </View>
                );
              })}
              <View style={styles.legendFootRow}>
                <Icon name="star" size={13} color={tokens.color.gold} filled />
                <Caption style={styles.legendFootText}>{t('starsExplain')}</Caption>
              </View>
            </Card>
          )}
        </ScreenHeader>

        <View style={styles.body}>
          {/* FILTERS — three chips in one row, each opening its own option set below */}
          <View style={styles.filterChipRow}>
            <FilterChip
              icon="flag"
              label={topicChipLabel}
              active={!!category}
              open={openFilter === 'topic'}
              onPress={() => toggleFilter('topic')}
            />
            <FilterChip
              icon="quiz"
              label={typeChipLabel}
              active={!!activityType}
              open={openFilter === 'type'}
              onPress={() => toggleFilter('type')}
            />
            <FilterChip
              icon="chart"
              label={levelChipLabel}
              active={!!level}
              open={openFilter === 'level'}
              onPress={() => toggleFilter('level')}
            />
          </View>

          {openFilter === 'topic' && (
            <Card style={styles.filterPanel}>
              <Label style={styles.filterPanelLabel}>{t('topicLabel')}</Label>
              <View style={styles.optionRow}>
                <OptionPill
                  label={t('allFilter')}
                  active={!category}
                  onPress={() => {
                    setCategory(null);
                    setOpenFilter(null);
                  }}
                />
                {CATEGORY_META.map((c) => {
                  const active = category === c.key;
                  return (
                    <OptionPill
                      key={c.key}
                      label={c.label}
                      active={active}
                      color={categoryColor(c.key).base}
                      onPress={() => {
                        setCategory(active ? null : c.key);
                        setOpenFilter(null);
                      }}
                    />
                  );
                })}
              </View>
            </Card>
          )}

          {openFilter === 'type' && (
            <Card style={styles.filterPanel}>
              <Label style={styles.filterPanelLabel}>{t('activityTypeLabel')}</Label>
              <View style={styles.optionRow}>
                <OptionPill
                  label={t('allFilter')}
                  active={!activityType}
                  onPress={() => {
                    setActivityType(null);
                    setOpenFilter(null);
                  }}
                />
                <OptionPill
                  label={t('gameTypeQuiz')}
                  active={activityType === 'quiz'}
                  onPress={() => {
                    setActivityType(activityType === 'quiz' ? null : 'quiz');
                    setOpenFilter(null);
                  }}
                />
                <OptionPill
                  label={t('gameTypeJigsaw')}
                  active={activityType === 'jigsaw'}
                  onPress={() => {
                    setActivityType(activityType === 'jigsaw' ? null : 'jigsaw');
                    setOpenFilter(null);
                  }}
                />
              </View>
            </Card>
          )}

          {openFilter === 'level' && (
            <Card style={styles.filterPanel}>
              <Label style={styles.filterPanelLabel}>{t('level')}</Label>
              <View style={styles.optionRow}>
                <OptionPill
                  label={t('allFilter')}
                  active={!level}
                  onPress={() => {
                    setLevel(null);
                    setOpenFilter(null);
                  }}
                />
                {LEVELS.map((lvl) => {
                  const active = level === lvl;
                  return (
                    <OptionPill
                      key={lvl}
                      label={`${t('level')} ${lvl}`}
                      active={active}
                      onPress={() => {
                        setLevel(active ? null : lvl);
                        setOpenFilter(null);
                      }}
                    />
                  );
                })}
              </View>
            </Card>
          )}

          {!ready && <Body style={styles.emptyText}>{t('loadingResults')}</Body>}
          {ready && sorted.length === 0 && <Body style={styles.emptyText}>{t('noResultsForFilter')}</Body>}

          <View style={styles.list}>
            {sorted.map((s, i) => {
              const tone = paceTone(s.pace);
              return (
                <TouchableOpacity
                  key={s.studentName}
                  onPress={() => router.navigate({ pathname: '/student-summary', params: { studentName: s.studentName } })}
                  accessibilityRole="button"
                >
                  <Card style={styles.row}>
                    <View style={styles.rankCircle}>
                      <Caption style={styles.rankText}>{i + 1}</Caption>
                    </View>
                    <Avatar name={s.studentName} size={44} />
                    <View style={styles.rowMain}>
                      <BodyStrong numberOfLines={1}>{s.studentName}</BodyStrong>
                      <View style={styles.rowMetaRow}>
                        <View style={[styles.paceBadge, { backgroundColor: tone.bg }]}>
                          <Icon name={tone.icon} size={12} color={tone.fg} />
                          <Caption style={[styles.paceBadgeText, { color: tone.fg }]}>{t(tone.labelKey)}</Caption>
                        </View>
                        <StarRow earned={Math.round(s.avgStars)} size={12} />
                      </View>
                      <Caption style={styles.rowSubStat}>
                        {t('activityTimeoutStat', { attempts: String(s.attempts), timeouts: String(s.timeOuts) })}
                      </Caption>
                      {isUnfiltered && (
                        <Caption style={styles.rowSubStat}>
                          {t('quizCorrectStat', { correct: String(s.quizCorrect) })}
                        </Caption>
                      )}
                    </View>
                    <View style={styles.statsBlock}>
                      {isUnfiltered && <TrophyGlyph trophy={s.trophy} />}
                      <H3 style={styles.pointsText}>
                        {isUnfiltered
                          ? `${s.totalPoints}/${COMBINED_MAX_POINTS} ${t('ptsSuffix')}`
                          : `${s.totalPoints} ${t('ptsSuffix')}`}
                      </H3>
                      <View style={styles.durationRow}>
                        <Icon name="clock" size={12} color={tokens.color.inkMuted} />
                        <Caption style={styles.durationText}>
                          {formatDuration(s.totalTimeUsed)} {t('totalTimeSuffix')}
                        </Caption>
                      </View>
                    </View>
                  </Card>
                </TouchableOpacity>
              );
            })}
          </View>

          {scopedResults.length > 0 && (
            <Button
              label={t('clearAllData')}
              onPress={handleClear}
              color={tokens.color.danger}
              shadowColor={tokens.color.dangerInk}
              style={styles.clearButton}
            />
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: tokens.space.xxl },
  legendToggle: {
    width: tokens.hit.min,
    height: tokens.hit.min,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.color.onDarkChip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortSwitch: { marginTop: tokens.space.md },

  legendCard: { gap: tokens.space.xs, marginTop: tokens.space.md },
  legendTitle: { marginBottom: tokens.space.xs },
  legendRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: tokens.space.xs / 2 },
  legendRowLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.xs },
  legendRowLabel: { color: tokens.color.ink },
  legendRowDetail: { color: tokens.color.inkMuted, fontFamily: tokens.font.bodyBold },
  legendPaceRow: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.xs / 2 },
  legendFoot: { marginTop: tokens.space.xs, fontStyle: 'italic' },
  legendFootRow: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.xs / 2, marginTop: tokens.space.xs },
  legendFootText: { fontStyle: 'italic', flex: 1 },
  legendDivider: { height: 1, backgroundColor: tokens.color.divider, marginVertical: tokens.space.sm },

  body: { paddingHorizontal: tokens.space.lg, paddingTop: tokens.space.lg, gap: tokens.space.sm },

  filterChipRow: { flexDirection: 'row', gap: tokens.space.sm },
  filterChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.space.xs,
    minHeight: tokens.hit.min,
    paddingHorizontal: tokens.space.sm,
    borderRadius: tokens.radius.pill,
    borderWidth: 1.5,
    borderColor: tokens.color.border,
    backgroundColor: tokens.color.surface,
  },
  filterChipActive: { backgroundColor: tokens.color.primary, borderColor: tokens.color.primary },
  filterChipText: { color: tokens.color.inkMuted, fontFamily: tokens.font.bodyBold },
  filterChipTextActive: { color: tokens.color.onDark },

  filterPanel: { gap: tokens.space.sm },
  filterPanelLabel: { marginBottom: 0 },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm },
  optionPill: {
    minHeight: tokens.hit.min,
    paddingHorizontal: tokens.space.sm,
    paddingVertical: tokens.space.xs,
    borderRadius: tokens.radius.pill,
    borderWidth: 1.5,
    justifyContent: 'center',
  },
  optionPillText: { fontFamily: tokens.font.bodyBold },

  emptyText: { textAlign: 'center', marginTop: tokens.space.xl, paddingHorizontal: tokens.space.sm },

  list: { gap: tokens.space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm },
  rankCircle: {
    width: 28,
    height: 28,
    borderRadius: tokens.radius.pill,
    borderWidth: 1.5,
    borderColor: tokens.color.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: { color: tokens.color.inkMuted, fontFamily: tokens.font.bodyBold },
  rowMain: { flex: 1, gap: 4 },
  rowSubStat: { color: tokens.color.inkMuted },
  rowMetaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: tokens.space.xs },
  paceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: tokens.space.xs,
    paddingVertical: 3,
    borderRadius: tokens.radius.pill,
  },
  paceBadgeText: { ...tokens.type.tab },
  statsBlock: { alignItems: 'flex-end', gap: 2 },
  pointsText: { color: tokens.color.ink },
  durationRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  durationText: { color: tokens.color.inkMuted },

  clearButton: { marginTop: tokens.space.sm },
});
