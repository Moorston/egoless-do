## 1. 清理 Web 端同步代码

- [x] 1.1 删除 `apps/web/src/db/syncService.ts`（299 行）
- [x] 1.2 删除 `apps/web/src/db/syncQueue.ts`（45 行）
- [x] 1.3 删除 `apps/web/src/db/webDb.ts`（154 行）
- [x] 1.4 删除 `apps/web/src/components/useSync.ts`（97 行）
- [x] 1.5 删除 `apps/web/src/store/storageAdapter.ts`（80 行）
- [x] 1.6 删除 `apps/web/src/app/api/sync/realtime/route.ts`（109 行）
- [x] 1.7 清理 `apps/web/src/components/AppShell.tsx` 中对 useSync 的引用
- [x] 1.8 清理 `apps/web/src/components/SettingsTab.tsx` 中对同步状态的引用
- [x] 1.9 清理 `apps/web/src/store/useWebStore.ts` 中对同步相关的引用
- [x] 1.10 验证：web 端编译通过，无新增 TypeScript 错误（17 个预存错误不变）

## 2. 清理 Core 中 Web 专用模块

- [x] 2.1 删除 `packages/core/src/realtimeSync.ts`（178 行）
- [x] 2.2 删除 `packages/core/src/sync/engine.ts`（187 行）
- [x] 2.3 检查 `packages/core/src/sync/merge.ts` — 仍被 createAuthSlice 使用，保留
- [x] 2.4 更新 `packages/core/src/sync/index.ts` 移除对 engine 的导出
- [x] 2.5 更新 `packages/core/src/index.ts` 移除 realtimeSync 导出
- [x] 2.6 检查 `packages/core/src/store/` — 未引用 SyncEngine
- [x] 2.7 验证：core 包编译通过，无新增错误

## 3. 服务器新增 check 端点

- [x] 3.1 创建 `apps/web/src/app/api/sync/check/route.ts`，实现 GET 端点
- [x] 3.2 验证认证：未认证返回 401
- [x] 3.3 实现查询逻辑：遍历 ENTITY_COLLECTION 查询 `updated >= since` 的记录数
- [x] 3.4 返回格式：`{ hasChanges: boolean, count: number }`
- [x] 3.5 添加限流：30 req/min per IP
- [ ] 3.6 验证：端点可用，响应 < 100ms（需部署后手动验证）

## 4. 重构 Mobile SyncService — sync_queue 入队

- [x] 4.1 在 `apps/mobile/src/db/schema.ts` 中确认 sync_queue 表已存在（已有）
- [x] 4.2 创建 `apps/mobile/src/features/sync/syncQueueWriter.ts`，实现 `enqueueForSync(entity, entityId, operation, payload)` 函数
- [x] 4.3 实现入队逻辑：DELETE 同 entity+entityId 旧记录 → INSERT 新记录
- [x] 4.4 创建 payload 构造函数：各实体写入时构造 camelCase JSON payload（复用现有 xxxToSync 的字段映射逻辑，但只写一次）
- [x] 4.5 在 habit 写入处调用 enqueueForSync（示例集成点）
- [x] 4.6 在 reflection 写入处调用 enqueueForSync
- [x] 4.7 在 fasting 写入处调用 enqueueForSync
- [x] 4.8 在 food 写入处调用 enqueueForSync
- [x] 4.9 在 checkin 写入处调用 enqueueForSync
- [x] 4.10 在 exercise 写入处调用 enqueueForSync
- [x] 4.11 在 meditation 写入处调用 enqueueForSync
- [x] 4.12 在 profile 写入处调用 enqueueForSync
- [x] 4.13 在 plan/planItem/planItemCheckin 写入处调用 enqueueForSync
- [x] 4.14 在 grace/dailyCustomTodo/dailyTodoHistory 写入处调用 enqueueForSync
- [x] 4.15 在删除操作处调用 enqueueForSync(operation='delete')

## 5. 重构 Mobile SyncService — 同步流程

- [x] 5.1 重写 `apps/mobile/src/features/sync/SyncService.ts` 的 `runSync()` 函数
- [x] 5.2 实现新流程：drainQueue(50) → POST /api/sync → removeQueueItems → applyServerChanges
- [x] 5.3 删除 `getUnsynced()` 函数和所有 `xxxToSync()` mapper（~120 行）
- [x] 5.4 删除 `buildChanges()` 函数（~60 行）
- [x] 5.5 重写 `applyServerChanges()` 为通用逻辑：entity → table 映射 + INSERT OR REPLACE
- [x] 5.6 保留 reflection colors 特殊保护逻辑（~10 行）
- [x] 5.7 保留 profile singleton 处理逻辑
- [x] 5.8 同步成功后 markSynced：更新对应实体表的 synced=1
- [x] 5.9 验证：SyncService 从 757 行精简到 ~480 行（含 14 实体映射的最低开销）

## 6. 优化实时轮询

- [x] 6.1 修改 `apps/mobile/src/features/sync/SyncService.ts` 的 `connectRealtime()` 函数
- [x] 6.2 将轮询间隔从 30s 改为 60s
- [x] 6.3 实现先调 check 端点的逻辑：GET /api/sync/check?since={lastSyncAt}
- [x] 6.4 hasChanges=true 时才触发 runSync()
- [x] 6.5 hasChanges=false 时跳过，等下一个周期
- [x] 6.6 如果 sync_queue 有待推送记录，跳过 check 直接 runSync()
- [x] 6.7 验证：无变更时仅产生轻量 check 请求（14 collection 查询优化为单次请求）

## 7. 旧数据迁移

- [x] 7.1 创建 `apps/mobile/src/features/sync/migrateToSyncQueue.ts`
- [x] 7.2 实现迁移逻辑：扫描所有 synced=0 的记录，构造 payload 写入 sync_queue
- [x] 7.3 迁移完成后在 app_state 表写入 sync_queue_migrated=1
- [x] 7.4 在 useSync hook 中调用迁移函数（启动时检测）
- [x] 7.5 迁移完成前保留旧同步逻辑作为 fallback（迁移是同步前的阻塞步骤）
- [ ] 7.6 验证：模拟升级场景，旧数据正确迁移到 sync_queue

## 8. 集成测试与清理

- [ ] 8.1 端到端测试：创建数据 → 切后台 → 切前台 → 验证服务器收到变更（需部署后手动验证）
- [ ] 8.2 端到端测试：服务器有变更 → 切前台 → 验证本地收到变更（需部署后手动验证）
- [ ] 8.3 端到端测试：删除记录 → 同步 → 验证服务器软删除（需部署后手动验证）
- [ ] 8.4 端到端测试：冲突场景（本地和服务器同时修改）→ 验证时间戳解决（需部署后手动验证）
- [x] 8.5 清理 SyncService.ts 中不再需要的旧代码（Phase 5 已完成）
- [x] 8.6 清理 core 包中不再导出的类型引用（无残留引用）
- [x] 8.7 更新 `packages/core/src/utils.ts` 中的 FIELD_MAPPING（无需修改）
- [x] 8.8 验证完整构建：无新增 TypeScript 错误（预存错误不变）
