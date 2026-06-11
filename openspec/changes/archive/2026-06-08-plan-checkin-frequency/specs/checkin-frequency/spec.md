## ADDED Requirements

### Requirement: 打卡频率类型定义
系统 SHALL 支持六种打卡频率模式，通过 `CheckinFrequency` 联合类型定义：
- `daily`：每天打卡（默认）
- `interval`：每 N 天打卡一次
- `weekly`：每周 N 次（不指定哪天）
- `weekly_fixed`：指定星期几打卡
- `monthly`：每月 N 次（不指定哪天）
- `monthly_fixed`：指定每月几号打卡

`PlanItem` SHALL 新增可选字段 `frequency?: CheckinFrequency`，未设置时默认为 `{ mode: 'daily' }`。

#### Scenario: 未设置频率的任务按每天模式处理
- **WHEN** PlanItem 的 frequency 字段为 undefined
- **THEN** 系统按 `{ mode: 'daily' }` 处理，进度 = 已打卡天数 / 总天数

#### Scenario: 设置每周固定频率
- **WHEN** 用户将 PlanItem 的 frequency 设为 `{ mode: 'weekly_fixed', days: [1, 3, 5] }`
- **THEN** 系统仅在周一、周三、周五显示该任务为待打卡项

### Requirement: 进度计算适配频率
系统 SHALL 根据频率模式计算"期望天数"作为进度分母，而非使用总天数。

#### Scenario: 每周 N 次模式的进度计算
- **WHEN** PlanItem 频率为 `{ mode: 'weekly', target: 3 }`，日期范围 4 周，已打卡 6 次
- **THEN** 期望天数 = 4 × 3 = 12，进度 = 6 / 12 = 50%

#### Scenario: 每 N 天模式的进度计算
- **WHEN** PlanItem 频率为 `{ mode: 'interval', every: 3 }`，日期范围 10 天，已打卡 2 次
- **THEN** 期望天数 = floor(10/3) + 1 = 4，进度 = 2 / 4 = 50%

#### Scenario: 进度不超过 100%
- **WHEN** 弹性模式下用户超额完成（如每周 3 次目标打了 5 次）
- **THEN** 进度 SHALL clamp 到 100%

### Requirement: 每日待办根据频率过滤
`getTodayItems` SHALL 根据频率模式决定是否在当天显示该任务。

#### Scenario: 每天模式始终显示
- **WHEN** 任务频率为 daily，今天在日期范围内
- **THEN** 该任务显示在每日待办中

#### Scenario: 每周固定模式只在指定日显示
- **WHEN** 任务频率为 `{ mode: 'weekly_fixed', days: [1, 3, 5] }`，今天是周二
- **THEN** 该任务不显示在每日待办中

#### Scenario: 每周 N 次模式达标后隐藏
- **WHEN** 任务频率为 `{ mode: 'weekly', target: 3 }`，本周已打卡 3 次
- **THEN** 该任务不再显示在每日待办中，直到下个周期

#### Scenario: 每 N 天模式仅周期第一天显示
- **WHEN** 任务频率为 `{ mode: 'interval', every: 3 }`，今天是周期第 2 天且已打卡
- **THEN** 该任务不显示在每日待办中

#### Scenario: 每月固定模式只在指定日期显示
- **WHEN** 任务频率为 `{ mode: 'monthly_fixed', dates: [1, 15] }`，今天是 10 号
- **THEN** 该任务不显示在每日待办中

### Requirement: 不完整周期的期望计算
系统 SHALL 正确处理开始日期不在周期边界的情况。

#### Scenario: 首周不完整时按实际天数计算期望
- **WHEN** 任务 startDate 为周五，频率为 `{ mode: 'weekly', target: 4 }`
- **THEN** 首周（周五~周日）期望 = min(3, 4) = 3 次，后续完整周期望 = 4 次

### Requirement: 任务卡片显示频率摘要
任务卡片进度条下方 SHALL 显示频率摘要信息，daily 模式除外。

#### Scenario: 每周固定模式显示选中日期
- **WHEN** 任务频率为 `{ mode: 'weekly_fixed', days: [1, 3, 5] }`
- **THEN** 进度条下方显示 "📅 一 三 五"，选中日期用主题色高亮

#### Scenario: 每周 N 次模式显示次数和本周进度
- **WHEN** 任务频率为 `{ mode: 'weekly', target: 3 }`，本周已打卡 2 次
- **THEN** 进度条下方显示 "📅 每周 3 次 | 本周 2/3"

#### Scenario: daily 模式不显示摘要
- **WHEN** 任务频率为 `{ mode: 'daily' }` 或未设置频率
- **THEN** 进度条下方不显示频率摘要

### Requirement: 任务级热力图
任务卡片 SHALL 提供可展开的热力图按钮，显示单个任务的打卡记录。

#### Scenario: 展开热力图显示打卡状态
- **WHEN** 用户点击任务卡片的热力图按钮
- **THEN** 展开显示按周排列的网格，已打卡日期为绿色，未打卡日期为灰色，未来日期为空白

#### Scenario: 热力图默认收起
- **WHEN** 任务卡片初始渲染
- **THEN** 热力图默认收起，仅显示展开按钮图标

### Requirement: 频率选择器
创建/编辑任务表单 SHALL 提供频率选择器，用户可选择频率模式并配置参数。

#### Scenario: 选择每周固定模式并配置日期
- **WHEN** 用户在频率选择器中选择"每周固定"并勾选周一、周三、周五
- **THEN** 任务的 frequency 设为 `{ mode: 'weekly_fixed', days: [1, 3, 5] }`

#### Scenario: 选择每 N 天模式并输入间隔
- **WHEN** 用户在频率选择器中选择"间隔"并输入 3
- **THEN** 任务的 frequency 设为 `{ mode: 'interval', every: 3 }`

### Requirement: 编辑规则
系统 SHALL 限制频率字段的编辑权限。

#### Scenario: 未开始任务可修改频率
- **WHEN** 任务状态为 `not_started`
- **THEN** 用户可修改频率字段

#### Scenario: 进行中任务不可编辑
- **WHEN** 任务状态为 `in_progress`
- **THEN** 编辑按钮禁用，用户只能删除任务

#### Scenario: 修改频率后重算进度
- **WHEN** 用户修改了 `not_started` 任务的频率
- **THEN** 系统调用 `refreshPlanItemStats` 重算该任务的进度

### Requirement: 向后兼容
系统 SHALL 兼容未设置频率字段的现有数据。

#### Scenario: 现有任务无频率字段
- **WHEN** 从数据库加载的 PlanItem 没有 frequency 字段
- **THEN** 系统按 `{ mode: 'daily' }` 处理，行为与修改前一致

#### Scenario: 数据库 migration 添加 frequency 列
- **WHEN** 应用升级后首次启动
- **THEN** SQLite migration 添加 `frequency TEXT` 列到 plan_items 表，已有数据 frequency 为 NULL
