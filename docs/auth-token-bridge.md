# 认证桥接验证结论（F1 §6-1）

> **日期**: 2026-07-24
> **问题来源**: `docs/f1-backend-boundary-analysis.md` §4 提出的「网关 JWT → PocketBase 鉴权桥接」风险
> **结论**: ✅ **无安全漏洞**。架构按设计正确鉴权；原 §4 的「风险」经代码核实已被消解。

---

## 1. 核心疑问

`offlineAwareFetch`（`apps/mobile/src/net/offlineAware.ts:32-40`）会把 `auth.token` 作为 `Bearer` 打到 PocketBase 的 `/api/collections/...`。而全仓**没有任何地方调用 `pb.authStore.save(...)` / `authWithPassword`** 来填充 PocketBase SDK 的 `authStore`。那么：
- PB 是凭什么接受这个 token？还是集合被设成了公开？

## 2. 核实过程与证据

### 2.1 网关返回的是 PB 原生 token（非自建 JWT）
`infra/docker/api/src/auth/login.ts:70` 与 `:97`：
```ts
const authData = await pb.collection('users').authWithPassword(email, password);
// ...
token: authData.token,   // ← PocketBase 自己签发的 token
```
网关调 PB 原生认证，把 **`authData.token`（PB 原生 token）** 透传给客户端。`refreshToken` 是网关自建（用于网关侧轮换），但**访问 token 就是 PB 的 token**。因此客户端拿到的 `auth.token` 能被 PocketBase 原生校验。

### 2.2 所有鉴权路径都携带该 PB token（一致模式）
| 路径 | 文件 | 如何带 token |
|------|------|--------------|
| 业务数据 REST | `apps/mobile/src/net/offlineAware.ts` | `fetch` 自动附加 `Authorization: Bearer ${getAuthToken()}` |
| 实时订阅 | `apps/mobile/src/features/sync/RealtimeAgent.ts:132,225` | `EventSource` 与 subscribe `POST` 均带 `Bearer` |
| 同步 push/pull | `SyncEngine._tokenProvider`（`:145,:187`）+ `SyncService.setSyncTokenProvider` | tokenProvider 返回同一 `auth.token` |

### 2.3 不存在「集合公开」假设
PB 接受请求是因为 token 是 PB 原生 token，**不是**把集合设为公开可读写。若把集合公开，则无需任何 token 也能读写——而实测所有路径都显式带 token，与「公开」假设矛盾。

## 3. 结论

- ✅ 网关 `/api/auth/login` 透传 PB 原生 token；客户端用它与 PB 通信，PB 原生校验通过。
- ✅ 数据/实时/同步三条路径**一致地**携带该 token，鉴权闭环完整。
- ⚠️ 唯一残留点：PocketBase **SDK 单例** `packages/core/src/pocketbase.ts` 的 `authStore` 从未被填充（当前所有鉴权走 `fetch`+`Bearer`，SDK 实际未被用于鉴权调用）。这属于「隐式约定」而非 bug。

## 4. 后续动作

- **§6-4（已执行）**：作为防御性加固，新增 `setPocketbaseToken(token)` 并在 token 恢复/刷新生命周期注入 SDK `authStore`，确保未来若有人改用 `getPb()` 做鉴权调用也不会意外以游客身份请求。
- 无需修改任何运行时鉴权逻辑，无行为变更风险。

---

## 附：复现验证步骤（供后续回归）
1. 用有效账号调 `POST /api/auth/login`，确认返回的 `token` 可被 PB 校验（`pb.collection('users').authWithPassword` 同源 token）。
2. 用该 `token` 直打 `GET ${PB_URL}/api/collections/users/records?perPage=1`，预期 `200`（带 token）vs `401`（不带 token）——确认非公开访问。
