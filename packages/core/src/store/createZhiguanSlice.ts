// ─── Zhiguan 止观持久化 slice ──────────────────────────────────
import { computeZhiguanStats, sortSessionsByDateDesc } from '../business/zhiguanHistory';
import { createLogger } from '../logger';
import type {
  ZhiguanSession,
  ZhiguanDraft,
  ZhiguanStats,
} from '../types';
import type { BreathingRecord } from '../types/breath';

import type { SliceCreator } from './sliceHelper';
import type { ZhiguanSlice, FullStore } from './types';

const log = createLogger('Store');

function genId() {
  return 'zg_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/**
 * 创建 zhiguan slice 工厂
 *
 * @param adapter - 存储适配器（用于 SQLite / AsyncStorage 持久化）
 * @param onSync  - 同步钩子（回向触发成功时调用）
 * @param getUserId - 获取当前匿名用户 ID 的函数
 */
export function createZhiguanSlice(
  adapter: import('./types').StorageAdapter,
  getUserId: () => string,
  onSync?: () => void,
): SliceCreator<ZhiguanSlice> {
  return (set, get) => ({
    // ── Breathing state (from BreathSlice) ──
    breathHistory: [] as BreathingRecord[],

    addBreathRecord(data: Omit<BreathingRecord, 'id' | 'updatedAt' | 'deleted'>) {
      const entry: BreathingRecord = {
        id: `breath_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        ...data,
        updatedAt: Date.now(),
        deleted: false,
      };
      set(s => ({ breathHistory: [...(s.breathHistory ?? []), entry] }));
      adapter.persistChange('breath', entry.id, entry).catch((e: unknown) => log.error(e));
      onSync?.();
    },

    removeBreathRecord(id: string) {
      const record = (get().breathHistory ?? []).find((r: BreathingRecord) => r.id === id && !r.deleted);
      if (record) {
        (get() as FullStore).addToRecycleBin({ id: record.id, entityType: 'breath', data: record });
      }
      set(s => ({
        breathHistory: (s.breathHistory ?? []).map((r: BreathingRecord) =>
          r.id === id ? { ...r, deleted: true, updatedAt: Date.now() } : r,
        ),
      }));
      adapter.markDeleted('breath', id).catch((e: unknown) => log.error(e));
      onSync?.();
    },

    // ── Zhiguan state ──
    sessions: [],
    currentDraft: undefined,
    currentSession: undefined,
    stats: undefined,
    isLoading: false,
    error: undefined,

    // ── 1.2.1 准备阶段：更新 draft ──

    initDraft() {
      set({
        currentDraft: {
          sankalpa: undefined,
          preliminaryLevel: 'recommended',
          fiveHindrances: {
            greed: 3, aversion: 3, sloth: 3, restlessness: 3, doubt: 3,
          },
          chosenMethod: undefined,
          samathaRatio: 100,
          vipassanaRatio: 0,
        },
      });
    },

    updateDraft(updates: Partial<ZhiguanDraft>) {
      const cur = get().currentDraft;
      if (!cur) return;
      set({ currentDraft: { ...cur, ...updates } });
    },

    resetDraft() {
      set({ currentDraft: undefined });
    },

    // ── 1.2.1 开始坐禅（阶段②入口）──

    startSession() {
      const draft = get().currentDraft;
      const session: ZhiguanSession = {
        id: genId(),
        userId: getUserId(),
        status: 'in_progress',
        startTs: Date.now(),
        endTs: undefined,
        sankalpa: draft?.sankalpa || undefined,
        preliminaryLevel: draft?.preliminaryLevel ?? 'recommended',
        fiveHindrances: draft?.fiveHindrances ?? {
          greed: 3, aversion: 3, sloth: 3, restlessness: 3, doubt: 3,
        },
        chosenMethod: draft?.chosenMethod ?? 'anapanasati',
        samathaRatioAvg: draft?.samathaRatio ?? 100,
        vipassanaRatioAvg: draft?.vipassanaRatio ?? 0,
        totalBreaths: 0,
        eightTactile: {
          movement: false, itching: false, cold: false, warmth: false,
          lightness: false, heaviness: false, roughness: false, smoothness: false,
        },
        dedicationId: undefined,
        meta: undefined,
        updatedAt: Date.now(),
        deleted: false,
      };
      set({ currentSession: session, currentDraft: undefined });
      return session;
    },

    // ── 禅修中实时更新（如定↔慧滑竿位置）──

    updateSessionDraft(updates: Partial<ZhiguanSession>) {
      const cur = get().currentSession;
      if (!cur) return;
      set({ currentSession: { ...cur, ...updates } });
    },

    recordBreathCount(count: number) {
      const cur = get().currentSession;
      if (!cur) return;
      set({ currentSession: { ...cur, totalBreaths: count } });
    },

    // ── 暂停 / 恢复 ──

    pauseSession() {
      // 暂停信息由前端 useZhiguanTimer 管理，这里仅作标记
      // 不做持久化，因为秒级精度的暂停恢复不需要存盘
    },

    resumeSession() {
      // 同上
    },

    // ── 1.2.1 完成坐禅（阶段④入口）──

    completeSession(closingData: {
      closingNotes?: string;
      eightTactile: ZhiguanSession['eightTactile'];
      selfReportedStage?: ZhiguanSession['selfReportedStage'];
      selfReportedStageText?: string;
      dedicationId?: string;
      samathaRatioAvg?: number;
      vipassanaRatioAvg?: number;
    }) {
      const cur = get().currentSession;
      if (!cur) return;
      const finished: ZhiguanSession = {
        ...cur,
        status: 'completed',
        endTs: Date.now(),
        closingNotes: closingData.closingNotes,
        eightTactile: closingData.eightTactile,
        selfReportedStage: closingData.selfReportedStage,
        selfReportedStageText: closingData.selfReportedStageText,
        dedicationId: closingData.dedicationId,
        samathaRatioAvg: closingData.samathaRatioAvg ?? cur.samathaRatioAvg,
        vipassanaRatioAvg: closingData.vipassanaRatioAvg ?? cur.vipassanaRatioAvg,
        updatedAt: Date.now(),
      };

      const sessions = [...(get().sessions ?? []), finished].filter(s => !s.deleted);
      set({ sessions, currentSession: undefined, stats: undefined });

      adapter.persistChange('zhiguanSession', finished.id, finished).catch(e => log.error(e));
      onSync?.();

      return finished;
    },

    // ── 中断坐禅（应用退出或电话等）──

    interruptSession(reason?: string, elapsedMs?: number) {
      const cur = get().currentSession;
      if (!cur) return;
      const interrupted: ZhiguanSession = {
        ...cur,
        status: 'interrupted',
        endTs: Date.now(),
        meta: {
          interrupted: true,
          interruptedReason: reason ?? 'unknown',
          elapsedBeforeInterruptionMs: elapsedMs,
        },
        updatedAt: Date.now(),
      };
      const sessions = [...(get().sessions ?? []), interrupted].filter(s => !s.deleted);
      set({ sessions, currentSession: undefined, stats: undefined });
      adapter.persistChange('zhiguanSession', interrupted.id, interrupted).catch(e => log.error(e));
    },

    // ── 删除（永久删除，非软删除）──

    deleteSession(id: string) {
      // 永久删除（specs/zhiguan-history 要求真实删除）
      const sessions = (get().sessions ?? []).filter(s => s.id !== id);
      set({ sessions, stats: undefined });
      adapter.markDeleted('zhiguanSession', id).catch(e => log.error(e));
    },

    // ── 数据加载 ──

    setSessions(sessions: ZhiguanSession[]) {
      set({ sessions: sortSessionsByDateDesc(sessions), stats: undefined });
    },

    upsertSession(session: ZhiguanSession) {
      const exists = (get().sessions ?? []).some(s => s.id === session.id);
      const sessions = exists
        ? (get().sessions ?? []).map(s => s.id === session.id ? session : s)
        : [...(get().sessions ?? []), session];
      set({ sessions: sortSessionsByDateDesc(sessions), stats: undefined });
    },

    // ── 统计 ──

    computeStats(): ZhiguanStats {
      const s = computeZhiguanStats((get().sessions ?? []));
      set({ stats: s });
      return s;
    },

    // ── 错误处理 ──

    setError(err: string | undefined) {
      set({ error: err });
    },
  });
}
