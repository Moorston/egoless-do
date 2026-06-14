## ADDED Requirements

### Requirement: 卡片信息层次优化
复盘笔记卡片 SHALL 以引导问题作为标题，日期+时间+来源作为副标题。

#### Scenario: 引导式笔记显示引导问题为标题
- **WHEN** 笔记的 source 为 'guided' 且有 guidedQuestion
- **THEN** 卡片第一行显示引导问题（加粗），副标题显示日期+时间+来源

#### Scenario: 自由反思显示默认标题
- **WHEN** 笔记的 source 为 'free'
- **THEN** 卡片第一行显示「自由反思」（加粗），副标题显示日期+时间+来源

### Requirement: 左侧彩色边框区分类型
复盘笔记卡片 SHALL 通过左侧边框颜色区分引导式和自由反思。

#### Scenario: 引导式笔记边框颜色
- **WHEN** 笔记的 source 为 'guided'
- **THEN** 左侧 3px 边框使用主题主色

#### Scenario: 自由反思笔记边框颜色
- **WHEN** 笔记的 source 为 'free'
- **THEN** 左侧 3px 边框使用绿色 #10B981

### Requirement: 标签 pill 样式
复盘笔记卡片的标签 SHALL 使用 pill 圆角背景样式。

#### Scenario: 标签显示样式
- **WHEN** 笔记有 tags
- **THEN** 每个标签显示为 pill 样式（浅色填充背景 + 圆角 + 深色文字）

### Requirement: 长按菜单交互
复盘笔记卡片 SHALL 通过长按弹出操作菜单，替代常驻删除按钮。

#### Scenario: 长按弹出菜单
- **WHEN** 用户长按卡片
- **THEN** 弹出操作菜单，包含编辑、复制、删除三个选项

#### Scenario: 删除需确认
- **WHEN** 用户在菜单中选择删除
- **THEN** 弹出确认对话框，确认后删除笔记

### Requirement: 展开收起提示
复盘笔记卡片 SHALL 在内容截断时显示展开提示。

#### Scenario: 截断时显示展开提示
- **WHEN** 内容超过 2 行且处于收起状态
- **THEN** 内容末尾显示「展开 ▾」

#### Scenario: 展开后显示收起提示
- **WHEN** 卡片处于展开状态
- **THEN** 内容底部显示「收起 ▴」

### Requirement: 编辑功能
复盘笔记卡片 SHALL 支持通过长按菜单进入编辑模式。

#### Scenario: 进入编辑模式
- **WHEN** 用户在长按菜单中选择编辑
- **THEN** 卡片原地展开内联编辑区，包含内容输入框、标签编辑、心情选择器

#### Scenario: 保存编辑
- **WHEN** 用户在编辑模式点击保存
- **THEN** 调用 updateTrailNote 更新笔记，退出编辑模式

#### Scenario: 取消编辑
- **WHEN** 用户在编辑模式点击取消
- **THEN** 丢弃修改，退出编辑模式
