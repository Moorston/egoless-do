# 调身页布局调整：移除快捷浏览 + 策略字体统一

## Goal
清理 BodyDashboard 布局，移除冗余的快捷操作入口，统一调身目标的策略值字体与目标体重/体脂率的字体大小。

## Background
- 快捷操作区（记录体重/锻炼记录/计划管理/目标设定）功能已可通过卡片直接访问，冗余
- 策略值（`getStrategyLabel`）当前使用 `FONT_BODY()`，而目标体重和体脂率使用 `FONT_STAT_CARD()`，风格不统一

## Confirmed Facts
- **R1 — 移除快捷操作**：`BodyDashboard.tsx:716-728`，`<View style={styles.quickActions}>` 区块
- **R2 — 策略字体统一**：`BodyDashboard.tsx:763`，策略值 `fontSize: FONT_BODY()` → `FONT_STAT_CARD()`

## Requirements
- **R1**: 移除 `BodyDashboard.tsx` 中快捷操作区块的 JSX
- **R2**: 将策略值 fontSize 从 `FONT_BODY()` 改为 `FONT_STAT_CARD()`，与 `targetWeight`/`targetBodyFat` 保持一致
- **R3**: 不破坏现有测试与 lint

## Acceptance Criteria
- [ ] A1: BodyDashboard 不渲染 4 个快速操作按钮
- [ ] A2: 策略值的字号与目标体重、目标体脂一致（`FONT_STAT_CARD`）
- [ ] A3: `pnpm run lint` 无新增 error
- [ ] A4: `pnpm run test` 全通过

## Out of Scope
- 其他区块的布局调整
- 目标卡片的交互逻辑