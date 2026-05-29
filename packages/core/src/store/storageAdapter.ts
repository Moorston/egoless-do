// ─── Platform-agnostic storage adapter interface ───────────────
import type { SyncEntity } from '../sync/entities';

export interface StorageAdapter {
  persistChange(entity: SyncEntity, id: string, data: Record<string, unknown>): Promise<void>;
  markDeleted(entity: SyncEntity, id: string): Promise<void>;
}
