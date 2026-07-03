# Directory Structure

> How frontend code is organized in this project.

---

## Overview

This is a React Native + Expo mobile app. Code lives under `apps/mobile/src/` with a feature-based modular structure. Each feature module is self-contained; shared code lives in `components/`, `store/`, and `packages/core`.

---

## Directory Layout

```
apps/mobile/src/
├── features/                 # 25+ feature modules (screens + components + hooks)
│   ├── breathing/
│   │   ├── BreathingScreen.tsx
│   │   ├── useBreathAudio.ts
│   │   └── ...
│   ├── exercise/
│   │   ├── ExerciseScreen.tsx
│   │   ├── layouts/          # Layout variants (EnduranceActive, etc.)
│   │   ├── pages/            # Sub-pages (ReportPage, etc.)
│   │   └── shared/           # Shared within feature
│   ├── reflections/
│   │   ├── core/
│   │   ├── insights/
│   │   ├── review/
│   │   ├── timeline/
│   │   └── trails/
│   ├── plan/
│   │   ├── components/       # Reusable plan UI
│   │   └── screens/
│   └── ...
├── components/               # Cross-feature shared UI components
│   ├── ErrorBoundary.tsx
│   ├── UI.tsx                # Theme, design tokens, i18n helpers
│   ├── VirtualList.tsx
│   └── ...
├── store/                    # Mobile Zustand store + persistence middleware
│   ├── useAppStore.ts        # Composes slices from @egoless-do/core
│   ├── createMobileUiSlice.ts
│   ├── storageAdapter.ts     # SQLite-backed mutation adapter
│   └── secureAuth.ts
├── db/                       # SQLite schema + syncQueue
├── net/                      # Offline-aware network layer
├── navigation/               # React Navigation config + typed hooks
│   ├── hooks.ts              # useRootNavigation, useTabNavigation
│   └── index.tsx
└── i18n/                     # i18next initialization
```

---

## Module Organization

Each `features/<name>/` module should be self-contained:

| Subdirectory | Purpose |
|---|---|
| `screens/` | Top-level screens (rare — most screens sit at feature root) |
| `components/` | Components used only within this feature |
| `shared/` | Shared hooks/styles/feature-internal API |
| `layouts/` | Screen layout variants |
| `pages/` | Sub-pages navigated to from the main screen |
| `services/` | Side-effect services (audio, API, storage) |

A feature module typically exports:
- `ScreenName.tsx` — default-exported screen component (registered in navigation)
- `use<Service>.ts` — custom hooks for the feature

---

## Naming Conventions

- **Screens**: `XxxScreen.tsx` (e.g., `BreathingScreen.tsx`)
- **Feature directories**: kebab-case (e.g., `global-pulse`, `thought-trail`)
- **Components**: PascalCase (e.g., `ReflectionCard.tsx`)
- **Hooks**: `useXxx` (e.g., `useBreathAudio.ts`)
- **Types**: from `@egoless-do/core`; mobile rarely defines its own business types

**Forbidden patterns**:
- ❌ `utils/` directory — use `services/` or move hooks elsewhere
- ❌ Generic names like `helpers/`, `misc/`, `temp/`
- ❌ Business logic outside slices or feature services

---

## Examples

Well-structured feature modules to reference:
- `features/breathing/` — single screen + audio hook pattern
- `features/reflections/` — complex multi-subdirectory feature (being decomposed)
- `components/` — cross-feature shared UI
