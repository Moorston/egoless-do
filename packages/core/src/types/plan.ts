// ─── Plan types ───────────────────────────────────────────────────
import type { Syncable } from './shared';

export type PlanStatus = 'not_started' | 'in_progress' | 'paused' | 'completed' | 'cancelled';
export type PlanItemStatus = 'not_started' | 'in_progress' | 'paused' | 'completed' | 'cancelled' | 'delayed';
export type PlanItemLink = 'manual' | 'checkin' | 'fasting' | 'meditation' | 'exercise' | 'habit' | 'reflection' | 'trail';
export type PlanItemPriority = 'high' | 'medium' | 'low';

export type PlanItemSource =
  | { type: 'reflection'; id: string }
  | { type: 'trail'; id: string };

export type CheckinFrequency =
  | { mode: 'daily' }
  | { mode: 'interval'; every: number }
  | { mode: 'weekly'; target: number }
  | { mode: 'weekly_fixed'; days: number[] }
  | { mode: 'monthly'; target: number }
  | { mode: 'monthly_fixed'; dates: number[] };

export interface Plan extends Syncable {
  id: string;
  name: string;
  goal: string;
  slogan: string;
  startDate: string;
  endDate: string;
  status: PlanStatus;
  progress: number;
  completeReason?: string; // 完成时填写的原因（有未完成任务时）
  lastDelayedNotifyAt?: number; // 上次发送延期邮箱提醒的时间戳
}

export interface PlanItem extends Syncable {
  id: string;
  planId: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  contentUrl: string;
  totalCheckinDays: number;
  status: PlanItemStatus;
  progress: number;
  link: PlanItemLink;
  priority: PlanItemPriority;
  targetMetric: string;
  linkConfig?: {
    targetMinutes?: number;
    targetHours?: number;
    habitId?: string;
  };
  reflectionId?: string;  // 来源感念 ID
  trailId?: string;       // 来源脉络 ID
  order: number;
  frequency?: CheckinFrequency;
  tags?: string[];
}

export interface PlanItemCheckin extends Syncable {
  id: string;
  planItemId: string;
  date: string;
  done: boolean;
  note?: string;
  linkedModule?: string;
}

export interface DailyCustomTodo extends Syncable {
  id: string;
  planId: string;
  date: string; // YYYY-MM-DD
  name: string;
  done: boolean;
  order: number;
  recurring?: boolean;
}

export interface UnifiedPlanItemForm {
  name: string;
  description?: string;
  targetMetric?: string;
  startDate: string;
  endDate: string;
  priority: PlanItemPriority;
  frequency?: CheckinFrequency;
  tags?: string[];
}

export interface DailyTodoHistory extends Syncable {
  id: string;
  planId: string;
  date: string; // YYYY-MM-DD
  planItems: { id: string; name: string; link: PlanItemLink; done: boolean }[];
  customTodos: { id: string; name: string; done: boolean }[];
}
