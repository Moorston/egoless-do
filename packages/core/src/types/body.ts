// ─── Body regulation types ────────────────────────────────────
import type { Syncable } from './shared';

export type BodyStrategy = 'lose_fat' | 'gain_muscle' | 'tone' | 'gain_weight' | 'maintain' | 'posture' | 'recovery';

export const BODY_STRATEGIES: { key: BodyStrategy; nameKey: string }[] = [
  { key: 'lose_fat', nameKey: 'bodyStrategyLoseFat' },
  { key: 'gain_muscle', nameKey: 'bodyStrategyGainMuscle' },
  { key: 'tone', nameKey: 'bodyStrategyTone' },
  { key: 'gain_weight', nameKey: 'bodyStrategyGainWeight' },
  { key: 'maintain', nameKey: 'bodyStrategyMaintain' },
  { key: 'posture', nameKey: 'bodyStrategyPosture' },
  { key: 'recovery', nameKey: 'bodyStrategyRecovery' },
];

export interface BodyGoal extends Syncable {
  id: string;
  targetWeight?: number;
  targetBodyFat?: number;
  targetDate?: string;
  strategy?: BodyStrategy;
  note?: string;
}

export interface BodyPlan extends Syncable {
  id: string;
  goalId?: string;
  weekday: number; // 1-7 (Mon-Sun)
  part: string; // training part: 胸+三头, 背+二头, 腿+核心, 有氧, 休息
  sportKey?: string; // linked sport key
  note?: string;
}

export interface WeightRecord extends Syncable {
  id: string;
  date: string; // YYYY-MM-DD
  weight: number;
  bodyFat?: number;
}

export const BODY_TAGS_PRESET: { category: string; tags: string[] }[] = [
  { category: '体型', tags: ['偏瘦', '偏胖', '标准'] },
  { category: '疼痛', tags: ['腰酸', '颈椎', '膝痛', '肩痛', '头痛'] },
  { category: '体感', tags: ['体虚', '体寒', '湿气', '气短', '乏力', '失眠'] },
  { category: '习惯', tags: ['久坐', '少运动', '熬夜'] },
  { category: '能力', tags: ['上肢弱', '下肢弱', '核心弱', '柔韧差', '心肺差'] },
];
