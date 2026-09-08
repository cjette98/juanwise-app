// src/features/learning/context/class-content-context.tsx
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  classesApi,
  contentApi,
  errorMessage,
  readCache,
  writeCache,
  type ApiJigsawPieceCount,
} from '@/shared/api';
import { getQuizQuestion, QuizQuestion } from '@/shared/content/quiz-content';
import categoryContent from '@/shared/content/category-content';
import { useClass } from '@/features/teacher/context/class-context';
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
 * Student-facing content, resolved through the class the student joined —
 * `GET /classes/:id/content/categories` and `.../questions` resolve the
 * class's assigned pack server-side (falling back to the system pack when
 * none is assigned), so this context never addresses a pack directly.
 *
 * `showMiniLesson` is a documented exception: the backend has no class- or
 * pack-scoped read surface for it yet (see the design spec's "known
 * limitations"), so it still reads the old unscoped `/content/settings`
 * shim — the same toggle every student has always shared, regardless of
 * which pack their class actually plays.
 */
const QUESTIONS_CACHE_KEY = 'class-content-questions';
const CATEGORIES_CACHE_KEY = 'class-content-categories';
const SETTINGS_CACHE_KEY = 'class-content-mini-lesson';

type ClassContentContextType = {
  ready: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  showMiniLesson: boolean;
  getEffectiveQuestion: (category: string, level: number, activityNum: number) => QuizQuestion;
  getEffectiveCategoryContent: (category: string, level?: number, activityNum?: number) => EffectiveCategoryContent;
  getJigsawPieceCount: (category: string, level: number, activityNum: number) => ApiJigsawPieceCount;
};

const ClassContentContext = createContext<ClassContentContextType | undefined>(undefined);

export function ClassContentProvider({ children }: { children: React.ReactNode }) {
  const { classId, currentClass, ready: classReady } = useClass();

  const [questions, setQuestions] = useState<QuestionOverrides>({});
  const [categories, setCategories] = useState<CategoryOverrides>({});
  const [showMiniLesson, setShowMiniLesson] = useState(true);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => () => { mounted.current = false; }, []);

  const refresh = useCallback(async () => {
    if (!classId) {
      setQuestions({});
      setCategories({});
      return;
    }
    try {
      const [categoryList, questionList, settings] = await Promise.all([
        classesApi.categories(classId),
        classesApi.questions(classId),
        contentApi.settings(),
      ]);
      if (!mounted.current) return;

      const questionMap: QuestionOverrides = {};
      for (const q of questionList) questionMap[q.id] = q;
      const categoryMap: CategoryOverrides = {};
      for (const c of categoryList) categoryMap[c.key] = c;

      setQuestions(questionMap);
      setCategories(categoryMap);
      setShowMiniLesson(settings.showMiniLesson);
      setError(null);

      writeCache(`${QUESTIONS_CACHE_KEY}:${classId}`, questionMap);
      writeCache(`${CATEGORIES_CACHE_KEY}:${classId}`, categoryMap);
      writeCache(SETTINGS_CACHE_KEY, settings.showMiniLesson);
    } catch (err) {
      if (!mounted.current) return;
      setError(errorMessage(err, 'Could not load content from the server.'));
    }
  }, [classId, currentClass?.packId]);

  useEffect(() => {
    if (!classReady) return;

    (async () => {
      if (!classId) {
        setQuestions({});
        setCategories({});
        setReady(true);
        return;
      }

      const [cachedQuestions, cachedCategories, cachedSetting] = await Promise.all([
        readCache<QuestionOverrides>(`${QUESTIONS_CACHE_KEY}:${classId}`),
        readCache<CategoryOverrides>(`${CATEGORIES_CACHE_KEY}:${classId}`),
        readCache<boolean>(SETTINGS_CACHE_KEY),
      ]);
      if (mounted.current) {
        if (cachedQuestions) setQuestions(cachedQuestions);
        if (cachedCategories) setCategories(cachedCategories);
        if (cachedSetting != null) setShowMiniLesson(cachedSetting);
      }

      await refresh();
      if (mounted.current) setReady(true);
    })();
  }, [classReady, classId, refresh]);

  const getEffectiveQuestion: ClassContentContextType['getEffectiveQuestion'] = useCallback(
    (category, level, activityNum) => {
      const local = getQuizQuestion(category, level, activityNum);
      const api = questions[slotId(category, level, activityNum)];
      return resolveEffectiveQuestion(local, api);
    },
    [questions],
  );

  const getEffectiveCategoryContent: ClassContentContextType['getEffectiveCategoryContent'] = useCallback(
    (category, level, activityNum) => {
      const base = categoryContent[category] || categoryContent.history;
      return resolveEffectiveCategoryContent(base, categories[category], level, activityNum);
    },
    [categories],
  );

  const getJigsawPieceCount: ClassContentContextType['getJigsawPieceCount'] = useCallback(
    (category, level, activityNum) => resolveJigsawPieceCount(categories[category], level, activityNum),
    [categories],
  );

  const value = useMemo<ClassContentContextType>(
    () => ({ ready, error, refresh, showMiniLesson, getEffectiveQuestion, getEffectiveCategoryContent, getJigsawPieceCount }),
    [ready, error, refresh, showMiniLesson, getEffectiveQuestion, getEffectiveCategoryContent, getJigsawPieceCount],
  );

  return <ClassContentContext.Provider value={value}>{children}</ClassContentContext.Provider>;
}

export function useClassContent() {
  const context = useContext(ClassContentContext);
  if (!context) throw new Error('useClassContent must be used within ClassContentProvider');
  return context;
}
