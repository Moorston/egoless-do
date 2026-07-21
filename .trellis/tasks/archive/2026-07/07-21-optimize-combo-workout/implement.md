# Implementation: 调身页组合锻炼优化

## Implementation Order

### Step 1: Hooks 扩展 — 暴露 reset() 方法

**文件**: `apps/mobile/src/features/exercise/hooks/useExerciseTimer.ts`

```typescript
// 新增 reset() 方法
export function useExerciseTimer() {
  // ... 现有代码 ...
  
  const reset = useCallback(() => {
    setSec(0);
    setPage('prep');
    setActive(false);
    // 清除倒计时
    if (countdownRef.current) clearInterval(countdownRef.current);
    setCountdown(3);
  }, []);
  
  return { sec, page, active, countdown, /* existing */, reset };
}
```

**验证**: `tsc --noEmit` 通过

---

### Step 2: Hooks 扩展 — useExerciseSets 暴露 reset()

**文件**: `apps/mobile/src/features/exercise/hooks/useExerciseSets.ts`

```typescript
// 新增 reset(newExercise) 方法
export function useExerciseSets(onBellAndRest: () => void) {
  // ... 现有代码 ...
  
  const reset = useCallback((newExercise?: ExerciseDef) => {
    setSets([]);
    setCurrentSetReps(0);
    setTotalReps(0);
    // 根据新动作重置默认值
    if (newExercise?.defaultSets) setTargetSets(newExercise.defaultSets);
    if (newExercise?.defaultReps) setTargetReps(newExercise.defaultReps);
  }, []);
  
  return { sets, currentSetReps, totalReps, /* existing */, reset };
}
```

**验证**: `tsc --noEmit` 通过

---

### Step 3: 导航类型扩展

**文件**: `apps/mobile/src/navigation/types.ts`

```typescript
// 修改 Sport 路由参数
Sport: {
  key: string;
  icon: string;
  color: string;
  gps?: boolean;
  planId?: string;
  planTaskWeekday?: number;
  exercises?: ExerciseDef[];   // 新增: 组合动作列表
  comboPlanId?: string;        // 新增: 组合训练所属计划ID
};
```

**验证**: `tsc --noEmit` 通过

---

### Step 4: 新建 ComboProgressHeader 组件

**文件**: `apps/mobile/src/features/exercise/components/ComboProgressHeader.tsx`

**功能**:
- 顶部固定进度条，显示 "当前动作/总数" + 动作名称
- 点击展开/收起完整动作列表
- 展开列表中：已完成 ✅+时长 / 当前 ▶ / 未开始 ○
- 未开始动作可点击跳转

**Props**:
```typescript
interface ComboProgressHeaderProps {
  exercises: ExerciseDef[];
  currentIndex: number;
  results: { sportKey: string; durationSec: number }[];
  onJumpTo: (index: number) => void;
  TH: Theme;
  T: (key: string) => string;
}
```

**验证**: 组件渲染正常，展开/收起动画流畅

---

### Step 5: 新建 TransitionScreen 组件

**文件**: `apps/mobile/src/features/exercise/components/TransitionScreen.tsx`

**功能**:
- 显示当前动作完成摘要
- 自动休息倒计时（力量 60s / 传统 15s / 有氧 30s）
- 可手动跳过休息
- 预览下一动作
- 全部完成时显示完成总结

**Props**:
```typescript
interface TransitionScreenProps {
  currentExercise: ExerciseDef;
  currentDuration: number;
  nextExercise: ExerciseDef | null;
  onSkipRest: () => void;
  onNext: () => void;
  onFinishAll: () => void;
  TH: Theme;
  T: (key: string) => string;
}
```

**验证**: 倒计时正常工作，手动跳过触发回调

---

### Step 6: SportPage 核心改造

**文件**: `apps/mobile/src/features/exercise/SportPage.tsx`

**改动清单**:

1. **路由参数解析** — 检测 `exercises` 参数
2. **comboState ref** — 管理多动作切换
3. **ComboProgressHeader 集成** — 顶部进度条
4. **TransitionScreen 集成** — 动作间过渡
5. **goToNextExercise()** — 核心切换逻辑
6. **handleSaveAll()** — 全部完成保存
7. **handleSave() 改造** — 组合模式走 combo 保存逻辑
8. **中途退出处理** — 确认对话框
9. **GPS 按需启停** — 动作切换时

**核心逻辑**:

```typescript
// 在 SportPage 顶部
const route = useRoute<Route>();
const { key: sportName, icon, color, gps: gpsParam, planId, planTaskWeekday, exercises: comboExercises, comboPlanId } = route.params;
const isComboMode = !!comboExercises && comboExercises.length > 0;

// comboState ref
const comboState = useRef<ComboState>({
  exercises: comboExercises ?? [],
  currentIndex: 0,
  results: [],
  totalDurationSec: 0,
  totalCalories: 0,
});

// 当前动作
const currentExercise = isComboMode
  ? comboExercises![comboState.current.currentIndex]
  : null;

// 动作切换
const goToNextExercise = useCallback(() => {
  // 1. 保存当前动作结果
  const result = { ... };
  addExercise(entry);
  comboState.current.results.push(result);
  comboState.current.totalDurationSec += timer.sec;
  comboState.current.totalCalories += calories;
  
  // 2. 检查是否还有下一动作
  comboState.current.currentIndex++;
  if (comboState.current.currentIndex < comboExercises!.length) {
    // 重置 hooks
    timer.reset();
    sets.reset(comboExercises![comboState.current.currentIndex]);
    // GPS 按需切换
    stopGpsTracking();
    if (isGpsSportForExercise(comboExercises![comboState.current.currentIndex])) {
      startGpsTracking();
    }
    // 进入过渡页
    setPage('transition');
  } else {
    // 全部完成
    handleSaveAll();
  }
}, [timer, sets, calories, ...]);
```

**改动量**: ~200 行新增/修改

**验证**: `tsc --noEmit` 通过

---

### Step 7: BodyFlow 传递 exercises

**文件**: `apps/mobile/src/features/practice/body/BodyFlow.tsx`

**改动**: 
- 从 `todayPlan` 或 `trainingPlanTask` 中提取 `exercises` 列表
- 传递给 BodyScreen 的 `onGoToSport`（或直接传给导航）

```typescript
// 在 navigateToSport 中:
const handleStartTraining = useCallback(() => {
  const key = selectedSportKey || activeSportKey;
  if (key) {
    navigateToSport(key);
  }
}, [selectedSportKey, activeSportKey, navigateToSport]);
```

**注意**: BodyFlow 的 `onGoToSport` 回调由 BodyScreen 实现，所以核心改动在 BodyScreen。

**验证**: `tsc --noEmit` 通过

---

### Step 8: BodyScreen handleGoToSport 改造

**文件**: `apps/mobile/src/features/practice/BodyScreen.tsx`

**改动**:
```typescript
const handleGoToSport = useCallback((sportKey: string) => {
  // 获取今日动作列表
  const todayExercises = useTodayPlan().todayExercises;
  const sport = ALL_SPORTS.find(s => s.key === sportKey || s.keyEn === sportKey);
  const navParams: Record<string, unknown> = {
    key: sportKey,
    icon: sport?.icon ?? '🏃',
    color: sport?.color ?? '#f59e0b',
  };
  
  // 组合模式: 传递所有动作
  if (todayExercises && todayExercises.length > 1) {
    navParams.exercises = todayExercises;
    navParams.comboPlanId = activePlanId ?? undefined;
    // 补全每个动作的 icon/color
  } else {
    // 单运动模式: 原有逻辑
    if (activePlanId && todayTrainingTask) {
      navParams.planId = activePlanId;
      navParams.planTaskWeekday = todayTrainingTask.task.weekday;
    }
  }
  
  nav.navigate('Sport' as never, navParams as never);
}, [nav, activePlanId, todayTrainingTask, todayExercises, ...]);
```

**验证**: `tsc --noEmit` 通过

---

### Step 9: 类型检查与验证

```bash
pnpm run type-check
```

## 风险点与回滚

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| SportPage 复杂度增加 | 维护难度 | 用 `isComboMode` 清晰分支，新增逻辑与原有逻辑隔离 |
| hooks 新增 reset() 影响现有使用方 | 类型错误 | 确保 reset() 为可选调用，不破坏现有接口 |
| 组合模式退出时数据丢失 | 用户数据 | 每个动作完成时立即 `addExercise` 保存 |
| 导航参数类型变更 | 编译错误 | 使用可选字段 `exercises?`，现有调用不受影响 |

## 回滚点

1. Step 1-2 完成后: hooks 扩展是纯新增，可安全回滚
2. Step 3 完成后: 类型变更，回滚需恢复 types.ts
3. Step 6 完成后: SportPage 是核心改动，需仔细测试后提交
4. Step 7-8 完成后: BodyScreen/BodyFlow 改动，回滚需恢复这两个文件

建议在每个 Step 完成后运行 `pnpm run type-check` 确保类型安全。