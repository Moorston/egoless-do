## MODIFIED Requirements

### Requirement: 感念卡片视觉设计

感念卡片 SHALL 使用新的视觉设计风格。

#### Scenario: 柔和渐变背景
- **WHEN** 显示感念卡片
- **THEN** 使用降低饱和度 10-15% 的渐变色作为背景

#### Scenario: 标签药丸样式
- **WHEN** 显示感念标签
- **THEN** 标签显示为药丸样式（圆角 12，背景色半透明）

#### Scenario: 内容限制显示
- **WHEN** 感念内容超过 3 行
- **THEN** 只显示前 3 行，末尾显示 "..."，点击可展开

#### Scenario: 阴影层次感
- **WHEN** 显示感念卡片
- **THEN** 卡片有轻微阴影（0 2 8 rgba(0,0,0,0.08)）

#### Scenario: 置顶徽章
- **WHEN** 感念已置顶
- **THEN** 显示置顶徽章图标

#### Scenario: 计划关联徽章
- **WHEN** 感念关联了计划任务
- **THEN** 显示计划关联徽章

### Requirement: 日期分组时间轴

日期分组 SHALL 使用时间轴样式。

#### Scenario: 左侧大数字
- **WHEN** 显示日期分组
- **THEN** 左侧显示日期的天数（大字体）

#### Scenario: 右侧详情
- **WHEN** 显示日期分组
- **THEN** 右侧显示完整日期、星期、感念数量

#### Scenario: 竖线连接
- **WHEN** 显示日期分组下的卡片
- **THEN** 使用竖线连接日期和卡片
