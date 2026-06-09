# Grace Period Optimization — Tasks

## Phase 1: Data Layer

- [ ] 1.1 Add `grace?: boolean` to `CheckinEntry` in `types/checkin.ts`
- [ ] 1.2 Add `graceMonthlyQuota?: number` to `UserProfile` in `types/app.ts`
- [ ] 1.3 Create `business/grace.ts` with getMonthGraceCount, getRemainingGrace, isGraceAvailable
- [ ] 1.4 Add `grace` param to `submitCheckinEntry` in `business/checkin.ts`
- [ ] 1.5 Update `createCheckinSlice.ts`: pass grace through submitCheckin, add duplicate guard to addGraceRecord
- [ ] 1.6 SQLite migration: `ALTER TABLE checkin_history ADD COLUMN grace INTEGER DEFAULT 0`
- [ ] 1.7 Update `entityTableMap.ts`: add grace column mapping for checkin

## Phase 2: i18n

- [ ] 2.1 Add 8 new i18n keys to `types.ts` (graceCheckinTitle, graceCheckinHint, graceCheckinSubmit, graceQuotaUsed, graceQuotaExhausted, graceQuotaReset, graceStreakPending, graceSettingTitle, graceSettingHint)
- [ ] 2.2 Add zh translations
- [ ] 2.3 Add en translations
- [ ] 2.4 Add zh-Hant translations

## Phase 3: GracePage Redesign (Mobile)

- [ ] 3.1 Redesign GracePage layout: status card, quota progress bar, quota setting, grace timeline
- [ ] 3.2 Implement quota check logic (disable restore when exhausted)
- [ ] 3.3 Change restore action: open CheckinModal with graceDate instead of one-click
- [ ] 3.4 Implement quota setting UI (horizontal selector 0-5)
- [ ] 3.5 Implement grace history timeline component
- [ ] 3.6 Save graceMonthlyQuota to UserProfile on change

## Phase 4: GracePage Redesign (Web)

- [ ] 4.1 Apply same GracePage redesign to web version

## Phase 5: CheckinModal Grace Mode (Mobile)

- [ ] 5.1 Add `graceDate?: string` prop to CheckinModal
- [ ] 5.2 Replace hardcoded `today` with `targetDate = graceDate ?? today` for record lookup
- [ ] 5.3 Use targetDate for habitCheckins initialization
- [ ] 5.4 Use targetDate for planToggles initialization
- [ ] 5.5 Use targetDate for dailyCustomTodos
- [ ] 5.6 Use targetDate for getIncompleteItems
- [ ] 5.7 Use targetDate for habit/plan item toggle submissions
- [ ] 5.8 Pass `grace: true` and targetDate to submitCheckin
- [ ] 5.9 Hide food section in grace mode
- [ ] 5.10 Hide water section in grace mode
- [ ] 5.11 Show grace hint banner at top
- [ ] 5.12 Change submit button text to "提交补卡" in grace mode
- [ ] 5.13 Skip CheckinReflection popup after grace submit

## Phase 6: CheckinModal Grace Mode (Web)

- [ ] 6.1 Apply same grace mode changes to web CheckinModal

## Phase 7: Visualization

- [ ] 7.1 Add streak pending state to HomeScreen (mobile)
- [ ] 7.2 Add streak pending state to HomeTab (web)
- [ ] 7.3 Add dashed border style for grace days in Heatmap component
- [ ] 7.4 Add grace badge/tag in checkin history display

## Phase 8: Cleanup

- [ ] 8.1 Remove unused `graceSuccess` usage (replaced by `graceNote`)
- [ ] 8.2 Verify all i18n keys are used
- [ ] 8.3 Test: normal checkin flow unchanged
- [ ] 8.4 Test: grace checkin flow end-to-end
- [ ] 8.5 Test: quota exhaustion behavior
- [ ] 8.6 Test: streak pending state
- [ ] 8.7 Test: heatmap grace styling
