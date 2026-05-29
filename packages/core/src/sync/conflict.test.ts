import { describe, it, expect } from 'vitest';
import { resolveConflict } from './conflict';

describe('resolveConflict', () => {
  it('client wins when newer', () => {
    const result = resolveConflict({ clientUpdated: 2000, serverUpdated: 1000, now: 3000 });
    expect(result.winner).toBe('client');
  });
  it('server wins when newer', () => {
    const result = resolveConflict({ clientUpdated: 1000, serverUpdated: 2000, now: 3000 });
    expect(result.winner).toBe('server');
  });
  it('client wins on tie', () => {
    const result = resolveConflict({ clientUpdated: 1000, serverUpdated: 1000, now: 3000 });
    expect(result.winner).toBe('client');
  });
  it('clamps future-drift timestamp to now', () => {
    const result = resolveConflict({ clientUpdated: 9999999999999, serverUpdated: 1000, now: 5000 });
    expect(result.winner).toBe('client');
    expect(result.clientUpdated).toBe(5000);
  });
  it('allows timestamps within 60s of now', () => {
    const result = resolveConflict({ clientUpdated: 5059000, serverUpdated: 1000, now: 5000000 });
    expect(result.winner).toBe('client');
    expect(result.clientUpdated).toBe(5059000);
  });
});
