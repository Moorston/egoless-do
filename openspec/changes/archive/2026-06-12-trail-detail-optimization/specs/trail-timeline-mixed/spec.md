## ADDED Requirements

### Requirement: 时间线混排展示

系统 SHALL 在脉络详情页的时间线中混排展示普通感念和脉络感念，按 `createdAt` 时间排序。

#### Scenario: 混排排序
- **WHEN** 脉络中同时存在普通感念和脉络感念
- **THEN** 所有条目按 `createdAt` 升序排列
- **THEN** 普通感念和脉络感念在时间线中交替出现（按时间自然排列）

#### Scenario: 视觉区分
- **WHEN** 时间线渲染普通感念
- **THEN** 使用实线圆点、渐变色背景、📝 图标
- **WHEN** 时间线渲染脉络感念
- **THEN** 使用空心圆点、柔和背景色、🤔 图标

#### Scenario: 脉络感念展示引导问题
- **WHEN** 脉络感念的 `source` 为 `'guided'` 且有 `guidedQuestion`
- **THEN** 卡片顶部展示引导问题，以引用样式呈现

### Requirement: 时间间隔可视化

系统 SHALL 在时间线中表达相邻感念之间的时间跨度。

#### Scenario: 间隔天数展示
- **WHEN** 相邻两条感念的创建时间间隔超过 3 天
- **THEN** 在两者之间显示间隔天数标签（如"· 23天 ·"）

#### Scenario: 间隔视觉表达
- **WHEN** 相邻感念间隔较短（≤3天）
- **THEN** 时间线竖线较短
- **WHEN** 相邻感念间隔较长（>7天）
- **THEN** 时间线竖线较长，配合天数标签

### Requirement: 感念卡片展开/折叠

系统 SHALL 支持感念卡片的 inline 展开和折叠。

#### Scenario: 展开全文
- **WHEN** 用户点击折叠态的感念卡片
- **THEN** 卡片展开显示完整内容，隐藏 `numberOfLines` 限制
- **THEN** 展示"收起"按钮

#### Scenario: 折叠收起
- **WHEN** 用户点击展开态的"收起"按钮或再次点击卡片
- **THEN** 卡片恢复折叠态，显示 3 行截断

#### Scenario: 展开态不影响其他卡片
- **WHEN** 用户展开某张卡片
- **THEN** 其他卡片保持当前状态不变

### Requirement: 感念卡片操作菜单

系统 SHALL 为感念卡片提供操作菜单。

#### Scenario: 普通感念菜单
- **WHEN** 用户点击普通感念卡片的"···"按钮
- **THEN** 弹出菜单：查看感念详情、创建计划任务、从脉络移除

#### Scenario: 脉络感念菜单
- **WHEN** 用户点击脉络感念卡片的"···"按钮
- **THEN** 弹出菜单：编辑、创建计划任务、删除

#### Scenario: 从脉络移除普通感念
- **WHEN** 用户选择"从脉络移除"
- **THEN** 弹出确认对话框
- **THEN** 确认后调用 `store.removeReflectionFromTrail(trailId, reflectionId)`
- **THEN** 感念本身不被删除，仅解除与脉络的关联

#### Scenario: 删除脉络感念
- **WHEN** 用户选择"删除"
- **THEN** 弹出确认对话框
- **THEN** 确认后调用 `store.deleteTrailNote(noteId)`
- **THEN** TrailNote 标记为 deleted 并从脉络中移除

### Requirement: 脉络概览增强

系统 SHALL 在详情页顶部展示增强的脉络概览统计。

#### Scenario: 概览内容
- **WHEN** 用户进入详情页
- **THEN** 展示：感念数量 + 反思数量、日期范围（跨度天数）、心情变化序列、趋势（上升/下降/平稳）、标签聚合

#### Scenario: 趋势计算
- **WHEN** 脉络中有 3 条以上感念
- **THEN** 基于最近 3 条感念的情绪判断趋势方向

#### Scenario: 标签聚合
- **WHEN** 脉络中的感念有标签
- **THEN** 概览中展示出现频率最高的 3-5 个标签
