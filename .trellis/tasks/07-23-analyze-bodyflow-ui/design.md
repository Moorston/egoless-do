# BodyDashboard 重构方案

## 现状

```
BodyDashboard.tsx (1333行, 20个导入)
├── 逻辑层 (317行)
│   ├── 10+ 个 useState
│   ├── 15+ 个 useMemo
│   ├── 15+ 个 useCallback
│   └── 5+ 个 useEffect
├── Banner 轮播 (498行)
│   ├── 今日方案 (210行) ← 含 flow 进度
│   ├── 身体档案 (56行)
│   ├── 身体觉知 (67行)
│   └── 体重趋势 (150行)
├── Modal 区 (302行)
│   └── 11 个 Modal 组件
└── 样式表 (182行)
```

## 拆分方案

### 方案：提取 3 个文件

```
BodyDashboard.tsx           → 核心逻辑 + 布局框架 (~400行)
BodyDashboardBanners.tsx    → 4 个 Banner 组件 (~500行)
BodyDashboardModals.tsx     → 11 个 Modal 组件 (~300行)
BodyDashboardStyles.ts      → 样式表 (~180行)
```

### 文件 1: BodyDashboardBanners.tsx

**职责**：Banner 轮播的 4 个卡片 + 指示器

**Props**：
```typescript
interface BannersProps {
  TH: Theme;
  T: (key: string) => string;
  nav: any;
  currentBanner: number;
  onBannerChange: (index: number) => void;
  bannerScrollRef: React.RefObject<ScrollView>;
  // 今日方案
  todayPlanDisplay: { icon: string; label: string; note?: string } | null;
  todayExercises?: ExerciseDef[];
  hasOverride: boolean;
  todayOverride?: DayOverride;
  hasActiveFlow: boolean;
  allFlowDone: boolean;
  flowState: FlowState | null;
  activeTrainingPlan?: BodyTrainingPlan;
  onFlowStart: () => void;
  onFlowStartWithPlan: (planId: string) => void;
  onUndoOverride: () => void;
  // 身体档案
  profile: Record<string, unknown>;
  activeGoal?: BodyGoal;
  onEditGoal: () => void;
  // 身体觉知
  latestCheckin?: BodyCheckin;
  // 体重趋势
  weightTrend: { current: number; diff: number; date: string } | null;
}
```

### 文件 2: BodyDashboardModals.tsx

**职责**：11 个 Modal 组件

**Props**：
```typescript
interface ModalsProps {
  TH: Theme;
  T: (key: string) => string;
  // 各 Modal 的 visible 状态
  showAssessment: boolean;
  showGoalEdit: boolean;
  showCheckin: boolean;
  showWeightRecord: boolean;
  showWeightTrend: boolean;
  showQuickSwap: boolean;
  showAdjustExercise: boolean;
  showDayAction: boolean;
  showGoalEditLight: boolean;
  showDaySwapPicker: boolean;
  showCelebration: boolean;
  // 各 Modal 的关闭回调
  onClose: (name: string) => void;
  // 各 Modal 的保存回调
  ... (各 handleXxx 回调)
}
```

### 文件 3: BodyDashboardStyles.ts

**职责**：所有 StyleSheet 定义

### 优点
1. 每个文件职责单一，可读性提升
2. Banner 和 Modal 可独立维护
3. 核心逻辑不变，降低重构风险
4. 样式可复用

### 风险
1. Props 传递较多，但比 1333 行一个文件好
2. 需要确保所有回调正确传递
3. `flowState` 类型需要从 `useBodyFlowState` 导出

## 实施步骤

1. 提取 `BodyDashboardStyles.ts` — 纯样式，无依赖
2. 提取 `BodyDashboardBanners.tsx` — 需先定义好 Props 接口
3. 提取 `BodyDashboardModals.tsx` — 同上
4. 简化 `BodyDashboard.tsx` — 只剩逻辑 + 3 个子组件调用

## 预计结果

```
BodyDashboard.tsx           → ~400行
BodyDashboardBanners.tsx    → ~500行
BodyDashboardModals.tsx     → ~300行
BodyDashboardStyles.ts      → ~180行
总计: ~1380行（基本持平，但结构清晰）
```