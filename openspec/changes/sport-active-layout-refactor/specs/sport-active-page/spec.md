## MODIFIED Requirements

### Requirement: 三区布局
非GPS运动中页面 SHALL 分为三个视觉区域：顶部状态栏、主交互区、底部操作区。每个视觉区域的具体内容和交互方式由运动体验类型决定。

#### Scenario: 顶部状态栏显示运动信息
- **WHEN** 用户进入非GPS运动的 active 阶段
- **THEN** 顶部显示运动图标、运动名称、目标信息、音效控制按钮

#### Scenario: 主交互区内容由布局类型决定
- **WHEN** 用户进入非GPS运动的 active 阶段
- **THEN** 主交互区根据体验类型显示不同内容（呼吸引导/数据仪表盘/次数操作台/操作台+休息条）

#### Scenario: 底部操作区按钮由布局类型决定
- **WHEN** 用户进入非GPS运动的 active 阶段
- **THEN** 底部操作区根据体验类型显示不同按钮组合（冥想型2按钮/耐力型3按钮/力量型和间歇型信息+操作混合）

### Requirement: 暂停长按直接结束
暂停按钮 SHALL 支持长按直接结束运动。耐力型运动使用独立的停止按钮替代长按交互。

#### Scenario: 短按暂停（力量型/间歇型/冥想型）
- **WHEN** 用户短按暂停按钮
- **THEN** 进入暂停页面（现有行为不变）

#### Scenario: 长按结束（力量型/间歇型/冥想型）
- **WHEN** 用户长按暂停按钮超过 800ms
- **THEN** 弹出结束确认对话框，确认后直接跳转运动报告页

#### Scenario: 停止按钮（耐力型）
- **WHEN** 用户点击耐力型布局的停止按钮
- **THEN** 弹出结束确认对话框，确认后跳转运动报告页

## REMOVED Requirements

### Requirement: 移除 MET 显示
**Reason**: 已在 sport-active-page-optimization 变更中移除，此 requirement 不再需要跟踪
**Migration**: 无需迁移，MET 已从代码中移除

### Requirement: 去重卡路里
**Reason**: 已在 sport-active-page-optimization 变更中实现，此 requirement 不再需要跟踪
**Migration**: 无需迁移，卡路里已在底部操作区单一显示
