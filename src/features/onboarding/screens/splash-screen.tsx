import React, { useEffect, useRef } from 'react';
import { View, Image, StyleSheet, Animated, Text } from 'react-native';
import { images } from '@/shared/assets/images';
import { useRouter } from 'expo-router';

export default function SplashScreen() {
  const router = useRouter();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 2500,
      useNativeDriver: false,
    }).start();

    const timer = setTimeout(() => {
      router.replace('/welcome');
    }, 2700);

    return () => clearTimeout(timer);
  }, []);

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