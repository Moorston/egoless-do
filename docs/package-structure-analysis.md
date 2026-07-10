# Egoless-Do Monorepo 包结构深度分析

> 日期: 2026-07-10
> 分析方法: 并行 Agent 代码分析

---

## 1. 包依赖图

```
apps/mobile (363 源文件, Expo/RN)
  └── @egoless-do/core (workspace:*)  ← 430 处导入
        ├── pocketbase ^0.26.9
        ├── zustand ^5.0.0
        ├── zod ^3.23.8
        └── react (仅 hooks/usePagination.ts) ← 边界违规
```

**依赖方向：单向，`apps/mobile → @egoless-do/core`。** 没有反向依赖。✅

---

## 2. 模块边界违规（1 处）

### 🔴 `packages/core/src/hooks/usePagination.ts` 导入 `react`

```typescript
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
```

**问题**：`packages/core` 本应是纯 TypeScript 库，不依赖 React/React Native。这个导入将 React 运行时拉入了 core 的依赖图中。`core` 的 barrel 导出 `export * from './hooks'` 进一步将 React 泄漏给所有消费者。

**影响**：任何 `import { ... } from '@egoless-do/core'` 都会在 bundle 中携带 React 代码，即使只使用纯业务逻辑（如 `zodSchemas`）。

---

## 3. 循环依赖

### `store ↔ features/sync` 循环

```
storageAdapter.ts → WriteBatcher.ts (features/sync/)
  ↓
useAppStore.ts → SyncService.ts
  ↓
SyncEngine.ts → storageAdapter.ts (flushWrites)
```

**当前处理方式**：惰性引用（`_triggerSync`、`_registerLocalDelete`），通过 setter 在初始化时注入：

```typescript
// storageAdapter.ts
let _triggerSync: (() => void) | null = null;
export function setStorageAdapterTrigger(fn: () => void) { _triggerSync = fn; }
```

**风险**：在 `_triggerSync` 被设置之前调用 `flushWrites` 会导致静默无操作。

---

## 4. Barrel 导出分析

### `packages/core/src/index.ts`（21 行）

```typescript
export * from './types';
export * from './utils';
export * from './store';
export * from './auth';
export * from './fetch';
export * from './business';
export * from './sync';
export * from './ai';
export * from './hooks';  // ← 带入了 React 依赖
// ... 共 18 个 export *
```

**问题**：全量 barrel 导出导致：
- 导入 `@egoless-do/core` 的消费者会导入整个包（包括 `ai`、`push`、`icons` 等）
- Metro bundler tree-shaking 有限，无法消除未使用的导出
- `hooks` 的导出泄漏了 React 依赖

---

## 5. 改进建议

### 建议 1：将 `usePagination` 迁移到 `apps/mobile/src/hooks/`（消除唯一边界违规）

**操作**：
- 移出 `packages/core/src/hooks/usePagination.ts`
- 从 `packages/core/src/index.ts` 移除 `export * from './hooks'`
- 更新 `apps/mobile` 中所有导入路径

**影响**：`packages/core` 不再依赖 `react`，成为纯 TypeScript 包。

### 建议 2：将 `WriteBatcher` 迁移到 `store/` 层（打破循环）

**操作**：
- 将 `WriteBatcher` 从 `features/sync/` 移到 `store/writeBatcher.ts`
- `storageAdapter.ts` 不再依赖 `features/sync/`
- 惰性引用保留，但存储层不再依赖同步层

### 建议 3：拆分 barrel 导出

**操作**：
- `index.ts` 只导出最常用的公共 API（types、utils、logger）
- 大模块（business、ai、sync、store）使用子路径导入
- 添加 ESLint 规则禁止从 `@egoless-do/core` 全量导入

---

## 6. 总结

| 维度 | 结论 |
|------|------|
| 包依赖方向 | ✅ 健康，单向 `mobile → core` |
| 模块边界 | 🔴 1 处违规 (`usePagination` 导入 `react`) |
| 循环依赖 | 🟡 `store ↔ features/sync`，通过惰性引用缓解 |
| Barrel 导出 | 🟡 全量 barrel 对抗 tree-shaking |
| 文件分布 | core 144 个 / mobile 363 个，比例合理 |