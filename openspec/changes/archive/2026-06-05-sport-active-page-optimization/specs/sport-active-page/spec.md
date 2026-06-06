## ADDED Requirements

### Requirement: 三区布局
非GPS运动中页面 SHALL 分为三个视觉区域：顶部状态栏、主交互区、底部操作区。

#### Scenario: 顶部状态栏显示运动信息
- **WHEN** 用户进入非GPS运动的 active 阶段
- **THEN** 顶部显示运动图标、运动名称、音效控制按钮

#### Scenario: 主交互区居中显示核心内容
- **WHEN** 用户进入非GPS运动的 active 阶段
- **THEN** 主交互区垂直居中显示主数字和控制按钮

#### Scenario: 底部操作区显示时长和暂停
- **WHEN** 用户进入非GPS运动的 active 阶段
- **THEN** 底部操作区显示运动时长、暂停按钮和卡路里

### Requirement: 移除 MET 显示
非GPS运动中页面 SHALL 不再显示 MET 值。

#### Scenario: 不显示 MET
- **WHEN** 用户进入非GPS运动的 active 阶段
- **THEN** 页面上不出现 MET 数值和标签

### Requirement: 去重卡路里
卡路里 SHALL 仅在底部操作区显示，不在主交互区重复显示。

#### Scenario: 主区不显示卡路里
- **WHEN** 用户进入非GPS运动的 active 阶段
- **THEN** 主交互区不显示卡路里数值

#### Scenario: 底部栏显示卡路里
- **WHEN** 用户进入非GPS运动的 active 阶段
- **THEN** 底部操作区右侧显示卡路里数值

### Requirement: Repetition 长按连续加减
Repetition 类型运动 SHALL 支持长按 +1/-1 按钮实现连续加减。

#### Scenario: 长按 +1 连续增加
- **WHEN** 用户长按 +1 按钮超过 200ms
- **THEN** 每 150ms 自动增加一次次数，2 秒后加速到每 50ms 一次

#### Scenario: 长按 -1 连续减少
- **WHEN** 用户长按 -1 按钮超过 200ms
- **THEN** 每 150ms 自动减少一次次数，不低于 0

#### Scenario: 短按仍为单次触发
- **WHEN** 用户短按（< 200ms）+1 或 -1 按钮
- **THEN** 仅触发一次加减操作

### Requirement: 完成组触觉反馈
完成一组运动时 SHALL 触发触觉反馈。

#### Scenario: 完成组时 haptic
- **WHEN** 用户点击"完成本组"按钮
- **THEN** 触发中等强度的触觉反馈（ImpactFeedbackStyle.Medium）

### Requirement: Timed 倒计时显示
Timed 类型运动在目标模式下 SHALL 主显示倒计时。

#### Scenario: 目标模式倒计时
- **WHEN** Timed 运动处于目标模式（有目标时间）
- **THEN** 主显示区显示剩余分钟数（倒计时），下方显示已用时间

#### Scenario: 自由模式正计时
- **WHEN** Timed 运动处于自由模式（无目标时间）
- **THEN** 主显示区显示已用分钟数（正计时）

### Requirement: 目标进度始终可见
目标进度条 SHALL 在有目标时始终可见。

#### Scenario: 目标模式进度条
- **WHEN** 用户设置了运动目标
- **THEN** 主交互区下方始终显示目标进度条和完成/目标数值

### Requirement: 组历史小卡片
主交互区 SHALL 显示最近完成的组信息。

#### Scenario: 显示最近 3 组
- **WHEN** 用户完成了至少 1 组运动
- **THEN** 主交互区下方显示最近 3 组的迷你卡片（组号和次数）

#### Scenario: 超过 3 组省略
- **WHEN** 用户完成了超过 3 组运动
- **THEN** 显示最近 3 组 + `+N` 省略标记

### Requirement: 环境音效
运动中 SHALL 支持播放背景环境音效。

#### Scenario: 选择环境音
- **WHEN** 用户在顶部状态栏点击音效图标
- **THEN** 展开音效选择面板，显示可用音效列表

#### Scenario: 播放环境音
- **WHEN** 用户选择一个环境音效
- **THEN** 以 0.2-0.3 音量循环播放该音效

#### Scenario: 停止环境音
- **WHEN** 用户选择"无"或再次点击当前音效
- **THEN** 停止播放环境音

#### Scenario: 默认音效
- **WHEN** 用户进入瑜伽/太极等冥想型运动
- **THEN** 默认播放上次选择的环境音（如无记录则不播放）

### Requirement: 呼吸引导（冥想型运动）
瑜伽、太极等冥想型运动 SHALL 提供呼吸引导功能。

#### Scenario: 呼吸引导动画
- **WHEN** 用户进入冥想型运动且呼吸引导开启
- **THEN** 主交互区显示呼吸动画：外圈缩放 + 文字提示（吸气/屏住/呼气）

#### Scenario: 呼吸引导音效
- **WHEN** 呼吸引导开启且切换阶段
- **THEN** 播放提示音（吸气: 钵声，呼气: 钟声）

#### Scenario: 呼吸节奏
- **WHEN** 呼吸引导运行中
- **THEN** 按 4-4-4 节奏循环（吸气 4s → 屏息 4s → 呼气 4s）

#### Scenario: 呼吸周期指示
- **WHEN** 呼吸引导运行中
- **THEN** 显示 4 个圆点指示当前呼吸阶段

#### Scenario: 关闭呼吸引导
- **WHEN** 用户在准备页关闭呼吸引导开关
- **THEN** active 页面不显示呼吸动画和引导音

### Requirement: 软目标系统
自由模式 SHALL 显示基于历史数据的运动推荐。

#### Scenario: 显示软目标
- **WHEN** 用户在自由模式下开始运动
- **THEN** 主交互区显示推荐时长或次数（如 "💡 建议 30 分钟"）

#### Scenario: 软目标进度
- **WHEN** 用户在自由模式下运动
- **THEN** 显示柔和进度条，表示完成软目标的百分比

#### Scenario: 软目标达成
- **WHEN** 用户达到软目标
- **THEN** 显示 "✓ 达标" 文字 + 轻触觉反馈

#### Scenario: 软目标超越
- **WHEN** 用户超越软目标
- **THEN** 显示 "🔥 超额完成！" 文字 + 鼓励文案

#### Scenario: 软目标数据来源
- **WHEN** 系统计算软目标值
- **THEN** 优先使用用户历史平均值（最近 5 次），其次使用运动推荐表

### Requirement: 里程碑激励
运动中 SHALL 在关键节点显示激励文案。

#### Scenario: 次数里程碑
- **WHEN** Repetition 运动累计次数达到 10/50/100
- **THEN** 显示对应激励文案（"双位数！继续 💪" / "半百达成！🔥" / "百次俱乐部！🏆"）

#### Scenario: 时间里程碑
- **WHEN** 运动时长达到 10/30 分钟
- **THEN** 显示对应激励文案

#### Scenario: 里程碑触觉反馈
- **WHEN** 达到任意里程碑
- **THEN** 触发轻触觉反馈

### Requirement: 休息页面环形倒计时
力量型运动休息页面 SHALL 使用环形进度显示倒计时。

#### Scenario: 环形倒计时
- **WHEN** 用户完成一组后进入休息状态
- **THEN** 页面显示环形倒计时进度，中心显示剩余秒数

#### Scenario: 显示上一组和下一组信息
- **WHEN** 用户处于休息状态
- **THEN** 环形倒计时下方显示上一组完成的次数和下一组目标次数

#### Scenario: 跳过休息
- **WHEN** 用户点击跳过按钮
- **THEN** 立即结束休息，进入下一组

### Requirement: 间歇型嵌入式休息
间歇型运动（波比跳、开合跳等）SHALL 使用嵌入式休息而非全屏遮罩。

#### Scenario: 嵌入式休息显示
- **WHEN** 间歇型运动完成一组后进入休息
- **THEN** 主交互区内显示休息倒计时进度条和下一组目标，不使用全屏遮罩

#### Scenario: 嵌入式休息结束
- **WHEN** 嵌入式休息倒计时结束
- **THEN** 自动进入下一组准备状态

### Requirement: 暂停长按直接结束
暂停按钮 SHALL 支持长按直接结束运动。

#### Scenario: 短按暂停
- **WHEN** 用户短按暂停按钮
- **THEN** 进入暂停页面（现有行为不变）

#### Scenario: 长按结束
- **WHEN** 用户长按暂停按钮超过 800ms
- **THEN** 弹出结束确认对话框，确认后直接跳转运动报告页

### Requirement: 目标达成庆祝
完成目标时 SHALL 显示庆祝动画。

#### Scenario: 目标达成动画
- **WHEN** 用户完成设定的运动目标（次数/时间/组数）
- **THEN** 显示简短的庆祝动画效果（缩放+颜色变化）

### Requirement: 暂停页增强
暂停页面 SHALL 显示运动数据摘要并提供直接操作按钮。

#### Scenario: 显示运动摘要
- **WHEN** 用户进入暂停页面
- **THEN** 显示当前运动时长、完成次数/组数、消耗卡路里

#### Scenario: 直接结束按钮
- **WHEN** 用户在暂停页面
- **THEN** 显示直接可用的结束按钮（无需长按）

#### Scenario: 退出按钮
- **WHEN** 用户在暂停页面
- **THEN** 显示退出按钮（不保存数据直接退出）

#### Scenario: 音效控制
- **WHEN** 用户在暂停页面
- **THEN** 显示当前音效名称，点击可切换
