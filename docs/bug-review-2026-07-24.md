# 全面 Bug 审查报告 — 2026-07-24

> **审查范围**：同步/持久化子系统、认证/Token 生命周期、静态扫描、mobile 类型检查
> **方法**：2 个并行 deep-dive agent（sync/persistence、auth/token）+ 对 HIGH 项的人工源码核验 + 静态扫描 + mobile tsc
> **结论**：发现 **3 个 HIGH、5 个 MEDIUM、1 个 LOW**；另有 1 项初判 HIGH 经核验降级（已说明）；4 项预检项经核验为安全（已关闭）

---

## 一、严重度总览

| ID | 严重度 | 子系统 | 问题 | 位置 |
|----|--------|--------|------|------|
| H-1 | 🔴 HIGH | Auth | MFA 在登录流程被完全绕过 | `infra/docker/api/src/auth/login.ts:68-100`、`wechat.ts:75-87` |
| H-2 | 🔴 HIGH | Sync | 时钟偏移符号反了 → 本地新编辑被服务器旧数据静默覆盖 | `apps/mobile/src/features/sync/SyncApplyService.ts:280` |
| H-3 | 🟠 MED↓ | Auth | 过期 access token 在 sync/push 前不自动刷新 → 同步停滞（非强制重登） | `SyncEngine.ts:624,340,275,625-632` |
| M-1 | 🟠 MED | Sync | WriteBatcher._flush 数据写 + 队列入队非事务（无 BEGIN TRANSACTION）✅ 已修复 | `apps/mobile/src/store/WriteBatcher.ts:94-146` |
| M-2 | 🟠 MED | Sync | payload 缺 `updatedAt` 时 `serverUpdated` 默认 0 → 本地更新被永久跳过 ✅ 已修复 | `SyncApplyService.ts:279` |
| M-3 | 🟠 MED | Sync | INSERT 仅用 payload 列，新增 NOT NULL 无默认列抛错被静默丢弃 ✅ 已修复 | `WriteBatcher.ts:118-133` |
| M-4 | 🟠 MED | Auth | 登出是 best-effort，服务端 refresh token 可能仍有效 | `createAuthSlice.ts:112-118`、`logout.ts:61` |
| M-5 | 🟠 MED | Auth | 微信登录缺口（缺 email / 不吊销旧 refresh / 绕过 lockout+MFA 一致性） | `wechat.ts:78-87` |
| L-1 | 🟡 LOW | Auth | RealtimeAgent 把 null token 伪装成 `''` ✅ 已修复 | `RealtimeAgent.ts:46` |
| C-1 | ⚪ 降级 | Sync | 原"后台数据丢失/咒语永不写入"经核验**已缓解** | 见 §四 |

---

## 二、HIGH 详情

### H-1 · 登录流程完全绕过 MFA（安全）✅ 已修复
**位置**：`infra/docker/api/src/auth/login.ts:68-100`、`wechat.ts:75-87`；`mfa.ts` 仅暴露 `/status`、`/enable`、`/disable`、`/verify`、`/config`

**现象**：`login.ts:70` 调用 `authWithPassword`，`login.ts:97` 直接把 `authData.token` 返回给客户端。全程没有：
- 调用 `isMFAEnabled`（该函数在 `mfa.ts:6` 被 import，但仅用于 `/status`，从未进入登录路径）
- 发起 MFA step-up challenge
- 调用 `verifyMFACode`

**结果**：已启用 MFA 的用户仅凭密码即可登录，MFA 形同虚设。微信登录（`wechat.ts:75-87`）同样绕过。

**修复方向**：
1. 在 `authWithPassword` 成功后，调用 `isMFAEnabled(authData.record.id)`；
2. 若已启用 → 返回短时效 challenge token（**不是** PB access token），要求客户端走 `/mfa/verify` 后才下发 PB token；
3. 微信登录应用同样逻辑。

---

### H-2 · `clockOffset` 符号反了（数据完整性）✅ 已修复
**位置**：`apps/mobile/src/features/sync/SyncApplyService.ts:280`（冲突判定）

**已人工核验**：
- `SyncTimestampManager.ts:41` 定义 `clockOffset = serverTime - Date.now()`
- 本地编辑落库用 `Date.now()`（`updated_at` 为本地时钟）；服务器记录的 `updated_at` 为服务器时钟
- 要在同一时间参照系比较：`localAsServerTime = local.updated_at + clockOffset`，再与 `serverUpdated` 比较；或等价地 `local.updated_at > serverUpdated - clockOffset`

**代码实际**：
```ts
const adjustedLocalUpdated = local ? local.updated_at - clockOffset : 0;   // ❌ 应为 +clockOffset
if (local && (local.deleted === 1 || adjustedLocalUpdated > serverUpdated)) continue;
```
符号反了，等价于比较 `local.updated_at > serverUpdated + clockOffset`（错误）。

**后果**：当设备与服务器存在时钟偏差时，pull 阶段会把**本地更新的数据**错误地判定为"较旧"，从而用服务器上的**旧版本**静默覆盖本地新编辑。偏差越大、冲突越多，数据丢失越严重。正常时钟下 `clockOffset≈0`，缺陷潜伏。

**修复方向**：改为 `local.updated_at + clockOffset`（或把比较改为 `local.updated_at > serverUpdated - clockOffset`）。建议补一条带时钟偏差的单元测试固化该不变量。

---

### H-3 · 过期 token 不在 sync/push 前刷新（留存/体验）✅ 已修复
**位置**：`SyncEngine.ts:624`（读 token）、`:340` + `:275`（`handleKickedOut`）、`:625-632`（`tokenRecoveryFn` 仅用于 token 缺失）

**严重度修正**：初判 HIGH（"强制重登"）经核验**降级为 MEDIUM**。`fetch.ts:82-83` 显示：普通 401（token 过期）→ `AuthError`（非 `KickedOutError`）；`isKickedOutError`(`SyncEngine.ts:272`) 仅匹配 `KICKED_OUT` code，因此**普通过期 401 不会触发 `handleKickedOut`/强制登出**。真实影响：debounced 写入触发的 sync 不做预刷新 → 401 → 队列退避重试，直到下次前台（`useSync.ts:208` 刷新）才自愈 → **同步停滞**，非数据丢失/强制登出。

**现象**：
- `runSync` 直接读取 token 推送，**不检查 `expiresAt`、不调用 `refreshAuth()`**；
- 注入的 `tokenRecoveryFn` 仅在 token **完全缺失**时（`SyncEngine.ts:625-632`）使用，token **已过期但存在**时不触发；
- 仅 `useSync.ts:208` 的前台路径预刷新，debounced 写入触发的 sync 无覆盖。

**修复**：在 `runSync` 集中预刷新——新增 `setTokenExpiryProvider`，token 存在但 `expiresAt` 进入 5 分钟 skew 窗口时调用 `_tokenRecoveryFn` 刷新并重读，覆盖所有 sync 触发源（debounced 写入 / 前台 / realtime）。补 2 条单测（near-expiry 刷新 / far-future 不刷新）。

**修复方向**：
1. push/pull 前若 `expiresAt` 进入 skew 窗口 → `await refreshAuth()` 并重读；
2. 收到 401 时，先 `refreshAuth()` + 重试一次，失败才 `handleKickedOut`。

---

## 三、MEDIUM 详情

### M-1 · WriteBatcher._flush 非事务
`WriteBatcher.ts:94-146`：数据表 UPDATE/INSERT 与 `SYNC_QUEUE_UPSERT_SQL` 入队是两个独立 `runAsync`，外层只有 `withDbLock`，**未包 `BEGIN TRANSACTION`**。若中途崩溃，可能出现"数据已写但未入队"或反之。当前靠 orphanRecovery 缓解，但非强一致。

### M-2 · 缺失 updatedAt 的 payload
`SyncApplyService.ts:279`：`serverUpdated = (pbField(r,'updated_at') ?? pbField(r,'updatedAt') ?? 0)`。若服务器 payload 缺该字段，`serverUpdated=0`，则 `adjustedLocalUpdated > serverUpdated` 几乎恒成立 → 本地更新被跳过、服务器旧/空数据胜出。

### M-3 · INSERT 列集仅来自 payload
`WriteBatcher.ts:118-133`：INSERT 列取自 `Object.keys(row)`（即 payload 列）。若某表新增了 `NOT NULL` 且无默认值的列，INSERT 抛 `NOT NULL constraint` 错误，被 catch 后仅对 `UNIQUE` 重试，其余错误**重新抛出→进入 fallback，最终该写可能被丢弃**。

### M-4 · 登出 best-effort
`createAuthSlice.ts:112-118`：`logout()` `await apiLogout` 但**吞掉失败**；无论服务端是否成功，本地状态 + SecureStore 都已清除。若网络失败，服务端 refresh token 永不被吊销 → 会话可存活/被重放。`logout.ts:61` 仅吊销"当前存储的那一个" refresh token。

### M-5 · 微信登录缺口
`wechat.ts:78-87`：
- `:83` 返回 `user:{id,name,avatar,createdAt}` **无 `email`**，而 `AuthUser` 消费方（Sentry、profile）可能期望 email；
- `:78-80` 每次登录都 `createRefreshToken`，但从不吊销该用户既往 refresh token → 旧 refresh token 累积并在登出后存活；
- 跳过 account-lockout 与 MFA 一致性（与密码登录不对等）。

---

## 四、降级 / 纠正项

### C-1 · 原"后台数据丢失 / 咒语永不写入"（初判 HIGH，经核验降级）
初版 deep-dive 报告称"app 后台/被杀时 `_pendingWrites` 内存 Map 丢失 → 非 profile 数据（咒语等）永不写入 SQLite"。**经人工核验，该判断不准确**：

- `useAppStore.ts:259` `handleAppStateChange` 在 `state !== 'active'` 时调用 `flushWrites()` → `WriteBatcher.flushNow()`，**后台切换即刷新**；
- `storageAdapter.ts:54-57` 对 `profile` 实体强制 `flushNow()` 立即落库；
- 所有 `persistChange` 均经 `_batcher.write`，后台 flush 覆盖全部实体。

**真实残留风险（窄）**：App 在前台运行、某次非 profile 写入后的 **100ms 防抖窗口内被系统强杀/崩溃**，该写尚未 flush。属真实但低概率的丢失窗口，且 profile 已强制落库豁免。**结论：降级为窄风险项（非 HIGH）**，并建议对后台 flush 补 `beginBackgroundTask` 兜底以保证异步 SQLite 写完成。

---

## 五、经核验为安全（关闭）

| 预检项 | 结论 | 证据 |
|--------|------|------|
| refresh race（并发刷新） | 安全 | `createAuthSlice.ts:21,151` `_refreshInFlight` 单飞守卫 |
| "Bearer undefined" | 安全 | `fetch.ts:8` `buildHeaders` 中 `if (token)` 守卫，REST 不会发空 Authorization（仅 RealtimeAgent 见 L-1） |
| TOCTOU（token 竞态） | 安全 | `tokenProvider` 读实时 store（`useSync.ts:64`）；`triggerSyncDebounced`/`runSync` 无 token 即 bail |
| SecureStore ↔ 内存一致性 | 基本安全 | `initApp.ts:280-300` 订阅 + `:210-262` 恢复块对齐；**唯一短板**：过期仅由后台 `getMe` 失败才察觉，放大 H-3 |

---

## 六、静态扫描 & 类型检查

- **静态扫描（mobile）**：无 catch-empty、无 TODO/FIXME/HACK；`Math.random` 仅用于动画/id（低风险）；`as any` 轻量（多数集中在 test 文件，每文件 1-2 处）。
- **mobile tsc**：约 50 个错误，分布为：
  - `useAppStore.test.ts` 缺 `afterEach`、`AuthState` 类型不全（测试问题，不影响运行）；
  - `useAppStore.ts` 隐式 any（TS7022/7024）；
  - 第三方 `react-native-amap3d` 类型错误（非本项目代码）；
  - `createAuthSlice.ts:170` 回调签名不符；
  - `typography.ts` / `utils.ts` 隐式 any。
  - 多为存量/第三方问题，建议单独建 tsc 治理任务，不在本次 bug 修复范围。

---

## 七、修复优先级建议

1. **H-1（MFA 绕过）** — 安全硬伤，最高优先，建议尽快修复并补 `/login` challenge 路径。
2. **H-2（时钟偏移符号）** — 数据完整性，一行修正 + 时钟偏差单测，成本低收益高。
3. **H-3（过期不刷新）** — 影响留存/体验，逻辑修正。
4. **M-1~M-5** — 一致性 / 服务端健壮性 / 微信对等，纳入下一轮。
5. **L-1、C-1** — 加固项，低成本。

> 下一步：是否要我针对 HIGH 三项（H-1/H-2/H-3）直接出修复实现并补测试？MEDIUM/LOW 可随后分批处理。

---

## 八、修复状态（2026-07-24 实施）

H-1 / H-2 / H-3 三项均已实现并验证。验证基线：core tsc 通过、core 全量 741 测试通过（+4 新增）、mobile sync 测试 91 通过、gateway tsc 编辑文件无错误、mobile tsc 无净新增错误（434 为存量基线）。

### H-2 修复
- `apps/mobile/src/features/sync/SyncApplyService.ts:280`：`local.updated_at - clockOffset` → `+ clockOffset`，并补注释说明参照系换算。
- 新增 2 条时钟偏差单测（`SyncApplyService.test.ts`）：本地新编辑在 skew 下胜出 / 本地确实较旧则应用服务器记录。

### H-3 修复
- `apps/mobile/src/features/sync/SyncEngine.ts`：新增 `TOKEN_REFRESH_SKEW_MS` 常量 + `_tokenExpiryProvider`，`runSync` 在 token 存在且 `expiresAt` 进入 5 分钟 skew 窗口时调用 `_tokenRecoveryFn` 预刷新，覆盖所有 sync 触发源。
- `SyncService.ts` 导出 `setSyncTokenExpiryProvider`；`initApp.ts` 接线 `() => store().auth.expiresAt`。
- 新增 2 条单测（`SyncEngine.test.ts`）：near-expiry 预刷新 / far-future 不刷新。

### H-1 修复（MFA step-up）
**服务端**：
- 新增 `infra/docker/api/src/mfaChallenge.ts`：进程内挑战令牌（256-bit 随机，5 分钟 TTL，单次消费，周期清理）。
- `auth/login.ts`：`authWithPassword` 成功后调 `isMFAEnabled`；已启用 → 签发 `mfaToken`，返回 `{mfaRequired:true, mfaToken, expiresAt}`，**不返回 PB token/refreshToken**。
- `auth/wechat.ts`：同上 step-up。
- `auth/mfa.ts`：新增 `POST /api/auth/mfa/verify-login`（无需 `verifyAuth`）——凭 `mfaToken` + TOTP/备用码验证通过后消费挑战、签发 refresh token、返回完整 `AuthResponse`；验证码错误不消费（允许 TTL 内重试）。

**Core**：
- `auth.ts`：新增 `MFARequiredResponse` / `LoginResult` 联合类型、`MFARequiredError` 类、`apiVerifyMFALogin`；`apiLogin`/`apiWechatLogin` 返回 `LoginResult`。
- `store/createAuthSlice.ts`：`login()` 检测 `mfaRequired` → 抛 `MFARequiredError`（不设 auth）；新增 `verifyMfaLogin(mfaToken, code)` 完成登录。
- `store/types.ts`：`AuthSlice` 增 `verifyMfaLogin`。

**Mobile**：
- `features/auth/LoginScreen.tsx`：捕获 `MFARequiredError` → 切换 MFA 验证码输入视图 → 调 `verifyMfaLogin` → 成功导航。
- i18n：`en/zh/zh-Hant/types` 新增 `authMfaRequired` / `authMfaCodePlaceholder` / `authMfaVerifyBtn` / `authMfaInvalid` / `authMfaVerifying`。

**测试**：`createAuthSlice.test.ts` 新增 2 条（mfaRequired 抛错且不设 auth / verifyMfaLogin 完成登录）。

### M-1 修复（WriteBatcher 事务化）
- `apps/mobile/src/store/WriteBatcher.ts`：`_flush` 主路径对每个 record 的「数据表写（UPDATE/INSERT）+ `SYNC_QUEUE_UPSERT_SQL` 入队」包进 `BEGIN TRANSACTION` … `COMMIT`，失败则 `ROLLBACK` 并重抛 → 走既有的 per-item fallback 重试。彻底消除"数据已写但未入队"的崩溃窗口（之前靠 orphanRecovery 缓解，非强一致）。

### L-1 修复（RealtimeAgent token 硬化）
- `apps/mobile/src/features/sync/RealtimeAgent.ts`：补回缺失的 `private _token` 字段（原 `_getToken` 调用 `this._tokenProvider?.()` 两次却从不读 `this._token`，`updateToken()` 后 SSE 持续用旧 token）；`_getToken(): string | null` 改为优先返回 `this._token` 再回退 provider，无 token 时返回 `null`（不再伪装成 `''`）；`_open` 本就对空 token bail，现语义更明确，避免登出/重连竞态发出空 `Authorization`。
- 新增 `RealtimeAgent.test.ts` 4 条：stored token 优先于 provider 闭包 / 无 token 返回 null / 无 token 时 `_open` 不建 EventSource / 有 token 时建 EventSource 并带 `Bearer`。

### M-2 修复（payload 缺 updatedAt 的冲突判定）
- `apps/mobile/src/features/sync/SyncApplyService.ts`：`serverUpdated` 原 `(pbField(r,'updated_at') ?? pbField(r,'updatedAt') ?? 0)` 在缺字段时取 `0`，导致 `adjustedLocalUpdated > 0` 几乎恒成立、本地（可能已陈旧）永远胜出。改为：缺 `updated_at`/`updatedAt` 时 `serverUpdated = null`，仅当 `serverUpdated != null && adjustedLocalUpdated > serverUpdated` 才判定「服务器更旧、跳过」。缺时间戳时改判为「无法证明本地更新」→ 应用服务器记录（pull 以服务端为准）。新增单测：缺时间戳应用 / 显式旧时间戳仍跳过本地。

### M-3 修复（NOT NULL 插入失败不再拖垮整批）
- `apps/mobile/src/store/WriteBatcher.ts`：`_flush` 的 per-record 事务中，若 INSERT 抛 `NOT NULL constraint`（payload 不带某 NOT NULL 列），原逻辑 `throw` → 整批中止 → 10 次重试后丢弃**全部** pending 写。现改为：捕获 `NOT NULL constraint`，经 `_onPersistError` 上报该条记录、将其 key 加入 `failedKeys` 并在 flush 后单独移除（不再重试），其余记录继续正常提交。瞬态错误（磁盘 I/O、写入中途崩溃）仍 `throw` 进入既有的 per-item fallback，M-1 的「数据-入队」原子性保证不变。新增单测：单条 NOT NULL 失败被上报并丢弃，同批其他记录仍落库、`onFlushed` 正常触发。

### 未处理项（建议下一轮）
- M-4、M-5 仍在原状（L-1、M-1、M-2、M-3 已于本轮修复）。
- H-1 的微信客户端：移动端尚未接线微信登录，故仅做了服务端 step-up；未来接线时客户端直接复用 `MFARequiredError` + `verifyMfaLogin` 即可。
- `/mfa/verify-login` 暴力破解防护（失败计数/锁定）与密码登录的 account-lockout 对等——当前与既有 `/mfa/verify` 一致（均无限流），建议单独加固。
