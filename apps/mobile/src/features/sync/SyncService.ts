// ─── Mobile Sync Service (backward-compat facade for SyncEngine) ──
// All logic lives in SyncEngine.ts — this file creates a singleton and
// re-exports its methods so existing imports continue to work.

import { SyncEngine } from './SyncEngine';
import type { SyncMetric } from './SyncEngine';
import { createLogger, ApiError } from '@egoless-do/core';
import { openDatabase, getState, setState } from '../../db/schema';
import {
  getLastSyncTimestamp, setLastSyncTimestamp,
  getSyncProgress, updateSyncProgress, resetSyncProgress, getQueueCount,
} from '../../db/syncQueue';
import { dbGetAllFoodEntries } from '../../db/queries';
import AsyncStorage from '@react-native-async-storage/async-storage';

const log = createLogger('Sync');
let _syncTriggerCallback: (() => void) | null = null;
let _syncTriggerTimer: ReturnType<typeof setTimeout> | null = null;
const SYNC_TRIGGER_DEBOUNCE_MS = 2000;

const _engine = new SyncEngine();

// Re-export SyncEngine instance methods as module-level functions

export function setSyncTokenProvider(fn: () => string | null) { _engine.setTokenProvider(fn); }
export function setSyncUserIdProvider(fn: () => string | null) { _engine.setUserIdProvider(fn); }
export function setSyncChangeHandler(fn: (patch: Record<string, unknown>) => void) { _engine.setChangeHandler(fn); }
export function setDeletedIdsProvider(fn: () => Set<string>) { _engine.setDeletedIdsProvider(fn); }
export function setKickedOutHandler(fn: () => void) { _engine.setKickedOutHandler(fn); }
export function setLastSyncAt(ts: number) { _engine.setLastSyncAt(ts); }

export function runSync(): Promise<void> { return _engine.runSync(); }
export function isSyncing(): boolean { return _engine.isSyncing(); }
export function getClockOffset(): number { return _engine.getClockOffset(); }
export function isDeviceSyncedBefore(): Promise<boolean> { return _engine.isDeviceSyncedBefore(); }
export function getSyncMetrics(): SyncMetric[] { return _engine.getSyncMetrics(); }
export function getSyncStatus(): Promise<{ lastSyncAt: number; pendingCount: number; isSyncing: boolean }> { return _engine.getSyncStatus(); }
export type { SyncMetric };

// Realtime
export function connectRealtime(pbUrl?: string) { _engine.connectRealtime(pbUrl); }
export function disconnectRealtime() { _engine.disconnectRealtime(); }
export function isRealtimeConnected(): boolean { return _engine.isRealtimeConnected(); }

// Reset
export function softResetSyncState() { return _engine.softReset(); }
export function resetSyncState() { return _engine.hardReset(); }

// Rehydrate
export function rehydrateFromDb(entities?: string[]): Promise<Record<string, unknown>> { return _engine.rehydrateFromDb(entities); }

// Initial sync
export function initialSync(token: string, userId?: string): Promise<'done' | 'partial'> { return _engine.initialSync(token, userId); }
export function resumeInitialSync(token: string, userId?: string) { return _engine.resumeInitialSync(token, userId); }

// Debounced sync trigger (cross-module callbacks)
export function setSyncTriggerCallback(fn: () => void) { _syncTriggerCallback = fn; }
export function triggerSyncDebounced(): void {
  if (!_syncTriggerCallback) {
    log.warn('triggerSyncDebounced called but _syncTriggerCallback is null');
    return;
  }
  if (_syncTriggerTimer) clearTimeout(_syncTriggerTimer);
  _syncTriggerTimer = setTimeout(() => {
    _syncTriggerTimer = null;
    log.debug('Debounced sync trigger firing');
    _syncTriggerCallback?.();
  }, SYNC_TRIGGER_DEBOUNCE_MS);
}
export function clearSyncTrigger(): void {
  if (_syncTriggerTimer) { clearTimeout(_syncTriggerTimer); _syncTriggerTimer = null; }
}

// Migration flags (forwarded to engine)
let _migrationDone = false;
export function resetMigrationFlag() { _migrationDone = false; _engine.setMigrationDone(false); }
export function setMigrationDone() { _migrationDone = true; _engine.setMigrationDone(true); }
export { _migrationDone };

// Orphan recovery reset (for testing)
let _orphanRecoveryDone = false;
export function resetOrphanRecoveryFlag() { _orphanRecoveryDone = false; }

// applyServerChanges (used by useAppStore)
export function applyServerChanges(data: Record<string, unknown[]>, deletedIds?: Set<string>, signal?: AbortSignal): Promise<Record<string, unknown>> {
  return _engine.applyServerChanges(data, deletedIds, signal);
}

// Legacy recalcDerived (kept for import compat)
export function recalcDerived(_entities: string[], _currentPatch: Record<string, unknown>): Record<string, unknown> {
  return {};
}

// Legacy sync-related imports re-exported for compat
export { getLastSyncTimestamp, setLastSyncTimestamp, getSyncProgress, updateSyncProgress, resetSyncProgress, getQueueCount, dbGetAllFoodEntries };
