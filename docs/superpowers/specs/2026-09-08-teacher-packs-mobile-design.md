# Teacher Access to Content Packs — Mobile Design

**Date:** 2026-09-08
**Repo:** `juanwise-app-v2`
**Depends on:** `juanwise-be` branch `feat/content-packs` (PR up, not yet merged) — this plan assumes that API surface exists and treats it as fixed; nothing here proposes a backend change.
**Parent spec:** `../../../juanwise-be/docs/superpowers/specs/2026-09-08-content-packs-design.md`
**Sibling (web) precedent:** `../../../juanwise-admin/docs/superpowers/specs/2026-09-08-teacher-packs-web-design.md` — read for its decisions, not its implementation (different framework).

## Problem

`juanwise-app-v2` today has exactly one content library. The `(admin)` route group
(`admin-content-manager.tsx`, `jigsaw-content.tsx`, `question-editor.tsx`, backed by
`AdminContentContext`) edits it through the `/content/*` shim, and the same context —
mounted once, globally, in `_layout.tsx` — is also what every student-facing gameplay
screen reads from (`activity-list-screen.tsx`, `activity-play-screen.tsx`,
`mini-lessons-screen.tsx`, `jigsaw-puzzle-screen.tsx`). There is one set of activities
for the whole deployment, any teacher who reaches Class Map can edit it, and every
student sees the same thing regardless of which class they are in.

The backend now lets a teacher own reusable "content packs" — bundles of all six
categories' quiz and jigsaw activities — and assign one to each class they handle,
either by linking (sharing) it or duplicating it into an independent fork. Web is
adding the same capability to the admin console in parallel. This spec brings mobile
to parity: pack-scoped authoring, a pack library, class-to-pack assignment, and
class-scoped content resolution for students.

## Facts established by reading the actual code (not assumed)

These settle several open questions the parent spec left to each client:

1. **No route-level role gate exists.** `(admin)` and `(teacher)` are reached by
   navigation alone — `class-map-screen.tsx` links straight into
   `admin-content-manager`/`jigsaw-content` with no `role === 'admin'` check anywhere
   in `src/app` or `src/features`. Every context that branches on staff-ness treats
   `admin` as a superset of `teacher` (`isTeacher = role === 'teacher' || role === 'admin'`).
   Web's decision 1 ("one app, role-based access") is already true here — there is
   nothing to widen.
2. **A student belongs to at most one class**, confirmed independently on the backend
   (`users/{uid}.classId` scalar, `join()` refuses a second class) and here: `ClassContext`
   calls `classesApi.mine()` for *any* role and just takes `classes.find(c => !c.archived)
   ?? classes[0]` — there is no multi-class UI anywhere in this app. **No class picker
   is built**, per the initiative's standing instruction.
3. **A teacher also has effectively one class in this app**, unlike web. `ClassContext.
   ensureClass()` creates a class lazily on first use and the whole teacher UI
   (`teacher-dashboard-screen.tsx`, `class-overview-screen.tsx`, `class-map-screen.tsx`)
   is built around `currentClass`, singular — even though the backend supports several
   classes per teacher and web is building a plural "My Classes" screen for it. Mobile's
   pack-assignment UI is therefore **one card bound to `currentClass`**, not a list
   screen — this is the one place mobile's screen shape genuinely diverges from web's,
   and it's a direct reading of this app's existing structure, not an invented
   simplification.
4. **`AdminContentContext` is not admin-only.** It is mounted once in `_layout.tsx` and
   consumed by the three `(admin)` screens *and* by every student gameplay screen
   (`activity-list-screen.tsx:4`, `activity-play-screen.tsx:4`, `mini-lessons-screen.tsx:6`,
   `jigsaw-puzzle-screen.tsx:6`), plus `class-map-screen.tsx:7` for the `CATEGORY_LIST`
   export. Splitting authoring (pack-scoped) from reading (class-scoped) is the central
   structural change this spec makes — see "Content resolution split" below.
5. **This repo unit-tests pure modules only.** `vitest.config.ts` includes `src/**/*.test.ts`
   (not `.tsx`) with `environment: 'node'`. No context and no screen has a test file
   today — `question-mapping.test.ts`, `activity-list-model.test.ts`,
   `answer-matching.test.ts`, `retry.test.ts`, `upload.test.ts`, `tokens.test.ts`,
   `icon-registry.test.ts`, `avatar-identity.test.ts` are all pure-logic tests. This plan
   does not invent component/context tests; it extracts pure resolution and mapping
   logic into `lib/` modules and tests those, matching the house style exactly.
6. **A genuine backend gap: `showMiniLesson` cannot reach students on a non-system pack.**
   The parent spec moved `showMiniLesson` from `settings/global` onto each pack
   (`ContentPack.showMiniLesson`, `PATCH /packs/:packId`), but `GET /classes/:id/content/*`
   (what a student's app calls) does not return it, and `/packs/:packId` is
   `requireTeacher` — a student can never read it directly. The old `/content/settings`
   shim still exists and still resolves to `system-default` only. **Ruling:** the
   student-facing "show mini-lesson" toggle keeps reading `/content/settings` exactly as
   today (unaffected by which pack a class actually plays); the admin editor's toggle
   is retrofit to edit the *pack's* `showMiniLesson` via `PATCH /packs/:packId` so the
   data is correct and forward-compatible, but a caption is added noting it has no
   effect on students of a class playing anything other than the system pack yet. This
   is flagged as a follow-up for a future backend change (e.g. surfacing `showMiniLesson`
   on `GET /classes/:id/content/categories` or a class-scoped settings route) — not
   solved here, since the backend is frozen for this initiative.

## Decisions

| # | Decision | Choice |
|---|---|---|
| 1 | Auth model | **No change needed.** Already one app, no role gate on `(admin)`/`(teacher)`. |
| 2 | Content-editing scope | **Pack-scoped everywhere.** The three `(admin)` screens take a `packId` (via `useLocalSearchParams`) and call `/packs/:packId/...` instead of `/content/*`. |
| 3 | Student content scope | **Class-scoped.** Student gameplay screens resolve through `GET /classes/:id/content/categories`/`questions`, keyed by the student's own `classId` (already on `useUser()`/`useClass()`), never a `packId` directly. |
| 4 | Context split | **Two contexts, one shared pure lib.** `AdminContentContext` (owner editing, packId-keyed cache) and a new `ClassContentContext` (student reads, classId-keyed cache) both delegate resolution math to `src/features/admin/lib/content-resolution.ts`, a pure, unit-tested module. |
| 5 | Admin provider wiring | **Stays a single global provider**, made pack-aware via an internal `Record<packId, ...>` cache and an `ensurePackLoaded(packId)` call, rather than restructuring `_layout.tsx`/route groups around a dynamic segment. Lowest-risk fit for Expo Router's file-based layout, and it mirrors the existing flat-cache pattern in the same file today. |
| 6 | Pack library entry points | **Two:** a new "Content Packs" item on Teacher Dashboard's menu (parity with web's top-level nav), and Class Map's existing "Content Management" links point at it too (a teacher can't jump straight into editing without first landing on an owned pack — see below). |
| 7 | Class assignment UI | **One card on Class Map**, next to the existing category/game-type lock card, not a new screen — matches fact 3 above. |
| 8 | Pack creation UI | **Inline form, not `Alert.prompt`.** `Alert.prompt` is iOS-only; this app has no cross-platform prompt primitive. Follows `class-overview-screen.tsx`'s existing inline-edit pattern (toggle a `TextInput` + Save/Cancel). |
| 9 | showMiniLesson | See fact 6 above — kept functional per-pack for forward compatibility, with a documented gap. |

## What changes

### 1. API client (`src/shared/api/types.ts`, `endpoints.ts`)

New types, mirroring `packs.schema.ts`/`classes.schema.ts` exactly:

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

export interface CreatePackRequest { name: string; }
export interface PatchPackRequest { name?: string; showMiniLesson?: boolean; }
export interface AssignPackRequest { packId: string; mode: 'link' | 'copy'; }
```

`ApiClass` gains `packId: string | null; packBinding: ApiPackBinding | null; packVersion: number | null;` right after `assignment`.

`MarkActivityRequest` gains `classId?: string`. `ApiProgress`'s query gains `classId` (a
new query-shaped param on `progressApi.get`, not a type change to `ApiProgress` itself).

New `packsApi` (mirrors web's, same method set): `list(mine?)`, `create(name)`, `get(id)`,
`patch(id, input)`, `duplicate(id, name?)`, `publish(id)`, `archive(id)`.

`contentApi`'s six category/question methods each gain a leading `packId: string` and
their URL moves from `/content/...` to `/packs/${packId}/...`. `settings`/`updateSettings`
are **unchanged** — see fact 6 (the student toggle keeps using the shim; the admin editor
stops calling `updateSettings` and calls `packsApi.patch` instead).

`classesApi` gains `assignPack(id, input)`, `clearPack(id)`, `categories(id)`,
`questions(id, query)` — the last two hit `GET /classes/:id/content/categories`/`questions`
and are what `ClassContentContext` calls.

### 2. Shared resolution logic (`src/features/admin/lib/content-resolution.ts`, new)

Today `admin-content-context.tsx` inlines three pieces of resolution math that both the
new admin context and the new student context need identically: which question wins
(bundled fallback vs. an `isOverride` API question), which category picture/context wins
(with the per-activity jigsaw-slot override), and which piece-count an activity plays (the
admin's choice vs. the difficulty ramp). Extracted as pure functions:

```ts
export function resolveEffectiveQuestion(
  local: QuizQuestion,
  api: ApiQuestion | undefined,
): QuizQuestion {
  return api?.isOverride ? toQuizQuestion(api, local) : local;
}

export function resolveEffectiveCategoryContent(
  base: { image: any; context_tl: string },
  api: ApiCategory | undefined,
  level?: number,
  activityNum?: number,
): EffectiveCategoryContent { /* identical logic to today's getEffectiveCategoryContent body */ }

export function resolveJigsawPieceCount(
  api: ApiCategory | undefined,
  level: number,
  activityNum: number,
): ApiJigsawPieceCount { /* identical logic to today's getJigsawPieceCount body, incl. rampPieceCount */ }
```

`EffectiveCategoryContent`, `jigsawSlotKey`, `slotId`, and `rampPieceCount` move here too
(currently private to `admin-content-context.tsx`). This file has no React import and no
Expo/native import, so it is directly unit-testable under the existing `vitest.config.ts`
glob — this is where the plan's TDD tasks live.

### 3. `AdminContentContext` retrofit (owner editing, pack-scoped)

Stays a single global provider (decision 5). Internal state becomes packId-keyed:

```ts
type PackState = { categories: CategoryOverrides; questions: QuestionOverrides; pack: ApiPack | null };
const [packs, setPacks] = useState<Record<string, PackState>>({});
const [loadingPacks, setLoadingPacks] = useState<Record<string, boolean>>({});
```

Every exposed method gains `packId` as its new first argument:
`getEffectiveQuestion(packId, category, level, activityNum)`, `isOverridden(packId, ...)`,
`upsertQuestion(packId, ...)`, `deleteQuestionOverride(packId, ...)`,
`getEffectiveCategoryContent(packId, category, level?, activityNum?)`,
`getJigsawPieceCount(packId, ...)`, `setCategoryImageUri(packId, ...)`,
`setCategoryContext(packId, ...)`, `resetCategoryImage(packId, ...)`,
`uploadQuestionImage` is **unchanged** (media upload is not pack-scoped on the backend —
same reasoning web's plan gives for its own `mediaApi.upload` calls). `showMiniLesson`/
`setShowMiniLesson` become `getPack(packId)` (returns the cached `ApiPack` or `null`) and
`setShowMiniLesson(packId, value)` (calls `packsApi.patch`).

A new `ensurePackLoaded(packId): void` triggers the fetch (categories + questions + the
pack itself, `Promise.all([packsApi.get(packId), contentApi.categories(packId),
contentApi.questions(packId)])`) the first time a packId is seen, and a new
`isPackReady(packId): boolean` replaces the old flat `ready`. Each of the three `(admin)`
screens calls `ensurePackLoaded(packId)` in a `useEffect` keyed on `packId`, exactly the
shape `question-editor-screen.tsx` already uses for its own route params.

`upsertQuestion`/`setCategoryImageUri`/etc. resolve their pack's cache slot, call the
pack-scoped API, and merge the response into `packs[packId]` — the same
"try/store/return ActionResult" shape every existing method already uses.

`CATEGORY_LIST` stays as-is (pure category keys, not pack data) but moves to
`src/shared/content/category-meta.ts` since it no longer conceptually belongs to an
admin-only context that `class-map-screen.tsx` (a teacher screen, not an admin one) is
importing from. `class-map-screen.tsx`'s import updates accordingly.

### 4. New `ClassContentContext` (student reads, class-scoped)

`src/features/learning/context/class-content-context.tsx`, mounted in `_layout.tsx`
alongside the existing providers (after `ClassProvider`, since it needs `useClass().classId`).
Shape mirrors the old `AdminContentContext`'s read-only surface exactly, minus any write
method, so the four call-site screens change only their import and hook name:

```ts
type ClassContentContextType = {
  ready: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  getEffectiveQuestion: (category: string, level: number, activityNum: number) => QuizQuestion;
  getEffectiveCategoryContent: (category: string, level?: number, activityNum?: number) => EffectiveCategoryContent;
  getJigsawPieceCount: (category: string, level: number, activityNum: number) => ApiJigsawPieceCount;
};
```

Internally: reads `classId` from `useClass()`; on `classId` change, calls
`classesApi.categories(classId)`/`classesApi.questions(classId)`; stores the result the
same shape as before (`CategoryOverrides`/`QuestionOverrides`, unchanged types); computes
`getEffectiveQuestion`/etc. via `resolveEffectiveQuestion`/`resolveEffectiveCategoryContent`/
`resolveJigsawPieceCount` from the new shared lib — same call, no `packId` in this context's
own public surface, because the backend already resolved the pack server-side by the time
the response comes back. When `classId` is null (should not happen for a signed-in student,
but the type from `useClass()` allows it), it degrades to "not ready" rather than fetching
`/classes/undefined/content/...`.

`activity-list-screen.tsx`, `activity-play-screen.tsx`, `mini-lessons-screen.tsx`,
`jigsaw-puzzle-screen.tsx` swap `import { useAdminContent } from '@/features/admin/context/admin-content-context'`
for `import { useClassContent } from '@/features/learning/context/class-content-context'`
and `useAdminContent()` for `useClassContent()` — call sites are otherwise unchanged, since
the exposed function names and signatures match on purpose. `activity-play-screen.tsx`'s
`showMiniLesson` read moves to a small dedicated read (`contentApi.settings()` via a tiny
local `useEffect`/`useState`, or a one-line addition to `ClassContentContext` that exposes
`showMiniLesson` sourced from the *unscoped* shim per fact 6) — kept as a distinct field so
it's obvious in the code that it is NOT pack-resolved.

### 5. Packs library screen (`src/features/admin/screens/pack-list-screen.tsx`, new)

Mounted at `src/app/(admin)/packs.tsx`. Follows the file/screen conventions of its two
siblings (`StyleSheet.create`, hardcoded Tagalog copy — the `(admin)` screens do not use
the `t()` i18n system, unlike `(teacher)` screens; this file matches its siblings, not
`class-map-screen.tsx`).

Behavior:
- On mount, `packsApi.list()` (own + every published).
- Each pack renders as a card: name, a status pill (`draft`/`published`/`archived`,
  reusing the colour vocabulary already in these screens — green-ish for
  published/custom, grey for default/archived, matching `admin-content-manager-screen.tsx`'s
  existing Custom/Default badge pair), version, `classCount` ("Ginagamit ng N klase" /
  "Walang gumagamit"), and whether it's owned (`pack.ownerUid === uid || role === 'admin'`).
- **"+ Bagong Pack"** toggles an inline `TextInput` + "Gawin"/"Kanselahin" row (decision 8),
  calling `packsApi.create(name)` then navigating to `/admin-content-manager?packId=<new id>`.
- Each owned pack: **"I-edit ang Quiz"** → `/admin-content-manager?packId=<id>`,
  **"I-edit ang Jigsaw"** → `/jigsaw-content?packId=<id>`.
- Every visible pack (owned or not): **"Kopyahin"** (Duplicate) → `packsApi.duplicate(id)`,
  reload list.
- Owned + `draft`: **"I-publish"** → `packsApi.publish(id)`.
- Owned: **"I-archive"** → `packsApi.archive(id)`; on a 409 (blocked by `classCount > 0`),
  show the server's own message in the existing error-banner style — do not hardcode a
  different one.
- Loading/error/empty states match the existing `!ready`/`!!error` pattern in
  `admin-content-manager-screen.tsx`.

### 6. Retrofit the three existing `(admin)` screens to take `packId`

- `admin-content-manager-screen.tsx`, `jigsaw-content-screen.tsx`: add
  `const { packId } = useLocalSearchParams<{ packId: string }>();` at the top (same idiom
  `question-editor-screen.tsx` already uses for its own params); guard with a `Banner`-style
  message if absent rather than asserting non-null (these screens are only ever reached
  from `pack-list-screen.tsx`'s own links, which always carry it, but the guard costs two
  lines and avoids a runtime crash on a bad deep link); call `ensurePackLoaded(packId)` in
  a mount effect; thread `packId` into every `useAdminContent()` call already in the file;
  thread `packId` onward into `question-editor`'s navigation params (`router.navigate({
  pathname: '/question-editor', params: { packId, category, level, ... } })`).
- `question-editor-screen.tsx`: reads `packId` the same way alongside its existing
  `category`/`level`/`activityNum` params; threads it into `getEffectiveQuestion`,
  `upsertQuestion`, `uploadQuestionImage` stays unchanged (not pack-scoped).
- Add a small pack-name context line to each screen's header (mirrors web's Task 5 Step 3)
  — e.g. `admin-content-manager-screen.tsx`'s header subtitle becomes
  `` `I-edit, i-update, o burahin ang mga tanong — ${pack?.name ?? '...'}` ``.

### 7. Class Map: pack-assignment card + simplified content-management link

`class-map-screen.tsx` gains, between the existing assignment-lock card and the
"CONTENT MANAGEMENT" section:

- A **"Content Pack"** card showing `currentClass.packId` resolved to a name (looked up
  from a small `packsApi.get(packId)` call, or "Sistema (default)" when `packId` is
  null) and its binding (`packBinding === 'copied'` → "sarili mong kopya"; `'linked'` →
  "shared"; null → "walang pack, ginagamit ang default"). A **"Palitan ang Pack"**
  ("Change Pack") button opens `AssignPackDialog` (new). If a pack is assigned, a
  **"I-clear"** button calls `classesApi.clearPack(currentClass.id)`.
- The two existing "CONTENT MANAGEMENT" buttons (`/admin-content-manager`,
  `/jigsaw-content`) are replaced with **one** button, "Pamahalaan ang Content Packs" →
  `/packs` — per decision 6, a teacher cannot jump straight into editing without first
  landing on a pack they own (the class's *resolved* pack may be the read-only system
  pack), so the direct links are no longer correct and the library screen is the only
  valid entry point. Uses `t()` new keys, matching this file's existing convention
  (unlike the `(admin)` screens).

`AssignPackDialog` (`src/features/teacher/screens/assign-pack-dialog.tsx`, new,
co-located under `teacher` since it's teacher-feature-specific and only used from Class
Map — unlike web there is no second consumer to justify a shared `classes/` feature
folder): a `Modal` (matching the `Modal` usage already in `activity-play-screen.tsx`/
`jigsaw-puzzle-screen.tsx`) listing packs (`packsApi.list()`), a chosen pack, two buttons
— "Ibahagi" (Share, `mode: 'link'`, default/primary) and "Gumawa ng Kopya" (Make a copy,
`mode: 'copy'`) — calling `classesApi.assignPack(currentClass.id, { packId, mode })` and
closing on success. Since mobile has one class per teacher, there is no "shared with N
other classes" cross-class computation to build (that was a web-only concern arising from
its plural class list) — this is a straight two-button confirm, not a computed-consequence
banner.

### 8. Progress calls carry `classId`

`game-progress-context.tsx` already imports `useUser`; add `const { classId } = useClass();`
(new import) and thread it: `progressApi.get(undefined, classId ?? undefined)` on refresh,
and `classId ?? undefined` added to the `payload` object in `mark()` before calling
`progressApi.complete`/`fail`. This is close to a no-op functionally (the backend already
falls back to the caller's single active class when `classId` is omitted — confirmed by
reading `resolveProgressClassId`/`activeClassIdsFor` in `progress.service.ts`), but sending
it explicitly matches what the other two legs of this initiative did and removes any
reliance on server-side inference. `progressApi.get`'s signature gains a second optional
parameter: `get(uid?: string, classId?: string)`.

### 9. Results — no change needed

Read `results.schema.ts` directly: `submitResultSchema` has **no** `classId` field — the
backend resolves it server-side from the caller's active membership, unconditionally, on
every submit. `student-results-context.tsx`'s `addResult` already sends exactly the fields
the schema accepts. Teacher-side listing (`resultsApi.listAll({ classId })`) already scopes
by `classId` sourced from `useClass()`. **No files in `results/` change.** This is a
deliberate finding, not an oversight — confirmed against the live backend schema rather
than assumed from the parent spec's prose.

## Out of scope

Everything the parent spec puts out of scope (co-owned packs, pack import/export,
per-class activity scheduling, scoring/medal/class-code changes). Additionally, mobile-
specific:

- A multi-class picker for students or teachers (facts 2–3 — neither exists in this data
  model on mobile today).
- Fixing the `showMiniLesson` class-content gap (fact 6) — flagged as a backend follow-up.
- Any redesign of the six existing gameplay/results screens beyond the context/import swap
  needed to read from `ClassContentContext` instead of `AdminContentContext`.
- Component/context test coverage — this repo has none today (fact 5); this initiative
  does not introduce a new testing pattern for it.
