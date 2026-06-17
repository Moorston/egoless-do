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

      // Remove from recycle bin
      set(s => ({ recycleBin: s.recycleBin.filter(r => r.id !== id) }));

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
        const restoredData = { ...item.data, deleted: false };
        // Remove existing soft-deleted copy before appending restored item
        set(s => ({ [targetKey]: [...((s[targetKey] as any[]) ?? []).filter((x: any) => x.id !== id), restoredData] }));
        // Persist to SQLite and enqueue for sync (overwrites deleted=1 row)
        const syncEntity = ENTITY_TYPE_MAP[item.entityType as RecycleBinEntityType];
        if (syncEntity && adapter) {
          adapter.persistChange(syncEntity, item.id, restoredData).catch(console.error);
        }

        // For plans, also restore child planItems and planItemCheckins
        if (item.entityType === 'plan' && adapter) {
          const planItems = (get() as any).planItems as any[] ?? [];
          const planItemCheckins = (get() as any).planItemCheckins as any[] ?? [];
          const childItems = planItems.filter(pi => pi.planId === item.id && pi.deleted);
          const childCheckins = planItemCheckins.filter(
            pic => childItems.some((ci: any) => ci.id === pic.planItemId) && pic.deleted
          );

          set(s => ({
            planItems: (s.planItems ?? []).map((pi: any) =>
              pi.planId === item.id && pi.deleted ? { ...pi, deleted: false } : pi
            ),
            planItemCheckins: (s.planItemCheckins ?? []).map((pic: any) =>
              childItems.some((ci: any) => ci.id === pic.planItemId) && pic.deleted
                ? { ...pic, deleted: false } : pic
            ),
          }));

          for (const ci of childItems) {
            adapter.persistChange('planItem', ci.id, { ...ci, deleted: false }).catch(console.error);
          }
          for (const cic of childCheckins) {
            adapter.persistChange('planItemCheckin', cic.id, { ...cic, deleted: false }).catch(console.error);
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
