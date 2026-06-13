## ADDED Requirements

### Requirement: RAG 优化推荐生成
系统 SHALL 使用 RAG 检索层替代全量数据发送，生成思维脉络推荐。推荐引擎先通过本地检索筛选 Top-5 相关感念，再将精简 prompt 发送至 AI 生成推荐。

#### Scenario: RAG 增强推荐
- **WHEN** 用户请求思维脉络推荐
- **THEN** 系统执行以下流程：
  1. 本地检索 Top-5 相关感念（<100ms）
  2. 构建精简 prompt（~500 字符）
  3. 检查缓存，命中则直接返回
  4. 调用 AI 生成推荐（2-5s）
  5. 超时 10s 则降级为本地算法结果

#### Scenario: AI 调用超时降级
- **WHEN** AI 调用超过 10 秒未响应
- **THEN** 系统自动降级为本地推荐算法（detectMoodNarrative, detectTagFocus, detectTimePattern），返回本地结果

#### Scenario: 缓存命中快速返回
- **WHEN** 相同查询在 5 分钟内重复请求
- **THEN** 系统直接返回缓存结果，响应时间 <100ms

### Requirement: 推荐 Prompt 优化
系统 SHALL 使用精简 prompt 格式，仅包含查询上下文和 Top-5 感念摘要，而非全量感念数据。

#### Scenario: Prompt 大小对比
- **WHEN** 构建推荐 prompt
- **THEN** prompt 长度从 ~3000 字符降至 ~500 字符，包含：
  - 角色设定（~50 字符）
  - 查询上下文（~100 字符）
  - 5 条感念摘要（~300 字符）
  - 输出格式指令（~50 字符）

### Requirement: 模型参数优化
系统 SHALL 使用轻量模型配置提升响应速度：max_tokens=500, temperature=0.3。

#### Scenario: 参数传递
- **WHEN** 调用 AI 生成推荐
- **THEN** 系统传递 max_tokens=500 和 temperature=0.3 参数
