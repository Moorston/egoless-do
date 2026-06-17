## ADDED Requirements

### Requirement: 支持 5 种节点类型
RelationMapView SHALL 支持以下 5 种节点类型：reflection（感念）、plan（计划）、habit（习惯）、trail（思维脉络）、planItem（计划任务）。

#### Scenario: 节点类型定义
- **WHEN** 系统构建关系图
- **THEN** NodeType 类型包含 'reflection' | 'plan' | 'habit' | 'trail' | 'planItem'

#### Scenario: 节点颜色和图标
- **WHEN** 系统渲染节点
- **THEN** 每种节点类型 SHALL 有对应的固定颜色和 emoji 图标

### Requirement: 思维脉络入口上下文过滤
当以思维脉络为入口时，系统 SHALL 展示该脉络关联的所有感念和计划任务。

#### Scenario: 展示脉络包含的感念
- **WHEN** 用户从思维脉络详情进入关系全景图
- **THEN** 系统 SHALL 展示该脉络 `reflectionIds` 中的所有感念节点

#### Scenario: 展示脉络关联的计划任务
- **WHEN** 用户从思维脉络详情进入关系全景图
- **THEN** 系统 SHALL 展示该脉络 `linkedPlanItemIds` 中的所有计划任务节点

#### Scenario: 脉络作为中心节点
- **WHEN** 用户从思维脉络详情进入关系全景图
- **THEN** 脉络节点 SHALL 位于屏幕中心，尺寸放大 1.2 倍

### Requirement: 计划任务入口上下文过滤
当以计划任务为入口时，系统 SHALL 展示该任务关联的感念、思维脉络和习惯。

#### Scenario: 展示任务关联的感念
- **WHEN** 用户从计划任务详情进入关系全景图
- **THEN** 系统 SHALL 展示通过 `reflectionId` 关联的感念节点

#### Scenario: 展示任务关联的思维脉络
- **WHEN** 用户从计划任务详情进入关系全景图
- **THEN** 系统 SHALL 展示通过 `trailId` 关联的思维脉络节点

#### Scenario: 展示任务关联的习惯
- **WHEN** 用户从计划任务详情进入关系全景图
- **THEN** 系统 SHALL 展示通过 `linkConfig.habitId` 关联的习惯节点

### Requirement: 节点数量限制
当节点数量超过上限时，系统 SHALL 按关联度排序截断。

#### Scenario: 节点数超过限制
- **WHEN** 构建的关系图节点数超过 20
- **THEN** 系统 SHALL 按关联度（边数量）降序排序，仅保留前 20 个节点

### Requirement: 从思维脉络详情进入关系全景图
思维脉络详情页 SHALL 提供"关系全景图"入口按钮。

#### Scenario: 点击关系全景图按钮
- **WHEN** 用户在思维脉络详情页点击"关系全景图"按钮
- **THEN** 系统 SHALL 导航到 RelationMapView，context 类型为 'trail'，id 为当前脉络 id

### Requirement: 从计划任务详情进入关系全景图
计划任务详情区域 SHALL 提供"关系全景图"入口按钮。

#### Scenario: 点击关系全景图按钮
- **WHEN** 用户在计划任务详情区域点击"关系全景图"按钮
- **THEN** 系统 SHALL 导航到 RelationMapView，context 类型为 'planItem'，id 为当前任务 id
