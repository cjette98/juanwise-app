// Shared display metadata for the 6 content categories — same keys/labels/colors
// used by CategoriesScreen, kept here so other screens (Mini-Lessons, Quiz
// Results, Jigsaw Results, Leaderboard) don't have to redefine them.
export interface CategoryMeta {
  key: string;
  label: string;
  color: string;
}

export const CATEGORY_META: CategoryMeta[] = [
  { key: 'history', label: 'History', color: '#2E6FB8' },
  { key: 'culture', label: 'Culture & Tradition', color: '#C9631D' },
  { key: 'geography', label: 'Geography', color: '#3E9E4F' },
  { key: 'festival', label: 'Festival Arts', color: '#B84FA0' },
  { key: 'national', label: 'National Symbols', color: '#C4304A' },
  { key: 'heroes', label: 'Filipino Heroes', color: '#8A5A2B' },
];

export const CATEGORY_LIST: string[] = CATEGORY_META.map((c) => c.key);

export function getCategoryMeta(key: string): CategoryMeta {
  return CATEGORY_META.find((c) => c.key === key) || { key, label: key, color: '#5C3A21' };
}

export default CATEGORY_META;
