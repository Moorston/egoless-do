## Context

RelationMapView 当前实现：
- 517 行代码，使用 View + absolute positioning 模拟力导向图
- 3 种节点类型：reflection（感念）、plan（计划）、habit（习惯）
- 力导向模拟通过 `setInterval` 每 50ms 运行，永不停止
- 缩放状态 `zoom` 存在但未应用到渲染（仅按钮控制，无视觉效果）
- 边渲染使用单一 `TH.border` 颜色，无类型区分
- 节点查找使用 `nodes.find()` O(n) 遍历

实体关系映射（来自探索）：
```
Plan ──has──▶ PlanItem ──links──▶ Reflection
                         ──links──▶ ThoughtTrail
                         ──links──▶ Habit
Reflection ↔ Reflection (via ReflectionLink: inspire/evolve/contrast/respond/related)
ThoughtTrail ──contains──▶ Reflection[]
ThoughtTrail ──links──▶ PlanItem[]
Habit ──links──▶ PlanItem[]
```

## Goals / Non-Goals

**Goals:**
- 支持 5 种节点类型，正确构建完整关系图
- 修复缩放 bug，支持手势拖拽/缩放
- 力导向模拟稳定后停止，降低耗电
- 不同关系类型使用不同边样式
- 节点显示 emoji + 文本标签
- 从思维脉络、计划任务详情页可进入关系全景图

**Non-Goals:**
- 不做全局视图（保持上下文视图）
- 不做节点拖拽编辑
- 不做实时协作

## Decisions

### 1. 手势实现：PanResponder vs react-native-gesture-handler

**选择：PanResponder**

Rationale：
- 项目未引入 react-native-gesture-handler，引入新依赖增加包体积
- PanResponder 是 RN 内置 API，足够满足拖拽+缩放需求
- 力导向图的手势交互相对简单（平移画布 + 捏合缩放）

Alternative: react-native-gesture-handler 提供更流畅的手势体验，但引入依赖成本不值得。

### 2. 力导向模拟策略

**选择：requestAnimationFrame + 稳定检测**

Rationale：
- 当前 `setInterval(50ms)` 永不停止，即使节点已稳定仍持续计算
- 改为检测总动能（sum of |vx| + |vy|），低于阈值时停止模拟
- 用户拖拽节点时重新启动模拟
- 使用 `requestAnimationFrame` 替代 `setInterval`，帧率更稳定

### 3. 缩放实现

**选择：Transform scale + PanResponder 两指缩放**

Rationale：
- 当前 `zoom` 状态未应用到任何 transform，仅控制容器大小
- 将 `zoom` 应用到 graphContainer 的 `transform: [{ scale: zoom }]`
- 保留按钮缩放 + 添加捏合手势缩放
- 拖拽平移使用 `translateX/translateY` offset

### 4. 节点渲染优化

**选择：预计算 nodeMap + 边查找优化**

Rationale：
- 将 `nodes.find(n => n.id === edge.from)` 替换为 Map 查找 O(1)
- 边渲染时直接从 nodeMap 获取坐标
- 减少不必要的 re-render：使用 React.memo 包装节点组件

### 5. 新节点类型的关系构建

扩展上下文过滤逻辑：

| 入口类型 | 新增关联 |
|---------|---------|
| trail（思维脉络） | 包含的 Reflection[] + 关联的 PlanItem[] |
| planItem（计划任务） | 关联的 Reflection + Trail + Habit |

对于 `planItem` 入口：
- 通过 `planItem.reflectionId` 找到感念
- 通过 `planItem.trailId` 找到思维脉络
- 通过 `planItem.linkConfig.habitId` 找到习惯
- 通过 `reflection.thoughtTrailIds` 找到更多思维脉络

### 6. 边样式类型化

| 关系类型 | 颜色 | 线型 | 标签 |
|---------|------|------|------|
| related（感念-计划） | 蓝色 | 实线 | 相关 |
| linked（习惯-计划） | 琥珀色 | 实线 | 关联 |
| inspire/evolve/contrast/respond | 紫色 | 虚线 | 对应类型名 |
| same_tag | 灰色 | 点线 | 同标签 |
| contains（脉络-感念） | 青色 | 实线 | 包含 |
| belongs（感念-脉络） | 青色 | 虚线 | 所属 |

## Risks / Trade-offs

- **[性能] 节点过多时渲染卡顿** → 限制单次展示节点数（如最多 20 个），超出时按关联度排序截断
- **[手势冲突] PanResponder 与 ScrollView 可能冲突** → 图形容器使用 View 而非 ScrollView，平移通过 offset 实现
- **[缩放边界] 缩放后节点可能超出可视区域** → 设置缩放范围 0.5-2.0，平移边界动态计算
