# 端到端鉴权与数据流向时序图（F1 §6-5）

> 关联：`docs/f1-backend-boundary-analysis.md`、`docs/auth-token-bridge.md`
> 域名统一经 `infra/nginx/nginx.conf` 按路径分流。

## 登录 + 数据访问主路径

```mermaid
sequenceDiagram
    autonumber
    participant App as 移动端 (apps/mobile)
    participant NG as nginx (egolessdo.freebytes.net)
    participant GW as auth-api :3000 (Hono 网关)
    participant PB as pocketbase :8090
    participant Local as SQLite (本地)

    Note over App,PB: ── 1. 登录：拿 PocketBase 原生 token ──
    App->>NG: POST /api/auth/login {email,password}
    NG->>GW: 路由 /api/auth/* → auth-api
    GW->>PB: pb.authWithPassword(email,password)
    PB-->>GW: authData.token (PB 原生 token) + record
    GW->>PB: 建网关 refreshToken 记录
    GW-->>NG: { token: <PB token>, refreshToken: <网关>, user }
    NG-->>App: 200 + token
    App->>Local: 持久化 token (SecureStore) + 注入 PB SDK authStore(防御)

    Note over App,PB: ── 2. 业务数据读写：数据走 PB 原生，不经网关 ──
    App->>NG: GET/POST /api/collections/<coll>/records  (Authorization: Bearer <PB token>)
    NG->>PB: 路由其余 /api/* → pocketbase
    PB-->>NG: 数据 (PB 用同一 token 校验通过)
    NG-->>App: 数据

    Note over App,PB: ── 3. 实时订阅 ──
    App->>NG: EventSource /api/realtime (headers: Authorization: Bearer <PB token>)
    NG->>PB: /api/realtime (SSE)
    App->>NG: POST /api/realtime (subscriptions=[...])  Bearer
    PB-->>App: record_created/updated/deleted 事件

    Note over App,PB: ── 4. 同步 push/pull（SyncEngine tokenProvider）──
    App->>NG: push/pull ${PB_URL}/api/collections/...  Bearer <PB token>
    NG->>PB: pb_hooks/sync_push_pull 处理
    PB-->>App: 同步结果
```

## 关键不变量

1. **移动端只认一个域名**；nginx 按路径把 `/api/auth/*`、`/api/push`、`/api/plan/*`、`/api/monitoring`、`/api/setup` 引向网关，其余 `/api/*`、`/api/realtime`、`/_/` 引向 PocketBase。
2. **`/api/auth/login` 透传 PB 原生 token**（`auth/login.ts:97`），因此客户端持有的 `auth.token` 就是 PB 能校验的 token。
3. **所有鉴权路径一致携带该 Bearer token**（offlineAwareFetch / realtime / sync tokenProvider），不存在「集合公开」假设。

## 图例对应代码

| 步骤 | 代码位置 |
|------|----------|
| 登录取 token | `packages/core/src/auth.ts` → `infra/docker/api/src/auth/login.ts:70,97` |
| 数据带 Bearer | `apps/mobile/src/net/offlineAware.ts:32-40` |
| 实时带 Bearer | `apps/mobile/src/features/sync/RealtimeAgent.ts:132,225` |
| 同步 tokenProvider | `apps/mobile/src/features/sync/SyncEngine.ts:145,187` |
| 路由分流 | `infra/nginx/nginx.conf` |
| SDK 防御注入 | `packages/core/src/pocketbase.ts:setPocketbaseToken` → `apps/mobile/src/store/initApp.ts` |
