# smart-query-integration Specification

## Purpose
TBD - created by archiving change optimize-trail-recommendations. Update Purpose after archive.
## Requirements
### Requirement: 智能查询入口

系统 SHALL 在思维脉络主页提供自然语言查询入口。

#### Scenario: 查询入口位置
- **WHEN** 用户打开思维脉络页面
- **THEN** 在推荐区域上方显示查询输入框
- **AND** 输入框 placeholder 为"描述你想追踪的思维链..."

#### Scenario: 短关键词本地匹配
- **WHEN** 用户输入长度 ≤ 6 字符
- **THEN** 系统使用 `matchByKeyword()` 进行本地匹配
- **AND** 结果直接展示

#### Scenario: 长文本智能查询
- **WHEN** 用户输入长度 > 6 字符
- **THEN** 系统调用 `parseSmartQuery()` 分析意图
- **AND** 根据结果决定是否追问

### Requirement: 追问机制

系统 SHALL 在信息不足时向用户追问澄清。

#### Scenario: 展示追问气泡
- **WHEN** `parseSmartQuery()` 返回的 `question` 不为 null
- **THEN** 系统展示 `SmartQueryBubble` 组件
- **AND** 用户可以选择选项或自由输入

#### Scenario: 追问后重新查询
- **WHEN** 用户回答追问
- **THEN** 系统将回答加入对话历史
- **AND** 重新调用 `parseSmartQuery()` 进行查询

#### Scenario: 追问次数限制
- **WHEN** 对话历史达到 3 轮
- **THEN** 系统停止追问，使用当前信息进行查询

### Requirement: 查询结果展示

系统 SHALL 展示智能查询的匹配结果。

#### Scenario: 应用过滤条件
- **WHEN** `parseSmartQuery()` 返回过滤条件（tags、moods、timeRange）
- **THEN** 系统自动应用这些条件筛选感念

#### Scenario: 语义匹配
- **WHEN** 过滤后的感念池确定
- **THEN** 系统调用 `matchReflectionsToTopic()` 进行语义匹配
- **AND** 结合 `matchByKeyword()` 的结果合并展示

#### Scenario: 快速创建脉络
- **WHEN** 查询结果展示后
- **THEN** 用户可以选择感念并快速创建脉络
- **AND** 跳转到 QuickCreateTrailScreen 并预选感念

### Requirement: 智能查询 RAG 集成
系统 SHALL 使用 RAG 检索层优化智能查询，先本地检索相关感念，再将精简结果发送至 AI 解析查询意图。

#### Scenario: RAG 增强查询
- **WHEN** 用户输入自然语言查询 "找找上周开心的事"
- **THEN** 系统执行以下流程：
  1. 本地关键词提取（"上周"、"开心"）
  2. 检索 Top-5 相关感念
  3. 构建精简 prompt
  4. 调用 AI 解析意图和筛选条件
  5. 返回结构化筛选结果

#### Scenario: 查询超时降级
- **WHEN** AI 查询解析超过 10 秒
- **THEN** 系统降级为本地关键词匹配（matchByKeyword），返回匹配结果

#### Scenario: 短查询跳过 RAG
- **WHEN** 查询长度 ≤6 字符
- **THEN** 系统直接跳转快速创建页面，不执行 RAG 检索

### Requirement: 查询结果缓存
系统 SHALL 缓存智能查询结果，相同查询在 TTL 内直接返回缓存。

#### Scenario: 重复查询
- **WHEN** 用户重复输入相同查询
- **THEN** 系统返回缓存的筛选结果，不重复调用 AI

### Requirement: 查询 Prompt 精简
系统 SHALL 使用精简 prompt 格式，仅包含查询上下文和 Top-5 感念摘要。

#### Scenario: Prompt 构建
- **WHEN** 构建查询解析 prompt
- **THEN** prompt 长度从 ~3000 字符降至 ~500 字符，包含：
  - 意图解析指令（~100 字符）
  - 查询文本（~50 字符）
  - 5 条感念摘要（~300 字符）
  - 输出格式（~50 字符）

