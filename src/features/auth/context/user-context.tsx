import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  ApiError,
  authApi,
  clearAllCaches,
  clearOutbox,
  hydrateSession,
  mediaApi,
  readCache,
  setSessionRole,
  usersApi,
  writeCache,
  type ApiUserProfile,
} from '@/shared/api';

/**
 * The signed-in user, backed by the API instead of AsyncStorage.
 *
 * Identity now lives in Firebase Auth: the app holds an ID token rather than a
 * plaintext password, `username` is resolved to an email server-side on login,
 * and role comes from a custom claim — which is why `admin` exists here but is
 * not offered on the Register screen (it is granted out-of-band with
 * `npm run grant-admin`).
 */
export type Role = 'student' | 'teacher' | 'admin';

const PROFILE_CACHE_KEY = 'profile';

/**
 * Flat, string-shaped view of `ApiUserProfile` — the shape the screens were
 * already written against. The mapping is one place so the API's nullable
 * columns don't leak `null` into every `<Text>`.
 */
export interface UserProfile {
  uid: string;
  name: string;
  role: Role;
  grade: string;
  section: string;
  avatar: string;
  /** Uploaded profile photo (a Cloud Storage URL), overrides the emoji when set. */
  photoUri: string;
  lrn: string;
  age: string;
  /** The account's email address, whatever the role. */
  email: string;
  username: string;
  teacherId: string;
  /**
   * The staff-facing view of `email`, empty for students. Admins are teacher
   * accounts granted the claim out of band, so they get it too — the screens
   * that show it treat both roles as staff.
   */
  depedGmail: string;
  /** The class the student joined, or null. Teachers own classes instead. */
  classId: string | null;
  registered: boolean;
}

const EMPTY_PROFILE: UserProfile = {
  uid: '',
  name: 'Juan',
  role: 'student',
  grade: '',
  section: '',
  avatar: '🧑',
  photoUri: '',
  lrn: '',
  age: '',
  email: '',
  username: '',
  teacherId: '',
  depedGmail: '',
  classId: null,
  registered: false,
};

function defaultAvatarFor(role: Role) {
  if (role === 'teacher') return '🧑‍🏫';
  if (role === 'admin') return '🛡️';
  return '🧑‍🎓';
}

export function toUserProfile(api: ApiUserProfile): UserProfile {
  const isStaff = api.role === 'teacher' || api.role === 'admin';
  return {
    uid: api.uid,
    name: api.name,
    role: api.role,
    grade: api.grade ?? '',
    section: api.section ?? '',
    avatar: api.avatar || defaultAvatarFor(api.role),
    photoUri: api.photoUrl ?? '',
    lrn: api.lrn ?? '',
    age: api.age == null ? '' : String(api.age),
    email: api.email,
    username: api.username,
    teacherId: api.teacherId ?? '',
    depedGmail: isStaff ? api.email : '',
    classId: api.classId,
    registered: api.registered,
  };
}

/** What the Register screen collects, before it is split by role. */
export interface RegisterInput {
  role: 'student' | 'teacher';
  name: string;
  username: string;
  password: string;
  email: string;
  grade: string;
  section: string;
  avatar: string;
  /** Students only. */
  lrn?: string;
  age?: string;
  /** Teachers only. */
  teacherId?: string;
}

/** Fields a user may change about themselves; the rest are identity. */
export type EditableProfile = Partial<Pick<UserProfile, 'name' | 'avatar' | 'photoUri' | 'age' | 'grade' | 'section'>>;

type UserContextType = UserProfile & {
  /** False until the stored session has been read and the profile fetched once. */
  ready: boolean;
  signedIn: boolean;
  /** Set when the last profile fetch failed and the screen is showing cached data. */
  error: string | null;

  login: (username: string, password: string) => Promise<UserProfile>;
  register: (input: RegisterInput) => Promise<UserProfile>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (fields: EditableProfile) => Promise<void>;
  /** Uploads to Cloud Storage and saves the resulting URL on the profile. */
  uploadPhoto: (fileUri: string, mimeType?: string) => Promise<void>;
  /** Sends a Firebase password-reset email; always resolves. */
  requestPasswordReset: (email?: string) => Promise<void>;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(EMPTY_PROFILE);
  const [signedIn, setSignedIn] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => () => { mounted.current = false; }, []);

  const apply = useCallback((api: ApiUserProfile) => {
    const next = toUserProfile(api);
    setProfile(next);
    setSignedIn(true);
    setError(null);
    writeCache(PROFILE_CACHE_KEY, api);
    // `/auth/me` is the authority on the role claim; keep the token store in step
    // so `admin` survives a restart without a round trip.
    void setSessionRole(api.role);
    return next;
  }, []);

  const loadProfile = useCallback(async () => {
    try {
      apply(await usersApi.me());
    } catch (err) {
      if (err instanceof ApiError && err.isAuthFailure) {
        setProfile(EMPTY_PROFILE);
        setSignedIn(false);
        setError(null);
        return;
      }
      // Offline or a server hiccup — keep whatever is on screen and say so.
      setError(err instanceof Error ? err.message : 'Could not refresh your profile.');
    }
  }, [apply]);

  // On launch: show the cached profile immediately, then reconcile with the API.
  useEffect(() => {
    (async () => {
      const session = await hydrateSession();
      if (!session) {
        setReady(true);
        return;
      }

      const cached = await readCache<ApiUserProfile>(PROFILE_CACHE_KEY);
      if (cached && mounted.current) {
        setProfile(toUserProfile(cached));
        setSignedIn(true);
      }

      await loadProfile();
      if (mounted.current) setReady(true);
    })();
  }, [loadProfile]);

  const login: UserContextType['login'] = useCallback(
    async (username, password) => {
      const session = await authApi.login({ username: username.trim(), password });
      return apply(session.user);
    },
    [apply],
  );

  const register: UserContextType['register'] = useCallback(
    async (input) => {
      const common = {
        name: input.name.trim(),
        username: input.username.trim(),
        password: input.password,
        email: input.email.trim().toLowerCase(),
        avatar: input.avatar,
        section: input.section.trim() || undefined,
      };

      const session = await authApi.register(
        input.role === 'student'
          ? {
              ...common,
              role: 'student',
              lrn: (input.lrn ?? '').trim(),
              grade: input.grade.trim(),
              age: input.age && input.age.trim() ? Number(input.age) : undefined,
            }
          : {
              ...common,
              role: 'teacher',
              teacherId: (input.teacherId ?? '').trim(),
              grade: input.grade.trim() || undefined,
            },
      );

      return apply(session.user);
    },
    [apply],
  );

  const logout: UserContextType['logout'] = useCallback(async () => {
    await authApi.logout();
    await Promise.all([clearAllCaches(), clearOutbox()]);
    if (!mounted.current) return;
    setProfile(EMPTY_PROFILE);
    setSignedIn(false);
    setError(null);
  }, []);

  const updateProfile: UserContextType['updateProfile'] = useCallback(
    async (fields) => {
      const patch: Parameters<typeof usersApi.updateMe>[0] = {};
      if (fields.name !== undefined) patch.name = fields.name.trim();
      if (fields.avatar !== undefined) patch.avatar = fields.avatar || null;
      if (fields.photoUri !== undefined) patch.photoUrl = fields.photoUri || null;
      if (fields.grade !== undefined) patch.grade = fields.grade.trim() || null;
      if (fields.section !== undefined) patch.section = fields.section.trim() || null;
      if (fields.age !== undefined) {
        const parsed = Number(fields.age);
        patch.age = fields.age.trim() && Number.isFinite(parsed) ? parsed : null;
      }

      if (Object.keys(patch).length === 0) return;
      apply(await usersApi.updateMe(patch));
    },
    [apply],
  );

  const uploadPhoto: UserContextType['uploadPhoto'] = useCallback(
    async (fileUri, mimeType) => {
      const publicUrl = await mediaApi.upload(fileUri, 'profile-photo', { mimeType });
      apply(await usersApi.updateMe({ photoUrl: publicUrl }));
    },
    [apply],
  );

  const requestPasswordReset: UserContextType['requestPasswordReset'] = useCallback(
    async (email) => {
      const target = (email ?? profile.email).trim();
      if (!target) throw new Error('No email address on file for this account.');
      await authApi.forgotPassword(target);
    },
    [profile.email],
  );

  const value = useMemo<UserContextType>(
    () => ({
      ...profile,
      ready,
      signedIn,
      error,
      login,
      register,
      logout,
      refreshProfile: loadProfile,
      updateProfile,
      uploadPhoto,
      requestPasswordReset,
    }),
    [profile, ready, signedIn, error, login, register, logout, loadProfile, updateProfile, uploadPhoto, requestPasswordReset],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser must be used within UserProvider');
  return context;
}
