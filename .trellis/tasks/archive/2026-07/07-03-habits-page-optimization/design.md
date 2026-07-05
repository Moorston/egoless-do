# 习惯页优化 — 技术设计

## 架构概览

```
features/habits/
├── HabitsScreen.tsx              # 主入口（< 200行）
├── HabitDetailScreen.tsx         # 详情页（< 300行）
├── HabitStatsSection.tsx         # 统计图表区域（新增）
├── components/
│   ├── HabitCard.tsx             # 习惯卡片
│   ├── HabitFormModal.tsx        # 添加/编辑 Modal
│   ├── HabitActionMenu.tsx       # 长按操作菜单
│   ├── HabitCalendarModal.tsx    # 日历 Modal（包装 CalendarGrid）
│   ├── HabitStatusReasonModal.tsx
│   ├── HabitDeleteConfirmModal.tsx
│   ├── HabitFilterBar.tsx        # 筛选条
│   ├── HabitEmptyState.tsx       # 空状态引导
│   └── HabitCheckinButton.tsx    # 带动画的打卡按钮
├── hooks/
│   ├── useHabitForm.ts           # 表单状态管理
│   └── useHabitActions.ts        # 操作菜单逻辑
└── constants.ts                  # 共享常量（从两个文件提取）
```

## 共享常量迁移

从 `HabitsScreen.tsx` 和 `HabitDetailScreen.tsx` 提取到 `features/habits/constants.ts`:

```typescript
export const STATUS_COLORS: Record<HabitStatus, string> = {
  notStarted: '#888', inProgress: COLORS.GREEN,
  paused: COLORS.YELLOW, abandoned: COLORS.RED, completed: '#7C3AED',
};
export const STATUS_LABELS: Record<HabitStatus, string> = {
  notStarted: 'habitStatusNotStarted', inProgress: 'habitStatusInProgress',
  paused: 'habitStatusPaused', abandoned: 'habitStatusAbandoned',
  completed: 'habitStatusCompleted',
};
export const STATUS_ORDER: Record<HabitStatus, number> = {
  inProgress: 0, notStarted: 1, paused: 2, completed: 3, abandoned: 4,
};
```

## FlatList 修复方案

**问题**: ScrollView 包裹 FlatList 导致虚拟化失效。

**方案**: 移除外层 ScrollView，使用 FlatList 的 `ListHeaderComponent` 和 `contentContainerStyle`:

```tsx
<FlatList
  data={filtered}
  renderItem={renderHabitItem}
  keyExtractor={habitKeyExtractor}
  contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
  ListHeaderComponent={
    <>
      <ScreenHeader ... />
      <HabitFilterBar ... />
    </>
  }
  ListEmptyComponent={<HabitEmptyState />}
/>
```

## 日历复用方案

现有 `CalendarGrid` 接口:
```typescript
interface CalendarGridProps {
  history: Array<{ date: string; done: boolean; grace?: boolean; deleted?: boolean }>;
  primaryColor: string;
  textColor: string;
  subColor: string;
  borderColor: string;
  onDayPress?: (date: string) => void;
}
```

**适配**: 将 `habit.checkedDates` 转换为 `history` 格式:
```typescript
const history = (habit.checkedDates ?? []).map(d => ({ date: d, done: true }));
```

## 打卡动画设计

使用 `react-native-reanimated` 实现:

1. **按压缩放**: 打卡按钮按下时 scale 0.95 → 释放时 1.0
2. **打卡成功**: 勾号图标从 0 缩放到 1，带弹性效果 (withSpring)
3. **卡片反馈**: 打卡成功后卡片短暂高亮

```tsx
const scale = useSharedValue(1);
const checkScale = useSharedValue(0);

const animatedStyle = useAnimatedStyle(() => ({
  transform: [{ scale: scale.value }],
}));

// 打卡成功时
checkScale.value = withSpring(1, { damping: 8, stiffness: 150 });
```

## 统计图表设计

在 `HabitDetailScreen` 中添加统计区域 `HabitStatsSection`:

1. **打卡热力图** — 复用 `HeatmapGrid`，展示过去 3 个月的打卡分布
2. **连续天数柱状图** — 复用 `BarChart`，展示最近 7 周的连续天数
3. **完成率趋势** — 复用 `LineChart`，展示每周完成率

数据计算在 `packages/core/src/business/habits.ts` 中添加纯函数:
- `computeWeeklyCompletionRates(checkedDates, startDate)` → `number[]`
- `computeWeeklyStreaks(checkedDates)` → `number[]`
- `buildHeatmapData(checkedDates, months)` → `HeatmapEntry[]`

## 高级筛选排序设计

扩展 `HabitFilterBar`:

**筛选维度**:
- 状态（已有）
- 关联模块（新增）

**排序维度**:
- 默认（状态优先 + 时间倒序，已有）
- 创建时间（新→旧 / 旧→新）
- 完成率（高→低 / 低→高）
- 连续天数（高→低）

## 数据流

```
用户操作 → HabitsScreen handler → useAppStore action → createHabitSlice → business/habits.ts
                                                        ↓
                                                  adapter.persistChange
                                                        ↓
                                                  SQLite + syncQueue
```

## 兼容性

- 不修改 `Habit` 类型定义
- 不修改 Zustand store 接口
- 不修改业务逻辑函数签名
- 所有改动纯前端 UI 层
