## ADDED Requirements

### Requirement: 统一 Store Action
系统 SHALL 提供一个统一 `createPlanItem(source, form)` store action 替代现有的 `createPlanItemFromReflection` 和 `createPlanItemFromTrail`。

#### Scenario: 从感念创建
- **WHEN** 调用 `createPlanItem({ type: 'reflection', id: 'ref123' }, form)`
- **THEN** 创建 plan item 并与感念建立双向链接（planItem.reflectionId = ref123，reflection.linkedPlanItemId = newPlanItemId）

#### Scenario: 从脉络创建
- **WHEN** 调用 `createPlanItem({ type: 'trail', id: 'trail123' }, form)`
- **THEN** 创建 plan item 并与脉络建立双向链接（planItem.trailId = trail123，trail.linkedPlanItemIds 追加 newPlanItemId）

#### Scenario: 没有可用计划时拒绝
- **WHEN** 用户没有 activePlan（未选择或创建计划）
- **THEN** action 返回 false，不创建记录

#### Scenario: 旧 action 依然可用
- **WHEN** 代码调用 `createPlanItemFromReflection` 或 `createPlanItemFromTrail`
- **THEN** 内部委托给统一 action，行为不变

### Requirement: 脉络数据模型扩展
ThoughtTrail SHALL 增加 `linkedPlanItemIds?: string[]` 字段，支持多重关联。

#### Scenario: 创建时写入
- **WHEN** 通过统一 action 从脉络创建 plan item
- **THEN** trail 的 linkedPlanItemIds 数组中追加新 ID

#### Scenario: 查询时兼容
- **WHEN** 调用 `getTrailPlanItems(trailId)`
- **THEN** 同时使用 trailId 和 linkedPlanItemIds 过滤，去重后返回合集

#### Scenario: 删除时清理
- **WHEN** 删除与脉络关联的 plan item
- **THEN** trail 的 linkedPlanItemIds 中移除对应 ID

### Requirement: 脉络弹窗增强
CreatePlanFromTrailModal SHALL 增加目标指标字段和人工智能建议选择器。

#### Scenario: AI 建议选择器
- **WHEN** 脉络有 AI insightCache（之前由 generateTrailInsight 生成）
- **THEN** 弹窗上方显示 AI 建议预告标签，点击可选择填充表单

#### Scenario: 目标指标字段
- **WHEN** 渲染弹窗表单
- **THEN** 显示可选的目标指标输入框

### Requirement: 业务逻辑统一
packages/core 中 SHALL 提供统一 `createPlanItem(source, form)` 业务函数。

#### Scenario: 从感念创建（业务层）
- **WHEN** 传入 source.type = 'reflection'
- **THEN** 设置 planItem.reflectionId，验证 reflection 存在

#### Scenario: 从脉络创建（业务层）
- **WHEN** 传入 source.type = 'trail'
- **THEN** 设置 planItem.trailId，验证 trail 存在
