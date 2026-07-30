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
