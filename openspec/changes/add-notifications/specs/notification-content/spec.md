## ADDED Requirements

### Requirement: 通知内容生成
系统 SHALL 基于用户习惯和计划生成个性化的通知内容。

#### Scenario: 基于习惯生成内容
- **WHEN** 系统为某个习惯创建通知
- **THEN** 通知标题包含习惯名称，正文包含激励性提醒

#### Scenario: 基于计划生成内容
- **WHEN** 系统为某个计划任务创建通知
- **THEN** 通知标题包含计划名称，正文包含任务描述

### Requirement: 通知内容个性化
系统 SHALL 根据用户历史行为调整通知内容。

#### Scenario: 基于打卡频率调整
- **WHEN** 用户最近打卡频率较低
- **THEN** 系统生成更鼓励性的通知内容

#### Scenario: 基于完成情况调整
- **WHEN** 用户连续完成习惯
- **THEN** 系统生成祝贺性通知内容

### Requirement: 通知内容本地化
系统 SHALL 支持中文通知内容。

#### Scenario: 中文通知内容
- **WHEN** 系统生成通知内容
- **THEN** 内容使用简体中文，符合本地化习惯

#### Scenario: 通知内容格式
- **WHEN** 系统生成通知
- **THEN** 标题不超过20字符，正文不超过100字符

### Requirement: 通知内容模板
系统 SHALL 提供预设的通知内容模板。

#### Scenario: 使用预设模板
- **WHEN** 系统生成通知内容
- **THEN** 从预设模板中选择合适的内容

#### Scenario: 模板变量替换
- **WHEN** 模板包含变量（如 {habitName}）
- **THEN** 系统替换为实际值

### Requirement: 通知内容缓存
系统 SHALL 缓存生成的通知内容以提高性能。

#### Scenario: 缓存通知内容
- **WHEN** 系统生成通知内容
- **THEN** 将内容缓存到本地存储

#### Scenario: 使用缓存内容
- **WHEN** 需要相同的通知内容
- **THEN** 系统从缓存读取，避免重复生成
