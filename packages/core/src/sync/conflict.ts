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
