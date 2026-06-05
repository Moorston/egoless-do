## Why

感念筛选页当前有"已置顶"筛选项，但置顶感念在时间线中并无特殊展示（不排序到顶部），该筛选入口实用性低。同时缺少"关联任务"筛选，用户无法快速找到已关联计划任务的感念。

## What Changes

- **移除"已置顶"筛选**：从 `ReflectionFilters` 类型中移除 `isPinned` 字段，移除 `filterReflections()` 中的置顶过滤逻辑，移除 FilterDrawer 中的"已置顶"按钮，移除 `useReflections` 中的 `setIsPinned` action
- **置顶功能本身保留**：`MindReflection.isPinned` 字段、卡片 Pin 图标、详情页置顶按钮均保留不变
- **新增"关联任务"筛选**：在 `ReflectionFilters` 中新增 `hasLinkedTask?: boolean`，FilterDrawer 中替换"已置顶"位置为"关联任务"按钮
- **筛选逻辑**：`hasLinkedTask` 为 true 时，仅显示 `linkedPlanItemId` 存在且对应 planItem 未删除的感念
- **仅 Mobile 端**：Web 端暂不添加筛选入口

## Capabilities

### New Capabilities
- `reflection-linked-task-filter`: 感念列表支持按"关联任务"筛选，仅 Mobile 端 FilterDrawer 入口

### Modified Capabilities

（无已有 spec 需修改）

## Impact

- **平台**：仅 Mobile
- **文件**：
  - `packages/core/src/types/reflection.ts` — 移除 `isPinned`，新增 `hasLinkedTask`
  - `packages/core/src/business/reflections.ts` — `filterReflections()` 修改
  - `apps/mobile/src/features/reflections/FilterDrawer.tsx` — 按钮替换
  - `apps/mobile/src/features/reflections/useReflections.ts` — action 替换
  - `apps/mobile/src/features/reflections/ReflectionsScreen.tsx` — clearAll 逻辑
- **非目标**：不改变置顶功能本身、不改变 Web 端筛选 UI、不改变数据模型（isPinned 字段保留）
