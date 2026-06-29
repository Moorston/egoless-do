// ─── ThoughtTrail types ──────────────────────────────────────────
import type { Syncable } from './shared';

export type ThoughtTrailSource = 'auto' | 'manual' | 'recommended' | 'ai';

export interface TrailInsightCache {
  summary: string;         // 核心摘要
  keyPoints: string[];     // 关键要点
  turningPoints: string[]; // 转折点
  suggestions: string[];   // 建议
  generatedAt: number;     // 生成时间戳
  model?: string;          // 使用的模型
  source: 'local' | 'cloud';
}

export interface TrailReviewCache {
  perspectives: string[];  // 复盘思路（多维度视角）
  observations: string[];  // 观察发现
  suggestions: string[];   // 复盘建议
  questions?: string[];    // 引导性问题
  generatedAt: number;
  model?: string;
  source: 'local' | 'cloud';
}

export interface ThoughtTrail extends Syncable {
  id: string;
  name: string;
  description?: string;
  reflectionIds: string[];      // 关联的感念 ID 列表（有序）
  noteIds: string[];            // 脉络感念 ID 列表（有序）
  source: ThoughtTrailSource;   // 来源：自动发现、手动创建、推荐
  insightSummary?: string;      // 核心洞察摘要（旧字段，兼容用）
  insightCache?: TrailInsightCache;  // AI 洞察缓存
  reviewCache?: TrailReviewCache;    // 复盘引导缓存
  linkedPlanItemIds?: string[];      // 关联的计划项 ID 列表
  createdAt: number;
  updatedAt: number;
}
