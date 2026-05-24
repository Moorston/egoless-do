import type { StateCreator } from 'zustand';
import type { MindReflection } from '@egoless-do/core';
import { createReflection } from '@egoless-do/core';
import { enqueueChange } from '../../db/syncQueue';
import type { SyncEntity } from '../../db/webDb';
import type { WebStore } from '../useWebStore';

function q(entity: SyncEntity, id: string, op: 'upsert' | 'delete', payload: unknown) {
  enqueueChange(entity, id, op, payload).catch((e) => console.error('[err]', e));
}

export interface ReflectionSlice {
  reflections: MindReflection[];
  addReflection: (params: Parameters<typeof createReflection>[0]) => void;
  togglePin: (id: string) => void;
  deleteReflection: (id: string) => void;
}

export const createReflectionSlice: StateCreator<WebStore, [], [], ReflectionSlice> = (set, get) => ({
  reflections: [],

  addReflection(params) {
    const r = createReflection(params);
    set(s => ({ reflections: [r, ...s.reflections] }));
    q('reflection', r.id, 'upsert', r);
  },

  togglePin(id) {
    const now = Date.now();
    set(s => ({
      reflections: s.reflections.map(r => r.id === id ? { ...r, isPinned: !r.isPinned, updatedAt: now } : r),
    }));
    const updated = get().reflections.find(r => r.id === id);
    if (updated) q('reflection', id, 'upsert', updated);
  },

  deleteReflection(id) {
    set(s => ({ reflections: s.reflections.filter(r => r.id !== id) }));
    q('reflection', id, 'delete', { updatedAt: Date.now() });
  },
});
