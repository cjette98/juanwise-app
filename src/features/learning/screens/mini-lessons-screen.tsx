import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView, Image } from 'react-native';
import { Screen, ScreenHeader, Card, Button, Pill, Icon, H2, Body, BodyStrong, Caption } from '@/shared/components/ui';
import { tokens, categoryColor } from '@/shared/theme/tokens';
import { useStudentResults } from '@/features/results/context/student-results-context';
import { useUser } from '@/features/auth/context/user-context';
import { useClassContent } from '@/features/learning/context/class-content-context';
import { getCategoryMeta } from '@/shared/content/category-meta';
import { quizLessonText } from '@/features/admin/lib/question-mapping';
import { useRouter } from 'expo-router';

interface LessonCard {
  key: string;
  category: string;
  level: number;
  activityNum: number;
  source: 'quiz' | 'jigsaw';
  text: string;
  /** Ready for <Image source={...}> — a require() id or a { uri } object. */
  image: any;
  timestamp: number;
}

export default function MiniLessonsScreen() {
  const router = useRouter();
  const { uid } = useUser();
  const { results, ready } = useStudentResults();
  // Mini-lessons and category write-ups come from the content module, so an
  // admin's edit shows up in the unlocked lesson too. A quiz activity whose
  // mini-lesson is empty falls back to its explanation — see `quizLessonText`.
  const { getEffectiveQuestion, getEffectiveCategoryContent } = useClassContent();

  // A "mini-lesson" is unlocked the first time the student answers that
  // exact category/level/activity/type correctly — dedupe on that key and
  // show only the most recent unlock per lesson.
  const lessons = useMemo<LessonCard[]>(() => {
    const mine = results.filter((r) => r.uid === uid);
    const byKey = new Map<string, LessonCard>();

    for (const r of mine) {
      const key = `${r.category}-${r.activityType}-${r.level}-${r.activityNum}`;
      const existing = byKey.get(key);
      if (existing && existing.timestamp >= r.timestamp) continue;

      const categoryContent = getEffectiveCategoryContent(r.category);
      const question =
        r.activityType === 'quiz'
          ? getEffectiveQuestion(r.category, r.level, r.activityNum)
          : null;

      const text = question ? quizLessonText(question) : categoryContent.context;
      // A quiz activity shows the picture the admin uploaded for that exact
      // mini-lesson. Anything without one — every jigsaw activity, and every
      // question nobody has illustrated — keeps the category picture, which is
      // what this screen showed before per-question images existed.
      const image = question?.miniLessonImageUrl
        ? { uri: question.miniLessonImageUrl }
        : categoryContent.image;

      byKey.set(key, {
        key,
        category: r.category,
        level: r.level,
        activityNum: r.activityNum,
        source: r.activityType,
        text,
        image,
        timestamp: r.timestamp,
      });
    }

    return Array.from(byKey.values()).sort((a, b) => b.timestamp - a.timestamp);
  }, [results, uid, getEffectiveQuestion, getEffectiveCategoryContent]);

  const [featured, ...rest] = lessons;

  return (
    <Screen>
      <ScreenHeader
        title="Mini-Lessons"
        subtitle={`${lessons.length} aralin ang na-unlock mula sa tamang sagot mo sa Quiz at Jigsaw Puzzle`}
        color={tokens.color.navLessons}
        onBack={() => router.back()}
      />

      <ScrollView contentContainerStyle={styles.list}>
        {!ready && <Body style={styles.emptyText}>Naglo-load...</Body>}

        {ready && lessons.length === 0 && (
          <View style={styles.emptyWrap}>
            <Icon name="book" size={40} color={tokens.color.inkFaint} />
            <Body style={styles.emptyText}>
              Wala ka pang na-unlock na mini-lesson. Sagutan nang tama ang isang Quiz o Jigsaw
              Puzzle sa Categories para makapag-unlock ng aralin dito.
            </Body>
            <Button label="Pumunta sa Categories" onPress={() => router.navigate('/categories')} color={tokens.color.navLessons} shadowColor={tokens.color.successDark} />
          </View>
        )}

        {featured && (
          <Card style={styles.bannerCard}>
            <Image source={featured.image} style={styles.bannerImage} />
            <View style={styles.bannerBody}>
              <Pill
                label={getCategoryMeta(featured.category).label}
                tone="translucent"
                style={{ backgroundColor: categoryColor(featured.category).base, borderColor: 'transparent' }}
              />
              <H2 style={styles.bannerTitle}>
                Level {featured.level} · Activity {featured.activityNum}
              </H2>
              <View style={styles.sourceRow}>
                <Icon name={featured.source === 'quiz' ? 'quiz' : 'puzzle'} size={14} color={tokens.color.inkMuted} />
                <Caption style={styles.sourceLabel}>{featured.source === 'quiz' ? 'Quiz' : 'Jigsaw'}</Caption>
              </View>
              <Body style={styles.bannerText}>{featured.text}</Body>
            </View>
          </Card>
        )}

        {rest.map((lesson) => (
          <Card key={lesson.key} style={styles.rowCard}>
            <Image source={lesson.image} style={styles.rowImage} />
            <View style={styles.rowBody}>
              <Pill
                label={getCategoryMeta(lesson.category).label}
                tone="translucent"
                style={{ backgroundColor: categoryColor(lesson.category).base, borderColor: 'transparent' }}
              />
              <BodyStrong numberOfLines={1}>
                Level {lesson.level} · Activity {lesson.activityNum}
              </BodyStrong>
              <View style={styles.sourceRow}>
                <Icon name={lesson.source === 'quiz' ? 'quiz' : 'puzzle'} size={12} color={tokens.color.inkMuted} />
                <Caption style={styles.sourceLabel}>{lesson.source === 'quiz' ? 'Quiz' : 'Jigsaw'}</Caption>
              </View>
              <Body numberOfLines={2} style={styles.rowText}>{lesson.text}</Body>
            </View>
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: tokens.space.lg, gap: tokens.space.md },
  emptyWrap: { alignItems: 'center', marginTop: tokens.space.xxl, paddingHorizontal: tokens.space.sm, gap: tokens.space.md },
  emptyText: { textAlign: 'center' },
  bannerCard: { padding: 0, overflow: 'hidden' },
  bannerImage: { width: '100%', height: 132 },
  bannerBody: { padding: tokens.space.lg, gap: tokens.space.xs },
  bannerTitle: { marginTop: tokens.space.xs },
  bannerText: { marginTop: tokens.space.xs },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.xs / 2 },
  sourceLabel: { color: tokens.color.inkMuted },
  rowCard: { flexDirection: 'row', gap: tokens.space.sm, padding: tokens.space.md },
  rowImage: { width: 68, height: 68, borderRadius: tokens.radius.md },
  rowBody: { flex: 1, gap: tokens.space.xs / 2, alignItems: 'flex-start' },
  rowText: { color: tokens.color.inkBody },
});
