# 启动速度优化方案

> 分析日期: 2026-07-29
> 目标: 冷启动时间减少 30-50%

## 当前启动路径

```
App.tsx
  └─ initApp()
      ├─ Step 0: configureFontScale
      ├─ Step 1: openDatabase
      ├─ Step 2: migrateAsyncStorageToSQLite  ← 串行，可并行
      │         migrateSettingsToSQLite
      ├─ Step 3: flushWrites                  ← 阻塞
      │         loadSettingsPatch (并行)
      │         rehydrateFromDb (并行)        ← 39 实体全量
      │         profile unpack
      ├─ Step 3a: dedupBodyPlans              ← 可延迟
      ├─ Step 3b: cleanupGhosts               ← 可延迟
      ├─ Step 4: loadSecureTokens             ← 阻塞（需先完成）
      ├─ Step 5: subscribe token/sync         ← 可延迟
      ├─ Step 6: DailyResetManager            ← 可延迟
      ├─ Step 7: calculateStreak/MedMin       ← 可懒加载
      └─ Step 8: cleanupRecycleBin            ← 可延迟
```

**瓶颈分析**:

| 步骤 | 耗时估计 | 是否可优化 |
|------|---------|-----------|
| openDatabase | ~50ms | ❌ 必须串行 |
| 迁移（Step 2）| ~100ms | ✅ 可并行 |
| flushWrites | ~50-200ms | ✅ 可延迟 |
| rehydrateFromDb (39 实体)| ~200-500ms | ✅ 可分批 |
| loadSecureTokens | ~50ms | ❌ 必须串行 |
| calculateStreak | ~50-100ms | ✅ 可懒加载 |
| cleanupRecycleBin | ~20ms | ✅ 可延迟 |

**总估计**: ~500-1200ms（冷启动）

---

## 优化方案

### 方案 A: 关键路径优先（推荐，低风险）

**思路**: 先渲染首屏，延迟非关键初始化

```
优化后路径:
┌─────────────────────────────────────────────────────────┐
│ 关键路径（~300ms）                                        │
│ ─ openDatabase                                          │
│ ─ loadSecureTokens (并行 with DB)                       │
│ ─ rehydrateFromDb (仅首屏实体: habits/checkins/profile)  │
│ ─ setState → 渲染首屏                                    │
└─────────────────────────────────────────────────────────┘
         ↓ 首屏渲染后（requestIdleCallback / InteractionManager）
┌─────────────────────────────────────────────────────────┐
│ 延迟路径（~500ms，不阻塞首屏）                            │
│ ─ 剩余 36 实体加载                                       │
│ ─ 迁移 + flushWrites                                    │
│ ─ 订阅 setup                                            │
│ ─ DailyResetManager                                     │
│ ─ 派生状态计算                                           │
│ ─ cleanupGhosts / RecycleBin                            │
└─────────────────────────────────────────────────────────┘
```

**实现步骤**:

#### 1. 拆分 rehydrateFromDb 为"关键" + "延迟"

```typescript
// initApp.ts
const CRITICAL_ENTITIES = ['profile', 'habits', 'checkin_records', 'auth'];
const DEFERRABLE_ENTITIES = ['reflections', 'meditation_history', 'plans', /* ... */];

// 关键路径
const criticalPatch = await rehydrateFromDb(CRITICAL_ENTITIES);
setState(criticalPatch);
setInitDone(true);  // ← 触发首屏渲染

// 延迟路径（首屏后）
requestIdleCallback(async () => {
  const deferredPatch = await rehydrateFromDb(DEFERRABLE_ENTITIES);
  setState(deferredPatch);
  // 迁移、订阅、cleanup...
}, { timeout: 2000 });
```

**收益**: 首屏时间从 ~800ms → ~300ms（减少 60%）

#### 2. 并行化迁移 + Token 加载

```typescript
// 当前: 串行
await migrateAsyncStorageToSQLite(db);
await migrateSettingsToSQLite(db);
const tokens = await loadSecureTokensWithRetry();

// 优化: 并行
const [, tokens] = await Promise.all([
  Promise.all([
    migrateAsyncStorageToSQLite(db).catch(() => {}),
    migrateSettingsToSQLite(db).catch(() => {}),
  ]),
  loadSecureTokensWithRetry(),
]);
```

**收益**: ~150ms

#### 3. 派生状态懒加载（calculateStreak / calculateTotalMedMin）

```typescript
// 当前: initApp 中同步计算
store.calculateStreak();
store.calculateTotalMedMin();

// 优化: 各 Screen 首次 mount 时计算
// HomeScreen.tsx
useEffect(() => {
  if (streak === undefined) store.calculateStreak();
}, []);
```

**收益**: ~100ms（启动时不计算，分散到各 Screen）

#### 4. flushWrites 延迟到 background

```typescript
// 当前: 启动时阻塞
await flushWrites();

// 优化: AppState background 时 flush
AppState.addEventListener('change', (state) => {
  if (state === 'background') flushWrites();
});
```

**收益**: ~100-200ms

---

### 方案 B: 激进优化（高风险，高收益）

**思路**: SQLite 连接池 + 预加载 + 二进制缓存

| 优化 | 收益 | 风险 |
|------|------|------|
| SQLite 连接复用 | ~50ms | 低 |
| 实体数据二进制缓存（MMKV）| ~200ms | 中 |
| 启动时仅加载"差异"（与上次 snapshot 对比）| ~300ms | 高 |
| Hermes 字节码预编译 | ~100ms | 低 |

**不推荐当前阶段**: 复杂度高，收益边际

---

## 推荐执行计划

### Phase 1: 快速收益（1-2 天）

| 优化 | 工时 | 预期收益 |
|------|------|---------|
| 拆分关键/延迟实体加载 | 4h | -300ms |
| 并行化迁移 + Token | 1h | -100ms |
| 派生状态懒加载 | 2h | -100ms |
| **小计** | **7h** | **-500ms（50%↓）** |

### Phase 2: 深度优化（3-5 天）

| 优化 | 工时 | 预期收益 |
|------|------|---------|
| flushWrites → background | 2h | -150ms |
| 启动性能监控（Perf marker）| 3h | 可观测 |
| SQLite 查询优化（EXPLAIN）| 4h | -50ms |
| **小计** | **9h** | **-200ms** |

---

## 验证指标

### 关键指标

| 指标 | 当前（估）| Phase 1 目标 | Phase 2 目标 |
|------|----------|-------------|-------------|
| **TTI（Time to Interactive）**| ~1200ms | <600ms | <400ms |
| **首屏渲染（FCP）**| ~800ms | <300ms | <200ms |
| **initApp 完成**| ~1000ms | <500ms | <300ms |

### 测量方法

```typescript
// initApp.ts 加 perf marker
const t0 = performance.now();
// ... 各步骤
log.debug(`initApp step 3: ${performance.now() - t0}ms`);
```

---

## 风险

| 风险 | 缓解 |
|------|------|
| 延迟加载导致首屏数据缺失 | 关键实体（habits/checkins/profile）必须在首屏前加载 |
| 懒加载派生状态导致 UI 闪烁 | 用 `undefined` 判断 + 骨架屏 |
| 并行化导致 race condition | 迁移 + Token 无依赖关系，可安全并行 |

---

## 结论

**推荐执行 Phase 1（7h）**:
- 启动时间从 ~1200ms → ~600ms（减少 50%）
- 低风险（不改动核心逻辑，仅调整执行顺序）
- 高收益（首屏响应速度翻倍）

**触发条件**: 用户反馈启动慢 / 低端机测试 TTI > 1s
