## Why

感念页面是用户记录内心感悟的核心入口，但当前存在以下问题：
- **视觉设计**：卡片样式单一、缺乏层次感，筛选/统计面板占用空间大
- **交互体验**：长按操作不够直观，筛选需要多次点击，无法批量操作
- **性能**：大数据量时列表卡顿，统计计算重复执行
- **统计功能**：统计内嵌在筛选面板中，空间有限，无法展示更丰富的数据分析

优化感念页面可以提升用户记录体验，增加用户粘性。

## What Changes

**视觉设计优化：**
- 卡片重设计：柔和渐变色、标签药丸样式、轻微阴影层次感
- 日期分组改为时间轴样式（左侧大数字 + 右侧详情）
- 筛选面板改为底部抽屉（Bottom Drawer）
- 添加卡片进入动画（fadeInUp + stagger）

**交互体验优化：**
- 左滑显示快捷操作（编辑/置顶）
- 顶部标签栏改为可滚动药丸
- 长按进入批量选择模式

**性能优化：**
- 使用 FlashList 替换 FlatList
- 组件 React.memo + useCallback 优化
- 样式提取到 StyleSheet.create

**统计页面独立：**
- 新增独立的感念统计页面
- 包含 4 个 Tab：趋势、热力图、心情、标签

**非目标：**
- 不支持图片/语音附件
- 不支持 Web 端（仅移动端）
- 不支持导出功能

## Capabilities

### New Capabilities
- `reflections-swipe-actions`: 左滑快捷操作（编辑/置顶）
- `reflections-batch-operations`: 批量选择和操作
- `reflections-stats-page`: 独立的感念统计页面

### Modified Capabilities
- `reflections-card-design`: 卡片视觉重设计（渐变色、标签样式、阴影）
- `reflections-filter-panel`: 筛选面板改为底部抽屉
- `reflections-list-performance`: 列表性能优化（FlashList、组件优化）

## Impact

**移动端：**
- `apps/mobile/src/features/reflections/ReflectionsScreen.tsx` - 主页面重构
- `apps/mobile/src/features/reflections/ReflectionStatsScreen.tsx` - 新增统计页面
- `apps/mobile/src/features/reflections/ReflectionCard.tsx` - 新增卡片组件
- `apps/mobile/src/features/reflections/useReflections.ts` - hook 优化
- `apps/mobile/src/navigation/index.tsx` - 新增路由

**依赖：**
- `@shopify/flash-list` - 虚拟列表
- `react-native-gesture-handler` - 手势处理
- `react-native-reanimated` - 动画
