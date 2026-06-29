// ─── Data transformation utilities ───────────────────────────────
// Convert between snake_case and camelCase for API compatibility.

/**
 * Convert snake_case string to camelCase
 */
export function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Convert camelCase string to snake_case (handles acronyms correctly)
 */
export function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .replace(/([a-z\d])([A-Z])/g, '$1_$2')
    .toLowerCase();
}

/** Internal helper to transform object keys recursively */
function transformKeys<T>(obj: unknown, keyFn: (key: string) => string): T {
  if (Array.isArray(obj)) {
    return obj.map(item => transformKeys(item, keyFn)) as T;
  }

  if (obj !== null && typeof obj === 'object' && Object.getPrototypeOf(obj) === Object.prototype) {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([key, value]) => [
        keyFn(key),
        transformKeys(value, keyFn),
      ])
    ) as T;
  }

  return obj as T;
}

/**
 * Convert object keys from snake_case to camelCase
 */
export function keysToCamel<T>(obj: unknown): T {
  return transformKeys(obj, toCamelCase);
}

/**
 * Convert object keys from camelCase to snake_case
 */
export function keysToSnake<T>(obj: unknown): T {
  return transformKeys(obj, toSnakeCase);
}
