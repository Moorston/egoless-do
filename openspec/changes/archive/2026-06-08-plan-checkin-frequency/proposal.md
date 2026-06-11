## Why

当前计划任务的打卡模式固定为"每天打卡"，无法满足多样化的修行场景。例如：运动一周三次、冥想隔天一次、诵经每月初一十五。用户需要灵活的打卡频率设置，让计划任务更贴合实际修行节奏。

## What Changes

- 新增 `CheckinFrequency` 类型，支持六种打卡频率模式：每天、每 N 天、每周 N 次、每周固定星期几、每月 N 次、每月固定日期
- `PlanItem` 新增 `frequency` 字段，存储打卡频率配置
- 进度计算逻辑适配不同频率模式，分母不再固定为总天数
- 每日待办列表（`getTodayItems`）根据频率过滤，只显示当天需要打卡的任务
- 任务卡片进度条下方新增频率摘要显示
- 任务卡片新增可展开的任务级热力图（单个任务的打卡记录可视化）
- 创建/编辑任务表单新增频率选择器
- 编辑规则：仅 `not_started` 状态的任务可修改频率，`in_progress` 任务只能删除重建
- 热力图适配：固定模式显示"需要打/不需要打/已打/未打"，弹性模式只显示"已打/未打"
- 影响平台：mobile + web

### 非目标

- 不支持自定义 cron 表达式或复杂排程
- 不支持"补打卡"功能，错过即为未打卡
- 不支持按小时或按时间段打卡
- 不修改计划级别的频率（频率是 per-item 的）

## Capabilities

### New Capabilities
- `checkin-frequency`: 打卡频率数据模型、六种模式定义、进度计算、每日待办过滤、频率选择器 UI、频率摘要展示、任务级热力图

### Modified Capabilities
- `sport-active-page`: 运动页面的任务展示需适配频率过滤逻辑（运动任务可能设置为每周 N 次）

## Impact

- `packages/core/src/types/plan.ts` — 新增 `CheckinFrequency` 类型，`PlanItem` 增加 `frequency` 字段
- `packages/core/src/business/plan.ts` — `computeItemProgress`、`getTodayItems`、`refreshPlanItemStats`、`checkAutoStatus` 适配频率逻辑
- `packages/core/src/business/planForm.ts` — `ItemForm` 增加 `frequency` 字段，`createNewItem` 默认值
- `packages/core/src/business/planTodo.ts` — `getTodoItemStatusMap` 频率感知
- `packages/core/src/business/useDailyTodo.ts` — 传入 checkins 给 `getTodayItems`
- `apps/mobile/src/features/plan/PlanCreateScreen.tsx` — 新增频率选择器组件
- `apps/mobile/src/features/plan/PlanDetailContent.tsx` — 任务卡片增加频率摘要和热力图
- `apps/mobile/src/features/plan/components/` — 新增 `ItemHeatmap` 组件
- `apps/web/src/components/PlanCreatePage.tsx` — 新增频率选择器
- `apps/web/src/components/PlanDetailContent.tsx` — 任务卡片增加频率摘要和热力图
- `apps/mobile/src/db/schema.ts` — `plan_items` 表增加 `frequency` 列
- `apps/mobile/src/store/entityTableMap.ts` — toRow/fromRow 映射
