## ADDED Requirements

### Requirement: SVG 画布渲染

系统 SHALL 使用 `react-native-svg` 的 `<Svg>` 组件作为关系图画布，替代原有的 View + absolute positioning 方案。

#### Scenario: 画布初始化
- **WHEN** RelationMapView 加载完成
- **THEN** 显示一个 `<Svg>` 元素，viewBox 设置为逻辑画布尺寸（宽 800，高 1200），并填满可用空间

#### Scenario: 画布背景
- **WHEN** 画布渲染
- **THEN** 画布背景色跟随当前主题（TH.bg）

### Requirement: 节点 SVG 渲染

系统 SHALL 使用 SVG `<Circle>` 和 `<Text>` 渲染每个关系图节点，替代原有的 View 圆形 + Text 标签方案。

#### Scenario: 节点圆形
- **WHEN** 一个关系节点需要渲染
- **THEN** 使用 `<Circle>` 元素，半径为节点 size 的一半，填充色为节点类型对应颜色（NODE_COLORS）

#### Scenario: 节点图标
- **WHEN** 节点圆形渲染
- **THEN** 在圆心位置叠加一个 `<Text>` 元素，显示节点类型对应的 emoji 图标（NODE_ICONS）

#### Scenario: 节点标签
- **WHEN** 节点渲染
- **THEN** 在节点圆形下方显示截断标签（最多 8 字符），使用 SVG `<Text>` 元素

#### Scenario: 中心节点高亮
- **WHEN** 节点是当前上下文的中心节点
- **THEN** 圆形放大 1.2 倍，添加白色描边（strokeWidth: 4）

#### Scenario: 选中节点高亮
- **WHEN** 节点被用户选中
- **THEN** 圆形添加白色描边（strokeWidth: 3）

### Requirement: 边 SVG 渲染

系统 SHALL 使用 SVG `<Line>` 渲染节点之间的边，支持 9 种边样式的正确渲染。

#### Scenario: 实线边
- **WHEN** 边样式为 solid
- **THEN** 使用 `<Line>` 元素，strokeDasharray 为空（默认实线）

#### Scenario: 虚线边
- **WHEN** 边样式为 dashed
- **THEN** 使用 `<Line>` 元素，设置 strokeDasharray="8,4"

#### Scenario: 点线边
- **WHEN** 边样式为 dotted
- **THEN** 使用 `<Line>` 元素，设置 strokeDasharray="2,4"

#### Scenario: 边颜色和粗细
- **WHEN** 边渲染
- **THEN** stroke 颜色和 strokeWidth 来自 EDGE_STYLES 映射表

#### Scenario: 边标签
- **WHEN** 边渲染
- **THEN** 在边的中点位置显示关系类型标签，使用 SVG `<Text>` 元素，背景使用半透明矩形

### Requirement: 节点变换

系统 SHALL 支持通过 SVG `<G transform>` 对整个图形进行平移和缩放。

#### Scenario: 画布平移
- **WHEN** 用户平移画布
- **THEN** 所有节点和边通过 `<G translate(x,y)>` 统一平移

#### Scenario: 画布缩放
- **WHEN** 用户缩放画布
- **THEN** 所有节点和边通过 `<G scale(s)>` 统一缩放，缩放范围限制在 0.5 到 2.0

### Requirement: 力导向模拟与 UI 线程更新

系统 SHALL 使用 Reanimated SharedValue 存储节点位置，通过 UI 线程更新避免 JS 线程 re-render。

#### Scenario: 模拟运行时更新
- **WHEN** 力导向模拟计算出新的节点位置
- **THEN** 将位置写入 SharedValue，SVG 元素通过 useAnimatedProps 自动更新，不触发 React setState

#### Scenario: 模拟稳定性检测
- **WHEN** 所有节点的总动能低于阈值（0.5）
- **THEN** 停止模拟，释放 requestAnimationFrame

#### Scenario: 拖拽重启模拟
- **WHEN** 用户拖拽节点结束
- **THEN** 重新启动力导向模拟
