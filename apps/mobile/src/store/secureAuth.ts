// ─── Secure Auth Token Storage ────────────────────────────────────
// 四层持久化：SecureStore → SQLite → 文件系统(JSON) → 内存
// 确保任何一层失败都不会导致 token 丢失
import { createLogger } from '@egoless-do/core';
import * as SecureStore from 'expo-secure-store';

import { openDatabase, setState, getState } from '../db/schema';

import { saveTokenToFile, loadTokenFromFile, clearTokenFile } from './fileStorage';

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

/** Save auth tokens to all available storage layers */
export async function saveSecureTokens(token: string, refreshToken: string, expiresAt?: number): Promise<void> {
  const expiresStr = expiresAt ? String(expiresAt) : '';
  const errors: string[] = [];

  // 1. SecureStore
  try {
    await Promise.all([
      SecureStore.setItemAsync(TOKEN_KEY, token),
      SecureStore.setItemAsync(REFRESH_KEY, refreshToken),
      ...(expiresAt ? [SecureStore.setItemAsync(EXPIRES_KEY, expiresStr)] : []),
    ]);
  } catch (e) {
    errors.push('SecureStore: ' + (e instanceof Error ? e.message : String(e)));
  }

  // 2. SQLite 回退
  try {
    const db = await openDatabase();
    await Promise.all([
      setState(db, SQLITE_TOKEN_KEY, token),
      setState(db, SQLITE_REFRESH_KEY, refreshToken),
      ...(expiresAt ? [setState(db, SQLITE_EXPIRES_KEY, expiresStr)] : []),
    ]);
    // Fold the token write into the main DB file immediately so a process kill
    // on MIUI (which happens very fast) can't drop the un-checkpointed WAL tail
    // and lose the session. Best-effort.
    await db.execAsync('PRAGMA wal_checkpoint(TRUNCATE)').catch(() => {});
  } catch (e) {
    errors.push('SQLite: ' + (e instanceof Error ? e.message : String(e)));
  }

  // 3. 文件系统 JSON 回退（最后防线）- 使用 fileStorage 模块
  await saveTokenToFile(token, refreshToken, expiresAt);

  if (errors.length > 0) {
    log.warn('saveSecureTokens partial failure: ' + errors.join(' | '));
  }
}

/** Load auth tokens from SecureStore → SQLite → 文件系统 */
export async function loadSecureTokens(): Promise<{ token: string; refreshToken: string; expiresAt?: number } | null> {
  // 1. 尝试 SecureStore
  try {
    const [token, refreshToken, expiresAtStr] = await Promise.all([
      SecureStore.getItemAsync(TOKEN_KEY),
      SecureStore.getItemAsync(REFRESH_KEY),
      SecureStore.getItemAsync(EXPIRES_KEY),
    ]);
    if (token) {
      const result: { token: string; refreshToken: string; expiresAt?: number } = { token, refreshToken: refreshToken ?? '' };
      const expiresAt = expiresAtStr ? parseInt(expiresAtStr, 10) : 0;
      if (expiresAt > 0) result.expiresAt = expiresAt;
      return result;
    }
  } catch (e) {
    log.warn('SecureStore load failed:', e instanceof Error ? e.message : String(e));
  }

  // 2. SQLite 回退
  try {
    const db = await openDatabase();
    const [token, refreshToken, expiresAtStr] = await Promise.all([
      getState(db, SQLITE_TOKEN_KEY),
      getState(db, SQLITE_REFRESH_KEY),
      getState(db, SQLITE_EXPIRES_KEY),
    ]);
    if (token) {
      const result: { token: string; refreshToken: string; expiresAt?: number } = { token, refreshToken: refreshToken ?? '' };
      const expiresAt = expiresAtStr ? parseInt(expiresAtStr, 10) : 0;
      if (expiresAt > 0) result.expiresAt = expiresAt;
      log.info('Auth tokens restored from SQLite fallback');
      return result;
    }
  } catch (e) {
    log.warn('SQLite fallback failed:', e instanceof Error ? e.message : String(e));
  }

  // 3. 文件系统 JSON 回退（最后防线）
  const fileResult = await loadTokenFromFile();
  if (fileResult) {
    log.info('Auth tokens restored from file system fallback');
  }
  return fileResult;
}

/** 带重试的 loadSecureTokens：所有错误都返回 null 而非抛出 */
export async function loadSecureTokensWithRetry(maxRetries = 3, retryDelayMs = 1000): Promise<{ token: string; refreshToken: string; expiresAt?: number } | null> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await loadSecureTokens();
    } catch (err) {
      log.warn(`Token load failed (attempt ${attempt + 1}/${maxRetries + 1}):`, err instanceof Error ? err.message : String(err));
      if (attempt >= maxRetries) return null;
      if (isUserInteractionError(err)) {
        await new Promise<void>(resolve => setTimeout(resolve, retryDelayMs));
      }
    }
  }
  return null;
}

/** Clear auth tokens from all storage layers */
export async function clearSecureTokens(): Promise<void> {
  // 清除 SecureStore
  try {
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {}),
      SecureStore.deleteItemAsync(REFRESH_KEY).catch(() => {}),
      SecureStore.deleteItemAsync(EXPIRES_KEY).catch(() => {}),
    ]);
  } catch {
    // 忽略
  }

  // 清除 SQLite
  try {
    const db = await openDatabase();
    await Promise.all([
      setState(db, SQLITE_TOKEN_KEY, ''),
      setState(db, SQLITE_REFRESH_KEY, ''),
      setState(db, SQLITE_EXPIRES_KEY, ''),
    ]);
  } catch {
    // 忽略
  }

  // 清除文件系统
  await clearTokenFile();
}