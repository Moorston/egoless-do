// ─── Sync Store ──────────────────────────────────────────────────
// Manages synchronization state, queue, and conflict resolution.

import { create } from 'zustand';

export interface SyncConflict {
  id: string;
  entity: string;
  entityId: string;
  localData: unknown;
  remoteData: unknown;
  timestamp: number;
  resolution?: 'local' | 'remote' | 'merged';
}

export interface SyncStore {
  // Sync status
  isSyncing: boolean;
  lastSyncAt: number | null;
  syncError: string | null;

  // Queue status
  pendingCount: number;
  failedCount: number;
  conflictCount: number;

  // Conflicts
  conflicts: SyncConflict[];

  // Actions
  setSyncing: (isSyncing: boolean) => void;
  setLastSyncAt: (timestamp: number) => void;
  setSyncError: (error: string | null) => void;

  // Queue management
  setPendingCount: (count: number) => void;
  setFailedCount: (count: number) => void;
  setConflictCount: (count: number) => void;

  // Conflict management
  addConflict: (conflict: SyncConflict) => void;
  resolveConflict: (id: string, resolution: 'local' | 'remote' | 'merged') => void;
  removeConflict: (id: string) => void;
  clearConflicts: () => void;

  // Reset
  resetSyncState: () => void;
}

export const useSyncStore = create<SyncStore>()((set) => ({
  // Sync status
  isSyncing: false,
  lastSyncAt: null,
  syncError: null,

  // Queue status
  pendingCount: 0,
  failedCount: 0,
  conflictCount: 0,

  // Conflicts
  conflicts: [],

  // Actions
  setSyncing: (isSyncing) => set({ isSyncing }),
  setLastSyncAt: (timestamp) => set({ lastSyncAt: timestamp }),
  setSyncError: (error) => set({ syncError: error }),

  // Queue management
  setPendingCount: (count) => set({ pendingCount: count }),
  setFailedCount: (count) => set({ failedCount: count }),
  setConflictCount: (count) => set({ conflictCount: count }),

  // Conflict management
  addConflict: (conflict) =>
    set((state) => ({
      conflicts: [...state.conflicts, conflict],
      conflictCount: state.conflictCount + 1,
    })),

  resolveConflict: (id, resolution) =>
    set((state) => ({
      conflicts: state.conflicts.map((c) =>
        c.id === id ? { ...c, resolution } : c
      ),
    })),

  removeConflict: (id) =>
    set((state) => ({
      conflicts: state.conflicts.filter((c) => c.id !== id),
      conflictCount: Math.max(0, state.conflictCount - 1),
    })),

  clearConflicts: () =>
    set({
      conflicts: [],
      conflictCount: 0,
    }),

  // Reset
  resetSyncState: () =>
    set({
      isSyncing: false,
      lastSyncAt: null,
      syncError: null,
      pendingCount: 0,
      failedCount: 0,
      conflictCount: 0,
      conflicts: [],
    }),
}));
