# Tasks

## P0 — 数据安全修复

- [x] 1. 添加 `ALL_ENTITY_TABLES` 常量到 `entitySchemas.ts`
- [x] 2. SyncEngine `purgeDeletedRecords` 使用 `ALL_ENTITY_TABLES` 替代硬编码
- [x] 3. SyncEngine `hardReset` 使用 `ALL_ENTITY_TABLES` 替代硬编码
- [x] 4. 提取 `SYNC_QUEUE_UPSERT_SQL` 到 `db/sqlHelper.ts`，消除 syncQueue.ts 和 WriteBatcher.ts 的重复
- [x] 5. SyncEngine 关键路径空 catch 块添加日志（已完成于前几轮修复）
- [x] 6. type-check + test 验证

## P1 — 可维护性改进

- [ ] 7. 高风险组件 useEffect 清理审查
- [x] 8. SyncEngine 提取孤儿恢复逻辑（已存在于 orphanRecovery.ts）
- [ ] 9. 统一 Theme 系统（如时间允许）
- [ ] 10. 添加关键模块测试（如时间允许）

## 不在本次范围

- ❌ 大文件拆分（BreathingScreen, SleepScreen）
- ❌ reflections/ 拆分
- ❌ practice/ 拆分
- ❌ 开启 noImplicitAny
