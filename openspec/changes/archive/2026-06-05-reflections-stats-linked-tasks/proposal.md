## Why

感念统计页当前 Tab 顺序（趋势→热力图→心情→标签）不符合使用直觉，标签和心情作为内容维度应前置。同时缺少"关联任务"统计维度，用户无法了解感念与计划任务的关联情况。

## What Changes

- **Tab 重排序**：标签→心情→关联任务→趋势→热力图，默认激活"标签"
- **新增"关联任务"Tab**：展示关联任务统计，包括关联总数、关联率、按任务分组的感念列表
- **数据计算**：新增 `linkedTaskStats` 计算逻辑，从 `store.reflections` + `store.planItems` 派生

## Capabilities

### New Capabilities
- `reflection-linked-task-stats`: 感念统计页新增"关联任务"Tab，展示关联任务维度的统计数据

### Modified Capabilities

（无）

## Impact

- **平台**：仅 Mobile
- **文件**：
  - `apps/mobile/src/features/reflections/ReflectionStatsScreen.tsx` — Tab 顺序、默认 Tab、新增关联任务 Tab 渲染
- **非目标**：不改变 Web 端、不改变其他 Tab 内容、不新增 core 纯函数（数据量小，直接在组件内计算）
