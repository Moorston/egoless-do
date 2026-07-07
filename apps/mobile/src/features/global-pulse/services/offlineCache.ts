/**
 * 离线缓存服务
 * 使用 SQLite 缓存地图瓦片和打卡数据
 */

import { GlobalCheckin, GlobalStats, CheckinType } from '@egoless-do/core';
import * as SQLite from 'expo-sqlite';

// 数据库名称
const DB_NAME = 'global_pulse.db';

// 最大缓存瓦片数
const MAX_TILES = 1000;

// 最大缓存打卡记录数
const MAX_CHECKINS = 10000;

/**
 * 打开数据库
 */
async function openDatabase(): Promise<SQLite.SQLiteDatabase> {
  return await SQLite.openDatabaseAsync(DB_NAME);
}

/**
 * 初始化数据库表
 */
export async function initDatabase(): Promise<void> {
  const db = await openDatabase();

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS tile_cache (
      tile_key TEXT PRIMARY KEY,
      data BLOB,
      created_at INTEGER,
      accessed_at INTEGER,
      size INTEGER
    );

    CREATE TABLE IF NOT EXISTS checkin_cache (
      checkin_id TEXT PRIMARY KEY,
      user_hash TEXT,
      lat REAL,
      lng REAL,
      type TEXT,
      streak INTEGER,
      total_days INTEGER,
      created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS stats_cache (
      id INTEGER PRIMARY KEY DEFAULT 1,
      total_users INTEGER,
      active_today INTEGER,
      top_streak INTEGER,
      countries INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS sync_status (
      id INTEGER PRIMARY KEY DEFAULT 1,
      last_sync INTEGER,
      pending_count INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_tile_accessed ON tile_cache (accessed_at);
    CREATE INDEX IF NOT EXISTS idx_checkin_created ON checkin_cache (created_at);
  `);
}

/**
 * 缓存瓦片
 */
export async function cacheTile(tileKey: string, data: ArrayBuffer): Promise<void> {
  const db = await openDatabase();
  const now = Date.now();

  await db.runAsync(
    `INSERT OR REPLACE INTO tile_cache (tile_key, data, created_at, accessed_at, size)
     VALUES (?, ?, ?, ?, ?)`,
    [tileKey, new Uint8Array(data), now, now, data.byteLength]
  );

  // 清理旧缓存
  await cleanupTileCache();
}

/**
 * 获取缓存的瓦片
 */
export async function getCachedTile(tileKey: string): Promise<ArrayBuffer | null> {
  const db = await openDatabase();

  const result = await db.getFirstAsync<{ data: ArrayBuffer }>(
    'SELECT data FROM tile_cache WHERE tile_key = ?',
    [tileKey]
  );

  if (result) {
    // 更新访问时间
    await db.runAsync(
      'UPDATE tile_cache SET accessed_at = ? WHERE tile_key = ?',
      [Date.now(), tileKey]
    );
    return result.data;
  }

  return null;
}

/**
 * 清理旧瓦片缓存
 */
async function cleanupTileCache(): Promise<void> {
  const db = await openDatabase();

  const count = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM tile_cache'
  );

  if (count && count.count > MAX_TILES) {
    const toDelete = count.count - MAX_TILES;
    await db.runAsync(
      `DELETE FROM tile_cache WHERE tile_key IN (
        SELECT tile_key FROM tile_cache ORDER BY accessed_at ASC LIMIT ?
      )`,
      [toDelete]
    );
  }
}

/**
 * 缓存打卡记录（事务批量写入）
 */
export async function cacheCheckins(checkins: GlobalCheckin[]): Promise<void> {
  if (checkins.length === 0) return;

  const db = await openDatabase();

  await db.withTransactionAsync(async () => {
    for (const checkin of checkins) {
      await db.runAsync(
        `INSERT OR REPLACE INTO checkin_cache
         (checkin_id, user_hash, lat, lng, type, streak, total_days, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          checkin.checkin_id,
          checkin.user_hash,
          checkin.lat,
          checkin.lng,
          checkin.type,
      checkin.streak,
      checkin.total_days,
      checkin.created_at ? new Date(checkin.created_at).getTime() : Date.now()
    ]
  );
    }
  });

  await cleanupCheckinCache();
}

/**
 * 获取缓存的打卡记录
 */
export async function getCachedCheckins(limit: number = 1000): Promise<GlobalCheckin[]> {
  const db = await openDatabase();

  const results = await db.getAllAsync<{
    checkin_id: string;
    user_hash: string;
    lat: number;
    lng: number;
    type: string;
    streak: number;
    total_days: number;
    created_at: number;
  }>(
    'SELECT * FROM checkin_cache ORDER BY created_at DESC LIMIT ?',
    [limit]
  );

  return results.map(row => ({
    checkin_id: row.checkin_id,
    user_hash: row.user_hash,
    lat: row.lat,
    lng: row.lng,
    type: row.type as CheckinType,
    streak: row.streak,
    total_days: row.total_days,
    created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date(0).toISOString()
  }));
}

/**
 * 清理旧打卡缓存
 */
async function cleanupCheckinCache(): Promise<void> {
  const db = await openDatabase();

  const count = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM checkin_cache'
  );

  if (count && count.count > MAX_CHECKINS) {
    const toDelete = count.count - MAX_CHECKINS;
    await db.runAsync(
      `DELETE FROM checkin_cache WHERE checkin_id IN (
        SELECT checkin_id FROM checkin_cache ORDER BY created_at ASC LIMIT ?
      )`,
      [toDelete]
    );
  }
}

/**
 * 缓存统计数据
 */
export async function cacheStats(stats: GlobalStats): Promise<void> {
  const db = await openDatabase();

  await db.runAsync(
    `INSERT OR REPLACE INTO stats_cache (id, total_users, active_today, top_streak, countries, updated_at)
     VALUES (1, ?, ?, ?, ?, ?)`,
    [stats.total_users, stats.active_today, stats.top_streak, stats.countries, Date.now()]
  );
}

/**
 * 获取缓存的统计数据
 */
export async function getCachedStats(): Promise<GlobalStats | null> {
  const db = await openDatabase();

  const result = await db.getFirstAsync<{
    total_users: number;
    active_today: number;
    top_streak: number;
    countries: number;
    updated_at: number;
  }>(
    'SELECT * FROM stats_cache WHERE id = 1'
  );

  if (result) {
    return {
      total_users: result.total_users,
      active_today: result.active_today,
      top_streak: result.top_streak,
      countries: result.countries,
      updated_at: result.updated_at ? new Date(result.updated_at).toISOString() : new Date(0).toISOString()
    };
  }

  return null;
}

/**
 * 更新同步状态
 */
export async function updateSyncStatus(lastSync: number, pendingCount: number): Promise<void> {
  const db = await openDatabase();

  await db.runAsync(
    `INSERT OR REPLACE INTO sync_status (id, last_sync, pending_count)
     VALUES (1, ?, ?)`,
    [lastSync, pendingCount]
  );
}

/**
 * 获取同步状态
 */
export async function getSyncStatus(): Promise<{ lastSync: number; pendingCount: number }> {
  const db = await openDatabase();

  const result = await db.getFirstAsync<{
    last_sync: number;
    pending_count: number;
  }>(
    'SELECT * FROM sync_status WHERE id = 1'
  );

  return {
    lastSync: result?.last_sync || 0,
    pendingCount: result?.pending_count || 0
  };
}

/**
 * 清除所有缓存
 */
export async function clearAllCache(): Promise<void> {
  const db = await openDatabase();

  await db.execAsync(`
    DELETE FROM tile_cache;
    DELETE FROM checkin_cache;
    DELETE FROM stats_cache;
    DELETE FROM sync_status;
  `);
}

/**
 * 获取缓存大小（字节）
 */
export async function getCacheSize(): Promise<number> {
  const db = await openDatabase();

  const result = await db.getFirstAsync<{ total: number }>(
    'SELECT COALESCE(SUM(size), 0) as total FROM tile_cache'
  );

  return result?.total || 0;
}
