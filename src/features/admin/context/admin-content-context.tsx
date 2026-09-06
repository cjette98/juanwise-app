import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  contentApi,
  errorMessage,
  mediaApi,
  readCache,
  writeCache,
  type ApiCategory,
  type ApiCategoryKey,
  type ApiJigsawPieceCount,
  type ApiQuestion,
} from '@/shared/api';
import quizContent, { getQuizQuestion, QuizQuestion } from '@/shared/content/quiz-content';
import categoryContent from '@/shared/content/category-content';
import { useUser } from '@/features/auth/context/user-context';
import { toQuizQuestion, toUpsertRequest } from '@/features/admin/lib/question-mapping';

/**
 * Admin-authored content, served by the API so an edit reaches every student
 * instead of only the device it was made on.
 *
 * The backend's seeded defaults are placeholders (juanwise-be
 * `content/defaults.ts` was written before the Expo source was available), so
 * this layers the two sources rather than replacing one with the other:
 * a slot the admin has actually authored (`isOverride: true`) wins, and
 * everything else falls back to the app's bundled `quiz-content.ts` /
 * `category-content.ts`. Seed the backend from those two files and the fallback
 * simply stops being reached.
 */
type CategoryOverrides = Partial<Record<string, ApiCategory>>;
type QuestionOverrides = Record<string, ApiQuestion>; // `${category}_${level}_${activityNum}`

export type EffectiveCategoryContent = {
  /** Pass straight into <Image source={...}> — either a require() id or a { uri } object. */
  image: any;
  context: string;
  /**
   * The admin's one-line summary of the picture, shown on the jigsaw reveal.
   * Null when nobody has written one — the reveal then shows the label alone,
   * so there is no bundled fallback to layer here.
   */
  definition: string | null;
  /** The library picture's own name, when one was rotated in. */
  title: string | null;
  hasCustomImage: boolean;
};

export interface ActionResult {
  success: boolean;
  message: string;
}

const QUESTIONS_CACHE_KEY = 'content-questions';
const CATEGORIES_CACHE_KEY = 'content-categories';
const SETTINGS_CACHE_KEY = 'content-settings';

const slotId = (category: string, level: number, activityNum: number) =>
  `${category}_${level}_${activityNum}`;

/** The key a jigsaw activity's picture and cut are stored under. */
const jigsawSlotKey = (level: number, activityNum: number) => `${level}_${activityNum}`;

/**
 * The cut an activity plays when the admin has not chosen one — the ramp
 * across a level's six activities, which is what every activity used before
 * the console could set this per activity.
 */
function rampPieceCount(activityNum: number): ApiJigsawPieceCount {
  if (activityNum <= 2) return 6;
  if (activityNum <= 4) return 9;
  return 12;
}

type AdminContentContextType = {
  ready: boolean;
  error: string | null;
  refresh: () => Promise<void>;

  // Quiz question CRUD
  getEffectiveQuestion: (category: string, level: number, activityNum: number) => QuizQuestion;
  isOverridden: (category: string, level: number, activityNum: number) => boolean;
  upsertQuestion: (category: string, level: number, activityNum: number, question: QuizQuestion) => Promise<ActionResult>;
  deleteQuestionOverride: (category: string, level: number, activityNum: number) => Promise<ActionResult>;

  // Jigsaw picture + mini-lesson CRUD (per category)
  /**
   * Pass `level` and `activityNum` for a jigsaw activity: an admin can give
   * each one its own picture, so the slot decides which comes back. Omit them
   * for the category-wide picture.
   */
  getEffectiveCategoryContent: (
    category: string,
    level?: number,
    activityNum?: number,
  ) => EffectiveCategoryContent;
  /**
   * How many pieces a jigsaw activity is cut into: the admin's choice when
   * there is one, otherwise the difficulty ramp across the level's six
   * activities.
   */
  getJigsawPieceCount: (category: string, level: number, activityNum: number) => ApiJigsawPieceCount;
  /** Uploads the picked image to Cloud Storage, then saves its URL on the category. */
  setCategoryImageUri: (category: string, uri: string, mimeType?: string) => Promise<ActionResult>;
  setCategoryContext: (category: string, text: string) => Promise<ActionResult>;
  resetCategoryImage: (category: string) => Promise<ActionResult>;

  /**
   * Uploads a mini-lesson picture and hands back its public URL. Unlike the
   * category image this does not save anything on its own: the URL belongs to a
   * question, and the question is written by `upsertQuestion` — so the editor
   * holds it in the draft until the admin saves.
   */
  uploadQuestionImage: (
    category: string,
    uri: string,
    mimeType?: string,
  ) => Promise<ActionResult & { url?: string }>;

  // Global Quiz setting — whether the "Mini-Lesson" hint screen shows before
  // each quiz question, app-wide.
  showMiniLesson: boolean;
  setShowMiniLesson: (value: boolean) => Promise<ActionResult>;
};

const AdminContentContext = createContext<AdminContentContextType | undefined>(undefined);

export function AdminContentProvider({ children }: { children: React.ReactNode }) {
  const { signedIn, ready: userReady } = useUser();

  const [questions, setQuestions] = useState<QuestionOverrides>({});
  const [categories, setCategories] = useState<CategoryOverrides>({});
  const [showMiniLesson, setShowMiniLessonState] = useState(true);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => () => { mounted.current = false; }, []);

  const refresh = useCallback(async () => {
    if (!signedIn) return;
    try {
      const [questionList, categoryList, settings] = await Promise.all([
        contentApi.questions(),
        contentApi.categories(),
        contentApi.settings(),
      ]);
      if (!mounted.current) return;

      const questionMap: QuestionOverrides = {};
      for (const q of questionList) questionMap[q.id] = q;
      const categoryMap: CategoryOverrides = {};
      for (const c of categoryList) categoryMap[c.key] = c;

      setQuestions(questionMap);
      setCategories(categoryMap);
      setShowMiniLessonState(settings.showMiniLesson);
      setError(null);

      writeCache(QUESTIONS_CACHE_KEY, questionMap);
      writeCache(CATEGORIES_CACHE_KEY, categoryMap);
      writeCache(SETTINGS_CACHE_KEY, settings.showMiniLesson);
    } catch (err) {
      if (!mounted.current) return;
      setError(errorMessage(err, 'Could not load content from the server.'));
    }
  }, [signedIn]);

  useEffect(() => {
    if (!userReady) return;

    (async () => {
      const [cachedQuestions, cachedCategories, cachedSetting] = await Promise.all([
        readCache<QuestionOverrides>(QUESTIONS_CACHE_KEY),
        readCache<CategoryOverrides>(CATEGORIES_CACHE_KEY),
        readCache<boolean>(SETTINGS_CACHE_KEY),
      ]);
      if (mounted.current) {
        if (cachedQuestions) setQuestions(cachedQuestions);
        if (cachedCategories) setCategories(cachedCategories);
        if (cachedSetting != null) setShowMiniLessonState(cachedSetting);
      }

      await refresh();
      if (mounted.current) setReady(true);
    })();
  }, [userReady, refresh]);

  const getEffectiveQuestion = useCallback(
    (category: string, level: number, activityNum: number): QuizQuestion => {
      const local = getQuizQuestion(category, level, activityNum);
      const api = questions[slotId(category, level, activityNum)];
      // Only an admin edit displaces the bundled content; the backend's own
      // unauthored defaults are placeholders and would be a downgrade.
      return api?.isOverride ? toQuizQuestion(api, local) : local;
    },
    [questions],
  );

  const isOverridden = useCallback(
    (category: string, level: number, activityNum: number) =>
      questions[slotId(category, level, activityNum)]?.isOverride ?? false,
    [questions],
  );

  const storeQuestion = useCallback((api: ApiQuestion) => {
    setQuestions((prev) => {
      const next = { ...prev, [api.id]: api };
      writeCache(QUESTIONS_CACHE_KEY, next);
      return next;
    });
  }, []);

  const storeCategory = useCallback((api: ApiCategory) => {
    setCategories((prev) => {
      const next = { ...prev, [api.key]: api };
      writeCache(CATEGORIES_CACHE_KEY, next);
      return next;
    });
  }, []);

  const upsertQuestion: AdminContentContextType['upsertQuestion'] = useCallback(
    async (category, level, activityNum, question) => {
      try {
        const saved = await contentApi.upsertQuestion(
          category as ApiCategoryKey,
          level,
          activityNum,
          toUpsertRequest(question),
        );
        if (mounted.current) storeQuestion(saved);
        return { success: true, message: 'Na-update ang tanong para sa lahat ng mag-aaral.' };
      } catch (err) {
        return { success: false, message: errorMessage(err, 'Hindi na-save ang tanong.') };
      }
    },
    [storeQuestion],
  );

  const deleteQuestionOverride: AdminContentContextType['deleteQuestionOverride'] = useCallback(
    async (category, level, activityNum) => {
      try {
        const reverted = await contentApi.revertQuestion(category as ApiCategoryKey, level, activityNum);
        if (mounted.current) storeQuestion(reverted);
        return { success: true, message: 'Naibalik sa default na tanong.' };
      } catch (err) {
        return { success: false, message: errorMessage(err, 'Hindi naalis ang custom na tanong.') };
      }
    },
    [storeQuestion],
  );

  const getEffectiveCategoryContent = useCallback(
    (category: string, level?: number, activityNum?: number): EffectiveCategoryContent => {
      const base = categoryContent[category] || categoryContent.history;
      const api = categories[category];

      // Each jigsaw activity can be given its own picture in the admin console,
      // so a student is not solving the same image thirty times. Callers that do
      // not name an activity (the mini-lesson list, for one) still get the
      // category-wide picture, as does any activity nobody has assigned.
      const assignedId =
        level !== undefined && activityNum !== undefined
          ? api?.jigsawSlots?.[jigsawSlotKey(level, activityNum)]
          : undefined;
      const picked = assignedId ? api?.jigsaws?.find((item) => item.id === assignedId) : undefined;

      if (picked) {
        return {
          image: { uri: picked.imageUrl },
          // Tagalog first; English is better than nothing when only one
          // language was filled in, and the category text is the last resort.
          context: picked.context_tl ?? picked.context_en ?? api?.context_tl ?? base.context_tl,
          definition: picked.definition_tl ?? picked.definition_en ?? null,
          title: picked.title,
          hasCustomImage: true,
        };
      }

      return {
        image: api?.imageUrl ? { uri: api.imageUrl } : base.image,
        context: api?.context_tl ?? base.context_tl,
        definition: api?.definition_tl ?? api?.definition_en ?? null,
        title: null,
        hasCustomImage: !!api?.imageUrl,
      };
    },
    [categories],
  );

  const getJigsawPieceCount = useCallback(
    (category: string, level: number, activityNum: number): ApiJigsawPieceCount =>
      // An unset activity is not a gap to fill with a default number: it means
      // "keep the ramp", so a cut nobody chose still changes with the activity.
      categories[category]?.jigsawPieces?.[jigsawSlotKey(level, activityNum)] ??
      rampPieceCount(activityNum),
    [categories],
  );

  const setCategoryImageUri: AdminContentContextType['setCategoryImageUri'] = useCallback(
    async (category, uri, mimeType) => {
      try {
        const publicUrl = await mediaApi.upload(uri, 'category-image', { categoryKey: category, mimeType });
        const saved = await contentApi.updateCategory(category as ApiCategoryKey, { imageUrl: publicUrl });
        if (mounted.current) storeCategory(saved);
        return { success: true, message: 'Na-update ang larawan ng puzzle.' };
      } catch (err) {
        return { success: false, message: errorMessage(err, 'Hindi na-upload ang larawan.') };
      }
    },
    [storeCategory],
  );

  const setCategoryContext: AdminContentContextType['setCategoryContext'] = useCallback(
    async (category, text) => {
      try {
        const saved = await contentApi.updateCategory(category as ApiCategoryKey, { context_tl: text });
        if (mounted.current) storeCategory(saved);
        return { success: true, message: 'Na-save ang mini-lesson.' };
      } catch (err) {
        return { success: false, message: errorMessage(err, 'Hindi na-save ang mini-lesson.') };
      }
    },
    [storeCategory],
  );

  const resetCategoryImage: AdminContentContextType['resetCategoryImage'] = useCallback(
    async (category) => {
      try {
        const saved = await contentApi.updateCategory(category as ApiCategoryKey, { imageUrl: null });
        if (mounted.current) storeCategory(saved);
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
    async (value) => {
      const previous = showMiniLesson;
      setShowMiniLessonState(value); // optimistic — the Switch should not lag
      try {
        const saved = await contentApi.updateSettings(value);
        if (mounted.current) setShowMiniLessonState(saved.showMiniLesson);
        writeCache(SETTINGS_CACHE_KEY, saved.showMiniLesson);
        return { success: true, message: 'Na-save ang setting.' };
      } catch (err) {
        if (mounted.current) setShowMiniLessonState(previous);
        return { success: false, message: errorMessage(err, 'Hindi na-save ang setting.') };
      }
    },
    [showMiniLesson],
  );

  const value = useMemo<AdminContentContextType>(
    () => ({
      ready,
      error,
      refresh,
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
      showMiniLesson,
      setShowMiniLesson,
    }),
    [ready, error, refresh, getEffectiveQuestion, isOverridden, upsertQuestion, deleteQuestionOverride, getEffectiveCategoryContent, getJigsawPieceCount, setCategoryImageUri, setCategoryContext, resetCategoryImage, uploadQuestionImage, showMiniLesson, setShowMiniLesson],
  );

  return <AdminContentContext.Provider value={value}>{children}</AdminContentContext.Provider>;
}

export function useAdminContent() {
  const context = useContext(AdminContentContext);
  if (!context) throw new Error('useAdminContent must be used within AdminContentProvider');
  return context;
}

// Re-exported so screens only need one import for the category list.
export const CATEGORY_LIST = Object.keys(quizContent);
