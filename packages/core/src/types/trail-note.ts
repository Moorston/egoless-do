// ─── TrailNote types ──────────────────────────────────────────
import type { Syncable, Mood } from './shared';

export interface TrailNote extends Syncable {
  id: string;
  trailId: string;           // 所属脉络 ID
  content: string;           // 内容
  tags: string[];            // 标签
  mood?: Mood;               // 心情（可选）
  source: 'guided' | 'free'; // 来源：AI引导 / 自由写作
  guidedQuestion?: string;   // 引导问题（guided 时有值）
  order: number;             // 排序
  createdAt: number;
  updatedAt: number;
}
