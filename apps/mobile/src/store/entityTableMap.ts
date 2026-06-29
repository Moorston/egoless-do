// ─── Entity-to-SQLite table mapping for generic persistence ────
// toRow functions are now derived from SCHEMAS in entitySchemas.ts.

import type { SyncEntity } from '@egoless-do/core';
import { SCHEMAS, buildToRow } from '@egoless-do/core';

interface EntityConfig {
  table: string;
  pk: string;
  toRow: (data: Record<string, unknown>) => Record<string, unknown>;
}

/** Build ENTITY_TABLE_MAP from SCHEMAS — single source of truth. */
function buildEntityTableMap(): Record<SyncEntity, EntityConfig> {
  const entries = (Object.keys(SCHEMAS) as SyncEntity[]).map(key => {
    const schema = SCHEMAS[key];
    return [key, {
      table: schema.sqlite.table,
      pk: schema.sqlite.pk,
      toRow: buildToRow(schema),
    }] as const;
  });
  return Object.fromEntries(entries) as Record<SyncEntity, EntityConfig>;
}

export const ENTITY_TABLE_MAP: Record<SyncEntity, EntityConfig> = buildEntityTableMap();
