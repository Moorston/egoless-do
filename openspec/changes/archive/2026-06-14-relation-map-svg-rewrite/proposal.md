## Why

RelationMapView 当前使用 View + absolute positioning 模拟力导向图，存在多个根本性问题：
- 手势处理（PanResponder / raw touch events）始终无法正确区分节点拖拽、画布平移和点击
- `locationX/Y` 坐标相对于被触摸元素而非容器，导致命中检测不准
- 边渲染用 View rotation 模拟，虚线/点线支持差
- 力导向模拟触发 setState 导致全树 re-render，性能差

项目已安装 `react-native-svg`、`react-native-gesture-handler`、`react-native-reanimated`，可以直接使用 SVG + Gesture API 重写。

## What Changes

- **完全重写 RelationMapView**：从 View-based 改为 SVG-based 渲染
- **手势系统重写**：使用 `Gesture.Pan()` + `Gesture.Pinch()` 替代 PanResponder / raw touch events
- **统一坐标系**：SVG 内部坐标即图形坐标，无需 pageX ↔ graph 坐标转换
- **动画优化**：使用 `SharedValue` + `useAnimatedProps` 在 UI 线程更新节点位置
- **边渲染升级**：SVG `<Line>` 原生支持 `strokeDasharray`，虚线/点线正确渲染
- **保留现有功能**：5 种节点类型、9 种边样式、上下文过滤、节点数量限制、洞察生成

### 非目标

- 不引入新依赖（三个库已安装）
- 不改变数据模型或 store 结构
- 不做全局视图（保持上下文视图）
- 不做 Web 端（仅 Mobile）

## Capabilities

### New Capabilities
- `relation-map-svg-rendering`: 使用 react-native-svg 渲染节点（Circle + Text）和边（Line + Text），统一 SVG 坐标系
- `relation-map-gesture-handler`: 使用 react-native-gesture-handler 的 Gesture API 实现节点拖拽、画布平移、双指缩放、点击选中

### Modified Capabilities
（无已有 spec 需要修改，本次是实现层重写）

## Impact

- **Mobile**：`apps/mobile/src/features/reflections/RelationMapView.tsx` 完全重写
- **依赖**：`react-native-svg`、`react-native-gesture-handler`、`react-native-reanimated`（均已安装）
- **入口页面**：无变化（ThoughtTrailDetailScreen、PlanTaskCard、ReflectionDetailContent 的入口按钮保持不变）
