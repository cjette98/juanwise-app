import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGameProgress } from '@/features/learning/context/game-progress-context';
import { useAdminContent } from '@/features/admin/context/admin-content-context';
import ActivityTimer, { ActivityTimerHandle, ActivityTimerResult } from '@/shared/components/activity-timer';
import { starsForMedal, useStudentResults } from '@/features/results/context/student-results-context';
import { useUser } from '@/features/auth/context/user-context';
import { errorMessage } from '@/shared/api';
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

// Points and the medal behind the star rating are awarded by the API
// (`POST /results` → juanwise-be `results/scoring.ts`) from what this screen
// reports: how many required answers were correct, the time used, and whether
// the clock ran out. The client no longer decides what an attempt is worth, so
// a tampered payload cannot mint points and the leaderboard can never disagree
// with the score the student just saw.
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
  // Content and the app-wide "Mini-Lesson" toggle both come from the content
  // module now, so an admin's edit reaches every student's device.
  const { showMiniLesson, ready: adminReady, getEffectiveQuestion } = useAdminContent();

  const q = useMemo(
    () => getEffectiveQuestion(category, level, activityNum),
    [getEffectiveQuestion, category, level, activityNum],
  );
  // `getEffectiveQuestion` builds a fresh object each call, so identity is not a
  // usable dependency — key the reset effects on the content itself instead.
  const questionSignature = `${q.type}|${q.question}|${(q.choices ?? []).join('~')}|${q.requiredAnswers ?? ''}`;

  // Number of input "tabs" to show for Enumeration — the Admin's required
  // count (falls back to the pool size, or 1, if somehow unset).
  const requiredAnswers = q.type === 'enumeration' ? Math.max(1, q.requiredAnswers || q.answerPool?.length || 1) : 0;

  const [phase, setPhase] = useState<Phase>('hint');
  const [choices, setChoices] = useState<string[]>([]);
  const [textAnswer, setTextAnswer] = useState('');
  const [enumAnswers, setEnumAnswers] = useState<string[]>([]);
  const [result, setResult] = useState<(ActivityTimerResult & { stars: number; points: number }) | null>(null);
  const [enumCorrectCount, setEnumCorrectCount] = useState(0);
  const [queued, setQueued] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [attemptKey] = useState(0);

  const timerRef = useRef<ActivityTimerHandle>(null);

  // The question can arrive (or change) after the first render, once the
  // content fetch lands — re-shuffle the choices and re-size the enumeration
  // boxes when it does.
  useEffect(() => {
    setChoices(q.choices ? shuffleChoices(q.choices) : []);
    setEnumAnswers(Array(requiredAnswers).fill(''));
    setTextAnswer('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionSignature, requiredAnswers]);

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

  /**
   * One shot per attempt. What the screen reports is only what it observed —
   * how many required answers were right, the time used, whether the clock ran
   * out. The API turns that into points and a medal and advances progress in
   * the same call, then this shows back what the server actually awarded.
   */
  const recordAttempt = async (
    timerResult: ActivityTimerResult,
    passed: boolean,
    timedOut: boolean,
    correctCount?: number,
  ) => {
    if (typeof correctCount === 'number') setEnumCorrectCount(correctCount);

    const requiredCount = q.type === 'enumeration' ? requiredAnswers : 1;
    const observedCorrect =
      q.type === 'enumeration' ? (correctCount ?? 0) : passed ? 1 : 0;

    setSubmitting(true);
    try {
      const { result: recorded, queued: wasQueued } = await addResult({
        category,
        activityType: 'quiz',
        level,
        activityNum,
        timeUsed: timerResult.timeUsed,
        timedOut,
        correctCount: observedCorrect,
        requiredCount,
      });

      setQueued(wasQueued);
      setResult({
        ...timerResult,
        medal: recorded.medal,
        points: recorded.points,
        stars: starsForMedal(recorded.medal),
      });

      if (recorded.medal) {
        await completeActivity(category, activityType, level, activityNum);
        setPhase('success');
      } else {
        await failActivity(category, activityType, level, activityNum);
        setPhase('incorrect');
      }
    } catch (err) {
      // Only a payload the server refuses outright lands here — an outage is
      // queued by addResult instead. Let the student retry rather than
      // silently losing the attempt.
      Alert.alert('Hindi Naitala', errorMessage(err, 'Hindi naitala ang sagot mo. Subukan ulit.'));
      setPhase('question');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAnswer = (given: string) => {
    if (phase !== 'question' || submitting) return;
    const timerResult = timerRef.current?.stop();
    if (!timerResult) return;
    void recordAttempt(timerResult, isCorrect(given), false);
  };

  // Enumeration: submits all filled tabs at once.
  const handleSubmitEnumeration = () => {
    if (phase !== 'question' || submitting) return;
    const timerResult = timerRef.current?.stop();
    if (!timerResult) return;

    const { correctCount, passed } = checkEnumerationAnswers(enumAnswers);
    void recordAttempt(timerResult, passed, false, correctCount);
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
    const correctCount =
      q.type === 'enumeration' ? checkEnumerationAnswers(enumAnswers).correctCount : undefined;
    void recordAttempt(timerResult, false, true, correctCount);
  };

  // Leaving the question unanswered (Back button) also counts as "left
  // unanswered" per spec — same 🚩 red-flag outcome as a wrong answer.
  const handleBackPress = () => {
    if (phase === 'question') {
      if (submitting) return;
      const timerResult = timerRef.current?.stop();
      if (timerResult) {
        const correctCount =
          q.type === 'enumeration' ? checkEnumerationAnswers(enumAnswers).correctCount : undefined;
        void recordAttempt(timerResult, false, false, correctCount);
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
        {!adminReady && (
          <View style={styles.hintCard}>
            <ActivityIndicator color={color} />
            <Text style={styles.loadingText}>Kinukuha ang pinakabagong tanong...</Text>
          </View>
        )}

        {adminReady && phase === 'hint' && (
          <View style={styles.hintCard}>
            <Text style={styles.hintLabel}>💡 Mini-Lesson</Text>
            <Text style={styles.hintText}>{q.hint}</Text>
            <TouchableOpacity style={[styles.primaryButton, { backgroundColor: color }]} onPress={handleStartQuestion}>
              <Text style={styles.primaryButtonText}>Simulan ang Tanong</Text>
            </TouchableOpacity>
          </View>
        )}

        {adminReady && phase === 'question' && (
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
              {queued && <Text style={styles.queuedLine}>📶 Offline — ipapadala ang resultang ito pagbalik ng internet.</Text>}
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
              {queued && <Text style={styles.queuedLine}>📶 Offline — ipapadala ang resultang ito pagbalik ng internet.</Text>}
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
  queuedLine: { fontSize: 12.5, color: '#8A5A2B', fontStyle: 'italic', marginTop: 4 },
  loadingText: { fontSize: 13, color: '#8E8E93', marginTop: 10 },
  continueButton: { width: '100%', paddingVertical: 14, borderRadius: 25, alignItems: 'center' },
  continueButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 15, textAlign: 'center' },
});