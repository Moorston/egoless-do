// ─── PocketBase Filter Escape ──────────────────────────────────────
// Matches the server-side escapeFilter in infra/docker/api/src/pb.ts.
// Escapes special characters that could break PocketBase filter expressions
// or allow filter injection.

/**
 * Escape special characters for PocketBase filter strings.
 * Prevents filter injection by neutralizing characters that have
 * syntactic meaning in PB filter expressions.
 */
export function escapeFilter(value: string): string {
  if (value.length > 1000) {
    value = value.slice(0, 1000);
  }
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/'/g, "\\'")
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/\0/g, '');
}
