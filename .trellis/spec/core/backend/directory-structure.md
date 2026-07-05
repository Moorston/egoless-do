# Directory Structure

> How the `@egoless-do/core` package is organized (platform-agnostic business logic).

---

## Overview

`packages/core/src/` is the **sole source of truth** for business logic, types, shared state slices, sync protocol, and utilities. Both `apps/mobile/` (and previously `apps/web/`, now archived) import from here.

Core must remain **platform-agnostic** — no React, no React Native, no DOM APIs. Pure TypeScript only.

---

## Directory Layout

```
packages/core/src/
├── index.ts            # Public re-exports
├── logger.ts           # createLogger() factory
├── i18n/               # i18n keys (I18nKey type), translation data
├── i18n.ts             # t() translation function
├── icons.ts            # Icon key types (TabIconKey, FeatureIconKey, etc.)
├── typography.ts       # FONT_* size tokens
├── types.ts            # Re-exports all types + StorageAdapter, SyncEntity
├── types/              # Domain entity types (Habit, Reflection, Plan, ...)
├── constants/          # Domain-specific constants (music categories, etc.)
├── constants.ts        # Global constants (theme keys, sport types, ...)
├── business/           # Pure business functions (habits, checkin, fasting, ...)
│   ├── habits.ts
│   ├── checkin.ts
│   ├── breathing.ts    # presets, cycleDuration, phaseLabelKey
│   ├── fasting.ts
│   ├── reflections.ts
│   └── *.test.ts       # Co-located unit tests
├── store/              # Zustand slice factories
│   ├── createHabitSlice.ts
│   ├── createAuthSlice.ts
│   ├── storageAdapter.ts  # StorageAdapter interface
│   ├── sliceHelper.ts     # SliceCreator type alias
│   └── ...
├── sync/               # Sync protocol (conflict resolution, merge, schemas)
│   ├── conflict.ts     # resolveConflict() — pure conflict resolution logic
│   ├── merge.ts
│   ├── types.ts
│   └── entitySchemas.ts  # Zod schemas for entity validation
├── data/               # DataGateway interface + entity registry
│   ├── DataGateway.ts  # Platform-agnostic data access abstraction
│   └── entityRegistry.ts
├── ai/                 # AI service + RAG engine
│   ├── index.ts
│   ├── local-engine.ts
│   ├── rag/            # RAG retriever + indexer + prompt builder
│   └── ...
├── utils/              # Pure utility functions
│   ├── index.ts
│   ├── transform.ts
│   └── date helpers
└── push.ts             # Push notification helpers (platform calls go through adapter)
```

---

## Module Organization

| Directory | Responsibility | Test files |
|-----------|---------------|------------|
| `business/` | Pure functions, domain rules, calculations | Co-located `*.test.ts` |
| `store/` | Zustand slice factories (createXxxSlice) | Co-located `*.test.ts` for complex slices |
| `sync/` | Conflict resolution, merge logic, validation schemas | Co-located `*.test.ts` |
| `data/` | Abstract DataGateway interface, entity metadata | — |
| `ai/` | AI model orchestration, RAG pipeline | — |
| `i18n/`, `icons.ts`, `typography.ts` | Shared frontend primitives | — |

---

## Naming Conventions

- **Slice factories**: `createXxxSlice(adapter, callbacks)` → returns `SliceCreator<XxxSlice>`
- **Pure business files**: domain name (`habits.ts`, `checkin.ts`, `breathing.ts`)
- **Test files**: co-located `xxx.test.ts` (not `__tests__/` subdir for src; reserved for root-level tests)
- **Types**: Each entity gets its own file in `types/` (e.g., `types/habit.ts`)

**Forbidden patterns**:
- ❌ React imports in core (no `useState`, `useEffect`, etc.)
- ❌ Platform-specific APIs (`AsyncStorage`, `expo-*`, `window`, `document`)
- ❌ Business logic in slice factories — delegate to `business/` pure functions

---

## Examples

- `business/breathing.ts` — pure constants + functions (BREATHING_PRESETS, cycleDuration)
- `store/createHabitSlice.ts` — slice factory wiring business + persistence
- `sync/conflict.ts` — pure conflict resolution (`resolveConflict`)
- `data/DataGateway.ts` — platform-agnostic data interface
