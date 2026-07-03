# 数据同步修复 — 技术设计

## 变更一览

| ID | 变更 | 涉及文件 | 类型 |
|----|------|---------|------|
| FIX-1 | 新增迁移: 为缺少 `created` 的同步集合添加 autodate 字段 | `backend/pb_migrations/` (新文件) | 数据库迁移 |
| FIX-2 | 新增 pb_hooks 路由: `POST /api/push` | `backend/pb_hooks/sync_push_pull.pb.js` | 后端路由 |

---

## FIX-1: 添加 `created` autodate 字段

### 需要检查的集合

以下 14 个由迁移 `012` 创建、被 `1782500000` 跳过的集合：

`ai_configs`, `checkin_reviews`, `exercise_entries`, `plans`, `plan_items`, `plan_item_checkins`, `daily_custom_todos`, `daily_todo_history`, `grace_history`, `thought_trails`, `trail_notes`, `reflection_links`, `meditation_history`, `user_profiles`

另需检查已在 `012` 之前创建、同样可能缺少 `created` 的集合：
`habits`, `reflections`, `fasting_sessions`, `food_entries`, `checkin_records`

### 检测逻辑

对每个同步集合:
1. 遍历其 `fields` 列表
2. 检查是否存在 `type === "autodate"` 且 `name === "created"` 的字段
3. 如果不存在，添加一个 `autodate` 类型的 `created` 字段（onCreate=true, onUpdate=false）

### 字段定义

```javascript
{
  "hidden": false,
  "id": "autodate_created",           // 唯一 ID，按集合名生成
  "name": "created",
  "onCreate": true,
  "onUpdate": false,
  "presentable": false,
  "system": false,
  "type": "autodate"
}
```

### 受影响代码

无 — 5 处 `-created` 排序代码保持不变。

### 回滚

迁移的 down 函数中移除新增的 `created` 字段。

---

## FIX-2: 实现 `POST /api/push` 端点

### 接口定义

```
POST /api/push
Authorization: Bearer <authToken>
Content-Type: application/json

{
  "platform": "ios",        // "web" | "android" | "ios"
  "token": "ExponentPushToken[xxxx]"
}
```

### 成功响应

```json
{
  "ok": true
}
```

### 错误响应

```json
// 400 — 参数校验失败
{ "code": "INVALID_PLATFORM", "message": "Platform must be one of: web, android, ios" }
{ "code": "INVALID_TOKEN", "message": "Token is required" }

// 401 — 未认证
{ "code": "UNAUTHORIZED", "message": "Unauthorized" }
```

### 处理逻辑

1. 验证用户已认证（通过 `e.requestInfo().auth`）
2. 解析请求体中的 `platform` 和 `token`
3. 校验 `platform ∈ ["web", "android", "ios"]`
4. 校验 `token` 非空字符串
5. 检查是否已存在相同 `user_id` + `platform` 的令牌：
   - 如果存在且 token 相同，直接返回 `{ ok: true }`
   - 如果存在但 token 不同，更新 token
   - 如果不存在，创建新记录
6. 写 `push_tokens` 集合
7. 返回 `{ ok: true }`

### 去重策略

使用 `user_id + platform` 组合查询现有记录（集合上有 `user_id` 索引）。同一用户同一平台只保留一个令牌记录，避免冗余。

### 代码位置

追加到 `backend/pb_hooks/sync_push_pull.pb.js`（与 `POST /api/sync/push` 和 `POST /api/sync/pull` 同文件）。

### 不实现

`PUT /api/push` 发送推送通知功能本次不做。如果客户端调用将返回 `501 Not Implemented`。

---

## 数据流图

```
┌──────────────────┐         ┌──────────────────────────────┐
│  移动端 SyncEngine │──POST──▶│  POST /api/sync             │
│  (push changes)   │   /sync │  1. 写入变更到各集合        │
└──────────────────┘         │  2. 用 -created 排序拉取数据  │
                             │     ✓ created 字段存在 → 正常 │
                             └──────────────────────────────┘

┌──────────────────┐         ┌──────────────────────────────┐
│  移动端 useSync   │──POST──▶│  POST /api/push (新增)       │
│  (注册推送令牌)    │   /push │  1. 校验平台+令牌参数       │
└──────────────────┘         │  2. 写入 push_tokens 集合    │
                             │  3. 返回 { ok: true }         │
                             └──────────────────────────────┘
```

## 兼容性

- FIX-1 向下兼容：已有数据不受影响，`created` 只在新记录上自动填充
- FIX-2 向后兼容：客户端已调用 `POST /api/push`，新增路由后立即生效
- 无需客户端代码变更

## 风险与缓解

| 风险 | 缓解 |
|------|------|
| 迁移 ID 与已有迁移冲突 | 使用时间戳命名（如 `1782500001_fix_missing_created_fields.js`） |
| 某些集合已有 `created` 字段 | 迁移检查字段存在性，跳过已存在的 |
| `POST /api/push` 被未认证用户调用 | 返回 `401 Unauthorized` |
