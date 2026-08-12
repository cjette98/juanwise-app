import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CODE_KEY = 'juanwise_class_code_v1';
const ROSTER_KEY = 'juanwise_class_roster_v1';
const ASSIGNMENT_KEY = 'juanwise_class_assignment_v1';

export interface JoinedStudent {
  name: string;
  grade: string;
  section: string;
  lrn: string;
  email: string;
  username: string;
  joinedAt: number;
}

export type GameType = 'quiz' | 'jigsaw';

export interface Assignment {
  category: string;
  gameType: GameType;
}

type ClassContextType = {
  classCode: string;
  students: JoinedStudent[];
  totalStudents: number;
  generateCode: () => string;
  setCustomCode: (code: string) => { success: boolean; message: string };
  joinClass: (code: string, student: JoinedStudent) => { success: boolean; message: string };
  removeStudent: (username: string) => void;

  // Assign/Lock
  assignment: Assignment | null;
  setAssignment: (category: string, gameType: GameType) => void;
  clearAssignment: () => void;
};

const ClassContext = createContext<ClassContextType | undefined>(undefined);

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // walang I,O,0,1 para di malito

function randomCode(length = 10) {
  let out = '';
  for (let i = 0; i < length; i++) {
    out += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return out;
}

export function ClassProvider({ children }: { children: React.ReactNode }) {
  const [classCode, setClassCode] = useState('');
  const [students, setStudents] = useState<JoinedStudent[]>([]);
  const [assignment, setAssignmentState] = useState<Assignment | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const savedCode = await AsyncStorage.getItem(CODE_KEY);
        if (savedCode) setClassCode(savedCode);

        const savedRoster = await AsyncStorage.getItem(ROSTER_KEY);
        if (savedRoster) setStudents(JSON.parse(savedRoster));

        const savedAssignment = await AsyncStorage.getItem(ASSIGNMENT_KEY);
        if (savedAssignment) setAssignmentState(JSON.parse(savedAssignment));
      } catch (e) {
        console.warn('ClassContext: failed to load', e);
      }
    })();
  }, []);

  const persistCode = (code: string) => {
    setClassCode(code);
    AsyncStorage.setItem(CODE_KEY, code).catch((e) =>
      console.warn('ClassContext: failed to save code', e)
    );
  };

  const persistRoster = (list: JoinedStudent[]) => {
    setStudents(list);
    AsyncStorage.setItem(ROSTER_KEY, JSON.stringify(list)).catch((e) =>
      console.warn('ClassContext: failed to save roster', e)
    );
  };

  const persistAssignment = (next: Assignment | null) => {
    setAssignmentState(next);
    if (next) {
      AsyncStorage.setItem(ASSIGNMENT_KEY, JSON.stringify(next)).catch((e) =>
        console.warn('ClassContext: failed to save assignment', e)
      );
    } else {
      AsyncStorage.removeItem(ASSIGNMENT_KEY).catch((e) =>
        console.warn('ClassContext: failed to clear assignment', e)
      );
    }
  };

  const generateCode = () => {
    const code = randomCode(10);
    persistCode(code);
    return code;
  };

  const setCustomCode: ClassContextType['setCustomCode'] = (code) => {
    const clean = code.trim().toUpperCase();
    if (clean.length !== 10 || !/^[A-Z0-9]{10}$/.test(clean)) {
      return { success: false, message: 'Ang class code ay dapat 10 characters (letters at numbers lang).' };
    }
    persistCode(clean);
    return { success: true, message: 'Na-save ang class code.' };
  };

  const joinClass: ClassContextType['joinClass'] = (code, student) => {
    const clean = code.trim().toUpperCase();
    if (!classCode || clean !== classCode) {
      return { success: false, message: 'Maling class code. Pakisuri at subukan ulit.' };
    }
    const alreadyJoined = students.some((s) => s.username === student.username);
    if (alreadyJoined) {
      return { success: true, message: 'Kasali ka na sa class na ito.' };
    }
    persistRoster([...students, student]);
    return { success: true, message: 'Matagumpay kang sumali sa klase!' };
  };

  const removeStudent = (username: string) => {
    persistRoster(students.filter((s) => s.username !== username));
  };

  const setAssignment = (category: string, gameType: GameType) => {
    persistAssignment({ category, gameType });
  };

  const clearAssignment = () => {
    persistAssignment(null);
  };

  return (
    <ClassContext.Provider
      value={{
        classCode,
        students,
        totalStudents: students.length,
        generateCode,
        setCustomCode,
        joinClass,
        removeStudent,
        assignment,
        setAssignment,
        clearAssignment,
      }}
    >
      {children}
    </ClassContext.Provider>
  );
}

export function useClass() {
  const context = useContext(ClassContext);
  if (!context) throw new Error('useClass must be used within ClassProvider');
  return context;
}