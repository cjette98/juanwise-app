/**
 * Wire types for the JuanWise API.
 *
 * These mirror the per-module zod schemas under juanwise-be `src/modules` — the
 * same schemas that validate every request and generate the Swagger page at
 * `/api/docs`. Keep them in step: a field that drifts here shows up as a
 * runtime `undefined` rather than a compile error.
 */

export type ApiRole = 'student' | 'teacher' | 'admin';
export type ApiCategoryKey = 'history' | 'culture' | 'geography' | 'festival' | 'national' | 'heroes';
export type ApiActivityType = 'quiz' | 'jigsaw';
/** The API has no `null` medal — a failed attempt comes back as `'none'`. */
export type ApiMedal = 'gold' | 'silver' | 'bronze' | 'none';
export type ApiTrophy = 'gold' | 'silver' | 'bronze' | 'none';
export type ApiPace = 'fast' | 'average' | 'slow' | 'none';
/** The API stores only these two; the app's local `identification` has no server form. */
export type ApiQuestionType = 'multiple-choice' | 'enumeration' | 'identification';

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

/* ------------------------------------------------------------------- users */

export interface ApiUserProfile {
  uid: string;
  role: ApiRole;
  name: string;
  username: string;
  email: string;
  avatar: string | null;
  photoUrl: string | null;
  age: number | null;
  grade: string | null;
  section: string | null;
  lrn: string | null;
  teacherId: string | null;
  classId: string | null;
  registered: boolean;
  disabled: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ApiCurrentUser extends ApiUserProfile {
  claims: Record<string, unknown>;
  emailVerified: boolean;
}

export interface UpdateProfileRequest {
  name?: string;
  avatar?: string | null;
  photoUrl?: string | null;
  age?: number | null;
  grade?: string | null;
  section?: string | null;
}

/* -------------------------------------------------------------------- auth */

export interface ApiSession {
  idToken: string;
  refreshToken: string;
  /** Lifetime of the ID token in seconds, as a string. */
  expiresIn: string;
  user: ApiUserProfile;
}

export interface ApiTokenPair {
  idToken: string;
  refreshToken: string;
  expiresIn: string;
}

interface RegisterCommon {
  name: string;
  username: string;
  password: string;
  email: string;
  avatar?: string;
  age?: number;
  section?: string;
}

export interface StudentRegisterRequest extends RegisterCommon {
  role: 'student';
  /** Exactly 12 digits. */
  lrn: string;
  /** Digits only, e.g. `"6"`. */
  grade: string;
}

export interface TeacherRegisterRequest extends RegisterCommon {
  role: 'teacher';
  /** Exactly 7 digits. */
  teacherId: string;
  grade?: string;
}

export type RegisterRequest = StudentRegisterRequest | TeacherRegisterRequest;

export interface LoginRequest {
  username: string;
  password: string;
}

/* ----------------------------------------------------------------- classes */

export interface ApiAssignment {
  category: ApiCategoryKey;
  gameType: ApiActivityType;
}

export interface ApiClass {
  id: string;
  code: string;
  name: string;
  teacherId: string;
  gradeLevel: string | null;
  section: string | null;
  assignment: ApiAssignment | null;
  memberCount: number;
  archived: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ApiClassMember {
  uid: string;
  name: string;
  username: string;
  email: string;
  grade: string | null;
  section: string | null;
  lrn: string | null;
  status: 'active' | 'removed';
  joinedAt: string | null;
}

export interface CreateClassRequest {
  name: string;
  gradeLevel?: string;
  section?: string;
  /** Omit to have the server allocate a unique 10-character code. */
  code?: string;
}

export interface JoinClassResponse {
  message: string;
  class: ApiClass;
}

/* ----------------------------------------------------------------- content */

/**
 * One picture available to a category's jigsaw activities. Which activity plays
 * it is decided by `ApiCategory.jigsawSlots`, not by its position here.
 */
export interface ApiJigsawItem {
  id: string;
  title: string;
  imageUrl: string;
  definition_en: string | null;
  definition_tl: string | null;
  context_en: string | null;
  context_tl: string | null;
}

/** The three cuts the puzzle screen can lay out: 2×3, 3×3 and 3×4. */
export type ApiJigsawPieceCount = 6 | 9 | 12;

export interface ApiCategory {
  key: ApiCategoryKey;
  label: string;
  color: string | null;
  imageUrl: string | null;
  context_en: string | null;
  context_tl: string | null;
  /** One-line summary of the picture, shown when the puzzle is completed. */
  definition_en: string | null;
  definition_tl: string | null;
  /** Pictures available to this category's jigsaw activities. */
  jigsaws: ApiJigsawItem[];
  /**
   * Which picture each activity plays, keyed `"{level}_{activityNum}"`. An
   * activity with no entry falls back to `imageUrl` above.
   */
  jigsawSlots: Record<string, string>;
  /**
   * How many pieces each activity is cut into, keyed the same way. An activity
   * with no entry follows the difficulty ramp in `getJigsawPieceCount` — the
   * admin has not chosen for it, which is not the same as choosing 6.
   */
  jigsawPieces: Record<string, ApiJigsawPieceCount>;
  updatedBy: string | null;
  updatedAt: string | null;
}

export interface UpdateCategoryRequest {
  label?: string;
  color?: string | null;
  imageUrl?: string | null;
  context_en?: string | null;
  context_tl?: string | null;
  definition_en?: string | null;
  definition_tl?: string | null;
}

export interface ApiQuestion {
  /** `{category}_{level}_{activityNum}` */
  id: string;
  category: ApiCategoryKey;
  level: number;
  activityNum: number;
  type: ApiQuestionType;
  question: string;
  hint: string | null;
  explanation: string | null;
  choices: string[] | null;
  /** multiple-choice and identification — the single primary answer. */
  correctAnswer: string | null;
  answerPool: string[] | null;
  requiredAnswers: number | null;
  /**
   * identification only — extra spellings graded as correct alongside
   * `correctAnswer`. Null on any document written before identification
   * existed, which reads as "no alternatives".
   */
  acceptedAnswers: string[] | null;
  /** `false` when this is the seeded default rather than an admin edit. */
  isOverride: boolean;
  updatedBy: string | null;
  updatedAt: string | null;
}

export type UpsertQuestionRequest =
  | {
      type: 'multiple-choice';
      question: string;
      hint?: string | null;
      explanation?: string | null;
      choices: string[];
      correctAnswer: string;
    }
  | {
      type: 'enumeration';
      question: string;
      hint?: string | null;
      explanation?: string | null;
      /** At least 10 entries — enforced server-side. */
      answerPool: string[];
      requiredAnswers: number;
    }
  | {
      type: 'identification';
      question: string;
      hint?: string | null;
      explanation?: string | null;
      /** The primary answer. Required. */
      correctAnswer: string;
      /**
       * Alternatives only, never the primary answer again. At most 20, each at
       * most 200 characters, all distinct from one another and from
       * `correctAnswer` after trim/collapse/lowercase — enforced server-side.
       */
      acceptedAnswers?: string[];
    };

export interface ApiContentSettings {
  showMiniLesson: boolean;
  updatedBy: string | null;
  updatedAt: string | null;
}

/* ---------------------------------------------------------------- progress */

export interface ApiProgressTrack {
  /** `{category}_{activityType}` */
  id: string;
  category: ApiCategoryKey;
  activityType: ApiActivityType;
  unlockedLevel: number;
  /** `{level}_{activityNum}` entries. */
  completedActivities: string[];
  failedActivities: string[];
  updatedAt: string | null;
}

export interface ApiProgress {
  uid: string;
  tracks: ApiProgressTrack[];
}

export interface MarkActivityRequest {
  category: ApiCategoryKey;
  activityType: ApiActivityType;
  level: number;
  activityNum: number;
}

/* ----------------------------------------------------------------- results */

export interface ApiActivityResult {
  id: string;
  uid: string;
  studentName: string;
  classId: string | null;
  category: ApiCategoryKey;
  activityType: ApiActivityType;
  level: number;
  activityNum: number;
  medal: ApiMedal;
  points: number;
  timeUsed: number;
  timedOut: boolean;
  correctCount: number;
  requiredCount: number;
  attemptSeq: number;
  createdAt: string;
}

/**
 * `points` and `medal` are deliberately absent — the server derives them from
 * what the client observed so a modified payload cannot mint points.
 */
export interface SubmitResultRequest {
  category: ApiCategoryKey;
  activityType: ApiActivityType;
  level: number;
  activityNum: number;
  correctCount: number;
  requiredCount: number;
  timeUsed: number;
  timedOut?: boolean;
}

export interface ListResultsQuery {
  uid?: string;
  classId?: string;
  category?: ApiCategoryKey;
  activityType?: ApiActivityType;
  level?: number;
  /** Collapse retries to the attempt that counts. */
  canonicalOnly?: boolean;
  limit?: number;
  cursor?: string;
}

/* --------------------------------------------------------------- analytics */

export interface ApiStudentSummary {
  uid: string;
  studentName: string;
  totalPoints: number;
  totalTimeSec: number;
  activitiesCompleted: number;
  goldMedals: number;
  silverMedals: number;
  bronzeMedals: number;
  trophy: ApiTrophy;
  pace: ApiPace;
  completionPct: number;
}

export interface ApiLeaderboard {
  classId: string;
  items: (ApiStudentSummary & { rank: number })[];
  maxPoints: number;
  maxTimeSec: number;
}

export interface ApiStudentProgression {
  uid: string;
  studentName: string;
  activitiesCompleted: number;
  totalActivities: number;
  levelsCompleted: number;
  currentLevel: number;
  totalPoints: number;
  totalTimeSec: number;
  percent: number;
  trophy: ApiTrophy;
  pace: ApiPace;
}

export interface AnalyticsFilter {
  category?: ApiCategoryKey;
  activityType?: ApiActivityType;
  level?: number;
}

/* ------------------------------------------------------------------- media */

export interface UploadUrlRequest {
  purpose: 'profile-photo' | 'category-image';
  contentType: 'image/jpeg' | 'image/png' | 'image/webp';
  categoryKey?: string;
}

export interface UploadUrlResponse {
  uploadUrl: string;
  publicUrl: string;
  objectPath: string;
  expiresAt: string;
  /**
   * Must be sent on the PUT — they were signed, so omitting one invalidates the
   * signature. Carries `x-goog-acl`, which is what makes `publicUrl` readable.
   */
  requiredHeaders: Record<string, string>;
}
