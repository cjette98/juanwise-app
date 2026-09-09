# Teacher Access to Content Packs — Mobile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a teacher on the `juanwise-app-v2` mobile app author/duplicate/publish content packs and assign one to the class they handle, and let students resolve their gameplay content through whatever pack their class is actually assigned to — matching what `juanwise-be` branch `feat/content-packs` already exposes and what `juanwise-admin`'s parallel web effort is building for the same purpose.

**Architecture:** Split today's single global `AdminContentContext` (which today serves both admin editing AND student gameplay, unscoped) into two: a pack-scoped `AdminContentContext` for owner editing (packId-keyed cache, still one global provider) and a new class-scoped `ClassContentContext` for student reads (resolved server-side through `GET /classes/:id/content/*`). Both delegate the "which content wins" math to a new pure, unit-tested `content-resolution.ts` module. A new Packs library screen under `(admin)` lists/creates/duplicates/publishes/archives packs and is the only entry point into the (now pack-scoped) Quiz/Jigsaw editors. Class Map gains one card for assigning a pack to the teacher's one class, matching this app's existing single-class-per-teacher shape (not web's plural "My Classes").

**Tech Stack:** Expo 57 / React Native 0.86, expo-router (file-based routing, `useLocalSearchParams`), TypeScript strict, vitest 4 (pure `.ts` modules only — see Global Constraints).

**Spec:** `docs/superpowers/specs/2026-09-08-teacher-packs-mobile-design.md`

## Global Constraints

- **This is a client of `juanwise-be` branch `feat/content-packs`.** Every endpoint referenced below already exists there and was read directly from the real route/schema files on that branch — do not invent request/response shapes.
- **`POST /packs/:packId/duplicate` takes no body.** The backend derives the new pack's name itself; do not add a `name` parameter to `packsApi.duplicate`.
- **`submitResultSchema` has no `classId` field.** Do not add `classId` anywhere in `results/` — the backend resolves it server-side unconditionally. No file under `src/features/results/` changes in this plan.
- **This repo unit-tests pure `.ts` modules only.** `vitest.config.ts` globs `src/**/*.test.ts` (not `.tsx`) with `environment: 'node'`. No context or screen has a test file today, and this plan does not add one — only `content-resolution.ts` (Task 1) gets a test file, matching the existing `question-mapping.test.ts`/`activity-list-model.test.ts` precedent.
- **Never import `@/shared/content/category-content` or `@/shared/content/quiz-content` as a VALUE from a file that must stay testable under vitest's `node` environment.** Both transitively `require()` binary image assets via `@/shared/assets/images`, which is not resolvable outside Metro and will crash the test file. `content-resolution.ts` takes already-resolved `base`/`local` content as parameters instead of importing these modules itself — verified this is exactly why `question-mapping.ts` only imports `QuizQuestion` as `import type`.
- **No `Alert.prompt`** (iOS-only, no Android equivalent) — any new "type a name" UI uses an inline `TextInput` + Save/Cancel toggle, matching `class-overview-screen.tsx`'s existing class-code-edit pattern.
- **`(admin)` screens hardcode Tagalog copy directly** (no `t()`/i18n) — matches `admin-content-manager-screen.tsx`/`jigsaw-content-screen.tsx`/`question-editor-screen.tsx` exactly. **`(teacher)` screens use `t()`** from `src/shared/i18n/language-context.tsx` — matches `class-map-screen.tsx`/`class-overview-screen.tsx`/`teacher-dashboard-screen.tsx`. New files follow whichever convention their sibling screens use.
- **No multi-class picker anywhere** — a student has at most one class (`users/{uid}.classId` scalar, backend `join()` refuses a second) and this app's own `ClassContext` already treats "the teacher's class" as singular (`classes.find(...) ?? classes[0]`). Do not build one.
- Every task ends with `npx tsc --noEmit` clean (for the files it touches — an earlier task's expected transitional gap is fine to still show if a later task closes it; note this explicitly per task) and `npx vitest run` green before its commit.
- Commit messages end with:
  ```
  Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01RUwcuTQNhseFFhK9o8LT5j
  ```

## File Structure

**Create:**

| File | Responsibility |
|---|---|
| `src/features/admin/lib/content-resolution.ts` | Pure "which content wins" math — shared by both new contexts. |
| `src/features/admin/lib/content-resolution.test.ts` | Unit tests for the above. |
| `src/features/learning/context/class-content-context.tsx` | Student-facing, class-scoped content reads. |
| `src/features/admin/screens/pack-list-screen.tsx` | Packs library: list/create/duplicate/publish/archive. |
| `src/app/(admin)/packs.tsx` | Thin re-export wrapper, matching the other three `(admin)` route files. |
| `src/features/teacher/screens/assign-pack-dialog.tsx` | The share/copy modal, opened from Class Map. |

**Modify:**
- `src/shared/api/types.ts` — pack types, `ApiClass` pack fields, `MarkActivityRequest.classId`
- `src/shared/api/endpoints.ts` — `packsApi`, pack-scoped `contentApi`, `classesApi` additions
- `src/shared/content/category-meta.ts` — gains `CATEGORY_LIST`
- `src/features/admin/context/admin-content-context.tsx` — retrofit to pack-scoped
- `src/features/admin/screens/admin-content-manager-screen.tsx`, `jigsaw-content-screen.tsx`, `question-editor-screen.tsx` — take `packId`
- `src/features/learning/screens/activity-list-screen.tsx`, `activity-play-screen.tsx`, `mini-lessons-screen.tsx`, `src/features/jigsaw/screens/jigsaw-puzzle-screen.tsx` — swap to `useClassContent`
- `src/app/_layout.tsx` — mount `ClassContentProvider`
- `src/features/teacher/screens/class-map-screen.tsx` — pack card, simplified content-management link, `CATEGORY_LIST` import source
- `src/features/teacher/screens/teacher-dashboard-screen.tsx` — new "Content Packs" menu item
- `src/features/learning/context/game-progress-context.tsx` — thread `classId`

**Do not touch:** anything under `src/features/results/`, `src/features/profile/`, `src/features/settings/`, `src/shared/theme/`, `src/shared/components/ui/` (consume existing primitives only).

---

### Task 1: Pure content-resolution module

**Files:**
- Create: `src/features/admin/lib/content-resolution.ts`
- Test: `src/features/admin/lib/content-resolution.test.ts`

**Interfaces:**
- Consumes: `toQuizQuestion` from `src/features/admin/lib/question-mapping.ts` (existing); `ApiCategory`, `ApiQuestion`, `ApiJigsawPieceCount` types from `@/shared/api` (existing)
- Produces: `CategoryOverrides`, `QuestionOverrides`, `EffectiveCategoryContent` types; `slotId`, `jigsawSlotKey`, `rampPieceCount`, `resolveEffectiveQuestion`, `resolveEffectiveCategoryContent`, `resolveJigsawPieceCount` — consumed by Task 4 and Task 5

- [ ] **Step 1: Write the failing test**

```ts
// src/features/admin/lib/content-resolution.test.ts
import { describe, expect, it } from 'vitest';
import type { ApiCategory, ApiQuestion } from '@/shared/api';
import type { QuizQuestion } from '@/shared/content/quiz-content';
import {
  jigsawSlotKey,
  rampPieceCount,
  resolveEffectiveCategoryContent,
  resolveEffectiveQuestion,
  resolveJigsawPieceCount,
  slotId,
} from './content-resolution';

const localQuestion: QuizQuestion = {
  hint: 'bundled hint',
  type: 'multiple-choice',
  question: 'bundled question',
  choices: ['a', 'b'],
  correctAnswer: 'a',
  explanation: 'bundled explanation',
};

const apiQuestionCommon = {
  id: 'history_1_1',
  category: 'history' as const,
  level: 1,
  activityNum: 1,
  type: 'multiple-choice' as const,
  question: 'api question',
  hint: 'api hint',
  explanation: 'api explanation',
  miniLesson: null,
  miniLessonImageUrl: null,
  choices: ['x', 'y'],
  correctAnswer: 'x',
  answerPool: null,
  requiredAnswers: null,
  acceptedAnswers: null,
  updatedBy: null,
  updatedAt: null,
};

describe('slotId / jigsawSlotKey', () => {
  it('formats the composite keys the API uses', () => {
    expect(slotId('history', 2, 3)).toBe('history_2_3');
    expect(jigsawSlotKey(2, 3)).toBe('2_3');
  });
});

describe('rampPieceCount', () => {
  it('ramps 6 -> 9 -> 12 across a level of six activities', () => {
    expect(rampPieceCount(1)).toBe(6);
    expect(rampPieceCount(2)).toBe(6);
    expect(rampPieceCount(3)).toBe(9);
    expect(rampPieceCount(4)).toBe(9);
    expect(rampPieceCount(5)).toBe(12);
    expect(rampPieceCount(6)).toBe(12);
  });
});

describe('resolveEffectiveQuestion', () => {
  it('returns the bundled fallback when there is no API question', () => {
    expect(resolveEffectiveQuestion(localQuestion, undefined)).toEqual(localQuestion);
  });

  it('returns the bundled fallback when the API question is not an override', () => {
    const api: ApiQuestion = { ...apiQuestionCommon, isOverride: false };
    expect(resolveEffectiveQuestion(localQuestion, api)).toEqual(localQuestion);
  });

  it('returns the mapped API question when it is an override', () => {
    const api: ApiQuestion = { ...apiQuestionCommon, isOverride: true };
    const result = resolveEffectiveQuestion(localQuestion, api);
    expect(result.question).toBe('api question');
    expect(result.choices).toEqual(['x', 'y']);
  });
});

describe('resolveEffectiveCategoryContent', () => {
  const base = { image: 'base-image' as any, context_tl: 'base context' };

  it('falls back to the base category content with no API category', () => {
    const result = resolveEffectiveCategoryContent(base, undefined);
    expect(result).toEqual({
      image: 'base-image',
      context: 'base context',
      definition: null,
      title: null,
      hasCustomImage: false,
    });
  });

  it('uses the API category image and context when set', () => {
    const api: Partial<ApiCategory> = {
      imageUrl: 'https://example.test/cat.jpg',
      context_tl: 'api context',
      context_en: null,
      definition_tl: null,
      definition_en: null,
      jigsaws: [],
      jigsawSlots: {},
    };
    const result = resolveEffectiveCategoryContent(base, api as ApiCategory);
    expect(result.image).toEqual({ uri: 'https://example.test/cat.jpg' });
    expect(result.context).toBe('api context');
    expect(result.hasCustomImage).toBe(true);
  });

  it('prefers the activity-assigned jigsaw picture over the category default', () => {
    const api: Partial<ApiCategory> = {
      imageUrl: 'https://example.test/cat.jpg',
      context_tl: 'api context',
      context_en: null,
      definition_tl: null,
      definition_en: null,
      jigsawSlots: { '3_4': 'pic-1' },
      jigsaws: [
        {
          id: 'pic-1',
          title: 'Picture One',
          imageUrl: 'https://example.test/pic1.jpg',
          definition_en: null,
          definition_tl: 'depiction',
          context_en: null,
          context_tl: 'picture context',
        },
      ],
    };
    const result = resolveEffectiveCategoryContent(base, api as ApiCategory, 3, 4);
    expect(result.image).toEqual({ uri: 'https://example.test/pic1.jpg' });
    expect(result.context).toBe('picture context');
    expect(result.definition).toBe('depiction');
    expect(result.title).toBe('Picture One');
    expect(result.hasCustomImage).toBe(true);
  });

  it('ignores a jigsaw slot for an activity nobody assigned', () => {
    const api: Partial<ApiCategory> = {
      imageUrl: null,
      context_tl: 'api context',
      context_en: null,
      definition_tl: null,
      definition_en: null,
      jigsawSlots: { '3_4': 'pic-1' },
      jigsaws: [],
    };
    // Different activity — 1_1 has no slot entry.
    const result = resolveEffectiveCategoryContent(base, api as ApiCategory, 1, 1);
    expect(result.image).toBe('base-image');
    expect(result.hasCustomImage).toBe(false);
  });
});

describe('resolveJigsawPieceCount', () => {
  it('follows the ramp when nobody chose a cut', () => {
    const api: Partial<ApiCategory> = { jigsawPieces: {} };
    expect(resolveJigsawPieceCount(api as ApiCategory, 5, 6)).toBe(12);
  });

  it('uses the explicit per-activity cut when one is set', () => {
    const api: Partial<ApiCategory> = { jigsawPieces: { '1_1': 12 } };
    expect(resolveJigsawPieceCount(api as ApiCategory, 1, 1)).toBe(12);
  });

  it('falls back to the ramp with no API category at all', () => {
    expect(resolveJigsawPieceCount(undefined, 2, 2)).toBe(6);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/admin/lib/content-resolution.test.ts`
Expected: FAIL — `Failed to resolve import "./content-resolution"`.

- [ ] **Step 3: Write the module**

```ts
// src/features/admin/lib/content-resolution.ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/admin/lib/content-resolution.test.ts`
Expected: PASS, all cases.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean (this file has no consumers yet, so nothing else changes).

- [ ] **Step 6: Commit**

```bash
git add src/features/admin/lib/content-resolution.ts src/features/admin/lib/content-resolution.test.ts
git commit -m "feat: extract pure content-resolution logic shared by admin and student content" \
  -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>" \
  -m "Claude-Session: https://claude.ai/code/session_01RUwcuTQNhseFFhK9o8LT5j"
```

---

### Task 2: Pack, class-content, and progress API client additions

**Files:**
- Modify: `src/shared/api/types.ts`, `src/shared/api/endpoints.ts`

**Interfaces:**
- Consumes: `request` from `./client` (existing)
- Produces:
  - Types: `ApiPackStatus`, `ApiPackBinding`, `ApiPack`, `CreatePackRequest`, `PatchPackRequest`, `AssignPackRequest`; `ApiClass` gains `packId`/`packBinding`/`packVersion`; `MarkActivityRequest` gains `classId?`
  - `packsApi.list(mine?: boolean): Promise<ApiPack[]>`, `.create(name)`, `.get(id)`, `.patch(id, input)`, `.duplicate(id)` (no name param — see Global Constraints), `.publish(id)`, `.archive(id)`
  - `contentApi.categories(packId, ...)` etc. — every category/question method gains a leading `packId: string`; `settings`/`updateSettings` unchanged
  - `classesApi.assignPack(id, input)`, `.clearPack(id)`, `.categories(id)`, `.questions(id, query?)`
  - `progressApi.get(uid?, classId?)`

- [ ] **Step 1: Add pack types to `types.ts`**

Add after `JoinClassResponse` (end of the `classes` section), before the `content` section comment:

```ts
export type ApiPackStatus = 'draft' | 'published' | 'archived';
export type ApiPackBinding = 'linked' | 'copied';

export interface ApiPack {
  id: string;
  name: string;
  ownerUid: string;
  origin: 'system' | 'teacher';
  forkedFrom: string | null;
  status: ApiPackStatus;
  version: number;
  publishedAt: string | null;
  showMiniLesson: boolean;
  classCount: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CreatePackRequest {
  name: string;
}

export interface PatchPackRequest {
  name?: string;
  showMiniLesson?: boolean;
}

export interface AssignPackRequest {
  packId: string;
  mode: 'link' | 'copy';
}
```

Add to `ApiClass`, right after `assignment: ApiAssignment | null;`:

```ts
  packId: string | null;
  packBinding: ApiPackBinding | null;
  packVersion: number | null;
```

Add `classId?: string;` to `MarkActivityRequest`, right after `activityNum: number;`.

- [ ] **Step 2: Run typecheck to see the expected, temporary breakage**

Run: `npx tsc --noEmit`
Expected: FAIL — `endpoints.ts` doesn't reference the new types yet so this alone should still be clean; if it isn't, stop and inspect before continuing (a clean baseline here means Step 3's additions are what's being tested, not a pre-existing break).

- [ ] **Step 3: Add `packsApi` to `endpoints.ts`**

Add the import list additions: `ApiPack`, `CreatePackRequest`, `PatchPackRequest`, `AssignPackRequest` to the `from './types'` import block (alphabetical, matching the existing list's ordering).

Add after `classesApi`, before the `/* ----- content */` comment:

```ts
/* -------------------------------------------------------------------- packs */

export const packsApi = {
  async list(mine = false): Promise<ApiPack[]> {
    const { items } = await request<{ items: ApiPack[] }>('/packs', { query: { mine } });
    return items;
  },

  create(name: string): Promise<ApiPack> {
    return request('/packs', { method: 'POST', body: { name } });
  },

  get(id: string): Promise<ApiPack> {
    return request(`/packs/${encodeURIComponent(id)}`);
  },

  patch(id: string, input: Partial<PatchPackRequest>): Promise<ApiPack> {
    return request(`/packs/${encodeURIComponent(id)}`, { method: 'PATCH', body: input });
  },

  /** The backend derives the copy's name itself — this route takes no body. */
  duplicate(id: string): Promise<ApiPack> {
    return request(`/packs/${encodeURIComponent(id)}/duplicate`, { method: 'POST' });
  },

  publish(id: string): Promise<ApiPack> {
    return request(`/packs/${encodeURIComponent(id)}/publish`, { method: 'POST' });
  },

  archive(id: string): Promise<ApiPack> {
    return request(`/packs/${encodeURIComponent(id)}/archive`, { method: 'POST' });
  },
};
```

- [ ] **Step 4: Rewrite `contentApi` to take `packId`**

Replace the whole `contentApi` block with:

```ts
export const contentApi = {
  async categories(packId: string): Promise<ApiCategory[]> {
    const { items } = await request<{ items: ApiCategory[] }>(
      `/packs/${encodeURIComponent(packId)}/categories`,
    );
    return items;
  },

  category(packId: string, key: ApiCategoryKey): Promise<ApiCategory> {
    return request(`/packs/${encodeURIComponent(packId)}/categories/${key}`);
  },

  updateCategory(packId: string, key: ApiCategoryKey, patch: UpdateCategoryRequest): Promise<ApiCategory> {
    return request(`/packs/${encodeURIComponent(packId)}/categories/${key}`, { method: 'PUT', body: patch });
  },

  async questions(
    packId: string,
    query: { category?: ApiCategoryKey; level?: number } = {},
  ): Promise<ApiQuestion[]> {
    const { items } = await request<{ items: ApiQuestion[] }>(
      `/packs/${encodeURIComponent(packId)}/questions`,
      { query },
    );
    return items;
  },

  question(packId: string, category: ApiCategoryKey, level: number, activityNum: number): Promise<ApiQuestion> {
    return request(`/packs/${encodeURIComponent(packId)}/questions/${category}/${level}/${activityNum}`);
  },

  upsertQuestion(
    packId: string,
    category: ApiCategoryKey,
    level: number,
    activityNum: number,
    input: UpsertQuestionRequest,
  ): Promise<ApiQuestion> {
    return request(`/packs/${encodeURIComponent(packId)}/questions/${category}/${level}/${activityNum}`, {
      method: 'PUT',
      body: input,
    });
  },

  /** Reverts to the seeded default; 404s when there was no override. */
  revertQuestion(packId: string, category: ApiCategoryKey, level: number, activityNum: number): Promise<ApiQuestion> {
    return request(`/packs/${encodeURIComponent(packId)}/questions/${category}/${level}/${activityNum}`, {
      method: 'DELETE',
    });
  },

  /**
   * Unscoped by design — this is the old global toggle, not part of the pack
   * model. `GET /packs/:packId` is where a pack's OWN `showMiniLesson` lives;
   * see `docs/superpowers/specs/2026-09-08-teacher-packs-mobile-design.md`
   * fact 6 for why the student-facing toggle still reads this endpoint.
   */
  settings(): Promise<ApiContentSettings> {
    return request('/content/settings');
  },
};
```

Note: `updateSettings` is intentionally dropped from `contentApi` — nothing in the app calls it after Task 4 (the admin editor moves to `packsApi.patch` for `showMiniLesson`). If `npx tsc --noEmit` at the end of this task reports an unused-removal issue, that's expected; a genuine call-site break here is not (see Step 6).

- [ ] **Step 5: Add to `classesApi`**

Add after `clearAssignment`:

```ts
  assignPack(id: string, input: AssignPackRequest): Promise<ApiClass> {
    return request(`/classes/${encodeURIComponent(id)}/pack`, { method: 'PUT', body: input });
  },

  clearPack(id: string): Promise<ApiClass> {
    return request(`/classes/${encodeURIComponent(id)}/pack`, { method: 'DELETE' });
  },

  async categories(id: string): Promise<ApiCategory[]> {
    const { items } = await request<{ items: ApiCategory[] }>(
      `/classes/${encodeURIComponent(id)}/content/categories`,
    );
    return items;
  },

  async questions(id: string, query: { category?: ApiCategoryKey; level?: number } = {}): Promise<ApiQuestion[]> {
    const { items } = await request<{ items: ApiQuestion[] }>(
      `/classes/${encodeURIComponent(id)}/content/questions`,
      { query },
    );
    return items;
  },
```

- [ ] **Step 6: Update `progressApi.get`**

Replace:

```ts
  get(uid?: string): Promise<ApiProgress> {
    return request('/progress/me', { query: { uid } });
  },
```

with:

```ts
  /** Pass `uid` to read a student you teach; omit for your own. `classId` picks which class's progress — omit to fall back to the caller's single active class. */
  get(uid?: string, classId?: string): Promise<ApiProgress> {
    return request('/progress/me', { query: { uid, classId } });
  },
```

- [ ] **Step 7: Run typecheck**

Run: `npx tsc --noEmit`
Expected: FAIL, listing exactly the call sites that break because `contentApi`'s methods now require a leading `packId` — `src/features/admin/context/admin-content-context.tsx` (every `contentApi.*` call) and nothing else (student screens call `useAdminContent()`, not `contentApi` directly, so they don't break yet — they still compile against the *old* `AdminContentContext` shape, which Task 4 changes). Confirm the failure list is limited to `admin-content-context.tsx`; if anything else fails, stop and investigate before continuing — that would mean an assumption in this task is wrong.

- [ ] **Step 8: Commit**

```bash
git add src/shared/api/types.ts src/shared/api/endpoints.ts
git commit -m "feat: add pack, class-content, and classId-aware progress API client" \
  -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>" \
  -m "Claude-Session: https://claude.ai/code/session_01RUwcuTQNhseFFhK9o8LT5j"
```

(This task ends with a project that does not typecheck cleanly — expected and documented above. It's `admin-content-context.tsx` alone, and Task 4 fixes it.)

---

### Task 3: Move `CATEGORY_LIST` to `category-meta.ts`

**Files:**
- Modify: `src/shared/content/category-meta.ts`, `src/features/teacher/screens/class-map-screen.tsx`

**Interfaces:**
- Consumes: nothing new
- Produces: `CATEGORY_LIST: string[]` exported from `src/shared/content/category-meta.ts`

This is a small, standalone cleanup done now so Task 9 (Class Map) doesn't have to import from an admin-owned context file — `class-map-screen.tsx` is a `(teacher)` screen, and after Task 4 `AdminContentContext`'s exports all take a `packId`, which `CATEGORY_LIST` (a plain list of the six fixed category keys, unrelated to any pack) never needed.

- [ ] **Step 1: Add the export**

In `src/shared/content/category-meta.ts`, add after `CATEGORY_META`'s declaration:

```ts
export const CATEGORY_LIST: string[] = CATEGORY_META.map((c) => c.key);
```

- [ ] **Step 2: Update the import site**

In `src/features/teacher/screens/class-map-screen.tsx`, change:

```ts
import { CATEGORY_LIST } from '@/features/admin/context/admin-content-context';
```

to:

```ts
import { CATEGORY_LIST } from '@/shared/content/category-meta';
```

- [ ] **Step 3: Run typecheck**

Run: `npx tsc --noEmit`
Expected: same failure set as Task 2 Step 7 (still just `admin-content-context.tsx`'s internal `contentApi` calls) — `class-map-screen.tsx` itself should be clean.

- [ ] **Step 4: Commit**

```bash
git add src/shared/content/category-meta.ts src/features/teacher/screens/class-map-screen.tsx
git commit -m "refactor: move CATEGORY_LIST out of the admin-only content context" \
  -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>" \
  -m "Claude-Session: https://claude.ai/code/session_01RUwcuTQNhseFFhK9o8LT5j"
```

(`admin-content-context.tsx` still re-exports `CATEGORY_LIST` too, until Task 4 removes it — leave the old export in place for now so nothing else that might reference it breaks mid-plan; Task 4 removes it as part of its own rewrite.)

---

### Task 4: Retrofit `AdminContentContext` to be pack-scoped

**Files:**
- Modify: `src/features/admin/context/admin-content-context.tsx`

**Interfaces:**
- Consumes: `resolveEffectiveQuestion`, `resolveEffectiveCategoryContent`, `resolveJigsawPieceCount`, `slotId`, `CategoryOverrides`, `QuestionOverrides` from Task 1's `content-resolution.ts`; `packsApi`, pack-scoped `contentApi` from Task 2
- Produces: `useAdminContent()` returning a pack-keyed API — every method's first argument is now `packId: string`; `ensurePackLoaded(packId)`; `isPackReady(packId)`; `getPack(packId)`

- [ ] **Step 1: Read the current file in full**

It's already been read in full during design (233 lines is `admin-content-manager-screen.tsx`; `admin-content-context.tsx` itself is ~400 lines) — re-read it now if you're a fresh implementer, since every method in it changes shape in this task.

- [ ] **Step 2: Rewrite the file**

```ts
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
```

Notes on what was deliberately dropped versus the old file: the flat `ready`/`refresh` pair is gone (replaced by `isPackReady(packId)`/`ensurePackLoaded(packId)`/`refreshPack(packId)`); `CATEGORY_LIST` is gone (Task 3 moved it); `showMiniLesson`/`contentApi.settings()`/`contentApi.updateSettings()` reads are gone from this file entirely (the per-pack toggle now lives on `ApiPack.showMiniLesson`, read via `getPack(packId)?.showMiniLesson`).

- [ ] **Step 3: Run typecheck**

Run: `npx tsc --noEmit`
Expected: now fails only in the three `(admin)` screens and the four student screens — every call site that still calls `useAdminContent()`'s OLD (no-`packId`) shape. This is the expected, temporary state; confirm the failures are limited to files Tasks 5–7 touch (`admin-content-manager-screen.tsx`, `jigsaw-content-screen.tsx`, `question-editor-screen.tsx`, `activity-list-screen.tsx`, `activity-play-screen.tsx`, `mini-lessons-screen.tsx`, `jigsaw-puzzle-screen.tsx`) — if anything else fails, stop and investigate.

- [ ] **Step 4: Run the test suite**

Run: `npx vitest run`
Expected: PASS — this file has no test of its own (context files aren't tested in this repo; see Global Constraints), and Task 1's test is unaffected.

- [ ] **Step 5: Commit**

```bash
git add src/features/admin/context/admin-content-context.tsx
git commit -m "feat: scope the admin content context to a specific content pack" \
  -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>" \
  -m "Claude-Session: https://claude.ai/code/session_01RUwcuTQNhseFFhK9o8LT5j"
```

---

### Task 5: New `ClassContentContext` for students, wired into `_layout.tsx`

**Files:**
- Create: `src/features/learning/context/class-content-context.tsx`
- Modify: `src/app/_layout.tsx`

**Interfaces:**
- Consumes: `resolveEffectiveQuestion`, `resolveEffectiveCategoryContent`, `resolveJigsawPieceCount`, `slotId`, `CategoryOverrides`, `QuestionOverrides` (Task 1); `classesApi.categories`/`questions`, `contentApi.settings` (Task 2); `useClass()` (existing, `src/features/teacher/context/class-context.tsx`)
- Produces: `useClassContent()` — `{ ready, error, refresh, showMiniLesson, getEffectiveQuestion(category, level, activityNum), getEffectiveCategoryContent(category, level?, activityNum?), getJigsawPieceCount(category, level, activityNum) }`, consumed by Task 7

- [ ] **Step 1: Write the context**

```tsx
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
  const { classId, ready: classReady } = useClass();

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
  }, [classId]);

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
```

- [ ] **Step 2: Mount the provider in `_layout.tsx`**

In `src/app/_layout.tsx`, add the import:

```ts
import { ClassContentProvider } from '@/features/learning/context/class-content-context';
```

Wrap it around the same subtree as `AdminContentProvider`, inside `GameProgressProvider` (it needs `ClassProvider` above it for `useClass()`, which is already satisfied — `ClassProvider` wraps everything below it today):

```tsx
        <UserProvider>
          <ClassProvider>
            <StudentResultsProvider>
              <GameProgressProvider>
                <AdminContentProvider>
                  <ClassContentProvider>
                    <StatusBar style="auto" />
                    <Stack screenOptions={{ headerShown: false }} />
                  </ClassContentProvider>
                </AdminContentProvider>
              </GameProgressProvider>
            </StudentResultsProvider>
          </ClassProvider>
        </UserProvider>
```

- [ ] **Step 3: Run typecheck**

Run: `npx tsc --noEmit`
Expected: same failure set as Task 4 Step 3, minus nothing new — `_layout.tsx` and the new file should both be clean on their own.

- [ ] **Step 4: Run the test suite**

Run: `npx vitest run`
Expected: PASS (no new test file — contexts aren't tested here, per Global Constraints).

- [ ] **Step 5: Commit**

```bash
git add src/features/learning/context/class-content-context.tsx src/app/_layout.tsx
git commit -m "feat: add class-scoped student content context" \
  -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>" \
  -m "Claude-Session: https://claude.ai/code/session_01RUwcuTQNhseFFhK9o8LT5j"
```

---

### Task 6: Retrofit the three `(admin)` screens to take `packId`

**Files:**
- Modify: `src/features/admin/screens/admin-content-manager-screen.tsx`, `src/features/admin/screens/jigsaw-content-screen.tsx`, `src/features/admin/screens/question-editor-screen.tsx`

**Interfaces:**
- Consumes: `useAdminContent()`'s new pack-scoped shape (Task 4)
- Produces: all three screens read `packId` via `useLocalSearchParams` and thread it through

- [ ] **Step 1: `admin-content-manager-screen.tsx`**

Add `useLocalSearchParams` to the existing `expo-router` import, and read `packId`:

```ts
import { useRouter, useLocalSearchParams } from 'expo-router';
```

At the top of the component, before the existing `useState` calls:

```ts
export default function AdminContentManagerScreen() {
  const router = useRouter();
  const { packId } = useLocalSearchParams<{ packId: string }>();
  const [category, setCategory] = useState(CATEGORIES[0].key);
  const [level, setLevel] = useState(1);
  const {
    isPackReady,
    error,
    ensurePackLoaded,
    getPack,
    getEffectiveQuestion,
    isOverridden,
    deleteQuestionOverride,
    setShowMiniLesson,
  } = useAdminContent();

  useEffect(() => {
    if (packId) ensurePackLoaded(packId);
  }, [packId, ensurePackLoaded]);

  if (!packId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>Walang napiling pack. Bumalik sa Content Packs.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const ready = isPackReady(packId);
  const pack = getPack(packId);
```

Add `useEffect` to the existing `import React, { useState } from 'react';` line: `import React, { useState, useEffect } from 'react';`.

Update every remaining `useAdminContent()`-derived call in the file to pass `packId` first:
- `getEffectiveQuestion(category, level, num)` → `getEffectiveQuestion(packId, category, level, num)`
- `isOverridden(category, level, num)` → `isOverridden(packId, category, level, num)`
- `deleteQuestionOverride(category, level, activityNum)` (inside `handleDelete`) → `deleteQuestionOverride(packId, category, level, activityNum)`

Replace the `showMiniLesson`/`setShowMiniLesson` usages: the `Switch`'s `value` becomes `pack?.showMiniLesson ?? true`, and `handleToggleMiniLesson` becomes:

```ts
  const handleToggleMiniLesson = async (value: boolean) => {
    const result = await setShowMiniLesson(packId, value);
    if (!result.success) Alert.alert('Hindi Na-save', result.message);
  };
```

Add a caption under the existing mini-lesson row explaining the known limitation (fact 6 in the spec):

```tsx
        <Text style={styles.miniLessonNote}>
          Tandaan: kasalukuyang naaapektuhan lang nito ang Global Library — hindi pa ito
          nakikita ng mga estudyanteng gumagamit ng ibang pack.
        </Text>
```

Add `miniLessonNote: { fontSize: 11, color: '#8E8E93', marginTop: 4, paddingHorizontal: 16, lineHeight: 15 },` to the `StyleSheet.create` block.

Update the header subtitle text to name the pack: change
`<Text style={styles.headerSubtitle}>I-edit, i-update, o burahin ang mga tanong sa quiz</Text>`
to
`` <Text style={styles.headerSubtitle}>{`I-edit ang: ${pack?.name ?? '...'}`}</Text> ``.

Update the `question-editor` navigation call to carry `packId`:

```ts
                  onPress={() =>
                    router.navigate({ pathname: '/question-editor', params: { packId, category, level, activityNum: num, categoryColor: activeCategory.color, categoryLabel: activeCategory.label } })
                  }
```

- [ ] **Step 2: `jigsaw-content-screen.tsx`**

Same pattern. Add `useLocalSearchParams` import, read `packId`, guard on absence, call `ensurePackLoaded(packId)` in a mount effect, and thread `packId` first into every remaining call:

```ts
import { useRouter, useLocalSearchParams } from 'expo-router';
// ...
export default function JigsawContentScreen() {
  const router = useRouter();
  const { packId } = useLocalSearchParams<{ packId: string }>();
  const { isPackReady, error, ensurePackLoaded, getEffectiveCategoryContent, setCategoryImageUri, setCategoryContext, resetCategoryImage } =
    useAdminContent();
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draftText, setDraftText] = useState('');
  const [busyKey, setBusyKey] = useState<string | null>(null);

  useEffect(() => {
    if (packId) ensurePackLoaded(packId);
  }, [packId, ensurePackLoaded]);

  if (!packId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>Walang napiling pack. Bumalik sa Content Packs.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const ready = isPackReady(packId);
```

Add `useEffect` to the React import. Update:
- `pickImage`/`setCategoryImageUri(categoryKey, ...)` → `setCategoryImageUri(packId, categoryKey, asset.uri, asset.mimeType ?? undefined)`
- `handleReset`/`resetCategoryImage(categoryKey)` → `resetCategoryImage(packId, categoryKey)`
- `saveLesson`/`setCategoryContext(categoryKey, draftText.trim())` → `setCategoryContext(packId, categoryKey, draftText.trim())`
- `getEffectiveCategoryContent(cat.key)` (in the render loop) → `getEffectiveCategoryContent(packId, cat.key)`

- [ ] **Step 3: `question-editor-screen.tsx`**

Add `packId` to the params type and destructure:

```ts
  const params = useLocalSearchParams<{
    packId: string;
    category: string;
    level: string;
    activityNum: string;
    categoryColor: string;
    categoryLabel: string;
  }>();
  const { packId, category, categoryColor, categoryLabel } = params;
```

Guard right after (before `getEffectiveQuestion` is called):

```ts
  if (!packId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Walang napiling pack</Text>
        </View>
      </SafeAreaView>
    );
  }
```

Thread `packId` into every remaining call:
- `getEffectiveQuestion(category, level, activityNum)` → `getEffectiveQuestion(packId, category, level, activityNum)`
- `upsertQuestion(category, level, activityNum, payload)` (inside `save`) → `upsertQuestion(packId, category, level, activityNum, payload)`

`uploadQuestionImage(category, asset.uri, ...)` is **unchanged** — it never took a `packId` (media upload isn't pack-scoped; see the design spec).

- [ ] **Step 4: Run typecheck**

Run: `npx tsc --noEmit`
Expected: the three `(admin)` screens are now clean. Remaining failures (if any) should be limited to the four student screens Task 7 handles — confirm before continuing.

- [ ] **Step 5: Run the test suite**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/admin/screens/admin-content-manager-screen.tsx src/features/admin/screens/jigsaw-content-screen.tsx src/features/admin/screens/question-editor-screen.tsx
git commit -m "feat: scope the admin content-editing screens to a specific pack" \
  -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>" \
  -m "Claude-Session: https://claude.ai/code/session_01RUwcuTQNhseFFhK9o8LT5j"
```

---

### Task 7: Swap the four student screens to `useClassContent`

**Files:**
- Modify: `src/features/learning/screens/activity-list-screen.tsx`, `src/features/learning/screens/activity-play-screen.tsx`, `src/features/learning/screens/mini-lessons-screen.tsx`, `src/features/jigsaw/screens/jigsaw-puzzle-screen.tsx`

**Interfaces:**
- Consumes: `useClassContent()` (Task 5)
- Produces: no new exports — these are leaf screens

Each of these four files currently imports and calls `useAdminContent()` for read-only content — nothing here writes. The swap is mechanical: change the import, change the hook name, drop `packId` (there is none — `useClassContent()`'s methods take the same `(category, level?, activityNum?)` shape as before, unscoped by design since the backend already resolved the pack server-side).

- [ ] **Step 1: `activity-list-screen.tsx`**

Change:

```ts
import { useAdminContent } from '@/features/admin/context/admin-content-context';
```

to:

```ts
import { useClassContent } from '@/features/learning/context/class-content-context';
```

Change:

```ts
  const { getJigsawPieceCount, getEffectiveQuestion, getEffectiveCategoryContent } = useAdminContent();
```

to:

```ts
  const { getJigsawPieceCount, getEffectiveQuestion, getEffectiveCategoryContent } = useClassContent();
```

No other line in this file changes — the three destructured function names and their call signatures are identical between the old (unscoped) `AdminContentContext` and the new `ClassContentContext`.

- [ ] **Step 2: `activity-play-screen.tsx`**

Change the import the same way. Change:

```ts
  const { showMiniLesson, ready: adminReady, getEffectiveQuestion } = useAdminContent();
```

to:

```ts
  const { showMiniLesson, ready: adminReady, getEffectiveQuestion } = useClassContent();
```

(`showMiniLesson` and `ready` are both still present on `ClassContentContextType` — see Task 5 — so this line's shape is unchanged.)

- [ ] **Step 3: `mini-lessons-screen.tsx`**

Change the import the same way. Change:

```ts
  const { getEffectiveQuestion, getEffectiveCategoryContent } = useAdminContent();
```

to:

```ts
  const { getEffectiveQuestion, getEffectiveCategoryContent } = useClassContent();
```

- [ ] **Step 4: `jigsaw-puzzle-screen.tsx`**

Change the import the same way. Change:

```ts
  const { getEffectiveCategoryContent } = useAdminContent();
```

to:

```ts
  const { getEffectiveCategoryContent } = useClassContent();
```

- [ ] **Step 5: Run typecheck**

Run: `npx tsc --noEmit`
Expected: clean, project-wide. This closes out the transitional gaps from Tasks 2, 4, and 6.

- [ ] **Step 6: Run the test suite**

Run: `npx vitest run`
Expected: PASS, project-wide.

- [ ] **Step 7: Commit**

```bash
git add src/features/learning/screens/activity-list-screen.tsx src/features/learning/screens/activity-play-screen.tsx src/features/learning/screens/mini-lessons-screen.tsx src/features/jigsaw/screens/jigsaw-puzzle-screen.tsx
git commit -m "feat: resolve student gameplay content through the class's assigned pack" \
  -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>" \
  -m "Claude-Session: https://claude.ai/code/session_01RUwcuTQNhseFFhK9o8LT5j"
```

---

### Task 8: Packs library screen and route

**Files:**
- Create: `src/features/admin/screens/pack-list-screen.tsx`, `src/app/(admin)/packs.tsx`

**Interfaces:**
- Consumes: `packsApi` (Task 2), `useUser()` (existing, for `uid`/`role`)
- Produces: `export default function PackListScreen()`, mounted at `/packs`

- [ ] **Step 1: Read `admin-content-manager-screen.tsx` and `jigsaw-content-screen.tsx` once more**

They're the exact style precedent for this new screen: `SafeAreaView` + colored header with back button, a `ScrollView` list of cards, `!ready`/`!!error` states, `Alert.alert` for confirmations, hardcoded Tagalog copy, `StyleSheet.create` at the bottom. Match this file-local styling convention exactly rather than reaching for `src/shared/components/ui` (those primitives are used by the `(learning)`/`(teacher)` screens, which follow a different, token-based convention — `(admin)` screens do not use them; do not mix the two within one file).

- [ ] **Step 2: Write the screen**

```tsx
// src/features/admin/screens/pack-list-screen.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { packsApi, errorMessage, type ApiPack } from '@/shared/api';
import { useUser } from '@/features/auth/context/user-context';

const STATUS_LABEL: Record<ApiPack['status'], string> = {
  draft: 'Draft',
  published: 'Live',
  archived: 'Archived',
};

const STATUS_COLOR: Record<ApiPack['status'], string> = {
  draft: '#B0B0B0',
  published: '#2E9E5B',
  archived: '#C4304A',
};

export default function PackListScreen() {
  const router = useRouter();
  const { uid, role } = useUser();
  const [packs, setPacks] = useState<ApiPack[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  const canEdit = useCallback((pack: ApiPack) => pack.ownerUid === uid || role === 'admin', [uid, role]);

  const load = useCallback(async () => {
    try {
      const items = await packsApi.list();
      setPacks(items);
      setError(null);
    } catch (err) {
      setError(errorMessage(err, 'Hindi na-load ang mga content pack.'));
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    if (!newName.trim()) {
      Alert.alert('Kulang na Impormasyon', 'Maglagay ng pangalan para sa bagong pack.');
      return;
    }
    setBusyId('__create__');
    try {
      const created = await packsApi.create(newName.trim());
      setNewName('');
      setCreating(false);
      await load();
      router.navigate({ pathname: '/admin-content-manager', params: { packId: created.id } });
    } catch (err) {
      Alert.alert('Hindi Nagawa', errorMessage(err, 'Hindi nagawa ang bagong pack.'));
    } finally {
      setBusyId(null);
    }
  };

  const handleDuplicate = async (pack: ApiPack) => {
    setBusyId(pack.id);
    try {
      await packsApi.duplicate(pack.id);
      await load();
    } catch (err) {
      Alert.alert('Hindi Nakopya', errorMessage(err, 'Hindi nakopya ang pack.'));
    } finally {
      setBusyId(null);
    }
  };

  const handlePublish = async (pack: ApiPack) => {
    setBusyId(pack.id);
    try {
      await packsApi.publish(pack.id);
      await load();
    } catch (err) {
      Alert.alert('Hindi Na-publish', errorMessage(err, 'Hindi na-publish ang pack.'));
    } finally {
      setBusyId(null);
    }
  };

  const handleArchive = async (pack: ApiPack) => {
    setBusyId(pack.id);
    try {
      await packsApi.archive(pack.id);
      await load();
    } catch (err) {
      Alert.alert('Hindi Na-archive', errorMessage(err, 'Hindi na-archive ang pack.'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <Ionicons name="chevron-back" size={22} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Content Packs</Text>
        <Text style={styles.headerSubtitle}>Gumawa, kopyahin, o i-publish ang iyong mga content pack</Text>
      </View>

      {!!error && (
        <View style={styles.errorBanner}>
          <Ionicons name="cloud-offline-outline" size={16} color="#FFF" />
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.list}>
        {!ready && (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color="#3B7DD8" />
            <Text style={styles.loadingText}>Kinukuha ang mga pack mula sa server...</Text>
          </View>
        )}

        {ready && (
          creating ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Bagong Pack</Text>
              <TextInput
                style={styles.input}
                value={newName}
                onChangeText={setNewName}
                placeholder="Pangalan ng pack..."
                autoFocus
              />
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.primaryBtn, busyId === '__create__' && styles.busyBtn]}
                  onPress={handleCreate}
                  disabled={busyId === '__create__'}
                >
                  {busyId === '__create__' ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.actionBtnText}>Gawin</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, styles.cancelBtn]} onPress={() => setCreating(false)}>
                  <Text style={styles.actionBtnText}>Kanselahin</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.newPackBtn} onPress={() => setCreating(true)}>
              <Ionicons name="add-circle-outline" size={18} color="#3B7DD8" />
              <Text style={styles.newPackBtnText}>Bagong Pack</Text>
            </TouchableOpacity>
          )
        )}

        {ready && packs.map((pack) => {
          const owned = canEdit(pack);
          const busy = busyId === pack.id;
          return (
            <View key={pack.id} style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle}>{pack.name}</Text>
                <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[pack.status] }]}>
                  <Text style={styles.statusBadgeText}>{STATUS_LABEL[pack.status]}</Text>
                </View>
              </View>
              <Text style={styles.cardMeta}>
                v{pack.version} · {pack.classCount > 0 ? `Ginagamit ng ${pack.classCount} klase` : 'Walang gumagamit'}
              </Text>

              <View style={styles.cardActions}>
                {owned && (
                  <>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.primaryBtn]}
                      onPress={() => router.navigate({ pathname: '/admin-content-manager', params: { packId: pack.id } })}
                    >
                      <Text style={styles.actionBtnText}>I-edit ang Quiz</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.purpleBtn]}
                      onPress={() => router.navigate({ pathname: '/jigsaw-content', params: { packId: pack.id } })}
                    >
                      <Text style={styles.actionBtnText}>I-edit ang Jigsaw</Text>
                    </TouchableOpacity>
                  </>
                )}
                <TouchableOpacity
                  style={[styles.actionBtn, styles.duplicateBtn, busy && styles.busyBtn]}
                  onPress={() => handleDuplicate(pack)}
                  disabled={busy}
                >
                  <Text style={styles.actionBtnText}>Kopyahin</Text>
                </TouchableOpacity>
                {owned && pack.status === 'draft' && (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.publishBtn, busy && styles.busyBtn]}
                    onPress={() => handlePublish(pack)}
                    disabled={busy}
                  >
                    <Text style={styles.actionBtnText}>I-publish</Text>
                  </TouchableOpacity>
                )}
                {owned && pack.status !== 'archived' && (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.archiveBtn, busy && styles.busyBtn]}
                    onPress={() => handleArchive(pack)}
                    disabled={busy}
                  >
                    <Text style={styles.actionBtnText}>I-archive</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5EFE0' },
  header: { backgroundColor: '#3B7DD8', paddingTop: 10, paddingBottom: 16, paddingHorizontal: 16, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerBack: { marginBottom: 4 },
  headerTitle: { color: '#FFF', fontWeight: 'bold', fontSize: 19 },
  headerSubtitle: { color: '#FFF', fontSize: 12, opacity: 0.9, marginTop: 2 },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#B23A3A',
    borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, marginHorizontal: 16, marginTop: 12,
  },
  errorBannerText: { color: '#FFF', fontSize: 12, flex: 1 },
  loadingWrap: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  loadingText: { fontSize: 12.5, color: '#8E8E93' },
  list: { padding: 16, gap: 12 },
  newPackBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1.5, borderColor: '#3B7DD8', borderStyle: 'dashed', borderRadius: 14,
    paddingVertical: 12, marginBottom: 4,
  },
  newPackBtnText: { color: '#3B7DD8', fontWeight: 'bold', fontSize: 13 },
  card: { backgroundColor: '#FFF', borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: '#E0D5BE' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardTitle: { fontWeight: 'bold', fontSize: 14, color: '#1A1A1A', flex: 1 },
  cardMeta: { fontSize: 12, color: '#8E8E93', marginBottom: 10 },
  statusBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  statusBadgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  input: {
    backgroundColor: '#FFF', borderWidth: 1.5, borderColor: '#E0D5BE', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#1A1A1A', marginBottom: 10,
  },
  cardActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  actionBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14 },
  primaryBtn: { backgroundColor: '#3B7DD8' },
  purpleBtn: { backgroundColor: '#9B4FD6' },
  duplicateBtn: { backgroundColor: '#8E8E93' },
  publishBtn: { backgroundColor: '#2E9E5B' },
  archiveBtn: { backgroundColor: '#C4304A' },
  cancelBtn: { backgroundColor: '#8E8E93' },
  busyBtn: { opacity: 0.6 },
  actionBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
});
```

- [ ] **Step 3: Add the route**

```ts
// src/app/(admin)/packs.tsx
export { default } from '@/features/admin/screens/pack-list-screen';
```

- [ ] **Step 4: Run typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 5: Run the test suite**

Run: `npx vitest run`
Expected: PASS (no test file for this screen — matches convention).

- [ ] **Step 6: Commit**

```bash
git add src/features/admin/screens/pack-list-screen.tsx "src/app/(admin)/packs.tsx"
git commit -m "feat: add the content-pack library screen" \
  -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>" \
  -m "Claude-Session: https://claude.ai/code/session_01RUwcuTQNhseFFhK9o8LT5j"
```

---

### Task 9: Class Map pack-assignment card, dialog, and Teacher Dashboard entry point

**Files:**
- Create: `src/features/teacher/screens/assign-pack-dialog.tsx`
- Modify: `src/features/teacher/screens/class-map-screen.tsx`, `src/features/teacher/screens/teacher-dashboard-screen.tsx`, `src/shared/i18n/language-context.tsx`

**Interfaces:**
- Consumes: `classesApi.assignPack`/`.clearPack` (Task 2), `packsApi.list`/`.get` (Task 2/8), `useClass()` (existing)
- Produces: `export function AssignPackDialog(props): JSX.Element`

- [ ] **Step 1: Add i18n keys**

In `src/shared/i18n/language-context.tsx`, add to both the `en` and `tl` blocks (near the existing `classMap`/`assignLockTitle` keys — find that block and add alongside it):

```ts
    contentPackCardTitle: 'Content Pack',
    contentPackNoneAssigned: 'No pack assigned — playing the starter set',
    contentPackChangeBtn: 'Change Pack',
    contentPackClearBtn: 'Clear',
    contentPackBoundLinked: 'Shared',
    contentPackBoundCopied: 'Your own copy',
    managePacksBtn: 'Manage Content Packs',
    assignPackDialogTitle: 'Choose a Content Pack',
    assignPackShareBtn: 'Share it',
    assignPackCopyBtn: 'Make a copy',
```

(Tagalog block — same keys, Tagalog copy):

```ts
    contentPackCardTitle: 'Content Pack',
    contentPackNoneAssigned: 'Walang naka-assign na pack — ginagamit ang starter set',
    contentPackChangeBtn: 'Palitan ang Pack',
    contentPackClearBtn: 'I-clear',
    contentPackBoundLinked: 'Shared',
    contentPackBoundCopied: 'Sarili mong kopya',
    managePacksBtn: 'Pamahalaan ang Content Packs',
    assignPackDialogTitle: 'Pumili ng Content Pack',
    assignPackShareBtn: 'Ibahagi',
    assignPackCopyBtn: 'Gumawa ng Kopya',
```

(Read the file first to find its exact `en`/`tl` block boundaries and match the surrounding key style/quoting exactly — it's a flat object literal, so these are just new key-value pairs added anywhere inside each language's block.)

- [ ] **Step 2: Write `AssignPackDialog`**

```tsx
// src/features/teacher/screens/assign-pack-dialog.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { packsApi, errorMessage, type ApiPack, type AssignPackRequest } from '@/shared/api';
import { useLanguage } from '@/shared/i18n/language-context';

interface AssignPackDialogProps {
  visible: boolean;
  currentPackId: string | null;
  onAssign: (input: AssignPackRequest) => Promise<{ success: boolean; message: string }>;
  onClose: () => void;
}

export function AssignPackDialog({ visible, currentPackId, onAssign, onClose }: AssignPackDialogProps) {
  const { t } = useLanguage();
  const [packs, setPacks] = useState<ApiPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(currentPackId);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setSelectedId(currentPackId);
    setLoading(true);
    packsApi
      .list()
      .then(setPacks)
      .catch((err) => Alert.alert('Hindi Na-load', errorMessage(err)))
      .finally(() => setLoading(false));
  }, [visible, currentPackId]);

  const choose = async (mode: 'link' | 'copy') => {
    if (!selectedId || busy) return;
    setBusy(true);
    try {
      const result = await onAssign({ packId: selectedId, mode });
      if (!result.success) {
        Alert.alert('Hindi Na-assign', result.message);
        return;
      }
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{t('assignPackDialogTitle')}</Text>

          {loading ? (
            <ActivityIndicator style={{ marginVertical: 20 }} />
          ) : (
            <ScrollView style={styles.list}>
              {packs.map((pack) => (
                <TouchableOpacity
                  key={pack.id}
                  style={[styles.packRow, selectedId === pack.id && styles.packRowActive]}
                  onPress={() => setSelectedId(pack.id)}
                >
                  <Text style={styles.packRowText}>{pack.name}</Text>
                  <Text style={styles.packRowMeta}>{pack.status}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.shareBtn, (!selectedId || busy) && styles.disabledBtn]}
              onPress={() => choose('link')}
              disabled={!selectedId || busy}
            >
              {busy ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.actionBtnText}>{t('assignPackShareBtn')}</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.copyBtn, (!selectedId || busy) && styles.disabledBtn]}
              onPress={() => choose('copy')}
              disabled={!selectedId || busy}
            >
              <Text style={styles.actionBtnText}>{t('assignPackCopyBtn')}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={busy}>
            <Text style={styles.cancelBtnText}>Kanselahin</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%' },
  title: { fontSize: 16, fontWeight: '900', color: '#0038A8', marginBottom: 12 },
  list: { maxHeight: 260, marginBottom: 12 },
  packRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 12, borderRadius: 12, borderWidth: 1.5, borderColor: '#E0D5BE', marginBottom: 8,
  },
  packRowActive: { borderColor: '#3B7DD8', backgroundColor: '#EFF3FF' },
  packRowText: { fontSize: 13, fontWeight: '600', color: '#1A1A1A' },
  packRowMeta: { fontSize: 11, color: '#8E8E93' },
  actionRow: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: 'center' },
  shareBtn: { backgroundColor: '#2E9E5B' },
  copyBtn: { backgroundColor: '#3B7DD8' },
  disabledBtn: { opacity: 0.4 },
  actionBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  cancelBtn: { marginTop: 10, alignItems: 'center' },
  cancelBtnText: { color: '#8E8E93', fontWeight: '600' },
});
```

- [ ] **Step 3: Add the pack card to `class-map-screen.tsx` and simplify content management**

`class-map-screen.tsx` already has `import React, { useState } from 'react';` at the top — change it to `import React, { useState, useEffect } from 'react';`. Add two new import lines below the existing ones:

```ts
import { classesApi, packsApi, errorMessage, type ApiPack, type AssignPackRequest } from '@/shared/api';
import { AssignPackDialog } from './assign-pack-dialog';
```

`class-map-screen.tsx` currently destructures `const { assignment, setAssignment, clearAssignment } = useClass();` — replace that one line with the extended version below (adds `currentClass` and an aliased `refresh`), and add the new state/effect/handlers right after it:

```ts
  const { assignment, setAssignment, clearAssignment, currentClass, refresh: refreshClass } = useClass();
  const [assignedPack, setAssignedPack] = useState<ApiPack | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [clearingPack, setClearingPack] = useState(false);

  useEffect(() => {
    if (!currentClass?.packId) {
      setAssignedPack(null);
      return;
    }
    let cancelled = false;
    packsApi.get(currentClass.packId).then((pack) => {
      if (!cancelled) setAssignedPack(pack);
    }).catch(() => {
      if (!cancelled) setAssignedPack(null);
    });
    return () => { cancelled = true; };
  }, [currentClass?.packId]);

  const handleAssignPack = async (input: AssignPackRequest): Promise<{ success: boolean; message: string }> => {
    if (!currentClass) return { success: false, message: 'Wala pang klase.' };
    try {
      await classesApi.assignPack(currentClass.id, input);
      await refreshClass();
      return { success: true, message: 'Na-assign ang pack.' };
    } catch (err) {
      return { success: false, message: errorMessage(err, 'Hindi na-assign ang pack.') };
    }
  };

  const handleClearPack = async () => {
    if (!currentClass) return;
    setClearingPack(true);
    try {
      await classesApi.clearPack(currentClass.id);
      await refreshClass();
    } catch (err) {
      Alert.alert(t('contentPackCardTitle'), errorMessage(err, 'Hindi na-clear ang pack.'));
    } finally {
      setClearingPack(false);
    }
  };
```

Insert the new card in the JSX, between the existing assign/lock `</View>` (closing the first `card`) and the `{/* CONTENT MANAGEMENT LINKS */}` comment:

```tsx
        {/* CONTENT PACK CARD */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('contentPackCardTitle')}</Text>
          {currentClass?.packId ? (
            <>
              <Text style={styles.cardDesc}>
                {assignedPack?.name ?? '...'} —{' '}
                {currentClass.packBinding === 'copied' ? t('contentPackBoundCopied') : t('contentPackBoundLinked')}
              </Text>
              <View style={styles.actionRow}>
                <TouchableOpacity style={[styles.actionBtn, styles.assignBtn]} onPress={() => setDialogOpen(true)}>
                  <Text style={styles.actionBtnText}>{t('contentPackChangeBtn')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.clearBtn, clearingPack && styles.disabledBtn]}
                  onPress={handleClearPack}
                  disabled={clearingPack}
                >
                  <Text style={styles.actionBtnText}>{t('contentPackClearBtn')}</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.noAssignText}>{t('contentPackNoneAssigned')}</Text>
              <TouchableOpacity style={[styles.actionBtn, styles.assignBtn]} onPress={() => setDialogOpen(true)}>
                <Text style={styles.actionBtnText}>{t('contentPackChangeBtn')}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <AssignPackDialog
          visible={dialogOpen}
          currentPackId={currentClass?.packId ?? null}
          onAssign={handleAssignPack}
          onClose={() => setDialogOpen(false)}
        />
```

Replace the two existing "CONTENT MANAGEMENT LINKS" `TouchableOpacity`s (the ones navigating to `/admin-content-manager` and `/jigsaw-content`) with one:

```tsx
        <TouchableOpacity
          style={[styles.linkCard, { backgroundColor: '#3B7DD8' }]}
          onPress={() => router.navigate('/packs')}
        >
          <Ionicons name="albums" size={22} color="#FFF" />
          <Text style={styles.linkCardText}>{t('managePacksBtn')}</Text>
          <Ionicons name="chevron-forward" size={18} color="#FFF" />
        </TouchableOpacity>
```

- [ ] **Step 4: Add the Teacher Dashboard menu item**

In `teacher-dashboard-screen.tsx`, add a new entry to the `menuItems` array (after `classMap`, before `performanceProgression` — matches the existing order of "things about this specific class" before "things about performance"):

```ts
  const menuItems = [
    { label: t('classOverview'), icon: 'people', color: '#E8801A', href: '/class-overview' },
    { label: t('leaderBoard'), icon: 'trophy', color: '#2E9E5B', href: '/teacher-leaderboard' },
    { label: t('classMap'), icon: 'map', color: '#3B7DD8', href: '/class-map' },
    { label: t('managePacksBtn'), icon: 'albums', color: '#9B4FD6', href: '/packs' },
    { label: t('performanceProgression'), icon: 'stats-chart', color: '#9B4FD6', href: '/performance' },
  ] as const;
```

(Reuses the `managePacksBtn` key added in Step 1 — same label as Class Map's link, since it's the same destination.)

- [ ] **Step 5: Run typecheck**

Run: `npx tsc --noEmit`
Expected: clean, project-wide.

- [ ] **Step 6: Run the test suite**

Run: `npx vitest run`
Expected: PASS, project-wide.

- [ ] **Step 7: Commit**

```bash
git add src/features/teacher/screens/assign-pack-dialog.tsx src/features/teacher/screens/class-map-screen.tsx src/features/teacher/screens/teacher-dashboard-screen.tsx src/shared/i18n/language-context.tsx
git commit -m "feat: assign a content pack to a class from Class Map" \
  -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>" \
  -m "Claude-Session: https://claude.ai/code/session_01RUwcuTQNhseFFhK9o8LT5j"
```

---

### Task 10: Thread `classId` through progress calls

**Files:**
- Modify: `src/features/learning/context/game-progress-context.tsx`

**Interfaces:**
- Consumes: `useClass()` (existing), `progressApi.get(uid?, classId?)` (Task 2)
- Produces: no new exports — `useGameProgress()`'s shape is unchanged

- [ ] **Step 1: Add the `useClass` import and read `classId`**

```ts
import { useClass } from '@/features/teacher/context/class-context';
```

Inside `GameProgressProvider`, add alongside the existing `useUser()` destructure:

```ts
  const { signedIn, ready: userReady, uid } = useUser();
  const { classId } = useClass();
```

- [ ] **Step 2: Thread it into `refresh`**

Change:

```ts
      const { tracks: apiTracks } = await progressApi.get();
```

to:

```ts
      const { tracks: apiTracks } = await progressApi.get(undefined, classId ?? undefined);
```

Add `classId` to the `refresh` callback's dependency array: `[signedIn, uid, classId]`.

- [ ] **Step 3: Thread it into `mark`**

Change the `payload` object inside `mark`:

```ts
      const payload = {
        category: categoryKey as ApiCategoryKey,
        activityType: activityType as ApiActivityType,
        level,
        activityNum,
        classId: classId ?? undefined,
      };
```

Add `classId` to `mark`'s dependency array: `[applyLocally, uid, classId]`.

- [ ] **Step 4: Run typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 5: Run the test suite**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/learning/context/game-progress-context.tsx
git commit -m "feat: scope progress reads and writes to the student's class" \
  -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>" \
  -m "Claude-Session: https://claude.ai/code/session_01RUwcuTQNhseFFhK9o8LT5j"
```

---

## Self-review

**Spec coverage.** Decision 2 (pack-scoped editing) → Tasks 4, 6. Decision 3 (class-scoped student reads) → Tasks 5, 7. Decision 4 (context split + shared lib) → Tasks 1, 4, 5. Decision 5 (single global admin provider, packId-keyed cache) → Task 4. Decision 6 (two pack-library entry points) → Tasks 8, 9. Decision 7 (one card, not a list screen) → Task 9. Decision 8 (inline create form, no `Alert.prompt`) → Task 8. Decision 9 (showMiniLesson gap) → Task 4 (writes) and Task 6 (caption) and Task 5 (unscoped student read, explicitly commented). Progress `classId` → Task 10. Results — deliberately no task, per the spec's finding that `submitResultSchema` has no `classId` field.

**Not covered, deliberately.** Any multi-class picker (facts 2–3 in the spec — not applicable to this data model). Fixing the `showMiniLesson` backend gap itself (flagged as a follow-up, not built). Component/context test coverage (this repo has none today, and this plan does not introduce the pattern).

**Type consistency check.** `content-resolution.ts`'s three `resolve*` functions (Task 1) are called with identical argument shapes from both `admin-content-context.tsx` (Task 4, packId-keyed) and `class-content-context.tsx` (Task 5, classId-scoped, no packId in its own public surface). `ApiPack`/`AssignPackRequest`/`ApiPackBinding` (Task 2) are consumed identically by Tasks 8 and 9. `packId` flows from `pack-list-screen.tsx`'s navigation calls (Task 8) into `admin-content-manager-screen.tsx`/`jigsaw-content-screen.tsx`'s `useLocalSearchParams` (Task 6) with the same param name throughout. `useAdminContent()`'s pack-scoped method signatures (Task 4) match exactly how Task 6 calls them, argument-for-argument.
