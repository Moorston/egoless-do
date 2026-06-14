## ADDED Requirements

### Requirement: 颗粒化 Store 订阅
系统 SHALL 使用 Zustand 颗粒选择器替代全量 `useAppStore()`。

#### Scenario: 仅相关数据变化时重渲染
- **WHEN** store 中不相关的 slice（如 habits）变化
- **THEN** ThoughtTrailDetailScreen 不重新渲染

### Requirement: Timeline 虚拟化
系统 SHALL 在 timeline items 超过 30 条时使用虚拟化列表。

#### Scenario: 大列表虚拟化
- **WHEN** timeline items 数量 > 30
- **THEN** 使用 FlashList 渲染，仅渲染可见区域

### Requirement: PlanTasksSection memo 优化
系统 SHALL 将 PlanTasksSection 中的 `checkins.filter()` 提取到 useMemo。

#### Scenario: 避免重复 filter
- **WHEN** PlanTasksSection 渲染
- **THEN** checkins 过滤仅在依赖变化时重新计算
