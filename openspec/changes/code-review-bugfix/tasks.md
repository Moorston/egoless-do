# Tasks

## P0 — 数据安全修复 ✅ 已完成

**Commit**: `40b7403` — `fix: P0 代码审查修复 — 同步安全 + SQL 注入防护`

- [x] 1. 添加 `ALL_ENTITY_TABLES` 常量到 `entitySchemas.ts`
- [x] 2. SyncEngine `purgeDeletedRecords` 使用 `ALL_ENTITY_TABLES` 替代硬编码
- [x] 3. SyncEngine `hardReset` 使用 `ALL_ENTITY_TABLES` 替代硬编码（已经是动态的）
- [x] 4. 提取 SQL helper 函数到 `db/sqlHelper.ts`
- [x] 5. 修复 `notification.ts` 的 `process.env` 问题（改为可配置）
- [x] 6. type-check + test 验证

## P1 — 可维护性改进 ✅ 部分完成

**Commit**: `35fd336` — `refactor: 提取 SyncEngine 孤儿恢复逻辑到独立模块`

- [x] 7. 高风险组件 useEffect 清理审查 — 全部正确
- [x] 8. SyncEngine 提取孤儿恢复逻辑到 `orphanRecovery.ts`
- [ ] 9. 统一 Theme 系统（留后续 change）
- [ ] 10. 添加关键模块测试（留后续 change）

## 不在本次范围（留后续 change）

- ❌ 大文件拆分（BreathingScreen, SleepScreen）
- ❌ reflections/ 拆分
- ❌ practice/ 拆分
- ❌ 开启 noImplicitAny
