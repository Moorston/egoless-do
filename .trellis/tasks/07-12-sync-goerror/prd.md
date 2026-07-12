# PB 同步 GoError 排查修复

## Goal

排查并修复 PocketBase 同步系统中持续的 `GoError` 错误，确保所有实体（特别是 `profile` 和 `aiConfig`）的拉取和变更检测正常进行。

## Background / 调研发现

### 错误日志分析

```
09:47:12 [sync] pull error for profile: GoError      ← 持续出现
09:47:12 [sync] pull error for aiConfig: GoError      ← 持续出现
09:47:14 [sync-check] entity error for *ALL* entities: GoError  ← 间歇性全部失败
09:49:16 [sync] pull error for profile: GoError        ← 重复
09:49:16 [sync] pull error for aiConfig: GoError        ← 重复
09:49:18 [sync-check] entity error for *ALL* entities: GoError  ← 间歇性全部失败
```

错误类型分两种：
1. **`profile`/`aiConfig` 持续 pull 失败** — 每次 sync 都出现
2. **所有实体间歇性 sync-check 失败** — 某些 sync 周期全部失败

### 客户端行为

- `apiSyncCheck()` 失败时，客户端 `catch` 并设 `hasChanges = true`（安全降级）
- `apiSyncPull()` 失败时，客户端 `catch` 只记录日志并跳过
- 因此用户的同步功能**基本不受影响**，但 sync-check 优化失效、pull 数据可能缺失

### 服务端代码分析

**`safeFindRecords` 函数**（pb_hooks 中）：
```js
function safeFindRecords(app, coll, filter, limit, offset) {
    try { return app.findRecordsByFilter(coll, filter, "-created", ...); } catch (e1) {
        try { return app.findRecordsByFilter(coll, filter, "-updated", ...); } catch (e2) {
            try { return app.findRecordsByFilter(coll, filter, "-updated_at", ...); } catch (e3) {
                return app.findRecordsByFilter(coll, filter, "", ...); // ← 不在 try-catch 中！
            }
        }
    }
}
```

最终 fallback `app.findRecordsByFilter(coll, filter, "")` **不在 try-catch 中**。

错误日志仅输出 `qErr.name`（"GoError"），不输出 `qErr.message`，无法定位具体原因。

## Requirements

### R1: 修复 `safeFindRecords` 最后 fallback 的异常处理
- 将最终 fallback（空排序）也包入 try-catch
- 失败时返回空数组而非抛异常

### R2: 改进错误日志
- 输出 `qErr.message` 和 `qErr.name`
- 区分"集合不存在"、"过滤条件无效"、"PB 内部错误"等场景

### R3: 排查 `profile`/`aiConfig` 持续失败的根因
- 检查 PB 实例中 `user_profiles`/`ai_configs` 集合是否确实存在
- 确认 `user_id` 字段在 PB 中的类型和索引配置

### R4: 为 `user_profiles` 和 `ai_configs` 添加 `updated_at` 顶级字段
- PB collection schema 添加 `updated_at`（datetime 类型）顶级字段
- 与 `data.updatedAt` 同步

## Acceptance Criteria

- [ ] `safeFindRecords` 所有 fallback 路径都有异常保护，不再抛 `GoError`
- [ ] 错误日志显示具体消息而非仅 `GoError`
- [ ] `profile` 和 `aiConfig` 的 pull 错误不再持续出现

## Out of Scope

- 重写 PB hooks sync 逻辑
- 修改客户端 SyncEngine 同步策略
- 添加新的实体集合

## Open Questions (已确认)

1. **PB 实例是否存在 `user_profiles`/`ai_configs` 集合？** — pb_schema.json 中已定义，但需要确认实际 PB 中是否已创建
2. **`safeFindRecords` 使用空排序是否在某些 PB 版本中受限？** — 最终 fallback 缺失 try-catch 是已知缺陷