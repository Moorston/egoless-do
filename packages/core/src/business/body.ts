// ─── Body regulation business logic (pure functions) ──────────
import type { BodyStrategy } from '../types';
import { uid } from '../utils';

export function calcBMI(weight: number, heightCm: number): number {
  if (heightCm <= 0 || weight <= 0) return 0;
  const heightM = heightCm / 100;
  return Math.round((weight / (heightM * heightM)) * 10) / 10;
}

export function calcBMR(weight: number, heightCm: number, age: number, gender: 'male' | 'female'): number {
  if (weight <= 0 || heightCm <= 0 || age <= 0) return 0;
  // Mifflin-St Jeor equation
  const base = 10 * weight + 6.25 * heightCm - 5 * age;
  return Math.round(base + (gender === 'male' ? 5 : -161));
}

export function calcGoalProgress(
  current: number | undefined,
  target: number | undefined,
  initial: number | undefined,
): number {
  if (current == null || target == null || initial == null) return 0;
  const totalChange = Math.abs(initial - target);
  if (totalChange === 0) return 100;
  const achieved = Math.abs(initial - current);
  return Math.min(Math.round((achieved / totalChange) * 100), 100);
}

export function recommendStrategy(bodyTags: string[]): BodyStrategy | null {
  const tagSet = new Set(bodyTags);
  if (tagSet.has('偏瘦') || tagSet.has('上肢弱') || tagSet.has('下肢弱') || tagSet.has('核心弱')) return 'gain_muscle';
  if (tagSet.has('偏胖')) return 'lose_fat';
  if (tagSet.has('颈椎') || tagSet.has('腰酸')) return 'posture';
  if (tagSet.has('体虚') || tagSet.has('乏力') || tagSet.has('气短')) return 'recovery';
  return null;
}

export function createBodyGoal(partial: {
  targetWeight?: number;
  targetBodyFat?: number;
  initialWeight?: number;
  initialBodyFat?: number;
  targetDate?: string;
  strategy?: BodyStrategy;
  note?: string;
}) {
  return {
    id: uid(),
    targetWeight: partial.targetWeight,
    targetBodyFat: partial.targetBodyFat,
    initialWeight: partial.initialWeight,
    initialBodyFat: partial.initialBodyFat,
    targetDate: partial.targetDate ?? '',
    strategy: partial.strategy,
    note: partial.note ?? '',
    updatedAt: Date.now(),
    deleted: false,
  };
}

export function createBodyPlan(partial: {
  goalId?: string;
  weekday: number;
  part: string;
  sportKey?: string;
  note?: string;
}) {
  return {
    id: uid(),
    goalId: partial.goalId ?? '',
    weekday: partial.weekday,
    part: partial.part,
    sportKey: partial.sportKey ?? '',
    note: partial.note ?? '',
    updatedAt: Date.now(),
    deleted: false,
  };
}

export function createWeightRecord(partial: {
  date: string;
  weight: number;
  bodyFat?: number;
}) {
  return {
    id: uid(),
    date: partial.date,
    weight: partial.weight,
    bodyFat: partial.bodyFat,
    updatedAt: Date.now(),
    deleted: false,
  };
}

export function createBodyCheckin(partial: {
  date: string;
  energy: number;
  pain: number;
  comfort: number;
  sleep: number;
  tags: string[];
  note?: string;
}) {
  return {
    id: uid(),
    date: partial.date,
    energy: partial.energy,
    pain: partial.pain,
    comfort: partial.comfort,
    sleep: partial.sleep,
    tags: partial.tags,
    note: partial.note ?? '',
    updatedAt: Date.now(),
    deleted: false,
  };
}
