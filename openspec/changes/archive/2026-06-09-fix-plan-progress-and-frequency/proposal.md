## Why

计划详情页面存在三个影响用户体验的问题：
1. 任务进度条计算不准确，所有任务显示 100%（实际应为 35%-75%）
2. 打卡频率选择器标题"每天"有歧义，用户误以为是"每天打卡"而非"频率设置"
3. 打卡频率的 interval 模式 input 框删除数字后自动填充 1，无法修改单个数字

## What Changes

- **任务进度计算**: 修复 `computeItemProgress` 函数，确保 `doneCount` 按唯一日期去重计算，避免重复打卡记录导致进度虚高
- **频率选择器标题**: 将 `freqDaily` 翻译从"每天"改为"打卡频率"，消除歧义
- **频率 input 框**: 修复 interval/weekly/monthly 模式下 input 框的交互，允许用户删除数字后输入新值

## Capabilities

### New Capabilities

（无新增能力）

### Modified Capabilities

- `plan-management`: 修复任务进度计算逻辑和频率配置 UI 交互

## Impact

- **平台**: 全部（web + mobile，因为核心逻辑在 packages/core）
- **文件**:
  - `packages/core/src/business/plan.ts` — `computeItemProgress` 函数
  - `packages/core/src/i18n/zh.ts` — `freqDaily` 翻译
  - `apps/web/src/components/PlanCreatePage.tsx` — 频率 input 框交互
- **非目标**:
  - 不修改计划级进度（ProgressRing），仅修复任务级进度
  - 不修改 `computeExpectedDays` 的计算逻辑
  - 不修改打卡频率的其他翻译（interval/weekly/monthly 模式的文案保持不变）
