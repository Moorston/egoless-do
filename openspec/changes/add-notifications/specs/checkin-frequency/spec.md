## MODIFIED Requirements

### Requirement: 打卡频率类型定义

系统 SHALL 支持六种打卡频率模式，并基于频率生成智能通知提醒。

#### Scenario: 未设置频率的任务按每天模式处理
- **WHEN** PlanItem 的 frequency 字段为 undefined
- **THEN** 系统按 `{ mode: 'daily' }` 处理，进度 = 已打卡天数 / 总天数

#### Scenario: 设置每周固定频率
- **WHEN** 用户将 PlanItem 的 frequency 设为 `{ mode: 'weekly_fixed', days: [1, 3, 5] }`
- **THEN** 系统仅在周一、周三、周五显示该任务为待打卡项

#### Scenario: 基于频率生成通知
- **WHEN** 用户为任务配置了频率
- **THEN** 系统根据频率模式自动生成相应的通知提醒

## ADDED Requirements

### Requirement: 基于频率的智能提醒

系统 SHALL 根据打卡频率模式生成智能提醒通知。

#### Scenario: 每日模式提醒
- **WHEN** 任务频率为 daily
- **THEN** 系统在每天固定时间发送打卡提醒

#### Scenario: 每周固定模式提醒
- **WHEN** 任务频率为 weekly_fixed
- **THEN** 系统仅在指定日期发送打卡提醒

#### Scenario: 每周 N 次模式提醒
- **WHEN** 任务频率为 weekly，本周打卡次数未达标
- **THEN** 系统在工作日发送提醒，直到达到目标次数

#### Scenario: 间隔模式提醒
- **WHEN** 任务频率为 interval
- **THEN** 系统在间隔天数到期时发送提醒

### Requirement: 打卡频率与通知同步

系统 SHALL 保持打卡频率配置与通知调度同步。

#### Scenario: 频率变更时更新通知
- **WHEN** 用户修改任务的打卡频率
- **THEN** 系统自动更新对应的通知调度配置

#### Scenario: 频率禁用时取消通知
- **WHEN** 用户禁用任务的打卡频率
- **THEN** 系统取消该任务的所有通知

#### Scenario: 任务完成时停止通知
- **WHEN** 任务进度达到 100%
- **THEN** 系统停止发送该任务的打卡提醒

### Requirement: 打卡频率统计通知

系统 SHALL 基于打卡频率统计生成激励通知。

#### Scenario: 连续打卡祝贺
- **WHEN** 用户连续完成打卡达到里程碑（如7天、30天）
- **THEN** 系统发送祝贺通知，鼓励继续坚持

#### Scenario: 打卡频率下降提醒
- **WHEN** 用户最近打卡频率明显下降
- **THEN** 系统发送温和的提醒通知，帮助恢复习惯

#### Scenario: 周期完成总结
- **WHEN** 一个打卡周期（如一周）结束
- **THEN** 系统发送周期总结通知，展示完成情况
