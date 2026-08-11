// ─── Reflection types ─────────────────────────────────────────────
import type { Syncable, Mood } from './shared';

export interface MindReflection extends Syncable {
  id: string;
  timestamp: number;
  content: string;
  tags: string[];
  mood: Mood;
  link?: string;
  linkedPlanItemId?: string;  // 关联的计划任务 ID
  linkedHabitId?: string;     // 关联的习惯 ID
  thoughtTrailIds?: string[]; // 所属思维脉络 ID 列表
  cardTheme?: string;
  colors: readonly [string, string];
  isPinned: boolean;
  isPublished: boolean;
}

// ─── Reflection filters ──────────────────────────────────────────

export interface ReflectionFilters {
  tags: string[];           // 多选标签 (OR 关系)
  moods: string[];          // 多选心情 (OR 关系)
  search: string;           // 搜索关键词
  dateRange?: {             // 时间范围
    from: number;           // timestamp
    to: number;
  };
  datePreset?: string;      // 用户选择的时间预设 key（week/month/7d/30d/custom）
  hasLink?: boolean;        // 仅有链接
  hasLinkedTask?: boolean;  // 仅关联计划任务
  collectionId?: string;    // 当前激活的智能集合 ID
}

export const DEFAULT_REFLECTION_FILTERS: ReflectionFilters = {
  tags: [],
  moods: [],
  search: '',
};
