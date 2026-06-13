## Why

思维脉络详情页 (ThoughtTrailDetailScreen) 作为核心功能页面，存在多处需要优化的问题：AI 洞察功能因 `AIService.getInstance()` 方法不存在而崩溃、全量 store 订阅导致不必要的重渲染、代码重复、体验细节粗糙、缺乏取消机制等。本次变更一次性覆盖布局、AI、复盘、任务、体验、性能、代码 7 个维度的全面优化。

## What Changes

### 1. 界面布局优化
- 重构页面信息层级：Overview 与 Header 合并紧凑展示
- AI Insight / ReviewGuide / PlanTasks 使用 Segment 切换而非全部展开
- TimelineList 保持核心内容置顶，其他区域可折叠/切换

### 2. AI洞察优化
- **修复**: `AIService.getInstance()` 替换为 `getAIService()`（当前运行时崩溃）
- 新增 AbortController 支持，AI 生成可取消
- 提取公共 `useTrailAI` hook，消除 `handleGenerateInsight` 与 `handleGenerateReview` 的重复代码
- AI 生成完成后自动展开结果区域
- 缓存失效检测：感念/笔记新增后标记缓存过期

### 3. 复盘模式优化
- 复盘问题支持内联回答（不弹 Modal）
- 复盘完成度追踪：已回答/待回答问题进度条
- 支持多次复盘结果的对比展示

### 4. 创建任务优化
- 创建计划时自动从洞察摘要预填名称和描述
- TimelineList 中已关联任务的感念显示特殊标记
- 一键将整个脉络转化为计划

### 5. 体验优化
- FAB 菜单增加弹簧展开动画
- AI 加载状态替换为骨架屏
- Timeline 空态显示引导创建和推荐感念
- 感念删除支持滑动操作
- 脉络标题支持行内编辑
- 返回时自动取消进行中的 AI 请求
- 下拉刷新重新生成洞察/复盘
- 感念关联可视化（Timeline 连线）

### 6. 性能优化
- 全量 `useAppStore()` 替换为颗粒选择器
- PlanTasksSection 的 `checkins.filter()` 提取为 `useMemo`
- TimelineList 数据量大时使用 FlatList（当前 ScrollView 渲染全部）
- useMemo 依赖精确化

### 7. 代码优化
- `useTrailData` hook：聚合感念/笔记解析逻辑
- `useTrailAI` hook：聚合 AI 生成逻辑 + AbortController
- `useTrailActions` hook：聚合操作回调
- 移除 FAB 中未使用的 `Animated` 导入
- Cache 类型泛化

## Capabilities

### New Capabilities
- `trail-layout`: 脉络详情页布局重组与 Segment 切换
- `trail-ai-insight`: AI 洞察生成优化（取消、缓存失效、自动展开）
- `trail-review-mode`: 复盘内联回答与完成度追踪
- `trail-plan-creation`: 脉络创建计划优化
- `trail-ui-polish`: 体验细节（FAB 动效、骨架屏、滑动删除、行内编辑、下拉刷新）
- `trail-perf`: 性能优化（颗粒订阅、虚拟化、memo 优化）
- `trail-code-refactor`: 代码重构（hooks 提取、类型优化）

### Modified Capabilities
- (无现有 spec 修改)

## Impact

- `apps/mobile/src/features/reflections/ThoughtTrailDetailScreen.tsx` — 主页面，核心重构
- `apps/mobile/src/features/reflections/InsightSection.tsx` — AI 洞察组件
- `apps/mobile/src/features/reflections/ReviewGuideSection.tsx` — 复盘引导组件
- `apps/mobile/src/features/reflections/PlanTasksSection.tsx` — 计划任务组件
- `apps/mobile/src/features/reflections/RelatedTrailsSection.tsx` — 相关脉络组件
- `apps/mobile/src/features/reflections/AddReflectionFAB.tsx` — FAB 菜单
- `apps/mobile/src/features/reflections/TrailOverviewCard.tsx` — 概览卡片
- `apps/mobile/src/features/reflections/TimelineList.tsx` — 时间线列表
- `apps/mobile/src/features/reflections/TimelineReflectionItem.tsx` — 感念卡片
- `apps/mobile/src/features/reflections/TimelineNoteItem.tsx` — 笔记卡片
- `apps/mobile/src/features/reflections/WriteNoteModal.tsx` — 写笔记 Modal
- `packages/core/src/ai/ai-service.ts` — 导入方式修复
- 新文件: `apps/mobile/src/features/reflections/useTrailData.ts`
- 新文件: `apps/mobile/src/features/reflections/useTrailAI.ts`
- 新文件: `apps/mobile/src/features/reflections/useTrailActions.ts`
