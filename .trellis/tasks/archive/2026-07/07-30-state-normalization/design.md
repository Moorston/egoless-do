# Design: 状态管理规范化

## 当前问题

```
┌─────────────────────────────────────────────────────────────────────────┐
│  数据冗余问题                                                            │
│                                                                         │
│  habits 表：{ id, name, streak: 5, lastCheckin: '2026-07-29' }         │
│  checkins 表：{ habitId, date, done }                                   │
│                                                                         │
│  问题：                                                                  │
│  1. streak 在 habits 和 checkins 中重复存储                              │
│  2. 更新 checkins 后需同步更新 habits.streak                             │
│  3. 数据不一致风险 ⚠️                                                    │
└─────────────────────────────────────────────────────────────────────────┘
```

## 优化方案

### 1. 单一数据源（Source of Truth）

```
┌─────────────────────────────────────────────────────────────────────────┐
│  优化后架构                                                              │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  Source of Truth（仅存储原始数据）                                 │  │
│  │  - habits: { id, name, targetDays }                               │  │
│  │  - checkins: { habitId, date, done }                              │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                    │                                    │
│                                    ▼                                    │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  Derived State（通过 selector 实时计算）                           │  │
│  │  - streak = calculateStreak(checkins)                             │  │
│  │  - progress = calculateProgress(checkins, habits)                 │  │
│  │  - totalMedMinutes = sum(medHistory.durationSec) / 60             │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  优势：                                                                  │
│  - 单一数据源，无冗余 ✅                                                 │
│  - 派生状态自动更新 ✅                                                   │
│  - 无数据不一致风险 ✅                                                   │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2. Memoized Selectors

```typescript
// store/selectors.ts
import { useMemo } from 'react';
import { useAppStore } from './useAppStore';

// 派生状态：streak
export function useHabitStreak(habitId: string): number {
  const checkins = useAppStore(useShallow(s => s.checkins));
  return useMemo(() => {
    const habitCheckins = checkins.filter(c => c.habitId === habitId && !c.deleted);
    return calculateStreak(habitCheckins);
  }, [checkins, habitId]);
}

// 派生状态：总冥想时长
export function useTotalMedMinutes(): number {
  const medHistory = useAppStore(useShallow(s => s.medHistory));
  return useMemo(() => {
    return medHistory
      .filter(m => !m.deleted)
      .reduce((sum, m) => sum + m.durMin, 0);
  }, [medHistory]);
}

// 派生状态：习惯进度
export function useHabitProgress(habitId: string): number {
  const checkins = useAppStore(useShallow(s => s.checkins));
  const habits = useAppStore(useShallow(s => s.habits));
  return useMemo(() => {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return 0;
    const habitCheckins = checkins.filter(c => c.habitId === habitId && !c.deleted);
    return calculateProgress(habitCheckins, habit.targetDays);
  }, [checkins, habits, habitId]);
}
```

### 3. 乐观更新

```typescript
// store/createHabitSlice.ts
addHabit: (habit) => {
  const newHabit = { ...habit, id: uid(), updatedAt: Date.now(), deleted: false };
  
  // 1. 乐观更新：立即更新 UI
  set(s => ({ habits: [...s.habits, newHabit] }));
  
  // 2. 后台持久化
  adapter.persistChange('habit', newHabit.id, newHabit)
    .catch(err => {
      // 3. 失败时回滚
      set(s => ({ habits: s.habits.filter(h => h.id !== newHabit.id) }));
      onError?.(err);
    });
  
  // 4. 触发同步
  onSync?.();
},
```

### 4. 数据一致性

```typescript
// 单一更新路径
// 之前：多处可能更新 streak
// 1. checkinHabit → 更新 checkins + 更新 habits.streak
// 2. calculateStreak → 重新计算

// 之后：仅更新 checkins，streak 自动派生
// 1. checkinHabit → 仅更新 checkins
// 2. useHabitStreak → 自动从 checkins 计算
```

## 执行计划

### Phase 1（3 天）：移除冗余字段
1. 修改 createHabitSlice：移除 streak 字段
2. 修改 createCheckinSlice：保持不变（已是 Source of Truth）
3. 更新所有使用 streak 的组件：改用 useHabitStreak selector

### Phase 2（2 天）：添加 memoized selectors
1. 创建 store/selectors.ts
2. 实现 useHabitStreak, useTotalMedMinutes, useHabitProgress
3. 替换所有直接计算为 selector 调用

### Phase 3（2 天）：乐观更新
1. 修改所有 Slice actions：set + persist + rollback
2. 添加错误处理 + 回滚逻辑
3. 测试回滚场景

### Phase 4（3 天）：测试 + 修复
1. 更新所有测试
2. 修复回归问题
3. 性能基准测试

## 验证

```bash
npx vitest run  # 1856+ 测试通过
npx tsc --noEmit  # 类型安全
```

## 风险

| 风险 | 缓解 |
|------|------|
| 重构引入回归 | 全量测试 + 逐步重构 |
| 性能下降 | memoized selectors 缓存 |
| 乐观更新回滚失败 | 错误日志 + 手动刷新 |
