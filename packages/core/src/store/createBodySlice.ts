import type { BodyGoal, BodyPlan, BodyCheckin, WeightRecord, BodyTrainingPlan, BodyTrainingPlanStatus } from '../types';
import type { StorageAdapter } from './types';
import type { SliceCreator } from './sliceHelper';
import { createLogger } from '../logger';
import { uid } from '../utils';
import { createBodyGoal, createBodyPlan, createBodyCheckin, createWeightRecord } from '../business/body';
const log = createLogger('Store');

// ─── BodyFlow persisted state ─────────────────────────────────
export interface BodyFlowPersistedState {
  step: 'practice' | 'breathing' | 'checkin' | 'success' | null;
  selectedSportKey: string;
  practiceCompleted: boolean;
  practiceDurationSec: number;
  breathingCompleted: boolean;
  breathingDurationMs: number;
  awarenessData: BodyCheckin | null;
  activePlanId: string | null;
  startedAt: number;
  updatedAt: number;
}

export const BODY_FLOW_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface BodySlice {
  // Body goals
  bodyGoals: BodyGoal[];
  addBodyGoal: (goal: Parameters<typeof createBodyGoal>[0]) => void;
  updateBodyGoal: (id: string, updates: Partial<BodyGoal>) => void;
  removeBodyGoal: (id: string) => void;

  // Body plans
  bodyPlans: BodyPlan[];
  addBodyPlan: (plan: Parameters<typeof createBodyPlan>[0]) => void;
  updateBodyPlan: (id: string, updates: Partial<BodyPlan>) => void;
  removeBodyPlan: (id: string) => void;
  setBodyPlans: (plans: BodyPlan[]) => void;

  // Weight records
  weightRecords: WeightRecord[];
  addWeight: (record: Parameters<typeof createWeightRecord>[0]) => void;
  updateWeight: (id: string, updates: Partial<WeightRecord>) => void;
  removeWeight: (id: string) => void;

  // Body checkins
  bodyCheckins: BodyCheckin[];
  upsertBodyCheckin: (data: Parameters<typeof createBodyCheckin>[0]) => void;
  removeBodyCheckin: (id: string) => void;

  // Body training plans
  bodyTrainingPlans: BodyTrainingPlan[];
  addBodyTrainingPlan: (plan: Omit<BodyTrainingPlan, 'id' | 'updatedAt' | 'deleted'>) => void;
  updateBodyTrainingPlan: (id: string, updates: Partial<BodyTrainingPlan>) => void;
  removeBodyTrainingPlan: (id: string) => void;
  _deactivateOthers: (exceptId: string) => void;

  // BodyFlow session state (persisted for progress recovery)
  bodyFlowState: BodyFlowPersistedState | null;
  setBodyFlowState: (updates: Partial<BodyFlowPersistedState>) => void;
  resetBodyFlowState: () => void;
}

export function createBodySlice(
  adapter: StorageAdapter,
  onSync?: () => void,
): SliceCreator<BodySlice> {
  return (set, get) => ({
    // ── Body goals ──────────────────────────────────────────────────────
    bodyGoals: [],

    addBodyGoal(goal) {
      const entry = createBodyGoal(goal);
      set(s => ({ bodyGoals: [...(s.bodyGoals ?? []), entry] }));
      adapter.persistChange('bodyGoal', entry.id, entry).catch(e => log.error(e));
      onSync?.();
    },

    updateBodyGoal(id, updates) {
      let entry: BodyGoal | undefined;
      set(s => {
        const newList = (s.bodyGoals ?? []).map(g => g.id === id ? { ...g, ...updates, updatedAt: Date.now() } : g);
        entry = newList.find(g => g.id === id);
        return { bodyGoals: newList };
      });
      if (entry) adapter.persistChange('bodyGoal', id, entry).catch(e => log.error(e));
      onSync?.();
    },

    removeBodyGoal(id) {
      set(s => ({
        bodyGoals: (s.bodyGoals ?? []).map(g => g.id === id ? { ...g, deleted: true, updatedAt: Date.now() } : g),
      }));
      adapter.markDeleted('bodyGoal', id).catch(e => log.error(e));
      onSync?.();
    },

    // ── Body plans ──────────────────────────────────────────────────────
    bodyPlans: [],

    addBodyPlan(plan) {
      const entry = createBodyPlan(plan);
      set(s => ({ bodyPlans: [...(s.bodyPlans ?? []), entry] }));
      adapter.persistChange('bodyPlan', entry.id, entry).catch(e => log.error(e));
      onSync?.();
    },

    updateBodyPlan(id, updates) {
      let entry: BodyPlan | undefined;
      set(s => {
        const newList = (s.bodyPlans ?? []).map(p => p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p);
        entry = newList.find(p => p.id === id);
        return { bodyPlans: newList };
      });
      if (entry) adapter.persistChange('bodyPlan', id, entry).catch(e => log.error(e));
      onSync?.();
    },

    removeBodyPlan(id) {
      set(s => ({
        bodyPlans: (s.bodyPlans ?? []).map(p => p.id === id ? { ...p, deleted: true, updatedAt: Date.now() } : p),
      }));
      adapter.markDeleted('bodyPlan', id).catch(e => log.error(e));
      onSync?.();
    },

    setBodyPlans(plans) {
      set({ bodyPlans: plans });
      for (const p of plans) {
        adapter.persistChange('bodyPlan', p.id, p).catch(e => log.error(e));
      }
      onSync?.();
    },

    // ── Weight records ──────────────────────────────────────────────────
    weightRecords: [],

    addWeight(record) {
      const entry = createWeightRecord(record);
      set(s => ({ weightRecords: [...(s.weightRecords ?? []), entry] }));
      adapter.persistChange('weightRecord', entry.id, entry).catch(e => log.error(e));
      onSync?.();
    },

    updateWeight(id, updates) {
      let entry: WeightRecord | undefined;
      set(s => {
        const newList = (s.weightRecords ?? []).map(r => r.id === id ? { ...r, ...updates, updatedAt: Date.now() } : r);
        entry = newList.find(r => r.id === id);
        return { weightRecords: newList };
      });
      if (entry) adapter.persistChange('weightRecord', id, entry).catch(e => log.error(e));
      onSync?.();
    },

    removeWeight(id) {
      set(s => ({
        weightRecords: (s.weightRecords ?? []).map(r => r.id === id ? { ...r, deleted: true, updatedAt: Date.now() } : r),
      }));
      adapter.markDeleted('weightRecord', id).catch(e => log.error(e));
      onSync?.();
    },

    // ── Body checkins ───────────────────────────────────────────────────
    bodyCheckins: [],

    upsertBodyCheckin(data) {
      let persistId: string | undefined;
      let persistData: BodyCheckin | undefined;
      set(s => {
        const list = s.bodyCheckins ?? [];
        const existing = list.find(c => c.date === data.date && !c.deleted);
        if (existing) {
          const updated = { ...existing, ...data, updatedAt: Date.now() };
          persistId = existing.id;
          persistData = updated;
          return { bodyCheckins: list.map(c => c.id === existing.id ? updated : c) };
        }
        const entry = createBodyCheckin(data);
        persistId = entry.id;
        persistData = entry;
        return { bodyCheckins: [...list, entry] };
      });
      if (persistId && persistData) adapter.persistChange('bodyCheckin', persistId, persistData).catch(e => log.error(e));
      onSync?.();
    },

    removeBodyCheckin(id) {
      set(s => ({
        bodyCheckins: (s.bodyCheckins ?? []).map(c => c.id === id ? { ...c, deleted: true, updatedAt: Date.now() } : c),
      }));
      adapter.markDeleted('bodyCheckin', id).catch(e => log.error(e));
      onSync?.();
    },

    // ── Body training plans ────────────────────────────────────────────
    bodyTrainingPlans: [],

    /** 将当前进行中计划标记为暂停，确保只有一个进行中 */
    _deactivateOthers(exceptId: string) {
      const others = (get().bodyTrainingPlans ?? []).filter((p: BodyTrainingPlan) => p.id !== exceptId && p.status === 'active' && !p.deleted);
      for (const p of others) {
        adapter.persistChange('bodyTrainingPlan', p.id, { ...p, status: 'cancelled', updatedAt: Date.now() }).catch(e => log.error(e));
      }
      if (others.length > 0) {
        set(s => ({
          bodyTrainingPlans: (s.bodyTrainingPlans ?? []).map((p: BodyTrainingPlan) =>
            p.id !== exceptId && p.status === 'active' && !p.deleted ? { ...p, status: 'cancelled', updatedAt: Date.now() } : p
          ),
        }));
      }
    },

    addBodyTrainingPlan(plan) {
      // 去重守卫：同名+同日期范围+同状态的计划视为重复，跳过写入
      const duplicate = (get().bodyTrainingPlans ?? []).find((p: BodyTrainingPlan) =>
        !p.deleted &&
        p.name.trim() === plan.name.trim() &&
        p.startDate === plan.startDate &&
        p.endDate === plan.endDate &&
        p.status === 'active'
      );
      if (duplicate) return;

      const id = uid();
      const entry: BodyTrainingPlan = { ...plan, id, updatedAt: Date.now(), deleted: false };
      set(s => ({ bodyTrainingPlans: [...(s.bodyTrainingPlans ?? []), entry] }));
      // 新计划为进行中时，暂停其他进行中计划
      if (entry.status === 'active') this._deactivateOthers(id);
      adapter.persistChange('bodyTrainingPlan', id, entry).catch(e => log.error(e));
      onSync?.();
    },

    updateBodyTrainingPlan(id, updates) {
      let entry: BodyTrainingPlan | undefined;
      // 激活某计划时，暂停其他进行中计划
      if (updates.status === 'active') this._deactivateOthers(id);
      set(s => {
        const newList = (s.bodyTrainingPlans ?? []).map(p =>
          p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p
        );
        entry = newList.find(p => p.id === id);
        return { bodyTrainingPlans: newList };
      });
      if (entry) adapter.persistChange('bodyTrainingPlan', id, entry).catch(e => log.error(e));
      onSync?.();
    },

    removeBodyTrainingPlan(id) {
      set(s => ({
        bodyTrainingPlans: (s.bodyTrainingPlans ?? []).map(p =>
          p.id === id ? { ...p, deleted: true, updatedAt: Date.now() } : p
        ),
      }));
      adapter.markDeleted('bodyTrainingPlan', id).catch(e => log.error(e));
      onSync?.();
    },

    // ── BodyFlow session state ──────────────────────────────────────────
    bodyFlowState: null,

    setBodyFlowState(updates) {
      set(s => {
        const current = s.bodyFlowState;
        return {
          bodyFlowState: {
            // 当 current 为 null 时，全部使用 updates；否则合并
            ...(current ?? {
              step: 'practice',
              selectedSportKey: '',
              practiceCompleted: false,
              practiceDurationSec: 0,
              breathingCompleted: false,
              breathingDurationMs: 0,
              awarenessData: null,
              activePlanId: null,
              startedAt: Date.now(),
            }),
            ...current,
            ...updates,
            updatedAt: Date.now(),
          },
        };
      });
      // Persist for cross-session recovery (local settings, no sync)
      const state = get().bodyFlowState;
      if (state) adapter.persistSettings('_bodyFlow', state).catch(e => log.error(e));
    },

    resetBodyFlowState() {
      set({ bodyFlowState: null });
      adapter.persistSettings('_bodyFlow', null).catch(e => log.error(e));
    },
  });
}
