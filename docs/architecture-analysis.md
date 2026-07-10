# Egoless-Do 项目架构分析

> 日期: 2026-07-10
> 分析方法: 并行 Agent（认证/安全/部署）+ 深度代码分析
> 覆盖维度: 包结构、数据流、状态管理、认证、安全、部署、错误处理

---

## 1. 包结构

```
egoless-do (monorepo)
├── apps/
│   └── mobile/                    # React Native 移动应用
│       ├── src/
│       │   ├── components/        # 通用 UI 组件 (ErrorBoundary, UI, VirtualList 等)
│       │   ├── db/                # SQLite 数据库层 (schema, queries, syncQueue)
│       │   ├── features/          # 功能模块 (auth, sync, habits, reflections 等)
│       │   ├── navigation/        # 路由导航
│       │   ├── store/             # Zustand store 组合 + 适配器
│       │   ├── sentry.ts          # Sentry 集成
│       │   ├── i18n/              # i18next 配置
│       │   ├── net/               # 网络层 (offlineAwareFetch)
│       │   └── theme/             # 主题配置
│       └── package.json
│
├── packages/
│   └── core/                      # 共享核心库
│       ├── src/
│       │   ├── store/             # Zustand slice 工厂 (20+)
│       │   ├── business/          # 纯业务逻辑函数 (~30)
│       │   ├── sync/              # 同步协议 (entities, merge, conflict, entitySchemas)
│       │   ├── ai/                # AI 服务层 (local-engine, cloud-providers, rag)
│       │   ├── types/             # TypeScript 类型定义 (~25)
│       │   ├── auth.ts            # API 客户端
│       │   ├── fetch.ts           # fetch 封装 + 错误类
│       │   ├── i18n.ts            # 国际化翻译资源
│       │   ├── data/              # DataGateway 抽象
│       │   ├── utils.ts           # 工具函数
│       │   └── logger.ts          # 结构化日志
│       └── package.json
│
├── backend/                       # PocketBase 后端
│   ├── pb_hooks/                  # JS 钩子 (auth, sync, main)
│   ├── pb_migrations/             # 集合迁移
│   └── pb_data/                   # 运行时数据 (git ignored)
│
├── infra/                         # 基础设施
│   ├── docker/
│   │   ├── docker-compose.yml     # 生产部署 (PB + API + backup)
│   │   └── api/                   # Auth API Server (Hono)
│   ├── nginx/
│   └── scripts/                   # 部署/备份/恢复脚本
│
├── docs/                          # 审计报告
└── .github/workflows/ci.yml       # CI/CD
```

### 依赖方向

```
┌─────────────┐     packages/core  ←──  apps/mobile
│ packages/   │     packages/core  ←──  (API 调用) → PocketBase
│  core/      │     packages/core  ←──  infra/docker/api (共享类型)
│  (纯净 TS)  │     packages/core  ←──  backend/pb_hooks (不直接相关)
└─────────────┘
```

**关键原则**：`packages/core` 是纯 TypeScript，不依赖 React/React Native。所有平台相关代码在 `apps/mobile` 中。

### 依赖注入关键

```
core 定义:           mobile 实现:
StorageAdapter 接口 → mobileStorageAdapter (WriteBatcher + SQLite)
SliceCreator 工厂   → useAppStore (Zustand create)
createLogger       → setSentryBridge (Sentry)
I18nKey + 资源     → i18next (配置)
```

---

## 2. 数据流

### 写入路径

```
用户操作 → Screen/Component → Slice Action → adapter.persistChange
  → WriteBatcher._pendingWrites (100ms 去抖动)
    → _flush():
      → SQLite: UPDATE/INSERT (synced=0)
      → sync_queue: UPSERT (status='pending')
    → _onFlushed → triggerSyncDebounced
      → SyncEngine.runSync()
        → flushWrites() (确保所有写入已提交)
        → drainQueue(50) → 取出待同步项
        → apiSyncPush() → POST /api/sync
          → PocketBase hooks (sync_push_pull.pb.js)
            → 冲突检测
            → 写入 PB 集合
            → 返回 accepted/rejected
        → markSyncedAndRemove() (清除队列项)
        → apiSyncCheck() → apiSyncPull() (拉取服务端变更)
        → applyServerChanges() → SQLite (synced=1)
        → _onChanges(patch) → setState() (更新 store)
```

### 读取路径（启动恢复）

```
App.tsx → initApp()
  → openDatabase() (SQLite)
  → migrateAsyncStorageToSQLite() (一次性迁移)
  → flushWrites() (确保 Batcher 为空)
  → rehydrateFromDb():
    → 并行查询 35 个实体表 (WHERE deleted = 0)
    → 每行通过 rowMapper 转换为实体对象
    → 返回 { habits: [...], reflections: [...], ... }
  → setState(fullPatch) (一次批量更新 store)
  → loadSecureTokens() → setState({ auth })
  → DailyResetManager.start()
```

### 同步链路

```
                         SyncEngine
                            │
              ┌─────────────┴─────────────┐
              │ push                      │ pull
              ▼                           ▼
     executePush()                executePull()
      for batch < 10:               apiSyncCheck()
        drainQueue(50)               hasChanges?
        apiSyncPush()                apiSyncPull()
        handle rejects               applyServerChanges()
        markSyncedAndRemove()        _onChanges(patch)
        if small batch:
          post-push pull
```

---

## 3. 状态管理

### Store 结构

```
MobileStore = AuthSlice
           & HabitSlice & ReflectionSlice & CheckinSlice
           & SleepSlice & ProfileSlice & FoodSlice
           & ExerciseSlice & FastingSlice & MeditationSlice
           & PlanSlice & RecycleBinSlice
           & BodySlice & DietSlice & PracticeSlice
           & MantraSlice & ZhiguanSlice & MindSlice
           & ReviewSlice & ThoughtTrailSlice
           & MobileUiSlice
```

### 切片模式

```
createXxxSlice(adapter, ...callbacks) → SliceCreator<XxxSlice>
                                        ↓
useAppStore = create<MobileStore>()((...a) => ({
  ...createAuthSlice(adapter, onSync, ...)(...a),
  ...createHabitSlice(adapter, onSync)(...a),
  ...
}))
```

### 持久化策略

| 数据 | 存储 | 方式 |
|------|------|------|
| Auth tokens | SecureStore | expo-secure-store (Keychain/ECPrefs) |
| Auth 元数据 (isSignedIn, user) | SQLite app_state | adapter.persistSettings('auth', ...) |
| 用户设置 | SQLite app_state | adapter.persistSettings(key, value) |
| 实体数据 (habits, reflections, ...) | SQLite 实体表 | WriteBatcher → sync_queue |
| 离线变更 | SQLite sync_queue | 未同步时排队，网络恢复后推送 |

---

## 4. 认证架构

（详见 Agent 2 输出 — 全链路图在 `docs/round2-audit-2026-07-09.md`）

核心要点：
- Token：access token（7天 TTL）+ refresh token（30天 TTL，一次性轮换）
- 主动刷新：过期前 5 分钟触发
- 并发守卫：`_loginInFlight`、`_refreshInFlight`、`_registerInFlight`
- 令牌黑名单：PocketBase `token_blacklist` 集合
- login_epoch：每次刷新递增，阻止 token 重放
- 账户锁定：5 次失败 → 15 分钟锁定

---

## 5. 安全架构

### 层次保护

```
Layer 1: 速率限制 (内存 Map, 每 30s 文件持久化)
Layer 2: 账户锁定 (PocketBase 持久化)
Layer 3: 密码验证 (客户端 + 服务端双校验)
Layer 4: Token 验证 (黑名单 + epoch + password_changed_at)
Layer 5: CSRF 防护 (CORS + Bearer Token)
Layer 6: 超时保护 (fetchWithTimeout 15s/60s)
Layer 7: 错误脱敏 (统一错误分类 + 生产环境泛化)
```

### 错误类层次

```
Error
├── ApiError (status, code, message)
│   └── KickedOutError (401, 'KICKED_OUT')
├── NetworkError (超时/断网)
├── ServerError (5xx)
├── ValidationError (4xx)
├── AuthError (401)
└── ConflictError (409)
```

### 日志链路

```
createLogger(tag)
  debug()    → __DEV__ console.log
  info()     → __DEV__ console.log + Sentry breadcrumb
  warn()     → console.warn + Sentry captureMessage
  error()    → console.error + Sentry captureException
```

---

## 6. 部署架构

```
Cloudflare Tunnel ← HTTPS → Auth API Server (Hono :3000)
                                    │
                                    ↓
                              PocketBase (:8090)
                              ├── users / collections
                              ├── pb_hooks (auth/sync)
                              └── pb_migrations

Docker Compose:
  pocketbase  → ghcr.io/muchobien/pocketbase:latest
  auth-api    → 自构建 Hono 服务器
  backup      → alpine:3.19 + cron (每日 3:00)
  cloudflared → Cloudflare Tunnel
```

---

## 7. 架构风险点与建议

| 风险 | 说明 | 建议 |
|------|------|------|
| 速率限制内存 Map | 重启后丢失，多实例无效 | 迁移到 PocketBase 或 Redis |
| `createAuthSlice` 责任过重 | 同时管理认证 + 数据同步 + 26 实体合并 | 将 `buildMergePatch` 抽取到独立模块 |
| 实体配置 5 副本 | ENTITY_CONFIG/ENTITY_STORE_KEY/ENTITY_COLL_MAP/STORE_KEY_TO_ENTITY/ENTITY_TABLE_MAP | 统一从 SCHEMAS 自动派生 |
| SyncEngine 可测试性 | 直接依赖 db/schema + db/syncQueue，难以单元测试 | 引入依赖注入层 |
| `as any`/`as unknown` 类型绕过 | store 层大量不安全类型转换 | 逐步用 Zod schema 替换 |
| Dockerfile.web 不可构建 | 引用不存在的 apps/web 目录 | 移除或修复 |

---

*完整架构文档 — 部分内容来自并行 Agent 分析结果*
*补充：Agent 1（包结构与数据流）因 API 限流未完成，已通过手动补充*