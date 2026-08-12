import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LanguageProvider } from '@/shared/i18n/language-context';
import { UserProvider } from '@/features/auth/context/user-context';
import { StudentResultsProvider } from '@/features/results/context/student-results-context';
import { GameProgressProvider } from '@/features/learning/context/game-progress-context';
import { ClassProvider } from '@/features/teacher/context/class-context';
import { AdminContentProvider } from '@/features/admin/context/admin-content-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <UserProvider>
          <StudentResultsProvider>
            <GameProgressProvider>
              <ClassProvider>
                <AdminContentProvider>
                  <StatusBar style="auto" />
                  {/* Every screen draws its own header/background, exactly as the
                      original native-stack did with headerShown: false. */}
                  <Stack screenOptions={{ headerShown: false }} />
                </AdminContentProvider>
              </ClassProvider>
            </GameProgressProvider>
          </StudentResultsProvider>
        </UserProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}
