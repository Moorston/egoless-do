# 调身页「开始今日锻炼」模块分析

> 分析范围: BodyDashboard + BodyFlow + 子页面交互
> 分析日期: 2026-07-20
> 涉及文件: BodyDashboard.tsx, BodyFlow.tsx, BodyScreen.tsx, useTodayPlan.ts, useBodyFlowState.ts, SportPage.tsx, BreathingScreen.tsx

---

## 模块总览

```
用户操作 → BodyDashboard.banner("开始训练")
                ↓
         BodyScreen.transitionTo('flow')
                ↓
         BodyFlow (4 步骤流程)
           ├─ practice → SportPage → 返回(带结果)
           ├─ breathing → BreathingScreen → 返回(带结果)
           ├─ checkin → BodyCheckinInline → 保存
           └─ success → CheckinSuccessCard → 完成
```

---

## 1. 今日方案 Banner

### 1.1 功能描述

Banner 卡片（轮播第1页）展示用户今天的训练方案，是用户启动训练流程的核心入口。包含三种状态：
- **训练日**：展示训练部位、动作列表、组数/次数/时长 + "开始训练"按钮
- **休息日**：展示休息提示 + 建议运动按钮
- **覆盖日**：在训练日/休息日基础上叠加 override 状态条

### 1.2 数据流

```
useTodayPlan() hook
  ├── bodyPlans (legacy) ──────────→ oldTodayPlan (by weekday match)
  ├── bodyTrainingPlans ───────────→ activeTrainingPlan (status='active')
  │                    └──────────→ todayOverride = plan.overrides[dateStr]
  │                    └──────────→ trainingTodayTask (by weekday)
  │                            └─→ todayPlan (fallback derivation)
  │                            └─→ todayExercises (with override applied)
  └── date computation ────────────→ weekday (1-7), dateStr (YYYY-MM-DD)
```

**todayExercises 解析逻辑** (`useTodayPlan.ts` L61-76):
- `override.type === 'custom'` → 使用 `override.exercises`
- `override.type === 'adjust'` → 合并 adjustments 到原始 exercises
- 其他情况（含 `swap`/`skip`）→ 返回 task.exercises（未修改）

### 1.3 UI 展示

| 区域 | 内容 | 条件 |
|------|------|------|
| Override 状态条 | 跳过/换动作/已调整/已自定义 + 撤销 | `hasOverride === true` |
| 训练日内容 | 部位图标 + 名称 + 备注 + 动作列表 + 开始按钮 | `todayPlanDisplay !== null` |
| 休息日内容 | 睡眠图标 + 休息提示 + 3个建议运动 + 觉知数据 | `todayPlanDisplay === null` |

**"开始训练"按钮逻辑** (BodyDashboard.tsx L387-393):
```tsx
onPress={() => {
  if (activeTrainingPlan?.id) {
    onFlowStartWithPlan?.(activeTrainingPlan.id);  // 有计划 → 带 planId
  } else {
    onFlowStart?.();  // 无计划 → 自由训练
  }
}}
```

### 1.4 发现的问题

| # | 问题 | 严重度 | 说明 |
|---|------|--------|------|
| B-1 | **swap override 未传递到 todayExercises** | 🔴 High | `useTodayPlan` 的 `else` 分支（L73-76）未处理 `swap` 类型，用户换动作后 todayExercises 仍显示原计划动作列表 |
| B-2 | **skip override 仍显示"开始训练"按钮** | 🟡 Medium | 用户标记跳过当天，banner 仍展示原计划 + 开始按钮，预期应为"已跳过"提示 + 撤销操作 |
| B-3 | **todayPlanDisplay 不感知 swap 覆盖** | 🟡 Medium | `PART_STRING_TO_KEY[todayPlan.part]` 使用的是原始 part，swap 后 banner 标签仍为旧部位名 |
| B-4 | **休息日建议按钮未传 planId** | 🟡 Medium | L421-430 三个建议按钮统一调用 `onFlowStart?.()` 不带 planId，用户从休息日建议开始训练会丢失计划关联 |
| B-5 | **i18n 兜底字符串硬编码** | 🟢 Low | L335/342-348/408/410/417-419 等多处使用 `|| '中文兜底'` 模式，破坏 i18n 一致性 |

### 1.5 改进建议

1. **修复 swap override 数据流**：在 `useTodayPlan` 中增加 `swap` 分支，根据 `swapSportKey` 从 EXERCISE_CATEGORIES 查找默认动作或提示"已换为XXX"
2. **skip 状态特殊渲染**：override.type==='skip' 时 banner 显示灰色遮罩 + "已跳过" + 撤销按钮，隐藏"开始训练"
3. **统一 override 感知**：将 override 信息传入 BodyFlow，确保流程中展示的运动项目与 override 一致
4. **清理 i18n 兜底**：移除所有 `|| 'xxx'` 硬编码，确保 key 存在于翻译文件中

---

## 2. 我的训练计划卡片

### 2.1 功能描述

Dashboard 中的卡片组件，展示当前活跃训练计划的关键信息：名称、日期范围、进度条、周计划任务网格。点击跳转 PlanManagement 页面。

### 2.2 数据流

```
bodyTrainingPlans → activeTrainingPlan (find !deleted && status='active')
                                    ↓
planProgress 计算:
  ├── weekStart = today - getDay() + 1  (周一为周起始)
  ├── exerciseLog.filter(planId === activePlanId && timestamp in week)
  ├── activeTasks = tasks.filter(sportKey && sportKey !== 'rest')
  ├── weekDoneTasks = activeTasks.filter(logged this week)
  ├── todayDone = weekLogs.some(planTaskWeekday === today)
  └── return { weekComplete, weekTotal, todayDone, totalDuration, totalCal }
```

**自动过期处理** (BodyDashboard.tsx L79-85):
```tsx
useEffect(() => {
  for (const plan of bodyTrainingPlans ?? []) {
    if (plan.status === 'active' && plan.endDate < today && !plan.deleted) {
      updateBodyTrainingPlan(plan.id, { status: 'completed' });
    }
  }
}, [bodyTrainingPlans, updateBodyTrainingPlan]);
```

### 2.3 UI 展示

| 区域 | 内容 |
|------|------|
| Header | Dumbbell 图标 + 计划名称 + "编辑"/"创建" |
| 基本信息 | 计划名称 + "进行中" 徽章 + 日期范围 + 每周训练天数 |
| 进度条 | "本周进度" + 完成数/总数 + 橙色进度条 |
| 周计划网格 | 4列 flex-wrap 布局，每格显示：星期标签(一~日) + 动作名 + 组数×次数 |

### 2.4 发现的问题

| # | 问题 | 严重度 | 说明 |
|---|------|--------|------|
| P-1 | **周起始日硬编码为周一** | 🟡 Medium | L134 `getDay() + 1` 假设周一为每周第一天，未适配 locale 偏好 |
| P-2 | **动作名称无截断保护** | 🟢 Low | 日网格卡片 fontSize:11, lineHeight:16 无 numberOfLines，长名称可能导致溢出 |
| P-3 | **weekTotal=0 时进度条为 0%** | 🟢 Low | 若计划全部天为 rest，则 weekTotal=0，进度条始终为空 |
| P-4 | **网格固定 4 列可能不适配小屏** | 🟢 Low | `width: 'calc((100% - 24px) / 4)'` 在 320px 屏上每格约 72px，容纳 2 字动作名已显拥挤 |

### 2.5 改进建议

1. 动作名称添加 `numberOfLines={1}` 防止溢出
2. weekTotal=0 时显示"全周休息"而非空进度条
3. 适配周起始偏好（如可以从 settings 读取）

---

## 3. 训练流程 (BodyFlow)

### 3.1 功能描述

4 步骤线性流程：practice → breathing → checkin → success。使用状态机模式管理步骤切换，支持跨组件返回检测。

### 3.2 状态管理

**双重状态源**:
- `useBodyFlowState()` → 持久化到 store (`bodyFlowState`)，跨会话恢复
- 本地 `useState` → `practiceCompleted`, `breathingCompleted`, `breathingDurationMs`, `awarenessData`

**状态同步** (BodyFlow.tsx L154-178):
```tsx
useEffect(() => {
  if (flowState) {
    if (flowState.practiceCompleted) setPracticeCompleted(true);
    if (flowState.breathingCompleted) { ... }
    if (flowState.awarenessData) setAwarenessData(flowState.awarenessData);
  }
}, [flowState]);
```

**返回检测机制**:
- BodyScreen.useFocusEffect 监听 `route.params.sportResult` / `breathingResult`
- 收到结果后：`setReturnTick(t+1)` + `setBodyFlowState({...})`
- BodyFlow.useEffect 监听 returnTick 变化 → 根据当前 step 调用 markPracticeDone/markBreathingDone

### 3.3 各步骤详解

#### Step 1: Practice (运动)

| 状态 | UI | 操作 |
|------|-----|------|
| 有今日计划 + 未完成 | 计划名称 + 运动信息 + 动作列表 + "开始运动" + "选择运动" | 开始 → navigateToSport / 选择 → 显示 ExercisePicker |
| 有今日计划 + 已完成 | 绿色 ✓ + "已完成" | "呼吸练习"按钮 → 进入 breathing |
| 无计划/休息日 + 未完成 | 休息提示 + ExercisePicker | 选择运动 → navigateToSport |
| 无计划 + 已完成 | ✓ + "已完成" | "呼吸练习"按钮 |

**初始运动 key 解析** (L114-120):
```tsx
const getInitialSportKey = () => {
  const raw = todayPlan?.sportKey || todayPlan?.part || trainingPlanTask?.task.sportKey;
  return PART_STRING_TO_KEY[raw] ?? raw;  // 中文→标准 key 映射
};
```

#### Step 2: Breathing (呼吸引导)

| 状态 | UI | 操作 |
|------|-----|------|
| 未完成 | 青色渐变 header + Wind 图标 + 描述 | "开始呼吸" / "跳过" |
| 已完成 | ✓ + "已完成" + 时长 | "身体觉知"按钮 → checkin |

#### Step 3: Checkin (身体觉知打卡)

- BodyCheckinInline 内联组件
- 4 个 1-5 滑块：能量/疼痛/舒适/睡眠
- 标签多选（来自 BODY_TAGS_PRESET）
- 文本输入（最多 500 字）
- "跳过" → success / "保存" → 写入 store → success

#### Step 4: Success (完成总结)

- CheckinSuccessCard 组件
- 总用时（从 startTimeRef 计算）
- 随机鼓励语（从 i18n 的 JSON 数组读取）
- 三步完成状态：practice / breathing / checkin
- 觉知数据维度展示
- "完成"按钮 → resetFlow + onExit

### 3.4 发现的问题

| # | 问题 | 严重度 | 说明 |
|---|------|--------|------|
| F-1 | **状态双重源可能不一致** | 🔴 High | flowState (store) 和本地 useState 同步依赖 useEffect。若 store 更新但组件未重渲染，或时序差异，两端状态可能短暂不一致 |
| F-2 | **returnTick 竞争条件** | 🔴 High | 当 BodyFlow 已经处于 'breathing' 步骤时返回 from Sport，useFocusEffect 正确设置了 flowState 并 tick+1，但 BodyFlow 的 returnTick 监听（L167）判断 `step === 'practice'` 不会触发。这本身是正确的，但依赖 useEffect 的 flowState 同步（L156-158），若此时 practiceCompleted 已设置但组件尚未重渲染，用户可能短暂看到完成前状态 |
| F-3 | **override 未传入 BodyFlow** | 🔴 High | `todayOverride` 在 Dashboard 中计算但未传给 BodyFlow。用户做了 swap/adjust 后，flow 仍显示原计划的 sportKey 和 exercises |
| F-4 | **startTimeRef 不随流程重置** | 🟡 Medium | 仅在 navigateToSport 首次调用时设置。若用户第一次就到 breathing（跳过运动），startTimeRef 保持 0，success 卡片总用时显示 0:00 |
| F-5 | **resetFlow 不清除本地 useState** | 🟡 Medium | `resetFlow()` 仅清空 store 的 bodyFlowState，本地 practiceCompleted/breathingCompleted/awarenessData 不清。下次进入 flow 若组件未卸载，可能看到上次的值 |
| F-6 | **24h 过期检查不够及时** | 🟢 Low | `useBodyFlowState` 的过期检查依赖 `bodyFlowState` 变化才触发。若用户 25h 后打开 app 但 bodyFlowStore 未变化，过期状态会持续 |
| F-7 | **todayTrainingTask 过滤 rest** | 🟡 Medium | BodyScreen L64 `if (!task || task.sportKey === 'rest') return null` — 若今天是 rest day，即使有 activePlan，BodyFlow 也收不到 trainingPlanTask，flow 显示自由训练模式 |

### 3.5 改进建议

1. **消除双重状态源**：移除本地 useState，完全依赖 flowState。使用 `useDerivedStateFromProps` 模式或直接读取 flowState
2. **override 完整传递链**：
   ```
   useTodayPlan().todayOverride → BodyScreen → BodyFlow (新增 prop)
   ```
   BodyFlow 内部用 override 修正 currentPlan 的 sportKey/exercises
3. **resetFlow 同步清除本地状态**：在 useBodyFlowState 中暴露 forceReset 方法，或 BodyFlow 在 onExit 时同步 setState
4. **startTimeRef 在流程入口初始化**：不再等 navigateToSport，在 BodyFlow mount 或 step 首次进入 practice 时即初始化
5. **过期检查改为 mount 时执行**：在 useBodyFlowState 添加 mount 时的立即检查

---

## 4. 子页面交互

### 4.1 Sport Page → Body 返回链路

**写入路径** (SportPage.tsx L329-347):
```
exercise 完成 → addExercise(entry) → result.sportResult = { completed, durationSec, calories, reps, sportKey }
              → nav.navigate('Body', result)
```

**读取路径** (BodyScreen.tsx L71-85):
```
useFocusEffect:
  route.params.sportResult?.completed → setReturnTick(t+1)
                                     → setBodyFlowState({ practiceCompleted: true, practiceDurationSec })
                                     → nav.setParams({ sportResult: undefined })  // 清除防止重复
```

### 4.2 Breathing → Body 返回链路

**写入路径** (BreathingScreen.tsx L59-63):
```
呼吸完成 → nav.navigate('Body', { breathingResult: { completed: true, durationMs } })
         → 本地重置 setStarted(false), setSelectedPreset(null)
```

**读取路径**: 同 useFocusEffect，检测 breathingResult → tick + setBodyFlowState

### 4.3 发现的问题

| # | 问题 | 严重度 | 说明 |
|---|------|--------|------|
| S-1 | **navigate 而非 goBack** | 🟡 Medium | Sport 和 Breathing 都用 `nav.navigate('Body')` 而非 `goBack()`。若导航栈中有其他页面介于其间，可能创建重复路由 |
| S-2 | **结果参数可能重复消费** | 🟡 Medium | useFocusEffect 依赖 `[setBodyFlowState, nav, route]`。route 对象引用频繁变化可能导致 effect 重复执行；虽有 setParams(undefined) 保护但非原子操作 |
| S-3 | **Sport 结果丢失风险** | 🟡 Medium | 若用户在 Sport 页面完成训练后，BodyScreen 已被卸载（如退出 flow），navigate('Body') 会重建 BodyScreen 但 useFocusEffect 可能不触发（首次 mount 无 param），sportResult 被静默丢弃 |
| S-4 | **Breathing 返回后本地状态先重置** | 🟢 Low | BreathingScreen L64 在 navigate 后立即 `setStarted(false)`，若 navigate 失败或用户取消，本地状态已重置需重新选择 |
| S-5 | **planId/planTaskWeekday 仅在 activePlanId 存在时传递** | 🟡 Medium | BodyScreen L94-97: `if (activePlanId && todayTrainingTask)` 才传 planId。从休息日建议按钮进入 flow 时 activePlanId 为 null，Sport 页面写入的 exerciseLog 无 planId 关联 |

### 4.4 改进建议

1. **统一使用 goBack + 回调**：Sport/Breathing 完成后调用 `goBack()`，通过 navigation emit 或 route params 传递结果。避免 navigate 创建新实例
2. **结果消费幂等性**：在 useFocusEffect 中使用 ref 记录已处理的 resultId，防止重复消费
3. **activePlanId 提前设置**：在 onFlowStart（无 planId 版本）中也尝试从 activeTrainingPlan 获取并设置，保证后续 Sport 页面能写入 planId

---

## 5. 导航链路总览

### 5.1 页面切换时序

```
BodyDashboard
  │ 点击"开始训练"
  ↓
BodyScreen.startFlowWithPlan(planId)
  │ setActivePlanId(planId) + transitionTo('flow')
  ↓
BodyFlow (step='practice')
  │ 点击"开始运动"
  ↓
navigateToSport(sportKey)
  │ practiceStartRef = Date.now()
  ↓
SportPage
  │ 训练完成
  ↓
navigate('Body', { sportResult: {...} })
  ↓
BodyScreen.useFocusEffect
  │ setReturnTick(t+1) + setBodyFlowState({ practiceCompleted: true })
  ↓
BodyFlow.useEffect (returnTick 变化)
  │ step==='practice' → markPracticeDone(durSec)
  ↓
BodyFlow (step='breathing')
  │ 点击"开始呼吸"
  ↓
navigateToBreathing()
  ↓
BreathingScreen
  │ 呼吸完成
  ↓
navigate('Body', { breathingResult: {...} })
  ↓
BodyScreen.useFocusEffect → setReturnTick + setBodyFlowState
  ↓
BodyFlow (step='checkin')
  │ 保存/跳过
  ↓
BodyFlow (step='success')
  │ 点击"完成"
  ↓
resetFlow() + onExit() → transitionTo('dashboard') + setActivePlanId(null)
```

### 5.2 参数传递矩阵

| 传递方向 | 参数 | 类型 | 用途 |
|----------|------|------|------|
| Dashboard → Screen | `planId` | `string` | 标识当前活跃计划 |
| Screen → BodyFlow | `todayPlan`, `trainingPlanTask`, `returnTick` | 对象/数字 | 今日方案 + 任务 + 返回 tick |
| BodyFlow → Sport | `sportKey`, `planId`, `planTaskWeekday` | 字符串 | 运动类型 + 计划关联 |
| Sport → Body | `sportResult: { completed, durationSec, calories, reps, sportKey }` | 对象 | 训练结果 |
| BodyFlow → Breathing | (无) | — | 直接导航 |
| Breathing → Body | `breathingResult: { completed, durationMs }` | 对象 | 呼吸结果 |

---

## 6. 边界情况处理评估

| 场景 | 当前处理 | 评估 |
|------|----------|------|
| 无训练计划 | banner 显示休息日 + 建议运动；planCard 显示"创建训练计划" | ✅ 基本合理 |
| 今日为休息日 | todayPlanDisplay=null → 休息日 UI；todayTrainingTask=null → BodyFlow 无计划模式 | ✅ 正确 |
| 今日 override=skip | 显示 override 状态条 + 撤销；但"开始训练"按钮仍可用 | ⚠️ 应禁用或替换 |
| 今日 override=swap | 状态条显示"已换动作"；但 todayExercises 和 todayPlan 未更新 | ❌ 数据不一致 |
| 今日 override=adjust | 状态条显示"已调整组数"；todayExercises 正确合并调整 | ✅ 正确 |
| 今日 override=custom | 状态条显示"已自定义"；todayExercises 使用自定义列表 | ✅ 正确 |
| 计划已过期 | useEffect 自动标记 status='completed' | ✅ 正确 |
| 计划完成庆祝 | CelebrationOverlay 检测 7 天内完成的计划 | ✅ 正确 |
| 24h 未完成的 flow | useBodyFlowState 自动 reset | ⚠️ 仅 state 变化时检查 |
| 从休息日建议进入 flow | activePlanId=null → Sport 不传 planId → exerciseLog 无计划关联 | ⚠️ 数据断裂 |

---

## 7. 架构合规性检查

| 规则 | 状态 | 说明 |
|------|------|------|
| 数据写入通过 adapter.persistChange | ✅ | exerciseLog 通过 addExercise，checkin 通过 upsertBodyCheckin |
| Store 读取使用 useShallow | ✅ | 全部使用 useShallowStore |
| 不跨 feature 引用 | ✅ | body 模块自包含 |
| 无 console.log | ✅ | SportPage 使用 createLogger |
| i18n 规范 | ⚠️ | 存在硬编码中文兜底 |
| 依赖方向 (core ← mobile) | ✅ | 无反向依赖 |

---

## 8. 问题优先级汇总

### 🔴 High (建议立即修复)

1. **B-1/F-3**: swap override 未传递到 todayExercises 和 BodyFlow — 用户换动作后数据不一致
2. **F-1**: 双重状态源 (flowState + 本地 useState) — 可能导致状态不同步
3. **F-2**: returnTick 竞争条件 — 快速切换步骤时可能丢失完成状态

### 🟡 Medium (建议迭代修复)

4. **B-2**: skip override 仍显示"开始训练" — 交互语义不正确
5. **B-3**: todayPlanDisplay 不感知 swap — 标签与实际不符
6. **B-4**: 休息日建议按钮未传 planId — 数据关联断裂
7. **F-4**: startTimeRef 不随流程重置 — 总用时计算错误
8. **F-5**: resetFlow 不清除本地 useState — 跨 flow 状态残留
9. **F-7**: todayTrainingTask 过滤 rest — rest day 进入 flow 丢失计划上下文
10. **S-1/S-5**: navigate vs goBack + planId 传递不完整
11. **S-3**: Sport 结果丢失风险

### 🟢 Low (可后续优化)

12. **B-5**: i18n 兜底字符串硬编码
13. **P-2/P-3/P-4**: 周计划卡片布局微调
14. **F-6**: 24h 过期检查时机
15. **S-4**: Breathing 本地状态重置时序

---

## 9. 推荐修复路径

### Phase 1: 数据一致性 (1-2 天)
- 修复 `useTodayPlan` 的 swap 分支，使 todayExercises 和 todayPlan 反映 swap 后的运动
- 将 `todayOverride` 从 Dashboard 传递到 BodyFlow，修正 currentPlan 计算
- BodyFlow 中消除双重状态源，统一使用 flowState

### Phase 2: 交互语义 (1 天)
- skip override 时 banner 替换为"已跳过"状态 + 撤销
- startTimeRef 在 flow mount 时初始化
- resetFlow 同步清除本地 useState

### Phase 3: 导航健壮性 (1 天)
- 统一使用 goBack + 回调/事件传递结果
- 结果消费幂等性保护
- activePlanId 在 onFlowStart 中也尝试设置

### Phase 4: 打磨 (0.5 天)
- 清理 i18n 兜底硬编码
- 周计划卡片布局适配小屏
- 过期检查改为 mount 时执行
