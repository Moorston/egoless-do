## ADDED Requirements

### Requirement: 实时倒计时显示

系统 SHALL 在计划详情页显示实时倒计时，精确到秒。

#### Scenario: 计划进行中显示结束倒计时
- **WHEN** 计划状态为 `in_progress` 且未超期
- **THEN** 显示"距离计划结束"标签和倒计时（天:时:分:秒）

#### Scenario: 计划未开始显示开始倒计时
- **WHEN** 计划状态为 `not_started`
- **THEN** 显示"距离计划开始"标签和倒计时（天:时:分:秒）

#### Scenario: 计划超期显示超期天数
- **WHEN** 计划状态为 `in_progress` 且 `endDate < today`
- **THEN** 显示"已超期"标签和超期时间（天:时:分:秒）

#### Scenario: 计划暂停不显示倒计时
- **WHEN** 计划状态为 `paused`
- **THEN** 不显示倒计时组件

#### Scenario: 计划已完成不显示倒计时
- **WHEN** 计划状态为 `completed`
- **THEN** 不显示倒计时组件

#### Scenario: 计划已取消不显示倒计时
- **WHEN** 计划状态为 `cancelled`
- **THEN** 不显示倒计时组件

### Requirement: 倒计时实时更新

系统 SHALL 每秒更新倒计时显示。

#### Scenario: 倒计时每秒更新
- **WHEN** 计划详情页处于前台
- **THEN** 倒计时每秒更新一次

#### Scenario: 应用恢复时刷新倒计时
- **WHEN** 应用从后台恢复到前台
- **THEN** 立即刷新倒计时显示

#### Scenario: 组件卸载时清理定时器
- **WHEN** 计划详情页组件卸载
- **THEN** 清除所有倒计时定时器，避免内存泄漏

### Requirement: 首页延期提醒卡片

系统 SHALL 在首页显示计划延期提醒卡片。

#### Scenario: 计划超期时显示提醒
- **WHEN** 存在状态为 `in_progress` 且 `endDate < today` 的计划
- **THEN** 首页显示延期提醒卡片，包含计划名称和超期天数

#### Scenario: 用户临时关闭提醒
- **WHEN** 用户点击提醒卡片的关闭按钮
- **THEN** 提醒卡片临时隐藏

#### Scenario: 重新打开应用再次显示
- **WHEN** 用户关闭应用后重新打开
- **THEN** 延期提醒卡片再次显示

#### Scenario: 点击提醒跳转计划详情
- **WHEN** 用户点击延期提醒卡片
- **THEN** 跳转到计划详情页

### Requirement: 邮箱延期提醒

系统 SHALL 在计划超期时发送一次邮箱提醒。

#### Scenario: 计划超期发送邮箱提醒
- **WHEN** 计划从 `in_progress` 状态检测到 `endDate < today`
- **THEN** 调用后端 API 发送邮箱提醒（仅一次）

#### Scenario: 记录已发送状态
- **WHEN** 邮箱提醒成功发送
- **THEN** 更新 Plan 对象的 `lastDelayedNotifyAt` 字段为当前时间戳

#### Scenario: 避免重复发送
- **WHEN** Plan 对象已存在 `lastDelayedNotifyAt` 字段
- **THEN** 不再发送邮箱提醒

#### Scenario: 用户无邮箱时跳过
- **WHEN** 用户未配置邮箱
- **THEN** 跳过邮箱提醒，不影响其他功能
