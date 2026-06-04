## ADDED Requirements

### Requirement: Checkbox 替代 Toggle 开关
待办列表中的每个待办项 SHALL 使用 22x22 checkbox 圆圈替代原有的 36x20 滑动开关。触摸命中区域 SHALL 扩大到 44x44。

#### Scenario: 未完成态显示
- **WHEN** 待办项未完成
- **THEN** 显示空心圆圈，边框 2px solid TH.border，背景透明

#### Scenario: 已完成态显示
- **WHEN** 待办项已完成
- **THEN** 显示绿色填充背景（COLORS.GREEN），内嵌白色 Check 图标（14px）

#### Scenario: 点击切换状态
- **WHEN** 用户点击 checkbox 区域
- **THEN** 切换待办完成状态，伴随 200ms 的 scale(1.1) 弹跳动画

#### Scenario: 触摸区域
- **WHEN** 用户点击 checkbox 周围 44x44 区域
- **THEN** SHALL 触发状态切换

### Requirement: 计划任务 Checkbox 交互
计划任务项 SHALL 使用 checkbox 组件，点击时调用 toggleItem。

#### Scenario: 点击计划任务 checkbox
- **WHEN** 用户点击计划任务的 checkbox
- **THEN** 调用 toggleItem(itemId) 切换打卡状态

#### Scenario: 联动打卡标识
- **WHEN** 计划任务通过联动模块自动打卡
- **THEN** checkbox 显示为已完成态，并在右侧显示"联动打卡"标签

### Requirement: 自定义待办 Checkbox 交互
自定义待办项 SHALL 使用 checkbox 组件，点击时调用 toggleCustomTodo。

#### Scenario: 点击自定义待办 checkbox
- **WHEN** 用户点击自定义待办的 checkbox
- **THEN** 调用 toggleCustomTodo(id) 切换完成状态
