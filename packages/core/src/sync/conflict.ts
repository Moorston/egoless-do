// ── Pure conflict resolution logic (shared across platforms) ────

const MAX_FUTURE_DRIFT = 60_000; // allow 1 min clock skew

export interface ConflictInput {
  clientUpdated: number;
  serverUpdated: number;
  now?: number; // injectable for testing
}

export interface ConflictResult {
  clientUpdated: number;
  winner: 'client' | 'server';
}

/** Resolve which side wins a sync conflict using timestamp comparison.
 *  Clamps future-drift timestamps to `now`. Client wins ties. */
export function resolveConflict({ clientUpdated, serverUpdated, now }: ConflictInput): ConflictResult {
  const t = now ?? Date.now();
  let adj = clientUpdated;

  // Reject timestamps too far in the future
  if (adj > t + MAX_FUTURE_DRIFT) {
    adj = t;
  }

  return {
    clientUpdated: adj,
    winner: adj >= serverUpdated ? 'client' : 'server',
  };
}
