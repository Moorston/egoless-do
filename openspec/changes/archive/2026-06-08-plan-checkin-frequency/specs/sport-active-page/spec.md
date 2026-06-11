## MODIFIED Requirements

### Requirement: 运动任务展示适配频率过滤
运动页面展示的计划任务 SHALL 根据任务的打卡频率决定是否显示。当运动任务设置了非 daily 频率时，仅在需要打卡的日期显示。

#### Scenario: 运动任务设置每周三次
- **WHEN** 运动关联的 PlanItem 频率为 `{ mode: 'weekly', target: 3 }`，本周已达标
- **THEN** 运动页面不显示该任务的打卡入口

#### Scenario: 运动任务设置每周固定日期
- **WHEN** 运动关联的 PlanItem 频率为 `{ mode: 'weekly_fixed', days: [1, 3, 5] }`，今天是周二
- **THEN** 运动页面不显示该任务的打卡入口
