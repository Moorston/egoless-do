# Hook Guidelines

> Not applicable to `packages/core`.

---

## Note

`packages/core` contains **no React hooks** (no `useState`, `useEffect`, etc.). Hooks are platform-specific and live in:
- `apps/mobile/src/features/*/use<Service>.ts` — feature hooks (e.g., `useBreathAudio`)
- `apps/mobile/src/navigation/hooks.ts` — navigation hooks
- `apps/web/src/hooks/` (deprecated)

Core exports **pure functions** that hooks may call:
- `business/breathing.ts` → `cycleDuration`, `phaseLabelKey`
- `utils/dateStr` → date formatting
- `business/fasting.ts` → fasting calculations

For hook patterns, see:
- `.trellis/spec/mobile/frontend/hook-guidelines.md`
