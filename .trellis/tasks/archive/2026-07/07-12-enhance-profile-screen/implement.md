# 执行计划：用户资料页增强

## 任务清单

### Phase 1: 后端 — 新增 change-password 端点

- [ ] 1.1 创建 `infra/docker/api/src/auth/change-password.ts`
  - 使用 `verifyAuth` 鉴权
  - 使用 `getClientIp` + `resetRateLimit` 限流
  - 用 `pb.authWithPassword(email, currentPassword)` 验证旧密码（需先从 token 获取 email）
  - 更新 PocketBase 用户密码
  - 黑名单当前 token + 吊销所有 refresh token
  - 返回 `{ ok: true, message }`
- [ ] 1.2 在 `infra/docker/api/src/index.ts` 注册路由
  - `app.route('/api/auth', changePasswordApp);`
- [ ] 1.3 验证：`pnpm run api:build` 通过

### Phase 2: 前端 Core — 新增 apiChangePassword

- [ ] 2.1 在 `packages/core/src/auth.ts` 新增 `apiChangePassword(token, currentPassword, newPassword)`
- [ ] 2.2 验证：`pnpm run test` 通过

### Phase 3: 前端 ProfileScreen — 修改密码 Modal

- [ ] 3.1 在 ProfileScreen 顶部用户资料卡片底部增加"修改密码"按钮
- [ ] 3.2 创建密码修改 Modal（当前密码 + 新密码 + 确认新密码 + 提交）
- [ ] 3.3 前端密码强度校验（使用 `validatePassword`）
- [ ] 3.4 成功时 Alert 提示 → 导航到 Login

### Phase 4: 座右铭迁移

- [ ] 4.1 从 Journey 卡片移除座右铭（第 366-395 行）
- [ ] 4.2 在用户资料卡片邮箱下方插入座右铭

### Phase 5: 验证

- [ ] 5.1 `pnpm run type-check` 通过
- [ ] 5.2 `pnpm run test` 通过
- [ ] 5.3 `pnpm run lint` 通过

## 验证命令

```bash
pnpm run api:build      # 后端构建
pnpm run type-check     # 类型检查
pnpm run test           # 测试
pnpm run lint           # 代码规范
```

## 风险点

| 风险 | 说明 | 缓解 |
|------|------|------|
| 后端鉴权绕过 | 未经验证的用户修改密码 | 使用 `verifyAuth` 中间件 |
| 旧密码验证失败 | 用户忘记密码无法修改 | 使用 `authWithPassword` 验证 |
| token 未正确吊销 | 旧 token 仍可用 | 黑名单 + 吊销 refresh token |
| 密码强度不一致 | 前后端校验规则不同 | 使用同一个 `validatePassword` |

## 回滚点

- 后端文件：`infra/docker/api/src/auth/change-password.ts` 可安全删除
- 路由注册：`index.ts` 中移除对应 import 和 route
- 前端 Core：`auth.ts` 中移除 `apiChangePassword`
- ProfileScreen：恢复 git 历史