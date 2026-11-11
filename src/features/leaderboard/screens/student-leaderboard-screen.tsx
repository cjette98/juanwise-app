import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView, Modal } from 'react-native';
import {
  Screen,
  ScreenHeader,
  Card,
  Pill,
  Icon,
  Avatar,
  TrophyBadge,
  Segmented,
  StarRow,
  H2,
  H3,
  Body,
  BodyStrong,
  Caption,
  type IconName,
  type SegmentedOption,
} from '@/shared/components/ui';
import { tokens } from '@/shared/theme/tokens';
import { useLanguage, type TranslationKey } from '@/shared/i18n/language-context';
import { beatsPercent } from '@/features/leaderboard/percentile';
import { boardForType, findMine, isTiedAt, toBoardRows, type Board, type BoardRow } from '@/features/leaderboard/board';
import {
  TROPHY_TIERS,
  Trophy,
  COMBINED_MAX_POINTS,
  COMBINED_MAX_TIME_SECONDS,
  LearnerPace,
} from '@/features/results/context/student-results-context';
import { useUser } from '@/features/auth/context/user-context';
import { useClass } from '@/features/teacher/context/class-context';
import { analyticsApi, type ApiTrophy, type ApiPace } from '@/shared/api';
import { useRouter } from 'expo-router';

function mapTrophy(trophy: ApiTrophy): Trophy {
  return trophy === 'none' ? null : trophy;
}

// The backend derives pace from the same trophy tiers (gold→fast,
// silver→average, bronze/none→slow/none); the local UI only distinguishes
// three tiers, so average/slow/none all read as "needs support".
function mapPace(pace: ApiPace): LearnerPace {
  if (pace === 'fast') return 'fast';
  if (pace === 'average') return 'steady';
  return 'needs-support';
}

type GameType = 'quiz' | 'jigsaw';

// Quiz and jigsaw are ranked separately and never mixed (Adjustment 3, item 8):
// a quiz board by points, a jigsaw board by average time.
const BOARD_OPTION_KEYS: { value: GameType; labelKey: TranslationKey; icon: 'star' | 'clock' }[] = [
  { value: 'quiz', labelKey: 'boardPointsTab', icon: 'star' },
  { value: 'jigsaw', labelKey: 'boardTimeTab', icon: 'clock' },
];

/** The row's numbers, its board's main measure first. */
function useStatsLine() {
  const { t } = useLanguage();
  return (row: BoardRow, board: Board): string => {
    const points = t('statPointsShort', { points: row.totalPoints });
    const failed = row.failedAttempts === null ? null : t('statFailedTries', { failed: row.failedAttempts });
    const parts =
      board === 'time'
        ? [row.avgTimeSec === null ? '—' : t('statAvgTime', { avg: row.avgTimeSec }), points, failed]
        : [points, formatSeconds(row.totalTimeSec), failed];
    return parts.filter(Boolean).join(' · ');
  };
}

/** The tier's own name, so the legend never renders `TROPHY_TIERS.label` (emoji + English). */
const TIER_NAME_KEY: Record<'gold' | 'silver' | 'bronze', TranslationKey> = {
  gold: 'medalGold',
  silver: 'medalSilver',
  bronze: 'medalBronze',
};

// Pace and trophy tier share the same three-way split (gold/silver/bronze),
// so the pace badge reuses the medal tokens instead of inventing a fourth
// palette — same colour family as before (warm gold / cool grey / warm
// bronze), now as tokens instead of the old bespoke hex triplet.
const PACE_META: Record<LearnerPace, { labelKey: TranslationKey; color: string }> = {
  fast: { labelKey: 'paceFast', color: tokens.color.medalGold },
  steady: { labelKey: 'paceSteady', color: tokens.color.medalSilver },
  'needs-support': { labelKey: 'paceNeedsSupport', color: tokens.color.medalBronze },
};

const PACE_ICON: Record<LearnerPace, IconName> = {
  fast: 'bolt',
  steady: 'clock',
  'needs-support': 'lightbulb',
};

/**
 * The podium's medal colours are keyed on RANK, while a row's `TrophyBadge` is
 * keyed on the student's actual `trophy`. They are genuinely different facts:
 * trophies come from absolute points-and-time thresholds, so the second-place
 * student on a weak board may hold no trophy at all. The podium says "you came
 * second"; the badge says "you earned silver".
 */
const RANK_COLOR: Record<1 | 2 | 3, string> = {
  1: tokens.color.medalGold,
  2: tokens.color.medalSilver,
  3: tokens.color.medalBronze,
};

function formatSeconds(total: number) {
  const s = Math.max(0, Math.round(total));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${mm}m ${ss.toString().padStart(2, '0')}s`;
}

function PacePill({ pace }: { pace: LearnerPace }) {
  const { t } = useLanguage();
  const meta = PACE_META[pace];
  return (
    <Pill
      label={t(meta.labelKey)}
      icon={PACE_ICON[pace]}
      tone="neutral"
      style={{ backgroundColor: meta.color, borderColor: 'transparent' }}
    />
  );
}

/**
 * The trophy, spoken. `TrophyBadge` is decorative, so the row that contains it
 * is what has to say which trophy — otherwise the badge is invisible to a
 * screen reader.
 */
function useTrophyLabel() {
  const { t } = useLanguage();
  return (trophy: Trophy): string =>
    trophy ? t('trophyOfTier', { tier: t(TIER_NAME_KEY[trophy]) }) : t('noTrophyLabel');
}

/** `null` renders the dash the legend needs for "no trophy yet". */
function LegendTrophy({ tier }: { tier: Trophy }) {
  if (!tier) return <Caption style={{ color: tokens.color.inkFaint }}>—</Caption>;
  return <TrophyBadge tier={tier} size={18} />;
}

/** Podium colours follow the rank, so two players tied for first both get gold. */
function rankColor(rank: number): string {
  return RANK_COLOR[Math.min(3, Math.max(1, rank)) as 1 | 2 | 3];
}

const PODIUM_HEIGHT: Record<1 | 2 | 3, number> = { 1: 108, 2: 84, 3: 66 };
const PODIUM_AVATAR: Record<1 | 2 | 3, number> = { 1: 64, 2: 52, 3: 52 };

export default function StudentLeaderboardScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const trophyLabel = useTrophyLabel();
  const paceLabel = (pace: LearnerPace) => t(PACE_META[pace].labelKey);
  const statsLine = useStatsLine();
  const { uid } = useUser();
  const { classId, ready: classReady } = useClass();
  const [rows, setRows] = useState<BoardRow[]>([]);
  const [board, setBoard] = useState<Board>('points');
  const [ready, setReady] = useState(false);
  const [gameType, setGameType] = useState<GameType>('quiz');
  const [peekUid, setPeekUid] = useState<string | null>(null);
  const [showLegend, setShowLegend] = useState(false);

  useEffect(() => {
    if (!classReady) return;
    let cancelled = false;
    (async () => {
      if (!classId) {
        if (!cancelled) {
          setRows([]);
          setReady(true);
        }
        return;
      }
      setReady(false);
      try {
        const requested = boardForType(gameType);
        const res = await analyticsApi.leaderboard(classId, { activityType: gameType, board: requested });
        if (cancelled) return;
        // Shown in the server's order with the server's ranks; never re-sorted here.
        setRows(toBoardRows(res.items));
        setBoard(res.board ?? requested);
      } catch {
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [classId, classReady, gameType]);

  const boardOptions: SegmentedOption<GameType>[] = BOARD_OPTION_KEYS.map((o) => ({
    value: o.value,
    label: t(o.labelKey),
    icon: o.icon,
  }));

  const mySummary = findMine(rows, uid);
  const myRank = mySummary?.rank ?? null;
  const beats = myRank === null ? null : beatsPercent(myRank, rows.length);

  const peekSummary = peekUid ? rows.find((s) => s.uid === peekUid) || null : null;

  const openSummary = (row: BoardRow) =>
    router.navigate({ pathname: '/student-summary', params: { studentName: row.studentName, uid: row.uid, board: gameType } });

  const handleRowPress = (row: BoardRow) => {
    if (row.uid === uid) openSummary(row);
    else setPeekUid(row.uid);
  };

  // The podium is the first three rows in the server's order. Plinth height
  // follows position; the number on it is the server's rank, so tied players
  // show the same number. Never padded: fewer than three rows, fewer columns.
  const podiumEntries = rows.slice(0, 3).map((s, i) => ({
    ...s,
    position: (i + 1) as 1 | 2 | 3,
    tied: isTiedAt(rows, i),
  }));
  const podiumOrder = [podiumEntries[1], podiumEntries[0], podiumEntries[2]].filter(
    (e): e is (typeof podiumEntries)[number] => !!e
  );

  // The sheet picks up where the podium leaves off, so nobody is drawn twice.
  const listEntries = rows.slice(podiumEntries.length);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          title={t('leaderboard')}
          subtitle={t('leaderboardSubtitle', { count: rows.length })}
          color={tokens.color.navLeaderboard}
          onBack={() => router.back()}
          right={
            <TouchableOpacity
              style={styles.legendToggle}
              onPress={() => setShowLegend((v) => !v)}
              accessibilityRole="button"
              accessibilityState={{ expanded: showLegend }}
            >
              <Pill label={t('trophyGuide')} icon="trophy" tone="translucent" />
            </TouchableOpacity>
          }
        >
          <Segmented
            options={boardOptions}
            value={gameType}
            onChange={setGameType}
            tone="onDark"
            style={styles.sortSwitch}
          />
          <Caption style={styles.rankingRule}>
            {t(board === 'time' ? 'rankingRuleTime' : 'rankingRulePoints')}
          </Caption>

          {showLegend && (
            <Card style={styles.legendCard}>
              <BodyStrong style={styles.legendTitle}>{t('trophyGuideIntroNoFilter')}</BodyStrong>
              {TROPHY_TIERS.map((tier) => (
                <View key={tier.trophy} style={styles.legendRow}>
                  <Caption style={styles.legendRowDetailStrong}>{t(TIER_NAME_KEY[tier.trophy])}</Caption>
                  <Caption style={styles.legendRowDetail}>
                    {t('legendPointsTimeLabel', { points: tier.minPoints, time: tier.timeLabel })}
                  </Caption>
                </View>
              ))}
              <Caption style={styles.legendFoot}>
                {t('legendMaxPossible', {
                  points: COMBINED_MAX_POINTS,
                  seconds: COMBINED_MAX_TIME_SECONDS.toLocaleString(),
                })}
              </Caption>

              <View style={styles.legendDivider} />
              {(['gold', 'silver', 'bronze'] as const).map((tier) => (
                <View key={tier} style={styles.legendRow}>
                  <View style={styles.legendRowLabelWrap}>
                    <LegendTrophy tier={tier} />
                    <BodyStrong style={styles.legendRowLabel}>
                      {tier === 'bronze' ? t('legendBronzeOrNone') : t(TIER_NAME_KEY[tier])}
                    </BodyStrong>
                  </View>
                  <View style={styles.legendPaceRow}>
                    <Caption style={styles.legendRowDetail}>→</Caption>
                    <Icon
                      name={PACE_ICON[tier === 'gold' ? 'fast' : tier === 'silver' ? 'steady' : 'needs-support']}
                      size={13}
                      color={tokens.color.inkMuted}
                    />
                    <Caption style={styles.legendRowDetail}>
                      {paceLabel(tier === 'gold' ? 'fast' : tier === 'silver' ? 'steady' : 'needs-support')}
                    </Caption>
                  </View>
                </View>
              ))}
              <View style={styles.legendFootRow}>
                <Icon name="star" size={13} color={tokens.color.gold} filled />
                <Caption style={styles.legendFootText}>{t('starsExplainShort')}</Caption>
              </View>
            </Card>
          )}

          {mySummary && (
            <TouchableOpacity
              style={styles.bannerTouchable}
              onPress={() => openSummary(mySummary)}
              accessibilityRole="button"
              accessibilityLabel={t('myRankLine', { rank: myRank ?? 0 })}
            >
              <View style={styles.banner}>
                <View style={styles.bannerRankChip}>
                  <H2 style={styles.bannerRankText}>#{myRank}</H2>
                </View>
                <View style={styles.bannerCopy}>
                  <BodyStrong style={styles.bannerHeadline}>
                    {beats === null ? t('onlyOneWithResults') : t('beatsPercent', { pct: beats })}
                  </BodyStrong>
                  <Caption style={styles.bannerSub}>{t('tapForFullRecord')}</Caption>
                </View>
              </View>
            </TouchableOpacity>
          )}

          {podiumEntries.length > 0 && (
            <View style={styles.podiumRow}>
              {podiumOrder.map((entry) => (
                <TouchableOpacity
                  key={entry.uid}
                  style={styles.podiumColumn}
                  onPress={() => handleRowPress(entry)}
                  accessibilityRole="button"
                  accessibilityLabel={t('rankEntryA11y', {
                    rank: entry.rank,
                    name: entry.studentName,
                    points: entry.totalPoints,
                    trophy: trophyLabel(mapTrophy(entry.trophy)),
                  })}
                >
                  <View style={styles.podiumAvatarWrap}>
                    <Avatar
                      name={entry.studentName}
                      size={PODIUM_AVATAR[entry.position]}
                      ring={rankColor(entry.rank)}
                      ringWidth={3}
                    />
                    <TrophyBadge tier={mapTrophy(entry.trophy)} size={26} style={styles.podiumBadge} />
                  </View>
                  <BodyStrong numberOfLines={1} style={styles.podiumName}>
                    {entry.studentName}{entry.uid === uid ? t('youSuffix') : ''}
                  </BodyStrong>
                  {/* Each of the top three shows their own points (client, item 1). */}
                  <Pill label={t('pointsSuffixShort', { points: entry.totalPoints })} tone="translucent" style={styles.podiumPoints} />
                  {board === 'time' && entry.avgTimeSec !== null && (
                    <Caption style={styles.podiumMeasure}>{t('statAvgTime', { avg: entry.avgTimeSec })}</Caption>
                  )}
                  {entry.tied && <Caption style={styles.podiumMeasure}>{t('tiedLabel')}</Caption>}
                  <View
                    style={[
                      styles.podiumPlinth,
                      {
                        height: PODIUM_HEIGHT[entry.position],
                        backgroundColor: entry.rank === 1 ? tokens.color.onDarkChip : tokens.color.onDarkFill,
                        borderTopColor: rankColor(entry.rank),
                      },
                    ]}
                  >
                    <H2 style={styles.podiumRankNumber}>{entry.rank}</H2>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScreenHeader>

        {/* The sheet: the cream body rising over the coloured hero, exactly as
            far as the header's corner radius, so the two shapes interlock. */}
        <View style={styles.sheet}>
          <View style={styles.sheetNotch} />

          {!ready && <Body style={styles.emptyText}>{t('loading')}</Body>}
          {ready && rows.length === 0 && (
            <Body style={styles.emptyText}>{t('noActivityYetStudent')}</Body>
          )}
          {ready && rows.length > 0 && listEntries.length === 0 && (
            <Caption style={styles.sheetHint}>{t('allOnPodium')}</Caption>
          )}

          <View style={styles.list}>
            {listEntries.map((s, i) => {
              const isMe = s.uid === uid;
              const { rank } = s;
              const tied = isTiedAt(rows, podiumEntries.length + i);
              const trophy = mapTrophy(s.trophy);
              const pace = mapPace(s.pace);
              return (
                <TouchableOpacity
                  key={s.uid}
                  style={styles.rowTouchable}
                  onPress={() => handleRowPress(s)}
                  accessibilityRole="button"
                  accessibilityLabel={t('rankEntryPaceA11y', {
                    rank,
                    name: s.studentName,
                    points: s.totalPoints,
                    trophy: trophyLabel(trophy),
                    pace: paceLabel(pace),
                  })}
                >
                  <Card raised={isMe} style={isMe ? [styles.row, styles.rowMine] : styles.row}>
                    <View style={styles.rankCircle}>
                      <Caption style={styles.rankText}>{tied ? `=${rank}` : rank}</Caption>
                    </View>
                    <Avatar name={s.studentName} size={44} />
                    <View style={styles.rowMain}>
                      <BodyStrong numberOfLines={1}>
                        {s.studentName}{isMe ? t('youSuffix') : ''}
                      </BodyStrong>
                      <Caption style={styles.rowStats} numberOfLines={1}>
                        {statsLine(s, board)}
                      </Caption>
                      <View style={styles.rowMetaRow}>
                        <PacePill pace={pace} />
                        <StarRow earned={Math.round(s.avgStars)} of={3} size={12} />
                      </View>
                    </View>
                    <TrophyBadge tier={trophy} size={30} />
                  </Card>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Quick public peek — points & time are visible to everyone, same as
          the leaderboard row itself. The full per-category/level breakdown
          is only reachable by tapping your OWN row (see handleRowPress). */}
      <Modal visible={!!peekSummary} transparent animationType="fade" onRequestClose={() => setPeekUid(null)}>
        <View style={styles.peekRoot}>
          <View style={styles.peekBackdrop} />
          <TouchableOpacity style={styles.peekOverlay} activeOpacity={1} onPress={() => setPeekUid(null)}>
            <Card style={styles.peekCard}>
              {!!peekSummary && <Avatar name={peekSummary.studentName} size={64} style={styles.peekAvatar} />}
              <H3 style={styles.peekName}>{peekSummary?.studentName}</H3>
              {peekSummary && (
                <>
                  <View style={styles.peekPaceWrap}>
                    <PacePill pace={mapPace(peekSummary.pace)} />
                  </View>
                  <View style={styles.peekStatsRow}>
                    <View style={styles.statLineRow}>
                      <LegendTrophy tier={mapTrophy(peekSummary.trophy)} />
                      <BodyStrong style={styles.peekStat}>{t('trophyWord')}</BodyStrong>
                    </View>
                    <View style={styles.statLineRow}>
                      <Icon name="clock" size={13} color={tokens.color.inkMuted} />
                      <BodyStrong style={styles.peekStat}>{statsLine(peekSummary, board)}</BodyStrong>
                    </View>
                  </View>
                  <View style={styles.peekStarsWrap}>
                    <StarRow earned={Math.round(peekSummary.avgStars)} of={3} size={16} />
                  </View>
                </>
              )}
              <Caption style={styles.peekHint}>{t('tapAnywhereToClose')}</Caption>
            </Card>
          </TouchableOpacity>
        </View>
      </Modal>
    </Screen>
  );
}

const SHEET_OVERLAP = tokens.radius.card;

const styles = StyleSheet.create({
  scroll: { paddingBottom: tokens.space.xxl },
  legendToggle: { minHeight: tokens.hit.min, justifyContent: 'center' },
  sortSwitch: { marginTop: tokens.space.md },
  rankingRule: { marginTop: tokens.space.sm, color: tokens.color.onDark, opacity: 0.85 },

  legendCard: { gap: tokens.space.xs, marginTop: tokens.space.md },
  legendTitle: { marginBottom: tokens.space.xs },
  legendRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: tokens.space.xs / 2 },
  legendRowLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.xs },
  legendRowLabel: { color: tokens.color.ink },
  legendRowDetail: { color: tokens.color.inkMuted, fontFamily: tokens.font.bodyBold },
  legendRowDetailStrong: { color: tokens.color.ink, fontFamily: tokens.font.bodyBold },
  legendPaceRow: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.xs / 2 },
  legendFoot: { marginTop: tokens.space.xs, fontStyle: 'italic' },
  legendFootRow: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.xs / 2, marginTop: tokens.space.xs },
  legendFootText: { fontStyle: 'italic' },
  legendDivider: { height: 1, backgroundColor: tokens.color.divider, marginVertical: tokens.space.sm },

  bannerTouchable: { minHeight: tokens.hit.min, marginTop: tokens.space.md },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.md,
    backgroundColor: tokens.color.goldSoft,
    borderRadius: tokens.radius.lg,
    padding: tokens.space.sm,
  },
  bannerRankChip: {
    minWidth: 54,
    height: 54,
    paddingHorizontal: tokens.space.sm,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.color.points,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerRankText: { color: tokens.color.onDark },
  bannerCopy: { flex: 1, gap: 1 },
  bannerHeadline: { color: tokens.color.ink },
  bannerSub: { color: tokens.color.inkMuted },

  podiumRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: tokens.space.sm, marginTop: tokens.space.lg },
  podiumColumn: { flex: 1, alignItems: 'center', gap: tokens.space.xs, minHeight: tokens.hit.min },
  podiumAvatarWrap: { alignItems: 'center', marginBottom: tokens.space.xs / 2 },
  podiumBadge: { position: 'absolute', top: -14 },
  podiumName: { maxWidth: '100%', color: tokens.color.onDark },
  podiumPoints: { paddingHorizontal: tokens.space.sm, paddingVertical: 5 },
  podiumMeasure: { color: tokens.color.onDark, opacity: 0.85 },
  podiumPlinth: {
    width: '100%',
    marginTop: tokens.space.xs,
    borderTopLeftRadius: tokens.radius.md,
    borderTopRightRadius: tokens.radius.md,
    borderTopWidth: 3,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: tokens.space.sm,
  },
  podiumRankNumber: { color: tokens.color.onDark },

  sheet: {
    backgroundColor: tokens.color.canvas,
    borderTopLeftRadius: tokens.radius.sheet,
    borderTopRightRadius: tokens.radius.sheet,
    marginTop: -SHEET_OVERLAP,
    paddingHorizontal: tokens.space.lg,
    paddingTop: tokens.space.sm,
    paddingBottom: tokens.space.lg,
    minHeight: 220,
  },
  sheetNotch: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.color.borderStrong,
    marginBottom: tokens.space.md,
  },
  sheetHint: { textAlign: 'center', marginTop: tokens.space.md, fontStyle: 'italic' },
  emptyText: { textAlign: 'center', marginTop: tokens.space.xl, paddingHorizontal: tokens.space.sm },

  list: { gap: tokens.space.sm },
  rowTouchable: { minHeight: tokens.hit.min },
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm, padding: tokens.space.md },
  rowMine: { borderColor: tokens.color.primary },
  rankCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: tokens.color.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: { color: tokens.color.inkMuted, fontFamily: tokens.font.bodyBold },
  rowMain: { flex: 1, gap: 2 },
  rowStats: { color: tokens.color.inkMuted },
  rowMetaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: tokens.space.xs, marginTop: tokens.space.xs / 2 },

  statLineRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  peekRoot: { flex: 1 },
  peekBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: tokens.color.ink, opacity: 0.55 },
  peekOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: tokens.space.xl },
  peekCard: { width: '100%', alignItems: 'center', borderColor: tokens.color.primary },
  peekAvatar: { marginBottom: tokens.space.sm },
  peekName: { marginBottom: tokens.space.sm },
  peekPaceWrap: { marginBottom: tokens.space.sm },
  peekStatsRow: { flexDirection: 'row', gap: tokens.space.md, flexWrap: 'wrap', justifyContent: 'center' },
  peekStat: { color: tokens.color.ink },
  peekStarsWrap: { marginTop: tokens.space.sm },
  peekHint: { marginTop: tokens.space.md, color: tokens.color.inkMuted },
});
