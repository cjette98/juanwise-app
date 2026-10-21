import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAdminContent } from '@/features/admin/context/admin-content-context';
import { ClearableTextInput } from '@/features/admin/components/clearable-text-input';
import { QuizType, MIN_ENUMERATION_POOL, type QuizQuestion } from '@/shared/content/quiz-content';
import { validateQuestionDraft, type LangDraft } from '@/features/admin/lib/question-validation';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { toNum } from '@/shared/lib/params';
import { useLanguage, type TranslationKey } from '@/shared/i18n/language-context';

const TYPE_LABEL_KEYS: Record<QuizType, TranslationKey> = {
  'multiple-choice': 'typeMultipleChoice',
  identification: 'typeIdentification',
  enumeration: 'typeEnumeration',
};
const QUESTION_TYPES: QuizType[] = ['multiple-choice', 'identification', 'enumeration'];

/** UI-side cap on Identification's accepted-answer alternatives, matching the JuanWise Admin web console. */
const MAX_ACCEPTED_ANSWERS = 20;

/** One field, labelled once, with the English and Tagalog inputs stacked. */
function BilingualInput(props: {
  label: string;
  enValue: string;
  tlValue: string;
  onEn: (v: string) => void;
  onTl: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  const { t } = useLanguage();
  const { label, enValue, tlValue, onEn, onTl, placeholder, multiline } = props;
  const inputStyle = multiline ? [styles.input, styles.multiline] : styles.input;
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.langLabel}>{t('contentLangEnglish')}</Text>
      <ClearableTextInput style={inputStyle} value={enValue} onChangeText={onEn} multiline={multiline} placeholder={placeholder} />
      <Text style={styles.langLabel}>{t('contentLangTagalog')}</Text>
      <ClearableTextInput style={inputStyle} value={tlValue} onChangeText={onTl} multiline={multiline} placeholder={placeholder} />
    </>
  );
}

/** Column headings above a list whose rows hold an English and a Tagalog input side by side. */
function LangColumns({ withRemove }: { withRemove?: boolean }) {
  const { t } = useLanguage();
  return (
    <View style={styles.poolRow}>
      <Text style={[styles.langLabel, styles.langColumn]}>{t('contentLangEnglish')}</Text>
      <Text style={[styles.langLabel, styles.langColumn]}>{t('contentLangTagalog')}</Text>
      {withRemove && <View style={styles.removeSpacer} />}
    </View>
  );
}

const pad = (list: string[], length: number) => [...list, ...Array.from({ length: Math.max(0, length - list.length) }, () => '')];

/**
 * The editor's two drafts for a question. The English one is empty when the
 * question has none. Pools and accepted-answer lists are padded to the same
 * length in both languages so rows stay paired.
 */
function initialDrafts(q: QuizQuestion): { tl: LangDraft; en: LangDraft } {
  const en = q.en;
  const choiceLen = Math.max(4, q.choices?.length ?? 0, en?.choices?.length ?? 0);
  const poolLen = Math.max(MIN_ENUMERATION_POOL, q.answerPool?.length ?? 0, en?.answerPool?.length ?? 0);
  const acceptedLen = Math.max(q.acceptedAnswers?.length ?? 0, en?.acceptedAnswers?.length ?? 0);
  return {
    tl: {
      hint: q.hint,
      miniLesson: q.miniLesson ?? '',
      question: q.question,
      choices: pad(q.choices ?? [], choiceLen),
      correctAnswer: q.correctAnswer,
      acceptedAnswers: pad(q.acceptedAnswers ?? [], acceptedLen),
      answerPool: pad(q.answerPool ?? [], poolLen),
      explanation: q.explanation,
    },
    en: {
      hint: en?.hint ?? '',
      miniLesson: en?.miniLesson ?? '',
      question: en?.question ?? '',
      choices: pad(en?.choices ?? [], choiceLen),
      correctAnswer: en?.correctAnswer ?? '',
      acceptedAnswers: pad(en?.acceptedAnswers ?? [], acceptedLen),
      answerPool: pad(en?.answerPool ?? [], poolLen),
      explanation: en?.explanation ?? '',
    },
  };
}

export default function QuestionEditorScreen() {
  const router = useRouter();
  const { t } = useLanguage();
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
  // Every text field has a Tagalog (the question's main fields) and an English
  // version; the two lists of each kind always have the same length so row i
  // in one language pairs with row i in the other.
  const [tl, setTl] = useState<LangDraft>(() => initialDrafts(existing).tl);
  const [en, setEn] = useState<LangDraft>(() => initialDrafts(existing).en);
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
          <Text style={styles.headerTitle}>{t('adminNoPackSelected')}</Text>
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
        t('adminPermissionNeeded'),
        t('photoPermissionLessonMsg'),
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
        Alert.alert(t('adminUploadFailedTitle'), result.message);
        return;
      }
      setMiniLessonImageUrl(result.url);
    } finally {
      setUploadingImage(false);
    }
  };

  const setField = (lang: 'tl' | 'en', patch: Partial<LangDraft>) =>
    (lang === 'tl' ? setTl : setEn)((prev) => ({ ...prev, ...patch }));

  const updateListItem = (lang: 'tl' | 'en', key: 'choices' | 'answerPool' | 'acceptedAnswers', i: number, val: string) => {
    const list = [...(lang === 'tl' ? tl : en)[key]];
    list[i] = val;
    setField(lang, { [key]: list });
  };

  const addPoolSlot = () => {
    setTl((prev) => ({ ...prev, answerPool: [...prev.answerPool, ''] }));
    setEn((prev) => ({ ...prev, answerPool: [...prev.answerPool, ''] }));
  };

  const removePoolSlot = (i: number) => {
    if (tl.answerPool.length <= MIN_ENUMERATION_POOL) {
      Alert.alert(t('minPoolTitle'), t('minPoolMsg', { min: MIN_ENUMERATION_POOL }));
      return;
    }
    const drop = (prev: LangDraft) => ({ ...prev, answerPool: prev.answerPool.filter((_, idx) => idx !== i) });
    setTl(drop);
    setEn(drop);
  };

  const addAcceptedAnswer = () => {
    if (tl.acceptedAnswers.length >= MAX_ACCEPTED_ANSWERS) {
      Alert.alert(t('tooManyTitle'), t('tooManyAcceptedMsg', { max: MAX_ACCEPTED_ANSWERS }));
      return;
    }
    setTl((prev) => ({ ...prev, acceptedAnswers: [...prev.acceptedAnswers, ''] }));
    setEn((prev) => ({ ...prev, acceptedAnswers: [...prev.acceptedAnswers, ''] }));
  };

  const removeAcceptedAnswer = (i: number) => {
    const drop = (prev: LangDraft) => ({ ...prev, acceptedAnswers: prev.acceptedAnswers.filter((_, idx) => idx !== i) });
    setTl(drop);
    setEn(drop);
  };

  // Only the fields the *current* type owns are inspected, so leftovers from a
  // type the admin already switched away from never trigger the warning below.
  const hasAnswerContent = () =>
    [tl, en].some((d) => {
      if (type === 'multiple-choice') return d.choices.some((c) => c.trim()) || !!d.correctAnswer.trim();
      if (type === 'identification') return !!d.correctAnswer.trim() || d.acceptedAnswers.some((a) => a.trim());
      return d.answerPool.some((a) => a.trim());
    });

  // Resets every answer field in both languages, not just the old type's —
  // correctAnswer is shared between multiple-choice and identification, so
  // leaving it in place would silently turn a discarded choice into the new
  // type's primary answer.
  const applyTypeChange = (nextType: QuizType) => {
    setType(nextType);
    const clear = (prev: LangDraft): LangDraft => ({
      ...prev,
      choices: ['', '', '', ''],
      correctAnswer: '',
      answerPool: Array.from({ length: MIN_ENUMERATION_POOL }, () => ''),
      acceptedAnswers: [],
    });
    setTl(clear);
    setEn(clear);
    setRequiredAnswers('3');
  };

  const requestTypeChange = (nextType: QuizType) => {
    if (nextType === type) return;
    if (!hasAnswerContent()) {
      applyTypeChange(nextType);
      return;
    }
    Alert.alert(
      t('switchTypeTitle', { type: t(TYPE_LABEL_KEYS[nextType]) }),
      t('switchTypeMsg', { type: t(TYPE_LABEL_KEYS[type]) }),
      [
        { text: t('cancelBtn'), style: 'cancel' },
        { text: t('switchAndClearBtn'), style: 'destructive', onPress: () => applyTypeChange(nextType) },
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
        Alert.alert(t('adminSaveFailedTitle'), result.message);
        return;
      }
      Alert.alert(t('adminSavedTitle'), result.message, [{ text: t('okBtn'), onPress: () => router.back() }]);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (saving) return;
    const result = validateQuestionDraft({
      type,
      tl,
      en,
      requiredAnswers,
      minPool: MIN_ENUMERATION_POOL,
    });
    if (!result.ok) {
      const { titleKey, msgKey, params, english } = result.error;
      const message = t(msgKey, params);
      Alert.alert(t(titleKey), english ? t('englishVersionPrefix') + message : message);
      return;
    }

    const { tl: tlOut, en: enOut, requiredAnswers: requiredNum } = result;
    const shared = {
      type,
      // Both are sent on every save: the PUT is a full overwrite, so a payload
      // that omitted them would clear the write-up and the picture the
      // Mini-Lessons screen shows.
      miniLessonImageUrl,
    };
    const ownFields = (d: LangDraft) =>
      type === 'enumeration'
        ? { correctAnswer: d.correctAnswer, answerPool: d.answerPool }
        : type === 'identification'
          ? { correctAnswer: d.correctAnswer, acceptedAnswers: d.acceptedAnswers }
          : { correctAnswer: d.correctAnswer, choices: d.choices };

    await save({
      ...shared,
      hint: tlOut.hint,
      miniLesson: tlOut.miniLesson,
      question: tlOut.question,
      explanation: tlOut.explanation,
      ...ownFields(tlOut),
      ...(type === 'enumeration' && { requiredAnswers: requiredNum }),
      en: {
        question: enOut.question,
        hint: enOut.hint,
        explanation: enOut.explanation,
        miniLesson: enOut.miniLesson,
        ...ownFields(enOut),
      },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { backgroundColor: categoryColor || '#3B7DD8' }]}>
        <Text style={styles.headerTitle}>
          {t('questionEditorTitle', { label: categoryLabel, level, num: activityNum })}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.form}>
        <Text style={styles.label}>{t('questionTypeLabel')}</Text>
        <View style={styles.typeRow}>
          {QUESTION_TYPES.map((key) => (
            <TouchableOpacity
              key={key}
              style={[styles.typeChip, type === key && styles.typeChipActive]}
              onPress={() => requestTypeChange(key)}
            >
              <Text style={[styles.typeChipText, type === key && styles.typeChipTextActive]}>
                {t(TYPE_LABEL_KEYS[key])}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <BilingualInput
          label={t('miniLessonHintLabel')}
          enValue={en.hint}
          tlValue={tl.hint}
          onEn={(v) => setField('en', { hint: v })}
          onTl={(v) => setField('tl', { hint: v })}
          placeholder={t('miniLessonHintPlaceholder')}
          multiline
        />

        <BilingualInput
          label={t('questionLabel')}
          enValue={en.question}
          tlValue={tl.question}
          onEn={(v) => setField('en', { question: v })}
          onTl={(v) => setField('tl', { question: v })}
          placeholder={t('questionPlaceholder')}
        />

        {type === 'multiple-choice' && (
          <>
            <Text style={styles.label}>{t('choicesLabel')}</Text>
            <LangColumns />
            {tl.choices.map((_, i) => (
              <View key={i} style={styles.poolRow}>
                <View style={styles.langColumn}>
                  <ClearableTextInput
                    style={styles.input}
                    value={en.choices[i]}
                    onChangeText={(val) => updateListItem('en', 'choices', i, val)}
                    placeholder={t('choicePlaceholder', { n: i + 1 })}
                  />
                </View>
                <View style={styles.langColumn}>
                  <ClearableTextInput
                    style={styles.input}
                    value={tl.choices[i]}
                    onChangeText={(val) => updateListItem('tl', 'choices', i, val)}
                    placeholder={t('choicePlaceholder', { n: i + 1 })}
                  />
                </View>
              </View>
            ))}
          </>
        )}

        {type === 'enumeration' && (
          <>
            <Text style={styles.label}>{t('requiredAnswersLabel')}</Text>
            <ClearableTextInput
              style={styles.input}
              value={requiredAnswers}
              onChangeText={setRequiredAnswers}
              placeholder={t('requiredAnswersPlaceholder')}
              keyboardType="number-pad"
            />
            <Text style={styles.helperNote}>{t('requiredAnswersNote')}</Text>

            <View style={styles.poolHeaderRow}>
              <Text style={styles.label}>{t('answerPoolLabel', { min: MIN_ENUMERATION_POOL })}</Text>
              <Text style={styles.poolCount}>
                {t('poolFilledCount', { count: tl.answerPool.filter((a) => a.trim()).length })}
              </Text>
            </View>
            <LangColumns withRemove />
            {tl.answerPool.map((_, i) => (
              <View key={i} style={styles.poolRow}>
                <TextInput
                  style={[styles.input, styles.langColumn]}
                  value={en.answerPool[i]}
                  onChangeText={(text) => updateListItem('en', 'answerPool', i, text)}
                  placeholder={t('poolAnswerPlaceholder', { n: i + 1 })}
                />
                <TextInput
                  style={[styles.input, styles.langColumn]}
                  value={tl.answerPool[i]}
                  onChangeText={(text) => updateListItem('tl', 'answerPool', i, text)}
                  placeholder={t('poolAnswerPlaceholder', { n: i + 1 })}
                />
                <TouchableOpacity style={styles.removePoolButton} onPress={() => removePoolSlot(i)}>
                  <Text style={styles.removePoolButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={styles.addPoolButton} onPress={addPoolSlot}>
              <Text style={styles.addPoolButtonText}>{t('addPoolAnswerBtn')}</Text>
            </TouchableOpacity>
          </>
        )}

        {type !== 'enumeration' && (
          <BilingualInput
            label={t('correctAnswerLabel')}
            enValue={en.correctAnswer}
            tlValue={tl.correctAnswer}
            onEn={(v) => setField('en', { correctAnswer: v })}
            onTl={(v) => setField('tl', { correctAnswer: v })}
            placeholder={t('correctAnswerPlaceholder')}
          />
        )}

        {type === 'identification' && (
          <>
            <View style={styles.poolHeaderRow}>
              <Text style={styles.label}>{t('otherAcceptedLabel')}</Text>
              <Text style={styles.poolCount}>
                {t('acceptedCount', {
                  count: tl.acceptedAnswers.filter((a) => a.trim()).length,
                  max: MAX_ACCEPTED_ANSWERS,
                })}
              </Text>
            </View>
            <Text style={styles.helperNote}>{t('acceptedAnswersNote')}</Text>
            {tl.acceptedAnswers.length > 0 && <LangColumns withRemove />}
            {tl.acceptedAnswers.map((_, i) => (
              <View key={i} style={styles.poolRow}>
                <TextInput
                  style={[styles.input, styles.langColumn]}
                  value={en.acceptedAnswers[i]}
                  onChangeText={(text) => updateListItem('en', 'acceptedAnswers', i, text)}
                  placeholder={t('otherAcceptedPlaceholder', { n: i + 1 })}
                />
                <TextInput
                  style={[styles.input, styles.langColumn]}
                  value={tl.acceptedAnswers[i]}
                  onChangeText={(text) => updateListItem('tl', 'acceptedAnswers', i, text)}
                  placeholder={t('otherAcceptedPlaceholder', { n: i + 1 })}
                />
                <TouchableOpacity style={styles.removePoolButton} onPress={() => removeAcceptedAnswer(i)}>
                  <Text style={styles.removePoolButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={styles.addPoolButton} onPress={addAcceptedAnswer}>
              <Text style={styles.addPoolButtonText}>{t('addAcceptedBtn')}</Text>
            </TouchableOpacity>
          </>
        )}

        <BilingualInput
          label={t('explanationLabel')}
          enValue={en.explanation}
          tlValue={tl.explanation}
          onEn={(v) => setField('en', { explanation: v })}
          onTl={(v) => setField('tl', { explanation: v })}
          placeholder={t('explanationPlaceholder')}
          multiline
        />

        <BilingualInput
          label={t('miniLessonLabel')}
          enValue={en.miniLesson}
          tlValue={tl.miniLesson}
          onEn={(v) => setField('en', { miniLesson: v })}
          onTl={(v) => setField('tl', { miniLesson: v })}
          placeholder={t('typeMiniLesson')}
          multiline
        />

        <Text style={styles.label}>{t('lessonImageLabel')}</Text>
        <Text style={styles.helperNote}>{t('lessonImageNote')}</Text>
        {miniLessonImageUrl ? (
          <Image source={{ uri: miniLessonImageUrl }} style={styles.imagePreview} />
        ) : (
          <View style={styles.imageEmpty}>
            <Text style={styles.imageEmptyText}>{t('noLessonImage')}</Text>
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
                {miniLessonImageUrl ? t('changePictureBtn') : t('choosePictureBtn')}
              </Text>
            )}
          </TouchableOpacity>
          {!!miniLessonImageUrl && !uploadingImage && (
            <TouchableOpacity style={styles.imageRemoveButton} onPress={() => setMiniLessonImageUrl(null)}>
              <Text style={styles.imageRemoveButtonText}>{t('removeBtn')}</Text>
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
            <Text style={styles.saveButtonText}>{t('saveQuestionBtn')}</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()} disabled={saving}>
          <Text style={styles.cancelButtonText}>{t('cancelBtn')}</Text>
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
  langColumn: { flex: 1, marginBottom: 8 },
  langLabel: { fontSize: 11.5, fontWeight: 'bold', color: '#8E8E93', marginBottom: 4 },
  removeSpacer: { width: 30 },
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