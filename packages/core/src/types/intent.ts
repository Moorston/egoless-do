// ─── Intent types ──────────────────────────────────────────────
import type { Syncable } from './shared';

export type IntentStatus = 
  | 'seed'        // 种子（刚产生，还在酝酿）
  | 'growing'     // 成长（已经有行动计划）
  | 'active'      // 活跃（正在执行）
  | 'achieved'    // 达成（目标完成）
  | 'integrated'  // 融入（变成了习惯/生活方式）
  | 'abandoned';  // 放弃（经过思考后放弃）

export type IntentSource = 
  | 'reflection'  // 从感念中提炼
  | 'review'      // 从复盘中发现
  | 'insight'     // 从洞察中产生
  | 'external';   // 外部触发（阅读、对话等）

export interface Intent extends Syncable {
  id: string;
  content: string;              // 意图描述
  why: string;                  // 为什么有这个意图
  source: IntentSource;         // 来源
  status: IntentStatus;         // 状态
  linkedReflectionIds: string[]; // 关联的感念 ID
  linkedPlanIds: string[];       // 关联的计划 ID
  linkedHabitIds: string[];      // 关联的习惯 ID
  outcome?: string;              // 最终结果
  learnings?: string[];          // 学到的东西
  createdAt: number;
  updatedAt: number;
}
