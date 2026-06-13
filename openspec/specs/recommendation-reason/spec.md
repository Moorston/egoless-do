# recommendation-reason Specification

## Purpose
TBD - created by archiving change optimize-trail-recommendations. Update Purpose after archive.
## Requirements
### Requirement: 推荐理由生成

系统 SHALL 为每条推荐生成解释文本，说明为什么这些感念被推荐。

#### Scenario: 本地推荐理由（心情变化）
- **WHEN** 推荐类型为 `mood`（心情变化链）
- **THEN** 理由格式为："发现你在 {dateRange} 的情绪从 {firstMood} 转向 {lastMood}"

#### Scenario: 本地推荐理由（标签聚焦）
- **WHEN** 推荐类型为 `tag`（标签聚焦链）
- **THEN** 理由格式为："围绕 #{tag} 的 {count} 条感念，展现了持续的思考"

#### Scenario: 本地推荐理由（时间规律）
- **WHEN** 推荐类型为 `time`（时间规律链）
- **THEN** 理由格式为："{timeSlot} 独处时的深度反思"

#### Scenario: AI 推荐理由
- **WHEN** 推荐来自云端 AI
- **THEN** 直接使用 AI 返回的 `description` 作为理由

#### Scenario: 混合推荐理由优先级
- **WHEN** 推荐是本地和 AI 结果合并的
- **THEN** 优先使用 AI 理由，如果 AI 理由为空则使用本地模板

### Requirement: 理由展示位置

推荐理由 SHALL 在卡片展开后展示。

#### Scenario: 卡片收起状态
- **WHEN** 推荐卡片处于收起状态
- **THEN** 不展示推荐理由

#### Scenario: 卡片展开状态
- **WHEN** 推荐卡片处于展开状态
- **THEN** 在卡片内展示推荐理由区域
- **AND** 理由区域带有 🤖 图标标识

