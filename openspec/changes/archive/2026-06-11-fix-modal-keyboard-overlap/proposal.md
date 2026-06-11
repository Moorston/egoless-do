## Why

多个模态框中的输入框被输入法键盘遮挡，用户无法看到正在输入的内容。3 个模态框完全缺少 `KeyboardAvoidingView`，另有 3 个虽然有 KAV 但缺少 `keyboardVerticalOffset`，在 iOS 上偏移不准确。

## What Changes

- 为缺少键盘适配的模态框添加 `KeyboardAvoidingView`（创建计划任务、习惯状态变更原因、创建思维脉络）
- 为已有 KAV 的模态框补充 `keyboardVerticalOffset`（新建/编辑感念、添加/编辑习惯）
- 统一模态框键盘适配模式：`behavior`、`offset`、`ScrollView` 配置一致化

## Capabilities

### New Capabilities

_无新增能力_

### Modified Capabilities

_无需求变更_

## Impact

**影响平台**: Mobile only

**影响文件**:
- `apps/mobile/src/features/reflections/ReflectionsScreen.tsx` — 新建/编辑感念模态框 + 创建计划任务模态框
- `apps/mobile/src/features/habits/HabitsScreen.tsx` — 添加/编辑习惯模态框 + 状态变更原因模态框
- `apps/mobile/src/features/reflections/CreateThoughtTrailModal.tsx` — 创建思维脉络模态框

**非目标**:
- 不改动 web 端
- 不改动全屏页面（PlanCreateScreen）
- 不改动无输入框的模态框（TrailPickerModal、FilterDrawer 等）
