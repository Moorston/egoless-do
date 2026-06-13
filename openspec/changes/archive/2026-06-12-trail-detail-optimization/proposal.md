## Why

思维脉络详情页当前只是感念的线性展示容器，用户点击进入后只能浏览已关联的感念、编辑名称描述、或移除感念。但用户使用思维脉络的真正目的是**捋清想法、复盘心路历程**——这需要分析、反思、行动的完整工作流，而非单纯的记录展示。

当前页面缺乏：
- AI 辅助分析能力（已有 `AIService.generateTrailInsight` 但未在详情页集成）
- 反思写作能力（无法在脉络上下文中写反思）
- 行动转化能力（无法从脉络创建计划任务）
- 时间感知（相邻感念间隔 1 天和 3 个月视觉上无区别）

## What Changes

### 新增能力
- **TrailNote（脉络感念）**: 独立于普通 MindReflection 的新实体，只在脉络内存在。区分"AI 引导式"和"自由写作"两种来源，引导式记录引导问题上下文。
- **AI 洞察生成与缓存**: 在详情页集成 `AIService.generateTrailInsight`，生成摘要/关键要点/转折点/建议，结果持久化到 ThoughtTrail 上，覆盖式更新，手动触发。
- **复盘引导生成与缓存**: 新增 `AIService.generateTrailReviewGuide`，生成观察发现和引导问题，引导用户写反思。
- **从脉络创建计划任务**: PlanItem 新增 `trailId` 字段，支持从脉络维度创建和查询关联计划任务。
- **相关脉络推荐**: 基于标签重叠度计算脉络间相似度。

### 交互升级
- **脉络概览增强**: 显示感念+反思数量、跨度天数、心情趋势、标签聚合。
- **时间线混排**: 普通感念与脉络感念在同一时间线中展示，视觉区分（实线/虚线、渐变/柔和背景、不同图标）。
- **感念卡片展开**: 点击展开全文（inline），长按弹出操作菜单。
- **添加感念/反思**: 支持写新感念、从已有选择、写反思（引导式/自由式）三种入口。
- **关联计划任务展示**: 详情页内展示脉络关联的计划任务及打卡进度，可跳转详情。

### 不做的事（非目标）
- 不改变现有 MindReflection 的结构和行为
- 不在主感念列表中展示脉络感念
- 不实现脉络间的自动关联（仅推荐）
- 不实现 AI 自动生成脉络感念（只引导用户写）

## Capabilities

### New Capabilities
- `trail-note`: 脉络感念（TrailNote）数据模型、CRUD、同步、DB schema
- `trail-ai-insight`: 思维脉络 AI 洞察生成、缓存持久化、UI 展示
- `trail-review-guide`: 思维脉络复盘引导生成、引导式反思写作流程
- `trail-plan-integration`: 从脉络创建计划任务、关联任务展示与进度查看
- `trail-timeline-mixed`: 时间线混排展示普通感念与脉络感念，时间间隔可视化
- `trail-related`: 相关脉络推荐算法

### Modified Capabilities
- `plan`: PlanItem 新增 `trailId` 字段，支持按脉络查询关联任务

## Impact

### 平台影响
- **Mobile**: 主要变更平台，ThoughtTrailDetailScreen 重写
- **Core**: packages/core 新增类型、Store slice、业务逻辑、AI 增强
- **Backend**: PocketBase 新增 trail_notes collection，migration 脚本
- **Web**: 暂不影响（后续可同步）

### 关联文件
- `apps/mobile/src/features/reflections/ThoughtTrailDetailScreen.tsx` — 主要重写
- `packages/core/src/types/thought-trail.ts` — 类型扩展
- `packages/core/src/types/plan.ts` — PlanItem 扩展
- `packages/core/src/types/trail-note.ts` — 新增
- `packages/core/src/store/createThoughtTrailSlice.ts` — 扩展
- `packages/core/src/store/createTrailNoteSlice.ts` — 新增
- `packages/core/src/ai/ai-service.ts` — 增强
- `packages/core/src/sync/entities.ts` — 注册新 entity
- `apps/mobile/src/db/schema.ts` — 新增表
- `packages/core/src/i18n/zh.ts`, `zh-Hant.ts`, `en.ts` — 新增 key
- `backend/pb_migrations/` — 新增 migration
