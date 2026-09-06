import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useStudentResults, ActivityResult } from '@/features/results/context/student-results-context';
import { useUser } from '@/features/auth/context/user-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { toNum, toBool } from '@/shared/lib/params';
import { Screen, ScreenHeader, Card, Button, Icon, Pill, StarRow, H3, Body, BodyStrong, Caption, Label } from '@/shared/components/ui';
import { tokens } from '@/shared/theme/tokens';

type LevelMedal = 'gold' | 'silver' | 'bronze' | null;

function medalForPoints(points: number): LevelMedal {
  if (points >= 75) return 'gold';
  if (points >= 50) return 'silver';
  if (points >= 25) return 'bronze';
  return null;
}

function medalLabel(medal: LevelMedal) {
  if (medal === 'gold') return 'Gold Medal';
  if (medal === 'silver') return 'Silver Medal';
  if (medal === 'bronze') return 'Bronze Medal';
  return '— Walang Medal Pa';
}

function medalTint(medal: LevelMedal) {
  if (medal === 'gold') return tokens.color.medalGold;
  if (medal === 'silver') return tokens.color.medalSilver;
  if (medal === 'bronze') return tokens.color.medalBronze;
  return tokens.color.inkDisabled;
}

// Same gold/silver/bronze branching starsForMedal always had — now returns
// the star count for <StarRow> instead of an "⭐⭐⭐ 3 Stars" string.
function starsForMedal(medal: ActivityResult['medal']) {
  if (medal === 'gold') return 3;
  if (medal === 'silver') return 2;
  if (medal === 'bronze') return 1;
  return 0;
}

// Question format is determined by Level (Level 1 = MC, 2-3 = Identification,
// 4-5 = Enumeration) — see quizContent.ts getQuizQuestion().
function formatQuestionType(level: number) {
  if (level === 1) return 'MC';
  if (level <= 3) return 'ID';
  return 'Enum';
}

// Jigsaw piece count is determined by Activity number within the level
// (Activity 1-2 = 6pcs, 3-4 = 9pcs, 5-6 = 12pcs) — see ActivityListScreen.tsx.
function getJigsawPieceCount(activityNum: number) {
  if (activityNum <= 2) return 6;
  if (activityNum <= 4) return 9;
  return 12;
}

// Per-activity timer duration by activity type — Quiz = 60s, Jigsaw = 120s
// (per spec). Used to compute the level's total-time cap (6 activities).
function maxTimePerActivity(activityType: string) {
  return activityType === 'jigsaw' ? 120 : 60;
}

function formatTime(seconds: number) {
  const s = Math.max(0, Math.round(seconds));
  const mm = Math.floor(s / 60).toString().padStart(2, '0');
  const ss = (s % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
}

export default function LevelSummaryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    category: string;
    label: string;
    color: string;
    activityType: 'quiz' | 'jigsaw';
    level: string;
    viewStudentName?: string;
    readOnly?: string;
  }>();
  const { category, label, color, activityType, viewStudentName } = params;
  const level = toNum(params.level, 1);
  const readOnly = toBool(params.readOnly);
  const { name: loggedInName } = useUser();
  const studentName = viewStudentName || loggedInName;
  const isReadOnly = !!readOnly;
  const { getFilteredResults } = useStudentResults();

  // Every attempt (pass + fail) this student has made on this category /
  // level, oldest first — connected directly to what ActivityPlayScreen
  // recorded via addResult().
  const attempts = useMemo(
    () =>
      getFilteredResults({ category, activityType, level })
        .filter((r) => r.studentName === studentName)
        .sort((a, b) => a.timestamp - b.timestamp),
    [getFilteredResults, category, activityType, level, studentName]
  );

  const perActivity = useMemo(() => {
    return [1, 2, 3, 4, 5, 6].map((num) => {
      const forActivity = attempts.filter((a) => a.activityNum === num);
      const firstAttempt = forActivity[0] || null;
      // The attempt that actually unlocked this activity (medal set = pass).
      const passingAttempt = [...forActivity].reverse().find((a) => a.medal) || null;
      return {
        num,
        firstAttempt,
        passingAttempt,
        firstAttemptCorrect: !!firstAttempt?.medal,
      };
    });
  }, [attempts]);

  const allComplete = perActivity.every((a) => !!a.passingAttempt);

  const totalPoints = perActivity.reduce((sum, a) => sum + (a.passingAttempt?.points ?? 0), 0);
  const totalTime = perActivity.reduce((sum, a) => sum + (a.passingAttempt?.timeUsed ?? 0), 0);
  const totalTimeCap = maxTimePerActivity(activityType) * 6;
  const levelMedal = medalForPoints(totalPoints);

  const firstAttemptCorrectCount = perActivity.filter((a) => a.firstAttemptCorrect).length;
  const firstAttemptWrongCount = 6 - firstAttemptCorrectCount;

  const classification =
    firstAttemptCorrectCount >= 5 ? 'Fast Learner' : firstAttemptCorrectCount >= 3 ? 'Moderate Learner' : 'Slow Learner';
  // Same thresholds as `classification` — only the bolt icon's tint changes
  // per tier now, instead of an ⚡ / 🙂 / 🐢 emoji.
  const classificationTint =
    firstAttemptCorrectCount >= 5 ? tokens.color.success : firstAttemptCorrectCount >= 3 ? tokens.color.warning : tokens.color.danger;

  const handleProceed = () => {
    if (level < 5) {
      router.replace({ pathname: '/activity-list', params: { category, label, color, activityType, level: level + 1 } });
    } else {
      router.replace({ pathname: '/level-map', params: { category, label, color, activityType } });
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <Screen>
      <ScreenHeader
        title={`Level ${level} — ${label}`}
        subtitle={`Student: ${studentName}`}
        color={tokens.color.success}
        right={<Pill label={isReadOnly ? 'Summary' : 'Complete'} tone="translucent" />}
      >
        <View style={styles.medalRow}>
          <View style={styles.medalDisc}>
            <Icon name="medal" size={26} color={medalTint(levelMedal)} filled={!!levelMedal} />
          </View>
          <View style={styles.medalTextWrap}>
            <BodyStrong style={styles.medalLabelText}>{medalLabel(levelMedal)}</BodyStrong>
            <Caption style={styles.medalPointsText}>{totalPoints} / 90 points</Caption>
          </View>
        </View>
      </ScreenHeader>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Icon name="star" size={20} color={tokens.color.gold} filled />
            <BodyStrong>{totalPoints}</BodyStrong>
            <Caption>Points / 90</Caption>
          </Card>
          <Card style={styles.statCard}>
            <Icon name="clock" size={20} color={tokens.color.inkMuted} />
            <BodyStrong>{totalTime}s</BodyStrong>
            <Caption>of {totalTimeCap}s</Caption>
          </Card>
          <Card style={styles.statCard}>
            <Icon name="check" size={20} color={tokens.color.success} strokeWidth={3} />
            <BodyStrong>{firstAttemptCorrectCount}/6</BodyStrong>
            <Caption>1st-Attempt</Caption>
          </Card>
        </View>

        <Card style={styles.classificationCard}>
          <View style={styles.classificationIconWrap}>
            <Icon name="bolt" size={22} color={classificationTint} filled />
          </View>
          <View style={styles.classificationTextWrap}>
            <Label>Learner Classification</Label>
            <H3>{classification}</H3>
            <Caption>
              First-Attempt Correct: {firstAttemptCorrectCount}/6 · Wrong: {firstAttemptWrongCount}/6
            </Caption>
          </View>
        </Card>

        <View style={styles.activitySection}>
          <Label style={styles.sectionLabel}>Per-Activity Results</Label>
          {perActivity.map((a) => {
            const p = a.passingAttempt;
            const typeLabel =
              activityType === 'jigsaw' ? `Jigsaw (${getJigsawPieceCount(a.num)} pcs)` : formatQuestionType(level);
            const statusText = p
              ? typeof p.requiredCount === 'number'
                ? `Passed (${p.correctCount}/${p.requiredCount})`
                : 'Passed'
              : 'Retry';
            const statusTint = p ? tokens.color.successInk : tokens.color.dangerInk;
            return (
              <Card key={a.num} style={styles.activityRow}>
                <View style={styles.activityRowLeft}>
                  <BodyStrong numberOfLines={1}>Activity {a.num}</BodyStrong>
                  <Caption numberOfLines={1}>{typeLabel}</Caption>
                </View>
                <View style={styles.activityRowMid}>
                  {p ? <StarRow earned={starsForMedal(p.medal)} size={14} /> : <Caption>—</Caption>}
                  <Caption>{p ? formatTime(p.timeUsed) : '—'}</Caption>
                </View>
                <View style={styles.activityRowRight}>
                  <View style={styles.statusChip}>
                    <Icon name={p ? 'check' : 'refresh'} size={13} color={statusTint} strokeWidth={2.6} />
                    <Caption style={{ color: statusTint }} numberOfLines={1}>
                      {statusText}
                    </Caption>
                  </View>
                  <BodyStrong style={styles.activityPoints}>{p ? p.points : 0} pts</BodyStrong>
                </View>
              </Card>
            );
          })}
        </View>

        {!allComplete && (
          <Card style={styles.warningCard}>
            <Icon name="flag" size={18} color={tokens.color.dangerInk} />
            <Body style={styles.warningText}>
              Ang ibang activities ay hindi pa naka-record ng resulta para sa student na ito. Bumalik sa Activity List
              para makumpleto.
            </Body>
          </Card>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {isReadOnly ? (
          <Button label="Back to Summary" onPress={handleBack} color={color} icon="chevronLeft" />
        ) : (
          <Button
            label={level < 5 ? `Proceed to Next Level (Unlock Level ${level + 1})` : 'Proceed to Level Map'}
            onPress={handleProceed}
            disabled={!allComplete}
            color={color}
            icon="chevronRight"
            style={!allComplete ? styles.proceedDisabled : undefined}
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  medalRow: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.md, marginTop: tokens.space.md },
  medalDisc: {
    width: 52,
    height: 52,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.color.onDarkChip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medalTextWrap: { flex: 1, gap: 1 },
  medalLabelText: { color: tokens.color.onDark },
  medalPointsText: { color: tokens.color.onDarkMuted },
  body: { padding: tokens.space.lg, gap: tokens.space.md },
  statsRow: { flexDirection: 'row', gap: tokens.space.sm },
  statCard: { flex: 1, alignItems: 'center', gap: tokens.space.xs, paddingVertical: tokens.space.md },
  classificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.md,
    backgroundColor: tokens.color.goldSoft,
    borderColor: tokens.color.gold,
  },
  classificationIconWrap: {
    width: 44,
    height: 44,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.color.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  classificationTextWrap: { flex: 1, gap: 2 },
  activitySection: { gap: tokens.space.sm },
  sectionLabel: { marginBottom: tokens.space.xs },
  activityRow: { flexDirection: 'row', alignItems: 'center', padding: tokens.space.md, gap: tokens.space.sm },
  activityRowLeft: { flex: 1.3, gap: 2 },
  activityRowMid: { flex: 1, alignItems: 'flex-start', gap: 4 },
  activityRowRight: { flex: 1.4, alignItems: 'flex-end', gap: 4 },
  statusChip: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.xs },
  activityPoints: { color: tokens.color.points },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.sm,
    backgroundColor: tokens.color.dangerSoft,
    borderColor: tokens.color.dangerBorder,
  },
  warningText: { flex: 1, color: tokens.color.dangerInk },
  footer: { paddingHorizontal: tokens.space.lg, paddingBottom: tokens.space.lg, paddingTop: tokens.space.sm },
  proceedDisabled: { opacity: 0.5 },
});
