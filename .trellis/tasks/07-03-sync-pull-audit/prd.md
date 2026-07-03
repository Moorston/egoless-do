# 深度审查数据同步拉取架构和数据模型一致性

## Goal

修复数据同步系统中两个导致功能异常的缺陷：同步拉取时因缺失 `created` 字段产生的排序错误，以及推送令牌注册因缺少后端端点而超时失败。恢复离线同步功能和推送通知注册。

## Background

当前同步系统使用 PocketBase 作为后端，客户端（React Native / Expo）通过自定义 `POST /api/sync`、`GET /api/sync`、`POST /api/sync/pull` 等端点执行数据拉取和推送。

审计发现以下两个独立问题：

### Bug 1: 同步集合缺少 `created` autodate 字段

迁移 `012_add_remaining_sync_collections.js` 以 3 字段（`user_id`、`[entity]_id`、`data`）创建了 `ai_configs` 等 12 个同步集合。后续迁移 `013` 补充了 `deleted` 和 `updated_at`，但 `created` 自动日期字段从未被添加。

迁移 `1782500000_create_all_sync_collections.js` 的 `syncFields()` 函数虽然定义了 `created` autodate 字段，但其 `ensureCollection()` 因集合已存在而跳过添加。

后端 5 处端点使用 `-created` 排序（`sync.pb.js:87,138,187`、`sync_push_pull.pb.js:119,126`），导致 `$app.findRecordsByFilter()` 抛出 `invalid sort field "created"` 错误。

受影响集合：`ai_configs`、`checkin_reviews`、`exercise_entries`、`plans`、`plan_items`、`plan_item_checkins`、`daily_custom_todos`、`daily_todo_history`、`grace_history`、`thought_trails`、`trail_notes`、`reflection_links`、`meditation_history`、`user_profiles`。

### Bug 2: 推送令牌注册后端端点缺失

客户端 `packages/core/src/push.ts:38` 调用 `POST ${apiBase}/api/push` 注册推送令牌，但后端 pb_hooks 中没有任何路由注册处理此请求。`fetchWithTimeout` 在 15 秒后抛出 `NetworkError('请求超时，请检查网络')`。

`push_tokens` 集合已在 PocketBase 中存在（含 `user_id`、`platform`、`token` 字段），但缺少后端 handler 将令牌写入集合。

## Confirmed Facts

- Bug 1 影响全部 14 个在迁移 `012` 中创建、被 `1782500000` 跳过的同步集合
- 迁移 `013` 已添加 `deleted` 和 `updated_at`，但未添加 `created`
- 5 处排序调用全部使用 `"-created"` 字符串字面量，期望 PocketBase 系统 autodate 字段
- Bug 1 的 `catch` 块在 `sync.pb.js:97` 打印错误但不中断流程，其他 4 处静默忽略错误
- Bug 2 的 `POST /api/push` 路由从未在任何 pb_hooks 文件中注册
- `push_tokens` 集合已正确创建，含 `user_id`、`platform`、`token` 字段及索引
- 客户端 `registerPushToken()` 在登录和应用启动时调用

## Requirements

### REQ-1: 修复 `-created` 排序错误
- 为所有缺少 `created` 字段的同步集合添加 PocketBase `autodate` 类型的 `created` 字段（onCreate=true, onUpdate=false）
- 不修改现有 5 处 `-created` 排序代码
- 不破坏现有数据

### REQ-2: 实现推送令牌注册端点
- 在后端 pb_hooks 中注册 `POST /api/push` 路由
- 接收 `{ platform, token }`，写入 `push_tokens` 集合
- 校验 `platform` 合法值（web/android/ios）、`token` 非空
- 返回 `{ ok: true }`
- 已有的 `PUT /api/push` 发送通知功能本次不做实现（返回 `501 Not Implemented`）

## Acceptance Criteria

- [ ] **AC-1**: 新增迁移执行后，通过 PocketBase API 或 pb_hooks 查询 `ai_configs` 集合的记录，确认可成功按 `-created` 排序
- [ ] **AC-2**: 调用 `POST /api/sync`（含 `lastSyncAt`），所有 38 个实体类型不再抛出 `invalid sort field "created"` 错误
- [ ] **AC-3**: 调用 `POST /api/push` 提交 `{ platform: "ios", token: "test-token" }`，返回 `200 { ok: true }`
- [ ] **AC-4**: 调用 `POST /api/push` 提交非法参数（空 token、非法 platform），返回 `400` 错误
- [ ] **AC-5**: `push_tokens` 集合中存在刚注册的令牌记录
- [ ] **AC-6**: 所有 pb_migrations 测试通过（`migrate up` 与 `migrate down`）

## Out of Scope

- 实现 `PUT /api/push` 发送推送通知功能
- 客户端 push.ts 的代码修改
- 移动端 `SyncEngine.ts` 或 `SyncService.ts` 的修改
- Web 端相关修改

## Open Questions

（无 — 方案已确定）
