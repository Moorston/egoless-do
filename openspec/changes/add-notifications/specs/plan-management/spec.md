## MODIFIED Requirements

### Requirement: Plan 数据模型

计划数据模型 SHALL 支持记录邮箱提醒发送时间，并添加通知配置支持。

#### Scenario: 新增 lastDelayedNotifyAt 字段
- **WHEN** 计划对象被创建或更新
- **THEN** 可选字段 `lastDelayedNotifyAt` 用于记录上次发送延期邮箱提醒的时间戳

#### Scenario: 字段可选性
- **WHEN** 计划从未发送过延期提醒
- **THEN** `lastDelayedNotifyAt` 字段为 undefined

#### Scenario: 向后兼容
- **WHEN** 读取旧数据（无该字段）
- **THEN** 系统正常运行，字段值为 undefined

#### Scenario: 新增通知配置字段
- **WHEN** 计划对象被创建或更新
- **THEN** 可选字段 `notificationConfig` 用于存储通知调度配置

#### Scenario: 通知配置结构
- **WHEN** 计划包含通知配置
- **THEN** 配置包含调度类型、时间、重复规则等信息

## ADDED Requirements

### Requirement: 计划任务通知触发

系统 SHALL 在计划任务到期前发送通知提醒。

#### Scenario: 任务到期前提醒
- **WHEN** 计划任务距离到期时间小于配置阈值
- **THEN** 系统发送通知提醒用户完成任务

#### Scenario: 任务逾期提醒
- **WHEN** 计划任务已逾期
- **THEN** 系统发送逾期通知提醒用户

#### Scenario: 通知触发配置
- **WHEN** 用户配置计划通知
- **THEN** 可设置提前提醒时间（如1天前、1小时前）

### Requirement: 计划通知管理

系统 SHALL 允许用户管理计划相关的通知。

#### Scenario: 启用/禁用计划通知
- **WHEN** 用户在计划设置中切换通知
- **THEN** 系统启用或禁用该计划的所有通知

#### Scenario: 自定义通知时间
- **WHEN** 用户自定义计划通知时间
- **THEN** 系统按照用户设置的时间发送通知

#### Scenario: 通知频率限制
- **WHEN** 用户设置通知频率
- **THEN** 系统限制每日通知数量，避免打扰
