## Context

当前同步系统有两条独立的实现路径：

**Mobile 端**（`apps/mobile/src/features/sync/SyncService.ts`, 757 行）：
- 通过 `synced` 列（0/1/2）标记同步状态
- `getUnsynced()` 扫描 12 张表查找 `synced IN (0,2)` 的记录
- 12 个手写 `xxxToSync()` mapper 函数将 SQLite 行转为同步 payload
- `applyServerChanges()` 280 行逐实体 INSERT OR REPLACE
- 实时同步：30s 短轮询 `GET /api/sync`（全量拉取）

**Web 端**（已废弃，~784 行）：
- `SyncEngine`（core, 187 行）+ `syncQueue`（Dexie）+ `syncService` + `useSync`
- `RealtimeSyncService`（core, 178 行）基于 SSE
- `GET /api/sync/realtime` 服务器 SSE 端点（109 行）

**服务器**（`apps/web/src/app/api/sync/route.ts`）：
- `POST /api/sync`：接收 changes[]，逐条 `resolveConflict()`，写入 PocketBase
- `GET /api/sync`：全量拉取用户所有数据

**约束**：
- 4c8g 服务器，PocketBase (SQLite) 单进程
- 本地优先架构：数据先写本地，同步可延迟
- 后期开放多用户

## Goals / Non-Goals

**Goals:**
- 统一同步实现为 sync_queue 模式，消除代码重复
- 将 Mobile SyncService 从 757 行精简到 ~200 行
- 消除手写 mapper（加字段只需改 1 处）
- 减少无效网络请求（轻量检测替代全量轮询）
- 清理 Web 端同步死代码和 Core 专用模块

**Non-Goals:**
- 不引入 WebSocket（保持轮询，简单可靠）
- 不改动 PocketBase 数据存储层
- 不改动认证系统
- 不改动服务器冲突解决逻辑
- 不做多设备实时协同（本地优先，同步可延迟）

## Decisions

### D1: sync_queue 作为唯一的变更追踪机制

**选择**：写入时同时构造 payload 并 INSERT INTO sync_queue，同步时 drainQueue() 取出推送。

**替代方案**：保留现有 `synced` 列扫描模式。
- 缺点：12 次全表扫描，加字段需改 mapper + apply + schema 三处。

**理由**：sync_queue 将变更检测从 O(N) 全表扫描降为 O(1) 队列查询，且 payload 在入队时就构造好，消除了运行时 mapper。

### D2: payload 在写入时构造，而非同步时

**选择**：业务代码写入 SQLite 时，同时构造好同步 payload（camelCase，服务器格式）存入 sync_queue。

**替代方案**：sync_queue 只存 entityId，同步时再查 SQLite 构造 payload。
- 缺点：同步时仍需查表 + mapper，没有消除核心痛点。

**理由**：写入时构造 payload 是一次性成本（微不足道），换来同步时零 mapper 代码。

### D3: 通用 apply 逻辑替代逐实体处理

**选择**：`applyServerChanges()` 使用 entity → table 映射 + 通用 INSERT OR REPLACE，不再逐实体手写 SQL。

**理由**：所有实体的 apply 逻辑本质相同：查本地 → 比时间戳 → INSERT OR REPLACE。差异只在表名和字段，可通过 ENTITY_CONFIG 映射解决。

### D4: 保留 synced 列，但语义简化

**选择**：保留 `synced` 列（0/1），但不再用于同步检测。仅标记"是否已成功推到服务器"，供调试和数据一致性检查使用。

**理由**：sync_queue 是同步的驱动机制，synced 列变为只读标记，不参与同步流程。删除 sync_queue 中的记录后 synced=1。

### D5: GET /api/sync/check 轻量检测端点

**选择**：新增端点，查询 PocketBase 中 `updated >= since` 的记录数，返回 `{ hasChanges, count }`。

**替代方案**：保持 30s 全量拉取。
- 缺点：无变更时浪费带宽和服务器资源。

**替代方案**：WebSocket 推送。
- 缺点：增加基础设施复杂度，4c8g 服务器资源有限。

**理由**：一个轻量 HTTP 请求（~100 bytes 响应）比全量拉取（~50KB+）节省 500 倍带宽。

### D6: 60s 轮询间隔替代 30s

**选择**：轮询间隔从 30s 改为 60s。

**理由**：本地优先架构下，同步延迟 30s vs 60s 用户无感知。配合 check 端点，无变更时不触发任何同步逻辑。

## Risks / Trade-offs

**[Risk] 已安装用户升级时数据丢失** → 迁移脚本：app 启动时检测 `synced=0` 的旧数据，一次性写入 sync_queue。迁移完成前不删除旧逻辑。

**[Risk] sync_queue 积压** → drainQueue(limit=50) 分批推送，每次前台触发时处理一批。极端情况下队列可能积压几百条，但不会无限增长（去重机制：同 entity+entityId 只保留最新）。

**[Risk] 写入时构造 payload 增加写入延迟** → JSON.stringify 是微秒级操作，相比 SQLite 写入（毫秒级）可忽略。

**[Trade-off] 通用 apply 丢失实体特殊逻辑** → reflection 的 colors 保护等特殊逻辑需要保留为 hook/override，不完全通用化。预估 ~20 行特殊处理。

## Migration Plan

1. 新版 SyncService 代码就绪后，先在开发环境测试
2. 迁移逻辑：`migrateToSyncQueue()` 扫描所有 `synced=0` 的记录，构造 payload 写入 sync_queue
3. 迁移标记：`app_state` 表中写入 `sync_queue_migrated=1`，避免重复迁移
4. 迁移完成后，旧的 `synced` 列扫描逻辑不再执行
5. 回滚策略：如果迁移失败，保留旧 SyncService 代码一个版本周期

## Open Questions

- `mergeById()`（core/sync/merge.ts）在 mobile 端是否被使用？如果不用，可一并删除。
- 是否需要 sync_queue 的大小上限？（防极端场景积压）
