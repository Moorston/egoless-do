## MODIFIED Requirements

### Requirement: 列表渲染性能

感念列表 SHALL 使用虚拟列表技术优化性能。

#### Scenario: 使用 FlashList
- **WHEN** 渲染感念列表
- **THEN** 使用 FlashList 替代 FlatList

#### Scenario: 自动回收离屏组件
- **WHEN** 滚动列表
- **THEN** 自动回收离开屏幕的组件

#### Scenario: 预估高度
- **WHEN** 使用 FlashList
- **THEN** 设置 estimatedItemSize 为 200

### Requirement: 组件性能优化

感念卡片组件 SHALL 使用性能优化技术。

#### Scenario: React.memo 包裹
- **WHEN** 渲染感念卡片
- **THEN** 使用 React.memo 包裹组件避免不必要的重渲染

#### Scenario: useCallback 缓存事件
- **WHEN** 绑定事件处理函数
- **THEN** 使用 useCallback 缓存函数引用

#### Scenario: 样式提取
- **WHEN** 定义样式
- **THEN** 使用 StyleSheet.create 提取样式对象

### Requirement: 计算性能优化

统计数据计算 SHALL 使用缓存优化。

#### Scenario: useMemo 缓存
- **WHEN** 计算统计数据
- **THEN** 使用 useMemo 缓存计算结果

#### Scenario: 增量更新
- **WHEN** 数据变化
- **THEN** 只重新计算变化的部分
