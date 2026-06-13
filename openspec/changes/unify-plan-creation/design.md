## Context

当前存在两条独立的"从内容创建计划任务"路径：

**感念→计划** (ReflectionsScreen.tsx:730-894):
- 164 行内联弹窗 JSX，非独立组件
- 7 个松散的状态变量
- 调用 `createPlanItemFromReflection(7 params)` → 双向链接到感念
- 有 targetMetric（必填），无 AI 建议
- 样式：底部弹出 (animationType="slide")

**脉络→计划** (CreatePlanFromTrailModal.tsx):
- 319 行独立组件
- 调用 `createPlanItemFromTrail(trailId, form)` → 仅设置 trailId，无逆向链接
- 有 AI 建议选择器，无 targetMetric
- 样式：居中弹出 (animationType="fade")

两条路径共享同一个 store 中的 `addPlanItem` + 关联到 activePlan。但 linking 方式不一致：感念是双向（planItem.reflectionId ↔ reflection.linkedPlanItemId），脉络是单向（仅 planItem.trailId，trail 自身无反向引用）。

## Goals / Non-Goals

**Goals:**
- 提取 ReflectionsScreen 中 164 行内联弹窗为独立组件
- 创建 `PlanItemForm` 共享表单字段组件
- 补齐功能差异：脉络弹窗增加 targetMetric，感念弹窗增加标签建议
- 统一 store 层：合并重复的 createPlanItemFromReflection / createPlanItemFromTrail
- 添加脉络→计划的逆向链接（trail.linkedPlanItemIds）
- 两条路径使用一致的视觉和行为

**Non-Goals:**
- 不改变数据持久化方式（仍使用 adapter.persistChange）
- 不改动商店的 PlanSlice 核心逻辑（addPlanItem、updatePlanItem 等不变）
- 不涉及 web 端（本次仅 mobile）
- 不改动已有 plan item 的数据结构（PlanItem 接口只读）

## Decisions

### D1. 组件分层：共享 Form + 专用 Modal

```
PlanItemForm (纯表单，无 Modal 壳)
├── NameField + DescriptionField
├── DateRangeSelector (StartDatePicker + EndDatePicker)
├── PrioritySelector
└── TargetMetricField (optional, conditional)

CreatePlanFromReflectionModal
├── PlanItemForm (复用)
├── Tags display (readonly)
└── TargetMetricField (必填)

CreatePlanFromTrailModal (已有，改造)
├── PlanItemForm (复用)
├── AISuggestionPicker (已有)
└── TargetMetricField (可选)
```

Rationale: Modal 壳的样式不同（底部 vs 居中），但内部表单字段一致。提取 PlanItemForm 覆盖 80% 的重复 JSX。

### D2. 统一 Store Action

```typescript
// 新统一 action，替换两个旧 action
createPlanItem(
  source: { type: 'reflection'; id: string } | { type: 'trail'; id: string },
  form: UnifiedPlanItemForm
): boolean

// UnifiedPlanItemForm
interface UnifiedPlanItemForm {
  name: string;
  description?: string;
  targetMetric?: string;    // reflection 必填，trail 可选
  startDate: string;
  endDate: string;
  priority: PlanItemPriority;
}
```

旧的 `createPlanItemFromReflection` 和 `createPlanItemFromTrail` 标记为 @deprecated，内部委托给新 action。

Rationale: 两个旧函数的 70% 逻辑相同（找 activePlan → addPlanItem → persist），只有 linking 部分不同。统一后减少重复，避免一条路径修了 bug 另一条漏掉。

### D3. 数据模型：trail 增加 linkedPlanItemIds

```typescript
// packages/core/src/types/thought-trail.ts
export interface ThoughtTrail extends Syncable {
  // ... 现有字段
  linkedPlanItemIds?: string[];  // 新增：关联的计划项 ID 列表
}
```

创建时主动 push ID，删除时主动 splice。与感念的 `linkedPlanItemId`（string | undefined）不同——trail 可能关联多个 plan items，所以用数组。

`getTrailPlanItems` 改为同时使用 `trailId` 和 `linkedPlanItemIds` 查询，兼容旧数据。

Rationale: 当前 `getTrailPlanItems` 通过 `trailId` 过滤全部 planItems，随着数据增长这可能变慢。direct link 提供 O(1) 查询且更明确。

### D4. 脉络弹窗嵌入 TargetMetric

```
┌─ 创建计划任务 ─────────────────────┐
│  [AI 建议选择] (如有 insightCache)   │
│  [任务名称]                         │
│  [任务指标] (新字段，可选)             │
│      placeholder: "例如：每周复盘3次" │
│  [任务描述]                         │
│  [开始日期] [结束日期]                │
│  [优先级: 高 中 低]                  │
│  [取消] [创建]                       │
└─────────────────────────────────────┘
```

为非必填，无输入时使用默认值（如 "关注 {trail.name} 的相关任务"）。

### D5. 感念弹窗使用 PlanItemForm + 底部样式

提取后用独立的 Modal 壳保持底部弹出样式，内容区域使用 PlanItemForm。标签以 readonly chips 显示在表单上方。

## Risks / Trade-offs

- **[风险] linkedPlanItemIds 数据不一致**：如果 plan item 被手动删除或通过其他方式删除，trail 的数组可能残留已删除项的 ID → 在 `getTrailPlanItems` 中过滤 deleted 项即可缓解；后续可加后台清理
- **[风险] 统一 action 增加入参复杂度**：discriminated union 类型确保编译期检查，但运行时需断言 → 使用 zod 或简单类型守卫
- **[风险] PlanItemForm 抽象过度**：如果两个 Modal 对同一个字段的需求不同（例如标签字数限制），Props 会膨胀 → 保持 form 组件 props 最小，差异化逻辑由 modal 层处理
- **[风险] 旧 store action 标记 deprecated 后仍有调用者遗漏**：在统一 action 合并后 grep 全仓库确认无残余引用
