# 实施计划

## 实施顺序

```
Task 1: 新增迁移 015 → 添加 created autodate 字段
  └── 验证: PocketBase migrate up + 查询排序
Task 2: 新增 POST /api/push 端点
  └── 验证: curl 调用注册 + 查询 push_tokens 集合
```

## Task 1: 新增迁移 015

**文件**: `backend/pb_migrations/015_fix_missing_created_fields.js`

**实施步骤**:
1. 定义所有可能缺少 `created` 的同步集合列表（以下 19 个）：

   `habits`, `reflections`, `fasting_sessions`, `food_entries`, `checkin_records`, `meditation_history`, `user_profiles`, `exercise_entries`, `plans`, `plan_items`, `plan_item_checkins`, `daily_custom_todos`, `daily_todo_history`, `grace_history`, `thought_trails`, `trail_notes`, `reflection_links`, `ai_configs`, `checkin_reviews`

2. 对每个集合，检查 fields 中是否存在 `type === "autodate" && name === "created"`
3. 如果缺失，添加该字段（onCreate=true, onUpdate=false），使用唯一 ID `autodate_created_{name}`
4. 保存集合

**回滚函数**: 移除刚添加的 `created` 字段。

**验证命令**:
```bash
# 应用迁移
cd backend && ./pb migrate up

# 验证 ai_configs 可按 -created 排序
# 通过检查日志，POST /api/sync 不再输出 "[sync] pull error for aiConfig"
```

## Task 2: 新增 POST /api/push 端点

**文件**: `backend/pb_hooks/sync_push_pull.pb.js`

**实施步骤**:
1. 在文件末尾追加 `POST /api/push` 路由注册
2. 认证检查: `e.requestInfo().auth`
3. 解析 body: `{ platform, token }`
4. 校验:
   - `platform` ∈ `["web", "android", "ios"]` → 否则返回 `400 INVALID_PLATFORM`
   - `token` 非空字符串 → 否则返回 `400 INVALID_TOKEN`
5. 查询已有记录: `user_id = <userId> && platform = <platform>`
   - 已有且 token 相同 → `{ ok: true }`
   - 已有但 token 不同 → 更新 token 字段
   - 无 → 创建新 Record，设 `user_id`、`platform`、`token`
6. 返回 `{ ok: true }`

**验证命令**:
```bash
# 注册令牌
curl -X POST /api/push \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"platform":"ios","token":"expo-test-token-123"}'

# 预期: 200 {"ok":true}

# 非法参数
curl -X POST /api/push \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"platform":"invalid","token":"test"}'

# 预期: 400 {"code":"INVALID_PLATFORM","message":"Platform must be one of: web, android, ios"}
```

## 风险与回滚点

- **迁移失败**: 运行 `./pb migrate down` 回滚最近一次迁移
- **路由注册错误**: 移除追加的代码段，重启 PocketBase

## Review Gate 清单

- [ ] `prd.md` → design.md → implement.md 三方一致
- [ ] 无客户端代码修改
- [ ] migration 文件测试过 up 和 down
- [ ] POST /api/push 各种边界情况处理（空 token、非法 platform、无 auth）
