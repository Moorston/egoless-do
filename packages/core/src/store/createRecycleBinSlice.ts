import type { RecycleBinItem, RecycleBinEntityType } from '../types';
import type { RecycleBinSlice, StorageAdapter } from './types';
import type { SyncEntity } from '../sync/entities';
import type { SliceCreator } from './sliceHelper';

const EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const ENTITY_TYPE_MAP: Record<RecycleBinEntityType, SyncEntity> = {
  habit: 'habit',
  reflection: 'reflection',
  food: 'food',
  exercise: 'exercise',
  plan: 'plan',
};

export function createRecycleBinSlice(adapter?: StorageAdapter): SliceCreator<RecycleBinSlice> {
  return (set: any, get: any) => ({
    recycleBin: [],

    addToRecycleBin(item: Omit<RecycleBinItem, 'deletedAt'>) {
      const entry: RecycleBinItem = { ...item, deletedAt: Date.now() };
      set(s => ({ recycleBin: [entry, ...(s.recycleBin ?? [])] }));
    },

    restoreFromRecycleBin(id: string) {
      const state = get();
      const item = state.recycleBin.find(r => r.id === id);
      if (!item) return;

      // Restore to the appropriate array based on entity type
      const restoreMap: Record<RecycleBinEntityType, keyof typeof state> = {
        habit: 'habits',
        reflection: 'reflections',
        food: 'foodLog',
        exercise: 'exerciseLog',
        plan: 'plans',
      };

      const targetKey = restoreMap[item.entityType as RecycleBinEntityType];
      if (targetKey) {
        const restoredData = { ...item.data, deleted: false, updatedAt: Date.now() };
        const now = Date.now();

        // Pre-compute child items for plan restoration BEFORE set()
        let childItems: Array<{ id: string; planId: string; deleted?: boolean }> = [];
        let childCheckins: Array<{ id: string; planItemId: string; deleted?: boolean }> = [];
        let childTodos: Array<{ id: string; planId: string; deleted?: boolean }> = [];
        let childTodoHistory: Array<{ id: string; planId: string; deleted?: boolean }> = [];
        if (item.entityType === 'plan') {
          const state = get();
          const planItems = (state.planItems ?? []) as Array<{ id: string; planId: string; deleted?: boolean }>;
          const planItemCheckins = (state.planItemCheckins ?? []) as Array<{ id: string; planItemId: string; deleted?: boolean }>;
          childItems = planItems.filter(pi => pi.planId === item.id && pi.deleted);
          childCheckins = planItemCheckins.filter(
            pic => childItems.some(ci => ci.id === pic.planItemId) && pic.deleted
          );
          childTodos = ((state.dailyCustomTodos ?? []) as Array<{ id: string; planId: string; deleted?: boolean }>)
            .filter(t => t.planId === item.id && t.deleted);
          childTodoHistory = ((state.dailyTodoHistory ?? []) as Array<{ id: string; planId: string; deleted?: boolean }>)
            .filter(t => t.planId === item.id && t.deleted);
        }

        // Single atomic set: recycle bin + target + plan children
        set((s: any) => ({
          recycleBin: s.recycleBin.filter((r: any) => r.id !== id),
          [targetKey]: [...((s[targetKey] as any[]) ?? []).filter((x: any) => x.id !== id), restoredData],
          ...(item.entityType === 'plan' ? {
            planItems: (s.planItems ?? []).map((pi: any) =>
              pi.planId === item.id && pi.deleted ? { ...pi, deleted: false, updatedAt: now } : pi
            ),
            planItemCheckins: (s.planItemCheckins ?? []).map((pic: any) =>
              childItems.some((ci: any) => ci.id === pic.planItemId) && pic.deleted
                ? { ...pic, deleted: false, updatedAt: now } : pic
            ),
            dailyCustomTodos: (s.dailyCustomTodos ?? []).map((t: any) =>
              t.planId === item.id && t.deleted ? { ...t, deleted: false, updatedAt: now } : t
            ),
            dailyTodoHistory: (s.dailyTodoHistory ?? []).map((t: any) =>
              t.planId === item.id && t.deleted ? { ...t, deleted: false, updatedAt: now } : t
            ),
          } : {}),
        }));

        // Persist to SQLite and enqueue for sync (overwrites deleted=1 row)
        const syncEntity = ENTITY_TYPE_MAP[item.entityType as RecycleBinEntityType];
        if (syncEntity && adapter) {
          adapter.persistChange(syncEntity, item.id, restoredData).catch(console.error);
        }

        // For plans, also persist child entities
        if (item.entityType === 'plan' && adapter) {
          for (const ci of childItems) {
            adapter.persistChange('planItem', ci.id, { ...ci, deleted: false, updatedAt: now }).catch(console.error);
          }
          for (const cic of childCheckins) {
            adapter.persistChange('planItemCheckin', cic.id, { ...cic, deleted: false, updatedAt: now }).catch(console.error);
          }
          for (const todo of childTodos) {
            adapter.persistChange('dailyCustomTodo', todo.id, { ...todo, deleted: false, updatedAt: now } as any).catch(console.error);
          }
          for (const hist of childTodoHistory) {
            adapter.persistChange('dailyTodoHistory', hist.id, { ...hist, deleted: false, updatedAt: now } as any).catch(console.error);
          }
        }
      }
    },

    removeFromRecycleBin(id: string) {
      set(s => ({ recycleBin: s.recycleBin.filter(r => r.id !== id) }));
    },

    emptyRecycleBin() {
      set({ recycleBin: [] });
    },

    cleanupRecycleBin() {
      const now = Date.now();
      set(s => ({
        recycleBin: (s.recycleBin ?? []).filter(r => now - r.deletedAt < EXPIRY_MS),
      }));
    },
  });
}
