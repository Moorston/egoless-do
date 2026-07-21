# 审查修行模块全部代码和功能逻辑

## Goal

全面审查修行（Practice）模块的所有代码文件，识别硬编码中文、逻辑 bug、类型安全、i18n 遗漏、代码质量问题，并修复高/中优先级问题。

## Scope

### 调身（Body）
- `BodyScreen.tsx` — 主页面状态机
- `BodyDashboard.tsx` — 仪表盘（Banner、周历、统计）
- `BodyFlow.tsx` — 四步流程
- `CheckinSuccessCard.tsx` — 完成卡片
- `hooks/useBodyFlowState.ts` — 流程状态
- `hooks/useTodayPlan.ts` — 今日计划
- `modals/` — 所有弹窗（QuickSwap, AdjustExercise, DayActionSheet, etc.）
- `components/` — DayPlanCard, ExerciseCard, UnifiedExercisePool, etc.
- `screens/` — BodyPlanEditor, PlanManagement, BodyCheckinHistory

### 调心（Mind）
- `MindScreen.tsx` — 调心主页面
- 恐惧日志、勇气日志、洞察
- `hooks/` — 相关 hooks

### 其他实践模块
- `PracticeScreen.tsx` — 修行主入口
- `PreceptScreen.tsx` — 持戒
- `GiveScreen.tsx` — 布施
- 相关历史页面

## Review Dimensions

1. **硬编码中文** — 所有应使用 `T('key')` 但直接用中文的地方
2. **逻辑 bug** — 边界情况、时序问题、状态不一致
3. **类型安全** — TypeScript 类型不匹配或遗漏
4. **i18n 遗漏** — 缺少翻译 key 或 fallback 不合理
5. **代码质量** — 重复代码、大文件拆分、魔术数字

## Out of Scope

- 已审查过的组合锻炼（Combo Workout）代码
- 非实践模块（Home, Fasting, Settings, etc.）
- 架构性重构

## Acceptance Criteria

- [ ] 修行模块全部文件审查完成
- [ ] 发现的问题按优先级分类
- [ ] 高/中优先级问题修复
- [ ] OCR 工具审查关键文件