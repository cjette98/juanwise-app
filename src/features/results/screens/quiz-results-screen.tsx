import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useStudentResults, ActivityResult } from '@/features/results/context/student-results-context';
import { useUser } from '@/features/auth/context/user-context';
import { getCategoryMeta } from '@/shared/content/category-meta';
import { useRouter } from 'expo-router';
import { Screen, ScreenHeader, Card, Button, Icon, Body, BodyStrong, Caption } from '@/shared/components/ui';
import { tokens, categoryColor } from '@/shared/theme/tokens';

function medalTint(medal: ActivityResult['medal']) {
  if (medal === 'gold') return tokens.color.medalGold;
  if (medal === 'silver') return tokens.color.medalSilver;
  if (medal === 'bronze') return tokens.color.medalBronze;
  return null;
}

export default function QuizResultsScreen() {
  const router = useRouter();
  const { uid } = useUser();
  const { results, ready } = useStudentResults();

  // Matched on uid rather than name — two students in a class can share a name,
  // and the API stamps every attempt with the account that made it.
  const quizResults = useMemo(
    () =>
      results
        .filter((r) => r.uid === uid && r.activityType === 'quiz')
        .sort((a, b) => b.timestamp - a.timestamp),
    [results, uid]
  );

  const totalPoints = quizResults.reduce((sum, r) => sum + r.points, 0);

  return (
    <Screen>
      <ScreenHeader
        title="Quiz Results"
        subtitle={`${quizResults.length} tamang sagot · ${totalPoints} kabuuang puntos`}
        color={tokens.color.navQuiz}
        onBack={() => router.back()}
      />

      <ScrollView contentContainerStyle={styles.list}>
        {!ready && <Body style={styles.emptyText}>Naglo-load...</Body>}
        {ready && quizResults.length === 0 && (
          <View style={styles.emptyWrap}>
            <Icon name="quiz" size={40} color={tokens.color.inkFaint} />
            <Body style={styles.emptyText}>
              Wala ka pang natatapos na Quiz. Pumunta sa Categories at subukan ang isang Quiz
              activity para makita dito ang resulta mo.
            </Body>
            <Button
              label="Pumunta sa Categories"
              onPress={() => router.navigate('/categories')}
              color={tokens.color.navQuiz}
              style={styles.emptyButton}
            />
          </View>
        )}

        {quizResults.map((r) => {
          const meta = getCategoryMeta(r.category);
          const tint = medalTint(r.medal);
          return (
            <Card key={r.id} style={styles.row}>
              <View style={styles.rowLeft}>
                <BodyStrong style={{ color: categoryColor(r.category).base }} numberOfLines={1}>
                  {meta.label}
                </BodyStrong>
                <Caption>
                  Level {r.level} · Activity {r.activityNum}
                </Caption>
              </View>
              <View style={styles.rowStats}>
                <View style={styles.rowStatLine}>
                  {tint ? (
                    <Icon name="medal" size={16} color={tint} filled />
                  ) : (
                    <Caption>—</Caption>
                  )}
                  <Icon name="clock" size={13} color={tokens.color.inkMuted} />
                  <Caption>{r.timeUsed}s</Caption>
                </View>
                <BodyStrong style={styles.rowPoints}>{r.points} pts</BodyStrong>
              </View>
            </Card>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: tokens.space.lg, gap: tokens.space.sm },
  emptyWrap: { alignItems: 'center', marginTop: tokens.space.xxl, paddingHorizontal: tokens.space.sm, gap: tokens.space.sm },
  emptyText: { textAlign: 'center', color: tokens.color.inkMuted },
  emptyButton: { marginTop: tokens.space.md, minWidth: 220 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: tokens.space.md,
  },
  rowLeft: { flex: 1, gap: 2 },
  rowStats: { alignItems: 'flex-end', gap: tokens.space.xs },
  rowStatLine: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.xs },
  rowPoints: { color: tokens.color.points },
});
