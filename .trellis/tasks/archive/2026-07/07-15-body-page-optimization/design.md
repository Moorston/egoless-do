# 调身页全面优化 — 技术设计

## 概述

本文档涵盖 4 个优化阶段的技术设计：Dashboard 翻新 (R1)、BodyFlow 流程增强 (R2)、训练计划升级 (R3)、SportPage 优化 (R4)。按此顺序依次实施。

---

## R1: Dashboard UI 翻新

### 组件架构

```
BodyScreen
├── AnimatedDashboard (可折叠 + 动画)
│   ├── Section: 今日训练 (默认展开)
│   │   └── BodyTodayPlanCard (增强动效)
│   ├── Section: 身体档案 (默认展开)
│   │   ├── BodyProfileCard (增强)
│   │   └── BodyGoalCard (修复 progress)
│   ├── Section: 训练计划 (默认展开)
│   │   ├── BodyTrainingPlanSection (增强进度)
│   │   ├── BodyWeekPlanCard (合并 WeeklyExecCard)
│   │   └── BodyTrainingPlanSection 内嵌「从模板」入口
│   └── Section: 数据趋势 (默认折叠)
│       ├── BodyAwarenessCard (增强趋势图)
│       └── WeightTrendChart (增强)
├── BodyFlow (独立页面)
└── Modals (保持现有 Modal 结构)
```

### 新组件: CollapsibleSection

```typescript
// 通用可折叠 Section 包装器
interface CollapsibleSectionProps {
  title: string;
  icon: ReactNode;
  defaultExpanded?: boolean;
  badge?: string | number;  // 右上角标记（如完成度）
  children: ReactNode;
  // 动画效果
  animationDuration?: number;
}
```

- 状态管理：`collapsedSections: Record<string, boolean>` 为 BodyScreen 的 useState
- 展开/折叠时使用 `Animated.Layout` 或 `Animated.timing` 过渡高度
- Section header 使用渐变背景色，右侧图标旋转动画

### Card 视觉统一

| 属性 | 值 |
|------|-----|
| borderRadius | 16 (统一) |
| padding | 16 (统一) |
| 背景 | TH.card + 1px border + 轻微阴影 |
| Section header 渐变色 | 各 Section 独立主题色（amber/green/purple/blue） |
| 大数字字体 | `FONT_STAT_CARD()` (现有) |
| 过渡动画 | 淡入 + 上移 (300ms) |

### Bug 修复

**BodyDashboard.tsx:67** — `updateBodyTrainingPlan` 未解构
```typescript
// 修复：在 useShallowStore 选择器中添加
const { /* ... */ updateBodyTrainingPlan } = useShallowStore(s => ({
  // ...
  updateBodyTrainingPlan: s.updateBodyTrainingPlan,  // ← 添加此行
}));
```

**GoalCard.tsx:18** — progress 硬编码
```typescript
// 修复：使用 calcGoalProgress 计算实际进度
const progress = calcGoalProgress(
  currentWeight,                    // profile.weight
  goal?.targetWeight,
  goal?.initialWeight ?? currentWeight,  // 需要 BodyGoal 增加 initialWeight 字段
);
// 注意：BodyGoal 缺少 initialWeight 字段，需要在 types/body.ts 中添加
```

### BodyGoal 类型扩展

```typescript
export interface BodyGoal extends Syncable {
  id: string;
  targetWeight?: number;
  targetBodyFat?: number;
  initialWeight?: number;   // ← 新增
  initialBodyFat?: number;  // ← 新增
  targetDate?: string;
  strategy?: BodyStrategy;
  note?: string;
}
```

### 文件变更清单

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `BodyScreen.tsx` | 修改 | 添加 CollapsibleSection, 添加切换动画 |
| `BodyDashboard.tsx` | 修改 | 重新组织 Section, 修复 updateBodyTrainingPlan Bug |
| `BodyProfileCard.tsx` | 修改 | 合并 GoalCard 片段, 视觉升级 |
| `GoalCard.tsx` | 修改 | 修复 progress 计算, 简化为嵌入 ProfileCard |
| `packages/core/src/types/body.ts` | 修改 | BodyGoal 增加 initialWeight/initialBodyFat |
| `packages/core/src/business/body.ts` | 修改 | 更新 createBodyGoal |
| `packages/core/src/store/createBodySlice.ts` | 修改 | 适配 BodyGoal 新字段 |
| `body/components/CollapsibleSection.tsx` | **新增** | 通用可折叠 Section |

---

## R2: BodyFlow 流程增强

### 状态机重构

提取独立的 hook `useBodyFlowState` 管理所有 flow 状态：

```typescript
// 持久化到 store 的 flow 状态
interface BodyFlowPersistedState {
  step: FlowStep | null;          // null = 无进行中的 flow
  selectedSportKey: string;
  practiceCompleted: boolean;
  practiceDurationSec: number;
  breathingCompleted: boolean;
  breathingDurationMs: number;
  awarenessData: BodyCheckin | null;
  activePlanId: string | null;
  startedAt: number;             // 用于总时长计算
}
```

```typescript
// useBodyFlowState hook
function useBodyFlowState() {
  // 从 store 读取/写入 bodyFlowState
  // 提供 setStep, markPracticeDone, markBreathingDone, saveAwareness, resetFlow
  // onExit 时重置 bodyFlowState = null
}
```

### 返回检测机制 (导航参数)

**SportPage → BodyFlow 的回传：**
```typescript
// SportPage 完成后传递参数
nav.navigate('Body', {
  sportResult: {
    completed: true,
    durationSec: timer.sec,
    calories: calories,
    reps: sets.totalReps,
    sportKey: sportName,
  }
});
```

**BodyScreen 读取：**
```typescript
// 在 useFocusEffect 中读取 route.params?.sportResult
// 如果存在且 step === 'practice'，则 markPracticeDone
```

**BreathingScreen → BodyFlow 的回传：**
```typescript
nav.navigate('Body', {
  breathingResult: {
    completed: true,
    durationMs: breathingDuration,
  }
});
```

### 步间过渡动画

```typescript
// 使用 Animated API 实现淡入/淡出
const fadeAnim = useRef(new Animated.Value(1)).current;

function transitionTo(newStep: FlowStep) {
  // 1. 淡出当前步骤 (300ms)
  Animated.timing(fadeAnim, { toValue: 0, duration: 300 }).start(() => {
    // 2. 切换步骤
    setStep(newStep);
    // 3. 淡入新步骤 (400ms)
    Animated.timing(fadeAnim, { toValue: 1, duration: 400 }).start();
  });
}
```

### 进度恢复流程

```typescript
// 进入 BodyScreen
// 1. 检查 store.bodyFlowState
// 2. 如果有 step != null → 自动进入 flow 模式，恢复到上次步骤
// 3. 如果 step === null → 显示 dashboard

// 注意：如果 flow 状态超过 24 小时未更新，自动清除（状态过期）
```

### 完成页增强

在 CheckinSuccessCard 中增加：
- 运动时长 vs 计划的对比
- 本次运动的关键指标卡片
- 鼓励性语录（随机从预设列表中选择）

### 文件变更清单

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `BodyFlow.tsx` | **重构** | 提取状态管理到 useBodyFlowState |
| `BodyScreen.tsx` | 修改 | 读取导航参数、恢复 flow 进度 |
| `hooks/useBodyFlowState.ts` | **新增** | Flow 状态管理 + store 持久化 |
| `CheckinSuccessCard.tsx` | 修改 | 增加更多数据回顾 + 鼓励语录 |
| `packages/core/src/store/createBodySlice.ts` | 修改 | 添加 bodyFlowState 字段 |
| `SportPage.tsx` | 修改 | 完成后通过导航参数回传结果 |
| `BreathingScreen.tsx` | 修改 | 完成后通过导航参数回传结果 |

---

## R3: 训练计划功能增强

### 预设模板导入

**TemplatePickerModal 设计：**
```
┌─────────────────────────────┐
│ 从模板导入                   │
│ ┌─────────────────────────┐ │
│ │ 🧘 传统养生 28天         │ │
│ │ 入门级 · 维持 · 每日~30min │ │
│ │ 八段锦/五禽戏/站桩/太极   │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ 💪 PPL 推拉腿 28天       │ │
│ │ 进阶级 · 增肌 · 每周6练  │ │
│ │ 卧推/划船/深蹲/引体向上   │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ 🔥 减脂 4周              │ │
│ │ 进阶级 · 减脂 · 每周6练  │ │
│ │ HIIT/跳绳/跑步/全身循环   │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ 🏠 自重训练 4周          │ │
│ │ 入门级 · 塑形 · 每周3练  │ │
│ │ 俯卧撑/深蹲/平板支撑      │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

**数据流：**
```typescript
// 1. 用户点击「从模板导入」
// 2. TemplatePickerModal 展示 PLAN_TEMPLATES
// 3. 用户选中模板
onSelectTemplate(template: PlanTemplate) {
  // 填充编辑器字段
  setName(T(template.nameI18nKey));
  setStrategy(template.strategy);
  setEndDate(calculateEndDate(template.durationDays));
  
  // 转换 weekSchedule → tasks
  setTasks(template.weekSchedule.map(schedule => ({
    weekday: schedule.weekday,
    sportKey: schedule.sportKey,
    exercises: schedule.exercises?.map(ex => ({
      id: `template_${uid()}`,
      nameZh: ex.name,
      /* 从动作库匹配或创建 ExerciseDef */
    })) ?? [],
  })));
}
```

### 全屏庆祝动画

```typescript
// CelebrationOverlay 组件
// 使用 Animated API 实现粒子效果
// 不使用第三方粒子库，而是用手动 Animated Views
// 15-20 个随机大小/颜色的圆圈，从底部飞升到顶，透明度渐变
// 配合 scale bounce 动画
// 显示 3 秒后自动隐藏，或用户点击关闭
```

**统计摘要内容：**
- 计划名称 + 时长（X 周）
- 完成率（X/Y 天已完成）
- 总运动时长 (小时)
- 总消耗卡路里
- 体重/体脂变化（若有数据）
- 持续天数徽章

### 合并 BodyWeekPlanCard + WeeklyExecCard

保留 BodyWeekPlanCard 的 7 天网格视图（视觉更好），
在其网格上叠加 WeeklyExecCard 的执行标记逻辑。

### 文件变更清单

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `BodyPlanEditorScreen.tsx` | 修改 | 添加模板导入按钮 + 弹窗 |
| `modals/TemplatePickerModal.tsx` | **新增** | 模板选择弹窗 |
| `screens/CelebrationOverlay.tsx` | **新增** | 完成庆祝动画 |
| `BodyDashboard.tsx` | 修改 | 检测计划完成，触发庆祝 |
| `BodyWeekPlanCard.tsx` | 修改 | 合并 WeeklyExecCard 逻辑 |
| `WeeklyExecCard.tsx` | **删除** | 功能已合并到 WeekPlanCard |

---

## R4: SportPage 体验优化

### PrepPage 精简

- 按频率排序运动类型：最近使用排最前
- 非 GPS 运动直接隐藏地图预览区域
- 目标模式 (free/target) 选择更紧凑

### ReportPage 增强

```
┌──────────────────────────┐
│  ✅ 运动完成！            │ (渐变色 header)
│  🏃 跑步 · 35:20         │
├──────────────────────────┤
│  本次数据                  │
│  ┌────┐ ┌────┐ ┌────┐   │
│  │5.2 │ │385 │ │5:20│   │
│  │km  │ │kcal│ │/km │   │
│  └────┘ └────┘ └────┘   │
├──────────────────────────┤
│  近7天对比                 │
│  [小型柱状图]              │
│  周一 周二 周三 ...        │
├──────────────────────────┤
│  卡路里明细                │
│  本次 385kcal (当日32%)   │ (环形进度条)
└──────────────────────────┘
```

### 暂停/结束交互优化

- 暂停时显示大号「继续」按钮 + 小号「结束」按钮
- 结束按钮需要二次确认或长按确认
- 运动中的暂停按钮增加 haptic feedback

### 文件变更清单

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `pages/PrepPage.tsx` | 修改 | 精简布局，按频率排序 |
| `pages/ReportPage.tsx` | 修改 | 增强统计面板 |
| `pages/PausedPage.tsx` | 修改 | 优化结束交互 |
| `SportPage.tsx` | 修改 | 回传结果逻辑 |
| `pages/EnhancedReportSection.tsx` | **新增** | 7天历史对比组件 |

---

## 依赖关系

```
R1 ──→ R2 ──→ R3 ──→ R4
  │        │
  │        └── 依赖 useBodyFlowState (R1 新增 hook)
  │
  └── BodyGoal 类型变更 (R1) 影响 R3 的 progress 计算

无其他外部依赖，所有修改在 apps/mobile 和 packages/core 内部。
```

## 回滚方案

每阶段完成后提交一次，如：
```
git commit -m "feat(body): R1 — Dashboard 翻新 + Bug 修复"
git commit -m "feat(body): R2 — BodyFlow 流程增强"
git commit -m "feat(body): R3 — 训练计划模板 + 庆祝"
git commit -m "feat(body): R4 — SportPage 体验优化"
```
任一阶段出问题可 `git revert` 对应 commit，不影响其他阶段。