import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, TextInput, ScrollView, ActivityIndicator, Image, Alert } from 'react-native';
import { useGameProgress } from '@/features/learning/context/game-progress-context';
import { useClassContent } from '@/features/learning/context/class-content-context';
import ActivityTimer, { ActivityTimerHandle, ActivityTimerResult } from '@/shared/components/activity-timer';
import { starsForMedal, useStudentResults } from '@/features/results/context/student-results-context';
import { useUser } from '@/features/auth/context/user-context';
import { ApiError, errorMessage } from '@/shared/api';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { toNum } from '@/shared/lib/params';
import { matchesIdentificationAnswer } from '@/features/learning/lib/answer-matching';
import { Screen, ScreenHeader, Card, Button, Icon, StarRow, H1, H2, Body, BodyStrong, Label, Caption } from '@/shared/components/ui';
import { tokens, categoryColor } from '@/shared/theme/tokens';
import { triesLeft } from '@/features/learning/lib/attempt-rules';
import { useLanguage, type TranslationKey } from '@/shared/i18n/language-context';
import { difficultyLabelKey } from '@/features/learning/lib/activity-list-model';
import { useSound } from '@/shared/audio/sound-context';
import { getCategoryMeta } from '@/shared/content/category-meta';

function shuffleChoices(choices: string[]) {
  const arr = [...choices];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function formatTime(seconds?: number | null) {
  const s = Math.max(0, Math.round(seconds ?? 0));
  return `00:${String(s).padStart(2, '0')}`;
}

const QUESTION_TYPE_KEYS: Record<string, TranslationKey> = {
  'multiple-choice': 'typeMultipleChoice',
  identification: 'typeIdentification',
  enumeration: 'typeEnumeration',
};

const CHOICE_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

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
  const { category, color, activityType, difficulty } = params;
  const level = toNum(params.level, 1);
  const activityNum = toNum(params.activityNum, 1);
  const { t } = useLanguage();
  const label = t(getCategoryMeta(category).labelKey) || params.label;
  const questionTypeLabel = (type: string) => (QUESTION_TYPE_KEYS[type] ? t(QUESTION_TYPE_KEYS[type]) : type);
  const { recordOutcome, refresh: refreshProgress } = useGameProgress();
  const { addResult } = useStudentResults();
  const { name: studentName } = useUser();
  // Content and the app-wide "Mini-Lesson" toggle both come from the content
  // module now, so an admin's edit reaches every student's device.
  const { showMiniLesson, ready: adminReady, getEffectiveQuestion } = useClassContent();

  const headerColor = color || tokens.color.primary;
  const cat = categoryColor(category);

  const q = useMemo(
    () => getEffectiveQuestion(category, level, activityNum),
    [getEffectiveQuestion, category, level, activityNum],
  );
  // `getEffectiveQuestion` builds a fresh object each call, so identity is not a
  // usable dependency — key the reset effects on the content itself instead.
  // The answers are part of the signature too: an admin can edit only the
  // accepted spellings of an identification question, and the typed answer must
  // still be cleared when that lands.
  const questionSignature = [
    q.type,
    q.question,
    (q.choices ?? []).join('~'),
    q.requiredAnswers ?? '',
    q.correctAnswer,
    (q.acceptedAnswers ?? []).join('~'),
    (q.answerPool ?? []).join('~'),
  ].join('|');

  // Number of input "tabs" to show for Enumeration — the Admin's required
  // count (falls back to the pool size, or 1, if somehow unset).
  const requiredAnswers = q.type === 'enumeration' ? Math.max(1, q.requiredAnswers || q.answerPool?.length || 1) : 0;

  const { playSfx } = useSound();
  const [phase, setPhase] = useState<Phase>('hint');
  const [choices, setChoices] = useState<string[]>([]);
  const [textAnswer, setTextAnswer] = useState('');
  const [enumAnswers, setEnumAnswers] = useState<string[]>([]);
  const [result, setResult] = useState<(ActivityTimerResult & { stars: number; points: number }) | null>(null);
  const [enumCorrectCount, setEnumCorrectCount] = useState(0);
  const [queued, setQueued] = useState(false);
  const [attemptSeq, setAttemptSeq] = useState(0);
  // After a fail: how many tries remain, or that the activity is now closed.
  const triesLine = (seq: number) => {
    const left = triesLeft(seq);
    return left > 0
      ? t('triesLeftAfterFail', { n: left, tries: t(left === 1 ? 'tryWordOne' : 'tryWordMany') })
      : t('activityFinishedNoTries');
  };
  const [submitting, setSubmitting] = useState(false);
  /**
   * The answer the student just gave and whether it was right, set on the tap
   * itself rather than when the server replies (evaluation items 3.1 and 4.1).
   * Waiting for the round trip left the screen looking dead, so students tapped
   * again; the grading is local anyway — the server only decides the points.
   */
  const [picked, setPicked] = useState<{ value: string; correct: boolean } | null>(null);
  const [attemptKey] = useState(0);

  const timerRef = useRef<ActivityTimerHandle>(null);

  // The question can arrive (or change) after the first render, once the
  // content fetch lands — re-shuffle the choices and re-size the enumeration
  // boxes when it does.
  useEffect(() => {
    setChoices(q.choices ? shuffleChoices(q.choices) : []);
    setEnumAnswers(Array(requiredAnswers).fill(''));
    setTextAnswer('');
    setPicked(null);
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

  // Identification accepts the alternative spellings the admin listed; every
  // other type keeps the single case-insensitive comparison it always had.
  const isCorrect = (given: string) =>
    q.type === 'identification'
      ? matchesIdentificationAnswer(given, q.correctAnswer, q.acceptedAnswers)
      : given.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();

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

  const handleStartQuestion = () => {
    playSfx('tap');
    setPhase('question');
  };

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
      setAttemptSeq(recorded.attemptSeq);
      setResult({
        ...timerResult,
        medal: recorded.medal,
        points: recorded.points,
        stars: starsForMedal(recorded.medal),
      });

      if (recorded.medal) {
        recordOutcome(category, activityType, level, activityNum, true, recorded.attemptSeq, { queued: wasQueued });
        setPhase('success');
      } else {
        recordOutcome(category, activityType, level, activityNum, false, recorded.attemptSeq, { queued: wasQueued });
        setPhase('incorrect');
      }
    } catch (err) {
      // Only a payload the server refuses outright lands here — an outage is
      // queued by addResult instead. Let the student retry rather than
      // silently losing the attempt.
      if (err instanceof ApiError && err.status === 409) {
        // The server has no try left for this activity (cap reached or already
        // passed). Retrying here can never succeed, so sync the cards and leave.
        void refreshProgress();
        Alert.alert(t('notRecordedTitle'), errorMessage(err, t('notRecordedAnswerMsg')), [
          { text: t('okBtn'), onPress: () => router.back() },
        ], { cancelable: false });
        return;
      }
      Alert.alert(t('notRecordedTitle'), errorMessage(err, t('notRecordedAnswerMsg')));
      setPicked(null);
      setPhase('question');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAnswer = (given: string) => {
    if (phase !== 'question' || submitting) return;
    const correct = isCorrect(given);
    // Mark and sound the answer on this frame; the pop-up follows when the
    // server has scored it.
    setPicked({ value: given, correct });
    playSfx(correct ? 'correct' : 'wrong');
    const timerResult = timerRef.current?.stop();
    if (!timerResult) return;
    void recordAttempt(timerResult, correct, false);
  };

  // Enumeration: submits all filled tabs at once.
  const handleSubmitEnumeration = () => {
    if (phase !== 'question' || submitting) return;
    const { correctCount, passed } = checkEnumerationAnswers(enumAnswers);
    setPicked({ value: enumAnswers.join('|'), correct: passed });
    playSfx(passed ? 'correct' : 'wrong');
    const timerResult = timerRef.current?.stop();
    if (!timerResult) return;

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
    playSfx('wrong');
    const correctCount =
      q.type === 'enumeration' ? checkEnumerationAnswers(enumAnswers).correctCount : undefined;
    void recordAttempt(timerResult, false, true, correctCount);
  };

  // Leaving the question unanswered (Back button) also counts as "left
  // unanswered" per spec — same red-flag outcome as a wrong answer.
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

  const filledCount = enumAnswers.filter((a) => a.trim()).length;
  const answerBoxTint = picked
    ? { borderColor: picked.correct ? tokens.color.success : tokens.color.danger }
    : null;

  return (
    <Screen>
      <ScreenHeader
        title={t('headerLevelTitle', { label, level })}
        subtitle={t('quizPlaySubtitle', {
          type: questionTypeLabel(q.type),
          difficulty: t(difficultyLabelKey(difficulty)),
          num: activityNum,
        })}
        color={headerColor}
        right={
          <ActivityTimer
            key={attemptKey}
            ref={timerRef}
            durationSeconds={60}
            color={color}
            isPaused={phase === 'hint' || phase === 'success' || phase === 'incorrect'}
            onExpire={handleExpire}
          />
        }
      />

      <ScrollView contentContainerStyle={styles.body}>
        {!adminReady && (
          <Card style={styles.hintCard}>
            <ActivityIndicator color={headerColor} />
            <Body style={styles.loadingText}>{t('fetchingQuestion')}</Body>
          </Card>
        )}

        {adminReady && phase === 'hint' && (
          <Card style={styles.hintCard}>
            <View style={[styles.hintChip, { backgroundColor: tokens.color.goldSoft }]}>
              <Icon name="lightbulb" size={26} color={tokens.color.goldDark} />
            </View>
            <Label style={styles.hintLabel}>{t('miniLessonHeading')}</Label>
            {/* The picture an admin uploaded for this exact mini-lesson. Only a
                quiz question can carry one, and only when somebody illustrated
                it — an unillustrated question keeps the text-only card it had. */}
            {!!q.miniLessonImageUrl && (
              <Image
                source={{ uri: q.miniLessonImageUrl }}
                style={styles.hintImage}
                resizeMode="cover"
              />
            )}
            <Body style={styles.hintText}>{q.hint}</Body>
            <Button label={t('startQuestion')} onPress={handleStartQuestion} color={cat.base} shadowColor={cat.dark} style={styles.fullWidthButton} />
          </Card>
        )}

        {adminReady && phase === 'question' && (
          <Card style={styles.questionCard}>
            <H1 style={styles.questionText}>{q.question}</H1>

            {q.type === 'multiple-choice' && (
              <View style={styles.choicesWrap}>
                {choices.map((choice, i) => {
                  const isPicked = picked?.value === choice;
                  // Green or red the instant it is tapped; the others fade so
                  // the marked one is unmistakable, and nothing stays tappable.
                  const tint = isPicked
                    ? picked.correct
                      ? { line: tokens.color.success, fill: tokens.color.successSoft, ink: tokens.color.successInk }
                      : { line: tokens.color.danger, fill: tokens.color.dangerSoft, ink: tokens.color.dangerInk }
                    : null;
                  return (
                    <TouchableOpacity
                      key={choice}
                      style={[
                        styles.choiceRow,
                        { borderColor: tint?.line ?? headerColor },
                        tint && { backgroundColor: tint.fill },
                        picked && !isPicked && styles.choiceRowFaded,
                      ]}
                      onPress={() => handleAnswer(choice)}
                      disabled={!!picked || submitting}
                      activeOpacity={0.75}
                      accessibilityRole="button"
                      accessibilityState={{ disabled: !!picked, selected: isPicked }}
                    >
                      <View style={[styles.choiceChip, { backgroundColor: tint?.line ?? headerColor }]}>
                        {isPicked ? (
                          <Icon
                            name={picked.correct ? 'check' : 'close'}
                            size={18}
                            color={tokens.color.onDark}
                            strokeWidth={3}
                          />
                        ) : (
                          <BodyStrong style={styles.choiceChipText}>{CHOICE_LETTERS[i] ?? i + 1}</BodyStrong>
                        )}
                      </View>
                      <Body style={[styles.choiceText, { color: tint?.ink ?? headerColor }]}>{choice}</Body>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {q.type === 'identification' && (
              <View style={styles.identificationWrap}>
                <TextInput
                  style={[styles.textInput, answerBoxTint]}
                  value={textAnswer}
                  onChangeText={setTextAnswer}
                  editable={!picked && !submitting}
                  placeholder={t('typeYourAnswer')}
                  placeholderTextColor={tokens.color.inkFaint}
                />
                <Button
                  label={t('submitBtn')}
                  onPress={() => handleAnswer(textAnswer)}
                  disabled={!!picked || submitting}
                  color={cat.base}
                  shadowColor={cat.dark}
                  style={styles.fullWidthButton}
                />
              </View>
            )}

            {q.type === 'enumeration' && (
              <View style={styles.identificationWrap}>
                <Caption style={styles.enumHelper}>
                  {t('enumHelper', { required: requiredAnswers, filled: filledCount })}
                </Caption>
                {enumAnswers.map((val, i) => (
                  <View key={i} style={styles.enumRow}>
                    <View style={[styles.enumIndexBadge, { backgroundColor: headerColor }]}>
                      <Label style={styles.enumIndexText}>{i + 1}</Label>
                    </View>
                    <TextInput
                      style={[styles.textInput, styles.enumInput, answerBoxTint]}
                      value={val}
                      onChangeText={(text) => updateEnumAnswer(i, text)}
                      editable={!picked && !submitting}
                      placeholder={t('answerNPlaceholder', { n: i + 1 })}
                      placeholderTextColor={tokens.color.inkFaint}
                    />
                  </View>
                ))}
                <Button
                  label={t('submitCompleteAnswer')}
                  onPress={handleSubmitEnumeration}
                  disabled={!!picked || submitting}
                  color={cat.base}
                  shadowColor={cat.dark}
                  style={styles.fullWidthButton}
                />
              </View>
            )}
            {submitting && (
              <View style={styles.scoringRow}>
                <ActivityIndicator color={headerColor} />
                <Caption style={styles.scoringText}>{t('scoringAnswer')}</Caption>
              </View>
            )}
          </Card>
        )}
      </ScrollView>

      <TouchableOpacity style={styles.backButton} onPress={handleBackPress} activeOpacity={0.85}>
        <Icon name="chevronLeft" size={16} color={tokens.color.onDark} strokeWidth={3} />
        <BodyStrong style={styles.backButtonText}>{t('backA11y')}</BodyStrong>
      </TouchableOpacity>

      {/* Option A: PASSED */}
      <Modal visible={phase === 'success'} transparent animationType="fade">
        <View style={styles.modalRoot}>
          <View style={styles.modalBackdrop} />
          <Card style={styles.sheetCard}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetTitleRow}>
              <View style={[styles.sheetTitleIcon, { backgroundColor: tokens.color.successSoft }]}>
                <Icon name="check" size={22} color={tokens.color.success} strokeWidth={3} />
              </View>
              <H2 style={styles.successTitle}>{t('activityCompleteTitle')}</H2>
            </View>
            <View style={styles.detailBlock}>
              <Body style={styles.detailLine}>{t('detailStudent', { name: studentName })}</Body>
              <View style={styles.detailRow}>
                <Icon name="clock" size={15} color={tokens.color.inkMuted} />
                <Body style={styles.detailLine}>{t('detailTime', { time: formatTime(result?.timeUsed) })}</Body>
              </View>
              <View style={styles.detailRow}>
                <Body style={styles.detailLine}>{t('starsEarnedLabel')}</Body>
                <StarRow earned={result?.stars ?? 0} />
              </View>
              <Body style={styles.detailLine}>{t('detailPoints', { points: result?.points ?? 0 })}</Body>
              {q.type === 'enumeration' && (
                <Body style={styles.detailLine}>{t('detailAnswersCorrect', { correct: enumCorrectCount, required: requiredAnswers })}</Body>
              )}
              <Body style={styles.detailLine}>{t('detailCategory', { label })}</Body>
              <Body style={styles.detailLine}>{t('detailActivityTypeQuiz', { type: questionTypeLabel(q.type) })}</Body>
              <Body style={styles.detailLine}>{t('detailQuestionCount', { num: activityNum, level })}</Body>
              {queued && <Caption style={styles.queuedLine}>{t('offlineQueuedNote')}</Caption>}
            </View>
            <Button label={t('proceedNextActivity')} onPress={handleContinue} color={cat.base} shadowColor={cat.dark} style={styles.fullWidthButton} />
          </Card>
        </View>
      </Modal>

      {/* Option B: FAILED / RED FLAG */}
      <Modal visible={phase === 'incorrect'} transparent animationType="fade">
        <View style={styles.modalRoot}>
          <View style={styles.modalBackdrop} />
          <Card style={styles.sheetCard}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetTitleRow}>
              <View style={[styles.sheetTitleIcon, { backgroundColor: tokens.color.dangerSoft }]}>
                <Icon name="close" size={22} color={tokens.color.danger} strokeWidth={3} />
              </View>
              <H2 style={styles.timeUpTitle}>{t('activityCompleteIncorrect')}</H2>
            </View>
            <View style={styles.detailBlock}>
              <Body style={styles.detailLine}>{t('detailStudent', { name: studentName })}</Body>
              <View style={styles.detailRow}>
                <Icon name="clock" size={15} color={tokens.color.inkMuted} />
                <Body style={styles.detailLine}>{t('detailTime', { time: formatTime(result?.timeUsed) })}</Body>
              </View>
              <View style={styles.detailRow}>
                <Icon name="flag" size={15} color={tokens.color.danger} />
                <BodyStrong style={styles.flagLine}>{t('statusFailedIncorrect')}</BodyStrong>
              </View>
              <Body style={styles.detailLine}>{t('pointsZero')}</Body>
              <Body style={styles.detailLine}>{triesLine(attemptSeq)}</Body>
              {q.type === 'enumeration' && (
                <Body style={styles.detailLine}>{t('detailAnswersCorrect', { correct: enumCorrectCount, required: requiredAnswers })}</Body>
              )}
              <Body style={styles.detailLine}>{t('detailCategory', { label })}</Body>
              <Body style={styles.detailLine}>{t('detailActivityTypeQuiz', { type: questionTypeLabel(q.type) })}</Body>
              <Body style={styles.detailLine}>{t('detailQuestionCount', { num: activityNum, level })}</Body>
              {queued && <Caption style={styles.queuedLine}>{t('offlineQueuedNote')}</Caption>}
            </View>
            <Button
              label={t('proceedOtherActivityAnswer')}
              onPress={handleContinue}
              color={cat.base}
              shadowColor={cat.dark}
              style={styles.fullWidthButton}
            />
          </Card>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { padding: tokens.space.xl, alignItems: 'center' },
  hintCard: { width: '100%', alignItems: 'center' },
  hintChip: {
    width: 48,
    height: 48,
    borderRadius: tokens.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: tokens.space.sm,
  },
  hintLabel: { marginBottom: tokens.space.sm },
  hintImage: {
    width: '100%',
    height: 160,
    borderRadius: tokens.radius.md,
    marginBottom: tokens.space.md,
    backgroundColor: tokens.color.surfaceSunken,
  },
  hintText: { marginBottom: tokens.space.lg, textAlign: 'left', alignSelf: 'stretch' },
  questionCard: { width: '100%' },
  questionText: { marginBottom: tokens.space.lg, textAlign: 'center' },
  choicesWrap: { gap: tokens.space.sm },
  choiceRowFaded: { opacity: 0.45 },
  scoringRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: tokens.space.sm, marginTop: tokens.space.lg },
  scoringText: { color: tokens.color.inkMuted },
  choiceRow: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.md,
    borderWidth: 2,
    borderRadius: tokens.radius.lg,
    paddingHorizontal: tokens.space.lg,
    backgroundColor: tokens.color.surface,
  },
  choiceChip: {
    width: 32,
    height: 32,
    borderRadius: tokens.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceChipText: { color: tokens.color.onDark },
  choiceText: { flex: 1, fontFamily: tokens.font.bodyBold },
  identificationWrap: { gap: tokens.space.lg, width: '100%' },
  textInput: {
    minHeight: 56,
    borderWidth: 2,
    borderColor: tokens.color.border,
    borderRadius: tokens.radius.lg,
    paddingHorizontal: tokens.space.lg,
    backgroundColor: tokens.color.surface,
    color: tokens.color.ink,
    ...tokens.type.body,
  },
  enumHelper: { marginBottom: -tokens.space.xs },
  enumRow: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm },
  enumIndexBadge: {
    width: 28,
    height: 28,
    borderRadius: tokens.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  enumIndexText: { color: tokens.color.onDark },
  enumInput: { flex: 1 },
  fullWidthButton: { width: '100%' },
  backButton: {
    alignSelf: 'center',
    flexDirection: 'row',
    minHeight: tokens.hit.min,
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.space.xs,
    backgroundColor: tokens.color.ink,
    paddingVertical: tokens.space.sm,
    paddingHorizontal: tokens.space.xl,
    borderRadius: tokens.radius.pill,
    marginBottom: tokens.space.lg,
  },
  backButtonText: { color: tokens.color.onDark },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: tokens.color.ink, opacity: 0.6 },
  sheetCard: {
    width: '100%',
    borderTopLeftRadius: tokens.radius.sheet,
    borderTopRightRadius: tokens.radius.sheet,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomWidth: 0,
    alignItems: 'center',
    paddingBottom: tokens.space.xxl,
  },
  sheetHandle: {
    width: 44,
    height: 5,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.color.border,
    marginBottom: tokens.space.lg,
  },
  sheetTitleRow: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm, marginBottom: tokens.space.lg },
  sheetTitleIcon: {
    width: 40,
    height: 40,
    borderRadius: tokens.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: { color: tokens.color.successInk, textAlign: 'center' },
  timeUpTitle: { color: tokens.color.dangerInk, textAlign: 'center' },
  detailBlock: { width: '100%', marginBottom: tokens.space.lg, gap: tokens.space.xs },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.xs },
  detailLine: { color: tokens.color.inkBody },
  flagLine: { color: tokens.color.dangerInk },
  queuedLine: { color: tokens.color.inkMuted, fontStyle: 'italic', marginTop: tokens.space.xs },
  loadingText: { marginTop: tokens.space.sm, color: tokens.color.inkMuted },
});
