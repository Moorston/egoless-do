## Context

思维脉络（ThoughtTrail）是 egoless-do 中用于组织感念（MindReflection）的核心概念。当前 ThoughtTrailDetailScreen 是一个约 540 行的单文件组件，功能仅限于展示关联感念的时间线、编辑脉络名称/描述、删除脉络和移除感念。

已有的可复用能力：
- `AIService.generateTrailInsight()` — 脉络洞察生成（本地+云端），返回 `TrailInsight { summary, keyPoints, turningPoints, suggestions }`
- `AIService.generateReviewGuide()` — 复盘引导生成（本地+云端），返回 `ReviewGuide { questions, observations, suggestions }`
- `store.createPlanItemFromReflection()` — 从感念创建计划任务（已有双向关联机制）
- `getTrailStats()` / `detectGrowthPatterns()` — 统计和趋势检测
- `CreateThoughtTrailModal` 内含完整的感念选择器 UI（搜索+多选）
- 40+ 脉络相关 i18n key

## Goals / Non-Goals

**Goals:**
- 将脉络详情页升级为"记录 → 分析 → 反思 → 行动"的思维工作流
- 引入 TrailNote 实体，区分日常感念和脉络内的深度反思
- 集成 AI 洞察和复盘引导，结果持久化缓存
- 支持从脉络创建计划任务并展示进度
- 时间线混排普通感念与脉络感念，表达时间跨度

**Non-Goals:**
- 不改变现有 MindReflection 的结构和行为
- 不在主感念列表中展示脉络感念（TrailNote 只在脉络内可见）
- 不实现 AI 自动生成脉络感念（只引导用户写）
- 不实现脉络间的自动关联（仅推荐，不自动建立关系）
- Web 端暂不同步此变更

## Decisions

### D1: TrailNote 作为独立实体，不复用 MindReflection

**选择**: 新增 `TrailNote` 类型，独立于 `MindReflection`。

**理由**:
- 语义不同：MindReflection 是日常随手记录，TrailNote 是有上下文的深度反思
- 可见性不同：MindReflection 全局可见，TrailNote 只在脉络内
- 来源不同：TrailNote 有 `guided`/`free` 区分，携带引导问题上下文
- 混合存储会导致主感念列表被脉络反思污染

**替代方案**: 复用 MindReflection + 添加 `isTrailNote` 标记。被否决：会导致全局查询需要过滤，且语义不清晰。

### D2: AI 缓存存储在 ThoughtTrail 实体上

**选择**: `insightCache` 和 `reviewCache` 直接嵌入 ThoughtTrail 对象。

**理由**:
- 缓存与脉络是 1:1 关系，无需独立实体
- 嵌入式存储查询简单，不需要额外 join
- 覆盖式更新，不需要版本历史

**替代方案**: 独立的 `TrailInsightCache` 表。被否决：增加复杂度，且没有多版本需求。

### D3: PlanItem 通过 trailId 关联脉络

**选择**: PlanItem 新增可选字段 `trailId?: string`。

**理由**:
- 与现有 `reflectionId` 模式一致（感念 → 计划任务的关联方式）
- 支持从脉络维度查询关联任务
- 不破坏现有 PlanItem 的使用方式

**替代方案**: 新增中间表 `TrailPlanLink`。被否决：过度设计，1:1 关联不需要中间表。

### D4: 时间线混排策略

**选择**: 普通感念和脉络感念按 `createdAt` 统一排序，视觉上区分。

**理由**:
- 保持时间线的连续性，用户看到完整的心路历程
- 视觉区分（实线/虚线、渐变/柔和背景、📝/🤔 图标）足够区分来源
- 脉络感念的 `guidedQuestion` 在卡片顶部展示，提供额外上下文

### D5: 感念卡片展开为 inline 而非跳转

**选择**: 点击感念卡片展开全文，再次点击折叠。

**理由**:
- 保持在脉络上下文中阅读，不打断思维流
- 用户需要对比多条感念，跳转会丢失上下文
- 展开/折叠是轻量交互，符合时间线浏览习惯

### D6: 组件拆分策略

**选择**: 将 ThoughtTrailDetailScreen 拆分为多个子组件。

```
ThoughtTrailDetailScreen.tsx (容器)
├── TrailOverviewCard.tsx        — 脉络概览统计
├── InsightSection.tsx           — AI 洞察区
├── ReviewGuideSection.tsx       — 复盘引导区
├── TimelineList.tsx             — 时间线容器
│   ├── ReflectionItem.tsx       — 普通感念卡片
│   ├── TrailNoteItem.tsx        — 脉络感念卡片
│   └── LinkBadge.tsx            — 连接指示器
├── AddReflectionBar.tsx         — 添加操作栏
├── WriteNoteModal.tsx           — 写反思弹窗
├── PlanTasksSection.tsx         — 关联计划区
│   └── PlanTaskCard.tsx         — 计划任务卡片
└── RelatedTrailsSection.tsx     — 相关脉络区
```

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|----------|
| TrailNote 同步增加数据量 | 脉络感念通常不多（每条脉络 5-20 条），增量可控 |
| AI 调用失败的用户体验 | 本地引擎提供基础分析兜底，云端失败时降级到本地 |
| 缓存过期（感念变化后洞察不更新） | 提供"重新生成"按钮，用户手动触发刷新 |
| 组件拆分可能导致过度抽象 | 每个组件有明确的单一职责，不做过度通用化 |
| PlanItem.trailId 可选字段的查询效率 | PocketBase 支持索引，migration 时添加索引 |

## Migration Plan

1. **DB Migration**: 新增 `trail_notes` 表 + `thought_trails` 表新增 `note_ids`、`insight_cache`、`review_cache` 字段 + `plan_items` 表新增 `trail_id` 字段
2. **数据兼容**: `insightSummary` → `insightCache.summary` 的读取兼容（旧字段自动迁移到新结构）
3. **同步兼容**: 注册 `trailNote` entity，PocketBase 新增 collection
4. **回滚策略**: 新增字段均为可选，回滚只需移除新增的 UI 组件和 store 方法
