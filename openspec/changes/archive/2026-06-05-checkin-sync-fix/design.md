# 设计方案

## 状态管理策略

将所有打卡状态统一为"单一数据源"模式：直接从 Zustand store 读取，不再维护本地副本。

### 习惯打卡

```
之前：useState(habitCheckins) → 本地状态遮蔽 store
之后：store.habits[].checkedDates.includes(today) → 直接读取
```

### 计划待办

```
之前：useState(planToggles) → 本地状态遮蔽 store
之后：planCheckins.some(c => c.planItemId === id && c.date === today && c.done) → 直接读取
```

### toggleHabit

```
之前：setHabitCheckins(本地更新) + store.checkinHabit(重复调用)
之后：store.checkinHabit(唯一调用)，UI 通过 store 更新自动刷新
```

### togglePlanItem

```
之前：planToggles[itemId] ?? storeDone (stale closure)
之后：planCheckins.some(...) (实时读取 store)
```

### 挂载同步

添加 `autoSyncPlanItems()` 和 `checkAutoStatus()` 调用，与 Web HomeTab 保持一致。

## 影响分析

- 不改变任何 store 层逻辑
- 不改变 Web 端代码
- 不引入新的依赖
- 减少代码复杂度（移除 ~30 行本地状态管理代码）
