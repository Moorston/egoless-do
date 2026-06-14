## Why

思维脉络详情页的复盘 tab 当前存在三个平铺区块：AI 洞察（折叠卡片）、复盘引导（折叠卡片）、复盘笔记（时间线样式）。问题：
- 信息层级混乱 — AI 工具和用户内容平铺，用户真正关心的复盘笔记被挤到最下方
- 两个折叠卡片连续出现，视觉上重复且不知先看哪个
- 复盘笔记用时间线样式，与感念脉络 tab 的时间线视觉重复
- 没有生成过 AI 内容时，两个「生成」按钮并排，体验不佳

## What Changes

- 将 InsightSection 和 ReviewGuideSection 合并为一个「AI 分析」面板，内部分段切换「洞察 / 引导」
- 复盘笔记从时间线样式改为简洁卡片样式，去掉点线连接
- AI 面板默认展开，优先显示洞察（如有）
- 空状态优化：无 AI 内容时并排生成按钮，无笔记时显示引导文案
- 平台：仅 mobile

**非目标**：
- 不修改 AI 洞察和复盘引导的生成逻辑和数据结构
- 不修改写复盘弹窗（WriteNoteModal）
- 不影响感念脉络 tab 的时间线样式

## Capabilities

### New Capabilities

_无新增能力_

### Modified Capabilities

_无修改能力需求，仅为 UI 布局重构_

## Impact

- `apps/mobile/src/features/reflections/ThoughtTrailDetailScreen.tsx` — 复盘 tab 的渲染逻辑重组
- `apps/mobile/src/features/reflections/InsightSection.tsx` — 重构为面板模式，移除外层容器
- `apps/mobile/src/features/reflections/ReviewGuideSection.tsx` — 重构为面板模式，移除外层容器
- `apps/mobile/src/features/reflections/TimelineNoteItem.tsx` — 改为简洁卡片样式
- 可能新建 `ReviewAIPanel.tsx` 作为合并后的 AI 面板组件
