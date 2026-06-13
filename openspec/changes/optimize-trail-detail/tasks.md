## 1. 修复 AI 崩溃 (优先级最高)

- [X] 1.1 将 `ThoughtTrailDetailScreen.tsx` 中 `AIService.getInstance()` 替换为 `getAIService()`，从 `@egoless-do/core` 导入
- [X] 1.2 为 `handleGenerateInsight` 和 `handleGenerateReview` 添加 AbortController，支持取消和页面离开清理

## 2. 代码重构 — 提取 hooks

- [X] 2.1 创建 `useTrailData.ts`：提取感念/笔记过滤、overview/timelineItems/relatedTrails/planItems 的 useMemo 逻辑
- [X] 2.2 创建 `useTrailAI.ts`：提取 AI 生成逻辑（含 AbortController、loading 状态、缓存过期检测）
- [X] 2.3 创建 `useTrailActions.ts`：提取编辑/删除/写笔记/创建计划/导航等回调
- [X] 2.4 移除 `AddReflectionFAB.tsx` 中未使用的 `Animated` 导入

## 3. 性能优化 — Store 订阅

- [X] 3.1 将 `const store = useAppStore()` 拆分为 7 个颗粒选择器：thoughtTrails、reflections、trailNotes、reflectionLinks、planItems、planItemCheckins、aiMode
- [X] 3.2 将 PlanTasksSection 的 `checkins.filter()` 提取为 `useTrailCheckins` memo
- [X] 3.3 安装 `@shopify/flash-list`，在 timeline items > 30 时启用虚拟化

## 4. 界面布局优化

- [X] 4.1 将 OverviewCard 整合到 Header 区域，使用紧凑的单行/双行布局展示概要信息
- [X] 4.2 将 InsightSection / ReviewGuideSection / PlanTasksSection / RelatedTrailsSection 替换为 Segment Tab 切换
- [ ] 4.3 实现 Tab 内容和滚动位置恢复（暂缓 — 单个 ScrollView 方式）

## 5. AI 洞察优化

- [X] 5.1 AI 生成完成后自动展开结果区域
- [X] 5.2 实现缓存过期检测：比较 cache.generatedAt 与脉络最后修改时间
- [X] 5.3 缓存过期时显示提示并提供重新生成入口

## 6. 复盘模式优化

- [X] 6.1 实现内联回答：点击复盘问题在下方展开 TextInput
- [X] 6.2 实现完成度追踪：已回答/总问题的进度条
- [ ] 6.3 支持多次复盘记录和对比展示（暂缓 — 涉及数据模型扩展）

## 7. 创建任务优化

- [X] 7.1 从洞察摘要自动预填计划名称和描述
- [ ] 7.2 TimelineList 中已关联任务的感念显示 📋 标记（暂缓 — 需要扩展数据模型）
- [X] 7.3 实现一键脉络转计划功能

## 8. 体验优化

- [X] 8.1 FAB 菜单弹簧动画（Animated.spring + 旋转）
- [X] 8.2 AI 加载骨架屏
- [X] 8.3 感念卡片滑动删除
- [X] 8.4 脉络标题行内编辑
- [X] 8.5 Timeline 下拉刷新重新生成 AI
- [X] 8.6 空态引导文案和创建按钮
