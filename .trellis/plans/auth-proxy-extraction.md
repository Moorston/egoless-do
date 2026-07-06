# Auth 代理层独立服务提取方案

## Context

**问题**: 
- 移动端通过 `packages/core/src/auth.ts` 调用 Next.js API 路由 (`/api/auth/login`, `/api/auth/register` 等)
- 这些路由实现在 `_archive/web-legacy/src/app/api/auth/` (Next.js 15, port 3000)
- web-legacy 已归档，但 auth 逻辑仍被移动端依赖
- 生产环境 `EXPO_PUBLIC_API_URL=http://192.168.5.45:8090` 但 PocketBase 没有这些自定义 auth 端点

**现状**:
```
Mobile App (dev)
    │
    ├─ Auth API ──→ http://localhost:3000/api/auth/*  (Next.js, 已归档)
    │    ├─ login, register, refresh, logout
    │    ├─ send-code, check-email, reset-password
    │    └─ wechat (微信登录)
    │
    └─ Sync API ──→ http://localhost:8090/api/sync/*  (PocketBase, 正常)
```

**目标**:
```
Mobile App
    │
    ├─ Auth API ──→ http://localhost:3000/api/auth/*  (Hono, 独立服务)
    │    └─ 同上，迁移到轻量 Hono 服务
    │
    └─ Sync API ──→ http://localhost:8090/api/sync/*  (PocketBase, 正常)
```

## 方案概述

将 web-legacy 的 auth 代理层提取为独立的 Hono 服务，部署在 `infra/docker/api/`。

## Phase 1: 创建 Hono Auth 服务骨架

**目录**: `infra/docker/api/`

新建以下文件结构:
```
infra/docker/api/
├── package.json          (Hono + better-sqlite3 + pocketbase SDK + nodemailer)
├── tsconfig.json
├── Dockerfile
├── .env.example
└── src/
    ├── index.ts          (主入口: Hono app + 路由注册)
    ├── auth/
    │   ├── login.ts      (POST /api/auth/login)
    │   ├── register.ts   (POST /api/auth/register)
    │   ├── refresh.ts    (POST /api/auth/refresh)
    │   ├── logout.ts     (POST /api/auth/logout)
    │   ├── me.ts         (GET /api/auth/me)
    │   ├── send-code.ts  (POST /api/auth/send-code)
    │   ├── check-email.ts(POST /api/auth/check-email)
    │   ├── reset-password.ts (POST /api/auth/reset-password)
    │   └── wechat.ts     (POST /api/auth/wechat)
    ├── db.ts             (better-sqlite3: verification_codes + token_blacklist)
    ├── pb.ts             (PocketBase SDK client, admin auth cache)
    ├── rate-limit.ts     (Map-based in-memory rate limiter)
    ├── auth-middleware.ts (JWT verify + blacklist check)
    └── validation.ts     (密码校验)
```

## Phase 2: 迁移 Auth 路由逻辑

从 `_archive/web-legacy/src/app/api/auth/` 迁移到 Hono 路由:

| 路由 | 源文件 | Hono 端点 |
|------|--------|-----------|
| login | `login/route.ts` | `POST /api/auth/login` |
| register | `register/route.ts` | `POST /api/auth/register` |
| refresh | `refresh/route.ts` | `POST /api/auth/refresh` |
| logout | `logout/route.ts` | `POST /api/auth/logout` |
| me | `me/route.ts` | `GET /api/auth/me` |
| send-code | `send-code/route.ts` | `POST /api/auth/send-code` |
| check-email | `check-email/route.ts` | `POST /api/auth/check-email` |
| reset-password | `reset-password/route.ts` | `POST /api/auth/reset-password` |
| wechat | `wechat/route.ts` | `POST /api/auth/wechat` |

**迁移要点**:
- Next.js `NextRequest`/`NextResponse` → Hono `c.req`/`c.json()`
- `_rateLimit.ts` Map-based 限流 → Hono middleware
- `_db.ts` better-sqlite3 → 直接复用（Node.js 环境兼容）
- `_pb.ts` PocketBase SDK → 直接复用
- `_auth.ts` JWT + blacklist → 复用
- `_validation.ts` → 复用
- `constants.ts` TOKEN_EXPIRES_IN → 移到新服务

## Phase 3: 更新部署配置

### 3.1 更新 `infra/docker/docker-compose.yml`

添加 auth-api 服务:
```yaml
services:
  pocketbase:
    # ... 现有配置不变
    
  auth-api:
    build: ./api
    ports:
      - "3000:3000"
    environment:
      - PB_URL=http://pocketbase:8090
      - PB_ADMIN_EMAIL=${PB_ADMIN_EMAIL}
      - PB_ADMIN_PASSWORD=${PB_ADMIN_PASSWORD}
      - SMTP_HOST=${SMTP_HOST}
      - SMTP_PORT=${SMTP_PORT}
      - SMTP_USER=${SMTP_USER}
      - SMTP_PASS=${SMTP_PASS}
      - WECHAT_APPID=${WECHAT_APPID}
      - WECHAT_SECRET=${WECHAT_SECRET}
    depends_on:
      - pocketbase
```

### 3.2 更新 `infra/nginx/nginx.conf`

```nginx
# Auth API (Hono 服务, port 3000)
location /api/auth/ {
    proxy_pass http://auth-api:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

## Phase 4: 更新移动端配置

**文件**: `apps/mobile/src/store/useAppStore.ts`

当前配置:
```typescript
const DEV_API = `http://${devHost}:3000`;
const PROD_API = process.env.EXPO_PUBLIC_API_URL ?? 'https://egolessdo.freebytes.net';
setApiBase(__DEV__ ? DEV_API : PROD_API);
```

无需改动 — 移动端已正确指向 `:3000` (dev) 和 `EXPO_PUBLIC_API_URL` (prod)。

**文件**: `packages/core/src/auth.ts`

无需改动 — 已使用 `getApiBase()` 获取 URL。

## Phase 5: 验证

- [ ] 本地测试: `cd infra/docker/api && pnpm dev`
- [ ] 移动端登录测试: dev 环境 `EXPO_PUBLIC_API_URL=http://localhost:3000`
- [ ] 注册 + 验证码流程测试
- [ ] Token 刷新测试
- [ ] 生产部署测试

## 工作量估算

| 阶段 | 预计时间 | 说明 |
|------|----------|------|
| Phase 1: 骨架 | 2h | package.json + tsconfig + Dockerfile |
| Phase 2: 路由迁移 | 4h | 9 个路由 + 共享工具 |
| Phase 3: 部署配置 | 1h | docker-compose + nginx |
| Phase 4: 移动端验证 | 1h | 本地测试 |
| Phase 5: 集成测试 | 1h | 全链路验证 |
| **总计** | **~9h** | |

## 依赖项

- `hono` — Web 框架
- `better-sqlite3` — 本地 SQLite (verification_codes, token_blacklist)
- `pocketbase` — PocketBase SDK
- `nodemailer` — SMTP 邮件发送
- `jsonwebtoken` — JWT 解码
