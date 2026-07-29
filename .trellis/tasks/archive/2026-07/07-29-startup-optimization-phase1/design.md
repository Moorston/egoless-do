# Design: 启动速度优化 Phase 1

## 当前启动路径分析

```
initApp() [~1200ms TTI]
├─ configureFontScale
├─ openDatabase
├─ migrateAsyncStorageToSQLite  ← ~100ms（串行）
├─ migrateSettingsToSQLite      ← ~50ms（串行）
├─ flushWrites                  ← ~100ms（阻塞）
├─ loadSettingsPatch (并行 with rehydrate)
├─ rehydrateFromDb (39 实体)    ← ~300ms（全量，瓶颈）
│    ├─ queryEntity × 39
│    └─ file backup fallback
├─ profile unpack
├─ setState (fullPatch)
├─ dedupBodyPlans               ← ~50ms（可延迟）
├─ cleanupGhosts                ← ~50ms（可延迟）
├─ loadSecureTokens             ← ~50ms（串行）
├─ subscribe token/sync         ← ~20ms
├─ DailyResetManager            ← ~30ms（可延迟）
├─ calculateStreak              ← ~100ms（可懒加载）
├─ calculateTotalMedMin         ← ~50ms（可懒加载）
└─ cleanupRecycleBin            ← ~20ms（可延迟）
```

**关键瓶颈**: rehydrateFromDb 全量加载 + 串行迁移/Token

---

## 优化方案

### 1. 拆分关键/延迟实体加载

#### 关键实体（首屏必需，≤ 5 个）
```typescript
const CRITICAL_ENTITIES = [
  'profile',          // 用户信息 + 设置 unpack
  'habits',           // 首页习惯列表
  'checkin',          // 打卡记录（streak 计算）
  'auth',             // 已持久化到 app_state，快速
  'settings',         // theme/language（已持久化到 profile）
];
```

#### 延迟实体（其余 34 个）
```typescript
const DEFERRABLE_ENTITIES = [
  'reflection', 'meditation', 'plan', 'planItem', 'planItemCheckin',
  'fasting', 'food', 'exercise', 'sleep', 'breath', 'mantra',
  'zhiguan', 'give', 'grace', 'sutra', 'fear', 'courage',
  'vision', 'dedication', 'body', 'customFoodPreset', 'aiConfig',
  // ... 其余
];
```

#### 实现

```typescript
// SyncRehydrationManager.ts
async rehydrateFromDb(entities?: string[]): Promise<Record<string, unknown>> {
  const targets = entities ?? Object.keys(REHYDRATE_MAP);
  // ... 其余逻辑不变
}

// initApp.ts
// 关键路径（阻塞首屏）
const criticalPatch = await rehydrateFromDb(CRITICAL_ENTITIES);
const settingsPatch = await loadSettingsPatch();
setState({ ...settingsPatch, ...criticalPatch });
setInitDone(true);  // ← 触发首屏渲染

// 延迟路径（首屏后）
requestIdleCallback(async () => {
  const deferredPatch = await rehydrateFromDb(DEFERRABLE_ENTITIES);
  setState(deferredPatch);
}, { timeout: 3000 });
```

**收益**: 首屏渲染从 ~800ms → ~300ms（-60%）

---

### 2. 并行化迁移 + Token 加载

```typescript
// 当前（串行）
await migrateAsyncStorageToSQLite(db, adapter);
await migrateSettingsToSQLite(db, adapter);
await flushWrites();
const tokens = await loadSecureTokensWithRetry();

// 优化（并行）
const [, tokens] = await Promise.all([
  Promise.all([
    migrateAsyncStorageToSQLite(db, adapter).catch(e => log.error(e)),
    migrateSettingsToSQLite(db, adapter).catch(e => log.error(e)),
  ]),
  loadSecureTokensWithRetry(),
]);
await flushWrites();  // 迁移完成后 flush
```

**收益**: ~150ms

---

### 3. 派生状态懒加载

#### 当前
```typescript
// initApp Step 7
store.calculateStreak();
store.calculateTotalMedMin();
```

#### 优化
```typescript
// HomeScreen.tsx
useEffect(() => {
  const state = useAppStore.getState();
  if (state.streak === undefined || state.streak === null) {
    state.calculateStreak();
  }
}, []);

// MeditationScreen.tsx
useEffect(() => {
  const state = useAppStore.getState();
  if (state.totalMedMinutes === undefined || state.totalMedMinutes === null) {
    state.calculateTotalMedMin();
  }
}, []);
```

**收益**: ~150ms（启动时不计算）

---

## 优化后启动路径

```
initApp() [~500ms TTI, -60%]
├─ configureFontScale
├─ openDatabase
├─ Promise.all([migrate + Token])  ← 并行，~150ms
├─ flushWrites                     ← ~100ms
├─ rehydrateFromDb(CRITICAL)       ← ~100ms（仅 5 实体）
├─ setState → setInitDone          ← 首屏渲染
│
├─ [requestIdleCallback]
│   ├─ rehydrateFromDb(DEFERRED)   ← ~300ms（34 实体，不阻塞）
│   ├─ DailyResetManager
│   └─ cleanupGhosts/RecycleBin
│
└─ [Screen mount]
    ├─ calculateStreak（HomeScreen）
    └─ calculateTotalMedMin（MeditationScreen）
```

**TTI**: 1200ms → 500ms（**-58%**）
**首屏**: 800ms → 300ms（**-62%**）

---

## 文件改动清单

| 文件 | 改动 |
|------|------|
| `initApp.ts` | 拆分关键/延迟、并行化、移除同步计算 |
| `SyncRehydrationManager.ts` | rehydrateFromDb 参数化 |
| `HomeScreen.tsx` | useEffect → calculateStreak |
| `MeditationScreen.tsx` | useEffect → calculateTotalMedMin |

---

## 风险与缓解

| 风险 | 缓解 |
|------|------|
| 延迟加载导致首屏数据缺失 | CRITICAL_ENTITIES 包含所有首屏必需数据 |
| 懒加载派生状态导致 UI 闪烁 | 用 `undefined` 判断 + 骨架屏/loading |
| requestIdleCallback 不兼容 | 降级 setTimeout(fn, 100) |
| 并行迁移 + Token race | 两者无依赖，安全并行 |

---

## 性能监控

```typescript
// initApp.ts 加 perf marker
const t0 = performance.now();
log.info('[Perf] initApp start');
// ... 各步骤
log.info(`[Perf] critical load: ${performance.now() - t0}ms`);
// ...
log.info(`[Perf] initApp complete: ${performance.now() - t0}ms`);
```

验证命令：
```bash
npx vitest run  # 确保 1827/1827 通过
npx tsc --noEmit  # 类型安全
```
