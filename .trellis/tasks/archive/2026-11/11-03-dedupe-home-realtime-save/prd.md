# 消除 HomeScreen 多余 setTimeout(0) real-time save 包装

> 关联 OpenSpec change: `openspec/changes/dedupe-home-realtime-save/`（proposal/design/specs/tasks 已就绪且 validate 通过）

## Goal

删除 `HomeScreen.tsx` real-time save 流水线里 5 处多余的 `setTimeout(() => saveField()/submit..., 0)` 包装，改为直接调用。行为不变——`buildNote` 已通过 `useAppStore.getState()` 读最新 store，ref 镜像读未变的 note/weight，同步调用产出相同 `submitCheckin` 参数。

## Background

explore 深挖 HomeScreen real-time save 流水线，确认四层「防陈旧闭包」补丁中 `setTimeout(0)` 是唯一静态冗余层（D1 论证）。这不是 bug 修复——验证推翻了 `saveWeight` 守卫洞假设（WeightCard 组件层 `isReadOnly` 隐藏 TextInput 已堵住），DateBar 注释准确。动机是 tech-debt + 可读性。

零测试覆盖（`toggleHabit/addWaterCb/handleFoodChanged/saveField` 无测试），命中高风险热点，必须先建表征测试基线再动代码（D2，参考 [[characterization-test-baseline-pattern]]）。

## Requirements

- **R1**：建表征测试基线 `HomeScreen.realtime-save.test.tsx`，mock `submitCheckin`，对 5 个 handler（toggleHabit/addWaterCb/togglePlanItem/toggleCustomTodo/handleFoodChanged）各锁定调用发生、note JSON 结构、调用次数
- **R2**：锁定 `isReadOnly` 早返回——过去日期/锁定态下 5 个 handler 不触发 `submitCheckin`
- **R3**：删 5 处 `setTimeout(() => ..., 0)` 包装，改直接调用（`:340/:423/:429/:347/:355`）
- **R4**：重构后表征测试 byte-identical 通过

## Acceptance Criteria

- [ ] AC1：`HomeScreen.tsx` 无 `setTimeout(() => saveField()` / `setTimeout(() => { ...submitCheckin...` 包装
- [ ] AC2：表征测试在重构前通过（基线快照），重构后仍通过（参数/次数不变）
- [ ] AC3：`pnpm run test` 全量通过
- [ ] AC4：`pnpm run lint` 0 error（改动文件 0 新增 warning）
- [ ] AC5：`pnpm run type-check`（core）0 错误
- [ ] AC6：`isReadOnly` 守卫不破——过去日期 handler 早返回测试通过

## Out of Scope

- `note/weight/localDone` 双源 local/store 架构（B/C 路径）
- ref 镜像 / `buildNote` getState() 模式（仍需要，不动）
- `habits` 幽灵选择器字段（另立探索）
- `rowMappers.ts:65` breath hack（独立候选）

## Resolved Decisions

- **轻量任务 PRD-only**：OpenSpec change 已有 design.md（D1-D5）+ tasks.md + spec.md，Trellis 不重复。inline 实施（不派子代理）。
- **单 commit**：`refactor(home): 删 real-time save 多余 setTimeout(0)，补表征测试`
- **动机诚实标 tech-debt**：非 bug 修复，探索已证伪所有「真实漏洞」假设
