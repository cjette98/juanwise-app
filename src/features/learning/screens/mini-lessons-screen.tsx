import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useStudentResults } from '@/features/results/context/student-results-context';
import { useUser } from '@/features/auth/context/user-context';
import { useAdminContent } from '@/features/admin/context/admin-content-context';
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
  const { getEffectiveQuestion, getEffectiveCategoryContent } = useAdminContent();

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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <Ionicons name="chevron-back" size={22} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mini-Lessons</Text>
        <Text style={styles.headerSubtitle}>
          {lessons.length} aralin ang na-unlock mula sa tamang sagot mo sa Quiz at Jigsaw Puzzle
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {!ready && <Text style={styles.emptyText}>Naglo-load...</Text>}
        {ready && lessons.length === 0 && (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyIcon}>📖</Text>
            <Text style={styles.emptyText}>
              Wala ka pang na-unlock na mini-lesson. Sagutan nang tama ang isang Quiz o Jigsaw
              Puzzle sa Categories para makapag-unlock ng aralin dito.
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.navigate('/categories')}
            >
              <Text style={styles.emptyButtonText}>Pumunta sa Categories</Text>
            </TouchableOpacity>
          </View>
        )}

        {lessons.map((lesson) => {
          const meta = getCategoryMeta(lesson.category);
          return (
            <View key={lesson.key} style={[styles.card, { borderColor: meta.color }]}>
              <View style={styles.cardTop}>
                <Image source={lesson.image} style={styles.cardImage} />
                <View style={styles.cardTopText}>
                  <Text style={[styles.cardCategory, { color: meta.color }]}>{meta.label}</Text>
                  <Text style={styles.cardMeta}>
                    Level {lesson.level} · Activity {lesson.activityNum} ·{' '}
                    {lesson.source === 'quiz' ? '📝 Quiz' : '🧩 Jigsaw'}
                  </Text>
                </View>
              </View>
              <Text style={styles.cardText}>{lesson.text}</Text>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5EFE0' },
  header: {
    backgroundColor: '#2E9E5B', paddingTop: 10, paddingBottom: 16, paddingHorizontal: 16,
    borderBottomLeftRadius: 20, borderBottomRightRadius: 20,
  },
  headerBack: { marginBottom: 4 },
  headerTitle: { color: '#FFF', fontWeight: 'bold', fontSize: 19 },
  headerSubtitle: { color: '#FFF', fontSize: 12, opacity: 0.9, marginTop: 2 },
  list: { padding: 16, gap: 12 },
  emptyWrap: { alignItems: 'center', marginTop: 30, paddingHorizontal: 10 },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyText: { textAlign: 'center', color: '#8E8E93', fontSize: 13, lineHeight: 19 },
  emptyButton: { marginTop: 16, backgroundColor: '#2E9E5B', paddingVertical: 10, paddingHorizontal: 22, borderRadius: 18 },
  emptyButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
  card: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 14, borderWidth: 2,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  cardImage: { width: 44, height: 44, borderRadius: 10 },
  cardTopText: { flex: 1 },
  cardCategory: { fontWeight: 'bold', fontSize: 14 },
  cardMeta: { fontSize: 11, color: '#8E8E93', marginTop: 2 },
  cardText: { fontSize: 13.5, color: '#2B2B2B', lineHeight: 20 },
});