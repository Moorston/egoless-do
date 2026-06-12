## 1. 数据模型与类型定义

- [x] 1.1 创建 `packages/core/src/types/trail-note.ts`，定义 `TrailNote` 接口（id, trailId, content, tags, mood, source, guidedQuestion, order, createdAt, updatedAt, deleted）
- [x] 1.2 扩展 `packages/core/src/types/thought-trail.ts`，新增 `noteIds: string[]`、`insightCache?: TrailInsightCache`、`reviewCache?: TrailReviewCache`，定义 `TrailInsightCache` 和 `TrailReviewCache` 接口
- [x] 1.3 扩展 `packages/core/src/types/plan.ts`，在 `PlanItem` 中新增 `trailId?: string`
- [x] 1.4 更新 `packages/core/src/types/index.ts`，导出新类型

## 2. 同步与持久化

- [x] 2.1 在 `packages/core/src/sync/entities.ts` 中注册 `trailNote` entity（collection: `trail_notes`, ID field: `note_id`）
- [x] 2.2 在 `apps/mobile/src/db/schema.ts` 中新增 `trailNotes` 表（id, trail_id, content, tags, mood, source, guided_question, order, created_at, updated_at, deleted）。rollback: DROP TABLE trail_notes
- [x] 2.3 在 `apps/mobile/src/db/schema.ts` 中为 `thoughtTrails` 表新增 `noteIds`、`insightCache`、`reviewCache` 字段。rollback: ALTER TABLE 移除新增列
- [x] 2.4 在 `apps/mobile/src/db/schema.ts` 中为 `planItems` 表新增 `trailId` 字段。rollback: ALTER TABLE 移除 trail_id 列
- [x] 2.5 创建 `backend/pb_migrations/` 下的 PocketBase migration 脚本，新增 `trail_notes` collection 和相关字段

## 3. Store 层

- [x] 3.1 创建 `packages/core/src/store/createTrailNoteSlice.ts`，实现 `addTrailNote`、`updateTrailNote`、`deleteTrailNote`、`getNotesByTrail` 方法
- [x] 3.2 扩展 `packages/core/src/store/createThoughtTrailSlice.ts`，新增 `setInsightCache`、`setReviewCache` 方法
- [x] 3.3 在 `createThoughtTrailSlice` 中实现 `createPlanItemFromTrail` 方法，创建 PlanItem 并设置 `trailId`
- [x] 3.4 在 `createThoughtTrailSlice` 中实现 `getTrailPlanItems` 方法，按 `trailId` 查询关联任务
- [x] 3.5 扩展 `createThoughtTrail` 方法，初始化 `noteIds: []`
- [x] 3.6 扩展 `deleteThoughtTrail` 方法，级联删除关联的 TrailNote
- [x] 3.7 在 `packages/core/src/store/types.ts` 中扩展 `ThoughtTrailSlice` 接口定义
- [x] 3.8 在 `packages/core/src/store/index.ts` 中注册 TrailNoteSlice

## 4. 业务逻辑

- [x] 4.1 在 `packages/core/src/business/thought-trail.ts` 中新增 `getTrailOverview` 函数，计算感念+反思数量、跨度天数、心情趋势、标签聚合
- [x] 4.2 新增 `getRelatedTrails` 函数，基于标签 Jaccard 相似度计算相关脉络（相似度 = 重叠标签数 / 并集标签数，只考虑出现频率 ≥ 2 的标签）
- [x] 4.3 新增 `getTrailTimelineItems` 函数，将普通感念和脉络感念按 createdAt 混排，返回统一的时间线条目列表

## 5. AI 服务增强

- [x] 5.1 在 `packages/core/src/ai/ai-service.ts` 中增强 `generateTrailInsight` 方法，接收 `trailNotes` 参数，prompt 中纳入脉络感念内容
- [x] 5.2 新增 `generateTrailReviewGuide` 方法，基于脉络内容生成观察发现和引导问题，返回 `ReviewGuide`
- [x] 5.3 在 `packages/core/src/ai/types.ts` 中更新相关类型定义

## 6. i18n

- [x] 6.1 在 `packages/core/src/i18n/zh.ts` 中新增 AI 洞察、复盘引导、脉络感念、计划任务、概览、相关脉络相关的翻译 key（约 30 个）
- [x] 6.2 在 `packages/core/src/i18n/zh-Hant.ts` 中新增对应的繁体中文翻译
- [x] 6.3 在 `packages/core/src/i18n/en.ts` 中新增对应的英文翻译
- [x] 6.4 在 `packages/core/src/i18n/types.ts` 中新增对应的类型定义

## 7. UI 组件 — 脉络概览与 AI 分析

- [x] 7.1 创建 `apps/mobile/src/features/reflections/TrailOverviewCard.tsx`，展示感念+反思数量、跨度天数、心情趋势、标签聚合
- [x] 7.2 创建 `apps/mobile/src/features/reflections/InsightSection.tsx`，展示 AI 洞察（摘要、关键要点、转折点、建议），支持生成/重新生成，展示缓存时间
- [x] 7.3 创建 `apps/mobile/src/features/reflections/ReviewGuideSection.tsx`，展示复盘引导（观察发现、引导问题列表），支持生成/重新生成，提供"开始写反思"入口

## 8. UI 组件 — 时间线

- [x] 8.1 创建 `apps/mobile/src/features/reflections/TimelineList.tsx`，实现普通感念与脉络感念的混排时间线容器
- [x] 8.2 创建 `apps/mobile/src/features/reflections/TimelineReflectionItem.tsx`，普通感念卡片（实线圆点、渐变背景、📝 图标、点击展开/折叠、···菜单）
- [x] 8.3 创建 `apps/mobile/src/features/reflections/TimelineNoteItem.tsx`，脉络感念卡片（空心圆点、柔和背景、🤔 图标、引导问题展示、···菜单）
- [x] 8.4 实现时间间隔可视化：间隔 >3 天显示天数标签，>7 天加长竖线

## 9. UI 组件 — 添加感念与写反思

- [x] 9.1 创建 `apps/mobile/src/features/reflections/AddReflectionBar.tsx`，提供"写新感念"、"从已有选择"、"写反思"三个入口
- [x] 9.2 创建 `apps/mobile/src/features/reflections/WriteNoteModal.tsx`，写反思弹窗（引导问题展示区、内容输入、标签、心情、保存/取消）
- [x] 9.3 创建感念选择器弹窗（参考 CreateThoughtTrailModal 中的选择器模式），支持搜索、多选、全选

## 10. UI 组件 — 计划任务与相关脉络

- [x] 10.1 创建 `apps/mobile/src/features/reflections/PlanTasksSection.tsx`，展示关联计划任务列表
- [x] 10.2 创建 `apps/mobile/src/features/reflections/PlanTaskCard.tsx`，任务卡片（名称、优先级、进度条、打卡天数、日期范围、点击跳转）
- [x] 10.3 创建 `apps/mobile/src/features/reflections/CreatePlanFromTrailModal.tsx`，创建计划任务弹窗（AI 建议区、表单、创建/取消）
- [x] 10.4 创建 `apps/mobile/src/features/reflections/RelatedTrailsSection.tsx`，展示相关脉络（名称、感念数、标签重叠百分比、点击跳转）

## 11. 主页面组装

- [x] 11.1 重写 `apps/mobile/src/features/reflections/ThoughtTrailDetailScreen.tsx`，组装所有子组件（OverviewCard、InsightSection、ReviewGuideSection、TimelineList、AddReflectionBar、PlanTasksSection、RelatedTrailsSection）
- [x] 11.2 实现编辑弹窗（保留现有功能：编辑名称和描述）
- [x] 11.3 实现删除脉络逻辑（保留现有功能，增加级联删除 TrailNote）

## 12. 测试

- [x] 12.1 在 `packages/core/src/business/` 下为 `getTrailOverview`、`getRelatedTrails`、`getTrailTimelineItems` 编写单元测试
- [x] 12.2 为 TrailNote CRUD 的 store 方法编写单元测试
- [x] 12.3 为 `setInsightCache`、`setReviewCache`、`createPlanItemFromTrail` 编写单元测试
