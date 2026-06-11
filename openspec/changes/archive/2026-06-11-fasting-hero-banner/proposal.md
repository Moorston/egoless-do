## Why

禁食页布局分散——统计数据、禁食记录、全球脉动各自独立成卡，视觉层次不清晰。需要整合为 Hero Banner，与冥想页保持一致的布局风格。

## What Changes

- 新增 Hero Banner 渐变卡片，整合：统计数据 3 列、kcal 行、禁食记录入口、全球脉动入口
- 移除独立的"全球禁食"、"禁食记录"、"统计数据"卡片
- 渐变色 `['#17EAD9', '#6078EA']`（与禁食确认弹窗一致）

## Capabilities

### New Capabilities

### Modified Capabilities

## Impact

- 修改文件：`apps/mobile/src/features/fasting/FastingScreen.tsx`
