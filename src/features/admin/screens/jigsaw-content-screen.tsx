import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView, Image, Alert, ActivityIndicator } from 'react-native';
import { TextInput } from '@/shared/components/ui/capped-text';
import { H2, H3, Body, BodyStrong, Caption, Label } from '@/shared/components/ui';
import { tokens } from '@/shared/theme/tokens';
import { typeScale } from '@/shared/theme/typography';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAdminContent } from '@/features/admin/context/admin-content-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useLanguage } from '@/shared/i18n/language-context';
import { CATEGORY_META as CATEGORIES } from '@/shared/content/category-meta';
import { readableColumn } from '@/shared/theme/layout';
import type { ApiJigsawPieceCount } from '@/shared/api/types';
import {
  PIECE_CHOICES,
  cutFor,
  gridFor,
  itemFor,
  withCut,
  withDetails,
  withPicture,
  withoutPicture,
  type ItemDetails,
} from '@/features/admin/lib/jigsaw-slots';

const LEVELS = [1, 2, 3, 4, 5];
const ACTIVITIES = [1, 2, 3, 4, 5, 6];
const slotKey = (level: number, activityNum: number) => `${level}_${activityNum}`;

/**
 * Jigsaw content for one pack, the teacher app's match for the web console
 * (Correction 1, N1). Per category: every level and its six activities, each
 * with a preview cut the way students will play it, its own picture, its own
 * cut of 6, 9 or 12 pieces, and the name, definition and mini-lesson shown when
 * the puzzle is finished. Below that, the category picture and mini-lesson,
 * which play in any activity without a picture of its own.
 */

export default function JigsawContentScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { packId } = useLocalSearchParams<{ packId: string }>();
  const {
    isPackReady, error, ensurePackLoaded, getEffectiveCategoryContent, getCategoryContexts, setCategoryImageUri,
    setCategoryContext, resetCategoryImage, getJigsawSet, saveJigsawSet, uploadJigsawImage,
  } = useAdminContent();
  const [categoryKey, setCategoryKey] = useState(CATEGORIES[0].key);
  const [level, setLevel] = useState(1);
  const [activityNum, setActivityNum] = useState(1);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draftTl, setDraftTl] = useState('');
  const [draftEn, setDraftEn] = useState('');
  const [busyKey, setBusyKey] = useState<string | null>(null);

  useEffect(() => {
    if (packId) ensurePackLoaded(packId);
  }, [packId, ensurePackLoaded]);

  if (!packId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorBanner}>
          <Caption style={styles.errorBannerText}>{t('adminNoPackSelected')}</Caption>
        </View>
      </SafeAreaView>
    );
  }

  const ready = isPackReady(packId);

  /**
   * The picked file is uploaded straight to Cloud Storage with a signed URL
   * from `POST /media/upload-url`, then its public URL is saved on the
   * category — so the picture follows the category to every device instead of
   * being a local file:// path only this phone can open.
   */
  const pickImage = async (categoryKey: string) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('adminPermissionNeeded'), t('photoPermissionPuzzleMsg'));
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    const asset = picked.assets?.[0];
    if (picked.canceled || !asset?.uri) return;

    setBusyKey(categoryKey);
    try {
      const result = await setCategoryImageUri(packId, categoryKey, asset.uri, asset.mimeType ?? undefined);
      if (!result.success) Alert.alert(t('adminUploadFailedTitle'), result.message);
    } finally {
      setBusyKey(null);
    }
  };

  const handleReset = async (categoryKey: string) => {
    setBusyKey(categoryKey);
    try {
      const result = await resetCategoryImage(packId, categoryKey);
      if (!result.success) Alert.alert(t('adminRestoreFailedTitle'), result.message);
    } finally {
      setBusyKey(null);
    }
  };

  const startEditingLesson = (categoryKey: string) => {
    const texts = getCategoryContexts(packId, categoryKey);
    setEditingKey(categoryKey);
    setDraftEn(texts.context_en);
    setDraftTl(texts.context_tl);
  };

  const saveLesson = async (categoryKey: string) => {
    const context_en = draftEn.trim();
    const context_tl = draftTl.trim();
    // Optional text: both empty is allowed, one filled needs the other.
    if (!context_en !== !context_tl) {
      Alert.alert(t('adminEmptyTitle'), t('bothLanguagesRequired'));
      return;
    }
    setBusyKey(categoryKey);
    try {
      const result = await setCategoryContext(packId, categoryKey, { context_en, context_tl });
      if (!result.success) {
        Alert.alert(t('adminSaveFailedTitle'), result.message);
        return;
      }
      setEditingKey(null);
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <Ionicons name="chevron-back" size={22} color="#FFF" />
        </TouchableOpacity>
        <H2 style={styles.headerTitle}>{t('jigsawContentTitle')}</H2>
        <Caption style={styles.headerSubtitle}>{t('jigsawContentSubtitle')}</Caption>
      </View>

      {!!error && (
        <View style={styles.errorBanner}>
          <Ionicons name="cloud-offline-outline" size={16} color="#FFF" />
          <Caption style={styles.errorBannerText}>{error}</Caption>
        </View>
      )}

      <ScrollView contentContainerStyle={[styles.list, readableColumn]}>
        {!ready && (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color="#9B4FD6" />
            <Caption style={styles.loadingText}>{t('adminFetchingContent')}</Caption>
          </View>
        )}

        {ready && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {CATEGORIES.map((cat) => {
              const active = cat.key === categoryKey;
              return (
                <TouchableOpacity
                  key={cat.key}
                  style={[styles.chip, { borderColor: cat.color }, active && { backgroundColor: cat.color }]}
                  onPress={() => {
                    setCategoryKey(cat.key);
                    setEditingKey(null);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Caption style={[styles.chipText, { color: active ? tokens.color.onDark : cat.color }]}>{t(cat.labelKey)}</Caption>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {ready && (
          <ActivityJigsaws
            key={categoryKey}
            packId={packId}
            categoryKey={categoryKey}
            color={(CATEGORIES.find((c) => c.key === categoryKey) ?? CATEGORIES[0]).color}
            level={level}
            activityNum={activityNum}
            onSelect={(l, n) => {
              setLevel(l);
              setActivityNum(n);
            }}
            getJigsawSet={getJigsawSet}
            saveJigsawSet={saveJigsawSet}
            uploadJigsawImage={uploadJigsawImage}
            getEffectiveCategoryContent={getEffectiveCategoryContent}
          />
        )}

        {ready && [CATEGORIES.find((c) => c.key === categoryKey) ?? CATEGORIES[0]].map((cat) => {
          const content = getEffectiveCategoryContent(packId, cat.key);
          const isEditing = editingKey === cat.key;
          const busy = busyKey === cat.key;
          return (
            <View key={cat.key} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.dot, { backgroundColor: cat.color }]} />
                <H3 style={styles.cardTitle}>{t('jigsawCategorySection')}</H3>
              </View>
              <Caption style={styles.sectionHint}>{t('jigsawCategoryHint')}</Caption>

              <Image source={content.image} style={styles.preview} resizeMode="cover" />

              <View style={styles.imageActions}>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: cat.color }, busy && styles.busyBtn]}
                  onPress={() => pickImage(cat.key)}
                  disabled={busy}
                >
                  {busy ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Ionicons name="image-outline" size={16} color="#FFF" />
                  )}
                  <Caption style={styles.actionBtnText}>{t('changePictureBtn')}</Caption>
                </TouchableOpacity>
                {content.hasCustomImage && (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.resetBtn, busy && styles.busyBtn]}
                    onPress={() => handleReset(cat.key)}
                    disabled={busy}
                  >
                    <Ionicons name="refresh-outline" size={16} color="#FFF" />
                    <Caption style={styles.actionBtnText}>{t('restoreDefaultBtn')}</Caption>
                  </TouchableOpacity>
                )}
              </View>

              {isEditing ? (
                <View style={styles.lessonEditWrap}>
                  <Caption style={styles.langLabel}>{t('contentLangEnglish')}</Caption>
                  <TextInput
                    style={styles.lessonInput}
                    value={draftEn}
                    onChangeText={setDraftEn}
                    multiline
                    placeholder={t('typeMiniLesson')}
                  />
                  <Caption style={styles.langLabel}>{t('contentLangTagalog')}</Caption>
                  <TextInput
                    style={styles.lessonInput}
                    value={draftTl}
                    onChangeText={setDraftTl}
                    multiline
                    placeholder={t('typeMiniLesson')}
                  />
                  <View style={styles.lessonActions}>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: cat.color }, busy && styles.busyBtn]}
                      onPress={() => saveLesson(cat.key)}
                      disabled={busy}
                    >
                      <Caption style={styles.actionBtnText}>{t('saveBtn')}</Caption>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.resetBtn]}
                      onPress={() => setEditingKey(null)}
                      disabled={busy}
                    >
                      <Caption style={styles.actionBtnText}>{t('cancelBtn')}</Caption>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity onPress={() => startEditingLesson(cat.key)}>
                  <Body style={styles.lessonText} numberOfLines={3}>{content.context}</Body>
                  <Caption style={[styles.editLessonLink, { color: cat.color }]}>{t('editMiniLessonBtn')}</Caption>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}


type AdminContent = ReturnType<typeof useAdminContent>;

/** One category's levels and activities, and the editor for the chosen one. */
function ActivityJigsaws({
  packId,
  categoryKey,
  color,
  level,
  activityNum,
  onSelect,
  getJigsawSet,
  saveJigsawSet,
  uploadJigsawImage,
  getEffectiveCategoryContent,
}: {
  packId: string;
  categoryKey: string;
  color: string;
  level: number;
  activityNum: number;
  onSelect: (level: number, activityNum: number) => void;
  getJigsawSet: AdminContent['getJigsawSet'];
  saveJigsawSet: AdminContent['saveJigsawSet'];
  uploadJigsawImage: AdminContent['uploadJigsawImage'];
  getEffectiveCategoryContent: AdminContent['getEffectiveCategoryContent'];
}) {
  const { t } = useLanguage();
  const set = getJigsawSet(packId, categoryKey);
  const slot = slotKey(level, activityNum);
  const slotLabel = t('jigsawSlotTitle', { level, num: activityNum });
  const item = itemFor(set, slot);
  const cut = cutFor(set, slot);
  const { rows, cols } = gridFor(cut.pieces);
  const preview = getEffectiveCategoryContent(packId, categoryKey, level, activityNum).image;

  const blank: ItemDetails = { title: '', definition_en: null, definition_tl: null, context_en: null, context_tl: null };
  const [draft, setDraft] = useState<ItemDetails>(blank);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  // A different activity, or a fresh save, resets the form to what is stored.
  const itemKey = item ? `${item.id}:${item.title}:${item.context_en}:${item.context_tl}:${item.definition_en}:${item.definition_tl}` : 'none';
  useEffect(() => {
    setDraft(
      item
        ? { title: item.title, definition_en: item.definition_en, definition_tl: item.definition_tl, context_en: item.context_en, context_tl: item.context_tl }
        : blank,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slot, itemKey]);

  useEffect(() => setNotice(null), [slot]);

  const run = async (work: () => Promise<{ success: boolean; message: string }>) => {
    setBusy(true);
    setNotice(null);
    try {
      const result = await work();
      setNotice({ tone: result.success ? 'ok' : 'error', text: result.message });
    } finally {
      setBusy(false);
    }
  };

  const pickPicture = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setNotice({ tone: 'error', text: t('photoPermissionPuzzleMsg') });
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    const asset = picked.assets?.[0];
    if (picked.canceled || !asset?.uri) return;

    await run(async () => {
      const uploaded = await uploadJigsawImage(categoryKey, asset.uri, asset.mimeType ?? undefined);
      if (!uploaded.success || !uploaded.url) return uploaded;
      return saveJigsawSet(packId, categoryKey, withPicture(set, slot, uploaded.url, slotLabel), t('jigsawPictureSavedMsg'));
    });
  };

  const usePictureOfCategory = () =>
    run(() => saveJigsawSet(packId, categoryKey, withoutPicture(set, slot), t('jigsawClearedMsg', { slot: slotLabel })));

  const chooseCut = (next: ApiJigsawPieceCount | null) =>
    run(() =>
      saveJigsawSet(
        packId,
        categoryKey,
        withCut(set, slot, next),
        next === null
          ? t('jigsawCutDefaultMsg', { slot: slotLabel, n: cutFor(withCut(set, slot, null), slot).pieces })
          : t('jigsawCutSavedMsg', { slot: slotLabel, n: next }),
      ),
    );

  const saveDetails = () => {
    const tidy = (v: string | null) => (v && v.trim() ? v.trim() : null);
    const details: ItemDetails = {
      title: draft.title.trim() || slotLabel,
      definition_en: tidy(draft.definition_en),
      definition_tl: tidy(draft.definition_tl),
      context_en: tidy(draft.context_en),
      context_tl: tidy(draft.context_tl),
    };
    return run(() => saveJigsawSet(packId, categoryKey, withDetails(set, slot, details), t('jigsawDetailsSavedMsg')));
  };

  const field = (key: keyof ItemDetails, labelKey: Parameters<typeof t>[0], multiline = false) => (
    <View style={styles.fieldWrap}>
      <Label style={styles.fieldLabel}>{t(labelKey)}</Label>
      <TextInput
        style={[styles.fieldInput, multiline && styles.fieldInputMulti]}
        value={draft[key] ?? ''}
        onChangeText={(v) => setDraft((d) => ({ ...d, [key]: v }))}
        multiline={multiline}
        editable={!busy}
        placeholder={t(labelKey)}
        placeholderTextColor={tokens.color.inkFaint}
      />
    </View>
  );

  return (
    <View style={styles.activitiesCard}>
      <View style={styles.levelRow}>
        {LEVELS.map((l) => {
          const ready = ACTIVITIES.filter((n) => set.slots[slotKey(l, n)]).length;
          const active = l === level;
          return (
            <TouchableOpacity
              key={l}
              style={[styles.levelTab, active && { borderColor: color, backgroundColor: tokens.color.surface }]}
              onPress={() => onSelect(l, 1)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <BodyStrong style={active ? { color } : undefined}>{t('levelNum', { n: l })}</BodyStrong>
              <Caption>{t('jigsawLevelReady', { ready })}</Caption>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.activityGrid}>
        {ACTIVITIES.map((n) => {
          const key = slotKey(level, n);
          const own = itemFor(set, key);
          const active = n === activityNum;
          return (
            <TouchableOpacity
              key={n}
              style={[styles.activityTile, active && { borderColor: color }]}
              onPress={() => onSelect(level, n)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Image
                source={getEffectiveCategoryContent(packId, categoryKey, level, n).image}
                style={[styles.activityThumb, !own && styles.activityThumbFallback]}
                resizeMode="cover"
              />
              <View style={styles.activityTileBody}>
                <BodyStrong numberOfLines={1}>{t('jigsawActivityShort', { n })}</BodyStrong>
                <Caption numberOfLines={1}>{own ? own.title : t('jigsawUsesCategoryPicture')}</Caption>
                <Caption style={{ color }}>{t('jigsawPiecesShort', { n: cutFor(set, key).pieces })}</Caption>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.editor}>
        <H3>{slotLabel}</H3>

        <Label style={styles.fieldLabel}>{t('jigsawStudentView')}</Label>
        <View style={styles.previewFrame}>
          <Image source={preview} style={styles.previewImage} resizeMode="cover" />
          {/* The cut drawn over the picture, rows by columns as the puzzle board lays it out. */}
          {Array.from({ length: rows - 1 }, (_, i) => (
            <View key={`r${i}`} style={[styles.cutLineH, { top: `${((i + 1) / rows) * 100}%` }]} />
          ))}
          {Array.from({ length: cols - 1 }, (_, i) => (
            <View key={`c${i}`} style={[styles.cutLineV, { left: `${((i + 1) / cols) * 100}%` }]} />
          ))}
        </View>

        <View style={styles.imageActions}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: color }, busy && styles.busyBtn]} onPress={pickPicture} disabled={busy}>
            {busy ? <ActivityIndicator color="#FFF" size="small" /> : <Ionicons name="image-outline" size={16} color="#FFF" />}
            <Caption style={styles.actionBtnText}>{t(item ? 'jigsawReplacePicture' : 'jigsawAddPicture')}</Caption>
          </TouchableOpacity>
          {item && (
            <TouchableOpacity style={[styles.actionBtn, styles.resetBtn, busy && styles.busyBtn]} onPress={usePictureOfCategory} disabled={busy}>
              <Ionicons name="refresh-outline" size={16} color="#FFF" />
              <Caption style={styles.actionBtnText}>{t('jigsawUseCategoryPicture')}</Caption>
            </TouchableOpacity>
          )}
        </View>

        <Label style={styles.fieldLabel}>{t('jigsawPiecesLabel')}</Label>
        <View style={styles.cutRow}>
          {[null, ...PIECE_CHOICES].map((choice) => {
            const active = choice === null ? !cut.pinned : cut.pinned && cut.pieces === choice;
            const label =
              choice === null
                ? t('jigsawDefaultCut', { n: cutFor(withCut(set, slot, null), slot).pieces })
                : t('jigsawPiecesShort', { n: choice });
            return (
              <TouchableOpacity
                key={String(choice)}
                style={[styles.cutChip, { borderColor: color }, active && { backgroundColor: color }]}
                onPress={() => !active && chooseCut(choice)}
                disabled={busy}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Caption style={[styles.chipText, { color: active ? tokens.color.onDark : color }]}>{label}</Caption>
              </TouchableOpacity>
            );
          })}
        </View>

        {notice && (
          <Caption style={notice.tone === 'ok' ? styles.noticeOk : styles.noticeError}>{notice.text}</Caption>
        )}

        {item ? (
          <>
            {field('title', 'jigsawNameLabel')}
            {field('definition_tl', 'jigsawDefinitionTl')}
            {field('definition_en', 'jigsawDefinitionEn')}
            {field('context_tl', 'jigsawLessonTl', true)}
            {field('context_en', 'jigsawLessonEn', true)}
            <TouchableOpacity style={[styles.actionBtn, styles.saveBtn, { backgroundColor: color }, busy && styles.busyBtn]} onPress={saveDetails} disabled={busy}>
              <Caption style={styles.actionBtnText}>{t('jigsawSaveDetails')}</Caption>
            </TouchableOpacity>
          </>
        ) : (
          <Body style={styles.sectionHint}>{t('jigsawNeedsPictureHint')}</Body>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5EFE0' },
  header: { backgroundColor: '#9B4FD6', paddingTop: 10, paddingBottom: 16, paddingHorizontal: 16, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerBack: { marginBottom: 4 },
  headerTitle: { color: '#FFF' },
  headerSubtitle: { color: '#FFF', opacity: 0.9, marginTop: 2 },
  list: { padding: 16, gap: 16 },
  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 14, borderWidth: 1.5, borderColor: '#E0D5BE' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  cardTitle: { color: '#1A1A1A' },
  preview: { width: '100%', height: 140, borderRadius: 12, marginBottom: 10, backgroundColor: '#EEE' },
  imageActions: { flexDirection: 'row', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14 },
  resetBtn: { backgroundColor: '#8E8E93' },
  busyBtn: { opacity: 0.6 },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#B23A3A',
    borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, marginHorizontal: 16, marginTop: 12,
  },
  errorBannerText: { color: '#FFF', flex: 1 },
  loadingWrap: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  loadingText: { color: '#8E8E93' },
  actionBtnText: { color: '#FFF', fontFamily: tokens.font.bodyBold },
  lessonText: { color: '#2B2B2B' },
  editLessonLink: { fontFamily: tokens.font.bodyBold, marginTop: 6 },
  lessonEditWrap: { gap: 8 },
  langLabel: { fontFamily: tokens.font.bodyBold, color: '#5C3A21', marginBottom: -4 },
  lessonInput: {
    borderWidth: 1.5, borderColor: '#E0D5BE', borderRadius: 12, padding: 10, minHeight: 80,
    textAlignVertical: 'top', fontFamily: tokens.font.body, fontSize: typeScale.body.fontSize, color: '#1A1A1A',
  },
  lessonActions: { flexDirection: 'row', gap: 8 },
  sectionHint: { color: tokens.color.inkMuted, marginBottom: 10 },
  chipRow: { gap: tokens.space.xs, paddingVertical: 2 },
  chip: { borderWidth: 1.5, borderRadius: tokens.radius.pill, paddingHorizontal: tokens.space.md, minHeight: tokens.hit.min, justifyContent: 'center' },
  chipText: { fontFamily: tokens.font.bodyBold },
  activitiesCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 14, borderWidth: 1.5, borderColor: '#E0D5BE', gap: tokens.space.md },
  levelRow: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.xs },
  levelTab: {
    flexGrow: 1, flexBasis: '30%', borderWidth: 1.5, borderColor: tokens.color.border, borderRadius: tokens.radius.sm,
    paddingVertical: tokens.space.xs, paddingHorizontal: tokens.space.sm, backgroundColor: tokens.color.surfaceSunken,
  },
  activityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.xs },
  activityTile: {
    flexBasis: '48%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: tokens.space.xs, padding: tokens.space.xs,
    borderWidth: 1.5, borderColor: tokens.color.border, borderRadius: tokens.radius.sm, minWidth: 0,
  },
  activityThumb: { width: 48, height: 48, borderRadius: 8, backgroundColor: '#EEE' },
  activityThumbFallback: { opacity: 0.45 },
  activityTileBody: { flex: 1, minWidth: 0 },
  editor: { gap: tokens.space.xs, borderTopWidth: 1, borderTopColor: tokens.color.divider, paddingTop: tokens.space.md },
  previewFrame: { width: '100%', aspectRatio: 4 / 3, borderRadius: 12, overflow: 'hidden', backgroundColor: '#EEE', marginBottom: 6 },
  previewImage: { width: '100%', height: '100%' },
  cutLineH: { position: 'absolute', left: 0, right: 0, height: 2, marginTop: -1, backgroundColor: 'rgba(255,255,255,0.9)' },
  cutLineV: { position: 'absolute', top: 0, bottom: 0, width: 2, marginLeft: -1, backgroundColor: 'rgba(255,255,255,0.9)' },
  cutRow: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.xs, marginBottom: 6 },
  cutChip: { borderWidth: 1.5, borderRadius: tokens.radius.pill, paddingHorizontal: tokens.space.md, minHeight: tokens.hit.min, justifyContent: 'center' },
  fieldWrap: { gap: 4 },
  fieldLabel: { color: tokens.color.inkMuted, marginTop: 4 },
  fieldInput: {
    borderWidth: 1.5, borderColor: '#E0D5BE', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8,
    fontFamily: tokens.font.body, fontSize: typeScale.body.fontSize, color: '#1A1A1A',
  },
  fieldInputMulti: { minHeight: 80, textAlignVertical: 'top' },
  saveBtn: { alignSelf: 'flex-start', marginTop: 6, minHeight: tokens.hit.min },
  noticeOk: { color: tokens.color.success, fontFamily: tokens.font.bodyBold },
  noticeError: { color: tokens.color.dangerInk, fontFamily: tokens.font.bodyBold },
});
