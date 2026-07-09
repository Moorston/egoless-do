# 登录注册架构深度修复

## 背景
深度架构审查发现 14 项问题（3 HIGH + 5 MEDIUM）。前两轮审查（07-08、07-09）已处理 10 项。本轮聚焦剩余 8 项。

## 修复项

### S1: check-email 用户枚举（HIGH）
返回值不区分"未注册"和"已注册"，只返回 `{ ok: true }`。
- **文件**: `infra/docker/api/src/auth/check-email.ts`
- **方向**: 改为始终返回 `{ ok: true }`，注册时再提示已存在

### S6: 客户端缺少常见密码检查（MEDIUM）
客户端 `validatePassword` 不检查常见密码（`password123!` 通过）。
- **文件**: `packages/core/src/auth.ts`
- **方向**: 同步 `COMMON_PASSWORDS` 到客户端

### A1: push token 注册逻辑从 UI 层抽到 store（HIGH）
LoginScreen 包含 35 行 push token 业务逻辑。
- **文件**: `apps/mobile/src/features/auth/LoginScreen.tsx`
- **方向**: 提取到 `initApp.ts` 的 post-login hook

### A3: validatePassword 客户端/服务端不一致（MEDIUM）
两个版本规则不同。
- **文件**: `packages/core/src/auth.ts`、`infra/docker/api/src/auth-middleware.ts`
- **方向**: 服务端导入客户端版本，或共享常量

### A5: 注册端点零审计日志（MEDIUM）
- **文件**: `infra/docker/api/src/auth/register.ts`
- **方向**: 添加 `logAuditEvent`

### A6: pullServerData 失败不回滚 auth（MEDIUM）
- **文件**: `packages/core/src/store/createAuthSlice.ts`
- **方向**: catch 块中回滚 auth 状态

### T3: 登录并发 guard 缺失（MEDIUM）
- **文件**: `packages/core/src/store/createAuthSlice.ts`
- **方向**: 类似 `_refreshInFlight` 的 `_loginInFlight` guard

## 约束
- 遵循项目规范
- 不破坏现有 API 契约

## 验收标准
- [ ] `pnpm --filter @egoless-do/core test` — 608 测试通过
- [ ] 服务端 check-email 不再泄露用户注册状态
- [ ] 注册端点有审计日志
- [ ] 登录并发 guard 生效
