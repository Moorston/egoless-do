# PB 同步 GoError 排查修复 — 执行计划

## 执行顺序清单

### Step 1: 修复 `safeFindRecords`（3 个文件）
- [ ] `backend/pb_hooks/sync.pb.js` — 将最终 fallback 包入 try-catch，失败返回 `[]`
  - 3 个 `safeFindRecords` 定义（POST /api/sync、GET /api/sync、GET /api/sync/check）
  - 每个的最后一行 `return app.findRecordsByFilter(...)` 改为 `try { return ... } catch { return []; }`
- [ ] `backend/pb_hooks/sync_push_pull.pb.js` — 同上
  - 2 个 `safeFindRecords` 定义（POST /api/sync/push、POST /api/sync/pull）

### Step 2: 改进错误日志
- [ ] 所有 catch 块 `console.error("[sync-xxx] entity error for ...: " + (qErr.name || "SyncError"))` 改为输出 `qErr.message`
  - `sync.pb.js`: POST /api/sync pull (line 123)、GET /api/sync (line 203)、GET /api/sync/check (line 254)
  - `sync_push_pull.pb.js`: POST /api/sync/pull (line 209)

### Step 3: PB schema 添加 `updated_at` 字段
- [ ] `backend/pb_schema.json` — `user_profiles` collection 添加 `updated_at` (datetime) 字段
- [ ] `backend/pb_schema.json` — `ai_configs` collection 添加 `updated_at` (datetime) 字段

## 验证

- 检查代码语法正确性（JS 文件无语法错误）
- `backend/pb_schema.json` JSON 格式有效