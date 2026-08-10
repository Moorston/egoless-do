// ─── File-based JSON Storage ──────────────────────────────────────
// 纯文件存储，不依赖 expo-sqlite，作为最后防线
// 使用 legacy 导入以保持 EncodingType / writeAsStringAsync / getInfoAsync 兼容
import { createLogger } from '@egoless-do/core';
import * as FileSystem from 'expo-file-system/legacy';

const log = createLogger('FileStorage');

const STORAGE_DIR = FileSystem.documentDirectory + 'egoless_storage/';
const TOKEN_FILE = STORAGE_DIR + 'auth.json';

/** Shape of the persisted auth token file. */
interface AuthTokenFile {
  token?: string;
  refreshToken?: string;
  expiresAt?: number;
}

/** 确保存储目录存在 */
async function ensureDir(): Promise<void> {
  try {
    const info = await FileSystem.getInfoAsync(STORAGE_DIR);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(STORAGE_DIR, { intermediates: true });
    }
  } catch (e) {
    log.warn('ensureDir failed:', e instanceof Error ? e.message : String(e));
  }
}

/** 保存 token 到文件 */
export async function saveTokenToFile(token: string, refreshToken: string, expiresAt?: number): Promise<void> {
  try {
    await ensureDir();
    const data = JSON.stringify({ token, refreshToken, expiresAt: expiresAt ?? null });
    await FileSystem.writeAsStringAsync(TOKEN_FILE, data, { encoding: FileSystem.EncodingType.UTF8 });
  } catch (e) {
    log.error('saveTokenToFile failed:', e instanceof Error ? e.message : String(e));
  }
}

/** 从文件加载 token */
export async function loadTokenFromFile(): Promise<{ token: string; refreshToken: string; expiresAt?: number } | null> {
  try {
    await ensureDir();
    const info = await FileSystem.getInfoAsync(TOKEN_FILE);
    if (!info.exists) return null;
    const raw = await FileSystem.readAsStringAsync(TOKEN_FILE, { encoding: FileSystem.EncodingType.UTF8 });
    const data = JSON.parse(raw) as AuthTokenFile;
    if (data.token && data.refreshToken) {
      return { token: data.token, refreshToken: data.refreshToken, expiresAt: data.expiresAt ?? undefined };
    }
  } catch (e) {
    log.warn('loadTokenFromFile failed:', e instanceof Error ? e.message : String(e));
  }
  return null;
}

/** 清除文件中的 token */
export async function clearTokenFile(): Promise<void> {
  try {
    await ensureDir();
    const info = await FileSystem.getInfoAsync(TOKEN_FILE);
    if (info.exists) {
      await FileSystem.deleteAsync(TOKEN_FILE, { idempotent: true });
    }
  } catch {
    // 忽略
  }
}

/** 保存数据到文件（按 entity 分文件） */
export async function saveDataToFile(entity: string, id: string, data: Record<string, unknown>): Promise<void> {
  try {
    await ensureDir();
    const file = STORAGE_DIR + entity + '.json';
    let all: Record<string, unknown> = {};
    try {
      const info = await FileSystem.getInfoAsync(file);
      if (info.exists) {
        const raw = await FileSystem.readAsStringAsync(file, { encoding: FileSystem.EncodingType.UTF8 });
        all = JSON.parse(raw) as Record<string, unknown>;
      }
    } catch {
      // 文件不存在或损坏，从头开始
    }
    all[id] = data;
    await FileSystem.writeAsStringAsync(file, JSON.stringify(all), { encoding: FileSystem.EncodingType.UTF8 });
  } catch (e) {
    log.error('saveDataToFile failed:', e instanceof Error ? e.message : String(e));
  }
}

/** 从文件加载数据 */
export async function loadDataFromFile(entity: string): Promise<Record<string, unknown> | null> {
  try {
    await ensureDir();
    const file = STORAGE_DIR + entity + '.json';
    const info = await FileSystem.getInfoAsync(file);
    if (!info.exists) return null;
    const raw = await FileSystem.readAsStringAsync(file, { encoding: FileSystem.EncodingType.UTF8 });
    return JSON.parse(raw);
  } catch (e) {
    log.warn('loadDataFromFile failed:', e instanceof Error ? e.message : String(e));
  }
  return null;
}

/** 标记删除 */
export async function markDeleteInFile(entity: string, id: string): Promise<void> {
  try {
    await ensureDir();
    const file = STORAGE_DIR + entity + '.json';
    const info = await FileSystem.getInfoAsync(file);
    if (!info.exists) return;
    const raw = await FileSystem.readAsStringAsync(file, { encoding: FileSystem.EncodingType.UTF8 });
    const all: Record<string, unknown> = JSON.parse(raw) as Record<string, unknown>;
    if (all[id]) {
      (all[id] as Record<string, unknown>).deleted = true;
      await FileSystem.writeAsStringAsync(file, JSON.stringify(all), { encoding: FileSystem.EncodingType.UTF8 });
    }
  } catch (e) {
    log.warn('markDeleteInFile failed:', e instanceof Error ? e.message : String(e));
  }
}