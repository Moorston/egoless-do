// ─── Sync types (shared across platforms) ───────────────────────
import type { SyncEntity } from './entities';

export interface SyncChange {
  entity: SyncEntity;
  entityId: string;
  op: 'upsert' | 'delete';
  payload: Record<string, unknown>;
  deleted?: boolean;
  /** Field-level delta: if set, server only merges these fields. Reduces payload size. */
  changedFields?: string[];
}

/** Server response item for push results (differs from client-side SyncChange). */
export interface SyncPushResponseItem {
  entity?: SyncEntity;
  entityId?: string;
  operation?: string;
  error?: string;
  serverData?: Record<string, unknown>;
}

export interface SyncPushResult {
  applied?: SyncPushResponseItem[];
  rejected?: SyncPushResponseItem[];
  serverTime: number;
}

export interface SyncPullResult {
  data: Record<string, unknown[]>;
  serverTime: number;
}

export interface SyncPullPostBody {
  entities?: string[];
  since?: number;
}

export interface SyncCheckResult {
  hasChanges: boolean;
  changed: Record<string, number>;
  serverTime: number;
}
