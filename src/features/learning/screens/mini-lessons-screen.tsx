import React, { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Screen, ScreenHeader, Card, Button, Pill, Icon, ZoomableImage, H2, Body, BodyStrong, Caption } from '@/shared/components/ui';
import { tokens, categoryColor } from '@/shared/theme/tokens';
import { useStudentResults } from '@/features/results/context/student-results-context';
import { useUser } from '@/features/auth/context/user-context';
import { useClassContent } from '@/features/learning/context/class-content-context';
import { getCategoryMeta } from '@/shared/content/category-meta';
import { activityNaming } from '@/features/learning/lib/activity-naming';
import { useLanguage } from '@/shared/i18n/language-context';
import { quizLessonText } from '@/features/admin/lib/question-mapping';
import { useRouter } from 'expo-router';

interface LessonCard {
  key: string;
  category: string;
  level: number;
  activityNum: number;
  source: 'quiz' | 'jigsaw';
  text: string;
  /** The puzzle's own name (e.g. "Manunggul Jar") when the activity has its own picture. */
  name: string | null;
  /** Ready for <Image source={...}> — a require() id or a { uri } object. */
  image: any;
  timestamp: number;
}

export default function MiniLessonsScreen() {
  const router = useRouter();
  const { t } = useLanguage();
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

      // A jigsaw activity can carry its own picture, name, definition and
      // mini-lesson, set per activity on the web; pass the slot so those win
      // over the category's (Correction 1, F8).
      const categoryContent =
        r.activityType === 'jigsaw'
          ? getEffectiveCategoryContent(r.category, r.level, r.activityNum)
          : getEffectiveCategoryContent(r.category);
      const question =
        r.activityType === 'quiz'
          ? getEffectiveQuestion(r.category, r.level, r.activityNum)
          : null;

      const text = question
        ? quizLessonText(question)
        : [categoryContent.definition, categoryContent.context].filter(Boolean).join('\n\n');
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
        name: question ? null : categoryContent.title,
        image,
        timestamp: r.timestamp,
      });
    }

    return Array.from(byKey.values()).sort((a, b) => b.timestamp - a.timestamp);
  }, [results, uid, getEffectiveQuestion, getEffectiveCategoryContent]);

  const [featured, ...rest] = lessons;
  // Rows show two lines of their lesson until tapped open (Correction 1, F8).
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (key: string) =>
    setExpanded((cur) => {
      const next = new Set(cur);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const zoomLabels = {
    openLabel: t('openPictureLabel'),
    zoomHint: t('pictureZoomHint'),
    closeLabel: t('closePictureLabel'),
    zoomInLabel: t('zoomInLabel'),
    zoomOutLabel: t('zoomOutLabel'),
  };
  const lessonTitle = (lesson: LessonCard) =>
    [
      t(getCategoryMeta(lesson.category).labelKey),
      t(activityNaming(lesson.source).levelLine, { level: lesson.level, num: lesson.activityNum }),
      lesson.name,
    ]
      .filter(Boolean)
      .join(' · ');

  return (
    <Screen>
      <ScreenHeader
        title={t('miniLessonsTitle')}
        subtitle={t('miniLessonsSubtitle', { count: lessons.length })}
        color={tokens.color.navLessons}
        onBack={() => router.back()}
      />

      <ScrollView contentContainerStyle={styles.list}>
        {!ready && <Body style={styles.emptyText}>{t('loading')}</Body>}

        {ready && lessons.length === 0 && (
          <View style={styles.emptyWrap}>
            <Icon name="book" size={40} color={tokens.color.inkFaint} />
            <Body style={styles.emptyText}>{t('noMiniLessonsYet')}</Body>
            <Button label={t('goToCategories')} onPress={() => router.navigate('/categories')} color={tokens.color.navLessons} shadowColor={tokens.color.successDark} />
          </View>
        )}

        {featured && (
          <Card style={styles.bannerCard}>
            <ZoomableImage
              source={featured.image}
              style={styles.bannerImage}
              {...zoomLabels}
              details={{ title: lessonTitle(featured), text: featured.text }}
            />
            <View style={styles.bannerBody}>
              <Pill
                label={t(getCategoryMeta(featured.category).labelKey)}
                tone="translucent"
                style={{ backgroundColor: categoryColor(featured.category).base, borderColor: 'transparent' }}
              />
              <H2 style={styles.bannerTitle}>
                {t(activityNaming(featured.source).levelLine, { level: featured.level, num: featured.activityNum })}
              </H2>
              <View style={styles.sourceRow}>
                <Icon name={featured.source === 'quiz' ? 'quiz' : 'puzzle'} size={14} color={tokens.color.inkMuted} />
                <Caption style={styles.sourceLabel}>{featured.source === 'quiz' ? t('gameTypeQuiz') : t('gameTypeJigsaw')}</Caption>
              </View>
              <Body style={styles.bannerText}>{featured.text}</Body>
            </View>
          </Card>
        )}

        {rest.map((lesson) => {
          const isOpen = expanded.has(lesson.key);
          return (
            <Card key={lesson.key} style={styles.rowCard}>
              <ZoomableImage
                source={lesson.image}
                style={styles.rowImage}
                {...zoomLabels}
                details={{ title: lessonTitle(lesson), text: lesson.text }}
              />
              <View style={styles.rowBody}>
                <Pill
                  label={t(getCategoryMeta(lesson.category).labelKey)}
                  tone="translucent"
                  style={{ backgroundColor: categoryColor(lesson.category).base, borderColor: 'transparent' }}
                />
                <BodyStrong numberOfLines={1}>
                  {t(activityNaming(lesson.source).levelLine, { level: lesson.level, num: lesson.activityNum })}
                </BodyStrong>
                <View style={styles.sourceRow}>
                  <Icon name={lesson.source === 'quiz' ? 'quiz' : 'puzzle'} size={12} color={tokens.color.inkMuted} />
                  <Caption style={styles.sourceLabel}>{lesson.source === 'quiz' ? t('gameTypeQuiz') : t('gameTypeJigsaw')}</Caption>
                </View>
                <Pressable
                  onPress={() => toggle(lesson.key)}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: isOpen }}
                  style={styles.rowTextWrap}
                >
                  <Body numberOfLines={isOpen ? undefined : 2} style={styles.rowText}>{lesson.text}</Body>
                  <Caption style={styles.rowMore}>{t(isOpen ? 'showLessLesson' : 'showFullLesson')}</Caption>
                </Pressable>
              </View>
            </Card>
          );
        })}
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
  rowTextWrap: { alignSelf: 'stretch', gap: 2, minHeight: tokens.hit.min },
  rowText: { color: tokens.color.inkBody },
  rowMore: { color: tokens.color.navLessons, fontFamily: tokens.font.bodyBold },
});
