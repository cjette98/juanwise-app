import { request, uploadToSignedUrl } from './client';
import { clearSession, setSession } from './session';
import type {
  AnalyticsFilter,
  ApiCategory,
  ApiCategoryKey,
  ApiClass,
  ApiClassMember,
  ApiContentSettings,
  ApiCurrentUser,
  ApiActivityResult,
  ApiAssignment,
  ApiLeaderboard,
  ApiPack,
  ApiProgress,
  ApiProgressTrack,
  ApiQuestion,
  ApiSession,
  ApiStudentProgression,
  ApiStudentSummary,
  ApiUserProfile,
  AssignPackRequest,
  CreateClassRequest,
  CreatePackRequest,
  JoinClassResponse,
  ListResultsQuery,
  LoginRequest,
  MarkActivityRequest,
  Page,
  PatchPackRequest,
  RegisterRequest,
  SubmitResultRequest,
  UpdateCategoryRequest,
  UpdateProfileRequest,
  UploadUrlRequest,
  UploadUrlResponse,
  UpsertQuestionRequest,
} from './types';

/* -------------------------------------------------------------------- auth */

export const authApi = {
  /** Creates the account and signs it in; the session is stored as a side effect. */
  async register(input: RegisterRequest): Promise<ApiSession> {
    const session = await request<ApiSession>('/auth/register', {
      method: 'POST',
      body: input,
      auth: false,
    });
    await setSession(session);
    return session;
  },

  /** Idempotent too — it only exchanges credentials, and it shares the cold start. */
  async login(input: LoginRequest): Promise<ApiSession> {
    const session = await request<ApiSession>('/auth/login', {
      method: 'POST',
      body: input,
      auth: false,
      idempotent: true,
    });
    await setSession(session);
    return session;
  },

  /**
   * Always resolves, whether or not the address is registered.
   *
   * Marked idempotent: this is usually the first call a freshly opened app
   * makes, so it is the one that pays the API's cold start, and asking for the
   * same reset link twice is harmless.
   */
  forgotPassword(email: string): Promise<{ message: string }> {
    return request('/auth/forgot-password', {
      method: 'POST',
      body: { email },
      auth: false,
      idempotent: true,
    });
  },

  me(): Promise<ApiCurrentUser> {
    return request('/auth/me');
  },

  /**
   * Revokes every refresh token server-side, then drops the local session.
   * The local half runs even if the network call fails — signing out must not
   * be blocked by a dead connection.
   */
  async logout(): Promise<void> {
    try {
      await request('/auth/logout', { method: 'POST' });
    } catch {
      // best effort
    } finally {
      await clearSession();
    }
  },
};

/* ------------------------------------------------------------------- users */

export const usersApi = {
  me(): Promise<ApiUserProfile> {
    return request('/users/me');
  },

  updateMe(patch: UpdateProfileRequest): Promise<ApiUserProfile> {
    return request('/users/me', { method: 'PATCH', body: patch });
  },

  /** Teachers may read student profiles; admins may read any. */
  get(uid: string): Promise<ApiUserProfile> {
    return request(`/users/${encodeURIComponent(uid)}`);
  },

  list(query: { role?: string; grade?: string; section?: string; limit?: number; cursor?: string } = {}): Promise<Page<ApiUserProfile>> {
    return request('/users', { query });
  },
};

/* ----------------------------------------------------------------- classes */

export const classesApi = {
  create(input: CreateClassRequest): Promise<ApiClass> {
    return request('/classes', { method: 'POST', body: input });
  },

  /** Teachers get every class they own; students get the one they joined. */
  async mine(): Promise<ApiClass[]> {
    const { items } = await request<{ items: ApiClass[] }>('/classes/mine');
    return items;
  },

  get(id: string): Promise<ApiClass> {
    return request(`/classes/${encodeURIComponent(id)}`);
  },

  updateCode(id: string, code: string): Promise<ApiClass> {
    return request(`/classes/${encodeURIComponent(id)}/code`, { method: 'PATCH', body: { code } });
  },

  /** Resolved against Firestore, so a student can join from any device. */
  join(code: string): Promise<JoinClassResponse> {
    return request('/classes/join', { method: 'POST', body: { code } });
  },

  members(
    id: string,
    query: { includeRemoved?: boolean; limit?: number; cursor?: string } = {},
  ): Promise<Page<ApiClassMember>> {
    return request(`/classes/${encodeURIComponent(id)}/members`, {
      query: {
        limit: query.limit,
        cursor: query.cursor,
        includeRemoved: query.includeRemoved === undefined ? undefined : String(query.includeRemoved),
      },
    });
  },

  /** Pages through the whole roster — classes are small enough to hold in memory. */
  async allMembers(id: string, includeRemoved = false): Promise<ApiClassMember[]> {
    const out: ApiClassMember[] = [];
    let cursor: string | undefined;
    do {
      const page = await classesApi.members(id, { includeRemoved, limit: 100, cursor });
      out.push(...page.items);
      cursor = page.nextCursor ?? undefined;
    } while (cursor);
    return out;
  },

  removeMember(id: string, uid: string): Promise<void> {
    return request(`/classes/${encodeURIComponent(id)}/members/${encodeURIComponent(uid)}`, {
      method: 'DELETE',
    });
  },

  setAssignment(id: string, assignment: ApiAssignment): Promise<ApiClass> {
    return request(`/classes/${encodeURIComponent(id)}/assignment`, {
      method: 'PUT',
      body: assignment,
    });
  },

  clearAssignment(id: string): Promise<ApiClass> {
    return request(`/classes/${encodeURIComponent(id)}/assignment`, { method: 'DELETE' });
  },

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
};

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

/* ----------------------------------------------------------------- content */

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

/* ---------------------------------------------------------------- progress */

export const progressApi = {
  /** Pass `uid` to read a student you teach; omit for your own. `classId` picks which class's progress — omit to fall back to the caller's single active class. */
  get(uid?: string, classId?: string): Promise<ApiProgress> {
    return request('/progress/me', { query: { uid, classId } });
  },

  complete(input: MarkActivityRequest): Promise<ApiProgressTrack> {
    return request('/progress/complete', { method: 'POST', body: input });
  },

  fail(input: MarkActivityRequest): Promise<ApiProgressTrack> {
    return request('/progress/fail', { method: 'POST', body: input });
  },
};

/* ----------------------------------------------------------------- results */

export const resultsApi = {
  /** Submitting also advances progress server-side. */
  submit(input: SubmitResultRequest): Promise<ApiActivityResult> {
    return request('/results', { method: 'POST', body: input });
  },

  list(query: ListResultsQuery = {}): Promise<Page<ApiActivityResult>> {
    return request('/results', {
      query: {
        ...query,
        canonicalOnly: query.canonicalOnly === undefined ? undefined : String(query.canonicalOnly),
      },
    });
  },

  /**
   * Pages through every attempt matching the filter. The results screens all
   * compute their own totals over the full attempt history, so they need the
   * whole set rather than one page.
   */
  async listAll(query: Omit<ListResultsQuery, 'cursor' | 'limit'> = {}): Promise<ApiActivityResult[]> {
    const out: ApiActivityResult[] = [];
    let cursor: string | undefined;
    do {
      const page = await resultsApi.list({ ...query, limit: 100, cursor });
      out.push(...page.items);
      cursor = page.nextCursor ?? undefined;
    } while (cursor);
    return out;
  },

  /** Admin only; requires `uid` or `classId`. */
  deleteMany(query: { uid?: string; classId?: string; category?: ApiCategoryKey }): Promise<{ deleted: number }> {
    return request('/results', { method: 'DELETE', query });
  },
};

/* --------------------------------------------------------------- analytics */

export const analyticsApi = {
  leaderboard(classId: string, filter: AnalyticsFilter = {}, limit = 50): Promise<ApiLeaderboard> {
    return request('/analytics/leaderboard', { query: { classId, ...filter, limit } });
  },

  async progression(classId: string, filter: AnalyticsFilter = {}): Promise<ApiStudentProgression[]> {
    const { items } = await request<{ classId: string; items: ApiStudentProgression[] }>(
      '/analytics/progression',
      { query: { classId, ...filter } },
    );
    return items;
  },

  studentSummary(uid: string, filter: AnalyticsFilter = {}): Promise<ApiStudentSummary> {
    return request(`/analytics/students/${encodeURIComponent(uid)}/summary`, { query: { ...filter } });
  },
};

/* ------------------------------------------------------------------- media */

const CONTENT_TYPE_BY_EXTENSION: Record<string, UploadUrlRequest['contentType']> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

function contentTypeFor(uri: string, mimeType?: string): UploadUrlRequest['contentType'] {
  if (mimeType && mimeType in CONTENT_TYPE_BY_EXTENSION) {
    return CONTENT_TYPE_BY_EXTENSION[mimeType];
  }
  if (mimeType === 'image/jpeg' || mimeType === 'image/png' || mimeType === 'image/webp') {
    return mimeType;
  }
  const extension = uri.split('?')[0].split('.').pop()?.toLowerCase() ?? '';
  return CONTENT_TYPE_BY_EXTENSION[extension] ?? 'image/jpeg';
}

export const mediaApi = {
  createUploadUrl(input: UploadUrlRequest): Promise<UploadUrlResponse> {
    return request('/media/upload-url', { method: 'POST', body: input });
  },

  /**
   * Two-step upload: ask the API for a signed URL, PUT the bytes straight to
   * Cloud Storage, then hand back the public URL to store on the profile or
   * the category.
   */
  async upload(
    fileUri: string,
    purpose: UploadUrlRequest['purpose'],
    options: { categoryKey?: string; mimeType?: string } = {},
  ): Promise<string> {
    const contentType = contentTypeFor(fileUri, options.mimeType);
    const signed = await mediaApi.createUploadUrl({
      purpose,
      contentType,
      categoryKey: options.categoryKey,
    });
    await uploadToSignedUrl(signed.uploadUrl, fileUri, contentType, signed.requiredHeaders);
    return signed.publicUrl;
  },
};
