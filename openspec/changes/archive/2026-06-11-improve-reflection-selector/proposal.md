## Why

CreateThoughtTrailModal 的选择感念弹窗存在严重 bug：选择器模式下没有高度，感念列表完全不显示，用户无法选择感念。同时缺少搜索、信息增强等基础功能。

## What Changes

- 修复选择器布局：解决 container maxHeight + selector flex 导致列表不显示的问题
- 添加搜索框：按内容关键词实时过滤感念
- 信息增强：item 显示 mood、tags、关联脉络数
- 脉络归属提示：已属于其他脉络的感念显示标记

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

（无 spec 级别变更，纯 UI 修复 + 功能增强）

## Impact

- `apps/mobile/src/features/reflections/CreateThoughtTrailModal.tsx` — 布局修复 + 功能增强
