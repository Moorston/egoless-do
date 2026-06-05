## ADDED Requirements

### Requirement: 滑动手势切换日期
用户在首页全屏区域左右滑动可切换查看日期。左滑查看前一天，右滑查看后一天。手势 SHALL 与 ScrollView 垂直滚动共存，水平滑动超过 20px 阈值才激活。

#### Scenario: 左滑查看前一天
- **WHEN** 用户在首页向左滑动超过 50px 或水平速度超过 500px/s
- **THEN** viewDate 变为前一天，页面显示该天的打卡数据

#### Scenario: 右滑查看后一天
- **WHEN** 用户在首页向右滑动超过 50px 或水平速度超过 500px/s
- **THEN** viewDate 变为后一天，页面显示该天的打卡数据

#### Scenario: 到达今天后禁用右滑
- **WHEN** viewDate 已是今天，用户尝试右滑
- **THEN** 手势不生效，viewDate 保持不变

#### Scenario: 垂直滚动不触发日期切换
- **WHEN** 用户垂直滑动超过 10px
- **THEN** 手势失败，ScrollView 正常滚动

### Requirement: 顶部日期条
首页 ScrollView 顶部 SHALL 显示日期条，展示当前查看日期。日期条包含左右箭头导航按钮。

#### Scenario: 日期条显示格式
- **WHEN** 用户查看非今天的日期
- **THEN** 日期条显示格式为 "M月D日 · 周X"，如 "6月3日 · 周二"

#### Scenario: 今天日期显示
- **WHEN** viewDate 是今天
- **THEN** 日期条显示 "M月D日 · 周X · 今天"

#### Scenario: 左箭头导航
- **WHEN** 用户点击日期条左箭头
- **THEN** viewDate 变为前一天

#### Scenario: 右箭头导航（今天时禁用）
- **WHEN** viewDate 是今天，用户点击右箭头
- **THEN** 无响应，右箭头显示为 disabled 状态（opacity 0.3）

### Requirement: 快捷回跳今天
当 viewDate 不是今天时，日期条右侧 SHALL 显示 "今天" 按钮，点击后 viewDate 直接跳回今天。

#### Scenario: 点击"今天"按钮
- **WHEN** 用户在历史日期查看模式下点击"今天"按钮
- **THEN** viewDate 立即变为今天，页面恢复可编辑状态

#### Scenario: 今天模式下不显示
- **WHEN** viewDate 是今天
- **THEN** "今天"按钮不显示

### Requirement: 浮动气泡回跳
当用户在历史日期查看模式下滚动超过 Banner 高度时，右下角 SHALL 显示浮动气泡按钮，点击后跳回今天。

#### Scenario: 滚动后显示气泡
- **WHEN** viewDate 不是今天，且用户向下滚动超过 200px
- **THEN** 右下角淡入显示浮动气泡

#### Scenario: 滚动回顶部隐藏气泡
- **WHEN** 用户滚动回顶部（偏移 < 200px）
- **THEN** 浮动气泡淡出隐藏

#### Scenario: 今天模式不显示气泡
- **WHEN** viewDate 是今天
- **THEN** 浮动气泡始终不显示

### Requirement: 历史日期只读模式
当 viewDate 不是今天时，首页所有打卡交互组件 SHALL 进入只读状态，不可编辑。

#### Scenario: 修行记录只读
- **WHEN** 用户查看历史日期
- **THEN** 打坐/站桩/诵经显示已完成/未完成状态（Check/X 图标），不可点击切换

#### Scenario: 习惯打卡只读
- **WHEN** 用户查看历史日期
- **THEN** 习惯列表显示该天的完成状态，不可点击

#### Scenario: 隐藏提交按钮
- **WHEN** 用户查看历史日期
- **THEN** 提交打卡按钮、编辑按钮、+添加饮食入口均不显示

#### Scenario: 体重/步数只读
- **WHEN** 用户查看历史日期
- **THEN** 体重显示该天记录值（如有），步数显示"--"

### Requirement: 历史数据恢复
历史日期的打卡数据 SHALL 从 checkinHistory 的 note JSON 中恢复，包括 practices、habits、food、water、note 字段。

#### Scenario: 从 note JSON 恢复修行记录
- **WHEN** viewDate 对应的 checkinEntry.note 包含 practices 数组
- **THEN** 修行记录卡片显示对应的完成状态

#### Scenario: 从 note JSON 恢复饮食数据
- **WHEN** viewDate 对应的 checkinEntry.note 包含 food 字段
- **THEN** 饮食卡片显示该天的总卡路里

#### Scenario: 从 note JSON 恢复饮水数据
- **WHEN** viewDate 对应的 checkinEntry.note 包含 water 字段
- **THEN** 饮水数据显示该天的饮水量

#### Scenario: 无记录日期显示空状态
- **WHEN** checkinHistory 中没有 viewDate 对应的记录
- **THEN** 页面显示"未打卡"空状态提示

### Requirement: 日期条样式
日期条高度 SHALL 为 48px，背景色与页面卡片一致（TH.card），底部有细分隔线。

#### Scenario: 日期条视觉一致性
- **WHEN** 用户在浅色/深色主题下查看
- **THEN** 日期条背景色、文字颜色跟随主题适配

#### Scenario: "今天"按钮样式
- **WHEN** "今天"按钮显示时
- **THEN** 按钮为圆角药丸形状，背景色为主题 primary 色，文字白色
