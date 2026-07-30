import { PRESET_SUTRAS, SUTRA_TEXTS } from '../constants';
import { createLogger } from '../logger';
import { PRESET_SUTRA_NAMES } from '../types';
import type { MantraDef, MantraSession, SutraReadingSession, PresetSutraEntry, MantraCategory } from '../types';
import { dateStr } from '../utils';

import type { SliceCreator } from './sliceHelper';
import type { StorageAdapter } from './types';

const log = createLogger('Store');

function genId() {
  return 'm_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export interface MantraSlice {
  mantraDefs: MantraDef[];
  mantraSessions: MantraSession[];
  readingSessions: SutraReadingSession[];
  addMantraDef: (data: {
    name: string;
    subtitle?: string;
    category?: MantraCategory;
    preset?: boolean;
    pronunciation?: string;
    meaning?: string;
    targetCount?: number;
    fullText?: string;
    pageCount?: number;
  }) => MantraDef;
  updateMantraDef: (id: string, updates: Partial<MantraDef>) => void;
  removeMantraDef: (id: string) => void;
  addPresetSutra: (entry: PresetSutraEntry) => MantraDef | null;
  initializePresetsIncremental: () => { added: number };
  addMantraSession: (data: Omit<MantraSession, 'id' | 'updatedAt' | 'deleted'>) => MantraSession;
  removeMantraSession: (id: string) => void;
  addReadingSession: (data: Omit<SutraReadingSession, 'id' | 'updatedAt' | 'deleted'>) => SutraReadingSession;
  removeReadingSession: (id: string) => void;
  getMantraTotalCount: (mantraId: string) => number;
  getMantraStreak: (mantraId: string) => number;
  getMantraTodayCount: (mantraId: string) => number;
  getReadingStats: (mantraId: string) => { totalPages: number; totalDuration: number; sessions: number };
}

export function createMantraSlice(
  adapter: StorageAdapter,
  onSync?: () => void,
): SliceCreator<MantraSlice> {
  return (set, get) => ({
    mantraDefs: [],
    mantraSessions: [],
    readingSessions: [],

    addMantraDef(data) {
      const existing = get().mantraDefs.filter(d => !d.deleted);
      const entry: MantraDef = {
        id: genId(),
        name: data.name,
        subtitle: data.subtitle,
        category: data.category ?? 'custom',
        sortOrder: existing.length,
        targetCount: data.targetCount,
        fullText: data.fullText,
        pageCount: data.pageCount,
        updatedAt: Date.now(),
        deleted: false,
      };
      set((s: MantraSlice) => ({ mantraDefs: [...(s.mantraDefs ?? []), entry] }));
      adapter.persistChange('mantraDef', entry.id, entry).catch(e => log.error(e));
      log.info('MantraDef persisted: ' + entry.id + ' name=' + entry.name);
      // Force immediate flush to prevent data loss on app kill
      if (adapter.flushNow) adapter.flushNow().catch(e => log.error(e));
      onSync?.();
      return entry;
    },

    updateMantraDef(id, updates) {
      let entry: MantraDef | undefined;
      set((s: MantraSlice) => {
        const newList = (s.mantraDefs ?? []).map((d: MantraDef) => d.id === id ? { ...d, ...updates, updatedAt: Date.now() } : d);
        entry = newList.find((d: MantraDef) => d.id === id);
        return { mantraDefs: newList };
      });
      if (entry) adapter.persistChange('mantraDef', id, entry).catch(e => log.error(e));
      onSync?.();
    },

    removeMantraDef(id) {
      set((s: MantraSlice) => ({
        mantraDefs: (s.mantraDefs ?? []).map((d: MantraDef) => d.id === id ? { ...d, deleted: true, updatedAt: Date.now() } : d),
      }));
      adapter.markDeleted('mantraDef', id).catch(e => log.error(e));
      onSync?.();
    },

    /**
     * 从经文库预设模板添加一条到"我的经文"
     * 如果同名经文在"我的"中已存在，则不重复添加，返回已有条目
     */
    addPresetSutra(entry: PresetSutraEntry) {
      const state = get();
      const existing = (state.mantraDefs ?? []).filter(d => !d.deleted);

      // 已存在同名我的经文
      const myDuplicate = existing.find(d => d.name === entry.name && !d.preset);
      if (myDuplicate) return myDuplicate;

      // 用经文全文（如有）
      const fullText = entry.fileKey ? SUTRA_TEXTS[entry.fileKey]?.content : undefined;
      const pageCount = entry.pageCount ?? (entry.fileKey ? SUTRA_TEXTS[entry.fileKey]?.pages : undefined);

      const myEntry: MantraDef = {
        id: genId(),
        name: entry.name,
        subtitle: entry.subtitle,
        category: entry.category,
        preset: false,
        sortOrder: existing.filter(d => !d.preset).length,
        pronunciation: entry.pronunciation,
        meaning: entry.meaning,
        pageCount,
        fullText,
        updatedAt: Date.now(),
        deleted: false,
      };

      set((s: MantraSlice) => ({ mantraDefs: [...(s.mantraDefs ?? []), myEntry] }));
      adapter.persistChange('mantraDef', myEntry.id, myEntry).catch(e => log.error(e));
      onSync?.();
      return myEntry;
    },

    /**
     * 增量初始化 + 旧数据迁移：
     * 1) 迁移：把名字在 PRESET_SUTRA_NAMES 中且 preset 未设为 true 的旧条目标记为 preset=true
     * 2) 补全：添加 preset 表中缺少的新条目
     * 3) 清理：如果有同名 preset 条目被误标为非预设，纠正
     * 返回 { added: number; migrated: number }
     */
    initializePresetsIncremental() {
      const state = get();
      const existing = (state.mantraDefs ?? []).filter(d => !d.deleted);
      const migrated: MantraDef[] = [];

      // 步骤1：迁移旧预设（名字匹配且 preset 不是 true）
      for (const d of existing) {
        if (d.preset === true) continue; // 已经正确
        if (!PRESET_SUTRA_NAMES.has(d.name)) continue; // 不是预设名
        // 已经有同名的 preset=true 条目，跳过（可能是用户从经文库添加的副本）
        const alreadyPreset = existing.find(e => e.name === d.name && e.preset === true);
        if (alreadyPreset) continue;
        // 迁移：标记为 preset=true，补充缺失字段
        const presetDef = PRESET_SUTRAS.find(p => p.name === d.name);
        const updates: Partial<MantraDef> = {
          preset: true,
          updatedAt: Date.now(),
        };
        if (presetDef) {
          if (!d.subtitle && presetDef.subtitle) updates.subtitle = presetDef.subtitle;
          if (!d.pronunciation && presetDef.pronunciation) updates.pronunciation = presetDef.pronunciation;
          if (!d.meaning && presetDef.meaning) updates.meaning = presetDef.meaning;
          if (!d.pageCount && presetDef.pageCount) updates.pageCount = presetDef.pageCount;
          if (!d.fullText && presetDef.fileKey) updates.fullText = SUTRA_TEXTS[presetDef.fileKey]?.content;
        }
        const updated = { ...d, ...updates };
        migrated.push(updated);
      }

      // 步骤2：补全新预设（现有中完全不存在的名字）
      const existingNames = new Set(existing.map(d => d.name));
      const toAdd = PRESET_SUTRAS.filter(p => !existingNames.has(p.name));
      const baseSortOrder = 1000 + existing.filter(d => d.preset).length;
      const newDefs: MantraDef[] = toAdd.map((entry, idx) => {
        const fullText = entry.fileKey ? SUTRA_TEXTS[entry.fileKey]?.content : undefined;
        const pageCount = entry.pageCount ?? (entry.fileKey ? SUTRA_TEXTS[entry.fileKey]?.pages : undefined);

        return {
          id: genId(),
          name: entry.name,
          subtitle: entry.subtitle,
          category: entry.category,
          preset: true,
          sortOrder: baseSortOrder + idx,
          pronunciation: entry.pronunciation,
          meaning: entry.meaning,
          pageCount,
          fullText,
          updatedAt: Date.now(),
          deleted: false,
        } satisfies MantraDef;
      });

      // 合并写入
      if (migrated.length > 0 || newDefs.length > 0) {
        set((s: MantraSlice) => ({
          mantraDefs: [
            // 保留未迁移的条目
            ...(s.mantraDefs ?? []).filter(d => !migrated.some(m => m.id === d.id)),
            // 迁移后的条目
            ...migrated,
            // 新添加的预设
            ...newDefs,
          ],
        }));

        // 异步持久化迁移和新增条目
        for (const d of [...migrated, ...newDefs]) {
          adapter.persistChange('mantraDef', d.id, d).catch(e => log.error(e));
        }
        onSync?.();
      }

      return { added: newDefs.length, migrated: migrated.length };
    },

    addMantraSession(data) {
      const entry: MantraSession = {
        ...data,
        id: genId(),
        updatedAt: Date.now(),
        deleted: false,
      };
      set((s: MantraSlice) => ({ mantraSessions: [...(s.mantraSessions ?? []), entry] }));
      adapter.persistChange('mantraSession', entry.id, entry).catch(e => log.error(e));
      onSync?.();
      return entry;
    },

    removeMantraSession(id) {
      set((s: MantraSlice) => ({
        mantraSessions: (s.mantraSessions ?? []).map((s2: MantraSession) => s2.id === id ? { ...s2, deleted: true, updatedAt: Date.now() } : s2),
      }));
      adapter.markDeleted('mantraSession', id).catch(e => log.error(e));
      onSync?.();
    },

    getMantraTotalCount(mantraId) {
      return (get().mantraSessions ?? [])
        .filter((s: MantraSession) => s.mantraId === mantraId && !s.deleted)
        .reduce((sum: number, s: MantraSession) => sum + s.count, 0);
    },

    getMantraStreak(mantraId) {
      const sessions = (get().mantraSessions ?? [])
        .filter((s: MantraSession) => s.mantraId === mantraId && !s.deleted)
        .map((s: MantraSession) => s.date)
        .filter(Boolean);
      if (sessions.length === 0) return 0;
      const uniqueDates = [...new Set(sessions)].sort().reverse();
      let streak = 1;
      for (let i = 1; i < uniqueDates.length; i++) {
        const prev = new Date(uniqueDates[i - 1]);
        const curr = new Date(uniqueDates[i]);
        const diff = (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24);
        if (diff === 1) streak++;
        else break;
      }
      return streak;
    },

    getMantraTodayCount(mantraId) {
      const today = dateStr();
      return (get().mantraSessions ?? [])
        .filter((s: MantraSession) => s.mantraId === mantraId && !s.deleted && s.date === today)
        .reduce((sum: number, s: MantraSession) => sum + s.count, 0);
    },

    addReadingSession(data) {
      const entry: SutraReadingSession = {
        ...data,
        id: genId(),
        updatedAt: Date.now(),
        deleted: false,
      };
      set((s: MantraSlice) => ({ readingSessions: [...(s.readingSessions ?? []), entry] }));
      adapter.persistChange('sutraReading', entry.id, entry).catch(e => log.error(e));
      onSync?.();
      return entry;
    },

    removeReadingSession(id) {
      set((s: MantraSlice) => ({
        readingSessions: (s.readingSessions ?? []).map((r: SutraReadingSession) => r.id === id ? { ...r, deleted: true, updatedAt: Date.now() } : r),
      }));
      adapter.markDeleted('sutraReading', id).catch(e => log.error(e));
      onSync?.();
    },

    getReadingStats(mantraId) {
      const sessions = (get().readingSessions ?? [])
        .filter((r: SutraReadingSession) => r.mantraId === mantraId && !r.deleted);
      return {
        totalPages: sessions.reduce((sum: number, r: SutraReadingSession) => sum + r.pagesRead, 0),
        totalDuration: sessions.reduce((sum: number, r: SutraReadingSession) => sum + r.durationSec, 0),
        sessions: sessions.length,
      };
    },
  });
}
