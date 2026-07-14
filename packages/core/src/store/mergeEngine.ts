// ─── Merge Engine — Entity merge logic for sync data ───────────────────
// Extracted from createAuthSlice.ts to reduce its responsibility.

import { mergeById } from '../sync/merge';
import { activeOnly } from '../utils';
import type { SyncEntity } from '../sync/entities';

// ── Entity merge map: [syncKey, storeKey, mergeKey]
export const ENTITY_MERGE_MAP: Array<[string, string, string]> = [
  ['habit',           'habits',            'id'],
  ['reflection',      'reflections',       'id'],
  ['fasting',         'fastingHistory',    'id'],
  ['food',            'foodLog',           'id'],
  ['checkin',         'checkinHistory',    'date'],
  ['exercise',        'exerciseLog',       'id'],
  ['plan',            'plans',             'id'],
  ['planItem',        'planItems',         'id'],
  ['planItemCheckin', 'planItemCheckins',  'id'],
  ['dailyCustomTodo', 'dailyCustomTodos',  'id'],
  ['dailyTodoHistory','dailyTodoHistory',  'id'],
  ['grace',           'graceHistory',      'date'],
  ['thoughtTrail',    'thoughtTrails',     'id'],
  ['trailNote',       'trailNotes',        'id'],
  ['reflectionLink',  'reflectionLinks',   'id'],
  ['checkinReview',   'checkinReviews',    'id'],
  ['bodyGoal',        'bodyGoals',         'id'],
  ['bodyPlan',        'bodyPlans',         'id'],
  ['bodyTrainingPlan','bodyTrainingPlans',  'id'],
  ['weightRecord',    'weightRecords',     'id'],
  ['bodyCheckin',     'bodyCheckins',      'id'],
  ['sleep',           'sleepHistory',      'id'],
  ['give',            'giveHistory',       'id'],
];

/** Merge server sync data into current store state. */
export function buildMergePatch(
  data: Record<string, unknown[]>,
  s: Record<string, unknown>,
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};

  for (const [syncKey, storeKey, mergeKey] of ENTITY_MERGE_MAP) {
    const incoming = data[syncKey];
    if (!incoming) continue;
    const existing = (s[storeKey] ?? []) as Record<string, any>[];
    patch[storeKey] = mergeById(incoming as Record<string, any>[], existing, mergeKey)
      .filter((i: Record<string, any>) => !i.deleted);
  }

  // ── 特殊实体：meditation（需 activeOnly + totalMedMinutes 计算）
  if (data.meditation) {
    const mergedMed = mergeById(data.meditation as Record<string, any>[], (s.medHistory ?? []) as Record<string, any>[], 'date');
    patch.medHistory = activeOnly(mergedMed);
    patch.totalMedMinutes = (mergedMed as Array<{ durMin?: number; deleted?: boolean }>)
      .filter(m => !m.deleted).reduce((sum, m) => sum + (m.durMin || 0), 0);
  }

  // ── 特殊实体：aiConfig（取最新一条）
  if (data.aiConfig?.length) {
    const latest = (data.aiConfig as Record<string, unknown>[])
      .filter((c: Record<string, unknown>) => !c.deleted)
      .sort((a: Record<string, unknown>, b: Record<string, unknown>) => ((b.updatedAt as number) ?? 0) - ((a.updatedAt as number) ?? 0))[0];
    if (latest) {
      const cfg = latest as Record<string, unknown>;
      if (cfg.mode) patch.aiMode = cfg.mode;
      if (cfg.models) patch.aiModels = cfg.models;
    }
  }

  // ── 特殊实体：profile（解析 data 字段 + 设置时间覆盖）
  if (data.profile?.length) {
    const latest = (data.profile as Record<string, unknown>[])
      .filter((p: Record<string, unknown>) => !p.deleted)
      .sort((a: Record<string, unknown>, b: Record<string, unknown>) => ((b.updatedAt as number) ?? 0) - ((a.updatedAt as number) ?? 0))[0];
    if (latest) {
      let profileData = (latest as Record<string, unknown>).data ?? latest;
      if (typeof profileData === 'string') {
        try { profileData = JSON.parse(profileData); } catch { profileData = {}; }
      }
      const p = profileData as Record<string, unknown>;
      const SETTINGS_KEYS = ['calGoal', 'customFoodPresets', 'theme', 'language', 'remindEnabled', 'remindTime', 'customTags', 'customMoods', 'allTagsOrder', 'allMoodsOrder'] as const;
      const { calGoal: _cg, customFoodPresets: _cfp, theme: _th, language: _lg, remindEnabled: _re, remindTime: _rt, customTags: _ct, customMoods: _cm, allTagsOrder: _ato, allMoodsOrder: _amo, ...profileDataWithoutSettings } = p;
      patch.userProfile = { ...((s.userProfile as Record<string, unknown>) ?? {}), ...profileDataWithoutSettings };
      if (p.waterMl !== undefined) patch.waterMl = p.waterMl;
      if (p.waterGoal !== undefined) patch.waterGoal = p.waterGoal;
      if (p.weightUnit !== undefined) patch.weightUnit = p.weightUnit;
      const localUpdated = ((s.userProfile as Record<string, unknown>)?.updatedAt as number) ?? 0;
      const serverUpdated = ((latest as Record<string, unknown>).updatedAt as number) ?? 0;
      if (serverUpdated >= localUpdated) {
        for (const sk of SETTINGS_KEYS) {
          if (p[sk] !== undefined) (patch as Record<string, unknown>)[sk] = p[sk];
        }
      }
    }
  }

  return patch;
}