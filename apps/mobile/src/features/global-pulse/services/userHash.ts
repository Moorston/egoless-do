import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const USER_HASH_KEY = 'global_pulse_user_hash';
const FUZZ_SECRET_KEY = 'global_pulse_fuzz_secret';

/** Generate a cryptographically strong random hex string. */
function generateSecureRandomHex(length: number): string {
  const arr = new Uint8Array(length);
  // Hermes engine exposes global crypto.getRandomValues()
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate and persist a stable user hash for Global Pulse anonymity.
 * Uses 64 hex chars (256-bit) stored in SecureStore for persistence and security.
 * Falls back to AsyncStorage for backward compatibility, then generates new if missing.
 */
export async function getUserHash(): Promise<string> {
  try {
    // Try SecureStore first (new, secure storage)
    const secure = await SecureStore.getItemAsync(USER_HASH_KEY);
    if (secure) return secure;

    // Migration: check old AsyncStorage hash
    const old = await AsyncStorage.getItem(USER_HASH_KEY);
    if (old && old.length >= 16) {
      // Migrate old hash to SecureStore
      await SecureStore.setItemAsync(USER_HASH_KEY, old);
      return old;
    }

    // Generate new 256-bit hash
    const hash = generateSecureRandomHex(32); // 32 bytes = 64 hex chars
    await SecureStore.setItemAsync(USER_HASH_KEY, hash);
    // Also store in AsyncStorage as fallback
    await AsyncStorage.setItem(USER_HASH_KEY, hash).catch(() => {});
    return hash;
  } catch {
    // Last resort: generate ephemeral hash
    return generateSecureRandomHex(32);
  }
}

/**
 * Get the secret key used for coordinate fuzzing.
 * This key is NEVER published — it stays in SecureStore only.
 * Used to make fuzzCoordinate() non-reversible.
 */
export async function getFuzzSecret(): Promise<string> {
  try {
    const existing = await SecureStore.getItemAsync(FUZZ_SECRET_KEY);
    if (existing) return existing;
    const secret = generateSecureRandomHex(32);
    await SecureStore.setItemAsync(FUZZ_SECRET_KEY, secret);
    return secret;
  } catch {
    return generateSecureRandomHex(32);
  }
}
