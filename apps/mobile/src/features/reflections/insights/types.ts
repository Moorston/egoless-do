/**
 * 关系图类型定义 — RelationMapView 及相关组件共享
 */

// ── 节点类型 ──────────────────────────────────────────────────────
export type NodeType = 'reflection' | 'plan' | 'habit' | 'trail' | 'planItem' | 'vision';

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
  data: Record<string, unknown>;
}

// ── 边类型 ────────────────────────────────────────────────────────
export type EdgeStyleType =
  | 'related'
  | 'linked'
  | 'inspire'
  | 'evolve'
  | 'contrast'
  | 'respond'
  | 'same_tag'
  | 'contains'
  | 'belongs';

export interface RelationEdge {
  from: string;
  to: string;
  type: string;
  label: string;
}

export interface EdgeStyle {
  color: string;
  lineStyle: 'solid' | 'dashed' | 'dotted';
  label: string;
  thickness: number;
}

// ── 上下文类型 ────────────────────────────────────────────────────
export type RelationContextType = 'plan' | 'habit' | 'reflection' | 'trail' | 'planItem' | 'vision';

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
  visions: Array<{ id: string; text: string; deleted?: boolean }>;
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

// ── 常量 ──────────────────────────────────────────────────────────
export const NODE_COLORS: Record<NodeType, string> = {
  reflection: '#3B82F6',
  plan: '#10B981',
  habit: '#F59E0B',
  trail: '#06B6D4',
  planItem: '#8B5CF6',
  vision: '#F59E0B',
};

export const NODE_LABELS: Record<NodeType, string> = {
  reflection: '感念',
  plan: '计划',
  habit: '习惯',
  trail: '思维脉络',
  planItem: '计划任务',
  vision: '愿景',
};

export const NODE_ICONS: Record<NodeType, string> = {
  reflection: '💭',
  plan: '📋',
  habit: '🌱',
  trail: '🧵',
  planItem: '📌',
  vision: '🎯',
};

export const EDGE_STYLES: Record<EdgeStyleType, EdgeStyle> = {
  contains: { color: '#06B6D4', lineStyle: 'solid', label: '包含', thickness: 3 },
  linked: { color: '#F59E0B', lineStyle: 'solid', label: '关联', thickness: 2 },
  related: { color: '#3B82F6', lineStyle: 'solid', label: '相关', thickness: 2 },
  inspire: { color: '#8B5CF6', lineStyle: 'dashed', label: '启发', thickness: 2 },
  evolve: { color: '#8B5CF6', lineStyle: 'dashed', label: '演进', thickness: 2 },
  contrast: { color: '#8B5CF6', lineStyle: 'dashed', label: '对比', thickness: 2 },
  respond: { color: '#8B5CF6', lineStyle: 'dashed', label: '回应', thickness: 2 },
  same_tag: { color: '#9CA3AF', lineStyle: 'dotted', label: '同标签', thickness: 1 },
  belongs: { color: '#06B6D4', lineStyle: 'dashed', label: '所属', thickness: 2 },
};
