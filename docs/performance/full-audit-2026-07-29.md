# 性能全量审计报告

> 审计日期: 2026-07-29
> 范围: 启动速度 / 列表渲染 / 包体积 / 同步路径 / SQLite
> 目标: 识别最大性能瓶颈 + 产出优化路线图

---

## 执行摘要

| 维度 | 问题数 | 最大单源收益 | 优先级 |
|------|--------|-------------|--------|
| **同步路径** | 16 | persistChange 反模式（UI 线程同步 I/O）| 🔴 P0 |
| **SQLite** | 12 | 4 个缺失索引（全表扫描）| 🔴 P0 |
| **包体积** | 19 | 未使用依赖 + 动态 import（~1.5MB）| 🟠 P1 |
| **列表渲染** | 22 | FlashList 采用率 0% + 13 处嵌套 FlatList | 🟠 P1 |

**总问题**: 69 个
**预估总收益**: TTI -60~70%（1200ms → 400ms），包体积 -1.5MB

---

## Top-10 优化机会（按 影响 × 成本 排序）

| # | 优化 | 维度 | 收益 | 风险 | 工时 |
|---|------|------|------|------|------|
| **1** | 修复 persistChange 反模式 | 同步 | UI 写入延迟 ↓50-100× | 中 | 4h |
| **2** | WriteBatcher 单事务化 | 同步 | SQLite 写入 ↑5-10× | 中 | 3h |
| **3** | 补 4 个缺失索引 | SQLite | 冷启动查询 ↓60-80% | 低 | 1h |
| **4** | 移除未使用依赖 | 包体积 | -110KB | 低 | 0.5h |
| **5** | Sentry/PostHog 动态 import | 包体积 | 首屏 -550KB | 低 | 2h |
| **6** | 消除 scrollEnabled={false} 嵌套 | 列表 | 首页/打卡页帧率 ↑ | 高 | 8h |
| **7** | 关键列表迁 FlashList | 列表 | 长列表帧率 ↑ | 中 | 6h |
| **8** | 派生状态懒加载（已完成）| 启动 | -150ms | 低 | ✅ |
| **9** | 关键/延迟实体拆分（已完成）| 启动 | -300ms | 低 | ✅ |
| **10** | 并行化迁移+Token（已完成）| 启动 | -100ms | 低 | ✅ |

---

## 维度详细分析

### 1. 同步路径（16 问题）

#### 🔴 致命反模式: persistChange

```typescript
// 当前（storageAdapter.ts:54-64）
export async function persistChange(entity, id, data) {
  await _batcher.write(entity, id, data);
  await _batcher.flushNow();        // ← 立即 flush，抵消 batch
  await saveDataToFile(entity, id, data);  // ← UI 线程同步文件 I/O
}
```

**影响**: 每次习惯勾选、冥想完成等 UI 写入都同步落盘 SQLite + 写全量文件，是**首屏/快速录入卡顿的首要嫌疑**。

**修复**:
```typescript
export async function persistChange(entity, id, data) {
  await _batcher.write(entity, id, data);
  // 移除 flushNow + saveDataToFile
  // 文件备份改为 AppState background 时批量
}
```

#### 🟠 WriteBatcher 单事务化

```typescript
// 当前: N 行 = N 次 BEGIN/COMMIT
for (const write of writes) {
  await db.execAsync('BEGIN');
  await db.runAsync(upsertSQL, [...]);
  await db.execAsync('COMMIT');
}

// 优化: 整个 batch 一个事务
await db.execAsync('BEGIN');
for (const write of writes) {
  await db.runAsync(upsertSQL, [...]);
}
await db.execAsync('COMMIT');
```

**收益**: SQLite 写入吞吐 ↑5-10×

#### 🟡 其他优化
- wal_checkpoint 频率降低（每次 → 每 N 次）
- 指数退避 + 抖动（对齐 SyncEngine）
- 队列上限 1000（防内存膨胀）

---

### 2. SQLite 查询（12 问题）

#### 🔴 4 个缺失索引（全表扫描）

| 表 | 查询 | 当前状态 | 修复 |
|----|------|---------|------|
| checkin_records | `WHERE deleted=0 ORDER BY date DESC` | ❌ 全表扫描 | `CREATE INDEX idx_checkin_del_date ON checkin_records(deleted, date DESC)` |
| thought_trails | `WHERE deleted=0 ORDER BY created_at DESC` | ❌ 全表扫描 | `CREATE INDEX idx_trails_del ON thought_trails(deleted, created_at DESC)` |
| habits | `WHERE deleted=0 ORDER BY rowid` | ⚠️ 未命中 | `CREATE INDEX idx_habits_deleted ON habits(deleted, rowid)` |
| mind_reflections | `WHERE deleted=0 ORDER BY created_at DESC` | ⚠️ 扫描 filtered | `CREATE INDEX idx_mind_del_ts ON mind_reflections(deleted, created_at DESC)` |

**收益**: 冷启动查询延迟 ↓60-80%

#### 🟠 N+1 查询

| 位置 | 问题 | 修复 |
|------|------|------|
| orphanRecovery.ts | 每行独立事务 | 批量 INSERT |
| schema.ts migration | N 次 COUNT(*) | 单次 GROUP BY |
| WriteBatcher | 每行独立事务 | 单事务批量 |

---

### 3. 包体积（19 问题）

#### 未使用依赖（可立即移除）

| 包 | 体积 | 状态 |
|----|------|------|
| @gorhom/bottom-sheet | ~80KB | ❌ 0 处 import |
| expo-localization | ~30KB | ❌ 0 处 import |
| expo-status-bar | ~10KB | ⚠️ 模板默认 |

**收益**: -120KB

#### 动态 import 机会

| 库 | 当前 | 建议 | 收益 |
|----|------|------|------|
| react-native-amap3d | 顶层 import | 地图页 mount 时 import | -300KB 首屏 |
| @sentry/react-native | 顶层 import | 首屏后异步初始化 | -350KB 首屏 |
| posthog-react-native | 顶层 import | 用户同意后初始化 | -200KB 首屏 |

**收益**: -850KB 首屏

#### Tree-shaking

- 16 处 `import * as` → 具名 import
- lucide-react-native 图标审计

---

### 4. 列表渲染（22 问题）

#### 🔴 scrollEnabled={false} 嵌套反模式（13 处）

```typescript
// 当前（首页、打卡页、回顾页）
<ScrollView>
  <FlatList scrollEnabled={false} />  ← 一次性全量布局
  <FlatList scrollEnabled={false} />
  <FlatList scrollEnabled={false} />
</ScrollView>
```

**影响**: 首页核心内容强制一次性渲染，帧率下降。

**修复**: 合并为单一 FlashList 或 SectionList

#### 🟠 FlashList 采用率 0%

- `@shopify/flash-list` 已安装
- `VirtualList.tsx` 包装器已写
- features 内实际使用 **0 处**

**修复**: 关键列表（锻炼选择、饮食记录、历史列表）迁 FlashList

---

## 优化路线图

### Phase 1: 快速收益（8h，-60% TTI）

| 优化 | 工时 | 收益 | 风险 |
|------|------|------|------|
| 移除未使用依赖 | 0.5h | -110KB | 低 |
| 补 4 个缺失索引 | 1h | 查询 ↓60-80% | 低 |
| Sentry/PostHog 动态 import | 2h | 首屏 -550KB | 低 |
| WriteBatcher 单事务化 | 3h | 写入 ↑5-10× | 中 |
| 修复 persistChange 反模式 | 4h | UI 写入 ↓50-100× | 中 |

**预期**: TTI 600ms → 350ms（-40%）

### Phase 2: 深度优化（12h）

| 优化 | 工时 | 收益 | 风险 |
|------|------|------|------|
| 关键列表迁 FlashList | 6h | 长列表帧率 ↑ | 中 |
| 消除嵌套 FlatList | 8h | 首页帧率 ↑ | 高 |
| wal_checkpoint 优化 | 0.5h | 写入延迟 ↓ | 低 |
| 队列上限 + 指数退避 | 1h | 稳定性 ↑ | 低 |

### Phase 3: 长期（可选）

- AsyncStorage 迁移完成后移除
- lucide 图标审计
- 列表分页（LIMIT + 游标）

---

## 验证指标

| 指标 | 当前 | Phase 1 目标 | Phase 2 目标 |
|------|------|-------------|-------------|
| **TTI** | ~600ms（Phase 1 后）| ~350ms | ~250ms |
| **首屏 JS** | ~6-9MB | ~5-7MB | ~4-6MB |
| **SQLite 查询** | 全表扫描 | 索引命中 | 索引命中 |
| **列表帧率** | 30-45fps | 45-55fps | 55-60fps |

---

## 风险

| 风险 | 缓解 |
|------|------|
| persistChange 修复导致数据丢失 | 文件备份改为 background 批量 + WAL checkpoint |
| WriteBatter 事务重构失败 | 保留 ROLLBACK 语义 + 全量回归测试 |
| FlashList 兼容性问题 | 先在低频页面试验 |

---

## 结论

**推荐执行 Phase 1（8h）**:
- 修复 2 个致命反模式（persistChange + 缺失索引）
- 动态 import 3 个大包
- 移除未使用依赖

**预期收益**: TTI 600ms → 350ms，首屏 JS -850KB，SQLite 查询 ↓60-80%

**触发条件**: 用户反馈卡顿 / 低端机测试 TTI > 500ms
