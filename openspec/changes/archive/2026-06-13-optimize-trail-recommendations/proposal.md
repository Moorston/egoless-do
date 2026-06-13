## Why

当前思维脉络页面的推荐系统存在三个主要问题：

1. **推荐质量有限** — 只使用本地硬编码算法（心情变化、标签聚焦、时间规律），无法理解内容语义。云端 AI 推荐函数 `recommendTrailsViaAI()` 已实现但未在主流程中使用。
2. **交互体验割裂** — 推荐卡片点击后展开区域是独立 View，不在卡片内部；没有"刷新推荐"和"不感兴趣"反馈机制。
3. **智能查询未整合** — `SmartQueryBubble` 组件只在 `QuickCreateTrailScreen` 中使用，思维脉络主页无法用自然语言描述想要的思维链。

## What Changes

**平台**: Mobile（MindTrailScreen）

**核心改动**:

- **混合推荐策略** — 本地算法作为快速预筛选，云端 AI 作为深度分析，结合两者结果去重排序
- **推荐理由展示** — 每条推荐附带解释（为什么这些感念被推荐），来自 AI 或本地模板
- **增强卡片交互** — 整卡可点击展开（不是独立区域），添加"不感兴趣"反馈按钮
- **"换一批"刷新** — 用户可以主动触发新的推荐
- **智能查询入口** — 在思维脉络主页添加搜索框，支持自然语言查询 + 追问机制
- **用户偏好学习** — 记录忽略/接受的推荐，调整后续推荐权重

**非目标**:
- 不改动 `QuickCreateTrailScreen` 的智能查询逻辑
- 不做语音输入
- 不做跨页面搜索
- 不改动云端 AI 基础设施（AIService、provider）

## Capabilities

### New Capabilities
- `hybrid-recommendation`: 混合推荐引擎 — 本地算法 + 云端 AI 结果合并、去重、排序
- `recommendation-reason`: 推荐理由生成 — 为每条推荐生成解释文本
- `smart-query-integration`: 智能查询整合 — 在思维脉络主页添加自然语言查询入口

### Modified Capabilities
- `recommendation-card`: 推荐卡片交互增强 — 整卡展开、理由展示、反馈按钮

## Impact

**受影响的代码**:
- `packages/core/src/business/trail-creation.ts` — 新增混合推荐函数
- `packages/core/src/ai/trail-recommender.ts` — 优化 AI 推荐返回 reason
- `packages/core/src/types/thought-trail.ts` — TrailRecommendation 接口扩展
- `apps/mobile/src/features/reflections/MindTrailScreen.tsx` — 主页面改造
- `apps/mobile/src/features/reflections/RecommendCard.tsx` — 卡片组件增强
- `apps/mobile/src/store/useAppStore.ts` — 用户偏好存储

**依赖**:
- 现有 AI 基础设施（AIService + OpenAI-compatible provider）
- SmartQueryBubble 组件（已实现）
