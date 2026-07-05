import { describe, it, expect } from 'vitest';
import { mergeSyncPatch, STORE_KEY_TO_ENTITY } from './mergeSyncPatch';
import type { MobileStore } from '../../store/useAppStore';

/**
 * Build a minimal MobileStore mock with only the fields mergeSyncPatch touches.
 * Cast through `unknown` so we don't need every slice property.
 */
function makeStore(overrides: Record<string, unknown> = {}): MobileStore {
  return {
    thoughtTrails: [],
    reflections: [],
    ...overrides,
  } as unknown as MobileStore;
}

describe('mergeSyncPatch', () => {
  // ── basic delta merge ──────────────────────────────────────────

  it('merges delta by id into existing array', () => {
    const state = makeStore({
      habits: [
        { id: 'h1', name: 'Meditate', updatedAt: 100 },
        { id: 'h2', name: 'Exercise', updatedAt: 100 },
      ],
    });

    const patch = {
      habits: [{ id: 'h2', name: 'Exercise (updated)', updatedAt: 200 }],
    };

    const result = mergeSyncPatch(state, patch);

    expect(result.changedEntities).toEqual(['habit']);
    const merged = (result.storePatch as Record<string, unknown[]>).habits!;
    expect(merged).toHaveLength(2);
    // h2 should be replaced with the delta version
    expect(merged.find((h: any) => h.id === 'h2')).toEqual({
      id: 'h2',
      name: 'Exercise (updated)',
      updatedAt: 200,
    });
    // h1 should remain untouched
    expect(merged.find((h: any) => h.id === 'h1')).toEqual({
      id: 'h1',
      name: 'Meditate',
      updatedAt: 100,
    });
  });

  it('appends when existing array is empty', () => {
    const state = makeStore({ habits: [] });

    const patch = {
      habits: [{ id: 'h1', name: 'Meditate', updatedAt: 100 }],
    };

    const result = mergeSyncPatch(state, patch);

    expect(result.changedEntities).toEqual(['habit']);
    expect(result.storePatch).toEqual({
      habits: [{ id: 'h1', name: 'Meditate', updatedAt: 100 }],
    });
  });

  it('uses delta directly when store key is undefined', () => {
    const state = makeStore({});

    const patch = {
      habits: [{ id: 'h1', name: 'New habit', updatedAt: 100 }],
    };

    const result = mergeSyncPatch(state, patch);

    expect(result.storePatch).toEqual({
      habits: [{ id: 'h1', name: 'New habit', updatedAt: 100 }],
    });
  });

  // ── non-array store keys ──────────────────────────────────────

  it('handles totalMedMinutes scalar', () => {
    const state = makeStore();

    const result = mergeSyncPatch(state, { totalMedMinutes: 42 });

    expect(result.storePatch).toEqual({ totalMedMinutes: 42 });
    expect(result.changedEntities).toEqual([]);
  });

  it('handles aiMode and aiModels', () => {
    const state = makeStore();

    const result = mergeSyncPatch(state, {
      aiMode: 'ask',
      aiModels: [{ id: 'm1', name: 'GPT' }],
    });

    expect(result.storePatch).toEqual({
      aiMode: 'ask',
      aiModels: [{ id: 'm1', name: 'GPT' }],
    });
    expect(result.changedEntities).toEqual(['aiConfig', 'aiConfig']);
  });

  // ── thoughtTrailIds reconciliation ────────────────────────────

  it('reconciles thoughtTrailIds on reflections', () => {
    const state = makeStore({
      thoughtTrails: [
        { id: 'trail1', deleted: false, reflectionIds: ['r1', 'r2'] },
        { id: 'trail2', deleted: false, reflectionIds: ['r1'] },
      ],
      reflections: [
        { id: 'r1', thoughtTrailIds: [] as string[], text: 'hello' },
        { id: 'r2', thoughtTrailIds: [] as string[], text: 'world' },
      ],
    });

    const patch = {
      thoughtTrails: [{ id: 'trail1', deleted: false, reflectionIds: ['r1', 'r2'] }],
    };

    const result = mergeSyncPatch(state, patch);

    expect(result.changedEntities).toContain('thoughtTrail');
    const reflections = result.storePatch.reflections as unknown as Record<string, unknown>[];
    expect(reflections).toBeDefined();
    const r1 = reflections.find((r: any) => r.id === 'r1');
    const r2 = reflections.find((r: any) => r.id === 'r2');
    expect((r1 as any).thoughtTrailIds).toEqual(
      expect.arrayContaining(['trail1', 'trail2']),
    );
    expect((r2 as any).thoughtTrailIds).toEqual(['trail1']);
  });

  it('skips deleted trails in reconciliation', () => {
    const state = makeStore({
      thoughtTrails: [
        { id: 'trail1', deleted: true, reflectionIds: ['r1'] },
      ],
      reflections: [
        { id: 'r1', thoughtTrailIds: ['trail1'] as string[], text: 'hello' },
      ],
    });

    // No reflections in patch — reconciliation runs against state.reflections
    const patch = {
      thoughtTrails: [{ id: 'trail1', deleted: true, reflectionIds: ['r1'] }],
    };

    const result = mergeSyncPatch(state, patch);

    // trail1 is deleted so it's excluded from the reconciliation map;
    // thoughtTrailIds should be reconciled to [] (was ['trail1'])
    const reflections = result.storePatch.reflections as unknown as Record<string, unknown>[];
    expect(reflections).toBeDefined();
    const r1 = reflections.find((r: any) => r.id === 'r1');
    expect((r1 as any).thoughtTrailIds).toEqual([]);
  });

  it('does not include reflections in patch when nothing changed', () => {
    const state = makeStore({
      thoughtTrails: [
        { id: 'trail1', deleted: false, reflectionIds: ['r1'] },
      ],
      reflections: [
        { id: 'r1', thoughtTrailIds: ['trail1'] as string[], text: 'hello' },
      ],
    });

    const patch = {
      thoughtTrails: [{ id: 'trail1', deleted: false, reflectionIds: ['r1'] }],
    };

    const result = mergeSyncPatch(state, patch);

    // thoughtTrailIds already match — reflections should NOT appear in patch
    expect(result.storePatch.reflections).toBeUndefined();
  });

  // ── empty / edge cases ────────────────────────────────────────

  it('returns empty patch for empty input', () => {
    const state = makeStore();

    const result = mergeSyncPatch(state, {});

    expect(result.storePatch).toEqual({});
    expect(result.changedEntities).toEqual([]);
  });

  it('ignores unknown patch keys', () => {
    const state = makeStore();

    const result = mergeSyncPatch(state, { unknownKey: 'value' });

    expect(result.storePatch).toEqual({});
    expect(result.changedEntities).toEqual([]);
  });

  // ── STORE_KEY_TO_ENTITY completeness ──────────────────────────

  it('maps every store key to a non-empty entity name', () => {
    for (const [key, entity] of Object.entries(STORE_KEY_TO_ENTITY)) {
      expect(typeof key).toBe('string');
      expect(key.length).toBeGreaterThan(0);
      expect(typeof entity).toBe('string');
      expect(entity.length).toBeGreaterThan(0);
    }
  });
});
