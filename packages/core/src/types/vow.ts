import type { Syncable } from './shared';

export type VisionType = 'lifetime' | 'long' | 'short';
export type VisionStatus = 'active' | 'achieved' | 'archived';
export type LongTimeFrame = '1year' | '3years' | '5years';
export type ShortTimeFrame = '3months' | '6months' | '1year';
export type VisionTimeFrame = LongTimeFrame | ShortTimeFrame;
export type RefType = 'habit' | 'plan';
export type DedicationType = 'weekly' | 'biweekly' | 'monthly' | 'custom';

export interface Vision extends Syncable {
  id: string;
  type: VisionType;
  text: string;
  timeFrame?: VisionTimeFrame;
  deadline?: string;
  status: VisionStatus;
  achievedAt?: number;
  sortOrder: number;
}

export interface VisionPractice extends Syncable {
  id: string;
  visionId: string;
  refType: RefType;
  refId: string;
}

export interface HabitStat {
  habitId: string;
  name: string;
  completed: number;
  total: number;
  prevCompleted?: number;
}

export interface PlanProgress {
  planId: string;
  name: string;
  progressDelta: number;
}

export interface VisionProgress {
  visionId: string;
  before: number;
  after: number;
}

export interface Dedication extends Syncable {
  id: string;
  date: string;
  periodLabel: string;
  type: DedicationType;
  practiceDays: number;
  totalDays: number;
  habitStats: HabitStat[];
  planProgress?: PlanProgress[];
  visionProgress?: VisionProgress[];
  insight?: string;
  adjustment?: string;
}

export interface DedicationSettings {
  frequency: DedicationType;
  customDays?: number;
  dayOfWeek?: number;
  dayOfMonth?: number;
  remindEnabled: boolean;
  remindTime?: string;
}

export const DEFAULT_DEDICATION_SETTINGS: DedicationSettings = {
  frequency: 'weekly',
  dayOfWeek: 0,
  remindEnabled: true,
  remindTime: '21:00',
};

export const VISION_TIME_FRAMES: { key: VisionTimeFrame; labelKey: string }[] = [
  { key: '3months', labelKey: 'vowTf3Months' },
  { key: '6months', labelKey: 'vowTf6Months' },
  { key: '1year', labelKey: 'vowTf1Year' },
  { key: '3years', labelKey: 'vowTf3Years' },
  { key: '5years', labelKey: 'vowTf5Years' },
];
