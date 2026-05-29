// ─── Sync types (shared across platforms) ───────────────────────
import type { SyncEntity } from './entities';

export interface SyncChange {
  entity: SyncEntity;
  entityId: string;
  op: 'upsert' | 'delete';
  payload: Record<string, unknown>;
}

export interface SyncPushResult {
  changes: SyncChange[];
  rejected?: SyncChange[];
  serverTime: number;
}

export interface SyncPullResult {
  data: Record<string, unknown[]>;
  serverTime: number;
}
