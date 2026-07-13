/**
 * reflectionGraph — 关系图构建纯函数
 *
 * 纯函数，无 React 依赖，可独立测试。
 * 被 apps/mobile/src/features/reflections/insights/useRelationGraph.ts 调用。
 */

import type {
  NodeType,
  EdgeType,
  RelationNode,
  RelationEdge,
  GraphBuildInput,
  GraphBuildResult,
} from '../types/reflectionGraph';

// ── 常量（从 types 导入供内部使用）──────────────────────────────────
const VB_W = 800;
const VB_H = 1200;
const MAX_NODES = 20;

const DEFAULT_COLORS: Record<NodeType, string> = {
  vision: '#F59E0B',
  reflection: '#3B82F6',
  plan: '#10B981',
  habit: '#F59E0B',
  trail: '#06B6D4',
  planItem: '#8B5CF6',
  vision: '#F59E0B',
};

// ── 辅助：安全取数组 ───────────────────────────────────────────────
const safe = <T>(arr: T[] | undefined | null): T[] => arr ?? [];

// ── 辅助：创建节点 ─────────────────────────────────────────────────
function makeNode(
  id: string,
  type: NodeType,
  label: string,
  data: Record<string, unknown>,
  cx: number,
  cy: number,
): RelationNode {
  return {
    id,
    type,
    label: [...label].length > 20 ? [...label].slice(0, 20).join('') + '...' : label,
    x: cx + (Math.random() - 0.5) * VB_W * 0.6,
    y: cy + (Math.random() - 0.5) * VB_H * 0.4,
    vx: 0,
    vy: 0,
    color: DEFAULT_COLORS[type],
    size: type === 'reflection' ? 30 : 40,
    data,
  };
}

// ── 辅助：创建边 ───────────────────────────────────────────────────
function addEdge(
  edges: RelationEdge[],
  from: string,
  to: string,
  type: EdgeType,
  label: string,
): void {
  if (!edges.some(e => e.from === from && e.to === to && e.type === type)) {
    edges.push({ from, to, type, label });
  }
}

// ── 图构建：plan 上下文 ───────────────────────────────────────────
function buildPlanGraph(
  input: GraphBuildInput,
  nodes: RelationNode[],
  nodeMap: Map<string, RelationNode>,
  edges: RelationEdge[],
): RelationNode | null {
  const plan = safe(input.plans).find(p => !p.deleted && p.id === input.context.id);
  if (!plan) return null;

  const cx = VB_W / 2;
  const cy = VB_H / 2;
  const planNode = makeNode(plan.id, 'plan', plan.name, plan, cx, cy);
  nodes.push(planNode);
  nodeMap.set(plan.id, planNode);

  const planItems = safe(input.planItems).filter(pi => pi.planId === plan.id && !pi.deleted);
  for (const item of planItems) {
    if (!nodeMap.has(item.id)) {
      nodes.push(makeNode(item.id, 'planItem', item.name, item, cx, cy));
      nodeMap.set(item.id, nodes[nodes.length - 1]);
    }
    addEdge(edges, plan.id, item.id, 'contains', '包含');

    if (item.reflectionId) {
      const r = safe(input.reflections).find(ref => ref.id === item.reflectionId);
      if (r && !r.deleted && !nodeMap.has(r.id)) {
        nodes.push(makeNode(r.id, 'reflection', r.content, r, cx, cy));
        nodeMap.set(r.id, nodes[nodes.length - 1]);
        addEdge(edges, r.id, item.id, 'related', '相关');
      }
    }
    if (item.trailId) {
      const t = safe(input.thoughtTrails).find(tr => tr.id === item.trailId);
      if (t && !t.deleted && !nodeMap.has(t.id)) {
        nodes.push(makeNode(t.id, 'trail', t.name, t, cx, cy));
        nodeMap.set(t.id, nodes[nodes.length - 1]);
        addEdge(edges, t.id, item.id, 'related', '相关');
      }
    }
    if (item.linkConfig?.habitId) {
      const h = safe(input.habits).find(hab => hab.id === item.linkConfig!.habitId);
      if (h && !h.deleted && !nodeMap.has(h.id)) {
        nodes.push(makeNode(h.id, 'habit', h.name, h, cx, cy));
        nodeMap.set(h.id, nodes[nodes.length - 1]);
        addEdge(edges, h.id, item.id, 'linked', '关联');
      }
    }
  }

  return planNode;
}

// ── 图构建：habit 上下文 ──────────────────────────────────────────
function buildHabitGraph(
  input: GraphBuildInput,
  nodes: RelationNode[],
  nodeMap: Map<string, RelationNode>,
  edges: RelationEdge[],
): RelationNode | null {
  const habit = safe(input.habits).find(h => !h.deleted && h.id === input.context.id);
  if (!habit) return null;

  const cx = VB_W / 2;
  const cy = VB_H / 2;
  const habitNode = makeNode(habit.id, 'habit', habit.name, habit, cx, cy);
  nodes.push(habitNode);
  nodeMap.set(habit.id, habitNode);

  const tagReflections = safe(input.reflections).filter(
    r => !r.deleted && r.tags.some(t => t === `#${habit.name}` || t === habit.name),
  );
  for (const r of tagReflections) {
    if (!nodeMap.has(r.id)) {
      nodes.push(makeNode(r.id, 'reflection', r.content, r, cx, cy));
      nodeMap.set(r.id, nodes[nodes.length - 1]);
    }
    addEdge(edges, r.id, habit.id, 'related', '相关');
  }

  const linkedPlanItems = safe(input.planItems).filter(
    i => !i.deleted && i.linkConfig?.habitId === habit.id,
  );
  for (const item of linkedPlanItems) {
    if (!nodeMap.has(item.id)) {
      nodes.push(makeNode(item.id, 'planItem', item.name, item, cx, cy));
      nodeMap.set(item.id, nodes[nodes.length - 1]);
    }
    addEdge(edges, habit.id, item.id, 'linked', '关联');
    const plan = safe(input.plans).find(p => p.id === item.planId);
    if (plan && !plan.deleted && !nodeMap.has(plan.id)) {
      nodes.push(makeNode(plan.id, 'plan', plan.name, plan, cx, cy));
      nodeMap.set(plan.id, nodes[nodes.length - 1]);
      addEdge(edges, plan.id, item.id, 'contains', '包含');
    }
  }

  return habitNode;
}

// ── 图构建：reflection 上下文 ─────────────────────────────────────
function buildReflectionGraph(
  input: GraphBuildInput,
  nodes: RelationNode[],
  nodeMap: Map<string, RelationNode>,
  edges: RelationEdge[],
): RelationNode | null {
  const reflection = safe(input.reflections).find(r => !r.deleted && r.id === input.context.id);
  if (!reflection) return null;

  const cx = VB_W / 2;
  const cy = VB_H / 2;
  const reflectionNode = makeNode(reflection.id, 'reflection', reflection.content, reflection, cx, cy);
  nodes.push(reflectionNode);
  nodeMap.set(reflection.id, reflectionNode);

  const relatedLinks = safe(input.reflectionLinks).filter(
    l => !l.deleted && (l.fromId === reflection.id || l.toId === reflection.id),
  );
  for (const link of relatedLinks) {
    const otherId = link.fromId === reflection.id ? link.toId : link.fromId;
    const other = safe(input.reflections).find(r => r.id === otherId);
    if (other && !other.deleted && !nodeMap.has(other.id)) {
      nodes.push(makeNode(other.id, 'reflection', other.content, other, cx, cy));
      nodeMap.set(other.id, nodes[nodes.length - 1]);
      addEdge(edges, link.fromId, link.toId, link.type as EdgeType, link.type);
    }
  }

  const sameTagReflections = safe(input.reflections)
    .filter(r => !r.deleted && r.id !== reflection.id && r.tags.some(t => reflection.tags.includes(t)))
    .slice(0, 3);
  for (const r of sameTagReflections) {
    if (!nodeMap.has(r.id)) {
      nodes.push(makeNode(r.id, 'reflection', r.content, r, cx, cy));
      nodeMap.set(r.id, nodes[nodes.length - 1]);
      addEdge(edges, reflection.id, r.id, 'same_tag', '同标签');
    }
  }

  if (reflection.linkedPlanItemId) {
    const planItem = safe(input.planItems).find(i => i.id === reflection.linkedPlanItemId);
    if (planItem && !planItem.deleted && !nodeMap.has(planItem.id)) {
      nodes.push(makeNode(planItem.id, 'planItem', planItem.name, planItem, cx, cy));
      nodeMap.set(planItem.id, nodes[nodes.length - 1]);
      addEdge(edges, reflection.id, planItem.id, 'related', '相关');
      const plan = safe(input.plans).find(p => p.id === planItem.planId);
      if (plan && !plan.deleted && !nodeMap.has(plan.id)) {
        nodes.push(makeNode(plan.id, 'plan', plan.name, plan, cx, cy));
        nodeMap.set(plan.id, nodes[nodes.length - 1]);
        addEdge(edges, plan.id, planItem.id, 'contains', '包含');
      }
    }
  }

  const containingTrails = safe(input.thoughtTrails).filter(
    t => !t.deleted && (t.reflectionIds ?? []).includes(reflection.id),
  );
  for (const trail of containingTrails) {
    if (!nodeMap.has(trail.id)) {
      nodes.push(makeNode(trail.id, 'trail', trail.name, trail, cx, cy));
      nodeMap.set(trail.id, nodes[nodes.length - 1]);
    }
    addEdge(edges, trail.id, reflection.id, 'contains', '包含');
  }

  return reflectionNode;
}

// ── 图构建：trail 上下文 ──────────────────────────────────────────
function buildTrailGraph(
  input: GraphBuildInput,
  nodes: RelationNode[],
  nodeMap: Map<string, RelationNode>,
  edges: RelationEdge[],
): RelationNode | null {
  const trail = safe(input.thoughtTrails).find(t => !t.deleted && t.id === input.context.id);
  if (!trail) return null;

  const cx = VB_W / 2;
  const cy = VB_H / 2;
  const trailNode = makeNode(trail.id, 'trail', trail.name, trail, cx, cy);
  nodes.push(trailNode);
  nodeMap.set(trail.id, trailNode);

  for (const reflectionId of trail.reflectionIds ?? []) {
    const r = safe(input.reflections).find(ref => ref.id === reflectionId);
    if (r && !r.deleted && !nodeMap.has(r.id)) {
      nodes.push(makeNode(r.id, 'reflection', r.content, r, cx, cy));
      nodeMap.set(r.id, nodes[nodes.length - 1]);
      addEdge(edges, trail.id, r.id, 'contains', '包含');
    }
  }

  for (const itemId of trail.linkedPlanItemIds ?? []) {
    const planItem = safe(input.planItems).find(i => i.id === itemId);
    if (planItem && !planItem.deleted && !nodeMap.has(planItem.id)) {
      nodes.push(makeNode(planItem.id, 'planItem', planItem.name, planItem, cx, cy));
      nodeMap.set(planItem.id, nodes[nodes.length - 1]);
      addEdge(edges, trail.id, planItem.id, 'related', '相关');
      const plan = safe(input.plans).find(p => p.id === planItem.planId);
      if (plan && !plan.deleted && !nodeMap.has(plan.id)) {
        nodes.push(makeNode(plan.id, 'plan', plan.name, plan, cx, cy));
        nodeMap.set(plan.id, nodes[nodes.length - 1]);
        addEdge(edges, planItem.id, plan.id, 'linked', '关联');
      }
    }
  }

  const relatedTrailIds = new Set<string>();
  for (const t of safe(input.thoughtTrails)) {
    if (t.id === trail.id || t.deleted) continue;
    if ((t.reflectionIds ?? []).some(rid => (trail.reflectionIds ?? []).includes(rid))) {
      relatedTrailIds.add(t.id);
    }
  }
  for (const tid of relatedTrailIds) {
    const t = safe(input.thoughtTrails).find(tt => tt.id === tid);
    if (t && !t.deleted && !nodeMap.has(t.id)) {
      nodes.push(makeNode(t.id, 'trail', t.name, t, cx, cy));
      nodeMap.set(t.id, nodes[nodes.length - 1]);
      addEdge(edges, trail.id, t.id, 'related', '关联');
    }
  }

  return trailNode;
}

// ── 图构建：planItem 上下文 ───────────────────────────────────────
function buildPlanItemGraph(
  input: GraphBuildInput,
  nodes: RelationNode[],
  nodeMap: Map<string, RelationNode>,
  edges: RelationEdge[],
): RelationNode | null {
  const planItem = safe(input.planItems).find(i => i.id === input.context.id);
  if (!planItem || planItem.deleted) return null;

  const cx = VB_W / 2;
  const cy = VB_H / 2;
  const planItemNode = makeNode(planItem.id, 'planItem', planItem.name, planItem, cx, cy);
  nodes.push(planItemNode);
  nodeMap.set(planItem.id, planItemNode);

  const plan = safe(input.plans).find(p => p.id === planItem.planId);
  if (plan && !plan.deleted && !nodeMap.has(plan.id)) {
    nodes.push(makeNode(plan.id, 'plan', plan.name, plan, cx, cy));
    nodeMap.set(plan.id, nodes[nodes.length - 1]);
    addEdge(edges, planItem.id, plan.id, 'linked', '关联');
  }

  if (planItem.reflectionId) {
    const r = safe(input.reflections).find(ref => ref.id === planItem.reflectionId);
    if (r && !r.deleted && !nodeMap.has(r.id)) {
      nodes.push(makeNode(r.id, 'reflection', r.content, r, cx, cy));
      nodeMap.set(r.id, nodes[nodes.length - 1]);
      addEdge(edges, r.id, planItem.id, 'related', '相关');
    }
  }

  if (planItem.trailId) {
    const trail = safe(input.thoughtTrails).find(t => t.id === planItem.trailId);
    if (trail && !trail.deleted && !nodeMap.has(trail.id)) {
      nodes.push(makeNode(trail.id, 'trail', trail.name, trail, cx, cy));
      nodeMap.set(trail.id, nodes[nodes.length - 1]);
      addEdge(edges, trail.id, planItem.id, 'related', '相关');
      for (const reflectionId of (trail.reflectionIds ?? []).slice(0, 3)) {
        const r = safe(input.reflections).find(ref => ref.id === reflectionId);
        if (r && !r.deleted && !nodeMap.has(r.id)) {
          nodes.push(makeNode(r.id, 'reflection', r.content, r, cx, cy));
          nodeMap.set(r.id, nodes[nodes.length - 1]);
          addEdge(edges, trail.id, r.id, 'contains', '包含');
        }
      }
    }
  }

  if (planItem.linkConfig?.habitId) {
    const habit = safe(input.habits).find(h => h.id === planItem.linkConfig!.habitId);
    if (habit && !habit.deleted && !nodeMap.has(habit.id)) {
      nodes.push(makeNode(habit.id, 'habit', habit.name, habit, cx, cy));
      nodeMap.set(habit.id, nodes[nodes.length - 1]);
      addEdge(edges, habit.id, planItem.id, 'linked', '关联');
    }
  }

  return planItemNode;
}

/**
 * Limits the number of nodes to MAX_NODES, keeping the context node and nodes with the most edges.
 * **Mutates** the `nodes` and `edges` arrays in-place.
 */
function limitNodes(
  nodes: RelationNode[],
  edges: RelationEdge[],
  contextNode: RelationNode | null,
): void {
  if (nodes.length <= MAX_NODES) return;

  const edgeCounts = new Map<string, number>();
  for (const e of edges) {
    edgeCounts.set(e.from, (edgeCounts.get(e.from) ?? 0) + 1);
    edgeCounts.set(e.to, (edgeCounts.get(e.to) ?? 0) + 1);
  }

  const keepIds = new Set<string>();
  if (contextNode) keepIds.add(contextNode.id);

  const sorted = nodes
    .filter(n => !keepIds.has(n.id))
    .sort((a, b) => (edgeCounts.get(b.id) ?? 0) - (edgeCounts.get(a.id) ?? 0));

  sorted.slice(0, MAX_NODES - keepIds.size).forEach(n => keepIds.add(n.id));

  nodes.splice(0, nodes.length, ...nodes.filter(n => keepIds.has(n.id)));
  edges.splice(0, edges.length, ...edges.filter(e => keepIds.has(e.from) && keepIds.has(e.to)));
}

// ── 洞察生成 ───────────────────────────────────────────────────────
export function generateInsights(
  nodes: RelationNode[],
  edges: RelationEdge[],
  contextType?: string,
): string[] {
  const insights: string[] = [];

  const countByType = (type: NodeType): number =>
    nodes.filter(n => n.type === type).length;

  if (contextType === 'plan') {
    const rc = countByType('reflection');
    if (rc > 0) insights.push(`关联了 ${rc} 条感念`);
    const hc = countByType('habit');
    if (hc > 0) insights.push(`关联了 ${hc} 个习惯`);
  }
  if (contextType === 'habit') {
    const rc = countByType('reflection');
    if (rc > 0) insights.push(`有 ${rc} 条相关感念`);
    const pc = countByType('plan');
    if (pc > 0) insights.push(`关联了 ${pc} 个计划`);
  }
  if (contextType === 'reflection') {
    const lc = edges.filter(e => e.type === 'same_tag').length;
    if (lc > 0) insights.push(`有 ${lc} 条同标签感念`);
  }
  if (contextType === 'trail') {
    const rc = countByType('reflection');
    if (rc > 0) insights.push(`包含 ${rc} 条感念`);
    const pc = countByType('planItem');
    if (pc > 0) insights.push(`关联了 ${pc} 个计划任务`);
    const tc = countByType('trail');
    if (tc > 0) insights.push(`发现 ${tc} 条关联脉络`);
  }
  if (contextType === 'planItem') {
    const types = new Set(nodes.filter(n => n.type !== 'planItem').map(n => n.type));
    if (types.size > 0) insights.push(`关联了 ${types.size} 种实体类型`);
    const total = nodes.filter(n => n.type !== 'planItem').length;
    if (total > 0) insights.push(`共 ${total} 个关联节点`);
  }

  return insights.slice(0, 3);
}

// ── 主入口 ─────────────────────────────────────────────────────────
export function buildRelationGraph(input: GraphBuildInput): GraphBuildResult {
  const nodes: RelationNode[] = [];
  const edges: RelationEdge[] = [];
  const nodeMap = new Map<string, RelationNode>();
  let contextNode: RelationNode | null = null;

  switch (input.context.type) {
    case 'plan':
      contextNode = buildPlanGraph(input, nodes, nodeMap, edges);
      // Link plans to their visions
      linkPlansToVisions(input, nodes, nodeMap, edges);
      break;
    case 'habit':
      contextNode = buildHabitGraph(input, nodes, nodeMap, edges);
      // Link habits to their visions
      linkHabitsToVisions(input, nodes, nodeMap, edges);
      break;
    case 'reflection':
      contextNode = buildReflectionGraph(input, nodes, nodeMap, edges);
      break;
    case 'trail':
      contextNode = buildTrailGraph(input, nodes, nodeMap, edges);
      break;
    case 'planItem':
      contextNode = buildPlanItemGraph(input, nodes, nodeMap, edges);
      break;
    default: {
      // Exhaustive check — if a new context type is added to RelationContextType,
      // TypeScript will error here until a case is added above.
      const _exhaustive: never = input.context.type;
      throw new Error(`Unsupported context type: ${_exhaustive}`);
    }
  }

  limitNodes(nodes, edges, contextNode);
  const insights = generateInsights(nodes, edges, input.context.type);

  return { nodes, edges, insights, contextNode };
}

// ── 辅助：关联计划→愿景 ──────────────────────────────────
function linkPlansToVisions(
  input: GraphBuildInput,
  nodes: RelationNode[],
  nodeMap: Map<string, RelationNode>,
  edges: RelationEdge[],
) {
  for (const plan of safe(input.plans)) {
    if (!plan.deleted && (plan as any).visionId) {
      const visionId = (plan as any).visionId as string;
      const vision = safe(input.visions).find(v => v.id === visionId && !v.deleted);
      if (vision && !nodeMap.has(vision.id)) {
        const vNode = makeNode(vision.id, 'vision', vision.text, vision, VB_W / 2, VB_H / 2);
        nodes.push(vNode);
        nodeMap.set(vision.id, vNode);
        addEdge(edges, plan.id, vision.id, 'linked', '关联愿景');
      }
    }
  }
}

// ── 辅助：关联习惯→愿景 ──────────────────────────────────
function linkHabitsToVisions(
  input: GraphBuildInput,
  nodes: RelationNode[],
  nodeMap: Map<string, RelationNode>,
  edges: RelationEdge[],
) {
  for (const habit of safe(input.habits)) {
    if (!habit.deleted && (habit as any).visionId) {
      const visionId = (habit as any).visionId as string;
      const vision = safe(input.visions).find(v => v.id === visionId && !v.deleted);
      if (vision && !nodeMap.has(vision.id)) {
        const vNode = makeNode(vision.id, 'vision', vision.text, vision, VB_W / 2, VB_H / 2);
        nodes.push(vNode);
        nodeMap.set(vision.id, vNode);
        addEdge(edges, habit.id, vision.id, 'linked', '关联愿景');
      }
    }
  }
}
