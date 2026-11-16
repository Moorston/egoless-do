# core 测试 store harness 抽取 + slice 测试迁移

## Goal

抽取共享 typed test harness（`createTestStore<Slice>` + `createMockStorageAdapter`），消除 16 个 slice 测试文件复制的 `makeTestStore` + `mockAdapter as any` 模式，把 core lint warning ratchet 从 530 大幅下调（预期 → 20-40）。关联 proposal：`openspec/changes/core-typed-test-harness/proposal.md`。

## Background

本次 explore 定位：core 530 warning = 246 explicit-any + 284 级联 unsafe-*，全部源于 16 个 `store/*.test.ts` 复制粘贴的 `makeTestStore()` + `mockAdapter as any` 模式。每文件 3 处根 `as any`（api/get/mockAdapter），级联出 unsafe-member-access/assignment/call。

根因是摩擦：`SliceCreator<Slice> = StateCreator<FullStore, [], [], Slice>` 绑定 `FullStore`（全部 slice 并集），测试想隔离测单 slice 却不想构造整个 FullStore，于是 `as any` 绕过。

## Requirements

### R1 — Spike gate（前置，必须先做）
- 先只迁移 `createAuthSlice.test.ts`（最重 mock，23 根 any + 重级联）到 harness
- 实测级联消除比：记录迁移前后该文件 warning 数
- **Gate 条件**：根 any 消除 ≥ 80% 且级联 unsafe-* 消除 ≥ 70% 才推广。未达标则 replan（可能 harness 设计需调整，或承认部分 any 不可消除）

### R2 — harness 实现
- 新增 `packages/core/src/store/test-utils/storeHarness.ts`：
  - `createTestStore<Slice>(initial: Slice)`：返回 `{ state, set, get, api }`，类型合规匹配 `StateCreator<Slice, [], [], Slice>`。FullStore 摩擦封在内部
  - `createMockStorageAdapter(): StorageAdapter`：9 方法全覆盖（含 hardDelete/flushNow/onPersistError），vi.fn() 配正确类型
  - 可选 `bindSlice<Slice>(factory, ...deps)`：封装工厂边界 cast（SliceCreator<FullStore> → SliceCreator<Slice>），整仓库唯一 cast 点
- harness 内部允许唯一边界 cast（`as unknown as`），调用方 0 cast

### R3 — 迁移 16 个 slice 测试
- 逐个文件：删手写 `makeTestStore`/`mockAdapter`，改 import harness，移除 `as any`
- 保留 per-test 的 slice-specific callbacks（如 createAuthSlice 的 onLogout/onPullServerData 等）
- 顺序：先重 mock（Auth/RecycleBin/Fasting）后轻 mock（Mantra/Sleep/Exercise）

### R4 — ratchet 下调 + 验证
- 实测迁移后 core warning 总数，下调 `packages/core/package.json` lint 脚本 `--max-warnings`（530 → 实测值）
- `pnpm run test`（core）全绿，行为不变
- `pnpm run lint`（core）0 error，warning ≤ 新阈值

## Acceptance Criteria

- [ ] Spike 完成：createAuthSlice.test.ts 迁移，级联消除比达标（R1 gate）
- [ ] harness 文件存在，导出 createTestStore + createMockStorageAdapter（+ 可选 bindSlice）
- [ ] 16 个 slice 测试全部迁移到 harness，无手写 makeTestStore/mockAdapter
- [ ] core warning 总数显著下降（预期 530 → 20-40），实测值写入 ratchet 阈值
- [ ] `pnpm run test`（core）全绿（2052 测试不退化）
- [ ] `pnpm run lint`（core）0 error，warning ≤ 新阈值
- [ ] OpenSpec change `core-typed-test-harness` archive（workflow 3.4.5）

## Out of Scope

- mobile 的 13 warning（不同源，max-lines-per-function，独立立项）
- core 非测试源码类型安全（已 0 error）
- 生产代码 StorageAdapter 实现
- 新增测试用例（纯基建迁移，不改测试覆盖）

## Risks

- **FullStore 类型摩擦（高）**：SliceCreator 绑定 FullStore，harness 边界 cast 后 `slice.addX()` 是否保留类型推断是 spike 核心验证点。若 cast 后 slice 退化为 any，级联没消除只是搬家——spike gate 会发现
- **transaction 泛型 typing（中）**：`transaction<T>(fn)` 的 vi.fn typing 可能需特殊处理
- **16 文件迁移工作量（中）**：每个文件模式相似但 callback/deps 不同，需逐个适配
- **回滚**：harness + 16 文件改动可整体 revert，ratchet 阈值回 530
