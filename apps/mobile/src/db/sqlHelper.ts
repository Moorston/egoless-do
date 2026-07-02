// ─── SQL Helper Functions ──────────────────────────────────────────
// Centralized SQL utilities for safe parameterized queries.
// Prevents SQL injection by validating column/table names.

import type { SQLiteDatabase } from 'expo-sqlite';

/** Validate that a name contains only safe characters (alphanumeric + underscore). */
export function isValidSqlName(name: string): boolean {
  return /^[a-zA-Z_][a-zA-Z-9_]*$/.test(name);
}

/** Build a parameterized SET clause from column names.
 *  Returns { clause, values } for use with db.runAsync.
 *  Throws if any column name contains invalid characters. */
export function buildSetClause(
  columns: string[],
  values: (string | number | null)[],
): { clause: string; values: (string | number | null)[] } {
  for (const col of columns) {
    if (!isValidSqlName(col)) {
      throw new Error(`Invalid SQL column name: ${col}`);
    }
  }
  const clause = columns.map(c => `${c}=?`).join(',');
  return { clause, values };
}

/** Build a parameterized INSERT statement.
 *  Returns the full SQL string and values array. */
export function buildInsertStatement(
  table: string,
  columns: string[],
  values: (string | number | null)[],
): { sql: string; values: (string | number | null)[] } {
  if (!isValidSqlName(table)) {
    throw new Error(`Invalid SQL table name: ${table}`);
  }
  for (const col of columns) {
    if (!isValidSqlName(col)) {
      throw new Error(`Invalid SQL column name: ${col}`);
    }
  }
  const placeholders = columns.map(() => '?').join(',');
  const sql = `INSERT INTO ${table} (${columns.join(',')}) VALUES (${placeholders})`;
  return { sql, values };
}

/** Build a parameterized UPDATE statement with SET clause. */
export function buildUpdateStatement(
  table: string,
  setColumns: string[],
  setValues: (string | number | null)[],
  whereColumn: string,
  whereValue: string | number,
): { sql: string; values: (string | number | null)[] } {
  if (!isValidSqlName(table)) {
    throw new Error(`Invalid SQL table name: ${table}`);
  }
  if (!isValidSqlName(whereColumn)) {
    throw new Error(`Invalid SQL where column: ${whereColumn}`);
  }
  const { clause, values } = buildSetClause(setColumns, setValues);
  const sql = `UPDATE ${table} SET ${clause} WHERE ${whereColumn}=?`;
  return { sql, values: [...values, whereValue] };
}

/** Build a parameterized DELETE statement with IN clause. */
export function buildDeleteInStatement(
  table: string,
  column: string,
  ids: (string | number)[],
): { sql: string; values: (string | number)[] } {
  if (!isValidSqlName(table)) {
    throw new Error(`Invalid SQL table name: ${table}`);
  }
  if (!isValidSqlName(column)) {
    throw new Error(`Invalid SQL column name: ${column}`);
  }
  if (!ids.length) {
    throw new Error('buildDeleteInStatement: ids array is empty');
  }
  const placeholders = ids.map(() => '?').join(',');
  const sql = `DELETE FROM ${table} WHERE ${column} IN (${placeholders})`;
  return { sql, values: ids };
}

/** Build a parameterized SELECT statement with IN clause. */
export function buildSelectInStatement<T>(
  table: string,
  column: string,
  ids: (string | number)[],
  selectColumns = '*',
): { sql: string; values: (string | number)[] } {
  if (!isValidSqlName(table)) {
    throw new Error(`Invalid SQL table name: ${table}`);
  }
  if (!isValidSqlName(column)) {
    throw new Error(`Invalid SQL column name: ${column}`);
  }
  if (!ids.length) {
    throw new Error('buildSelectInStatement: ids array is empty');
  }
  const placeholders = ids.map(() => '?').join(',');
  const sql = `SELECT ${selectColumns} FROM ${table} WHERE ${column} IN (${placeholders})`;
  return { sql, values: ids };
}

/** Sync queue UPSERT SQL — safe for concurrent access.
 *  When a 'syncing' item is overwritten, preserves the in-flight operation/status
 *  but updates the payload so the next sync round picks up the latest data. */
export const SYNC_QUEUE_UPSERT_SQL = `INSERT INTO sync_queue (entity, entity_id, operation, payload, created_at, status)
  VALUES (?, ?, ?, ?, ?, ?)
  ON CONFLICT(entity, entity_id) DO UPDATE SET
    operation = CASE WHEN sync_queue.status = 'syncing' THEN sync_queue.operation ELSE excluded.operation END,
    payload = excluded.payload,
    created_at = CASE WHEN sync_queue.status = 'syncing' THEN sync_queue.created_at ELSE excluded.created_at END,
    status = CASE WHEN sync_queue.status = 'syncing' THEN 'syncing' ELSE 'pending' END,
    retry_count = CASE WHEN sync_queue.status = 'syncing' THEN sync_queue.retry_count ELSE 0 END,
    next_retry_at = 0,
    last_error = NULL`;
