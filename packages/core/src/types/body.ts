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

// ─── Exercise categories config ─────────────────────────────────

export interface ExerciseCategory {
  category: string;  // i18n key
  key: string;       // unique identifier
  icon: string;      // emoji
  type: 'traditional' | 'modern';
  i18nKey: string;   // translation key for the name
}

export const EXERCISE_CATEGORIES: ExerciseCategory[] = [
  // Traditional
  { category: 'bodyCatTraditional', key: 'baduanjin', icon: '🧘', type: 'traditional', i18nKey: 'bodyPartBaduanjin' },
  { category: 'bodyCatTraditional', key: 'wuqinxi', icon: '🦌', type: 'traditional', i18nKey: 'bodyPartWuqinxi' },
  { category: 'bodyCatTraditional', key: 'taiji', icon: '☯️', type: 'traditional', i18nKey: 'bodyPartTaiji' },
  { category: 'bodyCatTraditional', key: 'zhanzhuang', icon: '🧍', type: 'traditional', i18nKey: 'bodyPartZhanzhuang' },
  { category: 'bodyCatTraditional', key: 'jingluo', icon: '👋', type: 'traditional', i18nKey: 'bodyPartJingluo' },
  { category: 'bodyCatTraditional', key: 'yoga', icon: '🧘‍♀️', type: 'traditional', i18nKey: 'bodyPartYoga' },
  { category: 'bodyCatTraditional', key: 'walking', icon: '🚶', type: 'traditional', i18nKey: 'bodyPartWalking' },
  // Modern
  { category: 'bodyCatModern', key: 'chest_triceps', icon: '💪', type: 'modern', i18nKey: 'bodyPartChestTriceps' },
  { category: 'bodyCatModern', key: 'back_biceps', icon: '🔙', type: 'modern', i18nKey: 'bodyPartBackBiceps' },
  { category: 'bodyCatModern', key: 'legs_core', icon: '🦵', type: 'modern', i18nKey: 'bodyPartLegsCore' },
  { category: 'bodyCatModern', key: 'cardio', icon: '❤️', type: 'modern', i18nKey: 'bodyPartCardio' },
  { category: 'bodyCatModern', key: 'shoulders_arms', icon: '🤲', type: 'modern', i18nKey: 'bodyPartShouldersArms' },
  { category: 'bodyCatModern', key: 'full_body', icon: '🏃', type: 'modern', i18nKey: 'bodyPartFullBody' },
  { category: 'bodyCatModern', key: 'hiit', icon: '⚡', type: 'modern', i18nKey: 'bodyPartHiit' },
  { category: '', key: 'rest', icon: '😴', type: 'modern', i18nKey: 'bodyPartRest' },
];

// Map old part strings to new keys for backward compatibility
export const PART_STRING_TO_KEY: Record<string, string> = {
  '胸+三头': 'chest_triceps', '背+二头': 'back_biceps', '腿+核心': 'legs_core',
  '有氧': 'cardio', '肩+手臂': 'shoulders_arms', '全身': 'full_body', '休息': 'rest',
};

// ─── BodyCheckin ─────────────────────────────────────────────────

export interface BodyCheckin extends Syncable {
  id: string;
  date: string;       // YYYY-MM-DD, unique per day
  energy: number;     // 1-5
  pain: number;       // 1-5
  comfort: number;    // 1-5
  sleep: number;      // 1-5
  tags: string[];
  note?: string;
  synced?: boolean;   // whether synced to remote
}
