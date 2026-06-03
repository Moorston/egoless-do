// ─── Reflection types ─────────────────────────────────────────────
import type { Syncable, Mood } from './shared';

export interface MindReflection extends Syncable {
  id: string;
  timestamp: number;
  content: string;
  tags: string[];
  mood: Mood;
  link?: string;
  linkedHabitId?: string;
  linkedPlanItemId?: string;  // 关联的计划任务 ID
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
  hasLink?: boolean;        // 仅有链接
  isPinned?: boolean;       // 仅置顶
  collectionId?: string;    // 当前激活的智能集合 ID
}

export const DEFAULT_REFLECTION_FILTERS: ReflectionFilters = {
  tags: [],
  moods: [],
  search: '',
};
