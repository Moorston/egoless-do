# 架构深度分析 Section 2-6

> 日期: 2026-07-10
> 分析方法: 2 个并行 Agent（数据流+状态管理 / 认证+安全+部署）
> 覆盖维度: 5 个 Section，识别 13 个改进点

---

## Section 2: 数据流

### 写入路径
```
UI → Slice Action → adapter.persistChange
  → WriteBatcher._pendingWrites (100ms debounce)
    → _flush():
      → SQLite: UPDATE/INSERT (synced=0)
      → sync_queue: UPSERT (status='pending')
    → _onFlushed → triggerSyncDebounced
```

### 读取路径（启动恢复）
```
App.tsx → initApp()
  → openDatabase() (SQLite)
  → Promise.all([loadSettingsPatch(), rehydrateFromDb()])
  → setState(fullPatch)
  → loadSecureTokens() → setState({ auth })
  → DailyResetManager.start()
```

### 同步路径
```
SyncEngine.runSync()
  → executePush: drainQueue(50) → apiSyncPush → markSyncedAndRemove
  → executePull: apiSyncCheck → apiSyncPull → applyServerChanges
  → Realtime: SSE + fallback polling
```

**冲突解决**: Server-wins (自动)，本地已删除记录不会被复活。

**离线场景**: sync_queue 持久化所有待推送操作，指数退避重试（2^n 秒，上限 60s）。

---

## Section 3: 状态管理

### 20+ 切片清单
| 切片 | 职责 |
|------|------|
| AuthSlice | 登录/注册/登出/token 刷新 |
| HabitSlice | 习惯 CRUD + 签到 + 自动状态 |
| ReflectionSlice | 反思 CRUD + 标签/情绪 + 链接 |
| PlanSlice | 计划/任务/打卡/DailyTodo |
| CheckinSlice | 签到 + 运动 + 冥想 + 断食 |
| DietSlice | 饮食动机/五行/口味统计 |
| BodySlice | 体重/体脂/身体打卡 |
| MindSlice | 恐惧/勇气/成就 |
| ZhiguanSlice | 止观禅修会话 |
| MantraSlice | 持咒定义/持咒会话 |
| ReviewSlice | 周期性回顾生成 |
| ... | (共 20+ 个) |

### 跨切片依赖
```
DietSlice     → foodLog, motivationLog, reflections (读取)
HabitSlice    → planItems (删除习惯时清理关联任务)
ZhiguanSlice  → breathHistory (读取)
MobileUiSlice → 继承 Food+Checkin+Profile+Settings+Reflection
```

### 改进建议
1. **CheckinSlice 职责过重** — 同时管理签到/运动/冥想/断食，建议拆分
2. **Settings 双写路径** — app_state vs profile blob 不一致风险
3. **切片错误状态缺失** — 除 AuthSlice 外 20+ 切片无加载/错误状态
4. **persistChange 语义** — Promise 立即解析，调用方无法知道写入是否成功
5. **同步队列满淘汰** — FIFO 淘汰可能导致离线数据丢失
6. **跨切片事务缺失** — 多实体操作缺少 SQLite 事务包装

---

## Section 4: 认证架构

### Token 生命周期
```
JWT Token: 7天有效期 → 主动刷新（过期前5分钟）
Refresh Token: 30天有效期 → 每次刷新轮换
```

### 并发守卫
| 守卫 | 位置 | 作用 |
|------|------|------|
| `_loginInFlight` | createAuthSlice:21 | 防止并发登录 |
| `_registerInFlight` | createAuthSlice:22 | 防止并发注册 |
| `_refreshInFlight` | createAuthSlice:20 | 防止并发刷新 |

### 刷新策略
```
主动刷新: 距过期 ≤5分钟 → 触发 refreshAuth
被动刷新: 401响应 → refreshAuth → 重试
重试策略: 最多2次，仅 NetworkError 重试（1秒延迟）
```

---

## Section 5: 安全架构

### 7 层保护
```
Layer 1: 速率限制 (内存 Map + PocketBase)
Layer 2: 账户锁定 (5次/5分钟 → 锁定15分钟)
Layer 3: JWT 认证中间件 (签名 + 黑名单 + epoch + pwd_changed_at)
Layer 4: Token 黑名单 (PocketBase 持久化)
Layer 5: Refresh Token 轮换 (crypto.randomBytes(32))
Layer 6: 密码强度验证 (客户端 + 服务端双校验)
Layer 7: 审计日志 (登录/登出/锁定/限流)
```

### Token 存储
```
JWT + Refresh Token → expo-secure-store
  iOS: Keychain
  Android: EncryptedSharedPreferences
```

---

## Section 6: 部署架构

### Docker Compose 服务
```
pocketbase (8090) ←→ auth-api (3000)
                      ↑
                  backup (cron 03:00)
```

### CI/CD
```
push → main/develop → lint + type-check + test → EAS build (main only)
```

### 备份策略
```
每日 03:00 → PocketBase backup API → ZIP → 可选 rclone 上传
保留 7 天，自动清理
```

### 改进建议
1. **速率限制迁移** — 内存 Map → PocketBase (多实例准备)
2. **密码验证统一** — 客户端与服务端规则对齐
3. **Refresh Token 重放检测** — 添加 family_id 字段
4. **CI/CD 补充** — npm audit + API 集成测试 + Docker 构建
5. **备份完整性校验** — 添加 ZIP 校验 + 恢复演练
6. **安全头强化** — Hono 层添加 HSTS/X-Content-Type-Options
7. **Token 黑名单清理优化** — 批量删除 + cron 独立