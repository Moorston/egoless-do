## Why

应用中有两条独立的"从内容创建计划任务"路径：感念→计划 (ReflectionsScreen 内联弹窗) 和 脉络→计划 (CreatePlanFromTrailModal)。两者共享相同的表单字段（名称、描述、日期、优先级），但实现完全独立：感念弹窗是 164 行内联 JSX，脉络弹窗是独立组件。这也导致两条路径的 UX 不一致（感念有 targetMetric 但无 AI 建议，脉络有 AI 建议但无 targetMetric）、链接方式不一致（感念双向、脉络单向）。

## What Changes

1. **提取感念创建计划弹窗**：将 ReflectionsScreen.tsx 中 164 行内联弹窗提取为独立 `CreatePlanFromReflectionModal.tsx` 组件
2. **创建共享 `PlanItemForm`**：提取公共表单字段（名称、描述、日期、优先级）为可复用组件
3. **补齐功能差异**：脉络弹窗增加 targetMetric，感念弹窗增加标签/分类建议
4. **统一 store 层**：创建 `createPlanItem(source, form)` 统一 action，合并`createPlanItemFromReflection`和`createPlanItemFromTrail`的重复逻辑
5. **添加脉络→计划的逆向链接**：trail 增加 `linkedPlanItemIds` 字段，实现双向关联

## Capabilities

### New Capabilities
- `plan-item-form`: 共享计划任务表单（名称、描述、日期、优先级）
- `create-plan-ref-modal`: 感念创建计划弹窗组件（替代内联代码）
- `unified-plan-creation`: 统一 store action 和业务逻辑

### Modified Capabilities
（无需修改现有 spec — 本次不改变行为，只重构实现）

## Impact

- **apps/mobile**: ReflectionsScreen.tsx (−164 行)，新增 CreatePlanFromReflectionModal.tsx，修改 CreatePlanFromTrailModal.tsx
- **packages/core**: createPlanSlice.ts（新增统一 action），createThoughtTrailSlice.ts（修改 createPlanItemFromTrail + trail 类型添加 linkedPlanItemIds），business/plan.ts（新增统一业务函数）
- **types**: ThoughtTrail 类型增加可选 linkedPlanItemIds
