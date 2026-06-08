## Context

运动模块经过 sport-active-layout-refactor 等多次迭代，积累了重复代码和不一致。本次清理旨在降低维护成本、补全国际化、统一架构模式。

## Goals / Non-Goals

**Goals:**
- 消除 8 处 formatPace 重复
- 合并 StrengthActive/IntervalActive
- 抽取 GPS 运动页为独立组件
- 补全 30+ 处硬编码中文
- 删除死代码

**Non-Goals:**
- 不引入 Context Provider（改动太大）
- 不重构 web 端架构
- 不新增功能

## Decisions

### 1. formatPace 放在 `packages/core/src/utils/pace.ts`

新建 `utils/pace.ts`，从 `index.ts` 导出。mobile 和 web 的 import 路径改为 `@egoless-do/core`。

### 2. StrengthActive/IntervalActive 合并策略

保留 `StrengthActive.tsx`，新增 `restMode: 'overlay' | 'inline'` prop。删除 `IntervalActive.tsx`。SportPage 路由时根据体验类型传入不同 restMode。

### 3. GPS 布局组件路径

`layouts/GpsActive.tsx`，复用现有 `ExerciseLayoutProps` 接口（需补充 GPS 相关字段）。

### 4. i18n key 命名规范

使用 `exercise` 前缀，如 `exerciseResting`, `exerciseSkipRest`, `exerciseTotalCalories` 等。在 `packages/core/src/i18n/zh.ts` 和 `en.ts` 中新增条目。

### 5. prop 组合对象

将 40+ 个离散 props 组合为 2-3 个对象：
- `timerState` — sec, countdown, holdAnim, scaleAnim, pulseAnim
- `exerciseData` — sets, distKm, calories, coords, segmentPaces
- 保留函数型 props 直接传递（handleGo, handlePause 等）

## Risks / Trade-offs

- **风险**: 合并 Strength/Interval 后逻辑复杂度增加 → 用 restMode prop 隔离，保持清晰
- **风险**: i18n 新增 key 需要同步 en/zh/zh-Hant 三种语言 → 按文件批量处理
