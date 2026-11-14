import React, { useMemo, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import {
  Screen,
  ScreenHeader,
  Card,
  Icon,
  Pill,
  StarRow,
  ProgressBar,
  Body,
  BodyStrong,
  Caption,
  type IconName,
  MedalBadge,
  TrophyBadge,
} from '@/shared/components/ui';
import { tokens, categoryColor } from '@/shared/theme/tokens';
import { useStudentResults, ActivityResult, activitySlots, getCanonicalAttempts, isPass, netPoints, totalsFor, triesAt, TROPHY_TIERS, Trophy, COMBINED_MAX_POINTS } from '@/features/results/context/student-results-context';
import { CATEGORY_META } from '@/shared/content/category-meta';
import { useLanguage, type TranslationKey } from '@/shared/i18n/language-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { activityNaming } from '@/features/learning/lib/activity-naming';
import { readableColumn } from '@/shared/theme/layout';

const LEVELS = [1, 2, 3, 4, 5];
const ACTIVITY_TYPES: { key: 'quiz' | 'jigsaw'; labelKey: TranslationKey; icon: IconName }[] = [
  { key: 'quiz', labelKey: 'gameTypeQuiz', icon: 'quiz' },
  { key: 'jigsaw', labelKey: 'gameTypeJigsaw', icon: 'puzzle' },
];

type Medal = 'gold' | 'silver' | 'bronze' | null;

function medalForPoints(points: number): Medal {
  if (points >= 75) return 'gold';
  if (points >= 50) return 'silver';
  if (points >= 25) return 'bronze';
  return null;
}

function formatTime(seconds: number) {
  const s = Math.max(0, Math.round(seconds));
  const mm = Math.floor(s / 60).toString().padStart(2, '0');
  const ss = (s % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
}

function formatDate(timestamp: number) {
  const d = new Date(timestamp);
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
}

// Same three-way split the leaderboard's PACE_META uses — medal tokens
// instead of a bespoke hex triplet, gold/silver/bronze in the same order.
const PACE_META: Record<'fast' | 'steady' | 'needs-support', { labelKey: TranslationKey; color: string; icon: IconName }> = {
  fast: { labelKey: 'paceFast', color: tokens.color.medalGold, icon: 'bolt' },
  steady: { labelKey: 'paceSteady', color: tokens.color.medalSilver, icon: 'clock' },
  'needs-support': { labelKey: 'paceNeedsSupport', color: tokens.color.medalBronze, icon: 'lightbulb' },
};

function computeTrophy(totalPoints: number, totalTimeUsed: number): Trophy {
  for (const tier of TROPHY_TIERS) {
    if (totalPoints >= tier.minPoints && totalTimeUsed <= tier.maxTimeSeconds) return tier.trophy;
  }
  return null;
}

// The same canonical-attempt rule as the leaderboard and Level Summary
// (lib/totals.ts), so a level's points here add up to the board's.
function levelStats(attempts: ActivityResult[], slot: { category: string; activityType: 'quiz' | 'jigsaw'; level: number }) {
  const slots = activitySlots(attempts, slot);
  const inLevel = attempts.filter(
    (a) => a.category === slot.category && a.activityType === slot.activityType && a.level === slot.level,
  );
  // Every try, so failed ones' deductions come off the level's points.
  const { totalPoints, totalTimeSec, completed } = totalsFor(inLevel);
  return {
    slots,
    nets: slots.map((a, i) => (a ? netPoints(triesAt(inLevel, { ...slot, activityNum: i + 1 })) : null)),
    passedCount: completed,
    totalPoints,
    totalTime: totalTimeSec,
    attempted: slots.some(Boolean),
    medal: medalForPoints(totalPoints),
  };
}

export default function StudentSummaryScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  // `board` is the leaderboard tab the record was opened from, so its card is highlighted.
  const { studentName, uid, board } = useLocalSearchParams<{ studentName: string; uid?: string; board?: 'quiz' | 'jigsaw' }>();
  const { getFilteredResults, ready } = useStudentResults();

  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<Record<string, 'quiz' | 'jigsaw'>>({});
  const [viewMode, setViewMode] = useState<'summary' | 'history'>('summary');

  const allAttempts = useMemo(
    // Matched on uid when the caller passes it; names can repeat in a class.
    () => getFilteredResults({}).filter((r) => (uid ? r.uid === uid : r.studentName === studentName)),
    [getFilteredResults, studentName, uid]
  );

  // Every total below goes through totalsFor (lib/totals.ts), the server's
  // rule: one canonical attempt per activity, and points, time and "done"
  // from passed activities only. The raw `allAttempts` is kept for the
  // History feed, which shows every attempt including retries.
  const overallTotals = useMemo(() => {
    const { totalPoints, totalTimeSec: totalTimeUsed, completed: attempts } = totalsFor(allAttempts);
    const trophy = computeTrophy(totalPoints, totalTimeUsed);
    const starsSum = getCanonicalAttempts(allAttempts).filter(isPass).reduce((sum, a) => {
      const stars = a.medal === 'gold' ? 3 : a.medal === 'silver' ? 2 : a.medal === 'bronze' ? 1 : 0;
      return sum + stars;
    }, 0);
    const avgStars = attempts > 0 ? starsSum / attempts : 0;
    const pace: 'fast' | 'steady' | 'needs-support' =
      trophy === 'gold' ? 'fast' : trophy === 'silver' ? 'steady' : 'needs-support';
    return { totalPoints, totalTimeUsed, attempts, trophy, avgStars, pace };
  }, [allAttempts]);

  // One per game, so the record reads the same as the leaderboard tab it was
  // opened from: the Quiz board ranks quiz points only, the Jigsaw board
  // jigsaw average time only (Correction 1, F5).
  const gameTotals = useMemo(
    () => ({
      quiz: totalsFor(allAttempts.filter((a) => a.activityType === 'quiz')),
      jigsaw: totalsFor(allAttempts.filter((a) => a.activityType === 'jigsaw')),
    }),
    [allAttempts]
  );

  const categoryTotals = useMemo(() => {
    const map = new Map<string, Record<'quiz' | 'jigsaw', ReturnType<typeof totalsFor>>>();
    for (const c of CATEGORY_META) {
      const inCat = allAttempts.filter((a) => a.category === c.key);
      map.set(c.key, {
        quiz: totalsFor(inCat.filter((a) => a.activityType === 'quiz')),
        jigsaw: totalsFor(inCat.filter((a) => a.activityType === 'jigsaw')),
      });
    }
    return map;
  }, [allAttempts]);

  const historyFeed = useMemo(
    () => [...allAttempts].sort((a, b) => b.timestamp - a.timestamp),
    [allAttempts]
  );

  const toggleCategory = (key: string) => {
    setExpandedCategory((cur) => (cur === key ? null : key));
    if (!activeType[key]) setActiveType((cur) => ({ ...cur, [key]: 'quiz' }));
  };

  const openLevel = (category: string, label: string, color: string, activityType: 'quiz' | 'jigsaw', level: number) => {
    router.navigate({ pathname: '/level-summary', params: {
      category,
      label,
      color,
      activityType,
      level,
      viewStudentName: studentName,
      ...(uid ? { viewStudentUid: uid } : {}),
      // Route params travel as strings; LevelSummary parses this back with toBool().
      readOnly: 'true',
    } });
  };

  const paceMeta = PACE_META[overallTotals.pace];

  return (
    <Screen>
      <ScreenHeader
        title={studentName}
        subtitle={t('fullRecordTitle')}
        color={tokens.color.navLeaderboard}
        onBack={() => router.back()}
      />

      <ScrollView contentContainerStyle={[styles.scrollContent, readableColumn]}>
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <TrophyBadge tier={overallTotals.trophy} size={20} mutedColor={tokens.color.inkFaint} />
            <BodyStrong>{overallTotals.trophy ? overallTotals.trophy : '—'}</BodyStrong>
            <Caption>{t('trophyWord')}</Caption>
          </Card>
          <Card style={styles.statCard}>
            <Icon name="star" size={20} color={tokens.color.gold} filled />
            <BodyStrong>{overallTotals.totalPoints}/{COMBINED_MAX_POINTS}</BodyStrong>
            <Caption>{t('totalPointsLabel')}</Caption>
          </Card>
          <Card style={styles.statCard}>
            <Icon name="check" size={20} color={tokens.color.success} strokeWidth={3} />
            <BodyStrong>{overallTotals.attempts}</BodyStrong>
            <Caption>{t('activitiesDoneLabel')}</Caption>
          </Card>
          <Card style={styles.statCard}>
            <Icon name="clock" size={20} color={tokens.color.inkMuted} />
            <BodyStrong>{formatTime(overallTotals.totalTimeUsed)}</BodyStrong>
            <Caption>{t('totalTimeLabel')}</Caption>
          </Card>
        </View>

        <View style={styles.statsRow}>
          {ACTIVITY_TYPES.map((type) => {
            const g = gameTotals[type.key];
            const highlighted = board === type.key;
            return (
              <Card key={type.key} style={highlighted ? [styles.gameCard, styles.gameCardActive] : styles.gameCard}>
                <View style={styles.gameCardHead}>
                  <Icon name={type.icon} size={15} color={tokens.color.navLeaderboard} />
                  <Caption style={styles.gameCardTitle}>{t(type.key === 'quiz' ? 'boardPointsTab' : 'boardTimeTab')}</Caption>
                </View>
                <BodyStrong>
                  {type.key === 'quiz'
                    ? t('pointsSuffixShort', { points: g.totalPoints })
                    : g.avgTimeSec === null ? '—' : t('avgSecondsValue', { avg: g.avgTimeSec })}
                </BodyStrong>
                <Caption>
                  {type.key === 'quiz'
                    ? t('gameDoneTime', { done: g.completed, time: formatTime(g.totalTimeSec) })
                    : t('gameDonePoints', { done: g.completed, points: g.totalPoints })}
                </Caption>
              </Card>
            );
          })}
        </View>
        <Caption style={styles.boardNote}>{t('fullRecordBoardNote')}</Caption>

        <View style={styles.paceRow}>
          <Pill
            label={t(paceMeta.labelKey)}
            icon={paceMeta.icon}
            tone="neutral"
            style={{ backgroundColor: paceMeta.color, borderColor: 'transparent' }}
          />
          <View style={styles.paceStarsWrap}>
            <StarRow earned={Math.round(overallTotals.avgStars)} of={3} size={15} />
            <Caption>{t('avgSuffix', { avg: overallTotals.avgStars.toFixed(1) })}</Caption>
          </View>
        </View>

        <View style={styles.viewToggleRow}>
          <TouchableOpacity
            style={[styles.viewToggleChip, viewMode === 'summary' && styles.viewToggleChipActive]}
            onPress={() => setViewMode('summary')}
          >
            <Icon name="chart" size={15} color={viewMode === 'summary' ? tokens.color.onDark : tokens.color.ink} />
            <Caption style={viewMode === 'summary' ? styles.viewToggleTextActive : styles.viewToggleText}>
              {t('viewSummaryToggle')}
            </Caption>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewToggleChip, viewMode === 'history' && styles.viewToggleChipActive]}
            onPress={() => setViewMode('history')}
          >
            <Icon name="clock" size={15} color={viewMode === 'history' ? tokens.color.onDark : tokens.color.ink} />
            <Caption style={viewMode === 'history' ? styles.viewToggleTextActive : styles.viewToggleText}>
              {t('viewHistoryToggle')}
            </Caption>
          </TouchableOpacity>
        </View>

        {!ready && <Body style={styles.emptyText}>{t('loading')}</Body>}
        {ready && allAttempts.length === 0 && (
          <Body style={styles.emptyText}>{t('noActivityForStudent')}</Body>
        )}

        {ready && allAttempts.length > 0 && viewMode === 'history' && (
          <View style={styles.list}>
            {historyFeed.map((r) => {
              const meta = CATEGORY_META.find((c) => c.key === r.category) || CATEGORY_META[0];
              const catColor = categoryColor(meta.key).base;
              return (
                <Card key={r.id} style={[styles.historyRow, { borderColor: catColor }]}>
                  <View style={styles.historyRowLeft}>
                    <View style={styles.historyCategoryRow}>
                      <Icon name={r.activityType === 'jigsaw' ? 'puzzle' : 'quiz'} size={14} color={catColor} />
                      <BodyStrong style={{ color: catColor }} numberOfLines={1}>
                        {t(meta.labelKey)}
                      </BodyStrong>
                    </View>
                    <Caption numberOfLines={1}>
                      {t(activityNaming(r.activityType).historyRow, {
                        level: r.level,
                        num: r.activityNum,
                        date: formatDate(r.timestamp),
                      })}
                    </Caption>
                  </View>
                  <View style={styles.historyRowRight}>
                    <View style={styles.historyStatLine}>
                      <MedalBadge tier={r.medal} size={14} mutedColor={tokens.color.inkDisabled} />
                      <Caption style={styles.historyStatText}>
                        {r.timedOut ? t('timeoutLabel') : t('secondsSuffix', { seconds: r.timeUsed })}
                      </Caption>
                    </View>
                    <View style={styles.historyStatLine}>
                      <Icon name="star" size={13} color={tokens.color.gold} filled />
                      <BodyStrong style={[styles.historyStatPoints, r.points < 0 && styles.deduction]}>{t('pointsSuffixShort', { points: r.points })}</BodyStrong>
                    </View>
                  </View>
                </Card>
              );
            })}
          </View>
        )}

        {ready && allAttempts.length > 0 && viewMode === 'summary' && (
          <View style={styles.list}>
            {CATEGORY_META.map((c) => {
              const isExpanded = expandedCategory === c.key;
              const totals = categoryTotals.get(c.key)!;
              const currentType = activeType[c.key] || 'quiz';
              const catColor = categoryColor(c.key).base;

              return (
                <Card key={c.key} style={[styles.categoryCard, { borderColor: catColor }]}>
                  <TouchableOpacity style={styles.categoryHeader} onPress={() => toggleCategory(c.key)}>
                    <View style={[styles.categoryDot, { backgroundColor: catColor }]} />
                    <View style={styles.categoryHeaderMain}>
                      <BodyStrong style={{ color: catColor }}>{t(c.labelKey)}</BodyStrong>
                      {ACTIVITY_TYPES.map((type) => {
                        const tt = totals[type.key];
                        return (
                          <View key={type.key} style={styles.categoryTypeLine}>
                            <Icon name={type.icon} size={13} color={tokens.color.inkMuted} />
                            <Caption>
                              {tt.completed > 0 || tt.failedAttempts > 0
                                ? t('categoryTypeLine', { points: tt.totalPoints, done: tt.completed, time: formatTime(tt.totalTimeSec) })
                                : t('noActivityShort')}
                            </Caption>
                          </View>
                        );
                      })}
                    </View>
                    <View style={isExpanded ? styles.chevronExpanded : undefined}>
                      <Icon name="chevronRight" size={18} color={catColor} strokeWidth={2.4} />
                    </View>
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={styles.categoryBody}>
                      <View style={styles.typeRow}>
                        {ACTIVITY_TYPES.map((type) => {
                          const active = currentType === type.key;
                          return (
                            <TouchableOpacity
                              key={type.key}
                              style={[
                                styles.typeChip,
                                { borderColor: catColor },
                                active && { backgroundColor: catColor },
                              ]}
                              onPress={() => setActiveType((cur) => ({ ...cur, [c.key]: type.key }))}
                            >
                              <Icon name={type.icon} size={14} color={active ? tokens.color.onDark : catColor} />
                              <Caption style={{ color: active ? tokens.color.onDark : catColor, fontFamily: tokens.font.bodyBold }}>
                                {t(type.labelKey)}
                              </Caption>
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      {LEVELS.map((lvl) => {
                        const stats = levelStats(allAttempts, { category: c.key, activityType: currentType, level: lvl });
                        return (
                          <TouchableOpacity
                            key={lvl}
                            style={styles.levelRow}
                            onPress={() => openLevel(c.key, t(c.labelKey), catColor, currentType, lvl)}
                            disabled={!stats.attempted}
                          >
                            <View style={styles.levelRowLeft}>
                              <Caption style={styles.levelRowLabel}>{t('levelNum', { n: lvl })}</Caption>
                              {stats.attempted && (
                                <View style={styles.levelRowProgress}>
                                  <ProgressBar value={stats.passedCount / 6} color={catColor} height={6} />
                                </View>
                              )}
                              {stats.attempted && (
                                <View style={styles.activityStrip}>
                                  {stats.slots.map((a, i) => (
                                    <View
                                      key={i}
                                      style={[
                                        styles.activityCell,
                                        a && isPass(a) && { borderColor: catColor },
                                        a && !isPass(a) && styles.activityCellFailed,
                                      ]}
                                    >
                                      <Caption style={styles.activityCellLabel}>{t('activityShort', { n: i + 1 })}</Caption>
                                      <Caption style={[styles.activityCellValue, (stats.nets[i] ?? 0) < 0 && styles.deduction]}>{stats.nets[i] ?? '–'}</Caption>
                                    </View>
                                  ))}
                                </View>
                              )}
                            </View>
                            {stats.attempted ? (
                              <View style={styles.levelRowStats}>
                                <MedalBadge tier={stats.medal} size={15} mutedColor={tokens.color.inkDisabled} />
                                <Caption style={styles.levelRowStat}>{t('passedOfSix', { passed: stats.passedCount })}</Caption>
                                <BodyStrong style={styles.levelRowPoints}>{t('pointsSuffixShort', { points: stats.totalPoints })}</BodyStrong>
                                <Caption style={styles.levelRowStatSmall}>{formatTime(stats.totalTime)}</Caption>
                                <Icon name="chevronRight" size={16} color={tokens.color.inkFaint} />
                              </View>
                            ) : (
                              <Caption style={styles.levelRowEmpty}>{t('noActivityShort')}</Caption>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </Card>
              );
            })}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: tokens.space.lg, paddingTop: tokens.space.sm, paddingBottom: tokens.space.xxl, gap: tokens.space.md },

  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm },
  statCard: { flexBasis: '47%', flexGrow: 1, alignItems: 'center', gap: tokens.space.xs / 2, paddingVertical: tokens.space.md },
  gameCard: { flexBasis: '47%', flexGrow: 1, alignItems: 'center', gap: 2, paddingVertical: tokens.space.sm, borderWidth: 2, borderColor: 'transparent' },
  gameCardActive: { borderColor: tokens.color.navLeaderboard },
  gameCardHead: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.xs / 2 },
  gameCardTitle: { color: tokens.color.navLeaderboard, fontFamily: tokens.font.bodyBold },
  boardNote: { textAlign: 'center' },

  paceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: tokens.space.sm, flexWrap: 'wrap' },
  paceStarsWrap: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.xs / 2 },

  viewToggleRow: { flexDirection: 'row', gap: tokens.space.sm },
  viewToggleChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: tokens.space.xs / 2,
    minHeight: tokens.hit.min, borderRadius: tokens.radius.md, backgroundColor: tokens.color.surfaceSunken,
  },
  viewToggleChipActive: { backgroundColor: tokens.color.navLeaderboard },
  viewToggleText: { color: tokens.color.ink, fontFamily: tokens.font.bodyBold },
  viewToggleTextActive: { color: tokens.color.onDark, fontFamily: tokens.font.bodyBold },

  emptyText: { textAlign: 'center', marginTop: tokens.space.xl, paddingHorizontal: tokens.space.sm },

  list: { gap: tokens.space.sm },

  historyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 2 },
  historyRowLeft: { flex: 1, paddingRight: tokens.space.sm, gap: 2 },
  historyCategoryRow: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.xs / 2 },
  historyRowRight: { alignItems: 'flex-end', gap: 4 },
  historyStatLine: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  historyStatText: { color: tokens.color.ink },
  historyStatPoints: { color: tokens.color.points },
  deduction: { color: tokens.color.danger },

  categoryCard: { borderWidth: 2, padding: 0, overflow: 'hidden' },
  categoryHeader: { flexDirection: 'row', alignItems: 'center', padding: tokens.space.md, gap: tokens.space.sm, minHeight: tokens.hit.min },
  categoryDot: { width: 12, height: 12, borderRadius: 6 },
  categoryHeaderMain: { flex: 1, gap: 2 },
  categoryTypeLine: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.xs / 2 },
  chevronExpanded: { transform: [{ rotate: '90deg' }] },

  categoryBody: { paddingHorizontal: tokens.space.md, paddingBottom: tokens.space.md, gap: tokens.space.sm },
  typeRow: { flexDirection: 'row', gap: tokens.space.sm },
  typeChip: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: tokens.space.xs / 2,
    paddingHorizontal: tokens.space.md, borderRadius: tokens.radius.pill, borderWidth: 1.5, minHeight: tokens.hit.min, flex: 1,
  },

  levelRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: tokens.color.surfaceSunken, borderRadius: tokens.radius.sm,
    paddingVertical: tokens.space.sm, paddingHorizontal: tokens.space.md, minHeight: tokens.hit.min,
  },
  levelRowLeft: { flex: 1, gap: 4, paddingRight: tokens.space.sm },
  levelRowLabel: { color: tokens.color.ink, fontFamily: tokens.font.bodyBold },
  levelRowProgress: { maxWidth: 120 },
  activityStrip: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  activityCell: {
    minWidth: 30, alignItems: 'center', paddingVertical: 2, paddingHorizontal: 4,
    borderRadius: tokens.radius.sm, borderWidth: 1.5, borderColor: tokens.color.inkDisabled, backgroundColor: tokens.color.surface,
  },
  activityCellFailed: { borderColor: tokens.color.danger, borderStyle: 'dashed' },
  activityCellLabel: { color: tokens.color.inkMuted },
  activityCellValue: { fontFamily: tokens.font.bodyBold, color: tokens.color.ink },
  levelRowStats: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.xs },
  levelRowStat: { color: tokens.color.ink, fontFamily: tokens.font.bodyBold },
  levelRowPoints: { color: tokens.color.points },
  levelRowStatSmall: { color: tokens.color.inkMuted },
  levelRowEmpty: { fontStyle: 'italic' },
});
