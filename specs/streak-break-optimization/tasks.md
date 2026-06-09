# Streak Break Page — Tasks

## Task 1: Core Utility Functions
**Path:** `packages/core/src/utils.ts`
**Estimate:** 1h

- [ ] Add `BreakInsight` interface
- [ ] Add `HypotheticalResult` interface
- [ ] Add `RecoveryData` interface and `RecoveryState` type
- [ ] Implement `computeBreakInsights(breaks, history): BreakInsight`
- [ ] Implement `computeHypotheticalStreak(breakEntry, history, graceHistory, quota): HypotheticalResult`
- [ ] Implement `generateEncouragement(breaks, longestStreak, totalCheckinDays, currentStreak, insight): string[]`
- [ ] Implement `getRecoveryData(checkinHistory, breaks): RecoveryData`
- [ ] Export all new types and functions

## Task 2: i18n Keys
**Path:** `packages/core/src/i18n/types.ts`, `zh.ts`, `en.ts`, `zh-Hant.ts`
**Estimate:** 30min

- [ ] Add ~15 new keys to `I18nKeys` interface
- [ ] Add Chinese Simplified translations
- [ ] Add English translations
- [ ] Add Chinese Traditional translations

## Task 3: Web StreakBreakPage Rewrite
**Path:** `apps/web/src/components/StreakBreakPage.tsx`
**Estimate:** 1.5h

- [ ] Import new utility functions from core
- [ ] Add store subscriptions: `graceHistory`, `userProfile.graceMonthlyQuota`
- [ ] Compute `recoveryData`, `insight`, `encouragement`, `hypotheticals`
- [ ] Implement `MiniBarChart` component (weekday + trend)
- [ ] Implement `RecoveryCard` with 4 states + checkin button
- [ ] Implement `InsightCard` (hidden when breaks < 3)
- [ ] Update `BreakList` with hypothetical streak tags
- [ ] Implement `EncouragementCard`
- [ ] Wire up checkin button → `overlay.open('checkin')`

## Task 4: Mobile StreakBreakScreen Rewrite
**Path:** `apps/mobile/src/features/home/StreakBreakScreen.tsx`
**Estimate:** 1.5h

- [ ] Mirror web implementation with React Native components
- [ ] Use `useRootNavigation()` for checkin navigation
- [ ] Adapt MiniBarChart for React Native (View-based)
- [ ] Ensure all 4 sections match web layout

## Task 5: Verification
**Estimate:** 30min

- [ ] TypeScript compilation clean
- [ ] Web: verify with 0, 1, 3, 5+ breaks (insight card visibility)
- [ ] Web: verify all 4 recovery states
- [ ] Web: verify hypothetical streak tags appear correctly
- [ ] Mobile: same verification
- [ ] Verify i18n in zh/en/zh-Hant
