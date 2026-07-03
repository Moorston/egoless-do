# Type Safety

> Type safety patterns in `@egoless-do/config`.

---

## Overview

`@egoless-do/config` defines the **monorepo-wide TypeScript baseline** via `tsconfig.base.json`. Type safety is enforced by:
1. `strict: true` in shared tsconfig
2. `@typescript-eslint/no-explicit-any: warn` in shared ESLint

---

## Strict Mode

The shared base enables `strict: true`, which implies:
- `strictNullChecks`
- `noImplicitAny`
- `noImplicitThis`
- `alwaysStrict`
- `strictBindCallApply`
- `strictPropertyInitialization`
- `strictFunctionTypes`
- `useUnknownInCatchVariables`

**Rule**: All apps must compile under strict mode. No exceptions.

---

## The `allow-any` Philosophy

`@typescript-eslint/no-explicit-any` is set to `warn`, not `error`. Migration strategy:
- New code should avoid `any`
- Legacy `any` gets a warning — fix opportunistically
- Don't suppress with `@ts-ignore` — use `unknown` + narrowing

---

## Forbidden Patterns

- ❌ `strict: false` in any tsconfig
- ❌ `@ts-ignore` / `@ts-expect-error` without a comment explaining why
- ❌ Turning off `noImplicitAny`

---

## Examples

- `tsconfig.base.json` — `strict: true` baseline
- `eslint.base.js` — `no-explicit-any: warn`
- `packages/core/src/` — consumer: all code must satisfy strict
