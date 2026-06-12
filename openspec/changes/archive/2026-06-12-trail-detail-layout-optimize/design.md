## Context

思维脉络详情页 (`ThoughtTrailDetailScreen`) 刚完成功能扩展，新增了 AI 洞察、复盘引导、脉络感念、计划任务、相关脉络等模块。当前所有模块以卡片形式垂直堆叠，导致页面过长、核心内容被淹没。同时存在 `pullServerData` 未拉取 `trailNote` 的 bug。

## Goals / Non-Goals

**Goals:**
- 时间线（核心内容）置顶，用户进入页面立即可见
- 概览信息压缩为一行，不占用卡片空间
- 添加入口整合为浮动按钮，不打断阅读流
- AI 区域可折叠，空状态不占空间
- 底部区域紧凑化，提高可见性
- 修复 trailNote 数据同步 bug

**Non-Goals:**
- 不改变任何功能逻辑（AI 生成、CRUD 操作等）
- 不改变数据模型
- 不涉及 Web 端
- 不重新设计子组件的内部样式（只调整布局和容器）

## Decisions

### 1. 页面结构重组

**Before:**
```
Header → OverviewCard → InsightSection → ReviewGuideSection → AddBar → Timeline → PlanSection → RelatedSection
```

**After:**
```
Header → OverviewBar(一行) → Timeline(置顶) → [FAB] → CollapsibleAI → PlanSection(紧凑) → RelatedSection(紧凑)
```

**理由:** 时间线是用户最常访问的内容，应该第一眼看到。AI 区域是辅助功能，折叠后不影响核心体验。

### 2. 概览从卡片改为行内条

将 `TrailOverviewCard` 从独立的 `View` + `borderRadius` + `padding` 改为 header 下方的一行文字：
```
3 感念 + 2 反思 · 2026-01-01 ~ 2026-01-07 · 跨度 7 天 · 😊→😰
```

**理由:** 概览信息是参考性的，不需要突出展示。一行文字足够承载。

### 3. FAB 替代 AddReflectionBar

将三个按钮的 `AddReflectionBar` 改为右下角浮动按钮：
- 点击展开三个选项（写感念、选已有、写反思）
- 使用 `Animated` 或简单 state 控制展开/收起
- 展开时背景变暗，点击其他区域收起

**理由:** FAB 是移动端常见模式，不占用滚动空间，随时可访问。

### 4. AI 区域使用可折叠容器

`InsightSection` 和 `ReviewGuideSection` 各自支持折叠：
- 无内容时：显示"生成洞察"按钮，不展开
- 有内容时：默认收起，显示摘要预览（第一行），点击展开完整内容
- 使用 `useState` 控制展开状态，不需要动画库

**理由:** 减少页面高度，用户主动选择是否查看 AI 内容。

### 5. 底部区域紧凑化

`PlanTasksSection` 和 `RelatedTrailsSection`：
- 减少 padding 和 margin
- 标题和内容合并到更紧凑的布局
- 无内容时隐藏整个区域

**理由:** 底部区域是辅助信息，紧凑展示提高可见性。

## Risks / Trade-offs

- **FAB 可能遮挡时间线底部内容** → 使用 `contentContainerStyle` 增加底部 padding
- **折叠区域可能让用户找不到 AI 功能** → 收起时显示图标和摘要预览
- **概览压缩后信息密度降低** → 保留关键信息（数量、日期跨度、心情趋势）

## Migration Plan

纯 UI 变更，无需数据迁移。直接替换组件即可。
