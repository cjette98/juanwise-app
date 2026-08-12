import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Role = 'student' | 'teacher';

const PROFILE_KEY = 'juanwise_user_profile_v1';

export interface UserProfile {
  name: string;
  role: Role;
  grade: string;
  section: string;
  avatar: string; // emoji shown on the dashboard/profile avatar
  photoUri: string; // uploaded profile photo URI (overrides avatar emoji when set)
  lrn: string;
  age: string;
  email: string;
  username: string;
  password: string;
  teacherId: string;
  depedGmail: string;
  /** True once the person has completed Register — used so a later Login
   *  doesn't overwrite their real registered name with the typed username. */
  registered: boolean;
}

const DEFAULT_PROFILE: UserProfile = {
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
  password: '',
  teacherId: '',
  depedGmail: '',
  registered: false,
};

type UserContextType = UserProfile & {
  /** Sets name/role — called on login (matches existing call sites). */
  setUser: (name: string, role: Role) => void;
  /** Updates any subset of profile fields — used by the Profile screen. */
  updateProfile: (fields: Partial<Omit<UserProfile, 'role'>>) => void;
  /** Saves everything collected on the Register screen, marking the
   *  profile as "registered" so Login won't overwrite the real name. */
  registerUser: (fields: Partial<UserProfile> & { role: Role }) => void;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(PROFILE_KEY);
        if (raw) setProfile({ ...DEFAULT_PROFILE, ...JSON.parse(raw) });
      } catch (e) {
        console.warn('UserContext: failed to load profile', e);
      }
    })();
  }, []);

  const persist = (next: UserProfile) => {
    setProfile(next);
    AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(next)).catch((e) =>
      console.warn('UserContext: failed to save profile', e)
    );
  };

  const setUser = (newName: string, newRole: Role) => {
    persist({
      ...profile,
      name: newName || (newRole === 'teacher' ? 'Guro' : 'Juan'),
      role: newRole,
    });
  };

  const updateProfile: UserContextType['updateProfile'] = (fields) => {
    persist({ ...profile, ...fields });
  };

  const registerUser: UserContextType['registerUser'] = (fields) => {
    persist({ ...DEFAULT_PROFILE, ...fields, registered: true });
  };

  return (
    <UserContext.Provider value={{ ...profile, setUser, updateProfile, registerUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser must be used within UserProvider');
  return context;
}