## ADDED Requirements

### Requirement: 从脉络创建计划任务

系统 SHALL 支持从脉络详情页创建关联到脉络的计划任务。

#### Scenario: 创建关联到脉络的计划任务
- **WHEN** 用户点击"从这条脉络创建计划任务"
- **THEN** 弹出创建计划任务弹窗
- **THEN** 用户填写任务名称、描述、优先级、日期范围后创建
- **THEN** 创建的 PlanItem 的 `trailId` 指向当前脉络

#### Scenario: AI 建议任务项
- **WHEN** 脉络有 `insightCache` 且包含 `suggestions`
- **THEN** 弹窗顶部展示 AI 建议的任务项（可勾选）
- **THEN** 用户勾选后自动填充到任务表单

#### Scenario: 批量创建建议任务
- **WHEN** 用户勾选多个 AI 建议并点击"应用选中"
- **THEN** 为每个选中的建议创建一个 PlanItem，均关联到当前脉络

### Requirement: PlanItem 扩展 trailId 字段

系统 SHALL 在 PlanItem 类型中新增 `trailId` 可选字段。

```typescript
export interface PlanItem extends Syncable {
  // ... 现有字段 ...
  trailId?: string;  // 来源脉络 ID
}
```

#### Scenario: 新增字段可选
- **WHEN** 创建不关联脉络的 PlanItem
- **THEN** `trailId` 为 `undefined`，不影响现有功能

#### Scenario: 按脉络查询关联任务
- **WHEN** 调用 `store.getTrailPlanItems(trailId)`
- **THEN** 返回所有 `trailId` 匹配且未删除的 PlanItem

### Requirement: 关联计划任务展示

系统 SHALL 在脉络详情页展示关联的计划任务及打卡进度。

#### Scenario: 展示关联任务列表
- **WHEN** 脉络有关联的计划任务
- **THEN** 在"关联计划"区域展示任务卡片列表
- **THEN** 每个卡片显示：任务名称、优先级、进度条、打卡天数、日期范围

#### Scenario: 任务卡片交互
- **WHEN** 用户点击某个任务卡片
- **THEN** 跳转到该计划任务的详情页

#### Scenario: 打卡进度展示
- **WHEN** 展示任务卡片
- **THEN** 显示进度条和 `{done}/{total} 天` 格式的打卡进度
- **THEN** 显示任务状态（进行中/已完成）

#### Scenario: 无关联任务时
- **WHEN** 脉络没有关联的计划任务
- **THEN** 仅展示"从这条脉络创建计划任务"入口

### Requirement: 创建计划任务弹窗 UI

系统 SHALL 提供从脉络创建计划任务的专用弹窗。

#### Scenario: 弹窗内容
- **WHEN** 弹窗打开
- **THEN** 包含：AI 建议区（可选）、任务名称输入、描述输入、优先级选择（高/中/低）、日期范围选择、创建/取消按钮

#### Scenario: 无 AI 建议时
- **WHEN** 脉络无 `insightCache`
- **THEN** 不展示 AI 建议区，仅展示手动输入表单
