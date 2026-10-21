// Shared display metadata for the 6 content categories — same keys/labels/colors
// used by CategoriesScreen, kept here so other screens (Mini-Lessons, Quiz
// Results, Jigsaw Results, Leaderboard) don't have to redefine them.
import type { TranslationKey } from '@/shared/i18n/language-context';

export interface CategoryMeta {
  key: string;
  /** English label. Kept only as the fallback for a key with no translation. */
  label: string;
  /** Dictionary key — what screens should render, via `t(meta.labelKey)`. */
  labelKey: TranslationKey;
  color: string;
}

export const CATEGORY_META: CategoryMeta[] = [
  { key: 'history', label: 'History', labelKey: 'catHistory', color: '#2E6FB8' },
  { key: 'culture', label: 'Culture & Tradition', labelKey: 'catCulture', color: '#C9631D' },
  { key: 'geography', label: 'Geography', labelKey: 'catGeography', color: '#3E9E4F' },
  { key: 'festival', label: 'Festival Arts', labelKey: 'catFestival', color: '#B84FA0' },
  { key: 'national', label: 'National Symbols', labelKey: 'catNational', color: '#C4304A' },
  { key: 'heroes', label: 'Filipino Heroes', labelKey: 'catHeroes', color: '#8A5A2B' },
];

export const CATEGORY_LIST: string[] = CATEGORY_META.map((c) => c.key);

export function getCategoryMeta(key: string): CategoryMeta {
  return (
    CATEGORY_META.find((c) => c.key === key) || { key, label: key, labelKey: key as TranslationKey, color: '#5C3A21' }
  );
}

export default CATEGORY_META;
