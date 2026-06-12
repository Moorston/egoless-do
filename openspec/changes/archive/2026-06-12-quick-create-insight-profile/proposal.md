## Why

快速创建脉络页面（QuickCreateTrailScreen）当前要求用户输入关键词才能开始搜索匹配感念。但很多时候用户并不确定要追踪什么主题——他们需要先观察自己的感念数据，发现模式和趋势，再决定创建什么脉络。

现有的 `MindTrailScreen` 底部输入框也要求非空才能跳转到快速创建页面，增加了使用门槛。

需要一个"感念画像"面板，让用户在无输入时就能看到自己的高频标签、心情分布、AI 提取的主题词，点击即可筛选感念创建脉络。

## What Changes

### 新增能力

- **感念画像面板（InsightPanel）**: 在 QuickCreateTrailScreen 空输入时显示，包含：
  - 时间窗口切换器（7天/30天），独立缓存每个窗口的分析结果
  - 统计概览（感念总数、连续记录天数）
  - AI 一句话洞察摘要（异步加载，骨架屏 shimmer）
  - 高频标签（可点击筛选，显示次数和环比趋势）
  - 心情分布（可点击筛选，显示百分比和次数）
  - AI 提取的高频主题词（可点击筛选，最多 4 个分类，AI 自由发挥）
  - 快速入口（未归类/深夜/情绪变化，复用现有 preset）

- **AI 感念分析**: 新增 `generateInsightProfile` 函数，复用现有 `AIService.generateCloud`，从感念内容中提取高频主题词和一句话洞察。本地统计（标签频率、心情分布、连续天数）同步计算，AI 部分异步加载。

- **空输入跳转**: MindTrailScreen 底部输入框允许空输入直接跳转到 QuickCreateTrailScreen。

### 交互行为

- 空输入进入 → 显示 InsightPanel + 推荐脉络
- 点击标签/心情/主题词 → 自动填入搜索框，触发匹配，按时间倒序显示
- 清空搜索框 → 重新显示 InsightPanel（使用缓存，不重新调用 AI）
- 切换时间窗口 → 本地统计立即更新，AI 异步加载（骨架屏）
- AI 不可用 → 静默降级，隐藏 AI 洞察和主题词区块，标签/心情/快速入口正常显示

### 不做的事（非目标）

- 不改变现有搜索匹配逻辑（matchByKeyword 不变）
- 不改变推荐脉络算法（computeRecommendations 不变）
- 不引入中文分词库（依赖 AI 提取主题词）
- 不在 Web 端实现（仅移动端）

## Capabilities

### New Capabilities
- `insight-profile`: 感念画像面板，包括本地统计 + AI 洞察 + 主题词提取 + 可点击筛选

### Modified Capabilities
- `quick-create-trail`: QuickCreateTrailScreen 集成 InsightPanel，空输入时显示画像而非空白
- `mind-trail-screen`: 底部输入框允许空输入跳转

## Impact

### 平台影响
- **Mobile**: 主要变更平台，QuickCreateTrailScreen 改造，新增 InsightPanel 组件
- **Core**: packages/core 新增 insight-profile 类型和分析函数

### 关联文件

**新增：**
- `packages/core/src/ai/insight-profile.ts` — InsightProfile 类型 + computeLocalInsights + AI prompt
- `apps/mobile/src/features/reflections/InsightPanel.tsx` — 画像面板主组件
- `apps/mobile/src/features/reflections/InsightPanelSkeleton.tsx` — 骨架屏
- `apps/mobile/src/features/reflections/TopicChip.tsx` — 可点击主题词 chip
- `apps/mobile/src/features/reflections/MoodBar.tsx` — 心情分布条

**修改：**
- `apps/mobile/src/features/reflections/QuickCreateTrailScreen.tsx` — 集成 InsightPanel
- `apps/mobile/src/features/reflections/MindTrailScreen.tsx` — 允许空输入跳转
- `packages/core/src/i18n/zh.ts` — 新增 i18n key
- `packages/core/src/i18n/zh-Hant.ts` — 同步
- `packages/core/src/i18n/en.ts` — 同步
- `packages/core/src/i18n/types.ts` — 新增类型

**依赖：**
- 无新增外部依赖（复用现有 AIService）
