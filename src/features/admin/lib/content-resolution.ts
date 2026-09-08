/**
 * "Which content wins" — pure, shared by the pack-scoped admin editing
 * context (Task 4) and the class-scoped student reading context (Task 5), so
 * the two never quietly drift.
 *
 * No React import. No value import of `@/shared/content/category-content` or
 * `@/shared/content/quiz-content` — both transitively `require()` binary
 * image assets via `@/shared/assets/images`, which is not resolvable under
 * vitest's `node` test environment. Callers resolve `base`/`local` bundled
 * content themselves (they run inside the real app, where requiring an image
 * asset is fine) and pass the result in.
 */
import type { ApiCategory, ApiJigsawPieceCount, ApiQuestion } from '@/shared/api';
import type { QuizQuestion } from '@/shared/content/quiz-content';
import { toQuizQuestion } from './question-mapping';

export type CategoryOverrides = Partial<Record<string, ApiCategory>>;
/** Keyed `${category}_${level}_${activityNum}` — see `slotId`. */
export type QuestionOverrides = Record<string, ApiQuestion>;

export type EffectiveCategoryContent = {
  /** Pass straight into <Image source={...}> — either a require() id or a { uri } object. */
  image: any;
  context: string;
  /** The admin's one-line summary of the picture, shown on the jigsaw reveal. */
  definition: string | null;
  /** The library picture's own name, when one was rotated in. */
  title: string | null;
  hasCustomImage: boolean;
};

export const slotId = (category: string, level: number, activityNum: number) =>
  `${category}_${level}_${activityNum}`;

/** The key a jigsaw activity's picture and cut are stored under. */
export const jigsawSlotKey = (level: number, activityNum: number) => `${level}_${activityNum}`;

/**
 * The cut an activity plays when nobody has chosen one — the difficulty ramp
 * across a level's six activities.
 */
export function rampPieceCount(activityNum: number): ApiJigsawPieceCount {
  if (activityNum <= 2) return 6;
  if (activityNum <= 4) return 9;
  return 12;
}

/** Only an admin edit (`isOverride: true`) displaces the bundled fallback. */
export function resolveEffectiveQuestion(local: QuizQuestion, api: ApiQuestion | undefined): QuizQuestion {
  return api?.isOverride ? toQuizQuestion(api, local) : local;
}

export function resolveEffectiveCategoryContent(
  base: { image: any; context_tl: string },
  api: ApiCategory | undefined,
  level?: number,
  activityNum?: number,
): EffectiveCategoryContent {
  const assignedId =
    level !== undefined && activityNum !== undefined
      ? api?.jigsawSlots?.[jigsawSlotKey(level, activityNum)]
      : undefined;
  const picked = assignedId ? api?.jigsaws?.find((item) => item.id === assignedId) : undefined;

  if (picked) {
    return {
      image: { uri: picked.imageUrl },
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
}

/**
 * How many pieces a jigsaw activity is cut into: the admin's choice when
 * there is one, otherwise the difficulty ramp.
 */
export function resolveJigsawPieceCount(
  api: ApiCategory | undefined,
  level: number,
  activityNum: number,
): ApiJigsawPieceCount {
  return api?.jigsawPieces?.[jigsawSlotKey(level, activityNum)] ?? rampPieceCount(activityNum);
}
