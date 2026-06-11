## 1. 数据模型

- [x] 1.1 在 `packages/core/src/types/plan.ts` 新增 `CheckinFrequency` 联合类型，`PlanItem` 增加 `frequency?: CheckinFrequency` 字段
- [x] 1.2 在 `packages/core/src/business/planForm.ts` 的 `ItemForm` 增加 `frequency` 字段，`createNewItem` 默认值为 undefined
- [x] 1.3 在 `apps/mobile/src/db/schema.ts` 的 `plan_items` 表增加 `frequency TEXT` 列（migration）
- [x] 1.4 在 `apps/mobile/src/store/entityTableMap.ts` 的 toRow/fromRow 映射 frequency 字段（JSON 序列化）

## 2. 核心计算逻辑

- [x] 2.1 在 `packages/core/src/business/plan.ts` 新增 `computeExpectedDays(frequency, startDate, endDate, today)` 纯函数，按六种模式计算期望天数
- [x] 2.2 修改 `computeItemProgress` 使用 `computeExpectedDays` 替代固定总天数作为分母
- [x] 2.3 修改 `refreshPlanItemStats` 适配频率模式的进度计算
- [x] 2.4 新增 `shouldShowToday(frequency, startDate, today, checkins)` 函数，按频率决定当天是否显示任务

## 3. 每日待办过滤

- [x] 3.1 修改 `getTodayItems` 增加 `checkins` 参数，调用 `shouldShowToday` 过滤
- [x] 3.2 修改 `packages/core/src/business/useDailyTodo.ts` 的 `createDailyTodoHook`，传入 checkins 给 `getTodayItems`
- [x] 3.3 修改 `packages/core/src/business/planTodo.ts` 的 `getTodoItemStatusMap` 适配频率感知

## 4. Store 层适配

- [x] 4.1 修改 `packages/core/src/store/createPlanSlice.ts` 的 `checkinPlanItem` / `uncheckinPlanItem`，打卡后触发频率状态重算
- [x] 4.2 修改 `checkAutoStatus` 中的延迟判定逻辑适配频率模式

## 5. 频率选择器 UI

- [x] 5.1 在 `packages/core/src/business/planForm.ts` 新增 `FREQUENCY_OPTIONS` 配置（模式列表 + i18n key）
- [x] 5.2 在 `packages/core/src/i18n/zh.ts`、`en.ts`、`zh-Hant.ts` 新增频率相关 i18n keys
- [x] 5.3 在 `apps/mobile/src/features/plan/PlanCreateScreen.tsx` 新增频率选择器组件（模式 chips + 条件配置区）
- [x] 5.4 在 `apps/web/src/components/PlanCreatePage.tsx` 新增频率选择器组件（web 版）

## 6. 频率摘要展示

- [x] 6.1 在 `apps/mobile/src/features/plan/PlanDetailContent.tsx` 任务卡片进度条下方新增频率摘要行
- [x] 6.2 在 `apps/web/src/components/PlanDetailContent.tsx` 任务卡片进度条下方新增频率摘要行
- [x] 6.3 实现 `FrequencySummary` 组件，按模式显示不同摘要文字

## 7. 任务级热力图

- [x] 7.1 从现有 `Heatmap` 组件提取 `HeatmapGrid` 基础组件（共享网格渲染逻辑）
- [x] 7.2 在 `apps/mobile/src/features/plan/components/` 新增 `ItemHeatmap` 组件（单任务打卡记录，绿/灰二值）
- [x] 7.3 在 `apps/web/src/components/` 新增 web 版 `ItemHeatmap` 组件
- [x] 7.4 在任务卡片中集成热力图展开/收起功能（`expandedHeatmaps` 状态管理）

## 8. 编辑规则

- [x] 8.1 修改 `packages/core/src/business/plan.ts` 的 `canEditPlan` 或新增 `canEditPlanItem` 函数，`in_progress` 任务不可编辑
- [x] 8.2 在 mobile/web 创建表单中，`in_progress` 任务的编辑按钮禁用并提示"进行中任务不可编辑，如需修改请删除重建"

## 9. 验证

- [x] 9.1 为 `computeExpectedDays` 编写单元测试（六种模式 + 边界场景）
- [x] 9.2 为 `shouldShowToday` 编写单元测试（六种模式 + 首周不完整场景）
- [x] 9.3 为 `computeItemProgress` 频率分支编写单元测试
- [x] 9.4 运行 `pnpm -C packages/core test` 确保全部通过
- [x] 9.5 运行 `pnpm -C packages/core exec tsc --noEmit` 确保无类型错误
