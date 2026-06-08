## Why

思维脉络页面（MindTrailTab/MindTrailScreen）和计划详情页面（PlanDetailContent）的 tab 切换器样式不一致。思维脉络页面使用透明背景+边框样式，计划详情页面使用实心背景+白字样式。统一样式可以提升用户体验的一致性。

## What Changes

- 将思维脉络页面的 tab 样式改为与计划详情页面一致
- 背景从 `${P}20` 改为实心 `P`（选中时）或 `TH.card`（未选中时）
- 移除边框
- 文字颜色从主题色改为白色（选中时）
- 字重从 600 改为 700（选中时）
- 圆角从 10px 改为 12px
- 字体大小从 FONT_SMALL 改为 FONT_BODY

## Capabilities

### New Capabilities

无

### Modified Capabilities

无（仅样式变更，不涉及需求变更）

## Impact

- **平台**: Mobile（React Native）
- **文件**:
  - `apps/mobile/src/features/reflections/MindTrailTab.tsx`
  - `apps/mobile/src/features/reflections/MindTrailScreen.tsx`
- **依赖**: 无新增依赖
- **API**: 无变更
