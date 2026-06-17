## Why

RelationMapView 当前仅支持 3 种节点类型（感念、计划、习惯），无法展示思维脉络和计划任务的关联关系。此外存在多个体验和性能问题：缩放状态未正确应用到图形渲染、缺少拖拽手势、力导向模拟永不停止导致持续耗电、边渲染缺乏类型区分。

## What Changes

- **扩展节点类型**：从 3 种扩展到 5 种，新增思维脉络（trail）和计划任务（planItem）节点
- **修复缩放 bug**：缩放值未应用到实际图形渲染，仅影响容器尺寸
- **添加手势支持**：支持拖拽平移画布、捏合缩放，替代仅按钮缩放
- **性能优化**：力导向模拟稳定后自动停止、优化 O(n²) 节点查找为 O(1) Map 查找
- **类型化边渲染**：不同关系类型使用不同颜色和线型（如实线/虚线）
- **更丰富的节点展示**：显示 emoji + 文本标签，点击跳转详情
- **更深度的洞察**：分析节点间关系类型并生成洞察文本
- **更新入口**：从思维脉络详情、计划任务详情进入关系全景图

### 非目标

- 不做全局视图（保持上下文视图，从单个实体出发展示关联）
- 不做实时协作
- 不做节点编辑（仅查看）

## Capabilities

### New Capabilities
- `relation-map-extended-nodes`: 扩展 RelationMapView 支持 5 种节点类型（reflection、plan、habit、trail、planItem），更新上下文过滤逻辑和关系构建
- `relation-map-gesture-interaction`: 添加手势驱动的拖拽平移和捏合缩放交互
- `relation-map-typed-edges`: 根据关系类型渲染不同样式的边（颜色、线型、标签）

### Modified Capabilities
（无已有 spec 需要修改）

## Impact

- **Mobile**：`apps/mobile/src/features/reflections/RelationMapView.tsx` 主要重构
- **类型**：`packages/core/src/types/` 可能需要扩展关系类型定义
- **入口页面**：`ThoughtTrailDetailScreen`、计划任务详情等添加"关系全景图"按钮
- **性能**：从 setInterval 持续模拟改为 requestAnimationFrame + 稳定检测
