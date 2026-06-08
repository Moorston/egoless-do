// ─── ThoughtTrail types ──────────────────────────────────────────
import type { Syncable } from './shared';

export type ThoughtTrailSource = 'auto' | 'manual' | 'recommended';

export interface ThoughtTrail extends Syncable {
  id: string;
  name: string;
  description?: string;
  reflectionIds: string[];  // 关联的感念 ID 列表（有序）
  source: ThoughtTrailSource; // 来源：自动发现、手动创建、推荐
  intentId?: string;         // 指向的意图 ID
  insightSummary?: string;   // 核心洞察摘要
  createdAt: number;
  updatedAt: number;
}
