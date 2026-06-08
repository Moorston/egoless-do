## Context

当前 ItemManagerPanel 组件使用 ScrollView 渲染列表，PanResponder 实现拖拽排序，每行有4个操作按钮（上移/下移/编辑/删除）。存在性能和 UI/UX 问题。

## Goals / Non-Goals

**Goals:**
- 提升列表渲染性能
- 优化操作交互体验
- 增大触摸区域
- 添加操作反馈

**Non-Goals:**
- 不新增功能
- 不修改数据模型
- 不影响其他页面

## Decisions

### 1. 使用 FlatList 替代 ScrollView

**理由**: FlatList 支持虚拟化渲染，只渲染可见项，提升长列表性能。

**实现**:
```typescript
<FlatList
  data={sortedSections}
  keyExtractor={(item) => item.titleKey}
  renderItem={({ item }) => renderSection(item)}
  getItemLayout={(data, index) => ({
    length: ROW_HEIGHT,
    offset: ROW_HEIGHT * index,
    index,
  })}
/>
```

### 2. 简化操作按钮

**理由**: 减少视觉复杂度，提升用户体验。

**实现**:
- 保留编辑按钮
- 使用滑动操作实现删除
- 使用长按拖拽实现排序

### 3. 增大触摸区域

**理由**: 符合 Apple HIG 推荐的 44x44 最小触摸区域。

**实现**:
```typescript
style={{ 
  minWidth: 44, 
  minHeight: 44, 
  alignItems: 'center', 
  justifyContent: 'center' 
}}
```

### 4. 添加操作反馈

**理由**: 提升用户体验，让用户知道操作是否成功。

**实现**:
- 使用 Toast 显示操作成功提示
- 添加删除确认动画
- 添加加载状态

### 5. 优化拖拽排序

**理由**: 使用原生驱动动画，提升流畅度。

**实现**:
- 使用 `react-native-reanimated` 或 `react-native-gesture-handler`
- 使用 `useSharedValue` 和 `useAnimatedStyle` 实现平滑动画

## Risks / Trade-offs

**风险**: 引入新依赖可能增加包体积
**缓解**: 评估依赖大小，必要时使用轻量级替代方案

**风险**: 滑动操作可能误触发
**缓解**: 设置合理的滑动阈值，添加确认提示

**风险**: FlatList 可能影响拖拽排序实现
**缓解**: 使用 `react-native-reanimated` 的拖拽排序方案
