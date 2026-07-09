# 第二轮全面审查报告（回归审查）

> 审查日期：2026-07-09
> 审查范围：上一轮修复后的 46 个改动文件 + packages/core store/business/ai/data/sync 层
> 审查方法：3 个并行 Agent（Core 业务逻辑、Store/Init/安全、Sync 引擎回归）+ 手动补扫 Backend
> 共发现：**36 项问题**

---

## 总体统计

| 严重性 | Core 业务逻辑 | Store/Init/安全 | Sync 引擎 | Backend/Infra | **合计** |
|--------|--------------|----------------|-----------|---------------|----------|
| 🚨 **CRITICAL** | 0 | 0 | 0 | 2 | **2** |
| 🟠 **HIGH** | 5 | 3 | 5 | 3 | **16** |
| 🟡 **MEDIUM** | 3 | 4 | 5 | 2 | **14** |
| ⚪ **LOW** | 2 | 0 | 2 | 0 | **4** |
| **合计** | **10** | **7** | **12** | **7** | **36** |

---

## 🚨 CRITICAL（2项）

### C-1: 生产凭据仍在 git 历史中

| 字段 | 值 |
|------|------|
| 文件 | `.env`（历史提交中可提取） |
| 类型 | 安全 |
| 风险 | `PB_ADMIN_PASSWORD`, `INTERNAL_SECRET`, `SMTP_PASS` 明文可提取 |

**说明**：上一轮确认 `.env` 已在 `.gitignore` 且未被 git 追踪（`addad9a0`）。但历史提交中仍存在。需 `git filter-branch` 或 BFG Repo-Cleaner 清除历史。

### C-2: PocketBase 同步集合权限规则过松

| 字段 | 值 |
|------|------|
| 文件 | `backend/pb_migrations/1782500000_create_all_sync_collections.js:296-310` |
| 类型 | 安全 |
| 风险 | 所有同步集合的 list/view/create/update/delete 规则为 `@request.auth.id != ""`，任何认证用户可读写其他用户数据 |

**说明**：sync hooks 在应用层做 user_id 过滤，但 PB REST API 直接访问集合时绕过 hooks。需要在迁移中将规则改为 `@request.auth.id = user_id`。

---

## 🟠 HIGH（16项）

### Core 业务逻辑（5项）

| # | 文件 | 行 | 问题 |
|---|------|-----|------|
| H1 | `createMindSlice.ts` | 67-77 | `adapter.persistChange` 在 `set()` updater 内调用（纯函数副作用） |
| H2 | `createDietSlice.ts` | 多处 | `motivationLog`/`customWuxingMaps` 缺少 `?? []` 空值保护（7处） |
| H3 | `createPlanSlice.ts` | 292-315 | `deletePlanItem` 不加入 recycleBin（与 `deletePlan` 不一致） |
| H4 | `createAuthSlice.ts` | 14-31 | `ENTITY_MERGE_MAP` 缺少 ~20 个实体；Web pull 丢失这些实体的服务端数据 |
| H5 | `createAuthSlice.ts` | 44-45 | soft-deleted 记录 pull 后从内存被永久移除，未推送的删除会丢失 |

### Store/Init/安全（3项）

| # | 文件 | 行 | 问题 |
|---|------|-----|------|
| H6 | `initApp.ts` | 155-170 | `setState` reducer 内修改外部 `toDelete` 数组（reducer 不纯） |
| H7 | `syncQueue.ts` | 130-132 | `resetQueueItemsForRetry` 用字符串 `.replace()` 构造 SQL（脆耦合） |
| H8 | `secureAuth.ts` | 14-21 | `saveSecureTokens` 吞错误永远不 reject，调用者的 `.catch()` 死代码 |

### Sync 引擎（5项）

| # | 文件 | 行 | 问题 |
|---|------|-----|------|
| H9 | `SyncEngine.ts` | 110,614 | `_onSyncError` 从未被任何代码调用，UI 层不知道同步错误 |
| H10 | `SyncEngine.ts` | 237 | `catch {}` 吞掉 `resetStuck()` 错误，卡住的 syncing 项永不恢复 |
| H11 | `SyncResetService.ts` | 48-51 | `setState` 调用在 `withDbLock` 锁外，并发 sync 可写数据后重置标记 |
| H12 | `SyncEngine.ts` | 302-334 | auto-resolve DB 写操作无 `withDbLock`/事务包围 |
| H13 | `syncStore.ts` | 67 | `setSyncError` action 定义了但从未被调用 |

### Backend/Infra（3项）

| # | 文件 | 行 | 问题 |
|---|------|-----|------|
| H14 | `pb_migrations/1782950000_fix_collection_permissions.js` | 10-16 | `active_sessions`/`leaderboard` permission fix 仍不充分（`user_hash != ""` 非 `@request.auth.id = user_id`） |
| H15 | `rate-limit.ts` | 所有 | 速率限制仍为纯内存，多实例部署完全无效 |
| H16 | `sync.pb.js` | `console.error` | 错误日志包含 `err.message`，可能泄漏实体 ID 等内部信息 |

---

## 🟡 MEDIUM（14项）

### Core 业务逻辑（3项）

| # | 文件 | 问题 |
|---|------|------|
| M1 | `createPlanSlice.ts:445-446` | `previousDate` 无效时 `new Date()` 产生 NaN，`setDate()` 静默失败 |
| M2 | `createMindSlice.ts:多处` | `fearEntries`/`courageEntries`/`achievements` 缺 `?? []` 保护 |
| M3 | `review.ts:92-102` | `calculateStreakForRange` 名不副实（从数组前部计 streak） |

### Store/Init/安全（4项）

| # | 文件 | 问题 |
|---|------|------|
| M4 | `schema.ts:580,583` | 索引创建空 `catch {}` 吞掉所有错误（不仅"已存在"） |
| M5 | `schema.ts:659` | `user_profiles` 建表缺 `updated_at`/`deleted` 列（依赖后续迁移） |
| M6 | `storageAdapter.ts:106-127` | `transaction()` 嵌套 `withDbLock` 有死锁风险，有注释但无运行时防护 |
| M7 | `i18n/index.ts:9` | 繁体中文 locale 返回 `zh` 而非 `zh-Hant` |
| M8 | `schema.ts` | `migrateDatabase` 整个迁移无 `withDbLock` |

### Sync 引擎（5项）

| # | 文件 | 问题 |
|---|------|------|
| M9 | `SyncEngine.ts:272` | `catch {}` 吞掉最后防线的 `markQueueItemFailed` 错误 |
| M10 | `SyncEngine.ts:353` | `catch {}` 吞掉冲突注册错误（"冲突 UI 可选" — 但冲突数据也丢了） |
| M11 | `SyncEngine.ts:90,530` | `_pendingSyncAfterInit` 只写不读，死代码 |
| M12 | `SyncEngine.ts:573` | `pruneStaleQueueItems()` fire-and-forget，与 `drainQueue` 可能竞态 |
| M13 | `SyncRealtimeController.ts:131-134` | realtime pull 的 `serverTime` 从未存储，`lastSyncAt` 永不更新 |

### Backend/Infra（2项）

| # | 文件 | 问题 |
|---|------|------|
| M14 | `infra/docker/api/src` | 多处 `console.error` 传原始 error（可能含 token/路径信息） |
| M15 | `activeSessionApi.ts` | 活动会话 API 端点无认证，可被注入数据 |

---

## ⚪ LOW（4项）

| # | 文件 | 问题 |
|---|------|------|
| L1 | `mergeSyncPatch.ts:56,91,101` | `as unknown` 绕过类型检查 |
| L2 | `SyncApplyService.ts:238` | `filter(Boolean)` 可能过滤掉 falsy 但有效的 ID |
| L3 | `SyncRehydrationManager.ts:87` | `Promise.all` 35 个实体在内存压力下可能 OOM |
| L4 | `dataStore.ts` | 整个文件是死代码，`@deprecated` 但仍在 bundle 中 |

---

## 修复优先级建议

| 批次 | 包含项 | 工作量 | 风险 |
|------|--------|--------|------|
| **A** 安全 | C-2(H14), M14, M15, C-1 | 2h | 低—权限规则修改 |
| **B** Sync 传播 | H9(H13), H10, M9, M10, H11, H12 | 3h | 中—同步核心 |
| **C** Store 一致性 | H1, H2, H3, H4, H5, H6, H8 | 3h | 中—store 层 |
| **D** 低风险 | M1-M13, L1-L4 | 4h | 低 |