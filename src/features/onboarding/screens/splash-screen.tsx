import React, { useEffect, useRef } from 'react';
import { View, Image, StyleSheet, Animated, Text } from 'react-native';
import { images } from '@/shared/assets/images';
import { useUser } from '@/features/auth/context/user-context';
import { useRouter } from 'expo-router';

export default function SplashScreen() {
  const router = useRouter();
  const { ready, signedIn, role } = useUser();
  const progress = useRef(new Animated.Value(0)).current;
  const navigated = useRef(false);

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 2500,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  // The API session is restored from storage on launch, so a signed-in user
  // goes straight back to their dashboard rather than through Welcome → Login.
  // The splash still holds for its full animation before deciding.
  useEffect(() => {
    if (!ready || navigated.current) return;

    const timer = setTimeout(() => {
      navigated.current = true;
      if (!signedIn) {
        router.replace('/welcome');
      } else {
        router.replace(role === 'student' ? '/student-home' : '/teacher-dashboard');
      }
    }, 2700);

    return () => clearTimeout(timer);
  }, [ready, signedIn, role, router]);

  const barWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <Image
        source={images.splash}
        style={styles.image}
        resizeMode="cover"
      />

      <View style={styles.loadingArea}>
        <Text style={styles.loadingText}>★ Loading... ★</Text>
        <View style={styles.barBackground}>
          <Animated.View style={[styles.barFill, { width: barWidth }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  image: { width: '100%', height: '100%', position: 'absolute' },
  loadingArea: {
    position: 'absolute',
    bottom: 80,
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    color: '#FCD116',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  barBackground: {
    width: '85%',
    height: 20,
    borderRadius: 12,
    backgroundColor: '#1A1A2E',
    borderWidth: 2,
    borderColor: '#FCD116',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#FCD116',
    borderRadius: 10,
  },
});