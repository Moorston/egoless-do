import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_HASH_KEY = 'global_pulse_user_hash';

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

export async function getUserHash(): Promise<string> {
  try {
    const stored = await AsyncStorage.getItem(USER_HASH_KEY);
    if (stored) return stored;

    const deviceId = 'device_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2);
    const hash = hashString(deviceId);
    await AsyncStorage.setItem(USER_HASH_KEY, hash);
    return hash;
  } catch {
    const id = 'user_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    return hashString(id);
  }
}
