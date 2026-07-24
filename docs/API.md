# API 文档（认证网关层）

> 最后核对：2026-07-24 · 与 `infra/docker/api/src/index.ts` 实际路由对齐
> 关联：`docs/f1-backend-boundary-analysis.md`

## 概述

`egoless-do` 的后端是**两层**结构，请勿与「PocketBase 唯一数据源」混淆：

1. **PocketBase（`backend/`）** —— 唯一数据存储，承载业务数据、同步协议（`pb_hooks/sync_push_pull`）与实时事件（`/api/realtime`）。**数据读写走 PB 原生 REST `/api/collections/...`，不经网关。**
2. **认证网关（`infra/docker/api`，Hono）** —— 本文件描述的即是这一层。它是一层 BFF，负责认证与安全增强（MFA / RBAC / 限流 / 审计 / 验证码 / 账号锁定 / 微信登录），自身不持有业务数据（其自建的 7 个安全集合也落在 PocketBase 上）。

移动端只认一个域名（`egolessdo.freebytes.net`），由 `infra/nginx/nginx.conf` 按路径分流：
`/api/auth/*`、`/api/push`、`/api/plan/*`、`/api/monitoring`、`/api/setup` → 网关；其余 `/api/*`、`/api/realtime`、`/_/` → PocketBase。

## 基础信息

- **Base URL**: `https://egolessdo.freebytes.net`（生产，经 nginx）→ 网关路径落到 `auth-api:3000`；数据路径落到 `pocketbase:8090`
- **开发**: `http://<lan-ip>:3000`（网关）/ `http://<lan-ip>:8090`（PB）
- **认证**: Bearer Token（**该 token 即 PocketBase 原生 token**，由网关调 `authWithPassword` 后透传，见 `auth/login.ts`）
- **Content-Type**: `application/json`

## 认证 API（`/api/auth`）

### POST /api/auth/register
注册新用户（含邮箱验证码校验）。

**Request Body:**
```json
{ "email": "user@example.com", "password": "password123", "name": "用户名", "code": "123456" }
```
**Response:** `{ "user": {...}, "token": "<PB token>", "refreshToken": "<网关 refresh>", "expiresAt": 1234567890 }`

### POST /api/auth/login
用户登录。网关调用 `pb.collection('users').authWithPassword`，返回 **PB 原生 token**。

**Request Body:** `{ "email": "...", "password": "..." }`
**Response:** 同注册（`token` 为 PB token）。

### POST /api/auth/refresh
用网关 refreshToken 换新的访问 token + refreshToken。

**Request Body:** `{ "refreshToken": "..." }`

### POST /api/auth/logout
登出（撤销网关 refreshToken）。`Authorization: Bearer <token>`

### GET /api/auth/me
获取当前用户。`Authorization: Bearer <token>`

### 其他认证端点
`POST /api/auth/send-code`（发验证码）、`POST /api/auth/check-email`、`POST /api/auth/reset-password`、`POST /api/auth/change-password`、`POST /api/auth/wechat`（微信登录）、`/api/auth/mfa/*`（多因子）、`/api/auth/rbac/*`（角色权限）。

## 推送 / 计划 / 监控（非认证，仍走网关）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST / PUT / DELETE | `/api/push` | 注册 / 更新 / 注销 Expo 推送 token（请求体含 `token`、`platform`） |
| POST | `/api/plan/notify-delayed` | 计划提醒（内部调度） |
| POST | `/api/monitoring` | Sentry tunnel 端点（转发 Sentry 事件，绕过广告拦截器） |
| GET | `/healthz` | 网关就绪探针（集合初始化完成前返回 503） |

## ⚠️ 数据同步**不走网关**

文档旧版曾描述 `POST /api/sync/push` / `GET /api/sync/pull` —— **这些端点不存在**。`index.ts` 未挂载任何 `/api/sync` 路由。

正确的同步路径：
- 客户端经 **PocketBase SDK / fetch** 直连 `${PB_URL}/api/collections/<collection>/records`，并携带 `Authorization: Bearer <PB token>`（即登录拿到的同一个 token）。
- 服务端逻辑在 `backend/pb_hooks/sync_push_pull.pb.js`，实时事件走 `${PB_URL}/api/realtime`。

## 错误响应

所有 API 错误格式：
```json
{ "error": { "code": "ERROR_CODE", "message": "错误描述" } }
```

| 错误码 | HTTP | 说明 |
|--------|------|------|
| `INVALID_CREDENTIALS` | 401 | 邮箱或密码错误 |
| `TOKEN_EXPIRED` | 401 | Token 已过期 |
| `USER_NOT_FOUND` | 404 | 用户不存在 |
| `EMAIL_ALREADY_EXISTS` | 409 | 邮箱已注册 |
| `RATE_LIMIT_EXCEEDED` | 429 | 请求过于频繁 |
| `ACCOUNT_LOCKED` | 429 | 账户被锁定 |
| `INTERNAL_ERROR` | 500 | 服务器内部错误 |

## 限流（网关层，基于 `rate-limit.ts`）

- 认证 API（登录/注册）：按 IP + 按账户双重限流
- 其他 API：约 30 请求/分钟
- 超出返回 `429 RATE_LIMIT_EXCEEDED`
