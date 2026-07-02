// ─── Mind slice interface ─────────────────────────────────────
// Extracted from store/types.ts to break circular import
import type {
  FearEntry, CourageEntry, FearAchievement, FearCategory,
  FearStats, CourageStats, BodyHeatmap,
  FearInsight, FearTimeSlot, DominantFearType, AchievementType,
} from '../types';

export interface MindSlice {
  fearEntries: FearEntry[];
  courageEntries: CourageEntry[];
  achievements: FearAchievement[];

  addFearEntry: (entry: Omit<FearEntry, 'id' | 'updatedAt' | 'deleted' | 'occurrenceCount'>) => void;
  updateFearEntry: (id: string, patch: Partial<FearEntry>) => void;
  deleteFearEntry: (id: string) => void;
  addCourageEntry: (entry: Omit<CourageEntry, 'id' | 'updatedAt' | 'deleted' | 'streak'>) => void;
  deleteCourageEntry: (id: string) => void;
  unlockAchievement: (type: AchievementType) => void;
  checkAchievements: () => void;

  getFearStats: () => FearStats;
  getFearIndexTrend: (fearId: string) => number[];
  getCourageStreak: () => number;
  getAchievements: () => FearAchievement[];
  getBodyHeatmap: () => BodyHeatmap;
  getDominantFearType: () => DominantFearType | null;
  getFearTimeDistribution: () => FearTimeSlot[];
  getCourageTrend: () => { date: string; avgFearBefore: number }[];
  getCrossModuleInsights: () => FearInsight[];
}
