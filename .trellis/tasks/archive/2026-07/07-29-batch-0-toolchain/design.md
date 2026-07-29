# Design: Batch 0 Toolchain Downgrade

## 技术背景

### 工具链版本矩阵

| 工具 | 当前版本 | 目标版本 | 打包器 | Flow 支持 |
|------|----------|----------|--------|-----------|
| vitest | 4.1.10 | 3.2.7 | - | - |
| vite | 8.1.3 | 6.x | 见下 | 见下 |

**打包器差异**：
- Vite 8 → rolldown → ❌ 不支持 Flow
- Vite 6 → esbuild → ✅ 支持 Flow

**vitest 版本差异**：
- vitest 4.x peer dependency: Vite 8（强制）
- vitest 3.x 内部集成 Vite 5/6，peer 无 vite 声明

### 根因链路

```
vitest ^4.1.9 (根 package.json)
    │ vitest 4 强制 peer Vite 8
    ▼
Vite 8.1.3
    │ Vite 8 内置 rolldown
    ▼
rolldown 1.1.4
    │ rolldown 不支持 Flow
    ▼
react-native/index.js (Flow 源码)
    │ transform 阶段 Parse failure
    ▼
测试 Suite 在打包阶段死亡
```

## 设计决策

### 决策 1：降级 vitest 而非配置绕开

**已验证不可行**：
- `ssr.noExternal: ['react-native']` → 仍被 rolldown 解析
- `deps.optimizer.web.include: ['react-native']` → optimizer 也是 rolldown

**选择降级**：rolldown 不支持 Flow 是固有限制，只有换回 esbuild 才能解决。

### 决策 2：仅修改根 package.json 的 vitest 版本

**不改**：
- `mobile/package.json`（没有声明 vitest）
- `packages/core/package.json`（只声明 `"vitest": "^4.1.9"`，与根一致，需同步降级）
- `vitest.config.ts`（保持配置干净）

**改**：
- 根 `package.json` 的 `devDependencies.vitest`: `^4.1.9` → `^3.2.7`
- `packages/core/package.json` 的 `devDependencies.vitest`: `^4.1.9` → `^3.2.7`

**理由**：vitest 通过 pnpm workspace 的 hoisting 解析到根 node_modules，改根即可。

### 决策 3：不手动指定 Vite 版本

**理由**：vitest 3.2.7 内部集成的 Vite 版本就是 5/6。只要 vitest 降级，`pnpm install` 会自动把 Vite 拉回 6.x。手动指定 Vite 版本可能导致版本冲突。

### 决策 4：不修改任何测试文件

**理由**：本 task 只验证工具链降级是否解决 transform 问题。测试逻辑修复在 Batch 1。即使降级后某些测试仍因 mock 缺漏失败，也是**预期行为**——说明问题已回到 design 原始假设（mock 缺漏）。

## 兼容性分析

### vitest 3 vs 4 API 差异

| API/行为 | vitest 3 | vitest 4 | 对现有测试影响 |
|----------|----------|----------|----------------|
| `vi.mock()` | ✅ | ✅ | 无变化 |
| `vi.fn()` | ✅ | ✅ | 无变化 |
| `vi.clearAllMocks()` | ✅ | ✅ | 无变化 |
| `describe/it/expect` | ✅ | ✅ | 无变化 |
| `beforeEach/afterEach` | ✅ | ✅ | 无变化 |
| `testNamePattern` | ✅ | ✅ | 无变化 |
| `pool: 'forks'` | 默认 | 默认 | 无变化 |
| `workspace` 配置 | 支持 | 支持 | 无变化 |

**结论**：常用 API 无破坏性变更。唯一需要留意的是 vitest 4 引入的 `test.onTestFinished` 等新钩子，但当前代码库未使用。

### Vite 6 vs 8 配置差异

| 配置项 | Vite 6 | Vite 8 | 当前使用 |
|--------|--------|--------|----------|
| `resolve.alias` | ✅ | ✅ | ✅ 使用 |
| `test.globals` | ✅ | ✅ | ✅ 使用 |
| `test.environment` | ✅ | ✅ | ✅ 使用 |
| `test.include/exclude` | ✅ | ✅ | ✅ 使用 |
| `test.setupFiles` | ✅ | ✅ | ✅ 使用 |
| `test.deps.optimizer` | ✅ | ✅ | ❌ 未使用 |
| `ssr.noExternal` | ✅ | ✅ | ❌ 未使用 |

**结论**：当前 vitest.config.ts 只用了 Vite 6/8 的通用配置，降级无需改配置。

## 验证策略

### 阶段 1：版本验证
```bash
cat node_modules/vite/package.json | grep '"version"'
cat node_modules/vitest/package.json | grep '"version"'
```
预期：Vite < 8.0.0，vitest 在 [3.2.7, 4.0.0)

### 阶段 2：关键 Suite 验证
对 5 个曾经失败的 Suite 逐个运行，确认不再报 `Flow is not supported`：
```bash
pnpm --filter mobile exec vitest run src/features/sync/SyncRehydrationManager.test.ts
pnpm --filter mobile exec vitest run src/features/sync/SyncService.test.ts
pnpm --filter mobile exec vitest run src/store/useAppStore.test.ts
pnpm --filter mobile exec vitest run src/store/migrateAsyncStorage.test.ts
pnpm --filter mobile exec vitest run src/store/storageAdapter.test.ts
```

### 阶段 3：全量回归
```bash
pnpm run test
pnpm run type-check
pnpm run lint
```

## 回滚方案

如果降级导致不可预见问题：

```bash
git checkout -- package.json pnpm-lock.yaml
pnpm install
```

或者更保守地：
```bash
git stash  # 如果在分支上工作
git checkout master
```

## 风险与缓解

| 风险 | 概率 | 影响 | 缓解 | 实际结果 |
|------|------|------|------|----------|
| vitest 3 API 差异导致测试行为变化 | 低 | 中 | 全量测试回归，对比降级前后失败清单 | ✅ 未发生 |
| Vite 6 与 Expo 54 不兼容 | 很低 | 高 | 7/22 commit 已证明 Expo 54 用 Vite 6 正常 | ✅ Vite 7 也正常 |
| lock 解析升级其他依赖 | 中 | 低 | `git diff pnpm-lock.yaml` 检查意外变更 | ✅ 无意外升级 |
| 降级后测试仍因未知原因失败 | 低 | 中 | 记录真实失败清单，作为 Batch 1 输入 | ✅ 141/1827 全通过 |

---

## 实际执行补充（2026-07-29）

### 补充决策：setup.ts 前置 mock 策略

**问题**：vitest 3 不支持对 node_modules 的 Flow 文件做类型剥离（`Stripping types is currently unsupported for files under node_modules`），导致 expo-file-system 等模块无法被 Vite SSR transform 解析。

**决策**：在 setup.ts 里**前置 mock 整个 react-native / expo 生态**，让这些模块根本不被 import。

**关键细节**：
- 必须 mock `expo-file-system` **和** `expo-file-system/legacy`（子路径独立）
- `expo-modules-core` mock 必须包含 `requireNativeModule` + `requireOptionalNativeModule`
- mock 必须在 setup.ts（`setupFiles`）中，早于任何测试文件执行

### 观察：react-native-shim.cjs alias 为死代码

`vi.mock('react-native', factory)` 优先级高于 `resolve.alias`，alias 和 shim 未被实际使用。无害，保留不改（避免范围蔓延）。
