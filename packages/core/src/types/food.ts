// ─── Food types ───────────────────────────────────────────────────
import type { Syncable } from './shared';

export interface FoodEntry extends Syncable {
  id: string;
  name: string;
  calories: number;
  note?: string;
  timestamp: number;
}

export interface FoodPreset {
  name: string;
  nameEn: string;
  cal: number;
  unit: string;
  unitEn: string;
}

export interface FoodCategory {
  key: string;
  label: string;
  labelEn: string;
  icon: string;
  items: FoodPreset[];
}

export interface CustomFoodPreset {
  id: string;
  name: string;
  calories: number;
  note?: string;
  updatedAt: number;
  deleted: boolean;
}
