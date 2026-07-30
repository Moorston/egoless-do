# 技术设计 — 修复 AppHeader streak 不一致

## 1. 概述

将 AppHeader 和 SimpleHeader 的 streak 数据源从冗余的 `store.streak` 切换为派生的 `useCheckinStreak()` selector，并清理冗余字段。

## 2. 影响分析

### 2.1 `store.streak` 写入点（全部移除）

| 文件 | 行号 | 当前代码 | 改动 |
|------|------|----------|------|
| `createCheckinSlice.ts` | 21 | `streak: 0,`（初始状态） | 移除 |
| `createCheckinSlice.ts` | 32 | `return { checkinHistory: result.history, streak: result.streak };` | 改为 `return { checkinHistory: result.history };` |
| `createCheckinSlice.ts` | 40 | `streak: calculateCheckinStreak(...)`（rollback） | 移除 |
| `createCheckinSlice.ts` | 46-51 | `calculateStreak()` 方法 | 标记 deprecated 或移除 |
| `createMobileUiSlice.ts` | 76 | `streak: result.streak,` | 移除 |

### 2.2 `store.streak` 读取点（改为 selector）

| 文件 | 行号 | 当前代码 | 改动 |
|------|------|----------|------|
| `AppHeader.tsx` | 40 | `const streak = useShallowStore(s => s.streak);` | `const streak = useCheckinStreak();` |
| `SimpleHeader.tsx` | 25 | `const streak = useShallowStore(s => s.streak);` | `const streak = useCheckinStreak();` |

### 2.3 Schema / 类型清理

| 文件 | 改动 |
|------|------|
| `packages/core/src/zod/schemas.ts:135` | 移除 `streak: z.number().optional()`（settingsSchema） |
| `packages/core/src/store/types.ts`（CheckinSlice） | 移除 `streak: number` 类型定义 |

### 2.4 不改动（保持）

| 项 | 原因 |
|----|------|
| `CheckinEntry.streak` 字段 | per-record streak，历史记录展示需要 |
| `submitCheckinEntry` 返回值 | 仍返回 `streak`，用于 record |
| `useCheckinStreak()` selector | 已是正确数据源 |
| HomeScreen | 已用 selector |

## 3. 组件接口变化

### 3.1 AppHeader.tsx

```tsx
// Before
import { useAppStore, useShallowStore } from '../store/useAppStore';
const streak = useShallowStore(s => s.streak);

// After
import { useAppStore, useShallowStore } from '../store/useAppStore';
import { useCheckinStreak } from '../store/selectors';
const streak = useCheckinStreak();
```

### 3.2 SimpleHeader.tsx

同上。

## 4. Store 层变化

### 4.1 CheckinSlice 类型

```ts
// Before
export interface CheckinSlice {
  checkinHistory: CheckinEntry[];
  streak: number;          // 移除
  graceHistory: GraceHistoryEntry[];
  submitCheckin(...): void;
  calculateStreak(): void; // 标记 deprecated
}

// After
export interface CheckinSlice {
  checkinHistory: CheckinEntry[];
  graceHistory: GraceHistoryEntry[];
  submitCheckin(...): void;
  // calculateStreak 移除（或由 selector 替代）
}
```

### 4.2 submitCheckin 实现

```ts
// Before
set(s => {
  previousHistory = s.checkinHistory ?? [];
  const result = submitCheckinEntry(previousHistory, done, note, dateOverride, weight, grace);
  newRecord = result.record;
  return { checkinHistory: result.history, streak: result.streak };
});

// After
set(s => {
  previousHistory = s.checkinHistory ?? [];
  const result = submitCheckinEntry(previousHistory, done, note, dateOverride, weight, grace);
  newRecord = result.record;
  return { checkinHistory: result.history };
});
```

### 4.3 rollback 实现

```ts
// Before
set({ checkinHistory: previousHistory, streak: calculateCheckinStreak(previousHistory.filter(c => !c.deleted)) });

// After
set({ checkinHistory: previousHistory });
```

## 5. 风险评估

| 风险 | 影响 | 缓解 |
|------|------|------|
| 其他模块读 `store.streak` | 编译错误 / 运行时 undefined | 全局 grep 已确认仅 AppHeader + SimpleHeader |
| 测试引用 `store.streak` | 测试失败 | 检查 `createCheckinSlice.test.ts`，更新断言 |
| `calculateStreak()` 被外部调用 | 方法不存在 | grep 确认仅 initApp 曾调用，已注释不调用 |
| CheckinRecord.streak 丢失 | 历史记录 streak 不显示 | **不改动** per-record streak |

## 6. 测试策略

### 6.1 现有测试检查

- `createCheckinSlice.test.ts` — 检查是否有 `streak` 断言，更新
- `createCheckinSlice.optimistic.test.ts` — 检查 `calculateStreak` 相关测试
- `selectors.test.ts`（若有）— 确认 `useCheckinStreak` 覆盖

### 6.2 回归测试路径

1. 冷启动 → rehydration → AppHeader streak 正确
2. 打卡 → checkinHistory 更新 → selector 重算 → AppHeader + banner 同步 +1
3. 同步拉取远端 → checkinHistory 更新 → 两处同步

## 7. 文件改动清单

| 文件 | 改动类型 |
|------|----------|
| `apps/mobile/src/components/AppHeader.tsx` | streak → useCheckinStreak |
| `apps/mobile/src/navigation/SimpleHeader.tsx` | streak → useCheckinStreak |
| `packages/core/src/store/createCheckinSlice.ts` | 移除 streak 字段/写入/calculateStreak |
| `apps/mobile/src/store/createMobileUiSlice.ts` | 移除 streak 写入 |
| `packages/core/src/store/types.ts` | 移除 CheckinSlice.streak |
| `packages/core/src/zod/schemas.ts` | 移除 settingsSchema.streak |
| `packages/core/src/store/createCheckinSlice.test.ts` | 更新断言（若有） |
