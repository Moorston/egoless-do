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
  cardTheme?: string;
  colors: readonly [string, string];
  isPinned: boolean;
  isPublished: boolean;
}
