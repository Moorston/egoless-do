# habit-alarm Specification

## Purpose
习惯闹钟提醒能力——为单个习惯设置固定时间的每日提醒通知，与习惯状态联动。

## Requirements

### Requirement: 习惯提醒数据模型

系统 SHALL 在 Habit 类型中支持提醒配置字段。

#### Scenario: 新增字段
- **WHEN** Habit 类型定义
- **THEN** 包含 `alarmEnabled: boolean`、`alarmHour: number`、`alarmMinute: number` 字段

#### Scenario: 默认值
- **WHEN** 创建新习惯且用户未设置提醒
- **THEN** `alarmEnabled` 默认为 `false`，`alarmHour` 默认 `8`，`alarmMinute` 默认 `0`

### Requirement: 习惯提醒调度

系统 SHALL 使用 expo-notifications 为启用提醒的习惯调度每日本地通知。

#### Scenario: 调度提醒
- **WHEN** 习惯 `alarmEnabled === true` 且 `status === 'inProgress'`
- **THEN** 系统在 `alarmHour:alarmMinute` 调度每日重复通知
- **AND** 通知标题为习惯名称
- **AND** 通知正文为"该打卡了！已连续 {streak} 天"

#### Scenario: 取消提醒
- **WHEN** 习惯 `alarmEnabled` 变为 `false`
- **THEN** 系统取消该习惯的通知调度

#### Scenario: 启动时重调度
- **WHEN** App 启动
- **THEN** 系统取消所有已调度的习惯通知
- **AND** 遍历所有 `alarmEnabled && status === 'inProgress'` 的习惯重新调度

### Requirement: 习惯状态联动

系统 SHALL 在习惯状态变化时正确管理提醒。

#### Scenario: 暂停习惯
- **WHEN** 习惯状态变为 `paused`
- **THEN** 系统在下次启动时跳过该习惯的通知调度（不精确取消）

#### Scenario: 恢复习惯
- **WHEN** 习惯状态从 `paused` 变为 `inProgress`
- **THEN** 系统在下次启动时重新调度该习惯的通知

#### Scenario: 完成/放弃/删除习惯
- **WHEN** 习惯状态变为 `completed` 或 `abandoned`，或习惯被删除
- **THEN** 系统在下次启动时跳过该习惯的通知调度

### Requirement: 通知点击跳转

系统 SHALL 在用户点击习惯提醒通知时打开习惯详情页。

#### Scenario: 点击通知
- **WHEN** 用户点击习惯提醒通知
- **THEN** 系统导航到 `HabitDetail` 页面，显示对应习惯的详情

### Requirement: 创建时设置提醒

系统 SHALL 在创建习惯表单中提供提醒设置入口。

#### Scenario: 表单内嵌提醒设置
- **WHEN** 用户打开创建/编辑习惯表单
- **THEN** 表单中显示提醒开关（Toggle）
- **AND** 开关开启时显示时间选择器，默认 08:00

#### Scenario: 编辑习惯提醒
- **WHEN** 用户编辑已有习惯
- **THEN** 表单中显示当前提醒设置
- **AND** 用户可以修改时间或关闭提醒

### Requirement: 详情页提醒显示

系统 SHALL 在习惯详情页显示当前提醒设置。

#### Scenario: 详情页提醒卡片
- **WHEN** 用户查看习惯详情页
- **THEN** 在"习惯信息"卡片下方显示提醒设置卡片
- **AND** 卡片显示提醒时间和开关状态
- **AND** 用户可以点击编辑提醒设置

#### Scenario: 详情页编辑提醒
- **WHEN** 用户在详情页点击提醒设置
- **THEN** 弹出时间选择器或开关切换
- **AND** 修改后立即保存并更新通知调度
