# Quality Guidelines

> Code quality standards for `@egoless-do/core`.

---

## Overview

Core is the **sole source of truth**. Quality here affects mobile, web, and any future platform. Core must stay pure — no platform imports, no impure globals.

---

## Forbidden Patterns

### Purity / Side Effects
- ❌ React/RN imports (`react`, `react-native`, `expo-*`)
- ❌ Direct DOM/window/document access
- ❌ Direct Date.now() or Math.random() in pure functions (pass as parameter for testability)
- ❌ Mutating function arguments — return new copies

### Architecture
- ❌ Business logic in slice files — delegate to `business/`
- ❌ Importing from `apps/` — core is consumed by apps, never imports them
- ❌ Circular imports between business modules — restructure to break the cycle

### General
- ❌ `any` type — use `unknown` and narrow
- ❌ `@ts-ignore` without a documenting comment
- ❌ Unused exports — core's public surface is small

---

## Required Patterns

### Pure Functions in business/

```ts
// business/breathing.ts — pure, no deps
export function cycleDuration(preset: BreathingPreset): number {
  return preset.phases.reduce((s, p) => s + p.durationSec, 0);
}
```

Rules:
- Same input → same output, no side effects
- Co-located `*.test.ts` for non-trivial logic

### Slice Factories

```ts
// store/createHabitSlice.ts
export function createHabitSlice(
  adapter: StorageAdapter,
  onSync?: () => void,
): SliceCreator<HabitSlice> {
  return (set, get) => ({
    addHabit(form) {
      const newHabit = createHabitFromForm(form);
      set(s => ({ habits: [...s.habits, newHabit] }));
      adapter.persistChange('habit', newHabit.id, newHabit).catch(e => log.error(e));
      onSync?.();
    },
  });
}
```

Rules:
- Slices own state, delegate logic to `business/`
- Always persist via `adapter.persistChange`
- Always trigger sync callback after mutation

### Conflict Resolution

Pure and testable:

```ts
// sync/conflict.ts — no I/O, no Date.now(), deterministic
export function resolveConflict({ clientUpdated, serverUpdated }): ConflictResult {
  return { winner: clientUpdated > serverUpdated ? 'client' : 'server' };
}
```

---

## Testing

Co-located unit tests (`.test.ts`) encouraged for:
- `business/` pure functions
- `sync/` conflict resolution
- `store/` slice state transitions (complex ones only)

Don't test trivial getters/setters — focus on branching logic.

### Coverage Ratchet（`vitest.coverage.config.ts`，2026-11-20 建制）

独立分包 coverage 配置（与主 vitest.config.ts 分离，`root: __dirname` + setupFiles 绝对路径），跑法：

```bash
pnpm exec vitest run --coverage --config packages/core/vitest.coverage.config.ts
```

- 阈值（实测起步）：**63.69**（statements/lines，826 测试分包口径）——只升不降，上调随覆盖扩张同步走，下调需理由（删死代码/重定义分母/结构性重构）
- thresholds 只锁 statements/lines：v8 provider all-mode 对未加载文件只有 statements 计数，branches/functions 分母随测试加载面漂移，锁它们会惩罚良性测试覆盖扩张
- 分母契约：`include: ['src/**/*.{ts,tsx}']` 排除测试/d.ts/dist/node_modules——scripts 噪声不进分母
- 制度级总纲（lint/complexity 只降 + coverage 只升三 ratchet 联动）见 `.trellis/spec/governance/GLOBAL-CODE-STANDARDS.md` §9

---

## Code Review Checklist

- [ ] No platform imports (React/RN/Expo/DOM)
- [ ] Business logic in `business/` (not in slices)
- [ ] All slice mutations call `adapter.persistChange`
- [ ] Conflict resolution stays pure and tested
- [ ] No `any` types
- [ ] Logger tags are meaningful and stable

---

## Examples

- `business/breathing.ts` — pure constants + reducer
- `sync/conflict.ts` — pure conflict resolution with test
- `store/createHabitSlice.ts` — slice factory delegating to business
