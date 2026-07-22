// ─── Exercise types ───────────────────────────────────────────────
import type { Syncable } from './shared';

export interface GeoPoint {
  lat: number;
  lng: number;
  ts: number;
  altitude?: number;
  speed?: number;
}

export interface ExerciseSet {
  reps: number;
  restSec?: number;
}

export interface ExerciseEntry extends Syncable {
  id: string;
  sportKey: string;
  sportIcon: string;
  durationSec: number;
  timestamp: number;
  distanceKm?: number;
  calories?: number;
  avgPace?: number;
  trackPoints?: GeoPoint[];
  isGpsSport?: boolean;
  mode?: 'free' | 'target';
  target?: { type: 'distance' | 'time' | 'calories' | 'reps'; value: number };
  segmentPaces?: number[];
  elevationGain?: number;
  pausedDuration?: number;
  reps?: number;
  sets?: ExerciseSet[];
  met?: number;
  healthSynced?: boolean; // 本地标记：是否已同步到 HealthKit/Health Connect
  planId?: string;           // 关联的训练计划 ID
  planTaskWeekday?: number;  // 关联的计划任务星期 (1-7)
  note?: string;             // 备注（如组合训练中的具体动作名称）
}

export interface SportItem {
  key: string;
  keyEn?: string;
  icon: string;
  color: string;
  gps?: boolean;
}

export interface SportGroup {
  group: string;
  groupEn?: string;
  items: SportItem[];
}
