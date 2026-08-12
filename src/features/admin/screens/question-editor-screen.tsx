import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAdminContent } from '@/features/admin/context/admin-content-context';
import { QuizType, MIN_ENUMERATION_POOL } from '@/shared/content/quiz-content';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { toNum } from '@/shared/lib/params';

export default function QuestionEditorScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    category: string;
    level: string;
    activityNum: string;
    categoryColor: string;
    categoryLabel: string;
  }>();
  const { category, categoryColor, categoryLabel } = params;
  const level = toNum(params.level, 1);
  const activityNum = toNum(params.activityNum, 1);
  const { getEffectiveQuestion, upsertQuestion } = useAdminContent();
  const existing = getEffectiveQuestion(category, level, activityNum);

  const [type, setType] = useState<QuizType>(existing.type);
  const [hint, setHint] = useState(existing.hint);
  const [question, setQuestion] = useState(existing.question);
  const [choices, setChoices] = useState<string[]>(existing.choices ?? ['', '', '', '']);
  const [correctAnswer, setCorrectAnswer] = useState(existing.correctAnswer);
  const [explanation, setExplanation] = useState(existing.explanation);
  // Enumeration-only: Admin's answer pool (min MIN_ENUMERATION_POOL) and
  // how many of those the player must correctly answer to pass.
  const [answerPool, setAnswerPool] = useState<string[]>(() => {
    const base = existing.answerPool ?? [];
    const padded = [...base];
    while (padded.length < MIN_ENUMERATION_POOL) padded.push('');
    return padded;
  });
  const [requiredAnswers, setRequiredAnswers] = useState(String(existing.requiredAnswers ?? 3));

  const updateChoice = (i: number, val: string) => {
    const next = [...choices];
    next[i] = val;
    setChoices(next);
  };

  const updatePoolAnswer = (i: number, val: string) => {
    const next = [...answerPool];
    next[i] = val;
    setAnswerPool(next);
  };

  const addPoolSlot = () => setAnswerPool((prev) => [...prev, '']);

  const removePoolSlot = (i: number) => {
    if (answerPool.length <= MIN_ENUMERATION_POOL) {
      Alert.alert('Minimum na Bilang', `Kailangan ng hindi bababa sa ${MIN_ENUMERATION_POOL} na posibleng sagot sa pool.`);
      return;
    }
    setAnswerPool((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handleSave = () => {
    if (!question.trim() || !hint.trim()) {
      Alert.alert('Kulang na Impormasyon', 'Kailangan ng mini-lesson at tanong.');
      return;
    }
    if (type !== 'enumeration' && !correctAnswer.trim()) {
      Alert.alert('Kulang na Impormasyon', 'Kailangan ng tamang sagot.');
      return;
    }
    if (type === 'multiple-choice') {
      const filled = choices.map((c) => c.trim()).filter(Boolean);
      if (filled.length < 2) {
        Alert.alert('Kulang na Choices', 'Maglagay ng hindi bababa sa 2 choices.');
        return;
      }
      if (!filled.map((c) => c.toLowerCase()).includes(correctAnswer.trim().toLowerCase())) {
        Alert.alert('Hindi Tugma', 'Ang tamang sagot ay dapat isa sa mga choices.');
        return;
      }
    }

    if (type === 'enumeration') {
      const filledPool = answerPool.map((a) => a.trim()).filter(Boolean);
      // De-dupe (case-insensitive) so the pool doesn't silently count the
      // same accepted answer twice.
      const uniquePool = Array.from(new Map(filledPool.map((a) => [a.toLowerCase(), a])).values());
      if (uniquePool.length < MIN_ENUMERATION_POOL) {
        Alert.alert(
          'Kulang ang Answer Pool',
          `Kailangan ng hindi bababa sa ${MIN_ENUMERATION_POOL} (natatanging) posibleng sagot. Meron pa lang ${uniquePool.length}.`
        );
        return;
      }
      const requiredNum = parseInt(requiredAnswers, 10);
      if (!requiredNum || requiredNum < 1) {
        Alert.alert('Hindi Wasto', 'Ilagay kung ilang sagot ang kailangang isagot ng player (hindi bababa sa 1).');
        return;
      }
      if (requiredNum > uniquePool.length) {
        Alert.alert(
          'Hindi Wasto',
          `Ang kailangang sagot (${requiredNum}) ay hindi maaaring lumampas sa laki ng answer pool (${uniquePool.length}).`
        );
        return;
      }

      upsertQuestion(category, level, activityNum, {
        hint: hint.trim(),
        type,
        question: question.trim(),
        correctAnswer: uniquePool.join(', '),
        answerPool: uniquePool,
        requiredAnswers: requiredNum,
        explanation: explanation.trim() || hint.trim(),
      });
      Alert.alert('Naka-save!', 'Na-update ang tanong.', [{ text: 'OK', onPress: () => router.back() }]);
      return;
    }

    upsertQuestion(category, level, activityNum, {
      hint: hint.trim(),
      type,
      question: question.trim(),
      choices: type === 'multiple-choice' ? choices.map((c) => c.trim()).filter(Boolean) : undefined,
      correctAnswer: correctAnswer.trim(),
      explanation: explanation.trim() || hint.trim(),
    });

    Alert.alert('Naka-save!', 'Na-update ang tanong.', [{ text: 'OK', onPress: () => router.back() }]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { backgroundColor: categoryColor || '#3B7DD8' }]}>
        <Text style={styles.headerTitle}>{categoryLabel} — Level {level}, Activity {activityNum}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.form}>
        <Text style={styles.label}>Uri ng Tanong</Text>
        <View style={styles.typeRow}>
          <TouchableOpacity
            style={[styles.typeChip, type === 'multiple-choice' && styles.typeChipActive]}
            onPress={() => setType('multiple-choice')}
          >
            <Text style={[styles.typeChipText, type === 'multiple-choice' && styles.typeChipTextActive]}>Multiple Choice</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeChip, type === 'identification' && styles.typeChipActive]}
            onPress={() => setType('identification')}
          >
            <Text style={[styles.typeChipText, type === 'identification' && styles.typeChipTextActive]}>Identification</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeChip, type === 'enumeration' && styles.typeChipActive]}
            onPress={() => setType('enumeration')}
          >
            <Text style={[styles.typeChipText, type === 'enumeration' && styles.typeChipTextActive]}>Enumeration</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Mini-Lesson / Hint</Text>
        <TextInput style={[styles.input, styles.multiline]} value={hint} onChangeText={setHint} multiline placeholder="Maikling paliwanag bago ang tanong..." />

        <Text style={styles.label}>Tanong</Text>
        <TextInput style={styles.input} value={question} onChangeText={setQuestion} placeholder="I-type ang tanong..." />

        {type === 'multiple-choice' && (
          <>
            <Text style={styles.label}>Mga Choices</Text>
            {choices.map((c, i) => (
              <TextInput
                key={i}
                style={styles.input}
                value={c}
                onChangeText={(val) => updateChoice(i, val)}
                placeholder={`Choice ${i + 1}`}
              />
            ))}
          </>
        )}

        {type === 'enumeration' && (
          <>
            <Text style={styles.label}>Ilang Sagot ang Kailangan ng Player (Required Answers)</Text>
            <TextInput
              style={styles.input}
              value={requiredAnswers}
              onChangeText={setRequiredAnswers}
              placeholder="hal. 3"
              keyboardType="number-pad"
            />
            <Text style={styles.helperNote}>
              Ito ang magiging bilang ng "tabs" / input boxes na makikita ng player. Dapat hindi lumampas sa laki ng Answer Pool sa ibaba.
            </Text>

            <View style={styles.poolHeaderRow}>
              <Text style={styles.label}>Answer Pool (min. {MIN_ENUMERATION_POOL} posibleng sagot)</Text>
              <Text style={styles.poolCount}>{answerPool.filter((a) => a.trim()).length} filled</Text>
            </View>
            {answerPool.map((val, i) => (
              <View key={i} style={styles.poolRow}>
                <TextInput
                  style={[styles.input, styles.poolInput]}
                  value={val}
                  onChangeText={(text) => updatePoolAnswer(i, text)}
                  placeholder={`Pool answer ${i + 1}`}
                />
                <TouchableOpacity style={styles.removePoolButton} onPress={() => removePoolSlot(i)}>
                  <Text style={styles.removePoolButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={styles.addPoolButton} onPress={addPoolSlot}>
              <Text style={styles.addPoolButtonText}>+ Magdagdag ng Pool Answer</Text>
            </TouchableOpacity>
          </>
        )}

        {type !== 'enumeration' && (
          <>
            <Text style={styles.label}>Tamang Sagot</Text>
            <TextInput style={styles.input} value={correctAnswer} onChangeText={setCorrectAnswer} placeholder="Tamang sagot..." />
          </>
        )}

        <Text style={styles.label}>Paliwanag (pagkatapos ng tamang sagot)</Text>
        <TextInput style={[styles.input, styles.multiline]} value={explanation} onChangeText={setExplanation} multiline placeholder="Bakit tama ang sagot..." />

        <TouchableOpacity style={[styles.saveButton, { backgroundColor: categoryColor || '#3B7DD8' }]} onPress={handleSave}>
          <Text style={styles.saveButtonText}>I-save ang Tanong</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
          <Text style={styles.cancelButtonText}>Kanselahin</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5EFE0' },
  header: { paddingVertical: 16, paddingHorizontal: 16, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerTitle: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
  form: { padding: 18 },
  label: { fontSize: 12, fontWeight: 'bold', color: '#5C3A21', marginTop: 14, marginBottom: 6 },
  input: {
    backgroundColor: '#FFF', borderWidth: 1.5, borderColor: '#E0D5BE', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#1A1A1A', marginBottom: 8,
  },
  multiline: { minHeight: 70, textAlignVertical: 'top' },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeChip: { flex: 1, paddingVertical: 10, borderRadius: 14, borderWidth: 1.5, borderColor: '#E0D5BE', alignItems: 'center', backgroundColor: '#FFF' },
  typeChipActive: { backgroundColor: '#3B7DD8', borderColor: '#3B7DD8' },
  typeChipText: { fontWeight: 'bold', fontSize: 12, color: '#5C3A21' },
  typeChipTextActive: { color: '#FFF' },
  helperNote: { fontSize: 11.5, color: '#8E8E93', marginTop: -4, marginBottom: 6, lineHeight: 16 },
  poolHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, marginBottom: 6 },
  poolCount: { fontSize: 11.5, color: '#3E9E4F', fontWeight: 'bold' },
  poolRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  poolInput: { flex: 1, marginBottom: 8 },
  removePoolButton: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: '#FCEAEA',
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  removePoolButtonText: { color: '#C4304A', fontWeight: 'bold', fontSize: 13 },
  addPoolButton: {
    borderWidth: 1.5, borderColor: '#3B7DD8', borderStyle: 'dashed', borderRadius: 12,
    paddingVertical: 10, alignItems: 'center', marginTop: 4, marginBottom: 8,
  },
  addPoolButtonText: { color: '#3B7DD8', fontWeight: 'bold', fontSize: 12.5 },
  saveButton: { marginTop: 24, paddingVertical: 15, borderRadius: 25, alignItems: 'center' },
  saveButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
  cancelButton: { marginTop: 10, paddingVertical: 12, alignItems: 'center' },
  cancelButtonText: { color: '#8E8E93', fontWeight: '600' },
});