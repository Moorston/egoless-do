## ADDED Requirements

### Requirement: 布局分层展示
系统 SHALL 将脉络详情页分为紧凑 Header 区和 Segment 切换的内容区。Header 整合命名、日期范围、感念/笔记数。内容区通过 Tab 切换 Timeline / 洞察 / 复盘 / 任务。

#### Scenario: 默认展示 Timeline
- **WHEN** 用户进入脉络详情页
- **THEN** 默认显示 Timeline Tab，其他 Tab 可点击切换

#### Scenario: Tab 切换保留滚动位置
- **WHEN** 用户在 Timeline 中滚动后切换到洞察 Tab
- **THEN** 再切回 Timeline 时恢复之前滚动位置

### Requirement: Overview 与 Header 合并
系统 SHALL 将 TrailOverviewCard 的信息（感念数、笔记数、日期范围、天数、心情变化）整合到 Header 区域，以紧凑的一行或多行展示。

#### Scenario: Header 展示概要信息
- **WHEN** 用户进入详情页
- **THEN** Header 下方显示 "12 感念 · 5 笔记 · 164 天 · 😊→🌿→😰"
