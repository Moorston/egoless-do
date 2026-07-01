// ─── Mind / Fear regulation types ─────────────────────────────
import type { Syncable } from './shared';

// ── 基础枚举 ──

export type FearClassification = 'rational' | 'irrational' | 'mixed';
export type FearCategory = 'social' | 'loss' | 'health' | 'attachment' | 'failure' | 'unknown';
export type BodyRegion = 'head' | 'throat' | 'chest' | 'stomach' | 'pelvis' | 'back' | 'shoulders' | 'hands' | 'legs' | 'feet';
export type BodyShape = 'tight' | 'heavy' | 'tremble' | 'hollow' | 'burning' | 'ache' | 'block';
export type BodyTemp = 'cold' | 'hot' | 'neutral';
export type AchievementType = 'brave' | 'fearless' | 'alchemist' | 'tamer';
export type FeelingTag = 'relief' | 'pride' | 'calm' | 'still_scared' | 'surprise' | 'exhausted';

// ── 恐惧分类引导答案 ──

export interface ClassificationAnswers {
  hasEvidence: boolean;
  evidenceDesc?: string;
  worstImagination?: string;
  happened: boolean;
}

// ── 躯体恐惧标注 ──

export interface BodyFearMark {
  region: BodyRegion;
  shape: BodyShape;
  temperature: BodyTemp;
  intensity: number; // 1-5
  timestamp: number;
}

// ── 恐惧记录 ──

export interface FearEntry extends Syncable {
  id: string;
  date: string;           // YYYY-MM-DD
  timestamp: number;
  content: string;        // 恐惧描述
  trigger: string;        // 触发情境
  category: FearCategory;
  classification: FearClassification;
  classificationAnswers: ClassificationAnswers;
  worstOutcome?: string;  // 斯多葛：最坏结果
  probability?: number;   // 斯多葛：发生概率 1-10
  copingAbility?: number; // 斯多葛：应对能力 1-10
  fearIndex?: number;     // 计算值: probability × (10 - copingAbility)
  bodyLocations: BodyFearMark[];
  occurrenceCount: number;
}

// ── 勇气行动记录 ──

export interface CourageEntry extends Syncable {
  id: string;
  date: string;           // YYYY-MM-DD
  timestamp: number;
  fearId?: string;        // 关联恐惧 ID
  action: string;         // 微小行动描述
  fearBefore: number;     // 行动前恐惧值 1-10
  feeling?: string;       // 行动后感受描述
  feelingTags: FeelingTag[];
  streak: number;         // 连续行动天数
}

// ── 成就记录 ──

export interface FearAchievement extends Syncable {
  id: string;
  type: AchievementType;
  unlockedAt: number;     // 解锁时间戳
}

// ── 成就定义（用于 UI 展示）──

export interface AchievementDef {
  type: AchievementType;
  labelKey: string;
  descKey: string;
  icon: string;
  condition: string;
}

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  { type: 'brave',     labelKey: 'mindAchievementBrave',     descKey: 'mindAchievementBraveDesc',     icon: '🔥', condition: '连续7天勇气行动' },
  { type: 'fearless',  labelKey: 'mindAchievementFearless',  descKey: 'mindAchievementFearlessDesc',  icon: '⚡', condition: '连续30天勇气行动' },
  { type: 'alchemist', labelKey: 'mindAchievementAlchemist', descKey: 'mindAchievementAlchemistDesc', icon: '🧪', condition: '完成10次斯多葛演练' },
  { type: 'tamer',     labelKey: 'mindAchievementTamer',     descKey: 'mindAchievementTamerDesc',     icon: '🐉', condition: '恐惧指数从>30降至<15' },
];

// ── 恐惧分类定义 ──

export const FEAR_CATEGORY_DEFS: { key: FearCategory; labelKey: string }[] = [
  { key: 'social',      labelKey: 'mindCategorySocial' },
  { key: 'loss',        labelKey: 'mindCategoryLoss' },
  { key: 'health',      labelKey: 'mindCategoryHealth' },
  { key: 'attachment',  labelKey: 'mindCategoryAttachment' },
  { key: 'failure',     labelKey: 'mindCategoryFailure' },
  { key: 'unknown',     labelKey: 'mindCategoryUnknown' },
];

// ── 躯体区域定义 ──

export const BODY_REGION_DEFS: { key: BodyRegion; labelKey: string }[] = [
  { key: 'head',      labelKey: 'mindBodyHead' },
  { key: 'throat',    labelKey: 'mindBodyThroat' },
  { key: 'chest',     labelKey: 'mindBodyChest' },
  { key: 'stomach',   labelKey: 'mindBodyStomach' },
  { key: 'pelvis',    labelKey: 'mindBodyPelvis' },
  { key: 'back',      labelKey: 'mindBodyBack' },
  { key: 'shoulders', labelKey: 'mindBodyShoulders' },
  { key: 'hands',     labelKey: 'mindBodyHands' },
  { key: 'legs',      labelKey: 'mindBodyLegs' },
  { key: 'feet',      labelKey: 'mindBodyFeet' },
];

// ── 统计结果类型 ──

export interface FearStats {
  total: number;
  rational: number;
  irrational: number;
  mixed: number;
  totalCourage: number;
}

export interface CourageStats {
  currentStreak: number;
  totalActions: number;
  avgFearBefore: number;
  weeklyCompletionRate: number;
}

export interface BodyHeatmap {
  [region: string]: number; // region → 记录次数
}

export interface FearInsight {
  type: 'breathing' | 'meditation' | 'reflection' | 'sleep' | 'pattern';
  titleKey: string;
  description: string;
  metric?: string;
}

export interface DominantFearType {
  category: FearCategory;
  percentage: number;
}

export interface FearTimeSlot {
  hour: number;
  count: number;
}
