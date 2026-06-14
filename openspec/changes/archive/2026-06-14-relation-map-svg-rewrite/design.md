## Context

RelationMapView 当前使用 React Native `<View>` + absolute positioning 渲染力导向图。经过 `optimize-relation-map` 变更后，节点类型扩展到 5 种、边样式 9 种、上下文过滤逻辑完善，但触摸交互存在根本性缺陷：

- `locationX/Y` 坐标相对于被触摸的子元素（如节点圆圈），而非容器，导致命中检测和拖拽坐标转换始终不正确
- PanResponder 在手势过程中因 React 重渲染被重建
- 边渲染用 View rotation + borderWidth 模拟，虚线/点线在 Android 上表现不一致

项目已安装 `react-native-svg`（15.15.5）、`react-native-gesture-handler`（2.28.0）、`react-native-reanimated`（4.1.1），无需新增依赖。

## Goals / Non-Goals

**Goals:**
- 使用 SVG 替代 View 渲染所有节点和边，统一坐标系
- 使用 Gesture API 替代 raw touch events，实现可靠的节点拖拽、画布平移、双指缩放、点击选中
- 使用 Reanimated SharedValue 在 UI 线程更新节点位置，避免 setState 触发全树 re-render
- 保留所有现有功能：5 种节点类型、9 种边样式、上下文过滤、节点数量限制、洞察生成、统计面板

**Non-Goals:**
- 不引入新依赖
- 不改变数据模型或 store 结构
- 不做全局视图（保持上下文视图）
- 不做 Web 端（仅 Mobile）
- 不改变力导向算法本身（仅改变渲染和交互层）

## Decisions

### 1. SVG 渲染层：react-native-svg

**选择**: 使用 `<Svg>` 作为画布，节点用 `<Circle>` + `<Text>`，边用 `<Line>` + `<Text>`

**替代方案**:
- 继续用 View + absolute positioning：坐标系问题无法根治
- 使用 react-native-skia：过于重量级，且项目未安装

**理由**: SVG 内部坐标系天然统一，`<Line>` 原生支持 `strokeDasharray` 虚线/点线，无需 rotation hack

### 2. 手势系统：react-native-gesture-handler Gesture API

**选择**: 使用 `Gesture.Pan()` + `Gesture.Pinch()` + `Gesture.Tap()`，通过 `Gesture.Simultaneous` 或 `Gesture.Race` 组合

**替代方案**:
- 继续用 PanResponder：重建问题无法解决
- 使用 raw touch events：locationX/Y 坐标问题无法解决

**理由**: Gesture API 由原生驱动，不依赖 React 生命周期，手势状态不会因重渲染丢失。配合 `useAnimatedStyle` 可在 UI 线程直接更新变换矩阵

### 3. 动画层：Reanimated SharedValue

**选择**: 节点位置存储在 `useSharedValue` 中，通过 `useAnimatedProps` 直接更新 SVG 元素属性

**替代方案**:
- 继续用 useState + requestAnimationFrame：每次 setState 触发全树 re-render
- 使用 React Native Animated：跨线程性能不如 Reanimated

**理由**: SharedValue 在 UI 线程更新，不触发 JS 线程 re-render，力导向模拟可以持续运行而不卡顿

### 4. 坐标系策略

**选择**: SVG viewBox 固定为逻辑画布尺寸（如 800x1200），节点坐标在 viewBox 内计算。手势平移/缩放通过 SVG 的 `<G transform>` 实现

**替代方案**:
- 屏幕坐标 + 手动转换：容易出错，需要维护 pageX/locationX/graph 坐标映射

**理由**: SVG 坐标即图形坐标，手势只需更新 transform 的 translate 和 scale 值，无需坐标转换

### 5. 力导向模拟

**选择**: 保留现有 requestAnimationFrame 模拟逻辑，但节点位置更新改为写入 SharedValue 而非触发 setState

**替代方案**:
- 使用 d3-force：引入额外依赖，且现有逻辑已足够

**理由**: 最小改动原则，现有模拟逻辑经过验证，仅需改变"如何把位置变化反映到渲染"

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|----------|
| react-native-svg 在大量节点时性能可能不如 View | 限制最多 20 节点，实测验证 |
| Reanimated SharedValue 与 SVG 属性的桥接可能有兼容问题 | 使用 `useAnimatedProps` + `animatedProps` 模式，这是 Reanimated 官方支持的 |
| 手势组合（拖拽节点 vs 平移画布）的区分逻辑可能有边界情况 | 使用 `Gesture.Race` 优先节点拖拽，平移作为 fallback |
| SVG Text 的中文渲染可能有截断问题 | 限制标签长度为 8 字符，与现有实现一致 |

## Migration Plan

1. 完全重写 RelationMapView.tsx，替换所有 View-based 渲染为 SVG
2. 保留相同的 props 接口（route params: context）和导航行为
3. 保留相同的子组件结构（header、context info、graph、stats、insights）
4. 入口页面（ThoughtTrailDetailScreen、PlanTaskCard、ReflectionDetailContent）无需修改

## Open Questions

- SVG `<Text>` 在 Android 上的 emoji 渲染是否正常？（节点图标使用 emoji）
- Reanimated 4.x 的 `useAnimatedProps` 是否支持 SVG 属性直接映射？
