## ADDED Requirements

### Requirement: 布局分发
运动中页面 SHALL 根据运动体验类型（meditative/endurance/strength/interval）分发到对应的布局组件。

#### Scenario: 冥想型运动使用沉浸式布局
- **WHEN** 用户进入瑜伽、太极等冥想型运动的 active 阶段
- **THEN** 渲染 MeditativeActive 布局组件

#### Scenario: 耐力型运动使用仪表盘布局
- **WHEN** 用户进入爬楼梯、游泳等耐力型运动的 active 阶段
- **THEN** 渲染 EnduranceActive 布局组件

#### Scenario: 力量型运动使用操作台布局
- **WHEN** 用户进入俯卧撑、深蹲等力量型运动的 active 阶段
- **THEN** 渲染 StrengthActive 布局组件

#### Scenario: 间歇型运动使用混合布局
- **WHEN** 用户进入波比跳、开合跳等间歇型运动的 active 阶段
- **THEN** 渲染 IntervalActive 布局组件

### Requirement: 冥想型布局
MeditativeActive SHALL 以沉浸式呼吸引导为核心，最小化 UI 干扰。

#### Scenario: 呼吸动画为主视觉
- **WHEN** 冥想型运动 active 阶段且呼吸引导开启
- **THEN** 呼吸动画占据屏幕中央主要区域，无 +/- 按钮

#### Scenario: 底栏极简
- **WHEN** 冥想型运动 active 阶段
- **THEN** 底栏仅显示暂停按钮和设置按钮（2 个按钮）

#### Scenario: 无组概念
- **WHEN** 冥想型运动 active 阶段
- **THEN** 不显示组历史、完成组按钮、目标进度条

### Requirement: 耐力型布局
EnduranceActive SHALL 以 Keep 风格数据仪表盘展示多项运动指标。

#### Scenario: 数据网格布局
- **WHEN** 耐力型运动 active 阶段
- **THEN** 主交互区以 1+2+2 网格展示：总消耗（单列居中）、总时长+爬升高度（双列）、层数+实时心率（双列）

#### Scenario: 缺失数据显示为 0
- **WHEN** 耐力型运动的某项数据无数据源
- **THEN** 对应字段显示 "0" 或 "--"

#### Scenario: 底栏 3 按钮
- **WHEN** 耐力型运动 active 阶段
- **THEN** 底栏显示停止（红色大圆）、继续（绿色大圆）、设置（灰色小圆）3 个按钮

#### Scenario: 无 +/- 按钮
- **WHEN** 耐力型运动 active 阶段
- **THEN** 主交互区不显示 +1/-1 操作按钮

### Requirement: 力量型布局
StrengthActive SHALL 以次数操作台为核心，支持组管理和目标追踪。

#### Scenario: 主数字+操作按钮
- **WHEN** 力量型运动 active 阶段
- **THEN** 主交互区居中显示当前组次数（特大号）、+/-1/+5 按钮、完成本组按钮

#### Scenario: 组历史卡片
- **WHEN** 力量型运动 active 阶段且已完成至少 1 组
- **THEN** 显示最近 3 组的迷你卡片

#### Scenario: 目标进度条
- **WHEN** 力量型运动 active 阶段且设置了目标
- **THEN** 显示目标进度条和完成/目标数值

#### Scenario: 底栏信息+操作
- **WHEN** 力量型运动 active 阶段
- **THEN** 底栏显示运动时长、暂停按钮、卡路里

### Requirement: 间歇型布局
IntervalActive SHALL 在力量型布局基础上增加嵌入式休息功能。

#### Scenario: 嵌入式休息条
- **WHEN** 间歇型运动完成一组后进入休息
- **THEN** 主交互区内显示休息倒计时进度条和跳过按钮，不使用全屏遮罩

#### Scenario: 操作按钮同力量型
- **WHEN** 间歇型运动 active 阶段（非休息状态）
- **THEN** 主交互区显示同力量型的主数字+操作按钮

### Requirement: Hooks 提取
运动中页面的业务逻辑 SHALL 提取到独立的自定义 hook 文件中。

#### Scenario: useExerciseTimer
- **WHEN** 任意布局组件需要计时器功能
- **THEN** 通过 useExerciseTimer hook 获取秒表状态和启停操作

#### Scenario: useExerciseAudio
- **WHEN** 任意布局组件需要音效功能
- **THEN** 通过 useExerciseAudio hook 获取音效播放控制和选择状态

#### Scenario: useExerciseRest
- **WHEN** 力量型或间歇型布局需要休息功能
- **THEN** 通过 useExerciseRest hook 获取休息倒计时和自动跳转逻辑

#### Scenario: useExerciseSets
- **WHEN** 力量型或间歇型布局需要组管理功能
- **THEN** 通过 useExerciseSets hook 获取组列表、当前次数、完成组操作

#### Scenario: useExerciseTargets
- **WHEN** 任意布局需要目标和进度功能
- **THEN** 通过 useExerciseTargets hook 获取目标进度、软目标、里程碑状态
