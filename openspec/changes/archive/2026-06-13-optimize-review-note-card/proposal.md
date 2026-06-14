## Why

复盘笔记卡片（ReviewNoteCard）当前样式较为简陋：信息层次不清晰、交互方式单一（常驻删除按钮）、无编辑功能、标签和心情展示不够突出。需要全面提升卡片的视觉层次和交互体验，并增加编辑修改功能。

## What Changes

- 引导问题作为卡片标题，日期+时间+来源作为副标题
- 左侧 3px 彩色边框区分类型：引导式→主色，自由反思→绿色
- 标签改为 pill 圆角背景样式
- 删除交互从常驻 X 按钮改为长按菜单
- 截断时显示「展开 ▾」提示，收起时显示「收起 ▴」
- 显示具体时间，同一天区分多条记录
- 新增编辑功能：长按菜单→编辑，原地展开内联编辑区（内容+标签+心情）
- 心情图标放大，放在标签行右侧
- 平台：仅 mobile

**非目标**：
- 不修改 WriteNoteModal（写复盘弹窗）
- 不修改 TrailNote 数据结构
- 不影响其他页面的笔记展示

## Capabilities

### New Capabilities

_无新增能力_

### Modified Capabilities

_无修改能力需求，仅为 UI 组件重构_

## Impact

- `apps/mobile/src/features/reflections/ReviewNoteCard.tsx` — 完全重写
- `apps/mobile/src/features/reflections/ThoughtTrailDetailScreen.tsx` — 可能需要传递 editTrailNote 回调
