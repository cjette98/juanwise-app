# Bilingual Quiz & Jigsaw Content Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Quiz questions and jigsaw mini-lessons show English or Tagalog to match the language set in the app. Admins can enter an English version beside the Tagalog one.

**Architecture:** Each question gains an optional `en` object that holds the English text set, validated by the same per-type rules as the Tagalog fields. The existing fields stay the Tagalog version. The app maps `en` through to `QuizQuestion`. One pure `localizeQuestion(q, language)` picks the whole English set when it exists and the language is English, otherwise the Tagalog set. Category and jigsaw text pick `*_en` / `*_tl` by language with a Tagalog fallback. Both editors get a Tagalog | English switch.

**Tech Stack:** Express + Zod + Firestore + Vitest (`juanwise-be`); Expo / React Native + Vitest (`juanwise-app-v2`).

**Spec:** approved in chat on 2026-10-21, summarized here:
- All content follows the app's set language (`Language = 'en' | 'tl'`, `useLanguage()`).
- A question is shown wholly in one language, never mixed. With no English version (content saved before this change), English mode shows the Tagalog version.
- **Both languages are required when saving** (user decision, 2026-10-21): a question upsert must include `en`, and the mobile jigsaw mini-lesson editor needs both texts before it saves. Content already stored without English still reads and plays.
- Jigsaw/category text: English mode shows `context_en` / `definition_en`, or the `_tl` text when that is empty. Tagalog mode always shows `_tl`.
- Existing content becomes the Tagalog version unchanged. No migration. Bundled defaults stay Tagalog-only.
- Pictures and `requiredAnswers` are shared between languages.

Paths prefixed `be/` are in `/Volumes/SSD/juanwise-app-main/juanwise-be`. All others are in `juanwise-app-v2`. Both repos are on branch `feat/bilingual-content`.

## Global Constraints

- English version shape (server and app): `{ question, hint, explanation, miniLesson, choices, correctAnswer, answerPool, acceptedAnswers }`, with type-specific fields as for Tagalog. It is stored as `en` on the question document, and `null` or absent means "no English version".
- English validation = the same rules as the Tagalog fields for that type: multiple-choice has 2–8 choices and `correctAnswer` in `choices`; enumeration has a pool of 10 or more; identification has a unique `correctAnswer` + `acceptedAnswers`. `question` is required when `en` is sent.
- English mode with a missing `en` → the Tagalog version. Never mix fields across languages.
- Every new admin-visible string goes through `t()` with `en` and `tl` entries.
- A question document written before this change reads back as `en: null`.

## Review Focus

1. **A question whose type changes after English was entered** → the save sends only the `en` fields the new type owns. Test in Task 2 (`toUpsertRequest`).
2. **English choices graded against the Tagalog answer** → impossible, because `localizeQuestion` swaps the whole set. Test in Task 2.
3. **An admin clears every English field** → the save sends `en: null`, not an empty object that fails validation. Test in Task 2.
4. **A language switch while on a screen** → the question and mini-lesson re-render in the new language, because `getEffectiveQuestion` depends on `language`. Check in Task 3.
5. **The web admin's existing `context_en` edits** → now shown to English-mode students. Test in Task 3 (`resolveEffectiveCategoryContent`).

---

### Task 1: Server — optional English version on questions

**Files:**
- Modify: `be/src/modules/content/content.schema.ts` (`questionSchema`, the three upsert schemas)
- Modify: `be/src/modules/content/content.repository.ts` (`toQuestion`, `upsertQuestion`)
- Test: `be/tests/content-question-schema.test.ts` (extend)

**Interfaces:**
- Produces: `questionSchema.en: QuestionEnDto | null`, where `QuestionEnDto = { question: string; hint: string | null; explanation: string | null; miniLesson: string | null; choices: string[] | null; correctAnswer: string | null; answerPool: string[] | null; acceptedAnswers: string[] | null }`. Each upsert schema accepts an optional, nullable `en` with that type's rules and the same length caps as the Tagalog fields.

- Follow-up (user decision): `en` is **required** on all three upsert schemas, not optional. Stored documents without `en` still read back as `en: null`.

- [ ] **Step 1: Write failing tests:**
  - A multiple-choice upsert with `en: { question: 'Who?', choices: ['A','B'], correctAnswer: 'A' }` parses.
  - The same with `correctAnswer: 'C'` fails on path `['en','correctAnswer']`.
  - Enumeration `en.answerPool` with 9 entries fails.
  - Identification `en` with a duplicate accepted answer fails.
  - `en: null` and a missing `en` both parse.
  - `en` without `question` fails.
- [ ] **Step 2: Run** `npm test -- content-question-schema` — FAIL.
- [ ] **Step 3: Implement.** Build each type's `en` schema from the same field definitions as its Tagalog counterpart. Reuse the existing refinements, and do not copy them. `toQuestion` reads `d.en ?? null`. `upsertQuestion` writes `en` (`null` when absent), keeping the PUT a full overwrite.
- [ ] **Step 4: Run** `npm test && npm run typecheck` — PASS.
- [ ] **Step 5: Commit**: `feat(content): store an optional English version of each question`

### Task 2: App — question mapping and `localizeQuestion`

**Files:**
- Modify: `src/shared/api/types.ts` (`ApiQuestion.en`, `UpsertQuestionRequest.en`)
- Modify: `src/shared/content/quiz-content.ts` (`QuizQuestion` gains `en?: QuizQuestionEn | null`)
- Modify: `src/features/admin/lib/question-mapping.ts` (`toQuizQuestion`, `toUpsertRequest`)
- Create: `src/shared/content/localize-question.ts`
- Test: `src/features/admin/lib/question-mapping.test.ts` (extend or create), `src/shared/content/localize-question.test.ts`

**Interfaces:**
- Produces: `QuizQuestionEn` (the text fields of `QuizQuestion` for its type, optional per type), and `localizeQuestion(q: QuizQuestion, language: Language): QuizQuestion`. The result never carries `en`, so screens can't reach the other language by accident.
- `toUpsertRequest` sends `en` with only the fields the current `type` owns. It sends `en: null` when the English question text is empty after trim.

- [ ] **Step 1: Write failing tests:**
  - `localizeQuestion(q, 'en')` with `en` returns the English question, choices and correctAnswer, and keeps `type`, `requiredAnswers` and `miniLessonImageUrl`.
  - `localizeQuestion(q, 'en')` without `en` returns the Tagalog set.
  - `localizeQuestion(q, 'tl')` with `en` returns the Tagalog set.
  - The English `hint` falls back to `''` (not the Tagalog hint) when the English set exists but has no hint, so the question stays all one language.
  - `toUpsertRequest` with an all-blank English set gives `en: null`.
  - With `type: 'identification'` and stale English `choices`, `toUpsertRequest` drops `choices`.
  - `toQuizQuestion` maps `api.en`.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** `npm test && npx tsc --noEmit` — PASS.
- [ ] **Step 5: Commit**: `feat(content): pick a question's English or Tagalog version`

### Task 3: App — students see the set language

**Files:**
- Modify: `src/features/learning/context/class-content-context.tsx` (`getEffectiveQuestion`, `getEffectiveCategoryContent`)
- Modify: `src/features/admin/lib/content-resolution.ts` (`resolveEffectiveCategoryContent` gains `language: Language`)
- Test: `src/features/admin/lib/content-resolution.test.ts` (extend)

**Interfaces:**
- Consumes: `localizeQuestion` from Task 2.
- `getEffectiveQuestion` returns `localizeQuestion(resolveEffectiveQuestion(...), language)`, and its `useCallback` deps include `language`. `resolveEffectiveCategoryContent(base, api, language, level?, activityNum?)`: in English, `context` = `picked.context_en ?? api.context_en ?? <tl chain as today>`, and `definition` likewise. Tagalog behaviour is unchanged.
- The admin editors keep reading the raw (un-localized) question through `admin-content-context`, so they still see both languages. Check that no admin screen goes through `getEffectiveQuestion`. If one does, add an unlocalized getter instead of changing the editor.

- [ ] **Step 1: Write failing tests:**
  - English with `api.context_en = 'EN text'` → `'EN text'`.
  - English with `context_en` null → the Tagalog text.
  - Tagalog with both set → the Tagalog text.
  - A picked jigsaw's `definition_en` is used in English.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement**, and update every `resolveEffectiveCategoryContent` caller. **Step 4: Run** `npm test && npx tsc --noEmit` — PASS.
- [ ] **Step 5: Commit**: `feat(learning): show quiz and jigsaw content in the app's language`

### Task 4: Admin editors — English and Tagalog boxes together

**Files:**
- Modify: `src/features/admin/screens/question-editor-screen.tsx`
- Modify: `src/features/admin/screens/jigsaw-content-screen.tsx`
- Modify: `src/features/admin/context/admin-content-context.tsx` (`setCategoryContext(packId, category, text, lang: 'tl' | 'en')`)
- Modify: `src/shared/i18n/language-context.tsx`

**Interfaces:**
- Consumes: `QuizQuestion.en`, `toUpsertRequest` (Task 2).
- **Question editor:**
  - Every text field (hint, question, each choice, correct answer, accepted answers, answer pool, explanation, mini-lesson) shows two labelled inputs together: English (`contentLangEnglish`) and Tagalog (`contentLangTagalog`). This matches the web admin's jigsaw editor, which has `context_en` and `context_tl` boxes.
  - Type, required answers and the image are single shared fields.
  - Both languages are required. The client-side checks that run on the Tagalog fields also run on the English fields, with the English error message prefixed by `englishVersionPrefix`.
  - An existing question with no English opens with empty English boxes and can't be saved until they are filled.
- **Jigsaw editor:**
  - The mini-lesson gets an English box and a Tagalog box together.
  - Saving requires both and writes `context_en` + `context_tl` in one update.
  - `setCategoryContext(packId, category, { context_en, context_tl })` replaces the single-text form.
- **i18n keys (en / tl):**
  - `contentLangTagalog`: `'Tagalog'` / `'Tagalog'`
  - `contentLangEnglish`: `'English'` / `'Ingles'`
  - `bothLanguagesRequired`: `'Fill in both the English and Tagalog versions.'` / `'Punan ang bersyong Ingles at Tagalog.'`
  - `englishVersionPrefix`: `'English version: '` / `'Bersyong Ingles: '`

- [ ] **Step 1: Implement** both editors and the context change.
- [ ] **Step 2: Run** `npm test && npx tsc --noEmit` — PASS. Run `npx expo lint` on the changed files with no new errors.
- [ ] **Step 3: Commit**: `feat(admin): edit English and Tagalog content side by side`

### Task 5: Web admin question editor — English and Tagalog boxes together

Added during execution. Task 1's follow-up made `en` required on question upserts, and the web admin's question editor (`be/src/web/webapp.ts`) sends its PUT without `en`, so its saves would now be refused.

**Files:**
- Modify: `be/src/web/webapp.ts` (the question editor form and its save, plus the category mini-lesson editor at about lines 831–841)

**Interfaces:**
- Consumes: the upsert `en` shape from Task 1 (per type: `question`, `hint`, `explanation`, `miniLesson`, plus `choices` + `correctAnswer` / `answerPool` / `correctAnswer` + `acceptedAnswers`).
- **Question form:** every text input gets an English input beside its Tagalog one, labelled "English" and "Tagalog", in the same visual style the category editor already uses for `cen` / `ctl`. Saving sends `en`, with blank list rows dropped and the same trimming as the Tagalog fields. Both languages are required: an empty English required field blocks the save with an inline message, `'Fill in both the English and Tagalog versions.'`, before the request is sent. An existing question opens with its `en` values, or with empty English boxes when `en` is null.
- **Category mini-lesson:** `cen` and `ctl` are both required on save, with the same message.
- Keep the page's existing escaping (`esc()`) for every value rendered back into the page.

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Verify.** Run `npm test && npm run typecheck`. Then use a check that renders or serves the web page if one exists (e.g. `tests/app.test.ts`). Otherwise read the generated HTML and JS for syntax errors by loading the page script in Node (`node --check` on an extracted script). Report what you ran.
- [ ] **Step 3: Commit**: `feat(web): edit English and Tagalog question text side by side`
