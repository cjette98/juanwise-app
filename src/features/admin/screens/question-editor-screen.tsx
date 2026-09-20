import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAdminContent } from '@/features/admin/context/admin-content-context';
import { ClearableTextInput } from '@/features/admin/components/clearable-text-input';
import { QuizType, MIN_ENUMERATION_POOL } from '@/shared/content/quiz-content';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { toNum } from '@/shared/lib/params';

const TYPE_LABELS: Record<QuizType, string> = {
  'multiple-choice': 'Multiple Choice',
  identification: 'Identification',
  enumeration: 'Enumeration',
};
const QUESTION_TYPES: QuizType[] = ['multiple-choice', 'identification', 'enumeration'];

/** UI-side cap on Identification's accepted-answer alternatives, matching the JuanWise Admin web console. */
const MAX_ACCEPTED_ANSWERS = 20;

export default function QuestionEditorScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    packId: string;
    category: string;
    level: string;
    activityNum: string;
    categoryColor: string;
    categoryLabel: string;
  }>();
  const { packId, category, categoryColor, categoryLabel } = params;
  const level = toNum(params.level, 1);
  const activityNum = toNum(params.activityNum, 1);
  const { getEffectiveQuestion, upsertQuestion, uploadQuestionImage } = useAdminContent();
  const existing = getEffectiveQuestion(packId ?? '', category, level, activityNum);

  const [saving, setSaving] = useState(false);
  const [type, setType] = useState<QuizType>(existing.type);
  const [hint, setHint] = useState(existing.hint);
  const [question, setQuestion] = useState(existing.question);
  const [choices, setChoices] = useState<string[]>(existing.choices ?? ['', '', '', '']);
  const [correctAnswer, setCorrectAnswer] = useState(existing.correctAnswer);
  const [explanation, setExplanation] = useState(existing.explanation);
  // Identification-only: alternate spellings graded as correct alongside correctAnswer.
  const [acceptedAnswers, setAcceptedAnswers] = useState<string[]>(existing.acceptedAnswers ?? []);
  // Enumeration-only: Admin's answer pool (min MIN_ENUMERATION_POOL) and
  // how many of those the player must correctly answer to pass.
  const [answerPool, setAnswerPool] = useState<string[]>(() => {
    const base = existing.answerPool ?? [];
    const padded = [...base];
    while (padded.length < MIN_ENUMERATION_POOL) padded.push('');
    return padded;
  });
  const [requiredAnswers, setRequiredAnswers] = useState(String(existing.requiredAnswers ?? 3));
  // The picture that illustrates the mini-lesson. Held in the draft until the
  // admin saves, because the URL is stored on the question, not uploaded to it.
  const [miniLessonImageUrl, setMiniLessonImageUrl] = useState<string | null>(
    existing.miniLessonImageUrl ?? null,
  );
  const [uploadingImage, setUploadingImage] = useState(false);

  if (!packId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Walang napiling pack</Text>
        </View>
      </SafeAreaView>
    );
  }

  /**
   * Uploads straight to Cloud Storage with a signed URL, then keeps the public
   * URL in state — nothing is written to the question until Save, so backing
   * out of the screen leaves the published activity untouched.
   */
  const pickMiniLessonImage = async () => {
    if (uploadingImage || saving) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Kailangan ng Pahintulot',
        'Payagan ang app na ma-access ang iyong mga larawan para makapili ng larawan sa aralin.',
      );
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    const asset = picked.assets?.[0];
    if (picked.canceled || !asset?.uri) return;

    setUploadingImage(true);
    try {
      const result = await uploadQuestionImage(category, asset.uri, asset.mimeType ?? undefined);
      if (!result.success || !result.url) {
        Alert.alert('Hindi Na-upload', result.message);
        return;
      }
      setMiniLessonImageUrl(result.url);
    } finally {
      setUploadingImage(false);
    }
  };

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

  const updateAcceptedAnswer = (i: number, val: string) => {
    const next = [...acceptedAnswers];
    next[i] = val;
    setAcceptedAnswers(next);
  };

  const addAcceptedAnswer = () => {
    if (acceptedAnswers.length >= MAX_ACCEPTED_ANSWERS) {
      Alert.alert('Sobra na', `Pinakamarami ay ${MAX_ACCEPTED_ANSWERS} na tinatanggap na sagot.`);
      return;
    }
    setAcceptedAnswers((prev) => [...prev, '']);
  };

  const removeAcceptedAnswer = (i: number) => setAcceptedAnswers((prev) => prev.filter((_, idx) => idx !== i));

  // Only the fields the *current* type owns are inspected, so leftovers from a
  // type the admin already switched away from never trigger the warning below.
  const hasAnswerContent = () => {
    if (type === 'multiple-choice') return choices.some((c) => c.trim()) || !!correctAnswer.trim();
    if (type === 'identification') return !!correctAnswer.trim() || acceptedAnswers.some((a) => a.trim());
    return answerPool.some((a) => a.trim());
  };

  // Resets every answer field, not just the old type's — correctAnswer is
  // shared between multiple-choice and identification, so leaving it in place
  // would silently turn a discarded choice into the new type's primary answer.
  const applyTypeChange = (nextType: QuizType) => {
    setType(nextType);
    setChoices(['', '', '', '']);
    setCorrectAnswer('');
    setAnswerPool(Array.from({ length: MIN_ENUMERATION_POOL }, () => ''));
    setRequiredAnswers('3');
    setAcceptedAnswers([]);
  };

  const requestTypeChange = (nextType: QuizType) => {
    if (nextType === type) return;
    if (!hasAnswerContent()) {
      applyTypeChange(nextType);
      return;
    }
    Alert.alert(
      `Palitan sa ${TYPE_LABELS[nextType]}?`,
      `Mananatili ang tanong, hint, paliwanag, at mini-lesson. Mabubura ang mga sagot ng kasalukuyang uri (${TYPE_LABELS[type]}). Wala pang na-se-save hangga't hindi pinipindot ang "I-save ang Tanong".`,
      [
        { text: 'Kanselahin', style: 'cancel' },
        { text: 'Palitan at Burahin', style: 'destructive', onPress: () => applyTypeChange(nextType) },
      ],
    );
  };

  // PUT /content/questions/:category/:level/:activityNum. The API re-validates
  // everything checked below, so a question that renders wrong cannot be
  // published even if this screen were bypassed.
  const save = async (payload: Parameters<typeof upsertQuestion>[4]) => {
    setSaving(true);
    try {
      const result = await upsertQuestion(packId, category, level, activityNum, payload);
      if (!result.success) {
        Alert.alert('Hindi Na-save', result.message);
        return;
      }
      Alert.alert('Naka-save!', result.message, [{ text: 'OK', onPress: () => router.back() }]);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (saving) return;
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

      await save({
        hint: hint.trim(),
        type,
        question: question.trim(),
        correctAnswer: uniquePool.join(', '),
        answerPool: uniquePool,
        requiredAnswers: requiredNum,
        explanation: explanation.trim() || hint.trim(),
        // Both are sent on every save: the PUT is a full overwrite, so a
        // payload that omitted them would clear the write-up and the picture
        // the Mini-Lessons screen shows.
        miniLesson: existing.miniLesson,
        miniLessonImageUrl,
      });
      return;
    }

    if (type === 'identification') {
      const primary = correctAnswer.trim();
      const filledAccepted = acceptedAnswers.map((a) => a.trim()).filter(Boolean);
      // De-dupe (case-insensitive) and drop anything that just repeats the
      // primary answer, mirroring the enumeration pool's de-dupe above and
      // the JuanWise Admin console's own identification validation.
      const uniqueAccepted = Array.from(new Map(filledAccepted.map((a) => [a.toLowerCase(), a])).values()).filter(
        (a) => a.toLowerCase() !== primary.toLowerCase(),
      );

      await save({
        hint: hint.trim(),
        type,
        question: question.trim(),
        correctAnswer: primary,
        acceptedAnswers: uniqueAccepted,
        explanation: explanation.trim() || hint.trim(),
        miniLesson: existing.miniLesson,
        miniLessonImageUrl,
      });
      return;
    }

    await save({
      hint: hint.trim(),
      type,
      question: question.trim(),
      choices: type === 'multiple-choice' ? choices.map((c) => c.trim()).filter(Boolean) : undefined,
      correctAnswer: correctAnswer.trim(),
      explanation: explanation.trim() || hint.trim(),
      miniLesson: existing.miniLesson,
      miniLessonImageUrl,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { backgroundColor: categoryColor || '#3B7DD8' }]}>
        <Text style={styles.headerTitle}>{categoryLabel} — Level {level}, Activity {activityNum}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.form}>
        <Text style={styles.label}>Uri ng Tanong</Text>
        <View style={styles.typeRow}>
          {QUESTION_TYPES.map((key) => (
            <TouchableOpacity
              key={key}
              style={[styles.typeChip, type === key && styles.typeChipActive]}
              onPress={() => requestTypeChange(key)}
            >
              <Text style={[styles.typeChipText, type === key && styles.typeChipTextActive]}>
                {TYPE_LABELS[key]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Mini-Lesson / Hint</Text>
        <ClearableTextInput style={[styles.input, styles.multiline]} value={hint} onChangeText={setHint} multiline placeholder="Maikling paliwanag bago ang tanong..." />

        <Text style={styles.label}>Tanong</Text>
        <ClearableTextInput style={styles.input} value={question} onChangeText={setQuestion} placeholder="I-type ang tanong..." />

        {type === 'multiple-choice' && (
          <>
            <Text style={styles.label}>Mga Choices</Text>
            {choices.map((c, i) => (
              <ClearableTextInput
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
            <ClearableTextInput
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
            <ClearableTextInput style={styles.input} value={correctAnswer} onChangeText={setCorrectAnswer} placeholder="Tamang sagot..." />
          </>
        )}

        {type === 'identification' && (
          <>
            <View style={styles.poolHeaderRow}>
              <Text style={styles.label}>Iba pang Tinatanggap na Sagot</Text>
              <Text style={styles.poolCount}>{acceptedAnswers.filter((a) => a.trim()).length}/{MAX_ACCEPTED_ANSWERS}</Text>
            </View>
            <Text style={styles.helperNote}>
              Opsyonal. Ibang paraan ng pagsulat ng parehong sagot (hal. ibang baybay) na ituturing ding tama.
            </Text>
            {acceptedAnswers.map((val, i) => (
              <View key={i} style={styles.poolRow}>
                <TextInput
                  style={[styles.input, styles.poolInput]}
                  value={val}
                  onChangeText={(text) => updateAcceptedAnswer(i, text)}
                  placeholder={`Ibang sagot ${i + 1}`}
                />
                <TouchableOpacity style={styles.removePoolButton} onPress={() => removeAcceptedAnswer(i)}>
                  <Text style={styles.removePoolButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={styles.addPoolButton} onPress={addAcceptedAnswer}>
              <Text style={styles.addPoolButtonText}>+ Magdagdag ng Tinatanggap na Sagot</Text>
            </TouchableOpacity>
          </>
        )}

        <Text style={styles.label}>Paliwanag (pagkatapos ng tamang sagot)</Text>
        <ClearableTextInput style={[styles.input, styles.multiline]} value={explanation} onChangeText={setExplanation} multiline placeholder="Bakit tama ang sagot..." />

        <Text style={styles.label}>Larawan ng Aralin</Text>
        <Text style={styles.helperNote}>
          Makikita ito sa Mini-Lessons kapag natapos na ng mag-aaral ang gawain. Hindi ito lumalabas
          habang sinasagot ang tanong, para hindi maibigay ang sagot.
        </Text>
        {miniLessonImageUrl ? (
          <Image source={{ uri: miniLessonImageUrl }} style={styles.imagePreview} />
        ) : (
          <View style={styles.imageEmpty}>
            <Text style={styles.imageEmptyText}>
              Walang larawan — gagamitin ang default na larawan ng kategorya.
            </Text>
          </View>
        )}
        <View style={styles.imageRow}>
          <TouchableOpacity
            style={[styles.imageButton, { backgroundColor: categoryColor || '#3B7DD8' }, uploadingImage && styles.imageButtonBusy]}
            onPress={pickMiniLessonImage}
            disabled={uploadingImage}
          >
            {uploadingImage ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={styles.imageButtonText}>
                {miniLessonImageUrl ? 'Palitan ang Larawan' : 'Pumili ng Larawan'}
              </Text>
            )}
          </TouchableOpacity>
          {!!miniLessonImageUrl && !uploadingImage && (
            <TouchableOpacity style={styles.imageRemoveButton} onPress={() => setMiniLessonImageUrl(null)}>
              <Text style={styles.imageRemoveButtonText}>Alisin</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: categoryColor || '#3B7DD8' }, saving && styles.saveButtonBusy]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.saveButtonText}>I-save ang Tanong</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()} disabled={saving}>
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
  imagePreview: { width: '100%', height: 170, borderRadius: 14, backgroundColor: '#EFE6D4', borderWidth: 2, borderColor: '#E0D5BE' },
  imageEmpty: { width: '100%', height: 84, borderRadius: 14, borderWidth: 2, borderStyle: 'dashed', borderColor: '#D9C89E', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  imageEmptyText: { fontSize: 12.5, color: '#8E8E93', textAlign: 'center', lineHeight: 18 },
  imageRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  imageButton: { flex: 1, paddingVertical: 13, borderRadius: 14, alignItems: 'center', justifyContent: 'center', minHeight: 46 },
  imageButtonBusy: { opacity: 0.7 },
  imageButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 13.5 },
  imageRemoveButton: { paddingVertical: 13, paddingHorizontal: 20, borderRadius: 14, backgroundColor: '#F2EADB', alignItems: 'center', justifyContent: 'center', minHeight: 46 },
  imageRemoveButtonText: { color: '#8E2136', fontWeight: 'bold', fontSize: 13.5 },
  input: {
    backgroundColor: '#FFF', borderWidth: 1.5, borderColor: '#E0D5BE', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#1A1A1A', marginBottom: 8,
  },
  multiline: { minHeight: 70, textAlignVertical: 'top' },
  readOnlyValue: {
    backgroundColor: '#F0EADC', borderWidth: 1.5, borderColor: '#E0D5BE', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#5C3A21', marginBottom: 8,
  },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: { flexGrow: 1, flexBasis: 100, paddingVertical: 10, borderRadius: 14, borderWidth: 1.5, borderColor: '#E0D5BE', alignItems: 'center', backgroundColor: '#FFF' },
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
  saveButtonBusy: { opacity: 0.7 },
  saveButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
  cancelButton: { marginTop: 10, paddingVertical: 12, alignItems: 'center' },
  cancelButtonText: { color: '#8E8E93', fontWeight: '600' },
});