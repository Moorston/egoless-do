## ADDED Requirements

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
