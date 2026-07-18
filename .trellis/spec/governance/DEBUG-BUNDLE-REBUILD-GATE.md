# Debug Governance — Bundle Rebuild Verification Gate

## Context

iOS dev bundle (Hermes bytecode) is cached based on Babel **output**, not source content. Comments, whitespace, and file timestamps do NOT trigger rebuild. Multiple debug attempts failed because Metro kept serving stale bundles.

## Rule

**BG-001: Verify bundle rebuild before trusting iOS error results.**

After modifying source code:

1. Trigger Metro reload (device shake → Reload, or CLI `r`)
2. Capture the error stack frame byte offset (e.g. `BodyScreen.bundle:320274:66`)
3. **If offset is unchanged** → bundle was NOT rebuilt. iOS is exercising OLD code. All test results are invalid.
4. To force rebuild: add/alter a real JS expression (`const _FORCE = 1;`) that changes Babel output.
5. **Only compare test results across commits with DIFFERENT offsets.**

## Rationale

| Symptom | Misinterpretation | Reality |
|---------|------------------|---------|
| Error persists across many commits | "Fixes don't work" | Bundle never rebuilt |
| Stack offset identical | "Same bug" | Cached bundle served |
| Comment/touch changes nothing | "Metro broken" | Babel output unchanged |

## Examples

- `BodyDashboard.tsx` error at offset 320274 persisted across 5 commits with only comment changes — all 5 tests invalid.
- Adding `const _FB = Date.now()` shifted offset to 320275 — confirmed bundle rebuild required expression-level changes.

## Related

- Skill: `trellis:break-loop` — use when iOS error persists across multiple commits
- Memory: `metro-ios-bundle-cache.md`
