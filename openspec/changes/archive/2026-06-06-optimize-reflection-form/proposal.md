## Why

新建/编辑感念页面存在布局问题和代码重复：
1. 标签管理按钮位置异常 - 被挤到下一行而非紧跟标签尾部
2. 新建和编辑 modal 存在大量重复代码（~80行），维护困难
3. 心情管理按钮与标签管理按钮视觉一致性问题（由布局问题导致）

## What Changes

- 修复 PillSelector 组件布局，使管理按钮能紧跟标签/心情尾部
- 抽取 ReflectionForm 共享组件，消除新建/编辑 modal 的代码重复
- 验证并确保标签和心情管理按钮样式完全一致

**非目标**:
- 不修改 Web 端（仅 Mobile）
- 不改变现有功能逻辑
- 不修改颜色选择器、字数限制等现有行为

## Capabilities

### New Capabilities

无

### Modified Capabilities

无（仅实现/布局优化，不涉及需求变更）

## Impact

- **平台**: Mobile（React Native）
- **文件**:
  - `apps/mobile/src/components/UI.tsx` - 修改 PillSelector 组件
  - `apps/mobile/src/features/reflections/ReflectionForm.tsx` - 新建共享组件
  - `apps/mobile/src/features/reflections/ReflectionsScreen.tsx` - 使用新组件
- **依赖**: 无新增依赖
- **API**: 无变更
