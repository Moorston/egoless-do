## MODIFIED Requirements

### Requirement: 智能查询入口

系统 SHALL 在快速创建脉络页面提供自然语言查询入口，作为三阶段检索管线的一部分。

#### Scenario: 查询入口位置
- **WHEN** 用户打开快速创建脉络页面
- **THEN** 在页面顶部显示多行查询输入框

#### Scenario: 短关键词本地匹配
- **WHEN** 用户输入长度为 1 字符
- **THEN** 系统仅使用 RAG 本地检索（Phase 1），不触发 AI

#### Scenario: 长文本智能查询
- **WHEN** 用户输入长度 >= 2 字符
- **THEN** 系统执行三阶段检索管线（Phase 1 → Phase 2 → Phase 3）

### Requirement: 追问机制

系统 SHALL 在 Phase 1 结果不足时，通过 parseSmartQuery 理解意图，必要时追问澄清。

#### Scenario: 展示追问气泡
- **WHEN** Phase 1 结果 <= 3 条且 `parseSmartQuery()` 返回 `question` 不为 null
- **THEN** 系统展示 `SmartQueryBubble` 组件
- **AND** 用户可以选择选项或自由输入

#### Scenario: 追问后重新查询
- **WHEN** 用户回答追问
- **THEN** 系统将回答加入对话历史
- **AND** 带 chatHistory 重新执行三阶段检索管线

#### Scenario: 追问次数限制
- **WHEN** 对话历史达到 3 轮
- **THEN** 系统停止追问，使用当前信息进行查询

#### Scenario: 跳过追问
- **WHEN** 用户点击跳过追问
- **THEN** 系统直接进入 Phase 3 语义扩展搜索

### Requirement: 查询结果展示

系统 SHALL 展示检索结果，direct 结果在前，extended 结果在后。

#### Scenario: 应用过滤条件
- **WHEN** `parseSmartQuery()` 返回过滤条件（tags、moods、timeRange）
- **THEN** 系统将这些条件展示为 FilterTags，用户可移除

#### Scenario: 语义匹配
- **WHEN** Phase 1 结果不足
- **THEN** 系统依次尝试 Phase 2（意图理解）和 Phase 3（语义扩展）

#### Scenario: 快速创建脉络
- **WHEN** 查询结果展示后
- **THEN** 用户可以选择感念并快速创建脉络

### Requirement: 智能查询 RAG 集成

系统 SHALL 使用 RAG 检索层作为 Phase 1，使用多维评分排序结果。

#### Scenario: RAG 增强查询
- **WHEN** 用户输入自然语言查询 "找找上周开心的事"
- **THEN** 系统执行以下流程：
  1. 构建候选池（尊重时间/标签/心情筛选）
  2. RAG retrieveTopK 多维评分检索
  3. 如果结果 <= 3 条，触发 parseSmartQuery 意图理解
  4. 如果仍不足，触发 semanticSearchReflections 语义扩展

#### Scenario: 查询超时降级
- **WHEN** AI 查询解析超过 10 秒
- **THEN** 系统降级为本地 RAG 检索结果

#### Scenario: 单字符查询跳过 AI
- **WHEN** 查询长度为 1 字符
- **THEN** 系统仅执行 Phase 1 RAG 检索

### Requirement: 查询结果缓存

系统 SHALL 缓存 AI 查询结果，使用数据指纹作为 key。

#### Scenario: 重复查询
- **WHEN** 用户重复输入相同查询且数据未变化
- **THEN** 系统返回缓存结果，不重复调用 AI

#### Scenario: 缓存 key 策略
- **WHEN** 生成缓存 key
- **THEN** 使用 query + count + latestTimestamp，不包含全量 reflection ID

### Requirement: 查询 Prompt 精简

系统 SHALL 使用精简 prompt 格式，仅包含查询上下文和 Top-K 感念摘要。

#### Scenario: Prompt 构建
- **WHEN** 构建查询解析 prompt
- **THEN** prompt 长度控制在 ~800 字符以内
