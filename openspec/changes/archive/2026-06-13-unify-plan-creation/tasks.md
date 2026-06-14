## 1. 数据模型 — ThoughtTrail 增加 linkedPlanItemIds

- [x] 1.1 ThoughtTrail 接口增加 `linkedPlanItemIds?: string[]` (`packages/core/src/types/thought-trail.ts`)
- [x] 1.2 `getTrailPlanItems` 改为同时查询 `trailId` 和 `linkedPlanItemIds`，去重后返回 (`packages/core/src/store/createThoughtTrailSlice.ts`)
- [x] 1.3 `deletePlanItem` 中清理 trail 的 `linkedPlanItemIds`（从 createPlanSlice.ts 调用 `updateThoughtTrail` 或直接操作）

## 2. 统一 Store Action — createPlanItem(source, form)

- [x] 2.1 业务函数：在 `packages/core/src/business/plan.ts` 新增 `createPlanItem(source, form)` 统一函数，返回 `Omit<PlanItem, 'id' | 'updatedAt' | 'deleted'>`
- [x] 2.2 Store action：在 `packages/core/src/store/createPlanSlice.ts` 新增 `createPlanItem(source, form)` action，处理感念双向链接和脉络双向链接
- [x] 2.3 旧 action `createPlanItemFromReflection` 标记 `@deprecated`，内部委托给新 action
- [x] 2.4 旧 action `createPlanItemFromTrail`（在 createThoughtTrailSlice.ts）标记 `@deprecated`，内部委托给新 action（跨 slice 调用 `get().createPlanItem(...)`）
- [x] 2.5 Types 新增 `UnifiedPlanItemForm` 接口 (`packages/core/src/types/plan.ts`)

## 3. PlanItemForm 共享表单组件

- [x] 3.1 创建 `apps/mobile/src/features/plans/PlanItemForm.tsx`：包含名称、描述、日期、优先级、目标指标（条件）字段
- [x] 3.2 验证逻辑：名称必填、目标指标条件必填、结束日期 ≥ 开始日期
- [x] 3.3 导出 `PlanItemFormValue` 类型和 `PlanItemForm` 组件

## 4. CreatePlanFromReflectionModal — 提取替代内联弹窗

- [x] 4.1 创建 `apps/mobile/src/features/reflections/CreatePlanFromReflectionModal.tsx`：底部弹出样式，使用 PlanItemForm
- [x] 4.2 预设感念上下文：自动填充任务名称（感念首行）、标签为只读 chip、targetMetric 必填
- [x] 4.3 集成 store 调用：通过 props 传递 `onCreate(reflectionId, form)` 或直接调用统一 action
- [x] 4.4 ReflectionsScreen.tsx 中移除内联弹窗及相关 10 个 state variables

## 5. 脉络弹窗增强 — CreatePlanFromTrailModal

- [x] 5.1 CreatePlanFromTrailModal 改用 PlanItemForm 替换内联表单字段
- [x] 5.2 增加 `targetMetric` 字段（可选），接入统一 action 的 form.targetMetric
- [x] 5.3 Props 调整：`onCreate` 改为 `onCreate(form: UnifiedPlanItemForm)` 或直接接收统一 action

## 6. 清理与验证

- [x] 6.1 确认 `createPlanItemFromReflection` 和旧 `createPlanItemFromTrail` 无额外调用者（grep 全仓库）
- [x] 6.2 执行 `npm run typecheck` 和 `npm run lint` 确保无误
- [ ] 6.3 手动测试：感念→创建计划、脉络→创建计划、删除计划项时关联清理
