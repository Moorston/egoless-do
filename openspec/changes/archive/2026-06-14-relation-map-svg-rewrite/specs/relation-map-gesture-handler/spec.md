## ADDED Requirements

### Requirement: 节点拖拽手势

系统 SHALL 使用 `Gesture.Pan()` 实现节点拖拽，用户可以按住节点并移动到新位置。

#### Scenario: 拖拽开始
- **WHEN** 用户在节点位置按下并开始移动
- **THEN** 进入节点拖拽模式，节点跟随手指移动，节点位置固定不再受力导向模拟影响

#### Scenario: 拖拽移动
- **WHEN** 用户拖拽节点
- **THEN** 节点坐标实时更新，坐标转换基于 SVG 坐标系（考虑当前平移和缩放）

#### Scenario: 拖拽结束
- **WHEN** 用户释放节点
- **THEN** 节点停在释放位置，力导向模拟重新启动，该节点标记为可被模拟影响

#### Scenario: 拖拽阈值
- **WHEN** 用户按下后移动距离小于 10 像素
- **THEN** 不触发拖拽，视为点击

### Requirement: 画布平移手势

系统 SHALL 使用 `Gesture.Pan()` 实现画布平移，用户可以在空白区域拖拽移动整个视图。

#### Scenario: 空白区域拖拽
- **WHEN** 用户在非节点区域按下并拖拽
- **THEN** 整个图形视图跟随手指平移

#### Scenario: 平移边界
- **WHEN** 用户平移画布
- **THEN** 平移范围限制在合理边界内，防止图形完全移出视口

### Requirement: 双指缩放手势

系统 SHALL 使用 `Gesture.Pinch()` 实现画布缩放。

#### Scenario: 双指捏合缩放
- **WHEN** 用户用双指捏合或展开
- **THEN** 画布缩放比例跟随手势变化

#### Scenario: 缩放范围
- **WHEN** 缩放比例超出范围
- **THEN** 限制在 0.5 到 2.0 之间

### Requirement: 手势组合

系统 SHALL 正确处理多种手势的组合，避免冲突。

#### Scenario: 节点拖拽优先于画布平移
- **WHEN** 用户在节点位置开始 Pan 手势
- **THEN** 优先触发节点拖拽，不触发画布平移

#### Scenario: 缩放与拖拽互斥
- **WHEN** 用户正在进行双指缩放
- **THEN** 不触发节点拖拽或画布平移

### Requirement: 节点点击

系统 SHALL 支持点击节点选中，显示节点详情面板。

#### Scenario: 点击选中
- **WHEN** 用户在节点位置轻触（按下并释放，移动距离小于 10 像素，时间小于 300ms）
- **THEN** 该节点被选中，显示详情面板

#### Scenario: 取消选中
- **WHEN** 用户点击已选中的节点
- **THEN** 取消选中，隐藏详情面板

#### Scenario: 点击空白区域
- **WHEN** 用户点击非节点区域
- **THEN** 取消当前选中

### Requirement: 节点命中检测

系统 SHALL 使用 SVG 坐标系进行节点命中检测，避免 React Native locationX/Y 的坐标偏移问题。

#### Scenario: 命中检测坐标系
- **WHEN** 需要判断触摸点是否在节点上
- **THEN** 将触摸坐标转换为 SVG viewBox 坐标，然后与节点坐标比较，命中半径为节点 size/2 + 15
