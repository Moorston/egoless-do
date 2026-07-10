# 架构风险点分析与修复方案

## 风险点 1：速率限制内存 Map

### 现状
```typescript
// rate-limit.ts
const _stores = new Map<string, Map<string, RateLimitEntry>>();
// 每 30 秒写入 /tmp/rate-limit-state.json
```

- 纯内存 `Map`，进程重启后丢失
- 多实例部署完全无效（每个实例独立计数）
- 文件持久化到 `/tmp/`，容器重启后消失
- 最大 10,000 条记录，达到后驱逐最旧条目

### 方案对比

| 方案 | 复杂度 | 可靠性 | 性能 | 推荐度 |
|------|--------|--------|------|--------|
| **A: 迁移到 PocketBase 集合** | 低 | 高 | 中 | ⭐ 推荐 |
| B: 引入 Redis | 高 | 高 | 高 | 次选 |
| C: 改进文件持久化 | 低 | 低 | 低 | 不推荐 |

### 推荐方案 A：PocketBase 持久化

**设计**：
```typescript
// 创建一个 rate_limits 集合
// 集合字段：key (primary), count, window_start, expires_at
// 集合规则：全部 null（仅 admin 访问）

export async function createRateLimiter(maxCount: number, windowMs: number) {
  return async (key: string): Promise<boolean> => {
    const pb = await getAdminPb();
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // 使用 PocketBase 的 upsert 能力
    // 如果窗口内已有记录，更新计数；否则创建新记录
    try {
      const record = await pb.collection('rate_limits').getFirstListItem(
        `key = "${escapeFilter(key)}" && window_start > ${windowStart}`
      );
      const count = (record.count || 0) + 1;
      if (count > maxCount) return false; // 限流
      await pb.collection('rate_limits').update(record.id, { count });
      return true;
    } catch (err) {
      if (errStatus(err) === 404) {
        // 不存在，创建新窗口记录
        await pb.collection('rate_limits').create({
          key, count: 1, window_start: now, expires_at: now + windowMs
        });
        return true;
      }
      // 降级：允许通过（fail open）
      return true;
    }
  };
}
```

**优点**：
- 跨实例共享（所有 API 实例访问同一个 PocketBase）
- 持久化（重启后保留）
- 不需要额外基础设施
- 与现有 account-lockout 模式一致

**缺点**：
- 每次检查增加一次 PocketBase 查询（约 5-10ms）
- 增加 PocketBase 负载

---

## 风险点 2：createAuthSlice 责任过重

### 现状
```typescript
// createAuthSlice.ts 包含 3 类职责：
export function createAuthSlice(
  adapter: StorageAdapter,
  onSync: () => void,
  onLogout?: () => void | Promise<void>,
  onPullServerData?: (token: string, userId?: string) => Promise<void>,
  onClearData?: () => void | Promise<void>,
): SliceCreator<AuthSlice> {
  // 1. 认证状态管理 (login/register/logout/refreshAuth) — 174 行
  // 2. 服务端数据同步 (pullServerData) — 45 行
  // 3. 26 实体合并 (buildMergePatch) — 90 行
}
```

### 方案：拆分职责

**重构目标**：
```
createAuthSlice.ts
├── createAuthSlice.ts        → 纯认证状态管理 (login/register/logout/refresh)
├── mergeEngine.ts            → 实体合并逻辑 (buildMergePatch)
└── SyncService （已存在）      → 服务端数据同步
```

**具体步骤**：

1. **抽取 `buildMergePatch`** 到独立模块：
```typescript
// packages/core/src/store/mergeEngine.ts
// 现有 ENTITY_MERGE_MAP 和 buildMergePatch 整体迁移

export function buildMergePatch(
  data: Record<string, unknown[]>,
  s: Record<string, unknown>,
): Record<string, unknown> {
  // ...现有逻辑
}
```

2. **简化 createAuthSlice**：
```typescript
// createAuthSlice 只保留 auth 状态管理
export function createAuthSlice(
  adapter: StorageAdapter,
  onSync: () => void,
  onLogout?: () => void | Promise<void>,
  onPullServerData?: (token: string, userId?: string) => Promise<void>,
  onClearData?: () => void | Promise<void>,
): SliceCreator<AuthSlice> {
  // 只包含 login/register/logout/refreshAuth
  // pullServerData 的 web 路径直接调用 mergeEngine
}
```

**工作量估算**：1-2 小时，不涉及功能变更

---

## 风险点 3：实体配置 5 副本

### 现状
```typescript
// 5 个手动维护的实体映射：

// 1. ENTITY_CONFIG (SyncApplyService.ts) — 自动派生 ✅
// 2. ENTITY_STORE_KEY (SyncApplyService.ts) — 手动维护 ❌
// 3. ENTITY_COLL_MAP (SyncApplyService.ts) — 已自动派生 ✅
// 4. STORE_KEY_TO_ENTITY (mergeSyncPatch.ts) — 已从 ENTITY_STORE_KEY 派生 ✅
// 5. ENTITY_TABLE_MAP (entityTableMap.ts) — 自动派生 ✅
```

### 剩余问题

`ENTITY_STORE_KEY` 仍手动维护（33 行映射），与 SCHEMAS 注册表不一致时导致运行时错误。

### 方案：从 SCHEMAS 自动派生

```typescript
// 在 SCHEMAS 中添加 storeKey 字段（可选，默认自动派生）
interface EntitySchema {
  sqlite: { table: string; pk: string };
  pocketbase: { collection: string; serverIdField: string };
  storeKey?: string; // 新增：Zustand store 中的键名
  fields: FieldMapping[];
}

// 自动派生 ENTITY_STORE_KEY
const ENTITY_STORE_KEY: Record<string, string> = Object.fromEntries(
  (Object.keys(SCHEMAS) as SyncEntity[]).map(k => [
    k,
    SCHEMAS[k].storeKey ?? k === 'meditation' ? 'medHistory'
      : k === 'profile' ? 'userProfile'
      : k === 'planItem' ? 'planItems'
      : k === 'planItemCheckin' ? 'planItemCheckins'
      : `${k}s` // 默认规则：加 s
  ])
);
```

**工作量估算**：1-2 小时

---

## 风险点 4：SyncEngine 可测试性

### 现状
```typescript
// SyncEngine 直接依赖具体实现：
import { openDatabase, getState, setState, withDbLock } from '../../db/schema';
import { drainQueue, removeQueueItems, ... } from '../../db/syncQueue';
import { flushWrites } from '../../store/storageAdapter';
import { SyncApplyService, ENTITY_CONFIG } from './SyncApplyService';
import { SyncRealtimeController } from './SyncRealtimeController';
```

- 无法在 Node.js 测试环境中运行（需要 expo-sqlite）
- 测试文件重度 mock（20 个依赖，60+ 行 mock 配置）
- 每次修改都需要更新 mock

### 方案：依赖注入 + 接口抽象

**接口定义**：
```typescript
// SyncEngine.ts 顶部
export interface SyncEngineDeps {
  db: {
    openDatabase: typeof openDatabase;
    getState: typeof getState;
    setState: typeof setState;
    withDbLock: typeof withDbLock;
  };
  syncQueue: {
    drainQueue: typeof drainQueue;
    removeQueueItems: typeof removeQueueItems;
    getQueueCount: typeof getQueueCount;
    // ...
  };
  storageAdapter: {
    flushWrites: typeof flushWrites;
  };
  applyService: SyncApplyService;
  realtimeController: SyncRealtimeController;
}
```

**构造函数注入**：
```typescript
export class SyncEngine {
  constructor(deps: SyncEngineDeps) {
    this._deps = deps;
    this._applyService = deps.applyService;
    this._realtimeController = deps.realtimeController;
  }
}
```

**测试时注入 mock**：
```typescript
const engine = new SyncEngine({
  db: { openDatabase: mockOpenDatabase, ... },
  syncQueue: { drainQueue: mockDrainQueue, ... },
  // ...
});
```

**工作量估算**：3-4 小时（重构+测试更新）

---

## 风险点 5：as any / as unknown 类型绕过

### 状态
**已修复**（`cced18b`）。剩余 0 个 `as any`。

### 长期建议
- 对新增代码禁止 `as any`（ESLint 规则 `@typescript-eslint/no-explicit-any: error`）
- 对 `as unknown as X` 双转换进行 Code Review 关注
- 在 store 层使用 Zod schema 进行运行时类型验证

---

## 风险点 6：Dockerfile.web 不可构建

### 状态
**已记录**（CI/CD 审计）。`Dockerfile.web` 引用不存在的 `apps/web` 目录。

### 方案
```bash
# 选项 A：移除文件（推荐）
rm infra/docker/Dockerfile.web
rm infra/docker/docker-compose.yml 中 web 服务的引用

# 选项 B：修复为新的 web 应用（如果计划重建）
# 但目前 pnpm-workspace.yaml 已排除 "!apps/web"
```

---

## 优先级排序

| 优先级 | 风险点 | 工作量 | 影响 |
|--------|--------|--------|------|
| **P0** | 速率限制内存 Map | 2h | 安全：多实例部署时完全失效 |
| **P1** | createAuthSlice 责任过重 | 2h | 可维护性 |
| **P1** | 实体配置 5 副本 | 1h | 可维护性 |
| **P2** | SyncEngine 可测试性 | 4h | 测试质量 |
| ✅ | as any 类型绕过 | 已修复 | - |
| ✅ | Dockerfile.web | 已记录 | - |