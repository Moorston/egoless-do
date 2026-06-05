# Plan Management

## Requirements

### Requirement: Plan 数据模型

计划数据模型 SHALL 支持记录邮箱提醒发送时间。

#### Scenario: 新增 lastDelayedNotifyAt 字段
- **WHEN** 计划对象被创建或更新
- **THEN** 可选字段 `lastDelayedNotifyAt` 用于记录上次发送延期邮箱提醒的时间戳

#### Scenario: 字段可选性
- **WHEN** 计划从未发送过延期提醒
- **THEN** `lastDelayedNotifyAt` 字段为 undefined

#### Scenario: 向后兼容
- **WHEN** 读取旧数据（无该字段）
- **THEN** 系统正常运行，字段值为 undefined
