import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, Baloo2_700Bold, Baloo2_800ExtraBold } from '@expo-google-fonts/baloo-2';
import { Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold } from '@expo-google-fonts/nunito';

import { LanguageProvider } from '@/shared/i18n/language-context';
import { UserProvider } from '@/features/auth/context/user-context';
import { StudentResultsProvider } from '@/features/results/context/student-results-context';
import { GameProgressProvider } from '@/features/learning/context/game-progress-context';
import { ClassProvider } from '@/features/teacher/context/class-context';
import { AdminContentProvider } from '@/features/admin/context/admin-content-context';
import { ClassContentProvider } from '@/features/learning/context/class-content-context';

// Hold the native splash until the fonts are registered, so no screen ever
// paints a frame in the system font and then reflows into Baloo/Nunito.
void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Baloo2_700Bold,
    Baloo2_800ExtraBold,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });

  useEffect(() => {
    // A font that fails to load must not leave the splash up forever — the app
    // is perfectly usable in the fallback face.
    if (fontsLoaded || fontError) void SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <LanguageProvider>
        {/* Order matters now that these read from the API: UserProvider owns the
            session every other request needs, ClassProvider resolves the classId
            the teacher's results are scoped by, and StudentResultsProvider reads
            both. */}
        <UserProvider>
          <ClassProvider>
            <StudentResultsProvider>
              <GameProgressProvider>
                <AdminContentProvider>
                  <ClassContentProvider>
                    <StatusBar style="auto" />
                    {/* Every screen draws its own header/background, exactly as the
                        original native-stack did with headerShown: false. */}
                    <Stack screenOptions={{ headerShown: false }} />
                  </ClassContentProvider>
                </AdminContentProvider>
              </GameProgressProvider>
            </StudentResultsProvider>
          </ClassProvider>
        </UserProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}
