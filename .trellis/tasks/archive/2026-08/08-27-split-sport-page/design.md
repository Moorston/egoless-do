# 拆分 SportPage — 技术设计

## 1. 当前结构

```
SportPage (CC 44, 852 行)
├── imports: SportPrepPage/ActivePage/ReportPage(已有) + useExerciseTimer/Audio/Rest/AmapComponents(已有) + computeComboTitle(已有)
├── comboState ref (第 69 行) ← 危险区: 渲染期被读
├── currentComboExercise / effectiveSportName / effectiveIcon 派生 ← 提取到 useComboSession
├── goToNextExercise (组合模式前进逻辑) ← 提取到 useComboSession
├── handleSave (第 511 行, CC 21) ← 危险区 + 拆分目标
│   ├── 组合模式分支 → goToNextExercise
│   └── 单运动模式分支 → 构建 entry + addExercise + setBodyFlowState + Health写入
├── handleGpsPause
├── targetInfo / currentSet 派生
└── pageContent 路由 (page === 'prep'/'active'/'transition'/'report')
```

## 2. 目标结构

```
SportPage (编排层, CC ≤15)
├── useComboSession()          → comboState ref + currentComboExercise + goToNextExercise + 派生值
├── useExerciseTimer()(已有) + useExerciseAudio()(已有) + useExerciseRest()(已有)
├── handleSave → 分派:
│   ├── saveComboExercise() → goToNextExercise()
│   └── saveSingleSport() → entry 构建 + addExercise + Health
├── pageContent 路由 (不动)
└── <SportPrepPage/ActivePage/ReportPage>(已有，不动)
```

## 3. 提取边界

### useComboSession

```
返回值:
{
  comboState: React.MutableRefObject<ComboState>,  // ref 在 hook 内创建
  isComboMode: boolean,
  currentComboExercise: ExerciseDef | null,
  effectiveSportName: string,
  effectiveIcon: string,
  effectiveGps: boolean,
  effectiveSportLabel: string,         // useMemo，依赖 effectiveSportName/T
  isGpsSport: boolean,                  // = effectiveGps
  sportType: string,                   // getSportType(effectiveSportName, isGpsSport)
  experienceType: string,              // getSportExperienceType(...)
  bg: string,                          // SPORT_BG_COLORS[effectiveSportName] || color || '#4CAF50'
  calories: number,                    // estimateCalories(effectiveSportName, timer.sec, weight)
  goToNextExercise: () => void,
  handleSaveAll: () => void,           // 组合全部完成聚合保存（goToNextExercise 内部调用，须同 hook 避免循环引用）
  validateCurrentExercise: () => { valid: boolean; message?: string },  // 组合模式验证
  handleComboBack: () => void,         // 组合模式返回确认
  getRestSec: (ex: ExerciseDef) => number,  // 组合模式休息时间
  resetComboSession: () => void,       // 组合会话清理
}

依赖: props (sportType, exercises, comboMode, comboPlanId, planId, planTaskWeekday)
      + store actions (addExercise, setBodyFlowState)
      + timer/sets/calories/sportType/effectiveSportName/effectiveIcon（组合模式状态机读写）
      + musicStop/audio/cleanupSession/stopGpsTracking/nav/T
复杂度预期: ≤15 (组合模式状态机逻辑)
```

> **2026-08-30 前置确认结果（已验证）**：
> - **约束 A — ComboState 类型**：已确认为 SportPage 第 69 行 `useRef<{...}>` 的 inline 字面量类型，**未 export**。提取时需将其定义为命名 type（`ComboState`），置于 `useComboSession.ts` 内 export，SportPage 改为导入该类型。避免类型重复定义。
> - **约束 B — comboState ref**：ref 在 hook 内 `useRef` 创建并返回；主组件透传给渲染期读取点（第 614/845 行 `comboState.current`）保持不变。
> - **约束 C — effect ↔ goToNextExercise**：**已确认 `goToNextExercise` 不在任何 `useEffect` 依赖数组中**（仅在第 518 行 handleSave 内被调用）。`handleSaveAll` 在第 442 行被 `goToNextExercise` 调用、第 748 行被 ComboReportPage 的 `onFinish` 调用，二者均非 effect 依赖。→ **提取后主组件所有 effect 依赖数组不变，无影响**。
> - **约束 D（补充）— handleSaveAll 循环引用**：`goToNextExercise`（第 399 行）在全部完成时调 `handleSaveAll`（第 442 行）。二者必须同处一个 hook，否则跨 hook 引用断裂。故 `useComboSession` 须同时包含 `goToNextExercise` + `handleSaveAll`（+ 配套的 `validateCurrentExercise`/`handleComboBack`/`getRestSec`/`resetComboSession`，均属组合模式）。
> - **约束 E（2026-08-30 补充）— 数据流循环**：`effectiveSportName`（hook 返回）→ `sportType`/`calories`（外部派生）→ `goToNextExercise`（hook 内部，需 `sportType`/`calories` 作为参数）→ 形成 hook 参数依赖 hook 返回值的循环。React hooks 单次调用，无法两阶段。**解法（已采纳）**：扩大 hook 职责，把 `effectiveSportName` 派生的 `effectiveSportLabel`/`isGpsSport`/`sportType`/`experienceType`/`bg`/`calories` 也搬入 hook，由 hook 返回。hook 内部计算顺序自洽（无循环），主组件从返回值解构这些派生量。move-only 兼容（纯表达式搬移，不增加分支/复杂度）。hook 参数新增 `weight`（来自 `userProfile?.weight ?? 70`）和 `color`（来自 `route.params.color`）。

### saveSingleSport / saveComboExercise

```
签名:
saveSingleSport(): void    // 单运动模式保存
saveComboExercise(): void  // 组合模式 → goToNextExercise

依赖: savingRef 防重入 + store actions + comboState
复杂度预期: 各 ≤15
```

**关键约束**：`savingRef` 防重入保护留在 `handleSave` 主入口，子函数不重复防重入检查。拆分后 `handleSave` 变为：`if (savingRef.current) return; ... if (isCombo) saveComboExercise(); else saveSingleSport();`。

## 4. 消费方契约

SportPage 的导出签名、props 不变。消费方（exercise 导航）零改动。

## 5. 风险评估

| 风险 | 等级 | 缓解 |
|------|------|------|
| comboState ref 传递断裂 | **高** | ref 在 hook 内创建并返回，主组件透传给子页面 |
| effect 顺序被打乱 | **高** | effect 留在主组件，不提取到 hook |
| handleSave 依赖项遗漏 | 中 | TypeScript + exhaustive-deps 审查 |
| savingRef 防重入失效 | 中 | savingRef 留在 handleSave 主入口 |
