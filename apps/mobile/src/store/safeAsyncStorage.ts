// ─── Safe AsyncStorage wrapper — handles null native module in Expo Go ──
// Falls back to in-memory Map when the native module is unavailable.
// All errors are silently caught; callers should not assume persistence.

import AsyncStorage from '@react-native-async-storage/async-storage';

// Augment the AsyncStorage type with the legacy batch methods, which are still
// present at runtime but absent from the v3 typings (replaced by getMany/setMany).
declare module '@react-native-async-storage/async-storage' {
  interface AsyncStorage {
    multiGet(keys: string[]): Promise<Array<[string, string | null]>>;
    multiSet(keyValuePairs: Array<[string, string]>): Promise<void>;
  }
}

const _memoryCache = new Map<string, string>();
let _nativeAvailable: boolean | null = null;

function isNativeAvailable(): boolean {
  if (_nativeAvailable === null) {
    try {
      _nativeAvailable = AsyncStorage !== null && AsyncStorage !== undefined;
    } catch {
      _nativeAvailable = false;
    }
  }
  return _nativeAvailable;
}

export async function safeGetItem(key: string): Promise<string | null> {
  if (!isNativeAvailable()) return _memoryCache.get(key) ?? null;
  try {
    return await AsyncStorage.getItem(key);
  } catch {
    return _memoryCache.get(key) ?? null;
  }
}

export async function safeSetItem(key: string, value: string): Promise<void> {
  if (!isNativeAvailable()) {
    _memoryCache.set(key, value);
    return;
  }
  try {
    await AsyncStorage.setItem(key, value);
  } catch {
    _memoryCache.set(key, value);
  }
}

export async function safeMultiGet(keys: string[]): Promise<Array<[string, string | null]>> {
  if (!isNativeAvailable()) {
    return keys.map(k => [k, _memoryCache.get(k) ?? null] as [string, string | null]);
  }
  try {
    return await AsyncStorage.multiGet(keys);
  } catch {
    return keys.map(k => [k, _memoryCache.get(k) ?? null] as [string, string | null]);
  }
}

export async function safeMultiSet(pairs: Array<[string, string]>): Promise<void> {
  if (!isNativeAvailable()) {
    for (const [k, v] of pairs) _memoryCache.set(k, v);
    return;
  }
  try {
    await AsyncStorage.multiSet(pairs);
  } catch {
    for (const [k, v] of pairs) _memoryCache.set(k, v);
  }
}