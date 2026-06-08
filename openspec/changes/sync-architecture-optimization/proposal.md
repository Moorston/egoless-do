## Why

当前同步系统存在两套独立实现（Mobile 757 行手写 mapper + Web SyncEngine），维护成本高且容易不一致。Web 前端已决定废弃，其同步代码（~784 行）和 Core 中的 Web 专用模块（~365 行）成为死代码。Mobile 的 SyncService 通过扫描 12 张全表查找未同步记录，效率低且每加一个字段需修改 3 处代码。需要统一到 sync_queue 模式，精简代码，提升同步效率。

## What Changes

- **移除 Web 端同步代码**：删除 `apps/web/src/db/` 下的 syncService、syncQueue、webDb，以及 `useSync.ts`、`storageAdapter.ts`
- **移除 Core 中 Web 专用模块**：删除 `realtimeSync.ts`（SSE）和 `sync/engine.ts`（SyncEngine）
- **移除 SSE 实时同步端点**：删除 `GET /api/sync/realtime`
- **重构 Mobile SyncService**：从 `synced` 列扫描模式改为 `sync_queue` 入队模式，消除 12 个手写 `xxxToSync()` mapper，将 757 行精简到 ~200 行
- **新增轻量变更检测端点**：`GET /api/sync/check?since={ts}` 返回 `{ hasChanges, count }`，避免无变更时的全量拉取
- **优化实时轮询**：从 30s 全量拉取改为 60s 轻量检测 + 按需拉取
- **迁移已有用户数据**：升级时自动将 `synced=0` 的旧数据迁移到 sync_queue

**非目标**：
- 不改动 PocketBase 数据存储层
- 不改动认证系统（auth endpoints 保持不变）
- 不引入 WebSocket（保持简单轮询方案）
- 不改动服务器冲突解决逻辑（`resolveConflict` 保持不变）

## Capabilities

### New Capabilities
- `sync-queue-push`: Mobile 端写入时同步入队机制 — 替代 synced 列扫描，实现 O(1) 变更检测
- `sync-check-endpoint`: 服务器轻量变更检测端点 — 避免无变更时的全量拉取开销

### Modified Capabilities
（无现有 spec 需要修改）

## Impact

**平台影响**：仅 Mobile + 服务器，Web 前端不涉及（已废弃）

**代码影响**：
- 删除 ~1149 行（Web 同步 784 行 + Core 专用 365 行）
- 重写 ~200 行（Mobile SyncService）
- 新增 ~50 行（sync_queue 写入 + check 端点）
- 净减少 ~900 行

**API 影响**：
- 删除 `GET /api/sync/realtime`（SSE 端点）
- 新增 `GET /api/sync/check`（轻量检测端点）
- `POST /api/sync` 和 `GET /api/sync` 保持不变

**依赖影响**：
- `packages/core` 导出减少：移除 `RealtimeSyncService`、`SyncEngine`、`getRealtimeSyncService`
- Mobile 不受影响（未使用这些导出）

**数据迁移**：
- 已安装用户升级时需一次性迁移：扫描 `synced=0` 记录写入 sync_queue
