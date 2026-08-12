import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Last-known-good copies of server state, so a classroom with patchy wifi still
 * renders something on launch instead of an empty screen. Every cached value is
 * replaced the moment the real fetch lands; nothing here is a source of truth.
 */
const PREFIX = 'juanwise_cache_v1:';

export async function readCache<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch (e) {
    console.warn(`cache: failed to read ${key}`, e);
    return null;
  }
}

export function writeCache(key: string, value: unknown): void {
  AsyncStorage.setItem(PREFIX + key, JSON.stringify(value)).catch((e) =>
    console.warn(`cache: failed to write ${key}`, e),
  );
}

export function clearCache(key: string): void {
  AsyncStorage.removeItem(PREFIX + key).catch((e) =>
    console.warn(`cache: failed to clear ${key}`, e),
  );
}

/** Drops every cached value — used on sign-out so the next account starts clean. */
export async function clearAllCaches(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const ours = keys.filter((k) => k.startsWith(PREFIX));
    if (ours.length) await AsyncStorage.multiRemove(ours);
  } catch (e) {
    console.warn('cache: failed to clear all', e);
  }
}
