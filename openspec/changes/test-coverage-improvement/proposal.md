# 测试覆盖率提升计划

## Context

架构审计发现移动端 features/ 层测试覆盖率仅 **1.9%**（297 个源文件仅 6 个测试，且 3 个为 Trivial 级）。核心业务逻辑层（packages/core）覆盖率 28%，表现良好。**Sync 子系统 2,500+ 行零测试**是最大风险点。

## 现状

```
┌──────────────────┬──────────┬───────────┬───────────────────┐
│                  │ 源文件    │ 测试文件   │ 覆盖率            │
├──────────────────┼──────────┼───────────┼───────────────────┤
│ packages/core    │ 143      │ 40        │ 1:3.6 (28%) ✅    │
│ mobile/store/db  │ ~30      │ 8         │ 1:3.8 (26%) ✅    │
│ mobile/features  │ 297      │ 6         │ 1:50  (2%)  🔴    │
└──────────────────┴──────────┴───────────┴───────────────────┘
```

## 目标

将 mobile/features 测试覆盖率从 2% 提升至 **15%+**，聚焦数据完整性关键路径。

## 分阶段实施（自底向上）

### Phase 1: 纯函数测试（EASY，立即见效）

| 文件 | 行数 | 测试用例数 | 理由 |
|------|------|-----------|------|
| `hooks/searchPipeline.ts` | 86 | 6-8 | 刚提取的纯函数，零依赖 |
| `hooks/useSearchHistory.ts` | 32 | 4-5 | AsyncStorage mock |
| `hooks/useDateNavigation.ts` | 36 | 5-6 | 纯状态逻辑 |

**预期**: 3 个文件，15-19 个测试用例

### Phase 2: 写入层测试（MEDIUM）

| 文件 | 行数 | 测试用例数 | 理由 |
|------|------|-----------|------|
| `sync/WriteBatcher.ts` | 216 | 8-10 | 批量写入 + 去重 + flush 逻辑 |
| `sync/SyncApplyService.ts` | 340 | 12-15 | 服务器数据应用 + 冲突处理 |

**预期**: 2 个文件，20-25 个测试用例

### Phase 3: 核心编排器测试（HARD，最高 ROI）

| 文件 | 行数 | 测试用例数 | 理由 |
|------|------|-----------|------|
| `sync/SyncEngine.ts` | 655 | 20-25 | push/pull 循环 + 冲突合并 + orphan 恢复 + debounce |

**预期**: 1 个文件，20-25 个测试用例

### Phase 4: 启动与持久化测试（MEDIUM）

| 文件 | 行数 | 测试用例数 | 理由 |
|------|------|-----------|------|
| `sync/SyncRehydrationManager.ts` | 294 | 10-12 | 启动时数据加载 + Zod 验证 |
| `store/useAppStore.ts` | 194 | 6-8 | 19 slice 组合点 |

**预期**: 2 个文件，16-20 个测试用例

## 测试策略

### Mock 层次

```
┌─────────────────────────────────────────────────┐
│ 测试文件                                         │
├─────────────────────────────────────────────────┤
│ vi.mock('../../db/schema')          ← SQLite    │
│ vi.mock('../../db/syncQueue')       ← 队列      │
│ vi.mock('@egoless-do/core')         ← API 函数  │
│ vi.mock('../../store/useAppStore')  ← Store     │
│ vi.mock('./RealtimeAgent')          ← WebSocket │
└─────────────────────────────────────────────────┘
```

### 测试模式

```typescript
// SyncEngine 示例
describe('SyncEngine', () => {
  it('completes push/pull cycle with empty queue', async () => { ... });
  it('pushes queued changes and marks synced', async () => { ... });
  it('handles push rejection with server-wins merge', async () => { ... });
  it('recovers orphaned records on next sync', async () => { ... });
  it('debounces rapid sync triggers', async () => { ... });
  it('handles token expiry mid-sync with refresh', async () => { ... });
});
```

## 验证

- `pnpm run test` — 全部通过
- `pnpm run type-check` — 无新增类型错误
- 新增测试文件数: **10 个**
- 新增测试用例数: **~80 个**

## 风险

| 风险 | 缓解 |
|------|------|
| SyncEngine mock 复杂度高 | 先测 SyncApplyService（更简单的 mock） |
| 测试维护成本 | 纯函数优先，减少 mock 依赖 |
| 假阳性测试 | 测试真实行为，不测实现细节 |
