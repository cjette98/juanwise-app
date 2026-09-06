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
} from '@/shared/components/ui';
import { tokens, categoryColor } from '@/shared/theme/tokens';
import { useStudentResults, ActivityResult, getCanonicalAttempts, TROPHY_TIERS, Trophy, COMBINED_MAX_POINTS } from '@/features/results/context/student-results-context';
import { CATEGORY_META } from '@/shared/content/category-meta';
import { useRouter, useLocalSearchParams } from 'expo-router';

const LEVELS = [1, 2, 3, 4, 5];
const ACTIVITY_TYPES: { key: 'quiz' | 'jigsaw'; label: string; icon: IconName }[] = [
  { key: 'quiz', label: 'Quiz', icon: 'quiz' },
  { key: 'jigsaw', label: 'Jigsaw Puzzle', icon: 'puzzle' },
];

type Medal = 'gold' | 'silver' | 'bronze' | null;

function medalForPoints(points: number): Medal {
  if (points >= 75) return 'gold';
  if (points >= 50) return 'silver';
  if (points >= 25) return 'bronze';
  return null;
}

const MEDAL_COLORS: Record<'gold' | 'silver' | 'bronze', string> = {
  gold: tokens.color.medalGold,
  silver: tokens.color.medalSilver,
  bronze: tokens.color.medalBronze,
};

function medalTint(medal: Medal) {
  return medal ? MEDAL_COLORS[medal] : tokens.color.inkDisabled;
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
const PACE_META: Record<'fast' | 'steady' | 'needs-support', { label: string; color: string; icon: IconName }> = {
  fast: { label: 'Mabilis Matuto', color: tokens.color.medalGold, icon: 'bolt' },
  steady: { label: 'Sakto sa Bilis', color: tokens.color.medalSilver, icon: 'clock' },
  'needs-support': { label: 'Kailangan ng Tulong', color: tokens.color.medalBronze, icon: 'lightbulb' },
};

function computeTrophy(totalPoints: number, totalTimeUsed: number): Trophy {
  for (const tier of TROPHY_TIERS) {
    if (totalPoints >= tier.minPoints && totalTimeUsed <= tier.maxTimeSeconds) return tier.trophy;
  }
  return null;
}

// Same "passing attempt per activity #" logic used by LevelSummaryScreen —
// kept in sync here so level totals shown in this drill-down match exactly
// what the student saw on their own Level Summary screen.
function levelStats(attempts: ActivityResult[], level: number) {
  const forLevel = attempts.filter((a) => a.level === level);
  const perActivity = [1, 2, 3, 4, 5, 6].map((num) => {
    const forActivity = forLevel.filter((a) => a.activityNum === num);
    const passingAttempt = [...forActivity].reverse().find((a) => a.medal) || null;
    return passingAttempt;
  });
  const passedCount = perActivity.filter(Boolean).length;
  const totalPoints = perActivity.reduce((sum, a) => sum + (a?.points ?? 0), 0);
  const totalTime = perActivity.reduce((sum, a) => sum + (a?.timeUsed ?? 0), 0);
  const attempted = forLevel.length > 0;
  return { passedCount, totalPoints, totalTime, attempted, medal: medalForPoints(totalPoints) };
}

export default function StudentSummaryScreen() {
  const router = useRouter();
  const { studentName } = useLocalSearchParams<{ studentName: string }>();
  const { getFilteredResults, ready } = useStudentResults();

  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<Record<string, 'quiz' | 'jigsaw'>>({});
  const [viewMode, setViewMode] = useState<'summary' | 'history'>('summary');

  const allAttempts = useMemo(
    () => getFilteredResults({}).filter((r) => r.studentName === studentName),
    [getFilteredResults, studentName]
  );

  // Deduped to one canonical (best/passing) attempt per activity — retries
  // must not be summed multiple times. Used for every total/stat below.
  // The raw `allAttempts` is kept only for the chronological History feed,
  // which is meant to show every attempt including retries.
  const canonicalAttempts = useMemo(() => getCanonicalAttempts(allAttempts), [allAttempts]);

  const overallTotals = useMemo(() => {
    const totalPoints = canonicalAttempts.reduce((sum, a) => sum + a.points, 0);
    const totalTimeUsed = canonicalAttempts.reduce((sum, a) => sum + a.timeUsed, 0);
    const attempts = canonicalAttempts.length;
    const avgTime = attempts > 0 ? totalTimeUsed / attempts : 0;
    const trophy = computeTrophy(totalPoints, totalTimeUsed);
    const starsSum = canonicalAttempts.reduce((sum, a) => {
      const stars = a.medal === 'gold' ? 3 : a.medal === 'silver' ? 2 : a.medal === 'bronze' ? 1 : 0;
      return sum + stars;
    }, 0);
    const avgStars = attempts > 0 ? starsSum / attempts : 0;
    const pace: 'fast' | 'steady' | 'needs-support' =
      trophy === 'gold' ? 'fast' : trophy === 'silver' ? 'steady' : 'needs-support';
    return { totalPoints, totalTimeUsed, attempts, avgTime, trophy, avgStars, pace };
  }, [canonicalAttempts]);

  const categoryTotals = useMemo(() => {
    const map = new Map<string, { totalPoints: number; attempts: number }>();
    for (const c of CATEGORY_META) {
      const inCat = canonicalAttempts.filter((a) => a.category === c.key);
      map.set(c.key, {
        totalPoints: inCat.reduce((sum, a) => sum + a.points, 0),
        attempts: inCat.length,
      });
    }
    return map;
  }, [canonicalAttempts]);

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
      // Route params travel as strings; LevelSummary parses this back with toBool().
      readOnly: 'true',
    } });
  };

  const trophyTint = overallTotals.trophy ? MEDAL_COLORS[overallTotals.trophy] : tokens.color.inkFaint;
  const paceMeta = PACE_META[overallTotals.pace];

  return (
    <Screen>
      <ScreenHeader
        title={studentName}
        subtitle="Kompletong Record — Buod at Kasaysayan ng Bawat Gawain"
        color={tokens.color.navLeaderboard}
        onBack={() => router.back()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Icon name="trophy" size={20} color={trophyTint} filled={!!overallTotals.trophy} />
            <BodyStrong>{overallTotals.trophy ? overallTotals.trophy : '—'}</BodyStrong>
            <Caption>Trophy</Caption>
          </Card>
          <Card style={styles.statCard}>
            <Icon name="star" size={20} color={tokens.color.gold} filled />
            <BodyStrong>{overallTotals.totalPoints}/{COMBINED_MAX_POINTS}</BodyStrong>
            <Caption>Kabuuang Puntos</Caption>
          </Card>
          <Card style={styles.statCard}>
            <Icon name="check" size={20} color={tokens.color.success} strokeWidth={3} />
            <BodyStrong>{overallTotals.attempts}</BodyStrong>
            <Caption>Gawaing Natapos</Caption>
          </Card>
          <Card style={styles.statCard}>
            <Icon name="clock" size={20} color={tokens.color.inkMuted} />
            <BodyStrong>{formatTime(overallTotals.totalTimeUsed)}</BodyStrong>
            <Caption>Kabuuang Oras</Caption>
          </Card>
        </View>

        <View style={styles.paceRow}>
          <Pill
            label={paceMeta.label}
            icon={paceMeta.icon}
            tone="neutral"
            style={{ backgroundColor: paceMeta.color, borderColor: 'transparent' }}
          />
          <View style={styles.paceStarsWrap}>
            <StarRow earned={Math.round(overallTotals.avgStars)} of={3} size={15} />
            <Caption>({overallTotals.avgStars.toFixed(1)} avg)</Caption>
          </View>
        </View>

        <View style={styles.viewToggleRow}>
          <TouchableOpacity
            style={[styles.viewToggleChip, viewMode === 'summary' && styles.viewToggleChipActive]}
            onPress={() => setViewMode('summary')}
          >
            <Icon name="chart" size={15} color={viewMode === 'summary' ? tokens.color.onDark : tokens.color.ink} />
            <Caption style={viewMode === 'summary' ? styles.viewToggleTextActive : styles.viewToggleText}>
              Buod (Category/Level)
            </Caption>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewToggleChip, viewMode === 'history' && styles.viewToggleChipActive]}
            onPress={() => setViewMode('history')}
          >
            <Icon name="clock" size={15} color={viewMode === 'history' ? tokens.color.onDark : tokens.color.ink} />
            <Caption style={viewMode === 'history' ? styles.viewToggleTextActive : styles.viewToggleText}>
              Kasaysayan (Lahat ng Gawain)
            </Caption>
          </TouchableOpacity>
        </View>

        {!ready && <Body style={styles.emptyText}>Naglo-load...</Body>}
        {ready && allAttempts.length === 0 && (
          <Body style={styles.emptyText}>Wala pang natatapos na gawain ang estudyanteng ito.</Body>
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
                        {meta.label}
                      </BodyStrong>
                    </View>
                    <Caption numberOfLines={1}>
                      Level {r.level} · Activity {r.activityNum} · {formatDate(r.timestamp)}
                    </Caption>
                  </View>
                  <View style={styles.historyRowRight}>
                    <View style={styles.historyStatLine}>
                      <Icon name="medal" size={14} color={medalTint(r.medal)} filled={!!r.medal} />
                      <Caption style={styles.historyStatText}>
                        {r.timedOut ? 'Timeout' : `${r.timeUsed}s`}
                      </Caption>
                    </View>
                    <View style={styles.historyStatLine}>
                      <Icon name="star" size={13} color={tokens.color.gold} filled />
                      <BodyStrong style={styles.historyStatPoints}>{r.points} pts</BodyStrong>
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
              const typedAttempts = allAttempts.filter((a) => a.category === c.key && a.activityType === currentType);
              const catColor = categoryColor(c.key).base;

              return (
                <Card key={c.key} style={[styles.categoryCard, { borderColor: catColor }]}>
                  <TouchableOpacity style={styles.categoryHeader} onPress={() => toggleCategory(c.key)}>
                    <View style={[styles.categoryDot, { backgroundColor: catColor }]} />
                    <View style={styles.categoryHeaderMain}>
                      <BodyStrong style={{ color: catColor }}>{c.label}</BodyStrong>
                      <Caption>
                        {totals.attempts > 0 ? `${totals.totalPoints} pts · ${totals.attempts} gawain` : 'Wala pang gawain'}
                      </Caption>
                    </View>
                    <View style={isExpanded ? styles.chevronExpanded : undefined}>
                      <Icon name="chevronRight" size={18} color={catColor} strokeWidth={2.4} />
                    </View>
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={styles.categoryBody}>
                      <View style={styles.typeRow}>
                        {ACTIVITY_TYPES.map((t) => {
                          const active = currentType === t.key;
                          return (
                            <TouchableOpacity
                              key={t.key}
                              style={[
                                styles.typeChip,
                                { borderColor: catColor },
                                active && { backgroundColor: catColor },
                              ]}
                              onPress={() => setActiveType((cur) => ({ ...cur, [c.key]: t.key }))}
                            >
                              <Icon name={t.icon} size={14} color={active ? tokens.color.onDark : catColor} />
                              <Caption style={{ color: active ? tokens.color.onDark : catColor, fontFamily: tokens.font.bodyBold }}>
                                {t.label}
                              </Caption>
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      {LEVELS.map((lvl) => {
                        const stats = levelStats(typedAttempts, lvl);
                        return (
                          <TouchableOpacity
                            key={lvl}
                            style={styles.levelRow}
                            onPress={() => openLevel(c.key, c.label, catColor, currentType, lvl)}
                            disabled={!stats.attempted}
                          >
                            <View style={styles.levelRowLeft}>
                              <Caption style={styles.levelRowLabel}>Level {lvl}</Caption>
                              {stats.attempted && (
                                <View style={styles.levelRowProgress}>
                                  <ProgressBar value={stats.passedCount / 6} color={catColor} height={6} />
                                </View>
                              )}
                            </View>
                            {stats.attempted ? (
                              <View style={styles.levelRowStats}>
                                <Icon name="medal" size={15} color={medalTint(stats.medal)} filled={!!stats.medal} />
                                <Caption style={styles.levelRowStat}>{stats.passedCount}/6</Caption>
                                <BodyStrong style={styles.levelRowPoints}>{stats.totalPoints} pts</BodyStrong>
                                <Caption style={styles.levelRowStatSmall}>{formatTime(stats.totalTime)}</Caption>
                                <Icon name="chevronRight" size={16} color={tokens.color.inkFaint} />
                              </View>
                            ) : (
                              <Caption style={styles.levelRowEmpty}>Wala pang gawain</Caption>
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

  categoryCard: { borderWidth: 2, padding: 0, overflow: 'hidden' },
  categoryHeader: { flexDirection: 'row', alignItems: 'center', padding: tokens.space.md, gap: tokens.space.sm, minHeight: tokens.hit.min },
  categoryDot: { width: 12, height: 12, borderRadius: 6 },
  categoryHeaderMain: { flex: 1, gap: 2 },
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
  levelRowStats: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.xs },
  levelRowStat: { color: tokens.color.ink, fontFamily: tokens.font.bodyBold },
  levelRowPoints: { color: tokens.color.points },
  levelRowStatSmall: { color: tokens.color.inkMuted },
  levelRowEmpty: { fontStyle: 'italic' },
});
