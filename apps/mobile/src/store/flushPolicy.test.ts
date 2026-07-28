// ─── flushPolicy tests ──────────────────────────────────────────
import { describe, it, expect } from 'vitest';

import {
  NOT_NULL_MAX_ATTEMPTS,
  isNotNullConstraintError,
  decideNotNullRetry,
} from './flushPolicy';

describe('isNotNullConstraintError', () => {
  it('detects a NOT NULL constraint failure', () => {
    expect(isNotNullConstraintError(
      'NOT NULL constraint failed: mind_reflections.content',
    )).toBe(true);
  });

  it('returns false for other errors', () => {
    expect(isNotNullConstraintError('UNIQUE constraint failed')).toBe(false);
    expect(isNotNullConstraintError('disk I/O error')).toBe(false);
  });
});

describe('decideNotNullRetry', () => {
  it('reports and keeps on the first failure (no silent drop)', () => {
    const d = decideNotNullRetry(0);
    expect(d.action).toBe('report');
    expect(d.nextAttempts).toBe(1);
  });

  it('keeps retrying for intermediate failures', () => {
    expect(decideNotNullRetry(1).action).toBe('keep');
    expect(decideNotNullRetry(5).action).toBe('keep');
    expect(decideNotNullRetry(NOT_NULL_MAX_ATTEMPTS - 2).action).toBe('keep');
  });

  it('gives up once the max attempts is reached', () => {
    // prev = max-1 → next = max → giveup
    const atEdge = decideNotNullRetry(NOT_NULL_MAX_ATTEMPTS - 1);
    expect(atEdge.action).toBe('giveup');
    expect(atEdge.nextAttempts).toBe(NOT_NULL_MAX_ATTEMPTS);

    // Beyond the max stays giveup (idempotent boundary).
    expect(decideNotNullRetry(NOT_NULL_MAX_ATTEMPTS).action).toBe('giveup');
    expect(decideNotNullRetry(NOT_NULL_MAX_ATTEMPTS + 5).action).toBe('giveup');
  });

  it('monotonically increments the attempt counter', () => {
    let prev = 0;
    for (let i = 0; i < NOT_NULL_MAX_ATTEMPTS; i++) {
      const d = decideNotNullRetry(prev);
      expect(d.nextAttempts).toBe(prev + 1);
      prev = d.nextAttempts;
    }
  });
});
