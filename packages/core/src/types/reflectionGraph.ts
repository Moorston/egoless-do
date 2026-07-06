/**
 * reflectionGraph — 图构建纯函数的类型定义
 *
 * 与 apps/mobile/src/features/reflections/insights/types.ts 保持同步。
 * 此处为 core 层的共享类型，mobile 层可 re-export。
 */

// ── 节点类型 ──────────────────────────────────────────────────────
export type NodeType = 'reflection' | 'plan' | 'habit' | 'trail' | 'planItem';

export interface RelationNode {
  id: string;
  type: NodeType;
  label: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  /** Consider a discriminated union for type-safe data based on NodeType */
  data: Record<string, unknown>;
}

// ── 边类型 ────────────────────────────────────────────────────────
/** Typed edge types used in graph construction. */
export type EdgeType = 'related' | 'linked' | 'same_tag' | 'contains' | 'belongs';

export interface RelationEdge {
  from: string;
  to: string;
  type: EdgeType;
  label: string;
}

// ── 上下文类型 ────────────────────────────────────────────────────
/** Same as NodeType, aliased for context-specific typing. */
export type RelationContextType = NodeType;

export interface RelationContext {
  type: RelationContextType;
  id: string;
}

// ── 图构建输入 ────────────────────────────────────────────────────
export interface GraphBuildInput {
  context: RelationContext;
  plans: Array<{ id: string; name: string; deleted?: boolean }>;
  planItems: Array<{
    id: string;
    name: string;
    planId: string;
    deleted?: boolean;
    reflectionId?: string;
    trailId?: string;
    linkConfig?: { habitId?: string };
  }>;
  reflections: Array<{
    id: string;
    content: string;
    tags: string[];
    deleted?: boolean;
    linkedPlanItemId?: string;
  }>;
  thoughtTrails: Array<{
    id: string;
    name: string;
    deleted?: boolean;
    reflectionIds?: string[];
    linkedPlanItemIds?: string[];
  }>;
  habits: Array<{ id: string; name: string; deleted?: boolean }>;
  reflectionLinks: Array<{
    fromId: string;
    toId: string;
    type: string;
    deleted?: boolean;
  }>;
}

// ── 图构建输出 ────────────────────────────────────────────────────
export interface GraphBuildResult {
  nodes: RelationNode[];
  edges: RelationEdge[];
  insights: string[];
  contextNode: RelationNode | null;
}
