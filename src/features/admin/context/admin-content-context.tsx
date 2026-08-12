import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import quizContent, { getQuizQuestion, QuizQuestion } from '@/shared/content/quiz-content';
import categoryContent from '@/shared/content/category-content';

const QUESTIONS_KEY = 'juanwise_admin_question_overrides_v1';
const CATEGORY_KEY = 'juanwise_admin_category_overrides_v1';
const MINI_LESSON_KEY = 'juanwise_admin_show_mini_lesson_v1';

type QuestionOverrides = Record<string, Record<number, Record<number, QuizQuestion>>>;
type CategoryOverride = { imageUri?: string; context?: string };
type CategoryOverrides = Record<string, CategoryOverride>;

export type EffectiveCategoryContent = {
  /** Pass straight into <Image source={...}> — either a require() id or a { uri } object. */
  image: any;
  context: string;
  hasCustomImage: boolean;
};

type AdminContentContextType = {
  ready: boolean;

  // Quiz question CRUD
  getEffectiveQuestion: (category: string, level: number, activityNum: number) => QuizQuestion;
  isOverridden: (category: string, level: number, activityNum: number) => boolean;
  upsertQuestion: (category: string, level: number, activityNum: number, question: QuizQuestion) => void;
  deleteQuestionOverride: (category: string, level: number, activityNum: number) => void;

  // Jigsaw picture + mini-lesson CRUD (per category)
  getEffectiveCategoryContent: (category: string) => EffectiveCategoryContent;
  setCategoryImageUri: (category: string, uri: string) => void;
  setCategoryContext: (category: string, text: string) => void;
  resetCategoryImage: (category: string) => void;

  // Global Quiz setting — Admin decides whether the "Mini-Lesson" hint
  // screen shows before each quiz question, app-wide.
  showMiniLesson: boolean;
  setShowMiniLesson: (value: boolean) => void;
};

const AdminContentContext = createContext<AdminContentContextType | undefined>(undefined);

export function AdminContentProvider({ children }: { children: React.ReactNode }) {
  const [questionOverrides, setQuestionOverrides] = useState<QuestionOverrides>({});
  const [categoryOverrides, setCategoryOverrides] = useState<CategoryOverrides>({});
  const [showMiniLesson, setShowMiniLessonState] = useState(true);
  const [ready, setReady] = useState(false);

  // Load persisted admin edits once on app start.
  useEffect(() => {
    (async () => {
      try {
        const [qRaw, cRaw, mRaw] = await Promise.all([
          AsyncStorage.getItem(QUESTIONS_KEY),
          AsyncStorage.getItem(CATEGORY_KEY),
          AsyncStorage.getItem(MINI_LESSON_KEY),
        ]);
        if (qRaw) setQuestionOverrides(JSON.parse(qRaw));
        if (cRaw) setCategoryOverrides(JSON.parse(cRaw));
        // Default to true (current behavior) when the admin hasn't set it yet.
        if (mRaw != null) setShowMiniLessonState(JSON.parse(mRaw));
      } catch (e) {
        console.warn('AdminContentContext: failed to load saved edits', e);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const setShowMiniLesson = (value: boolean) => {
    setShowMiniLessonState(value);
    AsyncStorage.setItem(MINI_LESSON_KEY, JSON.stringify(value)).catch((e) =>
      console.warn('AdminContentContext: failed to save mini-lesson setting', e)
    );
  };

  const persistQuestions = (next: QuestionOverrides) => {
    setQuestionOverrides(next);
    AsyncStorage.setItem(QUESTIONS_KEY, JSON.stringify(next)).catch((e) =>
      console.warn('AdminContentContext: failed to save question edits', e)
    );
  };

  const persistCategories = (next: CategoryOverrides) => {
    setCategoryOverrides(next);
    AsyncStorage.setItem(CATEGORY_KEY, JSON.stringify(next)).catch((e) =>
      console.warn('AdminContentContext: failed to save category edits', e)
    );
  };

  const getEffectiveQuestion = (category: string, level: number, activityNum: number): QuizQuestion => {
    const override = questionOverrides[category]?.[level]?.[activityNum];
    if (override) return override;
    return getQuizQuestion(category, level, activityNum);
  };

  const isOverridden = (category: string, level: number, activityNum: number) =>
    !!questionOverrides[category]?.[level]?.[activityNum];

  const upsertQuestion = (category: string, level: number, activityNum: number, question: QuizQuestion) => {
    const next: QuestionOverrides = {
      ...questionOverrides,
      [category]: {
        ...questionOverrides[category],
        [level]: {
          ...questionOverrides[category]?.[level],
          [activityNum]: question,
        },
      },
    };
    persistQuestions(next);
  };

  const deleteQuestionOverride = (category: string, level: number, activityNum: number) => {
    if (!questionOverrides[category]?.[level]?.[activityNum]) return;
    const next: QuestionOverrides = { ...questionOverrides };
    const catCopy = { ...next[category] };
    const levelCopy = { ...catCopy[level] };
    delete levelCopy[activityNum];
    catCopy[level] = levelCopy;
    next[category] = catCopy;
    persistQuestions(next);
  };

  const getEffectiveCategoryContent = (category: string): EffectiveCategoryContent => {
    const base = categoryContent[category] || categoryContent.history;
    const override = categoryOverrides[category];
    return {
      image: override?.imageUri ? { uri: override.imageUri } : base.image,
      context: override?.context ?? base.context_tl,
      hasCustomImage: !!override?.imageUri,
    };
  };

  const setCategoryImageUri = (category: string, uri: string) => {
    const next: CategoryOverrides = {
      ...categoryOverrides,
      [category]: { ...categoryOverrides[category], imageUri: uri },
    };
    persistCategories(next);
  };

  const setCategoryContext = (category: string, text: string) => {
    const next: CategoryOverrides = {
      ...categoryOverrides,
      [category]: { ...categoryOverrides[category], context: text },
    };
    persistCategories(next);
  };

  const resetCategoryImage = (category: string) => {
    const next: CategoryOverrides = { ...categoryOverrides };
    if (next[category]) {
      const { imageUri, ...rest } = next[category];
      next[category] = rest;
    }
    persistCategories(next);
  };

  return (
    <AdminContentContext.Provider
      value={{
        ready,
        getEffectiveQuestion,
        isOverridden,
        upsertQuestion,
        deleteQuestionOverride,
        getEffectiveCategoryContent,
        setCategoryImageUri,
        setCategoryContext,
        resetCategoryImage,
        showMiniLesson,
        setShowMiniLesson,
      }}
    >
      {children}
    </AdminContentContext.Provider>
  );
}

export function useAdminContent() {
  const context = useContext(AdminContentContext);
  if (!context) throw new Error('useAdminContent must be used within AdminContentProvider');
  return context;
}

// Re-exported so screens only need one import for the category list.
export const CATEGORY_LIST = Object.keys(quizContent);