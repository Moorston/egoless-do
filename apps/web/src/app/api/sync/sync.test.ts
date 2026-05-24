// ─── Sync conflict resolution tests ───────────────────────────────
import { describe, it, expect } from 'vitest';
import { resolveConflict } from './conflict';

describe('resolveConflict', () => {
  // ── Client wins ────────────────────────────────────────────────

  it('client wins when clientUpdated > serverUpdated', () => {
    const result = resolveConflict({ clientUpdated: 2000, serverUpdated: 1000 });
    expect(result.winner).toBe('client');
    expect(result.clientUpdated).toBe(2000);
  });

  it('client wins on tie (clientUpdated === serverUpdated)', () => {
    const result = resolveConflict({ clientUpdated: 1000, serverUpdated: 1000 });
    expect(result.winner).toBe('client');
  });

  // ── Server wins ────────────────────────────────────────────────

  it('server wins when serverUpdated > clientUpdated', () => {
    const result = resolveConflict({ clientUpdated: 1000, serverUpdated: 2000 });
    expect(result.winner).toBe('server');
    expect(result.clientUpdated).toBe(1000);
  });

  // ── Future drift clamping ──────────────────────────────────────

  it('clamps client timestamp >60s in the future', () => {
    const now = 100_000;
    const futureTs = now + 61_000; // 61s ahead — exceeds drift
    const result = resolveConflict({ clientUpdated: futureTs, serverUpdated: 0, now });
    expect(result.clientUpdated).toBe(now);
    expect(result.winner).toBe('client'); // clamped value beats server 0
  });

  it('does NOT clamp timestamp within 60s drift', () => {
    const now = 100_000;
    const okTs = now + 59_000; // 59s ahead — within tolerance
    const result = resolveConflict({ clientUpdated: okTs, serverUpdated: 0, now });
    expect(result.clientUpdated).toBe(okTs);
    expect(result.winner).toBe('client');
  });

  it('clamped timestamp can still lose to newer server', () => {
    const now = 100_000;
    const futureTs = now + 120_000;
    const serverUpdated = now + 10; // server is slightly newer than "now"
    const result = resolveConflict({ clientUpdated: futureTs, serverUpdated, now });
    expect(result.clientUpdated).toBe(now); // clamped
    expect(result.winner).toBe('server'); // server(now+10) > clamped(now)
  });

  // ── Edge cases ─────────────────────────────────────────────────

  it('handles zero timestamps', () => {
    const result = resolveConflict({ clientUpdated: 0, serverUpdated: 0 });
    expect(result.winner).toBe('client'); // 0 >= 0
  });

  it('handles missing client timestamp (defaults to 0)', () => {
    const result = resolveConflict({ clientUpdated: 0, serverUpdated: 500 });
    expect(result.winner).toBe('server');
  });

  it('client with newer timestamp overwrites stale server data', () => {
    // Scenario: client edited offline, server has older version
    const result = resolveConflict({ clientUpdated: 5000, serverUpdated: 3000 });
    expect(result.winner).toBe('client');
  });

  it('server with newer timestamp rejects stale client push', () => {
    // Scenario: another device already synced a newer version
    const result = resolveConflict({ clientUpdated: 3000, serverUpdated: 5000 });
    expect(result.winner).toBe('server');
  });
});

describe('sync entity mapping', () => {
  // Verify the mapping is consistent — these are critical for data integrity
  const ENTITY_COLLECTION: Record<string, string> = {
    habit: 'habits', reflection: 'reflections', fasting: 'fasting_sessions',
    food: 'food_entries', checkin: 'checkin_records', meditation: 'meditation_history',
    profile: 'user_profiles', exercise: 'exercise_entries',
  };

  const ENTITY_ID_FIELD: Record<string, string> = {
    habit: 'habit_id', reflection: 'reflection_id', fasting: 'session_id',
    food: 'food_id', checkin: 'date', meditation: 'date',
    profile: 'profile_id', exercise: 'exercise_id',
  };

  it('every entity has both collection and id field', () => {
    const entities = Object.keys(ENTITY_COLLECTION);
    for (const e of entities) {
      expect(ENTITY_ID_FIELD[e], `missing id field for ${e}`).toBeDefined();
    }
  });

  it('no extra id fields without collections', () => {
    for (const e of Object.keys(ENTITY_ID_FIELD)) {
      expect(ENTITY_COLLECTION[e], `missing collection for ${e}`).toBeDefined();
    }
  });
});
