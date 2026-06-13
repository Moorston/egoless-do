## 1. Core 层 — 类型扩展与混合推荐引擎

- [x] 1.1 扩展 `TrailRecommendation` 接口 — `packages/core/src/types/thought-trail.ts`
  - 添加 `reason?: string` 字段
  - 添加 `source: 'local' | 'ai' | 'hybrid'` 字段

- [x] 1.2 优化 `recommendTrailsViaAI()` 返回 reason — `packages/core/src/ai/trail-recommender.ts`
  - 修改 AI prompt 要求返回 description 作为推荐理由
  - 确保 `AIRecommendation.description` 映射到 `TrailRecommendation.reason`

- [x] 1.3 新增 `generateRecommendationReason()` — `packages/core/src/business/trail-creation.ts`
  - 为 mood 类型生成模板理由
  - 为 tag 类型生成模板理由
  - 为 time 类型生成模板理由

- [x] 1.4 新增 `mergeAndRank()` — `packages/core/src/business/trail-creation.ts`
  - 合并本地推荐和 AI 推荐
  - 基于 `reflectionIds` 重叠度去重（阈值 50%）
  - 按 score 排序

- [x] 1.5 新增 `computeHybridRecommendations()` — `packages/core/src/business/trail-creation.ts`
  - 调用 `computeRecommendations()` 获取本地推荐
  - 调用 `recommendTrailsViaAI()` 获取 AI 推荐（如果可用）
  - 调用 `mergeAndRank()` 合并结果
  - 为本地推荐调用 `generateRecommendationReason()` 填充 reason

## 2. Core 层 — 用户偏好与导出

- [x] 2.1 新增用户偏好工具函数 — `packages/core/src/business/trail-creation.ts`
  - `buildIgnoredPattern(rec)` — 构建忽略模式字符串
  - `applyUserPreferences(recs, ignored)` — 应用偏好降权（score * 0.5）

- [x] 2.2 更新 Core 导出 — `packages/core/src/index.ts`
  - 导出 `computeHybridRecommendations`
  - 导出 `generateRecommendationReason`
  - 导出 `buildIgnoredPattern`、`applyUserPreferences`

## 3. Store 层 — 用户偏好持久化

- [x] 3.1 扩展 Zustand store — `apps/mobile/src/store/useAppStore.ts`
  - 添加 `ignoredRecPatterns: string[]` 状态
  - 添加 `addIgnoredRecPattern(pattern: string)` action
  - 添加 `clearIgnoredRecPatterns()` action

## 4. Mobile 层 — 推荐卡片增强

- [x] 4.1 增强 RecommendCard 组件 — `apps/mobile/src/features/reflections/RecommendCard.tsx`
  - 添加 `isExpanded`、`onToggleExpand`、`onNotInterested` props
  - 实现整卡点击展开/收起
  - 展开后显示推荐理由区域（带 🤖 图标）
  - 展开后显示"快速创建"和"不感兴趣"按钮
  - 按钮点击使用 `stopPropagation` 阻止冒泡

## 5. Mobile 层 — MindTrailScreen 改造

- [x] 5.1 整合混合推荐引擎 — `apps/mobile/src/features/reflections/MindTrailScreen.tsx`
  - 使用 `computeHybridRecommendations()` 替代 `computeRecommendations()`
  - 管理推荐加载状态（`isLoadingRecs`）
  - 本地推荐立即显示，AI 推荐后台合并

- [x] 5.2 实现"换一批"功能 — `apps/mobile/src/features/reflections/MindTrailScreen.tsx`
  - 添加刷新按钮（在推荐区域底部）
  - 点击时重新调用混合推荐引擎
  - 保留用户偏好（忽略的推荐仍然降权）

- [x] 5.3 实现用户偏好反馈 — `apps/mobile/src/features/reflections/MindTrailScreen.tsx`
  - 处理"不感兴趣"按钮点击
  - 调用 `addIgnoredRecPattern()` 记录偏好
  - 从当前推荐列表中移除该卡片

- [x] 5.4 整合智能查询入口 — `apps/mobile/src/features/reflections/MindTrailScreen.tsx`
  - 添加查询输入框（在推荐区域上方）
  - 短关键词（≤6 字符）触发本地匹配
  - 长文本（>6 字符）触发 `parseSmartQuery()`
  - 复用 `SmartQueryBubble` 组件处理追问
  - 查询结果展示 + 快速创建按钮

## 6. 验证与测试

- [x] 6.1 验证混合推荐 — 打开思维脉络页面，确认本地推荐立即显示
- [x] 6.2 验证 AI 推荐合并 — 配置云端 AI 后，确认 AI 推荐正确合并
- [x] 6.3 验证卡片交互 — 点击卡片展开/收起，确认理由和按钮正确显示
- [x] 6.4 验证"换一批" — 点击刷新按钮，确认推荐更新
- [x] 6.5 验证"不感兴趣" — 点击按钮，确认偏好记录和卡片移除
- [x] 6.6 验证智能查询 — 输入自然语言，确认追问和结果展示
