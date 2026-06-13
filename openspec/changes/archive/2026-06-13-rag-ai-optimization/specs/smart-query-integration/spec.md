## ADDED Requirements

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
