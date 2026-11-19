// ─── Characterization tests: performDailyReset / notifyPlanDelayed ───
// Phase A of daily-reset-consolidation — lock CURRENT behavior before changing it.
//
// - performDailyReset: the store-side dayCount loop is CORRECT today (the bug is
//   in the Manager's callback argument, fixed in Phase C). These tests pin the
//   loop semantics: one business call per missed day, chained results, guards.
// - notifyPlanDelayed: the race test (burst of concurrent calls) is written RED
//   on purpose — the fix (in-flight dedup) lands in Phase B1.
//
// The business spy wraps the REAL implementation (characterization keeps real
// behavior; we only assert the call sequence).

import { describe, it, expect, vi, beforeEach } from 'vitest';

// __DEV__ is globally declared via src/logger.ts; ensure test env has it set.
globalThis.__DEV__ = false;

// notifyPlanDelayed fire-and-forgets a real HTTP request without this mock.
vi.mock('../services/notification', () => ({
  notifyDelayedPlan: vi.fn().mockResolvedValue(true),
}));

// Spy wrapping the real business function — real behavior + recorded calls.
vi.mock('../business/plan', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../business/plan')>();
  return { ...actual, performDailyReset: vi.fn(actual.performDailyReset) };
});

import { performDailyReset } from '../business/plan';
import { notifyDelayedPlan } from '../services/notification';
import { defaultAuthState } from '../types/auth';
import type { Plan } from '../types/plan';
import { dateStr, addDays } from '../utils';

import { createPlanSlice } from './createPlanSlice';
import { createTestStore, createMockStorageAdapter } from './test-utils/storeHarness';
import type { FullStore } from './types';


// vi.mocked() re-types the (type-wise unmocked) module import as its mocked
// self — keeps .mock.calls access fully typed (no unsafe member access).
const performDailyResetSpy = vi.mocked(performDailyReset);
const notifyDelayedPlanMock = vi.mocked(notifyDelayedPlan);

const adapter = createMockStorageAdapter();

// performDailyReset reads cross-slice state via get() and calls
// get().notifyPlanDelayed — FullStore + factory-direct invocation; slice methods
// are Object.assigned onto state (standard harness pattern for cross-slice get()).
function makeSlice(initial: Partial<FullStore> = {}) {
  const store = createTestStore<FullStore>({
    plans: [], planItems: [], planItemCheckins: [],
    dailyCustomTodos: [], dailyTodoHistory: [],
    ...initial,
  });
  const slice = createPlanSlice(adapter)(store.set, store.get, store.api);
  // Cross-slice `get().notifyPlanDelayed` needs slice methods on state. The
  // slice's factory-initial data fields ([]s) would clobber the fixture, so
  // `initial` is re-applied LAST to restore the seeded data fields.
  Object.assign(store.api.getState(), slice, initial);
  return { store, slice };
}

function makeActivePlan(today: string, overrides: Partial<Plan> = {}): Plan {
  return {
    id: 'plan-1',
    name: '测试计划',
    goal: '目标',
    slogan: '标语',
    startDate: addDays(today, -30),
    endDate: addDays(today, 30),
    status: 'in_progress',
    progress: 0,
    updatedAt: 1,
    deleted: false,
    ...overrides,
  };
}

function persistCallsOf(entity: string) {
  return vi.mocked(adapter.persistChange).mock.calls.filter(c => c[0] === entity);
}

const authedState = {
  auth: { ...defaultAuthState, user: { id: 'u1', name: '测试用户' }, token: 't1' },
};

/** Flush microtask queue (setImmediate runs after all pending microtasks). */
const flushMicrotasks = () => new Promise<void>(resolve => setImmediate(resolve));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('performDailyReset (store layer — characterization)', () => {
  it('single-day reset: business called exactly once with (previousDate, today)', () => {
    const today = dateStr();
    const yesterday = addDays(today, -1);
    const { slice } = makeSlice({ plans: [makeActivePlan(today)] });

    slice.performDailyReset(yesterday);

    expect(performDailyResetSpy).toHaveBeenCalledTimes(1);
    // args: [plans, planItems, checkins, todos, history, previousDate, today]
    expect(performDailyResetSpy.mock.calls[0][5]).toBe(yesterday);
    expect(performDailyResetSpy.mock.calls[0][6]).toBe(today);
    // One new history entry for the active plan
    expect(persistCallsOf('dailyTodoHistory')).toHaveLength(1);
  });

  it('multi-day gap (3 days): business called once per day, chained (D0,D1)(D1,D2)(D2,D3)', () => {
    const today = dateStr();
    const d0 = addDays(today, -3); // lastReset
    const { slice } = makeSlice({ plans: [makeActivePlan(today)] });

    slice.performDailyReset(d0);

    // 3 days gap → exactly 3 business calls (not O(N²) from the store side)
    expect(performDailyResetSpy).toHaveBeenCalledTimes(3);
    const pairs = performDailyResetSpy.mock.calls.map(c => [c[5], c[6]]);
    expect(pairs).toEqual([
      [d0, addDays(today, -2)],          // D0 history is saved (no day skipped)
      [addDays(today, -2), addDays(today, -1)],
      [addDays(today, -1), today],
    ]);
    // Chained result: day N+1 receives day N's returned plans/planItems
    // (cast: vitest's MockResult.value is typed through vi.mocked but degrades
    // to any here — boundary cast to the real return type)
    const day1 = performDailyResetSpy.mock.results[0].value as ReturnType<typeof performDailyReset>;
    expect(performDailyResetSpy.mock.calls[1][0]).toBe(day1.plans);
    expect(performDailyResetSpy.mock.calls[1][1]).toBe(day1.planItems);
    // One history persist per day
    expect(persistCallsOf('dailyTodoHistory')).toHaveLength(3);
  });

  it('Manager semantics end-to-end: 5-day gap → business called exactly 5 times (was 15)', () => {
    const today = dateStr();
    const lastReset = addDays(today, -5);
    const { slice } = makeSlice({ plans: [makeActivePlan(today)] });

    // Phase C: the Manager now fires ONE callback with lastReset (not a
    // per-day burst). Pre-unification this scenario issued 5 callbacks with
    // shrinking dayCounts: 5+4+3+2+1 = 15 business calls (O(N²)).
    slice.performDailyReset(lastReset);

    expect(performDailyResetSpy).toHaveBeenCalledTimes(5);
    expect(performDailyResetSpy.mock.calls[0][5]).toBe(lastReset); // D0 history covered
    expect(performDailyResetSpy.mock.calls[4][6]).toBe(today);    // last day is today
    expect(persistCallsOf('dailyTodoHistory')).toHaveLength(5);
  });

  it('diff engine: plans untouched by the reset are NOT re-persisted (updatedAt diff)', () => {
    const today = dateStr();
    const { slice } = makeSlice({ plans: [makeActivePlan(today)] });

    slice.performDailyReset(addDays(today, -3));

    // checkAutoStatus leaves the plan untouched → no 'plan' persist,
    // even though the result arrays are new references
    expect(persistCallsOf('plan')).toHaveLength(0);
  });

  it('idempotent re-run: no duplicate history persist (business-level dedup)', () => {
    const today = dateStr();
    const yesterday = addDays(today, -1);
    const { slice } = makeSlice({ plans: [makeActivePlan(today)] });

    slice.performDailyReset(yesterday);
    slice.performDailyReset(yesterday);

    // Store re-invokes business (idempotency lives in the business layer);
    // the second call produces no new history entry → no duplicate persist
    expect(performDailyResetSpy).toHaveBeenCalledTimes(2);
    expect(persistCallsOf('dailyTodoHistory')).toHaveLength(1);
  });

  it('guards: invalid / same-day / future previousDate → early return, zero business calls', () => {
    const today = dateStr();
    const { slice } = makeSlice({ plans: [makeActivePlan(today)] });

    slice.performDailyReset('not-a-date');   // NaN dayCount
    slice.performDailyReset(today);           // dayCount = 0
    slice.performDailyReset(addDays(today, 1)); // dayCount < 0

    expect(performDailyResetSpy).not.toHaveBeenCalled();
    expect(adapter.persistChange).not.toHaveBeenCalled();
  });
});

describe('notifyPlanDelayed', () => {
  it('skips plans already marked lastDelayedNotifyAt (persisted dedup)', async () => {
    const today = dateStr();
    const { slice } = makeSlice({
      plans: [makeActivePlan(today, { lastDelayedNotifyAt: 123 })],
      ...authedState,
    });

    await slice.notifyPlanDelayed([makeActivePlan(today, { lastDelayedNotifyAt: 123 })]);

    expect(notifyDelayedPlanMock).not.toHaveBeenCalled();
  });

  // A3 — written RED on purpose (race exists today): concurrent bursts all pass
  // the lastDelayedNotifyAt check before any await completes. Phase B1 (in-flight
  // dedup) turns this green. Acceptance: exactly ONE API call per plan.
  it('race: burst of concurrent calls sends the API exactly once per plan', async () => {
    const today = dateStr();
    const delayedPlan = makeActivePlan(today); // no lastDelayedNotifyAt
    const { slice } = makeSlice({ plans: [delayedPlan], ...authedState });

    // Fire-and-forget ×3 — same shape as the Manager/UI triggering concurrently
    void slice.notifyPlanDelayed([delayedPlan]);
    void slice.notifyPlanDelayed([delayedPlan]);
    void slice.notifyPlanDelayed([delayedPlan]);
    await flushMicrotasks();

    expect(notifyDelayedPlanMock).toHaveBeenCalledTimes(1);
  });
});
