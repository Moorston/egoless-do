# Directory Structure

> Platform-agnostic frontend code in `@egoless-do/core`.

---

## Overview

The "frontend" spec for `packages/core` covers the **platform-agnostic primitives** consumed by mobile and web UI:
- i18n types and translation function
- Typography tokens (FONT_*)
- Icon keys
- Slice factories (state) — shared across platforms
- Pure business helpers that screens rely on

Core has **no React components** — those live in `apps/*/components/`. Core only exports reusable, testable primitives.

---

## Directory Layout

```
packages/core/src/
├── index.ts            # Public barrel
├── i18n.ts             # t(key, language) translation function
├── i18n/
│   └── types.ts        # I18nKeys interface, I18nKey type
├── typography.ts       # FONT_TITLE, FONT_BODY, FONT_HERO, ...
├── icons.ts            # TabIconKey, FeatureIconKey, ActionIconKey
├── types.ts            # Re-exports + StorageAdapter, SyncEntity
├── types/              # Domain types exported to consumers
├── constants.ts        # Design tokens: THEMES keys, sport types, ...
├── business/           # Pure domain functions (cycleDuration, date helpers, ...)
├── store/              # Slice factories: createHabitSlice, createAuthSlice, ...
└── utils/              # Pure utilities (dateStr, transform, ...)
```

---

## Module Responsibilities

| Module | Consumed by | Purpose |
|--------|-------------|---------|
| `i18n.ts` + `types.ts` | All screens | Typed translation; never hardcode strings |
| `typography.ts` | All screens | Single source of font sizes |
| `icons.ts` | Navigation, headers | Typed icon key union types |
| `business/*` | Slices & screens | Domain-specific pure calculations |
| `store/*slice.ts` | App Zustand stores | Reusable slice factories |

---

## Naming Conventions

- Export types with domain name: `BreathPhaseType`, `GuideStyle`, `CreateHabitForm`
- i18n keys: `breathBoxName`, `habitAddTitle` — kebab or camelCase as in existing language files
- Font tokens: PascalCase `FONT_TITLE`, `FONT_BODY`, `FONT_HERO`

**Forbidden patterns**:
- ❌ React imports in core
- ❌ Duplicating mobile-only logic here — keep platform-specific code in apps

---

## Examples

- `typography.ts` — exports 8 font size tokens
- `i18n/types.ts` — 1053-line exhaustive key map
- `business/breathing.ts` — BREATHING_PRESETS + cycleDuration()
