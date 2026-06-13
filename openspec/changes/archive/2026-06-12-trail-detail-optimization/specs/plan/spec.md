## ADDED Requirements

### Requirement: PlanItem 新增 trailId 字段

系统 SHALL 在 PlanItem 接口中新增可选的 `trailId` 字段。

#### Scenario: 字段定义
- **WHEN** 定义 PlanItem 类型
- **THEN** 包含 `trailId?: string` 字段，表示来源脉络 ID

#### Scenario: 现有功能不受影响
- **WHEN** 创建不关联脉络的 PlanItem（如从感念创建、手动创建）
- **THEN** `trailId` 为 `undefined`，现有功能正常工作

#### Scenario: 按 trailId 查询
- **WHEN** 调用 `getTrailPlanItems(trailId)`
- **THEN** 返回所有 `planItem.trailId === trailId` 且未删除的 PlanItem

#### Scenario: 数据库迁移
- **WHEN** 应用升级
- **THEN** `plan_items` 表新增 `trail_id` 列（可选，可为空）
