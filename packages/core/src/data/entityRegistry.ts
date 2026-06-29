// ─── Entity Registry ──────────────────────────────────────────────
// Derived from SCHEMAS in entitySchemas.ts — do not edit manually.

import type { SyncEntity } from '../sync/entities';
import { SCHEMA_REGISTRY } from '../sync/entitySchemas';

export interface EntityMeta {
  /** PocketBase collection name */
  collection: string;
  /** Primary key field in local SQLite */
  localPk: string;
  /** Primary key field in PocketBase */
  remotePk: string;
  /** Whether this entity supports soft delete */
  softDelete: boolean;
}

export const ENTITY_REGISTRY: Record<SyncEntity, EntityMeta> = SCHEMA_REGISTRY;

/** Get entity meta by sync entity name. Throws if unknown. */
export function getEntityMeta(entity: SyncEntity): EntityMeta {
  const meta = ENTITY_REGISTRY[entity];
  if (!meta) throw new Error(`Unknown entity: ${entity}`);
  return meta;
}
