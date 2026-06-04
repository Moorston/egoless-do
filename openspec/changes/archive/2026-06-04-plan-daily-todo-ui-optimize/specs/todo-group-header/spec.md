## ADDED Requirements

### Requirement: 计划任务分组标题
当存在计划任务时，SHALL 在计划任务列表上方显示分组标题。

#### Scenario: 有计划任务时显示标题
- **WHEN** todayItems.length > 0
- **THEN** 在列表上方显示分组标题：ClipboardList 图标 + "每日待办 (N)"，样式为 14px, fontWeight 600, TH.sub 颜色

#### Scenario: 无计划任务时隐藏标题
- **WHEN** todayItems.length === 0
- **THEN** 不显示计划任务分组标题

### Requirement: 自定义待办分组标题
当存在自定义待办时，SHALL 在自定义待办列表上方显示分组标题，上方带分隔线。

#### Scenario: 有自定义待办时显示标题
- **WHEN** dailyCustomTodos.length > 0
- **THEN** 在列表上方显示分组标题：Pencil 图标 + "每日自定义待办 (N)"，标题上方有 1px solid TH.border 分隔线

#### Scenario: 无自定义待办时隐藏标题
- **WHEN** dailyCustomTodos.length === 0
- **THEN** 不显示自定义待办分组标题

### Requirement: 空状态处理
当两类待办都为空时，SHALL 显示空状态提示。

#### Scenario: 全部为空
- **WHEN** todayItems.length === 0 且 dailyCustomTodos.length === 0
- **THEN** 显示空状态提示文字"暂无任务"
