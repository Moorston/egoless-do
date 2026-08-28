# 拆分 PlanDetailContent — 技术设计

## 1. 当前结构

```
PlanDetailContent (CC 58, 1035 行)
├── imports: useDailyTodo(已有) + Heatmap/ItemHeatmap/LinkBadge/ProgressRing/StatusLabel(已有)
├── createDateChangeDetector (第 49-67 行) ← 不碰
├── useMemo: plan, items, checkins, itemProgressMap, planProgress (第 69-88 行)
├── tab state: 'detail' | 'todo' (第 90 行)
├── useDailyTodo 解构 (第 92-100 行) ← 不碰
├── 6 个 plan 操作处理器 + checkCanArchive
├── JSX return:
│   ├── Header
│   ├── Tab switcher
│   ├── detail tab (~400 行: hero card + goal + items.map + heatmap toggle) ← 内联
│   └── todo tab (~213 行: 待办列表) ← 提取为 TodoTabContent
└── PlanActionBar 内联 ← 提取
```

## 2. 目标结构

```
PlanDetailContent (编排层, CC ≤15)
├── createDateChangeDetector (不动)
├── useMemo 派生 (不动)
├── useDailyTodo (不动)
├── tab state (不动)
├── <TodoTabContent {...todoProps} />
├── detail tab JSX (保留内联, 但通过提取 todo tab + action bar 后复杂度自然下降)
└── <PlanActionBar {...actionProps} />
```

## 3. 提取边界

### TodoTabContent

```
Props 接口:
interface TodoTabContentProps {
  dailyTodo: ReturnType<typeof useDailyTodo>;  // 整体传入
  plan: Plan;
  items: PlanItem[];
  checkins: Checkin[];
}

职责: 纯渲染 todo tab 内容
复杂度预期: ≤15 (主要是条件渲染分支)
```

### PlanActionBar

```
Props 接口:
interface PlanActionBarProps {
  plan: Plan;
  onDelete: () => void;
  onComplete: () => void;
  onResume: () => void;
  onPause: () => void;
  onCancel: () => void;
  canArchive: boolean;
}

职责: 渲染操作按钮 + Alert 确认弹窗触发
复杂度预期: ≤15 (6 个操作的分支)
```

## 4. 消费方契约

`PlanDetailContent` 的导出签名、props 接口、调用方式不变。消费方（PlanScreen 等）零改动。

## 5. 风险评估

| 风险 | 等级 | 缓解 |
|------|------|------|
| 日期检测器被误改 | 低 | 不触碰清单已标记，diff 审查 |
| useDailyTodo 返回值类型不匹配 | 低 | TypeScript 编译时捕获 |
| Alert 回调上下文丢失 | 低 | 回调通过 props 传入，不依赖父组件闭包 |
