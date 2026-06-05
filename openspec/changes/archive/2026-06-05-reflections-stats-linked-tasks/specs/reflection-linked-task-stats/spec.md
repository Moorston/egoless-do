## ADDED Requirements

### Requirement: 关联任务统计 Tab
感念统计页 SHALL 包含"关联任务"Tab，展示感念与计划任务的关联统计数据。

#### Scenario: 显示关联概览
- **WHEN** 用户切换到"关联任务"Tab
- **THEN** 顶部显示关联总数（有 linkedPlanItemId 的感念数量）和关联率（关联数/总感念数 × 100%）

#### Scenario: 按任务分组展示
- **WHEN** 用户切换到"关联任务"Tab
- **THEN** 下方显示按计划任务分组的列表，每个任务显示名称和关联感念数量，按数量降序排列

#### Scenario: 无关联数据时空状态
- **WHEN** 没有任何感念关联了计划任务
- **THEN** 显示空状态提示

### Requirement: Tab 顺序调整
感念统计页的 Tab 顺序 SHALL 为：标签→心情→关联任务→趋势→热力图。

#### Scenario: 默认激活标签 Tab
- **WHEN** 用户进入感念统计页
- **THEN** 默认显示"标签"Tab 内容
