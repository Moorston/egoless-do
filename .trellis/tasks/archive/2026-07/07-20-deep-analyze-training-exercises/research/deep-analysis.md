# 深度分析：开始今日训练全流程 + 锻炼模块动作/运动缺失分析

> 分析日期：2026-07-20
> 分析范围：`apps/mobile/src/features/practice/body/` + `apps/mobile/src/features/exercise/SportPage.tsx` + `packages/core/src/constants.ts`

---

## 维度 1：开始今日训练全流程问题检查

### 1.1 链路总览

```
BodyDashboard banner "开始训练" 按钮
  └─ onFlowStartWithPlan(planId) / onFlowStart()
      └─ BodyScreen.startFlowWithPlan → setActivePlanId + transitionTo('flow')
          └─ BodyFlow 组件渲染
              ├─ step='practice' → 运动选择/开始
              │   └─ navigateToSport → nav.navigate('Sport', {...})
              │       └─ SportPage → 完成 → nav.navigate('Body', { sportResult })
              │           └─ BodyScreen.useFocusEffect 检测 sportResult → setReturnTick + setBodyFlowState
              ├─ step='breathing' → 呼吸引导
              │   └─ navigateToBreathing → nav.navigate('Breathing')
              │       └─ BreathingScreen → 完成 → nav.navigate('Body', { breathingResult })
              │           └─ BodyScreen.useFocusEffect 检测 breathingResult → setReturnTick + setBodyFlowState
              └─ step='checkin' → 身体觉知记录
                  └─ handleSaveCheckin → store.upsertBodyCheckin + transitionTo('success')
                      └─ step='success' → CheckinSuccessCard → onFinish → resetFlow + transitionTo('dashboard')
```

### 1.2 逐环节问题清单

---

#### 🔴 问题 1：`startTimeRef` 初始为 0 导致 `totalMs` 计算异常

**文件**: `BodyFlow.tsx` 第 258 行

```tsx
const totalMs = Date.now() - startTimeRef.current;
```

**问题**: `startTimeRef` 初始值为 `0`（第 144 行 `useRef(0)`），只有当用户点击"开始运动"按钮时才在 `navigateToSport` 中被赋值为 `Date.now()`（第 191 行）。如果用户跳过运动直接进入觉知步骤（通过 Skip 按钮），`startTimeRef.current` 仍为 `0`。

**后果**: `CheckinSuccessCard` 中 `totalMs = Date.now() - 0 = 一个天文数字`，显示的总时长会是一个荒谬的值（约 56 年）。

**严重度**: 🔴 High — 用户可见的明显错误

---

#### 🔴 问题 2：`navigateToSport` 中 `selectedSportKey` 为空时静默失败

**文件**: `BodyFlow.tsx` 第 321-325 行

```tsx
<PrimaryButton
  label={T('bodyFlowStartSport')}
  onPress={() => { if (selectedSportKey || activeSportKey) navigateToSport(selectedSportKey || activeSportKey); }}
/>
```

**问题**: 当 `selectedSportKey` 和 `activeSportKey` 都为空/undefined 时，按钮点击无任何反馈（静默不响应）。用户会困惑为什么按钮按了没反应。

**触发场景**:
- 用户通过 `onFlowStart()`（无 planId）进入流程
- `todayPlan` 为 undefined（无训练计划）
- `trainingPlanTask` 为 null
- 用户点击"选择其他运动"清除了 `selectedSportKey`，但没有从 picker 中选择新运动就直接点"开始运动"

**严重度**: 🟡 Medium — 功能缺失但不会崩溃

---

#### 🔴 问题 3：`BodyFlow` 中 `step` 与 `flowState` 状态不同步

**文件**: `BodyFlow.tsx` 第 118 行

```tsx
const step = flowState?.step ?? 'practice';
```

**问题**: `flowState` 从 store 中读取，但 `BodyFlow` 组件内部还有独立的 `practiceCompleted`、`breathingCompleted`、`breathingDurationMs`、`awarenessData` 状态（第 147-150 行），这些通过 `useEffect` 从 `flowState` 同步。但 `flowState` 为 `null` 时（首次进入），这些状态都是初始值。

更严重的是：当用户从 SportPage 返回时，`BodyScreen.useFocusEffect` 调用 `setBodyFlowState({ practiceCompleted: true })`，这会更新 store 中的 `bodyFlowState`，触发 `flowState` 变化，`useEffect` 同步到本地状态。但 `BodyFlow` 组件本身**没有监听 `flowState.step` 变化**来更新本地 `step` 变量——`step` 来自 `flowState?.step`，所以 step 是同步的。

但问题在于：`BodyScreen` 中 `useFocusEffect` 的 `setBodyFlowState` 调用会**覆盖** `step` 为默认值 `'practice'`（因为 `setBodyFlowState` 的合并逻辑中 `step` 默认是 `'practice'`，只有当 `current.step` 存在时才保留）。

**实际影响**: 当用户完成运动返回时，如果当前 step 已经是 `'breathing'` 或 `'checkin'`，`setBodyFlowState({ practiceCompleted: true })` 不会改变 step（因为 `current.step` 存在且不是 null），所以 step 保持不变。✅ 这里实际上是安全的。

**但边界情况**: 如果 `bodyFlowState` 为 null（比如被 24h 过期清除了），`setBodyFlowState` 会创建新 state 且 `step: 'practice'`，导致用户回到 practice 步骤。

**严重度**: 🟡 Medium — 边界情况

---

#### 🔴 问题 4：`useFocusEffect` 依赖数组不完整导致闭包陷阱

**文件**: `BodyScreen.tsx` 第 71-85 行

```tsx
useFocusEffect(useCallback(() => {
  const sr = route.params?.sportResult as { completed?: boolean; durationSec?: number } | undefined;
  if (sr?.completed) {
    setReturnTick(t => t + 1);
    setBodyFlowState({ practiceCompleted: true, practiceDurationSec: sr.durationSec ?? 0 });
    (nav as { setParams?: (p: Record<string, unknown>) => void }).setParams?.({ sportResult: undefined });
  }
  // ...
}, [setBodyFlowState, nav, route]));
```

**问题**: 依赖数组包含 `route`（整个 route 对象），但 `route` 在每次导航时可能是新对象引用，导致 `useCallback` 频繁重建。更关键的是，`route.params` 的读取发生在 effect 内部，如果 `route` 对象引用变化但 params 未变，effect 会重复执行。

**实际影响**: 每次页面获得焦点时，如果 `route.params.sportResult` 已经被清除（`setParams({ sportResult: undefined })`），不会重复触发。但如果 `setParams` 调用失败或未生效，可能重复计数。

**严重度**: 🟢 Low — 实际影响较小

---

#### 🔴 问题 5：`nav.setParams` 类型不安全

**文件**: `BodyScreen.tsx` 第 77 行

```tsx
(nav as { setParams?: (p: Record<string, unknown>) => void }).setParams?.({ sportResult: undefined });
```

**问题**: `nav` 被强制转换为包含 `setParams` 的类型，但 `useRootNavigation` 返回的导航对象可能没有 `setParams` 方法（取决于导航库版本/类型定义）。这是一个运行时风险。

**严重度**: 🟡 Medium — 可能导致 sportResult 未被清除，重复触发

---

#### 🔴 问题 6：`BodyFlow` 中 `navigateToSport` 传递的 `sportKey` 可能不在 `ALL_SPORTS` 中

**文件**: `BodyFlow.tsx` 第 190-197 行 + `BodyScreen.tsx` 第 87-98 行

```tsx
// BodyFlow
const navigateToSport = useCallback((sportKey: string) => {
  // ...
  onGoToSport?.(sportKey);
}, [onGoToSport, setSelectedSport]);

// BodyScreen
const handleGoToSport = useCallback((sportKey: string) => {
  const sport = ALL_SPORTS.find(s => s.key === sportKey || s.keyEn === sportKey);
  const navParams: Record<string, unknown> = {
    key: sportKey,
    icon: sport?.icon ?? '🏃',
    color: sport?.color ?? '#f59e0b',
  };
  // ...
  nav.navigate('Sport' as never, navParams as never);
}, [nav, activePlanId, todayTrainingTask]);
```

**问题**: 当用户从 `ExercisePicker` 选择的是 `EXERCISE_CATEGORIES` 中的 key（如 `chest_triceps`、`baduanjin`），这些 key 不在 `ALL_SPORTS` 中。此时 `sport` 为 undefined，`icon` 和 `color` 使用默认值。SportPage 会收到一个它不认识的 `sportKey`。

**后果**: SportPage 中 `getSportType`、`estimateCalories`、`MET_MAP` 等都找不到对应值，使用默认值（MET=4），运动类型默认为 `timed`。用户可能看到错误的 UI 布局。

**严重度**: 🟡 Medium — 训练类别（非具体运动）作为 sportKey 传递时体验不一致

---

#### 🔴 问题 7：`BreathingScreen` 返回结果传递机制不可靠

**文件**: `BreathingScreen.tsx` 第 59-66 行

```tsx
const handleBack = useCallback((completed?: boolean, durationMs?: number) => {
  setStarted(false);
  setSelectedPreset(null);
  if (completed) {
    nav.navigate('Body' as never, { breathingResult: { completed: true, durationMs: durationMs ?? 0 } } as never);
  }
}, [nav]);
```

**问题**: `BreathingScreen` 使用 `nav.navigate('Body', { breathingResult })` 而不是 `nav.goBack()`。这意味着它会**创建一个新的 Body 路由实例**（或导航到已有的），而不是返回之前的 Body 实例。

在 React Navigation 中，`navigate` 到已存在的路由会合并 params，但 `useFocusEffect` 只在页面**获得焦点**时触发。如果 Body 页面已经在栈中，`navigate` 会触发 `useFocusEffect`。

**但关键问题**: `BreathingScreen` 在 `handleBack` 中先执行 `setStarted(false)` 和 `setSelectedPreset(null)`，这会触发 BreathingScreen 重新渲染（显示选择页面），然后才导航。如果导航导致 BreathingScreen 卸载，`setState` 在已卸载组件上调用会有警告。

**严重度**: 🟡 Medium — 可能导致 React 警告或状态不一致

---

#### 🔴 问题 8：`BodyFlow` 中 `returnTick` 检测逻辑的竞态条件

**文件**: `BodyFlow.tsx` 第 162-177 行

```tsx
const prevReturnTick = useRef(returnTick);
useEffect(() => {
  if (returnTick !== undefined && returnTick !== prevReturnTick.current) {
    prevReturnTick.current = returnTick;
    if (step === 'practice' && practiceStartRef.current > 0) {
      // ...
    } else if (step === 'breathing' && breathingStartRef.current > 0) {
      // ...
    }
  }
}, [step, returnTick, markPracticeDone, markBreathingDone]);
```

**问题**: 这个 effect 只在 `step === 'practice'` 或 `step === 'breathing'` 且对应的 `startRef > 0` 时才标记完成。但 `BodyScreen.useFocusEffect` 已经通过 `setBodyFlowState` 设置了 `practiceCompleted: true`，所以这里**双重设置**。

更关键的是：如果用户从 SportPage 返回时 step 已经是 `'breathing'`（用户先完成了运动，进入呼吸页面，然后从呼吸页面又跳转到 SportPage——虽然这不太可能），`practiceStartRef` 的条件判断会出错。

**实际影响**: 在正常流程中，`BodyScreen.useFocusEffect` 已经处理了完成状态，这里的 `returnTick` effect 是**冗余的 fallback**。但如果 `useFocusEffect` 先执行（设置 `practiceCompleted: true`），然后 `returnTick` effect 又执行一次，不会造成问题（幂等）。

**严重度**: 🟢 Low — 冗余但安全

---

#### 🔴 问题 9：`BodyFlow` 中 `practiceStartRef` 在 step 变化时被重置

**文件**: `BodyFlow.tsx` 第 200-205 行

```tsx
useEffect(() => {
  if (step === 'practice') {
    practiceStartRef.current = 0;
    breathingStartRef.current = 0;
  }
}, [step]);
```

**问题**: 当用户完成运动从 step='practice' 过渡到 step='breathing' 再回到 step='practice'（不太可能但理论上），`practiceStartRef` 被重置为 0。

**实际影响**: 正常流程中不会回到 practice，影响极小。

**严重度**: 🟢 Low

---

#### 🔴 问题 10：`BodyDashboard` 中 `todayPlanDisplay` 可能显示错误的图标

**文件**: `BodyDashboard.tsx` 第 189-198 行

```tsx
const todayPlanDisplay = useMemo(() => {
  if (!todayPlan || !todayPlan.part || todayPlan.part === 'rest') return null;
  const mappedKey = PART_STRING_TO_KEY[todayPlan.part] ?? todayPlan.part;
  const cat = EXERCISE_CATEGORIES.find(c => c.key === mappedKey);
  return {
    icon: cat?.icon ?? '🏋️',
    label: cat ? T(cat.i18nKey) : todayPlan.part,
    note: todayPlan.note,
  };
}, [todayPlan, T]);
```

**问题**: 当 `todayPlan.part` 是 `sportKey`（如 `chest_triceps`）时，`PART_STRING_TO_KEY` 映射正确。但当 `todayPlan.part` 直接是运动名（如 `太极`）时，`PART_STRING_TO_KEY['太极']` 为 undefined，`mappedKey = '太极'`，然后 `EXERCISE_CATEGORIES.find(c => c.key === '太极')` 也找不到（因为 `taiji` 才是 key），最终显示 `icon: '🏋️'` 和 `label: '太极'`（原始字符串）。

**严重度**: 🟢 Low — 显示不完美但不会崩溃

---

#### 🔴 问题 11：`BodyScreen` 中 `todayTrainingTask` 依赖 `activePlanId` 但 `activePlanId` 在 `startFlowWithPlan` 中设置

**文件**: `BodyScreen.tsx` 第 59-66 行 + 第 105-108 行

```tsx
const todayTrainingTask = useMemo(() => {
  if (!activePlanId) return null;
  // ...
}, [activePlanId, bodyTrainingPlans, todayWeekday]);

const startFlowWithPlan = useCallback((planId: string) => {
  setActivePlanId(planId);
  transitionTo('flow');
}, [transitionTo]);
```

**问题**: `setActivePlanId(planId)` 和 `transitionTo('flow')` 是同步调用，但 React 状态更新是异步的。`transitionTo` 中的 `setPage(target)` 和 `setActivePlanId` 可能在同一批次中处理。

**实际影响**: 由于 `todayTrainingTask` 依赖 `activePlanId`，而 `activePlanId` 在 `startFlowWithPlan` 中设置，当 `BodyFlow` 首次渲染时，`activePlanId` 可能还是旧值（null），导致 `trainingPlanTask` prop 为 null。

**但**: React 18 的自动批处理会在 `transitionTo` 的动画回调中重新渲染。实际上 `setActivePlanId` 会在 `transitionTo` 的 `setPage` 之前或同时生效，因为 `transitionTo` 有 175ms 的动画延迟。所以 `activePlanId` 会在动画完成前生效。

**严重度**: 🟢 Low — React 18 批处理保证

---

#### 🔴 问题 12：`BodyFlow` 中 `currentPlan` 的 `sportKey` 可能为 undefined

**文件**: `BodyFlow.tsx` 第 220-239 行

```tsx
const currentPlan = useMemo(() => {
  if (trainingPlanTask) {
    return {
      // ...
      sportKey: trainingPlanTask.task.sportKey,
      // ...
    };
  }
  if (todayPlan?.part && todayPlan.part !== 'rest') {
    return {
      name: todayPlan.part,
      sportKey: todayPlan.sportKey ?? todayPlan.part,
      // ...
    };
  }
  return null;
}, [trainingPlanTask, todayPlan]);
```

**问题**: 当 `trainingPlanTask` 存在但 `task.sportKey` 为空字符串 `''` 时（`BodyPlanTask.sportKey` 类型为 `string`，可以是空字符串），`currentPlan.sportKey` 为空字符串。后续 `activeSportKey = currentPlan?.sportKey ?? ''` 也是空字符串，导致"开始运动"按钮条件判断为 false。

**严重度**: 🟡 Medium — 边界情况

---

#### 🔴 问题 13：`CheckinSuccessCard` 中 `totalMs` 可能为负数或极大值

**文件**: `BodyFlow.tsx` 第 258 行 + `CheckinSuccessCard.tsx` 第 39-44 行

```tsx
// BodyFlow
const totalMs = Date.now() - startTimeRef.current;

// CheckinSuccessCard
function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
```

**问题**: 如问题 1 所述，`startTimeRef.current` 为 0 时，`totalMs` 是一个极大值（约 1.7e12 ms），`formatElapsed` 会输出 `29247138:07` 这样的荒谬值。

**严重度**: 🔴 High — 用户可见

---

#### 🔴 问题 14：`BodyFlow` 中 `handleSaveCheckin` 的 `store.upsertBodyCheckin` 可能未定义

**文件**: `BodyFlow.tsx` 第 241-247 行

```tsx
const handleSaveCheckin = useCallback((data: Omit<BodyCheckin, 'id' | 'updatedAt' | 'deleted' | 'synced'>) => {
  store.upsertBodyCheckin(data);
  // ...
}, [store, saveAwareness, transitionTo]);
```

**问题**: `store` prop 来自 `BodyScreen` 的 `{ upsertBodyCheckin }`（第 119 行）。如果 `upsertBodyCheckin` 在 store 中不存在（比如 store 未正确初始化），调用会抛出 `TypeError: store.upsertBodyCheckin is not a function`。

**实际影响**: 在正常使用中 `upsertBodyCheckin` 始终存在，但如果 store 初始化有问题，会导致崩溃。

**严重度**: 🟢 Low — 仅在 store 异常时触发

---

#### 🔴 问题 15：`BodyDashboard` 中 `nav.navigate('ExerciseHistory' as never)` 类型不安全

**文件**: `BodyDashboard.tsx` 第 332 行、第 923 行

```tsx
nav.navigate('ExerciseHistory' as never)
```

**问题**: 使用 `as never` 绕过类型检查。如果路由名拼写错误或路由未注册，运行时会静默失败或抛出不可预测的错误。

**严重度**: 🟡 Medium — 维护风险

---

#### 🔴 问题 16：`BodyDashboard` 中 `nav.navigate('BodyCheckinHistory' as never)` 同上

**文件**: `BodyDashboard.tsx` 第 514 行

**严重度**: 🟡 Medium

---

#### 🔴 问题 17：`BodyDashboard` 中 `nav.navigate('PlanManagement' as never)` 同上

**文件**: `BodyDashboard.tsx` 第 793 行

**严重度**: 🟡 Medium

---

#### 🔴 问题 18：`BodyFlow` 中 `ExercisePicker` 只显示 `EXERCISE_CATEGORIES`，不显示 `ALL_SPORTS`

**文件**: `BodyFlow.tsx` 第 68-104 行

```tsx
function ExercisePicker({ TH, T, onSelect }: ...) {
  const groups = useMemo(() => {
    const map = new Map<string, { key: string; label: string; icon: string }[]>();
    for (const cat of EXERCISE_CATEGORIES) {
      // ...
    }
    return [...];
  }, [T]);
}
```

**问题**: `ExercisePicker` 只渲染 `EXERCISE_CATEGORIES`（训练类别如"胸+三头"、"太极"等），不渲染 `ALL_SPORTS`（具体运动如"俯卧撑"、"跑步"等）。用户无法在 Flow 中选择具体的运动项目。

**严重度**: 🟡 Medium — 功能不完整

---

#### 🔴 问题 19：`BodyFlow` 中 `sportInfo` 查找可能返回 undefined

**文件**: `BodyFlow.tsx` 第 214-218 行

```tsx
const sportInfo = useMemo(() => {
  if (!selectedSportKey) return null;
  return ALL_SPORTS.find(s => s.key === selectedSportKey || s.keyEn === selectedSportKey)
    ?? EXERCISE_CATEGORIES.find(c => c.key === selectedSportKey);
}, [selectedSportKey]);
```

**问题**: 当 `selectedSportKey` 既不在 `ALL_SPORTS` 也不在 `EXERCISE_CATEGORIES` 中时（比如自定义的 sportKey），`sportInfo` 为 undefined。后续代码 `sportInfo && 'icon' in sportInfo` 和 `sportInfo && 'i18nKey' in sportInfo` 会安全返回 false，但 `sportInfo` 为 undefined 时不会崩溃。

**严重度**: 🟢 Low — 有安全检查

---

#### 🔴 问题 20：`BodyFlow` 中 `selectedSportKey` 初始值可能来自 `todayPlan?.part` 而非 `sportKey`

**文件**: `BodyFlow.tsx` 第 119 行

```tsx
const [selectedSportKey, setSelectedSportKey] = useState<string | undefined>(todayPlan?.sportKey || todayPlan?.part || trainingPlanTask?.task.sportKey);
```

**问题**: 当 `todayPlan.part` 是中文描述（如"胸+三头"）时，`selectedSportKey` 初始值为"胸+三头"。这个值不在 `ALL_SPORTS` 或 `EXERCISE_CATEGORIES` 中（`EXERCISE_CATEGORIES` 的 key 是 `chest_triceps`），导致 `sportInfo` 为 undefined。

**严重度**: 🟡 Medium — 显示问题

---

### 1.3 问题汇总表

| # | 严重度 | 文件 | 问题描述 |
|---|--------|------|----------|
| 1 | 🔴 High | BodyFlow.tsx:258 | `startTimeRef` 初始为 0，跳过运动时 totalMs 为天文数字 |
| 2 | 🟡 Medium | BodyFlow.tsx:321-325 | `selectedSportKey` 为空时"开始运动"按钮静默失败 |
| 3 | 🟡 Medium | BodyFlow.tsx:118 | `flowState` 为 null 时 step 回退到 practice |
| 4 | 🟢 Low | BodyScreen.tsx:71-85 | `useFocusEffect` 依赖数组包含整个 route 对象 |
| 5 | 🟡 Medium | BodyScreen.tsx:77 | `nav.setParams` 类型不安全强制转换 |
| 6 | 🟡 Medium | BodyFlow.tsx:190 + BodyScreen.tsx:87 | 训练类别 key 作为 sportKey 传递给 SportPage |
| 7 | 🟡 Medium | BreathingScreen.tsx:59-66 | 先 setState 再导航可能导致已卸载组件警告 |
| 8 | 🟢 Low | BodyFlow.tsx:162-177 | `returnTick` 检测与 `useFocusEffect` 双重设置（冗余但安全） |
| 9 | 🟢 Low | BodyFlow.tsx:200-205 | step 变化时重置 startRef（正常流程不影响） |
| 10 | 🟢 Low | BodyDashboard.tsx:189-198 | `todayPlan.part` 为运动名时图标显示不正确 |
| 11 | 🟢 Low | BodyScreen.tsx:59-66,105-108 | `activePlanId` 异步更新（React 18 批处理保证） |
| 12 | 🟡 Medium | BodyFlow.tsx:220-239 | `sportKey` 为空字符串时按钮条件判断为 false |
| 13 | High | BodyFlow.tsx:258 + CheckinSuccessCard.tsx:39 | startTimeRef=0 causes totalMs overflow, formatElapsed shows absurd value |
| 14 | Low | BodyFlow.tsx:241-247 | store.upsertBodyCheckin undefined crash (only when store is broken) |
| 15 | Medium | BodyDashboard.tsx:332 | nav.navigate('ExerciseHistory' as never) type unsafe |
| 16 | Medium | BodyDashboard.tsx:514 | nav.navigate('BodyCheckinHistory' as never) type unsafe |
| 17 | Medium | BodyDashboard.tsx:793 | nav.navigate('PlanManagement' as never) type unsafe |
| 18 | Medium | BodyFlow.tsx:68-104 | ExercisePicker only shows EXERCISE_CATEGORIES, not ALL_SPORTS |
| 19 | Low | BodyFlow.tsx:214-218 | sportInfo lookup may return undefined (has safety check) |
| 20 | Medium | BodyFlow.tsx:119 | selectedSportKey initial value may come from todayPlan.part (Chinese_desc) |

---

### 1.4 Fix Priority (Dimension 1)

#### P0 MUST FIX
- Issue 1 & 13: Initialize startTimeRef to Date.now() and guard totalMs in BodyFlow.tsx
- Issue 2: Add Alert feedback when sportKey is empty in PrimaryButton onPress

#### P1 SHOULD FIX
- Issue 5: Type-safe setParams call
- Issue 6: Map category keys to sportKey or show sub-picker
- Issue 7: Move setState after navigation in BreathingScreen
- Issue 18: Add SPORT_GROUPS items to ExercisePicker
- Issue 20: Use PART_STRING_TO_KEY for initial selectedSportKey

#### P2 NICE TO HAVE
- Issue 4, 10, 15-17, 19: type safety and fallback improvements

---

## Dimension 2: Exercise/Sport Gap Analysis

### 2.1 Current Sports in Code

#### ALL_SPORTS (21 items from SPORT_GROUPS)
Outdoor Cycling(gps), Indoor Running, Stair Climbing, Tai Chi, Bagua, Xingyi, Iron Bull, Sun Salutation, Push-ups, Pull-ups, Squats, Plank, Burpees, Jump Rope, Yoga, Relaxation, Warm-up, Swimming, Skateboarding(gps), Badminton, Football, Basketball, Table Tennis, Tennis

#### EXERCISE_CATEGORIES (15 items including rest)
baduanjin, wuqinxi, taiji, zhanzhuang, jingluo, yoga, walking, chest_triceps, back_biceps, legs_core, cardio, shoulders_arms, full_body, hiit, rest

#### buildExerciseLibrary() (~43 unique items after dedup)
Traditional(5): Baduanjin, Wuqinxi, Zhanzhuang, Jingluo, Walking
Sports(21): all ALL_SPORTS
Strength Extensions(17): Bench Press, Dumbbell Fly, Cable Pushdown, Barbell Row, Dumbbell Curl, Barbell Squat, Deadlift, Leg Press, Lunge, Overhead Press, Lateral Raise, Front Raise, Plank(dup), Crunch, Leg Raise, Burpee(dup), Jumping Jack, Mountain Climber

### 2.2 Missing Common Sports

#### CRITICAL (high frequency, expected by users)
| Sport | Type | Why Missing |
|-------|------|-------------|
| Outdoor Running | cardio/gps | Only Indoor Running exists |
| Outdoor Walking | cardio/gps | No GPS walking/hiking |
| Pilates | flexibility | Complementary to Yoga |

#### HIGH (popular fitness activities)
| Sport | Type | Why Missing |
|-------|------|-------------|
| Rowing Machine | cardio | Gym standard |
| Boxing/MMA | cardio/strength | HIIT training |
| Dumbbell Press | strength | Basic chest exercise |
| Seated Cable Row | strength | Basic back exercise |
| Leg Extension | strength | Quad isolation |
| Leg Curl | strength | Hamstring isolation |
| Hip Thrust | strength | Glute builder |
| Face Pull | strength | Shoulder health |

#### MEDIUM (niche but notable)
| Sport | Type | Why Missing |
|-------|------|-------------|
| Volleyball | ball | Common team sport |
| Frisbee/Ultimate | full_body | Urban trend |
| Climbing | strength | Rising popularity |
| Surfing | full_body | Seasonal niche |
| Ice Skating | cardio | Winter sport |
| Skiing | full_body | Winter sport |

### 2.3 Should Missing Sports Be Added?

#### YES — CRITICAL additions
1. **Outdoor Running** — Core sport, most expected alongside Indoor Running
2. **Outdoor Walking** — Daily activity baseline
3. **Pilates** — Large audience, complements Yoga category

#### YES — HIGH priority
4. Rowing Machine, Boxing, 4-5 strength movements (leg extension, leg curl, hip thrust, face pull, seated row)

#### LATER — MEDIUM priority
5. Volleyball, Frisbee, Climbing, Winter sports

### 2.4 How To Add Missing Sports

**Primary file**: `packages/core/src/constants.ts`
**Secondary file**: `packages/core/src/types/body.ts`

#### For concrete sports (eg Outdoor Running):
1. Add to SPORT_GROUPS items array
2. Add to GPS_SPORTS / REP_SPORTS / TIMED_SPORTS
3. Add MET value to MET_MAP
4. Add color to SPORT_BG_COLORS
5. Add soft target to SOFT_TARGETS
6. Add to SPORT_TO_CATEGORY
7. Add to getSportMuscleGroups, getSportEquipment, getSportDifficulty
8. Add i18n translations in packages/core/src/i18n/*.ts

#### For training categories (eg Pilates):
1. Add to EXERCISE_CATEGORIES in types/body.ts
2. Update getCategoryZhName in constants.ts if Chinese name collides with SPORT_GROUPS

#### For strength movements:
1. Add to strengthExtensions array in buildExerciseLibrary() in constants.ts

#### Sync checklist for each new sport:
- packages/core/src/constants.ts (SPORT_GROUPS, GPS_SPORTS, MET_MAP, SPORT_BG_COLORS, SOFT_TARGETS, SPORT_TO_CATEGORY, getSportMuscleGroups, getSportEquipment, getSportDifficulty)
- packages/core/src/types/body.ts (EXERCISE_CATEGORIES if it is a category)
- packages/core/src/i18n/en.ts (English translation)
- packages/core/src/i18n/zh.ts (Chinese translation)
- packages/core/src/i18n/zh-Hant.ts (Traditional Chinese translation)

### 2.5 Summary

#### Dimension 1 Key Findings
1. **Most severe bug**: startTimeRef=0 causes ~56-year display for totalMs when user skips sport step
2. **UX gap**: ExercisePicker shows only training category keys, not concrete sports
3. **Type safety**: Multiple `as never` casts in navigation
4. **State sync**: Dual completion-state setters (redundant but safe)

#### Dimension 2 Key Findings
1. **Most missing**: Outdoor Running, Outdoor Walking (GPS sports), Pilates
2. **Strength library**: Has 17 extensions, still missing leg extension, leg curl, hip thrust, face pull
3. **Ball sports**: Has 5, missing volleyball
4. **Addition path**: Primarily one file (constants.ts), clear and well-structured

---

*Analysis completed 2026-07-20*
