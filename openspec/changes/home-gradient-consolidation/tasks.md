## 1. Constants 层

- [x] 1.1 新增 `THEME_GRADIENTS` 常量（packages/core/src/constants.ts）
- [x] 1.2 新增 `STATUS_GRADIENTS` 常量（packages/core/src/constants.ts）
- [x] 1.3 新增 `deriveStatsGradients` 工具函数（packages/core/src/constants.ts）
- [x] 1.4 废弃 `BANNER_COLORS` 和 `STATS_GRADIENT`（packages/core/src/constants.ts）
- [x] 1.5 导出新常量和工具函数（packages/core/src/index.ts）

## 2. Web 端

- [x] 2.1 HomeTab.tsx：Banner 渐变替换为 THEME_GRADIENTS + STATUS_GRADIENTS
- [x] 2.2 HomeTab.tsx：Grace 提醒渐变替换为 STATUS_GRADIENTS.WARNING
- [x] 2.3 HomeTab.tsx：Streak 卡片渐变替换为 THEME_GRADIENTS
- [x] 2.4 HomeTab.tsx：Stats 卡片渐变替换为 deriveStatsGradients
- [x] 2.5 HomeTab.tsx：进度条替换为 theme.primary 纯色

## 3. Mobile 端

- [x] 3.1 HomeScreen.tsx：Banner 渐变替换为 THEME_GRADIENTS + STATUS_GRADIENTS
- [x] 3.2 HomeScreen.tsx：Grace 提醒渐变替换为 STATUS_GRADIENTS.WARNING
- [x] 3.3 HomeScreen.tsx：Streak 卡片渐变替换为 THEME_GRADIENTS
- [x] 3.4 HomeScreen.tsx：Stats 卡片渐变替换为 deriveStatsGradients
- [x] 3.5 HomeScreen.tsx：进度条替换为 theme.primary 纯色
- [x] 3.6 StatsScreen.tsx：替换 STATS_GRADIENT 引用

## 4. 验证

- [x] 4.1 验证所有主题下渐变色正确显示
- [x] 4.2 验证废弃常量仍可访问（向后兼容）
