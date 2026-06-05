## Why

用户希望查看详细的打卡统计数据，但当前首页 Banner 只显示累计完成天数和连续打卡天数两个数字，没有提供更深入的统计分析。用户需要一个入口查看月度打卡日历、完成率、最长连续记录等详细指标，以便更好地了解自己的打卡习惯和进度。

## What Changes

- 在首页 Banner 的累计完成天数和连续打卡天数下方添加 BarChart3 icon（12px，半透明白色）作为可点击提示
- 点击数字区域弹出打卡统计 Modal 页面
- Modal 内容包括：
  - 月份切换器（◀ 2026年6月 ▶）
  - 月视图日历（复用 CalendarGrid 组件，已完成日期用主题色标记）
  - 统计指标卡片：本月完成率、本月打卡天数、最长连续记录、累计完成天数、当前连续天数、平均每周打卡

**非目标：**
- 不改变 Banner 的整体布局和样式
- 不修改 CalendarGrid 组件本身的逻辑
- 不增加新的图表类型（如柱状图、折线图）

## Capabilities

### New Capabilities

- `checkin-stats-modal`: 首页 Banner 点击弹出打卡统计 Modal，包含月视图日历和统计指标

### Modified Capabilities

（无）

## Impact

**影响平台：** Web + Mobile（全部）

**影响文件：**
- `apps/web/src/components/HomeTab.tsx` — 添加点击事件和 icon
- `apps/mobile/src/features/home/HomeScreen.tsx` — 添加点击事件和 icon
- 新增 `apps/web/src/components/CheckinStatsModal.tsx` — Web 端统计 Modal
- 新增 `apps/mobile/src/features/home/CheckinStatsModal.tsx` — Mobile 端统计 Modal

**可复用组件：**
- CalendarGrid（Web + Mobile）— 月视图日历
- i18n 已有翻译：statsCheckinHeatmap, heatmapLess/More

**交互描述：**
- 用户点击 Banner 数字区域 → 弹出统计 Modal
- Modal 默认显示当月日历和统计数据
- 用户点击左右箭头切换月份，日历和统计数据同步更新
- 点击返回/关闭按钮关闭 Modal
