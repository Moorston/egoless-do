## ADDED Requirements

### Requirement: 拖拽平移画布
用户 SHALL 能够通过单指拖拽平移整个关系图画布。

#### Scenario: 单指拖拽
- **WHEN** 用户在图形容器上单指拖拽
- **THEN** 整个图形 SHALL 随手指方向平移，节点相对位置不变

#### Scenario: 平移边界
- **WHEN** 用户平移画布
- **THEN** 平移 SHALL 有边界限制，防止将图形完全移出可视区域

### Requirement: 捏合缩放
用户 SHALL 能够通过两指捏合缩放关系图。

#### Scenario: 两指捏合放大
- **WHEN** 用户两指捏合向外扩张
- **THEN** 图形 SHALL 放大，缩放比例范围 0.5 到 2.0

#### Scenario: 两指捏合缩小
- **WHEN** 用户两指捏合向内收缩
- **THEN** 图形 SHALL 缩小，缩放比例范围 0.5 到 2.0

### Requirement: 按钮缩放保留
系统 SHALL 保留现有的按钮缩放功能。

#### Scenario: 点击放大按钮
- **WHEN** 用户点击放大按钮
- **THEN** 缩放比例 SHALL 增加 0.2，不超过 2.0

#### Scenario: 点击缩小按钮
- **WHEN** 用户点击缩小按钮
- **THEN** 缩放比例 SHALL 减少 0.2，不低于 0.5

### Requirement: 缩放应用到渲染
缩放值 SHALL 正确应用到图形渲染，产生视觉缩放效果。

#### Scenario: 缩放视觉效果
- **WHEN** 缩放值为 1.5
- **THEN** 图形容器 SHALL 应用 `transform: [{ scale: 1.5 }]`，图形视觉上放大 1.5 倍

### Requirement: 力导向模拟稳定停止
力导向模拟 SHALL 在节点稳定后自动停止，减少耗电。

#### Scenario: 模拟稳定检测
- **WHEN** 所有节点的总动能（sum of |vx| + |vy|）低于阈值 0.5
- **THEN** 模拟 SHALL 停止，不再消耗计算资源

#### Scenario: 拖拽重启模拟
- **WHEN** 用户拖拽画布或节点
- **THEN** 模拟 SHALL 重新启动，直到再次稳定
