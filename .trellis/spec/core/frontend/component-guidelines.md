# Component Guidelines

> Not applicable to `packages/core`.

---

## Note

`packages/core` contains **no React components**. All component code lives in:
- `apps/mobile/src/components/` (shared mobile UI)
- `apps/mobile/src/features/*/components/` (feature-specific mobile UI)
- `_archive/web-legacy/src/components/` (archived)

Core exports only **pure primitives** that components consume:
- i18n `t()` function + `I18nKey` type
- `FONT_*` typography tokens
- Typed icon keys
- Slice state (via store factories)

For component patterns, see:
- `.trellis/spec/mobile/frontend/component-guidelines.md`
