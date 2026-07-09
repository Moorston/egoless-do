import type { FoodEntry, CustomFoodPreset, EatingMotivationEntry, CustomWuxingMap, FoodWuxingItem, WuxingStats, FlavorStats, MotivationStats, EmotionSensitiveDay, WuxingElement, FlavorType, EatingMotivation } from '../types';
import { WUXING_MAP, FLAVOR_CONFIG, WUXING_ELEMENT_CONFIG } from '../constants';
import { uid, dateStr } from '../utils';
import { deleteFoodFromList } from '../business';
import type { StorageAdapter, DietSlice } from './types';
import type { SliceCreator } from './sliceHelper';
import { createLogger } from '../logger';
const log = createLogger('Store');

// ── 五行元素常量 ──
const ELEMENTS: WuxingElement[] = ['wood', 'fire', 'earth', 'metal', 'water'];
const FLAVORS: FlavorType[] = ['sour', 'bitter', 'sweet', 'pungent', 'salty'];
const EMOTIONAL_MOTIVATIONS: EatingMotivation[] = ['stress', 'boredom', 'reward', 'comfort', 'craving'];

function zeroWuxing(): Record<WuxingElement, number> {
  return { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
}
function zeroFlavor(): Record<FlavorType, number> {
  return { sour: 0, bitter: 0, sweet: 0, pungent: 0, salty: 0 };
}

export function createDietSlice(
  adapter: StorageAdapter,
  onSync?: () => void,
  onSettingsPersist?: () => void,
): SliceCreator<DietSlice> {
  return (set, get) => ({
    foodLog: [],
    calGoal: 2000,
    customFoodPresets: [],

    addFood(entry: Omit<FoodEntry, 'id' | 'updatedAt' | 'deleted'>) {
      if (!entry?.name?.trim()) { log.warn('addFood: rejected empty entry', entry); return; }
      const e: FoodEntry = { ...entry, id: uid(), updatedAt: Date.now(), deleted: false };
      log.debug('addFood:', e.id, e.name, e.calories);
      set(s => ({ foodLog: [e, ...(s.foodLog ?? [])] }));
      adapter.persistChange('food', e.id, e).catch(err => log.error(err));
      onSync?.();
    },

    deleteFood(id: string) {
      const state = get();
      const food = (state.foodLog ?? []).find(f => f.id === id && !f.deleted);
      set(s => ({
        foodLog: deleteFoodFromList(s.foodLog ?? [], id),
        ...(food ? { recycleBin: [...(s.recycleBin ?? []), { id, entityType: 'food' as const, data: food, deletedAt: Date.now() }] } : {}),
      }));
      adapter.markDeleted('food', id).catch(e => log.error(e));
      onSync?.();
    },

    setCalGoal(n: number) { set({ calGoal: Math.max(100, n) }); onSettingsPersist?.(); },

    addCustomFoodPreset(name: string, calories: number, note?: string) {
      set(s => ({
        customFoodPresets: [
          { id: uid(), name, calories, note },
          ...(s.customFoodPresets ?? []),
        ],
      }));
      onSettingsPersist?.();
    },

    removeCustomFoodPreset(id: string) {
      set(s => ({
        customFoodPresets: (s.customFoodPresets ?? []).filter(p => p.id !== id),
      }));
      onSettingsPersist?.();
    },

    motivationLog: [],
    customWuxingMaps: [],

    // ── 进食动机 ──

    setFoodMotivation(entry) {
      const existing = (get().motivationLog ?? []).find(m => m.foodId === entry.foodId && !m.deleted);
      if (existing) {
        const updated = { ...existing, ...entry, updatedAt: Date.now() };
        set(s => ({
          motivationLog: s.motivationLog.map(m => m.id === existing.id ? updated : m),
        }));
        adapter.persistChange('motivationEntry', existing.id, updated).catch(e => log.error(e));
      } else {
        const e: EatingMotivationEntry = { ...entry, id: uid(), updatedAt: Date.now(), deleted: false };
        set(s => ({ motivationLog: [e, ...(s.motivationLog ?? [])] }));
        adapter.persistChange('motivationEntry', e.id, e).catch(e => log.error(e));
      }
      onSync?.();
    },

    removeFoodMotivation(foodId: string) {
      const existing = (get().motivationLog ?? []).find(m => m.foodId === foodId && !m.deleted);
      if (!existing) return;
      const updated = { ...existing, deleted: true, updatedAt: Date.now() };
      set(s => ({
        motivationLog: s.motivationLog.map(m => m.id === existing.id ? updated : m),
      }));
      adapter.markDeleted('motivationEntry', existing.id).catch(e => log.error(e));
      onSync?.();
    },

    // ── 自定义五行映射 ──

    addCustomWuxingMap(map) {
      const e: CustomWuxingMap = { ...map, id: uid(), updatedAt: Date.now(), deleted: false };
      set(s => ({ customWuxingMaps: [e, ...(s.customWuxingMaps ?? [])] }));
      adapter.persistChange('customWuxing', e.id, e).catch(e => log.error(e));
      onSync?.();
    },

    removeCustomWuxingMap(id: string) {
      let deleted: CustomWuxingMap | undefined;
      set(s => {
        const newList = (s.customWuxingMaps ?? []).map(m => {
          if (m.id === id) { deleted = { ...m, deleted: true, updatedAt: Date.now() } as CustomWuxingMap; return deleted; }
          return m;
        });
        return { customWuxingMaps: newList };
      });
      adapter.markDeleted('customWuxing', id).catch(e => log.error(e));
      onSync?.();
    },

    // ── 五行查询 ──

    lookupWuxing(foodName: string): FoodWuxingItem | null {
      if (!foodName) return null;
      const name = foodName.trim().toLowerCase();

      // 1. 精确匹配
      let found = WUXING_MAP.find(m => m.name === foodName || m.foodKey === name);
      if (found) return found;

      // 2. 别名匹配
      found = WUXING_MAP.find(m => m.aliases?.some(a => a === foodName));
      if (found) return found;

      // 3. 模糊匹配：食物名包含映射表中的食材名（取最长匹配）
      const candidates = WUXING_MAP
        .filter(m => name.includes(m.name.toLowerCase()))
        .sort((a, b) => b.name.length - a.name.length);
      if (candidates.length > 0) return candidates[0];

      // 4. 自定义映射
      const custom = (get().customWuxingMaps ?? []).find(m => m.foodName === foodName && !m.deleted);
      if (custom) {
        return {
          foodKey: `custom_${custom.foodName}`,
          name: custom.foodName,
          nameEn: custom.foodName,
          category: 'other',
          isCommon: false,
          primaryFlavor: custom.flavor,
          primaryElement: custom.element,
          nature: 'neutral',
          organs: [],
          effect: '自定义映射',
          effectEn: 'Custom mapping',
        };
      }

      return null;
    },

    // ── 五味统计 ──

    getDailyFlavorStats(date: string): FlavorStats {
      const foodLog = (get().foodLog ?? []).filter(f => !f.deleted && dateStr(new Date(f.timestamp)) === date);
      const stats = { ...zeroFlavor(), total: 0 };
      const lookup = get().lookupWuxing;

      for (const food of foodLog) {
        const wuxing = lookup(food.name);
        if (wuxing) {
          stats[wuxing.primaryFlavor]++;
          if (wuxing.secondaryFlavor) stats[wuxing.secondaryFlavor]++;
          stats.total++;
        }
      }
      return stats;
    },

    // ── 五行统计 ──

    getDailyWuxingStats(date: string): WuxingStats {
      const stats = get().getDailyFlavorStats(date);
      const wuxing = zeroWuxing();

      for (const flavor of FLAVORS) {
        const element = FLAVOR_CONFIG[flavor]?.element as WuxingElement;
        if (element) wuxing[element] += stats[flavor];
      }

      const total = Object.values(wuxing).reduce((a, b) => a + b, 0);
      if (total === 0) {
        return { ...wuxing, dominant: 'earth', deficient: 'earth', isBalanced: true };
      }

      const pcts = Object.fromEntries(
        Object.entries(wuxing).map(([k, v]) => [k, Math.round(v / total * 100)])
      ) as Record<WuxingElement, number>;

      const sorted = Object.entries(pcts).sort((a, b) => b[1] - a[1]);
      return {
        ...pcts,
        dominant: sorted[0][0] as WuxingElement,
        deficient: sorted[sorted.length - 1][0] as WuxingElement,
        isBalanced: sorted[0][1] <= 40 && sorted[sorted.length - 1][1] >= 10,
      };
    },

    getWuxingStatsRange(dateFrom: string, dateTo: string): WuxingStats {
      const foodLog = (get().foodLog ?? []).filter(f => {
        if (f.deleted) return false;
        const d = dateStr(new Date(f.timestamp));
        return d >= dateFrom && d <= dateTo;
      });
      const wuxing = zeroWuxing();
      const lookup = get().lookupWuxing;

      for (const food of foodLog) {
        const item = lookup(food.name);
        if (item) {
          const element = FLAVOR_CONFIG[item.primaryFlavor]?.element as WuxingElement;
          if (element) wuxing[element]++;
          if (item.secondaryFlavor) {
            const secElement = FLAVOR_CONFIG[item.secondaryFlavor]?.element as WuxingElement;
            if (secElement) wuxing[secElement]++;
          }
        }
      }

      const total = Object.values(wuxing).reduce((a, b) => a + b, 0);
      if (total === 0) {
        return { ...wuxing, dominant: 'earth', deficient: 'earth', isBalanced: true };
      }

      const pcts = Object.fromEntries(
        Object.entries(wuxing).map(([k, v]) => [k, Math.round(v / total * 100)])
      ) as Record<WuxingElement, number>;

      const sorted = Object.entries(pcts).sort((a, b) => b[1] - a[1]);
      return {
        ...pcts,
        dominant: sorted[0][0] as WuxingElement,
        deficient: sorted[sorted.length - 1][0] as WuxingElement,
        isBalanced: sorted[0][1] <= 40 && sorted[sorted.length - 1][1] >= 10,
      };
    },

    // ── 进食动机统计 ──

    getMotivationStats(dateFrom: string, dateTo: string): MotivationStats {
      const logs = (get().motivationLog ?? []).filter(m => {
        if (m.deleted) return false;
        return m.date >= dateFrom && m.date <= dateTo;
      });

      const breakdown: Record<EatingMotivation, number> = {
        hunger: 0, stress: 0, boredom: 0, habit: 0, reward: 0, social: 0, craving: 0, comfort: 0,
      };
      for (const m of logs) {
        breakdown[m.motivation]++;
      }

      const total = logs.length;
      const physical = total > 0 ? Math.round(breakdown.hunger / total * 100) : 0;
      const emotional = total > 0 ? Math.round(
        EMOTIONAL_MOTIVATIONS.reduce((s, k) => s + breakdown[k], 0) / total * 100
      ) : 0;
      const habitual = total > 0 ? Math.round(breakdown.habit / total * 100) : 0;
      const social = total > 0 ? Math.round(breakdown.social / total * 100) : 0;

      return { physical, emotional, habitual, social, breakdown, total };
    },

    // ── 情绪敏感日检测 ──

    getEmotionSensitiveDays(dateFrom: string, dateTo: string): EmotionSensitiveDay[] {
      const reflections = (get().reflections ?? []).filter(r => {
        if (r.deleted) return false;
        const d = dateStr(new Date(r.timestamp));
        return d >= dateFrom && d <= dateTo;
      });

      const sensitiveMoods = new Set(['焦虑', '低落', '愤怒', '烦躁', 'anxious', 'down', 'angry', 'frustrated', 'sad']);
      const dayMoods = new Map<string, { moods: string[]; content?: string }>();

      for (const r of reflections) {
        if (!r.mood || !sensitiveMoods.has(r.mood)) continue;
        const d = dateStr(new Date(r.timestamp));
        const existing = dayMoods.get(d);
        if (existing) {
          if (!existing.moods.includes(r.mood)) existing.moods.push(r.mood);
        } else {
          dayMoods.set(d, { moods: [r.mood], content: r.content?.slice(0, 50) });
        }
      }

      const motivationLogs = (get().motivationLog ?? []).filter(m => !m.deleted && m.date >= dateFrom && m.date <= dateTo);
      const dayMotivations = new Map<string, EatingMotivation[]>();
      for (const m of motivationLogs) {
        const existing = dayMotivations.get(m.date);
        if (existing) existing.push(m.motivation);
        else dayMotivations.set(m.date, [m.motivation]);
      }

      const results: EmotionSensitiveDay[] = [];
      for (const [date, { moods, content }] of dayMoods) {
        const motivations = dayMotivations.get(date) ?? [];
        const emotionalCount = motivations.filter(m => EMOTIONAL_MOTIVATIONS.includes(m)).length;
        results.push({
          date,
          moods,
          reflectionContent: content,
          eatingMotivations: motivations,
          emotionalEatingCount: emotionalCount,
        });
      }

      return results.sort((a, b) => b.date.localeCompare(a.date));
    },
  });
}
