# Streak Break Page Optimization Proposal

## Summary

Redesign the streak break page from a cold "failure list" into a growth-oriented companion: recovery guidance, data insights, grace integration, and dynamic encouragement.

## Motivation

Current streak break page is purely utilitarian — a list of failures with dates and lost days. For a spiritual practice app ("无我行"), this design is emotionally cold and provides no actionable value:

- No guidance on what to do after a break
- No pattern recognition (when do breaks happen?)
- No connection to the grace period system
- No encouragement or emotional support
- Buried in Settings > Data, hard to discover

## Scope

### 1. Emotional Design — Recovery Card

Replace the cold stats header with a context-aware recovery card that adapts to user state:

| State | Condition | Content |
|-------|-----------|---------|
| Active streak | `currentStreak > 0` | Show streak count + days since last break + encouragement |
| Just broke | today & yesterday both missed | "没关系，重新开始" + previous streak + action button |
| At risk | today missed, yesterday done | "别忘了今天的打卡" + streak at risk |
| Long absence | >7 days since last checkin | "重新开始，永远不晚" + action button |

Recovery button navigates directly to checkin (mobile: `navigation.navigate('Checkin')`, web: `overlay.open('checkin')`).

### 2. Data Insights — Insight Card

New `computeBreakInsights()` function analyzing break patterns:

- **Weekday distribution**: 7 mini bars showing which days are most common for breaks
- **Monthly trend**: last 6 months break count as mini bar chart
- **Average streak**: mean consecutive days between breaks
- **Average recovery**: mean days to resume after a break

Hidden when total breaks < 3 (insufficient data for meaningful patterns).

### 3. Grace Integration — Hypothetical Streak

For each break entry, check if grace was available but unused:

- New `computeHypotheticalStreak()` function: simulates what the streak would have been if grace was used on the break date
- Display as a small tag: `⚠️ 假设连胜 {n} 天`
- Only shown when grace was available at the time of break (quota not exhausted, no existing grace record)
- Educates users about the grace feature and encourages its use

### 4. Dynamic Encouragement — Bottom Card

Data-driven encouragement text (not random templates):

- Always: checkin rate percentage
- If longest streak >= 3: highlight it as proof of capability
- If trend improving: celebrate the progress
- If current streak > average: point out超越自己
- If weekend is a weak spot: gentle提醒
- Fallback: universal encouragement messages

Show 2-3 messages, derived from actual user data.

## Non-Goals

- Not changing the streak break detection logic (`detectStreakBreaks`)
- Not adding streak break prediction/forecasting
- Not changing the Settings entry point (keeping it there)
- Not adding push notifications for streak risk (already exists in AI risk-warning)
- Not adding social/comparison features

## Key Design Decisions

1. **Insight card hidden when breaks < 3** — no meaningful patterns with insufficient data
2. **Hypothetical streak as small tag** — informative but not overwhelming
3. **Recovery button navigates directly** — no confirmation dialog, reduce friction
4. **Dynamic encouragement from data** — not random, always relevant to user
5. **Keep `detectStreakBreaks` unchanged** — hypothetical analysis done at page level

## Files Changed

| File | Change |
|------|--------|
| `packages/core/src/utils.ts` | +`computeBreakInsights()`, +`computeHypotheticalStreak()`, +`generateEncouragement()` |
| `packages/core/src/i18n/types.ts` | +12 new i18n keys |
| `packages/core/src/i18n/{zh,en,zh-Hant}.ts` | Translations |
| `apps/web/src/components/StreakBreakPage.tsx` | Full rewrite with 4 sections |
| `apps/mobile/src/features/home/StreakBreakScreen.tsx` | Sync rewrite |

## Risks

- `computeHypotheticalStreak` needs grace history access — store connection required in page component
- Mini bar chart in insight card — simple div-based implementation, no chart library needed
- Dynamic encouragement edge cases — need fallback for new users with minimal data
