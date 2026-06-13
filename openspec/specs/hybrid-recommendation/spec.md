# hybrid-recommendation Specification

## Purpose
TBD - created by archiving change optimize-trail-recommendations. Update Purpose after archive.
## Requirements
### Requirement: 混合推荐引擎

系统 SHALL 提供混合推荐引擎，结合本地算法和云端 AI 生成思维链推荐。

#### Scenario: 本地推荐立即显示
- **WHEN** 用户打开思维脉络页面
- **THEN** 系统在 100ms 内显示本地算法生成的推荐（心情变化、标签聚焦、时间规律）

#### Scenario: AI 推荐后台加载
- **WHEN** 云端 AI 可用且用户有至少 10 条感念
- **THEN** 系统在后台调用 `recommendTrailsViaAI()` 获取 AI 推荐
- **AND** AI 推荐加载完成后合并到推荐列表

#### Scenario: 推荐结果去重
- **WHEN** 本地推荐和 AI 推荐的 `reflectionIds` 重叠度超过 50%
- **THEN** 系统保留 score 较高的推荐，移除重复推荐

#### Scenario: AI 不可用时降级
- **WHEN** 云端 AI 不可用（未配置或网络错误）
- **THEN** 系统仅使用本地推荐，不影响用户体验

### Requirement: "换一批"刷新

系统 SHALL 允许用户主动触发新的推荐生成。

#### Scenario: 点击刷新按钮
- **WHEN** 用户点击"换一批"按钮
- **THEN** 系统重新执行混合推荐流程
- **AND** 展示新的推荐结果（可能包含之前忽略的推荐）

#### Scenario: 刷新时保留偏好
- **WHEN** 用户点击"换一批"按钮
- **THEN** 系统在重新推荐时仍然应用用户偏好（忽略的推荐降权）

### Requirement: 用户偏好学习

系统 SHALL 记录用户对推荐的反馈，调整后续推荐。

#### Scenario: 记录忽略操作
- **WHEN** 用户点击推荐卡片的"不感兴趣"按钮
- **THEN** 系统将该推荐的模式（type + primaryTag + mood）记录到 `ignoredRecPatterns`

#### Scenario: 偏好影响推荐
- **WHEN** 系统生成新推荐
- **THEN** 与 `ignoredRecPatterns` 匹配的推荐 score 降低 50%

#### Scenario: 偏好持久化
- **WHEN** 用户关闭应用后重新打开
- **THEN** 之前记录的偏好仍然生效

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

