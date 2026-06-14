## ADDED Requirements

### Requirement: PlanItemLink 支持 trail 类型

`PlanItemLink` 联合类型新增 `'trail'` 值，表示计划任务来源于思维脉络。

#### Scenario: 从脉络创建计划任务时 link 类型为 trail
- **WHEN** 用户从思维脉络详情页创建计划任务
- **THEN** 创建的 PlanItem 的 `link` 字段为 `'trail'`，`trailId` 字段为脉络 ID

#### Scenario: LinkBadge 显示脉络标签
- **WHEN** 计划任务的 `link` 为 `'trail'`
- **THEN** LinkBadge 显示"脉络"标签，颜色为紫色 `#8B5CF6`

#### Scenario: 手动创建的任务不受影响
- **WHEN** 用户在计划编辑页手动创建任务
- **THEN** link 类型选项不包含 'trail'，行为不变

### Requirement: 计划详情页直接查找关联脉络

计划详情页通过 `item.trailId` 直接查找关联的思维脉络，不再只依赖感念间接关联。

#### Scenario: 通过 trailId 直接关联
- **WHEN** 计划详情页加载，计划任务的 `trailId` 字段有值
- **THEN** 在"关联脉络"区域显示对应的脉络，点击可跳转到脉络详情

#### Scenario: 兼容感念间接关联
- **WHEN** 计划任务通过感念间接关联到脉络（无 trailId）
- **THEN** 仍通过感念链路找到关联脉络（保持现有行为）

### Requirement: 脉络详情页计划任务点击跳转

#### Scenario: 点击脉络中的计划任务卡片
- **WHEN** 用户在脉络详情页的计划 tab 点击计划任务卡片
- **THEN** 跳转到该计划任务所属的计划详情页
