## Context

感念页面（ReflectionsScreen）是用户记录内心感悟的核心入口，当前实现包括：
- 渐变色卡片展示，按日期分组
- 搜索、筛选（标签/心情）、统计面板（内嵌）
- 长按操作菜单（编辑、创建计划任务、删除）
- 使用 FlatList 渲染列表

当前痛点：
- 卡片样式单一，缺乏层次感
- 筛选/统计面板占用大量空间
- 长按操作不够直观
- 大数据量时性能下降

## Goals / Non-Goals

**Goals:**
- 提升视觉设计质量（卡片、时间轴、动画）
- 优化交互体验（手势操作、快捷筛选）
- 提升列表性能（虚拟列表、组件优化）
- 统计功能独立成页面

**Non-Goals:**
- 不支持图片/语音附件
- 不支持 Web 端同步
- 不支持导出功能

## Decisions

### 1. 卡片组件设计

**决策**: 创建独立的 `ReflectionCard` 组件，使用 `React.memo` 包裹

**理由**:
- 职责单一，便于维护和优化
- memo 避免不必要的重渲染
- 可复用于列表和详情页

**组件结构**:
```
ReflectionCard
├── LinearGradient (柔和渐变)
├── Header (时间 + 置顶/计划徽章)
├── Content (最多3行，点击展开)
├── Tags (药丸样式)
└── Swipeable (左滑操作)
```

### 2. 左滑操作实现

**决策**: 使用 `react-native-gesture-handler` 的 `Swipeable` 组件

**理由**:
- 原生性能，流畅度高
- 已有项目依赖，无需新增
- API 简单，易于集成

**交互设计**:
- 左滑距离 > 60px → 显示编辑+置顶按钮
- 松手自动吸附回位
- 点击其他区域收起

**替代方案**:
- `react-native-swipe-list-view` - 功能过重
- 自定义 PanResponder - 实现复杂度高

### 3. 筛选面板改为底部抽屉

**决策**: 使用 `@gorhom/bottom-sheet` 实现底部抽屉

**理由**:
- 专业的底部抽屉库，手势支持好
- 支持 snap points（可吸附位置）
- 动画流畅，用户体验佳

**布局**:
```
BottomSheet
├── 拖拽条
├── 标签筛选 (水平滚动药丸)
├── 心情筛选 (水平滚动药丸)
├── 更多筛选 (有链接、已置顶、时间范围)
└── 应用按钮
```

**替代方案**:
- 自定义 Modal - 手势支持差
- `react-native-modalize` - 维护不活跃

### 4. 虚拟列表实现

**决策**: 使用 `@shopify/flash-list` 替换 `FlatList`

**理由**:
- 性能提升 5-10 倍
- 自动回收离屏组件
- API 兼容 FlatList，迁移成本低

**配置**:
```tsx
<FlashList
  data={byDay}
  estimatedItemSize={200}
  renderItem={({ item }) => <DayGroup ... />}
/>
```

**替代方案**:
- `recyclerlistview` - API 复杂
- 优化 FlatList - 提升有限

### 5. 统计页面架构

**决策**: 新增独立的 `ReflectionStatsScreen`，使用 Tab 切换

**理由**:
- 独立页面空间充足，可展示更丰富的内容
- Tab 切换符合用户习惯
- 复用现有统计计算逻辑

**Tab 结构**:
```
ReflectionStatsScreen
├── 总览卡片 (总感念、连续天数、本周、本月)
├── Tab 切换
│   ├── 趋势 (折线图 - 近30天写作频率)
│   ├── 热力图 (GitHub风格 - 最近20周)
│   ├── 心情 (情感趋势 + 分布)
│   └── 标签 (标签云 + 使用频率)
└── 分享按钮
```

### 6. 动画方案

**决策**: 使用 `react-native-reanimated` 3

**理由**:
- UI 线程动画，不卡顿
- 已有项目依赖
- 支持 layout animation

**动画类型**:
- 卡片进入: fadeInUp (200ms, ease-out)
- 列表 stagger: 每张卡片延迟 50ms
- 筛选面板: slideUp (300ms, spring)
- 展开/收起: layout animation (250ms)

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|----------|
| FlashList 与 LinearGradient 兼容性 | 测试验证，必要时降级为优化后的 FlatList |
| 底部抽屉与键盘冲突 | 设置 keyboardBehavior="interactive" |
| 左滑与列表滚动冲突 | 设置 activationDistance={20} |
| 统计页面计算复杂度 | 使用 useMemo 缓存，增量更新 |
| 新增依赖包体积 | FlashList 约 50KB，可接受 |

## Migration Plan

1. **Phase 1**: 卡片组件重构（不影响现有功能）
2. **Phase 2**: 左滑操作集成（渐进式）
3. **Phase 3**: 筛选面板迁移（替换现有实现）
4. **Phase 4**: FlashList 替换（直接替换）
5. **Phase 5**: 统计页面新增（独立功能）

**回滚策略**: 每个 Phase 独立，可单独回滚

## Open Questions

- 统计页面是否需要支持时间范围选择？
- 标签云是否需要交互（点击筛选）？
- 热力图是否需要显示具体数值？
