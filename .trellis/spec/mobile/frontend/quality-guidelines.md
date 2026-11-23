# Quality Guidelines

> Code quality standards for the mobile app frontend.

---

## Overview

Quality rules follow from `CLAUDE.md` and these additional mobile-specific conventions. Sub-agent `trellis-check` will validate these guidelines for every task.

---

## Forbidden Patterns

### Architecture
- ❌ Business logic in screens — move to slice actions or `@egoless-do/core`
- ❌ Cross-feature imports that bypass `components/` — shared UI must be reusable
- ❌ Direct SQLite writes outside `apps/mobile/src/db/` and slices
- ❌ Storing auth tokens in AsyncStorage — always `expo-secure-store`

### React / RN
- ❌ `any` type — use `unknown` and narrow, or move type to `@egoless-do/core`
- ❌ `as` cast for coercion — use runtime validation (Zod) for external data
- ❌ Side effects in render body — wrap in `useEffect` / event handlers
- ❌ Mutating state directly (`state.arr.push(x)`) — always return new reference

### i18n / Theming
- ❌ Hardcoded user-facing strings — always `t('key')`
- ❌ Hardcoded colors/font sizes — use `THEMES[...]` and `FONT_*` from `@egoless-do/core`
- ❌ `StyleSheet.create` outside `components/` unless the style is genuinely screen-local

### Data / Sync
- ❌ Storing entity data in React state only — always route through `adapter.persistChange`
- ❌ Skipping `useShallow` when selecting from `useAppStore`
- ❌ Passing stale closures into callbacks — use `useRef` for current value

---

## Required Patterns

### Store Reads
```tsx
// Always use useShallow with explicit picks
const { theme, language } = useAppStore(useShallow(s => ({
  theme: s.theme,
  language: s.language,
})));
```

### Slice Actions
```tsx
// Always persist via adapter
await adapter.persistChange('entity', id, data);
// trigger sync via callback (do NOT import sync service directly)
triggerAutoSync();
```

### AsyncStorage Native Module Fallback
```ts
// When AsyncStorage native module may be unavailable (Expo Go),
// use safeAsyncStorage wrapper which falls back to in-memory Map.
import { safeGetItem, safeSetItem, safeMultiGet } from '../../store/safeAsyncStorage';

await safeGetItem('key');        // → string | null
await safeSetItem('key', 'val'); // silently falls back to memory
await safeMultiGet([...keys]);   // → Array<[string, string | null]>
```

### Error Logging
```tsx
import { createLogger } from '@egoless-do/core';
const log = createLogger('FeatureName');  // component or feature name
log.warn('recoverable issue', data);
log.error(err, { message: 'failure context' });
```

### Complexity Thresholds (ESLint `complexity` ≤15)

Project ESLint config does not enforce `complexity` by default — it only triggers when explicitly configured (e.g. `--rule '{"complexity": ["warn", 1]}'`). The team convention is:

- **Screen/feature components**: target complexity ≤15 for the main exported function
- **When exceeded**: extract sub-components via move-only (see component-guidelines "Splitting a monolithic screen component")
- **Presentational sub-components** MAY exceed 15 (inherent conditional rendering) — annotate with `// eslint-disable-next-line max-lines-per-function` if also >300 lines
- **Custom hooks**: same ≤15 target; when exceeded, split into composition root + sub-hooks (see hook-guidelines "Splitting a monolithic hook")

> When lint is clean under default config but a function is known to exceed 15, it is NOT a pass — run the explicit `--rule` check during refactoring tasks to verify the target is met.

### Risk-Tiered Complexity Exemption（≤40，2026-11-20）

For **error-handling state machines** — functions whose branch density IS the safety semantics (multi-layer retry / conflict / kicked-out / fallback ladders), not accidental complexity — the target is **≤40** instead of ≤15. The density is intrinsic: each branch is a distinct recovery path; merging or scattering them trades readability for risk.

**Applicability** (all must hold):
- The function is a single cohesive safety responsibility (one invariant family, e.g. "push batch with retry ladder")
- It is guarded by tests (characterization or direct unit tests on the failure branches)
- The ≤15 extraction work has already been done for the separable semantic units (the residual is what cannot move without scattering the state machine)

**Current exemption list** (verify with `pnpm exec eslint <file> --rule '{"complexity": ["warn", 15]}'`):
- `apps/mobile/src/features/sync/SyncEngine.ts` `executePush` — 37 (2026-11-20: 54 → 37 after extracting PushConflictResolver; residual = batch loop × retry backoff × kicked-out × markSynced × post-push pull ladder, guarded by SyncEngine.test.ts + PushConflictResolver.test.ts)

This is a **documented, re-verified exemption** — not an eslint-disable carve-out (see 无测试 Screen 保守拆分模式 rule 6: disabling is never the answer). Every exemption entry must cite the extraction already done and its guarding tests; a new entry requires the same evidence.

### Sync Apply Failure Semantics（增量 pull 失败语义契约，2026-11-24）

增量 pull 路径（SSE realtime / fallback polling）的 apply 失败语义三契约（`sync-apply-failure-semantics`，修复前的两个数据完整性缺陷见 changelog 2026-11-24）：

1. **失败实体不推进水位线（全有或全无）**：`applyServerChanges` 返回 `{ patch, failedEntities }`——`failedEntities` 非空时，消费方（`SyncEngine.connectRealtime` 的 onServerTime 包装）MUST NOT 调用 `setLastSyncAt`/`saveLastSyncAt`。失败实体保持旧水位线 → 下次增量 pull 重拉。成功实体的数据已生效（不回滚），只是被幂等地重复拉取。钟差校准（`updateClockOffset`）不受 apply 结果影响。
2. **写库失败的行不进 store patch**：`applyEntityToTable` 只有写库成功（UPDATE changes>0 / INSERT / UNIQUE-retry UPDATE changes>0）的行才进 `applied`/`storeMapped`。UPDATE 失败是**错误结果**（`UpdateOutcome` 判别联合 `{ changes } | { changes: 0, failed: true }`），不得误诊为行不存在走 INSERT fallback。
3. **失败信息走独立通道**：`failedEntities` 是返回值的显式字段，MUST NOT 作为 patch 字段（legacy `_failedEntities` 曾直漏 Zustand 顶层 state）泄漏给 change handler。

行级失败上升为实体失败（`escalateRowFailures` 纯函数）：行写失败与实体 throw 在水位线语义上同级——同进 `failedEntities`、同受 D1 守卫。

**护航测试**：`SyncApplyService.test.ts`（R1/R3 + R2 fixed semantics 用例）、`SyncEngine.test.ts`（onServerTime wrapper D1 guard ×3）、`SyncRealtimeController.test.ts`（failedEntities 透传 + patch 干净）。改动失败语义时这三组用例必须同步翻转。

**The trap this prevents**: 修复前 `patch._failedEntities` 混进返回值 + `onServerTime` 无条件推 `Math.max(lastSyncAt, serverTime)` → 失败实体的变更 `updated_at < 新 lastSyncAt` 被增量 pull 永久跳过（永久数据洞）；写失败行照样进 `applied` → store 有、SQLite 无 → rehydrate 后数据"闪现后丢失"。同库的 initialSync 对同类洞早有显式防护（"NEVER mark initialSyncDone while any failed"）——增量路径必须有等价防护。

### CC 落点诊断先行（选拆法前必跑分，2026-11-21）

对超标函数选拆法之前，先用显式 `--rule` 跑分确认 **CC 落在哪个函数**——ESLint 报告是按函数分账的，`useState` lazy initializer、`useCallback`、内联 submit 箭头函数都是**独立函数**，其内部分支不计入主函数 CC。

**The instance that bit**: CheckinModal 设计期判断"lazy initializer + submit 装配抽纯函数即可治主函数 42"——跑分实证主函数 42 全在 render JSX 的三元/&&/??（initializer 与 submit 在独立回调内，本就不贡献），纯函数提取治 submit 21 但主函数纹丝不动，被迫回 Plan 修正拆法（改走 section 子组件）。**教训：先跑分看 CC 分账，再决定拆法**——落点在 render JSX → section 子组件（component-guidelines "Splitting"）；落点在数据装配 → 纯函数提取；落点在同构拷贝 → 参数化收敛。

### 三胞胎参数化模式（同构 JSX 收敛，2026-11-21）

同一段 JSX 结构复制 N 份、仅少数字段/样式/行为差异（QuickCreateTrailScreen 的 3 个 dropdown ≈ 36 CC）时，拆分不减少 CC 总量——**参数化收敛才治本**：抽一个显式 props 的参数化组件（`FilterDropdown`：`itemStyle` 三态 / `scrollable` 两容器 / `onClear` 可选 / `activeColor` 差异），每个差异点成为显式 prop，N 份拷贝变 N 个调用点。样式 key 同名不同值（`checkbox` vs `checkboxMood`）**逐字保留不合并**——合并是行为变更。互斥开闭状态收敛单枚举（`'time'|'tags'|'moods'|null`）替代 N 个独立 boolean。

### Async-extraction fast-path trap（2026-11-20）

When extracting a synchronous code segment into an `async` method for complexity relief, check whether the caller's correctness depends on the segment being **synchronous** — if so, the extraction introduces an await boundary that silently widens a race window.

**The instance that bit**: `SyncEngine.runSync`'s token check was extracted to `await this.ensureSyncToken()`. The original fast path (token present + far from expiry) ran from entry to `_syncing = true` with **zero awaits**, so a concurrent second `runSync()` always saw `_syncing === true` and deferred. The extraction's `await` yielded a microtask on the fast path too — the second caller slipped through the `_syncing === false` window and both syncs ran (caught by `SyncService.test > skips when already syncing`, pinned via drainQueue call count).

**Rule**: when a caller's guard flag (`_syncing`-style dedup / lock acquisition) is set AFTER the extracted segment, keep a synchronous fast path in the caller (e.g. `if (!token || this.isTokenNearExpiry()) { ...await slow path... }` — the guard-setting sequence stays synchronous when the common case needs no async work), and pin it with a concurrent-caller test.

### Lint Ratchet（`apps/mobile/package.json` lint 脚本）

`--max-warnings` ratchet 当前为 **0**（2026-11-18 下调，实测值）。历史：13（11-17）→ 0。13 个 warning 的清除分两步：child 1（sync 测试 describe 平铺 + SleepHistoryPage mkStyles + import/order，13→8）、child 2（8 个无测试 screen 保守拆分 max-lines-per-function 8→0）。

### Complexity Ratchet（`lint:complexity` 脚本，双包）

主 lint 不启用 `complexity` 规则（团队约定 ≤15 默认不跑）——`lint:complexity` 脚本用**独立 config 文件**（`.eslintrc.complexity.js`，extends 主 config + `complexity: ['warn', 15]`）显式启用，避开 npm script 内联 `--rule` JSON 的 Windows 引号转义问题：

| 包 | 脚本 | 阈值（2026-11-20 实测起步） | 构成 |
|----|------|---------------------------|------|
| mobile | `pnpm --filter mobile lint:complexity` | **53** | 纯 complexity（主 lint ratchet=0）；历史：59（11-20 起步前）→ 56（ReviewAIPanel 拆分 −1 + PlanCreateScreen 豁免注解 −2）→ 53（11-21 complexity-oversize-cleanup：QuickCreateTrailScreen 63 + CheckinModal 42/21 三项拆至 ≤15，56−3 纯减法） |
| core | `pnpm --filter @egoless-do/core lint:complexity` | **37** | 32 complexity 存量 + 5 既有 no-unsafe ratchet 残差（复杂度 config 继承全部规则，跑分含残差）；core 残差清零时同步下调 |

**心智模型**：与 lint ratchet 完全对称——阈值=实测起步，**只降不升**（方向与 coverage ratchet 的只升不降相反）。存量不是清零承诺：core 32 个与其余 mobile 53 个继续存在，ratchet 只防新增；治理走显式 `--rule` 实测 + 逐波拆分任务（如 11-19 sync-engine-complexity）。

### Coverage Ratchet（`test:coverage` 脚本，双包）

与主 vitest.config.ts 分离的独立 `vitest.coverage.config.ts`（`root: __dirname` + setupFiles 绝对路径 + 分母契约 `include: ['src/**/*.{ts,tsx}']` 排除测试/d.ts/dist/node_modules）。跑法 `pnpm --filter mobile test:coverage`（CI 走 `--config apps/mobile/vitest.coverage.config.ts`）。

- 阈值（2026-11-20 实测起步）：**4.62**（statements/lines，826→445 测试的分包口径）——**结构性基线**：受 Known Test Environment Limitations（lucide transform 失败、@testing-library 不可用）压制，提升走测试基建任务非 ratchet
- thresholds **只锁 statements/lines**：v8 provider all-mode 对未加载文件只有 statements 计数，branches/functions 分母随测试加载面漂移（新增测试 import 新文件 → 分母突增 → 误报降级）；两口径仍进报告只是不设门禁
- **方向与 lint ratchet 相反**：覆盖率只能升（阈值上调=好），下调需理由（删死代码/重定义分母/结构性重构）
- 制度级总纲见 `.trellis/spec/governance/GLOBAL-CODE-STANDARDS.md` §9 质量门禁联动

### Presentational Complexity 豁免注解（complexity 维度）

`Presentational sub-components` MAY exceed 15（上述 Complexity Thresholds 条款）的落地机制：函数声明前加注解 + 理由：

```tsx
// 表单固有分支：字段错误显隐 ×N + frequency 多 mode 切换；presentational 组件
// 无进一步可拆语义单元（quality-guidelines presentational 豁免条款）
// eslint-disable-next-line complexity
function PlanBasicInfoCard(...) {
```

- 注解只在 `lint:complexity` 下生效（主 lint 未启用 complexity，ESLint 8.57 默认不报 unused disable）——机制成立依赖双脚本并存
- 理由必须写明"固有分支"来源与"无进一步可拆语义单元"判断
- **登记清单**（新增须同步）：`PlanCreateScreen.tsx` PlanBasicInfoCard（22）/ PlanItemEditor（30）
- 与 Risk-Tiered Complexity Exemption 的区别：presentational 豁免 = 表单/渲染固有分支（注解消除 warning）；risk-tier 豁免 = 错误处理状态机固有密度（保留 warning，文档化 + 重验证）

### 无测试 Screen 保守拆分模式（策略 C，2026-11-18）

8 个无 co-located 测试的 screen（324-673 行）按此模式收敛到 max-lines-per-function ≤300，零行为变更：

1. **优先级**：inline style/StyleSheet 提取到模块级 → 大 JSX 块抽同文件模块级子组件 → handler 提升为具名函数/useCallback
2. **统一类型别名**：`type ThemeTokens = ReturnType<typeof useTheme>; type TranslateFn = ReturnType<typeof useT>;`（子组件 props 用）
3. **子组件 TH/T/P 经 props 传递**；受控输入传 value + setter props；跨多状态 handler 留在主组件，子组件只收 callback
4. **大块拆两层**：~300 行的列表项块拆为 Card（header + wrapper + delete）+ Editor（fields），避免子组件自身贴 300 上限
5. **禁止** eslint-disable carve-out 代替拆分；拆不动即停（设计降级条款留给人工决策）

---

## Testing

Unit testing infrastructure is sparse in this project (see CLAUDE.md — 6 pre-existing test failures). When adding tests:
- Prefer testing pure functions from `@egoless-do/core`
- Test slice actions' state transitions, not React components
- Mock `StorageAdapter` for entity mutation tests
- Extract component logic to pure functions (see `features/sleep/sleepSummaryLogic.ts` for pattern)

### Known Test Environment Limitations

- **lucide-react-native**: Flow-typed source fails vitest transform (`Unexpected token 'typeof'`). Must mock with `vi.mock('lucide-react-native', ...)` OR test pure logic without rendering the component.
- **@testing-library/react-native**: loads lucide-react-native internally — also fails in current env.
- **Workaround**: Extract logic to `*.ts` modules and unit test those; defer component rendering tests until RN test infra is configured.

**Reference:** `features/sleep/sleepSummaryLogic.test.ts` (pure-logic test pattern)

---

## Pre-commit Checklist

Before reporting a task complete:
- [ ] `npx tsc --noEmit` passes (no new type errors)
- [ ] `npx eslint apps/mobile/` passes (no new lint errors)
- [ ] No `console.log` left in production code — use `log.debug` / `log.warn`
- [ ] All user-facing strings use `t()` — grep for hardcoded Chinese/English in JSX
- [ ] New slices/actions route through `adapter.persistChange`
- [ ] No new `any` types added — use `unknown` + narrowing
- [ ] Store selection uses `useShallow`

## Common Mistakes

### Missing `scaleFontSize` Import
当文件中使用 `scaleFontSize()` 时必须从 `@egoless-do/core` 导入。style 迁移批量操作容易遗漏：

```tsx
// ❌ 错误：使用 scaleFontSize() 但未导入
fontSize: scaleFontSize(32),

// ✅ 正确：从 @egoless-do/core 导入
import { FONT_BODY, scaleFontSize } from '@egoless-do/core';
fontSize: scaleFontSize(32),
```

> ⚠️ `scaleFontSize` 是运行时函数（非类型），不能用 `import type` 导入。

### Text Strings Must Be Rendered Within Text Component
React Native 要求所有在 `<Text>` 组件中渲染的值必须是字符串类型。数字、对象等非字符串值会导致 "Text strings must be rendered within a Text component" 错误。

```tsx
// ❌ 错误：直接渲染数字
<Text>{count}</Text>
<Text>{item.value}</Text>

// ✅ 正确：使用 String() 转换
<Text>{String(count)}</Text>
<Text>{String(item.value)}</Text>

// ✅ 正确：使用模板字面量
<Text>{`${count}`}</Text>
<Text>{`${item.value}`}</Text>
```

> ⚠️ 批量修复时容易遗漏，使用 `String()` 或模板字面量确保所有值都是字符串类型。

---

## Code Review Checklist

Reviewers should check:
1. New code uses `@egoless-do/core` types/utilities — no re-implementation
2. Entity mutations always call `adapter.persistChange`
3. UI components consume `useTheme()` / `useT()` — no hardcoded strings
4. `useAppStore` selectors use `useShallow` — no full-store subscription
5. Error logging uses `createLogger` context (feature name)
6. Side effects are in `useEffect` or handlers — not render body
