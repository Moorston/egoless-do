# Design: 性能优化 Phase 1

## 1. persistChange 反模式修复

### 当前代码（storageAdapter.ts:54-64）
```typescript
export async function persistChange(entity, id, data) {
  await _batcher.write(entity, id, data);
  await _batcher.flushNow();        // ← 立即 flush，抵消 batch
  await saveDataToFile(entity, id, data);  // ← UI 线程同步文件 I/O
}
```

### 修复方案
```typescript
export async function persistChange(entity, id, data) {
  await _batcher.write(entity, id, data);
  // 移除 flushNow + saveDataToFile
  // 文件备份改为 AppState background 时批量（见 Step 5）
}
```

### 文件备份策略调整
```typescript
// 新增：AppState background 时批量备份
AppState.addEventListener('change', (state) => {
  if (state === 'background') {
    flushWrites().catch(() => {});
    backupAllEntitiesToFile().catch(() => {});  // 批量备份
  }
});
```

---

## 2. WriteBatcher 单事务化

### 当前代码（WriteBatcher.ts:107-208）
```typescript
for (const write of writes) {
  await db.execAsync('BEGIN');
  await db.runAsync(upsertSQL, [...]);
  await db.execAsync('COMMIT');
}
```

### 修复方案
```typescript
await db.execAsync('BEGIN');
try {
  for (const write of writes) {
    await db.runAsync(upsertSQL, [...]);
  }
  await db.execAsync('COMMIT');
} catch (err) {
  await db.execAsync('ROLLBACK');
  throw err;
}
```

---

## 3. 缺失索引

### migration（schema.ts）
```sql
CREATE INDEX IF NOT EXISTS idx_checkin_del_date ON checkin_records(deleted, date DESC);
CREATE INDEX IF NOT EXISTS idx_trails_del ON thought_trails(deleted, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_habits_deleted ON habits(deleted, rowid);
CREATE INDEX IF NOT EXISTS idx_mind_del_ts ON mind_reflections(deleted, created_at DESC);
```

---

## 4. 移除未使用依赖

### package.json
```diff
- "@gorhom/bottom-sheet": "^5.2.14",
- "expo-localization": "~17.0.9",
- "expo-status-bar": "~3.0.9",
```

---

## 5. Sentry/PostHog 动态 import

### sentry.ts
```typescript
// 改为异步初始化
export async function initSentry() {
  const Sentry = await import('@sentry/react-native');
  Sentry.init({ dsn: process.env.EXPO_PUBLIC_SENTRY_DSN });
}
```

### posthog.ts（已部分实现）
```typescript
// initPostHog 已改为 initApp 中调用，保持即可
```

---

## 验证

```bash
npx vitest run  # 1832/1832 通过
npx tsc --noEmit  # 类型安全
```

---

## 风险

| 风险 | 缓解 |
|------|------|
| persistChange 修复导致数据丢失 | WAL checkpoint + background 批量备份 |
| WriteBatcher 事务失败 | 保留 ROLLBACK + 错误日志 |
| 索引创建失败 | `CREATE INDEX IF NOT EXISTS`（幂等）|
| Sentry 延迟初始化漏报 | 首屏后立即初始化（<1s 延迟）|
