# Design — 周计划运动选择 UX 优化：一体化网格布局

## Architecture

### Component Changes

```
BodyPlanEditorScreen
├── 📌 UnifiedExercisePool (NEW)     ← 屏幕顶部统一动作池
│   ├── FilterTabs                    ← 复用现有（全部/传统/现代）
│   ├── SearchBar                     ← 复用现有
│   ├── MuscleGroupChips              ← 复用现有
│   └── ExerciseGrid                  ← 复用现有网格布局 + 新增天勾选列表
│
├── DayPlanMap (map days)
│   └── DayPlanCard                   ← 简化：去掉 per-day ExercisePickerGrid
│       ├── DayHeader                 ← 不变
│       ├── ExerciseList              ← 不变（inline edit/remove）
│       │   └── ExerciseCard          ← 不变
│       └── SnackbarHost              ← 不变
│
└── CTAFooter                         ← 不变
```

### Data Flow

```
User taps exercise in UnifiedExercisePool
  → show day checkbox list (7 compact checkboxes)
  → user checks/unchecks days
  → onBlur (or auto-save after 500ms delay):
      for each checked day:
        if exercise already exists → skip
        else → updateTask(day, { exercises: [...existing, newEx] })
  → show snackbar: "已添加到 X 天，已跳过 Y 天（已存在）"
```

### State Changes

**New local state** (in BodyPlanEditorScreen):
```tsx
// Current day-chooser state
const [dayChooserEx, setDayChooserEx] = useState<ExerciseDef | null>(null);
const [selectedDays, setSelectedDays] = useState<Set<number>>(new Set());
```

**Removed from DayPlanCard**:
- `ExercisePickerGrid` rendering (entire expanded-section grid)
- `selectedIds` / `addedExIds` / `onToggle` props

**Kept in DayPlanCard**:
- `ExerciseList` rendering with inline edit/remove
- `SnackbarHost` (for undo of remove/edit)
- `onStartTraining` CTA

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Day chooser UI | Compact 7-checkbox row below the grid | 始终可见，无需弹窗/Modal |
| Auto-save timing | 500ms debounce after last checkbox change | 避免频繁 store 写入 |
| Existing-day visual | Dimmed checkbox + "已有" badge on exercise card | 用户可预期哪些天会跳过 |
| Unified pool height | ~1/3 screen, scrollable within | 足够显示 6-9 个动作卡片 |
| Day labels | "一"/"二"/... or "Mon"/"Tue"/... | 沿用当前 i18n 星期格式 |

## Contracts

### UnifiedExercisePool Props
```tsx
interface Props {
  TH: Theme;
  T: (key: string) => string;
  exerciseLibrary: ExerciseDef[];
  dayTasks: Map<number, ExerciseDef[]>;  // weekday → exercises
  activeDay: number | null;              // current expanded day
  selectedDays: Set<number>;             // current day-chooser selection
  onDayChooserChange: (days: Set<number>) => void;
  onDayChooserEx: ExerciseDef | null;
  onDayChooserSetEx: (ex: ExerciseDef | null) => void;
  onAddToDays: (ex: ExerciseDef, days: number[]) => void;
}
```

### DayPlanCard (simplified) Props
```tsx
interface Props {
  weekday: number;
  plan: BodyPlanTask;
  isActive: boolean;
  onToggle: () => void;
  onStartTraining: () => void;
  onUpdateTask: (weekday: number, patch: Partial<BodyPlanTask>) => void;
  TH: Theme;
  T: (key: string) => string;
  // REMOVED: exerciseLibrary, addedExIds, selectedIds, onToggle, onShowSnackbar
}
```

## Compatibility & Migration

- **Per-day data**: 无变化，无需迁移
- **Store**: 无 schema 变更
- **DayPlanCard**: 简化 props（去掉 exerciseLibrary/addedExIds/selectedIds/onToggle）
- **旧数据**: 已有计划数据不受影响，只是编辑 UI 变化

## Risks & Rollback

| Risk | Mitigation |
|------|-----------|
| 天勾选列表 UI 在窄屏上拥挤 | 7 天用紧凑布局，每个 36px 宽，总宽 252px 可容纳 |
| 统一池高度占用过多屏幕空间 | 可折叠（收起到筛选栏），但先不做，最小可行 |
| 多个天批量写入性能 | max 7 天，一次 store 调用 batch 更新，非逐天写入 |

Rollback: 回退 DayPlanCard 和 BodyPlanEditorScreen 的变更即可。