// ─── SyncResetService ──────────────────────────────────────────────────
// Extracted from SyncEngine.ts (PR-4 of AR-01 refactoring)
// Handles soft and hard reset of sync state.

import { createLogger, ALL_ENTITY_TABLES } from '@egoless-do/core';

import { openDatabase, setState, withDbLock } from '../../db/schema';

const log = createLogger('SyncReset');
const DEVICE_SYNCED_KEY = 'device_initial_synced';
const CLOCK_OFFSET_KEY = 'sync_clock_offset';

export class SyncResetService {
  async softReset(disconnectRealtime: () => void, resetLastSyncAt: () => void): Promise<void> {
    resetLastSyncAt();
    disconnectRealtime();
    try {
      const db = await openDatabase();
      await setState(db, 'lastSyncAt', '0');
      await db.runAsync('DELETE FROM sync_metadata');
    } catch (e) {
      log.warn(e, { phase: 'softReset' });
    }
  }

  async hardReset(
    confirmToken: string | undefined,
    disconnectRealtime: () => void,
    resetLastSyncAt: () => void,
  ): Promise<void> {
    if (confirmToken !== 'CONFIRM_HARD_RESET') {
      log.warn('hardReset called without confirmation token');
      return;
    }
    resetLastSyncAt();
    disconnectRealtime();
    try {
      const db = await openDatabase();
      await withDbLock(async () => {
        await setState(db, 'lastSyncAt', '0');
        await db.runAsync('DELETE FROM sync_queue');
        await db.runAsync('DELETE FROM sync_metadata');
        for (const table of ALL_ENTITY_TABLES) {
          await db.runAsync(`DELETE FROM ${table}`);
        }
        await db.runAsync("DELETE FROM app_state WHERE key IN ('initialSyncDone', 'initialSyncPhase')");
        await db.runAsync('DELETE FROM sync_progress');
        // Clear sync keys — inside lock for transactional safety
        await setState(db, DEVICE_SYNCED_KEY, '0');
        await setState(db, CLOCK_OFFSET_KEY, '0');
      });
    } catch (e) {
      log.warn(e, { phase: 'hardReset' });
    }
  }
}