// ─── WriteBatcher flush error policy (pure, unit-testable) ──────
// Extracted from WriteBatcher.ts so the NOT NULL retry decision can be
// tested without a live SQLite database (see flushPolicy.test.ts).

/** Max NOT NULL retries before we give up and drop the record. Bounds the
 * retry loop so a deterministic schema mismatch can't spin forever. */
export const NOT_NULL_MAX_ATTEMPTS = 10;

/** True when a SQLite error is a NOT NULL constraint failure (an entity's
 * toRow() omits a required column). */
export function isNotNullConstraintError(message: string): boolean {
  return message.includes('NOT NULL constraint');
}

export type NotNullRetryAction = 'report' | 'keep' | 'giveup';

export interface NotNullRetryDecision {
  /** 'report' = first failure, surface to telemetry; 'keep' = retry next flush;
   *  'giveup' = stop retrying and drop the record. */
  action: NotNullRetryAction;
  /** Attempt counter after this decision (for the next call). */
  nextAttempts: number;
}

/**
 * Decide what to do with a record that failed the flush due to a NOT NULL
 * constraint, given how many times it has already failed.
 *
 * - 1st failure → 'report' (surface once via onPersistError) and keep retrying
 * - subsequent failures (< max) → 'keep' (stay pending, retry next flush)
 * - reaching the max → 'giveup' (drop from the queue so it stops looping)
 *
 * The record is never silently discarded on the first failure — it stays in the
 * pending queue and is surfaced, so local data is not lost without a trace.
 */
export function decideNotNullRetry(prevAttempts: number): NotNullRetryDecision {
  const nextAttempts = prevAttempts + 1;
  if (prevAttempts === 0) {
    return { action: 'report', nextAttempts };
  }
  if (nextAttempts >= NOT_NULL_MAX_ATTEMPTS) {
    return { action: 'giveup', nextAttempts };
  }
  return { action: 'keep', nextAttempts };
}
