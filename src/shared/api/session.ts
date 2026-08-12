import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ApiRole, ApiSession, ApiTokenPair } from './types';

/**
 * The signed-in session: the Firebase ID token every request carries, and the
 * refresh token used to mint a new one when it expires (~1 hour).
 *
 * This replaces the plaintext `password` the old UserContext kept in
 * AsyncStorage — the app never sees or stores a password again.
 */
export interface StoredSession {
  idToken: string;
  refreshToken: string;
  /** Epoch ms. */
  expiresAt: number;
  uid: string;
  role: ApiRole;
}

const SESSION_KEY = 'juanwise_session_v2';

/**
 * Kept in memory as well as on disk so the request path can read the token
 * synchronously — an await per request would serialise every call behind
 * AsyncStorage.
 */
let current: StoredSession | null = null;
let hydrated = false;
let hydrating: Promise<void> | null = null;

type Listener = (session: StoredSession | null) => void;
const listeners = new Set<Listener>();

function emit() {
  for (const listener of listeners) listener(current);
}

/** Fires whenever the session is set, refreshed or cleared. */
export function onSessionChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Reads the session back off disk. Safe to call repeatedly; only runs once. */
export async function hydrateSession(): Promise<StoredSession | null> {
  if (hydrated) return current;
  if (!hydrating) {
    hydrating = (async () => {
      try {
        const raw = await AsyncStorage.getItem(SESSION_KEY);
        if (raw) current = JSON.parse(raw) as StoredSession;
      } catch (e) {
        console.warn('session: failed to load', e);
      } finally {
        hydrated = true;
      }
    })();
  }
  await hydrating;
  return current;
}

export function getSession(): StoredSession | null {
  return current;
}

export function isSignedIn(): boolean {
  return current !== null;
}

async function persist(next: StoredSession | null) {
  current = next;
  try {
    if (next) await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(next));
    else await AsyncStorage.removeItem(SESSION_KEY);
  } catch (e) {
    console.warn('session: failed to save', e);
  }
  emit();
}

function expiryFrom(expiresIn: string): number {
  const seconds = Number(expiresIn);
  // Firebase returns 3600; fall back to that rather than expiring immediately.
  return Date.now() + (Number.isFinite(seconds) && seconds > 0 ? seconds : 3600) * 1000;
}

/** Called after register/login with the full session payload. */
export async function setSession(session: ApiSession): Promise<StoredSession> {
  const stored: StoredSession = {
    idToken: session.idToken,
    refreshToken: session.refreshToken,
    expiresAt: expiryFrom(session.expiresIn),
    uid: session.user.uid,
    role: session.user.role,
  };
  await persist(stored);
  return stored;
}

/** Called after `POST /auth/refresh`, which returns tokens but no profile. */
export async function setTokens(tokens: ApiTokenPair): Promise<StoredSession | null> {
  if (!current) return null;
  const stored: StoredSession = {
    ...current,
    idToken: tokens.idToken,
    refreshToken: tokens.refreshToken,
    expiresAt: expiryFrom(tokens.expiresIn),
  };
  await persist(stored);
  return stored;
}

/** Keeps the stored role in step when `/auth/me` reports a claim change. */
export async function setSessionRole(role: ApiRole): Promise<void> {
  if (!current || current.role === role) return;
  await persist({ ...current, role });
}

export async function clearSession(): Promise<void> {
  await persist(null);
}
