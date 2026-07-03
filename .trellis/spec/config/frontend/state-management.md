# State Management

> Scope note for `@egoless-do/config`.

---

## Note

`packages/config` contains **no state management**. It is a tooling package:
- Shared ESLint base config
- Shared TypeScript base config

For state management patterns, see:
- `.trellis/spec/core/frontend/state-management.md` (slice factory pattern)
- `.trellis/spec/mobile/frontend/state-management.md` (mobile store composition)
