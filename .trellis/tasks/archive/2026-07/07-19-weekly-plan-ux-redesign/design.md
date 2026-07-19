# Design — 调身计划周计划任务模块 UX 重构

## Architecture

### Component Tree
```
BodyPlanEditorScreen
├── MiniWeekCalendar          ← R1 顶部迷你周历
├── DayPlanMap (map days)
│   └── DayPlanCard           ← R2 天卡片（折叠态/编辑态）
│       ├── DayHeader         ← day toggle, rest state
│       ├── ExerciseList      ← R5 已添加动作（inline edit）
│       │   └── ExerciseCard  ← R4 组数次数内联编辑
│       ├── ExercisePicker    ← R3 动作网格（toggle + 撤销）
│       │   ├── FilterTabs
│       │   ├── SearchBar
│       │   └── ExerciseGrid
│       └── SnackbarHost      ← 撤销 snackbar
└── CTAFooter                 ← R6 主 CTA "开始训练"
```

### Data Flow
```
ViewDate → MiniWeekCalendar (scroll target)
         ↓
DayPlanCard.expanded → ExercisePicker (browse)
                   ↓ user taps
                   toggleExercise() → update store + show snackbar
                   ↓
                   ExerciseList (inline edit/delete)
```

### State Management
- **Store**: 复用现有 `useShallowStore`（bodyTrainingPlans）
- **Local UI state** per day:
  - `expanded: boolean`
  - `exFilter: 'all' | 'traditional' | 'modern'`
  - `muscleGroupFilter: MuscleGroup | 'all'`
  - `search: string`
  - `selection: Set<exId>` — transient, committed to store on "save"
- **Global state**: undo stack (last action, 5s TTL)

### Contracts

#### MiniWeekCalendar Props
```tsx
interface Props {
  days: DayOverview[];        // 7-14 天摘要
  activeDay: number | null;
  onDaySelect: (weekday: number) => void;
  TH: Theme;
  T: (key: string) => string;
}
interface DayOverview {
  weekday: number;            // 1=Mon .. 7=Sun
  dateStr: string;            // YYYY-MM-DD
  status: 'rest' | 'planned' | 'completed' | 'empty';
  intensity?: number;         // 0..1, heatmap color
  partIcon?: string;          // emoji/emoji set
}
```

#### DayPlanCard Props
```tsx
interface Props {
  weekday: number;
  plan: BodyPlanTask;
  isActive: boolean;
  onToggle: () => void;
  onStartTraining: () => void;
  TH: Theme;
  T: (key: string) => string;
}
```

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Toggle vs Confirm | Toggle + snackbar | 对标 Strong/Fitbod；撤销兜底 |
| Inline edit vs Modal | Inline | 对标 Strong；减少操作层级 |
| Calendar | Mini week calendar (7-14 days) | 对标 Keep/Strava 全局周视图 |
| Filter | Muscle group + category + search | 对标 Keep；肌肉粒度 > 动作类型 |
| Rest day | Dedicated visual state | 对标 Strong；区分训练/休息 |
| Animation | LayoutAnimation + Animated.timing | RN 标配 250ms ease-in-out |
| Snackbar | Custom host in DayPlanCard | 撤销上下文局部化 |

## Compatibility & Migration

- **Data model**: 不改 `BodyTrainingPlan` schema（tasks/exercises 结构稳定）
- **Persistence**: 复用 SQLite via `adapter.persistChange`
- **Sync**: 通过 `triggerSync` 自动同步到 PocketBase
- **Backward**: 老的计划数据（无 muscle group 字段）通过 fallback 到 category

## Operational Considerations

- **Perf**: ExercisePickerGrid 用 FlatList + keyExtractor; memoized filter
- **Dark mode**: 所有 color via TH (theme)
- **Accessibility**: `accessibilityRole="button"`, `accessibilityLabel` 本地化
- **Error boundary**: 编辑过程中若 store 崩溃，ErrorBoundary 兜底

## Risks & Rollback

| Risk | Mitigation |
|------|-----------|
| Toggle UI 用户学习成本高 | Snackbar 引导 + 第一天 tooltip |
| Filter 粒度变化导致动作丢失 | Fallback 兼容（muscle group 缺失时用 category）|
| 折叠/展开动画卡顿 | LayoutAnimation.configureNext 低复杂度；低端机 fallback 关闭 |

Rollback: revert single PR; feature flag 可后续加。
