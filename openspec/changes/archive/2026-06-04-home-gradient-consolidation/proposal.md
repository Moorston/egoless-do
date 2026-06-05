## Why

首页使用了 8 种渐变色，视觉嘈杂且缺乏统一性。部分渐变存在色相跳跃（如橙→红、紫→青），破坏了视觉层级。需要建立 3 级色彩体系，统一渐变风格。

## What Changes

- 新增 `THEME_GRADIENTS`：从 `theme.primary` 派生的主题主渐变色对
- 新增 `STATUS_GRADIENTS`：同色系深浅过渡的状态色渐变（SUCCESS/WARNING/ERROR）
- 新增 `deriveStatsGradients`：从主题渐变派生 Stats 卡片渐变的工具函数
- 废弃 `BANNER_COLORS`（由 `THEME_GRADIENTS` + `STATUS_GRADIENTS` 替代）
- 废弃 `STATS_GRADIENT`（由 `THEME_GRADIENTS` 派生替代）
- Web 端 HomeTab.tsx 替换所有渐变色引用
- Mobile 端 HomeScreen.tsx 替换所有渐变色引用
- Mobile 端 StatsScreen.tsx 替换 `STATS_GRADIENT` 引用

## Capabilities

### New Capabilities
- `theme-gradient-system`: 3 级渐变色彩体系，包含主题渐变、状态渐变、Stats 渐变派生

### Modified Capabilities
（无现有 spec 需要修改）

## Impact

- 平台：Web 端 + Mobile 端
- 文件：`packages/core/src/constants.ts`（新增常量、废弃旧常量）
- 文件：`apps/web/src/components/HomeTab.tsx`
- 文件：`apps/mobile/src/features/home/HomeScreen.tsx`
- 文件：`apps/mobile/src/features/stats/StatsScreen.tsx`
- 不涉及数据模型或 API 变更
- 废弃的常量保留导出（向后兼容），新代码统一使用新常量
