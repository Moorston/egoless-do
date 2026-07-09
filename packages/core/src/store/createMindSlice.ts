import type {
  FearEntry, CourageEntry, FearAchievement, FearClassification, FearCategory,
  BodyRegion, BodyHeatmap, FearStats, CourageStats, DominantFearType,
  FearInsight, FearTimeSlot, AchievementType, BodyFearMark,
} from '../types';
import { ACHIEVEMENT_DEFS } from '../types';
import { uid, dateStr } from '../utils';
import type { StorageAdapter } from './types';
import type { FullStore } from './types';
import type { MindSlice } from './mindSliceTypes';
import type { SliceCreator } from './sliceHelper';
import { createLogger } from '../logger';
const log = createLogger('Store');

const EMOTIONAL_MOTIVATIONS = new Set(['stress', 'boredom', 'reward', 'comfort', 'craving']);

function calcStreak(courageEntries: CourageEntry[]): number {
  const active = courageEntries.filter(c => !c.deleted);
  if (active.length === 0) return 0;
  const dates = [...new Set(active.map(c => c.date))].sort().reverse();
  const today = dateStr();
  const yesterday = dateStr(new Date(Date.now() - 86400000));
  if (dates[0] !== today && dates[0] !== yesterday) return 0;
  let streak = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1]);
    const curr = new Date(dates[i]);
    const diff = (prev.getTime() - curr.getTime()) / 86400000;
    if (Math.abs(diff - 1) < 0.1) streak++;
    else break;
  }
  return streak;
}

export function createMindSlice(
  adapter: StorageAdapter,
  onSync?: () => void,
): SliceCreator<MindSlice> {
  return (set, get) => ({
    fearEntries: [],
    courageEntries: [],
    achievements: [],

    // ── 恐惧 CRUD ──

    addFearEntry(entry) {
      // occurrenceCount is computed after construction; cast through unknown satisfies TS
      const e: FearEntry = { ...entry, id: uid(), updatedAt: Date.now(), deleted: false } as unknown as FearEntry;
      // 计算同类恐惧出现次数
      const sameContent = get().fearEntries.filter(
        f => !f.deleted && f.content === e.content
      ).length;
      e.occurrenceCount = sameContent + 1;
      // 计算恐惧实质指数
      if (e.probability !== undefined && e.copingAbility !== undefined) {
        e.fearIndex = e.probability * (10 - e.copingAbility);
      }
      set(s => ({ fearEntries: [e, ...(s.fearEntries ?? [])] }));
      adapter.persistChange('fearEntry', e.id, e).catch(err => log.error(err));
      onSync?.();
      // 成就检测
      get().checkAchievements();
    },

    updateFearEntry(id, patch) {
      set(s => ({
        fearEntries: s.fearEntries.map(f => {
          if (f.id !== id || f.deleted) return f;
          const updated = { ...f, ...patch, updatedAt: Date.now() };
          // 重新计算恐惧实质指数
          if (updated.probability !== undefined && updated.copingAbility !== undefined) {
            updated.fearIndex = updated.probability * (10 - updated.copingAbility);
          }
          return updated;
        }),
      }));
      // Outside set() — side effect
      const updatedEntry = get().fearEntries.find(f => f.id === id);
      if (updatedEntry) adapter.persistChange('fearEntry', id, updatedEntry).catch(err => log.error(err));
      onSync?.();
      get().checkAchievements();
    },

    deleteFearEntry(id) {
      set(s => ({
        fearEntries: s.fearEntries.map(f =>
          f.id === id ? { ...f, deleted: true, updatedAt: Date.now() } : f
        ),
      }));
      adapter.markDeleted('fearEntry', id).catch(err => log.error(err));
      onSync?.();
    },

    // ── 勇气 CRUD ──

    addCourageEntry(entry) {
      const streak = calcStreak(get().courageEntries);
      const e: CourageEntry = { ...entry, id: uid(), streak: streak + 1, updatedAt: Date.now(), deleted: false };
      set(s => ({ courageEntries: [e, ...(s.courageEntries ?? [])] }));
      adapter.persistChange('courageEntry', e.id, e).catch(err => log.error(err));
      onSync?.();
      get().checkAchievements();
    },

    deleteCourageEntry(id) {
      set(s => ({
        courageEntries: s.courageEntries.map(c =>
          c.id === id ? { ...c, deleted: true, updatedAt: Date.now() } : c
        ),
      }));
      adapter.markDeleted('courageEntry', id).catch(err => log.error(err));
      onSync?.();
    },

    // ── 成就 ──

    unlockAchievement(type) {
      const existing = get().achievements.find(a => a.type === type && !a.deleted);
      if (existing) return; // 已解锁
      const a: FearAchievement = { id: uid(), type, unlockedAt: Date.now(), updatedAt: Date.now(), deleted: false };
      set(s => ({ achievements: [a, ...(s.achievements ?? [])] }));
      adapter.persistChange('fearAchievement', a.id, a).catch(err => log.error(err));
      onSync?.();
    },

    checkAchievements() {
      const s = get();
      const active = s.courageEntries.filter(c => !c.deleted);
      const fears = s.fearEntries.filter(f => !f.deleted);
      const existing = new Set(s.achievements.filter(a => !a.deleted).map(a => a.type));

      // brave: 连续7天
      if (!existing.has('brave') && calcStreak(active) >= 7) {
        s.unlockAchievement('brave');
      }
      // fearless: 连续30天
      if (!existing.has('fearless') && calcStreak(active) >= 30) {
        s.unlockAchievement('fearless');
      }
      // alchemist: 10次斯多葛演练
      const forgeCount = fears.filter(f => f.fearIndex !== undefined).length;
      if (!existing.has('alchemist') && forgeCount >= 10) {
        s.unlockAchievement('alchemist');
      }
      // tamer: 某恐惧指数从>30降至<15
      if (!existing.has('tamer')) {
        const hasTamed = fears.some(f => {
          const sameFear = fears.filter(ff => ff.content === f.content).sort((a, b) => a.timestamp - b.timestamp);
          return sameFear.length >= 2 && (sameFear[0].fearIndex ?? 0) > 30 && (sameFear[sameFear.length - 1].fearIndex ?? 0) < 15;
        });
        if (hasTamed) s.unlockAchievement('tamer');
      }
    },

    // ── 统计计算 ──

    getFearStats(): FearStats {
      const fears = get().fearEntries.filter(f => !f.deleted);
      const courage = get().courageEntries.filter(c => !c.deleted);
      return {
        total: fears.length,
        rational: fears.filter(f => f.classification === 'rational').length,
        irrational: fears.filter(f => f.classification === 'irrational').length,
        mixed: fears.filter(f => f.classification === 'mixed').length,
        totalCourage: courage.length,
      };
    },

    getFearIndexTrend(fearId: string): number[] {
      const fear = get().fearEntries.find(f => f.id === fearId);
      if (!fear) return [];
      return get().fearEntries
        .filter(f => !f.deleted && f.content === fear.content && f.fearIndex !== undefined)
        .sort((a, b) => a.timestamp - b.timestamp)
        .map(f => f.fearIndex!);
    },

    getCourageStreak(): number {
      return calcStreak(get().courageEntries);
    },

    getAchievements(): FearAchievement[] {
      return get().achievements.filter(a => !a.deleted);
    },

    getBodyHeatmap(): BodyHeatmap {
      const heatmap: BodyHeatmap = {};
      for (const fear of get().fearEntries) {
        if (fear.deleted) continue;
        for (const mark of fear.bodyLocations ?? []) {
          heatmap[mark.region] = (heatmap[mark.region] ?? 0) + 1;
        }
      }
      return heatmap;
    },

    getDominantFearType(): DominantFearType | null {
      const fears = get().fearEntries.filter(f => !f.deleted);
      if (fears.length === 0) return null;
      const counts: Partial<Record<FearCategory, number>> = {};
      for (const f of fears) {
        counts[f.category] = (counts[f.category] ?? 0) + 1;
      }
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      return {
        category: sorted[0][0] as FearCategory,
        percentage: Math.round(sorted[0][1] / fears.length * 100),
      };
    },

    getFearTimeDistribution(): FearTimeSlot[] {
      const slots: Record<number, number> = {};
      for (const f of get().fearEntries) {
        if (f.deleted) continue;
        const hour = new Date(f.timestamp).getHours();
        slots[hour] = (slots[hour] ?? 0) + 1;
      }
      return Object.entries(slots).map(([h, c]) => ({ hour: Number(h), count: c })).sort((a, b) => a.hour - b.hour);
    },

    getCourageTrend(): { date: string; avgFearBefore: number }[] {
      const entries = get().courageEntries.filter(c => !c.deleted);
      const byDate = new Map<string, number[]>();
      for (const c of entries) {
        const existing = byDate.get(c.date);
        if (existing) existing.push(c.fearBefore);
        else byDate.set(c.date, [c.fearBefore]);
      }
      return [...byDate.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(-30)
        .map(([date, vals]) => ({
          date,
          avgFearBefore: Math.round(vals.reduce((s, v) => s + v, 0) / vals.length * 10) / 10,
        }));
    },

    getCrossModuleInsights(): FearInsight[] {
      const insights: FearInsight[] = [];
      const s = get();
      const fears = s.fearEntries.filter(f => !f.deleted);
      if (fears.length === 0) return insights;

      // 恐惧高发时段
      const timeSlots = s.getFearTimeDistribution();
      const nightCount = timeSlots.filter(t => t.hour >= 22 || t.hour < 2).reduce((sum, t) => sum + t.count, 0);
      const totalCount = fears.length;
      if (totalCount > 0 && nightCount / totalCount > 0.5) {
        const pct = Math.round(nightCount / totalCount * 100);
        insights.push({
          type: 'sleep',
          titleKey: 'mindInsightFearTime',
          description: `${pct}%的恐惧记录发生在深夜(22:00-24:00)。可考虑在眠前仪轨中增加斯多葛演练。`,
          metric: `${pct}%`,
        });
      }

      // 指数下降趋势
      const fearsWithMultiple = fears.filter(f => f.occurrenceCount >= 2);
      for (const f of fearsWithMultiple) {
        const trend = s.getFearIndexTrend(f.id);
        if (trend.length >= 2 && trend[trend.length - 1] < trend[0] * 0.6) {
          insights.push({
            type: 'pattern',
            titleKey: 'mindInsightIndexDrop',
            description: `「${f.content}」的实质指数从${trend[0]}降至${trend[trend.length - 1]}，命名和书写本身就是驯化恐惧的过程。`,
            metric: `${trend[0]}→${trend[trend.length - 1]}`,
          });
          break;
        }
      }

      // 冥想关联
      const medHistory = (get() as unknown as FullStore).medHistory as { timestamp?: number; durationSec?: number; deleted?: boolean }[] | undefined;
      if (medHistory && medHistory.length > 0) {
        const recentMedDates = new Set(
          medHistory.filter(m => !m.deleted && m.timestamp && Date.now() - m.timestamp < 30 * 86400000)
            .map(m => dateStr(new Date(m.timestamp!)))
        );
        const fearsOnMedDays = fears.filter(f => recentMedDates.has(f.date));
        if (fearsOnMedDays.length > 2) {
          insights.push({
            type: 'meditation',
            titleKey: 'mindInsightCrossModule',
            description: '你在冥想练习的次日，勇气行动完成率有提升趋势。',
          });
        }
      }

      return insights;
    },
  });
}
