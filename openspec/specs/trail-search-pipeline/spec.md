# trail-search-pipeline Specification

## Purpose
快速创建脉络页面的三阶段检索管线，包含 RAG 本地检索、AI 意图理解、语义扩展搜索，以及统一排序、分页、搜索历史、降级指示等能力。

## Requirements
### Requirement: 三阶段检索管线

系统 SHALL 在快速创建脉络页面提供三阶段检索管线：RAG 本地检索 → 意图理解 → 语义扩展。默认仅执行 Phase 1，Phase 2 + Phase 3 由用户主动触发。

#### Scenario: Phase 1 足够结果
- **WHEN** 用户输入查询且 RAG 本地检索返回 > 3 条结果
- **THEN** 系统直接展示结果，不调用 AI

#### Scenario: Phase 1 不足时不自动触发 Phase 2
- **WHEN** RAG 本地检索返回 <= 3 条结果
- **THEN** 系统展示本地结果
- **AND** 不自动触发 Phase 2，等待用户点击 AI 按钮

#### Scenario: 用户触发 AI 搜索
- **WHEN** 用户点击 AI 搜索按钮
- **THEN** 系统调用 `parseSmartQuery()` 理解意图
- **AND** 如果返回 question 则展示追问气泡
- **AND** 如果返回 topic/filters 则用新条件重跑 Phase 1

#### Scenario: Phase 2 仍不足触发 Phase 3
- **WHEN** Phase 1 + Phase 2 结果仍 <= 3 条（用户已触发 AI 搜索）
- **THEN** 系统调用 `semanticSearchReflections()` 全量语义搜索
- **AND** 结果标记为 extended

#### Scenario: 单字符查询
- **WHEN** 用户输入单个字符
- **THEN** 系统仅执行 Phase 1（RAG 本地检索），不显示 AI 按钮

### Requirement: 统一多维评分排序

系统 SHALL 使用 RAG 多维评分替代二值关键词匹配进行结果排序。

#### Scenario: direct 结果排序
- **WHEN** 结果来自 Phase 1 或 Phase 2（在筛选条件内）
- **THEN** 结果按 `ragScore` 降序排列

#### Scenario: extended 结果排序
- **WHEN** 结果来自 Phase 3（突破筛选条件）
- **THEN** 结果按 `aiRelevance × 0.5` 降序排列
- **AND** 排在所有 direct 结果之后

#### Scenario: 混合排序
- **WHEN** 同时有 direct 和 extended 结果
- **THEN** direct 结果在前（按 ragScore 降序），extended 结果在后（按 aiRelevance × 0.5 降序）

### Requirement: 候选池策略

系统 SHALL 在 Phase 1 使用筛选后的候选池，在 Phase 3 使用全量感念池。

#### Scenario: Phase 1 尊重筛选
- **WHEN** 用户设置了时间范围、标签或心情筛选
- **THEN** Phase 1 仅在筛选后的 candidates 中检索

#### Scenario: Phase 3 突破筛选
- **WHEN** Phase 3 语义扩展搜索
- **THEN** 在全量 reflections 中搜索，不受筛选条件限制

### Requirement: 结果分页

系统 SHALL 对检索结果进行分页展示，每页 20 条。

#### Scenario: 首次加载
- **WHEN** 检索完成
- **THEN** 系统展示前 20 条结果

#### Scenario: 加载更多
- **WHEN** 用户滚动到底部
- **THEN** 系统加载下一页 20 条结果

### Requirement: 搜索历史

系统 SHALL 记录用户最近 5 条搜索历史，本地持久化存储。

#### Scenario: 记录搜索
- **WHEN** 用户执行搜索且结果不为空
- **THEN** 将搜索词加入历史记录（去重，最多 5 条）

#### Scenario: 展示历史
- **WHEN** 搜索输入框为空且无筛选结果
- **THEN** 在 InsightPanel 附近展示最近搜索历史

#### Scenario: 使用历史
- **WHEN** 用户点击搜索历史条目
- **THEN** 将该条目填入搜索框并触发搜索

### Requirement: AI 降级持久指示

系统 SHALL 在 AI 搜索降级时显示持久状态指示。

#### Scenario: AI 降级显示
- **WHEN** AI 语义搜索失败且降级为本地匹配
- **THEN** 在结果列表上方显示持久提示（不随 AIAnalysisStream 消失）
- **AND** 提示内容为"AI 搜索不可用，显示本地匹配结果"

#### Scenario: 正常 AI 搜索
- **WHEN** AI 语义搜索成功
- **THEN** 不显示降级提示
