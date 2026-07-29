# Design: cleanupApp 机制

## 问题
Session 52 深度审查识别 4 处模块级永久订阅，设计为应用生命周期内永久存在，但无清理路径：
- `initApp.ts:292` — auth token 持久化订阅（Zustand `useAppStore.subscribe`）
- `initApp.ts:409` — AppState visibility listener（`AppState.addEventListener`）
- `useAppStore.ts:284` — AppState change handler（`initMobileStore`）
- `useNetworkStatus.ts:21` — NetInfo listener（`NetInfo.addEventListener`）

**后果**: 测试间订阅累积（每个测试重新 `initApp` 叠加订阅）、app 退出后订阅仍持有闭包引用。

## 设计

### 核心思路：注册式订阅注册表

```typescript
// apps/mobile/src/store/subscriptionRegistry.ts
type CleanupFn = () => void;
const _registry: CleanupFn[] = [];

export function registerCleanup(fn: CleanupFn): void {
  _registry.push(fn);
}

export function cleanupApp(): void {
  for (const fn of _registry) {
    try { fn(); } catch { /* best-effort */ }
  }
  _registry.length = 0;
}
```

### 接入模式

每个模块在创建订阅时注册清理函数：

```typescript
// initApp.ts
const _unsub = useAppStore.subscribe(...);
registerCleanup(() => _unsub());

// useNetworkStatus.ts
const unsub = NetInfo.addEventListener(...);
registerCleanup(() => unsub());
```

### 测试集成

`setup.ts` 加：
```typescript
import { cleanupApp } from './store/subscriptionRegistry';
afterEach(() => cleanupApp());
```

### 文件结构

```
apps/mobile/src/store/
  subscriptionRegistry.ts  ← 新建（注册表 + cleanupApp）
  initApp.ts               ← 改：2 处注册
  useAppStore.ts           ← 改：1 处注册
  useNetworkStatus.ts      ← 改：1 处注册
setup.ts                   ← 改：afterEach 接入
```

## 决策

| 选项 | 选择 | 理由 |
|------|------|------|
| 注册表位置 | `store/subscriptionRegistry.ts` | 靠近订阅创建方，store 层职责 |
| 清理时机 | `afterEach` + 可选 app 退出 | 测试隔离优先 |
| 错误处理 | try/catch best-effort | 清理不应抛错 |
| 重复调用安全 | `cleanupApp` 清空 registry | 支持 `initApp` 多次调用 |

## 风险

- `initApp` 多次调用会重新注册 → 安全（每次 `initApp` 创建新订阅 + 新注册）
- 清理后订阅失效 → 预期行为（测试间隔离）
