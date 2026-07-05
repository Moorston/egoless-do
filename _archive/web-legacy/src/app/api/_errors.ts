/** Sanitize error messages for client responses.
 *  In development, return the actual error for debugging.
 *  In production, return a generic fallback to avoid leaking internals. */
export function sanitizeError(err: unknown, fallback: string): string {
  if (process.env.NODE_ENV === 'development') {
    return err instanceof Error ? err.message : fallback;
  }
  return fallback;
}
