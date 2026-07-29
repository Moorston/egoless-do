# Implementation: Batch 0 Toolchain Downgrade

## 执行计划

### 步骤 1：修改 package.json

**文件**：`package.json`（根）

**改动**：
```diff
"devDependencies": {
-  "vitest": "^4.1.9"
+  "vitest": "^3.2.7"
}
```

**文件**：`packages/core/package.json`

**改动**：
```diff
"devDependencies": {
-  "vitest": "^4.1.9"
+  "vitest": "^3.2.7"
}
```

### 步骤 2：重新生成 lock 文件

```bash
pnpm install
```

**验证点**：
- 检查 `node_modules/vite/package.json` 版本 < 8.0.0
- 检查 `node_modules/vitest/package.json` 版本在 [3.2.7, 4.0.0)
- `git diff pnpm-lock.yaml` 检查是否有意外的大规模变更

### 步骤 3：验证关键 Suite

逐个运行 5 个曾经失败的 Suite：

```bash
pnpm --filter mobile exec vitest run src/features/sync/SyncRehydrationManager.test.ts
pnpm --filter mobile exec vitest run src/features/sync/SyncService.test.ts
pnpm --filter mobile exec vitest run src/store/useAppStore.test.ts
pnpm --filter mobile exec vitest run src/store/migrateAsyncStorage.test.ts
pnpm --filter mobile exec vitest run src/store/storageAdapter.test.ts
```

**预期**：
- 不再出现 `RolldownError: Flow is not supported`
- 测试可能仍因 mock 缺漏失败，但应该是**测试逻辑失败**（expect 断言失败）
- 记录每个 Suite 的实际失败原因，作为 Batch 1 的输入

### 步骤 4：全量回归

```bash
pnpm run test
pnpm run type-check
pnpm run lint
```

**预期**：
- test：失败清单应与 7/29 基线**一致或更少**（工具链降级不应引入新失败）
- type-check：通过
- lint：不引入新 error

### 步骤 5：记录结果

更新 task 状态，记录：
- 降级前后的 vitest / vite 版本
- 每个关键 Suite 的实际状态（通过 / 失败原因）
- 全量测试的失败清单
- 是否有预期外的 API 兼容问题

## 验证门控

| 门控 | 通过标准 | 失败处理 |
|------|----------|----------|
| G1：版本检查 | Vite < 8.0.0 且 vitest < 4.0.0 | 重新运行 `pnpm install`，检查 lock |
| G2：rolldown 错误消失 | 5 个 Suite 均不报 `Flow is not supported` | 检查是否仍被 rolldown 解析（配置泄漏？） |
| G3：无回归 | 全量 test 失败数 ≤ 降级前 | 分析新失败原因，评估是否 vitest 3 API 差异 |
| G4：type-check 通过 | `pnpm run type-check` 无错误 | 修复类型问题（不应出现） |
| G5：lint 无新 error | `pnpm run lint` error 数不增加 | 修复 lint 问题（不应出现） |

## 回滚点

- **回滚点 1**：`pnpm install` 后 → 如果版本解析异常，`git checkout -- package.json pnpm-lock.yaml && pnpm install`
- **回滚点 2**：验证 Suite 后 → 如果降级未解决 rolldown 问题，回退并重新评估（可能需其他方案）
- **回滚点 3**：全量回归后 → 如果引入不可控回滚，stash/pop 或分支回退

## 关键文件

- `package.json`（根）— 修改 vitest 版本
- `packages/core/package.json` — 同步降级
- `pnpm-lock.yaml` — 重新生成
- `node_modules/vite/package.json` — 验证版本
- `node_modules/vitest/package.json` — 验证版本

## 不修改的文件

- `apps/mobile/package.json` — 保持 expo SDK 54
- `vitest.config.ts` — 保持配置干净
- `apps/mobile/vitest.config.ts` — 保持配置干净
- 任何 `*.test.ts` 文件 — 测试修复在 Batch 1
- `packages/config/eslint.base.js` — ESLint 配置在 Batch 4

## 预计耗时

- 修改 package.json：1 分钟
- pnpm install：1-3 分钟
- 验证 Suite：2-5 分钟
- 全量回归：1-2 分钟
- 记录结果：2-3 分钟

**总计**：~10-15 分钟
