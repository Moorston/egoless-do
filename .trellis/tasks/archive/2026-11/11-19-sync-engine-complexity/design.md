# Design — SyncEngine 复杂度拆分

> 设计原则：沿**安全语义边界**切（一个安全不变量一个单元），不沿行数切。拆出的每个单元可独立单测 = 拆分收益的证据。

## 现状

```
runSync (27)                              616-748
├─ 并发守卫 + timeout                     617-631
├─ token 生命周期块 ←── Phase 2 拆出       634-682
│   ├─ 近过期主动刷新 (TOKEN_REFRESH_SKEW_MS)
│   ├─ 无 token recovery（不早登出保护）
│   └─ recovery 失败 → clearSyncTrigger + return
├─ pre-sync 准备（flush/load/prune/orphan）691-717
└─ try { executePush → executePull → cleanup } 720-747

executePush (54)                          308-507
├─ batch 循环 (×10)
│   ├─ drain + payload 解析               321-344
│   ├─ push API + kicked-out              346-365
│   │   └─ 失败重试 markRetry + fallback markFailed（未测）
│   ├─ auto-resolve 块 ←── Phase 1 拆出    377-466
│   │   ├─ server-deleted → 本地软删
│   │   ├─ server-wins UPDATE/INSERT（r2.changes===0 → INSERT）
│   │   ├─ locally-deleted skip（resurrection invariant，未测）
│   │   ├─ invalid serverData → conflict + UI addConflict
│   │   └─ no-serverData → max-retries ? failed : conflict（未测）
│   ├─ markSynced                         469-480
│   └─ post-push pull（小批量）            482-496
└─ updateTimestamps                       499-506

executePull (41)                          510-604
├─ 主 pull 块 ←── Phase 3 合并            524-585
│   ├─ pullEntities 计算（conflicted scope）
│   ├─ check（scope 存在则跳过；check error → hasChanges=true 照常 pull）
│   ├─ pull（Post 或全量；pull error → log 继续）
│   ├─ apply + generation guard
│   └─ per-entity timestamps
└─ wasLargePush 保障块 ←── Phase 3 合并   588-603
    ├─ 无条件 check（check error → warn 跳过 pull）
    ├─ 全量 pull + apply + generation guard
    └─ 无 per-entity timestamps
```

## Phase 1 — PushConflictResolver（新文件）

### 形态

`apps/mobile/src/features/sync/PushConflictResolver.ts`——与 `SyncApplyService` 同级的类，走同款注入模式：

```ts
export interface PushConflictResolverDeps {
  applyService: Pick<SyncApplyService, 'serverPayloadToRow'>;
  openDatabase: () => Promise<Database>;
  withDbLock: <T>(fn: () => Promise<T>) => Promise<T>;
  markQueueItemConflict: (id: number, reason: string) => Promise<void>;
  markQueueItemFailed: (id: number, reason: string) => Promise<void>;
}

export class PushConflictResolver {
  constructor(private deps: PushConflictResolverDeps) {}
  /** 对 rejected items 逐个 server-wins 解析；返回成功 auto-resolve 的 queue item id */
  async resolveRejected(rejectedItems: SyncQueueItem[], pushResult: SyncPushResult): Promise<number[]>;
}
```

SyncEngine 接线：`SyncEngineDeps` 加可选 `conflictResolver?: PushConflictResolver`，构造函数默认 `new PushConflictResolver({...当前 _openDatabase/_withDbLock/_applyService/_mark* 接线})`——与现有 5 个服务完全同构。

### 内部结构（控制 resolver 自身复杂度 ≤15/方法）

- `resolveRejected` — 循环 + 分发 + autoResolvedIds 收集
- `resolveOne(item, rejection)` — 单 item：config 查找 + SQL 注入校验 + `rejection.error === 'deleted'` 分发
- `resolveServerDeleted(item, config)` — `UPDATE ... SET deleted=1, synced=1`
- `resolveServerWins(item, config, serverData)` — serverPayloadToRow → 列校验 → withDbLock 内：locally-deleted skip → UPDATE → changes===0 则 INSERT；返回 `skipReason`
- `reportUnresolvable(item, rejection, reason)` — markConflict + 动态 `import('../../store/syncStore')` UI 上报（intentional optional）
- `reportNoServerData(item, rejection)` — `retry_count + 1 >= MAX_RETRY_ATTEMPTS ? failed : conflict`

**迁移规则**：代码 move-only，日志字符串、SQL、判定条件逐字保留。`MAX_RETRY_ATTEMPTS` 常量随迁（或从共享常量导入——留在 resolver 文件内定义一份，值 5）。

### 测试

新 `PushConflictResolver.test.ts`：resolver 直测（注入 mock deps，无需 vi.mock 引擎），覆盖 AC4 五分支。`SyncEngine.test.ts` 增加 `vi.mock('./PushConflictResolver')`，现有 3 个 auto-resolve 用例（server-wins / conflict no serverData / retry backoff）继续从引擎层走通（integration 路径）。

## Phase 2 — ensureSyncToken（私有方法，同文件）

```ts
/** token 生命周期：近过期主动刷新 → 无 token recovery。null = 放弃本次 sync。 */
private async ensureSyncToken(): Promise<string | null>
```

- 内部含原 634-657（主动刷新，catch → warn 继续）+ 659-682（recovery，catch → log）逻辑。
- **放弃路径语义**：recovery 无果 → 返回 null；调用方执行 `clearSyncTrigger(); this._syncing = false; return;`（保持原顺序：clearSyncTrigger 在 _syncing=false 前）。recovery throw 原路径无 clearSyncTrigger——**这是两个不同分支**，参数化返回区分：用返回值 `'none'`（无 recovery 可用）vs `'failed'`（recovery throw）？——不，move-only 原则下保守方案：方法内不碰副作用，返回一个判别联合：

```ts
type TokenState = { token: string } | { giveUp: true; clearTrigger: boolean };
```
  - recovery 无果 → `{ giveUp: true, clearTrigger: true }`（原 669-675：clearSyncTrigger + _syncing=false + return）
  - recovery throw → `{ giveUp: true, clearTrigger: false }`（原 677-681：仅 _syncing=false + return）
  - 调用方统一 `this._syncing = false; return;`，clearTrigger 按标志执行。**注意顺序**：原代码 clearSyncTrigger 在 `_syncing = false` 之前，保持。

## Phase 3 — executePull 同构合并

两块行为差异显式参数化为一个 `pullOnce`：

```ts
interface PullOnceOptions {
  /** conflicted scope：存在则跳过 check（hasChanges=true）并用 apiSyncPullPost */
  entities?: string[];
  /** check 抛错时的语义：主块照常 pull（hasChanges=true）；保障块跳过（warn） */
  onCheckError: 'pull-anyway' | 'skip';
  /** 主块拉全量 per-entity timestamps；保障块不更新 */
  updatePerEntityTimestamps: boolean;
  errorPhase: string;
}
/** 返回是否触发 kicked-out（调用方 return） */
private async pullOnce(opts: PullOnceOptions, ctx: { freshToken; userId; signal; myGeneration }): Promise<boolean>;
```

骨架（两块共享）：check → hasChanges → pull（entities ? PullPost : Pull）→ apply → generation guard →（可选）timestamps。差异点 4 个全部入参：

| 差异 | 主块 | 保障块 |
|------|------|--------|
| entities | conflicted scope 或 undefined | undefined（全量） |
| check 跳过 | entities 存在时跳过 | 永不跳过 |
| check error | `hasChanges=true` 继续 pull | warn + 跳过 |
| per-entity timestamps | 有 | 无 |

kicked-out：check/pull 的 401 判定留在各 try 内（pullOnce 返回 boolean，executePull 收到 true 即 return）。executePull 本体剩：pushAllClean/wasLargePush 计算 + 主块条件 + pullEntities 计算 + 保障块条件——预计 ≤15。

## 测试策略（characterization 先行）

**Phase A（拆分前）** 在 `SyncEngine.test.ts` 补 4 组现状锁定测试（用现有 mock 架构：`mockMarkQueueItemRetry` 抛错触发 fallback、`mockDb.getFirstAsync` 返回 `{ deleted: 1 }` 触发 skip、`mockDrainQueue` 喂 >20 items 触发 wasLargePush）：

1. markRetry fallback：`mockMarkQueueItemRetry` reject → `markQueueItemFailed` 兜底调用
2. local.deleted skip：serverData 存在但本地 `deleted=1` → `markQueueItemConflict(id, 'Locally deleted')`，且**无** UPDATE 执行
3. no-serverData max-retries：`retry_count=4`（+1 ≥ 5）→ `markQueueItemFailed`；`retry_count=0` → `markQueueItemConflict`
4. wasLargePush 保障：push 干净 + >THRESHOLD 个 item → `apiSyncCheck` + `apiSyncPull` 被调用

拆分后这些测试必须全绿（零行为变更验证）。Phase 1 落地后 2/3 迁/复制到 `PushConflictResolver.test.ts` 直测层。

## 风险与对策

| 风险 | 对策 |
|------|------|
| 拆 resolver 时 SQL/判定顺序手滑 | move-only + characterization 全量门禁（每 Phase 前后跑全量） |
| executePull 合并时两块语义差异被抹平 | 差异表 4 项显式参数化（上文），不改任何一侧默认值 |
| ensureSyncToken 副作用顺序变化 | TokenState 判别联合保留两分支差异；顺序注释锁定 |
| 新测试触碰 mobile lint ratchet 0 | 沿用现有 `vi.hoisted` + typed mock 模式；新增文件单独跑 `pnpm exec eslint <file>` 验证 0 warning |

## 回滚

每 Phase 一个 commit；任一 Phase 门禁红 → `git revert` 单 commit 回滚，不牵连其他 Phase。
