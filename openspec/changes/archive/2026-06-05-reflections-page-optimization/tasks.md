## 1. 依赖安装与准备 (根目录)

- [x] 1.1 安装 `@shopify/flash-list` 依赖
- [x] 1.2 安装 `@gorhom/bottom-sheet` 依赖
- [x] 1.3 安装 `react-native-reanimated` (如未安装)
- [x] 1.4 安装 `react-native-gesture-handler` (如未安装)

## 2. 卡片组件重构 (apps/mobile)

- [x] 2.1 创建 `apps/mobile/src/features/reflections/ReflectionCard.tsx` 独立卡片组件
- [x] 2.2 实现柔和渐变背景（降低饱和度 10-15%）
- [x] 2.3 实现标签药丸样式（圆角 12，半透明背景）
- [x] 2.4 实现内容限制显示（最多 3 行，点击展开）
- [x] 2.5 实现卡片阴影效果
- [x] 2.6 使用 React.memo 包裹组件
- [x] 2.7 集成置顶徽章和计划关联徽章

## 3. 左滑操作实现 (apps/mobile)

- [x] 3.1 在 ReflectionCard 中集成 `Swipeable` 组件
- [x] 3.2 实现左滑显示编辑和置顶按钮
- [x] 3.3 实现滑动距离阈值（60px 触发）
- [x] 3.4 实现松手自动吸附回位
- [x] 3.5 实现点击其他区域收起操作
- [x] 3.6 实现置顶状态视觉反馈

## 4. 日期分组优化 (apps/mobile)

- [x] 4.1 修改 `ReflectionsScreen.tsx` 中的日期分组渲染
- [x] 4.2 实现时间轴样式（左侧大数字 + 右侧详情）
- [x] 4.3 实现竖线连接卡片
- [x] 4.4 显示当天感念数量

## 5. 筛选面板改造 (apps/mobile)

- [x] 5.1 安装并配置 `@gorhom/bottom-sheet`
- [x] 5.2 创建 `apps/mobile/src/features/reflections/FilterDrawer.tsx` 筛选抽屉组件
- [x] 5.3 实现标签筛选（水平滚动药丸）
- [x] 5.4 实现心情筛选（水平滚动药丸）
- [x] 5.5 实现更多筛选选项（有链接、已置顶、时间范围）
- [x] 5.6 实现应用筛选按钮
- [x] 5.7 实现拖拽关闭手势
- [x] 5.8 修改顶部标签栏为可滚动药丸样式
- [x] 5.9 实现长按标签快速筛选

## 6. 动画效果 (apps/mobile)

- [x] 6.1 配置 `react-native-reanimated` 3
- [x] 6.2 实现卡片进入动画（fadeInUp, 200ms）
- [x] 6.3 实现列表 stagger 效果（每张卡片延迟 50ms）
- [x] 6.4 实现筛选面板 slideUp 动画（300ms, spring）
- [x] 6.5 实现展开/收起 layout animation（250ms）

## 7. 批量操作 (apps/mobile)

- [x] 7.1 创建 `apps/mobile/src/features/reflections/BatchActionBar.tsx` 批量操作栏组件
- [x] 7.2 实现长按进入选择模式
- [x] 7.3 实现选择模式 UI（已选数量、全选、反选、取消）
- [x] 7.4 实现点击选中/取消功能
- [x] 7.5 实现批量删除功能（带确认对话框）
- [x] 7.6 实现批量置顶/取消置顶功能
- [x] 7.7 实现批量打标签功能

## 8. 列表性能优化 (apps/mobile)

- [x] 8.1 使用 FlashList 替换 FlatList
- [x] 8.2 配置 estimatedItemSize 为 200
- [x] 8.3 提取样式到 StyleSheet.create
- [x] 8.4 使用 useCallback 缓存事件处理函数
- [x] 8.5 优化 useMemo 依赖项

## 9. 统计页面 (apps/mobile)

- [x] 9.1 创建 `apps/mobile/src/features/reflections/ReflectionStatsScreen.tsx` 统计页面
- [x] 9.2 实现总览卡片（总感念、连续天数、本周、本月）
- [x] 9.3 实现 Tab 切换（趋势、热力图、心情、标签）
- [x] 9.4 实现趋势 Tab（近 30 天写作频率折线图）
- [x] 9.5 实现热力图 Tab（GitHub 风格，最近 20 周）
- [x] 9.6 实现心情 Tab（情感趋势 + 分布）
- [x] 9.7 实现标签 Tab（标签云 + 使用频率排行）
- [x] 9.8 添加分享按钮

## 10. 导航集成 (apps/mobile)

- [x] 10.1 在 `navigation/index.tsx` 中添加 ReflectionStats 路由
- [x] 10.2 修改感念页面统计按钮，导航到统计页面
- [x] 10.3 添加页面转场动画

## 11. 测试与验证

- [x] 11.1 测试左滑操作（编辑、置顶）
- [x] 11.2 测试批量操作（选择、删除、置顶、打标签）
- [x] 11.3 测试筛选面板（打开、关闭、筛选、应用）
- [x] 11.4 测试统计页面（各 Tab 显示、数据准确性）
- [x] 11.5 测试性能（大数据量下滚动流畅度）
- [x] 11.6 测试动画效果（进入、stagger、展开收起）
