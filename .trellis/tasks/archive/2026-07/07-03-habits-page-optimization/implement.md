# 习惯页优化 — 实施计划

## Phase 1: 代码重构

### Step 1.1: 提取共享常量
- [ ] 创建 `features/habits/constants.ts`
- [ ] 迁移 `STATUS_COLORS`, `STATUS_LABELS`, `STATUS_ORDER`, `ALL_FILTERS`
- [ ] 更新 `HabitsScreen.tsx` 和 `HabitDetailScreen.tsx` 的导入
- 验证: app 启动无报错

### Step 1.2: 创建 useHabitForm hook
- [ ] 创建 `features/habits/hooks/useHabitForm.ts`
- [ ] 提取表单状态 (`form`, `editingId`, `showAdd`, `showAlarmPicker`)
- [ ] 提取 `openAdd`, `openEdit`, `saveHabit` 逻辑
- 验证: 添加/编辑功能正常

### Step 1.3: 创建 useHabitActions hook
- [ ] 创建 `features/habits/hooks/useHabitActions.ts`
- [ ] 提取 `actionMenuHabit`, `statusModal`, `confirmDelete`, `reason` 状态
- [ ] 提取 `changeStatus`, `confirmStatus` 逻辑
- 验证: 长按菜单、状态变更、删除功能正常

### Step 1.4: 抽取 Modal 组件
- [ ] `HabitFormModal.tsx` — 添加/编辑表单
- [ ] `HabitActionMenu.tsx` — 长按操作菜单
- [ ] `HabitStatusReasonModal.tsx` — 暂停/废弃原因
- [ ] `HabitDeleteConfirmModal.tsx` — 删除确认
- [ ] `HabitCalendarModal.tsx` — 使用 CalendarGrid 包装
- 验证: 所有 Modal 功能正常

### Step 1.5: 抽取 HabitCard 组件
- [ ] 创建 `features/habits/components/HabitCard.tsx`
- [ ] 包含卡片内容、统计、进度条、打卡按钮
- 验证: 卡片显示正常

### Step 1.6: 抽取 HabitFilterBar 组件
- [ ] 创建 `features/habits/components/HabitFilterBar.tsx`
- [ ] 包含筛选标签和计数
- 验证: 筛选功能正常

### Step 1.7: 重构 HabitsScreen
- [ ] 移除外层 ScrollView，使用 FlatList 的 ListHeaderComponent
- [ ] 组合子组件
- [ ] 目标: < 200 行
- 验证: 列表滚动流畅，虚拟化生效

### Step 1.8: 重构 HabitDetailScreen
- [ ] 使用共享常量
- [ ] 使用 CalendarGrid 替换手写日历
- [ ] 目标: < 300 行
- 验证: 详情页功能正常

### Step 1.9: 修复硬编码中文和缺失选项
- [ ] 修复 `"愿景："` 使用 i18n key
- [ ] 修复关联模块文本使用 i18n key
- [ ] 添加 sleep 选项到 link 选择器
- [ ] 更新 i18n zh.ts 添加缺失 key
- 验证: 无硬编码中文

### Step 1.10: 运行测试
- [ ] `pnpm test` 确保无回归
- [ ] 手动测试所有习惯操作流程

## Phase 2: UI 优化

### Step 2.1: 空状态优化
- [ ] 创建 `HabitEmptyState.tsx`
- [ ] 包含插图（使用 lucide 图标）、说明文字、创建按钮
- 验证: 无习惯时显示引导

### Step 2.2: 卡片重新设计
- [ ] 优化信息层次
- [ ] 精简信息密度
- [ ] 打卡按钮更突出
- 验证: 视觉效果满意

### Step 2.3: 打卡动画
- [ ] 创建 `HabitCheckinButton.tsx`
- [ ] 使用 reanimated 实现按压缩放和打卡成功动画
- 验证: 动画流畅

### Step 2.4: 列表动画
- [ ] 使用 `react-native-reanimated` LayoutAnimation 或 entering/exiting
- [ ] 列表项进入/退出动画
- 验证: 动画不影响性能

## Phase 3: 功能增强

### Step 3.1: 统计数据计算函数
- [ ] 在 `packages/core/src/business/habits.ts` 添加:
  - `computeWeeklyCompletionRates(checkedDates, startDate)`
  - `computeWeeklyStreaks(checkedDates)`
  - `buildHeatmapData(checkedDates, months)`
- [ ] 添加单元测试
- 验证: 测试通过

### Step 3.2: 统计图表 UI
- [ ] 创建 `HabitStatsSection.tsx`
- [ ] 打卡热力图 (HeatmapGrid)
- [ ] 连续天数柱状图 (BarChart)
- [ ] 完成率趋势折线图 (LineChart)
- [ ] 集成到 HabitDetailScreen
- 验证: 图表数据正确，交互正常

### Step 3.3: 高级筛选排序
- [ ] 扩展 `HabitFilterBar` 添加关联模块筛选
- [ ] 添加排序选项（创建时间、完成率、连续天数）
- [ ] 排序 UI（下拉菜单或按钮组）
- 验证: 筛选排序功能正常

### Step 3.4: 最终测试
- [ ] `pnpm test` 全部通过
- [ ] 手动测试完整流程
- [ ] 性能检查（大量习惯数据下滚动流畅）

## 验证命令

```bash
# 类型检查
pnpm tsc --noEmit

# 测试
pnpm test

# 运行 app
pnpm start --mobile
```

## 风险文件

| 风险 | 等级 | 缓解 |
|------|------|------|
| FlatList 改造破坏滚动 | 中 | 保留 git 历史，可快速回退 |
| CalendarGrid 接口不匹配 | 低 | 如需扩展，修改 CalendarGrid Props |
| reanimated 动画卡顿 | 低 | 使用 `removeClippedSubviews` |
