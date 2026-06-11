# Grace Period Optimization Proposal

## Summary

Optimize the grace period (宽限期) feature across three layers: bug fixes, strategy upgrade, and visualization.

## Motivation

Current grace period implementation has several issues:
- One-click restore doesn't require actual practice (philosophically wrong)
- No monthly quota limit (unlimited grace usage)
- No distinction between normal checkin and grace checkin in data/UI
- Duplicate click risk, wrong i18n key usage, no guard in store layer
- Stats show only total count with no temporal breakdown

## Scope

### Layer 1: Bug Fixes
- Prevent duplicate restore clicks
- Use `graceNote` i18n key instead of `graceSuccess` for checkin note
- Add duplicate guard in `addGraceRecord`

### Layer 2: Strategy Upgrade
- Configurable monthly quota (0-5, default 2, 0 = disable grace)
- `CheckinEntry.grace?: boolean` field to mark grace days
- "Streak pending" UI state when streak is at risk but grace is available

### Layer 3: Visualization
- Grace checkin requires full checkin flow (not one-click)
- Quota progress bar on GracePage
- Grace history timeline
- Dashed border on heatmap for grace days
- Grace badge in checkin history
- Quota setting (0-5 slider) on GracePage

## Key Design Decisions

1. **Grace = full checkin for yesterday** — not a shortcut, but a second chance
2. **Streak strategy: Option B** — streak resets normally, UI shows "pending" state
3. **Food/water skipped** in grace mode (real-time data, not retroactive)
4. **No CheckinReflection** after grace checkin
5. **Quota 0 = disable** grace entirely
6. **Heatmap: dashed border** for grace days

## Files Changed

| File | Change |
|------|--------|
| `types/checkin.ts` | Add `grace?: boolean` to CheckinEntry |
| `types/app.ts` | Add `graceMonthlyQuota?: number` to UserProfile |
| `business/checkin.ts` | Add grace param to submitCheckinEntry |
| `business/grace.ts` | **New** — getMonthGraceCount, getRemainingGrace, isGraceAvailable |
| `store/createCheckinSlice.ts` | Pass grace through; guard addGraceRecord |
| `i18n/types.ts` + 3 lang files | 8 new keys |
| `CheckinModal.tsx` (mobile) | graceDate prop, grace mode adaptations |
| `GracePage.tsx` (mobile) | Quota check, open modal, timeline, settings |
| `HomeScreen.tsx` (mobile) | Streak pending state |
| Heatmap component | Dashed border |
| Checkin history display | Grace badge |
| `GracePage.tsx` (web) | Same as mobile |
| `CheckinModal` (web) | Same as mobile |
| `HomeTab.tsx` (web) | Streak pending |
| SQLite schema | Grace column migration |
| entityTableMap | Grace field mapping |

## Risks

- CheckinModal complexity: adding graceDate prop touches ~10 places that use `today`
- Backward compatibility: existing CheckinEntry records have no `grace` field (treated as normal)
- SQLite migration: adding column to existing checkin table
