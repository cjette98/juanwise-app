import React, { useEffect, useMemo, useState } from 'react';
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
  TrophyBadge,
} from '@/shared/components/ui';
import { tokens, categoryColor } from '@/shared/theme/tokens';
import { typeScale } from '@/shared/theme/typography';
import {
  useStudentResults,
  ResultFilter,
  TROPHY_TIERS,
  Trophy,
  LearnerPace,
  COMBINED_MAX_POINTS,
  COMBINED_MAX_TIME_SECONDS,
  averageTriesToPass,
  getCanonicalAttempts,
} from '@/features/results/context/student-results-context';
import { formatDuration, paceTone } from '@/features/leaderboard/teacher-leaderboard-format';
import { boardForType, isTiedAt, toBoardRows, type Board, type BoardRow } from '@/features/leaderboard/board';
import { useClass } from '@/features/teacher/context/class-context';
import { analyticsApi, type ApiCategoryKey, type ApiPace } from '@/shared/api';
import CATEGORY_META from '@/shared/content/category-meta';
import { useLanguage, type TranslationKey } from '@/shared/i18n/language-context';
import { useRouter } from 'expo-router';
import { readableColumn } from '@/shared/theme/layout';

type GameType = 'quiz' | 'jigsaw';
type FilterKey = 'topic' | 'level';

/** The server's three paces read as the app's three (average → steady, slow/none → needs support). */
function mapPace(pace: ApiPace): LearnerPace {
  if (pace === 'fast') return 'fast';
  if (pace === 'average') return 'steady';
  return 'needs-support';
}
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
 * The same trophy badge the student leaderboard draws, tinted to the tier it
 * stands for. `null` (no trophy yet) draws a dash instead of leaving a hole
 * in the row.
 */
function TrophyGlyph({ trophy }: { trophy: Trophy }) {
  if (!trophy) return <Caption style={{ color: tokens.color.inkFaint }}>—</Caption>;
  return <TrophyBadge tier={trophy} size={20} />;
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
  const { getFilteredResults, clearResults } = useStudentResults();
  const { classId } = useClass();
  // Quiz and jigsaw are ranked separately and never mixed (Adjustment 3, item 8).
  const [gameType, setGameType] = useState<GameType>('quiz');
  const [category, setCategory] = useState<string | null>(null);
  const [level, setLevel] = useState<number | null>(null);
  const [showLegend, setShowLegend] = useState(false);
  const [openFilter, setOpenFilter] = useState<FilterKey | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [loaded, setLoaded] = useState<{ key: string; rows: BoardRow[]; board: Board } | null>(null);

  const filter: ResultFilter = useMemo(
    () => ({
      activityType: gameType,
      ...(category ? { category } : {}),
      ...(level ? { level } : {}),
    }),
    [category, gameType, level]
  );

  const scopedResults = useMemo(() => getFilteredResults(filter), [getFilteredResults, filter]);

  // The board is ranked by the server, the same one students and the admin web
  // see; the phone shows its order and ranks as they come.
  const requestKey = [classId, gameType, category, level, reloadKey].join('|');

  useEffect(() => {
    if (!classId) return;
    let cancelled = false;
    const requested = boardForType(gameType);
    analyticsApi
      .leaderboard(classId, {
        activityType: gameType,
        board: requested,
        ...(category ? { category: category as ApiCategoryKey } : {}),
        ...(level ? { level } : {}),
      })
      .then((res) => {
        if (!cancelled) setLoaded({ key: requestKey, rows: toBoardRows(res.items), board: res.board ?? requested });
      })
      .catch(() => {
        if (!cancelled) setLoaded({ key: requestKey, rows: [], board: requested });
      });
    return () => {
      cancelled = true;
    };
  }, [classId, gameType, category, level, requestKey]);

  const ready = !classId || loaded?.key === requestKey;
  const rows = ready && classId ? loaded?.rows ?? [] : [];
  const board: Board = loaded?.key === requestKey ? loaded.board : boardForType(gameType);

  // Average tries to pass is not on the board, so it is read from the same
  // canonical attempts the server ranks, per student.
  const triesByUid = useMemo(() => {
    const map = new Map<string, number | null>();
    const canonical = getCanonicalAttempts(scopedResults);
    for (const uid of new Set(canonical.map((r) => r.uid))) {
      map.set(uid, averageTriesToPass(canonical.filter((r) => r.uid === uid)));
    }
    return map;
  }, [scopedResults]);

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
          setReloadKey((k) => k + 1);
          Alert.alert(result.success ? t('clearSuccessTitle') : t('clearFailTitle'), result.message);
        },
      },
    ]);
  };

  const toggleFilter = (key: FilterKey) => setOpenFilter((v) => (v === key ? null : key));

  const topicMeta = category ? CATEGORY_META.find((c) => c.key === category) : undefined;
  const topicChipLabel = category ? (topicMeta ? t(topicMeta.labelKey) : category) : t('filterTopic');
  const levelChipLabel = level ? `${t('level')} ${level}` : t('filterLevel');

  const BOARD_OPTIONS: SegmentedOption<GameType>[] = [
    { value: 'quiz', label: t('boardPointsTab'), icon: 'star' },
    { value: 'jigsaw', label: t('boardTimeTab'), icon: 'clock' },
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
          <Segmented options={BOARD_OPTIONS} value={gameType} onChange={setGameType} tone="onDark" style={styles.sortSwitch} />
          <Caption style={styles.rankingRule}>
            {t(board === 'time' ? 'rankingRuleTime' : 'rankingRulePoints')}
          </Caption>

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
              <Caption style={styles.legendExplain}>{t('starsExplainHow')}</Caption>
            </Card>
          )}
        </ScreenHeader>

        <View style={[styles.body, readableColumn]}>
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
                      label={t(c.labelKey)}
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
          {ready && rows.length === 0 && <Body style={styles.emptyText}>{t('noResultsForFilter')}</Body>}

          <View style={styles.list}>
            {rows.map((s, i) => {
              const tone = paceTone(mapPace(s.pace));
              const tries = triesByUid.get(s.uid) ?? null;
              const tied = isTiedAt(rows, i);
              return (
                <TouchableOpacity
                  key={s.uid}
                  onPress={() =>
                    router.navigate({ pathname: '/student-summary', params: { studentName: s.studentName, uid: s.uid, board: gameType } })
                  }
                  accessibilityRole="button"
                >
                  <Card style={styles.row}>
                    <View style={styles.rankCircle}>
                      <Caption style={styles.rankText}>{tied ? `=${s.rank}` : s.rank}</Caption>
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
                        {[
                          t('statCompleted', { n: s.completed }),
                          s.failedAttempts === null ? null : t('statFailedTries', { failed: s.failedAttempts }),
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </Caption>
                      {tries !== null && (
                        <Caption style={styles.rowSubStat}>{t('avgTriesStat', { n: String(tries) })}</Caption>
                      )}
                    </View>
                    {/* The board's main measure first: points on a quiz board, average time on a jigsaw board. */}
                    <View style={styles.statsBlock}>
                      <H3 style={styles.pointsText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                        {board === 'time'
                          ? s.avgTimeSec === null
                            ? '—'
                            : t('statAvgTime', { avg: s.avgTimeSec })
                          : `${s.totalPoints} ${t('ptsSuffix')}`}
                      </H3>
                      <View style={styles.durationRow}>
                        <Icon name={board === 'time' ? 'star' : 'clock'} size={12} color={tokens.color.inkMuted} />
                        <Caption style={styles.durationText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                          {board === 'time'
                            ? `${s.totalPoints} ${t('ptsSuffix')}`
                            : `${formatDuration(s.totalTimeSec)} ${t('totalTimeSuffix')}`}
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
  rankingRule: { marginTop: tokens.space.sm, color: tokens.color.onDark, opacity: 0.85 },
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
  legendExplain: { color: tokens.color.inkMuted },
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
  paceBadgeText: { ...typeScale.tab },
  // Capped so the student's column keeps room for a whole word at the phone's
  // largest font; the points and time shrink to fit instead (evaluation 3.2).
  statsBlock: { alignItems: 'flex-end', gap: 2, flexShrink: 1, maxWidth: '35%' },
  pointsText: { color: tokens.color.ink },
  durationRow: { flexDirection: 'row', alignItems: 'center', gap: 3, flexShrink: 1 },
  durationText: { color: tokens.color.inkMuted, flexShrink: 1 },

  clearButton: { marginTop: tokens.space.sm },
});
