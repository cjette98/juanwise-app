import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGameProgress } from '@/features/learning/context/game-progress-context';
import { useAdminContent } from '@/features/admin/context/admin-content-context';
import { getQuizQuestion } from '@/shared/content/quiz-content';
import ActivityTimer, { ActivityTimerHandle, ActivityTimerResult, Medal } from '@/shared/components/activity-timer';
import { useStudentResults } from '@/features/results/context/student-results-context';
import { useUser } from '@/features/auth/context/user-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { toNum } from '@/shared/lib/params';

function shuffleChoices(choices: string[]) {
  const arr = [...choices];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// New Quiz scoring rule (per spec):
// Wrong / unanswered  = 0 pts, no star, 🚩 red flag — Needs Retry
// Correct, 41-60s left on the clock = 15 pts / ⭐⭐⭐
// Correct, 21-40s left             = 10 pts / ⭐⭐
// Correct, 1-20s left              =  5 pts / ⭐
// Max per level = 15 * 6 activities = 90 pts.
// (Local to the Quiz screen only — does NOT touch ActivityTimer's shared
// medal/points constants, so Jigsaw's scoring is untouched.)
function computeQuizScore(timeRemaining: number): { stars: 0 | 1 | 2 | 3; points: number; medal: Medal } {
  if (timeRemaining >= 41) return { stars: 3, points: 15, medal: 'gold' };
  if (timeRemaining >= 21) return { stars: 2, points: 10, medal: 'silver' };
  if (timeRemaining >= 1) return { stars: 1, points: 5, medal: 'bronze' };
  return { stars: 0, points: 0, medal: null };
}

function starsLabel(stars: number) {
  if (stars >= 3) return '⭐⭐⭐ 3 Stars';
  if (stars === 2) return '⭐⭐ 2 Stars';
  if (stars === 1) return '⭐ 1 Star';
  return '— No Star';
}

function formatTime(seconds?: number | null) {
  const s = Math.max(0, Math.round(seconds ?? 0));
  return `00:${String(s).padStart(2, '0')}`;
}

function formatQuestionType(type: string) {
  if (type === 'multiple-choice') return 'Multiple Choice';
  if (type === 'identification') return 'Identification';
  if (type === 'enumeration') return 'Enumeration';
  return type;
}

type Phase = 'hint' | 'question' | 'success' | 'incorrect';

export default function ActivityPlayScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    category: string;
    label: string;
    color: string;
    activityType: string;
    level: string;
    activityNum: string;
    difficulty: string;
  }>();
  const { category, label, color, activityType, difficulty } = params;
  const level = toNum(params.level, 1);
  const activityNum = toNum(params.activityNum, 1);
  const { completeActivity, failActivity } = useGameProgress();
  const { addResult } = useStudentResults();
  const { name: studentName } = useUser();
  // Admin can turn the "Mini-Lesson" hint step off app-wide (Content Manager).
  const { showMiniLesson, ready: adminReady } = useAdminContent();

  const q = getQuizQuestion(category, level, activityNum);
  // Number of input "tabs" to show for Enumeration — the Admin's required
  // count (falls back to the pool size, or 1, if somehow unset).
  const requiredAnswers = q.type === 'enumeration' ? Math.max(1, q.requiredAnswers || q.answerPool?.length || 1) : 0;

  const [phase, setPhase] = useState<Phase>('hint');
  const [choices, setChoices] = useState<string[]>(() => (q.choices ? shuffleChoices(q.choices) : []));
  const [textAnswer, setTextAnswer] = useState('');
  const [enumAnswers, setEnumAnswers] = useState<string[]>(() => Array(requiredAnswers).fill(''));
  const [result, setResult] = useState<(ActivityTimerResult & { stars: number }) | null>(null);
  const [enumCorrectCount, setEnumCorrectCount] = useState(0);
  const [attemptKey, setAttemptKey] = useState(0);

  const timerRef = useRef<ActivityTimerHandle>(null);

  // Once the admin setting has loaded, skip straight to the question if
  // Mini-Lesson is turned off — but only while we're still sitting on the
  // 'hint' phase (don't yank the player out of question/success/incorrect).
  useEffect(() => {
    if (adminReady && !showMiniLesson) {
      setPhase((p) => (p === 'hint' ? 'question' : p));
    }
  }, [adminReady, showMiniLesson]);

  const isCorrect = (given: string) =>
    given.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();

  // Enumeration: every tab must be filled, must match a distinct entry in
  // the Admin's answer pool (case-insensitive), and no repeats across tabs.
  // Returns how many of the given answers were valid pool matches (used
  // both to decide pass/fail and to show "X / Y correct" in the popups).
  const checkEnumerationAnswers = (given: string[]) => {
    const pool = new Set((q.answerPool || []).map((a) => a.trim().toLowerCase()));
    const seen = new Set<string>();
    let correctCount = 0;
    for (const raw of given) {
      const norm = raw.trim().toLowerCase();
      if (!norm) continue;
      if (pool.has(norm) && !seen.has(norm)) {
        seen.add(norm);
        correctCount++;
      }
    }
    const allFilled = given.every((a) => a.trim().length > 0);
    const passed = allFilled && correctCount === requiredAnswers;
    return { correctCount, passed };
  };

  const handleStartQuestion = () => setPhase('question');

  // One shot per attempt: right answer scores based on time left; anything
  // else (wrong choice, or leaving without answering) ends the attempt as a
  // 🚩 red-flag "Needs Retry" — no in-place reshuffle/retry anymore.
  const recordFailedAttempt = (timerResult: ActivityTimerResult, timedOut: boolean, correctCount?: number) => {
    setResult({ ...timerResult, medal: null, points: 0, stars: 0 });
    if (typeof correctCount === 'number') setEnumCorrectCount(correctCount);
    addResult({
      studentName,
      category,
      activityType: 'quiz',
      level,
      activityNum,
      medal: null,
      points: 0,
      timeUsed: timerResult.timeUsed,
      timedOut,
      ...(q.type === 'enumeration'
        ? { correctCount: correctCount ?? 0, requiredCount: requiredAnswers }
        : {}),
    });
    failActivity(category, activityType, level, activityNum);
    setPhase('incorrect');
  };

  const recordPassedAttempt = (timerResult: ActivityTimerResult, correctCount?: number) => {
    const score = computeQuizScore(timerResult.timeRemaining);
    setResult({ ...timerResult, medal: score.medal, points: score.points, stars: score.stars });
    if (typeof correctCount === 'number') setEnumCorrectCount(correctCount);
    addResult({
      studentName,
      category,
      activityType: 'quiz',
      level,
      activityNum,
      medal: score.medal,
      points: score.points,
      timeUsed: timerResult.timeUsed,
      timedOut: false,
      ...(q.type === 'enumeration'
        ? { correctCount: correctCount ?? requiredAnswers, requiredCount: requiredAnswers }
        : {}),
    });
    completeActivity(category, activityType, level, activityNum);
    setPhase('success');
  };

  const handleAnswer = (given: string) => {
    if (phase !== 'question') return;
    const timerResult = timerRef.current?.stop();
    if (!timerResult) return;

    if (isCorrect(given)) {
      recordPassedAttempt(timerResult);
    } else {
      recordFailedAttempt(timerResult, false);
    }
  };

  // Enumeration: submits all filled tabs at once.
  const handleSubmitEnumeration = () => {
    if (phase !== 'question') return;
    const timerResult = timerRef.current?.stop();
    if (!timerResult) return;

    const { correctCount, passed } = checkEnumerationAnswers(enumAnswers);
    if (passed) {
      recordPassedAttempt(timerResult, correctCount);
    } else {
      recordFailedAttempt(timerResult, false, correctCount);
    }
  };

  const updateEnumAnswer = (index: number, value: string) => {
    setEnumAnswers((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleExpire = (timerResult: ActivityTimerResult) => {
    if (phase === 'success' || phase === 'incorrect') return;
    if (q.type === 'enumeration') {
      const { correctCount } = checkEnumerationAnswers(enumAnswers);
      recordFailedAttempt(timerResult, true, correctCount);
    } else {
      recordFailedAttempt(timerResult, true);
    }
  };

  // Leaving the question unanswered (Back button) also counts as "left
  // unanswered" per spec — same 🚩 red-flag outcome as a wrong answer.
  const handleBackPress = () => {
    if (phase === 'question') {
      const timerResult = timerRef.current?.stop();
      if (timerResult) {
        if (q.type === 'enumeration') {
          const { correctCount } = checkEnumerationAnswers(enumAnswers);
          recordFailedAttempt(timerResult, false, correctCount);
        } else {
          recordFailedAttempt(timerResult, false);
        }
      }
    } else {
      router.back();
    }
  };

  const handleContinue = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { backgroundColor: color }]}>
        <Text style={styles.headerTitle}>{label} — Level {level}</Text>
        <View style={styles.statsRow}>
          <ActivityTimer
            key={attemptKey}
            ref={timerRef}
            durationSeconds={60}
            color={color}
            isPaused={phase === 'hint' || phase === 'success' || phase === 'incorrect'}
            onExpire={handleExpire}
          />
          <Text style={styles.statText}>★ Activity {activityNum}</Text>
        </View>
        <Text style={styles.headerSubtitle}>📝 Quiz · {difficulty} · {formatQuestionType(q.type)}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {phase === 'hint' && (
          <View style={styles.hintCard}>
            <Text style={styles.hintLabel}>💡 Mini-Lesson</Text>
            <Text style={styles.hintText}>{q.hint}</Text>
            <TouchableOpacity style={[styles.primaryButton, { backgroundColor: color }]} onPress={handleStartQuestion}>
              <Text style={styles.primaryButtonText}>Simulan ang Tanong</Text>
            </TouchableOpacity>
          </View>
        )}

        {phase === 'question' && (
          <View style={styles.questionCard}>
            <Text style={styles.questionText}>{q.question}</Text>

            {q.type === 'multiple-choice' && (
              <View style={styles.choicesWrap}>
                {choices.map((choice) => (
                  <TouchableOpacity
                    key={choice}
                    style={[styles.choiceButton, { borderColor: color }]}
                    onPress={() => handleAnswer(choice)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.choiceText, { color }]}>{choice}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {q.type === 'identification' && (
              <View style={styles.identificationWrap}>
                <TextInput
                  style={styles.textInput}
                  value={textAnswer}
                  onChangeText={setTextAnswer}
                  placeholder="I-type ang iyong sagot..."
                  placeholderTextColor="#A0A0A0"
                />
                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: color }]}
                  onPress={() => handleAnswer(textAnswer)}
                >
                  <Text style={styles.primaryButtonText}>Isumite</Text>
                </TouchableOpacity>
              </View>
            )}

            {q.type === 'enumeration' && (
              <View style={styles.identificationWrap}>
                <Text style={styles.enumHelper}>
                  Punuan ang {requiredAnswers} kahon sa ibaba ({enumAnswers.filter((a) => a.trim()).length}/{requiredAnswers} napunuan)
                </Text>
                {enumAnswers.map((val, i) => (
                  <View key={i} style={styles.enumRow}>
                    <View style={[styles.enumIndexBadge, { backgroundColor: color }]}>
                      <Text style={styles.enumIndexText}>{i + 1}</Text>
                    </View>
                    <TextInput
                      style={[styles.textInput, styles.enumInput]}
                      value={val}
                      onChangeText={(text) => updateEnumAnswer(i, text)}
                      placeholder={`Sagot ${i + 1}...`}
                      placeholderTextColor="#A0A0A0"
                    />
                  </View>
                ))}
                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: color }]}
                  onPress={handleSubmitEnumeration}
                >
                  <Text style={styles.primaryButtonText}>Isumite ang Kumpletong Sagot</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      {/* Option A: PASSED */}
      <Modal visible={phase === 'success'} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.successTitle}>✅ Activity Complete!</Text>
            <View style={styles.detailBlock}>
              <Text style={styles.detailLine}>Student: {studentName}</Text>
              <Text style={styles.detailLine}>⏱ Time: {formatTime(result?.timeUsed)}</Text>
              <Text style={styles.detailLine}>⭐ Stars Earned: {starsLabel(result?.stars ?? 0)}</Text>
              <Text style={styles.detailLine}>💯 Points: {result?.points ?? 0} pts</Text>
              {q.type === 'enumeration' && (
                <Text style={styles.detailLine}>📋 Answers: {enumCorrectCount}/{requiredAnswers} correct</Text>
              )}
              <Text style={styles.detailLine}>📂 Category: {label}</Text>
              <Text style={styles.detailLine}>🎮 Activity Type: Quiz ({formatQuestionType(q.type)})</Text>
              <Text style={styles.detailLine}>🔢 Activity #: {activityNum} of 6 · Level {level}/5</Text>
            </View>
            <TouchableOpacity style={[styles.continueButton, { backgroundColor: color }]} onPress={handleContinue}>
              <Text style={styles.continueButtonText}>Proceed to Next Activity</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Option B: FAILED / RED FLAG */}
      <Modal visible={phase === 'incorrect'} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.timeUpTitle}>❌ Activity Complete (Incorrect)</Text>
            <View style={styles.detailBlock}>
              <Text style={styles.detailLine}>Student: {studentName}</Text>
              <Text style={styles.detailLine}>⏱ Time: {formatTime(result?.timeUsed)}</Text>
              <Text style={[styles.detailLine, styles.flagLine]}>🚩 Status: Failed / Incorrect (Needs Retry)</Text>
              <Text style={styles.detailLine}>💯 Points: 0 pts</Text>
              {q.type === 'enumeration' && (
                <Text style={styles.detailLine}>📋 Answers: {enumCorrectCount}/{requiredAnswers} correct</Text>
              )}
              <Text style={styles.detailLine}>📂 Category: {label}</Text>
              <Text style={styles.detailLine}>🎮 Activity Type: Quiz ({formatQuestionType(q.type)})</Text>
              <Text style={styles.detailLine}>🔢 Activity #: {activityNum} of 6 · Level {level}/5</Text>
            </View>
            <TouchableOpacity style={[styles.continueButton, { backgroundColor: color }]} onPress={handleContinue}>
              <Text style={styles.continueButtonText}>Proceed to other Activity — maybe you can answer it, try it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5EFE0' },
  header: { alignItems: 'center', paddingVertical: 14, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerTitle: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  statsRow: { flexDirection: 'row', gap: 20, marginTop: 8 },
  statText: { color: '#FCD116', fontWeight: 'bold', fontSize: 14 },
  headerSubtitle: { color: '#FFF', fontSize: 12, marginTop: 8, opacity: 0.9 },
  body: { padding: 20, alignItems: 'center' },
  hintCard: {
    width: '100%', backgroundColor: '#FFF', borderRadius: 16, padding: 18,
    borderWidth: 2, borderColor: '#E0D5BE', alignItems: 'center',
  },
  hintLabel: { fontSize: 13, fontWeight: 'bold', color: '#8E8E93', marginBottom: 8 },
  hintText: { fontSize: 14.5, color: '#2B2B2B', lineHeight: 21, marginBottom: 18, textAlign: 'left' },
  questionCard: { width: '100%', backgroundColor: '#FFF', borderRadius: 16, padding: 18, borderWidth: 2, borderColor: '#E0D5BE' },
  questionText: { fontSize: 17, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 14, textAlign: 'center' },
  choicesWrap: { gap: 10 },
  choiceButton: { borderWidth: 2, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16 },
  choiceText: { fontWeight: 'bold', fontSize: 15, textAlign: 'center' },
  identificationWrap: { gap: 14 },
  textInput: {
    borderWidth: 2, borderColor: '#D0D0D0', borderRadius: 14, paddingVertical: 12,
    paddingHorizontal: 14, fontSize: 15, color: '#1A1A1A',
  },
  enumHelper: { fontSize: 12.5, color: '#8E8E93', marginBottom: 2 },
  enumRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  enumIndexBadge: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  enumIndexText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  enumInput: { flex: 1, marginBottom: 0 },
  primaryButton: { paddingVertical: 14, borderRadius: 25, alignItems: 'center' },
  primaryButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
  backButton: { alignSelf: 'center', backgroundColor: '#5C3A21', paddingVertical: 10, paddingHorizontal: 24, borderRadius: 20, marginBottom: 20 },
  backButtonText: { color: '#FFF', fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { backgroundColor: '#FFFDF7', borderRadius: 20, padding: 20, width: '100%', alignItems: 'center' },
  successTitle: { fontSize: 18, fontWeight: 'bold', color: '#3E9E4F', marginBottom: 14, textAlign: 'center' },
  timeUpTitle: { fontSize: 18, fontWeight: 'bold', color: '#C4304A', marginBottom: 14, textAlign: 'center' },
  detailBlock: { width: '100%', marginBottom: 18, gap: 5 },
  detailLine: { fontSize: 13.5, color: '#2B2B2B', lineHeight: 19 },
  flagLine: { color: '#C4304A', fontWeight: 'bold' },
  continueButton: { width: '100%', paddingVertical: 14, borderRadius: 25, alignItems: 'center' },
  continueButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 15, textAlign: 'center' },
});