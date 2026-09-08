// src/features/admin/context/admin-content-context.tsx
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  contentApi,
  errorMessage,
  mediaApi,
  packsApi,
  readCache,
  writeCache,
  type ApiCategory,
  type ApiCategoryKey,
  type ApiJigsawPieceCount,
  type ApiPack,
  type ApiQuestion,
} from '@/shared/api';
import { getQuizQuestion, QuizQuestion } from '@/shared/content/quiz-content';
import categoryContent from '@/shared/content/category-content';
import { useUser } from '@/features/auth/context/user-context';
import { toUpsertRequest } from '@/features/admin/lib/question-mapping';
import {
  resolveEffectiveCategoryContent,
  resolveEffectiveQuestion,
  resolveJigsawPieceCount,
  slotId,
  type CategoryOverrides,
  type EffectiveCategoryContent,
  type QuestionOverrides,
} from '@/features/admin/lib/content-resolution';

/**
 * Admin-authored content, scoped to whichever content pack the caller is
 * editing. This context stays a single global provider (mounted once in
 * `_layout.tsx`, unchanged), but its internal state is now keyed by `packId`
 * so several packs' data can be cached side by side across navigations
 * without one screen's edits leaking into another pack.
 *
 * Student-facing reads no longer go through this context — see
 * `src/features/learning/context/class-content-context.tsx`.
 */
export interface ActionResult {
  success: boolean;
  message: string;
}

interface PackState {
  categories: CategoryOverrides;
  questions: QuestionOverrides;
  pack: ApiPack | null;
}

const EMPTY_PACK_STATE: PackState = { categories: {}, questions: {}, pack: null };

const packCacheKey = (packId: string) => `pack-content:${packId}`;

type AdminContentContextType = {
  isPackReady: (packId: string) => boolean;
  error: string | null;
  /** Fetches a pack's categories/questions/metadata the first time it's seen, or on demand. */
  ensurePackLoaded: (packId: string) => Promise<void>;
  refreshPack: (packId: string) => Promise<void>;

  getPack: (packId: string) => ApiPack | null;

  // Quiz question CRUD
  getEffectiveQuestion: (packId: string, category: string, level: number, activityNum: number) => QuizQuestion;
  isOverridden: (packId: string, category: string, level: number, activityNum: number) => boolean;
  upsertQuestion: (
    packId: string,
    category: string,
    level: number,
    activityNum: number,
    question: QuizQuestion,
  ) => Promise<ActionResult>;
  deleteQuestionOverride: (packId: string, category: string, level: number, activityNum: number) => Promise<ActionResult>;

  // Jigsaw picture + mini-lesson CRUD (per category, per pack)
  getEffectiveCategoryContent: (
    packId: string,
    category: string,
    level?: number,
    activityNum?: number,
  ) => EffectiveCategoryContent;
  getJigsawPieceCount: (packId: string, category: string, level: number, activityNum: number) => ApiJigsawPieceCount;
  setCategoryImageUri: (packId: string, category: string, uri: string, mimeType?: string) => Promise<ActionResult>;
  setCategoryContext: (packId: string, category: string, text: string) => Promise<ActionResult>;
  resetCategoryImage: (packId: string, category: string) => Promise<ActionResult>;
  uploadQuestionImage: (
    category: string,
    uri: string,
    mimeType?: string,
  ) => Promise<ActionResult & { url?: string }>;

  // Per-pack "show mini-lesson before quiz" toggle.
  setShowMiniLesson: (packId: string, value: boolean) => Promise<ActionResult>;
};

const AdminContentContext = createContext<AdminContentContextType | undefined>(undefined);

export function AdminContentProvider({ children }: { children: React.ReactNode }) {
  const { signedIn, ready: userReady } = useUser();

  const [packs, setPacks] = useState<Record<string, PackState>>({});
  const [readyPacks, setReadyPacks] = useState<Record<string, boolean>>({});
  const [loadingPacks, setLoadingPacks] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => () => { mounted.current = false; }, []);

  const stateFor = useCallback((packId: string) => packs[packId] ?? EMPTY_PACK_STATE, [packs]);

  const storePackState = useCallback((packId: string, next: PackState) => {
    setPacks((prev) => {
      const merged = { ...prev, [packId]: next };
      writeCache(packCacheKey(packId), next);
      return merged;
    });
  }, []);

  const refreshPack = useCallback(async (packId: string) => {
    if (!signedIn) return;
    setLoadingPacks((prev) => ({ ...prev, [packId]: true }));
    try {
      const [pack, categoryList, questionList] = await Promise.all([
        packsApi.get(packId),
        contentApi.categories(packId),
        contentApi.questions(packId),
      ]);
      if (!mounted.current) return;

      const categoryMap: CategoryOverrides = {};
      for (const c of categoryList) categoryMap[c.key] = c;
      const questionMap: QuestionOverrides = {};
      for (const q of questionList) questionMap[q.id] = q;

      storePackState(packId, { categories: categoryMap, questions: questionMap, pack });
      setError(null);
      setReadyPacks((prev) => ({ ...prev, [packId]: true }));
    } catch (err) {
      if (!mounted.current) return;
      setError(errorMessage(err, 'Could not load this pack from the server.'));
      // Still mark ready so the screen shows the (possibly cached) state
      // instead of spinning forever on a transient failure.
      setReadyPacks((prev) => ({ ...prev, [packId]: true }));
    } finally {
      if (mounted.current) setLoadingPacks((prev) => ({ ...prev, [packId]: false }));
    }
  }, [signedIn, storePackState]);

  const ensurePackLoaded = useCallback(async (packId: string) => {
    if (!userReady || !signedIn) return;
    if (readyPacks[packId] || loadingPacks[packId]) return;

    const cached = await readCache<PackState>(packCacheKey(packId));
    if (cached && mounted.current) {
      setPacks((prev) => ({ ...prev, [packId]: cached }));
    }
    await refreshPack(packId);
  }, [userReady, signedIn, readyPacks, loadingPacks, refreshPack]);

  const isPackReady = useCallback((packId: string) => readyPacks[packId] ?? false, [readyPacks]);
  const getPack = useCallback((packId: string) => stateFor(packId).pack, [stateFor]);

  const getEffectiveQuestion: AdminContentContextType['getEffectiveQuestion'] = useCallback(
    (packId, category, level, activityNum) => {
      const local = getQuizQuestion(category, level, activityNum);
      const api = stateFor(packId).questions[slotId(category, level, activityNum)];
      return resolveEffectiveQuestion(local, api);
    },
    [stateFor],
  );

  const isOverridden: AdminContentContextType['isOverridden'] = useCallback(
    (packId, category, level, activityNum) =>
      stateFor(packId).questions[slotId(category, level, activityNum)]?.isOverride ?? false,
    [stateFor],
  );

  const storeQuestion = useCallback((packId: string, api: ApiQuestion) => {
    setPacks((prev) => {
      const current = prev[packId] ?? EMPTY_PACK_STATE;
      const next = { ...current, questions: { ...current.questions, [api.id]: api } };
      const merged = { ...prev, [packId]: next };
      writeCache(packCacheKey(packId), next);
      return merged;
    });
  }, []);

  const storeCategory = useCallback((packId: string, api: ApiCategory) => {
    setPacks((prev) => {
      const current = prev[packId] ?? EMPTY_PACK_STATE;
      const next = { ...current, categories: { ...current.categories, [api.key]: api } };
      const merged = { ...prev, [packId]: next };
      writeCache(packCacheKey(packId), next);
      return merged;
    });
  }, []);

  const storePackMeta = useCallback((packId: string, pack: ApiPack) => {
    setPacks((prev) => {
      const current = prev[packId] ?? EMPTY_PACK_STATE;
      const next = { ...current, pack };
      const merged = { ...prev, [packId]: next };
      writeCache(packCacheKey(packId), next);
      return merged;
    });
  }, []);

  const upsertQuestion: AdminContentContextType['upsertQuestion'] = useCallback(
    async (packId, category, level, activityNum, question) => {
      try {
        const saved = await contentApi.upsertQuestion(
          packId,
          category as ApiCategoryKey,
          level,
          activityNum,
          toUpsertRequest(question),
        );
        if (mounted.current) storeQuestion(packId, saved);
        return { success: true, message: 'Na-update ang tanong para sa lahat ng mag-aaral.' };
      } catch (err) {
        return { success: false, message: errorMessage(err, 'Hindi na-save ang tanong.') };
      }
    },
    [storeQuestion],
  );

  const deleteQuestionOverride: AdminContentContextType['deleteQuestionOverride'] = useCallback(
    async (packId, category, level, activityNum) => {
      try {
        const reverted = await contentApi.revertQuestion(packId, category as ApiCategoryKey, level, activityNum);
        if (mounted.current) storeQuestion(packId, reverted);
        return { success: true, message: 'Naibalik sa default na tanong.' };
      } catch (err) {
        return { success: false, message: errorMessage(err, 'Hindi naalis ang custom na tanong.') };
      }
    },
    [storeQuestion],
  );

  const getEffectiveCategoryContent: AdminContentContextType['getEffectiveCategoryContent'] = useCallback(
    (packId, category, level, activityNum) => {
      const base = categoryContent[category] || categoryContent.history;
      const api = stateFor(packId).categories[category];
      return resolveEffectiveCategoryContent(base, api, level, activityNum);
    },
    [stateFor],
  );

  const getJigsawPieceCount: AdminContentContextType['getJigsawPieceCount'] = useCallback(
    (packId, category, level, activityNum) =>
      resolveJigsawPieceCount(stateFor(packId).categories[category], level, activityNum),
    [stateFor],
  );

  const setCategoryImageUri: AdminContentContextType['setCategoryImageUri'] = useCallback(
    async (packId, category, uri, mimeType) => {
      try {
        const publicUrl = await mediaApi.upload(uri, 'category-image', { categoryKey: category, mimeType });
        const saved = await contentApi.updateCategory(packId, category as ApiCategoryKey, { imageUrl: publicUrl });
        if (mounted.current) storeCategory(packId, saved);
        return { success: true, message: 'Na-update ang larawan ng puzzle.' };
      } catch (err) {
        return { success: false, message: errorMessage(err, 'Hindi na-upload ang larawan.') };
      }
    },
    [storeCategory],
  );

  const setCategoryContext: AdminContentContextType['setCategoryContext'] = useCallback(
    async (packId, category, text) => {
      try {
        const saved = await contentApi.updateCategory(packId, category as ApiCategoryKey, { context_tl: text });
        if (mounted.current) storeCategory(packId, saved);
        return { success: true, message: 'Na-save ang mini-lesson.' };
      } catch (err) {
        return { success: false, message: errorMessage(err, 'Hindi na-save ang mini-lesson.') };
      }
    },
    [storeCategory],
  );

  const resetCategoryImage: AdminContentContextType['resetCategoryImage'] = useCallback(
    async (packId, category) => {
      try {
        const saved = await contentApi.updateCategory(packId, category as ApiCategoryKey, { imageUrl: null });
        if (mounted.current) storeCategory(packId, saved);
        return { success: true, message: 'Naibalik ang default na larawan.' };
      } catch (err) {
        return { success: false, message: errorMessage(err, 'Hindi naibalik ang larawan.') };
      }
    },
    [storeCategory],
  );

  const uploadQuestionImage: AdminContentContextType['uploadQuestionImage'] = useCallback(
    async (category, uri, mimeType) => {
      try {
        const url = await mediaApi.upload(uri, 'question-image', { categoryKey: category, mimeType });
        return { success: true, message: 'Na-upload ang larawan.', url };
      } catch (err) {
        return { success: false, message: errorMessage(err, 'Hindi na-upload ang larawan.') };
      }
    },
    [],
  );

  const setShowMiniLesson: AdminContentContextType['setShowMiniLesson'] = useCallback(
    async (packId, value) => {
      const previous = stateFor(packId).pack;
      // Optimistic: a Switch should not lag.
      if (previous) storePackMeta(packId, { ...previous, showMiniLesson: value });
      try {
        const saved = await packsApi.patch(packId, { showMiniLesson: value });
        if (mounted.current) storePackMeta(packId, saved);
        return { success: true, message: 'Na-save ang setting.' };
      } catch (err) {
        if (mounted.current && previous) storePackMeta(packId, previous);
        return { success: false, message: errorMessage(err, 'Hindi na-save ang setting.') };
      }
    },
    [stateFor, storePackMeta],
  );

  const value = useMemo<AdminContentContextType>(
    () => ({
      isPackReady,
      error,
      ensurePackLoaded,
      refreshPack,
      getPack,
      getEffectiveQuestion,
      isOverridden,
      upsertQuestion,
      deleteQuestionOverride,
      getEffectiveCategoryContent,
      getJigsawPieceCount,
      setCategoryImageUri,
      setCategoryContext,
      resetCategoryImage,
      uploadQuestionImage,
      setShowMiniLesson,
    }),
    [
      isPackReady, error, ensurePackLoaded, refreshPack, getPack, getEffectiveQuestion, isOverridden,
      upsertQuestion, deleteQuestionOverride, getEffectiveCategoryContent, getJigsawPieceCount,
      setCategoryImageUri, setCategoryContext, resetCategoryImage, uploadQuestionImage, setShowMiniLesson,
    ],
  );

  return <AdminContentContext.Provider value={value}>{children}</AdminContentContext.Provider>;
}

export function useAdminContent() {
  const context = useContext(AdminContentContext);
  if (!context) throw new Error('useAdminContent must be used within AdminContentProvider');
  return context;
}
