## ADDED Requirements

### Requirement: 提取 useTrailData hook
系统 SHALL 将感念/笔记解析、overview/timelineItems/relatedTrails 计算提取为 `useTrailData` hook。

#### Scenario: hook 返回聚合数据
- **WHEN** useTrailData(trailId) 被调用
- **THEN** 返回 trail、trailReflections、trailNotes、overview、timelineItems、relatedTrails、planItems

### Requirement: 提取 useTrailAI hook
系统 SHALL 将 AI 洞察和复盘生成的逻辑（含 AbortController）提取为 `useTrailAI` hook。

#### Scenario: hook 提供生成函数
- **WHEN** useTrailAI 被调用
- **THEN** 返回 handleGenerateInsight、handleGenerateReview、isInsightLoading、isReviewLoading

### Requirement: 移除未使用的导入
系统 SHALL 移除 FAB 组件中未使用的 `Animated` 导入。

#### Scenario: 无 unused import
- **WHEN** 编译时
- **THEN** 不输出关于未使用 import 的 warning
