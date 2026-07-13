# 分析 token 过期机制

## Goal
全面分析项目的 token 认证体系，包括 JWT 生命周期、refresh token 轮换机制、黑名单、过期处理流程，识别潜在风险。

## 分析范围

### 客户端 (packages/core)
- `createAuthSlice.ts` — token 存储、refreshAuth 逻辑、登出流程
- `auth.ts` — API 调用（login、register、refresh、logout）
- `fetch.ts` — 错误分类（AuthError、KickedOutError）

### 服务端 (infra/docker/api)
- `token-refresh-rotation.ts` — refresh token 生成、校验、轮换、撤销
- `token-blacklist.ts` — JWT 黑名单管理
- `rate-limit.ts` — 登录频率限制

### 初始化流程 (apps/mobile)
- `initApp.ts` — token 恢复、SecureStore 读写

## 分析维度
1. Token 生命周期（创建、验证、刷新、撤销）
2. Refresh token 轮换机制的安全性
3. 并发竞态处理（refresh 去重、登录防重）
4. 黑名单的 fail-open 策略
5. 过期检测的 proactive 窗口
6. 登出/密码重置时的 token 清除
7. 服务端到客户端的 token 失效通知

## 交付物
- 完整的 token 机制分析文档
- 识别出的安全风险和改进建议
