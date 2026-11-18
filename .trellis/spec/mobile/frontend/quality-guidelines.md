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

### Lint Ratchet（`apps/mobile/package.json` lint 脚本）

`--max-warnings` ratchet 当前为 **0**（2026-11-18 下调，实测值）。历史：13（11-17）→ 0。13 个 warning 的清除分两步：child 1（sync 测试 describe 平铺 + SleepHistoryPage mkStyles + import/order，13→8）、child 2（8 个无测试 screen 保守拆分 max-lines-per-function 8→0）。

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
