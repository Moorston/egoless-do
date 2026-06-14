## 1. 基础 SVG 渲染层

- [x] 1.1 将 `<View style={styles.graphContainer}>` 替换为 `<Svg viewBox="0 0 800 1200">`，保留 header、context info、stats、insights 面板不变
- [x] 1.2 使用 SVG `<Circle>` 渲染节点圆形，半径为 node.size/2，fill 为 NODE_COLORS[type]
- [x] 1.3 在节点圆心使用 SVG `<Text>` 渲染 emoji 图标（NODE_ICONS）
- [x] 1.4 在节点下方使用 SVG `<Text>` 渲染截断标签（最多 8 字符）
- [x] 1.5 中心节点高亮：半径放大 1.2 倍，stroke="#fff" strokeWidth=4
- [x] 1.6 选中节点高亮：stroke="#fff" strokeWidth=3

## 2. 边 SVG 渲染

- [x] 2.1 使用 SVG `<Line>` 渲染边，x1/y1/x2/y2 为两端节点坐标
- [x] 2.2 根据 EDGE_STYLES.lineStyle 设置 strokeDasharray（solid 为空，dashed 为 "8,4"，dotted 为 "2,4"）
- [x] 2.3 设置 stroke 颜色和 strokeWidth 来自 EDGE_STYLES
- [x] 2.4 在边中点渲染关系类型标签：SVG `<Text>` + 背景 `<Rect>`

## 3. 力导向模拟适配

- [x] 3.1 将节点位置存储到 Reanimated SharedValue（useSharedValue），替代 useState 触发 re-render
- [x] 3.2 使用 useAnimatedProps 将 SharedValue 映射到 SVG Circle/Text 的 cx/cy/x/y 属性
- [x] 3.3 保留 requestAnimationFrame 模拟循环，但位置更新写入 SharedValue 而非 setState
- [x] 3.4 保留稳定性检测（总动能 < 0.5 时停止）和拖拽重启逻辑

## 4. 手势系统

- [x] 4.1 使用 Gesture.Pan() 实现节点拖拽：按下时检测命中节点，移动时更新节点 SharedValue 位置
- [x] 4.2 使用 Gesture.Pan() 实现画布平移：在空白区域拖拽时更新平移 SharedValue
- [x] 4.3 使用 Gesture.Pinch() 实现双指缩放：更新缩放 SharedValue（范围 0.5~2.0）
- [x] 4.4 使用 Gesture.Race 组合手势：节点拖拽优先于画布平移
- [x] 4.5 实现节点点击：Pan 手势结束后判断移动距离 < 10px 且时间 < 300ms 则为点击
- [x] 4.6 点击选中/取消选中节点，更新 selectedNode 状态

## 5. 坐标系与变换

- [x] 5.1 SVG viewBox 固定为 "0 0 800 1200"，节点坐标在此坐标系内计算
- [x] 5.2 画布平移/缩放通过 SVG `<G transform="translate(x,y) scale(s)">` 实现
- [x] 5.3 触摸坐标转换：将屏幕坐标反向变换为 SVG 坐标（考虑平移和缩放），用于命中检测

## 6. 保留现有功能

- [x] 6.1 保留上下文过滤逻辑（plan/habit/reflection/trail/planItem 五种入口的节点和边构建）
- [x] 6.2 保留节点数量限制（最多 20 个，按关联度排序截断）
- [x] 6.3 保留洞察生成（generateInsights 函数）
- [x] 6.4 保留统计面板（statsBar）和洞察面板（insightsPanel）
- [x] 6.5 保留详情面板（selectedNodeData）和导航功能
- [x] 6.6 保留缩放控制按钮（ZoomIn/ZoomOut）

## 7. 清理

- [x] 7.1 移除所有 View-based 渲染代码（edge View rotation、nodeWrapper absolute positioning）
- [x] 7.2 移除 raw touch event handlers（onTouchStart/Move/End）和相关 ref
- [x] 7.3 移除不再需要的 StyleSheet 条目
