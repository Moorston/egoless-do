// ─── Plan types ───────────────────────────────────────────────────
import type { Syncable } from './shared';

export type PlanStatus = 'not_started' | 'in_progress' | 'paused' | 'completed' | 'cancelled';
export type PlanItemStatus = 'not_started' | 'in_progress' | 'paused' | 'completed' | 'delayed';
export type PlanItemLink = 'manual' | 'checkin' | 'fasting' | 'meditation' | 'exercise' | 'habit';
export type PlanItemPriority = 'high' | 'medium' | 'low';

export interface Plan extends Syncable {
  id: string;
  name: string;
  goal: string;
  slogan: string;
  startDate: string;
  endDate: string;
  status: PlanStatus;
  progress: number;
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
    habitId?: string;
    targetMinutes?: number;
    targetHours?: number;
  };
  order: number;
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
}

export interface DailyTodoHistory extends Syncable {
  id: string;
  planId: string;
  date: string; // YYYY-MM-DD
  planItems: { id: string; name: string; link: PlanItemLink; done: boolean }[];
  customTodos: { id: string; name: string; done: boolean }[];
}
