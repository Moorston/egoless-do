# PRD: P0 — 修复 sync 协议 op/operation 字段名不匹配

## 背景
深度代码审查（session 52）发现活跃 P0 bug：客户端 `SyncEngine.ts` 推送的 changes 数组元素字段名为 `op`，但服务端 `sync_push_pull.pb.js` 与 `sync.pb.js` 读取的字段名为 `operation`。

## 问题
- 客户端 `SyncEngine.ts:330,336` 构造 `{ entity, entityId, payload, op: 'upsert'|'delete' }`
- 服务端 `sync_push_pull.pb.js:29` 与 `sync.pb.js:55` 读取 `c.operation`
- 结果：`operation` 字段始终为 `undefined`，`if (operation === 'delete')` 永假
- **后果**：客户端所有 delete 操作静默变为 upsert，远程数据无法删除

## 修复方案
**选 A（推荐）**: 客户端对齐服务端 — `SyncEngine.ts` 把 `op` 改为 `operation`
- 改动最小（1 行）、风险最低
- 服务端代码是稳定的 PocketBase hook，不应改动

## 验收标准
1. `git grep -n "op:" apps/mobile/src/features/sync/SyncEngine.ts` 不再匹配 changes 数组元素
2. 构造的 changes 对象使用 `operation` 字段
3. `pnpm run test` 全量通过（尤其 SyncEngine 相关测试）
4. 手动验证：本地删除一条 habit → 刷新后 PocketBase 远程记录也应标记删除

## 影响范围
- 仅 `apps/mobile/src/features/sync/SyncEngine.ts` 1 文件
- 运行时行为变更：delete 操作将正确传递到服务端

## 回滚点
若修复导致同步异常，revert `SyncEngine.ts` 单行改动即可恢复原行为（delete 仍会静默失效，但不会更糟）
