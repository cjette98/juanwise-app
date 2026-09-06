import React, { useMemo, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView, Modal } from 'react-native';
import {
  Screen,
  ScreenHeader,
  Card,
  Pill,
  Icon,
  StarRow,
  H2,
  H3,
  Display,
  Body,
  BodyStrong,
  Caption,
  type IconName,
} from '@/shared/components/ui';
import { tokens } from '@/shared/theme/tokens';
import { useStudentResults, TROPHY_TIERS, Trophy, COMBINED_MAX_POINTS, COMBINED_MAX_TIME_SECONDS, LearnerPace } from '@/features/results/context/student-results-context';
import { useUser } from '@/features/auth/context/user-context';
import { useRouter } from 'expo-router';

type SortMode = 'points' | 'speed';

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

const TROPHY_COLORS: Record<'gold' | 'silver' | 'bronze', string> = {
  gold: tokens.color.medalGold,
  silver: tokens.color.medalSilver,
  bronze: tokens.color.medalBronze,
};

function trophyIcon(trophy: Trophy, size = 16) {
  if (trophy === 'gold' || trophy === 'silver' || trophy === 'bronze') {
    return <Icon name="trophy" size={size} color={TROPHY_COLORS[trophy]} filled />;
  }
  return <Caption style={{ color: tokens.color.inkFaint }}>—</Caption>;
}

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

const PODIUM_HEIGHT: Record<1 | 2 | 3, number> = { 1: 108, 2: 84, 3: 66 };

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

  return (
    <Screen>
      <ScreenHeader
        title="Leaderboard"
        subtitle={`${leaderboard.length} estudyanteng may resulta`}
        color={tokens.color.navLeaderboard}
        onBack={() => router.back()}
        right={
          <TouchableOpacity style={styles.legendToggle} onPress={() => setShowLegend((v) => !v)}>
            <Pill label="Trophy Guide" icon="trophy" tone="translucent" />
          </TouchableOpacity>
        }
      >
        <View style={styles.sortRow}>
          <TouchableOpacity style={styles.sortChip} onPress={() => setSortMode('points')}>
            <Pill label="Puntos" icon="star" tone={sortMode === 'points' ? 'gold' : 'translucent'} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.sortChip} onPress={() => setSortMode('speed')}>
            <Pill label="Bilis" icon="clock" tone={sortMode === 'speed' ? 'gold' : 'translucent'} />
          </TouchableOpacity>
        </View>
      </ScreenHeader>

      <ScrollView contentContainerStyle={styles.scroll}>
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
            <View style={styles.legendRow}>
              <View style={styles.legendRowLabelWrap}>
                {trophyIcon('gold', 14)}
                <BodyStrong style={styles.legendRowLabel}>Gold</BodyStrong>
              </View>
              <View style={styles.legendPaceRow}>
                <Caption style={styles.legendRowDetail}>→</Caption>
                <Icon name={PACE_ICON.fast} size={13} color={tokens.color.inkMuted} />
                <Caption style={styles.legendRowDetail}>Mabilis Matuto</Caption>
              </View>
            </View>
            <View style={styles.legendRow}>
              <View style={styles.legendRowLabelWrap}>
                {trophyIcon('silver', 14)}
                <BodyStrong style={styles.legendRowLabel}>Silver</BodyStrong>
              </View>
              <View style={styles.legendPaceRow}>
                <Caption style={styles.legendRowDetail}>→</Caption>
                <Icon name={PACE_ICON.steady} size={13} color={tokens.color.inkMuted} />
                <Caption style={styles.legendRowDetail}>Sakto sa Bilis</Caption>
              </View>
            </View>
            <View style={styles.legendRow}>
              <View style={styles.legendRowLabelWrap}>
                {trophyIcon('bronze', 14)}
                <BodyStrong style={styles.legendRowLabel}>Bronze / Wala</BodyStrong>
              </View>
              <View style={styles.legendPaceRow}>
                <Caption style={styles.legendRowDetail}>→</Caption>
                <Icon name={PACE_ICON['needs-support']} size={13} color={tokens.color.inkMuted} />
                <Caption style={styles.legendRowDetail}>Kailangan ng Tulong</Caption>
              </View>
            </View>
            <View style={styles.legendFootRow}>
              <Icon name="star" size={13} color={tokens.color.gold} filled />
              <Caption style={styles.legendFootText}>Stars = average na bituin kada gawain</Caption>
            </View>
          </Card>
        )}

        {podiumEntries.length > 0 && (
          <View style={styles.podiumRow}>
            {podiumOrder.map((entry) => (
              <TouchableOpacity
                key={entry.studentName}
                style={styles.podiumColumn}
                onPress={() => handleRowPress(entry.studentName)}
              >
                <Icon name="trophy" size={20} color={TROPHY_COLORS[entry.rank === 1 ? 'gold' : entry.rank === 2 ? 'silver' : 'bronze']} filled />
                <BodyStrong numberOfLines={1} style={styles.podiumName}>
                  {entry.studentName}{entry.studentName === name ? ' (Ikaw)' : ''}
                </BodyStrong>
                <Caption style={styles.podiumPoints}>{entry.totalPoints} pts</Caption>
                <View
                  style={[
                    styles.podiumPlinth,
                    {
                      height: PODIUM_HEIGHT[entry.rank],
                      backgroundColor: TROPHY_COLORS[entry.rank === 1 ? 'gold' : entry.rank === 2 ? 'silver' : 'bronze'],
                    },
                  ]}
                >
                  <H2 style={styles.podiumRankNumber}>{entry.rank}</H2>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {mySummary && (
          <TouchableOpacity
            style={styles.myRankTouchable}
            onPress={() => router.navigate({ pathname: '/student-summary', params: { studentName: name } })}
          >
            <Card raised style={styles.myRankCard}>
              <Caption style={styles.myRankLabel}>Ranggo mo · Tap para sa buong record</Caption>
              <Display style={styles.myRankNumber}>#{myRank}</Display>
              <View style={styles.myRankRow}>
                <PacePill pace={mySummary.pace} />
                <Pill label={`${mySummary.totalPoints}/${COMBINED_MAX_POINTS} pts`} icon="star" tone="gold" />
              </View>
            </Card>
          </TouchableOpacity>
        )}

        {!ready && <Body style={styles.emptyText}>Naglo-load...</Body>}
        {ready && sorted.length === 0 && (
          <Body style={styles.emptyText}>Wala pang natatapos na gawain. Sagutan ang isang Quiz o Jigsaw Puzzle para lumabas dito.</Body>
        )}

        <View style={styles.list}>
          {sorted.map((s, i) => {
            const isMe = s.studentName === name;
            return (
              <TouchableOpacity key={s.studentName} style={styles.rowTouchable} onPress={() => handleRowPress(s.studentName)}>
                <Card raised={isMe} style={isMe ? [styles.row, styles.rowMine] : styles.row}>
                  <H3 style={styles.rank}>{i + 1}</H3>
                  <View style={styles.rowMain}>
                    <BodyStrong numberOfLines={1}>
                      {s.studentName}{isMe ? ' (Ikaw)' : ''}
                    </BodyStrong>
                    <Caption style={styles.rowSub}>{s.attempts} gawain natapos</Caption>
                    <View style={styles.rowPaceWrap}>
                      <PacePill pace={s.pace} />
                    </View>
                  </View>
                  <View style={styles.statsBlock}>
                    <View style={styles.statLineRow}>
                      {trophyIcon(s.trophy, 14)}
                      <BodyStrong style={styles.statLineText}>{s.totalPoints} pts</BodyStrong>
                    </View>
                    <View style={styles.statLineRow}>
                      <Icon name="clock" size={11} color={tokens.color.inkMuted} />
                      <Caption style={styles.statLineSmall}>{formatSeconds(s.totalTimeUsed)}</Caption>
                    </View>
                    <StarRow earned={Math.round(s.avgStars)} of={3} size={12} />
                  </View>
                </Card>
              </TouchableOpacity>
            );
          })}
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
              <H3 style={styles.peekName}>{peekStudent}</H3>
              {peekSummary && (
                <>
                  <View style={styles.peekPaceWrap}>
                    <PacePill pace={peekSummary.pace} />
                  </View>
                  <View style={styles.peekStatsRow}>
                    <View style={styles.statLineRow}>
                      {trophyIcon(peekSummary.trophy, 15)}
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

const styles = StyleSheet.create({
  legendToggle: { minHeight: tokens.hit.min, justifyContent: 'center' },
  sortRow: { flexDirection: 'row', gap: tokens.space.sm, marginTop: tokens.space.md },
  sortChip: { minHeight: tokens.hit.min, justifyContent: 'center', alignItems: 'flex-start' },
  scroll: { padding: tokens.space.lg, gap: tokens.space.md },
  legendCard: { gap: tokens.space.xs },
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
  podiumRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: tokens.space.sm },
  podiumColumn: { flex: 1, alignItems: 'center', gap: tokens.space.xs / 2, minHeight: tokens.hit.min },
  podiumName: { maxWidth: '100%' },
  podiumPoints: { color: tokens.color.inkMuted },
  podiumPlinth: {
    width: '100%',
    borderTopLeftRadius: tokens.radius.md,
    borderTopRightRadius: tokens.radius.md,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: tokens.space.sm,
  },
  podiumRankNumber: { color: tokens.color.ink },
  myRankTouchable: { minHeight: tokens.hit.min },
  myRankCard: { backgroundColor: tokens.color.primary, borderColor: tokens.color.primaryDark, alignItems: 'center' },
  myRankLabel: { color: tokens.color.onDarkMuted },
  myRankNumber: { color: tokens.color.onDark, marginVertical: tokens.space.xs / 2 },
  myRankRow: { flexDirection: 'row', gap: tokens.space.sm, marginTop: tokens.space.xs },
  emptyText: { textAlign: 'center', marginTop: tokens.space.xl, paddingHorizontal: tokens.space.sm },
  list: { gap: tokens.space.sm },
  rowTouchable: { minHeight: tokens.hit.min },
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm, padding: tokens.space.md },
  rowMine: { borderColor: tokens.color.primary },
  rank: { color: tokens.color.inkMuted, width: 26, textAlign: 'center' },
  rowMain: { flex: 1 },
  rowSub: { color: tokens.color.inkMuted, marginTop: 2 },
  rowPaceWrap: { alignSelf: 'flex-start', marginTop: tokens.space.xs },
  statsBlock: { alignItems: 'flex-end', gap: 2 },
  statLineRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statLineText: { color: tokens.color.ink },
  statLineSmall: { color: tokens.color.inkMuted },
  peekRoot: { flex: 1 },
  peekBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: tokens.color.ink, opacity: 0.55 },
  peekOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: tokens.space.xl },
  peekCard: { width: '100%', alignItems: 'center', borderColor: tokens.color.primary },
  peekName: { marginBottom: tokens.space.sm },
  peekPaceWrap: { marginBottom: tokens.space.sm },
  peekStatsRow: { flexDirection: 'row', gap: tokens.space.md, flexWrap: 'wrap', justifyContent: 'center' },
  peekStat: { color: tokens.color.ink },
  peekStarsWrap: { marginTop: tokens.space.sm },
  peekHint: { marginTop: tokens.space.md, color: tokens.color.inkMuted },
});
