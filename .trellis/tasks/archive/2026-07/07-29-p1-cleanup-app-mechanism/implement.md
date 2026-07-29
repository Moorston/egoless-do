# Implement: cleanupApp 机制

## 执行步骤

### Step 1: 新建 `subscriptionRegistry.ts`
- 路径: `apps/mobile/src/store/subscriptionRegistry.ts`
- 导出: `registerCleanup(fn: () => void): void`、`cleanupApp(): void`
- 实现: 模块级 `_registry: (() => void)[]` 数组 + 清空逻辑

### Step 2: 接入 4 处标记
1. `initApp.ts:292` — auth 订阅: `registerCleanup(() => _unsubscribeAuth())`
2. `initApp.ts:409` — visibility listener: `registerCleanup(() => _visibilitySubscription?.remove())`
3. `useAppStore.ts:284` — `initMobileStore`: 在 `addEventListener` 后 `registerCleanup(() => sub.remove())`
4. `useNetworkStatus.ts:21` — NetInfo: `registerCleanup(() => unsubscribe)`

### Step 3: 测试 setup 接入
- `setup.ts` 加 `import { cleanupApp } from '.../store/subscriptionRegistry'`
- `afterEach(() => cleanupApp())`

### Step 4: 验证
- `npx tsc --noEmit` 类型检查
- `npx vitest run` 全量测试（重点 initApp、useAppStore、useNetworkStatus 相关测试）

## 验证命令
```bash
npx tsc --noEmit
npx vitest run apps/mobile/src/store/
```

## 回滚点
若 cleanupApp 导致测试不稳定，revert 5 文件改动即可恢复（注册表是无副作用的附加层）。

## 工作量
- 1 个新文件 + 4 个文件小改 + setup.ts 1 行
- 预计 30 分钟
