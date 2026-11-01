# 拆分 HomeScreen — 技术设计

## 1. 当前结构

```
HomeScreen (CC 49, 852 行)
├── imports: HabitItem(已有) + parseWeight(已有) + 多个子组件(已有)
├── store 解构 (useShallowStore)
├── 派生数据 (useMemo ×8)
├── buildNote (第 231 行) ← 危险区: 渲染期读 useAppStore.getState()
├── saveField (第 267 行) ← 危险区: setTimeout 保存链
├── 8 个 useCallback 处理器
│   └── toggleHabit/addWaterCb/handleFoodChanged 等 ← 危险区: 含 setTimeout 调用
└── JSX return:
    ├── Banner
    ├── WeightCard (内联 ~50 行) ← 提取
    ├── WaterCard (内联 ~40 行) ← 提取
    ├── ReasonModal (内联?) ← 提取(若未独立)
    ├── WaterGoalModal (内联?) ← 提取(若未独立)
    ├── CheckinStatsModal (已有 ✓)
    ├── HomePlanSection (已有 ✓)
    ├── HomeFoodSection (已有 ✓)
    ├── HabitItem rows (已有 ✓)
    └── GraceReminder / DelayedReminder (已有 ✓)
```

## 2. 目标结构

```
HomeScreen (编排层, CC ≤15)
├── store 解构 + useMemo (不动)
├── buildNote (不动) ← 危险区
├── saveField + setTimeout 链 (不动) ← 危险区
├── 8 个 useCallback (不动，除非内联 JSX 提取后自然降复杂度)
├── <WeightCard {...} /> ← 提取
├── <WaterCard {...} /> ← 提取
├── <ReasonModal {...} /> (若需提取)
├── <WaterGoalModal {...} /> (若需提取)
└── 已有子组件 (不动)
```

## 3. 提取边界

### WeightCard

```
Props:
interface WeightCardProps {
  weight: number | null;
  weightGoal: number | null;
  onEditWeight: (value: number) => void;
  isReadOnly: boolean;
}

职责: 纯渲染体重卡片 + 编辑入口
复杂度预期: ≤10 (仅条件渲染: 有/无体重, 编辑/展示态)
```

### WaterCard

```
Props:
interface WaterCardProps {
  waterIntake: number;
  waterGoal: number;
  onAddWater: (amount: number) => void;
  onSetGoal: (goal: number) => void;
}

职责: 纯渲染饮水量卡片 + 加水/设目标入口
复杂度预期: ≤10
```

## 4. 关键约束

**回调通过 props 传入，不在子组件内调用 saveField**。saveField 和 setTimeout 链留在 HomeScreen 主组件，子组件只触发回调。这样保证保存链行为零变更。

## 5. 消费方契约

HomeScreen 的导出签名、props 不变。唯一消费方 `navigation/index.tsx` 零改动。

## 6. 风险评估

| 风险 | 等级 | 缓解 |
|------|------|------|
| 误改 setTimeout 保存链 | **高** | 不触碰清单 + diff 审查 saveField/buildNote/toggleHabit 等 |
| stale closure 引入 | **高** | 回调通过 props 传入子组件，不改变依赖链 |
| WeightCard 编辑态丢失 | 低 | 编辑态由父组件管理，子组件只渲染 |
