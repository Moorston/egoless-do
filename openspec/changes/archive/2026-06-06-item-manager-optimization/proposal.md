## Why

标签管理和心情管理页面（ItemManagerPanel）存在以下问题需要优化：

1. **UI/UX 问题**：
   - 操作按钮过多（每行4个按钮），视觉混乱
   - 触摸区域小（32x32），不符合人机交互规范
   - 视觉层次不清晰，所有元素样式相似
   - 缺少操作反馈动画

2. **性能问题**：
   - 使用 ScrollView 渲染长列表，性能差
   - PanResponder 实现拖拽排序，动画不流畅
   - 组件重渲染频繁

## What Changes

### UI/UX 优化
- 简化操作按钮布局，使用滑动操作替代
- 增大触摸区域至 44x44（Apple HIG 推荐）
- 优化视觉层次，使用卡片式设计
- 添加操作反馈动画

### 性能优化
- 使用 FlatList 替代 ScrollView
- 使用 React.memo 优化子组件
- 优化 useCallback/useMemo 依赖
- 优化拖拽排序实现

**非目标**：
- 不新增功能（批量删除、搜索、导入导出等）
- 不修改数据模型
- 不影响其他页面

## Capabilities

### New Capabilities

无

### Modified Capabilities

无（仅优化实现，不涉及需求变更）

## Impact

- **平台**: Mobile（React Native）
- **文件**:
  - `apps/mobile/src/components/ItemManagerPanel.tsx` - 主要修改文件
- **依赖**: 可能需要 `react-native-reanimated` 或 `react-native-gesture-handler`
- **API**: 无变更
