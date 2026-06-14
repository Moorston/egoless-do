## ADDED Requirements

### Requirement: PlanItemForm 共享表单组件
系统 SHALL 提供 `PlanItemForm` 组件，封装创建计划任务的公共表单字段。

#### Scenario: 渲染名称字段
- **WHEN** 渲染 PlanItemForm
- **THEN** 显示任务名称输入框，placeholder 为"输入任务名称"

#### Scenario: 渲染描述字段
- **WHEN** 渲染 PlanItemForm
- **THEN** 显示任务描述多行输入框，placeholder 为"添加任务描述..."

#### Scenario: 渲染日期选择器
- **WHEN** 渲染 PlanItemForm
- **THEN** 显示开始日期和结束日期选择器，默认开始日期为今天

#### Scenario: 渲染优先级选择器
- **WHEN** 渲染 PlanItemForm
- **THEN** 显示低/中/高三个优先级选项，默认选中"中"

#### Scenario: 渲染目标指标字段（条件）
- **WHEN** 传入 `showTargetMetric={true}`
- **THEN** 显示目标指标输入框，placeholder 为"例如：每周复盘3次"

#### Scenario: 不渲染目标指标字段
- **WHEN** 未传入 `showTargetMetric` 或为 `false`
- **THEN** 不显示目标指标输入框

#### Scenario: 表单值受控
- **WHEN** 用户输入字段值
- **THEN** 通过 `onChange(form)` 回调返回当前表单值

#### Scenario: 预设初始值
- **WHEN** 传入 `initialValues`
- **THEN** 各字段使用初始值填充而非默认值

### Requirement: 表单验证
PlanItemForm SHALL 在提交时验证必填字段。

#### Scenario: 名称为空时提示
- **WHEN** 用户提交时名称为空
- **THEN** 名称输入框显示错误提示"请输入任务名称"

#### Scenario: 日期无效时提示
- **WHEN** 结束日期早于开始日期
- **THEN** 日期选择器显示错误提示
