// ─── Secure Auth Token Storage ────────────────────────────────────
// Stores auth tokens in expo-secure-store (Keychain/EncryptedSharedPrefs)
// instead of plaintext AsyncStorage.
import { createLogger } from '@egoless-do/core';
import * as SecureStore from 'expo-secure-store';

const log = createLogger('SecureAuth');

const TOKEN_KEY = 'egoless-do.auth.token';
const REFRESH_KEY = 'egoless-do.auth.refreshToken';
const EXPIRES_KEY = 'egoless-do.auth.expiresAt';

/** 判断是否为 iOS "User interaction is not allowed" 错误 */
function isUserInteractionError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes('User interaction is not allowed') || msg.includes('user interaction');
}

/** Save auth tokens to SecureStore. */
export async function saveSecureTokens(token: string, refreshToken: string, expiresAt?: number): Promise<void> {
  try {
    await Promise.all([
      SecureStore.setItemAsync(TOKEN_KEY, token),
      SecureStore.setItemAsync(REFRESH_KEY, refreshToken),
      ...(expiresAt ? [SecureStore.setItemAsync(EXPIRES_KEY, String(expiresAt))] : []),
    ]);
  } catch (err) {
    log.error(err, { phase: 'saveSecureTokens' });
    throw err; // Propagate to caller so they know the save failed
  }
}

/** Load auth tokens from SecureStore. Returns null if not found. */
export async function loadSecureTokens(): Promise<{ token: string; refreshToken: string; expiresAt?: number } | null> {
  try {
    const [token, refreshToken, expiresAtStr] = await Promise.all([
      SecureStore.getItemAsync(TOKEN_KEY),
      SecureStore.getItemAsync(REFRESH_KEY),
      SecureStore.getItemAsync(EXPIRES_KEY),
    ]);
    if (token && refreshToken) {
      const result: { token: string; refreshToken: string; expiresAt?: number } = { token, refreshToken };
      const expiresAt = expiresAtStr ? parseInt(expiresAtStr, 10) : 0;
      if (expiresAt > 0) result.expiresAt = expiresAt;
      return result;
    }
    return null;
  } catch (err) {
    log.error(err, { phase: 'loadSecureTokens' });
    throw err; // Propagate so callers know the load failed
  }
}

/** 带重试的 loadSecureTokens：遇到 iOS "User interaction is not allowed" 时等待后重试 */
export async function loadSecureTokensWithRetry(maxRetries = 3, retryDelayMs = 1000): Promise<{ token: string; refreshToken: string; expiresAt?: number } | null> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await loadSecureTokens();
    } catch (err) {
      if (isUserInteractionError(err) && attempt < maxRetries) {
        log.warn(`SecureStore blocked (user interaction required), retry ${attempt + 1}/${maxRetries}...`);
        await new Promise<void>(resolve => setTimeout(resolve, retryDelayMs));
      } else {
        throw err;
      }
    }
  }
  return null;
}

/** Clear auth tokens from SecureStore (on logout). */
export async function clearSecureTokens(): Promise<void> {
  try {
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY).catch((err) => { log.error(err, { phase: 'clearSecureTokens', key: TOKEN_KEY }); }),
      SecureStore.deleteItemAsync(REFRESH_KEY).catch((err) => { log.error(err, { phase: 'clearSecureTokens', key: REFRESH_KEY }); }),
      SecureStore.deleteItemAsync(EXPIRES_KEY).catch((err) => { log.error(err, { phase: 'clearSecureTokens', key: EXPIRES_KEY }); }),
    ]);
  } catch (err) {
    log.error(err, { phase: 'clearSecureTokens' });
  }
}
