## ADDED Requirements

### Requirement: 历史记录手风琴模式
历史记录 SHALL 显示全部日期，默认只展开最近一天的明细，其他日期折叠。

#### Scenario: 默认状态
- **WHEN** 用户进入 todo tab
- **THEN** 最近一天的历史记录展开显示明细项，其他日期折叠只显示日期头部（日期 + 完成数）

#### Scenario: 展开折叠日期
- **WHEN** 用户点击折叠的日期行
- **THEN** 该日期展开显示明细项，箭头图标从 ChevronRight 变为 ChevronDown

#### Scenario: 收起展开日期
- **WHEN** 用户点击已展开的日期行
- **THEN** 该日期收起，明细项隐藏，箭头图标从 ChevronDown 变为 ChevronRight

#### Scenario: 多天同时展开
- **WHEN** 用户展开多个日期
- **THEN** 所有已展开的日期都显示明细项

### Requirement: 手风琴头部样式
折叠态的日期行 SHALL 保留原有 timeline 卡片的头部样式。

#### Scenario: 折叠态显示
- **WHEN** 日期处于折叠状态
- **THEN** 显示日期、完成数、ChevronRight 箭头，不显示明细项列表

#### Scenario: 展开态显示
- **WHEN** 日期处于展开状态
- **THEN** 显示日期、完成数、ChevronDown 箭头，以及明细项列表

### Requirement: 历史统计摘要
历史统计摘要卡片 SHALL 保持不变。

#### Scenario: 摘要卡片显示
- **WHEN** 有历史记录
- **THEN** 显示总天数和总完成数的统计摘要卡片
