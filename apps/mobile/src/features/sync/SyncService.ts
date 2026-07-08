// ─── Mobile Sync Service (backward-compat facade for SyncEngine) ──
// All logic lives in SyncEngine.ts — this file creates a singleton and
// re-exports its methods so existing imports continue to work.

import { dbGetAllFoodEntries } from '../../db/queries';
import {
  getLastSyncTimestamp, setLastSyncTimestamp,
  getSyncProgress, updateSyncProgress, resetSyncProgress, getQueueCount,
} from '../../db/syncQueue';

import { SyncEngine } from './SyncEngine';
import type { SyncMetric } from './SyncEngine';

const _engine = new SyncEngine();

// Re-export SyncEngine instance methods as module-level functions

export function setSyncTokenProvider(fn: () => string | null) { _engine.setTokenProvider(fn); }
export function setSyncUserIdProvider(fn: () => string | null) { _engine.setUserIdProvider(fn); }
export function setSyncChangeHandler(fn: (patch: Record<string, unknown>) => void) { _engine.setChangeHandler(fn); }
export function setDeletedIdsProvider(fn: () => Set<string>) { _engine.setDeletedIdsProvider(fn); }
export function setKickedOutHandler(fn: () => void) { _engine.setKickedOutHandler(fn); }
export function setTokenRecoveryFn(fn: () => Promise<string | null>) { _engine.setTokenRecoveryFn(fn); }
export function setRealtimeLogoutHandler(fn: () => void) { _engine.setRealtimeLogoutHandler(fn); }
export function setRealtimeUserIdProvider(fn: () => string | undefined) { _engine.setRealtimeUserIdProvider(fn); }
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
export function resetSyncState() { return _engine.hardReset('CONFIRM_HARD_RESET'); }

// Rehydrate
export function rehydrateFromDb(entities?: string[]): Promise<Record<string, unknown>> { return _engine.rehydrateFromDb(entities); }

// Register local delete (prevents sync resurrection)
export function registerLocalDelete(entity: string, id: string) { _engine.registerLocalDelete(entity, id); }

// Initial sync
export function initialSync(token: string, userId?: string): Promise<'done' | 'partial'> { return _engine.initialSync(token, userId); }
export function resumeInitialSync(token: string, userId?: string) { return _engine.resumeInitialSync(token, userId); }

// Debounced sync trigger (delegated to engine)
export function setSyncTriggerCallback(fn: () => void) { _engine.setSyncTriggerCallback(fn); }
export function triggerSyncDebounced(): void { _engine.triggerSyncDebounced(); }
export function clearSyncTrigger(): void { _engine.clearSyncTrigger(); }

// Migration flags (delegated to engine)
export function resetMigrationFlag() { _engine.setMigrationDone(false); }
export function setMigrationDone() { _engine.setMigrationDone(true); }
export function isMigrationDone() { return _engine.getMigrationDone(); }

// applyServerChanges (used by useAppStore)
export function applyServerChanges(data: Record<string, unknown[]>, deletedIds?: Set<string>, signal?: AbortSignal): Promise<Record<string, unknown>> {
  return _engine.applyServerChanges(data, deletedIds, signal);
}

// Legacy sync-related imports re-exported for compat
export { getLastSyncTimestamp, setLastSyncTimestamp, getSyncProgress, updateSyncProgress, resetSyncProgress, getQueueCount, dbGetAllFoodEntries };
