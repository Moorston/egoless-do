# 训练流程链路完整分析

> 分析范围：从 `BodyDashboard` "开始训练"按钮 → `BodyScreen` → `BodyFlow` → Sport/Breathing 子页面 → 打卡 → 完成
> 分析日期：2026-07-20

---

## 流程总览

```
BodyDashboard.tsx [今日方案 banner]
  └─ onFlowStartWithPlan(activeTrainingPlan.id)
      └─ BodyScreen.tsx::startFlowWithPlan(planId)
          ├─ setActivePlanId(planId)
          ├─ transitionTo('flow')
          └─ 渲染 BodyFlow 组件
              ├─ Step 1: practice (调身练习)
              │   ├─ navigateToSport(sportKey) → Sport 页面
              │   └─ 返回后: markPracticeDone + transitionTo('breathing')
              ├─ Step 2: breathing (调息安神)
              │   └─ navigateToBreathing() → Breathing 页面
              │   └─ 返回后: markBreathingDone + transitionTo('checkin')
              ├─ Step 3: checkin (身体感受打卡)
              │   ├─ handleSaveCheckin → transitionTo('success')
              │   └─ handleSkipCheckin → transitionTo('success')
              └─ Step 4: success (完成总结)
                  └─ onFinish → resetFlow + transitionTo('dashboard')
```

---

## 环节 1：BodyDashboard — 今日方案 banner

**文件**: `apps/mobile/src/features/practice/body/BodyDashboard.tsx`

### 1.1 "开始训练"按钮触发逻辑 (L386-399)

```tsx
<TouchableOpacity
  onPress={() => {
    if (activeTrainingPlan?.id) {
      onFlowStartWithPlan?.(activeTrainingPlan.id);
    } else {
      onFlowStart?.();
    }
  }}
```

| 检查项 | 结果 | 说明 |
|--------|------|------|
| 数据传递 | ✅ | 有 activeTrainingPlan 时传 planId，否则走 onFlowStart |
| 空计划处理 | ✅ | activeTrainingPlan 为 undefined 时降级到 onFlowStart |

### 1.2 今日动作列表显示 (L368-385)

| 检查项 | 结果 | 说明 |
|--------|------|------|
| 动作名称显示 | ✅ | `e.nameZh` 正常显示 |
| 组数×次数 | ✅ | `${sets}组×${reps}次` 格式正确 |
| 仅组数 | ✅ | `${sets}组` |
| 仅时长 | ✅ | `${Math.round(dur / 60)}分钟` |
| 都为空时 | ⚠️ **问题** | 当 sets/reps/dur 全为 undefined 时只显示动作名称，无 fallback 提示 |

### 1.3 Override 撤销按钮 (L347-349)

```tsx
<TouchableOpacity onPress={handleUndoOverride} ...>
```

| 检查项 | 结果 | 说明 |
|--------|------|------|
| handleUndoOverride | ✅ | 清除今日 override |

### 1.4 `selectedDayDate` 引用时序问题 (L266-279)

```tsx
const handleDaySwap = useCallback((sportKey, exercises) => {
  if (!selectedDay) return;
  setOverride(selectedDayDate, { ... });  // L268
}, [selectedDay, selectedDayDate, setOverride]);

const handleDaySkip = useCallback(() => {
  if (!selectedDay) return;
  setOverride(selectedDayDate, { ... });  // L278
}, [selectedDay, selectedDayDate, setOverride]);
```

`selectedDayDate` 在 L306 定义为 `getSelectedDayDate()`，是一个在每次渲染时重新计算的普通 `const`。**不是 state，不是 ref**。

| 检查项 | 结果 | 说明 |
|--------|------|------|
| 闭包新鲜度 | ⚠️ **问题** | `selectedDayDate` 是 `useCallback` 的依赖项之一。但其值每次渲染都重新计算，`useCallback` 的身份也每次渲染都变化。这导致 `handleDaySwap`/`handleDaySkip` 的引用每次渲染都变化，且由于 React Hook 调用顺序约束，`selectedDayDate` 定义在 `handleDaySwap`/`handleDaySkip` 之后。虽然运行时不会崩溃（因为 `const` 在模块作用域下会 hoisting...不对，`const` 不会 hoisting），但实际上 `handleDaySwap` 引用了它自己的「未来」定义 — 这是**ReferenceError 风险** |

**🔴 严重**: `handleDaySwap`(L266) 和 `handleDaySkip`(L276) 引用了 `selectedDayDate`(L306)。`selectedDayDate` 是一个 `const`，在 `handleDaySwap` 定义之后的代码中声明。虽然 `useCallback` 的闭包在**调用时**才会读取 `selectedDayDate`（此时已初始化），但 **ESLint 的 `no-use-before-define` 应该会报错**。运行时不会崩溃，但代码顺序混乱，重构时极易出错。

### 1.5 BMI 计算 (L465)

```tsx
{ value: profile.weight && profile.height ? `${(profile.weight / ((profile.height / 100) ** 2)).toFixed(1)}` : '-', unit: '', label: 'BMI' }
```

| 检查项 | 结果 | 说明 |
|--------|------|------|
| 类型安全 | ⚠️ | `profile` 是 `Record<string, unknown>`，`profile.weight` 做除法时 TS 应该报错，但这里用了 `String(item.value)` 包裹所以不直接报错。实际运行时能工作但不类型安全 |

---

## 环节 2：BodyScreen — 页面容器

**文件**: `apps/mobile/src/features/practice/BodyScreen.tsx`

### 2.1 `startFlowWithPlan` (L106-109)

```tsx
const startFlowWithPlan = useCallback((planId: string) => {
  setActivePlanId(planId);
  transitionTo('flow');
}, [transitionTo]);
```

| 检查项 | 结果 | 说明 |
|--------|------|------|
| 设置 activePlanId | ✅ | 设置后BodyFlow才能找到今日任务 |
| 页面切换动画 | ✅ | fade out → setPage → fade in |

### 2.2 `todayTrainingTask` 计算 (L59-66)

```tsx
const todayTrainingTask = useMemo(() => {
  if (!activePlanId) return null;
  const plan = (bodyTrainingPlans ?? []).find(p => p.id === activePlanId && !p.deleted && p.status === 'active');
  if (!plan) return null;
  const task = plan.tasks.find(t => t.weekday === todayWeekday);
  if (!task || task.sportKey === 'rest') return null;
  return { planId: plan.id, planName: plan.name, task };
}, [activePlanId, bodyTrainingPlans, todayWeekday]);
```

| 检查项 | 结果 | 说明 |
|--------|------|------|
| 休息日过滤 | ✅ | `task.sportKey === 'rest'` 时返回 null |
| 非活跃计划 | ✅ | 只返回 status='active' 的计划 |
| planId 传递 | ✅ | `activeTrainingPlan.id` → `startFlowWithPlan` → `setActivePlanId` → `todayTrainingTask` |

### 2.3 `useFocusEffect` + 结果返回机制 (L71-86)

```tsx
useFocusEffect(useCallback(() => {
  setReturnTick(t => t + 1);  // 每次获得焦点都 tick+1

  const sr = route.params?.sportResult;
  if (sr?.completed) {
    setBodyFlowState({ practiceCompleted: true, practiceDurationSec: sr.durationSec ?? 0 });
    (nav as { setParams?: ... }).setParams?.({ sportResult: undefined });
  }
  const br = route.params?.breathingResult;
  if (br?.completed) {
    setBodyFlowState({ breathingCompleted: true, breathingDurationMs: br.durationMs ?? 0 });
    (nav as { setParams?: ... }).setParams?.({ breathingResult: undefined });
  }
}, [setBodyFlowState, nav]));  // ← route 不在依赖数组中！
```

| 检查项 | 结果 | 说明 |
|--------|------|------|
| **🔴 `route` 缺失依赖** | 🔴 **严重** | `route.params` 被读取但 `route` 不在 `useCallback` 依赖数组中。`route` 对象每次渲染都是新的引用，但 `useCallback` 只在 `setBodyFlowState` 或 `nav` 变化时更新闭包。由于 `setBodyFlowState`/`nav` 通常是 stable 引用，这个 `useCallback` 的闭包**永远不会更新**，`route.params` 一直捕获的是第一次渲染时的空值 |
| `nav.setParams` ✅ | ✅ | Sport 页面通过 `nav.navigate('Body', result)` 返回时，`result` 对象被合并到 route params 中 |
| `breathingResult` 永远收不到 | 🔴 **严重** | Breathing 页面 `handleFinish → onBack → handleBack` 只是 `setStarted(false); setSelectedPreset(null);`，**不会 navigate 回 Body**，也不会设置任何 `breathingResult` 参数。用户完成呼吸后停留在 BreathingScreen 的选择页面，需要手动返回。因此 `route.params?.breathingResult` 永远是 `undefined` |

### 2.4 `handleGoToSport` (L88-100)

```tsx
const handleGoToSport = useCallback((sportKey: string) => {
  const sport = ALL_SPORTS.find(s => s.key === sportKey || s.keyEn === sportKey);
  const navParams = { key: sportKey, icon: sport?.icon ?? '🏃', color: sport?.color ?? '#f59e0b' };
  if (activePlanId && todayTrainingTask) {
    navParams.planId = activePlanId;
    navParams.planTaskWeekday = todayTrainingTask.task.weekday;
  }
  nav.navigate('Sport', navParams);
}, [nav, activePlanId, todayTrainingTask]);
```

| 检查项 | 结果 | 说明 |
|--------|------|------|
| planId 传递 | ✅ | 有 planId 和 task 时才附加 |
| planTaskWeekday | ✅ | 传递 task.weekday |
| 空 sportKey | ⚠️ | 如果 `sportKey` 为空字符串仍会 navigate，Sport 页面可能收到无效 key |

### 2.5 `handleGoToBreathing` (L102-104)

```tsx
const handleGoToBreathing = useCallback(() => {
  nav.navigate('Breathing');
}, [nav]);
```

| 检查项 | 结果 | 说明 |
|--------|------|------|
| 无参数传递 | ⚠️ | Breathing 页面不知道自己在哪个 plan 上下文中，无法回传 breathingResult |

---

## 环节 3：BodyFlow — 训练流程主组件

**文件**: `apps/mobile/src/features/practice/body/BodyFlow.tsx`

### 3.1 双重状态管理冲突 (L107-161)

```tsx
const { flowState, setStep, markPracticeDone, markBreathingDone, saveAwareness, setSelectedSport, resetFlow } = useBodyFlowState();

const [localStep, setLocalStep] = useState<FlowStep>('practice');
const step = flowState?.step ?? localStep;
```

| 检查项 | 结果 | 说明 |
|--------|------|------|
| **🟡 双重状态源** | 🟡 **中等** | `step` 同时由 `flowState?.step`（store 持久化）和 `localStep`（组件 state）管理。当 `flowState` 为 null 时用 `localStep`，但 `flowState.step` 初始默认是 `'practice'`（来自 `createBodySlice` L265），所以 `localStep` 几乎永远不会被使用 |
| **🟡 useEffect 单向同步** | 🟡 | L155-161: `useEffect` 只在 `flowState` 变化时同步到 local state，但反向不成立。这意味着：如果用户操作更新了 `localStep`，`flowState` 不会被同步 |

### 3.2 `transitionTo` 同时更新两处 (L126-144)

```tsx
const transitionTo = useCallback((newStep: FlowStep) => {
  // ...动画...
  setStep(newStep);      // 更新 store
  setLocalStep(newStep); // 更新 local state
}, [fadeAnim, setStep]);
```

| 检查项 | 结果 | 说明 |
|--------|------|------|
| 双重更新 | ⚠️ | 同时调用 `setStep`（→ `setBodyFlowState` → store 持久化）和 `setLocalStep`。两个状态更新会触发两次渲染，且在 `setStep` 后 store 变化又会触发 L155 useEffect 再次 `setLocalStep`（相同值，无副作用但浪费） |

### 3.3 `practiceStartRef` 时序问题 (L147-148, L168-178)

```tsx
const practiceStartRef = useRef(0);  // L147
// ...
useEffect(() => {
  if (returnTick !== undefined && returnTick !== prevReturnTick.current) {
    prevReturnTick.current = returnTick;
    if (step === 'practice' && practiceStartRef.current > 0) {
      const durSec = Math.floor((Date.now() - practiceStartRef.current) / 1000);
      setPracticeCompleted(true);
      markPracticeDone(durSec);
    }
  }
}, [step, returnTick, markPracticeDone, markBreathingDone]);
```

| 检查项 | 结果 | 说明 |
|--------|------|--------------|
| returnTick 机制 | ⚠️ | BodyScreen 的 `useFocusEffect` 每次 Body 页获得焦点就 `setReturnTick(t+1)`。**这意味着用户按系统返回键回到 Body 页时也会触发tick**，即使用户没有真正完成运动。如果用户正在 Sport 页面，按回到 Body（不保存），也会被当作"完成"处理 |
| **🔴 practiceStartRef 初始为 0** | 🔴 **严重** | `practiceStartRef.current` 初始值为 0（即 1970-01-01 的时间戳...不，0 就是 0）。条件 `practiceStartRef.current > 0` 在首次 navigateToSport 之前为 false。但如果用户手动返回到 Body 页时 `practiceStartRef.current` 仍然是 0（没有调用过 navigateToSport），条件不触发——这是正确的。然而，如果用户先完成 Sport 后再次进入 BodyFlow，`practiceStartRef.current` 已经被设为 Sport 开始时间戳，下一次 focus 会重复触发计算 |

### 3.4 Practice 步骤 — 动作列表显示 (L265-341)

```tsx
{trainingPlanTask && (
  <View style={{ marginBottom: 16 }}>
    <Text>{currentPlan?.name}</Text>
    {planExercises.length > 0 ? (
      planExercises.map((ex, i) => (
        <View key={i}>
          <Text>
            {ex.icon} {ex.nameZh || ex.name}
            {ex.defaultSets && ex.defaultReps ? `  ${ex.defaultSets}×${ex.defaultReps}` : ''}
            {ex.defaultWeight ? `  ${ex.defaultWeight}kg` : ''}
            {ex.defaultDurationSec ? `  ${Math.round(ex.defaultDurationSec / 60)}min` : ''}
          </Text>
        </View>
      ))
    ) : (
      <Text>{T('bodyPlanNoExercises')}</Text>  // "暂无推荐动作"
    )}
  </View>
)}
```

| 检查项 | 结果 | 说明 |
|--------|------|------|
| 计划名称 | ✅ | `currentPlan?.name` 显示训练计划名 |
| 动作名称 | ✅ | `ex.nameZh \|\| ex.name` |
| 组数×次数 | ✅ | `${sets}×${reps}` 格式（无中文"组"字样） |
| 重量 | ✅ | `${weight}kg` |
| 时长 | ✅ | `${Math.round(durationSec/60)}min` |
| 都为空时 | ⚠️ | 如果 sets/reps/weight/durationSec 全为 undefined，只显示 `icon + name` |
| key 使用 index | ⚠️ | `key={i}` 而非 `key={ex.id}`，可能在 override 变更时导致渲染错乱 |

### 3.5 🔴 按钮标签错误 (L314-319)

```tsx
<PrimaryButton
  label={T('bodyFlowStartBreathing')}   // ← "开始调息"
  onPress={() => navigateToSport(selectedSportKey || activeSportKey || '')}  // ← 实际是去运动！
  color="#f59e0b"
  icon={<Activity size={18} color="#fff" />}  // ← 运动图标
/>
```

**🔴 严重 UX 问题**: 按钮文字是 "开始调息"（bodyFlowStartBreathing），但点击后执行 `navigateToSport`——**去运动页面**。文字和动作完全不匹配。应该使用类似 "开始运动" 的翻译键。

对比 L377 的呼吸按钮：
```tsx
<PrimaryButton label={T('bodyFlowStartBreathing')} onPress={navigateToBreathing} ... />
```
这才是正确的"开始调息"按钮。

L314 的按钮需要一个新 i18n key（如 `bodyFlowStartPractice` / `bodyFlowStartSport`），目前 **没有这个 key 存在**。

### 3.6 休息日判断 (L266)

```tsx
const isTodayRestDay = todayPlan?.part === 'rest' || trainingPlanTask?.task.sportKey === 'rest';
const hasTodayPlan = currentPlan !== null && !currentPlan.isRest;
```

| 检查项 | 结果 | 说明 |
|--------|------|------|
| 休息日显示 | ✅ | 显示 "今日休息日" + ExercisePicker |
| 有今日计划 | ✅ | 显示动作列表 + 开始运动按钮 |

### 3.7 `currentPlan` 推导逻辑 (L213-232)

```tsx
const currentPlan = useMemo(() => {
  if (trainingPlanTask) {
    return {
      name: trainingPlanTask.planName,
      sportKey: trainingPlanTask.task.sportKey,
      exercises: trainingPlanTask.task.exercises ?? [],
      isRest: trainingPlanTask.task.sportKey === 'rest',
    };
  }
  if (todayPlan?.part && todayPlan.part !== 'rest') {
    return {
      name: todayPlan.part,
      sportKey: todayPlan.sportKey ?? todayPlan.part,
      exercises: [] as BodyPlanTask['exercises'],
      isRest: false,
    };
  }
  return null;
}, [trainingPlanTask, todayPlan]);
```

| 检查项 | 结果 | 说明 |
|--------|------|------|
| trainingPlanTask 优先 | ✅ | 优先使用训练计划数据 |
| todayPlan 降级 | ✅ | 无训练计划时使用旧 bodyPlan |
| exercises 为空 | ⚠️ | 当使用 todayPlan 降级时，`exercises: []`，Plan 步骤只显示部位名称，无具体动作 |

### 3.8 `selectedSportKey` 初始值 (L120)

```tsx
const [selectedSportKey, setSelectedSportKey] = useState<string | undefined>(
  todayPlan?.sportKey || todayPlan?.part || trainingPlanTask?.task.sportKey
);
```

| 检查项 | 结果 | 说明 |
|--------|------|------|
| 初始值来源 | ⚠️ | 依赖 todayPlan 和 trainingPlanTask。如果都为空/undefined，`selectedSportKey` 为 `undefined`。L316 的 `navigateToSport(selectedSportKey || activeSportKey || '')` 最终可能传空字符串 |

---

## 环节 4：Sport 页面返回

**文件**: `apps/mobile/src/features/exercise/SportPage.tsx`

### 4.1 完成运动返回 Body (L329-347)

```tsx
result.sportResult = {
  completed: true,
  durationSec: timer.sec,
  calories,
  reps: finalReps ?? 0,
  sportKey: sportName,
};
// ...
try { nav.navigate('Body', result); } catch { savingRef.current = false; }
```

| 检查项 | 结果 | 说明 |
|--------|------|------|
| sportResult 格式 | ✅ | `{ completed, durationSec, calories, reps, sportKey }` |
| navigate 参数 | ✅ | 参数通过 `nav.navigate('Body', result)` 合并到 route.params |
| 返回 Body 页 | ✅ | 导航回 Body 页面 |

### 4.2 Sport 页面入口参数 (L58)

```tsx
const { key: sportName, icon, color, gps: gpsParam, planId, planTaskWeekday } = route.params;
```

| 检查项 | 结果 | 说明 |
|--------|------|------|
| 参数解构 | ✅ | 需要 key/icon/color + 可选的 planId/planTaskWeekday |

---

## 环节 5：Breathing 页面返回

**文件**: `apps/mobile/src/features/breathing/BreathingEngine.tsx` + `BreathingScreen.tsx`

### 5.1 呼吸完成流程 (L347-357 + L364-387 in BreathingEngine)

```tsx
const handleFinish = useCallback(() => {
  // ...清理动画...
  onBack();  // ← 调用 BreathingScreen 传入的 onBack
}, [holdAnim, holdScale, onBack]);

// BreathingScreen:
const handleBack = useCallback(() => {
  setStarted(false);      // ← 只重置 BreathingScreen 内部状态
  setSelectedPreset(null);
}, []);
```

| 检查项 | 结果 | 说明 |
|--------|------|------|
| **🔴 不返回 Body 页** | 🔴 **严重** | 呼吸完成后只回到 BreathingScreen 的预设选择页面，**不会导航回 Body**。用户需要手动按系统返回键或导航栏返回 |
| **🔴 `breathingResult` 永远不会被设置** | 🔴 | 没有任何代码调用 `nav.navigate('Body', { breathingResult: ... })`。BodyScreen 的 `route.params?.breathingResult` 永远为 `undefined` |

### 5.2 对 BodyFlow 的影响

由于呼吸页面不返回 Body，BodyFlow 的几种完成呼吸的路径：

1. **`useFocusEffect` 路径**（L71-86 in BodyScreen）— 收不到 breathingResult
2. **`returnTick` 路径**（L165-179 in BodyFlow）— 当用户手动从 BreathingScreen 返回到 Body 页时，`returnTick` 会增加，如果此时 `breathingStartRef.current > 0` 会触发 `markBreathingDone`。**这是唯一能检测到呼吸完成的路径，但需要用户手动导航回去**

---

## 环节 6：Checkin 打卡

**文件**: `apps/mobile/src/features/practice\body\BodyCheckinInline.tsx`

### 6.1 打卡数据保存 (L27-29)

```tsx
const handleSave = () => {
  onSave({ date: dateStr(), energy, pain, comfort, sleep: sleepQuality, tags: selectedTags, note: note || undefined });
};
```

| 检查项 | 结果 | 说明 |
|--------|------|------|
| 必填字段 | ✅ | energy/pain/comfort/sleep 有默认值 (3/1/3/3) |
| note 可选 | ✅ | `note \|\| undefined` |
| 日期 | ✅ | `dateStr()` = 今天 |

### 6.2 BodyFlow 的 handleSaveCheckin (L234-240)

```tsx
const handleSaveCheckin = useCallback((data) => {
  store.upsertBodyCheckin(data);
  const checkinData: BodyCheckin = { ...data, id: '', updatedAt: Date.now(), deleted: false, synced: false };
  setAwarenessData(checkinData);
  saveAwareness(checkinData);   // ← 调用 hook 方法
  transitionTo('success');
}, [store, saveAwareness, transitionTo]);
```

| 检查项 | 结果 | 说明 |
|--------|------|------|
| 保存到 store | ✅ | `store.upsertBodyCheckin(data)` |
| 更新 flow state | ✅ | `saveAwareness` 同时设置 awarenessData 和 step='success' |
| step 同步 | ✅ | transitionTo('success') 同时更新 localStep |

---

## 环节 7：Success 完成总结

**文件**: `apps/mobile/src/features/practice\body\CheckinSuccessCard.tsx`

### 7.1 总结显示 (L46-134)

| 检查项 | 结果 | 说明 |
|--------|------|------|
| 总耗时 | ✅ | `formatElapsed(totalMs)` 从 flow 开始计算 |
| 运动/呼吸/打卡状态 | ✅ | ✅/⏭️ 图标 + 已完成/已跳过 |
| 呼吸时长 | ✅ | `${Math.floor(breathingDurationMs / 60000)}${T('bodyMin')}` |
| 打卡详情 | ✅ | 显示能量/疼痛/舒适/睡眠数值 |
| 鼓励语 | ✅ | 从 `bodyEncouragements` JSON 数组随机选取 |
| 完成按钮 | ✅ | `onFinish → resetFlow() + onExit()` |

### 7.2 `totalMs` 计算 (### 7.2 `totalMs` 计算 (L251 in BodyFlow)

```tsx
const totalMs = Date.now() - startTimeRef.current;
```

`startTimeRef` 在组件挂载时设为 `Date.now()`（L146），是 BodyFlow 组件的生命周期，**不是用户实际开始运动的时间**。如果用户在 BodyFlow 页面停留很久再开始运动，`totalMs` 会偏大。

| 检查项 | 结果 | 说明 |
|--------|------|------|
| 计时起点 | ⚠️ | 从 BodyFlow 挂载开始计时，而非从第一次点击"开始运动"开始 |

---

## 环节 8：退出流程

### 8.1 退出确认 (L181-190 in BodyFlow)

```tsx
const handleExitPress = useCallback(() => {
  Alert.alert(
    T('bodyFlowExitConfirm'),
    undefined,
    [
      { text: T('bodyCancel'), style: 'cancel' },
      { text: T('bodyFlowSkip'), style: 'destructive', onPress: () => { resetFlow(); onExit(); } },
    ]
  );
}, [T, onExit, resetFlow]);
```

| 检查项 | 结果 | 说明 |
|--------|------|------|
| 二次确认 | ✅ | Alert 弹窗确认 |
| 清理状态 | ✅ | `resetFlow()` + `onExit()` |
| 保留记录 | ✅ | 已完成的打卡记录保存在 store 中 |

### 8.2 返回 Dashboard (L126 in BodyScreen)

```tsx
onExit={() => { setActivePlanId(null); transitionTo('dashboard'); }}
```

| 检查项 | 结果 | 说明 |
|--------|------|------|
| 清理 activePlanId | ✅ | 重置为 null |
| 动画切换回 dashboard | ✅ | fade 动画过渡 |

---

## 环节 9：useBodyFlowState Hook

**文件**: `apps/mobile/src/features/practice/body/hooks/useBodyFlowState.ts`

### 9.1 状态持久化 (L260-283 in createBodySlice.ts)

```tsx
setBodyFlowState(updates) {
  set(s => {
    const current = s.bodyFlowState;
    return {
      bodyFlowState: {
        step: 'practice',
        selectedSportKey: '',
        // ... defaults
        ...current,
        ...updates,
        updatedAt: Date.now(),
      },
    };
  });
  const state = get().bodyFlowState;
  if (state) adapter.persistSettings('_bodyFlow', state).catch(e => log.error(e));
},
```

| 检查项 | 结果 | 说明 |
|--------|------|------|
| 合并更新 | ✅ | `...current, ...updates` 正确合并 |
| 持久化 | ✅ | 写入 `_bodyFlow` 本地设置 |

### 9.2 24h 过期 (L35-39)

```tsx
useEffect(() => {
  if (bodyFlowState && Date.now() - bodyFlowState.updatedAt > BODY_FLOW_EXPIRY_MS) {
    resetBodyFlowState();
  }
}, [bodyFlowState, resetBodyFlowState, BODY_FLOW_EXPIRY_MS]);
```

| 检查项 | 结果 | 说明 |
|--------|------|------|
| 过期机制 | ✅ | 24小时未更新自动重置 |
| 依赖数组 | ⚠️ | `BODY_FLOW_EXPIRY_MS` 是模块级常量，放入 deps 数组无害但多余 |

---

## 环节 10：Celebration 庆祝弹层

**文件**: `apps/mobile/src/features/practice/body/screens/CelebrationOverlay.tsx` + `BodyDashboard.tsx` L88-128

| 检查项 | 结果 | 说明 |
|--------|------|------|
| 触发条件 | ✅ | 检测最近完成的训练计划 |
| 数据计算 | ✅ | 完成天数、总时长、总卡路里 |
| 显示 | ✅ | 粒子动画 + 统计数据 |
| 关闭 | ✅ | 点击任意位置关闭 |

---

## 问题汇总表

### 🔴 严重 (会导致功能错误)

| # | 文件:行号 | 问题描述 |
|---|-----------|----------|
| 1 | `BodyFlow.tsx:314-319` | **按钮标签错误**: "开始运动"按钮使用了 `T('bodyFlowStartBreathing')`（显示"开始调息"），但实际功能 `navigateToSport` 是去运动页面。文字与行为完全不匹配 |
| 2 | `BodyScreen.tsx:71-86` | **`route` 缺失依赖**: `useFocusEffect` 内读取 `route.params` 但 `route` 不在 `useCallback` 依赖数组中。`route` 是每次渲染的新引用，但 `useCallback` 只在 `setBodyFlowState`/`nav` 变化时更新——这两个通常不变，导致闭包内 `route.params` 永远是初始空值，`sportResult`/`breathingResult` 永远检测不到 |
| 3 | `BreathingEngine.tsx:356` + `BreathingScreen.tsx:59-62` | **呼吸完成后不返回 Body**: `handleFinish → onBack → handleBack` 只重置 BreathingScreen 内部状态，停留在呼吸预设选择页。用户必须手动按返回键才能回 Body。且没有任何代码传递 `breathingResult` 参数 |
| 4 | `BodyFlow.tsx:147,168-178` | **`practiceStartRef` 重复触发**: 首次进入 BodyFlow 时 `practiceStartRef.current = 0`（安全），但如果用户多次进出 BodyFlow（比如去看运动记录再回来），`practiceStartRef.current` 可能残留旧值，导致下次 focus 误判为"完成运动" |

### 🟡 中等 (体验问题/边界case)

| # | 文件:行号 | 问题描述 |
|---|-----------|----------|
| 5 | `BodyFlow.tsx:107-161` | **双重状态管理**: `flowState.step`（store）和 `localStep`（component state）同时存在。`useEffect(L155-161)` 单向同步 `flowState → localStep`，但 `localStep` 变更不反向同步到 store。当 `flowState` 初始为 null 时用 `localStep`，但 `setStep` 调用后 store 又会产生 `flowState`，两者可能不一致 |
| 6 | `BodyFlow.tsx:251` | **总耗时计算不准**: `totalMs = Date.now() - startTimeRef`，`startTimeRef` 在 BodyFlow 挂载时设定，包含用户在 practice 步骤停留的时间 |
| 7 | `BodyScreen.tsx:71-72` | **returnTick 过度触发**: 每次 Body 页获得焦点都 `setReturnTick(t+1)`，包括用户从 Sport 页面按系统返回（未保存）的情况。BodyFlow 的 `useEffect(L165-179)` 会因此误判为"已完成运动" |
| 8 | `BodyDashboard.tsx:266-279` | **变量引用顺序混乱**: `handleDaySwap`(L266)、`handleDaySkip`(L276) 引用了 `selectedDayDate`(L306)。虽然运行时不会崩溃（`const` 在闭包调用时已初始化），但代码顺序违反直觉，重构时容易出错 |
| 9 | `BodyFlow.tsx:293` | **列表 key 使用 index**: `planExercises.map((ex, i) => <View key={i}>` 使用数组 index 做 key，当 override 变更导致 exercise 列表变化时可能导致渲染错乱 |

### 🟢 轻微 (代码质量/可读性)

| # | 文件:行号 | 问题描述 |
|---|-----------|----------|
| 10 | `BodyDashboard.tsx:371-377` | 动作详情 fallback 缺失：sets/reps/durationSec 全为 undefined 时只显示名称，无 "暂无详细说明" 提示 |
| 11 | `BodyFlow.tsx:316` | `navigateToSport(selectedSportKey || activeSportKey || '')` 可能传空字符串到 Sport 页面 |
| 12 | `BodyFlow.tsx:126-144` | `transitionTo` 同时调用 `setStep` 和 `setLocalStep`，触发两次渲染 |
| 13 | `BodyDashboard.tsx:465` | BMI 计算中 `profile.weight` / `profile.height` 是 `unknown` 类型做除法，缺少类型断言 |
| 14 | `useBodyFlowState.ts:39` | `BODY_FLOW_EXPIRY_MS` 是模块级常量却被放入 `useEffect` 依赖数组，多余 |

---

## 修复优先级建议

1. **P0 — 立即修复**: #1 (按钮标签错误，用户会困惑)、#2 (route 依赖缺失，sportResult 永远检测不到)、#3 (呼吸不返回 Body)
2. **P1 — 尽快修复**: #4 (practiceStartRef 重复触发)、#5 (双重状态管理混乱)、#7 (returnTick 误判)
3. **P2 — 计划修复**: #6/#8/#9/#10/#11/#12/#13/#14

---

## 数据流验证

### Sport 运动记录写入链路 ✅
```
SportPage.handleSave → addExercise(entry) → adapter.persistChange → SQLite
                                    → triggerSync → SyncEngine → PocketBase
```
- `entry` 包含 `planId` 和 `planTaskWeekday`（L324-326 in SportPage）
- 数据正确写入

### Checkin 打卡写入链路 ✅
```
BodyCheckinInline.handleSave → onSave → store.upsertBodyCheckin → adapter.persistChange → SQLite
```
- 正确写入

### Celebration 数据读取链路 ✅
```
BodyDashboard.useMemo → 过滤 bodyTrainingPlans → 找 recentlyCompleted → 统计 exerciseLog
```
- 只读操作，无写入副作用

---

## 边界情况覆盖

| 场景 | 处理 | 结果 |
|------|------|------|
| 无训练计划（activeTrainingPlan = undefined） | onFlowStart() → transitionTo('flow')，todayTrainingTask=null | ✅ 允许自选运动 |
| 休息日（sportKey='rest'） | todayTrainingTask=null，todayPlanDisplay=null，显示 "今日休息日" + 轻运动建议 | ✅ UI 正确 |
| Override 跳过 | hasOverride=true，banner 显示 "已标记跳过" + 撤销按钮 | ✅ UI 正确 |
| Override 换动作 | swapSportKey 应用到 todayExercises | ✅ banner 显示正确的部位 |
| Override 调整组数 | exerciseAdjustments merge 到 exercises | ✅ |
| 退出流程再返回 | bodyFlowState 从 store 恢复（24h 内），step 保持上次位置 | ✅ 跨会话恢复可用 |
| 运动后不保存直接退出 | Sport 页面 goBack()，nav 不回传 sportResult，BodyFlow 通过 returnTick 检测（但可能不准） | ⚠️ 见问题 #7 |
| 呼吸后返回 | 用户需手动从 BreathingScreen 返回 Body，returnTick 检测呼吸完成 | 🔴 见问题 #3 |
