# Quality Guidelines

> Code quality standards for the `@egoless-do/config` tooling package.

---

## Overview

`@egoless-do/config` is a **shared tooling package** — ESLint and TypeScript configs consumed by `apps/mobile` (and formerly `apps/web`, now archived).

---

## ESLint Baseline (eslint.base.js)

```js
module.exports = {
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  rules: {
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    'eqeqeq': ['error', 'smart'],
  },
};
```

### Rules Explained

| Rule | Level | Purpose |
|------|-------|---------|
| `no-unused-vars` | warn | Catches dead code; `_`-prefixed args ignored |
| `no-explicit-any` | warn | Flags `any` without blocking — nudges developers toward typing |
| `eqeqeq` (smart) | error | Always use `===`/`!==`; allows `== null` for null/undefined |

**Rule philosophy**: Warn, don't block. `no-explicit-any` is `warn` because migrating legacy code all at once is impractical.

---

## TypeScript Baseline (tsconfig.base.json)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "strict": true,
    "moduleResolution": "bundler",
    "paths": { "@egoless-do/core": ["../../packages/core/src/index.ts"] }
  }
}
```

### Key Decisions

| Option | Value | Rationale |
|--------|-------|-----------|
| `strict` | `true` | No exceptions — type safety is non-negotiable |
| `target` | `ES2020` | Modern baseline; no legacy transpilation needed |
| `moduleResolution` | `bundler` | Required for Turborepo + Metro/webpack |
| `paths` | core alias | Source-level imports of `@egoless-do/core` for fast iteration |

---

## Forbidden Patterns

- ❌ Changing `strict: false` in base — all apps must conform
- ❌ Adding per-app rules to base — keep config minimal
- ❌ Dependency on `@typescript-eslint/*` versions that drift between apps

---

## Code Review Checklist

- [ ] New ESLint rule has a clear rationale (not copied blindly)
- [ ] Rule severity is `warn` only if migration is incremental
- [ ] TS base changes don't break `tsc --noEmit` in any app
- [ ] No app-specific overrides in base config
