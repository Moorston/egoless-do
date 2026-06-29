// ── Pure conflict resolution logic (shared across platforms) ────

export interface ConflictInput {
  clientUpdated: number;
  serverUpdated: number;
  clientDeleted?: boolean;
  serverDeleted?: boolean;
}

export interface ConflictResult {
  winner: 'client' | 'server';
}

/** Resolve which side wins a sync conflict.
 *  Rule: server is the single authority.
 *  - Larger updatedAt wins
 *  - Ties → server wins
 *  - Deleted ties → delete wins (safety)
 */
export function resolveConflict({ clientUpdated, serverUpdated, clientDeleted, serverDeleted }: ConflictInput): ConflictResult {
  if (clientDeleted || serverDeleted) {
    if (clientUpdated > serverUpdated) return { winner: 'client' };
    if (clientUpdated < serverUpdated) return { winner: 'server' };
    if (clientDeleted && !serverDeleted) return { winner: 'client' };
    return { winner: 'server' };
  }
  return {
    winner: clientUpdated > serverUpdated ? 'client' : 'server',
  };
}

/** Merge server fields into local data for field-level conflict resolution.
 *  Only applies changedFields from the winning side, preserving local values for other fields.
 */
export function mergeFieldLevel(
  local: Record<string, unknown>,
  server: Record<string, unknown>,
  changedFields: string[],
): Record<string, unknown> {
  const result = { ...local };
  for (const field of changedFields) {
    if (field in server) {
      result[field] = server[field];
    }
  }
  return result;
}
