// ─── AsyncStorage → SQLite entity migration ───────────────────
// One-time migration for users upgrading from the old architecture
// where entity arrays were persisted in AsyncStorage via Zustand partialize.
// Now entities live in SQLite only; this bridges the gap on first launch.

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StorageAdapter, SyncEntity, AIMode, ModelConfig } from '@egoless-do/core';
import type { SQLiteDatabase } from 'expo-sqlite';
import { createLogger } from '@egoless-do/core';
import { getState, setState } from '../db/schema';

const log = createLogger('App');

const MIGRATION_KEY = 'async_storage_migrated';
const SETTINGS_MIGRATION_KEY = 'settings_migrated_to_sqlite';
const STORE_KEY = 'egoless-do-mobile';

// Entity arrays that were previously in partialize → SyncEntity mapping
const ENTITY_MIGRATIONS: Array<{
  storeKey: string;
  entity: SyncEntity;
  idField: string;
}> = [
  { storeKey: 'habits', entity: 'habit', idField: 'id' },
  { storeKey: 'reflections', entity: 'reflection', idField: 'id' },
  { storeKey: 'fastingHistory', entity: 'fasting', idField: 'id' },
  { storeKey: 'foodLog', entity: 'food', idField: 'id' },
  { storeKey: 'checkinHistory', entity: 'checkin', idField: 'date' },
  { storeKey: 'exerciseLog', entity: 'exercise', idField: 'id' },
  { storeKey: 'medHistory', entity: 'meditation', idField: 'date' },
  { storeKey: 'plans', entity: 'plan', idField: 'id' },
  { storeKey: 'planItems', entity: 'planItem', idField: 'id' },
  { storeKey: 'planItemCheckins', entity: 'planItemCheckin', idField: 'id' },
  { storeKey: 'graceHistory', entity: 'grace', idField: 'date' },
  { storeKey: 'dailyCustomTodos', entity: 'dailyCustomTodo', idField: 'id' },
  { storeKey: 'dailyTodoHistory', entity: 'dailyTodoHistory', idField: 'id' },
  { storeKey: 'thoughtTrails', entity: 'thoughtTrail', idField: 'id' },
  { storeKey: 'trailNotes', entity: 'trailNote', idField: 'id' },
  { storeKey: 'reflectionLinks', entity: 'reflectionLink', idField: 'id' },
  { storeKey: 'checkinReviews', entity: 'checkinReview', idField: 'id' },
];

/**
 * Migrates entity data from AsyncStorage to SQLite.
 * Idempotent: safe to call multiple times (persistChange uses UPDATE-then-INSERT).
 * Returns true if migration was performed, false if skipped (already done or no data).
 */
export async function migrateAsyncStorageToSQLite(
  db: SQLiteDatabase,
  adapter: StorageAdapter,
): Promise<boolean> {
  // Check if already migrated
  const migrated = await getState(db, MIGRATION_KEY);
  if (migrated === '1') return false;

  // Read old AsyncStorage data
  let raw: string | null = null;
  try {
    raw = await AsyncStorage.getItem(STORE_KEY);
  } catch {
    return false;
  }
  if (!raw) {
    // No old data — mark as migrated and skip
    await setState(db, MIGRATION_KEY, '1');
    return false;
  }

  let oldData: Record<string, unknown>;
  try {
    oldData = JSON.parse(raw);
  } catch {
    await setState(db, MIGRATION_KEY, '1');
    return false;
  }

  // Check if there's any entity data to migrate
  const hasEntityData = ENTITY_MIGRATIONS.some(
    ({ storeKey }) => Array.isArray(oldData[storeKey]) && (oldData[storeKey] as unknown[]).length > 0
  );
  const hasAIConfig = oldData['aiMode'] !== undefined || oldData['aiModels'] !== undefined;
  const hasProfile = oldData['userProfile'] && typeof oldData['userProfile'] === 'object'
    && Object.keys(oldData['userProfile'] as Record<string, unknown>).length > 0;

  if (!hasEntityData && !hasAIConfig && !hasProfile) {
    // No entity data in old storage — mark migrated
    await setState(db, MIGRATION_KEY, '1');
    return false;
  }

  log.info('Found old entity data in AsyncStorage, migrating to SQLite...');

  let migratedCount = 0;

  // Migrate entity arrays
  for (const { storeKey, entity, idField } of ENTITY_MIGRATIONS) {
    const items = oldData[storeKey];
    if (!Array.isArray(items) || items.length === 0) continue;

    for (const item of items) {
      const id = (item as Record<string, unknown>)[idField];
      if (!id) continue;
      try {
        await adapter.persistChange(entity, id as string, item as Record<string, unknown>);
        migratedCount++;
      } catch (err) {
        log.error(err, { message: `Failed to migrate ${entity}/${id}` });
      }
    }
  }

  // Migrate profile (single object, not array)
  if (hasProfile) {
    try {
      await adapter.persistChange('profile', 'self', oldData['userProfile'] as Record<string, unknown>);
      migratedCount++;
    } catch (err) {
      log.error(err, { message: 'Failed to migrate profile' });
    }
  }

  // Migrate AI config (scalar values → ai_configs table)
  if (hasAIConfig) {
    try {
      await adapter.persistChange('aiConfig', 'self', {
        config_id: 'self',
        mode: (oldData['aiMode'] as AIMode) ?? 'hybrid',
        models: (oldData['aiModels'] as ModelConfig[]) ?? [],
        updatedAt: Date.now(),
        deleted: false,
      });
      migratedCount++;
    } catch (err) {
      log.error(err, { message: 'Failed to migrate AI config' });
    }
  }

  // Flush all batched writes to SQLite before marking migration complete
  const { flushWrites } = await import('./storageAdapter');
  await flushWrites();

  // Mark migration complete
  await setState(db, MIGRATION_KEY, '1');

  // Clean up old entity keys from AsyncStorage
  // (Zustand persist will only write partialize fields on next save,
  //  but we explicitly remove old keys to free space)
  const keysToRemove = ENTITY_MIGRATIONS.map(m => m.storeKey)
    .concat(['userProfile', 'aiMode', 'aiModels'])
    .filter(k => k in oldData);
  if (keysToRemove.length > 0) {
    try {
      // AsyncStorage stores the entire store under one key,
      // so we need to re-save without entity fields
      const cleaned = { ...oldData };
      for (const k of keysToRemove) delete cleaned[k];
      await AsyncStorage.setItem(STORE_KEY, JSON.stringify(cleaned));
    } catch (err) {
      log.error(err, { message: 'Failed to clean AsyncStorage' });
    }
  }

  log.info(`Migrated ${migratedCount} entities to SQLite`);
  return true;
}

// ── Settings migration (partialize fields → app_state) ─────────

/** Settings keys that were previously stored via Zustand partialize in AsyncStorage. */
const SETTINGS_KEYS = [
  'theme', 'language', 'streak',
  'waterMl', 'waterGoal', 'calGoal',
  'remindEnabled', 'remindTime', 'weightUnit',
  'customTags', 'customMoods', 'allTagsOrder', 'allMoodsOrder',
  'customFoodPresets', 'reflectionFilters',
  'healthSyncEnabled', 'ignoredRecPatterns',
  'sleepGoal',
];

/**
 * Migrates settings data from AsyncStorage partialize to SQLite app_state table.
 * Uses the new adapter.persistSettings() method.
 * Idempotent: safe to call multiple times.
 */
export async function migrateSettingsToSQLite(
  db: SQLiteDatabase,
  adapter: StorageAdapter,
): Promise<boolean> {
  const migrated = await getState(db, SETTINGS_MIGRATION_KEY);
  if (migrated === '1') return false;

  let raw: string | null = null;
  try {
    raw = await AsyncStorage.getItem(STORE_KEY);
  } catch {
    return false;
  }
  if (!raw) {
    await setState(db, SETTINGS_MIGRATION_KEY, '1');
    return false;
  }

  let oldData: Record<string, unknown>;
  try {
    oldData = JSON.parse(raw);
  } catch {
    await setState(db, SETTINGS_MIGRATION_KEY, '1');
    return false;
  }

  let migratedCount = 0;
  for (const key of SETTINGS_KEYS) {
    if (oldData[key] !== undefined) {
      try {
        await adapter.persistSettings(key, oldData[key]);
        migratedCount++;
      } catch (err) {
        log.error(err, { message: `Failed to migrate setting: ${key}` });
      }
    }
  }

  if (migratedCount > 0) {
    log.info(`Migrated ${migratedCount} settings to SQLite`);
  }

  await setState(db, SETTINGS_MIGRATION_KEY, '1');
  return migratedCount > 0;
}
