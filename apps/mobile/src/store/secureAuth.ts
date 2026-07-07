// ─── Secure Auth Token Storage ────────────────────────────────────
// Stores auth tokens in expo-secure-store (Keychain/EncryptedSharedPrefs)
// instead of plaintext AsyncStorage.
import { createLogger } from '@egoless-do/core';
import * as SecureStore from 'expo-secure-store';

const log = createLogger('SecureAuth');

const TOKEN_KEY = 'egoless-do.auth.token';
const REFRESH_KEY = 'egoless-do.auth.refreshToken';

/** Save auth tokens to SecureStore. */
export async function saveSecureTokens(token: string, refreshToken: string): Promise<void> {
  try {
    await Promise.all([
      SecureStore.setItemAsync(TOKEN_KEY, token),
      SecureStore.setItemAsync(REFRESH_KEY, refreshToken),
    ]);
  } catch (err) {
    log.error(err, { phase: 'saveSecureTokens' });
  }
}

/** Load auth tokens from SecureStore. Returns null if not found. */
export async function loadSecureTokens(): Promise<{ token: string; refreshToken: string } | null> {
  try {
    const [token, refreshToken] = await Promise.all([
      SecureStore.getItemAsync(TOKEN_KEY),
      SecureStore.getItemAsync(REFRESH_KEY),
    ]);
    if (token && refreshToken) return { token, refreshToken };
    return null;
  } catch (err) {
    log.error(err, { phase: 'loadSecureTokens' });
    return null;
  }
}

/** Clear auth tokens from SecureStore (on logout). */
export async function clearSecureTokens(): Promise<void> {
  try {
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {}),
      SecureStore.deleteItemAsync(REFRESH_KEY).catch(() => {}),
    ]);
  } catch (err) {
    log.error(err, { phase: 'clearSecureTokens' });
  }
}
