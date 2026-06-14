# trail-search-pipeline Specification (Delta)

## MODIFIED Requirements

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
