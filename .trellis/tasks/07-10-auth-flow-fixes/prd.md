# 登录注册流程深度修复

## 背景
深度审查登录/注册流程发现 4 个问题：登录状态时序、验证码发送时机、push token 注册阻塞、路由守卫缺失。

## 修复项

### F1: 登录/注册后 isSignedIn 时序问题（高优先级）
`createAuthSlice.ts:122-127`：登录成功后立即设 `isSignedIn=true`，但 `pullServerData` 和 `initialSync` 还在进行中。
- **修复**: 保持 `isSignedIn=true` 但将 `isLoading` 标记保留到 `pullServerData` 完成
- **文件**: `packages/core/src/store/createAuthSlice.ts`

### F2: 注册时已注册 email 仍可发送验证码（中优先级）
`RegisterScreen.tsx:79-94`：发送验证码前不检查 `emailStatus === 'taken'`。
- **修复**: 发送验证码前检查 email 状态
- **文件**: `apps/mobile/src/features/auth/RegisterScreen.tsx`

### F3: push token 注册阻塞导航（低优先级）
`LoginScreen.tsx:72-106`：push token 注册在导航跳转前执行。
- **修复**: 将 push token 注册移到 `nav.reset()` 之后的 `requestAnimationFrame` 中
- **文件**: `apps/mobile/src/features/auth/LoginScreen.tsx`

### F4: 验证码发送后的 email 状态处理（中优先级）
`RegisterScreen.tsx`：发送验证码后 `emailStatus` 可能仍为 `taken`。
- **修复**: 发送验证码前检查 `emailStatus !== 'taken'`
- **文件**: `apps/mobile/src/features/auth/RegisterScreen.tsx`

## 约束
- 遵循全局代码规范
- 不引入新依赖

## 验收标准
- [ ] `pnpm --filter @egoless-do/core test` — 608 测试通过
- [ ] 登录后不再有"空数据"闪烁
- [ ] 已注册 email 无法发送验证码
- [ ] push token 注册不阻塞导航