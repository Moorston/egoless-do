# AR-06-1: Reflections 模块复杂度降低 — 设计方案

> **状态**: 设计中  
> **目标**: 降低 RelationMapView (cognitive=199) 和 useQuickTrailSearch (cognitive=174) 的复杂度  
> **日期**: 2026-07-05  
> **预计工作量**: 2-3 天

---

## 一、现状分析

### 1.1 RelationMapView (799 行, cognitive=199)

| 职责 | 行范围 | 行数 | 复杂度来源 |
|------|--------|------|-----------|
| **图数据构建** | 143-391 | ~248 | 4 种 context 类型 × 多层嵌套查询 |
| **力导向布局** | 内含于 useMemo | ~80 | 迭代算法 |
| **SVG 渲染** | 430-600 | ~170 | 缩放、平移、节点/边渲染 |
| **触摸手势** | 517-605 | ~88 | 拖拽、捏合、长按 |
| **智能洞察** | 706-799 | ~93 | 图遍历分析 |

**核心问题**: 5 个不同职责耦合在一个组件中，图构建逻辑有 4 个 context 分支，每个分支都是 O(n²) 的嵌套查询。

### 1.2 useQuickTrailSearch (cognitive=174)

- 在 174 行代码内实现了：搜索、过滤、排序、标签聚合、AI 推荐
- 过多的条件分支导致 cognitive complexity 飙升

---

## 二、目标架构

### 2.1 拆分后的文件结构

```
packages/core/src/business/
  ├── reflectionGraph.ts          # 图构建纯函数 + 洞察生成
  └── reflectionGraph.test.ts     # 单元测试

apps/mobile/src/features/reflections/
  └── insights/
      ├── RelationMapView.tsx      # 瘦壳组件（~150 行）
      ├── hooks/
      │   ├── useRelationGraph.ts  # 图数据构建 hook（连接 store + 纯函数）
      │   ├── useForceSimulation.ts # 力导向布局 hook
      │   └── useGraphGesture.ts   # 手势处理 hook
      ├── components/
      │   ├── RelationGraphSvg.tsx  # SVG 渲染组件
      │   ├── NodeDetailPanel.tsx   # 节点详情面板（已有）
      │   ├── InsightsPanel.tsx     # 洞察面板（已有）
      │   └── StatsBar.tsx          # 统计栏（已有）
      └── types.ts                 # RelationNode, RelationEdge, EdgeStyle 等类型
```

### 2.2 职责划分

#### `core/business/reflectionGraph.ts` (纯函数, 平台无关)

```typescript
// 输入: 结构化的 store 数据
// 输出: 图数据 (nodes + edges + insights)

interface GraphBuildContext {
  type: 'plan' | 'habit' | 'reflection' | 'trail';
  id: string;
  plans: Plan[];
  planItems: PlanItem[];
  reflections: Reflection[];
  thoughtTrails: ThoughtTrail[];
  habits: Habit[];
  reflectionLinks: ReflectionLink[];
}

interface GraphResult {
  nodes: RelationNode[];
  edges: RelationEdge[];
  insights: string[];
  contextNode: RelationNode | null;
}

export function buildRelationGraph(ctx: GraphBuildContext): GraphResult;
export function generateInsights(nodes: RelationNode[], edges: RelationEdge[], contextType?: string): string[];
```

**优势**:
- 纯函数，可独立测试
- 4 个 context 分支变为 4 个独立的 builder 函数
- 无 React 依赖，可用于未来 web 重建

#### `hooks/useRelationGraph.ts`

```typescript
// 连接 store → 调用纯函数 → 返回图数据
export function useRelationGraph(context?: RelationContext): GraphResult;
```

职责：从 useAppStore 取数据，调用 `buildRelationGraph()`，返回结果。

#### `hooks/useForceSimulation.ts`

```typescript
// 管理力导向布局动画
export function useForceSimulation(nodes: RelationNode[], edges: RelationEdge[]): {
  nodes: RelationNode[];
  tick: () => void;
};
```

职责：物理模拟循环、节点位置更新、动画帧管理。

#### `hooks/useGraphGesture.ts`

```typescript
// 处理触摸手势
export function useGraphGesture(config: {
  nodes: RelationNode[];
  nodeMap: Map<string, RelationNode>;
  containerLayout: { w: number; h: number };
}): {
  handleTouchStart: (e: TouchEvent) => void;
  handleTouchMove: (e: TouchEvent) => void;
  handleTouchEnd: () => void;
  panOffset: { x: number; y: number };
  zoom: number;
};
```

职责：拖拽节点、缩放画布、平移视口。

#### `RelationGraphSvg.tsx`

```typescript
// 纯 SVG 渲染，不处理手势
export const RelationGraphSvg: FC<{
  nodes: RelationNode[];
  edges: RelationEdge[];
  zoom: number;
  panOffset: { x: number; y: number };
  selectedNodeId: string | null;
  onNodePress: (id: string) => void;
}>;
```

职责：根据图数据渲染 SVG 节点和边。

#### 瘦壳组件 `RelationMapView.tsx` (~150 行)

```typescript
export default function RelationMapView() {
  const TH = useTheme();
  const context = useRouteContext();
  
  // 1. 数据层
  const graph = useRelationGraph(context);
  
  // 2. 交互层
  const { nodes: simNodes } = useForceSimulation(graph.nodes, graph.edges);
  const gesture = useGraphGesture({ ... });
  
  // 3. 状态层
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const selectedNodeData = useMemo(() => ...);
  
  // 4. 渲染层
  return (
    <SafeAreaView>
      <StatsBar ... />
      <RelationGraphSvg
        nodes={simNodes}
        edges={graph.edges}
        zoom={gesture.zoom}
        panOffset={gesture.panOffset}
        selectedNodeId={selectedNode}
        onNodePress={setSelectedNode}
        onTouchStart={gesture.handleTouchStart}
        onTouchMove={gesture.handleTouchMove}
        onTouchEnd={gesture.handleTouchEnd}
      />
      {selectedNodeData && <NodeDetailPanel ... />}
      {graph.insights.length > 0 && <InsightsPanel ... />}
    </SafeAreaView>
  );
}
```

---

## 三、类型定义 (`insights/types.ts`)

```typescript
export type NodeType = 'reflection' | 'plan' | 'habit' | 'trail' | 'planItem';
export type RelationContext = 
  | { type: 'plan'; id: string }
  | { type: 'habit'; id: string }
  | { type: 'reflection'; id: string }
  | { type: 'trail'; id: string };

export interface RelationNode {
  id: string;
  type: NodeType;
  label: string;
  x: number; y: number;
  vx: number; vy: number;
  color: string;
  size: number;
  data: Record<string, unknown>;
}

export interface RelationEdge {
  from: string; to: string;
  type: string; label: string;
}

export type EdgeStyleType = 'related' | 'linked' | 'inspire' | 'evolve' | 'contrast' | 'respond' | 'same_tag' | 'contains' | 'belongs';
```

---

## 四、useQuickTrailSearch 重构策略

### 现状问题
- 174 行，cognitive=174
- 混合了：搜索逻辑、标签聚合、AI 推荐、过滤、排序

### 拆分方案

```
packages/core/src/business/
  └── trailSearch.ts          # 纯搜索 + 过滤函数

apps/mobile/src/features/reflections/hooks/
  └── useQuickTrailSearch.ts  # hook 层（连接 store + 调用纯函数）
```

**纯函数提取**:
```typescript
// core/business/trailSearch.ts
export function filterTrails(trails: ThoughtTrail[], query: string): ThoughtTrail[];
export function aggregateTags(trails: ThoughtTrail[]): TagAggregate[];
export function sortTrails(trails: ThoughtTrail[], sortBy: 'recent' | 'name' | 'count'): ThoughtTrail[];
```

---

## 五、实施步骤

### Phase 1: 类型提取 (30 分钟)
1. 创建 `insights/types.ts`
2. 更新现有组件的 import

### Phase 2: 纯函数提取 (1-2 小时)
1. 创建 `core/business/reflectionGraph.ts`
2. 将 `buildRelationGraph()` 和 `generateInsights()` 移到 core
3. 创建单元测试 `reflectionGraph.test.ts`

### Phase 3: Hook 拆分 (1-2 小时)
1. 创建 `useRelationGraph.ts`
2. 创建 `useForceSimulation.ts`
3. 创建 `useGraphGesture.ts`

### Phase 4: 组件拆分 (1 小时)
1. 创建 `RelationGraphSvg.tsx`
2. 重写 `RelationMapView.tsx` 为瘦壳组件

### Phase 5: useQuickTrailSearch 重构 (1 小时)
1. 提取 `trailSearch.ts` 到 core
2. 简化 hook

### Phase 6: 验证 (30 分钟)
1. 运行类型检查
2. 手动测试主路径
3. 运行单元测试

---

## 六、风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 力导向布局动画卡顿 | 用户体验 | 保留 requestAnimationFrame 循环 |
| 触摸手势丢失 | 功能回归 | 逐个迁移手势处理 |
| 图构建逻辑回归 | 数据错误 | 先写测试再迁移 |
| 4 种 context 类型遗漏 | 功能缺失 | 逐个 context 迁移并验证 |

---

## 七、预期收益

| 指标 | 当前 | 目标 |
|------|------|------|
| RelationMapView 行数 | 799 | ~200 |
| RelationMapView cognitive | 199 | <15 |
| useQuickTrailSearch cognitive | 174 | <15 |
| 核心图构建函数 | 0 个可测试函数 | 4+ 个纯函数 |
| 测试覆盖率 | 0% | ≥80% |
