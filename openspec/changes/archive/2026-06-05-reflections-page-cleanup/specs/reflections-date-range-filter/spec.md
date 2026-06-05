## ADDED Requirements

### Requirement: 日期范围快捷预设
FilterDrawer SHALL 提供日期范围快捷预设按钮，用户点击即可按时间范围筛选感念。

#### Scenario: 显示预设按钮
- **WHEN** 用户打开 FilterDrawer
- **THEN** "更多筛选"区域显示 4 个日期预设按钮：本周、本月、近7天、近30天

#### Scenario: 应用日期范围预设
- **WHEN** 用户点击"本周"预设按钮
- **THEN** 系统将 `dateRange` 设为本周一 00:00 至当前时间，并应用筛选

#### Scenario: 取消日期范围预设
- **WHEN** 用户再次点击已激活的预设按钮
- **THEN** 系统清除 `dateRange` 筛选条件

#### Scenario: 日期范围预设互斥
- **WHEN** 用户点击"本月"按钮（此前已点击"本周"）
- **THEN** 系统将 `dateRange` 切换为本月1日 00:00 至当前时间

#### Scenario: 日期范围与其他筛选条件组合
- **WHEN** 用户同时启用日期范围预设和标签筛选
- **THEN** 结果为同时满足两个条件的感念（AND 关系）
