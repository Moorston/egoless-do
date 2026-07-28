// ─── Secure Auth Token Storage ────────────────────────────────────
// Stores auth tokens in expo-secure-store (Keychain/EncryptedSharedPrefs).
// Falls back to SQLite app_state if SecureStore is unavailable.
import { createLogger } from '@egoless-do/core';
import * as SecureStore from 'expo-secure-store';

import { openDatabase, setState, getState } from '../db/schema';

const log = createLogger('SecureAuth');

const TOKEN_KEY = 'egoless-do.auth.token';
const REFRESH_KEY = 'egoless-do.auth.refreshToken';
const EXPIRES_KEY = 'egoless-do.auth.expiresAt';

/** SQLite app_state 回退键名 */
const SQLITE_TOKEN_KEY = 'auth_token_backup';
const SQLITE_REFRESH_KEY = 'auth_refresh_backup';
const SQLITE_EXPIRES_KEY = 'auth_expires_backup';

/** 判断是否为 iOS "User interaction is not allowed" 错误 */
function isUserInteractionError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes('User interaction is not allowed') || msg.includes('user interaction');
}

/** Save auth tokens to SecureStore + SQLite 回退 */
export async function saveSecureTokens(token: string, refreshToken: string, expiresAt?: number): Promise<void> {
  // 同时写入 SecureStore 和 SQLite，确保至少有一个可用
  const results = await Promise.allSettled([
    // 写入 SecureStore
    Promise.all([
      SecureStore.setItemAsync(TOKEN_KEY, token).catch(e => { throw e; }),
      SecureStore.setItemAsync(REFRESH_KEY, refreshToken).catch(e => { throw e; }),
      ...(expiresAt ? [SecureStore.setItemAsync(EXPIRES_KEY, String(expiresAt))] : []),
    ]),
    // 写入 SQLite 回退
    (async () => {
      const db = await openDatabase();
      await Promise.all([
        setState(db, SQLITE_TOKEN_KEY, token),
        setState(db, SQLITE_REFRESH_KEY, refreshToken),
        ...(expiresAt ? [setState(db, SQLITE_EXPIRES_KEY, String(expiresAt))] : []),
      ]);
    })(),
  ]);

  if (results[0].status === 'rejected') {
    log.error(results[0].reason, { phase: 'saveSecureTokens' });
  }
}

/** Load auth tokens from SecureStore（优先）+ SQLite 回退 */
export async function loadSecureTokens(): Promise<{ token: string; refreshToken: string; expiresAt?: number } | null> {
  // 先尝试 SecureStore
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
  } catch (err) {
    log.warn('SecureStore load failed, trying SQLite fallback:', err instanceof Error ? err.message : String(err));
  }

  // SecureStore 失败，回退到 SQLite
  try {
    const db = await openDatabase();
    const [token, refreshToken, expiresAtStr] = await Promise.all([
      getState(db, SQLITE_TOKEN_KEY),
      getState(db, SQLITE_REFRESH_KEY),
      getState(db, SQLITE_EXPIRES_KEY),
    ]);
    if (token && refreshToken) {
      const result: { token: string; refreshToken: string; expiresAt?: number } = { token, refreshToken };
      const expiresAt = expiresAtStr ? parseInt(expiresAtStr, 10) : 0;
      if (expiresAt > 0) result.expiresAt = expiresAt;
      log.info('Auth tokens restored from SQLite fallback');
      return result;
    }
  } catch (err) {
    log.warn('SQLite fallback also failed:', err instanceof Error ? err.message : String(err));
  }

  return null;
}

/** 带重试的 loadSecureTokens：所有错误都返回 null 而非抛出 */
export async function loadSecureTokensWithRetry(maxRetries = 3, retryDelayMs = 1000): Promise<{ token: string; refreshToken: string; expiresAt?: number } | null> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await loadSecureTokens();
    } catch (err) {
      if (isUserInteractionError(err) && attempt < maxRetries) {
        log.warn(`SecureStore blocked (user interaction required), retry ${attempt + 1}/${maxRetries}...`);
        await new Promise<void>(resolve => setTimeout(resolve, retryDelayMs));
      } else {
        log.warn(`Token load failed (attempt ${attempt + 1}/${maxRetries + 1}):`, err instanceof Error ? err.message : String(err));
        if (attempt >= maxRetries) return null;
      }
    }
  }
  return null;
}

/** Clear auth tokens from SecureStore + SQLite 回退 */
export async function clearSecureTokens(): Promise<void> {
  await Promise.allSettled([
    // 清除 SecureStore
    Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY).catch(e => { log.error(e, { phase: 'clearSecureTokens', key: TOKEN_KEY }); }),
      SecureStore.deleteItemAsync(REFRESH_KEY).catch(e => { log.error(e, { phase: 'clearSecureTokens', key: REFRESH_KEY }); }),
      SecureStore.deleteItemAsync(EXPIRES_KEY).catch(e => { log.error(e, { phase: 'clearSecureTokens', key: EXPIRES_KEY }); }),
    ]),
    // 清除 SQLite 回退
    (async () => {
      try {
        const db = await openDatabase();
        await Promise.all([
          setState(db, SQLITE_TOKEN_KEY, ''),
          setState(db, SQLITE_REFRESH_KEY, ''),
          setState(db, SQLITE_EXPIRES_KEY, ''),
        ]);
      } catch (e) {
        log.error(e, { phase: 'clearSecureTokens_sqlite' });
      }
    })(),
  ]);
}