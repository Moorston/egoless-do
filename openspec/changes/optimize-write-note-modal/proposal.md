## Why

复盘弹窗（WriteNoteModal）当前存在多个体验问题：内容输入区高度不足、心情选择无文字说明、标签输入繁琐、无字数统计、AI 生成的复盘思路无法在写作时参考、引导问题展示不够突出、误关弹窗会丢失内容。需要全面提升复盘写作体验。

## What Changes

- 内容输入区 minHeight 从 120px 增加到 200px
- 右下角实时显示字数统计
- 标签输入合并为单输入框，回车/确认键添加
- 心情选择改为 emoji + 文字标签（😊 开心、🌿 平静 等）
- 新增复盘思路展示区：传入 AI 生成的 perspectives，可折叠显示
- 引导问题展示区改为独立高亮区块，大字加粗
- 关闭弹窗时如有内容，弹出确认是否放弃
- 平台：仅 mobile

**非目标**：
- 不修改 TrailNote 数据结构
- 不修改 onSave 回调的参数格式
- 不影响其他弹窗组件

## Capabilities

### New Capabilities

_无新增能力_

### Modified Capabilities

_无修改能力需求，仅为 UI 组件优化_

## Impact

- `apps/mobile/src/features/reflections/WriteNoteModal.tsx` — 重构
- `apps/mobile/src/features/reflections/ThoughtTrailDetailScreen.tsx` — 传入 reviewPerspectives
