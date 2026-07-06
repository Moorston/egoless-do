// ─── Error utilities ────────────────────────────────────────────────
// Shared helpers for safe error handling with `catch (err: unknown)`.

/** Safely extract an error message from an unknown catch variable. */
export function errMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'Unknown error';
}

/** Safely extract a status code from a PocketBase-style error. */
export function errStatus(err: unknown): number | undefined {
  if (err && typeof err === 'object' && 'status' in err) {
    const s = (err as Record<string, unknown>).status;
    return typeof s === 'number' ? s : undefined;
  }
  return undefined;
}
