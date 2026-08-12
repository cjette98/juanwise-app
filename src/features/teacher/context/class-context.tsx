import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  ApiError,
  classesApi,
  errorMessage,
  readCache,
  writeCache,
  type ApiCategoryKey,
  type ApiClass,
  type ApiClassMember,
} from '@/shared/api';
import { useUser } from '@/features/auth/context/user-context';

/**
 * The class, its roster and its current assignment — all server-side now.
 *
 * This is what fixes the cross-device join: `joinClass` resolves the code
 * against Firestore rather than against whatever code happens to be in the
 * student's own storage, so a student on one phone can join a class created on
 * the teacher's phone.
 */
export type GameType = 'quiz' | 'jigsaw';

export interface Assignment {
  category: string;
  gameType: GameType;
}

/** Roster row, kept in the shape the Class Overview screen already renders. */
export interface JoinedStudent {
  uid: string;
  name: string;
  grade: string;
  section: string;
  lrn: string;
  email: string;
  username: string;
  joinedAt: number;
}

export interface ActionResult {
  success: boolean;
  message: string;
}

const CLASS_CACHE_KEY = 'class';
const ROSTER_CACHE_KEY = 'class-roster';

function toJoinedStudent(member: ApiClassMember): JoinedStudent {
  return {
    uid: member.uid,
    name: member.name,
    grade: member.grade ?? '',
    section: member.section ?? '',
    lrn: member.lrn ?? '',
    email: member.email,
    username: member.username,
    joinedAt: member.joinedAt ? Date.parse(member.joinedAt) : 0,
  };
}

type ClassContextType = {
  ready: boolean;
  /** The teacher's own class, or the class the student joined. */
  currentClass: ApiClass | null;
  classId: string | null;
  classCode: string;
  students: JoinedStudent[];
  totalStudents: number;
  error: string | null;

  refresh: () => Promise<void>;
  /** Creates the class on first use, then rotates its code. */
  generateCode: () => Promise<ActionResult & { code?: string }>;
  setCustomCode: (code: string) => Promise<ActionResult>;
  joinClass: (code: string) => Promise<ActionResult>;
  removeStudent: (uid: string) => Promise<ActionResult>;

  assignment: Assignment | null;
  setAssignment: (category: string, gameType: GameType) => Promise<ActionResult>;
  clearAssignment: () => Promise<ActionResult>;
};

const ClassContext = createContext<ClassContextType | undefined>(undefined);

export function ClassProvider({ children }: { children: React.ReactNode }) {
  const { signedIn, ready: userReady, role, name, grade, section, refreshProfile } = useUser();

  const [currentClass, setCurrentClass] = useState<ApiClass | null>(null);
  const [students, setStudents] = useState<JoinedStudent[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => () => { mounted.current = false; }, []);

  const isTeacher = role === 'teacher' || role === 'admin';

  const loadRoster = useCallback(async (klass: ApiClass | null) => {
    // Only the owning teacher may list members; a student sees the class but
    // not the roster (`GET /classes/:id/members` is teacher-only).
    if (!klass || !isTeacher) {
      setStudents([]);
      return;
    }
    const members = await classesApi.allMembers(klass.id);
    const rows = members.filter((m) => m.status === 'active').map(toJoinedStudent);
    if (!mounted.current) return;
    setStudents(rows);
    writeCache(ROSTER_CACHE_KEY, rows);
  }, [isTeacher]);

  const refresh = useCallback(async () => {
    if (!signedIn) {
      setCurrentClass(null);
      setStudents([]);
      return;
    }
    try {
      const classes = await classesApi.mine();
      const klass = classes.find((c) => !c.archived) ?? classes[0] ?? null;
      if (!mounted.current) return;

      setCurrentClass(klass);
      writeCache(CLASS_CACHE_KEY, klass);
      setError(null);
      await loadRoster(klass);
    } catch (err) {
      if (!mounted.current) return;
      setError(errorMessage(err, 'Could not load your class.'));
    }
  }, [signedIn, loadRoster]);

  useEffect(() => {
    if (!userReady) return;

    (async () => {
      if (!signedIn) {
        setCurrentClass(null);
        setStudents([]);
        setReady(true);
        return;
      }

      const [cachedClass, cachedRoster] = await Promise.all([
        readCache<ApiClass | null>(CLASS_CACHE_KEY),
        readCache<JoinedStudent[]>(ROSTER_CACHE_KEY),
      ]);
      if (mounted.current) {
        if (cachedClass) setCurrentClass(cachedClass);
        if (cachedRoster) setStudents(cachedRoster);
      }

      await refresh();
      if (mounted.current) setReady(true);
    })();
  }, [userReady, signedIn, refresh]);

  /** Teachers get exactly one class here; create it lazily on first code action. */
  const ensureClass = useCallback(async (): Promise<ApiClass> => {
    if (currentClass) return currentClass;
    const created = await classesApi.create({
      name: `${name}'s Class`.trim(),
      gradeLevel: grade || undefined,
      section: section || undefined,
    });
    if (mounted.current) {
      setCurrentClass(created);
      writeCache(CLASS_CACHE_KEY, created);
    }
    return created;
  }, [currentClass, name, grade, section]);

  const generateCode: ClassContextType['generateCode'] = useCallback(async () => {
    try {
      const existing = currentClass;
      if (!existing) {
        // A brand-new class already comes back with a server-generated code.
        const created = await ensureClass();
        return { success: true, message: 'Na-generate ang class code.', code: created.code };
      }
      // Rotating means asking the server for another unique code; it only
      // allocates one on create, so make a fresh code and claim it.
      const code = randomCode();
      const updated = await classesApi.updateCode(existing.id, code);
      if (mounted.current) {
        setCurrentClass(updated);
        writeCache(CLASS_CACHE_KEY, updated);
      }
      return { success: true, message: 'Na-generate ang class code.', code: updated.code };
    } catch (err) {
      return { success: false, message: errorMessage(err, 'Hindi na-generate ang class code.') };
    }
  }, [currentClass, ensureClass]);

  const setCustomCode: ClassContextType['setCustomCode'] = useCallback(
    async (code) => {
      const clean = code.trim().toUpperCase();
      if (!/^[A-Z0-9]{10}$/.test(clean)) {
        return {
          success: false,
          message: 'Ang class code ay dapat 10 characters (letters at numbers lang).',
        };
      }
      try {
        const existing = currentClass ?? (await ensureClass());
        const updated = await classesApi.updateCode(existing.id, clean);
        if (mounted.current) {
          setCurrentClass(updated);
          writeCache(CLASS_CACHE_KEY, updated);
        }
        return { success: true, message: 'Na-save ang class code.' };
      } catch (err) {
        return { success: false, message: errorMessage(err, 'Hindi na-save ang class code.') };
      }
    },
    [currentClass, ensureClass],
  );

  const joinClass: ClassContextType['joinClass'] = useCallback(
    async (code) => {
      const clean = code.trim().toUpperCase();
      if (!/^[A-Z0-9]{10}$/.test(clean)) {
        return { success: false, message: 'Maling class code. Pakisuri at subukan ulit.' };
      }
      try {
        const { message, class: joined } = await classesApi.join(clean);
        if (mounted.current) {
          setCurrentClass(joined);
          writeCache(CLASS_CACHE_KEY, joined);
        }
        // The student's `classId` changed, and results are stamped with it.
        await refreshProfile();
        return { success: true, message };
      } catch (err) {
        if (err instanceof ApiError && err.code === 'CONFLICT') {
          return { success: true, message: err.message };
        }
        return { success: false, message: errorMessage(err, 'Hindi nakasali sa klase.') };
      }
    },
    [refreshProfile],
  );

  const removeStudent: ClassContextType['removeStudent'] = useCallback(
    async (uid) => {
      if (!currentClass) return { success: false, message: 'Wala pang klase.' };
      try {
        await classesApi.removeMember(currentClass.id, uid);
        if (mounted.current) {
          setStudents((prev) => {
            const next = prev.filter((s) => s.uid !== uid);
            writeCache(ROSTER_CACHE_KEY, next);
            return next;
          });
        }
        return { success: true, message: 'Naalis ang mag-aaral sa roster.' };
      } catch (err) {
        return { success: false, message: errorMessage(err, 'Hindi naalis ang mag-aaral.') };
      }
    },
    [currentClass],
  );

  const setAssignment: ClassContextType['setAssignment'] = useCallback(
    async (category, gameType) => {
      try {
        const existing = currentClass ?? (await ensureClass());
        const updated = await classesApi.setAssignment(existing.id, {
          category: category as ApiCategoryKey,
          gameType,
        });
        if (mounted.current) {
          setCurrentClass(updated);
          writeCache(CLASS_CACHE_KEY, updated);
        }
        return { success: true, message: 'Na-assign ang activity sa klase.' };
      } catch (err) {
        return { success: false, message: errorMessage(err, 'Hindi na-assign ang activity.') };
      }
    },
    [currentClass, ensureClass],
  );

  const clearAssignment: ClassContextType['clearAssignment'] = useCallback(async () => {
    if (!currentClass) return { success: true, message: 'Walang naka-assign.' };
    try {
      const updated = await classesApi.clearAssignment(currentClass.id);
      if (mounted.current) {
        setCurrentClass(updated);
        writeCache(CLASS_CACHE_KEY, updated);
      }
      return { success: true, message: 'Na-clear ang assignment.' };
    } catch (err) {
      return { success: false, message: errorMessage(err, 'Hindi na-clear ang assignment.') };
    }
  }, [currentClass]);

  const value = useMemo<ClassContextType>(
    () => ({
      ready,
      currentClass,
      classId: currentClass?.id ?? null,
      classCode: currentClass?.code ?? '',
      students,
      totalStudents: currentClass?.memberCount ?? students.length,
      error,
      refresh,
      generateCode,
      setCustomCode,
      joinClass,
      removeStudent,
      assignment: currentClass?.assignment ?? null,
      setAssignment,
      clearAssignment,
    }),
    [ready, currentClass, students, error, refresh, generateCode, setCustomCode, joinClass, removeStudent, setAssignment, clearAssignment],
  );

  return <ClassContext.Provider value={value}>{children}</ClassContext.Provider>;
}

/** Same alphabet the API uses — no I, O, 0 or 1, so a code read aloud is unambiguous. */
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomCode(length = 10) {
  let out = '';
  for (let i = 0; i < length; i++) out += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return out;
}

export function useClass() {
  const context = useContext(ClassContext);
  if (!context) throw new Error('useClass must be used within ClassProvider');
  return context;
}
