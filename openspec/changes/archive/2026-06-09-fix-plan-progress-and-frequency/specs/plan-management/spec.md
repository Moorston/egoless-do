## MODIFIED Requirements

### Requirement: Task progress calculation

系统 SHALL 计算任务进度为 `完成天数 / 预期天数 * 100`，其中完成天数按唯一日期去重计算。

#### Scenario: Normal progress calculation

- **WHEN** 任务频率为"每天"，时间范围为 6月2日~6月18日，今天为 6月9日
- **THEN** 预期天数为 8（6月2日到6月9日，包含两端）

#### Scenario: Progress with duplicate checkins

- **WHEN** 任务在同一天有多条打卡记录（done=true）
- **THEN** 系统 SHALL 只计算一次该日期，不重复计入完成天数

#### Scenario: Progress with no checkins

- **WHEN** 任务没有任何打卡记录
- **THEN** 进度为 0%

#### Scenario: Progress cap at 100%

- **WHEN** 完成天数超过预期天数
- **THEN** 进度 SHALL 封顶为 100%

### Requirement: Frequency selector title

频率选择器的标题 SHALL 显示"打卡频率"而非"每天"。

#### Scenario: Frequency selector display

- **WHEN** 用户打开计划创建/编辑页面
- **THEN** 频率选择器区域的标题显示"打卡频率"

### Requirement: Frequency input interaction

频率配置的 input 框 SHALL 允许用户删除数字后输入新值。

#### Scenario: Delete and type new value

- **WHEN** 用户在 interval 模式的 input 框中删除数字
- **THEN** input 框保持为空，不自动填充 1

#### Scenario: Blur with empty value

- **WHEN** 用户在 input 框中删除数字后失焦
- **THEN** 系统 SHALL 自动填充为 1

#### Scenario: Enter valid value

- **WHEN** 用户在 input 框中输入数字 5
- **THEN** 频率更新为每 5 天
