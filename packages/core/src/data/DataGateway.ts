// ─── Unified Data Gateway Interface ──────────────────────────────
// Platform-agnostic data access abstraction.
// Mobile implements via SQLite + sync_queue, Web via REST.

export interface DataGateway {
  /** Get a single entity by ID. Returns null if not found. */
  get<T>(entity: string, id: string): Promise<T | null>;

  /** List entities with optional filter. Returns all matching records. */
  list<T>(entity: string, filter?: Record<string, unknown>): Promise<T[]>;

  /** Insert or update an entity. */
  upsert<T>(entity: string, id: string, data: T): Promise<void>;

  /** Delete an entity by ID. */
  delete(entity: string, id: string): Promise<void>;

  /** Subscribe to entity changes (optional, for realtime). Returns unsubscribe function. */
  subscribe?(entity: string, callback: (event: DataChangeEvent) => void): () => void;
}

export interface DataChangeEvent {
  action: 'create' | 'update' | 'delete';
  entity: string;
  id: string;
  data?: unknown;
}

/** No-op gateway for testing or when no backend is available. */
export class NoopDataGateway implements DataGateway {
  async get() { return null; }
  async list() { return []; }
  async upsert() {}
  async delete() {}
}
