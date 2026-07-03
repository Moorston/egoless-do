# Directory Structure

> How the `@egoless-do/config` tooling package is organized.

---

## Overview

`packages/config` is **tooling only** — no application code, no components, no hooks. It ships shared ESLint and TypeScript base configs for the monorepo.

---

## Package Layout

```
packages/config/
├── package.json          # name: @egoless-do/config
├── eslint.base.js        # Shared ESLint config (CommonJS)
└── tsconfig.base.json    # Shared TypeScript base config
```

---

## Module Responsibilities

| File | Purpose | Imported by |
|------|---------|-------------|
| `eslint.base.js` | Base ESLint rules (TS parser, no-explicit-any warn, eqeqeq) | Apps extend via `eslintConfig.extends` |
| `tsconfig.base.json` | Base compiler options (strict, ES2020, bundler resolution) | Apps extend via `tsconfig.extends` |

---

## Usage Pattern

Apps extend the shared base:

```js
// apps/mobile/tsconfig.json
{
  "extends": "@egoless-do/config/tsconfig.base.json",
  "compilerOptions": { /* app-specific overrides */ }
}
```

---

## Forbidden Patterns

- ❌ Adding app-specific ESLint rules here — only cross-cutting baseline rules
- ❌ Changing strict mode defaults per-app — keep the shared bar high
- ❌ Adding `dependencies` — config package should be devDependencies only

---

## Examples

- `eslint.base.js` — minimal, opinionated baseline
- `tsconfig.base.json` — strict mode + bundler resolution + `@egoless-do/core` path alias
