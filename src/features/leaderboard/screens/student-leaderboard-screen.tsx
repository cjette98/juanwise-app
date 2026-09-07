import React, { useMemo, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView, Modal } from 'react-native';
import {
  Screen,
  ScreenHeader,
  Card,
  Pill,
  Icon,
  Avatar,
  MedalBadge,
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
import { beatsPercent } from '@/features/leaderboard/percentile';
import { useStudentResults, TROPHY_TIERS, Trophy, COMBINED_MAX_POINTS, COMBINED_MAX_TIME_SECONDS, LearnerPace } from '@/features/results/context/student-results-context';
import { useUser } from '@/features/auth/context/user-context';
import { useRouter } from 'expo-router';

type SortMode = 'points' | 'speed';

const SORT_OPTIONS: SegmentedOption<SortMode>[] = [
  { value: 'points', label: 'Puntos', icon: 'star' },
  { value: 'speed', label: 'Bilis', icon: 'clock' },
];

// Pace and trophy tier share the same three-way split (gold/silver/bronze),
// so the pace badge reuses the medal tokens instead of inventing a fourth
// palette — same colour family as before (warm gold / cool grey / warm
// bronze), now as tokens instead of the old bespoke hex triplet.
const PACE_META: Record<LearnerPace, { label: string; color: string }> = {
  fast: { label: 'Mabilis Matuto', color: tokens.color.medalGold },
  steady: { label: 'Sakto sa Bilis', color: tokens.color.medalSilver },
  'needs-support': { label: 'Kailangan ng Tulong', color: tokens.color.medalBronze },
};

const PACE_ICON: Record<LearnerPace, IconName> = {
  fast: 'bolt',
  steady: 'clock',
  'needs-support': 'lightbulb',
};

/**
 * The podium's medal colours are keyed on RANK, while a row's `MedalBadge` is
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
  const meta = PACE_META[pace];
  return (
    <Pill
      label={meta.label}
      icon={PACE_ICON[pace]}
      tone="neutral"
      style={{ backgroundColor: meta.color, borderColor: 'transparent' }}
    />
  );
}

/**
 * The trophy, spoken. `MedalBadge` is decorative, so the row that contains it
 * is what has to say which trophy — otherwise the badge is invisible to a
 * screen reader.
 */
function trophyLabel(trophy: Trophy): string {
  if (!trophy) return 'walang trophy';
  return `${trophy} trophy`;
}

/** `null` renders the dash the legend needs for "no trophy yet". */
function LegendMedal({ tier }: { tier: Trophy }) {
  if (!tier) return <Caption style={{ color: tokens.color.inkFaint }}>—</Caption>;
  return <MedalBadge tier={tier} size={18} />;
}

const PODIUM_HEIGHT: Record<1 | 2 | 3, number> = { 1: 108, 2: 84, 3: 66 };
const PODIUM_AVATAR: Record<1 | 2 | 3, number> = { 1: 64, 2: 52, 3: 52 };

export default function StudentLeaderboardScreen() {
  const router = useRouter();
  const { name } = useUser();
  const { leaderboard, ready } = useStudentResults();
  const [sortMode, setSortMode] = useState<SortMode>('points');
  const [peekStudent, setPeekStudent] = useState<string | null>(null);
  const [showLegend, setShowLegend] = useState(false);

  const sorted = useMemo(() => {
    const list = [...leaderboard];
    if (sortMode === 'points') list.sort((a, b) => b.totalPoints - a.totalPoints);
    // 'speed' is already sorted fastest-average-time-first from the context
    return list;
  }, [leaderboard, sortMode]);

  const myRankIndex = sorted.findIndex((s) => s.studentName === name);
  const myRank = myRankIndex >= 0 ? myRankIndex + 1 : null;
  const mySummary = myRankIndex >= 0 ? sorted[myRankIndex] : null;
  const beats = myRank === null ? null : beatsPercent(myRank, sorted.length);

  const peekSummary = peekStudent ? sorted.find((s) => s.studentName === peekStudent) || null : null;

  const handleRowPress = (studentName: string) => {
    if (studentName === name) {
      router.navigate({ pathname: '/student-summary', params: { studentName } });
    } else {
      setPeekStudent(studentName);
    }
  };

  // Podium is purely a visual read of the first three entries of `sorted` —
  // whatever mode is active. Never padded: fewer than three real entries
  // means fewer than three columns.
  const podiumEntries = sorted.slice(0, 3).map((s, i) => ({ ...s, rank: (i + 1) as 1 | 2 | 3 }));
  const podiumOrder = [podiumEntries[1], podiumEntries[0], podiumEntries[2]].filter(
    (e): e is (typeof podiumEntries)[number] => !!e
  );

  // The sheet picks up where the podium leaves off, so nobody is drawn twice.
  const listEntries = sorted.slice(podiumEntries.length);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          title="Leaderboard"
          subtitle={`${leaderboard.length} estudyanteng may resulta`}
          color={tokens.color.navLeaderboard}
          onBack={() => router.back()}
          right={
            <TouchableOpacity
              style={styles.legendToggle}
              onPress={() => setShowLegend((v) => !v)}
              accessibilityRole="button"
              accessibilityState={{ expanded: showLegend }}
            >
              <Pill label="Trophy Guide" icon="trophy" tone="translucent" />
            </TouchableOpacity>
          }
        >
          <Segmented
            options={SORT_OPTIONS}
            value={sortMode}
            onChange={setSortMode}
            tone="onDark"
            style={styles.sortSwitch}
          />

          {showLegend && (
            <Card style={styles.legendCard}>
              <BodyStrong style={styles.legendTitle}>Paano makakuha ng Trophy (Combined Quiz & Jigsaw)</BodyStrong>
              {TROPHY_TIERS.map((t) => (
                <View key={t.trophy} style={styles.legendRow}>
                  <Caption style={styles.legendRowDetailStrong}>{t.label}</Caption>
                  <Caption style={styles.legendRowDetail}>{t.minPoints}+ pts · {t.timeLabel}</Caption>
                </View>
              ))}
              <Caption style={styles.legendFoot}>
                Max posible: {COMBINED_MAX_POINTS} pts sa {COMBINED_MAX_TIME_SECONDS.toLocaleString()} sec (Quiz + Jigsaw, lahat ng level)
              </Caption>

              <View style={styles.legendDivider} />
              {(['gold', 'silver', 'bronze'] as const).map((tier) => (
                <View key={tier} style={styles.legendRow}>
                  <View style={styles.legendRowLabelWrap}>
                    <LegendMedal tier={tier} />
                    <BodyStrong style={styles.legendRowLabel}>
                      {tier === 'gold' ? 'Gold' : tier === 'silver' ? 'Silver' : 'Bronze / Wala'}
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
                      {PACE_META[tier === 'gold' ? 'fast' : tier === 'silver' ? 'steady' : 'needs-support'].label}
                    </Caption>
                  </View>
                </View>
              ))}
              <View style={styles.legendFootRow}>
                <Icon name="star" size={13} color={tokens.color.gold} filled />
                <Caption style={styles.legendFootText}>Stars = average na bituin kada gawain</Caption>
              </View>
            </Card>
          )}

          {mySummary && (
            <TouchableOpacity
              style={styles.bannerTouchable}
              onPress={() => router.navigate({ pathname: '/student-summary', params: { studentName: name } })}
              accessibilityRole="button"
              accessibilityLabel={`Ranggo mo: pang-${myRank}. Tap para sa buong record.`}
            >
              <View style={styles.banner}>
                <View style={styles.bannerRankChip}>
                  <H2 style={styles.bannerRankText}>#{myRank}</H2>
                </View>
                <View style={styles.bannerCopy}>
                  <BodyStrong style={styles.bannerHeadline}>
                    {beats === null
                      ? 'Ikaw pa lang ang may resulta sa ngayon!'
                      : `Mas magaling ka kaysa sa ${beats}% ng ibang mag-aaral!`}
                  </BodyStrong>
                  <Caption style={styles.bannerSub}>Tap para sa buong record mo</Caption>
                </View>
              </View>
            </TouchableOpacity>
          )}

          {podiumEntries.length > 0 && (
            <View style={styles.podiumRow}>
              {podiumOrder.map((entry) => (
                <TouchableOpacity
                  key={entry.studentName}
                  style={styles.podiumColumn}
                  onPress={() => handleRowPress(entry.studentName)}
                  accessibilityRole="button"
                  accessibilityLabel={`Pang-${entry.rank}: ${entry.studentName}, ${entry.totalPoints} puntos, ${trophyLabel(entry.trophy)}`}
                >
                  <View style={styles.podiumAvatarWrap}>
                    <Avatar
                      name={entry.studentName}
                      size={PODIUM_AVATAR[entry.rank]}
                      ring={RANK_COLOR[entry.rank]}
                      ringWidth={3}
                    />
                    <MedalBadge tier={entry.trophy} size={26} style={styles.podiumBadge} />
                  </View>
                  <BodyStrong numberOfLines={1} style={styles.podiumName}>
                    {entry.studentName}{entry.studentName === name ? ' (Ikaw)' : ''}
                  </BodyStrong>
                  <Pill label={`${entry.totalPoints} pts`} tone="translucent" style={styles.podiumPoints} />
                  <View
                    style={[
                      styles.podiumPlinth,
                      {
                        height: PODIUM_HEIGHT[entry.rank],
                        backgroundColor: entry.rank === 1 ? tokens.color.onDarkChip : tokens.color.onDarkFill,
                        borderTopColor: RANK_COLOR[entry.rank],
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

          {!ready && <Body style={styles.emptyText}>Naglo-load...</Body>}
          {ready && sorted.length === 0 && (
            <Body style={styles.emptyText}>Wala pang natatapos na gawain. Sagutan ang isang Quiz o Jigsaw Puzzle para lumabas dito.</Body>
          )}
          {ready && sorted.length > 0 && listEntries.length === 0 && (
            <Caption style={styles.sheetHint}>Nasa podium na ang lahat ng may resulta.</Caption>
          )}

          <View style={styles.list}>
            {listEntries.map((s, i) => {
              const isMe = s.studentName === name;
              const rank = podiumEntries.length + i + 1;
              return (
                <TouchableOpacity
                  key={s.studentName}
                  style={styles.rowTouchable}
                  onPress={() => handleRowPress(s.studentName)}
                  accessibilityRole="button"
                  accessibilityLabel={`Pang-${rank}: ${s.studentName}, ${s.totalPoints} puntos, ${trophyLabel(s.trophy)}, ${PACE_META[s.pace].label}`}
                >
                  <Card raised={isMe} style={isMe ? [styles.row, styles.rowMine] : styles.row}>
                    <View style={styles.rankCircle}>
                      <Caption style={styles.rankText}>{rank}</Caption>
                    </View>
                    <Avatar name={s.studentName} size={44} />
                    <View style={styles.rowMain}>
                      <BodyStrong numberOfLines={1}>
                        {s.studentName}{isMe ? ' (Ikaw)' : ''}
                      </BodyStrong>
                      <Caption style={styles.rowStats} numberOfLines={1}>
                        {s.totalPoints} pts · {formatSeconds(s.totalTimeUsed)} · {s.attempts} gawain
                      </Caption>
                      <View style={styles.rowMetaRow}>
                        <PacePill pace={s.pace} />
                        <StarRow earned={Math.round(s.avgStars)} of={3} size={12} />
                      </View>
                    </View>
                    <MedalBadge tier={s.trophy} size={30} />
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
      <Modal visible={!!peekStudent} transparent animationType="fade" onRequestClose={() => setPeekStudent(null)}>
        <View style={styles.peekRoot}>
          <View style={styles.peekBackdrop} />
          <TouchableOpacity style={styles.peekOverlay} activeOpacity={1} onPress={() => setPeekStudent(null)}>
            <Card style={styles.peekCard}>
              {!!peekStudent && <Avatar name={peekStudent} size={64} style={styles.peekAvatar} />}
              <H3 style={styles.peekName}>{peekStudent}</H3>
              {peekSummary && (
                <>
                  <View style={styles.peekPaceWrap}>
                    <PacePill pace={peekSummary.pace} />
                  </View>
                  <View style={styles.peekStatsRow}>
                    <View style={styles.statLineRow}>
                      <LegendMedal tier={peekSummary.trophy} />
                      <BodyStrong style={styles.peekStat}>Trophy</BodyStrong>
                    </View>
                    <BodyStrong style={styles.peekStat}>{peekSummary.totalPoints} pts</BodyStrong>
                    <View style={styles.statLineRow}>
                      <Icon name="clock" size={13} color={tokens.color.inkMuted} />
                      <BodyStrong style={styles.peekStat}>{formatSeconds(peekSummary.totalTimeUsed)}</BodyStrong>
                    </View>
                  </View>
                  <View style={styles.peekStarsWrap}>
                    <StarRow earned={Math.round(peekSummary.avgStars)} of={3} size={16} />
                  </View>
                </>
              )}
              <Caption style={styles.peekHint}>Tap kahit saan para isara</Caption>
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
