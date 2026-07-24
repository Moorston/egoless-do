# F1 深度分析：第二个后端 `infra/docker/api` 的真实边界

> **日期**: 2026-07-24
> **关联**: `docs/architecture-review-2026-07-24.md` §三.F1
> **结论先行**: 这不是「双数据源」，而是一个**标准的 BFF + API 网关**架构。PocketBase **仍然是唯一的数据存储**。`infra/docker/api`（Hono 服务）是一层**认证网关**，本身不持有业务数据，所有集合都建在 PocketBase 上。因此 `AGENTS.md` 中「PocketBase 唯一数据源」的声明**技术上仍然成立**——问题在于 **AGENTS.md 完全没记载这层网关与 nginx 路由**，且 `docs/API.md` 已严重过时。另发现一个**需立即验证的认证桥接风险**（见 §4）。

---

## 1. 实测得到的真实拓扑

```
                        单一公网域名 egolessdo.freebytes.net
                                    │
                                [ nginx ]
                          (按路径前缀分流)
        ┌───────────────┬──────────┴───────────┬──────────────────┐
        │ /api/auth/*   │ /api/push            │ /api/* (其余)     │ /api/realtime, /_/
        │ /api/plan/*   │ /api/monitoring      │ /api/collections │
        │ /api/setup    │ /api/setup           │                    │
        ▼               ▼                       ▼                    ▼
  [ auth-api :3000 ]  [ auth-api :3000 ]   [ pocketbase :8090 ]  [ pocketbase :8090 ]
   (Hono 网关)         (Hono 网关)           (唯一数据存储)         (唯一数据存储/实时)
        │                       │                      ▲
        │  getAdminPb()         │                      │ 数据读写 / 同步 / 实时
        ▼                       │                      │
  [ PocketBase :8090 ] ─────────┘                      │
   (网关自建的安全集合:                                      │
    token-blacklist, verification-code,                 │
    refresh-token, account-lockout,                     │
    audit-log, mfa, rbac)                               │
                                                       │
                                          移动端 (apps/mobile)
                                          • 认证: fetch `${API_URL}/api/auth/*`
                                          • 数据: PocketBase SDK → `${PB_URL}` /api/collections
                                          • 实时: SDK realtime → /api/realtime
```

**路由依据**（`infra/nginx/nginx.conf`）：
- `location /api/auth/` → `auth-api:3000`
- `location /api/push`、`/api/plan/`、`/api/monitoring`、`/api/setup` → `auth-api:3000`
- `location /api/`（兜底，除上述前缀外）→ `pocketbase:8090`
- `location /api/realtime`、`/_/` → `pocketbase:8090`

**关键事实**：`apps/mobile/src/config.ts` 中 `PB_URL` 默认等于 `API_URL`（同一域名）。移动端只认一个 origin，由 nginx 按路径把 `/api/auth/*` 引向网关、把其余 `/api/*` 引向 PocketBase。这正是 BFF 模式的标准做法。

---

## 2. 各组件职责（消除「双后端」误解）

| 组件 | 是否持有数据 | 职责 |
|------|------------|------|
| `backend/`（PocketBase + `pb_hooks`/`pb_migrations`） | ✅ 是（唯一） | 业务数据、同步协议、realtime、PB 原生 auth 记录 |
| `infra/docker/api`（Hono） | ❌ 否 | 认证网关：登录/注册/MFA/微信登录/刷新/登出 + RBAC/审计/限流/验证码/账号锁定；自建的 7 个**安全集合**也落在 PB 上 |
| `infra/nginx` | ❌ 否 | 单入口 + 路径分流 + 安全响应头 |

> 网关自建的 7 个集合（token-blacklist、verification-code、refresh-token、account-lockout、audit-log、mfa、rbac）**都建在 PocketBase 里**，进一步证明 PB 仍是存储。网关只是这些集合的「写入者/管理者」。

---

## 3. 与文档的偏差（F1 的真正问题）

### 3.1 `AGENTS.md` 漏载整个网关 + nginx 层
- §1.1 / §5.1 只写「PocketBase 唯一数据源」，未提及 `infra/docker/api` 网关与 `infra/nginx` 路由层。
- §2 目录结构图完全没有 `infra/docker/api` 与 `infra/nginx`。
- 新成员按 AGENTS.md 理解后端，会以为移动端直接打 PocketBase，对 `/api/auth/*` 网关、微信登录、MFA、token 轮换等**完全无据可查**。

### 3.2 `docs/API.md` 已严重过时
- 文档描述了 `POST /api/sync/push` 与 `GET /api/sync/pull` 两个同步端点。
- 但 `infra/docker/api/src/index.ts` **根本没有挂载任何 `/api/sync` 路由**（仅挂载 `/api/auth/*`、`/api/push`、`/api/plan`、`/api/ish` 等）。同步走的是 PocketBase 原生 `/api/collections` + `pb_hooks/sync_push_pull`，**不经过网关**。
- 文档的 Base URL、限流、错误码等也需对照 `index.ts` 实际中间件（CORS、限流）重新核对。

---

## 4. 需立即验证的认证桥接风险（唯一技术风险点）

**现象（已实测）**：
1. 移动端认证走网关：`packages/core/src/auth.ts` 调 `${apiBase}/api/auth/login`，返回**网关自己签发的 JWT**（`token`/`refreshToken`），存入 `auth.token`。
2. 数据访问走 PocketBase：`offlineAwareFetch`（`apps/mobile/src/net/offlineAware.ts:32-40`）会对每个 fetch 请求**自动附加 `Bearer ${getAuthToken()}`**，即把**网关 JWT** 作为 Authorization 打到 `/api/collections/...`（最终到 PocketBase）。
3. **全仓未找到任何 `pb.authStore.save(...)` / `authWithPassword` 调用**（mobile + core 均搜过）。也就是说，PocketBase **SDK** 的 `authStore` 从未被网关 token 填充。

**由此产生的两种可能（必须二选一核实）**：
- **(A) 正常**：网关签发的 JWT 与 PocketBase 共享密钥（或网关直接透传 PB token），PocketBase 原生校验通过 → 数据/同步正常鉴权。
- **(B) 风险**：网关 JWT 与 PB 密钥不一致，PocketBase **拒绝**该 Bearer → 要么 global-pulse 等直连 PB 的接口 401 报错，要么为「绕开」而把 PB 集合配置成了**公开可读写**（数据暴露）。

> 无论 (A) 还是 (B)，当前代码都**没有任何一处把网关 JWT 显式桥接进 PB SDK**，鉴权完全依赖「PB 碰巧接受网关 token」这一隐含假设。这是一个隐蔽的、一旦 PB 升级/换密钥就会全线数据失败的单点。

---

## 5. 治理路线对比

既然架构本身是合理的 BFF，不需要推翻，只需补齐治理。三条可选路线：

| 路线 | 做法 | 成本 | 推荐度 |
|------|------|------|--------|
| **① 仅补文档（最小动作）** | 在 AGENTS.md 增加「认证网关层」小节 + 更新 API.md 删除不存在的 sync 端点 + 画 §1 拓扑图 | 低 | ⭐⭐⭐ 先做 |
| **② 文档 + 固化 token 桥** | 在 ① 基础上，把「网关 JWT 如何被 PB 接受」写成显式约定（共享密钥 / token 透传），并在 PB SDK 初始化处显式 `authStore.save(gatewayToken)`，消除隐含假设 | 中 | ⭐⭐⭐ 必做（消 §4 风险） |
| **③ 折叠网关回 PB hooks** | 把 MFA/RBAC/限流等下沉为 PB hooks，移除独立 Hono 服务 | 高、破坏性 | ❌ 不推荐（网关已承载微信登录等 PB 难做的能力） |

---

## 6. 行动清单

| # | 动作 | 优先级 | 产物 |
|---|------|--------|------|
| 1 | **验证 §4 认证桥接**：确认 PB 是否接受网关 JWT，或集合是否被设为公开 | 🔴 高 | 一份 `docs/auth-token-bridge.md` 结论（含复现步骤：用网关 token 直打 `/api/collections/users/records` 看是否 200/401） |
| 2 | 在 `AGENTS.md` 增加「认证网关 + nginx 路由」小节，并把 `infra/docker/api`、`infra/nginx` 补进目录结构图 | 🟡 中 | 更新 AGENTS.md |
| 3 | 修正 `docs/API.md`：删除不存在的 `/api/sync/*`，补充实际路由（auth/push/plan/monitoring/setup）与「数据走 PB 原生 `/api/collections`」说明 | 🟡 中 | 更新 API.md |
| 4 | 把网关 JWT → PB 的鉴权约定**代码化**：在 PB SDK 初始化处显式注入 token，去掉隐含假设 | 🟡 中 | `packages/core/src/pocketbase.ts` 改动 + 测试 |
| 5 | 补一张端到端时序图（登录 → 拿网关 JWT → 数据请求带 Bearer → nginx 分流） | 🟢 低 | `docs/` 图 |

---

## 7. 一句话总结

`infra/docker/api` **不是第二个数据源，而是一层未被文档记载的认证网关**；架构合理，主要欠账是**文档缺失**与**一个未显式桥接、需立即验证的网关-JWT→PocketBase 鉴权假设**。优先做 §6 的 1、2、3 即可把 F1 闭环。
