# 分析并优化习惯页功能和代码

## Goal

全面优化习惯页（HabitsScreen + HabitDetailScreen），通过代码重构、UI 重新设计和功能增强，提升代码质量、用户体验和功能丰富度。

## Background

### 现有文件结构

| 文件 | 行数 | 职责 |
|------|------|------|
| `apps/mobile/src/features/habits/HabitsScreen.tsx` | 518 | 习惯列表 + 5个Modal + 筛选 + 日历 |
| `apps/mobile/src/features/habits/HabitDetailScreen.tsx` | 586 | 习惯详情 + 日历 + 关联感念 |
| `packages/core/src/business/habits.ts` | 141 | 纯业务函数（状态良好） |
| `packages/core/src/business/habits.test.ts` | 128 | 测试（覆盖率可接受） |
| `packages/core/src/store/createHabitSlice.ts` | 107 | Zustand slice（状态良好） |
| `packages/core/src/types/habit.ts` | 37 | 类型定义 |

### 已确认的技术问题

1. **FlatList 嵌套在 ScrollView 内** (HabitsScreen:240+265) — FlatList 虚拟化完全失效
2. **组件过于庞大** — 两个屏幕各 500+ 行，包含 5 个内联 Modal
3. **重复定义** — `STATUS_COLORS`/`STATUS_LABELS` 在两个文件中各定义一遍
4. **日历逻辑重复** — 两个文件各有完整日历渲染，且未复用已有的 `CalendarGrid` 组件
5. **12 个 useState** — 状态管理混乱
6. **硬编码中文** — `"愿景："` (L166) 和关联模块文本 (L169) 未走 i18n
7. **关联模块选择器缺失 sleep** — `HABIT_LINK_OPTIONS` 包含 sleep，但 UI 选择器 (L319) 没有

## Requirements

### Phase 1: 代码重构（不改变功能行为）

**R1. 修复 FlatList 嵌套问题**
- 移除外层 ScrollView，让 FlatList 作为主滚动容器
- 筛选条和头部作为 FlatList 的 `ListHeaderComponent`
- 文件: `HabitsScreen.tsx`

**R2. 抽取子组件**
- `HabitCard` — 单个习惯卡片（含进度条、统计、打卡按钮）
- `HabitFormModal` — 添加/编辑 Modal
- `HabitActionMenu` — 长按操作菜单
- `HabitCalendarModal` — 日历 Modal（或复用 `CalendarGrid`）
- `HabitStatusReasonModal` — 暂停/废弃原因 Modal
- `HabitDeleteConfirmModal` — 删除确认 Modal
- `HabitFilterBar` — 筛选条
- 文件: `apps/mobile/src/features/habits/components/`

**R3. 消除重复常量**
- `STATUS_COLORS`/`STATUS_LABELS`/`STATUS_ORDER` 移到 `packages/core/src/constants/` 或 `packages/core/src/business/habits.ts`
- 两个屏幕都从同一位置导入

**R4. 复用 CalendarGrid 组件**
- 用现有 `apps/mobile/src/components/charts/CalendarGrid.tsx` 替换两个文件中的手写日历
- 如需扩展 CalendarGrid 接口（如支持 checkedDates 模式），在组件层面修改

**R5. 修复硬编码中文**
- `"愿景："` → 使用 i18n key
- 关联模块文本 (禁食/锻炼/冥想) → 使用 i18n key

**R6. 补全 UI 关联模块选择器**
- 添加 `sleep` 选项到 HabitsScreen 的 link 选择器 (L319)

**R7. 提取共享 hooks**
- `useHabitForm` — 管理表单状态
- `useHabitActions` — 封装操作菜单逻辑
- 文件: `apps/mobile/src/features/habits/hooks/`

### Phase 2: UI 优化

**U1. 卡片重新设计**
- 更清晰的信息层次：标题 > 状态徽章 > 统计数据 > 进度条 > 操作
- 精简卡片内容，减少信息密度
- 打卡按钮更突出

**U2. 空状态优化**
- 当没有习惯时显示引导页面
- 包含插图、说明文字和创建按钮

**U3. 动画过渡效果**
- 打卡成功的动画反馈（如勾号动画、缩放效果）
- 列表项进入/退出动画
- 使用 `react-native-reanimated`

### Phase 3: 功能增强

**F1. 习惯统计图表**
- 完成率趋势折线图（复用 `LineChart`）
- 连续天数分布柱状图（复用 `BarChart`）
- 打卡热力图（复用 `HeatmapGrid`）
- 新增 `HabitStatsScreen` 或在 DetailScreen 中添加统计 tab

**F2. 高级筛选排序**
- 按关联模块筛选
- 按创建时间、完成率、连续天数排序
- 筛选器 UI 升级

## Acceptance Criteria

### Phase 1 (重构)
- [ ] FlatList 不再嵌套在 ScrollView 内
- [ ] HabitsScreen 行数 < 200（主文件）
- [ ] HabitDetailScreen 行数 < 300
- [ ] STATUS_COLORS/STATUS_LABELS 只定义一次
- [ ] 日历使用共享 CalendarGrid 组件
- [ ] 无硬编码中文字符串
- [ ] sleep 模块出现在关联选择器中
- [ ] 现有功能行为不变（通过手动测试验证）
- [ ] 现有测试继续通过

### Phase 2 (UI)
- [ ] 卡片信息层次清晰，视觉舒适
- [ ] 空状态有引导
- [ ] 打卡有动画反馈

### Phase 3 (功能)
- [ ] 习惯详情页有统计图表
- [ ] 支持按模块筛选和多维度排序

## Technical Notes

- `react-native-reanimated` (~4.1.1) 和 `react-native-gesture-handler` (~2.28.0) 已安装
- 已有图表组件：`LineChart`, `BarChart`, `HeatmapGrid` 可复用
- 已有 `CalendarGrid` 组件可复用
- Zustand store 结构良好，无需重构
- 纯业务函数 (`habits.ts`) 结构良好，无需重构

## Out of Scope

- 后端/PocketBase 相关改动
- 同步协议改动
- 习惯模板/预设功能
- 社交/分享功能
