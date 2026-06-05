## ADDED Requirements

### Requirement: 独立统计页面

系统 SHALL 提供独立的感念统计页面。

#### Scenario: 进入统计页面
- **WHEN** 用户在感念页面点击统计按钮
- **THEN** 导航到独立的感念统计页面

#### Scenario: 返回感念页面
- **WHEN** 用户在统计页面点击返回按钮
- **THEN** 导航回感念页面

### Requirement: 总览卡片

系统 SHALL 在统计页面顶部显示总览卡片。

#### Scenario: 显示总感念数
- **WHEN** 用户进入统计页面
- **THEN** 显示总感念数量

#### Scenario: 显示连续天数
- **WHEN** 用户进入统计页面
- **THEN** 显示连续写作天数

#### Scenario: 显示本周数量
- **WHEN** 用户进入统计页面
- **THEN** 显示本周新增感念数量

#### Scenario: 显示本月数量
- **WHEN** 用户进入统计页面
- **THEN** 显示本月新增感念数量

### Requirement: 趋势 Tab

系统 SHALL 在趋势 Tab 显示写作频率折线图。

#### Scenario: 显示近 30 天趋势
- **WHEN** 用户切换到趋势 Tab
- **THEN** 显示近 30 天的写作频率折线图

#### Scenario: 显示具体数值
- **WHEN** 用户点击折线图上的点
- **THEN** 显示该日期的具体感念数量

### Requirement: 热力图 Tab

系统 SHALL 在热力图 Tab 显示 GitHub 风格的写作热力图。

#### Scenario: 显示最近 20 周热力图
- **WHEN** 用户切换到热力图 Tab
- **THEN** 显示最近 20 周的写作热力图

#### Scenario: 颜色深浅表示数量
- **WHEN** 查看热力图
- **THEN** 颜色深浅表示当天感念数量

#### Scenario: 显示图例
- **WHEN** 查看热力图
- **THEN** 显示"少"到"多"的颜色图例

### Requirement: 心情 Tab

系统 SHALL 在心情 Tab 显示情感趋势和分布。

#### Scenario: 显示情感趋势
- **WHEN** 用户切换到心情 Tab
- **THEN** 显示近 30 天的情感趋势折线图

#### Scenario: 显示心情分布
- **WHEN** 用户切换到心情 Tab
- **THEN** 显示心情分布饼图或柱状图

### Requirement: 标签 Tab

系统 SHALL 在标签 Tab 显示标签使用统计。

#### Scenario: 显示标签云
- **WHEN** 用户切换到标签 Tab
- **THEN** 显示标签云，字体大小表示使用频率

#### Scenario: 显示使用频率排行
- **WHEN** 用户切换到标签 Tab
- **THEN** 显示标签使用频率排行榜
