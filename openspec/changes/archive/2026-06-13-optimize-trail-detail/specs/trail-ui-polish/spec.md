## ADDED Requirements

### Requirement: FAB 弹簧动画
系统 SHALL 在 FAB 菜单展开/收起时使用弹簧动画。

#### Scenario: 展开动画
- **WHEN** 用户点击 FAB
- **THEN** 菜单项以弹簧动画依次弹出，FAB 图标旋转 45° 变为 ✕

### Requirement: AI 加载骨架屏
系统 SHALL 在 AI 生成洞察/复盘时使用骨架屏动画代替纯文字 loading。

#### Scenario: 骨架屏展示
- **WHEN** AI 洞察正在生成
- **THEN** 显示与结果区域相同尺寸的骨架屏占位动画

### Requirement: 感念滑动删除
系统 SHALL 支持在 TimelineList 中滑动感念卡片显示删除按钮。

#### Scenario: 滑动删除感念
- **WHEN** 用户在感念卡片上向左滑动
- **THEN** 显示红色删除按钮，点击后确认从脉络移除

### Requirement: 脉络标题行内编辑
系统 SHALL 支持直接点击标题进入编辑状态，无需弹出 Modal。

#### Scenario: 行内编辑标题
- **WHEN** 用户点击 Header 中的脉络标题
- **THEN** 标题变为可编辑的 TextInput

### Requirement: 下拉刷新重新生成
系统 SHALL 支持在 Timeline 下拉刷新时重新生成 AI 洞察和复盘。

#### Scenario: 下拉刷新
- **WHEN** 用户在 Timeline 区域下拉
- **THEN** 若已有 AI 洞察/复盘缓存，触发重新生成

### Requirement: 空态引导
系统 SHALL 在 Timeline 无内容时显示引导创建提示和推荐感念。

#### Scenario: 空态展示
- **WHEN** 脉络中感念和笔记都为空
- **THEN** 显示 "还没有内容" 引导文案和"添加感念"按钮
