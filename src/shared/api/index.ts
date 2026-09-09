/**
 * Single entry point for the JuanWise API.
 *
 * Screens and contexts import from `@/shared/api`; nothing else should reach
 * into the individual modules. The backend is documented at
 * `${API_ORIGIN}/api/docs`.
 */
export { API_BASE_URL, API_ORIGIN } from './config';
export { ApiError, checkHealth, errorMessage, fieldErrors } from './client';
export {
  analyticsApi,
  authApi,
  classesApi,
  contentApi,
  mediaApi,
  packsApi,
  progressApi,
  resultsApi,
  usersApi,
} from './endpoints';
export {
  clearSession,
  getSession,
  hydrateSession,
  isSignedIn,
  onSessionChange,
  setSessionRole,
  type StoredSession,
} from './session';
export { clearAllCaches, clearCache, readCache, writeCache } from './cache';
export { clearOutbox, enqueueResult, flushOutbox, pendingCount } from './outbox';
export * from './types';
