import type { RecycleBinItem, RecycleBinEntityType, PlanItem, PlanItemCheckin, DailyCustomTodo, DailyTodoHistory } from '../types';
import type { RecycleBinSlice, StorageAdapter, FullStore } from './types';
import type { SyncEntity } from '../sync/entities';
import type { SliceCreator } from './sliceHelper';
import { MS_PER_WEEK } from '../utils';
import { createLogger } from '../logger';
const log = createLogger('Store');

const EXPIRY_MS = MS_PER_WEEK;

const ENTITY_TYPE_MAP: Record<RecycleBinEntityType, SyncEntity> = {
  habit: 'habit',
  reflection: 'reflection',
  food: 'food',
  exercise: 'exercise',
  plan: 'plan',
  breath: 'breath',
};

export function createRecycleBinSlice(adapter: StorageAdapter): SliceCreator<RecycleBinSlice> {
  return (set, get) => ({
    recycleBin: [],

    addToRecycleBin(item: Omit<RecycleBinItem, 'deletedAt'>) {
      const entry: RecycleBinItem = { ...item, deletedAt: Date.now() };
      let newBin: RecycleBinItem[];
      set(s => { newBin = [entry, ...(s.recycleBin ?? [])]; return { recycleBin: newBin }; });
      adapter.persistSettings('recycleBin', newBin!).catch(e => log.error(e));
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
        breath: 'breathHistory',
      };

      const targetKey = restoreMap[item.entityType as RecycleBinEntityType];
      if (targetKey) {
        const restoredData = { ...item.data, deleted: false, updatedAt: Date.now() };
        const now = Date.now();

        // Pre-compute child items for plan restoration BEFORE set()
        let childItems: PlanItem[] = [];
        let childCheckins: PlanItemCheckin[] = [];
        let childTodos: DailyCustomTodo[] = [];
        let childTodoHistory: DailyTodoHistory[] = [];
        if (item.entityType === 'plan') {
          const state = get();
          childItems = (state.planItems ?? []).filter(pi => pi.planId === item.id && pi.deleted);
          childCheckins = (state.planItemCheckins ?? []).filter(
            pic => childItems.some(ci => ci.id === pic.planItemId) && pic.deleted
          );
          childTodos = (state.dailyCustomTodos ?? []).filter(t => t.planId === item.id && t.deleted);
          childTodoHistory = (state.dailyTodoHistory ?? []).filter(t => t.planId === item.id && t.deleted);
        }

        // Single atomic set: recycle bin + target + plan children
        set((s: FullStore) => ({
          recycleBin: s.recycleBin.filter(r => r.id !== id),
          [targetKey]: [...((s[targetKey] as RecycleBinItem[]) ?? []).filter(x => x.id !== id), restoredData],
          ...(item.entityType === 'plan' ? {
            planItems: (s.planItems ?? []).map(pi =>
              pi.planId === item.id && pi.deleted ? { ...pi, deleted: false, updatedAt: now } : pi
            ),
            planItemCheckins: (s.planItemCheckins ?? []).map(pic =>
              childItems.some(ci => ci.id === pic.planItemId) && pic.deleted
                ? { ...pic, deleted: false, updatedAt: now } : pic
            ),
            dailyCustomTodos: (s.dailyCustomTodos ?? []).map(t =>
              t.planId === item.id && t.deleted ? { ...t, deleted: false, updatedAt: now } : t
            ),
            dailyTodoHistory: (s.dailyTodoHistory ?? []).map(t =>
              t.planId === item.id && t.deleted ? { ...t, deleted: false, updatedAt: now } : t
            ),
          } : {}),
        }));

        // Persist updated recycle bin after restoration
        adapter.persistSettings('recycleBin', (get().recycleBin ?? []).filter(r => r.id !== id)).catch(e => log.error(e));

        // Persist to SQLite and enqueue for sync (overwrites deleted=1 row)
        const syncEntity = ENTITY_TYPE_MAP[item.entityType as RecycleBinEntityType];
        if (syncEntity) {
          adapter.persistChange(syncEntity, item.id, restoredData).catch(e => log.error(e));
        }

        // For plans, also persist child entities
        if (item.entityType === 'plan') {
          for (const ci of childItems) {
            adapter.persistChange('planItem', ci.id, { ...ci, deleted: false, updatedAt: now }).catch(e => log.error(e));
          }
          for (const cic of childCheckins) {
            adapter.persistChange('planItemCheckin', cic.id, { ...cic, deleted: false, updatedAt: now }).catch(e => log.error(e));
          }
          for (const todo of childTodos) {
            adapter.persistChange('dailyCustomTodo', todo.id, { ...todo, deleted: false, updatedAt: now }).catch(e => log.error(e));
          }
          for (const hist of childTodoHistory) {
            adapter.persistChange('dailyTodoHistory', hist.id, { ...hist, deleted: false, updatedAt: now }).catch(e => log.error(e));
          }
        }
      }
    },

    removeFromRecycleBin(id: string) {
      const item = get().recycleBin.find(r => r.id === id);
      if (!item) return;

      // Collect hard-delete operations (entity + cascade children)
      const ops: Array<{ entity: SyncEntity; id: string }> = [];
      const syncEntity = ENTITY_TYPE_MAP[item.entityType as RecycleBinEntityType];
      if (syncEntity) ops.push({ entity: syncEntity, id });

      // Cascade: remove child entities from memory and collect for hard-delete
      const childUpdates: Partial<FullStore> = {};
      if (item.entityType === 'plan') {
        const s = get();
        const items = (s.planItems ?? []).filter(i => i.planId === id);
        const checkinIds = new Set(items.map(i => i.id));
        const checkins = (s.planItemCheckins ?? []).filter(c => checkinIds.has(c.planItemId));
        const todos = (s.dailyCustomTodos ?? []).filter(t => t.planId === id);
        const history = (s.dailyTodoHistory ?? []).filter(t => t.planId === id);

        for (const i of items) ops.push({ entity: 'planItem', id: i.id });
        for (const c of checkins) ops.push({ entity: 'planItemCheckin', id: c.id });
        for (const t of todos) ops.push({ entity: 'dailyCustomTodo', id: t.id });
        for (const h of history) ops.push({ entity: 'dailyTodoHistory', id: h.id });

        childUpdates.planItems = (s.planItems ?? []).filter(i => i.planId !== id);
        childUpdates.planItemCheckins = (s.planItemCheckins ?? []).filter(c => !checkinIds.has(c.planItemId));
        childUpdates.dailyCustomTodos = (s.dailyCustomTodos ?? []).filter(t => t.planId !== id);
        childUpdates.dailyTodoHistory = (s.dailyTodoHistory ?? []).filter(t => t.planId !== id);
      }

      // 1. Remove from memory (recycle bin + entity arrays)
      const entityKey = ({
        habit: 'habits', reflection: 'reflections', food: 'foodLog',
        exercise: 'exerciseLog', plan: 'plans', breath: 'breathHistory',
      } as Record<RecycleBinEntityType, keyof FullStore>)[item.entityType as RecycleBinEntityType];

      set((s: FullStore) => ({
        recycleBin: s.recycleBin.filter(r => r.id !== id),
        ...(entityKey ? { [entityKey]: ((s[entityKey] as Array<{ id: string }>) ?? []).filter(x => x.id !== id) } : {}),
        ...childUpdates,
      } as Partial<FullStore>));

      // 2. Hard-delete from SQLite + enqueue sync push
      adapter.hardDelete(ops).catch(e => log.error(e));

      // 3. Persist updated recycle bin
      adapter.persistSettings('recycleBin', get().recycleBin).catch(e => log.error(e));
    },

    emptyRecycleBin() {
      const items = get().recycleBin ?? [];
      if (items.length === 0) return;

      // Collect all hard-delete operations
      const ops: Array<{ entity: SyncEntity; id: string }> = [];
      const planIds = new Set<string>();

      for (const item of items) {
        const syncEntity = ENTITY_TYPE_MAP[item.entityType as RecycleBinEntityType];
        if (syncEntity) ops.push({ entity: syncEntity, id: item.id });
        if (item.entityType === 'plan') planIds.add(item.id);
      }

      // Cascade plan children
      if (planIds.size > 0) {
        const s = get();
        const items2 = (s.planItems ?? []).filter(i => planIds.has(i.planId));
        const checkinIds = new Set(items2.map(i => i.id));
        const checkins = (s.planItemCheckins ?? []).filter(c => checkinIds.has(c.planItemId));
        const todos = (s.dailyCustomTodos ?? []).filter(t => planIds.has(t.planId));
        const history = (s.dailyTodoHistory ?? []).filter(t => planIds.has(t.planId));

        for (const i of items2) ops.push({ entity: 'planItem', id: i.id });
        for (const c of checkins) ops.push({ entity: 'planItemCheckin', id: c.id });
        for (const t of todos) ops.push({ entity: 'dailyCustomTodo', id: t.id });
        for (const h of history) ops.push({ entity: 'dailyTodoHistory', id: h.id });
      }

      // 1. Clear memory
      set((s: FullStore) => ({
        recycleBin: [],
        ...(planIds.size > 0 ? {
          planItems: (s.planItems ?? []).filter(i => !planIds.has(i.planId)),
          planItemCheckins: (s.planItemCheckins ?? []).filter(c => {
            const item = (s.planItems ?? []).find(i => i.id === c.planItemId);
            return !item || !planIds.has(item.planId);
          }),
          dailyCustomTodos: (s.dailyCustomTodos ?? []).filter(t => !planIds.has(t.planId)),
          dailyTodoHistory: (s.dailyTodoHistory ?? []).filter(t => !planIds.has(t.planId)),
        } : {}),
      } as Partial<FullStore>));

      // 2. Hard-delete from SQLite + enqueue sync push
      adapter.hardDelete(ops).catch(e => log.error(e));

      // 3. Persist empty recycle bin
      adapter.persistSettings('recycleBin', []).catch(e => log.error(e));
    },

    cleanupRecycleBin() {
      const now = Date.now();
      const expired = (get().recycleBin ?? []).filter(r => now - r.deletedAt >= EXPIRY_MS);
      if (expired.length === 0) return;

      // Collect hard-delete operations for all expired items
      const ops: Array<{ entity: SyncEntity; id: string }> = [];
      const planIds = new Set<string>();

      for (const item of expired) {
        const syncEntity = ENTITY_TYPE_MAP[item.entityType as RecycleBinEntityType];
        if (syncEntity) ops.push({ entity: syncEntity, id: item.id });
        if (item.entityType === 'plan') planIds.add(item.id);
      }

      // Cascade plan children
      if (planIds.size > 0) {
        const s = get();
        const items = (s.planItems ?? []).filter(i => planIds.has(i.planId));
        const checkinIds = new Set(items.map(i => i.id));
        for (const i of items) ops.push({ entity: 'planItem', id: i.id });
        for (const c of (s.planItemCheckins ?? []).filter(c => checkinIds.has(c.planItemId))) ops.push({ entity: 'planItemCheckin', id: c.id });
        for (const t of (s.dailyCustomTodos ?? []).filter(t => planIds.has(t.planId))) ops.push({ entity: 'dailyCustomTodo', id: t.id });
        for (const h of (s.dailyTodoHistory ?? []).filter(t => planIds.has(t.planId))) ops.push({ entity: 'dailyTodoHistory', id: h.id });
      }

      // Remove from memory
      const expiredIds = new Set(expired.map(r => r.id));
      set((s: FullStore) => ({
        recycleBin: s.recycleBin.filter(r => !expiredIds.has(r.id)),
        ...(planIds.size > 0 ? {
          planItems: (s.planItems ?? []).filter(i => !planIds.has(i.planId)),
          planItemCheckins: (s.planItemCheckins ?? []).filter(c => {
            const item = (s.planItems ?? []).find(i => i.id === c.planItemId);
            return !item || !planIds.has(item.planId);
          }),
          dailyCustomTodos: (s.dailyCustomTodos ?? []).filter(t => !planIds.has(t.planId)),
          dailyTodoHistory: (s.dailyTodoHistory ?? []).filter(t => !planIds.has(t.planId)),
        } : {}),
      } as Partial<FullStore>));

      // Hard-delete from SQLite + enqueue sync push
      adapter.hardDelete(ops).catch(e => log.error(e));
      adapter.persistSettings('recycleBin', get().recycleBin).catch(e => log.error(e));
    },
  });
}
