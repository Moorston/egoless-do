## Context

思维脉络详情页的复盘 tab（tabIndex === 1）当前渲染三个平铺组件：
1. `InsightSection` — AI 洞察折叠卡片
2. `ReviewGuideSection` — 复盘引导折叠卡片
3. `TimelineNoteItem` 列表 — 复盘笔记（时间线样式）

数据来源：
- `trail.insightCache?: TrailInsightCache` — 洞察缓存
- `trail.reviewCache?: TrailReviewCache` — 复盘引导缓存
- `timelineItems.filter(ti => ti.kind === 'note')` — 复盘笔记列表

## Goals / Non-Goals

**Goals:**
- 合并洞察和复盘引导为一个 AI 面板，内部分段切换
- 复盘笔记改为简洁卡片样式
- AI 面板默认展开，优先显示洞察
- 空状态优化

**Non-Goals:**
- 不修改 AI 生成逻辑和数据结构
- 不修改 WriteNoteModal
- 不影响感念脉络 tab

## Decisions

### 1. 新建 ReviewAIPanel 组件替代 InsightSection + ReviewGuideSection

**选择**: 新建 `ReviewAIPanel.tsx`，内部使用分段控制器切换「洞察 / 引导」

**理由**: InsightSection 和 ReviewGuideSection 各自独立维护 loading/expanded 状态，合并后可以共享一个容器，减少重复的 header、border、margin 样式。

**替代方案**: 在 ThoughtTrailDetailScreen 中用 state 控制切换，保留两个组件 — 缺点是样式不统一，且两个组件各自有折叠逻辑。

### 2. 分段控制器使用现有 SegmentBar

**选择**: 复用 `SegmentBar` 组件（已在感念脉络详情使用）

**理由**: 保持应用内一致性，无需新建 UI 组件。

### 3. 复盘笔记卡片样式

**选择**: 新建 `ReviewNoteCard.tsx` 替代 `TimelineNoteItem`，去掉时间线的点线连接，改为简洁卡片

**布局**:
```
┌──────────────────────────────┐
│ 💭 引导式 · 6月13日          │  ← 来源标签 + 日期
│ 你对这个习惯的看法有变化吗？ │  ← 引导问题（如有）
│ ...内容摘要...               │  ← 内容，截断 2 行
│ #反思 #习惯    😌            │  ← 标签 + 心情
└──────────────────────────────┘
```

**理由**: 时间线样式在感念脉络 tab 已使用，复盘 tab 用简洁卡片更合适，视觉层次更清晰。

### 4. AI 面板默认状态逻辑

- 两个 cache 都有 → 默认显示洞察子 tab
- 只有 reviewCache → 默认显示引导子 tab
- 都没有 → 默认显示洞察子 tab，显示并排生成按钮

### 5. 空状态设计

- **AI 面板无内容**: 显示两个并排按钮「生成洞察」「生成引导」
- **无复盘笔记**: 显示居中引导文案 + 写复盘按钮

## Risks / Trade-offs

- **[Risk] 合并后面板高度较大** → 使用 ScrollView，面板内容可滚动
- **[Risk] 引导问答的 inline 回答状态丢失** → 当前已是本地 state，合并后行为不变，后续可考虑持久化
