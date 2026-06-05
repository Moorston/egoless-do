## Context

当前首页 Banner 显示累计完成天数和连续打卡天数，但没有提供详细统计入口。项目中已有：
- CalendarGrid 组件（Web + Mobile）— 月视图日历，支持月份切换
- checkinHistory 数据 — 包含所有打卡记录
- i18n 翻译 — statsCheckinHeatmap, heatmapLess/More

## Goals / Non-Goals

**Goals:**
- 在 Banner 数字下方添加 BarChart3 icon 作为可点击提示
- 点击后弹出统计 Modal，复用 CalendarGrid 组件
- 显示 6 个统计指标：本月完成率、本月打卡天数、最长连续记录、累计完成天数、当前连续天数、平均每周打卡
- 支持月份切换（CalendarGrid 已内置）

**Non-Goals:**
- 不修改 CalendarGrid 组件本身
- 不增加新的图表类型
- 不改变 Banner 整体布局

## Decisions

**决策：使用 Modal 而非新页面**

理由：
- 用户体验更好，不需要离开首页
- 实现简单，复用现有 Modal 模式（项目中已有多个 Modal 实现）
- Web 和 Mobile 都支持 Modal

**决策：复用 CalendarGrid 组件**

理由：
- 组件已实现月份切换、日历布局、完成状态标记
- 减少重复代码
- 保持 UI 一致性

**决策：统计指标在组件内计算**

理由：
- 数据来源简单（checkinHistory 数组）
- 不需要新增 packages/core 函数
- 计算逻辑与 UI 紧密相关

## 统计指标计算逻辑

| 指标 | 计算方式 |
|------|----------|
| 本月完成率 | 本月打卡天数 / 本月已过天数 × 100% |
| 本月打卡天数 | checkinHistory 中当月 done=true 的记录数 |
| 最长连续记录 | 遍历 checkinHistory，计算最长连续 done=true 的天数 |
| 累计完成天数 | store.totalCompleted（已有） |
| 当前连续天数 | store.streak（已有） |
| 平均每周打卡 | totalCompleted / 总周数（从第一次打卡到现在的周数） |

## Risks / Trade-offs

**风险：CalendarGrid 的月份切换逻辑可能与 Modal 状态冲突**
→ 缓解：CalendarGrid 内部管理月份状态，Modal 只负责显示/隐藏

**权衡：统计指标在组件内计算，而非 packages/core**
→ 接受：计算逻辑简单，不需要跨平台复用
