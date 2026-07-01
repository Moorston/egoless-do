// ─── Diet / Wuxing types ──────────────────────────────────────
import type { Syncable } from './shared';

// ── 五行基础类型 ──

export type WuxingElement = 'wood' | 'fire' | 'earth' | 'metal' | 'water';
export type FlavorType    = 'sour' | 'bitter' | 'sweet' | 'pungent' | 'salty';
export type FoodNature    = 'hot' | 'warm' | 'neutral' | 'cool' | 'cold';
export type OrganType     = 'liver' | 'heart' | 'spleen' | 'lung' | 'kidney';
export type FoodCategory  = 'grain' | 'bean' | 'vegetable' | 'fruit' |
                            'meat' | 'seafood' | 'seasoning' | 'other';

// ── 进食动机 ──

export type EatingMotivation =
  | 'hunger'    // 生理饥饿
  | 'stress'    // 压力
  | 'boredom'   // 无聊
  | 'habit'     // 习惯
  | 'reward'    // 奖励
  | 'social'    // 社交
  | 'craving'   // 渴望/嘴馋
  | 'comfort';  // 安慰

// ── 食材五行映射条目 ──

export interface FoodWuxingItem {
  foodKey: string;
  name: string;
  nameEn: string;
  category: FoodCategory;
  isCommon: boolean;
  primaryFlavor: FlavorType;
  primaryElement: WuxingElement;
  secondaryFlavor?: FlavorType;
  nature: FoodNature;
  organs: OrganType[];
  effect: string;
  effectEn: string;
  aliases?: string[];
}

// ── 进食动机记录 (独立表，通过 foodId 关联 FoodEntry) ──

export interface EatingMotivationEntry extends Syncable {
  id: string;
  foodId: string;
  date: string;         // YYYY-MM-DD
  motivation: EatingMotivation;
  hungerLevel?: number; // 1-5
}

// ── 用户自定义五行映射 ──

export interface CustomWuxingMap extends Syncable {
  id: string;
  foodName: string;
  flavor: FlavorType;
  element: WuxingElement;
}

// ── 统计结果类型 ──

export interface WuxingStats {
  wood: number;
  fire: number;
  earth: number;
  metal: number;
  water: number;
  dominant: WuxingElement;
  deficient: WuxingElement;
  isBalanced: boolean;
}

export interface FlavorStats {
  sour: number;
  bitter: number;
  sweet: number;
  pungent: number;
  salty: number;
  total: number;
}

export interface MotivationStats {
  physical: number;
  emotional: number;
  habitual: number;
  social: number;
  breakdown: Record<EatingMotivation, number>;
  total: number;
}

export interface EmotionSensitiveDay {
  date: string;
  moods: string[];
  reflectionContent?: string;
  eatingMotivations: EatingMotivation[];
  emotionalEatingCount: number;
}
